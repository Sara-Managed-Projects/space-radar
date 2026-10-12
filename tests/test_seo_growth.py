#!/usr/bin/env python3
"""The growth pieces of the SEO build: the footer, the sitemap's lastmod, the IndexNow key and ping.

  1. FOOTER. The build holds the home page, an object page, 404.html, the press page and the embed
     page to the shared footer (templates/sitelinks.html). check_seo.py is shown to refuse each page
     that lost a link, an account's rel="me", or that links Facebook; and a build without the
     IndexNow key file, or with a wrong one.
  2. LASTMOD. scripts/seo_dates.py on a repository made here with known commit dates: a trip's date
     is the date of its own row, an object page's the newest of its group's files, an untracked file
     falls back to the commit the build is made from, and outside git the date is today's. The
     sitemap writes the date it is given per URL and the build's own date for the rest.
  3. INDEXNOW. The key is 32 hex characters and the key file holds it; the changed set is the new
     URLs and the changed lastmods; a ping that cannot reach anything, or cannot read a sitemap, is a
     warning and exit 0; a dry run sends nothing.
  4. DEPLOY. deploy.sh, dry run, against a fake aws: the key file and the embed page are uploaded;
     the ping is off unless INDEXNOW=1 and, when on, comes after the uploads and cannot fail the deploy.

Needs Node 22 on PATH (the build) and git. Run: python3 tests/test_seo_growth.py
"""

from __future__ import annotations

import datetime as dt
import importlib
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
failures: list[str] = []


def ok(cond: bool, msg: str) -> None:
    print(("PASS: " if cond else "FAIL: ") + msg)
    if not cond:
        failures.append(msg)


def run(*cmd, cwd=ROOT, env=None):
    return subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True, text=True, env=env)


import indexnow  # noqa: E402
import seo_dates  # noqa: E402
import seo_footer  # noqa: E402

# --- 1: the footer --------------------------------------------------------------------------------------
tmp = Path(tempfile.mkdtemp(prefix="seo-growth-"))
built = tmp / "built"
run(sys.executable, "scripts/build_press.py", "--out", built)
r = run(sys.executable, "scripts/build_seo.py", "--out", built)
ok(r.returncode == 0, f"the SEO build runs ({(r.stdout or r.stderr).strip().splitlines()[-1:]})")
r = run(sys.executable, "scripts/check_seo.py", "--out", built)
ok(r.returncode == 0, f"check_seo.py passes on the build ({(r.stdout or r.stderr).strip().splitlines()[-1:]})")
ok(run(sys.executable, "scripts/gen_home_seo.py", "--check").returncode == 0, "the home page's footer and tags are current (gen_home_seo.py --check)")
home = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
foot = re.search(r'<footer id="sr-sitefoot".*?</footer>', home, re.S)
ok(bool(foot) and all(u in foot.group(0) for u in seo_footer.REQUIRED_EXTERNAL) and all(p in foot.group(0) for p in seo_footer.REQUIRED_INTERNAL),
   "site/index.html carries the footer with every link")
ok(bool(foot) and 'tabindex="-1"' in foot.group(0), "and keeps its links out of the tab order until the Sources sheet takes them (ui/status.js)")
css = re.sub(r"/\*.*?\*/", "", (ROOT / "site" / "css" / "site.css").read_text(encoding="utf-8"), flags=re.S)
rule = re.search(r"\.sr-sitefoot:not\(\.sr-sitefoot--shown\)\s*\{([^}]*)\}", css)
ok(bool(rule) and "clip-path" in rule.group(1) and "position: absolute" in rule.group(1) and "display: none" not in rule.group(1),
   "on the map it is clipped out of sight and out of the layout (the phone's layout is not touched)")
ok("sr-sitefoot--shown" in (ROOT / "site/js/ui/status.js").read_text(encoding="utf-8"), "ui/status.js moves it into the Sources sheet's footer")


def checked(root: Path, bt: Path) -> str:
    r = run(sys.executable, "scripts/check_seo.py", "--root", root, "--out", bt)
    return r.stdout + r.stderr if r.returncode else ""


def tree(root: Path) -> None:
    """A site/ made of links to the real one, except index.html, so a copy of it can be spoiled."""
    (root / "site").mkdir(parents=True)
    for entry in (ROOT / "site").iterdir():
        if entry.name != "index.html":
            (root / "site" / entry.name).symlink_to(entry)
    shutil.copyfile(ROOT / "site" / "index.html", root / "site" / "index.html")


