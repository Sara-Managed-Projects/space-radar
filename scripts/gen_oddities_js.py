#!/usr/bin/env python3
"""Mirror registry/oddities.yaml into site/js/data/oddities.js, and refuse if it has drifted.

Copied from scripts/gen_rockets_js.py, for the same reason and with the same discipline: the
browser never parses YAML, so a registry a human edits needs a mirror a browser reads, and a
hand-kept mirror drifts. registry/models.yaml and the BUILDERS table in scene/models.js already
did, with nothing checking them.

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

import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "registry" / "oddities.yaml"
TARGET = ROOT / "site" / "js" / "data" / "oddities.js"

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


def render() -> str:
    doc = yaml.safe_load(SOURCE.read_text(encoding="utf-8")) or {}
    rows = doc.get("oddities") or []
    out = [row_of(r) for r in rows]
    body = json.dumps(out, indent=2, ensure_ascii=False, default=str)
    observed_on = str(doc.get("observed_on") or "")
    return (
        HEADER
        + "/** When registry/oddities.yaml was last checked against its sources. */\n"
        + f"export const ODDITIES_OBSERVED_ON = {json.dumps(observed_on)};\n\n"
        + "/** Every odd thing we sent, and the evidence for where it is now. */\n"
        + f"export const ODDITIES = {body};\n"
    )


def row_of(r: dict) -> dict:
    out = {k: r[k] for k in FIELDS if k in r}
    where = out.get("where")
    if isinstance(where, dict):
        out["where"] = strip_sources(where)
    return out


def strip_sources(where: dict) -> dict:
    clean = {k: v for k, v in where.items() if k not in WHERE_DROP}
    for key in ("anchor", "object"):
        block = clean.get(key)
        if isinstance(block, dict):
            clean[key] = {k: v for k, v in block.items() if k not in WHERE_DROP}
    return clean


def main(argv: list[str]) -> int:
    want = render()
    if "--check" in argv:
        have = TARGET.read_text(encoding="utf-8") if TARGET.exists() else ""
        if have == want:
            print(f"oddities.js is current ({want.count(chr(10))} lines from registry/oddities.yaml)")
            return 0
        print(
            "site/js/data/oddities.js is STALE.\n\n"
            "  registry/oddities.yaml has changed and the mirror the browser loads has not.\n"
            "  Run: python3 scripts/gen_oddities_js.py"
        )
        return 1
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(want, encoding="utf-8")
    print(f"wrote {TARGET.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
