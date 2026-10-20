#!/usr/bin/env python3
"""The Magellanic Bridge and Stream as neutral hydrogen (internal spec 0077 stage W2-e, internal #783).

    python3 scripts/build_deep_magellanic.py --fits=<hi4pi-hvc-nhi-mag-car.fits.gz>   bake (numpy, PIL, astropy.io.fits)
    python3 scripts/build_deep_magellanic.py --check     the outputs match their manifest and the profile

WHAT IT READS. Westmeier's all-sky map of high-velocity H I from the HI4PI survey (Westmeier 2018, MNRAS 474, 289;
HI4PI Collaboration 2016, A&A 594, A116), the column density in Magellanic coordinates (Nidever et al. 2008: the Stream
along the equator, the LMC at longitude 0), plate carree, 5 arcmin pixels, log10 of N(H I) in cm^-2, as NASA's LAMBDA
serves it (https://lambda.gsfc.nasa.gov/product/foreground/fg_hi4pi_hvhi_info.html; 7.9 MB, not in git). "High
velocity" there is gas whose velocity differs by more than 70 km/s from what the Milky Way's rotation allows on that
line of sight, so the Milky Way's own hydrogen is not in it and the Clouds, the Bridge and the Stream are.

WHAT IT WRITES.
  site/images/deep/magellanic/hi-column.webp   the part of the map between Magellanic longitudes `l_min` and `l_max` and
                                               latitudes `b_min` and `b_max` (registry/deepsky-heroes/smc.yaml, part
                                               `stream`), at `px_deg` pixels a degree, lossless, one channel in green:
                                               (log10 N - `log_min`) / (`log_max` - `log_min`), 0 where there is no gas
  site/images/deep/magellanic/manifest.json    its SHA-256, the input's SHA-256, the frame and the numbers used.
Nothing else is changed: no smoothing beyond the resampling, no gas added.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROFILE = ROOT / "registry" / "deepsky-heroes" / "smc.yaml"
OUT = ROOT / "site" / "images" / "deep" / "magellanic" / "hi-column.webp"
MANIFEST = OUT.with_name("manifest.json")
URL = "https://lambda.gsfc.nasa.gov/data/foregrounds/HI4PI/hvc/hi4pi-hvc-nhi-mag-car.fits.gz"


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def params() -> dict:
    import yaml

    prof = yaml.safe_load(PROFILE.read_text(encoding="utf-8"))
    s = next(l for l in prof["layers"] if l.get("part") == "stream")
    return {k: s["map"][k] for k in ("l_min", "l_max", "b_min", "b_max", "px_deg", "log_min", "log_max")}


def bake(fits_path: Path) -> int:
    import numpy as np
    from astropy.io import fits
    from PIL import Image

    p = params()
    with fits.open(fits_path) as f:
        h = f[0].header
        d = np.nan_to_num(f[0].data.astype(np.float64), nan=0.0)
    # pixel (i, j) 0-based -> (L, B): CRVAL + (i + 1 - CRPIX) CDELT; L decreases with i (CDELT1 < 0)
    n_l = int(round((p["l_max"] - p["l_min"]) * p["px_deg"]))
    n_b = int(round((p["b_max"] - p["b_min"]) * p["px_deg"]))
    L = p["l_max"] - (np.arange(n_l) + 0.5) / p["px_deg"]          # column 0 at l_max (east of the Stream's head on the left)
    B = p["b_max"] - (np.arange(n_b) + 0.5) / p["px_deg"]          # row 0 at b_max (the top)
    fi = (L - h["CRVAL1"]) / h["CDELT1"] + h["CRPIX1"] - 1
    fj = (B - h["CRVAL2"]) / h["CDELT2"] + h["CRPIX2"] - 1
    FI, FJ = np.meshgrid(fi, fj)
    # average the source's pixels in each output pixel (its 5' pixels are finer than ours): area-weighted by a box filter
    k = max(1, int(round(1 / p["px_deg"] / abs(h["CDELT1"]))))
    lin = np.where(d > 0, 10.0 ** d, 0.0)                           # column density itself, averaged, then logged
    if k > 1:
        pad = np.pad(lin, ((k, k), (k, k)), mode="constant")
        c = np.cumsum(np.cumsum(pad, 0), 1)
        def box(y, x):
            y0, x0, y1, x1 = y - k // 2 + k, x - k // 2 + k, y - k // 2 + k + k, x - k // 2 + k + k
            return (c[y1 - 1, x1 - 1] - c[y0 - 1, x1 - 1] - c[y1 - 1, x0 - 1] + c[y0 - 1, x0 - 1]) / (k * k)
        I, J = np.clip(np.round(FI).astype(int), 0, d.shape[1] - 1), np.clip(np.round(FJ).astype(int), 0, d.shape[0] - 1)
        col = box(J, I)
    else:
        col = lin[np.clip(np.round(FJ).astype(int), 0, d.shape[0] - 1), np.clip(np.round(FI).astype(int), 0, d.shape[1] - 1)]
    lg = np.where(col > 0, np.log10(np.maximum(col, 1.0)), 0.0)
    v = np.clip((lg - p["log_min"]) / (p["log_max"] - p["log_min"]), 0, 1)
    v = np.where(col > 0, v, 0.0)
    g8 = (v * 255 + 0.5).astype(np.uint8)
    rgb = np.stack([np.zeros_like(g8), g8, np.zeros_like(g8)], axis=-1)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgb).save(OUT, "WEBP", lossless=True, method=6)
    MANIFEST.write_text(json.dumps({
        "file": str(OUT.relative_to(ROOT)), "bytes": OUT.stat().st_size, "sha256": sha(OUT), "size": [n_l, n_b],
        "from": URL, "from_sha256": sha(fits_path), "params": p,
        "frame": "Magellanic coordinates (Nidever et al. 2008): pole at Galactic (l, b) = (188.5, -7.5) degrees, longitude 0 at (280.47, -32.75); column 0 at l_max, row 0 at b_max",
        "credit": "HI4PI high-velocity H I (Westmeier 2018, MNRAS 474, 289; HI4PI Collaboration 2016, A&A 594, A116), served by NASA's LAMBDA; cropped and resampled by Space Radar (scripts/build_deep_magellanic.py)",
        "peak_log10_nhi": round(float(lg.max()), 3),
    }, indent=2) + "\n", encoding="utf-8")
    print(f"magellanic H I: {OUT.relative_to(ROOT)} {OUT.stat().st_size} B, {n_l} x {n_b}, peak log N {lg.max():.2f}")
    return 0


def check() -> int:
    if not (OUT.exists() and MANIFEST.exists()):
        print("STALE   site/images/deep/magellanic/: run python3 scripts/build_deep_magellanic.py --fits=<file>")
        return 1
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    bad = []
    if m["sha256"] != sha(OUT):
        bad.append("hi-column.webp is not the bake's")
    if m.get("params") != json.loads(json.dumps(params())):
        bad.append("registry/deepsky-heroes/smc.yaml's `stream.map` changed since the bake")
    for b in bad:
        print("STALE   " + b + ": run python3 scripts/build_deep_magellanic.py --fits=<file>")
    if bad:
        return 1
    print(f"magellanic H I ok: {m['bytes']} B from {m['from']}")
    return 0


if __name__ == "__main__":
    if "--check" in sys.argv[1:]:
        sys.exit(check())
    f = next((Path(a.split("=", 1)[1]) for a in sys.argv[1:] if a.startswith("--fits=")), None)
    if not f:
        print(f"REFUSED the bake needs the map: download {URL} (7.9 MB, not in git) and run with --fits=<path>")
        sys.exit(1)
    sys.exit(bake(f))
