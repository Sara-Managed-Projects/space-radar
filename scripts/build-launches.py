#!/usr/bin/env python3
"""The launch archive's bundled copy, site/data/launches.json, from GCAT (forge #551).

    python3 scripts/build-launches.py --launch path/to/launch.tsv --sites path/to/sites.tsv
    python3 scripts/build-launches.py --pull [--keep DIR]
    python3 scripts/build-launches.py --check          stdlib only, no network: the files are whole

WHAT. Every orbital launch attempt since Sputnik, as Jonathan McDowell's General Catalog of Artificial Space Objects (GCAT)
lists it: its launch list (tsv/launch/launch.tsv) cut to the rows whose LaunchCode starts with O, and its site table
(tsv/tables/sites.tsv) for where each site is. The cut is harvest/parsers/gcat_launch.py pack(), the same function the
harvester runs on its weekly copy, so the bundled file and /data/v1/gcat-launches.json have one shape.

TWO FILES.
  harvest/gcat_sites.json   GCAT's sites that orbital launches use, and every other site GCAT types LS (a launch site),
                            so a new pad at a known site joins without a rebuild: code -> [short name, latitude,
                            longitude, GCAT's state code, the ISO 3166 code the page names the country by]
  site/data/launches.json   the archive itself (harvest/parsers/gcat_launch.py says what each column is)

THE LICENCE. GCAT "is released under the Creative Commons CC-BY licence. You are free to use the data in GCAT as long as you
include a citation to it" (https://planet4589.org/space/gcat/, read 2026-11-24). The citation is in both files, on the
page under the table, on /launches/ and in CREDITS.md.

THE STATE CODES are GCAT's (its orgs table), not ISO: the page needs a country's name in the visitor's language
(Intl.DisplayNames), so each is mapped once, here, to the ISO code of the same place. SU (the Soviet Union) has no ISO code
and keeps its own; the page names it from its copy. GCAT's code stays beside the mapped one.

INCREMENTAL. The harvester's row `gcat-launches` (registry/sources.yaml) fetches launch.tsv weekly with its ETag and saves
the same cut as data/v1/gcat-launches.json; the page reads that first and this bundled copy only when there is none. Run
this script with --pull when GCAT adds a launch site (the page says "no place for this site" until then) or to move the
bundled copy forward.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from harvest.parsers import gcat_launch  # noqa: E402

OUT = ROOT / "site" / "data" / "launches.json"
SITES_OUT = ROOT / "harvest" / "gcat_sites.json"
BASE = "https://planet4589.org/space/gcat/tsv/"
LAUNCH_URL = BASE + "launch/launch.tsv"
SITES_URL = BASE + "tables/sites.tsv"
UA = "space-radar-build (+https://www.spaceradar.ai)"
# GCAT state code -> ISO 3166-1 alpha-2 of the same place, where the two differ. A two-letter code not here is already ISO.
STATE_ISO = {"SU": "SU", "J": "JP", "N": "NO", "UK": "GB", "GUF": "GF", "TTPI": "MH", "ESCN": "ES", "I": "IT", "F": "FR",
             "D": "DE", "E": "ES", "S": "SE", "CDN": "CA", "AUS": "AU", "A": "AT"}
MAX_BYTES = 650_000   # registry/budgets.yaml launch_archive_bytes


def iso_of(state: str) -> str:
    if state in STATE_ISO:
        return STATE_ISO[state]
    return state if len(state) == 2 and state.isalpha() else ""


def read_tsv(text: str) -> list[dict]:
    lines = text.lstrip("﻿").split("\n")
    hdr = [h.strip() for h in lines[0].lstrip("#").split("\t")]
    return [dict(zip(hdr, [c.strip() for c in ln.split("\t")])) for ln in lines[1:] if ln.strip() and not ln.startswith("#")]


def site_table(sites_text: str, launch_text: str) -> dict:
    used = {r["Launch_Site"].rstrip("?") for r in gcat_launch.orbital(launch_text)}
    table = {}
    for s in read_tsv(sites_text):
        code = s.get("Site", "")
        if not code or (code not in used and s.get("Type") != "LS"):
            continue
        try:
            lat, lon = float(s["Latitude"]), float(s["Longitude"])
        except (KeyError, ValueError):
            continue
        state = s.get("StateCode", "-")
        table[code] = [s.get("ShortName") or s.get("Name") or code, round(lat, 4), round(lon, 4), state, iso_of(state)]
    missing = sorted(used - set(table))
    upd = None
    for ln in sites_text.split("\n")[:5]:
        m = gcat_launch._UPDATED.match(ln)
        if m and m.group(2) in gcat_launch._MONTHS:
            upd = f"{m.group(1)}-{gcat_launch._MONTHS[m.group(2)]:02d}-{int(m.group(3)):02d}"
    return {
        "about": "GCAT's launch sites (tsv/tables/sites.tsv) that orbital launches use, and every other site typed LS; "
                 "written by scripts/build-launches.py",
        "source": SITES_URL,
        "licence": gcat_launch.LICENCE,
        "citation": gcat_launch.CITATION,
        "updated": upd,
        "cols": ["name", "lat", "lon", "state", "cc"],
        "missing": missing,
        "sites": {k: table[k] for k in sorted(table)},
    }


def get(url: str) -> str:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
        return r.read().decode("utf-8", "replace")


def sites_text_of(sites: dict) -> str:
    """One site a line, so a new site is a one-line diff."""
    head = {k: v for k, v in sites.items() if k != "sites"}
    lines = [json.dumps(head, ensure_ascii=False)[:-1] + ', "sites": {']
    rows = [f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}" for k, v in sites["sites"].items()]
    return "\n".join(lines + [",\n".join(rows), "}}"]) + "\n"


def dump(doc) -> str:
    return json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"


def check() -> list[str]:
    """The bundled file is whole: its columns, its count, every row's site resolves, dates in order of form, the size."""
    p = []
    doc = json.loads(OUT.read_text(encoding="utf-8"))
    sites = json.loads(SITES_OUT.read_text(encoding="utf-8"))
    if doc.get("cols") != gcat_launch.COLS:
        p.append(f"launches.json columns {doc.get('cols')} are not {gcat_launch.COLS}")
    if doc.get("count") != len(doc.get("rows", [])):
        p.append("launches.json count is not its number of rows")
    if doc.get("licence") != "CC BY 4.0" or "planet4589.org/space/gcat" not in (doc.get("citation") or ""):
        p.append("launches.json lost its licence or citation")
    for r in doc.get("rows", []):
        if r[3] not in doc["sites"]:
            p.append(f"{r[0]}: site {r[3]} has no place")
        if not r[1] or not str(r[1])[:4].isdigit():
            p.append(f"{r[0]}: no date")
        if not (0 <= r[2] < len(doc["veh"])) or not (0 <= r[6] < len(doc["ag"])):
            p.append(f"{r[0]}: a string index is out of its table")
    for k, s in doc.get("sites", {}).items():
        if sites["sites"].get(k) != s:
            p.append(f"site {k} differs from harvest/gcat_sites.json")
    size = OUT.stat().st_size
    if size > MAX_BYTES:
        p.append(f"launches.json is {size} B, over {MAX_BYTES} (registry/budgets.yaml launch_archive_bytes)")
    return p


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--launch")
    ap.add_argument("--sites")
    ap.add_argument("--pull", action="store_true")
    ap.add_argument("--keep")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args(argv)
    if a.check:
        probs = check()
        for x in probs:
            print("build-launches:", x, file=sys.stderr)
        if not probs:
            doc = json.loads(OUT.read_text(encoding="utf-8"))
            print(f"build-launches ok: {doc['count']} orbital launch attempts, GCAT of {doc['updated']}, "
                  f"{len(doc['sites'])} sites, {OUT.stat().st_size} B")
        return 1 if probs else 0
    if a.pull:
        launch_text, sites_text = get(LAUNCH_URL), get(SITES_URL)
        if a.keep:
            os.makedirs(a.keep, exist_ok=True)
            Path(a.keep, "launch.tsv").write_text(launch_text, encoding="utf-8")
            Path(a.keep, "sites.tsv").write_text(sites_text, encoding="utf-8")
    elif a.launch and a.sites:
        launch_text = Path(a.launch).read_text(encoding="utf-8")
        sites_text = Path(a.sites).read_text(encoding="utf-8")
    else:
        ap.error("give --launch and --sites, or --pull, or --check")
        return 2
    gcat_launch.validate(launch_text)
    sites = site_table(sites_text, launch_text)
    doc = gcat_launch.pack(launch_text, sites)
    SITES_OUT.write_text(sites_text_of(sites), encoding="utf-8")
    OUT.write_text(dump(doc), encoding="utf-8")
    print(f"build-launches: {doc['count']} orbital launch attempts (GCAT of {doc['updated']}), {len(doc['sites'])} sites, "
          f"{OUT.stat().st_size} B; sites with no place: {sites['missing'] or 'none'}")
    probs = check()
    for x in probs:
        print("build-launches:", x, file=sys.stderr)
    return 1 if probs else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
