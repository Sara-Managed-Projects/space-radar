#!/usr/bin/env python3
"""One static page per trip, so a shared link to a trip unfurls (spec 0032 requirement 7).

WHY A PAGE. The app is static files behind CloudFront (spec 0004), and a fragment never reaches
a server: `spaceradar.ai/#trip=moon-landings` hands a crawler or a chat unfurler the root page's
tags and nothing about the Moon. So every trip in registry/tours.yaml gets a real file,
`site/t/<id>.html`, carrying the trip's title and blurb as Open Graph tags, and sending a browser
on to `/#trip=<id>` three ways: a meta refresh, a script, and a plain link for no-script. The
short URL is what spec 0033 puts on the clipboard; the hash is what the app writes to the address
bar; both open the same thing.

WHY `<id>.html` AND NOT `<id>/index.html`. CloudFront applies its default root object to the root
only, and the origin is S3's REST endpoint (spec 0004), which has no website-style index
documents, so `/t/<id>/` would answer 403. A file with its extension is served as-is, and
scripts/deploy.sh pushes `site/t/` as HTML with no-cache like index.html.

THE REDIRECT IS RELATIVE (`../#trip=<id>`). From `/t/<id>.html` that is `/#trip=<id>` on the live
site, and it stays right when the tree is served under a prefix, which is how every local check
runs (`python3 tools/serve.py . 8386` puts the app at `/site/`). `og:url` and the canonical link
are absolute, because a crawler needs them to be; the host is `--host`, defaulting to the one
scripts/deploy.sh already knows, so a fork is not hardcoded to it.

`og:image` is `/og/<id>.png` when that file exists and `/og/default.png` when it does not. Since
spec 0033 (2026-09-23) the per-trip pictures are rendered by `scripts/shots.mjs --only=og` in the
readme-shots workflow and checked in; a trip added since the last run keeps the default until the
workflow is run again. Re-run this after adding a picture: `--check` then holds the page to it.

SEARCH (spec 0061 task 9). The `<title>` is the trip's title and the site's name when the two fit in
60 characters, and the title alone when they do not; the description is the blurb, cut at a
sentence when it is over 160 characters and followed by one plain line when it is under 70, because
a search result shows those lengths and no others well. scripts/check_seo.py holds every page to
them. The JSON-LD names the page as part of the site the home page declares.

Same rule as the other generators: the page is a mirror of the registry, in HTML, and CI refuses
a stale one. A stale page is a share that says the wrong thing about the trip it opens.

Run:  python3 scripts/gen_trip_pages.py                          # write site/t/*.html
      python3 scripts/gen_trip_pages.py --check                  # exit 1 if a page is stale, missing or extra
      python3 scripts/gen_trip_pages.py --host https://example.com
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "registry" / "tours.yaml"
OUT = ROOT / "site" / "t"
OG = ROOT / "site" / "og"
DEFAULT_HOST = "https://www.spaceradar.ai"
SITE_NAME = "Space Radar"

# A trip id is a path segment, a fragment value and a JavaScript string literal here, so it is
# held to the characters that are the same thing in all three. check_registry.py is looser about
# ids in general; this is the one place a wider id would leak somewhere it should not.
SAFE_ID = re.compile(r"^[a-z0-9][a-z0-9-]*$")

PAGE = """<!doctype html>
<!-- GENERATED from registry/tours.yaml by scripts/gen_trip_pages.py. Do not edit: change the
     registry and run the generator. This page exists so a shared link to the trip carries its
     title, its blurb and a picture; a browser is sent on to the app at once. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{page_title}</title>
