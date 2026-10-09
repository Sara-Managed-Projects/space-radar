#!/usr/bin/env python3
"""The numbers the README and the press kit quote, counted from the repository (never typed).

    python3 scripts/count_facts.py            # print them
    python3 scripts/count_facts.py --json     # as JSON

A number in a document is copied from here on the day it is written, and
tests/test_readme_facts.py fails when the README says a number this script does not. Each count
names where it comes from, so a reader can recount it by hand.
"""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


def _yaml(name: str) -> dict:
    return yaml.safe_load((ROOT / "registry" / name).read_text(encoding="utf-8")) or {}


def facts() -> dict[str, int]:
    tours = _yaml("tours.yaml")["tours"]
    systems = _yaml("systems.yaml")["systems"]
    generated = _yaml("systems-generated.yaml")
    generated = generated.get("systems", generated)
    with (ROOT / "site" / "data" / "stars3d.bin").open("rb") as f:
        magic, _version, count, _unplaced = struct.unpack("<4sIII", f.read(16))
    assert magic == b"SR3D", "stars3d.bin has a header this script does not know"
    worlds = _yaml("worlds.yaml")["worlds"]
    moons = [w for w in worlds if w.get("parent") and w["parent"] != "sun"]
    sites = _yaml("sites.yaml")["sites"]
    layers = [r for r in _yaml("layers.yaml")["layers"] if r.get("enabled", True) is not False]
    return {
        "trips": len(tours),                                        # registry/tours.yaml
        "stops": sum(len(t["stops"]) for t in tours),               # the stops of those trips
        "star_systems": len(systems) + len(generated),              # registry/systems.yaml + systems-generated.yaml
        "stars": count,                                             # site/data/stars3d.bin header
        "moons": len(moons),                                        # registry/worlds.yaml
        "moons_with_maps": sum(1 for m in moons if (m.get("look") or {}).get("textures")),
        "nebula_pictures": len(_yaml("nebulae.yaml")["pictures"]),  # registry/nebulae.yaml
        "moon_sites": sum(1 for x in sites if x["world"] == "moon" and x["class"] == "surface"),   # registry/sites.yaml
        "mars_sites": sum(1 for x in sites if x["world"] == "mars" and x["class"] == "surface"),
        "layers": len(layers),                                      # registry/layers.yaml
        "sources": len(_yaml("sources.yaml")["sources"]),           # registry/sources.yaml
        "real_models": len(_yaml("models.yaml")["real_models"]),    # registry/models.yaml
        "test_files": len(list((ROOT / "tests").glob("test_*"))),   # tests/test_*
    }


def spaced(n: int) -> str:
    """12 345 the way the README writes it (a plain space groups thousands)."""
    return f"{n:,}".replace(",", " ")


if __name__ == "__main__":
    data = facts()
    if "--json" in sys.argv[1:]:
        print(json.dumps(data, indent=1))
    else:
        for k, v in data.items():
            print(f"{k:16} {spaced(v)}")
