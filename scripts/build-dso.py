#!/usr/bin/env python3
"""Deep-sky objects with a sourced distance -> site/data/dso.json (spec 0028 step 5).

    python3 scripts/build-dso.py path/to/OpenNGC/NGC.csv path/to/OpenNGC/addendum.csv
    python3 scripts/build-dso.py --refresh      # no OpenNGC: re-apply the registry to the built file
    python3 scripts/build-dso.py --check        # the same, compared and not written (exit 1 if stale)

Inputs
  OpenNGC NGC.csv + addendum.csv (CC BY-SA 4.0, Mattia Verga): positions, types, sizes, magnitudes,
    Messier numbers, common names. NO distances.
  scripts/data/messier-distances.txt: the Wikipedia Messier table's distance column, kly.
  registry/dso-hand.yaml: objects OpenNGC does not have (the LMC), each with its source.

  scripts/data/messier-overlay.yaml: what a Messier row knows beyond the table (spec 0075 task 2):
    its parent, its kind of distance, its orientation and its morphology.

THE OBJECT MODEL (internal spec 0075 design section 3). Every row may carry
  parent        a record id without `dso-`: what the object is inside (or a companion of). A semantic
                association, not a claim of gravitational membership.
  distance      {method, value_ly, low, high, source, read}. `method` is one of DISTANCE_METHODS.
                `assumed-member-of-parent` has no value of its own: the row is PLACED AT ITS PARENT'S
                DISTANCE in its own direction, so the Tarantula sits inside the LMC by construction
                and not by two rounded numbers from two pages.
  orientation   {pa_deg, incl_deg, near_side, source} where one is published.
  morphology    one of MORPHOLOGIES, for galaxies; derived from the row's words when not written.
  drawn         what is drawn for it, each one of DRAWN_CLASSES: `photograph` when registry/nebulae.yaml
                has a picture, `illustration` for the glow and the mark everything else gets.
The record's `cls` (measured) stays the class of its POSITION; `drawn` is the class of its PICTURE.

WITHOUT OpenNGC. The CSVs are not in the tree. `--refresh` keeps the OpenNGC columns of the Messier
rows already in site/data/dso.json, reads the distances from the table again and applies the hand
rows and the overlay: the registry's own fields can be changed and rebuilt without the catalogue.

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


DISTANCE_METHODS = ("parallax", "eclipsing-binary", "cepheid", "TRGB", "standard-candle", "redshift",
                    "kinematic", "assumed-member-of-parent")
MORPHOLOGIES = ("spiral", "barred-spiral", "elliptical", "lenticular", "irregular", "barred-irregular",
                "dwarf-spheroidal", "unknown")
DRAWN_CLASSES = ("photograph", "catalogue", "reconstruction", "model", "illustration")
LY_PER_PC = 3.261563777


def morphology_of(row: dict) -> str | None:
    """A galaxy's morphology from its own words and Hubble code, when the registry does not say. Pure."""
    if row.get("kind") != "galaxy":
        return None
    words = f"{row.get('typeText') or ''} {row.get('hubble') or ''}".lower()
    if "spheroidal" in words or re.search(r"\bdsph\b", words):
        return "dwarf-spheroidal"
    if "lenticular" in words or re.match(r"\s*s0", str(row.get("hubble") or "").lower()):
        return "lenticular"
    if "elliptical" in words:
        return "elliptical"
    if "irregular" in words:
        return "barred-irregular" if "barred" in words else "irregular"
    if "spiral" in words:
        return "barred-spiral" if "barred" in words else "spiral"
    return "unknown"


