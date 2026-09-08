"""AWS Lambda entry point: the same run, written to S3.

    handler(event, context)
      env HARVEST_BUCKET   the site bucket (required)
      env HARVEST_PREFIX   key prefix, default `data/v1`
      event.only           optional: run one source id
      event.now            optional: ISO time to pretend it is

boto3 is imported HERE and only here, inside the handler, so `python3 -m harvest --dest DIR` and
the tests import this module without AWS installed. The Lambda runtime ships boto3.
"""

from __future__ import annotations

import os

from . import registry
from . import snapshot as snap
from .run import run

DEFAULT_PREFIX = "data/v1"


class S3Store(snap.Store):
    def __init__(self, client, bucket: str, prefix: str) -> None:
        self.client = client
        self.bucket = bucket
        self.prefix = prefix.strip("/")

    def key(self, name: str) -> str:
        return f"{self.prefix}/{name}" if self.prefix else name

    def read(self, key: str) -> bytes | None:
        try:
            obj = self.client.get_object(Bucket=self.bucket, Key=self.key(key))
        except self.client.exceptions.NoSuchKey:
            return None
        return obj["Body"].read()

    def write(self, key: str, data: bytes, *, content_type: str, cache_control: str) -> None:
        self.client.put_object(
            Bucket=self.bucket,
            Key=self.key(key),
            Body=data,
            ContentType=content_type,
            CacheControl=cache_control,
        )


def handler(event, context):
    import boto3  # the one AWS import in the package, and it lives inside the handler on purpose

    bucket = os.environ.get("HARVEST_BUCKET")
    if not bucket:
        raise RuntimeError("HARVEST_BUCKET is not set")
    prefix = os.environ.get("HARVEST_PREFIX", DEFAULT_PREFIX)
    event = event or {}
    now = snap.parse_iso(event["now"]) if event.get("now") else None

    store = S3Store(boto3.client("s3"), bucket, prefix)
    doc = run(store, registry.load(), now=now, only=event.get("only"), runner="lambda")

    counts: dict[str, int] = {}
    for e in doc["snapshots"].values():
        counts[e["status"]] = counts.get(e["status"], 0) + 1
    return {
        "generated_at": doc["generated_at"],
        "duration_ms": doc["run"]["duration_ms"],
        "statuses": counts,
        "errors": {k: v["last_error"] for k, v in doc["snapshots"].items() if v["status"] in ("error", "refused")},
    }
