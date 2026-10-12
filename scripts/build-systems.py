#!/usr/bin/env python3
"""Write registry/systems-generated.yaml: the star systems of registry/systems-list.yaml, every
number from the NASA Exoplanet Archive's table (internal #466, plan 2026-10-08 section 4.1).

    python3 scripts/build-systems.py            # write it
    python3 scripts/build-systems.py --check    # exit 1 if the checked-in file is stale

NOTHING HERE IS TYPED. The list names hosts; the numbers are joined from two files of ONE pull of
the Archive's Planetary Systems Composite Parameters table (scripts/build-exoplanets.py):
site/data/exoplanets.csv (period, radius, mass, the star's temperature and radius, the method, the
year) and registry/systems-columns.csv (semi-major axis, star mass and luminosity, eccentricity,
transit time, the circumbinary flag, and which numbers the Archive calculated itself). The two must
carry the same date or this refuses.

WHAT IS WORKED OUT HERE, and labelled as worked out in every row and on every card:

  THE STAR. The composite table gives each PLANET its own copy of the star's numbers, from whichever
  paper described that planet, so Kepler-186's five rows hold two luminosities. A star has one
  temperature: this takes the middle value of the host's rows (the lower of the two middle ones when
  the count is even, so the value is always one the table holds).

  THE ORBIT'S SIZE. The table's semi-major axis is kept when Kepler's third law agrees with it:
  a^3 / P^2 (au, years) within 5 % of the star's mass. Often it does not, because the three numbers
  come from three papers (measured 2026-10-08: Kepler-186 c is 52 % off, WASP-17 b 43 %). The period
  is the best-measured of the three by orders of magnitude, so the orbit is then COMPUTED from the
  period and the star's mass, `a_from: kepler`, and the table's own value is kept beside it as
  `a_table_au`. A planet of two stars (the table's `cb_flag`) keeps the table's value: the law needs
  the mass of both stars and the table has one.

  THE HABITABLE ZONE. Kopparapu et al. 2014 (ApJ Letters 787, L29, arXiv:1404.5292, read 2026-10-08),
  equations 4 and 5 and their table of coefficients:
      S_eff = S_sun + a T + b T^2 + c T^3 + d T^4,   T = T_eff - 5780 K,   d = sqrt(L / S_eff) au
  for 2600 K <= T_eff <= 7200 K. The band is the conservative pair, runaway greenhouse (a planet of
  one Earth mass) to maximum greenhouse; the wider pair, recent Venus to early Mars, is kept beside
  it. A star outside that range, or with no temperature or no luminosity, has NO band and the row
  says which. The luminosity is the table's (`st_lum`), or R^2 (T/5772)^4 when it has none.

  THE EQUILIBRIUM TEMPERATURE. T_eq = [L (1 - A) / (16 pi sigma a^2)]^(1/4): a ball with no air that
  reflects A of the light and spreads the heat all round. A = 0.3, the Earth's (NASA Earth fact
  sheet's Bond albedo, 0.294, read 2026-10-08). It is not a measurement of anything and no card
  calls it one. With these numbers the Earth comes out at 255 K, the textbook figure.

  IN THE HABITABLE ZONE, or not, is the orbit's size against that band and nothing else. A planet
  of two stars (Kepler-16 b, Kepler-1647 b) gets no temperature and no verdict: the table describes
  one of its two suns, and half the light is not a number to compute from.

Refusals: a listed host the table lacks; two files of different dates; a system with no planet that
has a period; a row whose third-law check fails after all this (it cannot, unless this file is
wrong, which is what the check is for).
"""
from __future__ import annotations

import csv
import math
import re
import sys
import urllib.parse
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _exo_ids import exo_id, read_rows, rows_for_host, num  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
LIST = ROOT / "registry/systems-list.yaml"
TABLE = ROOT / "site/data/exoplanets.csv"
SIDE = ROOT / "registry/systems-columns.csv"
OUT = ROOT / "registry/systems-generated.yaml"
BINARIES = ROOT / "registry/systems-binaries.yaml"

