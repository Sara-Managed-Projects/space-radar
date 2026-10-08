#!/usr/bin/env python3
"""Mirror registry/oldest-notes.yaml into site/js/data/oldestnotes.js, and refuse if it has drifted.

Spec 0050 requirement 7 (internal #135): one sourced line per catalogue number, for the list of
the things up the longest. The `read` date and the page's own words stay in the YAML with the
reviewer; scripts/check_registry.py check_oldest_notes() is what reads them.

Run:  python3 scripts/gen_oldest_notes_js.py           # write it
      python3 scripts/gen_oldest_notes_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402


def render(doc: dict) -> list:
    notes = {str(r["norad"]): {"line": r.get("line"), "source": r.get("source")}
             for r in (doc.get("notes") or []) if isinstance(r, dict) and "norad" in r}
    return [("A sourced line for a thing in orbit, by catalogue number. The list itself is computed.", "OLDEST_NOTES", notes)]


HEADER = """// GENERATED from registry/oldest-notes.yaml by scripts/gen_oldest_notes_js.py. Do not edit.
//
// `python3 scripts/gen_oldest_notes_js.py --check` fails CI if this file and the YAML disagree, so
// an edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/oldest-notes.yaml", target="site/js/data/oldestnotes.js", header=HEADER, render=render, what="oldestnotes.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
