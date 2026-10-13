#!/usr/bin/env python3
"""Mirror registry/onboarding.yaml into site/js/data/onboarding.js, and refuse if it has drifted.

The tour (internal spec 0074): the steps, as the browser reads them, and the lengths of the clips
the trips' voice has made of them (registry/narration.yaml, trip `onboarding`), so the caption
offers the voice only where there is one. The feature list stays in the YAML: it is for the
people who change the map and for tests/test_onboarding_upkeep.py, not for a phone.

Fetched by ui/onboarding.js only, which is itself a dynamic import: nothing here is a first visit's.

Run:  python3 scripts/gen_onboarding_js.py           # write it
      python3 scripts/gen_onboarding_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import ROOT, Mirror, pick  # noqa: E402

FIELDS = ("id", "teaches", "hooks", "look", "say", "ask", "awaits", "then", "prepare")


def render(doc: dict) -> list:
    steps = [pick(s, FIELDS) for s in (doc.get("steps") or []) if isinstance(s, dict)]
    trip = str(doc.get("voice_trip") or "onboarding")
    narration = yaml.safe_load((ROOT / "registry" / "narration.yaml").read_text(encoding="utf-8")) or {}
    ids = {s["id"] for s in steps}
    clips = {r["stop"]: r["seconds"] for r in (narration.get("clips") or [])
             if isinstance(r, dict) and r.get("trip") == trip and r.get("stop") in ids}
    voice = {"base": f"audio/narration/{trip}", "clips": {s["id"]: clips[s["id"]] for s in steps if s["id"] in clips}}
    return [
        ("The tour's steps, in order. `hooks` are `data-tour` names: the first one on screen is the target.", "STEPS", steps),
        ("The steps the trips' voice has read: step id -> seconds. Nothing here is fetched before the visitor turns the voice on.", "VOICE", voice),
    ]


HEADER = """// GENERATED from registry/onboarding.yaml by scripts/gen_onboarding_js.py. Do not edit.
//
// `python3 scripts/gen_onboarding_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML (its head says how the tour is kept).
"""

MIRROR = Mirror(source="registry/onboarding.yaml", target="site/js/data/onboarding.js", header=HEADER, render=render, what="onboarding.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
