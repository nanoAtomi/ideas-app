from tests.conftest import GATEWAY
from tests.test_ideas import ALICE, BOB, submit

PORTAL = {"X-Portal-Secret": "test-secret"}


def test_only_the_portal_gets_in(client):
    assert client.get("/api/platform/users/alice/export").status_code == 403
    # A browser coming through the gateway carries X-Gateway-Secret, never X-Portal-Secret.
    assert client.get("/api/platform/users/alice/export", headers={**ALICE, **GATEWAY}).status_code == 403
    assert client.delete("/api/platform/users/alice", headers={**ALICE, "X-Portal-Secret": "wrong"}).status_code == 403


def test_export_has_ideas_comments_and_votes(client):
    idea = submit(client, details="With points")
    client.post(f"/api/board/{idea['id']}/comments", json={"body": "Me too"}, headers=ALICE)
    data = client.get("/api/platform/users/alice/export", headers=PORTAL).json()
    assert data["user"]["email"] == "alice@example.com"
    assert [i["details"] for i in data["ideas"]] == ["With points"]
    assert data["ideas"][0]["versions"][0]["number"] == 1
    assert [c["body"] for c in data["comments"]] == ["Me too"]
    assert client.get("/api/platform/users/nobody/export", headers=PORTAL).json() == {}


def test_delete_takes_everything_of_one_person_only(client):
    mine = submit(client, problem="Alice's idea")
    theirs = submit(client, headers=BOB, problem="Bob's idea")
    client.post(f"/api/board/{theirs['id']}/comments", json={"body": "Alice was here"}, headers=ALICE)
    client.post(f"/api/board/{mine['id']}/comments", json={"body": "Bob on Alice's idea"}, headers=BOB)

    assert client.delete("/api/platform/users/alice", headers=PORTAL).status_code == 204
    board = client.get("/api/board", headers=BOB).json()
    assert [i["problem"] for i in board] == ["Bob's idea"]
    assert client.get(f"/api/board/{theirs['id']}/comments", headers=BOB).json() == []
    assert client.delete("/api/platform/users/alice", headers=PORTAL).status_code == 204
