#!/usr/bin/env python3
"""AVIF against WebP for the four maps every first visit boots with, from the JPEG originals (internal #553 / #530).

    python3 scripts/avif_trial.py --originals DIR      # DIR holds 2k_earth_daymap.jpg, 2k_earth_nightmap.jpg,
                                                        # 2k_earth_clouds.jpg, 2k_stars_milky_way.jpg
    python3 scripts/avif_trial.py --originals DIR --json out.json

The rule is the one scripts/build-textures.py --webp-2k used (spec 0056 req 8): the LOWEST quality whose
luma SSIM against the ORIGINAL is at least 0.98 (same ssim(), imported from there), for each codec, and
AVIF ships for a map only where it is at least 15 % smaller than the WebP. The research of 2026-10-09 had
only the shipped WebPs to start from (a second lossy generation, unfair to AVIF); the JPEGs are the
originals. Prints bytes, quality, SSIM and the time Pillow takes to decode each (a laptop CPU; a browser
decodes AVIF and WebP on its own, and a phone's numbers need a phone). Needs Pillow with AVIF and NumPy.
"""
from __future__ import annotations

import argparse
import importlib.util
import io
import json
import time
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("build_textures", ROOT / "scripts" / "build-textures.py")
bt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bt)
bt.np = np  # build-textures.py imports NumPy only when a step runs

MAPS = ("earth_daymap", "earth_nightmap", "earth_clouds", "stars_milky_way")
FLOOR = bt.SSIM_FLOOR
WIN = 0.15


def lowest(orig, luma, codec: str):
    def at(q):
        buf = io.BytesIO()
        if codec == "WEBP":
            orig.save(buf, "WEBP", quality=q, method=6)
        else:
            orig.save(buf, "AVIF", quality=q, speed=4)
        data = buf.getvalue()
        t = time.perf_counter()
        back = Image.open(io.BytesIO(data)).convert("RGB")
        ms = (time.perf_counter() - t) * 1000
        return data, bt.ssim(luma, back.convert("L")), ms

    lo, hi, best = 10, 96, None
    while lo <= hi:
        q = (lo + hi) // 2
        data, score, ms = at(q)
        if score >= FLOOR:
            best = (q, len(data), score, ms)
            hi = q - 1
        else:
            lo = q + 1
    return best


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--originals", type=Path, required=True)
    ap.add_argument("--json", type=Path)
    args = ap.parse_args()
    rows = []
    for key in MAPS:
        src = args.originals / f"2k_{key}.jpg"
        orig = Image.open(src).convert("RGB")
        luma = orig.convert("L")
        w, a = lowest(orig, luma, "WEBP"), lowest(orig, luma, "AVIF")
        row = {"map": key, "jpeg": src.stat().st_size, "webp": w and {"q": w[0], "bytes": w[1], "ssim": round(w[2], 4), "decode_ms": round(w[3], 1)},
               "avif": a and {"q": a[0], "bytes": a[1], "ssim": round(a[2], 4), "decode_ms": round(a[3], 1)}}
        if w and a:
            row["avif_vs_webp"] = round(a[1] / w[1] - 1, 3)
            row["ships_avif"] = a[1] <= w[1] * (1 - WIN)
        rows.append(row)
        print(f"{key:16s} jpeg {row['jpeg']:>8,d} B | webp q{w[0]} {w[1]:>8,d} B SSIM {w[2]:.4f} decode {w[3]:.0f} ms | avif q{a[0]} {a[1]:>8,d} B SSIM {a[2]:.4f} decode {a[3]:.0f} ms | AVIF {100 * (a[1] / w[1] - 1):+.0f} % -> {'ships' if row['ships_avif'] else 'does not ship'}")
    if args.json:
        args.json.write_text(json.dumps(rows, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
