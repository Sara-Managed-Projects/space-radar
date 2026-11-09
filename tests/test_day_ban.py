#!/usr/bin/env python3
"""The narration scripts refuse to speak or listen by day (growth card 413d65bf, 2026-11-09). No TTS, no audio.

    python3 tests/test_day_ban.py

A --listen chain started by day held the Mac's heavy lock all night on 2026-11-07 and no reel was rendered. So
narrate.py, narrate-cards.py and narrate-moments.py refuse a render, an audition or a --listen run between 07:00
and 23:00 Asia/Jerusalem unless --allow-day, and --check / --script stay allowed at any hour. HEAVY_BUSY_NOW
stands in for the clock, as in growth-kit's bin/day-ban.sh.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from _cli import day_ban  # noqa: E402

NOON = "1762682400"  # 2025-11-09 10:00Z = 12:00 Asia/Jerusalem
NIGHT = "1762650000"  # 2025-11-09 01:00Z = 03:00 Asia/Jerusalem
EVENING = "1762714800"  # 2025-11-09 19:00Z = 21:00 Asia/Jerusalem, still the day
LATE = "1762722000"  # 2025-11-09 21:00Z = 23:00 Asia/Jerusalem, the night begins
SCRIPTS = ["narrate.py", "narrate-cards.py", "narrate-moments.py"]


def run(script: str, now: str, *args: str) -> subprocess.CompletedProcess:
    env = {**os.environ, "HEAVY_BUSY_NOW": now}
    return subprocess.run(
        [sys.executable, str(ROOT / "scripts" / script), *args, "--models", "/nonexistent"],
        cwd=ROOT, env=env, capture_output=True, text=True, timeout=60,
    )


def main() -> int:
    failures = []

    def expect(ok: bool, what: str) -> None:
        print(("ok   " if ok else "FAIL ") + what)
        if not ok:
            failures.append(what)

    for now, banned in ((NOON, True), (EVENING, True), (NIGHT, False), (LATE, False)):
        os.environ["HEAVY_BUSY_NOW"] = now
        expect(bool(day_ban(False, "test")) == banned, f"day_ban at {now}: {'refused' if banned else 'allowed'}")
        expect(day_ban(True, "test") == 0, f"day_ban --allow-day at {now}: allowed")
    os.environ.pop("HEAVY_BUSY_NOW", None)

    for script in SCRIPTS:
        modes = [()] + ([("--listen",)] if script != "narrate.py" else [("--audition", "/nonexistent")])
        for mode in modes:
            r = run(script, NOON, *mode)
            expect(r.returncode == 3 and "day ban" in r.stderr and "cap.sh 90" in r.stderr,
                   f"{script} {' '.join(mode) or '(render)'} by day: refused with the usage (rc {r.returncode})")
        r = run(script, NOON, "--script")
        expect("day ban" not in r.stderr, f"{script} --script by day: not refused (rc {r.returncode})")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
