#!/usr/bin/env python3
"""The structured data a search engine reads: parsed back out of the pages, and held to the fields it needs.

  home page   site/index.html: one JSON-LD graph with
              - WebApplication: name, url, EducationalApplication, operatingSystem Any, free (the
                flag and a price of 0 with a currency), the MIT licence's URL, inLanguage en, a
                screenshot on our host, a publisher that resolves to the Organization;
              - Organization: name, url, a logo that is a real file of site/, and `sameAs` that is
                EXACTLY the project's four addresses (GitHub, Instagram, LinkedIn, YouTube), no other;
              - WebSite: the @id the trip and object pages name in isPartOf.
  trip pages  site/t/*.html: a LearningResource whose `teaches` are the trip's own stop titles from
              registry/tours.yaml, whose `timeRequired` is the trip's stated length (the app's own
              estimate_ms, site/js/data/tours.js) as an ISO 8601 duration, and an educationalLevel.
  nowhere     FAQPage (Google shows that result for government and health sites only) and
              SearchAction (the app has no URL search): not on the home page, a trip or an object page.

The validators are functions, and each one is shown to REFUSE a page with the thing broken: a check
that cannot fail is not a check. Needs PyYAML; Node 22 (for estimate_ms) is used when it is on PATH.

Run: python3 tests/test_structured_data.py
"""

from __future__ import annotations

import copy
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
HOST = "https://www.spaceradar.ai"
SAME_AS = {
    "https://github.com/Sara-Managed-Projects/space-radar",
    "https://www.instagram.com/spaceradar.ai/",
    "https://www.linkedin.com/company/spaceradar-ai",
    "https://www.youtube.com/@SpaceRadar_ai",
}
ISO = re.compile(r"^PT(?:(\d+)M)?(?:(\d+)S)?$")
BLOCK = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
failures: list[str] = []


def ok(cond: bool, msg: str) -> None:
    print(("PASS: " if cond else "FAIL: ") + msg)
    if not cond:
        failures.append(msg)


def blocks(text: str) -> list:
    return [json.loads(b.replace("<\\/", "</")) for b in BLOCK.findall(text)]


def nodes(data) -> list[dict]:
    out = []
    for d in data if isinstance(data, list) else [data]:
        out += d.get("@graph", [d]) if isinstance(d, dict) else []
    return out


def types(n: dict) -> list[str]:
    t = n.get("@type", [])
    return t if isinstance(t, list) else [t]


def url_on_host(u) -> bool:
    return isinstance(u, str) and u.startswith(HOST + "/")


def banned(data) -> list[str]:
    found = []
    for n in nodes(data):
        for t in types(n):
            if t in ("FAQPage", "SearchAction", "Question"):
                found.append(t)
        if "potentialAction" in n and any("SearchAction" in types(a) for a in (n["potentialAction"] if isinstance(n["potentialAction"], list) else [n["potentialAction"]])):
            found.append("SearchAction")
    return found


