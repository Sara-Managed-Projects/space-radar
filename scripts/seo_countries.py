#!/usr/bin/env python3
"""The country pages: /country/<iso>/, one for every country CelesTrak's catalogue names as an owner (forge #152).

    python3 scripts/seo_countries.py --write-counts    refresh registry/owner-counts.json from the saved catalogue
                                                       (site/data/v1/celestrak-satcat.json, the harvester's copy)

The pages themselves are built by scripts/seo_pages.py (through scripts/build_seo.py), which calls pages(host):
/country/index.html lists every country, and /country/<iso>/index.html says, for one, how many things it has in
orbit and of what kind, its newest working satellites, what sits at no public path, and links to the map lit for
it (`#owner=<code>`, site/js/ui/find.js). The country is the ISO 3166 alpha-2 code, lower case.

THE NUMBERS ARE DATED. They come from the saved catalogue when the build has it (the deploy machine does), else from
registry/owner-counts.json, which this script writes from it; either way the page says the day the catalogue was
read. A count is CelesTrak's: measured, for what radar can track (about 10 cm and up). The owner codes and their
countries are site/js/data/owners.js (its OWNERS table is read from there, so there is one list); a joint code
(CHBZ: China and Brazil) is counted on neither country's page and named on both. The flag is the page's picture
when there is one, from Wikimedia Commons, public domain (site/images/flags/sources.json).

TWO LEVELS DOWN. The templates are written for a page one directory below the root ("../css/..."); these are two
(country/in/index.html), so relink() turns every "../" of a rendered page into "../../". The body here is written as
the templates are, one level down, and relink() moves it with the rest.
"""

from __future__ import annotations

import csv
import io
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seo_common import ROOT, Page, esc, webpage  # noqa: E402

OWNERS_JS = ROOT / "site/js/data/owners.js"
SNAPSHOT = ROOT / "site/data/v1/celestrak-satcat.json"
COUNTS = ROOT / "registry/owner-counts.json"
FLAGS = ROOT / "site/images/flags"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
WORKING = set("+PBSX")
NEWEST = 8


def owners() -> list[dict]:
    """OWNERS of site/js/data/owners.js: [code, kind, iso, name, note?] rows."""
    text = OWNERS_JS.read_text(encoding="utf-8")
    rows = re.findall(r"\['([A-Z0-9]+)', '(country|joint|org|unknown)', '([A-Z ]*)', '([^']*)'(?:, '(\w+)')?\]", text)
    return [{"code": c, "kind": k, "iso": i.split() if i else [], "name": n, "note": note or None} for c, k, i, n, note in rows]


def kind_of(row: dict) -> str:
    t = row["OBJECT_TYPE"]
    if t == "DEB":
        return "debris"
    if t == "R/B":
        return "rocket"
    if t == "PAY":
        return "working" if (row.get("OPS_STATUS_CODE") or "") in WORKING else "dead"
    return "other"


def count_catalogue(body: str, fetched_at: str) -> dict:
    """{as_of, owners: {code: {ever, up, working, dead, rocket, debris, other, no_path, newest: [[name, year], ...]}}}."""
    out: dict = {}
    for r in csv.DictReader(io.StringIO(body)):
        code = (r.get("OWNER") or "").strip()
        if not code:
            continue
        g = out.setdefault(code, {"ever": 0, "up": 0, "working": 0, "dead": 0, "rocket": 0, "debris": 0, "other": 0, "no_path": 0, "newest": []})
        g["ever"] += 1
        if r.get("DECAY_DATE"):
            continue
        g["up"] += 1
        k = kind_of(r)
        g[k] += 1
        if r["OBJECT_TYPE"] == "PAY" and ((r.get("DATA_STATUS_CODE") or "") in ("NEA", "NCE", "NIE") or (r.get("ORBIT_CENTER") or "EA") not in ("EA",) and not (r.get("ORBIT_CENTER") or "").isdigit()):
            g["no_path"] += 1
        if k == "working":
            g["newest"].append([r["OBJECT_NAME"], r.get("LAUNCH_DATE") or ""])
    for g in out.values():
        g["newest"] = [[n, d[:4]] for n, d in sorted(g["newest"], key=lambda x: x[1], reverse=True)[:NEWEST]]
    return {"as_of": fetched_at[:10], "source": "CelesTrak satcat.csv, as saved by this site's harvester", "owners": out}


