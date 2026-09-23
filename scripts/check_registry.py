#!/usr/bin/env python3
"""Validate registry/*.yaml. Unknown is refused, never defaulted.

Spec 0002 requirement 10: a layer naming a propagator, source or model that no registry
knows fails here, because a value that outruns the table must stop the build rather than
resolve to something plausible. The same rule `policies/taste.yaml` states in the control
plane: an unlisted preset is refused, not averaged, because middling is the one outcome
nobody would investigate.

Stdlib plus PyYAML. Every dependency here is one more thing between a contributor and a
green check on a documentation change.
"""

from __future__ import annotations

import datetime
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
REG = ROOT / "registry"

# The six propagators of spec 0002. A seventh is a new file under app/propagators/ AND a
# line here -- deliberately two edits, so adding one is a decision rather than a typo.
PROPAGATORS = {"sgp4", "kepler", "sampled", "body", "fixed", "ascent", "static"}
POSITION_CLASSES = {"measured", "inferred", "illustrative"}
MOMENTS = {"wonder", "now", "next"}
STYLE_KINDS = {"glyph", "model"}
CADENCE_SUFFIXES = ("m", "h")

# --- registry/rockets.yaml, the whole vocabulary a row may use -----------------------------
# Frozen here on purpose. A shape the builder cannot draw must stop the build, because the
# alternative is a rocket silently drawn as something it is not -- which is the one failure this
# feature exists to prevent. Adding a value is two edits: this set and site/js/scene/models.js.
BOOSTER_SHAPES = {
    "none",
    "liquid_core_clone",
    "liquid_conical",
    "liquid_cylindrical",
    "solid_slim",
    "solid_fat",
    "solid_clustered",
    "flared_base",
}
TOP_KINDS = {"fairing", "capsule", "capsule_tower", "integrated_ship", "none"}
TAPERS = {"tube", "stepped", "hammerhead", "tapered"}
ENGINE_PATTERNS = {"single", "twin", "quad", "octaweb", "ring", "dense_ring", "unknown"}
STANDS_FOR = {"variant", "family"}
EVIDENCE_CLASSES = {"measured", "inferred"}
MATCH_KINDS = {"full_name", "family", "provider"}
# Nothing flying is shorter than a Kuaizhou or taller than a Starship. A row outside this is a
# unit mistake -- feet for metres, or a booster length written into height_m -- not a rocket.
MIN_HEIGHT_M, MAX_HEIGHT_M = 5, 150
HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")

# --- registry/layers.yaml, the reserved literals -------------------------------------------
# A layer whose records are checked into this repository has no upstream, and a sources.yaml row
# demands url, parser, cadence, freshness_max, outputs and attribution -- inventing those would be
# a lie in the file whose whole job is evidence. So `bundled` is a source, by name.
BUNDLED_SOURCE = "bundled"
# And a layer whose records each answer for themselves says so instead of naming one value that is
# true of half of them. `deep-space` states `sampled` today while its own records carry `kepler`
# too; data/layers.js already carries the comment admitting it.
PER_RECORD = "per-record"

# --- registry/oddities.yaml, the whole vocabulary a row may use -----------------------------
# Frozen for the same reason the rocket sets are: a value that outruns the table must stop the
# build rather than resolve to something plausible. Every refusal below is one refusal in
# different clothes -- a row must not be able to say something it cannot support.
ODDITY_KLASS = "oddity"
WHERE_KINDS = {"in_orbit", "on_surface", "attached", "came_home", "unknown"}
# `inherit` is not a certainty, it is an instruction: take the carrier's, never better.
ODDITY_POSITION_CLASSES = {"measured", "inferred", "illustrative", "inherit"}
ODDITY_STANDS_FOR = {"variant", "family", "generic"}
# How an object's own position came to be known. `unsurveyed` is a real answer.
ODDITY_HOW = {"surveyed", "photogrammetric", "orbital_imaging", "unsurveyed", "map_reference"}
# The reserved literal, exactly as `livery: unknown` is in rockets.yaml. It means nobody has ever
# published a number for THIS object's own position -- not "a big number we would rather not
# write". It pairs with `unsurveyed` (nobody looked) and with a LOCATING `how` (somebody looked,
# and published no error bar) -- the golf balls are the second, and writing 40 there because the
# second shot went 40 yards is exactly the invented decimal point this literal exists to prevent.
# It cannot pair with `surveyed`, because a survey is a number.
PRECISION_UNKNOWN = "unknown"
PRECISION_UNKNOWN_FORBIDDEN_HOW = {"surveyed"}
# Shapes a builder can draw. `generic` is ALWAYS legal: it is what makes the eleventh object a row
# rather than a blocked pull request, and the card says "we have no shape for this one" out loud.
# Adding a real one is two edits, this set and site/js/scene/models.js -- and today there are no
# real ones at all, because the geometry is the next pull request and a row may not claim a shape
# that does not exist.
ODDITY_PLACEHOLDER_SHAPES = {"generic"}
# The builders that now exist. This set and the ODDITY_BUILDERS table in site/js/scene/models.js
# are the two edits, and they are held together by MEASUREMENT rather than by discipline:
# tests/test_contract.mjs builds every name in the shipped data against modelVariants().oddity and
# fails on a name either side does not have. A frozen set that nobody measures is a comment.
ODDITY_REAL_SHAPES = {
    "golden-record",
    "wrapped-photo",
    "disc-stack",
    "golf-balls",
    "minifigures",
    "roadster",
    "flash-handle",
}
ODDITY_SHAPES = ODDITY_REAL_SHAPES | ODDITY_PLACEHOLDER_SHAPES
# Which way a drawn shape points. Only two are offered, and neither is a measurement: `fixed` is
# scene/models.js's constant seeded from the record id -- what an object whose attitude nobody
# knows gets by default -- and `nadir` turns the shape's flank to the world, which is where the
# camera arrives from. A row states one when the drawing is only legible one way up. Surface rows
# may not: they stand on the ground because they are on the ground, and that IS a measurement.
ODDITY_ATTITUDES = {"fixed", "nadir"}
ODDITY_GROUNDED_KINDS = {"on_surface", "came_home"}
ODDITY_MAX_TRIS = 2000
# The card's own cap (site/js/ui/cards.js MAX_FIRST_SENTENCE), enforced where the string is
# WRITTEN rather than where it is read, because truncating a sentence at 160 characters is how a
# card ends up saying half of something.
MAX_SENTENCE = 160
# A claim that is true on a date and not forever. `still` is deliberately NOT here: measured
# against the real rows it fires on "the golf balls are still lying there" and "the plastic and
# the paper are still at Descartes", neither of which is a claim about a date -- and a guard whose
# first act is a false alarm is a guard that gets switched off.
TIME_RELATIVE = (
    "as of",
    "currently",
    "today",
    "this week",
    "this month",
    "right now",
    "so far",
    "has not been announced",
    "no end-of-mission",
)

# --- registry/sites.yaml -------------------------------------------------------------------
SITE_CLASSES = {"dish", "surface"}
# What a landing site is drawn as. Adding one is three edits and deliberately so: this set,
# BUILDERS.site in site/js/scene/models.js, and bySiteClass in site/js/scene/realmodels.js (or a
# `bySite` entry, for a model of the vehicle itself, which is what `lunar-module` is).
# tests/test_landing_sites.mjs draws every row and fails one that reaches none of them.
SITE_SHAPES = {"lander", "rover", "lunar-module"}
# The reserved literal for a coordinate nobody wrote a source down for. Allowed ONLY for the rows
# that predate the rule (2026-09-22), by id: a new landing site cites a reference or does not
# ship. When one of these is matched to a reference, its id comes out of this set -- the check
# below refuses a set member that has started citing something, so the set cannot go stale.
SITE_UNCITED = "uncited"
UNCITED_SITES = frozenset({"apollo-11", "apollo-17", "change-4", "jezero", "elysium", "utopia"})
# Luna 2 hit the Moon on 13 September 1959. A landing date before it is a typo, not a landing.
FIRST_ARRIVAL = datetime.date(1959, 9, 13)


def dimension(where: str, holder: dict, key: str, label: str, ceiling: float) -> None:
    """An OPTIONAL length or diameter, if it is written at all, is a positive number in metres.

    height_m, core_dia_m and boosters.dia_m were checked from the first day and these were not,
    which meant `top.len_m: "long"` validated and then reached scene/models.js, where every
    arithmetic on it is NaN: measured in the browser, a mutated row built 6 meshes of NaN
    geometry against the good row's 304 triangles -- a rocket drawn as nothing at all, while the
    card went on saying "drawn from published dimensions". A guard that validates the required
    fields and waves the optional ones through is the shape of gap this file exists to close.

    `ceiling` bounds it against the row's own height or core diameter, because a fairing longer
    than the rocket it sits on is a typo and not a fairing.
    """
    if key not in holder:
        return
    v = holder.get(key)
    if not isinstance(v, (int, float)) or isinstance(v, bool) or v <= 0:
        fail(where, f"{label} is {v!r}; it must be a positive number of metres or be left out "
                    f"(absent is a real answer here -- the builder falls back to a proportion)")
    elif v > ceiling:
        fail(where, f"{label} is {v}, over the {ceiling:g} m this row can support -- "
                    f"a unit mistake, or a number written into the wrong field")

def is_number(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)



def time_relative(text: str) -> str | None:
    low = str(text or "").lower()
    for phrase in TIME_RELATIVE:
        if phrase in low:
            return phrase
    return None


TOUR_TARGET_KEYS = ("record", "layer", "world", "site")
TOUR_PACING = {"auto", "reader"}
TOUR_CLOCKS = {"as-found", "live", "freeze"}
TOUR_DRIFTS = {"toward-light", "away", "none"}
TOUR_EASES = {"auto", "ui", "inout", "cruise", "linear"}
# `fallback` is in the design and is not shipped: the one stop that needed it was the `view:`
# stop, which is not shipped either. Refusing it by name is better than accepting a value the
# state machine would silently treat as `drop`.
TOUR_ON_UNRESOLVED = {"drop", "hold"}
# Trips may name any world or any rung of the ladder since spec 0028 step 8: ui/trip.js saves the
# stage on begin, calls ctx.setStage(tour.stage), and restores it on leave; the rig is re-taught its
# world at every stop. Filled in main() from worlds.yaml and stages.yaml.
TOUR_STAGES = {"earth"}
# WHERE A WORLD IS DRAWN TRUE (2026-09-22, the trip out past Jupiter). A stop may name its own
# `stage:`, and a stop about a world has to be flown on a stage that draws that world where it is:
# ui/trip.js flies to a world's TRUE place, and from Earth's stage Saturn is drawn nearer and
# larger along its true direction and Titan around the enlarged disc (scene/worlds.js
# VIEW_COMPRESSED and VIEW_WITH_PARENT), so the flight would arrive at empty sky 1.4 billion km
# past the drawing. scene/worlds.js draws a world true from the stages that squeeze nothing
# (compressesFrom: the Sun's and every rung of the ladder), from its own stage and its own system
# (sameSystem: a planet and its moons), and always for the Sun and the Moon (VIEW_TRUE). The
# parents are filled in main() from worlds.yaml, the rungs from stages.yaml.
TOUR_WORLD_PARENTS: dict[str, str] = {}
TOUR_UNSQUEEZED_STAGES = {"sun"}
TOUR_ALWAYS_TRUE_WORLDS = {"sun", "moon"}
TOUR_MAX_TITLE = 60
TOUR_MIN_STOPS_FLOOR = 3
# The camera's own world-clearance floor (scene/camera.js WORLD_CLEARANCE). Below it the rig
# pushes the camera back out and the framing this row asked for is silently ignored.
TOUR_MIN_FRAME_RADII = 1.02

# The dwell, and it is computed from the WORD COUNT and never from the flight duration --
# scripts/gen_tours_js.py writes the same three numbers into the mirror. A drift that cannot
# finish inside its own dwell, with the 0.4 s lead before it starts and the 1.5 s tail that lets
# the shot settle before the cut, is a drift the shot cannot hold.
TOUR_DWELL_BASE_MS = 2500
TOUR_DWELL_PER_WORD_MS = 333
TOUR_DWELL_MIN_MS = 8000
TOUR_DWELL_MAX_MS = 20000
TOUR_DRIFT_MARGIN_S = 1.9
# A human may lengthen a dwell freely and may not rush a reader: a written dwell more than this
# far below the computed one is refused.
TOUR_DWELL_SLACK = 0.30

# The layers whose records are ALWAYS a drawing. registry/layers.yaml says it in `launches`'s own
# row: the real ascent track is not published, so the arc is illustrative and the card prints
# that. A stop there may not write copy that claims otherwise. This is what survives of the
# design's hand-authored `class:` field, which is refused below -- the intent was right and the
# mechanism was a field a human could use to contradict the record.
TOUR_ILLUSTRATIVE_LAYERS = {"launches"}
TOUR_CERTAINTY_WORDS = ("exactly", "precisely", "measured", "to the metre", "confirmed")

# Jargon a beginner's card may not use unless registry/glossary.yaml can explain it. THE CHECK IS
# THE PAIR, not the list: a word here that IS in the glossary passes, because the app can say what
# it means. Every word below is genuinely absent from the glossary today, which is what gives the
# guard teeth -- a stoplist whose every entry is already covered would never fire.
#
# Trip copy is the most naive surface in the product, written for somebody who has never used it,
# and jargon re-enters through exactly this door one word at a time.
TOUR_JARGON = (
    "delta-v",
    "sun-synchronous",
    "apoapsis",
    "periapsis",
    "true anomaly",
    "argument of perigee",
    "osculating",
    "barycentre",
    "libration",
    "station-keeping",
    "insertion burn",
    "right ascension",
    "semi-major axis",
)


def tour_dwell_ms(body: str) -> int:
    n = len(str(body or "").split())
    return max(
        TOUR_DWELL_MIN_MS,
        min(TOUR_DWELL_MAX_MS, TOUR_DWELL_BASE_MS + n * TOUR_DWELL_PER_WORD_MS),
    )


def tour_drawn_true(world: str, stage: str) -> bool:
    """Does scene/worlds.js draw `world` at its true place and size when the map is centred on
    `stage`? The same four answers as that file's update(), in the same order."""
    if stage in TOUR_UNSQUEEZED_STAGES or world == stage or world in TOUR_ALWAYS_TRUE_WORLDS:
        return True

    def system(w: str) -> str:
        parent = TOUR_WORLD_PARENTS.get(w) or ""
        return parent if parent and parent != "sun" else w

    return system(world) == system(stage)


