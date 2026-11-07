#!/usr/bin/env python3
"""Write the Moment "2007: Fengyun-1C" (forge #153): site/data/moments/fengyun-1c.json and its two path files.

    python3 scripts/build_moment_fengyun1c.py --satcat DIR/satcat.csv   # the pieces from CelesTrak's catalogue, and the moment
    python3 scripts/build_moment_fengyun1c.py                          # the moment only (the pieces file as it is)
    python3 scripts/build_moment_fengyun1c.py --check                  # exit 1 if the moment is not what this would write

f1-find made Fengyun-1C a preset of the date field and a debris chip with a modelled spread (data/clouds.js). This makes
it a Moment: the story told on one clock from ten minutes before the anti-satellite test of 11 January 2007 to the
catalogue of today, voiced by the trips' voice (scripts/narrate-moments.py), its captions appearing as each sentence is
said. The other Moments are made by node generators in tools/moments-build/; this one is Python because its inputs are
Python's: the voice's index and CelesTrak's CSV.

WHAT IS MEASURED. The time (22:26:10 UTC, CelesTrak's analysis of the test), the satellite's orbit (845 by 865 km at
98.6 degrees, NASA's Orbital Debris Quarterly News 11(2)), every count said (ODQN 11(2), 12(1), 17(1); today's from the
catalogue), and each piece's orbit today (CelesTrak SATCAT: apogee, perigee, inclination; the 2 310 FENGYUN 1C DEB of
1999-025 with no decay date on 2026-11-07). WHAT IS MODELLED. The picture of the spread (data/clouds.js spreadAt, two-body
motion plus J2's drift from the event, each piece starting at its perigee of today, so on a short line and not a point), the satellite's path as a conic, and where on its orbit it was struck (the node
data/clouds.js gives every cloud, illustrative). The interceptor's path was never published and is not drawn.

THE PACE is made from the voice: each chapter is a clip, and each stretch of the clock plays for at least as long as its
clip lasts (CHAPTER_PLAY), so the voice never runs past its chapter; the rate in force is on screen, as in every Moment.
The pieces file: {note, cloud, read, source, pieces: [apogee km, perigee km, inclination x 10, ...]} (moments/debriscloud.js).
"""
from __future__ import annotations

import csv
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
MOMENT = ROOT / "site" / "data" / "moments" / "fengyun-1c.json"
PIECES = ROOT / "site" / "data" / "moments" / "paths" / "fengyun-1c-pieces.json"
ORBIT = ROOT / "site" / "data" / "moments" / "paths" / "fengyun-1c-orbit.json"
VOICE_INDEX = ROOT / "site" / "audio" / "moments" / "fengyun-1c" / "index.json"
VOICES = ROOT / "registry" / "moment-voices.yaml"

EPOCH = "2007-01-11T22:26:10Z"                 # CelesTrak, "Chinese ASAT Test": the most likely time of the event
TODAY = "2026-11-07T00:00:00Z"                 # the catalogue the pieces and today's count were read from
PERIGEE_KM, APOGEE_KM, INC_DEG = 845.0, 865.0, 98.6   # ODQN 11(2), April 2007, p. 2
R_EARTH_KM = 6378.137                          # data/clouds.js R_EARTH_KM (WGS-84)
GM_KM3_S2 = 398600.4418                        # propagate/kepler.js GM_EARTH
CHAPTER_PLAY = 3.0                             # play seconds a chapter runs past its clip, at least
PARENT, PIECE_NAME = "1999-025", "FENGYUN 1C DEB"
CHAPTERS = ["chBefore", "chHit", "chRing", "chMonths", "chYear", "chShell", "chToday"]


def iso_s(text: str) -> float:
    return datetime.fromisoformat(text.replace("Z", "+00:00")).replace(tzinfo=timezone.utc).timestamp()


def span_end() -> float:
    return round(iso_s(TODAY) - iso_s(EPOCH))


# --- the pieces --------------------------------------------------------------------------------------------------

def pieces_from_satcat(path: Path) -> tuple[list[int], dict]:
    """The flat [apogee, perigee, inclination x 10, ...] of every Fengyun-1C fragment still up, and the counts."""
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    frags = [r for r in rows if r["OBJECT_ID"][:8] == PARENT and r["OBJECT_TYPE"] == "DEB" and r["OBJECT_NAME"].upper().startswith(PIECE_NAME)]
    up = [r for r in frags if not r["DECAY_DATE"]]
    flat = []
    for r in sorted(up, key=lambda r: int(r["NORAD_CAT_ID"])):
        try:
            flat += [int(round(float(r["APOGEE"]))), int(round(float(r["PERIGEE"]))), int(round(float(r["INCLINATION"]) * 10))]
        except ValueError:
            continue
    return flat, {"catalogued": len(frags), "up": len(up)}


# --- the satellite's last ten minutes: a conic that reaches the cloud's starting point at the event ---------------

