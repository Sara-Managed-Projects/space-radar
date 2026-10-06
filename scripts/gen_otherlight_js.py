#!/usr/bin/env python3
"""Mirror registry/otherlight.yaml into site/js/data/otherlight.js, and refuse if it has drifted.

The sky in other light (public #456): which surveys, where their tiles are, in which frame, and
whose they are. scene/otherlight.js draws them and ui/otherlight.js prints the credit, both from
this mirror, and both are imported dynamically: none of it is on the first visit's path
(tests/test_otherlight.mjs holds that).

Run:  python3 scripts/gen_otherlight_js.py           # write it
      python3 scripts/gen_otherlight_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

# `evidence`, `cors` and `checked` are a reviewer's; a phone needs none of them.
FIELDS = ("id", "hips_id", "base", "file", "frame", "max_order", "tile_width", "format", "stream",
          "gain", "mission", "credit", "terms")


def render(doc: dict) -> list:
    rows = [pick(r, FIELDS) for r in doc.get("bands") or [] if isinstance(r, dict)]
    lic = doc.get("hips_licence") or {}
    return [
        ("One all-sky survey per band: its HiPS at CDS, the baked whole-sky picture, the frame its tiles are cut in, and its credit.", "OTHER_LIGHT", rows),
        ("The tiles' own licence (the HEALPix processing is CDS's).", "HIPS_LICENCE", pick(lic, ("name", "holder", "page"))),
    ]


HEADER = """// GENERATED from registry/otherlight.yaml by scripts/gen_otherlight_js.py. Do not edit.
//
// `python3 scripts/gen_otherlight_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/otherlight.yaml", target="site/js/data/otherlight.js", header=HEADER, render=render, what="otherlight.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
