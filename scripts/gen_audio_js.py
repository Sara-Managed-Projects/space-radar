#!/usr/bin/env python3
"""Mirror registry/audio.yaml into site/js/data/audio.js, and refuse if it has drifted.

Spec 0035 (2026-09-23). The browser needs to know which file is which bed and what to print in
the Sources panel; it does not need the licence text or the page each file was read from, which
are evidence for a reviewer and stay in the YAML. `file` and `twin` are written as the URL the
page asks for (`audio/x.opus`), not the repository path (`site/audio/x.opus`).

Run:  python3 scripts/gen_audio_js.py           # write it
      python3 scripts/gen_audio_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

FIELDS = ("id", "kind", "stage", "file", "twin", "seconds", "kb", "loop", "credit")


def url(path) -> str:
    p = str(path or "")
    return p[len("site/"):] if p.startswith("site/") else p


def render(doc: dict) -> list:
    rows = []
    for r in doc.get("audio") or []:
        if not isinstance(r, dict):
            continue
        row = pick(r, FIELDS)
        for key in ("file", "twin"):
            if key in row:
                row[key] = url(row[key])
        rows.append(row)
    return [("Every sound the app can play, fetched only after the visitor turns sound on (spec 0035).", "AUDIO", rows)]


HEADER = """// GENERATED from registry/audio.yaml by scripts/gen_audio_js.py. Do not edit.
//
// `python3 scripts/gen_audio_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/audio.yaml", target="site/js/data/audio.js", header=HEADER, render=render, what="audio.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
