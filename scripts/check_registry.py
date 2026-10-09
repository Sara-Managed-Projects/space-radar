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
import math
import os
import re
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


# ONE PARSER, ASKED ONCE PER TEXT (2026-10-05). The pure-Python YAML scanner was three quarters of
# this script's run time: tours.yaml alone was parsed by twelve checks, and tests/test_refusals.py
# runs the whole script once per broken rule, 300-odd times. So: libyaml's loader when PyYAML was
# built with it (the same safe schema, the same data; the wheels CI installs have it), each
# distinct text parsed once per run, and -- only when $REGISTRY_YAML_CACHE names a directory, which
# the refusals harness does for its own temporary one -- the parse kept on disk under the SHA-256
# of the text, so a case that breaks one file does not pay again for the twenty it left alone.
# A parse is handed out as a deep copy, so no check can see another's edits to a document.
_YAML_LOADER = getattr(yaml, "CSafeLoader", yaml.SafeLoader)
_YAML_MEMO: dict = {}


def yaml_load(text):
    import copy
    import hashlib
    import pickle
    if not isinstance(text, str):
        return yaml.load(text, Loader=_YAML_LOADER)
    if text in _YAML_MEMO:
        return copy.deepcopy(_YAML_MEMO[text])
    cache_dir = os.environ.get("REGISTRY_YAML_CACHE")
    cached = Path(cache_dir) / (hashlib.sha256(text.encode("utf-8")).hexdigest() + ".pickle") if cache_dir else None
    doc, hit = None, False
    if cached is not None and cached.is_file():
        try:
            doc, hit = pickle.loads(cached.read_bytes()), True
        except Exception:  # a torn or foreign file is a miss, never an answer
            hit = False
    if not hit:
        doc = yaml.load(text, Loader=_YAML_LOADER)  # a YAMLError is the caller's to report, and is never cached
        if cached is not None:
            try:
                tmp = cached.with_name(f"{cached.name}.{os.getpid()}.tmp")
                tmp.write_bytes(pickle.dumps(doc))
                os.replace(tmp, cached)
            except OSError:
                pass
    _YAML_MEMO[text] = doc
    return copy.deepcopy(doc)
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
# And a layer the PAGE fetches for itself, as weather (spec 0066): its host, the day the CORS header
# was measured and its licence are a registry/weather.yaml row -- the effect whose `layer:` is the
# layer's id -- not a sources.yaml row, which is a row for the harvester and demands a parser.
WEATHER_SOURCE = "weather"

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
SITE_CLASSES = {"dish", "surface", "pad"}
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
UNCITED_SITES = frozenset({"apollo-11", "apollo-17", "change-4", "jezero", "utopia"})
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


TOUR_TARGET_KEYS = ("record", "layer", "world", "site", "observer", "sky")
# --- what a stop adds to the scene (2026-10-05) ---------------------------------------------------
# `target: {sky: [ra, dec]}` looks at the sky from where the Sun is (ui/trip.js SKY_NEAR_KM), and
# only the stellar rung has the Sun at its centre and the sky sphere round it. The figures are the
# ids of site/data/constellations.lines.json (d3-celestial's, the IAU's three letters, with the
# Serpent in one piece); written out here because the validator runs in trees that carry no
# site/data. Celestial north is the camera's up on such a stop, so a target within five degrees
# of a pole has no "sideways" for the rig to turn in.
TOUR_SKY_STAGE = "stellar"
TOUR_SKY_MAX_DEC = 85
TOUR_SKY_MAX_DEPTH_LY = 5000
TOUR_SKY_MAX_ASIDE_DEG = 120
TOUR_FIGURES = frozenset("""And Ant Aps Aql Aqr Ara Ari Aur Boo CMa CMi CVn Cae Cam Cap Car Cas Cen Cep Cet Cha Cir Cnc Col Com CrA CrB Crt Cru Crv Cyg Del Dor Dra Equ Eri For Gem Gru Her Hor Hya Hyi Ind LMi Lac Leo Lep Lib Lup Lyn Lyr Men Mic Mon Mus Nor Oct Oph Ori Pav Peg Per Phe Pic PsA Psc Pup Pyx Ret Scl Sco Sct Ser Ser Sex Sge Sgr Tau Tel TrA Tri Tuc UMa UMi Vel Vir Vol Vul""".split())
TOUR_MAX_FIGURES = 6
TOUR_MAX_FIGURE_STARS = 5
TOUR_ZOOM_MIN = 0.6
TOUR_EXPOSURES = {"eye", "camera", "deep"}
# `live_note:` -> the worlds a stop may be about to carry it, and whether the sentence is about THIS
# WEEK (so the stop must show now). `season` is the date on the clock's, `tonight` is the visitor's
# coming night whatever the stop shows, so neither needs `time: now`.
TOUR_LIVE_NOTES = {
    "clouds": ({"earth"}, True),
    "aurora": ({"earth"}, True),
    "lightning": ({"earth"}, True),
    "space-weather": ({"earth", "sun"}, True),
    "season": ({"mars"}, False),
    "tonight": ({"mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"}, False),
    # 2026-10-06, the remaining shows. `close-approach`: the next pass in JPL's table, as the
    # `asteroids` layer loaded it, so it is this week's and the stop shows now. `satellites`: the
    # count of the `active` catalogue on screen; that trip may not move the clock at all (the
    # freeze refusal), so the stop is at the visitor's own instant without saying so.
    "close-approach": ({"earth"}, True),
    "satellites": ({"earth"}, False),
}
# The layer a live sentence counts from, which the trip must therefore load.
TOUR_LIVE_NOTE_LAYERS = {"close-approach": "asteroids", "satellites": "active"}
# --- a stop seen from the visitor's own ground (2026-10-06) ---------------------------------------
# `look:` on a `target: {observer: true}` stop: the sky view (sky/skyview.js) takes the camera and
# turns to one thing, which sky/lookfor.js finds for whoever is asking. Exactly one key.
TOUR_LOOK_KEYS = ("world", "sky", "best", "pass", "shower")
TOUR_LOOK_WORLDS = {"moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune"}
TOUR_LOOK_BEST = {"planet", "star", "figure", "milky-way"}
# `look: {shower: next}` (2026-10-06): the radiant of the next shower in registry/showers.yaml.
TOUR_LOOK_SHOWERS = {"next"}
# `darkness:` on a stop seen from the ground: the three skies of site/js/sky/skymath.js DARKNESS.
TOUR_DARKNESS = {"city", "town", "dark"}
# `portrait: true`: the registry/exotics.yaml rows that carry a picture (`image:`), as record ids;
# filled in main(). The picture is drawn at the object's place, far larger than it would look.
TOUR_PORTRAITS: set = set()
# The ground's lens: the sky view is 72 degrees tall, in which the Moon is five pixels. Up to 6.
TOUR_LOOK_ZOOM_MAX = 6
# registry/overlays.yaml's rows, id -> world, filled by main() before the trips are read.
TOUR_OVERLAYS: dict = {}
TOUR_PACING = {"auto", "reader"}
TOUR_CLOCKS = {"as-found", "live", "freeze"}
TOUR_DRIFTS = {"toward-light", "away", "none"}
TOUR_EASES = {"auto", "ui", "inout", "cruise", "linear"}
# How a stop is joined to the one before it (internal #288): the flight, a cut, or a fade through black.
TOUR_TRANSITIONS = {"fly", "cut", "black"}
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
# The trip's intro shows the blurb in the sidebar and in the phone's sheet, about 40 characters to a
# line: 80 is two lines. Internal #333 measured four (158 characters) where docs/ui-guide.md 3.17
# asks for a line or two. The narration reads title + body, never the blurb.
TOUR_MAX_BLURB = 80
# Spec 0034 req 3: a stop's `chapter:` is a title card in the letterbox's top bar -- "Chapter two:
# the ringed planet" -- and not a sentence. Forty characters is what the bar holds on a 390 px
# phone beside the trip's own title before either is cut with an ellipsis.
CHAPTER_MAX = 40
# The same six-word test tests/test_contract.mjs applies between a trip card and the record card
# under it: six words in a row shared is a repeat.
CHAPTER_REPEAT_WORDS = 6
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

# The event types site/js/data/events.js computes in the browser with astronomy-engine (spec
# 0031). A `source: computed` row outside this set is a type nothing would ever build.
COMPUTED_EVENT_TYPES = frozenset({"solar-eclipse", "lunar-eclipse", "solstice", "equinox"})


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

# --- a stop at the visitor's own place (spec 0038) ------------------------------------------------
# `target: {observer: true}` is the ground under the visitor: the place they set, or the guess from
# their clock (site/js/sky/guessplace.js). THE CLEARANCE: scene/camera.js WORLD_CLEARANCE 1.02
# puts the camera's floor 127 km above the Earth, and ui/trip.js sees a ground subject from 36 to
# 76 degrees off its vertical (GROUND_POLARS), so the camera is at most distance x cos 36 degrees
# up. Below 127 / cos 36 = 157 km every angle is under the floor and the rig pushes the camera out;
# the spec's 130 km (and its 150 km first stop) were written from the floor alone, and measured
# 2026-09-23 they left no angle the key light could choose. 160 is the next round number.
TOUR_OBSERVER_MIN_KM = 160
# The bundled places a visitor can pick (site/js/copy/en.js CITIES). A card on a trip that starts
# from the visitor may not name one: the place is generated, and it is a different one for every
# visitor. Read in main(); a tree with no site/js (tests/test_growth.py) cannot look, and does not.
TOUR_CITY_NAMES: set[str] = set()


def load_city_names() -> set[str]:
    en = ROOT / "site/js/copy/en.js"
    if not en.exists():
        return set()
    block = re.search(r"export const CITIES = \[([\s\S]*?)\n\];", en.read_text(encoding="utf-8"))
    return set(re.findall(r"name: '([^']+)'", block.group(1))) if block else set()


# --- a stop's own clock (spec 0030) ---------------------------------------------------------------
# A stop may name the instant it is shown at (`time:`) and how fast the clock runs while it is
# (`rate:`). ui/trip.js moves the clock before the shot is composed and puts it back on leave.
#
# THE CAPS ARE THE REASON THE FIELD IS SAFE, and each one is the number some other file already
# lives by. 60 is ui/trip.js CLOCK_RATE_CEILING: above a minute a second a station laps the planet
# in under a real minute while `follow` holds the camera on it, and at 36 000 in 0.15 s. 36 000 is
# the top of site/js/clock.js RATES, the fastest a visitor can set by hand, allowed on a target
# that is not in Earth orbit. Above it, to a million, only on the Sun's stage or a rung of the
# ladder, where a world's own motion around the Sun is the picture and nothing on the stage is an
# SGP4 object anybody is following. 525 600 -- a year a minute -- is the one the first trip uses.
TOUR_RATE_TRIP_CEILING = 60
TOUR_RATE_WORLD_CEILING = 36000
TOUR_RATE_MAX = 1000000
# The SGP4 layers, filled in main() from registry/layers.yaml `propagator: sgp4`, and the event
# types an `{event:}` reference may name, from registry/events.yaml.
TOUR_SGP4_LAYERS: set[str] = set()
TOUR_EVENT_TYPES: set[str] = set()
# A GP record's id is `sat-<norad>` or `int-<designator>` (site/js/data/parsers.js), so a
# `record:` target of that shape is an SGP4 object as surely as a `layer:` target is.
TOUR_SGP4_RECORD = re.compile(r"^(sat|int)-")
# An ISO instant, in UTC, and nothing looser: `Z` or nothing, because a stop's instant is a claim
# about the world and a local-time reading of it would be off by the visitor's offset. The range is
# the design's (spec 0030 design §1): from Sputnik 1 on 1957-10-04, before which nothing in this
# app was up there, to 2100, past which nobody has written the ephemeris down.
TOUR_TIME_ISO = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$")
TOUR_TIME_FIRST = datetime.datetime(1957, 10, 4, tzinfo=datetime.timezone.utc)
TOUR_TIME_LAST = datetime.datetime(2100, 1, 1, tzinfo=datetime.timezone.utc)
# An event reference counts from the visitor's clock to the NEXT one and then offsets it: 90
# minutes before an eclipse, the minute a pass tops out. A month either side is the most any trip
# the programme designs asks for (spec 0030 design §5); more is a different event.
TOUR_EVENT_OFFSET_MAX_S = 30 * 86400
# THE CARD MAY NOT STATE THE TIME THE STOP SETS. The "Shown at" line under it is generated from
# the clock (ui/tripframe.js), so a card that also writes the date is a second copy of a number,
# and the first one to be wrong is the typed one. A four-digit year, a clock time, a day and month.
TOUR_CARD_TIME = re.compile(
    r"\b(1[5-9]|20|21)\d{2}\b"
    r"|\b\d{1,2}:\d{2}\b"
    r"|\b\d{1,2}(st|nd|rd|th)? (of )?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b"
    r"|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}\b"
)
# --- eclipse stops (spec 0037) -----------------------------------------------------------------
# `{event: <type>.next, kind: <word>}` narrows an eclipse to one kind: the library's own words for
# it (astronomy.js EclipseKind), mirrored in site/js/data/events.js ECLIPSE_KINDS, which is what
# nextEvent() filters on. A kind on any other type, or a word not in the type's list, is a stop that
# could never resolve.
ECLIPSE_KINDS = {
    "solar-eclipse": ("total", "annular", "partial", "hybrid"),
    "lunar-eclipse": ("total", "partial", "penumbral"),
}
# The turns of the year have kinds too (internal #384): the month each falls in, as
# site/js/data/events.js SEASON_KINDS has them. Not eclipses: no front-lit rule follows from one.
EVENT_KINDS = {
    **ECLIPSE_KINDS,
    "solstice": ("june", "december"),
    "equinox": ("march", "september"),
}
# The shadow is on the Sun's side of the Earth (or of the Moon), so an eclipse stop is lit from the
# front: docs/design-language.md, "0 deg for an eclipse". Past 60 degrees round from the Sun the
# camera sees the shadow at a grazing angle or not at all.
ECLIPSE_KEY_LIGHT_MAX_DEG = 60
# Never alarm (spec 0037 req 6): the words are "shadow" and "path", and this app is not where anybody
# looks at the Sun, so it gives no safety warning either. The same mechanism as TOUR_CERTAINTY_WORDS.
ECLIPSE_STOP_WORDS = ("darkness falls", "goes out", "danger", "protect your eyes", "blinding")
# The other three word lists of spec 0043 design section 1 (internal #121), applied in check_tour_stop().
# A hero model is drawn at its own size on its own stage, so a card on it may not say "to scale"; a
# system planet's look is `illustrative` and generated, so its card may not describe the look; and a
# card may not write a line the generator writes ("Shown at ...").
HERO_SIZE_WORDS = ("to scale", "true size", "actual size", "real size")
SYSTEM_LOOK_WORDS = ("looks like", "ocean", "blue", "green", "clouds", "continents")
GENERATED_WORDS = ("shown at", "computed", "generated", "drawn at class size")
# The source-near-the-number rule (design section 2): a digit on a card needs a `read YYYY-MM-DD`
# comment within TOUR_CARD_READ_LINES lines above its `card:`. The file is read as text because the YAML
# parser drops comments. Stops written before the rule that have no such comment cannot be given one
# without reading their pages again; registry/tours-read-pending.yaml names them (a ratchet: a stop that
# gains its comment must leave the list, and a stop not on the list must have one).
TOUR_CARD_READ_DATE = re.compile(r"read 20\d\d-\d\d-\d\d")
TOUR_CARD_READ_LINES = 10

# The sentence the `clock: freeze` refusal already says, for the same cost from the same cause.
TOUR_ACTIVE_SCRUB = ("flips the clock to scrub, which re-propagates every object every frame "
                     "instead of every 100 ms, and `active` is eleven thousand of them")


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


def stop_draws_a_model(stop: dict, kind: str, value) -> bool:
    """True where the stop frames a drawn craft or several things at once: a `group:`, a station, a
    probe (`deep-*` records, whose model the browser looks up by name in scene/realmodels.js, a table
    this script does not mirror). HERO_SIZE_WORDS is scoped to these."""
    return "group" in stop or kind == "layer" and value == "stations" or \
        kind == "record" and str(value).startswith("deep-")


def tour_cards_without_read(text: str) -> set[str]:
    """`trip.stop` keys of every stop whose card has a digit and no `read YYYY-MM-DD` comment in the
    TOUR_CARD_READ_LINES lines above its `card:` (spec 0043 design section 2). Read as text: the
    YAML parser drops comments, the way TOUR_DOUBLE_HYPHEN is checked."""
    lines = text.splitlines()
    out: set[str] = set()
    trip = stop = None
    for i, line in enumerate(lines):
        m = re.match(r"^  - id:\s*(\S+)", line)
        if m:
            trip, stop = m.group(1).strip("\"'"), None
        m = re.match(r"^      - id:\s*(\S+)", line)
        if m:
            stop = m.group(1).strip("\"'")
        if line.strip() != "card:":
            continue
        indent = len(line) - len(line.lstrip())
        j, body = i + 1, []
        while j < len(lines) and (not lines[j].strip() or len(lines[j]) - len(lines[j].lstrip()) > indent):
            if not lines[j].strip().startswith("#"):
                body.append(lines[j])
            j += 1
        if re.search(r"\d", " ".join(body)) and \
                not any(TOUR_CARD_READ_DATE.search(x) for x in lines[max(0, i - TOUR_CARD_READ_LINES):i]):
            out.add(f"{trip}.{stop}")
    return out


