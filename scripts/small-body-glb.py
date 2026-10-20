#!/usr/bin/env python3
"""Turn published small-body shape models (OBJ, or a PDS vertex-facet table) into one small .glb.

Release 1.3.0 stage W3-d (internal spec 0077, internal #866): Ryugu, Itokawa, and Didymos with Dimorphos.
scripts/shape-to-glb.py thins an implicitly-connected-quadrilateral grid by taking every Nth vertex; these
models come as triangle lists whose grid is gone (the DART team's and the Hayabusa2 team's, 49 152
triangles each), so this one SIMPLIFIES them instead, by quadric error (fast-simplification, a wrapper of
Sven Forstmann's Fast-Quadric-Mesh-Simplification), and writes what shape-to-glb.py writes: positions as
normalised 16-bit integers and normals as 8-bit (KHR_mesh_quantization, which three.js reads with no
decoder), smooth area-weighted normals, no material (scene/realmodels.js dresses every loaded mesh), and
THE BODY'S OWN AXES, +z its pole and +x its prime meridian, so a rotation model turns it as published.

    python3 -m venv /tmp/v && /tmp/v/bin/pip install numpy fast-simplification
    /tmp/v/bin/python scripts/small-body-glb.py OUT.glb --body NAME=PATH:TRIANGLES [--body ...] [--orbit NAME]

Each --body is one mesh node named NAME. `--orbit NAME` puts that body's node under an empty node
`NAME-orbit` at the origin, for a moon that scene/moonshape.js applySpin moves round its primary (Dimorphos):
the file holds both at the origin, so scene/realmodels.js normalise() measures and centres the primary
alone. Every triangle is kept as the source winds it (the signed volume must come out positive); the
simplified mesh's volume and extent are printed beside the source's.
"""
from __future__ import annotations

import argparse
import json
import struct
import sys
from pathlib import Path

import numpy as np


def read_mesh(path: Path):
    """An OBJ (`v x y z`, `f a b c`, 1-based) or a PDS vertex-facet table (`nv nf`, then `i x y z`, then `i a b c`)."""
    lines = [ln.split() for ln in path.read_text().splitlines() if ln.strip() and not ln.lstrip().startswith("#")]
    if lines[0][0] in ("v", "f", "o", "g", "mtllib", "s"):
        v = [[float(x) for x in ln[1:4]] for ln in lines if ln[0] == "v"]
        f = [[int(x.split("/")[0]) - 1 for x in ln[1:4]] for ln in lines if ln[0] == "f"]
    else:
        nv, nf = int(lines[0][0]), int(lines[0][1])
        v = [[float(x) for x in ln[1:4]] for ln in lines[1:1 + nv]]
        f = [[int(x) - 1 for x in ln[1:4]] for ln in lines[1 + nv:1 + nv + nf]]
    return np.asarray(v, dtype=np.float64), np.asarray(f, dtype=np.int64)


def volume(v, f):
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    return float(np.einsum("ij,ij->i", a, np.cross(b, c)).sum() / 6.0)


def tidy(v, f):
    """Drop unused vertices (the DART files list 772 that no triangle uses) and degenerate triangles."""
    f = f[(f[:, 0] != f[:, 1]) & (f[:, 1] != f[:, 2]) & (f[:, 0] != f[:, 2])]
    used = np.unique(f)
    remap = -np.ones(len(v), dtype=np.int64)
    remap[used] = np.arange(len(used))
    return v[used], remap[f]


def smooth_normals(v, f):
    n = np.zeros_like(v)
    fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])   # twice the area: area-weighted
    for k in range(3):
        np.add.at(n, f[:, k], fn)
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    return n