def counts() -> dict:
    """The saved catalogue's counts when the build has it, else the committed ones."""
    if SNAPSHOT.is_file():
        snap = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
        return count_catalogue(snap["body"], snap.get("fetched_at") or "")
    return json.loads(COUNTS.read_text(encoding="utf-8"))


def day_words(iso_day: str) -> str:
    y, m, d = (int(x) for x in iso_day.split("-"))
    return f"{d} {MONTHS[m - 1]} {y}"


def groups(n: int) -> str:
    return f"{n:,}".replace(",", " ")


def relink(html: str) -> str:
    """A page rendered for one level down, moved to two: every relative "../" gains one more."""
    return re.sub(r'(\b(?:href|src|content)=")\.\./', r"\1../../", html)


def country_rows(c: dict) -> list[dict]:
    """One row per country with anything ever catalogued: its codes, its counts, the joint codes that name it."""
    by_iso: dict[str, dict] = {}
    table = owners()
    for o in table:
        if o["kind"] != "country" or o["code"] not in c["owners"]:
            continue
        iso = o["iso"][0]
        row = by_iso.setdefault(iso, {"iso": iso, "codes": [], "name": o["name"], "note": o["note"], "joint": [], **{k: 0 for k in ("ever", "up", "working", "dead", "rocket", "debris", "other", "no_path")}, "newest": []})
        row["codes"].append(o["code"])
        g = c["owners"][o["code"]]
        for k in ("ever", "up", "working", "dead", "rocket", "debris", "other", "no_path"):
            row[k] += g[k]
        row["newest"] += g["newest"]
    for o in table:
        if o["kind"] == "joint" and o["code"] in c["owners"]:
            for iso in o["iso"]:
                if iso in by_iso:
                    by_iso[iso]["joint"].append({"code": o["code"], "name": o["name"], "up": c["owners"][o["code"]]["up"]})
    for row in by_iso.values():
        row["newest"] = sorted(row["newest"], key=lambda x: x[1], reverse=True)[:NEWEST]
    return sorted(by_iso.values(), key=lambda r: (-r["up"], r["name"]))


def country_page(host: str, r: dict, as_of: str) -> Page:
    slug = r["iso"].lower()
    name = r["name"]
    day = day_words(as_of)
    code = r["codes"][0]
    title = f"{name}'s satellites: {groups(r['up'])} in orbit"
    if len(title) > 60:
        title = f"{name}: {groups(r['up'])} objects in orbit"
    desc = (f"Every object {name} has in orbit, from CelesTrak's catalogue: {groups(r['working'])} working satellites, "
            f"{groups(r['debris'])} pieces of debris. See them lit on a live 3D map.")
    flag = f"../images/flags/{slug}.svg" if (FLAGS / f"{slug}.svg").is_file() else ""
    note = ""
    if r["note"] == "ussr":
        note = "<p>CelesTrak's catalogue counts the Soviet Union and Russia as one owner, and so does this page.</p>\n"
    joint = ""
    if r["joint"]:
        joint = "<p>Shared with another country, and not counted above: " + ", ".join(
            f'{esc(j["name"])} ({groups(j["up"])} in orbit, <a href="../#owner={esc(j["code"])}">on the map</a>)' for j in r["joint"]) + ".</p>\n"
    newest = ""
    if r["newest"]:
        newest = "<h2>The newest working satellites</h2>\n<ul class=\"links\">" + "".join(f"<li>{esc(n)} ({esc(y)})</li>" for n, y in r["newest"]) + "</ul>\n"
    nopath = ""
    if r["no_path"]:
        nopath = (f"<p>{groups(r['no_path'])} of its payloads in orbit have no public path: the catalogue lists them, but no element set "
                  "is published for them, or they are beyond Earth orbit. The map lists them and says which.</p>\n")
    body = (
        (f'<p class="micro"><img src="{flag}" alt="" width="21" height="14" style="vertical-align:-2px;margin-right:6px">Satellites by country</p>\n' if flag
         else '<p class="micro">Satellites by country</p>\n')
        + f"<h1>{esc(name)} has {groups(r['up'])} objects in orbit</h1>\n"
        + f'<p class="lead">CelesTrak\'s satellite catalogue, read {esc(day)}, lists {groups(r["up"])} objects in orbit owned by {esc(name)}: '
        f"<strong>{groups(r['working'])} working satellites</strong>, {groups(r['dead'])} that no longer work, {groups(r['rocket'])} rocket bodies "
        f"and {groups(r['debris'])} pieces of debris. {groups(r['ever'])} have been catalogued since its first launch.</p>\n"
        + note
        + f'<div class="cta"><a class="live" href="../#owner={esc(code)}">See all of them on the live map</a><p>Free, with no account and no advertising.</p></div>\n'
        + newest + nopath + joint
        + '<div class="note"><p><strong>Measured.</strong> The counts are the catalogue\'s: what radar can track, about 10 cm and up, '
        "on the day given. A satellite's place on the map is worked out from its published orbit.</p></div>\n"
        + '<p><a href="index.html">Every country</a> · <a href="../satellites/index.html">The live satellite map</a></p>\n')
    page = Page(path=f"country/{slug}/index.html", title=title, description=desc, body=body,
                foot=f"<p>Source: CelesTrak's satellite catalogue (celestrak.org), read {esc(day)}. Flag: Wikimedia Commons, public domain.</p>\n",
                og_title=title, lastmod=as_of)
    page.jsonld = [webpage(host, page, [("Satellites by country", "country/index.html"), (name, "")],
                           extra={"about": {"@type": "Country", "name": name, "identifier": r["iso"]}})]
    return page


