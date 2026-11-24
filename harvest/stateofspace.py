"""State of Space and the re-entry watch: small summaries of CelesTrak's satellite catalogue (forge #558, #561).

    summary(rows, day, live=True)    the numbers the State of Space page shows, as the catalogue stood on `day`
    reentry_watch(rows, day)         what came down in the last 30 days, and the lowest objects still up
    history(rows, until_day)         quarter ends from HISTORY_FROM: payloads in orbit, debris, launches that quarter

ONE CODE PATH. harvest/publish.py writes `state-of-space` and `reentry-watch` beside the catalogue's saved copy with
these functions (rule 6 there), and scripts/state_of_space.py freezes a finished quarter into
site/data/state-of-space/<year>-q<n>.json with the same ones, so the page's live numbers and its frozen ones are
counted alike. Nothing here fetches.

WHAT IS COUNTED, IN CELESTRAK'S OWN COLUMNS (https://celestrak.org/satcat/satcat-format.php, read 2026-11-24):
  * in Earth orbit   ORBIT_TYPE `ORB` and ORBIT_CENTER `EA`, with no DECAY_DATE on or before the day;
  * the kinds        OBJECT_TYPE `PAY` payload, `R/B` rocket body, `DEB` debris, `UNK` unknown;
  * working          OPS_STATUS_CODE `+` operational, `P` partially, `B` backup, `S` spare, `X` extended mission;
  * beyond Earth     ORBIT_TYPE `ORB` round anything but the Earth (the Sun, the Moon, Mars, a Lagrange point);
  * a launch         one international designator YYYY-NNN, which the catalogue gives to launches that reached
                     orbit (a failed launch has none), so "launches this year" is orbital launches that got there.
COUNTED BACK. For a day in the past (`live=False`) an object counts only if it was launched by then, had not come down
by then, and had been CATALOGUED by then: catalogue numbers are given in order, so the day's highest number is the
highest given to anything launched in the 30 days before it (`cutoff`). Without that a breakup's pieces, which carry
their parent's old launch date, would be counted years before they existed. The working flags are today's only.
"""

from __future__ import annotations

import csv
import io
from datetime import date, timedelta

KINDS = {"PAY": "payload", "R/B": "rocket_body", "DEB": "debris", "UNK": "unknown"}
WORKING = {"+", "P", "B", "S", "X"}
OWNERS_SHOWN = 10
HISTORY_FROM = date(2016, 3, 31)
RECENT_DAYS = 30
LOWEST_SHOWN = 25
RECENT_SHOWN = 25
LOW_APOGEE_KM = 350          # below this whole orbit, the air brings an object down within weeks to months
CUTOFF_WINDOW_DAYS = 30


def rows_of(csv_text: str) -> list[dict]:
    return list(csv.DictReader(io.StringIO(csv_text)))


def _day(s) -> date | None:
    try:
        return date.fromisoformat(str(s)[:10]) if s else None
    except ValueError:
        return None


def _int(s) -> int | None:
    try:
        return int(str(s).strip())
    except (TypeError, ValueError):
        return None


def _num(s) -> float | None:
    try:
        return float(str(s).strip())
    except (TypeError, ValueError):
        return None


def cutoff(rows: list[dict], day: date) -> int:
    """The highest catalogue number of a satellite or a rocket stage launched in the 30 days up to `day` (or, with none in
    that window, by then): the catalogue's edge that day. They are catalogued within days of their launch."""
    lo = day - timedelta(days=CUTOFF_WINDOW_DAYS)
    best = 0
    before = 0                               # with no launch in the window, the highest number of anything launched by then
    for r in rows:
        if r.get("OBJECT_TYPE") not in ("PAY", "R/B"):
            continue                         # a fragment carries its parent's launch date, not the day it was catalogued
        d = _day(r.get("LAUNCH_DATE"))
        if d and d <= day:
            n = _int(r.get("NORAD_CAT_ID")) or 0
            before = max(before, n)
            if lo < d:
                best = max(best, n)
    return best or before


def _up(r: dict, day: date, edge: int | None) -> bool:
    if r.get("ORBIT_TYPE") not in ("ORB", "IMP", "LAN", "DOC"):
        return False
    launched = _day(r.get("LAUNCH_DATE"))
    if launched is None or launched > day:
        return False
    down = _day(r.get("DECAY_DATE"))
    if edge is None:                       # today: the catalogue's own state
        return r.get("ORBIT_TYPE") == "ORB" and down is None
    if down is not None and down <= day:
        return False
    if down is None and r.get("ORBIT_TYPE") != "ORB":
        return False                       # landed or docked with no date: not counted back
    return (_int(r.get("NORAD_CAT_ID")) or 0) <= edge


