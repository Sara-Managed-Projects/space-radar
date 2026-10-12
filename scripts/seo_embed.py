#!/usr/bin/env python3
"""The /embed/ page: a copy-paste generator for an object, a trip and the map (growth task).

    python3 scripts/seo_embed.py --out DIR [--host https://www.spaceradar.ai]

Writes DIR/embed/index.html (templates/embed.html filled in) and DIR/embed/generate.js (the
generator, templates/embed/generate.js). scripts/build_seo.py calls build() so that the page is in
the same tree as the object pages and the sitemap names it; scripts/deploy.sh ships DIR/embed/.
The address is /embed/index.html, not /embed/: the origin is S3's REST endpoint and answers a
directory URL with 403 (scripts/build_seo.py says why, the press page is the precedent).

THREE THINGS ARE KEPT IN STEP, and tests/test_seo_embed.py runs all three under Node:
    the app's own Embed button      site/js/ui/embed.js embedSnippet
    the page's generator            templates/embed/generate.js snippet
    the page's no-JavaScript examples   snippet() below (the same iframe, written in Python)
The test holds the three equal for every object and every trip, and holds each address to what the
app's reader accepts (embedLink), so "the generator outputs working code" is checked, not hoped.

THE LIST OF SITES THAT EMBED IT is registry/embedders.yaml: opt-in, and empty until a site asks. An
empty list prints one honest line and the link to the Discussions "Show and tell" category; it never
says or implies that anyone uses it.
"""

from __future__ import annotations

import html
import re
import shutil
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seo_footer import sitelinks  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"
DEFAULT_HOST = "https://www.spaceradar.ai"
BASE = "https://www.spaceradar.ai/"
CREDIT_HREF = "https://www.spaceradar.ai/?from=embed"
SHOW_AND_TELL = "https://github.com/Sara-Managed-Projects/space-radar/discussions/categories/show-and-tell"
SAFE_VALUE = re.compile(r"^[A-Za-z0-9._:+\- ]{1,80}$")
# What the page opens on, and the two examples beside the map.
DEFAULT_OBJECT = "sat-25544"
EXAMPLE_TRIP = "moon-landings"
NONE_YET = "None yet. If you have put Space Radar in a page and would like it listed here, "
TELL_US = "tell us in Show and tell"

esc = lambda s: html.escape(str(s), quote=True)  # noqa: E731


def attr(s: str) -> str:
    """ui/embed.js attr(): & \" < > and not the apostrophe, so the three writers agree byte for byte."""
    return str(s).replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


def address(kind: str, ident: str | None = None) -> str:
    if kind == "map":
        return f"{BASE}?embed=1"
    if kind not in ("object", "trip"):
        raise ValueError(f"kind must be object, trip or map, not {kind}")
    if not SAFE_VALUE.match(ident or ""):
        raise ValueError(f"{ident!r} is not an id the embed reads")
    from urllib.parse import quote
    return f"{BASE}?embed=1&{'trip' if kind == 'trip' else 'at'}={quote(ident, safe='')}"


def frame_title(kind: str, name: str) -> str:
    if kind == "map":
        return "Space Radar, a live 3D map of space"
    return f"{name}, a guided trip on Space Radar" if kind == "trip" else f"{name}, live on Space Radar"


def snippet(kind: str, ident: str | None = None, name: str = "", width: int = 600, height: int = 400, credit: bool = True) -> str:
    frame = (f'<iframe src="{attr(address(kind, ident))}" title="{attr(frame_title(kind, name))}" width="{width}" '
             f'height="{height}" loading="lazy" allow="fullscreen" style="border:0;max-width:100%"></iframe>')
    return frame + (f'\n<p>Live view by <a href="{CREDIT_HREF}">Space Radar</a></p>' if credit else "")


def read_embedders(path: Path | None = None) -> list[dict]:
    doc = yaml.safe_load((path or ROOT / "registry" / "embedders.yaml").read_text(encoding="utf-8")) or {}
    rows = doc.get("embedders") or []
    seen: set[str] = set()
    for row in rows:
        name, url, note = str(row.get("name") or ""), str(row.get("url") or ""), str(row.get("note") or "")
        if not name or len(name) > 80:
            raise SystemExit(f"seo_embed: an embedder needs a name of at most 80 characters: {row!r}")
        if not re.match(r"^https://[^\s<>\"']+$", url):
            raise SystemExit(f"seo_embed: {name}: the url must be https and have no spaces: {url!r}")
        if len(note) > 120:
            raise SystemExit(f"seo_embed: {name}: the note is over 120 characters")
        if url in seen:
            raise SystemExit(f"seo_embed: {url} is listed twice")
        seen.add(url)
    return rows


