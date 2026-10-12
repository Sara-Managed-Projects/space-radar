"""NOAA/NCEP GFS 10 m wind through PacIOOS ERDDAP (internal #146, #362, #552).

ERDDAP's table form: `{"table": {"columnNames": [time, latitude, longitude, ugrd10m, vgrd10m], "rows": [...]}}`.
The request is one forecast hour, every fifth degree (37 x 72 = 2 664 rows); the harvester passes the body
through whole, like every body, and the page (site/js/data/wind.js parseWind) refuses a grid that is not
that shape. `count` is the number of rows, so a run that comes back short is refused by the 49 % guard.
"""

from __future__ import annotations

COLUMNS = ["time", "latitude", "longitude", "ugrd10m", "vgrd10m"]


def validate(body) -> None:
    table = body.get("table") if isinstance(body, dict) else None
    if not isinstance(table, dict) or not isinstance(table.get("rows"), list):
        raise ValueError("an ERDDAP answer is {table: {columnNames, rows}}")
    if table.get("columnNames") != COLUMNS:
        raise ValueError(f"the wind table's columns are {COLUMNS}, got {table.get('columnNames')}")
    for row in table["rows"][:5]:
        if not isinstance(row, list) or len(row) != len(COLUMNS):
            raise ValueError("a wind row is [time, latitude, longitude, u, v]")


def count(body) -> int:
    validate(body)
    return len(body["table"]["rows"])
