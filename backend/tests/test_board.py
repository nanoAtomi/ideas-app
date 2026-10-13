import pytest

from app.images import normalize_image_link
from tests.conftest import as_user
from tests.test_ideas import ALICE, BOB, BOSS, submit

CAROL = as_user("carol")


def board(client, headers=BOB, sort="votes"):
    response = client.get(f"/api/board?sort={sort}", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_board_shows_only_public_live_ideas(client):
    public = submit(client, problem="public")
    submit(client, problem="private", visibility="private")
    hidden = submit(client, problem="hidden")
    deleted = submit(client, problem="deleted")
    client.patch(f"/api/admin/ideas/{hidden['id']}", json={"hidden": True}, headers=BOSS)
    client.delete(f"/api/ideas/{deleted['id']}", headers=ALICE)

    assert [i["id"] for i in board(client)] == [public["id"]]


def test_anonymous_ideas_hide_the_author(client):
    submit(client, problem="named")
    submit(client, problem="shy", anonymous=True)
    names = {i["problem"]: i["author_name"] for i in board(client)}
    assert names == {"named": "alice", "shy": None}


def test_votes_one_per_person_and_sorting(client):
    old = submit(client, problem="old")
    new = submit(client, problem="new")
    assert [i["id"] for i in board(client, sort="new")] == [new["id"], old["id"]]

    for headers in (BOB, BOB, CAROL):  # voting twice counts once
        assert client.put(f"/api/board/{old['id']}/vote", headers=headers).status_code == 204
    top = board(client)
    assert [(i["id"], i["votes"]) for i in top] == [(old["id"], 2), (new["id"], 0)]
    assert top[0]["voted"] is True and top[1]["voted"] is False

    assert client.delete(f"/api/board/{old['id']}/vote", headers=BOB).status_code == 204
    assert board(client)[0]["votes"] == 1
    assert board(client)[0]["voted"] is False


def test_no_votes_for_own_or_invisible_ideas(client):
    own = submit(client)
    private = submit(client, visibility="private")
    assert client.put(f"/api/board/{own['id']}/vote", headers=ALICE).status_code == 409
    assert board(client, headers=ALICE)[0]["mine"] is True
    assert client.put(f"/api/board/{private['id']}/vote", headers=BOB).status_code == 404
    assert client.put("/api/board/999/vote", headers=BOB).status_code == 404


def test_image_links_are_normalized_imgur_urls(client):
    idea = submit(client, image_links=["https://imgur.com/AbC123x", " https://i.imgur.com/Zz99Yy.png ", ""])
    assert idea["image_links"] == ["https://i.imgur.com/AbC123x.jpg", "https://i.imgur.com/Zz99Yy.png"]
    assert board(client)[0]["image_links"] == idea["image_links"]


@pytest.mark.parametrize("link", [
    "http://imgur.com/AbC123x",           # no https
    "https://evil.com/AbC123x.png",
    "https://imgur.com.evil.com/AbC123x",
    "https://imgur.com/a/AbC123x",        # albums can't be previewed
    "https://i.imgur.com/AbC123x.svg",
    "javascript:alert(1)",
])
def test_rejects_other_links(client, link):
    response = client.post("/api/ideas", json={"problem": "x", "image_links": [link]}, headers=ALICE)
    assert response.status_code == 422
    with pytest.raises(ValueError):
        normalize_image_link(link)


def test_at_most_three_images(client):
    links = [f"https://imgur.com/Abcde{i}" for i in range(4)]
    assert client.post("/api/ideas", json={"problem": "x", "image_links": links}, headers=ALICE).status_code == 422


def test_csp_allows_imgur_previews_only(client):
    csp = client.get("/api/me", headers=ALICE).headers["content-security-policy"]
    assert "img-src 'self' data: https://i.imgur.com;" in csp
