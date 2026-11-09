#!/usr/bin/env python3
"""The growth pages of release 2.0.0: the asset pack, the creators' page and five comparisons (forge #165, #166, #168).

    /assets/index.html  + /assets/pack.json        what Space Radar made itself, each file with its licence and a credit line
    /creators/index.html                           what footage may be used for, the exceptions, the media kit, the clip library
    /spaceengine-alternative-mac/ and four more    fair comparisons, in the manner of /nasa-eyes-alternative/

Built by scripts/seo_pages.py (through scripts/build_seo.py), which calls pages(host) and write(out). Every page is
generated from the registries, so it cannot drift from what ships:
  * /assets/ lists scripts/asset_pack.py's plan, which reads registry/models.yaml and textures.yaml and refuses a file
    whose inputs do not allow it; the files are linked where the app already serves them, never copied.
  * /creators/ reads every licence line in registry/asset_sources.yaml, sources.yaml, models.yaml (`data`) and
    textures.yaml and names each one with a non-commercial or science-only term (limits()), so the exceptions are the
    registry's and a new catalogue with such a term appears on the page the day it is added.
  * The comparisons say nothing about another product that is not in specs/0081-competitors/README.md (the review of
    7 November 2026) or on that product's own pages, each with its link and the day it was read; each page says
    plainly what the other product does that Space Radar does not. No logo, no screenshot of theirs, and no ranking
    word: tests/test_seo_reach.py refuses "best", "better" and "worse" in their text.

Nothing here is loaded by the app: these are static pages with plain links.
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import asset_pack  # noqa: E402
import creator_clips  # noqa: E402
import count_facts  # noqa: E402
from seo_common import ACCURACY_FORM, GITHUB, ON_GITHUB, ROOT, Page, esc, webpage  # noqa: E402
from seo_share import Spec  # noqa: E402

REG = ROOT / "registry"
SAMPLES = ROOT / "assets" / "creators"     # the sample stills, kept once in git (as assets/screenshots/ is for /press/)
CREDIT = "Space Radar (spaceradar.ai)"
READ = "7 November 2026"                    # the day the competitor review read every page cited below
SPEC = f"{GITHUB}/blob/main/CHANGELOG.md#200---2026-11-08"   # the review is summed up in the 2.0.0 notes; the spec itself is not public


def _yml(name: str) -> dict:
    return yaml.load((REG / name).read_text(encoding="utf-8"), Loader=getattr(yaml, "CSafeLoader", yaml.SafeLoader))


def languages() -> int:
    """English and every drafted language the app can load (site/js/copy/<xx>.js)."""
    return 1 + len([p for p in (ROOT / "site/js/copy").glob("*.js") if re.fullmatch(r"[a-z]{2}\.js", p.name) and p.name != "en.js"])


def plural(n: int, one: str, many: str) -> str:
    return f"{n:,} {one if n == 1 else many}"


# --- /assets/ -------------------------------------------------------------------------------------------------

def asset_row(x: dict, dates: dict[str, str]) -> str:
    size = f"{x['kb']:,.0f} kB" if isinstance(x.get("kb"), (int, float)) else ""
    px = f", {x['px'][0]} x {x['px'][1]} px" if x.get("px") else ""
    tris = f", up to {x['tris']:,} triangles" if x.get("tris") else ""
    day = f" · changed {dates[x['file']]}" if x["file"] in dates else ""
    app = f' · <a href="{esc(x["app"])}">See it in the app</a>' if x.get("app") else ""
    return (f'<li><h3><a href="{esc(x["url"])}">{esc(x["name"])}</a></h3>'
            f'<p>{esc(Path(x["file"]).suffix[1:])}, {size}{px}{tris} · <a href="{esc(x["licence_url"])}">{esc(x["licence"])}</a>{day}{app}</p>'
            f'<p class="credit"><span class="micro">Credit to paste</span> <code>{esc(x["credit"])}</code></p>'
            f'<p class="made">{esc(x["made"])}</p></li>')


def assets_page(host: str, plan: dict | None = None, dates: dict[str, str] | None = None) -> Page:
    p = plan if plan is not None else asset_pack.plan()
    files = p["models"] + p["maps"]
    dates = dates if dates is not None else asset_pack.changed_dates([x["file"] for x in files])
    newest = sorted((x for x in files if x["file"] in dates), key=lambda x: dates[x["file"]], reverse=True)[:12]
    n_m, n_t = len(p["models"]), len(p["maps"])
    short = f"Free 3D spacecraft models and maps: {n_m} glTF files"
    desc = (f"{n_m} glTF spacecraft models and {n_t} planetary relief and colour maps made by Space Radar, free to download, "
            "each with its licence and a credit line to paste.")
    by_class: dict[str, list[dict]] = {}
    for x in p["models"]:
        by_class.setdefault(x["class"] or "other", []).append(x)
    names = {"satellite": "Satellites", "telescope": "Telescopes", "station": "Stations and crew craft", "probe": "Probes",
             "site": "Landers and rovers", "rocket": "Rockets and stages", "other": "Other craft"}
    sections = "".join(
        f'<h3 class="group">{esc(names.get(k, k.title()))} ({len(v)})</h3><ul class="assets">'
        + "".join(asset_row(x, dates) for x in sorted(v, key=lambda r: r["name"].lower())) + "</ul>\n"
        for k, v in sorted(by_class.items(), key=lambda kv: list(names).index(kv[0]) if kv[0] in names else 99))
    maps = '<ul class="assets">' + "".join(asset_row(x, dates) for x in p["maps"]) + "</ul>\n"
    log = "".join(f'<li>{esc(dates[x["file"]])}: <a href="{esc(x["url"])}">{esc(x["name"])}</a></li>' for x in newest)
    elsewhere = "".join(f'<li><a href="{esc(o["url"])}">{esc(o["what"])}</a>: {plural(o["files"], "file", "files")} the app uses</li>'
                        for o in p["others"])
    refused = "".join(f"<li>{esc(r['name'])}: {esc(r['why'])}.</li>" for r in p["refused"])
    proc = p["procedural"]
    body = (
        '<p class="micro">Asset pack</p>\n<h1>Free 3D spacecraft models and planetary maps</h1>\n'
        f'<p class="lead">Everything here was made by Space Radar: {n_m} spacecraft models built from published dimensions and photographs, '
        f"and {n_t} relief and colour maps baked from public-domain spacecraft data. Download them, use them in a game, a film, a print or a "
        "lesson, commercial work included, with the credit line under each one.</p>\n"
        '<div class="cta"><a class="live" href="pack.json">The whole list as JSON</a><p>Each file is served from where the app loads it; nothing is a second copy.</p></div>\n'
        "<h2>How the licences are chosen</h2>\n"
        "<ul>\n"
        "<li><strong>Models: CC BY 4.0.</strong> The shapes are this project's work. The photographs they were compared with were looked at, "
        "never traced or put in a file, so their licences do not travel with the model. A model generated from a picture is offered only when "
        "that picture is public domain.</li>\n"
        "<li><strong>Maps: CC0, public domain.</strong> Each is baked from elevation models or mosaics that NASA, USGS or NOAA put in the public "
        "domain, and the project waives its own part, so public domain is the honest word.</li>\n"
        "<li><strong>Nothing else.</strong> A file with a non-commercial, no-derivatives or share-alike term in its inputs is left out, with the "
        "reason below.</li>\n"
        "</ul>\n"
        "<p>The models are glTF 2.0 binaries (.glb) compressed with meshopt (EXT_meshopt_compression), with flat colours and no textures: "
        'three.js reads them with GLTFLoader and its MeshoptDecoder; Blender reads them after <code>gltf-transform decompress</code>. '
        "Measured is what the dimensions say; modelled is how the parts in between were drawn. Each entry says how it was made.</p>\n"
        "<h2>Spacecraft models</h2>\n" + sections +
        "<h2>Relief and colour maps</h2>\n" + maps +
        "<h2>Procedural shapes</h2>\n"
        f'<p>{proc["count"]} class shapes (a CubeSat, a Starlink, a navigation satellite, a rocket stage) are built in code, not loaded from a file: '
        f'<a href="{esc(proc["url"])}">site/js/scene/models.js</a>, under the MIT licence. Credit: <code>{esc(proc["credit"])}</code>.</p>\n'
        "<p>The live cloud pictures are composited in each visitor's browser from NASA's newest geostationary images (GIBS), so there is no "
        "file to offer; NASA's own pages have the originals.</p>\n"
        + (f"<h2>New and changed</h2>\n<p>The files most recently changed, from the project's history.</p>\n<ul>{log}</ul>\n" if log else "")
        + "<h2>Not ours: get these from their makers</h2>\n"
        "<p>The app also uses maps and models that others made. They are theirs to license and are not offered here.</p>\n"
        f'<ul class="links">{elsewhere}</ul>\n'
        + (f"<h2>Left out, and why</h2>\n<ul>{refused}</ul>\n" if refused else "")
        + "<h2>How this page is made</h2>\n"
        f'<p>It is generated on every deploy from the project\'s registries by <a href="{GITHUB}/blob/main/scripts/asset_pack.py">scripts/asset_pack.py</a>, '
        f'so it lists exactly what ships. A wrong credit or licence? <a href="{ACCURACY_FORM}">Tell us</a> {ON_GITHUB}.</p>\n')
    page = Page(path="assets/index.html", title=short, description=desc, body=body, og_title=short)
    page.jsonld = [webpage(host, page, [("Asset pack", "")], page_type="CollectionPage")]
    page.share = Spec(key="assets/index", name="Free 3D spacecraft models", number=f"{n_m} glTF files, CC BY 4.0", caption="Asset pack", kind="plain",
                      colour="#7bd389", alt="Rings and a dot, captioned Free 3D spacecraft models.")
    return page


# --- /creators/ -----------------------------------------------------------------------------------------------

LIMIT_TERMS = (
    (re.compile(r"\bNC\b|non-?commercial", re.I), "a non-commercial term"),
    (re.compile(r"scientific (?:use|context|purpose)", re.I), "scientific use"),
)


def limits(asset_sources: dict | None = None, sources: dict | None = None, models: dict | None = None,
           textures: dict | None = None) -> list[dict]:
    """Every registry row whose licence limits commercial use: {what, term, licence, registry}, one per row.

    Read from the licence line itself, never from a list typed here, so a catalogue added tomorrow with such a term is
    named on /creators/ the day it ships. The 3D models' rows are not read: the pictures they name were looked at and
    are in no file (scripts/asset_pack.py says why)."""
    asset_sources = asset_sources if asset_sources is not None else _yml("asset_sources.yaml")
    sources = sources if sources is not None else _yml("sources.yaml")
    models = models if models is not None else _yml("models.yaml")
    textures = textures if textures is not None else _yml("textures.yaml")
    found: list[dict] = []

    def look(what: str, lic: str, reg: str) -> None:
        for rx, term in LIMIT_TERMS:
            if rx.search(lic or ""):
                found.append({"what": what, "term": term, "licence": lic, "registry": reg})
                return

    for r in asset_sources.get("sources") or []:
        look(str(r.get("name") or r.get("id")), str(r.get("licence") or ""), "registry/asset_sources.yaml")
    for r in sources.get("sources") or []:
        look(str(r.get("attribution") or r.get("id")), str(r.get("licence") or ""), "registry/sources.yaml")
    for r in models.get("data") or []:
        look(str(r.get("credit") or r.get("id")), str(r.get("licence") or ""), "registry/models.yaml")
    for r in textures.get("textures") or []:
        for f in r.get("files") or []:
            look(str(f.get("credit") or r.get("id")), str(f.get("licence") or ""), "registry/textures.yaml")
    return found


def attribution_credits(textures: dict | None = None, models: dict | None = None) -> list[str]:
    """The third parties whose CC BY or CC BY-SA terms ask for their name beside a picture that shows their work."""
    textures = textures if textures is not None else _yml("textures.yaml")
    models = models if models is not None else _yml("models.yaml")
    names: list[str] = []
    rows = [(f.get("licence"), f.get("credit")) for r in textures.get("textures") or [] for f in r.get("files") or []]
    rows += [(r.get("licence"), r.get("credit")) for r in models.get("data") or []]
    for lic, credit in rows:
        if re.match(r"CC BY(-SA)? \d", str(lic or "")) and credit:
            who = str(credit).split(":", 1)[-1].strip()
            who = re.sub(r",\s*CC BY[^),;]*|\s*\(CC BY[^)]*\)", "", who).strip()  # the licence is said once, by the paragraph
            if who and who not in names:
                names.append(who)
    return names


def samples() -> list[Path]:
    return sorted(SAMPLES.glob("*.webp")) if SAMPLES.is_dir() else []


def creators_page(host: str) -> Page:
    found = limits()
    credits = attribution_credits()
    trips = creator_clips.trips()
    moments = creator_clips.moments()
    jobs = creator_clips.plan(trips)
    short = "Use Space Radar footage in your videos: free, with credit"
    desc = ("Use Space Radar footage in videos, streams and books, commercial ones too, with the credit "
            "Space Radar (spaceradar.ai). The exceptions, a media kit, clips.")
    exc = "".join(f"<li><strong>{esc(x['what'])}</strong> ({esc(x['term'])}): {esc(x['licence'])}</li>" for x in found)
    attrib = "; ".join(esc(c) for c in credits[:8])
    pics = "".join(f'<figure><a href="{esc(s.name)}"><img src="{esc(s.name)}" alt="{esc(s.stem.replace("-", " "))}, a still from Space Radar" '
                   f'loading="lazy" width="640" height="360"></a><figcaption>{esc(s.stem.replace("-", " ").capitalize())}</figcaption></figure>'
                   for s in samples())
    clips = "".join(f'<li>{esc(j["title"])} <span class="micro">made at release</span></li>' for j in jobs)
    body = (
        '<p class="micro">For creators</p>\n<h1>Use Space Radar footage in your videos</h1>\n'
        f'<p class="lead">You may use any footage, still or recording from Space Radar in your videos, streams, posts, books, lessons and talks, '
        f'<strong>commercial ones included</strong>, with this credit: <code>{CREDIT}</code>. No account, no fee and no need to ask.</p>\n'
        '<div class="cta"><a class="live" href="../">Open Space Radar</a><p>In the app: Share, then Record, to film a view, a flight path or a trip.</p></div>\n'
        "<h2>The credit</h2>\n"
        f"<p>Put <code>{CREDIT}</code> on screen or in the description. Where planets, moons or stars fill the frame, add the makers of their maps "
        f"and catalogues, whose licences ask for it: {attrib}.</p>\n"
        "<p>Please caption Space Radar pictures as drawings from measured positions, not photographs, and do not suggest that NASA, ESA or "
        "any other agency made or endorses your video: Space Radar is not part of any of them.</p>\n"
        "<h2>The exceptions</h2>\n"
        "<p>A few catalogues the app draws are licensed for non-commercial or scientific use only. If one of these fills your frame and your "
        "work is commercial, leave that view out or ask the catalogue's owner. Read from the project's registries when this page was built:</p>\n"
        f"<ul>{exc}</ul>\n"
        "<p>Everything else on screen is the project's own work (MIT), public domain, CC0, CC BY or CC BY-SA data whose credit is above, or "
        'NASA media, which NASA does not copyright. Every source and its licence is in the <a href="../sources/index.html">sources</a> and in '
        f'<a href="{GITHUB}/blob/main/CREDITS.md">CREDITS.md</a>. This is how the project reads those licences, not legal advice.</p>\n'
        "<h2>Media kit</h2>\n"
        '<ul class="links"><li><a href="../press/space-radar-mark.svg">The mark (SVG)</a></li>'
        '<li><a href="../press/space-radar-wordmark.svg">The wordmark, for dark backgrounds (SVG)</a></li>'
        '<li><a href="../press/space-radar-wordmark-on-light.svg">The wordmark, for light backgrounds (SVG)</a></li>'
        '<li><a href="../press/index.html">Screenshots and the description to copy, on the press page</a></li>'
        '<li><a href="../assets/index.html">Free 3D models and maps for your own scenes</a></li></ul>\n'
        "<p>One paragraph, to copy: <q>Space Radar is a free, open-source 3D map of space in the browser. It shows the satellites, the space "
        "station, the planets, the nearest stars and the galaxies where they really are, worked out from public data, and says what is "
        "measured and what is illustrative.</q></p>\n"
        "<h2>The clip library</h2>\n"
        "<p>Each release, a job films every guided trip in 4K (3840 x 2160, 30 frames a second, with captions) in render mode: the app runs "
        "on a clock that moves one frame at a time, so no frame is dropped however slow the machine. "
        f'The job is <a href="{GITHUB}/blob/main/scripts/creator_clips.py">scripts/creator_clips.py</a>, which runs '
        f'<a href="{GITHUB}/blob/main/tools/render-trip.mjs">tools/render-trip.mjs</a> once a trip.</p>\n'
        + (f'<h3 class="group">Samples</h3>\n<p>Stills from the app with every panel hidden, 1280 x 720, made on 7 November 2026. Credit: '
           f"<code>{CREDIT}</code>, with the planet maps' makers (Solar System Scope, CC BY 4.0, or NASA), as the app's Sources panel lists them.</p>\n"
           f'<div class="shots">{pics}</div>\n' if pics else "")
        + f'<h3 class="group">The {len(jobs)} trips</h3>\n<ul class="cols">{clips}</ul>\n'
        f"<p>The {len(moments)} Moments (Apollo 11, Sputnik 1 and the others) are not trips and are not filmed by the job; record them with "
        "the Record button, which films them live.</p>\n"
        "<h2>Questions</h2>\n"
        f'<p>Ask on <a href="{GITHUB}/discussions">GitHub Discussions</a>. A credit that is wrong? <a href="{ACCURACY_FORM}">Tell us</a> {ON_GITHUB}.</p>\n')
    page = Page(path="creators/index.html", title=short, description=desc, body=body, og_title=short)
    page.jsonld = [webpage(host, page, [("For creators", "")])]
    page.share = Spec(key="creators/index", name="Use Space Radar footage", number="free, with credit", caption="For creators", kind="plain",
                      colour="#ff9f43", alt="Rings and a dot, captioned Use Space Radar footage.")
    return page


# --- the comparisons ------------------------------------------------------------------------------------------

SE_FAQ = "https://spaceengine.org/manual/faq/"
SE_SITE = "https://spaceengine.org/"
SE_STEAM = "https://store.steampowered.com/app/314650/SpaceEngine/"
SE_PRO = "https://store.steampowered.com/app/1026970/SpaceEngine_PRO"
SSS_SITE = "https://www.solarsystemscope.com/"
SSS_PLAY = "https://play.google.com/store/apps/details?id=air.com.eu.inove.sss2"
SSS_APPLE = "https://apps.apple.com/us/app/id863969175"
COSMO_SITE = "https://cosmoscope.space/"
COSMO_SAT = "https://cosmoscope.space/live-satellite-tracker"
COSMOSMAP = "https://cosmosmap.org/"


def first_load() -> str:
    """The live site's first load as registry/first-load.yaml measured it (forge #170, docs/FIRST_LOAD.md), with its day."""
    rows = {r["id"]: r for r in _yml("first-load.yaml").get("measurements") or []}
    live = rows.get("live")
    if not live:
        raise SystemExit("seo_reach: registry/first-load.yaml has no `live` measurement to quote")
    day = str(live["day"])
    y, m, d = (int(x) for x in day.split("-"))
    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    return f"about {live['bytes'] / 1e6:.1f} MB (measured {d} {months[m - 1]} {y})"


