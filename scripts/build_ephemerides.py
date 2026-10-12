#!/usr/bin/env python3
"""Fetch a craft's whole path from JPL Horizons and pack it small (internal #277, #406).

registry/ephemerides.yaml names the craft, the span, and the stretches kept relative to a world.
This script asks Horizons for state vectors (ecliptic J2000, km and km/s, times in UTC), keeps as
few as the row's tolerance allows, and writes

    site/data/eph/<id>.bin          the kept samples (the format is below)
    site/data/eph/manifest.json     span, step table, source, day retrieved, Horizons id, the
                                    solution string Horizons printed, bytes, sha256, the errors
    site/js/data/ephemerides.js     the part of the manifest a browser needs (never at boot)
    tests/fixtures/eph_heldout.json Horizons positions at times NOT used to build the file

Run:  python3 scripts/build_ephemerides.py --fetch [--only id,id] [--cache DIR] [--cafile PEM]
      python3 scripts/build_ephemerides.py --check      # no network; CI runs this
      python3 scripts/build_ephemerides.py --table      # the craft x span x bytes x error table

HOW FEW SAMPLES. The browser joins two samples with a cubic Hermite curve (it has the velocities),
whose error falls with the fourth power of the step. So the step is adaptive: a grid at one day
(one hour inside a window), and wherever the curve through every other point misses the point
between by more than the tolerance, a finer grid there, down to one minute. Then
a greedy pass keeps the longest stretches whose curve stays within `tol_km` of every fetched
point it skips. A flyby ends up sampled in minutes and a decade of cruise in months.

HOW GOOD. Two numbers a craft, both in the manifest. `fit_max_km`: the worst miss against the
fetched points that were dropped. `heldout.max_km`: the worst miss against positions asked of
Horizons afterwards at times of no grid (seeded, a third of them within hours of each window's
closest pass). `good_to_km`, the figure the card prints, is the larger of the two, half as much
again, rounded up to 1, 2 or 5 of its decade. It is how well the file follows JPL's own track,
which is not the same as how well JPL knows the track: `rough` in the registry carries what
Horizons' header says about that, and the card prints it.

THE FILE (little-endian).
    "SREP"  u8 version=1  u8 segments  u16 0
    per segment, 24 bytes:  u8 centre (index into CENTRES)  u8 posType (0 float64, 1 float32)
                            u16 0  u32 count  f64 t0 (unix seconds, UTC)  f64 0
    then per segment, in order:  u32 seconds-after-t0 [count]
                                 position xyz, km [count*3] (float64 round the Sun, float32
                                 round a world: 0.6 km at ten million km)
                                 velocity xyz, km/s, float32 [count*3]
Positions are relative to the segment's centre, on ecliptic J2000 axes.

CERTIFICATES. Horizons' certificate chains to a root (Sectigo R46) that an old system store does
not hold; python then refuses it, correctly. Give a current bundle with --cafile or SSL_CERT_FILE
(certifi's is one). This script never turns verification off.

DATA TERMS. JPL Horizons output is a work of the US government (NASA/JPL-Caltech), free to use
with credit; CREDITS.md carries the line.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import os
import random
import re
import ssl
import struct
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "registry" / "ephemerides.yaml"
OUT_DIR = ROOT / "site" / "data" / "eph"
MANIFEST = OUT_DIR / "manifest.json"
MIRROR = ROOT / "site" / "js" / "data" / "ephemerides.js"
HELDOUT = ROOT / "tests" / "fixtures" / "eph_heldout.json"
MISSIONS = ROOT / "registry" / "missions.yaml"

# The index in this list is the centre byte in the file. Append only.
CENTRES = ["sun", "mercury", "venus", "earth", "moon", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]
HORIZONS_CENTRE = {
    "sun": "500@10", "mercury": "500@199", "venus": "500@299", "earth": "500@399", "moon": "500@301",
    "mars": "500@499", "jupiter": "500@599", "saturn": "500@699", "uranus": "500@799",
    "neptune": "500@899", "pluto": "500@999",
}
LEVELS = [86400, 21600, 3600, 900, 300, 60]  # seconds; each divides the one before
STEP_WORD = {86400: "1 d", 21600: "6 h", 3600: "1 h", 900: "15 m", 300: "5 m", 60: "1 m"}
MAX_ROWS = 40000
MAX_KNOT_GAP_S = 400 * 86400  # no two kept samples further apart than this, whatever the fit
HELDOUT_N = 48
MAGIC = b"SREP"


# ------------------------------------------------------------------------------------------ time

def parse_iso(text: str) -> int:
    """'1979-03-05T12:05:00Z' -> unix seconds. Whole minutes only: the grids are minutes of UTC."""
    m = re.fullmatch(r"(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)Z", str(text))
    if not m:
        raise ValueError(f"not a UTC instant like 1979-03-05T12:05:00Z: {text!r}")
    y, mo, d, h, mi, s = (int(g) for g in m.groups())
    t = int(dt.datetime(y, mo, d, h, mi, s, tzinfo=dt.timezone.utc).timestamp())
    if t % 60:
        raise ValueError(f"{text!r} is not on a whole minute")
    return t


def iso(t: float) -> str:
    return dt.datetime.fromtimestamp(int(round(t)), dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def horizons_time(t: int) -> str:
    return dt.datetime.fromtimestamp(t, dt.timezone.utc).strftime("%Y-%m-%d %H:%M")


def jd_of(t: float) -> float:
    return t / 86400.0 + 2440587.5


# ------------------------------------------------------------------------------------- registry

class Refusal(Exception):
    pass


def load_registry(path: Path = REGISTRY) -> dict:
    doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    where = path.name
    if doc.get("version") != 1:
        raise Refusal(f"{where}: version must be 1")
    src = doc.get("source") or {}
    for key in ("name", "api", "terms", "credit"):
        if not src.get(key):
            raise Refusal(f"{where}: source.{key} is missing; a file with no stated source does not ship")
    if not str(src["api"]).startswith("https://ssd.jpl.nasa.gov/"):
        raise Refusal(f"{where}: source.api must be JPL's own (https://ssd.jpl.nasa.gov/...), not {src['api']!r}")
    defaults = doc.get("defaults") or {}
    seen = set()
    craft = []
    for row in doc.get("craft") or []:
        cid = row.get("id")
        at = f"{where}: craft {cid!r}"
        if not cid or not re.fullmatch(r"[a-z0-9-]+", str(cid)):
            raise Refusal(f"{at}: id must be a plain record id")
        if cid in seen:
            raise Refusal(f"{at}: listed twice")
        seen.add(cid)
        unknown = set(row) - {"id", "name", "command", "from", "to", "tol_km", "windows", "rough", "max_bytes", "max_bytes_why"}
        if unknown:
            raise Refusal(f"{at}: unknown field {sorted(unknown)[0]!r}")
        if not row.get("name") or not row.get("command"):
            raise Refusal(f"{at}: needs a name and a Horizons command")
        try:
            a, b = parse_iso(row.get("from")), parse_iso(row.get("to"))
        except ValueError as e:
            raise Refusal(f"{at}: {e}")
        if b <= a:
            raise Refusal(f"{at}: `to` is not after `from`")
        tol = float(row.get("tol_km", defaults.get("tol_km", 5)))
        if not 0 < tol <= 1000:
            raise Refusal(f"{at}: tol_km {tol} is outside 0..1000")
        max_bytes = int(row.get("max_bytes", defaults.get("max_bytes", 150000)))
        if max_bytes > int(defaults.get("max_bytes", 150000)) and not row.get("max_bytes_why"):
            raise Refusal(f"{at}: max_bytes {max_bytes} is over the default and gives no max_bytes_why")
        windows = []
        last = a
        for w in row.get("windows") or []:
            centre = w.get("centre")
            if centre not in CENTRES or centre == "sun":
                raise Refusal(f"{at}: window centre {centre!r} is not a world this format knows ({', '.join(CENTRES[1:])})")
            try:
                wa, wb = parse_iso(w.get("from")), parse_iso(w.get("to"))
            except ValueError as e:
                raise Refusal(f"{at}: window at {centre}: {e}")
            if wa < last or wb <= wa or wb > b:
                raise Refusal(f"{at}: window at {centre} from {w.get('from')} is out of order, overlaps the one before, or leaves the span")
            wtol = float(w.get("tol_km", defaults.get("window_tol_km", 1)))
            if not 0 < wtol <= 1000:
                raise Refusal(f"{at}: window at {centre}: tol_km {wtol} is outside 0..1000")
            windows.append({"centre": centre, "from": wa, "to": wb, "tol_km": wtol})
            last = wb
        rough = row.get("rough")
        if rough is not None:
            if not isinstance(rough, dict) or not rough.get("text") or not rough.get("until"):
                raise Refusal(f"{at}: rough needs `until` and `text`")
            try:
                parse_iso(rough["until"])
            except ValueError as e:
                raise Refusal(f"{at}: rough.until: {e}")
            if len(rough["text"]) > 200 or not rough["text"].endswith("."):
                raise Refusal(f"{at}: rough.text is one sentence of 200 characters at most, ending in a full stop")
        # the segments: the windows, and the Sun between them
        segments = []
        cursor = a
        for w in windows:
            if w["from"] > cursor:
                segments.append({"centre": "sun", "from": cursor, "to": w["from"], "tol_km": tol})
            segments.append(dict(w))
            cursor = w["to"]
        if cursor < b:
            segments.append({"centre": "sun", "from": cursor, "to": b, "tol_km": tol})
        if len(segments) > 255:
            raise Refusal(f"{at}: more than 255 segments")
        craft.append({
            "id": cid, "name": row["name"], "command": str(row["command"]), "from": a, "to": b,
            "segments": segments, "rough": rough, "max_bytes": max_bytes,
        })
    if not craft:
        raise Refusal(f"{where}: no craft")
    return {"source": src, "craft": craft, "total_max_bytes": int(doc.get("total_max_bytes", 2000000))}


# -------------------------------------------------------------------------------------- Horizons

class Horizons:
    def __init__(self, api: str, cache: Path | None, cafile: str | None):
        self.api = api
        self.cache = cache
        if cache:
            cache.mkdir(parents=True, exist_ok=True)
        if not cafile:
            cafile = os.environ.get("SSL_CERT_FILE")
        if not cafile:
            try:
                import certifi  # a current bundle, when it is installed
                cafile = certifi.where()
            except ImportError:
                cafile = None
        self.ctx = ssl.create_default_context(cafile=cafile)  # verification stays on, always
        self.requests = 0
        self.last = 0.0

    def get(self, params: dict) -> str:
        query = urllib.parse.urlencode({k: (v if k == "format" else f"'{v}'") for k, v in params.items()})
        key = hashlib.sha256(query.encode()).hexdigest()[:24]
        hit = self.cache / f"{key}.txt" if self.cache else None
        if hit and hit.exists():
            return hit.read_text(encoding="utf-8")
        url = f"{self.api}?{query}"
        err = None
        for attempt in range(6):
            wait = 0.35 - (time.time() - self.last)
            if wait > 0:
                time.sleep(wait)
            try:
                self.last = time.time()
                with urllib.request.urlopen(url, timeout=180, context=self.ctx) as r:
                    text = r.read().decode("utf-8", "replace")
                self.requests += 1
                header = "MAKE_EPHEM" in params and params["MAKE_EPHEM"] == "NO" and "JPL/HORIZONS" in text
                if "$$SOE" in text or "No ephemeris" in text or "Revised" in text or header:
                    if hit and ("$$SOE" in text or "Revised" in text or header):
                        hit.write_text(text, encoding="utf-8")
                    return text
                err = text[-400:]
            except Exception as e:  # noqa: BLE001 (a refused certificate lands here too, and is not retried into)
                if isinstance(e, ssl.SSLError) or "CERTIFICATE_VERIFY_FAILED" in str(e):
                    raise SystemExit(
                        "Horizons' certificate was refused. Give a current CA bundle with --cafile or "
                        f"SSL_CERT_FILE (certifi has one). Verification is not switched off.\n  {e}")
                err = repr(e)
            time.sleep(2 + 3 * attempt)
        raise SystemExit(f"Horizons did not answer: {err}")

    def vectors(self, command: str, centre: str, **when) -> tuple[list, dict]:
        params = {
            "format": "text", "COMMAND": command, "OBJ_DATA": "NO", "MAKE_EPHEM": "YES",
            "EPHEM_TYPE": "VECTORS", "CENTER": HORIZONS_CENTRE[centre], "VEC_TABLE": "2",
            "REF_PLANE": "ECLIPTIC", "REF_SYSTEM": "ICRF", "OUT_UNITS": "KM-S", "CSV_FORMAT": "YES",
            "TIME_TYPE": "UT",
        }
        params.update(when)
        text = self.get(params)
        if "$$SOE" not in text:
            tail = [ln for ln in text.splitlines() if ln.strip()][-1:]
            raise SystemExit(f"Horizons gave no table for {command} @ {centre} {when}: {tail}")
        head = text.split("$$SOE", 1)[0]
        if "JDUT" not in head:
            raise SystemExit("Horizons did not answer in UT; the times would be 69 s out")
        info = {}
        m = re.search(r"Target body name:.*\{source: ([^}]*)\}", head)
        if m:
            info["target_source"] = m.group(1).strip()
        m = re.search(r"Center body name:.*\{source: ([^}]*)\}", head)
        if m:
            info["centre_source"] = m.group(1).strip()
        rows = []
        for line in text.split("$$SOE", 1)[1].split("$$EOE", 1)[0].splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 8:
                continue
            jd = float(parts[0])
            rows.append(((jd - 2440587.5) * 86400.0, *[float(p) for p in parts[2:8]]))
        return rows, info

    def header(self, command: str) -> dict:
        text = self.get({"format": "text", "COMMAND": command, "OBJ_DATA": "YES", "MAKE_EPHEM": "NO"})
        m = re.search(r"Revised\s*:\s*([A-Z][a-z]{2} \d{1,2}, \d{4})", text)
        out = {"revised": m.group(1) if m else None}
        m = re.search(r"JPL/HORIZONS\s+(.*?)\s+\d{4}-[A-Z][a-z]{2}-\d\d", text)
        if m and not out["revised"]:
            out["body"] = m.group(1).strip()
        m = re.search(r"Soln\.date:\s*(\S+)", text)
        if m:
            out["solution_date"] = m.group(1)
        return out


# ------------------------------------------------------------------------------------------ maths

def np():
    import numpy  # only --fetch needs it; --check runs anywhere python and PyYAML do
    return numpy


def hermite_many(ta, pa, va, tb, pb, vb, t):
    """Positions on the cubic Hermite curve from sample a to sample b at times t (numpy)."""
    h = np().asarray(tb - ta, dtype=float)
    s = ((t - ta) / h)[:, None]
    if h.ndim:
        h = h[:, None]
    s2, s3 = s * s, s * s * s
    return (2 * s3 - 3 * s2 + 1) * pa + (s3 - 2 * s2 + s) * h * va + (-2 * s3 + 3 * s2) * pb + (s3 - s2) * h * vb


def hermite_one(ta, pa, va, tb, pb, vb, t):
    """The same curve at one time, without numpy: --check uses this, and it is the browser's sum."""
    h = tb - ta
    s = (t - ta) / h
    s2, s3 = s * s, s * s * s
    h00, h10, h01, h11 = 2 * s3 - 3 * s2 + 1, s3 - 2 * s2 + s, -2 * s3 + 3 * s2, s3 - s2
    return [h00 * pa[i] + h10 * h * va[i] + h01 * pb[i] + h11 * h * vb[i] for i in range(3)]


