#!/usr/bin/env python3
"""Mirror registry/tours.yaml into site/js/data/tours.js, and refuse if it has drifted.

Third registry to need this, which is why the mechanism is in scripts/_genmirror.py and only the
part that knows what a TRIP is lives here.

TWO THINGS THIS GENERATOR DOES THAT THE OTHER TWO DO NOT.

1. IT RESOLVES THE DEFAULTS. `defaults:` at the top of the YAML is there so a human editing the
   file reads one number in one place; the browser gets every stop with every field already
   filled in. Resolving it here rather than at runtime means the mirror is exactly what runs, and
   a reviewer diffing the mirror sees the effect of changing a default on every stop it touches.

2. IT COMPUTES THE DWELL AND THE LENGTH. The dwell is `clamp(2500 + words*333, 8000, 20000)` ms --
   about three words a second, the slow end of the practical reading range -- and it is derived
   from the WORD COUNT and never from the flight duration. That is not a detail: it is what makes
   it structurally impossible for a change to the camera to quietly shorten a reader's time, and
   it is why the reduced-motion path (which cuts every flight to nothing) leaves the dwell exactly
   as it was.

   The trip's stated length is the sum of those dwells plus an estimate per flight, computed here
   for the same reason: the number a visitor is promised on the intro card and the number the
   browser actually runs are then the same number, rather than a sentence somebody typed.

Run:  python3 scripts/gen_tours_js.py           # write it
      python3 scripts/gen_tours_js.py --check   # exit 1 if the checked-in file is stale
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _genmirror import Mirror, pick  # noqa: E402

# What the browser needs to FLY a trip and to say what it is flying to. The YAML's comments are
# the evidence a reviewer reads and are not shipped; neither is anything a future field adds
# until somebody puts it in one of these two lists.
TRIP_FIELDS = ("id", "title", "blurb", "pacing", "requires", "min_stops", "stage", "clock")
STOP_FIELDS = (
    "id",
    "target",
    "needs_layer",
    "distance_km",
    "frame_radii",
    "drift_deg",
    "drift_rate_deg_s",
    "drift",
    "key_light_deg",
    "ease",
    "on_unresolved",
    "card",
)

# The per-stop settings `defaults:` may fill in. A trip-level field (`pacing`, `clock`, `stage`,
# `min_stops`) is filled in on the TRIP; the rest are per stop.
TRIP_DEFAULTS = ("pacing", "stage", "clock", "min_stops")
STOP_DEFAULTS = (
    "frame_radii",
    "drift_deg",
    "drift_rate_deg_s",
    "drift",
    "key_light_deg",
    "ease",
    "on_unresolved",
)

# The dwell, in one place. Mirrored by the same three numbers in site/js/ui/trip.js's header and
# by scripts/check_registry.py's drift check, which is what makes "the drift must finish inside
# its own dwell" a thing the validator can actually decide.
DWELL_BASE_MS = 2500
DWELL_PER_WORD_MS = 333
DWELL_MIN_MS = 8000
DWELL_MAX_MS = 20000

# A flight, for the LENGTH ESTIMATE only. The real duration is computed in the browser from the
# distance actually travelled, which this cannot know; 3.2 s is the middle of the 1.5-6.0 s band
# the rig is given, and the estimate is printed to the nearest half minute anyway.
FLIGHT_ESTIMATE_MS = 3200
SETTLE_MS = 150


def words(text: str) -> int:
    return len(str(text or "").split())


def dwell_ms(body: str) -> int:
    return max(DWELL_MIN_MS, min(DWELL_MAX_MS, DWELL_BASE_MS + words(body) * DWELL_PER_WORD_MS))


def stop_of(stop: dict, defaults: dict) -> dict:
    out = pick(stop, STOP_FIELDS)
    for key in STOP_DEFAULTS:
        if key not in out and key in defaults:
            out[key] = defaults[key]
    out["dwell_ms"] = dwell_ms((stop.get("card") or {}).get("body"))
    return out


def trip_of(trip: dict, defaults: dict) -> dict:
    out = pick(trip, TRIP_FIELDS)
    for key in TRIP_DEFAULTS:
        if key not in out and key in defaults:
            out[key] = defaults[key]
    out["stops"] = [stop_of(s, defaults) for s in (trip.get("stops") or [])]
    # The stated length, from the numbers that actually run. The first stop has a flight too:
    # the camera is wherever the visitor left it.
    out["estimate_ms"] = sum(
        s["dwell_ms"] + FLIGHT_ESTIMATE_MS + SETTLE_MS for s in out["stops"]
    )
    return out


def render(doc: dict) -> list[tuple[str, str, object]]:
    defaults = doc.get("defaults") or {}
    return [
        (
            "The shared settings a trip row may leave out. Already applied to every row below; "
            "here so the browser can say what a stop inherited.",
            "TOUR_DEFAULTS",
            defaults,
        ),
        (
            "Every trip, with every default resolved and every dwell computed.",
            "TOURS",
            [trip_of(t, defaults) for t in (doc.get("tours") or [])],
        ),
    ]


HEADER = """// GENERATED from registry/tours.yaml by scripts/gen_tours_js.py. Do not edit.
//
// `python3 scripts/gen_tours_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// A TRIP IS A CHAIN OF SHOTS, and a stop is one shot plus the words that go under it. Every
// default from the YAML's `defaults:` block is already resolved into every stop here, and every
// `dwell_ms` is already computed from its own card's word count -- so this file is exactly what
// runs, and the number on the intro card is the number the browser spends.
//
// The state machine that flies these is hand-written next door in ui/trip.js. Generated data and
// hand-written code never share a file, which is what makes `--check` a plain byte comparison.
"""


MIRROR = Mirror(
    source="registry/tours.yaml",
    target="site/js/data/tours.js",
    header=HEADER,
    render=render,
    what="tours.js",
)


if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