def validate_home(data) -> list[str]:
    p: list[str] = []
    ns = nodes(data)
    by = {t: n for n in ns for t in types(n)}
    ids = {n.get("@id") for n in ns}
    if (data.get("@context") if isinstance(data, dict) else None) != "https://schema.org":
        p.append("@context is not https://schema.org")
    app, org, site = by.get("WebApplication"), by.get("Organization"), by.get("WebSite")
    if not site or site.get("@id") != f"{HOST}/#website":
        p.append(f"no WebSite with @id {HOST}/#website (the trip and object pages name it)")
    if not app:
        p.append("no WebApplication")
    else:
        for k in ("name", "url", "description", "operatingSystem", "browserRequirements"):
            if not app.get(k):
                p.append(f"WebApplication.{k} is missing")
        if app.get("applicationCategory") != "EducationalApplication":
            p.append("WebApplication.applicationCategory is not EducationalApplication")
        if app.get("operatingSystem") != "Any":
            p.append("WebApplication.operatingSystem is not Any")
        if app.get("isAccessibleForFree") is not True:
            p.append("WebApplication.isAccessibleForFree is not true")
        offer = app.get("offers") or {}
        if str(offer.get("price")) != "0" or not offer.get("priceCurrency"):
            p.append("WebApplication.offers is not a price of 0 with a currency")
        if not (isinstance(app.get("license"), str) and app["license"].startswith("https://") and app["license"].endswith("/LICENSE")):
            p.append("WebApplication.license is not the URL of the LICENSE file")
        if app.get("inLanguage") != "en":
            p.append("WebApplication.inLanguage is not en")
        if not url_on_host(app.get("screenshot")):
            p.append("WebApplication.screenshot is not a picture on our host")
        elif not (ROOT / "site" / app["screenshot"][len(HOST) + 1:]).is_file():
            p.append("WebApplication.screenshot names a file that is not in site/")
        if (app.get("publisher") or {}).get("@id") not in ids:
            p.append("WebApplication.publisher does not resolve to a node of the graph")
        for bad in ("aggregateRating", "review"):
            if bad in app:
                p.append(f"WebApplication.{bad} is present: we have no ratings to report")
    if not org:
        p.append("no Organization")
    else:
        for k in ("name", "url"):
            if not org.get(k):
                p.append(f"Organization.{k} is missing")
        logo = (org.get("logo") or {}).get("url")
        if not url_on_host(logo) or not (ROOT / "site" / str(logo)[len(HOST) + 1:]).is_file():
            p.append("Organization.logo is not a file of site/ on our host")
        if set(org.get("sameAs") or []) != SAME_AS or len(org.get("sameAs") or []) != len(SAME_AS):
            p.append(f"Organization.sameAs is not exactly the four accounts: {org.get('sameAs')}")
    for b in banned(data):
        p.append(f"{b} is present (not wanted)")
    return p


def validate_trip(data, trip: dict, estimate_ms: int | None) -> list[str]:
    p: list[str] = []
    ns = nodes(data)
    n = ns[0] if ns else {}
    if "LearningResource" not in types(n) or "WebPage" not in types(n):
        p.append("the node is not a WebPage and a LearningResource")
    want_titles = [s["card"]["title"] for s in trip["stops"] if s.get("card", {}).get("title")]
    teaches = n.get("teaches")
    if not isinstance(teaches, list) or not teaches or not all(isinstance(t, str) and t for t in teaches):
        p.append("teaches is not a list of non-empty strings")
    elif any(t not in want_titles for t in teaches) or teaches[0] != want_titles[0]:
        p.append("teaches names a stop title the trip does not have")
    m = ISO.match(str(n.get("timeRequired") or ""))
    if not m or not (m.group(1) or m.group(2)):
        p.append(f"timeRequired {n.get('timeRequired')!r} is not an ISO 8601 duration")
    elif estimate_ms is not None:
        seconds = int(m.group(1) or 0) * 60 + int(m.group(2) or 0)
        if abs(seconds * 1000 - estimate_ms) > 15000:
            p.append(f"timeRequired is {seconds} s and the trip's own stated length is {estimate_ms // 1000} s")
    if not n.get("educationalLevel"):
        p.append("educationalLevel is missing")
    if n.get("isPartOf", {}).get("@id") != f"{HOST}/#website":
        p.append("isPartOf is not the home page's WebSite")
    if n.get("url") != f"{HOST}/t/{trip['id']}.html" or not n.get("name") or not n.get("description"):
        p.append("url, name or description is missing or not the trip's own")
    for b in banned(data):
        p.append(f"{b} is present (not wanted)")
    return p


# --- the real pages -----------------------------------------------------------------------------
home_blocks = blocks((ROOT / "site" / "index.html").read_text(encoding="utf-8"))
ok(len(home_blocks) == 1, "the home page has one JSON-LD block")
home = home_blocks[0]
problems = validate_home(home)
ok(not problems, f"the home page's graph holds every required field ({problems})")

