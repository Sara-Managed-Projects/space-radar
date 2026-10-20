#!/usr/bin/env python3
"""Mirror the `look:` of each registry/models.yaml `real_models` row into site/js/data/modellooks.js.

Release 1.3.0 (internal #967). A real model is drawn in physically based materials (scene/pbr.js) when
its file carries real materials, and on the toon ramp otherwise; a row's `look: pbr | toon` overrides
that, file by file. The browser reads `{file: look}` for the rows that say one, when it loads a file
(scene/realmodels.js loadKit): never at boot. A `look:` that is neither word is refused here.

Run:  python3 scripts/gen_model_looks_js.py           # write it
      python3 scripts/gen_model_looks_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402

LOOKS = ("pbr", "toon")


def render(doc: dict) -> list:
    looks = {}
    for row in doc.get("real_models") or []:
        if not isinstance(row, dict) or "look" not in row:
            continue
        look, file = row.get("look"), str(row.get("file") or "")
        if look not in LOOKS:
            raise SystemExit(f"registry/models.yaml real_models[{row.get('id')}]: look: {look!r} is not one of {list(LOOKS)}")
        if not file.startswith("site/models/"):
            raise SystemExit(f"registry/models.yaml real_models[{row.get('id')}]: a `look:` needs the row's file under site/models/")
        looks[file[len("site/models/"):]] = look
    return [("The look each file is drawn in, where its row states one (scene/pbr.js lookOf decides the rest).", "MODEL_LOOKS", dict(sorted(looks.items())))]


HEADER = """// GENERATED from registry/models.yaml by scripts/gen_model_looks_js.py. Do not edit.
//
// `python3 scripts/gen_model_looks_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the row's `look:` in the YAML.
"""

MIRROR = Mirror(source="registry/models.yaml", target="site/js/data/modellooks.js", header=HEADER, render=render, what="modellooks.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
