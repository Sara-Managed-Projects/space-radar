#!/usr/bin/env python3
"""Cut AT-HYG into the star tiles the sky from the ground reads when zoomed (internal #353).

    python3 scripts/build-startiles.py --src athyg_40_reduced_m11.csv.gz   write site/data/startiles/
    python3 scripts/build-startiles.py --check                             the files agree with their index

THE SOURCE is AT-HYG v4.0, "Augmented Tycho - HYG", by David Nash: Tycho-2's 2.5 million stars
with Gaia DR3's distances, from the author of the HYG database the sky already draws. Licence
CC BY-SA 4.0 (the repository's README, read 2026-10-07). The subset used is
data/subsets/athyg_40_reduced_m11.csv.gz (875 292 stars to magnitude 11.0, 70 MB):

    https://codeberg.org/astronexus/athyg/media/branch/main/data/subsets/athyg_40_reduced_m11.csv.gz

It is not kept in this repository; download it and pass --src. NOT USED, and why: ESA's own Gaia
archive. Its terms, read the same day (cosmos.esa.int/web/esdc/terms-and-conditions), are
CC BY-NC 3.0 IGO with commercial use by request, and this site ships nothing under a
non-commercial licence.

WHAT IS WRITTEN. Every star to magnitude 10.5 that the sky's own files (data/stars.bin and
data/skystars-1.bin, -2.bin: HYG's 109 389) do not already have, so no star is drawn twice: a
star within 20 arcseconds of one of those, and within 1.5 magnitudes of it, is that star. Two sets
of HEALPix tiles (RING numbering, as sky/startiles.js): nside 2 for the stars brighter than 9.0,
nside 8 for 9.0 to 10.5. An empty tile is still written, so a view never asks for a missing file.

FORMAT (little-endian), one file per tile:
  header  'SRST'  u16 version=1  u16 nside  u32 pix  u32 count  f32 span
  record  u16 u, u16 v   the star on the tile's tangent plane (east, north), -span to +span
          u8  mag        round((magnitude - 6.0) / 0.02), 0 to 255
          u8  bv         round((B-V + 0.5) * 50); 255 = not measured
  Brightest first. Magnitudes are AT-HYG's `mag` (Tycho VT, or V for a Hipparcos star); B-V is its `ci`.
"""
from __future__ import annotations

import csv
import gzip
import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site/data/startiles"
INDEX = OUT / "index.json"
MAG_MAX = 10.5
MAG0, MAG_STEP = 6.0, 0.02
LEVELS = [
    {"nside": 2, "from": 6.0, "to": 9.0, "dir": "n2"},
    {"nside": 8, "from": 9.0, "to": 10.5, "dir": "n8"},
]
SAME_ARCSEC = 20.0
SAME_MAG = 1.5
CELL = 2000.0  # the matching grid: unit vectors times this, rounded (cells of 1.7 arcminutes)


def radec_dir(ra_deg: float, dec_deg: float) -> tuple[float, float, float]:
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    c = math.cos(dec)
    return c * math.cos(ra), c * math.sin(ra), math.sin(dec)


def npix(nside: int) -> int:
    return 12 * nside * nside


def ang2pix(nside: int, d: tuple[float, float, float]) -> int:
    """HEALPix RING numbering; the same arithmetic as site/js/sky/startiles.js ang2pix."""
    z = max(-1.0, min(1.0, d[2]))
    za = abs(z)
    phi = math.atan2(d[1], d[0])
    if phi < 0:
        phi += 2 * math.pi
    tt = (phi / (math.pi / 2)) % 4
    if za <= 2 / 3:
        t1 = nside * (0.5 + tt)
        t2 = nside * z * 0.75
        jp, jm = math.floor(t1 - t2), math.floor(t1 + t2)
        ir = nside + 1 + jp - jm
        kshift = 1 - (ir & 1)
        ip = math.floor((jp + jm - nside + kshift + 1) / 2) % (4 * nside)
        return 2 * nside * (nside - 1) + (ir - 1) * 4 * nside + ip
    tp = tt - math.floor(tt)
    tmp = nside * math.sqrt(3 * (1 - za))
    jp, jm = math.floor(tp * tmp), math.floor((1 - tp) * tmp)
    ir = jp + jm + 1
    ip = math.floor(tt * ir) % (4 * ir)
    return 2 * ir * (ir - 1) + ip if z > 0 else npix(nside) - 2 * ir * (ir + 1) + ip


