"""What a script says when asked for help (public #1230).

A script that takes no required argument used to start work when it was run with --help: the flag
was simply not read, and a build wrote its files. A script calls usage_if_asked(__doc__) first thing
under `if __name__ == "__main__":`; tests/test_cli_usage.mjs runs every one that does and holds it
to exit 0, a usage line and no file changed.
"""
from __future__ import annotations

import os
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


def usage_if_asked(doc: str | None, argv: list[str] | None = None) -> None:
    """Print the usage (the script's module docstring) and exit 0 when argv has -h or --help."""
    argv = sys.argv[1:] if argv is None else argv
    if "-h" in argv or "--help" in argv:
        print(f"usage: python3 scripts/{Path(sys.argv[0]).name} [options]\n\n{(doc or '').strip()}")
        sys.exit(0)


DAY_HOURS = (7, 23)  # Asia/Jerusalem: heavy runs start only outside these hours (growth-kit bin/day-ban.sh)
DAY_BAN_USAGE = "bin/day-ban.sh && bin/cap.sh 90 <command>   (growth-kit; the desk's rule since 2026-11-07)"


def day_ban(allow_day: bool, what: str) -> int:
    """0 when a voice or listening run may start now; 3, saying why on stderr, between 07:00 and 23:00 Israel time.

    A narration chain started by day held the Mac's heavy lock all night (2026-11-07) and no reel was rendered;
    growth-kit's bin/day-ban.sh is the desk's gate, and this is the same gate inside the script, for a run started
    by hand. HEAVY_BUSY_NOW (epoch seconds) stands in for the clock, as in day-ban.sh. --allow-day passes it.
    """
    if allow_day:
        return 0
    now = datetime.fromtimestamp(float(os.environ.get("HEAVY_BUSY_NOW") or time.time()), ZoneInfo("Asia/Jerusalem"))
    if DAY_HOURS[0] <= now.hour < DAY_HOURS[1]:
        print(
            f"day ban: {what} refused at {now:%H:%M} Asia/Jerusalem; it starts after 23:00 "
            f"(--allow-day to override). Start it as: {DAY_BAN_USAGE}",
            file=sys.stderr,
        )
        return 3
    return 0
