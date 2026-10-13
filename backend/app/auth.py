"""Identity from the nicasso gateway.

Behind the gateway every request carries X-Auth-Request-User/-Email (from oauth2-proxy
after Keycloak login) and X-Gateway-Secret (proves it came through the gateway, not
straight to the container). Both are required; users are created on first sight.
"""
import hmac
from datetime import timedelta

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import User, utcnow

# Avoid a write on every request just to bump last_seen_at.
_SEEN_RESOLUTION = timedelta(minutes=5)


def _identity(request: Request) -> tuple[str, str | None]:
    if settings.auth_mode == "dev":
        return settings.dev_user, f"{settings.dev_user}@localhost"

    username = request.headers.get("x-auth-request-user", "").strip()
    secret = request.headers.get("x-gateway-secret", "")
    if not username or not secret or not hmac.compare_digest(
        secret.encode(), settings.gateway_shared_secret.encode()
    ):
        raise HTTPException(status_code=401, detail="Not signed in")
    email = request.headers.get("x-auth-request-email", "").strip() or None
    return username, email


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    username, email = _identity(request)
    user = db.scalar(select(User).where(User.username == username))
    now = utcnow()
    if user is None:
        user = User(
            username=username,
            email=email,
            display_name=(email.split("@")[0] if email else username),
            created_at=now,
            last_seen_at=now,
        )
        db.add(user)
        db.commit()
    elif user.email != email or now - _aware(user.last_seen_at) > _SEEN_RESOLUTION:
        user.email = email
        user.last_seen_at = now
        db.commit()
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    """Only for the admin board (ADMIN_USERS)."""
    if not settings.is_admin(user.username, user.email):
        raise HTTPException(status_code=403, detail="Admins only")
    return user


def _aware(value):
    # SQLite returns naive datetimes; treat them as UTC.
    return value if value.tzinfo else value.replace(tzinfo=utcnow().tzinfo)
