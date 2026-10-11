#!/usr/bin/env python3
"""Generate site/lab/index.html, the list of the Space Radar Lab's simulators, from the simulators themselves.

The repository's rule is "registry -> generated": a person edits one source and a script writes the rest. For the
Lab the source is the simulator's own file. Each site/lab/<slug>/index.html carries the three facts the list shows,
in its head, where the page itself reads them:

    <title>Rocket Equation | Space Radar Lab</title>
    <meta name="description" content="One sentence: the lesson.">
    <meta name="sr-lab-category" content="Rockets and spaceflight">

so adding a simulator is adding ONE file, and this script (CI runs it with --check) lists it. A folder whose name starts
with an underscore (_template) is the starter and is not listed. The list is sorted by category, then by title.

Run:  python3 scripts/gen_lab_index.py           # write site/lab/index.html
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
              "Stars and galaxies", "Earth, Moon and Sun"]
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


CSS = (ROOT / "templates" / "seo.css").read_text(encoding="utf-8")
LAB_CSS = """
main{max-width:1160px}
.top,footer{max-width:1160px}
.intro{display:flex;flex-wrap:wrap;align-items:center;gap:16px 24px;margin:0 0 24px}
.intro p{margin:0}
.grid{list-style:none;margin:0;padding:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))}
.card{display:flex;flex-direction:column;gap:6px;height:100%;box-sizing:border-box;padding:16px;border:1px solid var(--sr-line);border-radius:var(--sr-radius);background:var(--sr-wash);color:var(--sr-text);text-decoration:none}
.card:hover{background:var(--sr-wash-hover)}
.card .micro{margin:0}
.card h3{margin:0;font:600 20px/24px Inter,system-ui,sans-serif;color:var(--sr-text)}
.card p{margin:0;font-size:15px;line-height:20px;color:var(--sr-text-dim)}
.cat{margin:32px 0 12px;padding-top:0;border-top:0}
.add{margin-top:32px;padding:16px;border:1px dashed var(--sr-line);border-radius:var(--sr-radius)}
.add h2{margin:0 0 8px;padding:0;border:0}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
"""


def build() -> str:
    sims = simulators()
    sections = []
    for cat in CATEGORIES:
        mine = [s for s in sims if s["category"] == cat]
        if not mine:
            continue
        cards = "\n".join(
            f'<li><a class="card" href="{esc(s["slug"])}/index.html"><h3>{esc(s["title"])}</h3><p>{esc(s["lesson"])}</p></a></li>' for s in mine)
        sections.append(f'<h2 class="cat">{esc(cat)}</h2>\n<ul class="grid">\n{cards}\n</ul>')
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
<link rel="icon" href="{icon}">
<link rel="stylesheet" href="../css/fonts.css">
<style>
{CSS}{LAB_CSS}</style>
</head>
<body>
<header class="top"><a class="mark" href="../index.html">Space Radar</a><a href="../index.html">Open the live map</a></header>
<main>
<p class="micro">Space Radar Lab</p>
<h1>Tiny space simulators</h1>
<div class="intro"><p class="lead">{len(sims)} small pages, each teaching one idea about space. Every number is quoted from its source, and every page says what is and is not to scale. Open one and move the slider.</p></div>
{chr(10).join(sections)}
<section class="add" aria-labelledby="add-h">
<h2 id="add-h">Add your own simulator</h2>
<p>One HTML file, no libraries, no network, about ten minutes. Copy the starter, change the numbers, quote your source, open a pull request.</p>
<ul class="links"><li><a href="{GUIDE}">Read the guide</a></li><li><a href="{PROPOSE}">Propose or build a simulator</a></li><li><a href="https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Alab">Open tasks</a></li></ul>
</section>
</main>
<footer>
{sitelinks("../")}
</footer>
</body>
</html>
"""


def main(argv: list[str]) -> int:
    out = LAB / "index.html"
    new = build()
    if "--check" in argv:
        if not out.is_file() or out.read_text(encoding="utf-8") != new:
            print("site/lab/index.html is stale: run python3 scripts/gen_lab_index.py and commit it", file=sys.stderr)
            return 1
        print(f"site/lab/index.html is current ({len(simulators())} simulators)")
        return 0
    out.write_text(new, encoding="utf-8")
    print(f"wrote site/lab/index.html ({len(simulators())} simulators)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