def check_tour_card_sources(text: str) -> None:
    """The ratchet over tour_cards_without_read(): registry/tours-read-pending.yaml may only shrink."""
    pending_path = REG / "tours-read-pending.yaml"
    pending = set()
    if pending_path.exists():
        pending = {str(x) for x in ((yaml_load(pending_path.read_text(encoding="utf-8")) or {}).get("stops") or [])}
    missing = tour_cards_without_read(text)
    for key in sorted(missing - pending):
        fail(f"tours.yaml[{key}]", "a number on a card with no `read YYYY-MM-DD` source in the comment "
                                   f"within {TOUR_CARD_READ_LINES} lines above its `card:`. Read the page, write the "
                                   "date where you read it, and never put a stop on tours-read-pending.yaml to pass")
    for key in sorted(pending - missing):
        fail(f"tours.yaml[{key}]", "is on registry/tours-read-pending.yaml as a stop with no `read` comment, but it has one (or "
                                               "no number, or no longer exists): remove it from the list")


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
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("tours.yaml", f"will not parse: {exc}")
        return

    check_tour_card_sources(path.read_text(encoding="utf-8"))
    unreachable = unreachable_oddities(oddities_doc)
    defaults = doc.get("defaults") or {}
    TOUR_DEFAULTS_SEEN.clear()
    TOUR_DEFAULTS_SEEN.update(defaults)
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
        elif len(str(tour.get("blurb"))) > TOUR_MAX_BLURB:
            fail(where, f"blurb is {len(str(tour.get('blurb')))} characters, over {TOUR_MAX_BLURB}: two lines on the intro, no more")
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

        # `hides:` (2026-10-05): layers switched OFF while the trip runs. A layer the trip also
        # needs on is two answers to one question, and so is one a stop is aimed into.
        hides = tour.get("hides")
        if hides is not None:
            if not isinstance(hides, list) or not hides:
                fail(where, "`hides:` must be a non-empty list of layer ids")
            else:
                stop_layers = set()
                for s in (tour.get("stops") or []):
                    if isinstance(s, dict):
                        stop_layers.add(s.get("needs_layer"))
                        if isinstance(s.get("target"), dict):
                            stop_layers.add(s["target"].get("layer"))
                for lid in hides:
                    if lid not in layer_ids:
                        fail(where, f"hides layer `{lid}`, which has no layers.yaml row")
                    elif lid in requires or lid in stop_layers:
                        fail(where, f"hides layer `{lid}` and also needs it on: a stop would fly to "
                                    f"something the trip itself switched off")

        # Freezing the clock flips it from live to scrub, which drops glyph re-propagation from
        # every 100 ms to EVERY FRAME (site/js/main.js). With `active` on that is eleven thousand
        # SGP4 propagations per frame.
        if clock == "freeze" and "active" in requires:
            fail(where, "`clock: freeze` on a trip that requires `active`: freezing flips the "
                        "clock to scrub, which re-propagates every object every frame instead of "
                        "every 100 ms, and `active` is eleven thousand of them")

        # A STOP THAT MOVES THE CLOCK PUTS THE APP IN SCRUB FOR THE REST OF THE TRIP (ui/trip.js
        # owns it until leave), so the freeze refusal above covers it too, for the same cost. The
        # catalogue can come in through the trip's `requires`, a stop's `needs_layer` or a stop
        # aimed into it, and any of the three is the same eleven thousand objects.
        stop_rows = [s for s in (tour.get("stops") or []) if isinstance(s, dict)]
        timed = [s.get("id") for s in stop_rows if "time" in s or "rate" in s]
        wants_active = "active" in requires or any(
            s.get("needs_layer") == "active" or (s.get("target") or {}).get("layer") == "active"
            for s in stop_rows if isinstance(s.get("target") or {}, dict))
        if timed and wants_active:
            fail(where, f"stop(s) {', '.join(map(str, timed))} set `time:` or `rate:` on a trip that "
                        f"loads `active`: moving the clock {TOUR_ACTIVE_SCRUB}")
        # A frozen trip and a stop that runs the clock are two answers to one question.
        if clock == "freeze" and any("rate" in s for s in stop_rows):
            fail(where, "`clock: freeze` and a stop with `rate:`: the trip says the clock stands "
                        "still and a stop says how fast it runs. Drop one")

        # A TRIP FROM THE VISITOR'S OWN PLACE SAYS SO (spec 0038), so the picker can grey it with
        # "Needs a place" when there is none; and one that says so has such a stop, or it greys
        # itself for nothing. Its station stops need the stations layer loaded before it is planned.
        wants_place = tour.get("requires_observer", False)
        if not isinstance(wants_place, bool):
            fail(where, f"`requires_observer: {wants_place!r}` is true or false")
            wants_place = False
        at_place = [s.get("id") for s in stop_rows
                    if isinstance(s.get("target"), dict) and "observer" in s["target"]]
        if wants_place and not at_place:
            fail(where, "`requires_observer: true` and no stop is `target: {observer: true}`: the "
                        "trip would be greyed for want of a place it never visits")
        if wants_place and "stations" not in requires and any(
                isinstance(s.get("target"), dict) and s["target"].get("layer") == "stations"
                for s in stop_rows):
            fail(where, "a trip from the visitor's place with a stop on the `stations` layer does not "
                        "list `stations` in `requires:`, so it is planned before the station is loaded "
                        "and its pass cannot be found")

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

        # `og_stop:` (2026-09-23): the stop the preview picture is taken at, 1-based. A number
        # past the end would have scripts/shots.mjs photograph whatever jumpTo() clamps it to, a
        # picture of a stop nobody chose. `True` is refused too: YAML reads `yes` as a bool, and a
        # bool is an int in Python.
        og_stop = tour.get("og_stop")
        if og_stop is not None and (isinstance(og_stop, bool) or not isinstance(og_stop, int)
                                    or not 1 <= og_stop <= len(stops)):
            fail(where, f"`og_stop: {og_stop!r}` is not one of its {len(stops)} stops (1 to "
                        f"{len(stops)}); the preview picture would be of a stop nobody chose")

        # `return: true` (internal #304): after the last stop the camera flies home in one continuous
        # flight (scene/climb.js toHome). That flight exists only along the chain of
        # registry/stages.yaml `joins:`; from a planet's own stage or a star system's there is no
        # way home but a cut, and a trip that promised "one flight home" there would end on a cut.
        if "return" in tour:
            if tour["return"] is not True:
                fail(where, f"`return: {tour['return']!r}` is `true` or left out")
            else:
                last = stops[-1] if stops else {}
                on = (last.get("stage") if isinstance(last, dict) else None) or tour.get("stage", defaults.get("stage"))
                if on not in JOIN_BANDS:
                    fail(where, f"`return: true` on a trip that ends on the `{on}` stage, which is not on the "
                                f"chain of registry/stages.yaml `joins:`: there is no continuous flight home "
                                f"from there")
                elif isinstance(last, dict) and "look" in last:
                    fail(where, "`return: true` on a trip that ends on the ground: it is home already")

        # `orbits:` (2026-09-23): planets whose paths and dots scene/orbitrings.js draws. It draws
        # on the Sun stage only -- everywhere else worlds.js already floors the planets, and a dot
        # beside a squeezed disc is two answers to where Mars is -- and only a world that goes
        # round the Sun has a path round it to draw.
        orbits = tour.get("orbits")
        if orbits is not None:
            if not isinstance(orbits, list) or not orbits:
                fail(where, "`orbits:` must be a non-empty list of planets")
            else:
                # 2026-10-07: a trip with a stop of its own on the Sun's stage (the one flight from
                # the ground to the edge passes through it) may name the planets too; orbitrings.js
                # and the frame's line both read the stage the map is on, not the trip's.
                on_sun = stage == "sun" or any(isinstance(sp, dict) and sp.get("stage") == "sun" for sp in stops)
                # 2026-10-06: the Earth's stage draws one path, the Moon's (scene/orbitrings.js).
                if stage == "earth" and not on_sun:
                    if orbits != ["moon"]:
                        fail(where, f"`orbits: {orbits!r}` on the Earth's stage; the one path drawn "
                                    f"there is the Moon's: write `orbits: [moon]`")
                elif not on_sun:
                    fail(where, f"`orbits:` on a trip on the `{stage}` stage; the paths are drawn "
                                f"on the Sun stage only, so the trip would promise lines it never "
                                f"shows")
                for wid in ([] if stage == "earth" and not on_sun else orbits):
                    # A trip on the Earth's stage that also passes through the Sun's may name the Moon as well.
                    if wid == "moon" and stage == "earth":
                        continue
                    if wid not in world_ids:
                        fail(where, f"`orbits:` names `{wid}`, which has no worlds.yaml row")
                    elif TOUR_WORLD_PARENTS.get(wid) != "sun" or wid == "sun":
                        fail(where, f"`orbits:` names `{wid}`, which does not go round the Sun, so "
                                    f"it has no path round it to draw")
                if len(set(map(str, orbits))) != len(orbits):
                    fail(where, "`orbits:` names a planet twice")

        seen_stops: set[str] = set()
        for n, stop in enumerate(stops, start=1):
            check_tour_stop(tour, stop, n, seen_stops, defaults, unreachable,
                            layer_ids, world_ids, site_ids, glossary)


def check_sky_stop(stop: dict, where: str, target: dict, flown_on) -> None:
    """`target: {sky: [ra, dec]}` (2026-10-05): a look at the sky from where the Sun is, and with
    `depth_ly` a look at how deep it is. A direction is not a record, so everything a record would
    have vouched for is checked here."""
    value = target.get("sky")
    ok = isinstance(value, list) and len(value) == 2 and all(is_number(v) for v in value)
    if not ok:
        fail(where, f"`sky: {value!r}` must be [right ascension, declination] in degrees, two numbers")
        return
    ra, dec = value
    if not 0 <= ra < 360:
        fail(where, f"`sky:` right ascension {ra:g} is outside 0 to 360 degrees")
    if abs(dec) > TOUR_SKY_MAX_DEC:
        fail(where, f"`sky:` declination {dec:g} is within {90 - TOUR_SKY_MAX_DEC} degrees of a pole: "
                    f"celestial north is the camera's up on a sky stop, and at the pole the rig has "
                    f"no sideways to turn in. Aim beside the pole")
    if flown_on != TOUR_SKY_STAGE:
        fail(where, f"a `sky:` target on the `{flown_on}` stage: the camera stands where the Sun is and "
                    f"looks out, which only the `{TOUR_SKY_STAGE}` rung has at its centre")
    extra = sorted(set(target) - {"sky", "depth_ly"})
    if extra:
        fail(where, f"`target:` has {extra} beside `sky:`; a sky target takes `depth_ly` and nothing else")
    depth = target.get("depth_ly")
    if depth is None:
        if "distance_km" in stop:
            fail(where, "`distance_km` on a `sky:` target without `depth_ly`: the camera stands where the "
                        "Sun is, so the sky is the one seen from Earth, and a distance would move it off")
        if "aside_deg" in stop:
            fail(where, "`aside_deg` on a `sky:` target without `depth_ly`: there is no depth to stand "
                        "aside from")
        return
    if not is_number(depth) or not 0 < depth <= TOUR_SKY_MAX_DEPTH_LY:
        fail(where, f"`depth_ly: {depth!r}` must be a number of light-years up to {TOUR_SKY_MAX_DEPTH_LY}: "
                    f"beyond that the stars of a figure are behind the camera, not in front of it")
    if not is_number(stop.get("distance_km")):
        fail(where, "`depth_ly` without `distance_km`: a look at the depth says how far from the point "
                    "the camera stands")
    aside = stop.get("aside_deg")
    if not is_number(aside) or not 0 < abs(aside) <= TOUR_SKY_MAX_ASIDE_DEG:
        fail(where, f"`aside_deg: {aside!r}` must be a number of degrees, not zero, up to "
                    f"{TOUR_SKY_MAX_ASIDE_DEG} either way: at zero the camera is on the line from the "
                    f"Sun and the depth cannot be seen")


def clock_left_elsewhere(tour: dict, n: int):
    """The id of the stop that left the clock at a written instant or an event before stop `n`, with
    no `time: now` since, or None. ui/trip.js keeps the clock where a timed stop put it."""
    last = None
    for prev in (tour.get("stops") or [])[: n - 1]:
        if isinstance(prev, dict) and "time" in prev:
            last = None if prev.get("time") == "now" else prev.get("id")
    return last


# `framing: sunrise` (internal #313): the camera on the night side with the Sun's centre this far
# behind the limb (ui/trip.js SUNRISE_HIDDEN_DEG), and the drift, towards the light, brings it out.
TOUR_FRAMINGS = ("sunrise",)
# The `defaults:` of the tours.yaml being checked, for the checks that read a stop's own fields.
TOUR_DEFAULTS_SEEN: dict = {}
SUNRISE_HIDDEN_DEG = 2
SUNRISE_MIN_DRIFT_DEG = 2 * SUNRISE_HIDDEN_DEG
SUNRISE_MAX_RATE = 3600


def worlds_with_air() -> set:
    """The worlds registry/worlds.yaml draws with an atmosphere (`look.atmosphere`)."""
    doc = yaml.safe_load((ROOT / "registry" / "worlds.yaml").read_text(encoding="utf-8")) or {}
    return {w.get("id") for w in doc.get("worlds") or []
            if isinstance(w, dict) and isinstance(w.get("look"), dict) and w["look"].get("atmosphere")}


def check_sunrise(tour: dict, stop: dict, where: str, kind: str, value) -> None:
    """`framing:` on a stop. One framing exists: `sunrise`, the Sun about to clear the limb of a
    world with air. Every refusal is a way the frame would not be that."""
    if "framing" not in stop:
        return
    framing = stop.get("framing")
    if framing not in TOUR_FRAMINGS:
        fail(where, f"`framing: {framing!r}` is not a framing; there is one: {', '.join(TOUR_FRAMINGS)}")
        return
    defaults = TOUR_DEFAULTS_SEEN
    if kind != "world" or value not in worlds_with_air():
        fail(where, f"`framing: sunrise` on a stop that is not at a world with air: the frame is the "
                    f"Sun lighting the air along the limb, and worlds.yaml draws an atmosphere only on "
                    f"{', '.join(sorted(worlds_with_air()))}")
    if "distance_km" in stop:
        fail(where, "`framing: sunrise` with `distance_km:`: how far behind the limb the Sun stands is "
                    "worked out from the disc's size in the frame; give `frame_radii:`")
    for other in ("key_light_deg", "over", "seen_from", "behind"):
        if other in stop:
            fail(where, f"`framing: sunrise` and `{other}:` are two answers to where the camera stands. "
                        f"Drop one")
    drift = stop.get("drift", defaults.get("drift"))
    drift_deg = stop.get("drift_deg", defaults.get("drift_deg"))
    if drift != "toward-light":
        fail(where, f"`framing: sunrise` with `drift: {drift}`: the Sun comes out because the camera "
                    f"turns towards the light")
    if not is_number(drift_deg) or drift_deg < SUNRISE_MIN_DRIFT_DEG:
        fail(where, f"`framing: sunrise` with `drift_deg: {drift_deg!r}`: the Sun starts "
                    f"{SUNRISE_HIDDEN_DEG} degrees behind the limb, so under {SUNRISE_MIN_DRIFT_DEG} "
                    f"degrees of drift it would never clear it and the stop would be a black disc")
    rate = stop.get("rate")
    if is_number(rate) and rate > SUNRISE_MAX_RATE:
        fail(where, f"`framing: sunrise` with `rate: {rate:g}`: above {SUNRISE_MAX_RATE} the world's own "
                    f"turning, not the camera, decides what the limb shows")
    when = stop.get("time")
    if isinstance(when, dict) and str(when.get("event") or "").partition(".")[0] in ECLIPSE_KINDS:
        fail(where, "`framing: sunrise` on an eclipse stop: that shot is lit from the front (spec 0037)")


def check_true_size(tour: dict, stop: dict, where: str) -> None:
    """`true_size: true` (internal #290): the stop puts the planets' dots away and the frame prints
    how wide the widest of them really is. There must be dots to put away."""
    if "true_size" not in stop:
        return
    if stop.get("true_size") is not True:
        fail(where, f"`true_size: {stop.get('true_size')!r}`: write `true_size: true` or leave it out")
        return
    flown_on = stop.get("stage") or tour.get("stage", TOUR_DEFAULTS_SEEN.get("stage"))
    orbits = tour.get("orbits")
    if flown_on != "sun" or not isinstance(orbits, list) or not orbits or orbits == ["moon"]:
        fail(where, f"`true_size: true` on a stop flown on the `{flown_on}` stage of a trip with "
                    f"`orbits: {orbits!r}`: the reveal puts away the dots scene/orbitrings.js draws for "
                    f"`orbits:` on the Sun's stage, and here there are none")
    body = str((stop.get("card") or {}).get("body") or "").lower()
    for word in ("each dot", "the dots", "third dot", "a dot"):
        if word in body:
            fail(where, f"`true_size: true` under a card that says \"{word}\": the dots are put away "
                        f"while it is read")


def check_stop_extras(tour: dict, stop: dict, n: int, where: str, kind: str, value) -> None:
    """What a stop adds to the scene (2026-10-05): figures, the ecliptic, a shutter, an overlay, a
    place to stand over, a live sentence. Each is a promise about the picture, so each is refused
    where the picture could not keep it."""
    sky = kind == "sky"
    check_sunrise(tour, stop, where, kind, value)
    check_true_size(tour, stop, where)
    figures = stop.get("figures")
    if figures is not None:
        if not isinstance(figures, list) or not figures:
            fail(where, "`figures:` must be a non-empty list of constellation ids")
        else:
            for fid in figures:
                if fid not in TOUR_FIGURES:
                    fail(where, f"`figures:` names `{fid}`, which is not a figure in "
                                f"site/data/constellations.lines.json; the stop would draw nothing "
                                f"where it promised one")
            if len(set(map(str, figures))) != len(figures):
                fail(where, "`figures:` names a figure twice")
            if len(figures) > TOUR_MAX_FIGURES:
                fail(where, f"`figures:` names {len(figures)} figures, over {TOUR_MAX_FIGURES}: each is "
                            f"drawn in turn, and the stop would end before the last stroke")
        if not sky:
            fail(where, "`figures:` on a stop that is not a `sky:` target: the figures are drawn round "
                        "the camera's own sky, and no other stop looks at it")
    stars = stop.get("figure_stars")
    if stars is not None:
        if isinstance(stars, bool) or not isinstance(stars, int) or not 0 <= stars <= TOUR_MAX_FIGURE_STARS:
            fail(where, f"`figure_stars: {stars!r}` must be a whole number from 0 to "
                        f"{TOUR_MAX_FIGURE_STARS}: eight names is all the screen holds")
        if figures is None:
            fail(where, "`figure_stars` without `figures:`: there is no figure whose stars to name")
    if "ecliptic" in stop:
        if stop["ecliptic"] is not True:
            fail(where, f"`ecliptic: {stop['ecliptic']!r}` is `true` or left out")
        elif not sky:
            fail(where, "`ecliptic: true` on a stop that is not a `sky:` target: the line is drawn on "
                        "the camera's own sky")
    zoom = stop.get("zoom")
    if zoom is not None:
        looking = kind == "observer" and "look" in stop
        if looking:
            if not is_number(zoom) or not 1 <= zoom <= TOUR_LOOK_ZOOM_MAX:
                fail(where, f"`zoom: {zoom!r}` on a stop seen from the ground must be a number from 1 to "
                            f"{TOUR_LOOK_ZOOM_MAX}: the sky view is already a wide lens, and past "
                            f"{TOUR_LOOK_ZOOM_MAX} times a head turn swings the picture off the screen")
        elif not is_number(zoom) or not TOUR_ZOOM_MIN <= zoom <= 1:
            fail(where, f"`zoom: {zoom!r}` must be a number from {TOUR_ZOOM_MIN} to 1: under 1 is a wider "
                        f"angle, and wider than that the sky at the edges is stretched out of shape")
        if not sky and not looking:
            fail(where, "`zoom:` on a stop that is not a `sky:` target: everything else is framed by "
                        "distance, and a lens would change how big a model looks")
    exposure = stop.get("exposure")
    if exposure is not None:
        if exposure not in TOUR_EXPOSURES:
            fail(where, f"`exposure: {exposure}` is not one of {sorted(TOUR_EXPOSURES)}")
        looking = kind == "observer" and "look" in stop
        pictured = kind == "record" and str(value).startswith("dso-")
        if not sky and not looking and not pictured:
            fail(where, "`exposure:` on a stop that is not a `sky:` target, a look from the ground or a "
                        "deep-sky object (`record: dso-...`): the shutter is the sky's and its "
                        "photographs', and nothing else on the map wears it")
    stale = clock_left_elsewhere(tour, n)
    own_time = stop.get("time", "now")
    overlay = stop.get("overlay")
    if overlay is not None:
        if overlay not in TOUR_OVERLAYS:
            fail(where, f"`overlay: {overlay}` has no registry/overlays.yaml row")
        elif not (kind == "world" and value == TOUR_OVERLAYS[overlay]):
            fail(where, f"`overlay: {overlay}` is a map of `{TOUR_OVERLAYS[overlay]}`, and this stop "
                        f"targets `{kind}: {value}`; the map would be on a world out of shot")
    over = stop.get("over")
    if over is not None:
        ok = isinstance(over, list) and len(over) == 2 and is_number(over[0]) and -90 <= over[0] <= 90 \
            and (over[1] in ("midnight", "noon") or (is_number(over[1]) and -180 <= over[1] <= 180))
        if not ok:
            fail(where, f"`over: {over!r}` must be [latitude, longitude] in degrees, north and east "
                        f"positive, or [latitude, midnight] / [latitude, noon] for the meridian facing "
                        f"away from the Sun or towards it")
        if kind != "world" or value == "sun":
            fail(where, "`over:` on a stop that is not a `world:` with a ground: it is a latitude and a "
                        "longitude on the world the stop is about")
        elif over[1] in ("midnight", "noon") and value != "earth":
            fail(where, f"`over: [latitude, {over[1]}]` is the Earth's night or day side, for the aurora and the clouds; on "
                        f"`{value}` write the longitude")
    live = stop.get("live_note")
    live_now = False
    if live is not None:
        if live not in TOUR_LIVE_NOTES:
            fail(where, f"`live_note: {live}` is not one of {sorted(TOUR_LIVE_NOTES)}")
        else:
            worlds, live_now = TOUR_LIVE_NOTES[live]
            if not (kind == "world" and value in worlds):
                fail(where, f"`live_note: {live}` on a stop that is not `target: {{world: ...}}` for one "
                            f"of {sorted(worlds)}: the sentence is about that world and no other")
            needs = TOUR_LIVE_NOTE_LAYERS.get(live)
            if needs and needs not in (tour.get("requires") or []) and stop.get("needs_layer") != needs:
                fail(where, f"`live_note: {live}` counts from the `{needs}` layer, which neither the "
                            f"trip's `requires:` nor this stop's `needs_layer:` loads: the sentence "
                            f"would have nothing to count")
            if live == "tonight" and tour.get("requires_observer") is not True:
                fail(where, "`live_note: tonight` is the planet in the VISITOR'S sky, on a trip that "
                            "does not say it needs a place (`requires_observer: true`)")
    # --- 2026-10-06, the remaining shows -----------------------------------------------------------
    if "portrait" in stop:
        if stop["portrait"] is not True:
            fail(where, f"`portrait: {stop['portrait']!r}` is `true` or left out")
        elif not (kind == "record" and value in TOUR_PORTRAITS):
            fail(where, f"`portrait: true` on a stop that is not at one of {sorted(TOUR_PORTRAITS)}: "
                        f"only a registry/exotics.yaml row with an `image:` has a picture to draw, "
                        f"and a ring pasted on anything else would be a fiction")
    if "darkness" in stop:
        if stop["darkness"] not in TOUR_DARKNESS:
            fail(where, f"`darkness: {stop['darkness']!r}` is not one of {sorted(TOUR_DARKNESS)}")
        if not (kind == "observer" and "look" in stop):
            fail(where, "`darkness:` on a stop that is not seen from the visitor's ground (`look:`): "
                        "it is the kind of sky the ground view wears, and no other view has one")
    if "names" in stop and stop["names"] is not True:
        fail(where, f"`names: {stop['names']!r}` is `true` or left out")
    seen_from = stop.get("seen_from")
    if seen_from is not None:
        if kind != "world":
            fail(where, "`seen_from:` on a stop that is not a `world:` target: it is the side of a "
                        "world the camera stands on")
        elif seen_from == value:
            fail(where, f"`seen_from: {seen_from}` is the stop's own subject")
        for other in ("over", "behind"):
            if other in stop:
                fail(where, f"`seen_from:` and `{other}:` are two answers to where the camera stands. Drop one")
        if (stop.get("drift_deg", 1) or 0) != 0:
            fail(where, "`seen_from:` needs `drift_deg: 0`: ui/trip.js re-aims the camera every frame "
                        "to stay on that side, and a drift would be fighting it")
    for label, has in (("overlay", overlay is not None), ("live_note", live is not None and live_now)):
        if not has:
            continue
        if own_time != "now":
            fail(where, f"`{label}:` on a stop with `time: {own_time}`: the picture is of this week, and "
                        f"the stop shows another day. Write `time: now` or leave it out")
        elif "time" not in stop and stale:
            fail(where, f"`{label}:` after stop `{stale}` moved the clock, with no `time: now` since: "
                        f"this week's picture would be drawn under another day's Sun. Give this stop, "
                        f"or one before it, `time: now`")


