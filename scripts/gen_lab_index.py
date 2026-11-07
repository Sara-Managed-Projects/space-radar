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
`app` hash. The stamp is the one line of a simulator this script writes; --check refuses a stale one. A folder whose name starts
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
from seo_footer import sitelinks  # noqa: E402

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


def stamp_app_link(text: str, app: str | None) -> str:
    """A simulator's file with its way into the 3D map set from its row (or put back to the plain one). Pure."""
    want = f'<a id="sr-app" href="../../index.html{esc(app)}">See this in the 3D map</a>' if app else APP_PLAIN
    return APP_LINK.sub(want, text, count=1)


def filter_form(codes: dict) -> str:
    """The filter above the cards: three fields and a count, labelled for a screen reader."""
    band_opts = "".join(f'<option value="{b}">Ages {b}</option>' for b in BANDS)
    groups = "".join(
        f'<optgroup label="{esc(label)}">' + "".join(f'<option value="{fw}:{esc(str(c))}">{esc(str(c))}: {esc(str(t))[:70]}</option>'
                                                     for c, t in (codes.get(fw) or {}).items()) + "</optgroup>" for fw, label in FRAMEWORKS)
    return ('<form class="lfilter" id="lfilter" role="search" aria-label="Filter the simulators">'
            '<label>Age <select name="band"><option value="">All ages</option>' + band_opts + "</select></label>"
            '<label>Curriculum <select name="code"><option value="">Any curriculum</option>' + groups + "</select></label>"
            '<label>Words <input type="search" name="q" placeholder="gravity, Moon, light"></label>'
            '<p class="lcount" id="lcount" role="status" aria-live="polite"></p></form>')


# One small script, no library: hides the cards (and the empty topics) that do not match, and keeps the choice in the
# address (#band=11-14&code=gcse:4.8.1.3) so /teachers/ can link to one level. Nothing is fetched.
FILTER_JS = """(function(){var f=document.getElementById('lfilter');if(!f)return;var cards=[].slice.call(document.querySelectorAll('.grid>li'));
function read(){var h={};location.hash.slice(1).split('&').forEach(function(p){var i=p.indexOf('=');if(i>0)h[p.slice(0,i)]=decodeURIComponent(p.slice(i+1))});
['band','code','q'].forEach(function(k){if(h[k]!=null&&f.elements[k])f.elements[k].value=h[k]})}
function run(write){var b=f.elements.band.value,c=f.elements.code.value,q=f.elements.q.value.trim().toLowerCase(),n=0;
cards.forEach(function(li){var a=li.firstElementChild,ok=(!b||(' '+a.dataset.band+' ').indexOf(' '+b+' ')>=0)&&(!c||(' '+a.dataset.code+' ').indexOf(' '+c+' ')>=0)&&(!q||a.textContent.toLowerCase().indexOf(q)>=0);li.hidden=!ok;if(ok)n++});
[].forEach.call(document.querySelectorAll('h2.cat'),function(h){var ul=h.nextElementSibling,any=[].some.call(ul.children,function(li){return!li.hidden});h.hidden=ul.hidden=!any});
var all=!b&&!c&&!q;document.getElementById('lcount').textContent=all?'':(n===1?'1 simulator matches':n+' simulators match');
if(write){var p=[];if(b)p.push('band='+encodeURIComponent(b));if(c)p.push('code='+encodeURIComponent(c));if(q)p.push('q='+encodeURIComponent(q));history.replaceState(null,'',p.length?'#'+p.join('&'):location.pathname)}}
f.addEventListener('input',function(){run(true)});f.addEventListener('submit',function(e){e.preventDefault()});read();run(false)})();"""
# b200-f6-learn: end


