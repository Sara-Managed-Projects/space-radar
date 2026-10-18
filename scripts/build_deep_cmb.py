#!/usr/bin/env python3
"""The microwave background's map -> site/images/deep/cmb/wmap-ilc-9yr.{webp,json}
(internal spec 0076 stage W1-b, internal #781; spec 0075 task 24, DS-17).

THE SOURCE. The WMAP nine-year Internal Linear Combination map (Bennett et al. 2013, ApJS 208, 20,
section 6): the five WMAP bands combined, region by region, with the weights that leave the least of
the Galaxy's own microwaves, so what is left is the light of the young universe. A HEALPix map
(NESTED, Nside 512, 3 145 728 pixels), Galactic coordinates, smoothed to one degree, thermodynamic
millikelvin, with the average (2.7255 K) and the dipole of our own motion taken out. LAMBDA, NASA
Goddard. NASA data: "NASA content - images, audio, video, and media files used in the rendition of
3-dimensional models, such as texture maps and polygon data in any format - generally are not subject
to copyright in the United States" (https://www.nasa.gov/nasa-brand-center/images-and-media/, read
2026-10-15). LAMBDA asks to be acknowledged (CREDITS.md section 3h has its line). Read by this script
outside the browser and pinned below by SHA-256: a file that does not match is refused.

WHY NOT PLANCK. Planck's maps are sharper, but ESA's page for Planck's 2018 picture of the
background ("Planck's view of the cosmic microwave background", esa.int, read 2026-10-15) gives
"Credit: ESA/Planck Collaboration" and "Licence: ESA Standard Licence", not CC BY-SA 3.0 IGO, and
no licence text was found for the Planck Legacy Archive's maps (registry/otherlight.yaml says the
same of its HiPS copy). Spec 0076 (design section 9) says to use the public-domain map then.

WHAT IS DRAWN. The map, turned to a picture the browser can read: an equirectangular grid of
1024 x 512 in GALACTIC longitude and latitude (column 0 starts at l = 0 and l grows with the column;
row 0 is b = +90), each texel the mean of 2 x 2 samples of the HEALPix map (nearest pixel, NESTED
index computed here, no healpy). The temperature is written as one grey value, linear in
microkelvin from -SCALE_UK (0) to +SCALE_UK (255), clipped: grey = round((T_uK / SCALE_UK + 1) * 127.5).
scene/deep/cmb.js turns the grid from Galactic to the map's axes and colours each grey by the same
scale its legend prints. Along the Galactic plane some of the Galaxy's own microwaves remain in an ILC
map (Bennett et al. 2013 section 6 warn against using it there for analysis); they are kept, not
painted out.

    python3 scripts/build_deep_cmb.py --from FILE      # FILE is wmap_ilc_9yr_v5.fits
    python3 scripts/build_deep_cmb.py --fetch DIR      # read it from LAMBDA into DIR first
    python3 scripts/build_deep_cmb.py --check --from FILE
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "site/images/deep/cmb"
OUT_IMG = OUT_DIR / "wmap-ilc-9yr.webp"
OUT_JSON = OUT_DIR / "wmap-ilc-9yr.json"

SOURCE_URL = "https://lambda.gsfc.nasa.gov/data/map/dr5/dfp/ilc/wmap_ilc_9yr_v5.fits"
SOURCE_PAGE = "https://lambda.gsfc.nasa.gov/product/wmap/dr5/ilc_map_get.html"
SOURCE_SHA256 = "4501090f824f9140e916339f9e8e490333f6ffe4257a6ee6a02526c8640099a9"
SOURCE_BYTES = 25174080
NSIDE = 512
WIDTH, HEIGHT = 1024, 512
SCALE_UK = 200  # the legend's ends: -200 and +200 microkelvin (scene/deep/cmb.js SCALE_UK)
QUALITY = 90
USER_AGENT = "SpaceRadar/1.0 (+https://github.com/Sara-Managed-Projects/space-radar)"


def read_fits_column(raw: bytes) -> tuple[np.ndarray, dict]:
    """The first column (TEMPERATURE, big-endian float32) of the first binary table, and its header."""
    pos = 0
    headers = []
    while pos < len(raw):
        cards = {}
        while True:
            block = raw[pos:pos + 2880]
            pos += 2880
            done = False
            for i in range(0, 2880, 80):
                card = block[i:i + 80].decode("ascii", "replace")
                key = card[:8].strip()
                if key == "END":
                    done = True
                    break
                if card[8:10] == "= ":
                    val = card[10:].split("/")[0].strip().strip("'").strip()
                    cards[key] = val
            if done:
                break
        headers.append(cards)
        if cards.get("XTENSION") == "BINTABLE":
            width, rows = int(cards["NAXIS1"]), int(cards["NAXIS2"])
            if cards.get("TTYPE1") != "TEMPERATURE" or cards.get("TFORM1") != "E":
                sys.exit(f"build_deep_cmb: the table's first column is {cards.get('TTYPE1')} {cards.get('TFORM1')}, not TEMPERATURE E")
            table = np.frombuffer(raw, dtype=np.uint8, count=width * rows, offset=pos).reshape(rows, width)
            temp = table[:, 0:4].copy().view(">f4").reshape(rows).astype(np.float64)
            return temp, cards
        naxis = int(cards.get("NAXIS", "0"))
        size = 0
        if naxis:
            size = abs(int(cards.get("BITPIX", "8"))) // 8
            for k in range(1, naxis + 1):
                size *= int(cards[f"NAXIS{k}"])
        pos += ((size + 2879) // 2880) * 2880
    sys.exit("build_deep_cmb: no binary table in the file")


def spread_bits(v: np.ndarray) -> np.ndarray:
    """Interleave zeros between the bits of v (v < 2^16): the NESTED index's Morton code."""
    v = v.astype(np.int64) & 0xFFFF
    v = (v | (v << 8)) & 0x00FF00FF
    v = (v | (v << 4)) & 0x0F0F0F0F
    v = (v | (v << 2)) & 0x33333333
    v = (v | (v << 1)) & 0x55555555
    return v


