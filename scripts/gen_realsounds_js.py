#!/usr/bin/env python3
"""Mirror the real recordings of registry/audio.yaml (the rows with `heard:`) into site/js/data/realsounds.js.

Forge #163 (2026-11-07). site/js/data/audio.js is in the first visit's bytes (main.js reads it to build the sound
engine) and leaves `clip` rows out; these five are read only by the score (site/js/audio/score.js), which is
imported the first time sound is turned on. So they get their own mirror, fetched with the score and never at boot.
The browser needs which file, where it is heard, how it was made and the credit; the licence text and the original's
URL stay in the YAML for a reviewer. `file` is written as the URL the page asks for (`audio/x.m4a`).

Run:  python3 scripts/gen_realsounds_js.py           # write it
      python3 scripts/gen_realsounds_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

FIELDS = ("id", "file", "twin", "seconds", "heard", "how", "credit")


def url(path) -> str:
    p = str(path or "")
    return p[len("site/"):] if p.startswith("site/") else p


def render(doc: dict) -> list:
    rows = []
    for r in doc.get("audio") or []:
        if not isinstance(r, dict) or not r.get("heard"):
            continue
        row = pick(r, FIELDS)
        for key in ("file", "twin"):
            if key in row:
                row[key] = url(row[key])
        rows.append(row)
    return [("The real recordings, each heard at the stages it names; fetched only when a visitor asks for one (forge #163).", "REAL_SOUNDS", rows)]


HEADER = """// GENERATED from registry/audio.yaml by scripts/gen_realsounds_js.py. Do not edit.
//
// `python3 scripts/gen_realsounds_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/audio.yaml", target="site/js/data/realsounds.js", header=HEADER, render=render, what="realsounds.js")

if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(MIRROR.main())
