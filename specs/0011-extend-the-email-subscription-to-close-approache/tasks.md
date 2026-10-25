# 0011 — Email subscription: close approaches — tasks

Shipped on main in #1274. These boxes were still open, so the issue stayed in progress.

- [x] T1. `notify/subscriptions.py`: add `close-approaches` to `VALID_CATEGORIES` (R1).
- [x] T2. `notify/digest.py`: constants, `next_approaches`, `ledger_key_approach`, third block in
  `build_digest` with a defaulted argument (R3–R7, R9).
- [x] T3. `notify/lambda_handler.py`: read `jpl-cad.json` (the object the harvester writes;
  `close-approaches.json` is the registry name, not the key), per-subscriber unsent + ledger,
  "could not look" in the return value (R3, R6, R7).
- [x] T4. `site/js/ui/subscribe.js` third checkbox + payload; copy in en/de/es/fr/pt (R8).
- [x] T5. Fixture: one real `jpl-cad.json` envelope from the harvest, trimmed, under
  `tests/fixtures/notify/`.
- [x] T6. Tests below. CI on #1274 ran `python3 tests/test_notify.py` and `node tests/test_subscribe.mjs`.
- [x] T7. Production dry-run of the notifier — deferred, not open work on this issue. The public
  snapshot `data/v1/jpl-cad.json` was fetched 21 Oct 2026 18:17 UTC and was about 81 hours old at
  03:05 UTC on 25 Oct, so a digest would omit the section and say it could not look.
  `close-approaches.json` is not there. The live site is still commit d130190 (21 Oct), before
  this change. Invoking the notifier was denied (`lambda:GetFunction`). The `jpl-cad.json` read
  added in `scripts/provision-notifier.sh` has not been applied.

## Test list

`tests/test_notify.py`
1. `test_subscribe_accepts_close_approaches` — A1.
2. `test_launches_only_digest_unchanged` — A2 (golden string for a launches-only record).
3. `test_next_approaches_filters_window_distance_and_sorts` — A3.
4. `test_next_approaches_limit_five` — eight qualifying rows -> five, nearest first.
5. `test_next_approaches_stale_snapshot_is_none` — 80 h old -> None, not [] (A5).
6. `test_next_approaches_missing_snapshot_is_none`.
7. `test_next_approaches_skips_unparseable_rows` — a bad `cd` or `dist` row is dropped.
8. `test_next_approaches_optional_fullname_and_diameter`.
9. `test_approach_ledger_dedupes` — second run sends no approach lines (A4).
10. `test_digest_omits_approaches_but_sends_launches_when_stale` — A5 end to end with a fake store.
11. `test_approach_copy_has_no_alarm_words` — A7.

`tests/` (site)
12. `subscribePayload` includes `close-approaches` only when ticked; none ticked -> pickOne (A6).
13. `test_check_translation.mjs` covers `approachesLabel` in every language (R8).
