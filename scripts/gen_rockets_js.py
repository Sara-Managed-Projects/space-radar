#!/usr/bin/env python3
"""Mirror registry/rockets.yaml into site/js/data/rockets.js, and refuse if it has drifted.

Every other registry file in this repository is mirrored into JS by hand -- data/layers.js says
so on its first line -- because those mirrors contain real functions (`select`, `rank`) that
cannot be generated. A rocket row cannot: it is fourteen scalars and three small maps. Fifty of
them is well past where hand-discipline holds, and registry/models.yaml and the BUILDERS table in
scene/models.js have already drifted apart with nothing checking them.

So this file is generated and CI checks it is current. That makes the YAML the single source of
truth, which is MORE "behaviour is data a human edits", not less.

The matching logic is NOT here. It lives hand-written in site/js/data/rocketmatch.js, which
imports the array this writes. Generated data and hand-written code do not share a file, so
`--check` is a plain comparison with nothing to preserve.

Run:  python3 scripts/gen_rockets_js.py           # write it
      python3 scripts/gen_rockets_js.py --check   # exit 1 if the checked-in file is stale
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "registry" / "rockets.yaml"
TARGET = ROOT / "site" / "js" / "data" / "rockets.js"

# What the browser needs to DRAW and to say what it drew. `source:`, `note:` and `not_in_feed:`
# are the evidence a reviewer reads in the YAML; they are not shipped to a phone.
FIELDS = (
    "id",
    "display",
    "match",
    "stands_for",
    "height_m",
    "core_dia_m",
    "taper",
    "sections",
    "top",
    "boosters",
    "engines",
    "livery",
    "disputed",
    "class",
)

HEADER = """// GENERATED from registry/rockets.yaml by scripts/gen_rockets_js.py. Do not edit.
//
// `python3 scripts/gen_rockets_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// A row is a SILHOUETTE and never a photograph, and it carries its own provenance: `stands_for`
// says whether the drawing is that vehicle or its family, and the card prints that verbatim.
// The matching chain that turns a launch into one of these rows is hand-written next door in
// data/rocketmatch.js.

"""


def render() -> str:
    doc = yaml.safe_load(SOURCE.read_text(encoding="utf-8")) or {}
    rows = doc.get("rockets") or []
    out = [row_of(r) for r in rows]
    body = json.dumps(out, indent=2, ensure_ascii=False)
    observed_on = str(doc.get("observed_on") or "")
    return (
        HEADER
        + f"/** When registry/rockets.yaml was last measured against the live LL2 feed. */\n"
        + f"export const ROCKETS_OBSERVED_ON = {json.dumps(observed_on)};\n\n"
        + f"/** Every drawable launch vehicle, most specific match first. */\n"
        + f"export const ROCKETS = {body};\n"
    )


def row_of(r: dict) -> dict:
    return {k: r[k] for k in FIELDS if k in r}


def main(argv: list[str]) -> int:
    want = render()
    if "--check" in argv:
        have = TARGET.read_text(encoding="utf-8") if TARGET.exists() else ""
        if have == want:
            print(f"rockets.js is current ({want.count(chr(10))} lines from registry/rockets.yaml)")
            return 0
        print(
            "site/js/data/rockets.js is STALE.\n\n"
            "  registry/rockets.yaml has changed and the mirror the browser loads has not.\n"
            "  Run: python3 scripts/gen_rockets_js.py"
        )
        return 1
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(want, encoding="utf-8")
    print(f"wrote {TARGET.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
