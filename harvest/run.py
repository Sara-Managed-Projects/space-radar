"""One run: every source that is due, fetched, counted, guarded, written, and reported.

The loop knows no source names. What varies per row is data on the row:

    auth: secret:NAME   -> skipped, with the reason, unless the environment has NAME
    enabled: false      -> skipped, "disabled in registry"
    list: {...}         -> one request per id, the body maps id -> response text (Horizons)
    query: "..."        -> the text is sent as `query=` with a SPARQL Accept header (Wikidata)
    parser: name        -> harvest/parsers/<name>.py: count(), validate(), not_modified()

Every outcome is one of six statuses and lands in the manifest; nothing raises out of a source.
A source that fails keeps its previous stamps and snapshot, so the browser keeps drawing the last
good copy with an honest age. Degrade, never dark; recover unattended on the next due run.
"""

from __future__ import annotations

import json
import re
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta

from . import fetch as _fetch
from . import parsers as _parsers
from . import snapshot as snap
from .registry import Source, parse_duration

SPARQL_ACCEPT = "application/sparql-results+json"
LIST_DEFAULT_PAUSE_S = 0.5
LIST_DEFAULT_WINDOW = {"before": "1d", "after": "30d"}


@dataclass
class Outcome:
    """What one source did this run. `entry` is its new manifest entry."""

    source: Source
    entry: snap.Entry
    wrote: bool = False


def run(
    store: snap.Store,
    sources: list[Source],
    *,
    now: datetime | None = None,
    only: str | None = None,
    dry_run: bool = False,
    runner: str = "local",
    env=None,
    fetcher=None,
    sleep=time.sleep,
    log=print,
) -> dict:
    """Run every source; write the snapshots that pass and then the index. Returns the index doc.

    `fetcher` is `fetch.get`'s signature, injectable so tests never touch the network.
    `now` overrides the clock for due/valid_until arithmetic (`--now`); the run's own duration is
    still measured on the wall clock.
    """
    env = os.environ if env is None else env
    fetcher = fetcher or _fetch.get
    wall_start = time.monotonic()
    started = now or snap.utcnow()
    now = started

    previous = snap.read_index(store)
    manifest = snap.Manifest()

    for source in sources:
        prev = previous.snapshots.get(source.id, snap.Entry())
        if only and source.id != only:
            entry = _carry(prev, status=prev.status if prev.status in ("ok", "not-modified") else "skipped",
                           error=prev.last_error if prev.status in ("ok", "not-modified") else "not selected by --only")
            manifest.snapshots[source.id] = entry
            continue
        outcome = run_source(store, source, prev, now=now, dry_run=dry_run, env=env, fetcher=fetcher, sleep=sleep)
        manifest.snapshots[source.id] = outcome.entry
        log(_line(source, outcome.entry))

    duration_ms = int((time.monotonic() - wall_start) * 1000)
    generated_at = now if _overridden(now) else snap.utcnow()
    doc = manifest.to_json(generated_at=generated_at, started_at=started, duration_ms=duration_ms, runner=runner)
    if not dry_run:
        snap.write_index(store, manifest, generated_at=generated_at, started_at=started,
                         duration_ms=duration_ms, runner=runner)
    return doc


def _overridden(now: datetime) -> bool:
    # A `--now` far from the wall clock is a test or a rehearsal; stamp generated_at with it too so
    # the manifest is internally consistent. Within a minute of real time, use the real time.
    return abs((snap.utcnow() - now).total_seconds()) > 60


