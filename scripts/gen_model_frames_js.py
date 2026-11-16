#!/usr/bin/env python3
"""Mirror the `attitude:` of each registry/models.yaml `real_models` row into site/js/data/modelframes.js.

Review of 2026-11-16. A file from other hands (NASA's, most of them) is in its author's axes, so the app
could not point it: it kept a constant angle seeded from the object's id. A row may now say which of the
file's axes is which, and the law the craft is flown by (site/js/scene/attitude.js states the laws):

    attitude: {law: nadir, face: "-y", panel: "z"}
    attitude: {law: sun, face: "+z", panel: "+y"}
    attitude: {law: spin, face: "-z", panel: "x", spin_s: 12.5}

`face` is the axis the law points (the Earth deck for nadir, geo and lvlh; the side turned to the Sun for
sun; the dish's boresight for earth and spin). `panel` is the second axis (the wings' axis; the way a
station flies; a telescope's tube): "x", "+y", "-z" or three numbers when it lies on a diagonal of the
file. `cells`, where the cells face one fixed side square to both, is that side. `spin_s` is the seconds
of one turn, where somebody published it. The browser reads the table with the model's loader and with
the card (never at boot). A row this script cannot read is refused here, so a typo is not a craft flying
at the old constant angle with nothing said.

Run:  python3 scripts/gen_model_frames_js.py           # write it
      python3 scripts/gen_model_frames_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402

LAWS = ("nadir", "geo", "lvlh", "sun", "earth", "spin")  # site/js/scene/attitude.js LAWS
AXIS = re.compile(r"^[+-]?[xyz]$")


def axis(value, row_id: str, key: str):
    """An axis word or three numbers, as the browser will read it; None when it is not there."""
    if value is None:
        return None
    if isinstance(value, list):
        if len(value) != 3 or not all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in value) or not any(value):
            raise SystemExit(f"registry/models.yaml real_models[{row_id}]: attitude.{key}: {value!r} is not three numbers with a length")
        return [float(v) if isinstance(v, float) else v for v in value]
    word = str(value).strip().lower()
    if not AXIS.match(word):
        raise SystemExit(f"registry/models.yaml real_models[{row_id}]: attitude.{key}: {value!r} is not an axis (x, +y, -z, or three numbers)")
    return word


def along(a, b) -> bool:
    """Whether two axes as written are along one line (so they cannot be a face and its second axis)."""
    vec = lambda w: w if isinstance(w, list) else [(-1 if w.startswith("-") else 1) * (c == w[-1]) for c in "xyz"]
    va, vb = vec(a), vec(b)
    cx = (va[1] * vb[2] - va[2] * vb[1], va[2] * vb[0] - va[0] * vb[2], va[0] * vb[1] - va[1] * vb[0])
    return not any(abs(c) > 1e-9 for c in cx)


def render(doc: dict) -> list:
    frames = {}
    for row in doc.get("real_models") or []:
        if not isinstance(row, dict) or "attitude" not in row:
            continue
        rid, att, file = row.get("id"), row.get("attitude"), str(row.get("file") or "")
        if not isinstance(att, dict):
            raise SystemExit(f"registry/models.yaml real_models[{rid}]: attitude: is not a mapping")
        unknown = sorted(set(att) - {"law", "face", "panel", "cells", "spin_s"})
        if unknown:
            raise SystemExit(f"registry/models.yaml real_models[{rid}]: attitude: has keys this script does not know: {unknown}")
        if att.get("law") not in LAWS:
            raise SystemExit(f"registry/models.yaml real_models[{rid}]: attitude.law: {att.get('law')!r} is not one of {list(LAWS)}")
        if not file.startswith("site/models/"):
            raise SystemExit(f"registry/models.yaml real_models[{rid}]: an `attitude:` needs the row's file under site/models/")
        face, panel, cells = axis(att.get("face"), rid, "face"), axis(att.get("panel"), rid, "panel"), axis(att.get("cells"), rid, "cells")
        if face is None or panel is None:
            raise SystemExit(f"registry/models.yaml real_models[{rid}]: attitude: needs both `face` and `panel`")
        if isinstance(face, list) or along(face, panel):
            raise SystemExit(f"registry/models.yaml real_models[{rid}]: attitude: `face` is one of the file's own axes and `panel` may not lie along it")
        out = {"law": att["law"], "face": face, "panel": panel}
        if cells is not None:
            out["cells"] = cells
        if "spin_s" in att:
            spin = att["spin_s"]
            if att["law"] != "spin" or isinstance(spin, bool) or not isinstance(spin, (int, float)) or not spin > 0:
                raise SystemExit(f"registry/models.yaml real_models[{rid}]: attitude.spin_s: a positive number of seconds, on a row whose law is spin")
            out["spinS"] = spin
        frames[file[len("site/models/"):]] = out
    return [("Each file's own axes and the law it is flown by, where its row states them (scene/attitude.js; a file not here keeps the seeded constant angle).", "MODEL_FRAMES", dict(sorted(frames.items())))]


HEADER = """// GENERATED from registry/models.yaml by scripts/gen_model_frames_js.py. Do not edit.
//
// `python3 scripts/gen_model_frames_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the row's `attitude:` in the YAML.
"""

MIRROR = Mirror(source="registry/models.yaml", target="site/js/data/modelframes.js", header=HEADER, render=render, what="modelframes.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main())
