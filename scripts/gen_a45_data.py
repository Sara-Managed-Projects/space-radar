#!/usr/bin/env python3
"""Release 1.5.0 stages A4 (stars) and A5 (beyond the Milky Way): the compact on-demand catalogues.

    python3 scripts/gen_a45_data.py            download what is missing to ~/.cache/spaceradar-src/a45/, write site/data/a45/
    python3 scripts/gen_a45_data.py --only iau,pulsars     only those parts
    python3 scripts/gen_a45_data.py --check    fail if the committed files are not what this writes (needs the cache)

WHY ONE SCRIPT. Every file here is fetched by the browser AFTER the first visit (site/js/data/a45.js) and none is read at boot.
They are written small and quantised; the raw downloads stay in the cache folder and are never committed. Hand-checked rows
(Gaia BH2, the white-dwarf records, the record-redshift galaxies, two clusters the X-ray catalogue lacks) are in
scripts/data/a45-hand.yaml, each with the page it was read from.

PARTS (the part names `--only` takes)
  iau        the IAU Working Group on Star Names' list, matched to HYG's stars (site/data/a45/iau-names.json)
  unplaced   the 10 224 HYG stars with no measured distance, on the sky sphere only (site/data/a45/unplaced.bin + .names.json)
  pulsars    the ATNF Pulsar Catalogue (site/data/a45/pulsars.json)
  extremes   magnetars (McGill), black-hole transients (BlackCAT paper tables), Gaia BH2, white-dwarf records, the brown dwarfs
             within 20 light-years (RECONS through Wikipedia's table) (site/data/a45/extremes.json)
  beyond     the Local Group (Local Volume Database, CC0), the record-redshift galaxies, the named galaxy clusters (MCXC)
             (site/data/a45/beyond.json)
  quasars    the 1 000 brightest quasars of the Million Quasars catalogue plus every one with z > 7 (site/data/a45/quasars.json)

SOURCES AND LICENCES: CREDITS.md section 3m. Nothing is invented: a row whose source gives no distance is not placed, and its count
is written into the file's header (`skipped`).
"""
from __future__ import annotations

import base64
import csv
import gzip
import hashlib
import json
import math
import re
import struct
import sys
import tarfile
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path.home() / ".cache" / "spaceradar-src" / "a45"
OUT = ROOT / "site" / "data" / "a45"
HAND = ROOT / "scripts" / "data" / "a45-hand.yaml"
UA = "spaceradar-a45-build/1.0 (https://spaceradar.ai; data build)"
LY_PER_PC = 3.2615637771674333
OBLIQUITY = math.radians(23.4392911)  # the app's one obliquity (scene/stars3d.js, data/layers.js)
BUILT = "2026-10-28"

HYG_URL = "https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v44.csv.gz"
WGSN_URL = "https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt"
WIKI_IAU = "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_proper_names_of_stars&prop=wikitext&format=json"
PSRCAT_URL = "https://www.atnf.csiro.au/research/pulsar/psrcat/downloads/psrcat_pkg.tar.gz"
MCGILL_URL = "https://www.physics.mcgill.ca/~pulsar/magnetar/TabO1.csv"
BLACKCAT_URL = "https://arxiv.org/e-print/1510.08869"
LVDB_BASE = "https://raw.githubusercontent.com/apace7/local_volume_database/main/data/"
HEASARC = "https://heasarc.gsfc.nasa.gov/xamin/vo/tap/sync"

GENITIVE = {
    "Andromedae": "And", "Antliae": "Ant", "Apodis": "Aps", "Aquarii": "Aqr", "Aquilae": "Aql", "Arae": "Ara",
    "Arietis": "Ari", "Aurigae": "Aur", "Boötis": "Boo", "Caeli": "Cae", "Camelopardalis": "Cam", "Cancri": "Cnc",
    "Canum Venaticorum": "CVn", "Canis Majoris": "CMa", "Canis Minoris": "CMi", "Capricorni": "Cap", "Carinae": "Car",
    "Cassiopeiae": "Cas", "Centauri": "Cen", "Cephei": "Cep", "Ceti": "Cet", "Chamaeleontis": "Cha", "Circini": "Cir",
    "Columbae": "Col", "Comae Berenices": "Com", "Coronae Australis": "CrA", "Coronae Borealis": "CrB", "Corvi": "Crv",
    "Crateris": "Crt", "Crucis": "Cru", "Cygni": "Cyg", "Delphini": "Del", "Doradus": "Dor", "Draconis": "Dra",
    "Equulei": "Equ", "Eridani": "Eri", "Fornacis": "For", "Geminorum": "Gem", "Gruis": "Gru", "Herculis": "Her",
    "Horologii": "Hor", "Hydrae": "Hya", "Hydri": "Hyi", "Indi": "Ind", "Lacertae": "Lac", "Leonis": "Leo",
    "Leonis Minoris": "LMi", "Leporis": "Lep", "Librae": "Lib", "Lupi": "Lup", "Lyncis": "Lyn", "Lyrae": "Lyr",
    "Mensae": "Men", "Microscopii": "Mic", "Monocerotis": "Mon", "Muscae": "Mus", "Normae": "Nor", "Octantis": "Oct",
    "Ophiuchi": "Oph", "Orionis": "Ori", "Pavonis": "Pav", "Pegasi": "Peg", "Persei": "Per", "Phoenicis": "Phe",
    "Pictoris": "Pic", "Piscium": "Psc", "Piscis Austrini": "PsA", "Puppis": "Pup", "Pyxidis": "Pyx", "Reticuli": "Ret",
    "Sagittae": "Sge", "Sagittarii": "Sgr", "Scorpii": "Sco", "Sculptoris": "Scl", "Scuti": "Sct", "Serpentis": "Ser",
    "Sextantis": "Sex", "Tauri": "Tau", "Telescopii": "Tel", "Trianguli": "Tri", "Trianguli Australis": "TrA",
    "Tucanae": "Tuc", "Ursae Majoris": "UMa", "Ursae Minoris": "UMi", "Velorum": "Vel", "Virginis": "Vir",
    "Volantis": "Vol", "Vulpeculae": "Vul",
}
GREEK = {"α": "Alp", "β": "Bet", "γ": "Gam", "δ": "Del", "ε": "Eps", "ζ": "Zet", "η": "Eta", "θ": "The", "ι": "Iot",
         "κ": "Kap", "λ": "Lam", "μ": "Mu", "ν": "Nu", "ξ": "Xi", "ο": "Omi", "π": "Pi", "ρ": "Rho", "σ": "Sig",
         "τ": "Tau", "υ": "Ups", "φ": "Phi", "χ": "Chi", "ψ": "Psi", "ω": "Ome"}