def ang2pix_nest(nside: int, z: np.ndarray, phi: np.ndarray) -> np.ndarray:
    """HEALPix ang2pix in NESTED order (Gorski et al. 2005; the HEALPix C++ ang2pix_nest_z_phi)."""
    order = int(math.log2(nside))
    za = np.abs(z)
    tt = np.mod(phi, 2 * math.pi) * (2 / math.pi)  # in [0, 4)
    face = np.zeros(z.shape, dtype=np.int64)
    ix = np.zeros(z.shape, dtype=np.int64)
    iy = np.zeros(z.shape, dtype=np.int64)
    eq = za <= 2.0 / 3.0
    # the equatorial belt
    t1 = nside * (0.5 + tt[eq])
    t2 = nside * (z[eq] * 0.75)
    jp = (t1 - t2).astype(np.int64)
    jm = (t1 + t2).astype(np.int64)
    ifp = jp >> order
    ifm = jm >> order
    f = np.where(ifp == ifm, np.where(ifp == 4, 4, ifp + 4), np.where(ifp < ifm, ifp, ifm + 8))
    face[eq] = f
    ix[eq] = jm & (nside - 1)
    iy[eq] = nside - (jp & (nside - 1)) - 1
    # the polar caps
    pc = ~eq
    ntt = np.minimum(tt[pc].astype(np.int64), 3)
    tp = tt[pc] - ntt
    tmp = nside * np.sqrt(3 * (1 - za[pc]))
    jp = np.minimum((tp * tmp).astype(np.int64), nside - 1)
    jm = np.minimum(((1.0 - tp) * tmp).astype(np.int64), nside - 1)
    north = z[pc] >= 0
    face[pc] = np.where(north, ntt, ntt + 8)
    ix[pc] = np.where(north, nside - jm - 1, jp)
    iy[pc] = np.where(north, nside - jp - 1, jm)
    return face * nside * nside + spread_bits(ix) + (spread_bits(iy) << 1)


def grid(temp_uk: np.ndarray) -> np.ndarray:
    """The equirectangular grid in Galactic (l, b), each texel the mean of 2 x 2 samples, microkelvin."""
    acc = np.zeros((HEIGHT, WIDTH))
    for sy in (0.25, 0.75):
        for sx in (0.25, 0.75):
            col = (np.arange(WIDTH) + sx) / WIDTH
            row = (np.arange(HEIGHT) + sy) / HEIGHT
            lon = col * 2 * math.pi                 # l grows with the column, from 0
            lat = (0.5 - row) * math.pi             # row 0 is b = +90 degrees
            L, B = np.meshgrid(lon, lat)
            pix = ang2pix_nest(NSIDE, np.sin(B), L)
            acc += temp_uk[pix]
    return acc / 4


