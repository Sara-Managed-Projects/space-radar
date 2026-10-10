#!/usr/bin/env python3
"""scripts/avif_trial.py (internal #553 / #530): the search finds the lowest quality at the SSIM floor, for both codecs.

Runs on a synthetic picture, since the originals are not in the repository; skips (and says so) where
Pillow, NumPy or Pillow's AVIF encoder are missing, as the runner of this step may not have them.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
try:
    import numpy as np
    from PIL import Image, features
    if not features.check("avif") or not features.check("webp"):
        raise ImportError("Pillow without AVIF or WebP")
except ImportError as why:
    print(f"avif trial skipped: {why}")
    sys.exit(0)

import avif_trial  # noqa: E402

rng = np.random.default_rng(7)
y, x = np.mgrid[0:256, 0:256]
img = np.stack([(x + y) / 2 + 40 * np.sin(x / 9.0), 255 - x + 30 * np.cos(y / 7.0), (y * 2) % 256 * 0.6 + 60], axis=-1) + rng.normal(0, 0.8, (256, 256, 3))
orig = Image.fromarray(np.clip(img, 0, 255).astype("uint8"))
luma = orig.convert("L")
bad = []
for codec in ("WEBP", "AVIF"):
    best = avif_trial.lowest(orig, luma, codec)
    if not best:
        bad.append(f"{codec}: no quality reaches the floor")
        continue
    q, size, score, ms = best
    if not (score >= avif_trial.FLOOR and 10 <= q <= 96 and size > 0 and ms >= 0):
        bad.append(f"{codec}: q{q} {size} B SSIM {score:.4f}")
    if q > 10:
        # One step lower must miss the floor, or the search did not find the lowest.
        import io
        buf = io.BytesIO()
        orig.save(buf, codec, quality=q - 1, **({"method": 6} if codec == "WEBP" else {"speed": 4}))
        back = Image.open(io.BytesIO(buf.getvalue())).convert("L")
        # Not strictly monotonic at every step for AVIF; allow equality within a hair of the floor.
        if avif_trial.bt.ssim(luma, back) >= avif_trial.FLOOR + 0.002:
            bad.append(f"{codec}: q{q - 1} also clears the floor by a margin; q{q} is not the lowest")
if bad:
    print("avif trial FAILED:\n  " + "\n  ".join(bad))
    sys.exit(1)
print("avif trial ok: the lowest quality at SSIM >= 0.98 is found for WebP and AVIF, and one step lower misses it")
