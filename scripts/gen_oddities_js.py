#!/usr/bin/env python3
"""Mirror registry/oddities.yaml into site/js/data/oddities.js, and refuse if it has drifted.

The mechanism -- read the YAML, whitelist, write `export const`, refuse a stale file -- moved to
scripts/_genmirror.py when registry/tours.yaml became the third registry needing it. What stays
here is everything that is about ODDITIES: the header a reader finds at the top of the mirror, the
whitelist, and the one transform that strips a reviewer's citations out of `where:`.

WHAT IS AND IS NOT SHIPPED. `FIELDS` is a whitelist, so a field added to the YAML reaches a phone
only when somebody decides it should:

  shipped      id, display, klass, where, position_class, orbit_provenance, shape, fact, myths,
               cite, as_of
  not shipped  source:  the full evidence -- element dumps, Horizons headers, the reason a
                        secondary was used. A reviewer reads it here.
               note:    the reviewer's notes, the trademark flag, the builder hints.
               attachable: the measured manifest of ids `where.to` may name. It is evidence that
                        CI checks; the browser already has the records themselves.

`cite:` exists BECAUSE of that split. The design this file implements shipped no source field at
all and still drew a "Source:" line on its own example card. A card that cannot say where a fact
came from is not this project's card, so the row carries the long evidence for a reviewer and one
short line for the card, and check_registry.py caps that line at the card's own 160 characters.

The matching and emitting logic stays hand-written next door in data/sample.js, exactly the
rockets.js / rocketmatch.js split -- generated data and hand-written code never share a file, so
`--check` is a plain comparison with nothing to preserve.

Run:  python3 scripts/gen_oddities_js.py           # write it
      python3 scripts/gen_oddities_js.py --check   # exit 1 if the checked-in file is stale
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _genmirror import Mirror, drop, pick  # noqa: E402

FIELDS = (
    "id",
    "display",
    "klass",
    "where",
    "position_class",
    "orbit_provenance",
    "shape",
    "fact",
    "myths",
    "cite",
    "as_of",
)

# Inside `where:`, the same rule again. `anchor.source` and `object.source` are a reviewer's
# citation for one coordinate; the card prints the row's `cite:` and never these.
WHERE_DROP = ("source",)

HEADER = """// GENERATED from registry/oddities.yaml by scripts/gen_oddities_js.py. Do not edit.
//
// `python3 scripts/gen_oddities_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// A row is A CLAIM ABOUT A PLACE. `where.kind` says what KIND of answer "where is it?" has and
// `position_class` says HOW WELL we know it -- two fields, because the Tesla Roadster is in a
// real orbit nobody has looked at since 2018 and Beresheet is on a surface with a published
// 20 m error ellipse, and one field cannot say both.
//
// The evidence a reviewer reads -- full Horizons headers, element dumps, the reason a secondary
// source was used -- stays in the YAML and is not shipped. `cite` is the one line the card prints.
//
// The records these rows become are built hand-written next door in data/sample.js.
"""


def row_of(r: dict) -> dict:
    out = pick(r, FIELDS)
    where = out.get("where")
    if isinstance(where, dict):
        out["where"] = strip_sources(where)
    return out


def strip_sources(where: dict) -> dict:
    clean = drop(where, WHERE_DROP)
    for key in ("anchor", "object"):
        block = clean.get(key)
        if isinstance(block, dict):
            clean[key] = drop(block, WHERE_DROP)
    return clean


def render(doc: dict) -> list[tuple[str, str, object]]:
    return [
        (
            "When registry/oddities.yaml was last checked against its sources.",
            "ODDITIES_OBSERVED_ON",
            str(doc.get("observed_on") or ""),
        ),
        (
            "Every odd thing we sent, and the evidence for where it is now.",
            "ODDITIES",
            [row_of(r) for r in (doc.get("oddities") or [])],
        ),
    ]


MIRROR = Mirror(
    source="registry/oddities.yaml",
    target="site/js/data/oddities.js",
    header=HEADER,
    render=render,
    what="oddities.js",
)


if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
