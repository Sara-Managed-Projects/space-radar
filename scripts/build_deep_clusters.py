#!/usr/bin/env python3
"""Star clusters as stars (internal spec 0076 W3-a, internal #871 and #819): the catalogue numbers behind
scene/deep/globular.js, baked into site/data/deep/clusters.json and site/data/deep/clusters.bin.

    python3 scripts/build_deep_clusters.py --fetch [--cache DIR]   # ask VizieR (two catalogues, about a minute)
    python3 scripts/build_deep_clusters.py --bake  [--cache DIR]   # the answers -> the two files
    python3 scripts/build_deep_clusters.py --check                 # the files are the size and hash the manifest says

GLOBULAR CLUSTERS (the 33 in site/data/dso.json). Harris W.E. 1996, AJ 112, 1487, "A Catalog of Parameters
for Globular Clusters in the Milky Way", as VizieR catalogue VII/202: per cluster its core radius Rc and
concentration c = log10(rt / rc) (so its tidal radius), its half-light radius, its integrated absolute V
magnitude MVt, its metallicity, its horizontal-branch ratio HBR, the V magnitude of its horizontal branch
with the apparent distance modulus, and its central luminosity density. Nothing per star: the stars are drawn
from these numbers at run time (scene/deep/globular.js, King 1962), and the manifest keeps the numbers only.

OPEN CLUSTERS (36 of the 37 in site/data/dso.json; M24 is a star cloud, not a cluster in the catalogue). Hunt
E.L. & Reffert S. 2023, A&A 673, A114, "Improving the open cluster census. II.", as VizieR catalogue
J/A+A/673/A114: its members table, Gaia DR3 stars each with a membership probability. KEPT: a member inside
the cluster's tidal radius (the catalogue's `inrt` flag) with a probability of at least PROB_CUT. For each:
  - its DIRECTION, Gaia's J2000 position (the catalogue's `_RA.icrs`, `_DE.icrs`), as measured;
  - its DEPTH, from its own parallax when the parallax places it to within a quarter of the cluster's
    half-member radius (DEPTH_FRACTION; the Hyades' stars nearly all, the Pleiades' brightest); otherwise
    MODELLED: an offset along the line of sight drawn, seeded by its Gaia source id, from a Plummer sphere
    whose projected half-number radius is the catalogue's r50 at the star's measured distance from the
    centre on the sky, and never past the tidal radius. The flags say which;
  - its absolute G magnitude, from its G magnitude, the cluster's distance (or its own, where measured),
    and the cluster's extinction A_V (A_G = 0.789 A_V, Wang & Chen 2019, ApJ 877, 116);
  - its colour, Gaia BP-RP less the cluster's reddening (E(BP-RP) = 0.413 A_V, the same paper), as an
    approximate B-V for the app's star colours (B-V = 0.82 (BP-RP)0 - 0.06: this map's linear fit, not a
    published relation);
  - its probability, kept so a card can say it.
  The cluster is placed where the map already places it (site/data/dso.json): every member keeps its own
  direction and its depth relative to the cluster's centre, and the centre sits at the record's distance.
  A member that is also a star of the map's own catalogue (HYG, site/data/stars3d.bin; within MATCH_ARCSEC
  and MATCH_MAG) is LEFT OUT: that star is drawn already, by scene/stars3d.js.

LICENCES. VizieR (https://cds.unistra.fr/vizier-org/licences_vizier.html, read 2026-10-16): "The data retrieved
with VizieR are free of usage in a scientific context ; however, as it is the usage in scientific
publication, the original authors and publication references including the publisher have to be
explicitely cited". A&A tables: "free for a scientific usage" (the same page). The members are Gaia DR3
measurements: ESA/Gaia/DPAC, CC BY-NC 3.0 IGO (https://www.cosmos.esa.int/web/gaia-users/license: "Gaia data
are distributed under the CC BY-NC 3.0 IGO license.", read 2026-10-16), so site/data/deep/clusters.bin is a
derived work under that non-commercial term (CREDITS.md section 3l, "Clusters (0076 W3-a)").
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DSO = ROOT / "site" / "data" / "dso.json"
STARS = ROOT / "site" / "data" / "stars3d.bin"
OUT_JSON = ROOT / "site" / "data" / "deep" / "clusters.json"
OUT_BIN = ROOT / "site" / "data" / "deep" / "clusters.bin"
DEFAULT_CACHE = Path.home() / "space-radar-handoff" / "release-1.2" / "W3-a" / "cache"
ASU = "https://vizier.cds.unistra.fr/viz-bin/asu-tsv"
UA = "space-radar (https://github.com/Sara-Managed-Projects/space-radar)"
READ_ON = "2026-10-16"

MAGIC = b"SRCL"
VERSION = 1
STRIDE = 12  # bytes per member: int16 x, y, z; int16 absG * 1000; uint8 B-V; uint8 probability; uint8 flags; pad
PROB_CUT = 0.5
DEPTH_FRACTION = 0.25
PLX_ZERO_POINT = -0.017  # mas: Gaia DR3's global parallax offset (Lindegren et al. 2021, A&A 649, A4)
MATCH_ARCSEC = 10.0
MATCH_MAG = 1.5
MAX_MEMBERS = 1500  # the brightest kept per cluster
LY_PC = 3.261563777167433
OBLIQUITY = math.radians(23.4392911)

# The deep-sky file's open clusters -> their name (or names) in Hunt & Reffert 2023. M39 is "Theia_517" there
# (its AllNames list NGC_7092); the Double Cluster is two; M24 (a Milky Way star cloud) has no row.
OPEN = {
    "m6": ["NGC_6405"], "m7": ["NGC_6475"], "m11": ["NGC_6705"], "m18": ["NGC_6613"], "m21": ["NGC_6531"],
    "m23": ["NGC_6494"], "m25": ["IC_4725"], "m26": ["NGC_6694"], "m29": ["NGC_6913"], "m34": ["NGC_1039"],
    "m35": ["NGC_2168"], "m36": ["NGC_1960"], "m37": ["NGC_2099"], "m38": ["NGC_1912"], "m39": ["Theia_517"],
    "m41": ["NGC_2287"], "m44": ["NGC_2632"], "m45": ["Melotte_22"], "m46": ["NGC_2437"], "m47": ["NGC_2422"],
    "m48": ["NGC_2548"], "m50": ["NGC_2323"], "m52": ["NGC_7654"], "m67": ["NGC_2682"], "m93": ["NGC_2447"],
    "m103": ["NGC_581"], "double-cluster": ["NGC_869", "NGC_884"], "hyades": ["Melotte_25"],
    "jewel-box": ["NGC_4755"], "ngc-2244": ["NGC_2244"], "ngc-3532": ["NGC_3532"], "ic-2602": ["IC_2602"],
    "ngc-6231": ["NGC_6231"], "christmas-tree-cluster": ["NGC_2264"], "owl-cluster": ["NGC_457"],
    "carolines-rose": ["NGC_7789"],
}
MEMBER_COLS = "Name,GaiaDR3,inrt,Prob,_RA.icrs,_DE.icrs,Plx,e_Plx,Gmag,BP-RP"
CLUSTER_COLS = "Name,N,Nt,RA_ICRS,DE_ICRS,r50,rt,r50pc,rcpc,rtpc,dist50,AV50,logAge50"


def asu(params: dict) -> str:
    url = ASU + "?" + urllib.parse.urlencode(params, safe="=,*/+")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read().decode("utf-8")
        except Exception as e:  # noqa: BLE001 -- a busy archive: wait and ask again
            if attempt == 3:
                raise
            print(f"  {e}; again", file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("unreachable")


def fetch(cache: Path) -> None:
    (cache / "members").mkdir(parents=True, exist_ok=True)
    (cache / "harris.tsv").write_text(asu({"-source": "VII/202/catalog", "-out.all": "", "-out.max": "500"}))
    (cache / "hr23-clusters.tsv").write_text(asu({"-source": "J/A+A/673/A114/clusters", "-out": CLUSTER_COLS, "-out.max": "8000"}))
    for names in OPEN.values():
        for n in names:
            text = asu({"-source": "J/A+A/673/A114/members", "-out": MEMBER_COLS, "-out.max": "20000", "Name": "==" + n})
            (cache / "members" / f"{n}.tsv").write_text(text)
            print(f"  {n}: {sum(1 for line in text.splitlines() if line and not line.startswith('#')) - 3} rows")


def rows(text: str) -> list[dict]:
    """VizieR's tab-separated answer: header, units, dashes, then rows."""
    lines = [line for line in text.splitlines() if line.strip() and not line.startswith("#")]
    head = [h.strip() for h in lines[0].split("\t")]
    return [dict(zip(head, (c.strip() for c in line.split("\t")))) for line in lines[3:]]


