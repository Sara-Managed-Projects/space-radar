#!/usr/bin/env python3
"""Stellar streams round the Milky Way: tracks from the galstreams library (internal #420, deep-space review of 2026-11-16).

    python3 scripts/build_deep_streams.py --tracks=<dir with the track files>   bake (standard library only)
    python3 scripts/build_deep_streams.py --check                               the JSON matches the registry

WHAT IT READS. Four track files of the galstreams library (Mateu 2023, MNRAS 520, 5225; BSD 3-Clause,
https://github.com/cmateu/galstreams, the files under galstreams/tracks/): each is an ECSV table of 2 000 to 28 000 points
along a stream, `ra, dec` (degrees, ICRS), `distance` (kpc, from the Sun) and proper motions. The file names, their sizes,
SHA-256 and the commit they were read at are in registry/streams.yaml (the files are not in git).

WHAT IT WRITES. site/data/deep/streams.json: for each stream, `n` points in kiloparsecs-turned-light-years (kly) about the
Sun, in the axes of `sun-inertial` (ecliptic J2000), which is the frame scene/deep/streams.js draws in. A point is the
track's own (ra, dec, distance) turned into x, y, z: nothing is smoothed, fitted or extended. Every `step`-th row of the
file is kept (a stream is far longer than a screen is wide; the ends are always kept), rounded to 0.001 kly (a parsec).
No Galactic model enters: the track's points are heliocentric measurements, and a heliocentric frame is the scene's.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "data" / "deep" / "streams.json"
REGISTRY = ROOT / "registry" / "streams.yaml"
KPC_LY = 3261.5637769  # light-years in a kiloparsec: 648000 / pi parsecs an AU, IAU 2015 B2 (1 pc = 3.26156377716743 ly)
OBLIQUITY = math.radians(23.4392911)  # J2000 mean obliquity, as site/js/scene/nebulae.js

# id, file (under galstreams/tracks/), rows kept: every step-th, display colour, ribbon width in kly (illustrative; the
# same numbers are in registry/streams.yaml, which --check compares)
STREAMS = [
    ("sagittarius", "track.st.Sagittarius.antoja2020.ecsv", 100, [1.0, 0.72, 0.30], 2.5),
    ("orphan-chenab", "track.st.Orphan-Chenab.koposov2019.ecsv", 100, [0.55, 0.85, 1.0], 1.2),
    ("gd-1", "track.st.GD-1.pricewhelan2018.ecsv", 50, [0.65, 1.0, 0.65], 0.25),
    ("palomar-5", "track.st.Pal5.pricewhelan2019.ecsv", 20, [1.0, 0.55, 0.75], 0.15),
]


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def rows_of(path: Path) -> list[tuple[float, float, float]]:
    lines = [ln for ln in path.read_text().splitlines() if ln and not ln.startswith("#")]
    out = []
    for r in csv.DictReader(lines):
        out.append((float(r["ra"]), float(r["dec"]), float(r["distance"])))
    return out


def sun_inertial_kly(ra: float, dec: float, d_kpc: float) -> list[float]:
    """A heliocentric (ra, dec, distance) -> x, y, z in kly in ecliptic J2000 axes."""
    a, b, d = math.radians(ra), math.radians(dec), d_kpc * KPC_LY / 1000.0
    x, y, z = d * math.cos(b) * math.cos(a), d * math.cos(b) * math.sin(a), d * math.sin(b)
    c, s = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    return [x, y * c + z * s, -y * s + z * c]


def bake(tracks: Path) -> dict:
    streams = []
    for sid, fname, step, colour, width in STREAMS:
        p = tracks / fname
        rows = rows_of(p)
        keep = list(range(0, len(rows), step))
        if keep[-1] != len(rows) - 1:
            keep.append(len(rows) - 1)
        pts = []
        for i in keep:
            pts.extend(round(v, 3) for v in sun_inertial_kly(*rows[i]))
        dist = [r[2] for r in rows]
        streams.append({
            "id": sid, "colour": colour, "ribbon_kly": width, "file": fname, "sha256": sha(p), "rows": len(rows), "step": step, "n": len(keep),
            "dist_kpc": [round(min(dist), 3), round(max(dist), 3)],
            "first": [round(v, 4) for v in rows[0]], "last": [round(v, 4) for v in rows[-1]],
            "pts": pts,
        })
    return {"frame": "sun-inertial (ecliptic J2000), kly about the Sun", "kpc_ly": KPC_LY, "streams": streams}


def main() -> int:
    args = sys.argv[1:]
    if "--check" in args:
        j = json.loads(OUT.read_text())
        reg = REGISTRY.read_text()
        bad = []
        for s in j["streams"]:
            if len(s["pts"]) != 3 * s["n"]:
                bad.append(f"{s['id']}: {len(s['pts'])} numbers for {s['n']} points")
            for token in (s["sha256"], s["file"], f"colour: {s['colour']}"):
                if token not in reg:
                    bad.append(f"{s['id']}: `{token[:20]}...` is not in registry/streams.yaml")
        print("\n".join(bad) if bad else f"ok: {len(j['streams'])} streams, {sum(s['n'] for s in j['streams'])} points")
        return 1 if bad else 0
    tracks = next((Path(a.split("=", 1)[1]) for a in args if a.startswith("--tracks=")), None)
    if tracks is None:
        print(__doc__)
        return 2
    j = bake(tracks)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(j, separators=(",", ":")) + "\n")
    for s in j["streams"]:
        print(s["id"], s["file"], s["sha256"], "rows", s["rows"], "kept", s["n"], "dist", s["dist_kpc"], "first", s["first"], "last", s["last"])
    print("bytes", OUT.stat().st_size)
    return 0


if __name__ == "__main__":
    sys.exit(main())
