#!/usr/bin/env python3
"""Mirror registry/budgets.yaml into site/js/data/budgets.js, and refuse if it has drifted.

Spec 0044. The node tests and the browser-side reads (the byte test, and later the per-stop walk
in scripts/shots.mjs) read the gates as `{id: value}`. The `since` and `reason` of each row stay
in the YAML with the reviewer; scripts/check_registry.py check_budgets() is what reads them.

Run:  python3 scripts/gen_budgets_js.py           # write it
      python3 scripts/gen_budgets_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402


def render(doc: dict) -> list:
    budgets = {r["id"]: r["value"] for r in (doc.get("budgets") or []) if isinstance(r, dict) and "id" in r}
    return [("Every gate CI reads, by id (spec 0044). A raised value needs a dated reason in the YAML.", "BUDGETS", budgets)]


HEADER = """// GENERATED from registry/budgets.yaml by scripts/gen_budgets_js.py. Do not edit.
//
// `python3 scripts/gen_budgets_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/budgets.yaml", target="site/js/data/budgets.js", header=HEADER, render=render, what="budgets.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
