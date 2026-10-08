#!/usr/bin/env python3
"""Mirror registry/links.yaml into site/js/data/links.js, and refuse if it has drifted.

Spec 0050 requirement 8 (internal #136): the links out a card shows, by the record they belong to.
The `checked` date and what was seen that day stay in the YAML with the reviewer;
scripts/check_registry.py check_links() is what reads them.

Run:  python3 scripts/gen_links_js.py           # write it
      python3 scripts/gen_links_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402


def render(doc: dict) -> list:
    links = {}
    for r in doc.get("links") or []:
        if not isinstance(r, dict) or not r.get("for"):
            continue
        links.setdefault(str(r["for"]), []).append(
            {"id": r.get("id"), "words": r.get("words"), "publisher": r.get("publisher"), "url": r.get("url")})
    return [("The links out a card shows, by record id. Each is a plain link to the publisher's own page.", "LINKS", links)]


HEADER = """// GENERATED from registry/links.yaml by scripts/gen_links_js.py. Do not edit.
//
// `python3 scripts/gen_links_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/links.yaml", target="site/js/data/links.js", header=HEADER, render=render, what="links.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
