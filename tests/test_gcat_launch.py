#!/usr/bin/env python3
"""The launch archive's data (forge #551): GCAT's launch list, cut by harvest/parsers/gcat_launch.py, and the bundled copy.

    python3 tests/test_gcat_launch.py

What it holds: the cut keeps the orbital attempts and nothing else, GCAT's dates are read to the precision given, the
outcome codes pass through as GCAT writes them, every site joins to a place, the bundled file is the same shape as the
harvester's copy, cites GCAT and its licence, holds 1957 as three attempts (Sputnik 1 and 2, Vanguard TV3) and stays under
its budget (registry/budgets.yaml launch_archive_bytes). Stdlib only, no network.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from harvest.parsers import gcat_launch  # noqa: E402

problems: list[str] = []


def check(ok, msg):
    if not ok:
        problems.append(msg)


fixture = (ROOT / "tests/fixtures/harvest/gcat_launch.txt").read_text(encoding="utf-8")
sites = gcat_launch.load_sites()

# --- the parser -------------------------------------------------------------------------------------------------------
gcat_launch.validate(fixture)
check(gcat_launch.count(fixture) == 10, f"the fixture holds 10 orbital attempts, counted {gcat_launch.count(fixture)}")
check(gcat_launch.updated(fixture) == "2026-11-23", f"GCAT's 'Updated' line is the file's day: {gcat_launch.updated(fixture)}")
check(gcat_launch.newest(fixture) == "2026-11-22T12:23:00Z", f"the newest orbital launch: {gcat_launch.newest(fixture)}")
for raw, want in [("1957 Oct  4 1928:34", "1957-10-04 19:28:34"), ("2026 Nov 20 1159", "2026-11-20 11:59"),
                  ("1960 Dec  1", "1960-12-01"), ("1962 Jan 26 2030?", "1962-01-26 20:30"), ("1963 Feb", "1963-02"),
                  ("nonsense", None)]:
    check(gcat_launch.utc(raw) == want, f"utc({raw!r}) is {want!r}, not {gcat_launch.utc(raw)!r}")
for bad in (42, "<html>", "Launch_Tag\tx\n"):
    try:
        gcat_launch.count(bad)
        problems.append(f"count() took a body that is not GCAT's launch list: {bad!r}")
    except ValueError:
        pass
packed = gcat_launch.pack(fixture, sites)
check(packed["cols"] == gcat_launch.COLS and packed["count"] == 10 == len(packed["rows"]), "the cut is ten rows in its columns")
tags = [r[0] for r in packed["rows"]]
want = [r["Launch_Tag"] for r in gcat_launch.rows(fixture) if r["LaunchCode"].startswith("O")]
check(tags == want and len(gcat_launch.rows(fixture)) == 17, f"the cut is exactly the O* rows of the 17, in order: {tags}")
check(all(r[7] and r[7][0] in "SFEAU" for r in packed["rows"]), "every outcome is GCAT's code without its O")
codes = {r[7] for r in packed["rows"]}
check({"S", "F", "E", "A"} <= codes and any(re.match(r"^[SF]\d\d$", c) for c in codes), f"the outcomes pass as written: {codes}")
check(all(r[3] in packed["sites"] for r in packed["rows"]), "every row's site joins to a place")

# --- one run of the harvester: the cut is what it saves (data/v1/gcat-launches.json), counted as the upstream sent it ----------
import tempfile  # noqa: E402
from harvest import fetch, registry  # noqa: E402
from harvest import snapshot as snap  # noqa: E402
from harvest.run import run  # noqa: E402

row = next(s for s in registry.load() if s.id == "gcat-launches")
check(row.parser == "gcat_launch" and row.refresh_seconds == 7 * 86400 and row.outputs == ("gcat-launches.json",), "the registry row: weekly, this parser")
with tempfile.TemporaryDirectory() as tmp:
    store = snap.DirStore(tmp)
    body = fixture.encode("utf-8")
    answer = lambda url, **_: fetch.Response(url=url, status=200, body=body, content_type="text/tab-separated-values", etag='"x"',
                                             last_modified=None, duration_ms=1)
    idx = run(store, [row], now=snap.parse_iso("2026-11-24T00:00:00Z"), fetcher=answer, log=lambda _l: None)
    e = idx["snapshots"]["gcat-launches"]
    saved = snap.read_snapshot(store, "gcat-launches")
    check(e["status"] == "ok" and e["items"] == 10, f"a run saves the cut: {e['status']} {e['items']} {e.get('last_error')}")
    check(saved and saved["body"]["cols"] == gcat_launch.COLS and saved["body"]["count"] == 10, "the saved body is the archive's own file, as the page reads it")
    check(saved and "Launch_Tag" not in json.dumps(saved["body"]) and "TTaylor" not in json.dumps(saved["body"]), "and none of the upstream's 33 columns or its suborbital rows")

# --- the bundled copy -------------------------------------------------------------------------------------------------
doc = json.loads((ROOT / "site/data/launches.json").read_text(encoding="utf-8"))
check(doc["licence"] == "CC BY 4.0" and doc["citation"].startswith("McDowell, Jonathan C., 2020. General Catalog"), "the bundled copy cites GCAT and its licence")
check(doc["cols"] == gcat_launch.COLS and doc["count"] == len(doc["rows"]) >= 7000, f"the bundled copy is whole: {doc['count']} rows")
y1957 = sorted((r[0], doc["veh"][r[2]]) for r in doc["rows"] if str(r[1]).startswith("1957"))
check(y1957 == [("1957 ALP", "Sputnik 8K71PS"), ("1957 BET", "Sputnik 8K71PS"), ("1957-F01", "Vanguard")],
      f"1957 is Sputnik 1, Sputnik 2 and Vanguard TV3: {y1957}")
check(all(r[3] in doc["sites"] and doc["sites"][r[3]][1] is not None for r in doc["rows"]), "every bundled row's site has a place")
check(all(-90 <= s[1] <= 90 and -180 <= s[2] <= 180 for s in doc["sites"].values()), "every site's place is on the Earth")
check(doc["sites"]["NIIP-5"][0] == "Baykonur" and doc["sites"]["CC"][4] == "US" and doc["sites"]["CSG"][4] == "GF", "the sites join by GCAT's code")
budgets = (ROOT / "registry/budgets.yaml").read_text(encoding="utf-8")
m = re.search(r"\{id: launch_archive_bytes, value: (\d+)", budgets)
size = (ROOT / "site/data/launches.json").stat().st_size
check(m and size <= int(m.group(1)), f"site/data/launches.json is {size} B, held to registry/budgets.yaml launch_archive_bytes")
# the harvester and the build script are one code path: the bundled copy re-packs from its own rows' shape
r = subprocess.run([sys.executable, str(ROOT / "scripts/build-launches.py"), "--check"], capture_output=True, text=True)
check(r.returncode == 0, f"scripts/build-launches.py --check: {r.stderr.strip()[:300]}")

if problems:
    print(f"gcat launch FAILED ({len(problems)}):\n  " + "\n  ".join(problems))
    sys.exit(1)
print(f"gcat launch ok: the cut keeps the orbital attempts, reads GCAT's dates as far as they go, passes its outcome codes, joins "
      f"every site; the bundled copy has {doc['count']} attempts of GCAT {doc['updated']}, 1957 is three, cited CC BY 4.0, {size} B")