def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def ecliptic(ra_deg: float, dec_deg: float) -> tuple[float, float, float]:
    """Equatorial J2000 -> the sun-inertial (ecliptic J2000) axes, as scene/clusters.js eclDirection."""
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    x, y, z = math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)
    ce, se = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    return (x, y * ce + z * se, -y * se + z * ce)


def unit_hash(source_id: str, salt: int) -> float:
    """A fixed number in [0, 1) for a Gaia source id: the same on every build."""
    h = hashlib.sha256(f"{source_id}:{salt}".encode()).digest()
    return int.from_bytes(h[:8], "little") / 2**64


def plummer_z(u: float) -> float:
    """t = z / b for the line-of-sight density (1 + t^2)^(-5/2) of a Plummer sphere at fixed projected radius,
    whose CDF is 1/2 + t (2 t^2 + 3) / (4 (1 + t^2)^(3/2)): inverted by bisection."""
    lo, hi = -50.0, 50.0
    for _ in range(80):
        m = 0.5 * (lo + hi)
        f = 0.5 + m * (2 * m * m + 3) / (4 * (1 + m * m) ** 1.5)
        lo, hi = (m, hi) if f < u else (lo, m)
    return 0.5 * (lo + hi)


def hyg_directions():
    """The map's own catalogue (site/data/stars3d.bin, scene/stars3d.js parseStars3d): unit vectors and V."""
    b = STARS.read_bytes()
    count = struct.unpack_from("<I", b, 8)[0]
    out = []
    for i in range(count):
        x, y, z, _abs, app = struct.unpack_from("<fffff", b, 16 + i * 24)
        r = math.sqrt(x * x + y * y + z * z)
        if r > 0:
            out.append((x / r, y / r, z / r, app))
    return out


