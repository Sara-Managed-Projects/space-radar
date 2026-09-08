"""The snapshot writer, the manifest, and the never-worse guard.

The two files the browser reads, as fixed in spec 0003 amendment 1 §3:

    GET <prefix>/index.json         Cache-Control: public, max-age=60, s-maxage=300,
                                                   stale-while-revalidate=600
    {"schema":1,"generated_at":ISO,"run":{"started_at":ISO,"duration_ms":N,"runner":"lambda"|"local"},
     "snapshots":{"<source-id>":{"fetched_at":ISO|null,"valid_until":ISO|null,"items":N,"bytes":N,
       "duration_ms":N,"status":"ok"|"not-modified"|"refused"|"error"|"skipped"|"not-due",
       "last_error":str|null,"etag":str|null}}}

    GET <prefix>/<source-id>.json   Cache-Control: public, max-age=<seconds to valid_until, min 60>
    {"schema":1,"source":id,"fetched_at":ISO,"valid_until":ISO,"upstream_url":str,
     "content_type":str,"items":N,"body":<upstream body VERBATIM: parsed JSON if JSON, else text>}

The body is a pass-through, deliberately: the browser already carries one parser per source.
The "parser" on this side is a `count(body)` for the guard and nothing more.

The never-worse guard, stated once:

    accept(new, prev) = new.items > 0
                        and (prev is None or new.items >= prev.items * 0.5)
                        and the parser raised nothing

0.5 because a Starlink group legitimately halves after a decay wave and CelesTrak's `active`
varies ±10 %; a stricter guard refuses true data, and a guard whose first act is a false alarm
is a guard somebody switches off.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCHEMA = 1
INDEX_KEY = "index.json"
INDEX_CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
SNAPSHOT_MIN_MAX_AGE_S = 60
NEVER_WORSE_RATIO = 0.5

STATUSES = ("ok", "not-modified", "refused", "error", "skipped", "not-due")


# --- time -------------------------------------------------------------------------------------


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def iso(dt: datetime) -> str:
    """`2026-09-08T01:30:00Z` -- seconds, UTC, a trailing Z. The one shape every stamp has."""
    return dt.astimezone(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso(value: str) -> datetime:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def valid_until(fetched_at: datetime, refresh_seconds: int) -> datetime:
    """`fetched_at + row.refresh`. Due again when now >= this."""
    return fetched_at + timedelta(seconds=refresh_seconds)


def snapshot_cache_control(until: datetime, now: datetime) -> str:
    secs = int((until - now).total_seconds())
    return f"public, max-age={max(SNAPSHOT_MIN_MAX_AGE_S, secs)}"


# --- the guard ---------------------------------------------------------------------------------


def accept(items: int, previous_items: int | None) -> tuple[bool, str | None]:
    """The never-worse guard. Returns (accepted, reason-if-not)."""
    if items <= 0:
        return False, "parsed to zero items; the previous snapshot stays"
    if previous_items is not None and previous_items > 0 and items < previous_items * NEVER_WORSE_RATIO:
        return (
            False,
            f"parsed to {items} items, under half of the previous {previous_items}; "
            f"the previous snapshot stays",
        )
    return True, None


# --- the manifest ------------------------------------------------------------------------------


@dataclass
class Entry:
    fetched_at: str | None = None
    valid_until: str | None = None
    items: int = 0
    bytes: int = 0
    duration_ms: int = 0
    status: str = "skipped"
    last_error: str | None = None
    etag: str | None = None

    def to_json(self) -> dict:
        d = asdict(self)
        d["items"] = int(d["items"] or 0)
        d["bytes"] = int(d["bytes"] or 0)
        d["duration_ms"] = int(d["duration_ms"] or 0)
        return d

    @classmethod
    def from_json(cls, d: dict | None) -> "Entry":
        if not isinstance(d, dict):
            return cls()
        return cls(
            fetched_at=d.get("fetched_at") or None,
            valid_until=d.get("valid_until") or None,
            items=int(d.get("items") or 0),
            bytes=int(d.get("bytes") or 0),
            duration_ms=int(d.get("duration_ms") or 0),
            status=d.get("status") if d.get("status") in STATUSES else "skipped",
            last_error=d.get("last_error") or None,
            etag=d.get("etag") or None,
        )

    def due(self, now: datetime) -> bool:
        if not self.valid_until:
            return True
        try:
            return now >= parse_iso(self.valid_until)
        except ValueError:
            return True

    def holds_snapshot(self) -> bool:
        """True when a snapshot file should exist for this source: it was accepted at least once."""
        return bool(self.fetched_at) and self.items > 0


@dataclass
class Manifest:
    snapshots: dict[str, Entry] = field(default_factory=dict)
    generated_at: str | None = None
    run: dict = field(default_factory=dict)

    @classmethod
    def from_json(cls, text: str | bytes | None) -> "Manifest":
        if not text:
            return cls()
        try:
            doc = json.loads(text)
        except ValueError:
            return cls()
        if not isinstance(doc, dict) or doc.get("schema") != SCHEMA:
            return cls()
        snaps = doc.get("snapshots") or {}
        return cls(
            snapshots={k: Entry.from_json(v) for k, v in snaps.items() if isinstance(k, str)},
            generated_at=doc.get("generated_at"),
            run=doc.get("run") or {},
        )

    def to_json(self, *, generated_at: datetime, started_at: datetime, duration_ms: int, runner: str) -> dict:
        return {
            "schema": SCHEMA,
            "generated_at": iso(generated_at),
            "run": {"started_at": iso(started_at), "duration_ms": int(duration_ms), "runner": runner},
            "snapshots": {k: v.to_json() for k, v in self.snapshots.items()},
        }


# --- the store ---------------------------------------------------------------------------------


class Store:
    """Where the files go. Two implementations: a directory, and S3 (in lambda_handler.py)."""

    def read(self, key: str) -> bytes | None:  # pragma: no cover - interface
        raise NotImplementedError

    def write(self, key: str, data: bytes, *, content_type: str, cache_control: str) -> None:  # pragma: no cover
        raise NotImplementedError


class DirStore(Store):
    """`--dest DIR`: the same keys as the bucket, as files. Headers are not representable and are
    not pretended; tests assert them through a recording store instead."""

    def __init__(self, root: Path | str) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def read(self, key: str) -> bytes | None:
        p = self.root / key
        return p.read_bytes() if p.exists() else None

    def write(self, key: str, data: bytes, *, content_type: str, cache_control: str) -> None:
        p = self.root / key
        p.parent.mkdir(parents=True, exist_ok=True)
        tmp = p.with_suffix(p.suffix + ".tmp")
        tmp.write_bytes(data)
        tmp.replace(p)


# --- the files -----------------------------------------------------------------------------------


def snapshot_key(source_id: str) -> str:
    return f"{source_id}.json"


def encode(doc) -> bytes:
    """Compact JSON, UTF-8, no ASCII escaping: the bytes the browser downloads."""
    return json.dumps(doc, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def snapshot_doc(*, source_id: str, fetched_at: datetime, until: datetime, upstream_url: str,
                 content_type: str, items: int, body) -> dict:
    return {
        "schema": SCHEMA,
        "source": source_id,
        "fetched_at": iso(fetched_at),
        "valid_until": iso(until),
        "upstream_url": upstream_url,
        "content_type": content_type,
        "items": int(items),
        "body": body,
    }


def write_snapshot(store: Store, doc: dict, *, now: datetime) -> int:
    """Write one snapshot; returns the bytes written."""
    data = encode(doc)
    store.write(
        snapshot_key(doc["source"]),
        data,
        content_type="application/json",
        cache_control=snapshot_cache_control(parse_iso(doc["valid_until"]), now),
    )
    return len(data)


def read_snapshot(store: Store, source_id: str) -> dict | None:
    raw = store.read(snapshot_key(source_id))
    if raw is None:
        return None
    try:
        doc = json.loads(raw)
    except ValueError:
        return None
    return doc if isinstance(doc, dict) and doc.get("schema") == SCHEMA else None


def write_index(store: Store, manifest: Manifest, *, generated_at: datetime, started_at: datetime,
                duration_ms: int, runner: str) -> bytes:
    data = encode(manifest.to_json(generated_at=generated_at, started_at=started_at,
                                   duration_ms=duration_ms, runner=runner))
    store.write(INDEX_KEY, data, content_type="application/json", cache_control=INDEX_CACHE_CONTROL)
    return data


def read_index(store: Store) -> Manifest:
    return Manifest.from_json(store.read(INDEX_KEY))
