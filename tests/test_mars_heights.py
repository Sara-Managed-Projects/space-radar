#!/usr/bin/env python3
"""Mars's height map says what the laser altimeter measured (spec 0073 requirement 5, 2026-10-12).

site/textures/1k_mars_height.webp is decoded (Pillow: node has no WebP decoder, which is why this
half of the Mars relief's test is Python and runs in the CI job that installs Pillow) and read at
four named places. The numbers on the right are the SOURCE's, read on 2026-10-12 from the MOLA
team's 16-pixels-a-degree grid (megt90n000eb.img, PDS Geosciences Node) by
scripts/build-mars-relief.py, with the same window and the same statistic; the label of that grid
gives its extremes as -8177 and 21171 m.

    Olympus Mons, the summit          17.3 N 227.0 E   highest within 0.6 deg     21 171 m
    Hellas, the deepest floor         32.8 S  62.2 E   lowest within 1.0 deg      -8 177 m
    Coprates Chasma, the floor        14.0 S 302.0 E   mean within 0.3 deg        -4 993 m
    the north polar cap, near its top 88.0 N   0.0 E   median within 0.5 deg      -2 472 m
    ... and the plain it stands on    78.0 N   0.0 E   median within 0.5 deg      -4 837 m

Each must be within TOLERANCE_M in the shipped file. The file is 20.8 km a texel, so a narrow
extreme is averaged (Hellas's deepest point is a small crater: the file says -7 853 m there).
A map that is mirrored, rolled to the wrong meridian, upside down or scaled wrongly fails.

    python3 tests/test_mars_heights.py
"""
from __future__ import annotations

import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("mars heights FAILED: Pillow is needed to decode the WebP (pip install pillow)")

HEIGHT = ROOT / "site" / "textures" / "1k_mars_height.webp"
RELIEF = ROOT / "site" / "textures" / "2k_mars_relief.webp"
TOLERANCE_M = 400.0
PLACES = (
    ("Olympus Mons, the summit", 17.3, 227.0, 0.6, "max", 21171.0),
    ("Hellas, the deepest floor", -32.8, 62.2, 1.0, "min", -8177.0),
    ("Valles Marineris, the floor of Coprates Chasma", -14.0, 302.0, 0.3, "mean", -4993.0),
    ("the north polar cap, near its top", 88.0, 0.0, 0.5, "median", -2472.0),
    ("the plain round the north polar cap", 78.0, 0.0, 0.5, "median", -4837.0),
)

problems: list[str] = []


def check(ok: bool, msg: str) -> None:
    if not ok:
        problems.append(msg)


