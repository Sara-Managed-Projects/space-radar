#!/usr/bin/env python3
"""Freeze a finished quarter of State of Space into the repository (forge #558).

    python3 scripts/state_of_space.py --satcat FILE --freeze 2026-q3   # site/data/state-of-space/2026-q3.json
    python3 scripts/state_of_space.py --satcat FILE --history          # site/data/state-of-space/history.json
    python3 scripts/state_of_space.py --check                          # every number has a source and a date

`FILE` is CelesTrak's satellite catalogue as CSV: OUR saved copy is the one to use
(https://www.spaceradar.ai/data/v1/celestrak-satcat.json, whose `body` is the CSV, with its `fetched_at`), so making a
snapshot never asks CelesTrak. Pass `--read YYYY-MM-DD`, the day that copy was read.

THE NUMBERS ARE harvest/stateofspace.py's, the same code the hourly harvester runs for the live page, so a frozen
quarter and the live numbers are counted alike. A quarter frozen after it ended is COUNTED BACK (stateofspace.py says
how: launched by then, not down by then, catalogued by then); one frozen on its last day by the nightly job would be
`live`. Each number carries its own source and `as_of`, and tests/test_state_of_space.py refuses one that does not.
A frozen file is never rewritten: --freeze refuses a quarter that already has a file (delete it by hand to redo it, and
say why in the commit). The page /state-of-space/ (scripts/seo_ops.py) and the map's State of Space view read them.
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from harvest import stateofspace as sos  # noqa: E402

DIR = ROOT / "site" / "data" / "state-of-space"
HISTORY = DIR / "history.json"
SATCAT_URL = "https://celestrak.org/pub/satcat.csv"
FORMAT_URL = "https://celestrak.org/satcat/satcat-format.php"
SOURCE = {"id": "celestrak-satcat", "publisher": "CelesTrak", "url": SATCAT_URL, "format": FORMAT_URL}
# The numbers a snapshot holds, in the page's order: (id, where in the summary). Working counts are today's only.
NUMBERS = [
    ("earth_orbit", ("earth_orbit", "total")),
    ("payloads", ("earth_orbit", "payload")),
    ("rocket_bodies", ("earth_orbit", "rocket_body")),
    ("debris", ("earth_orbit", "debris")),
    ("starlink", ("starlink",)),
    ("owners", ("owners",)),
    ("launches_year", ("launches_year", "n")),
    ("beyond_earth", ("beyond_earth", "payloads")),
    ("came_down_30d", ("came_down_30d",)),
]


def quarter_end(q: str) -> date:
    y, n = q.lower().split("-q")
    m = int(n) * 3
    return date(int(y), m, 31 if m in (3, 12) else 30)


def dig(d, path):
    for k in path:
        d = d[k]
    return d


def snapshot(rows, q: str, read: str, frozen: str) -> dict:
    end = quarter_end(q)
    s = sos.summary(rows, end, live=False)
    how = s["counted"]
    numbers = [{"id": nid, "value": dig(s, path), "source": SOURCE["id"], "as_of": end.isoformat(), "how": how} for nid, path in NUMBERS]
    return {
        "quarter": q.lower(),
        "as_of": end.isoformat(),
        "frozen": frozen,
        "how": how,
        "source": {**SOURCE, "read": read},
        "note": (f"Counted back on {frozen} from CelesTrak's satellite catalogue read on {read}: an object counts if it was launched, "
                 f"not yet down and already catalogued on {end.isoformat()} (harvest/stateofspace.py). Launches are orbital launches "
                 "that reached orbit, one international designator each. Working flags and people in space are not counted back."),
        "numbers": numbers,
        "payload_owners": [{"owner": o, "value": n, "source": SOURCE["id"], "as_of": end.isoformat()} for o, n in s["payload_owners"]],
        "payload_owners_other": s["payload_owners_other"],
        "launch_year": s["launches_year"]["year"],
    }


def history_doc(rows, read: str, until: date, quarters: list[str]) -> dict:
    return {
        "note": (f"One point a finished quarter, counted back from CelesTrak's catalogue read on {read} (harvest/stateofspace.py "
                 "history): payloads and debris in Earth orbit at the quarter's end, orbital launches inside it. The frozen "
                 "quarters are the files named in `quarters`."),
        "source": {**SOURCE, "read": read},
        "quarters": sorted(quarters),
        "series": sos.history(rows, until),
    }


def frozen_quarters() -> list[str]:
    return sorted(p.stem for p in DIR.glob("*-q[1-4].json"))


def check() -> list[str]:
    bad = []
    files = frozen_quarters()
    if not files:
        bad.append("no frozen quarter in site/data/state-of-space/")
    for q in files:
        doc = json.loads((DIR / f"{q}.json").read_text(encoding="utf-8"))
        if doc.get("quarter") != q or doc.get("as_of") != quarter_end(q).isoformat():
            bad.append(f"{q}: quarter or as_of wrong")
        for n in doc.get("numbers", []) + doc.get("payload_owners", []):
            if not n.get("source") or not n.get("as_of") or not isinstance(n.get("value"), int):
                bad.append(f"{q}: a number without its source, date or value: {n}")
        src = doc.get("source") or {}
        if not (str(src.get("url", "")).startswith("https://") and src.get("read")):
            bad.append(f"{q}: the source has no https address or read date")
    if HISTORY.exists():
        h = json.loads(HISTORY.read_text(encoding="utf-8"))
        if sorted(h.get("quarters", [])) != files:
            bad.append("history.json does not list the frozen quarters")
        if not h.get("series") or any(not isinstance(p.get(k), int) for p in h["series"] for k in ("payloads", "debris", "total", "launches")):
            bad.append("history.json series is empty or not whole numbers")
    else:
        bad.append("no history.json")
    return bad


def main(argv: list[str]) -> int:
    if "--check" in argv:
        bad = check()
        for b in bad:
            print(f"state_of_space: {b}")
        if bad:
            return 1
        print(f"state_of_space: {len(frozen_quarters())} frozen quarter(s) and the history, every number with its source and date")
        return 0
    if "--satcat" not in argv:
        print(__doc__)
        return 2
    path = Path(argv[argv.index("--satcat") + 1])
    read = argv[argv.index("--read") + 1] if "--read" in argv else None
    if not read:
        print("state_of_space: --read YYYY-MM-DD, the day the catalogue copy was read, is required")
        return 2
    text = path.read_text(encoding="utf-8")
    if text.lstrip().startswith("{"):
        text = json.loads(text)["body"]
    rows = sos.rows_of(text)
    today = date.today().isoformat()
    DIR.mkdir(parents=True, exist_ok=True)
    if "--freeze" in argv:
        q = argv[argv.index("--freeze") + 1].lower()
        out = DIR / f"{q}.json"
        if out.exists():
            print(f"state_of_space: {out.relative_to(ROOT)} is frozen already; it is never rewritten")
            return 1
        if quarter_end(q) >= date.fromisoformat(read):
            print(f"state_of_space: {q} had not ended when the catalogue was read")
            return 1
        out.write_text(json.dumps(snapshot(rows, q, read, today), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)}")
    if "--history" in argv:
        HISTORY.write_text(json.dumps(history_doc(rows, read, date.fromisoformat(read), frozen_quarters()), ensure_ascii=False,
                                      separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"wrote {HISTORY.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(ROOT / "scripts"))
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
