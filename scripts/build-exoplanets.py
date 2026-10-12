#!/usr/bin/env python3
"""Slim the NASA Exoplanet Archive's confirmed-planets CSV into site/data/exoplanets.csv (spec 0028 step 4).

    python3 scripts/build-exoplanets.py path/to/pscomppars.csv 2026-09-08
    python3 scripts/build-exoplanets.py --pull 2026-10-08 [--keep path/to/pscomppars.csv]

`--pull` asks the Archive's TAP service for the table (QUERY below) instead of reading a file; the
day is still typed, because it is the day somebody ran this and looked at the result.

TWO FILES FROM ONE PULL (2026-10-08, internal #466). The browser's table keeps its thirteen columns:
it is 580 kB that every visitor who leaves the Earth downloads, and no code in the page reads a
semi-major axis for six thousand planets. The star systems drawn at their own scale
(registry/systems-list.yaml) need more: the semi-major axis, the star's mass and luminosity, the
eccentricity, a transit time, whether the planet goes round two stars, and WHICH NUMBERS THE
ARCHIVE WORKED OUT ITSELF. The composite table fills a missing radius from the mass and a missing
mass from the radius ("Calculated Value" in the column's reference); a card that says "measured"
has to know. Those columns are written for the listed hosts only, to registry/systems-columns.csv,
with the same date, so scripts/build-systems.py joins two files of one pull.

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
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site/data/exoplanets.csv"
COLUMNS = ("pl_name", "hostname", "ra", "dec", "sy_dist", "pl_rade", "pl_bmasse", "pl_orbper",
           "disc_year", "discoverymethod", "st_teff", "st_rad", "st_spectype")
# The wider columns, kept for the hosts of registry/systems-list.yaml only (the docstring says why).
SIDE = ROOT / "registry/systems-columns.csv"
SIDE_COLUMNS = ("pl_name", "hostname", "pl_orbsmax", "st_mass", "st_lum", "pl_orbeccen", "pl_tranmid",
                "cb_flag", "sy_snum", "pl_bmassprov")
# The columns whose reference says whether the Archive measured the number or calculated it. The
# sidecar's `calc` column is the letters of those it calculated: r the radius, m the mass.
CALC = (("r", "pl_rade_reflink"), ("m", "pl_bmasse_reflink"))
TAP = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"
QUERY = ("select pl_name,hostname,ra,dec,sy_dist,pl_rade,pl_bmasse,pl_orbper,disc_year,discoverymethod,"
         "st_teff,st_rad,st_spectype,pl_orbsmax,st_mass,st_lum,pl_orbeccen,pl_tranmid,cb_flag,sy_snum,"
         "pl_bmassprov,pl_rade_reflink,pl_bmasse_reflink from pscomppars")
ROUND = {"ra": 5, "dec": 5, "sy_dist": 3, "pl_rade": 3, "pl_bmasse": 3, "pl_orbper": 5, "st_teff": 0, "st_rad": 3}


def pull(keep: Path | None) -> Path:
    """The table from the Archive's TAP service, as a file: `keep`, or a temporary one."""
    url = TAP + "?" + urllib.parse.urlencode({"query": QUERY, "format": "csv"})
    dest = keep or Path(tempfile.mkdtemp(prefix="pscomppars-")) / "pscomppars.csv"
    with urllib.request.urlopen(url, timeout=600) as resp:  # noqa: S310 -- one fixed https host
        dest.write_bytes(resp.read())
    print(f"exoplanets: pulled {dest.stat().st_size} B from {TAP}")
    return dest


def listed_hosts() -> set[str]:
    doc = yaml.safe_load((ROOT / "registry/systems-list.yaml").read_text(encoding="utf-8")) or {}
    return {str(h["host"]) for h in doc.get("hosts") or []}


def write_side(src: Path, as_of: str) -> None:
    """registry/systems-columns.csv: the wider columns for the listed hosts, as the Archive gave them."""
    hosts = listed_hosts()
    with src.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        missing = [c for c in SIDE_COLUMNS + tuple(c for _, c in CALC) if c not in (reader.fieldnames or [])]
        if missing:
            raise SystemExit(f"source lacks the star systems' columns {missing}; pull with --pull")
        rows = [r for r in reader if (r.get("hostname") or "").strip() in hosts]
    absent = sorted(hosts - {r["hostname"].strip() for r in rows})
    if absent:
        raise SystemExit(f"registry/systems-list.yaml names hosts the table does not have: {absent}")
    rows.sort(key=lambda r: (r["hostname"], r["pl_name"]))
    with SIDE.open("w", encoding="utf-8", newline="") as out:
        out.write(f"# NASA Exoplanet Archive pscomppars, as of {as_of}; the columns the star systems need, for the "
                  f"hosts of registry/systems-list.yaml only; written by scripts/build-exoplanets.py\n")
        w = csv.writer(out, lineterminator="\n")
        w.writerow(SIDE_COLUMNS + ("calc",))
        for r in rows:
            calc = "".join(letter for letter, col in CALC if "CALCULATED" in (r.get(col) or "").upper())
            w.writerow([(r.get(c) or "").strip() for c in SIDE_COLUMNS] + [calc])
    print(f"star systems: {len(rows)} planets of {len(hosts)} hosts -> {SIDE.relative_to(ROOT)} ({SIDE.stat().st_size} B)")


def main(argv: list[str]) -> int:
    keep = None
    if "--keep" in argv:
        i = argv.index("--keep")
        keep = Path(argv[i + 1])
        argv = argv[:i] + argv[i + 2:]
    if len(argv) != 2:
        print(__doc__)
        return 2
    as_of = argv[1]
    src = pull(keep) if argv[0] == "--pull" else Path(argv[0])
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
    write_side(src, as_of)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