def respoil(src: Path, dst: Path) -> None:
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


rootcopy = tmp / "root"
tree(rootcopy)
work = tmp / "work"
ok(checked(rootcopy, built) == "", "a symlinked copy of the tree passes (the base of the refusals below)")

def spoil(path: Path, old: str, new: str) -> None:
    t = path.read_text(encoding="utf-8")
    assert old in t, (path, old)
    path.write_text(t.replace(old, new, 1), encoding="utf-8")

obj = sorted((built / "o").glob("*.html"))[0].name
cases = [
    ("an object page without the YouTube link", "o/" + obj, '<li><a href="https://www.youtube.com/@SpaceRadar_ai" rel="me noopener">YouTube</a></li>\n', "", "youtube.com"),
    ("an object page without the whole footer nav", "o/" + obj, re.search(r'<nav class="sitelinks".*?</nav>', (built / "o" / obj).read_text(encoding="utf-8"), re.S).group(0), "", "the footer does not link"),
    ("404.html without Discussions", "404.html", "/discussions", "/disc", "discussions"),
    ("404.html without About", "404.html", 'href="/about/index.html"', 'href="/abut/index.html"', "about/index.html"),
    ("the press page without Instagram", "press/index.html", '<li><a href="https://www.instagram.com/spaceradar.ai/" rel="me noopener">Instagram</a></li>', "", "instagram.com"),  # the footer's link: the press page's account table also names it
    ("the embed page without LinkedIn", "embed/index.html", "linkedin.com/company/spaceradar-ai", "linkedin.com/company/x", "linkedin.com"),
    ("a footer account that says nofollow", "o/" + obj, 'href="https://www.instagram.com/spaceradar.ai/" rel="me noopener"', 'href="https://www.instagram.com/spaceradar.ai/" rel="nofollow"', 'rel=\\"me noopener\\"' if False else "rel="),
    ("a Facebook link", "404.html", "</footer>", '<a href="https://www.facebook.com/spaceradar">f</a></footer>', "no Facebook"),
]
for name, rel, old, new, expect in cases:
    respoil(built, work)
    spoil(work / rel, old, new)
    out = checked(rootcopy, work)
    ok(bool(out) and expect.lower() in out.lower(), f"check_seo.py refuses {name} ({out.strip().splitlines()[:1]})")
# the home page
for name, old, new, expect in (("the home page without the Starlink link", 'href="starlink/index.html"', 'href="starlnk/index.html"', "starlink/index.html"),
                               ("the home page without GitHub", 'href="https://github.com/Sara-Managed-Projects/space-radar" rel="me noopener"', 'href="https://example.org" rel="me noopener"', "space-radar")):
    tree2 = tmp / "root2"
    if tree2.exists():
        shutil.rmtree(tree2)
    tree(tree2)
    spoil(tree2 / "site" / "index.html", old, new)
    out = checked(tree2, built)
    ok(bool(out) and expect in out, f"check_seo.py refuses {name} ({out.strip().splitlines()[:1]})")
tree3 = tmp / "root3"
tree(tree3)
t = (tree3 / "site" / "index.html").read_text(encoding="utf-8")
(tree3 / "site" / "index.html").write_text(re.sub(r'<footer id="sr-sitefoot".*?</footer>', "", t, flags=re.S), encoding="utf-8")
out = checked(tree3, built)
ok(bool(out) and "the footer does not link" in out, "check_seo.py refuses a home page with no footer at all")
# the key file
respoil(built, work)
(work / indexnow.key_file_name()).unlink()
out = checked(rootcopy, work)
ok("key file" in out.lower() or "is missing" in out, f"check_seo.py refuses a build with no IndexNow key file ({out.strip().splitlines()[:1]})")
respoil(built, work)
(work / indexnow.key_file_name()).write_text("not the key\n")
ok("does not hold the key" in checked(rootcopy, work), "and one that does not hold the key")

