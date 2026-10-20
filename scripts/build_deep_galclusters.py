#!/usr/bin/env python3
"""Galaxy clusters and quasars (internal spec 0076 W4-b, internal #784): the members behind scene/deep/galclusters.js, baked
into site/data/deep/galclusters.json and site/data/deep/galclusters.bin.

    python3 scripts/build_deep_galclusters.py --fetch [--cache DIR]   # ask VizieR and SkyServer (a few minutes)
    python3 scripts/build_deep_galclusters.py --bake  [--cache DIR]   # the answers -> the two files
    python3 scripts/build_deep_galclusters.py --check                 # the files are the size and hash the manifest says

THE FOUR CLUSTERS (registry/galaxy-clusters.yaml holds the hand-kept facts and the sources read).
  Virgo    EVCC, Kim and others 2014, ApJS 215, 22 (VizieR J/ApJS/215/22/table2): the galaxies its infall model calls members
           (MmI = M): a position, a SDSS g and r magnitude, a half-light radius R50 in arcsec. The 84 of them that Mei and
           others 2007, ApJ 655, 144 (VizieR J/ApJ/655/144/table1) measured by surface brightness fluctuations stand at
           their OWN distance (the distance modulus m-M); the rest at the cluster's 16.5 Mpc.
  Coma     Kang and others 2025, ApJS 278, 51 (VizieR J/ApJS/278/51/table2): the objects its flag Mm = 1 calls members
           (redshift and r magnitude), joined by their SDSS object id to the DR17 photometry (petroR50_r, g and r model
           magnitudes, extinction) through SkyServer. The cluster's distance is the members' mean redshift carried to a
           comoving distance in the map's one cosmology.
  Fornax   Ferguson 1989, AJ 98, 367 (VizieR VII/180/p2tbl2): the likely members, B_T and, where it has one, an effective
           radius in arcsec. The cluster's distance is Blakeslee and others 2009's SBF mean, 20.0 Mpc.
  Perseus  Kang and others 2024, ApJS 272, 22 (VizieR J/ApJS/272/22/table2), as Coma.

WHAT IS MEASURED, WHAT IS MODELLED.
  - DIRECTION: measured (the catalogue's J2000 position).
  - DISTANCE: a member's own where SBF measured one (84 Virgo galaxies); otherwise its cluster's, by the method the registry says.
  - DEPTH inside the cluster of a member with no distance of its own: MODELLED. An offset along our line of sight, drawn
    (seeded by the member's id) from a Gaussian, cut at 2.5 sigma, whose sigma is the cluster's published rms SBF scatter where
    there is one (Virgo 0.6 Mpc, Fornax 0.49 Mpc) and otherwise (Coma, Perseus) the members' own spread on the sky, read as the
    same spread in depth, since a cluster is round: an assumption, and the manifest says so. Without it a cluster seen from the
    side would be one thin curved sheet, a flat picture pretending to be 3D.
  - SIZE: the catalogue's half-light radius (R50, petroR50_r, or Reff) at the member's distance; a member with none (some Fornax
    dwarfs) has size 0 and is drawn as a point. Its flag says so.
  - BRIGHTNESS: the catalogue's apparent magnitude in its own band (SDSS g in Virgo, r in Coma and Perseus, B_T in Fornax), turned
    to an absolute magnitude at the member's distance; the layer shows it as an exposure, not as photometry.
  - COLOUR: g - r where the catalogue has both, else none (a neutral white).
  - A galaxy within DSO_MATCH_ARCSEC of a galaxy the map already draws as a deep-sky record (site/data/dso.json) is LEFT OUT: one
    galaxy, one mark.

THE QUASARS are read from registry/exotics.yaml (kind: quasar; the redshift and the apparent magnitude) and from the `quasars:` list of
registry/galaxy-clusters.yaml (the host galaxy, only where a source states its size). The manifest keeps the numbers; the layer
draws them at the record's own place, which is the comoving distance of the redshift.

LICENCES (read 2026-10-20). VizieR (https://cds.unistra.fr/vizier-org/licences_vizier.html): "The data retrieved with VizieR are free
of usage in a scientific context ; however, as it is the usage in scientific publication, the original authors and publication
references including the publisher have to be explicitely cited". SDSS (https://www.sdss.org/collaboration/): "All SDSS data
released in our public data releases are considered in the public domain." See CREDITS.md section 3l, "Galaxy clusters and
quasars (0076 W4-b)".

FILE. site/data/deep/galclusters.bin: "SRGC", u32 version, u32 count, u32 stride (20), then count rows of
  f32 ox, oy, oz    the member's place less the cluster's centre, million light-years, heliocentric ecliptic J2000 axes
  f32 re            its half-light radius, million light-years (0: unresolved, drawn as a point)
  i16 absmag * 200  the absolute magnitude in the catalogue's band
  u8  colour        (g - r + 0.2) * 100, 1 to 255; 0: none
  u8  flags         bit 0: the distance is its own (SBF); bit 1: the size is measured
the clusters' rows follow one another in the manifest's order.
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
REG = ROOT / "registry"
DSO = ROOT / "site" / "data" / "dso.json"
OUT_JSON = ROOT / "site" / "data" / "deep" / "galclusters.json"
OUT_BIN = ROOT / "site" / "data" / "deep" / "galclusters.bin"
DEFAULT_CACHE = Path.home() / "space-radar-handoff" / "release-1.2" / "W4-b" / "cache"
ASU = "https://vizier.cds.unistra.fr/viz-bin/asu-tsv"
SKY = "https://skyserver.sdss.org/dr17/SkyServerWS/SearchTools/SqlSearch"
UA = "space-radar (https://github.com/Sara-Managed-Projects/space-radar)"
READ_ON = "2026-10-20"

MAGIC = b"SRGC"
VERSION = 1
STRIDE = 20
OBLIQUITY = math.radians(23.4392911)
MPC_MLY = 3.261563777167433            # million light-years in a megaparsec
ARCSEC = math.pi / 648000.0
DSO_MATCH_ARCSEC = 90.0
DEPTH_CUT = 2.5                        # sigma
H0, OMEGA_M, C_KMS = 67.66, 0.3111, 299792.458  # Planck 2018 (data/cosmology.js); flat, the light's share ignored at z < 0.1

VIRGO_COLS = "EVCC,VCC,NGC,RAJ2000,DEJ2000,cz,MmI,MmV,gmag,rmag,R50"
ACSVCS_COLS = "ACSVCS,VCC,m-M,e_m-M,BTmag,OName"
KANG_COLS = "ObjID,RAJ2000,DEJ2000,rmag,PS,z,e_z,Mm"
KANG_COLS_PERSEUS = "objID,RAJ2000,DEJ2000,rmag,PS,z,e_z,Mm"
FORNAX_COLS = "FCC,Mem,MType,BTmag,Reff,_RA.icrs,_DE.icrs"


# ------------------------------------------------------------------------------------------------ asking
def http(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read().decode("utf-8")
        except Exception as e:  # noqa: BLE001 -- a busy archive: wait and ask again
            if attempt == 3:
                raise
            print(f"  {e}; again", file=sys.stderr)
            time.sleep(5 * (attempt + 1))
    raise RuntimeError("unreachable")


def asu(params: dict) -> str:
    return http(ASU + "?" + urllib.parse.urlencode(params, safe="=,*/+"))


def sky(sql: str) -> str:
    return http(SKY + "?" + urllib.parse.urlencode({"cmd": sql, "format": "csv"}))


def kang_ids(text: str) -> list[str]:
    return [r["ObjID" if "ObjID" in r else "objID"] for r in rows(text)]


def fetch(cache: Path) -> None:
    cache.mkdir(parents=True, exist_ok=True)
    (cache / "evcc.tsv").write_text(asu({"-source": "J/ApJS/215/22/table2", "-out.max": "unlimited", "-out": VIRGO_COLS}))
    (cache / "acsvcs.tsv").write_text(asu({"-source": "J/ApJ/655/144/table1", "-out.max": "unlimited", "-out": ACSVCS_COLS + ",_RA,_DE"}))
    (cache / "coma.tsv").write_text(asu({"-source": "J/ApJS/278/51/table2", "-out.max": "unlimited", "Mm": "1", "-out": KANG_COLS}))
    (cache / "perseus.tsv").write_text(asu({"-source": "J/ApJS/272/22/table2", "-out.max": "unlimited", "Mm": "1", "-out": KANG_COLS_PERSEUS}))
    (cache / "fornax.tsv").write_text(asu({"-source": "VII/180/p2tbl2", "-out.max": "unlimited", "-out": FORNAX_COLS}))
    for name in ("coma", "perseus"):
        ids = kang_ids((cache / f"{name}.tsv").read_text())
        out = ["objID,petroR50_r,modelMag_g,modelMag_r,extinction_g,extinction_r"]
        for i in range(0, len(ids), 60):
            chunk = ",".join(ids[i:i + 60])
            text = sky(f"SELECT objID,petroR50_r,modelMag_g,modelMag_r,extinction_g,extinction_r FROM PhotoObjAll WHERE objID IN ({chunk})")
            out += [ln for ln in text.splitlines() if ln and not ln.startswith("#") and not ln.startswith("objID")]
        (cache / f"sdss-{name}.csv").write_text("\n".join(out) + "\n")
        print(f"  {name}: {len(ids)} members, {len(out) - 1} SDSS rows")


# ----------------------------------------------------------------------------------------------- reading
def rows(text: str) -> list[dict]:
    """VizieR's tab-separated answer: header, units, dashes, then rows."""
    lines = [line for line in text.splitlines() if line.strip() and not line.startswith("#")]
    head = [h.strip() for h in lines[0].split("\t")]
    return [dict(zip(head, (c.strip() for c in line.split("\t")))) for line in lines[3:]]


