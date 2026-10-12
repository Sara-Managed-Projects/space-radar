#!/usr/bin/env python3
"""Bake one whole-sky picture per band of registry/otherlight.yaml from the survey's HiPS tiles.

    python3 scripts/build_otherlight.py [--only=<id>] [--cache=<dir>]   fetch and bake (numpy, Pillow)
    python3 scripts/build_otherlight.py --check                         files present and inside the budget
    python3 scripts/build_otherlight.py --orientations=<id>             print the seam measure of all eight

WHAT IT READS. `<base>/Norder3/Allsky.<format>`: the HiPS standard's preview of order 3, all 768
tiles in one picture, 27 to a row, each 64 pixels wide. That is a HEALPix map of nside 512 (6.9
arcminutes a pixel), which is what a 2048 x 1024 picture of the sky can hold.

WHAT IT WRITES. site/images/otherlight/<id>.webp: equirectangular in EQUATORIAL J2000, right
ascension 0 at the left edge and increasing to the right, declination +90 at the top. A survey cut
in Galactic axes is turned here, once, so the browser never needs to. Baked at 4096 x 2048 by
nearest tile pixel, then reduced with Lanczos.

HOW A TILE'S PICTURE LIES IN ITS DIAMOND is measured, not assumed: `--orientations` bakes a small
sky in each of the eight ways a square can be laid and prints the mean step between neighbouring
pixels. One of them has no seams (2026-10-06, AllWISE: 5.24 against 5.42 to 5.59 for the other
seven, and only that one puts the Galactic centre at 17h46m -29, Andromeda at 0h43m +41 and the
Large Magellanic Cloud at 5h24m -70): the picture's columns run along HEALPix's y and its rows,
from the top, along HEALPix's x. site/js/sky/hips.js draws its streamed tiles with the same rule.
"""
from __future__ import annotations

import sys
import tempfile
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
REG = ROOT / "registry/otherlight.yaml"
BUDGETS = ROOT / "registry/budgets.yaml"
W, H = 2048, 1024
ORIENTATION = 4

# Equatorial J2000 -> Galactic (Hipparcos, ESA SP-1200 vol. 1, eq. 1.5.11).
EQ_TO_GAL = [[-0.0548755604, -0.8734370902, -0.4838350155],
             [0.4941094279, -0.4448296300, 0.7469822445],
             [-0.8676661490, -0.1980763734, 0.4559837762]]


def budget(name: str) -> int:
    for row in yaml.safe_load(BUDGETS.read_text())["budgets"]:
        if row["id"] == name:
            return int(row["value"])
    raise SystemExit(f"registry/budgets.yaml has no {name}")


def check(bands: list) -> int:
    each = budget("otherlight_sky_bytes")
    bad = 0
    for b in bands:
        p = ROOT / b["file"]
        if not p.exists():
            print(f"build_otherlight: {b['file']} is missing (python3 scripts/build_otherlight.py --only={b['id']})")
            bad += 1
        elif p.stat().st_size > each:
            print(f"build_otherlight: {b['file']} is {p.stat().st_size} B, over otherlight_sky_bytes ({each})")
            bad += 1
    if not bad:
        print(f"build_otherlight: {len(bands)} skies, each inside {each} B")
    return 1 if bad else 0


def dir_to_fxy(np, d):
    """HEALPix base tile and the place in it (healpix_base.cc loc2pix, continuous)."""
    x, y, z = d[..., 0], d[..., 1], d[..., 2]
    za = np.abs(z)
    tt = np.minimum((np.arctan2(y, x) % (2 * np.pi)) / (np.pi / 2), 3.9999999)
    jp, jm = 0.5 + tt - z * 0.75, 0.5 + tt + z * 0.75
    ifp, ifm = np.floor(jp).astype(int), np.floor(jm).astype(int)
    face_e = np.where(ifp == ifm, (ifp & 3) | 4, np.where(ifp < ifm, ifp & 3, (ifm & 3) + 8))
    x_e, y_e = jm - ifm, 1 - (jp - ifp)
    ntt = np.minimum(3, np.floor(tt)).astype(int)
    tp = tt - ntt
    tmp = np.sqrt(3 * (1 - za))
    jpp, jmp = np.minimum(tp * tmp, 0.9999999), np.minimum((1 - tp) * tmp, 0.9999999)
    face_p = np.where(z >= 0, ntt, ntt + 8)
    x_p, y_p = np.where(z >= 0, 1 - jmp, jpp), np.where(z >= 0, 1 - jpp, jmp)
    eq = za <= 2 / 3
    clip = lambda a: np.clip(a, 0, 0.9999999)  # noqa: E731
    return np.where(eq, face_e, face_p), clip(np.where(eq, x_e, x_p)), clip(np.where(eq, y_e, y_p))