def summary(rows: list[dict], day: date, live: bool = True) -> dict:
    edge = None if live else cutoff(rows, day)
    earth = {k: 0 for k in KINDS.values()}
    owners: dict[str, int] = {}
    working = 0
    starlink = 0
    beyond = 0
    beyond_working = 0
    centres: dict[str, int] = {}
    launches = set()
    year = day.year
    came_down = 0
    since = day - timedelta(days=RECENT_DAYS)
    for r in rows:
        intl = str(r.get("OBJECT_ID") or "")
        launched = _day(r.get("LAUNCH_DATE"))
        if launched and launched.year == year and launched <= day and intl[:4] == str(year) and len(intl) >= 8:
            launches.add(intl[:8])
        down = _day(r.get("DECAY_DATE"))
        if down and since < down <= day:
            came_down += 1
        if not _up(r, day, edge):
            continue
        kind = KINDS.get(r.get("OBJECT_TYPE"), "unknown")
        centre = r.get("ORBIT_CENTER") or ""
        if centre == "EA":
            earth[kind] += 1
            if kind == "payload":
                owner = (r.get("OWNER") or "?").strip() or "?"
                owners[owner] = owners.get(owner, 0) + 1
                if live and r.get("OPS_STATUS_CODE") in WORKING:
                    working += 1
                if str(r.get("OBJECT_NAME") or "").upper().startswith("STARLINK"):
                    starlink += 1
        elif kind == "payload":
            beyond += 1
            centres[centre] = centres.get(centre, 0) + 1
            if live and r.get("OPS_STATUS_CODE") in WORKING:
                beyond_working += 1
    ranked = sorted(owners.items(), key=lambda kv: (-kv[1], kv[0]))
    shown = ranked[:OWNERS_SHOWN]
    return {
        "as_of": day.isoformat(),
        "counted": "live" if live else "counted back",
        "earth_orbit": {"total": sum(earth.values()), **earth},
        "payload_owners": [[k, v] for k, v in shown],
        "payload_owners_other": sum(v for _, v in ranked[OWNERS_SHOWN:]),
        "owners": len(owners),
        "working_payloads": working if live else None,
        "starlink": starlink,
        "beyond_earth": {"payloads": beyond, "working": beyond_working if live else None,
                         "by_centre": dict(sorted(centres.items(), key=lambda kv: (-kv[1], kv[0])))},
        "launches_year": {"year": year, "n": len(launches)},
        "came_down_30d": came_down,
    }


def reentry_watch(rows: list[dict], day: date) -> dict:
    """The catalogue's own record of what came down lately, and the lowest whole orbits still up. No prediction."""
    since = day - timedelta(days=RECENT_DAYS)
    recent, low = [], []
    for r in rows:
        base = {"id": _int(r.get("NORAD_CAT_ID")), "name": str(r.get("OBJECT_NAME") or "").strip(), "intl": r.get("OBJECT_ID") or "",
                "kind": KINDS.get(r.get("OBJECT_TYPE"), "unknown"), "owner": (r.get("OWNER") or "").strip()}
        down = _day(r.get("DECAY_DATE"))
        if down and since < down <= day:
            recent.append({**base, "down": down.isoformat(), "launched": r.get("LAUNCH_DATE") or ""})
            continue
        if down or r.get("ORBIT_TYPE") != "ORB" or r.get("ORBIT_CENTER") != "EA":
            continue
        apo, peri = _num(r.get("APOGEE")), _num(r.get("PERIGEE"))
        if apo is None or peri is None or apo >= LOW_APOGEE_KM or peri <= 0:
            continue
        low.append({**base, "perigee_km": int(round(peri)), "apogee_km": int(round(apo)), "inc_deg": _num(r.get("INCLINATION")),
                    "period_min": _num(r.get("PERIOD")), "launched": r.get("LAUNCH_DATE") or ""})
    recent.sort(key=lambda x: (x["down"], x["id"] or 0), reverse=True)
    low.sort(key=lambda x: (x["perigee_km"] + x["apogee_km"], x["id"] or 0))
    return {
        "as_of": day.isoformat(),
        "low_apogee_km": LOW_APOGEE_KM,
        "recent_days": RECENT_DAYS,
        "came_down": len(recent),
        "recent": recent[:RECENT_SHOWN],
        "low_count": len(low),
        "lowest": low[:LOWEST_SHOWN],
    }


def quarter_ends(start: date, until: date) -> list[date]:
    out = []
    y, q = start.year, (start.month - 1) // 3 + 1
    while True:
        m = q * 3
        end = date(y, m, 31 if m in (3, 12) else 30)
        if end > until:
            return out
        if end >= start:
            out.append(end)
        q += 1
        if q > 4:
            q, y = 1, y + 1


def history(rows: list[dict], until: date, start: date = HISTORY_FROM) -> list[dict]:
    """One point a finished quarter: payloads and debris in Earth orbit at its end, orbital launches inside it."""
    out = []
    ends = quarter_ends(start, until)
    launched_in: dict[date, set] = {e: set() for e in ends}
    for r in rows:
        d = _day(r.get("LAUNCH_DATE"))
        intl = str(r.get("OBJECT_ID") or "")
        if not d or len(intl) < 8 or intl[:4] != str(d.year):
            continue
        for e in ends:
            if e - timedelta(days=92) < d <= e and (e.month - 1) // 3 == (d.month - 1) // 3 and e.year == d.year:
                launched_in[e].add(intl[:8])
                break
    for e in ends:
        s = summary(rows, e, live=False)
        out.append({"q": f"{e.year}-q{(e.month - 1) // 3 + 1}", "end": e.isoformat(), "payloads": s["earth_orbit"]["payload"],
                    "debris": s["earth_orbit"]["debris"], "total": s["earth_orbit"]["total"], "launches": len(launched_in[e])})
    return out
