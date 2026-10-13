from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Discussion, Lead
from ..schemas import (
    DiscussionCreate,
    DiscussionOut,
    LeadCreate,
    LeadOut,
    LeadStatus,
    LeadStatusUpdate,
)

router = APIRouter(prefix="/leads", tags=["leads"])


def _latest_discussions(db: Session, lead_ids: list[int]) -> dict[int, Discussion]:
    """Newest discussion for each given lead, fetched in one query."""
    newest = (
        select(Discussion.lead_id, func.max(Discussion.created_at).label("newest_at"))
        .group_by(Discussion.lead_id)
        .subquery()
    )
    stmt = (
        select(Discussion)
        .join(
            newest,
            and_(Discussion.lead_id == newest.c.lead_id, Discussion.created_at == newest.c.newest_at),
        )
        .where(Discussion.lead_id.in_(lead_ids))
        .order_by(Discussion.id)
    )
    return {d.lead_id: d for d in db.execute(stmt).scalars()}


def _to_out(lead: Lead, last: Optional[Discussion]) -> LeadOut:
    return LeadOut(
        id=lead.id,
        name=lead.name,
        company=lead.company,
        phone=lead.phone,
        status=lead.status,
        follow_up_at=lead.follow_up_at,
        created_at=lead.created_at,
        last_note=last.note if last else None,
        last_discussion_at=last.created_at if last else None,
    )


def _get_lead_or_404(db: Session, lead_id: int) -> Lead:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.get("", response_model=list[LeadOut])
def list_leads(
    status_filter: Optional[LeadStatus] = Query(default=None, alias="status"),
    search: Optional[str] = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
):
    stmt = select(Lead)
    if status_filter:
        stmt = stmt.where(Lead.status == status_filter.value)
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(Lead.name.ilike(term), Lead.company.ilike(term)))

    leads = db.execute(stmt).scalars().all()
    latest = _latest_discussions(db, [lead.id for lead in leads])
    result = [_to_out(lead, latest.get(lead.id)) for lead in leads]
    # Most recently touched first.
    result.sort(key=lambda lead: lead.last_discussion_at or lead.created_at, reverse=True)
    return result


@router.post("", response_model=LeadOut, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    lead = Lead(
        name=payload.name,
        company=payload.company,
        phone=payload.phone,
        status=payload.status.value,
    )
    # Every lead starts with one entry so the timeline and "last note" are never empty.
    lead.discussions.append(Discussion(note="Lead created."))
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return _to_out(lead, _latest_discussions(db, [lead.id]).get(lead.id))


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = _get_lead_or_404(db, lead_id)
    return _to_out(lead, _latest_discussions(db, [lead.id]).get(lead.id))


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead_status(lead_id: int, payload: LeadStatusUpdate, db: Session = Depends(get_db)):
    lead = _get_lead_or_404(db, lead_id)
    lead.status = payload.status.value
    db.commit()
    db.refresh(lead)
    return _to_out(lead, _latest_discussions(db, [lead.id]).get(lead.id))


@router.get("/{lead_id}/discussions", response_model=list[DiscussionOut])
def list_discussions(lead_id: int, db: Session = Depends(get_db)):
    _get_lead_or_404(db, lead_id)
    stmt = (
        select(Discussion)
        .where(Discussion.lead_id == lead_id)
        .order_by(Discussion.created_at.desc(), Discussion.id.desc())
    )
    return db.execute(stmt).scalars().all()


@router.post(
    "/{lead_id}/discussions",
    response_model=DiscussionOut,
    status_code=status.HTTP_201_CREATED,
)
def add_discussion(lead_id: int, payload: DiscussionCreate, db: Session = Depends(get_db)):
    lead = _get_lead_or_404(db, lead_id)
    discussion = Discussion(lead_id=lead.id, note=payload.note, follow_up_at=payload.follow_up_at)
    db.add(discussion)
    # The lead always holds the latest follow-up. A note without one clears it,
    # because logging a new discussion means the old follow-up has been dealt with.
    lead.follow_up_at = payload.follow_up_at
    db.commit()
    db.refresh(discussion)
    return discussion
