#!/usr/bin/env python3
"""The Lab's levels (forge #159): registry/lab-levels.yaml against the Lab, the curricula it names and the 3D map.

    python3 tests/test_lab_levels.py

  rows       every row is a simulator folder, and every simulator has a row (a new one is tagged when it lands)
  codes      every band is one of gen_lab_index.BANDS and every code is listed under `codes:` with its statement
  app        every `app` hash is a key the app's link reader knows (site/js/ui/urlstate.js KEYS) naming something real:
             a trip of registry/tours.yaml, a stage of registry/stages.yaml or worlds.yaml, a world, an exotic,
             a deep-sky object, an exoplanet of site/data/exoplanets.csv, a star id the app uses, or a name the
             search resolves (NAMED, each said why)
  pure       card_tags and stamp_app_link on rows worked out by hand
  stamped    every simulator carries its row's link, and the list's cards carry their tags (gen_lab_index --check)
"""
import csv
import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import gen_lab_index as g  # noqa: E402

# Names the app's search resolves (main.js resolveAt: whole-name or word-prefix match), not record ids.
NAMED = {
    "iss": "registry/aliases.yaml: `station`, `space station` -> iss; CelesTrak's ISS (ZARYA)",
    "voyager-1": "site/js/data/ephemerides.js names the deep-space record \"Voyager 1\"; `-` reads as a space",
}

problems = []
bad = problems.append
doc = yaml.safe_load((ROOT / "registry/lab-levels.yaml").read_text(encoding="utf-8"))
codes, labs = doc["codes"], doc["labs"]
folders = {p.parent.name for p in (ROOT / "site/lab").glob("*/index.html") if not p.parent.name.startswith("_")}

# rows
for slug in sorted(set(labs) - folders):
    bad(f"{slug}: a row for a simulator that is not in site/lab/")
for slug in sorted(folders - set(labs)):
    bad(f"{slug}: no row in registry/lab-levels.yaml (an age band, the codes it shows, and where to see it in the map)")

# codes
for fw, _ in g.FRAMEWORKS:
    if not codes.get(fw):
        bad(f"codes.{fw} is empty")
for slug, row in labs.items():
    if set(row) - {"band", "ngss", "ks3", "gcse", "ib", "app"}:
        bad(f"{slug}: unknown fields {sorted(set(row) - {'band', 'ngss', 'ks3', 'gcse', 'ib', 'app'})}")
    if not row.get("band") or any(str(b) not in g.BANDS for b in row["band"]):
        bad(f"{slug}: band {row.get('band')} is not a list of {g.BANDS}")
    for fw, _ in g.FRAMEWORKS:
        for c in row.get(fw) or []:
            if str(c) not in {str(k) for k in codes[fw]}:
                bad(f"{slug}: {fw} {c} is not listed under codes.{fw}")
    if not any(row.get(fw) for fw, _ in g.FRAMEWORKS) and "18+" not in row["band"] and "16-18" not in row["band"]:
        bad(f"{slug}: a school-age simulator with no curriculum code at all")

# app
url = (ROOT / "site/js/ui/urlstate.js").read_text(encoding="utf-8")
keys = set(re.findall(r"'([a-z]+)'", re.search(r"export const KEYS = \[([^\]]*)\]", url).group(1)))
trips = {t["id"] for t in yaml.safe_load((ROOT / "registry/tours.yaml").read_text(encoding="utf-8"))["tours"]}
worlds_doc = yaml.safe_load((ROOT / "registry/worlds.yaml").read_text(encoding="utf-8"))
worlds = {w["id"] for w in worlds_doc.get("worlds", worlds_doc)}
stages = {s["id"] for s in yaml.safe_load((ROOT / "registry/stages.yaml").read_text(encoding="utf-8"))["stages"]} | worlds
exotics = {"exotic-" + e["id"] for e in yaml.safe_load((ROOT / "registry/exotics.yaml").read_text(encoding="utf-8"))["exotics"]}
dso = {"dso-" + o["id"] for o in json.loads((ROOT / "site/data/dso.json").read_text(encoding="utf-8"))["objects"]}
with (ROOT / "site/data/exoplanets.csv").open(encoding="utf-8") as f:
    rows = [r for r in csv.reader(line for line in f if not line.startswith("#"))]
