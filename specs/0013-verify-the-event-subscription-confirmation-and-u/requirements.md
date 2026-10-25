# 0013 — Confirm and unsubscribe links — requirements

Card: [#379](https://github.com/Sara-Managed-Projects/space-radar/issues/379). Email-only
subscriptions shipped in #373. The exit criterion on the card is a test, or a manual check written
in the PR, that a subscriber can confirm, can unsubscribe, and that unsubscribing stops later mail.

## What is true today

Measured in this checkout (`3b78db57`), 25 Oct 2026:

- `GET /confirm` and `GET /unsubscribe` exist (`notify/lambda_handler.py`). The confirmation body
  is the literal `token={token}`. It is not a URL. `build_digest` has no unsubscribe line.
- `tests/test_notify.py` calls `subscriptions.confirm` / `unsubscribe` as functions, and runs
  `handler_digest` only on records that are already `confirmed`. Nothing reads a link out of a
  sent message and requests it.
- `GET https://www.spaceradar.ai/js/main.js` returned 200, last-modified Wed 21 Oct 2026 18:31 UTC.
  That file contains neither `subscribe` nor `NOTIFY`. In this checkout the form stays hidden
  until `window.SPACE_RADAR_NOTIFY_URL` is set, and nothing in the repo sets it.

Could not look: `lambda:GetFunctionUrlConfig` and `lambda:GetFunctionConfiguration` on
`space-radar-notifier` (eu-north-1 and us-east-1) returned AccessDenied for the HQ role. Whether
a Function URL exists is unknown. No mail was sent to find out.

The card is labelled blocked because a live sending identity would be needed to click a real
message (triage 7 Oct 2026). The card's own exit criterion already accepts a test. This spec
takes that option. Standing the notifier up, verifying SES, and leaving the sandbox stay manual,
as `scripts/provision-notifier.sh` already says.

## Requirements

1. **R1 — the confirmation mail has two links.** The body contains an absolute
   `{NOTIFY_PUBLIC_BASE}/confirm?token=` link and an absolute
   `{NOTIFY_PUBLIC_BASE}/unsubscribe?token=` link. Both use the token `subscribe` already
   returns. `NOTIFY_PUBLIC_BASE` has no trailing slash.
2. **R2 — every digest carries an unsubscribe link.** `handler_digest` appends one, minted with
   `tokens.make_token` from that record's current email and nonce. `build_digest` itself stays
   as it is, so a launches-only section is unchanged apart from the footer the handler adds.
3. **R3 — the links go through `handler`.** The test builds a Function URL event
   (`requestContext.http.method`, `requestContext.http.path`, `queryStringParameters`) and calls
   `handler`, not `handler_confirm` directly. Confirm returns 200 `{"status": "confirmed"}` and
   the stored record is confirmed. Unsubscribe returns 200 `{"status": "unsubscribed"}`.
4. **R4 — unsubscribe stops later mail.** After the unsubscribe link is followed, the next
   digest sends that address nothing. A second confirmed address in the same store still gets
   its mail. The same token, requested again, is 404, because unsubscribe rotates the nonce.
5. **R5 — either order from the confirmation mail.** Confirm, then the unsubscribe link from
   that same mail, unsubscribes. Unsubscribe first, and the confirm link from that mail is 404
   and no digest is sent.
6. **R6 — no base, no mail.** If `NOTIFY_PUBLIC_BASE` is missing or blank, subscribe does not
   call SES and does not return 202, and it does not leave a new pending record. Digest sends
   nothing and its result says the base is missing, the same way a stale snapshot says
   `could not look`. A confirmed record with no nonce is skipped, not fatal to the rest of the run.
7. **R7 — bad tokens stay bad.** A missing token is 400. A token that does not match the current
   nonce is 404. The stored status does not change.
8. **R8 — provisioning learns the URL.** `scripts/provision-notifier.sh`, after the Function URL
   exists, sets `NOTIFY_PUBLIC_BASE` to that URL with no trailing slash. A re-run must keep an
   existing `NOTIFY_SECRET`. The script still does not invent the secret and still does not send mail.

## Acceptance criteria

- A1. A stubbed subscribe sends one message. The test takes the confirm URL from that body, GETs
  it through `handler`, and the stored status is `confirmed`.
- A2. A digest to that address contains an unsubscribe URL. GETting it, then running the digest
  again, sends 0 to that address and 1 to a neighbour who stayed confirmed.
- A3. Confirm, then the unsubscribe URL from the confirmation mail: 200, and the next digest
  skips that address.
- A4. Unsubscribe first, from the confirmation mail: the confirm URL then returns 404, and the
  digest sends nothing to that address.
- A5. With `NOTIFY_PUBLIC_BASE` unset, subscribe returns 500, the SES stub is empty, and
  `subscriptions.json` is unchanged.
- A6. Missing token is 400. A forged or stale token is 404. Status unchanged.
- A7. `python3 tests/test_notify.py` passes, including the digest tests that already exist.
  Those fixtures gain a nonce, and the shared fake sets `NOTIFY_PUBLIC_BASE` and `NOTIFY_SECRET`,
  so they still send.

## Out of scope

- Deploying the Lambda, verifying an SES identity, leaving the SES sandbox, or setting
  `SPACE_RADAR_NOTIFY_URL` on the site. The form stays hidden until a human does that.
- HTML mail, a `List-Unsubscribe` header, or a one-click POST. The links stay `GET`, which is
  what the handler already implements.
- Translating the two mail bodies. They are English, as the confirmation subject already is.
- A live send. The PR records the site measurement above and whether the Lambda read was still
  denied. That is the manual note. It is not a second exit criterion.
