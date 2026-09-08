"""One module per `parser:` value in registry/sources.yaml, found by name, never by source.

A parser module exposes:

    count(body) -> int            how many things the body holds; the never-worse guard's input
    validate(body) -> None        optional; raise ValueError when the shape is not the source's
    not_modified(text) -> bool    optional; True when a 200/403 TEXT answer means "nothing new"
                                  (CelesTrak says it in words rather than with a 304)

`body` is the parsed JSON when the upstream sent JSON, otherwise the text. A parser never
normalises: the browser does that, once, in site/js/data/parsers.js.
"""

from __future__ import annotations

import importlib
import re
from types import ModuleType

_NAME = re.compile(r"^[a-z][a-z0-9_]*$")


class ParserMissing(LookupError):
    pass


def load(name: str) -> ModuleType:
    """`harvest.parsers.<name>`; a registry row that names a module we do not have is an error a
    human fixes, so the message says which."""
    if not _NAME.match(name or ""):
        raise ParserMissing(f"parser name {name!r} is not a module name")
    try:
        mod = importlib.import_module(f"{__name__}.{name}")
    except ModuleNotFoundError as e:
        if e.name and e.name.endswith(f".{name}"):
            raise ParserMissing(f"no module harvest/parsers/{name}.py for parser {name!r}") from None
        raise
    if not callable(getattr(mod, "count", None)):
        raise ParserMissing(f"harvest/parsers/{name}.py has no count(body)")
    return mod
