#!/usr/bin/env python3
"""Turn a NASA Planetary Data System shape model into a small .glb for site/models/.

2026-10-05. For the small bodies whose shape is published as an "implicitly connected
quadrilateral" (ICQ) model -- Gaskell's and the Dawn team's: six faces of a cube, each a grid of
(Q + 1) x (Q + 1) vertices, pushed out to the body's surface. Needs nothing but Python: no Node,
no meshoptimizer. scripts/decimate-model.mjs is for CAD exports of spacecraft, whose triangles are
in no order; a grid can be thinned by taking every Nth vertex of every face, which keeps the six
faces meeting exactly and moves no vertex off the measured surface.

    python3 scripts/shape-to-glb.py IN OUT.glb [--keep 16]

IN is an ICQ file (first line Q, then 6 (Q+1)^2 lines of x y z) or the vertex half of a
vertex-facet table made from one (first line "vertices facets", then "n x y z"). `--keep` is the Q
of the output: 16 gives 6 x 16 x 16 x 2 = 3 072 triangles, under the 5 000 a rock is budgeted
(registry/models.yaml). What is written: one mesh named `body`, positions as normalised 16-bit
integers and normals as 8-bit (KHR_mesh_quantization, which three.js reads without a decoder),
vertices on the faces' shared edges welded so the smooth normals have no seams, the body's own
axes (+z its north pole). Every triangle is checked to face outward. No material: realmodels.js
dresses every loaded mesh in the project's toon material.
"""
from __future__ import annotations

import argparse
import json
import math
import struct
import sys
from pathlib import Path


