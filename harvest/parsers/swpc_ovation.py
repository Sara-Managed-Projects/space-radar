"""NOAA SWPC OVATION aurora: `{"Observation Time", "Forecast Time", "Data Format",
"coordinates": [[lon, lat, probability], ...]}` -- a 360x181 grid, ~900 kB.

Passed through whole, like every body (amendment 1 §3). Downsampling to a texture is the browser's
if payload size ever matters; today it does not.
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, dict) or not isinstance(body.get("coordinates"), list):
        raise ValueError("OVATION answers an object with a `coordinates` grid")
    for cell in body["coordinates"][:5]:
        if not isinstance(cell, list) or len(cell) != 3:
            raise ValueError("an OVATION cell is [lon, lat, probability]")


def count(body) -> int:
    validate(body)
    return len(body["coordinates"])
