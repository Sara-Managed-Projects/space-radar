#!/usr/bin/env python3
"""Mirror registry/systems.yaml into site/js/data/systems.js, and refuse if it has drifted (spec 0040).

Same mechanism as the other mirrors (scripts/_genmirror.py). What this one adds is the JOIN: a system
names its host by the exoplanet table's `hostname` and its planets by the record ids parseExoplanets()
makes, so the generator reads site/data/exoplanets.csv once and writes, beside the row's own numbers,
the host's sky position and distance and each planet's catalogue name. The browser then has the
star's place at boot (the stage's origin, scene/systems.js) without waiting for the 6 332-row table,
and the host star becomes a record (`star-<id>`) placed exactly where the planets' glyphs sit.

The row's `source` lines travel with it: the host star's card prints its own.

Run:  python3 scripts/gen_systems_js.py           # write it
      python3 scripts/gen_systems_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402
from _exo_ids import exo_id, read_rows, rows_for_host, num  # noqa: E402


def render(doc: dict) -> list:
    rows = read_rows()
    if rows is None:
        raise SystemExit("gen_systems_js: site/data/exoplanets.csv is missing or empty; the join needs it")
    out = []
    for s in doc.get("systems") or []:
        sid = s["id"]
        host_rows = rows_for_host(rows, s["host"])
        if not host_rows:
            raise SystemExit(f"gen_systems_js: no row of exoplanets.csv has hostname {s['host']!r}")
        by_id = {exo_id(r["pl_name"]): r for r in host_rows}
        first = host_rows[0]
        star = s.get("star") or {}
        planets = []
        for p in s.get("planets") or []:
            row = by_id.get(p["id"])
            if row is None:
                raise SystemExit(f"gen_systems_js: {p['id']} is not a planet of {s['host']} in exoplanets.csv")
            out_p = {
                "id": p["id"],
                "name": row["pl_name"].strip(),
                "periodDays": p["period_days"],
                "aAu": p["a_au"],
                "radiusEarths": p["radius_earths"],
                "massEarths": p.get("mass_earths"),
                "transitMidJd": p.get("transit_mid_jd"),
                "source": p["source"],
            }
            hz = p.get("habitable_zone")
            if isinstance(hz, dict) and hz.get("source"):
                out_p["habitableZone"] = {"source": hz["source"]}
            planets.append(out_p)
        out.append({
            "id": sid,
            "stage": f"system-{sid}",
            "host": s["host"],
            "hostId": f"star-{sid}",
            # The planets' own row: parseExoplanets() places each of them here, so the host star
            # record and the stage's origin sit on the glyphs the stellar rung draws.
            "hostSky": {
                "raDeg": num(first, "ra"),
                "decDeg": num(first, "dec"),
                "distPc": num(first, "sy_dist"),
                "spect": (first.get("st_spectype") or "").strip() or None,
            },
            "star": {
                "radiusSuns": star.get("radius_suns"),
                "teffK": star.get("teff_k"),
                "massSuns": star.get("mass_suns"),
                "source": star.get("source"),
            },
            "colourNote": s.get("colour_note"),
            "planets": planets,
        })
    return [("Every star system drawn at its own scale, joined to the exoplanet table it names.", "SYSTEMS", out)]


HEADER = """// GENERATED from registry/systems.yaml by scripts/gen_systems_js.py. Do not edit.
//
// `python3 scripts/gen_systems_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// A system is a host star and the planets the NASA Exoplanet Archive lists for it (spec 0040). The
// planets are the exoplanet layer's own records, named by id; the generator joined each row to
// site/data/exoplanets.csv for the host's place in the sky and the planets' names. scene/systems.js
// draws them on the system's stage; data/layers.js makes the host star a record.
"""

MIRROR = Mirror(source="registry/systems.yaml", target="site/js/data/systems.js", header=HEADER, render=render, what="systems.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main(sys.argv[1:]))
