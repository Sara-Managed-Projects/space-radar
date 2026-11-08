#!/usr/bin/env python3
"""Cut AT-HYG's 2.4 million stars into the octree tiles the 3D star map streams round the camera (forge #140).

    python3 scripts/build-stars3d-tiles.py --src athyg_40.csv.gz      write site/data/stars3d-athyg/
    python3 scripts/build-stars3d-tiles.py --check                    the tiles agree with their set.json

THE SOURCE is AT-HYG v4.0, "Augmented Tycho - HYG", by David Nash (https://codeberg.org/astronexus/athyg),
the full catalogue data/athyg_40.csv.gz (199 688 001 B, sha256 69ad04dd...a6, read 2026-11-08): Tycho-2's
2.5 million stars with Gaia DR3's distances, merged with HYG. Licence CC BY-SA 4.0 (its README and LICENSE: "This
work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License"), so the tiles are
shared alike under CC BY-SA 4.0. It is not kept in this repository; download it and pass --src.

WHAT IS WRITTEN, AND WHAT IS LEFT OUT
- Every row with a HYG id is left out: scene/stars3d.js already draws HYG's 109 389 (site/data/stars3d.bin), and a
  star drawn twice is twice as bright. So is the Sun.
- A row with no distance is left out and counted. AT-HYG has already emptied the distance of every star whose Gaia
  parallax was smaller than its own error (version-info.md, v2.4): what is left has a parallax at least as large as
  its error, which is NOT the same as a good distance, and the card says so (scene/stars3dtree.js distanceNote).
- Positions are AT-HYG's x0, y0, z0 (parsecs, equatorial J2000) turned into the ecliptic J2000 axes and light-years
  of scripts/build-stars3d.py, so one star is in the same place in either file.
- Magnitudes: AT-HYG's `mag` is Tycho's VT for a Tycho-2 star (mag_src T) and its `ci` is BT-VT. Both are turned into
  Johnson V and B-V by the Hipparcos catalogue's own relations (ESA 1997, SP-1200 vol. 1 section 1.3, eq. 1.3.20):
  V = VT - 0.090 (BT - VT), B - V = 0.850 (BT - VT). The absolute magnitude is worked out again from that V and the
  written distance, so the shader's magnitude at the camera agrees with where the star is drawn.

THE OCTREE. A cube round the Sun (ROOT_HALF_LY on a side's half) cut in eight, and again, the way Potree cuts a point
cloud: a node keeps the CAPACITY stars of its cube that are brightest in ABSOLUTE magnitude and hands the rest to its
eight children. So a child holds only stars fainter than every star of its parent, and the page loads a node only when
its brightest star could be seen from the camera (scene/stars3dtree.js selectNodes): a node that cannot be seen has no
child that can. A node's tile is written with harvest/tilepack.py's encode_tile (the A1 format, forge #36), one column
a field, and read by site/js/data/tilecloud.js decodeTile.

TILE COLUMNS (13 bytes a star; tilepack's alignment rule puts the u32 first)
  ref    u32  TYC1 << 17 | TYC2 << 3 | TYC3, with bit 31 set, for a Tycho-2 star; else AT-HYG's own id
  x y z  u16  the star in its node's cube: centre - half + q * (2 half / 65535), light-years, ecliptic J2000
  absmag u8   ABS0 + q * ABS_STEP (Johnson V); a star outside the range is clamped and counted
  bv     u8   BV0 + q * BV_STEP; 255 = no colour index
  src    u8   bits 0-2 where the distance comes from (DIST_SRC), bits 3-4 where the magnitude comes from (MAG_SRC)
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

try:  # the build needs NumPy; --check and --help do not, so CI can run them without it
    import numpy as np
except ImportError:  # pragma: no cover
    np = None

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from harvest import tilepack  # noqa: E402

OUT = ROOT / "site/data/stars3d-athyg"
SET_ID = "stars3d-athyg"
LY_PER_PC = 3.2615637771674333  # scripts/build-stars3d.py
OBLIQUITY_DEG = 23.4392911
UNKNOWN_PC = 100000.0
CAPACITY = 8192
ROOT_HALF_LY = 65536.0  # +-20 kpc; a star further out is left out and counted (none in v4.0: --src prints the farthest)
MAX_DEPTH = 14
ABS0, ABS_STEP = -12.0, 0.12  # u8: -12.0 to +18.6
BV0, BV_STEP = -0.5, 0.01  # u8: -0.50 to +2.04
DIST_SRC = {"GAIA_DR3": 0, "G_R3": 0, "GAIA_DR2": 1, "G_R2": 1, "HIP": 2, "GJ": 3}  # anything else: 4
MAG_SRC = {"T": 0, "HIP": 1}  # anything else: 2
SCHEMA = [
    {"name": "ref", "type": "u32", "note": "bit 31 set: TYC1 << 17 | TYC2 << 3 | TYC3; else the AT-HYG id"},
    {"name": "x", "type": "u16", "note": "in the node's cube, 0 to 65535 across it"},
    {"name": "y", "type": "u16"},
    {"name": "z", "type": "u16"},
    {"name": "absmag", "type": "u8", "scale": ABS_STEP, "offset": ABS0},
    {"name": "bv", "type": "u8", "scale": BV_STEP, "offset": BV0, "note": "255: no colour index"},
    {"name": "src", "type": "u8", "note": "bits 0-2 distance source, bits 3-4 magnitude source"},
]
USAGE = "python3 scripts/build-stars3d-tiles.py --src athyg_40.csv.gz | --check"


def tyc_ref(tyc: str) -> int | None:
    """'4669-731-1' -> 0x80000000 | 4669 << 17 | 731 << 3 | 1; None for anything Tycho-2 could not have written."""
    parts = tyc.split("-")
    if len(parts) != 3 or not all(p.isdigit() for p in parts):
        return None
    a, b, c = (int(p) for p in parts)
    if not (1 <= a < 1 << 14 and 1 <= b < 1 << 14 and 1 <= c < 8):
        return None
    return 0x80000000 | a << 17 | b << 3 | c


def tycho_to_johnson(vt: float, bt_vt: float | None) -> tuple[float, float | None]:
    """ESA 1997 eq. 1.3.20: V = VT - 0.090 (BT-VT), B-V = 0.850 (BT-VT). No colour: VT as it is."""
    if bt_vt is None:
        return vt, None
    return vt - 0.090 * bt_vt, 0.850 * bt_vt


def read_rows(src: Path) -> dict:
    """The stars to place, as numpy columns, and what was left out and why."""
    ce, se = math.cos(math.radians(OBLIQUITY_DEG)), math.sin(math.radians(OBLIQUITY_DEG))
    ref, x, y, z, absmag, bv, flags, dly = [], [], [], [], [], [], [], []
    left = {"hyg": 0, "sun": 0, "no_distance": 0, "no_magnitude": 0, "too_far": 0}
    far = 0.0
    with gzip.open(src, "rt", encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            if row["id"] == "1" or row.get("proper") == "Sol":
                left["sun"] += 1
                continue
            if row.get("hyg"):
                left["hyg"] += 1
                continue
            d = float(row["dist"]) if row.get("dist") else 0.0
            if not (0 < d < UNKNOWN_PC):
                left["no_distance"] += 1
                continue
            if not row.get("mag"):
                left["no_magnitude"] += 1
                continue
            xe, ye0, ze0 = float(row["x0"]), float(row["y0"]), float(row["z0"])
            ye, ze = ye0 * ce + ze0 * se, -ye0 * se + ze0 * ce
            xl, yl, zl = xe * LY_PER_PC, ye * LY_PER_PC, ze * LY_PER_PC
            if max(abs(xl), abs(yl), abs(zl)) >= ROOT_HALF_LY:
                left["too_far"] += 1
                continue
            far = max(far, d * LY_PER_PC)
            ci = float(row["ci"]) if row.get("ci") else None
            mag_src = row.get("mag_src") or ""
            if mag_src == "T":
                v, b_v = tycho_to_johnson(float(row["mag"]), ci)
            else:
                v, b_v = float(row["mag"]), ci
            r = tyc_ref(row["tyc"]) if row.get("tyc") else None
            ref.append(r if r is not None else int(row["id"]))
            x.append(xl); y.append(yl); z.append(zl)
            absmag.append(v - 5 * math.log10(d / 10))
            bv.append(b_v if b_v is not None else np.nan)
            flags.append(DIST_SRC.get(row.get("dist_src") or "", 4) | MAG_SRC.get(mag_src, 2) << 3)
            dly.append(d * LY_PER_PC)
    return {
        "ref": np.array(ref, dtype=np.uint32), "x": np.array(x), "y": np.array(y), "z": np.array(z),
        "absmag": np.array(absmag), "bv": np.array(bv), "src": np.array(flags, dtype=np.uint8),
        "dly": np.array(dly), "left": left, "farthest_ly": far,
    }


def build_octree(cols: dict) -> list[dict]:
    """Nodes, root first: {key, level, c, h, idx}; idx are rows, brightest (absolute) first."""
    order = np.lexsort((cols["ref"], cols["absmag"]))  # brightest first, then by ref: the same bytes every run
    x, y, z = cols["x"], cols["y"], cols["z"]
    nodes = []
    todo = [("r", 0, (0.0, 0.0, 0.0), ROOT_HALF_LY, order)]
    while todo:
        key, level, c, h, idx = todo.pop(0)
        if len(idx) <= CAPACITY or level >= MAX_DEPTH:
            nodes.append({"key": key, "level": level, "c": c, "h": h, "idx": idx})
            continue
        nodes.append({"key": key, "level": level, "c": c, "h": h, "idx": idx[:CAPACITY]})
        rest = idx[CAPACITY:]
        octant = (x[rest] >= c[0]).astype(np.int8) | (y[rest] >= c[1]).astype(np.int8) << 1 | (z[rest] >= c[2]).astype(np.int8) << 2
        q = h / 2
        for o in range(8):
            sub = rest[octant == o]
            if not len(sub):
                continue
            cc = (c[0] + (q if o & 1 else -q), c[1] + (q if o & 2 else -q), c[2] + (q if o & 4 else -q))
            todo.append((key + str(o), level + 1, cc, q, sub))
    return nodes


def quantise_node(cols: dict, node: dict) -> tuple[list[dict], dict]:
    """The node's rows as tilepack wants them (every value already in range), and what was clamped."""
    idx, (cx, cy, cz), h = node["idx"], node["c"], node["h"]
    span = 2 * h
    qx = np.clip(np.rint((cols["x"][idx] - (cx - h)) / span * 65535), 0, 65535).astype(int)
    qy = np.clip(np.rint((cols["y"][idx] - (cy - h)) / span * 65535), 0, 65535).astype(int)
    qz = np.clip(np.rint((cols["z"][idx] - (cz - h)) / span * 65535), 0, 65535).astype(int)
    am = cols["absmag"][idx]
    clamped = int(np.sum((am < ABS0) | (am > ABS0 + 255 * ABS_STEP)))
    am = np.clip(am, ABS0, ABS0 + 255 * ABS_STEP)
    bvs = cols["bv"][idx]
    # tilepack quantises the VALUE (offset + q * scale), so the unknown colour is written as the value that stores 255
    bvv = np.where(np.isnan(bvs), BV0 + 255 * BV_STEP, np.clip(np.nan_to_num(bvs), BV0, BV0 + 254 * BV_STEP))
    rows = []
    for i in range(len(idx)):
        rows.append({"ref": int(cols["ref"][idx[i]]), "x": int(qx[i]), "y": int(qy[i]), "z": int(qz[i]),
                     "absmag": float(am[i]), "bv": float(bvv[i]), "src": int(cols["src"][idx[i]])})
    return rows, {"clamped": clamped}