GREEK_NASA = {"α": "alf", "β": "bet", "γ": "gam", "δ": "del", "ε": "eps", "ζ": "zet", "η": "eta", "θ": "the", "ι": "iot",
              "κ": "kap", "λ": "lam", "μ": "mu", "ν": "nu", "ξ": "ksi", "ο": "omi", "π": "pi", "ρ": "rho", "σ": "sig",
              "τ": "tau", "υ": "ups", "φ": "phi", "χ": "chi", "ψ": "psi", "ω": "ome"}
SUPER = {"¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9"}


# ----------------------------------------------------------------------------------------------- helpers
def get(url: str, name: str, binary: bool = False, headers: dict | None = None) -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    p = CACHE / name
    if not p.exists() or p.stat().st_size == 0:
        print(f"  downloading {url}", file=sys.stderr)
        req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
        with urllib.request.urlopen(req, timeout=300) as r, open(p, "wb") as f:
            f.write(r.read())
    return p


def asc(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)).lower()


def ecl_ly(ra_deg: float, dec_deg: float, dist_ly: float) -> list[float]:
    """J2000 equatorial direction and a distance to the app's `sun-inertial` axes (ecliptic J2000), in light-years."""
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    ex, ey, ez = math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)
    c, s = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    return [round(v * dist_ly, 3) for v in (ex, ey * c + ez * s, -ey * s + ez * c)]


def ecl_to_equ(lon_deg: float, lat_deg: float) -> tuple[float, float]:
    lon, lat = math.radians(lon_deg), math.radians(lat_deg)
    x, y, z = math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat)
    c, s = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    ex, ey, ez = x, y * c - z * s, y * s + z * c
    return (math.degrees(math.atan2(ey, ex)) % 360.0, math.degrees(math.asin(max(-1.0, min(1.0, ez)))))


def sexa(text: str, hours: bool = False) -> float:
    """'12 36 25.46' or '+62:14:31.4' to degrees (hours to degrees when `hours`)."""
    t = text.strip().replace("−", "-")
    sign = -1.0 if t.startswith("-") else 1.0
    parts = [float(x) for x in re.split(r"[:\s]+", t.lstrip("+-").strip()) if x]
    v = sum(p / (60.0 ** i) for i, p in enumerate(parts))
    return sign * v * (15.0 if hours else 1.0)


def sep_arcsec(a: tuple[float, float], b: tuple[float, float]) -> float:
    d2r = math.pi / 180
    x = math.sin((a[1] - b[1]) * d2r / 2) ** 2 + math.cos(a[1] * d2r) * math.cos(b[1] * d2r) * math.sin((a[0] - b[0]) * d2r / 2) ** 2
    return 2 * math.degrees(math.asin(min(1.0, math.sqrt(x)))) * 3600


def write_json(path: Path, doc) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)}  {path.stat().st_size:,} B  (gzip {len(gzip.compress(path.read_bytes())):,} B)")


def hand() -> dict:
    return yaml.safe_load(HAND.read_text(encoding="utf-8"))


def psr_norm(n: str) -> str:
    return re.sub(r"[^A-Z0-9+\-]", "", n.upper().replace("PSR", "").replace("−", "-"))


def existing_exotics() -> list[dict]:
    """Rows of registry/exotics.yaml with a position, so nothing here is drawn on top of an object the app already has."""
    out = []
    for r in yaml.safe_load((ROOT / "registry/exotics.yaml").read_text(encoding="utf-8"))["exotics"]:
        out.append({"id": r["id"], "name": r["name"], "ra": sexa(str(r["ra"]).replace("h", " ").replace("m", " ").replace("s", " "), True) if "h" in str(r["ra"]) else float(r["ra"]),
                    "dec": sexa(str(r["dec"]).replace("°", " ").replace("′", " ").replace("″", " ")), "aliases": r.get("aliases") or [], "kind": r.get("kind"),
                    "psr_names": {psr_norm(n) for n in [r["name"], *(r.get("aliases") or [])] if "PSR" in n.upper() or re.search(r"[BJ]\d{4}[+-]\d", n)}})
    return out


# ----------------------------------------------------------------------------------------------- HYG
def hyg_rows() -> list[dict]:
    gz = get(HYG_URL, "hyg_v44.csv.gz")
    csvp = CACHE / "hyg_v44.csv"
    if not csvp.exists():
        csvp.write_bytes(gzip.decompress(gz.read_bytes()))
    return list(csv.DictReader(open(csvp, encoding="utf-8")))


def hyg_index(rows: list[dict]):
    """Rows with their index in stars3d.bin (the order scripts/build-stars3d.py writes: HYG order, the Sun and the unplaced skipped)."""
    placed, unplaced, idx = [], [], 0
    for r in rows:
        if r["id"] == "0":
            continue
        d = float(r["dist"] or 0)
        if d <= 0 or d >= 99999.0:
            unplaced.append(r)
        else:
            r["_idx"] = idx
            placed.append(r)
            idx += 1
    return placed, unplaced


def key_maps(rows: list[dict]):
    by = {"hip": {}, "hd": {}, "hr": {}, "gl": {}, "bayer": {}, "flam": {}, "var": {}, "id": {}}
    for r in rows:
        by["id"][r["id"]] = r
        if r["hip"]:
            by["hip"][r["hip"]] = r
        if r["hd"]:
            by["hd"][r["hd"]] = r
        if r["hr"]:
            by["hr"][r["hr"]] = r
        if r["gl"]:
            m = re.match(r"(?:Gl|GJ|NN|Wo)\s*([\d.]+)", r["gl"])
            if m:
                by["gl"].setdefault(m.group(1), r)
        b = r["bayer"].strip()
        if b and r["con"]:
            head, _, sup = b.partition("-")
            by["bayer"].setdefault((head, sup, r["con"]), r)
            if not sup:
                by["bayer"].setdefault((head, "", r["con"]), r)
        if r["flam"] and r["con"]:
            by["flam"].setdefault((r["flam"], r["con"]), r)
        if r["var"] and r["con"] and not r["var"] in GREEK.values():
            by["var"].setdefault((r["var"], r["con"]), r)
    return by


