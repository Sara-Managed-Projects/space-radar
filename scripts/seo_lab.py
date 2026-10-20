#!/usr/bin/env python3
"""The Lab's simulator pages as a crawler and a link preview read them (growth card, 2026-10-16).

A simulator is one hand-written file, site/lab/<slug>/index.html, copied from site/lab/_template, and its
head carries three facts: the title, the description and sr-lab-category (scripts/gen_lab_index.py reads
them for the list). Measured 2026-10-16 with curl: none of the 75 had a canonical, an og: tag or JSON-LD, while the
object and question pages have all three.

Contributors are not asked to write them. scripts/build_seo.py calls build() at deploy time: it copies every
simulator into <out>/lab/<slug>/index.html with, just before </head>,
    a canonical and og:url (the page's own address), og:title / og:description / og:image (the site's card,
    site/og/default.png), twitter:card, and one JSON-LD block: a LearningResource (a simulation) with a
    BreadcrumbList Space Radar > Lab > the simulator.
Nothing between <body> and </body> changes, and nothing is added that the head does not already say: no
rating, no review, no audience or age the page does not state. A page that already has a canonical keeps its
own head (a contributor who wrote one is not overwritten). The list, site/lab/index.html, is copied as it is
(scripts/gen_lab_index.py already writes its head). scripts/deploy.sh uploads lab/ from <out>, so the committed
files stay what the contributor wrote.
"""

from __future__ import annotations

import html
import json
from pathlib import Path

import gen_lab_index

OG_IMAGE, OG_W, OG_H = "og/default.png", 1200, 630
OG_ALT = "The Earth from space with the satellites around it as points of light, captioned Space Radar."
MARK = "<!-- head tags: scripts/seo_lab.py -->"

esc = lambda s: html.escape(str(s), quote=True)  # noqa: E731


def simulator_files(site: Path) -> list[Path]:
    """Every simulator's file; _template/ is a starter, not a page."""
    return [p for p in sorted((site / "lab").glob("*/index.html")) if not p.parent.name.startswith("_")]


def head_tags(facts: dict, host: str) -> str:
    """The tags one simulator gets, from the three facts gen_lab_index.read() takes from its head."""
    url = f"{host}/lab/{facts['slug']}/index.html"
    title = f"{facts['title']}{gen_lab_index.SUFFIX}"
    image = f"{host}/{OG_IMAGE}"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "LearningResource", "@id": url, "url": url, "name": facts["title"], "headline": title,
         "description": facts["lesson"], "learningResourceType": "Simulation", "interactivityType": "active",
         "educationalUse": "Interactive simulation", "about": facts["category"], "keywords": facts["category"],
         "inLanguage": "en", "isAccessibleForFree": True, "image": image,
         "isPartOf": {"@id": f"{host}/#website"},
         "breadcrumb": {"@type": "BreadcrumbList", "itemListElement": [
             {"@type": "ListItem", "position": 1, "name": "Space Radar", "item": f"{host}/"},
             {"@type": "ListItem", "position": 2, "name": "Lab", "item": f"{host}/lab/index.html"},
             {"@type": "ListItem", "position": 3, "name": facts["title"]}]}}]}
    rows = [
        MARK,
        f'<link rel="canonical" href="{esc(url)}">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Space Radar">',
        f'<meta property="og:title" content="{esc(title)}">',
        f'<meta property="og:description" content="{esc(facts["lesson"])}">',
        f'<meta property="og:url" content="{esc(url)}">',
        f'<meta property="og:image" content="{esc(image)}">',
        f'<meta property="og:image:width" content="{OG_W}">',
        f'<meta property="og:image:height" content="{OG_H}">',
        f'<meta property="og:image:alt" content="{esc(OG_ALT)}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:image" content="{esc(image)}">',
        '<script type="application/ld+json">'
        + json.dumps(ld, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + "</script>",
    ]
    return "\n".join(rows) + "\n"


def page(text: str, facts: dict, host: str) -> str:
    """One simulator's file with its head tags; unchanged when it already names a canonical."""
    head, sep, rest = text.partition("</head>")
    if not sep:
        raise SystemExit(f"seo_lab: lab/{facts['slug']}/index.html has no </head>")
    if 'rel="canonical"' in head:
        return text
    return head + head_tags(facts, host) + sep + rest


def build(out: Path, host: str, site: Path | None = None) -> int:
    """Write the list and every simulator, with its head tags, under <out>/lab/. Returns how many simulators."""
    site = site or gen_lab_index.ROOT / "site"
    files = simulator_files(site)
    (out / "lab").mkdir(parents=True, exist_ok=True)
    (out / "lab" / "index.html").write_bytes((site / "lab" / "index.html").read_bytes())
    for f in files:
        facts = gen_lab_index.read(f)
        dest = out / "lab" / f.parent.name / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(page(f.read_text(encoding="utf-8"), facts, host), encoding="utf-8")
    return len(files)