def run_source(store, source: Source, prev: snap.Entry, *, now: datetime, dry_run: bool, env,
               fetcher, sleep) -> Outcome:
    started = time.monotonic()

    def done(entry: snap.Entry, wrote: bool = False) -> Outcome:
        entry.duration_ms = int((time.monotonic() - started) * 1000)
        return Outcome(source, entry, wrote)

    if not source.enabled:
        return done(_carry(prev, status="skipped", error="disabled in registry (enabled: false)"))
    secret = source.secret
    if secret and not env.get(secret):
        return done(_carry(prev, status="skipped", error=f"secret {secret} is not set; the source is skipped, not failed"))
    if not prev.due(now):
        return done(_carry(prev, status="not-due", error=None))
    if dry_run:
        return done(_carry(prev, status="skipped", error="dry run: due, would fetch"))
    if secret:
        # Space-Track is the one such row and it needs a login POST, which this GET-only transport
        # does not do. Saying so beats a confident 401.
        return done(_carry(prev, status="error", error=f"secret {secret} is set but an authenticated fetch is not implemented for `auth: {source.auth}`"))

    try:
        parser = _parsers.load(source.parser)
    except _parsers.ParserMissing as e:
        return done(_carry(prev, status="error", error=str(e)))

    try:
        if source.list:
            fetched = _fetch_list(source, now=now, fetcher=fetcher, sleep=sleep)
        elif source.query:
            fetched = _fetch_query(source, prev, fetcher=fetcher)
        else:
            fetched = _fetch_one(source, prev, fetcher=fetcher)
    except _fetch.FetchError as e:
        return done(_carry(prev, status="error", error=str(e)))

    # "Nothing new" comes three ways: a 304; or, from CelesTrak, the sentence "GP data has not
    # updated since your last successful download" -- as a 403 or as a 200. The parser knows the
    # sentence; it is asked BEFORE the status is judged, because that 403 is an answer, not a fault.
    if fetched.not_modified or (fetched.body is None and _parsers_says_not_modified(parser, fetched.text)):
        return _not_modified(store, source, prev, now=now, done=done)

    if fetched.status >= 400 or fetched.status < 200:
        return done(_carry(prev, status="error", error=f"upstream answered HTTP {fetched.status}{_excerpt(fetched.text)}"))

    body = fetched.body
    if body is None:
        body, err = _decode(fetched.text, fetched.content_type)
        if err:
            return done(_carry(prev, status="error", error=err))

    try:
        if callable(getattr(parser, "validate", None)):
            parser.validate(body)
        items = int(parser.count(body))
    except Exception as e:  # a parser that raises is a refusal with a reason, never a crash
        return done(_carry(prev, status="error", error=f"parser {source.parser}: {type(e).__name__}: {e}"))

    ok, reason = snap.accept(items, prev.items if prev.holds_snapshot() else None)
    if not ok:
        return done(_carry(prev, status="refused", error=reason))

    until = snap.valid_until(now, source.refresh_seconds)
    doc = snap.snapshot_doc(source_id=source.id, fetched_at=now, until=until, upstream_url=source.url,
                            content_type=fetched.content_type, items=items, body=body)
    snap.write_snapshot(store, doc, now=now)
    entry = snap.Entry(
        fetched_at=snap.iso(now),
        valid_until=snap.iso(until),
        items=items,
        bytes=fetched.bytes,
        status="ok",
        last_error=fetched.partial or None,
        etag=fetched.etag,
    )
    return done(entry, wrote=True)


# --- the three ways to fetch ---------------------------------------------------------------------


@dataclass
class Fetched:
    status: int
    text: str
    content_type: str
    bytes: int
    etag: str | None
    not_modified: bool = False
    body: object = None          # already-built body (list fetches); None means "decode text"
    partial: str | None = None   # a list fetch where some ids failed: which, in words


def _conditional(prev: snap.Entry) -> dict:
    if prev.holds_snapshot() and prev.status in ("ok", "not-modified"):
        return {"etag": prev.etag, "since": prev.fetched_at}
    return {"etag": None, "since": None}


def _fetch_one(source: Source, prev: snap.Entry, *, fetcher) -> Fetched:
    r = fetcher(source.url, **_conditional(prev))
    return Fetched(status=r.status, text=r.text, content_type=r.content_type, bytes=len(r.body),
                   etag=r.etag, not_modified=(r.status == 304))


