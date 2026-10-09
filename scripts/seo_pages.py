#!/usr/bin/env python3
"""The crawlable pages that answer a question people type, built at deploy time (scripts/build_seo.py calls this).

    /o/international-space-station.html + /iss/index.html   Where is the ISS right now?
    /starlink/index.html, /satellites/index.html            Starlink tonight; the live satellite map
    /planets-tonight/index.html                             Which planets tonight, and from your place
    /events/index.html and /events/<id>.html                dated sky events (registry/sky-events.yaml)
    /about/, /sources/, /accuracy/                          the trust pages, from the registries
    /teachers/index.html                                    for the classroom
    /o/<system>.html                                        the 40 star systems (scripts/seo_systems.py)

THE RULE OF EVERY PAGE HERE. The static HTML already answers: the question is the H1 (or the first
sentence), the answer is a sentence, and a number that depends on the moment is either a DATED number
("saved 8 October 2026") or absent. The browser then replaces the numbers that can be worked out for
the visitor (site/js/pages/live.js, `[data-slot]` elements): a crawler, a no-script reader and a link
preview see the dated sentence; a visitor sees today's. NOTHING is a live number computed at build
time without its date beside it. Where the page models something, it says measured, computed or
imagined (docs/DESIGN_PRINCIPLES.md section 1); an exoplanet's picture is "an artist's impression".

NOT IN GIT, NOT IN site/. Like the object pages (scripts/build_seo.py): the pages are rebuilt from
the registries on every deploy and uploaded beside the app; scripts/deploy.sh syncs each directory
this file reports in `pages-dirs.txt`. Copy lives in this file and in templates/, which is where
scripts/check_copy.py lets visitor-facing sentences be (it holds site/js/ui/); the sentences the
BROWSER writes are in site/js/pages/live.js.

Run alone for a look: python3 scripts/seo_pages.py --out DIR   (build_seo.py is the usual door).
"""

from __future__ import annotations

import datetime as dt
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import seo_systems  # noqa: E402
from seo_common import (ACCOUNTS, ACCURACY_FORM, CLASSROOM_FORM, GITHUB, ROOT, Ctx, Page, esc, footer_nav,  # noqa: E402
                        make_ctx, place_picker, render, url_of, webpage)
from seo_share import Spec  # noqa: E402

REG = ROOT / "registry"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
# The place a build states "tonight" for: one reference city, named on the page (a crawler has no place).
REFERENCE_PLACE = {"name": "London", "latDeg": 51.5074, "lonDeg": -0.1278}
SUFFIX = " | Space Radar"


def yml(name: str) -> dict:
    return yaml.safe_load((REG / name).read_text(encoding="utf-8")) or {}


def date_words(d: str | dt.date) -> str:
    d = dt.date.fromisoformat(str(d)[:10])
    return f"{d.day} {MONTHS[d.month - 1]} {d.year}"


def instant_words(iso: str) -> str:
    d = dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return f"{d.day} {MONTHS[d.month - 1]} {d.year}, {d:%H:%M} UT"


def groups(n: float) -> str:
    return f"{round(n):,}"


def title_with_site(short: str) -> str:
    return short + SUFFIX if len(short + SUFFIX) <= 60 else short


def jdefault(o):
    if isinstance(o, dt.datetime):
        return o.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if isinstance(o, dt.date):
        return o.isoformat()
    raise TypeError(type(o))


def node_json(cmd: str, payload: dict) -> dict:
    node = shutil.which("node")
    if not node:
        raise SystemExit("seo_pages: needs Node 22 on PATH; the dated pages' astronomy is JavaScript (Astronomy Engine)")
    run = subprocess.run([node, str(ROOT / "scripts" / "seo_facts.mjs"), cmd], input=json.dumps(payload, default=jdefault),
                         capture_output=True, text=True, cwd=ROOT)
    if run.returncode != 0:
        raise SystemExit(f"seo_pages: scripts/seo_facts.mjs {cmd} failed:\n{run.stderr}")
    return json.loads(run.stdout)


def sky_events() -> list[dict]:
    """registry rows joined to what the maths says about each."""
    doc = yml("sky-events.yaml")
    rows = doc["events"]
    facts = {f["id"]: f for f in node_json("events", {"events": rows})["events"]}
    return [{**r, "facts": facts[r["id"]], "checked_on": doc["checked_on"]} for r in rows]


# --- the saved copies' numbers ---------------------------------------------------------------------------

def satellite_counts(snapshot_index: dict | None) -> dict:
    """The counts and the day they were read: the harvester's index when the build has it, else registry/seo-facts.yaml."""
    fb = yml("seo-facts.yaml")["satellite_counts"]
    out = {"starlink": fb["starlink_objects"], "active": fb["active_objects"], "date": str(fb["as_of"]), "source": fb["source"], "from": "registry"}
    snaps = (snapshot_index or {}).get("snapshots") or {}
    s, a = snaps.get("celestrak-supplemental-starlink"), snaps.get("celestrak-active")
    if s and a and s.get("items") and a.get("items") and s.get("fetched_at") and a.get("fetched_at"):
        out.update(starlink=s["items"], active=a["items"], date=min(s["fetched_at"], a["fetched_at"])[:10],
                   source="CelesTrak's active catalogue and Starlink supplemental file, as saved by this site's harvester", **{"from": "index"})
    return out


def rounded_thousands(n: int) -> str:
    return f"about {groups(round(n / 1000) * 1000)}"


# --- the ISS ----------------------------------------------------------------------------------------------

ISS_SLUG = "international-space-station"


