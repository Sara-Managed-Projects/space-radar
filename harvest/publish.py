"""What a run publishes besides the verbatim snapshots: the keep-last-good rule, the cuts and the column twins.

This is the half of the old `scripts/refresh-snapshots.sh` that was a heredoc of Python. It lives here so the
Lambda and a laptop run ONE code path: `run.run(..., finish=publish.finish)` calls `finish` after the last
source and before `index.json` is written, on the same Store the sources were written to (a directory or the
bucket). Nothing here fetches.

    1. NOT OURS TO COPY. A row with `enabled: false` is published as `skipped` with no stamps: the app says
       "could not look" about it by name and holds none of the publisher's data (internal #370, ESA NEOCC).
    2. KEEP THE LAST GOOD COPY. A source whose refresh failed this run (error or refused) while the store
       still holds an accepted copy of it is published as that copy -- `status: ok`, its OLD stamps, and
       `kept_after` saying what went wrong -- so the browser draws the data with its true age and asks the
       publisher behind it. The snapshot FILE is never touched by a failure (run.py writes a file only after
       the never-worse guard accepts it), so nothing here has to protect it; this only keeps the manifest from
       calling a good file bad. The next run still finds the source due (its valid_until is in the past) and
       tries again on its own cadence. CelesTrak answered a laptop AND a GitHub runner with 403 on 2026-09-28
       and the publish emptied the saved satellites until the rows were put back by hand: that is the rule.
    3. THE CUT. `jpl-sbdb-neo` is published trimmed to the rows whose designation is in `jpl-cad` of the same
       publish (the app joins no other row, parseNeoApproaches): the whole table is 5.1 MB of 42 507 asteroids.
       A cut table says so in its manifest row (`note`, the sentence the file carries), and a cut table is fetched
       whole again whenever `jpl-cad` is due (`force_due`), so each new list is cut from the whole.
    4. THE DERIVED FILES, beside their parents, copying the parent's stamps: `celestrak-notable` (the
       satellites site/js/data/layers.js NOTABLE names, mirrored in harvest/notable.json), `celestrak-geo`
       (the geostationary ring by the browser's own thresholds) and `celestrak-starlink-recent` (Starlink's
       twelve latest launches, which is where a train can be). Rebuilt only when the parent's stamps changed.
    5. THE COLUMN TWINS (internal #523, harvest/columnar.py): `<id>.cols.json` beside a big catalogue, named in
       the manifest row as `columns`. After the cuts, so a cut that is big enough gets one, and last, so the
       twin is of the file exactly as it is published.

"Changed" always means: this run's (fetched_at, valid_until) differ from the previous manifest's row. The
previous row is the memo of what was decided last time (a twin, or none), so a run in which nothing is due
reads no big file at all.
"""

from __future__ import annotations

import json
import re
from dataclasses import replace
from datetime import datetime, timedelta
from pathlib import Path

from . import columnar
from . import snapshot as snap

NEO_ID = "jpl-sbdb-neo"
CAD_ID = "jpl-cad"
USABLE = ("ok", "not-modified", "not-due")
OFF_NOTE = "switched off in registry/sources.yaml (enabled: false): not fetched and not published"
NOTABLE_PATH = Path(__file__).resolve().parent / "notable.json"


# --- the pieces, each pure -------------------------------------------------------------------------


def sbdb_keys(full_name) -> list[str]:
    """site/js/data/parsers.js sbdbKeys(), exactly: the number, the designation in brackets, or the name."""
    fn = str(full_name or "").strip()
    out = []
    m = re.match(r"^(\d+)\s", fn)
    if m:
        out.append(m.group(1))
    p, q = fn.rfind("("), fn.rfind(")")
    if p >= 0 and q > p:
        out.append(fn[p + 1:q].strip())
    return out or [fn]


def _rows_of(doc: dict):
    """(body, was_text): a snapshot's body as parsed JSON, and whether it was stored as JSON text."""
    b = doc.get("body")
    return (json.loads(b), True) if isinstance(b, str) else (b, False)


def cut_neo_body(neo_body: dict, cad_body: dict) -> tuple[dict, int, int]:
    """The SBDB table trimmed to the designations in the close-approach list: (body, rows before, wanted)."""
    want = {str(r[cad_body["fields"].index("des")]).strip() for r in cad_body.get("data") or []}
    i = neo_body["fields"].index("full_name")
    before = len(neo_body.get("data") or [])
    out = dict(neo_body)
    out["data"] = [r for r in neo_body.get("data") or [] if set(sbdb_keys(r[i])) & want]
    if "count" in out:
        out["count"] = len(out["data"])
    return out, before, len(want)