tours = yaml.safe_load((ROOT / "registry" / "tours.yaml").read_text(encoding="utf-8"))["tours"]
estimates: dict[str, int] = {}
node = shutil.which("node")
if node:
    run = subprocess.run([node, "-e", "import('./site/js/data/tours.js').then(m=>console.log(JSON.stringify(Object.fromEntries(m.TOURS.map(t=>[t.id,t.estimate_ms])))))"],
                         cwd=ROOT, capture_output=True, text=True)
    if run.returncode == 0:
        estimates = json.loads(run.stdout)
ok(not node or len(estimates) == len(tours), f"the app's own stated lengths were read for all {len(tours)} trips")
first = None
for trip in tours:
    page = ROOT / "site" / "t" / f"{trip['id']}.html"
    bl = blocks(page.read_text(encoding="utf-8")) if page.is_file() else []
    bad = validate_trip(bl[0], trip, estimates.get(trip["id"])) if len(bl) == 1 else ["not exactly one JSON-LD block"]
    ok(not bad, f"trip {trip['id']}: LearningResource fields hold ({bad})")
    first = first or (bl[0] if bl else None)

# No FAQPage or SearchAction anywhere a page is committed.
text = "".join(f.read_text(encoding="utf-8") for f in [ROOT / "site" / "index.html", *sorted((ROOT / "site" / "t").glob("*.html"))])
ok("FAQPage" not in text and "SearchAction" not in text, "no committed page names FAQPage or SearchAction")

# --- the validators refuse what they should -------------------------------------------------------
def mutated(data, fn):
    d = copy.deepcopy(data)
    fn(d)
    return d


def gnode(d, t):
    return next(n for n in d["@graph"] if t in types(n))


cases = {
    "a sameAs with Facebook": lambda d: gnode(d, "Organization")["sameAs"].append("https://www.facebook.com/spaceradar"),
    "a missing sameAs account": lambda d: gnode(d, "Organization")["sameAs"].pop(),
    "a price that is not 0": lambda d: gnode(d, "WebApplication")["offers"].update(price="3"),
    "a WebApplication that is not free": lambda d: gnode(d, "WebApplication").update(isAccessibleForFree=False),
    "the wrong category": lambda d: gnode(d, "WebApplication").update(applicationCategory="GameApplication"),
    "a logo that is not a file": lambda d: gnode(d, "Organization")["logo"].update(url=f"{HOST}/images/nope.png"),
    "a made-up rating": lambda d: gnode(d, "WebApplication").update(aggregateRating={"@type": "AggregateRating", "ratingValue": 5}),
    "an FAQPage": lambda d: d["@graph"].append({"@type": "FAQPage", "mainEntity": []}),
    "a SearchAction": lambda d: gnode(d, "WebSite").update(potentialAction={"@type": "SearchAction", "target": "x"}),
    "no WebApplication": lambda d: d["@graph"].remove(gnode(d, "WebApplication")),
    "a publisher that resolves to nothing": lambda d: gnode(d, "WebApplication").update(publisher={"@id": f"{HOST}/#nobody"}),
}
for name, fn in cases.items():
    ok(bool(validate_home(mutated(home, fn))), f"the home validator refuses {name}")

t0 = tours[0]
tcases = {
    "no teaches": lambda d: d.pop("teaches"),
    "a teaches the trip does not have": lambda d: d.update(teaches=["Something invented"]),
    "a timeRequired that is not ISO": lambda d: d.update(timeRequired="2 minutes"),
    "a timeRequired far from the trip's length": lambda d: d.update(timeRequired="PT45M"),
    "no educationalLevel": lambda d: d.pop("educationalLevel"),
    "a plain WebPage": lambda d: d.update({"@type": "WebPage"}),
    "an FAQPage added": lambda d: d.update({"@type": ["WebPage", "LearningResource", "FAQPage"]}),
}
trip0 = blocks((ROOT / "site" / "t" / f"{t0['id']}.html").read_text(encoding="utf-8"))[0]
for name, fn in tcases.items():
    ok(bool(validate_trip(mutated(trip0, fn), t0, estimates.get(t0["id"]) or 150000)), f"the trip validator refuses {name}")

print(f"\n{len(failures)} failure(s)" if failures else "\nall structured-data checks pass")
sys.exit(1 if failures else 0)
