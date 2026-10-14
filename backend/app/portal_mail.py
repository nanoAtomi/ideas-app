"""Mail through the portal - apps keep no SMTP credentials.

The portal mails the holders of one of the app's roles (default "admin"; nobody holds it
yet -> the platform admins) using the SMTP set up under Admin -> Settings -> E-mail.
Server to server: PORTAL_API_URL (http://portal-api:8081 on the gateway network) with
the gateway secret. Fire and forget: a mail problem must never break the request that
triggered it, so call `notify_later` from a FastAPI BackgroundTask.
"""
import json
import logging
import urllib.request

from .config import settings

log = logging.getLogger(__name__)

APP_SLUG = "ideas"


def notify_later(subject: str, text: str, role: str = "admin") -> None:
    """Asks the portal to mail the holders of `role`. Logs instead of raising."""
    base = settings.portal_api_url
    if not base or settings.auth_mode != "gateway":
        log.info("Mail %r not sent: no PORTAL_API_URL (runs outside the platform)", subject)
        return
    request = urllib.request.Request(
        f"{base}/api/hooks/apps/{APP_SLUG}/notify",
        data=json.dumps({"subject": subject[:150], "text": text[:5000], "role": role}).encode(),
        headers={"Content-Type": "application/json", "X-Gateway-Secret": settings.gateway_shared_secret},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            log.info("Mail %r handed to the portal (%s)", subject, response.status)
    except Exception as error:  # noqa: BLE001 - never break the caller
        log.warning("Mail %r not sent: %s", subject, error)
