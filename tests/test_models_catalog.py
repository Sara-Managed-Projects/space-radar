#!/usr/bin/env python3
"""The models catalog (scripts/models_catalog.py) and the one-model viewer (site/model/).

    python3 tests/test_models_catalog.py

What it holds:
  * ours only: every row of kind built-from-dimensions or derived-from-images, nothing else, and the eight NASA-named
    rows checked by hand are in;
  * the triangles counted from a .glb match a count done the long way here (every primitive of every node), and stay
    under the row's own budget;
  * the NORAD numbers parsed from `used_for` (a list after "NORAD", five-digit numbers in brackets; never a year);
  * every entry has the fields the models site reads, the two download URLs and the MIT licence;
  * the viewer's index (site/model/models.json) is current, and the page loads only vendored files that exist;
  * scripts/deploy.sh ships site/model/, invalidates it and sends the catalog to the models bucket;
  * docs/EMBEDDING.md documents the viewer.
"""

from __future__ import annotations

import json
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import models_catalog as mc  # noqa: E402

FAILS = 0


def check(ok: bool, what: str) -> None:
    global FAILS
    print(("PASS: " if ok else "FAIL: ") + what)
    if not ok:
        FAILS += 1


# --- ours only ---------------------------------------------------------------------------------------------------
doc = mc.asset_pack._yml("models.yaml")
want = {r["id"] for r in doc["real_models"] if r.get("kind") in ("built-from-dimensions", "derived-from-images")}
cat = mc.catalog(with_dates=False)
got = {m["id"] for m in cat["models"]}
check(got == want - set(mc.EXCLUDED), f"the catalog is exactly the {len(want)} rows of ours ({len(got)})")
check(not (got & {r["id"] for r in doc["real_models"] if not r.get("kind")}), "no row without a kind (someone else's file) is listed")
check(all(i in got for i in mc.HAND_CHECKED), "the eight NASA-named rows checked by hand are in")
check(mc.problems(cat) == [], "problems() finds nothing: " + "; ".join(mc.problems(cat)[:3]))

# --- fields ------------------------------------------------------------------------------------------------------
NEED = ("id", "name", "class", "mission", "look", "honesty", "dimensions", "references", "licence", "file", "kb", "bytes",
        "sha256", "triangles", "norad", "live", "added", "pictures", "downloads", "viewer", "page", "credit_line")
missing = [f"{m['id']}.{k}" for m in cat["models"] for k in NEED if k not in m]
check(not missing, "every entry has the fields the models site reads " + ", ".join(missing[:3]))
check(all(m["licence"]["id"] == "MIT" for m in cat["models"]), "every model is offered under the MIT licence")
check(all(m["downloads"]["glb"] == mc.GITHUB_RAW + m["file"] and m["downloads"]["fallback"] == mc.FORGE_RAW + m["file"]
          for m in cat["models"]), "downloads: GitHub raw first, the forge's raw as the fallback, by file name")
check(all(m["look"] in ("pbr", "toon") and m["mission"] in mc.MISSION_NAMES and m["size"] in ("", "small", "medium", "large", "huge")
          for m in cat["models"]), "look, mission and size are values the site's filters know")
check(all(m["live"] == "" or m["live"].startswith("https://www.spaceradar.ai/#at=") for m in cat["models"]),
      "a live link is the app's own #at= link or nothing")
hub = next(m for m in cat["models"] if m["id"] == "hubble")
check(hub["norad"] == [20580] and hub["live"].endswith("#at=sat-20580") and hub["class"] == "telescope", "Hubble: NORAD 20580, live link, telescope")

