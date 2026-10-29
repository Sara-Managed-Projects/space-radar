#!/usr/bin/env python3
"""Every moon (release 1.5.0, internal spec 0079 stage A3): writes site/data/moons.json and site/data/companions.json.

    python3 scripts/gen_moons.py            # download what is missing into ~/.cache/spaceradar-src/a3/, write both files
    python3 scripts/gen_moons.py --check    # exit 1 when the files in the repository are not what the cache would give

WHAT GOES IN, AND WHERE IT COMES FROM (every source is NASA/JPL, public domain as a work of the US Government;
CREDITS.md section 3o quotes the pages)
  moons.json      the planets' moons:
    names, JPL ids, mean semi-major axis, eccentricity and SIDEREAL PERIOD   JPL SSD "Planetary Satellite Mean
                    Elements", https://ssd.jpl.nasa.gov/sats/elem/ (461 rows, read 2026-10-28)
    discovery year and discoverer                                            JPL SSD "Planetary Satellite Discovery
                    Circumstances", https://ssd.jpl.nasa.gov/sats/discovery.html
    mean radius, where one is measured                                       JPL SSD "Planetary Satellite Physical
                    Parameters", https://ssd.jpl.nasa.gov/sats/phys_par/
    the orbit on 2026-01-01 (osculating, ecliptic J2000, centred on the     JPL Horizons API, EPHEM_TYPE=ELEMENTS,
                    planet), one request per moon                            https://ssd.jpl.nasa.gov/api/horizons.api
  companions.json the asteroids' and far worlds' companions: JPL Small-Body Database, sbdb_query.api `sb-sat` for
                    which bodies have satellites, sbdb.api `sat=true` for each one's satellites (name, year, the
                    discovery reference and, where JPL holds one, the orbit).

WHY HORIZONS AS WELL AS THE MEAN ELEMENTS. The table is "mean elements, ... not intended for ephemeris
computation" (JPL's own warning on the page), at epochs 2000, 2020 or 2025, and it gives the precession periods
without their sign. Two-body motion from them lands the moon anywhere on its orbit, and the orbit itself tens of
degrees from where it is. Horizons gives the real osculating state on one day, which puts the moon where it is
and the ellipse where it lies; the mean sidereal period (the table's) then carries it along the orbit, because the
osculating period of an inner moon is wrong by a tenth of a percent, which is a lap in a year. What this leaves
unsaid is the phase uncertainty: the table's period has four or five digits, so a year from the epoch the place on
the orbit is good to `phaseDeg` degrees, stored per moon and printed on its card.

NOT USED: Johnston's Archive (johnstonsarchive.net/astro/asteroidmoons.html: 654 systems, 677 companions on
2026-10-24). Its FAQ (faqusage.html) says "Material copyrighted by me may be used only with permission from me";
the page carries "(c) 2001-2025, 2026 by Wm. Robert Johnston" and no licence. Its counts are quoted as a total to
compare against, and nothing is copied from it. Asking him is the project owner's to do.

TLS. ssd.jpl.nasa.gov sends a chain ending at Sectigo Root R46, which some trust stores (this laptop's among
them) lack. SR_JPL_INSECURE=1 reads JPL's pages without verifying the chain; everything it fetches is public data
that the tests (tests/test_moons.mjs) check against the figures in propagate/moons.js, which came from Horizons.
"""
import argparse
import datetime
import json
import math
import os
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(os.environ.get("SR_SRC_CACHE", Path.home() / ".cache" / "spaceradar-src")) / "a3"
OUT_MOONS = ROOT / "site" / "data" / "moons.json"
OUT_COMP = ROOT / "site" / "data" / "companions.json"
UA = "space-radar-moons/1.0 (+https://spaceradar.ai)"
READ = "2026-10-28"

DEG = math.pi / 180
EPOCH_JD = 2461041.5  # 2026-01-01 00:00 TDB
EPOCH_ISO = "2026-01-01"
FIXTURE = ROOT / "tests" / "fixtures" / "moons_horizons.json"
# A moon's place on its orbit is called inferred only for the kind that was checked against Horizons and held: a lap of 100 days or
# more (the irregular moons, far from their planet and slow), and then only if no check of THAT moon put it more than 30 degrees out
# (Pasiphae, whose orbit the Sun bends hard, was 57). The fast regular moons were up to 150 degrees out within a year and are called
# illustrative in their place, with every moon that has no ephemeris that late.
PLACE_MIN_LAP_DAYS = 100.0
PLACE_LIMIT_DEG = 30.0
SECONDS_PER_DAY = 86400.0

# planet (SSD name) -> (our world id, Horizons centre, IAU 2015 pole RA, Dec in ICRF degrees)
PLANETS = {
    "Jupiter": ("jupiter", "500@599", 268.057, 64.495),
    "Saturn": ("saturn", "500@699", 40.589, 83.537),
    "Uranus": ("uranus", "500@799", 257.311, -15.175),
    "Neptune": ("neptune", "500@899", 299.36, 43.46),
    "Pluto": ("pluto", "500@999", 132.993, -6.163),
    "Mars": ("mars", "500@499", 317.681, 52.887),
    "Earth": ("earth", "500@399", 0.0, 90.0),
}
PLANET_ORDER = ["jupiter", "saturn", "uranus", "neptune", "pluto"]


def ctx():
    c = ssl.create_default_context()
    if os.environ.get("SR_JPL_INSECURE") == "1":
        c.check_hostname = False
        c.verify_mode = ssl.CERT_NONE
    return c


