from tests.conftest import as_user

ALICE = as_user("alice", "alice@example.com")
BOB = as_user("bob")
BOSS = as_user("boss")

FULL = {
    "problem": "  I always forget whose turn the dishes are  ",
    "audience": "Flatmates",
    "frequency": "daily",
    "helps": "A rota that pings us",
    "name_idea": "🍽️ Dishduty",
    "details": "Maybe with points?",
    "visibility": "private",
    "anonymous": True,
}


def submit(client, headers=ALICE, **fields):
    response = client.post("/api/ideas", json={"problem": "Something bugs me", **fields}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def test_submit_with_all_answers(client):
    idea = submit(client, **FULL)
    assert idea["problem"] == "I always forget whose turn the dishes are"
    assert (idea["frequency"], idea["visibility"], idea["anonymous"]) == ("daily", "private", True)
    assert idea["status"] == "new"
    assert idea["admin_reply"] is None


def test_only_the_problem_is_required(client):
    idea = submit(client, audience="   ", helps="")
    assert (idea["audience"], idea["helps"], idea["frequency"]) == (None, None, None)
    assert idea["visibility"] == "board"


def test_rejects_invalid_answers(client):
    for body in (
        {},
        {"problem": "   "},
        {"problem": "x", "frequency": "hourly"},
        {"problem": "x", "visibility": "everyone"},
        {"problem": "x" * 2001},
        {"problem": "x", "name_idea": "n" * 121},
    ):
        assert client.post("/api/ideas", json=body, headers=ALICE).status_code == 422, body


def test_my_ideas_are_only_mine_newest_first(client):
    first = submit(client, problem="first")
    second = submit(client, problem="second")
    submit(client, headers=BOB, problem="bob's")
    mine = client.get("/api/ideas/mine", headers=ALICE).json()
    assert [i["id"] for i in mine] == [second["id"], first["id"]]


def test_edit_own_idea(client):
    idea = submit(client)
    edited = client.put(f"/api/ideas/{idea['id']}", json={**FULL, "problem": "Better wording"}, headers=ALICE).json()
    assert edited["problem"] == "Better wording"
    assert edited["name_idea"] == "🍽️ Dishduty"
    assert client.get(f"/api/ideas/{idea['id']}", headers=ALICE).json()["problem"] == "Better wording"


def test_others_cannot_see_or_change_my_idea(client):
    idea = submit(client)
    url = f"/api/ideas/{idea['id']}"
    assert client.get(url, headers=BOB).status_code == 404
    assert client.put(url, json={"problem": "hijacked"}, headers=BOB).status_code == 404
    assert client.delete(url, headers=BOB).status_code == 404
    assert client.get(url, headers=ALICE).json()["problem"] == "Something bugs me"


def test_delete_hides_it_from_the_author_but_admins_keep_it(client):
    idea = submit(client)
    url = f"/api/ideas/{idea['id']}"
    assert client.delete(url, headers=ALICE).status_code == 204
    assert client.get("/api/ideas/mine", headers=ALICE).json() == []
    assert client.get(url, headers=ALICE).status_code == 404
    assert client.put(url, json={"problem": "back"}, headers=ALICE).status_code == 404

    kept = client.get("/api/admin/ideas", headers=BOSS).json()
    assert [(i["id"], i["deleted_at"] is not None) for i in kept] == [(idea["id"], True)]
