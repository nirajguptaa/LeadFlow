"""Fills the database with sample leads. Safe to run twice: it skips if leads already exist.

Usage:  python seed.py            (only seeds an empty database)
        python seed.py --reset    (wipes everything and seeds again)
"""
import sys
from datetime import timedelta

from app import models  # noqa: F401
from app.db import Base, SessionLocal, engine
from app.models import Discussion, Lead, utcnow


def seed(reset: bool = False) -> None:
    if reset:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    db = SessionLocal()
    try:
        if db.query(Lead).count() > 0:
            print("Database already has leads. Use --reset to start again.")
            return

        now = utcnow()

        def ago(**kw):
            return now - timedelta(**kw)

        def ahead(**kw):
            return now + timedelta(**kw)

        data = [
            dict(
                name="Sarah Connor", company="Acme Corp", phone="555-0199", status="Proposal Sent",
                follow_up_at=ahead(hours=1),  # due today
                notes=[
                    (ago(days=6), "Lead created via web form.", None),
                    (ago(days=5), "Initial discovery call. They need a CRM for 50 reps. Pain points include dropping leads and no follow-up tracking.", None),
                    (ago(days=2), "Sent pricing tier PDF. Said she would review with her boss.", ahead(hours=1)),
                ],
            ),
            dict(
                name="Hank Scorpio", company="Globex", phone="555-0142", status="New", follow_up_at=None,
                notes=[(ago(hours=2), "Inbound lead from website contact form.", None)],
            ),
            dict(
                name="Bill Lumbergh", company="Initech", phone="555-0177", status="Contacted",
                follow_up_at=ago(days=2),  # overdue
                notes=[
                    (ago(days=9), "Lead created via web form.", None),
                    (ago(days=7), "Left a voicemail with his assistant.", ago(days=2)),
                ],
            ),
            dict(
                name="Bruce Wayne", company="Wayne Ent", phone="555-0100", status="Won", follow_up_at=None,
                notes=[
                    (ago(days=40), "Intro call. Interested in the enterprise plan.", None),
                    (ago(days=21), "Contract signed! Sending welcome package.", None),
                ],
            ),
            dict(
                name="Tony Stark", company="Stark Industries", phone="555-0188", status="Qualified",
                follow_up_at=ahead(days=1, hours=3),  # upcoming
                notes=[
                    (ago(days=4), "Lead created via referral.", None),
                    (ago(days=1), "Budget confirmed. Wants a demo for his ops team.", ahead(days=1, hours=3)),
                ],
            ),
            dict(
                name="Diana Prince", company="Themyscira Exports", phone="555-0123", status="Contacted",
                follow_up_at=ago(days=1),  # overdue
                notes=[
                    (ago(days=3), "Spoke briefly. Asked us to call back with integration details.", ago(days=1)),
                ],
            ),
            dict(
                name="Peter Parker", company="Daily Bugle", phone=None, status="Lost", follow_up_at=None,
                notes=[
                    (ago(days=20), "Lead created via web form.", None),
                    (ago(days=12), "Went with a cheaper competitor. Closing this out.", None),
                ],
            ),
            dict(
                name="Lex Luthor", company="LexCorp", phone="555-0166", status="Qualified", follow_up_at=None,
                notes=[
                    (ago(days=8), "Lead created via web form.", None),
                    (ago(days=3), "Good fit on size. Waiting for their security review.", None),
                ],
            ),
        ]

        for item in data:
            notes = item.pop("notes")
            lead = Lead(created_at=notes[0][0], **item)
            for created_at, text, follow_up in notes:
                lead.discussions.append(Discussion(note=text, follow_up_at=follow_up, created_at=created_at))
            db.add(lead)
        db.commit()
        print(f"Seeded {len(data)} leads.")
    finally:
        db.close()


if __name__ == "__main__":
    seed(reset="--reset" in sys.argv)
