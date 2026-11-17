"""scripts/refresh_rover_positions.py, with no network: what it reads from a waypoint file, the five values it rewrites
in a row of registry/sites.yaml (and nothing else, every comment kept), the day it works out for a sol, and what it
refuses. The files here are made in the test; tests/test_rover_positions.mjs holds the real rows to NASA's waypoints.

    python3 tests/test_refresh_rover_positions.py
"""

import datetime
import importlib.util
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("refresh_rover_positions", ROOT / "scripts" / "refresh_rover_positions.py")
R = importlib.util.module_from_spec(spec)
spec.loader.exec_module(R)

# A small registry in the shape of the real one: comments above, between and after the rows, a neighbour row that names
# the same fields, and the two references.
YAML = '''version: 1
# a comment at the head, with lat: 1.0 and as_of_sol: 7 in it
references:
  m20-rover-waypoints-current:
    url: "https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints_current.json"
    read: 2026-11-16
    says: "one point"
  msl-rover-waypoints-current:
    url: "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints_current.json"
    read: 2026-11-16
    says: "one point"
  other:
    url: "https://example.org/"
    read: 2026-09-22
    says: "kept"
sites:
  # the rover, and why   (a comment that must stay)
  - {id: jezero, display: "Perseverance, Jezero crater", class: surface, world: mars, lat: 18.43559434, lon: 77.23322287, landed: 2021-02-18, shape: rover, source: m20-rover-waypoints-current, as_of_sol: 2022, as_of: 2026-10-28, dist_total_m: 45245.71, doing: "It landed at lat: 18.4446 once."}
  - {id: octavia-e-butler-landing, display: "Octavia E. Butler Landing, Jezero crater", class: feature, world: mars, lat: 18.4446, lon: 77.4509, source: other, doing: "Where Perseverance landed."}
  # between the rows
  - {id: gale, display: "Curiosity, Gale crater", class: surface, world: mars, lat: -4.82602331, lon: 137.388886, landed: 2012-08-06, shape: rover, source: msl-rover-waypoints-current, as_of_sol: 5073, as_of: 2026-11-13, dist_total_m: 38638.02, doing: "Driving up a mountain of layered rock since 2012."}
  - {id: bradbury-landing, display: "Bradbury Landing, Gale crater", class: feature, world: mars, lat: -4.5895, lon: 137.4417, source: other, doing: "Where Curiosity landed."}
  - id: elysium
    lat: 4.5024
    lon: 135.6234   # a trailing comment
'''


def geojson(sol, lon, lat, dist, earlier=()):
    feats = [{"type": "Feature", "properties": {"sol": s, "lon": lo, "lat": la, "dist_total_m": d}, "geometry": {"type": "Point", "coordinates": [lo, la, -1000.0]}}
             for (s, lo, la, d) in list(earlier) + [(sol, lon, lat, dist)]]
    return {"type": "FeatureCollection", "features": feats}


TODAY = datetime.date(2026, 12, 1)


