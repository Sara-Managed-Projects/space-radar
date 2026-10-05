#!/usr/bin/env python3
"""Build site/js/data/moonshapes.js: the measured shapes of Phobos and Deimos, as radius grids.

2026-10-05. Phobos and Deimos are worlds in registry/worlds.yaml and were drawn as balls of their
mean radius. Their shapes are published, so the ball is pushed in and out to them: a radius every
5 degrees of latitude and longitude, as a share of the row's `radius_km`, one byte each. A grid and
not a mesh, because the world keeps its sphere's texture coordinates (Phobos wears a map) and its
place in scene/worlds.js; 2 664 bytes a moon, fetched by dynamic import the first time the moon is
big enough on screen to show a shape (scene/worlds.js `shapeWaiting`), never at boot.

Run (never in CI: the originals are not committed):
    python3 scripts/build-moon-shapes.py --originals DIR
DIR holds, by these names:
    phobos_ver64q.tab   https://sbnarchive.psi.edu/pds4/non_mission/gaskell.phobos.shape-model/data/phobos_ver64q.tab
                        Gaskell, R.W. (2020), Gaskell Phobos Shape Model V1.0, NASA Planetary Data
                        System: 25 350 vertices in km, body-fixed, +x toward Mars, +z north.
    m2deimos.tab        https://sbnarchive.psi.edu/pds4/non_mission/ast-sat.thomas.shape-models_V1_0/data/m2deimos.tab
                        Thomas, P.C. et al. (2021), Small Body Optical Shape Models V1.0, NASA
                        Planetary Data System, doi:10.26033/g5e0-kh52: latitude, longitude, radius
                        in km every 5 degrees. The label says "planetocentric" and not which way
                        longitude runs; it is taken as WEST, the convention of Thomas (1993), which
                        the label cites. "Uncertainties of ~400 m in much of the region longitude
                        200-355 degrees" (the label).

THE GRID. Rows: latitude -90 to +90 in 5 degree steps (37). Columns: EAST longitude 0 to 355 (72),
longitude 0 toward the planet. A byte b is a radius of (0.5 + b / 255) times `radius_km`.
"""
from __future__ import annotations

import argparse
import base64
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "js" / "data" / "moonshapes.js"
STEP = 5
ROWS, COLS = 180 // STEP + 1, 360 // STEP
RADIUS_KM = {"phobos": 11.08, "deimos": 6.2}   # registry/worlds.yaml, checked in main()


def phobos(path: Path) -> list[list[float]]:
    lines = path.read_text().split("\n")
    nv = int(lines[0].split()[0])
    acc = [[[0.0, 0.0] for _ in range(COLS)] for _ in range(ROWS)]
    for line in lines[1:nv + 1]:
        _, x, y, z = line.split()
        x, y, z = float(x), float(y), float(z)
        r = math.sqrt(x * x + y * y + z * z)
        lat = math.degrees(math.asin(z / r))
        lon = math.degrees(math.atan2(y, x)) % 360
        # Each vertex goes to the grid points around it, weighted by nearness (bilinear splat).
        fy, fx = (lat + 90) / STEP, lon / STEP
        iy, ix = min(int(fy), ROWS - 2), int(fx)
        ty, tx = fy - iy, fx - ix
        for dy, wy in ((0, 1 - ty), (1, ty)):
            for dx, wx in ((0, 1 - tx), (1, tx)):
                cell = acc[iy + dy][(ix + dx) % COLS]
                cell[0] += r * wy * wx
                cell[1] += wy * wx
    grid = [[c[0] / c[1] if c[1] > 0 else float("nan") for c in row] for row in acc]
    for iy in (0, ROWS - 1):   # a pole is one point
        vals = [v for v in grid[iy] if v == v]
        grid[iy] = [sum(vals) / len(vals)] * COLS
    # Next to a pole the grid is finer than the model (a 5 degree step of longitude at latitude 85 is
    # 80 m on Phobos): a point no vertex reached takes the mean of its neighbours that have one.
    for _ in range(8):
        holes = [(iy, ix) for iy in range(ROWS) for ix in range(COLS) if grid[iy][ix] != grid[iy][ix]]
        if not holes:
            break
        fill = {}
        for iy, ix in holes:
            near = [grid[y][x % COLS] for y, x in ((iy - 1, ix), (iy + 1, ix), (iy, ix - 1), (iy, ix + 1)) if 0 <= y < ROWS]
            near = [v for v in near if v == v]
            if near:
                fill[(iy, ix)] = sum(near) / len(near)
        for (iy, ix), v in fill.items():
            grid[iy][ix] = v
    if any(v != v for row in grid for v in row):
        raise SystemExit("phobos: a grid point no vertex reached")
    return grid


def deimos(path: Path) -> list[list[float]]:
    grid = [[float("nan")] * COLS for _ in range(ROWS)]
    for line in path.read_text().split("\n"):
        parts = line.split()
        if len(parts) != 3:
            continue
        lat, west, r = (float(p) for p in parts)
        east = (360 - west) % 360
        grid[round((lat + 90) / STEP)][round(east / STEP) % COLS] = r
    if any(v != v for row in grid for v in row):
        raise SystemExit("deimos: the table does not fill the grid")
    return grid


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--originals", required=True, type=Path)
    args = ap.parse_args(argv)
    worlds = (ROOT / "registry" / "worlds.yaml").read_text(encoding="utf-8")
    rows = []
    for key, fn, name in (("phobos", phobos, "phobos_ver64q.tab"), ("deimos", deimos, "m2deimos.tab")):
        km = RADIUS_KM[key]
        if f"- id: {key}\n" not in worlds or f"radius_km: {km}\n" not in worlds.split(f"- id: {key}\n")[1][:400]:
            raise SystemExit(f"registry/worlds.yaml no longer gives {key} a radius of {km} km")
        grid = fn(args.originals / name)
        flat = [v / km for row in grid for v in row]
        if min(flat) < 0.5 or max(flat) > 1.5:
            raise SystemExit(f"{key}: a radius outside 0.5 to 1.5 mean radii ({min(flat):.2f}, {max(flat):.2f})")
        data = bytes(max(0, min(255, round((v - 0.5) * 255))) for v in flat)
        cosw = [math.cos(math.radians(-90 + STEP * (i // COLS))) for i in range(len(flat))]
        mean = sum(v * c for v, c in zip(flat, cosw)) / sum(cosw) * km
        lo, hi = min(flat) * km, max(flat) * km
        rows.append((key, km, base64.b64encode(data).decode("ascii"), mean, lo, hi))
        print(f"{key}: radius {lo:.2f} to {hi:.2f} km, area-weighted mean {mean:.2f} km (the registry's {km})")
    body = [
        "// GENERATED by scripts/build-moon-shapes.py from the NASA Planetary Data System shape models it",
        "// names (Gaskell's Phobos, Thomas's Deimos). Do not edit: rebuild.",
        "//",
        "// A radius every 5 degrees: 37 rows from latitude -90 to +90, 72 columns of EAST longitude from 0",
        "// (toward Mars) to 355. A byte b is a radius of (0.5 + b / 255) times `radiusKm`.",
        f"export const MOON_SHAPE_STEP_DEG = {STEP};",
        "export const MOON_SHAPES = {",
    ]
    for key, km, b64, mean, lo, hi in rows:
        body.append(f"  {key}: {{ radiusKm: {km}, minKm: {lo:.2f}, maxKm: {hi:.2f}, grid: '{b64}' }},")
    body.append("};")
    OUT.write_text("\n".join(body) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
