#!/usr/bin/env python3
"""Mirror registry/overlays.yaml into site/js/data/overlays.js, and refuse if it has drifted.

Same mechanism as the other mirrors (scripts/_genmirror.py). The browser gets what it asks GIBS
for and what it prints -- the layer, the date rule, the legend, the credit; the measured bytes and
the colormap's address stay in the YAML with the reviewer.

Run:  python3 scripts/gen_overlays_js.py           # write it
      python3 scripts/gen_overlays_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

FIELDS = ("id", "world", "title", "what", "layer", "date", "class", "legend", "credit")
SERVICE_FIELDS = ("wms", "width", "height", "blank_bytes")


def render(doc: dict) -> list:
    rows = [pick(r, FIELDS) for r in (doc.get("overlays") or []) if isinstance(r, dict)]
    return [
        ("Where the pictures are asked for, how big, and under how many bytes one counts as empty.",
         "OVERLAY_SERVICE", pick(doc.get("service") or {}, SERVICE_FIELDS)),
        ("Every map that can be laid over the Earth: the GIBS layer, which day's picture, the legend, the credit.",
         "OVERLAYS", rows),
    ]


HEADER = """// GENERATED from registry/overlays.yaml by scripts/gen_overlays_js.py. Do not edit.
//
// `python3 scripts/gen_overlays_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// OFF THE FIRST VISIT: scene/earthoverlay.js and ui/overlaypanel.js import this, and both arrive
// by a dynamic import (main.js when an overlay is asked for, ui/rail.js with What to show).
"""

MIRROR = Mirror(source="registry/overlays.yaml", target="site/js/data/overlays.js", header=HEADER, render=render, what="overlays.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
