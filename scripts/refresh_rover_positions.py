#!/usr/bin/env python3
"""Where Curiosity and Perseverance are: the rows `gale` and `jezero` of registry/sites.yaml, from NASA's waypoints.

    python3 scripts/refresh_rover_positions.py              read NASA's two files and rewrite the rows (network)
    python3 scripts/refresh_rover_positions.py --from DIR   the same from saved copies of the two files in DIR (no network)
    python3 scripts/refresh_rover_positions.py --check      no network, writes nothing: the rows are whole and can be rewritten

WHY. The two rovers that still drive were drawn at their landing sites, 14.3 km and 12.2 km from where NASA had them
(a review of positions, 2026-11-16). The rows are now the rover, and a rover moves: .github/workflows/rover-positions.yml
runs this on the first of each month and opens a pull request with what changed.

WHAT IS READ. The "current waypoint" layer of each mission map, one GeoJSON feature, the rover's latest position:
    https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints_current.json   Curiosity,    row `gale`
    https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints_current.json   Perseverance, row `jezero`
Its last feature's coordinates (east longitude, planetocentric latitude: the convention of registry/sites.yaml's Mars rows)
and its properties `sol` and `dist_total_m`.

WHAT IS WRITTEN, and nothing else:
  * registry/sites.yaml: in the two rows, the values of `lat`, `lon`, `as_of_sol`, `as_of` and `dist_total_m`, and the
    `read:` day of the reference each row cites. By a pattern on those values, in place: the file is never loaded and
    dumped, so every comment and every other byte stays. A row must be on one line with those fields; `--check` (CI) says
    so before a month's run finds out.
  * tests/fixtures/rover-waypoints.json: the waypoint each row was written from, its URL and the day read, which
    tests/test_rover_positions.mjs holds the rows to (a row moved by hand, with no waypoint behind it, fails there).
  * site/js/data/sites.js, by running scripts/gen_sites_js.py.
A rover that has not moved since the last run changes nothing, its `read:` day included: no pull request.

`as_of` IS WORKED OUT, NOT READ: the files give a sol and no Earth day. It is the UTC day on which that sol's local mean
noon fell, counted from one image of each mission whose UTC time and local mean solar time NASA's raw-image feeds give
together (ANCHORS below, read 2026-11-16), in sols of 88 775.244 s ("A Mars solar day has a mean period of 24 hours 39
minutes 35.244 seconds", NASA GISS, Mars24 technical notes, https://www.giss.nasa.gov/tools/mars24/help/notes.html, read
2026-11-16). Checked the same day against NASA's own pairs: Curiosity "November 7, 2026, Sol 5067"
(https://science.nasa.gov/blog/curiosity-blog-sols-5063-5069-rocks-and-chips/) and Perseverance "Sol 2006 (Oct. 11, 2026)"
(https://science.nasa.gov/blog/tracks-along-the-longest-drive-on-another-world/); tests/test_refresh_rover_positions.py
holds both.

IT REFUSES, and writes nothing, when a file is not one it can read (no features, a coordinate that is not a number), when
the sol went backwards, or when the new position is more than 50 km from the row's (a month of driving is a few
kilometres; anything more is a broken file or a different frame, and a person should look). Python 3 standard library
and PyYAML; no other dependency.
"""
from __future__ import annotations

import datetime
import json
import math
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITES = ROOT / "registry" / "sites.yaml"
FIXTURE = ROOT / "tests" / "fixtures" / "rover-waypoints.json"
UA = "SpaceRadar-build/2.0 (https://spaceradar.ai; https://github.com/Sara-Managed-Projects/space-radar/issues)"

SOL_SECONDS = 88775.244
MARS_RADIUS_KM = 3389.5  # the mean radius; only the two guards below use it
MAX_JUMP_KM = 50.0       # between one run and the next

# One row a rover. `anchor`: (sol, UTC instant, local mean solar time on that sol) of one image, from NASA's raw-image feed
# of the mission, read 2026-11-16:
#   Curiosity     https://mars.nasa.gov/api/v1/raw_image_items/?condition_1=msl:mission&condition_2=5073:sol
#                 `date_taken` 2026-11-13T12:15:37.000Z, `extended.lmst` "Sol-05073M11:00:35.199"
#   Perseverance  https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&sol=2022
#                 `date_taken_utc` 2026-10-28T02:49:37.023, `date_taken_mars` "Sol-02022M08:06:15.760"
ROVERS = {
    "gale": {
        "rover": "Curiosity",
        "url": "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints_current.json",
        "file": "MSL_waypoints_current.json",
        "reference": "msl-rover-waypoints-current",
        "landing": "bradbury-landing",
        "anchor": (5073, "2026-11-13T12:15:37.000", "11:00:35.199"),
    },
    "jezero": {
        "rover": "Perseverance",
        "url": "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints_current.json",
        "file": "M20_waypoints_current.json",
        "reference": "m20-rover-waypoints-current",
        "landing": "octavia-e-butler-landing",
        "anchor": (2022, "2026-10-28T02:49:37.023", "08:06:15.760"),
    },
}
FIELDS = ("lat", "lon", "as_of_sol", "as_of", "dist_total_m")
NUMBER = r"-?\d+(?:\.\d+)?"
VALUE = {"lat": NUMBER, "lon": NUMBER, "as_of_sol": r"\d+", "as_of": r"\d{4}-\d{2}-\d{2}", "dist_total_m": NUMBER}


