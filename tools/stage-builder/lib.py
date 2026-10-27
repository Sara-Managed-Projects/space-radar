"""Part library for the release 1.3.0 W1-c landers (internal spec 0077 task 3).

Built in code from cited metres and looked-at photographs. Metres, +Y up, the origin on the ground under
the craft (scene/heroes.js standOnGround puts the lowest point on the ground anyway). Every part is a
triangle mesh with a flat colour of ours and a shading role the app reads off the mesh NAME
(realmodels.js applyToon): `body` (painted structure), `foil` (a broad soft glint), `solar-panel`
(a sharp glint). No textures. `Model.export()` writes one record per (role, colour) with creased
normals; write-glb.mjs turns that into the file that ships, in the same layout as the public
scripts/bake-own-colours.mjs writes (one mesh per role, one primitive and one material per colour,
meshopt).
"""
import json
import math
import os
import struct

import numpy as np

# ---- colours (sRGB) --------------------------------------------------------------------------------
GOLD = "#C9A24A"
GOLD_D = "#B08A3A"
GOLD_L = "#D9B860"
KAPTON = "#C47A35"
SILVER = "#B9BEC6"
SILVER_D = "#8F97A3"
WHITE = "#E3E7EC"
OFFWHITE = "#CFD3D8"
GREY = "#7C838E"
DARK = "#3A3F4A"
BLACK = "#24272E"
CELL = "#2E4E8C"          # the app's own panel blue (scene/models.js PANEL_BLUE)


def hexrgb(h):
    return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]


# ---- vectors and frames ----------------------------------------------------------------------------
def V(*a):
    return np.array(a if len(a) > 1 else a[0], dtype=np.float64)


def unit(v):
    v = np.asarray(v, dtype=np.float64)
    n = np.linalg.norm(v)
    return v / n if n > 1e-12 else v


