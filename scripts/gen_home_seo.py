#!/usr/bin/env python3
"""Write the home page's search and preview tags into site/index.html (spec 0061 task 9).

WHAT IS IN THE BLOCK. The title and description a search result shows, the canonical URL, the Open
Graph and Twitter Card tags a chat or a feed shows for a shared link to the root, `theme-color`,
and a JSON-LD `WebSite` that the trip and object pages name as the site they are part of.

NO Dataset (asked for in the brief, left out on purpose). It lists every upstream in
registry/sources.yaml and costs about 650 bytes on the home page's first visit, and
`first_visit_bytes` had about 500 bytes of headroom on 2026-10-01: the screens job failed by 608 B
with it in. It belongs on a page of its own, generated beside the object pages, if it is wanted.

NO SearchAction. A sitelinks search box needs a URL that runs a search, and the app has none:
ui/urlstate.js KEYS has no `q`, and `#at=` resolves a name to one object rather than listing
results. Pointing a SearchAction at `#at=` would promise a search the page does not do.

THE BYTES. This block is on the home page's first visit, so it is kept to the tags a crawler or an
unfurler reads, one line each.

    python3 scripts/gen_home_seo.py           # rewrite the block
    python3 scripts/gen_home_seo.py --check   # exit 1 if it is stale
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "site" / "index.html"
BEGIN = "<!-- SEO:BEGIN scripts/gen_home_seo.py -->"
END = "<!-- SEO:END -->"

HOST = "https://www.spaceradar.ai"
NAME = "Space Radar"
TITLE = "Space Radar: live 3D map of satellites, planets and stars"
DESCRIPTION = ("A live 3D map of space: satellites and the ISS, launches, probes, planets, stars and "
               "galaxies, each drawn where it really is, with where the numbers come from.")
# What a shared link to the root says (spec 0033), unchanged.
OG_DESCRIPTION = "Everything in motion around Earth, where it really is, right now."
OG_IMAGE_ALT = "The Earth from space with its satellites as points of light, captioned Space Radar."
def block() -> str:
    ld = {"@context": "https://schema.org", "@type": "WebSite", "@id": f"{HOST}/#website", "url": f"{HOST}/",
          "name": NAME}
    e = lambda s: html.escape(s, quote=True)  # noqa: E731
    lines = [
        BEGIN,
        f"<title>{e(TITLE)}</title>",
        f'<meta name="description" content="{e(DESCRIPTION)}">',
        f'<link rel="canonical" href="{HOST}/">',
        '<meta name="theme-color" content="#0b0e14">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:site_name" content="{NAME}">',
        f'<meta property="og:title" content="{NAME}">',
        f'<meta property="og:description" content="{e(OG_DESCRIPTION)}">',
        f'<meta property="og:image" content="{HOST}/og/default.png">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{e(OG_IMAGE_ALT)}">',
        f'<meta property="og:url" content="{HOST}/">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<script type="application/ld+json">'
        + json.dumps(ld, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + "</script>",
        END,
    ]
    return "\n".join(lines)


def rewrite(text: str) -> str:
    pattern = re.compile(re.escape(BEGIN) + r".*?" + re.escape(END), re.S)
    if not pattern.search(text):
        raise SystemExit(f"gen_home_seo: {HTML.relative_to(ROOT)} has no {BEGIN!r} block")
    return pattern.sub(lambda _: block(), text, count=1)


def main(argv: list[str]) -> int:
    check = "--check" in argv
    current = HTML.read_text(encoding="utf-8")
    want = rewrite(current)
    if check:
        if want == current:
            print("the home page's search and preview tags are current")
            return 0
        print(f"{HTML.relative_to(ROOT)}: the SEO block is STALE (registry/sources.yaml or the words changed).\n"
              f"  Run: python3 scripts/{Path(sys.argv[0]).name}")
        return 1
    if want != current:
        HTML.write_text(want, encoding="utf-8")
        print(f"wrote the SEO block in {HTML.relative_to(ROOT)}")
    else:
        print("the SEO block is already current")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
