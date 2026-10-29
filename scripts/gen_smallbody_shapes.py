#!/usr/bin/env python3
"""0079 B1 (internal #1065): the shapes of imaged small bodies, as small .glb files with a baked relief.

    python3 -m venv V && V/bin/pip install "numpy<2" "scipy<1.13" fast_simplification==0.1.7 xatlas pillow meshoptimizer spiceypy
    V/bin/python -I scripts/gen_smallbody_shapes.py [--only NAME ...] [--src DIR] [--out DIR]

Reads the published shape models from SRC (default ~/.cache/spaceradar-src/b1/raw/<name>/, each download in a directory of its own;
scripts/fetch-small-body-sources.sh in the PR body lists the URLs), writes for each body

    site/models/<file>.glb            the shape, simplified by quadric error to a sensible count of triangles, in the body's own
                                      axes (kilometres, +z the pole where the source says so), positions as normalised 16-bit
                                      integers, normals 8-bit, texture coordinates 16-bit, EXT_meshopt_compression
    (inside the same .glb)            where the shape is simplified: an OBJECT-SPACE normal map baked from the unsimplified model
                                      (the nearest four vertices' normals of the original, weighted by inverse distance, at every
                                      texel of an xatlas unwrapping of the simplified one), so the relief of the original is on the
                                      surface and only the outline is thinned. Nothing is invented: every normal is the source's.
    (inside the same .glb)            Arrokoth only: New Horizons' albedo map (Porter et al. 2024) on the model's own texture coordinates.

and prints each body's counts, volume and extent against the source's. No random numbers; the same inputs give the same files.
"""
from __future__ import annotations

import argparse
import io
import json
import struct
import sys
from pathlib import Path

import numpy as np

HOME = Path.home()
SRC = HOME / ".cache/spaceradar-src/b1/raw"
REPO = Path(__file__).resolve().parent.parent


# --------------------------------------------------------------------------------------------- readers
def read_wrl(path: Path):
    """A PDS Small Bodies Node plate model in its VRML wrapper: `point [ x y z ... ]`, then `coordIndex [ a b c -1 ... ]`."""
    txt = "\n".join(ln for ln in path.read_text().splitlines() if not ln.lstrip().startswith("#"))
    a = txt.index("point [") + len("point [")
    b = txt.index("]", a)
    v = np.array(txt[a:b].split(), dtype=np.float64).reshape(-1, 3)
    a = txt.index("coordIndex [") + len("coordIndex [")
    b = txt.index("]", a)
    idx = np.array(txt[a:b].split(), dtype=np.int64).reshape(-1, 4)
    assert (idx[:, 3] == -1).all(), f"{path.name}: not triangles"
    f = idx[:, :3]
    base = int(f.min())
    if base not in (0, 1):
        raise SystemExit(f"{path.name}: index base {base}")
    return v, f - base


def read_obj(path: Path, with_uv=False):
    v, f, vt, ft = [], [], [], []
    for ln in path.read_text().splitlines():
        p = ln.split()
        if not p:
            continue
        if p[0] == "v":
            v.append([float(x) for x in p[1:4]])
        elif p[0] == "vt":
            vt.append([float(x) for x in p[1:3]])
        elif p[0] == "f":
            f.append([int(x.split("/")[0]) - 1 for x in p[1:4]])
            if with_uv:
                ft.append([int(x.split("/")[1]) - 1 for x in p[1:4]])
    out = (np.asarray(v), np.asarray(f, dtype=np.int64))
    return out + ((np.asarray(vt), np.asarray(ft, dtype=np.int64)) if with_uv else ())


def read_stl(path: Path):
    """Binary STL (NASA 3D Printing): welded on position, since STL repeats every vertex per triangle."""
    raw = path.read_bytes()
    if raw[:5] == b"solid" and b"facet" in raw[:300]:
        raise SystemExit(f"{path.name}: ASCII STL not handled")
    n = struct.unpack("<I", raw[80:84])[0]
    rec = np.frombuffer(raw, dtype=np.dtype([("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")]), count=n, offset=84)
    pts = rec["v"].reshape(-1, 3).astype(np.float64)
    key = np.round(pts, 5)
    uniq, inv = np.unique(key, axis=0, return_inverse=True)
    return uniq, inv.reshape(-1, 3).astype(np.int64)


