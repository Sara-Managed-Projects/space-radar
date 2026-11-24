"""GCAT's launch list (planet4589.org, J. McDowell, CC BY 4.0) cut to the orbital launch attempts: the launch archive.

The upstream is one tab-separated file, launch.tsv, of every launch GCAT records since 1942: 76 041 rows on 2026-11-23
(13.8 MB), most of them sounding rockets and missile tests. The archive (site/js/ui/launcharchive.js, forge #551) shows
the ORBITAL attempts only: the rows whose LaunchCode starts with `O` (7 223 that day). GCAT's own column notes
(https://planet4589.org/space/gcat/web/launch/lcols.html, read 2026-11-24) say what the code means: the first letter is
the category (O orbital), the second the outcome -- S success, F failure, U unknown, E a pad explosion (no launch, kept
"for completeness"), A a pad abort -- and two trailing digits, where present, the percent credited to a partial success
or failure (OS75, OF40).

THIS PARSER PACKS, as sea_grid does: the 13.8 MB is mostly suborbital rows and citations nobody here reads. `pack(body)`
keeps, per orbital attempt, the launch tag, the UTC date as GCAT gives it (to the second, the minute or the day), the
vehicle and its variant, the site code and pad, the payload (the Mission column, else the Flight column: GCAT says one of
them is usually the payload's name), the agency, the outcome code without its `O`, and the planned inclination where GCAT
gives one. The sites are joined from harvest/gcat_sites.json, the small table scripts/build-launches.py writes from GCAT's
sites.tsv: a site code not in it keeps its code and no place (the page says it cannot fly there), and the next
`build-launches.py --pull` adds it. Nothing is renamed, filled or reinterpreted.

The same function writes the bundled copy, site/data/launches.json (scripts/build-launches.py), so our saved copy
(/data/v1/gcat-launches.json) and the bundled one have one shape and the page one reader.

`count` is the orbital attempts, so an answer that lost half of them is refused by the never-worse guard; `newest` is the
latest of their dates (a launch a few days old: several fly every week).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

SITES_PATH = Path(__file__).resolve().parent.parent / "gcat_sites.json"
SOURCE_URL = "https://planet4589.org/space/gcat/tsv/launch/launch.tsv"
LICENCE = "CC BY 4.0"
CITATION = ("McDowell, Jonathan C., 2020. General Catalog of Artificial Space Objects, Release 1.8.9, "
            "https://planet4589.org/space/gcat")
_REQUIRED = ("Launch_Tag", "Launch_Date", "LV_Type", "Variant", "Flight", "Mission", "Launch_Site", "Launch_Pad",
             "Inc", "Agency", "LaunchCode")
_MONTHS = {m: i + 1 for i, m in enumerate(("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov",
                                            "Dec"))}
_DATE = re.compile(r"^(\d{4})\s+([A-Z][a-z]{2})(?:\s+(\d{1,2}))?(?:\s+(\d{2})(\d{2})(?::(\d{2}))?)?")
_UPDATED = re.compile(r"^#\s*Updated\s+(\d{4})\s+([A-Z][a-z]{2})\s+(\d{1,2})")
COLS = ["tag", "t", "veh", "site", "pad", "pay", "ag", "out", "inc"]


def _lines(body):
    if not isinstance(body, str):
        raise ValueError("GCAT answers tab-separated text")
    text = body.lstrip("﻿")
    if text.lstrip().startswith("<"):
        raise ValueError("GCAT answered HTML, not its launch list")
    lines = text.split("\n")
    if not lines or not lines[0].startswith("#Launch_Tag"):
        raise ValueError("launch.tsv's header line (#Launch_Tag ...) is missing")
    return lines


def _header(lines) -> list[str]:
    return [h.strip() for h in lines[0].lstrip("#").rstrip("\r").split("\t")]


def rows(body) -> list[dict]:
    """Every data row as a dict of stripped strings."""
    lines = _lines(body)
    hdr = _header(lines)
    out = []
    for ln in lines[1:]:
        if not ln.strip() or ln.startswith("#"):
            continue
        cells = [c.strip() for c in ln.rstrip("\r").split("\t")]
        out.append(dict(zip(hdr, cells)))
    return out


def orbital(body) -> list[dict]:
    return [r for r in rows(body) if r.get("LaunchCode", "")[:1] == "O"]


def validate(body) -> None:
    hdr = _header(_lines(body))
    missing = [c for c in _REQUIRED if c not in hdr]
    if missing:
        raise ValueError(f"launch.tsv's header lacks {', '.join(missing)}")


def count(body) -> int:
    validate(body)
    return len(orbital(body))


def utc(date: str) -> str | None:
    """GCAT's VagueDate as far as it goes: '1957 Oct  4 1928:34' -> '1957-10-04 19:28:34', '1960 Dec  1' -> '1960-12-01'.
    A trailing '?' (GCAT unsure) is dropped; the precision is the source's own."""
    m = _DATE.match((date or "").replace("?", "").strip())
    if not m or m.group(2) not in _MONTHS:
        return None
    y, mon, d, hh, mm, ss = m.groups()
    out = f"{y}-{_MONTHS[mon]:02d}"
    if d:
        out += f"-{int(d):02d}"
        if hh:
            out += f" {hh}:{mm}" + (f":{ss}" if ss else "")
    return out


