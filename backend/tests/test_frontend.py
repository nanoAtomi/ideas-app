"""Serving the React build: deep links get index.html, missing build files stay 404."""
from fastapi.testclient import TestClient

from app import main
from app.main import SpaStaticFiles
from tests.conftest import as_user


def test_spa_fallback(tmp_path, client):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<!doctype html><div id=root></div>")
    (tmp_path / "assets" / "app-abc123.js").write_text("console.log(1)")
    main.app.mount("/spa-test", SpaStaticFiles(directory=tmp_path, html=True))
    try:
        c = TestClient(main.app)
        assert "id=root" in c.get("/spa-test/mine").text
        assert c.get("/spa-test/assets/app-abc123.js").headers["cache-control"] == "no-cache"
        assert c.get("/spa-test/assets/old-bundle.js").status_code == 404
        assert c.get("/api/me", headers=as_user("alice")).status_code == 200
    finally:
        main.app.router.routes.pop()


def test_privacy_page_is_a_static_page(tmp_path, client):
    """/privacy is public (portal.yml) - it must not be the SPA, which needs a login."""
    (tmp_path / "privacy").mkdir()
    (tmp_path / "index.html").write_text("<!doctype html><div id=root></div>")
    (tmp_path / "privacy" / "index.html").write_text("<h1>Datenschutzhinweise</h1>")
    main.app.mount("/spa-test", SpaStaticFiles(directory=tmp_path, html=True))
    try:
        c = TestClient(main.app)
        assert "Datenschutzhinweise" in c.get("/spa-test/privacy/").text
        assert "Datenschutzhinweise" in c.get("/spa-test/privacy", follow_redirects=True).text
    finally:
        main.app.router.routes.pop()
