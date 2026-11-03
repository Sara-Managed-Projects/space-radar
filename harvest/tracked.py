"""A9, tracked objects: every piece of debris and spent rocket body that CelesTrak publishes elements for, as tiles.

The set `tracked` (site/js/data/tracked.js reads it; harvest/slowjobs.py builds it once a day).

WHAT IT HOLDS. Two CelesTrak GP queries, both free under CelesTrak's usage policy (the one the active catalogue is
read under; one request each a day, far inside the two-hour cycle):

    gp.php?NAME=DEB&FORMAT=json      pieces of debris
    gp.php?NAME=R/B&FORMAT=json      spent rocket bodies

on 2026-11-03 these answered 10 245 and 2 192 element sets: 12 437 objects placed by their own elements (SGP4), where the
debris view had drawn 14 604 at made-up places along their orbits' real size and tilt. The catalogue lists about 13 800
pieces and rocket bodies in orbit; the rest have no element set CelesTrak publishes and the page keeps drawing them as
illustrative (site/js/data/tracked.js merges). The ~34 800 of the tracker's wording needs the 16 600 working payloads
(already drawn from `celestrak-active`) and the dead ones, which the public GP queries cannot select; those are not here
and the page says so.

THE SIZE comes from SATCAT's radar cross-section (the `celestrak-satcat` snapshot of the same publish): rocket bodies
and anything of 1 m2 or more are level 0, 0.1 to 1 m2 level 1, smaller or unmeasured level 2. A device that has
tripped the frame-rate latch draws level 0 alone.

QUANTISING. Elements are what SGP4 needs and nothing is dropped: the epoch and the mean motion are doubles (a tenth of a
second of epoch is a kilometre along the track, and a millionth of a revolution a day is 22 m a day), B* and its first
derivative are floats, and the three angles, the inclination and the eccentricity are 32-bit fractions of their range
(under a millionth of a degree). tests/test_tracked.mjs holds the result to 10 m of position at the epoch and for a week
after it.
"""

from __future__ import annotations

import csv
import io
import json
import time
from datetime import datetime, timezone

from . import fetch as _fetch
from . import tilepack

GP_URL = "https://celestrak.org/NORAD/elements/gp.php?NAME={name}&FORMAT=json"
QUERIES = (("DEB", 0), ("R/B", 1))     # (NAME=, kind): 0 debris, 1 rocket body
PAUSE_S = 3.0                           # between the two requests; CelesTrak asks for politeness
SATCAT_ID = "celestrak-satcat"
ATTRIBUTION = "Orbital data: CelesTrak (T. S. Kelso)"
LICENCE = "Free to use under CelesTrak's usage policy (no licence text; the rate limits are enforced)"
MIN_KEEP = 0.8                          # a build with under this share of the last one's objects is refused

U32 = 4294967295
SCHEMA = [
    {"name": "id", "type": "u32"},
    {"name": "epoch", "type": "f64", "unit": "seconds since 2000-01-01T00:00:00Z"},
    {"name": "n", "type": "f64", "unit": "revolutions per day"},
    {"name": "ecc", "type": "u32", "scale": 1 / 4294967296},
    {"name": "inc", "type": "u32", "scale": 180 / U32, "unit": "degrees"},
    {"name": "raan", "type": "u32", "scale": 360 / 4294967296, "unit": "degrees"},
    {"name": "argp", "type": "u32", "scale": 360 / 4294967296, "unit": "degrees"},
    {"name": "ma", "type": "u32", "scale": 360 / 4294967296, "unit": "degrees"},
    {"name": "bstar", "type": "f32"},
    {"name": "ndot", "type": "f32", "unit": "revolutions per day squared"},
    {"name": "kind", "type": "u8", "classes": ["debris", "rocket"]},
]
SPEC = {
    "id": "tracked",
    "title": "Tracked debris and rocket bodies, by their own elements",
    "schema": SCHEMA,
    "id_field": "id",
    "name_field": "name",
    "partition": {"kind": "bands", "field": "alt_km", "edges": [600, 1000, 2000, 34000, 37600]},
    "rank": {"field": "size_rank", "cuts": [1, 2],
             "note": "0 rocket body or radar cross-section 1 m2 or more; 1 from 0.1 to 1 m2; 2 smaller or not measured"},
    "source": "CelesTrak GP (NAME=DEB and NAME=R/B), radar cross-sections from CelesTrak SATCAT",
    "licence": LICENCE,
    "attribution": ATTRIBUTION,
    "classes": ["debris", "rocket"],
}
EARTH_RADIUS_KM = 6378.137
MU = 398600.4418


def epoch_seconds(iso: str) -> float:
    """A GP EPOCH ("2026-11-02T11:41:41.815392", UTC) as seconds since 2000-01-01."""
    text = iso.strip().replace("Z", "")
    head, dot, frac = text.partition(".")
    dt = datetime.fromisoformat(head + (dot + (frac + "000000")[:6] if dot else ""))    # 3.9 wants 3 or 6 digits
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (dt - tilepack.EPOCH_2000).total_seconds()


