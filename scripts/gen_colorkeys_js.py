#!/usr/bin/env python3
"""Mirror registry/colorkeys.yaml into site/js/data/colorkeys.js, and refuse if it has drifted.

Run:  python3 scripts/gen_colorkeys_js.py           # write it
      python3 scripts/gen_colorkeys_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

KEY_FIELDS = ("id", "label", "by", "unit")
BUCKET_FIELDS = ("id", "label", "min", "max", "colour")


def render(doc: dict) -> list:
    keys = []
    for k in doc.get("keys") or []:
        if not isinstance(k, dict):
            continue
        row = pick(k, KEY_FIELDS)
        row["buckets"] = [pick(b, BUCKET_FIELDS) for b in (k.get("buckets") or []) if isinstance(b, dict)]
        keys.append(row)
    return [("Colour keys: which field, which buckets, which colour. Order is the registry's; `class` is the default.", "COLOR_KEYS", keys)]


HEADER = """// GENERATED from registry/colorkeys.yaml by scripts/gen_colorkeys_js.py. Do not edit.
//
// `python3 scripts/gen_colorkeys_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/colorkeys.yaml", target="site/js/data/colorkeys.js", header=HEADER, render=render, what="colorkeys.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
