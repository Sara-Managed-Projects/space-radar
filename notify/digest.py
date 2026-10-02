"""Digest content: the next N upcoming launches, and each shower's next peak date, built per
subscriber from data this repo already has -- the harvester's own `data/v1/launches.json`
snapshot (read here, never refetched) and `notify/showers.py`'s mirror of
`registry/showers.yaml`.

Scope, per issue #290: only events that are the same for every subscriber. Never a per-location
"this passes over you" alert -- that needs an ongoing lat/lon and belongs to #290's device-local
push, not here.
"""

from __future__ import annotations

from datetime import date, datetime, timezone


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


def unsent(items: list[dict], key_fn, sent: set[str]) -> list[dict]:
    """Items whose ledger key is not already in `sent` -- the per-subscriber dedupe, so the same
    launch or the same shower-year is never emailed to the same person twice."""
    return [item for item in items if key_fn(item) not in sent]


def build_digest(categories: list[str], launches: list[dict], showers: list[dict]) -> dict | None:
    """Subject + plain-text body for one subscriber, filtered to the categories they chose.
    `launches`/`showers` should already be the UNSENT ones (apply `unsent` first). None if there
    is nothing new to say -- the caller then sends no email at all."""
    lines: list[str] = []
    if "launches" in categories and launches:
        lines.append("Upcoming launches:")
        for launch in launches:
            lines.append(f"  - {launch['name']}: {launch['net']}")
    if "meteor-showers" in categories and showers:
        lines.append("Meteor shower peaks:")
        for shower in showers:
            lines.append(f"  - {shower['display']}: {shower['peak_date']}")
    if not lines:
        return None
    return {"subject": "Space Radar: what's coming up", "body": "\n".join(lines) + "\n"}
