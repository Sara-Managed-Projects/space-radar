#!/usr/bin/env python3
"""The question pages, the 40 star systems, the trust pages, the teachers' page and the events build, and say what they promise.

    python3 tests/test_seo_pages.py

Built by scripts/seo_pages.py (through scripts/build_seo.py) into a temporary directory, with `--no-share`
and a fixed `--today` so the test is the same on every day; the share pictures are held by
scripts/check_seo.py --require-share in CI and by the drawing cases here. Held, each by a case that
fails when the thing it guards is broken (tests/test_seo_pages.py was shown red against each, see the pull request):

  the ISS answer     the static HTML (no script) has the question as H1 and an answer sentence; the title is under 60;
                     WebPage and SoftwareApplication in the JSON-LD; /iss/ is an alias of the same page, not in the sitemap
  starlink, hub      each links the other, the ISS, and the footer's pages; a dated source line; a count with its date;
                     the index's number and day win over the registry's fallback when a build is given an index
  planets tonight    names tonight's planets with the date in the static HTML; lastmod is the build's day;
                     the page asks for no position (the one call is in site/js/pages/live.js, behind a button: tests/test_pagelive.mjs)
  40 systems         forty pages, 99 planet sections, the first sentence of Kepler-186 f as the issue words it, "The picture is
                     an artist's impression" and measured/computed/imagined on every one, a #go= link per planet, all in the sitemap
  trust pages        /sources/ equals registry/sources.yaml row for row (licence, terms, date); /accuracy/ has the three words,
                     the exoplanet rule and says there is no corrections log; /about/ has the registry's counts and our accounts, no Facebook
  teachers           every `#key=` and `&key=` in its <code> is a key the app's link reader knows; the reels are the registry's;
                     five lessons, each a trip that exists; the classroom form's link; LearningResource markup
  events             the index and six pages, each with Event JSON-LD, the deep link the registry names, in the sitemap
  chrome             every built page links About, Sources and Accuracy, and carries a twitter:image
  hygiene            no bare #NNN (an internal issue number), no Facebook, nothing from the plan
  share pictures     three real pictures are drawn: 1200 x 630 PNG, inside the budgets, the same bytes twice; the image sitemap lists them
  deploy             deploy.sh --dry-run ships every directory the build reports, share/ and the image sitemap
"""

from __future__ import annotations

import html as htmllib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
failures: list[str] = []
HOST = "https://www.spaceradar.ai"


def ok(cond: bool, msg: str) -> None:
    if cond:
        print(f"PASS: {msg}")
    else:
        failures.append(msg)
        print(f"FAIL: {msg}")


def run(*cmd, env=None):
    return subprocess.run(list(cmd), cwd=ROOT, capture_output=True, text=True, env=env)


