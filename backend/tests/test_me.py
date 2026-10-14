from tests.conftest import as_admin, as_user


def test_platform_links(client):
    me = client.get("/api/me", headers=as_user("alice")).json()
    assert me["feedback_url"] == "https://portal.example/feedback?app=ideas"
    assert me["is_admin"] is False


def test_admin_is_the_portal_role(client):
    assert client.get("/api/me", headers=as_admin()).json()["is_admin"] is True
    # Exact group path only - not another app's admin role, not a look-alike.
    assert client.get("/api/me", headers=as_user("x", groups="/apps/todo/admin,/apps/ideas")).json()["is_admin"] is False
    assert client.get("/api/me", headers=as_user("x", groups="/apps/ideas/administrator")).json()["is_admin"] is False


def test_update_preferences(client):
    headers = as_user("bob", "bob@example.com")
    me = client.patch("/api/me", json={"language": "de"}, headers=headers).json()
    assert me["language"] == "de"

    # Empty language = follow the browser again.
    assert client.patch("/api/me", json={"language": ""}, headers=headers).json()["language"] is None


def test_rejects_invalid_preferences(client):
    headers = as_user("bob")
    assert client.patch("/api/me", json={"language": "fr"}, headers=headers).status_code == 422


def test_name_follows_the_portal_profile(client):
    headers = as_user("alice-id", "alice@example.com")
    assert client.get("/api/me", headers=headers).json()["display_name"] == "alice"
    headers["X-Auth-Request-Name"] = "J%C3%B6rg%20Gro%C3%9F"
    assert client.get("/api/me", headers=headers).json()["display_name"] == "Jörg Groß"
