"""Launch Library 2, the launches that have happened, newest first: `{count, results:[...]}`.

The same row as an upcoming launch (`net`, `name`, `status`, `pad`), with a status that says how it
went. The page lists the last seven days of them (site/js/ui/justhappened.js).
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, dict) or not isinstance(body.get("results"), list) or not body["results"]:
        raise ValueError("LL2 answers an object with a non-empty `results` list of launches")
    for r in body["results"][:5]:
        if not isinstance(r, dict) or not r.get("net") or not r.get("name") or not isinstance(r.get("status"), dict):
            raise ValueError("an LL2 previous launch lacks `net`, `name` or `status`")


def count(body) -> int:
    validate(body)
    return len(body["results"])
