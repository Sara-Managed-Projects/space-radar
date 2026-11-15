#!/usr/bin/env python3
"""The potentially hazardous asteroids (release 2.1.0, internal #37, stage A7's first consumer): writes site/data/pha.json.

    python3 scripts/gen_pha.py            fetch (cached under ~/.cache/spaceradar-src/pha) and write site/data/pha.json
    python3 scripts/gen_pha.py --fixture  Horizons' heliocentric vectors for every 64th row on two days: tests/fixtures/pha_horizons.json
    python3 scripts/gen_pha.py --check    stdlib only, no network: the file is whole (columns, counts, unique ids, ranges)

WHAT. Every asteroid the JPL Small-Body Database flags as potentially hazardous (the `pha` group of its Query API; 2 552 on
2026-11-15): its heliocentric orbit at one epoch, its absolute magnitude, its size where a measurement exists, its minimum
orbit intersection distance with the Earth's orbit (MOID) and the day of its last observation. data/pha.js turns the rows into
the records of the `pha` layer; the card says what it is and where the place comes from.

SOURCES (all NASA/JPL, public domain; CREDITS.md section 3p carries the credit line):
  * https://ssd-api.jpl.nasa.gov/sbdb_query.api?sb-kind=a&sb-group=pha&full-prec=1 -- one request, the orbits, H, diameter, MOID,
    class, last observation, data-arc quality (`condition_code`), each solution's epoch.
  * https://ssd.jpl.nasa.gov/api/horizons.api (ELEMENTS) -- only for a row whose solution is NOT at the common epoch of the
    rest (JD 2461200.5, 2026-06-09 TDB): the same solution's osculating elements carried to that epoch, because two-body motion
    from an epoch 10 or 40 years old is not a place (the Bennu row in data/sample.js records the same: 0.042 au off from 2011).
    The rows it touched are listed in `horizons` in the file.

THE HONEST LIMIT. Every row is drawn by two-body motion from its epoch (propagate/kepler.js). A close pass to a planet bends an
orbit, so the place is called inferred and drifts from JPL's with the months from the epoch; the card says so, and so does
tests/test_pha.mjs, which holds the drift against Horizons vectors the day it was fetched (tests/fixtures/pha_horizons.json).

NOT HERE. MPC's PHA.txt (2 540 rows, the same epoch) was read on 2026-11-15 and not used: the Minor Planet Center's page states no
licence for it. The 1.58 million other minor planets, the NEAs that are not PHAs and DAMIT shapes are internal #37's remaining work.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "data" / "pha.json"
CACHE = Path(os.environ.get("SR_SRC_CACHE", Path.home() / ".cache" / "spaceradar-src")) / "pha"
UA = "space-radar-pha/1.0 (+https://spaceradar.ai)"
READ = "2026-11-15"
EPOCH_JD = 2461200.5  # 2026-06-09 00:00 TDB: the epoch JPL's current solutions are at
COLS = ["spk", "pdes", "name", "a", "e", "i", "om", "w", "ma", "H", "diameter", "moid", "class", "lastObs", "cc"]
FIELDS = "spkid,pdes,name,prefix,e,a,i,om,w,ma,epoch,H,diameter,moid,class,last_obs,condition_code"
SBDB = "https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=" + FIELDS + "&sb-kind=a&sb-group=pha&full-prec=1"
CLASSES = {"APO", "ATE", "AMO", "IEO"}


def ctx():
    c = ssl.create_default_context()
    if os.environ.get("SR_JPL_INSECURE") == "1":  # this machine's Python lacks the root JPL's hosts chain to; the data is public
        c.check_hostname = False
        c.verify_mode = ssl.CERT_NONE
    return c


def get(url: str, name: str, tries: int = 6, pause: float = 0.0) -> str:
    path = CACHE / name
    if path.exists() and path.stat().st_size > 0:
        return path.read_text(encoding="utf-8")
    path.parent.mkdir(parents=True, exist_ok=True)
    last = None
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=90, context=ctx()) as r:
                body = r.read().decode("utf-8", "replace")
            path.write_text(body, encoding="utf-8")
            if pause:
                time.sleep(pause)
            return body
        except Exception as err:  # noqa: BLE001 -- a network read; the cause is printed below
            last = err
            time.sleep(3.0 * (k + 1))
    raise RuntimeError(f"could not read {url}: {last}")


def num(x, digits=10):
    if x is None or x == "":
        return None
    return float(f"{float(x):.{digits}g}")


def horizons(spk: int):
    """The solution's osculating elements at EPOCH_JD from Horizons (ecliptic J2000, au and degrees), or None."""
    q = {
        "format": "text", "COMMAND": f"'DES={spk};'", "OBJ_DATA": "'NO'", "MAKE_EPHEM": "'YES'", "EPHEM_TYPE": "'ELEMENTS'",
        "CENTER": "'500@10'", "TLIST": f"'{EPOCH_JD}'", "REF_PLANE": "'ECLIPTIC'", "REF_SYSTEM": "'ICRF'", "OUT_UNITS": "'AU-D'", "TIME_TYPE": "'TDB'",
    }
    text = get("https://ssd.jpl.nasa.gov/api/horizons.api?" + urllib.parse.urlencode(q, safe="@'"), f"hz/{spk}.txt", pause=0.15)
    if "$$SOE" not in text:
        return None
    block = text.split("$$SOE")[1].split("$$EOE")[0]
    v = {k.strip(): float(x) for k, x in re.findall(r"([A-Z]{1,2})\s*=\s*([-+0-9.Ee]+)", block)}
    if not all(k in v for k in ("EC", "IN", "OM", "W", "MA", "A")):
        return None
    return {"a": v["A"], "e": v["EC"], "i": v["IN"], "om": v["OM"], "w": v["W"], "ma": v["MA"]}


