"""The signed-in user's own ideas: submit, list, edit, delete, versions.

Only the author reaches an idea here. Deleting is a soft delete - the idea disappears
for everyone but admins (the UI says so before deleting). Every edit keeps a version
(app/versions.py) that can be compared and restored."""
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..auth import current_user, has_role
from ..config import settings
from ..portal_mail import notify_later
from ..db import get_db
from ..images import normalize_image_links
from ..models import FREQUENCIES, VISIBILITIES, Idea, IdeaVersion, User, utcnow
from ..versions import apply_edit, record_first, version, versions_of

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
    # imgur links, normalized to direct image URLs.
    image_links: list[str] = Field(default_factory=list, max_length=10)
    # Which app it is for: empty = a new app.
    concerns: str | None = Field(default=None, max_length=60)

    @field_validator("image_links")
    @classmethod
    def _images(cls, value: list[str]) -> list[str]:
        return normalize_image_links(value)

    @field_validator("problem")
    @classmethod
    def _problem(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("problem must not be blank")
        return value

    @field_validator("audience", "helps", "name_idea", "details", "concerns")
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
    image_links: list[str]
    concerns: str | None
    status: str
    admin_reply: str | None
    # An admin changed the texts (shown to the author until they edit again).
    admin_edit_reason: str | None
    admin_edited_at: datetime | None
    replied_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VersionOut(BaseModel):
    number: int
    by_admin: bool
    # Who saved it; for an admin's change the author only learns "an admin".
    editor_name: str | None
    reason: str | None
    changed: list[str]
    fields: dict
    created_at: datetime


def version_out(v: IdeaVersion, show_admin_names: bool) -> VersionOut:
    name = v.editor.display_name if v.editor and (show_admin_names or not v.by_admin) else None
    return VersionOut(
        number=v.number, by_admin=v.by_admin, editor_name=name, reason=v.reason,
        changed=v.changed, fields=v.fields, created_at=v.created_at,
    )


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


def new_idea_mail(idea: Idea, author: User) -> tuple[str, str]:
    """Subject and text for the admins (German: the operator's language)."""
    title = idea.name_idea or idea.problem[:60]
    lines = [
        f"{'Anonym, von ' if idea.anonymous else 'Von '}{author.display_name}"
        + (" · nur für Admins" if idea.visibility == "private" else " · auf dem Board"),
        f"Für: {idea.concerns or 'eine neue App'}",
        "",
        idea.problem,
    ]
    if idea.helps:
        lines += ["", f"Wie eine App helfen würde: {idea.helps}"]
    lines += ["", f"Ansehen: {settings.public_url}/admin"]
    return f"Neue Idee: {title}", "\n".join(lines)


@router.post("", response_model=IdeaOut, status_code=201)
def submit_idea(
    body: IdeaFields,
    request: Request,
    background: BackgroundTasks,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> Idea:
    now = utcnow()
    # New ideas go to the top of the admin board's "new" column.
    idea = Idea(author_id=user.id, **body.model_dump(), position=-now.timestamp(), created_at=now, updated_at=now)
    db.add(idea)
    db.flush()
    record_first(db, idea, user)
    db.commit()
    # Tell the admins - not about their own notes (e.g. the /quick page).
    if not has_role(request, "admin"):
        background.add_task(notify_later, *new_idea_mail(idea, user))
    return idea


@router.get("/concerns", response_model=list[str])
def known_concerns(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[str]:
    """App names ideas were written for, as choices in the wizard - from the board and
    the user's own ideas (private ideas of others stay private)."""
    rows = db.scalars(
        select(Idea.concerns)
        .where(Idea.concerns.is_not(None), Idea.deleted_at.is_(None))
        .where(or_(Idea.author_id == user.id, (Idea.visibility == "board") & Idea.hidden.is_(False)))
        .distinct()
    )
    return sorted(set(rows), key=str.casefold)


@router.get("/{idea_id}", response_model=IdeaOut)
def get_idea(idea_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Idea:
    return _own_idea(db, user, idea_id)


@router.put("/{idea_id}", response_model=IdeaOut)
def edit_idea(idea_id: int, body: IdeaFields, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Idea:
    idea = _own_idea(db, user, idea_id)
    apply_edit(db, idea, body.model_dump(), user)
    db.commit()
    return idea


@router.get("/{idea_id}/versions", response_model=list[VersionOut])
def idea_versions(idea_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[VersionOut]:
    return [version_out(v, show_admin_names=False) for v in versions_of(db, _own_idea(db, user, idea_id))]


@router.post("/{idea_id}/versions/{number}/restore", response_model=IdeaOut)
def restore_version(idea_id: int, number: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Idea:
    """Brings an old state back as a new version - nothing in the history is lost."""
    idea = _own_idea(db, user, idea_id)
    old = version(db, idea, number)
    if old is None:
        raise HTTPException(status_code=404, detail="Version not found")
    apply_edit(db, idea, IdeaFields(**old.fields).model_dump(), user)
    db.commit()
    return idea


@router.delete("/{idea_id}", status_code=204)
def delete_idea(idea_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Response:
    idea = _own_idea(db, user, idea_id)
    idea.deleted_at = utcnow()
    db.commit()
    return Response(status_code=204)