def geo_ring(r: dict) -> bool:
    """The thresholds site/js/data/parsers.js GEO_RING applies to the same rows."""
    try:
        n = float(r.get("MEAN_MOTION"))
        e = float(r.get("ECCENTRICITY"))
        i = float(r.get("INCLINATION"))
    except (TypeError, ValueError):
        return False
    return 0.99 <= n <= 1.01 and e < 0.02 and i < 15


def _launch(r: dict):
    m = re.match(r"^(\d{4})-(\d{3})", str(r.get("OBJECT_ID", "")))
    return (int(m.group(1)), int(m.group(2))) if m else None


def recent_starlink(rows: list, launches: int = 12) -> list:
    sl = [r for r in rows if str(r.get("OBJECT_NAME", "")).upper().startswith("STARLINK") and _launch(r)]
    latest = set(sorted({_launch(r) for r in sl}, reverse=True)[:launches])
    return [r for r in sl if _launch(r) in latest]


def notable_ids(path: Path = NOTABLE_PATH) -> set[int]:
    return {int(x) for x in json.loads(path.read_text(encoding="utf-8")).get("norad_ids", [])}


def derived(notable: set[int]):
    """(parent, child, keep(rows), what) for every file cut from a bigger one."""
    return (
        ("celestrak-active", "celestrak-notable",
         lambda rows: [r for r in rows if int(r.get("NORAD_CAT_ID", -1)) in notable],
         "the satellites site/js/data/layers.js NOTABLE names"),
        ("celestrak-active", "celestrak-geo", lambda rows: [r for r in rows if geo_ring(r)],
         "the geostationary ring, by the browser's own thresholds"),
        ("celestrak-supplemental-starlink", "celestrak-starlink-recent", recent_starlink,
         "Starlink's twelve latest launches, which is where a train can be"),
    )


def _usable(e: snap.Entry | None) -> bool:
    return e is not None and e.status in USABLE and e.holds_snapshot()


def _same_stamps(a: snap.Entry | None, b: snap.Entry | None) -> bool:
    return a is not None and b is not None and (a.fetched_at, a.valid_until) == (b.fetched_at, b.valid_until)


# --- before the run ----------------------------------------------------------------------------------


def force_due(previous: snap.Manifest, now: datetime, slack_s: int = 0) -> set[str]:
    """Sources that must be fetched this run although their own cadence says not yet.

    A published `jpl-sbdb-neo` is a cut of the table; when the close-approach list it was cut by is due again,
    the table must be fetched whole to be cut by the new list.
    """
    neo, cad = previous.snapshots.get(NEO_ID), previous.snapshots.get(CAD_ID)
    if neo is None or not neo.holds_snapshot() or not neo.note:
        return set()
    if cad is None or cad.due(now + timedelta(seconds=slack_s)):
        return {NEO_ID}
    return set()


# --- after the last source, before the index ------------------------------------------------------------


def finish(store: snap.Store, manifest: snap.Manifest, previous: snap.Manifest, sources, now: datetime,
           log=print, notable: set[int] | None = None) -> None:
    """Apply rules 1 to 5 above to `manifest` (this run's rows) and write the files they make to `store`."""
    notable = notable_ids() if notable is None else notable

    # 1. not ours to copy
    for s in sources:
        if not s.enabled:
            manifest.snapshots[s.id] = snap.Entry(status="skipped", last_error=OFF_NOTE)

    # 2. keep the last good copy
    for sid, e in manifest.snapshots.items():
        if e.status in ("error", "refused") and e.holds_snapshot():
            e.kept_after = f"{e.status}: {e.last_error or ''}"[:200]
            e.status = "ok"
            log(f"    {sid}: this refresh failed; publishing the last good copy from {e.fetched_at} ({e.items} rows)")

    # 3. the cut
    _cut_neo(store, manifest, now, log)

    # 4. the derived files
    for parent, child, keep, what in derived(notable):
        _derive(store, manifest, previous, parent, child, keep, what, now, log)

    # 5. the column twins, last
    for sid, e in list(manifest.snapshots.items()):
        _twin(store, sid, e, previous.snapshots.get(sid), now, log)


