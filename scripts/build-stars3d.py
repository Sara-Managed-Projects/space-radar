#!/usr/bin/env python3
"""Repack the HYG star database into site/data/stars3d.bin + stars3d.names.json (spec 0028 step 3).

    python3 scripts/build-stars3d.py path/to/hyg_v44.csv

HYG (https://codeberg.org/astronexus/hyg, CC BY-SA 4.0, David Nash) carries 119 614 stars with
Gaia/Hipparcos distances. The browser needs, per star, a POSITION it can put in the scene and two
numbers for how bright to draw it. Everything else stays here.

WHAT IS WRITTEN, AND WHAT IS REFUSED
- A star with no measured distance (HYG writes 100 000 pc as its "unknown" sentinel, or 0) is NOT
  placed. It is counted, and the layer says how many it could not place, because a star drawn on an
  invented shell is a confident lie about where it is. 10 225 of them in v4.4.
- The Sun (HYG id 0, dist 0) is skipped: scene/worlds.js draws it.
- Positions are HYG's x,y,z (parsecs, equatorial J2000: +X vernal equinox, +Z north pole) rotated
  into the heliocentric ECLIPTIC J2000 axes the app's `sun-inertial` frame uses, then written in
  LIGHT-YEARS, because one unit on the `stellar` rung is one light-year (registry/stages.yaml).

FORMAT (little-endian)
  header  'SR3D' u32 version=1  u32 count  u32 unplaced
  record  f32 x  f32 y  f32 z  (light-years, ecliptic J2000)   f32 absmag   f32 appmag
          i16 ci*1000 (B-V; -32768 = unknown)   u16 nameRow+1 (0 = unnamed)          -- 24 bytes
  names   stars3d.names.json: {"rows": [[recordIndex, proper, bayer, flamsteed, hip, spect, distLy,
          mag, lum, x, y, z], ...]} for every star with a proper, Bayer or Flamsteed name (x,y,z in
          light-years, same axes as the binary). Search, picking by name and the card need only this
          small file; the binary is fetched the first time the stars are actually drawn.
"""
from __future__ import annotations

import csv
import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_BIN = ROOT / "site/data/stars3d.bin"
OUT_NAMES = ROOT / "site/data/stars3d.names.json"
LY_PER_PC = 3.2615637771674333  # IAU: 1 pc = 3.0856775814913673e16 m, 1 ly = 9.4607304725808e15 m
OBLIQUITY_DEG = 23.4392911  # J2000 mean obliquity, the same constant frames.js uses
UNKNOWN_PC = 100000.0

GREEK = {
    "Alp": "α", "Bet": "β", "Gam": "γ", "Del": "δ", "Eps": "ε", "Zet": "ζ", "Eta": "η", "The": "θ",
    "Iot": "ι", "Kap": "κ", "Lam": "λ", "Mu": "μ", "Nu": "ν", "Xi": "ξ", "Omi": "ο", "Pi": "π",
    "Rho": "ρ", "Sig": "σ", "Tau": "τ", "Ups": "υ", "Phi": "φ", "Chi": "χ", "Psi": "ψ", "Ome": "ω",
}


def bayer_text(bayer: str, con: str) -> str:
    """HYG writes `Alp`, `Alp-2`, `Bet` ...; people read α CMa."""
    if not bayer:
        return ""
    head, _, sup = bayer.partition("-")
    letter = GREEK.get(head, head)
    return f"{letter}{sup and ('¹²³⁴⁵⁶⁷⁸⁹'[int(sup) - 1] if sup.isdigit() and 1 <= int(sup) <= 9 else sup)} {con}".strip()


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__)
        return 2
    src = Path(argv[0])
    ce, se = math.cos(math.radians(OBLIQUITY_DEG)), math.sin(math.radians(OBLIQUITY_DEG))
    records = bytearray()
    names: list = []
    count = unplaced = skipped_sun = 0
    with src.open(encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            if row.get("id") == "0":
                skipped_sun += 1
                continue
            dist = float(row["dist"] or 0)
            if not (0 < dist < UNKNOWN_PC):
                unplaced += 1
                continue
            x, y, z = float(row["x"]), float(row["y"]), float(row["z"])
            # equatorial -> ecliptic: a rotation about +X by the obliquity
            ye = y * ce + z * se
            ze = -y * se + z * ce
            xl, yl, zl = x * LY_PER_PC, ye * LY_PER_PC, ze * LY_PER_PC
            mag = float(row["mag"])
            absmag = float(row["absmag"]) if row.get("absmag") else mag - 5 * math.log10(dist / 10)
            ci = row.get("ci") or ""
            ci_i = int(round(float(ci) * 1000)) if ci else -32768
            ci_i = max(-32767, min(32767, ci_i)) if ci else -32768
            proper = (row.get("proper") or "").strip()
            bayer = bayer_text((row.get("bayer") or "").strip(), (row.get("con") or "").strip())
            flam = (row.get("flam") or "").strip()
            flam_text = f"{flam} {row.get('con', '').strip()}".strip() if flam else ""
            name_ref = 0
            if proper or bayer or flam_text:
                hip = int(float(row["hip"])) if row.get("hip") else None
                lum = float(row["lum"]) if row.get("lum") else None
                names.append([
                    count, proper, bayer, flam_text, hip, (row.get("spect") or "").strip(),
                    round(dist * LY_PER_PC, 2), round(mag, 2), round(lum, 3) if lum is not None else None,
                    round(xl, 4), round(yl, 4), round(zl, 4),
                ])
                name_ref = len(names)  # 1-based; 0 means unnamed
            if name_ref > 65535:
                raise SystemExit("more than 65 535 named stars: widen nameRow")
            records += struct.pack("<fffffhH", xl, yl, zl, absmag, mag, ci_i, name_ref)
            count += 1
    header = struct.pack("<4sIII", b"SR3D", 1, count, unplaced)
    OUT_BIN.write_bytes(header + bytes(records))
    OUT_NAMES.write_text(
        json.dumps({"source": "HYG v4.4, CC BY-SA 4.0, https://codeberg.org/astronexus/hyg", "rows": names},
                   ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"stars3d: {count} placed, {unplaced} with no measured distance (not drawn), "
          f"{len(names)} named, {skipped_sun} Sun row skipped -> "
          f"{OUT_BIN.stat().st_size} B + {OUT_NAMES.stat().st_size} B")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
