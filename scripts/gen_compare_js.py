#!/usr/bin/env python3
"""Mirror registry/compare.yaml into site/js/data/compare.js, and refuse if it has drifted.

Run:  python3 scripts/gen_compare_js.py           # write it
      python3 scripts/gen_compare_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

BODY_FIELDS = (
    "world", "page", "updated", "radius_km", "mass_e", "gravity", "temp_c", "temp_at", "spin_h", "retro",
    "year_d", "sun_mkm", "air", "air_bar", "exosphere", "moons", "rings", "rings_page", "ring_bands",
)


def render(doc: dict) -> list:
    bodies = [pick(b, BODY_FIELDS) for b in (doc.get("bodies") or []) if isinstance(b, dict)]
    return [
        ("The day the NASA pages were read, as YYYY-MM-DD.", "COMPARE_READ", str(doc.get("read") or "")),
        ("What the Compare view and the comparison lab say about a world: NASA's Planetary Fact Sheets, one row a body.", "COMPARE_BODIES", bodies),
    ]


HEADER = """// GENERATED from registry/compare.yaml by scripts/gen_compare_js.py. Do not edit.
//
// `python3 scripts/gen_compare_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML. Read by ui/compare.js, which is
// fetched when a card's Compare row is opened and never at boot.
"""

MIRROR = Mirror(source="registry/compare.yaml", target="site/js/data/compare.js", header=HEADER, render=render, what="compare.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
