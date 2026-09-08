"""NASA Exoplanet Archive TAP, `pscomppars` as CSV: one header line, one confirmed planet per line.

Fields are quoted when they carry a comma or a space (`"Radial Velocity"`), so the count uses the
csv module rather than splitting on commas. A body that is not CSV with the columns the browser
parser reads is refused; a body with zero planets is refused by the never-worse guard, because the
confirmed-planet table has grown every week since 2011 and an empty answer is a changed query.
"""

from __future__ import annotations

import csv
import io

_REQUIRED = ("pl_name", "hostname", "ra", "dec", "sy_dist")


def _rows(body):
    if not isinstance(body, str):
        raise ValueError("the Exoplanet Archive answers CSV text")
    text = body.lstrip("﻿")
    # A TAP error comes back as a VOTable (XML) with HTTP 200; that is not a table of planets.
    if text.lstrip().startswith("<"):
        raise ValueError("TAP answered XML, not CSV: the query was refused")
    reader = csv.reader(io.StringIO(text))
    rows = [r for r in reader if r and any(c.strip() for c in r)]
    if not rows:
        raise ValueError("empty CSV")
    return rows


def validate(body) -> None:
    rows = _rows(body)
    header = [h.strip() for h in rows[0]]
    missing = [c for c in _REQUIRED if c not in header]
    if missing:
        raise ValueError(f"pscomppars header lacks {', '.join(missing)}")


def count(body) -> int:
    validate(body)
    return len(_rows(body)) - 1
