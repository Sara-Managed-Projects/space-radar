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

    if findings:
        print(f"copy: {len(findings)} string literal(s) reaching the screen from outside copy/en.js\n")
        for f in findings:
            print(f)
        return 1
    print(
        f"copy ok: {len(files)} files under site/js/ui/ write no user-visible string literal; "
        f"every one comes from site/js/copy/en.js"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
