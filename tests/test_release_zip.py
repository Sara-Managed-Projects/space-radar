#!/usr/bin/env python3
"""The release zip builds, unpacks and holds what it promises -- on every pull request, not on the
day of a release (public #471).

    python3 tests/test_release_zip.py

scripts/build_release.py is what .github/workflows/release.yml runs on a tag. This runs the same
file against a small checkout made here (the real site/ is 86 MB and its saved data is gitignored):
the app's page, the real service worker and manifest, two modules, and a saved copy with the
stations. Held:

  1. The zip is one folder, `space-radar-<version>/`, with the app, the saved data, LICENSE,
     CREDITS.md, the changelog, the run-it-offline guide, the script that refreshes the data, and
     START-HERE.txt naming the version and the day the data was saved.
  2. The service worker inside is STAMPED with the build and lists the app's files; the tree the
     zip was built from is not touched (a stamp in git would conflict in every pull request).
  3. The .sha256 beside it is the zip's.
  4. It REFUSES, non-zero and with the reason: no saved data, saved data without the stations, a
     version that is not MAJOR.MINOR.PATCH, a missing LICENSE. Each is the zip a school could not use.
  5. Its own check catches a zip that lost a promised file (verify() on a zip with one removed).
  6. The real tree has every file the zip promises beside site/, and release.yml builds with this
     script and still serves the unpacked zip before it publishes.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_release  # noqa: E402

problems: list = []


def check(ok: bool, msg: str) -> None:
    if not ok:
        problems.append(msg)


def make_checkout(tmp: Path) -> Path:
    root = tmp / "checkout"
    site = root / "site"
    (site / "js").mkdir(parents=True)
    (site / "css").mkdir()
    (site / "data/v1").mkdir(parents=True)
    (site / "images/icons").mkdir(parents=True)
    (root / "docs").mkdir()
    (root / "scripts").mkdir()
    (site / "index.html").write_text('<!doctype html><canvas id="stage"></canvas><script type="module" src="js/main.js"></script>\n')
    (site / "js/main.js").write_text("export const boot = () => 1;\n")
    (site / "css/site.css").write_text("body { margin: 0; }\n")
    shutil.copy2(ROOT / "site/sw.js", site / "sw.js")
    shutil.copy2(ROOT / "site/manifest.webmanifest", site / "manifest.webmanifest")
    (site / "images/icons/icon-192.png").write_bytes(b"\x89PNG\r\n\x1a\n")
    (site / ".DS_Store").write_bytes(b"x")
    (site / "js/.DS_Store").write_bytes(b"x")
    (site / "data/v1/index.json").write_text(json.dumps({"schema": 1, "snapshots": {"celestrak-stations": {"fetched_at": "2026-10-07T00:00:00Z"}}}))
    (site / "data/v1/celestrak-stations.json").write_text(json.dumps({"schema": 1, "body": "ISS (ZARYA)\n1 25544U\n2 25544\n"}))
    for rel in ("LICENSE", "CREDITS.md", "CHANGELOG.md", "docs/RUN_LOCALLY.md", "scripts/save_offline_data.py"):
        shutil.copy2(ROOT / rel, root / rel)
    return root


def run(root: Path, out: Path, version: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(ROOT / "scripts/build_release.py"), "--version", version, "--root", str(root), "--out", str(out)],
                          capture_output=True, text=True)


with tempfile.TemporaryDirectory() as t:
    tmp = Path(t)
    root = make_checkout(tmp)
    out = tmp / "dist"
    before = (root / "site/sw.js").read_text()

    # --- 1 to 3: it builds ------------------------------------------------------------------------
    done = run(root, out, "1.2.3")
    check(done.returncode == 0, f"build_release.py builds a zip from a good checkout: {done.stderr.strip()[-300:]}")
    name = "space-radar-1.2.3"
    z = out / f"{name}.zip"
    check(z.is_file(), "dist/space-radar-1.2.3.zip exists")
    if z.is_file():
        with zipfile.ZipFile(z) as zf:
            names = zf.namelist()
            read = lambda rel: zf.read(f"{name}/{rel}").decode("utf-8")  # noqa: E731
            check(all(n.startswith(name + "/") for n in names), "everything in the zip is under one folder named for the version")
            for rel in build_release.PROMISED:
                check(f"{name}/{rel}" in names, f"the zip holds {rel}")
            check(not any(n.endswith(".DS_Store") for n in names), "no .DS_Store travels")
            start = read("START-HERE.txt")
            check("Space Radar 1.2.3" in start and "http.server 8177 --directory site" in start and re.search(r"saved on \d{4}-\d\d-\d\d", start) is not None,
                  "START-HERE.txt names the version, the one command and the day the data was saved")
            sw = read("site/sw.js")
            m = re.search(r"^const BUILD = (\{.*\});$", sw, re.M)
            build = json.loads(m.group(1)) if m else {}
            check(bool(m) and re.fullmatch(r"[0-9a-f]{16}", str(build.get("version", ""))) is not None, "the worker in the zip is stamped with a build")
            shell = build.get("shell") or {}
            listed = set(shell) if isinstance(shell, dict) else {(e[0] if isinstance(e, list) else e.get("url", e)) if not isinstance(e, str) else e for e in shell}
            check(any("js/main.js" in str(x) for x in listed) and any("index.html" in str(x) or str(x) in ("./", "") for x in listed), f"and lists the app's files ({sorted(map(str, listed))[:6]})")
            check(not any("data/v1" in str(x) for x in listed), "but not the data: that is kept as it is used")
        check((root / "site/sw.js").read_text() == before, "the checkout's own sw.js is not stamped")
        sha = (out / f"{name}.zip.sha256").read_text().split()
        check(len(sha) == 2 and sha[0] == hashlib.sha256(z.read_bytes()).hexdigest() and sha[1] == f"{name}.zip", "the .sha256 beside the zip is the zip's")
        check(run(root, out, "1.2.3").returncode == 0, "building again over the last build works")

    # --- 4: it refuses ----------------------------------------------------------------------------
    def refused(why: str, needle: str, change, version: str = "1.0.0") -> None:
        other = tmp / ("c-" + re.sub(r"\W+", "-", why))
        shutil.copytree(root, other)
        change(other)
        d = run(other, tmp / ("d-" + re.sub(r"\W+", "-", why)), version)
        check(d.returncode != 0 and "REFUSED" in d.stderr and needle in d.stderr, f"refuses {why}, saying so (exit {d.returncode}: {d.stderr.strip()[-160:]})")
        check(not list((tmp / ("d-" + re.sub(r"\W+", "-", why))).glob("*.zip")), f"and leaves no zip behind for {why}")

    refused("a checkout with no saved data", "save_offline_data.py", lambda r: shutil.rmtree(r / "site/data/v1"))
    refused("saved data without the stations", "stations", lambda r: (r / "site/data/v1/celestrak-stations.json").unlink())
    refused("an empty stations file", "stations", lambda r: (r / "site/data/v1/celestrak-stations.json").write_text(""))
    refused("an index that is not schema 1", "schema 1", lambda r: (r / "site/data/v1/index.json").write_text('{"schema": 2, "snapshots": {}}'))
    refused("a version that is not MAJOR.MINOR.PATCH", "MAJOR.MINOR.PATCH", lambda r: None, version="next")
    refused("a version with a path in it", "MAJOR.MINOR.PATCH", lambda r: None, version="1.0.0/../x")
    refused("a checkout with no LICENSE", "LICENSE", lambda r: (r / "LICENSE").unlink())
    # A source the live site could not hand over is not a refusal (save_offline_data.py skips it and
    # the app says so per source): the zip builds, and the build SAYS which one is absent.
    partial = tmp / "c-partial"
    shutil.copytree(root, partial)
    (partial / "site/data/v1/index.json").write_text(json.dumps({"schema": 1, "snapshots": {"celestrak-stations": {}, "space-track-tip": {}}}))
    d = run(partial, tmp / "d-partial", "1.0.0")
    check(d.returncode == 0 and "NOT in the copy" in d.stdout and "space-track-tip" in d.stdout, f"a copy that lacks one other source builds and names it ({d.returncode}: {d.stdout.strip()[:160]} {d.stderr.strip()[-160:]})")

    # --- 5: its own check sees a zip that lost something --------------------------------------------
    if z.is_file():
        for lost in ("site/data/v1/index.json", "docs/RUN_LOCALLY.md", "START-HERE.txt"):
            cut = tmp / "cut.zip"
            with zipfile.ZipFile(z) as src, zipfile.ZipFile(cut, "w", zipfile.ZIP_DEFLATED) as dst:
                for item in src.infolist():
                    if item.filename != f"{name}/{lost}":
                        dst.writestr(item, src.read(item.filename))
            try:
                build_release.verify(cut, name)
                check(False, f"verify() passes a zip without {lost}")
            except build_release.Refused as err:
                check(lost in str(err), f"verify() names the missing {lost}: {err}")
        unstamped = tmp / "unstamped.zip"
        with zipfile.ZipFile(z) as src, zipfile.ZipFile(unstamped, "w", zipfile.ZIP_DEFLATED) as dst:
            for item in src.infolist():
                dst.writestr(item, before if item.filename == f"{name}/site/sw.js" else src.read(item.filename))
        try:
            build_release.verify(unstamped, name)
            check(False, "verify() passes a zip whose worker is not stamped")
        except build_release.Refused as err:
            check("stamped" in str(err), f"verify() says the worker is not stamped: {err}")

# --- 6: the real tree and the workflow --------------------------------------------------------------
for rel in build_release.BESIDE + ("site/index.html", "site/sw.js", "site/manifest.webmanifest", "site/js/main.js"):
    check((ROOT / rel).is_file(), f"{rel} is in the repository: the zip promises it")
wf = (ROOT / ".github/workflows/release.yml").read_text()
check('python3 scripts/build_release.py --version "$VERSION" --out dist' in wf, "release.yml builds the zip with scripts/build_release.py")
check("python3 scripts/save_offline_data.py" in wf and wf.index("save_offline_data.py") < wf.index("build_release.py"), "after saving the data")
check("The zip serves" in wf and wf.index("The zip serves") < wf.index("Publish the release"), "and serves the unpacked zip before it publishes")
check(re.search(r"Publish the release\n\s+if: \$\{\{ github\.event_name == 'push' \}\}", wf) is not None, "a dry run (workflow_dispatch) never publishes")
check("zip -qr" not in wf, "release.yml no longer builds the zip in shell of its own")
run_locally = (ROOT / "docs/RUN_LOCALLY.md").read_text()
check("8177" in run_locally, "docs/RUN_LOCALLY.md and START-HERE.txt name the same port")

if problems:
    print("release zip FAILED:\n  " + "\n  ".join(problems), file=sys.stderr)
    sys.exit(1)
print(f"release zip ok: scripts/build_release.py builds space-radar-<version>.zip from a small checkout with {len(build_release.PROMISED)} promised files, "
      "a stamped worker and its sha256; refuses 7 checkouts a school could not use; its own check names a lost file; release.yml builds with it")