def newest(body) -> str | None:
    """The latest orbital launch in the list, ISO, for the row's `content_max_age`."""
    ts = [utc(r["Launch_Date"]) for r in orbital(body)]
    ts = [t for t in ts if t and len(t) >= 10]
    if not ts:
        return None
    t = max(ts)
    return f"{t[:10]}T{(t[11:16] or '00:00')}:00Z"


def updated(body) -> str | None:
    """The day GCAT says it updated the file ('# Updated 2026 Nov 23 0025:09' -> '2026-11-23')."""
    for ln in _lines(body)[:5]:
        m = _UPDATED.match(ln)
        if m and m.group(2) in _MONTHS:
            return f"{m.group(1)}-{_MONTHS[m.group(2)]:02d}-{int(m.group(3)):02d}"
    return None


def _num(v: str):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return round(x, 1)


def _dash(v: str) -> str:
    return "" if v in ("", "-") else v


def load_sites(path: Path = SITES_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def pack(body, sites: dict | None = None) -> dict:
    """The archive's own file: string tables for the vehicles and agencies, a site table, one row per orbital attempt."""
    table = (sites or load_sites()).get("sites", {})
    veh, ag = [], []
    vi, ai = {}, {}

    def idx(v, lst, ix):
        if v not in ix:
            ix[v] = len(lst)
            lst.append(v)
        return ix[v]

    out_rows, used = [], {}
    for r in orbital(body):
        name = r["LV_Type"] + (f" {r['Variant']}" if _dash(r["Variant"]) else "")
        site = r["Launch_Site"].rstrip("?")
        if site in table:
            used[site] = table[site]
        pay = _dash(r["Mission"]) or _dash(r["Flight"])
        out_rows.append([
            r["Launch_Tag"], utc(r["Launch_Date"]), idx(name, veh, vi), site, _dash(r["Launch_Pad"]), pay,
            idx(_dash(r["Agency"]), ag, ai), r["LaunchCode"][1:], _num(r["Inc"]),
        ])
    return {
        "v": 1,
        "about": "Every orbital launch attempt in GCAT's launch list (LaunchCode O*), cut by harvest/parsers/gcat_launch.py",
        "source": SOURCE_URL,
        "licence": LICENCE,
        "citation": CITATION,
        "updated": updated(body),
        "count": len(out_rows),
        "sites": {k: used[k] for k in sorted(used)},
        "siteCols": ["name", "lat", "lon", "state", "cc"],
        "veh": veh,
        "ag": ag,
        "cols": COLS,
        "rows": out_rows,
    }
