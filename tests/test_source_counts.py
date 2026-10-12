#!/usr/bin/env python3
"""One number of sources (the review of 2026-10-12: "24 public sources" on About and Press, "28" on Sources).

    python3 tests/test_source_counts.py

THE RULE is written where the number is made, scripts/count_facts.py source_counts():
    sources = the distinct publishers among the ENABLED rows of registry/sources.yaml
    feeds   = the enabled rows themselves
    a row with `enabled: false` is in neither, and /sources/ lists it as not in use.

Held here:
  the function         recounted by hand from the registry; a switched-off row moves neither number
  every page reads it  /about/, /sources/ and the press kit state exactly its two numbers, and no other
                       number of sources, feeds or publishers
  nobody types one     no template, page script, README or copy file carries a written count of
                       sources, feeds or publishers (shown to fail on a planted "24 public sources")
  the app's line       "N read this visit" cannot be read as the total
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_press  # noqa: E402
import count_facts  # noqa: E402
import seo_pages  # noqa: E402

failed = 0


def ok(cond: bool, msg: str) -> None:
    global failed
    if not cond:
        failed += 1
        print(f"FAIL: {msg}")


# --- the function, recounted --------------------------------------------------------------------
rows = yaml.safe_load((ROOT / "registry" / "sources.yaml").read_text(encoding="utf-8"))["sources"]
on = [r for r in rows if r.get("enabled") is not False]
off = [r for r in rows if r.get("enabled") is False]
n = count_facts.source_counts()
ok(n["feeds"] == len(on) and n["sources"] == len({r["publisher"] for r in on}) and n["off"] == len(off) and n["feeds"] + n["off"] == len(rows),
   f"source_counts() is the registry's: {n['feeds']} feeds, {n['sources']} sources, {n['off']} off, of {len(rows)} rows")
ok(sum(n["publishers"].values()) == n["feeds"] and len(n["publishers"]) == n["sources"], "each feed belongs to exactly one source")
ok(1 < n["sources"] < n["feeds"], f"sources and feeds are two different numbers ({n['sources']}, {n['feeds']}): a page that prints one for the other is caught below")
ok(off and not ({r["publisher"] for r in off} & set(n["publishers"])) or not off,
   "today no switched-off row shares a publisher with a row in use, so switching one on would add a source")
facts = count_facts.facts()
ok(facts["sources"] == n["sources"] and facts["feeds"] == n["feeds"], "count_facts.facts() carries the same two numbers")
ok(seo_pages.counts_of_registries()["sources"] == n["sources"] and seo_pages.counts_of_registries()["feeds"] == n["feeds"]
   and build_press.counts()["sources"] == n["sources"] and build_press.counts()["feeds"] == n["feeds"], "the page builders read the function")

# A switched-off row moves neither number: count again with one more row off.
real = count_facts._yaml
try:
    victim = on[0]["id"]
    count_facts._yaml = lambda name: ({"sources": [dict(r, enabled=False) if r["id"] == victim else r for r in rows]} if name == "sources.yaml" else real(name))
    m = count_facts.source_counts()
    ok(m["feeds"] == n["feeds"] - 1 and m["off"] == n["off"] + 1, "switching a row off takes one feed away")
    lone = next(r["id"] for r in on if n["publishers"][r["publisher"]] == 1)
    count_facts._yaml = lambda name: ({"sources": [dict(r, enabled=False) if r["id"] == lone else r for r in rows]} if name == "sources.yaml" else real(name))
    ok(count_facts.source_counts()["sources"] == n["sources"] - 1, "and a source with it, when it was that publisher's only feed")
finally:
    count_facts._yaml = real

# --- every page that states a number states these two --------------------------------------------
COUNTED = re.compile(r"\b(\d+)\s+(?:(?:public|open|data|live|named|more|different|upstream)\s+){0,2}(sources?|feeds?|publishers?)\b", re.I)


def said(html: str) -> set[tuple[int, str]]:
    plain = re.sub(r"<[^>]+>", " ", html)
    return {(int(a), b.lower().rstrip("s")) for a, b in COUNTED.findall(plain)}


host = "https://www.spaceradar.ai"
about = seo_pages.about_page(host)
sources = seo_pages.sources_page(host, None)
press = " ".join(build_press.facts(build_press.counts())) + " | " + " | ".join(f"{a}: {b}" for a, b in build_press.glance(facts))
ok(said(about.body) == {(n["feeds"], "feed"), (n["sources"], "source")}, f"/about/ states the two numbers and no other ({sorted(said(about.body))})")
ok(f"reads {n['feeds']} feeds from {n['sources']} public sources" in about.body, "in the sentence a reader meets")
allowed = {(n["feeds"], "feed"), (n["sources"], "source")} | {(k, "feed") for k in n["publishers"].values()}
ok(said(sources.body) <= allowed and {(n["feeds"], "feed"), (n["sources"], "source")} <= said(sources.body),
   f"/sources/ states the two numbers, and each source's own feeds, and no other ({sorted(said(sources.body) - allowed)})")
ok(said(sources.description) == {(n["feeds"], "feed"), (n["sources"], "source")}, f"and so does its description ({sources.description})")
ok(about.share.number.endswith(f"{n['sources']} sources") and sources.share.number == f"{n['sources']} public sources", "the two share pictures print the number of sources")
ok(said(press) == {(n["feeds"], "feed"), (n["sources"], "source"), (n["sources"], "publisher")}, f"the press kit states the two numbers and no other ({sorted(said(press))})")
total = len(rows)
if total not in (n["feeds"], n["sources"]):
    for name, text in (("/about/", about.body), ("/sources/", sources.body + sources.description), ("the press kit", press)):
        ok(not re.search(rf"\b{total} (public |data )?sources", text), f"{name} still prints the registry's {total} rows as a number of sources")

# The switched-off rows: on the page, named as not in use, outside the first table.
first, _, rest = sources.body.partition("<h2>Not in use</h2>")
ok(bool(off) == bool(rest) and all(f'<tr id="{r["id"]}"' in rest and f'<tr id="{r["id"]}"' not in first for r in off)
   and all(f'<tr id="{r["id"]}"' in first for r in on), "the rows in use are in the first table and the switched-off ones under Not in use")

# --- nobody types one ------------------------------------------------------------------------------
# A written number in front of sources, feeds or publishers, in any file a page's words come from. The
# builders say {n['sources']}; the app says {n}.
WRITTEN = re.compile(r"(?<![{\w.$%-])\b(\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|twenty(?:-[a-z]+)?|thirty(?:-[a-z]+)?|dozens? of|hundreds? of)\s+"
                     r"(?:(?:public|open|data|live|named|upstream|free|scientific|different)\s+){0,2}(sources|feeds|publishers)\b", re.I)
FILES = sorted({*ROOT.glob("templates/**/*.html"), *ROOT.glob("templates/**/*.txt"), *ROOT.glob("scripts/seo_*.py"), ROOT / "scripts/build_seo.py",
                ROOT / "scripts/build_press.py", ROOT / "scripts/gen_home_seo.py", ROOT / "scripts/gen_trip_pages.py", ROOT / "registry/seo-facts.yaml",
                ROOT / "README.md", ROOT / "CITATION.cff", ROOT / "site/index.html", ROOT / "site/manifest.webmanifest",
                *ROOT.glob("site/js/copy/*.js"), *ROOT.glob("site/js/pages/*.js"), ROOT / "site/js/ui/status.js",
                ROOT / "site/js/ui/explore.js", ROOT / "docs/RUN_LOCALLY.md"})


def typed(text: str) -> list[str]:
    return [mt.group(0) for mt in WRITTEN.finditer(text)]


ok(len(FILES) > 20 and all(f.is_file() for f in FILES), f"the files a page's words come from are there ({len(FILES)})")
for f in FILES:
    rel = f.relative_to(ROOT).as_posix()
    hits = typed(f.read_text(encoding="utf-8"))
    ok(not hits, f"{rel} writes a number of sources by hand ({hits[:3]}): read scripts/count_facts.py source_counts() instead")
# The rule can fail.
for planted in ("<p>It reads 24 public sources to do it.</p>", "All 28 sources, each with its licence", "reads thirty data feeds", "from 13 publishers"):
    ok(typed(planted), f"a planted count is not caught: {planted!r}")
for fine in ("reads {n['feeds']} feeds from {n['sources']} public sources", "read: '{n} read this visit'", "Every source it reads", "the sources below"):
    ok(not typed(fine), f"a counted sentence is refused: {fine!r}")

# --- the app's line is not the total ---------------------------------------------------------------
copy = (ROOT / "site/js/copy/en.js").read_text(encoding="utf-8")
line = re.search(r"statusLine: \{.*?\n  \},", copy, re.S).group(0)
read, read_one = re.search(r"\n    read: '([^']+)'", line).group(1), re.search(r"\n    readOne: '([^']+)'", line).group(1)
ok("this visit" in read and "this visit" in read_one and "{n}" in read, f"the status line says how many were read THIS VISIT ({read!r}, {read_one!r})")
ok(not re.search(r"sources?|feeds?", read + read_one, re.I), "and names neither sources nor feeds, the two words the totals use")

if failed:
    print(f"\nsource counts: {failed} check(s) FAILED")
    sys.exit(1)
print(f"source counts ok: {n['feeds']} feeds from {n['sources']} sources ({n['off']} switched off, in neither), one function, read by /about/, /sources/ and the press kit; "
      f"no count typed by hand in {len(FILES)} files; the app's line says \"this visit\"")
