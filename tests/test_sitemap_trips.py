#!/usr/bin/env python3
"""Every trip has its own page in sitemap-pages.xml (the pages sitemap; sitemap.xml is the index of every site's), and the sitemap names no trip page that is not a trip (public #1271).

    python3 tests/test_sitemap_trips.py

Trip pages carry the trip's own words (an H1, the blurb, every stop's card: #1267), which only helps search
if the page is listed. The pages are site/t/<id>.html, written by scripts/gen_trip_pages.py from
registry/tours.yaml; the sitemap is scripts/build_seo.py's `sitemap()`, which lists the files it finds in
site/t/. scripts/check_seo.py already refuses a page missing from the sitemap, but only for the pages that
exist: a trip whose page was never generated is in neither, and passes. So this diffs the two lists the
issue names, the trips and the sitemap, both ways:
  1. every trip id in registry/tours.yaml is a <loc> https://www.spaceradar.ai/t/<id>.html;
  2. every /t/ <loc> is a trip of registry/tours.yaml, once, with a YYYY-MM-DD lastmod;
  3. each of those pages is a file whose H1 and description are the trip's (not another's, not empty).
Each rule is shown to fail on a broken sitemap first.
"""
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_seo  # noqa: E402

HOST = build_seo.DEFAULT_HOST
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
problems = []


def trip_urls(xml):
    """{id: [lastmod, ...]} for every /t/ page the sitemap lists."""
    out = {}
    for u in ET.fromstring(xml).findall("s:url", NS):
        loc = u.findtext("s:loc", "", NS)
        m = re.fullmatch(re.escape(HOST) + r"/t/([a-z0-9-]+)\.html", loc)
        if m:
            out.setdefault(m.group(1), []).append(u.findtext("s:lastmod", "", NS))
    return out


def judge(trips, xml):
    """The findings of one sitemap against the list of trip ids."""
    listed = trip_urls(xml)
    out = [f"trip {t} has no <loc> {HOST}/t/{t}.html in sitemap-pages.xml" for t in trips if t not in listed]
    out += [f"{HOST}/t/{t}.html is in sitemap-pages.xml and {t} is not a trip of registry/tours.yaml" for t in listed if t not in trips]
    out += [f"{HOST}/t/{t}.html is listed {len(v)} times" for t, v in listed.items() if len(v) > 1]
    out += [f"{HOST}/t/{t}.html has lastmod {v[0]!r}, not YYYY-MM-DD" for t, v in listed.items() if not re.fullmatch(r"\d{4}-\d\d-\d\d", v[0] or "")]
    return out


# 1. each rule fails on a sitemap that breaks it
wrap = lambda rows: ('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(rows) + "</urlset>")
row = lambda t, d="2026-11-01": f"<url><loc>{HOST}/t/{t}.html</loc><lastmod>{d}</lastmod></url>"
if judge(["a", "b"], wrap([row("a"), row("b")])):
    problems.append("the rule flags a sitemap that lists every trip once")
for why, trips, rows in [
    ("a trip with no entry", ["a", "b"], [row("a")]),
    ("a page that is not a trip", ["a"], [row("a"), row("ghost")]),
    ("a trip listed twice", ["a"], [row("a"), row("a")]),
    ("a lastmod that is not a date", ["a"], [row("a", "yesterday")]),
]:
    if not judge(trips, wrap(rows)):
        problems.append(f"the rule does not catch {why}")

# 2. the real trips against the real sitemap, built the way scripts/build_seo.py builds it
trips = [t["id"] for t in yaml.safe_load((ROOT / "registry" / "tours.yaml").read_text(encoding="utf-8"))["tours"]]
if len(trips) < 20:
    problems.append(f"registry/tours.yaml names {len(trips)} trips: this read the wrong list")
xml = build_seo.sitemap(HOST, [])
problems += judge(trips, xml)

# 3. each trip's page is its own: an H1 and a description of its own
heads, descs = {}, {}
for t in trips:
    page = ROOT / "site" / "t" / f"{t}.html"
    if not page.is_file():
        problems.append(f"site/t/{t}.html is missing (python3 scripts/gen_trip_pages.py)")
        continue
    text = page.read_text(encoding="utf-8")
    h1 = re.findall(r"<h1[^>]*>(.*?)</h1>", text, re.S)
    d = re.search(r'<meta name="description" content="([^"]*)"', text)
    if len(h1) != 1 or not h1[0].strip():
        problems.append(f"site/t/{t}.html has {len(h1)} <h1> elements, not one with words")
    else:
        heads.setdefault(h1[0].strip(), []).append(t)
    if not d or not d.group(1).strip():
        problems.append(f"site/t/{t}.html has no description")
    else:
        descs.setdefault(d.group(1), []).append(t)
problems += [f"trips {v} share the H1 {k!r}" for k, v in heads.items() if len(v) > 1]
problems += [f"trips {v} share one description" for v in descs.values() if len(v) > 1]

if problems:
    print("FAIL the trip pages and the sitemap disagree:\n  " + "\n  ".join(problems))
    sys.exit(1)
print(f"ok   all {len(trips)} trips are in sitemap-pages.xml once, each with a page of its own words, and each rule was shown to fail first")
