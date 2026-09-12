"""The harvester's stand-in, packaged ONLY while the real `harvest/` package does not exist.

It writes the heartbeat manifest from specs/0003 amendment 1 and nothing else -- no upstream is
fetched, no snapshot is written. Its job is to prove the wiring end to end (role, schedule,
bucket, CloudFront TTL) before the writer lands, and to be unmistakable while it does:
`run.placeholder` is true and `snapshots` is empty, so the browser's reader sees "no snapshots"
and falls back to its live fetches exactly as it does when the index is missing. Nothing is
invented.

Same module path as the real thing -- `harvest.lambda_handler.handler` -- and the same two
environment variables, so provision-harvester.sh and deploy-harvester.sh do not know which one
they shipped. scripts/package-harvester.sh copies this file to harvest/lambda_handler.py inside
the zip and says so on stdout.

Stdlib only. boto3 is imported inside the handler because the Lambda runtime ships it and a
laptop running the tests may not.
"""

from __future__ import annotations

import datetime
import json
import os

# docs/architecture.md, the cache-headers table: the harvester owns /data/v1/*, and TTL expiry
# replaces invalidation. 60 s in the browser, 300 s at the edge, and a stale copy may be served
# for another 600 s while CloudFront revalidates.
CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
CONTENT_TYPE = "application/json"


def manifest(now: datetime.datetime | None = None) -> dict:
    """The heartbeat index: schema 1, this instant, a run that admits it is a placeholder."""
    now = now or datetime.datetime.now(datetime.timezone.utc)
    stamp = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return {
        "schema": 1,
        "generated_at": stamp,
        "run": {"runner": "lambda", "placeholder": True},
        "snapshots": {},
    }


def handler(event, context):  # noqa: ARG001 -- the Lambda signature
    bucket = os.environ["HARVEST_BUCKET"]
    prefix = os.environ.get("HARVEST_PREFIX", "data/v1").strip("/")
    key = f"{prefix}/index.json"
    body = json.dumps(manifest(), separators=(",", ":")).encode("utf-8")

    import boto3  # noqa: PLC0415 -- see the module docstring

    boto3.client("s3").put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType=CONTENT_TYPE,
        CacheControl=CACHE_CONTROL,
    )
    return {"ok": True, "placeholder": True, "key": key, "bytes": len(body)}