class Text(HTMLParser):
    """Visible text and the script-free structure of a page, as a no-script reader sees it."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text: list[str] = []
        self.skip = 0
        self.hrefs: list[str] = []
        self.codes: list[str] = []
        self._code = False
        self.rows: list[list[str]] = []
        self._row = None
        self._cell = None
        self.sections = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("script", "style"):
            self.skip += 1
        if tag == "a" and a.get("href"):
            self.hrefs.append(a["href"])
        if tag == "code":
            self._code = True
            self.codes.append("")
        if tag == "section":
            self.sections += 1
        if tag == "tr":
            self._row = []
        if tag in ("td", "th") and self._row is not None:
            self._cell = ""

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip -= 1
        if tag == "code":
            self._code = False
        if tag in ("td", "th") and self._row is not None and self._cell is not None:
            self._row.append(self._cell.strip())
            self._cell = None
        if tag == "tr" and self._row is not None:
            self.rows.append(self._row)
            self._row = None

    def handle_data(self, data):
        if self.skip:
            return
        self.text.append(data)
        if self._code and self.codes:
            self.codes[-1] += data
        if self._cell is not None:
            self._cell += data

    @property
    def plain(self) -> str:
        return re.sub(r"\s+", " ", "".join(self.text))


def parse(path: Path) -> Text:
    p = Text()
    p.feed(path.read_text(encoding="utf-8"))
    return p


def meta(html: str, key: str) -> str | None:
    m = re.search(rf'<meta (?:property|name)="{re.escape(key)}" content="([^"]*)"', html)
    return m.group(1) if m else None


def ld_types(html: str) -> list[str]:
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    out = []
    for b in blocks:
        doc = json.loads(b.replace("<\\/", "</"))
        for node in doc.get("@graph", [doc]):
            t = node.get("@type")
            out += t if isinstance(t, list) else [t]
    return out


def ld_nodes(html: str) -> list[dict]:
    doc = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S).group(1).replace("<\\/", "</"))
    return doc.get("@graph", [doc])


BUILT = Path(tempfile.mkdtemp(prefix="seo-pages-"))
r = run(sys.executable, "scripts/build_seo.py", "--out", str(BUILT), "--no-share", "--today", "2026-10-09")
ok(r.returncode == 0, f"build_seo.py --no-share --today 2026-10-09: {(r.stdout or r.stderr).strip().splitlines()[-1:]}")
if r.returncode != 0:
    print(r.stderr)
    sys.exit(1)

yml = lambda n: yaml.safe_load((ROOT / "registry" / n).read_text(encoding="utf-8"))  # noqa: E731
sitemap = (BUILT / "sitemap-pages.xml").read_text(encoding="utf-8")
in_map = lambda path: f"<loc>{HOST}/{path}</loc>" in sitemap  # noqa: E731
tours = {t["id"] for t in yml("tours.yaml")["tours"]}

# --- the ISS --------------------------------------------------------------------------------------
iss_html = (BUILT / "o" / "international-space-station.html").read_text(encoding="utf-8")
iss = parse(BUILT / "o" / "international-space-station.html")
title = re.search(r"<title>(.*?)</title>", iss_html).group(1)
ok(title.startswith("Where is the ISS right now?") and len(title) <= 60, f"the ISS title answers the query and fits a result ({title!r}, {len(title)})")
ok("Where is the International Space Station right now?" in re.search(r"<h1>(.*?)</h1>", iss_html).group(1), "the H1 is the question")
ok(re.search(r'data-slot="iss-sentence">The International Space Station is about 400 km above the Earth', iss_html) is not None
   and "51.6°" in iss.plain, "with scripts off the page already holds an answer sentence")
ok({"WebPage", "SoftwareApplication"} <= set(ld_types(iss_html)), f"WebPage and SoftwareApplication JSON-LD ({ld_types(iss_html)})")
ok('href="../#at=sat-25544"' in iss_html and "../#trip=journey-to-the-station" in iss_html and "journey-to-the-station" in tours,
   "links the app on the station and the ISS trip, which exists")
ok("How to see the ISS" in iss.plain, "a how-to-see section")
alias = (BUILT / "iss" / "index.html").read_text(encoding="utf-8")
ok(f'<link rel="canonical" href="{HOST}/o/international-space-station.html">' in alias and not in_map("iss/index.html"),
   "/iss/ answers with the same page, names the station's page as canonical and is not in the sitemap")
ok(iss.plain == parse(BUILT / "iss" / "index.html").plain, "/iss/ and the page say the same words")

# --- starlink and satellites -----------------------------------------------------------------------
star = parse(BUILT / "starlink" / "index.html")
sat = parse(BUILT / "satellites" / "index.html")
star_html = (BUILT / "starlink" / "index.html").read_text(encoding="utf-8")
sat_html = (BUILT / "satellites" / "index.html").read_text(encoding="utf-8")
facts = yml("seo-facts.yaml")["satellite_counts"]
ok("../satellites/index.html" in star.hrefs and "../starlink/index.html" in sat.hrefs, "the two pages link each other")
ok(all(h in sat.hrefs for h in ("../o/international-space-station.html", "../o/hubble-space-telescope.html", "../o/tiangong-space-station.html", "../starlink/index.html")),
   "the hub links the ISS, Hubble, Tiangong and Starlink")
import seo_pages as _sp  # noqa: E402
ok(f"{facts['starlink_objects']:,}" in star.plain and _sp.date_words(str(facts["as_of"])) in star.plain, "a Starlink count with its date, from the registry's fallback when the build has no index")
ok("about 17,000" in sat.plain and re.search(r"<title>Free live 3D map of the ISS and about 17,000 satellites</title>", sat_html), "the hub says about 17,000, derived from the count")
ok(all(re.search(r"Source: [^<]+, read \d+ \w+ \d{4}", h) for h in (star_html, sat_html)), "both carry a dated source line")
ok(in_map("starlink/index.html") and in_map("satellites/index.html"), "both are in the sitemap")
ok("../?from=starlink-page-map#at=starlink" in star.hrefs and "../?from=starlink-page-trip#trip=tonight-from-your-street" in star.hrefs,
   "the Starlink layer link and the 'your sky tonight' link, each with its placement tag")
ok(all("?from=starlink-page-" in h for h in star.hrefs if h.startswith("../?") or h.startswith("../#")), "every link from the Starlink page into the map carries a ?from= placement tag")
ok(not any("?from=" in h for h in star.hrefs if h.endswith(".html")), "a link to another crawlable page stays untagged (one address per page)")
ok(re.search(r"<title>How to see Starlink satellites tonight[^<]*</title>", star_html) and "How can I see Starlink satellites tonight?" in star.plain,
   "the title and the H1 are the search question")
ok('data-slot="starlink-launches"' in star_html and 'data-slot="tonight-date"' in star_html and 'data-live="starlink"' in star_html,
   "the next launches and the date line are slots the browser fills")
ok({"WebPage"} <= set(ld_types(star_html)) and len(re.findall(r"<title>", star_html)) == 1 and len(re.search(r"<title>(.*?)</title>", star_html).group(1)) <= 60, "JSON-LD and a title under 60")
import seo_pages  # noqa: E402
index = {"snapshots": {"celestrak-supplemental-starlink": {"items": 12345, "fetched_at": "2026-10-01T09:00:00Z"},
                       "celestrak-active": {"items": 18001, "fetched_at": "2026-10-01T09:00:00Z"}}}
c = seo_pages.satellite_counts(index)
ok(c["starlink"] == 12345 and c["active"] == 18001 and c["date"] == "2026-10-01" and c["from"] == "index", "a build given the saved copy's index states its numbers and its day")
pg = seo_pages.satellites_page(HOST, c, set())
ok("about 18,000" in pg.title and "1 October 2026" in pg.body, "and the page follows them")
ok(seo_pages.satellite_counts({"snapshots": {"celestrak-active": {"items": 0}}})["from"] == "registry", "an index without the counts falls back to the registry's, with its date")

# --- planets tonight --------------------------------------------------------------------------------
pt_html = (BUILT / "planets-tonight" / "index.html").read_text(encoding="utf-8")
pt = parse(BUILT / "planets-tonight" / "index.html")
lead = re.search(r'<p class="lead">(.*?)</p>', pt_html, re.S).group(1)
ok(lead.startswith("On the evening of 9 October 2026, from London, the planets up in the dark are ") and all(n in lead for n in ("Jupiter", "Saturn", "Mars")),
   f"the static lead sentence names tonight's planets with the date ({lead[:90]!r})")
ok(re.search(r'<url><loc>https://www.spaceradar.ai/planets-tonight/index.html</loc><lastmod>2026-10-09</lastmod>', sitemap) is not None, "in the sitemap, with the build's day as lastmod")
ok("getCurrentPosition" not in pt_html and "geolocation" not in pt_html, "the page's own HTML never asks for a position")
ok(len(re.search(r"<title>(.*?)</title>", pt_html).group(1)) <= 60 and "../#trip=planets-tonight" in pt.hrefs, "a title under 60 and the link to the sky from the ground")
# the same build on another date says another date (the sentence is computed, not typed)
other = Path(tempfile.mkdtemp(prefix="seo-pt-"))
pg2 = seo_pages.planets_page(HOST, "2026-12-14")
ok("14 December 2026" in pg2.body and pg2.lastmod == "2026-12-14" and pg2.body != seo_pages.planets_page(HOST, "2026-10-09").body, "the sentence is made from the date it is given")
shutil.rmtree(other, ignore_errors=True)

# --- the 40 systems -----------------------------------------------------------------------------------
import seo_systems  # noqa: E402
sysl = seo_systems.systems()
ok(len(sysl) == 51 and sum(len(s["planets"]) for s in sysl) == 134, f"51 systems and 134 planets: 50 generated systems with 127 (release 1.8.0 added eight nearby hosts to the 42 of release 1.5.0), TRAPPIST-1 with 7 ({len(sysl)})")
bad = []
for s in sysl:
    f = BUILT / "o" / f"{s['slug']}.html"
    if not f.is_file():
        bad.append(f"{s['slug']}: no page")
        continue
    html = f.read_text(encoding="utf-8")
    t = htmllib.unescape(re.search(r"<title>(.*?)</title>", html).group(1))
    pp = parse(f)
    problems = []
    if len(t) > 60:
        problems.append(f"title {len(t)}")
    if "The picture is an artist&#x27;s impression" not in html and "The picture is an artist's impression" not in html:
        problems.append("no artist's impression")
    if "The picture is an artist's impression. Nobody has seen the surface of a planet of another star" not in pp.plain:
        problems.append("the imagined box does not say the picture is an artist's impression")
    if not all(w in pp.plain for w in ("measured", "computed", "imagined")):
        problems.append("no measured/computed/imagined")
    if f'<link rel="canonical" href="{HOST}/o/{s["slug"]}.html">' not in html:
        problems.append("canonical")
    if pp.sections != len(s["planets"]):
        problems.append(f"{pp.sections} sections for {len(s['planets'])} planets")
    for pl in s["planets"]:
        if f"../#go={pl['go']}" not in pp.hrefs:
            problems.append(f"no #go= for {pl['go']}")
        if not re.search(re.escape(pl["name"]) + r" is an exoplanet ", pp.plain):
            problems.append(f"no first sentence for {pl['name']}")
    if f"../#go={s['id']}" not in pp.hrefs:
        problems.append("no #go= for the system")
    if not in_map(f"o/{s['slug']}.html"):
        problems.append("not in the sitemap")
    if problems:
        bad.append(f"{s['slug']}: {problems}")
ok(not bad, f"every system page: title, impression, the three words, canonical, a section and a #go= per planet, sitemap ({bad[:3]})")
k186 = parse(BUILT / "o" / "kepler-186.html").plain
kepler = next(s for s in seo_systems.systems() if s["id"] == "kepler-186")
for planet in kepler["planets"]:
    ok(seo_systems.first_sentence(planet, kepler["dist_pc"]) in k186, "planet sentence follows the generated row")
trap = parse(BUILT / "o" / "trappist-1.html").plain
ok("TRAPPIST-1 and its seven planets" in trap and "Fly to TRAPPIST-1 in 3D" in trap, "the typed system is built the same way")
idx = json.loads((BUILT / "object-pages.json").read_text(encoding="utf-8"))
ok(idx.get("sat-25544") == "international-space-station" and idx.get("mars") == "mars", "the share sheet's map still names the object pages (a planet's own record has none: see the report)")

# --- the trust pages ----------------------------------------------------------------------------------
src = parse(BUILT / "sources" / "index.html")
rows = {r[0].split("\n")[0].split(" (switched")[0].strip(): r for r in src.rows if len(r) == 5 and r[0] != "Source"}
reg = {r["id"]: r for r in yml("sources.yaml")["sources"]}
miss = []
for sid, row in reg.items():
    got = next((v for k, v in rows.items() if k.startswith(sid)), None)
    if not got:
        miss.append(f"{sid}: no row")
        continue
    if row["licence"] not in got[1]:
        miss.append(f"{sid}: licence")
    if not re.search(rf"{row['terms_recorded'].day} {seo_pages.MONTHS[row['terms_recorded'].month - 1]} {row['terms_recorded'].year}", got[3]):
        miss.append(f"{sid}: date {got[3]!r}")
    if row["attribution"] not in got[0]:
        miss.append(f"{sid}: attribution")
sources_html = (BUILT / "sources" / "index.html").read_text(encoding="utf-8")
ok(not miss and len(rows) == len(reg) >= 25, f"/sources/ equals registry/sources.yaml: {len(rows)} rows, each licence, terms date and credit ({miss[:3]})")
ok(all(f'href="{r["terms_url"]}"' in sources_html for r in reg.values()), "each row links the page that states its terms")
# One number of sources (the review of 2026-10-12; scripts/count_facts.py source_counts): the publishers of the rows in use, and
# those rows as feeds; a switched-off row is in neither, and in the page's second table.
import count_facts  # noqa: E402
sc = count_facts.source_counts()
off_ids = [sid for sid, r in reg.items() if r.get("enabled", True) is False]
ok(f"Space Radar reads {sc['feeds']} feeds from {sc['sources']} public sources." in src.plain and sc["feeds"] + sc["off"] == len(reg),
   f"/sources/ states the two counted numbers ({sc['feeds']} feeds, {sc['sources']} sources)")
ok(all(f"{name} ({k} feed{'' if k == 1 else 's'})" in src.plain for name, k in sc["publishers"].items()), "and names each source with its feeds, so the number can be recounted on the page")
tables = re.findall(r"<tbody>(.*?)</tbody>", sources_html, re.S)
ok(len(tables) == (2 if off_ids else 1) and tables[0].count("<tr ") == sc["feeds"] and not any(f'<tr id="{i}"' in tables[0] for i in off_ids),
   "the first table is the feeds in use, and no switched-off row is in it")
ok(not off_ids or ("<h2>Not in use</h2>" in sources_html and all(f'<tr id="{i}"' in tables[1] for i in off_ids) and "data-slot" not in tables[1]
                   and tables[1].count("<tr ") == sc["off"]), "the switched-off rows are listed as not in use, with no saved-copy date to fill")
acc = parse(BUILT / "accuracy" / "index.html")
ok(all(w in acc.plain for w in ("measured", "modelled", "illustrative")) and "the picture is an artist's impression" in acc.plain
   and "no separate corrections log" in acc.plain.lower(), "/accuracy/: the three words, the exoplanet rule, and the honest word about a corrections log")
ok(not [f for f in ROOT.rglob("*") if "corrections" in f.name.lower() and ".git" not in f.parts and "node_modules" not in f.parts],
   "the page's claim of no corrections log is true of the repository (add one, and change the page to link it)")
about_html = (BUILT / "about" / "index.html").read_text(encoding="utf-8")
about = parse(BUILT / "about" / "index.html")
counts = seo_pages.counts_of_registries()
ok(f"{counts['layers']} layers" in about.plain and f"reads {counts['feeds']} feeds from {counts['sources']} public sources" in about.plain and f"{counts['trips']} guided trips" in about.plain,
   "/about/ carries the registry's counts")
ok(all(f'<a href="{u}" rel="me noopener">' in about_html for u in ("https://www.youtube.com/@SpaceRadar_ai", "https://www.instagram.com/spaceradar.ai/",
                                                                  "https://www.linkedin.com/company/spaceradar-ai", "https://github.com/Sara-Managed-Projects/space-radar")),
   "our four accounts, rel=me noopener")
ok("facebook" not in about_html.lower(), "no Facebook")
ok("The name" in about.plain and "Free, and staying usable" in about.plain, "the name note and the free note")
ok(all(in_map(p) for p in ("about/index.html", "sources/index.html", "accuracy/index.html", "teachers/index.html", "events/index.html")), "all in the sitemap")

# --- NASA's Eyes comparison ------------------------------------------------------------------------------
eyes_html = (BUILT / "nasa-eyes-alternative" / "index.html").read_text(encoding="utf-8")
eyes = parse(BUILT / "nasa-eyes-alternative" / "index.html")
ok(eyes_html.count("<h1") == 1 and "NASA's Eyes" in eyes.plain and "open source" in eyes.plain.lower(), "the comparison page: one H1, names both, says which is open source")
ok(f"read on {seo_pages.EYES_READ}" in eyes.plain and seo_pages.EYES_FAQ in eyes_html and seo_pages.EYES_NEWS in eyes_html,
   "what it says about NASA's Eyes is dated and links NASA's own pages")
ok("not endorsed by, NASA" in eyes.plain and f"{counts['trips']} guided trips" in eyes.plain, "the endorsement line and the registry's trip count")
ok(in_map("nasa-eyes-alternative/index.html") and 'href="../nasa-eyes-alternative/index.html"' in about_html, "in the sitemap, and /about/ links it")

# --- teachers ----------------------------------------------------------------------------------------
t_html = (BUILT / "teachers" / "index.html").read_text(encoding="utf-8")
teach = parse(BUILT / "teachers" / "index.html")
keys = seo_pages.url_keys()
ok(len(keys) > 15 and "present" in keys and "ambient" in keys, f"the link reader's keys were read from the code ({len(keys)})")
named = set()
for code in teach.codes:
    named |= set(re.findall(r"[#&]([a-z]+)=", code))
ok(named and named <= set(keys), f"every #key= and &key= on the page is one the app reads (unknown: {sorted(named - set(keys))})")
ok({"present", "ambient", "shuffle", "sound", "voice", "captions", "trip", "autopilot"} <= named, f"and it names the ones a kiosk needs ({sorted(named)})")
reels = yml("autopilot.yaml")["reels"]
ok(all(f"#ambient={r['id']}" in "".join(teach.codes) and f"about {r['minutes']} min, {len(r['trips'])} trips" in teach.plain for r in reels), "the reels are the registry's, with their minutes and trip counts")
lessons = re.findall(r"<h3>\d\. ", t_html)
ok(len(lessons) == 5, "five lesson starters")
ok(all(t in tours for t in re.findall(r"#trip=([a-z-]+)&amp;present=1", t_html)) and len(set(re.findall(r"#trip=([a-z-]+)&amp;present=1", t_html))) >= 5, "each points at a trip that exists, in present mode")
ok(f'href="https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=classroom.yml"' in t_html, "the tell-us link is the classroom form's address")
ok("LearningResource" in ld_types(t_html), "LearningResource markup")
ok("https://github.com/Sara-Managed-Projects/space-radar/releases/latest" in teach.hrefs and "python3 -m http.server 8177 --directory site" in "".join(teach.codes) and "http://localhost:8177" in "".join(teach.codes),
   "three steps from the page to a running offline copy: the zip, the server line from docs/RUN_LOCALLY.md, the address")
ok("python3 -m http.server 8177 --directory site" in (ROOT / "docs" / "RUN_LOCALLY.md").read_text(encoding="utf-8") and "space-radar-<version>.zip" in (ROOT / "docs" / "RUN_LOCALLY.md").read_text(encoding="utf-8"),
   "and that line and that zip name are still the ones the guide gives")
ok(len(re.search(r"<title>(.*?)</title>", t_html).group(1)) <= 60, "a title under 60")

# --- events -------------------------------------------------------------------------------------------
evs = yml("sky-events.yaml")["events"]
ev_index = parse(BUILT / "events" / "index.html")
ok(len(evs) >= 6 and all(f"{e['id']}.html" in ev_index.hrefs for e in evs), "the index links every event, six or more")
for e in evs:
    f = BUILT / "events" / f"{e['id']}.html"
    html = f.read_text(encoding="utf-8")
    node = next((n for n in ld_nodes(html) if n.get("@type") == "Event"), None)
    link = f'href="../#t={e["link"]["t"]}&amp;at={e["link"]["at"]}"'
    ok(node is not None and node.get("startDate") and node.get("name") and node.get("location") and in_map(f"events/{e['id']}.html")
       and link in html, f"{e['id']}: Event markup with a start date and a location, in the sitemap, with its #t= link")
# Internal #50: what Google's Event rich result requires (name, startDate, location with an address or a url) and recommends (image, offers),
# held on every event page, as the offline half of the Rich Results Test and the Schema Markup Validator.
for e in evs:
    html = (BUILT / "events" / f"{e['id']}.html").read_text(encoding="utf-8")
    node = next((n for n in ld_nodes(html) if n.get("@type") == "Event"), {})
    locs = node.get("location") or []
    locs = locs if isinstance(locs, list) else [locs]
    ok(re.match(r"^\d{4}-\d{2}-\d{2}", str(node.get("startDate", ""))) and node.get("name") and locs
       and all((l.get("@type") == "VirtualLocation" and l.get("url")) or (l.get("@type") == "Place" and l.get("name") and l.get("address")) for l in locs)
       and node.get("eventStatus") and node.get("eventAttendanceMode") and node.get("organizer", {}).get("name"),
       f"{e['id']}: Event JSON-LD has name, startDate, a complete location, status, attendance mode and organizer")
    off = node.get("offers") or {}
    ok(node.get("image") and off.get("price") == "0" and off.get("priceCurrency") == "USD" and off.get("url") == node.get("url"),
       f"{e['id']}: Event JSON-LD recommends an image and a free offer")
ge = parse(BUILT / "events" / "geminids-2026.html").plain
ok("14 December 2026, 13:45 UT" in ge and "25 percent" in ge and "14 December 2026, 14:00 UT" in ge, "Geminids: the computed peak and the Moon at the stated hour, the whole hour nearest it")
le = parse(BUILT / "events" / "leonids-2026.html").plain
# Review of 2026-11-16: the Moon was stated for 17 November 00:00 UT (45 percent), a day before the peak; it is stated at the peak now.
ok("17 November 2026, 23:48 UT" in le and "55 percent" in le and "18 November 2026, 00:00 UT" in le and "night of 17 to 18 November" in (BUILT / "events" / "leonids-2026.html").read_text(encoding="utf-8"),
   "Leonids: the computed peak, the Moon at the hour nearest it (55 percent), and the night named is the one the peak falls in")
qu = parse(BUILT / "events" / "quadrantids-2027.html").plain
ok("3 January 2027, 17:56 UT" in qu and "46.95" in qu, "Quadrantids with Venus: its greatest western elongation, computed")
an = parse(BUILT / "events" / "annular-eclipse-2027.html").plain
ok("6 February 2027, 15:59 UT" in an and "ISO 12312-2" in an, "the annular eclipse's greatest-eclipse time, and the safety line")
be = parse(BUILT / "events" / "bepicolombo-mercury-2026.html").plain
ok("21 November 2026" in be and "9 and 10 December 2026" in be, "BepiColombo: ESA's dates")

# --- review of 2026-11-16: one figure for one quantity on a page, and a craft that has ended says so ---------------------------------
# Sedna's page said "about 11 400 years" in its text and "One lap of the Sun 12 679 years" in Key facts, and 906 km where the
# card says 648 to 1 220. Every object page's lap and width in its sentences is held to the Key facts' own, to two per cent
# (or inside the range the facts give).
def _n(text: str) -> float:
    return float(re.sub(r"[\s\u00a0\u202f,]", "", text))


def _facts(page_html: str) -> dict:
    return {htmllib.unescape(k): htmllib.unescape(re.sub(r"<[^>]+>", "", v)) for k, v in re.findall(r"<div><dt>(.*?)</dt><dd>(.*?)</dd></div>", page_html, re.S)}


held_laps = held_widths = 0
for f in sorted((BUILT / "o").glob("*.html")):
    doc = f.read_text(encoding="utf-8")
    facts = _facts(doc)
    m = re.search(r'<p class="lead">(.*?)</p>', doc, re.S)
    w = re.search(r'<div class="doc">\s*<p>(.*?)</p>', doc, re.S)
    prose = htmllib.unescape(re.sub(r"<[^>]+>", "", (m.group(1) if m else "") + " " + (w.group(1) if w else "")))
    lap = re.search(r"(?:about )?([\d][\d\s\u00a0,.]*) years$", facts.get("One lap of the Sun", ""))
    if lap:
        for said in re.findall(r"(?:about |every |takes (?:it )?)([\d][\d\s\u00a0,]*) years", prose):
            held_laps += 1
            ok(abs(_n(said) - _n(lap.group(1))) / _n(lap.group(1)) <= 0.02, f"o/{f.name}: the text says {said.strip()} years and Key facts say {facts['One lap of the Sun']}")
    wide = re.search(r"^(?:about )?([\d][\d\s\u00a0,.]*?)(?: to ([\d][\d\s\u00a0,.]*))? km$", facts.get("Diameter", ""))
    if wide:
        lo = _n(wide.group(1))
        hi = _n(wide.group(2)) if wide.group(2) else lo
        for said in re.findall(r"([\d][\d\s\u00a0,]*) km (?:across|wide|in diameter)", prose):
            held_widths += 1
            ok(lo * 0.98 <= _n(said) <= hi * 1.02, f"o/{f.name}: the text says {said.strip()} km across and Key facts say {facts['Diameter']}")
sedna_html = (BUILT / "o" / "sedna.html").read_text(encoding="utf-8")
sedna = _facts(sedna_html)
ok(held_laps >= 1 and re.search(r"^about 11.?400 years$", sedna.get("One lap of the Sun", "")) and re.search(r"^648 to 1.?220 km$", sedna.get("Diameter", ""))
   and re.search(r"^about 937 AU$", sedna.get("Farthest from the Sun", "")) and "12 679" not in sedna_html and "12,679" not in sedna_html and "JPL Horizons" in sedna_html,
   f"Sedna: one lap (about 11 400 years, as its sentence), the card's range for its width, the far point of the same orbit, and where they were read ({sedna})")
# Swift re-entered on 4 November 2026 and its page still said "is a space telescope going round the Earth", with a button to see it live.
swift_html = (BUILT / "o" / "swift.html").read_text(encoding="utf-8")
swift = parse(BUILT / "o" / "swift.html").plain
ok("Swift was a space telescope" in swift and "re-entered the atmosphere on 4 November 2026" in swift and "It turned to point" in swift
   and " is a space telescope" not in swift and "It turns to point" not in swift, "Swift: the past tense, and the day it re-entered")
ok("See it live" not in swift_html.split("<main", 1)[1].split("</main>", 1)[0] and "no longer in orbit" in swift and "How the map draws it" not in swift,
   "Swift: no live button and no line about how it is drawn")
sf = _facts(swift_html)
ok(sf.get("Launched") == "20 November 2004" and sf.get("Science ended") == "23 October 2026" and sf.get("Re-entered the atmosphere") == "4 November 2026"
   and "swift.gsfc.nasa.gov" in swift_html and "celestrak.org" in swift_html, f"Swift: its dates in Key facts, with NASA's and CelesTrak's pages ({sf})")
ok('value="sat-28485"' not in (BUILT / "embed" / "index.html").read_text(encoding="utf-8"), "the embed generator does not offer a craft that is no longer in orbit")

# --- internal #105: the full Moons, the lunar eclipses, the planet meetings, and the calendar files ---------------------------------
kinds = {k: [e for e in evs if e["kind"] == k] for k in ("full-moon", "lunar-eclipse", "conjunction", "meteor-shower")}
ok(len(kinds["full-moon"]) >= 18 and len(kinds["lunar-eclipse"]) >= 3 and len(kinds["conjunction"]) >= 2, "full Moons for 18 months, lunar eclipses and conjunctions have pages")
fm = parse(BUILT / "events" / "full-moon-2026-12-24.html").plain
ok("24 December 2026, 01:28 UT" in fm and "356,729 km" in fm and "Cold Moon" in fm and "nearer than its average distance of 384,400 km" in fm,
   "the December 2026 full Moon: the computed instant, its distance, the almanac's name")
le = parse(BUILT / "events" / "lunar-eclipse-2028-12-31.html").plain
ok("31 December 2028, 16:51 UT" in le and "total lunar eclipse" in le and "safe to look at" in le, "the total lunar eclipse: the computed instant, and that it is safe to watch")
cj = parse(BUILT / "events" / "venus-saturn-2027.html").plain
ok("7 May 2027" in cj and "0.6° apart" in cj and "Pisces" in cj, "Venus and Saturn: the computed meeting and the constellation")
for e in evs:
    f = BUILT / "events" / f"{e['id']}.html"
    html = f.read_text(encoding="utf-8")
    ok(f'href="{e["id"]}.ics"' in html and 'href="sky-events.ics"' in html and (BUILT / "events" / f"{e['id']}.ics").is_file(), f"{e['id']}: an add-to-calendar link and its file")
    if e["kind"] in ("full-moon", "lunar-eclipse", "conjunction"):
        ok('data-slot="event-local"' not in html and 'id="event-data"' not in html, f"{e['id']}: no per-place box and no per-place script")
ics = (BUILT / "events" / "sky-events.ics").read_bytes().decode("utf-8")  # bytes: read_text would turn the CRLF into LF
ok(ics.count("BEGIN:VEVENT") == len(evs) and ics.count("URL:https://www.spaceradar.ai/events/") == len(evs) and "\r\n" in ics,
   "the all-events feed holds every event, each with its page as URL")
ok(all((BUILT / "events" / f).is_file() for f in ("showers.ics", "eclipses.ics", "moons.ics", "sky.ics")), "the four kind feeds exist")
body = (ROOT / "scripts" / "deploy.sh").read_text(encoding="utf-8")
ok('--include "*.ics" --content-type "text/calendar' in body and '--exclude "*.ics"' in body, "deploy.sh sends the calendar files as text/calendar, apart from the HTML")

# --- internal #106: the link-in-bio page ------------------------------------------------------------------------------------
lk = BUILT / "links" / "index.html"
lp = parse(lk)
doors = yml("link-in-bio.yaml")["posts"][:6]
ok(lk.is_file() and in_map("links/index.html") and all(f'href="../{d["door"]}?from=ig-{d["id"]}"' in lk.read_text(encoding="utf-8") for d in doors),
   "/links/ lists the last six posts, each door tagged ?from=ig-<id>, and is in the sitemap")
ok(lk.read_text(encoding="utf-8").count('class="btn btn--map"') == 7, "six doors and the whole map: seven buttons")

# --- every built page ----------------------------------------------------------------------------------
# t/ (the trips, copied from site/ with their hreflang) and the language folders (scripts/seo_i18n.py: check_seo.check_languages
# and tests/test_seo_i18n.py hold them) are not these pages.
pages = [f for d in sorted(BUILT.iterdir()) if d.is_dir() and d.name not in ("share", "press", "embed", "t", "es", "fr", "de", "pt", "ru", "uk", "zh", "hi", "he", "ar")
         for f in sorted(d.glob("*.html"))]
nav_missing, tw_missing = [], []
for f in pages:
    html = f.read_text(encoding="utf-8")
    p = parse(f)
    if not all(h in p.hrefs for h in ("../about/index.html", "../sources/index.html", "../accuracy/index.html", "../teachers/index.html", "../events/index.html")):
        nav_missing.append(f.relative_to(BUILT).as_posix())
    if not meta(html, "twitter:image") or meta(html, "twitter:image") != meta(html, "og:image"):
        tw_missing.append(f.relative_to(BUILT).as_posix())
ok(len(pages) >= 320 and not nav_missing, f"{len(pages)} built pages, each footer links About, Sources, Accuracy, For teachers and Events ({nav_missing[:3]})")
ok(not tw_missing, f"every built page has a twitter:image equal to its og:image ({tw_missing[:3]})")
# --- the first pull request ------------------------------------------------------------------------------
first_html = (BUILT / "first-pull-request" / "index.html").read_text(encoding="utf-8")
first = parse(BUILT / "first-pull-request" / "index.html")
ok(first_html.count("<h1") == 1 and "three.js" in first.plain and "good first issues" in first.plain, "the first-PR page: one H1, says three.js and good first issues")
ok(f"On {seo_pages.STARTER_READ} it had {seo_pages.STARTER_COUNT}" in first.plain, "the count of starter issues is dated on the page")
ok(first_html.count("is%3Aissue") == len(seo_pages.STARTER_TRACKS) + 1 and all(f"track%3A{t[0]}" in first_html for t in seo_pages.STARTER_TRACKS),
   "the page links the whole free list and each track")
ok("-linked%3Apr" in seo_pages.starter_link() and "-label%3Asara%3Adoing" in seo_pages.starter_link(), "the links leave out taken and reserved issues, as docs/FIRST_PR.md's do")
tracks = {m for m in re.findall(r"label%3Atrack%3A(\w+)", (ROOT / "docs" / "FIRST_PR.md").read_text(encoding="utf-8"))}
ok({t[0] for t in seo_pages.STARTER_TRACKS} <= tracks, "every track on the page is one docs/FIRST_PR.md lists")
ok("AI coding agents" in first.plain and "GOVERNANCE.md" in first_html, "the page says who writes most commits, and links the governance page")
ok(in_map("first-pull-request/index.html") and 'href="../first-pull-request/index.html"' in about_html, "in the sitemap, and /about/ links it")
# --- moon phases, tides and orbits ----------------------------------------------------------------------
sims_html = (BUILT / "moon-phases-tides-orbits" / "index.html").read_text(encoding="utf-8")
sims = parse(BUILT / "moon-phases-tides-orbits" / "index.html")
sim_slugs = [s for _, slugs in seo_pages.CLASSROOM_SIMS for s in slugs]
ok(sims_html.count("<h1") == 1 and all(w in sims.plain for w in ("moon phases", "tides", "orbits")), "the simulators page: one H1, names moon phases, tides and orbits")
ok(all((ROOT / "site" / "lab" / s / "index.html").is_file() and f'href="../lab/{s}/index.html"' in sims_html for s in sim_slugs),
   "every simulator the page lists exists in site/lab/ and is linked")
ok(f"has {len(sim_slugs)} small simulators" in sims.plain, "the count on the page is the count of the list")
teach_html = (BUILT / "teachers" / "index.html").read_text(encoding="utf-8")
ok(in_map("moon-phases-tides-orbits/index.html") and 'href="../moon-phases-tides-orbits/index.html"' in teach_html, "in the sitemap, and /teachers/ links it")

dirty = []
for f in pages + [BUILT / "404.html"]:
    html = f.read_text(encoding="utf-8")
    p = parse(f)
    if re.search(r"(?<![\w&/=\"'-])#\d{2,5}\b", p.plain) or "facebook" in html.lower() or "space-radar-internal" in html or "marketing" in p.plain.lower():
        dirty.append(f.name)
ok(not dirty, f"no bare #NNN, no Facebook, nothing from the plan on any page ({dirty[:3]})")
ok(not re.search(r"\{\{|\bTODO\b|\blorem\b", "".join(f.read_text(encoding="utf-8") for f in pages)), "no placeholder left")
# b200-f1-find: "country" is the /country/<iso>/ pages (scripts/seo_countries.py, forge #152)
# b200-f6-learn: "print" is /print/, the paper models (scripts/seo_print.py, forge #161)
# b200-f9-reach: "assets", "creators" and the five comparisons (scripts/seo_reach.py, forge #165, #166, #168)
# 2026-11-10: "privacy" is /privacy/, what the email updates keep (scripts/seo_pages.py privacy_page)
import seo_reach  # noqa: E402
ok((BUILT / "pages-dirs.txt").read_text(encoding="utf-8").split() == sorted({"about", "accuracy", "country", "events", "first-pull-request", "iss", "links", "moon-phases-tides-orbits", "nasa-eyes-alternative", "planets-tonight", "print", "privacy", "read", "satellites", "sources", "starlink", "teachers"}
                                                                             | {"assets", "creators", *seo_reach.COMPARISONS}),
   "pages-dirs.txt lists the directories deploy.sh must ship")

# --- the share pictures ----------------------------------------------------------------------------------
try:
    import seo_share
    can = seo_share.available()
except ImportError:
    can = False
if can:
    from PIL import Image
    specs = [seo_share.Spec(key="t/plain", name="Where is the ISS right now?", number="400 km up", caption="Station", kind="plain"),
             seo_share.Spec(key="t/world", name="Mars", number="6,779 km wide", caption="Planet", kind="world", texture="site/textures/2k_mars.webp",
                            credit="Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"),
             seo_share.Spec(key="t/exo", name="Kepler-186 and its five planets", number="5 planets", caption="Star system", kind="exo", tone="#7fae8e", impression=True)]
    with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
        sa = seo_share.render_all(specs, Path(a))
        seo_share.render_all(specs, Path(b))
        lo, hi = seo_share.budget("og_png_min_bytes", 25000), seo_share.budget("og_png_max_bytes", 400000)
        same = all((Path(a) / s.rel).read_bytes() == (Path(b) / s.rel).read_bytes() for s in specs)
        sizes = [Image.open(Path(a) / s.rel).size for s in specs]
        ok(all(sz == (1200, 630) for sz in sizes) and all(lo <= n <= hi for n in sa.values()), f"three pictures, 1200 x 630, inside {lo}..{hi} bytes ({sa})")
        ok(same, "the same build draws the same bytes")
        ok(len({(Path(a) / s.rel).read_bytes() for s in specs}) == 3, "and three different pictures")
        # An empty frame is refused: the budget is a real gate
        try:
            seo_share.render_all([seo_share.Spec(key="t/ok", name="x")], Path(a))
            gate = True
        except SystemExit:
            gate = False
        ok(gate, "a frame with its stars and name is above the empty-frame floor")
    xml = seo_share.image_sitemap(HOST, [(f"{HOST}/o/mars.html", f"{HOST}/share/o/mars.png", "Mars")])
    ok("<image:loc>https://www.spaceradar.ai/share/o/mars.png</image:loc>" in xml and "sitemap-image/1.1" in xml, "the image sitemap lists a page with its picture")
else:
    print("note: Pillow, fontTools or brotli missing here: the drawing cases are not exercised (CI installs them and runs --require-share)")

# --- deploy.sh ships it ---------------------------------------------------------------------------------
with tempfile.TemporaryDirectory() as tmp:
    bindir = Path(tmp) / "bin"
    bindir.mkdir()
    log = Path(tmp) / "aws.log"
    fake = bindir / "aws"
    fake.write_text(f'#!/bin/sh\necho "$*" >> "{log}"\nexit 0\n', encoding="utf-8")
    fake.chmod(fake.stat().st_mode | stat.S_IEXEC)
    env = dict(os.environ, PATH=f"{bindir}{os.pathsep}{os.environ.get('PATH', '')}", SR_SHARE="off")
    r = run("bash", "scripts/deploy.sh", "--bucket", "example-bucket", "--app-only", "--dry-run", env=env)
    calls = log.read_text(encoding="utf-8").splitlines() if log.is_file() else []
    ok(r.returncode == 0, f"deploy.sh --app-only --dry-run: {(r.stderr or r.stdout).strip().splitlines()[-1:]}")
    for d in ("about", "accuracy", "events", "first-pull-request", "iss", "moon-phases-tides-orbits", "nasa-eyes-alternative", "planets-tonight", "read", "satellites", "sources", "starlink", "teachers"):
        s = [c for c in calls if c.startswith("s3 sync") and f"s3://example-bucket/{d} " in c + " " and "text/calendar" not in c]  # events/'s .ics sync is held below
        ok(len(s) == 1 and "text/html" in s[0] and "max-age=0, must-revalidate" in s[0] and "--content-encoding" not in s[0] and "--delete" in s[0],
           f"{d}/ is synced as written, as HTML a browser revalidates on every load, with --delete")
    cal = [c for c in calls if c.startswith("s3 sync") and "s3://example-bucket/events " in c + " " and "text/calendar" in c]
    ok(len(cal) == 1 and re.search(r"--include \W?\*\.ics", cal[0]) is not None and "--delete" in cal[0] and "max-age=0, must-revalidate" in cal[0], "events/'s calendar files are synced once, as text/calendar, revalidated, with --delete")
    ok(re.search(r"would upload sitemap-images\.xml \(application/xml", r.stdout) is not None, "sitemap-images.xml is uploaded as XML")
    body = (ROOT / "scripts" / "deploy.sh").read_text(encoding="utf-8")
    ok('"/sitemap-images.xml"' in body and 'PATHS+=("/$dir/*")' in body and "share" in body, "the invalidation names the new directories and the image sitemap; share/ has its own PNG sync")
robots = (ROOT / "site" / "robots.txt").read_text(encoding="utf-8")
ok(f"Sitemap: {HOST}/sitemap-images.xml" in robots, "robots.txt names the image sitemap")

shutil.rmtree(BUILT, ignore_errors=True)
if failures:
    print(f"\n{len(failures)} failure(s)")
    sys.exit(1)
print("\nall growth-page checks pass")