def resolve_designation(des: str, by: dict):
    """A designation as the IAU list writes it to a HYG row, or None. Returns (row, how)."""
    d = re.sub(r"\s+", " ", des.replace(" ", " ").replace("−", "-").strip())
    d = re.sub(r"<[^>]+>", "", d)
    m = re.match(r"^HD (\d+)", d)
    if m and m.group(1) in by["hd"]:
        return by["hd"][m.group(1)], "HD"
    m = re.match(r"^HR (\d+)", d)
    if m and m.group(1) in by["hr"]:
        return by["hr"][m.group(1)], "HR"
    m = re.match(r"^HIP (\d+)", d)
    if m and m.group(1) in by["hip"]:
        return by["hip"][m.group(1)], "HIP"
    m = re.match(r"^(?:GJ|Gliese|Gl) ?([\d.]+)", d)
    if m and m.group(1) in by["gl"]:
        return by["gl"][m.group(1)], "GJ"
    # a Bayer designation: a Greek letter, an optional superscript digit, a constellation, an optional component letter
    m = re.match(r"^([α-ω])([¹²³⁴⁵⁶⁷⁸⁹\d]?)\s+([A-Za-zö ]+?)(?:\s+(?:A|B|C|Aa|Ab|Ba|Bb|Aa1|Aa2|Ab1|A1|A2|Ca|Cb))?$", d)
    if m and m.group(1) in GREEK:
        sup = SUPER.get(m.group(2), m.group(2))
        con = GENITIVE.get(m.group(3).strip())
        if con:
            for k in ((GREEK[m.group(1)], sup, con), (GREEK[m.group(1)], "", con)):
                if k in by["bayer"]:
                    return by["bayer"][k], "Bayer"
    m = re.match(r"^(\d+) ([A-Za-zö ]+?)(?:\s+(?:A|B|C|Aa|Ab|Ba))?$", d)
    if m and GENITIVE.get(m.group(2).strip()):
        k = (m.group(1), GENITIVE[m.group(2).strip()])
        if k in by["flam"]:
            return by["flam"][k], "Flamsteed"
    m = re.match(r"^([A-Z][A-Za-z]{0,3}|V\d+) ([A-Za-zö ]+?)(?:\s+(?:A|B|Aa|Ab|Aa1))?$", d)
    if m and GENITIVE.get(m.group(2).strip()):
        k = (m.group(1), GENITIVE[m.group(2).strip()])
        if k in by["var"]:
            return by["var"][k], "variable"
    return None, None


def host_name_forms(des: str) -> list[str]:
    """The names the NASA archive could file a star under: 'tau Boo', '55 Cnc', 'HD 1234', 'HAT-P-21'."""
    d = re.sub(r"<[^>]+>", "", des).replace(" ", " ").strip()
    out = [d]
    m = re.match(r"^([α-ω])([¹²³⁴⁵⁶⁷⁸⁹\d]?)\s+([A-Za-zö ]+?)(?:\s+(?:A|B))?$", d)
    if m and GENITIVE.get(m.group(3).strip()):
        sup = SUPER.get(m.group(2), m.group(2))
        out.append(f"{GREEK_NASA[m.group(1)]}{(' ' + sup) if sup else ''} {GENITIVE[m.group(3).strip()]}")
    m = re.match(r"^(\d+) ([A-Za-zö ]+?)(?:\s+(?:A|B))?$", d)
    if m and GENITIVE.get(m.group(2).strip()):
        out.append(f"{m.group(1)} {GENITIVE[m.group(2).strip()]}")
    return out


# ----------------------------------------------------------------------------------------------- IAU names + unplaced
def parse_wgsn() -> dict:
    out = {}
    for ln in get(WGSN_URL, "IAU-CSN.txt").read_text(encoding="utf-8").splitlines():
        if not ln.strip() or ln[0] in "#$":
            continue
        tok = ln.split()
        k = next((i for i, x in enumerate(tok) if re.fullmatch(r"\d{4}-\d\d-\d\d", x)), None)
        if k is None or k < 14:
            continue
        hip, hd = tok[k - 4], tok[k - 3]
        out[asc(tok[0])] = {"name": tok[1], "designation": " ".join(tok[2:k - 11]), "hip": "" if hip == "_" else hip,
                            "hd": "" if hd == "_" else hd, "date": tok[k], "con": tok[k - 10]}
    return out


def parse_wiki_iau() -> list[tuple[str, str]]:
    """(name, designation) of every IAU-approved name on the mirror of the list (rows with a dagger are not approved)."""
    w = json.loads(get(WIKI_IAU, "iau_wiki.json").read_text())["parse"]["wikitext"]["*"]
    i = w.find('{| class="wikitable sortable sticky-header"')
    j = w.find("\n|}", i)
    out = []

    def clean(s: str) -> str:
        s = re.sub(r"<ref[^>]*?/>|<ref.*?</ref>", "", s, flags=re.S)
        s = re.sub(r"<sup>(.*?)</sup>", lambda m: "".join({"1": "¹", "2": "²", "3": "³", "4": "⁴"}.get(c, c) for c in m.group(1)), s)
        s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
        s = re.sub(r"<small>|</small>", "", s)
        s = re.sub(r"\{\{[^}]*\}\}", "", s)
        return re.sub(r"\s+", " ", s.replace("''", "")).strip()

    for r in w[i:j].split("\n|-")[1:]:
        first = r.strip().lstrip("|").split("\n")[0]
        parts = first.split("||")
        if len(parts) < 2:
            continue
        name, des = clean(parts[0]), clean(parts[1])
        if "†" in name or not name:
            continue
        out.append((name, des))
    return out


def part_iau(rows, placed, unplaced):
    by = key_maps(placed)
    byu = key_maps(unplaced)
    wg = parse_wgsn()
    master = parse_wiki_iau()
    hosts = {}
    for r in csv.reader(l for l in open(ROOT / "site/data/exoplanets.csv", encoding="utf-8") if not l.startswith("#")):
        if r and r[0] != "pl_name":
            hosts[r[1]] = True
    stars, extra, unp, hostrows, unmatched = [], [], [], [], []
    hipseen = set()
    for name, des in master:
        w = wg.get(asc(name))
        row, how = None, None
        if w and w["hip"] and w["hip"] in by["hip"]:
            row, how = by["hip"][w["hip"]], "HIP"
        if row is None and w and w["hd"] and w["hd"] in by["hd"]:
            row, how = by["hd"][w["hd"]], "HD"
        if row is None:
            row, how = resolve_designation(des, by)
        if row is None and name in MANUAL_HIP and str(MANUAL_HIP[name]) in by["hip"]:
            row, how = by["hip"][str(MANUAL_HIP[name])], "HIP"
        urow = None
        if row is None:
            if w and w["hip"] and w["hip"] in byu["hip"]:
                urow = byu["hip"][w["hip"]]
            elif w and w["hd"] and w["hd"] in byu["hd"]:
                urow = byu["hd"][w["hd"]]
            else:
                urow, _ = resolve_designation(des, byu)
        date = w["date"] if w else ""
        if row is not None:
            stars.append([row["_idx"], name, int(row["hip"] or 0), des, date, how])
        elif urow is not None:
            unp.append([int(urow["id"]), name, des, date])
        else:
            hit = next((h for f in host_name_forms(des) for h in [f] if h in hosts), None)
            if hit:
                hostrows.append([hit, name])
            else:
                unmatched.append([name, des])
    # an IAU-named star the names file has no row for (no proper, Bayer or Flamsteed name in HYG): its row, in the names file's shape
    have = {r[0] for r in json.loads((ROOT / "site/data/stars3d.names.json").read_text())["rows"]}
    ce, se = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    extra = []
    for st in stars:
        if st[0] in have:
            continue
        r = next(x for x in placed if x["_idx"] == st[0])
        x, y, z = float(r["x"]) * LY_PER_PC, (float(r["y"]) * ce + float(r["z"]) * se) * LY_PER_PC, (-float(r["y"]) * se + float(r["z"]) * ce) * LY_PER_PC
        lum = float(r["lum"]) if r["lum"] else None
        extra.append([st[0], "", "", "", int(r["hip"] or 0) or None, r["spect"].strip(), round(float(r["dist"]) * LY_PER_PC, 2), round(float(r["mag"]), 2),
                      round(lum, 3) if lum is not None else None, round(x, 4), round(y, 4), round(z, 4)])
    total = len(master)
    print(f"  IAU names: {total} on the list; {len(stars)} placed stars, {len(unp)} stars without a distance, {len(hostrows)} exoplanet hosts, {len(unmatched)} unmatched")
    return {"stars": stars, "extra": extra, "unplaced": unp, "hosts": hostrows, "unmatched": unmatched, "total": total}