def nice_ceil(x: float) -> float:
    if x <= 1:
        return 1.0
    e = 10 ** math.floor(math.log10(x))
    for m in (1, 2, 5, 10):
        if x <= m * e * (1 + 1e-9):
            return float(m * e)
    return float(10 * e)


# ---------------------------------------------------------------------------------------- fetching

def fetch_range(hz: Horizons, command: str, centre: str, a: int, b: int, step: int) -> tuple[list, dict]:
    rows, info = [], {}
    t = a
    while t <= b:
        stop = min(b, t + step * (MAX_ROWS - 1))
        if stop == t:
            got, info = hz.vectors(command, centre, TLIST=f"{jd_of(t):.9f}")
        else:
            got, info = hz.vectors(command, centre, START_TIME=horizons_time(t), STOP_TIME=horizons_time(stop), STEP_SIZE=STEP_WORD[step])
        rows.extend(got)
        t = stop + step
    return rows, info


def build_segment(hz: Horizons, command: str, seg: dict, log) -> dict:
    """Fetch a segment adaptively, then keep as few samples as its tolerance allows."""
    n = np()
    centre, a, b, tol = seg["centre"], seg["from"], seg["to"], seg["tol_km"]
    start_level = 0 if centre == "sun" else 2
    if b - a < 4 * LEVELS[start_level]:
        start_level = min(len(LEVELS) - 1, start_level + 2)
    table = {}
    info = {}
    ranges = [(a, b)]
    fetched_rows = 0
    for li in range(start_level, len(LEVELS)):
        step = LEVELS[li]
        nxt = []
        for (ra, rb) in ranges:
            rows, info = fetch_range(hz, command, centre, ra, rb, step)
            fetched_rows += len(rows)
            for r in rows:
                table[int(round(r[0]))] = r[1:]
            # THE TAIL. A grid stepped from `ra` need not land on `rb`: an hourly grid from
            # midnight ends at 20:00 under a segment that stops at 20:30. That last stretch goes
            # to the next finer grid like any stretch in doubt. Without this it was one
            # unexamined half-hour, the half-hour before Mars 2020 reached Mars, and a held-out
            # point in it missed by 38 km on a file fitted to 1 (seen 2026-10-06).
            if rows and li < len(LEVELS) - 1 and int(round(rows[-1][0])) < rb:
                nxt.append((int(round(rows[-1][0])), rb))
            if li == len(LEVELS) - 1 or len(rows) < 3:
                continue
            arr = n.array(rows)
            T, P, V = arr[:, 0], arr[:, 1:4], arr[:, 4:7]
            # the curve through every other point, measured at the point between
            mid = hermite_many(T[:-2], P[:-2], V[:-2], T[2:], P[2:], V[2:], T[1:-1])
            err = n.sqrt(((mid - P[1:-1]) ** 2).sum(axis=1))
            # A step of h is in doubt where a step of 2h misses by more than tol: by h^4 the step
            # h itself then misses by tol/16 at most, IF the curve's fourth derivative is steady
            # across the three points. It is not at the two ends of a range, where a segment
            # stops minutes before an atmosphere (Mars 2020, Cassini) or starts at separation:
            # there the limit is tol/8. (With 4 tol everywhere, a held-out point half an hour
            # before Mars 2020's entry missed by 38 km on a file fitted to 5: seen 2026-10-06.)
            limit = n.full(err.shape, float(tol))
            limit[0] = limit[-1] = tol / 8
            bad = n.nonzero(err > limit)[0]
            for i in bad:
                nxt.append((int(round(T[i])), int(round(T[i + 2]))))
        if not nxt or li == len(LEVELS) - 1:
            break
        # merge ranges that touch or nearly touch: one request is cheaper than two
        nxt.sort()
        gap = 200 * LEVELS[li + 1]
        merged = [list(nxt[0])]
        for ra, rb in nxt[1:]:
            if ra <= merged[-1][1] + gap:
                merged[-1][1] = max(merged[-1][1], rb)
            else:
                merged.append([ra, rb])
        ranges = [(ra, rb) for ra, rb in merged]
    if b not in table:  # the grid from `a` need not land on `b`
        rows, info = fetch_range(hz, command, centre, b, b, 60)
        for r in rows:
            table[int(round(r[0]))] = r[1:]
    times = sorted(t for t in table if a <= t <= b)
    T = n.array(times, dtype=n.float64)
    A = n.array([table[t] for t in times], dtype=n.float64)
    P, V = A[:, 0:3], A[:, 3:6]
    # what the browser will hold: float32 round a world, float32 velocities
    Pq = P.astype(n.float32).astype(n.float64) if centre != "sun" else P
    Vq = V.astype(n.float32).astype(n.float64)

    def ok(i, j):
        if j - i < 2:
            return True
        if T[j] - T[i] > MAX_KNOT_GAP_S:
            return False
        got = hermite_many(T[i], Pq[i], Vq[i], T[j], Pq[j], Vq[j], T[i + 1:j])
        return float(n.sqrt(((got - P[i + 1:j]) ** 2).sum(axis=1)).max()) <= tol

    knots = [0]
    i, last = 0, len(times) - 1
    while i < last:
        lo, k = i + 1, 2
        while i + k <= last and ok(i, i + k):
            lo = i + k
            k *= 2
        hi = min(last, i + k)
        while hi - lo > 1:  # the furthest that still fits, between the last yes and the first no
            m = (lo + hi) // 2
            if ok(i, m):
                lo = m
            else:
                hi = m
        if hi == last and ok(i, last):
            lo = last
        knots.append(lo)
        i = lo
    K = n.array(knots)
    worst = 0.0
    for x, y in zip(knots[:-1], knots[1:]):
        if y - x > 1:
            got = hermite_many(T[x], Pq[x], Vq[x], T[y], Pq[y], Vq[y], T[x + 1:y])
            worst = max(worst, float(n.sqrt(((got - P[x + 1:y]) ** 2).sum(axis=1)).max()))
    gaps = n.diff(T[K]) if len(K) > 1 else n.array([0.0])
    steps = {}
    for label, lo_s, hi_s in (("under 10 min", 0, 600), ("10 min to 1 h", 600, 3600), ("1 h to 6 h", 3600, 21600),
                              ("6 h to 1 d", 21600, 86400), ("1 d to 10 d", 86400, 864000), ("over 10 d", 864000, 1e18)):
        c = int(((gaps >= lo_s) & (gaps < hi_s)).sum())
        if c:
            steps[label] = c
    dist = n.sqrt((P ** 2).sum(axis=1))
    near = int(dist.argmin())
    # every close pass, not only the closest: an orbiter has hundreds, and each is where the
    # curve is hardest. A pass is a local minimum of the distance that is under a third of the
    # segment's median distance.
    inner = n.nonzero((dist[1:-1] < dist[:-2]) & (dist[1:-1] <= dist[2:]) & (dist[1:-1] < n.median(dist) / 3))[0] + 1
    passes = sorted({int(T[i]) for i in inner} | {int(T[near])})
    log(f"    {centre:8s} {iso(a)[:10]}..{iso(b)[:10]}  fetched {fetched_rows:7d}  kept {len(knots):5d}  worst {worst:8.2f} km (tol {tol:g})")
    return {
        "centre": centre, "from": a, "to": b, "tol_km": tol,
        "T": T[K], "P": Pq[K], "V": Vq[K],
        "fit_max_km": worst, "fetched": fetched_rows, "steps": steps,
        "step_min_s": float(gaps.min()), "step_max_s": float(gaps.max()),
        "closest": {"t": int(T[near]), "km": float(dist[near])} if centre != "sun" else None,
        "passes": passes if centre != "sun" else [],
        "target_source": info.get("target_source"), "centre_source": info.get("centre_source"),
    }


