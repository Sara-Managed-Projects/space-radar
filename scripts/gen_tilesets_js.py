#!/usr/bin/env python3
"""Mirror registry/tilesets.yaml into site/js/data/tilesets.js, and refuse if it has drifted.

2026-10-03, spec 0065. The browser needs, per tile set: which world it dresses, the URL template,
the shape of the pyramid (matrix, tile size, the three levels), the grade that sits it at the tone
of the map under it, and the credit line the Sources panel
prints while those tiles are on screen. It does not need the licence text, the CORS measurement or
the page the set was read from, which are evidence for a reviewer and stay in the YAML.

Run:  python3 scripts/gen_tilesets_js.py           # write it
      python3 scripts/gen_tilesets_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402

# YAML name -> the name the browser reads.
FIELDS = (("id", "id"), ("world", "world"), ("title", "title"), ("url", "url"), ("mode", "mode"), ("matrix", "matrix"),
          ("tile_px", "tilePx"), ("min_level", "minLevel"), ("start_level", "startLevel"),
          ("max_level", "maxLevel"), ("resolution_m", "resolutionM"), ("grade", "grade"),
          ("credit", "credit"))


def render(doc: dict) -> list:
    rows = []
    for r in doc.get("tilesets") or []:
        if isinstance(r, dict):
            rows.append({js: r[y] for y, js in FIELDS if y in r})
    return [("Map tiles a world is drawn from when the camera is close (scene/tiles.js, scene/tilemath.js).",
             "TILESETS", rows)]


HEADER = """// GENERATED from registry/tilesets.yaml by scripts/gen_tilesets_js.py. Do not edit.
//
// `python3 scripts/gen_tilesets_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/tilesets.yaml", target="site/js/data/tilesets.js", header=HEADER,
                render=render, what="tilesets.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
