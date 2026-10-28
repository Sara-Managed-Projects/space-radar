#!/usr/bin/env python3
"""The deep sky's catalogues, all of them (internal spec 0079 stage A2, internal #1060): every NGC and IC object,
the Caldwell 109 tagged, Green's 310 supernova remnants, Harris's 157 globular clusters and Hunt & Reffert's open
clusters, baked into compact quantised files that the page fetches on demand (scene/deep/catalogue.js).

    python3 scripts/build_deep_catalogue.py --fetch [--cache DIR]   # download the open catalogues (about a minute)
    python3 scripts/build_deep_catalogue.py --bake  [--cache DIR]   # the downloads -> site/data/deep/catalogue*
    python3 scripts/build_deep_catalogue.py --check                 # the files are the size the manifest says

Raw downloads live in ~/.cache/spaceradar-src/a2 (never committed). Output, two files and a manifest each:

  site/data/deep/catalogue.bin + catalogue.json     OpenNGC + Harris + Green        (CC BY-SA 4.0 and the open terms below)
  site/data/deep/catalogue-oc.bin + catalogue-oc.json   Hunt & Reffert 2023 open clusters, Gaia DR3 derived (CC BY-NC 3.0 IGO)

The two are apart so each file has one licence. A cluster that OpenNGC also lists keeps its OpenNGC row in the first
file; the second file holds only Hunt & Reffert's distance for it (`overlay`), so no OpenNGC datum sits in a
non-commercial file.

SOURCES (read 2026-10-28; the licence texts are quoted in CREDITS.md, section "Every known deep-sky object (0079 A2)")
  OpenNGC (Mattia Verga, CC BY-SA 4.0), NGC.csv + addendum.csv: the position, type, size, magnitude, Hubble type,
    parallax (Pax, mas), radial velocity and redshift, common names and cross-identifiers of 13 372 objects. The
    Caldwell numbers are in its Identifiers ("C 020"); the 109 are checked against Wikipedia's list (CC BY-SA 4.0).
  Harris W.E. 1996, AJ 112, 1487 (2010 edition), https://physwww.mcmaster.ca/~harris/mwgc.dat: 157 globular clusters
    with their distance from the Sun; "supplied free of charge to all users", the source to be named.
  Green D.A. 2025, J. Astrophys. Astron. 46, 14 (2024 October version), https://www.mrao.cam.ac.uk/surveys/snrs/:
    310 supernova remnants, position and size; no distance (the catalogue has none).
  Hunt E.L. & Reffert S. 2023, A&A 673, A114 (VizieR J/A+A/673/A114), the cluster table, from the release-1.2
    download (scripts/build_deep_clusters.py): 6 818 open clusters from Gaia DR3 with a distance each.
  HASH (the planetary nebulae, hashpn.space) is NOT used: its front page says "The access to the database is
    password protected - please register first", it states no licence for reuse, and nobody creates an account for
    this build. The planetary nebulae are OpenNGC's 130.

DISTANCES, and what each flag means (the card says it in words; no distance is drawn that is not one of these):
  parallax   OpenNGC's Pax (mas) for a star, cluster or nebula: d = 1000 / Pax parsecs. The range is ASSUMED
             (+-25 %, wider under 1 mas), as OpenNGC lists no error.
  redshift   a galaxy with a radial velocity of 3 000 km/s or more: the Planck 2018 comoving distance of its redshift
             (data/cosmology.js, the map's one cosmology), the range for a peculiar velocity of +-300 km/s.
  velocity   a galaxy with a smaller redshift: the same, but the velocity says little about the distance, so the
             mark is the "inferred" one (fainter, larger) and the range is wide.
  harris     Harris's distance from the Sun; the range is ASSUMED +-10 %.
  gaia       Hunt & Reffert's dist50, dist16 and dist84 (their 68 % interval).
  typical    nothing measured it: a point in the 16th to 84th percentile range of the same class's measured distances in
             this build, log-uniform and fixed by the object's name (so they do not stack on one sphere round the
             Sun), to two figures. The direction is measured, the depth is not.
Positions are the sources' (ICRS or J2000 equatorial), stored as 32-bit fractions of the circle; the page turns them into
the sun-inertial (ecliptic J2000) axes like data/dso.json.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
import statistics
import struct
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DSO = ROOT / "site/data/dso.json"
LV = ROOT / "site/data/deep/localvolume.json"
CONS = ROOT / "site/data/constellation-names.json"
OUT = ROOT / "site/data/deep"
CACHE = Path.home() / ".cache" / "spaceradar-src" / "a2"
HR_CACHE = Path.home() / "space-radar-handoff" / "release-1.2" / "W3-a" / "cache" / "hr23-clusters.tsv"
UA = "space-radar-build/1.0 (https://github.com/Sara-Managed-Projects/space-radar)"
READ_ON = "2026-10-28"
URLS = {
    "NGC.csv": "https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv",
    "addendum.csv": "https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/addendum.csv",
    "mwgc.dat": "https://physwww.mcmaster.ca/~harris/mwgc.dat",
    "snrs.html": "https://www.mrao.cam.ac.uk/surveys/snrs/snrs.data.html",
    "caldwell.json": "https://en.wikipedia.org/w/api.php?action=parse&page=Caldwell_catalogue&prop=wikitext&format=json&formatversion=2",
}

PINNED = {  # sha256 of the files as read on READ_ON; a later download that differs is a decision, not an accident
    "NGC.csv": "54abea0b57b0a103831bfc7a8e3a99a23acfbf4bb581fcf3d8af539cbb826c84",
    "addendum.csv": "c93f983dda6780b76b7b2e9271a856a892627710148a982ee98101a54c642fdd",
    "mwgc.dat": "b457a690adc422fb2e8e05a23e1de50b62d1d5ac10dce99963c956c1b17ca658",
    "snrs.html": "0dcffa17be68c3f2467d5e80eae40c6dddba68195b5a4765556c6b4e9f966396",
    "caldwell.json": "73f9ec53d9c611e4dbbd3fcc076d4cae285d7cc35ce84d6170d99f7c1d39fe53",
    "hr23-clusters.tsv": "88f08add190325005e7b1ade9be364ec076dc3835010b692df6ba4a5d8ade88f",
}

MAGIC = b"SRNC"
VERSION = 1
STRIDE = 24
OBLIQUITY = math.radians(23.4392911)
LY_PER_PC = 3.261563777167433
H_MIN = 3000.0  # km/s: a galaxy at or above this is placed by its redshift; under it the velocity is "inferred"

# The classes, in the order of the code each row carries. `kind` is the card's family (data/deepsky.js), `text` the type
# the card prints. The glyph the page draws for a class is in scene/deep/catalogue.js (GLYPHS), by this index.
CLASSES = [
    ("G", "galaxy", "Galaxy"),
    ("GGroup", "galaxy", "Group of galaxies"),
    ("OCl", "cluster", "Open cluster"),
    ("GCl", "cluster", "Globular cluster"),
    ("PN", "nebula", "Planetary nebula"),
    ("HII", "nebula", "Emission nebula"),
    ("RfN", "nebula", "Reflection nebula"),
    ("DrkN", "nebula", "Dark nebula"),
    ("Neb", "nebula", "Nebula"),
    ("Cl+N", "nebula", "Cluster with nebulosity"),
    ("SNR", "nebula", "Supernova remnant"),
    ("*Ass", "cluster", "Stellar association"),
    ("*", "other", "Star"),
    ("**", "other", "Double star"),
    ("Other", "other", "Other object"),
    ("Nova", "other", "Nova"),
]
CLS = {c[0]: i for i, c in enumerate(CLASSES)}
OPENNGC_CLASS = {
    "G": "G", "GPair": "GGroup", "GTrpl": "GGroup", "GGroup": "GGroup", "OCl": "OCl", "GCl": "GCl", "PN": "PN",
    "HII": "HII", "EmN": "HII", "RfN": "RfN", "DrkN": "DrkN", "Neb": "Neb", "Cl+N": "Cl+N", "SNR": "SNR",
    "*Ass": "*Ass", "*": "*", "**": "**", "Other": "Other", "Nova": "Nova",
}
# The class group whose measured distances stand in for a missing one.
GROUP = {"G": "galaxy", "GGroup": "galaxy", "OCl": "cluster", "*Ass": "cluster", "GCl": "globular", "PN": "galactic", "HII": "galactic",
         "RfN": "galactic", "DrkN": "galactic", "Neb": "galactic", "Cl+N": "galactic", "SNR": "galactic", "*": "star", "**": "star",
         "Other": "galactic", "Nova": "star"}
METHODS = ["typical", "parallax", "redshift", "harris", "velocity", "gaia"]  # the 3 bits in the flags
M = {m: i for i, m in enumerate(METHODS)}
SOURCES = {
    "openngc": {"name": "OpenNGC (Mattia Verga)", "licence": "CC BY-SA 4.0", "url": "https://github.com/mattiaverga/OpenNGC"},
    "harris": {"name": "Harris, Catalog of Parameters for Milky Way Globular Clusters (1996, 2010 edition)", "licence": "supplied free of charge to all users; the source to be named", "url": "https://physwww.mcmaster.ca/~harris/mwgc.dat"},
    "green": {"name": "Green, A Catalogue of Galactic Supernova Remnants (2024 October version)", "licence": "published openly with a request to cite (Green 2025, J. Astrophys. Astron. 46, 14); no licence text", "url": "https://www.mrao.cam.ac.uk/surveys/snrs/"},
    "hr23": {"name": "Hunt & Reffert 2023, Improving the open cluster census II (Gaia DR3)", "licence": "CC BY-NC 3.0 IGO (ESA/Gaia/DPAC)", "url": "https://cdsarc.cds.unistra.fr/viz-bin/cat/J/A+A/673/A114"},
}


# ------------------------------------------------------------------------------------------------ small helpers
def num(s):
    try:
        v = float(str(s).strip())
        return v if math.isfinite(v) else None
    except (TypeError, ValueError):
        return None


def hms(s):
    h, m, sec = s.split(":")
    return (float(h) + float(m) / 60 + float(sec) / 3600) * 15


def dms(s):
    s = s.strip()
    sign = -1 if s.startswith("-") else 1
    d, m, sec = s.lstrip("+-").split(":")
    return sign * (float(d) + float(m) / 60 + float(sec) / 3600)


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def sep_deg(ra1, de1, ra2, de2):
    a, b = math.radians(ra1), math.radians(ra2)
    d1, d2 = math.radians(de1), math.radians(de2)
    c = math.sin(d1) * math.sin(d2) + math.cos(d1) * math.cos(d2) * math.cos(a - b)
    return math.degrees(math.acos(max(-1.0, min(1.0, c))))


def pretty(name):
    """'NGC0224' -> 'NGC 224'; 'C099' -> 'Caldwell 99'; 'Mel022' -> 'Melotte 22'; 'IC1396' -> 'IC 1396'; 'NGC0224A' -> 'NGC 224A'."""
    m = re.match(r"^([A-Za-z]+)0*(\d+)(.*)$", name.strip())
    if not m:
        return name.strip()
    pre = {"C": "Caldwell", "B": "Barnard", "Cl": "Collinder", "Mel": "Melotte", "H": "Harvard", "M": "Messier"}.get(m.group(1), m.group(1))
    return f"{pre} {m.group(2)}{m.group(3)}"


def ecliptic_dir(ra_deg, dec_deg):
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    x, y, z = math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)
    ce, se = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    return (x, y * ce + z * se, -y * se + z * ce)


# ------------------------------------------------------------------------------------------------ fetch
def fetch(cache: Path):
    cache.mkdir(parents=True, exist_ok=True)
    for name, url in URLS.items():
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            (cache / name).write_bytes(r.read())
        print(f"  {name}: {(cache / name).stat().st_size} bytes")


def cosmology_table():
    """z -> comoving light-years from data/cosmology.js itself (node), so the page and the file agree."""
    js = (
        f"import {{ comovingLy }} from {json.dumps('file://' + str(ROOT / 'site/js/data/cosmology.js'))};\n"
        "const zs=[];for(let z=0;z<=0.4+1e-9;z+=0.0005)zs.push(+z.toFixed(4));for(let z=0.41;z<=3;z+=0.01)zs.push(+z.toFixed(3));\n"
        "console.log(JSON.stringify(zs.map((z)=>[z,comovingLy(z)])));\n"
    )
    tmp = CACHE / "cosmo_table.mjs"
    tmp.write_text(js)
    node = Path.home() / "space-radar-handoff" / "seed" / "bin" / "node"
    out = subprocess.run([str(node) if node.exists() else "node", str(tmp)], capture_output=True, text=True, check=True, cwd=str(CACHE)).stdout
    return json.loads(out)


def comoving_ly(table, z):
    lo, hi = 0, len(table) - 1
    if z <= table[0][0]:
        return table[0][1] * z / max(table[0][0], 1e-9) if table[0][0] else 0.0
    if z >= table[hi][0]:
        return table[hi][1]
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if table[mid][0] <= z:
            lo = mid
        else:
            hi = mid
    (z0, d0), (z1, d1) = table[lo], table[hi]
    return d0 + (d1 - d0) * (z - z0) / (z1 - z0)


# ------------------------------------------------------------------------------------------------ the sources
def hubble_group(h):
    h = (h or "").strip()
    if not h:
        return 3
    if re.match(r"^(E|cD|dE|S0|dS0|L)", h) and not re.match(r"^S0-a", h):
        return 0
    if re.match(r"^(I|Im|IB|Sm|SBm|BCD|Pec)", h):
        return 2
    if re.match(r"^(S|SB|SA|SAB)", h):
        return 1
    return 3


def read_openngc(cache):
    rows = []
    for f in ("NGC.csv", "addendum.csv"):
        with open(cache / f, newline="") as fh:
            for x in csv.DictReader(fh, delimiter=";"):
                if x["Type"] in ("Dup", "NonEx") or x["Type"] not in OPENNGC_CLASS:
                    continue
                if not x["RA"] or not x["Dec"]:
                    continue
                rows.append(x)
    return rows


def read_harris(cache):
    txt = (cache / "mwgc.dat").read_text(errors="replace").splitlines()
    out = {}
    part = 0
    rx = re.compile(r"^\s*(\S.*?)\s{2,}(?:(\S.*?)\s{2,})?(\d\d \d\d [\d.]+)\s+([+-]\d\d \d\d [\d.]+)\s+([\d.]+)\s+([+-]?[\d.]+)\s+([\d.]+)\s+([\d.]+)")
    rx_id = re.compile(r"^\s*(\S.*?)\s{2,}")
    for line in txt:
        if "Part I:" in line:
            part = 1
        elif "Part II:" in line:
            part = 2
        elif "Part III:" in line:
            part = 3
        if part == 1:
            m = rx.match(line)
            if m and re.match(r"\d\d \d\d", m.group(3)):
                ident = " ".join(m.group(1).split())
                ra = (lambda a: (float(a[0]) + float(a[1]) / 60 + float(a[2]) / 3600) * 15)(m.group(3).split())
                d = m.group(4).split()
                sign = -1 if d[0].startswith("-") else 1
                de = sign * (abs(float(d[0])) + float(d[1]) / 60 + float(d[2]) / 3600)
                out[ident] = {"id": ident, "name": (m.group(2) or "").strip(), "ra": ra, "dec": de, "kpc": float(m.group(7))}
    # Part II: apparent V (V_t) by id
    part = 0
    for line in txt:
        if "Part II:" in line:
            part = 2
        elif "Part III:" in line:
            part = 3
        if part == 2:
            m = re.match(r"^\s*(\S.*?)\s{2,}([+-]?\d+\.\d+)\s+(\d+)\s+(\d+\.\d+)\s+(\d+\.\d+|\s+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+([+-]\d+\.\d+)", line)
            if m:
                ident = " ".join(m.group(1).split())
                if ident in out:
                    out[ident]["vt"] = float(m.group(6))
    return out


def read_green(cache):
    t = re.sub(r"<[^>]+>", "", (cache / "snrs.html").read_text(errors="replace"))
    out = []
    for line in t.splitlines():
        m = re.match(r"^\s+(\d+\.\d)\s+([+-]\d+\.\d)\s+(\d\d \d\d \d\d)\s+([+-]\d\d \d\d)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*(.*)$", line)
        if not m:
            continue
        l, b, ra, de, size, typ, flux, idx, other = m.groups()
        h, mi, s = ra.split()
        ra_deg = (int(h) + int(mi) / 60 + int(s) / 3600) * 15
        sign = -1 if de.startswith("-") else 1
        dd, dm = de.lstrip("+-").split()
        dec = sign * (int(dd) + int(dm) / 60)
        sm = re.match(r"^(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?", size)
        maj = float(sm.group(1)) if sm else None
        mn = float(sm.group(2)) if sm and sm.group(2) else None
        out.append({"gname": f"G{l}{b}", "ra": ra_deg, "dec": dec, "maj": maj, "min": mn, "type": typ, "flux": flux, "idx": idx, "other": other.strip()})
    return out


def read_caldwell(cache):
    w = json.loads((cache / "caldwell.json").read_text())["parse"]["wikitext"]
    i = w.find('{| class="wikitable sortable"')
    tbl = w[i:w.find("\n|}", i)]
    out = {}
    for r in tbl.split("\n|- ")[1:]:
        cells = [c.strip() for c in re.split(r"\n\|(?!\|)", "\n" + r.split("\n", 1)[1] if "\n" in r else r) if c.strip()]
        if len(cells) < 2:
            continue
        m = re.search(r"C(\d+)\s*$", cells[0])
        if not m:
            continue
        c = int(m.group(1))
        for ng in re.findall(r"\b(NGC|IC)\s+(\d+)", cells[1]):
            out[f"{ng[0]}{ng[1]}"] = c
        out[f"C{c}"] = c
    return out


def read_hr(path):
    lines = [l for l in path.read_text().splitlines() if l.strip() and not l.startswith("#")]
    head = [h.strip() for h in lines[0].split("\t")]
    return [dict(zip(head, (c.strip() for c in l.split("\t")))) for l in lines[3:]]


# ------------------------------------------------------------------------------------------------ bake
def verify_pins(cache: Path, allow_new: bool):
    for name, want in PINNED.items():
        path = HR_CACHE if name == "hr23-clusters.tsv" else cache / name
        got = hashlib.sha256(path.read_bytes()).hexdigest()
        if got != want:
            msg = f"catalogue: {name} is not the file read on {READ_ON} (sha256 {got}, pinned {want})"
            if not allow_new:
                raise SystemExit(msg + "; pass --accept-new to bake from it and pin the new hash")
            print("  " + msg, file=sys.stderr)


def bake(cache: Path):
    cons = {c["id"]: c["name"] for c in json.loads(CONS.read_text())}
    cons_list = sorted(set(cons.values()))
    con_ix = {n: i for i, n in enumerate(cons_list)}
    table = cosmology_table()

    # ---- what the app already has (one object, one mark): dso.json (designations, positions), the local volume
    dso = json.loads(DSO.read_text())["objects"]
    have_desig = {re.sub(r"\s+", "", o["designation"]).upper() for o in dso if o.get("designation")}
    for o in dso:
        if o.get("messier"):
            have_desig.add(f"M{o['messier']}")
    where = {}  # NGC/IC key -> the id of the record the app already has
    for o in dso:
        if o.get("designation"):
            where[re.sub(r"\s+", "", o["designation"]).upper()] = f"dso-{o['id']}"
    lv_names = json.loads(LV.read_text())["names"]
    for n in lv_names:
        m = re.match(r"^(NGC|IC)\s*0*(\d+)$", n.strip())
        if m:
            have_desig.add(f"{m.group(1)}{m.group(2)}")
            where.setdefault(f"{m.group(1)}{m.group(2)}", f"dso-lv-{slug(n)}")
    have_pos = [(o["raDeg"], o["decDeg"], o.get("kind"), o.get("majAxArcmin") or 5.0, o["id"]) for o in dso if o.get("raDeg") is not None]

    def key(name):
        return re.sub(r"\s+", "", pretty(name)).upper()

    caldwell = read_caldwell(cache)
    harris = read_harris(cache)
    green = read_green(cache)
    hr = [r for r in read_hr(HR_CACHE) if r.get("Type") == "o"]
    openngc = read_openngc(cache)

    rows = []  # main file
    taken = []
    left_out = {"dup_nonex": 0}

    # ---- OpenNGC
    harris_by_ngc = {}
    for h in harris.values():
        m = re.match(r"^(NGC|IC)\s*0*(\d+)$", h["id"])
        if m:
            harris_by_ngc[f"{m.group(1)}{m.group(2)}"] = h
    harris_used = set()
    for x in openngc:
        k = key(x["Name"])
        if k in have_desig or (x["M"] and f"M{int(x['M'])}" in have_desig):
            taken.append(k)
            continue
        cls = OPENNGC_CLASS[x["Type"]]
        ra, dec = hms(x["RA"]), dms(x["Dec"])
        maj, mn, pa = num(x["MajAx"]), num(x["MinAx"]), num(x["PosAng"])
        vmag = num(x["V-Mag"])
        if vmag is None:
            vmag = num(x["B-Mag"])
        rec = {
            "src": "openngc", "id": slug(pretty(x["Name"])), "name": pretty(x["Name"]), "cls": cls, "ra": ra, "dec": dec,
            "maj": maj * 1.0 if maj else None, "min": mn, "pa": pa, "vmag": vmag, "con": cons.get(x["Const"][:3], None),
            "sub": hubble_group(x["Hubble"]) if cls in ("G", "GGroup") else 3,
            "aka": [], "cald": None, "dist": None,
        }
        aka = [a.strip() for a in x["Common names"].split(",") if a.strip()]
        ident = [a.strip() for a in x["Identifiers"].split(",") if a.strip()]
        for a in ident:
            m = re.match(r"^C 0*(\d+)$", a)
            if m:
                rec["cald"] = int(m.group(1))
        if x["Name"].startswith("C0"):
            rec["cald"] = int(x["Name"][1:])
        if rec["cald"] is None and k in caldwell:
            rec["cald"] = caldwell[k]
        rec["common"] = aka[0] if aka else None
        useful = [a for a in ident if re.match(r"^(UGCA?|PGC|MCG|ESO|LDN|LBN|Sh2|vdB|Arp|VV|HCG|HD|HIP|PK|Cr|Mel|Tr|Be|St)\s?[\d-]", a)]
        rec["aka"] = aka[1:] + useful[:2]
        # distance
        if cls in ("G", "GGroup"):
            z, v = num(x["Redshift"]), num(x["RadVel"])
            if cls == "G" and z is not None and z > 0:
                d = comoving_ly(table, z)
                if v is not None and abs(v) >= H_MIN:
                    lo = comoving_ly(table, max(1e-6, z - 300 / 299792.458))
                    hi = comoving_ly(table, z + 300 / 299792.458)
                    rec["dist"] = (d, lo, hi, M["redshift"], False, False)
                elif v is not None and v > 0:
                    lo = comoving_ly(table, max(1e-6, z - 300 / 299792.458))
                    hi = comoving_ly(table, z + 300 / 299792.458)
                    rec["dist"] = (d, lo, hi, M["velocity"], True, False)
        else:
            pax = num(x["Pax"])
            if pax is not None and pax > 0.05:
                d = 1000.0 / pax * LY_PER_PC
                f = 0.25 if pax >= 1.0 else 0.4
                rec["dist"] = (d, d * (1 - f), d * (1 + f), M["parallax"], False, True)
        # Harris: the globulars
        if cls == "GCl" and k in harris_by_ngc:
            h = harris_by_ngc[k]
            harris_used.add(h["id"])
            d = h["kpc"] * 1000 * LY_PER_PC
            rec["dist"] = (d, d * 0.9, d * 1.1, M["harris"], False, True)
            if h["name"] and h["name"] not in rec["aka"]:
                rec["aka"].append(h["name"])
        rows.append(rec)
    n_openngc = len(rows)

    # ---- Harris-only globulars (157 less the ones OpenNGC lists or the app has)
    harris_added = 0
    for h in harris.values():
        k = re.sub(r"\s+", "", h["id"]).upper()
        if h["id"] in harris_used or k in have_desig:
            continue
        # an OpenNGC row in the same place (a cluster under another name)
        dup = next((r for r in rows[:n_openngc] if r["cls"] == "GCl" and sep_deg(r["ra"], r["dec"], h["ra"], h["dec"]) < 0.05), None)
        if dup is not None:
            d = h["kpc"] * 1000 * LY_PER_PC
            dup["dist"] = (d, d * 0.9, d * 1.1, M["harris"], False, True)
            continue
        if any(sep_deg(h["ra"], h["dec"], p[0], p[1]) < 0.05 and p[2] == "cluster" for p in have_pos):
            continue
        d = h["kpc"] * 1000 * LY_PER_PC
        rows.append({"src": "harris", "id": slug(h["id"]) , "name": h["id"], "cls": "GCl", "ra": h["ra"], "dec": h["dec"], "maj": None, "min": None, "pa": None,
                     "vmag": h.get("vt"), "con": None, "sub": 3, "aka": [h["name"]] if h["name"] else [], "cald": None,
                     "dist": (d, d * 0.9, d * 1.1, M["harris"], False, True)})
        harris_added += 1

    # ---- Green's remnants (310 less the ones OpenNGC or the app already has)
    green_added = 0
    green_skipped = []
    snr_have = [(r["ra"], r["dec"], r["maj"] or 10.0, r["name"]) for r in rows if r["cls"] == "SNR"] + [(p[0], p[1], p[3], p[4]) for p in have_pos if p[2] == "nebula"]
    for g in green:
        maj = g["maj"] or 10.0
        near = next((s for s in snr_have if sep_deg(g["ra"], g["dec"], s[0], s[1]) * 60 < max(6.0, 0.5 * max(maj, s[2]))), None)
        if near is not None:
            green_skipped.append((g["gname"], near[3]))
            continue
        ng = [a for a in re.split(r",\s*", g["other"]) if a]
        rows.append({"src": "green", "id": slug(g["gname"]), "name": g["gname"], "cls": "SNR", "ra": g["ra"], "dec": g["dec"],
                     "maj": g["maj"], "min": g["min"], "pa": None, "vmag": None, "con": None, "sub": 3, "aka": ng, "cald": None, "dist": None,
                     "snr": {"type": g["type"], "flux": g["flux"], "idx": g["idx"]}})
        green_added += 1

    # ---- the typical distance of a class group, for the rows nothing measured
    def pct(vals, p):
        vals = sorted(vals)
        return vals[min(len(vals) - 1, max(0, int(round(p * (len(vals) - 1)))))]

    measured = {}
    for r in rows:
        if r["dist"] and r["dist"][3] in (M["parallax"], M["harris"], M["redshift"]):
            measured.setdefault(GROUP[r["cls"]], []).append(r["dist"][0])
    typical = {}
    for g, vals in measured.items():
        if len(vals) >= 8:
            typical[g] = (statistics.median(vals), pct(vals, 0.16), pct(vals, 0.84), len(vals))
    galactic_pool = [d for g in ("globular", "galactic", "cluster") for d in measured.get(g, [])]
    for g in ("galactic", "cluster", "star", "globular", "galaxy"):
        if g not in typical:
            vals = galactic_pool
            typical[g] = (statistics.median(vals), pct(vals, 0.16), pct(vals, 0.84), len(vals))
    # Green's remnants have no class group of measured distances: the Galactic nebulae and remnants of this build
    for r in rows:
        if r["dist"] is None:
            t = typical[GROUP[r["cls"]]]
            # Not the median for all of them: that stacks every unmeasured object of a kind on one sphere round the Sun, a
            # shape nobody measured. A point of the class's own 16th-84th percentile range, log-uniform and fixed by the
            # object's name (the same on every build); the card says the distance is one point of that range.
            u = 0.08 + 0.84 * int.from_bytes(hashlib.sha256(r["name"].encode()).digest()[:4], "little") / 2**32
            d = t[1] * (t[2] / t[1]) ** u
            d = float(f"{d:.2g}")  # two figures: no precision the range does not have
            r["dist"] = (d, t[1], t[2], M["typical"], True, True)
            r["typical_of"] = GROUP[r["cls"]]

    # ---- Hunt & Reffert's open clusters: an overlay for the OpenNGC ones, new rows for the rest
    oc_rows, overlay = [], []
    overlay_by_row = {}
    n_matched = 0
    ocl_rows = [(i, r) for i, r in enumerate(rows) if r["cls"] in ("OCl", "*Ass", "Cl+N")]
    ocl_by_key = {key(r["name"].replace(" ", "")): i for i, r in ocl_rows}
    ocl_cells = {}
    for i, r in ocl_rows:
        ocl_cells.setdefault(int(math.floor(r["dec"])), []).append((i, r))
    dso_clusters = [(p[0], p[1], p[3]) for p in have_pos if p[2] == "cluster"]
    hr_taken = 0
    for c in hr:
        ra, dec = num(c["RA_ICRS"]), num(c["DE_ICRS"])
        r50 = num(c["r50"]) or 0.05
        d50 = num(c["dist50"])
        if ra is None or dec is None or d50 is None:
            continue
        name = c["Name"].replace("_", " ").strip()
        key_hr = re.sub(r"\s+", "", name).upper()
        if key_hr in have_desig or any(sep_deg(ra, dec, a, b) < max(3 * r50, 0.1) for a, b, _ in dso_clusters):
            hr_taken += 1
            continue
        d = d50 * LY_PER_PC
        lo = (num(c["dist16"]) or d50 * 0.9) * LY_PER_PC
        hi = (num(c["dist84"]) or d50 * 1.1) * LY_PER_PC
        extra = {"n": int(num(c["Nt"]) or 0), "age": num(c["logAge50"])}
        # an OpenNGC row it is: by name, then by place (a place match must not contradict a parallax OpenNGC already has)
        match, prio, sep = ocl_by_key.get(key_hr), 0, 0.0
        if match is None:
            best = None
            for cell in (int(math.floor(dec)) - 1, int(math.floor(dec)), int(math.floor(dec)) + 1):
                for i, r in ocl_cells.get(cell, []):
                    s_ = sep_deg(ra, dec, r["ra"], r["dec"])
                    if s_ < max(1.5 * r50, 0.04) and (best is None or s_ < best[0]):
                        ok = r["dist"] is None or r["dist"][3] != M["parallax"] or 0.6 <= d / r["dist"][0] <= 1.6
                        if ok:
                            best = (s_, i)
            if best:
                match, prio, sep = best[1], 1, best[0]
        if match is not None:
            n_matched += 1
            old = overlay_by_row.get(match)
            if old is None or (prio, sep) < (old[0], old[1]):
                overlay_by_row[match] = (prio, sep, {"row": match, "d": d, "lo": lo, "hi": hi, "n": extra["n"], "age": extra["age"], "hr": name})
            continue
        maj = max(0.2, 2 * r50 * 60)
        oc_rows.append({"src": "hr23", "id": slug(name), "name": name, "cls": "OCl", "ra": ra, "dec": dec, "maj": maj, "min": None, "pa": None,
                        "vmag": None, "con": None, "sub": 3, "aka": [], "cald": None, "dist": (d, lo, hi, M["gaia"], False, False), "n": extra["n"], "age": extra["age"]})
    # one Gaia distance per OpenNGC row: the name match, else the nearest in the sky (the main file stays OpenNGC-only)
    overlay = [v[2] for _, v in sorted(overlay_by_row.items())]
    hr_merged = n_matched - len(overlay)

    # ---- constellations for the rows without one: the nearest named centre is not a constellation; leave it unknown
    # ---- write
    def pack(rs):
        buf = bytearray(16)
        struct.pack_into("<4sIII", buf, 0, MAGIC, VERSION, len(rs), STRIDE)
        for r in rs:
            d, lo, hi, meth, inferred, assumed = r["dist"]
            ra_q = int(round(r["ra"] / 360.0 * 2**32)) % 2**32
            de_q = max(-2**31, min(2**31 - 1, int(round(r["dec"] / 90.0 * 2**31))))
            d_q = max(0, min(65535, int(round((math.log10(max(d, 10.0)) - 1.0) / 10.0 * 65535))))
            lo_q = max(0, min(255, int(round(-100 * math.log10(max(lo, 1.0) / d))))) if d > 0 else 0
            hi_q = max(0, min(255, int(round(100 * math.log10(max(hi, 1.0) / d))))) if d > 0 else 0
            maj_q = 0
            if r["maj"] and r["maj"] > 0:
                maj_q = max(1, min(65535, int(round((math.log10(r["maj"]) + 3.0) / 6.0 * 65535))))
            ratio_q = 0
            if r["maj"] and r["min"] and r["maj"] > 0 and r["min"] > 0:
                ratio_q = max(1, min(255, int(round(min(1.0, r["min"] / r["maj"]) * 255))))
            pa_q = 255 if r["pa"] is None else int(round((r["pa"] % 180) / 2)) % 90
            mag_q = -32768 if r["vmag"] is None else max(-3000, min(3000, int(round(r["vmag"] * 100))))
            flags = (1 if inferred else 0) | (2 if assumed else 0) | (meth << 2) | (32 if r["cald"] else 0)
            con = con_ix.get(r["con"], 255) if r["con"] else 255
            buf += struct.pack("<IiHBBHBBhBBBBH", ra_q, de_q, d_q, lo_q, hi_q, maj_q, ratio_q, pa_q, mag_q, CLS[r["cls"]], flags, r["sub"], con, 0)
        return bytes(buf)

    main_bin = pack(rows)
    oc_bin = pack(oc_rows)
    assert len(main_bin) == 16 + STRIDE * len(rows)

    def manifest_for(rs, which, extra):
        names = [r["name"] for r in rs]
        common = {str(i): r["common"] for i, r in enumerate(rs) if r.get("common")}
        aka = {str(i): "; ".join(dict.fromkeys(r["aka"])) for i, r in enumerate(rs) if r["aka"]}
        cald = {str(i): r["cald"] for i, r in enumerate(rs) if r["cald"]}
        sections, start = [], 0
        for i in range(1, len(rs) + 1):
            if i == len(rs) or rs[i]["src"] != rs[start]["src"]:
                sections.append({"src": rs[start]["src"], "from": start, "to": i})
                start = i
        m = {
            "about": "Spec 0079 A2: the deep sky's catalogues. Rows are in scene/deep/catalogue.js parseTile's layout; built by scripts/build_deep_catalogue.py.",
            "version": VERSION, "file": which, "count": len(rs), "stride": STRIDE, "read": READ_ON,
            "classes": [{"code": c[0], "kind": c[1], "text": c[2]} for c in CLASSES],
            "methods": METHODS, "cons": cons_list, "sections": sections,
            "sources": {s: SOURCES[s] for s in dict.fromkeys(r["src"] for r in rs)},
            "names": names, "common": common, "aka": aka, "cald": cald,
        }
        m.update(extra)
        return m

    snr_info = {str(i): r["snr"] for i, r in enumerate(rows) if r.get("snr")}
    typical_of = {str(i): r["typical_of"] for i, r in enumerate(rows) if r.get("typical_of")}
    # ids must be unique across both files
    seen = set()
    for r in rows + oc_rows:
        base = r["id"]
        n = 2
        while r["id"] in seen:
            r["id"] = f"{base}-{n}"
            n += 1
        seen.add(r["id"])
    cald_table = {}
    rows_by_c = {r["cald"]: i for i, r in enumerate(rows) if r["cald"]}
    for c in range(1, 110):
        ks = [k for k, v in caldwell.items() if v == c and not k.startswith("C")]
        if c in rows_by_c:
            cald_table[str(c)] = {"row": rows_by_c[c]}
        else:
            ref = next((where[k] for k in ks + [f"CALDWELL{c}"] if k in where), None)
            cald_table[str(c)] = {"id": ref} if ref else {"unplaced": ks}
    typ_out = {g: {"ly": round(v[0]), "low": round(v[1]), "high": round(v[2]), "of": v[3]} for g, v in typical.items()}
    main_man = manifest_for(rows, "catalogue", {
        "totals": {"openngc": n_openngc + len(taken), "openngc_taken": len(taken), "harris_added": harris_added, "harris_total": len(harris),
                   "green_added": green_added, "green_total": len(green), "caldwell": 0},
        "caldwellTable": cald_table, "taken": sorted(taken), "green_skipped": [[a, b] for a, b in green_skipped], "snr": snr_info, "typical": typ_out,
        "cosmology": "Planck 2018, data/cosmology.js comovingLy", "hubbleMin": H_MIN,
    })
    oc_man = manifest_for(oc_rows, "catalogue-oc", {
        "overlay": [[o["row"], round(o["d"]), round(o["lo"]), round(o["hi"]), o["n"], o["age"], o["hr"]] for o in overlay],
        "members": [r["n"] for r in oc_rows], "ages": [None if r["age"] is None else round(r["age"], 2) for r in oc_rows],
        "totals": {"hr23_open": len(hr), "hr23_new": len(oc_rows), "hr23_overlay": len(overlay), "hr23_merged": hr_merged, "hr23_taken": hr_taken},
    })
    main_man["totals"]["caldwell"] = sum(1 for v in cald_table.values() if "unplaced" not in v)
    for man, binary in ((main_man, main_bin), (oc_man, oc_bin)):
        man["bytes"] = len(binary)
        man["sha256"] = hashlib.sha256(binary).hexdigest()
    return main_bin, main_man, oc_bin, oc_man


def write(bins):
    main_bin, main_man, oc_bin, oc_man = bins
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "catalogue.bin").write_bytes(main_bin)
    (OUT / "catalogue.json").write_text(json.dumps(main_man, separators=(",", ":"), ensure_ascii=False))
    (OUT / "catalogue-oc.bin").write_bytes(oc_bin)
    (OUT / "catalogue-oc.json").write_text(json.dumps(oc_man, separators=(",", ":"), ensure_ascii=False))
    print(f"catalogue.bin {len(main_bin)} B, {main_man['count']} rows; catalogue-oc.bin {len(oc_bin)} B, {oc_man['count']} rows + {len(oc_man['overlay'])} overlay")
    print(json.dumps(main_man["totals"]))
    print(json.dumps(oc_man["totals"]))
    print("typical:", json.dumps(main_man["typical"]))


def check():
    bad = 0
    for stem in ("catalogue", "catalogue-oc"):
        m = json.loads((OUT / f"{stem}.json").read_text())
        b = (OUT / f"{stem}.bin").read_bytes()
        ok = len(b) == m["bytes"] == 16 + STRIDE * m["count"] and hashlib.sha256(b).hexdigest() == m["sha256"] and len(m["names"]) == m["count"]
        print(stem, "ok" if ok else "STALE")
        bad += 0 if ok else 1
    return bad


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--bake", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--cache", type=Path, default=CACHE)
    ap.add_argument("--accept-new", action="store_true", help="bake from downloads that differ from the pinned ones")
    a = ap.parse_args()
    if a.fetch:
        fetch(a.cache)
    if a.bake:
        verify_pins(a.cache, a.accept_new)
        write(bake(a.cache))
    if a.check:
        sys.exit(1 if check() else 0)
    if not (a.fetch or a.bake or a.check):
        ap.print_help()