def pack(segments: list) -> bytes:
    n = np()
    out = [MAGIC, struct.pack("<BBH", 1, len(segments), 0)]
    for s in segments:
        pos_type = 0 if s["centre"] == "sun" else 1
        out.append(struct.pack("<BBHIdd", CENTRES.index(s["centre"]), pos_type, 0, len(s["T"]), float(s["T"][0]), 0.0))
    for s in segments:
        off = s["T"] - s["T"][0]
        if off.max() >= 2 ** 32 or (off != n.round(off)).any():
            raise SystemExit("a segment's times do not fit whole seconds in a u32")
        out.append(off.astype("<u4").tobytes())
        out.append(s["P"].astype("<f8" if s["centre"] == "sun" else "<f4").tobytes())
        out.append(s["V"].astype("<f4").tobytes())
    return b"".join(out)


def unpack(blob: bytes) -> list:
    """The file back into segments of plain lists. No numpy: --check and the tests read with this."""
    if blob[:4] != MAGIC:
        raise Refusal("not an ephemeris file (no SREP at the start)")
    version, count, _ = struct.unpack_from("<BBH", blob, 4)
    if version != 1:
        raise Refusal(f"ephemeris file version {version}; this reader knows 1")
    heads = []
    at = 8
    for _ in range(count):
        centre, pos_type, _z, cnt, t0, _r = struct.unpack_from("<BBHIdd", blob, at)
        at += 24
        if centre >= len(CENTRES) or pos_type not in (0, 1) or cnt < 2:
            raise Refusal("ephemeris file: a segment header names no centre, an unknown number type, or fewer than two samples")
        heads.append((centre, pos_type, cnt, t0))
    segs = []
    for centre, pos_type, cnt, t0 in heads:
        need = cnt * 4 + cnt * 3 * (8 if pos_type == 0 else 4) + cnt * 12
        if at + need > len(blob):
            raise Refusal("ephemeris file: shorter than its own header says")
        ts = struct.unpack_from(f"<{cnt}I", blob, at); at += cnt * 4
        fmt = "d" if pos_type == 0 else "f"
        ps = struct.unpack_from(f"<{cnt * 3}{fmt}", blob, at); at += cnt * 3 * (8 if pos_type == 0 else 4)
        vs = struct.unpack_from(f"<{cnt * 3}f", blob, at); at += cnt * 12
        segs.append({"centre": CENTRES[centre], "t": [t0 + x for x in ts], "p": ps, "v": vs})
    if at != len(blob):
        raise Refusal("ephemeris file: longer than its own header says")
    return segs


