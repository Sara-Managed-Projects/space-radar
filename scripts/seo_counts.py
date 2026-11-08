#!/usr/bin/env python3
"""The satellite counts the crawlable pages fall back on, written from the harvester's index (forge #89).

The /starlink/ and /satellites/ pages state how many objects the saved element sets hold.
scripts/seo_pages.py satellite_counts() reads them from the harvester's data/v1/index.json when
the build is given it (scripts/deploy.sh fetches it), and from registry/seo-facts.yaml when it is
not. Until 2026-11-08 that fallback was typed in by hand (16,587 and 11,129 "as of" 2026-09-22),
weeks behind the snapshot. Now this script writes it, from the same two index rows the deploy
reads, with the day they were fetched; nobody types a count.

    python3 scripts/seo_counts.py --index FILE_OR_URL --write   rewrite the block from an index
    python3 scripts/seo_counts.py --check                       the block is a written one, and young

--check (no network; tests/test_seo_counts.py runs it) refuses a block the script did not write
(its `source:` line says so), counts that are not positive whole numbers, and a day more than
MAX_AGE_DAYS before today, naming the command to run. The weekly data job (forge #93) runs
--write; this check is what goes red when it has not.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FACTS = ROOT / "registry" / "seo-facts.yaml"
LIVE_INDEX = "https://www.spaceradar.ai/data/v1/index.json"
ROWS = ("celestrak-active", "celestrak-supplemental-starlink")
# A month and a half: the weekly job has missed five runs before this goes red.
MAX_AGE_DAYS = 45
WRITTEN = "written by scripts/seo_counts.py from the harvester's index"


def counts_from_index(index: dict) -> dict:
    """{active, starlink, as_of} from the index's two rows; SystemExit naming what is missing."""
    snaps = (index or {}).get("snapshots") or {}
    rows = [snaps.get(r) or {} for r in ROWS]
    for rid, row in zip(ROWS, rows):
        if not (isinstance(row.get("items"), int) and row["items"] > 0 and row.get("fetched_at")):
            raise SystemExit(f"seo_counts: the index has no item count and day for {rid}")
    return {"active": rows[0]["items"], "starlink": rows[1]["items"],
            "as_of": min(r["fetched_at"] for r in rows)[:10]}


def block_text(c: dict) -> str:
    return ("satellite_counts:\n"
            f"  as_of: {c['as_of']}\n"
            f"  source: \"CelesTrak's active catalogue and Starlink supplemental file as the harvester saved them, "
            f"{WRITTEN} of {c['as_of']}\"\n"
            f"  active_objects: {c['active']}\n"
            f"  starlink_objects: {c['starlink']}\n")


BLOCK = re.compile(r"^satellite_counts:\n(?:  .*\n)+", re.M)


def write(text: str, c: dict) -> str:
    if not BLOCK.search(text):
        raise SystemExit("seo_counts: registry/seo-facts.yaml has no satellite_counts block to rewrite")
    return BLOCK.sub(lambda _m: block_text(c), text, count=1)


def problems(text: str, today: dt.date) -> list:
    import yaml
    facts = (yaml.safe_load(text) or {}).get("satellite_counts") or {}
    out = []
    run = f"run: python3 scripts/seo_counts.py --index {LIVE_INDEX} --write"
    if WRITTEN not in str(facts.get("source") or ""):
        out.append(f"registry/seo-facts.yaml: satellite_counts was not written by this script (a count typed in by hand); {run}")
    for k in ("active_objects", "starlink_objects"):
        if not (isinstance(facts.get(k), int) and facts[k] > 0):
            out.append(f"registry/seo-facts.yaml: satellite_counts.{k} is not a positive whole number")
    day = facts.get("as_of")
    if not isinstance(day, dt.date):
        out.append("registry/seo-facts.yaml: satellite_counts.as_of is not a day")
    elif (today - day).days > MAX_AGE_DAYS:
        out.append(f"registry/seo-facts.yaml: the counts are of {day}, more than {MAX_AGE_DAYS} days before {today}; {run}")
    return out


def read_index(where: str) -> dict:
    if where.startswith("https://"):
        with urllib.request.urlopen(where, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    return json.loads(Path(where).read_text(encoding="utf-8"))


def main(argv: list) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--index", help="a copy of data/v1/index.json, or its https URL")
    ap.add_argument("--write", action="store_true", help="rewrite registry/seo-facts.yaml's satellite_counts from --index")
    ap.add_argument("--check", action="store_true", help="the block was written by this script and is young enough (no network)")
    args = ap.parse_args(argv)
    if args.write:
        if not args.index:
            ap.error("--write needs --index")
        c = counts_from_index(read_index(args.index))
        FACTS.write_text(write(FACTS.read_text(encoding="utf-8"), c), encoding="utf-8")
        print(f"seo_counts: {c['active']} active, {c['starlink']} Starlink, as of {c['as_of']}")
        return 0
    if args.check:
        said = problems(FACTS.read_text(encoding="utf-8"), dt.date.today())
        print("seo_counts REFUSED:\n  " + "\n  ".join(said) if said else "seo_counts ok: the fallback counts were written from the index, and are young")
        return 1 if said else 0
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
