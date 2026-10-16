#!/usr/bin/env python3
"""The Ring Nebula hero's light (internal spec 0076 stage W3-b, #872): the Hubble photograph the app
already shows, with its stars taken out, as the emissivity the reconstruction's three layers carry. The same
bake as scripts/build_deep_helix.py (the Helix's), on M57's picture.

    python3 scripts/build_deep_ring.py            bake site/images/deep/ring/ring-light.webp (PIL, numpy)
    python3 scripts/build_deep_ring.py --check    stdlib only: the output and its manifest match the input

WHY. The reconstruction's shape is O'Dell, Ferland, Henney & Peimbert 2013's; its LIGHT is the photograph's.
scene/deep/ring.js spreads this picture along our line of sight through the ring, the lobes and the halo,
so from our side the model is the photograph and turned it is the same structure foreshortened. A star in
the picture is not in the nebula: spread through the lobes it would turn into a streak, so the stars (the
central white dwarf too: the hero draws it itself) are taken out first.

WHAT THE BAKE DOES.
  1. Reads site/images/nebulae/m57.webp (ESA/Hubble heic1310a, NASA, ESA, and C. Robert O'Dell
     (Vanderbilt University), CC BY 4.0; baked by scripts/build_nebulae.py). Nothing is fetched.
  2. Finds the stars: pixels brighter than the 9 x 9 median of their neighbourhood by more than a
     threshold, grown by two pixels.
  3. Fills them with that median (the nebula behind the star, as well as it can be guessed); a second
     pass with a 21 x 21 median takes the wider halos of the bright stars, only round those stars.
  4. Writes WebP and a manifest with both SHA-256s, so --check can say the output is this input's.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "site" / "images" / "nebulae" / "m57.webp"
OUT = ROOT / "site" / "images" / "deep" / "ring" / "ring-light.webp"
MANIFEST = OUT.with_name("manifest.json")


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def bake() -> int:
    import numpy as np
    from PIL import Image, ImageFilter

    im = Image.open(SRC).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    med = np.asarray(im.filter(ImageFilter.MedianFilter(9))).astype(np.float32)
    lum = a.mean(axis=2)
    mlum = med.mean(axis=2)
    star = (lum - mlum) > 18.0
    # grow the mask by two pixels (a star's wings)
    m = Image.fromarray((star * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    mask = np.asarray(m) > 0
    out = a.copy()
    out[mask] = med[mask]
    # A bright star's halo is wider than nine pixels: a second pass with a wider median, only round the
    # stars the first pass found (so the nebula's own filaments elsewhere are left alone).
    near = np.asarray(m.filter(ImageFilter.MaxFilter(13))) > 0
    im2 = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    med2 = np.asarray(im2.filter(ImageFilter.MedianFilter(21))).astype(np.float32)
    halo = near & ((out.mean(axis=2) - med2.mean(axis=2)) > 6.0)
    halo = (np.asarray(Image.fromarray((halo * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0) & near
    out[halo] = med2[halo]
    mask = mask | halo
    OUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(OUT, "WEBP", quality=86, method=6)
    MANIFEST.write_text(json.dumps({
        "file": str(OUT.relative_to(ROOT)), "bytes": OUT.stat().st_size, "sha256": sha(OUT),
        "from": str(SRC.relative_to(ROOT)), "from_sha256": sha(SRC),
        "stars_removed_px": int(mask.sum()), "size": list(im.size),
        # the light's brightest luminance (Rec. 709 weights, display values, 99th percentile): scene/deep/ring.js
        # SHAPE.peak holds a turned view's column to it, so the core never goes whiter than the photograph
        "peak_lum_p99": round(float(np.percentile(np.asarray(Image.open(OUT).convert("RGB")).astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32) / 255.0, 99)), 3),
        "credit": "NASA, ESA, and C. Robert O'Dell (Vanderbilt University) (ESA/Hubble heic1310a), CC BY 4.0; stars removed by Space Radar (scripts/build_deep_ring.py)",
    }, indent=2) + "\n", encoding="utf-8")
    print(f"ring light: {OUT.relative_to(ROOT)} {OUT.stat().st_size} B, {int(mask.sum())} star pixels filled")
    return 0


def check() -> int:
    if not OUT.exists() or not MANIFEST.exists():
        print("STALE   site/images/deep/ring/: run python3 scripts/build_deep_ring.py")
        return 1
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if m.get("sha256") != sha(OUT) or m.get("from_sha256") != sha(SRC):
        print("STALE   site/images/deep/ring/ring-light.webp is not the bake of the current photograph")
        return 1
    print(f"ring light ok: {m['bytes']} B from {m['from']}")
    return 0


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv[1:] else bake())
