#!/usr/bin/env python3
"""Build the pages a search engine reads, into a directory outside git (spec 0059, spec 0061 task 9).

    python3 scripts/build_seo.py --out DIR [--host https://www.spaceradar.ai]

writes, under DIR:
    o/<slug>.html   one page per notable object, from templates/object.html
    404.html        from templates/404.html
    sitemap.xml     the home page, every trip page (site/t/) and every object page
    object-pages.json  {record id: slug}, for the app's share sheet (spec 0061 task 8)

Nothing here is committed: scripts/deploy.sh runs this at deploy time and uploads DIR beside site/,
and CI runs it into a temporary directory and holds the output to scripts/check_seo.py. The only
inputs are what already exists: the records the map bundles (site/js/data, site/data), the
registries behind them, and the card's own sentence builders, run under Node by
scripts/object_pages.mjs. A page is therefore never stale: it is rebuilt from the records on every
deploy, and a record that leaves the registry loses its page through deploy.sh's --delete.

NO LIVE NUMBER. The card is asked for its words with a clock that throws, the card's own path for
"no position", so a page says what the thing is and never where it is at the moment of the build.
"See it live" goes to `../#at=<id>`, relative like the trip pages (it stays right under the /site/
prefix every local check uses); canonical, og:url and JSON-LD are absolute.

`<slug>.html`, NOT `<slug>/index.html`. CloudFront applies its default root object to the root only
and the origin is S3's REST endpoint, which has no index documents: `/o/<slug>/` would answer 403
(spec 0032 design §4, the trip pages' reason).

LASTMOD is the date of the commit the build is made from (`git log -1`), or the build date outside
git: every page is rebuilt from that commit's records, so that is when it can last have changed.
"""

from __future__ import annotations

import datetime as dt
import html
import json
import re
import shutil
import struct
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
TEMPLATES = ROOT / "templates"
DEFAULT_HOST = "https://www.spaceradar.ai"
SAFE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
ICON = ("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' "
        "cy='16' r='9' fill='%231B4F8A'/><circle cx='16' cy='16' r='13' fill='none' stroke='%23FF9F43' "
        "stroke-width='1.5' stroke-dasharray='3 4'/></svg>")

# What the share pictures under site/og/ show. A trip's picture is used only where its caption
# fits the object (the Moon's landings, the crewed stations); the rest share the site's own card.
OG_ALT = {
    "default": "The Earth from space with the satellites around it as points of light, captioned Space Radar.",
    "moon-landings": "A lunar lander on the grey curve of the Moon, captioned Where we have landed on the Moon.",
    "people-in-space": "The night side of the Earth ringed by satellites, captioned Where people are living in space right now.",
}
# The headings inside a page. Everything else on it is the card's words or the template's.
H = {"facts": "Key facts", "myths": "Often said", "drawn": "How the map draws it", "related": "See also"}

esc = lambda s: html.escape(str(s), quote=True)  # noqa: E731
URL = re.compile(r"https?://[^\s<>\"]+")


def linkify(text: str) -> str:
    """Escape a source line and make its URLs links. A trailing ')' or '.' is not part of a URL."""
    out, last = [], 0
    for m in URL.finditer(text):
        url = m.group(0).rstrip(".,;)")
        out += [esc(text[last:m.start()]), f'<a href="{esc(url)}" rel="nofollow">{esc(url)}</a>']
        last = m.start() + len(url)
    return "".join(out) + esc(text[last:])


def jpeg_size(path: Path) -> tuple[int, int] | None:
    """Width and height from a JPEG's frame header, so an <img> reserves its box (no layout shift)."""
    data, i = path.read_bytes(), 2
    while i + 9 < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        if data[i + 1] in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack(">HH", data[i + 5:i + 9])
            return w, h
        i += 2 + struct.unpack(">H", data[i + 2:i + 4])[0]
    return None


def fill(template: str, values: dict[str, str]) -> str:
    out = re.sub(r"\{\{(\w+)\}\}", lambda m: values[m.group(1)], template)
    return out


def read_pages() -> list[dict]:
    node = shutil.which("node")
    if not node:
        raise SystemExit("build_seo: needs Node 22 on PATH; the card's words are JavaScript")
    run = subprocess.run([node, str(ROOT / "scripts" / "object_pages.mjs")], capture_output=True, text=True,
                         cwd=ROOT)
    if run.returncode != 0:
        raise SystemExit(f"build_seo: scripts/object_pages.mjs failed:\n{run.stderr}")
    return json.loads(run.stdout)["pages"]


