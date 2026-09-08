"""Small helpers shared by the text parsers. Not a parser."""

from __future__ import annotations


def lines(body) -> list[str]:
    if not isinstance(body, str):
        raise ValueError(f"expected text, got {type(body).__name__}")
    return body.splitlines()


def number(s: str) -> float | None:
    try:
        return float(s.strip())
    except (TypeError, ValueError):
        return None