def part_unplaced(rows, unplaced, iau):
    """The stars HYG has no distance for: direction and magnitude only (the layer says it cannot place them)."""
    names = {int(r[0]): r for r in iau["unplaced"]}
    recs, named = bytearray(), []
    order = sorted(unplaced, key=lambda r: float(r["mag"]))
    for n, r in enumerate(order):
        ra = float(r["ra"]) * 15.0
        dec = float(r["dec"])
        mag = float(r["mag"])
        ci = r["ci"]
        ra24 = int(round(ra / 360.0 * (1 << 24))) & 0xFFFFFF
        dec24 = int(round((dec + 90.0) / 180.0 * ((1 << 24) - 1)))
        m8 = max(0, min(254, int(round((mag + 1.5) * 12.5))))
        bv8 = 255 if ci == "" else max(0, min(254, int(round((float(ci) + 0.5) * 50))))
        recs += ra24.to_bytes(3, "little") + dec24.to_bytes(3, "little") + bytes([m8, bv8])
        iaun = names.get(int(r["id"]))
        if r["proper"] or r["bf"] or iaun:
            bay = r["bayer"].strip()
            bayer = ""
            if bay:
                head, _, sup = bay.partition("-")
                g = next((k for k, v in GREEK.items() if v == head), head)
                bayer = f"{g}{SUPER_REV.get(sup, sup)} {r['con']}".strip()
            elif r["flam"]:
                bayer = f"{r['flam']} {r['con']}"
            named.append([n, iaun[1] if iaun else r["proper"], bayer, r["spect"], int(r["hip"] or 0), int(r["hd"] or 0), r["con"], (iaun[3] or "IAU") if iaun else "",
                          round(ra, 4), round(dec, 4), mag, int(r["id"])])
    ids = b"".join(struct.pack("<I", int(r["id"])) for r in order)
    header = b"SRUP" + struct.pack("<HHI", 1, 8, len(order)) + struct.pack("<f", float(order[-1]["mag"]))
    p = OUT / "unplaced.bin"
    OUT.mkdir(parents=True, exist_ok=True)
    p.write_bytes(header + bytes(recs) + ids)
    print(f"  wrote {p.relative_to(ROOT)}  {p.stat().st_size:,} B  ({len(order)} stars, {len(named)} with a name)")
    write_json(OUT / "unplaced.names.json", {"version": 1, "built": BUILT, "count": len(order), "source": "HYG v4.4 (CC BY-SA 4.0), the rows with no parallax; names IAU WGSN",
                                             "cols": ["index", "name", "bayerOrFlamsteed", "spect", "hip", "hd", "con", "iauApproved", "raDeg", "decDeg", "mag", "hygId"], "rows": named})
    return len(order)


# The two IAU names whose designation (alpha Centauri C, alpha Centauri A) names a component HYG files under its own HIP number.
MANUAL_HIP = {"Proxima Centauri": 70890, "Rigil Kentaurus": 71683}
SUPER_REV = {"1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"}

# ----------------------------------------------------------------------------------------------- pulsars
def parse_psrcat() -> tuple[list[dict], str]:
    tgz = get(PSRCAT_URL, "psrcat_pkg.tar.gz")
    with tarfile.open(tgz) as t:
        member = next(m for m in t.getmembers() if m.name.endswith("psrcat.db"))
        text = t.extractfile(member).read().decode("utf-8", "replace")
    version = re.search(r"#CATALOGUE\s+(\S+)", text).group(1)
    out = []
    for block in text.split("@-----------------------------------------------------------------"):
        d: dict[str, list[str]] = {}
        for ln in block.splitlines():
            if not ln or ln[0] == "#":
                continue
            p = ln.split()
            if len(p) >= 2:
                d.setdefault(p[0], p[1:])
        if "PSRJ" in d:
            out.append(d)
    return out, version


def with_err(v: list[str] | None):
    """('0.6', '5', ref) -> (0.6, 0.5): psrcat's uncertainty is in units of the value's last digit."""
    if not v:
        return None, None
    try:
        val = float(v[0])
    except ValueError:
        return None, None
    err = None
    if len(v) > 1 and re.fullmatch(r"\d+", v[1]):
        dec = len(v[0].split(".")[1].split("E")[0]) if "." in v[0] else 0
        err = int(v[1]) * 10 ** (-dec)
    return val, err