def iss_pages(p: dict, host: str, counts: dict, snapshot_index: dict | None) -> list[Page]:
    saved = ((snapshot_index or {}).get("snapshots") or {}).get("celestrak-stations") or {}
    saved_day = date_words(saved["fetched_at"][:10]) if saved.get("fetched_at") else ""
    title = "Where is the ISS right now? Live 3D tracker" + SUFFIX
    h1 = "Where is the International Space Station right now?"
    static_answer = ("The International Space Station is about 400 km above the Earth, going once round it every 93 minutes at about "
                     "27,600 km/h, somewhere between 51.6° north and 51.6° south of the equator. Your browser works out the exact spot "
                     "the moment this page opens"
                     + (f", from orbital elements saved on {saved_day}" if saved_day else ", from the orbital elements this site saves from CelesTrak")
                     + ".")
    description = ("Where the International Space Station is right now, over which sea or country, how fast it moves, "
                   "who is aboard and when it passes you, on a live 3D map.")
    facts = "".join(f'<div><dt>{esc(f["label"])}</dt><dd>{esc(f["value"])}</dd></div>' for f in p["facts"])
    body = (
        '<p class="micro"><span class="dot" style="background:#F2F4F7"></span>Space station</p>\n'
        f"<h1>{esc(h1)}</h1>\n"
        f'<p class="lead" data-slot="iss-sentence">{esc(static_answer)}</p>\n'
        '<div class="cta"><a class="live" href="../#at=sat-25544">See it live in 3D</a>'
        '<p>Opens the map on the station, following it as it moves.</p></div>\n'
        '<div data-slot="iss-live" hidden>\n<h2>Where it is now</h2>\n<dl>'
        '<div><dt>Latitude</dt><dd data-slot="iss-lat">—</dd></div><div><dt>Longitude</dt><dd data-slot="iss-lon">—</dd></div>'
        '<div><dt>Over</dt><dd data-slot="iss-over">—</dd></div><div><dt>Height</dt><dd data-slot="iss-alt">—</dd></div>'
        '<div><dt>Speed</dt><dd data-slot="iss-speed">—</dd></div><div><dt>People aboard</dt><dd data-slot="iss-crew">—</dd></div></dl>\n'
        '<p class="dim" data-slot="iss-age"></p>\n</div>\n'
        "<h2>When you can see it from your place</h2>\n"
        + place_picker()
        + '<p data-slot="iss-pass">Choose a city to see when the station next passes it. With scripts off, the map\'s Tonight view '
          'does the same from the place you set there.</p>\n'
        '<p class="dim">A pass counts as visible here when the station is more than 10° above the horizon, in sunlight, '
        'while the Sun is more than 6° below it: the same rule the app uses for every satellite.</p>\n'
        "<h2>How to see the ISS</h2>\n"
        "<p>It looks like a very bright, steady white star that crosses the sky in two to six minutes, faster than a plane and with no "
        "blinking lights. At its best it outshines every star and rivals Venus. You need no telescope.</p>\n"
        "<p>You can see it only while the sky where you stand is dark and the station, 400 km up, is still in sunlight: "
        "in the two hours after dusk or before dawn. In the middle of the night it is in the Earth's shadow, and at noon the sky is too bright. "
        "Passes repeat for a few days and then stop for a few, as its orbit and the Earth's turning drift apart.</p>\n"
        '<p><a href="../#trip=journey-to-the-station">Take the trip from your ground to the station</a> · '
        '<a href="../#trip=people-in-space">Where people are living in space</a></p>\n'
        '<div class="note"><p><strong>Measured or computed?</strong> The orbital elements are published by CelesTrak from tracking '
        "and saved by this site; the position shown is computed from them (a model called SGP4). The older the elements, the less the position "
        "can be trusted: a few days is minutes of travel for a station that moves 7.7 km every second. The page says how old they are.</p></div>\n"
        + (f"<h2>Key facts</h2>\n<dl>{facts}</dl>\n" if facts else "")
        + '<h2>See also</h2>\n<ul class="links"><li><a href="hubble-space-telescope.html">Hubble Space Telescope</a></li>'
        '<li><a href="tiangong-space-station.html">Tiangong space station</a></li>'
        '<li><a href="../satellites/index.html">Live satellite map</a></li><li><a href="../starlink/index.html">Starlink tonight</a></li></ul>\n'
    )
    foot = (f'<p>{esc(p.get("sources") or "")} · People aboard: Launch Library (The Space Devs), read when the page opens. '
            "This page's numbers are worked out in your browser and are not live measurements.</p>\n")
    url = url_of(host, f"o/{ISS_SLUG}.html")

    def make(path: str, alias: bool) -> Page:
        page = Page(path=path, title=title, description=description, body=body, foot=foot, live="iss", og_title="Where is the ISS right now?",
                    kind="alias" if alias else "object", in_sitemap=not alias, canonical=url if alias else "")
        sw = {"@type": "SoftwareApplication", "@id": f"{host}/#app-iss", "name": "Space Radar", "applicationCategory": "EducationalApplication",
              "operatingSystem": "Any, in a web browser", "url": f"{host}/", "isAccessibleForFree": True,
              "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
              "description": "A free live 3D map of space in a browser: the space station, satellites, planets and stars, each at its real position."}
        iss = {"@type": "Thing", "@id": f"{url}#thing", "name": p["name"], "description": static_answer, "url": url}
        if p.get("sameAs"):
            iss["sameAs"] = p["sameAs"]
        page.jsonld = [webpage(host, Page(path=f"o/{ISS_SLUG}.html", title=title, description=description, body=""), [(p["name"], "")],
                               extra={"about": {"@id": f"{url}#thing"}, "mainEntity": {"@id": f"{host}/#app-iss"}}), sw, iss]
        page.share = Spec(key=f"o/{ISS_SLUG}", name="Where is the ISS right now?", number="400 km up, 27,600 km/h", caption="Space station",
                          kind="plain", colour="#F2F4F7", alt="The International Space Station as a bright dot on rings, captioned Where is the ISS right now?")
        return page

    return [make(f"o/{ISS_SLUG}.html", False), make("iss/index.html", True)]


# --- Starlink and the hub -------------------------------------------------------------------------------

def starlink_page(host: str, counts: dict, slugs: set) -> Page:
    short = "Starlink train tonight: where to look, and a live 3D map"
    n = counts["starlink"]
    day = date_words(counts["date"])
    desc = "What a Starlink train is, when one can be seen after a launch, and a live 3D map of the Starlink satellites at their real positions."
    body = (
        '<p class="micro"><span class="dot" style="background:#9ec3ff"></span>Satellites</p>\n'
        "<h1>Starlink train tonight: where to look, and a live 3D map</h1>\n"
        '<p class="lead">A Starlink train is a line of satellites, launched together, that can be seen as a string of bright dots moving across '
        "the sky in the first days after a launch, before they spread out and climb to their working height.</p>\n"
        f'<p>Our saved element sets hold <strong><span data-slot="count-starlink">{groups(n)}</span> Starlink objects</strong> '
        f'(CelesTrak\'s supplemental file, saved <span data-slot="count-starlink-date">{esc(day)}</span>). That is every Starlink satellite they list, '
        "in orbit or on its way up, not the number you can see tonight: from one place on a clear night it is the few dozen in a fresh train, or none.</p>\n"
        '<div class="cta"><a class="live" href="../#at=starlink">Open the Starlink satellites on the map</a>'
        '<p>The map flies to a Starlink satellite and turns its layer on.</p></div>\n'
        '<p><a href="../#trip=tonight-from-your-street">Your sky tonight</a>: the trip that starts from your own street and names what is worth looking for.</p>\n'
        "<h2>How a train forms</h2>\n"
        "<p>A Falcon 9 rocket releases dozens of Starlink satellites at once, in a low orbit, all within a few minutes and a few kilometres of "
        "each other. For days afterwards they keep nearly the same orbit, so they pass over you one after another, like beads on a string. "
        "Each then fires its own thruster to climb to about 550 km, and the orbits drift apart: the line stretches, fades and is gone in "
        "a few weeks. The map's \"fresh Starlink trains\" layer shows the satellites of launches under ten days old, grouped by launch.</p>\n"
        "<h2>When a train can be seen</h2>\n"
        "<p>Only in the hours after dusk or before dawn, when the sky is dark where you are and the satellites, hundreds of kilometres up, are still lit by the Sun. "
        "Which night depends on the launch and on where you are, so this page does not print a schedule that would be wrong by tomorrow; "
        "the map computes where each satellite is for the instant on its clock and for your place.</p>\n"
        '<div class="note"><p><strong>Measured or computed?</strong> The orbital elements are SpaceX\'s own, republished by CelesTrak, and are measurements. '
        "The positions are computed from them (SGP4) and get worse the older the elements are; the map says how old they are on every card. "
        "The number above is a count of objects listed, read on the date given.</p></div>\n"
        '<h2>More</h2>\n<ul class="links"><li><a href="../satellites/index.html">Live satellite map</a></li>'
        '<li><a href="../o/international-space-station.html">Where is the ISS?</a></li>'
        + '<li><a href="../t/satellites-and-junk.html">Trip: satellites and space junk</a></li></ul>\n')
    foot = (f"<p>Source: {esc(counts['source'])}, read {esc(day)}. The browser replaces this count with the one in the saved copy when the page opens. "
            "CelesTrak asks for one download of a file per update, so this page never fetches it itself.</p>\n")
    page = Page(path="starlink/index.html", title=short, description=desc, body=body, foot=foot, live="counts", og_title=short)
    page.jsonld = [webpage(host, page, [("Starlink train tonight", "")], extra={"about": {"@type": "Thing", "name": "Starlink"}}),
                   {"@type": "SoftwareApplication", "name": "Space Radar", "applicationCategory": "EducationalApplication",
                    "operatingSystem": "Any, in a web browser", "url": f"{host}/", "isAccessibleForFree": True,
                    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}]
    page.share = Spec(key="starlink/index", name="Starlink train tonight", number=f"{groups(n)} objects, {counts['date']}", caption="Satellites",
                      kind="plain", colour="#9ec3ff", alt="Rings and a dot, captioned Starlink train tonight.")
    return page


