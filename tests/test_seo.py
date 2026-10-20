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
r = run(sys.executable, "scripts/build_seo.py", "--out", str(BUILT), "--no-share")  # the pictures are drawn and held by the seo job's --require-share build and tests/test_seo_pages.py
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
    # Pages scripts/seo_pages.py builds in place of the card's own (the station's answer to "where is it", and the star systems, which
    # open on their planet's sentence): held by tests/test_seo_pages.py instead.
    sys.path.insert(0, str(ROOT / "scripts"))
    import seo_systems
    replaced = {"international-space-station"} | {s["slug"] for s in seo_systems.systems()}
    for p in pages:
        if p["slug"] in replaced:
            continue
        f = BUILT / "o" / f"{p['slug']}.html"
        text = f.read_text(encoding="utf-8") if f.is_file() else ""
        lead = p["lead"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("'", "&#x27;").replace('"', "&quot;")
        if f'<p class="lead">{lead}</p>' not in text:
            missing.append(p["slug"])
    ok(not missing, f"every page leads with the card's first sentence ({missing[:3]})")
    # Internal #294: the ten bodies Astronomy Engine places get a "where is it now" line the browser works
    # out (site/js/objectnow.js); every other page keeps the static sentence and loads no script.
    hooked = sorted(p["slug"] for p in pages if p.get("nowBody"))
    ok(hooked == sorted(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]),
       f"the now line is wired for the ten bodies only ({hooked})")
    for p in pages:
        f = BUILT / "o" / f"{p['slug']}.html"
        text = f.read_text(encoding="utf-8") if f.is_file() else ""
        has = 'src="../js/objectnow.js"' in text and ' id="now" data-body="' in text
        if bool(p.get("nowBody")) != has:
            ok(False, f"{p['slug']}: the now hook is {'missing' if p.get('nowBody') else 'present on a page that cannot work it out'}")
        if p.get("nowBody") and p["liveLine"] not in text.replace("&#x27;", "'"):
            ok(False, f"{p['slug']}: the static fallback sentence is gone")
    # The labels of the card's live rows (copy/en.js card.rows). A static page that printed one would
    # be wrong a second after it was generated.
    live = re.compile(r"Height above the ground|Passing over|Below it now|Distance from (you|Earth|the Sun)\b")
    leaks = [f.name for f in sorted((BUILT / "o").glob("*.html")) if live.search(f.read_text(encoding="utf-8"))]
    ok(not leaks, f"no object page prints a live reading ({leaks[:3]})")

# --- 3b: the Lab's simulators get their head tags at build time (scripts/seo_lab.py) ----------
# The requirement: every simulator a contributor commits is served with a canonical at its own address, Open
# Graph and a LearningResource block, the contributor writes none of them, and the page's body is unchanged.
LAB = ROOT / "site" / "lab"
sims = [p for p in sorted(LAB.glob("*/index.html")) if not p.parent.name.startswith("_")]
ok(len(sims) >= 75, f"the Lab has its simulators in site/lab/ ({len(sims)})")
ok(not any('rel="canonical"' in p.read_text(encoding="utf-8") for p in sims),
   "no committed simulator carries a canonical: contributors do not write them")