def part_pulsars(exo, magnetar_positions):
    pulsars, version = parse_psrcat()
    skip = {"noDistance": 0, "noPosition": 0, "alreadyOnTheMap": 0, "listedAsMagnetars": 0}
    rows = []
    for d in pulsars:
        name = d["PSRJ"][0]
        if "RAJ" in d and "DECJ" in d:
            ra, dec = sexa(d["RAJ"][0], True), sexa(d["DECJ"][0])
        elif "ELONG" in d and "ELAT" in d:
            ra, dec = ecl_to_equ(float(d["ELONG"][0]), float(d["ELAT"][0]))
        else:
            skip["noPosition"] += 1
            continue
        px, pxe = with_err(d.get("PX"))
        dist, by = None, None
        if px and px > 0 and pxe is not None and pxe / px < 0.2:
            dist, by = 1.0 / px, 0
        elif d.get("DIST_A"):
            dist, by = float(d["DIST_A"][0]), 1
        elif d.get("DIST_DM"):
            dist, by = float(d["DIST_DM"][0]), 2
        if not dist or dist <= 0:
            skip["noDistance"] += 1
            continue
        names_here = {psr_norm(name), psr_norm(d["PSRB"][0]) if "PSRB" in d else ""} - {""}
        if any(names_here & e["psr_names"] or sep_arcsec((ra, dec), (e["ra"], e["dec"])) < 5 for e in exo if e["kind"] in ("pulsar", "magnetar")):
            skip["alreadyOnTheMap"] += 1
            continue
        types = ",".join(d.get("TYPE", []))
        if "AXP" in types or any(sep_arcsec((ra, dec), m) < 120 for m in magnetar_positions):
            skip["listedAsMagnetars"] += 1
            continue
        if d.get("P0"):
            period = float(d["P0"][0])
        elif d.get("F0"):
            period = 1.0 / float(d["F0"][0])
        else:
            period = None
        assoc = " ".join(d.get("ASSOC", []))
        flags = 0
        if period is not None and period < 0.03:
            flags |= 1
        if "BINARY" in d:
            flags |= 2
        if "RRAT" in types:
            flags |= 4
        if "HE" in types:
            flags |= 8
        if "NRAD" in types:
            flags |= 16
        if "XINS" in types:
            flags |= 32
        if "GC:" in assoc or re.match(r"J\d{4}[+-]\d{4}[A-Z]{1,2}$", name):
            flags |= 64
        if "SNR:" in assoc:
            flags |= 128
        alias = d["PSRB"][0] if "PSRB" in d else ""
        rows.append([name, round(ra, 4), round(dec, 4), float(f"{dist:.3g}"), by, float(f"{period:.6g}") if period else 0, flags, alias])
    rows.sort(key=lambda r: r[0])
    print(f"  ATNF psrcat {version}: {len(pulsars)} pulsars; kept {len(rows)}; skipped {skip}")
    return {"version": 1, "built": BUILT, "source": f"ATNF Pulsar Catalogue v{version} (Manchester, Hobbs, Teoh and Hobbs 2005, AJ 129, 1993; https://www.atnf.csiro.au/research/pulsar/psrcat/), the database file psrcat.db",
            "total": len(pulsars), "skipped": skip, "distBy": ["parallax", "association", "dispersion measure (YMW16 electron model)"],
            "flags": {"1": "millisecond", "2": "binary", "4": "RRAT", "8": "gamma-ray", "16": "no radio", "32": "thermal X-ray", "64": "globular cluster", "128": "supernova remnant"},
            "cols": ["name", "raDeg", "decDeg", "distKpc", "distBy", "periodS", "flags", "alias"], "rows": rows}


# ----------------------------------------------------------------------------------------------- extremes
def part_magnetars(exo):
    """The McGill Online Magnetar Catalog (Olausen and Kaspi 2014, ApJS 212, 6), main table."""
    rd = list(csv.DictReader(get(MCGILL_URL, "magnetars_TabO1.csv").read_text(encoding="utf-8").splitlines()))
    rows, skipped, positions = [], {"noPeriodOrDistance": 0, "alreadyOnTheMap": 0}, []
    for r in rd:
        name = r["Name"].replace("#", "").strip()
        ra, dec = sexa(r["RA"], True), sexa(r["Decl"])
        positions.append((ra, dec))
        if any(sep_arcsec((ra, dec), (e["ra"], e["dec"])) < 120 for e in exo):
            skipped["alreadyOnTheMap"] += 1
            continue
        if not r["Dist"] or not r["Period"]:
            skipped["noPeriodOrDistance"] += 1
            continue
        b = float(r["B"]) / 1e14 if r["B"] else None
        rows.append([name, round(ra, 4), round(dec, 4), float(r["Dist"]), float(f"{float(r['Period']):.7g}"), round(b, 2) if b else None,
                     r["Assoc"].replace("?", "").strip(), 1 if "#" in r["Name"] else 0, 1 if r["Dist_lim"] == "~" else 0])
    print(f"  McGill magnetars: {len(rd)} rows; kept {len(rows)}; skipped {skipped}")
    return rows, skipped, positions, len(rd)


def tex_clean(s: str) -> str:
    s = re.sub(r"\\tablefootmark\{\d+\}|\\textbf|\\mathbf|\\textit|\\rowcolor\{[^}]*\}|\\cellcolor\{[^}]*\}", "", s)
    s = re.sub(r"\\multirow\{[^}]*\}\{[^}]*\}", "", s)
    return s.replace("{", "").replace("}", "").replace("$", "").replace("\\,", "").strip()


def part_blackcat(exo):
    """Black-hole transients from the BlackCAT paper (Corral-Santana et al. 2016, A&A 587, A61; arXiv:1510.08869), tables 2 and 5."""
    d = CACHE / "blackcat"
    if not (d / "table2.tex").exists():
        d.mkdir(parents=True, exist_ok=True)
        tgz = get(BLACKCAT_URL, "blackcat.tgz")
        with tarfile.open(tgz) as t:
            for m in t.getmembers():
                if m.name in ("table2.tex", "table5.tex"):
                    t.extract(m, d)
    t2 = (d / "table2.tex").read_text(errors="ignore")
    t2 = t2[t2.find("\\endlastfoot"):]
    masses = {}
    t5 = (d / "table5.tex").read_text(errors="ignore")
    for ln in t5[t5.find("\\hline\n\\textit"):].split("\n"):
        if ln.count("&") >= 6:
            c = [tex_clean(x) for x in ln.split("&")]
            key = re.sub(r"[^a-z0-9+\-]", "", c[0].lower().replace("--", "-").replace("swift", "swift"))
            m = re.match(r"^(\d+(?:\.\d+)?)\\pm\s*(\d+(?:\.\d+)?)", c[5].replace(" ", ""))
            if m:
                masses[key] = (float(m.group(1)), float(m.group(2)))
    rows, skipped = [], {"noDistance": 0, "distanceOnlyALimit": 0, "alreadyOnTheMap": 0}
    seen = 0
    for ln in t2.split("\n"):
        if ln.count("&") < 8 or not re.search(r"\d\d \d\d", ln):
            continue
        c = [x.strip() for x in ln.split("&")]
        name = tex_clean(c[1]).replace("SWIFT", "Swift").strip()
        ra, dec = sexa(tex_clean(c[2]), True), sexa(tex_clean(c[3]))
        seen += 1
        dist = tex_clean(c[7])
        if not dist.strip():
            skipped["noDistance"] += 1
            continue
        if re.search(r"[<>]|gtrsim|lesssim|leq|geq", dist):
            skipped["distanceOnlyALimit"] += 1
            continue
        m = re.search(r"(\d+(?:\.\d+)?)(?:\\pm\s*(\d+(?:\.\d+)?))?", dist)
        val = float(m.group(1))
        err = float(m.group(2)) if m.group(2) else None
        if any(sep_arcsec((ra, dec), (e["ra"], e["dec"])) < 120 for e in exo):
            skipped["alreadyOnTheMap"] += 1
            continue
        key = re.sub(r"[^a-z0-9+\-]", "", name.lower().replace("--", "-"))
        mass = masses.get(key) or masses.get(key.replace("swift", "swift"))
        rows.append([name, round(ra, 4), round(dec, 4), val, err, mass[0] if mass else None, mass[1] if mass else None, 1 if "~" in dist or "sim" in dist else 0])
    print(f"  BlackCAT paper tables: {seen} transients with a position; kept {len(rows)}; skipped {skipped}; {sum(1 for r in rows if r[5])} with a dynamical mass")
    return rows, skipped, seen