def apply_model(out: list, hand_rows: list, overlay: dict, pictured: set) -> None:
    """The object model's fields onto the built rows, children placed at their parents' distance. In place."""
    by_id = {r["id"]: r for r in out}
    extra = {o["id"]: o for o in hand_rows}
    extra.update({k: v for k, v in (overlay or {}).items()})
    for r in out:
        e = extra.get(r["id"]) or {}
        r["parent"] = e.get("parent")
        r["orientation"] = plain(e.get("orientation"))
        r["morphology"] = e.get("morphology") or morphology_of(r)
        dist = e.get("distance")
        r["distance"] = plain(dist) if isinstance(dist, dict) else None
        drawn = e.get("drawn")
        r["drawn"] = list(drawn) if drawn else (["photograph"] if r["id"] in pictured else []) + ["illustration"]
    # Own measured distances first, then the children that take their parent's (a chain resolves in order).
    for r in out:
        d = r["distance"]
        if d and d.get("method") != "assumed-member-of-parent" and d.get("value_ly"):
            set_distance(r, d["value_ly"], d.get("low"), d.get("high"), d.get("source") or r.get("distanceSource"))
    for _ in range(4):
        for r in out:
            d = r["distance"]
            if not d or d.get("method") != "assumed-member-of-parent":
                continue
            p = by_id.get(r.get("parent") or "")
            if p is None:
                continue
            set_distance(r, p["distLy"], p.get("distLyLow"), p.get("distLyHigh"),
                         f"its parent's ({p['name']}): {p.get('distanceSource')}")
            r["distance"] = {**d, "value_ly": p["distLy"], "low": p.get("distLyLow"), "high": p.get("distLyHigh")}


def plain(v):
    """A YAML mapping as JSON can hold it: a date read becomes its ISO text."""
    if not isinstance(v, dict):
        return v
    return {k: (x.isoformat() if hasattr(x, "isoformat") else x) for k, x in v.items()}


def set_distance(r: dict, value_ly, low, high, source) -> None:
    if round(value_ly) == r.get("distLy") and r.get("posLy"):
        r["distLyLow"] = round(low) if low else None
        r["distLyHigh"] = round(high) if high else None
        r["distanceSource"] = source
        return
    r["distLy"] = round(value_ly)
    r["distLyLow"] = round(low) if low else None
    r["distLyHigh"] = round(high) if high else None
    r["distanceSource"] = source
    r["posLy"] = ecliptic_ly(r["raDeg"], r["decDeg"], value_ly)


def pictured_ids() -> set:
    neb = yaml.safe_load((ROOT / "registry/nebulae.yaml").read_text(encoding="utf-8")) or {}
    return {str(p.get("id")) for p in (neb.get("pictures") or []) if isinstance(p, dict)}


def load_overlay() -> dict:
    path = ROOT / "scripts/data/messier-overlay.yaml"
    doc = yaml.safe_load(path.read_text(encoding="utf-8")) if path.exists() else {}
    return {str(k): v for k, v in ((doc or {}).get("objects") or {}).items()}


def hand_row(o: dict) -> dict:
    dist_kly = o.get("dist_kly")
    lo = hi = None
    if isinstance(dist_kly, list):
        lo, hi = dist_kly
        dist_kly = (lo + hi) / 2
    d = o.get("distance") or {}
    if dist_kly is None and d.get("value_ly"):
        dist_kly, lo, hi = d["value_ly"] / 1000, (d.get("low") or 0) / 1000 or None, (d.get("high") or 0) / 1000 or None
    dist_kly = dist_kly or 0  # an assumed member's distance is its parent's, set by apply_model
    return {
        "id": o["id"],
        "name": o["name"],
        "messier": None,
        "designation": o.get("designation"),
        "common": o["name"],
        "kind": KIND.get(o["type"], "other"),
        "typeCode": o["type"],
        "typeText": o.get("what") or KIND.get(o["type"], "object"),  # words for the sentence; the Hubble code sits beside them
        "hubble": o.get("hubble"),
        "con": o.get("con"),
        "raDeg": o["ra_deg"],
        "decDeg": o["dec_deg"],
        "distLy": round(dist_kly * 1000),
        "distLyLow": round(lo * 1000) if lo is not None else None,
        "distLyHigh": round(hi * 1000) if hi is not None else None,
        "majAxArcmin": o.get("maj_ax_arcmin"),
        "minAxArcmin": o.get("min_ax_arcmin"),
        "posAngDeg": o.get("pos_ang_deg"),
        "vmag": o.get("vmag"),
        "posLy": ecliptic_ly(o["ra_deg"], o["dec_deg"], dist_kly * 1000),
        "distanceSource": o["source"],
        "positionSource": o["source"],
        "why": o.get("why"),
    }


