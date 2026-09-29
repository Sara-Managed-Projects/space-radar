#!/usr/bin/env python3
"""Build the 4k texture tier (registry/textures.yaml, tier 1) from the originals it names.

2026-09-28. The 2k set every visitor boots with is untouched; this makes the sharper maps a laptop or
a desktop swaps in after the first frame (site/js/scene/texturetiers.js). Every output is written
under site/textures/4k/ and every one is a NEW name, so a deploy needs no invalidation for them.

Run (never in CI -- it needs Pillow, NumPy and OpenEXR, and 250 MB of originals):
    python3 scripts/build-textures.py --originals DIR [--only earth-day,milky-way,...]

DIR holds the files registry/textures.yaml lists under `original:` (their URLs are there too), by
the basename given here in ORIGINALS. Nothing downloaded is committed; only what ships is.

WHY EACH MAP IS TREATED AS IT IS
  earth-day   Blue Marble Next Generation (NASA Earth Observatory), one map per month of 2004, so the
              snow line and the green of the land follow the clock's month. BMNG as published is a
              DARK Earth -- deep ocean near (2, 5, 20) -- while the Solar System Scope map the site
              boots with was graded brighter from the same data (its land correlates 0.95 with BMNG
              June, measured). A laptop swaps the 4k map in a second after the 2k one, in front of
              the visitor, so the 4k map is graded to the 2k one's colours: a 32-cube colour table
              per surface (land, water, split by the real water mask), fitted on June against the
              2k map and applied unchanged to all twelve months. The swap then adds detail and the
              season, not a different planet. The physical-lighting PR is where the grade is revisited.
  earth-water The Solar System Scope 8k specular map is a land/water mask (white = water, lakes
              included), registered to BMNG to the pixel (agreement peaks at 0 px offset, measured).
              Box-filtered to 4k so a coast pixel carries the fraction of it that is water.
  earth-night Black Marble 2016, the GREYSCALE map (NASA Earth Observatory, 13500 x 6750): lights only,
              no moonlit ground, which the colour map carries and the shader would read as city light. The
              shader reads only the brightness. Its levels are matched to the 2k night map's by
              quantile, so the night gain the shader was tuned with still holds.
  milky-way   NASA SVS Deep Star Maps 2020, the Milky Way BACKGROUND (Gaia DR2, with the Hipparcos and
              Tycho stars left out, because the app draws its own 5 044 stars on top). Galactic frame.
              Flipped top to bottom into the convention the 2k Solar System Scope map uses (galactic
              north at the BOTTOM of the image; scene/starfield.js says how that was found), and its
              brightness distribution matched to the 2k map's, so the backdrop stays "a whisper".
  moon, mars, mercury, jupiter
              Solar System Scope's own 8k maps (Jupiter's is 4096 wide already) resampled to 4096 x
              2048: the same pictures as the 2k maps, so nothing changes but the detail. Saturn,
              Uranus, Neptune, Venus and the Sun are left at 2k: their larger maps carry no detail
              the 2k ones lack (Saturn's "8k" is 4096 wide and differs from its own 2k upsample by
              0.57 grey levels RMS, measured).
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "textures" / "4k"
W, H = 4096, 2048

ORIGINALS = {
    "bmng": "bm_base_{mm}.jpg",                    # world.2004MM.3x5400x2700.jpg
    "mask": "sss_8k_earth_specular_map.tif",
    "night": "blackmarble_2016_3km_gray.jpg",       # BlackMarble_2016_3km_gray.jpg, lights only
    "milky": "svs_milkyway_2020_4k_gal.exr",
    "moon": "sss_8k_moon.jpg",
    "mars": "sss_8k_mars.jpg",
    "mercury": "sss_8k_mercury.jpg",
    "jupiter": "sss_8k_jupiter.jpg",
}

# WebP quality per map, chosen by eye on close-ups (2026-09-28) and by the bytes they cost.
MONTHS: list[int] = []  # --months 9 builds one, for looking at
Q = {"day": 86, "night": 80, "milky": 90, "planet": 84, "dense": 72}
# The Moon's and Mercury's maps are crater fields to the pixel: at 84 they cost 2.5 and 2.2 MB; at 72,
# 1.8 MB, with no difference visible on a disc filling a 1440 x 900 screen.
DENSE = {"moon", "mercury"}


def lazy():
    global Image, np
    from PIL import Image  # noqa: F401
    import numpy as np  # noqa: F401
    Image.MAX_IMAGE_PIXELS = None


def save_webp(img, path: Path, q: int, lossless: bool = False) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=q, method=6, lossless=lossless)
    return path.stat().st_size


def water_mask(orig: Path, w: int, h: int):
    m = Image.open(orig / ORIGINALS["mask"]).convert("L")
    return np.asarray(m.resize((w, h), Image.BOX), dtype=np.float32) / 255.0


# --- earth day ---------------------------------------------------------------------------------

def fit_grade(orig: Path):
    """Two 32^3 colour tables (land, water) taking BMNG June to the shipped 2k day map."""
    sss = np.asarray(Image.open(ROOT / "site/textures/2k_earth_daymap.jpg").convert("RGB"), dtype=np.float64)
    bm = np.asarray(Image.open(orig / ORIGINALS["bmng"].format(mm="06")).convert("RGB")
                    .resize((2048, 1024), Image.BOX), dtype=np.float64)
    mask = water_mask(orig, 2048, 1024)
    n = 32

    def fit(sel):
        src, dst = bm[sel], sss[sel]
        idx = np.clip((src / 256 * n).astype(int), 0, n - 1)
        flat = idx[:, 0] * n * n + idx[:, 1] * n + idx[:, 2]
        cnt = np.bincount(flat, minlength=n ** 3).astype(float)
        mean = np.stack([np.bincount(flat, weights=dst[:, k], minlength=n ** 3) for k in range(3)], 1)
        # A per-channel curve for the bins the data never visits, and to steady the thin ones.
        curves = []
        for k in range(3):
            v = src[:, k].astype(int)
            c = np.bincount(v, minlength=256).astype(float)
            t = np.bincount(v, weights=dst[:, k], minlength=256)
            xs = np.nonzero(c > 20)[0]
            curves.append(np.maximum.accumulate(np.interp(np.arange(256), xs, t[xs] / c[xs])))
        centres = (np.stack(np.unravel_index(np.arange(n ** 3), (n, n, n)), 1) + 0.5) * 256 / n
        fb = np.stack([np.interp(centres[:, k], np.arange(256), curves[k]) for k in range(3)], 1)
        trust = (cnt / (cnt + 30))[:, None]
        table = np.where(cnt[:, None] > 0, mean / np.maximum(cnt, 1)[:, None], fb) * trust + fb * (1 - trust)
        return table.reshape(n, n, n, 3)

    return fit(mask < 0.05), fit(mask > 0.95)


def dense(table):
    """The 32-cube resampled trilinearly to 128^3, so applying it is one lookup per pixel."""
    n = table.shape[0]
    g = (np.arange(128) * 2 + 1) / 256 * n - 0.5
    g = np.clip(g, 0, n - 1 - 1e-6)
    i0 = np.floor(g).astype(int)
    f = (g - i0).astype(np.float32)
    i1 = np.minimum(i0 + 1, n - 1)
    out = np.zeros((128, 128, 128, 3), np.float32)
    for dr in (0, 1):
        ir = (i1 if dr else i0)[:, None, None]
        wr = (f if dr else 1 - f)[:, None, None]
        for dg in (0, 1):
            ig = (i1 if dg else i0)[None, :, None]
            wg = (f if dg else 1 - f)[None, :, None]
            for db in (0, 1):
                ib = (i1 if db else i0)[None, None, :]
                wb = (f if db else 1 - f)[None, None, :]
                out += table[ir, ig, ib] * (wr * wg * wb)[..., None]
    return out


def build_earth_day(orig: Path, report: dict) -> None:
    land, water = fit_grade(orig)
    L, Wt = dense(land), dense(water)
    mask = water_mask(orig, W, H)[..., None]
    for mm in MONTHS or range(1, 13):
        src = Image.open(orig / ORIGINALS["bmng"].format(mm=f"{mm:02d}")).convert("RGB").resize((W, H), Image.LANCZOS)
        px = np.asarray(src)
        a = px >> 1
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        # Near a coast the pixel's own colour says which table. BMNG's coastline and the mask's
        # differ by a pixel here and there, and a dark half-water pixel run through the LAND table
        # comes out as bright "forest": blending the two tables by the mask alone painted a yellow
        # rim round every Greek island (2026-09-28). So within two pixels of any water, a pixel that
        # is dark and not redder than blue counts as water in proportion.
        m0 = mask[..., 0]
        near = m0 > 0.02
        for dy in (-2, -1, 0, 1, 2):
            for dx in (-2, -1, 0, 1, 2):
                near = near | np.roll(np.roll(m0 > 0.02, dy, 0), dx, 1)
        coast = near & (m0 < 0.98)
        f = px.astype(np.float32)
        lum = f @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        waterlike = np.clip((40 - lum) / 20, 0, 1) * np.clip((f[..., 2] - f[..., 0] + 4) / 8, 0, 1)
        w = m0.copy()
        w[coast] = np.maximum(m0[coast], waterlike[coast])
        w = w[..., None]
        out = L[r, g, b] * (1 - w) + Wt[r, g, b] * w
        img = Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))
        name = f"earth_day_{mm:02d}.webp"
        report[name] = save_webp(img, OUT / name, Q["day"])


def build_earth_water(orig: Path, report: dict) -> None:
    m = water_mask(orig, W, H)
    img = Image.fromarray(np.clip(m * 255 + 0.5, 0, 255).astype(np.uint8)).convert("L")
    report["earth_water.webp"] = save_webp(img, OUT / "earth_water.webp", 100, lossless=True)


# --- earth night -----------------------------------------------------------------------------

def match_levels(src, ref, lo_keep: float = 0.0):
    """Monotone curve taking src's value distribution onto ref's, by quantile (both 0..255)."""
    qs = np.linspace(0, 100, 1001)
    s = np.percentile(src, qs)
    r = np.percentile(ref, qs)
    s, idx = np.unique(s, return_index=True)
    return lambda x: np.interp(x, s, r[idx])


def build_earth_night(orig: Path, report: dict) -> None:
    big = Image.open(orig / ORIGINALS["night"]).convert("L").resize((W, H), Image.LANCZOS)
    a = np.asarray(big, dtype=np.float32)
    ref = np.asarray(Image.open(ROOT / "site/textures/2k_earth_nightmap.webp").convert("L"), dtype=np.float32)
    small = np.asarray(big.resize((2048, 1024), Image.BOX), dtype=np.float32)
    curve = match_levels(small.ravel(), ref.ravel())
    img = Image.fromarray(np.clip(curve(a) + 0.5, 0, 255).astype(np.uint8)).convert("L")
    report["earth_night.webp"] = save_webp(img, OUT / "earth_night.webp", Q["night"])


# --- milky way --------------------------------------------------------------------------------

def build_milky_way(orig: Path, report: dict) -> None:
    import OpenEXR
    part = OpenEXR.File(str(orig / ORIGINALS["milky"])).parts[0]
    rgb = np.asarray(part.channels["RGB"].pixels, dtype=np.float32)
    if rgb.shape[:2] != (H, W):
        rgb = np.stack([np.asarray(Image.fromarray(rgb[..., k]).resize((W, H), Image.BOX)) for k in range(3)], -1)
    rgb = rgb[::-1]  # galactic north to the bottom: the 2k map's convention (scene/starfield.js)
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    ref = np.asarray(Image.open(ROOT / "site/textures/2k_stars_milky_way.webp").convert("RGB"), dtype=np.float32)
    ref_lum = ref @ np.array([0.2126, 0.7152, 0.0722], np.float32)   # encoded 0..255
    small = np.asarray(Image.fromarray(lum).resize((2048, 1024), Image.BOX))
    curve = match_levels(small.ravel(), ref_lum.ravel())
    # Then lifted a little (exponent 0.85 on the encoded level): matched exactly, the faint glow off
    # the plane sits at 0-3 of 255 and lossy WebP flattens it to black, which was the 2k map's
    # softness all over again. p90 goes from 3 to about 5, p99 from 13 to about 20.
    target = 255.0 * (curve(lum) / 255.0) ** 0.85                      # encoded 0..255
    # Colour from the source, at 60 % saturation: Gaia's colours are "estimated by eye" (SVS), and
    # the 2k map it replaces is nearly grey-blue. The ratio is taken in linear light.
    chroma = rgb / np.maximum(lum, 1e-6)[..., None]
    chroma = 1 + (chroma - 1) * 0.6
    lin_target = (target / 255.0) ** 2.2
    out = np.clip(chroma * lin_target[..., None], 0, 1) ** (1 / 2.2) * 255
    img = Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))
    report["milky_way.webp"] = save_webp(img, OUT / "milky_way.webp", Q["milky"])


# --- planets -----------------------------------------------------------------------------------

def build_planet(orig: Path, key: str, report: dict) -> None:
    img = Image.open(orig / ORIGINALS[key]).convert("RGB")
    if img.size != (W, H):
        img = img.resize((W, H), Image.LANCZOS)
    report[f"{key}.webp"] = save_webp(img, OUT / f"{key}.webp", Q["dense" if key in DENSE else "planet"])


STEPS = {
    "earth-day": build_earth_day,
    "earth-water": build_earth_water,
    "earth-night": build_earth_night,
    "milky-way": build_milky_way,
    "moon": lambda o, r: build_planet(o, "moon", r),
    "mars": lambda o, r: build_planet(o, "mars", r),
    "mercury": lambda o, r: build_planet(o, "mercury", r),
    "jupiter": lambda o, r: build_planet(o, "jupiter", r),
}


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--originals", required=True, type=Path)
    ap.add_argument("--only", default="")
    ap.add_argument("--months", default="")
    args = ap.parse_args(argv)
    lazy()
    MONTHS[:] = [int(m) for m in args.months.split(",") if m]
    only = [s for s in args.only.split(",") if s] or list(STEPS)
    report: dict[str, int] = {}
    for key in only:
        if key not in STEPS:
            print(f"unknown step {key!r}; one of {', '.join(STEPS)}", file=sys.stderr)
            return 2
        STEPS[key](args.originals, report)
        print(f"built {key}")
    for name, size in sorted(report.items()):
        print(f"  4k/{name:24s} {size:>9,d} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
