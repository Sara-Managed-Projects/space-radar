#!/usr/bin/env python3
"""Mirror registry/geo-buses.yaml into site/js/data/geobuses.js: which bus each geostationary satellite flies, and who says so.

Release 2.0.0 (batch m2-buses; forge #117). realModelFor() (scene/realmodels.js) draws a geostationary satellite whose bus is the SSL-1300 as NASA's SSL-1300 model, and every
other geostationary satellite as the SSL-1300 STAND-IN; a satellite whose row names another bus keeps the stand-in and its card says which bus it is and whose word that is
("Bus: Eurostar E3000 (GCAT). Drawn with a stand-in bus."). The browser never parses YAML, so this is the table it reads: `GEO_BUS_NORADS` = `{key: [catalogue numbers]}` where
the key is a DRAWN bus's id (a family with a `file`) or `<bus id>:<source>` for a held one, the source being the best of the row's citations (gcat, then gunter, wikipedia, wikidata),
and `GEO_BUS_LABELS` = `{bus id: the name a card prints}`. A satellite's name never decides: the key is its catalogue number.

Run:  python3 scripts/gen_geo_buses_js.py           # write it
      python3 scripts/gen_geo_buses_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402

PREFERENCE = ("gcat", "gunter", "wikipedia", "wikidata")


def render(doc: dict) -> list:
    buses = {b["id"]: b for b in doc.get("buses") or []}
    drawn = {i for i, b in buses.items() if b.get("file")}
    groups: dict = {}
    seen: set = set()
    for row in doc.get("satellites") or []:
        n = int(row["norad"])
        if n in seen:
            raise SystemExit(f"registry/geo-buses.yaml: {n} ({row.get('name')}) is listed twice")
        seen.add(n)
        if row["bus"] not in buses:
            raise SystemExit(f"registry/geo-buses.yaml: {row.get('name')} names bus {row['bus']!r}, which is not in `buses`")
        cites = {c.get("by") for c in row.get("cite") or []}
        if not cites:
            raise SystemExit(f"registry/geo-buses.yaml: {row.get('name')} ({n}) has no citation: a bus is never guessed")
        key = row["bus"] if row["bus"] in drawn else row["bus"] + ":" + next(s for s in PREFERENCE if s in cites)
        groups.setdefault(key, []).append(n)
    for i, b in buses.items():
        if not b.get("label"):
            raise SystemExit(f"registry/geo-buses.yaml: bus {i} has no `label`: a card must be able to name it")
    return [
        ("Catalogue numbers by bus, one key a drawn bus and `bus:source` for a held one (registry/geo-buses.yaml).", "GEO_BUS_NORADS", {k: sorted(v) for k, v in sorted(groups.items())}),
        ("The name a card prints for each bus.", "GEO_BUS_LABELS", {i: b["label"] for i, b in buses.items()}),
    ]


HEADER = """// GENERATED from registry/geo-buses.yaml by scripts/gen_geo_buses_js.py. Do not edit.
//
// `python3 scripts/gen_geo_buses_js.py --check` fails CI if this file and the YAML disagree, so an edit here is an edit that will be
// reverted. A satellite is in this table only when a source names its bus (the YAML cites each one); every other geostationary satellite
// keeps the SSL-1300 stand-in in scene/realmodels.js, and its card says the shape is a stand-in.
"""

MIRROR = Mirror(source="registry/geo-buses.yaml", target="site/js/data/geobuses.js", header=HEADER, render=render, what="geobuses.js", indent=0)

if __name__ == "__main__":
    sys.exit(MIRROR.main())
