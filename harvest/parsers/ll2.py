"""Launch Library 2, upcoming launches: `{count, next, previous, results:[...]}`."""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, dict) or not isinstance(body.get("results"), list):
        raise ValueError("LL2 answers an object with a `results` list")
    for launch in body["results"][:5]:
        if not isinstance(launch, dict) or "net" not in launch or "name" not in launch:
            raise ValueError("an LL2 launch lacks `net`/`name`")


def count(body) -> int:
    validate(body)
    return len(body["results"])