def pix2dir(nside: int, pix: int) -> tuple[float, float, float]:
    n = npix(nside)
    ncap = 2 * nside * (nside - 1)
    if pix < ncap:
        ir = int((1 + math.sqrt(1 + 2 * pix)) / 2)
        ip = pix + 1 - 2 * ir * (ir - 1)
        z = 1 - ir * ir / (3 * nside * nside)
        phi = (ip - 0.5) * math.pi / (2 * ir)
    elif pix < n - ncap:
        k = pix - ncap
        ir = k // (4 * nside) + nside
        ip = k % (4 * nside) + 1
        fodd = 1 if (ir + nside) & 1 else 0.5
        z = (2 * nside - ir) * 2 / (3 * nside)
        phi = (ip - fodd) * math.pi / (2 * nside)
    else:
        k = n - pix
        ir = int((1 + math.sqrt(2 * k - 1)) / 2)
        ip = 4 * ir + 1 - (k - 2 * ir * (ir - 1))
        z = -1 + ir * ir / (3 * nside * nside)
        phi = (ip - 0.5) * math.pi / (2 * ir)
    s = math.sqrt(max(0.0, 1 - z * z))
    return s * math.cos(phi), s * math.sin(phi), z


def tile_axes(nside: int, pix: int):
    c = pix2dir(nside, pix)
    n = math.hypot(c[0], c[1])
    e1 = (-c[1] / n, c[0] / n, 0.0)
    e2 = (c[1] * e1[2] - c[2] * e1[1], c[2] * e1[0] - c[0] * e1[2], c[0] * e1[1] - c[1] * e1[0])
    return c, e1, e2


