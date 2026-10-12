#!/usr/bin/env python3
"""Mirror registry/textures.yaml into site/js/data/textures.js, and refuse if it has drifted.

2026-09-28, the device tiers. The browser needs, per map: which world and slot it dresses, when a
sharper file may be fetched (`when`), and per tier the URL, the size in pixels and bytes, whether it
is one grey channel, whether it is one file per month, and the credit line the Sources panel prints.
It does not need the licence text, the page each file was read from or how it was made, which are
evidence for a reviewer and stay in the YAML. `file` is written as the URL the page asks for
(`textures/4k/moon.webp`), not the repository path.

Run:  python3 scripts/gen_textures_js.py           # write it
      python3 scripts/gen_textures_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

ROW_FIELDS = ("id", "world", "slot", "when", "coverage")
FILE_FIELDS = ("tier", "file", "px", "bytes", "format", "monthly", "credit")


def url(path) -> str:
    p = str(path or "")
    return p[len("site/"):] if p.startswith("site/") else p


def render(doc: dict) -> list:
    rows = []
    for r in doc.get("textures") or []:
        if not isinstance(r, dict):
            continue
        row = pick(r, ROW_FIELDS)
        files = []
        for f in r.get("files") or []:
            if not isinstance(f, dict):
                continue
            g = pick(f, FILE_FIELDS)
            g["file"] = url(g.get("file"))
            files.append(g)
        row["files"] = sorted(files, key=lambda g: g.get("tier", 0))
        rows.append(row)
    return [("Every map the scene can wear, a file per device tier (scene/quality.js, scene/texturetiers.js).",
             "TEXTURES", rows)]


HEADER = """// GENERATED from registry/textures.yaml by scripts/gen_textures_js.py. Do not edit.
//
// `python3 scripts/gen_textures_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/textures.yaml", target="site/js/data/textures.js", header=HEADER,
                render=render, what="textures.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