def get(url, name, tries=7, pause=0.0):
    """The body of `url`, cached under CACHE/name. A failed read is retried, then the run stops."""
    path = CACHE / name
    if path.exists() and path.stat().st_size > 0:
        return path.read_text(encoding="utf-8")
    path.parent.mkdir(parents=True, exist_ok=True)
    last = None
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90, context=ctx()) as r:
                body = r.read().decode("utf-8", "replace")
            path.write_text(body, encoding="utf-8")
            if pause:
                time.sleep(pause)
            return body
        except Exception as err:  # noqa: BLE001 -- a network read; the cause is printed below
            last = err
            time.sleep(4.0 * (k + 1))
    raise RuntimeError(f"could not read {url}: {last}")


def cells(row_html):
    return [unescape(re.sub(r"<[^>]+>", "", c)).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row_html, re.S)]


def slug(s):
    s = s.lower().replace("/", " ")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def norm(s):
    return re.sub(r"[\s_/\-]+", "", s).upper()


# --- the geometry ----------------------------------------------------------------------------------------


def unit_pole(ra_deg, dec_deg):
    ra, dec = ra_deg * DEG, dec_deg * DEG
    return (math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec))


def orbit_normal(i_deg, om_deg):
    """Unit normal of an orbit in the frame its elements are in (ecliptic J2000 for Horizons' output)."""
    i, om = i_deg * DEG, om_deg * DEG
    return (math.sin(om) * math.sin(i), -math.cos(om) * math.sin(i), math.cos(i))


OBL = 23.4392911 * DEG


def ecl_to_icrf(v):
    c, s = math.cos(OBL), math.sin(OBL)
    return (v[0], c * v[1] - s * v[2], s * v[1] + c * v[2])


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def table_epoch_jd(text):
    """'2025-01-01.0' or '2000-01-01.5' (the mean-elements table's epochs, TDB) as a Julian date."""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})\.(\d+)$", text)
    day = datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return 2440587.5 + (day - datetime.date(1970, 1, 1)).days + float("0." + m.group(4))


def mean_to_ecliptic(row, planet):
    """A mean-elements row (any of its three frames) as the same orbit against the J2000 ecliptic: a, e, i, node, argument, M."""
    _n, _pl, _name, _code, _eph, frame, epoch, a, e, w, ma, i, node, per, _pa, _pn, ra, dec, _tilt, _ref = row
    pole = (0.0, -math.sin(OBL), math.cos(OBL)) if frame == "ecliptic" else unit_pole(float(ra), float(dec)) if frame == "Laplace" else unit_pole(PLANETS[planet][2], PLANETS[planet][3])
    cr = lambda u, v: (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])  # noqa: E731
    X = cr((0.0, 0.0, 1.0), pole)
    nx = math.sqrt(sum(c * c for c in X))
    X = tuple(c / nx for c in X)
    Y = cr(pole, X)
    i_, om, w_ = float(i) * DEG, float(node) * DEG, float(w) * DEG
    co, so, cw, sw, ci, si = math.cos(om), math.sin(om), math.cos(w_), math.sin(w_), math.cos(i_), math.sin(i_)
    P = (co * cw - so * sw * ci, so * cw + co * sw * ci, sw * si)
    Q = (-co * sw - so * cw * ci, -so * sw + co * cw * ci, cw * si)
    def to_ecl(v):  # frame axes -> ICRF -> ecliptic
        u = tuple(v[0] * X[k] + v[1] * Y[k] + v[2] * pole[k] for k in range(3))
        c, s_ = math.cos(OBL), math.sin(OBL)
        return (u[0], c * u[1] + s_ * u[2], -s_ * u[1] + c * u[2])
    Pe, Qe = to_ecl(P), to_ecl(Q)
    W = (Pe[1] * Qe[2] - Pe[2] * Qe[1], Pe[2] * Qe[0] - Pe[0] * Qe[2], Pe[0] * Qe[1] - Pe[1] * Qe[0])
    inc = math.degrees(math.acos(max(-1.0, min(1.0, W[2]))))
    return {"a": float(a.rstrip(".")), "e": float(e), "i": inc, "om": math.degrees(math.atan2(W[0], -W[1])) % 360,
            "w": math.degrees(math.atan2(Pe[2], Qe[2])) % 360, "ma": float(ma) % 360, "gm": None, "jd": table_epoch_jd(epoch)}


# --- JPL SSD tables --------------------------------------------------------------------------------------


def read_elements():
    html = get("https://ssd.jpl.nasa.gov/sats/elem/", "elem_index.html")
    body = html[html.index("<tbody>"): html.index("</tbody>")]
    rows = [cells(r) for r in re.findall(r"<tr>(.*?)</tr>", body, re.S)]
    rows = [r for r in rows if len(r) == 20]
    if len(rows) < 440:
        sys.exit(f"the mean-elements table has {len(rows)} rows, expected 461")
    # A moon with two ephemerides has two rows (Puck: URA182 and URA184). The later epoch is the newer fit.
    best = {}
    for r in rows:
        key = (r[1], r[3])
        if key not in best or r[6] > best[key][6]:
            best[key] = r
    return [r for r in rows if best[(r[1], r[3])] is r]


def read_discovery():
    html = get("https://ssd.jpl.nasa.gov/sats/discovery.html", "discovery.html")
    out = {}
    planet = None
    for r in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S):
        c = cells(r)
        if len(c) == 1 and "Satellites of" in c[0]:
            m = re.search(r"Satellites of\s+(?:Dwarf Planet\s+)?(\w+)", c[0].replace("\n", " "))
            planet = m.group(1) if m else None
            continue
        if len(c) == 6 and planet and c[0] != "IAU number":
            out.setdefault(planet, []).append({"name": c[1], "desig": c[2], "year": c[3], "by": c[4], "ref": c[5]})
    return out


