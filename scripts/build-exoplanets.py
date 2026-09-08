#!/usr/bin/env python3
"""Slim the NASA Exoplanet Archive's confirmed-planets CSV into site/data/exoplanets.csv (spec 0028 step 4).

    python3 scripts/build-exoplanets.py path/to/pscomppars.csv 2026-09-08

The live layer reads the harvester's snapshot of the same query (registry/sources.yaml
`nasa-exoplanet-archive`, weekly). This file is the BUNDLED COPY the layer falls back to when no
snapshot exists yet -- dated, so the card can say "as of <date>" -- and it is the same columns the
browser parser (site/js/data/parsers.js parseExoplanets) reads from the snapshot, so one parser
serves both. Numbers are rounded to what a card prints; nothing is invented, and a blank stays a
blank.

Source: NASA Exoplanet Archive, Planetary Systems Composite Parameters table (pscomppars),
https://exoplanetarchive.ipac.caltech.edu/ -- operated by Caltech under contract with NASA; cite the
table DOI (CREDITS.md §4.7).
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site/data/exoplanets.csv"
COLUMNS = ("pl_name", "hostname", "ra", "dec", "sy_dist", "pl_rade", "pl_bmasse", "pl_orbper",
           "disc_year", "discoverymethod", "st_teff", "st_rad", "st_spectype")
ROUND = {"ra": 5, "dec": 5, "sy_dist": 3, "pl_rade": 3, "pl_bmasse": 3, "pl_orbper": 5, "st_teff": 0, "st_rad": 3}


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2
    src, as_of = Path(argv[0]), argv[1]
    kept = skipped = 0
    with src.open(encoding="utf-8", newline="") as fh, OUT.open("w", encoding="utf-8", newline="") as out:
        reader = csv.DictReader(fh)
        missing = [c for c in COLUMNS if c not in (reader.fieldnames or [])]
        if missing:
            raise SystemExit(f"source lacks columns {missing}")
        out.write(f"# NASA Exoplanet Archive pscomppars, as of {as_of}; slimmed by scripts/build-exoplanets.py\n")
        w = csv.writer(out, lineterminator="\n")
        w.writerow(COLUMNS)
        for row in reader:
            # A planet with no sky position or no distance cannot be placed; it is not written.
            if not row.get("ra") or not row.get("dec") or not row.get("sy_dist"):
                skipped += 1
                continue
            vals = []
            for c in COLUMNS:
                v = (row.get(c) or "").strip()
                if v and c in ROUND:
                    try:
                        f = float(v)
                        v = str(int(round(f))) if ROUND[c] == 0 else f"{round(f, ROUND[c]):g}"
                    except ValueError:
                        pass
                vals.append(v)
            w.writerow(vals)
            kept += 1
    print(f"exoplanets: {kept} written, {skipped} without a position or distance skipped -> {OUT.stat().st_size} B")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
