"""Horizons elements for the comets that matter (internal #393): harvest/comet_elements.py, against answers JPL gave (tests/fixtures/comet_horizons_elements.json)."""
import copy
import json
import re
import sys
import urllib.parse
import unittest
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from harvest import fetch, comet_elements as ce, publish  # noqa: E402

HZ = json.loads((ROOT / "tests/fixtures/comet_horizons_elements.json").read_text())
REF = json.loads((ROOT / "tests/fixtures/comets_horizons_reference.json").read_text())
NOW = datetime(2026, 11, 16, 6, 0, tzinfo=timezone.utc)
JD = HZ["rows"]["2P"]["jd"]
QUIET = lambda *_: None  # noqa: E731
FIELDS = REF["fields"]


def body():
    """The feed as the harvester holds it: the three periodic comets at full precision, the open orbit, one faint comet and Halley's row."""
    rows = [copy.deepcopy(r["row"]) for r in REF["rows"]] + [copy.deepcopy(HZ["sbdbN1"])]
    rows.append(["  1P/Halley"] + ["0.9679", "17.8", "0.5748", "162.2", "59.1", "112.2", "38.4", "2446467.4", "2446467.4", "5.5", "8.0"][:len(FIELDS) - 1])
    return {"fields": list(FIELDS), "count": len(rows), "data": rows}


class Fake:
    """A fetcher that answers each Horizons URL with the stored answer for the comet it names."""

    def __init__(self, status=200, fail=()):
        self.urls, self.status, self.fail = [], status, set(fail)

    def __call__(self, url, **kw):
        self.urls.append(url)
        for des, row in HZ["rows"].items():
            if re.search(r"DES%3D" + re.escape(urllib.parse.quote(des, safe="")) + r"%3B", url):
                if des in self.fail:
                    raise fetch.FetchError("down")
                return fetch.Response(url, self.status, row["text"].encode(), "text/plain", None, None, 1)
        raise AssertionError(url)


