#!/usr/bin/env python3
"""Mirror registry/deepsky-heroes/<id>.yaml into site/js/data/hero-<id>.js (internal spec 0075, design §3).

One file per hero, so the stages that build them in parallel never edit the same file. The hero's
science review lives in its row (`review:`), and THIS GENERATOR REFUSES (spec 0075 requirement 20):
  - a hero without `review:` or `credits:` keys, or whose record is not in site/data/dso.json;
  - a `drawn:` class that is not one of photograph, catalogue, reconstruction, model, illustration;
  - a SHIPPED hero whose review has no `by:` and `date:` (a person signed it off) or no credit line.

Run:  python3 scripts/gen_deepsky_heroes_js.py           # write them
      python3 scripts/gen_deepsky_heroes_js.py --check   # exit 1 if a file is stale or a hero is refused
"""
from __future__ import annotations

import datetime
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "registry" / "deepsky-heroes"
OUT = ROOT / "site" / "js" / "data"
DRAWN = ("photograph", "catalogue", "reconstruction", "model", "illustration")
REVIEW = ("data_vs_model", "geometry", "colours", "distance", "credits", "by", "date")
KEYS = ("id", "record", "stage", "shipped", "children", "levels", "frame", "layers", "colours", "drawn",
        "sources", "review", "credits")


def plain(v):
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()
    if isinstance(v, dict):
        return {str(k): plain(x) for k, x in v.items()}
    if isinstance(v, list):
        return [plain(x) for x in v]
    return v


def problems(doc: dict, name: str, records: set) -> list:
    out = []
    where = f"registry/deepsky-heroes/{name}.yaml"
    for k in KEYS:
        if k not in doc:
            out.append(f"{where}: no `{k}:` (README.md lists the fields)")
    if doc.get("id") != name:
        out.append(f"{where}: `id: {doc.get('id')}` is not the file's name")
    if records and doc.get("record") not in records:
        out.append(f"{where}: `record: {doc.get('record')}` is not a deep-sky record in site/data/dso.json")
    for c in doc.get("children") or []:
        if records and c not in records:
            out.append(f"{where}: child `{c}` is not a deep-sky record")
    for c in doc.get("drawn") or []:
        if c not in DRAWN:
            out.append(f"{where}: `drawn: {c}` is not one of {', '.join(DRAWN)}")
    review = doc.get("review")
    if not isinstance(review, dict) or any(k not in review for k in REVIEW):
        out.append(f"{where}: `review:` must hold {', '.join(REVIEW)} (the science checklist, spec 0075 requirement 20)")
        review = {}
    if doc.get("shipped") is True:
        if not review.get("by") or not review.get("date"):
            out.append(f"{where}: shipped without a person's sign-off (`review.by` and `review.date`)")
        for k in REVIEW[:5]:
            if not review.get(k):
                out.append(f"{where}: shipped with `review.{k}` empty")
        if not doc.get("credits"):
            out.append(f"{where}: shipped without `credits:` (CREDITS.md section 3h)")
        if not doc.get("drawn"):
            out.append(f"{where}: shipped without saying what it draws (`drawn:`)")
    return out


def render(doc: dict, name: str) -> str:
    body = {k: plain(doc.get(k)) for k in KEYS}
    return (
        f"// GENERATED from registry/deepsky-heroes/{name}.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.\n"
        "// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by\n"
        "// scene/deep/heroes.js when the hero comes near, never at boot.\n"
        f"export const HERO = {json.dumps(body, ensure_ascii=False, indent=2)};\n"
    )


def main(argv) -> int:
    check = "--check" in argv
    dso = ROOT / "site" / "data" / "dso.json"
    records = {f"dso-{r['id']}" for r in json.loads(dso.read_text(encoding="utf-8")).get("objects", [])} if dso.exists() and dso.stat().st_size else set()
    bad, stale = [], []
    names = sorted(p.stem for p in SRC.glob("*.yaml"))
    for name in names:
        doc = yaml.safe_load((SRC / f"{name}.yaml").read_text(encoding="utf-8")) or {}
        bad += problems(doc, name, records)
        text = render(doc, name)
        out = OUT / f"hero-{name}.js"
        if check:
            if not out.exists() or out.read_text(encoding="utf-8") != text:
                stale.append(str(out.relative_to(ROOT)))
        elif not bad:
            out.write_text(text, encoding="utf-8")
    for orphan in OUT.glob("hero-*.js"):
        if orphan.stem[5:] not in names:
            stale.append(f"{orphan.relative_to(ROOT)} has no registry file")
    for b in bad:
        print("REFUSED " + b)
    for s in stale:
        print(f"STALE   {s}: run python3 scripts/gen_deepsky_heroes_js.py")
    if bad or stale:
        return 1
    print(f"deepsky heroes: {len(names)} {'current' if check else 'written'} ({', '.join(names)})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