def harris_rows(cache: Path) -> dict[str, dict]:
    out = {}
    for r in rows((cache / "harris.tsv").read_text()):
        out[" ".join(r["ID"].split())] = r
    return out


def bake(cache: Path) -> tuple[dict, bytes]:
    dso = json.loads(DSO.read_text())
    recs = {o["id"]: o for o in dso["objects"]}
    harris = harris_rows(cache)

    globulars = []
    for o in dso["objects"]:
        if o.get("typeCode") != "GCl":
            continue
        h = harris.get(" ".join(o["designation"].split()))
        if not h:
            raise SystemExit(f"clusters: {o['id']} ({o['designation']}) has no row in Harris VII/202")
        rc, c = num(h["Rc"]), num(h["c"])
        if rc is None or c is None:
            raise SystemExit(f"clusters: {o['id']} has no core radius or concentration in Harris")
        d_hb = num(h["V(HB)"]) - num(h["(m-M)V"]) if num(h["V(HB)"]) is not None and num(h["(m-M)V"]) is not None else None
        globulars.append({
            "id": o["id"], "harris": h["ID"].strip(), "rcArcmin": rc, "c": c, "collapsed": h.get("n_c", "").strip().startswith("c"),
            "rhArcmin": num(h["Rh"]), "mvt": num(h["MVt"]), "feh": num(h["[Fe/H]"]), "hbr": num(h["HBR"]),
            "mHB": round(d_hb, 2) if d_hb is not None else None, "logRhoc": num(h["log(rhoc)"]), "rsunKpc": num(h["Rsun"]),
            "ebv": num(h["E(B-V)"]),
        })

    clusters = {r["Name"]: r for r in rows((cache / "hr23-clusters.tsv").read_text())}
    hyg = hyg_directions()
    cos_match = math.cos(math.radians(MATCH_ARCSEC / 3600))
    opens, blob = [], bytearray()
    total = 0
    for rid, names in OPEN.items():
        o = recs[rid]
        centre = ecliptic(o["raDeg"], o["decDeg"])
        pos = o["posLy"]
        d_rec = math.sqrt(sum(v * v for v in pos))
        kept, matched, measured = [], 0, 0
        row_info = []
        for n in names:
            cl = clusters[n]
            dist50, r50pc, rtpc, av = num(cl["dist50"]), num(cl["r50pc"]), num(cl["rtpc"]), num(cl["AV50"]) or 0.0
            row_info.append({"name": n, "dist50Pc": round(dist50, 1), "r50Pc": round(r50pc, 2), "rtPc": round(rtpc, 2), "av": round(av, 3), "logAge": num(cl["logAge50"])})
            cdir = ecliptic(num(cl["RA_ICRS"]), num(cl["DE_ICRS"]))
            # the map's catalogue stars near this cluster, once (a cone of the tidal radius on the sky and a margin)
            cone = math.cos(math.atan2(rtpc, dist50) + math.radians(0.5))
            near = [s for s in hyg if s[0] * cdir[0] + s[1] * cdir[1] + s[2] * cdir[2] >= cone]
            for m in rows((cache / "members" / f"{n}.tsv").read_text()):
                p = num(m["Prob"])
                if m["inrt"] != "True" or p is None or p < PROB_CUT:
                    continue
                g, bprp, plx, eplx = num(m["Gmag"]), num(m["BP-RP"]), num(m["Plx"]), num(m["e_Plx"])
                if g is None:
                    continue
                u = ecliptic(num(m["_RA.icrs"]), num(m["_DE.icrs"]))
                if any(s[0] * u[0] + s[1] * u[1] + s[2] * u[2] >= cos_match and abs(s[3] - g) <= MATCH_MAG for s in near):
                    matched += 1
                    continue
                # depth: own parallax when it is good to a quarter of r50, else a Plummer draw
                own = None
                if plx is not None and eplx is not None and plx - PLX_ZERO_POINT > 0:
                    d_own = 1000.0 / (plx - PLX_ZERO_POINT)
                    if d_own * eplx / (plx - PLX_ZERO_POINT) <= DEPTH_FRACTION * r50pc and abs(d_own - dist50) <= rtpc:
                        own = d_own
                cosr = max(-1.0, min(1.0, u[0] * cdir[0] + u[1] * cdir[1] + u[2] * cdir[2]))
                rproj = dist50 * math.tan(math.acos(cosr))
                if own is not None:
                    dz = own - dist50
                    measured += 1
                else:
                    b = math.sqrt(r50pc * r50pc + rproj * rproj)
                    dz = b * plummer_z(min(0.999999, max(1e-6, unit_hash(m["GaiaDR3"], 1))))
                    lim = math.sqrt(max(0.0, rtpc * rtpc - rproj * rproj))
                    dz = max(-lim, min(lim, dz))
                d_true = own if own is not None else dist50
                abs_g = g - 5 * math.log10(d_true / 10) - 0.789 * av
                bv = 0.82 * ((bprp if bprp is not None else 0.8) - 0.413 * av) - 0.06
                d_drawn_ly = d_rec + dz * LY_PC
                xyz = [d_drawn_ly * u[k] - pos[k] for k in range(3)]
                kept.append((abs_g, xyz, bv, p, 1 if own is not None else 0))
        kept.sort(key=lambda k: k[0])
        cut = len(kept) > MAX_MEMBERS
        kept = kept[:MAX_MEMBERS]
        measured = sum(k[4] for k in kept)
        scale = max(1.0, max((max(abs(v) for v in k[1]) for k in kept), default=1.0) * 1.001)
        offset = total
        for abs_g, xyz, bv, p, flag in kept:
            q = [int(round(v / scale * 32767)) for v in xyz]
            blob += struct.pack("<hhhhBBBx", *q, int(round(max(-32.0, min(32.0, abs_g)) * 1000)), int(round(max(0, min(255, (bv + 0.5) * 100)))), int(round(p * 200)), flag)
        total += len(kept)
        opens.append({
            "id": rid, "hr23": row_info, "offset": offset, "count": len(kept), "scaleLy": round(scale, 3),
            "measuredDepth": measured, "inHyg": matched, "brightestKept": cut,
            "centreDeg": [o["raDeg"], o["decDeg"]], "centreEcl": [round(v, 7) for v in centre],
        })

    head = struct.pack("<4sIII", MAGIC, VERSION, total, STRIDE)
    binary = head + bytes(blob)
    manifest = {
        "version": VERSION,
        "built": READ_ON,
        "stride": STRIDE,
        "count": total,
        "bin": {"bytes": len(binary), "sha256": hashlib.sha256(binary).hexdigest()},
        "cuts": {"prob": PROB_CUT, "insideTidalRadius": True, "depthFraction": DEPTH_FRACTION, "maxMembers": MAX_MEMBERS,
                 "matchArcsec": MATCH_ARCSEC, "matchMag": MATCH_MAG, "plxZeroPointMas": PLX_ZERO_POINT},
        "sources": {
            "globular": "Harris W.E. 1996, AJ 112, 1487 (VizieR VII/202)",
            "open": "Hunt E.L. & Reffert S. 2023, A&A 673, A114 (VizieR J/A+A/673/A114), Gaia DR3 members",
            "gaia": "ESA/Gaia/DPAC, Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1; CC BY-NC 3.0 IGO",
            "extinction": "Wang S. & Chen X. 2019, ApJ 877, 116 (A_G / A_V = 0.789, E(BP-RP) / A_V = 0.413)",
        },
        "licence": "the members are Gaia DR3 data, CC BY-NC 3.0 IGO (ESA); VizieR: free of usage in a scientific context, authors cited",
        "globulars": globulars,
        "open": opens,
    }
    return manifest, binary


