#!/usr/bin/env python3
"""Fetch the Apollo 15 and 17 rover traverses and write registry/traverses/<site>.json.

Release 1.2.0 stage W2-a (internal spec 0076, internal #868). The traverse lines are the PDS
Geosciences Node's (Washington University in St. Louis), served with its Apollo Analyst's Notebook
station finder as ArcGIS map services:

  Apollo 15: "The traverse line is from Phil Stooke, University of Western Ontario. It was created by
             tracing tracks visible in the LROC data as well as using surface photos and descriptions."
  Apollo 17: "The traverse line is created by tracing tracks visible in the LROC data."

(the words of each station finder page, https://an.rsl.wustl.edu/apollo/map/apMap.aspx?m=15 and m=17,
read 2026-10-16). Their coordinates are metres on a plate carree of the 1737.4 km sphere (the
service's own spatial reference), so a longitude is x / R and a latitude y / R, in radians. The
Apollo 17 lunar module in the same service is 30.77226 E, 20.19116 N; LROC's surveyed position of
it is 30.7723 E, 20.1911 N (registry/sites.yaml, `lroc-2016`): the frames agree to metres.

The lines are simplified (Douglas-Peucker, SIMPLIFY_M) and written with five decimals of a degree
(30 cm). Each file says where it came from, when, and how long the line is before and after.

Run:  python3 scripts/build_traverses.py            # fetch and write
      python3 scripts/build_traverses.py --check    # exit 1 if a file is missing or malformed
"""
from __future__ import annotations

import json
import math
import sys
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "registry" / "traverses"
R_M = 1737400.0
SIMPLIFY_M = 2.0
UA = "SpaceRadar/1.2 (+https://github.com/Sara-Managed-Projects/space-radar)"
SERVICE = "https://anms.rsl.wustl.edu/arcgis/rest/services/Apollo/Apollo{m}_vec/MapServer/{layer}/query?where=1%3D1&outFields=*&returnGeometry=true&f=json"
TRAVERSES = {
    "apollo-15": {"mission": 15, "layer": 4, "finder": "https://an.rsl.wustl.edu/apollo/map/apMap.aspx?m=15",
                  "traced": "Phil Stooke, University of Western Ontario, from tracks visible in LROC images, surface photographs and descriptions"},
    "apollo-17": {"mission": 17, "layer": 7, "finder": "https://an.rsl.wustl.edu/apollo/map/apMap.aspx?m=17",
                  "traced": "from tracks visible in LROC images"},
}


def fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def length_m(path: list) -> float:
    return sum(math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]) for i in range(1, len(path)))


def simplify(path: list, tol: float) -> list:
    """Douglas-Peucker on the plate carree's metres (a few kilometres from the centre: flat enough)."""
    if len(path) < 3:
        return path
    keep = [False] * len(path)
    keep[0] = keep[-1] = True
    stack = [(0, len(path) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = path[a]
        bx, by = path[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1e-9
        best, at = -1.0, -1
        for i in range(a + 1, b):
            px, py = path[i]
            d = abs(dy * (px - ax) - dx * (py - ay)) / L
            if d > best:
                best, at = d, i
        if best > tol:
            keep[at] = True
            stack += [(a, at), (at, b)]
    return [p for p, k in zip(path, keep) if k]


def build(site: str, spec: dict) -> dict:
    doc = fetch(SERVICE.format(m=spec["mission"], layer=spec["layer"]))
    paths = []
    before = after = 0.0
    points = 0
    for f in doc.get("features", []):
        for p in (f.get("geometry") or {}).get("paths", []):
            pts = [(float(x), float(y)) for x, y in p]
            if len(pts) < 2 or length_m(pts) < 1.0:
                continue
            s = simplify(pts, SIMPLIFY_M)
            before += length_m(pts)
            after += length_m(s)
            points += len(s)
            paths.append([[round(math.degrees(x / R_M), 5), round(math.degrees(y / R_M), 5)] for x, y in s])
    return {
        "site": site,
        "source": SERVICE.format(m=spec["mission"], layer=spec["layer"]).split("/query")[0],
        "finder": spec["finder"],
        "traced": spec["traced"],
        "read": date.today().isoformat(),
        "frame": "east longitude and latitude in degrees on the 1737.4 km sphere (the service's plate carree, x / R and y / R)",
        "simplified_m": SIMPLIFY_M,
        "length_km": round(before / 1000, 2),
        "length_km_simplified": round(after / 1000, 2),
        "points": points,
        "paths": paths,
    }


def check() -> int:
    bad = []
    for site in TRAVERSES:
        f = OUT / f"{site}.json"
        if not f.exists():
            bad.append(f"{f.relative_to(ROOT)} is missing: run scripts/build_traverses.py")
            continue
        d = json.loads(f.read_text(encoding="utf-8"))
        if not d.get("paths") or not all(len(p) >= 2 for p in d["paths"]):
            bad.append(f"{f.relative_to(ROOT)} has no lines")
    for b in bad:
        print("FAIL", b)
    return 1 if bad else 0


def main(argv: list) -> int:
    if "--check" in argv:
        return check()
    OUT.mkdir(parents=True, exist_ok=True)
    for site, spec in TRAVERSES.items():
        d = build(site, spec)
        (OUT / f"{site}.json").write_text(json.dumps(d, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"{site}: {len(d['paths'])} lines, {d['points']} points, {d['length_km']} km ({d['length_km_simplified']} km simplified)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
