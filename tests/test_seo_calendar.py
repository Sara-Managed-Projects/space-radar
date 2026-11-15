#!/usr/bin/env python3
"""tests/test_seo_calendar.py -- the calendar files of the sky-event pages (scripts/seo_calendar.py, internal #105).

Held without a build: RFC 5545's line rules (CRLF, 75 octets, escapes), the same bytes twice, one VEVENT per event with a URL back to
its page and the map link in its description, an all-day mission, and the feeds each holding the kinds registry/events.yaml names.
    python3 tests/test_seo_calendar.py
"""
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import seo_calendar as C  # noqa: E402

problems = []


def check(ok, msg):
    if not ok:
        problems.append(msg)


check(C.esc("a, b; c\\d\ne") == "a\\, b\; c\\\\d\\ne", "text is escaped: comma, semicolon, backslash, newline")
long = "Ünïcode " * 30
folded = C.fold("DESCRIPTION:" + long)
check(all(len(x.encode("utf-8")) <= 75 for x in folded), "no folded line is over 75 octets")
check("".join(x[1:] if i else x for i, x in enumerate(folded)) == "DESCRIPTION:" + long, "unfolding gives the line back, no character split")
check(C.stamp("2026-11-15T00:00:00Z") == "20261115T000000Z", "a stamp is UTC basic format")

host = "https://www.spaceradar.ai"
ev = [
    {"id": "geminids-2026", "kind": "meteor-shower", "name": "Geminids 2026", "start": "2026-12-14T02:00:00Z", "all_day": False, "minutes": 120,
     "description": f"Peak, with a Moon, and more. Open the map at that moment: {host}/#t=2026-12-14T02:00:00Z&at=moon", "url": f"{host}/events/geminids-2026.html", "category": "Meteor shower"},
    {"id": "bepicolombo-mercury-2026", "kind": "mission", "name": "BepiColombo reaches Mercury orbit", "start": "2026-11-21", "all_day": True,
     "description": "Orbit insertion.", "url": f"{host}/events/bepicolombo-mercury-2026.html", "category": "Mission event"},
    {"id": "full-moon-2026-12-24", "kind": "full-moon", "name": "Full Moon, 24 December 2026", "start": "2026-12-24T01:00:00Z", "all_day": False,
     "description": "Full.", "url": f"{host}/events/full-moon-2026-12-24.html", "category": "Full moon"},
]
one = C.calendar(ev[0]["name"], [ev[0]], "2026-11-15T00:00:00Z", alarm=True)
check(one.startswith("BEGIN:VCALENDAR\r\n") and one.endswith("END:VCALENDAR\r\n") and "\n" not in one.replace("\r\n", ""), "CRLF line ends, one VCALENDAR")
check(one.count("BEGIN:VEVENT") == 1 and "UID:geminids-2026@spaceradar.ai" in one, "one VEVENT with a stable UID")
check("DTSTART:20261214T020000Z" in one and "DTEND:20261214T040000Z" in one, "the start and a two-hour end, in UTC")
check("URL:https://www.spaceradar.ai/events/geminids-2026.html" in one, "the entry names its page")
unfolded = one.replace("\r\n ", "")
check("Open the map at that moment: https://www.spaceradar.ai/#t=2026-12-14T02:00:00Z&at=moon" in unfolded, "the description ends on the map link")
check("BEGIN:VALARM" in one and "TRIGGER:-P1D" in one, "a single event carries a reminder the day before")
check(one == C.calendar(ev[0]["name"], [ev[0]], "2026-11-15T00:00:00Z", alarm=True), "the same input gives the same bytes")
mission = C.calendar("m", [ev[1]], "2026-11-15T00:00:00Z")
check("DTSTART;VALUE=DATE:20261121" in mission and "DTEND;VALUE=DATE:20261122" in mission, "a mission is an all-day entry")
check("VALARM" not in mission and "REFRESH-INTERVAL" not in mission, "no reminder in a feed's entry, no refresh line on a plain calendar")

with tempfile.TemporaryDirectory() as d:
    names = C.write(Path(d), ev, "2026-11-15T00:00:00Z")
    got = {p.name for p in (Path(d) / "events").iterdir()}
    check(got == set(names), "write() returns what it wrote")
    check({"geminids-2026.ics", "full-moon-2026-12-24.ics", "bepicolombo-mercury-2026.ics", "sky-events.ics", "showers.ics", "moons.ics", "sky.ics"} <= got,
          f"a file per event and the feeds that have events ({sorted(got)})")
    check("eclipses.ics" not in got, "a feed with no event is not written")
    allf = (Path(d) / "events" / "sky-events.ics").read_text(encoding="utf-8")
    check(allf.count("BEGIN:VEVENT") == 3 and "REFRESH-INTERVAL;VALUE=DURATION:P1D" in allf, "the all-events feed holds all three and asks to be read daily")
    check((Path(d) / "events" / "showers.ics").read_text(encoding="utf-8").count("BEGIN:VEVENT") == 1, "the showers feed holds the shower only")
    starts = re.findall(r"DTSTART[^:]*:(\d+)", allf)
    check(starts == sorted(starts), "entries are in date order")

reg = (ROOT / "registry/events.yaml").read_text(encoding="utf-8")
# registry/events.yaml also names launches.ics and close-approaches.ics: feeds of the Next view, not of these pages.
for f in ("showers.ics", "eclipses.ics", "sky.ics"):
    check(f"ics: {f}" in reg and f in C.FEEDS, f"{f} is named by registry/events.yaml and built by scripts/seo_calendar.py")

if problems:
    print("calendar FAILED:\n  " + "\n  ".join(problems))
    sys.exit(1)
print("calendar ok: RFC 5545 lines, stable bytes, one event per file with its page and map link, the feeds")
