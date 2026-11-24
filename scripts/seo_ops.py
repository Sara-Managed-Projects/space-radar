#!/usr/bin/env python3
"""The pages of the research train "ops" (forge #558, #561): State of Space and close calls.

    /state-of-space/index.html   the numbers of the last frozen quarter, each with its source and date, the quarters since
                                 2016 as sparklines, a cite-this block, and the way into the live numbers on the map
    /close-calls/index.html      re-entries and close approaches: where the numbers come from and what they cannot say,
                                 and the three breakups people name (2007, 2009, 2021), with the 2009 collision's Moment

Built by scripts/seo_pages.py (through scripts/build_seo.py), which calls pages(host). Everything on them is read from the
repository at build time: the frozen quarters and the history (site/data/state-of-space/, scripts/state_of_space.py), the
breakups' dates and sources (site/js/data/clouds.js mirrors them; the counts are the Moments' pieces files, read from
CelesTrak's catalogue on the day each names). No number is typed here. Nothing is loaded by the app.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seo_common import ROOT, Page, esc, webpage  # noqa: E402
from seo_common import grouped as _grouped  # noqa: E402
from seo_share import Spec  # noqa: E402

DATA = ROOT / "site" / "data" / "state-of-space"
MOMENTS = ROOT / "site" / "data" / "moments" / "paths"
SATCAT = "https://celestrak.org/pub/satcat.csv"
SATCAT_FORMAT = "https://celestrak.org/satcat/satcat-format.php"
SOCRATES = "https://celestrak.org/SOCRATES/"
USAGE = "https://celestrak.org/usage-policy.php"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

LABELS = {
    "earth_orbit": "Objects in Earth orbit",
    "payloads": "Satellites in Earth orbit",
    "rocket_bodies": "Spent rocket stages",
    "debris": "Pieces of debris tracked",
    "starlink": "Starlink satellites up",
    "owners": "Countries and groups owning one",
    "launches_year": "Orbital launches so far in {year}",
    "beyond_earth": "Craft beyond Earth orbit",
    "came_down_30d": "Came down in the 30 days before",
}
OWNERS = {"US": "United States", "PRC": "China", "CIS": "Russia and the former USSR", "UK": "United Kingdom", "JPN": "Japan",
          "TBD": "Owner not yet known", "FR": "France", "IND": "India", "IT": "Italy", "GER": "Germany", "ITSO": "Intelsat",
          "ESA": "European Space Agency", "CA": "Canada", "SKOR": "South Korea"}

# The three breakups of site/js/data/clouds.js, in the order they happened, with NASA's Orbital Debris Quarterly News issue
# each cites. `pieces` names a Moment's pieces file where one exists (its note carries the counts and the day they were read).
BREAKUPS = [
    {"id": "fy1c", "year": 2007, "name": "Fengyun-1C", "when": "11 January 2007", "km": 865, "what": "China destroyed its own old weather satellite with a missile.",
     "moment": "fengyun-1c", "pieces": ["fengyun-1c-pieces.json"], "source": "https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv11i2.pdf", "issue": "11(2), April 2007"},
    {"id": "iridium-cosmos", "year": 2009, "name": "Iridium 33 and Kosmos 2251", "when": "10 February 2009", "km": 789,
     "what": "A working phone satellite and a dead Russian one hit each other: the first collision of two whole satellites.",
     "moment": "iridium-cosmos-2009", "pieces": ["iridium-cosmos-2009-iridium-pieces.json", "iridium-cosmos-2009-kosmos-pieces.json"],
     "source": "https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv13i2.pdf", "issue": "13(2), April 2009"},
    {"id": "cosmos1408", "year": 2021, "name": "Cosmos 1408", "when": "15 November 2021", "km": 480, "what": "Russia destroyed its own old satellite with a missile; almost all of its pieces have come down since.",
     "moment": None, "pieces": [], "source": "https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv26i1.pdf", "issue": "26(1), March 2022"},
]


def day_words(iso: str) -> str:
    y, m, d = iso[:10].split("-")
    return f"{int(d)} {MONTHS[int(m) - 1]} {y}"


def quarter_words(q: str) -> str:
    y, n = q.split("-q")
    return f"{y} Q{n}"


def frozen() -> tuple[dict, dict]:
    history = json.loads((DATA / "history.json").read_text(encoding="utf-8"))
    last = sorted(history["quarters"])[-1]
    return history, json.loads((DATA / f"{last}.json").read_text(encoding="utf-8"))


def spark(series: list, key: str, w: int = 160, h: int = 32) -> str:
    vals = [p[key] for p in series]
    lo, hi = min(vals), max(vals)
    span = (hi - lo) or 1
    pts = " ".join(f"{2 + i * (w - 4) / (len(vals) - 1):.1f},{h - 2 - (v - lo) * (h - 4) / span:.1f}" for i, v in enumerate(vals))
    return (f'<svg class="spark" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{esc(key)}, {esc(series[0]["q"])} to {esc(series[-1]["q"])}">'
            f'<polyline points="{pts}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>')


def state_page(host: str) -> Page:
    history, doc = frozen()
    q = quarter_words(doc["quarter"])
    as_of = day_words(doc["as_of"])
    nums = {n["id"]: n for n in doc["numbers"]}
    short = f"State of Space, {q}: what is in orbit"
    desc = f"What was in orbit on {as_of}: satellites by owner, debris and launches, counted from CelesTrak's catalogue, each with its source."
    rows = []
    for nid, label in LABELS.items():
        n = nums.get(nid)
        if not n:
            continue
        rows.append(f'<tr><td>{esc(label.format(year=doc.get("launch_year", "")))}</td><td>{_grouped(n["value"])}</td>'
                    f'<td>CelesTrak SATCAT</td><td>{esc(day_words(n["as_of"]))}</td></tr>')
    owners = "".join(f'<tr><td>{esc(OWNERS.get(o["owner"], o["owner"]))}</td><td>{_grouped(o["value"])}</td></tr>' for o in doc["payload_owners"])
    owners += f'<tr><td>Everyone else</td><td>{_grouped(doc["payload_owners_other"])}</td></tr>'
    s = history["series"]
    sparks = "".join(
        f'<tr><td>{esc(name)}</td><td>{spark(s, key)}</td><td>{_grouped(s[0][key])}</td><td>{_grouped(s[-1][key])}</td></tr>'
        for key, name in (("payloads", "Satellites in Earth orbit at the quarter's end"), ("debris", "Debris tracked at the quarter's end"), ("launches", "Orbital launches in the quarter")))
    quarters = ", ".join(f'<a href="../data/state-of-space/{esc(x)}.json">{esc(quarter_words(x))}</a>' for x in history["quarters"])
    cite = f'Space Radar, "State of Space", {q}, frozen {day_words(doc["frozen"])}, https://www.spaceradar.ai/state-of-space/ (data: CelesTrak SATCAT, read {day_words(doc["source"]["read"])}).'
    body = (
        '<p class="eyebrow">State of Space</p>\n'
        f"<h1>State of Space, {esc(q)}</h1>\n"
        f'<p class="lead">What was in orbit on {esc(as_of)}, counted from the public satellite catalogue CelesTrak keeps. '
        "Every number has its source and its date. The map shows the same numbers live.</p>\n"
        f'<div class="cta"><a class="btn btn--map" href="../index.html#ops=state">See the live numbers on the map</a></div>\n'
        f"<h2>The numbers on {esc(as_of)}</h2>\n"
        '<div class="tbl__s"><table>\n<thead><tr><th>What</th><th>How many</th><th>Source</th><th>As of</th></tr></thead>\n'
        f"<tbody>\n{chr(10).join(rows)}\n</tbody></table></div>\n"
        f"<p>These were counted back on {esc(day_words(doc['frozen']))} from the catalogue as CelesTrak published it on {esc(day_words(doc['source']['read']))}: "
        f"an object counts if, on {esc(as_of)}, it had been launched, had not yet come down and had already been catalogued. "
        "Which satellites were working, and how many people were in space, cannot be counted back, so they are not here.</p>\n"
        "<h2>Satellites in Earth orbit, by owner</h2>\n"
        '<div class="tbl__s"><table>\n<thead><tr><th>Owner, as CelesTrak gives it</th><th>Satellites</th></tr></thead>\n'
        f"<tbody>\n{owners}\n</tbody></table></div>\n"
        f"<h2>Since 2016, a point a quarter</h2>\n"
        '<div class="tbl__s"><table>\n<thead><tr><th>What</th><th>The quarters</th><th>' + esc(quarter_words(s[0]["q"])) + "</th><th>" + esc(quarter_words(s[-1]["q"])) + "</th></tr></thead>\n"
        f"<tbody>\n{sparks}\n</tbody></table></div>\n"
        f"<p>Each point is the end of a finished quarter, counted back the same way from the catalogue of {esc(day_words(history['source']['read']))}.</p>\n"
        "<h2>Cite this</h2>\n"
        f"<p><code>{esc(cite)}</code></p>\n"
        f"<p>Frozen quarters, as data: {quarters}. A quarter is frozen once it has ended and is never changed afterwards.</p>\n"
        "<h2>How it is counted</h2>\n"
        f'<p>The catalogue is <a href="{SATCAT}">CelesTrak\'s SATCAT</a> (its columns: <a href="{SATCAT_FORMAT}">the format page</a>). '
        "An object is in Earth orbit when the catalogue says it orbits the Earth and gives no date for its coming down. A launch counts once it reached orbit: "
        "the catalogue gives each such launch one international designator. Working means CelesTrak flags it as operational, partly working, a spare, a backup or "
        "on an extended mission. The count is what radar and telescopes track, about ten centimetres and up; far more smaller pieces are not in it.</p>\n"
        '<p><a href="../sources/index.html">Where every number comes from</a> · <a href="../close-calls/index.html">Close calls and re-entries</a></p>\n')
    page = Page(path="state-of-space/index.html", title=short, description=desc, body=body, og_title=short, lastmod=doc["frozen"])
    dataset = {"@type": "Dataset", "name": f"State of Space, {q}", "description": desc, "temporalCoverage": doc["as_of"],
               "isBasedOn": SATCAT, "creditText": "Space Radar; data: CelesTrak SATCAT (T. S. Kelso)",
               "distribution": [{"@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": f"{host}/data/state-of-space/{x}.json"} for x in history["quarters"]],
               "creator": {"@id": f"{host}/#organization"}}
    page.jsonld = [webpage(host, page, [("State of Space", "")], page_type="CollectionPage"), dataset]
    page.share = Spec(key="state-of-space/index", name="State of Space", number=f"{_grouped(nums['earth_orbit']['value'])} objects in orbit", caption=q, kind="plain",
                      colour="#9ec3ff", alt=f"Rings and a dot, captioned State of Space, {q}.")
    return page


def pieces_note(files: list[str]) -> str:
    """'Iridium 33: 115 pieces of 656 catalogued are still in orbit (CelesTrak SATCAT, read 23 November 2026).' from a pieces file."""
    out = []
    for f in files:
        p = MOMENTS / f
        if not p.is_file():
            continue
        doc = json.loads(p.read_text(encoding="utf-8"))
        m = re.match(r"^(.*?)'s (\d+) pieces still in orbit of (\d+) catalogued", doc.get("note", ""))
        if m and doc.get("read"):
            out.append(f"{m.group(1)}: {_grouped(int(m.group(2)))} of its {_grouped(int(m.group(3)))} catalogued pieces were still in orbit "
                       f"on {day_words(doc['read'])}.")
    return " ".join(out)


def close_page(host: str) -> Page:
    short = "Close calls and re-entries: what is tracked"
    desc = "Where close-approach predictions come from, what the lowest objects in orbit can and cannot tell, and the breakups of 2007, 2009 and 2021."
    items = []
    for b in BREAKUPS:
        link = f' <a href="../index.html#moment={esc(b["moment"])}">Watch it as a Moment</a>.' if b["moment"] else ""
        counts = pieces_note(b["pieces"])
        items.append(f'<h3>{b["year"]}: {esc(b["name"])}</h3>\n<p>{esc(b["when"])}, about {b["km"]} km up. {esc(b["what"])} '
                     f'{esc(counts)} Source: <a href="{b["source"]}">NASA Orbital Debris Quarterly News {esc(b["issue"])}</a>.{link}</p>')
    body = (
        '<p class="eyebrow">Close calls</p>\n<h1>Close calls and re-entries</h1>\n'
        '<p class="lead">Satellites pass close to each other every day, and old ones come back down. '
        "Here is where those numbers come from, and what they cannot tell you.</p>\n"
        '<div class="cta"><a class="btn btn--map" href="../index.html#ops=reentry">See this week\'s list on the map</a></div>\n'
        "<h2>Close approaches</h2>\n"
        f'<p>The list on the map is <a href="{SOCRATES}">CelesTrak\'s SOCRATES Plus</a>: several times a day CelesTrak checks every working satellite against '
        "the whole catalogue for the coming week and lists the passes closer than 5 km, with the distance, the speed and its own highest chance of a hit. "
        "Space Radar shows CelesTrak's numbers as CelesTrak's and works out none of its own. That chance assumes nobody steers: many working satellites "
        "move aside, and two Starlinks listed with a high chance usually means one of them will.</p>\n"
        "<h2>Re-entries</h2>\n"
        "<p>The map lists what the catalogue records as having come down in the last 30 days, and the objects whose whole orbit is lowest now, under 350 km, "
        "where the air brings things down within weeks to months. It gives no date. The public windows of a re-entry come from the US Space Force through "
        "Space-Track.org, which needs an account whose agreement limits passing them on, so they are not shown here.</p>\n"
        "<h2>The breakups people name</h2>\n" + "\n".join(items) + "\n"
        f'<p class="dim">Counts of pieces are the catalogue\'s (<a href="{SATCAT}">CelesTrak SATCAT</a>), for what can be tracked. CelesTrak asks that its data '
        f'be fetched politely (<a href="{USAGE}">its usage policy</a>); this site fetches once a day and shows its copy.</p>\n'
        '<p><a href="../state-of-space/index.html">State of Space</a> · <a href="../sources/index.html">Where every number comes from</a></p>\n')
    page = Page(path="close-calls/index.html", title=short, description=desc, body=body, og_title=short)
    page.jsonld = [webpage(host, page, [("Close calls", "")])]
    page.share = Spec(key="close-calls/index", name="Close calls and re-entries", number="2007, 2009, 2021", caption="Close calls", kind="plain",
                      colour="#c3a6ff", alt="Rings and a dot, captioned Close calls and re-entries.")
    return page


def pages(host: str) -> list[Page]:
    return [state_page(host), close_page(host)]


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    print("seo_ops.py: its pages are built through scripts/build_seo.py --out DIR", file=sys.stderr)
    sys.exit(2)
