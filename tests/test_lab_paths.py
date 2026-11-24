#!/usr/bin/env python3
"""The Lab's learning paths (forge #566): registry/lab-paths.yaml, /lab/paths/ and the boxes on the simulators.

    python3 tests/test_lab_paths.py

  registry   seo_lab_paths.problems() finds nothing, and does find each kind of mistake it names
  ages       a path's ages and codes are the Lab's own tags (registry/lab-levels.yaml) of its simulators
  page       the built page: canonical, one LearningResource per path in the JSON-LD, every step a link to its
             simulator with ?path=<id>, the Lab's age pills, and every word in the HTML (the script writes none)
  boxes      each simulator a path holds carries one hidden box per path with the right step and next link; a
             simulator no path holds is built exactly as scripts/seo_lab.py writes it
  privacy    nothing here builds a request: no fetch, no beacon, no URL but the page's own links
"""
from __future__ import annotations

import json
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import gen_lab_index  # noqa: E402
import seo_lab  # noqa: E402
import seo_lab_paths as sp  # noqa: E402

fails: list[str] = []


def check(ok: bool, msg: str) -> None:
    if not ok:
        fails.append(msg)


HOST = "https://www.spaceradar.ai"
paths = sp.load()
sims = {s["slug"]: s for s in gen_lab_index.simulators()}
lv = gen_lab_index.levels()
labs = lv["labs"]

# registry
probs = sp.problems(paths, sims, labs)
check(not probs, f"registry/lab-paths.yaml: {probs}")
check(6 <= len(paths) <= 8, f"{len(paths)} paths")
p0 = dict(paths[0])
cases = {
    "a simulator that does not exist": dict(p0, sims=p0["sims"][:-1] + ["no-such-sim"]),
    "a simulator twice": dict(p0, sims=p0["sims"] + [p0["sims"][0]]),
    "too few": dict(p0, sims=p0["sims"][:3]),
    "a bad id": dict(p0, id="Orbits!"),
    "after names nothing": dict(p0, after=["nowhere"]),
    "a say with no full stop": dict(p0, say="no stop"),
}
for what, row in cases.items():
    check(bool(sp.problems([row] + paths[1:], sims, labs)), f"problems() misses {what}")
loop = [dict(paths[0], after=[paths[1]["id"]]), dict(paths[1], after=[paths[0]["id"]])] + paths[2:]
check(any("comes back round" in x for x in sp.problems(loop, sims, labs)), "problems() misses an `after` loop")

# ages and codes are read, not written
for p in paths:
    want = {str(b) for s in p["sims"] for b in labs[s].get("band") or []}
    check(set(sp.bands_of(p, labs)) == want, f"{p['id']}: ages {sp.bands_of(p, labs)} are not its simulators' {sorted(want)}")
    check(all(":" in c for c in sp.codes_of(p, labs)), f"{p['id']}: a code without its framework")
check(sp.age_range(["11-14", "14-16"]) == "11-16" and sp.age_range(["16-18", "18+"]) == "16-", "typicalAgeRange")

with tempfile.TemporaryDirectory() as d:
    out = Path(d)
    seo_lab.build(out, HOST)
    plain = {s: (out / "lab" / s / "index.html").read_text(encoding="utf-8") for s in sims}
    got = sp.build(out, HOST)
    check(got == ["lab/paths/index.html"], f"build() returns {got}")
    page = (out / "lab/paths/index.html").read_text(encoding="utf-8")
    check(f'<link rel="canonical" href="{HOST}/lab/paths/index.html">' in page, "the page's canonical")
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', page, re.S)
    ld = json.loads(m.group(1)) if m else {}
    lrs = [it["item"] for g in ld.get("@graph", []) if g.get("@type") == "ItemList" for it in g["itemListElement"]]
    check(len(lrs) == len(paths) and all(x["@type"] == "LearningResource" for x in lrs), "one LearningResource per path")
    for p in paths:
        sec = re.search(rf'<section class="lp" id="{p["id"]}".*?</section>', page, re.S)
        check(bool(sec), f"{p['id']}: no section")
        if not sec:
            continue
        hrefs = re.findall(r'<li data-slug="([^"]+)"><a class="card" href="([^"]+)"', sec.group(0))
        check([h[0] for h in hrefs] == p["sims"], f"{p['id']}: the steps are not the registry's, in order")
        check(all(h[1] == f"../{h[0]}/index.html?path={p['id']}" for h in hrefs), f"{p['id']}: a step does not link its simulator with ?path=")
        for a in p.get("after") or []:
            check(f'href="#{a}"' in sec.group(0), f"{p['id']}: does not link the path to do first, {a}")
    check(page.count('data-band="') >= len(gen_lab_index.BANDS) and "Any curriculum" in page, "the Lab's age pills and curriculum list")
    js = re.findall(r"<script>(.*?)</script>", page, re.S)
    words = re.findall(r"'([A-Z][a-z]+ [a-z][^']*)'", sp.CLIENT_JS)
    check(not words, f"the script writes words a translation cannot reach: {words[:3]}")
    check(not re.search(r"fetch\(|XMLHttpRequest|sendBeacon|navigator\.|srq", sp.CLIENT_JS), "the script sends nothing")
    check(any("srPaths" in j for j in js), "the page carries the script")
    held = {s for p in paths for s in p["sims"]}
    for s in sims:
        text = (out / "lab" / s / "index.html").read_text(encoding="utf-8")
        if s not in held:
            check(text == plain[s], f"{s}: in no path, but changed")
            continue
        mine = [p for p in paths if s in p["sims"]]
        n_box = text.count('<aside class="lpath"')
        check(n_box == len(mine), f"{s}: {n_box} boxes for {len(mine)} paths")
        check(text.count("css/controls.css") == 1 and "srPaths" in text, f"{s}: controls.css and the script once")
        for p in mine:
            i = p["sims"].index(s)
            box = re.search(rf'<aside class="lpath" id="lpath-{p["id"]}".*?</aside>', text, re.S)
            check(bool(box) and " hidden>" in box.group(0)[:120], f"{s}: the {p['id']} box is not there, hidden")
            if not box:
                continue
            check(f"Step {i + 1} of {len(p['sims'])}" in box.group(0), f"{s}: the step in {p['id']}")
            nxt = f"../{p['sims'][i + 1]}/index.html?path={p['id']}" if i + 1 < len(p["sims"]) else f"../paths/index.html#{p['id']}"
            check(f'href="{nxt}"' in box.group(0), f"{s}: the next link in {p['id']} is not {nxt}")
        check(text.index('<aside class="lpath"') < text.index("</main>"), f"{s}: the box is outside the page's main")

if fails:
    print("\n".join("FAIL " + f for f in fails))
    sys.exit(1)
print(f"lab paths ok: {len(paths)} paths, {sum(len(p['sims']) for p in paths)} steps, the page and the boxes")