def check_observer_stop(tour: dict, stop: dict, where: str, value) -> None:
    """`target: {observer: true}` (spec 0038): the ground under the visitor."""
    if value is not True:
        fail(where, f"`observer: {value!r}`: the visitor's place is `target: {{observer: true}}` and "
                    f"nothing else")
    if tour.get("requires_observer") is not True:
        fail(where, "a stop at the visitor needs the trip to say it needs a place "
                    "(`requires_observer: true`), so the picker can say so")
    distance_km = stop.get("distance_km")
    if not is_number(distance_km):
        fail(where, "a stop at the visitor's place has no radius to frame by: give `distance_km:`")
    elif distance_km < TOUR_OBSERVER_MIN_KM:
        fail(where, f"`distance_km: {distance_km}` on the visitor's place: scene/camera.js "
                    f"WORLD_CLEARANCE 1.02 puts the camera floor 127 km above the Earth, and seen "
                    f"from at most 54 degrees above the horizon the camera is under it below "
                    f"{TOUR_OBSERVER_MIN_KM} km")
    when = stop.get("time")
    check_look(tour, stop, where)
    if when is not None and when not in ("now", "tonight", "night", "midnight") and not isinstance(when, dict):
        written = when.strftime("%Y-%m-%dT%H:%M:%SZ") if isinstance(when, datetime.datetime) else when
        fail(where, f"`time: {written}` on the visitor's place: its ground does not move but its sky "
                    f"does, and a written date is the same instant for every visitor. Write `now` or "
                    f"an event reference")


def check_look(tour: dict, stop: dict, where: str) -> None:
    """`look:` on a stop at the visitor's place (2026-10-06): what the sky view turns to."""
    if "look" not in stop:
        return
    look = stop.get("look")
    named = [k for k in TOUR_LOOK_KEYS if isinstance(look, dict) and k in look]
    if not isinstance(look, dict) or len(named) != 1 or set(look) - set(TOUR_LOOK_KEYS):
        fail(where, f"`look: {look!r}` must name exactly one of {list(TOUR_LOOK_KEYS)}: the head turns "
                    f"to one thing")
        return
    key, value = named[0], look[named[0]]
    if key == "world" and value not in TOUR_LOOK_WORLDS:
        fail(where, f"`look: {{world: {value}}}` is not one of {sorted(TOUR_LOOK_WORLDS)}: the things "
                    f"sky/lookfor.js can find in a sky")
    elif key == "best" and value not in TOUR_LOOK_BEST:
        fail(where, f"`look: {{best: {value}}}` is not one of {sorted(TOUR_LOOK_BEST)}")
    elif key == "shower" and value not in TOUR_LOOK_SHOWERS:
        fail(where, f"`look: {{shower: {value}}}` is not one of {sorted(TOUR_LOOK_SHOWERS)}: which "
                    f"shower is next is worked out for the visitor's date, and the card may not pick one")
    elif key == "sky":
        ok = isinstance(value, list) and len(value) == 2 and all(is_number(v) for v in value) \
            and 0 <= value[0] < 360 and -90 <= value[1] <= 90
        if not ok:
            fail(where, f"`look: {{sky: {value!r}}}` must be [right ascension, declination] in degrees")
    elif key == "pass":
        when = stop.get("time")
        timed = isinstance(when, dict) and str(when.get("event") or "").startswith("station-pass.")
        if value is not True or not timed:
            fail(where, "`look: {pass: true}` is the station's next pass, so the stop is timed to it: "
                        "`time: {event: station-pass.next}`")
        if "stations" not in (tour.get("requires") or []):
            fail(where, "`look: {pass: true}` on a trip that does not list `stations` in `requires:`, "
                        "so it is planned before the station is loaded and its pass cannot be found")
    # The card is the same card for every visitor, and what is up differs for each: it may not say
    # which planet, star or figure the view will find.
    if key == "best":
        text = " ".join(str(v or "") for v in (stop.get("card") or {}).values())
        for name in ("Venus", "Jupiter", "Saturn", "Mars", "Mercury", "Sirius", "Vega", "Orion"):
            if re.search(rf"\b{name}\b", text):
                fail(where, f"the card names {name} under `look: {{best: {value}}}`: which one is up "
                            f"is worked out for each visitor, and the line under the card says it")


def check_stop_clock(stop: dict, where: str, kind: str, sgp4: bool, flown_on, tour=None) -> None:
    """A stop's `time:` and `rate:` (spec 0030), each capped by what the stop is looking at.

    The rate caps are three, in order of what they protect: an Earth-orbit subject whips round the
    planet above a minute a second; a world may run as fast as a visitor can set the clock by hand;
    and only where the whole Solar System is the picture -- the Sun's stage, or a rung -- may the
    clock run faster than that, to a year a minute and past it.
    """
    if "rate" in stop:
        rate = stop.get("rate")
        if not is_number(rate) or rate <= 0 or rate > TOUR_RATE_MAX:
            fail(where, f"`rate: {rate!r}`: rate must be a positive number up to 1 000 000; 0 is a "
                        f"still frame under a card, which is a slide (spec 0025 rule 1), and a trip "
                        f"that must be still writes `clock: freeze`")
        elif rate > TOUR_RATE_TRIP_CEILING and (sgp4 or kind == "layer"):
            fail(where, f"`rate: {rate:g}` on an Earth-orbit target: above 60 the subject whips "
                        f"round the planet under follow (ui/trip.js CLOCK_RATE_CEILING)")
        elif rate > TOUR_RATE_WORLD_CEILING and not (
                flown_on in TOUR_UNSQUEEZED_STAGES):
            fail(where, f"`rate: {rate:g}` on the `{flown_on}` stage: above 36 000 only on the "
                        f"Sun's stage or a rung, where a world's own motion is the picture")

    if "time" not in stop:
        return
    when = stop.get("time")
    if isinstance(when, dict):
        extra = sorted(set(when) - {"event", "offset_s", "kind", "after", "borrowed"})
        ref = str(when.get("event") or "")
        etype, _, which = ref.partition(".")
        offset = when.get("offset_s", 0)
        if extra:
            fail(where, f"`time:` has {extra}; an event reference is `{{event: <type>.next, "
                        f"offset_s: n, kind: <word>}}` and nothing else")
        if "kind" in when:
            kinds = EVENT_KINDS.get(etype)
            if kinds is None:
                fail(where, f"`kind: {when.get('kind')!r}` on `{etype}`: only an eclipse, a solstice "
                            f"or an equinox has kinds ({', '.join(EVENT_KINDS)})")
            elif when.get("kind") not in kinds:
                fail(where, f"`kind: {when.get('kind')!r}` is not a kind of `{etype}`, which is one "
                            f"of {', '.join(kinds)}: nextEvent() would never find one")
        if etype not in TOUR_EVENT_TYPES:
            fail(where, f"`time: {{event: {ref}}}` names `{etype}`, which is not a "
                        f"registry/events.yaml id, so there is no event to count to")
        if which != "next":
            fail(where, f"`time: {{event: {ref}}}` must end `.next`: the first one after the "
                        f"visitor's clock is the only occurrence a reference can mean")
        # `after: <stop id>` (internal #384): the first such event after the instant an EARLIER stop
        # of this trip is shown at, instead of after the visitor's clock ("half a year on").
        if "after" in when:
            earlier = None
            for prev in (tour or {}).get("stops") or []:
                if prev is stop:
                    break
                if isinstance(prev, dict) and prev.get("id") == when.get("after"):
                    earlier = prev
            prev_time = earlier.get("time") if earlier else None
            if earlier is None:
                fail(where, f"`after: {when.get('after')!r}` does not name an earlier stop of this trip: "
                            f"the event is counted from the instant that stop is shown at, so it must "
                            f"come before this one")
            elif prev_time is None or prev_time in ("now", "tonight", "night", "midnight", "daylight"):
                fail(where, f"`after: {when.get('after')}`: that stop has no instant of its own to count "
                            f"from (a written `time:` or an event reference); drop `after:` and the "
                            f"event is counted from the visitor's clock, which is the same thing")
        # `borrowed: true` (internal #384, #444): the stop borrows the event's instant for its
        # picture and the trip is not ABOUT the event, so the picker prints no "Next: <date>".
        if "borrowed" in when and when.get("borrowed") is not True:
            fail(where, f"`borrowed: {when.get('borrowed')!r}`: write `borrowed: true` or leave it out")
        if not isinstance(offset, int) or isinstance(offset, bool):
            fail(where, f"`offset_s: {offset!r}` is not a whole number of seconds")
        elif abs(offset) > TOUR_EVENT_OFFSET_MAX_S:
            fail(where, f"`offset_s: {offset}` is more than 30 days from the event; that is a "
                        f"different event, not this one")
        if sgp4 and etype != "station-pass":
            fail(where, f"an Earth-orbit target may be shown `now` or at `{{event: station-pass.next}}`"
                        f" and nothing else: elements are only honest within a week")
        return
    if when == "now":
        return
    # `tonight` (2026-10-06): the coming dark at the visitor's place, so only a trip that has one.
    # `night` (2026-10-06): the first full dark of that same night (the Sun eighteen degrees down);
    # `midnight`: its middle, when a meteor shower's radiant is high.
    if when in ("tonight", "night", "midnight"):
        if not (tour or {}).get("requires_observer") is True:
            fail(where, f"`time: {when}` on a trip that does not say it needs a place "
                        "(`requires_observer: true`): whose night would it be")
        if sgp4:
            fail(where, f"`time: {when}` on an Earth-orbit target: write `now` or a station pass")
        return
    # `daylight` (2026-10-06): the next hour the Sun is up over the stop's own ground, so a stop
    # that has one: a site, a record left on a world, or a world stood `over:` a place.
    if when == "daylight":
        grounded = kind in ("site", "record") or (kind == "world" and isinstance(stop.get("over"), list)
                                                  and is_number(stop["over"][1] if len(stop["over"]) > 1 else None))
        if not grounded or sgp4:
            fail(where, "`time: daylight` is the next hour the Sun is up over this stop's ground, and "
                        "this stop has none: it is for a `site:`, a `record:` standing on a world, or a "
                        "`world:` with `over: [latitude, longitude]`")
        return
    # PyYAML reads an unquoted ISO instant as a datetime; a quoted one arrives as a string. Either
    # way the messages below print it the way it was written.
    dt = None
    if isinstance(when, datetime.datetime):
        dt = when if when.tzinfo else None
        when = when.strftime("%Y-%m-%dT%H:%M:%SZ") if dt else when.isoformat()
    elif isinstance(when, str) and TOUR_TIME_ISO.match(when):
        try:
            dt = datetime.datetime.fromisoformat(when.replace("Z", "+00:00"))
        except ValueError:
            dt = None
    if dt is None:
        fail(where, f"`time: {when!r}`: time is an ISO instant in UTC (2027-08-02T10:07:00Z), "
                    f"`now`, or `{{event: <type>.next, offset_s: n}}`")
        return
    if not (TOUR_TIME_FIRST <= dt < TOUR_TIME_LAST):
        fail(where, f"`time: {when}` is outside 1957-10-04 to 2100-01-01: before Sputnik there is "
                    f"nothing in this map to show, and after 2100 nobody has the ephemeris")
    if sgp4:
        fail(where, f"`time: {when}` on an Earth-orbit target: elements are only honest within a "
                    f"week (spec 0008), and a written date is wrong the day it is read. Write `now` "
                    f"or an event reference")


def chapter_words(text) -> list:
    return [w for w in re.sub(r"[^a-z0-9' ]+", " ", str(text or "").lower()).split() if w]


def shared_run(a, b) -> int:
    """The longest run of consecutive words two texts share."""
    A, B = chapter_words(a), chapter_words(b)
    best = 0
    for i in range(len(A)):
        for j in range(len(B)):
            k = 0
            while i + k < len(A) and j + k < len(B) and A[i + k] == B[j + k]:
                k += 1
            best = max(best, k)
    return best


def check_stop_chapter(stop: dict, where: str, title) -> None:
    """Spec 0034 req 3: `chapter:` is optional, short, and not the card title said twice."""
    if "chapter" not in stop:
        return
    chapter = stop.get("chapter")
    if not isinstance(chapter, str) or not chapter.strip():
        fail(where, f"`chapter: {chapter!r}` must be a line of words; leave the field out for none")
        return
    if len(chapter) > CHAPTER_MAX:
        fail(where, f"`chapter:` is {len(chapter)} characters, over {CHAPTER_MAX}: a chapter is a "
                    f"title card, not a sentence")
    if "--" in chapter:
        fail(where, f"the chapter has \"--\"; {TOUR_DOUBLE_HYPHEN}")
    if title and (chapter.strip().lower() == str(title).strip().lower()
                  or shared_run(chapter, title) >= CHAPTER_REPEAT_WORDS):
        fail(where, "the chapter and the card title are two lines on one screen, and this chapter "
                    "repeats the title. Name the part of the story, not the stop")


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
    elif kind == "observer":
        check_observer_stop(tour, stop, where, value)
    elif kind == "sky":
        check_sky_stop(stop, where, target, flown_on)
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

    # A STAR SYSTEM'S MEMBERS ARE DRAWN ONLY ON ITS STAGE (spec 0040). Everywhere else a planet is a
    # mark at its star and the host star has no mark of its own, so a stop naming one on another
    # stage would fly to a point it cannot frame; and a system's stage draws nothing but that system,
    # so a stop there about anything else flies to empty space.
    member_of = system_of_member(value) if kind == "record" else None
    flown_system = flown_on[len("system-"):] if isinstance(flown_on, str) and flown_on.startswith("system-") else None
    if member_of and flown_on != f"system-{member_of}":
        fail(where, f"targets `{value}`, a member of the `{member_of}` system, on the `{flown_on}` stage. "
                    f"It is drawn at its own size and place only on `system-{member_of}`; give the stop "
                    f"`stage: system-{member_of}`")
    if flown_system and member_of != flown_system:
        fail(where, f"is flown on `{flown_on}`, which draws the {flown_system} system and nothing else, "
                    f"and targets `{kind}: {value}`. Target one of that system's records, or fly the "
                    f"stop on another stage")
    if "mercury_ring" in stop:
        if stop["mercury_ring"] is not True:
            fail(where, f"`mercury_ring: {stop['mercury_ring']!r}` is `true` or left out")
        elif not flown_system:
            fail(where, f"`mercury_ring: true` on the `{flown_on}` stage: the ring for scale is drawn by "
                        f"scene/systems.js on a star system's stage and nowhere else, where it would be a "
                        f"promise the picture does not keep")

    # `climb: true` (internal #305, #410): the stop is reached by the one continuous flight, which
    # changes stage at the joins of registry/stages.yaml and keeps the camera's pose. Its stage must
    # be on that chain, and its distance must be one the chain holds on that stage whichever way the
    # camera came, or the stop would arrive on the wrong side of a join.
    if "climb" in stop:
        if stop["climb"] is not True:
            fail(where, f"`climb: {stop['climb']!r}` is `true` or left out")
        elif flown_on not in JOIN_BANDS:
            fail(where, f"`climb: true` on the `{flown_on}` stage, which is not on the chain of "
                        f"registry/stages.yaml `joins:` ({', '.join(JOIN_BANDS) or 'no joins'})")
        elif "look" in stop:
            fail(where, "`climb: true` with `look:`: a stop seen from the ground has no flight to it")
        else:
            lo, hi = JOIN_BANDS[flown_on]
            d = stop.get("distance_km")
            if not isinstance(d, (int, float)) or isinstance(d, bool):
                fail(where, "`climb: true` needs `distance_km`: the flight is to a distance")
            elif not lo < d < hi:
                fail(where, f"`climb: true` at {d} km on the `{flown_on}` stage: the chain holds that "
                            f"stage between {lo} and {hi} km, so the camera would arrive on another")

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

    check_stop_extras(tour, stop, n, where, kind, value)

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

    transition = stop.get("transition", "fly")
    if transition not in TOUR_TRANSITIONS:
        fail(where, f"`transition: {transition}` is not one of {sorted(TOUR_TRANSITIONS)}")

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

    sgp4 = (kind == "layer" and value in TOUR_SGP4_LAYERS) or \
        (kind == "record" and bool(TOUR_SGP4_RECORD.match(str(value))))
    check_stop_clock(stop, where, kind, sgp4, flown_on, tour)
    if "look" in stop and kind != "observer":
        fail(where, "`look:` on a stop that is not `target: {observer: true}`: it is what the visitor "
                    "sees from their own ground")
    seen_from = stop.get("seen_from")
    if seen_from is not None and seen_from not in world_ids:
        fail(where, f"`seen_from: {seen_from}` has no worlds.yaml row")
    elif seen_from is not None and flown_on in TOUR_STAGES and not tour_drawn_true(seen_from, flown_on):
        fail(where, f"`seen_from: {seen_from}` is drawn nearer and larger than it is from the "
                    f"`{flown_on}` stage, so the camera would stand on the side of a drawing")

    # An eclipse stop (spec 0037): its instant is an eclipse, so the shot is lit from the front.
    when = stop.get("time")
    eclipse_stop = isinstance(when, dict) and \
        str(when.get("event") or "").partition(".")[0] in ECLIPSE_KINDS
    if eclipse_stop:
        key_light = stop.get("key_light_deg", defaults.get("key_light_deg"))
        if is_number(key_light) and key_light > ECLIPSE_KEY_LIGHT_MAX_DEG:
            fail(where, f"`key_light_deg: {key_light:g}` on an eclipse stop: the shadow is on the "
                        f"Sun's side, so the camera is too (at most {ECLIPSE_KEY_LIGHT_MAX_DEG}, "
                        f"0 is square on; docs/design-language.md)")
        card_text = " ".join(str(v or "") for v in (stop.get("card") or {}).values()).lower()
        for word in ECLIPSE_STOP_WORDS:
            if word in card_text:
                fail(where, f"an eclipse stop's card says \"{word}\": the words are \"shadow\" and "
                            f"\"path\", and this app gives no alarm and no safety warning (spec 0037)")

    card = stop.get("card")
    if not isinstance(card, dict):
        fail(where, "no `card:` -- a stop with no words is a camera move, not a stop")
        return
    kind_text = " ".join(str(v or "") for v in card.values()).lower()
    target = stop.get("target")
    if isinstance(target, dict) and "record" in target:
        for word in HERO_SIZE_WORDS:
            if word in kind_text:
                fail(where, f"a stop at a record says \"{word}\": a model is drawn larger than it is "
                            f"(scene/heroes.js), so the card may not call the picture to scale")
    if flown_system:
        for word in SYSTEM_LOOK_WORDS:
            if re.search(r"\b" + re.escape(word) + r"\b", kind_text):
                fail(where, f"a stop on a star system's stage says \"{word}\": no planet of another star "
                            f"has a seen face, and the app says that itself")
    for word in GENERATED_WORDS:
        if word in kind_text:
            fail(where, f"the card says \"{word}\": a generated line says that, and a hand-written card "
                        f"may not pre-empt it")
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
    # THE PLANET COUNT IS GENERATED (spec 0040 req 7): `{exoplanet_count}` is expanded by
    # scripts/gen_tours_js.py from the table the layer draws, so the card and the map cannot disagree.
    # Typed as digits it is true on the day it was typed and not after the next copy of the table.
    text = f"{title or ''} {body}"
    typed = TOUR_TYPED_PLANET_COUNT.search(text)
    if typed:
        fail(where, f"the card types a planet count, \"{typed.group(0).strip()}\": write "
                    f"{{exoplanet_count}}, which scripts/gen_tours_js.py fills from the table the map draws")
    for name in re.findall(r"\{([a-z_]+)\}", text):
        if name not in TOUR_CARD_TEMPLATES:
            fail(where, f"the card has `{{{name}}}`, which nothing fills in; the one template a card may "
                        f"use is {sorted(TOUR_CARD_TEMPLATES)}")
    # HABITABLE IS A CLAIM WITH A PAGE (spec 0040 req 9): only about a system planet whose row has
    # `habitable_zone: {source}`. No page read for registry/systems.yaml says it of any planet there.
    if re.search(r"\bhabitab", text, re.I):
        row = system_planet_row(value) if kind == "record" else None
        if not (row and isinstance(row.get("habitable_zone"), dict) and row["habitable_zone"].get("source")):
            fail(where, "the card says \"habitable\" about a target whose registry/systems.yaml row has no "
                        "`habitable_zone: {source}`; a card may not claim what no cited page says")

    low = str(body).lower() + " " + str(title or "").lower()
    for word in TOUR_JARGON:
        if word in low and word not in glossary:
            fail(where, f"the card says \"{word}\" and registry/glossary.yaml has no entry for it. "
                        f"Either add the term there -- two lines, written for a curious "
                        f"fourteen-year-old -- or say it in words a beginner already has")

    for label, text in (("title", title), ("body", body)):
        if "--" in str(text or ""):
            fail(where, f"the card's {label} has \"--\"; {TOUR_DOUBLE_HYPHEN}")

    # The three word lists of spec 0043 design section 1 (internal #121).
    scoped = [(GENERATED_WORDS, "writes a line the generator writes (the shown-at and size lines are computed)")]
    if stop_draws_a_model(stop, kind, value):
        scoped.append((HERO_SIZE_WORDS, "is on a drawn model or a group, which is shown at its own size and "
                                        "not to scale with anything beside it"))
    if isinstance(flown_on, str) and flown_on.startswith("system-"):
        scoped.append((SYSTEM_LOOK_WORDS, "is on a star system's stage, where a planet's look is illustrative "
                                          "and generated, so a card may not describe it"))
    for words, why in scoped:
        for word in words:
            if re.search(rf"\b{re.escape(word)}\b", low):
                fail(where, f"the card says \"{word}\" and {why} (spec 0043)")

    # The place is generated (ui/trip.js noteFor) and differs for every visitor, so a card on a
    # trip that starts from the visitor's place may not name one of the places they could be.
    if tour.get("requires_observer") is True:
        text = f"{title or ''} {body}"
        named = sorted(c for c in TOUR_CITY_NAMES if re.search(rf"\b{re.escape(c)}\b", text))
        if named:
            fail(where, f"the card names {', '.join(named)} on a trip from the visitor's own place: "
                        f"the place is generated; the card may not name one")

    check_stop_chapter(stop, where, title)

    # Not under `time: daylight`: that instant is chosen for its light and is about nothing in the
    # card, so "landed in July 1969" under "Shown at 12 Oct 2026" is two different things, both said.
    if "time" in stop and stop.get("time") != "daylight":
        hit = TOUR_CARD_TIME.search(f"{title or ''} {body}")
        if hit:
            fail(where, f"the card says \"{hit.group(0)}\" on a stop with `time:`: the shown-at "
                        f"line is generated from the clock, and the card may not state a time")

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