def num(s):
    try:
        v = float(s)
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) else None


def ecliptic(ra_deg: float, dec_deg: float) -> tuple[float, float, float]:
    """Equatorial J2000 -> the sun-inertial (ecliptic J2000) axes, as scene/clusters.js eclDirection."""
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    x, y, z = math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)
    ce, se = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    return (x, y * ce + z * se, -y * se + z * ce)


def sexa(text: str, hours: bool) -> float:
    parts = text.split()
    sign = -1.0 if parts[0].startswith("-") else 1.0
    v = abs(float(parts[0])) + float(parts[1]) / 60 + float(parts[2]) / 3600
    return sign * v * (15.0 if hours else 1.0)


def comoving_mly(z: float) -> float:
    """The comoving distance of a redshift in flat Planck 2018, million light-years (Simpson; data/cosmology.js is the app's)."""
    n = 2000
    f = lambda t: 1.0 / math.sqrt(OMEGA_M * (1 + t) ** 3 + (1 - OMEGA_M))  # noqa: E731
    h = z / n
    s = f(0) + f(z) + sum((4 if i % 2 else 2) * f(i * h) for i in range(1, n))
    return (C_KMS / H0) * (s * h / 3) * MPC_MLY


def unit_hash(key: str, salt: int) -> float:
    h = hashlib.sha1(f"{key}:{salt}".encode()).digest()
    return (int.from_bytes(h[:6], "big") + 0.5) / float(1 << 48)


