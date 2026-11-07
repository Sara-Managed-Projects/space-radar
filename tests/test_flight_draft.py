#!/usr/bin/env python3
"""tests/test_flight_draft.py -- the flight editor's "Save trip draft" is a trip scripts/check_registry.py accepts
(forge #155, ui/flightpath.js tripDraft).

    python3 tests/test_flight_draft.py

A three-key path (the Earth, the station, Saturn on its own stage at 10 h/s, at a named instant) is turned into a
draft by node, exactly as the editor makes it, appended to a copy of registry/tours.yaml in a work tree built the
way tests/test_refusals.py builds one for its tour cases, and the whole validator is run on that tree. The draft's
TODO words are left as they are: what is held is that the SHAPE is a trip's (target keys, stage, needs_layer,
ease, time, rate, card), so a person finishing it writes words, not YAML. A second run without the draft is the
control: the tree itself must be accepted, or the first run proves nothing.
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tests"))
import test_refusals as tr  # noqa: E402  (the work-tree helpers; its checks run only under __main__)

NODE = r"""
import { pathToFileURL } from 'node:url';
const P = await import(pathToFileURL(process.argv[1] + '/site/js/ui/flightpath.js').href);
const cam = (a, p, d) => ({ azimuthDeg: a, polarDeg: p, distanceKm: d });
const keys = [
  P.makeKey({ at: 'earth', stage: 'earth', cam: cam(20, 70, 30000), rate: 1 }),
  P.makeKey({ at: 'sat-25544', stage: 'earth', cam: cam(40, 80, 3000), rate: 60, ease: 'constant', ms: 4000 }),
  P.makeKey({ at: 'saturn', stage: 'saturn', cam: cam(30, 75, 400000), t: Date.UTC(2027, 0, 1, 12), rate: 36000, ease: 'smooth', ms: 6000 }),
];
process.stdout.write(P.tripDraft({ keys }, { worlds: ['earth', 'saturn'], names: { 'sat-25544': 'ISS (ZARYA)' },
  layers: { 'sat-25544': 'stations' }, id: 'draft-flight-test', today: '2026-11-07' }));
"""


def tree(work: Path) -> None:
    """The tree tests/test_refusals.py check_tour_refusals() validates, built with its own helpers."""
    shutil.copytree(ROOT / "registry", work / "registry", copy_function=tr.link)
    shutil.copytree(ROOT / "scripts", work / "scripts", copy_function=tr.link, ignore=shutil.ignore_patterns("__pycache__"))
    tr.media_into(work)
    tr.link(ROOT / "CREDITS.md", work / "CREDITS.md")
    (work / "site" / "js" / "copy").mkdir(parents=True, exist_ok=True)
    tr.link(ROOT / "site" / "js" / "copy" / "en.js", work / "site" / "js" / "copy" / "en.js")
    shutil.copytree(ROOT / "harvest", work / "harvest", ignore=shutil.ignore_patterns("__pycache__"), copy_function=tr.link)
    tr.textures_into(work)
    # A file registry/asset_sources.yaml pins by its hash is linked, not touched: an empty stand-in fails the pin.
    pinned = set(re.findall(r"file: (site/[^,}\s]+)", (ROOT / "registry" / "asset_sources.yaml").read_text(encoding="utf-8")))
    for src in ("site/models", "site/data"):
        d = work / src
        d.mkdir(parents=True, exist_ok=True)
        for f in (ROOT / src).glob("*"):
            if f.is_file():
                if f"{src}/{f.name}" in pinned:
                    tr.link(f, d / f.name)
                else:
                    (d / f.name).touch()


def main() -> int:
    if "--help" in sys.argv or "-h" in sys.argv:
        print(__doc__)
        return 0
    draft = subprocess.run(["node", "--input-type=module", "-e", NODE, str(ROOT)], capture_output=True, text=True)
    if draft.returncode != 0 or "- id: draft-flight-test" not in draft.stdout:
        print("test_flight_draft: node could not make the draft\n" + draft.stderr, file=sys.stderr)
        return 1
    problems = []
    for want in ("target: {world: earth}", "target: {record: sat-25544}", "needs_layer: stations", "target: {world: saturn}",
                 "stage: saturn", "ease: linear", "ease: inout", 'time: "2027-01-01T12:00:00Z"', "rate: 36000", "rate: 60"):
        if want not in draft.stdout:
            problems.append(f"the draft has no {want!r}")
    with tempfile.TemporaryDirectory() as tmp:
        for name, add in (("the tree as it stands", ""), ("the tree with the draft", draft.stdout)):
            work = Path(tmp) / name.replace(" ", "-")
            work.mkdir()
            tree(work)
            if add:
                path = work / "registry" / "tours.yaml"
                tr.mutate(path, path.read_text(encoding="utf-8").rstrip("\n") + "\n\n" + add)
            run = tr.validator(work)
            if run.returncode != 0:
                out = (run.stdout + run.stderr).strip().splitlines()
                problems.append(f"{name}: scripts/check_registry.py refused it")
                problems.extend("    " + line for line in out if "tours.yaml" in line or "draft" in line)
                if name.endswith("stands"):
                    break
    if problems:
        print(f"test_flight_draft: {len(problems)} problem(s)", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1
    print("test_flight_draft: the flight editor's draft trip is accepted by scripts/check_registry.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
