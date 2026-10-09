#!/usr/bin/env python3
"""A publisher who does not let its data be passed on is not copied, anywhere; and JPL's APIs are
never called from a visitor's browser.

    python3 tests/test_not_ours_to_copy.py

WHY (2026-10-09, the performance research's sources table; internal #370).
  * ESA's terms: "ESA does not grant the right to resell or redistribute any information,
    documents, images or material from its website". The harvester saved ESA NEOCC's list of close
    approaches and the site served it as /data/v1/esa-neocc-close.json. No card read it. The source
    is switched off in registry/sources.yaml, and `enabled: false` has to mean the same thing in
    every place a copy could be made, because the next refresh would otherwise upload the old
    file again from the work folder:
      1. the harvester does not fetch it;
      2. scripts/refresh-snapshots.sh does not publish its file or its manifest row;
      3. scripts/save_offline_data.py does not save it, and removes one an older run saved;
      4. scripts/build_release.py refuses a tree that still holds it;
      5. nothing in site/js asks ESA for it.
  * JPL's API terms: "You may not embed these APIs in your website (per NASA CORS policy)." Every
    JPL row is read from our saved copy only: `browser: false` in the registry and in
    data/sources.js, and the browser's one live route is taken only for `browser: true`.
"""
from __future__ import annotations

import http.server
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
problems: list[str] = []


def check(ok, what: str) -> None:
    if not ok:
        problems.append(what)
        print("FAIL: " + what)


registry = yaml.safe_load((ROOT / "registry/sources.yaml").read_text(encoding="utf-8"))["sources"]
off = sorted(r["id"] for r in registry if r.get("enabled") is False)
check(off == ["esa-neocc-close", "space-track-tip"], f"the sources switched off in the registry are ESA's list and Space-Track's ({off})")
text = (ROOT / "registry/sources.yaml").read_text(encoding="utf-8")
check("ESA does not grant the right to resell or redistribute" in text, "the registry row quotes the sentence that switched it off")

# --- 1. the harvester ------------------------------------------------------------------------
gen = subprocess.run([sys.executable, "scripts/gen_sources_json.py", "--check"], cwd=ROOT, capture_output=True, text=True)
check(gen.returncode == 0, f"harvest/sources.json is the registry's mirror ({gen.stdout}{gen.stderr})")
from harvest import registry as hreg  # noqa: E402

loaded = {s.id: s for s in hreg.load(ROOT / "harvest/sources.json")} if hasattr(hreg, "load") else {}
if loaded:
    check(all(loaded[i].enabled is False for i in off) and loaded["jpl-cad"].enabled is True, "the harvester reads them as disabled (harvest/run.py skips a disabled source)")
check("if not source.enabled:" in (ROOT / "harvest/run.py").read_text(encoding="utf-8"), "harvest/run.py skips a disabled source before it fetches")

