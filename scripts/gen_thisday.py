#!/usr/bin/env python3
"""The home's "this day in space" (forge #546, ui/daycard.js), from registry/missions.yaml: one small file per month.

WHY NOT THE MISSIONS' MIRROR. site/js/data/missions.js is about 30 kB: every event's place, path and world for the
mission cards. The day card needs the events near one date, and it is on Today, so its bytes are the first minute's
(registry/budgets.yaml after_first_visit_bytes, measured by tests/test_first_visit_bytes.mjs --minute). So this writes
site/data/thisday/<MM>.json: the events whose anniversary falls in that month or within NEAR_DAYS of it, with only what
the card shows (the mission's name and source, the event's id, date, title and sentence). The page fetches this month's
file and nothing else. A `predicted` event (a pass still to come) is left out: the card never tells a plan.

Run:  python3 scripts/gen_thisday.py           # write them
      python3 scripts/gen_thisday.py --check   # exit 1 if a checked-in file is stale
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "registry" / "missions.yaml"
OUT = ROOT / "site" / "data" / "thisday"
NEAR_DAYS = 14  # ui/daycard.js NEAR_DAYS: the card looks this far either side of today


def month_window(month: int) -> tuple[int, int]:
    """Days from 1 January 2024 (a leap year) of a month widened by NEAR_DAYS each side; may run below 0 or past 365."""
    start = dt.date(2024, month, 1)
    end = dt.date(2024 + (month == 12), month % 12 + 1, 1) - dt.timedelta(days=1)
    jan1 = dt.date(2024, 1, 1)
    return (start - jan1).days - NEAR_DAYS, (end - jan1).days + NEAR_DAYS


def in_window(md: tuple[int, int], month: int) -> bool:
    lo, hi = month_window(month)
    day = (dt.date(2024, md[0], md[1]) - dt.date(2024, 1, 1)).days
    # A window that runs over the turn of the year (December into January, January back into December).
    return any(lo <= day + shift <= hi for shift in (-366, 0, 366))


def render() -> dict[str, str]:
    doc = yaml.safe_load(SRC.read_text(encoding="utf-8")) or {}
    events = []
    for m in doc.get("missions") or []:
        if not isinstance(m, dict):
            continue
        src = m.get("source") or {}
        for e in m.get("events") or []:
            if not isinstance(e, dict) or e.get("predicted") or not e.get("date"):
                continue
            when = str(e["date"])
            day = dt.date.fromisoformat(when[:10])
            events.append(({"mission": m.get("id"), "display": m.get("display"), "source": {"name": src.get("name"), "url": src.get("url")},
                            "id": e.get("id"), "date": when, "title": e.get("title"), "text": e.get("text")}, (day.month, day.day)))
    files = {}
    for month in range(1, 13):
        rows = [row for row, md in events if in_window(md, month)]
        body = {"note": f"GENERATED from registry/missions.yaml by scripts/gen_thisday.py: the events within {NEAR_DAYS} days of month {month:02d}, for the day card (ui/daycard.js). Do not edit.",
                "month": month, "events": rows}
        files[f"{month:02d}.json"] = json.dumps(body, ensure_ascii=False, separators=(",", ":")) + "\n"
    return files


def main() -> int:
    files = render()
    if "--check" in sys.argv:
        stale = [n for n, text in files.items() if not (OUT / n).exists() or (OUT / n).read_text(encoding="utf-8") != text]
        if stale:
            print(f"site/data/thisday is stale ({', '.join(stale)}): run python3 scripts/gen_thisday.py")
            return 1
        print(f"site/data/thisday is current (12 months, {sum(len(t) for t in files.values())} B)")
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    for n, text in files.items():
        (OUT / n).write_text(text, encoding="utf-8")
    print(f"wrote site/data/thisday/ (12 months, {sum(len(t) for t in files.values())} B)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
