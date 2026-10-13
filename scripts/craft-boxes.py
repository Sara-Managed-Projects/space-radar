#!/usr/bin/env python3
"""Box-and-disc spacecraft meshes, in metres, origin at the body centre.

One file per craft below. Colours are this project's flat ones, named `own #hex`
so the app keeps them apart when it restyles a mesh onto its toon ramp.
No photograph is projected onto a triangle.

    python3 scripts/craft-boxes.py site/models
"""
from __future__ import annotations

import json
import math
import struct
import sys
from pathlib import Path


def _lin(channel: int) -> float:
    c = channel / 255
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def _factor(hex_colour: str) -> list[float]:
    h = hex_colour.removeprefix("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return [_lin(r), _lin(g), _lin(b), 1.0]


def _box(cx, cy, cz, sx, sy, sz):
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    faces = [
        ((1, 0, 0), [(hx, -hy, -hz), (hx, hy, -hz), (hx, hy, hz), (hx, -hy, hz)]),
        ((-1, 0, 0), [(-hx, -hy, -hz), (-hx, -hy, hz), (-hx, hy, hz), (-hx, hy, -hz)]),
        ((0, 1, 0), [(-hx, hy, -hz), (-hx, hy, hz), (hx, hy, hz), (hx, hy, -hz)]),
        ((0, -1, 0), [(-hx, -hy, -hz), (hx, -hy, -hz), (hx, -hy, hz), (-hx, -hy, hz)]),
        ((0, 0, 1), [(-hx, -hy, hz), (hx, -hy, hz), (hx, hy, hz), (-hx, hy, hz)]),
        ((0, 0, -1), [(-hx, -hy, -hz), (-hx, hy, -hz), (hx, hy, -hz), (hx, -hy, -hz)]),
    ]
    verts, norms, tris = [], [], []
    for normal, corners in faces:
        base = len(verts)
        for x, y, z in corners:
            verts.append((cx + x, cy + y, cz + z))
            norms.append(normal)
        tris += [(base, base + 1, base + 2), (base, base + 2, base + 3)]
    return verts, norms, tris


def _disc(cx, cy, cz, radius, thickness, segments=16):
    """A thin disc in the XY plane, centre (cx, cy, cz). Stands for a dish seen on axis."""
    h = thickness / 2
    verts, norms, tris = [], [], []

    def ring(z, normal_z):
        start = len(verts)
        verts.append((cx, cy, cz + z))
        norms.append((0, 0, normal_z))
        for i in range(segments):
            a = 2 * math.pi * i / segments
            verts.append((cx + radius * math.cos(a), cy + radius * math.sin(a), cz + z))
            norms.append((0, 0, normal_z))
        return start

    top = ring(h, 1)
    bot = ring(-h, -1)
    for i in range(segments):
        n = top + 1 + i
        m = top + 1 + (i + 1) % segments
        tris += [(top, n, m)]
        n = bot + 1 + i
        m = bot + 1 + (i + 1) % segments
        tris += [(bot, m, n)]
    for i in range(segments):
        a0 = 2 * math.pi * i / segments
        a1 = 2 * math.pi * (i + 1) / segments
        nx = math.cos((a0 + a1) / 2)
        ny = math.sin((a0 + a1) / 2)
        base = len(verts)
        for z, a in ((h, a0), (h, a1), (-h, a1), (-h, a0)):
            verts.append((cx + radius * math.cos(a), cy + radius * math.sin(a), cz + z))
            norms.append((nx, ny, 0))
        tris += [(base, base + 1, base + 2), (base, base + 2, base + 3)]
    return verts, norms, tris


def _pad(buf: bytes, n: int) -> bytes:
    return buf + b"\x00" * ((n - len(buf) % n) % n)


def write_glb(path: Path, groups: list[tuple[str, str, list]]) -> int:
    """groups: (node name, #hex, (verts, norms, tris)). Returns triangle count."""
    materials = {}
    meshes = []  # list of (name, primitives)
    by_node: dict[str, list] = {}
    tris_n = 0
    blobs = []
    accessors = []
    buffer_views = []

    def add_geom(verts, norms, tris, material):
        nonlocal tris_n
        tris_n += len(tris)
        pos = b"".join(struct.pack("<3f", *v) for v in verts)
        nrm = b"".join(struct.pack("<3f", *v) for v in norms)
        idx = b"".join(struct.pack("<3H", *t) for t in tris)
        chunks = [("pos", pos, 34962, 12), ("nrm", nrm, 34962, 12), ("idx", idx, 34963, 0)]
        attr = {}
        for key, blob, target, stride in chunks:
            blob = _pad(blob, 4)
            offset = sum(len(b) for b in blobs)
            blobs.append(blob)
            view = len(buffer_views)
            buffer_views.append(
                {"buffer": 0, "byteOffset": offset, "byteLength": len(blob), "target": target, **({"byteStride": stride} if stride else {})}
            )
            acc = len(accessors)
            if key == "idx":
                accessors.append({"bufferView": view, "componentType": 5123, "count": len(tris) * 3, "type": "SCALAR"})
                attr["indices"] = acc
            else:
                xs = [v[i] for v in (verts if key == "pos" else norms) for i in range(3)]
                # min/max on the right components
                comp = verts if key == "pos" else norms
                mn = [min(p[i] for p in comp) for i in range(3)]
                mx = [max(p[i] for p in comp) for i in range(3)]
                accessors.append(
                    {
                        "bufferView": view,
                        "componentType": 5126,
                        "count": len(comp),
                        "type": "VEC3",
                        "min": mn,
                        "max": mx,
                    }
                )
                attr["POSITION" if key == "pos" else "NORMAL"] = acc
        return {"attributes": {"POSITION": attr["POSITION"], "NORMAL": attr["NORMAL"]}, "indices": attr["indices"], "material": material}

    for name, colour, geom in groups:
        if colour not in materials:
            materials[colour] = len(materials)
        by_node.setdefault(name, []).append(add_geom(*geom, materials[colour]))

    mat_list = []
    for colour, _i in sorted(materials.items(), key=lambda kv: kv[1]):
        mat_list.append(
            {
                "name": f"own {colour}",
                "pbrMetallicRoughness": {"baseColorFactor": _factor(colour), "metallicFactor": 0, "roughnessFactor": 1},
            }
        )
    nodes = []
    mesh_list = []
    for name, prims in by_node.items():
        mesh_list.append({"name": name, "primitives": prims})
        nodes.append({"name": name, "mesh": len(mesh_list) - 1})
    blob = b"".join(blobs)
    doc = {
        "asset": {"version": "2.0", "generator": "scripts/craft-boxes.py"},
        "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": mesh_list,
        "materials": mat_list,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(blob)}],
    }
    js = json.dumps(doc, separators=(",", ":")).encode()
    # glTF JSON chunk padding is spaces, not nulls.
    if len(js) % 4:
        js += b" " * (4 - len(js) % 4)
    blob = _pad(blob, 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    out = b"glTF" + struct.pack("<II", 2, total)
    out += struct.pack("<I", len(js)) + b"JSON" + js
    out += struct.pack("<I", len(blob)) + b"BIN\x00" + blob
    path.write_bytes(out)
    return tris_n


def _g(name, colour, kind, *args):
    geom = _box(*args) if kind == "box" else _disc(*args)
    return name, colour, geom


# Metres, origin at the body centre. +Z is the Earth face, matching axes: 'app'.
CRAFT = {
    "envisat": [
        # Body along X (the 10.5 m launch length). The 14 m panel continues off +X,
        # so the drawn length is 24.5 m against the page's 26 m envelope.
        _g("body", "#e3e7ed", "box", 0, 0, 0, 10.5, 2.5, 2.5),
        _g("solar-panel", "#1b2233", "box", 12.25, 0, 0, 14.0, 5.0, 0.08),
        _g("antenna", "#c9ced6", "box", 0, 0, -1.31, 10.0, 1.3, 0.12),
        _g("antenna", "#8f97a3", "box", -3.0, 0.6, 2.25, 0.12, 0.12, 2.0),
        _g("antenna", "#c9a24a", "disc", -3.0, 0.6, 3.3, 0.45, 0.06),
    ],
    "ers-1": [
        _g("body", "#e3e7ed", "box", 0, 0, 0, 2.0, 2.0, 3.0),
        _g("antenna", "#c9ced6", "box", 0, 0, -1.56, 10.0, 1.0, 0.12),
        _g("solar-panel", "#1b2233", "box", 0, 1.0 + 2.9, 0.6, 2.4, 5.8, 0.06),
        _g("solar-panel", "#1b2233", "box", 0, 1.0 + 2.9 + 5.8, 0.6, 2.4, 5.8, 0.06),
        _g("antenna", "#c9a24a", "disc", 0, 0, 2.15, 0.6, 0.08),
        _g("antenna", "#8f97a3", "box", 1.2, 0.9, 0.4, 0.25, 0.08, 3.6),
        _g("antenna", "#8f97a3", "box", 1.2, 0.0, -0.2, 0.25, 0.08, 2.3),
        _g("antenna", "#8f97a3", "box", 1.2, -0.9, 0.4, 0.25, 0.08, 3.6),
    ],
    "sentinel-1": [
        _g("body", "#e3e7ed", "box", 0, 0, 0, 3.4, 1.3, 1.3),
        _g("antenna", "#c9ced6", "box", 0, 0, -0.71, 12.3, 0.821, 0.08),
        _g("solar-panel", "#1b2233", "box", 0, 5.65, 0.2, 1.5, 10.0, 0.06),
        _g("solar-panel", "#1b2233", "box", 0, -5.65, 0.2, 1.5, 10.0, 0.06),
    ],
    "sentinel-2": [
        _g("body", "#e3e7ed", "box", 0, 0, 0, 3.4, 1.8, 2.35),
        _g("solar-panel", "#1b2233", "box", 0, 0.9 + 4.733 / 2, 0.3, 1.5, 4.733, 0.06),
        _g("antenna", "#c9a24a", "box", 0.4, 0, -1.425, 1.2, 0.8, 0.5),
        _g("antenna", "#8f97a3", "disc", -0.8, 0.4, 1.28, 0.18, 0.05),
    ],
    "sentinel-3": [
        _g("body", "#e3e7ed", "box", 0, 0, 0, 2.2, 2.21, 3.9),
        _g("solar-panel", "#1b2233", "box", 0, 1.105 + 4.773 / 2, 0.8, 2.2, 4.773, 0.06),
        _g("antenna", "#c9a24a", "box", 0, 0, -2.61, 1.24, 0.83, 1.32),
        _g("antenna", "#8f97a3", "disc", 0.6, -0.5, -2.1, 0.25, 0.05),
    ],
}


def main(argv: list[str]) -> int:
    out = Path(argv[1] if len(argv) > 1 else "site/models")
    out.mkdir(parents=True, exist_ok=True)
    for name, groups in CRAFT.items():
        path = out / f"{name}.glb"
        n = write_glb(path, groups)
        print(f"{path}  {n} tris  {path.stat().st_size} B")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