# A number of four or more digits (grouped or not) followed within three words by "planet(s)" or
# "world(s)": a planet count typed by hand (spec 0040 req 7).
TOUR_TYPED_PLANET_COUNT = re.compile(r"\b\d{1,3}(?:[ \u202f\u00a0\u2009,]?\d{3})+\b(?:\s+\S+){0,3}?\s+(?:planets?|worlds?)\b", re.I)
# The templates scripts/gen_tours_js.py expands in a card's body.
TOUR_CARD_TEMPLATES = {"exoplanet_count"}


def system_of_member(record_id) -> str | None:
    """The registry/systems.yaml id a record belongs to (a planet row, or the host `star-<id>`)."""
    rid = str(record_id or "")
    for sid, row in SYSTEM_ROWS.items():
        if rid == f"star-{sid}":
            return sid
        for p in row.get("planets") or []:
            if isinstance(p, dict) and p.get("id") == rid:
                return sid
    return None


def system_planet_row(record_id) -> dict | None:
    for row in SYSTEM_ROWS.values():
        for p in row.get("planets") or []:
            if isinstance(p, dict) and p.get("id") == record_id:
                return p
    return None


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
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
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
        stage_kind = st.get("kind")
        if stage_kind not in (None, "system"):
            fail(where, f"`kind: {stage_kind}` is not a kind of stage; leave it out for a rung, or "
                        f"write `system` for a star system's own stage")
        if stage_kind == "system":
            check_system_stage(st, where)
        elif st.get("centre") not in world_ids:
            fail(where, f"centre `{st.get('centre')}` has no worlds.yaml row")
        if not st.get("display"):
            fail(where, "no `display:` name")
        if not st.get("reaches"):
            fail(where, "no `reaches:` line -- the breadcrumb has nothing to say about this rung")

    check_joins(doc.get("joins"), seen | set(world_ids), world_ids)

    # The hand mirror in scene/stage.js. tests/test_growth.py runs this checker on a copy of the
    # tree that holds only registry/ and scripts/, so a missing mirror is "cannot look", not a fail.
    js_path = ROOT / "site/js/scene/stage.js"
    if not js_path.exists():
        return stages
    js = js_path.read_text(encoding="utf-8")
    mirror = {}
    for m in re.finditer(r"^\s*'?([a-z][a-z0-9-]*)'?:\s*\{[^}]*unitKm:\s*([0-9.e+]+)[^}]*(?:ladder:\s*true|system:\s*'[a-z0-9-]+')", js, re.M):
        mirror[m.group(1)] = float(m.group(2))
    for st in stages:
        if not isinstance(st, dict) or not st.get("id"):
            continue
        sid = st["id"]
        flag = "system: '<id>'" if st.get("kind") == "system" else "ladder: true"
        if sid not in mirror:
            fail(f"stages.yaml[{sid}]", f"scene/stage.js STAGES has no `{flag}` row for it -- the mirror is stale")
        elif isinstance(st.get("unit_km"), (int, float)) and abs(mirror[sid] - float(st["unit_km"])) > 1e-3 * float(st["unit_km"]):
            fail(f"stages.yaml[{sid}]", f"unit_km {st['unit_km']} but scene/stage.js says {mirror[sid]}")
    for sid in mirror:
        if sid not in seen:
            fail("stage.js", f"STAGES row `{sid}` is a ladder rung or a system stage with no stages.yaml row")
    return stages


# THE JOINS OF THE CONTINUOUS FLIGHT (internal #410): registry/stages.yaml `joins:`, mirrored by hand
# in site/js/scene/handoff.js JOINS. Filled here for check_tours(): stage id -> (min_km, max_km), the
# distances at which a camera rests on that stage whichever way it came (a `climb:` stop must be inside).
JOIN_BANDS: dict[str, tuple] = {}


def check_joins(joins, stage_ids: set, world_ids: set) -> None:
    where = "stages.yaml[joins]"
    if joins is None:
        return
    if not isinstance(joins, list) or not joins:
        fail(where, "`joins:` must be a non-empty list")
        return
    rows = []
    for i, j in enumerate(joins):
        at = f"{where}[{i}]"
        if not isinstance(j, dict) or set(j) != {"from", "to", "anchor", "out_km", "in_km"}:
            fail(at, "a join is exactly {from, to, anchor, out_km, in_km}")
            continue
        for key in ("from", "to"):
            if j[key] not in stage_ids:
                fail(at, f"`{key}: {j[key]}` is neither a world nor a rung")
        if j["anchor"] not in world_ids:
            fail(at, f"anchor `{j['anchor']}` has no worlds.yaml row")
        out_km, in_km = j["out_km"], j["in_km"]
        if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and v > 0 for v in (out_km, in_km)):
            fail(at, "out_km and in_km must be positive numbers")
            continue
        if not in_km <= 0.8 * out_km:
            fail(at, f"in_km {in_km} must be at most 80 % of out_km {out_km}: without the gap a camera "
                     f"resting at the join flips between the two stages")
        if rows and rows[-1]["to"] != j["from"]:
            fail(at, f"the chain is broken: the row before ends on `{rows[-1]['to']}` and this one starts on `{j['from']}`")
        if rows and not in_km > 10 * rows[-1]["out_km"]:
            fail(at, "a join must be well past the one before it (ten times its out_km)")
        rows.append(j)
    for i, j in enumerate(rows):
        lo = rows[i - 1]["out_km"] if i > 0 else 0
        JOIN_BANDS[j["from"]] = (lo, j["in_km"])
    if rows:
        JOIN_BANDS[rows[-1]["to"]] = (rows[-1]["out_km"], float("inf"))
    js_path = ROOT / "site/js/scene/handoff.js"
    if not js_path.exists():
        return
    js = js_path.read_text(encoding="utf-8")
    mirror = [(m.group(1), m.group(2), m.group(3), float(m.group(4)), float(m.group(5))) for m in re.finditer(
        r"\{\s*from:\s*'([\w-]+)',\s*to:\s*'([\w-]+)',\s*anchor:\s*'([\w-]+)',\s*out_km:\s*([0-9.e+]+),\s*in_km:\s*([0-9.e+]+)\s*\}", js)]
    mine = [(j["from"], j["to"], j["anchor"], float(j["out_km"]), float(j["in_km"])) for j in rows]
    if mirror != mine:
        fail(where, f"site/js/scene/handoff.js JOINS does not match these rows -- the mirror is stale ({len(mirror)} rows there, {len(mine)} here)")


# A SYSTEM STAGE (spec 0040). One unit is 100 000 km on every one of them, exactly: the ladder's unit
# constants were typed 1 000 times wrong twice in spec 0028 and only tests caught it, and a system's
# numbers (TRAPPIST-1 h 93 units out, the star 0.83 in radius) are chosen for this unit.
SYSTEM_STAGE_UNIT_KM = 100000
# Filled by check_systems() before check_stages() runs: system id -> its row.
SYSTEM_ROWS: dict[str, dict] = {}


def check_system_stage(st: dict, where: str) -> None:
    """A `kind: system` row of registry/stages.yaml: its system exists, its centre is that system's
    host star record, its unit is 100 000 km and its frame the heliocentric one the host is placed in."""
    sid = str(st.get("id") or "")
    if not sid.startswith("system-"):
        fail(where, "a system stage's id is `system-<registry/systems.yaml id>`")
        return
    system_id = sid[len("system-"):]
    if SYSTEM_ROWS and system_id not in SYSTEM_ROWS:
        fail(where, f"there is no registry/systems.yaml row `{system_id}` for this stage to draw")
    want_centre = f"star-{system_id}"
    if st.get("centre") != want_centre:
        fail(where, f"centre `{st.get('centre')}` is not its system's host star; a system stage is "
                    f"centred on `{want_centre}`, the record data/layers.js makes for the host")
    if st.get("unit_km") != SYSTEM_STAGE_UNIT_KM:
        fail(where, f"unit_km {st.get('unit_km')!r} on a system stage; it must be exactly "
                    f"{SYSTEM_STAGE_UNIT_KM} (100 000 km), the unit every system row is drawn in")
    if st.get("frame") != "sun-inertial":
        fail(where, f"frame {st.get('frame')!r}: the host star is placed in `sun-inertial`, so its "
                    f"stage is drawn in it")


# Kepler's third law, a^3 / P^2 = M in au, years and Suns (the planet's own mass is below a part in
# ten thousand of an M dwarf's and is left out). 5 % is far outside every published value's scatter
# (TRAPPIST-1's seven rows agree to 0.13 %) and far inside a slipped digit.
KEPLER_TOLERANCE = 0.05
# The CSV's own columns, cross-checked within 2 %: the table rounds to 3 or 5 figures and the
# Archive's page gives one more, so 2 % passes a rounding and refuses a different planet.
SYSTEM_CSV_TOLERANCE = 0.02
JULIAN_YEAR_DAYS = 365.25


def check_systems() -> list:
    """registry/systems.yaml (spec 0040): every system is a host in the exoplanet table, every planet
    one of that host's records, every number cited with the day it was read, and Kepler's third law
    holds across the three numbers the table does not carry."""
    path = REG / "systems.yaml"
    SYSTEM_ROWS.clear()
    if not path.exists():
        return []
    try:
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("systems.yaml", f"will not parse: {exc}")
        return []
    systems = doc.get("systems")
    if not isinstance(systems, list):
        fail("systems.yaml", "no `systems:` list")
        return []

    sys.path.insert(0, str(ROOT / "scripts"))
    from _exo_ids import exo_id, read_rows, rows_for_host, num  # noqa: E402
    # None in a tree with no table (tests/test_growth.py) or an empty placeholder: cannot look.
    csv_rows = read_rows(ROOT / "site" / "data" / "exoplanets.csv")

    def near(a, b, tol=SYSTEM_CSV_TOLERANCE) -> bool:
        return a is not None and b is not None and abs(float(a) - float(b)) <= tol * abs(float(b))

    seen_planets: set[str] = set()
    for s in systems:
        if not isinstance(s, dict) or not s.get("id"):
            fail("systems.yaml", f"a row has no id: {s!r}")
            continue
        sid = str(s["id"])
        where = f"systems.yaml[{sid}]"
        if sid in SYSTEM_ROWS:
            fail(where, "duplicate id")
        if not re.match(r"^[a-z0-9][a-z0-9-]*$", sid):
            fail(where, "the id is lower-case letters, digits and dashes: it names a stage and a record")
        SYSTEM_ROWS[sid] = s
        host = s.get("host")
        host_rows = rows_for_host(csv_rows, str(host)) if csv_rows is not None and host else []
        if not host:
            fail(where, "no `host:`, the exoplanet table's `hostname` for this star")
        elif csv_rows is not None and not host_rows:
            fail(where, f"host `{host}` is not a `hostname` in site/data/exoplanets.csv")
        if s.get("colour_note") != "illustrative":
            fail(where, "`colour_note: illustrative` is missing; the colours are drawn, not measured, "
                        "and the card's line saying so is printed from this field")

        star = s.get("star") if isinstance(s.get("star"), dict) else {}
        for key in ("radius_suns", "teff_k", "mass_suns"):
            if not is_number(star.get(key)) or not star.get(key) > 0:
                fail(where, f"`star.{key}` must be a positive number")
        if not STAR_SOURCE.match(str(star.get("source") or "")):
            fail(where, "`star.source` must be the page and the day it was read: "
                        "\"https://... (read YYYY-MM-DD)\" -- a number with no page is a rumour")
        if host_rows:
            first = host_rows[0]
            for key, col in (("teff_k", "st_teff"), ("radius_suns", "st_rad")):
                have = num(first, col)
                if have is not None and is_number(star.get(key)) and not near(star[key], have):
                    fail(where, f"`star.{key}: {star[key]}` differs from the table's {col} {have} by more "
                                f"than {int(SYSTEM_CSV_TOLERANCE * 100)} %: one of the two is another star")
        mass = star.get("mass_suns") if is_number(star.get("mass_suns")) and star.get("mass_suns") > 0 else None

        by_id = {exo_id(r.get("pl_name") or ""): r for r in host_rows}
        planets = s.get("planets")
        if not isinstance(planets, list) or not planets:
            fail(where, "no `planets:` list")
            continue
        for p in planets:
            if not isinstance(p, dict) or not p.get("id"):
                fail(where, f"a planet row has no id: {p!r}")
                continue
            pid = str(p["id"])
            pwhere = f"systems.yaml[{sid}/{pid}]"
            if pid in seen_planets:
                fail(pwhere, "this planet is in a system already: one planet, one place")
            seen_planets.add(pid)
            row = by_id.get(pid)
            if csv_rows is not None and host_rows and row is None:
                fail(pwhere, f"`{pid}` is not a record parseExoplanets() makes from a row with hostname "
                             f"`{host}` in site/data/exoplanets.csv, so there is no planet for it to place")
            for key in ("period_days", "a_au", "radius_earths"):
                if not is_number(p.get(key)) or not p.get(key) > 0:
                    fail(pwhere, f"`{key}` must be a positive number")
            if p.get("mass_earths") is not None and (not is_number(p.get("mass_earths")) or not p["mass_earths"] > 0):
                fail(pwhere, "`mass_earths` must be a positive number when it is given")
            tm = p.get("transit_mid_jd")
            if tm is not None and (not is_number(tm) or not 2400000 < tm < 2500000):
                fail(pwhere, f"`transit_mid_jd: {tm!r}` is not a Julian date of the telescope era")
            if not STAR_SOURCE.match(str(p.get("source") or "")):
                fail(pwhere, "`source` must be the page and the day it was read: "
                             "\"https://... (read YYYY-MM-DD)\" -- a number with no page is a rumour")
            hz = p.get("habitable_zone")
            if hz is not None and not (isinstance(hz, dict) and STAR_SOURCE.match(str(hz.get("source") or ""))):
                fail(pwhere, "`habitable_zone` is `{source: \"https://... (read YYYY-MM-DD)\"}`: the one "
                             "thing that lets a card say \"habitable\" is the page that says it")
            if row is not None:
                for key, col in (("period_days", "pl_orbper"), ("radius_earths", "pl_rade")):
                    have = num(row, col)
                    if have is not None and is_number(p.get(key)) and not near(p[key], have):
                        fail(pwhere, f"`{key}: {p[key]}` differs from the table's {col} {have} by more "
                                     f"than {int(SYSTEM_CSV_TOLERANCE * 100)} %: the row and the card "
                                     f"beside it would disagree")
            a, per = p.get("a_au"), p.get("period_days")
            if mass and is_number(a) and a > 0 and is_number(per) and per > 0:
                implied = a ** 3 / (per / JULIAN_YEAR_DAYS) ** 2
                if abs(implied - mass) / mass > KEPLER_TOLERANCE:
                    fail(pwhere, f"Kepler's third law does not hold: a_au {a} and period_days {per} give "
                                 f"a^3/P^2 = {implied:.5f} Suns, and star.mass_suns is {mass} "
                                 f"({(implied / mass - 1) * 100:+.1f} %, the limit is "
                                 f"{int(KEPLER_TOLERANCE * 100)} %). One of the three is mistyped")
    return systems


def check_generated_systems() -> list:
    """registry/systems-generated.yaml (internal #466): the systems scripts/build-systems.py writes
    from registry/systems-list.yaml and the exoplanet table. Nobody types this file, so the first
    refusal is that it is exactly what the script writes today; the rest are the rules a row must
    keep whoever wrote it, so a mistake in the script is refused by something that is not the script:
    Kepler's third law within 5 % (a planet of two stars: the orbit must imply more than the one
    star the table describes and less than two of it), a planet that is a record of its host, a
    period that is the table's, and "inside the habitable zone" only for an orbit inside the band."""
    path = REG / "systems-generated.yaml"
    listing = REG / "systems-list.yaml"
    if not path.exists() and not listing.exists():
        return []
    import importlib.util
    spec = importlib.util.spec_from_file_location("build_systems", ROOT / "scripts" / "build-systems.py")
    builder = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(ROOT / "scripts"))
    from _exo_ids import exo_id, read_rows, rows_for_host, num  # noqa: E402
    csv_rows = read_rows(ROOT / "site" / "data" / "exoplanets.csv")
    try:
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
    except (OSError, yaml.YAMLError) as exc:
        fail("systems-generated.yaml", f"will not read: {exc}")
        return []
    if csv_rows is not None:
        try:
            spec.loader.exec_module(builder)
            want = builder.text()
        except SystemExit as exc:
            fail("systems-list.yaml", f"scripts/build-systems.py refuses: {exc}")
            return []
        if want != path.read_text(encoding="utf-8"):
            fail("systems-generated.yaml", "is not what scripts/build-systems.py writes from registry/systems-list.yaml "
                                           "and the table: it was edited by hand, or its sources changed. "
                                           "Run: python3 scripts/build-systems.py")
    systems = doc.get("systems") or []
    for s in systems:
        sid = str(s.get("id"))
        where = f"systems-generated.yaml[{sid}]"
        if sid in SYSTEM_ROWS:
            fail(where, "registry/systems.yaml has a system of this id already: one star, one stage")
        star = s.get("star") or {}
        mass = star.get("mass_suns")
        if not STAR_SOURCE.match(str(star.get("source") or "")):
            fail(where, "`star.source` must be the page and the day it was read")
        if s.get("colour_note") != "illustrative":
            fail(where, "`colour_note: illustrative` is missing")
        hz = s.get("habitable_zone")
        if hz is not None and not (hz["wide_inner_au"] < hz["inner_au"] < hz["outer_au"] < hz["wide_outer_au"]):
            fail(where, f"the habitable zone's four distances are out of order: {hz}")
        host_rows = rows_for_host(csv_rows, str(s.get("host"))) if csv_rows is not None else []
        by_id = {exo_id(r.get("pl_name") or ""): r for r in host_rows}
        for p in s.get("planets") or []:
            pid = str(p.get("id"))
            pwhere = f"systems-generated.yaml[{sid}/{pid}]"
            row = by_id.get(pid)
            if csv_rows is not None and row is None:
                fail(pwhere, f"is not a record of `{s.get('host')}` in site/data/exoplanets.csv")
            a, per = p.get("a_au"), p.get("period_days")
            if not (is_number(a) and a > 0 and is_number(per) and per > 0):
                fail(pwhere, "`a_au` and `period_days` must be positive numbers")
                continue
            if row is not None and num(row, "pl_orbper") and abs(per - num(row, "pl_orbper")) > SYSTEM_CSV_TOLERANCE * per:
                fail(pwhere, f"`period_days: {per}` is not the table's {num(row, 'pl_orbper')}")
            if is_number(mass) and mass > 0:
                implied = a ** 3 / (per / JULIAN_YEAR_DAYS) ** 2
                if p.get("circumbinary"):
                    if not mass < implied < 2 * mass:
                        fail(pwhere, f"a planet of two stars: a^3/P^2 = {implied:.4f} Suns must be more than the one "
                                     f"star the table describes ({mass}) and less than two of it")
                elif abs(implied - mass) / mass > KEPLER_TOLERANCE:
                    fail(pwhere, f"Kepler's third law does not hold: a_au {a} and period_days {per} give "
                                 f"a^3/P^2 = {implied:.5f} Suns, and star.mass_suns is {mass} "
                                 f"({(implied / mass - 1) * 100:+.1f} %, the limit is {int(KEPLER_TOLERANCE * 100)} %)")
            zone = p.get("zone")
            if zone is not None and (hz is None or p.get("circumbinary")):
                fail(pwhere, f"`zone: {zone}` with no habitable zone computed for this star: nothing may say it")
            elif zone == "inside" and not hz["inner_au"] <= a <= hz["outer_au"]:
                fail(pwhere, f"`zone: inside` and the orbit ({a} au) is outside the computed band "
                             f"({hz['inner_au']} to {hz['outer_au']} au): \"habitable\" is said by the band alone")
    return systems


