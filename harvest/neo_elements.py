"""Orbital elements for the close approaches, asked of JPL Horizons at an epoch next to each approach (internal #392).

SBDB's osculating elements are for ITS epoch (months before the approach for a newly found object), and a two-body orbit
from there cannot hold a slow encounter: 2026 QQ8 was drawn at 16.7 lunar distances on 8 December against CAD's 3.5 on
13 December. Horizons will give osculating elements at any epoch, so for the few objects of the close-approach list the
published `jpl-sbdb-neo.json` row has its e, a, q, i, om, w, ma and epoch replaced by Horizons' at the approach's own
instant (heliocentric, ecliptic J2000, AU and degrees, the units of the SBDB row). The app is not told: the row has the
shape it always had, and `parseNeoApproaches` reads it as before.

Fail-soft in every direction: an object Horizons does not answer for, answers oddly for, or has no time for keeps its SBDB
row, and nothing here raises. At most MAX_OBJECTS requests, one at a time, stopping at `budget_s`.
"""

from __future__ import annotations

import math
import re
import time
import urllib.parse

from . import fetch as _fetch

HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"
MAX_OBJECTS = 40
BUDGET_S = 120.0
TIMEOUT_S = 20
FIELDS = ("e", "a", "q", "i", "om", "w", "ma", "epoch")
SOE, EOE = "$$SOE", "$$EOE"
# Horizons' CSV row for EPHEM_TYPE=ELEMENTS, OUT_UNITS=AU-D: JDTDB, calendar, EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR.
COLUMNS = {"jd": 0, "e": 2, "q": 3, "i": 4, "om": 5, "w": 6, "ma": 9, "a": 11}


def request_url(des: str, jd_tdb: float) -> str:
    q = {
        "format": "text", "COMMAND": f"'DES={des};'", "OBJ_DATA": "NO", "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "ELEMENTS", "CENTER": "'500@10'", "REF_PLANE": "ECLIPTIC", "REF_SYSTEM": "ICRF",
        "TLIST": f"'{jd_tdb:.6f}'", "TLIST_TYPE": "JD", "OUT_UNITS": "AU-D", "CSV_FORMAT": "YES",
    }
    return HORIZONS_URL + "?" + urllib.parse.urlencode(q, quote_via=urllib.parse.quote)


def parse_elements(text: str, jd_tdb: float) -> dict | None:
    """{e, a, q, i, om, w, ma, epoch} as strings in SBDB's units from a Horizons ELEMENTS answer, or None if it is not
    one clean elliptic row at `jd_tdb` (a hyperbolic orbit has no positive a, which the app cannot draw; it keeps SBDB's)."""
    if not isinstance(text, str):
        return None
    a, b = text.find(SOE), text.find(EOE)
    if a < 0 or b < a:
        return None
    lines = [ln for ln in text[a + len(SOE):b].splitlines() if ln.strip()]
    if len(lines) != 1:
        return None
    cells = [c.strip() for c in lines[0].split(",")]
    try:
        v = {k: float(cells[i]) for k, i in COLUMNS.items()}
    except (ValueError, IndexError):
        return None
    if not all(math.isfinite(x) for x in v.values()) or abs(v["jd"] - jd_tdb) > 1e-3:
        return None
    if not (0 <= v["e"] < 1 and v["a"] > 0 and v["q"] > 0):
        return None
    out = {k: cells[COLUMNS[k]] for k in FIELDS if k != "epoch"}
    out["epoch"] = cells[COLUMNS["jd"]]
    return out


def first_approaches(cad_body: dict) -> dict[str, float]:
    """designation -> the TDB Julian date of its first listed approach (the one parseNeoApproaches draws)."""
    f = cad_body["fields"]
    di, ji = f.index("des"), f.index("jd")
    out: dict[str, float] = {}
    for r in cad_body.get("data") or []:
        try:
            out.setdefault(str(r[di]).strip(), float(r[ji]))
        except (TypeError, ValueError):
            continue
    return out


def refine_body(neo_body: dict, cad_body: dict, fetcher=_fetch.get, *, budget_s: float = BUDGET_S,
                clock=time.monotonic, log=print) -> tuple[dict, int]:
    """(`neo_body` with the elements of each listed object replaced by Horizons' at its approach, how many were)."""
    from .publish import sbdb_keys           # publish imports this module lazily; no cycle at import time
    f = neo_body["fields"]
    idx = {k: f.index(k) for k in ("full_name", *FIELDS) if k in f}
    if len(idx) != len(FIELDS) + 1:
        return neo_body, 0
    wanted = first_approaches(cad_body)
    start = clock()
    done = 0
    rows = []
    for row in neo_body.get("data") or []:
        keys = [k for k in sbdb_keys(row[idx["full_name"]]) if k in wanted]
        if not keys or done >= MAX_OBJECTS or clock() - start > budget_s:
            rows.append(row)
            continue
        des, jd = keys[0], wanted[keys[0]]
        got = None
        try:
            r = fetcher(request_url(des, jd), timeout=TIMEOUT_S, retries=0)
            got = parse_elements(r.text, jd) if r.status == 200 else None
        except Exception as e:                # a dead host, a timeout: this object keeps its SBDB row
            log(f"    {des}: Horizons elements not had ({str(e)[:80]}); SBDB's row stays")
        if got is None:
            rows.append(row)
            continue
        new = list(row)
        for k in FIELDS:
            new[idx[k]] = got[k]
        rows.append(new)
        done += 1
    out = dict(neo_body)
    out["data"] = rows
    return out, done
