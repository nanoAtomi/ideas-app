from tests.conftest import as_user


def test_platform_links(client):
    me = client.get("/api/me", headers=as_user("alice")).json()
    assert me["feedback_url"] == "https://portal.example/feedback?app=ideas"
    assert me["is_admin"] is False


def test_admins_from_admin_users(client):
    assert client.get("/api/me", headers=as_user("boss")).json()["is_admin"] is True
    assert client.get("/api/me", headers=as_user("chief")).json()["is_admin"] is True
    # Exact match only.
    assert client.get("/api/me", headers=as_user("Boss")).json()["is_admin"] is False


def test_update_preferences(client):
    headers = as_user("bob", "bob@example.com")
    me = client.patch("/api/me", json={"language": "de", "display_name": " Bob "}, headers=headers).json()
    assert (me["language"], me["display_name"]) == ("de", "Bob")

    # Empty language = follow the browser again.
    assert client.patch("/api/me", json={"language": ""}, headers=headers).json()["language"] is None


def test_rejects_invalid_preferences(client):
    headers = as_user("bob")
    assert client.patch("/api/me", json={"language": "fr"}, headers=headers).status_code == 422
    assert client.patch("/api/me", json={"display_name": ""}, headers=headers).status_code == 422
    assert client.patch("/api/me", json={"display_name": "   "}, headers=headers).status_code == 422
