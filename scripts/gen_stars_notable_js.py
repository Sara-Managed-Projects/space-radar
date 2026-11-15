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
FIELDS = ("hip", "proper", "name", "why", "source", "radius_suns", "radius_err_suns", "teff_k", "teff_err_k", "physical_source", "mag", "spect")


def render(doc: dict) -> list:
    rows = [pick(r, FIELDS) for r in doc.get("stars") or [] if isinstance(r, dict)]
    # A rotator's numbers ride a module of their own (data/starrotators.js, fetched when such a star is chosen): none of it is here.
    return [("Famous stars, one line each on why, with the page it was read from.", "STARS_NOTABLE", rows)]


def render_rotators(doc: dict) -> list:
    out = {}
    for r in doc.get("stars") or []:
        if isinstance(r, dict) and isinstance(r.get("rotator"), dict) and r.get("hip") is not None:
            # The paper's table (`note`) and the model's name are for the reviewer who reads the YAML; the phone does not draw from them.
            out[str(r["hip"])] = {k: v for k, v in r["rotator"].items() if k not in ("note", "model")}
    return [("Stars measured to be flattened by their spin, by Hipparcos number: the polar radius in Suns (the equatorial one is the "
             "row's radius_suns), the temperatures at the pole and the equator, the spin axis's inclination and position angle.", "STAR_ROTATORS", out)]


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

ROT_HEADER = """// GENERATED from registry/stars-notable.yaml by scripts/gen_stars_notable_js.py. Do not edit.
//
// The `rotator:` blocks of the famous stars (internal #276), fetched by main.js the first time such a star is chosen
// (scene/rotators.js imports this): not part of the first visit. `--check` fails CI if this file and the YAML disagree.
"""

MIRROR = Mirror(source="registry/stars-notable.yaml", target="site/js/data/starsnotable.js", header=HEADER,
                render=render, what="starsnotable.js")

ROTATORS = Mirror(source="registry/stars-notable.yaml", target="site/js/data/starrotators.js", header=ROT_HEADER,
                  render=render_rotators, what="starrotators.js")

if __name__ == "__main__":
    # Both mirrors, one answer: the first non-zero code wins, and each prints its own line.
    sys.exit(max(MIRROR.main(), ROTATORS.main()))
