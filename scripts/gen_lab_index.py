#!/usr/bin/env python3
"""Generate site/lab/index.html, the list of the Space Radar Lab's simulators, from the simulators themselves.

The repository's rule is "registry -> generated": a person edits one source and a script writes the rest. For the
Lab the source is the simulator's own file. Each site/lab/<slug>/index.html carries the three facts the list shows,
in its head, where the page itself reads them:

    <title>Rocket Equation | Space Radar Lab</title>
    <meta name="description" content="One sentence: the lesson.">
    <meta name="sr-lab-category" content="Rockets and spaceflight">

so adding a simulator is adding ONE file, and this script (CI runs it with --check) lists it.

THE LEVELS (forge #159, 2026-11-07). registry/lab-levels.yaml tags each simulator with an age band and the
NGSS, KS3, GCSE (AQA 8463) and IB codes it shows. This script writes those tags onto the list's cards with a
filter above them (age, curriculum code, words; a plain <form> the page's one small script reads, and every
card stays listed with no script), and stamps each simulator's "See this in the 3D map" link from the row's
`app` hash, and writes its header and footer (the site's, between chrome: markers). These stamps are all of a simulator this script writes; --check refuses a stale one. A folder whose name starts
with an underscore (_template) is the starter and is not listed. The list is sorted by category, then by title.

Run:  python3 scripts/gen_lab_index.py           # write site/lab/index.html and stamp the 3D-map links
      python3 scripts/gen_lab_index.py --check   # exit 1 if the checked-in file is stale
Guide: docs/ADD_A_SIMULATOR.md
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seo_chrome import footer, header, lab_footer, styles  # noqa: E402
from seo_subscribe import script as subscribe_script  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
LAB = ROOT / "site" / "lab"
HOST = "https://www.spaceradar.ai"
SUFFIX = " | Space Radar Lab"
GUIDE = "https://github.com/Sara-Managed-Projects/space-radar/blob/main/docs/ADD_A_SIMULATOR.md"
PROPOSE = "https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=simulator.yml"
CATEGORIES = ["Orbits and gravity", "Planets and moons", "Scale and distance", "Light and time", "Rockets and spaceflight",
              "Stars and their lives", "Sky from Earth", "Cosmology and black holes", "Stars and galaxies", "Earth, Moon and Sun"]
PAGE_TITLE = "Space Radar Lab: tiny space simulators"
PAGE_DESC = "Small interactive pages, each teaching one idea about space, with every number quoted from its source. Open one, or add your own."


def read(path: Path) -> dict:
    """{slug, title, lesson, category} of one simulator, read from its head."""
    text = path.read_text(encoding="utf-8")
    t = re.search(r"<title>(.*?)</title>", text, re.S)
    d = re.search(r'<meta name="description" content="(.*?)">', text, re.S)
    c = re.search(r'<meta name="sr-lab-category" content="(.*?)">', text, re.S)
    if not (t and d and c):
        raise SystemExit(f"gen_lab_index: {path.relative_to(ROOT)} needs a <title>, a <meta name=\"description\"> and a <meta name=\"sr-lab-category\">")
    title = html.unescape(t.group(1)).strip()
    if not title.endswith(SUFFIX):
        raise SystemExit(f"gen_lab_index: {path.relative_to(ROOT)}: the title must end with {SUFFIX!r}")
    return {"slug": path.parent.name, "title": title[: -len(SUFFIX)], "lesson": html.unescape(d.group(1)).strip(),
            "category": html.unescape(c.group(1)).strip()}


def simulators() -> list[dict]:
    rows = [read(p) for p in sorted(LAB.glob("*/index.html")) if not p.parent.name.startswith("_")]
    for r in rows:
        if r["category"] not in CATEGORIES:
            raise SystemExit(f"gen_lab_index: {r['slug']}: category {r['category']!r} is not one of {CATEGORIES} (add one to scripts/gen_lab_index.py if it is new)")
    return sorted(rows, key=lambda r: (CATEGORIES.index(r["category"]), r["title"].lower()))


def esc(s: str) -> str:
    return html.escape(s, quote=True)


# b200-f6-learn: begin -- forge #159: the levels, the filter and the way into the 3D map
LEVELS = ROOT / "registry" / "lab-levels.yaml"
BANDS = ["7-11", "11-14", "14-16", "16-18", "18+"]
FRAMEWORKS = [("ngss", "NGSS (US)"), ("ks3", "England KS3"), ("gcse", "GCSE physics (AQA 8463)"), ("ib", "IB Physics (2025)")]
APP_PLAIN = '<a href="../../index.html">Back to the live map</a>'
APP_LINK = re.compile(r'<a (?:id="sr-app" )?href="\.\./\.\./index\.html(?:#[^"]*)?">(?:Back to the live map|See this in the 3D map)</a>')


def levels() -> dict:
    """registry/lab-levels.yaml as {codes, labs}; empty when the file is absent (a fork of the Lab alone)."""
    if not LEVELS.is_file():
        return {"codes": {}, "labs": {}}
    import yaml  # the registry's own reader; only needed once the file exists

    doc = yaml.safe_load(LEVELS.read_text(encoding="utf-8")) or {}
    return {"codes": doc.get("codes") or {}, "labs": doc.get("labs") or {}}


def card_tags(row: dict | None) -> tuple[str, str, str]:
    """(data-band, data-code, the visible line) of one card. Pure: tests/test_lab_levels.py."""
    if not row:
        return "", "", ""
    bands = [str(b) for b in row.get("band") or []]
    codes = [f"{fw}:{c}" for fw, _ in FRAMEWORKS for c in (row.get(fw) or [])]
    words = ["Ages " + ", ".join(bands)] if bands else []
    words += [f"{fw.upper()} {', '.join(str(c) for c in row.get(fw) or [])}" for fw, _ in FRAMEWORKS if row.get(fw)]
    return " ".join(bands), " ".join(codes), " · ".join(words)


# The header and the footer of a simulator are the site's (templates/partials/, scripts/seo_chrome.py), written into the
# file between these markers so the file still opens by itself. The simulator's head links css/tokens.css, css/static.css
# and css/lab.css (the picture, the controls); the Subscribe button goes to the band on this list.
CHROME_HEAD = re.compile(r"<!-- chrome:header[^\n]*-->\n(?:.*?\n)?<!-- /chrome:header -->", re.S)
CHROME_FOOT = re.compile(r"<!-- chrome:footer[^\n]*-->\n(?:.*?\n)?<!-- /chrome:footer -->", re.S)


def stamp_chrome(text: str) -> str:
    """A simulator's file with its header and footer set from the partials. Pure; a file with no markers is unchanged."""
    head = ("<!-- chrome:header (written by scripts/gen_lab_index.py from templates/partials/header.html; do not edit) -->\n"
            + header("../../", current="lab", subscribe="../index.html#subscribe") + "\n<!-- /chrome:header -->")
    foot = ("<!-- chrome:footer (written by scripts/gen_lab_index.py from templates/partials/footer.html; do not edit) -->\n"
            + lab_footer("../../") + "\n<!-- /chrome:footer -->")
    return CHROME_FOOT.sub(lambda _: foot, CHROME_HEAD.sub(lambda _: head, text, count=1), count=1)