def _cut_neo(store, manifest, now, log) -> None:
    neo, cad = manifest.snapshots.get(NEO_ID), manifest.snapshots.get(CAD_ID)
    if not _usable(neo) or not _usable(cad) or neo.note:       # nothing to cut by, or already cut
        return
    neo_doc, cad_doc = snap.read_snapshot(store, NEO_ID), snap.read_snapshot(store, CAD_ID)
    if neo_doc is None or cad_doc is None:
        return
    nb, was_str = _rows_of(neo_doc)
    cb, _ = _rows_of(cad_doc)
    cut, before, wanted = cut_neo_body(nb, cb)
    if not cut["data"]:
        log(f"    {NEO_ID}: no row of the {before} is in the close-approach list; published whole")
        return
    neo_doc["body"] = json.dumps(cut) if was_str else cut
    neo_doc["items"] = len(cut["data"])
    neo_doc["note"] = (f"trimmed from {before} rows to the {len(cut['data'])} whose designation is in "
                       f"jpl-cad.json of the same publish; the app joins no other row (parseNeoApproaches)")
    neo.bytes = snap.write_snapshot(store, neo_doc, now=now)
    neo.items = len(cut["data"])
    neo.note = neo_doc["note"]
    log(f"    {NEO_ID}: {before} rows -> {len(cut['data'])} published ({wanted} close approaches)")


def _derive(store, manifest, previous, parent_id, child_id, keep, what, now, log) -> None:
    parent = manifest.snapshots.get(parent_id)
    if not _usable(parent):
        return
    prev_child = previous.snapshots.get(child_id)
    if prev_child is not None and prev_child.holds_snapshot() and _same_stamps(prev_child, parent):
        # Nothing changed in the parent since the child was cut: mirror its state, read nothing.
        manifest.snapshots[child_id] = replace(prev_child, status=parent.status, last_error=parent.last_error,
                                               kept_after=parent.kept_after, columns=None, note=prev_child.note)
        return
    doc = snap.read_snapshot(store, parent_id)
    if doc is None:
        return
    rows, was_str = _rows_of(doc)
    if not isinstance(rows, list):
        return
    kept = keep(rows)
    out = dict(doc)
    out.setdefault("fetched_at", parent.fetched_at)
    out.setdefault("valid_until", parent.valid_until)
    out["source"] = child_id
    out["body"] = json.dumps(kept) if was_str else kept
    out["items"] = len(kept)
    out["note"] = f"{what}: {len(kept)} of the {len(rows)} rows of {parent_id}.json of the same publish"
    size = snap.write_snapshot(store, out, now=now)
    manifest.snapshots[child_id] = replace(parent, items=len(kept), bytes=size, etag=None, duration_ms=0, columns=None, note=out["note"])
    log(f"    {child_id}: {len(kept)} of {len(rows)} rows ({size} B)")


def _twin(store, sid: str, e: snap.Entry, prev: snap.Entry | None, now, log) -> None:
    e.columns = None
    if not _usable(e) or e.items < columnar.MIN_ROWS:
        return
    if _same_stamps(prev, e):
        e.columns = prev.columns        # decided last time, for these very stamps (a twin, or none)
        return
    doc = snap.read_snapshot(store, sid)
    made = columnar.twin_bytes(doc) if doc is not None else None
    if made is None:
        return
    data, rows = made
    path = sid + ".cols.json"
    store.write(path, data, content_type="application/json",
                cache_control=snap.snapshot_cache_control(snap.parse_iso(doc.get("valid_until") or e.valid_until), now))
    e.columns = {"path": path, "bytes": len(data), "rows": rows, "fetched_at": e.fetched_at, "valid_until": e.valid_until}
    log(f"    {sid}: {rows} rows also as columns, {e.bytes} B -> {len(data)} B")


def finish_only(store: snap.Store, sources, *, now: datetime | None = None, runner: str = "local", log=print) -> dict:
    """Apply `finish` to the manifest the store already holds, fetching nothing, and write the index.

    For files that arrived some other way (a GitHub runner's harvest merged into a working copy, a copy edited
    by hand): the rules and the twins are made for what is there. Returns the index document.
    """
    import copy
    started = now or snap.utcnow()
    previous = snap.read_index(store)
    manifest = snap.Manifest(snapshots={k: copy.deepcopy(v) for k, v in previous.snapshots.items()})
    # `previous` for finish is NOTHING: its memo ("these stamps were decided last time") is for a run that knows
    # what the last run decided, and here the files may have come from anywhere. Every cut and twin is made again.
    finish(store, manifest, snap.Manifest(), sources, started, log)
    # The run record is the harvest's, when there was one: this only completes its files.
    ran = previous.run or {}
    began = snap.parse_iso(ran["started_at"]) if ran.get("started_at") else started
    took = int(ran.get("duration_ms") or 0)
    runner = ran.get("runner") or runner
    snap.write_index(store, manifest, generated_at=started, started_at=began, duration_ms=took, runner=runner)
    return manifest.to_json(generated_at=started, started_at=began, duration_ms=took, runner=runner)
