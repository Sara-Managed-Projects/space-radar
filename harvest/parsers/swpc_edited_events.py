"""NOAA SWPC edited events as JSON: a list of `{begin_datetime, max_datetime, end_datetime, type, particulars1, region, ...}`.

One row per event per observatory, about thirty days: X-ray flares (`type` "XRA", the class in
`particulars1`), radio bursts, optical flares, filaments (site/js/data/sunactivity.js says what the
page reads: the X-ray flares that carry a region number). The harvester passes it through whole;
`count` is the number of rows.
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, list) or not body:
        raise ValueError("the edited events list is a non-empty list")
    for r in body[:5]:
        if not isinstance(r, dict) or "begin_datetime" not in r or "type" not in r:
            raise ValueError("an event row carries begin_datetime and type")


def count(body) -> int:
    validate(body)
    return len(body)