def satellites_page(host: str, counts: dict, slugs: set) -> Page:
    n = counts["active"]
    day = date_words(counts["date"])
    approx = rounded_thousands(n)
    short = f"Live 3D satellite map: {approx} objects"
    desc = f"A live 3D map of {approx} satellites at their real positions, with the space station, Hubble, Tiangong and Starlink, free in a browser."
    link = lambda slug, text: f'<li><a href="../o/{slug}.html">{text}</a></li>' if slug in slugs else ""  # noqa: E731
    body = (
        '<p class="micro"><span class="dot" style="background:#9ec3ff"></span>Satellites</p>\n'
        f"<h1>Live satellite map: {esc(approx)} objects at their real positions</h1>\n"
        f'<p class="lead">Space Radar draws the active satellites in orbit round the Earth, {esc(approx)} of them, each where its orbit says it is for this second, '
        "in 3D, in your browser, with no account.</p>\n"
        f'<p>Our saved element sets list <strong><span data-slot="count-active">{groups(n)}</span> active objects</strong> '
        f'(CelesTrak\'s active catalogue, saved <span data-slot="count-active-date">{esc(day)}</span>) and '
        f'<span data-slot="count-starlink">{groups(counts["starlink"])}</span> Starlink satellites, which are mostly the same ones counted again.</p>\n'
        '<div class="cta"><a class="live" href="../">Open the live map</a><p>Free, with no account and no advertising.</p></div>\n'
        "<h2>Start with one</h2>\n"
        '<ul class="links">'
        + link("international-space-station", "International Space Station")
        + link("hubble-space-telescope", "Hubble Space Telescope")
        + link("tiangong-space-station", "Tiangong space station")
        + link("james-webb-space-telescope", "James Webb Space Telescope")
        + '<li><a href="../starlink/index.html">Starlink train tonight</a></li>'
        '<li><a href="../iss/index.html">Where is the ISS right now?</a></li></ul>\n'
        "<h2>What the map shows, and how</h2>\n"
        "<p>Each satellite's orbital elements are published by CelesTrak, and the page of the map works out where the satellite is at the instant on its clock "
        "(a model called SGP4), so the clock can be moved to the past or the future and the satellites move with it. Satellites are drawn larger than life: "
        "at their true size they would be invisible.</p>\n"
        '<div class="note"><p><strong>Measured or computed?</strong> The elements are measured by tracking and republished; the positions are computed from them, '
        "and the older the elements the less a position can be trusted. Every card says how old its elements are. The count above is of objects listed on the day given, "
        "not a count of working satellites.</p></div>\n"
        '<p><a href="../t/satellites-and-junk.html">Trip: satellites and space junk</a> · '
        '<a href="../#trip=people-in-space">Where people are living in space right now</a></p>\n')
    foot = (f"<p>Source: {esc(counts['source'])}, read {esc(day)}. The browser replaces these counts with the saved copy's when the page opens.</p>\n")
    page = Page(path="satellites/index.html", title=short, description=desc, body=body, foot=foot, live="counts", og_title=f"Live satellite map: {approx} objects")
    page.jsonld = [webpage(host, page, [("Live satellite map", "")], extra={"about": {"@type": "Thing", "name": "Artificial satellites"}}),
                   {"@type": "SoftwareApplication", "name": "Space Radar", "applicationCategory": "EducationalApplication",
                    "operatingSystem": "Any, in a web browser", "url": f"{host}/", "isAccessibleForFree": True,
                    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}]
    page.share = Spec(key="satellites/index", name="Live satellite map", number=f"{approx} objects", caption="Satellites", kind="plain", colour="#9ec3ff",
                      alt="Rings and a dot, captioned Live satellite map.")
    return page


# --- planets tonight ------------------------------------------------------------------------------------

def planets_page(host: str, today: str) -> Page:
    facts = node_json("planets", {"date": today, "place": REFERENCE_PLACE})
    place = facts["place"]["name"]
    night = date_words(today)
    ups = facts["planets"]
    if ups:
        parts = [f"{p['name']} (magnitude {p['mag']:g}, highest in the {p['compass']} at {p['bestUtc'][11:16]} UT, {p['altDeg']}° up)" for p in ups]
        sentence = f"On the evening of {night}, from {place}, the planets up in the dark are " + "; ".join(parts) + "."
    else:
        sentence = f"On the evening of {night}, from {place}, no bright planet is well up while the sky is dark."
    if facts["notUp"]:
        sentence += f" Not well placed: {', '.join(facts['notUp'])}."
    moon = facts.get("moon")
    moon_line = (f"The Moon is {moon['percent']} percent lit ({moon['phase']}) and {'is' if moon['upTonight'] else 'is not'} up in the dark."
                 if moon else "")
    short = "Planets visible tonight: which, where and when"
    desc = "Which planets you can see tonight, where to look and when, worked out for your place in your browser, with tonight's list for London."
    items = "".join(f"<li>{esc(p['name'])}, magnitude {p['mag']:g}: highest at {esc(p['bestUtc'][11:16])} UT, {p['altDeg']}° up in the {esc(p['compass'])}.</li>" for p in ups)
    body = (
        '<p class="micro"><span class="dot" style="background:#ffc28a"></span>Sky tonight</p>\n'
        "<h1>Which planets can you see tonight?</h1>\n"
        f'<p class="lead">{esc(sentence)}</p>\n'
        f'<p class="dim">Worked out when this page was built, for {esc(night)} and {esc(place)} only (the build knows no other place). '
        "The list below is for your place and your moment, worked out in your browser.</p>\n"
        '<div data-slot="planets-live" hidden>\n<h2>From your place tonight</h2>\n<p data-slot="planets-summary"></p>\n'
        '<ul class="sky-list" data-slot="planets-list"></ul>\n<p data-slot="planets-down" class="dim"></p>\n<p data-slot="moon-line"></p>\n</div>\n'
        f'<h2>From {esc(place)} on {esc(night)}</h2>\n<ul class="sky-list">{items}</ul>\n<p>{esc(moon_line)}</p>\n'
        "<h2>Choose your place</h2>\n"
        + place_picker("This page starts from the place you set in the map, or a city guessed from your time zone. It does not ask your browser for a position unless you press the button.")
        + '<div class="cta"><a class="live" href="../#trip=planets-tonight">See the sky from the ground</a>'
        "<p>The trip that takes every planet in turn, then shows where to look from your street.</p></div>\n"
        "<h2>How to read it</h2>\n"
        "<p>A planet is listed when it climbs at least 10° (Mercury and Venus, which never stray far from the Sun, 5°) while the sky is dark: between the end of "
        "evening twilight and the start of morning twilight, with the Sun more than 6° below the horizon. Magnitude is brightness: the lower, the brighter; "
        "0 is a bright star, −2 is brighter than any star. Planets do not twinkle much and shine with a steady light.</p>\n"
        '<div class="note"><p><strong>Measured or computed?</strong> The positions are computed from the planets\' own orbits (Astronomy Engine) for the instant and the place; '
        "nothing is fetched. Brightness is a model of the planet's phase and distance.</p></div>\n"
        '<p><a href="../t/tonight-from-your-street.html">Tonight from your street</a> · <a href="../t/moon-phases.html">Why the Moon changes shape</a></p>\n')
    foot = f"<p>The sentence at the top was computed on {esc(night)} for {esc(place)}. It is rebuilt at every deploy; the live list is computed when you open the page.</p>\n"
    page = Page(path="planets-tonight/index.html", title=short, description=desc, body=body, foot=foot, live="planets", og_title=short, lastmod=today)
    page.jsonld = [webpage(host, page, [("Planets tonight", "")], extra={"about": {"@type": "Thing", "name": "Planets of the Solar System"}, "dateModified": today})]
    names = ", ".join(p["name"] for p in ups[:3]) or "the Moon and stars"
    page.share = Spec(key="planets-tonight/index", name="Planets visible tonight", number=names, caption=f"From {place}, {night}", kind="plain",
                      colour="#ffc28a", alt="Rings and a dot, captioned Planets visible tonight.")
    return page


# --- events ------------------------------------------------------------------------------------------------

AT_WORDS = {"moon": "the Moon", "earth": "the Earth", "mercury": "Mercury", "venus": "Venus"}


