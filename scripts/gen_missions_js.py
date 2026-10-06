#!/usr/bin/env python3
"""Mirror registry/missions.yaml into site/js/data/missions.js, and refuse if it has drifted.

Missions as places in time (public #452, internal #269): a handful of flagship missions, each a
list of dated events with a source. ui/missions.js imports the mirror the first time a card is
opened, so it is not a first visit's cost.

Run:  python3 scripts/gen_missions_js.py           # write it
      python3 scripts/gen_missions_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

MISSION_FIELDS = ("id", "record", "path_record", "display", "read", "source")
EVENT_FIELDS = ("id", "date", "precision", "title", "text", "place", "path_at", "world", "source")


def render(doc: dict) -> list:
    rows = []
    for m in doc.get("missions") or []:
        if not isinstance(m, dict):
            continue
        row = pick(m, MISSION_FIELDS)
        row["events"] = [pick(e, EVENT_FIELDS) for e in (m.get("events") or []) if isinstance(e, dict)]
        rows.append(row)
    return [("The missions with an event list: the record whose card shows it, its source, its dated events in order.", "MISSIONS", rows)]


HEADER = """// GENERATED from registry/missions.yaml by scripts/gen_missions_js.py. Do not edit.
//
// `python3 scripts/gen_missions_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML, where each row's source and what
// `place` means are written down.
"""

MIRROR = Mirror(source="registry/missions.yaml", target="site/js/data/missions.js", header=HEADER, render=render, what="missions.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
