#!/usr/bin/env python3
"""Mirror registry/weather.yaml into site/js/data/weather.js, and refuse if it has drifted.

Same mechanism as the other mirrors (scripts/_genmirror.py). The browser gets what it draws from --
the class, the wind profile, the caps' edges -- and the name of the source for the Sources panel;
the CORS evidence, the licence and the `why:` stay in the YAML with the reviewer.

Run:  python3 scripts/gen_weather_js.py           # write it
      python3 scripts/gen_weather_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

FIELDS = ("id", "world", "kind", "class", "layer", "off_at", "profile", "spot", "hexagon",
          "north_cap", "south_cap", "dust")


def render(doc: dict) -> list:
    rows = []
    for r in (doc.get("effects") or []):
        if not isinstance(r, dict):
            continue
        row = pick(r, FIELDS)
        row["source"] = (r.get("source") or {}).get("name", "")
        rows.append(row)
    return [("Every weather effect: its world, what is drawn, and how much of it is known (measured, modelled or illustrative).", "WEATHER", rows)]


HEADER = """// GENERATED from registry/weather.yaml by scripts/gen_weather_js.py. Do not edit.
//
// `python3 scripts/gen_weather_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// OFF THE FIRST VISIT: only scene/weather/*.js imports this, and main.js imports those dynamically.
// A profile's points are [latitude in degrees, wind in m/s with the rotation]; the YAML says where
// each was read and how simplified it is.
"""

MIRROR = Mirror(source="registry/weather.yaml", target="site/js/data/weather.js", header=HEADER, render=render, what="weather.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
