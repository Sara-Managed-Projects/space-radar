#!/usr/bin/env python3
"""Mirror registry/exotics.yaml into site/js/data/exotics.js, and refuse if it has drifted.

Same mechanism as the other mirrors (scripts/_genmirror.py). This one also does the arithmetic a
browser should not repeat: the source's `17h 45m 40.04s` / `-29° 00′ 28.1″` become degrees, and a
`dist_ly` range becomes low/high/mid. The `source:` and `why:` travel with the row -- the card prints
both.

Run:  python3 scripts/gen_exotics_js.py           # write it
      python3 scripts/gen_exotics_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402

FIELDS = ("id", "name", "kind", "why", "aliases", "source", "distance_note", "vmag")


def ra_deg(text: str) -> float:
    m = re.match(r"^\s*(\d+)h\s*(\d+)m\s*([\d.]+)s\s*$", str(text))
    if not m:
        raise SystemExit(f"exotics: cannot read RA {text!r}")
    return round((int(m.group(1)) + int(m.group(2)) / 60 + float(m.group(3)) / 3600) * 15, 6)


def dec_deg(text: str) -> float:
    t = str(text).replace("′", "'").replace("″", '"').replace("°", " ")
    m = re.match(r"^\s*([+-]?)\s*(\d+)\s+(\d+)'\s*([\d.]+)\"\s*$", t)
    if not m:
        raise SystemExit(f"exotics: cannot read Dec {text!r}")
    v = int(m.group(2)) + int(m.group(3)) / 60 + float(m.group(4)) / 3600
    return round(-v if m.group(1) == "-" else v, 6)


def render(doc: dict) -> list:
    out = []
    for r in doc.get("exotics") or []:
        row = {k: r.get(k) for k in FIELDS if r.get(k) is not None}
        row["raDeg"] = ra_deg(r["ra"])
        row["decDeg"] = dec_deg(r["dec"])
        d = r["dist_ly"]
        if isinstance(d, list):
            row["distLyLow"], row["distLyHigh"] = d
            row["distLy"] = (d[0] + d[1]) / 2
        else:
            row["distLy"] = d
        m = r.get("mass_msun")
        if isinstance(m, list):
            row["massMsunLow"], row["massMsunHigh"] = m
            row["massMsun"] = (m[0] + m[1]) / 2
        elif m is not None:
            row["massMsun"] = m
        if r.get("period_s") is not None:
            row["periodS"] = r["period_s"]
        out.append(row)
    return [("Black holes and other extremes, one fact sheet each, with the source it was read from.", "EXOTICS", out)]


HEADER = """// GENERATED from registry/exotics.yaml by scripts/gen_exotics_js.py. Do not edit.
//
// `python3 scripts/gen_exotics_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// Every row is a fact sheet with the page its numbers were read from; the generator turned the
// source's hours-minutes-seconds into degrees and a range into low/high/mid. data/layers.js turns
// these into `static` records on the sun-inertial axes.
"""

MIRROR = Mirror(source="registry/exotics.yaml", target="site/js/data/exotics.js", header=HEADER, render=render, what="exotics.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
