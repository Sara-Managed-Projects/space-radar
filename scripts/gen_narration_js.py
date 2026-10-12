#!/usr/bin/env python3
"""Mirror registry/narration.yaml into site/js/data/narration.js, and refuse if it has drifted.

Spec 0069 (2026-10-03). The browser needs three things: which stops have a clip, how long each is
(the stop waits for its voice, ui/trip.js holdDwell), and the credit the Sources panel prints. The
hashes, the lexicon and the model's checksums are evidence for a reviewer and for
scripts/narrate.py --check; they stay in the YAML. The file a stop plays is not written here: it is
`audio/narration/<trip>/<stop>.opus` (and `.m4a`, `.vtt`), which is where narrate.py puts it.

Run:  python3 scripts/gen_narration_js.py           # write it (scripts/narrate.py does, after a render)
      python3 scripts/gen_narration_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402


def render(doc: dict) -> list:
    voice = doc.get("voice") or {}
    engine = doc.get("engine") or {}
    clips = {}
    versions = {}
    for r in doc.get("clips") or []:
        if isinstance(r, dict) and r.get("trip") and r.get("stop"):
            clips[f"{r['trip']}/{r['stop']}"] = r.get("seconds")
            # Internal #327: the clip's own hash (its words, voice, speed and pauses), eight
            # characters of it, goes on the URL as `?v=`. The files are served long-lived and keep
            # their names, so before this a card whose words changed went on being read in its old
            # words by every returning visitor until somebody invalidated the path by hand.
            if r.get("hash"):
                versions[f"{r['trip']}/{r['stop']}"] = str(r["hash"])[:8]
    value = {
        "engine": engine.get("name"),
        "voice": voice.get("id"),
        "credit": voice.get("credit"),
        "base": "audio/narration",
        # Stops whose voice is given its own words (`say:`), so their captions are not the card's.
        "scripted": sorted((doc.get("say") or {}).keys()),
        "clips": clips,
        # trip/stop -> the version on that clip's URL (audio/narration.js clipRow).
        "versions": versions,
    }
    return [(
        "The narration (spec 0069): a synthetic voice, made offline. `clips` is trip/stop -> seconds; "
        "nothing here is fetched before the visitor turns sound on.",
        "NARRATION",
        value,
    )]


HEADER = """// GENERATED from registry/narration.yaml by scripts/gen_narration_js.py. Do not edit.
//
// `python3 scripts/gen_narration_js.py --check` fails CI if this file and the YAML disagree, and
// `python3 scripts/narrate.py --check` fails it if a stop's words changed since its clip was made.
"""

MIRROR = Mirror(source="registry/narration.yaml", target="site/js/data/narration.js", header=HEADER, render=render, what="narration.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
