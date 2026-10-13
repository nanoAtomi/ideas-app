from tests.conftest import GATEWAY, as_user


def test_health_needs_no_login(client):
    assert client.get("/api/health").json() == {"ok": True}


def test_requires_user_and_gateway_secret(client):
    assert client.get("/api/me").status_code == 401
    assert client.get("/api/me", headers={"X-Auth-Request-User": "alice"}).status_code == 401
    assert client.get("/api/me", headers={"X-Auth-Request-User": "alice", "X-Gateway-Secret": "wrong"}).status_code == 401
    assert client.get("/api/me", headers={**GATEWAY}).status_code == 401
    assert client.get("/api/me", headers=as_user("alice")).status_code == 200


def test_user_created_on_first_request(client):
    me = client.get("/api/me", headers=as_user("alice-id", "alice@example.com")).json()
    assert me["username"] == "alice-id"
    assert me["display_name"] == "alice"
    assert me["portal_url"] == "https://portal.example"
    assert me["logout_url"] == "https://portal.example/logout"
    # Same identity -> same user.
    assert client.get("/api/me", headers=as_user("alice-id", "alice@example.com")).json()["id"] == me["id"]


def test_mutations_need_csrf_header(client):
    headers = as_user("alice")
    headers.pop("X-Requested-With")
    assert client.patch("/api/me", json={"language": "de"}, headers=headers).status_code == 403


def test_security_and_cache_headers(client):
    response = client.get("/api/me", headers=as_user("alice"))
    assert response.headers["cache-control"] == "no-store"
    assert "default-src 'self'" in response.headers["content-security-policy"]
    assert response.headers["x-content-type-options"] == "nosniff"


def test_unknown_api_path_is_json_404(client):
    response = client.get("/api/nope", headers=as_user("alice"))
    assert response.status_code == 404
    assert response.json() == {"detail": "Not found"}