def kepler_e(M: float, e: float) -> float:
    E = M
    for _ in range(30):
        E -= (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
    return E


def orbit_rows(t0: float = -660.0, t1: float = 1500.0, step: float = 20.0) -> list[list[float]]:
    """[t, x, y, z, vx, vy, vz] (km, km/s, Earth-inertial) of the satellite's orbit, at perigee on the ascending node of a
    plane of node 0 at t = 0: the point data/clouds.js spreadAt() starts every piece from, so the cloud is born on it."""
    a = R_EARTH_KM + (PERIGEE_KM + APOGEE_KM) / 2
    e = (APOGEE_KM - PERIGEE_KM) / (2 * a)
    n = math.sqrt(GM_KM3_S2 / a ** 3)
    ci, si = math.cos(math.radians(INC_DEG)), math.sin(math.radians(INC_DEG))
    rows = []
    t = t0
    while t <= t1 + 1e-9:
        M = n * t
        E = kepler_e(M, e)
        nu = 2 * math.atan2(math.sqrt(1 + e) * math.sin(E / 2), math.sqrt(1 - e) * math.cos(E / 2))
        r = a * (1 - e * math.cos(E))
        p = a * (1 - e * e)
        vr = math.sqrt(GM_KM3_S2 / p) * e * math.sin(nu)
        vt = math.sqrt(GM_KM3_S2 / p) * (1 + e * math.cos(nu))
        cu, su = math.cos(nu), math.sin(nu)
        # in-plane unit vectors: radial (cu, su) and along-track (-su, cu); the plane's axes are X and (0, ci, si)
        x, y, z = r * cu, r * su * ci, r * su * si
        vx = vr * cu - vt * su
        vy = (vr * su + vt * cu) * ci
        vz = (vr * su + vt * cu) * si
        rows.append([round(t, 1), round(x, 4), round(y, 4), round(z, 4), round(vx, 6), round(vy, 6), round(vz, 6)])
        t += step
    return rows


# --- the pace, the captions and the voice ------------------------------------------------------------------------

def pace_from(clips: list, seconds: dict, end: float, base_play: dict | None = None) -> list[dict]:
    """Contiguous segments, one per clip, from its `t` to the next clip's (the last to `end`), each played for at least
    its clip's length plus CHAPTER_PLAY seconds, at a rate rounded to two significant figures."""
    base_play = base_play or {}
    out = []
    for i, c in enumerate(clips):
        frm, to = c["t"], clips[i + 1]["t"] if i + 1 < len(clips) else end
        play = max(base_play.get(c["id"], 20.0), float(seconds.get(c["id"], 0)) + CHAPTER_PLAY)
        raw = (to - frm) / play
        digits = 1 - int(math.floor(math.log10(raw)))
        # rounded DOWN to two figures, so the stretch plays a little longer, never shorter
        rate = int(raw // 10 ** -digits) * 10 ** -digits if digits <= 0 else math.floor(raw * 10 ** digits) / 10 ** digits
        out.append({"from": frm, "to": to, "rate": rate})
    return out


def play_of(pace: list, t: float) -> float:
    p = 0.0
    for s in pace:
        if t < s["to"]:
            return p + (max(t, s["from"]) - s["from"]) / s["rate"]
        p += (s["to"] - s["from"]) / s["rate"]
    return p


def mission_of(pace: list, p: float) -> float:
    acc = 0.0
    for s in pace:
        length = (s["to"] - s["from"]) / s["rate"]
        if p < acc + length:
            return s["from"] + (p - acc) * s["rate"]
        acc += length
    return pace[-1]["to"]


def build(index: dict, voices: dict) -> dict:
    story = voices["fengyun-1c"]
    clips = story["clips"]
    rows = index.get("clips") or {}
    seconds = {cid: r.get("s", 0) for cid, r in rows.items()}
    end = span_end()
    pace = pace_from(clips, seconds, end, {"before": 24.0, "test": 24.0})
    captions, audio = [], []
    for c in clips:
        row = rows.get(c["id"]) or {}
        starts = row.get("starts") or {}
        p0 = play_of(pace, c["t"])
        for k, key in enumerate(c["says"]):
            off = float(starts.get(key, 6.0 * k))
            captions.append({"t": round(mission_of(pace, p0 + off), 1), "say": key})
        if row:
            audio.append({"t": c["t"], "src": f"audio/moments/fengyun-1c/{c['id']}.opus", "twin": f"audio/moments/fengyun-1c/{c['id']}.m4a",
                          "s": row["s"], "voice": True, "gain": 1})
    captions[0]["t"] = clips[0]["t"]
    a = R_EARTH_KM + (PERIGEE_KM + APOGEE_KM) / 2
    return {
        "format": 1,
        "id": "fengyun-1c",
        "words": "fengyun-1c",
        "wordsFile": "en.moments.fengyun.js",
        "epoch": EPOCH,
        "span": [clips[0]["t"], end],
        "pace": pace,
        "place": {"name": "Near Xichang, where the interceptor was launched", "lat": 28.2463, "lon": 102.0263, "alt": 1800, "azimuth": 0},
        "trajectories": {
            "orbit": {"kind": "vectors", "truth": "reconstructed", "say": "pathSat", "frame": "earth-teme", "file": "paths/fengyun-1c-orbit.json",
                      "source": f"a conic of {PERIGEE_KM:.0f} by {APOGEE_KM:.0f} km at {INC_DEG} degrees (NASA ODQN 11(2), April 2007; a = {a:.1f} km), "
                                "at perigee on the ascending node of the node data/clouds.js gives every cloud at the event (illustrative), so the "
                                "cloud is born on it; no model of Fengyun-1C exists here, so it is drawn as the ringed mark"},
        },
        "vehicles": [{"id": "fy1c", "model": None, "marker": True, "lengthM": 1.4, "path": "orbit", "attitude": "prograde", "window": [clips[0]["t"], 0]}],
        "tracks": {
            "camera": [
                {"t": clips[0]["t"], "shot": "globe", "altKm": 2600, "backKm": 3800, "fov": 46, "vehicle": "fy1c"},
                {"t": -90, "shot": "globe", "altKm": 1300, "backKm": 1700, "fov": 44, "vehicle": "fy1c", "blend": 3},
                {"t": 60, "shot": "globe", "altKm": 3200, "backKm": 4500, "fov": 46, "vehicle": "fy1c", "blend": 5},
                {"t": clips[2]["t"], "shot": "wide", "look": "earth", "distKm": 30000, "dir": [0.2, -0.95, -0.25], "fov": 40, "blend": 4},
                {"t": clips[3]["t"], "shot": "wide", "look": "earth", "distKm": 32000, "dir": [0.55, -0.75, 0.35], "fov": 40, "blend": 6},
                {"t": clips[5]["t"], "shot": "wide", "look": "earth", "distKm": 34000, "dir": [0.75, -0.3, 0.6], "fov": 40, "blend": 6},
                {"t": clips[6]["t"], "shot": "wide", "look": "earth", "distKm": 32000, "dir": [0.35, -0.8, 0.5], "fov": 40, "blend": 6},
            ],
            "captions": captions,
            "audio": audio,
            "effects": [{"t": 0, "until": end, "effect": "debris-cloud", "cloud": "fy1c", "file": "paths/fengyun-1c-pieces.json", "say": "cloudNote",
                         "colour": "#ff8a5c", "sizePx": 2.5}],
        },
        "chapters": [{"t": c["t"], "say": CHAPTERS[i]} for i, c in enumerate(clips)],
        "sources": [
            {"say": "srcOdqn07", "url": "https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv11i2.pdf"},
            {"say": "srcOdqn08", "url": "https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv12i1.pdf"},
            {"say": "srcOdqn13", "url": "https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv17i1.pdf"},
            {"say": "srcOdqn14", "url": "https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv18i1.pdf"},
            {"say": "srcOdqn22", "url": "https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv26i1.pdf"},
            {"say": "srcCelestrak", "url": "https://celestrak.org/events/asat.php"},
            {"say": "srcSatcat", "url": "https://celestrak.org/satcat/search.php"},
            {"say": "srcWiki", "url": "https://en.wikipedia.org/wiki/2007_Chinese_anti-satellite_missile_test"},
        ],
    }


def dump(doc) -> str:
    return json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"


def main(argv: list[str]) -> int:
    voices = (yaml.safe_load(VOICES.read_text(encoding="utf-8")) or {})["moments"]
    index = json.loads(VOICE_INDEX.read_text(encoding="utf-8")) if VOICE_INDEX.exists() else {}
    moment = dump(build(index, voices))
    orbit = dump({"note": "Fengyun-1C's last minutes as a conic (scripts/build_moment_fengyun1c.py): t s from the event, km and km/s, Earth-inertial", "rows": orbit_rows()})
    if "--check" in argv:
        stale = [p.name for p, text in ((MOMENT, moment), (ORBIT, orbit)) if not p.exists() or p.read_text(encoding="utf-8") != text]
        if not PIECES.exists():
            stale.append(PIECES.name)
        if stale:
            print(f"build_moment_fengyun1c: stale: {', '.join(stale)}; run python3 scripts/build_moment_fengyun1c.py")
            return 1
        print("build_moment_fengyun1c: the moment and its paths are current")
        return 0
    if "--satcat" in argv:
        flat, counts = pieces_from_satcat(Path(argv[argv.index("--satcat") + 1]))
        PIECES.write_text(dump({"note": f"Fengyun-1C's {counts['up']} pieces still in orbit of {counts['catalogued']} catalogued: apogee km, perigee km, "
                                        "inclination in tenths of a degree, by catalogue number (scripts/build_moment_fengyun1c.py)",
                                "cloud": "fy1c", "read": TODAY[:10], "source": "https://celestrak.org/pub/satcat.csv", "pieces": flat}), encoding="utf-8")
        print(f"pieces: {counts['up']} of {counts['catalogued']} -> {PIECES.relative_to(ROOT)} ({PIECES.stat().st_size} B)")
    MOMENT.write_text(moment, encoding="utf-8")
    ORBIT.write_text(orbit, encoding="utf-8")
    print(f"wrote {MOMENT.relative_to(ROOT)} ({len(moment)} B) and {ORBIT.relative_to(ROOT)}; voice clips: {len(index.get('clips') or {})}")
    return 0


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