KEPLER_TOLERANCE = 0.05
JULIAN_YEAR_DAYS = 365.25
# Kopparapu et al. 2014, the table of coefficients for equation 4 (S_sun, a, b, c, d).
HZ_COEFFICIENTS = {
    "recent_venus": (1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15),
    "runaway_greenhouse": (1.107, 1.332e-4, 1.580e-8, -8.308e-12, -1.931e-15),  # one Earth mass
    "maximum_greenhouse": (0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16),
    "early_mars": (0.320, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16),
}
HZ_TEFF_RANGE = (2600.0, 7200.0)
HZ_FORMULA = "Kopparapu et al. 2014, ApJ Letters 787, L29, equations 4 and 5 (https://arxiv.org/abs/1404.5292, read 2026-10-08)"
# IAU 2015 Resolution B3 nominal values, and CODATA 2018's Stefan-Boltzmann constant.
SUN_TEFF_K = 5772.0
SUN_LUMINOSITY_W = 3.828e26
STEFAN_BOLTZMANN = 5.670374419e-8
AU_M = 149597870700.0
ALBEDO = 0.3


def hz_flux(limit: str, teff_k: float) -> float:
    s, a, b, c, d = HZ_COEFFICIENTS[limit]
    t = teff_k - 5780.0
    return s + a * t + b * t ** 2 + c * t ** 3 + d * t ** 4


def habitable_zone(teff_k, lum_suns):
    """The band in au, or (None, why)."""
    if teff_k is None:
        return None, "no-temperature"
    if lum_suns is None:
        return None, "no-luminosity"
    if not HZ_TEFF_RANGE[0] <= teff_k <= HZ_TEFF_RANGE[1]:
        return None, "too-hot" if teff_k > HZ_TEFF_RANGE[1] else "too-cool"
    au = {k: math.sqrt(lum_suns / hz_flux(k, teff_k)) for k in HZ_COEFFICIENTS}
    return {
        "inner_au": sig(au["runaway_greenhouse"], 4),
        "outer_au": sig(au["maximum_greenhouse"], 4),
        "wide_inner_au": sig(au["recent_venus"], 4),
        "wide_outer_au": sig(au["early_mars"], 4),
    }, None


def read_binaries() -> dict:
    doc = yaml.safe_load(BINARIES.read_text(encoding="utf-8")) or {}
    return {str(b["host"]): b for b in doc.get("binaries") or []}


def binary_row(host: str, b: dict, table_rad, table_teff) -> tuple[dict, dict]:
    """The checked binary row for a system, and the habitable zone from both stars' summed light.

    Refused: a primary whose radius or temperature is not the table's within 5 %, and an orbit whose
    a^3 / P^2 (au, years) is not the two masses' sum within 3 %. The luminosity of each star is
    R^2 (T / 5772)^4; the pair's effective temperature is the mean of the two weighted by luminosity;
    the band is Kopparapu's at that temperature for the summed luminosity. This is a simplification
    (Haghighipour and Kaltenegger 2013 weight the spectra), and the card says so.
    """
    pr, co, orb = b["primary"], b["companion"], b["orbit"]
    for what, mine, theirs in (("radius", pr["radius_suns"], table_rad), ("temperature", pr["teff_k"], table_teff)):
        if theirs is None or abs(mine / theirs - 1) > 0.05:
            raise SystemExit(f"build-systems: binary row for `{host}`: primary {what} {mine} is not the table's {theirs} within 5 %")
    implied = orb["a_au"] ** 3 / (orb["period_days"] / JULIAN_YEAR_DAYS) ** 2
    total = pr["mass_suns"] + co["mass_suns"]
    if abs(implied / total - 1) > 0.03:
        raise SystemExit(f"build-systems: binary row for `{host}`: a^3/P^2 is {implied:.4f} against the masses' sum {total:.4f}")
    lum = [s["radius_suns"] ** 2 * (s["teff_k"] / SUN_TEFF_K) ** 4 for s in (pr, co)]
    lum_all = sum(lum)
    teff = sum(l * s["teff_k"] for l, s in zip(lum, (pr, co))) / lum_all
    zone, why = habitable_zone(teff, lum_all)
    row = {
        "primary": dict(pr), "companion": dict(co),
        "orbit": {k: v for k, v in orb.items()},
        "lum_primary_suns": sig(lum[0], 4), "lum_companion_suns": sig(lum[1], 4),
        "lum_total_suns": sig(lum_all, 4), "teff_weighted_k": int(round(teff)),
        "zone_why": why,
        "sources": [{k: v for k, v in x.items()} for x in b["sources"]],
    }
    return row, zone


def equilibrium_k(lum_suns: float, a_au: float) -> float:
    flux = lum_suns * SUN_LUMINOSITY_W * (1 - ALBEDO) / (16 * math.pi * STEFAN_BOLTZMANN * (a_au * AU_M) ** 2)
    return flux ** 0.25


def sig(x: float, n: int) -> float:
    if x == 0:
        return 0.0
    return float(f"{x:.{n}g}")


