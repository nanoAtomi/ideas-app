"""The signed-in user, their preferences and the platform links."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import current_user
from ..config import settings
from ..db import get_db
from ..models import User

router = APIRouter(prefix="/api/me", tags=["me"])

LANGUAGES = ("de", "en")


class MeResponse(BaseModel):
    id: int
    username: str
    email: str | None
    display_name: str
    language: str | None
    is_admin: bool
    # Platform links (set by the portal); null outside the gateway.
    portal_url: str | None
    logout_url: str | None
    feedback_url: str | None


class MeUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    # Empty string = follow the browser language again.
    language: str | None = None


def _response(user: User) -> MeResponse:
    gateway = settings.auth_mode == "gateway"
    portal_url = settings.portal_url if gateway and settings.portal_url else None
    return MeResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        language=user.language,
        is_admin=settings.is_admin(user.username),
        portal_url=portal_url,
        logout_url=(settings.portal_logout_url or None) if gateway else None,
        feedback_url=f"{portal_url}/feedback?app=ideas" if portal_url else None,
    )


@router.get("", response_model=MeResponse)
def get_me(user: User = Depends(current_user)) -> MeResponse:
    return _response(user)


@router.patch("", response_model=MeResponse)
def update_me(body: MeUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> MeResponse:
    if body.display_name is not None:
        name = body.display_name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="display_name must not be blank")
        user.display_name = name
    if body.language is not None:
        if body.language not in (*LANGUAGES, ""):
            raise HTTPException(status_code=422, detail=f"language must be one of {', '.join(LANGUAGES)}")
        user.language = body.language or None
    db.commit()
    return _response(user)
