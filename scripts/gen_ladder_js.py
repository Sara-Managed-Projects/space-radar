#!/usr/bin/env python3
"""Mirror registry/ladder.yaml into site/js/data/ladder.js, and refuse if it has drifted.

Run:  python3 scripts/gen_ladder_js.py           # write it
      python3 scripts/gen_ladder_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

RUNG_FIELDS = ("id", "label", "target", "layer", "distance", "why")
SHOW_FIELDS = ("what", "n", "of", "source")


def render(doc: dict) -> list:
    rungs = [pick(r, RUNG_FIELDS) for r in (doc.get("rungs") or []) if isinstance(r, dict)]
    show = [pick(r, SHOW_FIELDS) for r in (doc.get("we_show") or []) if isinstance(r, dict)]
    return [
        ("The breadcrumb: places in order of distance, each a world or a record the app has.", "LADDER_RUNGS", rungs),
        ("How much of the known sky this map draws, with sources.", "WE_SHOW", show),
    ]


HEADER = """// GENERATED from registry/ladder.yaml by scripts/gen_ladder_js.py. Do not edit.
//
// `python3 scripts/gen_ladder_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/ladder.yaml", target="site/js/data/ladder.js", header=HEADER, render=render, what="ladder.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