FAKE_AWS = r"""#!/bin/bash
case "$1 $2" in
  "s3 sync") cp "$3"/*.json "$OUT"/ 2>/dev/null; exit 0 ;;
  "s3 cp") cp "$3" "$OUT"/; exit 0 ;;
  *) exit 0 ;;
esac
"""
stamp = "2026-10-08T07:29:43Z"
with tempfile.TemporaryDirectory() as tmp_s:
    tmp = Path(tmp_s)
    # --- 2. the publish ----------------------------------------------------------------------
    work, out, bin_ = tmp / "work", tmp / "out", tmp / "bin"
    for p in (work, out, bin_):
        p.mkdir()
    (bin_ / "aws").write_text(FAKE_AWS, encoding="utf-8")
    (bin_ / "aws").chmod((bin_ / "aws").stat().st_mode | stat.S_IXUSR)
    # The work folder as an earlier harvest left it: ESA's file is there, with a good row.
    rows = {
        "esa-neocc-close": [{"object": "2026 AB", "date": "2026-10-10"}],
        "jpl-cad": {"fields": ["des"], "data": [["2026 AB"]]},
        "celestrak-stations": [{"OBJECT_NAME": "ISS (ZARYA)", "NORAD_CAT_ID": 25544}],
    }
    index = {"schema": 1, "snapshots": {}}
    for sid, body in rows.items():
        index["snapshots"][sid] = {"status": "ok", "fetched_at": stamp, "valid_until": stamp, "items": 1}
        (work / f"{sid}.json").write_text(json.dumps({"schema": 1, "source": sid, "fetched_at": stamp, "body": body}))
    (work / "index.json").write_text(json.dumps(index))
    env = {**os.environ, "PATH": f"{bin_}{os.pathsep}{os.environ['PATH']}", "OUT": str(out)}
    proc = subprocess.run(["bash", "scripts/refresh-snapshots.sh", f"--work={work}", "--no-harvest", "--bucket=test-bucket"],
                          cwd=ROOT, env=env, capture_output=True, text=True, timeout=120)
    check(proc.returncode == 0, f"scripts/refresh-snapshots.sh runs ({proc.stdout[-300:]}{proc.stderr[-300:]})")
    uploaded = sorted(p.name for p in out.iterdir())
    snaps = json.loads((out / "index.json").read_text())["snapshots"] if (out / "index.json").exists() else {}
    esa_row = snaps.get("esa-neocc-close", {})
    check("esa-neocc-close.json" not in uploaded and esa_row.get("status") == "skipped" and "fetched_at" not in esa_row and "items" not in esa_row,
          f"a file an earlier harvest left in the work folder is NOT published once its source is switched off, and its manifest row says skipped with no stamps (uploaded {uploaded}; row {esa_row})")
    check("jpl-cad.json" in uploaded and "jpl-cad" in snaps and "celestrak-stations.json" in uploaded, "and everything else is published as before")
    check("esa-neocc-close: switched off in registry/sources.yaml; not published" in proc.stdout, "the script says what it left out and why")

    # --- 3. the offline copy -----------------------------------------------------------------
    served = tmp / "served" / "data" / "v1"
    served.mkdir(parents=True)
    for sid, body in rows.items():
        (served / f"{sid}.json").write_text(json.dumps({"schema": 1, "source": sid, "fetched_at": stamp, "body": body}))
    (served / "index.json").write_text(json.dumps(index))  # a mirror that still lists ESA's file

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=str(tmp / "served"), **k)

        def log_message(self, *a):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Quiet)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    site = tmp / "site"
    (site / "data" / "v1").mkdir(parents=True)
    (site / "index.html").write_text("<!doctype html>")
    (site / "data/v1/esa-neocc-close.json").write_text("{}")  # saved by an older run of the script
    save = subprocess.run([sys.executable, "scripts/save_offline_data.py", f"--site={site}", f"--from=http://127.0.0.1:{server.server_address[1]}"],
                          cwd=ROOT, capture_output=True, text=True, timeout=120)
    server.shutdown()
    saved = sorted(p.name for p in (site / "data/v1").iterdir())
    saved_index = json.loads((site / "data/v1/index.json").read_text())["snapshots"]
    check(save.returncode == 0 and saved == ["celestrak-stations.json", "index.json", "jpl-cad.json"],
          f"scripts/save_offline_data.py saves everything but ESA's list, and removes the copy an older run saved ({saved}; {save.stderr[-200:]})")
    check(saved_index.get("esa-neocc-close", {}).get("status") == "skipped" and "fetched_at" not in saved_index.get("esa-neocc-close", {}) and saved_index["jpl-cad"].get("fetched_at") == stamp,
          f"and the manifest it saves does not claim the file it did not save ({saved_index.get('esa-neocc-close')})")
    import save_offline_data  # noqa: E402
    check(sorted(save_offline_data.NOT_OURS_TO_COPY) == off, f"its list is the registry's (it travels alone in the zip, so it is written out): {save_offline_data.NOT_OURS_TO_COPY}")

    # --- 4. the release zip ------------------------------------------------------------------
    import build_release  # noqa: E402
    root = tmp / "root"
    (root / "site/data/v1").mkdir(parents=True)
    (root / "site/data/v1/celestrak-stations.json").write_text("{}")

    def refused(index_rows: dict, files: tuple = ()) -> str:
        (root / "site/data/v1/index.json").write_text(json.dumps({"schema": 1, "snapshots": index_rows}))
        for f in files:
            (root / "site/data/v1" / f).write_text("{}")
        try:
            build_release.check_tree(root)
        except build_release.Refused as why:
            return str(why)
        finally:
            for f in files:
                (root / "site/data/v1" / f).unlink()
        return ""

    good = {"celestrak-stations": {"status": "ok", "fetched_at": stamp}}
    check("esa-neocc-close" in refused({**good, "esa-neocc-close": {"status": "ok", "fetched_at": stamp}}), "a release is refused while the saved copy's manifest lists ESA's list as data")
    why = refused({**good, "space-track-tip": {"status": "skipped"}, "esa-neocc-close": {"status": "skipped"}})
    check("esa-neocc-close" not in why and "space-track-tip" not in why, "a `skipped` row with no file is a name, not a copy: it does not stop a release")
    check("esa-neocc-close" in refused(good, ("esa-neocc-close.json",)), "and while the file is in the folder, named or not")
    why = refused(good)
    check("esa-neocc-close" not in why and "not in the tree" in why, f"a clean saved copy gets past that check (it stops later, at a file this stub has not: {why[:80]})")
    check(build_release.not_ours_to_copy() == off, "build_release.py reads the same list from the registry's mirror")

