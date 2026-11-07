#!/usr/bin/env python3
"""Write site/data/variables.json: 58 famous variable stars and how their light changes (forge #142).

    python3 scripts/build-variables.py GCVS.tsv HYG.csv[.gz]
    python3 scripts/build-variables.py GCVS.tsv HYG.csv[.gz] --check    fail if the file is not what this writes

GCVS.tsv is VizieR's tab-separated answer for catalogue B/gcvs/gcvs_cat (the General Catalogue of Variable
Stars, Samus et al. 2017, Astronomy Reports 61, 80; version 5.1), one query per star, with the columns
    GCVS RAJ2000 DEJ2000 VarType magMax Min1 n_Min1 Min2 n_Min2 flt Epoch Period M-m/D SpType VarNum
as https://vizier.cfa.harvard.edu/viz-bin/asu-tsv?-source=B/gcvs/gcvs_cat&-out=...&GCVS=bet%20Per gives them
(read 2026-11-07; the three whose name VizieR would not match, khi Cyg, mu. Cep and L 2 Pup, by position).
The GCVS asks to be cited, which CREDITS.md and every card do; a period, an epoch and a range are facts.
HYG v4.4 (CC BY-SA 4.0) gives each star its Hipparcos number, so a star's card finds its curve.

WHAT EACH ROW IS. The catalogue's own numbers (MEASURED): the type, the brightest and faintest magnitude in
its band, the epoch of a maximum (pulsating) or a primary minimum (eclipsing), the period, and M-m/D, the
share of the period a pulsating star takes to rise, or an eclipse lasts. The SHAPE drawn from them is
MODELLED (sky/variables.js): an eclipse dip, a Cepheid's or a Mira's fast rise and slow fall, a sine for a
semi-regular one whose phase nobody can predict. Two stars carry more than the catalogue:
  bet Lyr   its period grows 19 seconds a year, so the GCVS's epoch of 1880 is days out today; the
            quadratic ephemeris of Harmanec & Scholz 1993 (A&A 279, 131) is used instead.
  alf Ori   the Great Dimming, from the dates and magnitudes Wikipedia's article gives with its sources
            (Guinan et al., ATel 13439 and 13512; AAVSO), read 2026-11-07: 0.5 in October 2019, about 1.5 in
            January 2020, the record 1.614 in the second week of February, still 1.6 ten days later, and +0.4
            by 20 April 2020. Outside those months it is the 400-day pulsation those analyses found.
"""
from __future__ import annotations

import csv
import gzip
import io
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site/data/variables.json"
USAGE = "python3 scripts/build-variables.py GCVS.tsv HYG.csv[.gz] [--check]"

# GCVS name -> the name people use (None: the designation is the name).
COMMON = {
    "bet Per": "Algol", "bet Lyr": "Sheliak", "lam Tau": None, "del Lib": None, "eps Aur": "Almaaz", "zet Aur": "Saclateni",
    "VV Cep": None, "U Cep": None, "u Her": None, "W UMa": None, "alf CrB": "Alphecca", "V Pup": None, "RZ Cas": None,
    "del Cep": None, "eta Aql": None, "zet Gem": "Mekbuda", "bet Dor": None, "l Car": None, "X Sgr": None, "W Sgr": None,
    "kap Pav": None, "T Vul": None, "RT Aur": None, "alf UMi": "Polaris", "RR Lyr": None, "del Sct": None, "bet Cep": "Alfirk",
    "omi Cet": "Mira", "khi Cyg": None, "R Leo": None, "R Hya": None, "R Car": None, "R Cas": None, "R Aql": None,
    "R Ser": None, "R Cen": None, "U Ori": None, "T Cep": None, "alf Ori": "Betelgeuse", "alf Sco": "Antares",
    "mu. Cep": "Herschel's Garnet Star", "alf Her": "Rasalgethi", "rho Cas": None, "R Lyr": None, "g Her": None,
    "L 2 Pup": None, "W Cyg": None, "Y CVn": "La Superba", "bet Peg": "Scheat", "RS Cnc": None, "eta Car": "Eta Carinae",
    "P Cyg": None, "gam Cas": None, "R CrB": None, "T CrB": "the Blaze Star", "bet Gru": "Tiaki", "eta Gem": "Propus",
    "R Sct": None,
}
GREEK = {"alf": "α", "bet": "β", "gam": "γ", "del": "δ", "eps": "ε", "zet": "ζ", "eta": "η", "the": "θ", "iot": "ι", "kap": "κ",
         "lam": "λ", "mu.": "μ", "nu.": "ν", "xi.": "ξ", "omi": "ο", "pi.": "π", "rho": "ρ", "sig": "σ", "tau": "τ", "ups": "υ",
         "phi": "φ", "khi": "χ", "psi": "ψ", "ome": "ω"}
QUADRATIC = {"bet Lyr": {"t0": 2408247.966, "p0": 12.913780, "q": 3.87196e-6, "cite": "Harmanec & Scholz 1993, A&A 279, 131"}}
MEASURED = {"alf Ori": {
    "points": [["2019-10-01", 0.5], ["2020-01-15", 1.5], ["2020-02-10", 1.614], ["2020-02-20", 1.6], ["2020-04-20", 0.4]],
    "cite": "Wikipedia, Betelgeuse (Guinan et al., ATel 13439, 13512; AAVSO), read 2026-11-07",
    "periodD": 400, "mean": 0.5, "amp": 0.2,
}}


