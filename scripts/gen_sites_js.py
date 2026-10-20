#!/usr/bin/env python3
"""Mirror registry/sites.yaml into site/js/data/sites.js, and refuse if it has drifted.

The dishes and landing sites were ported to data/sample.js by hand, one 22-line record per row,
and nothing checked that the port agreed with the registry. At fourteen rows that held; adding
twenty-one landing sites on 2026-09-22 would have meant 460 more hand-copied lines and the
certainty that one latitude among them would one day differ from its row. So the rows are data
here and data/sample.js's handKeptSites() builds the records from them, the same split the
oddities already use (generated data and code never share a file).

The whitelist leaves out `landed:`, `source:`, `uncertainty_m:` and the `references:` block:
they are the evidence a reviewer reads, and nothing in the browser reads them.

Run:  python3 scripts/gen_sites_js.py           # write it
      python3 scripts/gen_sites_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

FIELDS = ("id", "display", "class", "world", "lat", "lon", "alt_m", "diameter_m", "shape", "record", "aliases", "liftoffs", "doing")


def render(doc: dict) -> list:
    # `app: false` (0076 W2-a): a row kept in the registry (its source, the coverage table) and not
    # shipped, because the app cannot draw it yet and this file rides the first visit (Huygens on Titan).
    rows = [pick(r, FIELDS) for r in (doc.get("sites") or []) if isinstance(r, dict) and r.get("app") is not False]
    return [("Every registry/sites.yaml row, in file order. `record: false` rows are coordinates other rows anchor on, not records.", "SITES", rows)]


HEADER = """// GENERATED from registry/sites.yaml by scripts/gen_sites_js.py. Do not edit.
//
// `python3 scripts/gen_sites_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML. data/sample.js handKeptSites()
// turns these rows into records.
"""

MIRROR = Mirror(source="registry/sites.yaml", target="site/js/data/sites.js", header=HEADER, render=render, what="sites.js")

# THE TRAVERSES (release 1.2.0 stage W2-a, internal spec 0076): the `traverses:` map of the same file,
# with each line from its registry/traverses/<id>.json, into a mirror of their own. Not sites.js:
# that one rides the first visit, and these are read only close to the Moon (scene/traverse.js).
# A line is one string of "lon,lat" pairs in degrees, five decimals, so the file is a line a path.
ROOT = Path(__file__).resolve().parent.parent
TRAVERSE_FIELDS = ("credit",)


def render_traverses(doc: dict) -> list:
    sites = {r.get("id"): r for r in (doc.get("sites") or []) if isinstance(r, dict)}
    out = []
    for sid, t in (doc.get("traverses") or {}).items():
        if not isinstance(t, dict) or sid not in sites:
            continue
        line = json.loads((ROOT / t["file"]).read_text(encoding="utf-8"))
        row = {"site": sid, "world": sites[sid].get("world"), **pick(t, TRAVERSE_FIELDS),
               "lengthKm": line.get("length_km"),
               # 0077 W3-d: the length of the line as drawn, after the simplification (a Mars line's metre-scale jitter goes)
               "drawnKm": line.get("length_km_simplified"),
               "paths": [" ".join(f"{lon:.5f},{lat:.5f}" for lon, lat in p) for p in line.get("paths", [])]}
        out.append(row)
    return [("The rover traverses of registry/sites.yaml `traverses:`, each path a string of 'lon,lat' pairs (degrees, east longitude).", "TRAVERSES", out)]


TRAVERSE_HEADER = """// GENERATED from registry/sites.yaml (`traverses:`) and registry/traverses/*.json by
// scripts/gen_sites_js.py. Do not edit. Read only by scene/traverse.js, close to the Moon.
"""

TRAVERSES_MIRROR = Mirror(source="registry/sites.yaml", target="site/js/data/traverses.js", header=TRAVERSE_HEADER,
                          render=render_traverses, what="traverses.js", indent=1)

if __name__ == "__main__":
    a = MIRROR.main(sys.argv[1:])
    b = TRAVERSES_MIRROR.main(sys.argv[1:])
    sys.exit(a or b)