def satellites(counts: dict | None = None) -> str:
    """"about 17,000", rounded from the saved catalogue's count: the harvester's index at deploy, else registry/seo-facts.yaml.

    It counts the ACTIVE satellites (CelesTrak's active group), so the pages say "active satellites": "tracked objects" read as
    every catalogued thing in orbit, which Find counts with the debris, about twice as many (2.0.0 look finding 15).

    `counts` is scripts/seo_pages.py satellite_counts(), which reads both; without it (a test) the registry's fallback."""
    n = (counts or {}).get("active") or _yml("seo-facts.yaml")["satellite_counts"]["active_objects"]
    return f"about {round(n / 1000) * 1000:,}"


def us(counts: dict | None = None) -> dict:
    """Every count of ours these pages state, read at build time: never typed here, because other batches add trips."""
    f = count_facts.facts()
    return {"trips": f["trips"], "stops": f["stops"], "systems": f["star_systems"], "layers": f["layers"], "sources": f["sources"],
            "languages": languages(), "satellites": satellites(counts), "first": first_load()}


def table(head: tuple[str, str], rows: list[tuple[str, str, str]]) -> str:
    cells = "".join(f'<tr><th scope="row">{a}</th><td>{b}</td><td>{c}</td></tr>' for a, b, c in rows)
    return (f'<div class="tablewrap"><table><thead><tr><th></th><th>{head[0]}</th><th>{head[1]}</th></tr></thead>'
            f"<tbody>{cells}</tbody></table></div>\n")


