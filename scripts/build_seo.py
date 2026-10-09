#!/usr/bin/env python3
"""Build the pages a search engine reads, into a directory outside git (spec 0059, spec 0061 task 9).

    python3 scripts/build_seo.py --out DIR [--host https://www.spaceradar.ai]

writes, under DIR:
    o/<slug>.html   one page per notable object, from templates/object.html
    404.html        from templates/404.html
    sitemap.xml     the home page, every trip page (site/t/) and every object page
    object-pages.json  {record id: slug}, for the app's share sheet (spec 0061 task 8)
    + everything scripts/seo_pages.py adds (the question pages, the 40 star systems, /events/, /teachers/ ...)
      and one share picture per page under share/ (scripts/seo_share.py; needs Pillow, else the old pictures stay),
      with sitemap-images.xml listing them

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

LASTMOD is per page: the date of the last change of the file that produces it (scripts/seo_dates.py,
`git log -1 --format=%cs`), so a crawler can tell which pages moved. A page with no date of its own
gets the date of the commit the build is made from (`git log -1`), or the build date outside git.
"""

from __future__ import annotations

import datetime as dt
import html
import json
import os
import re
import shutil
import struct
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import seo_pages  # noqa: E402  (growth pages: scripts/seo_pages.py)
import seo_share  # noqa: E402
import seo_dates  # noqa: E402
import seo_embed  # noqa: E402
import indexnow  # noqa: E402
from seo_footer import sitelinks  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
TEMPLATES = ROOT / "templates"
DEFAULT_HOST = "https://www.spaceradar.ai"
SAFE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
ICON = ("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>"
        "<rect width='64' height='64' rx='12.5' fill='%230B0E14'/>"
        "<circle cx='32' cy='32' r='14.38' fill='%232E6FB8'/>"
        "<path d='M39.82 19.94A16.38 16.38 0 0 0 25.51 44.83A14.38 14.38 0 0 0 39.82 19.94Z' fill='%23123255'/>"
        "<path d='M10.09 35.86A22.25 22.25 0 0 1 49.04 17.7' stroke='%23FF9F43' stroke-width='5.25' "
        "stroke-linecap='round' fill='none'/></svg>")

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


def object_page(p: dict, host: str, template: str, style: str, share: "seo_share.Spec | None" = None) -> str:
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
    if share is None and not (SITE / image_rel).is_file():
        raise SystemExit(f"build_seo: {p['slug']} names a picture that is not in site/: {image_rel}")
    if share is not None:  # the page's own picture, drawn by scripts/seo_share.py
        image_rel, (image_w, image_h), image_alt = share.rel, (1200, 630), share.alt
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
        "icon": ICON, "style": style, "sitelinks": sitelinks("../"),
        "jsonld": json.dumps(ld, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"),
        "colour": esc(p.get("colour") or "#9aa4b2"), "klass": esc(p["klassLabel"]), "lead": esc(p["lead"]),
        "why": f'<p>{esc(p["why"])}</p>\n' if p.get("why") else "", "id": p["id"],
        "live_line": esc(p["liveLine"]),
        # internal #294: a planet, the Moon or the Sun gets its "where is it now" line worked out in the browser
        # (site/js/objectnow.js); the static sentence in the paragraph is the fallback and what a crawler reads.
        "now_attrs": (f' id="now" data-body="{esc(p["nowBody"])}" data-name="{esc(("The " if p["nowBody"] in ("Sun", "Moon") else "") + p["nowBody"])}"'
                      if p.get("nowBody") else ""),
        "now_script": '<script type="module" src="../js/objectnow.js"></script>\n' if p.get("nowBody") else "",
        "now_note": "; the one line under the button is worked out in your browser from your clock" if p.get("nowBody") else "",
        "figure": figure, "facts": facts, "myths": myths,
        "see": f'<h2>{esc(p["seeLabel"])}</h2>\n<p>{esc(p["see"])}</p>\n' if p.get("see") else "",
        "drawn": section("drawn", f'<p>{esc(p["drawing"])}</p>') if p.get("drawing") else "",
        "related": related,
        "sources": f"<p>{linkify(p['sources'])}</p>\n" if p.get("sources") else "",
    })


def lastmod() -> str:
    """The date of the commit the build is made from: the fallback for a page with no date of its own."""
    return seo_dates.fallback(ROOT)