missing, wrong, body_changed, schema = [], [], [], []
for src in sims:
    f = BUILT / "lab" / src.parent.name / "index.html"
    if not f.is_file():
        missing.append(src.parent.name)
        continue
    text, orig = f.read_text(encoding="utf-8"), src.read_text(encoding="utf-8")
    url = f"https://www.spaceradar.ai/lab/{src.parent.name}/index.html"
    if text.count('rel="canonical"') != 1 or f'<link rel="canonical" href="{url}">' not in text \
            or f'<meta property="og:url" content="{url}">' not in text or 'property="og:image"' not in text:
        wrong.append(src.parent.name)
    if text.split("</head>", 1)[1] != orig.split("</head>", 1)[1] or not text.startswith(orig.split("</head>", 1)[0]):
        body_changed.append(src.parent.name)
    blocks = [json.loads(b) for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', text, re.S)]
    graph = [g for b in blocks for g in b.get("@graph", [b])]
    lr = [g for g in graph if g.get("@type") == "LearningResource"]
    if len(lr) != 1 or lr[0]["url"] != url or any(k in json.dumps(graph) for k in ("aggregateRating", "review")):
        schema.append(src.parent.name)
ok(not missing, f"every simulator is built under lab/ ({missing[:3]})")
ok(not wrong, f"each has one canonical and og:url at its own address, and an og:image ({wrong[:3]})")
ok(not body_changed, f"only the head gains tags: what a visitor sees is the committed file ({body_changed[:3]})")
ok(not schema, f"each has one LearningResource at its own address, with no rating or review ({schema[:3]})")
ok((BUILT / "lab" / "index.html").read_bytes() == (LAB / "index.html").read_bytes() if (BUILT / "lab" / "index.html").is_file() else False,
   "the Lab's list is built as committed (gen_lab_index.py writes its head)")
ok(not (BUILT / "lab" / "_template").exists(), "the contributor's starter is not built, so not uploaded")

# --- 4: deploy.sh ships it ------------------------------------------------------------------
with tempfile.TemporaryDirectory() as tmp:
    bindir = Path(tmp) / "bin"
    bindir.mkdir()
    log = Path(tmp) / "aws.log"
    fake = bindir / "aws"
    fake.write_text(f'#!/bin/sh\necho "$*" >> "{log}"\nexit 0\n', encoding="utf-8")
    fake.chmod(fake.stat().st_mode | stat.S_IEXEC)
    env = dict(os.environ, PATH=f"{bindir}{os.pathsep}{os.environ.get('PATH', '')}", SR_SHARE="off")
    r = run("bash", "scripts/deploy.sh", "--bucket", "example-bucket", "--app-only", "--dry-run", env=env)
    calls = log.read_text(encoding="utf-8").splitlines() if log.is_file() else []
    o_sync = [c for c in calls if c.startswith("s3 sync") and "s3://example-bucket/o" in c]
    ok(r.returncode == 0, f"deploy.sh --app-only --dry-run runs against a fake aws\n{r.stdout if r.returncode else ''}\n{r.stderr if r.returncode else ''}")
    ok(len(o_sync) == 1 and "text/html" in o_sync[0] and "--delete" in o_sync[0] and "max-age=0, must-revalidate" in o_sync[0],
       f"the built o/ is synced as HTML a browser revalidates on every load, with --delete ({o_sync})")
    # Stored compressed or negotiated (internal #514): the code goes up as Brotli with a gzip copy
    # under _gz/, and every page a crawler reads goes up as written.
    def sync(prefix):
        # The source maps go to js/ and vendor/ too, as JSON and as written (internal #515): not code.
        return [c for c in calls if c.startswith("s3 sync") and f" s3://example-bucket/{prefix} " in c and "--include *.map" not in c]
    maps = [c for c in calls if c.startswith("s3 sync") and "--include *.map" in c]
    ok(len(maps) == 2 and all("application/json" in c and "--content-encoding" not in c and "--delete" in c for c in maps),
       f"the source maps of js/ and vendor/ go up as JSON beside the code ({len(maps)})")
    ok(all(sync(d) and all("--content-encoding br" in c for c in sync(d)) for d in ("css", "js", "vendor")),
       "css/, js/ and vendor/ are stored as Brotli")
    ok(all(sync(f"_gz/{d}") and all("--content-encoding gzip" in c for c in sync(f"_gz/{d}")) for d in ("css", "js", "vendor")),
       "their gzip copies go under _gz/")
    lab_sync = [c for c in calls if c.startswith("s3 sync") and " s3://example-bucket/lab " in c]
    ok(len(lab_sync) == 1 and "/site/lab " not in lab_sync[0] and "text/html" in lab_sync[0] and "--delete" in lab_sync[0],
       f"lab/ is uploaded from the build, with its head tags, not from site/lab/ ({lab_sync})")
    ok(all(sync(d) and not any("--content-encoding" in c for c in sync(d)) for d in ("o", "t", "press")),
       "the pages a crawler reads (o/, t/, press/) are uploaded as written")
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