def unreachable_oddities(oddities_doc: dict) -> dict:
    """The rows a `target: {record: ...}` may never name, each with the reason a stop can act on.

    A cinematic tour resolves each stop through `ctx.recordById(...)`, and two of the eight rows
    in registry/oddities.yaml deliberately do not answer to it:

      * an `attached` row is drawn as a child of its carrier's model and is not a record at all,
        so `recordById('voyager-golden-record')` is null. A tour that names it loses its best stop
        SILENTLY, because an unresolved stop is dropped and the count is printed after. Target the
        CARRIER instead -- which is also where the object physically is.
      * an `unknown` row has no propagator by construction, so there is nowhere to fly to. A
        camera move to a record with no position is a camera move to the origin.

    Both are one-line mistakes that look right in YAML and fail as a stop that quietly is not
    there, which is why they are refused at the point the file is written.
    """
    out = {}
    for r in (oddities_doc.get("oddities") or []):
        kind = (r.get("where") or {}).get("kind")
        if kind == "attached":
            carrier = (r.get("where") or {}).get("to")
            out[r.get("id")] = (
                f"it is not a record -- it is drawn on its carrier's model. "
                f"Target `{carrier}` instead, which is where the object actually is"
            )
        elif kind == "unknown":
            out[r.get("id")] = (
                "nobody knows where it is, so it has no position and there is nowhere to fly to"
            )
    return out


# A card is printed exactly as written. This file's comments, and the YAML's, write ` -- ` for a
# dash, and one card borrowed it: "above its disc -- a view nobody has had" reached the screen as
# two hyphens in the middle of a sentence.
TOUR_DOUBLE_HYPHEN = ("the screen prints that as two hyphens. Write a comma, a colon or a real "
                      "dash; `--` is for comments")


def check_tours(oddities_doc: dict, layer_ids: set, world_ids: set, site_ids: set,
                glossary: set) -> None:
    """registry/tours.yaml: a trip may not promise a stop it will not deliver.

    That is the whole file, and every refusal below is it in different clothes. Two of them exist
    because two REGISTRIES can lie about each other -- a trip naming an oddity that is not a
    record, and a trip id colliding with a layer id -- and those are the ones a reviewer should
    read hardest, because nothing else in the repository would notice.

    tests/test_refusals.py breaks each rule on purpose. When registry/tours.yaml does not exist
    this does nothing at all: the guard predates the file it guards and outlived being the only
    thing in it.
    """
    path = REG / "tours.yaml"
    if not path.exists():
        return
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("tours.yaml", f"will not parse: {exc}")
        return

    unreachable = unreachable_oddities(oddities_doc)
    defaults = doc.get("defaults") or {}
    tours = doc.get("tours")
    if not isinstance(tours, list):
        fail("tours.yaml", "no `tours:` list")
        return

    # THE GROUPS ARE A TABLE, AND EVERY TRIP NAMES A ROW OF IT (spec 0029). The picker draws one
    # heading per group that has a trip; a trip whose group is not a row has nowhere to be drawn,
    # and the panel's rule is that every trip is listed. The `display` string is printed as it
    # is, so it gets the same two-hyphen refusal a title does.
    group_ids: set[str] = set()
    groups = doc.get("groups")
    if not isinstance(groups, list) or not groups:
        fail("tours.yaml", "no `groups:` list; the picker has no headings to list trips under")
        groups = []
    for g in groups:
        if not isinstance(g, dict) or not g.get("id"):
            fail("tours.yaml", f"a group row has no id: {g!r}")
            continue
        gid = str(g["id"])
        gwhere = f"tours.yaml[groups/{gid}]"
        if gid in group_ids:
            fail(gwhere, "duplicate group id")
        group_ids.add(gid)
        if gid in layer_ids:
            fail(gwhere, f"a group id may not be a layer id: `{gid}` is a row in layers.yaml, and "
                         f"a cross-reference by bare id would resolve to the wrong registry")
        if not g.get("display"):
            fail(gwhere, "no `display:`; it is the heading a visitor reads")
        elif "--" in str(g["display"]):
            fail(gwhere, f"the display has \"--\"; {TOUR_DOUBLE_HYPHEN}")
        if not isinstance(g.get("order"), int) or isinstance(g.get("order"), bool):
            fail(gwhere, f"`order: {g.get('order')!r}` is not an integer; it is where the heading "
                         f"sits in the picker")

    # Every trip id, before the loop: `next:` may name a trip written further down the file.
    trip_ids = {t.get("id") for t in tours if isinstance(t, dict) and t.get("id")}

    seen_trips: set[str] = set()
    for tour in tours:
        if not isinstance(tour, dict):
            fail("tours.yaml", f"a trip is not a mapping: {tour!r}")
            continue
        tid = tour.get("id")
        where = f"tours.yaml[{tid}]"
        if not tid:
            fail("tours.yaml", "a trip has no id")
            continue
        if tid in seen_trips:
            fail(where, "duplicate trip id")
        seen_trips.add(tid)

        # TWO REGISTRIES, ONE WORD, TWO MEANINGS. `oddities` is a layer; the trip that visits it
        # is `strangest-things`. Cheap to refuse, and it prevents the whole class of bug where
        # somebody cross-references by bare id and gets the other registry's row.
        if tid in layer_ids:
            fail(where, f"a trip id may not be a layer id: `{tid}` is a row in layers.yaml, and a "
                        f"cross-reference by bare id would resolve to the wrong registry")

        title = tour.get("title")
        if not title:
            fail(where, "no `title:` -- it is what a visitor reads before deciding")
        elif len(str(title)) > TOUR_MAX_TITLE:
            fail(where, f"title is {len(str(title))} characters, over {TOUR_MAX_TITLE}")
        if not tour.get("blurb"):
            fail(where, "no `blurb:` -- one sentence saying what this is")
        for label in ("title", "blurb"):
            if "--" in str(tour.get(label) or ""):
                fail(where, f"the {label} has \"--\"; {TOUR_DOUBLE_HYPHEN}")

        group = tour.get("group")
        if not group:
            fail(where, "no `group:`; the picker has nowhere to put it, and it lists every trip")
        elif group not in group_ids:
            fail(where, f"`group: {group}` is not a row of `groups:`; the picker has nowhere to "
                        f"put it, and it lists every trip")

        # The end card offers `next:` first, so it must be a trip, and not this one: a trip that
        # names itself would offer "Next: <its own title>" over the "Watch it again" button.
        nxt = tour.get("next")
        if nxt is not None:
            if nxt == tid:
                fail(where, "`next:` names the trip itself; the end card already offers a replay")
            elif nxt not in trip_ids:
                fail(where, f"`next: {nxt}` is not a trip in this file, so the end card would "
                            f"offer nothing where it promised a trip")

        pacing = tour.get("pacing", defaults.get("pacing"))
        if pacing not in TOUR_PACING:
            fail(where, f"pacing `{pacing}` is not one of {sorted(TOUR_PACING)}")

        stage = tour.get("stage", defaults.get("stage"))
        if stage not in TOUR_STAGES:
            fail(where, f"stage `{stage}` is neither a worlds.yaml world nor a stages.yaml rung, "
                        f"so ctx.setStage would refuse it and the trip would fly every stop on the "
                        f"stage the visitor happened to be on, with its distances in the wrong unit")

        clock = tour.get("clock", defaults.get("clock"))
        if clock not in TOUR_CLOCKS:
            fail(where, f"clock `{clock}` is not one of {sorted(TOUR_CLOCKS)}")

        requires = tour.get("requires") or []
        if not isinstance(requires, list):
            fail(where, "`requires:` must be a list of layer ids")
            requires = []
        for lid in requires:
            if lid not in layer_ids:
                fail(where, f"requires layer `{lid}`, which has no layers.yaml row")

        # Freezing the clock flips it from live to scrub, which drops glyph re-propagation from
        # every 100 ms to EVERY FRAME (site/js/main.js). With `active` on that is eleven thousand
        # SGP4 propagations per frame.
        if clock == "freeze" and "active" in requires:
            fail(where, "`clock: freeze` on a trip that requires `active`: freezing flips the "
                        "clock to scrub, which re-propagates every object every frame instead of "
                        "every 100 ms, and `active` is eleven thousand of them")

        min_stops = tour.get("min_stops", defaults.get("min_stops", TOUR_MIN_STOPS_FLOOR))
        if not isinstance(min_stops, int) or min_stops < TOUR_MIN_STOPS_FLOOR:
            fail(where, f"`min_stops: {min_stops!r}` -- below {TOUR_MIN_STOPS_FLOOR} it is a link, "
                        f"not a trip")
            min_stops = TOUR_MIN_STOPS_FLOOR

        stops = tour.get("stops")
        if not isinstance(stops, list) or not stops:
            fail(where, "no `stops:` list")
            continue
        if len(stops) < min_stops:
            fail(where, f"{len(stops)} stops, below its own `min_stops: {min_stops}` -- a trip that "
                        f"cannot reach its own floor on a perfect day will never reach it")

        seen_stops: set[str] = set()
        for n, stop in enumerate(stops, start=1):
            check_tour_stop(tour, stop, n, seen_stops, defaults, unreachable,
                            layer_ids, world_ids, site_ids, glossary)


def check_tour_stop(tour: dict, stop: dict, n: int, seen_stops: set, defaults: dict,
                    unreachable: dict, layer_ids: set, world_ids: set, site_ids: set,
                    glossary: set) -> None:
    tid = tour.get("id")
    where = f"tours.yaml[{tid}] stop {n}"
    if not isinstance(stop, dict):
        fail(where, f"is not a mapping: {stop!r}")
        return
    sid = stop.get("id")
    if not sid:
        fail(where, "no `id:` -- a stop is addressable and needs a name")
    elif sid in seen_stops:
        fail(where, f"duplicate stop id `{sid}` within this trip")
    else:
        seen_stops.add(sid)
    where = f"tours.yaml[{tid}] stop {n} ({sid})" if sid else where

    # THE FIELD THAT DOES NOT EXIST. The design gave each stop a hand-authored
    # `class: measured | inferred | illustrative | sample`. A hand-authored class can only repeat
    # what the record already knows or contradict it, and the validator would have passed the
    # contradiction -- a field whose only power is to state a falsehood the app knows better than.
    if "class" in stop:
        fail(where, "`class:` is not a field here. The card prints the RECORD's own class; a "
                    "hand-written one can only contradict it, and the validator could not tell "
                    "which of the two was right")

    target = stop.get("target")
    if not isinstance(target, dict):
        fail(where, "no `target:` mapping")
        return
    named = [k for k in TOUR_TARGET_KEYS if k in target]
    if len(named) != 1:
        fail(where, f"`target:` names {len(named)} of {list(TOUR_TARGET_KEYS)} "
                    f"({', '.join(named) or 'none'}); it must name exactly one. A target with two "
                    f"keys resolves to something plausible, which is the failure this file exists "
                    f"to prevent")
        return
    kind = named[0]
    value = target[kind]

    # The stage this stop is flown on: its own, or its trip's. ui/trip.js reads it the same way.
    stop_stage = stop.get("stage")
    if stop_stage is not None and stop_stage not in TOUR_STAGES:
        fail(where, f"`stage: {stop_stage}` is neither a worlds.yaml world nor a stages.yaml rung, "
                    f"so ctx.setStage would refuse it and this stop would be flown on whatever "
                    f"stage the stop before it left, with its distances in that stage's unit")
    flown_on = stop_stage or tour.get("stage", defaults.get("stage"))

    if kind == "record":
        if value in unreachable:
            fail(where, f"targets `{value}` and {unreachable[value]}")
    elif kind == "world":
        if value not in world_ids:
            fail(where, f"targets world `{value}`, which has no worlds.yaml row")
    elif kind == "site":
        if value not in site_ids:
            fail(where, f"targets site `{value}`, which has no sites.yaml row")
    elif kind == "layer":
        if value not in layer_ids:
            fail(where, f"targets layer `{value}`, which has no layers.yaml row")
        if "catalog" not in target and "query" not in target:
            fail(where, f"targets layer `{value}` and says nothing about WHICH member. Add "
                        f"`catalog:` (a NORAD number) or `query:`; a layer on its own is not a "
                        f"place the camera can go")
        if value in TOUR_ILLUSTRATIVE_LAYERS:
            body = str((stop.get("card") or {}).get("body") or "").lower()
            for word in TOUR_CERTAINTY_WORDS:
                if word in body:
                    fail(where, f"is on the `{value}` layer, whose own layers.yaml row says the "
                                f"track is a DRAWING, and its card says \"{word}\". A stop there "
                                f"may not write copy that claims certainty the layer cannot back")

    # A world's own record (`{record: titan}`) is flown to as the world, so the same rule holds.
    if kind in ("world", "record") and value in world_ids and flown_on in TOUR_STAGES \
            and not tour_drawn_true(value, flown_on):
        fail(where, f"targets the world `{value}` on the `{flown_on}` stage, where scene/worlds.js "
                    f"draws it nearer and larger than it is. The trip flies to where it truly is, so "
                    f"the camera would arrive at empty sky. Give the stop `stage: {value}`, or the "
                    f"stage of the planet it goes round")

    # `behind:` names a world the shot keeps in the picture. It has to be drawn true from the same
    # stage for the same reason the subject does: the direction the camera is pointed at is the
    # TRUE one, and from a squeezing stage a moon is not drawn along it.
    behind = stop.get("behind")
    if behind is not None:
        if behind not in world_ids:
            fail(where, f"`behind: {behind}` has no worlds.yaml row")
        elif behind == value:
            fail(where, f"`behind: {behind}` is the stop's own subject, so there is nothing to put "
                        f"behind it")
        elif flown_on in TOUR_STAGES and not tour_drawn_true(behind, flown_on):
            fail(where, f"`behind: {behind}` is drawn nearer and larger than it is from the "
                        f"`{flown_on}` stage, so pointing the camera along the true direction to it "
                        f"would not put it in the picture")

    needs = stop.get("needs_layer")
    if needs is not None and needs not in layer_ids:
        fail(where, f"`needs_layer: {needs}` has no layers.yaml row")

    on_unresolved = stop.get("on_unresolved", defaults.get("on_unresolved", "drop"))
    if on_unresolved not in TOUR_ON_UNRESOLVED:
        fail(where, f"`on_unresolved: {on_unresolved}` is not one of "
                    f"{sorted(TOUR_ON_UNRESOLVED)}. `fallback` is designed and not shipped, and a "
                    f"value the state machine would quietly treat as `drop` is worse than a "
                    f"refusal")

    drift = stop.get("drift", defaults.get("drift", "toward-light"))
    if drift not in TOUR_DRIFTS:
        fail(where, f"`drift: {drift}` is not one of {sorted(TOUR_DRIFTS)}")
    ease = stop.get("ease", defaults.get("ease", "auto"))
    if ease not in TOUR_EASES:
        fail(where, f"`ease: {ease}` is not one of {sorted(TOUR_EASES)}")

    frame_radii = stop.get("frame_radii", defaults.get("frame_radii"))
    if frame_radii is not None:
        if not is_number(frame_radii):
            fail(where, f"`frame_radii: {frame_radii!r}` must be a number")
        elif frame_radii < TOUR_MIN_FRAME_RADII:
            fail(where, f"`frame_radii: {frame_radii}` is inside the camera's own world-clearance "
                        f"floor of {TOUR_MIN_FRAME_RADII}: the rig would push the camera straight "
                        f"back out and this framing would be silently ignored")
    distance_km = stop.get("distance_km")
    if distance_km is not None and (not is_number(distance_km) or distance_km <= 0):
        fail(where, f"`distance_km: {distance_km!r}` must be a positive number of kilometres")

    card = stop.get("card")
    if not isinstance(card, dict):
        fail(where, "no `card:` -- a stop with no words is a camera move, not a stop")
        return
    title = card.get("title")
    body = card.get("body")
    if not title:
        fail(where, "the card has no `title:`")
    elif len(str(title)) > TOUR_MAX_TITLE:
        fail(where, f"card title is {len(str(title))} characters, over {TOUR_MAX_TITLE}")
    if not body:
        fail(where, "the card has no `body:`")
        return
    first = str(body).split(". ")[0]
    if len(first) > MAX_SENTENCE:
        fail(where, f"the card's first sentence is {len(first)} characters, over {MAX_SENTENCE} "
                    f"-- which is where ui/cards.js would truncate it, and half a sentence is how "
                    f"a card ends up saying half of something")
    low = str(body).lower() + " " + str(title or "").lower()
    for word in TOUR_JARGON:
        if word in low and word not in glossary:
            fail(where, f"the card says \"{word}\" and registry/glossary.yaml has no entry for it. "
                        f"Either add the term there -- two lines, written for a curious "
                        f"fourteen-year-old -- or say it in words a beginner already has")

    for label, text in (("title", title), ("body", body)):
        if "--" in str(text or ""):
            fail(where, f"the card's {label} has \"--\"; {TOUR_DOUBLE_HYPHEN}")

    dwell = stop.get("dwell_ms")
    computed = tour_dwell_ms(body)
    if dwell is not None:
        if not is_number(dwell):
            fail(where, f"`dwell_ms: {dwell!r}` must be a number of milliseconds")
        elif dwell < computed * (1 - TOUR_DWELL_SLACK):
            fail(where, f"`dwell_ms: {dwell}` is more than "
                        f"{int(TOUR_DWELL_SLACK * 100)}% below the {computed} ms this card's "
                        f"{len(str(body).split())} words need. A human may lengthen a dwell freely "
                        f"and may not rush a reader")
        else:
            computed = dwell

    drift_deg = stop.get("drift_deg", defaults.get("drift_deg", 0))
    rate = stop.get("drift_rate_deg_s", defaults.get("drift_rate_deg_s", 6))
    if not is_number(drift_deg) or drift_deg < 0:
        fail(where, f"`drift_deg: {drift_deg!r}` must be a number of degrees, zero or more")
    elif not is_number(rate) or rate <= 0:
        fail(where, f"`drift_rate_deg_s: {rate!r}` must be a positive number")
    elif drift_deg / rate > computed / 1000 - TOUR_DRIFT_MARGIN_S:
        fail(where, f"a {drift_deg} degree drift at {rate} deg/s takes "
                    f"{drift_deg / rate:.1f} s and this stop dwells for {computed / 1000:.1f} s. "
                    f"It must finish inside its own dwell with the 0.4 s lead and the 1.5 s tail "
                    f"that let the shot settle before the cut -- lengthen the card or slow the "
                    f"turn")


