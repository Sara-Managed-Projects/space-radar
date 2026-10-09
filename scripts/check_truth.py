#!/usr/bin/env python3
"""registry/truth.yaml against the code that refuses and the test that proves it (spec 0043, task 2).

Every row names a `field`. The field's key must appear in scripts/check_registry.py (the validator
mentions it) and in tests/test_refusals.py (a case breaks it), so a field cannot ship without both.
`--check` is the CI step; a row for a field absent from either file fails. Exit 0 prints the row count.
"""
from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


def check(truth_text: str, registry_src: str, refusals_src: str) -> list[str]:
    """The refusals, as sentences; empty when the table and the code agree."""
    doc = yaml.safe_load(truth_text) or {}
    rows = doc.get("fields")
    if not isinstance(rows, list) or not rows:
        return ["truth.yaml: no `fields:` list"]
    errors, seen = [], set()
    for i, row in enumerate(rows):
        if not isinstance(row, dict) or not str(row.get("field", "")).strip():
            errors.append(f"truth.yaml row {i + 1}: no `field:`")
            continue
        field = str(row["field"])
        key = field.rstrip(":")
        where = f"truth.yaml[{field}]"
        if field in seen:
            errors.append(f"{where}: listed twice")
        seen.add(field)
        for need in ("refused_when", "test"):
            if not str(row.get(need, "")).strip():
                errors.append(f"{where}: no `{need}:`")
        if key not in registry_src:
            errors.append(f"{where}: scripts/check_registry.py never mentions `{key}`, so nothing refuses it")
        if f"{key}:" not in refusals_src and f"`{key}" not in refusals_src:
            errors.append(f"{where}: tests/test_refusals.py has no case that breaks `{key}`")
        test = str(row.get("test", ""))
        if test and not (ROOT / "tests" / test).exists():
            errors.append(f"{where}: `test: {test}` is not a file in tests/")
    return errors


def main() -> int:
    errors = check((ROOT / "registry" / "truth.yaml").read_text(encoding="utf-8"),
                   (ROOT / "scripts" / "check_registry.py").read_text(encoding="utf-8"),
                   (ROOT / "tests" / "test_refusals.py").read_text(encoding="utf-8"))
    if errors:
        for e in errors:
            print(f"  ** {e}")
        return 1
    rows = len(yaml.safe_load((ROOT / "registry" / "truth.yaml").read_text(encoding="utf-8"))["fields"])
    print(f"truth ok: {rows} fields, each refused in check_registry.py and broken on purpose in test_refusals.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
