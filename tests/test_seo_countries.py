#!/usr/bin/env python3
"""The country pages, /country/<iso>/ (forge #152; scripts/seo_countries.py).

    python3 tests/test_seo_countries.py

Built from the committed counts (registry/owner-counts.json), never the machine's saved catalogue, so the test is the
same on every machine. Held: one page per country the catalogue names, at its lower-case ISO code, two levels down
with every relative link moved with it; the title and the description inside the search engines' lengths; the count
dated; the map link with the owner's code; India's flag; the Soviet Union's note on Russia's page; a joint code named
on both of its countries' pages and counted on neither.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import seo_countries  # noqa: E402
from seo_common import make_ctx, render  # noqa: E402

problems: list[str] = []


def check(ok: bool, msg: str) -> None:
    if not ok:
        problems.append(msg)


seo_countries.SNAPSHOT = ROOT / "no-such-file.json"  # the committed counts, whatever this machine has saved
host = "https://spaceradar.ai"
pages = seo_countries.pages(host)
by = {p.path: p for p in pages}
index = by.get("country/index.html")
check(index is not None, "the index page")
countries = [p for p in pages if p.path.startswith("country/") and p.path.count("/") == 2]
check(len(countries) >= 80, f"a page per country: {len(countries)}")
for p in countries:
    slug = p.path.split("/")[1]
    check(re.fullmatch(r"[a-z]{2}", slug) is not None, f"{p.path}: the slug is an ISO 3166 alpha-2 code")
    check(len(p.title) <= 60, f"{p.path}: title {len(p.title)} > 60")
    check(70 <= len(p.description) <= 160, f"{p.path}: description {len(p.description)}")
    check("#owner=" in p.body and re.search(r"read \d{1,2} [A-Z][a-z]+ 20\d\d", p.body) is not None, f"{p.path}: a dated count and the map link")
    check("Measured." in p.body, f"{p.path}: says the counts are measured")

india = by["country/in/index.html"]
html = seo_countries.relink(render(india, make_ctx(host, {})))
check('href="../../#owner=IND"' in html, "India: the map link is #owner=IND, two levels up")
check('src="../../images/flags/in.svg"' in html and (ROOT / "site/images/flags/in.svg").is_file(), "India: its flag")
check('href="../../css/static.css"' in html and 'href="../css/' not in html, "every relative link moved with the page")
check('"identifier":"IN"' in html.replace(" ", ""), "India: the Country in the JSON-LD")
check("Soviet Union" in by["country/ru/index.html"].body, "Russia's page says the catalogue counts the Soviet Union with it")
check("China and Brazil" in by["country/cn/index.html"].body and "China and Brazil" in by["country/br/index.html"].body, "a joint code on both its countries' pages")
check('href="in/index.html"' in index.body and index.path.count("/") == 1, "the index links each page, one level down")
check(seo_countries.relink('<a href="../x">') == '<a href="../../x">' and seo_countries.relink('<a href="https://a/../b">') == '<a href="https://a/../b">', "relink")

if problems:
    print(f"test_seo_countries: {len(problems)} problem(s)\n  - " + "\n  - ".join(problems), file=sys.stderr)
    sys.exit(1)
print(f"test_seo_countries: ok ({len(countries)} country pages)")
