"""A small, hand-synced mirror of registry/showers.yaml's id/display/peak columns.

Embedded as a Python literal rather than parsed from YAML at runtime: the showers.yaml comment
says the table is "reviewed each December against [the IMO] calendar", a PR a human reads, so
these eight rows barely move. Keeping them here means the Lambda zip needs no PyYAML dependency
and no registry/ data packaged in for nine rows. tests/test_notify.py checks this mirror against
registry/showers.yaml row for row, the same discipline harvest/sources.json uses against
registry/sources.yaml (tests/test_harvester_scripts.py's test_package).
"""

from __future__ import annotations

SHOWERS = [
    {"id": "quadrantids", "display": "Quadrantids", "peak": "01-03"},
    {"id": "lyrids", "display": "Lyrids", "peak": "04-22"},
    {"id": "eta-aquariids", "display": "Eta Aquariids", "peak": "05-06"},
    {"id": "perseids", "display": "Perseids", "peak": "08-12"},
    {"id": "orionids", "display": "Orionids", "peak": "10-21"},
    {"id": "leonids", "display": "Leonids", "peak": "11-17"},
    {"id": "geminids", "display": "Geminids", "peak": "12-14"},
    {"id": "ursids", "display": "Ursids", "peak": "12-22"},
]
