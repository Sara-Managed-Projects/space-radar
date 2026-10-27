#!/usr/bin/env python3
"""What the Lambda publishes, and the rule it must never break: a failing source never overwrites good data.

Internal spec 0078, stage r14-data (Ivan, 2026-10-26: "if the lambda failed fetching we use previous saved data
until updated"). Everything the old scripts/refresh-snapshots.sh made now comes out of harvest/ (publish.py), so
the Lambda and a laptop run one code path. Held here, with no network and no AWS:

  1. KEEP THE LAST GOOD COPY. A source that errors, is refused by the never-worse guard, or is not reached before
     the run's deadline leaves its snapshot file byte for byte as it was; its manifest row is the old copy with
     its OLD stamps (`status: ok`, `kept_after` saying why); with no copy at all it stays `error` and no file
     is made. The run never raises.
  2. INDEX LAST. Every snapshot and twin is written before index.json, in every run.
  3. DUE ON AN HOURLY SCHEDULE. A one-hour source is fetched by the next hourly run even when that run starts
     a few seconds early (slack), and not otherwise.
  4. THE CUT, THE DERIVED FILES, THE TWINS: jpl-sbdb-neo trimmed to jpl-cad's designations (and fetched whole
     again when jpl-cad is due), celestrak-notable / -geo / -starlink-recent beside their parents with the
     parent's stamps, <id>.cols.json for a big uniform catalogue; a run in which nothing changed reads and
     writes none of them again.
  5. A SOURCE THE REGISTRY SWITCHES OFF is published as `skipped` with no stamps.
  6. THE HANDLER: the same run, written to a bucket stub, index.json last, ONE path invalidated after it,
     errors summarised, nothing raised when a source fails.
  7. THE TWO PICTURE FEEDS (gibs_clouds, nowcoast_lightning): blanks walked past, the same slot not fetched twice,
     a satellite with no picture left out, the Python tables equal to data/gibs.js and data/lightning.js.

Run: python3 tests/test_harvest_publish.py
"""

from __future__ import annotations

import base64
import json
import re
import sys
import tempfile
import types
import unittest
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from harvest import fetch, lambda_handler, publish, registry  # noqa: E402
from harvest import snapshot as snap  # noqa: E402
from harvest.parsers import gibs_clouds, nowcoast_lightning  # noqa: E402
from harvest.run import run  # noqa: E402

FIX = ROOT / "tests" / "fixtures" / "harvest"
NOW = snap.parse_iso("2026-10-26T12:00:00Z")
HOUR = timedelta(hours=1)


def resp(url, status=200, text="", ct="application/json", body=None):
    b = body if body is not None else text.encode("utf-8")
    return fetch.Response(url=url, status=status, body=b, content_type=ct, etag=None, last_modified=None, duration_ms=1)


class Net:
    """A transport whose answers can be changed between runs; remembers what it was asked."""

    def __init__(self, answers):
        self.answers = dict(answers)    # url -> Response | callable(url) -> Response | Exception
        self.calls = []

    def __call__(self, url, **_):
        self.calls.append(url)
        a = self.answers[url] if url in self.answers else next(v for k, v in self.answers.items() if url.startswith(k))
        if isinstance(a, Exception):
            raise a
        return a(url) if callable(a) else a


class Rec(snap.DirStore):
    def __init__(self, root):
        super().__init__(root)
        self.writes = []
        self.reads = []

    def write(self, key, data, *, content_type, cache_control):
        self.writes.append(key)
        super().write(key, data, content_type=content_type, cache_control=cache_control)

    def read(self, key):
        self.reads.append(key)
        return super().read(key)


def src(id, parser="celestrak_gp", refresh="1h", url=None, **kw):
    return registry.Source(id=id, url=url or f"https://example.test/{id}", auth="none", refresh=refresh,
                           freshness_max="48h", parser=parser, outputs=(id + ".json",), **kw)


def gp(n, start=1):
    return json.dumps([{"OBJECT_NAME": f"S{i}", "OBJECT_ID": "2025-001A", "EPOCH": "2026-10-26T00:00:00", "MEAN_MOTION": 15.5,
                        "ECCENTRICITY": 0.0001, "INCLINATION": 51.6, "NORAD_CAT_ID": i} for i in range(start, start + n)])


def quiet(_line):
    pass


