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

import sys
import unittest
from datetime import datetime, timezone
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
