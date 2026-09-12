#!/usr/bin/env python3
"""Check that every model's `source:` names something that actually exists.

    ./scripts/check-model-sources.py            # report
    ./scripts/check-model-sources.py --strict   # exit 1 on an unresolved source

WHY THIS EXISTS

registry/models.yaml's own header says it, and then leaves it open:

    A row without a licence line FAILS CI. That check is necessary and it is not sufficient: it
    proves a string is present, not that the string is TRUE.

`check_registry.py` proves a `source:` and a `licence:` are present and that CREDITS.md agrees.
Nothing proved the source RESOLVES. A row could cite `3D Models/Hubble Space Telescope (C)` --
a folder NASA does not have -- and pass every check in the tree, and the credit would be
unverifiable by anyone who came later.

This resolves each NASA source against the repository's own file index. It is the same class of
check as scripts/check-model-ids.sh, which turned a `catalogue:` string into a fact, and
scripts/check-model-reach.py, which turned "a name that never matches is a wasted file" into a
number.

TWO SHAPES OF CLAIM, BOTH ACCEPTED. Most NASA models live at `3D Models/<Name>/<Name>.glb`, so a
source naming the folder is naming the model. A few share a folder -- `3D Models/Space Shuttle
Parts/` holds five, of which `Solid Rocket Booster.glb` is the one this project ships as its spent
stage -- and there the source names the model inside it. The first version of this check only
understood the first shape and reported the rocket body as unresolved, which would have sent
somebody to "fix" a citation that was already right.

NOT IN CI, deliberately, for the reason check-model-ids.sh gives: it needs the network. The index
is cached for a day, so a re-run is free, and a fetch that fails is reported as "could not look"
rather than as an unresolved source.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_URL = "https://api.github.com/repos/nasa/NASA-3D-Resources/git/trees/master?recursive=1"
NASA_PREFIX = "https://github.com/nasa/NASA-3D-Resources"
UA = "space-radar-source-check/1.0 (+https://spaceradar.ai)"
CACHE = Path(os.environ.get("TMPDIR", "/tmp")) / "space-radar-models" / "nasa-tree.json"
CACHE_SECONDS = 24 * 3600


def nasa_index():
    """The repository's file list, or None when it cannot be looked at."""
    if CACHE.exists() and time.time() - CACHE.stat().st_mtime < CACHE_SECONDS:
        try:
            return json.loads(CACHE.read_text())
        except json.JSONDecodeError:
            pass
    req = urllib.request.Request(INDEX_URL, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        print(f"  -- could not look at the NASA index: {e}", file=sys.stderr)
        return None
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(data))
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="exit 1 if any source does not resolve")
    args = ap.parse_args()

    index = nasa_index()
    if index is None:
        print("nothing said: the index could not be read, which is not the same as a bad source.")
        return 0

    glbs = {x["path"]: x.get("size", 0) for x in index.get("tree", []) if x["path"].lower().endswith(".glb")}
    stems = {p[:-4]: s for p, s in glbs.items()}                       # path without .glb
    folders = {}
    for p, s in glbs.items():
        folders.setdefault("/".join(p.split("/")[:2]), []).append((p, s))

    rows = [l for l in (ROOT / "registry/models.yaml").read_text(encoding="utf-8").split("\n")
            if "file: site/models/" in l]
    unresolved, foreign, ok = [], [], []
    for line in rows:
        rid = (re.search(r"id: ([A-Za-z0-9_-]+)", line) or [None, "?"])[1]
        src = (re.search(r'source: "([^"]*)"', line) or [None, ""])[1]
        if NASA_PREFIX not in src:
            # Not a defect: spec 0027 always expected CC BY models from elsewhere. It is listed so
            # that the day one arrives, somebody checks it by hand instead of assuming this did.
            foreign.append((rid, src))
            continue
        claim = src.split("—", 1)[-1].strip() if "—" in src else src
        size = None
        if claim in stems:
            size = stems[claim]
        elif claim in folders:
            size = max(s for _, s in folders[claim])
        if size is None:
            unresolved.append((rid, claim))
        else:
            shipped = (ROOT / (re.search(r"file: (site/models/[^,]+\.glb)", line).group(1)))
            ours = shipped.stat().st_size if shipped.exists() else 0
            ok.append((rid, size, ours))

    print(f"{len(rows)} model rows; {len(ok)} NASA sources resolved, {len(foreign)} not from NASA\n")
    if ok:
        print(f"{'model':<16}{'NASA':>10}{'ours':>10}   of theirs")
        for rid, theirs, ours in sorted(ok, key=lambda r: -r[1]):
            pct = f"{ours * 100 // theirs} %" if theirs else "-"
            print(f"  {rid:<14}{theirs // 1024:>8} kB{ours // 1024:>8} kB   {pct:>6}")
    if foreign:
        print("\nsources that are not NASA 3D Resources -- check these by hand:")
        for rid, src in foreign:
            print(f"  {rid:<16}{src[:70]}")
    if unresolved:
        print(f"\n{len(unresolved)} source(s) name something the NASA index does not have:")
        for rid, claim in unresolved:
            print(f"  {rid:<16}{claim}")
        print("\nA credit nobody can follow is not a credit. Fix the string, not the index.")
        return 1 if args.strict else 0
    print("\nevery NASA source names a model that exists.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