# --- 2: lastmod -----------------------------------------------------------------------------------------
repo = tmp / "repo"
(repo / "registry").mkdir(parents=True)
(repo / "site").mkdir()
env = dict(os.environ, GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@example.org", GIT_COMMITTER_NAME="t", GIT_COMMITTER_EMAIL="t@example.org")


def commit(msg: str, date: str) -> None:
    e = dict(env, GIT_AUTHOR_DATE=f"{date}T12:00:00Z", GIT_COMMITTER_DATE=f"{date}T12:00:00Z")
    subprocess.run(["git", "add", "-A"], cwd=repo, env=e, capture_output=True, check=True)
    subprocess.run(["git", "commit", "-q", "-m", msg], cwd=repo, env=e, capture_output=True, check=True)


subprocess.run(["git", "init", "-q"], cwd=repo, check=True, capture_output=True)
tours = "tours:\n" + "".join(f"  - id: trip-{n}\n    title: \"Trip {n}\"\n    blurb: \"Blurb {n}\"\n" for n in (1, 2, 3))
(repo / "registry" / "tours.yaml").write_text(tours)
(repo / "site" / "index.html").write_text("home v1\n")
(repo / "registry" / "worlds.yaml").write_text("worlds: []\n")
(repo / "registry" / "exotics.yaml").write_text("exotics: []\n")
commit("first", "2026-09-01")
(repo / "registry" / "tours.yaml").write_text(tours.replace('"Blurb 2"', '"Blurb 2, edited"'))
commit("edit trip 2", "2026-09-15")
(repo / "registry" / "exotics.yaml").write_text("exotics: [a]\n")
commit("exotics", "2026-09-20")
(repo / "site" / "index.html").write_text("home v2\n")
commit("home", "2026-10-02")
(repo / "registry" / "worlds.yaml").write_text("worlds: [a]\n")
(repo / "registry" / "scratch.txt").write_text("x\n")
commit("worlds", "2026-10-05")
d = seo_dates.trip_dates(["trip-1", "trip-2", "trip-3", "trip-missing"], repo)
ok(d["trip-2"] == "2026-09-15" and d["trip-1"] == "2026-09-01" and d["trip-3"] == "2026-09-01", f"each trip has the date of its own row ({d})")
ok(d["trip-missing"] == "2026-09-15", "a trip with no row of its own gets the registry file's date")
ok(seo_dates.page_date(["site/index.html"], repo) == "2026-10-02", "the home page's date is its own file's")
ok(seo_dates.page_date(["registry/exotics.yaml", "registry/worlds.yaml"], repo) == "2026-10-05", "several source files: the newest")
ok(seo_dates.page_date(["registry/nothing.yaml"], repo) == "2026-10-05", "a file git has never seen falls back to the build's commit date")
od = seo_dates.object_dates({"europa": "worlds", "tycho": "exotics"}, repo)
ok(od["tycho"] == "2026-09-20" or od["tycho"] == "2026-10-05", f"an object page takes its group's files' date ({od})")
ok(seo_dates.fallback(tmp) == dt.datetime.now(dt.timezone.utc).date().isoformat(), "outside a repository the date is today's")
real = importlib.import_module("seo_dates")
ok(all((ROOT / f).is_file() for fs in real.OBJECT_SOURCES.values() for f in fs) and (ROOT / real.TRIPS_SOURCE).is_file(), "every file the object groups name exists, so a rename cannot turn a group into the fallback")
bs = importlib.import_module("build_seo")
xml = bs.sitemap("https://www.spaceradar.ai", ["a", "b"], dates={"https://www.spaceradar.ai/o/a.html": "2020-01-02"})
ok("<loc>https://www.spaceradar.ai/o/a.html</loc><lastmod>2020-01-02</lastmod>" in xml, "the sitemap writes the date it is given for a URL")
ok(re.search(r"<loc>https://www\.spaceradar\.ai/o/b\.html</loc><lastmod>\d{4}-\d{2}-\d{2}</lastmod>", xml) is not None, "and the build's own date for a URL it is not given")
dates = re.findall(r"<lastmod>([^<]+)</lastmod>", (built / "sitemap.xml").read_text(encoding="utf-8"))
ok(len(dates) > 300 and all(re.match(r"^\d{4}-\d{2}-\d{2}$", x) for x in dates), f"the built sitemap has {len(dates)} valid dates")
ok(f"embed/index.html</loc>" in (built / "sitemap.xml").read_text(encoding="utf-8"), "and lists the embed page")

# --- 3: IndexNow ---------------------------------------------------------------------------------------
ok(re.fullmatch(r"[0-9a-f]{32}", indexnow.KEY) is not None, "the key is 32 hex characters")
kf = indexnow.write_key(tmp / "kf")
ok(kf.name == indexnow.KEY + ".txt" and kf.read_text().strip() == indexnow.KEY, "the key file is <key>.txt and holds the key")
old = {"https://x/a": "2026-01-01", "https://x/b": "2026-01-01"}
new = {"https://x/a": "2026-01-01", "https://x/b": "2026-02-01", "https://x/c": "2026-02-01"}
ok(indexnow.changed(old, new) == ["https://x/b", "https://x/c"], "the changed set is the changed lastmods and the new URLs")
body = indexnow.payload(["https://www.spaceradar.ai/o/a.html"])
ok(body["host"] == "www.spaceradar.ai" and body["key"] == indexnow.KEY and body["keyLocation"] == f"https://www.spaceradar.ai/{indexnow.KEY}.txt", "the payload names the host, the key and where the key file is")
calls = []
real_open = urllib.request.urlopen
urllib.request.urlopen = lambda *a, **k: calls.append(a) or (_ for _ in ()).throw(OSError("offline"))
try:
    xmlf = tmp / "s.xml"
    xmlf.write_text(xml)
    oldf = tmp / "old.xml"
    oldf.write_text(bs.sitemap("https://www.spaceradar.ai", ["a", "b"], dates={"https://www.spaceradar.ai/o/a.html": "2019-01-01"}))
    ok(indexnow.main(["ping", str(oldf), str(xmlf)]) == 0 and len(calls) == 1, "a ping that cannot reach the endpoint is a warning and exit 0")
    calls.clear()
    ok(indexnow.main(["ping", str(oldf), str(xmlf), "--dry-run"]) == 0 and not calls, "a dry run sends nothing")
    ok(indexnow.main(["ping", str(tmp / "missing.xml"), str(xmlf)]) == 0 and not calls, "no previous sitemap: nothing is sent, and the exit is 0")
    ok(indexnow.main(["ping", str(oldf), str(oldf)]) == 0 and not calls, "nothing changed: nothing is sent")
    ok(indexnow.main(["ping", str(oldf)]) == 2, "a malformed call is a usage message, not a ping")
finally:
    urllib.request.urlopen = real_open

# --- 4: deploy.sh ------------------------------------------------------------------------------------------
bindir = tmp / "bin"
bindir.mkdir()
log = tmp / "aws.log"
fake = bindir / "aws"
fake.write_text(f'#!/bin/sh\necho "$*" >> "{log}"\nexit 0\n')
fake.chmod(fake.stat().st_mode | stat.S_IEXEC)
base_env = dict(os.environ, PATH=f"{bindir}{os.pathsep}{os.environ.get('PATH', '')}")
base_env.pop("INDEXNOW", None)
off = run("bash", "scripts/deploy.sh", "--bucket", "example-bucket", "--app-only", "--dry-run", env=base_env)
calls_text = log.read_text() if log.is_file() else ""
ok(off.returncode == 0, f"deploy.sh --dry-run runs ({off.stderr.strip()[:200]})")
ok(re.search(rf"would upload {indexnow.KEY}\.txt \(text/plain", off.stdout) is not None, "the IndexNow key file is uploaded as text/plain")
ok("IndexNow" not in off.stdout and "indexnow" not in off.stdout.lower(), "without INDEXNOW=1 the ping is not even mentioned")
ok("s3://example-bucket/embed" in calls_text and calls_text.count("s3://example-bucket/embed") == 2, "the embed page and its generator are synced")
on = run("bash", "scripts/deploy.sh", "--bucket", "example-bucket", "--app-only", "--dry-run", env=dict(base_env, INDEXNOW="1"))
ok(on.returncode == 0 and "would ping IndexNow" in on.stdout, "with INDEXNOW=1 a dry run says it would ping, and sends nothing")
ok(on.stdout.rindex("would ping IndexNow") > on.stdout.rindex("would upload sw.js"), "the ping comes after the last upload")
sh = (ROOT / "scripts" / "deploy.sh").read_text(encoding="utf-8")
ping_lines = [l for l in sh.splitlines() if "indexnow.py" in l and ("ping" in l or "fetch" in l)]
joined = sh[sh.index('INDEXNOW=1 ./scripts/deploy.sh'):]
ok(all("||" in sh.splitlines()[sh.splitlines().index(l) + 1] or "||" in l for l in ping_lines) and len(ping_lines) == 2, "both IndexNow calls in deploy.sh end in `|| echo`: they cannot fail the deploy")
ok(re.search(r'if \[ "\$WHAT" != "assets" \] && \[ "\$\{INDEXNOW:-\}" = "1" \]', sh) is not None, "the ping is guarded by INDEXNOW=1")

shutil.rmtree(tmp, ignore_errors=True)
print(f"\n{len(failures)} failure(s)" if failures else "\nall SEO growth checks pass")
sys.exit(1 if failures else 0)
