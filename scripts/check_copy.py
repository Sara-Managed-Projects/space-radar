#!/usr/bin/env python3
"""Refuse a user-visible string written anywhere but site/js/copy/en.js.

THIS FILE WAS CITED BEFORE IT EXISTED. `copy/en.js` line 6 says "rules this file obeys, because
check_copy.py will enforce them"; `ui/cards.js` line 41 says the 160-character cap is "enforced by
check_copy.py". Three files pointed at a guard that was not in the repository. That is worse than
no guard: a reader stops looking for the leak because a check they can name is supposed to catch
it.

WHAT IT CHECKS, AND ONLY THIS. A string literal that reaches the screen from a file under
site/js/ui/. The reconciliation split the two halves of the old design by where the string lives:

    a string in a YAML registry  -> scripts/check_registry.py (the length cap, the glossary)
    a string literal in ui/*.js  -> here

The 160-character cap therefore is NOT here. It belongs where the sentence is written, which is
registry/oddities.yaml and registry/rockets.yaml, and check_registry.py holds it there. Truncating
at the point a string is read is how a card ends up saying half of something.

HOW IT AVOIDS BEING SWITCHED OFF. A guard whose first act is a false alarm is a guard somebody
turns off, so this does not try to judge whether a literal "looks like prose". It looks only at
the places a string becomes text on the screen:

    el(tag, class, 'literal')          the DOM helper every ui module shares
    node.textContent = 'literal'
    node.title = 'literal'
    node.placeholder = 'literal'
    node.setAttribute('aria-label' | 'aria-description' | 'title', 'literal')
    createTextNode('literal')

An empty string is allowed: `el('span', 'sr-x', '')` is clearing a node, not writing copy. So is a
single character of punctuation, which is layout and not language.

Run:  python3 scripts/check_copy.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UI = ROOT / "site" / "js" / "ui"

STRING = r"""(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`)"""

SINKS = [
    (
        "el(tag, class, text)",
        re.compile(r"\bel\(\s*(?:'[^']*'|\"[^\"]*\")\s*,\s*[^,()]*,\s*" + STRING),
    ),
    (
        "textContent =",
        re.compile(r"\.textContent\s*=\s*" + STRING),
    ),
    (
        "title / placeholder =",
        re.compile(r"\.(?:title|placeholder|ariaLabel)\s*=\s*" + STRING),
    ),
    (
        "setAttribute('aria-label' | 'title', text)",
        re.compile(
            r"\.setAttribute\(\s*['\"](?:aria-label|aria-description|aria-placeholder|title)"
            r"['\"]\s*,\s*" + STRING
        ),
    ),
    (
        "createTextNode(text)",
        re.compile(r"createTextNode\(\s*" + STRING),
    ),
    # A label held in a local table and written to the DOM a few lines later. Only these three
    # key names, and only in ui/*.js: measured across the tree they match nothing but real copy,
    # and a wider net here would start finding CSS class names.
    (
        "a label/hint/text field",
        re.compile(r"\b(?:label|hint|text)\s*:\s*" + STRING),
    ),
]

# Layout, not language: a separator, a bullet, a space. One character of punctuation is not copy.
PUNCTUATION_ONLY = re.compile(r"^[\s\W]{0,2}$")

# A DASH WRITTEN AS TWO HYPHENS. This codebase's comments write ` -- ` for a dash, and prose
# copied out of a comment or a YAML file keeps it: on 2026-09-22 it was on a trip card, three
# exotic cards and two lines of copy/en.js, printed as two hyphens mid-sentence. copy/en.js writes
# a real dash. Checked in the copy and in every data file the cards read; a `source:` or `file:`
# value is evidence a reviewer reads, never printed, and is exempt.
SHIPPED_TEXT = [ROOT / "site" / "js" / "copy" / "en.js", *sorted((ROOT / "site" / "js" / "data").glob("*.js"))]
QUOTED = re.compile(r"""(?:"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)')""")
EVIDENCE_KEY = re.compile(r"""["']?(?:source|file|url)["']?\s*:\s*$""")


def double_hyphens() -> list[str]:
    out = []
    for path in SHIPPED_TEXT:
        rel = path.relative_to(ROOT)
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            stripped = line.lstrip()
            if stripped.startswith("//") or stripped.startswith("*"):
                continue
            code = line.split(" // ")[0]
            for match in QUOTED.finditer(code):
                text = match.group(1) if match.group(1) is not None else match.group(2)
                if " -- " not in text or EVIDENCE_KEY.search(code[: match.start()]):
                    continue
                out.append(f"  {rel}:{lineno}  prints two hyphens as a dash: {text[:90]!r}\n"
                           f"      Write a comma, a colon or a real dash; ` -- ` is for comments.")
    return out


def literal(match: re.Match) -> str:
    for group in match.groups()[-3:]:
        if group is not None:
            return group
    return ""


def main() -> int:
    if not UI.is_dir():
        print(f"check_copy: {UI.relative_to(ROOT)} does not exist")
        return 1

    findings: list[str] = []
    files = sorted(UI.glob("*.js"))
    for path in files:
        rel = path.relative_to(ROOT)
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            stripped = line.lstrip()
            if stripped.startswith("//") or stripped.startswith("*"):
                continue
            for label, pattern in SINKS:
                for match in pattern.finditer(line):
                    text = literal(match)
                    if PUNCTUATION_ONLY.match(text):
                        continue
                    findings.append(
                        f"  {rel}:{lineno}  {label} is handed the literal {text!r}\n"
                        f"      Every user-visible string lives in site/js/copy/en.js. Add a key "
                        f"there and read it here."
                    )

    findings += double_hyphens()
    if findings:
        print(f"copy: {len(findings)} problem(s) with strings that reach the screen\n")
        for f in findings:
            print(f)
        return 1
    print(
        f"copy ok: {len(files)} files under site/js/ui/ write no user-visible string literal; "
        f"every one comes from site/js/copy/en.js, and none of {len(SHIPPED_TEXT)} copy and data "
        f"files prints ` -- ` for a dash"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