def encode(uk: np.ndarray) -> np.ndarray:
    return np.clip(np.rint((uk / SCALE_UK + 1) * 127.5), 0, 255).astype(np.uint8)


def build(path: Path, check: bool) -> int:
    raw = path.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    if sha != SOURCE_SHA256:
        sys.exit(f"build_deep_cmb: {path} is not the pinned file (sha256 {sha})")
    temp_mk, cards = read_fits_column(raw)
    if cards.get("NSIDE") != str(NSIDE) or cards.get("ORDERING") != "NESTED":
        sys.exit(f"build_deep_cmb: expected NESTED Nside {NSIDE}, got {cards.get('ORDERING')} {cards.get('NSIDE')}")
    temp_uk = temp_mk * 1000.0
    uk = grid(temp_uk)
    grey = encode(uk)
    buf = io.BytesIO()
    Image.fromarray(grey).save(buf, format="WEBP", quality=QUALITY, method=6)
    img = buf.getvalue()
    stats = {
        "rmsUk": round(float(np.sqrt(np.mean(temp_uk ** 2))), 1),
        "minUk": round(float(temp_uk.min()), 1),
        "maxUk": round(float(temp_uk.max()), 1),
        "clippedShare": round(float(np.mean(np.abs(uk) > SCALE_UK)), 5),
    }
    manifest = {
        "what": "The cosmic microwave background as our sky shows it: WMAP nine-year ILC map",
        "source": {
            "name": "WMAP nine-year Internal Linear Combination map (wmap_ilc_9yr_v5.fits), LAMBDA, NASA Goddard",
            "url": SOURCE_URL,
            "page": SOURCE_PAGE,
            "sha256": SOURCE_SHA256,
            "bytes": SOURCE_BYTES,
            "paper": "Bennett et al. 2013, ApJS 208, 20, section 6",
            "licence": "NASA data, no copyright claimed",
            "terms": "https://www.nasa.gov/nasa-brand-center/images-and-media/",
            "credit": "NASA / WMAP Science Team",
        },
        "frame": "galactic",
        "projection": "equirectangular: column 0 at l = 0, l growing with the column; row 0 at b = +90",
        "width": WIDTH,
        "height": HEIGHT,
        "encoding": "grey = round((T_uK / scaleUk + 1) * 127.5), clipped to 0..255",
        "scaleUk": SCALE_UK,
        "meanK": 2.7255,
        "smoothingDeg": 1.0,
        "removed": "the average temperature and the dipole of our own motion",
        "stats": stats,
        "file": OUT_IMG.name,
        "fileBytes": len(img),
        "fileSha256": hashlib.sha256(img).hexdigest(),
    }
    text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    if check:
        ok = OUT_JSON.exists() and OUT_JSON.read_text(encoding="utf-8") == text and OUT_IMG.exists() and OUT_IMG.read_bytes() == img
        print("build_deep_cmb: " + ("up to date" if ok else "STALE: run without --check"))
        return 0 if ok else 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_IMG.write_bytes(img)
    OUT_JSON.write_text(text, encoding="utf-8")
    print(f"build_deep_cmb: {OUT_IMG.relative_to(ROOT)} {len(img)} B, {WIDTH} x {HEIGHT}; rms {stats['rmsUk']} uK, "
          f"{stats['clippedShare'] * 100:.2f} % of texels past +-{SCALE_UK} uK")
    return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--from", dest="src", type=Path, help="wmap_ilc_9yr_v5.fits")
    ap.add_argument("--fetch", type=Path, help="a directory to read the file from LAMBDA into")
    ap.add_argument("--check", action="store_true", help="exit 1 if the checked-in picture or manifest is stale")
    a = ap.parse_args(argv)
    src = a.src
    if a.fetch:
        a.fetch.mkdir(parents=True, exist_ok=True)
        src = a.fetch / "wmap_ilc_9yr_v5.fits"
        req = urllib.request.Request(SOURCE_URL, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=300) as r:
            src.write_bytes(r.read())
    if not src:
        ap.error("--from FILE or --fetch DIR")
    return build(src, a.check)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
