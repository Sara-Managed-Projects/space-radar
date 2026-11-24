#!/usr/bin/env python3
"""The Lab's learning paths (forge #566): /lab/paths/ and the "learning path" box on each simulator a path holds.

    python3 scripts/seo_lab_paths.py --check        # the registry is sound (tests/test_lab_paths.py runs more)
    python3 scripts/seo_lab_paths.py --out DIR      # build the page and the boxes into DIR (build_seo.py does this)

The source is registry/lab-paths.yaml (what a path is, and why the ages are not written there). scripts/build_seo.py calls
build() after scripts/seo_lab.py has copied the simulators into <out>/lab/, so the page is a built page like the object
and question pages (deploy.sh uploads lab/ from the build) and the committed simulators stay as their authors wrote them.

THE PAGE, lab/paths/index.html: every path as a section, with the same age pills and curriculum list as /lab/ (the ages
and codes are read off registry/lab-levels.yaml for the simulators the path holds), its simulators in order as the
Lab's own cards, and the paths to do first. With no script it is a plain list of links. With one, small and inline (no
library, no request), it ticks the simulators already done, counts them, points "Continue the path" at the first one
not done, filters by age and curriculum, and keeps the choice in the address (#band=11-14) as /lab/ does.

THE BOX on a simulator (an <aside> under its controls, one per path that holds it, all hidden): shown only when the page was
opened from that path (?path=<id>, a path id and nothing personal), with the step, a "Mark as done" toggle and the next
simulator (or, at the end, the way back to the paths). The page's own simulator is untouched.

PROGRESS is localStorage `sr:paths`, {pathId: [slug, ...]}: written only when the visitor presses "Mark as done", read
only by these two pages, never sent anywhere. A browser that refuses storage gets no toggle and the plain links.

EVERY WORD here is a segment of the built English page, so scripts/seo_i18n.py puts it in the catalog and the page is
built in a language only when all of it is translated (registry/seo-i18n/<lang>/lab.json). The script writes no words:
it shows and hides what the page already says, so a translated page needs nothing else.
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gen_lab_index  # noqa: E402
from seo_chrome import footer, header, styles  # noqa: E402
from seo_subscribe import script as subscribe_script  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "registry" / "lab-paths.yaml"
PAGE = "lab/paths/index.html"
KEY = "sr:paths"
TITLE = "Learning paths through the Space Radar Lab"
DESC = ("Short paths through the Lab's simulators in course order, by age and curriculum: orbits, light, stars, black "
        "holes, rockets, planets and the sky.")
ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
MIN_SIMS, MAX_SIMS, NAME_MAX = 4, 8, 40

esc = lambda s: html.escape(str(s), quote=True)  # noqa: E731


def load(path: Path = REGISTRY) -> list[dict]:
    import yaml

    doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return list(doc.get("paths") or [])


def problems(paths: list[dict], sims: dict[str, dict], labs: dict[str, dict]) -> list[str]:
    """What is wrong with the registry, against the Lab's folders and levels. Pure: tests/test_lab_paths.py."""
    out = []
    ids = [p.get("id") for p in paths]
    if not 6 <= len(paths) <= 8:
        out.append(f"{len(paths)} paths: the Lab is cut into six to eight")
    for p in paths:
        pid = p.get("id")
        where = f"path {pid!r}"
        if not isinstance(pid, str) or not ID.match(pid):
            out.append(f"{where}: the id must be lower-case words with dashes")
        if ids.count(pid) > 1:
            out.append(f"{where}: the id is used twice")
        name, say = p.get("name"), p.get("say")
        if not isinstance(name, str) or not name or len(name) > NAME_MAX or name[0] != name[0].upper():
            out.append(f"{where}: the name must be sentence case and at most {NAME_MAX} characters")
        if not isinstance(say, str) or not say.endswith(".") or len(say) > 120:
            out.append(f"{where}: `say` is one sentence of at most 120 characters, ending with a full stop")
        for a in p.get("after") or []:
            if a not in ids or a == pid:
                out.append(f"{where}: after {a!r} names no other path")
        rows = p.get("sims") or []
        if not MIN_SIMS <= len(rows) <= MAX_SIMS:
            out.append(f"{where}: {len(rows)} simulators, not {MIN_SIMS} to {MAX_SIMS}")
        if len(set(rows)) != len(rows):
            out.append(f"{where}: a simulator is listed twice")
        for s in rows:
            if s not in sims:
                out.append(f"{where}: {s!r} is not a simulator in site/lab/")
            elif s not in labs:
                out.append(f"{where}: {s!r} has no row in registry/lab-levels.yaml, so the path cannot show its ages")
    # the `after` graph has no loop: a path cannot be its own prerequisite
    graph = {p.get("id"): list(p.get("after") or []) for p in paths}

    def loops(node, seen):
        for nxt in graph.get(node, []):
            if nxt in seen or loops(nxt, seen | {nxt}):
                return True
        return False

    for pid in graph:
        if loops(pid, {pid}):
            out.append(f"path {pid!r}: its `after` comes back round to itself")
    counts: dict[str, int] = {}
    for p in paths:
        for s in p.get("sims") or []:
            counts[s] = counts.get(s, 0) + 1
    out += [f"{s!r} is in {n} paths: two at most" for s, n in counts.items() if n > 2]
    return out


