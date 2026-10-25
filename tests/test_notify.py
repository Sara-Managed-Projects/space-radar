#!/usr/bin/env python3
"""notify/, tested the way harvest/ is: pure, offline, no AWS, no network (tests/test_harvest.py's
docstring explains why the same spirit applies here too).

Covers: token round-trips and tamper/forgery rejection, the subscribe/confirm/unsubscribe state
machine (including that an old token stops working after unsubscribe), the shower-peak date math
across a year boundary, the next-N-launches selection, the per-subscriber dedupe ledger, the
digest content builder, and that notify/showers.py's mirror matches registry/showers.yaml.

Run: python3 tests/test_notify.py
"""

from __future__ import annotations

import json
import os
import re
import sys
import types
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from notify import digest as dig  # noqa: E402
from notify import showers as shw  # noqa: E402
from notify import subscriptions as subs  # noqa: E402
from notify import tokens  # noqa: E402

SECRET = tokens.TEST_ONLY_SECRET


def dt(s: str) -> datetime:
    return dig.parse_dt(s)


class TokensTest(unittest.TestCase):
    def test_round_trip(self):
        nonce = tokens.new_nonce()
        token = tokens.make_token("a@b.com", nonce, SECRET)
        self.assertEqual(tokens.verify_token(token, SECRET), "a@b.com")

    def test_wrong_secret_fails(self):
        token = tokens.make_token("a@b.com", tokens.new_nonce(), SECRET)
        self.assertIsNone(tokens.verify_token(token, "a different secret"))

    def test_tampered_token_fails(self):
        token = tokens.make_token("a@b.com", tokens.new_nonce(), SECRET)
        enc_email, nonce, sig = token.split(".")
        forged = f"{enc_email}.{nonce}x.{sig}"  # a different nonce, same signature
        self.assertIsNone(tokens.verify_token(forged, SECRET))

    def test_malformed_token_fails(self):
        self.assertIsNone(tokens.verify_token("not-a-token", SECRET))
        self.assertIsNone(tokens.verify_token("", SECRET))


class SubscriptionsTest(unittest.TestCase):
    def test_subscribe_rejects_bad_input(self):
        store: subs.Store = {}
        with self.assertRaises(ValueError):
            subs.subscribe(store, "not-an-email", ["launches"], SECRET)
        with self.assertRaises(ValueError):
            subs.subscribe(store, "a@b.com", [], SECRET)
        with self.assertRaises(ValueError):
            subs.subscribe(store, "a@b.com", ["not-a-real-category"], SECRET)

    def test_subscribe_confirm_unsubscribe(self):
        store: subs.Store = {}
        record, token = subs.subscribe(store, "A@B.com ".strip(), ["launches", "meteor-showers"], SECRET)
        self.assertEqual(record["status"], "pending")
        self.assertEqual(record["email"], "a@b.com")  # lower-cased, trimmed

        confirmed = subs.confirm(store, token, SECRET)
        self.assertIsNotNone(confirmed)
        self.assertEqual(confirmed["status"], "confirmed")
        self.assertEqual(store["a@b.com"]["status"], "confirmed")

        # confirming again with the same token is a harmless no-op
        self.assertIsNotNone(subs.confirm(store, token, SECRET))

        unsub = subs.unsubscribe(store, token, SECRET)
        self.assertIsNotNone(unsub)
        self.assertEqual(unsub["status"], "unsubscribed")

        # the SAME token (its nonce is now stale) no longer confirms or unsubscribes
        self.assertIsNone(subs.confirm(store, token, SECRET))
        self.assertIsNone(subs.unsubscribe(store, token, SECRET))

    def test_unknown_token_rejected(self):
        store: subs.Store = {}
        bogus = tokens.make_token("nobody@example.com", tokens.new_nonce(), SECRET)
        self.assertIsNone(subs.confirm(store, bogus, SECRET))
        self.assertIsNone(subs.unsubscribe(store, bogus, SECRET))

    def test_resubscribe_invalidates_old_token(self):
        store: subs.Store = {}
        _, first_token = subs.subscribe(store, "a@b.com", ["launches"], SECRET)
        _, second_token = subs.subscribe(store, "a@b.com", ["meteor-showers"], SECRET)
        self.assertNotEqual(first_token, second_token)
        self.assertIsNone(subs.confirm(store, first_token, SECRET))
        self.assertIsNotNone(subs.confirm(store, second_token, SECRET))
        self.assertEqual(store["a@b.com"]["categories"], ["meteor-showers"])

    def test_active_subscribers_filters_status_and_category(self):
        store: subs.Store = {}
        _, t1 = subs.subscribe(store, "yes@b.com", ["launches"], SECRET)
        subs.confirm(store, t1, SECRET)
        _, t2 = subs.subscribe(store, "pending@b.com", ["launches"], SECRET)  # never confirmed
        _, t3 = subs.subscribe(store, "showers-only@b.com", ["meteor-showers"], SECRET)
        subs.confirm(store, t3, SECRET)

        launch_subs = subs.active_subscribers(store, "launches")
        self.assertEqual([r["email"] for r in launch_subs], ["yes@b.com"])
        shower_subs = subs.active_subscribers(store, "meteor-showers")
        self.assertEqual([r["email"] for r in shower_subs], ["showers-only@b.com"])


