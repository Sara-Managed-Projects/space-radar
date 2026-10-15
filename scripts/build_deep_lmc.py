#!/usr/bin/env python3
"""The Large Magellanic Cloud's star-count maps from Gaia DR3 (internal spec 0075 stage c, task 12, DS-C05).

    python3 scripts/build_deep_lmc.py --fetch [--cache DIR]   # ask the Gaia archive, tile by tile (about 15 min)
    python3 scripts/build_deep_lmc.py --bake  [--cache DIR]   # the tiles -> site/data/deep/lmc-density.bin
    python3 scripts/build_deep_lmc.py --check                 # the bin is the size and hash lmc.yaml says

WHAT IT MAKES. Two maps of the LMC's stars on the sky, 128 x 128 bins of 0.125 degrees (a gnomonic
projection centred on the catalogue centre, RA 80.8917, Dec -69.7567, the same as registry/dso-hand.yaml;
x to the east, y to the north; 16 x 16 degrees), as little-endian uint16, each map scaled so its
fullest bin is 65535:
    map 0, ALL MEMBERS   every Gaia DR3 source with G < 19.5 whose parallax is consistent with zero
                         (parallax < 5 sigma + 0.05 mas) and whose proper motion is within 1.5 mas/yr of
                         the LMC's (1.85, 0.30) mas/yr: the LMC's red giants and clump stars, mostly
    map 1, YOUNG         the same, bluer than BP-RP 0.5 and brighter than G 18: massive young stars,
                         the associations and the star-forming arm (Constellation III, 30 Doradus)
A uniform foreground (the median of the bins more than 8.5 degrees from the centre, Milky Way stars
that pass both cuts) is taken off each map first. The cuts are ours, in the manner of the Gaia
Collaboration's own study of the Clouds (Luri et al. 2021, A&A 649, A7, arXiv:2012.01771), and the
maps are star COUNTS: Gaia misses stars where the bar is most crowded, so the bar is fainter here than
in light. scene/deep/lmc.js says so and draws the bar from the map as it is.

NO DISTANCE OF ANY STAR IS USED (the package's section 5.2): at 160 000 light-years a star's parallax is
far below Gaia's error, so the cut only asks that it be consistent with zero. Depth in the 3D model
comes from the disc's measured inclination and a scale height, statistically (lmc.yaml).

THE ARCHIVE. https://gea.esac.esa.int/tap-server/tap (anonymous, no account). A query of the whole
field at once times out, and a WHERE on proper motion makes the archive scan the whole table; so each
tile of half a degree asks only for a cone and GROUP BYs the signs of the cuts, and the cuts are applied
here. Every tile's answer is kept in the cache, so a second run fetches nothing.

LICENCE. Gaia data: ESA/Gaia/DPAC, CC BY-SA 3.0 IGO. The bin is a derived work under the same licence
(CREDITS.md section 3l, the LMC sub-heading).
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import csv
import hashlib
import io
import math
import struct
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "data" / "deep" / "lmc-density.bin"
PROFILE = ROOT / "registry" / "deepsky-heroes" / "lmc.yaml"
TAP = "https://gea.esac.esa.int/tap-server/tap"
UA = "space-radar (https://github.com/Sara-Managed-Projects/space-radar)"
RA0, DEC0 = 80.8917, -69.7567
N = 128            # bins per side
BIN = 0.125        # degrees
HALF = N * BIN / 2  # 8 degrees
TILE = 4           # bins per tile side (half a degree: the synchronous service answers it in a few seconds)
PM0 = (1.85, 0.30)
PM_R = 1.5
G_MAX = 19.5

D2R = math.pi / 180


def gnomonic_inverse(xi: float, eta: float) -> tuple:
    """(xi, eta) in degrees on the tangent plane -> (ra, dec) in degrees."""
    x, y = xi * D2R, eta * D2R
    d0, a0 = DEC0 * D2R, RA0 * D2R
    rho = math.hypot(x, y)
    c = math.atan(rho)
    if rho == 0:
        return RA0, DEC0
    dec = math.asin(math.cos(c) * math.sin(d0) + y * math.sin(c) * math.cos(d0) / rho)
    ra = a0 + math.atan2(x * math.sin(c), rho * math.cos(d0) * math.cos(c) - y * math.sin(d0) * math.sin(c))
    return (ra / D2R) % 360, dec / D2R


def tile_query(x0: int, y0: int, size: int) -> str:
    """The cone round the bins x0..x0+size-1, y0..y0+size-1, grouped by bin and by the signs of the cuts."""
    xi_c = -HALF + (x0 + size / 2) * BIN
    eta_c = -HALF + (y0 + size / 2) * BIN
    ra, dec = gnomonic_inverse(xi_c, eta_c)
    radius = size * BIN / 2 * math.sqrt(2) * 1.03
    den = f"(SIN(RADIANS(dec)) * SIN(RADIANS({DEC0})) + COS(RADIANS(dec)) * COS(RADIANS({DEC0})) * COS(RADIANS(ra - {RA0})))"
    xi = f"DEGREES(COS(RADIANS(dec)) * SIN(RADIANS(ra - {RA0})) / {den})"
    eta = f"DEGREES((SIN(RADIANS(dec)) * COS(RADIANS({DEC0})) - COS(RADIANS(dec)) * SIN(RADIANS({DEC0})) * COS(RADIANS(ra - {RA0}))) / {den})"
    pm2 = f"(pmra - {PM0[0]}) * (pmra - {PM0[0]}) + (pmdec - {PM0[1]}) * (pmdec - {PM0[1]})"
    return (
        f"SELECT FLOOR(({xi} + {HALF}) / {BIN}) AS ix, FLOOR(({eta} + {HALF}) / {BIN}) AS iy, "
        f"SIGN({pm2} - {PM_R * PM_R}) AS spm, SIGN(parallax - 5 * parallax_error - 0.05) AS spx, "
        f"SIGN(bp_rp - 0.5) AS sc, SIGN(phot_g_mean_mag - 18) AS sg, COUNT(*) AS n "
        f"FROM gaiadr3.gaia_source "
        f"WHERE 1 = CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', {ra:.5f}, {dec:.5f}, {radius:.4f})) "
        f"AND phot_g_mean_mag < {G_MAX} GROUP BY ix, iy, spm, spx, sc, sg"
    )


def http(url: str, data: dict | None = None, timeout: int = 90) -> tuple:
    body = urllib.parse.urlencode(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers={"User-Agent": UA})

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None

    opener = urllib.request.build_opener(NoRedirect)
    try:
        with opener.open(req, timeout=timeout) as r:
            return r.status, r.headers, r.read()
    except urllib.error.HTTPError as e:  # 303 See Other lands here
        return e.code, e.headers, e.read()


def own_bins(text: str, x0: int, y0: int, size: int) -> str:
    """Only the rows of the bins this cone was asked for: a cone also reaches into its neighbours'."""
    lines = text.strip("\n").split("\n")
    keep = [lines[0]]
    for line in lines[1:]:
        f = line.split(",")
        if not f[0] or not f[1]:
            continue
        ix, iy = int(float(f[0])), int(float(f[1]))
        if x0 <= ix < x0 + size and y0 <= iy < y0 + size:
            keep.append(line)
    return "\n".join(keep) + "\n"


