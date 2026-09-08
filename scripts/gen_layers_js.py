#!/usr/bin/env python3
"""Mirror registry/layers.yaml into site/js/data/layers.registry.js, and refuse if it has drifted.

Spec 0026 req 8. The browser's layer table (data/layers.js) is hand-written because a layer's
selection rule and its parser are code; what the REGISTRY decides -- whether a layer is enabled,
its display name, its moments, its budget, which source, which card -- is data, and until now the
browser never read it: `enabled: false` in the YAML switched nothing off. This mirror is what
data/layers.js reads for those fields, and tests/test_layers_registry.mjs refuses a layer that exists
on one side and not the other.

Run:  python3 scripts/gen_layers_js.py           # write it
      python3 scripts/gen_layers_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402


def render(doc: dict) -> list:
    rows = []
    for r in doc.get("layers") or []:
        if not isinstance(r, dict) or not r.get("id"):
            continue
        moments = r.get("moments") or {}
        rows.append({
            "id": r["id"],
            "display": r.get("display"),
            "enabled": r.get("enabled", True) is not False,
            "moments": {k: (v is True or v == "on") for k, v in moments.items()},
            "source": r.get("source"),
            "sources": r.get("sources"),
            "propagator": r.get("propagator"),
            "frame": r.get("frame"),
            "card": r.get("card"),
            "glyph": (r.get("style") or {}).get("glyph"),
            "colour": (r.get("style") or {}).get("colour"),
            "maxItems": (r.get("budget") or {}).get("max_items"),
            "train": r.get("train"),
        })
    return [("Every layer the registry knows, with the fields the registry decides. Order is the registry's.", "LAYER_ROWS", rows)]


HEADER = """// GENERATED from registry/layers.yaml by scripts/gen_layers_js.py. Do not edit.
//
// `python3 scripts/gen_layers_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// data/layers.js keeps the hand-written half of every layer (its selection rule, its parser, its
// stand-in) and takes `enabled`, `display` and `moments` from here. A layer switched off in the
// registry is never loaded, listed or searched.
"""

MIRROR = Mirror(source="registry/layers.yaml", target="site/js/data/layers.registry.js", header=HEADER, render=render, what="layers.registry.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
