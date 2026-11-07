#!/usr/bin/env python3
"""Mirror the catalogue numbers of registry/geo-buses.yaml's DRAWN families into site/js/data/geobuses.js.

Release 2.0.0 (batch m2-buses; forge #117). realModelFor() (scene/realmodels.js) draws a geostationary satellite as the bus the registry
sources for it, when that bus has a file, and as the SSL-1300 stand-in otherwise. The browser never parses YAML, so this is the table it
reads: `{bus id: [catalogue numbers]}`, grouped (a number is six characters, a satellite's name and its citations stay in the YAML). A family
whose `file` is null is not here: its satellites keep the stand-in, and the registry says why.

Run:  python3 scripts/gen_geo_buses_js.py           # write it
      python3 scripts/gen_geo_buses_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402


def render(doc: dict) -> list:
    drawn = {b["id"] for b in doc.get("buses") or [] if b.get("file")}
    groups: dict = {}
    seen: dict = {}
    for row in doc.get("satellites") or []:
        n = int(row["norad"])
        if n in seen:
            raise SystemExit(f"registry/geo-buses.yaml: {n} ({row.get('name')}) is listed twice")
        seen[n] = row["bus"]
        if row["bus"] not in {b["id"] for b in doc["buses"]}:
            raise SystemExit(f"registry/geo-buses.yaml: {row.get('name')} names bus {row['bus']!r}, which is not in `buses`")
        if not row.get("cite"):
            raise SystemExit(f"registry/geo-buses.yaml: {row.get('name')} ({n}) has no citation: a bus is never guessed")
        if row["bus"] in drawn:
            groups.setdefault(row["bus"], []).append(n)
    return [("Catalogue numbers by the geostationary bus the registry sources for them, drawn families only (registry/geo-buses.yaml).", "GEO_BUS_NORADS", {k: sorted(v) for k, v in sorted(groups.items())})]


HEADER = """// GENERATED from registry/geo-buses.yaml by scripts/gen_geo_buses_js.py. Do not edit.
//
// `python3 scripts/gen_geo_buses_js.py --check` fails CI if this file and the YAML disagree, so an edit here is an edit that will be
// reverted. A satellite is in this table only when a source names its bus (the YAML cites each one); every other geostationary satellite
// keeps the SSL-1300 stand-in in scene/realmodels.js, and its card says the shape is a stand-in.
"""

MIRROR = Mirror(source="registry/geo-buses.yaml", target="site/js/data/geobuses.js", header=HEADER, render=render, what="geobuses.js", indent=0)

if __name__ == "__main__":
    sys.exit(MIRROR.main())