def link_of(ev: dict) -> str:
    return f"../#t={ev['link']['t']}&at={ev['link']['at']}"


def hh(iso: str) -> str:
    return iso[11:16] + " UT"


def event_sentence(ev: dict) -> str:
    f = ev["facts"]
    if ev["kind"] == "meteor-shower":
        sh = f["shower"]
        moon = f["moon"]
        s = (f"The {sh['display']} peak on {instant_words(f['instant'])}, with up to about {sh['zhr']} meteors an hour under a perfect dark sky, "
             f"coming from {sh['constellation']}. The Moon is about {moon['percent']} percent lit and {'waxing' if moon['waxing'] else 'waning'} "
             f"at the hour we state it for ({instant_words(f['moonAt'])}).")
        return s
    if ev["kind"] == "mission":
        m = f["mercury"]
        return (f"{ev['mission']}, the European and Japanese mission to Mercury, is due to enter orbit round the planet on {date_words(ev['happens'])}, "
                f"the date ESA gives (read {date_words(ev['sources'][0]['read'])}). That day Mercury stands {m['degrees']:g}° from the Sun in the "
                f"{'morning' if m['visibility'] == 'morning' else 'evening'} sky.")
    if ev["kind"] == "eclipse":
        kind = f["kind"]
        what = ("the Moon crosses in front of the Sun without covering it, leaving a ring of sunlight" if kind == "annular"
                else "the Moon covers the Sun completely for those inside its narrow path")
        return (f"On {date_words(f['instant'])} {what}: greatest eclipse at {instant_words(f['instant'])}, at {abs(f['latDeg']):g}° {'S' if f['latDeg'] < 0 else 'N'}, "
                f"{abs(f['lonDeg']):g}° {'W' if f['lonDeg'] < 0 else 'E'}. Computed with Astronomy Engine, checked {date_words(ev['checked_on'])}.")
    return ""


def event_page(ev: dict, host: str, trips: dict) -> Page:
    f = ev["facts"]
    short = ev["short"]
    desc = ev["summary"]
    url = url_of(host, f"events/{ev['id']}.html")
    sentence = event_sentence(ev)
    rows = []
    where_static = ("Choose a city to see what this looks like from there. With scripts off, the map's Tonight view works out the same for the place you set in it.")
    sections = ""
    if ev["kind"] == "meteor-shower":
        sh = f["shower"]
        m = f["moon"]
        rows += [("Peak, computed", instant_words(f["instant"])), ("Rate in a perfect sky", f"up to about {sh['zhr']} an hour"),
                 ("Radiant", f"in {sh['constellation']}"), ("Parent body", sh["parent"]),
                 (f"Moon at {hh(f['moonAt'])} on {date_words(f['moonAt'][:10])}", f"{m['percent']} percent lit, {'waxing' if m['waxing'] else 'waning'}")]
        sections += ("<h2>What to expect</h2>\n"
                     f"<p>The rate quoted for a shower (its ZHR, {sh['zhr']} for the {esc(sh['display'])}) is what one observer would count in an hour under a perfect dark sky "
                     "with the radiant overhead: from a town, or with the radiant low, it is a fraction. Lie back, look at a wide patch of sky away from lights, "
                     "give your eyes twenty minutes, and expect meteors from any part of the sky, all tracing back to the radiant.</p>\n"
                     "<h2>What the Moon will do</h2>\n"
                     f"<p>At {esc(hh(f['moonAt']))} on {esc(date_words(f['moonAt'][:10]))} the Moon is {m['percent']} percent lit and {'waxing' if m['waxing'] else 'waning'}. "
                     "That is for anywhere on Earth; whether it is up from your place, and how high, is in the box above.</p>\n")
        for a in f["also"]:
            if a["what"] == "greatest-western-elongation":
                sections += ("<h2>Venus the same morning</h2>\n"
                             f"<p>Venus reaches its greatest western elongation on {esc(instant_words(a['instant']))}: {a['elongationDeg']:g}° from the Sun, "
                             "as far from it in the morning sky as it ever gets. It rises before the Sun and is the brightest point in the east before dawn.</p>\n")
                rows.append(("Venus, greatest western elongation", f"{instant_words(a['instant'])}, {a['elongationDeg']:g}°"))
    elif ev["kind"] == "mission":
        m = f["mercury"]
        rows += [("Date", date_words(ev["happens"])), ("Mercury that day", f"{m['degrees']:g}° from the Sun, {m['visibility']} sky"), ("Moon that day", f"{f['moonAtNoon']['percent']} percent lit")]
        sections += ("<h2>What happens</h2>\n"
                     "<p>BepiColombo is two orbiters flown together: ESA's Mercury Planetary Orbiter and JAXA's Mio. After six flybys of Mercury it enters orbit "
                     "on the date above, and the two orbiters separate on 9 and 10 December 2026 (both dates are ESA's). The insertion happens at Mercury, so there is nothing "
                     "to see from the ground. The map shows Mercury where it really is on that day; the spacecraft's own path in orbit is not drawn.</p>\n")
        where_static = "Choose a city to see where Mercury is in your sky that day."
    elif ev["kind"] == "eclipse":
        cities = f.get("cities") or []
        path = [c for c in cities if c["kind"] in ("annular", "total")]
        part = [c for c in cities if c["kind"] == "partial"][:8]
        rows += [("Greatest eclipse", instant_words(f["instant"])), ("Where", f"{abs(f['latDeg']):g}° {'S' if f['latDeg'] < 0 else 'N'}, {abs(f['lonDeg']):g}° {'W' if f['lonDeg'] < 0 else 'E'}"),
                 ("Kind", f["kind"])]
        sections += ("<h2>Who sees what</h2>\n"
                     + (f"<p>Of the cities the map knows, these lie in the path of the {esc(f['kind'])} eclipse (computed for each; the Sun may be low): "
                        + ", ".join(f"{esc(c['name'])} ({esc(c['country'])}), {c['obscuration']} percent at {esc(c['maxUtc'][11:16])} UT, Sun {c['altDeg']}° up" for c in path) + ".</p>\n"
                        if path else "<p>None of the cities the map knows lies in the narrow path of the central phase. A visitor in the path sees it at the greatest-eclipse time above; everyone in the wider band sees a partial eclipse.</p>\n")
                     + (f"<p>Partial eclipse, the largest share of the Sun covered, from other cities: "
                        + ", ".join(f"{esc(c['name'])} {c['obscuration']} percent" for c in part) + ".</p>\n" if part else "")
                     + "<h2>Look safely</h2>\n"
                       "<p>Never look at the Sun without eclipse glasses that meet the ISO 12312-2 standard, or a certified solar filter on a telescope or binoculars. "
                       "That holds for an annular eclipse, which has no safe moment of totality, and for every partial phase of a total one.</p>\n")
    dl = "".join(f"<div><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>" for a, b in rows)
    trip = ev.get("trip")
    trip_link = (f'<p><a href="../#trip={esc(trip)}">Take the trip: {esc(trips[trip])}</a></p>\n' if trip else "")
    srcs = "".join(f'<li><a href="{esc(s["url"])}" rel="nofollow">{esc(s["words"])}</a>, read {esc(date_words(s["read"]))}</li>' for s in ev["sources"])
    body = (
        f'<p class="micro"><span class="dot" style="background:#ffc28a"></span>Sky event · {esc(date_words(f["instant"][:10]))}</p>\n'
        f"<h1>{esc(ev['name'])}</h1>\n"
        f'<p class="lead">{esc(sentence)}</p>\n'
        f'<div class="cta"><a class="live" href="{esc(link_of(ev))}">Open the map at that moment</a>'
        f"<p>Sets the map's clock to {esc(instant_words(ev['link']['t']))} and flies to {esc(AT_WORDS.get(ev['link']['at'], ev['link']['at']))}.</p></div>\n"
        f"{trip_link}"
        "<h2>The facts</h2>\n"
        f"<dl>{dl}</dl>\n"
        "<h2>Where to look from your place</h2>\n"
        + place_picker()
        + f'<p data-slot="event-local" hidden></p>\n<p class="dim">{esc(where_static)}</p>\n'
        + sections
        + f'<script type="application/json" id="event-data">{json.dumps({"kind": ev["kind"], "instant": f["instant"], "shower": ({"raH": f["shower"]["raH"], "decDeg": f["shower"]["decDeg"]} if "shower" in f else None), "also": f["also"]}, separators=(",", ":"))}</script>\n'
        + '<h2>Sources</h2>\n<ul>' + srcs + "</ul>\n"
        '<div class="note"><p><strong>Measured or computed?</strong> '
        + ("Dates of the showers and of the eclipses are computed with Astronomy Engine, the same library the map uses, "
           f"and were read by a person on {esc(date_words(ev['checked_on']))}. The Moon's percentage is computed. Rates are the IMO's and are not predictions of what you will count."
           if ev["kind"] != "mission" else
           "The date is ESA's, read on the day given; a spacecraft's date can move, and this page is rebuilt from the registry when it does. The planet's position is computed.")
        + "</p></div>\n"
        '<p><a href="index.html">All the sky events</a></p>\n')
    page = Page(path=f"events/{ev['id']}.html", title=short, description=desc, body=body, live="event", og_title=ev["name"], og_type="article", kind="event",
                lastmod=str(ev["checked_on"]))
    start = f["instant"] if ev["kind"] != "mission" else str(ev["happens"])
    event_ld = {"@type": "Event", "@id": f"{url}#event", "name": ev["name"], "description": sentence, "startDate": start,
                "eventStatus": "https://schema.org/EventScheduled", "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
                "isAccessibleForFree": True, "url": url, "inLanguage": "en",
                "location": [{"@type": "VirtualLocation", "url": url}],
                "organizer": {"@type": "Organization", "name": "Space Radar", "url": f"{host}/"}}
    if ev["kind"] == "meteor-shower":
        event_ld["location"].append({"@type": "Place", "name": "The night sky, wherever the radiant is above the horizon", "address": "Worldwide"})
        event_ld["eventAttendanceMode"] = "https://schema.org/MixedEventAttendanceMode"
    elif ev["kind"] == "eclipse":
        event_ld["location"].append({"@type": "Place", "name": f"The path of the {f['kind']} eclipse and the band of partial eclipse round it", "address": "Worldwide"})
        event_ld["eventAttendanceMode"] = "https://schema.org/MixedEventAttendanceMode"
    page.jsonld = [webpage(host, page, [("Sky events", "events/index.html"), (ev["name"], "")], extra={"about": {"@id": f"{url}#event"}}), event_ld]
    page.share = Spec(key=f"events/{ev['id']}", name=ev["name"], number=date_words(f["instant"][:10]), caption="Sky event", kind="plain", colour="#ffc28a",
                      alt=f"Rings and a dot, captioned {ev['name']}.")
    return page