def write_set(src: Path, built_at: datetime) -> int:
    if np is None:
        print("build-stars3d-tiles: the build needs NumPy (--check does not)", file=sys.stderr)
        return 2
    sha = hashlib.sha256(src.read_bytes()).hexdigest()
    cols = read_rows(src)
    n = len(cols["ref"])
    nodes = build_octree(cols)
    build = tilepack.build_stamp(built_at)
    tilepack.check_schema(SCHEMA)
    if OUT.exists():
        for p in sorted(OUT.rglob("*.bin")):
            p.unlink()
    tiles, clamped, total = [], 0, 0
    for node in nodes:
        rows, info = quantise_node(cols, node)
        clamped += info["clamped"]
        data = tilepack.encode_tile(SCHEMA, rows, node["level"], build)
        path = f"L{node['level']}/{node['key']}.bin"
        (OUT / path).parent.mkdir(parents=True, exist_ok=True)
        (OUT / path).write_bytes(data)
        total += len(data)
        am = cols["absmag"][node["idx"]]
        tiles.append({
            "key": node["key"], "level": node["level"], "path": path, "count": len(rows), "bytes": len(data),
            "c": [round(v, 3) for v in node["c"]], "h": node["h"],
            # the brightest, rounded DOWN, and the faintest, rounded up: the page never skips a node it could see
            "mMin": math.floor(float(am.min()) * 100) / 100, "mMax": math.ceil(float(am.max()) * 100) / 100,
        })
    depth = max(t["level"] for t in tiles)
    levels = [{"level": lv, "count": sum(t["count"] for t in tiles if t["level"] == lv),
               "bytes": sum(t["bytes"] for t in tiles if t["level"] == lv),
               "quantum_ly": round(2 * ROOT_HALF_LY / 2 ** lv / 65535, 5)} for lv in range(depth + 1)]
    doc = {
        "format": tilepack.FORMAT, "id": SET_ID, "title": "AT-HYG v4.0 in 3D, by octree node",
        "build": build, "built_at": built_at.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": n, "id_field": "ref",
        "left_out": cols["left"], "clamped_absmag": clamped, "farthest_ly": round(cols["farthest_ly"]),
        "schema": SCHEMA,
        "partition": {"kind": "octree", "frame": "ecliptic J2000, light-years, the Sun at 0", "root_half_ly": ROOT_HALF_LY,
                      "capacity": CAPACITY, "rule": "a node keeps the brightest (absolute V) of its cube; its children the rest"},
        "levels": levels, "tiles": tiles,
        "source": "AT-HYG v4.0, data/athyg_40.csv.gz, https://codeberg.org/astronexus/athyg (sha256 " + sha + ")",
        "licence": "CC BY-SA 4.0",
        "attribution": "AT-HYG v4.0 by David Nash (astronexus), from Tycho-2, Hipparcos (ESA 1997), Gaia DR3 (ESA/Gaia/DPAC), the Yale Bright Star and Gliese-Jahreiss catalogues",
    }
    (OUT / "set.json").write_text(json.dumps(doc, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"stars3d-athyg: {n} stars in {len(tiles)} nodes, depth {depth}, {total} B of tiles "
          f"+ {(OUT / 'set.json').stat().st_size} B set.json; left out {cols['left']}; absmag clamped {clamped}; "
          f"farthest {cols['farthest_ly']:.0f} ly")
    return 0


def check() -> int:
    """Every tile named in set.json exists, has the size, count, level and build it says, and its stars are in its cube."""
    doc = json.loads((OUT / "set.json").read_text(encoding="utf-8"))
    problems, total = [], 0
    for t in doc["tiles"]:
        p = OUT / t["path"]
        if not p.is_file():
            problems.append(f"{t['path']}: missing")
            continue
        data = p.read_bytes()
        total += len(data)
        got = tilepack.decode_tile(doc["schema"], data)
        if len(data) != t["bytes"] or got["count"] != t["count"] or got["level"] != t["level"] or got["build"] != doc["build"]:
            problems.append(f"{t['path']}: size, count, level or build differs from set.json")
            continue
        am = [ABS0 + q * ABS_STEP for q in got["cols"]["absmag"]]
        if am and (min(am) < t["mMin"] - ABS_STEP or max(am) > t["mMax"] + ABS_STEP):
            problems.append(f"{t['path']}: a magnitude outside the node's mMin..mMax")
    on_disk = {str(p.relative_to(OUT)) for p in OUT.rglob("*.bin")}
    named = {t["path"] for t in doc["tiles"]}
    if on_disk != named:
        problems.append(f"{len(on_disk - named)} tiles on disk not in set.json, {len(named - on_disk)} named and missing")
    if sum(t["count"] for t in doc["tiles"]) != doc["count"]:
        problems.append("the tiles' counts do not add up to the set's")
    for line in problems[:20]:
        print("build-stars3d-tiles --check:", line, file=sys.stderr)
    if not problems:
        print(f"stars3d-athyg ok: {doc['count']} stars, {len(doc['tiles'])} tiles, {total} B")
    return 1 if problems else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="build-stars3d-tiles.py", usage=USAGE, description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", type=Path, help="AT-HYG v4.0's athyg_40.csv.gz")
    ap.add_argument("--check", action="store_true", help="check the written tiles against set.json")
    ap.add_argument("--built-at", default=None, help="the build's time, ISO 8601 (default: now)")
    a = ap.parse_args(argv)
    if a.check:
        return check()
    if not a.src:
        ap.print_usage(sys.stderr)
        return 2
    if not a.src.is_file():
        print(f"build-stars3d-tiles: no such file: {a.src}", file=sys.stderr)
        return 2
    built = datetime.fromisoformat(a.built_at.replace("Z", "+00:00")) if a.built_at else datetime.now(timezone.utc)
    return write_set(a.src, built)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
