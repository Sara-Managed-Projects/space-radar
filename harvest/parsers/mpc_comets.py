"""Minor Planet Center CometEls.txt: fixed-width, one comet per line.

The columns the browser's parseComets() reads are the ones checked here: perihelion distance at
[30:39], eccentricity at [40:49]. A line shorter than 100 characters is not an element line.
"""

from __future__ import annotations

from ._text import lines, number


def _is_row(line: str) -> bool:
    if len(line) < 100:
        return False
    q = number(line[30:39])
    e = number(line[40:49])
    return q is not None and e is not None and q > 0 and e >= 0


def validate(body) -> None:
    lines(body)


def count(body) -> int:
    validate(body)
    return sum(1 for line in lines(body) if _is_row(line))