def events_index(events: list[dict], host: str) -> Page:
    short = "Sky events: meteor showers, Mercury and eclipses"
    desc = "Dated sky events from November 2026 to August 2027: showers, BepiColombo at Mercury, Venus and two solar eclipses, each with a map link."
    ordered = sorted(events, key=lambda e: e["facts"]["instant"])
    items = "".join(
        f'<li><h3><a href="{esc(e["id"])}.html">{esc(e["name"])}</a></h3><p>{esc(date_words(e["facts"]["instant"][:10]))}</p><p>{esc(e["summary"])}</p></li>' for e in ordered)
    body = ('<p class="micro">Sky events</p>\n<h1>Sky events, with a link into the map at each moment</h1>\n'
            '<p class="lead">Every event here has a date computed or taken from an agency, what the Moon will do, what your place will see, and a link that opens the map at that moment.</p>\n'
            f'<ul class="cards">{items}</ul>\n<p class="dim">Dates are computed with Astronomy Engine and checked by a person; a mission\'s date is its agency\'s. '
            "The sources are on each page.</p>\n")
    page = Page(path="events/index.html", title=short, description=desc, body=body, og_title=short)
    page.jsonld = [webpage(host, page, [("Sky events", "")], page_type="CollectionPage"),
                   {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i, "url": url_of(host, f"events/{e['id']}.html"), "name": e["name"]}
                                                              for i, e in enumerate(ordered, start=1)]}]
    page.share = Spec(key="events/index", name="Sky events", number=f"{len(events)} dated events", caption="Space Radar", kind="plain", colour="#ffc28a",
                      alt="Rings and a dot, captioned Sky events.")
    return page


# --- the trust pages -------------------------------------------------------------------------------------

def counts_of_registries() -> dict:
    layers = [r for r in yml("layers.yaml").get("layers", []) if r.get("enabled", True) is not False]
    return {"layers": len(layers), "trips": len(yml("tours.yaml")["tours"]), "sources": len(yml("sources.yaml")["sources"])}


def licence_name() -> str:
    first = (ROOT / "LICENSE").read_text(encoding="utf-8").strip().splitlines()[0].strip()
    return first or "MIT License"


def about_page(host: str) -> Page:
    n = counts_of_registries()
    short = "About Space Radar: a free, honest 3D map of space"
    desc = "What Space Radar is, why it exists, who makes it, why it stays free, and what the name does and does not mean."
    me = "".join(f'<li><a href="{esc(u)}" rel="me noopener">{esc(name)}</a></li>' for name, u in ACCOUNTS)
    body = (
        '<p class="micro">About</p>\n<h1>About Space Radar</h1>\n'
        '<p class="lead">Space Radar is a free 3D map of space in a web browser: the satellites and the space station, launches, probes, the planets, '
        "the nearest stars and the galaxies, each drawn where it really is, with where the numbers come from.</p>\n"
        "<h2>What it is</h2>\n"
        f"<p>It draws {n['layers']} layers and reads {n['sources']} public sources to do it, and offers {n['trips']} guided trips that fly the camera from stop to stop. "
        "Every position is worked out in the visitor's own browser from public data, for the instant on the clock: satellites from their orbital elements, planets "
        "and probes from ephemerides. The clock can be moved, and the sky moves with it.</p>\n"
        "<h2>Why it exists</h2>\n"
        "<p>Space is easy to see and hard to understand in the wrong picture. Most pictures of the Solar System are not to scale, most satellite maps are 2D, and "
        "almost none say what is measured and what is imagined. This one is built to be honest about that first, and beautiful second.</p>\n"
        "<h2>Who makes it</h2>\n"
        f'<p>It is an open-source project, <a href="{GITHUB}">Sara-Managed-Projects/space-radar</a> on GitHub, written in the open under the {esc(licence_name())}. '
        "Anyone can read the code, run a copy, report a wrong number or suggest an idea there, and the people who have contributed are named in the repository's history. "
        "There is no company behind a paywall and no person's name on the page: the project is the code and its sources.</p>\n"
        "<h2>Free, and staying usable</h2>\n"
        "<p>Space Radar has no account, no advertising and no tracker, and charges nothing. No promise about a website can be a promise about forever, so this is the one that can be kept: "
        "the code is open, and a copy runs on any computer with no internet at all, from a zip file (see <a href=\"../teachers/index.html\">the page for teachers</a>). "
        "If this site ever went away, the map would not.</p>\n"
        "<h2>The name</h2>\n"
        "<p>\"Radar\" here means a sweep of what is up there, not a radio echo: nothing on this site is detected by us. Every position is computed from catalogues that others publish, "
        "and every card says which and how old. Space Radar is not part of, and not endorsed by, NASA, ESA, CelesTrak or any space agency or company, and other products use similar words.</p>\n"
        "<h2>How to trust it</h2>\n"
        '<ul class="links"><li><a href="../accuracy/index.html">How accurate it is</a></li><li><a href="../sources/index.html">Where every number comes from</a></li>'
        f'<li><a href="{GITHUB}/blob/main/CREDITS.md">Credits and licences</a></li></ul>\n'
        f'<h2>Find us</h2>\n<ul class="links">{me}</ul>\n')
    page = Page(path="about/index.html", title=short, description=desc, body=body, og_title=short)
    page.jsonld = [webpage(host, page, [("About", "")], page_type="AboutPage")]
    page.share = Spec(key="about/index", name="About Space Radar", number=f"{n['layers']} layers, {n['sources']} sources", caption="Space Radar", kind="plain",
                      colour="#ff9f43", alt="Rings and a dot, captioned About Space Radar.")
    return page


