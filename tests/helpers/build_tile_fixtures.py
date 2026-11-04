#!/usr/bin/env python3
"""Build the tile sets the JS tests read, from the checked-in fixtures, into the directory given:

    python3 tests/helpers/build_tile_fixtures.py OUT_DIR

OUT_DIR/demo/...      a small sky set (HEALPix, three levels) from made-up rows, for tests/test_tilecloud.mjs
OUT_DIR/tracked/...   the tracked set from tests/fixtures/tracked-gp-sample.json and tracked-satcat-sample.csv
OUT_DIR/expect.json   what the Python side believes, for the JS side to be held to
"""
import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))
from harvest import tilepack, tracked  # noqa: E402

NOW = datetime(2026, 11, 3, 12, 0, 0, tzinfo=timezone.utc)
out = Path(sys.argv[1])

rnd = random.Random(11)
SCHEMA = [
    {"name": "id", "type": "u32"},
    {"name": "ra", "type": "u32", "scale": 360 / 4294967296, "unit": "degrees"},
    {"name": "dec", "type": "i32", "scale": 90 / 2147483647, "unit": "degrees"},
    {"name": "mag", "type": "i16", "scale": 0.01},
]
rows = []
for i in range(600):
    rows.append({"id": 5000 + i * 3, "ra": rnd.uniform(0, 360), "dec": rnd.uniform(-89, 89), "mag": rnd.uniform(0, 14), "name": f"DEMO {i}"})
spec = {"id": "demo", "schema": SCHEMA, "id_field": "id", "name_field": "name",
        "partition": {"kind": "healpix", "nside": 2, "lon": "ra", "lat": "dec"},
        "rank": {"field": "mag", "cuts": [6.0, 10.0]}}
files = tilepack.build_set(spec, rows, NOW)
for k, v in files.items():
    p = out / "demo" / k
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(v)

# Directions for the HEALPix cross-check against sky/startiles.js ang2pix.
dirs = [{"ra": rnd.uniform(0, 360), "dec": rnd.uniform(-90, 90)} for _ in range(300)] + [{"ra": 0, "dec": 0}, {"ra": 359.999, "dec": 41.8}, {"ra": 10, "dec": 89.99}, {"ra": 10, "dec": -89.99}]
for d in dirs:
    d["pix"] = {n: tilepack.ang2pix(n, d["ra"], d["dec"]) for n in (2, 8)}

gp = json.loads((ROOT / "tests/fixtures/tracked-gp-sample.json").read_text())
sat = tracked.satcat_index((ROOT / "tests/fixtures/tracked-satcat-sample.csv").read_text())
rows = tracked.rows_from({0: gp["debris"], 1: gp["rocket"]}, sat)
tspec = dict(tracked.SPEC)
tfiles = tilepack.build_set(tspec, rows, NOW)
for k, v in tfiles.items():
    p = out / "tracked" / k
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(v)
(out / "expect.json").write_text(json.dumps({
    "dirs": dirs,
    "demoCount": 600,
    "demoNames": {str(5000 + i * 3): f"DEMO {i}" for i in range(600)},
    "trackedGp": gp,
    "trackedRows": [{k: r[k] for k in ("id", "kind", "size_rank", "alt_km", "name")} for r in rows],
}))
