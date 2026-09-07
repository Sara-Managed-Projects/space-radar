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
        if src not in source_ids:
            fail(where, f"source `{src}` has no sources.yaml row")
        prop = l.get("propagator")
        if prop not in PROPAGATORS:
            fail(where, f"propagator {prop!r} is not one of {sorted(PROPAGATORS)}")
        frame = l.get("frame") or ""
        if "-" not in frame:
            fail(where, f"frame {frame!r} must be `<world>-inertial` or `<world>-fixed`")
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
        f"{len(terms)} glossary terms, {len(showers)} showers, {len(rockets)} rockets "
        f"({len(observed)} feed values observed {rockets_doc.get('observed_on')}; "
        # Printed, not asserted. Three files quote this number in prose and it was wrong by 20;
        # a figure a human copies out of a comment drifts, and a figure the check prints does not.
        f"{sum(1 for r in rockets if r.get('livery') == 'unknown')} of {len(rockets)} "
        f"with no sourced livery)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
