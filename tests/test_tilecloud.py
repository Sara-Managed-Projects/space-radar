#!/usr/bin/env python3
"""A1 tiles, the harvester's half (release 1.7.7, internal I#1059) and A9's tracked set built on it (I#1069).

Held here, with no network:

  1. THE FORMAT. A tile and a pick index written by harvest/tilepack.py read back to the stored numbers within half a
     quantum; every column starts at a multiple of its own width (so the page can take typed-array views); the same
     rows give the same bytes; a value that does not fit its type, a repeated id and an unsorted cut are refused.
  2. THE CUTS. Levels split by rank, brightest first inside a tile; bands and HEALPix partitions put a record in the
     tile the spec says; set.json names every tile with its size and the build stamp the tiles carry.
  3. THE QUEUE (harvest/slowjobs.py). A job is due when it never built or is a day old; it writes tiles first and
     set.json last; a failed or thin build keeps the last good set; a job is not started without time; nothing raises.
  4. A9 (harvest/tracked.py). A payload that only has "DEB" in its name is not debris; an orbit under the ground is
     dropped; an object is kept once; sizes become levels; the build reads CelesTrak's answers through the fetcher
     it is given and the satcat snapshot of the same publish.

The JS reader of the same bytes is held by tests/test_tilecloud.mjs and tests/test_tracked.mjs.

Run: python3 tests/test_tilecloud.py
"""

from __future__ import annotations

import json
import struct
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from harvest import fetch, slowjobs, tilepack, tracked  # noqa: E402
from harvest import snapshot as snap  # noqa: E402

NOW = datetime(2026, 11, 3, 12, 0, 0, tzinfo=timezone.utc)
SCHEMA = [
    {"name": "id", "type": "u32"},
    {"name": "ra", "type": "u32", "scale": 360 / 4294967296},
    {"name": "mag", "type": "i16", "scale": 0.01},
    {"name": "d", "type": "f64"},
    {"name": "kind", "type": "u8"},
]


def spec(**over):
    s = {"id": "demo", "schema": SCHEMA, "id_field": "id", "name_field": "name",
         "partition": {"kind": "bands", "field": "alt", "edges": [10, 20]},
         "rank": {"field": "mag", "cuts": [3.0, 6.0]}}
    s.update(over)
    return s


def rows():
    out = []
    for i in range(30):
        out.append({"id": 1000 + i * 7, "ra": (i * 12.34) % 360, "mag": -1.0 + i * 0.3, "d": i * 1.5 + 0.123456789,
                    "kind": i % 3, "alt": i, "name": f"OBJ {i}"})
    return out


class MemStore(snap.Store):
    def __init__(self):
        self.files, self.log = {}, []

    def read(self, key):
        return self.files.get(key)

    def write(self, key, data, *, content_type, cache_control):
        self.files[key] = data
        self.log.append((key, content_type, cache_control))


class Format(unittest.TestCase):
    def test_a_tile_reads_back_within_half_a_quantum(self):
        files = tilepack.build_set(spec(), rows(), NOW)
        doc = json.loads(files["set.json"])
        by_id = {r["id"]: r for r in rows()}
        seen = 0
        for t in doc["tiles"]:
            tile = tilepack.decode_tile(SCHEMA, files[t["path"]])
            self.assertEqual(tile["build"], doc["build"])
            self.assertEqual(tile["count"], t["count"])
            for i in range(tile["count"]):
                r = by_id[tile["cols"]["id"][i]]
                for f in SCHEMA[1:4]:
                    got = tilepack.dequantise(f, tile["cols"][f["name"]][i])
                    half = f.get("scale", 0) / 2 + 1e-9
                    self.assertLessEqual(abs(got - r[f["name"]]), half, f["name"])
                seen += 1
        self.assertEqual(seen, 30)

    def test_every_column_starts_at_a_multiple_of_its_width(self):
        data = tilepack.encode_tile(SCHEMA, rows()[:5], 0, 7)
        pos = 16
        for f in SCHEMA:
            width = tilepack.TYPES[f["type"]][1]
            pos = tilepack.align(pos, width)
            self.assertEqual(pos % width, 0)
            pos += 5 * width
        self.assertLessEqual(pos, len(data))
        self.assertEqual(len(data), pos)

    def test_the_same_rows_are_the_same_bytes(self):
        a = tilepack.build_set(spec(), rows(), NOW)
        b = tilepack.build_set(spec(), list(reversed(rows())), NOW)
        self.assertEqual(a.keys(), b.keys())
        for k in a:
            self.assertEqual(a[k], b[k], k)

    def test_what_does_not_fit_is_refused(self):
        bad = rows()
        bad[0]["mag"] = 500.0                      # 50 000 steps of 0.01 in an i16
        with self.assertRaises(tilepack.TileError):
            tilepack.build_set(spec(), bad, NOW)
        dup = rows() + [dict(rows()[0])]
        with self.assertRaises(tilepack.TileError):
            tilepack.build_set(spec(), dup, NOW)
        with self.assertRaises(tilepack.TileError):
            tilepack.build_set(spec(rank={"field": "mag", "cuts": [6.0, 3.0]}), rows(), NOW)
        with self.assertRaises(tilepack.TileError):
            tilepack.check_schema([{"name": "x", "type": "f32", "scale": 2}])
        with self.assertRaises(tilepack.TileError):
            tilepack.check_schema([{"name": "x", "type": "u12"}])

    def test_the_pick_index_finds_by_id(self):
        files = tilepack.build_set(spec(), rows(), NOW)
        doc = json.loads(files["set.json"])
        data = files["ids.bin"]
        self.assertEqual(data[:4], b"SRPI")
        n = struct.unpack_from("<I", data, 8)[0]
        self.assertEqual(n, 30)
        ids = struct.unpack_from("<%dI" % n, data, 16)
        self.assertEqual(list(ids), sorted(ids))
        pos = 16 + 4 * n
        tiles = struct.unpack_from("<%dH" % n, data, pos)
        pos = tilepack.align(pos + 2 * n, 4)
        rws = struct.unpack_from("<%dI" % n, data, pos)
        for i, rid in enumerate(ids):
            t = doc["tiles"][tiles[i]]
            tile = tilepack.decode_tile(SCHEMA, files[t["path"]])
            self.assertEqual(tile["cols"]["id"][rws[i]], rid)
        names = files["names.txt"].decode().split("\n")[:-1]
        self.assertEqual(names[ids.index(1000)], "OBJ 0")


