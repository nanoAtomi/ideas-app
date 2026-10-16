"""Quick pages on the home screen (nicasso blueprint ui-guidelines.md, "Quick pages").

iOS takes the manifest, icon and name for "Add to Home Screen" from the HTML the page was
*loaded* with - swapping them in JavaScript afterwards comes too late, and the icon then
opens the app's start page. So the server hands out index.html with the quick page's
own tags when that page is loaded, and links to it reload the document
(`<NavLink reloadDocument>`). The frontend's useHomeScreenIdentity still swaps them for
other browsers.

Adapt PAGES: path (without slashes) -> manifest, 180 px icon, name under the icon.
index.html must carry the three tags exactly as below (Vite keeps them):
  <link rel="manifest" href="...">, <link rel="apple-touch-icon" href="...">,
  <meta name="apple-mobile-web-app-title" content="...">
"""
import html
import re
from pathlib import Path

PAGES: dict[str, tuple[str, str, str]] = {
    "quick": ("/quick.webmanifest", "/icons/quick-180.png", "Idee +"),
}


def index_html(static_dir: Path, path: str) -> str | None:
    """index.html with the page's home-screen identity, or None for every other page."""
    page = PAGES.get(path.strip("/"))
    if page is None:
        return None
    manifest, icon, title = (html.escape(value, quote=True) for value in page)
    text = (static_dir / "index.html").read_text(encoding="utf-8")
    text = re.sub(r'(<link rel="manifest" href=")[^"]*', lambda m: m.group(1) + manifest, text)
    text = re.sub(r'(<link rel="apple-touch-icon" href=")[^"]*', lambda m: m.group(1) + icon, text)
    text = re.sub(r'(<meta name="apple-mobile-web-app-title" content=")[^"]*', lambda m: m.group(1) + title, text)
    return text
