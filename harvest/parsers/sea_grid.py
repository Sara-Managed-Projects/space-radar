"""A field over the sea from a NOAA ERDDAP server, packed small (the ocean currents overlay).

Two rows of registry/sources.yaml use it:

    ocean-currents      NOAA CoastWatch's near-real-time geostrophic currents, u_current and v_current
    ocean-temperature   NOAA NCEI's OISST v2.1 (through the CoastWatch West Coast node), sst

Each asks for one day, every fourth point of a quarter-degree grid: 180 x 360 rows of ERDDAP's table form,
`{"table": {"columnNames": [time, (zlev,) latitude, longitude, <values>], "rows": [...]}}`, with `null`
where there is no sea (or sea ice, for the currents).

THIS PARSER PACKS, AND IT IS THE ONLY ONE THAT DOES. Every other body is passed through whole and the
page normalises it. This one cannot be: the table is 4.4 MB for the currents and 3.8 MB for the
temperature (measured 2026-10-12), nearly all of it the time, latitude and longitude repeated on 64 800
rows. `pack(body)` (harvest/run.py calls it when a parser has one) keeps what the page needs:

    {"grid": "sea-grid/1", "time": "2026-10-10T00:00:00Z", "lat0": -89.875, "lon0": -179.875,
     "stepDeg": 1.0, "nLat": 180, "nLon": 360, "cells": 35603,
     "fields": {"u_current": {"scale": 100, "rows": ["", ",,12,-3,,", ...]}, ...}}

A field's `rows` are one string for each latitude, south to north, each the values west to east from
`lon0`, as whole numbers of 1/scale (cm/s for a current, tenths of a degree for a temperature) with
commas between and NOTHING where the source had no value. That is 262 kB and 184 kB (72 kB and 37 kB
gzipped). Nothing is smoothed, filled or interpolated: a number here is the source's number, rounded.

`count` is the cells that have a value, so a day that comes back mostly blank is refused by the 49 % guard.
"""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_EVEN

# What a value column is multiplied by before it is rounded to a whole number.
SCALES = {"u_current": 100, "v_current": 100, "sst": 10}
AXES = ("time", "zlev", "latitude", "longitude")


def _table(body):
    table = body.get("table") if isinstance(body, dict) else None
    if not isinstance(table, dict) or not isinstance(table.get("rows"), list) or not isinstance(table.get("columnNames"), list):
        raise ValueError("an ERDDAP answer is {table: {columnNames, rows}}")
    names = table["columnNames"]
    values = [n for n in names if n not in AXES]
    if not values or any(n not in SCALES for n in values):
        raise ValueError(f"a sea grid's value columns are among {sorted(SCALES)}, got {names}")
    if any(n not in names for n in ("time", "latitude", "longitude")):
        raise ValueError(f"a sea grid has time, latitude and longitude, got {names}")
    return names, values, table["rows"]


def validate(body) -> None:
    names, _, rows = _table(body)
    for row in rows[:5]:
        if not isinstance(row, list) or len(row) != len(names):
            raise ValueError(f"a sea grid row is {names}")


def _has_value(row, at) -> bool:
    # A current needs both its components: one alone has no direction.
    return all(isinstance(row[i], (int, float)) and not isinstance(row[i], bool) for i in at)


def count(body) -> int:
    names, values, rows = _table(body)
    at = [names.index(n) for n in values]
    return sum(1 for row in rows if isinstance(row, list) and len(row) == len(names) and _has_value(row, at))


def _whole(value, scale: int) -> int:
    # Through the decimal text, so 0.125 m/s is 12 cm/s on every machine (half to even) and not a float's guess.
    return int((Decimal(repr(value)) * scale).quantize(Decimal(1), rounding=ROUND_HALF_EVEN))


def pack(body) -> dict:
    """The table as one small grid. Raises ValueError unless it is one time and a whole, even rectangle."""
    names, values, rows = _table(body)
    i_t, i_lat, i_lon = names.index("time"), names.index("latitude"), names.index("longitude")
    at = [names.index(n) for n in values]
    times = {row[i_t] for row in rows}
    if len(times) != 1:
        raise ValueError(f"a sea grid is one day, got {len(times)} times")
    lats = sorted({row[i_lat] for row in rows})
    lons = sorted({row[i_lon] for row in rows})
    n_lat, n_lon = len(lats), len(lons)
    if n_lat < 2 or n_lon < 2 or len(rows) != n_lat * n_lon:
        raise ValueError(f"a sea grid is a whole rectangle: {len(rows)} rows for {n_lat} latitudes by {n_lon} longitudes")
    step = round((lats[-1] - lats[0]) / (n_lat - 1), 6)
    step_lon = round((lons[-1] - lons[0]) / (n_lon - 1), 6)
    if step <= 0 or step != step_lon:
        raise ValueError(f"a sea grid has one step both ways, got {step} and {step_lon}")
    j_of = {lat: j for j, lat in enumerate(lats)}
    i_of = {lon: i for i, lon in enumerate(lons)}
    cells = {n: [[""] * n_lon for _ in range(n_lat)] for n in values}
    seen = set()
    filled = 0
    for row in rows:
        j, i = j_of[row[i_lat]], i_of[row[i_lon]]
        if (j, i) in seen:
            raise ValueError(f"a sea grid names each place once: {row[i_lat]}, {row[i_lon]} came twice")
        seen.add((j, i))
        if not _has_value(row, at):
            continue
        filled += 1
        for n, k in zip(values, at):
            cells[n][j][i] = str(_whole(row[k], SCALES[n]))
    return {
        "grid": "sea-grid/1",
        "time": next(iter(times)),
        "lat0": lats[0],
        "lon0": lons[0],
        "stepDeg": step,
        "nLat": n_lat,
        "nLon": n_lon,
        "cells": filled,
        "fields": {n: {"scale": SCALES[n], "rows": [",".join(r) for r in cells[n]]} for n in values},
    }