# THE PLATFORM BRIDGE (the platform contract, js/ui/platform-bridge.js). Between the chrome:head markers, before </head>:
# js/platform-boot.js, which adds the Space Radar platform's script on spaceradar.ai only, and css/controls.css for the
# heart. Between the chrome:fav markers, first in the links under the simulator: the heart, `lab:<slug>`, which keeps the
# simulator in this browser's favourites (sr:favs) with or without the platform. A file without the markers gets them.
CHROME_PLATFORM = re.compile(r"<!-- chrome:head[^\n]*-->\n(?:.*?\n)?<!-- /chrome:head -->\n", re.S)
CHROME_FAV = re.compile(r"<!-- chrome:fav[^\n]*-->(?:.*?)<!-- /chrome:fav -->", re.S)
FAV_ADD = "Add this simulator to your favourites"
FAV_REMOVE = "This simulator is in your favourites. Press to take it out"
HEART_SVG = ('<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" '
             'stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>')


def stamp_platform(text: str, slug: str) -> str:
    """A simulator's file with the platform bridge in its head and its heart under it. Pure; idempotent."""
    head = ("<!-- chrome:head (written by scripts/gen_lab_index.py: the platform bridge, js/ui/platform-bridge.js; do not edit) -->\n"
            '<link rel="stylesheet" href="../../css/controls.css">\n'
            '<script type="module" src="../../js/platform-boot.js"></script>\n'
            "<!-- /chrome:head -->\n")
    if CHROME_PLATFORM.search(text):
        text = CHROME_PLATFORM.sub(lambda _: head, text, count=1)
    elif "</head>" in text:
        text = text.replace("</head>", head + "</head>", 1)
    fav = ("<!-- chrome:fav (written by scripts/gen_lab_index.py; do not edit) -->"
           f'<button type="button" class="ui-btn ui-btn--icon ui-btn--sm sr-heart" data-sr-fav="lab:{esc(slug)}" aria-pressed="false" '
           f'aria-label="{FAV_ADD}" title="{FAV_ADD}" data-sr-add="{FAV_ADD}" data-sr-remove="{FAV_REMOVE}">{HEART_SVG}</button>'
           "<!-- /chrome:fav -->")
    if CHROME_FAV.search(text):
        return CHROME_FAV.sub(lambda _: fav, text, count=1)
    return text.replace('<p class="more">', '<p class="more">' + fav, 1)


