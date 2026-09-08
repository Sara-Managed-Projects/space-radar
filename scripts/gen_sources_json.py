#!/usr/bin/env python3
"""Mirror registry/sources.yaml into harvest/sources.json, and refuse if it has drifted.

The harvester's runtime is the standard library: no PyYAML in the Lambda, for the same reason the
browser has none. So the registry the harvester iterates is this generated JSON, exactly as
rockets.js, oddities.js and tours.js are generated for the browser, and CI checks it is current.

THE WHITELIST IS THE POINT. A row carries comments and fields a reviewer reads (`attribution`,
the browser's `browser:` flag when it lands) that the job does not need; only FIELDS reach the
zip. A field added to the YAML changes this mirror only when it is one the harvester acts on.

Two fields are RESOLVED rather than copied, so the zip is self-contained:
  list:   a path to a YAML file -> that file, parsed and inlined
  query:  a path to a text file -> that file's text, comment lines stripped
And one is RENAMED: the runtime calls the cadence `refresh` (amendment 1: `valid_until =
fetched_at + row.refresh`); a row may say `refresh:` outright, else its `cadence:` is used.

Run:  python3 scripts/gen_sources_json.py           # write it
      python3 scripts/gen_sources_json.py --check   # exit 1 if the checked-in file is stale
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "registry" / "sources.yaml"
TARGET = ROOT / "harvest" / "sources.json"

FIELDS = ("id", "url", "auth", "refresh", "freshness_max", "parser", "outputs", "enabled", "list", "query")


def resolve_list(path: str) -> dict:
    doc = yaml.safe_load((ROOT / path).read_text(encoding="utf-8")) or {}
    if not isinstance(doc, dict) or not isinstance(doc.get("ids"), list):
        raise SystemExit(f"{path}: a list file is an object with an `ids` list")
    return doc


def resolve_query(path: str) -> str:
    text = (ROOT / path).read_text(encoding="utf-8")
    return "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("#")).strip() + "\n"


def row_of(r: dict) -> dict:
    out: dict = {}
    for k in FIELDS:
        if k == "refresh":
            out[k] = r.get("refresh") or r.get("cadence")
        elif k == "list" and r.get("list"):
            out[k] = resolve_list(str(r["list"]))
        elif k == "query" and r.get("query"):
            out[k] = resolve_query(str(r["query"]))
        elif k in r:
            out[k] = r[k]
    return out


def render() -> str:
    doc = yaml.safe_load(SOURCE.read_text(encoding="utf-8")) or {}
    rows = doc.get("sources") or []
    mirror = {
        "schema": 1,
        "generated_from": "registry/sources.yaml",
        "generated_by": "scripts/gen_sources_json.py",
        "sources": [row_of(r) for r in rows],
    }
    return json.dumps(mirror, indent=2, ensure_ascii=False, default=str) + "\n"


def main(argv: list[str]) -> int:
    want = render()
    if "--check" in argv:
        have = TARGET.read_text(encoding="utf-8") if TARGET.exists() else ""
        if have == want:
            print(f"sources.json is current ({want.count(chr(10))} lines from registry/sources.yaml)")
            return 0
        print(
            "harvest/sources.json is STALE.\n\n"
            "  registry/sources.yaml (or a list/query file it names) has changed and the mirror the "
            "harvester loads has not.\n"
            "  Run: python3 scripts/gen_sources_json.py"
        )
        return 1
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(want, encoding="utf-8")
    print(f"wrote {TARGET.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