<meta name="description" content="{description}">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0b0e14">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{site}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{image_alt}">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{url}">
<script type="application/ld+json">{ld}</script>
<meta http-equiv="refresh" content="0; url=../#trip={id}">
</head>
<body>
<script>location.replace('../#trip={id}');</script>
<p><a href="../#trip={id}">Open the trip: {title}</a></p>
</body>
</html>
"""


def read_trips() -> list[dict]:
    doc = yaml.safe_load(SOURCE.read_text(encoding="utf-8")) or {}
    return list(doc.get("tours") or [])


TITLE_MAX = 60
DESC_MIN = 70
DESC_MAX = 160
# Said after a blurb too short for a search result; true of every trip.
DESC_TAIL = "A guided trip on the live 3D map of space."
DEFAULT_ALT = "The Earth from space with the satellites around it as points of light, captioned Space Radar."


def image_for(trip_id: str, host: str) -> str:
    name = trip_id if (OG / f"{trip_id}.png").is_file() else "default"
    return f"{host}/og/{name}.png"


def image_alt_for(trip_id: str, title: str) -> str:
    # A trip's picture is a view from the trip with its title and blurb printed under it.
    if (OG / f"{trip_id}.png").is_file():
        return f"A view from the trip, captioned {title}."
    return DEFAULT_ALT


def page_title_for(title: str) -> str:
    full = f"{title} · {SITE_NAME}"
    if len(full) <= TITLE_MAX:
        return full
    return title if len(title) <= TITLE_MAX else title[:TITLE_MAX - 1].rstrip() + "…"


def description_for(blurb: str) -> str:
    text = blurb
    if len(text) < DESC_MIN:
        text = f"{text} {DESC_TAIL}"
    if len(text) > DESC_MAX:
        head = text[:DESC_MAX]
        end = head.rfind(". ")
        text = head[:end + 1] if end >= DESC_MIN else head[:head.rfind(" ")].rstrip(",;:") + "…"
    return text


def page_for(trip: dict, host: str) -> str:
    trip_id = str(trip.get("id") or "")
    if not SAFE_ID.match(trip_id):
        raise SystemExit(f"gen_trip_pages: trip id {trip_id!r} is not a safe path segment")
    title = str(trip.get("title") or "").strip()
    blurb = str(trip.get("blurb") or "").strip()
    if not title or not blurb:
        raise SystemExit(f"gen_trip_pages: trip {trip_id} has no title or no blurb")
    esc = lambda s: html.escape(s, quote=True)  # noqa: E731
    url = f"{host}/t/{trip_id}.html"
    ld = {"@context": "https://schema.org", "@type": "WebPage", "url": url, "name": title,
          "description": description_for(blurb), "isPartOf": {"@id": f"{host}/#website"}}
    return PAGE.format(
        id=trip_id,
        site=SITE_NAME,
        title=esc(title),
        page_title=esc(page_title_for(title)),
        blurb=esc(blurb),
        description=esc(description_for(blurb)),
        image=esc(image_for(trip_id, host)),
        image_alt=esc(image_alt_for(trip_id, title)),
        url=esc(url),
        ld=json.dumps(ld, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"),
    )


def expected(host: str) -> dict[str, str]:
    return {f"{t['id']}.html": page_for(t, host) for t in read_trips()}


def existing() -> dict[str, str]:
    if not OUT.is_dir():
        return {}
    return {p.name: p.read_text(encoding="utf-8") for p in sorted(OUT.glob("*.html"))}


def main(argv: list[str]) -> int:
    host = DEFAULT_HOST
    check = False
    args = list(argv)
    while args:
        a = args.pop(0)
        if a == "--check":
            check = True
        elif a == "--host":
            if not args:
                print("gen_trip_pages: --host needs a value", file=sys.stderr)
                return 2
            host = args.pop(0).rstrip("/")
        elif a.startswith("--host="):
            host = a[len("--host="):].rstrip("/")
        else:
            print(f"gen_trip_pages: unknown option {a}", file=sys.stderr)
            return 2

    want = expected(host)
    have = existing()
    rel = OUT.relative_to(ROOT)
    if check:
        stale = sorted(n for n in want if have.get(n) != want[n])
        extra = sorted(n for n in have if n not in want)
        if not stale and not extra:
            print(f"trip pages are current ({len(want)} pages under {rel}/, one per trip in {SOURCE.relative_to(ROOT)})")
            return 0
        for n in stale:
            print(f"{rel}/{n} is {'MISSING' if n not in have else 'STALE'}.")
        for n in extra:
            print(f"{rel}/{n} names a trip that is not in the registry.")
        print(f"\n  {SOURCE.relative_to(ROOT)} has changed and the pages a crawler reads have not.\n"
              f"  Run: python3 scripts/{Path(sys.argv[0]).name}")
        return 1

    OUT.mkdir(parents=True, exist_ok=True)
    written = 0
    for name, text in want.items():
        if have.get(name) != text:
            (OUT / name).write_text(text, encoding="utf-8")
            written += 1
    removed = 0
    for name in have:
        if name not in want:
            (OUT / name).unlink()
            removed += 1
    print(f"wrote {rel}/: {len(want)} pages, {written} changed, {removed} removed")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