def check_system_stage_rows(stages: list) -> None:
    """Every registry/systems.yaml row has its `kind: system` stage (the reverse of check_system_stage)."""
    have = {str(st.get("id")) for st in stages if isinstance(st, dict) and st.get("kind") == "system"}
    for sid in SYSTEM_ROWS:
        if f"system-{sid}" not in have:
            fail(f"systems.yaml[{sid}]", f"there is no `kind: system` row `system-{sid}` in "
                                         f"registry/stages.yaml, so the system has nowhere to be drawn")


def check_dso_hand() -> list:
    """registry/dso-hand.yaml: an object we place by hand names its source and has a distance."""
    path = REG / "dso-hand.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
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


# --- registry/nebulae.yaml (spec 0067, 2026-10-03) -----------------------------------------------
# A photograph somebody else took, shipped from our bucket and laid on the sky: so it gets the
# audio's treatment. A row is refused unless its archive's terms are on file with the day they were
# read, the licence is one we may redistribute under, the credit is the archive's (and names no
# survey we may not ship: several archive pictures are Digitized Sky Survey composites), the
# credit is in CREDITS.md section 3g word for word, the file ships -- and the picture is WHERE ITS
# OBJECT IS: the object's catalogue position must fall inside it, and the solver's evidence must
# tell the picture from its mirror image. A wrong centre draws Orion's photograph on empty sky and
# nothing in the browser would say so.
NEBULA_LICENCES = {"CC BY 4.0", "Public domain"}
NEBULA_COLOURS = {"broadband", "mixed", "narrowband", "infrared", "unstated"}
NEBULA_NOT_OURS = re.compile(r"digiti[sz]ed sky survey|\bDSS\d?\b|mellinger|all rights reserved", re.I)
NEBULA_MIRROR_MARGIN = 1.5


def nebula_inside(row: dict, ra_deg: float, dec_deg: float) -> tuple[float, float] | None:
    """(u, v) of a sky position in the picture, each 0..1 inside it: scene/nebulae.js
    skyToPicture(), in Python. None when the position is behind the picture's plane."""
    rad = math.radians
    a, d, r = rad(row["ra_deg"]), rad(row["dec_deg"]), rad(row.get("north_deg") or 0)
    centre = (math.cos(d) * math.cos(a), math.cos(d) * math.sin(a), math.sin(d))
    east = (-math.sin(a), math.cos(a), 0.0)
    north = (-math.sin(d) * math.cos(a), -math.sin(d) * math.sin(a), math.cos(d))
    up = tuple(n * math.cos(r) - e * math.sin(r) for n, e in zip(north, east))
    right = tuple(-n * math.sin(r) - e * math.cos(r) for n, e in zip(north, east))
    pa, pd = rad(ra_deg), rad(dec_deg)
    p = (math.cos(pd) * math.cos(pa), math.cos(pd) * math.sin(pa), math.sin(pd))
    dot = lambda x, y: sum(i * j for i, j in zip(x, y))  # noqa: E731
    along = dot(p, centre)
    if along <= 1e-6:
        return None
    hx = math.tan(rad(row["width_arcmin"] / 60) / 2)
    hy = math.tan(rad(row["height_arcmin"] / 60) / 2)
    return 0.5 + dot(p, right) / along / hx / 2, 0.5 + dot(p, up) / along / hy / 2


def check_nebulae() -> list:
    """registry/nebulae.yaml: every photograph is licensed, credited, shipped, and where its object is."""
    name = "nebulae.yaml"
    path = REG / name
    if not path.exists():
        return []
    try:
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail(name, f"will not parse: {exc}")
        return []
    archives = doc.get("archives")
    if not isinstance(archives, dict) or not archives:
        fail(name, "no `archives:` -- a picture's licence is its archive's terms, and they are written down here")
        archives = {}
    for aid, a in archives.items():
        where = f"{name}[archives.{aid}]"
        if not isinstance(a, dict):
            fail(where, "is not a mapping")
            continue
        if a.get("licence") not in NEBULA_LICENCES:
            fail(where, f"licence {a.get('licence')!r} is not one we may redistribute under ({', '.join(sorted(NEBULA_LICENCES))})")
        if not str(a.get("terms") or "").startswith("https://"):
            fail(where, "no `terms:` page -- the licence is a claim until somebody can read where it is granted")
        if not a.get("says"):
            fail(where, "no `says:` -- quote the sentence of the terms that grants the licence")
        if not isinstance(a.get("checked"), datetime.date):
            fail(where, "no `checked:` date -- terms change, so the day they were read is part of the evidence")
        for key in ("page", "screen"):
            if "{image}" not in str(a.get(key) or ""):
                fail(where, f"`{key}:` must be a URL with {{image}} in it")
        if not a.get("name"):
            fail(where, "no `name:`")
    pictures = doc.get("pictures")
    if not isinstance(pictures, list):
        fail(name, "`pictures:` must be a list")
        return []
    if not 15 <= len(pictures) <= 30:
        fail(name, f"{len(pictures)} pictures: spec 0067 asks for 15 to 30, and nebulae_total_bytes was set for that")
    built = ROOT / "site" / "data" / "dso.json"
    dso = {}
    if built.exists() and built.stat().st_size > 0:
        import json
        dso = {o.get("id"): o for o in json.loads(built.read_text(encoding="utf-8")).get("objects", [])}
    credits_path = ROOT / "CREDITS.md"
    section = None
    if credits_path.exists():
        m = re.search(r"^## 3g\.[^\n]*\n(.*?)(?=^## |\Z)", credits_path.read_text(encoding="utf-8"), re.M | re.S)
        section = m.group(1) if m else ""
    seen = set()
    for r in pictures:
        if not isinstance(r, dict) or not r.get("id"):
            fail(name, "a picture row is not a mapping with an id")
            continue
        where = f"{name}[{r['id']}]"
        if r["id"] in seen:
            fail(where, "duplicate id: one picture per object")
        seen.add(r["id"])
        if r.get("archive") not in archives:
            fail(where, f"archive {r.get('archive')!r} has no row under `archives:`, so nothing says what its licence is")
        if not r.get("image"):
            fail(where, "no `image:` -- the archive's own id for the picture")
        credit = r.get("credit")
        if not isinstance(credit, str) or not credit.strip():
            fail(where, "no `credit:` -- CC BY asks for the archive's credit line, word for word")
        elif NEBULA_NOT_OURS.search(credit):
            fail(where, f"the credit names a source we may not redistribute ({credit!r}): the Digitized Sky Survey "
                        f"and Mellinger's panorama are not ours to ship, whichever observatory's page shows the picture")
        elif section is not None and credit not in section:
            fail(where, "its credit is not in CREDITS.md section 3g word for word")
        numbers = True
        for key, lo, hi in (("ra_deg", 0, 360), ("dec_deg", -90, 90), ("north_deg", -180, 180),
                            ("width_arcmin", 0.5, 900), ("height_arcmin", 0.5, 900)):
            v = r.get(key)
            if not is_number(v) or not (lo <= v <= hi):
                fail(where, f"`{key}` must be a number in [{lo}, {hi}] (got {v!r})")
                numbers = False
        if r.get("colours") not in NEBULA_COLOURS:
            fail(where, f"`colours: {r.get('colours')}` is not one of {', '.join(sorted(NEBULA_COLOURS))}: it picks the card's sentence")
        elif r["colours"] == "unstated":
            if r.get("filters"):
                fail(where, "says the filters are unstated and names them")
            if not r.get("colours_note"):
                fail(where, "`colours: unstated` needs a `colours_note:` saying what the page does say")
        elif not r.get("filters"):
            fail(where, "no `filters:` -- the card's sentence names them; write `colours: unstated` if the page does not")
        solved = r.get("solved")
        if not isinstance(solved, dict) or not is_number(solved.get("correlation")) or not is_number(solved.get("mirror")):
            fail(where, "no `solved: {correlation, mirror}` -- the archives' centres are up to 43' off, so a picture is "
                        "placed by scripts/build_nebulae.py --solve and carries its evidence")
        elif solved["correlation"] < 10 or solved["correlation"] < NEBULA_MIRROR_MARGIN * solved["mirror"]:
            fail(where, f"correlation {solved['correlation']} against its mirror image's {solved['mirror']}: the picture cannot "
                        f"be told from its reflection (or matches nothing), so it is not placed")
        f = str(r.get("file") or "")
        if not re.fullmatch(r"site/images/nebulae/[a-z0-9-]+\.webp", f):
            fail(where, f"`file: {f}` must be site/images/nebulae/<name>.webp")
        elif not (ROOT / f).exists():
            fail(where, f"{f} is not in the tree (scripts/build_nebulae.py --only={r['id']})")
        if not isinstance(r.get("checked"), datetime.date):
            fail(where, "no `checked:` date")
        if "px" in r and (not isinstance(r["px"], int) or not 128 <= r["px"] <= 1024):
            fail(where, f"`px: {r['px']}` must be a whole number from 128 to 1024")
        if dso:
            o = dso.get(r["id"])
            if o is None:
                fail(where, "is not a deep-sky object in site/data/dso.json: the picture would belong to no record")
            elif numbers:
                at = nebula_inside(r, o["raDeg"], o["decDeg"])
                if at is None or not (0.02 < at[0] < 0.98 and 0.02 < at[1] < 0.98):
                    fail(where, f"the object's catalogue position (RA {o['raDeg']}, Dec {o['decDeg']}) is not inside the "
                                f"picture: it would be drawn on a part of the sky its object is not in")
    return pictures


EXOTIC_KINDS = {"blackhole", "pulsar", "magnetar", "star"}


def check_exotics() -> list:
    """registry/exotics.yaml: a fact sheet must say where its facts came from."""
    path = REG / "exotics.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
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
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
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
        if r.get("radius_suns") is not None:
            # A width an interferometer measured (internal #412): the radius, its error, the temperature and the page it was read on.
            ok = all(isinstance(r.get(k), (int, float)) and not isinstance(r.get(k), bool) and r.get(k) > 0
                     for k in ("radius_suns", "radius_err_suns", "teff_k", "teff_err_k"))
            if not ok or r["radius_err_suns"] >= r["radius_suns"] or not (2000 <= r["teff_k"] <= 50000):
                fail(where, "`radius_suns`, `radius_err_suns`, `teff_k` and `teff_err_k` must all be positive numbers, the error under the radius")
            if not STAR_SOURCE.match(str(r.get("physical_source") or "")):
                fail(where, "`physical_source:` must be the page and the day it was read, \"https://... (read YYYY-MM-DD)\"")
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
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
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
        elif "layer" in row and row["layer"] not in layer_ids:
            fail("ladder.yaml", f"a `we_show` row counts `layer: {row['layer']}`, which has no layers.yaml row")
    return rungs_


def check_aliases() -> list:
    """registry/aliases.yaml: a nickname says what it means and why, once."""
    path = REG / "aliases.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
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


def check_links() -> list:
    """registry/links.yaml: every link out was opened on a date, names its publisher, and is https."""
    path = REG / "links.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("links.yaml", f"will not parse: {exc}")
        return []
    rows_ = doc.get("links")
    if not isinstance(rows_, list) or not rows_:
        fail("links.yaml", "no `links:` list")
        return []
    seen = set()
    for r in rows_:
        if not isinstance(r, dict):
            fail("links.yaml", "a row is not a mapping")
            continue
        lid = str(r.get("id") or "").strip()
        where = f"links.yaml[{lid or '?'}]"
        if not lid:
            fail("links.yaml", "a row has no `id:`")
            continue
        if lid in seen:
            fail(where, "duplicate `id:`")
        seen.add(lid)
        if not str(r.get("for") or "").strip():
            fail(where, "no `for:` -- the record whose card shows the link")
        words = str(r.get("words") or "").strip()
        if not words or len(words) > 24:
            fail(where, "`words:` is the link's text: needed, and at most 24 characters")
        if not str(r.get("publisher") or "").strip():
            fail(where, "no `publisher:` -- the card names whose page it opens")
        url = str(r.get("url") or "")
        if not url.startswith("https://"):
            fail(where, "`url:` must be an https address")
        if not str(r.get("saw") or "").strip():
            fail(where, "no `saw:` -- what was on the page the day it was checked")
        checked = r.get("checked")
        if not isinstance(checked, datetime.date):
            fail(where, "no `checked:` date -- a link nobody opened is a link that may be dead")
        elif (datetime.date.today() - checked).days > 180:
            print(f"finding: {where} was last opened on {checked}: open it again and move the date")
    return rows_


def check_sky_events(world_ids: set, tour_ids: set) -> list:
    """registry/sky-events.yaml (the /events/ pages) and registry/seo-facts.yaml: shape, ids, dates, links."""
    path = REG / "sky-events.yaml"
    if not path.exists():
        fail("sky-events.yaml", "missing")
        return []
    try:
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("sky-events.yaml", f"will not parse: {exc}")
        return []
    if not isinstance(doc.get("checked_on"), datetime.date):
        fail("sky-events.yaml", "no `checked_on:` date -- the day a person last read the computed output")
    shower_ids = {s.get("id") for s in (load("showers.yaml").get("showers") or []) if isinstance(s, dict)}
    evs = doc.get("events")
    if not isinstance(evs, list) or not evs:
        fail("sky-events.yaml", "no `events:` list")
        return []
    seen = set()
    for e in evs:
        eid = str(e.get("id") or "") if isinstance(e, dict) else ""
        where = f"sky-events.yaml[{eid or '?'}]"
        if not re.match(r"^[a-z0-9][a-z0-9-]*$", eid):
            fail(where, "`id:` is the page address /events/<id>.html: lower-case letters, digits and dashes")
            continue
        if eid in seen:
            fail(where, "duplicate id")
        seen.add(eid)
        kind = e.get("kind")
        if kind not in ("meteor-shower", "mission", "eclipse"):
            fail(where, f"`kind:` {kind!r} is not meteor-shower, mission or eclipse")
        if not str(e.get("name") or "").strip():
            fail(where, "no `name:`")
        short = str(e.get("short") or "")
        if not short or len(short) > 54:
            fail(where, f"`short:` is the page title: needed, at most 54 characters (it is {len(short)})")
        summary = str(e.get("summary") or "")
        if not 70 <= len(summary) <= 160:
            fail(where, f"`summary:` is the description: 70 to 160 characters (it is {len(summary)})")
        if kind == "meteor-shower":
            if e.get("shower") not in shower_ids:
                fail(where, f"`shower: {e.get('shower')}` is not a row of showers.yaml")
            if not isinstance(e.get("year"), int):
                fail(where, "`year:` must be a whole number")
            if not isinstance(e.get("moon_at"), datetime.datetime):
                fail(where, "`moon_at:` must be an ISO UTC instant (…T…Z)")
        elif kind == "mission":
            if not str(e.get("mission") or "").strip():
                fail(where, "no `mission:`")
            if not isinstance(e.get("happens"), datetime.date):
                fail(where, "`happens:` must be the date the agency gives (YYYY-MM-DD)")
        elif kind == "eclipse":
            if e.get("eclipse") not in ("annular", "total"):
                fail(where, "`eclipse:` must be annular or total")
            if not isinstance(e.get("near"), datetime.date):
                fail(where, "`near:` must be a date shortly before the eclipse")
        for a in e.get("also") or []:
            if not (isinstance(a, dict) and a.get("body") and a.get("what") == "greatest-western-elongation"):
                fail(where, f"`also:` row {a!r} is not {{body, what: greatest-western-elongation}}")
        link = e.get("link")
        if not isinstance(link, dict) or not isinstance(link.get("t"), str) \
                or not re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$", link.get("t", "")):
            fail(where, "`link: {t: <ISO UTC instant>, at: <world id>}` is how the page opens the app at that moment")
        elif link.get("at") not in world_ids and link.get("at") != "earth":
            fail(where, f"`link.at: {link.get('at')}` is not a world id (worlds.yaml)")
        if e.get("trip") is not None and e.get("trip") not in tour_ids:
            fail(where, f"`trip: {e.get('trip')}` is not a trip of tours.yaml")
        srcs = e.get("sources")
        if not isinstance(srcs, list) or not srcs:
            fail(where, "no `sources:` -- a dated claim names the page it came from")
        for s in srcs or []:
            if not (isinstance(s, dict) and str(s.get("url") or "").startswith("https://") and s.get("words")
                    and isinstance(s.get("read"), datetime.date)):
                fail(where, f"a source needs words, an https url and the day it was read: {s!r}")
    # The fallback counts for the satellite pages.
    sf = REG / "seo-facts.yaml"
    try:
        facts = (yaml_load(sf.read_text(encoding="utf-8")) or {}).get("satellite_counts") if sf.exists() else None
    except yaml.YAMLError as exc:
        fail("seo-facts.yaml", f"will not parse: {exc}")
        facts = None
    if not isinstance(facts, dict):
        fail("seo-facts.yaml", "no `satellite_counts:`")
    else:
        for k in ("active_objects", "starlink_objects"):
            if not (isinstance(facts.get(k), int) and facts[k] > 0):
                fail("seo-facts.yaml", f"`{k}` must be a positive whole number")
        if not isinstance(facts.get("as_of"), datetime.date) or facts["as_of"] > datetime.date.today():
            fail("seo-facts.yaml", "`as_of:` must be a date, not in the future -- a count without its day is a live number")
        if not str(facts.get("source") or "").strip():
            fail("seo-facts.yaml", "no `source:` line")
    return evs


def check_oldest_notes() -> list:
    """registry/oldest-notes.yaml: a line about an old satellite cites the page it was read on."""
    path = REG / "oldest-notes.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        fail("oldest-notes.yaml", f"will not parse: {exc}")
        return []
    rows_ = doc.get("notes")
    if not isinstance(rows_, list):
        fail("oldest-notes.yaml", "no `notes:` list")
        return []
    seen = set()
    for r in rows_:
        if not isinstance(r, dict) or not isinstance(r.get("norad"), int):
            fail("oldest-notes.yaml", "a row has no `norad:` catalogue number")
            continue
        where = f"oldest-notes.yaml[{r['norad']}]"
        if r["norad"] in seen:
            fail(where, "duplicate `norad:`")
        seen.add(r["norad"])
        line = str(r.get("line") or "").strip()
        if not line or len(line) > 120:
            fail(where, "`line:` is needed and is at most 120 characters")
        if not str(r.get("source") or "").startswith("https://"):
            fail(where, "no https `source:` -- a line nobody can check is a rumour")
        if not isinstance(r.get("read"), datetime.date):
            fail(where, "no `read:` date -- the day the page said this")
        if not str(r.get("quote") or "").strip():
            fail(where, "no `quote:` -- the page's own words behind the line")
    return rows_


