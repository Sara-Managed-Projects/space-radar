#!/usr/bin/env python3
"""The satellite pages' fallback counts are written from the harvester's index, never typed (forge #89).

    python3 tests/test_seo_counts.py

Held here: the committed block passes scripts/seo_counts.py --check today; the writer takes the
index's two item counts and the earlier of their two days; and the check refuses the block as it
was on 2026-09-22 (typed by hand), counts that are not whole numbers, and a block 46 days old.
"""
from __future__ import annotations

import datetime as dt
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import seo_counts as S  # noqa: E402

failed = []


def ok(cond, msg):
    if not cond:
        failed.append(msg)


text = S.FACTS.read_text(encoding="utf-8")
said = S.problems(text, dt.date.today())
ok(not said, f"the committed block is refused: {said}")

index = {"snapshots": {"celestrak-active": {"items": 18001, "fetched_at": "2026-12-02T07:00:00Z"},
                       "celestrak-supplemental-starlink": {"items": 12345, "fetched_at": "2026-12-01T22:00:00Z"}}}
c = S.counts_from_index(index)
ok(c == {"active": 18001, "starlink": 12345, "as_of": "2026-12-01"}, f"the counts and the earlier day are the index's ({c})")
new = S.write(text, c)
ok("active_objects: 18001" in new and "starlink_objects: 12345" in new and "as_of: 2026-12-01" in new, "the block is rewritten")
ok(new.split("satellite_counts:")[0] == text.split("satellite_counts:")[0], "the comment above the block is kept")
ok(not S.problems(new, dt.date(2026, 12, 20)), "a block it wrote, 19 days on, passes")
old = S.problems(new, dt.date(2026, 12, 1) + dt.timedelta(days=S.MAX_AGE_DAYS + 1))
ok(any("more than 45 days" in x and "--write" in x for x in old), f"46 days on it is refused, with the command to run ({old})")
typed = new.replace(S.WRITTEN, "measured on 2026-09-22")
ok(any("typed in by hand" in x for x in S.problems(typed, dt.date(2026, 12, 2))), "a block nobody wrote with the script is refused")
ok(any("positive whole number" in x for x in S.problems(new.replace("active_objects: 18001", "active_objects: 18,001"), dt.date(2026, 12, 2))),
   "a count that is not a whole number is refused")
try:
    S.counts_from_index({"snapshots": {"celestrak-active": {"items": 0}}})
    failed.append("an index without the counts was taken")
except SystemExit as e:
    ok("celestrak-active" in str(e), "an index without the counts is refused by name")

if failed:
    print("seo counts FAILED:\n  " + "\n  ".join(failed))
    sys.exit(1)
print(f"seo counts ok: the fallback is the index's ({S.counts_from_index(index)['active']} in the sample), written by the script, refused when typed or over {S.MAX_AGE_DAYS} days old")
