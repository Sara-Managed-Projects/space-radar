#!/usr/bin/env python3
"""Write the Moment "2009: Iridium 33 and Kosmos 2251" (forge internal #561): site/data/moments/iridium-cosmos-2009.json and its paths.

    python3 scripts/build_moment_iridium_cosmos.py --satcat DIR/satcat.csv   # the two pieces files from CelesTrak's catalogue, and the moment
    python3 scripts/build_moment_iridium_cosmos.py                          # the moment and the two orbits (the pieces files as they are)
    python3 scripts/build_moment_iridium_cosmos.py --check                  # exit 1 if a file is not what this would write

The first accidental collision of two whole satellites, told on one clock from a quarter of an hour before it to the catalogue of
today, as the Fengyun-1C Moment is told (scripts/build_moment_fengyun1c.py, docs/MOMENTS.md "a story that is told"). Captions only:
no voice is rendered for it yet, so the pace is the play time each chapter needs to be read.

WHAT IS MEASURED. The time (16:55:59.8 UTC, CelesTrak's analysis of the collision: https://celestrak.org/events/collision/), the
height (789 km, NASA's Orbital Debris Quarterly News 13(2), April 2009, the source data/clouds.js already gives the event), the two
tilts (86.4 and 74.0 degrees: CelesTrak SATCAT, 86.38 and 74.04 today), the dry masses (556 and 900 kg, CelesTrak's Table 1), the
predicted miss of that day's screening (584 m, CelesTrak), the counts of 2012 (CelesTrak) and of today (SATCAT read 2026-11-23),
the closing speed of about 11.7 km/s (Wikipedia's article, citing the press of the day) and the place, above the Taymyr Peninsula
(Jonathan's Space Report 606). Iridium 33 was moving north and Kosmos 2251 south (CelesTrak's Figure 7: "Iridium 33 is moving from the
bottom to the top", "Cosmos 2251 is moving from the upper left to the lower right").

WHAT IS MODELLED. The point drawn, 72.5 N 97.9 E, is ours: inside the Taymyr Peninsula, which is all an opened source gives. Both
satellites fly circles at the height of the hit through that point at the event, Iridium 33 northbound on a plane tilted 86.4 degrees and
Kosmos 2251 southbound at 74.0 (their real orbits were within about 15 km of the circle); the two velocities then meet at 101.5 degrees
and 11.55 km/s, which is the published "nearly right angles" and "about 11.7 km/s" to the precision a circle can give. The clouds are
data/clouds.js spreadAt (two-body motion and J2's drift, each piece at its perigee of today, survivors only), born at the same point:
the effect carries the plane of each satellite at the event (`nodeDeg`, `argLatDeg`, moments/debriscloud.js cloudFor), where the
Fengyun-1C Moment and the Find view use the illustrative node 0.

The pieces file: {note, cloud, read, source, pieces: [apogee km, perigee km, inclination x 10, ...]} (moments/debriscloud.js).
"""
from __future__ import annotations

import csv
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ID = "iridium-cosmos-2009"
MOMENT = ROOT / "site" / "data" / "moments" / f"{ID}.json"
PATHS = ROOT / "site" / "data" / "moments" / "paths"
ORBITS = {"iridium": PATHS / f"{ID}-iridium.json", "kosmos": PATHS / f"{ID}-kosmos.json"}
PIECES = {"iridium33": PATHS / f"{ID}-iridium-pieces.json", "cosmos2251": PATHS / f"{ID}-kosmos-pieces.json"}