class KeepLastGood(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Rec(self.tmp.name)
        self.s = src("alpha")
        self.url = self.s.url

    def tearDown(self):
        self.tmp.cleanup()

    def go(self, net, now, **kw):
        self.store.writes.clear()
        return run(self.store, kw.pop("sources", [self.s]), now=now, fetcher=net, sleep=lambda s: None, log=quiet,
                   finish=publish.finish, **kw)

    def first(self, n=5):
        net = Net({self.url: resp(self.url, text=gp(n))})
        doc = self.go(net, NOW)
        self.assertEqual(doc["snapshots"]["alpha"]["status"], "ok")
        return (Path(self.tmp.name) / "alpha.json").read_bytes()

    def test_an_error_leaves_the_file_and_publishes_it_as_the_good_copy_it_was(self):
        before = self.first()
        net = Net({self.url: resp(self.url, status=503, text="down")})
        doc = self.go(net, NOW + 2 * HOUR)
        e = doc["snapshots"]["alpha"]
        self.assertEqual((e["status"], e["fetched_at"], e["valid_until"], e["items"]), ("ok", "2026-10-26T12:00:00Z", "2026-10-26T13:00:00Z", 5))
        self.assertIn("503", e["kept_after"])
        self.assertEqual((Path(self.tmp.name) / "alpha.json").read_bytes(), before, "the file is exactly what it was")
        self.assertNotIn("alpha.json", self.store.writes, "a failure writes no snapshot")
        self.assertEqual(self.store.writes[-1], "index.json")

    def test_a_dead_host_is_the_same(self):
        before = self.first()
        net = Net({self.url: fetch.FetchError("connection refused")})
        doc = self.go(net, NOW + 2 * HOUR)
        self.assertEqual(doc["snapshots"]["alpha"]["status"], "ok")
        self.assertIn("connection refused", doc["snapshots"]["alpha"]["kept_after"])
        self.assertEqual((Path(self.tmp.name) / "alpha.json").read_bytes(), before)

    def test_a_refusal_by_the_never_worse_guard_is_the_same(self):
        before = self.first(10)
        net = Net({self.url: resp(self.url, text=gp(2))})      # 2 of 10: under half
        doc = self.go(net, NOW + 2 * HOUR)
        e = doc["snapshots"]["alpha"]
        self.assertEqual((e["status"], e["items"]), ("ok", 10))
        self.assertIn("refused", e["kept_after"])
        self.assertEqual((Path(self.tmp.name) / "alpha.json").read_bytes(), before)

    def test_it_recovers_unattended_and_the_note_goes(self):
        self.first()
        self.go(Net({self.url: resp(self.url, status=500)}), NOW + 2 * HOUR)
        doc = self.go(Net({self.url: resp(self.url, text=gp(6))}), NOW + 3 * HOUR)
        e = doc["snapshots"]["alpha"]
        self.assertEqual((e["status"], e["items"], e["fetched_at"]), ("ok", 6, "2026-10-26T15:00:00Z"))
        self.assertNotIn("kept_after", e)

    def test_nothing_ever_fetched_stays_an_error_and_makes_no_file(self):
        doc = self.go(Net({self.url: resp(self.url, status=503)}), NOW)
        e = doc["snapshots"]["alpha"]
        self.assertEqual((e["status"], e["items"]), ("error", 0))
        self.assertFalse((Path(self.tmp.name) / "alpha.json").exists())
        self.assertNotIn("kept_after", e)

    def test_a_run_out_of_time_starts_nothing_and_still_writes_the_index(self):
        before = self.first()
        net = Net({})
        doc = self.go(net, NOW + 2 * HOUR, deadline=0.0)       # the deadline is long past
        self.assertEqual(net.calls, [], "no source was started")
        e = doc["snapshots"]["alpha"]
        self.assertEqual((e["status"], e["fetched_at"]), ("ok", "2026-10-26T12:00:00Z"))
        self.assertIn("out of time", e["kept_after"])
        self.assertEqual((Path(self.tmp.name) / "alpha.json").read_bytes(), before)
        self.assertEqual(self.store.writes, ["index.json"])

    def test_the_most_overdue_source_goes_first(self):
        a, b = src("alpha"), src("bravo")
        self.go(Net({a.url: resp(a.url, text=gp(3)), b.url: resp(b.url, text=gp(3))}), NOW, sources=[a, b])
        # alpha was read two hours later than bravo; both are due; bravo is the older and goes first
        ix = snap.read_index(self.store)
        ix.snapshots["alpha"].valid_until = "2026-10-26T14:00:00Z"
        ix.snapshots["bravo"].valid_until = "2026-10-26T13:00:00Z"
        snap.write_index(self.store, ix, generated_at=NOW, started_at=NOW, duration_ms=0, runner="local")
        net = Net({a.url: resp(a.url, text=gp(3)), b.url: resp(b.url, text=gp(3))})
        self.go(net, NOW + 5 * HOUR, sources=[a, b])
        self.assertEqual(net.calls, [b.url, a.url])


class Schedule(unittest.TestCase):
    def test_an_hourly_run_that_starts_seconds_early_still_fetches_an_hourly_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = Rec(tmp)
            s = src("alpha")
            net = Net({s.url: resp(s.url, text=gp(3))})
            run(store, [s], now=NOW, fetcher=net, sleep=lambda x: None, log=quiet)
            early = NOW + HOUR - timedelta(seconds=3)
            n0 = len(net.calls)
            d0 = run(store, [s], now=early, fetcher=net, sleep=lambda x: None, log=quiet)
            self.assertEqual((d0["snapshots"]["alpha"]["status"], len(net.calls)), ("not-due", n0), "without slack it waits another hour")
            d1 = run(store, [s], now=early, fetcher=net, sleep=lambda x: None, log=quiet, slack_s=lambda_handler.SLACK_S)
            self.assertEqual((d1["snapshots"]["alpha"]["status"], len(net.calls)), ("ok", n0 + 1), "with the Lambda's slack it is read")
            # but a three-hour source is not read every hour
            t = src("three", refresh="3h")
            net2 = Net({t.url: resp(t.url, text=gp(3))})
            run(store, [t], now=NOW, fetcher=net2, sleep=lambda x: None, log=quiet, slack_s=lambda_handler.SLACK_S)
            run(store, [t], now=NOW + HOUR, fetcher=net2, sleep=lambda x: None, log=quiet, slack_s=lambda_handler.SLACK_S)
            run(store, [t], now=NOW + 2 * HOUR, fetcher=net2, sleep=lambda x: None, log=quiet, slack_s=lambda_handler.SLACK_S)
            self.assertEqual(len(net2.calls), 1, "a 3 h source is read once in the first three hourly runs")
            run(store, [t], now=NOW + 3 * HOUR - timedelta(seconds=4), fetcher=net2, sleep=lambda x: None, log=quiet, slack_s=lambda_handler.SLACK_S)
            self.assertEqual(len(net2.calls), 2, "and again on the fourth, a few seconds early")


def sbdb(rows):
    fields = ["full_name", "spkid", "e", "a", "q", "i", "om", "w", "ma", "epoch", "H", "diameter", "class"]
    return json.dumps({"fields": fields, "count": len(rows), "data": [[n, i, "0.1", "1", "1", "1", "1", "1", "1", "2461200.5", "20", None, "APO"] for i, n in enumerate(rows)]})


def cad(des):
    return json.dumps({"fields": ["des", "cd", "dist", "v_rel"], "count": len(des), "data": [[d, "2026-Oct-27 07:50", "0.003", "13.5"] for d in des]})


class Publish(unittest.TestCase):
    """celestrak-active (with the ISS, a geostationary satellite and 1 200 others), the Starlink file, SBDB and CAD."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Rec(self.tmp.name)
        self.active = src("celestrak-active", refresh="6h")
        self.sl = src("celestrak-supplemental-starlink", refresh="3h")
        self.neo = src("jpl-sbdb-neo", parser="jpl_sbdb", refresh="24h")
        self.cad = src("jpl-cad", parser="jpl_cad", refresh="24h")
        self.all = [self.active, self.sl, self.neo, self.cad]
        rows = json.loads(gp(1200, 100))
        rows[0].update(NORAD_CAT_ID=25544, OBJECT_NAME="ISS (ZARYA)")                 # in NOTABLE
        rows[1].update(MEAN_MOTION=1.0027, ECCENTRICITY=0.0003, INCLINATION=0.05)     # geostationary
        self.active_body = json.dumps(rows)
        starlink = []
        for launch in range(1, 16):                                                    # 15 launches; the latest 12 are kept
            for k in range(3):
                starlink.append({"OBJECT_NAME": f"STARLINK-{launch}{k}", "OBJECT_ID": f"2025-{launch:03d}{'ABC'[k]}", "EPOCH": "2026-10-26T00:00:00",
                                 "MEAN_MOTION": 15.1, "NORAD_CAT_ID": 50000 + launch * 10 + k})
        self.sl_body = json.dumps(starlink)
        self.net = Net({
            self.active.url: resp(self.active.url, text=self.active_body),
            self.sl.url: resp(self.sl.url, text=self.sl_body),
            self.neo.url: resp(self.neo.url, text=sbdb(["(2026 RR1)", "   433 Eros (A898 PA)", "(2026 RN2)", "   719 Albert (A911 TB)"])),
            self.cad.url: resp(self.cad.url, text=cad(["2026 RR1", "2026 RN2"])),
        })

    def tearDown(self):
        self.tmp.cleanup()

    def go(self, now, sources=None, **kw):
        self.store.writes.clear()
        self.store.reads.clear()
        return run(self.store, sources or self.all, now=now, fetcher=self.net, sleep=lambda s: None, log=quiet,
                   slack_s=lambda_handler.SLACK_S, finish=publish.finish,
                   force_due=publish.force_due(snap.read_index(self.store), now, lambda_handler.SLACK_S), **kw)

    def file(self, sid):
        return json.loads((Path(self.tmp.name) / f"{sid}.json").read_text())

    def test_the_first_run_makes_everything_the_script_made_and_the_index_last(self):
        doc = self.go(NOW)
        s = doc["snapshots"]
        # the cut
        neo = self.file("jpl-sbdb-neo")
        names = [r[0].strip() for r in neo["body"]["data"]]
        self.assertEqual(names, ["(2026 RR1)", "(2026 RN2)"], "only the designations in jpl-cad")
        self.assertEqual((s["jpl-sbdb-neo"]["items"], neo["items"], s["jpl-sbdb-neo"]["bytes"]), (2, 2, (Path(self.tmp.name) / "jpl-sbdb-neo.json").stat().st_size))
        self.assertIn("trimmed from 4 rows to the 2", neo["note"])
        # the derived files, with the parent's stamps
        notable = self.file("celestrak-notable")
        self.assertEqual([r["NORAD_CAT_ID"] for r in notable["body"]], [25544])
        self.assertEqual((s["celestrak-notable"]["fetched_at"], s["celestrak-notable"]["valid_until"]), (s["celestrak-active"]["fetched_at"], s["celestrak-active"]["valid_until"]))
        self.assertEqual(s["celestrak-notable"]["items"], 1)
        self.assertEqual(len(self.file("celestrak-geo")["body"]), 1)
        recent = self.file("celestrak-starlink-recent")
        self.assertEqual({r["OBJECT_ID"][5:8] for r in recent["body"]}, {f"{n:03d}" for n in range(4, 16)}, "the twelve latest launches")
        # the twins: the 1 200-row catalogue, not the 45-row Starlink file or the cuts
        self.assertEqual(s["celestrak-active"]["columns"]["path"], "celestrak-active.cols.json")
        self.assertEqual(s["celestrak-active"]["columns"]["rows"], 1200)
        for sid in ("celestrak-supplemental-starlink", "celestrak-notable", "celestrak-geo", "jpl-cad"):
            self.assertNotIn("columns", s[sid], sid)
        twin = json.loads((Path(self.tmp.name) / "celestrak-active.cols.json").read_text())
        cols = twin["columns"]
        self.assertEqual([dict(zip(cols["keys"], v)) for v in zip(*cols["cols"])], json.loads(self.active_body), "the twin decodes to the verbatim rows")
        self.assertEqual(twin["fetched_at"], s["celestrak-active"]["fetched_at"])
        # the index is the last thing written
        self.assertEqual(self.store.writes[-1], "index.json")
        self.assertEqual(self.store.writes.count("index.json"), 1)
        self.assertLess(max(i for i, k in enumerate(self.store.writes) if k.endswith(".cols.json")), len(self.store.writes) - 1)

    def test_a_run_in_which_nothing_is_due_reads_and_writes_only_the_index(self):
        self.go(NOW)
        n = len(self.net.calls)
        doc = self.go(NOW + timedelta(minutes=30))
        self.assertEqual(len(self.net.calls), n, "nothing fetched")
        self.assertEqual(self.store.writes, ["index.json"], "no cut, derived file or twin is made again")
        big = [k for k in self.store.reads if k not in ("index.json",)]
        self.assertEqual(big, [], f"and no snapshot is read ({big})")
        self.assertEqual(doc["snapshots"]["celestrak-active"]["columns"]["rows"], 1200, "the twin stays in the manifest")
        self.assertIn("celestrak-notable", doc["snapshots"])

    def test_the_cut_table_is_fetched_whole_again_when_the_close_approach_list_is_due(self):
        self.go(NOW)
        self.net.answers[self.cad.url] = resp(self.cad.url, text=cad(["2026 RN2", "2026 QX9"]))
        self.net.answers[self.neo.url] = resp(self.neo.url, text=sbdb(["(2026 RN2)", "(2026 QX9)", "   433 Eros (A898 PA)"]))
        due = publish.force_due(snap.read_index(self.store), NOW + timedelta(hours=24), lambda_handler.SLACK_S)
        self.assertEqual(due, {"jpl-sbdb-neo"})
        # the table is not asked for when the list is not due
        self.assertEqual(publish.force_due(snap.read_index(self.store), NOW + HOUR, lambda_handler.SLACK_S), set())
        self.go(NOW + timedelta(hours=24))
        self.assertEqual([r[0].strip() for r in self.file("jpl-sbdb-neo")["body"]["data"]], ["(2026 RN2)", "(2026 QX9)"], "cut by the NEW list")

    def test_a_failed_parent_keeps_its_children_and_its_twin_pointing_at_the_old_files(self):
        self.go(NOW)
        old_active = (Path(self.tmp.name) / "celestrak-active.json").read_bytes()
        old_twin = (Path(self.tmp.name) / "celestrak-active.cols.json").read_bytes()
        self.net.answers[self.active.url] = resp(self.active.url, status=403, text="denied")
        doc = self.go(NOW + timedelta(hours=7))
        s = doc["snapshots"]
        self.assertEqual((s["celestrak-active"]["status"], s["celestrak-active"]["fetched_at"]), ("ok", "2026-10-26T12:00:00Z"))
        self.assertIn("403", s["celestrak-active"]["kept_after"])
        self.assertEqual(s["celestrak-notable"]["status"], "ok")
        self.assertEqual(s["celestrak-notable"]["fetched_at"], "2026-10-26T12:00:00Z")
        self.assertEqual(s["celestrak-active"]["columns"]["rows"], 1200)
        self.assertEqual((Path(self.tmp.name) / "celestrak-active.json").read_bytes(), old_active)
        self.assertEqual((Path(self.tmp.name) / "celestrak-active.cols.json").read_bytes(), old_twin)
        self.assertNotIn("celestrak-active.json", self.store.writes)

    def test_celestraks_403_text_is_not_modified_and_extends_the_twin_and_the_children(self):
        self.go(NOW)
        text = "GP data has not updated since your last successful download"
        self.net.answers[self.active.url] = resp(self.active.url, status=403, text=text)
        doc = self.go(NOW + timedelta(hours=6))
        s = doc["snapshots"]["celestrak-active"]
        self.assertEqual((s["status"], s["fetched_at"], s["valid_until"]), ("not-modified", "2026-10-26T12:00:00Z", "2026-10-27T00:00:00Z"))
        self.assertEqual(doc["snapshots"]["celestrak-geo"]["valid_until"], "2026-10-27T00:00:00Z", "the cut is extended with its parent")
        self.assertEqual(s["columns"]["valid_until"], "2026-10-27T00:00:00Z")
        twin = json.loads((Path(self.tmp.name) / "celestrak-active.cols.json").read_text())
        self.assertEqual(twin["valid_until"], "2026-10-27T00:00:00Z", "and the twin file says so too (the browser trusts the file's own stamp)")

    def test_a_source_switched_off_is_published_skipped_with_no_stamps(self):
        off = src("esa-neocc-close", parser="esa_neocc", enabled=False)
        # the earlier run left a good-looking row for it
        ix = snap.Manifest(snapshots={"esa-neocc-close": snap.Entry(fetched_at="2026-10-01T00:00:00Z", valid_until="2026-10-02T00:00:00Z", items=8, status="ok")})
        snap.write_index(self.store, ix, generated_at=NOW, started_at=NOW, duration_ms=0, runner="local")
        doc = self.go(NOW, sources=self.all + [off])
        e = doc["snapshots"]["esa-neocc-close"]
        self.assertEqual((e["status"], e["fetched_at"], e["valid_until"], e["items"]), ("skipped", None, None, 0))
        self.assertNotIn("esa-neocc-close", [c.rsplit("/", 1)[-1] for c in self.net.calls])

    def test_finish_only_publishes_files_that_arrived_some_other_way(self):
        # a working copy as a merged GitHub run leaves it: verbatim files and a manifest, no cuts, no twins
        self.go(NOW)
        for sid in ("celestrak-notable", "celestrak-geo", "celestrak-starlink-recent"):
            (Path(self.tmp.name) / f"{sid}.json").unlink()
        (Path(self.tmp.name) / "celestrak-active.cols.json").unlink()
        ix = snap.read_index(self.store)
        for sid in ("celestrak-notable", "celestrak-geo", "celestrak-starlink-recent"):
            del ix.snapshots[sid]
        ix.snapshots["celestrak-active"].columns = None
        snap.write_index(self.store, ix, generated_at=NOW, started_at=NOW, duration_ms=0, runner="local")
        doc = publish.finish_only(self.store, self.all, now=NOW + timedelta(minutes=5))
        for sid in ("celestrak-notable", "celestrak-geo", "celestrak-starlink-recent"):
            self.assertTrue((Path(self.tmp.name) / f"{sid}.json").exists(), sid)
            self.assertIn(sid, doc["snapshots"])
        self.assertTrue((Path(self.tmp.name) / "celestrak-active.cols.json").exists())
        self.assertEqual(snap.read_index(self.store).snapshots["celestrak-active"].columns["rows"], 1200)


# --- the handler ------------------------------------------------------------------------------------------


class S3Stub:
    class exceptions:                     # noqa: N801 - boto3's shape
        class NoSuchKey(Exception):
            pass

    def __init__(self):
        self.objects = {}
        self.puts = []

    def get_object(self, Bucket, Key):
        if Key not in self.objects:
            raise self.exceptions.NoSuchKey(Key)
        return {"Body": types.SimpleNamespace(read=lambda: self.objects[Key][0])}

    def put_object(self, Bucket, Key, Body, ContentType, CacheControl):
        self.objects[Key] = (Body, ContentType, CacheControl)
        self.puts.append(Key)


class CloudFrontStub:
    def __init__(self, s3):
        self.s3 = s3
        self.calls = []

    def create_invalidation(self, DistributionId, InvalidationBatch):
        # the invalidation must come after the index is in the bucket
        self.calls.append((DistributionId, InvalidationBatch, list(self.s3.puts)))
        return {"Invalidation": {"Id": "I123"}}


class Handler(unittest.TestCase):
    def setUp(self):
        self.s3 = S3Stub()
        self.cf = CloudFrontStub(self.s3)
        boto3 = types.ModuleType("boto3")
        boto3.client = lambda name, **k: self.s3 if name == "s3" else self.cf
        sys.modules["boto3"] = boto3
        self.a, self.b = src("alpha"), src("bravo")
        self.net = Net({self.a.url: resp(self.a.url, text=gp(4)), self.b.url: resp(self.b.url, status=503, text="down")})
        self._load, self._get = registry.load, fetch.get
        registry.load = lambda *a, **k: [self.a, self.b]
        fetch.get = self.net
        import os
        self.env = {"HARVEST_BUCKET": "bkt", "HARVEST_PREFIX": "data/v1", "HARVEST_DISTRIBUTION": "EDIST"}
        self._old_env = {k: os.environ.get(k) for k in self.env}
        os.environ.update(self.env)

    def tearDown(self):
        import os
        registry.load, fetch.get = self._load, self._get
        sys.modules.pop("boto3", None)
        for k, v in self._old_env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    def test_one_invocation(self):
        ctx = types.SimpleNamespace(get_remaining_time_in_millis=lambda: 900_000)
        out = lambda_handler.handler({"now": "2026-10-26T12:00:00Z"}, ctx)
        self.assertEqual(self.s3.puts[-1], "data/v1/index.json", "index.json is the last object written")
        self.assertEqual(self.s3.puts.count("data/v1/index.json"), 1)
        self.assertIn("data/v1/alpha.json", self.s3.puts)
        self.assertNotIn("data/v1/bravo.json", self.s3.puts, "a source that failed with no copy makes no file")
        self.assertEqual(out["statuses"], {"ok": 1, "error": 1})
        self.assertIn("bravo", out["errors"])
        self.assertEqual(out["invalidation"], "I123")
        self.assertEqual(len(self.cf.calls), 1)
        dist, batch, puts_before = self.cf.calls[0]
        self.assertEqual((dist, batch["Paths"]), ("EDIST", {"Quantity": 1, "Items": ["/data/v1/index.json"]}), "ONE path, the manifest")
        self.assertEqual(puts_before[-1], "data/v1/index.json", "and only after the manifest was written")
        ctl = {k: v[2] for k, v in self.s3.objects.items()}
        self.assertEqual(ctl["data/v1/index.json"], snap.INDEX_CACHE_CONTROL)
        self.assertRegex(ctl["data/v1/alpha.json"], r"^public, max-age=\d+, s-maxage=300$")

    def test_the_next_hour_keeps_what_a_failing_source_had_and_never_raises(self):
        ctx = types.SimpleNamespace(get_remaining_time_in_millis=lambda: 900_000)
        lambda_handler.handler({"now": "2026-10-26T12:00:00Z"}, ctx)
        alpha = self.s3.objects["data/v1/alpha.json"][0]
        self.net.answers[self.a.url] = fetch.FetchError("timed out")
        out = lambda_handler.handler({"now": "2026-10-26T13:00:00Z"}, ctx)
        self.assertEqual(self.s3.objects["data/v1/alpha.json"][0], alpha, "the object in the bucket is the old one, untouched")
        self.assertEqual(self.s3.puts.count("data/v1/alpha.json"), 1)
        self.assertIn("alpha", out["kept"])
        ix = json.loads(self.s3.objects["data/v1/index.json"][0])
        self.assertEqual((ix["snapshots"]["alpha"]["status"], ix["snapshots"]["alpha"]["fetched_at"]), ("ok", "2026-10-26T12:00:00Z"))

    def test_a_role_that_cannot_read_fails_loudly_and_writes_nothing(self):
        class Denied(S3Stub):
            def get_object(self, Bucket, Key):
                raise PermissionError("AccessDenied")
        self.s3 = Denied()
        with self.assertRaises(PermissionError):
            lambda_handler.handler({"now": "2026-10-26T12:00:00Z"}, None)
        self.assertEqual(self.s3.puts, [], "an unreadable bucket is not an empty one: nothing is overwritten")

    def test_the_invalidation_failing_is_said_not_raised(self):
        class Boom(CloudFrontStub):
            def create_invalidation(self, **k):
                raise RuntimeError("AccessDenied")
        self.cf = Boom(self.s3)
        out = lambda_handler.handler({"now": "2026-10-26T12:00:00Z"}, None)
        self.assertIsNone(out["invalidation"])
        self.assertEqual(self.s3.puts[-1], "data/v1/index.json")


# --- the two picture feeds --------------------------------------------------------------------------------


def jpeg(n):
    return b"\xff\xd8\xff" + b"\x00" * n + b"\xff\xd9"


class Pictures(unittest.TestCase):
    NOWPIC = snap.parse_iso("2026-10-26T21:55:00Z")

    def sat(self):
        return src("gibs-clouds", parser="gibs_clouds", url="https://gibs.test/wms")

    def domains(self, layer_end="21:50:00Z"):
        return f"<Domains><DimensionDomain><Domain>2026-10-26T15:50:00Z/2026-10-26T{layer_end}/PT10M</Domain></DimensionDomain></Domains>"

    def test_slots_come_newest_first_and_never_unlisted(self):
        iv = gibs_clouds.parse_domains(self.domains())
        got = gibs_clouds.candidate_slots(iv, self.NOWPIC)
        self.assertEqual([gibs_clouds.iso_minute(s) for s in got], ["2026-10-26T21:50:00Z", "2026-10-26T21:40:00Z", "2026-10-26T21:30:00Z", "2026-10-26T21:20:00Z"])
        early = gibs_clouds.candidate_slots(iv, snap.parse_iso("2026-10-26T21:41:00Z"))
        self.assertEqual(gibs_clouds.iso_minute(early[0]), "2026-10-26T21:40:00Z")

    def fetch_with(self, blank_slots=(), missing=(), prev=None):
        s = self.sat()

        def answer(url, **_):
            if url.endswith(".xml"):
                if any(m in url for m in missing):
                    return resp(url, status=500)
                return resp(url, text=self.domains(), ct="text/xml")
            slot = re.search(r"TIME=([^&]+)", url).group(1)
            if slot in blank_slots:
                return resp(url, body=jpeg(12000), ct="image/jpeg")        # GIBS's all-black picture of a slot it lists but has not drawn
            return resp(url, body=jpeg(50000), ct="image/jpeg")
        calls = []

        def f(url, **kw):
            calls.append(url)
            return answer(url, **kw)
        out = gibs_clouds.fetch(s, prev, now=self.NOWPIC, fetcher=f)
        return out, calls

    def test_a_blank_slot_is_walked_past(self):
        out, calls = self.fetch_with(blank_slots=("2026-10-26T21:50:00Z", "2026-10-26T21:40:00Z"))
        self.assertEqual(out["status"], 200)
        sats = out["body"]["satellites"]
        self.assertEqual(set(sats), {"goes-west", "goes-east", "himawari"})
        self.assertTrue(all(v["slot"] == "2026-10-26T21:30:00Z" for v in sats.values()), "the newest REAL picture of each")
        gibs_clouds.validate(out["body"])
        self.assertEqual(gibs_clouds.count(out["body"]), 3)

    def test_a_satellite_with_no_picture_is_left_out_and_the_others_saved(self):
        out, _ = self.fetch_with(missing=("Himawari",))
        self.assertEqual(set(out["body"]["satellites"]), {"goes-west", "goes-east"})

    def test_nothing_at_all_is_an_error_answer_not_an_empty_file(self):
        out, _ = self.fetch_with(blank_slots=tuple(f"2026-10-26T21:{m}:00Z" for m in ("50", "40", "30", "20")))
        self.assertNotEqual(out["status"], 200)
        self.assertIsNone(out["body"])

    def test_the_same_slots_are_not_downloaded_again(self):
        out, calls = self.fetch_with()
        prev = snap.Entry(fetched_at="2026-10-26T21:55:00Z", valid_until="2026-10-26T22:55:00Z", items=3, status="ok", etag=out["etag"])
        again, calls2 = self.fetch_with(prev=prev)
        self.assertTrue(again["not_modified"])
        self.assertEqual([c for c in calls2 if "GetMap" in c], [], "three small DescribeDomains answers, no picture")

    def test_the_python_tables_are_the_javascript_ones(self):
        js = (ROOT / "site/js/data/gibs.js").read_text(encoding="utf-8")
        layers = re.findall(r"\{ id: '([a-z-]+)', layer: '([A-Za-z0-9_-]+)'", js)
        self.assertEqual(tuple(layers), gibs_clouds.SATELLITES)
        num = lambda name: int(re.search(rf"export const {name} = ([\d* ]+);", js).group(1).replace(" ", "").split("*")[0]) if False else None  # noqa: E731
        self.assertEqual((int(re.search(r"IMAGE_W = (\d+)", js).group(1)), int(re.search(r"IMAGE_H = (\d+)", js).group(1))), (gibs_clouds.IMAGE_W, gibs_clouds.IMAGE_H))
        self.assertEqual(int(re.search(r"BLANK_MAX_BYTES = (\d+)", js).group(1)), gibs_clouds.BLANK_MAX_BYTES)
        self.assertEqual(int(re.search(r"MAX_SLOT_TRIES = (\d+)", js).group(1)), gibs_clouds.MAX_SLOT_TRIES)
        self.assertEqual(10 * 60, gibs_clouds.SLOT_S)
        self.assertIn("SLOT_MS = 10 * 60 * 1000", js)
        self.assertIn("DOMAIN_WINDOW_MS = 6 * 3600 * 1000", js)
        self.assertEqual(6 * 3600, gibs_clouds.DOMAIN_WINDOW_S)
        # the URLs are the browser's
        self.assertIn("BBOX=-90,-180,90,180", js)
        url = gibs_clouds.map_url("https://x/wms", "L", snap.parse_iso("2026-10-26T21:34:00Z"))
        self.assertIn("TIME=2026-10-26T21:30:00Z", url)
        self.assertIn("WIDTH=2048&HEIGHT=1024&FORMAT=image/jpeg", url)

    def test_lightning_reads_the_slot_then_that_map_and_not_the_same_slot_twice(self):
        s = src("noaa-lightning", parser="nowcoast_lightning", url="https://nowcoast.test/wms")
        caps = (FIX / "raw-nowcoast-caps.xml").read_text(encoding="utf-8")
        png = base64.b64decode(json.loads((FIX / "nowcoast_lightning.json").read_text())["base64"])
        calls = []

        def f(url, **_):
            calls.append(url)
            return resp(url, text=caps, ct="text/xml") if "GetCapabilities" in url else resp(url, body=png, ct="image/png")
        out = nowcoast_lightning.fetch(s, None, now=NOW, fetcher=f)
        self.assertEqual(out["status"], 200)
        self.assertEqual(out["body"]["slot"], "2026-10-26T22:45:00Z")
        self.assertIn("TIME=2026-10-26T22:45:00.000Z", calls[1])
        nowcoast_lightning.validate(out["body"])
        prev = snap.Entry(fetched_at="x", valid_until="y", items=1, status="ok", etag=out["etag"])
        calls.clear()
        again = nowcoast_lightning.fetch(s, prev, now=NOW, fetcher=f)
        self.assertTrue(again["not_modified"])
        self.assertEqual(len(calls), 1, "the capabilities only")
        js = (ROOT / "site/js/data/lightning.js").read_text(encoding="utf-8")
        self.assertIn(f"BBOX={{south}}", "BBOX={south}") if False else None
        self.assertEqual((nowcoast_lightning.WIDTH, nowcoast_lightning.HEIGHT), (int(re.search(r"GRID_W = (\d+)", js).group(1)), int(re.search(r"GRID_H = (\d+)", js).group(1))))
        self.assertEqual(re.search(r"BOX = \{ south: (-?\d+), north: (-?\d+), west: (-?\d+), east: (-?\d+) \}", js).groups(), ("-25", "80", "-180", "180"))
        self.assertEqual(nowcoast_lightning.BOX, (-25, -180, 80, 180))
        self.assertIn("ldn_lightning_strike_density", js)

    def test_a_lightning_picture_that_is_not_a_png_is_refused(self):
        with self.assertRaises(ValueError):
            nowcoast_lightning.validate({"slot": "2026-10-26T22:45:00Z", "base64": base64.b64encode(b"<html>").decode()})


if __name__ == "__main__":
    result = unittest.main(exit=False, verbosity=0).result
    if result.wasSuccessful():
        print(f"PASS: {result.testsRun} checks -- a failing source never overwrites its good copy and is published as that copy with its old stamps, "
              "the index is written last, an hourly run reads an hourly source, the cut/derived files/twins are the harvester's, "
              "the handler invalidates one path after the manifest, and the picture feeds walk past blanks")
    sys.exit(0 if result.wasSuccessful() else 1)
