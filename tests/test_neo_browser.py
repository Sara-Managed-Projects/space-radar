#!/usr/bin/env python3
"""The near-Earth asteroids' page and bundled file (research train "catalogues", forge #560).

    python3 tests/test_neo_browser.py

The page's delta-v (scripts/seo_neo.py) is held to the same six published values of Lance Benner's table as the map's
(site/js/data/neocat.js, tests/test_neo_browser.mjs), so the two can never disagree by more than their 1 %; the page is one page
with a title, a description of a search result's length, a Dataset node, its links into the map, and names kept out of
translation; it is built from the bundled file's own date, never the build's clock; and the bundled files pass their own --check.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import seo_neo  # noqa: E402

problems: list[str] = []


def check(ok: bool, msg: str) -> None:
    if not ok:
        problems.append(msg)


BENNER = [(1.126391025894812, 0.2037450762416414, 6.03494377024794, 5.087), (1.032344696903566, 0.05250367125371361, 1.429664294627039, 3.998),
          (0.9120145031259664, 0.1109040287099387, 2.579727052454163, 5.379), (0.9774830528591593, 0.06690808733689509, 0.1131132433726803, 4.156),
          (0.9828276788139952, 0.02790088936520501, 5.246326107484063, 5.064), (1.033232818800996, 0.02449745482749494, 0.5943471837144731, 3.813)]
for a, e, i, want in BENNER:
    dv = seo_neo.delta_v(a, e, i)
    check(dv is not None and abs(dv - want) / want < 0.01, f"delta-v {dv} for a={a}: Benner {want}")
check(seo_neo.delta_v(1, 1.1, 0) is None, "no ellipse, no delta-v")

pages = seo_neo.pages("https://www.spaceradar.ai")
check(len(pages) == 1 and pages[0].path == "near-earth-asteroids/index.html", "one page, /near-earth-asteroids/")
p = pages[0]
check(len(p.title) <= 60 and 70 <= len(p.description) <= 160, f"title {len(p.title)} and description {len(p.description)} characters")
check(any(n.get("@type") == "Dataset" and n.get("license") for n in p.jsonld), "a Dataset node with its licence")
check('href="../#cat=asteroids"' in p.body, "the page opens the catalogue on the map")
check(p.body.count('translate="no"') >= 40, "the rocks' names keep their spelling in every language")
check(p.lastmod == seo_neo.rows()[0]["read"], "dated by the bundled file, not the build")
check(seo_neo.pages("https://www.spaceradar.ai")[0].body == p.body, "built the same way twice")
check(", " not in p.description.replace("passes, the largest and the cheapest to reach, from", ""), "no number written with a comma")

for script in ("scripts/build-neo-browser.py", "scripts/build-asteroid-cloud.py"):
    r = subprocess.run([sys.executable, str(ROOT / script), "--check"], capture_output=True, text=True)
    check(r.returncode == 0, f"{script} --check: {r.stderr.strip() or r.stdout.strip()}")

if problems:
    print("neo browser page FAILED:\n  " + "\n  ".join(problems))
    sys.exit(1)
print("neo browser page ok: the page's delta-v within 1 % of Benner's six, one dated page with a Dataset node and the door into the map, "
      "and both bundled files whole and in budget")
