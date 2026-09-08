"""JPL SBDB query API: `{signature, fields:[...], data:[[...],...], count}`."""

from __future__ import annotations

_REQUIRED = ("full_name", "e", "a", "q", "i", "om", "w", "epoch")


def validate(body) -> None:
    if not isinstance(body, dict) or not isinstance(body.get("fields"), list):
        raise ValueError("SBDB answers an object with `fields` and `data`")
    missing = [f for f in _REQUIRED if f not in body["fields"]]
    if missing:
        raise ValueError(f"SBDB fields lack {', '.join(missing)}")
    if body.get("data") is not None and not isinstance(body["data"], list):
        raise ValueError("SBDB `data` must be a list of rows")


def count(body) -> int:
    validate(body)
    return len(body.get("data") or [])
