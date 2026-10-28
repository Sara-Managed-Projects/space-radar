#!/usr/bin/env python3
"""The small complete lists of release 1.5.0 (0079 a6, internal #1064), written to site/data/lists/.

    python3 scripts/gen_small_lists.py                 # all four, from the cached downloads (fetches what is missing)
    python3 scripts/gen_small_lists.py --refresh       # download everything again
    python3 scripts/gen_small_lists.py --only showers  # one of: showers observatories launch-sites landing-sites

Downloads go to ~/.cache/spaceradar-src/small-lists/ and are not committed; the four JSON files are.
Every list loads on demand (site/js/data/smalllists.js), never at boot.

  showers.json        The IAU Meteor Data Center's ESTABLISHED meteor showers (the file
                      streamestablisheddata2026.txt, "Last update: Oct 23, 2026"): 172 showers, one row each, from
                      776 published solutions. A shower's radiant, speed and peak solar longitude are the MEDIAN of
                      its solutions, because the MDC keeps every solution and names none "the" value. The eight
                      showers of registry/showers.yaml are in it too, tagged `ours`, so the card can say they are
                      the same ones Coming up lists and the sky view marks. (The issue said 113; the MDC says 172
                      today, 171 with an IAU number and one, the xi-Serpentids, waiting for one.)
  observatories.json  Wikidata (CC0): every item that is an observatory (or a kind of one) with coordinates on the
                      Earth, 3 526 on 2026-10-28; joined by MPC code to the Minor Planet Center's observatory
                      codes (ObsCodes.html), whose rows that Wikidata does not have are added, placed from the MPC's
                      own parallax constants. A Wikidata row and an MPC row within 3 km that share a name word are
                      one observatory. Rows within 1.5 km of a dish of registry/sites.yaml are dropped: those are there.
  launch-sites.json   Wikidata (CC0): spaceports and launch sites with coordinates. A launch complex within 15 km of
                      a bigger site is part of it and is not a row; so is anything within 3 km of a hand-kept pad.
  landing-sites.json  The Moon: NASA NSSDCA's Table of Anthropogenic Impacts and Spacecraft on the Moon (public
                      domain). The rest: registry/landing-sites-1-5.yaml. A row within 2 km of a row of
                      registry/sites.yaml on the same world is dropped: Apollo 11 is there once.

Wikidata and the MPC are asked politely (one request each, a User-Agent that says who we are).
"""
from __future__ import annotations

import csv
import gzip
import html
import io
import json
import math
import re
import statistics
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path.home() / ".cache/spaceradar-src/small-lists"
OUT = ROOT / "site/data/lists"
AS_OF = "2026-10-28"
UA = "SpaceRadar-build/1.5 (https://spaceradar.ai; sushkov.ivan91@gmail.com)"

SHOWERS_URL = "http://www.ta3.sk/IAUC22DB/MDC2022/Etc/streamestablisheddata2026.txt"
MPC_URL = "https://www.minorplanetcenter.net/iau/lists/ObsCodes.html"
NSSDCA_URL = "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html"
WIKIDATA = "https://query.wikidata.org/sparql"

OBS_RQ = """SELECT ?item ?itemLabel ?coord ?mpc ?countryLabel ?dissolved ?inception ?sl WHERE {
  ?item wdt:P31/wdt:P279* wd:Q62832 ; p:P625/psv:P625 ?cv .
  ?cv wikibase:geoGlobe wd:Q2 ; wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  BIND(CONCAT(STR(?lat)," ",STR(?lon)) AS ?coord)
  OPTIONAL { ?item wdt:P717 ?mpc }
  OPTIONAL { ?item wdt:P17 ?country }
  OPTIONAL { ?item wdt:P576 ?dissolved }
  OPTIONAL { ?item wdt:P571 ?inception }
  ?item wikibase:sitelinks ?sl .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}"""
LAUNCH_RQ = """SELECT ?item ?itemLabel ?coord ?countryLabel ?dissolved ?inception ?sl WHERE {
  VALUES ?cl { wd:Q194188 wd:Q1933026 wd:Q123179575 }
  ?item wdt:P31 ?cl ; p:P625/psv:P625 ?cv .
  ?cv wikibase:geoGlobe wd:Q2 ; wikibase:geoLatitude ?lat ; wikibase:geoLongitude ?lon .
  BIND(CONCAT(STR(?lat)," ",STR(?lon)) AS ?coord)
  OPTIONAL { ?item wdt:P17 ?country }
  OPTIONAL { ?item wdt:P576 ?dissolved }
  OPTIONAL { ?item wdt:P571 ?inception }
  ?item wikibase:sitelinks ?sl .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}"""

