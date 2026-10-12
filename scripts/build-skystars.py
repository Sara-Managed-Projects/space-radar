#!/usr/bin/env python3
"""Repack site/data/stars3d.bin into the small files the sky from the ground reads (internal #392).

    python3 scripts/build-skystars.py            write the three files
    python3 scripts/build-skystars.py --check    fail if they are not what this script writes

WHY. sky/groundsky.js drew its faint stars from stars3d.bin: 2 625 352 bytes of positions in
light-years and absolute magnitudes, of which the ground sky uses a direction, a magnitude and a
colour. Measured 2026-10-06: opening the sky view fetched 2.6 MB of stars and a 288 kB names file
for 549 proper names. These files carry only what a sky needs, in two tiers:

  site/data/skystars-1.bin   the stars the naked-eye file (data/stars.bin, to magnitude 6.0, already
                             in the cache from the first visit) does not have, to magnitude 7.0:
                             what a dark sky shows before any zoom. Fetched when the sky view opens.
  site/data/skystars-2.bin   the rest of the 109 389. Fetched when the field has closed enough to
                             show a star fainter than tier 1 has.
  site/data/skystars.names.json   {"rows": [[name, raDeg, decDeg, mag], ...]}: the proper names to
                             magnitude 6.5, brightest first.

The source is stars3d.bin itself (HYG v4.4, CC BY-SA 4.0, scripts/build-stars3d.py), so this needs
no download and the two can never disagree about which stars exist.

FORMAT (little-endian)
  header  'SRSK'  u16 version=1  u16 bytes per record=8  u32 count  f32 faintest magnitude in the file
  record  u24 ra    right ascension, 360 degrees / 2^24 a step (0.08 arcsecond)
          u24 dec   (declination + 90) / 180 * (2^24 - 1)
          u8  mag   round((magnitude + 1.5) * 12.5): 0.08 a step, -1.5 to 18.8
          u8  bv    round((B-V + 0.5) * 50): 0.02 a step; 255 = not measured
  Records are in order of magnitude, brightest first, so a reader can draw a prefix.
"""
from __future__ import annotations

import array
import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "site/data/stars3d.bin"
NAMES_SRC = ROOT / "site/data/stars3d.names.json"
NAKED = ROOT / "site/data/stars.bin"
OUT1 = ROOT / "site/data/skystars-1.bin"
OUT2 = ROOT / "site/data/skystars-2.bin"
OUT_NAMES = ROOT / "site/data/skystars.names.json"
TIER1_MAG = 7.0
NAME_MAG = 6.5
OBLIQUITY = math.radians(23.4392911)  # J2000 mean obliquity, as scene/galaxy.js and sky/figures.js
MAG_OFFSET, MAG_SCALE = 1.5, 12.5
BV_OFFSET, BV_SCALE = 0.5, 50.0


def ecl_to_radec(x: float, y: float, z: float) -> tuple[float, float]:
    c, s = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    ex, ey, ez = x, y * c - z * s, y * s + z * c
    n = math.sqrt(ex * ex + ey * ey + ez * ez)
    return math.degrees(math.atan2(ey, ex)) % 360.0, math.degrees(math.asin(max(-1.0, min(1.0, ez / n))))


def quantise(ra: float, dec: float, mag: float, bv: float | None) -> bytes:
    qra = int(round(ra / 360.0 * 16777216)) % 16777216
    qdec = max(0, min(16777215, int(round((dec + 90.0) / 180.0 * 16777215))))
    qmag = max(0, min(255, int(round((mag + MAG_OFFSET) * MAG_SCALE))))
    qbv = 255 if bv is None else max(0, min(254, int(round((bv + BV_OFFSET) * BV_SCALE))))
    return qra.to_bytes(3, "little") + qdec.to_bytes(3, "little") + bytes([qmag, qbv])


def pack(rows: list[tuple[float, float, float, float | None]]) -> bytes:
    rows = sorted(rows, key=lambda r: (r[2], r[0], r[1]))
    faintest = rows[-1][2] if rows else 0.0
    return b"SRSK" + struct.pack("<HHIf", 1, 8, len(rows), faintest) + b"".join(quantise(*r) for r in rows)


def build() -> dict[Path, bytes]:
    data = SRC.read_bytes()
    if data[:4] != b"SR3D":
        raise SystemExit("stars3d.bin: not the file this was written for")
    count = struct.unpack_from("<I", data, 8)[0]
    naked = array.array("f")
    naked.frombytes(NAKED.read_bytes())
    naked_max = max(naked[2::4])
    tier1, tier2 = [], []
    for i in range(count):
        x, y, z, _absmag, mag, ci, _name = struct.unpack_from("<fffffhH", data, 16 + i * 24)
        if not mag > naked_max or (x == 0 and y == 0 and z == 0):
            continue  # the naked-eye file has it: no star is drawn twice
        ra, dec = ecl_to_radec(x, y, z)
        (tier1 if mag <= TIER1_MAG else tier2).append((ra, dec, mag, None if ci == -32768 else ci / 1000.0))
    names = []
    for r in json.loads(NAMES_SRC.read_text())["rows"]:
        proper, mag = r[1], r[7]
        if not proper or mag is None or mag > NAME_MAG:
            continue
        ra, dec = ecl_to_radec(r[9], r[10], r[11])
        names.append([proper, round(ra, 4), round(dec, 4), round(mag, 2)])
    names.sort(key=lambda r: (r[3], r[0]))
    names_text = json.dumps({"source": "HYG v4.4 through site/data/stars3d.names.json (scripts/build-skystars.py)", "rows": names}, ensure_ascii=False, separators=(",", ":")) + "\n"
    return {OUT1: pack(tier1), OUT2: pack(tier2), OUT_NAMES: names_text.encode("utf-8")}


def main() -> int:
    files = build()
    if "--check" in sys.argv:
        bad = [str(p.relative_to(ROOT)) for p, b in files.items() if not p.exists() or p.read_bytes() != b]
        if bad:
            print("build-skystars: out of date:", ", ".join(bad), "(run python3 scripts/build-skystars.py)")
            return 1
        print("build-skystars: up to date")
        return 0
    for p, b in files.items():
        p.write_bytes(b)
        print(f"{p.relative_to(ROOT)}: {len(b)} B")
    return 0


if __name__ == "__main__":
    sys.exit(main())
