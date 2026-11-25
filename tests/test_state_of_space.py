"""The harvester's half of the research train "ops" (forge #558, #561): State of Space, the re-entry watch and SOCRATES.

  1. THE COUNT (harvest/stateofspace.py): the kinds in Earth orbit, the owners, the working flags today only, launches as
     international designators, beyond Earth; COUNTED BACK, a piece of a breakup is not counted before it was catalogued.
  2. THE RE-ENTRY WATCH: what came down in 30 days, the lowest whole orbits under 350 km, no date predicted.
  3. SOCRATES (harvest/parsers/celestrak_socrates.py): the header held, the first rows kept, a Range request, a cut last
     line dropped, a whole-file answer read the same, a 304 kept; docked and formation pairs (slower than 0.1 km/s), two
     parts of one station and a pair seen before are not kept (tests/fixtures/ops/socrates-docked-2026-11-25.csv).
  4. THE PUBLISH (harvest/publish.py rule 6): `state-of-space` and `reentry-watch` written beside the catalogue's copy with
     its stamps, not rebuilt when the stamps are the same, never a crash on a bad catalogue.
  5. THE FROZEN QUARTERS (scripts/state_of_space.py --check): every number with its source and date.

Run: python3 tests/test_state_of_space.py
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from harvest import fetch, publish  # noqa: E402
from harvest import snapshot as snap  # noqa: E402
from harvest import stateofspace as sos  # noqa: E402
from harvest.parsers import celestrak_socrates as soc  # noqa: E402

HEAD = "OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,OWNER,LAUNCH_DATE,LAUNCH_SITE,DECAY_DATE,PERIOD,INCLINATION,APOGEE,PERIGEE,RCS,DATA_STATUS_CODE,ORBIT_CENTER,ORBIT_TYPE"
ROWS = [
    "SAT A,2020-001A,100,PAY,+,US,2020-01-07,AFETR,,95.0,53.0,550,540,,,EA,ORB",
    "SAT B,2026-010A,90001,PAY,-,PRC,2026-02-01,JSC,,95.0,53.0,550,540,,,EA,ORB",
    "STARLINK-1,2026-020B,90010,PAY,+,US,2026-03-01,AFETR,,88.0,53.0,180,172,,,EA,ORB",
    "OLD R/B,1999-025B,25731,R/B,,PRC,1999-05-10,TSC,,100.0,98.0,850,840,,,EA,ORB",
    "FENGYUN 1C DEB,1999-025XY,95000,DEB,,PRC,1999-05-10,TSC,,101.0,98.0,860,800,,,EA,ORB",
    "GONE,2025-100A,80000,PAY,D,UK,2025-06-01,AFETR,2026-11-10,,,,,,,EA,IMP",
    "PROBE,2024-050A,70000,PAY,+,US,2024-04-01,AFETR,,,,,,,,SU,ORB",
    "LANDED,2024-060A,70100,PAY,,IND,2024-05-01,SRI,,,,,,,,MO,LAN",
]
CSV = "\n".join([HEAD] + ROWS) + "\n"


class Count(unittest.TestCase):
    def setUp(self):
        self.rows = sos.rows_of(CSV)

    def test_live(self):
        s = sos.summary(self.rows, date(2026, 11, 23))
        self.assertEqual(s["earth_orbit"], {"total": 5, "payload": 3, "rocket_body": 1, "debris": 1, "unknown": 0})
        self.assertEqual(s["working_payloads"], 2)
        self.assertEqual(s["starlink"], 1)
        self.assertEqual(s["launches_year"], {"year": 2026, "n": 2})
        self.assertEqual(s["beyond_earth"]["payloads"], 1)
        self.assertEqual(s["beyond_earth"]["working"], 1)
        self.assertEqual(s["came_down_30d"], 1)
        self.assertEqual(s["payload_owners"][0], ["US", 2])

    def test_counted_back_waits_for_the_catalogue(self):
        # On 2026-01-31 the piece numbered 95000 had not been catalogued (the edge is 90001 at most), though it carries
        # its parent's launch date of 1999; and nothing launched in 2026 was up yet.
        s = sos.summary(self.rows, date(2026, 1, 31), live=False)
        self.assertEqual(s["counted"], "counted back")
        self.assertIsNone(s["working_payloads"])
        self.assertEqual(s["earth_orbit"]["debris"], 0)
        self.assertEqual(s["earth_orbit"]["payload"], 2)        # SAT A and GONE, which came down in November
        self.assertEqual(s["launches_year"]["n"], 0)

    def test_quarters(self):
        ends = sos.quarter_ends(date(2025, 12, 1), date(2026, 11, 23))
        self.assertEqual([e.isoformat() for e in ends], ["2025-12-31", "2026-03-31", "2026-06-30", "2026-09-30"])
        h = sos.history(self.rows, date(2026, 11, 23), start=date(2026, 3, 31))
        self.assertEqual([p["q"] for p in h], ["2026-q1", "2026-q2", "2026-q3"])
        self.assertEqual(h[0]["launches"], 2)


class Watch(unittest.TestCase):
    def test_recent_and_lowest(self):
        w = sos.reentry_watch(sos.rows_of(CSV), date(2026, 11, 23))
        self.assertEqual([r["name"] for r in w["recent"]], ["GONE"])
        self.assertEqual([r["name"] for r in w["lowest"]], ["STARLINK-1"])
        self.assertTrue(all("predicted" not in r for r in w["lowest"]))


SOC = ("NORAD_CAT_ID_1,OBJECT_NAME_1,DSE_1,NORAD_CAT_ID_2,OBJECT_NAME_2,DSE_2,TCA,TCA_RANGE,TCA_RELATIVE_SPEED,MAX_PROB,DILUTION\n"
       "41603,LAPAN-A3 [+],4.872,68396,STARLINK-37190 [+],5.143,2026-11-27 19:37:34.527,0.004,14.563,1.000E+00,0.000\n"
       "63094,STARLINK-32927 [+],6.813,34856,COSMOS 2251 DEB [-],6.047,2026-11-28 19:12:59.173,0.020,4.365,2.176E-01,0.005\n"
       "1,CUT")


class Socrates(unittest.TestCase):
    def test_pack_and_count(self):
        whole = SOC[: SOC.rfind("\n")]
        self.assertEqual(soc.count(whole), 2)
        p = soc.pack(whole)
        self.assertEqual(p["columns"], soc.COLUMNS)
        self.assertEqual(len(p["rows"]), 2)
        self.assertEqual(soc.count(p), 2)
        with self.assertRaises(ValueError):
            soc.validate("A,B\n1,2")

    def test_fetch_with_a_range(self):
        asked = {}

        def fetcher(url, headers=None, etag=None, since=None):
            asked.update(headers or {})
            body = SOC.encode()
            return fetch.Response(url=url, status=206, body=body, content_type="text/csv", etag='"e1"', last_modified=None, duration_ms=1)

        src = type("S", (), {"url": "https://celestrak.org/SOCRATES/sort-maxProb.csv"})()
        got = soc.fetch(src, snap.Entry(), now=None, fetcher=fetcher)
        self.assertEqual(asked.get("Range"), f"bytes=0-{soc.RANGE_BYTES - 1}")
        self.assertEqual(got["status"], 200)
        self.assertFalse(got["body"].endswith("CUT"))
        self.assertEqual(soc.count(got["body"]), 2)

    def test_not_modified(self):
        def fetcher(url, **_):
            return fetch.Response(url=url, status=304, body=b"", content_type="text/csv", etag='"e1"', last_modified=None, duration_ms=1)
        src = type("S", (), {"url": "u"})()
        prev = snap.Entry(fetched_at="2026-11-23T00:00:00Z", valid_until="2026-11-24T00:00:00Z", items=2, bytes=1, status="ok", etag='"e1"')
        self.assertTrue(soc.fetch(src, prev, now=None, fetcher=fetcher)["not_modified"])


class SocratesDocked(unittest.TestCase):
    """2026-11-25: every one of the first 100 rows was ISS and the docked Soyuz MS-29, so the view listed it 20 times.
    The fixture's first four rows are that day's file verbatim; the others are shaped like it (a docked Progress, Shenzhou
    and Dragon, two modules of the Chinese station, the COSMOS 2581/2582 formation of 2026-11-24, a pair met twice with
    the two names the other way round, and two passes either side of 0.1 km/s)."""

    def setUp(self):
        self.csv = (ROOT / "tests/fixtures/ops/socrates-docked-2026-11-25.csv").read_text()

    def test_only_real_close_calls_are_kept(self):
        p = soc.pack(self.csv)
        names = [(r[1], r[4]) for r in p["rows"]]
        self.assertEqual(names, [("LAPAN-A3 [+]", "STARLINK-37190 [+]"), ("STARLINK-32927 [+]", "COSMOS 2251 DEB [-]"),
                                 ("STARLINK-4335 [+]", "STARLINK-38172 [+]"), ("STARLINK-4338 [+]", "STARLINK-38173 [+]")])
        self.assertEqual(p["read"], 16)
        self.assertEqual(p["dropped"], {"slow": 10, "same_object": 1, "repeat": 1})
        self.assertTrue(all(float(r[8]) >= soc.MIN_SPEED_KMS for r in p["rows"]))
        self.assertFalse(any("ISS" in r[1] or "ISS" in r[4] for r in p["rows"]))
        pairs = [tuple(sorted((r[0], r[3]))) for r in p["rows"]]
        self.assertEqual(len(pairs), len(set(pairs)), "a pair is listed once")
        self.assertEqual(soc.count(self.csv), 16, "the count guard still sees every row CelesTrak sent")

    def test_a_copy_saved_before_the_fix_is_cleaned_when_packed_again(self):
        old = {"columns": soc.COLUMNS, "rows": [r for r in soc._rows(self.csv) if r[0] == "25544"] * 5}
        self.assertEqual(soc.pack(old)["rows"], [])

    def test_family(self):
        self.assertEqual(soc._family(soc._name("ISS (ZARYA) [+]")), "ISS")
        self.assertIsNone(soc._family(soc._name("STARLINK-4335 [+]")))
        self.assertIsNone(soc._family(soc._name("COSMOS 2251 DEB [-]")))


class Publish(unittest.TestCase):
    def test_summaries_beside_the_catalogue(self):
        with tempfile.TemporaryDirectory() as d:
            store = snap.DirStore(d)
            now = snap.parse_iso("2026-11-23T10:38:04Z")
            until = now + timedelta(hours=24)
            doc = snap.snapshot_doc(source_id="celestrak-satcat", fetched_at=now, until=until, upstream_url="https://celestrak.org/pub/satcat.csv",
                                    content_type="text/csv", items=len(ROWS), body=CSV)
            snap.write_snapshot(store, doc, now=now)
            parent = snap.Entry(fetched_at=snap.iso(now), valid_until=snap.iso(until), items=len(ROWS), bytes=len(CSV), status="ok")
            manifest = snap.Manifest(snapshots={"celestrak-satcat": parent})
            logs = []
            for p_id, child, make, what in publish.summaries():
                publish._summarise(store, manifest, snap.Manifest(), p_id, child, make, what, now, logs.append)
            for child in ("state-of-space", "reentry-watch"):
                e = manifest.snapshots[child]
                self.assertEqual((e.fetched_at, e.valid_until), (parent.fetched_at, parent.valid_until), child)
                body = snap.read_snapshot(store, child)["body"]
                self.assertIsInstance(body, dict)
            self.assertEqual(snap.read_snapshot(store, "state-of-space")["body"]["earth_orbit"]["total"], 5)
            # The same stamps next run: nothing is read again, the row is carried.
            again = snap.Manifest(snapshots={"celestrak-satcat": parent})
            for p_id, child, make, what in publish.summaries():
                publish._summarise(store, again, manifest, p_id, child, make, what, now, logs.append)
            self.assertEqual(again.snapshots["state-of-space"].note, manifest.snapshots["state-of-space"].note)

    def test_a_bad_catalogue_is_left_out(self):
        with tempfile.TemporaryDirectory() as d:
            store = snap.DirStore(d)
            now = snap.parse_iso("2026-11-23T10:38:04Z")
            doc = snap.snapshot_doc(source_id="celestrak-satcat", fetched_at=now, until=now + timedelta(hours=24), upstream_url="u",
                                    content_type="text/csv", items=1, body={"not": "csv"})
            snap.write_snapshot(store, doc, now=now)
            parent = snap.Entry(fetched_at=snap.iso(now), valid_until=doc["valid_until"], items=1, bytes=1, status="ok")
            manifest = snap.Manifest(snapshots={"celestrak-satcat": parent})
            for p_id, child, make, what in publish.summaries():
                publish._summarise(store, manifest, snap.Manifest(), p_id, child, make, what, now, lambda s: None)
            self.assertNotIn("state-of-space", manifest.snapshots)


class Frozen(unittest.TestCase):
    def test_check(self):
        r = subprocess.run([sys.executable, str(ROOT / "scripts" / "state_of_space.py"), "--check"], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_q3_numbers(self):
        doc = json.loads((ROOT / "site/data/state-of-space/2026-q3.json").read_text(encoding="utf-8"))
        ids = [n["id"] for n in doc["numbers"]]
        self.assertIn("debris", ids)
        self.assertNotIn("working_payloads", ids)
        self.assertTrue(all(n["as_of"] == "2026-09-30" and n["source"] == "celestrak-satcat" for n in doc["numbers"]))


if __name__ == "__main__":
    result = unittest.main(exit=False, verbosity=0).result
    if result.wasSuccessful():
        print(f"PASS: {result.testsRun} checks -- the State of Space count and its counting back, the re-entry watch with no "
              "date, SOCRATES read by range and kept as CelesTrak's, the summaries beside the catalogue, every frozen number dated")
    sys.exit(0 if result.wasSuccessful() else 1)
