"""The site footer's links, in one place (internal growth task: the footer on every page).

templates/sitelinks.html is the ONE partial. Everything that is a page of the site fills it:

    sitelinks(root)       the partial, for a page whose site root is `root` ("../" from o/x.html,
                          "/" for 404.html, "" for the home page)
    REQUIRED_EXTERNAL     the accounts every footer must link, exactly (scripts/check_seo.py)
    REQUIRED_INTERNAL     the pages every footer must reach, as paths from the site root

The home page is a file in git, so scripts/gen_home_seo.py writes the same partial into
site/index.html between FOOTER markers and its --check refuses a stale one. The built pages
(object pages, 404, press, embed) take it from here at build time. Edit the partial and every
page changes with it; check_seo.py refuses a page that lost a link.

The accounts are the project's own and no others: YouTube, Instagram, LinkedIn, GitHub. A link
to an account of ours is `rel="me noopener"` (a followed link that says it is us).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTIAL = ROOT / "templates" / "sitelinks.html"

REQUIRED_EXTERNAL = [
    "https://github.com/Sara-Managed-Projects/space-radar",
    "https://github.com/Sara-Managed-Projects/space-radar/discussions",
    "https://www.instagram.com/spaceradar.ai/",
    "https://www.linkedin.com/company/spaceradar-ai",
    "https://www.youtube.com/@SpaceRadar_ai",
]
REQUIRED_INTERNAL = [
    "about/index.html", "sources/index.html", "accuracy/index.html", "teachers/index.html",
    "satellites/index.html", "starlink/index.html",
]


def sitelinks(root: str) -> str:
    text = PARTIAL.read_text(encoding="utf-8").replace("{{root}}", root)
    if re.search(r"\{\{\w+\}\}", text):
        raise SystemExit("seo_footer: templates/sitelinks.html has a placeholder other than {{root}}")
    return text.rstrip("\n")
