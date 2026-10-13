"""Admin board: every idea (also private and deleted ones), status, order, reply, hide,
and permanent deletion (e.g. on a GDPR request)."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from ..auth import admin_user
from ..db import get_db
from ..models import STATUSES, Idea, User, utcnow
from .ideas import IdeaOut

router = APIRouter(prefix="/api/admin/ideas", tags=["admin"])


class Author(BaseModel):
    id: int
    username: str
    display_name: str
    email: str | None

    model_config = {"from_attributes": True}


class AdminIdeaOut(IdeaOut):
    author: Author
    position: float
    hidden: bool
    deleted_at: datetime | None


class AdminIdeaUpdate(BaseModel):
    status: str | None = None
    position: float | None = None
    # Empty string removes the reply.
    admin_reply: str | None = Field(default=None, max_length=5000)
    hidden: bool | None = None

    @field_validator("status")
    @classmethod
    def _status(cls, value: str | None) -> str | None:
        if value is not None and value not in STATUSES:
            raise ValueError(f"status must be one of {', '.join(STATUSES)}")
        return value


def _idea(db: Session, idea_id: int) -> Idea:
    idea = db.get(Idea, idea_id)
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


@router.get("", response_model=list[AdminIdeaOut])
def all_ideas(_: User = Depends(admin_user), db: Session = Depends(get_db)) -> list[Idea]:
    return list(db.scalars(select(Idea).options(joinedload(Idea.author)).order_by(Idea.position, Idea.id.desc())))


@router.patch("/{idea_id}", response_model=AdminIdeaOut)
def update_idea(idea_id: int, body: AdminIdeaUpdate, _: User = Depends(admin_user), db: Session = Depends(get_db)) -> Idea:
    idea = _idea(db, idea_id)
    if body.status is not None:
        idea.status = body.status
    if body.position is not None:
        idea.position = body.position
    if body.hidden is not None:
        idea.hidden = body.hidden
    if body.admin_reply is not None:
        reply = body.admin_reply.strip() or None
        if reply != idea.admin_reply:
            idea.admin_reply = reply
            idea.replied_at = utcnow() if reply else None
    db.commit()
    return idea


@router.delete("/{idea_id}", status_code=204)
def purge_idea(idea_id: int, _: User = Depends(admin_user), db: Session = Depends(get_db)) -> Response:
    """Deletes the idea for good - unlike the author's delete, nothing is kept."""
    db.delete(_idea(db, idea_id))
    db.commit()
    return Response(status_code=204)
