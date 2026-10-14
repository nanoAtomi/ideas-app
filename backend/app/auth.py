"""Identity from the nicasso gateway.

Behind the gateway every request carries X-Auth-Request-User/-Email (from oauth2-proxy
after Keycloak login), X-Auth-Request-Name (the portal profile's name, percent-encoded)
and X-Gateway-Secret (proves it came through the gateway, not straight to the
container). User and secret are required; users are created on first sight and their
name follows the portal profile.
"""
import hmac
from urllib.parse import unquote
from datetime import timedelta

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import User, utcnow

# Avoid a write on every request just to bump last_seen_at.
_SEEN_RESOLUTION = timedelta(minutes=5)


def _identity(request: Request) -> tuple[str, str | None, str]:
    """(user id, e-mail, display name) of the signed-in person."""
    if settings.auth_mode == "dev":
        return settings.dev_user, f"{settings.dev_user}@localhost", settings.dev_user

    username = request.headers.get("x-auth-request-user", "").strip()
    secret = request.headers.get("x-gateway-secret", "")
    if not username or not secret or not hmac.compare_digest(
        secret.encode(), settings.gateway_shared_secret.encode()
    ):
        raise HTTPException(status_code=401, detail="Not signed in")
    email = request.headers.get("x-auth-request-email", "").strip() or None
    name = unquote(request.headers.get("x-auth-request-name", "")).strip()[:255]
    return username, email, name or (email.split("@")[0] if email else username)


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    username, email, name = _identity(request)
    user = db.scalar(select(User).where(User.username == username))
    now = utcnow()
    if user is None:
        user = User(
            username=username,
            email=email,
            display_name=name,
            created_at=now,
            last_seen_at=now,
        )
        db.add(user)
        db.commit()
    elif user.email != email or user.display_name != name or now - _aware(user.last_seen_at) > _SEEN_RESOLUTION:
        # The portal profile is the one place to change name and e-mail.
        user.email = email
        user.display_name = name
        user.last_seen_at = now
        db.commit()
    return user


APP_SLUG = "ideas"


def has_role(request: Request, role: str) -> bool:
    """App role from the portal (portal.yml `roles`) = group /apps/ideas/<role>.

    Only call it after `current_user` accepted the request: the groups header is as
    trustworthy as the gateway secret check. Locally (AUTH_MODE=dev) the dev user has
    every role, so the admin board can be built and tried.
    """
    if settings.auth_mode == "dev":
        return True
    groups = request.headers.get("x-auth-request-groups", "")
    return f"/apps/{APP_SLUG}/{role}" in {g.strip() for g in groups.split(",")}


def admin_user(request: Request, user: User = Depends(current_user)) -> User:
    """Only for the admin board: the portal role "admin" (Portal → Users)."""
    if not has_role(request, "admin"):
        raise HTTPException(status_code=403, detail="Admins only")
    return user


def _aware(value):
    # SQLite returns naive datetimes; treat them as UTC.
    return value if value.tzinfo else value.replace(tzinfo=utcnow().tzinfo)