class Refused(Exception):
    """A file or a row this script will not write from. The message is the whole report."""


# ------------------------------------------------------------------------------------------- the waypoint
def last_waypoint(doc: object, where: str = "the file") -> dict:
    """{sol, lat, lon, dist_total_m} of the last feature of a mission map's waypoint GeoJSON."""
    feats = doc.get("features") if isinstance(doc, dict) else None
    if not isinstance(feats, list) or not feats:
        raise Refused(f"{where} has no features: not a waypoint layer")
    feat = feats[-1] if isinstance(feats[-1], dict) else {}
    props = feat.get("properties") if isinstance(feat.get("properties"), dict) else {}
    coords = (feat.get("geometry") or {}).get("coordinates") if isinstance(feat.get("geometry"), dict) else None

    def number(v: object, what: str) -> float:
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
            raise Refused(f"{where}: {what} is {v!r}, not a number")
        return v

    if not isinstance(coords, list) or len(coords) < 2:
        raise Refused(f"{where}: the last feature has no point coordinates")
    lon, lat = number(coords[0], "the longitude"), number(coords[1], "the latitude")
    sol = number(props.get("sol"), "`sol`")
    dist = number(props.get("dist_total_m"), "`dist_total_m`")
    if sol != int(sol) or sol < 0:
        raise Refused(f"{where}: `sol` is {sol!r}, not a whole sol")
    if not -90 <= lat <= 90 or not 0 <= lon < 360:
        raise Refused(f"{where}: {lat}, {lon} is not a planetocentric latitude and an east longitude 0-360")
    if dist < 0:
        raise Refused(f"{where}: `dist_total_m` is {dist!r}")
    return {"sol": int(sol), "lat": lat, "lon": lon, "dist_total_m": dist}


def sol_date(site: str, sol: int) -> datetime.date:
    """The UTC day on which local mean noon of `sol` fell, for the rover of row `site` (the docstring says from what)."""
    a_sol, a_utc, a_lmst = ROVERS[site]["anchor"]
    h, m, s = a_lmst.split(":")
    local_sols = (int(h) * 3600 + int(m) * 60 + float(s)) / 86400.0  # a sol's 24 "hours" are the whole sol
    at = datetime.datetime.fromisoformat(a_utc)
    noon = at + datetime.timedelta(seconds=((sol - a_sol) + 0.5 - local_sols) * SOL_SECONDS)
    return noon.date()


