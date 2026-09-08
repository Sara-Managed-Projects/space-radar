"""CelesTrak GP (OMM JSON): a list of element sets, one object each.

CelesTrak answers an early re-fetch -- inside its two-hour cycle -- with the sentence
"GP data has not updated since your last successful download", as a 403 and sometimes as a 200
with that text as the body. Either is "nothing new", never an error, and never retried.
"""

from __future__ import annotations

NOT_UPDATED = "has not updated since"
_REQUIRED = ("OBJECT_NAME", "EPOCH", "MEAN_MOTION", "NORAD_CAT_ID")


def not_modified(text: str) -> bool:
    return isinstance(text, str) and NOT_UPDATED in text[:400].lower()


def validate(body) -> None:
    if not isinstance(body, list):
        raise ValueError("GP JSON is a list of element sets")
    for rec in body[:5]:
        if not isinstance(rec, dict) or any(k not in rec for k in _REQUIRED):
            raise ValueError("a GP record lacks OBJECT_NAME/EPOCH/MEAN_MOTION/NORAD_CAT_ID")


def count(body) -> int:
    validate(body)
    return len(body)
