#!/usr/bin/env python3
"""The long reads (scripts/seo_read.py, registry/articles.yaml, registry/articles/*.md) say what they promise.

    python3 tests/test_seo_read.py

Built by scripts/build_seo.py into a temporary directory, with `--no-share` and a fixed `--today`. Held, each by a
case that fails when the thing it guards is broken:

  the index        /read/index.html exists, lists every article by release and links each; it is in the sitemap
  every article    one page per row; one H1; a title of at most 60 characters; a description of 70 to 160; in the sitemap
                   with the row's date; Article JSON-LD with its headline, date and image; a canonical of its own
  the body         600 to 1 000 words; a heading that starts "Measured"; a link into the map (https://www.spaceradar.ai/#...);
                   no attribution of a tool or a model (Ivan, 2026-10-14); no em dash
  the pictures     every <img> has alt text and a caption, its file is in site/images/read/<slug>/ and under 300 kB,
                   and every file of that folder is used by its article (no picture nobody shows)
  the renderer     a raw < in a body is shown as text, a figure whose file is missing is refused, a link to another
                   site gets rel="noopener"
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import seo_read  # noqa: E402

failures: list[str] = []
HOST = "https://www.spaceradar.ai"


def ok(cond: bool, msg: str) -> None:
    if cond:
        print(f"PASS: {msg}")
    else:
        failures.append(msg)
        print(f"FAIL: {msg}")


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.h1 = 0
        self.imgs: list[dict] = []
        self.captions = 0
        self.hrefs: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "h1":
            self.h1 += 1
        if tag == "img":
            self.imgs.append(a)
        if tag == "figcaption":
            self.captions += 1
        if tag == "a" and a.get("href"):
            self.hrefs.append(a["href"])


rows = seo_read.articles()
ok(len(rows) >= 5, f"registry/articles.yaml has the articles ({len(rows)})")

built = Path(tempfile.mkdtemp(prefix="seo-read-"))
r = subprocess.run([sys.executable, "scripts/build_seo.py", "--out", str(built), "--no-share", "--today", "2026-10-27"],
                   cwd=ROOT, capture_output=True, text=True)
ok(r.returncode == 0, f"build_seo.py builds ({(r.stdout or r.stderr).strip().splitlines()[-1:]})")
if r.returncode != 0:
    print(r.stderr)
    sys.exit(1)
sitemap = (built / "sitemap.xml").read_text(encoding="utf-8")

index = (built / "read" / "index.html").read_text(encoding="utf-8")
ok(f"<loc>{HOST}/read/index.html</loc>" in sitemap, "the index is in the sitemap")
ok(all(f'href="{a["slug"]}.html"' in index for a in rows), "the index links every article")
for rel in sorted({a["release"] for a in rows}):
    ok(f"Release {rel}" in index, f"the index has a heading for release {rel}")
ok("../read/index.html" in (built / "about" / "index.html").read_text(encoding="utf-8"), "the About page links the long reads")

for a in rows:
    slug = a["slug"]
    f = built / "read" / f"{slug}.html"
    ok(f.is_file(), f"{slug}: built")
    if not f.is_file():
        continue
    html = f.read_text(encoding="utf-8")
    p = Page()
    p.feed(html)
    title = re.search(r"<title>(.*?)</title>", html).group(1)
    desc = re.search(r'<meta name="description" content="(.*?)">', html).group(1)
    ok(p.h1 == 1, f"{slug}: one H1")
    ok(len(title) <= 60, f"{slug}: title fits a result ({len(title)})")
    ok(70 <= len(desc) <= 160, f"{slug}: description {len(desc)} characters")
    ok(f'<link rel="canonical" href="{HOST}/read/{slug}.html">' in html, f"{slug}: canonical is its own address")
    ok(f"<loc>{HOST}/read/{slug}.html</loc><lastmod>{a['published']}</lastmod>" in sitemap, f"{slug}: in the sitemap with its date")
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    nodes = [n for b in blocks for n in json.loads(b.replace("<\\/", "</")).get("@graph", [])]
    art = [n for n in nodes if n.get("@type") == "Article"]
    ok(len(art) == 1 and art[0]["headline"] == a["title"] and art[0]["datePublished"] == str(a["published"])
       and art[0]["image"].startswith(f"{HOST}/images/read/{slug}/"), f"{slug}: Article JSON-LD with headline, date and image")

    words = seo_read.word_count(a["text"])
    ok(seo_read.WORDS_MIN <= words <= seo_read.WORDS_MAX, f"{slug}: {words} words (600 to 1 000)")
    ok(re.search(r"^## Measured", a["text"], re.M) is not None, f"{slug}: says what is measured")
    ok(any(h.startswith(HOST + "/#") for h in p.hrefs), f"{slug}: links into the map")
    ok(not re.search(r"co-authored|generated with|claude|anthropic", a["text"], re.I) and not re.search(r"\bAI\b", a["text"]), f"{slug}: no tool or model credit")
    ok("—" not in a["text"], f"{slug}: no em dash")

    ok(len(p.imgs) >= 3 and len(p.imgs) == p.captions, f"{slug}: {len(p.imgs)} pictures, each with a caption")
    folder = ROOT / "site" / "images" / "read" / slug
    used = set()
    for im in p.imgs:
        name = Path(im["src"]).name
        used.add(name)
        file = folder / name
        ok(bool(im.get("alt", "").strip()), f"{slug}/{name}: alt text")
        ok(file.is_file() and file.stat().st_size <= seo_read.IMAGE_MAX_BYTES, f"{slug}/{name}: a file under 300 kB")
    ok(a["hero"] in used, f"{slug}: the hero is shown in the article")
    ok(used == {x.name for x in folder.glob("*.webp")}, f"{slug}: every picture of its folder is used")

# --- the renderer ----------------------------------------------------------------------------------------
out = seo_read.render_body("nebulae-in-three-dimensions", "A <script>x</script> and [out](https://example.org/x) and [in](https://www.spaceradar.ai/#go=moon).")
ok("<script>" not in out and "&lt;script&gt;" in out, "a raw < in a body is shown as text")
ok('<a href="https://example.org/x" rel="noopener">out</a>' in out and '<a href="https://www.spaceradar.ai/#go=moon">in</a>' in out,
   "another site's link gets rel=noopener, the map's does not")
try:
    seo_read.render_body("nebulae-in-three-dimensions", '![alt](no-such-file.webp "caption")')
    ok(False, "a figure whose file is missing is refused")
except SystemExit:
    ok(True, "a figure whose file is missing is refused")

print()
if failures:
    print(f"{len(failures)} FAILED")
    sys.exit(1)
print("OK: the long reads")
