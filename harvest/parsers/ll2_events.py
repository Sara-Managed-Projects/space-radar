"""Launch Library 2, upcoming events: `{count, next, previous, results:[...]}`."""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, dict) or not isinstance(body.get("results"), list):
        raise ValueError("LL2 answers an object with a `results` list")
    for ev in body["results"][:5]:
        if not isinstance(ev, dict) or "date" not in ev or "name" not in ev:
            raise ValueError("an LL2 event lacks `date`/`name`")


def count(body) -> int:
    validate(body)
    return len(body["results"])
