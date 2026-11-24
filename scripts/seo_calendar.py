"""The calendar files of the sky-event pages (internal #105): one .ics per event page, and the feeds a calendar can subscribe to.

    events/<id>.ics        the one event, with a reminder the day before (the page's "Add to your calendar")
    events/sky-events.ics  every event
    events/showers.ics     the meteor showers          (registry/events.yaml `ics: showers.ics`)
    events/eclipses.ics    the solar and lunar eclipses (registry/events.yaml `ics: eclipses.ics`)
    events/moons.ics       the full Moons
    events/sky.ics         the solstices, the conjunctions and the mission events (registry/events.yaml `ics: sky.ics`)
    events/planets.ics     the conjunctions; events/seasons.ics the solstices; events/missions.ics the mission events (forge #553:
                           one feed per chip of the map's sky calendar)

Every entry names its page as URL and ends its description with the link that opens the map at that moment, so each calendar
entry is a way back. Nothing is personal: the files are built from the registry and carry no address, no name, no tracker.
The files are built the same way twice (DTSTAMP is the day the rows were checked, not the build's clock), so a rebuild that
changes no event changes no file. RFC 5545: CRLF line ends, lines folded at 75 octets, text escaped.
"""

from __future__ import annotations

import datetime as dt
from pathlib import Path

PRODID = "-//Space Radar//Sky events//EN"
# Which feed holds which kinds of event.
FEEDS = {
    "sky-events.ics": ("Space Radar: every sky event", None),
    "showers.ics": ("Space Radar: meteor showers", {"meteor-shower"}),
    "eclipses.ics": ("Space Radar: solar and lunar eclipses", {"eclipse", "lunar-eclipse"}),
    "moons.ics": ("Space Radar: full Moons", {"full-moon"}),
    "sky.ics": ("Space Radar: solstices, conjunctions and missions", {"season", "conjunction", "mission"}),
    # forge #553 (the map's sky calendar): one feed per chip of its filter, so "subscribe" means what the chip shows.
    "planets.ics": ("Space Radar: planets close together", {"conjunction"}),
    "seasons.ics": ("Space Radar: solstices", {"season"}),
    "missions.ics": ("Space Radar: mission events", {"mission"}),
}


def esc(text: str) -> str:
    return text.replace("\\", "\\\\").replace(";", "\;").replace(",", "\\,").replace("\r\n", "\\n").replace("\n", "\\n")


def fold(line: str) -> list[str]:
    """RFC 5545 3.1: no line longer than 75 octets; a break is CRLF and one space, and never inside a UTF-8 character."""
    out, cur, size = [], "", 0
    for ch in line:
        n = len(ch.encode("utf-8"))
        if size + n > (75 if not out else 74):
            out.append(cur)
            cur, size = "", 0
        cur += ch
        size += n
    out.append(cur)
    return [out[0]] + [" " + x for x in out[1:]]


def stamp(iso: str) -> str:
    d = dt.datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(dt.timezone.utc)
    return d.strftime("%Y%m%dT%H%M%SZ")


def vevent(e: dict, stamped: str, alarm: bool) -> list[str]:
    """`e`: id, name, kind, start (ISO UTC instant, or a date when `all_day`), all_day, minutes, description, url."""
    lines = ["BEGIN:VEVENT", f"UID:{e['id']}@spaceradar.ai", f"DTSTAMP:{stamp(stamped)}"]
    if e.get("all_day"):
        day = dt.date.fromisoformat(str(e["start"])[:10])
        lines += [f"DTSTART;VALUE=DATE:{day:%Y%m%d}", f"DTEND;VALUE=DATE:{day + dt.timedelta(days=1):%Y%m%d}"]
    else:
        a = dt.datetime.fromisoformat(e["start"].replace("Z", "+00:00")).astimezone(dt.timezone.utc)
        lines += [f"DTSTART:{a:%Y%m%dT%H%M%SZ}", f"DTEND:{a + dt.timedelta(minutes=e.get('minutes', 60)):%Y%m%dT%H%M%SZ}"]
    lines += [f"SUMMARY:{esc(e['name'])}", f"DESCRIPTION:{esc(e['description'])}", f"URL:{e['url']}", f"CATEGORIES:{esc(e['category'])}",
              "TRANSP:TRANSPARENT", "STATUS:CONFIRMED"]
    if alarm:
        lines += ["BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{esc(e['name'])}", "TRIGGER:-P1D", "END:VALARM"]
    lines.append("END:VEVENT")
    return lines


def calendar(name: str, events: list[dict], stamped: str, alarm: bool = False, feed: bool = False) -> str:
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", f"PRODID:{PRODID}", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", f"X-WR-CALNAME:{esc(name)}"]
    if feed:  # a subscribing calendar looks again once a day
        lines += ["REFRESH-INTERVAL;VALUE=DURATION:P1D", "X-PUBLISHED-TTL:PT24H"]
    for e in sorted(events, key=lambda x: (str(x["start"]), x["id"])):
        lines += vevent(e, stamped, alarm)
    lines.append("END:VCALENDAR")
    return "".join(f"{part}\r\n" for line in lines for part in fold(line))


def _write(path: Path, text: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as fh:  # newline="": the CRLF the format asks for is kept as written
        fh.write(text)


def write(out: Path, events: list[dict], stamped: str) -> list[str]:
    """Writes events/*.ics under `out`; returns the file names."""
    d = out / "events"
    d.mkdir(parents=True, exist_ok=True)
    names = []
    for e in events:
        _write(d / f"{e['id']}.ics", calendar(e["name"], [e], stamped, alarm=True))
        names.append(f"{e['id']}.ics")
    for fname, (title, kinds) in FEEDS.items():
        rows = [e for e in events if kinds is None or e["kind"] in kinds]
        if rows:
            _write(d / fname, calendar(title, rows, stamped, feed=True))
            names.append(fname)
    return names
