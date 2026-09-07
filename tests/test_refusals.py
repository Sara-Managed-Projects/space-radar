#!/usr/bin/env python3
"""Break each registry rule on purpose and assert the validator says so.

Sara's rule, spec 0018's reason for existing: a guard that *reports* wrongly is
indistinguishable from one that *behaves* wrongly and is harder to notice. So the guard is
tested by breaking the thing it guards, not by reading it.

Every case below must fail the validator AND name the file and the row, because a refusal
that does not say where is a refusal somebody will switch off.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CASES: list[tuple[str, str, str, str]] = [
    # (name, file, find, replace)
    ("layer names a source that does not exist",
     "layers.yaml", "source: celestrak-stations", "source: celestrak-stationz"),
    ("layer names a propagator that does not exist",
     "layers.yaml", "propagator: sgp4", "propagator: magic"),
    ("layer's frame names a world that does not exist",
     "layers.yaml", "frame: earth-inertial", "frame: pluto-inertial"),
    ("layer's style names a model with no row",
     "layers.yaml", "model: station-generic", "model: station-deluxe"),
    ("world's parent does not exist",
     "worlds.yaml", "parent: sun", "parent: nebula"),
    ("source has no attribution line",
     "sources.yaml", '    attribution: "Orbital data: CelesTrak (T. S. Kelso)"\n', ""),
    ("source's cadence is not a duration",
     "sources.yaml", "cadence: 3h", "cadence: sometimes"),
    ("source's auth is neither none nor a secret",
     "sources.yaml", "auth: none", "auth: apikey"),
    ("model has no licence",
     "models.yaml", 'licence: "MIT (this project)", budget_tris: 1500', "budget_tris: 1500"),
    ("event type has no lead times",
     "events.yaml", "    lead_times: [same-day, 1d, 1w, on-confirm]\n", ""),
    ("site sits on a world that does not exist",
     "sites.yaml", "world: moon", "world: europa"),
    ("shower's peak is not a date",
     "showers.yaml", 'peak: "08-12"', 'peak: "August"'),

    # --- registry/rockets.yaml ---------------------------------------------------------
    # A rocket row decides what a launch is DRAWN as and the card repeats the row's own claim
    # about itself, so every refusal here is one refusal wearing different clothes: a row must
    # not be able to say something it cannot support, and it must not be able to draw nothing.
    ("two rocket rows share an id",
     "rockets.yaml", "  - id: falcon-heavy\n", "  - id: falcon-9\n"),
    ("a rocket row with no display name the card could print",
     "rockets.yaml", '    display: "Electron"\n', ""),
    ("a rocket row nothing can match",
     "rockets.yaml", '    match: {full_name: ["Electron"]}\n', ""),
    ("a rocket row matches on a key the chain does not walk",
     "rockets.yaml", '    match: {full_name: ["Electron"]}',
     '    match: {nickname: ["Electron"]}'),
    ("two rocket rows claim the same match string, so the second never draws",
     "rockets.yaml", '    match: {full_name: ["Vulcan VC4S"]}',
     '    match: {full_name: ["Vulcan VC6L"]}'),
    ("a rocket row keyed on a string the feed has never returned",
     "rockets.yaml", '    match: {full_name: ["Electron"]}',
     '    match: {full_name: ["Energia"]}'),
    ("a rocket height in feet, or a booster length written into height_m",
     "rockets.yaml", "    height_m: 18.0\n", "    height_m: 590.0\n"),
    ("a rocket row with no core diameter",
     "rockets.yaml", "    core_dia_m: 1.2\n", ""),
    ("a booster shape the builder cannot draw",
     "rockets.yaml", "{shape: liquid_conical, count: 4, dia_m: 2.68, len_m: 19.6}",
     "{shape: solid_huge, count: 4, dia_m: 2.68, len_m: 19.6}"),
    ("boosters counted on a vehicle that has none",
     "rockets.yaml", "dia_m: 1.2, len_m: 2.5}\n    boosters: {shape: none, count: 0}",
     "dia_m: 1.2, len_m: 2.5}\n    boosters: {shape: none, count: 4}"),
    ("a booster shape with no diameter, which is the whole silhouette",
     "rockets.yaml", "{shape: solid_fat, count: 4, dia_m: 3.4, len_m: 22.0}",
     "{shape: solid_fat, count: 4, len_m: 22.0}"),
    ("something on top that is not a fairing, a capsule, a ship or nothing",
     "rockets.yaml", "    top: {kind: integrated_ship}", "    top: {kind: nosecone}"),
    ("a body taper the builder cannot draw",
     "rockets.yaml", "    taper: stepped\n", "    taper: pointy\n"),
    ("a stepped body with no step in it",
     "rockets.yaml", "    sections: [{dia_m: 3.5}, {dia_m: 2.6}]\n", ""),
    ("a hammerhead that does not say how much wider the fairing is",
     "rockets.yaml",
     "    taper: hammerhead\n    top: {kind: fairing, dia_m: 4.2}\n    boosters: {shape: none, count: 0}\n    engines: {count: 7, pattern: unknown}\n",
     "    taper: hammerhead\n    top: {kind: fairing}\n    boosters: {shape: none, count: 0}\n    engines: {count: 7, pattern: unknown}\n"),
    ("an engine arrangement the builder cannot draw",
     "rockets.yaml", "    engines: {count: 27, pattern: octaweb}",
     "    engines: {count: 27, pattern: swirl}"),
    ("a first stage with no engines on it",
     "rockets.yaml", "    engines: {count: 33, pattern: dense_ring}",
     "    engines: {count: 0, pattern: dense_ring}"),
    ("a row that will not say whether it draws the vehicle or its family",
     "rockets.yaml", "    stands_for: family\n    height_m: 46.3\n",
     "    stands_for: probably\n    height_m: 46.3\n"),
    ("a shape with no evidence behind it",
     "rockets.yaml",
     '    source: "Wikipedia Rocket Lab Electron and Rutherford, reporting the payload user\'s guide (the PUG itself returns 403): 18 m, 1.2 m, \'eight engines surrounding a central ninth\'"\n',
     ""),
    ("a livery with a colour but no class",
     "rockets.yaml", '    livery: {body: "#C6CBD1", class: measured}\n',
     '    livery: {body: "#C6CBD1"}\n'),
    ("a livery that is neither a map of zones nor the literal `unknown`",
     "rockets.yaml", '    livery: {body: "#9AA3AD", nose: "#EEF2F7", tail: "#D2743A", class: measured}\n',
     "    livery: greenish\n"),
    ("the feed evidence has no date on it",
     "rockets.yaml", "observed_on: 2026-09-07", "# observed_on: removed"),
]


def main() -> int:
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        pristine = Path(tmp) / "pristine"
        shutil.copytree(ROOT / "registry", pristine)

        for name, filename, find, replace in CASES:
            work = Path(tmp) / "work"
            if work.exists():
                shutil.rmtree(work)
            work.mkdir()
            shutil.copytree(pristine, work / "registry")
            shutil.copytree(ROOT / "scripts", work / "scripts")

            path = work / "registry" / filename
            text = path.read_text(encoding="utf-8")
            if find not in text:
                print(f"BROKEN TEST: {name!r} -- the string it mutates is not in {filename}")
                failures += 1
                continue
            path.write_text(text.replace(find, replace, 1), encoding="utf-8")

            result = subprocess.run(
                [sys.executable, "scripts/check_registry.py"],
                cwd=work, capture_output=True, text=True,
            )
            out = result.stdout + result.stderr
            refused = result.returncode != 0
            names_the_file = filename in out
            if refused and names_the_file:
                print(f"  refused: {name}")
            else:
                why = "was accepted" if not refused else f"refused without naming {filename}"
                print(f"  ** {name}: {why}")
                failures += 1

    if failures:
        print(f"\n{failures} guard(s) do not do what they claim")
        return 1
    print(f"\nall {len(CASES)} refusals fire and each names its file")
    return 0


if __name__ == "__main__":
    sys.exit(main())