def embedders_html(rows: list[dict]) -> str:
    if not rows:
        return f'<p>{esc(NONE_YET)}<a href="{SHOW_AND_TELL}" rel="noopener">{TELL_US}</a>.</p>\n'
    items = "".join(f'<li><a href="{esc(r["url"])}" rel="noopener">{esc(r["name"])}</a>'
                    + (f' <span class="dim">{esc(r["note"])}</span>' if r.get("note") else "") + "</li>\n" for r in rows)
    return (f'<ul class="plain">\n{items}</ul>\n<p class="hint">Listed because their owners asked. To be added, '
            f'<a href="{SHOW_AND_TELL}" rel="noopener">{TELL_US}</a>.</p>\n')


def trips() -> tuple[list[dict], list[dict]]:
    doc = yaml.safe_load((ROOT / "registry" / "tours.yaml").read_text(encoding="utf-8"))
    return [{"id": t["id"], "title": t["title"], "group": t["group"]} for t in doc["tours"]], doc["groups"]


def options(pages: list[dict]) -> tuple[str, str]:
    by: dict[str, list[dict]] = {}
    for p in pages:
        by.setdefault(p["klassLabel"], []).append(p)
    objs = ""
    for label in sorted(by):
        rows = "".join(f'<option value="{esc(p["id"])}"{" selected" if p["id"] == DEFAULT_OBJECT else ""}>{esc(p["name"])}</option>\n'
                       for p in sorted(by[label], key=lambda p: p["name"].lower()))
        objs += f'<optgroup label="{esc(label)}">\n{rows}</optgroup>\n'
    rows, groups = trips()
    tr = ""
    for g in sorted(groups, key=lambda g: g["order"]):
        mine = [t for t in rows if t["group"] == g["id"]]
        if mine:
            tr += f'<optgroup label="{esc(g["display"])}">\n' + "".join(
                f'<option value="{esc(t["id"])}"{" selected" if t["id"] == EXAMPLE_TRIP else ""}>{esc(t["title"])}</option>\n' for t in mine) + "</optgroup>\n"
    return objs, tr


def examples(pages: list[dict]) -> str:
    name = next((p["name"] for p in pages if p["id"] == DEFAULT_OBJECT), None)
    rows, _ = trips()
    trip = next((t for t in rows if t["id"] == EXAMPLE_TRIP), None)
    if name is None or trip is None:
        raise SystemExit(f"seo_embed: the examples need the object {DEFAULT_OBJECT} and the trip {EXAMPLE_TRIP}")
    cards = [("One object, live", snippet("object", DEFAULT_OBJECT, name)),
             (f"A guided trip: {trip['title']}", snippet("trip", EXAMPLE_TRIP, trip["title"])),
             ("The whole map", snippet("map"))]
    return "".join(f'<div><h3>{esc(title)}</h3><pre class="code">{esc(code)}</pre></div>\n' for title, code in cards)


def build(out: Path, host: str, pages: list[dict], style: str, icon: str) -> Path:
    dest = out / "embed"
    dest.mkdir(parents=True, exist_ok=True)
    objs, tr = options(pages)
    page = (TEMPLATES / "embed.html").read_text(encoding="utf-8")
    values = {"url": esc(f"{host}/embed/index.html"), "host": esc(host), "style": style, "icon": icon,
              "object_options": objs, "trip_options": tr, "examples": examples(pages),
              "embedders": embedders_html(read_embedders()), "sitelinks": sitelinks("../"), "root": "../"}
    for key, value in values.items():
        page = page.replace("{{" + key + "}}", value)
    if re.search(r"\{\{\w+\}\}", page):
        raise SystemExit("seo_embed: an unfilled placeholder is left in templates/embed.html")
    (dest / "index.html").write_text(page, encoding="utf-8")
    shutil.copyfile(TEMPLATES / "embed" / "generate.js", dest / "generate.js")
    return dest


def main(argv: list[str]) -> int:
    import json
    import subprocess
    out, host = None, DEFAULT_HOST
    args = list(argv)
    while args:
        a = args.pop(0)
        if a == "--out" and args:
            out = Path(args.pop(0))
        elif a == "--host" and args:
            host = args.pop(0).rstrip("/")
        else:
            print(f"seo_embed: unknown or incomplete option {a}", file=sys.stderr)
            return 2
    if out is None:
        print("usage: python3 scripts/seo_embed.py --out DIR [--host URL]", file=sys.stderr)
        return 2
    run = subprocess.run(["node", str(ROOT / "scripts" / "object_pages.mjs")], capture_output=True, text=True, cwd=ROOT)
    if run.returncode != 0:
        raise SystemExit(f"seo_embed: scripts/object_pages.mjs failed:\n{run.stderr}")
    pages = json.loads(run.stdout)["pages"]
    style = (TEMPLATES / "seo.css").read_text(encoding="utf-8")
    from build_seo import ICON
    print(f"wrote {build(out, host, pages, style, ICON)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