COLORKEY_FIELDS = {"klass", "perigee_km", "inclination_deg", "launch_year"}


def check_colorkeys() -> list:
    """registry/colorkeys.yaml: a key reads a field the browser knows how to read; its buckets tile a range."""
    path = REG / "colorkeys.yaml"
    if not path.exists():
        return []
    try:
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
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
        doc = yaml_load(path.read_text(encoding="utf-8")) or {}
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
        return yaml_load(path.read_text(encoding="utf-8")) or {}
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


# --- registry/budgets.yaml (spec 0044, 2026-09-28) -------------------------------------------
# Every gate CI reads is one row, so a gate cannot be loosened by editing a constant in a test.
# Three refusals: a row missing a field; a value raised above the copy the change is based on
# without a newer `since`; and a row nothing reads, which is a decoration and not a gate.
BUDGET_FIELDS = ("id", "value", "unit", "since", "reason")
# Where a reader may live. The mirror and its generator name every id and read none of them, and
# test_refusals.py names them to break them.
BUDGET_READERS = ("tests", "scripts", "site/js", "tools")
BUDGET_NOT_READERS = {"site/js/data/budgets.js", "scripts/gen_budgets_js.py", "tests/test_refusals.py"}
# The values the other checks read (check_audio's bed and total), filled by check_budgets().
BUDGETS: dict[str, float] = {}


