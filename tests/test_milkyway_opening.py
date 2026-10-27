#!/usr/bin/env python3
"""The Milky Way shader's spike cut (sky/groundsky.js MW_FRAG, internal #547), run in NumPy on the real 2k panorama.

The shader cuts a texel to the mean of its four neighbours three texels away plus 0.015. The 2k panorama has
the stars baked in; at a 14 degree field they were soft tilted squares beside Sirius and Mirzam. This holds
what the maths must do to the real map: the brightest texels (the baked stars) lose nearly all their light and
the smooth glow keeps nearly all of it. Skips without NumPy or Pillow. Measured 2026-10-10: the brightest 300
texels 0.682 -> 0.027, the smooth glow 96 % kept (a plain minimum of five kept 74 % and went blank).
"""
import sys
from pathlib import Path

try:
    import numpy as np
    from PIL import Image
except ImportError as why:
    print(f"milky way opening skipped: {why}")
    sys.exit(0)

ROOT = Path(__file__).resolve().parent.parent
im = np.asarray(Image.open(ROOT / "site/textures/2k_stars_milky_way.webp").convert("RGB"), dtype=np.float64) / 255


def sh(a, dx, dy):
    return np.roll(np.roll(a, dx, axis=1), dy, axis=0)


def cut(c, k=3, tol=0.015):
    n = sh(c, k, 0) + sh(c, -k, 0) + sh(c, 0, k) + sh(c, 0, -k)
    return np.minimum(c, 0.25 * n + tol)


lum = lambda a: np.maximum(a - 0.012, 0).mean(axis=2)
before, after = lum(im), lum(cut(im))
bad = []
top = np.argsort(before.ravel())[-300:]
tb, ta = before.ravel()[top].mean(), after.ravel()[top].mean()
if not (tb > 0.3 and ta < 0.1 * tb):
    bad.append(f"the baked stars keep too much: {tb:.3f} -> {ta:.3f}")
mx = np.maximum.reduce([sh(before, i, j) for i in range(-3, 4) for j in range(-3, 4)])
mn = np.minimum.reduce([sh(before, i, j) for i in range(-3, 4) for j in range(-3, 4)])
flat = (before > 0.02) & ((mx - mn) < 0.04)
kept = after[flat].mean() / before[flat].mean()
if flat.sum() < 1000 or kept < 0.9:
    bad.append(f"the smooth glow is not kept: {kept:.2f} over {flat.sum()} texels")
if bad:
    print("milky way opening FAILED:\n  " + "\n  ".join(bad))
    sys.exit(1)
print(f"milky way opening ok: the 300 brightest texels (baked stars) {tb:.3f} -> {ta:.3f}; the smooth glow {100 * kept:.0f} % kept over {int(flat.sum())} texels")
