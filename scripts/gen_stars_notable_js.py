#!/usr/bin/env python3
"""Mirror registry/stars-notable.yaml into site/js/data/starsnotable.js, and refuse if it has drifted.

Same mechanism as the other mirrors (scripts/_genmirror.py). No arithmetic here: a row is a HIP
number (or, for the one star Hipparcos never catalogued, a proper name), the name a person uses,
the line the label and the card print, and the page that line was read from. scene/stars3d.js
merges each row into the star record it names when the names file loads.

Run:  python3 scripts/gen_stars_notable_js.py           # write it
      python3 scripts/gen_stars_notable_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

# `source` reaches the phone because the card prints it beside the line: a claim on a card says
# where it was read, as an exotic's fact sheet does.
FIELDS = ("hip", "proper", "name", "why", "source")


def render(doc: dict) -> list:
    rows = [pick(r, FIELDS) for r in doc.get("stars") or [] if isinstance(r, dict)]
    return [("Famous stars, one line each on why, with the page it was read from.", "STARS_NOTABLE", rows)]


HEADER = """// GENERATED from registry/stars-notable.yaml by scripts/gen_stars_notable_js.py. Do not edit.
//
// `python3 scripts/gen_stars_notable_js.py --check` fails CI if this file and the YAML disagree, so
// an edit here is an edit that will be reverted. Change the YAML.
//
// scene/stars3d.js merges each row into the star record it names (`hip-<hip>`, or the HYG row with
// that exact proper name when there is no HIP number): `why` makes the star notable to ui/labels.js
// and is the line ui/cards.js prints under the first sentence; `name` becomes the record's name
// where the names file says something else, and the old one stays as an alias for search.
"""

MIRROR = Mirror(source="registry/stars-notable.yaml", target="site/js/data/starsnotable.js", header=HEADER,
                render=render, what="starsnotable.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
