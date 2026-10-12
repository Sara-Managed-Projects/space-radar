"""NASA EONET v3 events: `{title, description, link, events: [{id, title, categories, geometry, ...}]}`.

Both questions the page asks (registry/sources.yaml eonet-fires, eonet-volcanoes-ice) get this shape. The
harvester passes the body through whole; the page (site/js/data/eonet.js parseEonet) picks the kinds it draws.
An empty `events` list is a real answer on a quiet day, but the never-worse guard compares counts, so a run
that returns far fewer events than the last good copy is refused rather than saved over it.
"""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, dict) or not isinstance(body.get("events"), list):
        raise ValueError("an EONET answer is {events: [...]}")
    for e in body["events"][:5]:
        if not isinstance(e, dict) or "id" not in e or not isinstance(e.get("geometry"), list):
            raise ValueError("an EONET event carries an id and a geometry list")


def count(body) -> int:
    validate(body)
    return len(body["events"])