EPOCH = "2009-02-10T16:56:00Z"         # CelesTrak: 16:55:59.806 UTC; data/clouds.js gives the minute, 16:56
TODAY = "2026-11-23T00:00:00Z"         # the catalogue the pieces and today's counts were read from (our copy, fetched 2026-11-23)
HIT_LAT, HIT_LON = 72.5, 97.9          # ours: a point inside the Taymyr Peninsula (Jonathan's Space Report 606 names the peninsula)
HIT_KM = 789.0                         # NASA ODQN 13(2), April 2009; data/clouds.js heightKm
INC = {"iridium": 86.4, "kosmos": 74.0}   # CelesTrak SATCAT: 86.38 and 74.04
NORTHBOUND = {"iridium": True, "kosmos": False}   # CelesTrak, Figure 7
R_EARTH_KM = 6378.137                  # data/clouds.js R_EARTH_KM (WGS-84)
GM_KM3_S2 = 398600.4418                # propagate/kepler.js GM_EARTH
START = -900.0                         # a quarter of an hour before
NAMES = {"iridium33": ("1997-051", "IRIDIUM 33 DEB"), "cosmos2251": ("1993-036", "COSMOS 2251 DEB")}
CHAPTERS = ["chBefore", "chClose", "chHit", "chRing", "chDays", "chFan", "chShell", "chToday"]


def iso_s(text: str) -> float:
    return datetime.fromisoformat(text.replace("Z", "+00:00")).replace(tzinfo=timezone.utc).timestamp()


def span_end() -> float:
    return round(iso_s(TODAY) - iso_s(EPOCH))


# --- the geometry ---------------------------------------------------------------------------------------------------

def gmst(unix_s: float) -> float:
    """satellite.js gstime (Vallado, IAU-82), which propagate/frames.js gmst and so the Moments' turning Earth use."""
    t = (unix_s / 86400.0 + 2440587.5 - 2451545.0) / 36525.0
    s = -6.2e-6 * t ** 3 + 0.093104 * t * t + (876600 * 3600 + 8640184.812866) * t + 67310.54841
    return (s * math.pi / 180 / 240) % (2 * math.pi)


def hit_point() -> list[float]:
    """The point of the collision, Earth-inertial (TEME) km: the place over a round Earth at the height of the hit."""
    lat, ra = math.radians(HIT_LAT), gmst(iso_s(EPOCH)) + math.radians(HIT_LON)
    r = R_EARTH_KM + HIT_KM
    return [r * math.cos(lat) * math.cos(ra), r * math.cos(lat) * math.sin(ra), r * math.sin(lat)]


def plane(which: str) -> tuple[float, float]:
    """(node, argument of latitude at the event), radians, of a circle tilted INC[which] through the hit point, north- or southbound."""
    p = hit_point()
    i = math.radians(INC[which])
    dec = math.asin(p[2] / math.hypot(*p))
    ra = math.atan2(p[1], p[0])
    u = math.asin(math.sin(dec) / math.sin(i))
    if not NORTHBOUND[which]:
        u = math.pi - u
    node = (ra - math.atan2(math.cos(i) * math.sin(u), math.cos(u))) % (2 * math.pi)
    return node, u


def state(which: str, t: float) -> list[float]:
    """[x, y, z, vx, vy, vz] (km, km/s, Earth-inertial) on the circle at mission second t."""
    node, u0 = plane(which)
    i = math.radians(INC[which])
    r = R_EARTH_KM + HIT_KM
    v = math.sqrt(GM_KM3_S2 / r)
    u = u0 + v / r * t
    cu, su, cn, sn, ci, si = math.cos(u), math.sin(u), math.cos(node), math.sin(node), math.cos(i), math.sin(i)
    pos = [r * (cn * cu - sn * su * ci), r * (sn * cu + cn * su * ci), r * su * si]
    vel = [v * (-cn * su - sn * cu * ci), v * (-sn * su + cn * cu * ci), v * cu * si]
    return pos + vel


# The rows run to 900 s after the event: the close shot hands over to the wide one over 3 play seconds at x180 (540 mission seconds),
# and a camera that still blends from a vehicle needs that vehicle's state (a path that ends earlier leaves the frame black).
def orbit_rows(which: str, t0: float = START - 60, t1: float = 900.0, step: float = 10.0) -> list[list[float]]:
    rows, t = [], t0
    while t <= t1 + 1e-9:
        s = state(which, t)
        rows.append([round(t, 1)] + [round(x, 4) for x in s[:3]] + [round(x, 6) for x in s[3:]])
        t += step
    return rows