def read_dsk(path: Path):
    """A SPICE DSK type 2 (Lucy's Donaldjohanson): vertices in km, plates 1-based."""
    import spiceypy as sp
    h = sp.dasopr(str(path))
    d = sp.dlabfs(h)
    v = np.asarray(sp.dskv02(h, d, 1, sp.dskz02(h, d)[0]), dtype=np.float64)
    f = np.asarray(sp.dskp02(h, d, 1, sp.dskz02(h, d)[1]), dtype=np.int64) - 1
    sp.dascls(h)
    return v, f


# --------------------------------------------------------------------------------------------- geometry
def tidy(v, f):
    """Drop degenerate triangles and unused vertices."""
    f = f[(f[:, 0] != f[:, 1]) & (f[:, 1] != f[:, 2]) & (f[:, 0] != f[:, 2])]
    used = np.unique(f)
    remap = -np.ones(len(v), dtype=np.int64)
    remap[used] = np.arange(len(used))
    return v[used], remap[f]


def volume(v, f):
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    return float(np.einsum("ij,ij->i", a, np.cross(b, c)).sum() / 6.0)


def smooth_normals(v, f):
    n = np.zeros_like(v)
    fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    for k in range(3):
        np.add.at(n, f[:, k], fn)
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    return n


def outward(v, f):
    """Every triangle wound outward: the signed volume must come out positive."""
    if volume(v, f) < 0:
        f = f[:, ::-1].copy()
    return f


def simplify(v, f, tris):
    import fast_simplification
    v2, f2 = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int32), target_count=tris)
    return tidy(np.asarray(v2, dtype=np.float64), np.asarray(f2, dtype=np.int64))


# --------------------------------------------------------------------------------------------- the bake
def unwrap(v, f, size):
    """xatlas: new vertices (some split on chart borders), their indices into v, new faces, uv in [0, 1] (v running down, as glTF's)."""
    import xatlas
    atlas = xatlas.Atlas()
    atlas.add_mesh(v.astype(np.float32), f.astype(np.uint32))
    co = xatlas.ChartOptions()
    po = xatlas.PackOptions()
    po.resolution = size
    po.padding = 3
    po.bilinear = True
    po.create_image = False
    atlas.generate(co, po, verbose=False)
    vmap, idx, uv = atlas[0]
    return np.asarray(vmap, dtype=np.int64), np.asarray(idx, dtype=np.int64), np.asarray(uv, dtype=np.float64)


def bake_object_normals(v, n, f, uv, hv, hn, size):
    """Object-space normals of the original (hv, hn) at every texel the simplified mesh (v, n, f; uv per vertex) covers."""
    from scipy.spatial import cKDTree
    img = np.zeros((size, size, 3), dtype=np.float64)
    cov = np.zeros((size, size), dtype=bool)
    px = uv * size                       # pixel coordinates, texel (i, j) centred at i + 0.5
    pts, base_n, where = [], [], []
    for t in range(len(f)):
        a, b, c = px[f[t, 0]], px[f[t, 1]], px[f[t, 2]]
        x0, x1 = int(np.floor(min(a[0], b[0], c[0]))), int(np.ceil(max(a[0], b[0], c[0])))
        y0, y1 = int(np.floor(min(a[1], b[1], c[1]))), int(np.ceil(max(a[1], b[1], c[1])))
        xs, ys = np.meshgrid(np.arange(max(x0, 0), min(x1, size - 1) + 1), np.arange(max(y0, 0), min(y1, size - 1) + 1))
        xs, ys = xs.ravel(), ys.ravel()
        if not len(xs):
            continue
        p = np.stack([xs + 0.5, ys + 0.5], axis=1)
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-12:
            continue
        l0 = ((b[1] - c[1]) * (p[:, 0] - c[0]) + (c[0] - b[0]) * (p[:, 1] - c[1])) / d
        l1 = ((c[1] - a[1]) * (p[:, 0] - c[0]) + (a[0] - c[0]) * (p[:, 1] - c[1])) / d
        l2 = 1 - l0 - l1
        eps = -0.02
        ok = (l0 >= eps) & (l1 >= eps) & (l2 >= eps)
        if not ok.any():
            continue
        l0, l1, l2, xs, ys = l0[ok], l1[ok], l2[ok], xs[ok], ys[ok]
        pts.append(l0[:, None] * v[f[t, 0]] + l1[:, None] * v[f[t, 1]] + l2[:, None] * v[f[t, 2]])
        base_n.append(l0[:, None] * n[f[t, 0]] + l1[:, None] * n[f[t, 1]] + l2[:, None] * n[f[t, 2]])
        where.append(np.stack([ys, xs], axis=1))
    pts, base_n, where = np.concatenate(pts), np.concatenate(base_n), np.concatenate(where)
    tree = cKDTree(hv)
    dist, nb = tree.query(pts, k=4, workers=-1)
    w = 1.0 / (dist + 1e-9)
    nn = (hn[nb] * w[:, :, None]).sum(axis=1)
    nn /= np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-12)
    bn = base_n / np.maximum(np.linalg.norm(base_n, axis=1, keepdims=True), 1e-12)
    flip = (nn * bn).sum(axis=1) < 0      # the nearest vertices were on the far side of a thin part: keep the simplified surface's own
    nn[flip] = bn[flip]
    img[where[:, 0], where[:, 1]] = nn
    cov[where[:, 0], where[:, 1]] = True
    # The margin: a few texels of the nearest covered value past every chart's edge, so a bilinear or mip fetch at the border
    # never reads black.
    for _ in range(6):
        grow = ~cov
        acc = np.zeros_like(img)
        cnt = np.zeros(cov.shape)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                s = np.roll(np.roll(cov, dy, 0), dx, 1)
                acc += np.roll(np.roll(img, dy, 0), dx, 1) * s[:, :, None]
                cnt += s
        take = grow & (cnt > 0)
        img[take] = acc[take] / cnt[take][:, None]
        cov |= take
    img /= np.maximum(np.linalg.norm(img, axis=2, keepdims=True), 1e-12)
    img[~cov] = (0, 0, 1)
    return np.clip(np.round((img * 0.5 + 0.5) * 255), 0, 255).astype(np.uint8), float(cov.mean())


