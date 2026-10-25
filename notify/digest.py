"""Digest content: the next N upcoming launches, each shower's next peak date, and the next
close approaches, built per subscriber from data this repo already has -- the harvester's own
`data/v1/launches.json` and `data/v1/jpl-cad.json` snapshots (read here, never refetched) and
`notify/showers.py`'s mirror of `registry/showers.yaml`.

Scope, per issue #290: only events that are the same for every subscriber. Never a per-location
"this passes over you" alert -- that needs an ongoing lat/lon and belongs to #290's device-local
push, not here.
"""

from __future__ import annotations

import math
import re
from datetime import date, datetime, timedelta, timezone


def parse_dt(value: str) -> datetime:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def next_launches(launches_body: dict, now: datetime, limit: int = 5) -> list[dict]:
    """The next `limit` launches at or after `now`, earliest first.

    `launches_body` is the Launch Library 2 body verbatim (`{"results": [...]}`), the same shape
    harvest/parsers/ll2.py validates and the harvester's launches.json snapshot carries in its
    `body` field.
    """
    upcoming: list[tuple[datetime, dict]] = []
    for launch in launches_body.get("results") or []:
        net = launch.get("net")
        if not net:
            continue
        try:
            when = parse_dt(net)
        except ValueError:
            continue
        if when >= now:
            upcoming.append((when, launch))
    upcoming.sort(key=lambda pair: pair[0])
    return [
        {
            "id": launch.get("id") or f"{launch.get('name')}@{launch.get('net')}",
            "name": launch.get("name") or "an unnamed launch",
            "net": launch.get("net"),
        }
        for _, launch in upcoming[:limit]
    ]


def next_shower_peak(peak_mmdd: str, now: datetime) -> date:
    """The next occurrence of a `MM-DD` peak on/after `now`'s date, wrapping to next year if this
    year's has already passed. A peak today counts as "on or after" -- not yet missed."""
    month, day = (int(p) for p in peak_mmdd.split("-"))
    today = now.date() if isinstance(now, datetime) else now
    candidate = date(today.year, month, day)
    if candidate < today:
        candidate = date(today.year + 1, month, day)
    return candidate


def next_shower_peaks(showers: list[dict], now: datetime) -> list[dict]:
    """One entry per shower, its next peak date, sorted soonest first."""
    out = []
    for row in showers:
        peak = next_shower_peak(row["peak"], now)
        out.append(
            {
                "id": row["id"],
                "display": row.get("display", row["id"]),
                "peak_date": peak.isoformat(),
                "year": peak.year,
            }
        )
    out.sort(key=lambda r: r["peak_date"])
    return out


def ledger_key_launch(launch: dict) -> str:
    return f"launch:{launch['id']}"


def ledger_key_shower(shower: dict) -> str:
    return f"shower:{shower['id']}:{shower['year']}"


# Close approaches, from the harvester's jpl-cad snapshot (JPL CNEOS). dist is au. The notifier
# has no registry of its own, so these sit next to the launches `limit=5` default.
AU_KM = 149_597_870.7
LD_KM = 384_400
APPROACH_WINDOW_DAYS = 14
APPROACH_MAX_LD = 5.0
APPROACH_LIMIT = 5
APPROACH_FRESHNESS_MAX_H = 72  # registry/sources.yaml jpl-cad freshness_max

_CAD_MONTHS = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}
# "2026-Nov-03 14:22". CAD's cd is TDB (JPL CAD API). TDB and UTC differ by under two minutes,
# so the minute CAD printed is the minute shown, labelled UTC like the rest of the digest.
_CAD_CD = re.compile(r"^(\d{4})-([A-Za-z]{3})-(\d{2}) (\d{2}):(\d{2})$")

APPROACH_HEADING = "Close approaches (nominal, JPL CNEOS):"
APPROACH_HONESTY = (
    "These are close approaches, not collisions. Distances are nominal from JPL CNEOS."
)


def _parse_cad_cd(value) -> datetime | None:
    match = _CAD_CD.match(str(value or "").strip())
    if match is None:
        return None
    month = _CAD_MONTHS.get(match.group(2).title())
    if month is None:
        return None
    try:
        return datetime(
            int(match.group(1)), month, int(match.group(3)),
            int(match.group(4)), int(match.group(5)), tzinfo=timezone.utc,
        )
    except ValueError:
        return None


def _float_or_none(value) -> float | None:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number):
        return None
    return number


def _diameter_m(raw) -> int | None:
    """CAD's `diameter` is kilometres (JPL CAD API). None when CAD has no size."""
    km = _float_or_none(raw)
    if km is None or km <= 0:
        return None
    meters = int(round(km * 1000))
    return meters or None