def sitemap(host: str, slugs: list[str], press: bool = False, dates: dict[str, str] | None = None,
            extra: list[str] | None = None, growth: list | None = None) -> str:
    """`dates` maps a URL to its lastmod (scripts/seo_dates.py: the last change of the page's own
    source); a URL it does not name gets the build commit's date. `extra` are further pages by path
    from the root (the embed gallery), already built into the same tree. `growth` are the pages
    scripts/seo_pages.py builds, as (path, lastmod or ""): their own date where they have one."""
    default = lastmod()
    dates = dates or {}
    # The press page (scripts/build_press.py) had no way in for a crawler (internal #398). It is
    # named here by its full address, as the origin serves no index documents below the root, and
    # only when it has been built into the same tree: scripts/deploy.sh builds it first, and
    # check_seo.py refuses a sitemap that names a page which is not there.
    urls = [f"{host}/"] + ([f"{host}/press/index.html"] if press else []) + [f"{host}/{x}" for x in (extra or [])] \
        + [f"{host}/t/{f.name}" for f in sorted((SITE / "t").glob("*.html"))] \
        + [f"{host}/o/{s}.html" for s in sorted(slugs)]
    rows = "\n".join(f"<url><loc>{esc(u)}</loc><lastmod>{dates.get(u, default)}</lastmod></url>" for u in urls)
    # --- growth pages hook (scripts/seo_pages.py): the question pages, /events/, /teachers/ ... A planets-tonight
    # page's lastmod is the build's day; a page with none of its own takes the same default as every other.
    rows += "".join(f"\n<url><loc>{esc(host + '/' + path)}</loc><lastmod>{lm or default}</lastmod></url>" for path, lm in (growth or []))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"{rows}\n</urlset>\n")


def page_dates(host: str, pages: list[dict]) -> dict[str, str]:
    """{url: lastmod}: the home page, every trip's own row, every object page's group of source files,
    and the press page. See scripts/seo_dates.py for what each date is the date of."""
    default = lastmod()
    out = {f"{host}/": seo_dates.page_date(seo_dates.HOME_SOURCES, ROOT, default),
           f"{host}/press/index.html": seo_dates.page_date(["templates/press.html", "scripts/build_press.py"], ROOT, default)}
    trips = [f.stem for f in sorted((SITE / "t").glob("*.html"))]
    for trip, date in seo_dates.trip_dates(trips, ROOT, default).items():
        out[f"{host}/t/{trip}.html"] = date
    for slug, date in seo_dates.object_dates({p["slug"]: p["group"] for p in pages}, ROOT, default).items():
        out[f"{host}/o/{slug}.html"] = date
    return out


