#!/usr/bin/env python3
"""The names of things in each language of the app, for the map's search and cards (internal #310).

    python3 scripts/gen_names_i18n.py            # write site/data/names/<code>.json for every language
    python3 scripts/gen_names_i18n.py --check    # fail if a file is stale (CI)

WHY. The pages a search engine reads are translated, names and all: registry/seo-i18n/en/names.json is every name a
page uses (the Moon, the Andromeda Galaxy, the International Space Station: what ui/cards.js displayName gives a
record), keyed by the hash the catalogs share, and registry/seo-i18n/<code>/names.json is that name in the language
(scripts/seo_i18n.py, docs/TRANSLATING.md "The pages a search engine reads"). The map itself knew none of them: in
the Spanish app "Luna" found three Soviet landers and the Moon's card was titled "The Moon" (review of 16 Nov 2026).

This writes, per language, the names that DIFFER from the English: `{ "names": { "<English name>": "<name>" } }`.
ui/localnames.js fetches the one file of the page's language after the first view (never at boot, never in English)
and gives each record its name in that language, with the English name kept as another name it answers to.
No translation is made here: a name the catalog does not have stays English on the map.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOGS = ROOT / "registry" / "seo-i18n"
OUT = ROOT / "site" / "data" / "names"


def languages() -> list[str]:
    return sorted(p.name for p in CATALOGS.iterdir() if p.is_dir() and p.name != "en" and (p / "names.json").exists())


def build(code: str) -> str:
    english = json.loads((CATALOGS / "en" / "names.json").read_text(encoding="utf-8"))
    local = json.loads((CATALOGS / code / "names.json").read_text(encoding="utf-8"))
    names: dict[str, str] = {}
    for key, name in english.items():
        there = local.get(key)
        if isinstance(there, str) and there.strip() and there != name:
            names[name] = there
    doc = {
        "lang": code,
        "source": f"registry/seo-i18n/{code}/names.json (scripts/gen_names_i18n.py)",
        "count": len(names),
        "names": dict(sorted(names.items())),
    }
    return json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="fail if a written file differs from what the catalogs give")
    args = ap.parse_args()
    stale = []
    for code in languages():
        text = build(code)
        path = OUT / f"{code}.json"
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                stale.append(path.relative_to(ROOT).as_posix())
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
            print(f"wrote {path.relative_to(ROOT)} ({json.loads(text)['count']} names, {len(text.encode('utf-8'))} B)")
    if stale:
        print("stale (run python3 scripts/gen_names_i18n.py): " + ", ".join(stale), file=sys.stderr)
        return 1
    if args.check:
        print(f"names ok: {len(languages())} languages, each file is what registry/seo-i18n gives")
    return 0


if __name__ == "__main__":
    sys.exit(main())
