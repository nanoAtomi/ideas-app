"""Database engine, session handling and migrations."""
from collections.abc import Iterator
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

engine = create_engine(settings.sqlalchemy_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

if engine.dialect.name == "sqlite":
    # SQLite (local dev/tests) ignores ON DELETE CASCADE unless asked - PostgreSQL always applies it.
    @event.listens_for(engine, "connect")
    def _sqlite_foreign_keys(dbapi_connection, _record):
        dbapi_connection.execute("PRAGMA foreign_keys=ON")


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


def run_migrations(url: str | None = None) -> None:
    """Brings the schema to the latest Alembic revision (runs at startup)."""
    backend_dir = Path(__file__).resolve().parents[1]
    cfg = Config(str(backend_dir / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_dir / "migrations"))
    cfg.set_main_option("sqlalchemy.url", (url or settings.sqlalchemy_url).replace("%", "%%"))
    command.upgrade(cfg, "head")