class ShowerPeakTest(unittest.TestCase):
    def test_peak_later_this_year(self):
        # "today" is well before Perseids' 08-12 peak
        self.assertEqual(dig.next_shower_peak("08-12", dt("2026-01-01T00:00:00Z")).isoformat(), "2026-08-12")

    def test_peak_already_passed_wraps_to_next_year(self):
        self.assertEqual(dig.next_shower_peak("01-03", dt("2026-09-08T00:00:00Z")).isoformat(), "2027-01-03")

    def test_peak_today_counts_as_not_yet_missed(self):
        self.assertEqual(dig.next_shower_peak("08-12", dt("2026-08-12T23:00:00Z")).isoformat(), "2026-08-12")

    def test_next_shower_peaks_sorted(self):
        now = dt("2026-09-08T00:00:00Z")
        out = dig.next_shower_peaks(shw.SHOWERS, now)
        dates = [row["peak_date"] for row in out]
        self.assertEqual(dates, sorted(dates))
        self.assertEqual(out[0]["id"], "orionids")  # the next peak after Sep 8 is Oct 21


class NextLaunchesTest(unittest.TestCase):
    BODY = {
        "results": [
            {"id": "past-1", "name": "Already flown", "net": "2026-01-01T00:00:00Z"},
            {"id": "soon-1", "name": "Soonest", "net": "2026-09-10T00:00:00Z"},
            {"id": "soon-3", "name": "Third", "net": "2026-09-20T00:00:00Z"},
            {"id": "soon-2", "name": "Second", "net": "2026-09-15T00:00:00Z"},
            {"no_id": True, "name": "Missing id", "net": "2026-09-25T00:00:00Z"},
            {"id": "no-net", "name": "No date at all"},
        ]
    }

    def test_filters_past_and_sorts_and_limits(self):
        now = dt("2026-09-08T00:00:00Z")
        out = dig.next_launches(self.BODY, now, limit=2)
        self.assertEqual([x["id"] for x in out], ["soon-1", "soon-2"])

    def test_missing_id_falls_back_to_name_and_net(self):
        now = dt("2026-09-08T00:00:00Z")
        out = dig.next_launches(self.BODY, now, limit=10)
        ids = [x["id"] for x in out]
        self.assertIn("Missing id@2026-09-25T00:00:00Z", ids)
        self.assertEqual(len(out), 4)  # past-1 and no-net excluded


