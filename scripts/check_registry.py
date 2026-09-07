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

    worlds = rows(worlds_doc, "worlds", "worlds.yaml")
    sources = rows(sources_doc, "sources", "sources.yaml")
    layers = rows(layers_doc, "layers", "layers.yaml")
    events = rows(events_doc, "events", "events.yaml")
    models = rows(models_doc, "models", "models.yaml")
    textures = rows(models_doc, "textures", "models.yaml")
    sites = rows(sites_doc, "sites", "sites.yaml")
    terms = rows(glossary_doc, "terms", "glossary.yaml")
    showers = rows(showers_doc, "showers", "showers.yaml")

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
        f"{len(events)} event types, {len(models)} models, {len(sites)} sites, "
        f"{len(terms)} glossary terms, {len(showers)} showers"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