def build():
    body = json.loads(get(SBDB, "sbdb_pha.json"))
    fields = body["fields"]
    rows, via_horizons, dropped = [], [], []
    for raw in body["data"]:
        r = dict(zip(fields, raw))
        spk = int(r["spkid"])
        el = {k: float(r[k]) for k in ("a", "e", "i", "om", "w", "ma")}
        if abs(float(r["epoch"]) - EPOCH_JD) > 0.01:
            hz = horizons(spk)
            if hz is None:
                dropped.append(r["pdes"])
                continue
            el = hz
            via_horizons.append(spk)
        rows.append([
            spk, r["pdes"], (r["name"] or "").strip() or None,
            num(el["a"]), num(el["e"]), num(el["i"]), num(el["om"]), num(el["w"]), num(el["ma"]),
            num(r["H"], 4), num(r["diameter"], 4), num(r["moid"], 4), r["class"], r["last_obs"], int(r["condition_code"]) if r["condition_code"] not in (None, "") else None,
        ])
    rows.sort(key=lambda x: x[0])
    if dropped:
        print("dropped, no Horizons elements at the epoch:", dropped, file=sys.stderr)
    out = {
        "v": 1,
        "about": "Potentially hazardous asteroids from the JPL Small-Body Database (Query API, group pha), orbits at one epoch. Built by scripts/gen_pha.py; see CREDITS.md 3p.",
        "read": READ, "epochJd": EPOCH_JD, "count": len(rows), "horizons": via_horizons,
        "source": "https://ssd-api.jpl.nasa.gov/sbdb_query.api?sb-kind=a&sb-group=pha&full-prec=1",
        "cols": COLS, "rows": rows,
    }
    OUT.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"pha: {len(rows)} rows ({len(via_horizons)} carried to the epoch by Horizons) -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes)")


FIXTURE = ROOT / "tests" / "fixtures" / "pha_horizons.json"
FIXTURE_DAYS = ["2026-11-15", "2027-06-09"]  # the day it was read, and a year (less 6 months) past the epoch's anniversary: the drift is measured, not assumed
FIXTURE_STEP = 64