class LedgerAndDigestTest(unittest.TestCase):
    def test_unsent_filters_already_sent(self):
        launches = [{"id": "a"}, {"id": "b"}]
        sent = {dig.ledger_key_launch({"id": "a"})}
        out = dig.unsent(launches, dig.ledger_key_launch, sent)
        self.assertEqual([x["id"] for x in out], ["b"])

    def test_build_digest_filters_by_category(self):
        launches = [{"id": "x", "name": "X", "net": "2026-09-10T00:00:00Z"}]
        showers = [{"id": "perseids", "display": "Perseids", "peak_date": "2026-08-12", "year": 2026}]

        launches_only = dig.build_digest(["launches"], launches, showers)
        self.assertIn("Upcoming launches:", launches_only["body"])
        self.assertNotIn("Perseids", launches_only["body"])

        both = dig.build_digest(["launches", "meteor-showers"], launches, showers)
        self.assertIn("Upcoming launches:", both["body"])
        self.assertIn("Perseids", both["body"])

    def test_build_digest_nothing_new_is_none(self):
        self.assertIsNone(dig.build_digest(["launches", "meteor-showers"], [], []))


def _au(ld: float) -> float:
    return ld * dig.LD_KM / dig.AU_KM


def _cad(rows: list, fetched: str = "2026-11-01T00:00:00Z") -> dict:
    return {
        "fetched_at": fetched,
        "body": {
            "fields": ["des", "cd", "dist", "fullname", "diameter"],
            "count": len(rows),
            "data": rows,
        },
    }


def _row(des: str, cd: str, ld: float, fullname=None, diameter=None) -> list:
    if fullname is None:
        fullname = f"       ({des})"
    return [des, cd, _au(ld), fullname, diameter]


