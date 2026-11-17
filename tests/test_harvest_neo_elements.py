"""Horizons elements at each close approach (internal #392): harvest/neo_elements.py, against answers JPL gave (tests/fixtures/neo_horizons_elements.json)."""
import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from harvest import fetch, neo_elements as ne, publish  # noqa: E402

CAD = json.loads((ROOT / "tests/fixtures/neo_fullprec_cad.json").read_text())
HZ = json.loads((ROOT / "tests/fixtures/neo_horizons_elements.json").read_text())["rows"]
QUIET = lambda *_: None  # noqa: E731


class Fake:
    """A fetcher that answers each Horizons URL with the stored answer for the object it names."""

    def __init__(self, status=200, fail=()):
        self.urls, self.status, self.fail = [], status, set(fail)

    def __call__(self, url, **kw):
        self.urls.append(url)
        for des, row in HZ.items():
            if ("DES%3D" + des.replace(" ", "%20")) in url:
                if des in self.fail:
                    raise fetch.FetchError("down")
                return fetch.Response(url, self.status, row["text"].encode(), "text/plain", None, None, 1)
        raise AssertionError(url)


class NeoElements(unittest.TestCase):
    def test_a_horizons_row_becomes_the_sbdb_fields_in_sbdb_units(self):
        got = ne.parse_elements(HZ["2026 QQ8"]["text"], HZ["2026 QQ8"]["jd"])
        self.assertEqual(set(got), set(ne.FIELDS))
        self.assertAlmostEqual(float(got["a"]), 0.9537359, 6)
        self.assertAlmostEqual(float(got["epoch"]), 2461388.070126, 6)

    def test_what_is_not_one_clean_elliptic_row_is_nothing(self):
        text, jd = HZ["2026 QQ8"]["text"], HZ["2026 QQ8"]["jd"]
        self.assertIsNone(ne.parse_elements("No matches found.", jd))
        self.assertIsNone(ne.parse_elements(text, jd + 1), "a row for another instant")
        self.assertIsNone(ne.parse_elements(text.replace("3.272374176762670E-02", "1.5"), jd), "a hyperbolic orbit")
        self.assertIsNone(ne.parse_elements(None, jd))

    def test_the_request_asks_heliocentric_ecliptic_elements_at_the_approach(self):
        u = ne.request_url("2026 QQ8", 2461388.070126)
        for part in ("EPHEM_TYPE=ELEMENTS", "CENTER=%27500%4010%27", "REF_PLANE=ECLIPTIC", "TLIST=%272461388.070126%27", "OUT_UNITS=AU-D", "DES%3D2026%20QQ8"):
            self.assertIn(part, u)

    def test_each_listed_object_gets_horizons_elements_and_the_rest_of_the_row_stays(self):
        sb = copy.deepcopy(CAD["sbdb"])
        sb["data"].append(["   433 Eros (A898 PA)"] + ["1"] * 12)          # not listed: no request, no change
        f = Fake()
        out, n = ne.refine_body(sb, CAD["cad"], f, log=QUIET)
        self.assertEqual(n, 4)
        self.assertEqual(len(f.urls), 4)
        i = sb["fields"].index
        for old, new in zip(sb["data"], out["data"]):
            if old[0].strip() == "433 Eros (A898 PA)":
                self.assertEqual(old, new)
                continue
            self.assertNotEqual(old[i("a")], new[i("a")])
            for k in ("full_name", "spkid", "H", "diameter", "class"):
                self.assertEqual(old[i(k)], new[i(k)])
        qq8 = next(r for r in out["data"] if "QQ8" in r[0])
        self.assertAlmostEqual(float(qq8[i("a")]), 0.9537359, 6)

    def test_an_object_horizons_does_not_answer_keeps_its_sbdb_row(self):
        sb = copy.deepcopy(CAD["sbdb"])
        out, n = ne.refine_body(sb, CAD["cad"], Fake(fail=["2026 QQ8"]), log=QUIET)
        self.assertEqual(n, 3)
        self.assertEqual(next(r for r in out["data"] if "QQ8" in r[0]), next(r for r in sb["data"] if "QQ8" in r[0]))
        out, n = ne.refine_body(sb, CAD["cad"], Fake(status=503), log=QUIET)
        self.assertEqual((n, out["data"]), (0, sb["data"]))

    def test_no_time_left_asks_nothing(self):
        out, n = ne.refine_body(copy.deepcopy(CAD["sbdb"]), CAD["cad"], Fake(), budget_s=-1, log=QUIET)
        self.assertEqual(n, 0)

    def test_the_hourly_run_wires_it_in(self):
        self.assertIn("refine_neo=neo_elements.refine_body", (ROOT / "harvest/publish.py").read_text())
        self.assertTrue(callable(publish.finish_and_queue))


if __name__ == "__main__":
    unittest.main()