LAB_CSS = """
main,.top__in,.foot__in{width:min(100% - 2*var(--g),1160px)}
.intro{display:flex;flex-wrap:wrap;align-items:center;gap:16px 24px;margin:0 0 24px}
.intro p{margin:0}
.grid{list-style:none;margin:0;padding:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))}
.grid{gap:16px}
.card{display:flex;flex-direction:column;gap:6px;height:100%;padding:18px 20px 20px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015));box-shadow:0 0 0 1px rgba(255,255,255,.09);color:var(--sr-text);text-decoration:none;transition:box-shadow .4s,translate .4s}
.card:hover{color:var(--sr-text);box-shadow:0 0 0 1px rgba(255,159,67,.7),0 22px 50px -28px var(--sr-ember);translate:0 -3px}
.card .micro{margin:0}
.card h3{margin:0;font-size:1.25rem;line-height:1.2}
.card p{margin:0;font-size:14.5px;line-height:1.5;color:#b9c2d0}
.cat{margin:32px 0 12px;padding-top:0;border-top:0;scroll-margin-top:12px}
.topics{margin:0 0 8px}
.add{margin-top:40px;padding:20px;border:1px dashed var(--sr-line);border-radius:18px}
.add h2{margin:0 0 8px;padding:0;border:0}
.lfilter{display:flex;flex-wrap:wrap;gap:12px 16px;align-items:end;margin:8px 0 16px}
.lfilter label{display:grid;gap:4px;font-size:13px;color:var(--sr-text-dim);min-width:0;flex:1 1 200px;max-width:100%}
.lfilter select,.lfilter input{box-sizing:border-box;width:100%;min-height:44px;max-width:100%;margin:0;border-radius:12px;border:1px solid var(--sr-line);background:var(--sr-wash);color:var(--sr-text);font:400 15px/20px Inter,system-ui,sans-serif;padding:0 12px}
.lfilter input{-webkit-appearance:none;appearance:none;background-image:none}
.lcount{flex-basis:100%;margin:0;font-size:14px;color:var(--sr-text-dim);min-height:20px}
.card .tags{font-size:12.5px;line-height:1.45;color:#8f9aab}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
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
        chips.append(f'<li><a href="#{anchor(cat)}">{esc(cat)} ({len(mine)})</a></li>')
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
<link rel="stylesheet" href="../css/fonts.css">
<link rel="stylesheet" href="../css/static.css">
<style>
{LAB_CSS}</style>
</head>
<body>
<header class="top"><div class="top__in"><a class="mark" href="../index.html">Space Radar</a><nav aria-label="Site"><a href="https://blog.spaceradar.ai/">Blog</a></nav><a class="openmap" href="../index.html">Open the 3D map</a></div></header>
<main>
<p class="micro">Space Radar Lab</p>
<h1>Tiny space simulators</h1>
<div class="intro"><p class="lead">{len(sims)} small pages, each teaching one idea about space. Every number is quoted from its source, and every page says what is and is not to scale. Open one and move the slider.</p></div>
{filter_form(lv["codes"])}
<nav aria-label="Topics"><ul class="links topics">{"".join(chips)}</ul></nav>
{chr(10).join(sections)}
<section class="add" aria-labelledby="add-h">
<h2 id="add-h">Add your own simulator</h2>
<p>One HTML file, no libraries, no network, about ten minutes. Copy the starter, change the numbers, quote your source, open a pull request.</p>
<ul class="links"><li><a href="{GUIDE}">Read the guide</a></li><li><a href="{PROPOSE}">Propose or build a simulator</a></li><li><a href="https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Alab">Open tasks</a></li></ul>
</section>
</main>
<footer><div class="foot__in">
{sitelinks("../")}
</div></footer>
<script>{FILTER_JS}</script>
</body>
</html>
"""


def stamped() -> list[tuple[Path, str, str]]:
    """(file, its text now, its text with the app link from registry/lab-levels.yaml) of every simulator."""
    labs = levels()["labs"]
    out = []
    for p in sorted(LAB.glob("*/index.html")):
        if p.parent.name.startswith("_"):
            continue
        text = p.read_text(encoding="utf-8")
        out.append((p, text, stamp_app_link(text, (labs.get(p.parent.name) or {}).get("app"))))
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
            print(f"{len(stale_links)} simulator(s) carry a stale 3D-map link ({stale_links[0].parent.name} ...): run python3 scripts/gen_lab_index.py", file=sys.stderr)
            return 1
        print(f"site/lab/index.html is current ({len(simulators())} simulators)")
        return 0
    out.write_text(new, encoding="utf-8")
    for p, _, want in stamped():
        if p in stale_links:
            p.write_text(want, encoding="utf-8")
    print(f"wrote site/lab/index.html ({len(simulators())} simulators; {len(stale_links)} 3D-map link(s) stamped)")
    return 0


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