# The hooks scene/lod.js's caller implements. A rule naming anything else is refused: a rule
# nothing reads is a rule that silently does nothing, which is worse than no rule.
LOD_HOOKS = {"sky-panorama", "stars-3d", "galaxy-model"}


# The facts a world with no texture must carry, and what each is for on the card. `albedo` is
# there because it is what orders the flat colours from light to dark (scene/worlds.js); the rest
# are what the card prints -- `seen` is its "see it from here" line, because "you can see this
# one with your own eyes", the line every other world gets, is false of Pluto.
FLAT_WORLD_FACTS = ("radius", "albedo", "what", "colour", "seen")
READ_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def check_world_look_and_facts(w: dict, where: str) -> None:
    """A world is drawn as SOMETHING, and a world drawn from facts names where each fact was read.

    Pluto and Jupiter's four big moons ship no texture: their disc is one colour, and their card
    says what they are and how big from pages a person read on a given day. A fact with no page is
    a number nobody can check; a page with no date is a number nobody can re-check when the page
    changes. So a `look.flat` row must carry `facts:` for everything the card and the colour rest
    on, each with the page (`source:`), the day (`read:`) and what the page said (`says:`).
    """
    look = w.get("look") or {}
    flat = look.get("flat")
    if not look.get("textures") and flat is None:
        fail(where, "`look:` names neither `textures` nor a `flat` colour, so nothing says what to draw")
    facts = w.get("facts")
    if flat is not None:
        if not isinstance(flat, str) or not HEX.match(flat):
            fail(where, f"`look.flat` {flat!r} must be a colour written #rrggbb")
        if not isinstance(facts, dict):
            fail(where, "a flat-coloured world must carry `facts:` -- its colour and its card rest on them")
            return
        for key in FLAT_WORLD_FACTS:
            if key not in facts:
                fail(where, f"`facts.{key}` is missing; a flat-coloured world names where its {key} came from")
    if facts is None:
        return
    if not isinstance(facts, dict):
        fail(where, "`facts:` must be a mapping of fact -> {source, read, says}")
        return
    for key, fact in facts.items():
        at = f"{where}.facts.{key}"
        if not isinstance(fact, dict):
            fail(at, "must be {source, read, says}")
            continue
        if not str(fact.get("source") or "").startswith("https://"):
            fail(at, "no `source:` page (an https:// URL a reviewer can open)")
        # PyYAML reads an unquoted 2026-09-22 as a date; a quoted one stays a string. Both are fine.
        if not READ_DATE.match(str(fact.get("read") or "")):
            fail(at, "no `read:` date (YYYY-MM-DD), so nobody can tell when the page said it")
        if not str(fact.get("says") or "").strip():
            fail(at, "no `says:` -- what the page said, so a reviewer can find it on the page")


def check_world_mirror(worlds: list) -> None:
    """registry/worlds.yaml against its two hand mirrors: scene/worlds.js WORLDS and scene/stage.js STAGES.

    There is no generator for this registry -- a world row carries a measured texture mean, a view
    rule and a shader choice the YAML does not -- so the browser's copy is hand-kept, like the
    ladder rungs in check_stages(). Until 2026-09-22 nothing compared them, and adding Pluto and
    four moons means five rows written twice. This reads the JS with regular expressions and refuses
    any disagreement on id, parent, radius, unit_km or flat colour, in either direction.

    tests/test_growth.py runs this checker on a copy of the tree with no site/js in it, so a missing
    mirror is "cannot look", not a fail -- exactly as check_stages() treats stage.js.
    """
    worlds_js = ROOT / "site/js/scene/worlds.js"
    stage_js = ROOT / "site/js/scene/stage.js"
    if not worlds_js.exists() or not stage_js.exists():
        return
    rows = {w.get("id"): w for w in worlds if isinstance(w, dict) and w.get("id")}
    js = worlds_js.read_text(encoding="utf-8")
    drawn = {}
    for m in re.finditer(
        r"id:\s*'([a-z][a-z0-9-]*)',\s*display:\s*'[^']*',\s*parent:\s*'([a-z0-9-]*)',\s*radiusKm:\s*([0-9.]+),"
        r"(?P<rest>[\s\S]*?)look:\s*\{(?P<look>[^\n]*)\}", js):
        tint = re.search(r"tint:\s*0x([0-9a-fA-F]{6})", m.group("look"))
        drawn[m.group(1)] = {
            "parent": m.group(2),
            "radius": float(m.group(3)),
            "flat": "flat: true" in m.group("look"),
            "tint": tint.group(1).lower() if tint else None,
        }
    stages = {}
    for m in re.finditer(r"^\s*'?([a-z][a-z0-9-]*)'?:\s*\{\s*frame:\s*[A-Z_]+,\s*unitKm:\s*([0-9.e+]+)\s*\}",
                         stage_js.read_text(encoding="utf-8"), re.M):
        stages[m.group(1)] = float(m.group(2))

    for wid, w in rows.items():
        where = f"worlds.yaml[{wid}]"
        d = drawn.get(wid)
        if d is None:
            fail(where, "scene/worlds.js WORLDS has no row for it -- the browser would never draw it")
            continue
        if d["parent"] != (w.get("parent") or ""):
            fail(where, f"parent `{w.get('parent')}` but scene/worlds.js says `{d['parent']}`")
        radius = w.get("radius_km")
        if isinstance(radius, (int, float)) and abs(d["radius"] - float(radius)) > 1e-6 * float(radius):
            fail(where, f"radius_km {radius} but scene/worlds.js draws {d['radius']}")
        flat = (w.get("look") or {}).get("flat")
        if isinstance(flat, str) and HEX.match(flat):
            if not d["flat"]:
                fail(where, "`look.flat` here but scene/worlds.js waits for a texture map")
            elif d["tint"] != flat[1:].lower():
                fail(where, f"flat colour {flat} but scene/worlds.js draws #{d['tint']}")
        elif d["flat"]:
            fail(where, "scene/worlds.js draws it flat but this row has no `look.flat` colour")
        unit = w.get("unit_km")
        if wid not in stages:
            fail(where, "scene/stage.js STAGES has no row for it -- it could never be the centre")
        elif isinstance(unit, (int, float)) and abs(stages[wid] - float(unit)) > 1e-6 * float(unit):
            fail(where, f"unit_km {unit} but scene/stage.js says {stages[wid]}")
    for wid in drawn:
        if wid not in rows:
            fail("worlds.js", f"WORLDS row `{wid}` has no worlds.yaml row")


def check_stages(world_ids: set) -> list:
    """registry/stages.yaml: the ladder's rungs, and scene/stage.js's STAGES table must carry them.

    The mirror is hand-written (three rows), so the refusal reads the JS with a regular expression
    and compares ids and unit_km. A rung in the YAML that the browser has never heard of is a
    stage the card can name and the camera cannot reach.
    """
    path = REG / "stages.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("stages.yaml", f"will not parse: {exc}")
        return []
    stages = doc.get("stages")
    if not isinstance(stages, list):
        fail("stages.yaml", "no `stages:` list")
        return []
    seen = set()
    for st in stages:
        if not isinstance(st, dict):
            fail("stages.yaml", "a row is not a mapping")
            continue
        sid = st.get("id")
        where = f"stages.yaml[{sid}]"
        if not sid:
            fail("stages.yaml", "a row has no id")
            continue
        if sid in seen:
            fail(where, "duplicate id")
        seen.add(sid)
        if sid in world_ids:
            fail(where, "a rung may not reuse a world's id: a world is a stage already")
        unit = st.get("unit_km")
        if not isinstance(unit, (int, float)) or not unit > 0:
            fail(where, "`unit_km` must be a positive number")
        frame = str(st.get("frame") or "")
        world, _, kind = frame.rpartition("-")
        if world not in world_ids or kind != "inertial":
            fail(where, f"frame {frame!r} must be `<world>-inertial` naming a worlds.yaml row")
        if st.get("centre") not in world_ids:
            fail(where, f"centre `{st.get('centre')}` has no worlds.yaml row")
        if not st.get("display"):
            fail(where, "no `display:` name")
        if not st.get("reaches"):
            fail(where, "no `reaches:` line -- the breadcrumb has nothing to say about this rung")

    # The hand mirror in scene/stage.js. tests/test_growth.py runs this checker on a copy of the
    # tree that holds only registry/ and scripts/, so a missing mirror is "cannot look", not a fail.
    js_path = ROOT / "site/js/scene/stage.js"
    if not js_path.exists():
        return stages
    js = js_path.read_text(encoding="utf-8")
    mirror = {}
    for m in re.finditer(r"^\s*'?([a-z][a-z0-9-]*)'?:\s*\{[^}]*unitKm:\s*([0-9.e+]+)[^}]*ladder:\s*true", js, re.M):
        mirror[m.group(1)] = float(m.group(2))
    for st in stages:
        if not isinstance(st, dict) or not st.get("id"):
            continue
        sid = st["id"]
        if sid not in mirror:
            fail(f"stages.yaml[{sid}]", "scene/stage.js STAGES has no `ladder: true` row for it -- the mirror is stale")
        elif isinstance(st.get("unit_km"), (int, float)) and abs(mirror[sid] - float(st["unit_km"])) > 1e-3 * float(st["unit_km"]):
            fail(f"stages.yaml[{sid}]", f"unit_km {st['unit_km']} but scene/stage.js says {mirror[sid]}")
    for sid in mirror:
        if sid not in seen:
            fail("stage.js", f"STAGES row `{sid}` is a ladder rung with no stages.yaml row")
    return stages


