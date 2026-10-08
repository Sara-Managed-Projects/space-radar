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

import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _genmirror import Mirror, pick  # noqa: E402
from _exo_ids import read_rows  # noqa: E402

# What the browser needs to FLY a trip and to say what it is flying to. The YAML's comments are
# the evidence a reviewer reads and are not shipped; neither is anything a future field adds
# until somebody puts it in one of these three lists. `group` and `next` (spec 0029) are what the
# picker and the end card read: which heading a trip sits under, and which trip is offered after.
# `requires_observer` (spec 0038): the trip starts from the visitor's own place, and ui/trip.js
# plan() greys it with "Needs a place" when there is none. A stop's `{observer: true}` target is a
# `target:` like any other and passes through unchanged. `og_stop` (2026-09-23) is what
# scripts/shots.mjs reads to take the preview picture at a stop other than the first; `orbits` is
# what ui/trip.js hands scene/orbitrings.js.
TRIP_FIELDS = ("id", "title", "blurb", "pacing", "requires", "min_stops", "stage", "clock", "group",
               "next", "requires_observer", "og_stop", "orbits", "hides",
               # `return: true`: after the last stop, one continuous flight home before the end card
               # (ui/trip.js flyHome, internal #304).
               "return")
# A `groups:` row: the id a trip names, the heading the picker prints, and where it sits.
GROUP_FIELDS = ("id", "display", "order")
STOP_FIELDS = (
    "id",
    "target",
    # A stop's own centre for the map, when it is not its trip's. Written only where a stop names
    # one: ui/trip.js flies every other stop on `stage || tour.stage`, so an unnamed stop is still
    # never at the mercy of whichever stage the stop before it left behind.
    "stage",
    "needs_layer",
    "distance_km",
    "frame_radii",
    # The world the shot keeps in the picture behind its subject. ui/trip.js narrows the key-light
    # search to the directions that hold it.
    "behind",
    "drift_deg",
    "drift_rate_deg_s",
    "drift",
    "key_light_deg",
    "ease",
    "on_unresolved",
    # Spec 0030: the instant and the rate this stop shows, passed through unresolved -- an ISO
    # instant, `now`, or `{event: <type>.next, offset_s: n}` -- because only the browser knows the
    # visitor's clock an event reference counts from. No default for either: a stop without them
    # is exactly the stop it was before the fields existed.
    "time",
    "rate",
    # Spec 0034: the line in the letterbox's top bar for the part of the story this stop is in.
    # Stops of one chapter repeat it, and the frame keeps it up across them rather than
    # re-announcing it; scripts/check_registry.py holds it to forty characters.
    "chapter",
    # Spec 0040: the dashed ring at Mercury's distance on a star system's stage, for scale. Drawn by
    # scene/systems.js while this stop is up; check_registry.py allows it only on a system stage.
    "mercury_ring",
    # 2026-10-05, what a stop adds to the scene. `figures`, `figure_stars`, `ecliptic`: the
    # constellation figures scene/figures3d.js draws in one stroke, how many of each figure's
    # brightest stars it names, and the Sun's path. `aside_deg`: on a `{sky:, depth_ly:}` target,
    # how far round from the line to the Sun the camera stands. `zoom`: the stop's lens, under 1 a wider angle. `exposure`: the shutter of spec
    # 0067, held while the stop is up. `overlay`: a registry/overlays.yaml map over the Earth.
    # `over`: the place on the Earth the camera stands above. `live_note`: which live module's
    # own sentence goes under the card (clouds, aurora, lightning).
    "figures",
    "figure_stars",
    "ecliptic",
    "aside_deg",
    "zoom",
    "exposure",
    "overlay",
    "over",
    "live_note",
    # 2026-10-06, the trips a planetarium has. `look`: on a stop at the visitor's place, what the
    # sky view turns to from their own ground (the Moon, the brightest planet up, a station pass).
    # `seen_from`: the world the camera stands on the side of, kept there while the clock runs.
    "look",
    "seen_from",
    # 2026-10-06, the remaining shows. `portrait`: the Event Horizon Telescope's picture drawn at a
    # black hole's place (scene/portraits.js). `darkness`: the kind of sky a `look:` stop wears.
    # `names`: keep the other objects' names up in present mode, where a stop shows its own only.
    "portrait",
    "darkness",
    "names",
    # 2026-10-07 (internal #305, #410): the stop is reached by the one continuous flight up the
    # ladder (scene/climb.js), which hands the camera from stage to stage with its pose kept,
    # instead of by a cut through the veil. check_registry.py holds its stage and distance to the
    # chain of registry/stages.yaml `joins:`.
    "climb",
    # 2026-10-08 (internal #313, #290). `framing: sunrise`: the camera on the night side of a world
    # with air, the Sun about to clear the limb. `true_size: true`: the stop puts the planets' dots
    # away and the frame prints how wide the widest really is on this screen.
    "framing",
    "true_size",
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
# The return flight of a `return: true` trip: nineteen decades at ui/trip.js RETURN_MS_PER_DECADE
# (measured 2026-10-08 on the roof trip: 23.8 s with four screenshots taken on the way).
RETURN_ESTIMATE_MS = 21000
SETTLE_MS = 150


def words(text: str) -> int:
    return len(str(text or "").split())


def dwell_ms(body: str) -> int:
    return max(DWELL_MIN_MS, min(DWELL_MAX_MS, DWELL_BASE_MS + words(body) * DWELL_PER_WORD_MS))


def iso_instant(value):
    """A `time:` written unquoted in the YAML arrives as a datetime (PyYAML reads timestamps), and
    `json.dumps(default=str)` would write it `2027-08-02 10:07:00+00:00`, a form Date.parse is not
    promised to read. The mirror carries the one form it is: `2027-08-02T10:07:00Z`."""
    if isinstance(value, datetime):
        dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%dT00:00:00Z")
    return value


# THE ONE NUMBER A CARD MAY NOT TYPE (spec 0040 req 7). "{exoplanet_count}" in a card's body is the
# number of planets in site/data/exoplanets.csv, counted here when the mirror is written, so the card
# and the layer it describes can never disagree. Grouped with the narrow no-break space every number
# in the app uses (copy/en.js groupDigits, docs/design-language.md). check_registry.py refuses a
# planet count typed as digits.
EXOPLANET_COUNT = "{exoplanet_count}"
NNBSP = "\u202f"


def grouped(n: int) -> str:
    return f"{n:,}".replace(",", NNBSP)


_count_cache: list[str] = []


def exoplanet_count() -> str:
    if not _count_cache:
        rows = read_rows()
        if rows is None:
            raise SystemExit("gen_tours_js: a card names {exoplanet_count} and site/data/exoplanets.csv "
                             "is missing or empty, so there is nothing to count")
        _count_cache.append(grouped(len(rows)))
    return _count_cache[0]


def expand_card(card):
    if not isinstance(card, dict) or EXOPLANET_COUNT not in str(card.get("body") or ""):
        return card
    return {**card, "body": str(card["body"]).replace(EXOPLANET_COUNT, exoplanet_count())}


def stop_of(stop: dict, defaults: dict) -> dict:
    out = pick(stop, STOP_FIELDS)
    if "card" in out:
        out["card"] = expand_card(out["card"])
    if "time" in out:
        out["time"] = iso_instant(out["time"])
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
    # The way home is part of the trip's stated length.
    if out.get("return") is True:
        out["estimate_ms"] += RETURN_ESTIMATE_MS
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
            "The headings the picker lists trips under, in the registry's order; a trip's `group` "
            "names one. A group with no trip is here too and is not drawn.",
            "TOUR_GROUPS",
            [pick(g, GROUP_FIELDS) for g in (doc.get("groups") or [])],
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
    # No leading spaces (2026-10-06): this file is in the first visit's bytes, and at two spaces a
    # level 38 kB of its 167 were indentation (registry/budgets.yaml first_visit_bytes).
    indent=0,
)


