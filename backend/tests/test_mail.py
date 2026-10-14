from app.api import ideas as ideas_api
from tests.test_ideas import ALICE, BOSS, submit


def test_new_ideas_are_mailed_to_the_admins(client, monkeypatch):
    sent = []
    monkeypatch.setattr(ideas_api, "notify_later", lambda subject, text: sent.append((subject, text)))
    submit(client, name_idea="Plant pal", concerns="Todo", helps="Reminds me")
    submit(client, headers=BOSS)  # an admin's own note: no mail

    assert len(sent) == 1
    subject, text = sent[0]
    assert subject == "Neue Idee: Plant pal"
    assert "Von alice" in text and "Für: Todo" in text and "Reminds me" in text
    assert text.endswith("/admin")


def test_without_the_platform_nothing_is_sent():
    from app import portal_mail

    assert portal_mail.settings.portal_api_url == ""  # tests run without PORTAL_API_URL
    portal_mail.notify_later("Neue Idee", "x")  # logs, must not raise