def albedo_map(path: Path, how: dict) -> bytes:
    """New Horizons' albedo map as an RGB webp: the map's brightness relative to its own median, carried to a stated geometric
    albedo (a map of relative brightness is what the PDS product is good for; its label's formula for absolute albedo
    gives 0.04 for the median pixel, which no source gives for Arrokoth) and multiplied by a colour that is the red slope
    the object is known for. Returns webp bytes; the grey level is what the app shows as the albedo."""
    from PIL import Image
    a = np.asarray(Image.open(path), dtype=np.float64)
    ok = a > 0
    rel = np.where(ok, a / np.median(a[ok]), 1.0)
    # the photoclinometric map is noisy patch by patch; the whole map is read at 0.7 to 1.6 of its median and softened over 2 texels,
    # which keeps the brighter neck and the darker patches and not the blotches the first look showed
    from PIL import ImageFilter
    rel = np.clip(rel, 0.7, 1.6)
    rel = np.asarray(Image.fromarray((rel / 2.0 * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), dtype=np.float64) / 255 * 2.0
    lin = how["geometric"] * rel
    hue = np.asarray(how["rgb"], dtype=np.float64)
    hue = hue / (hue @ np.array([0.2126, 0.7152, 0.0722]))        # the colour changes the hue and not the albedo
    rgb = lin[:, :, None] * hue[None, None, :]
    # linear reflectance to a display value: the app's materials are lit by a ramp, so the albedo is carried as sRGB-encoded
    # reflectance scaled so 0.21 sits at about 0.5 in the file (a mid grey) and 0.04 near 0.2 (a charcoal)
    disp = np.clip((rgb / 0.21) ** 0.55 * 0.5, 0, 1)
    buf = io.BytesIO()
    Image.fromarray((disp * 255 + 0.5).astype(np.uint8)).save(buf, "WEBP", quality=90, method=6)
    return buf.getvalue()


# --------------------------------------------------------------------------------------------- the file
def write_glb(path: Path, name: str, v, n, f, uv=None, normal_webp: bytes | None = None, colour_webp: bytes | None = None):
    """One mesh. Positions normalised int16 about the bounding box (the node's scale and translation put them back), normals int8,
    texture coordinates uint16, all through EXT_meshopt_compression (three's MeshoptDecoder; scene/realmodels.js already loads it).
    `normal_webp` rides inside the file as the material's normalTexture, marked `extras.objectSpace` because it holds OBJECT-space
    normals (glTF only defines tangent-space ones; scene/realmodels.js reads the mark and tells three which kind it is), and
    `colour_webp` as its baseColorTexture; both through EXT_texture_webp, so the registry's one row per .glb covers them."""
    import meshoptimizer as mo
    # first-use order, and the vertex cache's order for the triangles
    idx = f.astype(np.uint32).ravel()
    dest = np.zeros_like(idx)
    mo.optimize_vertex_cache(dest, idx, len(idx), len(v))
    order = np.unique(dest, return_index=True)
    first = np.full(len(v), len(dest), dtype=np.int64)
    first[order[0]] = order[1]
    perm = np.argsort(first, kind="stable")          # new -> old
    inv = np.empty(len(v), dtype=np.int64)
    inv[perm] = np.arange(len(v))
    v, n = v[perm], n[perm]
    if uv is not None:
        uv = uv[perm]
    idx = inv[dest].astype(np.uint32)
    lo, hi = v.min(0), v.max(0)
    centre = (lo + hi) / 2
    half = float(max(hi - lo) / 2)
    q = np.clip(np.round((v - centre) / half * 32767), -32767, 32767).astype(np.int16)
    pos = np.concatenate([q, np.zeros((len(q), 1), np.int16)], axis=1)
    nrm = np.concatenate([np.clip(np.round(n * 127), -127, 127).astype(np.int8), np.zeros((len(n), 1), np.int8)], axis=1)
    chunks, views, accessors, fallback = [], [], [], 0
    off = 0

    def put(raw: bytes, count: int, stride: int, mode: str, target: int):
        nonlocal off, fallback
        pad = (-len(raw)) % 4
        chunks.append(raw + b"\0" * pad)
        views.append({"buffer": 1, "byteOffset": 0, "byteLength": count * stride,
                      **({"byteStride": stride} if mode == "ATTRIBUTES" else {}), "target": target,
                      "extensions": {"EXT_meshopt_compression": {"buffer": 0, "byteOffset": off, "byteLength": len(raw), "byteStride": stride,
                                                                 "count": count, "mode": mode, "filter": "NONE"}}})
        off += len(raw) + pad
        return len(views) - 1

    use32 = len(v) > 65535
    index_bytes = mo.encode_index_buffer(idx if use32 else idx.astype(np.uint16), len(idx), len(v))
    iv = put(index_bytes, len(idx), 4 if use32 else 2, "TRIANGLES", 34963)
    pv = put(mo.encode_vertex_buffer(pos, len(pos), 8), len(pos), 8, "ATTRIBUTES", 34962)
    nv = put(mo.encode_vertex_buffer(nrm, len(nrm), 4), len(nrm), 4, "ATTRIBUTES", 34962)
    accessors += [
        {"bufferView": iv, "componentType": 5125 if use32 else 5123, "count": len(idx), "type": "SCALAR"},
        {"bufferView": pv, "componentType": 5122, "normalized": True, "count": len(v), "type": "VEC3", "min": q.min(0).tolist(), "max": q.max(0).tolist()},
        {"bufferView": nv, "componentType": 5120, "normalized": True, "count": len(v), "type": "VEC3"},
    ]
    attrs = {"POSITION": 1, "NORMAL": 2}
    if uv is not None:
        uq = np.clip(np.round(uv * 65535), 0, 65535).astype(np.uint16)
        uvv = put(mo.encode_vertex_buffer(uq, len(uq), 4), len(uq), 4, "ATTRIBUTES", 34962)
        accessors.append({"bufferView": uvv, "componentType": 5123, "normalized": True, "count": len(uq), "type": "VEC2"})
        attrs["TEXCOORD_0"] = 3
    comp_views = len(views)
    images, textures, material = [], [], None
    if normal_webp is not None or colour_webp is not None:
        material = {"pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0, "roughnessFactor": 1}}
        for key, raw in (("normalTexture", normal_webp), ("baseColorTexture", colour_webp)):
            if raw is None:
                continue
            pad = (-len(raw)) % 4
            chunks.append(raw + b"\0" * pad)
            views.append({"buffer": 0, "byteOffset": off, "byteLength": len(raw)})
            off += len(raw) + pad
            images.append({"bufferView": len(views) - 1, "mimeType": "image/webp"})
            textures.append({"extensions": {"EXT_texture_webp": {"source": len(images) - 1}}})
            if key == "normalTexture":
                material[key] = {"index": len(textures) - 1}
                material["extras"] = {"objectSpace": True}
            else:
                material["pbrMetallicRoughness"]["baseColorTexture"] = {"index": len(textures) - 1}
    blob = b"".join(chunks)
    # buffer 0 is the GLB's own chunk (the compressed data); buffer 1 is the uncompressed fallback the spec asks for: declared, never stored
    doc = {
        "asset": {"version": "2.0", "generator": "space-radar scripts/gen_smallbody_shapes.py"},
        "extensionsUsed": ["KHR_mesh_quantization", "EXT_meshopt_compression"] + (["EXT_texture_webp"] if images else []),
        "extensionsRequired": ["KHR_mesh_quantization", "EXT_meshopt_compression"] + (["EXT_texture_webp"] if images else []),
        "buffers": [{"byteLength": len(blob)},
                    {"byteLength": 0, "extensions": {"EXT_meshopt_compression": {"fallback": True}}}],
        "bufferViews": views, "accessors": accessors,
        "meshes": [{"name": name, "primitives": [{"attributes": attrs, "indices": 0, "mode": 4, **({"material": 0} if material else {})}]}],
        "nodes": [{"name": name, "mesh": 0, "translation": centre.tolist(), "scale": [half, half, half]}],
        "scenes": [{"nodes": [0]}], "scene": 0,
    }
    if material:
        doc["materials"] = [material]
        doc["images"], doc["textures"] = images, textures
    # byteOffsets of the fallback views are laid end to end, as gltfpack writes them
    pos_ = 0
    for vw in views[:comp_views]:
        vw["byteOffset"] = pos_
        pos_ += vw["byteLength"] + (-vw["byteLength"]) % 4
    doc["buffers"][1]["byteLength"] = pos_
    js = json.dumps(doc, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    path.write_bytes(struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(js), 0x4E4F534A) + js
                     + struct.pack("<II", len(blob), 0x004E4942) + blob)
    return total


# --------------------------------------------------------------------------------------------- the bodies
# kind, file in SRC/<dir>, hi-res file (normals), triangles after simplification (None: keep the source's), map size
BODIES = {
    "67p": dict(out="comet-67p", dir="67p", file="cg_spc_shap5_199k_cart.wrl", hires=("67p-hi", "cg_spc_shap5_788k_cart.wrl"), tris=40000, tex=2048),
    "lutetia": dict(out="asteroid-lutetia", dir="lutetia", file="lutetia_098k_cart.wrl", hires=("lutetia-hi", "lutetia_780k_cart.wrl"), tris=24000, tex=1024),
    "steins": dict(out="asteroid-steins", dir="steins", file="steins_cart.wrl", tris=None),
    "donaldjohanson": dict(out="asteroid-donaldjohanson", dir="donj", file="lcy_donj_k548_iso20m_v10.bds", hires="self", tris=14000, tex=1024),
    # New Horizons' own texture coordinates and albedo map (Porter et al. 2024); the colour is the map's relative brightness
    # carried to Arrokoth's published geometric albedo and its measured red slope (see albedo_map)
    "arrokoth": dict(out="asteroid-arrokoth", dir="arrokoth", file="arrokoth_porter_2024_v01.obj", tris=None, own_uv=True,
                     albedo=("arrokoth-albedo", "albedo_arrokoth4_fp36h2_masked1.png", dict(geometric=0.21, rgb=(1.0, 0.64, 0.44)))),
    "toutatis": dict(out="asteroid-toutatis", dir="nasa-asteroid-4179-toutatis", file="Asteroid 4179 Toutatis.stl", tris=None),
    "geographos": dict(out="asteroid-geographos", dir="nasa-asteroid-1620-geographos", file="Asteroid 1620 Geographos.stl", tris=10000),
    "kleopatra": dict(out="asteroid-kleopatra", dir="nasa-asteroid-216-kleopatra", file="Asteroid 216 Kleopatra.stl", tris=None),
    "mithra": dict(out="asteroid-mithra", dir="nasa-asteroid-4486-mithra", file="Asteroid 4486 Mithra.stl", tris=None),
    "golevka": dict(out="asteroid-golevka", dir="nasa-asteroid-6489-golevka", file="Asteroid 6489 Golevka.stl", tris=None),
    "hw1": dict(out="asteroid-1996hw1", dir="nasa-asteroid-8567-1996-hw1", file="Asteroid 8567 1996 HW1.stl", tris=None),
}


def load(spec_dir: str, fname: str):
    p = SRC / spec_dir / fname
    if fname.endswith(".wrl"):
        return read_wrl(p)
    if fname.endswith(".obj"):
        return read_obj(p)
    if fname.endswith(".stl"):
        return read_stl(p)
    if fname.endswith(".bds"):
        return read_dsk(p)
    raise SystemExit(fname)


def main(argv):
    global SRC
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--out", type=Path, default=REPO / "site")
    ap.add_argument("--src", type=Path, default=SRC)
    args = ap.parse_args(argv)
    SRC = args.src
    (args.out / "models").mkdir(exist_ok=True)
    from PIL import Image
    report = {}
    for key, spec in BODIES.items():
        if args.only and key not in args.only:
            continue
        uv = None
        nrm_webp = col_webp = None
        if spec.get("own_uv"):
            # this OBJ writes one vt per v, same index: keep the topology and the coordinates (v up in an OBJ, down in glTF)
            v0, f0, vt, ft = read_obj(SRC / spec["dir"] / spec["file"], with_uv=True)
            assert len(vt) == len(v0) and (ft == f0).all(), "Arrokoth: vt not 1:1 with v"
            f0 = outward(v0, f0)
            vol0, ext0 = volume(v0, f0), v0.max(0) - v0.min(0)
            v1, f1 = v0, f0
            uv = np.stack([vt[:, 0], 1.0 - vt[:, 1]], axis=1)
            n1 = smooth_normals(v1, f1)
        else:
            v0, f0 = load(spec["dir"], spec["file"])
            v0, f0 = tidy(v0, f0)
            f0 = outward(v0, f0)
            vol0, ext0 = volume(v0, f0), v0.max(0) - v0.min(0)
        if spec.get("own_uv"):
            pass
        elif spec["tris"] and spec["tris"] < len(f0):
            v1, f1 = simplify(v0, f0, spec["tris"])
            f1 = outward(v1, f1)
            n1 = smooth_normals(v1, f1)
            if spec.get("hires"):
                if spec["hires"] == "self":
                    hv, hf = v0, f0
                else:
                    hv, hf = load(*spec["hires"])
                    hv, hf = tidy(hv, hf)
                    hf = outward(hv, hf)
                hn = smooth_normals(hv, hf)
                vmap, f2, uv2 = unwrap(v1, f1, spec["tex"])
                v2, n2 = v1[vmap], n1[vmap]
                nrm_img, covered = bake_object_normals(v2, n2, f2, uv2, hv, hn, spec["tex"])
                v1, n1, f1, uv = v2, n2, f2, uv2
                buf = io.BytesIO()
                Image.fromarray(nrm_img).save(buf, "WEBP", quality=88, method=6)
                nrm_webp = buf.getvalue()
                print(f"  {key}: normal map {spec['tex']}x{spec['tex']}, {100 * covered:.0f} % of it covered, {len(nrm_webp)} bytes")
        else:
            v1, f1 = v0, f0
            n1 = smooth_normals(v1, f1)
        vol1, ext1 = volume(v1, f1), v1.max(0) - v1.min(0)
        if abs(vol1 / vol0 - 1) > 0.02:
            raise SystemExit(f"{key}: volume {vol0:.5g} -> {vol1:.5g}")
        if spec.get("albedo"):
            col_webp = albedo_map(SRC / spec["albedo"][0] / spec["albedo"][1], spec["albedo"][2])
        size = write_glb(args.out / "models" / f"{spec['out']}.glb", spec["out"], v1, n1, f1, uv, nrm_webp, col_webp)
        report[key] = dict(file=f"{spec['out']}.glb", bytes=size, tris=int(len(f1)), verts=int(len(v1)), source_tris=int(len(f0)),
                           volume_km3=vol1, source_volume_km3=vol0, extent_km=[round(float(x), 4) for x in ext1],
                           source_extent_km=[round(float(x), 4) for x in ext0])
        print(f"{key}: {len(f0)} -> {len(f1)} triangles, {len(v1)} vertices, volume {vol0:.5g} -> {vol1:.5g} km3 ({100 * (vol1 / vol0 - 1):+.2f} %), "
              f"extent {' x '.join(f'{x:.3f}' for x in ext1)} km (source {' x '.join(f'{x:.3f}' for x in ext0)}), {size} bytes")
    (args.out.parent / "scripts" / "data").mkdir(exist_ok=True)
    out = args.out.parent / "scripts" / "data" / "smallbody-shapes.json"
    old = json.loads(out.read_text()) if out.exists() else {}
    old.update(report)
    out.write_text(json.dumps(old, indent=1, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