def ask(x0: int, y0: int, size: int) -> str:
    """One synchronous query; a cone too full to answer in time is asked again as four smaller ones."""
    for attempt in range(3):
        status, _, body = http(f"{TAP}/sync", {"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "csv", "QUERY": tile_query(x0, y0, size)})
        text = body.decode(errors="replace")
        if status == 200 and text.startswith("ix,"):
            return own_bins(text, x0, y0, size)
        if "timeout" in text.lower() and size > 1:
            h = size // 2
            parts = [ask(x0 + dx, y0 + dy, h) for dy in (0, h) for dx in (0, h)]
            return parts[0] + "".join(p.split("\n", 1)[1] for p in parts[1:])
        time.sleep(4 * (attempt + 1))
    raise RuntimeError(f"bins {x0},{y0} (+{size}): the archive did not answer: {text[:200]}")


def fetch_tile(tx: int, ty: int, cache: Path) -> str:
    out = cache / f"tile-{tx:02d}-{ty:02d}.csv"
    if out.exists() and out.stat().st_size > 0:
        return "cached"
    out.write_text(ask(tx * TILE, ty * TILE, TILE))
    return "fetched"


def fetch(cache: Path) -> None:
    cache.mkdir(parents=True, exist_ok=True)
    tiles = [(tx, ty) for ty in range(N // TILE) for tx in range(N // TILE)]
    done = 0
    with cf.ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(fetch_tile, tx, ty, cache): (tx, ty) for tx, ty in tiles}
        for f in cf.as_completed(futures):
            done += 1
            tx, ty = futures[f]
            print(f"  {done}/{len(tiles)} tile {tx},{ty}: {f.result()}", flush=True)


def counts(cache: Path) -> tuple:
    """All members and young members per bin, from the cached tiles (each bin from its own tile only)."""
    allm = [[0.0] * N for _ in range(N)]
    young = [[0.0] * N for _ in range(N)]
    for ty in range(N // TILE):
        for tx in range(N // TILE):
            path = cache / f"tile-{tx:02d}-{ty:02d}.csv"
            if not path.exists():
                raise SystemExit(f"missing {path}: run --fetch first")
            for row in csv.DictReader(io.StringIO(path.read_text())):
                if not row["ix"] or not row["iy"]:
                    continue
                ix, iy = int(float(row["ix"])), int(float(row["iy"]))
                if not (tx * TILE <= ix < (tx + 1) * TILE and ty * TILE <= iy < (ty + 1) * TILE):
                    continue  # the cone reaches into the next tile: that tile counts it
                if row["spm"] != "-1.0" or row["spx"] != "-1.0":
                    continue  # no proper motion like the LMC's, or a parallax that is not zero
                n = float(row["n"])
                allm[iy][ix] += n
                if row["sc"] == "-1.0" and row["sg"] == "-1.0":
                    young[iy][ix] += n
    return allm, young


def background(m: list) -> float:
    ring = sorted(m[y][x] for y in range(N) for x in range(N)
                  if math.hypot((x + 0.5) * BIN - HALF, (y + 0.5) * BIN - HALF) > 8.5)
    return ring[len(ring) // 2] if ring else 0.0


def smooth(m: list) -> list:
    """A 3 x 3 binomial filter: Gaia's scanning pattern and Poisson noise, not structure."""
    k = (1, 2, 1)
    out = [[0.0] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            s = w = 0.0
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < N and 0 <= xx < N:
                        kk = k[dy + 1] * k[dx + 1]
                        s += m[yy][xx] * kk
                        w += kk
            out[y][x] = s / w
    return out


def bake(cache: Path) -> bytes:
    allm, young = counts(cache)
    blob = bytearray()
    for name, m, sm in (("all", allm, True), ("young", young, False)):
        bg = background(m)
        # The young map keeps its clumps (they ARE the associations); the old map is smoothed a little.
        mm = smooth(m) if sm else m
        clean = [[max(0.0, v - bg) for v in row] for row in mm]
        peak = max(max(r) for r in clean) or 1.0
        total = sum(sum(r) for r in m)
        print(f"  {name}: {total:,.0f} stars, foreground {bg:.1f} a bin, fullest bin {peak:,.0f}")
        for row in clean:  # row 0 is the south edge (eta = -8), x runs east
            blob += struct.pack(f"<{N}H", *[min(65535, round(v / peak * 65535)) for v in row])
    return bytes(blob)


def recorded() -> dict:
    import yaml
    doc = yaml.safe_load(PROFILE.read_text())
    for layer in doc.get("layers") or []:
        if layer.get("file") == "data/deep/lmc-density.bin":
            return layer
    return {}


def main(argv) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--bake", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--cache", default=str(Path.home() / ".cache" / "space-radar" / "lmc-gaia"))
    a = ap.parse_args(argv)
    cache = Path(a.cache)
    if a.fetch:
        fetch(cache)
    if a.bake:
        blob = bake(cache)
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_bytes(blob)
        print(f"wrote {OUT.relative_to(ROOT)}: {len(blob)} bytes, sha256 {hashlib.sha256(blob).hexdigest()}")
    if a.check:
        if not OUT.exists():
            print(f"build_deep_lmc: {OUT.relative_to(ROOT)} is missing", file=sys.stderr)
            return 1
        blob = OUT.read_bytes()
        layer = recorded()
        want = (layer.get("bytes"), layer.get("sha256"))
        have = (len(blob), hashlib.sha256(blob).hexdigest())
        if want != have or len(blob) != 2 * N * N * 2:
            print(f"build_deep_lmc: the bin is {have}, lmc.yaml says {want}", file=sys.stderr)
            return 1
        print(f"build_deep_lmc: the bin matches lmc.yaml ({len(blob)} bytes)")
    if not (a.fetch or a.bake or a.check):
        ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
