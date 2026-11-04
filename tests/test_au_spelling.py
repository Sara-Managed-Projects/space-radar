#!/usr/bin/env python3
"""The astronomical unit is written "AU" wherever a visitor reads a distance (internal #1234).

    python3 tests/test_au_spelling.py

#1217 made the star-system cards say "AU" and nothing checked the rest: the sentence under an object
(site/js/objectnow.js), the object and star-system pages (scripts/object_pages.mjs, scripts/seo_systems.py),
the sample cards, the deep-sky cards, the oddities and the Lab's pages printed "au". The copy in
site/js/copy/en*.js already says "AU", so this holds the other files to it.

It reads the text a visitor can see and no more: code comments, the `<!-- Sources -->` block at the foot of a
Lab page, and a name such as `a_au` or `{ au: 1 }` are not read, and neither is another language's copy
(Portuguese writes UA and Russian а. е., which are right in those languages). A distance is flagged when a
figure or a closing brace (`${n} au`) or an opening quote (`' au from`) comes straight before au, a.u. or A.U.,
and "AUs" is flagged too: the unit has no plural. "astronomical units" in full, where a line is too narrow for
the short form (site/js/copy/en.js `units`), is fine. Each rule is shown to fail on a broken line first.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

BAD = re.compile(r"""(?:[0-9}] ?|['"`] )(?:au|a\.u\.|A\.U\.)(?![A-Za-z])|\bAUs\b""")


def visible(text, suffix):
    """The lines of a file a visitor can read part of: no comment lines, no trailing comment, no Sources block."""
    if suffix == ".html":
        text = re.sub(r"<!--.*?-->", lambda m: "\n" * m.group(0).count("\n"), text, flags=re.S)
    out = []
    for n, line in enumerate(text.split("\n"), 1):
        s = line.strip()
        if s.startswith(("//", "*", "/*", "#")):
            continue
        line = re.sub(r"\s(//|#)\s.*$", "", line)
        out.append((n, line))
    return out


def hits(text, suffix):
    return [(n, line.strip()[:100]) for n, line in visible(text, suffix) if BAD.search(line)]


problems = []

# 1. each rule fails on a line that breaks it, and passes the right one
for line, why in [
    ("'It came closest to the Sun, about 1.4 au, at the end.'", "a figure and au"),
    ("return `${n.toFixed(2)} au (${m} million km)`;", "a closing brace and au"),
    ("' au from the Sun' +", "a quote and au"),
    ("f\"{p['a_au']:g} a.u.\"", "a.u."),
    ("'a few AUs out'", "the plural"),
]:
    if not hits(line, ".js"):
        problems.append(f"the rule does not catch {why}: {line}")
for line, why in [
    ("'about 1.4 AU'", "AU"),
    ("// 500 au: past every planet", "a comment line"),
    ("const x = 5; // 5 au out", "a trailing comment"),
    ("const hz = { a_au: 1, au: 2 };", "a name"),
    ("url: https://www.atnf.csiro.au/research/", "a web address"),
    ("'1.3 astronomical units'", "the long form"),
]:
    if hits(line, ".js"):
        problems.append(f"the rule flags {why}, which it must not: {line}")
if hits("<p>1 AU</p>\n<!-- Sources\nmeans 1 au\n-->\n<p>ok</p>", ".html"):
    problems.append("the rule reads inside a Lab page's <!-- Sources --> block")

# 2. the files a visitor reads
files = [ROOT / "site/js/objectnow.js", ROOT / "site/index.html"]
files += sorted((ROOT / "site/js").rglob("*.js"))
files += sorted((ROOT / "site/lab").glob("*/index.html"))
# the scripts that write a page; the checks that talk to a maintainer are not read
files += [ROOT / "scripts/object_pages.mjs"] + sorted((ROOT / "scripts").glob("seo_*.py")) + sorted((ROOT / "scripts").glob("build_*.py"))
files += sorted((ROOT / "templates").glob("*"))
seen = set()
for f in files:
    rel = f.relative_to(ROOT).as_posix()
    if f in seen or not f.is_file() or f.suffix not in (".js", ".mjs", ".py", ".html"):
        continue
    seen.add(f)
    # another language's copy writes its own abbreviation
    if rel.startswith("site/js/copy/") and f.name not in ("en.js", "en.later.js", "en.facts.js"):
        continue
    for n, text in hits(f.read_text(encoding="utf-8"), f.suffix):
        problems.append(f"{rel}:{n} writes the unit as it is not written elsewhere (use AU): {text}")

if problems:
    print("FAIL the astronomical unit is not written alike everywhere:\n  " + "\n  ".join(problems))
    sys.exit(1)
print(f"ok   AU is written AU in {len(seen)} files a visitor reads, and each rule was shown to fail first")
