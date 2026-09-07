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
PROPAGATORS = {"sgp4", "kepler", "sampled", "body", "fixed", "ascent"}
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
# How an object's own position came to be known. `unsurveyed` is a real answer and the only one
# that pairs with `precision_m: unknown`.
ODDITY_HOW = {"surveyed", "photogrammetric", "orbital_imaging", "unsurveyed", "map_reference"}
# The reserved literal, exactly as `livery: unknown` is in rockets.yaml. It means nobody has ever
# measured THIS object's own position -- not "a big number we would rather not write".
PRECISION_UNKNOWN = "unknown"
# Shapes a builder can draw. `generic` is ALWAYS legal: it is what makes the eleventh object a row
# rather than a blocked pull request, and the card says "we have no shape for this one" out loud.
# Adding a real one is two edits, this set and site/js/scene/models.js -- and today there are no
# real ones at all, because the geometry is the next pull request and a row may not claim a shape
# that does not exist.
ODDITY_PLACEHOLDER_SHAPES = {"generic"}
ODDITY_SHAPES = set() | ODDITY_PLACEHOLDER_SHAPES
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
            if obj.get("precision_m") == PRECISION_UNKNOWN and how != "unsurveyed":
                fail(where, f"object.precision_m is `{PRECISION_UNKNOWN}` but how is {how!r}. "
                            f"`{PRECISION_UNKNOWN}` means nobody measured it, which is `unsurveyed`")
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
        if not s.get("parser"):
            fail(where, "no parser")
        auth = s.get("auth")
        if auth is None:
            fail(where, "no `auth:` (write `none` rather than leaving it out)")
        elif auth != "none" and not str(auth).startswith("secret:"):
            fail(where, f"auth {auth!r} must be `none` or `secret:NAME`")
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
        f"registry ok: {len(worlds)} worlds, {len(sources)} sources, {len(layers)} layers, "
        f"{len(events)} event types, {len(models)} models, {len(real_models)} real models, {len(sites)} sites, "
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
