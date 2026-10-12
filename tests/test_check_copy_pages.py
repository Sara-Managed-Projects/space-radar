#!/usr/bin/env python3
"""scripts/check_copy.py covers site/js/pages/ (internal #556, bulk 2).

    python3 tests/test_check_copy_pages.py

A page script that writes a sentence must be on PAGE_SENTENCE_FILES; a placeholder, two hyphens or a
spaced hyphen in a page script is refused; the real tree is clean.
"""
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import check_copy as c  # noqa: E402

fails = []


def check(name, ok):
    print(("ok   " if ok else "FAIL ") + name)
    if not ok:
        fails.append(name)


def run_on(files):
    with tempfile.TemporaryDirectory() as d:
        pages = Path(d)
        for n, text in files.items():
            (pages / n).write_text(text, encoding="utf-8")
        old = c.PAGES, c.ROOT
        try:
            c.PAGES = pages
            c.ROOT = pages.parent  # relative_to(ROOT) needs a parent of the temp dir
            return c.pages_sentences()
        finally:
            c.PAGES, c.ROOT = old


check("the real tree is clean", c.pages_sentences() == [])
check("live.js is on the list", "live.js" in c.PAGE_SENTENCE_FILES)
check("a new script that says a sentence is refused",
      len(run_on({"newpage.js": "say('moon-line', `The Moon is ${p} percent lit`);\n"})) == 1)
check("a new script that fills a list item is refused",
      len(run_on({"newpage.js": "li.textContent = `Venus is up`;\n"})) == 1)
check("a listed script may say sentences",
      run_on({"live.js": "say('moon-line', `The Moon is ${p} percent lit`);\n"}) == [])
check("a spaced hyphen as a dash is refused",
      len(run_on({"live.js": "const a = 'the Moon - lit tonight';\n"})) == 1)
check("a comment is not a sentence",
      run_on({"newpage.js": "// say('x', 'a - b')\n"}) == [])
check("a script that writes nothing is clean", run_on({"quiet.js": "export const n = 3;\n"}) == [])
# the two shared text checks read pages through SHIPPED_TEXT
check("pages are in the double-hyphen and placeholder scan",
      any(p.parent == c.PAGES for p in c.SHIPPED_TEXT) or not any(c.PAGES.glob("*.js")))
sys.exit(1 if fails else 0)
