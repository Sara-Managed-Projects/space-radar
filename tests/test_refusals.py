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
