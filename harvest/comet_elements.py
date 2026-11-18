"""Orbital elements for the comets that matter, asked of JPL Horizons at a recent epoch (internal #393).

SBDB's osculating elements are for ITS epoch, which for a periodic comet is the last apparition's perihelion or a date years
back (2P/Encke 2023, 21P/Giacobini-Zinner 2017, 13P/Olbers 2020), and a two-body orbit from there drifts by the planets' pull:
tests/test_comet_reference.mjs measured 0.355 deg for 21P and 0.180 deg for Olbers against Horizons even at full precision.
Horizons gives osculating elements at any epoch, so for a short list the published `jpl-sbdb-comets.json` row has its
e, a, q, i, om, w, ma, tp and epoch replaced by Horizons' at the start of the day of the run (heliocentric, ecliptic J2000,
AU, degrees and Julian dates, the units of the SBDB row). The app is not told: the row has the shape it always had.

THE SHORT LIST, not the 4 077. The comets the app draws by name (FAMOUS, mirrored from site/js/scene/cometfield.js, less the
two whose rows site/js/data/sample.js keeps by hand; ALSO adds the parents of the showers it features and the review's comets) and the BRIGHTEST_NOW brightest in the sky now, ranked by the same law the
layer ranks them by (data/layers.js cometMagNow: m = M1 + 15 log10 r, r from the feed's own elements). At most MAX_OBJECTS.

HYPERBOLIC ORBITS are taken: an osculating hyperbola (e > 1, a < 0) is what Horizons gives a comet on an open orbit, and
parseComets reads q and e and takes a from them (propagate/kepler.js has the hyperbolic branch). A row is refused, and the SBDB
row stays, when it is not one clean row at the requested instant, when q or e is not a finite positive number, or when the
orbit is parabolic to 1e-9 (Horizons would give a = infinity).

Fail-soft in every direction, as neo_elements.py: a comet Horizons does not answer for, answers oddly for, or has no time for
keeps its SBDB row, and nothing here raises. One request at a time, stopping at `budget_s`.
"""

from __future__ import annotations

import math
import re
import time
import urllib.parse
from datetime import datetime, timezone

from . import fetch as _fetch

HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"
MAX_OBJECTS = 40
BRIGHTEST_NOW = 24
BUDGET_S = 150.0
TIMEOUT_S = 20
FIELDS = ("e", "a", "q", "i", "om", "w", "ma", "tp", "epoch")
SOE, EOE = "$$SOE", "$$EOE"
# Horizons' CSV row for EPHEM_TYPE=ELEMENTS, OUT_UNITS=AU-D: JDTDB, calendar, EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR.
COLUMNS = {"jd": 0, "e": 2, "q": 3, "i": 4, "om": 5, "w": 6, "tp": 7, "ma": 9, "a": 11}
# site/js/scene/cometfield.js FAMOUS, by designation as the feed's full_name starts it (tests/test_harvest_comet_elements.py holds the two together).
FAMOUS = ["1P/", "C/1995 O1", "C/2020 F3", "C/1996 B2", "C/2023 A3", "67P/", "2P/", "109P/", "12P/", "C/2011 W3", "C/2012 S1",
          "C/2022 E3", "C/2025 N1", "C/2021 A1", "C/2006 P1", "17P/"]
# Comets the app names elsewhere or the review of 16 Nov measured, which FAMOUS leaves out: the parents of the showers it features (registry/showers.yaml:
# 21P Draconids, 55P Leonids, 8P Ursids; 2P and 109P are in FAMOUS) and the review's other periodic comets (13P Olbers, 46P Wirtanen).
ALSO = ["21P/", "55P/", "8P/", "13P/", "46P/"]
HAND_KEPT = ("1P/", "67P/")      # site/js/data/sample.js namedComets(): the app draws these from its own rows, not the feed's
GAUSS_K = 0.01720209895          # Gaussian gravitational constant, rad/day for a = 1 au
TT_MINUS_UT_S = 69.2             # TDB is within 2 ms of TT; only labels the instant, nothing downstream is sensitive to it


def epoch_jd_tdb(now: datetime) -> float:
    """The TDB Julian date of 00:00 UT on the day of `now`."""
    d = now.astimezone(timezone.utc).date()
    jd_ut = d.toordinal() + 1721424.5          # proleptic Gregorian ordinal 1 = 0001-01-01 = JD 1721423.5; this is that day's 00:00 UT
    return jd_ut + TT_MINUS_UT_S / 86400.0


def request_url(des: str, jd_tdb: float) -> str:
    q = {
        "format": "text", "COMMAND": f"'DES={des};CAP;NOFRAG'", "OBJ_DATA": "NO", "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "ELEMENTS", "CENTER": "'500@10'", "REF_PLANE": "ECLIPTIC", "REF_SYSTEM": "ICRF",
        "TLIST": f"'{jd_tdb:.6f}'", "TLIST_TYPE": "JD", "OUT_UNITS": "AU-D", "CSV_FORMAT": "YES",
    }
    return HORIZONS_URL + "?" + urllib.parse.urlencode(q, quote_via=urllib.parse.quote)


