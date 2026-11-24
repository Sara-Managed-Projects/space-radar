"""CelesTrak SOCRATES Plus: the week's predicted close approaches, ranked by CelesTrak's maximum probability (forge #561).

THE FILE (https://celestrak.org/SOCRATES/socrates-format.php, read 2026-11-24): an RFC 4180 CSV, one header line,
NORAD_CAT_ID_1, OBJECT_NAME_1, DSE_1, NORAD_CAT_ID_2, OBJECT_NAME_2, DSE_2, TCA, TCA_RANGE (km), TCA_RELATIVE_SPEED
(km/s), MAX_PROB, DILUTION. `sort-maxProb.csv` is the list sorted by MAX_PROB, highest first. CelesTrak screens the active
satellites against the whole catalogue three times a day for passes within 5 km over the coming week; its page says
the probability assumes the published orbits with no covariance and that a "dilution" encounter needs better data.
WE COMPUTE NOTHING: the page shows CelesTrak's own range, speed and probability, labelled as theirs.

ONLY THE TOP OF THE LIST IS READ. The whole file was 21 457 717 bytes on 2026-11-23 and the page shows a few dozen
rows, so the request asks for its first RANGE_BYTES with an HTTP Range header (CelesTrak's server answered 206 to one
on 2026-11-24) and the cut line at the end is dropped. A server that ignores the header and sends the whole file is
read the same way. `pack` keeps the first KEEP rows. No CORS header was measured on the file (2026-11-24), so a
visitor's browser never asks CelesTrak: our copy is the only route (`browser: false`).
"""

from __future__ import annotations

import csv
import io

COLUMNS = ["NORAD_CAT_ID_1", "OBJECT_NAME_1", "DSE_1", "NORAD_CAT_ID_2", "OBJECT_NAME_2", "DSE_2",
           "TCA", "TCA_RANGE", "TCA_RELATIVE_SPEED", "MAX_PROB", "DILUTION"]
RANGE_BYTES = 400_000
KEEP = 100


def _rows(text: str) -> list[list[str]]:
    if not isinstance(text, str):
        raise ValueError(f"SOCRATES is CSV text, got {type(text).__name__}")
    lines = text.splitlines()
    if not lines:
        raise ValueError("empty SOCRATES answer")
    header = [h.strip() for h in lines[0].split(",")]
    if header != COLUMNS:
        raise ValueError(f"SOCRATES header changed: {','.join(header)[:120]}")
    out = []
    for row in csv.reader(io.StringIO("\n".join(lines[1:]))):
        if len(row) == len(COLUMNS):
            out.append([c.strip() for c in row])
    return out


def validate(body) -> None:
    if isinstance(body, dict):          # a packed copy (what is saved) reads as its rows
        if body.get("columns") != COLUMNS or not isinstance(body.get("rows"), list):
            raise ValueError("a packed SOCRATES copy is {columns, rows}")
        return
    _rows(body)


def count(body) -> int:
    validate(body)
    return len(body["rows"]) if isinstance(body, dict) else len(_rows(body))


def pack(body) -> dict:
    """The first KEEP rows (the highest probabilities), as {columns, rows, read}. Numbers stay CelesTrak's strings."""
    rows = _rows(body) if isinstance(body, str) else list(body.get("rows") or [])
    return {"columns": COLUMNS, "rows": rows[:KEEP], "read": len(rows), "sorted": "MAX_PROB, highest first (CelesTrak)"}


def fetch(source, prev, *, now, fetcher) -> dict:
    """One GET of the file's first RANGE_BYTES; the cut last line is dropped. Fields of run.py's Fetched."""
    cond = {}
    if prev is not None and prev.holds_snapshot() and prev.status in ("ok", "not-modified"):
        cond = {"etag": prev.etag, "since": prev.fetched_at}
    r = fetcher(source.url, headers={"Range": f"bytes=0-{RANGE_BYTES - 1}"}, **cond)
    if r.status == 304:
        return {"status": 304, "text": "", "bytes": 0, "etag": r.etag, "not_modified": True, "body": None}
    if r.status not in (200, 206):
        return {"status": r.status, "text": (r.text or "")[:200], "bytes": len(r.body), "etag": None, "not_modified": False, "body": None}
    text = r.text
    if r.status == 206 and "\n" in text:
        text = text[: text.rfind("\n")]          # the last line was cut by the range
    # The body is the text itself: run.py would otherwise decode it as the JSON a parser's own fetch is taken to send.
    return {"status": 200, "text": text, "bytes": len(r.body), "etag": r.etag, "not_modified": False, "body": text}