KPC_LY = 3261.5637771674333


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", asc(s).replace("+", "p")).strip("-")  # a "+" is kept as "p" (data/a45.js slug does the same)


def part_extremes(exo):
    """Magnetars, black-hole transients, Gaia BH2, white-dwarf records and the brown dwarfs: ready-made rows for registry-style cards."""
    h = hand()
    rows = []
    mag_rows, mag_skip, mag_pos, mag_total = part_magnetars(exo)
    msrc = "McGill Online Magnetar Catalog (Olausen and Kaspi 2014, ApJS 212, 6; https://www.physics.mcgill.ca/~pulsar/magnetar/main.html), main table, read 2026-10-28"
    for name, ra, dec, dist, period, b14, assoc, cand, approx in mag_rows:
        kind = "magnetar"
        why = f"A magnetar: a neutron star with a magnetic field of about {b14:g} \u00d7 10\u00b9\u2074 gauss, turning once every {period:.3g} seconds." if b14 else f"A magnetar: a neutron star turning once every {period:.3g} seconds."
        if cand:
            why += " The catalogue lists it as a candidate."
        if assoc:
            why += f" Near {assoc}."
        row = {"id": f"mag-{slug(name)}", "name": name, "kind": kind, "raDeg": ra, "decDeg": dec, "distLy": round(dist * KPC_LY), "periodS": period, "why": why, "source": msrc, "aliases": []}
        if approx:
            row["distanceNote"] = "the catalogue marks this distance as approximate"
        rows.append(row)
    bc_rows, bc_skip, bc_seen = part_blackcat(exo)
    bsrc = "BlackCAT, the catalogue of Galactic black-hole transients (Corral-Santana and others 2016, A&A 587, A61, arXiv:1510.08869; http://www.astro.puc.cl/BlackCAT/), the paper's tables 2 and 5, read 2026-10-28"
    for name, ra, dec, dist, err, mass, merr, approx in bc_rows:
        row = {"id": f"bh-{slug(name)}", "name": name, "kind": "blackhole", "raDeg": ra, "decDeg": dec, "distLy": round(dist * KPC_LY),
               "why": "A black-hole X-ray transient: a star in a close pair that feeds a black hole, which now and then lights up in X-rays.", "source": bsrc, "aliases": []}
        if err:
            row["distLyLow"], row["distLyHigh"] = round((dist - err) * KPC_LY), round((dist + err) * KPC_LY)
        elif approx:
            row["distanceNote"] = "the catalogue gives only a rough distance"
        if mass:
            row["massMsun"] = mass
            row["why"] += f" Its black hole weighs about {mass:g} Suns, from the orbit of its companion."
        rows.append(row)
    for b in h["black_holes"]:
        rows.append({"id": b["id"], "name": b["name"], "kind": "blackhole", "raDeg": round(sexa(b["ra"], True), 5), "decDeg": round(sexa(b["dec"]), 5), "distLy": b["dist_ly"],
                     "massMsun": b["mass_msun"], "why": b["why"], "source": b["source"], "aliases": b.get("aliases", [])})
    for w in h["white_dwarfs"]:
        row = {"id": w["id"], "name": w["name"], "kind": "star", "raDeg": round(sexa(w["ra"], True), 5), "decDeg": round(sexa(w["dec"]), 5),
               "distLy": round(1000.0 / w["parallax_mas"] * LY_PER_PC), "why": w["why"], "source": w["source"], "aliases": w.get("aliases", []),
               "distanceNote": f"from Gaia's parallax of {w['parallax_mas']:g} milliarcseconds"}
        if w.get("period_s"):
            row["periodS"] = w["period_s"]
        if w.get("mass_msun"):
            row["massMsun"] = w["mass_msun"]
        rows.append(row)
    bdsrc = h["brown_dwarfs_source"]
    for name, dist, ra, dec, spect, mass, jmag, sub in h["brown_dwarfs"]:
        kindword = "A sub-brown dwarf (some call it a rogue planet)" if sub else "A brown dwarf"
        why = f"{kindword} of spectral type {spect}, {dist:g} light-years from the Sun: too light to burn hydrogen as a star does, so it only glows with the heat it was born with."
        row = {"id": f"bd-{slug(name)}", "name": name, "kind": "star", "raDeg": round(sexa(ra, True), 5), "decDeg": round(sexa(dec), 5), "distLy": round(dist, 3),
               "why": why, "source": bdsrc, "aliases": [], "spect": spect}
        if isinstance(mass, list):
            row["massMsunLow"], row["massMsunHigh"] = mass
        elif mass:
            row["massMsun"] = mass
        if jmag:
            row["jmag"] = jmag
        rows.append(row)
    skipped = {"magnetars": mag_skip, "blackholes": bc_skip}
    counts = {"magnetarsInCatalogue": mag_total, "blackholeTransientsInPaper": bc_seen, "brownDwarfs": len(h["brown_dwarfs"]), "whiteDwarfs": len(h["white_dwarfs"])}
    return {"version": 1, "built": BUILT, "counts": counts, "skipped": skipped, "rows": rows}, mag_pos