def spread(np, v):
    out = np.zeros_like(v)
    for b in range(12):
        out |= ((v >> b) & 1) << (2 * b)
    return out


ORIENTATIONS = [lambda a, b: (a, b), lambda a, b: (1 - a, b), lambda a, b: (a, 1 - b), lambda a, b: (1 - a, 1 - b),
                lambda a, b: (b, a), lambda a, b: (1 - b, a), lambda a, b: (b, 1 - a), lambda a, b: (1 - b, 1 - a)]


def bake(np, allsky, w: int, h: int, frame: str, orientation: int = ORIENTATION):
    tw = allsky.shape[1] // 27
    ra = (np.arange(w) + 0.5) / w * 2 * np.pi
    dec = (0.5 - (np.arange(h) + 0.5) / h) * np.pi
    ra, dec = np.meshgrid(ra, dec)
    d = np.stack([np.cos(dec) * np.cos(ra), np.cos(dec) * np.sin(ra), np.sin(dec)], -1)
    if frame == "galactic":
        d = d @ np.array(EQ_TO_GAL).T
    f, x, y = dir_to_fxy(np, d)
    ix, iy = np.floor(x * 8).astype(int), np.floor(y * 8).astype(int)
    npix = f * 64 + spread(np, ix) + 2 * spread(np, iy)
    u, v = ORIENTATIONS[orientation](x * 8 - ix, y * 8 - iy)
    col = (npix % 27) * tw + np.clip((u * tw).astype(int), 0, tw - 1)
    row = (npix // 27) * tw + np.clip((v * tw).astype(int), 0, tw - 1)
    return allsky[row, col]


def allsky_of(b: dict, cache: Path):
    import numpy as np
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    cache.mkdir(parents=True, exist_ok=True)
    src = cache / f"{b['id']}-allsky.{b['format']}"
    if not src.exists():
        url = f"{b['base']}/Norder3/Allsky.{b['format']}"
        print("fetching", url)
        req = urllib.request.Request(url, headers={"User-Agent": "space-radar build_otherlight.py"})
        src.write_bytes(urllib.request.urlopen(req, timeout=180).read())
    im = Image.open(src)
    if im.mode == "RGBA":  # no coverage is no light
        bg = Image.new("RGB", im.size, (0, 0, 0))
        bg.paste(im, mask=im.split()[3])
        im = bg
    return np, Image, np.asarray(im.convert("RGB"))


def main() -> int:
    args = sys.argv[1:]
    bands = yaml.safe_load(REG.read_text())["bands"]
    if "--check" in args:
        return check(bands)
    only = next((a.split("=", 1)[1] for a in args if a.startswith("--only=")), None)
    probe = next((a.split("=", 1)[1] for a in args if a.startswith("--orientations=")), None)
    cache = Path(next((a.split("=", 1)[1] for a in args if a.startswith("--cache=")), str(Path(tempfile.gettempdir()) / "otherlight-cache")))
    for b in bands:
        if (only or probe) and b["id"] != (only or probe):
            continue
        np, Image, a = allsky_of(b, cache)
        if probe:
            for o in range(8):
                s = bake(np, a.astype("int16"), 1024, 512, b["frame"], o)
                print(o, round(float(np.abs(np.diff(s, axis=1)).mean() + np.abs(np.diff(s, axis=0)).mean()), 3))
            continue
        out = ROOT / b["file"]
        out.parent.mkdir(parents=True, exist_ok=True)
        im = Image.fromarray(bake(np, a, W * 2, H * 2, b["frame"])).resize((W, H), Image.LANCZOS)
        im.save(out, quality=int(b.get("quality", 78)), method=6)
        print(f"{b['file']}: {out.stat().st_size} B")
    return 0 if probe else check(bands if not only else [b for b in bands if b["id"] == only])


if __name__ == "__main__":
    sys.exit(main())
