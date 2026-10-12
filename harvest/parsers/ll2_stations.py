"""Launch Library 2, the active space stations in detail: `{count, results:[...]}`.

Each station carries `onboard_crew` (the publisher's headcount), and `docking_location`, a list of
ports; a port's `currently_docked` is the vehicle there now (with `docking`, and the
`flight_vehicle_chaser.launch.net` it rode) or null. The page joins people to stations by that
launch time (site/js/data/crew.js). Read 2026-10-08: two stations, seven vehicles docked.
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, dict) or not isinstance(body.get("results"), list) or not body["results"]:
        raise ValueError("LL2 answers an object with a non-empty `results` list of stations")
    for st in body["results"]:
        if not isinstance(st, dict) or "name" not in st or not isinstance(st.get("docking_location"), list):
            raise ValueError("an LL2 station lacks `name` or its `docking_location` list")


def count(body) -> int:
    """The vehicles docked now, over every station: what the card prints."""
    validate(body)
    return sum(1 for st in body["results"] for port in st["docking_location"]
               if isinstance(port, dict) and port.get("currently_docked"))