def gauss(key: str) -> float:
    u1, u2 = unit_hash(key, 1), unit_hash(key, 2)
    return math.sqrt(-2.0 * math.log(u1)) * math.cos(2 * math.pi * u2)


def abs_mag(m: float, d_mly: float) -> float:
    return m - 5.0 * math.log10(d_mly * 1e6 / 3.261563777167433 / 10.0)


def dso_galaxies() -> list[tuple[str, tuple[float, float, float]]]:
    out = []
    for o in json.loads(DSO.read_text())["objects"]:
        if o.get("kind") == "galaxy" and o.get("raDeg") is not None:
            out.append((f"dso-{o['id']}", ecliptic(o["raDeg"], o["decDeg"])))
    return out


# -------------------------------------------------------------------------------------------- the members
class Member:
    __slots__ = ("key", "ra", "dec", "mag", "re_arcsec", "gr", "own_mpc", "z")

    def __init__(self, key, ra, dec, mag, re_arcsec=None, gr=None, own_mpc=None, z=None):
        self.key, self.ra, self.dec, self.mag, self.re_arcsec, self.gr, self.own_mpc, self.z = key, ra, dec, mag, re_arcsec, gr, own_mpc, z


def virgo_members(cache: Path):
    sbf = {}
    for r in rows((cache / "acsvcs.tsv").read_text()):
        mm = num(r.get("m-M"))
        if mm is not None and r.get("VCC"):
            sbf[r["VCC"]] = 10 ** ((mm + 5) / 5) / 1e6   # Mpc
    out = []
    for r in rows((cache / "evcc.tsv").read_text()):
        if r["MmI"] != "M":
            continue
        g, rr = num(r["gmag"]), num(r["rmag"])
        if g is None or num(r["RAJ2000"]) is None:
            continue
        out.append(Member(f"evcc{r['EVCC']}", num(r["RAJ2000"]), num(r["DEJ2000"]), g, num(r["R50"]), (g - rr) if rr is not None else None,
                          sbf.get(r["VCC"]) if r["VCC"] else None, num(r["cz"])))
    return out, len(sbf)


