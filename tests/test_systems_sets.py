"""One paper's orbit set per planet (internal #474): the choice of the star's mass and of each planet's distance.

    python3 tests/test_systems_sets.py

Held with invented rows, so the weekly pull cannot move it:
  the composite agrees       nothing changes: the composite mass and its distance are kept, no paper is named
  the composite disagrees    a paper's own set (distance, period and mass of ONE row) that obeys Kepler's third law
                             gives the distance and, with it, the star's mass (WASP-17 b's composite mass is 2.28 Suns)
  a row that disagrees       with itself is never a set
  the Kepler pipeline        its KOI tables are left out of the file; an HTML reference becomes plain text
and by the checked-in files:
  every `a_ref` in registry/systems-generated.yaml is a row of registry/systems-sets.csv with that distance.
"""

import csv
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from _exo_ids import exo_id  # noqa: E402


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BS = load("build-systems")
BE = load("build-exoplanets")
YEAR = BS.JULIAN_YEAR_DAYS


def period_days(a_au, mass):
    """The period Kepler's third law gives for a distance and a mass."""
    return YEAR * (a_au ** 3 / mass) ** 0.5


def row(a, per, m, ref="Some et al. 2020", pubdate="2020-01", default="0"):
    return {"pl_name": "X b", "pl_orbsmax": str(a), "pl_orbper": str(per), "st_mass": str(m), "ref": ref, "pubdate": pubdate, "default_flag": default}


class ChoiceTest(unittest.TestCase):
    def test_composite_that_agrees_is_kept(self):
        per = period_days(0.05, 1.0)
        planets = [(per, 0.05, False, BS.paper_sets([row(0.0505, period_days(0.0505, 1.3), 1.3)]))]
        mass, picks, ref = BS.star_mass(planets, 1.0)
        self.assertEqual((mass, picks, ref), (1.0, ["table"], None))

    def test_a_paper_that_agrees_gives_the_mass(self):
        # WASP-17 b in the composite table: the star at 2.28 Suns, the distance 0.0515 au, the period 3.7354 d.
        per = 3.7354
        paper = BS.paper_sets([row(0.0515, per, 1.306, ref="Bonomo et al. 2017")])
        self.assertEqual(len(paper), 1)
        mass, picks, ref = BS.star_mass([(per, 0.0515, False, paper)], 2.28)
        self.assertEqual((mass, ref), (1.306, "Bonomo et al. 2017"))
        self.assertEqual(picks, ["table"], "the composite distance agrees with the paper's mass, so it is kept")

    def test_a_paper_replaces_a_distance_that_disagrees(self):
        per = period_days(0.06, 1.0)
        paper = BS.paper_sets([row(0.0603, per * 1.001, 1.0, ref="Bonomo et al. 2017")])
        mass, picks, ref = BS.star_mass([(per, 0.05, False, paper)], 1.0)
        self.assertEqual((mass, ref), (1.0, None))
        self.assertEqual(picks[0]["a"], 0.0603)
        self.assertEqual(picks[0]["ref"], "Bonomo et al. 2017")

    def test_nothing_agrees_computes(self):
        per = period_days(0.06, 1.0)
        mass, picks, ref = BS.star_mass([(per, 0.05, False, [])], 1.0)
        self.assertEqual((mass, picks, ref), (1.0, [None], None))

    def test_a_row_at_odds_with_itself_is_not_a_set(self):
        self.assertEqual(BS.paper_sets([row(0.05, 10.0, 1.0)]), [])

    def test_the_newest_set_wins(self):
        per = period_days(0.05, 1.0)
        rows = [row(0.0502, per, 1.0, ref="Old", pubdate="2015-03"), row(0.0498, per, 1.0, ref="New", pubdate="2022-11")]
        self.assertEqual([x["ref"] for x in BS.paper_sets(rows)], ["New", "Old"])

    def test_a_planet_of_two_stars_keeps_the_table(self):
        planets = [(228.776, 0.7048, True, [])]
        self.assertEqual(BS.star_mass(planets, 0.69)[1], ["table"])


class FileTest(unittest.TestCase):
    def test_koi_tables_are_left_out_and_references_become_text(self):
        header = "pl_name,default_flag,pl_orbsmax,pl_orbper,st_mass,pl_refname,pl_pubdate\n"
        body = ('X b,0,0.05,3.0,1.0,"<a refstr=A href=https://example.invalid/ target=ref>Fulton &amp; Petigura 2018</a>",2018-12\n'
                'X b,0,0.05,3.0,1.0,"<a refstr=B href=https://example.invalid/ target=ref>Q1-Q17 DR25 KOI Table</a>",2017-08-31 00:00\n'
                'Y b,0,0.05,3.0,1.0,"<a refstr=C href=https://example.invalid/ target=ref>Not Listed 2020</a>",2020-01\n')
        with tempfile.TemporaryDirectory() as directory:
            src = Path(directory) / "ps.csv"
            src.write_text(header + body, encoding="utf-8")
            text = BE.sets_text(src, {"X b"}, "2026-11-04")
        rows = list(csv.DictReader([ln for ln in text.splitlines() if not ln.startswith("#")]))
        self.assertEqual([(r["pl_name"], r["ref"]) for r in rows], [("X b", "Fulton & Petigura 2018")])

    def test_every_paper_named_is_a_row_of_the_file(self):
        doc = yaml.safe_load((ROOT / "registry/systems-generated.yaml").read_text(encoding="utf-8"))
        lines = [ln for ln in (ROOT / "registry/systems-sets.csv").read_text(encoding="utf-8").splitlines() if not ln.startswith("#")]
        by_id = {}
        for r in csv.DictReader(lines):
            self.assertNotIn("KOI Table", r["ref"])
            by_id.setdefault(exo_id(r["pl_name"]), []).append(r)
        named = [p for s in doc["systems"] for p in s["planets"] if p.get("a_ref")]
        self.assertTrue(named, "no planet takes a paper's distance: the file is not being read")
        for p in named:
            self.assertEqual(p["a_from"], "table")
            found = [r for r in by_id.get(p["id"], []) if r["ref"] == p["a_ref"] and abs(float(r["pl_orbsmax"]) - p["a_au"]) < 1e-9]
            self.assertTrue(found, f"{p['id']}: no row of registry/systems-sets.csv gives {p['a_au']} au from {p['a_ref']}")
        for s in doc["systems"]:
            if s["star"].get("mass_ref"):
                self.assertIn("mass_default_suns", s["star"], s["id"])


if __name__ == "__main__":
    unittest.main()
