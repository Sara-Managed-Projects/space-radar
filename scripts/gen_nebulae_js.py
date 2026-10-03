#!/usr/bin/env python3
"""Mirror registry/nebulae.yaml into site/js/data/nebulae.js, and refuse if it has drifted.

The photographs of the nebulae and galaxies (spec 0067): where each one sits on the sky, how wide
it is, which way is north in it, how its colours were made and whose it is. scene/nebulae.js
places them and ui/exposure.js prints the credit, both from this mirror, and both import it
dynamically: it is not on the first visit's path (tests/test_nebulae.mjs holds that).

Run:  python3 scripts/gen_nebulae_js.py           # write it
      python3 scripts/gen_nebulae_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

# `published` (the archive's own centre, kept as the solver's starting point), `solved` and
# `checked` are a reviewer's evidence; a phone needs none of them.
FIELDS = ("id", "file", "ra_deg", "dec_deg", "width_arcmin", "height_arcmin", "north_deg",
          "colours", "filters", "credit", "licence", "page")


def render(doc: dict) -> list:
    archives = doc.get("archives") or {}
    rows = []
    for r in doc.get("pictures") or []:
        if not isinstance(r, dict):
            continue
        a = archives.get(r.get("archive")) or {}
        row = dict(r)
        row.setdefault("licence", a.get("licence"))
        row["page"] = str(a.get("page", "")).replace("{image}", str(r.get("image", "")))
        rows.append(pick(row, FIELDS))
    return [("One photograph per deep-sky object: its place on the sky (degrees, J2000, the picture's centre), "
             "its size (arcminutes), how far north is turned to the left of up, and its credit.", "NEBULAE", rows)]


HEADER = """// GENERATED from registry/nebulae.yaml by scripts/gen_nebulae_js.py. Do not edit.
//
// `python3 scripts/gen_nebulae_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/nebulae.yaml", target="site/js/data/nebulae.js", header=HEADER, render=render, what="nebulae.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