def rot(axis, deg):
    """Rotation matrix about an axis ('x', 'y', 'z' or a vector), degrees, right-handed."""
    if isinstance(axis, str):
        axis = {"x": (1, 0, 0), "y": (0, 1, 0), "z": (0, 0, 1)}[axis]
    x, y, z = unit(axis)
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    C = 1 - c
    return np.array([[c + x * x * C, x * y * C - z * s, x * z * C + y * s],
                     [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
                     [z * x * C - y * s, z * y * C + x * s, c + z * z * C]])


def frame(w):
    """Two unit vectors square to w and to each other (u, v), so that u x v = w."""
    w = unit(w)
    a = np.array([0, 1, 0]) if abs(w[1]) < 0.9 else np.array([1, 0, 0])
    u = unit(np.cross(a, w))
    v = np.cross(w, u)
    return u, v


# ---- primitives: each returns (V, F), F counter-clockwise seen from outside -------------------------
def grid(c, u, v, su, sv, nu=1, nv=1, crinkle=0.0, seed=0, both=False):
    """A rectangle centred on c spanning su along u and sv along v, cut nu x nv; its face is u x v.
    `crinkle` pushes inner vertices along the normal by up to that many metres (MLI blankets)."""
    c, u, v = V(c), unit(u), unit(v)
    n = np.cross(u, v)
    a = np.linspace(-su / 2, su / 2, nu + 1)
    b = np.linspace(-sv / 2, sv / 2, nv + 1)
    A, B = np.meshgrid(a, b, indexing="ij")
    P = c + A[..., None] * u + B[..., None] * v
    if crinkle:
        rng = np.random.default_rng(seed)
        d = rng.uniform(-1, 1, A.shape) * crinkle
        d[0, :] = d[-1, :] = d[:, 0] = d[:, -1] = 0
        P = P + d[..., None] * n
    Vv = P.reshape(-1, 3)
    F = []
    for i in range(nu):
        for j in range(nv):
            p0 = i * (nv + 1) + j
            p1 = (i + 1) * (nv + 1) + j
            p2 = (i + 1) * (nv + 1) + j + 1
            p3 = i * (nv + 1) + j + 1
            if (i + j) % 2:
                F += [[p0, p1, p2], [p0, p2, p3]]
            else:
                F += [[p0, p1, p3], [p1, p2, p3]]
    F = np.array(F, dtype=np.int64)
    if both:
        Vv, F = merge([(Vv, F), (Vv.copy(), F[:, ::-1].copy())])
    return Vv, F


def box(c, size, R=None, crinkle=0.0, seed=0, div=None, faces="xXyYzZ"):
    """A box centred on c, size (sx, sy, sz) along the columns of R. `div` (metres) cuts each face into
    squares of about that size; with `crinkle` the faces are rumpled blankets. `faces` picks which of
    -x +x -y +y -z +z are drawn (lower = minus)."""
    c = V(c)
    R = np.eye(3) if R is None else np.asarray(R, dtype=np.float64)
    sx, sy, sz = size
    ex, ey, ez = R[:, 0], R[:, 1], R[:, 2]
    out = []
    spec = {"X": (ex, ey, ez, sx, sy, sz), "x": (-ex, ez, ey, sx, sz, sy),
            "Y": (ey, ez, ex, sy, sz, sx), "y": (-ey, ex, ez, sy, sx, sz),
            "Z": (ez, ex, ey, sz, sx, sy), "z": (-ez, ey, ex, sz, sy, sx)}
    for k, key in enumerate("xXyYzZ"):
        if key not in faces:
            continue
        n, u, v, sn, su, sv = spec[key]
        nu = max(1, int(round(su / div))) if div else 1
        nv = max(1, int(round(sv / div))) if div else 1
        out.append(grid(c + n * sn / 2, u, v, su, sv, nu, nv, crinkle, seed + k))
    return merge(out)


def frustum(a, b, r, r2=None, seg=16, caps=True, open_top=False):
    """A cylinder or cone frustum from a (radius r) to b (radius r2)."""
    a, b = V(a), V(b)
    r2 = r if r2 is None else r2
    w = b - a
    u, v = frame(w)
    t = np.linspace(0, 2 * math.pi, seg, endpoint=False)
    ring = np.cos(t)[:, None] * u + np.sin(t)[:, None] * v
    P = np.vstack([a + r * ring, b + r2 * ring])
    F = []
    for i in range(seg):
        j = (i + 1) % seg
        F += [[i, j, seg + j], [i, seg + j, seg + i]]
    if caps:
        ca, cb = len(P), len(P) + 1
        P = np.vstack([P, a, b])
        for i in range(seg):
            j = (i + 1) % seg
            F.append([ca, j, i])
            if not open_top and r2 > 1e-9:
                F.append([cb, seg + i, seg + j])
    return P, np.array(F, dtype=np.int64)


def rod(a, b, r, seg=6):
    return frustum(a, b, r, r, seg, caps=True)


def lathe(a, axis, profile, seg=24, closed=False):
    """Points (s, r) along an axis from a, turned round it. closed adds end discs."""
    a, w = V(a), unit(axis)
    u, v = frame(w)
    t = np.linspace(0, 2 * math.pi, seg, endpoint=False)
    ring = np.cos(t)[:, None] * u + np.sin(t)[:, None] * v
    P = np.vstack([a + s * w + r * ring for s, r in profile])
    F = []
    n = len(profile)
    for k in range(n - 1):
        for i in range(seg):
            j = (i + 1) % seg
            p0, p1, p2, p3 = k * seg + i, k * seg + j, (k + 1) * seg + j, (k + 1) * seg + i
            F += [[p0, p1, p2], [p0, p2, p3]]
    if closed:
        ca, cb = len(P), len(P) + 1
        P = np.vstack([P, a + profile[0][0] * w, a + profile[-1][0] * w])
        for i in range(seg):
            j = (i + 1) % seg
            F.append([ca, j, i])
            F.append([cb, (n - 1) * seg + i, (n - 1) * seg + j])
    return P, np.array(F, dtype=np.int64)


def sphere(c, r, nlat=10, nlon=16, top=180.0, squash=1.0, axis=(0, 1, 0)):
    """A ball (or a cap of it: `top` degrees from the pole along axis) as a lathe."""
    prof = []
    for k in range(nlat + 1):
        th = math.radians(top) * k / nlat
        prof.append((-r * math.cos(th) * squash, r * math.sin(th)))
    w = unit(axis)
    # from the far pole (-w) toward +w
    P, F = lathe(V(c), w, prof, nlon, closed=False)
    return P, F


def dome(c, r, axis=(0, 1, 0), nlat=6, nlon=20, height=None):
    """A half ball standing on c, opening along axis; `height` squashes it."""
    h = r if height is None else height
    prof = [(h * math.sin(math.radians(90 * k / nlat)), r * math.cos(math.radians(90 * k / nlat))) for k in range(nlat + 1)]
    prof[-1] = (h, 0.0)
    return lathe(V(c), axis, prof, nlon, closed=False)


def disc(c, n, r, seg=16, r_in=0.0):
    c, n = V(c), unit(n)
    u, v = frame(n)
    t = np.linspace(0, 2 * math.pi, seg, endpoint=False)
    ring = np.cos(t)[:, None] * u + np.sin(t)[:, None] * v
    if r_in > 0:
        P = np.vstack([c + r * ring, c + r_in * ring])
        F = []
        for i in range(seg):
            j = (i + 1) % seg
            F += [[i, j, seg + j], [i, seg + j, seg + i]]
        return P, np.array(F, dtype=np.int64)
    P = np.vstack([c + r * ring, c])
    F = [[seg, i, (i + 1) % seg] for i in range(seg)]
    return P, np.array(F, dtype=np.int64)


def torus(c, n, R, r, seg=24, side=6):
    c, n = V(c), unit(n)
    u, v = frame(n)
    P = []
    for i in range(seg):
        t = 2 * math.pi * i / seg
        d = math.cos(t) * u + math.sin(t) * v
        for k in range(side):
            s = 2 * math.pi * k / side
            P.append(c + d * (R + r * math.cos(s)) + n * r * math.sin(s))
    F = []
    for i in range(seg):
        for k in range(side):
            a = i * side + k
            b = ((i + 1) % seg) * side + k
            cc = ((i + 1) % seg) * side + (k + 1) % side
            d_ = i * side + (k + 1) % side
            F += [[a, b, cc], [a, cc, d_]]
    return np.array(P), np.array(F, dtype=np.int64)


def prism(c, axis, sides, across, height, start=None, across_end=None):
    """An n-sided prism standing on c along axis, `across` flat to flat, a FACE toward `start`."""
    c, w = V(c), unit(axis)
    u, v = frame(w)
    if start is not None:
        u = unit(V(start) - np.dot(V(start), w) * w)
        v = np.cross(w, u)
    R0 = across / 2 / math.cos(math.pi / sides)
    R1 = (across_end if across_end else across) / 2 / math.cos(math.pi / sides)
    t = [2 * math.pi * (k + 0.5) / sides for k in range(sides)]
    ring = [math.cos(a) * u + math.sin(a) * v for a in t]
    P = [c + R0 * d for d in ring] + [c + w * height + R1 * d for d in ring] + [c, c + w * height]
    F = []
    for i in range(sides):
        j = (i + 1) % sides
        F += [[i, j, sides + j], [i, sides + j, sides + i]]
        F.append([2 * sides, j, i])
        F.append([2 * sides + 1, sides + i, sides + j])
    return np.array(P), np.array(F, dtype=np.int64)


def plate(points, thick, n=None):
    """A flat plate with a convex outline (points in order), thickness along its normal."""
    P = np.array([V(p) for p in points])
    c = P.mean(axis=0)
    if n is None:
        n = unit(np.cross(P[1] - P[0], P[2] - P[0]))
    n = unit(n)
    top, bot = P + n * thick / 2, P - n * thick / 2
    k = len(P)
    Vv = np.vstack([top, bot, c + n * thick / 2, c - n * thick / 2])
    F = []
    for i in range(k):
        j = (i + 1) % k
        F.append([2 * k, i, j])
        F.append([2 * k + 1, k + j, k + i])
        F += [[i, k + i, k + j], [i, k + j, j]]
    F = np.array(F, dtype=np.int64)
    # make the sides face outward whatever the winding of the outline was
    if np.dot(np.cross(P[1] - P[0], P[2] - P[0]), n) < 0:
        F = F[:, ::-1]
    return Vv, F


def merge(parts):
    Vs, Fs, off = [], [], 0
    for Vv, F in parts:
        if Vv is None or len(F) == 0:
            continue
        Vs.append(np.asarray(Vv, dtype=np.float64))
        Fs.append(np.asarray(F, dtype=np.int64) + off)
        off += len(Vv)
    if not Vs:
        return np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64)
    return np.vstack(Vs), np.vstack(Fs)


