"""CelesTrak SATCAT: CSV, one header line, one object per line."""

from __future__ import annotations

from ._text import lines

_REQUIRED = ("OBJECT_NAME", "NORAD_CAT_ID", "OBJECT_TYPE")


def validate(body) -> None:
    rows = lines(body)
    if not rows:
        raise ValueError("empty SATCAT")
    header = [h.strip() for h in rows[0].split(",")]
    missing = [c for c in _REQUIRED if c not in header]
    if missing:
        raise ValueError(f"SATCAT header lacks {', '.join(missing)}")


def count(body) -> int:
    validate(body)
    return sum(1 for row in lines(body)[1:] if row.strip())