class RoverPositions(unittest.TestCase):
    def test_the_last_feature_is_the_waypoint(self):
        wp = R.last_waypoint(geojson(5101, 137.38012, -4.83155, 38901.5, earlier=[(5073, 137.388886, -4.82602331, 38638.02)]))
        self.assertEqual(wp, {"sol": 5101, "lat": -4.83155, "lon": 137.38012, "dist_total_m": 38901.5})

    def test_a_file_that_is_not_a_waypoint_layer_is_refused(self):
        for bad in ({}, {"features": []}, {"features": [{"properties": {"sol": 5}, "geometry": {"coordinates": [1.0, 2.0]}}]},
                    geojson("5101", 137.38, -4.83, 1.0), geojson(5101, None, -4.83, 1.0), geojson(5101, 137.38, -94.0, 1.0),
                    geojson(5101, -222.6, -4.83, 1.0), geojson(5101.5, 137.38, -4.83, 1.0), geojson(5101, 137.38, -4.83, float("nan"))):
            with self.assertRaises(R.Refused, msg=json.dumps(bad)[:80]):
                R.last_waypoint(bad)

    def test_the_day_of_a_sol_is_nasas(self):
        # NASA's own pairs, read 2026-11-16: its raw images of sol 5073 (Curiosity) are dated 2026-11-13 and of sol 2022
        # (Perseverance) 2026-10-28; "November 7, 2026, Sol 5067" (Curiosity's blog); "Sol 2006 (Oct. 11, 2026)" (Perseverance's).
        self.assertEqual(R.sol_date("gale", 5073).isoformat(), "2026-11-13")
        self.assertEqual(R.sol_date("gale", 5067).isoformat(), "2026-11-07")
        self.assertEqual(R.sol_date("jezero", 2022).isoformat(), "2026-10-28")
        self.assertEqual(R.sol_date("jezero", 2006).isoformat(), "2026-10-11")
        # And the landings, from the same anchors: sol 0 of each mission is the day it came down (UTC).
        self.assertEqual(R.sol_date("gale", 0).isoformat(), "2012-08-06")
        self.assertEqual(R.sol_date("jezero", 0).isoformat(), "2021-02-18")

    def test_a_row_is_rewritten_in_place_and_nothing_else_changes(self):
        wps = {"gale": R.last_waypoint(geojson(5101, 137.38012, -4.83155, 38901.5)),
               "jezero": R.last_waypoint(geojson(2050, 77.2201, 18.4401, 46010))}
        new, notes, fixture = R.apply(YAML, wps, TODAY)
        old_lines, new_lines = YAML.split("\n"), new.split("\n")
        self.assertEqual(len(old_lines), len(new_lines))
        changed = [i for i, (a, b) in enumerate(zip(old_lines, new_lines)) if a != b]
        # Four lines: the two rover rows and the `read:` of their two references.
        self.assertEqual(len(changed), 4, [new_lines[i] for i in changed])
        self.assertIn('  - {id: gale, display: "Curiosity, Gale crater", class: surface, world: mars, lat: -4.83155, lon: 137.38012, landed: 2012-08-06, shape: rover, '
                      'source: msl-rover-waypoints-current, as_of_sol: 5101, as_of: 2026-12-12, dist_total_m: 38901.5, doing: "Driving up a mountain of layered rock since 2012."}', new_lines)
        # An integer distance stays an integer; the sentence's own "lat: 18.4446" is not a field and is not touched.
        self.assertIn('  - {id: jezero, display: "Perseverance, Jezero crater", class: surface, world: mars, lat: 18.4401, lon: 77.2201, landed: 2021-02-18, shape: rover, '
                      'source: m20-rover-waypoints-current, as_of_sol: 2050, as_of: 2026-11-26, dist_total_m: 46010, doing: "It landed at lat: 18.4446 once."}', new_lines)
        self.assertEqual(new.count("    read: 2026-12-01"), 2)
        self.assertIn("    read: 2026-09-22", new)  # another reference's day is not this script's
        for kept in ("# a comment at the head, with lat: 1.0 and as_of_sol: 7 in it", "  # the rover, and why   (a comment that must stay)", "  # between the rows",
                     "    lon: 135.6234   # a trailing comment", '  - {id: bradbury-landing, display: "Bradbury Landing, Gale crater", class: feature, world: mars, lat: -4.5895, lon: 137.4417, source: other, doing: "Where Curiosity landed."}'):
            self.assertIn(kept, new_lines)
        self.assertEqual(len(notes), 2)
        self.assertTrue(all(fixture[s]["changed"] for s in fixture))
        # What it wrote reads back as YAML with the waypoint's numbers.
        import yaml
        rows = {r["id"]: r for r in yaml.safe_load(new)["sites"]}
        self.assertEqual((rows["gale"]["lat"], rows["gale"]["lon"], rows["gale"]["as_of_sol"], rows["gale"]["as_of"], rows["gale"]["dist_total_m"]),
                         (-4.83155, 137.38012, 5101, datetime.date(2026, 12, 12), 38901.5))
        self.assertEqual(R.check(new), [])

    def test_a_rover_that_has_not_moved_changes_nothing(self):
        wps = {"gale": R.last_waypoint(geojson(5073, 137.388886, -4.82602331, 38638.02)),
               "jezero": R.last_waypoint(geojson(2022, 77.23322287, 18.43559434, 45245.71))}
        new, notes, fixture = R.apply(YAML, wps, TODAY)
        self.assertEqual(new, YAML)  # the `read:` days too: no pull request for a month with no drive
        self.assertFalse(any(fixture[s]["changed"] for s in fixture))
        before = {"rovers": {"gale": {"read": "2026-11-16"}, "jezero": {"read": "2026-11-16"}}}
        doc = json.loads(R.fixture_text(fixture, before, TODAY))
        self.assertEqual({s: doc["rovers"][s]["read"] for s in doc["rovers"]}, {"gale": "2026-11-16", "jezero": "2026-11-16"})
        # One moved, one did not: only the one that moved takes the new day, in the registry and in the fixture.
        wps["gale"] = R.last_waypoint(geojson(5080, 137.3885, -4.8262, 38650.0))
        new, _notes, fixture = R.apply(YAML, wps, TODAY)
        self.assertEqual(new.count("    read: 2026-12-01"), 1)
        doc = json.loads(R.fixture_text(fixture, before, TODAY))
        self.assertEqual((doc["rovers"]["gale"]["read"], doc["rovers"]["jezero"]["read"]), ("2026-12-01", "2026-11-16"))
        self.assertEqual((doc["rovers"]["gale"]["sol"], doc["rovers"]["gale"]["lat"], doc["rovers"]["gale"]["url"]),
                         (5080, -4.8262, "https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints_current.json"))

    def test_what_it_refuses(self):
        good = {"gale": R.last_waypoint(geojson(5101, 137.38012, -4.83155, 38901.5)),
                "jezero": R.last_waypoint(geojson(2050, 77.2201, 18.4401, 46010))}
        # a sol that went backwards
        with self.assertRaisesRegex(R.Refused, "does not go back"):
            R.apply(YAML, {**good, "gale": R.last_waypoint(geojson(5000, 137.39, -4.82, 38000.0))}, TODAY)
        # a jump no month of driving makes (here: Perseverance's file answered with Curiosity's place)
        with self.assertRaisesRegex(R.Refused, "more than 50 km"):
            R.apply(YAML, {**good, "jezero": good["gale"]}, TODAY)
        # a row somebody reformatted onto several lines, or that lost a field: said before anything is written
        gale_line = re.search(r"^  - \{id: gale,.*$", YAML, re.M).group(0)
        block = YAML.replace(gale_line, "  - id: gale\n    lat: -4.82602331\n    lon: 137.388886\n    as_of_sol: 5073")
        with self.assertRaisesRegex(R.Refused, "must be one line"):
            R.apply(block, good, TODAY)
        with self.assertRaisesRegex(R.Refused, "as_of_sol"):
            R.apply(YAML.replace("as_of_sol: 5073, ", ""), good, TODAY)
        self.assertTrue(any("must be one line" in b for b in R.check(block)))
        # a day that is not its sol's
        self.assertTrue(any("is not the day of sol" in b for b in R.check(YAML.replace("as_of: 2026-11-13", "as_of: 2026-11-16"))))
        self.assertEqual(R.check(YAML), [])

    def test_from_a_directory_no_network(self):
        with tempfile.TemporaryDirectory() as d:
            (Path(d) / "MSL_waypoints_current.json").write_text(json.dumps(geojson(5073, 137.388886, -4.82602331, 38638.02)), encoding="utf-8")
            (Path(d) / "M20_waypoints_current.json").write_text(json.dumps(geojson(2022, 77.23322287, 18.43559434, 45245.71)), encoding="utf-8")
            wps = R.read_waypoints(Path(d))
        self.assertEqual(wps["gale"]["sol"], 5073)
        self.assertEqual(wps["jezero"]["lon"], 77.23322287)

    def test_the_real_registry_passes_its_own_check(self):
        self.assertEqual(R.check((ROOT / "registry" / "sites.yaml").read_text(encoding="utf-8")), [])


if __name__ == "__main__":
    unittest.main()
