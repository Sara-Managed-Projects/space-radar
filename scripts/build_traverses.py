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

SPIRIT AND OPPORTUNITY (release 1.3.0 stage W3-d, internal spec 0077, internal #868). The same node
serves the two Mars Exploration Rovers' Analyst's Notebooks the same way, one polyline a rover (layer 3,
`merATraverse` and `merbTraverse`, of MER/merApubmap and MER/merBpubmap). Asked for in GCS_Mars_2000_Sphere
(outSR=104971, the 3396.19 km sphere), the service answers in degrees with no datum shift: the numbers are
the ones its own plate carree and transverse Mercator were built from. Opportunity's line begins at
5.525785 W, 1.9487931 S, the origin of the service's own projection, 160 m from the landing point the same
node's mission page gives (registry/sites.yaml `pds-mer`); Spirit's 260 m from its. The node does not say
on the service how the lines were made, and nothing here says more than that.

Run:  python3 scripts/build_traverses.py            # fetch and write every one
      python3 scripts/build_traverses.py spirit     # fetch and write the ones named
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
# 0077 W3-d: begin
R_MARS_M = 3396190.0
MER_SERVICE = "https://anms.rsl.wustl.edu/arcgis/rest/services/MER/mer{m}pubmap/MapServer/3/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=104971&f=json"
# 0077 W3-d: end
TRAVERSES = {
    "apollo-15": {"mission": 15, "layer": 4, "finder": "https://an.rsl.wustl.edu/apollo/map/apMap.aspx?m=15",
                  "traced": "Phil Stooke, University of Western Ontario, from tracks visible in LROC images, surface photographs and descriptions"},
    "apollo-17": {"mission": 17, "layer": 7, "finder": "https://an.rsl.wustl.edu/apollo/map/apMap.aspx?m=17",
                  "traced": "from tracks visible in LROC images"},
    # 0077 W3-d: begin -- the two Mars Exploration Rovers (see the head of this file)
    "spirit": {"service": MER_SERVICE.format(m="A"), "degrees": True, "r_m": R_MARS_M, "simplify_m": 2.0,
               "body": "the 3396.19 km sphere (GCS_Mars_2000_Sphere, the service's own numbers, no datum shift)",
               "finder": "https://an.rsl.wustl.edu/mera/merxbrowser/an3.aspx",
               "traced": "the Spirit Analyst's Notebook's traverse map (PDS Geosciences Node); how the line was made is not stated with it"},
    "opportunity": {"service": MER_SERVICE.format(m="B"), "degrees": True, "r_m": R_MARS_M, "simplify_m": 2.0,
                    "body": "the 3396.19 km sphere (GCS_Mars_2000_Sphere, the service's own numbers, no datum shift)",
                    "finder": "https://an.rsl.wustl.edu/merb/merxbrowser/an3.aspx",
                    "traced": "the Opportunity Analyst's Notebook's traverse map (PDS Geosciences Node); how the line was made is not stated with it"},
    # 0077 W3-d: end
}


def fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def length_m(path: list, r_m: float = R_M) -> float:
    """Along great circles on the sphere of `r_m` (the Moon's 1737.4 km unless given); `path` in plate carree metres."""
    out = 0.0
    for i in range(1, len(path)):
        lo1, la1 = path[i - 1][0] / r_m, path[i - 1][1] / r_m
        lo2, la2 = path[i][0] / r_m, path[i][1] / r_m
        c = math.sin(la1) * math.sin(la2) + math.cos(la1) * math.cos(la2) * math.cos(lo2 - lo1)
        out += math.acos(max(-1.0, min(1.0, c))) * r_m
    return out


def simplify(path: list, tol: float, r_m: float = R_M) -> list:
    """Douglas-Peucker in local metres: the plate carree's x shrunk by the cosine of the latitude (a few
    kilometres from the lander the ground is flat enough for this)."""
    if len(path) < 3:
        return path
    k = math.cos(path[0][1] / r_m)
    pts = [(x * k, y) for x, y in path]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy) or 1e-9
        best, at = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * (px - ax) - dx * (py - ay)) / L
            if d > best:
                best, at = d, i
        if best > tol:
            keep[at] = True
            stack += [(a, at), (at, b)]
    return [p for p, k in zip(path, keep) if k]


def build(site: str, spec: dict) -> dict:
    r_m = spec.get("r_m", R_M)
    tol = spec.get("simplify_m", SIMPLIFY_M)
    url = spec.get("service") or SERVICE.format(m=spec["mission"], layer=spec["layer"])
    doc = fetch(url)
    paths = []
    before = after = 0.0
    points = 0
    for f in doc.get("features", []):
        for p in (f.get("geometry") or {}).get("paths", []):
            pts = [(float(x), float(y)) for x, y in p]
            if spec.get("degrees"):  # 0077 W3-d: degrees in, the same plate carree metres as the Moon's lines
                pts = [(math.radians(x) * r_m, math.radians(y) * r_m) for x, y in pts]
            if len(pts) < 2 or length_m(pts, r_m) < 1.0:
                continue
            s = simplify(pts, tol, r_m)
            before += length_m(pts, r_m)
            after += length_m(s, r_m)
            points += len(s)
            # East longitude 0-360, as registry/sites.yaml writes it (Opportunity's line starts at 354.474).
            paths.append([[round(math.degrees(x / r_m) % 360.0, 5), round(math.degrees(y / r_m), 5)] for x, y in s])
    return {
        "site": site,
        "source": url.split("/query")[0],
        "finder": spec["finder"],
        "traced": spec["traced"],
        "read": date.today().isoformat(),
        "frame": "east longitude and latitude in degrees on " + spec["body"] if spec.get("body") else "east longitude and latitude in degrees on the 1737.4 km sphere (the service's plate carree, x / R and y / R)",
        "simplified_m": tol,
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
    only = [a for a in argv if not a.startswith("-")]  # 0077 W3-d: the ones named, or every one
    for site, spec in TRAVERSES.items():
        if only and site not in only:
            continue
        d = build(site, spec)
        (OUT / f"{site}.json").write_text(json.dumps(d, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"{site}: {len(d['paths'])} lines, {d['points']} points, {d['length_km']} km ({d['length_km_simplified']} km simplified)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