def sources_rows() -> list[dict]:
    return yml("sources.yaml")["sources"]


def sources_page(host: str, snapshot_index: dict | None) -> Page:
    rows = sources_rows()
    snaps = (snapshot_index or {}).get("snapshots") or {}
    short = "Sources: where every number in Space Radar comes from"
    desc = f"All {len(rows)} public sources Space Radar reads, each with its licence, the page that states it, and the day the terms were recorded."
    tr = []
    for r in rows:
        saved = (snaps.get(r["id"]) or {}).get("fetched_at")
        saved_txt = date_words(saved[:10]) if saved else "when the page opens"
        off = " (switched off: nothing is fetched)" if r.get("enabled") is False else ""
        tr.append(
            f'<tr id="{esc(r["id"])}"><td><strong>{esc(r["id"])}</strong>{esc(off)}<br><span class="dim">{esc(r["attribution"])}</span></td>'
            f'<td>{esc(r["licence"])}</td><td><a href="{esc(r["terms_url"])}" rel="nofollow">terms</a></td>'
            f'<td>{esc(date_words(r["terms_recorded"]))}</td><td data-slot="source-read" data-source="{esc(r["id"])}">{esc(saved_txt)}</td></tr>')
    body = (
        '<p class="micro">Sources</p>\n<h1>Where every number comes from</h1>\n'
        f'<p class="lead">Space Radar reads {len(rows)} public sources. Each row below is a row of the registry this page is built from '
        "(<code>registry/sources.yaml</code>): the licence is the publisher's terms as the project recorded them, and the date is the day they were first written into "
        f'<a href="{GITHUB}/blob/main/CREDITS.md">CREDITS.md</a>.</p>\n'
        '<div class="tablewrap"><table>\n<thead><tr><th>Source</th><th>Licence</th><th>Terms</th><th>Terms recorded</th><th>Saved copy last read</th></tr></thead>\n'
        f"<tbody>\n{chr(10).join(tr)}\n</tbody></table></div>\n"
        '<p class="dim">"Saved copy last read" is the day this site\'s harvester last fetched the source, taken from the saved copy\'s index when the page opens; '
        "it is not the day the terms were read. Where a licence says \"no licence stated\", that is the answer, and the project treats it as no permission to redistribute beyond what the credits say.</p>\n"
        "<h2>Everything else</h2>\n"
        f'<p>The libraries, textures, 3D models, photographs, sounds and fonts, each with its licence, are in <a href="{GITHUB}/blob/main/CREDITS.md">CREDITS.md</a>, '
        "which a test holds to the registries line by line.</p>\n")
    page = Page(path="sources/index.html", title=short, description=desc, body=body, og_title=short, live="sources")
    page.jsonld = [webpage(host, page, [("Sources", "")], page_type="CollectionPage")]
    page.share = Spec(key="sources/index", name="Where every number comes from", number=f"{len(rows)} public sources", caption="Sources", kind="plain",
                      colour="#9ec3ff", alt="Rings and a dot, captioned Where every number comes from.")
    return page


def accuracy_page(host: str) -> Page:
    short = "How accurate is Space Radar? Measured or modelled"
    desc = "Every drawing is measured, modelled or illustrative and says which. How a position is worked out, how old it is, and how exoplanets are labelled."
    body = (
        '<p class="micro">Accuracy</p>\n<h1>How accurate is Space Radar?</h1>\n'
        '<p class="lead">Everything drawn is measured, modelled or illustrative, and says which. This page says what each word means and what we do when we are wrong.</p>\n'
        "<h2>The three words</h2>\n"
        '<p><span class="badge measured">measured</span> A position worked out from a publisher\'s data of a stated age: a satellite from its orbital elements, '
        "a planet from the ephemeris. The age is part of the number, and a card says \"Position propagated from elements 6 days old\".</p>\n"
        '<p><span class="badge computed">modelled</span> Computed from physics or a fitted orbit, with the error measured where we could: a probe\'s orbit continued from its last '
        "published state, the habitable zone of a star, the temperature of a bare ball at some distance.</p>\n"
        '<p><span class="badge imagined">illustrative</span> A picture built to explain: the spiral of the Milky Way, a procedural satellite shape, the colour of a planet nobody has seen.</p>\n'
        "<h2>The exoplanet rule</h2>\n"
        "<p>Nobody has seen the surface of a planet of another star. What is known is its size, its orbit, sometimes its mass, and by which method it was found. "
        "So on every exoplanet page the size, the period and the method are the Archive's (NASA Exoplanet Archive), anything we work out is marked computed, "
        "and <strong>the picture is an artist's impression</strong>: its colour, clouds and land are imagined, said on the page and printed on the share picture. "
        "\"Habitable zone\" is said only for the band we compute (Kopparapu et al. 2014) and always with the word computed; it says where liquid water could be possible on a rocky world's surface, "
        "never that anything lives there.</p>\n"
        "<h2>Where a number can be wrong</h2>\n"
        "<ul>\n<li>A satellite's position is as old as its elements. After a week a low satellite such as the station can be minutes of travel from where the map draws it.</li>\n"
        "<li>Distances and sizes are sometimes changed so that a thing can be seen at all (satellites are drawn larger than life); the card or the picture says so.</li>\n"
        "<li>Where we could not look, the card says \"could not look\" or leaves the line out. A guess is never shown as a reading.</li>\n</ul>\n"
        "<h2>When we get it wrong</h2>\n"
        f'<p>Tell us with <a href="{ACCURACY_FORM}">the form for a wrong number, name or position</a>. Getting it right matters more to this project than anything else. '
        "<strong>There is no separate corrections log yet.</strong> What exists is the project's public history: "
        f'<a href="{GITHUB}/blob/main/CHANGELOG.md">the changelog</a>, which records changes of facts under its fixes, and every commit and issue on '
        f'<a href="{GITHUB}">GitHub</a>. A page that lists each correction, with its date, is a task for the project, not something to pretend we already have.</p>\n'
        '<p><a href="../sources/index.html">Where every number comes from</a></p>\n')
    page = Page(path="accuracy/index.html", title=short, description=desc, body=body, og_title=short)
    page.jsonld = [webpage(host, page, [("Accuracy", "")])]
    page.share = Spec(key="accuracy/index", name="How accurate is Space Radar?", number="measured, modelled, illustrative", caption="Accuracy", kind="plain",
                      colour="#9ad1a5", alt="Rings and a dot, captioned How accurate is Space Radar?")
    return page


# --- teachers ---------------------------------------------------------------------------------------------

LESSONS = [
    ("moon-phases", "Why the Moon changes shape",
     "Ask: where do you think the shadow on the Moon comes from? Then fly the trip and watch the Moon's month from space, then from your street. "
     "Stop on each phase and ask which way the Sun is. Finish by asking what a person standing on the Moon would see of the Earth in each phase."),
    ("a-year-in-a-minute", "How long is a year on another world?",
     "Ask: how long does the Earth take to go round the Sun? Run a year in a minute and count how many times each inner planet laps the Earth. "
     "Ask whose year is shortest and why a planet closer to the Sun moves faster."),
    ("outer-solar-system", "How big is the Solar System?",
     "Ask for a guess in minutes of travel at the speed of light to the Sun, to Jupiter, to Neptune. Fly out past Jupiter and compare the guesses with the distances on each card."),
    ("travel-to-exoplanets", "How do we know planets of other stars exist?",
     "Ask what you would need to see to know a planet is there if the star is far too bright. Fly to the planets of other stars and, at each card, ask which numbers are measured "
     "and which the picture only imagines (the pictures are artists' impressions)."),
    ("satellites-and-junk", "What is orbiting above our heads?",
     "Ask how many things are in orbit. Fly the trip from the working satellites to the ring that stands still and the junk, and ask what it would take to keep orbits tidy."),
]


