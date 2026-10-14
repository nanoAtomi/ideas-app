"""Versions of an idea's texts: every submit and every edit that changes something keeps
the full state, so two states can be compared and an old one restored. Shared by the
author's and the admin's edit endpoints."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Idea, IdeaVersion, User, utcnow

# What a version holds: the answers people write (see api/ideas.py IdeaFields).
FIELDS = ("problem", "audience", "frequency", "helps", "name_idea", "details", "visibility", "anonymous", "image_links", "concerns")


def snapshot(idea: Idea) -> dict:
    return {key: getattr(idea, key) for key in FIELDS}


def record_first(db: Session, idea: Idea, author: User) -> None:
    """Version 1, right after the idea was created."""
    db.add(IdeaVersion(idea_id=idea.id, number=1, editor_id=author.id, fields=snapshot(idea), changed=[], created_at=idea.created_at))


def apply_edit(db: Session, idea: Idea, fields: dict, editor: User, by_admin: bool = False, reason: str | None = None) -> list[str]:
    """Sets the new answers and keeps a version if anything changed; returns what changed.

    An admin edit is shown to the author (reason) until the author edits again."""
    before = snapshot(idea)
    changed = [key for key in FIELDS if key in fields and fields[key] != before[key]]
    if not changed:
        return []
    for key in changed:
        setattr(idea, key, fields[key])
    now = utcnow()
    idea.updated_at = now
    if by_admin:
        idea.admin_edit_reason = reason
        idea.admin_edited_at = now
    else:
        idea.admin_edit_reason = None
        idea.admin_edited_at = None
    number = (db.scalar(select(func.max(IdeaVersion.number)).where(IdeaVersion.idea_id == idea.id)) or 0) + 1
    db.add(IdeaVersion(
        idea_id=idea.id, number=number, editor_id=editor.id, by_admin=by_admin, reason=reason,
        fields=snapshot(idea), changed=changed, created_at=now,
    ))
    return changed


def versions_of(db: Session, idea: Idea) -> list[IdeaVersion]:
    """Newest first."""
    return list(db.scalars(select(IdeaVersion).where(IdeaVersion.idea_id == idea.id).order_by(IdeaVersion.number.desc())))


def version(db: Session, idea: Idea, number: int) -> IdeaVersion | None:
    return db.scalar(select(IdeaVersion).where(IdeaVersion.idea_id == idea.id, IdeaVersion.number == number))