def satcat_index(csv_text: str | None) -> dict[int, dict]:
    """NORAD id -> {type, rcs} for the rows of SATCAT that are still in orbit."""
    out: dict[int, dict] = {}
    if not csv_text:
        return out
    for row in csv.DictReader(io.StringIO(csv_text)):
        try:
            nid = int(row["NORAD_CAT_ID"])
        except (KeyError, TypeError, ValueError):
            continue
        try:
            rcs = float(row.get("RCS") or "")
        except ValueError:
            rcs = None
        out[nid] = {"type": (row.get("OBJECT_TYPE") or "").strip(), "rcs": rcs}
    return out


def size_rank(kind: int, rcs: float | None) -> int:
    if kind == 1 or (rcs is not None and rcs >= 1.0):
        return 0
    if rcs is not None and rcs >= 0.1:
        return 1
    return 2


def rows_from(gp: dict[int, list[dict]], satcat: dict[int, dict]) -> list[dict]:
    """The build's rows. `gp` maps a kind (0 debris, 1 rocket body) to CelesTrak's element sets (GP JSON objects).

    An object is kept once (the first kind that names it), only when SATCAT, where it has the object, agrees it is
    debris or a rocket body (a payload whose name contains "DEB" is not debris), and only when its elements are usable
    (a mean motion that puts it above the ground).
    """
    want = {0: "DEB", 1: "R/B"}
    seen: dict[int, dict] = {}
    for kind in sorted(gp):
        for e in gp[kind]:
            try:
                nid = int(e["NORAD_CAT_ID"])
                n = float(e["MEAN_MOTION"])
                ecc = float(e["ECCENTRICITY"])
                if nid in seen or not (0.0 <= ecc < 1.0) or not n > 0:
                    continue
                known = satcat.get(nid)
                if known and known["type"] and known["type"] != want[kind]:
                    continue
                a_km = (MU ** (1 / 3)) * ((86400.0 / (2 * 3.141592653589793 * n)) ** (2 / 3))
                if a_km * (1 - ecc) < EARTH_RADIUS_KM:
                    continue
                rcs = known["rcs"] if known else None
                seen[nid] = {
                    "id": nid,
                    "epoch": epoch_seconds(e["EPOCH"]),
                    "n": n,
                    "ecc": ecc,
                    "inc": min(180.0, max(0.0, float(e["INCLINATION"]))),
                    "raan": float(e["RA_OF_ASC_NODE"]) % 360.0,
                    "argp": float(e["ARG_OF_PERICENTER"]) % 360.0,
                    "ma": float(e["MEAN_ANOMALY"]) % 360.0,
                    "bstar": float(e.get("BSTAR") or 0.0),
                    "ndot": float(e.get("MEAN_MOTION_DOT") or 0.0),
                    "kind": kind,
                    "name": str(e.get("OBJECT_NAME") or f"#{nid}").strip(),
                    "alt_km": a_km - EARTH_RADIUS_KM,
                    "size_rank": size_rank(kind, rcs),
                }
            except (KeyError, TypeError, ValueError):
                continue
    return list(seen.values())


def build(*, store, now: datetime, fetcher=_fetch.get, sleep=time.sleep, log=print) -> dict[str, bytes] | None:
    """Fetch, cut and return the files, or None (said in the log) when CelesTrak did not answer usably."""
    gp: dict[int, list[dict]] = {}
    for i, (name, kind) in enumerate(QUERIES):
        if i:
            sleep(PAUSE_S)
        try:
            r = fetcher(GP_URL.format(name=name.replace("/", "%2F")), timeout=40, retries=0)
        except _fetch.FetchError as e:
            log(f"    tracked: {name}: {e}")
            return None
        if r.status != 200:
            log(f"    tracked: {name}: HTTP {r.status}")
            return None
        try:
            doc = json.loads(r.body)
        except ValueError:
            log(f"    tracked: {name}: the answer is not JSON (CelesTrak says: {r.text[:80]!r})")
            return None
        if not isinstance(doc, list):
            log(f"    tracked: {name}: the answer is not a list of element sets")
            return None
        gp[kind] = doc
    satcat = satcat_index(_satcat_text(store))
    rows = rows_from(gp, satcat)
    if not rows:
        log("    tracked: no usable element set")
        return None
    spec = dict(SPEC)
    spec["stats"] = {
        "debris": sum(1 for r in rows if r["kind"] == 0),
        "rocket": sum(1 for r in rows if r["kind"] == 1),
        "with_rcs": sum(1 for r in rows if satcat.get(r["id"], {}).get("rcs") is not None),
        "epoch_max": max(r["epoch"] for r in rows),
    }
    files = tilepack.build_set(spec, rows, now)
    return files


def _satcat_text(store) -> str | None:
    from . import snapshot as snap
    doc = snap.read_snapshot(store, SATCAT_ID)
    body = doc.get("body") if doc else None
    return body if isinstance(body, str) else None