RADIUS_KM = {"earth": 6371.0, "moon": 1737.4, "mars": 3389.5, "venus": 6051.8}


# --------------------------------------------------------------------------- downloads
def fetch(url: str, name: str, refresh: bool, query: str | None = None, accept: str | None = None) -> bytes:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if path.exists() and not refresh:
        return path.read_bytes()
    if query is not None:
        url = url + "?" + urllib.parse.urlencode({"query": query})
    req = urllib.request.Request(url, headers={"User-Agent": UA, **({"Accept": accept} if accept else {})})
    with urllib.request.urlopen(req, timeout=170) as resp:  # noqa: S310 -- fixed https hosts, listed above
        data = resp.read()
    path.write_bytes(data)
    print(f"  fetched {name}: {len(data)} B")
    return data


def hav_km(radius: float, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


def sites_yaml() -> list[dict]:
    doc = yaml.safe_load((ROOT / "registry/sites.yaml").read_text(encoding="utf-8"))
    return [r for r in doc["sites"] if isinstance(r, dict) and r.get("lat") is not None]


def write(name: str, doc: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    path.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)}: {path.stat().st_size} B, gzip {len(gzip.compress(path.read_bytes(), 9))} B")


def slug(s: str) -> str:
    s = s.lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


# --------------------------------------------------------------------------- meteor showers
GREEK = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega".split()


def shower_name(raw: str) -> str:
    n = raw.strip()
    m = re.match(r"^(%s)-(.+)$" % "|".join(GREEK), n)
    if m:
        n = f"{m.group(1).capitalize()} {m.group(2)}"
    return n


def sol_to_md_2026(sol_j2000: float) -> str:
    """The calendar date (UTC, month-day) in 2026 on which the Sun's longitude (J2000) reaches `sol`. Meeus ch. 25 to 0.01 degree."""
    import datetime as dt
    target = sol_j2000 % 360
    best = None
    for d in range(366):
        day = dt.date(2026, 1, 1) + dt.timedelta(days=d)
        jd = day.toordinal() + 1721424.5 + 0.5  # noon UT
        T = (jd - 2451545.0) / 36525.0
        L0 = 280.46646 + 36000.76983 * T
        M = math.radians(357.52911 + 35999.05029 * T)
        C = 1.914602 * math.sin(M) + 0.019993 * math.sin(2 * M) + 0.000289 * math.sin(3 * M)
        lon_date = (L0 + C) % 360
        lon_j2000 = (lon_date - 0.01397 * (2026 - 2000) * 1.0 + 0.0) % 360  # precession since J2000: 1.397 degrees a century
        diff = abs((lon_j2000 - target + 180) % 360 - 180)
        if best is None or diff < best[0]:
            best = (diff, day)
    return best[1].strftime("%m-%d")


