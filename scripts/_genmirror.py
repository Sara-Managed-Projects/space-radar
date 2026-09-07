#!/usr/bin/env python3
"""The generated-mirror machinery, extracted at the third generator rather than the second.

WHY THIS EXISTS. The browser never parses YAML, so a registry a human edits needs a mirror a
browser reads, and a hand-kept mirror drifts -- registry/models.yaml and the BUILDERS table in
scene/models.js already did, with nothing checking them. `scripts/gen_rockets_js.py` solved that
once; `scripts/gen_oddities_js.py` copied it line for line; `scripts/gen_tours_js.py` would have
been the third copy of the same forty lines, and a bug fixed in one of three copies is a bug in
two.

WHAT IS SHARED AND WHAT IS NOT. Everything here is mechanism: read the YAML, whitelist the fields
that reach a phone, write `export const NAME = <json>`, and refuse when the checked-in file and
the registry disagree. Nothing here knows what a rocket, an oddity or a trip is. Each generator
keeps its own header -- the paragraph a reader finds at the top of the mirror explaining what a
row MEANS -- its own FIELDS whitelist, and its own row transform.

`gen_rockets_js.py` IS DELIBERATELY NOT RETROFITTED. It is the file the other two were copied
from and the one every comment in the repository points at as the pattern; rewriting it to prove
a refactor would put the reference implementation one indirection away from the reader for no
behaviour gained. Two callers is the rule of three met exactly.

THE WHITELIST IS THE POINT, not an optimisation. registry/oddities.yaml carries Horizons headers
and the reason a secondary source was used; registry/tours.yaml carries the evidence for the
numbers in its own comments. `FIELDS` means a field added to the YAML reaches a phone only when
somebody decides it should.

Used by:  scripts/gen_oddities_js.py, scripts/gen_tours_js.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


def pick(row: dict, fields: tuple[str, ...]) -> dict:
    """The row, reduced to the whitelisted fields it actually has, in the whitelist's order."""
    return {k: row[k] for k in fields if k in row}


def drop(block: dict, fields: tuple[str, ...]) -> dict:
    """The block, without the fields a reviewer reads and a phone does not."""
    return {k: v for k, v in block.items() if k not in fields}


class Mirror:
    """One registry file, one generated JS file, and the refusal that they have drifted apart.

    `render(doc)` is the generator's own function: it is handed the parsed YAML and returns a list
    of `(docComment, exportName, value)` triples, which become one `export const` each, in order.
    Everything else -- the argv handling, the byte comparison, the message a stale mirror prints
    -- is the same for every generator and lives here.
    """

    def __init__(self, *, source: str, target: str, header: str, render, what: str) -> None:
        self.source = ROOT / source
        self.target = ROOT / target
        self.header = header
        self.render = render
        self.what = what  # "oddities.js", for the messages

    def doc(self) -> dict:
        return yaml.safe_load(self.source.read_text(encoding="utf-8")) or {}

    def text(self) -> str:
        parts = [self.header]
        for comment, name, value in self.render(self.doc()):
            # `default=str` so a YAML date -- which PyYAML hands back as a datetime.date -- is
            # written as the ISO string the browser reads, rather than raising here.
            body = json.dumps(value, indent=2, ensure_ascii=False, default=str)
            parts.append(f"/** {comment} */\nexport const {name} = {body};\n")
        return "\n".join(parts)

    def main(self, argv: list[str]) -> int:
        want = self.text()
        if "--check" in argv:
            have = self.target.read_text(encoding="utf-8") if self.target.exists() else ""
            if have == want:
                print(
                    f"{self.what} is current "
                    f"({want.count(chr(10))} lines from {self.source.relative_to(ROOT)})"
                )
                return 0
            print(
                f"{self.target.relative_to(ROOT)} is STALE.\n\n"
                f"  {self.source.relative_to(ROOT)} has changed and the mirror the browser loads "
                f"has not.\n"
                f"  Run: python3 scripts/{Path(sys.argv[0]).name}"
            )
            return 1
        self.target.parent.mkdir(parents=True, exist_ok=True)
        self.target.write_text(want, encoding="utf-8")
        print(f"wrote {self.target.relative_to(ROOT)}")
        return 0
