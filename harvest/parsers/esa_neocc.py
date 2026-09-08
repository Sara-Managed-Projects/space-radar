"""ESA NEOCC upcoming close approaches: fixed-width text.

A header block (`Last Update: ...`, two column-name lines, one format line of A/D/N/Y letters),
then one approach per line with `|` between columns and an ISO date in the second one.
"""

from __future__ import annotations

import re

from ._text import lines

_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _is_row(line: str) -> bool:
    cols = [c.strip() for c in line.split("|")]
    return len(cols) >= 10 and bool(cols[0]) and bool(_DATE.match(cols[1]))


def validate(body) -> None:
    rows = lines(body)
    if not rows or "last update" not in rows[0].lower():
        raise ValueError("NEOCC text starts with a `Last Update:` line")


def count(body) -> int:
    validate(body)
    return sum(1 for line in lines(body) if _is_row(line))
