"""ORM models. Every schema change also needs an Alembic migration (migrations/versions)."""
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """A platform user, created on their first request (identity comes from the gateway)."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Stable identity from the gateway (X-Auth-Request-User).
    username: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(320))
    display_name: Mapped[str] = mapped_column(String(255))
    # None = follow the browser language.
    language: Mapped[str | None] = mapped_column(String(8))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# Answers to the wizard's questions; values are stored as given (validated in the API).
FREQUENCIES = ("daily", "weekly", "monthly", "rarely")
VISIBILITIES = ("board", "private")  # "private" = only admins see it
STATUSES = ("new", "seen", "planned", "in_development", "built", "not_now")


class Idea(Base):
    """An app idea. Deleting it as its author only sets deleted_at: admins still see it."""

    __tablename__ = "ideas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    problem: Mapped[str] = mapped_column(Text)
    audience: Mapped[str | None] = mapped_column(String(300))
    frequency: Mapped[str | None] = mapped_column(String(16))
    helps: Mapped[str | None] = mapped_column(Text)
    name_idea: Mapped[str | None] = mapped_column(String(120))
    details: Mapped[str | None] = mapped_column(Text)
    # Up to 3 direct imgur image URLs (https://i.imgur.com/<id>.<ext>) - see app/images.py.
    image_links: Mapped[list[str]] = mapped_column(JSON, default=list)
    # Which app the idea is for: None = a new app, else an existing app's name.
    concerns: Mapped[str | None] = mapped_column(String(60), index=True)
    visibility: Mapped[str] = mapped_column(String(16), default="board")
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(16), default="new", index=True)
    # Order inside the admin board's status column (lower = higher up).
    position: Mapped[float] = mapped_column(Float, default=0)
    admin_reply: Mapped[str | None] = mapped_column(Text)
    replied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Taken off the board by an admin; the author still sees it.
    hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    # The latest change an admin made to the texts, shown to the author until they edit again.
    admin_edit_reason: Mapped[str | None] = mapped_column(String(300))
    admin_edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    author: Mapped[User] = relationship()


class Vote(Base):
    """One 👍 per person and idea on the board."""

    __tablename__ = "votes"

    idea_id: Mapped[int] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class IdeaVersion(Base):
    """A saved state of an idea's texts: one per submit and per edit that changed something.

    `fields` is the full snapshot (what IdeaFields holds), so any two versions can be
    compared and any one restored."""

    __tablename__ = "idea_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    idea_id: Mapped[int] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"), index=True)
    number: Mapped[int] = mapped_column(Integer)
    editor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    # Changed by an admin (not the author) - then with a reason.
    by_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    reason: Mapped[str | None] = mapped_column(String(300))
    fields: Mapped[dict] = mapped_column(JSON)
    changed: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    editor: Mapped[User | None] = relationship()
