#!/usr/bin/env python3
"""Mirror the catalogue numbers of registry/cubesats.yaml into site/js/data/cubesats.js.

Release 2.0.0 (batch m2-buses; forge #118). realModelFor() (scene/realmodels.js) draws a catalogued CubeSat as the form factor McDowell's GCAT names for it (1U, 2U, 3U, 6U,
12U; with two deployed panels where GCAT's `Shape` says so). The browser never parses YAML, so this is the table it reads: `{file key: [catalogue numbers]}`, grouped.

Run:  python3 scripts/gen_cubesats_js.py           # write it
      python3 scripts/gen_cubesats_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402

FORMS = ("1u", "2u", "3u", "6u", "12u")


def render(doc: dict) -> list:
    groups: dict = {}
    seen: set = set()
    for row in doc.get("satellites") or []:
        n = int(row["norad"])
        if n in seen:
            raise SystemExit(f"registry/cubesats.yaml: {n} ({row.get('name')}) is listed twice")
        seen.add(n)
        form = row.get("form")
        if form not in FORMS:
            raise SystemExit(f"registry/cubesats.yaml: {row.get('name')} has form {form!r}, not one of {list(FORMS)}")
        if not row.get("jcat") or not row.get("shape"):
            raise SystemExit(f"registry/cubesats.yaml: {row.get('name')} ({n}) has no GCAT citation (jcat and shape): a form is never guessed")
        if row.get("wings") and form not in ("3u", "6u", "12u"):
            raise SystemExit(f"registry/cubesats.yaml: {row.get('name')} is a {form} with wings, which has no file")
        groups.setdefault(form + ("-wings" if row.get("wings") else ""), []).append(n)
    return [("Catalogue numbers by the CubeSat file that draws them, from McDowell's GCAT (registry/cubesats.yaml).", "CUBESAT_NORADS", {k: sorted(v) for k, v in sorted(groups.items())})]


HEADER = """// GENERATED from registry/cubesats.yaml by scripts/gen_cubesats_js.py. Do not edit.
//
// `python3 scripts/gen_cubesats_js.py --check` fails CI if this file and the YAML disagree, so an edit here is an edit that will be
// reverted. A catalogue number is here only when McDowell's GCAT names its form factor (the YAML cites each by JCAT number).
"""

MIRROR = Mirror(source="registry/cubesats.yaml", target="site/js/data/cubesats.js", header=HEADER, render=render, what="cubesats.js", indent=0)

if __name__ == "__main__":
    sys.exit(MIRROR.main())
