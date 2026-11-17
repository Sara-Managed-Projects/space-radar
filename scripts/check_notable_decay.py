#!/usr/bin/env python3
"""Has a satellite the map names as working left orbit?

    python3 scripts/check_notable_decay.py --satcat satcat.json     # the site's saved copy, data/v1/celestrak-satcat.json
    python3 scripts/check_notable_decay.py --satcat satcat.csv      # or CelesTrak's own file, https://celestrak.org/pub/satcat.csv

WHY (review of 2026-11-16). site/js/data/layers.js NOTABLE is a hand-kept list: 33 satellites, each with one sentence in the
present tense that the object pages print. Swift re-entered the atmosphere on 4 November 2026; twelve days later
/o/swift.html still said "Swift is a space telescope going round the Earth", while the site's OWN saved copy of CelesTrak's
satellite catalogue said OPS_STATUS_CODE D, DECAY_DATE 2026-11-04 for it. Nothing compared the two. This does: every NOTABLE
row is looked up in the catalogue by its NORAD number, and a row with a decay date or the status "D" (decayed) is refused,
with what to do: move it to site/js/data/ended.js NOTABLE_ENDED with its dates and their sources, in the past tense.
.github/workflows/freshness.yml runs it every six hours on the live site's copy. A row the catalogue does not have at all is
said and not refused (a new launch can be in the list before the catalogue).

Exit 0 when every row is in orbit, 1 when one is not, 2 when the catalogue cannot be read. Standard library only.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAYERS = ROOT / "site" / "js" / "data" / "layers.js"
# CelesTrak's operational status codes (https://celestrak.org/satcat/status.php): what each says of a payload.
STATUS = {"+": "operational", "-": "non-operational", "P": "partially operational", "B": "backup or standby", "S": "spare",
          "X": "extended mission", "D": "decayed", "?": "unknown", "": "no status given"}


def notable_rows(js: str) -> list[tuple[int, str]]:
    """(NORAD number, name) of every row of `export const NOTABLE = [`, in order."""
    start = js.index("export const NOTABLE = [")
    block = js[start:js.index("\n];", start)]
    return [(int(m.group(1)), m.group(2)) for m in re.finditer(r"noradId:\s*(\d+),\s*name:\s*'((?:[^'\\]|\\.)*)'", block)]


def catalogue(text: str) -> dict[int, dict]:
    """CelesTrak's SATCAT by NORAD number, from its CSV or from the harvester's snapshot that wraps it ({"body": "<csv>"})."""
    text = text.lstrip("﻿")
    if text.lstrip().startswith("{"):
        text = json.loads(text).get("body") or ""
    rows = {}
    for r in csv.DictReader(io.StringIO(text)):
        try:
            rows[int(r["NORAD_CAT_ID"])] = r
        except (KeyError, ValueError):
            continue
    return rows


def judge(rows: list[tuple[int, str]], cat: dict[int, dict]) -> tuple[list[str], list[str]]:
    """(what is wrong, what is only worth saying)."""
    gone, said = [], []
    for norad, name in rows:
        r = cat.get(norad)
        if r is None:
            said.append(f"{name} ({norad}): not in the catalogue read")
            continue
        decay, status = (r.get("DECAY_DATE") or "").strip(), (r.get("OPS_STATUS_CODE") or "").strip()
        if decay or status == "D":
            gone.append(f"{name} ({norad}): left orbit{' on ' + decay if decay else ''} (status {status or 'none'}); it is still in "
                        "site/js/data/layers.js NOTABLE, described as working: move it to site/js/data/ended.js NOTABLE_ENDED")
        elif status not in ("+", ""):
            said.append(f"{name} ({norad}): {STATUS.get(status, 'status ' + status)}")
    return gone, said


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--satcat", required=True, help="CelesTrak's satcat.csv, or the site's data/v1/celestrak-satcat.json")
    ap.add_argument("--layers", default=str(LAYERS))
    ap.add_argument("--summary", help="also write the result here, as Markdown")
    ap.add_argument("--min-objects", type=int, default=10000, help="refuse a catalogue smaller than this (a test passes 1)")
    a = ap.parse_args(argv)
    try:
        cat = catalogue(Path(a.satcat).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"check_notable_decay: cannot read the catalogue {a.satcat}: {e}", file=sys.stderr)
        return 2
    if len(cat) < a.min_objects:
        print(f"check_notable_decay: {a.satcat} holds {len(cat)} objects, not a satellite catalogue", file=sys.stderr)
        return 2
    rows = notable_rows(Path(a.layers).read_text(encoding="utf-8"))
    if len(rows) < 20:
        print(f"check_notable_decay: only {len(rows)} rows read from NOTABLE: the list's shape has changed", file=sys.stderr)
        return 2
    gone, said = judge(rows, cat)
    lines = [f"{len(rows)} satellites the map names as working, held to CelesTrak's catalogue of {len(cat)} objects:"]
    lines += [f"- LEFT ORBIT: {g}" for g in gone] + [f"- {s}" for s in said]
    if not gone:
        lines.append("- every one is in orbit")
    report = "\n".join(lines) + "\n"
    if a.summary:
        Path(a.summary).write_text(report, encoding="utf-8")
    print(report, end="")
    return 1 if gone else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