def kang_members(cache: Path, name: str):
    phot = {}
    for line in (cache / f"sdss-{name}.csv").read_text().splitlines()[1:]:
        c = line.split(",")
        if len(c) >= 6:
            phot[c[0]] = [num(x) for x in c[1:6]]
    out = []
    for r in rows((cache / f"{name}.tsv").read_text()):
        oid = r.get("ObjID") or r.get("objID")
        ra, dec, rmag, z = num(r["RAJ2000"]), num(r["DEJ2000"]), num(r["rmag"]), num(r["z"])
        if None in (ra, dec, rmag, z):
            continue
        p = phot.get(oid, [None] * 5)
        r50 = p[0] if p[0] and p[0] > 0.05 else None
        gr = (p[1] - p[3]) - (p[2] - p[4]) if None not in p[1:] else None
        out.append(Member(f"sdss{oid}", ra, dec, rmag, r50, gr, None, z))
    return out


def fornax_members(cache: Path):
    out = []
    for r in rows((cache / "fornax.tsv").read_text()):
        b = num(r["BTmag"])
        if b is None:
            continue
        ra, dec = sexa(r["_RA.icrs"], True), sexa(r["_DE.icrs"], False)
        reff = num(r["Reff"])
        out.append(Member(f"fcc{r['FCC']}", ra, dec, b, reff if reff and reff > 0 else None, None, None, None))
    return out