# --- triangles, the long way -------------------------------------------------------------------------------------
def tris_long_way(path: Path) -> int:
    raw = path.read_bytes()
    (clen,) = struct.unpack_from("<I", raw, 12)
    g = json.loads(raw[20:20 + clen])
    acc = g["accessors"]
    def walk(i: int) -> int:
        n = g["nodes"][i]
        t = 0
        if "mesh" in n:
            for p in g["meshes"][n["mesh"]]["primitives"]:
                if p.get("mode", 4) == 4:
                    t += acc[p["indices"]]["count"] // 3 if "indices" in p else acc[p["attributes"]["POSITION"]]["count"] // 3
        return t + sum(walk(c) for c in n.get("children", []))
    return sum(walk(i) for i in g["scenes"][g.get("scene", 0)]["nodes"])

for mid in ("hubble", "xrism", "cubesat-3u", "dragon-crew"):
    m = next(x for x in cat["models"] if x["id"] == mid)
    check(m["triangles"] == tris_long_way(ROOT / "site" / "models" / m["file"]), f"{mid}: {m['triangles']} triangles, counted twice")
over = [m["id"] for m in cat["models"] if m["budget_tris"] and m["triangles"] > m["budget_tris"] * 1.05]
check(not over, "no model is over its row's triangle budget " + ", ".join(over[:5]))

# --- NORAD parsing -----------------------------------------------------------------------------------------------
CASES = (
    ("NORAD 20580 (HST), by id", [20580]),
    ("NORAD 30580, 30797 and 30798 (THEMIS A, D and E)", [30580, 30797, 30798]),
    ("THURAYA-2 and THURAYA-3 (27825, 32404): Boeing's GEM", [27825, 32404]),
    ("FENGYUN 3A (32958), 3B (37214)", [32958, 37214]),
    ("launched in (2016) with 1 583 paths (read 2026-10-20)", []),
)
for text, ids in CASES:
    check(mc.norad_ids(text) == ids, f"norad_ids({text[:40]!r}) == {ids}")

# --- the viewer --------------------------------------------------------------------------------------------------
index = ROOT / "site" / "model" / "models.json"
check(index.is_file() and index.read_text(encoding="utf-8") == mc.dumps(mc.index_of(cat), compact=True),
      "site/model/models.json is current (python3 scripts/models_catalog.py)")
page = (ROOT / "site" / "model" / "index.html").read_text(encoding="utf-8")
js = (ROOT / "site" / "model" / "viewer.js").read_text(encoding="utf-8")
imports = re.findall(r"from '([^']+)'", js) + re.findall(r'href="(\.\./[^"]+)"', page)
check(all((ROOT / "site" / "model" / p).resolve().is_file() for p in imports) and len(imports) >= 4,
      "the viewer loads only files that exist: " + ", ".join(imports))
check(not re.search(r"https?://(?!models\.spaceradar\.ai|www\.w3\.org)", js + re.sub(r"<!--.*?-->", "", page, flags=re.S)),
      "the viewer makes no third-party request")
check("prefers-reduced-motion" in js and "localStorage" not in js and "serviceWorker" not in js,
      "the auto-turn honours reduced motion; nothing is stored, no worker")
check('name="robots" content="noindex"' in page, "the viewer page is noindex (the models site is what search reads)")

# --- the deploy and the docs -------------------------------------------------------------------------------------
deploy = (ROOT / "scripts" / "deploy.sh").read_text(encoding="utf-8")
check(re.search(r'KNOWN="[^"]*\bmodel\b', deploy) is not None and '"$SITE/model"' in deploy and '"/model/*"' in deploy,
      "deploy.sh syncs site/model/ and invalidates /model/*")
check("models_catalog.py\" --out" in deploy and "data/models-catalog.json" in deploy and "head-bucket" in deploy,
      "deploy.sh sends the catalog to the models bucket's data/ when the bucket is there")
emb = (ROOT / "docs" / "EMBEDDING.md").read_text(encoding="utf-8")
check("/model/?id=" in emb and "models.spaceradar.ai" in emb, "docs/EMBEDDING.md documents the one-model viewer")

print(f"{'FAIL' if FAILS else 'PASS'}: test_models_catalog ({FAILS} failed)")
sys.exit(1 if FAILS else 0)