# ---------------------------------------------------------------------------------------------
# THE INDEX (2026-10-06, internal #405): what the first visit carries about the trips.
#
# tours.js is 128 kB, and a visit that takes no trip needs none of its stops: the home page draws
# one card per trip. So the boot graph imports tours-index.js -- the picker's headings and one small
# row per trip -- and tours.js is fetched with ui/trip.js when a trip is opened, deep-linked or
# planned (ui/tripgate.js). The row is the card's: the title and blurb, the group it is listed
# under, `next`, how many stops the registry gives it and how long they run (the card's line until
# the trip has been planned against today's sky), and the event type an event trip is timed by
# (ui/trippicker.js eventTypeOf, which reads the same thing from a full trip's stops).
INDEX_FIELDS = ("id", "title", "blurb", "group", "next", "requires_observer", "min_stops")
EVENT_REF = re.compile(r"^([a-z0-9-]+)\.next$")


def event_of(trip: dict):
    for stop in trip.get("stops") or []:
        when = stop.get("time")
        # A stop that BORROWS an event's instant for its picture (`borrowed: true`, internal #384:
        # the living Earth at a solstice) does not make its trip an event trip.
        ref = when.get("event") if isinstance(when, dict) and when.get("borrowed") is not True else None
        m = EVENT_REF.match(str(ref or ""))
        if m:
            return m.group(1)
    return None


