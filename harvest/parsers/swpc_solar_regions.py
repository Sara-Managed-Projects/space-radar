"""NOAA SWPC Solar Region Summary as JSON: a list of `{observed_date, region, latitude, longitude, area, number_spots, ...}`.

One row per numbered active region per day, about a month of days (site/js/data/sunregions.js says what
the page reads). The harvester passes it through whole; `count` is the number of rows.
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, list) or not body:
        raise ValueError("the solar region summary is a non-empty list")
    for r in body[:5]:
        if not isinstance(r, dict) or "observed_date" not in r or "region" not in r:
            raise ValueError("a solar region row carries observed_date and region")


def count(body) -> int:
    validate(body)
    return len(body)
