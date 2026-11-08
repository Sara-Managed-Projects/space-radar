#!/usr/bin/env python3
"""scripts/build-stars3d-tiles.py's pure parts (forge #140, release 2.0.0 batch f10-stars3d), with no download.

  1. A Tycho-2 number packs into the u32 the page reads back (scene/stars3dtree.js refName), and what Tycho-2 could not
     have written is refused.
  2. Tycho's VT and BT-VT become Johnson V and B-V by ESA 1997's relations; no colour leaves VT as it is.
  3. The octree: a node keeps at most CAPACITY stars, the brightest (absolute) of its cube; every star of a child is fainter
     than every star of its parent and inside the child's cube; every star is in exactly one node.
  4. A node's quantised rows are inside their types and decode, through harvest/tilepack.py, to within half a quantum.
  5. The committed set passes the script's own --check.

Run: python3 tests/test_stars3d_tiles.py
"""

from __future__ import annotations

import importlib.util
import subprocess
import sys
import unittest
from pathlib import Path

try:
    import numpy as np
except ImportError:  # the octree's tests skip without NumPy; the format's and the committed set's run
    np = None

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from harvest import tilepack  # noqa: E402

spec = importlib.util.spec_from_file_location("build_stars3d_tiles", ROOT / "scripts/build-stars3d-tiles.py")
B = importlib.util.module_from_spec(spec)
spec.loader.exec_module(B)


def cloud(n: int, seed: int = 7) -> dict:
    rng = np.random.default_rng(seed)
    return {
        "ref": np.arange(1, n + 1, dtype=np.uint32),
        "x": rng.normal(0, 800, n), "y": rng.normal(0, 800, n), "z": rng.normal(0, 200, n),
        "absmag": rng.uniform(-8, 14, n), "bv": np.where(rng.random(n) < 0.1, np.nan, rng.uniform(-0.3, 1.9, n)),
        "src": np.zeros(n, dtype=np.uint8),
    }


class Stars3dTiles(unittest.TestCase):
    def test_tycho_numbers(self):
        r = B.tyc_ref("4669-731-1")
        self.assertEqual(r, 0x80000000 | 4669 << 17 | 731 << 3 | 1)
        self.assertEqual(((r >> 17) & 0x3FFF, (r >> 3) & 0x3FFF, r & 7), (4669, 731, 1))
        for bad in ("", "1-2", "a-b-c", "0-1-1", "1-1-9", "20000-1-1"):
            self.assertIsNone(B.tyc_ref(bad), bad)

    def test_tycho_to_johnson(self):
        v, bv = B.tycho_to_johnson(9.0, 1.0)
        self.assertAlmostEqual(v, 8.91)
        self.assertAlmostEqual(bv, 0.85)
        self.assertEqual(B.tycho_to_johnson(9.0, None), (9.0, None))

    @unittest.skipIf(np is None, "NumPy is not installed")
    def test_octree(self):
        old = B.CAPACITY
        B.CAPACITY = 500
        try:
            cols = cloud(6000)
            nodes = B.build_octree(cols)
        finally:
            B.CAPACITY = old
        held = np.concatenate([n["idx"] for n in nodes])
        self.assertEqual(len(held), 6000)
        self.assertEqual(len(set(held.tolist())), 6000, "a star in two nodes")
        by_key = {n["key"]: n for n in nodes}
        for n in nodes:
            self.assertLessEqual(len(n["idx"]), 500)
            am = cols["absmag"][n["idx"]]
            self.assertTrue(np.all(np.diff(am) >= 0), "brightest first inside a node")
            for k, axis in enumerate("xyz"):
                self.assertTrue(np.all(np.abs(cols[axis][n["idx"]] - n["c"][k]) <= n["h"] + 1e-9), "a star outside its cube")
            if len(n["key"]) > 1:
                parent = by_key[n["key"][:-1]]
                self.assertGreaterEqual(am.min(), cols["absmag"][parent["idx"]].max(), "a child brighter than its parent")
        self.assertGreater(len(nodes), 8)

    @unittest.skipIf(np is None, "NumPy is not installed")
    def test_quantise(self):
        cols = cloud(300)
        node = {"key": "r", "level": 0, "c": (0.0, 0.0, 0.0), "h": B.ROOT_HALF_LY, "idx": np.arange(300)}
        rows, info = B.quantise_node(cols, node)
        self.assertEqual(info["clamped"], 0)
        data = tilepack.encode_tile(B.SCHEMA, rows, 0, 1)
        got = tilepack.decode_tile(B.SCHEMA, data)
        self.assertEqual(len(data), 16 + 300 * 4 + 3 * 300 * 2 + 3 * 300)
        quantum = 2 * B.ROOT_HALF_LY / 65535
        x = -B.ROOT_HALF_LY + np.array(got["cols"]["x"]) * quantum
        self.assertTrue(np.all(np.abs(x - cols["x"]) <= quantum / 2 + 1e-9))
        am = B.ABS0 + np.array(got["cols"]["absmag"]) * B.ABS_STEP
        self.assertTrue(np.all(np.abs(am - cols["absmag"]) <= B.ABS_STEP / 2 + 1e-9))
        bv = np.array(got["cols"]["bv"])
        self.assertTrue(np.all((bv == 255) == np.isnan(cols["bv"])))

    def test_committed_set(self):
        r = subprocess.run([sys.executable, str(ROOT / "scripts/build-stars3d-tiles.py"), "--check"], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_help(self):
        r = subprocess.run([sys.executable, str(ROOT / "scripts/build-stars3d-tiles.py"), "--help"], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0)
        self.assertIn("AT-HYG", r.stdout)


if __name__ == "__main__":
    unittest.main()
