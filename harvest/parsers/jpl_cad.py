"""JPL CNEOS close-approach API: `{signature, count, fields:[...], data:[[...],...]}`.

With no approaches in the window the API answers `{"count": 0}` and no `data` key. That parses to
zero items and the guard refuses it -- deliberately: inside 10 lunar distances over 60 days there
are always some, so zero means the query changed, not the sky.
"""

from __future__ import annotations

_REQUIRED = ("des", "cd", "dist", "v_rel")


def validate(body) -> None:
    if not isinstance(body, dict):
        raise ValueError("CAD answers an object")
    if body.get("data") is not None:
        if not isinstance(body.get("fields"), list) or not isinstance(body["data"], list):
            raise ValueError("CAD `fields` and `data` must be lists")
        missing = [f for f in _REQUIRED if f not in body["fields"]]
        if missing:
            raise ValueError(f"CAD fields lack {', '.join(missing)}")


def count(body) -> int:
    validate(body)
    return len(body.get("data") or [])
