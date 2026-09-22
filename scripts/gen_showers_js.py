#!/usr/bin/env python3
"""Mirror registry/showers.yaml into site/js/data/showers.js, and refuse if it has drifted.

The eight showers were in the registry, with events.yaml naming them as the source of the
`meteor-shower` event, and nothing in the app read them: "Coming up" had launches, approaches,
perihelia and passes, and not one meteor shower (2026-09-22).

Run:  python3 scripts/gen_showers_js.py           # write it
      python3 scripts/gen_showers_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

FIELDS = ("id", "display", "peak", "zhr", "ra_h", "dec", "parent", "note")


def render(doc: dict) -> list:
    rows = [pick(r, FIELDS) for r in (doc.get("showers") or []) if isinstance(r, dict)]
    return [("The annual showers: nominal peak (MM-DD, it moves by a day between years), ZHR, radiant.", "SHOWERS", rows)]


HEADER = """// GENERATED from registry/showers.yaml by scripts/gen_showers_js.py. Do not edit.
//
// `python3 scripts/gen_showers_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/showers.yaml", target="site/js/data/showers.js", header=HEADER, render=render, what="showers.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
