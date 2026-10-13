#!/usr/bin/env python3
"""Mars's heights, from the laser altimeter: site/textures/1k_mars_height.webp and 2k_mars_relief.webp.

WHAT THEY ARE MADE FROM. The Mars Orbiter Laser Altimeter's gridded topography (Mars Global
Surveyor; MOLA Mission Experiment Gridded Data Record, data set MGS-M-MOLA-5-MEGDR-L3-V1.0), the
team's own 16-pixels-a-degree grid:

    https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.img
    (33 177 600 bytes: 5760 x 2880 big-endian signed 16-bit metres above the areoid, rows from
    90 N, columns from longitude 0 eastward; label megt90n000eb.lbl beside it)

It is the grid the USGS's 463 m global DEM (2 GB, not fetched) is the 128-pixels-a-degree sibling
of; that product's page gives "Access Constraints: CC0 (public domain)", and "Data sets archived
in the PDS are in the public domain." (PDS Geosciences Node FAQ, read 2026-10-12.) The label:
"The minimum and maximum topography observations for the entire data set are -8177 and 21171
meters."

TWO MAPS, each one grey channel, centred on longitude 0 like the colour map over them:

  1k_mars_height.webp   1024 x 512. The height itself: byte = (h - HEIGHT_MIN_M) / (HEIGHT_MAX_M - HEIGHT_MIN_M) x 255,
                        115.7 m a step. The shader marches toward the Sun in it to find what
                        stands in the light's way (scene/worlds.js: the cast shadow), and
                        tests/test_mars_heights.py reads four named places in it.
  2k_mars_relief.webp   1536 x 768. LOCAL relief, as Mercury's (scripts/build-textures.py build_mercury_relief
                        says why): the height less itself blurred over RELIEF_BLUR_DEG, clipped to
                        +-RELIEF_RANGE_M, 128 = level ground. The shader takes the SLOPE from this
                        one, by two differences; a byte of the whole range would leave 116 m a
                        step and draw the plains as terraces.

WHY NOT 2048 AND 4096. The GPU budget (registry/budgets.yaml tier1_texture_gpu_mib, 250 MiB) had
2.7 MiB left on 2026-10-12, and tests/test_texture_budget.mjs counts every map a card can ask
for at once: these two are 1.5 and 0.67 MiB as one channel each. The shadow march reads the
heights from a mip as coarse as its own steps anyway, and from close up Mars is drawn from the
missions' tiles, which bring their own 200 m relief (registry/tilesets.yaml).

LIMITS, also in the registry rows: the relief is 13.9 km a texel at the equator and the heights
20.8 km, so nothing smaller than a 30 km crater has a rim here; MOLA's tracks are up to 12 km apart at the equator and the grid
interpolates between them; the height map is lossy WebP (the four test places are within
HEIGHT_TOLERANCE_M of the source after it).

Run:  uv run --with numpy --with pillow python scripts/build-mars-relief.py --src PATH/megt90n000eb.img
      (without --src the grid is fetched to a temporary folder after a HEAD that refuses more than
      40 MB)        --check: rebuild in memory and compare with the committed files' bytes
"""
from __future__ import annotations

import argparse
import io
import sys
import tempfile
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "site" / "textures"
SOURCE_URL = "https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.img"
SOURCE_PX = (5760, 2880)
SOURCE_BYTES = SOURCE_PX[0] * SOURCE_PX[1] * 2
MAX_FETCH_BYTES = 40_000_000
HEIGHT_PX = (1024, 512)
RELIEF_PX = (1536, 768)

# What the height byte spans: a little outside the data's own -8177 and 21171 m.
HEIGHT_MIN_M = -8200.0
HEIGHT_MAX_M = 21300.0
HEIGHT_QUALITY = 98
HEIGHT_TOLERANCE_M = 400.0
# Local relief: what is broader than this is taken out, and the rest clipped to +- this.
RELIEF_BLUR_DEG = 6.0
RELIEF_RANGE_M = 4000.0
RELIEF_QUALITY = 80