# ------------------------------------------------------------------------------------------------- baking
def bake_cluster(cid: str, row: dict, members: list[Member], dso: list, extra: dict) -> tuple[dict, bytes]:
    method = row["distance"]["method"]
    zbar = None
    if method == "sbf":
        d_mly = row["distance"]["mpc"] * MPC_MLY
    else:
        zbar = sum(m.z for m in members) / len(members)
        d_mly = comoving_mly(zbar)
    # Leave out what the map draws already.
    kept, excluded = [], []
    cut = math.cos(DSO_MATCH_ARCSEC * ARCSEC)
    for m in members:
        v = ecliptic(m.ra, m.dec)
        hit = next((i for i, w in dso if v[0] * w[0] + v[1] * w[1] + v[2] * w[2] > cut), None)
        if hit:
            excluded.append(hit)
        else:
            kept.append(m)
    # The centre: the mean direction of the members, and the sky spread in million light-years at the cluster's distance.
    dirs = [ecliptic(m.ra, m.dec) for m in kept]
    cx, cy, cz = (sum(d[k] for d in dirs) / len(dirs) for k in range(3))
    cn = math.sqrt(cx * cx + cy * cy + cz * cz)
    c = (cx / cn, cy / cn, cz / cn)
    sp = []
    for d in dirs:
        dot = max(-1.0, min(1.0, c[0] * d[0] + c[1] * d[1] + c[2] * d[2]))
        sp.append(math.acos(dot) * d_mly)
    sky_rms = math.sqrt(sum(s * s for s in sp) / len(sp) / 2.0)   # one axis' rms: half of the 2-D mean square
    if row["depth"]["kind"] == "measured":
        sigma = row["depth"]["rms_mpc"] * MPC_MLY
        depth_note = "the published rms scatter of the cluster's SBF distances"
    else:
        sigma = sky_rms
        depth_note = "the members' spread on the sky, read as the same spread in depth (a cluster is round: an assumption)"
    C = tuple(c[k] * d_mly for k in range(3))
    ra_c = math.degrees(math.atan2(c[1] * math.cos(OBLIQUITY) - c[2] * math.sin(OBLIQUITY), c[0])) % 360
    dec_c = math.degrees(math.asin(max(-1, min(1, c[1] * math.sin(OBLIQUITY) + c[2] * math.cos(OBLIQUITY)))))
    body = bytearray()
    own = sized = 0
    far = 0.0
    mags = []
    for m, d in zip(kept, dirs):
        flags = 0
        if m.own_mpc:
            dm = m.own_mpc * MPC_MLY
            flags |= 1
            own += 1
            dep = dm
        else:
            dm = d_mly
            dep = d_mly + max(-DEPTH_CUT, min(DEPTH_CUT, gauss(f"{cid}:{m.key}"))) * sigma
        re_mly = 0.0
        if m.re_arcsec:
            re_mly = m.re_arcsec * ARCSEC * dm
            flags |= 2
            sized += 1
        off = (d[0] * dep - C[0], d[1] * dep - C[1], d[2] * dep - C[2])
        far = max(far, math.sqrt(sum(o * o for o in off)))
        am = abs_mag(m.mag, dm)
        mags.append(am)
        col = 0 if m.gr is None else max(1, min(255, round((m.gr + 0.2) * 100)))
        body += struct.pack("<ffffhBB", off[0], off[1], off[2], re_mly, max(-32000, min(32000, round(am * 200))), col, flags)
    info = {
        "id": cid, "name": row["name"], "aliases": row.get("aliases", []), "count": len(kept),
        "centre": {"raDeg": round(ra_c, 4), "decDeg": round(dec_c, 4), "dir": [round(x, 6) for x in c], "note": "the mean direction of the members drawn"},
        "distMly": round(d_mly, 3), "distMpc": round(d_mly / MPC_MLY, 3),
        "distance": {**row["distance"], **({"zMean": round(zbar, 6)} if zbar is not None else {})},
        "depth": {"kind": row["depth"]["kind"], "sigmaMly": round(sigma, 3), "cutSigma": DEPTH_CUT, "note": depth_note},
        "radiusMly": round(far, 3), "own": own, "sized": sized, "excluded": sorted(set(excluded)),
        "absMagRange": [round(min(mags), 2), round(max(mags), 2)],
        "catalogue": row["catalogue"], "source": row["source"], **extra,
    }
    return info, bytes(body)


