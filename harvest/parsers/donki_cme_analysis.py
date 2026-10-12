"""NASA DONKI CME analyses as JSON: a list of `{associatedCMEstartTime, latitude, longitude, halfAngle, speed, isMostAccurate, ...}`.

One row per analysed coronal mass ejection of the last thirty days, the most accurate analysis of each
(site/js/data/sunactivity.js says what the page reads, and that DONKI's longitude is west positive).
The harvester passes it through whole; `count` is the number of rows.
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, list) or not body:
        raise ValueError("the CME analysis list is a non-empty list")
    for r in body[:5]:
        if not isinstance(r, dict) or "associatedCMEstartTime" not in r or "speed" not in r:
            raise ValueError("a CME analysis row carries associatedCMEstartTime and speed")


def count(body) -> int:
    validate(body)
    return len(body)
