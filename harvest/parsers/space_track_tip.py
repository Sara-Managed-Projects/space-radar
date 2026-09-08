"""Space-Track `tip` (Tracking and Impact Prediction): a JSON list of reentry windows.

The row is `auth: secret:SPACE_TRACK_PASSWORD` and `enabled: false`, so this parser is dispatched
only once a human registers and flips both. The login flow Space-Track needs (a POST for a cookie)
is not a GET and is not built; when the secret appears, the run reports that in words.
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, list):
        raise ValueError("Space-Track answers a JSON list")
    for row in body[:5]:
        if not isinstance(row, dict) or "NORAD_CAT_ID" not in row:
            raise ValueError("a TIP row carries NORAD_CAT_ID")


def count(body) -> int:
    validate(body)
    return len(body)
