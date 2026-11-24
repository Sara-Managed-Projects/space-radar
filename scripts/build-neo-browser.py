#!/usr/bin/env python3
"""The near-Earth asteroid browser's bundled copy (research train "catalogues", forge #560): writes site/data/neo-browser.json.

    python3 scripts/build-neo-browser.py 2026-11-24          fetch (cached under ~/.cache/spaceradar-src/neo-browser) and write
    python3 scripts/build-neo-browser.py --check             stdlib only, no network: the file is whole (columns, counts, joins, size)

WHAT. The table of the catalogue "Near-Earth asteroids" (ui/neobrowser.js): every near-Earth asteroid that is
  * potentially hazardous (JPL's `pha` flag: an orbit within 0.05 au of the Earth's and H 22 or brighter), or
  * about a kilometre across or larger (H 17.75 or brighter, CNEOS's line for "1 km and larger"), or
  * listed by CNEOS's close-approach table as passing within 0.05 au of the Earth in the next ten years,
with its orbit at one epoch, H, a measured diameter where JPL has one, its MOID, its orbit class, and every approach of the
ten-year list. 4 421 of the 43 166 known near-Earth asteroids on 2026-11-24 (2 554 hazardous, 875 of a kilometre or more,
1 331 passing close: they overlap). The others are not in the file, and the view says so
with both numbers.

SOURCES (NASA/JPL, public domain in the US; CREDITS.md "Near-Earth asteroids" carries the credit line):
  * https://ssd-api.jpl.nasa.gov/sbdb_query.api?sb-kind=a&sb-group=neo -- every NEA's orbit, H, diameter, MOID, class, PHA flag.
  * https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.05&date-min=now&date-max=%2B3650 -- the next ten years' approaches. The
    harvester keeps the same query as `jpl-cad-decade` (registry/sources.yaml), and the page reads that saved copy's approaches
    first: the orbits here change slowly, the list of approaches does not.
  * site/data/pha.json (scripts/gen_pha.py) -- for a PHA, the same elements the `pha` layer draws (carried to the common epoch by
    JPL Horizons where SBDB's own epoch was old), so the table and the layer never put one rock in two places.

ROUNDING. a to nine figures, e to 1e-7, the angles to 1e-4 degree: at 1 au a ten-thousandth of a degree is 260 km, far under
what two-body motion from the epoch is off by after a few months.

THE HONEST LIMIT. Two-body motion from the epoch, as the pha layer (data/pha.js): the place is inferred. A row whose solution is not
at the common epoch keeps its own epoch (`ep`), and its card says how old the orbit is.

This machine's Python lacks the root JPL's hosts chain to: SR_JPL_INSECURE=1 reads them without the check (the data is public).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import os
import ssl
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "data" / "neo-browser.json"
PHA = ROOT / "site" / "data" / "pha.json"
CACHE = Path.home() / ".cache" / "spaceradar-src" / "neo-browser"
UA = "space-radar-build (https://www.spaceradar.ai)"
SBDB = ("https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=spkid,pdes,name,e,a,i,om,w,ma,epoch,H,diameter,moid,class,pha"
        "&sb-kind=a&sb-group=neo&full-prec=1")
CAD = "https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.05&date-min=now&date-max=%2B3650&sort=date&diameter=true&fullname=true"
KM_LINE_H = 17.75   # CNEOS: H 17.75 is about 1 km (cneos.jpl.nasa.gov/about/neo_groups.html)
CLASSES = {"APO", "ATE", "AMO", "IEO"}
COLS = ["spk", "pdes", "name", "a", "e", "i", "om", "w", "ma", "ep", "H", "d", "moid", "cls", "why"]
APPROACH_COLS = ["pdes", "tMin", "distAu", "vKmS"]
# why: bit 1 PHA, bit 2 about a kilometre or more, bit 4 passes within 0.05 au in the next ten years
MAX_BYTES = 560_000  # registry/budgets.yaml neo_browser_bytes


def ctx():
    c = ssl.create_default_context()
    if os.environ.get("SR_JPL_INSECURE") == "1":
        c.check_hostname = False
        c.verify_mode = ssl.CERT_NONE
    return c


def get(url: str, name: str) -> dict:
    path = CACHE / name
    if path.exists() and path.stat().st_size > 0:
        return json.loads(path.read_text(encoding="utf-8"))
    path.parent.mkdir(parents=True, exist_ok=True)
    last = None
    for k in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=300, context=ctx()) as r:
                body = r.read().decode("utf-8")
            path.write_text(body, encoding="utf-8")
            return json.loads(body)
        except Exception as err:  # noqa: BLE001 -- a network read; printed below
            last = err
            time.sleep(3.0 * (k + 1))
    raise SystemExit(f"could not read {url}: {last}")


def sig(x: float, n: int) -> float:
    if x == 0 or not math.isfinite(x):
        return x
    return float(f"{x:.{n}g}")


def num(v):
    if v is None or v == "":
        return None
    try:
        f = float(v)
    except ValueError:
        return None
    return f if math.isfinite(f) else None


def cad_minutes(cd: str) -> int:
    """'2026-Nov-25 21:20' (UTC, TDB in the API's words, to the minute) -> minutes since 1970."""
    t = dt.datetime.strptime(cd.strip(), "%Y-%b-%d %H:%M").replace(tzinfo=dt.timezone.utc)
    return int(t.timestamp() // 60)


def build(read: str) -> dict:
    sb = get(SBDB, "sbdb-neo.json")
    cad = get(CAD, "cad-decade.json")
    pha = json.loads(PHA.read_text(encoding="utf-8"))
    ix = {k: i for i, k in enumerate(sb["fields"])}
    cx = {k: i for i, k in enumerate(cad["fields"])}
    px = {k: i for i, k in enumerate(pha["cols"])}
    pha_rows = {str(r[px["pdes"]]): r for r in pha["rows"]}
    epoch = float(pha["epochJd"])
    approaching: dict[str, list] = {}
    for r in cad["data"]:
        approaching.setdefault(str(r[cx["des"]]).strip(), []).append(r)
    rows, missing = [], []
    known = set()
    n_pha = n_km = 0
    for r in sb["data"]:
        pdes = str(r[ix["pdes"]])
        known.add(pdes)
        H = num(r[ix["H"]])
        is_pha = r[ix["pha"]] == "Y"
        km = H is not None and H <= KM_LINE_H
        n_pha += is_pha
        n_km += km
        why = (1 if is_pha else 0) | (2 if km else 0) | (4 if pdes in approaching else 0)
        if not why:
            continue
        p = pha_rows.get(pdes)
        if p is not None:  # the pha layer's own elements, at the common epoch
            a, e, i, om, w, ma = (p[px[k]] for k in ("a", "e", "i", "om", "w", "ma"))
            ep = None
        else:
            a, e, i, om, w, ma = (num(r[ix[k]]) for k in ("a", "e", "i", "om", "w", "ma"))
            ep_jd = num(r[ix["epoch"]])
            ep = None if ep_jd == epoch else ep_jd
        cls = r[ix["class"]]
        if cls not in CLASSES or not (a and a > 0) or e is None or not (0 <= e < 1):
            missing.append(pdes)
            continue
        d = num(r[ix["diameter"]])
        rows.append([
            int(r[ix["spkid"]]), pdes, r[ix["name"]] or "",
            sig(a, 9), round(e, 7), round(i, 4), round(om, 4), round(w, 4), round(ma, 4), ep,
            H, sig(d, 4) if d else None, round(num(r[ix["moid"]]), 5) if num(r[ix["moid"]]) is not None else None, cls, why,
        ])
    approaches = []
    for des, rs in approaching.items():
        for r in rs:
            approaches.append([des, cad_minutes(r[cx["cd"]]), sig(float(r[cx["dist"]]), 5), round(float(r[cx["v_rel"]]), 2)])
    approaches.sort(key=lambda x: x[1])
    unjoined = sorted(set(approaching) - known)
    rows.sort(key=lambda x: (x[10] if x[10] is not None else 99, x[1]))
    return {
        "v": 1,
        "about": "Near-Earth asteroids from the JPL Small-Body Database and CNEOS close approaches. Built by scripts/build-neo-browser.py; see CREDITS.md.",
        "read": read,
        "epochJd": epoch,
        "sources": {"sbdb": SBDB, "cad": CAD, "pha": "site/data/pha.json"},
        "counts": {"neo": len(sb["data"]), "pha": n_pha, "km": n_km, "approaching": len(approaching), "approaches": len(approaches),
                   "rows": len(rows)},
        "kmLineH": KM_LINE_H,
        "window": {"years": 10, "maxAu": 0.05, "from": read},
        "unjoined": unjoined,
        "skipped": missing,
        "cols": COLS,
        "rows": rows,
        "approachCols": APPROACH_COLS,
        "approaches": approaches,
    }


def check(path: Path = OUT) -> list[str]:
    p = []
    raw = path.read_bytes()
    if len(raw) > MAX_BYTES:
        p.append(f"{path.name} is {len(raw)} B, over the {MAX_BYTES} B of registry/budgets.yaml neo_browser_bytes")
    d = json.loads(raw)
    if d.get("cols") != COLS or d.get("approachCols") != APPROACH_COLS:
        p.append("the columns changed")
        return p
    ix = {k: i for i, k in enumerate(COLS)}
    seen = set()
    for r in d["rows"]:
        if len(r) != len(COLS):
            p.append(f"row {r[:2]} has {len(r)} columns")
            continue
        if r[ix["pdes"]] in seen:
            p.append(f"{r[ix['pdes']]} twice")
        seen.add(r[ix["pdes"]])
        if not (0 < r[ix["a"]] < 100 and 0 <= r[ix["e"]] < 1 and 0 <= r[ix["i"]] <= 180):
            p.append(f"{r[ix['pdes']]}: an orbit out of range")
        if r[ix["cls"]] not in CLASSES:
            p.append(f"{r[ix['pdes']]}: class {r[ix['cls']]}")
        if not (1 <= r[ix["why"]] <= 7):
            p.append(f"{r[ix['pdes']]}: in the file for no reason")
    for a in d["approaches"]:
        if a[0] not in seen and a[0] not in d.get("unjoined", []):
            p.append(f"approach of {a[0]} joins no row and is not listed as unjoined")
    c = d["counts"]
    if c["rows"] != len(d["rows"]) or c["approaches"] != len(d["approaches"]):
        p.append("the counts do not match the rows")
    if not (c["rows"] < c["neo"]):
        p.append("the file says it holds every NEA")
    return p


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("read", nargs="?", help="the day the sources were read, YYYY-MM-DD")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args(argv)
    if a.check:
        probs = check()
        if probs:
            print("neo-browser.json FAILED:\n  " + "\n  ".join(probs), file=sys.stderr)
            return 1
        d = json.loads(OUT.read_text(encoding="utf-8"))
        print(f"neo-browser.json ok: {d['counts']['rows']} of {d['counts']['neo']} near-Earth asteroids, "
              f"{d['counts']['approaches']} approaches, {OUT.stat().st_size} B")
        return 0
    if not a.read:
        ap.error("give the day the sources were read, or --check")
    data = build(a.read)
    OUT.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    probs = check()
    print(f"wrote {OUT.relative_to(ROOT)}: {data['counts']} ({OUT.stat().st_size} B)")
    if probs:
        print("  " + "\n  ".join(probs), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
