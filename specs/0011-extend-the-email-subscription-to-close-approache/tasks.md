# 0011 — Email subscription: close approaches — tasks

- [ ] T1. `notify/subscriptions.py`: add `close-approaches` to `VALID_CATEGORIES` (R1).
- [ ] T2. `notify/digest.py`: constants, `next_approaches`, `ledger_key_approach`, third block in
  `build_digest` with a defaulted argument (R3–R7, R9).
- [ ] T3. `notify/lambda_handler.py`: read `close-approaches.json`, per-subscriber unsent + ledger,
  "could not look" in the return value (R3, R6, R7).
- [ ] T4. `site/js/ui/subscribe.js` third checkbox + payload; copy in en/de/es/fr/pt (R8).
- [ ] T5. Fixture: one real `close-approaches.json` envelope from the harvest bucket, trimmed to
  ~10 rows, under `tests/fixtures/notify/`.
- [ ] T6. Tests below; `uv run pytest -q tests/test_notify.py`, `npm test`.
- [ ] T7. Verify in production after deploy: invoke the digest with `{"now": ...}` against the live
  snapshot in a dry-run (no SES send) and read the returned counts; say "could not look" if the
  snapshot is not there.

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
