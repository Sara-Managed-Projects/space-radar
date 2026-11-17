#!/usr/bin/env python3
"""Mirror registry/sstars.yaml into site/js/data/sstars.js (the S-stars on their measured orbits, internal #419).

The generator REFUSES a row whose size and period disagree: Kepler's third law with the centre's mass and distance must give
the star's published period within 6 per cent (every row of Gillessen et al. 2017's Table 3 does, within 4), which catches a
mistyped digit in either; and a row with a missing element, an eccentricity of 1 or more, or a source the file does not name.

Run:  python3 scripts/gen_sstars_js.py           # write it
      python3 scripts/gen_sstars_js.py --check   # exit 1 if the file is stale or a row is refused
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "registry" / "sstars.yaml"
OUT = ROOT / "site" / "js" / "data" / "sstars.js"
FIELDS = ("a", "e", "i", "om", "w", "tp", "p")


def build(doc: dict) -> tuple[dict, list]:
    errs = []
    c = doc.get("centre") or {}
    r0, mass = float(c.get("r0_pc", 0)), float(c.get("mass_msun", 0))
    if not (r0 > 0 and mass > 0):
        errs.append("centre: r0_pc and mass_msun must be set")
    stars, seen = [], set()
    for row in doc.get("stars") or []:
        sid = row.get("id")
        if sid in seen:
            errs.append(f"{sid}: twice")
        seen.add(sid)
        try:
            v = {k: float(row[k][0]) for k in FIELDS}
            for k in FIELDS:
                float(row[k][1])
        except (KeyError, TypeError, ValueError, IndexError):
            errs.append(f"{sid}: every element needs [value, error]: {', '.join(FIELDS)}")
            continue
        if row.get("source") not in ("gillessen2017", "gravity2021"):
            errs.append(f"{sid}: `source` must be gillessen2017 or gravity2021")
        if not (0 <= v["e"] < 1 and v["a"] > 0 and v["p"] > 0):
            errs.append(f"{sid}: not a bound orbit (a {v['a']}, e {v['e']}, P {v['p']})")
            continue
        kep = math.sqrt((v["a"] * r0) ** 3 / mass)
        if abs(kep / v["p"] - 1) > 0.06:
            errs.append(f"{sid}: Kepler's third law gives {kep:.1f} yr for a = {v['a']} arcsec, the row says {v['p']}")
        stars.append({"id": sid, "a": v["a"], "e": v["e"], "i": v["i"], "om": v["om"], "w": v["w"], "tp": v["tp"], "p": v["p"]})
    lab = doc.get("labelled") or []
    for s in lab:
        if s not in seen:
            errs.append(f"labelled {s} is not in the table")
    out = {"r0Pc": r0, "massMsun": mass, "labelled": lab, "stars": stars}
    return out, errs


def render(data: dict) -> str:
    lines = [
        "// GENERATED from registry/sstars.yaml by scripts/gen_sstars_js.py. Do not edit.",
        "// The S-stars' orbits (Gillessen et al. 2017, ApJ 837, 30, Table 3; S2 from GRAVITY Collaboration 2021, arXiv:2101.12098, Table 2):",
        "// a arcsec, e, i/om/w degrees, tp the pericentre date (year), p the period (years). Read by scene/sstars.js, never at boot.",
        "export const SSTARS = {",
        f'  "r0Pc": {json.dumps(data["r0Pc"])},',
        f'  "massMsun": {json.dumps(data["massMsun"])},',
        f'  "labelled": {json.dumps(data["labelled"])},',
        '  "stars": [',
    ]
    rows = [f"    {json.dumps(s, separators=(', ', ': '))}" for s in data["stars"]]
    lines.append(",\n".join(rows))
    lines += ["  ]", "};", ""]
    return "\n".join(lines)


def main() -> int:
    doc = yaml.safe_load(SRC.read_text())
    data, errs = build(doc)
    for e in errs:
        print(f"registry/sstars.yaml: {e}", file=sys.stderr)
    if errs:
        return 1
    text = render(data)
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text() != text:
            print("site/js/data/sstars.js is stale: run python3 scripts/gen_sstars_js.py", file=sys.stderr)
            return 1
        print(f"site/js/data/sstars.js: {len(data['stars'])} stars, up to date")
        return 0
    OUT.write_text(text)
    print(f"wrote site/js/data/sstars.js ({len(data['stars'])} stars)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