def read_phys():
    html = get("https://ssd.jpl.nasa.gov/sats/phys_par/", "phys_par.html")
    out = {}
    for r in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S):
        c = [re.sub(r"\s+", " ", x) for x in cells(r)]
        if len(c) >= 5 and re.match(r"^\d+$", c[2] or ""):
            m = re.match(r"^([\d.]+)", c[4])
            if m:
                out[int(c[2])] = float(m.group(1))
    return out


def find_discovery(disc, planet, name):
    rows = disc.get(planet, [])
    key = norm(name)
    for r in rows:
        if norm(r["name"]) == key or (r["desig"] and norm(r["desig"]) == key):
            return r
    # a name the discovery table spells a letter differently (Philophrosyne / Philophrosyn, Megaclite / Magaclite)
    best, score = None, 0.0
    from difflib import SequenceMatcher
    for r in rows:
        for cand in (r["name"], r["desig"]):
            if not cand:
                continue
            s = SequenceMatcher(None, norm(cand), key).ratio()
            if s > score:
                best, score = r, s
    return best if score >= 0.88 else None


# --- Horizons --------------------------------------------------------------------------------------------


def horizons_elements(code, centre, day=EPOCH_ISO, stop="2026-01-02"):
    q = {
        "format": "text", "COMMAND": f"'{code}'", "OBJ_DATA": "'NO'", "MAKE_EPHEM": "'YES'", "EPHEM_TYPE": "'ELEMENTS'",
        "CENTER": f"'{centre}'", "START_TIME": f"'{day}'", "STOP_TIME": f"'{stop}'", "STEP_SIZE": "'1d'",
        "REF_PLANE": "'ECLIPTIC'", "REF_SYSTEM": "'ICRF'", "OUT_UNITS": "'KM-S'", "TIME_TYPE": "'TDB'",
    }
    url = "https://ssd.jpl.nasa.gov/api/horizons.api?" + urllib.parse.urlencode(q, safe="@'")
    text = get(url, f"hz/{code}@{centre.split('@')[1]}.{day}.txt", pause=0.12)
    if "$$SOE" not in text:
        # a satellite whose ephemeris stops before the epoch (Daphnis: Cassini's end): ask for its last month instead
        m = re.search(r"after A\.D\. (\d{4})-([A-Z]{3})-(\d{2})", text)
        if m and day == EPOCH_ISO:
            import datetime
            last = datetime.datetime.strptime(f"{m.group(1)}-{m.group(2).title()}-{m.group(3)}", "%Y-%b-%d").date()
            d0 = last - datetime.timedelta(days=30)
            return horizons_elements(code, centre, d0.isoformat(), (d0 + datetime.timedelta(days=1)).isoformat())
        return None
    block = text.split("$$SOE")[1].split("$$EOE")[0]
    vals = {k.strip(): float(v) for k, v in re.findall(r"([A-Z]{1,2})\s*=\s*([-+0-9.Ee]+)", block)}
    gm = re.search(r"Keplerian GM\s*:\s*([-+0-9.Ee]+)", text)
    need = ("EC", "IN", "OM", "W", "MA", "A")
    if not all(k in vals for k in need):
        return None
    jd = re.search(r"\$\$SOE\s*([0-9.]+)", text)
    return {"e": vals["EC"], "i": vals["IN"], "om": vals["OM"], "w": vals["W"], "ma": vals["MA"], "a": vals["A"],
            "gm": float(gm.group(1)) if gm else None, "jd": float(jd.group(1)) if jd else EPOCH_JD}


def horizons_vector(code, centre, day):
    """The moon's position (km, ecliptic J2000 axes, planet-centred) at 00:00 TDB on `day`, or None."""
    import datetime
    nxt = (datetime.date.fromisoformat(day) + datetime.timedelta(days=1)).isoformat()
    q = {
        "format": "text", "COMMAND": f"'{code}'", "OBJ_DATA": "'NO'", "MAKE_EPHEM": "'YES'", "EPHEM_TYPE": "'VECTORS'",
        "CENTER": f"'{centre}'", "START_TIME": f"'{day}'", "STOP_TIME": f"'{nxt}'", "STEP_SIZE": "'1d'", "REF_PLANE": "'ECLIPTIC'",
        "REF_SYSTEM": "'ICRF'", "OUT_UNITS": "'KM-S'", "VEC_TABLE": "'1'", "CSV_FORMAT": "'YES'", "TIME_TYPE": "'TDB'",
    }
    url = "https://ssd.jpl.nasa.gov/api/horizons.api?" + urllib.parse.urlencode(q, safe="@'")
    text = get(url, f"hzv/{code}@{centre.split('@')[1]}.{day}.txt", pause=0.12)
    m = re.search(r"\$\$SOE\s*\n(.*?)\n", text)
    if not m:
        return None
    f = [x.strip() for x in m.group(1).split(",")]
    return (float(f[2]), float(f[3]), float(f[4]))


