"""Launch Library 2, the astronauts flagged as in space: `{count, results:[...]}`.

Each row has `name`, `in_space`, `agency.abbrev`, `type.name` and `last_flight` (the time of the
launch they are up on). The list is LL2's flag, not a roll call: read 2026-10-08 it held 15 rows,
one of them "Starman" (type "Non-Human") and four whose spacecraft had already come home. The page
keeps only people whose launch is a vehicle docked now (site/js/data/crew.js) and says so.
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, dict) or not isinstance(body.get("results"), list) or not body["results"]:
        raise ValueError("LL2 answers an object with a non-empty `results` list of astronauts")
    for a in body["results"][:5]:
        if not isinstance(a, dict) or not a.get("name") or "last_flight" not in a:
            raise ValueError("an LL2 astronaut lacks `name` or `last_flight`")


def count(body) -> int:
    validate(body)
    return len(body["results"])


def newest(body) -> str | None:
    """The latest launch of any PERSON flagged in space ("Starman", type Non-Human, has been up
    since 2018 and is not one). Crews change at least twice a year (registry row `content_max_age`)."""
    out = []
    for a in body.get("results", []):
        if not isinstance(a, dict) or not a.get("last_flight"):
            continue
        kind = a.get("type") if isinstance(a.get("type"), dict) else {}
        if "non-human" in str(kind.get("name") or "").lower():
            continue
        out.append(a["last_flight"])
    return max(out) if out else None
