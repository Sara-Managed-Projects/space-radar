#!/usr/bin/env python3
"""Mirror registry/autopilot.yaml into site/js/data/autopilot.js, and refuse if it has drifted.

The reels a screen plays on its own (spec 0036): each a list of trip ids. The mirror carries the
ids and nothing of the trips themselves -- titles, stops and clip lengths are read from the trips'
own modules when a reel runs -- so an edit to registry/tours.yaml or a re-rendered narration never
makes this file stale.

Fetched by ui/autopilot.js only, which is itself a dynamic import: nothing here is a first visit's.

Run:  python3 scripts/gen_autopilot_js.py           # write it
      python3 scripts/gen_autopilot_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

FIELDS = ("id", "title", "blurb", "minutes", "sound", "place", "trips")
TIMING = ("title_s", "gate_s", "offer_s", "idle_s", "cursor_s", "reload_h")


def render(doc: dict) -> list:
    reels = [pick(r, FIELDS) for r in (doc.get("reels") or []) if isinstance(r, dict)]
    head = {"default": doc.get("default"), "timing": pick(doc.get("timing") or {}, TIMING)}
    return [
        ("Which reel `#ambient=1` plays, and the seconds ui/autopilotplan.js reads.", "AUTOPILOT", head),
        ("The reels: trip ids in playing order. `minutes` is one lap with the voice, about.", "REELS", reels),
    ]


HEADER = """// GENERATED from registry/autopilot.yaml by scripts/gen_autopilot_js.py. Do not edit.
//
// `python3 scripts/gen_autopilot_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/autopilot.yaml", target="site/js/data/autopilot.js", header=HEADER, render=render, what="autopilot.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
