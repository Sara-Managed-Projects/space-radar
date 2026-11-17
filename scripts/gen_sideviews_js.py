#!/usr/bin/env python3
"""Mirror registry/sideviews.yaml into site/js/data/sideviews.js, and refuse a stale or broken one.

Run:  python3 scripts/gen_sideviews_js.py           # check the rules, then write it
      python3 scripts/gen_sideviews_js.py --check   # write nothing; exit 1 if stale or broken

THE RULES (the YAML's header says why). Every row has an `id` that is a link's word (lower case, digits,
hyphens) and is listed once; it names either a `figure` that site/data/constellations.lines.json draws and
site/data/constellation-names.json names, or an `asterism` of such a figure, with the keys of its name (and
of its note, if it has one), a source, as many star names as corners, and a path of at least two corners EVERY
ONE OF WHICH is a corner of its constellation's own lines in the line file. So a pattern added here can only
be drawn through stars the constellation's figure already goes through, and a typed coordinate cannot drift.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import ROOT, Mirror  # noqa: E402

LINES = ROOT / "site" / "data" / "constellations.lines.json"
NAMES = ROOT / "site" / "data" / "constellation-names.json"
ID = re.compile(r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$")
KEY = re.compile(r"^[A-Za-z][A-Za-z0-9]*$")


def corners() -> dict[str, set]:
    """Every figure's corners in the line file, as rounded (ra, dec) pairs."""
    out: dict[str, set] = {}
    for f in json.loads(LINES.read_text(encoding="utf-8")).get("features") or []:
        g = f.get("geometry") or {}
        multi = g.get("coordinates") if g.get("type") == "MultiLineString" else [g.get("coordinates")]
        for line in multi or []:
            for p in line or []:
                out.setdefault(str(f.get("id")), set()).add((round(float(p[0]), 4), round(float(p[1]), 4)))
    return out


def problems(doc: dict) -> list[str]:
    """Every rule the file breaks, as sentences. Empty when it is sound."""
    out: list[str] = []
    have = corners()
    named = {str(r.get("id")) for r in json.loads(NAMES.read_text(encoding="utf-8"))}
    seen = set()
    rows = doc.get("figures") or []
    if not rows:
        out.append("no figures")
    for row in rows:
        rid = row.get("id")
        if not isinstance(rid, str) or not ID.match(rid):
            out.append(f"{rid!r}: an id is lower case, digits and hyphens")
            continue
        if rid in seen:
            out.append(f"{rid}: listed twice")
        seen.add(rid)
        fig, ast = row.get("figure"), row.get("asterism")
        if bool(fig) == bool(ast):
            out.append(f"{rid}: needs exactly one of `figure` and `asterism`")
            continue
        if fig:
            if fig not in have or fig not in named:
                out.append(f"{rid}: `{fig}` is not a figure the line file draws and the names file names")
            continue
        of = ast.get("of")
        if of not in have or of not in named:
            out.append(f"{rid}: asterism.of `{of}` is not a figure the line file draws")
            continue
        for key in ("name", "note"):
            if key == "note" and key not in ast:
                continue
            if not isinstance(ast.get(key), str) or not KEY.match(ast[key]):
                out.append(f"{rid}: asterism.{key} is a key of COPY.figureSide.{key}s")
        if not str(ast.get("source") or "").startswith("https://") or "read 20" not in str(ast.get("source")):
            out.append(f"{rid}: asterism.source is an https page and the day it was read")
        path = ast.get("path") or []
        if len(path) < 2 or not all(isinstance(p, list) and len(p) == 2 for p in path):
            out.append(f"{rid}: asterism.path is at least two [ra, dec] corners")
            continue
        for p in path:
            if (round(float(p[0]), 4), round(float(p[1]), 4)) not in have[of]:
                out.append(f"{rid}: corner {p} is not a corner of {of}'s own lines in the line file")
        stars = ast.get("stars") or []
        if len(stars) != len(path) or not all(isinstance(s, str) and s for s in stars):
            out.append(f"{rid}: asterism.stars names each of the {len(path)} corners")
    return out


def render(doc: dict) -> list:
    found = problems(doc)
    if found:
        print("registry/sideviews.yaml is refused:\n  " + "\n  ".join(found), file=sys.stderr)
        raise SystemExit(1)
    rows = []
    for row in doc.get("figures") or []:
        if row.get("figure"):
            rows.append({"id": row["id"], "figure": row["figure"]})
            continue
        a = row["asterism"]
        out = {"id": row["id"], "of": a["of"], "name": a["name"]}
        if a.get("note"):
            out["note"] = a["note"]
        out["stars"] = list(a["stars"])
        out["path"] = [[float(p[0]), float(p[1])] for p in a["path"]]
        rows.append(out)
    return [("The figures the side view offers by name: an IAU figure, or an asterism drawn through its constellation's own corners.", "SIDE_FIGURES", rows)]


HEADER = """// GENERATED from registry/sideviews.yaml by scripts/gen_sideviews_js.py. Do not edit.
//
// `python3 scripts/gen_sideviews_js.py --check` fails CI if this file and the YAML disagree, or if the YAML
// breaks its rules (an asterism's corners are corners of its constellation's own lines). Fetched with
// ui/figureside.js or ui/searchrows.js, never at boot.
"""

MIRROR = Mirror(source="registry/sideviews.yaml", target="site/js/data/sideviews.js", header=HEADER, render=render, what="sideviews.js", indent=0)

if __name__ == "__main__":
    sys.exit(MIRROR.main())