def xf(mesh, R=None, t=(0, 0, 0), about=(0, 0, 0)):
    """Turn a mesh by R about a point, then move it by t."""
    Vv, F = mesh
    R = np.eye(3) if R is None else np.asarray(R)
    about = V(about)
    return (Vv - about) @ R.T + about + V(t), F


# ---- higher parts ------------------------------------------------------------------------------------
def nozzle(top, axis, length, r_throat, r_exit, seg=20):
    """A bell nozzle hanging from `top` along axis; open at the exit (drawn as a shell with an inner face)."""
    prof = []
    for k in range(9):
        s = k / 8
        prof.append((length * s, r_throat + (r_exit - r_throat) * (1 - (1 - s) ** 1.8)))
    outer = lathe(top, axis, prof, seg)
    inner = lathe(top, axis, [(p[0], p[1] * 0.97) for p in prof], seg)
    inner = (inner[0], inner[1][:, ::-1])
    return outer, inner


def cell_panel(c, u, v, su, sv, cells, gap, frame_col, cell_col=CELL, thick=0.03, back_col=None, border=None):
    """A solar panel: a substrate box and a grid of cell tiles standing a little proud of it on the +n face
    (n = u x v). Returns [(role, colour, mesh), ...]."""
    c, u, v = V(c), unit(u), unit(v)
    n = np.cross(u, v)
    R = np.column_stack([u, v, n])
    out = [("body", back_col or frame_col, box(c, (su, sv, thick), R))]
    nu, nv = cells
    bd = gap if border is None else border
    cu = (su - 2 * bd - (nu - 1) * gap) / nu
    cv = (sv - 2 * bd - (nv - 1) * gap) / nv
    tiles = []
    for i in range(nu):
        for j in range(nv):
            x = -su / 2 + bd + cu / 2 + i * (cu + gap)
            y = -sv / 2 + bd + cv / 2 + j * (cv + gap)
            tiles.append(grid(c + x * u + y * v + n * (thick / 2 + 0.004), u, v, cu, cv))
    out.append(("solar-panel", cell_col, merge(tiles)))
    if frame_col and back_col and frame_col != back_col:
        out.append(("body", frame_col, merge([grid(c + n * (thick / 2 + 0.002), u, v, su, sv)])))
    return out


