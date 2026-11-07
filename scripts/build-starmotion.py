#!/usr/bin/env python3
"""Write site/data/starmotion.bin: how the stars of the sky move, for the clock far from now (forge #141).

    python3 scripts/build-starmotion.py path/to/hyg_v44.csv[.gz]
    python3 scripts/build-starmotion.py path/to/hyg_v44.csv[.gz] --check   fail if the file is not what this writes

WHY A SIDE FILE. The star files the sky draws (data/stars.bin, skystars-1/-2.bin, stars3d.bin) carry
where a star is, not how it moves, and every one of them is read by tests and budgets as it is. A
visitor who stays within fifty years of now needs no motion at all: Barnard's Star, the fastest,
crawls 2.9 arcminutes in that time. So the motions are a file of their own, fetched the first time
the clock goes further (sky/starmotion.js), and keyed by DIRECTION, not by row: the sky's own points,
the figures' corners and the star names find their star by where it is in J2000, so no file the
sky already has needs a new column, and the d3-celestial naked-eye file is moved as well as HYG's.

WHAT IS IN IT. Every HYG v4.4 star to magnitude 7.0 (what the sky draws before any zoom), every
star moving 0.5 arcseconds a year or more (Barnard's, Kapteyn's, Groombridge 1830: the ones that
visibly crawl in a binocular field over a few thousand years), and every star within 6.2 parsecs.

THE MOTION is MEASURED: HYG's Hipparcos (or Gaia, for the stars it took from there) proper motion,
its radial velocity where one was measured, and its distance. Turned into a space velocity in
equatorial J2000 axes, it is what the browser moves each star along, in a straight line, so the
perspective of a star coming close (Barnard's Star at 3.8 light-years about the year 11 800) is in
it. The straight line is the MODEL: it ignores the Galaxy's pull, which bends a path by about a
degree in 100 000 years for a star 100 light-years away, and it is no better than the radial
velocity, which is missing for many faint stars (they are moved across the sky only: flag bit 0).

CORRECTIONS. HYG writes Barnard's Star's motion in declination as 9 999.99 mas/yr, the most its
column holds; the measured value is 10 362.394 (Gaia DR3, Gaia Collaboration 2023, CC BY-SA 3.0 IGO,
as Wikipedia's article quotes it, read 2026-11-07). That row is replaced, with its Gaia parallax and
radial velocity, so the three agree.

A star with no measured distance, or one whose distance and proper motion give a speed over 1 000
km/s (a parallax smaller than its error), is given a NOMINAL distance at which its proper motion is a
100 km/s crawl and no radial velocity (flag bit 1 clear). That moves it across the sky exactly as its
proper motion says, which is all that can be said of it.

FORMAT (little-endian)
  header  'SRPM'  u16 version=1  u16 bytes per record=16  u32 count  f32 faintest magnitude
  record  u24 ra, u24 dec   J2000 place, as scripts/build-skystars.py writes them (0.08 arcsecond)
          u8  mag           round((magnitude + 1.5) * 12.5)
          u8  flags         bit 0: radial velocity measured; bit 1: distance measured
          u16 dist          round(log10(light-years) * 8192): 0.03 % a step, 1 to 10^8 light-years
          i16 vx, vy, vz    space velocity, equatorial J2000 axes, 0.04 km/s a step (+-1 310 km/s)
  Records are brightest first.
"""
from __future__ import annotations

import csv
import gzip
import io
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site/data/starmotion.bin"
LY_PER_PC = 3.2615637771674333
KMS_PER_PC_YR = 977792.2216807891  # 1 parsec a Julian year, in km/s
K = 4.740470463533348  # km/s for 1 arcsecond a year at 1 parsec
MAG_LIMIT = 7.0
FAST_MAS = 500.0
NEAR_PC = 6.2
UNKNOWN_PC = 100000.0
V_STEP = 0.04
DIST_STEP = 8192.0
MAX_KMS = 1000.0
NOMINAL_KMS = 100.0

# HIP -> (pmra mas/yr (times cos dec), pmdec mas/yr, rv km/s, parallax mas, why)
CORRECTIONS = {
    87937: (-801.551, 10362.394, -110.47, 546.9759, "Barnard's Star: HYG's pmdec is clamped at 9999.99; Gaia DR3"),
}

USAGE = "python3 scripts/build-starmotion.py path/to/hyg_v44.csv[.gz] [--check]"


def open_csv(path: Path):
    raw = path.read_bytes()
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    return io.StringIO(raw.decode("utf-8"))