def check_dso_hand() -> list:
    """registry/dso-hand.yaml: an object we place by hand names its source and has a distance."""
    path = REG / "dso-hand.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("dso-hand.yaml", f"will not parse: {exc}")
        return []
    md = doc.get("messier_distances") or {}
    if not md.get("source") or not md.get("table"):
        fail("dso-hand.yaml", "`messier_distances` needs `source:` and `table:`")
    elif not (ROOT / str(md["table"])).exists():
        fail("dso-hand.yaml", f"`messier_distances.table: {md['table']}` names a file that is not in the tree")
    objects = doc.get("objects")
    if objects is None:
        objects = []
    if not isinstance(objects, list):
        fail("dso-hand.yaml", "`objects:` must be a list")
        return []
    seen = set()
    for o in objects:
        if not isinstance(o, dict):
            fail("dso-hand.yaml", "an object row is not a mapping")
            continue
        oid = o.get("id")
        where = f"dso-hand.yaml[{oid}]"
        if not oid:
            fail("dso-hand.yaml", "an object row has no id")
            continue
        if oid in seen:
            fail(where, "duplicate id")
        seen.add(oid)
        if not o.get("source"):
            fail(where, "no `source:` -- a distance nobody can check is a distance nobody should draw")
        if not isinstance(o.get("what"), str) or not o["what"].strip() or "(" in o["what"]:
            fail(where, "no `what:` -- the plain words the card's sentence uses (\"dwarf spheroidal galaxy\"), not a catalogue code")
        d = o.get("dist_kly")
        if isinstance(d, list):
            ok = len(d) == 2 and all(isinstance(v, (int, float)) and v > 0 for v in d) and d[0] < d[1]
        else:
            ok = isinstance(d, (int, float)) and d > 0
        if not ok:
            fail(where, "`dist_kly` must be a positive number or a [low, high] range in thousands of light-years")
        for key, lo, hi in (("ra_deg", 0, 360), ("dec_deg", -90, 90)):
            v = o.get(key)
            if not isinstance(v, (int, float)) or not (lo <= v <= hi):
                fail(where, f"`{key}` must be a number in [{lo}, {hi}]")
        if not o.get("name") or not o.get("type"):
            fail(where, "needs `name:` and an OpenNGC `type:` code")

    # THE BUILT FILE AGREES WITH THIS ONE. site/data/dso.json is built by scripts/build-dso.py from
    # OpenNGC's CSVs, which are not in the tree, so a change to a card line here is patched into
    # the JSON by hand and nothing regenerated would catch a miss. Found by needing it: thirteen
    # lines corrected on 2026-09-22 had to land in both files.
    # An empty file is tests/test_refusals.py's names-not-bytes tree, not a build.
    built = ROOT / "site" / "data" / "dso.json"
    if built.exists() and built.stat().st_size > 0:
        import json
        rows = {r.get("id"): r for r in json.loads(built.read_text(encoding="utf-8")).get("objects", [])}
        for o in objects:
            if not isinstance(o, dict) or not o.get("id"):
                continue
            row = rows.get(o["id"])
            where = f"dso-hand.yaml[{o['id']}]"
            if row is None:
                fail(where, "is not in site/data/dso.json; rebuild it with scripts/build-dso.py")
                continue
            if (row.get("why") or None) != (o.get("why") or None):
                fail(where, "`why:` differs from site/data/dso.json, which is what the card prints. "
                            "Rebuild with scripts/build-dso.py, or patch the same sentence into both")
            d = o.get("dist_kly")
            mid = (d[0] + d[1]) / 2 if isinstance(d, list) and len(d) == 2 else d
            if isinstance(mid, (int, float)) and row.get("distLy") != round(mid * 1000):
                fail(where, f"`dist_kly: {d}` but site/data/dso.json draws it at {row.get('distLy')} ly")
    return objects


EXOTIC_KINDS = {"blackhole", "pulsar", "magnetar", "star"}


def check_exotics() -> list:
    """registry/exotics.yaml: a fact sheet must say where its facts came from."""
    path = REG / "exotics.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("exotics.yaml", f"will not parse: {exc}")
        return []
    rows_ = doc.get("exotics")
    if not isinstance(rows_, list):
        fail("exotics.yaml", "no `exotics:` list")
        return []
    seen = set()
    for r in rows_:
        if not isinstance(r, dict):
            fail("exotics.yaml", "a row is not a mapping")
            continue
        rid = r.get("id")
        where = f"exotics.yaml[{rid}]"
        if not rid:
            fail("exotics.yaml", "a row has no id")
            continue
        if rid in seen:
            fail(where, "duplicate id")
        seen.add(rid)
        if r.get("kind") not in EXOTIC_KINDS:
            fail(where, f"`kind: {r.get('kind')}` is not one of {sorted(EXOTIC_KINDS)}")
        if not r.get("source"):
            fail(where, "no `source:` -- a fact sheet with no source is a rumour")
        img = r.get("image")
        if img is not None:
            # SHIPPING SOMEBODY ELSE'S PHOTOGRAPH. The EHT pictures are CC BY 4.0 through ESO, and
            # that licence is a bargain: the credit must travel with the image, unaltered. A row
            # that cannot say whose picture it is, under what licence, and where it came from is a
            # row that must not ship one -- the same rule registry/models.yaml lives under.
            if not isinstance(img, dict):
                fail(where, "`image:` must be a mapping with file, credit, licence, source and alt")
            else:
                for field in ("file", "credit", "licence", "source", "alt"):
                    if not str(img.get(field) or "").strip():
                        fail(where, f"`image.{field}` is missing -- a picture with no {field} does not ship")
                f = str(img.get("file") or "")
                if f and not f.startswith("site/images/"):
                    fail(where, f"`image.file` must live under site/images/, not {f!r}")
                if f and not (ROOT / f).exists():
                    fail(where, f"`image.file` {f} is not in the repository")
        if not r.get("why"):
            fail(where, "no `why:` sentence")
        if not re.match(r"^\s*\d+h\s*\d+m\s*[\d.]+s\s*$", str(r.get("ra") or "")):
            fail(where, f"`ra` must be `HHh MMm SS.Ss` as the source prints it, not {r.get('ra')!r}")
        if not re.match(r"^\s*[+-]?\d+°\s*\d+′\s*[\d.]+″\s*$", str(r.get("dec") or "")):
            fail(where, f"`dec` must be `±DD° MM′ SS.S″` as the source prints it, not {r.get('dec')!r}")
        d = r.get("dist_ly")
        if isinstance(d, list):
            ok = len(d) == 2 and all(isinstance(v, (int, float)) and v > 0 for v in d) and d[0] < d[1]
        else:
            ok = isinstance(d, (int, float)) and d > 0
        if not ok:
            fail(where, "`dist_ly` must be a positive number or a [low, high] range")
        if r.get("kind") == "pulsar" and not isinstance(r.get("period_s"), (int, float)):
            fail(where, "a pulsar needs `period_s`")
        if r.get("kind") == "blackhole" and r.get("mass_msun") is None:
            fail(where, "a black hole needs `mass_msun` (a number or a [low, high] range)")
        if r.get("vmag") is not None and not isinstance(r.get("vmag"), (int, float)):
            fail(where, "`vmag` must be a number")
        if r.get("kind") == "star" and r.get("vmag") is None:
            fail(where, "a star needs `vmag` -- the card decides from it whether a person can see it")
    return rows_


# A source line says which page and which day: "https://en.wikipedia.org/wiki/Vega (read 2026-09-22)".
# A page changes, so a claim with no date on its source is a claim nobody can re-read as it was.
STAR_SOURCE = re.compile(r"^https?://\S+ \(read \d{4}-\d{2}-\d{2}\)")


def check_stars_notable(exotics: list) -> list:
    """registry/stars-notable.yaml: a famous star is a real star record, with one sourced line.

    Added 2026-09-22 with the file. The row's HIP number is the join: scene/stars3d.js turns the
    names file's rows into records `hip-<n>`, and a number that is not there is a line the label and
    the card would never print -- silently, because nothing in the browser looks for the row it
    missed. So the join is checked here, against the same names file the browser reads.
    """
    path = REG / "stars-notable.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("stars-notable.yaml", f"will not parse: {exc}")
        return []
    rows_ = doc.get("stars")
    if not isinstance(rows_, list):
        fail("stars-notable.yaml", "no `stars:` list")
        return []

    # The names file the browser builds star records from. Absent only in tests/test_refusals.py's
    # scratch trees for OTHER registries; that file copies it in for the cases aimed at this one.
    names = ROOT / "site" / "data" / "stars3d.names.json"
    by_hip: set | None = None
    no_hip_proper: dict[str, int] = {}
    if names.exists() and names.stat().st_size > 0:
        import json
        named = json.loads(names.read_text(encoding="utf-8")).get("rows") or []
        by_hip = {r[4] for r in named if len(r) > 4 and r[4]}
        for r in named:
            if len(r) > 4 and not r[4] and r[1]:
                no_hip_proper[r[1]] = no_hip_proper.get(r[1], 0) + 1

    # An exotic that is a star has its own fact sheet (Betelgeuse, Eta Carinae). Two lines for one
    # star is two cards' worth of claims about it, so a name either file uses belongs to one file.
    exotic_names = set()
    for x in exotics or []:
        if isinstance(x, dict):
            exotic_names.add(str(x.get("name") or "").strip().lower())
            for a in x.get("aliases") or []:
                exotic_names.add(str(a).strip().lower())

    seen_hip, seen_proper, seen_name = set(), set(), set()
    for r in rows_:
        if not isinstance(r, dict):
            fail("stars-notable.yaml", "a row is not a mapping")
            continue
        hip, proper, name = r.get("hip"), r.get("proper"), str(r.get("name") or "").strip()
        where = f"stars-notable.yaml[{name or hip or proper}]"
        if (hip is None) == (proper is None):
            fail(where, "needs exactly one of `hip:` (the Hipparcos number) or `proper:` (only for a star with no HIP)")
        if hip is not None:
            if not isinstance(hip, int) or isinstance(hip, bool) or hip <= 0:
                fail(where, f"`hip: {hip!r}` must be a positive whole number")
            elif hip in seen_hip:
                fail(where, f"HIP {hip} has a row already -- one star, one line")
            elif by_hip is not None and hip not in by_hip:
                fail(where, f"HIP {hip} is not a named star in site/data/stars3d.names.json, so there is no "
                            f"record `hip-{hip}` for this line to reach")
            seen_hip.add(hip)
        if proper is not None:
            p = str(proper).strip()
            if not p:
                fail(where, "`proper:` is empty")
            elif p in seen_proper:
                fail(where, f"`proper: {p}` has a row already")
            elif by_hip is not None and no_hip_proper.get(p, 0) != 1:
                fail(where, f"`proper: {p}` must name exactly one row with no HIP number in "
                            f"site/data/stars3d.names.json (found {no_hip_proper.get(p, 0)})")
            seen_proper.add(p)
        if not name:
            fail(where, "no `name:` -- the label and the card need a name to print")
        elif name.lower() in seen_name:
            fail(where, "two rows share this name")
        elif name.lower() in exotic_names:
            fail(where, f"{name} is already a registry/exotics.yaml row with its own fact sheet")
        seen_name.add(name.lower())
        why = r.get("why")
        if not isinstance(why, str) or not why.strip():
            fail(where, "no `why:` -- the one line is the whole point of the row")
        else:
            if len(why) > MAX_SENTENCE:
                fail(where, f"`why:` is {len(why)} characters; the card prints {MAX_SENTENCE} and would cut it mid-claim")
            if "--" in why:
                fail(where, f"`why:` has `--`: {TOUR_DOUBLE_HYPHEN}")
            phrase = time_relative(why)
            if phrase:
                fail(where, f"`why:` says {phrase!r}, which is true on a date and not forever")
        if not STAR_SOURCE.match(str(r.get("source") or "")):
            fail(where, "`source:` must be the page and the day it was read: "
                        "\"https://... (read YYYY-MM-DD)\" -- a line with no source is a rumour")
    return rows_


def check_ladder(world_ids: set, layer_ids: set) -> list:
    """registry/ladder.yaml: every rung names a world or a record in a layer, with a distance and its source."""
    path = REG / "ladder.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("ladder.yaml", f"will not parse: {exc}")
        return []
    rungs_ = doc.get("rungs")
    if not isinstance(rungs_, list) or not rungs_:
        fail("ladder.yaml", "no `rungs:` list")
        return []
    seen = set()
    for r in rungs_:
        if not isinstance(r, dict):
            fail("ladder.yaml", "a rung is not a mapping")
            continue
        rid = r.get("id")
        where = f"ladder.yaml[{rid}]"
        if not rid:
            fail("ladder.yaml", "a rung has no id")
            continue
        if rid in seen:
            fail(where, "duplicate id")
        seen.add(rid)
        t = r.get("target") or {}
        keys = [k for k in ("world", "record") if k in t]
        if len(keys) != 1:
            fail(where, "target must be exactly one of {world: ...} or {record: ...}")
        elif keys[0] == "world" and t["world"] not in world_ids:
            fail(where, f"targets world `{t['world']}`, which has no worlds.yaml row")
        elif keys[0] == "record":
            if r.get("layer") not in layer_ids:
                fail(where, f"a record rung must name the layer that produces it (`layer: {r.get('layer')}` has no layers.yaml row)")
        for key in ("label", "distance", "distance_source", "why"):
            if not r.get(key):
                fail(where, f"no `{key}:`")
    for row in doc.get("we_show") or []:
        if not isinstance(row, dict) or not row.get("what") or not isinstance(row.get("n"), int) or not row.get("source"):
            fail("ladder.yaml", "each `we_show` row needs `what:`, an integer `n:` and a `source:`")
    return rungs_


def check_aliases() -> list:
    """registry/aliases.yaml: a nickname says what it means and why, once."""
    path = REG / "aliases.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("aliases.yaml", f"will not parse: {exc}")
        return []
    rows_ = doc.get("aliases")
    if not isinstance(rows_, list):
        fail("aliases.yaml", "no `aliases:` list")
        return []
    seen = set()
    for r in rows_:
        if not isinstance(r, dict):
            fail("aliases.yaml", "a row is not a mapping")
            continue
        say = str(r.get("say") or "").strip().lower()
        where = f"aliases.yaml[{say or '?'}]"
        if not say:
            fail("aliases.yaml", "a row has no `say:`")
            continue
        if say in seen:
            fail(where, "duplicate `say:`")
        seen.add(say)
        if not str(r.get("means") or "").strip():
            fail(where, "no `means:`")
        if not r.get("why"):
            fail(where, "no `why:` -- an alias nobody can justify is an alias that should go")
        if say == str(r.get("means") or "").strip().lower():
            fail(where, "`say` and `means` are the same word; the row does nothing")
    return rows_