# --- 5. nothing in the browser asks ESA --------------------------------------------------------
js = {p: p.read_text(encoding="utf-8") for p in (ROOT / "site/js").rglob("*.js")}
html = (ROOT / "site/index.html").read_text(encoding="utf-8")
hits = [str(p.relative_to(ROOT)) for p, t in js.items() if re.search(r"neo\.ssa\.esa\.int|esa-neocc|close-approaches-esa", t)]
check(not hits and "neo.ssa.esa.int" not in html, f"no module names ESA's portal or its saved file ({hits})")
copy = js[ROOT / "site/js/data/sources.js"]
check("Close approaches: NASA/JPL CNEOS" in copy or "CNEOS" in copy, "the close approaches the app draws are credited to JPL's CNEOS in the Sources list")
credits = (ROOT / "CREDITS.md").read_text(encoding="utf-8")
check("**Switched off on 2026-10-09**" in credits and "ESA does not grant the right to resell or redistribute" in credits, "CREDITS.md says ESA's list is no longer copied, and quotes why")
check("CNEOS; ESA NEOCC" not in credits, "and its summary no longer lists ESA NEOCC as a source of what is drawn")
check("ESA%20NEOCC" not in (ROOT / "README.md").read_text(encoding="utf-8"), "the README's badge for a source the app does not use is gone")

# --- JPL: the saved copy only, never from a visitor's browser -----------------------------------
jpl_rows = [r for r in registry if "jpl.nasa.gov" in r["url"]]
check(len(jpl_rows) >= 4 and all(r.get("browser") is False for r in jpl_rows), f"every JPL row of the registry is `browser: false` ({[(r['id'], r.get('browser')) for r in jpl_rows]})")
blocks = re.findall(r"\n  '?([\w-]+)'?: \{\n(.*?)\n  \},", copy, re.S)
jpl_js = [(name, body) for name, body in blocks if re.search(r"url:\s*'https://[\w.-]*jpl\.nasa\.gov", body)]
check(len(jpl_js) >= 4 and all(re.search(r"\n\s+browser: false,", body) and not re.search(r"\n\s+browser: true,", body) for _, body in jpl_js),
      f"every JPL row of data/sources.js is `browser: false` ({[n for n, _ in jpl_js]})")
code_only = "\n".join(l for l in copy.split("\n") if not l.lstrip().startswith(("//", "*", "/*")))
calls = [m.start() for m in re.finditer(r"fetchLive\(", code_only)]
check(len(calls) == 3, f"fetchLive() is defined once and called from two places ({len(calls)})")
check(re.search(r"\} else if \(src\.browser === true\) \{\n[^\n]*\n\s+next = await fetchLive\(src, prev, attemptAt\);", copy) is not None,
      "the live route is taken only for a `browser: true` source")
check(re.search(r"behind = src\.browser === true && ", copy) is not None, "and a publisher is asked behind a saved copy only for a `browser: true` source")
other = [str(p.relative_to(ROOT)) for p, t in js.items() if p.name != "sources.js"
         and re.search(r"fetch\([^)]*jpl\.nasa\.gov|['\"`]https?://[\w.-]*jpl\.nasa\.gov[^'\"`]*['\"`]", "\n".join(l for l in t.split("\n") if not l.lstrip().startswith(("//", "*", "/*"))))]
check(not other, f"no other module holds a JPL address as a string it could fetch ({other})")

if problems:
    print(f"\nnot ours to copy: {len(problems)} problem(s)")
    sys.exit(1)
print(f"not ours to copy ok: {', '.join(off)} are switched off and not fetched, published, saved or zipped; "
      f"nothing in site/js asks ESA; all {len(jpl_rows)} JPL rows are read from the saved copy only")
