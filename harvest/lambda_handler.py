"""AWS Lambda entry point: the same run, written to S3.

    handler(event, context)
      env HARVEST_BUCKET        the site bucket (required)
      env HARVEST_PREFIX        key prefix, default `data/v1`
      env HARVEST_DISTRIBUTION  optional: a CloudFront distribution to invalidate HARVEST_INVALIDATE on
      env HARVEST_INVALIDATE    the one path invalidated after the index is written, default `/<prefix>/index.json`
      event.only                optional: run one source id
      event.now                 optional: ISO time to pretend it is

What one invocation does (infra: the internal repo's infra/harvester/harvester-stack.yaml, hourly):
the same run as `python3 -m harvest` -- the sources that are due fetched, counted, guarded, the last good copy
kept for any that failed, the cuts and column twins made (harvest/publish.py) -- written to the bucket with
index.json LAST, then index.json invalidated at the edge so a visitor reads the new manifest within seconds.
The run stops starting sources 60 s before the function's own timeout, so the index is always written.

boto3 is imported HERE and only here, inside the handler, so `python3 -m harvest --dest DIR` and
the tests import this module without AWS installed. The Lambda runtime ships boto3.
"""

from __future__ import annotations

import json
import os
import time

from . import publish, registry
from . import snapshot as snap
from .run import run

DEFAULT_PREFIX = "data/v1"
# A schedule fires a few seconds either side of the hour; a one-hour source must not wait for the next one.
SLACK_S = 300
# Seconds kept back from the function's timeout for finishing (the cuts, the twins, the index, the invalidation).
RESERVE_S = 60


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
        # Anything else (AccessDenied above all) is raised: a role that cannot read must fail the run
        # loudly, not look like a bucket with nothing in it and overwrite what it could not see.
        return obj["Body"].read()

    def write(self, key: str, data: bytes, *, content_type: str, cache_control: str) -> None:
        self.client.put_object(
            Bucket=self.bucket,
            Key=self.key(key),
            Body=data,
            ContentType=content_type,
            CacheControl=cache_control,
        )


def invalidate(distribution: str | None, path: str, *, client=None, now: float | None = None) -> str | None:
    """Invalidate ONE path. Returns the invalidation id, or None (no distribution, or it failed: said, not raised --
    the data is already written, and the edge copy of index.json expires by itself within five minutes)."""
    if not distribution:
        return None
    try:
        if client is None:
            import boto3
            client = boto3.client("cloudfront")
        ref = f"harvest-{int(now if now is not None else time.time())}"
        out = client.create_invalidation(
            DistributionId=distribution,
            InvalidationBatch={"Paths": {"Quantity": 1, "Items": [path]}, "CallerReference": ref},
        )
        return out["Invalidation"]["Id"]
    except Exception as e:  # noqa: BLE001 - see the docstring
        print(f"invalidation of {path} failed: {type(e).__name__}: {e}", flush=True)
        return None


def summarise(doc: dict) -> dict:
    counts: dict[str, int] = {}
    for e in doc["snapshots"].values():
        counts[e["status"]] = counts.get(e["status"], 0) + 1
    return {
        "generated_at": doc["generated_at"],
        "duration_ms": doc["run"]["duration_ms"],
        "statuses": counts,
        # What failed this run and is published as the last good copy, and what has no copy at all.
        "kept": {k: v["kept_after"] for k, v in doc["snapshots"].items() if v.get("kept_after")},
        "errors": {k: v["last_error"] for k, v in doc["snapshots"].items() if v["status"] in ("error", "refused")},
    }


def handler(event, context):
    import boto3  # the one AWS import in the package, and it lives inside the handler on purpose

    bucket = os.environ.get("HARVEST_BUCKET")
    if not bucket:
        raise RuntimeError("HARVEST_BUCKET is not set")
    prefix = os.environ.get("HARVEST_PREFIX", DEFAULT_PREFIX)
    event = event or {}
    now = snap.parse_iso(event["now"]) if event.get("now") else None

    deadline = None
    remaining = getattr(context, "get_remaining_time_in_millis", None)
    if callable(remaining):
        deadline = time.monotonic() + max(0.0, remaining() / 1000.0 - RESERVE_S)

    store = S3Store(boto3.client("s3"), bucket, prefix)
    previous = snap.read_index(store)
    doc = run(store, registry.load(), now=now, only=event.get("only"), runner="lambda",
              slack_s=SLACK_S, force_due=publish.force_due(previous, now or snap.utcnow(), SLACK_S),
              finish=publish.finish, deadline=deadline)

    # The manifest is written (last, by run); only now is the edge told. One path, never the snapshot files:
    # their s-maxage is five minutes (harvest/snapshot.py), so the edge catches up by itself.
    path = os.environ.get("HARVEST_INVALIDATE") or f"/{prefix.strip('/')}/index.json"
    out = summarise(doc)
    out["invalidation"] = invalidate(os.environ.get("HARVEST_DISTRIBUTION"), path)
    print(json.dumps(out, sort_keys=True), flush=True)
    return out
