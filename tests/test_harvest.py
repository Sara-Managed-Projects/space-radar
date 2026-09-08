#!/usr/bin/env python3
"""The harvester, tested the way its guards will be trusted: by breaking them.

Spec 0003 (amendment 1). Five things, in the order a reviewer should doubt them:

  1. Every parser, against what its source REALLY sends -- fixtures under tests/fixtures/harvest/
     are captured answers, trimmed only where CAPTURED.json says so. A parser written from the
     implementation passes forever and documents the wrong thing; these were written from the
     bodies.
  2. The never-worse guard at its edges: zero refused, 49 % refused, 50 % accepted.
  3. The clock: `valid_until = fetched_at + refresh`, the Cache-Control values from the contract.
  4. The two quirks the design names: CelesTrak's "has not updated since" 200/403 text is
     `not-modified`, never an error; a `secret:NAME` row without NAME is `skipped`, never failed.
  5. One whole run into a directory, through the real registry mirror, yielding an index.json
     that matches the contract key for key -- and a second run through the CLI that touches no
     network because nothing is due.

Nothing here reaches the network. The transport is injected; CelesTrak allows one download per
file per two hours and a test suite that spent it would be a test suite nobody could run twice.

Run: python3 tests/test_harvest.py
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from harvest import fetch, parsers, registry  # noqa: E402
from harvest import snapshot as snap  # noqa: E402
from harvest.run import run  # noqa: E402

FIXTURES = ROOT / "tests" / "fixtures" / "harvest"
NOW = snap.parse_iso("2026-09-08T00:00:00Z")

# What each captured body holds. A parser that disagrees with the body is wrong, not the body.
EXPECTED_COUNTS = {
    "celestrak_gp": 1,
    "celestrak_satcat": 15,
    "ll2": 2,
    "ll2_events": 2,
    "jpl_sbdb": 3,        # `count` in the body says 42293; the parser counts rows
    "jpl_cad": 15,
    "esa_neocc": 8,
    "mpc_comets": 5,
    "horizons": 1,        # two ids, one of which Horizons answered "No such record"
    "dsn_now": 14,
    "swpc": 81,
    "swpc_ovation": 10,
    "wikidata": 3,
    "space_track_tip": 1,  # documented shape, not a capture -- CAPTURED.json says so
}

CELESTRAK_TEXT = "GP data has not updated since your last successful download"


def fixture(parser: str):
    path = next(FIXTURES.glob(parser + ".*"))
    text = path.read_text(encoding="utf-8")
    if path.suffix == ".json":
        return json.loads(text), text, "application/json"
    ct = {"xml": "text/xml", "csv": "text/csv", "txt": "text/plain; charset=UTF-8"}[path.suffix[1:]]
    return text, text, ct


def response(url, status=200, text="", content_type="application/json", etag=None) -> fetch.Response:
    body = text.encode("utf-8")
    return fetch.Response(url=url, status=status, body=body, content_type=content_type, etag=etag,
                          last_modified=None, duration_ms=1)


class Fetcher:
    """A transport that answers from a table and remembers what it was asked."""

    def __init__(self, answer):
        self.answer = answer  # callable(url, headers, etag, since) -> Response, or raises
        self.calls = []

    def __call__(self, url, *, headers=None, etag=None, since=None, **_):
        self.calls.append({"url": url, "headers": headers or {}, "etag": etag, "since": since})
        return self.answer(url, headers or {}, etag, since)


class RecordingStore(snap.DirStore):
    def __init__(self, root):
        super().__init__(root)
        self.writes = []

    def write(self, key, data, *, content_type, cache_control):
        self.writes.append((key, content_type, cache_control, len(data)))
        super().write(key, data, content_type=content_type, cache_control=cache_control)


def source(**over) -> registry.Source:
    base = dict(id="test-source", url="https://example.test/data", auth="none", refresh="3h",
                freshness_max="48h", parser="celestrak_gp", outputs=("test.json",))
    base.update(over)
    return registry.Source(**base)


GP3 = json.dumps([
    {"OBJECT_NAME": "A", "EPOCH": "2026-09-07T00:00:00", "MEAN_MOTION": 15.5, "NORAD_CAT_ID": 1},
    {"OBJECT_NAME": "B", "EPOCH": "2026-09-07T00:00:00", "MEAN_MOTION": 15.5, "NORAD_CAT_ID": 2},
    {"OBJECT_NAME": "C", "EPOCH": "2026-09-07T00:00:00", "MEAN_MOTION": 15.5, "NORAD_CAT_ID": 3},
])


def gp(n: int) -> str:
    return json.dumps([{"OBJECT_NAME": f"S{i}", "EPOCH": "2026-09-07T00:00:00", "MEAN_MOTION": 15.5,
                        "NORAD_CAT_ID": i} for i in range(1, n + 1)])


# --- 1. parsers ---------------------------------------------------------------------------------


class Parsers(unittest.TestCase):
    def test_every_registry_parser_has_a_module_and_a_fixture(self):
        names = {s.parser for s in registry.load()}
        for name in sorted(names):
            with self.subTest(parser=name):
                parsers.load(name)
                self.assertTrue(list(FIXTURES.glob(name + ".*")), f"no fixture for parser {name}")
                self.assertIn(name, EXPECTED_COUNTS)

    def test_counts_match_the_captured_bodies(self):
        for name, want in EXPECTED_COUNTS.items():
            with self.subTest(parser=name):
                body, _, _ = fixture(name)
                mod = parsers.load(name)
                if hasattr(mod, "validate"):
                    mod.validate(body)
                self.assertEqual(mod.count(body), want)

    def test_every_parser_refuses_a_body_that_is_not_its_source(self):
        for name in EXPECTED_COUNTS:
            with self.subTest(parser=name):
                mod = parsers.load(name)
                with self.assertRaises(ValueError):
                    mod.count(42)

    def test_a_parser_that_does_not_exist_is_named(self):
        with self.assertRaises(parsers.ParserMissing) as cm:
            parsers.load("no_such_parser")
        self.assertIn("no_such_parser", str(cm.exception))

    def test_horizons_names_the_ids_that_came_back_empty(self):
        body, _, _ = fixture("horizons")
        self.assertEqual(parsers.load("horizons").missing(body), ["-999999"])

    def test_celestrak_text_is_recognised(self):
        gp_mod = parsers.load("celestrak_gp")
        self.assertTrue(gp_mod.not_modified(CELESTRAK_TEXT))
        self.assertFalse(gp_mod.not_modified("[]"))
        self.assertFalse(gp_mod.not_modified("Forbidden"))


# --- 2. the guard ---------------------------------------------------------------------------------


class Guard(unittest.TestCase):
    def test_zero_is_refused(self):
        self.assertFalse(snap.accept(0, None)[0])
        self.assertFalse(snap.accept(0, 100)[0])

    def test_under_half_is_refused(self):
        ok, reason = snap.accept(49, 100)
        self.assertFalse(ok)
        self.assertIn("49", reason)
        self.assertIn("100", reason)

    def test_half_is_accepted(self):
        self.assertTrue(snap.accept(50, 100)[0])
        self.assertTrue(snap.accept(100, 100)[0])
        self.assertTrue(snap.accept(1, None)[0])

    def test_no_previous_accepts_anything_positive(self):
        self.assertTrue(snap.accept(1, 0)[0])


# --- 3. the clock ---------------------------------------------------------------------------------


class Clock(unittest.TestCase):
    def test_durations(self):
        self.assertEqual(registry.parse_duration("15m"), 900)
        self.assertEqual(registry.parse_duration("3h"), 10800)
        self.assertEqual(registry.parse_duration("24h"), 86400)
        self.assertEqual(registry.parse_duration("168h"), 604800)
        for bad in ("", "3", "h", "3 h", "sometimes", "3.5h"):
            with self.assertRaises(registry.RegistryError):
                registry.parse_duration(bad)

    def test_valid_until_is_fetched_at_plus_refresh(self):
        self.assertEqual(snap.iso(snap.valid_until(NOW, 10800)), "2026-09-08T03:00:00Z")
        self.assertEqual(snap.iso(snap.valid_until(NOW, 604800)), "2026-09-15T00:00:00Z")

    def test_cache_control_values_from_the_contract(self):
        self.assertEqual(snap.INDEX_CACHE_CONTROL, "public, max-age=60, s-maxage=300, stale-while-revalidate=600")
        self.assertEqual(snap.snapshot_cache_control(NOW + timedelta(hours=3), NOW), "public, max-age=10800")
        self.assertEqual(snap.snapshot_cache_control(NOW + timedelta(seconds=5), NOW), "public, max-age=60")
        self.assertEqual(snap.snapshot_cache_control(NOW - timedelta(hours=1), NOW), "public, max-age=60")

    def test_iso_shape(self):
        self.assertEqual(snap.iso(NOW), "2026-09-08T00:00:00Z")
        self.assertEqual(fetch.http_date("2026-09-08T00:00:00Z"), "Tue, 08 Sep 2026 00:00:00 GMT")


# --- 4. the quirks ---------------------------------------------------------------------------------


class Quirks(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = RecordingStore(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def first_run(self, src=None, body=GP3, etag='"abc"'):
        src = src or source()
        f = Fetcher(lambda url, h, e, s: response(url, text=body, etag=etag))
        doc = run(self.store, [src], now=NOW, fetcher=f, sleep=lambda s: None, log=lambda s: None)
        self.assertEqual(doc["snapshots"][src.id]["status"], "ok")
        return src, doc

    def test_celestrak_200_text_is_not_modified(self):
        src, _ = self.first_run()
        later = NOW + timedelta(hours=4)
        f = Fetcher(lambda url, h, e, s: response(url, text=CELESTRAK_TEXT, content_type="text/plain"))
        doc = run(self.store, [src], now=later, fetcher=f, sleep=lambda s: None, log=lambda s: None)
        e = doc["snapshots"][src.id]
        self.assertEqual(e["status"], "not-modified")
        self.assertIsNone(e["last_error"])
        self.assertEqual(e["items"], 3)
        self.assertEqual(e["fetched_at"], "2026-09-08T00:00:00Z", "fetched_at is when the bytes arrived")
        self.assertEqual(e["valid_until"], "2026-09-08T07:00:00Z", "confirmed current: validity extended")
        snapshot = json.loads((Path(self.tmp.name) / "test-source.json").read_text())
        self.assertEqual(len(snapshot["body"]), 3, "the previous body stays")
        self.assertEqual(snapshot["valid_until"], "2026-09-08T07:00:00Z")

    def test_celestrak_403_text_is_not_modified_too(self):
        src, _ = self.first_run()
        f = Fetcher(lambda url, h, e, s: response(url, status=403, text=CELESTRAK_TEXT, content_type="text/html"))
        doc = run(self.store, [src], now=NOW + timedelta(hours=4), fetcher=f, sleep=lambda s: None, log=lambda s: None)
        self.assertEqual(doc["snapshots"][src.id]["status"], "not-modified")

    def test_http_304_is_not_modified_and_the_etag_was_sent(self):
        src, _ = self.first_run(etag='"v1"')
        f = Fetcher(lambda url, h, e, s: response(url, status=304, text=""))
        doc = run(self.store, [src], now=NOW + timedelta(hours=4), fetcher=f, sleep=lambda s: None, log=lambda s: None)
        self.assertEqual(doc["snapshots"][src.id]["status"], "not-modified")
        self.assertEqual(f.calls[0]["etag"], '"v1"')
        self.assertEqual(f.calls[0]["since"], "2026-09-08T00:00:00Z")

    def test_not_modified_without_a_snapshot_is_an_error_that_resets(self):
        src = source()
        f = Fetcher(lambda url, h, e, s: response(url, text=CELESTRAK_TEXT, content_type="text/plain"))
        doc = run(self.store, [src], now=NOW, fetcher=f, sleep=lambda s: None, log=lambda s: None)
        e = doc["snapshots"][src.id]
        self.assertEqual(e["status"], "error")
        self.assertIn("no previous snapshot", e["last_error"])
        self.assertIsNone(e["valid_until"], "so the next run fetches fresh")

    def test_secret_row_is_skipped_not_failed(self):
        src = source(auth="secret:HARVEST_TEST_SECRET")
        f = Fetcher(lambda url, h, e, s: self.fail("must not fetch without the secret"))
        doc = run(self.store, [src], now=NOW, fetcher=f, env={}, sleep=lambda s: None, log=lambda s: None)
        e = doc["snapshots"][src.id]
        self.assertEqual(e["status"], "skipped")
        self.assertIn("HARVEST_TEST_SECRET", e["last_error"])
        self.assertEqual(f.calls, [])

    def test_secret_row_with_the_secret_is_not_skipped(self):
        src = source(auth="secret:HARVEST_TEST_SECRET")
        f = Fetcher(lambda url, h, e, s: response(url, text=GP3))
        doc = run(self.store, [src], now=NOW, fetcher=f, env={"HARVEST_TEST_SECRET": "x"},
                  sleep=lambda s: None, log=lambda s: None)
        self.assertNotEqual(doc["snapshots"][src.id]["status"], "skipped")

    def test_disabled_row_is_skipped(self):
        src = source(enabled=False)
        f = Fetcher(lambda url, h, e, s: self.fail("must not fetch a disabled row"))
        doc = run(self.store, [src], now=NOW, fetcher=f, sleep=lambda s: None, log=lambda s: None)
        self.assertEqual(doc["snapshots"][src.id]["status"], "skipped")

    def test_not_due_touches_no_network(self):
        src, _ = self.first_run()
        f = Fetcher(lambda url, h, e, s: self.fail("not due; must not fetch"))
        doc = run(self.store, [src], now=NOW + timedelta(hours=2), fetcher=f, sleep=lambda s: None, log=lambda s: None)
        e = doc["snapshots"][src.id]
        self.assertEqual(e["status"], "not-due")
        self.assertEqual(e["items"], 3)
        self.assertEqual(e["valid_until"], "2026-09-08T03:00:00Z")

    def test_under_half_is_refused_and_the_snapshot_stays(self):
        src, _ = self.first_run(body=gp(100))
        f = Fetcher(lambda url, h, e, s: response(url, text=gp(49)))
        doc = run(self.store, [src], now=NOW + timedelta(hours=4), fetcher=f, sleep=lambda s: None, log=lambda s: None)
        e = doc["snapshots"][src.id]
        self.assertEqual(e["status"], "refused")
        self.assertEqual(e["items"], 100)
        self.assertEqual(e["fetched_at"], "2026-09-08T00:00:00Z")
        self.assertIn("49", e["last_error"])
        self.assertEqual(len(json.loads((Path(self.tmp.name) / "test-source.json").read_text())["body"]), 100)

    def test_half_is_accepted(self):
        src, _ = self.first_run(body=gp(100))
        f = Fetcher(lambda url, h, e, s: response(url, text=gp(50)))
        doc = run(self.store, [src], now=NOW + timedelta(hours=4), fetcher=f, sleep=lambda s: None, log=lambda s: None)
        e = doc["snapshots"][src.id]
        self.assertEqual(e["status"], "ok")
        self.assertEqual(e["items"], 50)

    def test_zero_items_is_refused(self):
        src = source()
        f = Fetcher(lambda url, h, e, s: response(url, text="[]"))
        doc = run(self.store, [src], now=NOW, fetcher=f, sleep=lambda s: None, log=lambda s: None)
        self.assertEqual(doc["snapshots"][src.id]["status"], "refused")
        self.assertFalse((Path(self.tmp.name) / "test-source.json").exists())

    def test_transport_failure_keeps_the_previous_stamps(self):
        src, _ = self.first_run()

        def boom(url, h, e, s):
            raise fetch.FetchError("could not reach the server: timed out (after 2 attempt(s))")

        doc = run(self.store, [src], now=NOW + timedelta(hours=4), fetcher=Fetcher(boom), sleep=lambda s: None, log=lambda s: None)
        e = doc["snapshots"][src.id]
        self.assertEqual(e["status"], "error")
        self.assertIn("timed out", e["last_error"])
        self.assertEqual(e["items"], 3)
        self.assertEqual(e["fetched_at"], "2026-09-08T00:00:00Z")

    def test_http_500_is_an_error_with_the_status_in_words(self):
        src = source()
        f = Fetcher(lambda url, h, e, s: response(url, status=500, text="oops", content_type="text/plain"))
        doc = run(self.store, [src], now=NOW, fetcher=f, sleep=lambda s: None, log=lambda s: None)
        self.assertIn("HTTP 500", doc["snapshots"][src.id]["last_error"])

    def test_a_parser_that_raises_is_an_error_not_a_crash(self):
        src = source()
        f = Fetcher(lambda url, h, e, s: response(url, text='{"not": "a list"}'))
        doc = run(self.store, [src], now=NOW, fetcher=f, sleep=lambda s: None, log=lambda s: None)
        e = doc["snapshots"][src.id]
        self.assertEqual(e["status"], "error")
        self.assertIn("celestrak_gp", e["last_error"])

    def test_json_body_is_stored_parsed_and_text_as_text(self):
        src, _ = self.first_run()
        doc = json.loads((Path(self.tmp.name) / "test-source.json").read_text())
        self.assertEqual(set(doc), {"schema", "source", "fetched_at", "valid_until", "upstream_url", "content_type", "items", "body"})
        self.assertIsInstance(doc["body"], list)
        text_src = source(id="text-source", parser="mpc_comets", url="https://example.test/c.txt")
        body, text, ct = fixture("mpc_comets")
        f = Fetcher(lambda url, h, e, s: response(url, text=text, content_type=ct))
        run(self.store, [text_src], now=NOW, fetcher=f, sleep=lambda s: None, log=lambda s: None)
        doc = json.loads((Path(self.tmp.name) / "text-source.json").read_text())
        self.assertIsInstance(doc["body"], str)
        self.assertEqual(doc["content_type"], ct)

    def test_snapshot_and_index_carry_the_contract_headers(self):
        self.first_run()
        by_key = {k: (ct, cc) for k, ct, cc, _ in self.store.writes}
        self.assertEqual(by_key["index.json"], ("application/json", snap.INDEX_CACHE_CONTROL))
        self.assertEqual(by_key["test-source.json"], ("application/json", "public, max-age=10800"))

    def test_list_row_makes_one_request_per_id_and_maps_them(self):
        good = fixture("horizons")[0]["-170"]
        lst = {"params": {"COMMAND": "'{id}'", "START_TIME": "'{start}'", "STOP_TIME": "'{stop}'", "format": "json"},
               "window": {"before": "1d", "after": "30d"}, "pause_s": 0.5,
               "ids": [{"id": "-170"}, {"id": "-31"}, {"id": "-999999"}]}
        src = source(id="list-source", parser="horizons", list=lst, refresh="24h")
        pauses = []

        def answer(url, h, e, s):
            if "-999999" in url:
                return response(url, text=json.dumps({"result": "No such record, positive values only"}))
            return response(url, text=json.dumps({"result": good}))

        f = Fetcher(answer)
        doc = run(self.store, [src], now=NOW, fetcher=f, sleep=pauses.append, log=lambda s: None)
        e = doc["snapshots"][src.id]
        self.assertEqual(len(f.calls), 3)
        self.assertEqual(pauses, [0.5, 0.5], "a pause between requests, not before the first")
        self.assertIn("COMMAND=%27-170%27", f.calls[0]["url"])
        self.assertIn("START_TIME=%272026-09-07%27", f.calls[0]["url"])
        self.assertIn("STOP_TIME=%272026-10-08%27", f.calls[0]["url"])
        self.assertEqual(e["status"], "ok")
        self.assertEqual(e["items"], 2, "the id with no rows does not count")
        snapshot = json.loads((Path(self.tmp.name) / "list-source.json").read_text())
        self.assertEqual(set(snapshot["body"]), {"-170", "-31", "-999999"})
        self.assertTrue(snapshot["body"]["-170"].lstrip().startswith("****"), "the `result` text, unwrapped")

    def test_list_row_reports_a_failed_id_without_losing_the_others(self):
        good = fixture("horizons")[0]["-170"]
        lst = {"params": {"COMMAND": "'{id}'"}, "ids": [{"id": "-170"}, {"id": "-31"}]}
        src = source(id="list-source", parser="horizons", list=lst, refresh="24h")

        def answer(url, h, e, s):
            if "-31" in url:
                raise fetch.FetchError("timed out (after 2 attempt(s))")
            return response(url, text=json.dumps({"result": good}))

        doc = run(self.store, [src], now=NOW, fetcher=Fetcher(answer), sleep=lambda s: None, log=lambda s: None)
        e = doc["snapshots"][src.id]
        self.assertEqual(e["status"], "ok")
        self.assertEqual(e["items"], 1)
        self.assertIn("-31", e["last_error"])

    def test_query_row_sends_the_query_and_the_sparql_accept_header(self):
        body, text, ct = fixture("wikidata")
        src = source(id="query-source", parser="wikidata", url="https://query.example.test/sparql",
                     query="SELECT ?x WHERE { ?x ?p ?o } LIMIT 1\n")
        f = Fetcher(lambda url, h, e, s: response(url, text=text, content_type=ct))
        doc = run(self.store, [src], now=NOW, fetcher=f, sleep=lambda s: None, log=lambda s: None)
        self.assertEqual(doc["snapshots"][src.id]["status"], "ok")
        self.assertIn("query=SELECT", f.calls[0]["url"])
        self.assertEqual(f.calls[0]["headers"].get("Accept"), "application/sparql-results+json")
        self.assertEqual(f.calls[0]["headers"].get("User-Agent", fetch.USER_AGENT), fetch.USER_AGENT)


# --- 5. a whole run ------------------------------------------------------------------------------


INDEX_KEYS = {"schema", "generated_at", "run", "snapshots"}
RUN_KEYS = {"started_at", "duration_ms", "runner"}
ENTRY_KEYS = {"fetched_at", "valid_until", "items", "bytes", "duration_ms", "status", "last_error", "etag"}


def assert_valid_index(tc: unittest.TestCase, doc: dict, source_ids: set[str]) -> None:
    tc.assertEqual(set(doc), INDEX_KEYS)
    tc.assertEqual(doc["schema"], 1)
    tc.assertEqual(set(doc["run"]), RUN_KEYS)
    tc.assertIn(doc["run"]["runner"], ("lambda", "local"))
    snap.parse_iso(doc["generated_at"])
    snap.parse_iso(doc["run"]["started_at"])
    tc.assertEqual(set(doc["snapshots"]), source_ids, "every registry row appears, no more, no fewer")
    for sid, e in doc["snapshots"].items():
        tc.assertEqual(set(e), ENTRY_KEYS, sid)
        tc.assertIn(e["status"], snap.STATUSES, sid)
        for k in ("items", "bytes", "duration_ms"):
            tc.assertIsInstance(e[k], int, f"{sid}.{k}")
        for k in ("fetched_at", "valid_until"):
            if e[k] is not None:
                snap.parse_iso(e[k])
        if e["status"] in ("ok", "not-modified"):
            tc.assertIsNotNone(e["fetched_at"], sid)
            tc.assertIsNotNone(e["valid_until"], sid)
            tc.assertGreater(e["items"], 0, sid)


class WholeRun(unittest.TestCase):
    def test_a_dest_run_through_the_real_mirror_yields_a_valid_index(self):
        sources = registry.load()
        ids = {s.id for s in sources}
        by_url = {s.url: s for s in sources}
        good_hz = fixture("horizons")[0]["-170"]

        def answer(url, h, e, s):
            base = url.split("?")[0]
            src = by_url.get(url) or next((v for k, v in by_url.items() if k.split("?")[0] == base), None)
            if src is None:
                raise AssertionError(f"unexpected url {url}")
            if src.list:
                return response(url, text=json.dumps({"result": good_hz}))
            body, text, ct = fixture(src.parser)
            return response(url, text=text, content_type=ct, etag='"e1"')

        with tempfile.TemporaryDirectory() as tmp:
            store = snap.DirStore(tmp)
            doc = run(store, sources, now=NOW, fetcher=Fetcher(answer), env={}, sleep=lambda s: None, log=lambda s: None)
            assert_valid_index(self, doc, ids)
            on_disk = json.loads((Path(tmp) / "index.json").read_text())
            self.assertEqual(on_disk, doc)
            for s in sources:
                e = doc["snapshots"][s.id]
                if not s.enabled or s.secret:
                    self.assertEqual(e["status"], "skipped", s.id)
                    continue
                self.assertEqual(e["status"], "ok", f"{s.id}: {e['last_error']}")
                snapshot = json.loads((Path(tmp) / f"{s.id}.json").read_text())
                self.assertEqual(snapshot["schema"], 1)
                self.assertEqual(snapshot["source"], s.id)
                self.assertEqual(snapshot["upstream_url"], s.url)
                self.assertEqual(snapshot["items"], e["items"])
                self.assertEqual(snapshot["valid_until"], e["valid_until"])

            # The second run, through the CLI, one minute later: nothing is due (the shortest refresh
            # is 5 m), so it must touch no network -- and there is none to touch in CI.
            cli = subprocess.run(
                [sys.executable, "-m", "harvest", "--dest", tmp, "--now", "2026-09-08T00:01:00Z"],
                cwd=ROOT, capture_output=True, text=True, timeout=60,
            )
            self.assertEqual(cli.returncode, 0, cli.stdout + cli.stderr)
            again = json.loads((Path(tmp) / "index.json").read_text())
            assert_valid_index(self, again, ids)
            for s in sources:
                want = "skipped" if (not s.enabled or s.secret) else "not-due"
                self.assertEqual(again["snapshots"][s.id]["status"], want, s.id)
                self.assertEqual(again["snapshots"][s.id]["items"], doc["snapshots"][s.id]["items"])

    def test_dry_run_writes_nothing_and_says_what_it_would_do(self):
        with tempfile.TemporaryDirectory() as tmp:
            cli = subprocess.run(
                [sys.executable, "-m", "harvest", "--dest", tmp, "--dry-run"],
                cwd=ROOT, capture_output=True, text=True, timeout=60,
            )
            self.assertEqual(cli.returncode, 0, cli.stderr)
            self.assertFalse((Path(tmp) / "index.json").exists())
            for s in registry.load():
                self.assertIn(s.id, cli.stdout)

    def test_only_refuses_an_unknown_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            cli = subprocess.run(
                [sys.executable, "-m", "harvest", "--dest", tmp, "--only", "nope", "--dry-run"],
                cwd=ROOT, capture_output=True, text=True, timeout=60,
            )
            self.assertEqual(cli.returncode, 2)
            self.assertIn("nope", cli.stderr)


# --- the Lambda entry, without AWS ----------------------------------------------------------------


class FakeS3:
    class exceptions:
        class NoSuchKey(Exception):
            pass

    def __init__(self):
        self.objects = {}

    def get_object(self, Bucket, Key):
        if Key not in self.objects:
            raise FakeS3.exceptions.NoSuchKey()
        import io
        return {"Body": io.BytesIO(self.objects[Key][0])}

    def put_object(self, Bucket, Key, Body, ContentType, CacheControl):
        self.objects[Key] = (Body, ContentType, CacheControl)


class LambdaEntry(unittest.TestCase):
    def test_module_imports_without_boto3(self):
        saved = sys.modules.get("boto3")
        sys.modules["boto3"] = None  # makes `import boto3` raise ImportError
        try:
            for m in list(sys.modules):
                if m == "harvest.lambda_handler":
                    del sys.modules[m]
            import harvest.lambda_handler as lh  # noqa: F401
            self.assertTrue(callable(lh.handler))
        finally:
            if saved is None:
                sys.modules.pop("boto3", None)
            else:
                sys.modules["boto3"] = saved

    def test_s3_store_prefixes_keys_and_passes_headers(self):
        from harvest.lambda_handler import S3Store
        s3 = FakeS3()
        store = S3Store(s3, "bucket", "data/v1")
        self.assertIsNone(store.read("index.json"))
        store.write("index.json", b"{}", content_type="application/json", cache_control=snap.INDEX_CACHE_CONTROL)
        self.assertEqual(set(s3.objects), {"data/v1/index.json"})
        self.assertEqual(s3.objects["data/v1/index.json"][1:], ("application/json", snap.INDEX_CACHE_CONTROL))
        self.assertEqual(store.read("index.json"), b"{}")

    def test_handler_runs_against_a_fake_bucket(self):
        import harvest.lambda_handler as lh
        s3 = FakeS3()
        fake_boto3 = type(sys)("boto3")
        fake_boto3.client = lambda name: s3
        saved_boto3 = sys.modules.get("boto3")
        saved_run = lh.run
        # No network in a test: the handler's run is the real one with the transport swapped.
        lh.run = lambda store, sources, **kw: saved_run(
            store, sources, fetcher=Fetcher(lambda url, h, e, s: response(url, text=GP3)),
            sleep=lambda s: None, log=lambda s: None, **kw)
        sys.modules["boto3"] = fake_boto3
        old_env = dict(os.environ)
        os.environ["HARVEST_BUCKET"] = "b"
        os.environ.pop("HARVEST_PREFIX", None)
        try:
            out = lh.handler({"only": "celestrak-stations", "now": "2026-09-08T00:00:00Z"}, None)
        finally:
            lh.run = saved_run
            os.environ.clear()
            os.environ.update(old_env)
            if saved_boto3 is None:
                sys.modules.pop("boto3", None)
            else:
                sys.modules["boto3"] = saved_boto3
        self.assertIn("data/v1/index.json", s3.objects)
        self.assertIn("data/v1/celestrak-stations.json", s3.objects)
        index = json.loads(s3.objects["data/v1/index.json"][0])
        self.assertEqual(index["run"]["runner"], "lambda")
        self.assertEqual(index["snapshots"]["celestrak-stations"]["status"], "ok")
        self.assertEqual(out["statuses"].get("ok"), 1)


# --- Horizons refuses a window past a trajectory file, and the run asks again ---------------------

MRO_REFUSAL = (
    "*******************************************************************************\n"
    " Revised: Sep 01, 2026    Mars Reconnaisance Orbiter (MRO)  / (Sun)         -74\n"
    "  mro_psp                                 2026-Aug-30 19:01  2026-Sep-28 07:30\n"
    "*******************************************************************************\n"
    "\n"
    'No ephemeris for target "Mars Reconnaissance Orbiter (spacecraft)" after A.D. 2026-SEP-28 07:32:00.0000 TDB\n'
)


class HorizonsClamp(unittest.TestCase):
    """MEASURED 2026-09-08: MRO's predicted file ended 28 Sep and a 30-day window lost the object."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = RecordingStore(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_the_refusal_is_read_into_a_time_one_minute_inside_the_limit(self):
        from harvest.run import horizons_limit
        self.assertEqual(horizons_limit(MRO_REFUSAL), ("after", "2026-09-28 07:31"))
        self.assertIsNone(horizons_limit(fixture("horizons")[0]["-170"]), "a good block is not a refusal")
        self.assertIsNone(horizons_limit(""))

    def test_a_refused_id_is_asked_again_with_the_window_it_has_and_the_manifest_says_so(self):
        good = fixture("horizons")[0]["-170"]
        lst = {"params": {"COMMAND": "'{id}'", "START_TIME": "'{start}'", "STOP_TIME": "'{stop}'", "format": "json"},
               "window": {"before": "1d", "after": "30d"}, "pause_s": 0.5,
               "ids": [{"id": "-170"}, {"id": "-74"}]}
        src = source(id="list-source", parser="horizons", list=lst, refresh="24h")

        def answer(url, h, e, s):
            if "-74" in url and "2026-09-28" not in url:
                return response(url, text=json.dumps({"result": MRO_REFUSAL}))
            return response(url, text=json.dumps({"result": good}))

        f = Fetcher(answer)
        doc = run(self.store, [src], now=NOW, fetcher=f, sleep=lambda s: None, log=lambda s: None)
        e = doc["snapshots"][src.id]
        self.assertEqual(len(f.calls), 3, "one request for -170, two for -74: the refusal and the clamped retry")
        self.assertIn("STOP_TIME=%272026-09-28%2007%3A31%27", f.calls[2]["url"])
        self.assertEqual(e["status"], "ok")
        self.assertEqual(e["items"], 2, "the clamped id counts; nothing was dropped")
        self.assertIn("window shortened", e.get("last_error") or e.get("partial") or json.dumps(e),
                      "the manifest says the window was shortened, so nobody mistakes 27 days for 30")

    def test_a_second_refusal_is_not_retried_forever(self):
        lst = {"params": {"COMMAND": "'{id}'", "STOP_TIME": "'{stop}'"}, "ids": [{"id": "-74"}]}
        src = source(id="list-source", parser="horizons", list=lst, refresh="24h")
        f = Fetcher(lambda url, h, e, s: response(url, text=json.dumps({"result": MRO_REFUSAL})))
        doc = run(self.store, [src], now=NOW, fetcher=f, sleep=lambda s: None, log=lambda s: None)
        self.assertEqual(len(f.calls), 2, "exactly one retry")
        self.assertNotEqual(doc["snapshots"][src.id]["status"], "ok", "no id had rows, so this is not a good snapshot")


def main() -> int:
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    if result.wasSuccessful():
        print(f"\nPASS: {result.testsRun} checks -- every parser counts what its source really sends, "
              f"the guard refuses at 49 % and accepts at 50 %, CelesTrak's text is not an error, a "
              f"missing secret is a skip, and a whole run writes the index the contract fixes.")
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