def stamp_app_link(text: str, app: str | None) -> str:
    """A simulator's file with its way into the 3D map set from its row (or put back to the plain one). Pure."""
    want = f'<a id="sr-app" href="../../index.html{esc(app)}">See this in the 3D map</a>' if app else APP_PLAIN
    return APP_LINK.sub(want, text, count=1)


def filter_form(codes: dict) -> str:
    """The filter above the cards: three fields and a count, labelled for a screen reader."""
    band_chips = '<button type="button" class="ui-chip" data-band="" aria-pressed="true">All ages</button>' + "".join(
        f'<button type="button" class="ui-chip" data-band="{b}" aria-pressed="false">Ages {b}</button>' for b in BANDS)
    groups = "".join(
        f'<optgroup label="{esc(label)}">' + "".join(f'<option value="{fw}:{esc(str(c))}">{esc(str(c))}: {esc(str(t))[:70]}</option>'
                                                     for c, t in (codes.get(fw) or {}).items()) + "</optgroup>" for fw, label in FRAMEWORKS)
    # The same rows as the journal, games and models filters: a small caps key on the left, the control on the right. The age
    # is a row of the shared pills (.ui-chip, aria-pressed), the curriculum the shared .ui-select, the words a pill field.
    return ('<form class="lfilter" id="lfilter" role="search" aria-label="Filter the simulators">'
            '<div class="lfilter__r"><p class="lfilter__k" id="lf-band">Age</p><div class="lfilter__v" role="group" aria-labelledby="lf-band">'
            + band_chips + '<input type="hidden" name="band" value=""></div></div>'
            '<div class="lfilter__r"><label class="lfilter__k" for="lf-code">Curriculum</label><div class="lfilter__v">'
            '<select class="ui-select ui-select--block" id="lf-code" name="code"><option value="">Any curriculum</option>' + groups + "</select></div></div>"
            '<div class="lfilter__r"><label class="lfilter__k" for="lf-q">Words</label><div class="lfilter__v">'
            '<input class="lfilter__in" id="lf-q" type="search" name="q" placeholder="gravity, Moon, light"></div></div>'
            '<p class="lcount" id="lcount" role="status" aria-live="polite"></p></form>')


# One small script, no library: hides the cards (and the empty topics) that do not match, counts the topic chips again, and keeps the choice in the
# address (#band=11-14&code=gcse:4.8.1.3) so /teachers/ can link to one level. Nothing is fetched.
FILTER_JS = """(function(){var f=document.getElementById('lfilter');if(!f)return;var cards=[].slice.call(document.querySelectorAll('.grid>li'));
function read(){var h={};location.hash.slice(1).split('&').forEach(function(p){var i=p.indexOf('=');if(i>0)h[p.slice(0,i)]=decodeURIComponent(p.slice(i+1))});
['band','code','q'].forEach(function(k){if(h[k]!=null&&f.elements[k])f.elements[k].value=h[k]});pills()}
function pills(){var v=f.elements.band.value;[].forEach.call(f.querySelectorAll('[data-band]'),function(c){c.setAttribute('aria-pressed',c.dataset.band===v?'true':'false')})}
function run(write){var b=f.elements.band.value,c=f.elements.code.value,q=f.elements.q.value.trim().toLowerCase(),n=0;
cards.forEach(function(li){var a=li.firstElementChild,ok=(!b||(' '+a.dataset.band+' ').indexOf(' '+b+' ')>=0)&&(!c||(' '+a.dataset.code+' ').indexOf(' '+c+' ')>=0)&&(!q||a.textContent.toLowerCase().indexOf(q)>=0);li.hidden=!ok;if(ok)n++});
[].forEach.call(document.querySelectorAll('h2.cat'),function(h){var ul=h.nextElementSibling,k=[].filter.call(ul.children,function(li){return!li.hidden}).length,chip=document.querySelector('.topics a[href="#'+h.id+'"]');h.hidden=ul.hidden=!k;if(chip){chip.textContent=chip.dataset.name+' ('+k+')';chip.parentNode.hidden=!k}});
var all=!b&&!c&&!q;document.getElementById('lcount').textContent=all?'':(n===1?'1 simulator matches':n+' simulators match');
if(write){var p=[];if(b)p.push('band='+encodeURIComponent(b));if(c)p.push('code='+encodeURIComponent(c));if(q)p.push('q='+encodeURIComponent(q));history.replaceState(null,'',p.length?'#'+p.join('&'):location.pathname)}}
f.addEventListener('click',function(e){var c=e.target.closest&&e.target.closest('button[data-band]');if(!c)return;f.elements.band.value=c.dataset.band;pills();run(true)});f.addEventListener('input',function(){run(true)});f.addEventListener('submit',function(e){e.preventDefault()});read();run(false)})();"""
# b200-f6-learn: end