def build_showers(refresh: bool) -> None:
    raw = fetch(SHOWERS_URL, "streamestablisheddata2026.txt", refresh).decode("latin-1")
    rows = [next(csv.reader([ln], delimiter="|", quotechar='"')) for ln in raw.splitlines() if ln.startswith('"')]
    ours = {r["id"]: r for r in yaml.safe_load((ROOT / "registry/showers.yaml").read_text(encoding="utf-8"))["showers"]}
    ours_by_code = {"QUA": "quadrantids", "LYR": "lyrids", "ETA": "eta-aquariids", "PER": "perseids", "ORI": "orionids",
                    "LEO": "leonids", "GEM": "geminids", "URS": "ursids"}
    by: dict[str, list] = {}
    for r in rows:
        by.setdefault(r[6].strip() or r[3], []).append(r)
    num = lambda s: float(s) if re.fullmatch(r"\s*-?\d+(\.\d+)?\s*", s or "") else None  # noqa: E731
    med = lambda xs: round(statistics.median(xs), 2) if xs else None  # noqa: E731
    out = []
    for name, sols in by.items():
        first = sols[0]
        code = first[3].strip() or None
        iau = first[1].strip()
        los = med([x for x in (num(r[10]) for r in sols) if x is not None])
        ra = med([x for x in (num(r[11]) for r in sols) if x is not None])
        de = med([x for x in (num(r[12]) for r in sols) if x is not None])
        vg = med([x for x in (num(r[15]) for r in sols) if x is not None])
        dra = med([x for x in (num(r[13]) for r in sols) if x is not None])
        dde = med([x for x in (num(r[14]) for r in sols) if x is not None])
        if None in (los, ra, de, vg):
            print(f"  shower {name!r}: no complete solution, left out")
            continue
        beg = next((num(r[8]) for r in sols if num(r[8]) is not None and num(r[9]) is not None), None)
        end = next((num(r[9]) for r in sols if num(r[8]) is not None and num(r[9]) is not None), None)
        parent = ""
        for r in sols:
            p = re.sub(r"\s+", " ", r[31]).strip()
            if p:
                parent = p
                break
        activity = first[7].strip()
        row = {"id": "shower-" + slug(shower_name(name)), "name": shower_name(name), "iau": int(iau) if iau.isdigit() else None,
               "code": code, "los": los, "ra": ra, "dec": de, "vg": vg, "peak": sol_to_md_2026(los), "n": len(sols)}
        if beg is not None and end is not None:
            row["los0"], row["los1"] = beg, end
        if dra is not None and dde is not None:
            row["dra"], row["ddec"] = dra, dde
        if parent:
            row["parent"] = parent
        if activity and activity not in ("annual",):
            row["activity"] = activity
        if code in ours_by_code:
            reg = ours[ours_by_code[code]]
            row["ours"] = reg["id"]
            row["zhr"] = reg.get("zhr")
        out.append(row)
    ids = [r["id"] for r in out]
    assert len(ids) == len(set(ids)), "shower ids collide"
    assert sum(1 for r in out if r.get("ours")) == 8, "the eight showers of registry/showers.yaml are all matched"
    print(f"  showers: {len(out)} established, {len(rows)} solutions")
    write("showers.json", {"asOf": AS_OF, "source": "IAU Meteor Data Center, Established meteor showers (last update 23 Oct 2026)",
                           "solutions": len(rows), "rows": out})


# --------------------------------------------------------------------------- observatories and launch sites
def wd_rows(csv_bytes: bytes) -> dict[str, dict]:
    items: dict[str, dict] = {}
    for r in csv.DictReader(io.StringIO(csv_bytes.decode("utf-8"))):
        q = r["item"].rsplit("/Q", 1)[1]
        if q in items:
            if r.get("mpc") and not items[q].get("mpc"):
                items[q]["mpc"] = r["mpc"]
            continue
        lat, lon = (float(x) for x in r["coord"].split())
        items[q] = {"q": int(q), "name": r["itemLabel"].strip(), "lat": lat, "lon": lon, "mpc": (r.get("mpc") or "").strip(),
                    "country": (r.get("countryLabel") or "").strip(), "to": r["dissolved"][:4] if r.get("dissolved") else "",
                    "from": r["inception"][:4] if r.get("inception") else "", "sl": int(r["sl"] or 0)}
    return items


GENERIC = set("observatory observatorio observatoire observatorium telescope station university college institute national centre center "
              "space research radio astronomical astronomy astrophysical laboratory the of de la del di and for site field".split())


def words(name: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]{4,}", name.lower()) if w not in GENERIC}


def parse_mpc(text: str) -> list[dict]:
    out = []
    for ln in text.splitlines():
        if len(ln) < 31 or not re.match(r"^[0-9A-Za-z]{3} ", ln):
            continue
        code, lon, cos, sin, name = ln[0:3], ln[4:13].strip(), ln[13:21].strip(), ln[21:30].strip(), ln[30:].strip()
        try:
            lon_f, c, s = float(lon), float(cos), float(sin)
        except ValueError:
            continue  # a spacecraft, a roving observer, an occultation: no place on the ground
        if c == 0 and s == 0:
            continue
        phi_c = math.atan2(s, c)  # geocentric
        e2 = 0.00669437999014
        lat = math.degrees(math.atan(math.tan(phi_c) / (1 - e2)))
        out.append({"mpc": code, "name": name, "lat": round(lat, 4), "lon": round(((lon_f + 180) % 360) - 180, 4)})
    return out