class CometElements(unittest.TestCase):
    def test_the_epoch_is_the_start_of_the_ut_day_as_a_tdb_julian_date(self):
        self.assertAlmostEqual(ce.epoch_jd_tdb(NOW), JD, 6)
        self.assertAlmostEqual(ce.epoch_jd_tdb(datetime(2026, 11, 16, 23, 59, tzinfo=timezone.utc)), JD, 6)

    def test_a_horizons_row_becomes_the_sbdb_fields_in_sbdb_units(self):
        got = ce.parse_elements(HZ["rows"]["2P"]["text"], JD)
        self.assertEqual(set(got), set(ce.FIELDS))
        self.assertAlmostEqual(float(got["q"]), 0.3385922791666587, 12)
        self.assertAlmostEqual(float(got["tp"]), 2461446.727821407, 6)
        self.assertAlmostEqual(float(got["epoch"]), JD, 6)

    def test_a_hyperbolic_orbit_is_taken_with_its_negative_a(self):
        got = ce.parse_elements(HZ["rows"]["C/2025 N1"]["text"], JD)
        self.assertGreater(float(got["e"]), 6)
        self.assertLess(float(got["a"]), 0)

    def test_what_is_not_one_clean_row_is_nothing(self):
        text = HZ["rows"]["2P"]["text"]
        self.assertIsNone(ce.parse_elements("No matches found.", JD))
        self.assertIsNone(ce.parse_elements(text, JD + 1), "a row for another instant")
        self.assertIsNone(ce.parse_elements(None, JD))
        self.assertIsNone(ce.parse_elements(text.replace("8.473262790106070E-01", "1.000000000000000E+00"), JD), "a parabola has no a")
        self.assertIsNone(ce.parse_elements(text.replace("2.217750880586597E+00", "-2.2E+00"), JD), "an ellipse with a negative a")
        self.assertIsNone(ce.parse_elements(text.replace("3.385922791666587E-01", "0.000000000000000E+00"), JD), "no perihelion distance")

    def test_the_request_asks_heliocentric_ecliptic_elements_of_the_closest_apparition(self):
        u = ce.request_url("C/2025 N1", JD)
        for part in ("EPHEM_TYPE=ELEMENTS", "CENTER=%27500%4010%27", "REF_PLANE=ECLIPTIC", "OUT_UNITS=AU-D", "DES%3DC%2F2025%20N1%3BCAP%3BNOFRAG"):
            self.assertIn(part, u)

    def test_designations_are_what_horizons_takes(self):
        for name, want in [("     2P/Encke", "2P"), ("   109P/Swift-Tuttle", "109P"), ("    C/2025 N1 (ATLAS)", "C/2025 N1"),
                           ("    C/1995 O1 (Hale-Bopp)", "C/1995 O1"), ("    P/2010 H2 (Vales)", "P/2010 H2"), ("", None)]:
            self.assertEqual(ce.designation(name), want, name)

    def test_the_famous_list_is_the_apps(self):
        js = (ROOT / "site/js/scene/cometfield.js").read_text()
        app = re.search(r"export const FAMOUS = \[(.*?)\];", js).group(1)
        app = [m.replace("\\/", "/") for m in re.findall(r"/\^\\s\*([^,]+?)/(?=,|\s*$)", app)]
        self.assertEqual(app, ce.FAMOUS)

    def test_the_short_list_is_the_famous_ones_in_the_feed_then_the_brightest_not_all_and_never_the_hand_kept(self):
        got = ce.short_list(body(), JD)
        names = {d for _, d in got}
        self.assertEqual(len(got), len(names))
        self.assertTrue({"2P", "C/2025 N1"} <= names, "the two famous ones in the feed")
        self.assertNotIn("1P", names, "Halley's row is hand-kept in sample.js")
        self.assertLessEqual(len(got), ce.MAX_OBJECTS)
        big = body()
        big["data"] += [[f"   {1000 + i}P/Test{i}"] + ["0.5", "2", "1", "10", "10", "10", "10", "2461000.5", "2461000.5", "9", "10"][:len(FIELDS) - 1] for i in range(200)]
        self.assertLessEqual(len(ce.short_list(big, JD)), ce.MAX_OBJECTS)

    def test_the_rank_law_is_the_layers(self):
        row = dict(zip(FIELDS, ["x", "0.5", "2", "1", "10", "10", "10", "0", "2461360.5", "2461360.5", "5", "10"]))
        row["tp"] = "2461360.5"                       # at perihelion r = q = 1 au: m = M1
        self.assertAlmostEqual(ce.rank_mag(row, 2461360.5), 5.0, 6)
        row["e"], row["q"] = "1.5", "0.01"            # a hyperbola at perihelion, r = 0.01 au < 0.05: held at 0.05
        self.assertAlmostEqual(ce.rank_mag(row, 2461360.5), 5 + 15 * __import__("math").log10(0.05), 6)
        self.assertIsNone(ce.rank_mag({**row, "e": "1.0"}, 2461360.5), "a parabola is not ranked")
        self.assertIsNone(ce.rank_mag({**row, "M1": None}, 2461360.5))

    def test_each_listed_comet_gets_horizons_elements_and_the_rest_of_the_row_stays(self):
        sb, f = body(), Fake()
        out, n = ce.refine_body(sb, NOW, f, log=QUIET)
        self.assertEqual(n, 4)
        self.assertEqual(len(f.urls), 4)
        i = FIELDS.index
        for old, new in zip(sb["data"], out["data"]):
            if old[0].strip().startswith("1P/"):
                self.assertEqual(old, new)
                continue
            self.assertNotEqual(old[i("tp")], new[i("tp")])
            self.assertAlmostEqual(float(new[i("epoch")]), JD, 6)
            for k in ("full_name", "M1", "K1"):
                self.assertEqual(old[i(k)], new[i(k)])
        enc = next(r for r in out["data"] if r[0].strip().startswith("2P/"))
        self.assertAlmostEqual(float(enc[i("q")]), 0.3385922791666587, 12)

    def test_a_comet_horizons_does_not_answer_keeps_its_sbdb_row(self):
        sb = body()
        out, n = ce.refine_body(sb, NOW, Fake(fail=["21P"]), log=QUIET)
        self.assertEqual(n, 3)
        self.assertEqual(next(r for r in out["data"] if "21P" in r[0]), next(r for r in sb["data"] if "21P" in r[0]))
        out, n = ce.refine_body(sb, NOW, Fake(status=503), log=QUIET)
        self.assertEqual((n, out["data"]), (0, sb["data"]))

    def test_no_time_left_asks_nothing(self):
        out, n = ce.refine_body(body(), NOW, Fake(), budget_s=-1, log=QUIET)
        self.assertEqual(n, 0)

    def test_a_body_without_the_columns_is_left_alone(self):
        b = {"fields": ["full_name", "e"], "data": [["2P/Encke", "0.8"]]}
        self.assertEqual(ce.refine_body(b, NOW, Fake(), log=QUIET), (b, 0))

    def test_the_publish_step_rewrites_the_snapshot_once_and_says_so(self):
        import tempfile
        from harvest import snapshot as snap
        with tempfile.TemporaryDirectory() as tmp:
            store = snap.DirStore(tmp)
            doc = {"schema": snap.SCHEMA, "source": "jpl-sbdb-comets", "fetched_at": "2026-11-16T05:00:00Z", "valid_until": "2026-11-17T05:00:00Z", "body": json.dumps(body())}
            store_bytes = snap.write_snapshot(store, doc, now=NOW)
            man = snap.Manifest(snapshots={"jpl-sbdb-comets": snap.Entry(fetched_at=doc["fetched_at"], valid_until=doc["valid_until"],
                                                                         items=5, bytes=store_bytes, status="ok")})
            calls = []

            def refine(b, now, log=print):
                calls.append(1)
                return ce.refine_body(b, now, Fake(), log=log)

            publish._refine_comets(store, man, NOW, QUIET, refine)
            e = man.snapshots["jpl-sbdb-comets"]
            self.assertIn("4 comets", e.note)
            written = snap.read_snapshot(store, "jpl-sbdb-comets")
            self.assertEqual(written["note"], e.note)
            enc = next(r for r in json.loads(written["body"])["data"] if r[0].strip().startswith("2P/"))
            self.assertAlmostEqual(float(enc[FIELDS.index("q")]), 0.3385922791666587, 12)
            publish._refine_comets(store, man, NOW, QUIET, refine)          # already refined: no second round of requests
            self.assertEqual(len(calls), 1)
            publish._refine_comets(store, man, NOW, QUIET, None)            # a caller that passes nothing changes nothing

    def test_the_publish_step_never_raises(self):
        import tempfile
        from harvest import snapshot as snap
        with tempfile.TemporaryDirectory() as tmp:
            store = snap.DirStore(tmp)
            doc = {"schema": snap.SCHEMA, "source": "jpl-sbdb-comets", "fetched_at": "2026-11-16T05:00:00Z", "valid_until": "2026-11-17T05:00:00Z", "body": json.dumps(body())}
            n = snap.write_snapshot(store, doc, now=NOW)
            man = snap.Manifest(snapshots={"jpl-sbdb-comets": snap.Entry(fetched_at=doc["fetched_at"], valid_until=doc["valid_until"], items=5, bytes=n, status="ok")})

            def boom(b, now, log=print):
                raise RuntimeError("Horizons exploded")

            publish._refine_comets(store, man, NOW, QUIET, boom)
            self.assertIsNone(man.snapshots["jpl-sbdb-comets"].note)

    def test_the_hourly_run_wires_it_in(self):
        self.assertIn("refine_comets=comet_elements.refine_body", (ROOT / "harvest/publish.py").read_text())
        self.assertTrue(callable(publish.finish_and_queue))


if __name__ == "__main__":
    unittest.main()