class Model:
    def __init__(self, name):
        self.name = name
        self.parts = []      # (label, role, colour, (V, F))

    def add(self, label, role, colour, mesh):
        if mesh[1] is None or len(mesh[1]) == 0:
            return
        assert role in ("body", "foil", "solar-panel", "mirror"), role
        self.parts.append((label, role, colour, (np.asarray(mesh[0], float), np.asarray(mesh[1], np.int64))))

    def addmany(self, label, items):
        for role, colour, mesh in items:
            self.add(label, role, colour, mesh)

    def transform(self, R=None, t=(0, 0, 0), about=(0, 0, 0)):
        self.parts = [(l, r, c, xf(m, R, t, about)) for l, r, c, m in self.parts]

    def ground(self):
        lo = min(m[0][:, 1].min() for _, _, _, m in self.parts)
        self.transform(t=(0, -lo, 0))

    def bounds(self):
        allv = np.vstack([m[0] for _, _, _, m in self.parts])
        return allv.min(axis=0), allv.max(axis=0)

    def triangles(self):
        return int(sum(len(m[1]) for _, _, _, m in self.parts))

    def groups(self):
        g = {}
        for label, role, colour, m in self.parts:
            g.setdefault((role, colour.upper()), []).append(m)
        return {k: merge(v) for k, v in g.items()}

    def export(self, path, crease=40.0, max_colours=14, foil_crease=None):
        """Creased normals per group (a corner's normal averages the faces round it within `crease`
        degrees of its own face), then a json the node writer reads."""
        cosc = math.cos(math.radians(crease))
        recs = []
        groups = self.groups()
        # AT MOST `max_colours` DRAW CALLS, as the public bake keeps (its --colours, 14 by default): the
        # smallest group is folded into the nearest colour of the same role, and the folds are reported.
        self.folds = []
        while len(groups) > max_colours:
            small = min(groups, key=lambda k: len(groups[k][1]))
            rgb = np.array(hexrgb(small[1]))
            cands = [k for k in groups if k != small and k[0] == small[0]] or [k for k in groups if k != small]
            near = min(cands, key=lambda k: np.sum((np.array(hexrgb(k[1])) - rgb) ** 2))
            groups[near] = merge([groups[near], groups.pop(small)])
            self.folds.append("%s %s -> %s" % (small[0], small[1], near[1]))
        base_cosc = cosc
        for (role, colour), (Vv, F) in sorted(groups.items()):
            # BLANKETS ARE FACETED (2026-10-20, review of #1246): a crease of 40 degrees averages a rumpled
            # sheet's small folds back into a smooth slab, and under the toon ramp the crinkle vanished.
            # With a small crease each fold keeps its own normal and its own step of the ramp.
            cosc = math.cos(math.radians(foil_crease)) if (foil_crease is not None and role == "foil") else base_cosc
            # weld exact duplicates so neighbouring faces of one part share corners
            key = np.round(Vv / 1e-5).astype(np.int64)
            _, ids, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
            inv = inv.reshape(-1)
            P = Vv[ids]
            Fw = inv[F]
            Fw = Fw[(Fw[:, 0] != Fw[:, 1]) & (Fw[:, 1] != Fw[:, 2]) & (Fw[:, 0] != Fw[:, 2])]
            fn = np.cross(P[Fw[:, 1]] - P[Fw[:, 0]], P[Fw[:, 2]] - P[Fw[:, 0]])
            area = np.linalg.norm(fn, axis=1)
            ok = area > 1e-12
            Fw, fn, area = Fw[ok], fn[ok], area[ok]
            fu = fn / area[:, None]
            inc = [[] for _ in range(len(P))]
            for t, tri in enumerate(Fw):
                for vtx in tri:
                    inc[vtx].append(t)
            pos, nor, idx, remap = [], [], [], {}
            for t, tri in enumerate(Fw):
                for vtx in tri:
                    fs = inc[vtx]
                    sel = [s for s in fs if np.dot(fu[s], fu[t]) >= cosc]
                    nv_ = (fn[sel]).sum(axis=0)
                    nv_ = nv_ / (np.linalg.norm(nv_) or 1)
                    k = (int(vtx), int(round(nv_[0] * 32)), int(round(nv_[1] * 32)), int(round(nv_[2] * 32)))
                    m = remap.get(k)
                    if m is None:
                        m = len(pos)
                        pos.append(P[vtx].tolist())
                        nor.append(nv_.tolist())
                        remap[k] = m
                    idx.append(m)
            recs.append({"role": role, "colour": colour, "positions": pos, "normals": nor, "indices": idx})
        with open(path, "w") as fh:
            json.dump({"name": self.name, "groups": recs}, fh)
        return sum(len(r["indices"]) // 3 for r in recs), len(recs)


# ---- a picture of a model without a browser (a z-buffer, the app's three-step ramp) -----------------
def _raster(zbuf, cbuf, tri2d, z3, col):
    (x0, y0), (x1, y1), (x2, y2) = tri2d
    H, W = zbuf.shape
    xmin, xmax = max(int(min(x0, x1, x2)), 0), min(int(max(x0, x1, x2)) + 1, W - 1)
    ymin, ymax = max(int(min(y0, y1, y2)), 0), min(int(max(y0, y1, y2)) + 1, H - 1)
    if xmin > xmax or ymin > ymax:
        return
    den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
    if abs(den) < 1e-12:
        return
    xs = np.arange(xmin, xmax + 1) + 0.5
    ys = np.arange(ymin, ymax + 1) + 0.5
    X, Y = np.meshgrid(xs, ys)
    a = ((y1 - y2) * (X - x2) + (x2 - x1) * (Y - y2)) / den
    b = ((y2 - y0) * (X - x2) + (x0 - x2) * (Y - y2)) / den
    c = 1 - a - b
    inside = (a >= -1e-4) & (b >= -1e-4) & (c >= -1e-4)
    if not inside.any():
        return
    z = a * z3[0] + b * z3[1] + c * z3[2]
    sub = zbuf[ymin:ymax + 1, xmin:xmax + 1]
    win = inside & (z < sub)
    sub[win] = z[win]
    cbuf[ymin:ymax + 1, xmin:xmax + 1][win] = col


def render(model, path, views, size=520, light=(0.5, 0.8, 0.35), title=None, ground=True, ss=2):
    from PIL import Image, ImageDraw
    groups = model.groups()
    lo, hi = model.bounds()
    centre = (lo + hi) / 2
    radius = np.linalg.norm(hi - lo) / 2
    L = unit(light)
    tiles = []
    S = size * ss
    for az, el in views:
        zbuf = np.full((S, S), np.inf)
        cbuf = np.zeros((S, S, 3))
        cbuf[:] = (14 / 255, 16 / 255, 22 / 255)
        a_, e_ = math.radians(az), math.radians(el)
        eye_dir = np.array([math.sin(a_) * math.cos(e_), math.sin(e_), math.cos(a_) * math.cos(e_)])
        fwd = -eye_dir
        right = unit(np.cross(fwd, [0, 1, 0]))
        up = np.cross(right, fwd)
        scale = S * 0.46 / radius
        items = list(groups.items())
        if ground:
            g = 2.0 * radius
            gy = lo[1] - 0.003
            gv = np.array([[centre[0] - g, gy, centre[2] - g], [centre[0] + g, gy, centre[2] - g], [centre[0] + g, gy, centre[2] + g], [centre[0] - g, gy, centre[2] + g]])
            items.append((("ground", "#6E6E70"), (gv, np.array([[0, 2, 1], [0, 3, 2]]))))
        for (role, colour), (Vv, F) in items:
            rgb = np.array(hexrgb(colour))
            P = Vv - centre
            x = P @ right * scale + S / 2
            y = S / 2 - P @ up * scale
            z = P @ fwd
            fn = np.cross(Vv[F[:, 1]] - Vv[F[:, 0]], Vv[F[:, 2]] - Vv[F[:, 0]])
            fn /= (np.linalg.norm(fn, axis=1)[:, None] + 1e-12)
            facing = fn @ (-fwd)
            for t in range(len(F)):
                if facing[t] <= 0 and role != "ground":
                    continue
                n_ = fn[t] if facing[t] > 0 else -fn[t]
                d = float(n_ @ L)
                step = 1.0 if d > 0.55 else 0.78 if d > 0.15 else 0.5 if d > -0.2 else 0.36
                spec = 0.0
                if role in ("foil", "solar-panel"):
                    hv = unit(L - fwd)
                    sp = max(0.0, float(n_ @ hv))
                    spec = (0.35 if role == "solar-panel" else 0.2) * (sp ** (40 if role == "solar-panel" else 8))
                col = np.clip(rgb * step + spec, 0, 1)
                tri = F[t]
                _raster(zbuf, cbuf, [(x[i], y[i]) for i in tri], z[tri], col)
        img = Image.fromarray((cbuf * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)
        ImageDraw.Draw(img).text((6, 6), "az %d el %d" % (az, el), fill=(200, 200, 200))
        tiles.append(img)
    cols = min(3, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * size, rows * size + (24 if title else 0)), (14, 16, 22))
    for k, im in enumerate(tiles):
        sheet.paste(im, ((k % cols) * size, (k // cols) * size + (24 if title else 0)))
    if title:
        ImageDraw.Draw(sheet).text((8, 6), title, fill=(230, 230, 230))
    sheet.save(path)
    return path


# ---- blankets: what a multi-layer insulation surface is made of (review of #1246) -----------------------
def patches_on_face(c, n, u, su, sv, count, size, colour_cycle, seed, lift=0.03, amp=0.012, sides=0):
    """`count` blanket patches on a face centred on c (normal n, u across, v = n x u up), each a rumpled
    rectangle (or an n-sided plate when sides > 0) of about `size`, lifted off the face. Returns
    [(colour, mesh)]."""
    rng = np.random.default_rng(seed)
    c, n, u = V(c), unit(n), unit(u)
    v = np.cross(n, u)
    out = []
    for k in range(count):
        cu, cv = rng.uniform(-su / 2 + size / 2, su / 2 - size / 2), rng.uniform(-sv / 2 + size / 2, sv / 2 - size / 2)
        w, h = size * rng.uniform(0.7, 1.3), size * rng.uniform(0.6, 1.1)
        p = c + u * cu + v * cv + n * lift
        if sides:
            m = disc(p, n, w / 2, sides)
        else:
            m = grid(p, u, v, w, h, 3, 3, crinkle=amp, seed=seed * 7 + k)
        out.append((colour_cycle[k % len(colour_cycle)], m))
    return out


def seams_on_face(c, n, u, su, sv, nu, nv, width=0.018, lift=0.025):
    """Taped seams between blanket panels: a grid of thin strips on a face."""
    c, n, u = V(c), unit(n), unit(u)
    v = np.cross(n, u)
    R = np.column_stack([u, v, n])
    out = []
    for i in range(1, nu):
        x = -su / 2 + su * i / nu
        out.append(box(c + u * x + n * lift, (width, sv, 0.006), R))
    for j in range(1, nv):
        y = -sv / 2 + sv * j / nv
        out.append(box(c + v * y + n * lift, (su, width, 0.006), R))
    return merge(out)


def quad(a, b, c, d, nu, nv, crinkle=0.0, seed=0, outward=None):
    """A four-cornered sheet a-b-c-d (in order round it) cut nu x nv, rumpled; faces `outward` when given."""
    a, b, c, d = V(a), V(b), V(c), V(d)
    n = unit(np.cross(b - a, d - a))
    rng = np.random.default_rng(seed)
    P = []
    for i in range(nu + 1):
        for j in range(nv + 1):
            s, t = i / nu, j / nv
            p = (a * (1 - s) + b * s) * (1 - t) + (d * (1 - s) + c * s) * t
            w = 0 if i in (0, nu) or j in (0, nv) else rng.uniform(-1, 1) * crinkle
            P.append(p + n * w)
    F = []
    for i in range(nu):
        for j in range(nv):
            p0, p1, p2, p3 = i * (nv + 1) + j, (i + 1) * (nv + 1) + j, (i + 1) * (nv + 1) + j + 1, i * (nv + 1) + j + 1
            F += [[p0, p1, p2], [p0, p2, p3]]
    F = np.array(F)
    if outward is not None and np.dot(n, V(outward)) < 0:
        F = F[:, ::-1]
    return np.array(P), F