class Cuts(unittest.TestCase):
    def test_levels_split_by_rank_and_the_brightest_come_first(self):
        files = tilepack.build_set(spec(partition={"kind": "single"}), rows(), NOW)
        doc = json.loads(files["set.json"])
        self.assertEqual([l["count"] for l in doc["levels"]], [sum(1 for r in rows() if r["mag"] < 3.0),
                                                              sum(1 for r in rows() if 3.0 <= r["mag"] < 6.0),
                                                              sum(1 for r in rows() if r["mag"] >= 6.0)])
        t0 = tilepack.decode_tile(SCHEMA, files["L0/all.bin"])
        mags = [tilepack.dequantise(SCHEMA[2], q) for q in t0["cols"]["mag"]]
        self.assertEqual(mags, sorted(mags))
        self.assertTrue(all(t["level"] == int(t["path"][1]) for t in doc["tiles"]))
        self.assertEqual(doc["tiles"][0]["bytes"], len(files[doc["tiles"][0]["path"]]))

    def test_bands_and_healpix_put_a_record_in_its_tile(self):
        p = {"kind": "bands", "field": "alt", "edges": [10, 20]}
        self.assertEqual([tilepack.tile_key(p, {"alt": a}) for a in (0, 9.9, 10, 19, 20, 500)], ["b0", "b0", "b1", "b1", "b2", "b2"])
        h = {"kind": "healpix", "nside": 2, "lon": "ra", "lat": "dec"}
        keys = {tilepack.tile_key(h, {"ra": ra, "dec": dec}) for ra in range(0, 360, 20) for dec in range(-85, 90, 10)}
        self.assertTrue(all(0 <= int(k[1:]) < tilepack.npix(2) for k in keys))
        self.assertEqual(tilepack.tile_key(h, {"ra": 10, "dec": 89.9}), "p0")             # the north cap
        self.assertEqual(tilepack.tile_key(h, {"ra": 10, "dec": -89.9}), "p%d" % (tilepack.npix(2) - 4))  # the south cap
        with self.assertRaises(tilepack.TileError):
            tilepack.tile_key({"kind": "rings"}, {})

    def test_set_json_carries_the_licence_and_the_stamp(self):
        files = tilepack.build_set(spec(source="S", licence="L", attribution="A"), rows(), NOW)
        doc = json.loads(files["set.json"])
        self.assertEqual((doc["format"], doc["source"], doc["licence"], doc["attribution"]), ("SRTC-1", "S", "L", "A"))
        self.assertEqual(doc["build"], tilepack.build_stamp(NOW))
        self.assertEqual(doc["built_at"], "2026-11-03T12:00:00Z")
        self.assertEqual(doc["count"], 30)


def fixture():
    gp = json.loads((ROOT / "tests/fixtures/tracked-gp-sample.json").read_text())
    satcat = (ROOT / "tests/fixtures/tracked-satcat-sample.csv").read_text()
    return gp, satcat


