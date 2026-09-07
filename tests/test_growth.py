#!/usr/bin/env python3
"""The growth test: adding a world is a registry row, or the architecture regressed.

Spec 0002 requirement 3 and its acceptance test. This applies `tests/fixtures/europa.yaml`
into the registry, asserts the validator still passes, and asserts that making it work
required NO file outside `registry/` and the generated mirror.

The headline assertion used to be a tautology. It printed "files changed outside registry/:\nnone (the fixture has no other section)" and then checked that the fixture's own key names were
in a hardcoded set -- a set the fixture author controls. It never wrote a file, so it would
have gone on printing PASS if adding a rocket had come to need three hand-edited JS files. It
ALREADY needed one: `site/js/data/rockets.js` is generated from registry/rockets.yaml, and CI
fails until it is regenerated and committed. So this now DOES the growth in a temp tree and
diffs the tree, and the mirror is named as the one allowed exception rather than hidden by a
check that never looked.

If this fails, the fix is the architecture, not the test -- whatever feature caused it.
Run: python3 tests/test_growth.py
"""

from __future__ import annotations

import copy
import hashlib
import subprocess
import sys
import shutil
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
ALLOWED_PREFIXES = ("registry/", "harvest/lists/", "harvest/queries/")
# The one file outside registry/ that adding a rocket is allowed to change, because a browser
# cannot parse YAML and nobody hand-keeps fifty rows. It is GENERATED -- `scripts/
# gen_rockets_js.py` writes it and CI refuses a stale one -- so it is a build output and not a
# second place a human edits. Anything else appearing here is the regression this test is for.
# TWO of them now. registry/oddities.yaml is mirrored the same way and for the same reason, and
# `gen_oddities_js.py --check` fails CI until it is regenerated and committed. Both are build
# outputs, not second places a human edits.
GENERATED = "site/js/data/rockets.js"
GENERATED_ODDITIES = "site/js/data/oddities.js"
MIRRORS = ((GENERATED, "scripts/gen_rockets_js.py", "rockets"),
           (GENERATED_ODDITIES, "scripts/gen_oddities_js.py", "oddities"))


def snapshot(root: Path) -> dict[str, str]:
    """Every file in the tree, by repo-relative path, hashed."""
    out = {}
    for f in sorted(root.rglob("*")):
        if f.is_file() and "__pycache__" not in f.parts:
            out[str(f.relative_to(root))] = hashlib.sha256(f.read_bytes()).hexdigest()
    return out


def apply_fixture(registry: Path, fixture: dict) -> None:
    """Merge the fixture's rows into the registry files, by section."""
    targets = {
        "worlds": ("worlds.yaml", "worlds"),
        "sources": ("sources.yaml", "sources"),
        "layers": ("layers.yaml", "layers"),
        "sites": ("sites.yaml", "sites"),
        "textures": ("models.yaml", "textures"),
        "models": ("models.yaml", "models"),
        # Spec: adding a launch vehicle is a row here, plus the feed evidence that it can ever
        # fire. Nothing under site/js/ -- the builder composes from these fields.
        "rockets": ("rockets.yaml", "rockets"),
        "observed": ("rockets.yaml", "observed"),
        # Spec: adding an odd thing is a row plus the generated mirror. `shape: {build: generic}`
        # is always legal, so a row can ship before anybody writes it a shape.
        "oddities": ("oddities.yaml", "oddities"),
    }
    for section, rows in fixture.items():
        filename, key = targets[section]
        path = registry / filename
        doc = yaml.safe_load(path.read_text(encoding="utf-8"))
        doc[key] = list(doc.get(key) or []) + copy.deepcopy(rows)
        path.write_text(yaml.safe_dump(doc, sort_keys=False), encoding="utf-8")


def main() -> int:
    fixture = yaml.safe_load((ROOT / "tests/fixtures/europa.yaml").read_text(encoding="utf-8"))

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp) / "repo"
        shutil.copytree(ROOT / "registry", work / "registry")
        shutil.copytree(ROOT / "scripts", work / "scripts")
        # The validator checks that every asset a registry row names is really in the tree, so the
        # tree it validates has to contain them. Copying the names rather than the bytes keeps this
        # test fast -- it is asking whether the REGISTRY grows cleanly, not whether a GLB is valid.
        for src in ("site/models", "site/textures", "site/data"):
            d = work / src
            d.mkdir(parents=True, exist_ok=True)
            for f in (ROOT / src).glob("*"):
                if f.is_file():
                    (d / f.name).touch()
        # Real bytes, both of them: the validator cross-checks CREDITS.md against
        # registry/models.yaml, and the mirror check is a byte comparison.
        shutil.copy2(ROOT / "CREDITS.md", work / "CREDITS.md")
        (work / "site/js/data").mkdir(parents=True, exist_ok=True)
        for mirror, _, _ in MIRRORS:
            shutil.copy2(ROOT / mirror, work / mirror)

        before = snapshot(work)
        apply_fixture(work / "registry", fixture)

        result = subprocess.run(
            [sys.executable, "scripts/check_registry.py"],
            cwd=work, capture_output=True, text=True,
        )
        if result.returncode != 0:
            print("FAIL: the registry refuses a legitimate new world.\n")
            print(result.stdout or result.stderr)
            return 1

        # A mirror is a real dependency, so it must NOTICE. A --check that passed here would mean
        # the browser was still loading the old rows and the new one drew as nothing. Both mirrors
        # are asserted, because a growth claim checked against only one of them is a growth claim
        # that goes on printing PASS after the second one stops working.
        for mirror, generator, section in MIRRORS:
            stale = subprocess.run(
                [sys.executable, generator, "--check"], cwd=work, capture_output=True, text=True,
            )
            if stale.returncode == 0:
                print(f"FAIL: {section} rows were added and {mirror} still says it is current. "
                      f"The mirror check is not checking anything.")
                return 1
            wrote = subprocess.run(
                [sys.executable, generator], cwd=work, capture_output=True, text=True,
            )
            if wrote.returncode != 0:
                print(f"FAIL: {mirror} cannot be regenerated from the grown registry.\n")
                print(wrote.stdout or wrote.stderr)
                return 1

        # The claim is not only that it validates -- it is that nothing else had to change. This is
        # now measured against the tree rather than against the fixture's own key names.
        after = snapshot(work)
        changed = sorted(k for k in set(before) | set(after) if before.get(k) != after.get(k))
        generated = {m for m, _, _ in MIRRORS}
        outside = [f for f in changed
                   if not f.startswith(ALLOWED_PREFIXES) and f not in generated]
        if outside:
            print("FAIL: growing the registry changed files outside it: " + ", ".join(outside))
            return 1
        for mirror, _, section in MIRRORS:
            if mirror not in changed:
                print(f"FAIL: {mirror} did not change, so the new {section} rows never reached "
                      f"the browser's copy of the registry.")
                return 1
            text = (work / mirror).read_text(encoding="utf-8")
            for rid in [r["id"] for r in fixture.get(section, [])]:
                if f'"{rid}"' not in text:
                    print(f"FAIL: {section} row {rid!r} validates but is not in the mirror the "
                          f"browser loads, so nothing would ever draw it.")
                    return 1

        print("registry sections the fixture touched:", ", ".join(sorted(fixture)))
        print("files changed outside registry/:", ", ".join(sorted(generated)),
              "(generated, and CI regenerates them)")
        print(result.stdout.strip())

    print("\nPASS: a new world, a new source, a new layer, a new texture, a new surface site, "
          "two new launch vehicles and a new odd thing on that new world are rows. Nothing under "
          "site/js/ was needed but the two generated mirrors, which no human edits.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