def closing() -> tuple[float, float]:
    """The closing speed (km/s) and the angle between the two velocities (degrees) at the event."""
    a, b = state("iridium", 0)[3:], state("kosmos", 0)[3:]
    dv = math.dist(a, b)
    ang = math.degrees(math.acos(sum(x * y for x, y in zip(a, b)) / math.hypot(*a) / math.hypot(*b)))
    return dv, ang


def sun_dir(unix_s: float) -> list[float]:
    """The Sun's direction, Earth-inertial (the Astronomical Almanac's low-precision formula, about 0.01 degree)."""
    n = unix_s / 86400.0 + 2440587.5 - 2451545.0
    L = math.radians((280.460 + 0.9856474 * n) % 360)
    g = math.radians((357.528 + 0.9856003 * n) % 360)
    lam = L + math.radians(1.915) * math.sin(g) + math.radians(0.020) * math.sin(2 * g)
    eps = math.radians(23.439 - 0.0000004 * n)
    return [math.cos(lam), math.cos(eps) * math.sin(lam), math.sin(eps) * math.sin(lam)]


def in_shadow() -> bool:
    """Was the hit point in the Earth's shadow (a cylinder)? It decides whether the satellite needs the lamp to be seen."""
    p, s = hit_point(), sun_dir(iso_s(EPOCH))
    along = sum(x * y for x, y in zip(p, s))
    perp = math.sqrt(max(0.0, sum(x * x for x in p) - along * along))
    return along < 0 and perp < R_EARTH_KM


# --- the pieces ---------------------------------------------------------------------------------------------------

def pieces_from_satcat(path: Path, cloud: str) -> tuple[list[int], dict]:
    parent, name = NAMES[cloud]
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    frags = [r for r in rows if r["OBJECT_ID"][:8] == parent and r["OBJECT_TYPE"] == "DEB" and r["OBJECT_NAME"].upper().startswith(name)]
    up = [r for r in frags if not r["DECAY_DATE"]]
    flat = []
    for r in sorted(up, key=lambda r: int(r["NORAD_CAT_ID"])):
        try:
            flat += [int(round(float(r["APOGEE"]))), int(round(float(r["PERIGEE"]))), int(round(float(r["INCLINATION"]) * 10))]
        except ValueError:
            continue
    return flat, {"catalogued": len(frags), "up": len(up)}


# --- the pace -----------------------------------------------------------------------------------------------------

# Each chapter: its first mission second and how many play seconds it is given (enough to read its captions).
PLAN = [(START, 22.0), (-120.0, 22.0), (-4.0, 16.0), (1500.0, 14.0), (86400.0, 16.0), (5184000.0, 18.0), (31536000.0, 20.0),
        (473385600.0, 22.0)]   # 473 385 600 s after the event: 1 January 2024, "today" (the catalogue's present)


