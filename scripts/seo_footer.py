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

`{{support}}` is the Support link to /support/, and only once registry/support.yaml names the fund
(scripts/support.py); until then the line is dropped and the footer is what it was.
"""

from __future__ import annotations

import re
from pathlib import Path

from support import support_url

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
    "satellites/index.html", "starlink/index.html", "lab/index.html",
]


def sitelinks(root: str) -> str:
    link = f'<li><a href="{{{{root}}}}support/index.html">Support</a></li>\n' if support_url() else ""
    text = PARTIAL.read_text(encoding="utf-8").replace("{{support}}\n", link).replace("{{root}}", root)
    if re.search(r"\{\{\w+\}\}", text):
        raise SystemExit("seo_footer: templates/sitelinks.html has a placeholder other than {{root}}")
    return text.rstrip("\n")


# THE STATIC PAGES' FOOTER (the journal's design, internal web-kit footer()): the same partial, its lines grouped into
# the kit's link columns. The home page keeps the one flat list above (ui/status.js moves it into the Sources sheet).
# A line is placed by its address; one that no group names goes to the last, so a link added to the partial is never
# lost. The lines are kept exactly as the partial writes them.
GROUPS = [
    ("Explore", ("about/", "sources/", "accuracy/", "satellites/", "starlink/", "o/international-space-station",
                 "planets-tonight/", "events/")),
    ("Teach and share", ("teachers/", "press/", "embed/", "creators/", "support/", "privacy/")),
    ("Sites", ("https://blog.spaceradar.ai/", "https://games.spaceradar.ai/", "lab/")),
    ("Follow", ()),
]


def footer_columns(root: str) -> str:
    """The partial's lines in the kit's four columns, inside the one <nav class="sitelinks"> (check_seo.py reads the
    footer's links, tests/test_seo_growth.py takes the nav out whole). The map itself heads the sites column."""
    text = sitelinks(root)
    head, _, rest = text.partition("<ul>\n")
    lines = [ln for ln in rest.rsplit("</ul>", 1)[0].splitlines() if ln.strip()]
    href = lambda ln: re.search(r'href="([^"]*)"', ln).group(1)  # noqa: E731
    cols: list[list[str]] = [[] for _ in GROUPS]
    cols[2].append(f'<li><a href="{root}">The 3D map</a></li>')
    for ln in lines:
        h = href(ln)
        local = h[len(root):] if root and h.startswith(root) else h
        at = next((i for i, (_, keys) in enumerate(GROUPS) if any(local.startswith(k) for k in keys)), len(GROUPS) - 1)
        cols[at].append(ln)
    # Each column in its group's order (the sites as the header has them: Map, Journal, Games, Lab).
    rank = lambda i, ln: next((j for j, k in enumerate(GROUPS[i][1]) if (href(ln)[len(root):] if root and href(ln).startswith(root) else href(ln)).startswith(k)), -1)  # noqa: E731
    cols = [sorted(c, key=lambda ln, i=i: rank(i, ln)) for i, c in enumerate(cols)]
    body = "".join(f'<div><p class="foot__h">{name}</p><ul>\n' + "\n".join(c) + "\n</ul></div>\n" for (name, _), c in zip(GROUPS, cols) if c)
    return f"{head}\n{body}</nav>"
