#!/usr/bin/env python3
"""scripts/deploy.sh, dry or real, leaves every tracked file of the checkout as it found it.

Two things used to write into the checkout: the build's refresh of the journal's feed (scripts/refresh_blog_feed.py:
registry/blog-feed.json, and through scripts/gen_media.py site/js/data/media.js). In a dry run a stray copy got committed;
in a real deploy the next one refused ("deploy worktree not clean"). The refreshed feed and its media.js now go into the
build's own folder.

  1. DRY RUN. The refresh is not called (a python3 on PATH notes any call to it), the dry run says so, and `git diff HEAD`,
     `git status` and the bytes of the two files are the same after it.
  2. REAL RUN, the aws CLI stubbed: the stub copies what each `s3 sync` / `s3 cp` would upload into a folder, and the journal's
     feed is a file:// feed holding one made-up post (SR_BLOG_FEED_URL). After it: nothing tracked changed, and the made-up post is in
     what was uploaded (js/data/media.js, and the pages' "From the journal" lists), so the refresh took effect
     without touching the checkout.
  3. A feed that cannot be read keeps the committed snapshot, and the real run still succeeds.

Needs Node 22 on PATH (the build) and git. Run: python3 tests/test_deploy_dryrun_clean.py
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
failures: list[str] = []


def ok(cond: bool, msg: str) -> None:
    print(("PASS: " if cond else "FAIL: ") + msg)
    if not cond:
        failures.append(msg)


def sh(*cmd, env=None):
    return subprocess.run([str(c) for c in cmd], cwd=ROOT, capture_output=True, text=True, env=env)


WATCHED = ("registry/blog-feed.json", "site/js/data/media.js")


def state() -> dict:
    return {
        "diff": sh("git", "diff", "HEAD").stdout,
        "status": sh("git", "status", "--porcelain").stdout,
        "bytes": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in WATCHED},
    }


tmp = Path(tempfile.mkdtemp(prefix="deploy-clean-"))
bindir = tmp / "bin"
bindir.mkdir()
cap = tmp / "uploaded"
cap.mkdir()
calls = tmp / "refresh-calls.log"
# aws: `s3 sync [flags] SRC s3://bucket/DEST` and `s3 cp SRC s3://bucket/NAME` copy SRC to <cap>/DEST; everything else succeeds.
(bindir / "aws").write_text(f"""#!/bin/sh
[ "$1" = s3 ] || exit 0
verb="$2"; prev=""; src=""; dest=""
for a in "$@"; do
  case "$a" in s3://*) if [ -z "$dest" ]; then dest="${{a#s3://*/}}"; src="$prev"; fi ;; esac
  prev="$a"
done
[ -n "$dest" ] || exit 0
case "$verb" in
  sync) mkdir -p "{cap}/$dest"; cp -R "$src/." "{cap}/$dest/" 2>/dev/null || true ;;
  cp)   mkdir -p "$(dirname "{cap}/$dest")"; cp "$src" "{cap}/$dest" 2>/dev/null || true ;;
esac
exit 0
""")
(bindir / "python3").write_text(
    f'#!/bin/sh\ncase "$*" in *refresh_blog_feed*) echo "$*" >> "{calls}";; esac\nexec "{sys.executable}" "$@"\n')
for f in ("aws", "python3"):
    (bindir / f).chmod((bindir / f).stat().st_mode | stat.S_IEXEC)

POST = "Zzstub journal post for the deploy test"
feed = tmp / "feed.json"
feed.write_text(json.dumps({"title": "Journal", "items": [{
    "title": POST, "url": "https://blog.spaceradar.ai/p/zzstub/", "date_published": "2099-01-01T00:00:00Z",
    "summary": "A made-up post.", "image": "", "tags": ["iss"]}]}))

env = dict(os.environ, PATH=f"{bindir}{os.pathsep}{os.environ.get('PATH', '')}", MODELS_BUCKET="", SR_NO_PRINT="1",
           SNAPSHOT_INDEX_URL="file:///nonexistent")
env.pop("INDEXNOW", None)
env.pop("SR_BLOG_FEED", None)
ARGS = ("bash", "scripts/deploy.sh", "--bucket", "example-bucket", "--app-only")

# 1. dry run
before = state()
r = sh(*ARGS, "--dry-run", env=env)
ok(r.returncode == 0, f"deploy.sh --dry-run runs ({r.stderr.strip()[-200:]})")
ok(not calls.exists(), "a dry run does not call refresh_blog_feed.py")
ok("blog snapshot is not refreshed" in r.stdout, "the dry run says it kept the committed snapshot")
ok(state() == before, "after a dry run: git diff, git status and the two files' bytes are unchanged")

# 2. a real run, upload stubbed, the journal's feed a file
# (the dry run's own uploads went through the stub too, with source maps the real run below does not make)
shutil.rmtree(cap)
cap.mkdir()
real_env = dict(env, SR_BLOG_FEED_URL=feed.as_uri())
r = sh(*ARGS, "--no-edge-cache", "--strip-only", "--no-precompress", env=real_env)
ok(r.returncode == 0, f"a real deploy.sh run (aws stubbed) succeeds ({(r.stderr or r.stdout).strip()[-300:]})")
ok(calls.exists() and "--out-dir" in calls.read_text(), "the refresh ran, and was told to write into the build's folder")
ok(state() == before, "after a real run: git diff, git status and the two files' bytes are unchanged")
media = cap / "js" / "data" / "media.js"
ok(media.is_file() and POST in media.read_text(encoding="utf-8"), "the uploaded js/data/media.js carries the refreshed feed")
ok("sourceMappingURL" not in (media.read_text(encoding="utf-8") if media.is_file() else "x") and not (cap / "js" / "data" / "media.js.map").exists(),
   "the refreshed media.js has no stale source map")
pages = [p for p in cap.rglob("*.html") if POST in p.read_text(encoding="utf-8", errors="replace")]
ok(len(pages) > 0, f"the pages' 'From the journal' lists carry the refreshed feed ({len(pages)} pages)")
ok(POST not in (ROOT / "registry" / "blog-feed.json").read_text(encoding="utf-8"), "the committed snapshot does not hold the made-up post")

# 3. an unreadable feed keeps the committed snapshot
calls.unlink()
shutil_cap = tmp / "uploaded2"
shutil_cap.mkdir()
(bindir / "aws").write_text((bindir / "aws").read_text().replace(str(cap), str(shutil_cap)))
r = sh(*ARGS, "--no-edge-cache", "--strip-only", "--no-precompress", env=dict(env, SR_BLOG_FEED_URL=(tmp / "missing.json").as_uri()))
ok(r.returncode == 0 and "kept the committed snapshot" in r.stdout, "an unreadable feed keeps the committed snapshot and the deploy goes on")
ok(state() == before, "and the checkout is unchanged")

if failures:
    print(f"\n{len(failures)} FAILED")
    sys.exit(1)
print("\ndeploy leaves the checkout clean, dry or real: all ok")
