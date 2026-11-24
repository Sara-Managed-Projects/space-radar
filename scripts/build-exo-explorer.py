#!/usr/bin/env python3
"""The exoplanet explorer's four extra columns (forge #564): writes site/data/exoplanets-explorer.json.

    python3 scripts/build-exo-explorer.py --pull 2026-11-24 [--keep path/to/extra.csv]
    python3 scripts/build-exo-explorer.py path/to/extra.csv 2026-11-24
    python3 scripts/build-exo-explorer.py --check          stdlib only, no network: the file is whole

WHAT. The explorer (site/js/ui/exoexplorer.js) plots any two columns of the NASA Exoplanet Archive's composite table
(pscomppars). The map's own copy (site/data/exoplanets.csv, .bin, and the harvested `nasa-exoplanet-archive` snapshot) has
thirteen columns, chosen for the layer; a plot of the habitable zone needs four more, and they are the ARCHIVE'S numbers,
not ours: the orbit's size (pl_orbsmax, au), the light the planet gets (pl_insol, Earth = 1), its equilibrium temperature
(pl_eqt, K) and its star's mass (st_mass, Suns). Find (ui/findcore.js) works the first three out from the period and an
estimated star mass and calls them modelled; the explorer prints the Archive's own values, and where the Archive has none
the dot is counted as "no value", never filled in. Some of these the Archive itself calculated from other columns of the
same row ("Calculated Value" in its reference column); the card and the explorer's note say the numbers are the Archive's
composite values, as the layer's are.

WHY A SIDE FILE. The layer's copy is fetched by every visitor who leaves the Earth; these columns only by the one who opens
the explorer. The file is keyed by planet name, so it joins whichever copy of the thirteen columns the map holds (our
weekly snapshot or the bundled one); a planet newer than this file shows no value in these four columns until it is pulled
again, and the count line says how many. Refreshed by hand with the bundled catalogue (scripts/build-exoplanets.py --pull).

SOURCE AND TERMS. https://exoplanetarchive.ipac.caltech.edu/TAP/sync (the same service and table as registry/sources.yaml
`nasa-exoplanet-archive`): publicly available; the Archive asks for its acknowledgement and a citation of the table, DOI
10.26133/NEA13 (CREDITS.md, the explorer's source line).
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import math
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "data" / "exoplanets-explorer.json"
TAP = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync"
QUERY = "select pl_name,pl_orbsmax,pl_insol,pl_eqt,st_mass from pscomppars"
COLS = ["name", "aAu", "insol", "teqK", "starMassSuns"]
FIELDS = {"aAu": "pl_orbsmax", "insol": "pl_insol", "teqK": "pl_eqt", "starMassSuns": "st_mass"}
# The budget row registry/budgets.yaml `exo_explorer_bytes` holds the written file to this.
MAX_BYTES = 300_000


def sig(v: float, n: int) -> float | int:
    """`v` to `n` significant figures, as the shortest number that prints it."""
    if v == 0:
        return 0
    d = n - int(math.floor(math.log10(abs(v)))) - 1
    r = round(v, d)
    return int(r) if d <= 0 or r == int(r) else r


def num(text: str, n: int) -> float | int | None:
    try:
        v = float(text)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(v) or v <= 0:
        return None
    return sig(v, n)


def build(csv_text: str, read: str) -> dict:
    rows = []
    for r in csv.DictReader(io.StringIO(csv_text)):
        name = (r.get("pl_name") or "").strip()
        if not name:
            continue
        rows.append([name, num(r.get("pl_orbsmax"), 4), num(r.get("pl_insol"), 3), num(r.get("pl_eqt"), 3), num(r.get("st_mass"), 3)])
    rows.sort(key=lambda x: x[0])
    return {
        "v": 1,
        "about": "Four columns of the NASA Exoplanet Archive's composite table (pscomppars) for the exoplanet explorer: the orbit's size (au), "
                 "the light received (Earth = 1), the equilibrium temperature (K) and the star's mass (Suns). Built by scripts/build-exo-explorer.py.",
        "read": read,
        "source": TAP + "?" + urllib.parse.urlencode({"query": QUERY, "format": "csv"}),
        "doi": "10.26133/NEA13",
        "count": len(rows),
        "cols": COLS,
        "rows": rows,
    }


def write(doc: dict) -> int:
    text = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text(text + "\n", encoding="utf-8")
    return len(text) + 1


def check() -> int:
    problems = []
    doc = json.loads(OUT.read_text(encoding="utf-8"))
    if doc.get("cols") != COLS:
        problems.append(f"cols are {doc.get('cols')}, not {COLS}")
    rows = doc.get("rows") or []
    if doc.get("count") != len(rows) or len(rows) < 5000:
        problems.append(f"{len(rows)} rows, count says {doc.get('count')}")
    names = [r[0] for r in rows]
    if len(set(names)) != len(names):
        problems.append("a planet is named twice")
    for r in rows:
        if len(r) != len(COLS) or any(v is not None and not (isinstance(v, (int, float)) and v > 0) for v in r[1:]):
            problems.append(f"row {r} is not a name and four positive numbers or blanks")
            break
    size = OUT.stat().st_size
    if size > MAX_BYTES:
        problems.append(f"{size} B, over {MAX_BYTES}")
    if problems:
        print("exo explorer FAILED:\n  " + "\n  ".join(problems))
        return 1
    print(f"exo explorer ok: {len(rows)} planets, {size} B, read {doc.get('read')}")
    return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("file", nargs="?")
    ap.add_argument("day", nargs="?")
    ap.add_argument("--pull", metavar="DAY")
    ap.add_argument("--keep", metavar="CSV")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args(argv)
    if a.check:
        return check()
    if a.pull:
        url = TAP + "?" + urllib.parse.urlencode({"query": QUERY, "format": "csv"})
        with urllib.request.urlopen(url, timeout=600) as resp:  # noqa: S310 -- one fixed https host
            text = resp.read().decode("utf-8")
        if a.keep:
            Path(a.keep).write_text(text, encoding="utf-8")
        day = a.pull
    elif a.file and a.day:
        text = Path(a.file).read_text(encoding="utf-8")
        day = a.day
    else:
        ap.error("give --pull DAY, or a file and the day it was read")
        return 2
    n = write(build(text, day))
    print(f"exo explorer: wrote {OUT.relative_to(ROOT)}, {n} B")
    return check()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