class CloseApproachesTest(unittest.TestCase):
    NOW = dt("2026-11-01T00:00:00Z")

    def test_subscribe_accepts_close_approaches(self):
        store: subs.Store = {}
        record, _token = subs.subscribe(store, "a@b.com", ["close-approaches"], SECRET)
        self.assertEqual(record["status"], "pending")
        self.assertEqual(record["categories"], ["close-approaches"])
        mixed, _ = subs.subscribe(store, "b@b.com", ["close-approaches", "nope", "launches"], SECRET)
        self.assertEqual(mixed["categories"], ["close-approaches", "launches"])

    def test_launches_only_digest_unchanged(self):
        launches = [{"id": "soon-1", "name": "Soonest", "net": "2026-09-10T00:00:00Z"}]
        approach = {
            "des": "2026 UA3", "name": "(2026 UA3)", "when": "2026-11-03T14:22:00Z",
            "dist_ld": 0.8, "dist_km": 308000, "diameter_m": 20,
        }
        before = dig.build_digest(["launches"], launches, [])
        after = dig.build_digest(["launches"], launches, [], [approach])
        self.assertEqual(after, before)
        self.assertEqual(before["subject"], "Space Radar: what's coming up")
        self.assertEqual(before["body"], "Upcoming launches:\n  - Soonest: 2026-09-10T00:00:00Z\n")
        mixed = dig.build_digest(["launches", "close-approaches"], launches, [], [approach])
        self.assertEqual(mixed["subject"], before["subject"])
        self.assertIn("Upcoming launches:", mixed["body"])
        self.assertIn(dig.APPROACH_HEADING, mixed["body"])

    def test_next_approaches_filters_window_distance_and_sorts(self):
        rows = [
            _row("near", "2026-Nov-04 00:00", 0.8),
            _row("mid", "2026-Nov-11 00:00", 4.9),
            _row("far", "2026-Nov-06 00:00", 6.0),
            _row("late", "2026-Nov-21 00:00", 2.0),
        ]
        out = dig.next_approaches(_cad(rows), self.NOW)
        self.assertEqual([item["des"] for item in out], ["near", "mid"])
        self.assertEqual([item["dist_ld"] for item in out], [0.8, 4.9])
        # nearer but later still comes first: the sort is distance, not date
        later_nearer = [
            _row("far-soon", "2026-Nov-02 00:00", 4.0),
            _row("near-late", "2026-Nov-13 00:00", 0.5),
        ]
        ordered = dig.next_approaches(_cad(later_nearer), self.NOW)
        self.assertEqual([item["des"] for item in ordered], ["near-late", "far-soon"])

    def test_next_approaches_window_and_distance_edges(self):
        rows = [
            _row("edge", "2026-Nov-15 00:00", 1.0),
            _row("past", "2026-Oct-31 23:59", 0.2),
            _row("over", "2026-Nov-15 00:01", 0.2),
            _row("five", "2026-Nov-02 00:00", 5.0),
            _row("over5", "2026-Nov-02 00:00", 5.01),
        ]
        des = [item["des"] for item in dig.next_approaches(_cad(rows), self.NOW)]
        self.assertCountEqual(des, ["edge", "five"])

    def test_next_approaches_limit_five(self):
        rows = [_row(f"a{i}", "2026-Nov-02 12:00", 0.4 * (i + 1)) for i in range(8)]
        out = dig.next_approaches(_cad(rows), self.NOW)
        self.assertEqual(len(out), 5)
        self.assertEqual([item["des"] for item in out], ["a0", "a1", "a2", "a3", "a4"])
        self.assertEqual(out[0]["dist_ld"], 0.4)

    def test_next_approaches_stale_snapshot_is_none(self):
        fetched = (self.NOW - timedelta(hours=80)).strftime("%Y-%m-%dT%H:%M:%SZ")
        snap = _cad([_row("near", "2026-Nov-04 00:00", 0.8)], fetched)
        self.assertIsNone(dig.next_approaches(snap, self.NOW))

    def test_next_approaches_missing_snapshot_is_none(self):
        self.assertIsNone(dig.next_approaches(None, self.NOW))
        self.assertIsNone(dig.next_approaches({}, self.NOW))
        self.assertIsNone(dig.next_approaches({"fetched_at": "not-a-date", "body": {}}, self.NOW))
        self.assertIsNone(dig.next_approaches({"fetched_at": "2026-11-01T00:00:00Z", "body": []}, self.NOW))

    def test_next_approaches_empty_count_is_empty_list(self):
        snap = {"fetched_at": "2026-11-01T00:00:00Z", "body": {"signature": {"version": "1.5"}, "count": 0}}
        self.assertEqual(dig.next_approaches(snap, self.NOW), [])

    def test_next_approaches_skips_unparseable_rows(self):
        rows = [
            _row("good", "2026-Nov-03 14:22", 0.8),
            ["bad-cd", "03 Nov 2026", _au(0.5), None, None],
            ["bad-dist", "2026-Nov-03 14:22", "nope", None, None],
            ["short"],
        ]
        out = dig.next_approaches(_cad(rows), self.NOW)
        self.assertEqual([item["des"] for item in out], ["good"])

    def test_next_approaches_optional_fullname_and_diameter(self):
        rows = [
            ["bare", "2026-Nov-03 14:22", _au(1.2), None, None],
            ["sized", "2026-Nov-03 14:22", _au(0.8), "       (2026 UA3)", 0.02],
        ]
        out = {item["des"]: item for item in dig.next_approaches(_cad(rows), self.NOW)}
        self.assertEqual(out["bare"]["name"], "bare")
        self.assertIsNone(out["bare"]["diameter_m"])
        self.assertEqual(out["sized"]["name"], "(2026 UA3)")
        self.assertEqual(out["sized"]["diameter_m"], 20)
        self.assertEqual(out["sized"]["when"], "2026-11-03T14:22:00Z")
        self.assertEqual(out["sized"]["dist_km"], 308000)
        body = dig.build_digest(["close-approaches"], [], [], [out["sized"]])["body"]
        self.assertEqual(
            body,
            "Close approaches (nominal, JPL CNEOS):\n"
            "  - (2026 UA3): 2026-11-03 14:22 UTC, 0.8 LD (308,000 km), about 20 m across\n"
            "These are close approaches, not collisions. Distances are nominal from JPL CNEOS.\n",
        )

    def test_approach_ledger_dedupes(self):
        item = dig.next_approaches(_cad([_row("once", "2026-Nov-03 14:22", 0.8)]), self.NOW)[0]
        key = dig.ledger_key_approach(item)
        self.assertEqual(key, f"approach:once:{item['when']}")
        self.assertEqual(dig.unsent([item], dig.ledger_key_approach, {key}), [])
        first = dig.build_digest(["close-approaches"], [], [], [item])
        second = dig.build_digest(["close-approaches"], [], [], dig.unsent([item], dig.ledger_key_approach, {key}))
        self.assertIn("once", first["body"])
        self.assertIsNone(second)

    def test_approach_copy_has_no_alarm_words(self):
        item = {
            "des": "2026 UA3", "name": "(2026 UA3)", "when": "2026-11-03T14:22:00Z",
            "dist_ld": 0.8, "dist_km": 308000, "diameter_m": 20,
        }
        body = dig.build_digest(["close-approaches"], [], [], [item])["body"]
        self.assertIsNone(re.search(r"hazard|threat|impact|danger", body, re.I))
        self.assertIn("not collisions", body)
        self.assertIn("JPL CNEOS", body)

    def test_live_fixture_parses(self):
        snap = json.loads((ROOT / "tests" / "fixtures" / "notify" / "jpl-cad.json").read_text(encoding="utf-8"))
        self.assertEqual(snap["source"], "jpl-cad")
        self.assertEqual(snap["fetched_at"], "2026-10-21T18:17:21Z")
        self.assertEqual(len(snap["body"]["data"]), 10)
        # 18 h after the snapshot was fetched: fresh, and two of these ten pass inside 5 LD.
        now = dt("2026-10-22T12:00:00Z")
        out = dig.next_approaches(snap, now)
        self.assertIsNotNone(out)
        names = [item["name"] for item in out]
        self.assertEqual(names, ["(2026 UA1)", "(2025 UK9)"])
        self.assertLessEqual(out[-1]["dist_ld"], 5.0)


