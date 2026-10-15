#!/usr/bin/env python3
"""Mirror the visual classes and their members into site/js/data/visualclasses.js, and refuse if it has drifted.

Same mechanism as the other mirrors (scripts/_genmirror.py). The classes are registry/visual-classes.yaml's;
the members are scripts/coverage.py's, one class a record, grouped by the record set they live in and
written as the id the app's records use (`dso-m42`, `exotic-sgr-a-star`, `hip-70890`, `jupiter` ...).
Nothing imports this file at boot: search by kind (internal spec 0076 W3-e) fetches it when a visitor
types a class's word.

Run:  python3 scripts/gen_visual_classes_js.py           # write it
      python3 scripts/gen_visual_classes_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import coverage  # noqa: E402
from _genmirror import Mirror  # noqa: E402


def render(doc: dict) -> list:
    result = coverage.collect(doc)
    members: dict = {}
    for r in result["rows"]:
        if r["class"]:
            members.setdefault(r["class"], {}).setdefault(r["domain"], []).append(r["ref"])
    classes = []
    for c in doc.get("classes") or []:
        row = {"id": c["id"], "title": c["title"], "honesty": c["honesty"]}
        if c.get("house"):
            row["house"] = True
        row["members"] = members.get(c["id"], {})
        classes.append(row)
    return [("The 38 classes of the package and the house's four, each with its members by record set.",
             "VISUAL_CLASSES", classes)]


HEADER = """// GENERATED from registry/visual-classes.yaml and the registries it classifies, by
// scripts/gen_visual_classes_js.py. Do not edit: change the YAML and run the script.
//
// `python3 scripts/gen_visual_classes_js.py --check` fails CI when this file and the registries disagree.
// One class a record (scripts/coverage.py refuses a record no class takes, or two take). `honesty` is
// the class's default; a record's own drawn class still wins on its card. Not loaded at boot.
"""

if __name__ == "__main__":
    sys.exit(Mirror(source="registry/visual-classes.yaml", target="site/js/data/visualclasses.js",
                    header=HEADER, render=render, what="visualclasses.js", indent=0).main(sys.argv[1:]))
