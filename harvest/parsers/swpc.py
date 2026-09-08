"""NOAA SWPC planetary K index: a list of `{time_tag, kp, observed, noaa_scale}` rows.

SWPC also publishes the array-of-arrays shape (a header row, then rows); the browser parses both,
so both count here.
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, list) or not body:
        raise ValueError("SWPC Kp is a non-empty list")
    first = body[0]
    if isinstance(first, list):
        header = [str(h).lower() for h in first]
        if not any("time" in h for h in header) or not any("kp" in h for h in header):
            raise ValueError("SWPC Kp header row names no time/kp column")
    elif isinstance(first, dict):
        if not any(k in first for k in ("kp", "kp_index", "Kp")):
            raise ValueError("SWPC Kp rows carry no kp")
    else:
        raise ValueError("SWPC Kp rows are objects or arrays")


def count(body) -> int:
    validate(body)
    if isinstance(body[0], list):
        return len(body) - 1
    return len(body)
