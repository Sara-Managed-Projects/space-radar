#!/usr/bin/env python3
"""Mirror the IMO's activity numbers in registry/showers.yaml into site/js/data/showers-activity.js.

The first mirror (scripts/gen_showers_js.py, site/js/data/showers.js) is on the first visit, for
"Coming up". These numbers are read only by the meteors of the sky from the ground
(site/js/sky/meteors.js), which loads when a night sky is open, so they have their own file and
the first visit does not carry them (internal #416).

Run:  python3 scripts/gen_showers_activity_js.py           # write it
      python3 scripts/gen_showers_activity_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

FIELDS = ("id", "r", "active_from", "active_to", "sol")
ANT_FIELDS = ("display", "zhr", "r", "v_kms", "active_from", "active_to", "ahead_deg")


def render(doc: dict) -> list:
    rows = [pick(r, FIELDS) for r in (doc.get("showers") or []) if isinstance(r, dict) and r.get("r")]
    ant = pick(doc.get("antihelion") or {}, ANT_FIELDS)
    return [
        ("Each shower's population index, activity period (MM-DD) and the Sun's longitude at its maximum (IMO 2027 calendar, Table 5).", "SHOWER_ACTIVITY", rows),
        ("The antihelion source, the same table's first row: `ahead_deg` is how far its radiant is from the Sun along the ecliptic.", "ANTIHELION", ant),
    ]


HEADER = """// GENERATED from registry/showers.yaml by scripts/gen_showers_activity_js.py. Do not edit.
//
// `python3 scripts/gen_showers_activity_js.py --check` fails CI if this file and the YAML disagree,
// so an edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/showers.yaml", target="site/js/data/showers-activity.js", header=HEADER, render=render, what="showers-activity.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
