#!/usr/bin/env python3
"""The Sun's neighbourhood as real 3D dust (internal #423, idea 5): the data behind scene/deep/localdust.js, baked into
site/data/deep/localdust.json and site/data/deep/localdust.bin.

    python3 scripts/build_deep_localdust.py --fetch [--cache DIR]   # 640 slabs of the 15.7 GB cube by HTTP range (about 2 GB, 30 min)
    python3 scripts/build_deep_localdust.py --bake  [--cache DIR]   # the slabs -> the two files
    python3 scripts/build_deep_localdust.py --check                 # the files are the size and hash the manifest says

(--fetch and --bake need numpy, installed or not; --check needs only the standard library.)

SOURCE. Edenhofer G., Zucker C., Frank P., Saydjari A.K., Speagle J.S., Finkbeiner D., Ensslin T. 2024, A&A 685, A82,
"A parsec-scale Galactic 3D dust map out to 1.25 kpc from the Sun" (arXiv:2308.01295). Data: Zenodo record 8187943
(doi 10.5281/zenodo.8187943), licence CC BY 4.0 (the record's `license` field, read 2026-11-17). The file read is
`mean_and_std_xyz.fits`, 15 662 543 040 bytes: the posterior MEAN and standard deviation of the dust's differential
extinction (the cube's CUNIT: "E of Zhang, Green, and Rix (2023)" per parsec, an extinction density) on a Cartesian
grid of 1251^3 voxels of 2 pc, Galactic X (to the Galactic centre), Y (the direction of rotation), Z (north), the Sun
at the origin, |X|, |Y|, |Z| <= 1250 pc (the FITS header: CRVAL -1250, CDELT 2). The map is built from Gaia DR3 parallaxes
and BP/RP spectra (Zhang, Green & Rix 2023 extinctions) with 2MASS photometry. Its angular resolution is 14 arcmin; the
paper's own caveat is that the small scale structure of the far field is less certain.
REDUCED HERE: the first array (the mean), the box |X|, |Y|, |Z| <= 640 pc, averaged in blocks of 4 voxels into 160^3
cells of 8 pc (the file is read by HTTP range, the 640 slabs of Z, and nothing else is downloaded).
DRAWN FROM THEM: SAMPLES points, each in a cell chosen with a probability proportional to the cell's mean density, the
density capped at its CAP_PERCENTILE-th percentile over the cells (or the few dense clouds of Orion and Taurus would take
every point and the Local Bubble's wall would have none), at a random place in the cell (seeded), its place quantised to
a 5 pc step; the point's `a` is the cell's density on a log scale. A point is NOT a dust grain and its number is not a
mass: the sampling and the brightness law are ours and are said on the card (registry/visual-classes.yaml LOCAL_DUST).
THE LOCAL BUBBLE. O'Neill T.J., Zucker C., Goodman A.A., Edenhofer G. 2024, ApJ 973, 138, "The Local Bubble is a Local
Chimney" (arXiv:2403.04961): the shell is at 170 pc on average, 70 to 600+ pc, typically 35 pc thick (abstract, read
2026-11-16). The manifest keeps, from the cube, the mean density by shell of distance from the Sun, so the cavity can be
read from the data.
Gaia: the extinctions rest on ESA/Gaia/DPAC data (CC BY-NC 3.0 IGO); the file keeps the non-commercial term.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "site" / "data" / "deep" / "localdust.json"
OUT_BIN = ROOT / "site" / "data" / "deep" / "localdust.bin"
DEFAULT_CACHE = Path.home() / "space-radar-handoff" / "localdust-cache"
URL = "https://zenodo.org/api/records/8187943/files/mean_and_std_xyz.fits/content"
READ_ON = "2026-11-17"

N, C, H, S = 1251, 625, 320, 4  # the cube; the Sun's voxel; the half box in voxels (640 pc); the block (4 voxels = 8 pc)
DATA_OFFSET = 5760              # two 2880-byte header blocks of this file (the second is the mean's)
CELL_PC = 2 * S
CELLS = 2 * H // S              # 160
SAMPLES = 40000
CAP_PERCENTILE = 99.7        # a cell denser than this share of the cells counts as this dense (Orion and Taurus would take every point)
SEED = 423
MAGIC = b"SRLD"
VERSION = 1
STRIDE = 4                      # uint8 x, y, z (5 pc steps over +-640 pc), uint8 a
BOX_PC = 640.0


def fetch(cache: Path) -> None:
    import numpy as np
    (cache / "slabs").mkdir(parents=True, exist_ok=True)
    y0, ln = C - H, 4 * N * 2 * H

    def slab(z: int) -> None:
        f = cache / "slabs" / f"{z}.npy"
        if f.exists():
            return
        off = DATA_OFFSET + 4 * (N * (y0 + N * z))
        for k in range(40):
            try:
                req = urllib.request.Request(URL, headers={"Range": f"bytes={off}-{off + ln - 1}", "User-Agent": "space-radar (https://github.com/Sara-Managed-Projects/space-radar)"})
                d = urllib.request.urlopen(req, timeout=180).read()
                if len(d) != ln:
                    raise OSError("short")
                a = np.nan_to_num(np.frombuffer(d, ">f4").reshape(2 * H, N)[:, C - H:C + H], nan=0.0)
                tmp = cache / "slabs" / f"{z}.tmp.npy"
                np.save(tmp, a.reshape(CELLS, S, CELLS, S).mean(axis=(1, 3)).astype("f4"))
                tmp.rename(f)
                return
            except Exception as e:  # noqa: BLE001 -- a busy archive: wait and ask again
                print(f"  slab {z}: {e}; again", file=sys.stderr)
                time.sleep(5 + 3 * k)
        raise SystemExit(f"localdust: slab {z} failed")

    with ThreadPoolExecutor(5) as ex:
        list(ex.map(slab, range(C - H, C + H)))


def cube(cache: Path):
    import numpy as np
    out = np.zeros((CELLS, CELLS, CELLS), "f4")  # [z][y][x]
    for z in range(C - H, C + H):
        out[(z - (C - H)) // S] += np.load(cache / "slabs" / f"{z}.npy") / S
    return out


def bake(cache: Path) -> tuple[dict, bytes]:
    import numpy as np
    d = cube(cache)
    c = np.arange(CELLS) * CELL_PC - BOX_PC + CELL_PC / 2
    Z, Y, X = np.meshgrid(c, c, c, indexing="ij")
    R = np.sqrt(X * X + Y * Y + Z * Z)
    shells = []
    for r0 in range(0, 640, 40):
        m = (R >= r0) & (R < r0 + 40)
        shells.append({"fromPc": r0, "toPc": r0 + 40, "meanDensity": float(f"{float(d[m].mean()):.3e}")})
    dmax = float(d.max())
    cap = float(np.percentile(d, CAP_PERCENTILE))
    w = np.minimum(np.where(d > 0, d, 0.0).astype("f8"), cap)
    w = w.ravel()
    w /= w.sum()
    rng = np.random.default_rng(SEED)
    idx = rng.choice(w.size, size=SAMPLES, replace=True, p=w)
    iz, iy, ix = np.unravel_index(idx, d.shape)
    jit = rng.uniform(-CELL_PC / 2, CELL_PC / 2, size=(SAMPLES, 3))
    pos = np.stack([c[ix], c[iy], c[iz]], axis=1) + jit
    q = np.clip(np.round((pos + BOX_PC) / (2 * BOX_PC) * 255), 0, 255).astype("u1")
    dens = d.ravel()[idx]
    lo, hi = math.log10(1e-5), math.log10(dmax)
    a = np.clip(np.round((np.log10(np.maximum(dens, 1e-9)) - lo) / (hi - lo) * 255), 1, 255).astype("u1")
    order = np.argsort(idx, kind="stable")  # by cell: a point's neighbours are near it in the file
    rows = np.concatenate([q, a[:, None]], axis=1)[order]
    binary = struct.pack("<4sIII", MAGIC, VERSION, SAMPLES, STRIDE) + rows.tobytes()
    man = {
        "version": VERSION, "built": READ_ON, "stride": STRIDE, "count": SAMPLES,
        "bin": {"bytes": len(binary), "sha256": hashlib.sha256(binary).hexdigest()},
        "grid": {"cellPc": CELL_PC, "cells": CELLS, "boxPc": BOX_PC, "quantumPc": round(2 * BOX_PC / 255, 4), "axes": "Galactic X (to the Galactic centre), Y (rotation), Z (north), the Sun at the origin"},
        "density": {"unit": "differential extinction per parsec, E of Zhang, Green & Rix (2023)", "maxCell": float(f"{dmax:.4e}"), "aLog10Range": [-5.0, round(math.log10(dmax), 4)]},
        "sampling": {"samples": SAMPLES, "weight": f"cell density, capped at its {CAP_PERCENTILE}th percentile ({cap:.3e})", "seed": SEED},
        "shells": shells,
        "sources": {
            "map": "Edenhofer G. et al. 2024, A&A 685, A82 (arXiv:2308.01295); Zenodo 10.5281/zenodo.8187943, mean_and_std_xyz.fits (15 662 543 040 B), CC BY 4.0",
            "bubble": "O'Neill T.J., Zucker C., Goodman A.A., Edenhofer G. 2024, ApJ 973, 138 (arXiv:2403.04961): the shell at 170 pc on average, 70 to 600+ pc, typically 35 pc thick",
            "gaia": "ESA/Gaia/DPAC, Gaia DR3 (the extinctions' stars); CC BY-NC 3.0 IGO",
        },
        "licence": "Edenhofer et al. 2024 map: CC BY 4.0; built from Gaia DR3, CC BY-NC 3.0 IGO (ESA)",
    }
    return man, binary


def check() -> int:
    if not OUT_JSON.exists() or not OUT_BIN.exists():
        print("localdust: the files are missing", file=sys.stderr)
        return 1
    man = json.loads(OUT_JSON.read_text())
    b = OUT_BIN.read_bytes()
    magic, version, count, stride = struct.unpack_from("<4sIII", b, 0)
    problems = []
    if magic != MAGIC or version != VERSION or stride != STRIDE:
        problems.append(f"the bin's head is {magic!r} v{version} stride {stride}")
    if len(b) != 16 + count * stride or man["bin"]["bytes"] != len(b) or man["count"] != count:
        problems.append(f"the bin is {len(b)} bytes for {count} rows; the manifest says {man['bin']['bytes']}")
    if hashlib.sha256(b).hexdigest() != man["bin"]["sha256"]:
        problems.append("the bin's sha256 is not the manifest's")
    if problems:
        print("localdust: " + "; ".join(problems), file=sys.stderr)
        return 1
    print(f"localdust ok: {count} points, {len(b)} bytes")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--bake", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    a = ap.parse_args(argv)
    if a.fetch:
        fetch(a.cache)
    if a.bake:
        man, binary = bake(a.cache)
        OUT_BIN.write_bytes(binary)
        OUT_JSON.write_text(json.dumps(man, indent=1, ensure_ascii=False) + "\n")
        print(f"localdust: {man['count']} points, {len(binary)} bytes")
    if a.check or not (a.fetch or a.bake):
        return check()
    return 0


if __name__ == "__main__":
    sys.exit(main())