def bake(cache: Path) -> tuple[dict, bytes]:
    import yaml
    reg = yaml.safe_load((REG / "galaxy-clusters.yaml").read_text())
    exo = {r["id"]: r for r in yaml.safe_load((REG / "exotics.yaml").read_text())["exotics"]}
    dso = dso_galaxies()
    byid = {c["id"]: c for c in reg["clusters"]}
    virgo, n_sbf = virgo_members(cache)
    sets = {
        "virgo": (virgo, {"band": "SDSS g", "sbfInCatalogue": n_sbf}),
        "coma": (kang_members(cache, "coma"), {"band": "SDSS r (extinction corrected Petrosian)"}),
        "fornax": (fornax_members(cache), {"band": "B_T"}),
        "perseus": (kang_members(cache, "perseus"), {"band": "SDSS r (extinction corrected Petrosian)"}),
    }
    infos, blobs = [], bytearray()
    for cid in ("virgo", "coma", "fornax", "perseus"):
        members, extra = sets[cid]
        info, blob = bake_cluster(cid, byid[cid], members, dso, extra)
        info["offset"] = len(blobs) // STRIDE
        infos.append(info)
        blobs += blob
    quasars = []
    for q in reg["quasars"]:
        e = exo[q["id"]]
        if e.get("kind") != "quasar":
            raise SystemExit(f"{q['id']} is not a quasar row of registry/exotics.yaml")
        quasars.append({"id": q["id"], "record": f"exotic-{q['id']}", "name": e["name"], "redshift": e["redshift"], "vmag": e["vmag"],
                        "host": q["host"] if q["host"] != "none" else None, "note": q.get("note")})
    head = struct.pack("<4sIII", MAGIC, VERSION, len(blobs) // STRIDE, STRIDE)
    binary = head + bytes(blobs)
    man = {
        "version": VERSION, "built": READ_ON, "stride": STRIDE, "count": len(blobs) // STRIDE,
        "bin": {"bytes": len(binary), "sha256": hashlib.sha256(binary).hexdigest()},
        "cuts": {"virgo": "EVCC members by the infall model (MmI = M)", "coma": "Kang+ 2025 flag Mm = 1", "fornax": "Ferguson 1989 likely members",
                 "perseus": "Kang+ 2024 flag Mm = 1", "dsoMatchArcsec": DSO_MATCH_ARCSEC},
        "licence": "VizieR: free of usage in a scientific context, the original authors cited; SDSS: all data released in public data releases are in the public domain",
        "sources": {
            "evcc": "Kim and others 2014, ApJS 215, 22 (VizieR J/ApJS/215/22/table2)",
            "sbf": "Mei and others 2007, ApJ 655, 144 (VizieR J/ApJ/655/144/table1)",
            "coma": "Kang and others 2025, ApJS 278, 51 (VizieR J/ApJS/278/51/table2)",
            "perseus": "Kang and others 2024, ApJS 272, 22 (VizieR J/ApJS/272/22/table2)",
            "fornax": "Ferguson 1989, AJ 98, 367 (VizieR VII/180/p2tbl2); distance Blakeslee and others 2009, ApJ 694, 556",
            "sdss": "SDSS DR17 through SkyServer (petroR50_r, g and r model magnitudes and extinction)",
        },
        "clusters": infos, "quasars": quasars,
    }
    return man, binary


def write(man: dict, binary: bytes) -> None:
    OUT_BIN.parent.mkdir(parents=True, exist_ok=True)
    OUT_BIN.write_bytes(binary)
    OUT_JSON.write_text(json.dumps(man, indent=1, sort_keys=False) + "\n")


def check() -> int:
    problems = []
    if not OUT_JSON.exists() or not OUT_BIN.exists():
        print("galclusters: the files are missing", file=sys.stderr)
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
    if sum(c["count"] for c in man["clusters"]) != count:
        problems.append("the clusters' counts do not add up to the bin's")
    try:
        import yaml
        reg = yaml.safe_load((REG / "galaxy-clusters.yaml").read_text())
        if [c["id"] for c in reg["clusters"]] != [c["id"] for c in man["clusters"]]:
            problems.append("the clusters are not the registry's")
        if [q["id"] for q in reg["quasars"]] != [q["id"] for q in man["quasars"]]:
            problems.append("the quasars are not the registry's")
    except ImportError:
        pass
    if problems:
        print("galclusters: " + "; ".join(problems), file=sys.stderr)
        return 1
    print(f"galclusters ok: {len(man['clusters'])} clusters, {count} members, {len(b)} bytes")
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
        for c in man["clusters"]:
            print(f"  {c['id']}: {c['count']} members, {c['distMpc']} Mpc ({c['distance']['method']}), {c['own']} at their own distance, {c['sized']} sized, "
                  f"depth sigma {c['depth']['sigmaMly']} Mly ({c['depth']['kind']}), radius {c['radiusMly']} Mly, {len(c['excluded'])} left out as records")
        print(f"galclusters: {man['count']} members, {len(binary)} bytes")
    if a.check or not (a.fetch or a.bake):
        return check()
    return 0


if __name__ == "__main__":
    sys.exit(main())