def checked(sources: list[tuple[str, str]], who: str) -> str:
    links = ", ".join(f'<a href="{u}">{esc(t)}</a>' for t, u in sources)
    return ("<h2>How this page was checked</h2>\n"
            f"<p>What it says about {esc(who)} was read on {READ} from {links}, in the project's "
            f'<a href="{SPEC}">competitor review</a>. Products change: if something here is out of date, '
            f'<a href="{ACCURACY_FORM}">tell us</a> {ON_GITHUB} and it will be corrected. Space Radar is not connected with {esc(who)}, '
            "and the names are their makers' trademarks.</p>\n")


def compare_page(host: str, path: str, short: str, desc: str, h1: str, lead: str, head: tuple[str, str], rows: list[tuple[str, str, str]],
                 theirs: tuple[str, list[str]], ours: tuple[str, list[str]], sources: list[tuple[str, str]], who: str, share_name: str) -> Page:
    """One comparison. `theirs` and `ours` are (heading, items): what the other does that Space Radar does not comes first."""
    body = (
        f'<p class="micro">Compare</p>\n<h1>{h1}</h1>\n<p class="lead">{lead}</p>\n'
        '<div class="cta"><a class="live" href="../">Open Space Radar</a><p>Free, in the browser, no account.</p></div>\n'
        "<h2>Side by side</h2>\n" + table(head, rows)
        + f"<h2>{theirs[0]}</h2>\n<ul>" + "".join(f"<li>{x}</li>" for x in theirs[1]) + "</ul>\n"
        + f"<h2>{ours[0]}</h2>\n<ul>" + "".join(f"<li>{x}</li>" for x in ours[1]) + "</ul>\n"
        + checked(sources, who))
    page = Page(path=f"{path}/index.html", title=short, description=desc, body=body, og_title=short)
    page.jsonld = [webpage(host, page, [(share_name, "")])]
    page.share = Spec(key=f"{path}/index", name=share_name, number="a fair comparison", caption="Compare", kind="plain",
                      colour="#ff9f43", alt=f"Rings and a dot, captioned {share_name}.")
    return page