def velocity(ra_deg: float, dec_deg: float, pmra: float, pmdec: float, rv: float, dist_pc: float) -> tuple[float, float, float]:
    """Space velocity, km/s, equatorial axes, from a proper motion (mas/yr, pmra times cos dec), a radial velocity and a distance."""
    a, d = math.radians(ra_deg), math.radians(dec_deg)
    ca, sa, cd, sd = math.cos(a), math.sin(a), math.cos(d), math.sin(d)
    vt_a = K * pmra / 1000.0 * dist_pc  # along increasing right ascension
    vt_d = K * pmdec / 1000.0 * dist_pc  # along increasing declination
    u = (cd * ca, cd * sa, sd)
    e_a = (-sa, ca, 0.0)
    e_d = (-sd * ca, -sd * sa, cd)
    return tuple(rv * u[i] + vt_a * e_a[i] + vt_d * e_d[i] for i in range(3))


def record(ra: float, dec: float, mag: float, flags: int, dist_ly: float, v: tuple[float, float, float]) -> bytes:
    qra = int(round(ra / 360.0 * 16777216)) % 16777216
    qdec = max(0, min(16777215, int(round((dec + 90.0) / 180.0 * 16777215))))
    qmag = max(0, min(255, int(round((mag + 1.5) * 12.5))))
    qd = max(0, min(65535, int(round(math.log10(max(1.0, dist_ly)) * DIST_STEP))))
    qv = [max(-32767, min(32767, int(round(c / V_STEP)))) for c in v]
    return qra.to_bytes(3, "little") + qdec.to_bytes(3, "little") + bytes([qmag, flags]) + struct.pack("<Hhhh", qd, *qv)


def build(src: Path) -> tuple[bytes, dict]:
    rows = []
    stats = {"stars": 0, "rv": 0, "nominal": 0, "corrected": 0, "still": 0}
    for r in csv.DictReader(open_csv(src)):
        if r.get("id") == "0":
            continue
        mag = float(r["mag"])
        dist = float(r["dist"] or 0)
        pmra = float(r["pmra"] or 0)
        pmdec = float(r["pmdec"] or 0)
        rv = float(r["rv"] or 0)
        hip = int(float(r["hip"])) if r.get("hip") else None
        if hip in CORRECTIONS:
            pmra, pmdec, rv, plx, _why = CORRECTIONS[hip]
            dist = 1000.0 / plx
            stats["corrected"] += 1
        pm = math.hypot(pmra, pmdec)
        known = 0 < dist < UNKNOWN_PC
        if not (mag <= MAG_LIMIT or pm >= FAST_MAS or (known and dist < NEAR_PC)):
            continue
        ra, dec = float(r["ra"]) * 15.0, float(r["dec"])
        flags = 0
        if known:
            v = velocity(ra, dec, pmra, pmdec, rv, dist)
            if math.sqrt(sum(c * c for c in v)) <= MAX_KMS:
                flags = 2 | (1 if rv != 0 else 0)
        if not flags & 2:
            # Nominal: the distance at which the proper motion is a 100 km/s crawl; no radial velocity.
            dist = (NOMINAL_KMS / (K * pm / 1000.0)) if pm > 0 else 1.0e6
            dist = min(dist, 1.0e6)
            v = velocity(ra, dec, pmra, pmdec, 0.0, dist)
            stats["nominal"] += 1
        if pm == 0 and rv == 0:
            stats["still"] += 1
        stats["rv"] += flags & 1
        rows.append((mag, ra, dec, flags, dist * LY_PER_PC, v))
    rows.sort(key=lambda t: (t[0], t[1], t[2]))
    stats["stars"] = len(rows)
    body = b"".join(record(ra, dec, mag, flags, dly, v) for mag, ra, dec, flags, dly, v in rows)
    header = b"SRPM" + struct.pack("<HHIf", 1, 16, len(rows), rows[-1][0] if rows else 0.0)
    return header + body, stats


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("--help", "-h"):
        print(f"usage: {USAGE}\n\n{__doc__}")
        return 0 if argv else 2
    src = Path(argv[0])
    if not src.is_file():
        print(f"build-starmotion: no such file: {src}\nusage: {USAGE}", file=sys.stderr)
        return 2
    data, stats = build(src)
    if "--check" in argv[1:]:
        if not OUT.exists() or OUT.read_bytes() != data:
            print(f"build-starmotion: {OUT.relative_to(ROOT)} is out of date (run {USAGE.split(' [')[0]})")
            return 1
        print("build-starmotion: up to date")
        return 0
    OUT.write_bytes(data)
    print(f"starmotion: {stats['stars']} stars ({stats['rv']} with a radial velocity, {stats['nominal']} at a nominal distance, "
          f"{stats['still']} with no motion, {stats['corrected']} corrected) -> {len(data)} B")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
