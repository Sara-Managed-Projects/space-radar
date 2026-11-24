#!/usr/bin/env python3
"""The launch archive's pages (forge #551): /launches/index.html and /launches/<year>.html for every year since 1957.

Built by scripts/seo_pages.py (through scripts/build_seo.py), which calls pages(host). They read the bundled copy,
site/data/launches.json (scripts/build-launches.py, GCAT's launch list cut to the orbital attempts), so a build needs no
network and two builds of the same file are the same pages.

    /launches/index.html      every year's count (attempts, successes, failures), the countries of the launch sites, the
                              most flown rockets, the latest launches, and GCAT's citation
    /launches/<year>.html     every orbital attempt of one year: date, rocket, site, payload, outcome

THE DATA IS NOT TRANSLATED. Every cell that is GCAT's (a rocket, a site, a payload, a country's GCAT name) sits under
translate="no", so the language catalog (scripts/seo_i18n.py) holds only the sentences round it, once each: a year's page
is the same sentences with other numbers. The outcome words are the six of GCAT's codes, translated once.

THE LICENCE. GCAT is CC BY 4.0 and asks for a citation: every page carries it in its foot, and the index's JSON-LD names the
dataset with its licence and its creator.
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seo_common import ROOT, Page, esc, url_of, webpage  # noqa: E402
from seo_common import grouped  # noqa: E402
from seo_share import Spec  # noqa: E402

DATA = ROOT / "site" / "data" / "launches.json"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
OUTCOME = {"S": "Success", "F": "Failure", "P": "Partial", "E": "Pad explosion", "A": "Pad abort", "U": "Unknown"}
COUNTRY = {"SU": "Soviet Union", "US": "United States", "RU": "Russia", "CN": "China", "GF": "French Guiana", "JP": "Japan",
           "IN": "India", "NZ": "New Zealand", "KI": "Kiribati", "IR": "Iran", "IL": "Israel", "KE": "Kenya", "MH": "Marshall Islands",
           "KR": "South Korea", "KP": "North Korea", "AU": "Australia", "DZ": "Algeria", "BR": "Brazil", "NO": "Norway", "ES": "Spain",
           "GB": "United Kingdom"}
GCAT_URL = "https://planet4589.org/space/gcat/"
COLOUR = "#ffd166"
LATEST = 20
TOP_ROCKETS = 20


def kind(out: str) -> str:
    c = (out or "").upper()
    if len(c) > 1 and c[1:].isdigit() and c[0] in "SF":
        return "P"
    return c[:1] if c[:1] in OUTCOME else "U"


def load() -> dict:
    doc = json.loads(DATA.read_text(encoding="utf-8"))
    col = {c: i for i, c in enumerate(doc["cols"])}
    rows = []
    for r in doc["rows"]:
        s = doc["sites"].get(r[col["site"]]) or [r[col["site"]], None, None, "", ""]
        rows.append({"tag": r[col["tag"]], "t": r[col["t"]] or "", "year": int(str(r[col["t"]])[:4]), "veh": doc["veh"][r[col["veh"]]],
                     "site": s[0], "cc": s[4], "pad": r[col["pad"]], "pay": r[col["pay"]] or r[col["tag"]], "kind": kind(r[col["out"]])})
    return {"rows": rows, "updated": doc["updated"], "citation": doc["citation"], "licence": doc["licence"]}


def day_words(iso_day: str) -> str:
    y, m, d = (int(x) for x in iso_day.split("-"))
    return f"{d} {MONTHS[m - 1]} {y}"


def citation_foot(a: dict) -> str:
    return (f"<p>Source: GCAT, the General Catalog of Artificial Space Objects, as of {esc(day_words(a['updated']))}. "
            f'{esc(a["citation"])}. Licence: <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. '
            "The rows are GCAT's orbital launch attempts (LaunchCode O); nothing in them is changed.</p>\n")


def launch_table(rows: list[dict]) -> str:
    """Date, rocket, site, payload, outcome. GCAT's cells are translate="no"; the outcome is our word for its code."""
    head = "<thead><tr><th>Date (UTC)</th><th>Rocket</th><th>Site</th><th>Payload</th><th>Outcome</th></tr></thead>"
    body = "".join(
        f'<tr><td translate="no">{esc(r["t"][:10])}</td><td translate="no">{esc(r["veh"])}</td><td translate="no">{esc(r["site"])}</td>'
        f'<td translate="no">{esc(r["pay"])}</td><td>{OUTCOME[r["kind"]]}</td></tr>'
        for r in rows)
    return f'<div class="tbl__s"><table>{head}<tbody>{body}</tbody></table></div>\n'