def bands_of(p: dict, labs: dict) -> list[str]:
    """The ages a path holds, in gen_lab_index.BANDS order: every band any of its simulators is pitched at."""
    have = {str(b) for s in p["sims"] for b in (labs.get(s) or {}).get("band") or []}
    return [b for b in gen_lab_index.BANDS if b in have]


def codes_of(p: dict, labs: dict) -> list[str]:
    seen: list[str] = []
    for s in p["sims"]:
        for fw, _ in gen_lab_index.FRAMEWORKS:
            for c in (labs.get(s) or {}).get(fw) or []:
                code = f"{fw}:{c}"
                if code not in seen:
                    seen.append(code)
    return seen


def age_range(bands: list[str]) -> str:
    """schema.org typicalAgeRange of the bands: "11-16", or "16-" when the top band is open ("18+")."""
    lo = min(int(b.split("-")[0].rstrip("+")) for b in bands)
    if any(b.endswith("+") for b in bands):
        return f"{lo}-"
    return f"{lo}-{max(int(b.split('-')[1]) for b in bands)}"


def sim_url(slug: str, pid: str, rel: str = "../") -> str:
    return f"{rel}{slug}/index.html?path={pid}"


# --- the script both pages carry (one, small, no library) ---------------------------------------------------------------
# srPaths.read/has/set are pure over the record and are what tests/test_lab_paths.mjs runs; the rest only shows, hides
# and points links the page already has. A record that is not {id: [slug]} reads as empty; ids and slugs that are not
# lower-case words are dropped; a path keeps at most 40 ticks.
CLIENT_JS = r"""(function(){var K='sr:paths',ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function clean(v){var o={};if(!v||typeof v!=='object'||Array.isArray(v))return o;Object.keys(v).forEach(function(p){if(!ID.test(p)||!Array.isArray(v[p]))return;var a=[];v[p].forEach(function(s){if(typeof s==='string'&&ID.test(s)&&a.indexOf(s)<0&&a.length<40)a.push(s)});if(a.length)o[p]=a});return o}
function store(){try{return window.localStorage}catch(e){return null}}
function read(){var s=store();if(!s)return{};try{return clean(JSON.parse(s.getItem(K)||'{}'))}catch(e){return{}}}
function write(v){var s=store();if(!s)return false;try{var c=clean(v);if(Object.keys(c).length)s.setItem(K,JSON.stringify(c));else s.removeItem(K);return true}catch(e){return false}}
function has(v,p,s){return!!(v[p]&&v[p].indexOf(s)>=0)}
function set(v,p,s,on){var o=clean(v),a=(o[p]||[]).filter(function(x){return x!==s});if(on)a.push(s);if(a.length)o[p]=a;else delete o[p];return o}
function canKeep(){var s=store();if(!s)return false;try{s.setItem(K+':t','1');s.removeItem(K+':t');return true}catch(e){return false}}
window.srPaths={KEY:K,clean:clean,read:read,write:write,has:has,set:set};
var d=document,keep=canKeep();
// a simulator opened from a path: its box
var m=/[?&]path=([a-z0-9-]+)/.exec(location.search||''),box=m&&d.getElementById('lpath-'+m[1]);
if(box){box.hidden=false;var b=box.querySelector('[data-slug]');if(b){if(!keep)b.hidden=true;var paint=function(){b.setAttribute('aria-pressed',has(read(),m[1],b.dataset.slug)?'true':'false')};paint();
b.addEventListener('click',function(){var on=b.getAttribute('aria-pressed')!=='true';write(set(read(),m[1],b.dataset.slug,on));paint()})}}
// the paths page
var f=d.getElementById('pfilter'),secs=[].slice.call(d.querySelectorAll('section.lp'));if(!secs.length)return;
function paintAll(){var v=read();secs.forEach(function(sec){var p=sec.id,lis=[].slice.call(sec.querySelectorAll('ol.lp__steps>li')),n=0,first=null;
lis.forEach(function(li){var on=has(v,p,li.dataset.slug);if(on){n++;li.setAttribute('data-done','');li.querySelector('a').setAttribute('aria-describedby','lp-done')}else{li.removeAttribute('data-done');li.querySelector('a').removeAttribute('aria-describedby');if(!first)first=li}});
var prog=sec.querySelector('.lp__prog'),go=sec.querySelector('[data-go]'),cont=sec.querySelector('[data-cont]'),clr=sec.querySelector('[data-clear]');
prog.querySelector('.lp__n').textContent=String(n);prog.hidden=!keep;var mid=n>0&&first;go.hidden=!!mid;cont.hidden=!mid;if(mid)cont.href=first.querySelector('a').getAttribute('href');clr.hidden=!(keep&&n>0)})}
secs.forEach(function(sec){sec.querySelector('[data-clear]').addEventListener('click',function(){var v=read();delete v[sec.id];write(v);paintAll()})});
paintAll();window.addEventListener('storage',function(e){if(e.key===K)paintAll()});
if(!f)return;
function pills(){var v=f.elements.band.value;[].forEach.call(f.querySelectorAll('[data-band]'),function(c){c.setAttribute('aria-pressed',c.dataset.band===v?'true':'false')})}
function run(w){var b=f.elements.band.value,c=f.elements.code.value,n=0;secs.forEach(function(sec){var ok=(!b||(' '+sec.dataset.band+' ').indexOf(' '+b+' ')>=0)&&(!c||(' '+sec.dataset.code+' ').indexOf(' '+c+' ')>=0);sec.hidden=!ok;if(ok)n++;
[].forEach.call(sec.querySelectorAll('ol.lp__steps>li'),function(li){var a=li.firstElementChild,mine=(!b||(' '+a.dataset.band+' ').indexOf(' '+b+' ')>=0)&&(!c||(' '+a.dataset.code+' ').indexOf(' '+c+' ')>=0);if(b||c)li.setAttribute('data-dim',mine?'false':'true');else li.removeAttribute('data-dim')})});
d.getElementById('pnone').hidden=n>0;if(w){var p=[];if(b)p.push('band='+encodeURIComponent(b));if(c)p.push('code='+encodeURIComponent(c));history.replaceState(null,'',p.length?'#'+p.join('&'):location.pathname)}}
function readHash(){location.hash.slice(1).split('&').forEach(function(x){var i=x.indexOf('=');if(i>0){var k=x.slice(0,i),v=decodeURIComponent(x.slice(i+1));if((k==='band'||k==='code')&&f.elements[k])f.elements[k].value=v}});pills()}
f.addEventListener('click',function(e){var c=e.target.closest&&e.target.closest('button[data-band]');if(!c)return;f.elements.band.value=c.dataset.band;pills();run(true)});
f.addEventListener('input',function(){run(true)});f.addEventListener('submit',function(e){e.preventDefault()});readHash();run(false)})();"""


