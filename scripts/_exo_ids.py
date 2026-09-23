"""The exoplanet table as the browser reads it, for the two Python scripts that must agree with it.

site/js/data/parsers.js parseExoplanets() turns every row of site/data/exoplanets.csv into a record
`exo-<slug>`. registry/systems.yaml names planets by that id, so the validator
(scripts/check_registry.py check_systems) and the generator (scripts/gen_systems_js.py) both have
to derive the same id from the same row -- one function here, rather than two copies that drift
(spec 0040 design §2, 2026-09-23). If parseExoplanets() ever changes its slug, this changes with
it, and tests/test_systems.mjs compares the two on every row of the file.
"""
from __future__ import annotations

import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "site" / "data" / "exoplanets.csv"


def exo_id(name: str) -> str:
    """parsers.js: 'exo-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')."""
    return "exo-" + re.sub(r"[^a-z0-9]+", "-", str(name).lower()).strip("-")


def read_rows(path: Path = CSV) -> list[dict] | None:
    """Every data row, as a dict by header name, or None when the file is absent or empty.

    None and not []: tests/test_refusals.py builds trees where site/data holds empty placeholder
    files, and there the honest answer is "cannot look", never "no planets at all".
    """
    if not path.exists() or path.stat().st_size == 0:
        return None
    lines = [ln for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip() and not ln.startswith("#")]
    if not lines:
        return None
    return list(csv.DictReader(lines))


def rows_for_host(rows: list[dict], host: str) -> list[dict]:
    return [r for r in rows if (r.get("hostname") or "").strip() == host]


def num(row: dict, key: str) -> float | None:
    try:
        v = float((row.get(key) or "").strip())
    except ValueError:
        return None
    return v