def build(out: Path, host: str, today: str | None = None, snapshot_index: dict | None = None, share_mode: str = "auto") -> int:
    style = (TEMPLATES / "seo.css").read_text(encoding="utf-8")
    template = (TEMPLATES / "object.html").read_text(encoding="utf-8")
    pages = read_pages()
    if not (out / "press" / "index.html").is_file():
        # Every built page's footer links the press page, so it is built here when deploy.sh has not already (growth pages hook).
        import build_press
        build_press.build(out, host)
    today = today or dt.datetime.now(dt.timezone.utc).date().isoformat()
    # --- growth pages hook: what scripts/seo_pages.py adds, and the share pictures. It replaces the object pages at
    # the slugs it owns (the ISS answer page, the star systems) and draws one picture per page.
    extra = seo_pages.build_extra(out, host, pages, today, snapshot_index, share_mode)
    o = out / "o"
    keep = {f.name for f in o.glob("*.html")} if o.exists() else set()  # the extra pages were just written here
    slugs = []
    for p in pages:
        if p["slug"] in slugs:
            raise SystemExit(f"build_seo: two pages want o/{p['slug']}.html")
        slugs.append(p["slug"])
        if p["slug"] in extra["replaced"]:
            continue
        share = extra["specs"].get(f"o/{p['slug']}") if extra["drawn"] else None
        (o / f"{p['slug']}.html").write_text(object_page(p, host, template, style, share), encoding="utf-8")
    for slug in extra["replaced"]:
        if slug not in slugs:
            slugs.append(slug)
    stale = keep - {f"{s}.html" for s in slugs}
    for name in stale:
        (o / name).unlink()
    nf = fill((TEMPLATES / "404.html").read_text(encoding="utf-8"), {"icon": ICON, "style": style, "sitelinks": sitelinks("/")})
    (out / "404.html").write_text(nf, encoding="utf-8")
    # The embed gallery and its generator (scripts/seo_embed.py), and the IndexNow key file
    # (scripts/indexnow.py: public by design, written beside the pages so a deploy ships it).
    seo_embed.build(out, host, pages, style, ICON)
    indexnow.write_key(out)
    dates = page_dates(host, pages)
    dates[f"{host}/embed/index.html"] = seo_dates.page_date(
        ["templates/embed.html", "templates/embed/generate.js", "scripts/seo_embed.py", "registry/embedders.yaml"], ROOT, lastmod())
    (out / "sitemap.xml").write_text(sitemap(host, slugs, press=(out / "press" / "index.html").is_file(), dates=dates,
                                             extra=["embed/index.html"], growth=extra["sitemap"]), encoding="utf-8")
    # The share sheet links an object to its page (ui/sharesheet.js objectPageUrl), so that a link
    # preview shows the object's own title and picture. Which records have a page, and under which
    # slug, is decided here and nowhere else; the sheet fetches this when it opens and never guesses.
    index = {p["id"]: p["slug"] for p in pages}
    # (extra["index"] maps every exoplanet and system star to its system's page; tests/test_sharesheet.mjs pins this file to the
    # object pages' own records, so it is not merged until that test and the sheet are changed together.)
    (out / "object-pages.json").write_text(json.dumps(index, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    # --- growth pages hook: the image sitemap and the record of what was drawn (scripts/check_seo.py reads both).
    rows = [(f"{host}/{path}", f"{host}/{extra['specs'][key].rel}", extra["specs"][key].name)
            for path, key in _image_rows(pages, extra)] if extra["drawn"] else []
    (out / "sitemap-images.xml").write_text(seo_share.image_sitemap(host, rows), encoding="utf-8")
    (out / "share-manifest.json").write_text(json.dumps({"drawn": extra["drawn"], "pictures": len(rows)}), encoding="utf-8")
    return len(pages) + len([p for p in extra["pages"] if not p.path.startswith("o/")])


def _image_rows(pages: list[dict], extra: dict) -> list[tuple[str, str]]:
    """(page path, share key) for every page that has a picture, in a stable order."""
    rows = [(f"o/{p['slug']}.html", f"o/{p['slug']}") for p in pages if p["slug"] not in extra["replaced"]]
    rows += [(pg.path, pg.share.key) for pg in extra["pages"] if pg.share is not None and pg.in_sitemap]
    return sorted(rows)


def main(argv: list[str]) -> int:
    # SR_SHARE=off|require sets the share pictures' mode for a build that is not started with the flag (scripts/deploy.sh in a test).
    out, host, today, snap, share_mode = None, DEFAULT_HOST, None, None, os.environ.get("SR_SHARE", "auto")
    args = list(argv)
    while args:
        a = args.pop(0)
        if a == "--out" and args:
            out = Path(args.pop(0))
        elif a == "--host" and args:
            host = args.pop(0).rstrip("/")
        elif a == "--today" and args:  # the date the dated pages are built for (default: today, UTC)
            today = args.pop(0)
        elif a == "--snapshot-index" and args:  # a copy of data/v1/index.json: the saved counts' day and size
            snap = json.loads(Path(args.pop(0)).read_text(encoding="utf-8"))
        elif a == "--no-share":  # skip drawing the share pictures (a quick local build)
            share_mode = "off"
        elif a == "--require-share":  # refuse to build without drawing them (CI)
            share_mode = "require"
        else:
            print(f"build_seo: unknown or incomplete option {a}", file=sys.stderr)
            return 2
    if out is None:
        print("usage: python3 scripts/build_seo.py --out DIR [--host URL]", file=sys.stderr)
        return 2
    if out.resolve() == SITE.resolve() or SITE.resolve() in out.resolve().parents:
        print("build_seo: --out must be outside site/; the built pages are not kept in git", file=sys.stderr)
        return 2
    n = build(out, host, today, snap, share_mode)
    print(f"built {n} pages, the embed page, 404.html, sitemap.xml, sitemap-images.xml and object-pages.json into {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