PATHS_CSS = """
.lpaths .lp{margin:0 0 3rem;scroll-margin-top:5.5rem}
.lpaths .lp h2.cat{margin:2.4rem 0 .5rem}
.lpaths .lp__say{margin:0 0 .8rem;max-width:44rem;color:var(--tx);font-size:1.05rem}
.lpaths .lp__meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px}
.lpaths .lp__meta p{margin:0;font:400 .86rem/1.4 var(--mono);color:var(--dim)}
.lpaths .lp__after{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 16px}
.lpaths .lp__after p{margin:0;font:600 .72rem/1 var(--cap);letter-spacing:.2em;text-transform:uppercase;color:var(--dim)}
.lpaths ol.lp__steps{list-style:none;margin:0 0 16px;padding:0;counter-reset:lp}
.lpaths ol.lp__steps>li{counter-increment:lp;display:flex}
.lpaths ol.lp__steps>li>a.card h3::before{content:counter(lp) ". ";color:var(--dim)}
.lpaths ol.lp__steps>li[data-done]>a.card h3::after{content:"";display:inline-block;width:.9em;height:.9em;margin-inline-start:.4em;vertical-align:-.1em;background:var(--atm);-webkit-mask:var(--lp-tick) center/contain no-repeat;mask:var(--lp-tick) center/contain no-repeat}
.lpaths ol.lp__steps>li[data-dim=true]{opacity:.55}
.lpaths{--lp-tick:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E")}
.lpaths .lp__prog{margin:0 0 12px;color:var(--dim)}
.lpaths .lp__prog .lp__n{color:var(--tx);font-variant-numeric:tabular-nums}
.lpaths .lp__go{display:flex;flex-wrap:wrap;gap:8px;margin:0}
.lpaths .lp__note{margin:2rem 0 0;max-width:44rem;color:var(--dim);font-size:.92rem}
.lpaths #pnone{color:var(--dim)}
@media(min-width:760px){.lpaths ol.lp__steps{display:grid;grid-template-columns:repeat(auto-fill,minmax(16rem,1fr));gap:12px}}
@media(max-width:759px){.lpaths ol.lp__steps>li+li{margin-top:12px}}
"""