def middle(values: list[float]):
    vals = sorted(v for v in values if v is not None)
    return vals[(len(vals) - 1) // 2] if vals else None


def read_side() -> tuple[dict, str]:
    text = SIDE.read_text(encoding="utf-8")
    dated = re.search(r"as of (\d{4}-\d{2}-\d{2})", text.splitlines()[0])
    rows = list(csv.DictReader([ln for ln in text.splitlines() if ln.strip() and not ln.startswith("#")]))
    return {r["pl_name"].strip(): r for r in rows}, dated.group(1) if dated else ""


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def build() -> dict:
    listed = (yaml.safe_load(LIST.read_text(encoding="utf-8")) or {}).get("hosts") or []
    rows = read_rows(TABLE)
    if rows is None:
        raise SystemExit("build-systems: site/data/exoplanets.csv is missing or empty")
    table_date = re.search(r"as of (\d{4}-\d{2}-\d{2})", TABLE.read_text(encoding="utf-8").splitlines()[0])
    side, side_date = read_side()
    binaries = read_binaries()
    unused = sorted(set(binaries) - {str(e["host"]) for e in listed})
    if unused:
        raise SystemExit(f"build-systems: registry/systems-binaries.yaml names {unused}, which registry/systems-list.yaml does not list")
    if not table_date or table_date.group(1) != side_date:
        raise SystemExit(f"build-systems: site/data/exoplanets.csv is as of {table_date and table_date.group(1)} and "
                         f"registry/systems-columns.csv as of {side_date}: they must be one pull "
                         f"(python3 scripts/build-exoplanets.py --pull <today>)")
    as_of = side_date
    systems = []
    for entry in listed:
        host = str(entry["host"])
        host_rows = rows_for_host(rows, host)
        if not host_rows:
            raise SystemExit(f"build-systems: registry/systems-list.yaml names `{host}`, which is not a hostname in the table")
        sid = str(entry.get("id") or slug(host))
        wide = [side.get(r["pl_name"].strip()) for r in host_rows]
        if any(w is None for w in wide):
            raise SystemExit(f"build-systems: registry/systems-columns.csv lacks a planet of `{host}`; pull again")
        teff = middle([num(r, "st_teff") for r in host_rows])
        rad = middle([num(r, "st_rad") for r in host_rows])
        mass = middle([num(w, "st_mass") for w in wide])
        log_lum = middle([num(w, "st_lum") for w in wide])
        if log_lum is not None:
            lum, lum_from = sig(10 ** log_lum, 4), "table"
        elif teff is not None and rad is not None:
            lum, lum_from = sig(rad ** 2 * (teff / SUN_TEFF_K) ** 4, 4), "radius-and-temperature"
        else:
            lum, lum_from = None, None
        hz, hz_why = habitable_zone(teff, lum)
        source = (f"https://exoplanetarchive.ipac.caltech.edu/overview/{urllib.parse.quote(host)} "
                  f"(read {as_of})")
        first = host_rows[0]
        stars = middle([num(w, "sy_snum") for w in wide])
        system = {
            "id": sid,
            "host": host,
        }
        if entry.get("display"):
            system["display"] = str(entry["display"])
        if entry.get("aliases"):
            system["aliases"] = [str(a) for a in entry["aliases"]]
        system["why"] = entry.get("why")
        system["as_of"] = as_of
        system["sky"] = {"ra_deg": num(first, "ra"), "dec_deg": num(first, "dec"), "dist_pc": num(first, "sy_dist"),
                         "spect": (first.get("st_spectype") or "").strip() or None}
        system["stars_in_system"] = int(stars) if stars is not None else None
        system["star"] = {"radius_suns": rad, "teff_k": teff, "mass_suns": mass, "lum_suns": lum,
                          "lum_from": lum_from, "source": source}
        system["habitable_zone"] = hz
        if hz is None:
            system["habitable_zone_missing"] = hz_why
        else:
            system["habitable_zone_formula"] = HZ_FORMULA
        if host in binaries:
            brow, bzone = binary_row(host, binaries[host], rad, teff)
            system["binary"] = brow
            if bzone is not None:
                system["habitable_zone"] = bzone
                system["habitable_zone_formula"] = (HZ_FORMULA + "; for two suns the luminosities are summed and the temperature is "
                                                    "their luminosity-weighted mean, a simplification of Haghighipour and Kaltenegger 2013")
                system.pop("habitable_zone_missing", None)
        system["colour_note"] = "illustrative"
        planets = []
        for r, w in zip(host_rows, wide):
            per = num(r, "pl_orbper")
            if per is None or per <= 0:
                continue  # no year: no orbit to draw, and the planet stays a mark at its star
            a_table = num(w, "pl_orbsmax")
            circumbinary = (w.get("cb_flag") or "").strip() == "1"
            implied = a_table ** 3 / (per / JULIAN_YEAR_DAYS) ** 2 if a_table else None
            mismatch = (implied / mass - 1) if implied and mass else None
            if a_table and (circumbinary or (mismatch is not None and abs(mismatch) <= KEPLER_TOLERANCE)):
                a, a_from = a_table, "table"
            elif mass:
                a, a_from = sig((mass * (per / JULIAN_YEAR_DAYS) ** 2) ** (1 / 3), 4), "kepler"
            elif a_table:
                a, a_from = a_table, "table"
            else:
                continue
            calc = (w.get("calc") or "")
            radius = num(r, "pl_rade")
            m = num(r, "pl_bmasse")
            prov = (w.get("pl_bmassprov") or "").strip()
            mass_from = None if m is None else "estimated" if ("m" in calc or prov == "M-R relationship") else \
                "least" if prov == "Msini" else "measured"
            p = {
                "id": exo_id(r["pl_name"]),
                "period_days": per,
                "a_au": a,
                "a_from": a_from,
            }
            if a_from == "kepler" and a_table:
                p["a_table_au"] = a_table
                p["a_table_mismatch_pct"] = round(mismatch * 100, 1)
            if circumbinary:
                p["circumbinary"] = True
            p["radius_earths"] = radius
            p["radius_from"] = None if radius is None else "estimated" if "r" in calc else "measured"
            p["mass_earths"] = m
            p["mass_from"] = mass_from
            ecc = num(w, "pl_orbeccen")
            if ecc is not None:
                p["eccentricity"] = ecc
            tm = num(w, "pl_tranmid")
            if tm is not None:
                p["transit_mid_jd"] = tm
            p["method"] = (r.get("discoverymethod") or "").strip() or None
            year = num(r, "disc_year")
            p["year"] = int(year) if year is not None else None
            # Two stars light a circumbinary planet and the table describes one: nothing is computed
            # from half the light.
            if lum is not None and not circumbinary:
                p["insolation_earths"] = sig(lum / a ** 2, 3)
                p["equilibrium_k"] = int(round(equilibrium_k(lum, a)))
            if hz is not None and not circumbinary:
                p["zone"] = ("inside" if hz["inner_au"] <= a <= hz["outer_au"]
                             else "edge" if hz["wide_inner_au"] <= a <= hz["wide_outer_au"]
                             else "hotter" if a < hz["inner_au"] else "colder")
            p["source"] = source
            planets.append(p)
        if not planets:
            raise SystemExit(f"build-systems: `{host}` has no planet with a period; nothing to draw")
        planets.sort(key=lambda p: p["a_au"])
        system["planets"] = planets
        systems.append(system)
    return {"version": 1, "as_of": as_of, "albedo": ALBEDO, "systems": systems}


HEADER = """# GENERATED by scripts/build-systems.py from registry/systems-list.yaml, site/data/exoplanets.csv and
# registry/systems-columns.csv. Do not edit: `python3 scripts/build-systems.py --check` fails CI when
# this file and its three sources disagree. The script's docstring says where every number comes
# from and which of them are computed (the orbit's size where `a_from: kepler`, the habitable zone,
# `equilibrium_k`, `insolation_earths`, `zone`). `*_from: estimated` is the Archive's own estimate
# of a radius from a mass or a mass from a radius; `mass_from: least` is a radial-velocity minimum
# mass. A null is "not measured", and the card says so.
"""


def text() -> str:
    return HEADER + yaml.safe_dump(build(), sort_keys=False, allow_unicode=True, width=120)


def main(argv: list[str]) -> int:
    want = text()
    if "--check" in argv:
        have = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if have == want:
            print(f"systems-generated.yaml is current ({want.count(chr(10) + '- id: ')} systems)")
            return 0
        print("registry/systems-generated.yaml is STALE.\n\n  Run: python3 scripts/build-systems.py")
        return 1
    OUT.write_text(want, encoding="utf-8")
    doc = yaml.safe_load(want)
    n = sum(len(s["planets"]) for s in doc["systems"])
    print(f"wrote {OUT.relative_to(ROOT)}: {len(doc['systems'])} systems, {n} planets, {OUT.stat().st_size} B")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
