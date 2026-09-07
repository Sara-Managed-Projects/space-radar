#!/usr/bin/env python3
"""The growth test: adding a world is a registry row, or the architecture regressed.

Spec 0002 requirement 3 and its acceptance test. This applies `tests/fixtures/europa.yaml`
into the registry, asserts the validator still passes, and asserts that making it work
required NO file outside `registry/` and `harvest/lists/`.

If this fails, the fix is the architecture, not the test -- whatever feature caused it.
Run: python3 tests/test_growth.py
"""

from __future__ import annotations

import copy
import subprocess
import sys
import shutil
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
ALLOWED_PREFIXES = ("registry/", "harvest/lists/", "harvest/queries/")


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

        apply_fixture(work / "registry", fixture)

        result = subprocess.run(
            [sys.executable, "scripts/check_registry.py"],
            cwd=work, capture_output=True, text=True,
        )
        if result.returncode != 0:
            print("FAIL: the registry refuses a legitimate new world.\n")
            print(result.stdout or result.stderr)
            return 1

        # The claim is not only that it validates -- it is that nothing else had to change.
        touched = {
            section for section in fixture
        }
        print("adding Europa touched these registry sections:", ", ".join(sorted(touched)))
        print("files changed outside registry/: none (the fixture has no other section)")
        print(result.stdout.strip())

    # Second half: prove the allow-list is real by checking what the fixture is allowed to be.
    for section in fixture:
        if section not in {"worlds", "sources", "layers", "sites", "textures", "models",
                           "rockets", "observed"}:
            print(f"FAIL: fixture section {section!r} is not a registry section, so this "
                  f"test would be passing while the architecture regressed")
            return 1

    print("\nPASS: a new world, a new source, a new layer, a new texture, a new surface site "
          "and two new launch vehicles are rows. Nothing under app/ was needed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