def shape_of(vtype: str, period: float | None) -> str:
    v = vtype.split("+")[0].rstrip(":")
    if v.startswith("EA"):
        return "eclipse"
    if v.startswith(("EB", "EW")):
        return "binary"
    if v in ("DCEP", "DCEPS", "CEP", "CW", "RRAB", "RRC", "M", "RVA") and period:
        return "pulse"
    if v in ("DSCT", "BCEP") and period:
        return "sine"
    if v.startswith("SR") and period:
        return "sr"
    return "irregular"


def designation(g: str) -> str:
    head, _, con = g.strip().partition(" ")
    con = con.strip()
    return f"{GREEK[head]} {con}" if head in GREEK else f"{head} {con}".replace("L 2", "L²")


def number(s: str) -> float | None:
    s = (s or "").strip()
    return float(s) if s else None


def radec(ra: str, dec: str) -> tuple[float, float]:
    h, m, s = (float(x) for x in ra.split())
    sign = -1.0 if dec.strip().startswith("-") else 1.0
    d, dm, ds = (abs(float(x)) for x in dec.split())
    return (h + m / 60 + s / 3600) * 15.0, sign * (d + dm / 60 + ds / 3600)


def hyg_index(path: Path) -> list[tuple[float, float, int]]:
    raw = path.read_bytes()
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)
    out = []
    for r in csv.DictReader(io.StringIO(raw.decode("utf-8"))):
        if r.get("hip") and float(r["mag"]) < 11:
            out.append((float(r["ra"]) * 15.0, float(r["dec"]), int(float(r["hip"]))))
    return out


def nearest_hip(index, ra: float, dec: float) -> int | None:
    best, best_sep = None, 0.02  # degrees
    cd = math.cos(math.radians(dec))
    for r, d, hip in index:
        if abs(d - dec) > best_sep:
            continue
        sep = math.hypot((r - ra + 540) % 360 - 180, 0) * cd
        sep = math.hypot(sep, d - dec)
        if sep < best_sep:
            best, best_sep = hip, sep
    return best


def build(tsv: Path, hyg: Path) -> str:
    index = hyg_index(hyg)
    rows = []
    for line in tsv.read_text(encoding="utf-8").splitlines():
        f = line.split("\t")
        if len(f) < 15 or not f[0].strip():
            continue
        g = f[0].strip()
        ra, dec = radec(f[1], f[2])
        vtype = f[3].strip()
        mx, mn1, mn2 = number(f[4]), number(f[5]), number(f[7])
        # A "minimum" under the maximum is the catalogue's amplitude, not a magnitude.
        if mn1 is not None and mx is not None and mn1 < mx:
            mn1 = mx + mn1
        if mn2 is not None and mx is not None and mn2 < mx:
            mn2 = mx + mn2
        if mn2 is not None and mn1 is not None and mn2 > mn1:
            mn2 = None
        epoch = number(f[10])
        period = number(f[11])
        frac = number(f[12])
        row = {
            "id": g.replace(".", "").replace(" ", "-").replace("--", "-").lower(),
            "gcvs": g, "name": COMMON.get(g) or designation(g), "designation": designation(g),
            "hip": nearest_hip(index, ra, dec), "ra": round(ra, 5), "dec": round(dec, 5),
            "type": vtype, "shape": shape_of(vtype, period), "band": f[9].strip() or "V",
            "max": mx, "min": mn1, "min2": mn2,
            "epochJd": round(2400000 + epoch, 5) if epoch is not None else None,
            "periodD": period, "frac": round(frac / 100, 3) if frac is not None else None,
        }
        if g in QUADRATIC:
            row["quadratic"] = QUADRATIC[g]
        if g in MEASURED:
            row["measured"] = MEASURED[g]
        rows.append(row)
    doc = {
        "source": "GCVS 5.1 (Samus et al. 2017, Astron. Rep. 61, 80) via VizieR B/gcvs, read 2026-11-07; Hipparcos numbers from HYG v4.4 (CC BY-SA 4.0); bet Lyr: Harmanec & Scholz 1993; alf Ori 2019-20: Wikipedia (ATel 13439, 13512; AAVSO)",
        "rows": rows,
    }
    return json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("--help", "-h"):
        print(f"usage: {USAGE}\n\n{__doc__}")
        return 0 if argv else 2
    if len(argv) < 2 or not Path(argv[0]).is_file() or not Path(argv[1]).is_file():
        print(f"build-variables: need the GCVS answer and HYG\nusage: {USAGE}", file=sys.stderr)
        return 2
    text = build(Path(argv[0]), Path(argv[1]))
    if "--check" in argv[2:]:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print(f"build-variables: {OUT.relative_to(ROOT)} is out of date")
            return 1
        print("build-variables: up to date")
        return 0
    OUT.write_text(text, encoding="utf-8")
    n = len(json.loads(text)["rows"])
    print(f"variables: {n} stars -> {OUT.stat().st_size} B")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