# The comparisons' paths, in the order they are built: tests/test_seo_reach.py and seo_pages.py's dirs list read it.
COMPARISONS = ("spaceengine-alternative-mac", "spaceengine-in-the-browser", "space-simulator-on-phone",
               "solar-system-scope-alternative", "live-satellite-tracker-3d")


def comparison_pages(host: str, counts: dict | None = None) -> list[Page]:
    """Every claim about another product below is in the competitor review (SPEC) or on the page each `checked` links.

    Release 2.0.0 itself brought gamepad flight, a headset mode, video, dome and 360 output, spinning-hole shadows,
    landing sites to stand at and paper globes, so none of those is listed as another product's alone: what is listed
    is what it still does that Space Radar does not, or does more deeply (the coordinator's fairness review)."""
    n = us(counts)
    open_src = f'Open source (<a href="{GITHUB}">GitHub</a>, MIT)'
    first = n["first"]
    sats = n["satellites"]
    se_does = ("What SpaceEngine does that Space Radar does not, or does more deeply", [
        "Landing anywhere on procedural worlds, across a whole universe filled in where the catalogues end.",
        "Newtonian spaceship flight, with docking.",
        "VR through SteamVR, drawn by a PC's graphics card.",
        "Ray-traced black holes with volumetric disks; Space Radar's spinning holes are an approximation, labelled modelled.",
        "18 languages, and a large community: about 16,000 Steam reviews and a Discord of about 13,400.",
        "The other side of it: SpaceEngine draws all this on a Windows PC with a dedicated graphics card; Space Radar does less, in a browser, "
        "on whatever device is to hand."])
    se_ours = ("What Space Radar does that SpaceEngine does not", [
        f"Live satellites: {sats} active satellites placed from their orbital elements for the moment on the clock. SpaceEngine has none built in.",
        "Sky events from where you stand: eclipses with their shadow paths, meteor showers, conjunctions, rise and set times.",
        f"{n['trips']} narrated guided trips ({n['stops']} stops) with captions.",
        "No invented worlds: everything drawn is a real object, labelled measured, modelled or illustrative, with its source.",
        "Free and open source, in a browser on a Mac, a phone or a Chromebook, with nothing to install."])
    se_sources = [("SpaceEngine's FAQ", SE_FAQ), ("its Steam page", SE_STEAM), ("SpaceEngine PRO's Steam page", SE_PRO)]
    return [
        compare_page(
            host, COMPARISONS[0], "A SpaceEngine alternative for Mac, in the browser",
            "SpaceEngine runs on Windows. Space Radar is a free, open-source 3D space map that runs in Safari or Chrome on a Mac. What each one does.",
            "A SpaceEngine alternative for the Mac",
            "SpaceEngine is a Windows program: its Steam page lists Windows only. Space Radar is a free 3D map of space that opens in a browser on a Mac, "
            "from the satellites overhead to the nearest galaxies. They do different things, and this page says which.",
            ("SpaceEngine", "Space Radar"),
            [("Runs on", "Windows, with a GTX 1050 Ti graphics card or faster and up to 50 GB on disk", "Any current browser: macOS, Windows, Linux, iOS, Android"),
             ("Price", "$29.99, and $69.99 for PRO", "Free; no account, no advertising"),
             ("What it shows", "A universe sandbox: real catalogues plus procedural planets and stars", "Real objects only: satellites, planets, moons, stars, galaxies"),
             ("Live data", "None built in (users add satellites with mods)", f"{n['sources']} public sources, read live"),
             ("Source code", "Closed", open_src)],
            se_does, se_ours, se_sources, "SpaceEngine", "SpaceEngine and Space Radar on a Mac"),
        compare_page(
            host, COMPARISONS[1], "SpaceEngine in the browser? A free 3D space map",
            "SpaceEngine has no browser version. Space Radar is a free 3D map of space that runs in a web page. What each does, side by side.",
            "SpaceEngine in a browser",
            "SpaceEngine is installed on a Windows PC, and neither its FAQ nor its Steam page offers a browser version. Space Radar is a 3D map of space "
            "that runs in a web page, on a phone or a computer. It is not SpaceEngine, and this page says plainly where each one leads.",
            ("SpaceEngine", "Space Radar"),
            [("How you open it", "Install from Steam on Windows (up to 50 GB)", f"Open a web page; first load {first}"),
             ("Graphics", "A GTX 1050 Ti graphics card or faster", "WebGL, which every current browser has; no WebGPU needed"),
             ("Price", "$29.99, PRO $69.99", "Free"),
             ("Sharing a view", "se:// links, which open for owners", "A link that reopens the whole view, for anyone")],
            se_does, se_ours, se_sources, "SpaceEngine", "SpaceEngine and Space Radar in a browser"),
        compare_page(
            host, COMPARISONS[2], "A 3D space simulator on your phone, free, no app",
            "Which 3D space maps run on a phone: SpaceEngine, Solar System Scope, Cosmoscope, CosmosMap and Space Radar, from their own pages.",
            "A space simulator on a phone",
            "Most 3D space programs are built for a desktop. This page sets out which run on a phone, from each one's own pages as read on "
            f"{READ}. Space Radar runs in a phone's browser with WebGL and needs no app store.",
            ("On a phone", "Read from"),
            [("SpaceEngine", "No: its FAQ rules out a mobile version", f'<a href="{SE_FAQ}">SpaceEngine\'s FAQ</a>'),
             ("Solar System Scope", "Yes, as apps for iOS and Android (10 million+ installs on Google Play); its web version is for desktops",
              f'<a href="{SSS_PLAY}">Google Play</a>, <a href="{SSS_APPLE}">App Store</a>'),
             ("Cosmoscope", "In a browser with WebGL2; about 36 MB on first load", f'<a href="{COSMO_SITE}">cosmoscope.space</a>'),
             ("CosmosMap", "WebGPU only, which many Android phones lack; an iPad app", f'<a href="{COSMOSMAP}">cosmosmap.org</a>'),
             ("Space Radar", f"In the phone's browser with WebGL and touch; first load {first}; can be added to the home screen", "This project")],
            ("What the others do that Space Radar does not", [
                "Solar System Scope's apps are in 19 languages, with a VR app.",
                "Cosmoscope draws millions of stars in 3D and the asteroid belt at catalogue scale.",
                "CosmosMap has a lab of 184 science simulations, and wider sets of planetary terrain to walk on than Space Radar's landing sites.",
                "SpaceEngine, on a PC, lets you land anywhere on procedural worlds."]),
            ("What Space Radar does on a phone", [
                "Live satellites and the space station, with the passes over your place.",
                "Tonight's sky events: eclipses, meteor showers, conjunctions.",
                f"{n['trips']} narrated trips and {n['languages']} languages (machine-drafted, under review), and a copy that runs offline.",
                "Free and open source, with no app store and no account."]),
            [("SpaceEngine's FAQ", SE_FAQ), ("Solar System Scope", SSS_SITE), ("its Google Play page", SSS_PLAY), ("Cosmoscope", COSMO_SITE),
             ("CosmosMap", COSMOSMAP)],
            "SpaceEngine, Solar System Scope, Cosmoscope or CosmosMap", "Space simulators on a phone"),
        compare_page(
            host, COMPARISONS[3], "A Solar System Scope alternative: free, open source",
            "Solar System Scope and Space Radar side by side: two 3D maps of space. What each shows, where it runs and what it costs, from their own pages.",
            "Space Radar and Solar System Scope",
            "Solar System Scope is a 3D orrery, night sky and encyclopedia, with apps for iOS and Android and widely used free planet textures, which "
            "Space Radar uses too. Space Radar is a free, open-source map that adds what is overhead right now. Many people will want both.",
            ("Solar System Scope", "Space Radar"),
            [("Who makes it", "INOVE", f'An open-source project on <a href="{GITHUB}">GitHub</a>'),
             ("Where it runs", "Apps for iOS and Android; the web version is for desktops", "Any current browser, phones included"),
             ("Price", "Web free; $5.99 in the app to remove ads; desktop $9.80", "Free; no advertising"),
             ("Satellites", "Three spacecraft", f"{sats.capitalize()} active satellites, live"),
             ("Languages", "19", f"{n['languages']} (machine-drafted, under review)")],
            ("What Solar System Scope does that Space Radar does not", [
                "Native apps for iOS and Android, used by millions (10 million+ installs and 4.4 stars on Google Play).",
                "Nineteen languages, and a VR app.",
                "CC BY 4.0 planet textures that much of the web uses, Space Radar included."]),
            ("What Space Radar does that Solar System Scope does not", [
                f"Live satellites, launches and the space station, placed for the moment on the clock: {sats} active satellites against three craft.",
                "Sky events from your place, with the times.",
                f"{n['trips']} narrated trips and {n['systems']} exoplanet systems to fly into.",
                "Open source, with every number's source."]),
            [("Solar System Scope", SSS_SITE), ("its Google Play page", SSS_PLAY), ("its App Store page", SSS_APPLE)],
            "Solar System Scope", "Space Radar and Solar System Scope"),
        compare_page(
            host, COMPARISONS[4], "Live satellite tracker in 3D, free, in the browser",
            f"Track {sats} satellites live in 3D in your browser, with the passes over your place. How it compares with Cosmoscope's 3D tracker.",
            "A live satellite tracker in 3D",
            f"Space Radar places {sats} active satellites in 3D for the moment on the clock, from public orbital elements, "
            "and ranks which will pass over you, with Starlink trains, a debris census and re-entries. Cosmoscope also draws about 16,900 live "
            "satellites in 3D. Here is what each does.",
            ("Cosmoscope", "Space Radar"),
            [("Satellites drawn", "About 16,900", f"{sats.capitalize()} active ones, each with a card and its source"),
             ("Sky events", "Five fixed presets", "Eclipses, meteor showers, conjunctions, rise and set, from your place"),
             ("First load", "About 36 MB", first),
             ("Languages", "English", f"{n['languages']} (machine-drafted, under review)")],
            ("What Cosmoscope does that Space Radar does not", [
                "Millions of stars in 3D (2.4 million from ATHYG, 7.8 million from Gaia).",
                "The asteroid belt, the Trojans and the outer bodies at catalogue scale, on a true-scale map out to the Virgo cluster.",
                "Descending to the ground anywhere on Mars, where Space Radar stands only at its landing sites."]),
            ("What Space Radar does that Cosmoscope does not", [
                "Sky events computed for your place, against Cosmoscope's five presets.",
                f"{n['trips']} guided trips read aloud, with captions.",
                f"{n['languages']} languages; Cosmoscope is in English."]),
            [("Cosmoscope", COSMO_SITE), ("its live satellite tracker", COSMO_SAT)],
            "Cosmoscope", "Live satellite trackers in 3D"),
    ]


# --- the door seo_pages.py uses ---------------------------------------------------------------------------------

def pages(host: str, counts: dict | None = None) -> list[Page]:
    """`counts`: scripts/seo_pages.py satellite_counts(), so the comparisons quote the saved catalogue the deploy read."""
    return [assets_page(host), creators_page(host)] + comparison_pages(host, counts)


def write(out: Path) -> None:
    """Beside the pages: the pack's list (assets/pack.json) and the sample stills (creators/*.webp)."""
    p = asset_pack.plan()
    dates = asset_pack.changed_dates([x["file"] for x in p["models"] + p["maps"]])
    (out / "assets").mkdir(parents=True, exist_ok=True)
    (out / "assets" / "pack.json").write_text(json.dumps(asset_pack.manifest(p, dates), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    (out / "creators").mkdir(parents=True, exist_ok=True)
    for s in samples():
        shutil.copyfile(s, out / "creators" / s.name)


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    print("seo_reach.py is built through scripts/build_seo.py --out DIR", file=sys.stderr)
    sys.exit(2)
