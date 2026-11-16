#!/usr/bin/env python3
"""Where each IANA time zone is, for Tonight's first guess of a place (site/data/zones.json).

    python3 scripts/gen_zone_places.py [--zoneinfo /usr/share/zoneinfo]     # write site/data/zones.json
    python3 scripts/gen_zone_places.py --check                             # the file is well formed (CI; needs no tz database)

WHY (review of 16 Nov 2026). With no place set, the map guesses one from the browser's time zone. It knew 80 cities; for
any other zone it took the city with the same clock nearest the zone's meridian, whatever its latitude: Australia/Perth
became Manila (5 205 km, the other hemisphere), Europe/Athens became Helsinki, America/Winnipeg became Bogota. The
time zone database itself says where each zone is: zone.tab has a `coordinates` column for every zone, the place the
zone is named for. This copies those into one small file, fetched only when a guess needs it.

SOURCE. The IANA Time Zone Database's zone.tab, which is in the public domain ("This file is in the public domain",
its first lines). Read from this machine's copy of the database (--zoneinfo), whose release is in its +VERSION file.
Old names a browser may still report (Asia/Calcutta, Europe/Kiev, America/Buenos_Aires: the database's `backward`
links) are found in the same copy: a zone file that is byte for byte the file of exactly one zone.tab zone is another
name for it. A name that matches several (zones that share their rules) is left out rather than guessed.

Coordinates are rounded to 0.01 degree: zone.tab gives them to the arc minute, and a first guess needs no more.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "data" / "zones.json"
COORD = re.compile(r"^([+-])(\d{2})(\d{2})(\d{2})?([+-])(\d{3})(\d{2})(\d{2})?$")


def degrees(text: str) -> tuple[float, float]:
    m = COORD.match(text)
    if not m:
        raise ValueError(f"not an ISO 6709 coordinate: {text}")
    lat = int(m.group(2)) + int(m.group(3)) / 60 + int(m.group(4) or 0) / 3600
    lon = int(m.group(6)) + int(m.group(7)) / 60 + int(m.group(8) or 0) / 3600
    return (round(-lat if m.group(1) == "-" else lat, 2), round(-lon if m.group(5) == "-" else lon, 2))


def read_tab(path: Path) -> dict[str, list]:
    zones: dict[str, list] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        lat, lon = degrees(parts[1])
        zones[parts[2]] = [lat, lon, parts[0]]
    return zones


def aliases_of(zoneinfo: Path, zones: dict[str, list]) -> dict[str, str]:
    by_hash: dict[str, list[str]] = {}
    for name in zones:
        f = zoneinfo / name
        if f.is_file():
            by_hash.setdefault(hashlib.sha256(f.read_bytes()).hexdigest(), []).append(name)
    out: dict[str, str] = {}
    for f in sorted(zoneinfo.rglob("*")):
        if not f.is_file():
            continue
        name = f.relative_to(zoneinfo).as_posix()
        # names a browser can report: Region/City, or one of the old single words; not the tables, not posix/ or right/
        if name in zones or name.startswith(("posix/", "right/", "Etc/")) or not re.match(r"^[A-Z][A-Za-z_+-]*(/[A-Za-z0-9_+-]+)*$", name):
            continue
        data = f.read_bytes()
        if not data.startswith(b"TZif"):
            continue
        same = by_hash.get(hashlib.sha256(data).hexdigest(), [])
        if len(same) == 1:
            out[name] = same[0]
    return out


def check(path: Path) -> list[str]:
    problems = []
    doc = json.loads(path.read_text(encoding="utf-8"))
    zones, aliases = doc.get("zones", {}), doc.get("aliases", {})
    if len(zones) < 400:
        problems.append(f"only {len(zones)} zones")
    for name, row in zones.items():
        if not (isinstance(row, list) and len(row) == 3 and -90 <= row[0] <= 90 and -180 <= row[1] <= 180 and re.match(r"^[A-Z]{2}$", row[2])):
            problems.append(f"{name}: not [lat, lon, country]: {row}")
    for old, new in aliases.items():
        if new not in zones or old in zones:
            problems.append(f"alias {old} -> {new} does not name a zone of the table")
    if not re.search(r"release \S+", doc.get("source", "")):
        problems.append("the source line does not name the database's release")
    return problems


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--zoneinfo", default="/usr/share/zoneinfo", help="a copy of the IANA time zone database with zone.tab in it")
    ap.add_argument("--read", default="", help="the day the database was read, YYYY-MM-DD (kept in the file's source line)")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    if args.check:
        problems = check(OUT)
        for p in problems:
            print(p, file=sys.stderr)
        if not problems:
            doc = json.loads(OUT.read_text(encoding="utf-8"))
            print(f"zones ok: {len(doc['zones'])} zones with a place, {len(doc['aliases'])} older names")
        return 1 if problems else 0
    zi = Path(args.zoneinfo)
    zones = read_tab(zi / "zone.tab")
    version = (zi / "+VERSION").read_text(encoding="utf-8").strip() if (zi / "+VERSION").exists() else "unknown"
    doc = {
        "source": f"IANA Time Zone Database, zone.tab (public domain), release {version}" + (f", read {args.read}" if args.read else ""),
        "about": "zone -> [latitude, longitude, ISO 3166 country code] of the zone's principal location, to 0.01 degree; aliases: older names of the same zones",
        "zones": dict(sorted(zones.items())),
        "aliases": dict(sorted(aliases_of(zi, zones).items())),
    }
    OUT.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(doc['zones'])} zones, {len(doc['aliases'])} older names, {OUT.stat().st_size} B")
    return 0


if __name__ == "__main__":
    sys.exit(main())
