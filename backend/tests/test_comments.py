from tests.test_ideas import ALICE, BOB, BOSS, submit


def test_comment_on_board_ideas(client):
    idea = submit(client)
    url = f"/api/board/{idea['id']}/comments"
    assert client.post(url, json={"body": "  "}, headers=BOB).status_code == 422
    mine = client.post(url, json={"body": " Great idea "}, headers=BOB).json()
    assert (mine["body"], mine["author_name"], mine["mine"]) == ("Great idea", "bob", True)

    listed = client.get(url, headers=ALICE).json()
    assert [(c["body"], c["mine"], c["can_delete"]) for c in listed] == [("Great idea", False, False)]
    assert client.get("/api/board", headers=ALICE).json()[0]["comments"] == 1


def test_anonymous_authors_stay_anonymous_in_comments(client):
    idea = submit(client, anonymous=True)
    url = f"/api/board/{idea['id']}/comments"
    client.post(url, json={"body": "Thanks!"}, headers=ALICE)
    comment = client.get(url, headers=BOB).json()[0]
    assert (comment["author_name"], comment["by_idea_author"]) == (None, True)


def test_no_comments_on_private_ideas(client):
    idea = submit(client, visibility="private")
    assert client.get(f"/api/board/{idea['id']}/comments", headers=ALICE).status_code == 404
    assert client.post(f"/api/board/{idea['id']}/comments", json={"body": "hi"}, headers=ALICE).status_code == 404


def test_authors_and_admins_delete_comments(client):
    idea = submit(client)
    url = f"/api/board/{idea['id']}/comments"
    first = client.post(url, json={"body": "Spam spam"}, headers=BOB).json()
    second = client.post(url, json={"body": "Mine"}, headers=BOB).json()
    assert client.delete(f"{url}/{first['id']}", headers=ALICE).status_code == 403
    assert client.delete(f"{url}/{first['id']}", headers=BOSS).status_code == 204
    assert client.delete(f"{url}/{second['id']}", headers=BOB).status_code == 204
    assert client.get(url, headers=ALICE).json() == []
