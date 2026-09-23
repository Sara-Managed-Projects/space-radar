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

Same rule as the other generators: the page is a mirror of the registry, in HTML, and CI refuses
a stale one. A stale page is a share that says the wrong thing about the trip it opens.

Run:  python3 scripts/gen_trip_pages.py                          # write site/t/*.html
      python3 scripts/gen_trip_pages.py --check                  # exit 1 if a page is stale, missing or extra
      python3 scripts/gen_trip_pages.py --host https://example.com
"""

from __future__ import annotations

import html
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
<title>{title} · {site}</title>
<meta name="description" content="{blurb}">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{site}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{blurb}">
<meta property="og:image" content="{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{url}">
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


def image_for(trip_id: str, host: str) -> str:
    name = trip_id if (OG / f"{trip_id}.png").is_file() else "default"
    return f"{host}/og/{name}.png"


def page_for(trip: dict, host: str) -> str:
    trip_id = str(trip.get("id") or "")
    if not SAFE_ID.match(trip_id):
        raise SystemExit(f"gen_trip_pages: trip id {trip_id!r} is not a safe path segment")
    title = str(trip.get("title") or "").strip()
    blurb = str(trip.get("blurb") or "").strip()
    if not title or not blurb:
        raise SystemExit(f"gen_trip_pages: trip {trip_id} has no title or no blurb")
    esc = lambda s: html.escape(s, quote=True)  # noqa: E731
    return PAGE.format(
        id=trip_id,
        site=SITE_NAME,
        title=esc(title),
        blurb=esc(blurb),
        image=esc(image_for(trip_id, host)),
        url=esc(f"{host}/t/{trip_id}.html"),
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