def horizons_vector(spk: int, day: str):
    """Heliocentric position (au) and velocity (au/day), ecliptic J2000 axes, at 00:00 TDB on `day`."""
    import datetime
    nxt = (datetime.date.fromisoformat(day) + datetime.timedelta(days=1)).isoformat()
    q = {
        "format": "text", "COMMAND": f"'DES={spk};'", "OBJ_DATA": "'NO'", "MAKE_EPHEM": "'YES'", "EPHEM_TYPE": "'VECTORS'", "CENTER": "'500@10'",
        "START_TIME": f"'{day}'", "STOP_TIME": f"'{nxt}'", "STEP_SIZE": "'1d'", "REF_PLANE": "'ECLIPTIC'", "REF_SYSTEM": "'ICRF'",
        "OUT_UNITS": "'AU-D'", "VEC_TABLE": "'2'", "CSV_FORMAT": "'YES'", "TIME_TYPE": "'TDB'",
    }
    text = get("https://ssd.jpl.nasa.gov/api/horizons.api?" + urllib.parse.urlencode(q, safe="@'"), f"hzv/{spk}.{day}.txt", pause=0.15)
    m = re.search(r"\$\$SOE\s*\n(.*?)\n", text)
    if not m:
        return None
    f = [x.strip() for x in m.group(1).split(",")]
    return [float(x) for x in f[2:8]]


def fixture():
    d = json.loads(OUT.read_text(encoding="utf-8"))
    out = {"about": "JPL Horizons API, EPHEM_TYPE=VECTORS, centre the Sun, ecliptic J2000, 00:00 TDB, au and au/day, read " + READ + ". Every 64th row of site/data/pha.json.",
           "days": FIXTURE_DAYS, "rows": {}}
    for r in d["rows"][::FIXTURE_STEP]:
        v = [horizons_vector(r[0], day) for day in FIXTURE_DAYS]
        if all(v):
            out["rows"][str(r[0])] = {"pdes": r[1], "vectors": v}
    FIXTURE.write_text(json.dumps(out, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"fixture: {len(out['rows'])} bodies -> {FIXTURE.relative_to(ROOT)}")


def check() -> int:
    bad = []
    d = json.loads(OUT.read_text(encoding="utf-8"))
    if d.get("cols") != COLS:
        bad.append("columns are not " + ",".join(COLS))
    rows = d.get("rows", [])
    if d.get("count") != len(rows) or len(rows) < 2000:
        bad.append(f"count {d.get('count')} vs {len(rows)} rows")
    if d.get("epochJd") != EPOCH_JD:
        bad.append("epoch moved")
    seen = set()
    for r in rows:
        if len(r) != len(COLS):
            bad.append(f"{r[:2]}: {len(r)} columns")
            continue
        spk, pdes, name, a, e, i, om, w, ma, H, dia, moid, cls, last, cc = r
        if spk in seen:
            bad.append(f"{spk} repeated")
        seen.add(spk)
        if not (isinstance(spk, int) and 20000000 <= spk < 30000000) and not (isinstance(spk, int) and 50000000 <= spk < 60000000):
            bad.append(f"{pdes}: spk {spk}")
        if not (0.3 < a < 30 and 0 <= e < 1 and 0 <= i < 180 and 0 <= om < 360 and 0 <= w < 360 and 0 <= ma < 360):
            bad.append(f"{pdes}: elements out of range")
        # the definition of the group (CNEOS): an orbit within 0.05 au of the Earth's and H of 22.0 or less. The SBDB's flag keeps 32 rows
        # whose H has since moved to 22.1 to 22.6, so the check on H leaves room (read 2026-11-15) and the card prints each row's own H.
        if not (moid is not None and moid <= 0.05 and H is not None and H <= 22.7):
            bad.append(f"{pdes}: moid {moid}, H {H} is not potentially hazardous")
        if cls not in CLASSES:
            bad.append(f"{pdes}: class {cls}")
        if not re.fullmatch(r"\d{4}-\d\d-\d\d", last or ""):
            bad.append(f"{pdes}: last observation {last}")
    for s in d.get("horizons", []):
        if s not in seen:
            bad.append(f"horizons row {s} is not in the file")
    if bad:
        print("\n".join(bad[:30]), file=sys.stderr)
        return 1
    print(f"pha ok: {len(rows)} rows")
    return 0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--fixture", action="store_true")
    args = ap.parse_args()
    if args.check:
        sys.exit(check())
    if args.fixture:
        fixture()
        sys.exit(0)
    build()