# ----------------------------------------------------------------------------------------------- beyond: the Local Group, record galaxies, clusters
def part_beyond(exo):
    h = hand()
    dso = json.loads((ROOT / "site/data/dso.json").read_text())["objects"]
    have = [(o["raDeg"], o["decDeg"], o["id"]) for o in dso if o["kind"] == "galaxy"]
    dso_ids = {o["id"] for o in dso}
    lv = []
    for f in ("dwarf_mw", "dwarf_m31", "dwarf_local_field"):
        lv += [dict(r, _file=f) for r in csv.DictReader(get(LVDB_BASE + f + ".csv", f"lvdb_{f}.csv").read_text(encoding="utf-8").splitlines())]
    lg, skipped = [], {"alreadyOnTheMap": [], "notConfirmed": 0, "outsideTheLocalGroup": 0}
    for r in lv:
        if r["confirmed_real"] != "1":
            skipped["notConfirmed"] += 1
            continue
        settled = r["confirmed_galaxy"] == "1"
        if r["_file"] == "dwarf_local_field" and float(r["distance_lg"]) > 1200.0:
            skipped["outsideTheLocalGroup"] += 1
            continue
        ra, dec, dist = float(r["ra"]), float(r["dec"]), float(r["distance"])
        near = [i for (a, d, i) in have if sep_arcsec((ra, dec), (a, d)) < 1500]
        if near:
            skipped["alreadyOnTheMap"].append([r["name"], near[0]])
            continue
        err = [float(r[k]) if r[k] else None for k in ("distance_em", "distance_ep")]
        host = r["host"]
        parent = {"m_031": "m31", "m_033": "m33", "lmc": "lmc"}.get(host)
        if parent and parent not in dso_ids:
            parent = None
        hostword = {"mw": "a satellite of the Milky Way", "lmc": "a satellite of the Large Magellanic Cloud", "m_031": "a satellite of the Andromeda Galaxy", "m_033": "a satellite of the Triangulum Galaxy"}.get(host, "a dwarf galaxy of the Local Group on its own")
        mv = float(r["apparent_magnitude_v"]) if r["apparent_magnitude_v"] else None
        d = {"id": f"lg-{r['key']}", "name": r["name"], "kind": "galaxy", "typeCode": "dwarf", "typeText": "Dwarf galaxy" if settled else "Dwarf galaxy or star cluster", "hubble": None, "con": None,
             "raDeg": round(ra, 5), "decDeg": round(dec, 5), "distLy": round(dist * KPC_LY),
             "distLyLow": round((dist - err[0]) * KPC_LY) if err[0] else None, "distLyHigh": round((dist + err[1]) * KPC_LY) if err[1] else None,
             "majAxArcmin": None, "minAxArcmin": None, "posAngDeg": None, "vmag": mv,
             "posLy": ecl_ly(ra, dec, dist * KPC_LY), "distanceSource": f"Local Volume Database (Pace 2024, CC0), distance from {r['ref_distance'] or 'the database'}", "positionSource": "Local Volume Database (Pace 2024, CC0)",
             "parent": parent, "why": f"A dwarf galaxy, {hostword}." if settled else f"A faint system of stars, {hostword}, that astronomers have not yet settled is a dwarf galaxy or a star cluster.", "drawn": ["catalogue"]}
        lg.append(d)
    lg.sort(key=lambda d: d["name"])
    print(f"  Local Group (LVDB): {len(lv)} rows read; {len(lg)} new; {len(skipped['alreadyOnTheMap'])} already on the map; {skipped['notConfirmed']} not confirmed; {skipped['outsideTheLocalGroup']} outside")
    # far rows: record galaxies and clusters
    far = []
    for r in h["records"]:
        ra = r["ra_deg"] if "ra_deg" in r else sexa(r["ra"], True)
        dec = r["dec_deg"] if "dec_deg" in r else sexa(r["dec"])
        far.append({"id": r["id"], "name": r["name"], "kind": "galaxy", "raDeg": round(ra, 5), "decDeg": round(dec, 5), "redshift": r["z"], "why": r["why"], "source": r["source"], "aliases": r.get("aliases", []), "record": 1})
    mc = json.loads((CACHE / "mcxc.json").read_text()) if (CACHE / "mcxc.json").exists() else mcxc_fetch()
    mrows = mc["rows"]
    norm = lambda x: re.sub(r"^A0+(\d)", r"A\1", re.sub(r"\s+", "", (x or "").upper()))  # noqa: E731
    gc = yaml.safe_load((ROOT / "registry/galaxy-clusters.yaml").read_text())["clusters"]
    sbf = {c["id"]: c["distance"].get("mpc") for c in gc if c["distance"].get("method") == "sbf"}
    miss = []
    for pick in h["cluster_picks"]:
        key = norm(pick["mcxc"])
        hit = next((m for m in mrows if key in (norm(m[0]), norm(m[1]), norm(m[2]))), None)
        if hit is None:
            miss.append(pick["name"])
            continue
        name, alt, other, ra, dec, z, lx, m500, r500 = hit[:9]
        row = {"id": f"cl-{slug(pick['name'])}", "name": pick["name"], "kind": "cluster", "raDeg": round(ra, 4), "decDeg": round(dec, 4), "redshift": z,
               "aliases": pick.get("aliases", []) + [x for x in (name, alt, other) if x and x not in pick.get("aliases", [])],
               "source": f"MCXC meta-catalogue of X-ray clusters (Piffaretti and others 2011, A&A 534, A109), {name}: position, redshift, M500 and R500 through HEASARC, read 2026-10-28" + (f"; page {pick['page']}" if pick.get("page") else "")}
        why = pick.get("why")
        if not why:
            mass = f"{m500 / 1e15:.1f} quadrillion" if m500 and m500 >= 1e15 else (f"{m500 / 1e12:.0f} trillion" if m500 else None)
            why = "A cluster of galaxies" + (f", with some {mass} Suns inside a sphere {2 * r500 * 3.2615638:.0f} million light-years across (its X-ray size, R500)." if mass and r500 else ".")
        row["why"] = why
        sid = next((k for k, v in (("virgo", "Virgo Cluster"), ("fornax", "Fornax Cluster")) if v == pick["name"]), None)
        if sid and sbf.get(sid):
            row["distLy"] = round(sbf[sid] * 3.2615638e6)
            del row["redshift"]
            row["distanceNote"] = f"the mean of distances found from surface-brightness fluctuations, {sbf[sid]:g} megaparsecs (registry/galaxy-clusters.yaml)"
        far.append(row)
    for c in h["clusters_hand"]:
        far.append({"id": f"cl-{c['id']}", "name": c["name"], "kind": "cluster", "raDeg": round(sexa(c["ra"], True), 4), "decDeg": round(sexa(c["dec"]), 4), "redshift": c["z"],
                    "why": c["why"], "source": c["source"], "aliases": c.get("aliases", [])})
    if miss:
        print("  NOT FOUND in MCXC:", miss, file=sys.stderr)
    print(f"  far rows: {len(far)} ({sum(1 for r in far if r.get('record'))} record galaxies, {sum(1 for r in far if r['kind'] == 'cluster')} clusters)")
    return {"version": 1, "built": BUILT, "licence": "Local Volume Database: CC0 1.0; MCXC: free for scientific use with the paper cited (VizieR/HEASARC); the papers' numbers are facts, cited",
            "localGroup": {"source": "The Local Volume Database (Pace 2024, https://github.com/apace7/local_volume_database, CC0), the dwarf_mw, dwarf_m31 and dwarf_local_field tables, confirmed galaxies, for the local-field table those within 1 200 kpc of the Local Group's centre (its distance_lg column); McConnachie 2012, AJ 144, 4 is the classic list it extends",
                           "skipped": skipped, "total": len(lg) + len(skipped["alreadyOnTheMap"]), "objects": lg},
            "far": far}