def read_grid(path: Path):
    rows = [line.split() for line in path.read_text().split("\n") if line.strip()]
    head = rows[0]
    if len(head) == 1:
        q = int(head[0])
        pts = [tuple(float(v) for v in r[:3]) for r in rows[1:1 + 6 * (q + 1) ** 2]]
    else:
        nv = int(head[0])
        q = round(math.sqrt(nv / 6)) - 1
        pts = [tuple(float(v) for v in r[1:4]) for r in rows[1:1 + nv]]
    if len(pts) != 6 * (q + 1) ** 2:
        raise SystemExit(f"{path.name}: {len(pts)} vertices is not six (Q + 1) x (Q + 1) grids")
    return q, pts


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("src", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--keep", type=int, default=16)
    args = ap.parse_args(argv)
    q, pts = read_grid(args.src)
    if q % args.keep:
        raise SystemExit(f"--keep {args.keep} does not divide the model's Q of {q}")
    step = q // args.keep
    n = args.keep + 1
    verts: list[tuple[float, float, float]] = []
    seen: dict[int, int] = {}                      # source vertex -> output vertex
    tol2 = (2e-3 * max(max(abs(c) for c in p) for p in pts)) ** 2   # weld within 1 part in 500: a fiftieth of a grid step at --keep 16

    def vid(face: int, j: int, i: int) -> int:
        src = face * (q + 1) ** 2 + j * step * (q + 1) + i * step
        if src not in seen:
            p = pts[src]
            edge = j in (0, n - 1) or i in (0, n - 1)   # only a face's rim meets another face
            hit = next((k for k, o in enumerate(verts) if (o[0] - p[0]) ** 2 + (o[1] - p[1]) ** 2 + (o[2] - p[2]) ** 2 < tol2), None) if edge else None
            if hit is None:
                hit = len(verts)
                verts.append(p)
            seen[src] = hit
        return seen[src]

    tris: list[tuple[int, int, int]] = []
    for face in range(6):
        for j in range(n - 1):
            for i in range(n - 1):
                a, b, c, d = vid(face, j, i), vid(face, j, i + 1), vid(face, j + 1, i + 1), vid(face, j + 1, i)
                tris += [(a, b, c), (a, c, d)]
    tris = [t for t in tris if len(set(t)) == 3]
    cx, cy, cz = (sum(p[k] for p in verts) / len(verts) for k in range(3))
    normals = [[0.0, 0.0, 0.0] for _ in verts]
    flipped = 0
    out_tris = []
    volume = 0.0
    for a, b, c in tris:
        pa, pb, pc = verts[a], verts[b], verts[c]
        u = [pb[k] - pa[k] for k in range(3)]
        v = [pc[k] - pa[k] for k in range(3)]
        nx, ny, nz = u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]
        mx, my, mz = ((pa[k] + pb[k] + pc[k]) / 3 for k in range(3))
        if nx * (mx - cx) + ny * (my - cy) + nz * (mz - cz) < 0:
            a, b, c = a, c, b
            nx, ny, nz = -nx, -ny, -nz
            flipped += 1
        volume += (nx * pa[0] + ny * pa[1] + nz * pa[2]) / 6
        out_tris.append((a, b, c))
        for vtx in (a, b, c):   # area-weighted: the cross product's length is twice the area
            normals[vtx][0] += nx
            normals[vtx][1] += ny
            normals[vtx][2] += nz
    lo = [min(p[k] for p in verts) for k in range(3)]
    hi = [max(p[k] for p in verts) for k in range(3)]
    centre = [(lo[k] + hi[k]) / 2 for k in range(3)]
    half = max((hi[k] - lo[k]) / 2 for k in range(3))
    pos = bytearray()
    qmin, qmax = [32767] * 3, [-32767] * 3
    for p in verts:
        qs = [max(-32767, min(32767, round((p[k] - centre[k]) / half * 32767))) for k in range(3)]
        for k in range(3):
            qmin[k], qmax[k] = min(qmin[k], qs[k]), max(qmax[k], qs[k])
        pos += struct.pack("<hhhh", *qs, 0)          # padded to 8 bytes: a 4-byte stride boundary
    nrm = bytearray()
    for nv in normals:
        length = math.sqrt(sum(c * c for c in nv)) or 1.0
        nrm += struct.pack("<bbbb", *(max(-127, min(127, round(c / length * 127))) for c in nv), 0)
    idx = b"".join(struct.pack("<HHH", *t) for t in out_tris)
    if len(verts) > 65535:
        raise SystemExit("more than 65 535 vertices: lower --keep")
    idx += b"\0" * (-len(idx) % 4)
    views, offset = [], 0
    for blob, extra in ((idx, {"target": 34963}), (bytes(nrm), {"byteStride": 4, "target": 34962}), (bytes(pos), {"byteStride": 8, "target": 34962})):
        views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(blob), **extra})
        offset += len(blob)
    doc = {
        "asset": {"version": "2.0", "generator": "space-radar scripts/shape-to-glb.py"},
        "extensionsUsed": ["KHR_mesh_quantization"],
        "extensionsRequired": ["KHR_mesh_quantization"],
        "buffers": [{"byteLength": offset}],
        "bufferViews": views,
        "accessors": [
            {"bufferView": 0, "componentType": 5123, "count": len(out_tris) * 3, "type": "SCALAR"},
            {"bufferView": 1, "componentType": 5120, "normalized": True, "count": len(verts), "type": "VEC3"},
            {"bufferView": 2, "componentType": 5122, "normalized": True, "count": len(verts), "type": "VEC3", "min": qmin, "max": qmax},
        ],
        "meshes": [{"name": "body", "primitives": [{"attributes": {"NORMAL": 1, "POSITION": 2}, "indices": 0, "mode": 4}]}],
        "nodes": [{"name": "body", "mesh": 0, "translation": centre, "scale": [half, half, half]}],
        "scenes": [{"nodes": [0]}],
        "scene": 0,
    }
    js = json.dumps(doc, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    binary = idx + bytes(nrm) + bytes(pos)
    total = 12 + 8 + len(js) + 8 + len(binary)
    args.out.write_bytes(struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(js), 0x4E4F534A) + js
                         + struct.pack("<II", len(binary), 0x004E4942) + binary)
    print(f"{args.out.name}: Q {q} -> {args.keep}, {len(verts)} vertices, {len(out_tris)} triangles ({flipped} turned outward), "
          f"{total} bytes; extent {' x '.join(f'{hi[k] - lo[k]:.3f}' for k in range(3))}, volume {volume:.4g} (the model's units)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
