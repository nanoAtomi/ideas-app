from tests.test_ideas import ALICE, BOSS, submit


def test_admin_endpoints_need_admin(client):
    idea = submit(client)
    assert client.get("/api/admin/ideas", headers=ALICE).status_code == 403
    assert client.patch(f"/api/admin/ideas/{idea['id']}", json={"status": "seen"}, headers=ALICE).status_code == 403
    assert client.delete(f"/api/admin/ideas/{idea['id']}", headers=ALICE).status_code == 403


def test_admin_sees_every_idea_with_its_author(client):
    submit(client, problem="public")
    submit(client, problem="secret", visibility="private", anonymous=True)
    ideas = client.get("/api/admin/ideas", headers=BOSS).json()
    # Newest first in the "new" column; anonymous only hides the name on the board.
    assert [i["problem"] for i in ideas] == ["secret", "public"]
    assert ideas[0]["author"]["display_name"] == "alice"
    assert ideas[0]["author"]["email"] == "alice@example.com"


def test_status_order_hide_and_reply(client):
    idea = submit(client)
    url = f"/api/admin/ideas/{idea['id']}"
    updated = client.patch(url, json={"status": "planned", "position": 1.5, "hidden": True}, headers=BOSS).json()
    assert (updated["status"], updated["position"], updated["hidden"]) == ("planned", 1.5, True)

    replied = client.patch(url, json={"admin_reply": "  Love it!  "}, headers=BOSS).json()
    assert replied["admin_reply"] == "Love it!"
    assert replied["replied_at"] is not None

    # The author sees status and reply.
    mine = client.get("/api/ideas/mine", headers=ALICE).json()[0]
    assert (mine["status"], mine["admin_reply"]) == ("planned", "Love it!")

    cleared = client.patch(url, json={"admin_reply": ""}, headers=BOSS).json()
    assert (cleared["admin_reply"], cleared["replied_at"]) == (None, None)


def test_rejects_unknown_status(client):
    idea = submit(client)
    assert client.patch(f"/api/admin/ideas/{idea['id']}", json={"status": "done"}, headers=BOSS).status_code == 422


def test_permanent_delete(client):
    idea = submit(client)
    assert client.delete(f"/api/admin/ideas/{idea['id']}", headers=BOSS).status_code == 204
    assert client.get("/api/admin/ideas", headers=BOSS).json() == []
    assert client.delete(f"/api/admin/ideas/{idea['id']}", headers=BOSS).status_code == 404


def test_unknown_idea(client):
    assert client.patch("/api/admin/ideas/999", json={"hidden": True}, headers=BOSS).status_code == 404
