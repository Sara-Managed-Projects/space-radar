#!/usr/bin/env python3
"""Mirror registry/interiors.yaml into site/js/data/interiors.js, and refuse a stale or broken one.

Run:  python3 scripts/gen_interiors_js.py           # check the rules, then write it (and data/interiorids.js)
      python3 scripts/gen_interiors_js.py --check   # write nothing; exit 1 if stale or broken

THE RULES (forge #144; the YAML's header says why each exists). Every world is a registry/worlds.yaml
row with `radius_km` within 0.2 % of the radius the scene draws it at; its layers run top down with
no gap and no overlap, from 0 to `radius_km`; every layer has a known `kind`, one of the three
honesty words, a source, and [top, bottom] pairs of pressure, temperature and density that are
positive (pressure may be 0 at the surface) and that do not fall going down. A row that breaks one
is refused here, before a phone ever draws a cutaway with a hole in it.
"""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import ROOT, Mirror, pick  # noqa: E402

WORLD_FIELDS = ("id", "radius_km", "model", "source", "values", "layers")
LAYER_FIELDS = ("id", "kind", "top_km", "bottom_km", "cls", "source", "p_gpa", "t_k", "rho")
CLASSES = {"measured", "modelled", "inferred"}
# The kinds ui/cutaway.js colours and copy/en.later.js names (COPY.cutaway.kinds); a new kind is a row there too.
KINDS = {
    "crust", "mantle", "upper-mantle", "lower-mantle", "outer-core", "inner-core", "liquid-core",
    "iron-core", "molten-silicate", "partial-melt", "ice-shell", "ocean", "hp-ice", "rock-mantle",
    "rock-core", "hydrated-core", "molecular", "metallic", "dilute-core", "ice-mantle",
    "convective", "radiative", "solar-core",
}
TOLERANCE = 0.002


def problems(doc: dict) -> list[str]:
    """Every rule the file breaks, as sentences. Empty when it is sound."""
    out: list[str] = []
    radii = {}
    worlds_doc = yaml.safe_load((ROOT / "registry" / "worlds.yaml").read_text(encoding="utf-8")) or {}
    for w in worlds_doc.get("worlds") or []:
        if isinstance(w, dict) and w.get("id"):
            radii[w["id"]] = float(w.get("radius_km") or 0)
    seen = set()
    for w in doc.get("worlds") or []:
        wid = w.get("id")
        if wid in seen:
            out.append(f"{wid}: listed twice")
        seen.add(wid)
        if wid not in radii:
            out.append(f"{wid}: not a registry/worlds.yaml row")
            continue
        r = float(w.get("radius_km") or 0)
        if not r or abs(r / radii[wid] - 1) > TOLERANCE:
            out.append(f"{wid}: radius_km {r} is not the drawn radius {radii[wid]}")
        src = w.get("source") or {}
        if not src.get("name") or not str(src.get("url", "")).startswith("https://"):
            out.append(f"{wid}: needs source.name and an https source.url")
        vals = w.get("values") or {}
        for q in ("pressure", "density", "temperature"):
            if vals.get(q) not in CLASSES:
                out.append(f"{wid}: values.{q} must be one of {sorted(CLASSES)}")
        depth = 0.0
        layers = w.get("layers") or []
        if not layers:
            out.append(f"{wid}: no layers")
        for layer in layers:
            lid = f"{wid}/{layer.get('id')}"
            top, bottom = float(layer.get("top_km", -1)), float(layer.get("bottom_km", -1))
            if abs(top - depth) > 1e-6:
                out.append(f"{lid}: starts at {top} km, where the layer above ends at {depth} km")
            if not bottom > top:
                out.append(f"{lid}: bottom_km {bottom} is not below top_km {top}")
            depth = bottom
            if layer.get("kind") not in KINDS:
                out.append(f"{lid}: kind {layer.get('kind')!r} is not one ui/cutaway.js draws")
            if layer.get("cls") not in CLASSES:
                out.append(f"{lid}: cls must be one of {sorted(CLASSES)}")
            if not str(layer.get("source") or "").strip():
                out.append(f"{lid}: no source")
            for key in ("p_gpa", "t_k", "rho"):
                pair = layer.get(key)
                if not (isinstance(pair, list) and len(pair) == 2 and all(isinstance(v, (int, float)) for v in pair)):
                    out.append(f"{lid}: {key} must be [top, bottom]")
                    continue
                lo = 0 if key == "p_gpa" else 1e-12
                if pair[0] < lo or pair[1] < pair[0]:
                    out.append(f"{lid}: {key} {pair} must be positive and must not fall going down")
        if layers and abs(depth - r) > 1e-6:
            out.append(f"{wid}: the last layer ends at {depth} km, not at the centre ({r} km)")
    return out


def render(doc: dict) -> list:
    found = problems(doc)
    if found:
        print("registry/interiors.yaml is refused:\n  " + "\n  ".join(found), file=sys.stderr)
        raise SystemExit(1)
    rows = []
    for w in doc.get("worlds") or []:
        row = pick(w, WORLD_FIELDS)
        row["layers"] = [pick(layer, LAYER_FIELDS) for layer in w.get("layers") or []]
        rows.append(row)
    return [("Each world the cutaway opens: its layers top down, depths in km, [top, bottom] values.", "INTERIORS", rows)]


HEADER = """// GENERATED from registry/interiors.yaml by scripts/gen_interiors_js.py. Do not edit.
//
// `python3 scripts/gen_interiors_js.py --check` fails CI if this file and the YAML disagree, or if the
// YAML breaks its rules (layers without gaps from the surface to the centre, a source and an honesty
// word on each). Fetched with ui/cutaway.js, never at boot.
"""

MIRROR = Mirror(source="registry/interiors.yaml", target="site/js/data/interiors.js", header=HEADER, render=render, what="interiors.js", indent=0)

IDS_HEADER = """// GENERATED from registry/interiors.yaml by scripts/gen_interiors_js.py. Do not edit.
//
// Only the ids: the card reads this to offer Look inside, and the layers themselves
// (data/interiors.js) come with ui/cutaway.js when the button is pressed.
"""


def render_ids(doc: dict) -> list:
    return [("The worlds the cutaway can open.", "INTERIOR_IDS", [w.get("id") for w in doc.get("worlds") or []])]


IDS = Mirror(source="registry/interiors.yaml", target="site/js/data/interiorids.js", header=IDS_HEADER, render=render_ids, what="interiorids.js", indent=0)

if __name__ == "__main__":
    sys.exit(MIRROR.main() or IDS.main())