def messier_table(hand: dict) -> dict:
    table = ROOT / hand["messier_distances"]["table"]
    rows = {}
    for line in table.read_text(encoding="utf-8").splitlines():
        if line.strip():
            cols = [c.strip() for c in line.split("|")]
            rows[int(cols[0][1:])] = cols
    return rows


def write(doc: dict, check: bool) -> int:
    text = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    if check:
        same = OUT.exists() and OUT.read_text(encoding="utf-8") == text
        print("dso: site/data/dso.json is current" if same else "dso: site/data/dso.json is stale; run scripts/build-dso.py --refresh")
        return 0 if same else 1
    OUT.write_text(text, encoding="utf-8")
    return 0


def refresh(check: bool) -> int:
    """Rebuild from the built file's OpenNGC columns, the Messier table, the hand rows and the overlay."""
    hand = yaml.safe_load((ROOT / "registry/dso-hand.yaml").read_text(encoding="utf-8"))
    old = json.loads(OUT.read_text(encoding="utf-8"))
    table = messier_table(hand)
    out = []
    for r in old["objects"]:
        if r.get("messier") is None:
            continue
        r = {k: v for k, v in r.items() if k not in ("parent", "distance", "orientation", "morphology", "drawn")}
        cols = table.get(r["messier"])
        # The positions were worked out from OpenNGC's unrounded angles: kept unless the distance moved.
        if cols and (round(parse_distance(cols[4])[0] * 1000) != r.get("distLy")):
            dist, lo, hi = parse_distance(cols[4])
            set_distance(r, dist * 1000, lo * 1000 if lo is not None else None, hi * 1000 if hi is not None else None,
                         hand["messier_distances"]["source"])
        out.append(r)
    hand_rows = hand.get("objects") or []
    out += [hand_row(o) for o in hand_rows]
    apply_model(out, hand_rows, load_overlay(), pictured_ids())
    doc = {**{k: v for k, v in old.items() if k != "objects"}, "count": len(out), "objects": out}
    rc = write(doc, check)
    if not check:
        print(f"dso: {len(out)} objects re-applied from the registry -> {OUT.stat().st_size} B")
    return rc


def parse_distance(text: str):
    """'4.9–8.1' -> (6.5, 4.9, 8.1); '~10' -> (10, None, None); '33' -> (33, None, None). Thousands of ly."""
    t = text.replace("~", "").replace(",", "").strip()
    m = re.match(r"^([0-9.]+)\s*[–-]\s*([0-9.]+)$", t)
    if m:
        lo, hi = float(m.group(1)), float(m.group(2))
        return (lo + hi) / 2, lo, hi
    return float(t), None, None


def main(argv):
    if argv and argv[0] in ("--refresh", "--check"):
        return refresh(argv[0] == "--check")
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
            # The ellipse (internal #166): OpenNGC's minor axis and position angle (degrees east of north), where it has them.
            "minAxArcmin": float(row["MinAx"]) if row.get("MinAx") else None,
            "posAngDeg": float(row["PosAng"]) if row.get("PosAng") else None,
            "vmag": float(row["V-Mag"]) if row.get("V-Mag") else None,
            "posLy": ecliptic_ly(ra, dec, dist * 1000),
            "distanceSource": hand["messier_distances"]["source"],
            "positionSource": "OpenNGC",
        })
    hand_rows = hand.get("objects") or []
    out += [hand_row(o) for o in hand_rows]
    apply_model(out, hand_rows, load_overlay(), pictured_ids())
    doc = {
        "source": "OpenNGC (CC BY-SA 4.0) positions; distances from the sources each row names; built by scripts/build-dso.py",
        "count": len(out),
        "openNgcTotal": sum(1 for r in ngc_rows if r.get("Type") not in ("Dup", "NonEx")),
        "objects": out,
    }
    write(doc, False)
    print(f"dso: {len(out)} objects with a sourced distance ({len(missing)} Messier rows without an OpenNGC row: {missing}); "
          f"OpenNGC holds {doc['openNgcTotal']} real objects -> {OUT.stat().st_size} B")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
