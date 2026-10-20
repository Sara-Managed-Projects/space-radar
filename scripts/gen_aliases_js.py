#!/usr/bin/env python3
"""Mirror registry/aliases.yaml into site/js/data/aliases.js and site/js/data/kindwords.js, and refuse if
either has drifted.

Two files from one registry because one is in the boot graph and the other must not be: ui/search.js
imports ALIASES on the first screen, and the kind words (`kinds:`, internal spec 0076 W3-e) are read by
ui/searchrows.js, which the field fetches on its first focus (tests/test_boot_diet.mjs holds it out).

Run:  python3 scripts/gen_aliases_js.py           # write it
      python3 scripts/gen_aliases_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import ROOT, Mirror  # noqa: E402


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

def class_ids() -> set:
    import yaml

    doc = yaml.safe_load((ROOT / "registry/visual-classes.yaml").read_text(encoding="utf-8")) or {}
    return {c["id"] for c in doc.get("classes") or [] if isinstance(c, dict) and c.get("id")}


def render_kinds(doc: dict) -> list:
    """The kind rows, checked: words lower-cased and claimed once, classes the registry has, one meaning a row."""
    known = class_ids()
    seen: dict = {}
    rows = []
    problems = []
    for n, r in enumerate(doc.get("kinds") or []):
        say = [" ".join(str(w).lower().split()) for w in (r.get("say") or [])]
        classes = [str(c) for c in (r.get("classes") or [])]
        if not say:
            problems.append(f"kinds[{n}] has no words")
        for w in say:
            if w in seen:
                problems.append(f"'{w}' is claimed by kinds[{seen[w]}] and kinds[{n}]")
            seen[w] = n
        for c in classes:
            if c not in known:
                problems.append(f"kinds[{n}] names {c}, which registry/visual-classes.yaml does not have")
        if bool(classes) == bool(r.get("model")):
            problems.append(f"kinds[{n}] must name classes or be `model: true`, not both or neither")
        row = {"say": say}
        if classes:
            row["classes"] = classes
        if r.get("of"):
            row["of"] = True
        if r.get("model"):
            row["model"] = True
        rows.append(row)
    if problems:
        sys.exit("registry/aliases.yaml kinds:\n  " + "\n  ".join(problems))
    return [("The words for a kind of thing -> the visual classes they list, in group order (or `model`: has a 3D model).",
             "KINDS", rows)]


KIND_HEADER = """// GENERATED from registry/aliases.yaml (`kinds:`) by scripts/gen_aliases_js.py. Do not edit.
//
// Read by ui/searchrows.js, which the search field fetches on its first focus: never at boot.
// `python3 scripts/gen_aliases_js.py --check` fails CI if this file and the YAML disagree.
"""

MIRROR = Mirror(source="registry/aliases.yaml", target="site/js/data/aliases.js", header=HEADER, render=render, what="aliases.js")
KIND_MIRROR = Mirror(source="registry/aliases.yaml", target="site/js/data/kindwords.js", header=KIND_HEADER,
                     render=render_kinds, what="kindwords.js", indent=0)

if __name__ == "__main__":
    sys.exit(max(MIRROR.main(sys.argv[1:]), KIND_MIRROR.main(sys.argv[1:])))