def km_between(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * MARS_RADIUS_KM * math.asin(min(1.0, math.sqrt(h)))


def number_text(v: float) -> str:
    """A number as the file wrote it: Python reads 137.388886 and writes 137.388886, the shortest text that reads back."""
    return str(v) if isinstance(v, int) else repr(float(v))


# ------------------------------------------------------------------------------------------- the rows
def row_line(text: str, site: str) -> re.Match:
    """The one line of registry/sites.yaml that is the row `site`."""
    found = list(re.finditer(r"^  - \{id: " + re.escape(site) + r",[^\n]*\}[ \t]*$", text, re.M))
    if len(found) != 1:
        raise Refused(f"registry/sites.yaml: the row `{site}` must be one line `  - {{id: {site}, ...}}` "
                      f"(found {len(found)}); this script rewrites five values in that line and nothing else")
    return found[0]


def row_values(text: str, site: str) -> dict:
    """The five values of the row, as text, read by the same patterns that rewrite them."""
    line = row_line(text, site).group(0)
    out = {}
    for key in FIELDS:
        got = re.findall(r"(?<![\w-])" + key + r": (" + VALUE[key] + r")(?=[,}])", line)
        if len(got) != 1:
            raise Refused(f"registry/sites.yaml[{site}]: `{key}:` must be written once in the row, as a plain value "
                          f"(found {len(got)})")
        out[key] = got[0]
    return out


def rewrite_row(text: str, site: str, wp: dict, as_of: datetime.date) -> str:
    """`text` with the row's lat, lon, as_of_sol, as_of and dist_total_m set from the waypoint. Nothing else changes."""
    row_values(text, site)  # every field is there, once
    m = row_line(text, site)
    line = m.group(0)
    new = {"lat": number_text(wp["lat"]), "lon": number_text(wp["lon"]), "as_of_sol": str(int(wp["sol"])),
           "as_of": as_of.isoformat(), "dist_total_m": number_text(wp["dist_total_m"])}
    for key in FIELDS:
        line = re.sub(r"(?<![\w-])" + key + r": " + VALUE[key] + r"(?=[,}])", lambda _m, k=key: f"{k}: {new[k]}", line, count=1)
    return text[:m.start()] + line + text[m.end():]


def rewrite_read(text: str, reference: str, day: datetime.date) -> str:
    """`text` with the `read:` day of one `references:` entry set."""
    pat = re.compile(r"(^  " + re.escape(reference) + r":\n    url: [^\n]*\n    read: )\d{4}-\d{2}-\d{2}([ \t]*$)", re.M)
    if len(pat.findall(text)) != 1:
        raise Refused(f"registry/sites.yaml: the reference `{reference}` must open with its `url:` line and then `read:`")
    return pat.sub(lambda m: m.group(1) + day.isoformat() + m.group(2), text, count=1)


def landing_of(text: str, site: str) -> tuple[float, float]:
    line = row_line(text, ROVERS[site]["landing"]).group(0)
    lat = re.search(r"(?<![\w-])lat: (" + NUMBER + r")(?=[,}])", line)
    lon = re.search(r"(?<![\w-])lon: (" + NUMBER + r")(?=[,}])", line)
    if not lat or not lon:
        raise Refused(f"registry/sites.yaml[{ROVERS[site]['landing']}]: no lat and lon in the row")
    return float(lat.group(1)), float(lon.group(1))


def apply(text: str, waypoints: dict, today: datetime.date) -> tuple[str, list[str], dict]:
    """The new registry text, what changed in words, and the fixture rows. Raises Refused before changing anything."""
    notes, fixture = [], {}
    out = text
    for site, cfg in ROVERS.items():
        wp = waypoints[site]
        was = row_values(text, site)
        old_lat, old_lon, old_sol = float(was["lat"]), float(was["lon"]), int(was["as_of_sol"])
        if wp["sol"] < old_sol:
            raise Refused(f"{cfg['rover']}: NASA's file says sol {wp['sol']} and the row is already at sol {old_sol}; "
                          f"a waypoint does not go back in time")
        moved_km = km_between(old_lat, old_lon, wp["lat"], wp["lon"])
        if moved_km > MAX_JUMP_KM:
            raise Refused(f"{cfg['rover']}: the new waypoint is {moved_km:.1f} km from the row's, more than {MAX_JUMP_KM:g} km "
                          f"in one run; look at {cfg['url']} before anything is written")
        as_of = sol_date(site, wp["sol"])
        new = rewrite_row(out, site, wp, as_of)
        changed = new != out
        fixture[site] = {"rover": cfg["rover"], "url": cfg["url"], "sol": wp["sol"], "lat": wp["lat"], "lon": wp["lon"],
                         "dist_total_m": wp["dist_total_m"], "as_of": as_of.isoformat(), "changed": changed}
        if changed:
            out = rewrite_read(new, cfg["reference"], today)
            land = landing_of(text, site)
            notes.append(f"{cfg['rover']}: sol {old_sol} -> sol {wp['sol']} ({as_of.isoformat()}), moved {moved_km * 1000:.0f} m, "
                         f"now {km_between(land[0], land[1], wp['lat'], wp['lon']):.1f} km from its landing place, "
                         f"{wp['dist_total_m'] / 1000:.2f} km by the file's dist_total_m")
        else:
            notes.append(f"{cfg['rover']}: still at sol {old_sol}, nothing to write")
    return out, notes, fixture


def fixture_text(fixture: dict, before: dict, today: datetime.date) -> str:
    """tests/fixtures/rover-waypoints.json: a rover that did not change keeps the day it was last read."""
    rows = {}
    for site, row in fixture.items():
        kept = (before.get("rovers") or {}).get(site) or {}
        read = today.isoformat() if row["changed"] or not kept.get("read") else kept["read"]
        rows[site] = {"rover": row["rover"], "url": row["url"], "read": read, "sol": row["sol"], "lat": row["lat"],
                      "lon": row["lon"], "dist_total_m": row["dist_total_m"], "as_of": row["as_of"]}
    doc = {
        "what": "The last waypoint of NASA's current-position file for each rover that still drives, as "
                "scripts/refresh_rover_positions.py read it: the rows `gale` and `jezero` of registry/sites.yaml are "
                "written from these, and tests/test_rover_positions.mjs holds them to these. Written by that script; "
                "do not edit.",
        "rovers": rows,
    }
    return json.dumps(doc, indent=1, ensure_ascii=False) + "\n"


# ------------------------------------------------------------------------------------------- reading
def fetch(url: str) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310 -- two fixed https URLs, named above
        return json.loads(resp.read().decode("utf-8"))


def read_waypoints(source: Path | None) -> dict:
    out = {}
    for site, cfg in ROVERS.items():
        if source is None:
            doc, where = fetch(cfg["url"]), cfg["url"]
        else:
            path = source / cfg["file"]
            doc, where = json.loads(path.read_text(encoding="utf-8")), str(path)
        out[site] = last_waypoint(doc, where)
    return out


def check(text: str) -> list[str]:
    """What is wrong with the two rows as they stand, with no network. An empty list is a pass."""
    import yaml

    bad = []
    rows = {r.get("id"): r for r in (yaml.safe_load(text) or {}).get("sites") or [] if isinstance(r, dict)}
    for site, cfg in ROVERS.items():
        try:
            was = row_values(text, site)
            # Writing a row's own values back must change nothing: the patterns find exactly what they would write.
            num = lambda s: int(s) if re.fullmatch(r"-?\d+", s) else float(s)  # noqa: E731 -- 46010 stays 46010
            wp = {"lat": num(was["lat"]), "lon": num(was["lon"]), "sol": int(was["as_of_sol"]), "dist_total_m": num(was["dist_total_m"])}
            again = rewrite_row(text, site, wp, datetime.date.fromisoformat(was["as_of"]))
            if again != text:
                bad.append(f"registry/sites.yaml[{site}]: its numbers are not written the way this script writes them "
                           f"(rewriting the row with its own values changed it)")
            rewrite_read(text, cfg["reference"], datetime.date(2000, 1, 1))
            landing_of(text, site)
        except Refused as e:
            bad.append(str(e))
            continue
        row = rows.get(site) or {}
        for key in FIELDS:
            if str(row.get(key)) != was[key]:
                bad.append(f"registry/sites.yaml[{site}]: `{key}` reads as {row.get(key)!r} in YAML and as {was[key]} by pattern")
        want = sol_date(site, int(was["as_of_sol"])).isoformat()
        if was["as_of"] != want:
            bad.append(f"registry/sites.yaml[{site}]: as_of {was['as_of']} is not the day of sol {was['as_of_sol']} ({want})")
        if row.get("source") != cfg["reference"]:
            bad.append(f"registry/sites.yaml[{site}]: cites `{row.get('source')}`, not `{cfg['reference']}`")
        if cfg["landing"] not in rows:
            bad.append(f"registry/sites.yaml: no row `{cfg['landing']}`, the landing place of `{site}`")
    return bad


def main(argv: list[str]) -> int:
    known = {"--check", "--from", "--no-generate"}
    source = None
    args = list(argv)
    opts = set()
    while args:
        a = args.pop(0)
        if a not in known:
            print(f"unknown option: {a}\n\n{(__doc__ or '').strip()}", file=sys.stderr)
            return 2
        if a == "--from":
            if not args:
                print("--from needs a directory", file=sys.stderr)
                return 2
            source = Path(args.pop(0))
        opts.add(a)
    text = SITES.read_text(encoding="utf-8")
    if "--check" in opts:
        bad = check(text)
        for b in bad:
            print("  " + b, file=sys.stderr)
        if bad:
            print(f"rover positions: {len(bad)} problem(s); scripts/refresh_rover_positions.py could not rewrite these rows", file=sys.stderr)
            return 1
        print("rover positions: the rows gale and jezero are whole, each on one line, and their days are their sols'")
        return 0
    today = datetime.datetime.now(datetime.timezone.utc).date()
    try:
        new, notes, fixture = apply(text, read_waypoints(source), today)
    except (Refused, OSError, ValueError) as e:
        print(f"rover positions: refused, nothing written. {e}", file=sys.stderr)
        return 1
    for n in notes:
        print(n)
    before = json.loads(FIXTURE.read_text(encoding="utf-8")) if FIXTURE.exists() else {}
    fx = fixture_text(fixture, before, today)
    if new != text:
        SITES.write_text(new, encoding="utf-8")
    if not FIXTURE.exists() or FIXTURE.read_text(encoding="utf-8") != fx:
        FIXTURE.write_text(fx, encoding="utf-8")
    if new != text and "--no-generate" not in opts:
        done = subprocess.run([sys.executable, str(ROOT / "scripts" / "gen_sites_js.py")], cwd=ROOT)
        if done.returncode:
            return done.returncode
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
