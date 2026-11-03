#!/usr/bin/env python3
"""Mirror registry/missions-landers.yaml into site/js/data/missions-landers.js, and refuse if it has drifted.

The dated events of the landers and impactors on Venus, the Moon and Mars (release 1.7.3). Same shape as
registry/missions.yaml, but a file of its own: ui/missions.js fetches the mirror only when the card of a
lander, an impact site or a landing site asks (loadLanders), so it is not in the cost of any other card.

Run:  python3 scripts/gen_missions_landers_js.py           # write it
      python3 scripts/gen_missions_landers_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

MISSION_FIELDS = ("id", "record", "display", "read", "source")
EVENT_FIELDS = ("id", "date", "precision", "title", "text", "place", "world", "source")


def render(doc: dict) -> list:
    rows = []
    for m in doc.get("missions") or []:
        if not isinstance(m, dict):
            continue
        row = pick(m, MISSION_FIELDS)
        row["events"] = [pick(e, EVENT_FIELDS) for e in (m.get("events") or []) if isinstance(e, dict)]
        rows.append(row)
    return [("The landers' and impactors' missions: the record whose card shows them, their source, their dated events in order.", "LANDER_MISSIONS", rows)]


HEADER = """// GENERATED from registry/missions-landers.yaml by scripts/gen_missions_landers_js.py. Do not edit.
//
// `python3 scripts/gen_missions_landers_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML, where each row's source is written down.
"""

MIRROR = Mirror(source="registry/missions-landers.yaml", target="site/js/data/missions-landers.js", header=HEADER, render=render, what="missions-landers.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
