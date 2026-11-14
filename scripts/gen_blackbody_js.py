#!/usr/bin/env python3
"""Mirror registry/blackbody.yaml into site/js/data/blackbody.js, and refuse if it has drifted.

Run:  python3 scripts/gen_blackbody_js.py           # write it
      python3 scripts/gen_blackbody_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402


def render(doc: dict) -> list:
    knots = [k for k in (doc.get("knots") or []) if isinstance(k, list) and len(k) == 4]
    kelvin = [int(k[0]) for k in knots]
    # one string, 6 hex digits a knot: a boot module, so no line a number
    rgb = "".join("".join(f"{int(c):02x}" for c in k[1:]) for k in knots)
    return [("The black-body colour knots: temperatures in kelvin, and sRGB as 6 hex digits each, in the same order.", "BLACKBODY", {"kelvin": kelvin, "rgb": rgb})]


HEADER = """// GENERATED from registry/blackbody.yaml by scripts/gen_blackbody_js.py. Do not edit.
//
// `python3 scripts/gen_blackbody_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML. Source and method are in the YAML's head.
"""

MIRROR = Mirror(source="registry/blackbody.yaml", target="site/js/data/blackbody.js", header=HEADER, render=render, what="blackbody.js", indent=0)

if __name__ == "__main__":
    sys.exit(MIRROR.main())
