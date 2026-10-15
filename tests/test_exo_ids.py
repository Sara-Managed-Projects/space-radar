#!/usr/bin/env python3
"""scripts/_exo_ids.py's rows_for_host: which rows of the Exoplanet Archive table belong to a
star. It compares the table's hostname, stripped of spaces, with the host name asked for, and
skips rows that have no host.

Covers: a match ignores the spaces around the table's value, rows with no host are skipped
without an error, a row comes back exactly as it was read, and no match or no rows gives [].

Run: python3 tests/test_exo_ids.py
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from _exo_ids import rows_for_host  # noqa: E402


class RowsForHostTest(unittest.TestCase):
    def test_matches_by_host_and_skips_rows_with_no_host(self):
        rows = [
            {"hostname": "TRAPPIST-1", "x": 1},
            {"hostname": " 51 Peg ", "x": 2},
            {"hostname": "TRAPPIST-1", "x": 3},
            {"x": 4},
            {"hostname": None},
        ]
        self.assertEqual(
            rows_for_host(rows, "TRAPPIST-1"),
            [{"hostname": "TRAPPIST-1", "x": 1}, {"hostname": "TRAPPIST-1", "x": 3}],
        )

    def test_returns_a_matching_row_as_it_was_read(self):
        rows = [{"hostname": " 51 Peg ", "x": 2}]
        self.assertEqual(rows_for_host(rows, "51 Peg"), [{"hostname": " 51 Peg ", "x": 2}])

    def test_no_match_gives_an_empty_list(self):
        self.assertEqual(rows_for_host([{"hostname": "TRAPPIST-1"}], "zzz"), [])

    def test_no_rows_gives_an_empty_list(self):
        self.assertEqual(rows_for_host([], "a"), [])


if __name__ == "__main__":
    unittest.main()
