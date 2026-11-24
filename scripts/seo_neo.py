"""The near-Earth asteroids' page, /near-earth-asteroids/ (research train "catalogues", forge #560; AGENT_RULES rule 11).

    pages(host) -> [Page]     called by scripts/seo_pages.py build_pages

What a search for "near-Earth asteroids" or "asteroids passing Earth" should find: how many are known, the next close passes, the
largest, the cheapest to reach, what "hazardous" means, and the door into the map's catalogue (`#cat=asteroids`). Built from the
map's own bundled file, site/data/neo-browser.json (scripts/build-neo-browser.py), so the page and the catalogue never disagree,
and "next" is counted from the day that file was read, never from the build's clock: a rebuild that changes no row changes no page.

The names of the rocks are designations and keep their spelling in every language (translate="no"); the dates and numbers are
slots the language pages write in their own style (scripts/seo_i18n.py).
"""

from __future__ import annotations

import datetime as dt
import json
import math

from seo_common import ROOT, Page, esc, grouped, url_of, webpage
from seo_share import Spec

PATH = "near-earth-asteroids/index.html"
FILE = ROOT / "site" / "data" / "neo-browser.json"
AU_KM = 149597870.7
LD_KM = 384400
CLASS = {"APO": "Apollo", "ATE": "Aten", "AMO": "Amor", "IEO": "Atira"}
SHOWN = 20
MONTHS = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December")


def date_words(d) -> str:
    """'25 November 2026', the form scripts/seo_i18n.py reads as a date slot."""
    d = dt.date.fromisoformat(str(d)[:10])
    return f"{d.day} {MONTHS[d.month - 1]} {d.year}"


def delta_v(a: float, e: float, i_deg: float) -> float | None:
    """Shoemaker and Helin (1978), the same arithmetic as site/js/data/neocat.js deltaV (tests/test_neo_browser.py holds both to Benner's published values)."""
    if not (a > 0 and 0 <= e < 1):
        return None
    i = math.radians(i_deg)
    Q, q, c = a * (1 + e), a * (1 - e), math.cos(i / 2)
    if a < 1:
        ut2 = 2 - 2 * c * math.sqrt(max(0.0, 2 * Q - Q * Q))
        uc2 = 3 / Q - 1 - (2 / Q) * math.sqrt(max(0.0, 2 - Q))
        ur2 = 3 / Q - 1 / a - (2 / Q) * c * math.sqrt(a * (1 - e * e) / Q)
    elif q <= 1:
        ut2 = 3 - 2 / (Q + 1) - 2 * c * math.sqrt(2 * Q / (Q + 1))
        uc2 = 3 / Q - 2 / (Q + 1) - (2 / Q) * math.sqrt(2 / (Q + 1))
        ur2 = 3 / Q - 1 / a - (2 / Q) * c * math.sqrt((a / Q) * (1 - e * e))
    else:
        ut2 = 3 - 2 / (Q + 1) - 2 * c * math.sqrt(2 * Q / (Q + 1))
        uc2 = 3 / Q - 2 / (Q + 1) - (2 / Q) * c * math.sqrt(2 / (Q + 1))
        ur2 = 3 / Q - 1 / a - (2 / Q) * math.sqrt(a * (1 - e * e) / Q)
    u0 = 7.727 / 29.784
    s = math.sqrt(2) * u0
    ul = math.sqrt(ut2 + s * s) - u0
    ur = math.sqrt(max(0.0, uc2 - 2 * math.sqrt(max(0.0, ur2 * uc2)) * c + ur2))
    return 30 * (ul + ur) + 0.5