def parse_elements(text: str, jd_tdb: float) -> dict | None:
    """{e, a, q, i, om, w, ma, tp, epoch} as strings in SBDB's units from a Horizons ELEMENTS answer, or None if it is not
    one clean row at `jd_tdb` with a finite eccentricity, perihelion distance and perihelion time (an ellipse or a hyperbola)."""
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
    if not (v["e"] >= 0 and v["q"] > 0) or abs(1 - v["e"]) < 1e-9:
        return None
    if (v["e"] < 1) != (v["a"] > 0):             # an ellipse has a > 0 and a hyperbola a < 0; anything else is not an orbit
        return None
    out = {k: cells[COLUMNS[k]] for k in FIELDS if k != "epoch"}
    out["epoch"] = cells[COLUMNS["jd"]]
    return out


def designation(full_name) -> str | None:
    """The string Horizons' DES= takes: "2P" from "     2P/Encke", "C/2023 A3" from "    C/2023 A3 (Tsuchinshan-ATLAS)"."""
    fn = str(full_name or "").strip()
    m = re.match(r"^(\d+[PDI])/", fn)
    if m:
        return m.group(1)
    m = re.match(r"^([CPDXAI]/-?\d{3,4} [A-Z]{1,2}\d*(?:-[A-Z]+)?)", fn)
    return m.group(1) if m else None


def rank_mag(row: dict, jd: float) -> float | None:
    """The layer's ordering law (data/layers.js cometMagNow): M1 + 15 log10(max(r, 0.05)), r in au from the row's own elements."""
    try:
        m1, e, q, tp = (float(row[k]) for k in ("M1", "e", "q", "tp"))
    except (TypeError, ValueError, KeyError):
        return None
    if not (q > 0 and e >= 0) or abs(1 - e) < 1e-9:
        return None
    a = q / (1 - e)
    n = GAUSS_K / abs(a) ** 1.5
    mean = n * (jd - tp)
    if e < 1:
        mean = (mean + math.pi) % (2 * math.pi) - math.pi
        big = mean + e * math.sin(mean) if e < 0.8 else math.pi
        for _ in range(60):
            big -= (big - e * math.sin(big) - mean) / (1 - e * math.cos(big))
        r = a * (1 - e * math.cos(big))
    else:
        h = math.asinh(mean / e) if abs(mean) > 1e-12 else 0.0
        for _ in range(80):
            h -= (e * math.sinh(h) - h - mean) / (e * math.cosh(h) - 1)
        r = abs(a) * (e * math.cosh(h) - 1)
    if not math.isfinite(r) or r <= 0:
        return None
    return m1 + 15 * math.log10(max(r, 0.05))


def short_list(body: dict, jd: float) -> list[tuple[int, str]]:
    """[(row index, designation)]: the famous comets of the feed first (in FAMOUS' order), then the brightest now, at most MAX_OBJECTS."""
    f = body["fields"]
    names = [str(r[f.index("full_name")]) for r in body.get("data") or []]
    picked: list[int] = []
    for prefix in FAMOUS + ALSO:
        if prefix in HAND_KEPT:
            continue
        for i, n in enumerate(names):
            if n.strip().startswith(prefix) and i not in picked:
                picked.append(i)
                break
    ranked = []
    for i, r in enumerate(body.get("data") or []):
        if i in picked or names[i].strip().startswith(HAND_KEPT):
            continue
        m = rank_mag(dict(zip(f, r)), jd)
        if m is not None:
            ranked.append((m, i))
    ranked.sort()
    picked += [i for _, i in ranked[:BRIGHTEST_NOW]]
    out = []
    for i in picked[:MAX_OBJECTS]:
        d = designation(names[i])
        if d:
            out.append((i, d))
    return out


def refine_body(body: dict, now: datetime, fetcher=_fetch.get, *, budget_s: float = BUDGET_S,
                clock=time.monotonic, log=print) -> tuple[dict, int]:
    """(`body` with the elements of the short list replaced by Horizons' at the start of today's UT day, how many were)."""
    f = body.get("fields") or []
    if any(k not in f for k in ("full_name", *FIELDS, "M1")):
        return body, 0
    jd = epoch_jd_tdb(now)
    idx = {k: f.index(k) for k in FIELDS}
    rows = [list(r) for r in body.get("data") or []]
    start, done = clock(), 0
    for i, des in short_list({"fields": f, "data": rows}, jd):
        if clock() - start > budget_s:
            break
        got = None
        try:
            r = fetcher(request_url(des, jd), timeout=TIMEOUT_S, retries=0)
            got = parse_elements(r.text, jd) if r.status == 200 else None
        except Exception as e:                # a dead host, a timeout: this comet keeps its SBDB row
            log(f"    {des}: Horizons elements not had ({str(e)[:80]}); SBDB's row stays")
        if got is None:
            continue
        for k in FIELDS:
            rows[i][idx[k]] = got[k]
        done += 1
    out = dict(body)
    out["data"] = rows
    return out, done
