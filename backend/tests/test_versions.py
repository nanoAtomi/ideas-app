from tests.test_ideas import ALICE, BOB, BOSS, submit


def edit(client, idea, headers=ALICE, **changes):
    fields = {key: idea[key] for key in ("problem", "audience", "frequency", "helps", "name_idea", "details", "visibility", "anonymous", "image_links", "concerns")}
    response = client.put(f"/api/ideas/{idea['id']}", json={**fields, **changes}, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_every_change_keeps_a_version(client):
    idea = submit(client, audience="Flatmates")
    idea = edit(client, idea, problem="The dishes pile up")
    edit(client, idea, problem="The dishes pile up")  # nothing changed: no new version

    versions = client.get(f"/api/ideas/{idea['id']}/versions", headers=ALICE).json()
    assert [(v["number"], v["changed"]) for v in versions] == [(2, ["problem"]), (1, [])]
    assert versions[1]["fields"]["problem"] == "Something bugs me"
    assert versions[0]["editor_name"] == "alice"


def test_restore_brings_an_old_state_back_as_a_new_version(client):
    idea = submit(client)
    edit(client, idea, problem="Changed my mind")
    restored = client.post(f"/api/ideas/{idea['id']}/versions/1/restore", headers=ALICE).json()
    assert restored["problem"] == "Something bugs me"
    assert len(client.get(f"/api/ideas/{idea['id']}/versions", headers=ALICE).json()) == 3
    assert client.post(f"/api/ideas/{idea['id']}/versions/9/restore", headers=ALICE).status_code == 404


def test_only_the_author_sees_the_history(client):
    idea = submit(client)
    assert client.get(f"/api/ideas/{idea['id']}/versions", headers=BOB).status_code == 404


def test_admin_edits_with_a_reason_the_author_sees(client):
    idea = submit(client)
    fields = {"problem": "Something bugs me", "details": "Added the missing part"}
    url = f"/api/admin/ideas/{idea['id']}"
    assert client.put(url, json=fields, headers=BOSS).status_code == 422  # a reason is required
    assert client.put(url, json={**fields, "reason": "  "}, headers=BOSS).status_code == 422
    assert client.put(url, json={**fields, "reason": "Completed"}, headers=ALICE).status_code == 403

    edited = client.put(url, json={**fields, "reason": "Completed"}, headers=BOSS).json()
    assert edited["details"] == "Added the missing part"

    mine = client.get(f"/api/ideas/{idea['id']}", headers=ALICE).json()
    assert mine["admin_edit_reason"] == "Completed"
    author_view = client.get(f"/api/ideas/{idea['id']}/versions", headers=ALICE).json()[0]
    assert (author_view["by_admin"], author_view["editor_name"], author_view["reason"]) == (True, None, "Completed")
    admin_view = client.get(f"{url}/versions", headers=BOSS).json()[0]
    assert admin_view["editor_name"] == "boss"

    # The author's next edit clears the notice.
    assert edit(client, mine, problem="Mine again")["admin_edit_reason"] is None


def test_admin_restores_with_a_reason(client):
    idea = submit(client)
    edit(client, idea, problem="Buy cheap pills here")
    url = f"/api/admin/ideas/{idea['id']}/versions/1/restore"
    assert client.post(url, json={}, headers=BOSS).status_code == 422
    restored = client.post(url, json={"reason": "Against the rules: spam"}, headers=BOSS).json()
    assert (restored["problem"], restored["admin_edit_reason"]) == ("Something bugs me", "Against the rules: spam")


def test_concerns_are_offered_from_the_board_and_own_ideas(client):
    submit(client, concerns="Todo")
    submit(client, concerns="  ")  # blank = a new app
    submit(client, headers=BOB, concerns="Secret project", visibility="private")
    submit(client, headers=BOB, concerns="finance")

    assert client.get("/api/ideas/concerns", headers=ALICE).json() == ["finance", "Todo"]
    assert "Secret project" in client.get("/api/ideas/concerns", headers=BOB).json()