def index_page(host: str, rows: list[dict], as_of: str) -> Page:
    day = day_words(as_of)
    items = "".join(f'<li><a href="{r["iso"].lower()}/index.html">{esc(r["name"])}</a> · {groups(r["up"])} in orbit</li>' for r in rows)
    body = ("<p class=\"micro\">Satellites by country</p>\n"
            f"<h1>Satellites by country: {len(rows)} countries</h1>\n"
            f"<p class=\"lead\">Every country CelesTrak's satellite catalogue names as an owner, with how many objects each has in orbit (read {esc(day)}).</p>\n"
            f'<ul class="links">{items}</ul>\n'
            '<div class="cta"><a class="live" href="../">Open the live map</a><p>Find, then By country: every one lit on the globe.</p></div>\n')
    page = Page(path="country/index.html", title=f"Satellites by country: {len(rows)} countries",
                description=f"How many satellites, rocket bodies and pieces of debris each of {len(rows)} countries has in orbit, from CelesTrak's catalogue.",
                body=body, foot=f"<p>Source: CelesTrak's satellite catalogue, read {esc(day)}.</p>\n", lastmod=as_of)
    page.jsonld = [webpage(host, page, [("Satellites by country", "")])]
    return page


def pages(host: str) -> list[Page]:
    c = counts()
    rows = country_rows(c)
    return [index_page(host, rows, c["as_of"])] + [country_page(host, r, c["as_of"]) for r in rows]


def write_counts() -> int:
    if not SNAPSHOT.is_file():
        print(f"seo_countries: no saved catalogue at {SNAPSHOT.relative_to(ROOT)}", file=sys.stderr)
        return 1
    snap = json.loads(SNAPSHOT.read_text(encoding="utf-8"))
    c = count_catalogue(snap["body"], snap.get("fetched_at") or "")
    COUNTS.write_text(json.dumps(c, ensure_ascii=False, indent=0, sort_keys=True) + "\n", encoding="utf-8")
    print(f"seo_countries: {len(c['owners'])} owners, as of {c['as_of']}, to {COUNTS.relative_to(ROOT)}")
    return 0


def main(argv: list[str]) -> int:
    if "--write-counts" in argv:
        return write_counts()
    print("seo_countries.py: its pages are built through scripts/build_seo.py --out DIR; --write-counts refreshes the committed counts", file=sys.stderr)
    return 2


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
