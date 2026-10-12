#!/usr/bin/env python3
"""Saturn's fine ring structure as a strip: site/textures/8k_saturn_ring_fine.png.

WHAT IT IS MADE FROM. One stellar occultation by Cassini's ultraviolet spectrograph (UVIS, its High
Speed Photometer): the star Beta Centauri seen through the rings on day 202 of 2008 (orbit 77,
ingress), 66.7 degrees above the ring plane, which is why it was chosen -- a star that high gets
through all but the densest B ring. The archive's table has the normal optical depth every
kilometre from 73 267 to 144 890 km:

    https://pds-rings.seti.org/holdings/volumes/COUVIS_8xxx/COUVIS_8001/data/UVIS_HSP_2008_202_BETCEN_I_TAU01KM.TAB
    (8 666 625 bytes; data set CO-SR-UVIS-HSP-2/4-OCC-V3.0; Colwell et al. 2010, AJ 140, 1569)

"Data sets archived in the PDS are in the public domain." (PDS Geosciences Node, FAQ,
https://pds-geosciences.wustl.edu/faq.html, read 2026-10-12.)

WHAT THE STRIP HOLDS. Not the optical depth: the ring map the site already wears (Solar System
Scope's, registry/textures.yaml `saturn-ring`) has the broad picture -- which ring is thick, which
thin -- at about 32 km a texel, and its Encke gap is where Cassini's is. The strip is what that map
is too coarse to hold: the measured optical depth divided by itself smoothed to the map's
sharpness (a Gaussian of SMOOTH_KM), so a texel says "here the ring is this many times denser than
its neighbourhood". 1 is no change; a gap is 0; a ringlet in a gap is several. scene/worlds.js
RING_FRAG multiplies the map's optical depth by it when Saturn is large on screen, and a mip level
of it averages back to 1, which is why it cannot shimmer at a distance.

    texel i  ->  radius RING_INNER_KM + (i + 0.5) / PX x (RING_OUTER_KM - RING_INNER_KM)
    byte     ->  ratio = byte / 255 x RATIO_MAX

LIMITS, also in the registry row: one star on one day along one line through the rings (the rings
are not perfectly the same all the way round: the B ring's edge and the Encke gap's ringlets are
not); where the B ring is opaque to the star the table gives a lower bound, and the ratio there is
mostly noise held near 1; 8 km a texel, so the Keeler gap (35 km) is four texels and anything
finer than 16 km is not in it.

Run:  uv run --with numpy --with pillow python scripts/build-ring-profile.py --src PATH/TO/TABLE.TAB
      (without --src the table is fetched to a temporary folder, after a HEAD that refuses more
      than 20 MB)        --check: rebuild in memory and compare with the committed file
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
OUT = ROOT / "site" / "textures" / "8k_saturn_ring_fine.png"
SOURCE_URL = ("https://pds-rings.seti.org/holdings/volumes/COUVIS_8xxx/COUVIS_8001/data/"
              "UVIS_HSP_2008_202_BETCEN_I_TAU01KM.TAB")
MAX_FETCH_BYTES = 20_000_000

# The ring mesh's own radii (scene/worlds.js WORLDS, Saturn's `ring`): the strip is laid edge to edge.
RING_INNER_KM = 74500.0
RING_OUTER_KM = 140220.0
PX = 8192
# The sharpness of the map the strip refines, as a Gaussian's sigma. The map is 2048 texels over the
# same radii (32 km each) and its Encke gap, 325 km wide in Cassini's table, is some 400 km wide in it.
SMOOTH_KM = 60.0
# The largest ratio a byte can say. A ringlet in a gap is many times its neighbourhood; past this it is clipped.
RATIO_MAX = 4.0
# Under this smoothed optical depth there is no ring to refine (the gaps' own floors, the space outside).
FLOOR_TAU = 0.004


def read_table(path: Path):
    """Radius (km), normal optical depth and the largest optical depth the star could show, per row."""
    r, tau, top = [], [], []
    with open(path, "r", encoding="ascii", errors="replace") as fh:
        for line in fh:
            p = line.split(",")
            if len(p) < 6:
                continue
            r.append(float(p[0]))
            tau.append(float(p[4]))
            top.append(float(p[5]))
    return np.array(r), np.array(tau), np.array(top)


def strip_from(r, tau, top, px: int = PX):
    """The ratio strip as floats, and the binned optical depth it was made from."""
    ok = tau > -0.5                       # -1 is the table's "no value here"
    t = np.clip(tau, 0.0, None)
    t = np.where(ok & (top > 0), np.minimum(t, top), t)   # opaque to the star: no more than it could show
    # A kilometre grid from the inner edge to the outer, the gaps in the table filled from either side.
    grid = np.arange(RING_INNER_KM, RING_OUTER_KM + 1.0, 1.0)
    t1 = np.interp(grid, r[ok], t[ok])
    # Into texels by what gets THROUGH (a texel half gap and half ring passes half the light).
    edges = np.linspace(RING_INNER_KM, RING_OUTER_KM, px + 1)
    idx = np.clip(np.searchsorted(edges, grid, side="right") - 1, 0, px - 1)
    through = np.bincount(idx, weights=np.exp(-t1), minlength=px) / np.maximum(np.bincount(idx, minlength=px), 1)
    binned = -np.log(np.clip(through, 1e-6, 1.0))
    # The same, as sharp as the map: a Gaussian over the kilometre grid, then into the same texels.
    half = int(SMOOTH_KM * 4)
    k = np.exp(-0.5 * (np.arange(-half, half + 1) / SMOOTH_KM) ** 2)
    k /= k.sum()
    smooth1 = np.convolve(np.pad(t1, half, mode="edge"), k, mode="valid")
    smooth = np.bincount(idx, weights=smooth1, minlength=px) / np.maximum(np.bincount(idx, minlength=px), 1)
    ratio = np.where(smooth > FLOOR_TAU, binned / np.maximum(smooth, FLOOR_TAU), 1.0)
    return np.clip(ratio, 0.0, RATIO_MAX), binned


def encode(ratio) -> bytes:
    """The strip as PNG bytes: one grey channel, one row."""
    b = np.round(ratio / RATIO_MAX * 255.0).astype(np.uint8)[None, :]
    buf = io.BytesIO()
    Image.fromarray(b, mode="L").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def fetch(to: Path) -> Path:
    req = urllib.request.Request(SOURCE_URL, method="HEAD")
    with urllib.request.urlopen(req, timeout=60) as res:
        size = int(res.headers.get("Content-Length") or 0)
    if not 0 < size <= MAX_FETCH_BYTES:
        raise SystemExit(f"{SOURCE_URL} says it is {size} bytes: refusing (the table is 8.7 MB)")
    with urllib.request.urlopen(SOURCE_URL, timeout=300) as res, open(to, "wb") as fh:
        while True:
            chunk = res.read(1 << 20)
            if not chunk:
                break
            fh.write(chunk)
    return to


def main(argv) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--src", type=Path, help="the PDS table, already downloaded")
    ap.add_argument("--check", action="store_true", help="compare with the committed strip instead of writing it")
    args = ap.parse_args(argv)
    with tempfile.TemporaryDirectory() as tmp:
        src = args.src or fetch(Path(tmp) / "profile.tab")
        r, tau, top = read_table(src)
    ratio, binned = strip_from(r, tau, top)
    png = encode(ratio)
    km = lambda x: int(round((x - RING_INNER_KM) / (RING_OUTER_KM - RING_INNER_KM) * PX - 0.5))
    for name, at in (("Colombo", 77870), ("Maxwell", 87491), ("Huygens", 117680), ("Encke", 133589), ("Keeler", 136505)):
        print(f"  {name:8s} {at} km  texel {km(at)}  ratio {ratio[km(at)]:.2f}  optical depth {binned[km(at)]:.3f}")
    if args.check:
        same = OUT.exists() and OUT.read_bytes() == png
        print("the committed strip is what the table makes" if same else f"{OUT} is not what the table makes")
        return 0 if same else 1
    OUT.write_bytes(png)
    print(f"wrote {OUT.relative_to(ROOT)}: {PX} x 1, {len(png)} bytes, mean ratio {ratio.mean():.3f}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
