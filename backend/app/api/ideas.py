"""The signed-in user's own ideas: submit, list, edit, delete.

Only the author reaches an idea here. Deleting is a soft delete - the idea disappears
for everyone but admins (the UI says so before deleting)."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import current_user
from ..db import get_db
from ..models import FREQUENCIES, VISIBILITIES, Idea, User, utcnow

router = APIRouter(prefix="/api/ideas", tags=["ideas"])


def _clean(value: str | None) -> str | None:
    """Trims text; blank answers count as skipped."""
    if value is None:
        return None
    value = value.strip()
    return value or None


class IdeaFields(BaseModel):
    """The wizard's answers. Only `problem` is required."""

    problem: str = Field(max_length=2000)
    audience: str | None = Field(default=None, max_length=300)
    frequency: str | None = None
    helps: str | None = Field(default=None, max_length=2000)
    name_idea: str | None = Field(default=None, max_length=120)
    details: str | None = Field(default=None, max_length=10000)
    visibility: str = "board"
    anonymous: bool = False

    @field_validator("problem")
    @classmethod
    def _problem(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("problem must not be blank")
        return value

    @field_validator("audience", "helps", "name_idea", "details")
    @classmethod
    def _optional(cls, value: str | None) -> str | None:
        return _clean(value)

    @field_validator("frequency")
    @classmethod
    def _frequency(cls, value: str | None) -> str | None:
        value = _clean(value)
        if value is not None and value not in FREQUENCIES:
            raise ValueError(f"frequency must be one of {', '.join(FREQUENCIES)}")
        return value

    @field_validator("visibility")
    @classmethod
    def _visibility(cls, value: str) -> str:
        if value not in VISIBILITIES:
            raise ValueError(f"visibility must be one of {', '.join(VISIBILITIES)}")
        return value


class IdeaOut(BaseModel):
    id: int
    problem: str
    audience: str | None
    frequency: str | None
    helps: str | None
    name_idea: str | None
    details: str | None
    visibility: str
    anonymous: bool
    status: str
    admin_reply: str | None
    replied_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


def _own_idea(db: Session, user: User, idea_id: int) -> Idea:
    idea = db.get(Idea, idea_id)
    if idea is None or idea.author_id != user.id or idea.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


@router.get("/mine", response_model=list[IdeaOut])
def my_ideas(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[Idea]:
    return list(
        db.scalars(
            select(Idea)
            .where(Idea.author_id == user.id, Idea.deleted_at.is_(None))
            .order_by(Idea.created_at.desc(), Idea.id.desc())
        )
    )


@router.post("", response_model=IdeaOut, status_code=201)
def submit_idea(body: IdeaFields, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Idea:
    now = utcnow()
    # New ideas go to the top of the admin board's "new" column.
    idea = Idea(author_id=user.id, **body.model_dump(), position=-now.timestamp(), created_at=now, updated_at=now)
    db.add(idea)
    db.commit()
    return idea


@router.get("/{idea_id}", response_model=IdeaOut)
def get_idea(idea_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Idea:
    return _own_idea(db, user, idea_id)


@router.put("/{idea_id}", response_model=IdeaOut)
def edit_idea(idea_id: int, body: IdeaFields, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Idea:
    idea = _own_idea(db, user, idea_id)
    for key, value in body.model_dump().items():
        setattr(idea, key, value)
    idea.updated_at = utcnow()
    db.commit()
    return idea


@router.delete("/{idea_id}", status_code=204)
def delete_idea(idea_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Response:
    idea = _own_idea(db, user, idea_id)
    idea.deleted_at = utcnow()
    db.commit()
    return Response(status_code=204)