def chip(text: str) -> str:
    return f'<li>{esc(text)}</li>'


def path_section(p: dict, names: dict, sims: dict, labs: dict) -> str:
    pid, rows = p["id"], p["sims"]
    bands = bands_of(p, labs)
    cards = []
    for s in rows:
        band, code, line = gen_lab_index.card_tags(labs.get(s))
        tags = f'<p class="tags">{esc(line)}</p>' if line else ""
        cards.append(f'<li data-slug="{esc(s)}"><a class="card" href="{esc(sim_url(s, pid))}" data-band="{esc(band)}" data-code="{esc(code)}">'
                     f'<h3>{esc(sims[s]["title"])}</h3><p>{esc(sims[s]["lesson"])}</p>{tags}</a></li>')
    after = ""
    if p.get("after"):
        links = "".join(f'<li><a href="#{esc(a)}">{esc(names[a])}</a></li>' for a in p["after"])
        after = f'<div class="lp__after"><p>Best after</p><ul class="tagcloud">{links}</ul></div>'
    ages = "".join(chip(f"Ages {b}") for b in bands)
    first = sim_url(rows[0], pid)
    return (f'<section class="lp" id="{esc(pid)}" aria-labelledby="{esc(pid)}-h" data-band="{esc(" ".join(bands))}" '
            f'data-code="{esc(" ".join(codes_of(p, labs)))}">\n'
            f'<h2 class="cat" id="{esc(pid)}-h">{esc(p["name"])}</h2>\n'
            f'<p class="lp__say">{esc(p["say"])}</p>\n'
            f'<div class="lp__meta"><ul class="tagcloud" aria-label="Ages">{ages}</ul><p>{len(rows)} simulators</p></div>\n'
            f'{after}\n'
            f'<ol class="lp__steps">\n' + "\n".join(cards) + "\n</ol>\n"
            f'<p class="lp__prog" hidden><span class="lp__n">0</span> of {len(rows)} done</p>\n'
            f'<p class="lp__go"><a class="ui-btn ui-btn--secondary" data-go href="{esc(first)}">Start the path</a>'
            f'<a class="ui-btn ui-btn--secondary" data-cont hidden href="{esc(first)}">Continue the path</a>'
            f'<button type="button" class="ui-btn ui-btn--quiet" data-clear hidden>Clear the ticks</button></p>\n'
            f'</section>')


def filter_form(codes: dict) -> str:
    """/lab/'s age pills and curriculum list (gen_lab_index.filter_form), without its words field."""
    band_chips = '<button type="button" class="ui-chip" data-band="" aria-pressed="true">All ages</button>' + "".join(
        f'<button type="button" class="ui-chip" data-band="{b}" aria-pressed="false">Ages {b}</button>' for b in gen_lab_index.BANDS)
    groups = "".join(
        f'<optgroup label="{esc(label)}">' + "".join(f'<option value="{fw}:{esc(str(c))}">{esc(str(c))}: {esc(str(t))[:70]}</option>'
                                                     for c, t in (codes.get(fw) or {}).items()) + "</optgroup>" for fw, label in gen_lab_index.FRAMEWORKS)
    return ('<form class="lfilter" id="pfilter" role="search" aria-label="Filter the paths">'
            '<div class="lfilter__r"><p class="lfilter__k" id="pf-band">Age</p><div class="lfilter__v" role="group" aria-labelledby="pf-band">'
            + band_chips + '<input type="hidden" name="band" value=""></div></div>'
            '<div class="lfilter__r"><label class="lfilter__k" for="pf-code">Curriculum</label><div class="lfilter__v">'
            '<select class="ui-select ui-select--block" id="pf-code" name="code"><option value="">Any curriculum</option>' + groups + "</select></div></div>"
            "</form>")