def index_row(trip: dict) -> dict:
    out = pick(trip, INDEX_FIELDS)
    out["count"] = len(trip["stops"])
    out["estimate_ms"] = trip["estimate_ms"]
    event = event_of(trip)
    if event:
        out["event"] = event
    return out


def render_index(doc: dict) -> list[tuple[str, str, object]]:
    full = render(doc)
    groups = next(row for row in full if row[1] == "TOUR_GROUPS")
    tours = next(row for row in full if row[1] == "TOURS")[2]
    return [
        groups,
        (
            "One row per trip, for its card: no stops. `count` and `estimate_ms` are the registry's, "
            "before a stop is dropped for today's sky; `event` is the type an event trip is timed by.",
            "TOURS_INDEX",
            [index_row(t) for t in tours],
        ),
    ]


INDEX_HEADER = """// GENERATED from registry/tours.yaml by scripts/gen_tours_js.py. Do not edit.
//
// `python3 scripts/gen_tours_js.py --check` fails CI if this file and the YAML disagree.
//
// THE TRIPS' INDEX: what a first visit carries about them (internal #405). One small row per trip,
// enough to draw its card; the stops are in data/tours.js, which is fetched with ui/trip.js when a
// trip is opened, deep-linked or planned (ui/tripgate.js). Nothing in the boot graph may import
// data/tours.js: tests/test_first_visit_bytes.mjs counts it.
"""

INDEX = Mirror(
    source="registry/tours.yaml",
    target="site/js/data/tours-index.js",
    header=INDEX_HEADER,
    render=render_index,
    what="tours-index.js",
    indent=0,
)


# ---------------------------------------------------------------------------------------------
# THE WORDS A TRIP IS FOUND BY (2026-10-07, public #312): its stops' titles, for the search box.
#
# "apollo" should find "Where we have landed on the Moon", and neither that title nor its blurb
# says Apollo: its stops do. The index above is in the first visit's bytes and stays as small as
# the card needs; this third mirror is fetched with ui/searchrows.js when the search field is first
# focused. One lower-cased string per trip: the stops' titles and what they are about, each word once.
def words_row(trip: dict) -> str:
    seen: list[str] = []
    for stop in trip.get("stops") or []:
        card = stop.get("card") or {}
        title = card.get("title") if isinstance(card, dict) else None
        # And what the stop is about: its own id and its target's (`apollo-11`, `lunokhod-1`), which
        # is where the names are when the title is "The first people to visit".
        target = stop.get("target") if isinstance(stop.get("target"), dict) else {}
        about = " ".join(str(v) for k, v in target.items() if k in ("id", "name", "world") and isinstance(v, str))
        for word in re.findall(r"[a-z0-9]+", f"{title or ''} {stop.get('id') or ''} {about}".lower()):
            if len(word) > 2 and word not in seen:
                seen.append(word)
    return " ".join(seen)


def render_words(doc: dict) -> list[tuple[str, str, object]]:
    tours = next(row for row in render(doc) if row[1] == "TOURS")[2]
    return [
        (
            "A trip's id -> the words of its stops' titles, lower-cased, each once.",
            "TOUR_WORDS",
            {t["id"]: words_row(t) for t in tours},
        ),
    ]


WORDS_HEADER = """// GENERATED from registry/tours.yaml by scripts/gen_tours_js.py. Do not edit.
//
// `python3 scripts/gen_tours_js.py --check` fails CI if this file and the YAML disagree.
//
// THE WORDS A TRIP IS FOUND BY (public #312): its stops' titles, so that "apollo" finds the trip to
// the Moon's landing sites. Fetched with ui/searchrows.js on the search field's first focus; never
// in the boot graph (tests/test_boot_diet.mjs).
"""

WORDS = Mirror(
    source="registry/tours.yaml",
    target="site/js/data/tours-words.js",
    header=WORDS_HEADER,
    render=render_words,
    what="tours-words.js",
    indent=0,
)


if __name__ == "__main__":
    # All three mirrors, and --check fails if any is stale.
    sys.exit(max(MIRROR.main(sys.argv[1:]), INDEX.main(sys.argv[1:]), WORDS.main(sys.argv[1:])))