COLORKEY_FIELDS = {"klass", "perigee_km", "inclination_deg", "launch_year"}


def check_colorkeys() -> list:
    """registry/colorkeys.yaml: a key reads a field the browser knows how to read; its buckets tile a range."""
    path = REG / "colorkeys.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("colorkeys.yaml", f"will not parse: {exc}")
        return []
    keys = doc.get("keys")
    if not isinstance(keys, list) or not keys:
        fail("colorkeys.yaml", "no `keys:` list")
        return []
    if keys[0].get("id") != "class":
        fail("colorkeys.yaml", "the first key must be `class`: it is the default and the way back to the class colours")
    seen = set()
    for k in keys:
        if not isinstance(k, dict):
            fail("colorkeys.yaml", "a key is not a mapping")
            continue
        kid = k.get("id")
        where = f"colorkeys.yaml[{kid}]"
        if not kid:
            fail("colorkeys.yaml", "a key has no id")
            continue
        if kid in seen:
            fail(where, "duplicate id")
        seen.add(kid)
        if k.get("by") not in COLORKEY_FIELDS:
            fail(where, f"`by: {k.get('by')}` is not a field data/colorkeyrules.js reads {sorted(COLORKEY_FIELDS)}")
        if not k.get("label") or not k.get("why"):
            fail(where, "needs `label:` and `why:`")
        if k.get("by") == "klass":
            continue
        buckets = k.get("buckets")
        if not isinstance(buckets, list) or not buckets:
            fail(where, "a numeric key needs `buckets:`")
            continue
        prev_max = None
        # Registry order is DISPLAY order (newest first for launch age); tiling is checked by value.
        ordered = sorted((b for b in buckets if isinstance(b, dict)), key=lambda b: (b.get('min') if isinstance(b.get('min'), (int, float)) else 0))
        for b in ordered:
            bw = f"{where}.{b.get('id')}"
            if not b.get("id") or not b.get("label"):
                fail(bw, "a bucket needs `id:` and `label:`")
            if not re.match(r"^#[0-9A-Fa-f]{6}$", str(b.get("colour") or "")):
                fail(bw, f"`colour` must be a six-digit hex, not {b.get('colour')!r}")
            lo, hi = b.get("min"), b.get("max")
            if not isinstance(lo, (int, float)) or not isinstance(hi, (int, float)) or not lo < hi:
                fail(bw, "`min` and `max` must be numbers with min < max")
                continue
            if prev_max is not None and lo != prev_max:
                fail(bw, f"buckets must tile the range: this one starts at {lo}, the one before ended at {prev_max}")
            prev_max = hi
    return keys


def check_lod() -> list:
    """registry/lod.yaml: a rule must name a hook that exists and a range that is a range."""
    path = REG / "lod.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("lod.yaml", f"will not parse: {exc}")
        return []
    rules = doc.get("rules")
    if not isinstance(rules, list):
        fail("lod.yaml", "no `rules:` list")
        return []
    seen = set()
    for r in rules:
        if not isinstance(r, dict):
            fail("lod.yaml", "a rule is not a mapping")
            continue
        rid = r.get("id")
        where = f"lod.yaml[{rid}]"
        if not rid:
            fail("lod.yaml", "a rule has no id")
            continue
        if rid in seen:
            fail(where, "duplicate id")
        seen.add(rid)
        if r.get("what") not in LOD_HOOKS:
            fail(where, f"`what: {r.get('what')}` is not a hook the scene implements {sorted(LOD_HOOKS)}")
        if r.get("fade") not in {"in", "out"}:
            fail(where, "`fade` must be `in` or `out`")
        a, b = r.get("from_km"), r.get("to_km")
        if not isinstance(a, (int, float)) or not isinstance(b, (int, float)) or not (0 <= a < b):
            fail(where, "`from_km` and `to_km` must be numbers with 0 <= from_km < to_km")
        if not r.get("why"):
            fail(where, "no `why:` -- a level-of-detail rule without a reason is a knob nobody can review")
    return rules


def check_oddities(doc: dict, world_ids: set, sites: list) -> None:
    """registry/oddities.yaml: eight rows, five kinds of answer to "where is it?", one rule.

    THE RULE: a row must not be able to say something it cannot support. Everything below is that
    sentence applied to one field at a time, and tests/test_refusals.py breaks each one on purpose
    -- because a validator that passes a bad row is worse than no validator, and the only way to
    know which kind you have is to hand it a bad row.

    The two hardest ones to get right, and the two worth reading:

      * `where.kind: unknown` may carry NO position of any sort. That refusal is the whole scheme:
        without it, "we do not know where this is" becomes a dot, and a dot on this map is a
        claim every other layer honours.
      * an `on_surface` row states its position in exactly ONE of two ways and both carry a
        precision. "The golf balls are at the Apollo 14 site (+/- 0.4 m)" is false; "within tens
        of metres of a point known to +/- 0.4 m" is true. One number cannot say two things.
    """
    site_by_id = {s.get("id"): s for s in sites if isinstance(s, dict)}

    attachable = doc.get("attachable")
    if not isinstance(attachable, list) or not attachable:
        fail("oddities.yaml", "no `attachable:` block -- it is the MEASURED manifest of record ids "
                              "an attached row may name, and CI cannot run the browser to find out")
        attachable = []
    attachable_ids = set()
    for a in attachable:
        if not isinstance(a, dict) or not a.get("id"):
            fail("oddities.yaml", f"attachable row {a!r} has no id")
            continue
        if not a.get("emitted_by"):
            fail("oddities.yaml", f"attachable `{a.get('id')}` does not say what emits it; "
                                  f"the evidence is the point of this block")
        attachable_ids.add(a.get("id"))

    if not doc.get("observed_on"):
        fail("oddities.yaml", "no `observed_on:` date -- these rows quote live ephemerides and "
                              "published coordinate tables, and evidence with no date is a claim "
                              "nobody can check")

    seen: set[str] = set()
    for r in rows(doc, "oddities", "oddities.yaml"):
        oid = r.get("id")
        where = f"oddities.yaml[{oid}]"
        if not oid:
            fail("oddities.yaml", "a row has no id")
            continue
        if oid in seen:
            fail(where, "duplicate id")
        seen.add(oid)
        if not r.get("display"):
            fail(where, "no `display:` -- the card prints this name")
        if r.get("klass") != ODDITY_KLASS:
            fail(where, f"klass {r.get('klass')!r} must be `{ODDITY_KLASS}`")

        w = r.get("where")
        if not isinstance(w, dict):
            fail(where, "no `where:` block -- a row here is a claim about a place")
            w = {}
        kind = w.get("kind")
        if kind not in WHERE_KINDS:
            fail(where, f"where.kind {kind!r} is not one of {sorted(WHERE_KINDS)}")

        # 2. THE refusal. A row that says nobody knows where it is must not carry a position.
        if kind == "unknown":
            carried = [k for k in ("lat", "lon", "elements", "frame", "to", "anchor", "object",
                                   "world", "horizons_id") if k in w]
            if carried:
                fail(where, f"where.kind is `unknown` and the row still carries {sorted(carried)}. "
                            f"A row that says nobody knows where it is must not carry a position; "
                            f"the map draws nothing for it and the card says why")
            if not w.get("why_unknown"):
                fail(where, "`unknown` with no `why_unknown:` -- 'we could not look' is a real "
                            "answer only when it says what was looked for")

        if kind == "on_surface":
            world = w.get("world")
            if world not in world_ids:
                fail(where, f"where.world `{world}` has no worlds.yaml row")
            anchor = w.get("anchor")
            obj = w.get("object")
            if not isinstance(obj, dict):
                fail(where, "`on_surface` with no `object:` block -- every surface row states how "
                            "well THIS object's own position is known")
                obj = {}
            located = "lat" in obj or "lon" in obj
            if located and isinstance(anchor, dict):
                fail(where, "`on_surface` carries BOTH its own coordinates and an anchor. That is "
                            "two positions and the card can only draw one: either this object was "
                            "located, or we draw at a surveyed point near it")
            elif not located and not isinstance(anchor, dict):
                fail(where, "`on_surface` with neither `object.lat/lon` nor an `anchor:` -- it "
                            "says it is on a surface and will not say where")
            if isinstance(anchor, dict):
                # One source of truth for a surveyed coordinate: the anchor names a sites.yaml row
                # and the numbers are copied from it. C11 of the reconciliation.
                aid = anchor.get("id")
                if not aid:
                    fail(where, "`anchor:` with no `id:` -- it must name a registry/sites.yaml row "
                                "so a surveyed coordinate lives in exactly one place")
                elif aid not in site_by_id:
                    fail(where, f"anchor.id `{aid}` has no registry/sites.yaml row. Adding a site "
                                f"is a row (spec 0002); copying its coordinates here is a second "
                                f"place for them to drift")
                else:
                    site = site_by_id[aid]
                    for key in ("lat", "lon"):
                        if anchor.get(key) != site.get(key):
                            fail(where, f"anchor.{key} is {anchor.get(key)!r} and sites.yaml[{aid}]"
                                        f" says {site.get(key)!r}. Two copies, already disagreeing")
                    # The site row states its reference's uncertainty since 2026-09-22, so the
                    # anchor's copy of it is held to the same rule as the coordinates.
                    if site.get("uncertainty_m") is not None and anchor.get("uncertainty_m") != site.get("uncertainty_m"):
                        fail(where, f"anchor.uncertainty_m is {anchor.get('uncertainty_m')!r} and "
                                    f"sites.yaml[{aid}] says {site.get('uncertainty_m')!r}")
                    if site.get("world") != world:
                        fail(where, f"anchor.id `{aid}` is on {site.get('world')!r} and this row "
                                    f"says {world!r}")
                if not is_number(anchor.get("uncertainty_m")):
                    fail(where, "`anchor:` with no `uncertainty_m:` -- the anchor is the number we "
                                "DO have, and the card prints it beside the one we do not")
                if not anchor.get("of"):
                    fail(where, "`anchor:` with no `of:` -- the card says whose position was "
                                "surveyed, and 'the Apollo 14 site' is not a thing that was")
                p = obj.get("precision_m")
                if not is_number(p) and p != PRECISION_UNKNOWN:
                    fail(where, f"object.precision_m is {p!r}; it must be a number of metres or "
                                f"the literal `{PRECISION_UNKNOWN}`. One number cannot say two "
                                f"things: the anchor's uncertainty is not this object's precision")
            elif located:
                if not is_number(obj.get("precision_m")):
                    fail(where, "an object located in its own right still needs `precision_m:` -- "
                                "a coordinate with no error bar is a coordinate pretending")
            how = obj.get("how")
            if how not in ODDITY_HOW:
                fail(where, f"object.how {how!r} is not one of {sorted(ODDITY_HOW)}")
            if (obj.get("precision_m") == PRECISION_UNKNOWN
                    and how in PRECISION_UNKNOWN_FORBIDDEN_HOW):
                fail(where, f"object.precision_m is `{PRECISION_UNKNOWN}` but how is {how!r}. "
                            f"A survey is a number; either publish it or say how it was really "
                            f"found")
            for holder, key, limit in ((obj, "lat", 90), (obj, "lon", 360),
                                       (anchor if isinstance(anchor, dict) else {}, "lat", 90),
                                       (anchor if isinstance(anchor, dict) else {}, "lon", 360)):
                if key in holder and (not is_number(holder[key]) or abs(holder[key]) > limit):
                    fail(where, f"{key} {holder[key]!r} is outside +/-{limit}")

        if kind == "in_orbit":
            el = w.get("elements")
            if not isinstance(el, dict):
                fail(where, "`in_orbit` with no `elements:` -- half an element set draws a wrong "
                            "orbit rather than none")
                el = {}
            for key in ("epoch_jd", "a_au", "e", "i_deg", "node_deg", "argp_deg"):
                if not is_number(el.get(key)):
                    fail(where, f"elements.{key} is missing or not a number; half an element set "
                                f"draws a wrong orbit rather than none")
            if not is_number(el.get("tp_jd")) and not is_number(el.get("ma_deg")):
                fail(where, "elements needs `tp_jd:` or `ma_deg:` -- without a phase the object is "
                            "drawn at perihelion and the card has to say so")
            # THE TWO-EPOCH RULE, and the next reader will try to "fix" it. epoch_jd is what the
            # propagator integrates from; evidence_epoch is when anybody last LOOKED. The card
            # prints the age of the second. For the Roadster they are eight and a half years apart.
            if not w.get("evidence_epoch"):
                fail(where, "`in_orbit` with no `evidence_epoch:`. elements.epoch_jd is an "
                            "osculating epoch and printing its age would say '0 days old', which "
                            "is true of the arithmetic and a lie about the knowledge")
            prov = r.get("orbit_provenance")
            if not isinstance(prov, dict):
                fail(where, "`in_orbit` with no `orbit_provenance:`")
                prov = {}
            if not prov.get("arc"):
                fail(where, "orbit_provenance has no `arc:` -- an orbit with no observation arc is "
                            "a number with no history")
            if not isinstance(prov.get("obs_count"), int) or isinstance(prov.get("obs_count"), bool):
                fail(where, "orbit_provenance has no integer `obs_count:`")

        if kind == "attached":
            to = w.get("to")
            if to not in attachable_ids:
                fail(where, f"where.to `{to}` is not in the `attachable:` block, so the app does "
                            f"not draw it and this row would hang off nothing")
            for other in w.get("also_on") or []:
                if other not in attachable_ids:
                    fail(where, f"where.also_on names `{other}`, which is not in `attachable:`")
            if w.get("mount_class") != "illustrative":
                fail(where, "an `attached` row needs `mount_class: illustrative` -- where we hang "
                            "it on the model is our arrangement, never a measurement, and the card "
                            "says so")
            # THE MOUNT IS THE DRAWING. scene/models.js attachOddityModels() reads exactly these
            # five numbers and nothing else, so a row that gets one of them wrong hangs an object
            # in empty space beside its carrier, or draws a Golden Record the size of Voyager,
            # and the card goes on saying "drawn from published dimensions" underneath.
            mount = w.get("mount")
            if not isinstance(mount, dict):
                fail(where, "an `attached` row needs a `mount:` block -- it is drawn as a child of "
                            "its carrier's model and this is where on that model it hangs")
                mount = {}
            for axis in ("x", "y", "z"):
                v = mount.get(axis)
                if not is_number(v):
                    fail(where, f"mount.{axis} is {v!r}; it must be a number in the carrier "
                                f"model's own units")
                elif abs(v) > 1:
                    fail(where, f"mount.{axis} is {v}, outside the carrier's own model -- every "
                                f"model this app draws is normalised to a unit box, so this would "
                                f"hang the object in space beside the spacecraft rather than on it")
            scale = mount.get("scale")
            if not is_number(scale) or scale <= 0:
                fail(where, f"mount.scale is {scale!r}; an attached row must say how big it is "
                            f"drawn against its carrier, because true scale is a pixel and the "
                            f"card's `departure:` sentence is what admits the difference")
            elif scale > 1:
                fail(where, f"mount.scale is {scale}, so the part would be drawn bigger than the "
                            f"spacecraft carrying it")
            # scene/realmodels.js matches on meta.horizonsId, so an attached row carrying one would
            # draw a SECOND Voyager beside the first.
            if "horizons_id" in w:
                fail(where, "an `attached` row must not carry its own `horizons_id:` -- the "
                            "position is the carrier's, and a second id draws a second spacecraft "
                            "beside the first")
            if r.get("position_class") != "inherit":
                fail(where, "an `attached` row is `position_class: inherit` -- it can never be "
                            "surer of where it is than the thing it is bolted to")
        elif r.get("position_class") == "inherit":
            fail(where, "`position_class: inherit` on a row that is not `attached` -- there is "
                        "nothing for it to inherit from")

        if kind == "came_home":
            if not w.get("where_kept"):
                fail(where, "`came_home` with no `where_kept:` -- a thing that came home has an "
                            "address, or it does not have this kind")
            if not w.get("source"):
                fail(where, "`came_home` with no `where.source:` saying who says it is there")
            for key, limit in (("lat", 90), ("lon", 360)):
                if not is_number(w.get(key)) or abs(w.get(key)) > limit:
                    fail(where, f"`came_home` {key} {w.get(key)!r} is missing or outside +/-{limit}")

        # --- the honesty fields ------------------------------------------------------
        pc = r.get("position_class")
        if pc == "sample":
            fail(where, "`position_class: sample` is refused BY NAME. `sample` means a bundled "
                        "stand-in for a live feed nobody can call; these rows are not stand-ins "
                        "for anything, they are the thing. Hand-kept is provenance, not certainty")
        elif pc not in ODDITY_POSITION_CLASSES:
            fail(where, f"position_class {pc!r} is not one of {sorted(ODDITY_POSITION_CLASSES)}")
        if pc == "measured":
            obj = w.get("object") if isinstance(w.get("object"), dict) else {}
            if kind == "unknown":
                fail(where, "`position_class: measured` on a row whose position is unknown")
            if obj.get("how") in {"photogrammetric", "unsurveyed"}:
                fail(where, f"`position_class: measured` on a row found by {obj.get('how')!r}. "
                            f"You cannot survey a thing you found in a photograph")
            if obj.get("precision_m") == PRECISION_UNKNOWN:
                fail(where, "`position_class: measured` on a row whose own precision is `unknown`")
            if isinstance(w.get("anchor"), dict):
                fail(where, "`position_class: measured` on a row drawn at an ANCHOR. The anchor is "
                            "measured; this object is somewhere near it, which is `inferred`")

        for i, myth in enumerate(r.get("myths") or []):
            at = f"{where}.myths[{i}]"
            if not isinstance(myth, dict):
                fail(at, f"{myth!r} is not a map")
                continue
            if not myth.get("claim"):
                fail(at, "no `claim:`")
            if not myth.get("correction"):
                fail(at, "no `correction:`")
            if not myth.get("source"):
                fail(at, "no `source:` -- a debunk with no source is a rumour going the other way")

        fact = r.get("fact")
        if not fact:
            fail(where, "no `fact:` -- it is the card's one plain sentence")
        elif len(str(fact)) > MAX_SENTENCE:
            fail(where, f"`fact:` is {len(str(fact))} characters, over the card's {MAX_SENTENCE}. "
                        f"The cap is enforced where the string is written, because truncating at "
                        f"the point it is read is how a card says half of something")
        if not r.get("source"):
            fail(where, "no `source:` -- the full evidence a reviewer reads. It is not shipped")
        cite = r.get("cite")
        if not cite:
            fail(where, "no `cite:` -- the one line the card prints under Source. The evidence "
                        "stays in this file; the card still has to say where a fact came from")
        elif len(str(cite)) > MAX_SENTENCE:
            fail(where, f"`cite:` is {len(str(cite))} characters, over {MAX_SENTENCE}")

        if not r.get("as_of"):
            texts = [str(r.get("fact") or ""), str(r.get("note") or ""), str(r.get("source") or "")]
            for myth in r.get("myths") or []:
                if isinstance(myth, dict):
                    texts += [str(myth.get("claim") or ""), str(myth.get("correction") or "")]
            for text in texts:
                phrase = time_relative(text)
                if phrase:
                    fail(where, f"says {phrase!r} and carries no `as_of:` date. That is true on a "
                                f"day and not forever; Juno is the reason this rule exists")
                    break

        # --- the drawing -------------------------------------------------------------
        shape = r.get("shape")
        if not isinstance(shape, dict):
            fail(where, "no `shape:` block -- a row says what it will be drawn as, or it draws "
                        "nothing and says that instead")
            shape = {}
        build = shape.get("build")
        if build not in ODDITY_SHAPES:
            fail(where, f"shape.build {build!r} is not a builder scene/models.js has. "
                        f"{sorted(ODDITY_PLACEHOLDER_SHAPES)} are always legal and draw a labelled "
                        f"placeholder while the card says so; a shape we cannot draw stops the "
                        f"build, because the alternative is a card naming geometry that is not there")
        tris = shape.get("budget_tris")
        if not isinstance(tris, int) or isinstance(tris, bool) or tris <= 0:
            fail(where, "shape.budget_tris must be a positive integer -- a budget nobody measures "
                        "is a comment")
        elif tris > ODDITY_MAX_TRIS:
            fail(where, f"shape.budget_tris {tris} is over the layer cap of {ODDITY_MAX_TRIS}")
        sf = shape.get("stands_for")
        if sf not in ODDITY_STANDS_FOR:
            fail(where, f"shape.stands_for {sf!r} must be one of {sorted(ODDITY_STANDS_FOR)}")
        elif sf == "variant" and build in ODDITY_PLACEHOLDER_SHAPES:
            fail(where, f"shape.stands_for is `variant` on a `{build}` build. A placeholder cannot "
                        f"be an exact object; the card would name a shape it did not draw")
        if not shape.get("drawn_name"):
            fail(where, "shape has no `drawn_name:` -- the card names the shape it drew, so the "
                        "name is data")
        # NOTHING IS DRAWN FOR A ROW NOBODY CAN PLACE. data/sample.js gives an `unknown` row no
        # propagator, so the glyph layer, heroes.js and the camera all skip it -- and a row that
        # names a builder whose output never reaches the screen is a claim about a drawing that
        # does not exist. `generic` is the only legal build here, and the emitter writes no
        # `drawsAs` for it either, so the card says nothing about a shape instead of something.
        if kind == "unknown" and build not in ODDITY_PLACEHOLDER_SHAPES:
            fail(where, f"shape.build is `{build}` on a row whose position is unknown. Nothing is "
                        f"drawn for it at all, so the only honest build is "
                        f"{sorted(ODDITY_PLACEHOLDER_SHAPES)}")
        # `departure:` is the one place a row admits the drawing differs from the object on
        # purpose -- an oversized starburst, two balls drawn side by side, a blank print. It is
        # OPTIONAL, because a builder may have nothing to confess, and it is refused on a
        # placeholder: "we have no shape for this" and "here is how our shape differs" cannot both
        # be true of the same drawing.
        att = shape.get("attitude")
        if att is not None:
            if att not in ODDITY_ATTITUDES:
                fail(where, f"shape.attitude {att!r} is not one of {sorted(ODDITY_ATTITUDES)}")
            if kind in ODDITY_GROUNDED_KINDS:
                fail(where, f"shape.attitude on a `{kind}` row. A thing lying on a surface is "
                            f"drawn standing on that surface because it IS on it -- that one is "
                            f"measured, and a row must not be able to override it")
            if build in ODDITY_PLACEHOLDER_SHAPES:
                fail(where, f"shape.attitude on a `{build}` build: there is no shape to aim")
        dep = shape.get("departure")
        if dep is not None:
            if not isinstance(dep, str) or not dep.strip():
                fail(where, f"shape.departure {dep!r} is not a sentence. Leave it out if the "
                            f"drawing has nothing to confess")
            elif len(dep) > MAX_SENTENCE:
                fail(where, f"shape.departure is {len(dep)} characters, over the card's "
                            f"{MAX_SENTENCE}")
            if build in ODDITY_PLACEHOLDER_SHAPES:
                fail(where, f"shape.departure on a `{build}` build. A placeholder already says it "
                            f"is not the object; a departure from it is a departure from nothing")