LAB_CSS = """
.lab .wrap>.topics{margin:0 0 .5rem}
.lfilter{display:grid;gap:.6rem;margin:0 0 1.4rem}
.lfilter__r{display:grid;align-items:center;gap:.4rem 1rem}
.lfilter__k{margin:0;font:600 .72rem/1 var(--cap);letter-spacing:.2em;text-transform:uppercase;color:var(--dim)}
.lfilter__v{display:flex;flex-wrap:wrap;gap:8px;min-width:0}
.lfilter__v>.ui-select{max-width:36rem}
.lfilter__in{-webkit-appearance:none;appearance:none;width:100%;max-width:36rem;min-height:var(--ui-h);margin:0;padding:0 16px;font:400 var(--ui-fs-field)/1.2 var(--sans);color:var(--tx);background:var(--ui-wash);border:1px solid var(--ui-edge);border-radius:var(--ui-r-pill);transition:border-color var(--ui-fast) var(--ui-ease)}
.lfilter__in:hover{border-color:var(--ui-sel-line)}
.lfilter__in:focus-visible{outline:2px solid var(--atm);outline-offset:2px}
@media(min-width:760px){.lfilter__r{grid-template-columns:6.5rem minmax(0,1fr)}}
@media(pointer:coarse){.lfilter__in{min-height:44px}}
.lcount{flex-basis:100%;margin:0;font-size:.9rem;color:var(--dim);min-height:1.3rem}
.lab h2.cat{font:600 clamp(1.6rem,2.8vw,2.2rem)/1.08 var(--head);letter-spacing:-.012em;margin:2.8rem 0 1.1rem;scroll-margin-top:5.5rem}
.lab ul.grid{list-style:none;margin:0;padding:0}
.lab .grid>li{display:flex}
.lab a.card{flex:1;gap:.6rem;padding:1.15rem 1.3rem 1.3rem;color:var(--tx);text-decoration:none}
.lab a.card h3{margin:0;font:600 1.35rem/1.12 var(--head);letter-spacing:-.008em;text-wrap:balance}
.lab a.card p{margin:0;color:#b9c2d0;font-size:.95rem;line-height:1.55}
.lab a.card .tags{margin-top:auto;padding-top:.3rem;font:400 .76rem/1.5 var(--mono);color:#8f9aab}
.add{margin-top:3.5rem;padding:clamp(1.3rem,3vw,2rem);border-radius:20px;background:radial-gradient(120% 140% at 100% 0,color-mix(in oklab,var(--a) 16%,transparent),transparent 60%),var(--panel);box-shadow:0 0 0 1px color-mix(in oklab,var(--a) 30%,var(--line))}
.add h2{margin:0 0 .6rem;font:600 clamp(1.4rem,2.6vw,1.9rem)/1.1 var(--head)}
.add p{color:#c5cdda;max-width:44rem}
"""


def anchor(cat: str) -> str:
    return "cat-" + re.sub(r"[^a-z0-9]+", "-", cat.lower()).strip("-")


def card(s: dict, row: dict | None) -> str:
    """One simulator's card on the list, with its levels when registry/lab-levels.yaml has a row for it."""
    band, code, line = card_tags(row)
    data = f' data-band="{esc(band)}" data-code="{esc(code)}"' if row else ' data-band="" data-code=""'
    tags = f'<p class="tags">{esc(line)}</p>' if line else ""
    return f'<li><a class="card" href="{esc(s["slug"])}/index.html"{data}><h3>{esc(s["title"])}</h3><p>{esc(s["lesson"])}</p>{tags}</a></li>'


