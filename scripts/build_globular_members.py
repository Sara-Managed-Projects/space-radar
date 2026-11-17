#!/usr/bin/env python3
"""Globular clusters with their real Gaia member stars (internal #425 idea 7, #417): the data behind the real-member
branch of scene/deep/globular.js, baked into site/data/deep/globular-members.json and globular-members.bin.

    python3 scripts/build_globular_members.py --fetch [--cache DIR]   # clusters.zip from Zenodo (118.9 MB) -> DIR
    python3 scripts/build_globular_members.py --bake  [--cache DIR]   # the catalogues -> the two files
    python3 scripts/build_globular_members.py --check                 # the files are the size and hash the manifest says

SOURCE. Vasiliev E. & Baumgardt H. 2021, MNRAS 505, 5978, "Gaia EDR3 view on Galactic globular clusters"
(arXiv:2102.09568), the catalogue of stars in 170 globular clusters with a membership probability for each star
(from Gaia EDR3 astrometry), Zenodo record 4891252 (doi 10.5281/zenodo.4891252), clusters.zip, licence CC BY 4.0
(the record's `license` field, read 2026-11-17). Per star: Gaia source id, RA and Dec (deg), G and BP-RP, a quality
flag and `memberprob`. The underlying Gaia EDR3 measurements are ESA/Gaia/DPAC data, CC BY-NC 3.0 IGO
(https://www.cosmos.esa.int/web/gaia-users/license), the term site/data/deep/clusters.bin already carries.

MEASURED: each kept star's place on the sky (Gaia's own RA and Dec), its G magnitude and BP-RP colour.
MODELLED: its DEPTH. A star's distance along the line of sight is not measured (a parallax at 10 kpc is a fraction
of its error). It is drawn, seeded by its Gaia source id, from the King (1962, AJ 67, 471, eq. 27) density of the
cluster at the star's measured projected radius: p(z | R) proportional to rho_King(sqrt(R^2 + z^2)), out to the tidal
radius, with Harris's (1996, AJ 112, 1487; VizieR VII/202; the manifest scene/deep/clusters.json) core radius and
concentration at the distance the map places the cluster. Also modelled: the absolute magnitude (G less the
distance modulus at that distance and the extinction A_G = 0.789 * 3.1 * E(B-V), Wang & Chen 2019, ApJ 877, 116, with
Harris's E(B-V)) and the approximate B-V (0.82 (BP-RP)_0 - 0.06 with E(BP-RP) = 0.413 A_V: the same linear fit as
build_deep_clusters.py; not a published relation).

KEPT: memberprob >= PROB_CUT, a quality flag that says the star passed the catalogue's filters (bit 2), inside the
tidal radius on the sky, the MAX_STARS brightest. The crowded cores are incomplete in Gaia, so the catalogue's
stars are not all the stars: the card says the glow stands for the rest. Position format: build_deep_clusters.py's
(SRCL, 12 bytes a star: int16 x y z about the cluster's centre on the sun-inertial axes, int16 absolute G * 1000,
uint8 B-V, uint8 probability, uint8 flags = 0).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DSO = ROOT / "site" / "data" / "dso.json"
CLUSTERS = ROOT / "site" / "data" / "deep" / "clusters.json"
OUT_JSON = ROOT / "site" / "data" / "deep" / "globular-members.json"
OUT_BIN = ROOT / "site" / "data" / "deep" / "globular-members.bin"
DEFAULT_CACHE = Path.home() / "space-radar-handoff" / "globular-members-cache"
URL = "https://zenodo.org/api/records/4891252/files/clusters.zip/content"
READ_ON = "2026-11-17"

MAGIC = b"SRCL"
VERSION = 1
STRIDE = 12
PROB_CUT = 0.5
MAX_STARS = 3000
OBLIQUITY = math.radians(23.4392911)
LY_PC = 3.261563777167433
ARCMIN = math.pi / 10800

# The best-known globulars of the map's 33: record id -> the file's stem in the catalogue's `catalogues` folder.
CLUSTERS_KEPT = {
    "omega-centauri": "NGC_5139_oCen", "47-tucanae": "NGC_104_47Tuc", "m13": "NGC_6205_M_13", "m3": "NGC_5272_M_3",
    "m5": "NGC_5904_M_5", "m15": "NGC_7078_M_15", "m22": "NGC_6656_M_22", "m4": "NGC_6121_M_4",
    "m92": "NGC_6341_M_92", "m2": "NGC_7089_M_2", "m10": "NGC_6254_M_10", "ngc-6397": "NGC_6397",
}


def fetch(cache: Path) -> None:
    cache.mkdir(parents=True, exist_ok=True)
    z = cache / "clusters.zip"
    if not z.exists():
        req = urllib.request.Request(URL, headers={"User-Agent": "space-radar (https://github.com/Sara-Managed-Projects/space-radar)"})
        with urllib.request.urlopen(req, timeout=600) as r, open(z, "wb") as f:
            while chunk := r.read(1 << 20):
                f.write(chunk)
    with zipfile.ZipFile(z) as zf:
        for stem in CLUSTERS_KEPT.values():
            name = next(n for n in zf.namelist() if n.endswith(f"catalogues/{stem}.txt"))
            (cache / f"{stem}.txt").write_bytes(zf.read(name))


def ecliptic(ra_deg: float, dec_deg: float) -> tuple[float, float, float]:
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    x, y, z = math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)
    ce, se = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    return (x, y * ce + z * se, -y * se + z * ce)


def unit_hash(source_id: str, salt: int) -> float:
    h = hashlib.sha256(f"{source_id}:{salt}".encode()).digest()
    return int.from_bytes(h[:8], "little") / 2**64


def king_density(r: float, rc: float, rt: float) -> float:
    """King (1962) eq. 27, unnormalised; the same as scene/deep/globular.js kingDensity."""
    if not r >= 0 or r >= rt:
        return 0.0
    a = 1 + (rt / rc) ** 2
    z = math.sqrt((1 + (r / rc) ** 2) / a)
    return (math.acos(z) / z - math.sqrt(1 - z * z)) / (math.pi * rc * a**1.5 * z * z)


def sample_depth(R: float, rc: float, rt: float, u1: float, u2: float, n: int = 160) -> float:
    """z (light-years, signed) along the line of sight for a star at projected radius R: the cumulative of
    rho_King(sqrt(R^2 + z^2)) on a grid dense near z = 0, inverted at u1; the sign from u2."""
    zmax = math.sqrt(max(0.0, rt * rt - R * R))
    if zmax <= 0:
        return 0.0
    zs = [zmax * (i / n) ** 2 for i in range(n + 1)]
    cdf = [0.0]
    for i in range(1, n + 1):
        cdf.append(cdf[-1] + 0.5 * (king_density(math.hypot(R, zs[i]), rc, rt) + king_density(math.hypot(R, zs[i - 1]), rc, rt)) * (zs[i] - zs[i - 1]))
    total = cdf[-1]
    if total <= 0:
        return 0.0
    t = u1 * total
    lo, hi = 0, n
    while hi - lo > 1:
        m = (lo + hi) // 2
        if cdf[m] < t:
            lo = m
        else:
            hi = m
    span = cdf[hi] - cdf[lo]
    z = zs[lo] + ((t - cdf[lo]) / span if span > 0 else 0.0) * (zs[hi] - zs[lo])
    return z if u2 >= 0.5 else -z


def read_stars(path: Path):
    for line in path.read_text().splitlines():
        if not line or line.startswith("#"):
            continue
        f = line.split()
        if len(f) < 17:
            continue
        try:
            yield f[0], float(f[1]), float(f[2]), float(f[12]), float(f[13]), int(f[15]), float(f[16])
        except ValueError:
            continue  # a star without G or colour


def bake(cache: Path) -> tuple[dict, bytes]:
    dso = {o["id"]: o for o in json.loads(DSO.read_text())["objects"]}
    harris = {g["id"]: g for g in json.loads(CLUSTERS.read_text())["globulars"]}
    rows, blob, total = [], bytearray(), 0
    for rid, stem in CLUSTERS_KEPT.items():
        o, h = dso[rid], harris[rid]
        pos = o["posLy"]
        d_rec = math.sqrt(sum(v * v for v in pos))
        cdir = [v / d_rec for v in pos]
        dist_ly = o["distLy"]
        rc = h["rcArcmin"] * ARCMIN * dist_ly
        rt = rc * 10 ** h["c"]
        dm = 5 * math.log10(dist_ly / LY_PC / 10)
        av = 3.1 * (h["ebv"] or 0.0)
        kept, inside = [], 0
        for sid, ra, dec, g, bprp, q, p in read_stars(cache / f"{stem}.txt"):
            if p < PROB_CUT or not q & 2:
                continue
            u = ecliptic(ra, dec)
            ang = math.acos(max(-1.0, min(1.0, sum(u[k] * cdir[k] for k in range(3)))))
            R = ang * d_rec
            if R >= rt:
                continue
            inside += 1
            abs_g = g - dm - 0.789 * av
            bv = 0.82 * (bprp - 0.413 * av) - 0.06
            kept.append((abs_g, sid, u, R, bv, p))
        kept.sort(key=lambda k: k[0])
        kept = kept[:MAX_STARS]
        out = []
        for abs_g, sid, u, R, bv, p in kept:
            dz = sample_depth(R, rc, rt, unit_hash(sid, 1), unit_hash(sid, 2))
            d = d_rec + dz
            out.append((abs_g, [d * u[k] - pos[k] for k in range(3)], bv, p))
        scale = max(1.0, max((max(abs(v) for v in s[1]) for s in out), default=1.0) * 1.001)
        offset = total
        for abs_g, xyz, bv, p in out:
            q = [int(round(v / scale * 32767)) for v in xyz]
            blob += struct.pack("<hhhhBBBx", *q, int(round(max(-32.0, min(32.0, abs_g)) * 1000)), int(round(max(0, min(255, (bv + 0.5) * 100)))), int(round(p * 200)), 0)
        total += len(out)
        rows.append({
            "id": rid, "harris": h["harris"], "file": stem, "offset": offset, "count": len(out), "scaleLy": round(scale, 3),
            "membersInRt": inside, "brightestKept": inside > len(out), "rcLy": round(rc, 2), "rtLy": round(rt, 1),
            "faintestG": round(max((k[0] for k in kept), default=0) + dm + 0.789 * av, 2) if kept else None,
        })
    head = struct.pack("<4sIII", MAGIC, VERSION, total, STRIDE)
    binary = head + bytes(blob)
    man = {
        "version": VERSION, "built": READ_ON, "stride": STRIDE, "count": total,
        "bin": {"bytes": len(binary), "sha256": hashlib.sha256(binary).hexdigest()},
        "cuts": {"prob": PROB_CUT, "qualityBit": 2, "insideTidalRadius": True, "maxStars": MAX_STARS},
        "measured": "each star's sky position (Gaia EDR3 RA, Dec), G magnitude and BP-RP colour",
        "modelled": "depth along the line of sight (King 1962 at the star's projected radius, Harris 1996 rc and c, seeded by Gaia source id), absolute magnitude (the map's distance, Harris E(B-V)) and the approximate B-V",
        "sources": {
            "members": "Vasiliev E. & Baumgardt H. 2021, MNRAS 505, 5978 (arXiv:2102.09568); Zenodo 10.5281/zenodo.4891252, clusters.zip, CC BY 4.0",
            "profile": "Harris W.E. 1996, AJ 112, 1487 (VizieR VII/202); King I.R. 1962, AJ 67, 471",
            "gaia": "ESA/Gaia/DPAC, Gaia Collaboration 2021, A&A 649, A1 (EDR3); CC BY-NC 3.0 IGO",
            "extinction": "Wang S. & Chen X. 2019, ApJ 877, 116 (A_G / A_V = 0.789, E(BP-RP) / A_V = 0.413)",
        },
        "licence": "Vasiliev & Baumgardt 2021 catalogue: CC BY 4.0; the stars are Gaia EDR3 measurements, CC BY-NC 3.0 IGO (ESA)",
        "clusters": rows,
    }
    return man, binary


def check() -> int:
    if not OUT_JSON.exists() or not OUT_BIN.exists():
        print("globular-members: the files are missing", file=sys.stderr)
        return 1
    man = json.loads(OUT_JSON.read_text())
    b = OUT_BIN.read_bytes()
    magic, version, count, stride = struct.unpack_from("<4sIII", b, 0)
    problems = []
    if magic != MAGIC or version != VERSION or stride != STRIDE:
        problems.append(f"the bin's head is {magic!r} v{version} stride {stride}")
    if len(b) != 16 + count * stride or man["bin"]["bytes"] != len(b):
        problems.append(f"the bin is {len(b)} bytes for {count} rows; the manifest says {man['bin']['bytes']}")
    if hashlib.sha256(b).hexdigest() != man["bin"]["sha256"]:
        problems.append("the bin's sha256 is not the manifest's")
    if sum(c["count"] for c in man["clusters"]) != count:
        problems.append("the clusters' counts do not add up to the bin's")
    ids = {g["id"] for g in json.loads(CLUSTERS.read_text())["globulars"]}
    for c in man["clusters"]:
        if c["id"] not in ids:
            problems.append(f"{c['id']} is not a globular of clusters.json")
    if problems:
        print("globular-members: " + "; ".join(problems), file=sys.stderr)
        return 1
    print(f"globular-members ok: {len(man['clusters'])} clusters, {count} stars, {len(b)} bytes")
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
        print(f"globular-members: {len(man['clusters'])} clusters, {man['count']} stars, {len(binary)} bytes")
    if a.check or not (a.fetch or a.bake):
        return check()
    return 0


if __name__ == "__main__":
    sys.exit(main())
