#!/usr/bin/env python3
"""Build site/data/places.png and places.json: which country or sea is under a point (spec 0048).

    python3 scripts/build-places.py [--src DIR] [--width 2048]

WHAT. An equirectangular raster, one 16-bit index per pixel (0 = nothing drawn there), and a JSON
table from index to name. sky/overplace.js reads both on the first card for an Earth orbiter, never
at boot, and answers "Now over Kazakhstan", "over the South Pacific Ocean", "near the border of
France and Spain", or "over land" -- nothing is looked up anywhere at run time.

SOURCE. Natural Earth 1:50m, `ne_50m_admin_0_countries` and `ne_50m_geography_marine_polys`, as
GeoJSON from the nvkelso/natural-earth-vector repository. Natural Earth's terms: "All versions of
Natural Earth raster + vector map data found on this website are in the public domain."
(naturalearthdata.com/about/terms-of-use, read 2026-09-29). The two files are fetched once into
--src (a cache outside the repository) and their SHA-256 checked against the values below, so a
rebuild from the same files gives the same PNG byte for byte.

RULES.
  * Oceans first (scalerank 0), then smaller seas, gulfs and straits over them, then the countries
    over everything, largest first so an enclave (Lesotho, San Marino) lands on top of its host.
  * A country whose Natural Earth TYPE is "Disputed" or "Indeterminate" is drawn as plain land,
    index 1, "over land": the strip describes the ground and never names a flag. Antarctica is the
    one Indeterminate row kept by name, because it is a continent, not a claim.
  * A name with an abbreviation in it ("Central African Rep.") takes NAME_LONG instead. `the` marks
    the names English puts an article in front of ("over the Netherlands").
  * Rivers and reefs among the marine polygons are left out: from orbit they are not "over".
Only what survives rasterisation gets an index. That is ~350 names (242 countries and territories
and ~110 seas), more than a byte holds, so the PNG is 16-bit greyscale; the high byte is 0 or 1
nearly everywhere and deflate takes it almost for free.

Requires Pillow (in a venv; nothing else).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
FILES = {
    "ne_50m_admin_0_countries.geojson": "3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb",
    "ne_50m_geography_marine_polys.geojson": "6fe58083e0cc5c7fad9e396970e28a8580bbd8770cfa4d1d7b5a34423e912f97",
}
LAND_ONLY = {"Disputed", "Indeterminate"}
KEEP_NAMED = {"Antarctica"}
SKIP_MARINE = {"river", "reef"}
THE_ENDINGS = ("Islands", "Republic", "Kingdom", "Emirates", "States of America", "Territories", "Lands", "Grenadines")
THE_NAMES = {"Netherlands", "Philippines", "Bahamas", "Maldives", "Comoros", "Seychelles", "Gambia", "Vatican"}


def fetch(src: Path) -> dict:
    src.mkdir(parents=True, exist_ok=True)
    out = {}
    for name, sha in FILES.items():
        path = src / name
        if not path.exists():
            print(f"fetching {BASE + name}", file=sys.stderr)
            with urllib.request.urlopen(BASE + name, timeout=120) as r:
                path.write_bytes(r.read())
        got = hashlib.sha256(path.read_bytes()).hexdigest()
        if got != sha:
            sys.exit(f"{name}: sha256 {got}, expected {sha}; a new Natural Earth release? update FILES")
        out[name] = json.loads(path.read_text(encoding="utf-8"))
    return out


def rings(geom):
    """Exterior rings of a Polygon or MultiPolygon (holes are other features, drawn after)."""
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    if geom["type"] == "MultiPolygon":
        return [p[0] for p in geom["coordinates"]]
    return []


def ring_area(ring):
    a = 0.0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]):
        a += x0 * y1 - x1 * y0
    return abs(a) / 2


def plain_name(props):
    name = props.get("NAME") or ""
    if "." in name and props.get("NAME_LONG"):
        name = props["NAME_LONG"]
    # NAME_LONG keeps one abbreviation of its own: "Heard I. and McDonald Islands".
    name = name.replace(" I. ", " Island ")
    return name.strip()


def marine_name(name):
    name = (name or "").strip()
    return name.title() if name.isupper() else name


def wants_the(name, kind):
    if kind in ("ocean", "sea"):
        return True
    return name in THE_NAMES or name.endswith(THE_ENDINGS)


def build(data, width):
    from PIL import Image, ImageDraw

    height = width // 2
    sx = width / 360.0
    sy = height / 180.0

    def px(ring):
        return [((lon + 180.0) * sx, (90.0 - lat) * sy) for lon, lat in ring]

    entries = [None, {"kind": "land", "name": None}]  # 0 nothing, 1 plain land
    temp = []  # (kind, name, rings) in draw order; indices assigned after rasterising

    marine = data["ne_50m_geography_marine_polys.geojson"]["features"]
    marine = [f for f in marine if (f["properties"].get("featurecla") or "") not in SKIP_MARINE]
    marine.sort(key=lambda f: (f["properties"].get("scalerank") or 0, -sum(ring_area(r) for r in rings(f["geometry"]))))
    for f in marine:
        p = f["properties"]
        kind = "ocean" if p.get("featurecla") == "ocean" else "sea"
        temp.append((kind, marine_name(p.get("name")), rings(f["geometry"])))

    countries = data["ne_50m_admin_0_countries.geojson"]["features"]
    countries.sort(key=lambda f: -sum(ring_area(r) for r in rings(f["geometry"])))
    for f in countries:
        p = f["properties"]
        name = plain_name(p)
        if p.get("TYPE") in LAND_ONLY and name not in KEEP_NAMED:
            temp.append(("land", None, rings(f["geometry"])))
        else:
            temp.append(("country", name, rings(f["geometry"])))

    # Rasterise with provisional ids (up to 65535), then keep only the ids that survived.
    big = Image.new("I", (width, height), 0)
    bdraw = ImageDraw.Draw(big)
    for i, (kind, name, rs) in enumerate(temp):
        pid = 1 if kind == "land" else i + 2
        for r in rs:
            if len(r) >= 3:
                bdraw.polygon(px(r), fill=pid)
    seen = sorted(set(big.getdata()))
    remap = {0: 0, 1: 1}
    for pid in seen:
        if pid in (0, 1):
            continue
        kind, name, _ = temp[pid - 2]
        entries.append({"kind": kind, "name": name, "the": wants_the(name, kind)})
        remap[pid] = len(entries) - 1
    if len(entries) > 65536:
        sys.exit(f"{len(entries)} classes do not fit 16 bits")
    img = Image.new("I;16", (width, height), 0)
    img.putdata([remap[v] for v in big.getdata()])
    return img, entries


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(ROOT.parent / "places-src"), help="cache for the Natural Earth files")
    ap.add_argument("--width", type=int, default=2048)
    args = ap.parse_args()
    data = fetch(Path(args.src))
    img, entries = build(data, args.width)
    out_png = ROOT / "site" / "data" / "places.png"
    out_json = ROOT / "site" / "data" / "places.json"
    img.save(out_png, optimize=True)
    table = {
        "schema": 1,
        "source": "Natural Earth 1:50m admin-0 countries and marine areas (public domain)",
        "width": img.width,
        "height": img.height,
        "projection": "equirectangular; x = (lon + 180) / 360 * width, y = (90 - lat) / 180 * height",
        "entries": entries,
    }
    out_json.write_text(json.dumps(table, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"places.png {out_png.stat().st_size} bytes, {img.width}x{img.height}, {len(entries)} classes; places.json {out_json.stat().st_size} bytes")


if __name__ == "__main__":
    main()
