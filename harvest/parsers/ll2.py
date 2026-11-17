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


def newest(body) -> str | None:
    """The latest `net` in the list. Upcoming launches are ahead of the clock; a list whose latest
    is days behind it has stopped being refreshed (registry row `content_max_age`)."""
    nets = [r.get("net") for r in body.get("results", []) if isinstance(r, dict) and r.get("net")]
    return max(nets) if nets else None
