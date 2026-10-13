"""Screenshots are links to imgur - the app stores no images itself (docs/plan.md, F11).

Only single imgur images are accepted, stored as the direct image URL so the UI can
show a preview (CSP allows img-src https://i.imgur.com and nothing else external).
"""
import re

MAX_IMAGES = 3

# https://imgur.com/AbC123x, https://i.imgur.com/AbC123x.png (optional "www.", "m.").
_IMGUR = re.compile(
    r"^https://(?:(?:www|m)\.)?(i\.)?imgur\.com/([A-Za-z0-9]{5,12})(?:\.(png|jpe?g|gif|webp))?/?$"
)


def normalize_image_link(link: str) -> str:
    """Direct image URL for an imgur link; ValueError for anything else."""
    match = _IMGUR.match(link.strip())
    if not match:
        raise ValueError("Only links to single imgur images are allowed (https://imgur.com/... or https://i.imgur.com/...)")
    _, image_id, ext = match.groups()
    return f"https://i.imgur.com/{image_id}.{(ext or 'jpg').replace('jpeg', 'jpg')}"


def normalize_image_links(links: list[str]) -> list[str]:
    cleaned = [link for link in (l.strip() for l in links) if link]
    if len(cleaned) > MAX_IMAGES:
        raise ValueError(f"At most {MAX_IMAGES} images")
    result: list[str] = []
    for link in cleaned:
        url = normalize_image_link(link)
        if url not in result:
            result.append(url)
    return result
