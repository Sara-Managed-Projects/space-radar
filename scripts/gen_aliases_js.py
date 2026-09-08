#!/usr/bin/env python3
"""Mirror registry/aliases.yaml into site/js/data/aliases.js, and refuse if it has drifted.

Run:  python3 scripts/gen_aliases_js.py           # write it
      python3 scripts/gen_aliases_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402


def render(doc: dict) -> list:
    table = {}
    for r in doc.get("aliases") or []:
        if isinstance(r, dict) and r.get("say") and r.get("means"):
            table[str(r["say"]).strip().lower()] = str(r["means"]).strip().lower()
    return [("What people type -> the word to search alongside it. Keys and values lower-cased.", "ALIASES", table)]


HEADER = """// GENERATED from registry/aliases.yaml by scripts/gen_aliases_js.py. Do not edit.
//
// `python3 scripts/gen_aliases_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/aliases.yaml", target="site/js/data/aliases.js", header=HEADER, render=render, what="aliases.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