def write(manifest: dict, binary: bytes) -> None:
    OUT_BIN.parent.mkdir(parents=True, exist_ok=True)
    OUT_BIN.write_bytes(binary)
    OUT_JSON.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n")


def check() -> int:
    problems = []
    if not OUT_JSON.exists() or not OUT_BIN.exists():
        print("clusters: the files are missing", file=sys.stderr)
        return 1
    man = json.loads(OUT_JSON.read_text())
    b = OUT_BIN.read_bytes()
    magic, version, count, stride = struct.unpack_from("<4sIII", b, 0)
    if magic != MAGIC or version != VERSION or stride != STRIDE:
        problems.append(f"the bin's head is {magic!r} v{version} stride {stride}")
    if len(b) != 16 + count * stride or man["bin"]["bytes"] != len(b):
        problems.append(f"the bin is {len(b)} bytes for {count} rows; the manifest says {man['bin']['bytes']}")
    if hashlib.sha256(b).hexdigest() != man["bin"]["sha256"]:
        problems.append("the bin's sha256 is not the manifest's")
    if sum(o["count"] for o in man["open"]) != count:
        problems.append("the clusters' counts do not add up to the bin's")
    ids = {o["id"] for o in json.loads(DSO.read_text())["objects"]}
    for row in man["globulars"] + man["open"]:
        if row["id"] not in ids:
            problems.append(f"{row['id']} is not a record of site/data/dso.json")
    if problems:
        print("clusters: " + "; ".join(problems), file=sys.stderr)
        return 1
    print(f"clusters ok: {len(man['globulars'])} globulars, {len(man['open'])} open clusters, {count} members, {len(b)} bytes")
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
        write(man, binary)
        print(f"clusters: {len(man['globulars'])} globulars, {len(man['open'])} open clusters, {man['count']} members, {len(binary)} bytes")
    if a.check or not (a.fetch or a.bake):
        return check()
    return 0


if __name__ == "__main__":
    sys.exit(main())