errors: list[str] = []


def fail(where: str, msg: str) -> None:
    errors.append(f"{where}: {msg}")


def load(name: str) -> dict:
    path = REG / name
    if not path.exists():
        fail(name, "missing")
        return {}
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail(name, f"will not parse: {exc}")
        return {}


def rows(doc: dict, key: str, name: str) -> list[dict]:
    got = doc.get(key)
    if got is None:
        fail(name, f"no `{key}:` list")
        return []
    if not isinstance(got, list):
        fail(name, f"`{key}:` is not a list")
        return []
    return got


def check_sites(sites_doc: dict, sites: list, world_ids: set) -> None:
    """registry/sites.yaml: every row is somewhere real, and every landing says where the number came from.

    The first four checks are the old ones. The rest arrived with twenty-one landing sites on
    2026-09-22, and each refuses a way that batch could have been wrong without anything noticing:
    a coordinate with no source, a source nobody can open, a landing drawn as a launch pad, and a
    card sentence the card would have cut in half.
    """
    refs = sites_doc.get("references")
    if refs is None:
        refs = {}
    if not isinstance(refs, dict):
        fail("sites.yaml", "`references:` must be a map of key -> {url, read, says}")
        refs = {}
    for key, ref in refs.items():
        where = f"sites.yaml[references/{key}]"
        if not isinstance(ref, dict):
            fail(where, "is not a map")
            continue
        url = ref.get("url")
        if not isinstance(url, str) or not url.startswith("https://"):
            fail(where, f"url {url!r} is not an https URL -- a reference nobody can open is a claim")
        if not isinstance(ref.get("read"), datetime.date):
            fail(where, "no `read:` date (YYYY-MM-DD). A page changes; the date is which version of "
                        "it the numbers were copied from")
        if not str(ref.get("says") or "").strip():
            fail(where, "no `says:` -- what the page states about its own frame and precision is "
                        "the reason to trust the digits")
    cited: set[str] = set()
    seen: set[str] = set()
    ids: set[str] = set()
    for s in sites:
        if not isinstance(s, dict):
            fail("sites.yaml", f"row {s!r} is not a map")
            continue
        sid = s.get("id")
        where = f"sites.yaml[{sid}]"
        if not sid:
            fail("sites.yaml", "a row has no id")
            continue
        if sid in seen:
            fail(where, "duplicate id -- the second row would never be reached")
        seen.add(sid)
        ids.add(sid)
        if s.get("world") not in world_ids:
            fail(where, f"world `{s.get('world')}` has no worlds.yaml row")
        for key in ("lat", "lon"):
            if not is_number(s.get(key)):
                fail(where, f"`{key}` must be a number")
        # East longitude runs 0-360 on the Moon and Mars and -180-180 on Earth, so the union.
        if is_number(s.get("lat")) and not -90 <= s["lat"] <= 90:
            fail(where, f"lat {s['lat']} is not a latitude")
        if is_number(s.get("lon")) and not -180 <= s["lon"] < 360:
            fail(where, f"lon {s['lon']} is outside both -180..180 and 0..360")
        klass = s.get("class")
        if klass not in SITE_CLASSES:
            fail(where, f"class {klass!r} is not one of {sorted(SITE_CLASSES)}")
        doing = s.get("doing")
        if not doing:
            fail(where, "no `doing:` line -- a site card with nothing to say is a dot")
        elif isinstance(doing, str):
            # The card prints this sentence FIRST and cuts at MAX_SENTENCE, so it is held to the
            # cap here, where it is written. Same rule as the oddities and the trips.
            if len(doing) > MAX_SENTENCE:
                fail(where, f"`doing:` is {len(doing)} characters and the card prints {MAX_SENTENCE}")
            if " -- " in doing:
                fail(where, "`doing:` contains ' -- ', which is this file's comment style and not "
                            "the card's")
            # 2026-09-22: three landings shipped as "1,935 grams" beside every other card's
            # "1 500 grains" and fmt.int's "15 000 km". One way of writing a number on the page.
            if re.search(r"\d,\d{3}", doing):
                fail(where, "`doing:` writes a thousands comma; the cards write 1 935, with a space")
            low = doing.lower()
            for phrase in TIME_RELATIVE:
                if phrase in low:
                    fail(where, f"`doing:` says {phrase!r}, which is true on one date; the card "
                                f"is read on every other one")
        if "record" in s and s.get("record") is not False:
            fail(where, "`record:` is only ever written as `record: false`; a row is a record by "
                        "default")
        drawn = s.get("record") is not False
        shape = s.get("shape")
        landed = s.get("landed")
        if shape is not None:
            if shape not in SITE_SHAPES:
                fail(where, f"shape {shape!r} is not one of {sorted(SITE_SHAPES)} -- nothing "
                            f"would draw it")
            if not drawn:
                fail(where, "a `record: false` row names a shape, and nothing ever draws it")
            if klass != "surface":
                fail(where, f"a `{klass}` row names a landing shape")
            if landed is None:
                fail(where, "names what landed and not when -- give `landed:` (YYYY-MM-DD, UTC)")
        if landed is not None:
            if not isinstance(landed, datetime.date):
                fail(where, f"landed {landed!r} is not a date (YYYY-MM-DD, unquoted)")
            elif not FIRST_ARRIVAL <= landed <= datetime.date.today():
                fail(where, f"landed {landed} is before Luna 2 or after today")
            if drawn and shape is None:
                fail(where, "a landing with no `shape:` is drawn with the class default, which is "
                            "a launch pad -- say `lander`, `rover` or `lunar-module`")
            source = s.get("source")
            if source is None:
                fail(where, "a landing with no `source:` -- cite a `references:` key")
            elif source == SITE_UNCITED:
                if sid not in UNCITED_SITES:
                    fail(where, "`source: uncited` is reserved for the six rows that predate the "
                                "rule. A new landing site cites a reference or does not ship")
            elif source not in refs:
                fail(where, f"source `{source}` is not a key of `references:`")
            else:
                cited.add(source)
                read = (refs.get(source) or {}).get("read")
                if isinstance(landed, datetime.date) and isinstance(read, datetime.date) and landed > read:
                    fail(where, f"landed {landed}, after its reference was read on {read}")
            if sid in UNCITED_SITES and source != SITE_UNCITED:
                fail(where, "cites a reference now, so take its id out of UNCITED_SITES in "
                            "scripts/check_registry.py -- the set lists the rows still uncited")
        al = s.get("aliases")
        if al is not None and (not isinstance(al, list) or not al
                               or not all(isinstance(x, str) and x.strip() for x in al)):
            fail(where, "`aliases:` must be a non-empty list of names")
        u = s.get("uncertainty_m")
        if u is not None and not (is_number(u) and u > 0):
            fail(where, f"uncertainty_m {u!r} must be a positive number of metres")
    for key in refs:
        if key not in cited:
            fail(f"sites.yaml[references/{key}]", "no row cites it -- a reference for nothing")
    for sid in sorted(UNCITED_SITES - ids):
        fail("sites.yaml", f"UNCITED_SITES names `{sid}`, which has no row")


