"""JPL Horizons, one request per id in the row's list; the body maps id -> the response text.

Horizons' `format=json` returns the same text block as `format=text`, wrapped in
`{signature, result}`; the ephemeris sits between `$$SOE` and `$$EOE` either way. An id counts
when its text holds at least one sample row. An id whose text holds none (an unknown id, a
window Horizons has no data for) does not count, and the run records which.
"""

from __future__ import annotations

SOE = "$$SOE"
EOE = "$$EOE"


def rows(text: str) -> int:
    if not isinstance(text, str):
        return 0
    a = text.find(SOE)
    b = text.find(EOE, a + len(SOE)) if a >= 0 else -1
    if a < 0 or b < 0:
        return 0
    return sum(1 for line in text[a + len(SOE):b].splitlines() if line.strip())


def validate(body) -> None:
    if not isinstance(body, dict):
        raise ValueError("a Horizons snapshot maps id -> response text")
    for k, v in body.items():
        if not isinstance(k, str) or not isinstance(v, str):
            raise ValueError("a Horizons snapshot maps id -> response text")


def count(body) -> int:
    validate(body)
    return sum(1 for text in body.values() if rows(text) > 0)


def missing(body) -> list[str]:
    """The ids that came back without a single sample row."""
    validate(body)
    return [k for k, text in body.items() if rows(text) == 0]
