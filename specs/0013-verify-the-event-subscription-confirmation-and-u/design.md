# 0013 — Confirm and unsubscribe links — design

## What is wrong

The state machine and the two routes already work as functions. The mail a person would receive
does not point at those routes.

```
POST /subscribe
    -> pending record + SES "Confirm this subscription: token=<token>"
GET  /confirm?token=        (exists, nothing in the mail links here)
GET  /unsubscribe?token=    (exists, the digest never mentions it)
digest
    -> confirmed records only, body from build_digest, no footer
```

Confirm and unsubscribe already share one token. `subscribe` rotates the nonce, `confirm` does
not, `unsubscribe` does. So both links in the confirmation mail are the same token, and the
digest mints a new link from the nonce still on the record. After unsubscribe that token is dead.

## Link

```
{NOTIFY_PUBLIC_BASE}/confirm?token={urlencode(token)}
{NOTIFY_PUBLIC_BASE}/unsubscribe?token={urlencode(token)}
```

`NOTIFY_PUBLIC_BASE` is the Function URL origin, no path and no trailing slash
(`https://<id>.lambda-url.eu-north-1.on.aws`). Build the query with
`urllib.parse.urlencode`. The token alphabet is already url-safe (`tokens.make_token`), so the
encoded value matches the token the verifier expects.

One helper in `notify/lambda_handler.py`, used by subscribe and by the digest:

```
def action_link(base: str, action: str, token: str) -> str
```

Empty base returns None. Callers that get None do not send.

## Confirmation body

Subject stays `Confirm your Space Radar alerts`. Body:

```
Confirm your Space Radar alerts:
https://<base>/confirm?token=<token>

Stop these emails:
https://<base>/unsubscribe?token=<token>

If you did not ask for this, use the second link.
```

Order of operations in `handler_subscribe`: resolve the base first. If it is missing, return
500 `{"error": "NOTIFY_PUBLIC_BASE is not set"}` before the S3 write and before SES. Today's
order writes the pending record and then sends. A write with no link would leave an address
that can never be confirmed.

## Digest footer

`build_digest` is unchanged. After it returns a body, `handler_digest` appends:

```
Unsubscribe:
https://<base>/unsubscribe?token=<token>
```

The token is `tokens.make_token(record["email"], record["nonce"], secret)`. This is the first
time the digest reads `NOTIFY_SECRET`. Rules, in order:

- `dry_run` is unchanged: no SES, no ledger write, and no need for a link.
- Base missing, or secret missing, on a real run: send nobody. The result gains
  `"links": "could not look"` and `emails_sent` stays 0. Do not raise. A raise retries the
  whole schedule.
- One confirmed record with no `nonce`: skip that address, keep going, and count it. Do not
  send it a digest with no link.

`DigestHandlerTest._run` sets `NOTIFY_PUBLIC_BASE` and `NOTIFY_SECRET` (the test-only secret).
The existing confirmed fixtures gain a nonce so they still send. Their assertions are
`assertIn` / `assertNotIn`, so a footer does not disturb them. One new test unsets the base
and expects no send.

## The test seam

Call `handler`, with the event the Function URL actually delivers:

```
{"requestContext": {"http": {"method": "GET", "path": "/confirm"}},
 "queryStringParameters": {"token": "<from the mail>"}}
```

POST `/subscribe` uses the same shape and a raw JSON string body, which is what
`handler_subscribe` parses. A captured live event was not available (Lambda read denied). If a
real invoke sets `isBase64Encoded: true` for this JSON, decoding that is in scope here, because
otherwise the confirmation mail never goes out. The test covers the raw-string case the code
handles today, and the base64 case if the implementer finds the handler must accept it.

The SES stub is the one `DigestHandlerTest` already builds. Parse the URL out of
`Message.Body.Text.Data`. Do not call `subscriptions.confirm` from this test.

Sequence the exit criterion asks for, on one fake bucket:

1. Subscribe `a@b.com`.
2. GET the confirm link from that mail. Status `confirmed`.
3. Run the digest. `a@b.com` is mailed. A confirmed neighbour with a nonce is mailed too.
4. GET the unsubscribe link from `a@b.com`'s digest.
5. Run the digest again. `a@b.com` gets nothing. The neighbour gets mail (or is ledger-skipped
   if the content was already sent; use a fresh launch id so the neighbour still has something
   unsent).

A second case uses the two links from the confirmation mail alone, both orders (R5).

## Provisioning

`scripts/provision-notifier.sh` already replaces the function environment with four variables
and will wipe a hand-set `NOTIFY_SECRET` on every re-run. That predates this spec. Touching the
environment to add the base makes it this spec's bug if a re-run still drops the secret.

After `create-function-url-config`, read `FunctionUrl`, strip one trailing slash, and merge it
in as `NOTIFY_PUBLIC_BASE`. Read the function's current variables first and keep `NOTIFY_SECRET`
when it is already there. Dry-run prints the call and does not apply it. The script still does
not send mail and still does not choose a secret.

This PR does not run the script.

## Risks

- **GET prefetch.** A mail client that fetches links can confirm, or unsubscribe, on open.
  Left as it is: the routes are already GET, and the card asks to prove those links, not to
  add a second page.
- **No deployed function.** The live site on 21 Oct has no notify URL, and the Lambda could
  not be read. The test is the exit criterion. A later human deploy still has to set the base,
  the secret, SES, and `SPACE_RADAR_NOTIFY_URL`.
- **Existing digest tests.** They pass only if the shared fake grows the two env vars and the
  fixtures gain a nonce. Forgetting the nonce looks like "the digest sends nothing now".