class Reply:
    def __init__(self, body, status=200):
        self.body, self.status = (body if isinstance(body, bytes) else json.dumps(body).encode()), status
        self.text = self.body.decode()


def fake_fetcher(gp, calls=None):
    def get(url, **kw):
        if calls is not None:
            calls.append((url, kw))
        if "NAME=DEB" in url:
            return Reply(gp["debris"])
        if "NAME=R%2FB" in url:
            return Reply(gp["rocket"])
        raise AssertionError(url)
    return get


def store_with_satcat(csv_text):
    st = MemStore()
    doc = snap.snapshot_doc(source_id="celestrak-satcat", fetched_at=NOW, until=NOW + timedelta(days=1), upstream_url="x",
                            content_type="text/csv", items=1, body=csv_text)
    st.write("celestrak-satcat.json", snap.encode(doc), content_type="application/json", cache_control="x")
    return st


class Tracked(unittest.TestCase):
    def test_the_build_reads_two_answers_and_the_satcat_snapshot(self):
        gp, satcat = fixture()
        calls = []
        st = store_with_satcat(satcat)
        files = tracked.build(store=st, now=NOW, fetcher=fake_fetcher(gp, calls), sleep=lambda s: None, log=lambda s: None)
        self.assertEqual(len(calls), 2)
        self.assertTrue(all(kw.get("retries") == 0 for _u, kw in calls), "CelesTrak firewalls a client that retries")
        doc = json.loads(files["set.json"])
        self.assertEqual(doc["id"], "tracked")
        self.assertEqual(doc["count"], len(gp["debris"]) + len(gp["rocket"]))
        self.assertEqual(doc["stats"]["debris"], len(gp["debris"]))
        self.assertEqual(doc["stats"]["rocket"], len(gp["rocket"]))
        self.assertEqual([l["level"] for l in doc["levels"]], [0, 1, 2])
        self.assertEqual(sum(l["count"] for l in doc["levels"]), doc["count"])
        self.assertIn("usage policy", doc["licence"])
        self.assertEqual(doc["attribution"], "Orbital data: CelesTrak (T. S. Kelso)")
        # Every rocket body is level 0, whatever its radar cross-section.
        rb_ids = {int(e["NORAD_CAT_ID"]) for e in gp["rocket"]}
        for t in doc["tiles"]:
            tile = tilepack.decode_tile(tracked.SCHEMA, files[t["path"]])
            for i in range(tile["count"]):
                if tile["cols"]["id"][i] in rb_ids:
                    self.assertEqual(t["level"], 0)
                    self.assertEqual(tile["cols"]["kind"][i], 1)

    def test_a_payload_with_deb_in_its_name_is_not_debris(self):
        gp, satcat = fixture()
        first = dict(gp["debris"][0])
        first["NORAD_CAT_ID"] = 99990
        first["OBJECT_NAME"] = "NOT DEBRIS DEB"
        sat = satcat + "NOT DEBRIS DEB,2020-001A,99990,PAY,+,US,2020-01-01,AFETR,,95.0,50.0,500,480,3.0000,,EA,ORB\n"
        rows_ = tracked.rows_from({0: gp["debris"] + [first], 1: gp["rocket"]}, tracked.satcat_index(sat))
        self.assertNotIn(99990, {r["id"] for r in rows_})
        self.assertEqual(len(rows_), len(gp["debris"]) + len(gp["rocket"]))

    def test_an_orbit_under_the_ground_and_a_repeat_are_dropped(self):
        gp, _ = fixture()
        low = dict(gp["debris"][0]); low["NORAD_CAT_ID"] = 99991; low["MEAN_MOTION"] = 17.0; low["ECCENTRICITY"] = 0.3
        gone = dict(gp["debris"][0]); gone["NORAD_CAT_ID"] = 99992; gone["ECCENTRICITY"] = 1.2
        again = dict(gp["debris"][1])
        out = tracked.rows_from({0: gp["debris"] + [low, gone, again], 1: []}, {})
        ids = [r["id"] for r in out]
        self.assertNotIn(99991, ids)
        self.assertNotIn(99992, ids)
        self.assertEqual(len(ids), len(set(ids)))

    def test_sizes_become_levels(self):
        self.assertEqual([tracked.size_rank(0, r) for r in (None, 0.01, 0.1, 0.99, 1.0, 40.0)], [2, 2, 1, 1, 0, 0])
        self.assertEqual(tracked.size_rank(1, None), 0)

    def test_epoch_seconds(self):
        self.assertEqual(tracked.epoch_seconds("2000-01-01T00:00:01.5"), 1.5)
        self.assertAlmostEqual(tracked.epoch_seconds("2026-11-02T11:41:41.815392"), 846934901.815392, places=5)

    def test_celestrak_saying_no_builds_nothing(self):
        msgs = []

        def refuse(url, **kw):
            return Reply(b"GP data has not updated since your last successful download", 403)
        self.assertIsNone(tracked.build(store=MemStore(), now=NOW, fetcher=refuse, sleep=lambda s: None, log=msgs.append))
        self.assertTrue(any("403" in m for m in msgs))

        def junk(url, **kw):
            return Reply(b"<html>")
        self.assertIsNone(tracked.build(store=MemStore(), now=NOW, fetcher=junk, sleep=lambda s: None, log=msgs.append))

        def down(url, **kw):
            raise fetch.FetchError("timed out")
        self.assertIsNone(tracked.build(store=MemStore(), now=NOW, fetcher=down, sleep=lambda s: None, log=msgs.append))