def by_year(rows: list[dict]) -> dict[int, dict]:
    out: dict[int, dict] = {}
    for r in rows:
        y = out.setdefault(r["year"], {"n": 0, "S": 0, "F": 0})
        y["n"] += 1
        if r["kind"] == "S":
            y["S"] += 1
        elif r["kind"] == "F":
            y["F"] += 1
    return out


def dataset(host: str, a: dict, n: int) -> dict:
    return {"@type": "Dataset", "@id": f"{host}/launches/index.html#dataset", "name": "Every orbital launch attempt since 1957",
            "description": f"{n} orbital launch attempts from GCAT, the General Catalog of Artificial Space Objects, with their date, rocket, "
                           "launch site, payload and outcome.",
            "license": "https://creativecommons.org/licenses/by/4.0/", "isBasedOn": GCAT_URL,
            "creator": {"@type": "Person", "name": "Jonathan C. McDowell"}, "dateModified": a["updated"],
            "temporalCoverage": f"1957/{a['updated'][:4]}", "url": url_of(host, "launches/index.html")}


def index_page(host: str, a: dict) -> Page:
    rows = a["rows"]
    years = by_year(rows)
    n = len(rows)
    ok = sum(1 for r in rows if r["kind"] == "S")
    bad = sum(1 for r in rows if r["kind"] == "F")
    first, last = min(years), max(years)
    busiest = max(years, key=lambda y: (years[y]["n"], y))
    year_rows = "".join(
        f'<tr><td><a href="{y}.html">{y}</a></td><td>{grouped(v["n"])}</td><td>{grouped(v["S"])}</td><td>{grouped(v["F"])}</td></tr>'
        for y, v in sorted(years.items(), reverse=True))
    countries = Counter(r["cc"] for r in rows)
    country_rows = "".join(f'<tr><td translate="no">{esc(COUNTRY.get(cc, cc or "?"))}</td><td>{grouped(k)}</td></tr>' for cc, k in countries.most_common())
    rockets = Counter(r["veh"] for r in rows).most_common(TOP_ROCKETS)
    rocket_rows = "".join(f'<tr><td translate="no">{esc(v)}</td><td>{grouped(k)}</td></tr>' for v, k in rockets)
    latest = sorted(rows, key=lambda r: r["t"], reverse=True)[:LATEST]
    body = (
        '<p class="eyebrow">Launch archive</p>\n'
        f"<h1>Every orbital launch since 1957</h1>\n"
        f'<p class="lead">{grouped(n)} orbital launch attempts from {first} to {last}, from GCAT, the General Catalog of Artificial Space '
        f"Objects: {grouped(ok)} succeeded and {grouped(bad)} failed. The busiest year was {busiest}, with {grouped(years[busiest]['n'])}.</p>\n"
        '<div class="cta"><a class="btn btn--map" href="../#cat=launches">Replay them on the live map</a><p>Free, with no account and no advertising.</p></div>\n'
        "<h2>Year by year</h2>\n"
        "<p>Choose a year for every launch of it, with its rocket, site, payload and outcome.</p>\n"
        f'<div class="tbl__s"><table><thead><tr><th>Year</th><th>Attempts</th><th>Successes</th><th>Failures</th></tr></thead><tbody>{year_rows}</tbody></table></div>\n'
        "<h2>Where they left from</h2>\n"
        "<p>The country of the launch site, as GCAT's site codes record it: a code of the Soviet years stays the Soviet Union's.</p>\n"
        f'<div class="tbl__s"><table><thead><tr><th>Launch site in</th><th>Attempts</th></tr></thead><tbody>{country_rows}</tbody></table></div>\n'
        f"<h2>The most flown rockets</h2>\n"
        f'<div class="tbl__s"><table><thead><tr><th>Rocket</th><th>Attempts</th></tr></thead><tbody>{rocket_rows}</tbody></table></div>\n'
        "<h2>The latest launches</h2>\n"
        + launch_table(latest)
        + '<div class="callout callout--note"><p><strong>Measured.</strong> Dates, rockets, sites and outcomes are GCAT\'s, as it lists them. '
        "A partial success or failure is GCAT's own judgement. On the map the arcs from each site are drawn to explain, not measured.</p></div>\n"
    )
    title = "Every orbital launch since 1957: the launch archive"
    desc = (f"All {grouped(n)} orbital launch attempts since Sputnik 1, year by year: rocket, launch site, payload and outcome, "
            "from GCAT. Replay them on a 3D globe.")
    page = Page(path="launches/index.html", title=title, description=desc, body=body, foot=citation_foot(a), og_title=title,
                lastmod=a["updated"])
    page.jsonld = [webpage(host, page, [("Launch archive", "")], extra={"about": {"@id": f"{host}/launches/index.html#dataset"}}),
                   dataset(host, a, n),
                   {"@type": "ItemList", "name": "Orbital launches by year", "numberOfItems": len(years),
                    "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": url_of(host, f"launches/{y}.html"), "name": str(y)}
                                        for i, y in enumerate(sorted(years))]}]
    page.share = Spec(key="launches/index", name="Every orbital launch", number=f"{grouped(n)} since 1957", caption="Launch archive",
                      kind="plain", colour=COLOUR, alt="Rings and a dot, captioned Every orbital launch.")
    return page