def teachers_page(host: str, tours: dict, reels: dict, url_keys: list[str]) -> Page:
    short = "Free 3D solar system for the classroom, works offline"
    desc = "Space Radar in a classroom or a museum: no account, no tracking, present mode, a kiosk setup, an offline copy and five ten-minute lesson starters."
    for tid, *_ in LESSONS:
        if tid not in tours:
            raise SystemExit(f"seo_pages: the lesson trip {tid} is not a trip of registry/tours.yaml")
    lessons = "".join(
        f'<li><h3>{i}. {esc(title)}</h3><p>{esc(text)}</p><p><a href="../#trip={esc(tid)}&amp;present=1">Start the trip in present mode: {esc(tours[tid])}</a></p></li>'
        for i, (tid, title, text) in enumerate(LESSONS, start=1))
    reel_rows = "".join(
        f"<tr><td><code>#ambient={esc(r['id'])}</code></td><td>{esc(r['title'])}: {esc(r['blurb'])}</td><td>about {r['minutes']} min, {len(r['trips'])} trips</td></tr>"
        for r in reels["reels"])
    body = (
        '<p class="micro">For teachers</p>\n<h1>Space Radar in the classroom</h1>\n'
        '<p class="lead">A free 3D map of the Solar System, the satellites above you and the stars beyond, in a browser: no account to make, nothing to install, '
        "no tracking, and it works with no internet from a copy you download once.</p>\n"
        '<div class="cta"><a class="live" href="../">Open it now</a><p>Or take it offline: three steps below.</p></div>\n'
        "<h2>What it needs</h2>\n"
        "<p>A computer from the last eight years or so, with Chrome, Edge, Firefox or Safari. No login, no licence key, no personal data in any request: nobody is tracked. "
        "To run a copy offline, Python 3 (most Macs and Linux machines have it) to serve a folder.</p>\n"
        "<h2>A running offline copy in three steps</h2>\n"
        "<ol class=\"steps\">\n"
        f'<li><strong>Download</strong> <code>space-radar-&lt;version&gt;.zip</code> from <a href="{GITHUB}/releases/latest">the Releases page</a> and unzip it. The zip already holds a saved copy of the data.</li>\n'
        "<li><strong>Serve</strong> it: open a terminal in the unzipped folder and run <code>python3 -m http.server 8177 --directory site</code> (Windows: <code>py</code> instead of <code>python3</code>).</li>\n"
        "<li><strong>Open</strong> <code>http://localhost:8177</code> in the browser. After that first visit it starts again with the server stopped.</li>\n</ol>\n"
        f'<p>The whole guide, with a school server, a USB stick and what works with no network, is <a href="{GITHUB}/blob/main/docs/RUN_LOCALLY.md">docs/RUN_LOCALLY.md</a>. '
        "The saved data is as old as the day the zip was made, and every card says so: tell the class that a satellite's position drifts after a week or two.</p>\n"
        "<h2>Present mode</h2>\n"
        "<p>One trip for a room: the panels go, each stop's words are set large enough to read from the back, and whoever holds the clicker decides when to go on. "
        "Add <code>&amp;present=1</code> to a trip's link, or press Present on the trip's first card; <code>present=auto</code> lets it move on by itself.</p>\n"
        "<pre><code>http://localhost:8177/#trip=moon-phases&amp;present=1\nhttp://localhost:8177/#trip=mars-where-we-have-driven&amp;present=auto</code></pre>\n"
        '<div class="tablewrap"><table><thead><tr><th>Key</th><th>What it does</th></tr></thead><tbody>'
        "<tr><td><code>→</code> <code>Page Down</code> <code>Space</code></td><td>Next stop (a presenter's clicker sends these)</td></tr>"
        "<tr><td><code>←</code> <code>Page Up</code></td><td>Previous stop</td></tr>"
        "<tr><td><code>F</code></td><td>Full screen, and out of it</td></tr>"
        "<tr><td><code>A</code></td><td>Move on by itself, or wait for you again</td></tr>"
        "<tr><td><code>P</code></td><td>Pause and resume</td></tr>"
        "<tr><td><code>M</code> <code>V</code></td><td>Sound on and off; the voice on and off</td></tr>"
        "<tr><td><code>Esc</code></td><td>Leave the trip</td></tr></tbody></table></div>\n"
        "<h2>A screen nobody is standing at: the kiosk</h2>\n"
        "<p>For a corridor, a lobby, a museum wall or an observatory's waiting room, add <code>#ambient=1</code> to the address and Space Radar plays its trips one after another, "
        "with the words of each stop as captions, until somebody takes the controls (any key or touch; two minutes after the last one it goes back to its reel).</p>\n"
        f'<div class="tablewrap"><table><thead><tr><th>Address</th><th>What plays</th><th>One lap</th></tr></thead><tbody>{reel_rows}'
        "<tr><td><code>#ambient=moon-landings,the-sun-today,black-holes</code></td><td>Your own list of trips, in your order</td><td></td></tr></tbody></table></div>\n"
        "<p>Add to the address (each key is read by the app's own link reader):</p>\n"
        '<div class="tablewrap"><table><thead><tr><th>Parameter</th><th>What it does</th></tr></thead><tbody>'
        "<tr><td><code>&amp;shuffle=1</code></td><td>A new order every lap</td></tr>"
        "<tr><td><code>&amp;sound=1</code></td><td>Ask for sound (a browser needs one key press); <code>&amp;sound=0</code> keeps it silent</td></tr>"
        "<tr><td><code>&amp;voice=0</code></td><td>Music only: no narrator</td></tr>"
        "<tr><td><code>&amp;captions=0</code></td><td>No words on screen (only sensible with the voice on)</td></tr>"
        "<tr><td><code>#autopilot=</code></td><td>The same key as <code>#ambient=</code>, under another name</td></tr></tbody></table></div>\n"
        "<p>Start Chrome as a kiosk (quit it completely first):</p>\n"
        '<pre><code>chrome --kiosk --no-first-run --autoplay-policy=no-user-gesture-required "http://localhost:8177/#ambient=lobby"</code></pre>\n'
        "<p><code>--kiosk</code> is full screen with no address bar. <code>--autoplay-policy=no-user-gesture-required</code> lets sound start with nobody there; leave it out for a silent screen. "
        "The program is <code>chrome.exe</code> on Windows, <code>/Applications/Google Chrome.app/Contents/MacOS/Google Chrome</code> on a Mac, and <code>chromium</code> on Linux. "
        "A stop that fails to arrive is skipped, a trip that fails twice is left for the next, and the page reloads itself after twelve hours between two trips.</p>\n"
        "<h2>Five ten-minute lesson starters</h2>\n"
        "<p>Each pairs a question with one trip, started in present mode.</p>\n"
        f'<ul class="cards">{lessons}</ul>\n'
        "<h2>Accessibility</h2>\n"
        "<ul>\n"
        "<li>Every control can be reached and used from the keyboard, with a visible focus ring, and every control has a name a screen reader announces.</li>\n"
        "<li>Touch targets are at least 44 px on a phone or tablet.</li>\n"
        "<li>The words of every trip stop are on screen as captions, so a room does not need sound; the narrator can be turned off.</li>\n"
        "<li>Motion calms when the system asks for reduced motion (<code>prefers-reduced-motion</code>).</li>\n"
        "<li>The 3D scene is a canvas and is not described to a screen reader; the cards and trip words beside it are text. Say so to a student who relies on one, and tell us what would help.</li>\n</ul>\n"
        "<h2>Tell us how it went</h2>\n"
        f'<p>A lesson, a museum screen, a club night: <a href="{CLASSROOM_FORM}">tell us how it went</a> on the project\'s GitHub (a short form: what you did, what worked, what did not). '
        "It is how this page gets better.</p>\n")
    foot = f"<p>The keys and parameters on this page are read from the app's own link reader (tests/test_seo_pages.py holds them to it). Licence: {esc(licence_name())}.</p>\n"
    page = Page(path="teachers/index.html", title=short, description=desc, body=body, foot=foot, og_title=short)
    page.jsonld = [webpage(host, page, [("For teachers", "")], page_type="WebPage", extra={"about": {"@id": f"{host}/teachers/index.html#resource"}}),
                   {"@type": "LearningResource", "@id": f"{host}/teachers/index.html#resource", "name": "Space Radar in the classroom: a 3D solar system and satellite map",
                    "description": desc, "learningResourceType": ["interactive resource", "lesson plan"], "educationalUse": "Instruction",
                    "audience": {"@type": "EducationalAudience", "educationalRole": "teacher"}, "isAccessibleForFree": True, "inLanguage": "en",
                    "teaches": ["Phases of the Moon", "The scale of the Solar System", "Orbits and years", "How exoplanets are found", "Satellites in orbit"],
                    "license": "https://opensource.org/licenses/MIT", "url": f"{host}/teachers/index.html",
                    "hasPart": [{"@type": "LearningResource", "name": t, "url": f"{host}/t/{tid}.html", "learningResourceType": "lesson plan", "timeRequired": "PT10M"}
                                for tid, t, _ in LESSONS]}]
    page.share = Spec(key="teachers/index", name="Space Radar in the classroom", number="free, offline, no account", caption="For teachers", kind="plain",
                      colour="#9ad1a5", alt="Rings and a dot, captioned Space Radar in the classroom.")
    return page