def structured(paths: list[dict], sims: dict, labs: dict, host: str) -> str:
    url = f"{host}/{PAGE}"
    items = []
    for i, p in enumerate(paths, 1):
        node = {"@type": "LearningResource", "@id": f"{url}#{p['id']}", "url": f"{url}#{p['id']}", "name": p["name"],
                "description": p["say"], "learningResourceType": "Learning path", "isAccessibleForFree": True, "inLanguage": "en",
                "typicalAgeRange": age_range(bands_of(p, labs)),
                "hasPart": [{"@id": f"{host}/lab/{s}/index.html"} for s in p["sims"]]}
        items.append({"@type": "ListItem", "position": i, "item": node})
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "@id": url, "url": url, "name": TITLE, "description": DESC, "inLanguage": "en",
         "isPartOf": {"@id": f"{host}/#website"}, "mainEntity": {"@id": f"{url}#paths"}, "breadcrumb": {"@id": f"{url}#breadcrumb"}},
        {"@type": "ItemList", "@id": f"{url}#paths", "name": "Learning paths", "numberOfItems": len(paths), "itemListElement": items},
        {"@type": "BreadcrumbList", "@id": f"{url}#breadcrumb", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Space Radar", "item": f"{host}/"},
            {"@type": "ListItem", "position": 2, "name": "Lab", "item": f"{host}/lab/index.html"},
            {"@type": "ListItem", "position": 3, "name": "Learning paths"}]}]}
    return '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + "</script>"


def page(paths: list[dict], sims: dict, labs: dict, codes: dict, host: str) -> str:
    names = {p["id"]: p["name"] for p in paths}
    url = f"{host}/{PAGE}"
    sections = "\n".join(path_section(p, names, sims, labs) for p in paths)
    icon = ("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12.5' fill='%230B0E14'/>"
            "<circle cx='32' cy='32' r='14.38' fill='%232E6FB8'/></svg>")
    return f"""<!doctype html>
<!-- BUILT by scripts/seo_lab_paths.py from registry/lab-paths.yaml and registry/lab-levels.yaml. Do not edit. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(TITLE)}</title>
<meta name="description" content="{esc(DESC)}">
<link rel="canonical" href="{url}">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0b0e14">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Space Radar">
<meta property="og:title" content="{esc(TITLE)}">
<meta property="og:description" content="{esc(DESC)}">
<meta property="og:image" content="{host}/og/default.png">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{host}/og/default.png">
<link rel="icon" href="{icon}">
{styles("../../")}
<link rel="stylesheet" href="../../css/controls.css">
<style>
{gen_lab_index.LAB_CSS}{PATHS_CSS}</style>
{structured(paths, sims, labs, host)}
</head>
<body>
<a class="skip" href="#main">Skip to the content</a>
{header("../../", current="lab", subscribe="../index.html#subscribe")}
<main id="main" class="lab lpaths">
<header class="ph"><div class="wrap ph__in">
<p class="eyebrow">Space Radar Lab</p>
<h1>Learning paths</h1>
<p class="lead">{len(paths)} short paths through the Lab, each a few simulators in an order where every one builds on the last. Tick them off as you go: the ticks stay in this browser and are sent nowhere.</p>
</div></header>
<div class="wrap">
{filter_form(codes)}
<p id="pnone" hidden>No path holds a simulator for that age and curriculum. Try another, or see all the simulators.</p>
{sections}
<p id="lp-done" hidden>Ticked as done</p>
<p class="lp__note">The ages and curriculum codes are the Lab's own tags for each simulator: they say what a simulator shows, not that it covers a whole statement. <a href="../index.html">See all the simulators</a>.</p>
</div>
</main>
{footer("../../", url)}
<script>{CLIENT_JS}</script>
{subscribe_script("../../")}</body>
</html>
"""


