"""Test setup: a throwaway database (TEST_DATABASE_URL for PostgreSQL in CI, else SQLite)
and gateway mode with a known secret - before the app modules are imported."""
import os
import tempfile

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_tmp}/test.db"
os.environ["AUTH_MODE"] = "gateway"
os.environ["GATEWAY_SHARED_SECRET"] = "test-secret"
os.environ["PORTAL_URL"] = "https://portal.example"
os.environ["PORTAL_LOGOUT_URL"] = "https://portal.example/logout"
os.environ["STATIC_DIR"] = os.path.join(_tmp, "no-frontend")
os.environ["ADMIN_USERS"] = "boss, chief, Admin@Example.com"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

GATEWAY = {"X-Gateway-Secret": "test-secret"}


def as_user(username: str, email: str | None = None) -> dict:
    headers = {**GATEWAY, "X-Auth-Request-User": username, "X-Requested-With": "ideas"}
    if email:
        headers["X-Auth-Request-Email"] = email
    return headers


@pytest.fixture()
def client():
    with TestClient(app) as c:  # runs migrations via the lifespan
        yield c
    with engine.begin() as conn:  # clean slate for the next test
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
