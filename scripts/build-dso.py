#!/usr/bin/env python3
"""Deep-sky objects with a sourced distance -> site/data/dso.json (spec 0028 step 5).

    python3 scripts/build-dso.py path/to/OpenNGC/NGC.csv path/to/OpenNGC/addendum.csv

Inputs
  OpenNGC NGC.csv + addendum.csv (CC BY-SA 4.0, Mattia Verga): positions, types, sizes, magnitudes,
    Messier numbers, common names. NO distances.
  scripts/data/messier-distances.txt: the Wikipedia Messier table's distance column, kly.
  registry/dso-hand.yaml: objects OpenNGC does not have (the LMC), each with its source.

Output: one JSON row per object WITH a distance -- Messier objects and the hand rows. Nothing is
placed on an invented shell: an object whose distance nobody wrote down is not in this file.
Positions are written in light-years on the ecliptic J2000 axes (the app's sun-inertial frame),
the same rotation build-stars3d.py and parseExoplanets use, so a nebula lands where its stars are.
"""
from __future__ import annotations

import csv
import json
import math
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site/data/dso.json"
OBLIQUITY = math.radians(23.4392911)
KIND = {  # OpenNGC type -> the app's word
    "G": "galaxy", "GPair": "galaxy", "GTrpl": "galaxy", "GGroup": "galaxy",
    "OCl": "cluster", "GCl": "cluster", "Cl+N": "nebula", "*Ass": "cluster",
    "PN": "nebula", "HII": "nebula", "EmN": "nebula", "RfN": "nebula", "Neb": "nebula", "DrkN": "nebula", "SNR": "nebula",
    "*": "other", "**": "other", "Other": "other", "Nova": "other",
}


def hms(s: str) -> float:
    h, m, sec = s.split(":")
    return (float(h) + float(m) / 60 + float(sec) / 3600) * 15


def dms(s: str) -> float:
    sign = -1 if s.strip().startswith("-") else 1
    d, m, sec = s.strip().lstrip("+-").split(":")
    return sign * (float(d) + float(m) / 60 + float(sec) / 3600)


def ecliptic_ly(ra_deg: float, dec_deg: float, dist_ly: float):
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    x, y, z = math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec)
    ce, se = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    return [round(x * dist_ly, 2), round((y * ce + z * se) * dist_ly, 2), round((-y * se + z * ce) * dist_ly, 2)]


def parse_distance(text: str):
    """'4.9–8.1' -> (6.5, 4.9, 8.1); '~10' -> (10, None, None); '33' -> (33, None, None). Thousands of ly."""
    t = text.replace("~", "").replace(",", "").strip()
    m = re.match(r"^([0-9.]+)\s*[–-]\s*([0-9.]+)$", t)
    if m:
        lo, hi = float(m.group(1)), float(m.group(2))
        return (lo + hi) / 2, lo, hi
    return float(t), None, None


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    ngc_rows = []
    for path in argv:
        with open(path, encoding="utf-8", newline="") as fh:
            ngc_rows += list(csv.DictReader(fh, delimiter=";"))
    by_m = {}
    by_name = {}
    for r in ngc_rows:
        by_name[r["Name"]] = r
        # A `Dup` row points at the master object; the master carries the type and the size.
        if r.get("M") and r.get("Type") != "Dup":
            by_m[int(r["M"])] = r
    # M102 has no M column in OpenNGC (the identification with NGC 5866 is disputed); the Wikipedia
    # table lists it as NGC 5866, so the designation column is the fallback key.
    hand = yaml.safe_load((ROOT / "registry/dso-hand.yaml").read_text(encoding="utf-8"))
    table = ROOT / hand["messier_distances"]["table"]
    out = []
    missing = []
    for line in table.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        m_id, desig, common, kind_text, dist_text, con = [c.strip() for c in line.split("|")]
        n = int(m_id[1:])
        row = by_m.get(n)
        if row is None and desig != "—":
            key = re.sub(r"^(NGC|IC)\s*0*(\d+).*$", lambda mm: f"{mm.group(1)}{int(mm.group(2)):04d}", desig)
            row = by_name.get(key)
        if row is None:
            missing.append(m_id)
            continue
        dist, lo, hi = parse_distance(dist_text)
        ra, dec = hms(row["RA"]), dms(row["Dec"])
        ngc_name = row["Name"]
        common_name = (row.get("Common names") or "").split(",")[0].strip() or (common if common != "—" else "")
        out.append({
            "id": f"m{n}",
            "name": f"M{n}" + (f" · {common_name}" if common_name else ""),
            "messier": n,
            "designation": re.sub(r"^(NGC|IC)0*", r"\1 ", ngc_name),
            "common": common_name or None,
            "kind": KIND.get(row["Type"], "other"),
            "typeCode": row["Type"],
            "typeText": kind_text,
            "hubble": row.get("Hubble") or None,
            "con": con,
            "raDeg": round(ra, 5),
            "decDeg": round(dec, 5),
            "distLy": round(dist * 1000),
            "distLyLow": round(lo * 1000) if lo is not None else None,
            "distLyHigh": round(hi * 1000) if hi is not None else None,
            "majAxArcmin": float(row["MajAx"]) if row.get("MajAx") else None,
            "vmag": float(row["V-Mag"]) if row.get("V-Mag") else None,
            "posLy": ecliptic_ly(ra, dec, dist * 1000),
            "distanceSource": hand["messier_distances"]["source"],
            "positionSource": "OpenNGC",
        })
    for o in hand.get("objects") or []:
        dist_kly = o["dist_kly"]
        lo = hi = None
        if isinstance(dist_kly, list):
            lo, hi = dist_kly
            dist_kly = (lo + hi) / 2
        out.append({
            "id": o["id"],
            "name": o["name"],
            "messier": None,
            "designation": o.get("designation"),
            "common": o["name"],
            "kind": KIND.get(o["type"], "other"),
            "typeCode": o["type"],
            "typeText": o.get("hubble") or o["type"],
            "hubble": o.get("hubble"),
            "con": o.get("con"),
            "raDeg": o["ra_deg"],
            "decDeg": o["dec_deg"],
            "distLy": round(dist_kly * 1000),
            "distLyLow": round(lo * 1000) if lo is not None else None,
            "distLyHigh": round(hi * 1000) if hi is not None else None,
            "majAxArcmin": o.get("maj_ax_arcmin"),
            "vmag": o.get("vmag"),
            "posLy": ecliptic_ly(o["ra_deg"], o["dec_deg"], dist_kly * 1000),
            "distanceSource": o["source"],
            "positionSource": o["source"],
            "why": o.get("why"),
        })
    doc = {
        "source": "OpenNGC (CC BY-SA 4.0) positions; distances from the sources each row names; built by scripts/build-dso.py",
        "count": len(out),
        "openNgcTotal": sum(1 for r in ngc_rows if r.get("Type") not in ("Dup", "NonEx")),
        "objects": out,
    }
    OUT.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"dso: {len(out)} objects with a sourced distance ({len(missing)} Messier rows without an OpenNGC row: {missing}); "
          f"OpenNGC holds {doc['openNgcTotal']} real objects -> {OUT.stat().st_size} B")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