def build() -> str:
    sims = simulators()
    lv = levels()  # b200-f6-learn
    sections = []
    chips = []
    for cat in CATEGORIES:
        mine = [s for s in sims if s["category"] == cat]
        if not mine:
            continue
        cards = "\n".join(card(s, lv["labs"].get(s["slug"])) for s in mine)
        sections.append(f'<h2 class="cat" id="{anchor(cat)}">{esc(cat)}</h2>\n<ul class="grid">\n{cards}\n</ul>')
        chips.append(f'<li><a href="#{anchor(cat)}" data-name="{esc(cat)}">{esc(cat)} ({len(mine)})</a></li>')
    icon = ("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12.5' fill='%230B0E14'/>"
            "<circle cx='32' cy='32' r='14.38' fill='%232E6FB8'/></svg>")
    return f"""<!doctype html>
<!-- GENERATED by scripts/gen_lab_index.py from the head of each site/lab/<slug>/index.html. Do not edit: add or change a simulator and run the script. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(PAGE_TITLE)}</title>
<meta name="description" content="{esc(PAGE_DESC)}">
<link rel="canonical" href="{HOST}/lab/index.html">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0b0e14">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Space Radar">
<meta property="og:title" content="{esc(PAGE_TITLE)}">
<meta property="og:description" content="{esc(PAGE_DESC)}">
<meta property="og:image" content="{HOST}/og/default.png">
<meta property="og:url" content="{HOST}/lab/index.html">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{HOST}/og/default.png">
<link rel="icon" href="{icon}">
{styles("../")}
<link rel="stylesheet" href="../css/controls.css">
<style>
{LAB_CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
{header("../", current="lab")}
<main id="main" class="lab">
<header class="ph"><div class="wrap ph__in">
<p class="eyebrow">Space Radar Lab</p>
<h1>Tiny space simulators</h1>
<p class="lead">{len(sims)} small pages, each teaching one idea about space. Every number is quoted from its source, and every page says what is and is not to scale. Open one and move the slider.</p>
</div></header>
<div class="wrap">
{filter_form(lv["codes"])}
<nav aria-label="Topics"><ul class="tagcloud topics">{"".join(chips)}</ul></nav>
{chr(10).join(sections)}
<section class="add" aria-labelledby="add-h">
<h2 id="add-h">Add your own simulator</h2>
<p>One HTML file, no libraries, no network, about ten minutes. Copy the starter, change the numbers, quote your source, open a pull request.</p>
<ul class="tagcloud"><li><a href="{GUIDE}">Read the guide</a></li><li><a href="{PROPOSE}">Propose or build a simulator</a></li><li><a href="https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Alab">Open tasks</a></li></ul>
</section>
</div>
</main>
{footer("../", f"{HOST}/lab/index.html")}
<script>{FILTER_JS}</script>
{subscribe_script("../")}</body>
</html>
"""


def stamped() -> list[tuple[Path, str, str]]:
    """(file, its text now, its text with the app link from registry/lab-levels.yaml and the site's header and footer) of
    every simulator, and of the starter (_template), which has no row and so keeps the plain link."""
    labs = levels()["labs"]
    out = []
    for p in sorted(LAB.glob("*/index.html")):
        text = p.read_text(encoding="utf-8")
        out.append((p, text, stamp_platform(stamp_chrome(stamp_app_link(text, (labs.get(p.parent.name) or {}).get("app"))), p.parent.name)))
    return out


def main(argv: list[str]) -> int:
    out = LAB / "index.html"
    new = build()
    stale_links = [p for p, now, want in stamped() if now != want]  # b200-f6-learn
    if "--check" in argv:
        if not out.is_file() or out.read_text(encoding="utf-8") != new:
            print("site/lab/index.html is stale: run python3 scripts/gen_lab_index.py and commit it", file=sys.stderr)
            return 1
        if stale_links:
            print(f"{len(stale_links)} simulator(s) carry a stale 3D-map link, header, footer or platform bridge ({stale_links[0].parent.name} ...): run python3 scripts/gen_lab_index.py", file=sys.stderr)
            return 1
        print(f"site/lab/index.html is current ({len(simulators())} simulators)")
        return 0
    out.write_text(new, encoding="utf-8")
    for p, _, want in stamped():
        if p in stale_links:
            p.write_text(want, encoding="utf-8")
    print(f"wrote site/lab/index.html ({len(simulators())} simulators; {len(stale_links)} simulator(s) re-stamped: 3D-map link, header, footer)")
    return 0


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
