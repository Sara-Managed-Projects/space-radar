#!/usr/bin/env python3
"""Titan's radar face and its lakes (internal #863, spec 0077 W1-f).

Two files from ONE public-domain source, the USGS Astrogeology mosaic of every Cassini SAR and HiSAR
swath through flyby T104 (January 2015), 46 080 x 23 040 px, 351 m a pixel, one uncompressed 8-bit
GeoTIFF of 1 061 868 159 B:

    https://planetarymaps.usgs.gov/mosaic/Titan_SAR_HiSAR_MosaicThru_T104_Jan2015_clon180_128ppd.tif
    (page: https://astrogeology.usgs.gov/search/map/titan_cassini_sar_hisar_global_mosaic_351m)

The whole file is not needed and is not downloaded. It is stored one row a strip, uncompressed, so
this script reads its strip table and then two rows for every output row by HTTP range requests
(2 048 rows of 46 080 B, 94 MB), and averages them in linear light.

  site/textures/2k_titan_radar.webp  2048 x 1024 RGBA. The grey is the radar's echo where a swath
        looked and the 2018 ISS infrared map's grey where none did; ALPHA is how much of the texel the
        radar covered, from 128 (none) to 255 (all). scene/worlds.js draws the radar in the face's own grey and the rest
        in Titan's orange, dimmed, so the swaths read as what they are: strips the radar saw. Lossy
        WebP for the grey, lossless alpha.
  site/textures/titan_lakes.webp     2048 x 1024 one grey channel, lossless: the share of each texel
        that is a radar-dark lake or sea, north of 55 N and round Ontario Lacus (72 S). Radar-dark
        is under DARK on the mosaic's 8-bit scale after a box blur of BLUR pixels along the row
        (the speckle is a pixel); a texel's value is the share of its 22.5 x 2 source pixels that
        are dark AND covered. Cassini's radar sees the liquid as black (Lakes of Titan, Wikipedia,
        read 2026-10-20: "smooth regions that appeared dark to radar"); dune fields are dark too,
        which is why only the polar caps are read.

Both are rolled half a turn so longitude 0 is in the middle, like every other moon map here: the
mosaic's centre longitude is 180, and the roll was checked against the ISS map by correlation (0.54
at exactly half a turn, the next best 0.49 a degree off; no mirror image came close).

Usage: python3 scripts/build_titan_maps.py [--cache DIR] [--out site/textures]
"""
import argparse
import concurrent.futures as cf
import struct
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

URL = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Titan_SAR_HiSAR_MosaicThru_T104_Jan2015_clon180_128ppd.tif"
W, H = 46080, 23040
OW, OH = 2048, 1024
DARK = 40          # radar-dark: the seas' floor in the mosaic is 0 to 30, the plains about 130
BLUR = 9           # source pixels along the row, against the speckle
NORTH_FROM = 55.0  # degrees: the lake district
ONTARIO = (-72.0, 183.0, 6.0, 12.0)  # latitude, WEST longitude, half-height and half-width in degrees
ISS = Path(__file__).resolve().parent.parent / "site/textures/2k_titan_cassini_2018.webp"


def rng(a, b):
    req = urllib.request.Request(URL, headers={"Range": f"bytes={a}-{b}"})
    return urllib.request.urlopen(req, timeout=60).read()


def strip_offsets():
    head = rng(0, 65535)
    bo = "<" if head[:2] == b"II" else ">"
    off = struct.unpack(bo + "I", head[4:8])[0]
    n = struct.unpack(bo + "H", head[off:off + 2])[0]
    tags = {}
    for i in range(n):
        tag, typ, cnt, val = struct.unpack(bo + "HHII", head[off + 2 + 12 * i: off + 14 + 12 * i])
        tags[tag] = (typ, cnt, val)
    assert tags[256][2] == W and tags[257][2] == H and tags[258][2] == 8 and tags[259][2] == 1, tags
    so = tags[273][2]
    offs = np.frombuffer(rng(so, so + H * 4 - 1), dtype=bo + "u4").astype(np.int64)
    return offs


def fetch_rows(cache: Path):
    path = cache / "titan_sar_rows.npy"
    if path.exists():
        return np.load(path)
    offs = strip_offsets()
    rows = [min(H - 1, int((i + f) * H / OH)) for i in range(OH) for f in (0.25, 0.75)]

    def get(r):
        for _ in range(5):
            try:
                return np.frombuffer(rng(int(offs[r]), int(offs[r]) + W - 1), dtype=np.uint8)
            except Exception as e:  # a dropped range request: ask again
                err = e
        raise err

    out = np.zeros((len(rows), W), np.uint8)
    with cf.ThreadPoolExecutor(16) as ex:
        for j, a in enumerate(ex.map(get, rows)):
            out[j] = a
    cache.mkdir(parents=True, exist_ok=True)
    np.save(path, out)
    return out


def lin(x):
    x = x / 255.0
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def srgb8(x):
    x = np.clip(x, 0, 1)
    return np.round(255 * np.where(x <= 0.0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - 0.055)).astype(np.uint8)


