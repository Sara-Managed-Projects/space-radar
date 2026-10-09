#!/usr/bin/env python3
"""Build the release zip: the app as served plus a saved copy of the live data, and check it.

    python3 scripts/save_offline_data.py                       # first: the saved copy, into site/data/v1/
    python3 scripts/build_release.py --version 1.2.0           # dist/space-radar-1.2.0.zip and .sha256
    python3 scripts/build_release.py --version 1.2.0 --out /tmp/dist --root /some/checkout

WHY A SCRIPT (public #471). These steps were shell inside .github/workflows/release.yml, which runs
on a tag: the first time anybody found out whether they still worked was the day of a release.
Here they can be run on a laptop and by a test (tests/test_release_zip.py, in CI on every pull
request, against a small tree made for it), and the workflow calls this file and nothing else to
build. What the zip is: docs/RUN_LOCALLY.md, which travels inside it.

It REFUSES, with the reason, rather than build a zip a school cannot use:
  - a version that is not MAJOR.MINOR.PATCH;
  - no saved copy of the data (site/data/v1/index.json), or one without the stations: the page
    would open on an empty sky with no internet, which is the one thing the zip is for (any
    OTHER source the copy lacks is printed, not refused: the app says per source what it has);
  - a file the zip promises that is not in the tree (LICENSE, CREDITS.md, the guide).
And it CHECKS what it built by unpacking it: every promised file is there, the service worker is
stamped with this build, the data's index reads, the manifest starts at "./", and no .DS_Store
travelled. Standard library only.
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
VERSION = re.compile(r"^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$")
# Beside site/: what a person who unzips it needs to know whose it is and how to start it.
BESIDE = ("LICENSE", "CREDITS.md", "CHANGELOG.md", "docs/RUN_LOCALLY.md", "scripts/save_offline_data.py")
# What must be in the zip, relative to its top folder.
PROMISED = BESIDE + (
    "START-HERE.txt", "site/index.html", "site/sw.js", "site/manifest.webmanifest", "site/js/main.js",
    "site/data/v1/index.json", "site/data/v1/celestrak-stations.json",
)
STAMPED = re.compile(r'^const BUILD = \{"version":"[0-9a-f]{16}"', re.M)


class Refused(Exception):
    """The zip would not be one worth shipping."""


def start_here(version: str, day: str) -> str:
    return "\n".join([
        f"Space Radar {version}",
        "",
        "1. Open a terminal in this folder.",
        "2. Windows:      py -m http.server 8177 --directory site",
        "   macOS, Linux: python3 -m http.server 8177 --directory site",
        "3. Open http://localhost:8177 in your browser.",
        "",
        "It works with no internet. docs/RUN_LOCALLY.md has the details and the troubleshooting.",
        f"The data in site/data/v1 was saved on {day}; CREDITS.md says whose it is.",
        "",
    ])


def check_tree(root: Path) -> None:
    """Refuse before copying 86 MB: what the zip needs is in the tree."""
    data = root / "site/data/v1"
    index = data / "index.json"
    if not index.is_file() or index.stat().st_size == 0:
        raise Refused("no saved copy of the data: site/data/v1/index.json is missing. Run "
                      "`python3 scripts/save_offline_data.py` first (docs/RELEASING.md)")
    try:
        doc = json.loads(index.read_text(encoding="utf-8"))
    except ValueError as err:
        raise Refused(f"site/data/v1/index.json does not read as JSON: {err}") from err
    if doc.get("schema") != 1 or not doc.get("snapshots"):
        raise Refused("site/data/v1/index.json is not a schema 1 index with snapshots")
    stations = data / "celestrak-stations.json"
    if not stations.is_file() or stations.stat().st_size == 0:
        raise Refused("the saved copy has no stations (site/data/v1/celestrak-stations.json): "
                      "a copy without the stations is not one worth shipping")
    # A zip is a redistribution. ESA's NEOCC list was in the saved copy until 2026-10-09 and its terms
    # forbid exactly that (internal #370): a folder that still holds it is refused, not quietly cleaned,
    # so whoever cuts the release knows their saved copy predates the change and saves a new one.
    # (A manifest ROW with no file is not a copy of anything: the live index names Space-Track's
    # reentries as `skipped`, and the app says so by name.)
    rows = doc.get("snapshots") or {}
    for rid in not_ours_to_copy():
        if (data / f"{rid}.json").is_file() or (data / f"{rid}.cols.json").is_file() or (rows.get(rid) or {}).get("fetched_at"):
            raise Refused(f"the saved copy holds {rid}, which registry/sources.yaml switches off: its publisher "
                          "does not allow redistribution. Run `python3 scripts/save_offline_data.py` again "
                          "(it removes the file and marks the manifest row skipped) before building a release")
    for rel in BESIDE + ("site/index.html", "site/sw.js", "site/manifest.webmanifest", "site/js/main.js"):
        if not (root / rel).is_file():
            raise Refused(f"{rel} is not in the tree, and the zip promises it")


def not_ours_to_copy() -> list:
    """The ids registry/sources.yaml switches off: a publisher who does not let its data be passed on.

    Read from THIS script's repository (harvest/sources.json, the registry's mirror), not from the
    tree being zipped: the rule is the builder's, and a tree does not get to leave it out.
    """
    rows = json.loads((HERE.parent / "harvest/sources.json").read_text(encoding="utf-8")).get("sources") or []
    return sorted(r["id"] for r in rows if r.get("enabled") is False)


def saved_sources(data: Path) -> tuple:
    """(saved, absent): the index's sources that have a file in the copy, and those that do not.

    An absent one is not a refusal: scripts/save_offline_data.py skips a source the live site could
    not hand over (one missing source must not lose the rest) and the app says, per source, how old
    its copy is or that it has none. It is PRINTED, so whoever cuts the release reads it.
    """
    rows = json.loads((data / "index.json").read_text(encoding="utf-8")).get("snapshots") or {}
    saved = sorted(k for k in rows if (data / f"{k}.json").is_file())
    return saved, sorted(k for k in rows if k not in saved)


def verify(zip_path: Path, name: str) -> None:
    """Unpack what was built and hold it to what it promises."""
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(zip_path) as z:
            bad = z.testzip()
            if bad:
                raise Refused(f"the zip is damaged at {bad}")
            members = z.namelist()
            z.extractall(tmp)
        top = Path(tmp) / name
        if not top.is_dir() or any(not m.startswith(name + "/") for m in members):
            raise Refused(f"the zip does not unpack into one folder called {name}")
        for rel in PROMISED:
            if not (top / rel).is_file() or (top / rel).stat().st_size == 0:
                raise Refused(f"the zip has no {rel}")
        if any(Path(m).name == ".DS_Store" for m in members):
            raise Refused("a .DS_Store travelled in the zip")
        if not STAMPED.search((top / "site/sw.js").read_text(encoding="utf-8")):
            raise Refused("site/sw.js in the zip is not stamped with this build: the copy would not "
                          "start with the school's server switched off")
        index = json.loads((top / "site/data/v1/index.json").read_text(encoding="utf-8"))
        if index.get("schema") != 1 or not index.get("snapshots"):
            raise Refused("site/data/v1/index.json in the zip is not a schema 1 index with snapshots")
        manifest = json.loads((top / "site/manifest.webmanifest").read_text(encoding="utf-8"))
        if manifest.get("start_url") != "./" or not manifest.get("icons"):
            raise Refused("site/manifest.webmanifest in the zip does not start at ./ with icons")
        html = (top / "site/index.html").read_text(encoding="utf-8")
        if "<canvas" not in html or "js/main.js" not in html:
            raise Refused("site/index.html in the zip is not the app's page")


def build(version: str, root: Path, out: Path, day: str | None = None, quiet: bool = False) -> Path:
    if not VERSION.match(version):
        raise Refused(f"'{version}' is not MAJOR.MINOR.PATCH (docs/RELEASING.md)")
    check_tree(root)
    name = f"space-radar-{version}"
    top = out / name
    if top.exists():
        shutil.rmtree(top)
    (top / "docs").mkdir(parents=True)
    (top / "scripts").mkdir()
    shutil.copytree(root / "site", top / "site", ignore=shutil.ignore_patterns(".DS_Store"))
    for rel in BESIDE:
        shutil.copy2(root / rel, top / rel)
    day = day or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    (top / "START-HERE.txt").write_text(start_here(version, day), encoding="utf-8")
    # The worker in the zip is stamped with this build (scripts/stamp_sw.py): after one visit the
    # copy starts even when the school's server is switched off.
    done = subprocess.run([sys.executable, str(HERE / "stamp_sw.py"), "--site", str(top / "site")],
                          capture_output=True, text=True)
    if done.returncode != 0:
        raise Refused(f"scripts/stamp_sw.py failed: {(done.stderr or done.stdout).strip()[-400:]}")
    zip_path = out / f"{name}.zip"
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for f in sorted(top.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(out).as_posix())
    try:
        verify(zip_path, name)
    except Refused:
        zip_path.unlink()  # a zip that failed its own check is not left where somebody could ship it
        raise
    digest = hashlib.sha256(zip_path.read_bytes()).hexdigest()
    (out / f"{name}.zip.sha256").write_text(f"{digest}  {name}.zip\n", encoding="utf-8")
    saved, absent = saved_sources(top / "site/data/v1")
    if not quiet:
        print(f"saved data: {len(saved)} sources" + (f"; NOT in the copy (the app will say so): {', '.join(absent)}" if absent else ""))
        print(f"{zip_path} ({zip_path.stat().st_size} B), sha256 {digest}; unpacked and checked: "
              f"{len(PROMISED)} promised files, a stamped worker, the data's index and the manifest")
    return zip_path


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", required=True)
    ap.add_argument("--root", type=Path, default=HERE.parent, help="the checkout (default: this one)")
    ap.add_argument("--out", type=Path, default=None, help="where to build (default: <root>/dist)")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    out = args.out or args.root / "dist"
    out.mkdir(parents=True, exist_ok=True)
    try:
        build(args.version, args.root.resolve(), out.resolve(), quiet=args.quiet)
    except Refused as err:
        print(f"build_release: REFUSED: {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