# Four places (the cap is read twice: its top and the plain it stands on), read from the SOURCE grid
# by this script and then held on the shipped file by tests/test_mars_heights.py. A 20 km texel
# averages a narrow extreme: Hellas's deepest point is a small crater on its floor, and the file's
# deepest texel there is some 300 m above it.
# (name, latitude, east longitude, half-window in degrees, which statistic of the window).
PLACES = (
    ("Olympus Mons, the summit", 17.3, 227.0, 0.6, "max"),
    ("Hellas, the deepest floor", -32.8, 62.2, 1.0, "min"),
    # Where Coprates is widest, in its east: further west the floor is three texels across and the
    # walls bleed into it (at 13.0 S, 298.0 E the source says -5017 m and a 1024-wide map -4100).
    ("Valles Marineris, the floor of Coprates Chasma", -14.0, 302.0, 0.3, "mean"),
    ("the north polar cap, near its top", 88.0, 0.0, 0.5, "median"),
    ("the plain round the north polar cap", 78.0, 0.0, 0.5, "median"),
)


def read_grid(path: Path):
    if path.stat().st_size != SOURCE_BYTES:
        raise SystemExit(f"{path} is {path.stat().st_size} bytes, not the {SOURCE_BYTES} the label says")
    return np.fromfile(path, dtype=">i2").reshape(SOURCE_PX[1], SOURCE_PX[0]).astype(np.float32)


def window(a, lat, lon_e, half_deg, centre_lon_deg):
    """The texels of an equirectangular map `a` within half_deg of a place. centre_lon_deg: the longitude at the middle column."""
    h, w = a.shape
    row = (90.0 - lat) / 180.0 * h
    col = ((lon_e - centre_lon_deg + 180.0) % 360.0) / 360.0 * w
    dr = max(1, int(round(half_deg / 180.0 * h)))
    dc = max(1, int(round(half_deg / 360.0 * w / max(np.cos(np.radians(lat)), 0.05))))
    rows = np.clip(np.arange(int(row) - dr, int(row) + dr + 1), 0, h - 1)
    cols = np.arange(int(col) - dc, int(col) + dc + 1) % w
    return a[np.ix_(rows, cols)]


def stat(a, how):
    return float({"max": np.max, "min": np.min, "median": np.median, "mean": np.mean}[how](a))


def blur_wrapped(height, sigma_px):
    """A Gaussian of the same width on the ground at every latitude: wrapped east-west, widened toward the poles."""
    h, w = height.shape
    k = np.arange(-int(3 * sigma_px), int(3 * sigma_px) + 1)
    g = np.exp(-0.5 * (k / sigma_px) ** 2)
    g /= g.sum()
    vert = np.apply_along_axis(lambda c: np.convolve(np.pad(c, len(k), mode="edge"), g, mode="same")[len(k):-len(k)], 0, height)

    def rows(a, s):
        kk = np.arange(-int(3 * s), int(3 * s) + 1)
        gg = np.exp(-0.5 * (kk / s) ** 2)
        gg /= gg.sum()
        reps = int(np.ceil(len(kk) / a.shape[1])) + 1
        pad = np.concatenate([a] * (2 * reps + 1), axis=1)
        out = np.apply_along_axis(lambda r: np.convolve(r, gg, mode="same"), 1, pad)
        return out[:, reps * a.shape[1]:(reps + 1) * a.shape[1]]

    lat = (0.5 - (np.arange(h) + 0.5) / h) * np.pi
    broad = np.empty_like(vert)
    for band in range(0, h, 32):
        c = max(float(np.cos(lat[band:band + 32]).mean()), 0.12)
        broad[band:band + 32] = rows(vert[band:band + 32], sigma_px / c)
    return broad


def webp(byte, quality) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(byte, mode="L").save(buf, format="WEBP", quality=quality, method=6)
    return buf.getvalue()


