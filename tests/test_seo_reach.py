#!/usr/bin/env python3
"""The asset pack, the creators' page and the five comparisons (forge #165, #166, #168; scripts/asset_pack.py, seo_reach.py, creator_clips.py).

    python3 tests/test_seo_reach.py

Held, each by a case that fails when the thing it guards is broken:

  the pack's licences  a built model is CC BY 4.0 only when its row says the shape is ours and no picture is in the file;
                       one generated from a picture only when that picture is public domain; a baked map is CC0 only when
                       every input is public domain or CC0; NC, ND, SA and the refused authors are refused, with the reason
  the pack itself      no Solar System Scope file and no NASA model is offered as ours; every offered file exists and is
                       linked where the app serves it (no copy); every entry carries a credit line naming Space Radar
  the creators' page   commercial use stated with the credit; each registry row with a non-commercial or science-only
                       licence is named (read from the licence lines, so a fake row appears); the media kit's files exist;
                       the clip library is the registry's trips, "made at release", and the Moments are not called clips
  the comparisons      five pages, each in the sitemap's lengths, each saying what the other product does that Space Radar
                       does not, each dated and linking its sources; no "best", "better" or "worse"; no picture of theirs
  the release job      creator_clips.plan makes one render-trip command a trip and refuses a bad resolution
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import asset_pack  # noqa: E402
import creator_clips  # noqa: E402
import seo_reach  # noqa: E402
from seo_common import esc, make_ctx, render  # noqa: E402

problems: list[str] = []
HOST = "https://www.spaceradar.ai"


def check(ok: bool, msg: str) -> None:
    if not ok:
        problems.append(msg)


def plain(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))


# --- the pack's licences, on rows made up for the test -----------------------------------------------------------
own = {"kind": "built-from-dimensions", "licence": "The shape is this project's, under this repository's licence. Nothing of them is in the file; the photographs are CC BY-SA 4.0."}
check(asset_pack.licence_of(own)[0] == "CC BY 4.0", "a built shape whose row says no picture is in it is CC BY 4.0 (the SA picture was only looked at)")
check(asset_pack.licence_of({"kind": "built-from-dimensions", "licence": "Built from photographs."})[2] != "", "a built row that does not say the shape is ours is refused")
gen = {"kind": "derived-from-images", "licence": "Public domain (the NASA photograph); the cleaning is this project's, under this repository's licence"}
check(asset_pack.licence_of(gen)[0] == "CC BY 4.0", "a model generated from a public-domain picture is offered")
check(asset_pack.licence_of({**gen, "licence": "CC BY-SA 4.0 (the photograph); the cleaning is this project's"})[2] != "", "one generated from a share-alike picture is refused")
check(asset_pack.licence_of({"kind": None, "origin": "official", "licence": "Public domain"})[2] == "not built by this project", "NASA's own model is not ours")
check(asset_pack.texture_licence('Public domain: "USGS-authored data"')[0].startswith("CC0"), "a map from public-domain data is CC0")
check(asset_pack.texture_licence('CC0 1.0: "NOAA waives"')[0].startswith("CC0"), "a map from CC0 data is CC0")
for lic, word in (("CC BY-NC 3.0 IGO", "non-commercial"), ("CC BY-ND 4.0", "no-derivatives"), ("CC BY-SA 4.0", "share-alike"), ("CC BY 4.0", "not public domain")):
    check(word in asset_pack.texture_licence(lic)[2], f"a map under {lic} is refused: {word}")
check(asset_pack.name_of("change-3") == "Chang'e 3" and asset_pack.name_of("tiangong") == "Tiangong (core module)" and asset_pack.name_of("abc-12") == "Abc 12", "names")
check(asset_pack.app_link({"used_for": "NORAD 20580 (HST), by id"}) == f"{HOST}/#at=sat-20580" and asset_pack.app_link({"used_for": "a lander"}) == "", "the link back")

# --- the pack itself ---------------------------------------------------------------------------------------------
plan = asset_pack.plan()
offered = plan["models"] + plan["maps"]
check(len(plan["models"]) >= 150 and len(plan["maps"]) >= 8, f"the pack: {len(plan['models'])} models, {len(plan['maps'])} maps")
for x in offered:
    check((ROOT / x["file"]).is_file(), f"{x['id']}: the file is in the tree")
    check(x["url"] == f"{HOST}/{x['file'][len('site/'):]}", f"{x['id']}: linked where the app serves it, not copied")
    check(x["credit"].startswith(f"{x['name']}: Space Radar (spaceradar.ai), "), f"{x['id']}: a credit line to paste")
    check("solarsystemscope" not in x["file"] and "Solar System Scope" not in x["credit"], f"{x['id']}: no Solar System Scope map offered as ours")
models_doc = asset_pack._yml("models.yaml")
nasa = {r["file"] for r in models_doc["real_models"] if r.get("kind") not in asset_pack.OWN_MODEL_KINDS}
check(not ({x["file"] for x in offered} & nasa), "no agency's own model is offered as ours")
check(any(o["key"] == "solarsystemscope" and o["files"] > 0 and o["url"].startswith("https://www.solarsystemscope.com") for o in plan["others"]),
      "Solar System Scope is linked as the maker of its maps")
man = asset_pack.manifest(plan, {offered[0]["file"]: "2026-11-07"})
check(len(man["files"]) == len(offered) and man["files"][0].get("changed") == "2026-11-07" and json.dumps(man), "pack.json lists every file, with the day it changed")

pages = {p.path: p for p in seo_reach.pages(HOST)}
assets = pages["assets/index.html"]
check(assets.body.count("<li><h3>") == len(offered), "the page lists every offered file")
check("CC BY 4.0" in assets.body and "CC0" in assets.body and "solarsystemscope.com/textures" in assets.body, "the page names both licences and links Solar System Scope")

# --- the creators' page --------------------------------------------------------------------------------------------
cre = pages["creators/index.html"]
text = plain(cre.body)
check("commercial ones included" in text and "Space Radar (spaceradar.ai)" in text, "commercial use, with the credit")
for x in seo_reach.limits():
    check(esc(x["licence"]) in cre.body, f"the exception is named: {x['what']}")
found = {x["what"] for x in seo_reach.limits()}
check(any("Gaia" in w for w in found) and any("VizieR" in w for w in found), "the Gaia and VizieR terms are among the exceptions")
fake = seo_reach.limits({"sources": [{"name": "A test catalogue", "licence": "CC BY-NC-SA 4.0"}]}, {"sources": []}, {"data": []}, {"textures": []})
check(fake == [{"what": "A test catalogue", "term": "a non-commercial term", "licence": "CC BY-NC-SA 4.0", "registry": "registry/asset_sources.yaml"}],
      "a new row with an NC term appears without anyone typing it")
for f in ("space-radar-mark.svg", "space-radar-wordmark.svg", "space-radar-wordmark-on-light.svg"):
    check(f"../press/{f}" in cre.body and (ROOT / "templates/press" / f).is_file(), f"media kit: {f}")
trips = creator_clips.trips()
check(cre.body.count("made at release") == len(trips) and all(t["title"] in cre.body for t in trips), "the clip library is every trip, made at release")
check("Moments" in text and "not filmed by the job" in text, "the Moments are not called clips")
check("templates" not in cre.body and "@" not in re.sub(r"https?://\S+", "", text), "no address and no personal name")

# --- the comparisons -----------------------------------------------------------------------------------------------
check(len(seo_reach.COMPARISONS) == 5, "five comparison pages")
for path in seo_reach.COMPARISONS:
    p = pages.get(f"{path}/index.html")
    check(p is not None, f"{path}: built")
    if p is None:
        continue
    t = plain(p.body)
    check(len(p.title) <= 60 and 70 <= len(p.description) <= 160, f"{path}: title {len(p.title)}, description {len(p.description)}")
    check(re.search(r"<h2>What (SpaceEngine|Solar System Scope|Cosmoscope|the others) (?:does|do) that Space Radar does not</h2>", p.body) is not None,
          f"{path}: says what the other does that Space Radar does not")
    check(f"read on {seo_reach.READ}" in t and seo_reach.SPEC in p.body, f"{path}: dated, and its sources linked")
    check(not re.search(r"\b(best|better|worse|worst)\b", t, re.I), f"{path}: no ranking word")
    check("<img" not in p.body and "logo" not in t.lower(), f"{path}: no picture or logo of theirs")
    check(p.in_sitemap and p.share is not None, f"{path}: in the sitemap, with a share picture")
    html = render(p, make_ctx(HOST, {}))
    check(html.count("<h1") == 1, f"{path}: one H1")

# --- the release job -----------------------------------------------------------------------------------------------
jobs = creator_clips.plan([{"id": "moon-phases", "title": "Moon phases"}], "1920x1080", "x")
check(jobs[0]["command"] == ["node", "tools/render-trip.mjs", "moon-phases", "--res=1920x1080", "--fps=30", "--captions", "--out=x"], "one render-trip command a trip")
try:
    creator_clips.plan(trips, "4k")
    check(False, "a bad resolution is refused")
except ValueError:
    pass
check(creator_clips.moments("export const SHELF = [\n  { id: 'apollo-11', minutes: 1 },\n  { id: 'sts-1' },\n];") == ["apollo-11", "sts-1"], "the Moments read from the shelf")

if problems:
    print(f"test_seo_reach: {len(problems)} problem(s)\n  - " + "\n  - ".join(problems[:40]), file=sys.stderr)
    sys.exit(1)
print(f"test_seo_reach: ok ({len(plan['models'])} models and {len(plan['maps'])} maps offered, {len(seo_reach.limits())} exceptions named, "
      f"{len(seo_reach.COMPARISONS)} comparisons)")
