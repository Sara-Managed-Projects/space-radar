#!/usr/bin/env python3
"""A saved catalogue as columns: the same rows, each key written once instead of once per row.

    python3 scripts/columnar.py --publish DIR      # beside each big snapshot in DIR, write <id>.cols.json
                                                   # and name it in DIR/index.json (scripts/refresh-snapshots.sh)
    python3 scripts/columnar.py --sizes FILE.json  # what the two forms weigh, and nothing written

WHY (internal #523, 2026-10-09). CelesTrak's active catalogue is an array of 16 683 objects that
each repeat the same 17 keys: 7 036 980 B to download-and-parse, 1 223 065 B on the wire (MEASURED
on the live copy). As columns the same values are one array per key. Nothing is rounded, dropped or
renamed: site/js/data/columnar.js turns it back into the rows, and tests/test_columnar.mjs holds
the decoded rows to the verbatim ones, key for key and value for value, on a cut of a real snapshot.

THE VERBATIM FILE STAYS, and stays the truth: <id>.json is published exactly as before, the
manifest names the column file as an extra (`columns: {path, bytes, rows}`), and a browser that
cannot read it, or reads something that does not add up, reads the verbatim file as it always did.

WHAT IS ENCODED: a snapshot whose body is a list of at least MIN_ROWS objects that all have the
same keys in the same order and only JSON scalars as values. Anything else is left alone (the
launches are nested; the SATCAT is CSV text), and that is said, not forced.

Not binary, on purpose: Float64 columns of the same catalogue compress WORSE than these (790 574 B
against 660 862 B at Brotli 5, measured in the performance research of 2026-10-09), because the
decimal text of a rounded number is shorter than its eight bytes.
"""

from __future__ import annotations

import json
import os
import sys

FORMAT = "columns-1"
MIN_ROWS = 1000
USABLE = ("ok", "not-modified", "not-due")


def encode(rows):
    """{"keys": [...], "cols": [[...], ...]} for a uniform list of flat objects, else None."""
    if not isinstance(rows, list) or not rows or not isinstance(rows[0], dict):
        return None
    keys = list(rows[0].keys())
    if not keys:
        return None
    cols = [[] for _ in keys]
    for row in rows:
        if not isinstance(row, dict) or list(row.keys()) != keys:
            return None
        for col, key in zip(cols, keys):
            value = row[key]
            if isinstance(value, (dict, list)):
                return None
            col.append(value)
    return {"keys": keys, "cols": cols}


def decode(columns):
    """The rows back. The browser's twin is site/js/data/columnar.js decodeColumns()."""
    keys, cols = columns["keys"], columns["cols"]
    return [dict(zip(keys, values)) for values in zip(*cols)]


def column_file(snapshot: dict):
    """The column twin of one snapshot file ({schema, source, fetched_at, ..., body}), or None."""
    body = snapshot.get("body")
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except ValueError:
            return None
    if not isinstance(body, list) or len(body) < MIN_ROWS:
        return None
    columns = encode(body)
    if columns is None or decode(columns) != body:
        return None
    out = {k: v for k, v in snapshot.items() if k != "body"}
    out["format"] = FORMAT
    out["rows"] = len(body)
    out["columns"] = columns
    return out


def publish(directory: str) -> list[tuple[str, int, int, int]]:
    """Write <id>.cols.json beside every snapshot that can be columns; name each in index.json."""
    index_path = os.path.join(directory, "index.json")
    index = json.load(open(index_path, encoding="utf-8"))
    done = []
    for sid, row in sorted(index.get("snapshots", {}).items()):
        row.pop("columns", None)
        twin = os.path.join(directory, sid + ".cols.json")
        if os.path.exists(twin):
            os.remove(twin)  # never a column file from an earlier publish beside a newer verbatim one
        path = os.path.join(directory, sid + ".json")
        if row.get("status") not in USABLE or not os.path.exists(path):
            continue
        out = column_file(json.load(open(path, encoding="utf-8")))
        if out is None:
            continue
        with open(twin, "w", encoding="utf-8") as f:
            json.dump(out, f, separators=(",", ":"))
        row["columns"] = {"path": sid + ".cols.json", "bytes": os.path.getsize(twin), "rows": out["rows"]}
        done.append((sid, out["rows"], os.path.getsize(path), os.path.getsize(twin)))
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=1)
    return done


def main() -> int:
    if len(sys.argv) == 3 and sys.argv[1] == "--publish":
        for sid, rows, before, after in publish(sys.argv[2]):
            print(f"    {sid}: {rows} rows as columns, {before} B -> {after} B ({sid}.cols.json; the verbatim file stays)")
        return 0
    if len(sys.argv) == 3 and sys.argv[1] == "--sizes":
        snapshot = json.load(open(sys.argv[2], encoding="utf-8"))
        out = column_file(snapshot)
        if out is None:
            print("columnar: this file is not a uniform list of flat rows; it stays as it is")
            return 1
        print(f"columnar: {out['rows']} rows, {os.path.getsize(sys.argv[2])} B verbatim, {len(json.dumps(out, separators=(',', ':')).encode())} B as columns")
        return 0
    print(__doc__.split("\n\n")[0] + "\n\n    python3 scripts/columnar.py --publish DIR | --sizes FILE.json", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