def object_page(p: dict, host: str, template: str, style: str) -> str:
    for key in ("id", "slug"):
        if not SAFE.match(p[key]):
            raise SystemExit(f"build_seo: {key} {p[key]!r} is not a safe path segment")
    url = f"{host}/o/{p['slug']}.html"
    image_rel, (image_w, image_h), image_alt = f"og/{p['og']}.png", (1200, 630), OG_ALT[p["og"]]
    figure = ""
    img = p.get("image")
    size = jpeg_size(SITE / img["file"]) if img else None
    if img and size:
        image_rel, (image_w, image_h), image_alt = img["file"], size, img["alt"]
        credit = " · ".join(x for x in (img.get("credit"), img.get("licence")) if x)
        figure = (f'<figure><img src="../{esc(img["file"])}" width="{size[0]}" height="{size[1]}" '
                  f'alt="{esc(img["alt"])}" loading="lazy" decoding="async"><figcaption>{esc(credit)}'
                  f"</figcaption></figure>\n")
    if not (SITE / image_rel).is_file():
        raise SystemExit(f"build_seo: {p['slug']} names a picture that is not in site/: {image_rel}")
    image = f"{host}/{image_rel}"

    thing = {"@type": "Place" if p["place"] else "Thing", "@id": f"{url}#thing", "name": p["name"],
             "description": p["lead"], "url": url}
    if p.get("sameAs"):
        thing["sameAs"] = p["sameAs"]
    if figure:
        thing["image"] = image
    crumbs = {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Space Radar", "item": f"{host}/"},
        {"@type": "ListItem", "position": 2, "name": p["name"]}]}
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url, "url": url, "name": p["title"], "description": p["description"],
         "isPartOf": {"@id": f"{host}/#website"}, "about": {"@id": f"{url}#thing"}, "breadcrumb": crumbs},
        thing]}

    def section(key: str, inner: str) -> str:
        return f"<h2>{H[key]}</h2>\n{inner}\n"

    facts = ""
    if p["facts"]:
        rows = "".join(
            f'<div><dt>{esc(f["label"])}</dt><dd>'
            + (f'<a href="{esc(f["href"])}">{esc(f["value"])}</a>' if f.get("href") else esc(f["value"]))
            + "</dd></div>" for f in p["facts"])
        facts = section("facts", f"<dl>{rows}</dl>")
    myths = ""
    if p["myths"]:
        items = "".join(f'<li>{esc(m["claim"])} — {esc(m["correction"])}'
                        + (f'<br><span class="dim">{linkify(m["source"])}</span>' if m.get("source") else "")
                        + "</li>" for m in p["myths"])
        myths = section("myths", f'<ul class="myths">{items}</ul>')
    related = ""
    if p["related"]:
        links = "".join(f'<li><a href="{esc(r["slug"])}.html">{esc(r["name"])}</a></li>' for r in p["related"])
        related = section("related", f'<ul class="links">{links}</ul>')

    return fill(template, {
        "title": esc(p["title"]), "description": esc(p["description"]), "url": esc(url), "name": esc(p["name"]),
        "image": esc(image), "image_w": str(image_w), "image_h": str(image_h), "image_alt": esc(image_alt),
        "icon": ICON, "style": style,
        "jsonld": json.dumps(ld, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"),
        "colour": esc(p.get("colour") or "#9aa4b2"), "klass": esc(p["klassLabel"]), "lead": esc(p["lead"]),
        "why": f'<p>{esc(p["why"])}</p>\n' if p.get("why") else "", "id": p["id"],
        "live_line": esc(p["liveLine"]), "figure": figure, "facts": facts, "myths": myths,
        "see": f'<h2>{esc(p["seeLabel"])}</h2>\n<p>{esc(p["see"])}</p>\n' if p.get("see") else "",
        "drawn": section("drawn", f'<p>{esc(p["drawing"])}</p>') if p.get("drawing") else "",
        "related": related,
        "sources": f"<p>{linkify(p['sources'])}</p>\n" if p.get("sources") else "",
    })


def lastmod() -> str:
    run = subprocess.run(["git", "log", "-1", "--format=%cs"], cwd=ROOT, capture_output=True, text=True)
    date = run.stdout.strip() if run.returncode == 0 else ""
    return date if re.match(r"^\d{4}-\d{2}-\d{2}$", date) else dt.datetime.now(dt.timezone.utc).date().isoformat()


def sitemap(host: str, slugs: list[str]) -> str:
    date = lastmod()
    urls = [f"{host}/"] + [f"{host}/t/{f.name}" for f in sorted((SITE / "t").glob("*.html"))] \
        + [f"{host}/o/{s}.html" for s in sorted(slugs)]
    rows = "\n".join(f"<url><loc>{esc(u)}</loc><lastmod>{date}</lastmod></url>" for u in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"{rows}\n</urlset>\n")


def build(out: Path, host: str) -> int:
    style = (TEMPLATES / "seo.css").read_text(encoding="utf-8")
    template = (TEMPLATES / "object.html").read_text(encoding="utf-8")
    pages = read_pages()
    o = out / "o"
    if o.exists():
        shutil.rmtree(o)
    o.mkdir(parents=True)
    slugs = []
    for p in pages:
        if p["slug"] in slugs:
            raise SystemExit(f"build_seo: two pages want o/{p['slug']}.html")
        slugs.append(p["slug"])
        (o / f"{p['slug']}.html").write_text(object_page(p, host, template, style), encoding="utf-8")
    nf = fill((TEMPLATES / "404.html").read_text(encoding="utf-8"), {"icon": ICON, "style": style})
    (out / "404.html").write_text(nf, encoding="utf-8")
    (out / "sitemap.xml").write_text(sitemap(host, slugs), encoding="utf-8")
    # The share sheet links an object to its page (ui/sharesheet.js objectPageUrl), so that a link
    # preview shows the object's own title and picture. Which records have a page, and under which
    # slug, is decided here and nowhere else; the sheet fetches this when it opens and never guesses.
    index = {p["id"]: p["slug"] for p in pages}
    (out / "object-pages.json").write_text(json.dumps(index, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    return len(pages)


def main(argv: list[str]) -> int:
    out, host = None, DEFAULT_HOST
    args = list(argv)
    while args:
        a = args.pop(0)
        if a == "--out" and args:
            out = Path(args.pop(0))
        elif a == "--host" and args:
            host = args.pop(0).rstrip("/")
        else:
            print(f"build_seo: unknown or incomplete option {a}", file=sys.stderr)
            return 2
    if out is None:
        print("usage: python3 scripts/build_seo.py --out DIR [--host URL]", file=sys.stderr)
        return 2
    if out.resolve() == SITE.resolve() or SITE.resolve() in out.resolve().parents:
        print("build_seo: --out must be outside site/; the built pages are not kept in git", file=sys.stderr)
        return 2
    n = build(out, host)
    print(f"built {n} object pages, 404.html, sitemap.xml and object-pages.json into {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
