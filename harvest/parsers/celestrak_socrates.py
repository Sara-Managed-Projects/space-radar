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

DOCKED AND CO-ORBITING PAIRS ARE NOT CLOSE CALLS. CelesTrak screens every catalogued object, so a crew ship docked to a
station (ISS and Soyuz MS-29 on 2026-11-25: 6 m apart, 0.000 km/s, probability 1.0, once an orbit for the whole week),
two modules of one station, or a pair flying in formation (COSMOS 2581 and 2582, 0.005 km/s, on 2026-11-24) is listed
as a "conjunction" at the top of the ranking. On 2026-11-25 every one of the first 100 rows was that one docked pair,
so the view showed it 20 times. `real` keeps a pass only when the two meet at MIN_SPEED_KMS or faster, are not two
parts of one named object (`ISS (ZARYA)` and `ISS (NAUKA)`: the same name before the bracket) and are a pair not
already kept (the first, highest-probability pass of a pair stands for it). `pack` keeps the first KEEP of those.
"""

from __future__ import annotations

import csv
import io

COLUMNS = ["NORAD_CAT_ID_1", "OBJECT_NAME_1", "DSE_1", "NORAD_CAT_ID_2", "OBJECT_NAME_2", "DSE_2",
           "TCA", "TCA_RANGE", "TCA_RELATIVE_SPEED", "MAX_PROB", "DILUTION"]
RANGE_BYTES = 400_000
KEEP = 100
MIN_SPEED_KMS = 0.1          # a real crossing in low orbit is km/s; docked and formation pairs are 0.000 to 0.01


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


def _name(raw: str) -> str:
    """The name without CelesTrak's working flag: 'ISS (ZARYA) [+]' -> 'ISS (ZARYA)'."""
    raw = raw.strip()
    if raw.endswith("]") and "[" in raw:
        raw = raw[: raw.rfind("[")]
    return raw.strip().upper()


def _family(name: str) -> str | None:
    """'ISS (ZARYA)' -> 'ISS'; a name with no bracketed part has no family (two STARLINK-n are two satellites)."""
    if "(" in name and name.endswith(")"):
        base = name[: name.index("(")].strip()
        return base or None
    return None


def real(rows: list[list[str]]) -> tuple[list[list[str]], dict]:
    """The rows that are close calls, in CelesTrak's order, and how many of each kind were dropped. Pure."""
    i1, n1, i2, n2, sp = (COLUMNS.index(c) for c in ("NORAD_CAT_ID_1", "OBJECT_NAME_1", "NORAD_CAT_ID_2", "OBJECT_NAME_2",
                                                      "TCA_RELATIVE_SPEED"))
    out, seen = [], set()
    dropped = {"slow": 0, "same_object": 0, "repeat": 0}
    for r in rows:
        try:
            speed = float(r[sp])
        except (TypeError, ValueError):
            speed = float("nan")
        if not speed >= MIN_SPEED_KMS:            # also a missing or unreadable speed
            dropped["slow"] += 1
            continue
        a, b = _name(r[n1]), _name(r[n2])
        fa = _family(a)
        if fa is not None and fa == _family(b):
            dropped["same_object"] += 1
            continue
        pair = tuple(sorted((r[i1].strip(), r[i2].strip())))
        if pair in seen:
            dropped["repeat"] += 1
            continue
        seen.add(pair)
        out.append(r)
    return out, dropped


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
    """The first KEEP real close calls (the highest probabilities), as {columns, rows, read, dropped}. Numbers stay
    CelesTrak's strings; `read` is every whole row read, `dropped` what `real` left out of them and why."""
    rows = _rows(body) if isinstance(body, str) else list(body.get("rows") or [])
    kept, dropped = real(rows)
    return {"columns": COLUMNS, "rows": kept[:KEEP], "read": len(rows), "dropped": dropped,
            "sorted": "MAX_PROB, highest first (CelesTrak)"}


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
