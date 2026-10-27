#!/usr/bin/env python3
"""The column encoder now lives in harvest/columnar.py, so the Lambda carries it (a zip holds harvest/ only).

    python3 scripts/columnar.py --sizes FILE.json   # what a snapshot weighs verbatim and as columns

This file is the old command line and the import tests/test_columnar.mjs uses (`import columnar` with scripts/
on the path): importing it hands back harvest.columnar itself, so setting `columnar.MIN_ROWS` there works as it did.
The harvester writes the twins itself: harvest/publish.py.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import harvest.columnar as _columnar  # noqa: E402

if __name__ == "__main__":
    sys.exit(_columnar.main())
sys.modules[__name__] = _columnar
