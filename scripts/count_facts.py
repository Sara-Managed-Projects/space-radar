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


def source_counts() -> dict:
    """HOW MANY SOURCES: the one place the number is made (the review of 2026-10-12 read "24 public
    sources" on About and Press and "28" on Sources, two builds of one count that also took in the
    rows that are switched off).

    Two numbers with two names, from registry/sources.yaml:

        sources   the distinct `publisher:` values among the ENABLED rows: who a visitor would
                  recognise (CelesTrak, NASA JPL, NOAA SWPC and so on)
        feeds     the enabled rows themselves: each address that is read

    A row with `enabled: false` is counted in neither. It is in `off`, and /sources/ lists it as not
    in use, so that the reason it was switched off stays readable.

    Every page that states a number reads this: /about/ and /sources/ (scripts/seo_pages.py), the
    press kit (scripts/build_press.py) and `facts()` below. tests/test_source_counts.py fails when
    a template or a sentence carries a number of its own. The app's status line ("N read this
    visit") is NOT this number and does not claim to be: it is how many answered this visit.
    """
    rows = _yaml("sources.yaml")["sources"]
    enabled = [r for r in rows if r.get("enabled", True) is not False]
    by_publisher: dict[str, int] = {}
    for r in enabled:
        by_publisher[r["publisher"]] = by_publisher.get(r["publisher"], 0) + 1
    return {
        "sources": len(by_publisher),
        "feeds": len(enabled),
        "off": len(rows) - len(enabled),
        "publishers": by_publisher,          # name -> its feeds, in the registry's order
    }


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
        "sources": source_counts()["sources"],                      # registry/sources.yaml: publishers of the enabled rows
        "feeds": source_counts()["feeds"],                          # registry/sources.yaml: the enabled rows
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