def shipped() -> dict:
    """The stars the sky already has, on a grid, for the match."""
    grid: dict = {}

    def put(d, mag):
        grid.setdefault((round(d[0] * CELL), round(d[1] * CELL), round(d[2] * CELL)), []).append((d, mag))

    raw = (ROOT / "site/data/stars.bin").read_bytes()
    for i in range(len(raw) // 16):
        ra, dec, mag, _bv = struct.unpack_from("<4f", raw, i * 16)
        put(radec_dir(ra, dec), mag)
    for name in ("skystars-1.bin", "skystars-2.bin"):
        raw = (ROOT / "site/data" / name).read_bytes()
        count = struct.unpack_from("<I", raw, 8)[0]
        for i in range(count):
            o = 16 + i * 8
            ra = (raw[o] | raw[o + 1] << 8 | raw[o + 2] << 16) / 16777216 * 360
            dec = (raw[o + 3] | raw[o + 4] << 8 | raw[o + 5] << 16) / 16777215 * 180 - 90
            put(radec_dir(ra, dec), raw[o + 6] / 12.5 - 1.5)
    return grid


def already(grid: dict, d, mag: float, cos_same: float) -> bool:
    kx, ky, kz = round(d[0] * CELL), round(d[1] * CELL), round(d[2] * CELL)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                for (e, m) in grid.get((kx + dx, ky + dy, kz + dz), ()):
                    if d[0] * e[0] + d[1] * e[1] + d[2] * e[2] >= cos_same and abs(m - mag) <= SAME_MAG:
                        return True
    return False


def build(src: Path) -> int:
    grid = shipped()
    have = sum(len(v) for v in grid.values())
    cos_same = math.cos(math.radians(SAME_ARCSEC / 3600))
    tiles = [dict() for _ in LEVELS]
    read = kept = same = 0
    opener = gzip.open if src.suffix == ".gz" else open
    with opener(src, "rt", encoding="utf-8", newline="") as fh:
        rd = csv.reader(fh)
        head = next(rd)
        i_ra, i_dec, i_mag, i_ci = (head.index(k) for k in ("ra", "dec", "mag", "ci"))
        for row in rd:
            try:
                mag = float(row[i_mag])
                ra_h = float(row[i_ra])
                dec = float(row[i_dec])
            except ValueError:
                continue
            read += 1
            if mag > MAG_MAX or mag < -1.5 or (ra_h == 0.0 and dec == 0.0 and mag < -20):
                continue
            d = radec_dir(ra_h * 15.0, dec)
            if already(grid, d, mag, cos_same):
                same += 1
                continue
            try:
                bv = float(row[i_ci])
            except ValueError:
                bv = None
            li = 0 if mag < LEVELS[0]["to"] else 1
            pix = ang2pix(LEVELS[li]["nside"], d)
            tiles[li].setdefault(pix, []).append((mag, d, bv))
            kept += 1
    index = {
        "version": 1,
        "source": "AT-HYG v4.0 (David Nash), data/subsets/athyg_40_reduced_m11.csv.gz, https://codeberg.org/astronexus/athyg",
        "licence": "CC BY-SA 4.0",
        "read": "2026-10-07",
        "mag_max": MAG_MAX,
        "already_in_hyg_files": same,
        "levels": [],
    }
    total_bytes = 0
    for li, level in enumerate(LEVELS):
        nside = level["nside"]
        folder = OUT / level["dir"]
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob("*.bin"):
            old.unlink()
        count = size = biggest = 0
        for pix in range(npix(nside)):
            rows = sorted(tiles[li].get(pix, []), key=lambda r: r[0])
            c, e1, e2 = tile_axes(nside, pix)
            uv = []
            span = 1e-6
            for (mag, d, bv) in rows:
                dc = d[0] * c[0] + d[1] * c[1] + d[2] * c[2]
                u = (d[0] * e1[0] + d[1] * e1[1] + d[2] * e1[2]) / dc
                v = (d[0] * e2[0] + d[1] * e2[1] + d[2] * e2[2]) / dc
                span = max(span, abs(u), abs(v))
                uv.append((u, v))
            span = struct.unpack("<f", struct.pack("<f", span * 1.0001))[0]
            out = bytearray(b"SRST" + struct.pack("<HHIIf", 1, nside, pix, len(rows), span))
            for (mag, _d, bv), (u, v) in zip(rows, uv):
                qu = max(0, min(65535, round((u / span + 1) / 2 * 65535)))
                qv = max(0, min(65535, round((v / span + 1) / 2 * 65535)))
                qm = max(0, min(255, round((mag - MAG0) / MAG_STEP)))
                qb = 255 if bv is None else max(0, min(254, round((bv + 0.5) * 50)))
                out += struct.pack("<HHBB", qu, qv, qm, qb)
            (folder / f"{pix}.bin").write_bytes(bytes(out))
            count += len(rows)
            size += len(out)
            biggest = max(biggest, len(out))
        index["levels"].append({**level, "tiles": npix(nside), "stars": count, "bytes": size, "largest_tile_bytes": biggest})
        total_bytes += size
    index["stars"] = kept
    index["bytes"] = total_bytes
    INDEX.write_text(json.dumps(index, indent=1) + "\n", encoding="utf-8")
    print(f"startiles: read {read} rows, {have} stars already in the sky's files, {same} matched and left out, "
          f"{kept} written in {sum(l['tiles'] for l in index['levels'])} tiles, {total_bytes} bytes")
    return 0


def check() -> int:
    problems = []
    if not INDEX.exists():
        print("startiles: site/data/startiles/index.json is missing; run with --src", file=sys.stderr)
        return 1
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    total = stars = 0
    for level, want in zip(index.get("levels", []), LEVELS):
        if (level["nside"], level["dir"], level["from"], level["to"]) != (want["nside"], want["dir"], want["from"], want["to"]):
            problems.append(f"level {level.get('dir')} is not the one this script writes")
            continue
        size = count = 0
        for pix in range(npix(level["nside"])):
            p = OUT / level["dir"] / f"{pix}.bin"
            if not p.exists():
                problems.append(f"{p.relative_to(ROOT)} is missing")
                continue
            raw = p.read_bytes()
            magic, ver, nside, pid, n, _span = struct.unpack_from("<4sHHIIf", raw, 0)
            if magic != b"SRST" or ver != 1 or nside != level["nside"] or pid != pix or len(raw) != 20 + n * 6:
                problems.append(f"{p.relative_to(ROOT)}: header and length disagree")
                continue
            mags = raw[24::6][:n]
            if any(mags[i] > mags[i + 1] for i in range(n - 1)):
                problems.append(f"{p.relative_to(ROOT)}: not brightest first")
            size += len(raw)
            count += n
        if size != level["bytes"] or count != level["stars"]:
            problems.append(f"level {level['dir']}: {count} stars in {size} bytes, the index says {level['stars']} in {level['bytes']}")
        extra = [q.name for q in (OUT / level["dir"]).glob("*") if not (q.suffix == ".bin" and q.stem.isdigit() and int(q.stem) < npix(level["nside"]))]
        if extra:
            problems.append(f"level {level['dir']}: files that are not tiles: {extra[:3]}")
        total += size
        stars += count
    if total != index.get("bytes") or stars != index.get("stars"):
        problems.append("the index's totals are not the sum of its levels")
    if problems:
        print("startiles FAILED:\n  " + "\n  ".join(problems[:20]), file=sys.stderr)
        return 1
    print(f"startiles ok: {stars} stars in {total} bytes")
    return 0


if __name__ == "__main__":
    if "--check" in sys.argv:
        sys.exit(check())
    if "--src" not in sys.argv:
        print(__doc__)
        sys.exit(2)
    sys.exit(build(Path(sys.argv[sys.argv.index("--src") + 1])))
