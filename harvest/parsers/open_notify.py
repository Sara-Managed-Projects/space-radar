"""Open Notify's Astros answer: who is aboard each crewed spacecraft right now.

`{"message": "success", "number": N, "people": [{"name": ..., "craft": ...}, ...]}`. `number` is
redundant with `len(people)` by the API's own description; the parser counts the rows rather than
trusting the field, the same choice jpl_sbdb.py makes for its `count`.
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, dict) or body.get("message") != "success":
        raise ValueError("Open Notify astros answers {message: 'success', people: [...], number: N}")
    people = body.get("people")
    if not isinstance(people, list) or not people:
        raise ValueError("Open Notify astros has no people list")
    for p in people:
        if not isinstance(p, dict) or not p.get("name") or not p.get("craft"):
            raise ValueError("Open Notify astros row carries no name/craft")


def count(body) -> int:
    validate(body)
    return len(body["people"])
