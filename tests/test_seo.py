#!/usr/bin/env python3
"""What a search engine reads builds, holds the rules, and ships (spec 0061 task 9).

  1. The committed mirrors are current (the home page's search block, the trip pages), and
     scripts/build_seo.py builds the object pages, 404.html and sitemap.xml into a temporary
     directory: they are built at deploy time and never kept in git.
  2. scripts/check_seo.py passes on that build (its refusals are in tests/test_refusals.py).
  3. The object pages carry the card's words and no live number: each lead sentence is a sentence
     ui/cards.js wrote, and no page prints a row label the card uses for a live reading.
  4. deploy.sh, dry run, against a fake `aws`: it builds the pages, ships o/ as HTML with --delete,
     robots.txt, sitemap.xml and 404.html each with its own type, and invalidates them.

Needs Node 22 on PATH for (1) and (3): the card's words are JavaScript.

Run: python3 tests/test_seo.py
"""

from __future__ import annotations

import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
failures: list[str] = []


def run(*cmd: str, env: dict | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(list(cmd), cwd=ROOT, capture_output=True, text=True, env=env)


def ok(cond: bool, msg: str) -> None:
    if cond:
        print(f"PASS: {msg}")
    else:
        failures.append(msg)
        print(f"FAIL: {msg}")


# --- 1 and 2: current, built, and the rules hold ----------------------------------------------
BUILT = Path(tempfile.mkdtemp(prefix="seo-"))
for script in ("gen_home_seo.py", "gen_trip_pages.py"):
    r = run(sys.executable, f"scripts/{script}", "--check")
    ok(r.returncode == 0, f"{script} --check: {(r.stdout or r.stderr).strip().splitlines()[-1:]}")
# The press page first, as scripts/deploy.sh does: the sitemap names it only when it is in the tree.
r = run(sys.executable, "scripts/build_press.py", "--out", str(BUILT))
ok(r.returncode == 0, f"build_press.py: {(r.stdout or r.stderr).strip().splitlines()[-1:]}")
r = run(sys.executable, "scripts/build_seo.py", "--out", str(BUILT))
ok(r.returncode == 0, f"build_seo.py: {(r.stdout or r.stderr).strip().splitlines()[-1:]}")
r = run(sys.executable, "scripts/check_seo.py", "--out", str(BUILT))
ok(r.returncode == 0, f"check_seo.py on the build: {(r.stdout or r.stderr).strip().splitlines()[-1:]}")
ok(not (ROOT / "site" / "o").exists() and not (ROOT / "site" / "sitemap.xml").exists(),
   "no built page is kept in site/ (they are made at deploy time)")

# --- 3: the card's words, and no live number --------------------------------------------------
node = shutil.which("node")
if not node:
    ok(False, "node is on PATH (the card's words are JavaScript)")
else:
    r = run(node, "scripts/object_pages.mjs")
    doc = json.loads(r.stdout) if r.returncode == 0 else {"pages": []}
    pages = doc["pages"]
    ok(180 <= len(pages) <= 300, f"the selection rule picks about two hundred objects ({len(pages)})")
    for must in ("europa", "voyager-1", "international-space-station", "sirius", "andromeda-galaxy",
                 "sagittarius-a-star", "apollo-11-landing-site", "trappist-1", "tesla-roadster-starman"):
        ok(any(p["slug"] == must for p in pages), f"a page for {must}")
    # Each page's lead is in its file, whole; nothing else stands in for the card.
    missing = []
    for p in pages:
        f = BUILT / "o" / f"{p['slug']}.html"
        text = f.read_text(encoding="utf-8") if f.is_file() else ""
        lead = p["lead"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("'", "&#x27;").replace('"', "&quot;")
        if f'<p class="lead">{lead}</p>' not in text:
            missing.append(p["slug"])
    ok(not missing, f"every page leads with the card's first sentence ({missing[:3]})")
    # The labels of the card's live rows (copy/en.js card.rows). A static page that printed one would
    # be wrong a second after it was generated.
    live = re.compile(r"Height above the ground|Passing over|Below it now|Distance from (you|Earth|the Sun)\b")
    leaks = [f.name for f in sorted((BUILT / "o").glob("*.html")) if live.search(f.read_text(encoding="utf-8"))]
    ok(not leaks, f"no object page prints a live reading ({leaks[:3]})")

# --- 4: deploy.sh ships it ------------------------------------------------------------------
with tempfile.TemporaryDirectory() as tmp:
    bindir = Path(tmp) / "bin"
    bindir.mkdir()
    log = Path(tmp) / "aws.log"
    fake = bindir / "aws"
    fake.write_text(f'#!/bin/sh\necho "$*" >> "{log}"\nexit 0\n', encoding="utf-8")
    fake.chmod(fake.stat().st_mode | stat.S_IEXEC)
    env = dict(os.environ, PATH=f"{bindir}{os.pathsep}{os.environ.get('PATH', '')}")
    r = run("bash", "scripts/deploy.sh", "--bucket", "example-bucket", "--app-only", "--dry-run", env=env)
    calls = log.read_text(encoding="utf-8").splitlines() if log.is_file() else []
    o_sync = [c for c in calls if c.startswith("s3 sync") and "s3://example-bucket/o" in c]
    ok(r.returncode == 0, "deploy.sh --app-only --dry-run runs against a fake aws")
    ok(len(o_sync) == 1 and "text/html" in o_sync[0] and "--delete" in o_sync[0] and "no-cache" in o_sync[0],
       f"the built o/ is synced as no-cache HTML with --delete ({o_sync})")
    ok("SEO ok" in r.stdout, "deploy.sh builds the pages and holds them to check_seo.py before it uploads")
    smap = (BUILT / "sitemap.xml").read_text(encoding="utf-8") if (BUILT / "sitemap.xml").is_file() else ""
    ok("/press/index.html</loc>" in smap, "the sitemap names the press page (internal #398)")
    for name, typ in (("robots.txt", "text/plain"), ("sitemap.xml", "application/xml"),
                      ("404.html", "text/html"), ("index.html", "text/html")):
        ok(re.search(rf"would upload {re.escape(name)} \({re.escape(typ)}", r.stdout) is not None,
           f"{name} is uploaded as {typ}")
    body = (ROOT / "scripts" / "deploy.sh").read_text(encoding="utf-8")
    ok(all(p in body for p in ('"/o/*"', '"/robots.txt"', '"/sitemap.xml"', '"/404.html"')),
       "the invalidation names /o/*, /robots.txt, /sitemap.xml and /404.html")

shutil.rmtree(BUILT, ignore_errors=True)
if failures:
    print(f"\n{len(failures)} failure(s)")
    sys.exit(1)
print("\nall SEO checks pass")
