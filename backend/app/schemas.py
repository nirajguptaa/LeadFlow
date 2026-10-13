from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Optional

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, PlainSerializer, field_validator


class LeadStatus(str, Enum):
    NEW = "New"
    CONTACTED = "Contacted"
    QUALIFIED = "Qualified"
    PROPOSAL_SENT = "Proposal Sent"
    WON = "Won"
    LOST = "Lost"


def _to_naive_utc(value: datetime) -> datetime:
    # Clients should send a timezone (e.g. "2026-10-14T08:30:00Z"). A value without one is treated as UTC.
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _to_iso_z(value: datetime) -> str:
    return value.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


UtcDateTime = Annotated[
    datetime,
    AfterValidator(_to_naive_utc),
    PlainSerializer(_to_iso_z, return_type=str),
]


class LeadCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    company: Optional[str] = Field(default=None, max_length=120)
    phone: Optional[str] = Field(default=None, max_length=40)
    status: LeadStatus = LeadStatus.NEW

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("company", "phone", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        if isinstance(v, str):
            return v.strip() or None
        return v


class LeadStatusUpdate(BaseModel):
    status: LeadStatus


class LeadOut(BaseModel):
    id: int
    name: str
    company: Optional[str]
    phone: Optional[str]
    status: LeadStatus
    follow_up_at: Optional[UtcDateTime]
    created_at: UtcDateTime
    last_note: Optional[str]
    last_discussion_at: Optional[UtcDateTime]


class DiscussionCreate(BaseModel):
    note: str = Field(min_length=1, max_length=5000)
    follow_up_at: Optional[UtcDateTime] = None

    @field_validator("note", mode="before")
    @classmethod
    def strip_note(cls, v):
        return v.strip() if isinstance(v, str) else v


class DiscussionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: int
    note: str
    follow_up_at: Optional[UtcDateTime]
    created_at: UtcDateTime
