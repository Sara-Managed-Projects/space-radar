#!/usr/bin/env python3
"""The card's "Pictures and news" (forge internal #556): what our registries already hold, mirrored for the browser.

    python3 scripts/gen_media.py           # write site/js/data/media.js
    python3 scripts/gen_media.py --check   # exit 1 if the checked-in file is stale

NOTHING NEW IS COLLECTED HERE. Every item is a row somebody already read, credited and licensed in a registry; this
script only gathers them per object, so the card can show them in one place (ui/cardmedia.js, fetched when the section
is first opened, never before):

  PICTURES  registry/nebulae.yaml's photographs (ESA/Hubble, ESA/Webb, ESO, NOIRLab: CC BY 4.0, each archive's terms
            quoted in that file) and the two Event Horizon Telescope images of registry/exotics.yaml (CC BY 4.0). All
            are files of this site (site/images/...): no picture is fetched from anybody else's server.
  READS     registry/articles.yaml's long reads whose `open` link names one object (`#go=<id>`); the hero is our own
            screenshot of the map.
  PAGES     registry/missions.yaml's `source`: the agency's own page for the mission (NASA Science, NSSDCA, ESA).
  JOURNAL   registry/blog-feed.json, the committed snapshot of the Journal's feed (scripts/refresh_blog_feed.py), with
            its tags. A post is matched to an object in the browser, by tag (ui/cardmedia.js postsFor), because the
            Journal tags a post with a name ("Voyager 1", "ISS") and only the browser knows every record's names.

A ROW WITHOUT A CREDIT AND A LICENCE IS REFUSED: the script exits 1 and names it. The Journal's and the long reads'
pictures are this project's own (MIT site, the Journal's own posts), and say so.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "site/js/data/media.js"
OWN = "Space Radar"
OWN_LICENCE = "Space Radar's own picture"
BLOG_HOSTS = ("https://blog.spaceradar.ai/",)

HEADER = """// GENERATED from registry/nebulae.yaml, registry/exotics.yaml, registry/articles.yaml, registry/missions.yaml and
// registry/blog-feed.json by scripts/gen_media.py. Do not edit.
//
// `python3 scripts/gen_media.py --check` fails CI if this file and the registries disagree. Imported only by
// ui/cardmedia.js, which the card fetches when "Pictures and news" is first opened.
"""


def load(name: str):
    return yaml.safe_load((ROOT / "registry" / name).read_text(encoding="utf-8")) or {}


def refuse(problems: list[str], where: str, row: dict, *keys: str) -> bool:
    missing = [k for k in keys if not str(row.get(k) or "").strip()]
    if missing:
        problems.append(f"{where}: no {', '.join(missing)}")
        return True
    return False


def build() -> tuple[dict, list[str]]:
    problems: list[str] = []
    pictures: dict[str, list] = {}
    neb = load("nebulae.yaml")
    archives = neb.get("archives") or {}
    for r in neb.get("pictures") or []:
        a = archives.get(r.get("archive")) or {}
        row = {
            "file": str(r.get("file", "")).replace("site/", "", 1),
            "page": str(a.get("page", "")).replace("{image}", str(r.get("image", ""))),
            "credit": f"{r.get('credit', '')} ({a.get('name', '')})" if a.get("name") else r.get("credit", ""),
            "licence": r.get("licence") or a.get("licence", ""),
            "by": (r.get("observed") or {}).get("by", ""),
            "date": str((r.get("observed") or {}).get("released", "")),
        }
        if refuse(problems, f"nebulae.yaml {r.get('id')}", row, "file", "page", "credit", "licence"):
            continue
        pictures.setdefault(f"dso-{r['id']}", []).append({k: v for k, v in row.items() if v})
    for x in (load("exotics.yaml").get("exotics") or []):
        img = x.get("image") if isinstance(x, dict) else None
        if not img:
            continue
        m = re.match(r"(https://\S+)", str(img.get("source", "")))
        row = {"file": str(img.get("file", "")).replace("site/", "", 1), "page": m.group(1) if m else "",
               "credit": img.get("credit", ""), "licence": img.get("licence", ""), "alt": img.get("alt", "")}
        if refuse(problems, f"exotics.yaml {x.get('id')}", row, "file", "page", "credit", "licence"):
            continue
        pictures.setdefault(f"exotic-{x['id']}", []).append({k: v for k, v in row.items() if v})

    reads: dict[str, list] = {}
    for a in (load("articles.yaml").get("articles") or []):
        m = re.search(r"#go=([A-Za-z0-9._:-]+)$", str(a.get("open", "")))
        if not m:
            continue
        row = {"title": a.get("title", ""), "page": f"read/{a['slug']}.html",
               "hero": f"images/read/{a['slug']}/{a.get('hero', '')}" if a.get("hero") else "",
               "alt": a.get("hero_alt", ""), "date": str(a.get("published", "")), "credit": OWN, "licence": OWN_LICENCE}
        if a.get("blog"):
            row["blog"] = a["blog"]
        if refuse(problems, f"articles.yaml {a.get('slug')}", row, "title", "credit", "licence"):
            continue
        if row["hero"] and not (ROOT / "site" / row["hero"]).is_file():
            problems.append(f"articles.yaml {a['slug']}: hero {row['hero']} is not in site/")
            continue
        reads.setdefault(m.group(1), []).append({k: v for k, v in row.items() if v})

    pages: dict[str, list] = {}
    for ms in (load("missions.yaml").get("missions") or []):
        src = ms.get("source") or {}
        rec = ms.get("record")
        if not rec or not str(src.get("url", "")).startswith("https://"):
            continue
        name = str(src.get("name", ""))
        publisher = name.split(",")[0].strip() or name
        pages.setdefault(rec, []).append({"name": name, "url": src["url"], "credit": publisher, "licence": "link"})

    feed = json.loads((ROOT / "registry" / "blog-feed.json").read_text(encoding="utf-8"))
    journal = []
    for p in feed.get("items") or []:
        url = str(p.get("url", ""))
        if not url.startswith(BLOG_HOSTS):
            problems.append(f"blog-feed.json: {url} is not the Journal's")
            continue
        image = str(p.get("image", ""))
        row = {"title": p.get("title", ""), "url": url, "date": str(p.get("date", ""))[:10],
               "image": image if image.startswith(BLOG_HOSTS) else "", "tags": [str(t) for t in p.get("tags") or []],
               "credit": OWN, "licence": OWN_LICENCE}
        journal.append({k: v for k, v in row.items() if v})
    journal.sort(key=lambda r: r.get("date", ""), reverse=True)
    sort = lambda d: {k: d[k] for k in sorted(d)}  # noqa: E731
    return {"PICTURES": sort(pictures), "READS": sort(reads), "PAGES": sort(pages), "JOURNAL": journal}, problems


DOCS = {
    "PICTURES": "Photographs of an object, by record id: a file of this site, its archive page, the credit and the licence.",
    "READS": "The long reads that open on one object, by record id: our own page and picture.",
    "PAGES": "The agency's own page for a mission, by record id.",
    "JOURNAL": "The Journal's posts, newest first, with their tags: ui/cardmedia.js matches them to a record by name.",
}


def text() -> tuple[str, list[str]]:
    data, problems = build()
    parts = [HEADER]
    for k, v in data.items():
        parts.append(f"/** {DOCS[k]} */\nexport const {k} = {json.dumps(v, indent=0, ensure_ascii=False)};\n")
    return "\n".join(parts), problems


def main(argv: list[str]) -> int:
    want, problems = text()
    if problems:
        print("gen_media: refused rows (every item needs a credit and a licence):\n  " + "\n  ".join(problems), file=sys.stderr)
        return 1
    if "--check" in argv:
        have = TARGET.read_text(encoding="utf-8") if TARGET.exists() else ""
        if have == want:
            print(f"media.js is current ({want.count(chr(10))} lines)")
            return 0
        print(f"{TARGET.relative_to(ROOT)} is STALE. Run: python3 scripts/gen_media.py")
        return 1
    TARGET.write_text(want, encoding="utf-8")
    print(f"wrote {TARGET.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
