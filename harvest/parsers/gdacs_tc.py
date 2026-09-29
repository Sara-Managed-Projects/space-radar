"""GDACS tropical cyclones: a GeoJSON FeatureCollection, one Point feature per storm.

Measured 2026-09-28 against
https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC&alertlevel=Green;Orange;Red&pageSize=20
(27 646 bytes, 20 features, `Access-Control-Allow-Origin: *`). The list is newest `todate` first
and carries storms that ended weeks ago, several still marked `iscurrent: true`; which of them are
happening NOW is the browser's rule (site/js/data/parsers.js parseGdacsCyclones), not this file's.
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, dict) or body.get("type") != "FeatureCollection":
        raise ValueError("GDACS answers a GeoJSON FeatureCollection")
    features = body.get("features")
    if not isinstance(features, list):
        raise ValueError("GDACS FeatureCollection has no features list")
    for f in features:
        props = (f or {}).get("properties") or {}
        if props.get("eventtype") not in (None, "TC"):
            raise ValueError(f"GDACS feature of type {props.get('eventtype')!r} in a tropical-cyclone list")


def count(body) -> int:
    validate(body)
    return len(body["features"])