class DigestHandlerTest(unittest.TestCase):
    """handler_digest against a fake bucket: no AWS, no SES unless the test asks."""

    def _run(self, objects, event, *, deny_cad=False):
        import notify.lambda_handler as lh

        class FakeS3:
            class exceptions:
                class NoSuchKey(Exception):
                    pass

            def __init__(self):
                self.objects = dict(objects)

            def get_object(self, Bucket, Key):
                if deny_cad and Key.endswith("jpl-cad.json"):
                    raise RuntimeError("AccessDenied")
                if Key not in self.objects:
                    raise FakeS3.exceptions.NoSuchKey()
                import io
                return {"Body": io.BytesIO(self.objects[Key])}

            def put_object(self, Bucket, Key, Body, ContentType, CacheControl):
                self.objects[Key] = Body if isinstance(Body, bytes) else Body.encode("utf-8")

        class FakeSES:
            def __init__(self):
                self.sent = []

            def send_email(self, **kwargs):
                self.sent.append(kwargs)

        s3 = FakeS3()
        ses = FakeSES()
        asked = []

        def client(name):
            asked.append(name)
            if name == "s3":
                return s3
            if name == "ses":
                return ses
            raise AssertionError(name)

        fake = types.ModuleType("boto3")
        fake.client = client
        saved_boto3 = sys.modules.get("boto3")
        saved_env = dict(os.environ)
        sys.modules["boto3"] = fake
        os.environ["NOTIFY_BUCKET"] = "b"
        os.environ["NOTIFY_FROM_ADDRESS"] = "from@example.com"
        os.environ.pop("NOTIFY_PREFIX", None)
        os.environ.pop("HARVEST_PREFIX", None)
        try:
            result = lh.handler_digest(event, None)
        finally:
            os.environ.clear()
            os.environ.update(saved_env)
            if saved_boto3 is None:
                sys.modules.pop("boto3", None)
            else:
                sys.modules["boto3"] = saved_boto3
        return result, s3, ses, asked

    def _objects(self, records, cad, launches=None):
        if launches is None:
            launches = {"body": {"results": [{"id": "soon-1", "name": "Soonest", "net": "2026-11-03T00:00:00Z"}]}}
        return {
            "notify/v1/subscriptions.json": json.dumps(records).encode(),
            "notify/v1/ledger.json": b"{}",
            "data/v1/launches.json": json.dumps(launches).encode(),
            "data/v1/jpl-cad.json": json.dumps(cad).encode(),
        }

    def test_digest_omits_approaches_but_sends_launches_when_stale(self):
        now = "2026-11-04T08:00:00Z"
        fetched = (dt(now) - timedelta(hours=80)).strftime("%Y-%m-%dT%H:%M:%SZ")
        records = {"a@b.com": {
            "email": "a@b.com", "status": "confirmed", "categories": ["launches", "close-approaches"],
        }}
        cad = _cad([_row("near", "2026-Nov-05 00:00", 0.8)], fetched)
        launches = {"body": {"results": [{"id": "soon-1", "name": "Soonest", "net": "2026-11-10T00:00:00Z"}]}}
        result, s3, ses, _asked = self._run(self._objects(records, cad, launches), {"now": now})
        self.assertEqual(result["approaches"], "could not look")
        self.assertEqual(result["emails_sent"], 1)
        body = ses.sent[0]["Message"]["Body"]["Text"]["Data"]
        self.assertIn("Soonest", body)
        self.assertNotIn("Close approaches", body)
        self.assertNotIn("near", body)

    def test_unreadable_snapshot_does_not_drop_launches(self):
        records = {"a@b.com": {"email": "a@b.com", "status": "confirmed", "categories": ["launches"]}}
        result, _s3, ses, _asked = self._run(
            self._objects(records, _cad([])), {"now": "2026-11-01T00:00:00Z"}, deny_cad=True,
        )
        self.assertEqual(result["approaches"], "could not look")
        self.assertEqual(result["emails_sent"], 1)
        self.assertIn("Soonest", ses.sent[0]["Message"]["Body"]["Text"]["Data"])

    def test_second_run_sends_an_approach_once(self):
        records = {"a@b.com": {"email": "a@b.com", "status": "confirmed", "categories": ["close-approaches"]}}
        cad = _cad([_row("once", "2026-Nov-03 14:22", 0.8, "       (2026 UA3)", 0.02)])
        objects = self._objects(records, cad, launches={"body": {"results": []}})
        first, s3, ses, _asked = self._run(objects, {"now": "2026-11-01T00:00:00Z"})
        self.assertEqual(first["emails_sent"], 1)
        self.assertEqual(first["approaches"], 1)
        self.assertIn("(2026 UA3)", ses.sent[0]["Message"]["Body"]["Text"]["Data"])
        second, _s3b, ses2, _asked2 = self._run(s3.objects, {"now": "2026-11-01T00:00:00Z"})
        self.assertEqual(second["emails_sent"], 0)
        self.assertEqual(ses2.sent, [])

    def test_dry_run_sends_nothing_and_keeps_the_ledger(self):
        records = {"a@b.com": {"email": "a@b.com", "status": "confirmed", "categories": ["close-approaches"]}}
        cad = _cad([_row("once", "2026-Nov-03 14:22", 0.8)])
        objects = self._objects(records, cad, launches={"body": {"results": []}})
        result, s3, _ses, asked = self._run(objects, {"now": "2026-11-01T00:00:00Z", "dry_run": True})
        self.assertEqual(result["emails_sent"], 0)
        self.assertEqual(result["would_send"], 1)
        self.assertTrue(result["dry_run"])
        self.assertNotIn("ses", asked)
        self.assertEqual(json.loads(s3.objects["notify/v1/ledger.json"]), {})
        again, _s3, ses, _asked = self._run(s3.objects, {"now": "2026-11-01T00:00:00Z"})
        self.assertEqual(again["emails_sent"], 1)
        self.assertEqual(len(ses.sent), 1)


class ShowersMirrorTest(unittest.TestCase):
    def test_matches_registry(self):
        import yaml

        doc = yaml.safe_load((ROOT / "registry" / "showers.yaml").read_text(encoding="utf-8"))
        registry_rows = [(r["id"], r["display"], r["peak"]) for r in doc["showers"]]
        mirror_rows = [(r["id"], r["display"], r["peak"]) for r in shw.SHOWERS]
        self.assertEqual(mirror_rows, registry_rows)


def main() -> int:
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromModule(sys.modules[__name__])
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(main())