def body(name: str, path: Path, tris: int):
    import fast_simplification
    v, f = read_mesh(path)
    v, f = tidy(v, f)
    vol0 = volume(v, f)
    if vol0 < 0:
        raise SystemExit(f"{path.name}: the triangles wind inward (volume {vol0:.4g}); refusing to guess")
    ext0 = v.max(0) - v.min(0)
    if tris < len(f):
        v2, f2 = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int32), target_count=tris)
        v, f = tidy(np.asarray(v2, dtype=np.float64), np.asarray(f2, dtype=np.int64))
    vol1 = volume(v, f)
    ext1 = v.max(0) - v.min(0)
    print(f"{name}: {path.name}, {len(f)} triangles, {len(v)} vertices; volume {vol0:.5g} -> {vol1:.5g} "
          f"({100 * (vol1 / vol0 - 1):+.2f} %); extent {' x '.join(f'{x:.4f}' for x in ext0)} -> {' x '.join(f'{x:.4f}' for x in ext1)} (the model's units)")
    if vol1 <= 0 or abs(vol1 / vol0 - 1) > 0.03:
        raise SystemExit(f"{name}: the simplified shape lost its volume ({vol0:.4g} -> {vol1:.4g})")
    if len(v) > 65535:
        raise SystemExit(f"{name}: more than 65 535 vertices")
    return v, f, smooth_normals(v, f)


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--body", action="append", required=True, help="NAME=PATH:TRIANGLES")
    ap.add_argument("--orbit", action="append", default=[])
    args = ap.parse_args(argv)
    blobs, views, accessors, meshes, nodes, roots = [], [], [], [], [], []
    offset = 0

    def put(blob: bytes, more: dict) -> int:
        nonlocal offset
        blob += b"\0" * (-len(blob) % 4)
        views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(blob), **more})
        blobs.append(blob)
        offset += len(blob)
        return len(views) - 1

    for spec in args.body:
        name, rest = spec.split("=", 1)
        path, tris = rest.rsplit(":", 1)
        v, f, n = body(name, Path(path), int(tris))
        lo, hi = v.min(0), v.max(0)
        centre = (lo + hi) / 2
        half = float(max(hi - lo) / 2)
        q = np.clip(np.round((v - centre) / half * 32767), -32767, 32767).astype(np.int16)
        pos = np.concatenate([q, np.zeros((len(q), 1), np.int16)], axis=1).tobytes()
        nq = np.clip(np.round(n * 127), -127, 127).astype(np.int8)
        nrm = np.concatenate([nq, np.zeros((len(nq), 1), np.int8)], axis=1).tobytes()
        idx = f.astype(np.uint16).tobytes()
        iv = put(idx, {"target": 34963})
        nv = put(nrm, {"byteStride": 4, "target": 34962})
        pv = put(pos, {"byteStride": 8, "target": 34962})
        a0 = len(accessors)
        accessors += [
            {"bufferView": iv, "componentType": 5123, "count": int(f.size), "type": "SCALAR"},
            {"bufferView": nv, "componentType": 5120, "normalized": True, "count": len(v), "type": "VEC3"},
            {"bufferView": pv, "componentType": 5122, "normalized": True, "count": len(v), "type": "VEC3",
             "min": q.min(0).tolist(), "max": q.max(0).tolist()},
        ]
        meshes.append({"name": name, "primitives": [{"attributes": {"NORMAL": a0 + 1, "POSITION": a0 + 2}, "indices": a0, "mode": 4}]})
        nodes.append({"name": name, "mesh": len(meshes) - 1, "translation": centre.tolist(), "scale": [half, half, half]})
        if name in args.orbit:
            nodes.append({"name": f"{name}-orbit", "children": [len(nodes) - 1]})
        roots.append(len(nodes) - 1)
    doc = {
        "asset": {"version": "2.0", "generator": "space-radar scripts/small-body-glb.py"},
        "extensionsUsed": ["KHR_mesh_quantization"],
        "extensionsRequired": ["KHR_mesh_quantization"],
        "buffers": [{"byteLength": offset}],
        "bufferViews": views, "accessors": accessors, "meshes": meshes, "nodes": nodes,
        "scenes": [{"nodes": roots}], "scene": 0,
    }
    js = json.dumps(doc, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    binary = b"".join(blobs)
    total = 12 + 8 + len(js) + 8 + len(binary)
    args.out.write_bytes(struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(js), 0x4E4F534A) + js
                         + struct.pack("<II", len(binary), 0x004E4942) + binary)
    print(f"{args.out}: {total} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