# --- the build ---------------------------------------------------------------------------------------------

def url_keys() -> list[str]:
    """The keys the app's own link reader knows (site/js/ui/urlstate.js KEYS), for the teachers page's footnote and its test."""
    text = (ROOT / "site/js/ui/urlstate.js").read_text(encoding="utf-8")
    m = re.search(r"export const KEYS = \[([^\]]*)\]", text)
    return re.findall(r"'([a-z]+)'", m.group(1)) if m else []


def build_pages(host: str, objects: list[dict], today: str, snapshot_index: dict | None) -> list[Page]:
    """Every page of this module, as Page objects (the ISS pages replace the object page at its slug)."""
    counts = satellite_counts(snapshot_index)
    slugs = {o["slug"] for o in objects}
    by_slug = {o["slug"]: o for o in objects}
    iss = by_slug.get(ISS_SLUG)
    if iss is None:
        raise SystemExit("seo_pages: no object page for the International Space Station to make the answer page from")
    tours = {t["id"]: t["title"] for t in yml("tours.yaml")["tours"]}
    events = sky_events()
    pages: list[Page] = []
    pages += iss_pages(iss, host, counts, snapshot_index)
    pages += [starlink_page(host, counts, slugs), satellites_page(host, counts, slugs), planets_page(host, today)]
    pages += [events_index(events, host)] + [event_page(e, host, tours) for e in events]
    pages += [about_page(host), sources_page(host, snapshot_index), accuracy_page(host),
              teachers_page(host, tours, yml("autopilot.yaml"), url_keys())]
    sysl = seo_systems.pages(host, by_slug, today)
    pages += sysl
    return pages


def write_pages(pages: list[Page], out: Path, ctx: Ctx) -> None:
    for pg in pages:
        dest = out / pg.path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(render(pg, ctx), encoding="utf-8")


def pages_dirs(pages: list[Page]) -> list[str]:
    """The directories deploy.sh syncs for these pages (o/ is synced by its own block)."""
    return sorted({Path(p.path).parts[0] for p in pages if len(Path(p.path).parts) > 1 and Path(p.path).parts[0] != "o"})


# --- share pictures for the object pages, and the one door build_seo.py uses ---------------------------------

NUMBER_LABELS = ("Diameter", "Distance", "Size", "Mass", "Surface temperature", "Turns once every", "One lap of the Sun", "Where")


def texture_for(world: str) -> tuple[str, str]:
    """(repo path, credit line) of the tier-0 map of a world, or ('', '')."""
    for row in yml("textures.yaml")["textures"]:
        if row.get("world") != world or row.get("slot") not in ("day", "map"):
            continue
        for f in row.get("files", []):
            if f.get("tier") == 0 and "{mm}" not in f["file"] and (ROOT / f["file"]).is_file():
                return f["file"], str(row.get("credit") or "")
    return "", ""


def object_spec(p: dict) -> Spec:
    number = ""
    byl = {f["label"]: f["value"] for f in p["facts"]}
    for label in NUMBER_LABELS:
        if label in byl:
            v = byl[label]
            number = f"{v} wide" if label == "Diameter" else f"{v} away" if label == "Distance" else v if label in ("Size", "Where") else f"{label.lower()}: {v}"
            break
    kind, texture, photo, credit = "plain", "", "", ""
    img = p.get("image")
    if img and (ROOT / "site" / img["file"]).is_file():
        kind, photo = "photo", f"site/{img['file']}"
        credit = " · ".join(x for x in (img.get("credit"), img.get("licence")) if x)
    elif p["klass"] == "world" or p["id"] in ("sun",):
        texture, credit = texture_for(p["id"])
        if texture:
            kind = "world"
    return Spec(key=f"o/{p['slug']}", name=p["name"], number=number, caption=p["klassLabel"], kind=kind, colour=p.get("colour") or "#9aa4b2",
                texture=texture, photo=photo, credit=credit, alt=img["alt"] if img else f"{p['name']}, {p['klassLabel']}, drawn by Space Radar.")


def build_extra(out: Path, host: str, objects: list[dict], today: str, snapshot_index: dict | None, share_mode: str = "auto") -> dict:
    """Everything this module adds to a build. `share_mode`: auto (draw when Pillow is there), off, require (refuse without).

    Returns {pages: [Page], replaced: {slug}, shares: {key: rel}, sitemap: [(path, lastmod)], index: {record id: slug},
             image_rows: [(page url, picture url, title)], drawn: bool}. Writes every page and picture under `out`.
    """
    import seo_share
    pages = build_pages(host, objects, today, snapshot_index)
    replaced = {p.path[2:-5] for p in pages if p.path.startswith("o/")}
    specs: dict[str, Spec] = {}
    for o in objects:
        if o["slug"] not in replaced:
            specs[f"o/{o['slug']}"] = object_spec(o)
    for pg in pages:
        if pg.share is not None:
            specs[pg.share.key] = pg.share
    drawn = False
    if share_mode != "off":
        if seo_share.available():
            seo_share.render_all(list(specs.values()), out)
            drawn = True
        elif share_mode == "require":
            raise SystemExit("build_seo: --require-share, and Pillow, fontTools and brotli are not all importable (pip install pillow fonttools brotli)")
        else:
            print("build_seo: Pillow, fontTools or brotli is missing: the pages keep their old share pictures (pip install pillow fonttools brotli to draw one per page)",
                  file=sys.stderr)
    shares = {k: s.rel for k, s in specs.items()} if drawn else {}
    ctx = make_ctx(host, shares)
    write_pages(pages, out, ctx)
    (out / "pages-dirs.txt").write_text("\n".join(pages_dirs(pages) + (["share"] if drawn else [])) + "\n", encoding="utf-8")
    index: dict[str, str] = {}
    for s in seo_systems.systems():
        index[f"star-{s['id']}"] = s["slug"]
        for pl in s["planets"]:
            index[pl["id"]] = s["slug"]
    sitemap = [(p.path, p.lastmod) for p in pages if p.in_sitemap and not p.path.startswith("o/")]
    sitemap_o = sorted(replaced)
    return {"pages": pages, "replaced": replaced, "specs": specs, "shares": shares, "sitemap": sitemap, "sitemap_o": sitemap_o, "index": index, "drawn": drawn,
            "ctx": ctx}


def main(argv: list[str]) -> int:
    print("seo_pages.py is built through scripts/build_seo.py --out DIR", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