def budget_base_rows() -> list | None:
    """The budgets in the copy this change is based on, or None when git cannot say.

    `$BUDGETS_BASE` names the revision: ci.yml sets HEAD^1, which in a pull request's merge commit is
    the base branch. Unset, it is HEAD, which is what a contributor's uncommitted edit is based on.
    A tree that is not a checkout (tests/test_refusals.py copies the registry into one) has no base.
    """
    ref = os.environ.get("BUDGETS_BASE") or "HEAD"
    try:
        out = subprocess.run(["git", "show", f"{ref}:registry/budgets.yaml"], cwd=ROOT,
                             capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        return None
    try:
        return (yaml_load(out.stdout) or {}).get("budgets") or []
    except yaml.YAMLError:
        return None


def budget_reader_text() -> str | None:
    """Every file that could read a budget, as one string; None in a tree without tests/."""
    if not (ROOT / "tests").is_dir():
        return None
    parts = []
    for top in BUDGET_READERS:
        for f in sorted((ROOT / top).rglob("*")):
            rel = f.relative_to(ROOT).as_posix()
            if f.is_file() and f.suffix in (".py", ".mjs", ".js") and rel not in BUDGET_NOT_READERS:
                parts.append(f.read_text(encoding="utf-8", errors="replace"))
    return "\n".join(parts)


def check_budgets() -> list:
    path = REG / "budgets.yaml"
    if not path.exists():
        fail("budgets.yaml", "missing -- spec 0044 keeps every gate CI reads in it")
        return []
    rows_ = rows(load("budgets.yaml"), "budgets", "budgets.yaml")
    base = {r.get("id"): r for r in (budget_base_rows() or []) if isinstance(r, dict)}
    readers = budget_reader_text()
    seen: set = set()
    for r in rows_:
        if not isinstance(r, dict):
            fail("budgets.yaml", f"a row that is not a mapping: {r!r}")
            continue
        bid = r.get("id")
        where = f"budgets.yaml[{bid}]"
        missing = [k for k in BUDGET_FIELDS if r.get(k) in (None, "")]
        if missing:
            fail(where, f"no {', '.join(missing)} -- a gate says what it is, since when, and why")
        if bid in seen:
            fail(where, "the id is used twice")
        seen.add(bid)
        value, since = r.get("value"), r.get("since")
        if not is_number(value):
            fail(where, f"value {value!r} must be a number")
            continue
        if since is not None and not isinstance(since, datetime.date):
            fail(where, f"since {since!r} must be a date, YYYY-MM-DD")
            continue
        BUDGETS[bid] = value
        old = base.get(bid)
        if old and is_number(old.get("value")) and value > old["value"]:
            old_since = old.get("since")
            dated = isinstance(since, datetime.date) and isinstance(old_since, datetime.date)
            # A SECOND RAISE ON THE SAME DAY (2026-10-06: two packages of trips landed, hours apart,
            # each with its own measured total) cannot carry a later day without lying about it. It
            # carries the same day and a NEW reason, which is where the measurement is written; the
            # same day with the old reason word for word is still refused, as is an earlier day.
            again = dated and since == old_since and str(r.get("reason") or "").strip() != str(old.get("reason") or "").strip()
            if not (dated and (since > old_since or again)):
                fail(where, f"raised from {old['value']} to {value} with `since` still {since}: a raised gate "
                            f"is a decision, so it carries the day it was made and what was measured")
        if readers is not None:
            # The substring test first: the regex over three megabytes of readers was 4 s of every run.
            read = str(bid) in readers and re.search(rf"\b{re.escape(str(bid))}\b", readers) is not None
            if not read and not r.get("pending"):
                fail(where, "nothing in tests/, scripts/ or site/js/ reads it: a budget nobody checks is a "
                            "decoration (write `pending:` with the spec task that will read it)")
            if read and r.get("pending"):
                fail(where, f"says `pending: {r.get('pending')}` and is read now; drop the word")
    return rows_


def budget(bid: str, fallback: float) -> float:
    """A gate from registry/budgets.yaml, or the fallback when the file could not say."""
    return BUDGETS.get(bid, fallback)


# --- registry/audio.yaml (spec 0035, 2026-09-23) ---------------------------------------------
# Sound is somebody else's work more often than anything else in the tree, and it is the one
# asset a visitor cannot see is credited: so it gets the models' treatment and then some. A row
# is refused unless the file ships, its size is measured, the credit is in CREDITS.md section 9
# word for word, and the page it came from is named with the day it was read. The budget is here
# too, because a bed is the largest thing a visitor can download after the first visit and the
# only way it stays small is a number that fails the build.
AUDIO_FIELDS = ("id", "kind", "file", "twin", "seconds", "kb", "loop", "licence", "source", "credit")
AUDIO_KINDS = {"bed", "sting"}
AUDIO_STAGES = {"earth", "world", "sun", "ladder"}
AUDIO_KB_SLACK = 0.05
AUDIO_FILE = re.compile(r"[A-Za-z0-9_.-]+\.(?:opus|m4a)")


def credits_section(text: str, number: int) -> str | None:
    """The body of `## <number>. ...` in CREDITS.md, up to the next `## `; None if absent."""
    m = re.search(rf"^## {number}\.[^\n]*\n(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else None


# --- registry/autopilot.yaml (spec 0036: the reels a screen plays on its own) -------------------
# A reel is a list of trip ids, so the only lies it can tell are about the trips: one that does not
# exist, the same one twice, a length that is not the trips' own, a "from your own ground" that is
# not. Every refusal below is one of those. tests/test_refusals.py breaks each on purpose.
AUTOPILOT_SOUND = ("ask", "off")
AUTOPILOT_MIN_TRIPS = 3
AUTOPILOT_TIMING = {  # key: (lowest, highest) -- a kiosk that reloads every minute, or never, is a bug
    "title_s": (3, 30), "gate_s": (5, 60), "offer_s": (5, 60), "idle_s": (30, 1800),
    "cursor_s": (1, 30), "reload_h": (1, 168),
}


def check_autopilot(layer_ids: set) -> list:
    path = REG / "autopilot.yaml"
    if not path.exists():
        return []
    doc = load("autopilot.yaml")
    reels = rows(doc, "reels", "autopilot.yaml")
    tours_doc = load("tours.yaml") if (REG / "tours.yaml").exists() else {}
    tours = {t.get("id"): t for t in (tours_doc.get("tours") or []) if isinstance(t, dict)}

    def silent_s(trip: dict) -> float:
        # The trip's own stated length (scripts/gen_tours_js.py trip_of): its dwells and a flight each.
        stops = [s for s in (trip.get("stops") or []) if isinstance(s, dict)]
        return sum(tour_dwell_ms((s.get("card") or {}).get("body")) + 3350 for s in stops) / 1000.0

    timing = doc.get("timing")
    if not isinstance(timing, dict):
        fail("autopilot.yaml", "no `timing:` block -- the seconds ui/autopilotplan.js reads")
        timing = {}
    for key, (lo, hi) in AUTOPILOT_TIMING.items():
        v = timing.get(key)
        if not is_number(v) or not lo <= v <= hi:
            fail("autopilot.yaml[timing]", f"`{key}` is {v!r}; it must be a number from {lo} to {hi}")
    for key in timing:
        if key not in AUTOPILOT_TIMING:
            fail("autopilot.yaml[timing]", f"`{key}` is read by nothing")
    title_s = timing.get("title_s") if is_number(timing.get("title_s")) else 0

    seen: set = set()
    for r in reels:
        if not isinstance(r, dict):
            fail("autopilot.yaml", f"a row that is not a mapping: {r!r}")
            continue
        rid = r.get("id")
        where = f"autopilot.yaml[{rid}]"
        if not isinstance(rid, str) or not re.fullmatch(r"[a-z][a-z0-9-]*", rid):
            fail(where, "the id is what a link carries (`#ambient=<id>`): lower-case letters, digits and hyphens")
            continue
        if rid in seen:
            fail(where, "the id is used twice")
        seen.add(rid)
        if rid in tours:
            fail(where, "the id is also a trip's -- `#ambient=<id>` could not tell a reel from one trip played alone")
        if rid in layer_ids:
            fail(where, "the id is also a layer's -- two registries, one name")
        if rid in ("off", "on"):
            fail(where, "that word is what switches the mode on and off in the link")
        for key in ("title", "blurb"):
            text = r.get(key)
            if not isinstance(text, str) or not text.strip():
                fail(where, f"no `{key}`")
            elif "--" in text:
                fail(where, f"`{key}` has ` -- ` in it; write a comma or a colon")
        if r.get("sound") not in AUTOPILOT_SOUND:
            fail(where, f"`sound` is {r.get('sound')!r}; it is one of {', '.join(AUTOPILOT_SOUND)} "
                        "(quote \"off\": bare, YAML reads it as false)")
        trips = r.get("trips")
        if not isinstance(trips, list) or len(trips) < AUTOPILOT_MIN_TRIPS:
            fail(where, f"fewer than {AUTOPILOT_MIN_TRIPS} trips -- that is one trip on repeat, and `present=auto` is that")
            continue
        total = 0.0
        own_ground = []
        for tid in trips:
            trip = tours.get(tid)
            if trip is None:
                fail(where, f"`{tid}` is not a trip in registry/tours.yaml")
                continue
            total += silent_s(trip) + title_s
            own_ground.append(bool(trip.get("requires_observer")))
        if len(set(trips)) != len(trips):
            fail(where, "a trip is listed twice -- a lap that repeats itself reads as a stuck screen")
        if own_ground and all(own_ground) != bool(r.get("place")):
            fail(where, "`place: true` is for a reel whose every trip starts from the visitor's own ground, "
                        "and only for that one: the screen says so, and falls back when no place is set")
        minutes = r.get("minutes")
        if not is_number(minutes) or minutes <= 0:
            fail(where, "no `minutes` -- the lap's length is the one promise a reel makes")
        elif total and not (total / 60.0 <= minutes * 1.1 and minutes <= total / 60.0 * 1.4):
            fail(where, f"`minutes: {minutes}` and the trips' own lengths disagree: a silent lap is "
                        f"{total / 60.0:.1f} min, and the voice adds up to two fifths. One promise, one number")
    default = doc.get("default")
    if reels and default not in seen:
        fail("autopilot.yaml", f"`default: {default}` names no reel -- it is what `#ambient=1` plays")
    else:
        row = next((r for r in reels if isinstance(r, dict) and r.get("id") == default), None)
        if row and row.get("place"):
            fail("autopilot.yaml", "the default reel needs a place -- a screen nobody set up would have nothing to play")
    return reels


def check_audio() -> list:
    path = REG / "audio.yaml"
    if not path.exists():
        return []  # the engine ships before any sound does (spec 0035 design section 6)
    doc = load("audio.yaml")
    rows_ = rows(doc, "audio", "audio.yaml")
    credits_path = ROOT / "CREDITS.md"
    credits = credits_path.read_text(encoding="utf-8") if credits_path.exists() else ""
    section = credits_section(credits, 9)
    if rows_ and section is None:
        fail("CREDITS.md", "registry/audio.yaml ships sound and CREDITS.md has no `## 9. Audio` "
                           "section -- the credit has to be somewhere a visitor's lawyer would look")
    section = section or ""
    seen_ids, beds_by_stage, shipped = set(), {}, set()
    total_kb = 0.0
    bed_max_kb, total_max_kb = budget("bed_kb", 600), budget("audio_total_kb", 3000)
    for r in rows_:
        if not isinstance(r, dict):
            fail("audio.yaml", f"a row that is not a mapping: {r!r}")
            continue
        rid = r.get("id")
        where = f"audio.yaml[{rid}]"
        missing = [k for k in AUDIO_FIELDS if r.get(k) in (None, "")]
        if missing:
            fail(where, f"no {', '.join(missing)} -- every row redistributes somebody's recording")
        if rid in seen_ids:
            fail(where, "the id is used twice")
        seen_ids.add(rid)
        kind = r.get("kind")
        if kind not in AUDIO_KINDS:
            fail(where, f"kind {kind!r} must be one of {sorted(AUDIO_KINDS)}")
        stage = r.get("stage")
        if kind == "bed":
            if stage not in AUDIO_STAGES:
                fail(where, f"stage {stage!r} must be one of {sorted(AUDIO_STAGES)} -- the four rungs "
                            f"site/js/audio/pick.js rungOf() can answer")
            elif stage in beds_by_stage:
                fail(where, f"one bed per rung: `{stage}` already has {beds_by_stage[stage]}")
            else:
                beds_by_stage[stage] = rid
            if r.get("loop") is not True:
                fail(where, "a bed loops; `loop: true`, and the file cut so the seam is inaudible")
        elif kind == "sting" and stage is not None:
            fail(where, "a sting has no stage; it plays wherever the trip is")
        if not isinstance(r.get("loop"), bool):
            fail(where, f"loop {r.get('loop')!r} must be true or false")
        if not is_number(r.get("seconds")) or not r.get("seconds") > 0:
            fail(where, f"seconds {r.get('seconds')!r} must be a positive number")
        for key, ext in (("file", ".opus"), ("twin", ".m4a")):
            f = str(r.get(key) or "")
            if not f:
                continue
            if not f.startswith("site/audio/"):
                fail(where, f"{key} `{f}` must be under site/audio/, which deploy.sh ships as a directory")
            if not f.endswith(ext):
                fail(where, f"{key} `{f}` must be a {ext} file (spec 0035 req 7: Opus, and an AAC twin)")
            if not (ROOT / f).is_file():
                fail(where, f"{key} `{f}` does not exist -- a row describing a file we do not ship is "
                            f"worse than no row")
            else:
                shipped.add(Path(f).name)
        kb = r.get("kb")
        f = ROOT / str(r.get("file") or "")
        if is_number(kb):
            total_kb += kb
            if r.get("file") and f.is_file():
                real = f.stat().st_size / 1000
                if abs(real - kb) > AUDIO_KB_SLACK * real:
                    fail(where, f"kb: {kb} but `{r.get('file')}` is {real:.1f} kB -- the row's size is "
                                f"the budget; measure it")
            if kind == "bed" and kb > bed_max_kb:
                fail(where, f"a bed of {kb} kB is over the {bed_max_kb} kB budget (`bed_kb` in registry/budgets.yaml, "
                            f"about 75 s at 64 kbps); cut it shorter or encode it lower")
        elif kb is not None:
            fail(where, f"kb {kb!r} must be a number")
        src = str(r.get("source") or "")
        if src and not STAR_SOURCE.match(src):
            fail(where, f"source {src!r} must be `URL (read YYYY-MM-DD)` -- a page with no day is one "
                        f"nobody can re-check when the page changes")
        credit = r.get("credit")
        if credit and str(credit) not in section:
            fail("CREDITS.md", f"audio.yaml credits `{rid}` as {credit!r}, and CREDITS.md section 9 "
                               f"does not carry that line")
        if credit and " -- " in str(credit):
            fail(where, "the credit prints two hyphens as a dash; write a comma or a real dash")
    if total_kb > total_max_kb:
        fail("audio.yaml", f"the sounds add up to {total_kb:.0f} kB, over the {total_max_kb} kB "
                           f"budget spec 0035 req 7 sets (`audio_total_kb` in registry/budgets.yaml)")
    # The reverse rule: a credit for a file that does not ship, and a file that ships uncredited.
    for name in sorted(set(AUDIO_FILE.findall(section))):
        if name not in shipped:
            fail("CREDITS.md", f"section 9 credits `{name}`, which has no audio.yaml row and does not "
                               f"ship -- a credit for work that is not here")
    audio_dir = ROOT / "site" / "audio"
    if audio_dir.is_dir():
        for p in sorted(audio_dir.iterdir()):
            if p.is_file() and p.name not in shipped and not p.name.startswith("."):
                fail("site/audio", f"`{p.name}` ships and has no audio.yaml row -- so it carries no "
                                   f"licence, no credit and no source, and deploy.sh would push it anyway")
    return rows_


# --- registry/textures.yaml (2026-09-28, the device tiers) ------------------------------------
# Every map the scene can wear, one file per device tier. A texture is somebody else's picture on
# every visitor's screen, and a 4k one is the largest thing a laptop downloads after the first
# visit, so a row is refused unless: it names its licence, its credit (carried word for word by
# CREDITS.md section 2) and the page it came from with the day it was read; every file it names is
# in the tree, measured (bytes exact) and the size it claims (pixels read from the file's own
# header); its tier-0 file is the file registry/models.yaml already credits under the same id, so
# the boot set cannot drift from what the rest of the registry says ships; and it does not come
# from an author whose terms forbid hosting their maps (Bjorn Jonsson: "please do not place a copy
# of the maps on your website"; Steve Albers: "personal non-commercial use only"). The reverse rule
# too: a file under site/textures/ that no row names ships uncredited, and is refused.
TEXTURE_ROW_FIELDS = ("id", "world", "slot", "when", "files")
TEXTURE_FILE_FIELDS = ("tier", "file", "px", "bytes", "format", "licence", "credit", "source")
TEXTURE_WHEN = {"boot", "idle", "near", "asked"}
TEXTURE_FORMATS = {"rgb", "rgba", "mono"}
# -1 is the light embed's copy (js/embedlite.js): no device tier wears it.
TEXTURE_TIERS = {-1, 0, 1, 2}
TEXTURE_REFUSED = ("bjj.mmedia.is", "jonsson", "jónsson", "albers")


def image_size(path: Path) -> tuple[int, int] | None:
    """(width, height) from a PNG, JPEG or WebP header, with the standard library alone."""
    data = path.read_bytes()[:1 << 16]
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        kind = data[12:16]
        if kind == b"VP8 ":
            return int.from_bytes(data[26:28], "little") & 0x3FFF, int.from_bytes(data[28:30], "little") & 0x3FFF
        if kind == b"VP8L":
            b = int.from_bytes(data[21:25], "little")
            return (b & 0x3FFF) + 1, ((b >> 14) & 0x3FFF) + 1
        if kind == b"VP8X":
            return int.from_bytes(data[24:27], "little") + 1, int.from_bytes(data[27:30], "little") + 1
        return None
    if data[:2] == b"\xff\xd8":
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                return int.from_bytes(data[i + 7:i + 9], "big"), int.from_bytes(data[i + 5:i + 7], "big")
            if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
                i += 2
                continue
            i += 2 + int.from_bytes(data[i + 2:i + 4], "big")
    return None


def texture_paths(f: dict) -> list[str]:
    """The files a tier entry names: twelve for a monthly one (`{mm}` -> 01..12)."""
    name = str(f.get("file") or "")
    if f.get("monthly"):
        return [name.replace("{mm}", f"{m:02d}") for m in range(1, 13)]
    return [name]


# Small bodies that wear a map on their shape model (2026-10-07, internal #382): textures.yaml `world` -> models.yaml real model.
SMALL_BODY_MAPS = {"ceres": "dwarf-ceres", "vesta": "asteroid-vesta"}


def check_textures(model_textures: list, world_ids: set) -> list:
    path = REG / "textures.yaml"
    if not path.exists():
        fail("textures.yaml", "missing -- the device tiers read which file to fetch from its mirror")
        return []
    doc = load("textures.yaml")
    rows_ = rows(doc, "textures", "textures.yaml")
    credits_path = ROOT / "CREDITS.md"
    credits = credits_path.read_text(encoding="utf-8") if credits_path.exists() else ""
    section = credits_section(credits, 2) or ""
    by_model = {t.get("id"): t for t in model_textures if isinstance(t, dict)}
    seen, shipped = set(), set()
    for r in rows_:
        if not isinstance(r, dict):
            fail("textures.yaml", f"a row that is not a mapping: {r!r}")
            continue
        rid = r.get("id")
        where = f"textures.yaml[{rid}]"
        missing = [k for k in TEXTURE_ROW_FIELDS if r.get(k) in (None, "", [])]
        if missing:
            fail(where, f"no {', '.join(missing)}")
        if rid in seen:
            fail(where, "the id is used twice")
        seen.add(rid)
        world = r.get("world")
        if world in SMALL_BODY_MAPS:
            # A small body drawn from its shape model (scene/realmodels.js), not a worlds.yaml row: the
            # model it is laid on must be one we ship, and its file must carry texture coordinates.
            model_row = next((x for x in (load("models.yaml").get("real_models") or []) if isinstance(x, dict) and x.get("id") == SMALL_BODY_MAPS[world]), None)
            glb = ROOT / str((model_row or {}).get("file") or "")
            if not model_row or not glb.is_file():
                fail(where, f"`{SMALL_BODY_MAPS[world]}` is not a real model we ship: the map has no shape to lie on")
            elif glb.stat().st_size and b'"TEXCOORD_0"' not in glb.read_bytes()[:4096]:   # tests/test_growth.py copies names, not bytes
                fail(where, f"`{glb.name}` has no texture coordinates: remake it with scripts/shape-to-glb.py --uv")
        elif world not in world_ids and world != "sky":
            fail(where, f"world {world!r} is neither a worlds.yaml row nor `sky`")
        when = r.get("when")
        if when not in TEXTURE_WHEN:
            fail(where, f"when {when!r} must be one of {sorted(TEXTURE_WHEN)}")
        files = [f for f in (r.get("files") or []) if isinstance(f, dict)]
        tiers = [f.get("tier") for f in files]
        # `boot: none` is the one way to have no tier-0 file, and it has to be said: the Earth's water
        # mask, which a phone does without (the shader guesses the ocean from the day map's colour).
        if r.get("boot") == "none":
            if 0 in tiers:
                fail(where, "`boot: none` and a tier-0 file: which is it?")
        elif tiers.count(0) != 1:
            fail(where, "exactly one file must be tier 0 -- the one every visitor boots with "
                        "(or `boot: none`, when a phone does without it)")
        if len(set(tiers)) != len(tiers):
            fail(where, f"tiers {tiers} repeat; one file per tier")
        if when == "boot" and any(t != 0 for t in tiers):
            fail(where, "`when: boot` has nothing to upgrade to; a row with a sharper file says when it is fetched")
        if when in ("idle", "near") and not any(t in (1, 2) for t in tiers):
            fail(where, f"`when: {when}` with no tier-1 or tier-2 file: there is nothing to fetch")
        model = by_model.get(rid)
        for f in files:
            tier = f.get("tier")
            at = f"{where}.files[tier {tier}]"
            gone = [k for k in TEXTURE_FILE_FIELDS if f.get(k) in (None, "", [])]
            if gone:
                fail(at, f"no {', '.join(gone)} -- every file on a visitor's screen is somebody's picture")
            if tier not in TEXTURE_TIERS:
                fail(at, f"tier {tier!r} must be one of {sorted(TEXTURE_TIERS)}")
            if f.get("format") not in TEXTURE_FORMATS:
                fail(at, f"format {f.get('format')!r} must be one of {sorted(TEXTURE_FORMATS)}")
            words = " ".join(str(f.get(k) or "") for k in ("credit", "source", "original")).lower()
            for bad in TEXTURE_REFUSED:
                if bad in words:
                    fail(at, f"names `{bad}`, whose terms do not allow hosting their maps")
            src = str(f.get("source") or "")
            if src and not STAR_SOURCE.match(src):
                fail(at, f"source {src!r} must be `URL (read YYYY-MM-DD)`")
            credit = f.get("credit")
            if credit and str(credit) not in section:
                fail("CREDITS.md", f"textures.yaml credits `{rid}` tier {tier} as {credit!r}, and CREDITS.md "
                                   f"section 2 does not carry that line")
            if credit and " -- " in str(credit):
                fail(at, "the credit prints two hyphens as a dash; write a comma")
            name = str(f.get("file") or "")
            if not name.startswith("site/textures/"):
                fail(at, f"file `{name}` must be under site/textures/, which deploy.sh ships")
                continue
            if "{mm}" in name and not f.get("monthly"):
                fail(at, "`{mm}` in the name needs `monthly: true`")
            paths = texture_paths(f)
            sizes = f.get("bytes")
            if f.get("monthly"):
                if not (isinstance(sizes, list) and len(sizes) == 12 and all(isinstance(b, int) for b in sizes)):
                    fail(at, "a monthly file lists `bytes:` as twelve integers, January first")
                    sizes = [None] * 12
            else:
                if not isinstance(sizes, int):
                    fail(at, f"bytes {sizes!r} must be an integer, measured")
                sizes = [sizes]
            px = f.get("px")
            if not (isinstance(px, list) and len(px) == 2 and all(isinstance(v, int) for v in px)):
                fail(at, f"px {px!r} must be [width, height]")
                px = None
            for p_, want in zip(paths, sizes):
                real = ROOT / p_
                if not real.is_file():
                    fail(at, f"`{p_}` does not exist -- a row describing a file we do not ship is worse than no row")
                    continue
                shipped.add(p_)
                size = real.stat().st_size
                if isinstance(want, int) and size != want:
                    fail(at, f"`{p_}` is {size} bytes and the row says {want}; measure it")
                got = image_size(real) if size else None
                if px and size and got != tuple(px):
                    fail(at, f"`{p_}` is {got} pixels and the row says {tuple(px)}")
            if tier == 0 and model is not None and model.get("file"):
                boot = "site/textures/" + str(model.get("file") or "")
                if name != boot:
                    fail(at, f"the tier-0 file `{name}` is not the file models.yaml credits as `{rid}` "
                             f"(`{boot}`): the boot set is one list")
    # The moons' maps (2026-10-05). A row that says how much of the sphere its map covers is a world's
    # one map, fetched when the world is first looked at: each file inside `moon_map_bytes`, all of
    # them inside `moon_maps_total_bytes`, and the share a number, because the card's sentence about
    # the side nobody has photographed rests on it. And the other way round: a flat-coloured world's
    # map must say its share, or a half-seen moon could ship as if it were whole.
    each_max, total_max = budget("moon_map_bytes", 250000), budget("moon_maps_total_bytes", 3200000)
    moon_total = 0
    flat_worlds = {w.get("id") for w in (load("worlds.yaml").get("worlds") or [])
                   if isinstance(w, dict) and isinstance((w.get("look") or {}).get("flat"), str)}
    for r in rows_:
        if not isinstance(r, dict):
            continue
        where = f"textures.yaml[{r.get('id')}]"
        cov = r.get("coverage")
        if cov is None:
            if r.get("world") in flat_worlds and r.get("slot") == "map":
                fail(where, "a flat-coloured world's map with no `coverage:` -- the share of the sphere the "
                            "original has data for, which the card's line about the unseen side rests on")
            continue
        if isinstance(cov, bool) or not isinstance(cov, (int, float)) or not 0 < cov <= 1:
            fail(where, f"coverage {cov!r} must be a share of the sphere, over 0 and at most 1")
        for f in r.get("files") or []:
            size = f.get("bytes") if isinstance(f, dict) else None
            if isinstance(size, int):
                moon_total += size
                if size > each_max:
                    fail(where, f"`{f.get('file')}` is {size} bytes, over the {int(each_max)} a moon's map may be "
                                f"(`moon_map_bytes` in registry/budgets.yaml): a phone fetches it on the first look")
    if moon_total > total_max:
        fail("textures.yaml", f"the moons' maps add up to {moon_total} bytes, over `moon_maps_total_bytes` "
                              f"({int(total_max)}) in registry/budgets.yaml")

    tex_dir = ROOT / "site" / "textures"
    if tex_dir.is_dir():
        for p_ in sorted(tex_dir.rglob("*")):
            rel = str(p_.relative_to(ROOT))
            if p_.is_file() and not p_.name.startswith(".") and rel not in shipped:
                fail("site/textures", f"`{rel}` ships and no textures.yaml row names it, so it carries "
                                      f"no licence, no credit and no source")
    return rows_


# --- registry/tilesets.yaml (2026-10-03, spec 0065) --------------------------------------------
# Map tiles a close world is drawn from. Nothing is stored here: every visitor's browser asks
# somebody else's server for somebody else's pictures, so a row is refused unless it names its
# licence, its credit (carried word for word by CREDITS.md section 4) and the page it was read on
# with the day; its url is an https template with {z}, {y} and {x}; its `cors` says the header was
# MEASURED and when (a host without `Access-Control-Allow-Origin` cannot be a WebGL texture at all,
# and a tile that will not load is a blurred planet nobody can explain); its world is a worlds.yaml
# row; its projection is one scene/tilemath.js addresses; and its levels are in order and inside
# what the host serves, so the app never asks for a level that is a 404 on every tile.
TILESET_FIELDS = ("id", "world", "title", "url", "projection", "matrix", "tile_px", "levels", "min_level",
                  "start_level", "max_level", "resolution_m", "grade", "cors", "licence", "credit", "source")
TILESET_RELIEF_FIELDS = ("title", "url", "capabilities", "levels", "max_level", "light_azimuth_deg", "flat", "gain", "cors", "licence", "credit", "source")
TILESET_PROJECTIONS = {"equirectangular"}
TILESET_CORS = re.compile(r"^Access-Control-Allow-Origin: \S+ \(measured \d{4}-\d{2}-\d{2}\)$")


# --- registry/weather.yaml (spec 0066) ---------------------------------------------------------
# Weather is where a map is most tempted to make things up, so every effect is a row that says how
# much of it is known, and each class has to carry what makes it true: a measured row the host and
# the CORS header as measured; a modelled row the paper; an illustrative row the reason it can be
# no better. Every row is off at the lowest tier and on a connection that saves data.
WEATHER_CLASSES = ("measured", "modelled", "illustrative")
# `events` (internal #281) is not drawn by scene/weather/: it is the evidence row of a records layer
# the page fetches for itself (site/js/data/eonet.js).
WEATHER_KINDS = {"lightning", "zonal-flow", "hexagon", "mars-season", "events", "giant-lightning", "planetary-wave", "cloud-patches"}
WEATHER_OFF = {"tier0", "save_data"}
WEATHER_CORS = re.compile(r"^access-control-allow-origin: \S+$", re.I)
# Neptune's 400 m/s is the fastest wind measured on a planet; past 600 is a unit mistake.
WEATHER_MAX_WIND_MS = 600


def check_weather_table(where: str, name: str, table, lo: float, hi: float, span=(0, 360)) -> None:
    ok = isinstance(table, list) and len(table) >= 2 and all(
        isinstance(p, list) and len(p) == 2 and all(is_number(v) for v in p) for p in table)
    if not ok:
        fail(where, f"`{name}` must be a list of [x, value] pairs")
        return
    xs = [p[0] for p in table]
    if xs != sorted(xs) or len(set(xs)) != len(xs):
        fail(where, f"`{name}` must run in order: it is read by straight lines between its points")
    if xs[0] != span[0] or xs[-1] != span[1]:
        fail(where, f"`{name}` must run from {span[0]} to {span[1]}, got {xs[0]} to {xs[-1]}")
    bad = [p for p in table if not (lo <= p[1] <= hi)]
    if bad:
        fail(where, f"`{name}` has {bad[0]}, outside {lo} to {hi}")


def check_weather(world_ids: set, layers: list) -> list:
    path = REG / "weather.yaml"
    if not path.exists():
        return []  # a tree from before spec 0066; the mirror check refuses a mirror without it
    doc = load("weather.yaml")
    if list(doc.get("classes") or []) != list(WEATHER_CLASSES):
        fail("weather.yaml", f"`classes:` must be {list(WEATHER_CLASSES)}: the card has one sentence for each")
    rows_ = rows(doc, "effects", "weather.yaml")
    layer_ids = {l.get("id") for l in layers}
    en_path = ROOT / "site/js/copy/en.js"
    en = en_path.read_text(encoding="utf-8") if en_path.exists() else ""
    weather_copy = en[en.find("  weather: {"):] if "  weather: {" in en else ""
    seen = set()
    for r in rows_:
        if not isinstance(r, dict):
            fail("weather.yaml", f"a row that is not a mapping: {r!r}")
            continue
        rid = r.get("id")
        where = f"weather.yaml[{rid}]"
        if not rid:
            fail("weather.yaml", "a row has no id")
            continue
        if rid in seen:
            fail(where, "the id is used twice")
        seen.add(rid)
        world = r.get("world")
        if world not in world_ids:
            fail(where, f"world {world!r} is not a worlds.yaml row")
        if r.get("kind") not in WEATHER_KINDS:
            fail(where, f"kind {r.get('kind')!r} is not one scene/weather/ draws {sorted(WEATHER_KINDS)}")
        cls = r.get("class")
        if cls not in WEATHER_CLASSES:
            fail(where, f"class {cls!r} must be one of {list(WEATHER_CLASSES)} -- say how much of this is known")
        off = r.get("off_at")
        if not isinstance(off, list) or not WEATHER_OFF <= set(off):
            fail(where, f"`off_at:` must list {sorted(WEATHER_OFF)}: no effect is drawn at the lowest tier "
                        f"or on a connection that saves data (spec 0066 requirement 8)")
        src = r.get("source") or {}
        if not isinstance(src, dict) or not src.get("name") or not str(src.get("url") or "").startswith("https://"):
            fail(where, "no `source:` with a name and an https url -- weather nobody can check is weather made up")
        elif not src.get("read"):
            fail(where, "source has no `read:` day -- a page nobody dated is one nobody can re-check")
        if cls == "measured":
            if not WEATHER_CORS.match(str(src.get("cors") or "")):
                fail(where, f"a measured effect is fetched by the page, so `source.cors` must be the header as "
                            f"curl printed it (`access-control-allow-origin: *`), got {src.get('cors')!r}")
            if not src.get("licence"):
                fail(where, "a measured effect has no `source.licence` -- somebody else's data needs its terms")
            if not r.get("covers"):
                fail(where, "a measured effect has no `covers:` -- say where the data reaches, so the card can")
        if cls == "illustrative" and not r.get("why"):
            fail(where, "an illustrative effect has no `why:` -- say why it can be no better than illustrative")
        if r.get("kind") == "lightning" and "reduced_motion" not in (off or []):
            fail(where, "lightning flashes: `off_at:` must list `reduced_motion`")
        layer = r.get("layer")
        if layer is not None and layer not in layer_ids:
            fail(where, f"layer {layer!r} is not a layers.yaml row")
        if r.get("kind") == "zonal-flow":
            prof = r.get("profile") or {}
            if not is_number(prof.get("radius_km")) or not prof.get("radius_km") > 0:
                fail(where, "profile has no `radius_km` -- a wind in m/s is an angle only on a circle of known size")
            if prof.get("sense") not in (1, -1):
                fail(where, "profile.sense must be 1 or -1: which way the planet turns under the IAU's north")
            if not is_number(prof.get("flattening")) or not 0 <= prof.get("flattening") < 0.2:
                fail(where, "profile has no `flattening` (0 for a sphere): its latitudes are planetographic")
            check_weather_table(where, "profile.points", prof.get("points"),
                                -WEATHER_MAX_WIND_MS, WEATHER_MAX_WIND_MS, span=(-90, 90))
            if cls == "measured":
                fail(where, "a wind profile is `modelled`: the jets are published, today's clouds are not")
        if r.get("kind") == "mars-season":
            check_weather_table(where, "north_cap", r.get("north_cap"), 45, 90)
            check_weather_table(where, "south_cap", r.get("south_cap"), -90, -45)
            # An optical depth in visible light: 0.2 on the clearest day, 5 in a global storm.
            check_weather_table(where, "dust_tau", r.get("dust_tau"), 0.05, 5)
            if not is_number(r.get("dust_north")) or not 0 <= r.get("dust_north") <= 1:
                fail(where, "dust_north must be a share, 0..1: how much of the dusty season's haze the north gets")
        if r.get("kind") == "giant-lightning":
            li = r.get("lightning") or {}
            bands = li.get("bands")
            if not (isinstance(bands, list) and bands and all(isinstance(b, list) and len(b) == 3 and all(is_number(x) for x in b)
                                                             and -90 <= b[0] < b[1] <= 90 and b[2] > 0 for b in bands)):
                fail(where, "lightning.bands must be [south, north, weight] rows of latitudes: where it was seen")
            if not all(is_number(li.get(k)) and li.get(k) > 0 for k in ("mean_gap_s", "slots", "life_s", "radius_deg")):
                fail(where, "lightning needs mean_gap_s, slots, life_s and radius_deg")
            elif li.get("mean_gap_s") < 3 or li.get("slots") > 4:
                fail(where, "a giant's lightning is RARE flashes: a mean wait under 3 s, or more than 4 at once, is a light show")
            if "reduced_motion" not in (off or []):
                fail(where, "a flash is motion: off_at must list reduced_motion")
            if cls != "illustrative":
                fail(where, "nobody reports a giant's flashes today: the class is illustrative")
        if r.get("kind") == "planetary-wave":
            wv = r.get("wave") or {}
            if not (is_number(wv.get("period_days")) and wv.get("period_days") > 0 and is_number(wv.get("depth")) and 0 < wv.get("depth") <= 0.3
                    and is_number(wv.get("arm_deg")) and 0 < wv.get("arm_deg") < 90):
                fail(where, "wave needs period_days, a depth of at most 0.3 and arm_deg")
        if r.get("kind") == "cloud-patches":
            pt = r.get("patches")
            if not (isinstance(pt, list) and 0 < len(pt) <= 4 and all(isinstance(q, list) and len(q) == 4 and all(is_number(x) for x in q)
                                                                      and -90 <= q[0] <= 90 and q[2] > 0 and q[3] > 0 for q in pt)):
                fail(where, "patches must be 1 to 4 rows of [latitude, east longitude, half-height, half-width] in degrees")
            if cls != "illustrative":
                fail(where, "drawn clouds at chosen places are illustrative")
        if r.get("kind") == "hexagon":
            hexa = r.get("hexagon") or {}
            if not is_number(hexa.get("lat_deg")) or hexa.get("sides") != 6:
                fail(where, "hexagon needs `lat_deg` and `sides: 6`")
        # The card's one line (spec 0066 requirement 7): every world with an effect has its sentence.
        if world != "earth" and weather_copy and not re.search(rf"^\s+{re.escape(str(world))}: '", weather_copy, re.M):
            fail(where, f"copy/en.js COPY.weather.worlds has no line for `{world}` -- the card must say "
                        f"what is drawn and how much of it is known")
    # Every layer that says `source: weather` is some measured effect's layer.
    owned = {r.get("layer") for r in rows_ if isinstance(r, dict) and r.get("class") == "measured"}
    for l in layers:
        if l.get("source") == WEATHER_SOURCE and l.get("id") not in owned:
            fail(f"layers.yaml[{l.get('id')}]", f"`source: {WEATHER_SOURCE}` but no measured weather.yaml effect "
                                               f"names `layer: {l.get('id')}`, so nothing says where it is fetched from")
    return rows_


OVERLAY_FIELDS = ("id", "world", "title", "what", "layer", "date", "class", "bytes", "legend", "credit", "colormap")
OVERLAY_CLASSES = {"measured", "analysed", "modelled"}
OVERLAY_TITLE_MAX = 40
OVERLAY_LAYER = re.compile(r"^[A-Za-z0-9_.-]+$")


def check_overlays(world_ids: set) -> list:
    """registry/overlays.yaml (2026-10-05): every map that can be laid over a world is somebody's
    data, fetched from somebody's server, in somebody's colours. A row may not reach a screen
    without its measured CORS, its legend, its class and its credit."""
    path = REG / "overlays.yaml"
    if not path.exists():
        return []
    doc = load("overlays.yaml")
    service = doc.get("service") or {}
    where = "overlays.yaml[service]"
    if not str(service.get("wms") or "").startswith("https://"):
        fail(where, f"wms {service.get('wms')!r} must be https: a page served over https cannot fetch it otherwise")
    if not WEATHER_CORS.match(str(service.get("cors") or "")):
        fail(where, f"cors {service.get('cors')!r} must be the header the host really sent, "
                    f"`access-control-allow-origin: <value>`: a host without it cannot be a texture")
    if not STAR_SOURCE.match(str(service.get("source") or "")):
        fail(where, f"source {service.get('source')!r} must be `URL (read YYYY-MM-DD)`")
    for key in ("width", "height", "blank_bytes"):
        v = service.get(key)
        if isinstance(v, bool) or not isinstance(v, int) or v <= 0:
            fail(where, f"{key} {v!r} must be a positive integer")
    credits_path = ROOT / "CREDITS.md"
    credits = credits_path.read_text(encoding="utf-8") if credits_path.exists() else ""
    section = credits_section(credits, 4) or ""
    rows_ = rows(doc, "overlays", "overlays.yaml")
    seen = set()
    for r in rows_:
        if not isinstance(r, dict):
            fail("overlays.yaml", f"a row that is not a mapping: {r!r}")
            continue
        rid = r.get("id")
        where = f"overlays.yaml[{rid}]"
        missing = [k for k in OVERLAY_FIELDS if r.get(k) in (None, "", [])]
        if missing:
            fail(where, f"no {', '.join(missing)} -- a map over the globe says what it is, whose it is and "
                        f"what its colours mean")
            continue
        if rid in seen:
            fail(where, "the id is used twice")
        seen.add(rid)
        if r["world"] not in world_ids:
            fail(where, f"world {r['world']!r} is not a worlds.yaml row")
        if not OVERLAY_LAYER.match(str(r["layer"])):
            fail(where, f"layer {r['layer']!r} is not a GIBS layer id; it goes into a URL as it is")
        if len(str(r["title"])) > OVERLAY_TITLE_MAX:
            fail(where, f"title is {len(str(r['title']))} characters, over {OVERLAY_TITLE_MAX}: it is one "
                        f"line of a menu and of the legend")
        what = str(r["what"])
        if not what.endswith(".") or len(what) > MAX_SENTENCE:
            fail(where, f"`what` must be one sentence of at most {MAX_SENTENCE} characters, ending in a full stop")
        if re.search(r"\b(19|20)\d{2}\b", what):
            fail(where, "`what` names a year: the code prints the date the picture is of")
        for label in ("title", "what", "credit"):
            if "--" in str(r[label]):
                fail(where, f"the {label} has two hyphens for a dash; write a comma")
        if r["class"] not in OVERLAY_CLASSES:
            fail(where, f"class {r['class']!r} must be one of {sorted(OVERLAY_CLASSES)}: the legend says "
                        f"whether the map was measured, filled in or modelled")
        date = r["date"]
        rule = date.get("rule") if isinstance(date, dict) else None
        lag_key = {"daily": "lag_days", "monthly": "lag_months"}.get(rule)
        if lag_key is None:
            fail(where, f"date rule {rule!r} must be `daily` or `monthly`")
        else:
            lag = date.get(lag_key)
            if isinstance(lag, bool) or not isinstance(lag, int) or lag < 1:
                fail(where, f"{lag_key} {lag!r} must be a whole number, 1 or more: the newest picture is "
                            f"never made yet, and asking for it returns an empty one")
            tries = date.get("tries")
            if isinstance(tries, bool) or not isinstance(tries, int) or not 0 <= tries <= 6:
                fail(where, f"tries {tries!r} must be a whole number from 0 to 6")
            extra = sorted(set(date) - {"rule", lag_key, "tries"})
            if extra:
                fail(where, f"date has {extra}, which a `{rule}` rule does not read")
        legend = r["legend"]
        stops = legend.get("stops") if isinstance(legend, dict) else None
        if not (isinstance(stops, list) and 2 <= len(stops) <= 7 and all(HEX.match(str(c)) for c in stops)):
            fail(where, f"legend stops {stops!r} must be two to seven #rrggbb colours, low to high")
        if not isinstance(legend, dict) or any(legend.get(k) in (None, "") for k in ("unit", "low", "high")):
            fail(where, "the legend needs `unit`, `low` and `high`: a ramp with no numbers is decoration")
        b = r["bytes"]
        blank = service.get("blank_bytes") or 0
        if isinstance(b, bool) or not isinstance(b, int) or b <= blank:
            fail(where, f"bytes {b!r} must be the measured size of the picture, over the {blank} an empty "
                        f"one is taken for")
        if not str(r["colormap"]).startswith("https://gibs.earthdata.nasa.gov/colormaps/"):
            fail(where, "colormap must be the GIBS colormap the legend's colours were read from")
        if str(r["credit"]) not in section:
            fail("CREDITS.md", f"overlays.yaml credits `{rid}` as {r['credit']!r}, and CREDITS.md section 4 "
                               f"does not carry that line")
    return rows_


def check_tilesets(world_ids: set) -> list:
    path = REG / "tilesets.yaml"
    if not path.exists():
        return []  # a tree from before spec 0065; the mirror check refuses a mirror without it
    doc = load("tilesets.yaml")
    rows_ = rows(doc, "tilesets", "tilesets.yaml")
    credits_path = ROOT / "CREDITS.md"
    credits = credits_path.read_text(encoding="utf-8") if credits_path.exists() else ""
    section = credits_section(credits, 4) or ""
    seen = set()
    for r in rows_:
        if not isinstance(r, dict):
            fail("tilesets.yaml", f"a row that is not a mapping: {r!r}")
            continue
        rid = r.get("id")
        where = f"tilesets.yaml[{rid}]"
        missing = [k for k in TILESET_FIELDS if r.get(k) in (None, "", [])]
        if missing:
            fail(where, f"no {', '.join(missing)} -- every tile on a visitor's screen is somebody's picture, "
                        f"fetched from somebody's server")
        if rid in seen:
            fail(where, "the id is used twice")
        seen.add(rid)
        if r.get("world") not in world_ids:
            fail(where, f"world {r.get('world')!r} is not a worlds.yaml row")
        url = str(r.get("url") or "")
        if url and not url.startswith("https://"):
            fail(where, f"url {url!r} must be https: a page served over https cannot fetch it otherwise")
        lost = [k for k in ("{z}", "{y}", "{x}") if k not in url]
        if url and lost:
            fail(where, f"url has no {', '.join(lost)}: it is a template, level / row / column")
        if r.get("projection") not in TILESET_PROJECTIONS:
            fail(where, f"projection {r.get('projection')!r} must be one of {sorted(TILESET_PROJECTIONS)}: "
                        f"it is the only one scene/tilemath.js addresses")
        if r.get("mode", "colour") not in ("colour", "detail"):
            fail(where, f"mode {r.get('mode')!r} must be `colour` or `detail`")
        cors = str(r.get("cors") or "")
        if cors and not TILESET_CORS.match(cors):
            fail(where, f"cors {cors!r} must be `Access-Control-Allow-Origin: <value> (measured YYYY-MM-DD)`: "
                        f"the header the host really sent, and the day -- a host without it cannot be a texture")
        src = str(r.get("source") or "")
        if src and not STAR_SOURCE.match(src):
            fail(where, f"source {src!r} must be `URL (read YYYY-MM-DD)`")
        credit = r.get("credit")
        if credit and str(credit) not in section:
            fail("CREDITS.md", f"tilesets.yaml credits `{rid}` as {credit!r}, and CREDITS.md section 4 does not "
                               f"carry that line")
        if credit and " -- " in str(credit):
            fail(where, "the credit prints two hyphens as a dash; write a comma")
        matrix = r.get("matrix")
        if not (isinstance(matrix, list) and len(matrix) == 2 and all(isinstance(v, int) and v > 0 for v in matrix)):
            fail(where, f"matrix {matrix!r} must be [columns, rows] at level 0")
        if not (isinstance(r.get("tile_px"), int) and r.get("tile_px") > 0):
            fail(where, f"tile_px {r.get('tile_px')!r} must be a positive integer")
        levels = r.get("levels")
        ints = [r.get(k) for k in ("min_level", "start_level", "max_level")]
        if not (isinstance(levels, list) and len(levels) == 2 and all(isinstance(v, int) for v in levels)
                and 0 <= levels[0] <= levels[1]):
            fail(where, f"levels {levels!r} must be [first, last], measured against the host")
        elif all(isinstance(v, int) for v in ints):
            lo, start, hi = ints
            if not (levels[0] <= lo <= start <= hi):
                fail(where, f"min_level {lo}, start_level {start}, max_level {hi} must be in that order, from {levels[0]} up")
            if hi > levels[1]:
                fail(where, f"max_level {hi} is past the last level the host serves ({levels[1]}): every tile there is a 404")
        else:
            fail(where, f"min_level, start_level and max_level must be integers, got {ints}")
        grade = r.get("grade")
        if not (isinstance(grade, list) and len(grade) == 3
                and all(isinstance(v, (int, float)) and not isinstance(v, bool) and 0 < v <= 8 for v in grade)):
            fail(where, f"grade {grade!r} must be three gains in (0, 8], measured against the map under the tiles")
        # 2026-10-06: the Earth's second gain, a grid that is not Trek's, and a row's relief pyramid.
        sea = r.get("grade_sea")
        if sea is not None and not (isinstance(sea, list) and len(sea) == 3
                                    and all(isinstance(v, (int, float)) and not isinstance(v, bool) and 0 < v <= 10 for v in sea)):
            fail(where, f"grade_sea {sea!r} must be three gains in (0, 10], measured against the map's water")
        span0 = r.get("level0_span_deg")
        if span0 is not None and not (isinstance(span0, (int, float)) and not isinstance(span0, bool) and 180 <= span0 <= 360):
            fail(where, f"level0_span_deg {span0!r} must be a level-0 tile's side in degrees, 180 to 360")
        if "baked_relief" in r and not isinstance(r.get("baked_relief"), bool):
            fail(where, "baked_relief must be true or false")
        rel = r.get("relief")
        if rel is not None:
            rwhere = f"{where}.relief"
            if not isinstance(rel, dict):
                fail(rwhere, "must be a mapping")
                continue
            lost = [k for k in TILESET_RELIEF_FIELDS if rel.get(k) in (None, "", [])]
            if lost:
                fail(rwhere, f"no {', '.join(lost)} -- a relief tile is somebody's picture too, and its light must be measured")
            rurl = str(rel.get("url") or "")
            if rurl and (not rurl.startswith("https://") or any(k not in rurl for k in ("{z}", "{y}", "{x}"))):
                fail(rwhere, f"url {rurl!r} must be an https template with {{z}}, {{y}} and {{x}}")
            if rel.get("cors") and not TILESET_CORS.match(str(rel.get("cors"))):
                fail(rwhere, f"cors {rel.get('cors')!r} must be `Access-Control-Allow-Origin: <value> (measured YYYY-MM-DD)`")
            if rel.get("source") and not STAR_SOURCE.match(str(rel.get("source"))):
                fail(rwhere, f"source {rel.get('source')!r} must be `URL (read YYYY-MM-DD)`")
            if rel.get("credit") and str(rel.get("credit")) not in section:
                fail("CREDITS.md", f"tilesets.yaml credits the relief of `{rid}` as {rel.get('credit')!r}, and CREDITS.md "
                                   f"section 4 does not carry that line")
            if rel.get("credit") and " -- " in str(rel.get("credit")):
                fail(rwhere, "the credit prints two hyphens as a dash; write a comma")
            rl = rel.get("levels")
            if not (isinstance(rl, list) and len(rl) == 2 and all(isinstance(v, int) for v in rl) and 0 <= rl[0] <= rl[1]):
                fail(rwhere, f"levels {rl!r} must be [first, last], measured against the host")
            elif not (isinstance(rel.get("max_level"), int) and rl[0] <= rel.get("max_level") <= rl[1]):
                fail(rwhere, f"max_level {rel.get('max_level')!r} must be a level the host serves, {rl[0]} to {rl[1]}")
            az = rel.get("light_azimuth_deg")
            if not (isinstance(az, (int, float)) and not isinstance(az, bool) and 0 <= az < 360):
                fail(rwhere, f"light_azimuth_deg {az!r} must be degrees east of north, 0 to 360, measured")
            flat = rel.get("flat")
            if not (isinstance(flat, (int, float)) and not isinstance(flat, bool) and 0.2 <= flat <= 0.95):
                fail(rwhere, f"flat {flat!r} must be the picture's value on level ground, 0.2 to 0.95")
            gain = rel.get("gain")
            if not (isinstance(gain, (int, float)) and not isinstance(gain, bool) and 0 < gain <= 4):
                fail(rwhere, f"gain {gain!r} must be in (0, 4]: the card prints it as the exaggeration")
    return rows_


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


# --- pictures that are not the app's own frames (spec 0043 requirement 6, internal #121) ---------------
PICTURE_SOFTWARE = re.compile(rb"Software\x00space-radar ")


def png_has_own_chunk(data: bytes) -> bool:
    """True when the PNG carries `Software: space-radar ...` in a tEXt chunk before its pixels."""
    at = 8
    while at + 8 <= len(data):
        n = int.from_bytes(data[at:at + 4], "big")
        kind = data[at + 4:at + 8]
        if kind == b"IDAT":
            return False
        if kind == b"tEXt" and PICTURE_SOFTWARE.match(data[at + 8:at + 8 + n]):
            return True
        at += 12 + n
    return False


def check_pictures() -> None:
    """Each site/og PNG says the app made it, or has a registry/pictures.yaml row with a credit that
    CREDITS.md carries; and every row is a file that ships."""
    rows_ = (load("pictures.yaml").get("pictures") or []) if (REG / "pictures.yaml").exists() else []
    credits = (ROOT / "CREDITS.md").read_text(encoding="utf-8") if (ROOT / "CREDITS.md").exists() else ""
    listed: set[str] = set()
    for r in rows_:
        where = f"pictures.yaml[{r.get('file') if isinstance(r, dict) else r!r}]"
        if not isinstance(r, dict) or not r.get("file"):
            fail(where, "a row has no `file:`")
            continue
        listed.add(str(r["file"]))
        for key in ("source", "licence", "credit", "read"):
            if not r.get(key):
                fail(where, f"no `{key}:`; a picture from elsewhere is credited like a model")
        if not (ROOT / "site" / str(r["file"])).exists():
            fail(where, f"site/{r['file']} does not exist")
        if r.get("credit") and str(r["credit"]) not in credits:
            fail(where, "its `credit:` line is not in CREDITS.md")
    og = ROOT / "site" / "og"
    for png in sorted(og.glob("*.png")) if og.is_dir() else []:
        if f"og/{png.name}" not in listed and not png_has_own_chunk(png.read_bytes()):
            fail(f"site/og/{png.name}", "carries no `Software: space-radar` text chunk and has no "
                                        "registry/pictures.yaml row: a picture pasted in by hand. Make it with "
                                        "scripts/shots.mjs or scripts/build_trip_og.py, or credit it there")


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
        # The /sources/ page prints these three beside the row (scripts/seo_pages.py), so a row
        # without them would be a source the page cannot describe honestly.
        if not str(s.get("licence") or "").strip():
            fail(where, "no `licence:` -- the publisher's terms in one honest line (\"no licence stated\" is an answer)")
        if not str(s.get("terms_url") or "").startswith("https://"):
            fail(where, "`terms_url:` must be an https address")
        rec = s.get("terms_recorded")
        if not isinstance(rec, datetime.date) or rec > datetime.date.today():
            fail(where, "`terms_recorded:` must be a date, not in the future (the day the terms went into CREDITS.md)")

    # --- layers ------------------------------------------------------------------
    # What to show folds the rows under `groups:` (spec 0068 task 3). A row with no group, or one
    # the list does not name, would fall out of the popover altogether -- a layer nobody can reach.
    layer_groups = layers_doc.get("groups")
    if not isinstance(layer_groups, list) or not layer_groups or \
            not all(isinstance(g, str) and g for g in layer_groups):
        fail("layers.yaml", "`groups:` must be a non-empty list of group ids (What to show's headings)")
        layer_groups = []
    elif len(set(layer_groups)) != len(layer_groups):
        fail("layers.yaml", "`groups:` names a group twice")
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
        grp = l.get("group")
        if not grp:
            fail(where, f"no `group:` -- What to show lists a layer under one of {layer_groups}")
        elif grp not in layer_groups:
            fail(where, f"group `{grp}` is not one of `groups:` {layer_groups}")
        src = l.get("source")
        if src != BUNDLED_SOURCE and src != WEATHER_SOURCE and src not in source_ids:
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
        # ... or for a layer the page fetches from another host for itself (`source: weather`,
        # 2026-10-07): a request to somebody else's server is the visitor's choice, whatever its size.
        if load_mode == "on-demand" and l.get("source") != WEATHER_SOURCE and not ((l.get("budget") or {}).get("max_items", 0) >= 5000):
            fail(where, "`load: on-demand` is for a catalogue-sized layer (budget.max_items >= 5000) or one the "
                        "page fetches for itself (`source: weather`); a small one loads at boot like everything else")

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
        prom = e.get("prominence")
        if not isinstance(prom, int) or isinstance(prom, bool):
            fail(where, "`prominence` must be an integer a human can edit")
        elif not 1 <= prom <= 5:
            # data/events.js sorts the stream on it and the Next list leads with 1; a 9 is a typo
            # that would sink a type below everything without anybody deciding it (spec 0031).
            fail(where, f"`prominence: {prom}` is outside 1..5 (1 leads)")
        enabled = e.get("enabled", True)
        if not isinstance(enabled, bool):
            fail(where, f"`enabled: {enabled}` must be true or false; the browser skips a row only on false")
        # `computed` is a promise that the browser works the type out itself, with no fetch. Only
        # the types data/events.js has a builder for may make it, or the row validates and the
        # event never appears (spec 0031, 2026-09-23). A disabled row promises nothing yet.
        if src == "computed" and enabled is not False and eid not in COMPUTED_EVENT_TYPES:
            fail(where, f"`source: computed` but the browser computes only "
                        f"{', '.join(sorted(COMPUTED_EVENT_TYPES))}; write the builder in "
                        f"site/js/data/events.js first, or set `enabled: false`")
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
    systems = check_systems()
    generated_systems = check_generated_systems()
    budgets = check_budgets()
    audio = check_audio()
    check_autopilot({l.get("id") for l in layers})
    check_pictures()
    check_textures(textures, world_ids)
    check_tilesets(world_ids)
    overlays = check_overlays(world_ids)
    TOUR_OVERLAYS.update({o.get("id"): o.get("world") for o in overlays if isinstance(o, dict) and o.get("id")})
    weather = check_weather(world_ids, layers)
    ladder = check_stages(world_ids)
    check_system_stage_rows(ladder)
    lod_rules = check_lod()
    dso_hand = check_dso_hand()
    nebulae = check_nebulae()
    ladder_rungs = check_ladder(world_ids, layer_ids)
    exotics = check_exotics()
    TOUR_PORTRAITS.update(f"exotic-{r.get('id')}" for r in exotics
                          if isinstance(r, dict) and r.get('id') and isinstance(r.get('image'), dict))
    famous_stars = check_stars_notable(exotics)
    aliases = check_aliases()
    check_links()
    check_sky_events(world_ids, {str(x.get("id")) for x in (load("tours.yaml").get("tours") or []) if isinstance(x, dict)})
    check_oldest_notes()
    colorkeys = check_colorkeys()
    TOUR_STAGES.update(world_ids)
    TOUR_STAGES.update(st.get('id') for st in ladder if isinstance(st, dict) and st.get('id'))
    TOUR_UNSQUEEZED_STAGES.update(st.get('id') for st in ladder if isinstance(st, dict) and st.get('id'))
    TOUR_WORLD_PARENTS.update({w.get('id'): str(w.get('parent') or '') for w in worlds})
    TOUR_SGP4_LAYERS.update(l.get("id") for l in layers if l.get("propagator") == "sgp4")
    TOUR_EVENT_TYPES.update(e.get("id") for e in events if isinstance(e, dict) and e.get("id"))
    TOUR_CITY_NAMES.update(load_city_names())
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

        # 8b. where the first stage ends, and what a booster that flies back carries (public #427)
        dimension(where, r, "stage1_len_m", "stage1_len_m", len_ceiling)
        rec = r.get("recovery")
        if rec is not None:
            if not isinstance(rec, dict) or not rec or set(rec) - {"legs", "grid_fins"}:
                fail(where, f"recovery {rec!r} must be a map of `legs` and/or `grid_fins`")
            else:
                for key, n in rec.items():
                    if not isinstance(n, int) or isinstance(n, bool) or not 1 <= n <= 8:
                        fail(where, f"recovery.{key} is {n!r}; a count from 1 to 8")

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
        f"registry ok: {len(worlds)} worlds, "
        f"{sum(1 for st in ladder if isinstance(st, dict) and st.get('kind') != 'system')} ladder rungs, "
        f"{len(systems)} star system(s) typed and {len(generated_systems)} generated, {len(lod_rules)} lod rules, {len(weather)} weather effects, "
        f"{len(dso_hand)} hand-placed deep-sky objects, {len(nebulae)} nebula pictures, {len(exotics)} exotics, {len(famous_stars)} famous stars, {len(ladder_rungs)} breadcrumb rungs, {len(aliases)} aliases, {len(colorkeys)} colour keys, "
        f"{len(sources)} sources, {len(layers)} layers, "
        f"{len(events)} event types, {len(models)} models, {len(real_models)} real models, "
        f"{len(marks)} third-party marks, {len(sites)} sites, "
        f"{len(terms)} glossary terms, {len(showers)} showers, {len(audio)} sounds, {len(budgets)} budgets, "
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
