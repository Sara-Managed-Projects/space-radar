#!/usr/bin/env python3
"""Mirror registry/lod.yaml into site/js/data/lod.js, and refuse if it has drifted.

Same mechanism as the other mirrors (scripts/_genmirror.py); only the field list lives here. The
browser gets the numbers and the hook name; the `why:` stays in the YAML with the reviewer.

Run:  python3 scripts/gen_lod_js.py           # write it
      python3 scripts/gen_lod_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

FIELDS = ("id", "what", "fade", "from_km", "to_km")


def render(doc: dict) -> list:
    rules = [pick(r, FIELDS) for r in (doc.get("rules") or []) if isinstance(r, dict)]
    return [
        (
            "Level-of-detail rules, in file order. Each fades one scene hook between two camera "
            "distances from the Sun (km).",
            "LOD_RULES",
            rules,
        ),
    ]


HEADER = """// GENERATED from registry/lod.yaml by scripts/gen_lod_js.py. Do not edit.
//
// `python3 scripts/gen_lod_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// scene/lod.js reads these: for each rule, a smoothstep between from_km and to_km of the camera's
// distance from the Sun drives the named hook. The `why:` of each rule is in the YAML.
"""

MIRROR = Mirror(
    source="registry/lod.yaml",
    target="site/js/data/lod.js",
    header=HEADER,
    render=render,
    what="lod.js",
)

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
