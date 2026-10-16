"""A person's data, for the portal (nicasso blueprint contract.md, "Your data").

Profile → "Download my data" collects GET .../export from every app; "Delete my account"
calls DELETE first and removes the account only when every app said yes. Called by
portal-api over the internal network with X-Portal-Secret = GATEWAY_SHARED_SECRET. The
gateway never sets that header, so a browser can't reach these even with a session.

The export holds what is about the person - their texts, comments, votes - not internal
ids. Deleting removes the person and - through the foreign keys - every idea they wrote
(public ones too, with their versions, comments and votes), their comments and votes.
"""
import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import Comment, Idea, IdeaVersion, User, Vote

router = APIRouter(prefix="/api/platform/users", include_in_schema=False)

IDEA_FIELDS = ("problem", "audience", "frequency", "helps", "name_idea", "details", "image_links", "concerns",
               "visibility", "anonymous", "status", "admin_reply")


def portal_only(x_portal_secret: str | None = Header(default=None)) -> None:
    secret = settings.gateway_shared_secret
    if not secret or not x_portal_secret or not hmac.compare_digest(x_portal_secret.encode(), secret.encode()):
        raise HTTPException(status_code=403, detail="Portal only")


@router.get("/{user}/export", dependencies=[Depends(portal_only)])
def export(user: str, db: Session = Depends(get_db)) -> dict:
    person = db.scalar(select(User).where(User.username == user))
    if person is None:
        return {}
    ideas = db.scalars(select(Idea).where(Idea.author_id == person.id).order_by(Idea.id)).all()
    return {
        "user": {"email": person.email, "name": person.display_name, "since": person.created_at.isoformat()},
        "ideas": [
            {
                **{name: getattr(idea, name) for name in IDEA_FIELDS},
                "created_at": idea.created_at.isoformat(),
                "deleted": idea.deleted_at is not None,
                "versions": [
                    {"number": v.number, "fields": v.fields, "by_admin": v.by_admin, "reason": v.reason,
                     "created_at": v.created_at.isoformat()}
                    for v in db.scalars(select(IdeaVersion).where(IdeaVersion.idea_id == idea.id).order_by(IdeaVersion.number))
                ],
            }
            for idea in ideas
        ],
        "comments": [
            {"on_idea": _title(db.get(Idea, c.idea_id)), "body": c.body, "created_at": c.created_at.isoformat()}
            for c in db.scalars(select(Comment).where(Comment.author_id == person.id).order_by(Comment.id))
        ],
        "votes": [_title(db.get(Idea, v.idea_id)) for v in db.scalars(select(Vote).where(Vote.user_id == person.id))],
    }


def _title(idea: Idea | None) -> str:
    """How a person recognises an idea - its name, else the start of the problem."""
    if idea is None:
        return ""
    return idea.name_idea or (idea.problem[:80] + ("…" if len(idea.problem) > 80 else ""))


@router.delete("/{user}", status_code=204, dependencies=[Depends(portal_only)])
def delete(user: str, db: Session = Depends(get_db)) -> Response:
    person = db.scalar(select(User).where(User.username == user))
    if person is not None:
        db.delete(person)
        db.commit()
    return Response(status_code=204)