def mcxc_fetch():
    f, r = heasarc_tap("SELECT name,alt_name,other_names,ra,dec,redshift,lx_500,mass_500,radius_500,lii,bii FROM mcxc")
    doc = {"fields": f, "rows": r}
    (CACHE / "mcxc.json").write_text(json.dumps(doc))
    return doc


# ----------------------------------------------------------------------------------------------- HEASARC (binary VOTable)
def heasarc_tap(query: str):
    url = HEASARC + "?" + urllib.parse.urlencode({"request": "doQuery", "lang": "adql", "format": "votable", "query": query})
    last = None
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=300) as r:
                data = r.read()
            break
        except Exception as e:  # noqa: BLE001
            last = e
    else:
        raise last
    ns = "{http://www.ivoa.net/xml/VOTable/v1.3}"
    root = ET.fromstring(data)
    st = [i for i in root.iter(ns + "INFO") if i.get("name") == "QUERY_STATUS"]
    if st and st[0].get("value") != "OK":
        raise RuntimeError(st[0].text)
    fields = [(f.get("name"), f.get("datatype"), f.get("arraysize")) for f in root.iter(ns + "FIELD")]
    stream = next(root.iter(ns + "STREAM"), None)
    if stream is None:
        return [n for n, _, _ in fields], []
    b = base64.b64decode(stream.text or "")
    size = {"double": 8, "float": 4, "int": 4, "long": 8, "short": 2, "boolean": 1, "unsignedByte": 1}
    fmt = {"double": ">d", "float": ">f", "int": ">i", "long": ">q", "short": ">h", "boolean": ">B", "unsignedByte": ">B"}
    pos, out = 0, []
    while pos < len(b):
        row = []
        for _, dt, ar in fields:
            if dt == "char":
                if ar == "*":
                    n = struct.unpack_from(">i", b, pos)[0]
                    pos += 4
                else:
                    n = int(ar)
                row.append(b[pos:pos + n].decode("latin-1").strip())
                pos += n
            else:
                v = struct.unpack_from(fmt[dt], b, pos)[0]
                pos += size[dt]
                row.append(None if dt in ("double", "float") and v != v else v)
        out.append(row)
    return [n for n, _, _ in fields], out


def part_quasars(exo):
    """The brightest 1 000 type-Q objects of the Million Quasars catalogue (v8) by optical magnitude, and every one with z > 7."""
    cache = CACHE / "milliquas_q.json"
    if cache.exists():
        q = json.loads(cache.read_text())
    else:
        f, rows = heasarc_tap("SELECT TOP 4000 name,ra,dec,rmag,bmag,redshift,broad_type FROM milliquas WHERE broad_type LIKE 'Q%' AND redshift >= 0.05 AND rmag > 0 AND bmag > 0 ORDER BY rmag")
        f2, hi = heasarc_tap("SELECT name,ra,dec,rmag,bmag,redshift,broad_type FROM milliquas WHERE redshift > 7.0 ORDER BY redshift DESC")
        q = {"bright": rows, "z7": hi}
        cache.write_text(json.dumps(q))
    cand = []
    for name, ra, dec, rm, bm, z, bt in q["bright"]:
        if abs(rm - bm) > 3.0 or rm < 8.0:
            continue
        cand.append((round((rm + bm) / 2, 1), name, ra, dec, z))
    cand.sort()
    rows, skipped = [], {"alreadyOnTheMap": 0}
    def known(ra, dec):
        return any(sep_arcsec((ra, dec), (e["ra"], e["dec"])) < 30 for e in exo)
    for mag, name, ra, dec, z in cand[:1000]:
        if known(ra, dec):
            skipped["alreadyOnTheMap"] += 1
            continue
        rows.append([name, round(ra, 5), round(dec, 5), round(z, 4), mag])
    seen = {r[0] for r in rows}
    hi_rows = []
    for name, ra, dec, rm, bm, z, bt in q["z7"]:
        if name in seen or known(ra, dec):
            continue
        hi_rows.append([name, round(ra, 5), round(dec, 5), round(z, 4), None, 1])
    rows = [r + [0] for r in rows] + hi_rows
    print(f"  Milliquas v8: {len(q['bright'])} candidates read; {len(rows) - len(hi_rows)} brightest kept (faintest mean magnitude {rows[len(rows) - len(hi_rows) - 1][4]}); {len(hi_rows)} with z > 7 added")
    return {"version": 1, "built": BUILT, "source": "Million Quasars Catalog v8 (Flesch 2023, OJAp 6, 49; https://quasars.org/milliquas.htm), through HEASARC's TAP service (table milliquas), read 2026-10-28. Type Q (broad-line quasar) with z >= 0.05; the brightest 1 000 by the mean of the catalogue's R and B magnitudes where the two agree to 3 magnitudes, plus every object with z > 7 (nine in version 8).",
            "magnitudeNote": "catalogue magnitudes, mixed bands and epochs: a ranking, not photometry", "skipped": skipped,
            "cols": ["name", "raDeg", "decDeg", "z", "mag", "z7"], "rows": rows}



def main(argv: list[str]) -> int:
    only = None
    if "--only" in argv:
        only = set(argv[argv.index("--only") + 1].split(","))
    want = lambda name: only is None or name in only  # noqa: E731
    rows = hyg_rows()
    placed, unplaced = hyg_index(rows)
    print(f"HYG v4.4: {len(rows)} rows, {len(placed)} placed (stars3d.bin), {len(unplaced)} without a distance")
    exo = existing_exotics()
    iau = None
    if want("iau") or want("unplaced"):
        iau = part_iau(rows, placed, unplaced)
    if want("iau"):
        write_json(OUT / "iau-names.json", {"version": 1, "built": BUILT, "source": "IAU WGSN (Working Group on Star Names), the list as mirrored on Wikipedia in October 2026 (its prose counts 652 names; the table has 633 without a dagger), with the 2022 IAU-CSN file for the older ones' HIP and HD numbers", "total": iau["total"],
                                            "cols": ["starIndex", "name", "hip", "designation", "approved", "matchedBy"], "stars": iau["stars"], "extra": iau["extra"], "unplacedCount": len(iau["unplaced"]), "hosts": iau["hosts"], "unmatched": iau["unmatched"]})
    if want("unplaced"):
        part_unplaced(rows, unplaced, iau)
    ext = None
    if want("extremes") or want("pulsars"):
        ext, mag_pos = part_extremes(exo)
    if want("extremes"):
        write_json(OUT / "extremes.json", ext)
    if want("pulsars"):
        write_json(OUT / "pulsars.json", part_pulsars(exo, mag_pos))
    if want("beyond"):
        write_json(OUT / "beyond.json", part_beyond(exo))
    if want("quasars"):
        write_json(OUT / "quasars.json", part_quasars(exo))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