def build(src: Path):
    grid = read_grid(src)
    # Longitude 0 to the middle column, then down to each map's size as floats (Lanczos).
    centred = np.roll(grid, SOURCE_PX[0] // 2, axis=1)
    height = np.asarray(Image.fromarray(centred, mode="F").resize(HEIGHT_PX, Image.LANCZOS), dtype=np.float32)
    height_byte = np.clip(np.round((height - HEIGHT_MIN_M) / (HEIGHT_MAX_M - HEIGHT_MIN_M) * 255.0), 0, 255).astype(np.uint8)
    height_file = webp(height_byte, HEIGHT_QUALITY)
    fine = np.asarray(Image.fromarray(centred, mode="F").resize(RELIEF_PX, Image.LANCZOS), dtype=np.float32)
    local = fine - blur_wrapped(fine, RELIEF_BLUR_DEG / 360.0 * RELIEF_PX[0])
    clipped = float((np.abs(local) > RELIEF_RANGE_M).mean())
    relief_byte = np.clip(np.round(128 + local / RELIEF_RANGE_M * 127), 1, 255).astype(np.uint8)
    relief_file = webp(relief_byte, RELIEF_QUALITY)
    # What the browser will read back: the height file decoded, in metres.
    back = np.asarray(Image.open(io.BytesIO(height_file)).convert("L"), dtype=np.float32) / 255.0 * (HEIGHT_MAX_M - HEIGHT_MIN_M) + HEIGHT_MIN_M
    lines = [f"source grid: {grid.min():.0f} to {grid.max():.0f} m; at {HEIGHT_PX[0]} x {HEIGHT_PX[1]}: {height.min():.0f} to {height.max():.0f} m",
             f"height file: {len(height_file):,d} bytes, {(HEIGHT_MAX_M - HEIGHT_MIN_M) / 255:.1f} m a step, rms error after WebP {float(np.sqrt(np.mean((back - height) ** 2))):.0f} m",
             f"relief file: {len(relief_file):,d} bytes, local relief rms {local.std():.0f} m, {clipped * 100:.2f} % beyond +-{RELIEF_RANGE_M:.0f} m"]
    worst = 0.0
    for name, lat, lon, half, how in PLACES:
        s = stat(window(grid, lat, lon, half, 180.0), how)
        f = stat(window(back, lat, lon, half, 0.0), how)
        worst = max(worst, abs(s - f))
        lines.append(f"{name} ({lat} N, {lon} E, {how} within {half} deg): source {s:.0f} m, shipped file {f:.0f} m")
    return height_file, relief_file, lines, worst


def fetch(to: Path) -> Path:
    req = urllib.request.Request(SOURCE_URL, method="HEAD")
    with urllib.request.urlopen(req, timeout=60) as res:
        size = int(res.headers.get("Content-Length") or 0)
    if not 0 < size <= MAX_FETCH_BYTES:
        raise SystemExit(f"{SOURCE_URL} says it is {size} bytes: refusing (the grid is 33 MB)")
    with urllib.request.urlopen(SOURCE_URL, timeout=600) as res, open(to, "wb") as fh:
        while True:
            chunk = res.read(1 << 20)
            if not chunk:
                break
            fh.write(chunk)
    return to


def main(argv) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--src", type=Path, help="megt90n000eb.img, already downloaded")
    ap.add_argument("--out-dir", type=Path, default=OUT_DIR)
    ap.add_argument("--check", action="store_true", help="compare with the committed files instead of writing them")
    args = ap.parse_args(argv)
    with tempfile.TemporaryDirectory() as tmp:
        height_file, relief_file, lines, worst = build(args.src or fetch(Path(tmp) / "megt90n000eb.img"))
    for line in lines:
        print("  " + line)
    if worst > HEIGHT_TOLERANCE_M:
        print(f"a named place is {worst:.0f} m from the source in the shipped file: over {HEIGHT_TOLERANCE_M:.0f}")
        return 1
    outs = ((args.out_dir / "1k_mars_height.webp", height_file), (args.out_dir / "2k_mars_relief.webp", relief_file))
    if args.check:
        same = all(p.exists() and p.read_bytes() == b for p, b in outs)
        print("the committed maps are what the grid makes" if same else "the committed maps are not what the grid makes (a different libwebp will differ: compare the numbers above)")
        return 0 if same else 1
    for p, b in outs:
        p.write_bytes(b)
        print(f"wrote {p.name}: {len(b):,d} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
