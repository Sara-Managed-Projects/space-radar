#!/usr/bin/env python3
"""Stamp site/sw.js with the build it belongs to: a version and the list of files that are the app.

    python3 scripts/stamp_sw.py --site dist/space-radar-1.2.0/site     # a release zip, in place
    python3 scripts/stamp_sw.py --out "$BUILT/sw.js"                   # a deploy: site/ is not touched
    python3 scripts/stamp_sw.py --overlay "$BUILT/min" --out "$BUILT/sw.js"   # a deploy that serves
                                                                       # scripts/minify_site.py's js/ and css/
    python3 scripts/stamp_sw.py --kill --out "$BUILT/sw.js"            # a worker that removes itself
    python3 scripts/stamp_sw.py --check                                # the committed file is unstamped

WHY. The service worker (site/sw.js) serves the page and its code from a cache, so a visitor with
no network still gets the app. A cache of code is only safe when it is ONE release: so each build
names its files and the SHA-256 of each, the worker downloads exactly those at install and refuses
the lot if one does not match (a deploy half way through, an edge with the old file), and a new
build is a different sw.js, which is what makes a browser install it.

The committed sw.js says `version: 'dev'` and stays that way: a stamp in git would conflict in
every pull request. An unstamped worker precaches nothing and asks the network first, which is
what a contributor's dev server wants. scripts/deploy.sh and .github/workflows/release.yml stamp
a COPY; `--check` (in the gate) refuses a stamped file in the tree.

WHAT IS THE SHELL: index.html, the manifest and its icons, and everything under css/, js/, vendor/
and the Latin fonts. Not the textures, models, sounds or data: those are kept as a visitor uses
them. Not the Cyrillic fonts (an English page never asks for them; tests/test_first_visit_bytes.mjs
holds that line), and not the film camera, which only tools/render-trip.mjs loads.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOCK = re.compile(r"(/\* BUILD:BEGIN[^\n]*\*/\n)(.*?\n)(/\* BUILD:END \*/)", re.S)
UNSTAMPED = "const BUILD = { version: 'dev', shell: [], kill: false };\n"
HASH_CHARS = 16

SHELL_FILES = ("index.html", "manifest.webmanifest")
SHELL_GLOBS = ("css/**/*.css", "js/**/*.js", "vendor/**/*.js", "fonts/*-latin.woff2", "images/icons/*.png")
NOT_SHELL = {"js/ui/rendermode.js"}
# The KTX2 loader and the Basis transcoder (site/vendor/basis/, spec 0056 task 1): fetched only when
# a map that ships as .ktx2 is asked for, and today none does. Precached, they would be 160 kB of
# JavaScript in every offline install for a feature no map uses; they join the shell with the first
# map that needs them. Offline without them, scene/ktx2.js falls back to the WebP it already has.
NOT_SHELL_DIRS = ("vendor/basis/",)


def shell_files(site: Path) -> list[str]:
    found = [f for f in SHELL_FILES if (site / f).is_file()]
    for pattern in SHELL_GLOBS:
        found += [p.relative_to(site).as_posix() for p in site.glob(pattern) if p.is_file()]
    return sorted(f for f in set(found) - NOT_SHELL if not f.startswith(NOT_SHELL_DIRS))


def served(site: Path, overlay: Path | None, rel: str) -> Path:
    """The file a browser will be sent for `rel`: the overlay's copy when it has one.

    A deploy strips the comments from js/ and css/ into a temp folder (scripts/minify_site.py) and
    uploads THOSE, so the hash a worker checks its download against must be theirs (internal #405).
    """
    if overlay is not None and (overlay / rel).is_file():
        return overlay / rel
    return site / rel


def build_line(site: Path, kill: bool = False, overlay: Path | None = None) -> tuple[str, dict]:
    if kill:
        build = {"version": "kill", "shell": [], "kill": True}
    else:
        shell = [[rel, hashlib.sha256(served(site, overlay, rel).read_bytes()).hexdigest()[:HASH_CHARS]] for rel in shell_files(site)]
        if not any(rel == "index.html" for rel, _ in shell):
            raise SystemExit(f"{site}: no index.html, so this is not the site folder")
        # The worker's own text is part of the version: a change to its rules is a new build too.
        own = BLOCK.sub(lambda m: m.group(1) + UNSTAMPED + m.group(3), (site / "sw.js").read_text(encoding="utf-8"))
        digest = hashlib.sha256((json.dumps(shell) + own).encode("utf-8")).hexdigest()[:HASH_CHARS]
        build = {"version": digest, "shell": shell, "kill": False}
    return "const BUILD = " + json.dumps(build, separators=(",", ":")) + ";\n", build


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--site", type=Path, default=ROOT / "site", help="the folder that is served (default: site/)")
    ap.add_argument("--out", type=Path, help="write the stamped worker here (default: <site>/sw.js, in place)")
    ap.add_argument("--overlay", type=Path, help="a folder whose files replace the same paths of --site when hashing (scripts/minify_site.py --out)")
    ap.add_argument("--kill", action="store_true", help="stamp a worker that unregisters itself and deletes its caches")
    ap.add_argument("--check", action="store_true", help="exit 1 unless <site>/sw.js is the unstamped file git keeps")
    args = ap.parse_args()

    source = args.site / "sw.js"
    if not source.is_file():
        print(f"stamp_sw: {source} is missing", file=sys.stderr)
        return 1
    text = source.read_text(encoding="utf-8")
    found = BLOCK.search(text)
    if not found:
        print(f"stamp_sw: {source} has no BUILD:BEGIN ... BUILD:END block to stamp", file=sys.stderr)
        return 1

    if args.check:
        if found.group(2) != UNSTAMPED:
            print(f"stamp_sw: {source} is stamped. Git keeps it unstamped (version 'dev'); stamp a copy "
                  f"with --out, or restore the file.", file=sys.stderr)
            return 1
        files = shell_files(args.site)
        print(f"stamp_sw: sw.js is unstamped, and a stamp would name {len(files)} files")
        return 0

    if args.overlay is not None and not args.overlay.is_dir():
        print(f"stamp_sw: --overlay {args.overlay} is not a folder", file=sys.stderr)
        return 1
    line, build = build_line(args.site, args.kill, args.overlay)
    out = args.out or source
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(BLOCK.sub(lambda m: m.group(1) + line + m.group(3), text), encoding="utf-8")
    total = sum(served(args.site, args.overlay, rel).stat().st_size for rel, _ in build["shell"])
    print(f"stamp_sw: {out} is build {build['version']}: {len(build['shell'])} files, {total / 1e6:.2f} MB before compression")
    return 0


if __name__ == "__main__":
    sys.exit(main())
