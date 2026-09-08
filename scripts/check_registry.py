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
TOUR_STAGES = {"earth"}
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

        pacing = tour.get("pacing", defaults.get("pacing"))
        if pacing not in TOUR_PACING:
            fail(where, f"pacing `{pacing}` is not one of {sorted(TOUR_PACING)}")

        stage = tour.get("stage", defaults.get("stage"))
        if stage not in TOUR_STAGES:
            fail(where, f"stage `{stage}` is not supported. The rig is told its world radius once, "
                        f"at boot, and nothing subscribes to `sr:stage`, so a trip crossing stages "
                        f"would fly with its clearance sphere in the wrong place and its distances "
                        f"wrong by 1000x. `earth` is the only honest value today")

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
    return rows_


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
    for s in sites:
        sid = s.get("id")
        where = f"sites.yaml[{sid}]"
        if s.get("world") not in world_ids:
            fail(where, f"world `{s.get('world')}` has no worlds.yaml row")
        for key in ("lat", "lon"):
            if not isinstance(s.get(key), (int, float)):
                fail(where, f"`{key}` must be a number")
        if not s.get("doing"):
            fail(where, "no `doing:` line -- a site card with nothing to say is a dot")

    check_oddities(oddities_doc, world_ids, sites)
    ladder = check_stages(world_ids)
    lod_rules = check_lod()
    dso_hand = check_dso_hand()
    exotics = check_exotics()
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
        f"{len(dso_hand)} hand-placed deep-sky objects, {len(exotics)} exotics, "
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