def box(p: dict, slug: str, names: dict, sims: dict) -> str:
    """The aside one simulator carries for one path that holds it."""
    pid, rows = p["id"], p["sims"]
    i = rows.index(slug)
    if i + 1 < len(rows):
        nxt = rows[i + 1]
        go = (f'<a class="lpath__next" href="{esc(sim_url(nxt, pid))}"><p class="lpath__k">Next</p>'
              f'<p class="lpath__t">{esc(sims[nxt]["title"])}</p></a>')
    else:
        go = (f'<a class="lpath__next" href="../paths/index.html#{esc(pid)}"><p class="lpath__k">End of the path</p>'
              f'<p class="lpath__t">All the learning paths</p></a>')
    return (f'<aside class="lpath" id="lpath-{esc(pid)}" aria-labelledby="lpath-{esc(pid)}-h" hidden>\n'
            f'<p class="lpath__k">Learning path</p>\n'
            f'<h2 class="lpath__name" id="lpath-{esc(pid)}-h"><a href="../paths/index.html#{esc(pid)}">{esc(names[pid])}</a></h2>\n'
            f'<p class="lpath__step">Step {i + 1} of {len(rows)}</p>\n'
            f'<button type="button" class="ui-btn ui-btn--secondary lpath__done" aria-pressed="false" data-slug="{esc(slug)}">Mark as done</button>\n'
            f'{go}\n</aside>\n')


def with_boxes(text: str, boxes: list[str]) -> str:
    """A built simulator with its path boxes before </main>, controls.css in its head and the script before </body>."""
    if not boxes:
        return text
    if "</main>" not in text or "</head>" not in text or "</body>" not in text:
        raise SystemExit("seo_lab_paths: a simulator needs </head>, </main> and </body>")
    # Most simulators link the control set already (the heart, public #1472); one that does not gets it, marked, so
    # without_boxes() takes out only the link this added.
    if "css/controls.css" not in text:
        text = text.replace("</head>", '<link rel="stylesheet" href="../../css/controls.css" data-lpath>\n</head>', 1)
    # Under the controls, before the "what is and is not to scale" note: in view beside the picture on a desktop, and
    # straight after the controls on a phone. A simulator without the note gets it at the end of its main.
    at = '<p class="honest">' if '<p class="honest">' in text else "</main>"
    text = text.replace(at, "".join(boxes) + at, 1)
    i = text.rindex("</body>")
    return text[:i] + f"<script>{CLIENT_JS}</script>\n" + text[i:]


BOX = re.compile(r'<aside class="lpath" id="lpath-[a-z0-9-]+".*?</aside>\n', re.S)


def without_boxes(text: str) -> str:
    """A built simulator with the path boxes, their stylesheet link and the script taken out again: what tests/test_seo.py
    compares with the committed file (only the head and these hidden boxes may differ)."""
    text = BOX.sub("", text)
    text = text.replace('<link rel="stylesheet" href="../../css/controls.css" data-lpath>\n</head>', "</head>", 1)
    return text.replace(f"<script>{CLIENT_JS}</script>\n", "", 1)


def build(out: Path, host: str, site: Path | None = None) -> list[str]:
    """Write <out>/lab/paths/index.html and the boxes into the simulators seo_lab.py copied. Returns the pages for the
    sitemap. Call after seo_lab.build()."""
    site = site or ROOT / "site"
    paths = load()
    sims = {s["slug"]: s for s in gen_lab_index.simulators()}
    lv = gen_lab_index.levels()
    bad = problems(paths, sims, lv["labs"])
    if bad:
        raise SystemExit("registry/lab-paths.yaml: " + "; ".join(bad))
    names = {p["id"]: p["name"] for p in paths}
    dest = out / PAGE
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(page(paths, sims, lv["labs"], lv["codes"], host), encoding="utf-8")
    for slug in sims:
        boxes = [box(p, slug, names, sims) for p in paths if slug in p["sims"]]
        f = out / "lab" / slug / "index.html"
        if boxes and f.is_file():
            f.write_text(with_boxes(f.read_text(encoding="utf-8"), boxes), encoding="utf-8")
    return [PAGE]


def main(argv: list[str]) -> int:
    if "--out" in argv:
        out = Path(argv[argv.index("--out") + 1])
        import build_seo

        print("\n".join(build(out, build_seo.DEFAULT_HOST)))
        return 0
    paths = load()
    sims = {s["slug"]: s for s in gen_lab_index.simulators()}
    bad = problems(paths, sims, gen_lab_index.levels()["labs"])
    for b in bad:
        print(b, file=sys.stderr)
    if not bad:
        print(f"registry/lab-paths.yaml: {len(paths)} paths, {sum(len(p['sims']) for p in paths)} steps")
    return 1 if bad else 0


if __name__ == "__main__":
    from _cli import usage_if_asked
    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
