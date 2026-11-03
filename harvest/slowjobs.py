"""The daily slow-job queue: jobs that cut a catalogue into tiles (A1, internal I#1059).

The hourly run fetches ONE URL per source and publishes the body verbatim. A tile set is not that: it is built from
several answers, or from a source and another source's snapshot, and it takes seconds. So the hourly run, after
everything else, looks at this queue:

    * a job is DUE when `tiles/<id>/set.json` is missing, or was built more than `every_s` ago (less a slack
      so an hourly schedule does not slip a day);
    * due jobs run oldest first, one after another, while the run has time (`budget_s`); a job not reached is first
      in line next hour;
    * a job that cannot build (the upstream said no, answered nonsense, gave fewer than MIN_KEEP of the last build's
      objects) is said in the log and changes nothing: the last good set stays, with its true build date;
    * a build writes its tiles first and `set.json` LAST, so a reader that has set.json has every tile it names;
    * nothing here raises out of a job.

The files go beside the snapshots (`data/v1/tiles/<id>/...`), where the page reads them (site/js/data/tilecloud.js).
A tile carries the build stamp of its set.json; the page refuses a tile from another build, so a CDN that still holds
yesterday's tile beside today's set.json costs a refetch and never a wrong picture.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Callable

from . import snapshot as snap
from . import tracked

DAY_S = 86400
SLACK_S = 3600
BUDGET_S = 100.0
NEED_S = 100.0          # the longest a job may take: two CelesTrak answers at 40 s each and the cutting
SET_CACHE = "public, max-age=900, s-maxage=900"
TILE_CACHE = "public, max-age=21600, s-maxage=21600"
TYPES = {"json": "application/json", "bin": "application/octet-stream", "txt": "text/plain; charset=utf-8"}


@dataclass(frozen=True)
class Job:
    id: str
    every_s: int
    build: Callable            # build(store=, now=, fetcher=, sleep=, log=) -> {path: bytes} | None


JOBS: tuple[Job, ...] = (
    Job("tracked", DAY_S, tracked.build),
)


def set_key(job_id: str) -> str:
    return f"tiles/{job_id}/set.json"


def read_set(store: snap.Store, job_id: str) -> dict | None:
    raw = store.read(set_key(job_id))
    if raw is None:
        return None
    try:
        doc = json.loads(raw)
    except ValueError:
        return None
    return doc if isinstance(doc, dict) and doc.get("format") else None


def built_at(doc: dict | None) -> datetime | None:
    if not doc or not doc.get("built_at"):
        return None
    try:
        return snap.parse_iso(doc["built_at"])
    except ValueError:
        return None


def due(job: Job, store: snap.Store, now: datetime) -> bool:
    when = built_at(read_set(store, job.id))
    return when is None or now - when >= timedelta(seconds=job.every_s - SLACK_S)


def run_due(store: snap.Store, now: datetime, *, jobs=JOBS, fetcher=None, sleep=time.sleep, log=print,
            budget_s: float = BUDGET_S, clock=time.monotonic, only: str | None = None,
            deadline: float | None = None) -> dict[str, str]:
    """Run the due jobs; returns {job id: 'built' | 'not due' | 'kept: reason' | 'no time'}. Never raises.

    `deadline` is a time.monotonic() value (the Lambda's, less its reserve): a job is not started unless NEED_S remain.
    """
    began = clock()
    out: dict[str, str] = {}
    queue = [j for j in jobs if only is None or j.id == only]
    # Oldest first: a job that has never built goes before one a day stale.
    queue.sort(key=lambda j: (built_at(read_set(store, j.id)) or datetime.min.replace(tzinfo=now.tzinfo)))
    for job in queue:
        if only is None and not due(job, store, now):
            out[job.id] = "not due"
            continue
        if clock() - began > budget_s or (deadline is not None and deadline - clock() < NEED_S):
            out[job.id] = "no time"
            log(f"    {job.id}: no time left in this run; first in line next hour")
            continue
        try:
            kwargs = {"store": store, "now": now, "sleep": sleep, "log": log}
            if fetcher is not None:
                kwargs["fetcher"] = fetcher
            files = job.build(**kwargs)
        except Exception as e:  # noqa: BLE001 - a job must never take the hourly run down
            out[job.id] = f"kept: {type(e).__name__}: {e}"[:200]
            log(f"    {job.id}: build failed ({out[job.id]})")
            continue
        if not files:
            out[job.id] = "kept: nothing built"
            continue
        new = json.loads(files["set.json"])
        old = read_set(store, job.id)
        if old and new["count"] < MIN_KEEP * old.get("count", 0):
            out[job.id] = f"kept: {new['count']} objects against {old['count']} last time"
            log(f"    {job.id}: refused, {out[job.id]}")
            continue
        write_set(store, job.id, files, now)
        out[job.id] = "built"
        log(f"    {job.id}: {new['count']} objects in {len(new['tiles'])} tiles, {sum(len(v) for v in files.values())} B")
    return out


MIN_KEEP = tracked.MIN_KEEP


def write_set(store: snap.Store, job_id: str, files: dict[str, bytes], now: datetime) -> None:
    """Tiles and the index first, set.json last."""
    for path in sorted(files, key=lambda p: (p == "set.json", p)):
        ext = path.rsplit(".", 1)[-1]
        store.write(f"tiles/{job_id}/{path}", files[path], content_type=TYPES.get(ext, "application/octet-stream"),
                    cache_control=SET_CACHE if path == "set.json" else TILE_CACHE)