def _fetch_query(source: Source, prev: snap.Entry, *, fetcher) -> Fetched:
    url = _fetch.with_params(source.url, {"query": source.query.strip()})
    r = fetcher(url, headers={"Accept": SPARQL_ACCEPT}, **_conditional(prev))
    return Fetched(status=r.status, text=r.text, content_type=r.content_type, bytes=len(r.body),
                   etag=r.etag, not_modified=(r.status == 304))


# Horizons refuses a whole request when the window runs past the end of a spacecraft's trajectory
# file, with a line like:
#   No ephemeris for target "Mars Reconnaissance Orbiter (spacecraft)" after A.D. 2026-SEP-28 07:32:00.0000 TDB
# MEASURED 2026-09-08: MRO's predicted file ended 2026-Sep-28 and the row asked for 30 days ahead,
# so the request returned a header and no $$SOE block, and one of eight heroes silently had no
# position. The honest response is to ask again for the window Horizons actually has, once, and
# to say on the manifest that this id's window was shortened -- not to drop the object.
_NO_EPHEM = re.compile(
    r'No ephemeris for target .*? (?P<side>after|before) A\.D\. (?P<date>\d{4}-[A-Z]{3}-\d{2} \d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)',
    re.IGNORECASE,
)
_MONTHS = {m: i for i, m in enumerate(
    ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"], 1)}


def horizons_limit(text: str) -> tuple[str, str] | None:
    """('after'|'before', 'YYYY-MM-DD HH:MM') when Horizons says its data stops there, else None.

    The returned time is one minute INSIDE the limit, so re-asking with it as the new stop (or
    start) is accepted. Pure, so the test can hand it the real refusal text.
    """
    m = _NO_EPHEM.search(text or "")
    if not m:
        return None
    d = m.group("date").upper()
    y, mon, rest = d[0:4], d[5:8], d[9:]
    day = rest[0:2]
    hh, mm = rest[3:5], rest[6:8]
    if mon not in _MONTHS:
        return None
    limit = datetime(int(y), _MONTHS[mon], int(day), int(hh), int(mm))
    side = m.group("side").lower()
    inside = limit - timedelta(minutes=1) if side == "after" else limit + timedelta(minutes=1)
    return side, inside.strftime("%Y-%m-%d %H:%M")


def _horizons_text(r) -> str:
    """Horizons wraps the same text block in {signature, result} when asked for JSON."""
    text = r.text
    if "json" in r.content_type:
        try:
            doc = json.loads(text)
            text = doc.get("result", text) if isinstance(doc, dict) else text
        except ValueError:
            pass
    return text


def _fetch_list(source: Source, *, now: datetime, fetcher, sleep) -> Fetched:
    """One request per id; sequential, with a pause. Never conditional: the body is ours."""
    spec = source.list
    params_t = spec.get("params") or {}
    window = spec.get("window") or LIST_DEFAULT_WINDOW
    pause = float(spec.get("pause_s", LIST_DEFAULT_PAUSE_S))
    start = (now - timedelta(seconds=parse_duration(str(window.get("before", "1d"))))).strftime("%Y-%m-%d")
    stop = (now + timedelta(seconds=parse_duration(str(window.get("after", "30d"))))).strftime("%Y-%m-%d")

    body: dict[str, str] = {}
    failures: list[str] = []
    clamps: list[str] = []
    total = 0
    for i, row in enumerate(spec["ids"]):
        sid = str(row["id"] if isinstance(row, dict) else row)
        params = {k: str(v).format(id=sid, start=start, stop=stop) for k, v in params_t.items()}
        url = _fetch.with_params(source.url, params)
        if i:
            sleep(pause)
        try:
            r = fetcher(url)
        except _fetch.FetchError as e:
            failures.append(f"{sid}: {e}")
            continue
        total += len(r.body)
        if r.status != 200:
            failures.append(f"{sid}: HTTP {r.status}")
            continue
        text = _horizons_text(r)
        limit = horizons_limit(text)
        if limit:
            # Once. A second refusal means the window is wrong in a way a clamp cannot fix.
            side, when = limit
            clamped = dict(params)
            clamped["STOP_TIME" if side == "after" else "START_TIME"] = f"'{when}'"
            sleep(pause)
            try:
                r2 = fetcher(_fetch.with_params(source.url, clamped))
                total += len(r2.body)
                if r2.status == 200:
                    text = _horizons_text(r2)
                    clamps.append(f"{sid}: window {side} {when}")
            except _fetch.FetchError as e:
                failures.append(f"{sid}: {e}")
                continue
        body[sid] = text
    if not body and failures:
        raise _fetch.FetchError("every id failed: " + "; ".join(failures))
    notes = []
    if failures:
        notes.append(f"{len(failures)} of {len(spec['ids'])} ids failed: " + "; ".join(failures))
    if clamps:
        notes.append("window shortened to what Horizons holds for " + "; ".join(clamps))
    partial = "; ".join(notes) if notes else None
    return Fetched(status=200, text="", content_type="application/json", bytes=total, etag=None,
                   body=body, partial=partial)


# --- outcomes ------------------------------------------------------------------------------------


def _not_modified(store, source: Source, prev: snap.Entry, *, now: datetime, done) -> Outcome:
    """Confirmed current: extend valid_until on the manifest AND on the snapshot file."""
    if not prev.holds_snapshot():
        # We were told nothing changed since a download we do not hold (CelesTrak keys this on the
        # client address, and a 304 needs an ETag we could only have sent from a lost manifest).
        # Forget the stamps so the next run asks for a full copy.
        e = _carry(prev, status="error", error="upstream says not modified, but no previous snapshot is held; will fetch fresh next run")
        e.etag = None
        e.fetched_at = None
        e.valid_until = None
        return done(e)
    until = snap.valid_until(now, source.refresh_seconds)
    doc = snap.read_snapshot(store, source.id)
    if doc is not None:
        doc["valid_until"] = snap.iso(until)
        snap.write_snapshot(store, doc, now=now)
    entry = _carry(prev, status="not-modified", error=None)
    entry.valid_until = snap.iso(until)
    return done(entry, wrote=doc is not None)


def _carry(prev: snap.Entry, *, status: str, error: str | None) -> snap.Entry:
    """This run's status on top of the last good stamps: nothing the browser relies on is lost."""
    return snap.Entry(
        fetched_at=prev.fetched_at,
        valid_until=prev.valid_until,
        items=prev.items,
        bytes=prev.bytes,
        status=status,
        last_error=error,
        etag=prev.etag,
    )


def _parsers_says_not_modified(parser, text: str) -> bool:
    fn = getattr(parser, "not_modified", None)
    return callable(fn) and bool(fn(text))


def _decode(text: str, content_type: str) -> tuple[object, str | None]:
    """Parsed JSON if the upstream sent JSON, else the text. Never guesses past a broken body."""
    says_json = "json" in content_type.lower()
    head = text.lstrip()[:1]
    if says_json or head in ("{", "["):
        try:
            return json.loads(text), None
        except ValueError as e:
            if says_json:
                return None, f"upstream said {content_type} but the body is not JSON: {e}"
    return text, None


def _excerpt(text: str, n: int = 120) -> str:
    t = " ".join((text or "").split())
    return f": {t[:n]}" if t else ""


def _line(source: Source, e: snap.Entry) -> str:
    err = f"  -- {e.last_error}" if e.last_error else ""
    return f"{source.id:32s} {e.status:13s} items={e.items:<7d} bytes={e.bytes:<9d} {e.duration_ms:6d} ms{err}"
