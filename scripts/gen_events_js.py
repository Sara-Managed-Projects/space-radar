#!/usr/bin/env python3
"""Mirror registry/events.yaml into site/js/data/events.registry.js, and refuse if it has drifted.

Spec 0031 req 1. registry/events.yaml has held twelve event types since spec 0015, and until
2026-09-23 nothing under site/js read it: the Next list assembled seven kinds from whatever layers
had loaded, and the two types a planetarium leads with -- solar and lunar eclipses, `source:
computed` -- were in no list at all. data/events.js builds its records from this mirror, so a type
switched off here (`enabled: false`, the `reentry` pattern) is never built.

WHAT IS NOT SHIPPED. `lead_times`, `copy` and `ics` are the subscription and feed half (specs 0015
and 0016); no browser code reads them, so they stay in the YAML. The name `events.registry.js`
keeps clear of the hand-written `events.js` beside it, as `layers.registry.js` sits by `layers.js`.

Run:  python3 scripts/gen_events_js.py           # write it
      python3 scripts/gen_events_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402


def render(doc: dict) -> list:
    rows = []
    for r in doc.get("events") or []:
        if not isinstance(r, dict) or not r.get("id"):
            continue
        rows.append({
            "id": r["id"],
            "display": r.get("display"),
            "prominence": r.get("prominence"),
            "locationDependent": r.get("location_dependent") is True,
            # A row enables itself by existing; `enabled: false` is the only way to say otherwise
            # (check_registry.py refuses anything but a boolean).
            "enabled": r.get("enabled", True) is not False,
            "source": r.get("source"),
        })
    return [("Every event type the registry knows, defaults resolved. Order is the registry's.", "EVENT_TYPES", rows)]


HEADER = """// GENERATED from registry/events.yaml by scripts/gen_events_js.py. Do not edit.
//
// `python3 scripts/gen_events_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// data/events.js builds one record per occurrence for every type here with `enabled: true` and a
// builder behind it (spec 0031). `prominence` orders the stream: 1 leads.
"""

MIRROR = Mirror(source="registry/events.yaml", target="site/js/data/events.registry.js", header=HEADER, render=render, what="events.registry.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