def two_figures_down(x: float) -> float:
    digits = 1 - int(math.floor(math.log10(x)))
    return int(x // 10 ** -digits) * 10 ** -digits if digits <= 0 else math.floor(x * 10 ** digits) / 10 ** digits


def pace() -> list[dict]:
    """Contiguous segments, one a chapter, each played for at least its PLAN seconds; the hit itself at x1 (from -4 s to +4 s)."""
    end = span_end()
    out = []
    for k, (frm, play) in enumerate(PLAN):
        to = PLAN[k + 1][0] if k + 1 < len(PLAN) else end
        if frm == -4.0:
            out.append({"from": -4.0, "to": 4.0, "rate": 1})
            out.append({"from": 4.0, "to": to, "rate": two_figures_down((to - 4.0) / (play - 8.0))})
            continue
        out.append({"from": frm, "to": to, "rate": two_figures_down((to - frm) / play)})
    return out


def build() -> dict:
    end = span_end()
    nI, uI = plane("iridium")
    nK, uK = plane("kosmos")
    dv, ang = closing()
    dark = in_shadow()
    t = [c[0] for c in PLAN]
    return {
        "format": 1,
        "id": ID,
        "words": ID,
        "wordsFile": "en.moments.iridium.js",
        "epoch": EPOCH,
        "span": [START, end],
        "pace": pace(),
        "place": {"name": "Above the Taymyr Peninsula, Siberia", "lat": HIT_LAT, "lon": HIT_LON, "alt": 0, "azimuth": 0},
        "trajectories": {
            "iridium": {"kind": "vectors", "truth": "reconstructed", "say": "pathIridium", "frame": "earth-teme", "file": f"paths/{ID}-iridium.json",
                        "source": f"a circle {HIT_KM:.0f} km up (NASA ODQN 13(2)) tilted {INC['iridium']} degrees (CelesTrak SATCAT), northbound "
                                  f"(CelesTrak, Figure 7), through our point {HIT_LAT} N {HIT_LON} E above the Taymyr Peninsula at the event"},
            "kosmos": {"kind": "vectors", "truth": "reconstructed", "say": "pathKosmos", "frame": "earth-teme", "file": f"paths/{ID}-kosmos.json",
                       "source": f"a circle {HIT_KM:.0f} km up tilted {INC['kosmos']} degrees, southbound, through the same point at the event; "
                                 f"the two meet at {ang:.1f} degrees and {dv:.2f} km/s"},
        },
        "vehicles": [
            {"id": "iridium-33", "model": None, "shape": ["satellite", "iridium"], "lengthM": 3.1, "path": "iridium", "attitude": "prograde",
             "window": [START, 0]},
            {"id": "kosmos-2251", "model": None, "marker": True, "lengthM": 6, "path": "kosmos", "attitude": "prograde", "window": [START, 0]},
        ],
        "tracks": {
            "camera": [
                {"t": START, "shot": "globe", "altKm": 2600, "backKm": 3800, "fov": 46, "vehicle": "iridium-33"},
                {"t": t[1], "shot": "orbit", "vehicle": "iridium-33", "dist": 34, "az": 40, "el": 18, "spin": 0.6, "blend": 4},
                {"t": t[2] + 4.5, "shot": "wide", "look": "earth", "distKm": 12000, "dir": [-0.3, 0.45, 0.84], "fov": 40, "blend": 3},
                {"t": t[3], "shot": "wide", "look": "earth", "distKm": 30000, "dir": [-0.3, 0.45, 0.84], "fov": 40, "blend": 4},
                {"t": t[4], "shot": "wide", "look": "earth", "distKm": 32000, "dir": [0.35, 0.4, 0.85], "fov": 40, "blend": 6},
                {"t": t[6], "shot": "wide", "look": "earth", "distKm": 34000, "dir": [0.8, -0.55, 0.25], "fov": 40, "blend": 6},
                {"t": t[7], "shot": "wide", "look": "earth", "distKm": 32000, "dir": [0.35, -0.85, 0.4], "fov": 40, "blend": 6},
            ],
            "captions": [
                {"t": START, "say": "c1a"}, {"t": -560.0, "say": "c1b"},
                {"t": t[1], "say": "c2a"}, {"t": -48.0, "say": "c2b"},
                {"t": 0, "say": "c3a"},
                {"t": t[3], "say": "c4a"},
                {"t": t[4], "say": "c5a"},
                {"t": t[5], "say": "c6a"},
                {"t": t[6], "say": "c7a"},
                {"t": t[7], "say": "c8a"}, {"t": 520000000.0, "say": "c8b"},
            ],
            "effects": [
                {"t": 0, "until": end, "effect": "debris-cloud", "cloud": "iridium33", "file": f"paths/{ID}-iridium-pieces.json", "say": "cloudNote",
                 "colour": "#7fb6ff", "sizePx": 2.5, "nodeDeg": round(math.degrees(nI), 4), "argLatDeg": round(math.degrees(uI), 4)},
                {"t": 0, "until": end, "effect": "debris-cloud", "cloud": "cosmos2251", "file": f"paths/{ID}-kosmos-pieces.json",
                 "colour": "#ff8a5c", "sizePx": 2.5, "nodeDeg": round(math.degrees(nK), 4), "argLatDeg": round(math.degrees(uK), 4)},
            ],
        },
        "chapters": [{"t": c[0], "say": CHAPTERS[k]} for k, c in enumerate(PLAN)],
        "drawn": "drawnNoteLamp" if dark else "drawnNote",
        "floodlit": dark,
        "footFold": True,
        "sources": [
            {"say": "srcOdqn09", "url": "https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv13i2.pdf"},
            {"say": "srcCelestrak", "url": "https://celestrak.org/events/collision/"},
            {"say": "srcJsr", "url": "https://planet4589.org/space/jsr/back/news.606.txt"},
            {"say": "srcSatcat", "url": "https://celestrak.org/satcat/search.php"},
            {"say": "srcWiki", "url": "https://en.wikipedia.org/wiki/2009_satellite_collision"},
        ],
    }


def dump(doc) -> str:
    return json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"


def held_counts() -> dict:
    """The counts the pieces files hold (catalogued and up), for the moment's own record and the words' test."""
    out = {}
    for cloud, path in PIECES.items():
        if path.exists():
            doc = json.loads(path.read_text(encoding="utf-8"))
            out[cloud] = {"catalogued": doc.get("catalogued"), "up": len(doc.get("pieces", [])) // 3}
    return out


def main(argv: list[str]) -> int:
    if "--satcat" in argv:
        src = Path(argv[argv.index("--satcat") + 1])
        for cloud, path in PIECES.items():
            flat, counts = pieces_from_satcat(src, cloud)
            name = NAMES[cloud][1].replace(" DEB", "").title().replace("Cosmos", "Kosmos")
            path.write_text(dump({"note": f"{name}'s {counts['up']} pieces still in orbit of {counts['catalogued']} catalogued: apogee km, perigee km, "
                                          "inclination in tenths of a degree, by catalogue number (scripts/build_moment_iridium_cosmos.py)",
                                  "cloud": cloud, "read": TODAY[:10], "source": "https://celestrak.org/pub/satcat.csv", "catalogued": counts["catalogued"],
                                  "pieces": flat}), encoding="utf-8")
            print(f"pieces {cloud}: {counts['up']} of {counts['catalogued']} -> {path.relative_to(ROOT)} ({path.stat().st_size} B)")
    moment = dump(build())
    orbits = {k: dump({"note": f"{'Iridium 33' if k == 'iridium' else 'Kosmos 2251'}'s last quarter hour as a circle through the point of the collision "
                                "(scripts/build_moment_iridium_cosmos.py): t s from the event, km and km/s, Earth-inertial", "rows": orbit_rows(k)})
              for k in ORBITS}
    if "--check" in argv:
        stale = [p.name for p, text in [(MOMENT, moment)] + [(ORBITS[k], orbits[k]) for k in ORBITS] if not p.exists() or p.read_text(encoding="utf-8") != text]
        stale += [p.name for p in PIECES.values() if not p.exists()]
        if stale:
            print(f"build_moment_iridium_cosmos: stale: {', '.join(stale)}; run python3 scripts/build_moment_iridium_cosmos.py")
            return 1
        print("build_moment_iridium_cosmos: the moment and its paths are current")
        return 0
    MOMENT.write_text(moment, encoding="utf-8")
    for k, p in ORBITS.items():
        p.write_text(orbits[k], encoding="utf-8")
    dv, ang = closing()
    print(f"wrote {MOMENT.relative_to(ROOT)} ({len(moment)} B) and two orbits; closing {dv:.2f} km/s at {ang:.1f} degrees; "
          f"hit point {'in the Earth shadow' if in_shadow() else 'sunlit'}")
    return 0


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
