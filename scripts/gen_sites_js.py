#!/usr/bin/env python3
"""Mirror registry/sites.yaml into site/js/data/sites.js, and refuse if it has drifted.

The dishes and landing sites were ported to data/sample.js by hand, one 22-line record per row,
and nothing checked that the port agreed with the registry. At fourteen rows that held; adding
twenty-one landing sites on 2026-09-22 would have meant 460 more hand-copied lines and the
certainty that one latitude among them would one day differ from its row. So the rows are data
here and data/sample.js's handKeptSites() builds the records from them, the same split the
oddities already use (generated data and code never share a file).

The whitelist leaves out `landed:`, `source:`, `uncertainty_m:` and the `references:` block:
they are the evidence a reviewer reads, and nothing in the browser reads them.

Run:  python3 scripts/gen_sites_js.py           # write it
      python3 scripts/gen_sites_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, pick  # noqa: E402

FIELDS = ("id", "display", "class", "world", "lat", "lon", "alt_m", "diameter_m", "shape", "record", "aliases", "doing")


def render(doc: dict) -> list:
    rows = [pick(r, FIELDS) for r in (doc.get("sites") or []) if isinstance(r, dict)]
    return [("Every registry/sites.yaml row, in file order. `record: false` rows are coordinates other rows anchor on, not records.", "SITES", rows)]


HEADER = """// GENERATED from registry/sites.yaml by scripts/gen_sites_js.py. Do not edit.
//
// `python3 scripts/gen_sites_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML. data/sample.js handKeptSites()
// turns these rows into records.
"""

MIRROR = Mirror(source="registry/sites.yaml", target="site/js/data/sites.js", header=HEADER, render=render, what="sites.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
