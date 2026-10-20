#!/usr/bin/env python3
"""The Small Magellanic Cloud's star-count maps from Gaia DR3 (internal spec 0077 stage W2-e, internal #783).

    python3 scripts/build_deep_smc.py --fetch [--cache DIR]   # ask the Gaia archive, tile by tile (about 10 min)
    python3 scripts/build_deep_smc.py --bake  [--cache DIR]   # the tiles -> site/data/deep/smc-density.bin
    python3 scripts/build_deep_smc.py --check                 # the bin is the size and hash smc.yaml says
    python3 scripts/build_deep_smc.py --light                 # the photograph -> site/images/deep/smc/smc-light.webp (PIL, numpy)

The LMC's bake (scripts/build_deep_lmc.py) with the SMC's own numbers: two maps of the SMC's stars on the
sky, 128 x 128 bins of 0.075 degrees (a gnomonic projection centred on the catalogue centre, RA 13.1867,
Dec -72.8286, the same as registry/dso-hand.yaml; x to the east, y to the north; 9.6 x 9.6 degrees, so
the Wing toward the Magellanic Bridge is in it), as little-endian uint16, each map scaled so its fullest
bin is 65535:
    map 0, ALL MEMBERS   every Gaia DR3 source with G < 19.5 whose parallax is consistent with zero
                         (parallax < 5 sigma + 0.05 mas) and whose proper motion is within 1.0 mas/yr of
                         the SMC's (0.686, -1.237) mas/yr (Gaia Collaboration, Luri et al. 2021, A&A 649,
                         A7): the SMC's red giants and clump stars, mostly. 47 Tucanae (5.25, -2.53) and
                         NGC 362, Milky Way globulars in front of it, fail the proper-motion cut.
    map 1, YOUNG         the same, bluer than BP-RP 0.5 and brighter than G 18: massive young stars, the
                         bar's star-forming knots and the Wing
A uniform foreground (the median of the bins more than 4.6 degrees from the centre) is taken off each map
first. The maps are star COUNTS: Gaia misses stars where the bar is most crowded.

NO DISTANCE OF ANY STAR IS USED: at 200 000 light-years a parallax is far below Gaia's error. The SMC's
depth in the 3D model comes from its Cepheids' and red clump's measured spread along our line
(smc.yaml), statistically.

THE LIGHT (--light). The SMC's photograph (site/images/nebulae/smc.webp, NOIRLab noirlab2030b) is the galaxy's light in
scene/deep/smc.js, spread through its depth: so its STARS are taken out first (a point of light is one star, and
spread through 60 000 light-years it would be a streak), as scripts/build_deep_orion.py does, and two Milky Way globular
clusters in front of it, 47 Tucanae and NGC 362, are filled from round them (they are drawn as clusters by
scene/deep/globular.js, not as the SMC's light). The hero draws its own stars as points.

THE ARCHIVE. https://gea.esac.esa.int/tap-server/tap (anonymous, no account), as build_deep_lmc.py asks it.

LICENCE. Gaia data: ESA/Gaia/DPAC, CC BY-NC 3.0 IGO (https://www.cosmos.esa.int/web/gaia-users/license: "Gaia data are
distributed under the CC BY-NC 3.0 IGO license.", read 2026-10-16). The bin is a derived work and keeps
that non-commercial term (CREDITS.md section 3l, the SMC sub-heading).
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
OUT = ROOT / "site" / "data" / "deep" / "smc-density.bin"
PHOTO = ROOT / "site" / "images" / "nebulae" / "smc.webp"
LIGHT = ROOT / "site" / "images" / "deep" / "smc" / "smc-light.webp"
LIGHT_MANIFEST = LIGHT.with_name("manifest.json")
# Milky Way globulars in front of the SMC, filled out of its light: (name, RA, Dec, radius in arcmin of the fill).
# 47 Tucanae: the record's place (registry/dso-hand.yaml); NGC 362: SIMBAD's (01 03 14.26, -70 50 55.6). And one bright
# orange Milky Way star south of the SMC, whose place is read off the photograph: orange like an H II region, it would
# otherwise be kept as one.
FOREGROUND = (("47 Tucanae", 6.0231, -72.0814, 36.0), ("NGC 362", 15.8094, -70.8488, 10.0), ("a foreground star", 12.32, -74.94, 4.0))
PROFILE = ROOT / "registry" / "deepsky-heroes" / "smc.yaml"
TAP = "https://gea.esac.esa.int/tap-server/tap"
UA = "space-radar (https://github.com/Sara-Managed-Projects/space-radar)"
RA0, DEC0 = 13.1867, -72.8286
N = 128            # bins per side
BIN = 0.075        # degrees
HALF = N * BIN / 2  # 4.8 degrees
TILE = 8           # bins per tile side (0.6 degrees: the synchronous service answers it in a few seconds)
PM0 = (0.686, -1.237)
PM_R = 1.0
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
        try:
            status, _, body = http(f"{TAP}/sync", {"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "csv", "QUERY": tile_query(x0, y0, size)})
            text = body.decode(errors="replace")
        except OSError as e:  # the SMC's bar is dense: a cone the archive cannot answer in time is asked in four
            status, text = 0, f"timeout: {e}"
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
                    continue  # no proper motion like the SMC's, or a parallax that is not zero
                n = float(row["n"])
                allm[iy][ix] += n
                if row["sc"] == "-1.0" and row["sg"] == "-1.0":
                    young[iy][ix] += n
    return allm, young


def background(m: list) -> float:
    ring = sorted(m[y][x] for y in range(N) for x in range(N)
                  if math.hypot((x + 0.5) * BIN - HALF, (y + 0.5) * BIN - HALF) > 4.6)
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
        for row in clean:  # row 0 is the south edge (eta = -4.8), x runs east
            blob += struct.pack(f"<{N}H", *[min(65535, round(v / peak * 65535)) for v in row])
    return bytes(blob)


def recorded() -> dict:
    import yaml
    doc = yaml.safe_load(PROFILE.read_text())
    for layer in doc.get("layers") or []:
        if layer.get("file") == "data/deep/smc-density.bin":
            return layer
    return {}


def light() -> int:
    """The photograph without its stars and without the two globulars in front of the SMC (see THE LIGHT)."""
    import json
    import numpy as np
    import yaml
    from PIL import Image, ImageFilter

    row = next(r for r in yaml.safe_load((ROOT / "registry" / "nebulae.yaml").read_text(encoding="utf-8"))["pictures"] if r["id"] == "smc")
    im = Image.open(PHOTO).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    H, W = a.shape[:2]
    # its H II regions (NGC 346 and the rest) are pink and compact like stars: what is redder than it is white is kept
    pink = (a[..., 0] - 0.5 * (a[..., 1] + a[..., 2])) > 22.0
    pink = np.asarray(Image.fromarray((pink * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
    # the big stars first: brighter than a wide median (21 px at half size) by 70 (the SMC's own knots are not), grown, filled
    medb = np.asarray(im.resize((W // 2, H // 2), Image.BOX).filter(ImageFilter.MedianFilter(21)).resize((W, H), Image.BICUBIC)).astype(np.float32)
    ex = a.mean(axis=2) - medb.mean(axis=2)
    bigm = (np.asarray(Image.fromarray(((ex > 70.0) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0) & ~pink
    a = a.copy()
    a[bigm] = medb[bigm]
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    # the stars: brighter than a 7 px median by 14, grown by 2 px; then a wider pass round the bright ones
    med = np.asarray(im.filter(ImageFilter.MedianFilter(7))).astype(np.float32)
    star = (a.mean(axis=2) - med.mean(axis=2)) > 14.0
    m = Image.fromarray((star * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    mask = (np.asarray(m) > 0) & ~pink
    out = a.copy()
    out[mask] = med[mask]
    near = (np.asarray(m.filter(ImageFilter.MaxFilter(11))) > 0) & ~pink
    im2 = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    med2 = np.asarray(im2.filter(ImageFilter.MedianFilter(15))).astype(np.float32)
    halo = near & ((out.mean(axis=2) - med2.mean(axis=2)) > 6.0)
    out[halo] = med2[halo]
    # the globulars in front: a disc each, filled from its rim inward
    r = math.radians(row.get("north_deg") or 0.0)
    ra0, dec0 = row["ra_deg"], row["dec_deg"]
    yy, xx = np.mgrid[0:H, 0:W]
    disc = np.zeros((H, W), bool)
    for _, ra, dec, rad in FOREGROUND:
        w = -(ra - ra0) * math.cos(math.radians(dec0)) * 60.0   # west, arcmin
        n = (dec - dec0) * 60.0
        right = w * math.cos(r) - n * math.sin(r)
        up = w * math.sin(r) + n * math.cos(r)
        x = (0.5 + right / row["width_arcmin"]) * W
        y = (0.5 - up / row["height_arcmin"]) * H
        rp = rad / row["width_arcmin"] * W
        disc |= (xx - x) ** 2 + (yy - y) ** 2 <= rp * rp
    # start each disc at the median of a ring round it, then let the rim diffuse in (no seam, no relic of the cluster)
    ring = np.asarray(Image.fromarray(disc.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(9))) > 0
    ring &= ~disc
    if ring.any():
        out[disc] = np.median(out[ring], axis=0)
    for _ in range(80):
        b = np.asarray(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(3))).astype(np.float32)
        out[disc] = b[disc]
    LIGHT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(LIGHT, "WEBP", quality=88, method=6)
    LIGHT_MANIFEST.write_text(json.dumps({
        "file": str(LIGHT.relative_to(ROOT)), "bytes": LIGHT.stat().st_size, "sha256": hashlib.sha256(LIGHT.read_bytes()).hexdigest(), "size": [W, H],
        "from": str(PHOTO.relative_to(ROOT)), "from_sha256": hashlib.sha256(PHOTO.read_bytes()).hexdigest(),
        "stars_removed_px": int((mask | halo | bigm).sum()), "foreground_px": int(disc.sum()), "foreground": [list(f) for f in FOREGROUND],
        "credit": "CTIO/NOIRLab/NSF/AURA/SMASH/D. Nidever (noirlab2030b), CC BY 4.0; stars and two foreground globulars removed by Space Radar (scripts/build_deep_smc.py --light)",
    }, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {LIGHT.relative_to(ROOT)}: {LIGHT.stat().st_size} bytes, {int((mask | halo).sum())} star pixels and {int(disc.sum())} foreground pixels filled")
    return 0


def check_light() -> int:
    import json

    if not (LIGHT.exists() and LIGHT_MANIFEST.exists()):
        print("build_deep_smc: site/images/deep/smc/ is missing: run --light", file=sys.stderr)
        return 1
    m = json.loads(LIGHT_MANIFEST.read_text(encoding="utf-8"))
    if m["sha256"] != hashlib.sha256(LIGHT.read_bytes()).hexdigest() or m["from_sha256"] != hashlib.sha256(PHOTO.read_bytes()).hexdigest():
        print("build_deep_smc: smc-light.webp is not the bake of the current photograph: run --light", file=sys.stderr)
        return 1
    print(f"build_deep_smc: the light map is the bake of {m['from']} ({m['bytes']} bytes)")
    return 0


def main(argv) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--bake", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--light", action="store_true")
    ap.add_argument("--cache", default=str(Path.home() / ".cache" / "space-radar" / "smc-gaia"))
    a = ap.parse_args(argv)
    cache = Path(a.cache)
    if a.fetch:
        fetch(cache)
    if a.bake:
        blob = bake(cache)
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_bytes(blob)
        print(f"wrote {OUT.relative_to(ROOT)}: {len(blob)} bytes, sha256 {hashlib.sha256(blob).hexdigest()}")
    if a.light:
        light()
    if a.check:
        if check_light():
            return 1
        if not OUT.exists():
            print(f"build_deep_smc: {OUT.relative_to(ROOT)} is missing", file=sys.stderr)
            return 1
        blob = OUT.read_bytes()
        layer = recorded()
        want = (layer.get("bytes"), layer.get("sha256"))
        have = (len(blob), hashlib.sha256(blob).hexdigest())
        if want != have or len(blob) != 2 * N * N * 2:
            print(f"build_deep_smc: the bin is {have}, smc.yaml says {want}", file=sys.stderr)
            return 1
        print(f"build_deep_smc: the bin matches smc.yaml ({len(blob)} bytes)")
    if not (a.fetch or a.bake or a.check or a.light):
        ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