# Wikidata's English labels of countries, as a sentence wants them after "in".
COUNTRY = {"United States": "the United States", "United Kingdom": "the United Kingdom", "Netherlands": "the Netherlands",
           "Philippines": "the Philippines", "People's Republic of China": "China", "Kingdom of the Netherlands": "the Netherlands",
           "Czech Republic": "Czechia", "United Arab Emirates": "the United Arab Emirates", "Bahamas": "the Bahamas", "Gambia": "the Gambia",
           "Central African Republic": "the Central African Republic", "Dominican Republic": "the Dominican Republic",
           "Democratic Republic of the Congo": "the Democratic Republic of the Congo", "Republic of the Congo": "the Republic of the Congo",
           "Marshall Islands": "the Marshall Islands", "Canary Islands": "Spain"}


def country_of(it: dict) -> str:
    return COUNTRY.get(it["country"], it["country"])


def build_observatories(refresh: bool) -> None:
    wd = wd_rows(fetch(WIKIDATA, "wikidata-observatories.csv", refresh, OBS_RQ, "text/csv"))
    mpc = parse_mpc(fetch(MPC_URL, "mpc-obscodes.html", refresh).decode("latin-1"))
    dishes = [r for r in sites_yaml() if r.get("class") == "dish"]
    print(f"  wikidata {len(wd)} items, mpc {len(mpc)} stations with a place, {len(dishes)} hand-kept dishes")
    keep: list[dict] = []
    dropped_label = dropped_dish = 0
    for it in wd.values():
        if not it["name"] or re.fullmatch(r"Q\d+", it["name"]):
            if not it["mpc"]:
                dropped_label += 1
                continue
        if any(hav_km(6371, it["lat"], it["lon"], d["lat"], d["lon"]) < 1.5 for d in dishes):
            dropped_dish += 1
            continue
        keep.append(it)
    by_code = {it["mpc"]: it for it in keep if it["mpc"]}
    added = joined = 0
    for m in mpc:
        if m["mpc"] in by_code:
            by_code[m["mpc"]].setdefault("mpcName", m["name"])
            continue
        if any(hav_km(6371, m["lat"], m["lon"], d["lat"], d["lon"]) < 1.5 for d in dishes):
            continue
        match = None
        for it in keep:
            if it["mpc"] or abs(it["lat"] - m["lat"]) > 0.05 or abs(it["lon"] - m["lon"]) > 0.08:
                continue
            if hav_km(6371, it["lat"], it["lon"], m["lat"], m["lon"]) <= 3 and words(it["name"]) & words(m["name"]):
                match = it
                break
        if match:
            match["mpc"] = m["mpc"]
            match["mpcName"] = m["name"]
            joined += 1
        else:
            keep.append({"q": 0, "name": m["name"], "lat": m["lat"], "lon": m["lon"], "mpc": m["mpc"], "country": "", "to": "", "from": "", "sl": 0})
            added += 1
    for it in keep:
        if re.fullmatch(r"Q\d+", it["name"]) and it.get("mpcName"):
            it["name"] = it["mpcName"]
    keep.sort(key=lambda it: (-it["sl"], it["name"]))
    # one observatory, two Wikidata items: the same MPC code within 5 km. The one with more articles stays.
    seen_code: dict[str, list[dict]] = {}
    unique = []
    for it in keep:
        if it["mpc"] and any(hav_km(6371, it["lat"], it["lon"], o["lat"], o["lon"]) < 5 for o in seen_code.get(it["mpc"], [])):
            continue
        seen_code.setdefault(it["mpc"], []).append(it) if it["mpc"] else None
        unique.append(it)
    keep = unique
    for it in keep:
        it["country"] = country_of(it)
    countries = sorted({it["country"] for it in keep if it["country"]})
    cidx = {c: i + 1 for i, c in enumerate(countries)}  # 0 = unknown
    doc = {"asOf": AS_OF, "countries": countries, "n": len(keep),
           "source": "Wikidata (CC0) joined to the Minor Planet Center's observatory codes",
           "name": [it["name"] for it in keep], "lat": [round(it["lat"] * 1e4) for it in keep], "lon": [round(it["lon"] * 1e4) for it in keep],
           "mpc": [it["mpc"] for it in keep], "country": [cidx.get(it["country"], 0) for it in keep],
           "from": [int(it["from"]) if it["from"].isdigit() else 0 for it in keep],
           "to": [int(it["to"]) if it["to"].isdigit() else 0 for it in keep], "q": [it["q"] for it in keep]}
    print(f"  observatories: {len(keep)} ({sum(1 for it in keep if it['mpc'])} with an MPC code); {dropped_label} nameless and {dropped_dish} at a DSN dish left out; "
          f"{joined} MPC rows joined to a Wikidata row by name, {added} MPC rows added")
    write("observatories.json", doc)