def size_words(d_km: float | None, h: float | None) -> str:
    """A measured size, or the range H allows written in ONE unit (that of its upper end), so the language pages have two
    sentences to translate, "{n1} to {n2} m (estimated)" and "{n1} to {n2} km (estimated)", and never a third."""
    def km_text(km: float) -> str:
        return f"{km:.1f}" if km < 10 else f"{km:.0f}"
    if d_km:
        return f"{round(d_km * 1000 / 10) * 10} m" if d_km < 1 else f"{km_text(d_km)} km"
    if h is None:
        return "unknown"
    lo, hi = (1329 / math.sqrt(p) * 10 ** (-h / 5) for p in (0.25, 0.05))
    if hi < 1:
        return f"{round(lo * 1000 / 10) * 10} to {round(hi * 1000 / 10) * 10} m (estimated)"
    return f"{km_text(lo)} to {km_text(hi)} km (estimated)"


def rows():
    d = json.loads(FILE.read_text(encoding="utf-8"))
    ix = {k: i for i, k in enumerate(d["cols"])}
    out = {}
    for r in d["rows"]:
        pdes, name = str(r[ix["pdes"]]), r[ix["name"]] or ""
        label = (f"{pdes} {name}" if pdes.isdigit() else name) if name else pdes
        out[pdes] = {"pdes": pdes, "label": label, "a": r[ix["a"]], "e": r[ix["e"]], "i": r[ix["i"]], "H": r[ix["H"]], "d": r[ix["d"]],
                     "moid": r[ix["moid"]], "cls": r[ix["cls"]], "why": r[ix["why"]]}
    ax = {k: i for i, k in enumerate(d["approachCols"])}
    read = dt.datetime.fromisoformat(d["read"] + "T00:00:00+00:00")
    start = int(read.timestamp() // 60)
    passes = [a for a in d["approaches"] if a[ax["tMin"]] >= start and a[ax["pdes"]] in out]
    passes.sort(key=lambda a: a[ax["tMin"]])
    return d, out, passes, ax


def name_cell(label: str) -> str:
    return f'<th scope="row" translate="no">{esc(label)}</th>'


def table(head: list[str], body: list[str]) -> str:
    th = "".join(f'<th scope="col">{h}</th>' for h in head)
    return f'<div class="tbl__s"><table><thead><tr>{th}</tr></thead><tbody>{"".join(body)}</tbody></table></div>\n'


def pages(host: str) -> list[Page]:
    d, by, passes, ax = rows()
    c = d["counts"]
    read = d["read"]
    nxt = []
    for a in passes[:SHOWN]:
        r = by[a[ax["pdes"]]]
        when = dt.datetime.fromtimestamp(a[ax["tMin"]] * 60, dt.timezone.utc).date()
        ld = a[ax["distAu"]] * AU_KM / LD_KM
        nxt.append(f'<tr>{name_cell(r["label"])}<td>{date_words(when)}</td><td>{ld:.1f} LD</td><td>{a[ax["vKmS"]]:.1f} km/s</td>'
                   f'<td>{esc(size_words(r["d"], r["H"]))}</td></tr>')
    big = sorted((r for r in by.values() if r["d"]), key=lambda r: -r["d"])[:SHOWN]
    big_rows = [f'<tr>{name_cell(r["label"])}<td>{r["d"]:.1f} km</td><td>{CLASS[r["cls"]]}</td><td>{r["moid"]:.4f} AU</td></tr>' for r in big]
    cheap = sorted(((delta_v(r["a"], r["e"], r["i"]), r) for r in by.values()), key=lambda x: (x[0] is None, x[0] or 0))[:SHOWN]
    cheap_rows = [f'<tr>{name_cell(r["label"])}<td>{dv:.2f} km/s</td><td>{esc(size_words(r["d"], r["H"]))}</td><td>{CLASS[r["cls"]]}</td></tr>'
                  for dv, r in cheap]
    n_close = c["approaching"]
    title = "Near-Earth asteroids: the next close passes"
    desc = (f"{grouped(c['neo'])} near-Earth asteroids are known. The next close passes, the largest and the cheapest to reach, "
            "from NASA/JPL data.")
    body = (
        '<p class="eyebrow">Catalogue</p>\n<h1>Near-Earth asteroids</h1>\n'
        f'<p class="lead">{grouped(c["neo"])} asteroids are known whose orbits bring them near the Earth’s. {grouped(c["pha"])} of them are called potentially '
        f'hazardous, {grouped(c["km"])} are about a kilometre across or larger, and {grouped(n_close)} pass within 0.05 AU of the Earth in the ten years '
        f'from {date_words(read)}.</p>\n'
        + '<div class="cta"><a class="btn btn--map" href="../#cat=asteroids">Open the catalogue on the map</a><p>Sort, filter, and fly to any of them.</p></div>\n'
        f"<h2>The next close passes</h2>\n<p>The first {len(nxt)} passes within 0.05 AU after {date_words(read)}, from NASA/JPL CNEOS. "
        f"LD is the Moon’s distance, {grouped(LD_KM)} km.</p>\n"
        + table(["Asteroid", "Date", "Distance", "Speed", "Size"], nxt)
        + f"<h2>The largest</h2>\n<p>The {len(big_rows)} largest near-Earth asteroids whose size JPL has measured.</p>\n"
        + table(["Asteroid", "Size", "Orbit", "Closest orbits come"], big_rows)
        + f"<h2>The cheapest to reach</h2>\n<p>The {len(cheap_rows)} lowest delta-v of the catalogue: the speed change from a low Earth orbit to "
        "meeting the rock, estimated from its orbit alone (Shoemaker and Helin, 1978). A ranking, not a mission plan: a real flight "
        "waits for a launch window.</p>\n"
        + table(["Asteroid", "Delta-v", "Size", "Orbit"], cheap_rows)
        + "<h2>What the words mean</h2>\n<ul>"
        "<li><strong>Potentially hazardous</strong> names an orbit that comes within 0.05 AU of the Earth’s and a rock bigger than about "
        "140 metres. It is a definition, not a forecast.</li>"
        "<li><strong>Apollo</strong> and <strong>Aten</strong> asteroids cross the Earth’s orbit, from outside and from inside; "
        "<strong>Amor</strong> asteroids come near it from outside; an <strong>Atira</strong>’s whole orbit lies inside the Earth’s.</li>"
        "<li>A size marked estimated is worked out from the brightness, for a rock as bright as a stony asteroid or as dark as a "
        "carbon-rich one.</li></ul>\n"
        f"<h2>Where the numbers come from</h2>\n<p>The orbits, sizes and classes are the NASA/JPL Small-Body Database’s, the passes "
        f"NASA/JPL CNEOS’s close-approach data, read {date_words(read)}. Both are public. The map reads a weekly saved copy of the passes.</p>\n"
    )
    page = Page(path=PATH, title=title, description=desc, body=body, og_title=title, lastmod=read)
    dataset = {
        "@type": "Dataset", "@id": f"{url_of(host, PATH)}#data", "name": "Near-Earth asteroids and their next close passes",
        "description": desc, "url": url_of(host, PATH), "license": "https://www.usa.gov/government-works",
        "creator": {"@type": "Organization", "name": "NASA Jet Propulsion Laboratory"},
        "isBasedOn": ["https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html", "https://ssd-api.jpl.nasa.gov/doc/cad.html"],
        "dateModified": read, "temporalCoverage": f"{read}/P10Y", "variableMeasured": ["orbit", "absolute magnitude", "diameter", "MOID",
                                                                                         "close-approach distance"],
    }
    page.jsonld = [webpage(host, page, [("Near-Earth asteroids", "")], page_type="CollectionPage", extra={"about": {"@id": f"{url_of(host, PATH)}#data"}}),
                   dataset]
    page.share = Spec(key="near-earth-asteroids/index", name="Near-Earth asteroids", number=f"{grouped(c['neo'])} known",
                      caption="Catalogue", kind="plain", colour="#b8926a", alt="A dot and an orbit, captioned Near-Earth asteroids.")
    return [page]
