#!/usr/bin/env python3
"""Mirror registry/plumes.yaml into site/js/data/plumes.js, and refuse if it has drifted.

Release 1.2.0 stage W2-c (internal spec 0076; internal #861, #862): plumes where they were seen on Io,
Enceladus and Triton. The registry says what was seen, when, by what and how high; this mirror is what
site/js/scene/plumes.js reads, with every longitude turned EAST (scene/worlds.js faceVector) and
Enceladus's tiger stripes turned from the gazetteer's centres and lengths into two ends each.

Run:  python3 scripts/gen_plumes_js.py           # write it
      python3 scripts/gen_plumes_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402

KINDS = ("umbrella", "fountain", "jets", "column")


def east(row: dict, w: str = "lon_w", e: str = "lon_e") -> float:
    """East longitude in (-180, 180], from a row's published west or east longitude."""
    if w in row:
        lon = -float(row[w])
    else:
        lon = float(row[e])
    lon = math.fmod(lon, 360.0)
    if lon <= -180:
        lon += 360
    if lon > 180:
        lon -= 360
    return round(lon, 4)


def polar_xy(lat: float, lon_e: float, radius_km: float) -> tuple[float, float]:
    """A south-polar place on the azimuthal equidistant plane round the pole, km (x toward lon 0 E)."""
    rho = radius_km * math.radians(90 + lat)
    a = math.radians(lon_e)
    return rho * math.cos(a), rho * math.sin(a)


def polar_ll(x: float, y: float, radius_km: float) -> tuple[float, float]:
    rho = math.hypot(x, y)
    return round(-90 + math.degrees(rho / radius_km), 4), round(math.degrees(math.atan2(y, x)), 4)


def stripes_of(p: dict, radius_km: float) -> list:
    """Each stripe as two ends: a straight segment through its centre, its length long, parallel to the axis."""
    ax = p["axis"]
    xa, ya = polar_xy(float(ax["lat_a"]), -float(ax["lon_w_a"]), radius_km)
    xb, yb = polar_xy(float(ax["lat_b"]), -float(ax["lon_w_b"]), radius_km)
    n = math.hypot(xb - xa, yb - ya)
    ux, uy = (xb - xa) / n, (yb - ya) / n
    out = []
    for s in p["stripes"]:
        cx, cy = polar_xy(float(s["lat"]), -float(s["lon_w"]), radius_km)
        h = float(s["length_km"]) / 2
        a = polar_ll(cx - ux * h, cy - uy * h, radius_km)
        b = polar_ll(cx + ux * h, cy + uy * h, radius_km)
        out.append({"name": s["name"], "a": list(a), "b": list(b), "jets": int(s["jets"])})
    return out


def seen(row: dict) -> dict:
    s = row.get("seen") or {}
    return {"by": str(s.get("by", "")), "when": str(s.get("when", ""))}


def render(doc: dict) -> list:
    worlds = {}
    for wid, w in (doc.get("worlds") or {}).items():
        r = float(w["radius_km"])
        worlds[wid] = {"radiusKm": r, "gKmS2": float(w["gm_km3_s2"]) / (r * r)}
    plumes = []
    for p in doc.get("plumes") or []:
        r = worlds[p["world"]]["radiusKm"]
        row = {
            "id": p["id"], "world": p["world"], "name": p["name"], "kind": p["kind"],
            # The source pages stay in the registry: a mirror the browser loads holds no address it could fetch.
            "heightKm": float(p["height_km"]), "seen": seen(p),
            "particles": int(p["particles"]),
        }
        if p["kind"] == "jets":
            row["stripes"] = stripes_of(p, r)
            row["scaleKm"] = float(p["scale_km"])
            row["zenithDeg"] = [float(x) for x in p["zenith_deg"]]
        else:
            row["lat"] = float(p["lat"])
            row["lon"] = east(p)
        if p["kind"] in ("umbrella", "fountain"):
            row["zenithDeg"] = [float(x) for x in p["zenith_deg"]]
            row["rays"] = int(p.get("rays") or 0)
        if p["kind"] == "column":
            row["tailKm"] = float(p["tail_km"])
            row["windMS"] = float(p["wind_m_s"])
            row["tailDir"] = str(p["tail_dir"])
        plumes.append(row)
    hot = [{"id": h["id"], "world": h["world"], "name": h["name"], "lat": float(h["lat"]), "lon": east(h),
            "rank": float(h["rank"]), "seen": seen(h)} for h in doc.get("hotspots") or []]
    look = {k: v for k, v in (doc.get("look") or {}).items()}
    review = doc.get("review") or {}
    return [
        ("Who has looked at these: the maintainers, not yet an astronomer (spec 0075 section 14.4).", "PLUME_REVIEW",
         {"by": str(review.get("by", "")), "note": str(review.get("note", ""))}),
        ("Under Film the particles fly their arcs this many times faster than the clock (said on the card).", "FILM_SPEED",
         float(doc.get("film_speed", 1))),
        ("Each moon with plumes: its radius (scene/worlds.js) and its surface gravity GM / R^2 in km/s^2.", "PLUME_WORLDS", worlds),
        ("Every plume as seen: place (east longitude), height, who saw it and when; the stripes' two ends for Enceladus.", "PLUMES", plumes),
        ("Io's hot spots: drawn on the night side only, their brightness ranked, illustrative.", "HOTSPOTS", hot),
        ("How each kind of plume scatters and takes light (illustrative; registry/plumes.yaml says why).", "PLUME_LOOK", look),
    ]


HEADER = """// GENERATED from registry/plumes.yaml by scripts/gen_plumes_js.py. Do not edit.
//
// `python3 scripts/gen_plumes_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML. Fetched with scene/plumes.js, when a
// moon with plumes has its own stage (internal spec 0076 W2-c); never at boot.
"""

MIRROR = Mirror(source="registry/plumes.yaml", target="site/js/data/plumes.js", header=HEADER, render=render, what="plumes.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