def duration_ok(value: str) -> bool:
    if not isinstance(value, str) or len(value) < 2:
        return False
    return value[-1] in CADENCE_SUFFIXES and value[:-1].isdigit()


def main() -> int:
    worlds_doc = load("worlds.yaml")
    sources_doc = load("sources.yaml")
    layers_doc = load("layers.yaml")
    events_doc = load("events.yaml")
    models_doc = load("models.yaml")
    sites_doc = load("sites.yaml")
    glossary_doc = load("glossary.yaml")
    showers_doc = load("showers.yaml")
    rockets_doc = load("rockets.yaml")
    oddities_doc = load("oddities.yaml")

    worlds = rows(worlds_doc, "worlds", "worlds.yaml")
    sources = rows(sources_doc, "sources", "sources.yaml")
    layers = rows(layers_doc, "layers", "layers.yaml")
    events = rows(events_doc, "events", "events.yaml")
    models = rows(models_doc, "models", "models.yaml")
    textures = rows(models_doc, "textures", "models.yaml")
    sites = rows(sites_doc, "sites", "sites.yaml")
    terms = rows(glossary_doc, "terms", "glossary.yaml")
    showers = rows(showers_doc, "showers", "showers.yaml")
    rockets = rows(rockets_doc, "rockets", "rockets.yaml")
    observed = rows(rockets_doc, "observed", "rockets.yaml")

    world_ids = {w.get("id") for w in worlds}
    source_ids = {s.get("id") for s in sources}
    model_ids = {m.get("id") for m in models}
    texture_ids = {t.get("id") for t in textures}
    layer_ids = {l.get("id") for l in layers}

    # --- worlds ------------------------------------------------------------------
    seen: set[str] = set()
    for w in worlds:
        wid = w.get("id")
        where = f"worlds.yaml[{wid}]"
        if not wid:
            fail("worlds.yaml", "a row has no id")
            continue
        if wid in seen:
            fail(where, "duplicate id")
        seen.add(wid)
        parent = w.get("parent")
        if parent is None:
            fail(where, "no `parent:` (the root writes an empty string, so silence is a mistake)")
        elif parent and parent not in world_ids:
            fail(where, f"parent `{parent}` is not a world")
        elif not parent and wid != "sun":
            fail(where, "only `sun` may have no parent")
        for key in ("radius_km", "unit_km"):
            if not isinstance(w.get(key), (int, float)):
                fail(where, f"`{key}` must be a number")
        eph = w.get("ephemeris") or {}
        if eph.get("propagator") not in PROPAGATORS:
            fail(where, f"ephemeris propagator {eph.get('propagator')!r} is not one of {sorted(PROPAGATORS)}")
        look = w.get("look") or {}
        tex = look.get("textures")
        if tex and tex not in texture_ids:
            fail(where, f"texture set `{tex}` has no models.yaml row")
        ring = look.get("ring") or {}
        if ring and ring.get("texture") not in texture_ids:
            fail(where, f"ring texture `{ring.get('texture')}` has no models.yaml row")
        check_world_look_and_facts(w, where)

    check_world_mirror(worlds)

    # --- sources -----------------------------------------------------------------
    seen = set()
    for s in sources:
        sid = s.get("id")
        where = f"sources.yaml[{sid}]"
        if not sid:
            fail("sources.yaml", "a row has no id")
            continue
        if sid in seen:
            fail(where, "duplicate id")
        seen.add(sid)
        if not s.get("url"):
            fail(where, "no url")
        parser = s.get("parser")
        if not parser:
            fail(where, "no parser")
        elif not (ROOT / "harvest" / "parsers" / f"{parser}.py").exists():
            fail(where, f"parser `{parser}` has no module harvest/parsers/{parser}.py -- "
                        f"a source is a row plus one parser module, and the harvester finds it by this name")
        # `list:` and `query:` name files the harvester's mirror inlines at package time. A path that
        # is not in the tree would be found by the Lambda at three in the morning; find it here.
        for key in ("list", "query"):
            if s.get(key) and not (ROOT / str(s[key])).is_file():
                fail(where, f"`{key}: {s[key]}` names a file that is not in the tree")
        auth = s.get("auth")
        if auth is None:
            fail(where, "no `auth:` (write `none` rather than leaving it out)")
        elif auth != "none" and not str(auth).startswith("secret:"):
            fail(where, f"auth {auth!r} must be `none` or `secret:NAME`")
        # Whether a PAGE may read this host is what decides the app's fallback when our snapshot is
        # missing: a `true` row falls back to the upstream, a `false` row says "could not look".
        # It is a measurement (the CORS column of docs/data-sources.md), so a row must state it;
        # a missing flag defaulting to either answer would be a guess dressed as a fact.
        browser = s.get("browser")
        if browser is None:
            fail(where, "no `browser:` (true when the host sends Access-Control-Allow-Origin `*` "
                        "and a page may read it directly; false when it cannot. Measured, not assumed)")
        elif not isinstance(browser, bool):
            fail(where, f"`browser` must be true or false, got {browser!r}")
        for key in ("cadence", "freshness_max"):
            if not duration_ok(s.get(key, "")):
                fail(where, f"`{key}` must look like `15m` or `3h`, got {s.get(key)!r}")
        outputs = s.get("outputs")
        if not outputs or not isinstance(outputs, list):
            fail(where, "no `outputs:` list")
        if not s.get("attribution"):
            fail(where, "no attribution line -- it goes on the card, not in a footer")

    # --- layers ------------------------------------------------------------------
    seen = set()
    for l in layers:
        lid = l.get("id")
        where = f"layers.yaml[{lid}]"
        if not lid:
            fail("layers.yaml", "a row has no id")
            continue
        if lid in seen:
            fail(where, "duplicate id")
        seen.add(lid)
        src = l.get("source")
        if src != BUNDLED_SOURCE and src not in source_ids:
            fail(where, f"source `{src}` has no sources.yaml row "
                        f"(or the reserved literal `{BUNDLED_SOURCE}`, for records checked into "
                        f"this repository, which have no upstream to describe)")
        prop = l.get("propagator")
        if prop != PER_RECORD and prop not in PROPAGATORS:
            fail(where, f"propagator {prop!r} is not one of {sorted(PROPAGATORS)} "
                        f"or the reserved literal `{PER_RECORD}`")
        frame = l.get("frame") or ""
        if frame == PER_RECORD:
            pass
        elif "-" not in frame:
            fail(where, f"frame {frame!r} must be `<world>-inertial`, `<world>-fixed` or the "
                        f"reserved literal `{PER_RECORD}`")
        else:
            world, _, kind = frame.rpartition("-")
            if world not in world_ids:
                fail(where, f"frame names world `{world}`, which has no worlds.yaml row")
            if kind not in {"inertial", "fixed"}:
                fail(where, f"frame kind {kind!r} must be `inertial` or `fixed`")
        moments = l.get("moments") or {}
        if set(moments) - MOMENTS:
            fail(where, f"unknown moment(s) {sorted(set(moments) - MOMENTS)}")
        style = l.get("style") or {}
        if style.get("kind") not in STYLE_KINDS:
            fail(where, f"style kind {style.get('kind')!r} must be one of {sorted(STYLE_KINDS)}")
        if style.get("kind") == "model":
            m = style.get("model")
            if m not in model_ids:
                fail(where, f"model `{m}` has no models.yaml row")
            if not isinstance(style.get("near_km"), (int, float)):
                fail(where, "a model style needs `near_km` (where the model fades in)")
        if not style.get("glyph"):
            fail(where, "no glyph -- every layer must be drawable when far away")
        if not l.get("card"):
            fail(where, "no card template")
        if not l.get("select"):
            fail(where, "no `select:` rule -- a layer that selects nothing is a layer nobody sees")
        # `load: on-demand` (2026-09-22): the layer is fetched when its box is ticked, never at
        # boot. Reserved for a file too big to fetch for everybody: the active catalogue is 7 MB.
        # A small layer marked this way would just be a layer that hides its own data.
        load_mode = l.get("load")
        if load_mode is not None and load_mode != "on-demand":
            fail(where, f"`load: {load_mode}` is not `on-demand` (the only value; leave it out to load at boot)")
        if load_mode == "on-demand" and not ((l.get("budget") or {}).get("max_items", 0) >= 5000):
            fail(where, "`load: on-demand` is for a catalogue-sized layer (budget.max_items >= 5000); "
                        "a small one loads at boot like everything else")

    # --- events ------------------------------------------------------------------
    seen = set()
    for e in events:
        eid = e.get("id")
        where = f"events.yaml[{eid}]"
        if not eid:
            fail("events.yaml", "a row has no id")
            continue
        if eid in seen:
            fail(where, "duplicate id")
        seen.add(eid)
        src = e.get("source")
        # `computed` means astronomy-engine: no fetch, and that is a legitimate source.
        if src != "computed" and not str(src).startswith("registry/") and src not in source_ids:
            fail(where, f"source `{src}` is not a sources.yaml row, `computed`, or a registry file")
        if "lead_times" not in e:
            fail(where, "no `lead_times:` (an empty list is allowed and means: it already happened)")
        if not isinstance(e.get("prominence"), int):
            fail(where, "`prominence` must be an integer a human can edit")
        if "location_dependent" not in e:
            fail(where, "must say whether it is location_dependent -- it decides where it is computed")
        if not e.get("copy"):
            fail(where, "no copy template")

    # --- real models: NASA geometry, so the licence fields are not optional ---------
    # A row here credits somebody else's work and points at a file we redistribute. Both halves
    # have to be true, so this checks the file EXISTS as well as that the row claims a licence --
    # an audit before this repo went public found nineteen rows describing files that did not.
    real_models = rows(models_doc, "real_models", "models.yaml") if "real_models" in models_doc else []
    for m in real_models:
        mid = m.get("id")
        where = f"models.yaml[real_models/{mid}]"
        if not mid:
            fail("models.yaml", "a real_models row has no id")
            continue
        path = m.get("file")
        if not path:
            fail(where, "no file")
        elif not (ROOT / path).exists():
            fail(where, f"file `{path}` does not exist -- a row describing a file we do not ship is worse than no row")
        for key in ("licence", "source", "credit"):
            if not m.get(key):
                fail(where, f"no {key}; this row redistributes somebody else's work")
        if not m.get("modified"):
            fail(where, "no `modified:` -- say what was changed, or the credit implies it is untouched")

    # ...and CREDITS.md is the document that actually discharges the obligation, so it has to
    # name the same files. It said "Ten spacecraft models ship" while 29 did, and still listed a
    # kepler.glb that had been removed: the count drifted twice in the file whose whole job is
    # not to drift. Both directions are checked, because a credit for a file we do not ship is
    # the same defect as a shipped file with no credit.
    credits_path = ROOT / "CREDITS.md"
    if not credits_path.exists():
        fail("CREDITS.md", "missing -- every real model row redistributes somebody else's work "
                           "and this is the file that says under what terms")
    else:
        credits = credits_path.read_text(encoding="utf-8")
        shipped = {Path(str(m.get("file") or "")).name for m in real_models} - {""}
        for name in sorted(shipped):
            if name not in credits:
                fail("CREDITS.md", f"`{name}` ships and models.yaml credits it, but CREDITS.md "
                                   f"never names it -- 19 files were missing when this was written")
        for name in sorted(set(re.findall(r"[A-Za-z0-9_.-]+\.glb", credits))):
            if name not in shipped:
                fail("CREDITS.md", f"credits `{name}`, which has no models.yaml real_models row "
                                   f"and does not ship -- a credit for work that is not here")

    # ...and the DIRECTORY, which neither of the two checks above looks at.
    #
    # models.yaml is checked against CREDITS.md in both directions, and CREDITS.md against
    # models.yaml -- and both of them are lists. A .glb sitting in site/models/ that is in NEITHER
    # list passes every check in this file and deploys anyway: scripts/deploy.sh --assets-only
    # syncs the directory, not the registry. That is an uncredited redistribution of somebody
    # else's work, which is the one thing this whole section exists to prevent, arriving through
    # the one door it was not watching.
    #
    # It is easy to do by accident. scripts/fetch-model.sh writes straight into site/models/ and
    # then TELLS you to add the row by hand, deliberately -- "the wrong model on an object is a
    # confident lie" -- so the window between fetching a model and deciding about it is exactly
    # when an unlisted file exists. Several sat there during this session's work; they were
    # removed by hand, and nothing would have said so if they had not been.
    models_dir = ROOT / "site/models"
    if models_dir.is_dir():
        listed = {Path(str(m.get("file") or "")).name for m in real_models} - {""}
        for f in sorted(p.name for p in models_dir.glob("*.glb")):
            if f not in listed:
                fail("site/models", f"`{f}` ships and has no models.yaml real_models row -- so it "
                                    f"carries no licence, no credit and no source, and deploy.sh "
                                    f"would push it anyway")

    # --- marks: somebody else's LOGO, which is the strictest case in the file ---------
    # A logo is a trademark as well as a drawing, and the permission to use one is conditional on
    # not changing it. So this asks for more than a licence string: it asks the row to say WHERE
    # the glyph came from, that CREDITS.md carries the credit line verbatim, and that `modified`
    # is present and EMPTY -- a mark with modifications is a mark used outside its permission,
    # and the row going quiet about it is exactly the shape of this repo's old licence audit.
    marks = rows(models_doc, "marks", "models.yaml")
    for m in marks:
        mid = m.get("id")
        where = f"models.yaml[marks/{mid}]"
        if not mid:
            fail("models.yaml", "a marks row has no id")
            continue
        for key in ("file", "source", "licence", "credit"):
            if not m.get(key):
                fail(where, f"no {key}; this row draws somebody else's mark")
        if "modified" not in m:
            fail(where, "no `modified:` key -- an unmodified mark has to SAY it is unmodified")
        elif m.get("modified"):
            fail(where, f"claims the mark was modified ({m['modified']!r}). Permission to use a "
                        f"logo is permission to use it AS PUBLISHED; ship it unmodified or do "
                        f"not ship it")
        credit = m.get("credit")
        if credit and credits_path.exists() and credit not in credits:
            fail("CREDITS.md", f"models.yaml credits the `{mid}` mark as {credit!r}, and CREDITS.md "
                               f"does not carry that line")

    # --- models ------------------------------------------------------------------
    for m in models + textures + rows(models_doc, "data", "models.yaml"):
        mid = m.get("id")
        where = f"models.yaml[{mid}]"
        if not mid:
            fail("models.yaml", "a row has no id")
            continue
        if not m.get("licence"):
            fail(where, "no licence line -- this is the rule that keeps a borrowed asset from becoming a problem")
        if not m.get("source"):
            fail(where, "no source")
    for m in models:
        for_ = m.get("for") or {}
        layer = for_.get("layer")
        if layer and layer not in layer_ids:
            fail(f"models.yaml[{m.get('id')}]", f"`for.layer` names `{layer}`, which has no layers.yaml row")

    # --- sites -------------------------------------------------------------------
    check_sites(sites_doc, sites, world_ids)

    check_oddities(oddities_doc, world_ids, sites)
    ladder = check_stages(world_ids)
    lod_rules = check_lod()
    dso_hand = check_dso_hand()
    ladder_rungs = check_ladder(world_ids, layer_ids)
    exotics = check_exotics()
    famous_stars = check_stars_notable(exotics)
    aliases = check_aliases()
    colorkeys = check_colorkeys()
    TOUR_STAGES.update(world_ids)
    TOUR_STAGES.update(st.get('id') for st in ladder if isinstance(st, dict) and st.get('id'))
    TOUR_UNSQUEEZED_STAGES.update(st.get('id') for st in ladder if isinstance(st, dict) and st.get('id'))
    TOUR_WORLD_PARENTS.update({w.get('id'): str(w.get('parent') or '') for w in worlds})
    check_tours(oddities_doc, layer_ids, world_ids, {s.get('id') for s in sites},
                {str(t.get('term') or '').lower() for t in terms})

    # --- rockets -------------------------------------------------------------------
    # A row here decides what a launch is DRAWN as, and the card repeats the row's own claim
    # about itself. So the refusals below are all one refusal in different clothes: a row must
    # not be able to say something it cannot support, and it must not be able to draw nothing.
    seen_observed: dict[str, set[str]] = {k: set() for k in MATCH_KINDS}
    for o in observed:
        if not isinstance(o, dict):
            fail("rockets.yaml", f"observed row {o!r} is not a map")
            continue
        kind = o.get("as")
        what = o.get("seen")
        if kind not in MATCH_KINDS:
            fail("rockets.yaml", f"observed row {what!r} has `as: {kind!r}`, not one of {sorted(MATCH_KINDS)}")
            continue
        if not isinstance(what, str) or not what.strip():
            fail("rockets.yaml", f"an observed `{kind}` row has no `seen:` string")
            continue
        if not isinstance(o.get("n"), int):
            fail("rockets.yaml", f"observed {what!r} has no launch count `n:`")
        seen_observed[kind].add(what.strip().casefold())
    if not rockets_doc.get("observed_on"):
        fail("rockets.yaml", "no `observed_on:` date -- `observed:` is evidence, and evidence "
                             "with no date is a claim about a feed nobody can check")

    claimed: dict[tuple[str, str], str] = {}
    seen = set()
    for r in rockets:
        rid = r.get("id")
        where = f"rockets.yaml[{rid}]"
        if not rid:
            fail("rockets.yaml", "a row has no id")
            continue
        if rid in seen:
            fail(where, "duplicate id")
        seen.add(rid)
        if not r.get("display"):
            fail(where, "no `display:` -- the card names the shape it drew, so the name is data")

        # 2. a row nothing can match is a row that never draws
        match = r.get("match")
        if not isinstance(match, dict) or not match:
            fail(where, "no match keys -- a row nothing can match is a row that never draws")
            match = {}
        for kind, values in match.items():
            if kind not in MATCH_KINDS:
                fail(where, f"match kind {kind!r} is not one of {sorted(MATCH_KINDS)}")
                continue
            if not isinstance(values, list) or not values:
                fail(where, f"match.{kind} must be a non-empty list of exact strings")
                continue
            for v in values:
                if not isinstance(v, str) or not v.strip():
                    fail(where, f"match.{kind} contains {v!r}, which is not a string to compare")
                    continue
                key = (kind, v.strip().casefold())
                # 3. two rows cannot claim the same string: the second would never be reached
                if key in claimed and claimed[key] != rid:
                    fail(where, f"match.{kind} {v!r} is also claimed by {claimed[key]}")
                else:
                    claimed[key] = rid
                # 4. the evidence that this row can ever fire
                if not r.get("not_in_feed") and key[1] not in seen_observed[kind]:
                    fail(where, f"{kind} {v!r} was never seen in the feed; add it to observed: "
                                f"or say why with not_in_feed:")

        # 5 and 6. the two numbers everything else is drawn relative to
        h = r.get("height_m")
        if not isinstance(h, (int, float)) or isinstance(h, bool) or not (MIN_HEIGHT_M <= h <= MAX_HEIGHT_M):
            fail(where, f"height_m must be a number in metres ({MIN_HEIGHT_M}-{MAX_HEIGHT_M}); "
                        f"height tracks the fairing and is never derived")
        d = r.get("core_dia_m")
        if not isinstance(d, (int, float)) or isinstance(d, bool) or d <= 0:
            fail(where, "core_dia_m must be a number in metres")
        # What the optional dimensions below are measured against. A part of this rocket cannot
        # be longer than the rocket, and nothing on it is four times the core across -- Proton's
        # 7.4 m over a 4.1 m body is the widest ratio in the file, at 1.8.
        len_ceiling = h if isinstance(h, (int, float)) and not isinstance(h, bool) else MAX_HEIGHT_M
        dim_ceiling = 4 * d if isinstance(d, (int, float)) and not isinstance(d, bool) and d > 0 else 40

        # 7. the strap-ons: the strongest discriminator at 40 px, so the enum is closed
        b = r.get("boosters")
        if not isinstance(b, dict):
            fail(where, "no `boosters:` (write `{shape: none, count: 0}` rather than leaving it out)")
        else:
            shape = b.get("shape")
            count = b.get("count")
            if shape not in BOOSTER_SHAPES:
                fail(where, f"booster shape {shape!r} is not one of {sorted(BOOSTER_SHAPES)}")
            if not isinstance(count, int) or isinstance(count, bool) or count < 0:
                fail(where, "boosters.count must be an integer")
            elif shape == "none" and count:
                fail(where, f"booster shape is `none` but count is {count}")
            elif shape in BOOSTER_SHAPES and shape != "none" and count == 0:
                fail(where, f"booster shape is {shape!r} but count is 0 -- write `shape: none`")
            if shape and shape != "none" and not isinstance(b.get("dia_m"), (int, float)):
                fail(where, f"booster shape {shape!r} needs `dia_m` -- the booster's width "
                            f"against the core is what the silhouette is")
            elif shape and shape != "none":
                dimension(where, b, "dia_m", "boosters.dia_m", dim_ceiling)
            dimension(where, b, "len_m", "boosters.len_m", len_ceiling)

        # 8. what sits on top, and how the body steps
        top = r.get("top")
        if not isinstance(top, dict) or top.get("kind") not in TOP_KINDS:
            fail(where, f"top.kind {(top or {}).get('kind')!r} is not one of {sorted(TOP_KINDS)}")
            top = top if isinstance(top, dict) else {}
        taper = r.get("taper")
        if taper not in TAPERS:
            fail(where, f"taper {taper!r} is not one of {sorted(TAPERS)}")
        if taper == "stepped":
            sections = r.get("sections")
            if not isinstance(sections, list) or len(sections) < 2:
                fail(where, "`taper: stepped` needs `sections:` with at least two diameters -- "
                            "the step IS the claim")
            else:
                for sec in sections:
                    if not isinstance(sec, dict) or not isinstance(sec.get("dia_m"), (int, float)):
                        fail(where, f"section {sec!r} has no dia_m")
                    else:
                        dimension(where, sec, "dia_m", "sections[].dia_m", dim_ceiling)
                        dimension(where, sec, "len_m", "sections[].len_m", len_ceiling)
        dimension(where, top, "dia_m", "top.dia_m", dim_ceiling)
        dimension(where, top, "len_m", "top.len_m", len_ceiling)
        if taper == "hammerhead" and not isinstance(top.get("dia_m"), (int, float)):
            fail(where, "`taper: hammerhead` claims the fairing is WIDER than the body, so it "
                        "needs `top.dia_m` to say by how much")

        # 9. engines
        eng = r.get("engines")
        if not isinstance(eng, dict):
            fail(where, "no `engines:`")
        else:
            if not isinstance(eng.get("count"), int) or isinstance(eng.get("count"), bool) or eng.get("count", 0) < 1:
                fail(where, "engines.count must be an integer of 1 or more")
            if eng.get("pattern") not in ENGINE_PATTERNS:
                fail(where, f"engines.pattern {eng.get('pattern')!r} is not one of {sorted(ENGINE_PATTERNS)}")

        # 10. provenance: what the card is allowed to say about this row
        if r.get("stands_for") not in STANDS_FOR:
            fail(where, f"stands_for {r.get('stands_for')!r} must be one of {sorted(STANDS_FOR)}")
        if r.get("class") not in EVIDENCE_CLASSES:
            fail(where, f"class {r.get('class')!r} must be one of {sorted(EVIDENCE_CLASSES)} -- "
                        f"say whether the numbers were read or worked out")
        if not r.get("source"):
            fail(where, "no source -- a shape with no evidence behind it is a guess with a hex colour")
        # The card prints this verbatim inside "sources disagree on its HEIGHT (...)", so the
        # field is named for the quantity it is about. It was called `disputed:` and the nuri row
        # used it for a DIAMETER disagreement, which the card then read out as a height dispute
        # on a height both sources agree on.
        if "disputed" in r:
            fail(where, "`disputed:` says nothing about WHAT is disputed and the card only knows "
                        "how to print a height; the field is `disputed_height:`")
        dh = r.get("disputed_height")
        if "disputed_height" in r and not (isinstance(dh, str) and dh.strip()):
            fail(where, f"disputed_height is {dh!r}; write the two figures as a sentence, or "
                        f"leave it out -- the card prints it inside 'sources disagree on its height'")
        livery = r.get("livery")
        if livery == "unknown":
            pass
        elif isinstance(livery, dict):
            if livery.get("class") not in EVIDENCE_CLASSES:
                fail(where, "livery has a colour but no class -- say measured or inferred, or "
                            "write livery: unknown")
            for zone, value in livery.items():
                if zone == "class":
                    continue
                if value != "unknown" and not (isinstance(value, str) and HEX.match(value)):
                    fail(where, f"livery.{zone} is {value!r}; write a #RRGGBB hex or `unknown`")
        else:
            fail(where, f"livery {livery!r} must be a map of zones or the literal `unknown`")

    # --- glossary and showers ------------------------------------------------------
    if len(terms) < 20:
        fail("glossary.yaml", f"only {len(terms)} terms; cards may not use a word that is not here")
    for t in terms:
        if not t.get("term") or not t.get("say"):
            fail("glossary.yaml", f"incomplete row {t!r}")
    for s in showers:
        where = f"showers.yaml[{s.get('id')}]"
        peak = s.get("peak", "")
        if not (isinstance(peak, str) and len(peak) == 5 and peak[2] == "-"):
            fail(where, f"peak {peak!r} must be `MM-DD`")
        if not s.get("note"):
            fail(where, "no note -- the ZHR is not the useful sentence")
    if not showers_doc.get("reviewed_against"):
        fail("showers.yaml", "must say which calendar it was last checked against")

    if errors:
        print(f"registry: {len(errors)} problem(s)\n")
        for e in errors:
            print(f"  {e}")
        return 1
    print(
        f"registry ok: {len(worlds)} worlds, {len(ladder)} ladder rungs, {len(lod_rules)} lod rules, "
        f"{len(dso_hand)} hand-placed deep-sky objects, {len(exotics)} exotics, {len(famous_stars)} famous stars, {len(ladder_rungs)} breadcrumb rungs, {len(aliases)} aliases, {len(colorkeys)} colour keys, "
        f"{len(sources)} sources, {len(layers)} layers, "
        f"{len(events)} event types, {len(models)} models, {len(real_models)} real models, "
        f"{len(marks)} third-party marks, {len(sites)} sites, "
        f"{len(terms)} glossary terms, {len(showers)} showers, "
        f"{len(oddities_doc.get('oddities') or [])} oddities "
        f"({sum(1 for o in (oddities_doc.get('oddities') or []) if (o.get('where') or {}).get('kind') == 'unknown')} "
        f"of them nobody can place), {len(rockets)} rockets "
        f"({len(observed)} feed values observed {rockets_doc.get('observed_on')}; "
        # Printed, not asserted. Three files quote this number in prose and it was wrong by 20;
        # a figure a human copies out of a comment drifts, and a figure the check prints does not.
        f"{sum(1 for r in rockets if r.get('livery') == 'unknown')} of {len(rockets)} "
        f"with no sourced livery)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