def evaluate(segs: list, t: float):
    """(centre, [x, y, z]) at unix time t, or None outside every segment."""
    import bisect
    for s in segs:
        ts = s["t"]
        if ts[0] <= t <= ts[-1]:
            i = min(len(ts) - 2, max(0, bisect.bisect_right(ts, t) - 1))
            pa, pb = s["p"][3 * i:3 * i + 3], s["p"][3 * i + 3:3 * i + 6]
            va, vb = s["v"][3 * i:3 * i + 3], s["v"][3 * i + 3:3 * i + 6]
            return s["centre"], hermite_one(ts[i], pa, va, ts[i + 1], pb, vb, t)
    return None


def heldout_times(craft: dict, built: list) -> list:
    """Seeded times of no grid: spread over the span, in every window, and close to each pass."""
    rng = random.Random(f"spaceradar-eph-{craft['id']}")
    out = []
    windows = [s for s in built if s["centre"] != "sun"]
    per_window = max(2, (HELDOUT_N // 2) // max(1, len(windows))) if windows else 0
    for s in windows:
        # an orbiter's window has many passes: two times near each, up to 150 of them
        passes = s["passes"] if len(s["passes"]) <= 150 else rng.sample(s["passes"], 150)
        count = max(per_window, 3 * len(passes)) if len(passes) > 1 else per_window
        for k in range(count):
            if k % 3 != 2 and passes:  # within six hours of a close pass, most of them within one
                t = passes[(k // 3) % len(passes)] + rng.uniform(-3600, 3600) * (1 if k % 3 == 0 else 6)
            else:
                t = rng.uniform(s["from"], s["to"])
            out.append((min(s["to"] - 1, max(s["from"] + 1, t)), s["centre"]))
    target = max(HELDOUT_N, len(out) + HELDOUT_N // 2)
    while len(out) < target:
        t = rng.uniform(craft["from"] + 1, craft["to"] - 1)
        seg = next(s for s in built if s["from"] <= t <= s["to"])
        out.append((t, seg["centre"]))
    # whole seconds plus 0.5: never a grid point (the grids are whole minutes)
    return sorted((math.floor(t) + 0.5, c) for t, c in out)


def fetch_heldout(hz: Horizons, craft: dict, built: list) -> list:
    rows = []
    by_centre = {}
    for t, c in heldout_times(craft, built):
        by_centre.setdefault(c, []).append(t)
    for centre, ts in by_centre.items():
        for k in range(0, len(ts), 30):
            chunk = ts[k:k + 30]
            got, _ = hz.vectors(craft["command"], centre, TLIST=" ".join(f"{jd_of(t):.9f}" for t in chunk))
            if len(got) != len(chunk):
                raise SystemExit(f"{craft['id']}: asked Horizons for {len(chunk)} held-out times and got {len(got)}")
            for t, g in zip(chunk, got):
                if abs(g[0] - t) > 0.01:
                    raise SystemExit(f"{craft['id']}: a held-out time came back {g[0] - t:+.3f} s off")
                rows.append([t, centre, g[1], g[2], g[3]])
    return sorted(rows)


def heldout_error(blob: bytes, rows: list) -> float:
    segs = unpack(blob)
    worst = 0.0
    for t, centre, x, y, z in rows:
        got = evaluate(segs, t)
        if not got or got[0] != centre:
            raise Refusal(f"a held-out time ({iso(t)}) falls outside the file, or in a segment round another centre")
        worst = max(worst, math.dist(got[1], (x, y, z)))
    return worst


# ------------------------------------------------------------------------------------- the mirror

MIRROR_HEADER = """// GENERATED from site/data/eph/manifest.json by scripts/build_ephemerides.py. Do not edit.
//
// What a browser needs to know about each craft's own path (internal #277): the file, its span,
// how well it follows JPL's track, and what JPL says of the track itself. `python3
// scripts/build_ephemerides.py --check` fails CI if this file, the manifest and the .bin files
// disagree. Imported by propagate/ephemeris.js, which nothing at boot imports.
"""


def mirror_text(manifest: dict) -> str:
    rows = {}
    for c in manifest["craft"]:
        row = {
            "file": c["file"], "bytes": c["bytes"], "name": c["name"],
            "from": c["span"][0], "to": c["span"][1],
            "goodToKm": c["good_to_km"], "horizonsId": c["command"],
            "solution": c["solution"], "retrieved": manifest["retrieved"],
        }
        if c.get("rough"):
            row["rough"] = {"until": c["rough"]["until"], "text": c["rough"]["text"]}
        rows[c["id"]] = row
    body = json.dumps(rows, indent=2, ensure_ascii=False)
    centres = json.dumps(CENTRES)
    return (f"{MIRROR_HEADER}\n/** The centre byte of a segment, in order. */\nexport const EPH_CENTRES = {centres};\n\n"
            f"/** Record id -> its path file. Times are UTC. */\nexport const EPHEMERIDES = {body};\n")


# ---------------------------------------------------------------------------------------- commands

def cmd_fetch(args) -> int:
    reg = load_registry()
    only = set(args.only.split(",")) if args.only else None
    hz = Horizons(reg["source"]["api"], Path(args.cache) if args.cache else None, args.cafile)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"craft": []}
    old = {c["id"]: c for c in manifest.get("craft", [])}
    held = json.loads(HELDOUT.read_text()) if HELDOUT.exists() else {}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    today = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    out_craft = []
    for craft in reg["craft"]:
        if only and craft["id"] not in only:
            if craft["id"] in old:
                out_craft.append(old[craft["id"]])
            continue
        print(f"{craft['id']} ({craft['command']})", flush=True)
        head = hz.header(craft["command"])
        built = [build_segment(hz, craft["command"], s, lambda m: print(m, flush=True)) for s in craft["segments"]]
        blob = pack(built)
        rows = fetch_heldout(hz, craft, built)
        held_max = heldout_error(blob, rows)
        fit_max = max(s["fit_max_km"] for s in built)
        (OUT_DIR / f"{craft['id']}.bin").write_bytes(blob)
        held[craft["id"]] = rows
        sources = sorted({s["target_source"] for s in built if s["target_source"]})
        entry = {
            "id": craft["id"], "name": craft["name"], "command": craft["command"],
            "file": f"{craft['id']}.bin", "bytes": len(blob), "sha256": hashlib.sha256(blob).hexdigest(),
            "span": [iso(craft["from"]), iso(craft["to"])],
            "samples": int(sum(len(s["T"]) for s in built)),
            "solution": "; ".join(sources) or None,
            "header_revised": head.get("revised"),
            **({"solution_date": head["solution_date"]} if head.get("solution_date") else {}),
            "retrieved": today,
            "fit_max_km": round(fit_max, 3),
            "heldout": {"n": len(rows), "max_km": round(held_max, 3)},
            "good_to_km": nice_ceil(1.5 * max(fit_max, held_max)),
            "segments": [{
                "centre": s["centre"], "from": iso(s["from"]), "to": iso(s["to"]), "samples": int(len(s["T"])),
                "tol_km": s["tol_km"], "fit_max_km": round(s["fit_max_km"], 3), "fetched": s["fetched"],
                "step_min_s": s["step_min_s"], "step_max_s": s["step_max_s"], "steps": s["steps"],
                **({"closest": {"at": iso(s["closest"]["t"]), "km": round(s["closest"]["km"], 1)}, "passes": len(s["passes"])} if s["closest"] else {}),
                "centre_source": s["centre_source"],
            } for s in built],
        }
        if craft["rough"]:
            entry["rough"] = craft["rough"]
        out_craft.append(entry)
        print(f"  {len(blob)} bytes, {entry['samples']} samples, fit {fit_max:.2f} km, held-out {held_max:.2f} km "
              f"-> good to {entry['good_to_km']:g} km  ({hz.requests} requests so far)", flush=True)
    order = [c["id"] for c in reg["craft"]]
    out_craft.sort(key=lambda c: order.index(c["id"]) if c["id"] in order else 999)
    manifest = {
        "version": 1,
        "what": "Each craft's own path, sampled from JPL Horizons and joined by cubic Hermite curves (registry/ephemerides.yaml, scripts/build_ephemerides.py).",
        "source": reg["source"],
        "frame": "ecliptic J2000 axes (Horizons REF_PLANE=ECLIPTIC, REF_SYSTEM=ICRF), relative to each segment's centre; km and km/s; times UTC (TIME_TYPE=UT)",
        "retrieved": max([c["retrieved"] for c in out_craft] or [today]),
        "craft": out_craft,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    HELDOUT.parent.mkdir(parents=True, exist_ok=True)
    HELDOUT.write_text(json.dumps({k: held[k] for k in sorted(held) if k in order}, separators=(",", ":")) + "\n", encoding="utf-8")
    MIRROR.write_text(mirror_text(manifest), encoding="utf-8")
    print(f"wrote {MANIFEST.relative_to(ROOT)}, {MIRROR.relative_to(ROOT)}, {HELDOUT.relative_to(ROOT)}")
    return cmd_check(args)


def check(root: Path = ROOT) -> list:
    """Every disagreement between the registry, the manifest, the files and the mirror. No network."""
    problems = []
    reg_path, out_dir = root / "registry" / "ephemerides.yaml", root / "site" / "data" / "eph"
    try:
        reg = load_registry(reg_path)
    except Refusal as e:
        return [str(e)]
    man_path = out_dir / "manifest.json"
    if not man_path.exists():
        return [f"{man_path.relative_to(root)} is missing: run scripts/build_ephemerides.py --fetch"]
    manifest = json.loads(man_path.read_text(encoding="utf-8"))
    if (manifest.get("source") or {}) != reg["source"]:
        problems.append("manifest.json: its source is not the registry's")
    if not re.fullmatch(r"\d{4}-\d\d-\d\d", str(manifest.get("retrieved"))):
        problems.append("manifest.json: no day retrieved")
    have = {c["id"]: c for c in manifest.get("craft", [])}
    held_path = root / "tests" / "fixtures" / "eph_heldout.json"
    held = json.loads(held_path.read_text(encoding="utf-8")) if held_path.exists() else {}
    total = 0
    for craft in reg["craft"]:
        cid = craft["id"]
        c = have.pop(cid, None)
        if not c:
            problems.append(f"registry/ephemerides.yaml: craft {cid!r} has no row in manifest.json (fetch it, or take the row out)")
            continue
        at = f"manifest.json: {cid}"
        f = out_dir / str(c.get("file"))
        if not f.exists():
            problems.append(f"{at}: its file {c.get('file')} is not in site/data/eph")
            continue
        blob = f.read_bytes()
        total += len(blob)
        if len(blob) != c.get("bytes") or hashlib.sha256(blob).hexdigest() != c.get("sha256"):
            problems.append(f"{at}: {c['file']} is not the file the manifest describes (bytes or sha256 differ)")
            continue
        if len(blob) > craft["max_bytes"]:
            problems.append(f"{at}: {len(blob)} bytes is over this craft's {craft['max_bytes']}")
        for key in ("command", "solution", "retrieved", "good_to_km", "span", "heldout"):
            if not c.get(key):
                problems.append(f"{at}: `{key}` is missing")
        if c.get("command") != craft["command"]:
            problems.append(f"{at}: Horizons command {c.get('command')!r} is not the registry's {craft['command']!r}")
        if c.get("span") != [iso(craft["from"]), iso(craft["to"])]:
            problems.append(f"{at}: span {c.get('span')} is not the registry's {iso(craft['from'])} to {iso(craft['to'])}")
        if (c.get("rough") or None) != (craft["rough"] or None):
            problems.append(f"{at}: `rough` is not the registry's")
        try:
            segs = unpack(blob)
        except Refusal as e:
            problems.append(f"{at}: {e}")
            continue
        want = [(s["centre"], s["from"], s["to"]) for s in craft["segments"]]
        got = [(s["centre"], int(s["t"][0]), int(s["t"][-1])) for s in segs]
        if want != got:
            problems.append(f"{at}: the file's segments (centre, first, last) are not the registry's windows")
        if [s.get("samples") for s in c.get("segments", [])] != [len(s["t"]) for s in segs]:
            problems.append(f"{at}: the manifest's sample counts are not the file's")
        for s in segs:
            if any(b <= a for a, b in zip(s["t"], s["t"][1:])):
                problems.append(f"{at}: a segment's times do not increase")
            if not all(math.isfinite(x) for x in s["p"]) or not all(math.isfinite(x) for x in s["v"]):
                problems.append(f"{at}: a sample is not a number")
        rows = held.get(cid)
        if not rows or len(rows) != (c.get("heldout") or {}).get("n"):
            problems.append(f"tests/fixtures/eph_heldout.json: {cid} has no held-out positions, or not the number the manifest counts")
        else:
            try:
                worst = heldout_error(blob, rows)
                if abs(worst - c["heldout"]["max_km"]) > 0.01:
                    problems.append(f"{at}: the held-out error is {worst:.3f} km, the manifest says {c['heldout']['max_km']}")
                bound = c.get("good_to_km") or 0
                if worst > bound or (c.get("fit_max_km") or 0) > bound:
                    problems.append(f"{at}: says good to {bound:g} km and misses a Horizons position by {max(worst, c.get('fit_max_km') or 0):.1f} km")
            except Refusal as e:
                problems.append(f"{at}: {e}")
    for cid in have:
        problems.append(f"manifest.json: {cid} is not in registry/ephemerides.yaml")
    if total > reg["total_max_bytes"]:
        problems.append(f"site/data/eph: {total} bytes in all, over the {reg['total_max_bytes']} the registry allows")
    listed = {c.get("file") for c in manifest.get("craft", [])}
    for f in sorted(out_dir.glob("*.bin")):
        if f.name not in listed:
            problems.append(f"site/data/eph/{f.name}: a file no manifest row describes")
    mirror = root / "site" / "js" / "data" / "ephemerides.js"
    if not problems and (not mirror.exists() or mirror.read_text(encoding="utf-8") != mirror_text(manifest)):
        problems.append("site/js/data/ephemerides.js is STALE: run python3 scripts/build_ephemerides.py --mirror")
    # an event that says the map holds the craft's path must be inside that craft's file
    missions = root / "registry" / "missions.yaml"
    if missions.exists():
        spans = {c["id"]: (c["from"], c["to"]) for c in reg["craft"]}
        for m in (yaml.safe_load(missions.read_text(encoding="utf-8")) or {}).get("missions") or []:
            for e in m.get("events") or []:
                at = f"registry/missions.yaml: {m.get('id')}.{e.get('id')}"
                if e.get("place") != "path":
                    if e.get("path_at"):
                        problems.append(f"{at}: path_at on an event whose place is not path")
                    continue
                d = str(e.get("date"))
                t = parse_iso(d if "T" in d else f"{d}T12:00:00Z")
                # `path_at`: where the clock goes instead of the event's own instant. For an event
                # known to the day, a moment of that same UTC day (the closest pass in the file);
                # for a timed one, no more than three hours later (a launch, whose track begins at
                # separation). Anything else would be a different event.
                if e.get("path_at"):
                    try:
                        tp = parse_iso(e["path_at"])
                    except ValueError as err:
                        problems.append(f"{at}: path_at: {err}")
                        continue
                    if "T" not in d and str(e["path_at"])[:10] != d:
                        problems.append(f"{at}: path_at {e['path_at']} is not on the event's own day, {d}")
                    if "T" in d and not 0 <= tp - t <= 3 * 3600:
                        problems.append(f"{at}: path_at {e['path_at']} is not within three hours after the event")
                    t = tp
                subject = m.get("path_record") or m.get("record")
                span = spans.get(subject)
                if not span:
                    problems.append(f"{at}: place is path and {subject} has no file in registry/ephemerides.yaml")
                elif not span[0] <= t <= span[1]:
                    problems.append(f"{at}: place is path and {d} is outside the file's span ({iso(span[0])} to {iso(span[1])})")
    return problems


def cmd_check(_args) -> int:
    problems = check()
    if problems:
        print("ephemerides REFUSED:\n  " + "\n  ".join(problems))
        return 1
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    total = sum(c["bytes"] for c in manifest["craft"])
    print(f"ephemerides ok: {len(manifest['craft'])} craft, {total} bytes, every file is the one its manifest row describes, "
          f"and every held-out Horizons position is within the bound its card states")
    return 0


def cmd_table(_args) -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    print("| craft | span (UTC) | samples | bytes | worst against dropped points | worst against held-out points | the card says |")
    print("|---|---|---|---|---|---|---|")
    for c in manifest["craft"]:
        print(f"| {c['name']} | {c['span'][0][:10]} to {c['span'][1][:10]} | {c['samples']} | {c['bytes']} | "
              f"{c['fit_max_km']:.1f} km | {c['heldout']['max_km']:.1f} km ({c['heldout']['n']}) | good to about {c['good_to_km']:g} km |")
    print(f"| all | | {sum(c['samples'] for c in manifest['craft'])} | {sum(c['bytes'] for c in manifest['craft'])} | | | |")
    return 0


def main(argv: list) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--fetch", action="store_true", help="ask Horizons and rewrite the files (network)")
    ap.add_argument("--check", action="store_true", help="verify registry, manifest, files and mirror (no network)")
    ap.add_argument("--mirror", action="store_true", help="rewrite site/js/data/ephemerides.js from the manifest")
    ap.add_argument("--table", action="store_true", help="print the acceptance table")
    ap.add_argument("--only", help="comma-separated craft ids to fetch; the rest keep their rows")
    ap.add_argument("--cache", help="a directory to keep Horizons' answers in between runs")
    ap.add_argument("--cafile", help="a CA bundle (PEM) to verify Horizons' certificate against")
    args = ap.parse_args(argv)
    try:
        if args.fetch:
            return cmd_fetch(args)
        if args.mirror:
            MIRROR.write_text(mirror_text(json.loads(MANIFEST.read_text(encoding="utf-8"))), encoding="utf-8")
            print(f"wrote {MIRROR.relative_to(ROOT)}")
            return 0
        if args.table:
            return cmd_table(args)
        return cmd_check(args)
    except Refusal as e:
        print(f"ephemerides REFUSED:\n  {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