def kepler_pos(a, e, i_deg, om_deg, w_deg, ma_deg, P_days, dt_days):
    """What propagate/kepler.js gives for these elements dt_days after their epoch, mean motion 2 pi / P: km, ecliptic axes."""
    M = (ma_deg * DEG + 2 * math.pi * dt_days / P_days) % (2 * math.pi)
    E = M if e < 0.8 else math.pi
    for _ in range(60):
        d = (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
        E -= d
        if abs(d) < 1e-13:
            break
    xp, yp = a * (math.cos(E) - e), a * math.sqrt(1 - e * e) * math.sin(E)
    i, om, w = i_deg * DEG, om_deg * DEG, w_deg * DEG
    co, so, cw, sw, ci, si = math.cos(om), math.sin(om), math.cos(w), math.sin(w), math.cos(i), math.sin(i)
    return ((cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp,
            (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp,
            (sw * si) * xp + (cw * si) * yp)


def angle_between(p, q):
    d = math.dist(p, q)
    r = max(math.hypot(*p), math.hypot(*q))
    return math.degrees(2 * math.asin(min(1.0, d / (2 * r)))) if r else 180.0


# --- the build -------------------------------------------------------------------------------------------


def existing_world_ids():
    doc = yaml.safe_load((ROOT / "registry" / "worlds.yaml").read_text(encoding="utf-8"))
    return {w["id"] for w in doc["worlds"]}


def decimals(s):
    return len(s.split(".")[1]) if "." in s else 0


def build_moons():
    el = read_elements()
    disc = read_discovery()
    phys = read_phys()
    have = existing_world_ids()
    discoverers = []
    rows = []
    skipped = []
    unplaced = []
    gms = {}
    # SR_FROM_FILE=1: the Horizons columns are read back from the file already in the repository, for a machine that cannot reach Horizons;
    # everything else is rebuilt from JPL's tables, so the output is the same file.
    old = {}
    if os.environ.get("SR_FROM_FILE") == "1" and OUT_MOONS.exists():
        prev = json.loads(OUT_MOONS.read_text(encoding="utf-8"))
        old = {r[prev["cols"].index("code")]: dict(zip(prev["cols"], r)) for r in prev["rows"]}
        gms = {p: g for p, g in prev["planets"]}
    for r in el:
        _id_n, planet, name, code, eph, frame, epoch, a, e, w, ma, i, node, per, papsis, pnode, ra, dec, tilt, ref = r
        if planet not in PLANETS:
            continue
        wid, centre, _pra, _pdec = PLANETS[planet]
        mid = slug(name)
        if mid in have or wid == "mars" or wid == "earth":
            skipped.append(name)
            continue
        if old:
            o = old.get(int(code))
            hz = {"a": o["a"], "e": o["e"], "i": o["i"], "om": o["om"], "w": o["w"], "ma": o["ma"], "gm": gms.get(wid), "jd": o["ep"] or EPOCH_JD} if o else None
        else:
            hz = horizons_elements(code, centre)
        # Horizons has no usable state for a few of the newest moons (S/2025 U 1 comes back with an eccentricity of 34 000): JPL's own
        # mean orbit stands in for it, dated at its own epoch, and the moon's place on it is illustrative.
        if hz and not (0 <= hz["e"] < 0.99 and hz["a"] > 0):
            hz = mean_to_ecliptic(r, planet)
        if not hz:
            unplaced.append(name)
            continue
        gms[wid] = hz["gm"] or gms.get(wid)
        d = find_discovery(disc, planet, name)
        desig = d["desig"] if d else ""
        shown = name
        if re.match(r"^S\d{4}_", name):  # S2011_J_4 -> S/2011 J 4
            shown = desig or re.sub(r"^S(\d{4})_(\w)_(\d+)$", r"S/\1 \2 \3", name)
        by = d["by"] if d else ""
        if by and by not in discoverers:
            discoverers.append(by)
        period = float(per.rstrip("."))
        n_norm = orbit_normal(hz["i"], hz["om"])
        pole = unit_pole(PLANETS[planet][2], PLANETS[planet][3])
        # Against the planet's spin (the orbit's normal against the IAU 2015 pole). Not said of Uranus: it lies on its side, so a moon is
        # "backwards" against its spin, against its lap of the Sun or against its equator, and each answer differs; the card says nothing.
        retro = None if planet == "Uranus" else 1 if dot(ecl_to_icrf(n_norm), pole) < 0 else 0
        # the orbit's date: the epoch, or the last month JPL holds when its ephemeris stops before it (Daphnis: Cassini's end)
        off_epoch = hz["jd"] != EPOCH_JD
        ok = 1 if (not off_epoch and period >= PLACE_MIN_LAP_DAYS) else 0
        rows.append({
            "id": mid, "name": shown, "desig": desig if desig and desig != shown else "", "code": int(code), "p": PLANET_ORDER.index(wid),
            "a": round(hz["a"]), "e": round(hz["e"], 5), "i": round(hz["i"], 3), "om": round(hz["om"], 3), "w": round(hz["w"], 3),
            "ma": round(hz["ma"], 3), "P": period, "ep": round(hz["jd"], 2) if off_epoch else None,
            "am": float(a.rstrip(".")), "em": float(e), "ok": ok, "retro": retro,
            "r": phys.get(int(code)), "yr": int(d["year"]) if d and d["year"].isdigit() else None,
            "by": discoverers.index(by) if by else None, "ref": d["ref"] if d else "",
        })
    # A moon that was checked against Horizons and was more than 30 degrees out on either day is not called inferred, whatever its lap.
    if FIXTURE.exists():
        fx = json.loads(FIXTURE.read_text(encoding="utf-8"))
        for r in rows:
            for day, vec in (fx["moons"].get(r["id"]) or {}).items():
                dt = (datetime.date.fromisoformat(day) - datetime.date.fromisoformat(EPOCH_ISO)).days
                if angle_between(kepler_pos(r["a"], r["e"], r["i"], r["om"], r["w"], r["ma"], r["P"], dt), tuple(vec)) > PLACE_LIMIT_DEG:
                    r["ok"] = 0
    return rows, discoverers, gms, skipped, unplaced


def sample_check(rows):
    """What the model did against Horizons on the days in tests/fixtures/moons_horizons.json: the moons called inferred, and the rest."""
    if not FIXTURE.exists():
        return None
    fx = json.loads(FIXTURE.read_text(encoding="utf-8"))
    by = {r["id"]: r for r in rows}
    out = {"good": [0, 0.0], "lost": [0, 0.0]}
    days = set()
    for mid, byday in fx["moons"].items():
        r = by.get(mid)
        if not r:
            continue
        kind = "good" if r["ok"] else "lost"
        out[kind][0] += 1
        for day, vec in byday.items():
            days.add(day)
            dt = (datetime.date.fromisoformat(day) - datetime.date.fromisoformat(EPOCH_ISO)).days
            err = angle_between(kepler_pos(r["a"], r["e"], r["i"], r["om"], r["w"], r["ma"], r["P"], dt), tuple(vec))
            out[kind][1] = max(out[kind][1], err)
    if not out["good"][0]:
        return None
    return {"days": sorted(days), "good": [out["good"][0], math.ceil(out["good"][1])], "lost": [out["lost"][0], math.ceil(out["lost"][1])]}


# --- the companions: asteroids' and far worlds' ----------------------------------------------------------

SBDB_Q = ("https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=spkid,full_name,name,pdes,prefix,kind,a,e,i,om,w,ma,epoch,H,diameter,neo"
          "&sb-sat=true&full-prec=true")

# Dwarf-planet candidates the stage names. Not in the sb-sat list unless they have a moon, so each is read by number.
# diameter: [km, low, high] with where it was read. Wikipedia's infobox (CC BY-SA 4.0), read 2026-10-28, naming the paper.
CANDIDATES = {
    20120347: {"d": [838, 794, 882], "dsrc": "Kiss et al. 2025, via the Wikipedia article 120347 Salacia", "yr": 2004, "by": "H. G. Roe, M. E. Brown, K. M. Barkume"},
    20174567: {"d": [648, None, None], "dsrc": "Proudfoot et al. 2026 (a 2026 occultation fit; an earlier 740 +/- 14 km), via the Wikipedia article 174567 Varda", "yr": 2003, "by": "J. A. Larsen"},
    20028978: {"d": [697, 688, 708], "dsrc": "Kilic et al. 2026 (stellar occultation, area-equivalent), via the Wikipedia article 28978 Ixion", "yr": 2001, "by": "the Deep Ecliptic Survey (R. L. Millis)"},
    20612533: {"d": [470, 440, 514], "dsrc": "Arimatsu et al. 2026 (2024 stellar occultation, spherical), via the Wikipedia article (612533) 2002 XV93", "yr": 2002, "by": "Palomar Observatory"},
    54533005: {"d": [None, 560, 850], "dsrc": "Cheng et al. 2025 and CNEOS (an estimate from brightness, for albedo 0.10 to 0.25), via the Wikipedia article 2017 OF201", "yr": 2017, "by": "S. Cheng, J. Li, E. Yang"},
}

# The nine moons of dwarf planets and candidates that JPL's tables do not hold. Each row is hand-kept from the
# infobox of the moon's Wikipedia article (CC BY-SA 4.0), read 2026-10-28, which cites the paper named in `ref`.
# a km, e, P days: the orbit's SHAPE, SIZE and LAP are those; the tilt and the place on it are not drawn from data.
# i is given only where the article states it against the ecliptic (Vanth). d: diameter km (value, low, high).
FAR_MOONS = [
    {"id": "dysnomia", "name": "Dysnomia", "desig": "S/2005 (136199) 1", "of": 136199, "a": 37273, "e": 0.0062, "P": 15.785899,
     "d": [615, 565, 675], "yr": 2005, "ref": "Holler et al. 2021 (orbit); Brown and Butler 2023 (size)", "by": "M. E. Brown and the Keck AO team"},
    {"id": "hiiaka", "name": "Hiʻiaka", "desig": "S/2005 (136108) 1", "of": 136108, "a": 49371, "e": 0.0542, "P": 49.462,
     "d": [370, 350, 390], "yr": 2005, "ref": "Ragozzine and Brown 2009; Proudfoot et al. 2024 (orbit); Fernandez-Valenzuela et al. 2025 (size)", "by": "M. E. Brown and the Keck AO team"},
    {"id": "namaka", "name": "Namaka", "desig": "S/2005 (136108) 2", "of": 136108, "a": 25506, "e": 0.2179, "P": 18.2783,
     "d": [150, 100, 200], "yr": 2005, "ref": "Ragozzine and Brown 2009; Proudfoot et al. 2024 (orbit); Muller et al. 2019 (size)", "by": "M. E. Brown and the Keck AO team"},
    {"id": "vanth", "name": "Vanth", "desig": "S/2005 (90482) 1", "of": 90482, "a": 8999.8, "e": 0.00091, "P": 9.539154, "i": 90.54,
     "d": [442, 432, 453], "yr": 2005, "ref": "Grundy et al. 2019 (orbit); Sickafoose et al. 2019 (size, occultation)", "by": "M. E. Brown and T.-A. Suer"},
    {"id": "weywot", "name": "Weywot", "desig": "S/2006 (50000) 1", "of": 50000, "a": 13329, "e": 0.01111, "P": 12.42727,
     "d": [146, 136, 156], "yr": 2006, "ref": "Proudfoot et al. 2025 (orbit); Collyer et al. 2026 (size)", "by": "M. E. Brown and T.-A. Suer"},
    {"id": "xiangliu", "name": "Xiangliu", "desig": "S/2010 (225088) 1", "of": 225088, "a": 24021, "e": 0.2908, "P": 25.22073,
     "d": [None, None, 100], "yr": 2010, "ref": "Kiss et al. 2019 (orbit, the prograde of two solutions the pictures allow); the size is an upper limit", "by": "G. Marton, Cs. Kiss, T. Muller (archival images)"},
    {"id": "mk2", "name": "MK 2", "desig": "S/2015 (136472) 1", "of": 136472, "a": 22250, "e": 0.0, "P": 18.023,
     "d": [175, 175, 250], "yr": 2015, "ref": "Parker et al. 2016 (size, from albedo 0.02 to 0.04); Bamberger et al. 2025 (orbit)", "by": "A. H. Parker and the Hubble team"},
    {"id": "actaea", "name": "Actaea", "desig": "S/2006 (120347) 1", "of": 120347, "a": 5700, "e": 0.008, "P": 5.49389,
     "d": [393, 360, 426], "yr": 2006, "ref": "Collyer et al. 2025 (orbit); Kiss et al. 2025 (size)", "by": "K. S. Noll, H. F. Levison, D. C. Stephen, W. M. Grundy"},
    {"id": "ilmare", "name": "Ilmarë", "desig": "S/2009 (174567) 1", "of": 174567, "a": 4815, "e": 0.016, "P": 5.750824,
     "d": [403, 363, 443], "yr": 2009, "ref": "Proudfoot et al. 2026 (orbit); Kiss et al. 2025 (size)", "by": "K. S. Noll, W. M. Grundy and others"},
]


def to_ecliptic(i_deg, om_deg, w_deg, frame):
    """The same orbit's inclination, node and argument of periapsis against the J2000 ecliptic, from `frame` ('EC' or 'EQ')."""
    i, om, w = i_deg * DEG, om_deg * DEG, w_deg * DEG
    co, so, cw, sw, ci, si = math.cos(om), math.sin(om), math.cos(w), math.sin(w), math.cos(i), math.sin(i)
    P = [co * cw - so * sw * ci, so * cw + co * sw * ci, sw * si]
    Q = [-co * sw - so * cw * ci, -so * sw + co * cw * ci, cw * si]
    if frame == "EQ":
        c, s = math.cos(OBL), math.sin(OBL)
        P = [P[0], c * P[1] + s * P[2], -s * P[1] + c * P[2]]
        Q = [Q[0], c * Q[1] + s * Q[2], -s * Q[1] + c * Q[2]]
    W = [P[1] * Q[2] - P[2] * Q[1], P[2] * Q[0] - P[0] * Q[2], P[0] * Q[1] - P[1] * Q[0]]
    inc = math.degrees(math.acos(max(-1.0, min(1.0, W[2]))))
    node = math.degrees(math.atan2(W[0], -W[1])) % 360
    arg = math.degrees(math.atan2(P[2], Q[2])) % 360
    return inc, node, arg


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def sat_orbit(sat):
    """A companion's own orbit from SBDB, only when it is complete, dated, in a named J2000 frame and in kilometres."""
    for _k, v in (sat.get("orbit") or {}).items():
        el = {e["name"]: num(e["value"]) for e in (v.get("elements") or []) if e.get("value") is not None}
        fr, epoch = v.get("frame"), num(v.get("epoch"))
        if fr in ("EC", "EQ") and v.get("equinox") == "J2000" and epoch and all(k in el for k in ("a", "e", "i", "om", "w", "ma", "per")) and el["a"] > 50:
            inc, node, arg = to_ecliptic(el["i"], el["om"], el["w"], fr)
            return [round(el["a"], 2), round(el["e"], 4), round(inc, 3), round(node, 3), round(arg, 3), round(el["ma"] % 360, 3), epoch,
                    el["per"], decimals(str(next(e["value"] for e in v["elements"] if e["name"] == "per"))), v.get("ref") or ""]
    return None


def sat_period(sat):
    for v in (sat.get("orbit") or {}).values():
        for e in v.get("elements") or []:
            if e["name"] == "per" and e.get("value") and re.match(r"^[\d.]+$", str(e["value"])):
                return float(e["value"])
    return None


def clean_name(full, name, pdes):
    m = re.match(r"^\s*(\d+)\s", full or "")
    return (int(m.group(1)) if m else None), (name or pdes or (full or "").strip())


def body_from(spk, full, name, pdes, a, e, i, om, w, ma, epoch, H, diam, cands, candidate, used):
    number, shown = clean_name(full, name, pdes)
    vals = [num(x) for x in (a, e, i, om, w, ma, epoch)]
    if any(v is None for v in vals):
        return None  # a comet on a tp-and-q set, or no orbit: the map has no place to put its companion
    bid = fresh_id(used, shown, number or spk)
    return [int(spk), number, shown, pdes or "", *[round(v, 9) if k < 6 else v for k, v in enumerate(vals)],
            num(H), num(diam), 1 if candidate else 0, cands, bid]


def fresh_id(used, shown, tail):
    base = slug(shown) or f"x-{tail}"
    out = base if base not in used else f"{base}-{tail}"
    n = 2
    while out in used:
        out = f"{base}-{tail}-{n}"
        n += 1
    used.add(out)
    return out


def build_companions(taken):
    q = json.loads(get(SBDB_Q, "sbdb_sat_full.json"))
    bodies, dropped, unconfirmed = [], [], 0
    have = set()
    used = set(taken) | {m["id"] for m in FAR_MOONS}
    far_desig = {m["desig"] for m in FAR_MOONS}
    far_parents = {20000000 + m["of"] for m in FAR_MOONS}
    for r in q["data"]:
        spk, full, name, pdes, _prefix, kind, a, e, i, om, w, ma, epoch, H, diam, _neo = r[:16]
        det = json.loads(get(f"https://ssd-api.jpl.nasa.gov/sbdb.api?spk={spk}&sat=true&phys-par=true", f"sat/{spk}.json", pause=0.1))
        cands = []
        for s in det.get("sat") or []:
            if s.get("confirmed") != "Y":
                unconfirmed += 1
                continue
            nm, desig = s.get("iau_name") or "", s.get("prov_des") or ""
            if desig in far_desig:
                continue  # the dwarf planets' moons come from FAR_MOONS, with their orbits
            shown = nm or desig or (s.get("fullname") or "")
            cands.append([fresh_id(used, shown, int(spk)), shown, desig if desig and desig != shown else "", int(s["year"]) if str(s.get("year") or "").isdigit() else None,
                          s.get("ref") or "", sat_period(s), sat_orbit(s)])
        if not cands and int(spk) not in far_parents and int(spk) not in CAND_SPK:
            continue
        row = body_from(spk, full, name, pdes, a, e, i, om, w, ma, epoch, H, diam, cands, int(spk) in CAND_SPK, used)
        if row is None:
            dropped.append(shown_of(full, name, pdes))
            continue
        bodies.append(row)
        have.add(int(spk))
    # the candidates with no moon of their own to list
    for spk, qs in CAND_QUERY.items():
        if spk in have:
            continue
        d = json.loads(get("https://ssd-api.jpl.nasa.gov/sbdb.api?" + urllib.parse.urlencode({"sstr": qs, "phys-par": "true", "full-prec": "true"}), f"cand/{spk}.json", pause=0.1))
        el = {e["name"]: e["value"] for e in d["orbit"]["elements"]}
        o = d["object"]
        short = (o.get("shortname") or o.get("fullname") or "").strip()
        short = re.sub(r"^\d+\s+", "", short)          # "28978 Ixion" -> "Ixion"
        short = re.sub(r"^\((.*)\)$", r"\1", short)    # "(2017 OF201)" -> "2017 OF201"
        row = body_from(int(o["spkid"]), o.get("fullname"), short or None, o.get("des"), el["a"], el["e"], el["i"], el["om"], el["w"], el["ma"], d["orbit"].get("epoch"), None, None, [], True, used)
        if row:
            bodies.append(row)
    return bodies, unconfirmed, dropped


def shown_of(full, name, pdes):
    return clean_name(full, name, pdes)[1]


CAND_SPK = {20120347, 20174567}  # Salacia and Varda have moons, so they arrive with the list; the other three are read by number
CAND_QUERY = {20028978: "28978", 20612533: "612533", 54533005: "2017 OF201"}

def tight(rows):
    """The rows as arrays, in the column order data/moons.js reads."""
    cols = ["id", "name", "desig", "code", "p", "a", "e", "i", "om", "w", "ma", "P", "ep", "am", "em", "ok", "retro", "r", "yr", "by", "ref"]
    return cols, [[r[c] for c in cols] for r in rows]


def fixture_from_cache():
    """Rebuild the fixture from the Horizons answers already on disk (CACHE/hzs), so a stalled run loses nothing."""
    cur = json.loads(OUT_MOONS.read_text(encoding="utf-8"))
    cols = cur["cols"]
    by_code = {r[cols.index("code")]: r[cols.index("id")] for r in cur["rows"]}
    fx = json.loads(FIXTURE.read_text(encoding="utf-8")) if FIXTURE.exists() else {"about": "", "moons": {}}
    for f in sorted((CACHE / "hzs").glob("*.txt")):
        text = f.read_text(encoding="utf-8")
        days = {}
        for d, x, y, z in re.findall(r"^\s*\d+\.\d+, A\.D\. (\d{4}-\w{3}-\d{2})[^,]*,\s*([-+0-9.Ee]+),\s*([-+0-9.Ee]+),\s*([-+0-9.Ee]+)", text, re.M):
            days[datetime.datetime.strptime(d, "%Y-%b-%d").date().isoformat()] = [round(float(x)), round(float(y)), round(float(z))]
        mid = by_code.get(int(f.stem))
        if mid and len(days) == 2:
            fx["moons"][mid] = days
    fx["about"] = "JPL Horizons API, EPHEM_TYPE=VECTORS, VEC_TABLE=1, centre = the planet, REF_PLANE=ECLIPTIC, REF_SYSTEM=ICRF, OUT_UNITS=KM-S, 00:00 TDB on each day, read 2026-10-28. km."
    FIXTURE.write_text(json.dumps(fx, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"fixture: {len(fx['moons'])} moons")


def refresh_fixture(n):
    """Ask Horizons for `n` moons called inferred, spread over the planets, on 2026-10-28 and 2027-10-28; merge them into the fixture."""
    cur = json.loads(MOONS_JSON_PATH.read_text(encoding="utf-8"))
    cols = cur["cols"]
    ok = [dict(zip(cols, r)) for r in cur["rows"] if r[cols.index("P")] >= PLACE_MIN_LAP_DAYS and r[cols.index("ep")] is None]  # every slow moon, whatever the rule says of it
    pick = [ok[int(k * len(ok) / n)] for k in range(n)]
    fx = json.loads(FIXTURE.read_text(encoding="utf-8")) if FIXTURE.exists() else {"about": "", "moons": {}}
    from concurrent.futures import ThreadPoolExecutor
    def one(m):
        centre = PLANETS[[k for k, v in PLANETS.items() if v[0] == PLANET_ORDER[m["p"]]][0]][1]
        q = {"format": "text", "COMMAND": f"'{m['code']}'", "OBJ_DATA": "'NO'", "MAKE_EPHEM": "'YES'", "EPHEM_TYPE": "'VECTORS'", "CENTER": f"'{centre}'",
             "START_TIME": "'2026-10-28'", "STOP_TIME": "'2027-10-29'", "STEP_SIZE": "'365d'", "REF_PLANE": "'ECLIPTIC'", "REF_SYSTEM": "'ICRF'",
             "OUT_UNITS": "'KM-S'", "VEC_TABLE": "'1'", "CSV_FORMAT": "'YES'", "TIME_TYPE": "'TDB'"}
        url = "https://ssd.jpl.nasa.gov/api/horizons.api?" + urllib.parse.urlencode(q, safe="@'")
        text = get(url, f"hzs/{m['code']}.txt", pause=0.3)
        rows = re.findall(r"^\s*\d+\.\d+, A\.D\. (\d{4}-\w{3}-\d{2})[^,]*,\s*([-+0-9.Ee]+),\s*([-+0-9.Ee]+),\s*([-+0-9.Ee]+)", text, re.M)
        days = {}
        for d, x, y, z in rows:
            iso = datetime.datetime.strptime(d, "%Y-%b-%d").date().isoformat()
            days[iso] = [round(float(x)), round(float(y)), round(float(z))]
        return m["id"], days
    with ThreadPoolExecutor(max_workers=3) as pool:
        for mid, days in pool.map(one, pick):
            if len(days) == 2:
                fx["moons"][mid] = days
    fx["about"] = "JPL Horizons API, EPHEM_TYPE=VECTORS, VEC_TABLE=1, centre = the planet, REF_PLANE=ECLIPTIC, REF_SYSTEM=ICRF, OUT_UNITS=KM-S, 00:00 TDB on each day, read 2026-10-28. km."
    FIXTURE.write_text(json.dumps(fx, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"fixture: {len(fx['moons'])} moons")


MOONS_JSON_PATH = OUT_MOONS


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--sample", type=int, default=0, help="ask Horizons for this many inferred moons on two days and keep them as the test fixture")
    args = ap.parse_args()
    if args.sample:
        refresh_fixture(args.sample)
        return
    if os.environ.get("SR_FIXTURE_FROM_CACHE") == "1":
        fixture_from_cache()
    rows, discoverers, gms, skipped, unplaced = build_moons()
    cols, arr = tight(rows)
    moons = {
        "v": 1,
        "about": "Moons of the planets that the map had no record of, with their orbits on 2026-01-01. Built by scripts/gen_moons.py from JPL SSD and JPL Horizons (public domain); see CREDITS.md 3o.",
        "epoch": EPOCH_ISO,
        "read": READ,
        "planets": [[p, gms.get(p)] for p in PLANET_ORDER],
        "check": sample_check(rows),
        "cols": cols,
        "discoverers": discoverers,
        "rows": arr,
    }
    bodies, unconfirmed, dropped = build_companions({r["id"] for r in rows} | existing_world_ids())
    far = [[m["id"], m["name"], m["desig"], 20000000 + m["of"], m["a"], m["e"], m["P"], m.get("i"), *m["d"], m["yr"], m["ref"], m["by"]] for m in FAR_MOONS]
    comp = {
        "v": 1,
        "about": "Asteroids and far worlds that have companions, from the JPL Small-Body Database, and the dwarf-planet candidates. Built by scripts/gen_moons.py; see CREDITS.md 3o.",
        "read": READ,
        "bodyCols": ["spk", "number", "name", "pdes", "a_au", "e", "i", "om", "w", "ma", "epochJd", "H", "diameterKm", "candidate", "companions", "id"],
        "companionCols": ["id", "name", "desig", "year", "ref", "periodDays", "orbit"],
        "orbitCols": ["aKm", "e", "iEcl", "omEcl", "wEcl", "maDeg", "epochJd", "periodDays", "periodDecimals", "ref"],
        "bodies": bodies,
        "candidates": {str(k): [*v["d"], v["dsrc"], v["yr"], v["by"]] for k, v in CANDIDATES.items()},
        "farCols": ["id", "name", "desig", "parentSpk", "aKm", "e", "periodDays", "iEclDeg", "diameterKm", "low", "high", "year", "ref", "discoverer"],
        "far": far,
    }
    ids = [r["id"] for r in rows] + [m["id"] for m in FAR_MOONS] + [b[15] for b in bodies] + [c[0] for b in bodies for c in b[14]]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        sys.exit(f"duplicate moon ids: {sorted(dup)}")
    t_moons = json.dumps(moons, separators=(",", ":"), ensure_ascii=False) + "\n"
    t_comp = json.dumps(comp, separators=(",", ":"), ensure_ascii=False) + "\n"
    n_comp = sum(len(b[14]) for b in bodies)
    print(f"moons: {len(rows)} new; {len(skipped)} already on the map ({', '.join(skipped)}); no Horizons orbit for: {unplaced or 'none'}")
    print(f"companions: {len(bodies)} bodies, {n_comp} confirmed companions ({unconfirmed} reports not confirmed); dropped, no usable orbit for the primary: {dropped or 'none'}")
    if args.check:
        same = OUT_MOONS.exists() and OUT_COMP.exists() and OUT_MOONS.read_text(encoding="utf-8") == t_moons and OUT_COMP.read_text(encoding="utf-8") == t_comp
        sys.exit(0 if same else 1)
    OUT_MOONS.write_text(t_moons, encoding="utf-8")
    OUT_COMP.write_text(t_comp, encoding="utf-8")
    print(f"wrote {OUT_MOONS.relative_to(ROOT)} {len(t_moons)} bytes, {OUT_COMP.relative_to(ROOT)} {len(t_comp)} bytes")


if __name__ == "__main__":
    main()
