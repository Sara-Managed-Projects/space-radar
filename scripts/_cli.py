"""What a script says when asked for help (public #1230).

A script that takes no required argument used to start work when it was run with --help: the flag
was simply not read, and a build wrote its files. A script calls usage_if_asked(__doc__) first thing
under `if __name__ == "__main__":`; tests/test_cli_usage.mjs runs every one that does and holds it
to exit 0, a usage line and no file changed.
"""
from __future__ import annotations

import sys
from pathlib import Path


def usage_if_asked(doc: str | None, argv: list[str] | None = None) -> None:
    """Print the usage (the script's module docstring) and exit 0 when argv has -h or --help."""
    argv = sys.argv[1:] if argv is None else argv
    if "-h" in argv or "--help" in argv:
        print(f"usage: python3 scripts/{Path(sys.argv[0]).name} [options]\n\n{(doc or '').strip()}")
        sys.exit(0)