def main() -> int:
    yaml = (ROOT / "registry" / "textures.yaml").read_text(encoding="utf8")
    row = yaml[yaml.index("- id: mars-height"):]
    row = row[:row.index("\n  - id: ", 10)]
    lo = float(re.search(r"min_m: (-?\d+)", row).group(1))
    hi = float(re.search(r"max_m: (-?\d+)", row).group(1))
    check(lo == -8200 and hi == 21300, f"the registry row records the byte's span (-8200 to 21300 m): {lo} to {hi}")
    worlds = (ROOT / "site" / "js" / "scene" / "worlds.js").read_text(encoding="utf8")
    check(f"minM: {lo:.0f}, maxM: {hi:.0f}" in worlds, "scene/worlds.js is told the same span the registry records")
    script = (ROOT / "scripts" / "build-mars-relief.py").read_text(encoding="utf8")
    check(f"HEIGHT_MIN_M = {lo:.1f}" in script and f"HEIGHT_MAX_M = {hi:.1f}" in script, "and so is the build script")
    for name, lat, lon, half, how, _ in PLACES:
        check(f'("{name}", {lat}, {lon}, {half}, "{how}")' in script, f"the build script reads {name} with the window this test does")
    check("Data sets archived in the PDS are in the public domain." in row and "CC0 (public domain)" in row, "the row quotes its licence sentences")
    check("limits:" in row and "make:" in row and "megt90n000eb" in row, "and has its source, how it was made and its limits")

    im = Image.open(HEIGHT)
    check(im.size == (1024, 512), f"the height map is 1024 x 512 ({im.size})")
    w, h = im.size
    px = list(im.convert("L").getdata())
    metres = lambda v: lo + v / 255.0 * (hi - lo)

    def window(lat, lon, half):
        # The map is centred on longitude 0: column 0 is 180 W.
        row_ = (90.0 - lat) / 180.0 * h
        col = ((lon + 180.0) % 360.0) / 360.0 * w
        dr = max(1, round(half / 180.0 * h))
        dc = max(1, round(half / 360.0 * w / max(math.cos(math.radians(lat)), 0.05)))
        out = []
        for r in range(int(row_) - dr, int(row_) + dr + 1):
            r = min(max(r, 0), h - 1)
            for c in range(int(col) - dc, int(col) + dc + 1):
                out.append(metres(px[r * w + (c % w)]))
        return out

    def stat(v, how):
        s = sorted(v)
        return {"max": s[-1], "min": s[0], "mean": sum(s) / len(s),
                "median": s[len(s) // 2] if len(s) % 2 else (s[len(s) // 2 - 1] + s[len(s) // 2]) / 2}[how]

    lines = []
    for name, lat, lon, half, how, source in PLACES:
        got = stat(window(lat, lon, half), how)
        lines.append(f"  {name}: {got:,.0f} m in the file, {source:,.0f} m in the source ({how} within {half} deg of {lat} N, {lon} E)")
        check(abs(got - source) <= TOLERANCE_M, f"{name} is {got:.0f} m in the shipped file and {source:.0f} m in MOLA's grid: over {TOLERANCE_M:.0f} m apart")

    # The whole map: the highest texel is Olympus Mons, where it is; the lowest is in Hellas.
    top = max(range(len(px)), key=px.__getitem__)
    lat_top = 90.0 - (top // w + 0.5) / h * 180.0
    lon_top = ((top % w + 0.5) / w * 360.0 - 180.0) % 360.0
    check(abs(lat_top - 17.3) < 1.5 and abs(lon_top - 227.0) < 1.5, f"the highest texel of the map is Olympus Mons's summit ({lat_top:.1f} N, {lon_top:.1f} E)")
    low = min(range(len(px)), key=px.__getitem__)
    lat_low = 90.0 - (low // w + 0.5) / h * 180.0
    lon_low = ((low % w + 0.5) / w * 360.0 - 180.0) % 360.0
    check(-55 < lat_low < -25 and 45 < lon_low < 95, f"the lowest texel of the map is in Hellas ({lat_low:.1f} N, {lon_low:.1f} E)")
    # The dichotomy: the northern plains lie kilometres under the southern highlands.
    band = lambda a, b: [metres(px[r * w + c]) for r in range(int((90 - b) / 180 * h), int((90 - a) / 180 * h)) for c in range(0, w, 4)]
    north, south = sum(band(50, 75)) / len(band(50, 75)), sum(band(-60, -30)) / len(band(-60, -30))
    check(south - north > 3000, f"the northern plains are over 3 km below the southern highlands ({north:.0f} m against {south:.0f} m)")
    lines.append(f"  highest texel {lat_top:.1f} N {lon_top:.1f} E, lowest {lat_low:.1f} N {lon_low:.1f} E; 50 to 75 N mean {north:,.0f} m, 30 to 60 S mean {south:,.0f} m")

    # The local-relief map: its size, level ground at 128, and Olympus's scarp and the canyon's walls in it.
    rel = Image.open(RELIEF)
    check(rel.size == (1536, 768), f"the relief map is 1536 x 768 ({rel.size})")
    rp = list(rel.convert("L").getdata())
    mean = sum(rp) / len(rp)
    check(abs(mean - 128) < 3, f"level ground is 128 in the relief map (mean {mean:.1f})")
    spread = (sum((v - mean) ** 2 for v in rp) / len(rp)) ** 0.5
    check(spread > 10, f"and it holds relief (the bytes' spread is {spread:.1f})")
    lines.append(f"  relief map: mean {mean:.1f}, spread {spread:.1f} of 255")

    print("measured:")
    print("\n".join(lines))
    if problems:
        print("mars heights FAILED:\n  " + "\n  ".join(problems))
        return 1
    print("mars heights ok: Olympus Mons, Hellas, Coprates Chasma and the north polar cap are within "
          f"{TOLERANCE_M:.0f} m of MOLA's own grid in the shipped map, which is the right way up and round")
    return 0


if __name__ == "__main__":
    sys.exit(main())
