"""A saved catalogue as columns: the same rows, each key written once instead of once per row.

    python3 -m harvest.columnar --sizes FILE.json  # what the two forms weigh, and nothing written

The harvester writes the twins itself (harvest/publish.py, after every run, in the Lambda and on a laptop
alike); scripts/columnar.py is the old command line, kept as a thin wrapper over this module.

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


def twin_bytes(snapshot: dict) -> tuple[bytes, int] | None:
    """(the twin's bytes, its row count) for one snapshot file, or None when it should not have one."""
    out = column_file(snapshot)
    if out is None:
        return None
    return json.dumps(out, separators=(",", ":")).encode("utf-8"), out["rows"]


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) == 2 and argv[0] == "--sizes":
        with open(argv[1], encoding="utf-8") as f:
            snapshot = json.load(f)
        out = column_file(snapshot)
        if out is None:
            print("columnar: this file is not a uniform list of flat rows; it stays as it is")
            return 1
        print(f"columnar: {out['rows']} rows, {os.path.getsize(argv[1])} B verbatim, {len(json.dumps(out, separators=(',', ':')).encode())} B as columns")
        return 0
    print(__doc__.split("\n\n")[0] + "\n\n    python3 -m harvest.columnar --sizes FILE.json", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
