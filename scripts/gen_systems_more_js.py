#!/usr/bin/env python3
"""Mirror registry/systems-generated.yaml into the two files the browser loads LATE (internal #466).

    python3 scripts/gen_systems_more_js.py           # write both
    python3 scripts/gen_systems_more_js.py --check   # exit 1 if either is stale, or the YAML is

registry/systems.yaml (TRAPPIST-1, typed from the Archive's pages) rides the first visit as
site/js/data/systems.js, 3.6 kB. Thirty-nine more systems do not: they are two files nobody asked
for until they left the Earth.

  site/js/data/systems-index.js   WHO HAS A STAGE: each system's id, names, place in the sky, the
                                  star's three numbers for its card, and its planets' record ids.
                                  Loaded with the exoplanet table (main.js loadAfterFirstVisit), so
                                  the search box finds "LHS 1140" and a chosen planet knows it has
                                  somewhere to be drawn.
  site/js/data/systems-table.js   WHAT IS DRAWN: every row in full. Loaded the first time one of
                                  these systems is asked for (scene/systems.js loadTable), and
                                  never by the light embed.

The YAML is itself generated (scripts/build-systems.py); --check runs that check first, so one
command says whether the whole chain from the Archive's table to the browser is current.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror, ROOT  # noqa: E402
from _exo_ids import read_rows, rows_for_host, exo_id  # noqa: E402


def camel(key: str) -> str:
    head, *rest = key.split("_")
    return head + "".join(w.capitalize() for w in rest)


def base(s: dict) -> dict:
    sky = s["sky"]
    star = s["star"]
    return {
        "id": s["id"],
        "stage": f"system-{s['id']}",
        "host": s["host"],
        "display": s.get("display") or s["host"],
        "aliases": s.get("aliases") or [],
        "hostId": f"star-{s['id']}",
        "hostSky": {"raDeg": sky["ra_deg"], "decDeg": sky["dec_deg"], "distPc": sky["dist_pc"], "spect": sky.get("spect")},
        "star": {"radiusSuns": star["radius_suns"], "teffK": star["teff_k"], "massSuns": star["mass_suns"], "source": star["source"]},
    }


def render_index(doc: dict) -> list:
    out = []
    for s in doc.get("systems") or []:
        row = base(s)
        row["why"] = s.get("why")
        row["planets"] = [{"id": p["id"]} for p in s["planets"]]
        out.append(row)
    return [("Which stars have a stage of their own, and which records are their planets.", "SYSTEM_INDEX", out)]


PLANET_FIELDS = ("period_days", "a_au", "a_from", "a_table_au", "circumbinary", "radius_earths", "radius_from",
                 "mass_earths", "mass_from", "eccentricity", "transit_mid_jd", "method", "year",
                 "insolation_earths", "equilibrium_k", "zone")


def render_table(doc: dict) -> list:
    rows = read_rows()
    if rows is None:
        raise SystemExit("gen_systems_more_js: site/data/exoplanets.csv is missing or empty; the planets' names come from it")
    out = []
    for s in doc.get("systems") or []:
        names = {exo_id(r["pl_name"]): r["pl_name"].strip() for r in rows_for_host(rows, s["host"])}
        row = base(s)
        row["star"]["lumSuns"] = s["star"]["lum_suns"]
        row["star"]["lumFrom"] = s["star"]["lum_from"]
        row["starsInSystem"] = s.get("stars_in_system")
        hz = s.get("habitable_zone")
        row["zone"] = {camel(k): v for k, v in hz.items()} if hz else None
        row["zoneMissing"] = s.get("habitable_zone_missing")
        row["colourNote"] = s.get("colour_note")
        row["asOf"] = s.get("as_of")
        planets = []
        for p in s["planets"]:
            if p["id"] not in names:
                raise SystemExit(f"gen_systems_more_js: {p['id']} is not a planet of {s['host']} in exoplanets.csv")
            q = {"id": p["id"], "name": names[p["id"]]}
            for k in PLANET_FIELDS:
                if p.get(k) is not None:
                    q[camel(k)] = p[k]
            planets.append(q)
        row["planets"] = planets
        out.append(row)
    return [
        ("The share of light a planet is taken to reflect when its temperature is computed (the Earth's).", "SYSTEMS_ALBEDO", doc.get("albedo")),
        ("The day the Archive's table was read.", "SYSTEMS_AS_OF", doc.get("as_of")),
        ("Every generated system in full: what scene/systems.js draws and the card prints.", "SYSTEMS_TABLE", out),
    ]


HEAD = """// GENERATED from registry/systems-generated.yaml by scripts/gen_systems_more_js.py. Do not edit.
//
// `python3 scripts/gen_systems_more_js.py --check` fails CI if this file and the YAML disagree. The
// YAML is generated too (scripts/build-systems.py, from the NASA Exoplanet Archive's table): to
// change a number, pull the table again; to change which stars are here, edit
// registry/systems-list.yaml.
//
"""
INDEX = Mirror(source="registry/systems-generated.yaml", target="site/js/data/systems-index.js", indent=0,
               header=HEAD + "// NOT ON THE FIRST VISIT: main.js loads this with the exoplanet table.\n",
               render=render_index, what="systems-index.js")
TABLE = Mirror(source="registry/systems-generated.yaml", target="site/js/data/systems-table.js", indent=0,
               header=HEAD + "// NOT ON THE FIRST VISIT, and not with the table either: scene/systems.js loads this the first\n"
                             "// time one of these systems is asked for. `aFrom: kepler` is an orbit computed from the year and\n"
                             "// the star's mass; `*From: estimated` is the Archive's own estimate; `equilibriumK`, `insolationEarths`\n"
                             "// and `zone` are computed (scripts/build-systems.py says how). A field left out is not measured.\n",
               render=render_table, what="systems-table.js")

if __name__ == "__main__":
    argv = sys.argv[1:]
    rc = 0
    if "--check" in argv:
        rc = subprocess.call([sys.executable, str(ROOT / "scripts/build-systems.py"), "--check"])
    sys.exit(rc or INDEX.main(argv) or TABLE.main(argv))