exo = {"exo-" + re.sub(r"[^a-z0-9]+", "-", r[0].lower()).strip("-") for r in rows[1:] if r}
js_text = "\n".join(p.read_text(encoding="utf-8", errors="replace") for p in (ROOT / "site/js").rglob("*.js"))


def at_known(v: str) -> bool:
    if v in worlds or v in exotics or v in dso or v in exo or v in NAMED:
        return True
    return v.startswith("star-") and (f"'{v}'" in js_text or f'"{v}"' in js_text)


for slug, row in labs.items():
    app = row.get("app") or ""
    m = re.fullmatch(r"#([a-z]+)=([a-z0-9-]+)", app)
    if not m:
        bad(f"{slug}: app {app!r} is not one #key=value")
        continue
    k, v = m.groups()
    if k not in keys:
        bad(f"{slug}: app key {k} is not one of urlstate.js KEYS")
    elif k == "trip" and v not in trips:
        bad(f"{slug}: trip {v} is not in registry/tours.yaml")
    elif k == "stage" and v not in stages:
        bad(f"{slug}: stage {v} is not a stage")
    elif k == "at" and not at_known(v):
        bad(f"{slug}: at={v} names nothing the map has")
    elif k not in ("trip", "stage", "at"):
        bad(f"{slug}: app uses {k}; only at, trip and stage are checked here")

# pure
band, code, line = g.card_tags({"band": ["11-14", "14-16"], "ngss": ["MS-ESS1-1"], "ks3": ["space-seasons"], "gcse": [], "ib": ["D.1"]})
if (band, code) != ("11-14 14-16", "ngss:MS-ESS1-1 ks3:space-seasons ib:D.1"):
    bad(f"card_tags: {band!r} {code!r}")
if line != "Ages 11-14, 14-16 · NGSS MS-ESS1-1 · KS3 space-seasons · IB D.1":
    bad(f"card_tags line: {line!r}")
if g.card_tags(None) != ("", "", ""):
    bad("card_tags(None) is not empty")
page = '<p class="more"><a href="../../index.html">Back to the live map</a><a href="../index.html">All simulators</a></p>'
once = g.stamp_app_link(page, "#trip=moon-phases")
if '<a id="sr-app" href="../../index.html#trip=moon-phases">See this in the 3D map</a>' not in once:
    bad(f"stamp_app_link: {once}")
if g.stamp_app_link(once, "#at=moon").count("sr-app") != 1 or "#at=moon" not in g.stamp_app_link(once, "#at=moon"):
    bad("stamp_app_link does not restamp a stamped link")
if g.stamp_app_link(once, None) != page:
    bad("stamp_app_link(None) does not put the plain link back")

# stamped
run = subprocess.run([sys.executable, str(ROOT / "scripts/gen_lab_index.py"), "--check"], capture_output=True, text=True)
if run.returncode:
    bad("gen_lab_index --check: " + (run.stderr or run.stdout).strip())
index = (ROOT / "site/lab/index.html").read_text(encoding="utf-8")
for slug, row in labs.items():
    b, c, _ = g.card_tags(row)
    if f'href="{slug}/index.html" data-band="{b}" data-code="{c}"' not in index:
        bad(f"{slug}: its card on /lab/ does not carry its tags")
if 'id="lfilter"' not in index or "aria-live" not in index:
    bad("site/lab/index.html has no filter, or its count is not announced")

if problems:
    print(f"lab levels FAILED ({len(problems)}):\n  " + "\n  ".join(problems), file=sys.stderr)
    sys.exit(1)
n = {fw: sum(1 for r in labs.values() if r.get(fw)) for fw, _ in g.FRAMEWORKS}
print(f"lab levels ok: {len(labs)} simulators tagged (NGSS {n['ngss']}, KS3 {n['ks3']}, GCSE {n['gcse']}, IB {n['ib']}), "
      f"every code listed, every 3D-map link names something the map has, the list and the links are current")