def next_approaches(snapshot: dict | None, now: datetime) -> list[dict] | None:
    """Approaches inside the window and under APPROACH_MAX_LD, nearest first, at most APPROACH_LIMIT.

    None when the snapshot is missing, unparseable, or older than APPROACH_FRESHNESS_MAX_H:
    "could not look", which is not the same as an empty list ("looked, nothing qualifies").
    A row whose date or distance does not parse is skipped.
    """
    if not isinstance(snapshot, dict):
        return None
    fetched_raw = snapshot.get("fetched_at")
    if not isinstance(fetched_raw, str):
        return None
    try:
        fetched = parse_dt(fetched_raw)
    except ValueError:
        return None
    if (now - fetched).total_seconds() > APPROACH_FRESHNESS_MAX_H * 3600:
        return None
    body = snapshot.get("body")
    if not isinstance(body, dict):
        return None
    fields = body.get("fields")
    data = body.get("data")
    if data is None and fields is None and body.get("count") == 0:
        return []
    if not isinstance(fields, list) or not isinstance(data, list):
        return None
    if any(name not in fields for name in ("des", "cd", "dist")):
        return None

    end = now + timedelta(days=APPROACH_WINDOW_DAYS)
    found: list[tuple[float, datetime, dict]] = []
    for row in data:
        if not isinstance(row, list) or len(row) < len(fields):
            continue
        record = dict(zip(fields, row))
        des = str(record.get("des") or "").strip()
        when = _parse_cad_cd(record.get("cd"))
        au = _float_or_none(record.get("dist"))
        if not des or when is None or au is None or au < 0:
            continue
        if when < now or when > end:
            continue
        dist_ld = au * AU_KM / LD_KM
        # Float round-trip of a distance that is exactly the cap. 1e-6 LD is about 400 m, far under the 0.1 LD we show.
        if dist_ld > APPROACH_MAX_LD + 1e-6:
            continue
        name = str(record.get("fullname") or "").strip() or des
        dist_km = int(round(au * AU_KM / 1000.0)) * 1000
        found.append((dist_ld, when, {
            "des": des,
            "name": name,
            "when": when.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "dist_ld": round(dist_ld, 1),
            "dist_km": dist_km,
            "diameter_m": _diameter_m(record.get("diameter")),
        }))
    found.sort(key=lambda item: (item[0], item[1]))
    return [item for _, _, item in found[:APPROACH_LIMIT]]


def ledger_key_approach(approach: dict) -> str:
    return f"approach:{approach['des']}:{approach['when']}"


def _approach_size(diameter_m: int | None) -> str:
    if not diameter_m:
        return ""
    if diameter_m >= 1000:
        km = diameter_m / 1000
        shown = f"{round(km):.0f}" if abs(km - round(km)) < 0.05 else f"{km:.1f}"
        return f", about {shown} km across"
    return f", about {diameter_m:,} m across"


def _approach_line(approach: dict) -> str:
    stamp = approach["when"][0:16].replace("T", " ") + " UTC"
    size = _approach_size(approach.get("diameter_m"))
    return (
        f"  - {approach['name']}: {stamp}, "
        f"{approach['dist_ld']:.1f} LD ({approach['dist_km']:,} km){size}"
    )


def unsent(items: list[dict], key_fn, sent: set[str]) -> list[dict]:
    """Items whose ledger key is not already in `sent` -- the per-subscriber dedupe, so the same
    launch or the same shower-year is never emailed to the same person twice."""
    return [item for item in items if key_fn(item) not in sent]


def build_digest(
    categories: list[str], launches: list[dict], showers: list[dict], approaches: list[dict] | tuple = ()
) -> dict | None:
    """Subject + plain-text body for one subscriber, filtered to the categories they chose.
    `launches`/`showers`/`approaches` should already be the UNSENT ones (apply `unsent` first).
    None if there is nothing new to say -- the caller then sends no email at all. `approaches`
    defaults to nothing, so a caller that predates close approaches is unchanged."""
    lines: list[str] = []
    if "launches" in categories and launches:
        lines.append("Upcoming launches:")
        for launch in launches:
            lines.append(f"  - {launch['name']}: {launch['net']}")
    if "meteor-showers" in categories and showers:
        lines.append("Meteor shower peaks:")
        for shower in showers:
            lines.append(f"  - {shower['display']}: {shower['peak_date']}")
    if "close-approaches" in categories and approaches:
        lines.append(APPROACH_HEADING)
        for approach in approaches:
            lines.append(_approach_line(approach))
        lines.append(APPROACH_HONESTY)
    if not lines:
        return None
    return {"subject": "Space Radar: what's coming up", "body": "\n".join(lines) + "\n"}