class Queue(unittest.TestCase):
    def setUp(self):
        self.gp, self.satcat = fixture()

    def run_queue(self, st, now=NOW, **kw):
        logs = []
        out = slowjobs.run_due(st, now, fetcher=fake_fetcher(self.gp), sleep=lambda s: None, log=logs.append, **kw)
        return out, logs

    def test_a_job_that_never_built_is_built_set_json_last(self):
        st = store_with_satcat(self.satcat)
        out, _ = self.run_queue(st)
        self.assertEqual(out, {"tracked": "built"})
        keys = [k for k, _t, _c in st.log if k.startswith("tiles/")]
        self.assertEqual(keys[-1], "tiles/tracked/set.json")
        self.assertIn("tiles/tracked/ids.bin", keys[:-1])
        types = {k: t for k, t, _c in st.log}
        self.assertEqual(types["tiles/tracked/set.json"], "application/json")
        self.assertEqual(types["tiles/tracked/ids.bin"], "application/octet-stream")
        cache = {k: c for k, _t, c in st.log}
        self.assertIn("max-age=900", cache["tiles/tracked/set.json"])

    def test_not_due_until_a_day_has_gone(self):
        st = store_with_satcat(self.satcat)
        self.run_queue(st)
        out, _ = self.run_queue(st, now=NOW + timedelta(hours=5))
        self.assertEqual(out, {"tracked": "not due"})
        out, _ = self.run_queue(st, now=NOW + timedelta(hours=23, minutes=10))      # the hourly slack
        self.assertEqual(out, {"tracked": "built"})

    def test_a_thin_build_keeps_the_last_good_set(self):
        st = store_with_satcat(self.satcat)
        self.run_queue(st)
        before = st.files["tiles/tracked/set.json"]
        self.gp = {"debris": self.gp["debris"][:5], "rocket": []}
        out, logs = self.run_queue(st, now=NOW + timedelta(days=2))
        self.assertTrue(out["tracked"].startswith("kept: 5 objects against"), out)
        self.assertEqual(st.files["tiles/tracked/set.json"], before)

    def test_a_failing_job_changes_nothing_and_raises_nothing(self):
        st = store_with_satcat(self.satcat)

        def boom(url, **kw):
            raise RuntimeError("x")
        logs = []
        out = slowjobs.run_due(st, NOW, fetcher=boom, sleep=lambda s: None, log=logs.append)
        self.assertTrue(out["tracked"].startswith("kept: RuntimeError"))
        self.assertNotIn("tiles/tracked/set.json", st.files)

    def test_no_time_no_start(self):
        st = store_with_satcat(self.satcat)
        out, _ = self.run_queue(st, deadline=105.0, clock=lambda: 50.0)       # 55 s left, a job needs 100
        self.assertEqual(out, {"tracked": "no time"})
        out, _ = self.run_queue(st, deadline=200.0, clock=lambda: 50.0)
        self.assertEqual(out, {"tracked": "built"})

    def test_the_hourly_run_and_the_command_line_both_run_the_queue(self):
        pub = (ROOT / "harvest/publish.py").read_text()
        self.assertIn("def finish_and_queue", pub)
        self.assertIn("finish=lambda *a: publish.finish_and_queue(*a, deadline=deadline)", (ROOT / "harvest/lambda_handler.py").read_text())
        self.assertIn("finish=publish.finish_and_queue", (ROOT / "harvest/__main__.py").read_text())


if __name__ == "__main__":
    result = unittest.main(exit=False, verbosity=0).result
    if result.wasSuccessful():
        print(f"PASS: {result.testsRun} checks -- tiles round-trip within half a quantum on aligned columns, the same rows are the same bytes, "
              "levels cut by rank and partitions by band or sky cell, the daily queue writes set.json last and keeps the last good set, "
              "and the tracked set drops what is not debris or not in orbit")
    sys.exit(0 if result.wasSuccessful() else 1)