def build_launch_sites(refresh: bool) -> None:
    wd = wd_rows(fetch(WIKIDATA, "wikidata-launch-sites.csv", refresh, LAUNCH_RQ, "text/csv"))
    pads = [r for r in sites_yaml() if r.get("class") == "pad"]
    items = sorted(wd.values(), key=lambda it: -it["sl"])
    keep: list[dict] = []
    for it in items:
        if not it["name"] or re.fullmatch(r"Q\d+", it["name"]):
            continue
        if any(hav_km(6371, it["lat"], it["lon"], p["lat"], p["lon"]) < 3 for p in pads):
            continue
        part = re.search(r"(Launch Complex|Launch Pad|Space Launch Complex|Site \d|Pad \d)", it["name"], re.I)
        if part and any(hav_km(6371, it["lat"], it["lon"], k["lat"], k["lon"]) < 15 for k in keep):
            continue
        if any(hav_km(6371, it["lat"], it["lon"], k["lat"], k["lon"]) < 0.5 for k in keep):
            continue
        keep.append(it)
    for it in keep:
        it["country"] = country_of(it)
    countries = sorted({it["country"] for it in keep if it["country"]})
    cidx = {c: i + 1 for i, c in enumerate(countries)}
    rows = [{"id": "launch-site-" + slug(it["name"]), "name": it["name"], "lat": round(it["lat"], 4), "lon": round(it["lon"], 4),
             "country": cidx.get(it["country"], 0), "from": int(it["from"]) if it["from"].isdigit() else 0,
             "to": int(it["to"]) if it["to"].isdigit() else 0, "q": it["q"]} for it in keep]
    ids = [r["id"] for r in rows]
    assert len(ids) == len(set(ids)), "launch site ids collide"
    print(f"  launch sites: {len(rows)} of {len(wd)} Wikidata rows")
    write("launch-sites.json", {"asOf": AS_OF, "countries": countries, "source": "Wikidata (CC0)", "rows": rows})


# --------------------------------------------------------------------------- landing and impact sites
def parse_date(s: str) -> tuple[str | None, int | None]:
    months = {m: i + 1 for i, m in enumerate("January February March April May June July August September October November December".split())}
    m = re.match(r"^(\d{1,2}) (\w+) (\d{4})", s)
    if m and m.group(2) in months:
        return f"{m.group(3)}-{months[m.group(2)]:02d}-{int(m.group(1)):02d}", int(m.group(3))
    y = re.search(r"(\d{4})", s)
    return None, int(y.group(1)) if y else None


def words_date(iso: str | None, year: int | None) -> str:
    """" on 3 February 1966", " in 1966" or "": the clause that follows a verb."""
    if not iso and year:
        return f" in {year}"
    if not iso:
        return ""
    if iso:
        y, mo, d = iso.split("-")
        mn = "January February March April May June July August September October November December".split()[int(mo) - 1]
        return f" on {int(d)} {mn} {y}"
    return ""


