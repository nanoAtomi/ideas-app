"""Configuration through environment variables (set by portal.yml and the portal)."""
import os
from dataclasses import dataclass, field
from pathlib import Path


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _csv(name: str) -> frozenset[str]:
    return frozenset(part.strip() for part in _env(name).split(",") if part.strip())


@dataclass(frozen=True)
class Settings:
    # gateway: behind the nicasso gateway (identity from trusted headers).
    # dev: local development, everyone is DEV_USER - never use on a server.
    auth_mode: str = field(default_factory=lambda: _env("AUTH_MODE", "dev").lower())
    gateway_shared_secret: str = field(default_factory=lambda: _env("GATEWAY_SHARED_SECRET"))
    dev_user: str = field(default_factory=lambda: _env("DEV_USER", "dev"))

    # Usernames (X-Auth-Request-User) that see the admin board. Set in the portal.
    admin_users: frozenset[str] = field(default_factory=lambda: _csv("ADMIN_USERS"))

    # The portal sets DATABASE_URL (postgresql://...) when portal.yml has database: true.
    database_url: str = field(default_factory=lambda: _env("DATABASE_URL", "sqlite:///./ideas.db"))

    public_url: str = field(default_factory=lambda: _env("PUBLIC_URL", "http://localhost:8000").rstrip("/"))
    portal_url: str = field(default_factory=lambda: _env("PORTAL_URL").rstrip("/"))
    portal_logout_url: str = field(default_factory=lambda: _env("PORTAL_LOGOUT_URL"))

    # Built React app (frontend/dist); copied to /srv/static in the image.
    static_dir: Path = field(
        default_factory=lambda: Path(_env("STATIC_DIR", str(Path(__file__).resolve().parents[2] / "frontend" / "dist")))
    )

    def __post_init__(self) -> None:
        if self.auth_mode not in ("gateway", "dev"):
            raise ValueError("AUTH_MODE must be gateway or dev")
        if self.auth_mode == "gateway" and not self.gateway_shared_secret:
            raise ValueError("GATEWAY_SHARED_SECRET is required when AUTH_MODE=gateway")

    def is_admin(self, username: str) -> bool:
        # Locally the dev user may do everything, so the admin board can be built and tried.
        return username in self.admin_users or (self.auth_mode == "dev" and username == self.dev_user)

    @property
    def sqlalchemy_url(self) -> str:
        # psycopg 3 driver for the plain postgresql:// URL the portal provides.
        url = self.database_url
        for prefix in ("postgresql://", "postgres://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url


settings = Settings()
