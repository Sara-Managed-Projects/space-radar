"""AWS Lambda entry point for email subscriptions.

One Lambda, one entry point, dispatching on the event shape it was handed:

    env NOTIFY_BUCKET     the site bucket (required). Reads/writes NOTIFY_PREFIX/* only.
    env NOTIFY_PREFIX     key prefix, default `notify/v1`.
    env HARVEST_PREFIX    key prefix the HARVESTER writes, default `data/v1` -- read-only, for
                          `launches.json`. Same bucket; see scripts/provision-notifier.sh.
    env NOTIFY_SECRET     the HMAC key for tokens.py. Never hardcoded, never committed.
    env NOTIFY_FROM_ADDRESS  the verified SES sender. A placeholder until a human verifies a
                          real domain in SES and moves it out of the sandbox (see the provisioning
                          script's header).

HTTP (invoked through a Lambda Function URL -- see scripts/provision-notifier.sh for why a
Function URL and not API Gateway):

    POST /subscribe   body {"email": str, "categories": ["launches", "meteor-showers"]}
                      -> 202 {"status": "pending"}; a confirmation email is sent before this
                         returns, so the response never claims success ahead of the email.
                      -> 400 {"error": str} for a bad email or an empty/unknown category list.
    GET  /confirm?token=...      -> 200 {"status": "confirmed"} or 404 {"error": "..."}
    GET  /unsubscribe?token=...  -> 200 {"status": "unsubscribed"} or 404 {"error": "..."}

There is no existing HTTP-handler precedent in this repo to match, so this shape -- three plain
routes, JSON in, JSON out, no session, no cookie -- is the one chosen here, documented plainly as
asked rather than left to be inferred from the code.

Scheduled (EventBridge, no meaningful payload; `event.now` may override "now" for a dry run, the
same convention harvest/lambda_handler.py uses): builds each confirmed subscriber's digest from
the harvester's own launches.json and notify/showers.py's mirror, skips anything already on their
ledger, sends what's left, and writes the ledger back.

boto3 is imported inside each handler body and nowhere else, matching harvest/lambda_handler.py,
so this module imports (and its pure helpers test) without AWS installed.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from . import digest as dig
from . import showers as shw
from . import subscriptions as subs
from . import tokens

DEFAULT_PREFIX = "notify/v1"
DEFAULT_HARVEST_PREFIX = "data/v1"
SUBSCRIPTIONS_KEY = "subscriptions.json"
LEDGER_KEY = "ledger.json"
LAUNCHES_SOURCE_KEY = "launches.json"


class S3Store:
    """Get/put JSON under one prefix, nothing else -- the same shape as
    harvest.lambda_handler.S3Store, reused rather than re-invented."""

    def __init__(self, client, bucket: str, prefix: str) -> None:
        self.client = client
        self.bucket = bucket
        self.prefix = prefix.strip("/")

    def key(self, name: str) -> str:
        return f"{self.prefix}/{name}" if self.prefix else name

    def read_json(self, key: str, default):
        try:
            obj = self.client.get_object(Bucket=self.bucket, Key=self.key(key))
        except self.client.exceptions.NoSuchKey:
            return default
        return json.loads(obj["Body"].read().decode("utf-8"))

    def write_json(self, key: str, doc) -> None:
        self.client.put_object(
            Bucket=self.bucket,
            Key=self.key(key),
            Body=json.dumps(doc, sort_keys=True).encode("utf-8"),
            ContentType="application/json",
            CacheControl="no-store",
        )


def send_email(client, *, source: str, to: str, subject: str, body: str) -> None:
    """The one place SES is called, so a test stubs this function and nothing deeper."""
    client.send_email(
        Source=source,
        Destination={"ToAddresses": [to]},
        Message={"Subject": {"Data": subject}, "Body": {"Text": {"Data": body}}},
    )


def _env_bucket_prefix() -> tuple[str, str]:
    bucket = os.environ.get("NOTIFY_BUCKET")
    if not bucket:
        raise RuntimeError("NOTIFY_BUCKET is not set")
    return bucket, os.environ.get("NOTIFY_PREFIX", DEFAULT_PREFIX)


def _secret() -> str:
    secret = os.environ.get(tokens.NOTIFY_SECRET_ENV)
    if not secret:
        raise RuntimeError(f"{tokens.NOTIFY_SECRET_ENV} is not set")
    return secret


def _response(status: int, body: dict) -> dict:
    return {"statusCode": status, "headers": {"Content-Type": "application/json"}, "body": json.dumps(body)}


def _token_from_query(event) -> str | None:
    qs = event.get("queryStringParameters") or {}
    return qs.get("token")


def handler_subscribe(event, context):
    import boto3

    bucket, prefix = _env_bucket_prefix()
    secret = _secret()
    try:
        payload = json.loads(event.get("body") or "{}")
        email = payload["email"]
        categories = payload.get("categories") or []
    except (KeyError, ValueError, TypeError):
        return _response(400, {"error": "a JSON body with an email is required"})

    client = boto3.client("s3")
    store = S3Store(client, bucket, prefix)
    records = store.read_json(SUBSCRIPTIONS_KEY, {})
    try:
        record, token = subs.subscribe(records, email, categories, secret)
    except ValueError as exc:
        return _response(400, {"error": str(exc)})
    store.write_json(SUBSCRIPTIONS_KEY, records)

    ses = boto3.client("ses")
    from_addr = os.environ.get("NOTIFY_FROM_ADDRESS", "")
    send_email(
        ses,
        source=from_addr,
        to=record["email"],
        subject="Confirm your Space Radar alerts",
        body=f"Confirm this subscription: token={token}\nIf you did not ask for this, ignore it.\n",
    )
    return _response(202, {"status": "pending"})


def handler_confirm(event, context):
    import boto3

    bucket, prefix = _env_bucket_prefix()
    secret = _secret()
    token = _token_from_query(event)
    if not token:
        return _response(400, {"error": "token is required"})
    store = S3Store(boto3.client("s3"), bucket, prefix)
    records = store.read_json(SUBSCRIPTIONS_KEY, {})
    record = subs.confirm(records, token, secret)
    if record is None:
        return _response(404, {"error": "unknown or expired token"})
    store.write_json(SUBSCRIPTIONS_KEY, records)
    return _response(200, {"status": "confirmed"})


def handler_unsubscribe(event, context):
    import boto3

    bucket, prefix = _env_bucket_prefix()
    secret = _secret()
    token = _token_from_query(event)
    if not token:
        return _response(400, {"error": "token is required"})
    store = S3Store(boto3.client("s3"), bucket, prefix)
    records = store.read_json(SUBSCRIPTIONS_KEY, {})
    record = subs.unsubscribe(records, token, secret)
    if record is None:
        return _response(404, {"error": "unknown or expired token"})
    store.write_json(SUBSCRIPTIONS_KEY, records)
    return _response(200, {"status": "unsubscribed"})


def handler_digest(event, context):
    import boto3

    bucket, prefix = _env_bucket_prefix()
    harvest_prefix = os.environ.get("HARVEST_PREFIX", DEFAULT_HARVEST_PREFIX)
    from_addr = os.environ.get("NOTIFY_FROM_ADDRESS", "")
    event = event or {}
    now = dig.parse_dt(event["now"]) if event.get("now") else datetime.now(timezone.utc)

    client = boto3.client("s3")
    store = S3Store(client, bucket, prefix)
    harvest_store = S3Store(client, bucket, harvest_prefix)

    records = store.read_json(SUBSCRIPTIONS_KEY, {})
    ledger = store.read_json(LEDGER_KEY, {})  # email -> [sent ledger keys]

    snapshot = harvest_store.read_json(LAUNCHES_SOURCE_KEY, {"body": {"results": []}})
    launches = dig.next_launches(snapshot.get("body") or {"results": []}, now)
    showers = dig.next_shower_peaks(shw.SHOWERS, now)

    ses = boto3.client("ses")
    confirmed = {email: r for email, r in records.items() if r["status"] == "confirmed"}
    sent_count = 0
    for email, record in confirmed.items():
        already = set(ledger.get(email, []))
        new_launches = dig.unsent(launches if "launches" in record["categories"] else [], dig.ledger_key_launch, already)
        new_showers = dig.unsent(showers if "meteor-showers" in record["categories"] else [], dig.ledger_key_shower, already)
        content = dig.build_digest(record["categories"], new_launches, new_showers)
        if content is None:
            continue
        send_email(ses, source=from_addr, to=email, subject=content["subject"], body=content["body"])
        already.update(dig.ledger_key_launch(x) for x in new_launches)
        already.update(dig.ledger_key_shower(x) for x in new_showers)
        ledger[email] = sorted(already)
        sent_count += 1

    store.write_json(LEDGER_KEY, ledger)
    return {"subscribers_confirmed": len(confirmed), "emails_sent": sent_count}


def _route_http(event, context):
    http = event.get("requestContext", {}).get("http", {})
    method = (http.get("method") or event.get("httpMethod") or "GET").upper()
    path = (http.get("path") or event.get("path") or "/").rstrip("/")
    if method == "POST" and path.endswith("/subscribe"):
        return handler_subscribe(event, context)
    if method == "GET" and path.endswith("/confirm"):
        return handler_confirm(event, context)
    if method == "GET" and path.endswith("/unsubscribe"):
        return handler_unsubscribe(event, context)
    return _response(404, {"error": "no such route"})


def handler(event, context):
    """The one entry point provision-notifier.sh wires to both the Function URL and the
    EventBridge schedule: an HTTP request carries `requestContext`/`httpMethod`, a scheduled
    invocation does not."""
    event = event or {}
    if "requestContext" in event or "httpMethod" in event:
        return _route_http(event, context)
    return handler_digest(event, context)
