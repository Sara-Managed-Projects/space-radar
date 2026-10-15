#!/usr/bin/env python3
"""The local volume's galaxies -> one static tile, site/data/deep/localvolume.{bin,json}
(internal spec 0075 task 16, DS-D04, DS-D06; design sections 2 and 10).

THE SOURCE. The Updated Nearby Galaxy Catalog: Karachentsev, Makarov & Kaisina 2013, AJ 145, 101,
"Updated nearby galaxy catalog" (CDS VizieR J/AJ/145/101): 869 galaxies with an individual distance
under 11 Mpc (about 36 million light-years) or a Local Group velocity under 600 km/s. Its table1
gives each galaxy's place, Holmberg diameter, B magnitude, type, distance and the METHOD of that
distance; its table6 the distance modulus with its error where there is one. Both are read from the
CDS archive by this script, outside the browser, and pinned below by SHA-256: a file that does not
match is refused, so the tile cannot change without this file changing.

WHAT IS MEASURED AND WHAT IS NOT (the honesty rule of spec 0075, package section 6.1: "for inaccurate
or unknown distance, preserve sky direction while visualizing line-of-sight depth uncertainty. Never
assign a precise Z from a missing number"):
  - MEASURED: a distance from the galaxy's own light (TRGB, Cepheids, SBF, Tully-Fisher, brightest
    stars, ...). Drawn as a point. Its range is the catalogue's own error of the distance modulus
    where table6 gives one (sigma_d / d = ln 10 / 5 * e_DM); else 5 % for the tip of the red giant
    branch (Rizzi et al. 2007, as the catalogue's section 2 quotes it) and 25 % for any other method
    (the coarsest accuracy section 2 names, "not better than 25%", for the brightest stars): an
    assumption of this map, and the tile says so per galaxy (`rangeAssumed`).
  - INFERRED: no distance of its own. `mem` takes its group's, `h` and `h'` its velocity's through
    H0 = 73, `txt` its texture's ("likely proximity"). Drawn as a fainter, wider point in its own
    grey-blue at its most likely distance, so it is never taken for a measured one; its range is a line
    along its sky direction shown only for the one galaxy asked for. The catalogue's section 2 gives
    "about 2 Mpc" as the typical error of such distances, so the range runs from D - 2 Mpc (not nearer
    than a fifth of D) to D + 2 Mpc.
  - Not in the tile: the Milky Way's own row, and every galaxy the map already draws as a deep-sky
    record (site/data/dso.json: the LMC, Andromeda, M81...): one galaxy, one mark.

THE TILE (package section 6.2). One tile, because 869 points are one draw call: a header, then
float32 rows of STRIDE values:
    ex ey ez    unit direction, heliocentric ecliptic J2000 (the map's sun-inertial frame)
    d lo hi     distance and its range, million light-years
    r           half the Holmberg diameter, million light-years (0: not catalogued)
    mabs        absolute B magnitude (NaN: no B magnitude)
    kind        0 early type (E, S0, spheroidal), 1 spiral, 2 irregular or blue dwarf, 3 unknown
    flags       bit 0 inferred (a line, not a point); bit 1 range assumed; bits 8-15 the method index
The manifest (localvolume.json) carries the count, the bounds, the bytes and their SHA-256, the
methods, the source and its terms, the galaxies left out and why, and every name in tile order.

    python3 scripts/build_deep_localvolume.py --from DIR     # DIR holds ReadMe, table1.dat, table6.dat
    python3 scripts/build_deep_localvolume.py --fetch DIR    # read them from CDS into DIR first
    python3 scripts/build_deep_localvolume.py --check --from DIR
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_BIN = ROOT / "site/data/deep/localvolume.bin"
OUT_JSON = ROOT / "site/data/deep/localvolume.json"
DSO = ROOT / "site/data/dso.json"

BASE = "https://cdsarc.cds.unistra.fr/ftp/J/AJ/145/101/"
READ_ON = "2026-10-14"
PINNED = {  # sha256 of the files as read on READ_ON
    "ReadMe": "cbf378cafcdbf529a98297a8e86cf04a9f2e5e2f55e5f23ab09976591ff18af7",
    "table1.dat": "0d98691e4b04189e0359be7e55e8e9fa6c6d75fe085d833aad4ef5d1e101ce17",
    "table6.dat": "199187c501d9570bd27b8d7ca5c9a923e16f7d0d1a6ba13659e4af2c7db5fa1b",
}
USER_AGENT = "space-radar (https://github.com/Sara-Managed-Projects/space-radar)"

MAGIC = b"SRLV"
VERSION = 1
STRIDE = 10
MPC_MLY = 3.2615637771674333  # 1 Mpc in million (Julian-year) light-years
OBLIQUITY = math.radians(23.4392911)  # as scripts/build-dso.py

# The catalogue's methods (its ReadMe, note G1), in a fixed order: the index is the tile's.
METHODS = [
    ("TRGB", "the tip of the red giant branch", "measured"),
    ("Cep", "Cepheid variables", "measured"),
    ("geom", "geometry", "measured"),
    ("SN", "a supernova", "measured"),
    ("SBF", "surface brightness fluctuations", "measured"),
    ("TF", "the Tully-Fisher relation", "measured"),
    ("FP", "the fundamental plane", "measured"),
    ("BS", "its brightest stars", "measured"),
    ("CMD", "its colour-magnitude diagram", "measured"),
    ("HB", "its horizontal branch", "measured"),
    ("RR", "RR Lyrae stars", "measured"),
    ("PNLF", "its planetary nebulae", "measured"),
    ("mem", "membership of a group with measured distances", "inferred"),
    ("h", "its velocity (Hubble flow, H0 = 73)", "inferred"),
    ("h'", "its velocity (Hubble flow with a Virgocentric model, H0 = 73)", "inferred"),
    ("txt", "its texture only (likely nearby; no velocity)", "inferred"),
]
METHOD_INDEX = {m[0]: i for i, m in enumerate(METHODS)}
TRGB_FRAC = 0.05
OTHER_FRAC = 0.25
INFERRED_MPC = 2.0
EDM_MAX = 1.5  # a modulus error larger than this is a misprint in the table (NGC5194 reads 24.23)
MATCH_ARCMIN = 1.5


def fetch(dirpath: Path) -> None:
    dirpath.mkdir(parents=True, exist_ok=True)
    for name in PINNED:
        req = urllib.request.Request(BASE + name, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=60) as r:
            (dirpath / name).write_bytes(r.read())


def read_pinned(dirpath: Path) -> dict[str, str]:
    out = {}
    for name, want in PINNED.items():
        data = (dirpath / name).read_bytes()
        got = hashlib.sha256(data).hexdigest()
        if got != want:
            raise SystemExit(f"localvolume: {name} is not the file read on {READ_ON} (sha256 {got}, pinned {want})")
        out[name] = data.decode("latin-1")
    return out


def col(line: str, a: int, b: int) -> str:
    """Bytes a..b of a fixed-width row, 1-based and inclusive as the ReadMe gives them."""
    return line[a - 1:b].strip()


def num(s: str):
    try:
        return float(s)
    except ValueError:
        return None


def ecliptic(ra_deg: float, dec_deg: float) -> tuple[float, float, float]:
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    x, y, z = math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)
    ce, se = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    return (x, y * ce + z * se, -y * se + z * ce)


def kind_of(tt, mcl: str) -> int:
    if mcl in ("Sph", "dE", "dS0em", "dEem", "Tr"):
        return 0
    if mcl in ("Ir", "Im", "BCD", "HIcld", "Sm"):
        return 2
    if tt is None:
        return 3
    if tt <= 0:
        return 0
    if tt <= 8:
        return 1
    return 2


def sep_arcmin(ra1, de1, ra2, de2) -> float:
    a1, d1, a2, d2 = map(math.radians, (ra1, de1, ra2, de2))
    c = math.sin(d1) * math.sin(d2) + math.cos(d1) * math.cos(d2) * math.cos(a1 - a2)
    return math.degrees(math.acos(max(-1.0, min(1.0, c)))) * 60


def build(dirpath: Path):
    files = read_pinned(dirpath)
    errors = {}
    for line in files["table6.dat"].splitlines():
        if not line.strip():
            continue
        e = num(col(line, 26, 30))
        if e is not None and 0 < e <= EDM_MAX:
            errors[col(line, 1, 18)] = (e, col(line, 32, 35))
    dso = json.loads(DSO.read_text())
    records = [o for o in dso["objects"] if o.get("kind") == "galaxy" and o.get("raDeg") is not None]

    lines = [ln for ln in files["table1.dat"].splitlines() if ln.strip()]

    def place(line):
        ra = (int(col(line, 20, 21)) + int(col(line, 23, 24)) / 60 + float(col(line, 26, 29)) / 3600) * 15
        sign = -1 if col(line, 31, 31) == "-" else 1
        return ra, sign * (int(col(line, 32, 33)) + int(col(line, 35, 36)) / 60 + int(col(line, 38, 39)) / 3600)

    # The same galaxy as a deep-sky record: the catalogue galaxy nearest a record's centre, within
    # 1.5 arcmin or 30 % of the record's own major axis (the two Fornax dwarfs' centres are 4.7 arcmin
    # apart, the LMC's degrees), at a distance within a factor of two, one per record. A companion
    # beside a big galaxy (NGC 5195 by M51, M32 by M31) stays itself.
    best = {}
    for k, line in enumerate(lines):
        ra, dec = place(line)
        d_ly = (num(col(line, 115, 119)) or 0) * MPC_MLY * 1e6
        for i, r in enumerate(records):
            s = sep_arcmin(ra, dec, r["raDeg"], r["decDeg"])
            same_depth = d_ly > 0 and r.get("distLy") and abs(math.log(d_ly / r["distLy"])) < math.log(2)
            if same_depth and s < max(MATCH_ARCMIN, 0.3 * (r.get("majAxArcmin") or 0)) and (i not in best or s < best[i][0]):
                best[i] = (s, k)
    twin_of = {k: records[i] for i, (s, k) in best.items()}

    rows, names, left_out = [], [], []
    for k, line in enumerate(lines):
        name = col(line, 1, 18)
        ra, dec = place(line)
        a26 = num(col(line, 41, 46))
        bmag = num(col(line, 66, 70))
        ab = num(col(line, 53, 56)) or 0.0
        tt = num(col(line, 99, 100))
        mcl = col(line, 102, 106)
        d_mpc = num(col(line, 115, 119))
        method = col(line, 121, 124)
        if name == "Milky Way":
            left_out.append({"name": name, "why": "our own galaxy: drawn by scene/galaxy.js"})
            continue
        if d_mpc is None or method not in METHOD_INDEX:
            raise SystemExit(f"localvolume: {name} has no distance or an unknown method {method!r}")
        twin = twin_of.get(k)
        if twin is not None:
            left_out.append({"name": name, "why": "already a deep-sky record", "record": "dso-" + twin["id"]})
            continue
        idx = METHOD_INDEX[method]
        inferred = METHODS[idx][2] == "inferred"
        assumed = False
        if inferred:
            lo = max(0.2 * d_mpc, d_mpc - INFERRED_MPC)
            hi = d_mpc + INFERRED_MPC
        else:
            e = errors.get(name)
            if e is not None and e[1] == method:
                frac = math.log(10) / 5 * e[0]
            else:
                frac = TRGB_FRAC if method == "TRGB" else OTHER_FRAC
                assumed = True
            lo, hi = d_mpc * (1 - frac), d_mpc * (1 + frac)
        r_mly = d_mpc * MPC_MLY * math.tan(math.radians(a26 / 60) / 2) if a26 else 0.0
        mabs = bmag - ab - 5 * math.log10(d_mpc * 1e6 / 10) if bmag is not None else float("nan")
        ex, ey, ez = ecliptic(ra, dec)
        flags = (1 if inferred else 0) | (2 if assumed else 0) | (idx << 8)
        rows.append((ex, ey, ez, d_mpc * MPC_MLY, lo * MPC_MLY, hi * MPC_MLY, r_mly, mabs, float(kind_of(tt, mcl)), float(flags)))
        names.append(name)

    body = b"".join(struct.pack("<%df" % STRIDE, *r) for r in rows)
    head = MAGIC + struct.pack("<III", VERSION, len(rows), STRIDE)
    blob = head + body
    far = max(r[5] for r in rows)
    n_inf = sum(1 for r in rows if int(r[9]) & 1)
    manifest = {
        "about": "The local volume's galaxies as one static tile (scripts/build_deep_localvolume.py; internal spec 0075 task 16)",
        "version": VERSION,
        "frame": "sun-inertial (heliocentric ecliptic J2000)",
        "units": "million light-years (Julian year)",
        "distances": "redshift-independent, as the catalogue gives them (no cosmology: all are within z < 0.01)",
        "tiles": [{
            "file": "localvolume.bin", "count": len(rows), "stride": STRIDE, "bytes": len(blob),
            "sha256": hashlib.sha256(blob).hexdigest(), "centre": [0, 0, 0], "radiusMly": round(far, 3),
            "points": len(rows) - n_inf, "lines": n_inf,
        }],
        "columns": ["ex", "ey", "ez", "dMly", "loMly", "hiMly", "radiusMly", "absBmag", "kind", "flags"],
        "kinds": ["early type (elliptical, lenticular, spheroidal)", "spiral", "irregular or blue dwarf", "type not given"],
        "methods": [{"code": c, "words": w, "kind": k} for c, w, k in METHODS],
        "uncertainty": {
            "measured": "the catalogue's error of the distance modulus (table6 e_DM); where there is none, 5 % for TRGB and 25 % for any other method (assumed; flag bit 1)",
            "inferred": "drawn as a fainter, wider grey-blue point at D; its range, from D - 2 Mpc (not nearer than D / 5) to D + 2 Mpc, is a line shown only for the one galaxy asked for: the catalogue's section 2, 'their typical distance measurement error is ~2 Mpc'",
        },
        "source": {
            "name": "Updated Nearby Galaxy Catalog (Karachentsev, Makarov & Kaisina 2013, AJ 145, 101)",
            "vizier": "J/AJ/145/101", "url": BASE, "read": READ_ON,
            "files": {k: {"sha256": v} for k, v in PINNED.items()},
            "terms": "https://cds.unistra.fr/vizier-org/licences_vizier.html",
            "terms_read": "The data retrieved with VizieR are free of usage in a scientific context; however, as it is the usage in scientific publication, the original authors and publication references including the publisher have to be explicitely cited",
            "credit": "Karachentsev I.D., Makarov D.I., Kaisina E.I. 2013, AJ 145, 101 (American Astronomical Society); via the VizieR catalogue access tool, CDS, Strasbourg, France",
        },
        "left_out": left_out,
        "names": names,
    }
    return blob, manifest


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--from", dest="src", type=Path, required=False, help="folder with ReadMe, table1.dat, table6.dat")
    ap.add_argument("--fetch", type=Path, help="read the three files from CDS into this folder first")
    ap.add_argument("--check", action="store_true", help="refuse a tile that differs from what the inputs build")
    a = ap.parse_args(argv)
    src = a.fetch or a.src
    if not src:
        ap.error("--from DIR or --fetch DIR")
    if a.fetch:
        fetch(a.fetch)
    blob, manifest = build(src)
    text = json.dumps(manifest, ensure_ascii=False, indent=1) + "\n"
    if a.check:
        same = OUT_BIN.exists() and OUT_BIN.read_bytes() == blob and OUT_JSON.exists() and OUT_JSON.read_text() == text
        print("localvolume: the tile is current" if same else "localvolume: the tile is stale; run scripts/build_deep_localvolume.py --from DIR")
        return 0 if same else 1
    OUT_BIN.parent.mkdir(parents=True, exist_ok=True)
    OUT_BIN.write_bytes(blob)
    OUT_JSON.write_text(text)
    t = manifest["tiles"][0]
    print(f"localvolume: {t['count']} galaxies ({t['points']} points, {t['lines']} lines), out to {t['radiusMly']} Mly; "
          f"{len(blob)} + {len(text.encode())} bytes; {len(manifest['left_out'])} left out")
    return 0


if __name__ == "__main__":
    sys.exit(main())
