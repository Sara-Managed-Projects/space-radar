"""A small, hand-synced mirror of registry/showers.yaml's id/display/peak/peaks columns.

`peaks` (forge #90) is each year's own date of the maximum, from the IMO's calendar for that year or
computed from the solar longitude where the IMO has not published one (showers.yaml `peaks_from`
says which). Until 2026-11-08 the mailer sent `peak`, the 2026 date, for every year.

Embedded as a Python literal rather than parsed from YAML at runtime: the showers.yaml comment
says the table is "reviewed each December against [the IMO] calendar", a PR a human reads, so
these eight rows barely move. Keeping them here means the Lambda zip needs no PyYAML dependency
and no registry/ data packaged in for thirteen rows. tests/test_notify.py checks this mirror against
registry/showers.yaml row for row, the same discipline harvest/sources.json uses against
registry/sources.yaml (tests/test_harvester_scripts.py's test_package).
"""

from __future__ import annotations

SHOWERS = [
    {"id": "quadrantids", "display": "Quadrantids", "peak": "01-03", "peaks": {"2026": "01-03", "2027": "01-04", "2028": "01-04"}},
    {"id": "lyrids", "display": "Lyrids", "peak": "04-22", "peaks": {"2026": "04-22", "2027": "04-23", "2028": "04-22"}},
    {"id": "eta-aquariids", "display": "Eta Aquariids", "peak": "05-06", "peaks": {"2026": "05-06", "2027": "05-06", "2028": "05-05"}},
    {"id": "alpha-capricornids", "display": "Alpha Capricornids", "peak": "07-31", "peaks": {"2026": "07-31", "2027": "07-31", "2028": "07-31"}},
    {"id": "southern-delta-aquariids", "display": "Southern Delta Aquariids", "peak": "07-31", "peaks": {"2026": "07-31", "2027": "07-31", "2028": "07-31"}},
    {"id": "perseids", "display": "Perseids", "peak": "08-12", "peaks": {"2026": "08-12", "2027": "08-13", "2028": "08-12"}},
    {"id": "draconids", "display": "Draconids", "peak": "10-09", "peaks": {"2026": "10-09", "2027": "10-09", "2028": "10-08"}},
    {"id": "orionids", "display": "Orionids", "peak": "10-21", "peaks": {"2026": "10-21", "2027": "10-22", "2028": "10-21"}},
    {"id": "southern-taurids", "display": "Southern Taurids", "peak": "11-05", "peaks": {"2026": "11-05", "2027": "11-06", "2028": "11-05"}},
    {"id": "northern-taurids", "display": "Northern Taurids", "peak": "11-12", "peaks": {"2026": "11-12", "2027": "11-13", "2028": "11-12"}},
    {"id": "leonids", "display": "Leonids", "peak": "11-17", "peaks": {"2026": "11-17", "2027": "11-18", "2028": "11-17"}},
    {"id": "geminids", "display": "Geminids", "peak": "12-14", "peaks": {"2026": "12-14", "2027": "12-14", "2028": "12-14"}},
    {"id": "ursids", "display": "Ursids", "peak": "12-22", "peaks": {"2026": "12-22", "2027": "12-23", "2028": "12-22"}},
]