def year_page(host: str, a: dict, year: int, years: dict) -> Page:
    rows = sorted((r for r in a["rows"] if r["year"] == year), key=lambda r: r["t"])
    v = years[year]
    sites = len({r["site"] for r in rows})
    prev_y = year - 1 if year - 1 in years else None
    next_y = year + 1 if year + 1 in years else None
    nav = " · ".join(x for x in [
        f'<a href="{prev_y}.html">{prev_y}</a>' if prev_y else "",
        '<a href="index.html">Every year</a>',
        f'<a href="{next_y}.html">{next_y}</a>' if next_y else ""] if x)
    body = (
        '<p class="eyebrow">Launch archive</p>\n'
        f"<h1>Orbital launches of {year}</h1>\n"
        f'<p class="lead">In {year} there were {grouped(v["n"])} orbital launch attempts from {grouped(sites)} launch sites: '
        f"{grouped(v['S'])} succeeded and {grouped(v['F'])} failed.</p>\n"
        f'<div class="cta"><a class="btn btn--map" href="../#cat=launches:{year}">Replay {year} on the live map</a><p>Free, with no account and no advertising.</p></div>\n'
        + launch_table(rows)
        + f"<p>{nav}</p>\n"
    )
    title = f"Orbital launches of {year}: {grouped(v['n'])} attempts"
    desc = (f"Every orbital launch attempt of {year}, {grouped(v['n'])} in all: the date, rocket, launch site, payload and outcome of each, "
            "from GCAT.")
    page = Page(path=f"launches/{year}.html", title=title, description=desc, body=body, foot=citation_foot(a), og_title=title,
                lastmod=a["updated"])
    page.jsonld = [webpage(host, page, [("Launch archive", "launches/index.html"), (str(year), "")],
                           extra={"isBasedOn": {"@id": f"{host}/launches/index.html#dataset"}})]
    page.share = Spec(key=f"launches/{year}", name=f"Orbital launches of {year}", number=f"{grouped(v['n'])} attempts", caption="Launch archive",
                      kind="plain", colour=COLOUR, alt=f"Rings and a dot, captioned Orbital launches of {year}.")
    return page


def pages(host: str) -> list[Page]:
    a = load()
    years = by_year(a["rows"])
    return [index_page(host, a)] + [year_page(host, a, y, years) for y in sorted(years)]


if __name__ == "__main__":
    print("seo_launches.py is built through scripts/build_seo.py --out DIR", file=sys.stderr)
    raise SystemExit(2)