def bins(a):
    """Sum over the 22.5-pixel bins of the last axis."""
    edges = np.linspace(0, W, OW + 1).astype(int)
    return np.add.reduceat(a, edges[:-1], axis=-1)


def _around(a, op):
    p = np.pad(a, 1, mode="edge")
    return op([np.roll(np.roll(p, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)], 0)[1:-1, 1:-1]


def clean(share):
    """The swaths' seams and the speckle out: a 3 x 3 mean, a soft threshold at a third to three fifths
    dark, then an opening (nothing narrower than three texels, 24 km, is kept) and one texel of margin,
    so a sea's edge stays soft and a seam between two swaths goes."""
    s = _around(share, np.mean)
    m = np.clip((s - 0.3) / 0.3, 0, 1)
    core = _around(_around((m > 0.5).astype(np.float32), np.min), np.max)
    return m * _around(core, np.max)


def build(rows, out: Path):
    pairs = rows.reshape(OH, 2, W)
    valid = pairs > 0
    v = lin(pairs.astype(np.float32)) * valid
    n = bins(valid.sum(1).astype(np.float32))
    total = bins(np.full((OH, W), 2.0, np.float32))
    cover = n / total
    echo = bins(v.sum(1)) / np.maximum(n, 1)

    # The lakes: dark after a blur along the row, and covered.
    c = np.cumsum(np.pad(pairs.astype(np.float32), ((0, 0), (0, 0), (BLUR // 2 + 1, BLUR // 2)), mode="edge"), axis=-1)
    blurred = (c[..., BLUR:] - c[..., :-BLUR]) / BLUR
    dark = (blurred < DARK) & valid
    share = bins(dark.sum(1).astype(np.float32)) / total
    lat = 90 - (np.arange(OH) + 0.5) * 180 / OH
    west = (np.arange(OW) + 0.5) * 360 / OW   # before the roll: the mosaic runs 0..360 west, 180 in the middle
    keep = np.zeros((OH, OW), bool)
    keep[lat >= NORTH_FROM, :] = True
    la, lw, hh, hw = ONTARIO
    keep |= (np.abs(lat[:, None] - la) <= hh) & (np.abs(((west[None, :] - lw + 180) % 360) - 180) <= hw)
    share = np.where(keep, share, 0)
    # A lone dark texel with nothing dark round it is speckle, not a lake.
    pad = np.pad(share, 1, mode="edge")
    near = sum(np.roll(np.roll(pad, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1))[1:-1, 1:-1] - share
    share = np.where(near < 0.6, 0, share)
    share = clean(share)

    # The gaps: the ISS map's own grey, so the orange the shader paints there is the infrared face's.
    iss = np.asarray(Image.open(ISS).convert("L").resize((OW, OH), Image.LANCZOS), np.float32)
    iss = np.roll(iss, OW // 2, axis=1)  # back to the mosaic's own 180-in-the-middle, rolled with the rest below
    grey = np.where(cover > 0.02, srgb8(echo).astype(np.float32), iss)
    alpha = np.clip((cover - 0.25) / 0.5, 0, 1)

    roll = lambda a: np.roll(a, OW // 2, axis=1)
    grey, alpha, share = roll(grey), roll(alpha), roll(share)
    g8 = np.clip(np.round(grey), 0, 255).astype(np.uint8)
    # Alpha runs 128 (no swath) to 255 (all swath), never 0: a browser that decodes a picture with its
    # colour premultiplied by alpha would hand back black where alpha is 0, and the gaps' grey with it.
    rgba = np.dstack([g8, g8, g8, np.round(128 + alpha * 127).astype(np.uint8)])
    out.mkdir(parents=True, exist_ok=True)
    radar = out / "2k_titan_radar.webp"
    Image.fromarray(rgba).save(radar, "WEBP", quality=80, method=6, alpha_quality=100, exact=True)
    lakes = out / "titan_lakes.webp"
    Image.fromarray(np.round(np.clip(share, 0, 1) * 255).astype(np.uint8)).save(lakes, "WEBP", lossless=True, quality=100, method=6)
    covered = float((alpha > 0.5).mean())  # alpha here is the 0..1 share, before the 128..255 encoding
    sphere = float((np.cos(np.radians(lat))[:, None] * (alpha > 0.5)).sum() / (np.cos(np.radians(lat)).sum() * OW))
    lake_km2 = float((share * np.cos(np.radians(lat))[:, None]).sum() * (2 * np.pi * 2574.76 / OW) * (np.pi * 2574.76 / OH))
    print(f"{radar}: {radar.stat().st_size} B; radar covers {sphere:.3f} of the sphere ({covered:.3f} of the texels)")
    print(f"{lakes}: {lakes.stat().st_size} B; lakes and seas drawn {lake_km2:,.0f} km2")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--cache", type=Path, default=Path("/tmp/titan-sar"))
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "site/textures")
    a = ap.parse_args()
    build(fetch_rows(a.cache), a.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
