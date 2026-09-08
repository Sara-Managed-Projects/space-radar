"""NASA DSN Now: XML, `<dsn>` holding `<station>` and `<dish>` elements.

An unofficial feed behind a public page. It has no SLA and may change shape without notice, so a
shape this does not recognise raises, the previous snapshot stays, and the run says why.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET


def _root(body):
    if not isinstance(body, str):
        raise ValueError("DSN Now is XML text")
    try:
        root = ET.fromstring(body)
    except ET.ParseError as e:
        raise ValueError(f"DSN Now XML did not parse: {e}") from None
    if root.tag != "dsn":
        raise ValueError(f"DSN Now root is <dsn>, got <{root.tag}>")
    return root


def validate(body) -> None:
    _root(body)


def count(body) -> int:
    return len(_root(body).findall("dish"))
