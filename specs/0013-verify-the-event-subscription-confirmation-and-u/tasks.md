# 0013 — Confirm and unsubscribe links — tasks

Issue: [#379](https://github.com/Sara-Managed-Projects/space-radar/issues/379). Spec only in this
PR. Implementation is a later turn.

- [ ] T1. `notify/lambda_handler.py`: `action_link`, confirmation body with both URLs, and a 500
  before any write when `NOTIFY_PUBLIC_BASE` is missing (R1, R6).
- [ ] T2. `handler_digest`: append the unsubscribe link from the current nonce. Missing base,
  missing secret, or a record with no nonce follows R2 and R6. `build_digest` stays put.
  `dry_run` stays put.
- [ ] T3. `scripts/provision-notifier.sh`: set `NOTIFY_PUBLIC_BASE` from the Function URL, and
  keep an existing `NOTIFY_SECRET` on re-run (R8). Do not run the script.
- [ ] T4. `tests/test_notify.py`: drive `handler` with a Function URL event. Parse the links
  from the SES stub. Cover A1–A6. Give the existing confirmed fixtures a nonce, and set
  `NOTIFY_PUBLIC_BASE` plus `NOTIFY_SECRET` in `DigestHandlerTest._run`, so A7 holds.
- [ ] T5. In the implementation PR, say what was re-checked on the live site and on the Lambda.
  As of this plan: `www.spaceradar.ai/js/main.js` last-modified Wed 21 Oct 2026 18:31 UTC, no
  notify URL in it, and `lambda:GetFunctionUrlConfig` denied. If that is still true, write
  "could not look". Do not send a real message to learn it.

## Test list

`tests/test_notify.py`

1. `test_confirm_link_from_the_mail_confirms` — A1.
2. `test_digest_unsubscribe_link_stops_later_mail` — A2, including the neighbour and the
   second GET of the same token returning 404 (R4).
3. `test_confirm_mail_unsubscribe_after_confirm` — A3.
4. `test_confirm_mail_unsubscribe_before_confirm` — A4.
5. `test_subscribe_without_public_base_sends_nothing` — A5.
6. `test_digest_without_public_base_sends_nothing` — R6, result says the base is missing.
7. `test_missing_and_bad_token_routes` — A6, through `handler`.
8. Existing `DigestHandlerTest` cases still pass with a nonce and the footer present (A7).
