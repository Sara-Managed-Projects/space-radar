#!/usr/bin/env python3
"""Everything the registries say we use is credited in CREDITS.md.

    python3 tests/test_credits.py

WHY. CREDITS.md is the document that discharges what the licences ask, and it is kept by hand.
scripts/check_registry.py already holds the 3D models, textures, tile sets, pictures and sounds to
it line by line. The DATA SOURCES had no such check, and on 2026-10-05 nine of the fourteen credit
lines in registry/sources.yaml were not in CREDITS.md at all (JPL's Small-Body Database and
Horizons, CNEOS, ESA's NEOCC, Wikidata, Open Notify ...): each was added to the registry by a
change that did not know this file was its other half.

WHAT IS CHECKED.
  * every `attribution:` in registry/sources.yaml appears in CREDITS.md word for word, and so does
    the host of every source's `url:` (the reader has to be able to find who it is);
  * every `real_models:` row of registry/models.yaml has its file named, and every `textures:`,
    `data:` and `marks:` row has its `credit:` line, word for word;
  * the summary table at the top of CREDITS.md links only to sections that exist.

Stdlib and PyYAML, like the rest of the registry job. Exits 1 with one line per missing credit.
"""
import os
import re
import sys
from urllib.parse import urlparse

import yaml

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def load(name):
    with open(os.path.join(ROOT, "registry", name), encoding="utf-8") as f:
        return yaml.safe_load(f)


def problems(credits, sources, models):
    out = []
    for row in sources.get("sources", []):
        rid = row.get("id")
        line = row.get("attribution")
        if not line:
            out.append("sources.yaml `%s` has no attribution: line" % rid)
        elif line not in credits:
            out.append("sources.yaml `%s` is credited as %r, and CREDITS.md does not carry that line" % (rid, line))
        host = urlparse(row.get("url") or "").hostname or ""
        # The registrable part is enough: ssd-api.jpl.nasa.gov is credited as jpl.nasa.gov.
        tail = ".".join(host.split(".")[-2:])
        if tail and tail not in credits:
            out.append("sources.yaml `%s` reads %s, and CREDITS.md never names %s" % (rid, host, tail))
    for row in models.get("real_models", []):
        name = os.path.basename(row.get("file") or "")
        if name and name not in credits:
            out.append("models.yaml real model `%s` ships %s, and CREDITS.md does not name it" % (row.get("id"), name))
    for kind in ("textures", "data", "marks"):
        for row in models.get(kind, []):
            line = row.get("credit")
            if line and line not in credits:
                out.append("models.yaml %s `%s` is credited as %r, and CREDITS.md does not carry that line" % (kind, row.get("id"), line))
    anchors = set()
    for heading in re.findall(r"^#{2,3} (.+)$", credits, flags=re.M):
        slug = re.sub(r"[^\w\- ]", "", heading.strip().lower()).replace(" ", "-")
        anchors.add(slug)
    for link in set(re.findall(r"\]\(#([^)]+)\)", credits)):
        if link not in anchors:
            out.append("CREDITS.md links to #%s, and no heading makes that anchor" % link)
    return out


def main():
    with open(os.path.join(ROOT, "CREDITS.md"), encoding="utf-8") as f:
        credits = f.read()
    sources, models = load("sources.yaml"), load("models.yaml")
    found = problems(credits, sources, models)

    # The check has to be able to fail: a source nobody credited must be refused.
    fake = {"sources": [{"id": "nobody", "url": "https://data.example.invalid/x", "attribution": "Data: Nobody At All"}]}
    if len(problems(credits, fake, {})) != 2:
        found.append("the self-test did not refuse an uncredited source: this check is not checking")

    for p in found:
        print("FAIL " + p)
    n_src = len(sources.get("sources", []))
    n_mod = len(models.get("real_models", []))
    print("%s: %d sources, %d models, %d problems" % ("ok" if not found else "FAILED", n_src, n_mod, len(found)))
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main())