def build_landing_sites(refresh: bool) -> None:
    html_text = fetch(NSSDCA_URL, "nssdca-lunar-impacts.html", refresh).decode("latin-1")
    table = []
    for r in re.findall(r"<tr[^>]*>(.*?)</tr>", html_text, re.I | re.S):
        cells = [html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", c))).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.I | re.S)]
        if len(cells) >= 5 and cells[0] != "Spacecraft":
            table.append(cells)
    existing = sites_yaml()
    rows: list[dict] = []
    skipped_same = unknown = 0
    seen: set[str] = set()
    for c in table:
        name, typ, date, _txt, num = c[0].replace("Chandraya'an", "Chandrayaan"), c[1], c[2], c[3], c[4]
        iso, year = parse_date(date)
        kind = "landing" if typ in ("Soft Landing", "Crewed Landing", "Lander", "Rover") else "impact"
        approx = None
        lat = lon = None
        m = re.match(r"^\s*(-?\d+(?:\.\d*)?)\s*,\s*(-?\d+(?:\.\d*)?)\s*$", num)
        if m:
            lat, lon = float(m.group(1)), float(m.group(2))
            # NSSDCA: "White indicates location is approximately known": whole degrees in the source's own N, E text
            tm = re.match(r"^\s*(\d+(?:\.\d*)?)\s*([NS]),\s*(\d+(?:\.\d*)?)\s*([EW])", _txt)
            if tm:
                dec = lambda x: len(x.split(".")[1]) if "." in x else 0  # noqa: E731
                d = min(dec(tm.group(1)), dec(tm.group(3)))
                approx = 1 if d == 0 else 0.1 if d == 1 else None
        rid = "moon-" + slug(name)
        while rid in seen:
            rid += "-2"
        seen.add(rid)
        if lat is not None and any(e.get("world") == "moon" and hav_km(RADIUS_KM["moon"], lat, lon, e["lat"], e["lon"]) < 2 for e in existing):
            skipped_same += 1
            continue
        when = words_date(iso, year)
        if lat is None:
            unknown += 1
            doing = f"{name} reached the Moon{when}; where is not known."
            display = f"{name}, site unknown"
        elif kind == "landing":
            doing = f"Where {name} landed on the Moon{when}."
            display = f"{name} landing site"
        else:
            doing = f"Where {name} hit the Moon{when}."
            display = f"{name} impact site"
        row = {"id": rid, "name": display, "world": "moon", "kind": kind if lat is not None else "lost", "date": iso or (str(year) if year else None),
               "src": "nssdca-moon", "doing": doing, "aliases": [name]}
        if lat is not None:
            row["lat"], row["lon"] = lat, lon
            row["lon"] = lon % 360
        if approx:
            row["approx"] = approx
        rows.append(row)
    nmoon = len(rows)
    extra = yaml.safe_load((ROOT / "registry/landing-sites-1-5.yaml").read_text(encoding="utf-8"))
    refs = {"nssdca-moon": {"url": NSSDCA_URL, "says": "NASA NSSDCA, Table of Anthropogenic Impacts and Spacecraft on the Moon (D. R. Williams, 13 August 2025); public domain"}}
    for k, v in extra["references"].items():
        refs[k] = {"url": v["url"], "says": re.sub(r"\s+", " ", v["says"])}
    for s in extra["sites"]:
        if s.get("lat") is not None and any(e.get("world") == s["world"] and hav_km(RADIUS_KM.get(s["world"], 3000), s["lat"], s["lon"], e["lat"], e["lon"]) < 2 for e in existing):
            skipped_same += 1
            continue
        if s["id"] in seen:
            raise SystemExit(f"{s['id']} collides")
        seen.add(s["id"])
        row = {"id": s["id"], "name": s["display"], "world": s["world"], "kind": s["kind"], "date": str(s["date"]), "src": s.get("source"),
               "doing": s["doing"]}
        if s.get("lat") is not None:
            row["lat"], row["lon"] = s["lat"], s["lon"]
        if s.get("approx_deg"):
            row["approx"] = s["approx_deg"]
        if s.get("aliases"):
            row["aliases"] = s["aliases"]
        rows.append(row)
    for r in rows:
        if r.get("src") is None:
            r.pop("src")
    by_world: dict[str, int] = {}
    for r in rows:
        by_world[r["world"]] = by_world.get(r["world"], 0) + 1
    print(f"  landing sites: {len(rows)} ({by_world}); {len(table)} NSSDCA rows, {nmoon} of them new here, {unknown} with no location; {skipped_same} dropped as already in registry/sites.yaml")
    write("landing-sites.json", {"asOf": AS_OF, "references": refs, "rows": rows})


def main(argv: list[str]) -> int:
    refresh = "--refresh" in argv
    only = argv[argv.index("--only") + 1] if "--only" in argv else None
    jobs = {"showers": build_showers, "observatories": build_observatories, "launch-sites": build_launch_sites, "landing-sites": build_landing_sites}
    for name, fn in jobs.items():
        if only and only != name:
            continue
        print(name)
        fn(refresh)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
