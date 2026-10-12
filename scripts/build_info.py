#!/usr/bin/env python3
"""Write build.json: which commit a deploy was made from, when, and which build of the worker it is.

    python3 scripts/build_info.py --sw "$BUILT/sw.js" --out "$BUILT/build.json"
    python3 scripts/build_info.py --overlay "$BUILT/min" --sw "$BUILT/sw.js" --out "$BUILT/build.json"

WHY (public #291, the review of 2026-10-12). Nothing on the live site said which commit it was built
from. A maintainer compared files by hand (scripts/verify-deploy.sh) and a visitor could not tell at
all. scripts/deploy.sh now writes this file at the root of the site, beside sw.js, on every deploy
of the app:

    {
      "schema": 1,
      "commit": "<the full sha of HEAD>",
      "commit_short": "<its first seven characters>",
      "committed_at": "<that commit's time, UTC>",
      "built_at": "<when this file was written, UTC>",
      "build": "<the service worker's stamp: scripts/stamp_sw.py's version>",
      "files": <how many files that stamp names>,
      "bytes": <their size as served, before compression>,
      "dirty": <true when tracked files differed from the commit>
    }

WHAT IS NOT IN IT, AND MUST NOT BE. Nothing about where the site is hosted: no bucket, account,
distribution, region or profile. This script is not given any of them (deploy.sh passes paths in
its own temp folder and nothing else), and tests/test_harvester_scripts.py holds the keys to the
list above.

NOR THE DATASETS' AGES. Those are already public, and fresher than any deploy: data/v1/index.json
has each saved copy's `fetched_at` and `valid_until`, written by the harvester. A reader joins the
two (scripts/freshness.py does); a copy here would be stale by the next harvest.

`dirty` is the honest part of `commit`: a deploy from a tree with uncommitted changes to tracked
files is not that commit, and says so.

An --assets-only deploy does not write it: the commit it names is the app's.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stamp_sw  # noqa: E402  (the same rule for which bytes a browser is sent)

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = 1
KEYS = ("schema", "commit", "commit_short", "committed_at", "built_at", "build", "files", "bytes", "dirty")
BUILD_LINE = re.compile(r"^const BUILD = (\{.*\});$", re.M)


def git(*args: str) -> str:
    try:
        return subprocess.run(["git", "-C", str(ROOT), *args], check=True, capture_output=True, text=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError) as e:
        raise SystemExit(f"build_info: `git {' '.join(args)}` failed ({e}). build.json names the commit a deploy "
                         "was made from, so deploy from a git checkout.")


def utc(when: datetime) -> str:
    return when.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def stamp_of(sw: Path) -> dict:
    found = BUILD_LINE.search(sw.read_text(encoding="utf-8"))
    build = json.loads(found.group(1)) if found else None
    if not build or not stamp_sw_is_stamped(build):
        raise SystemExit(f"build_info: {sw} is not a stamped worker (scripts/stamp_sw.py --out writes one)")
    return build


def stamp_sw_is_stamped(build: dict) -> bool:
    return build.get("version") not in (None, "dev", "kill") and bool(build.get("shell"))


def build_info(site: Path, overlay: Path | None, sw: Path, now: datetime | None = None) -> dict:
    build = stamp_of(sw)
    commit = git("rev-parse", "HEAD")
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise SystemExit(f"build_info: HEAD is {commit!r}, not a commit")
    committed = datetime.fromisoformat(git("show", "-s", "--format=%cI", "HEAD"))
    return {
        "schema": SCHEMA,
        "commit": commit,
        "commit_short": commit[:7],
        "committed_at": utc(committed),
        "built_at": utc(now or datetime.now(timezone.utc)),
        "build": build["version"],
        "files": len(build["shell"]),
        "bytes": sum(stamp_sw.served(site, overlay, rel).stat().st_size for rel, _ in build["shell"]),
        "dirty": bool(git("status", "--porcelain", "--untracked-files=no")),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--site", type=Path, default=ROOT / "site", help="the folder that is served (default: site/)")
    ap.add_argument("--overlay", type=Path, help="the folder scripts/stamp_sw.py hashed in place of --site's files, if any")
    ap.add_argument("--sw", type=Path, required=True, help="the STAMPED worker this deploy uploads")
    ap.add_argument("--out", type=Path, required=True, help="where to write build.json")
    args = ap.parse_args()
    info = build_info(args.site, args.overlay, args.sw)
    assert tuple(info) == KEYS
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(info, indent=1) + "\n", encoding="utf-8")
    print(f"build_info: {args.out} says commit {info['commit_short']}{' (with uncommitted changes)' if info['dirty'] else ''}, "
          f"build {info['build']}, {info['files']} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
