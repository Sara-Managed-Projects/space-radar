"""Part-aware model builder for the Vostok models (release 1.5.0, stage r15-c2, internal spec 0079).

Built on the part library of release 1.3.0 / 1.4.0 (tools/stage-builder/lib.py, stagelib.py). What is new here is the
vehicle: a tree of NAMED PARTS (moments-contract.md), each its own glTF node whose origin is the part's centre of mass,
written by write-glb-parts.mjs. Metres, +Y up the vehicle's axis, the origin at the base of the stack (the base of the
payload for a payload model).

A part is a `stagelib.Stage` (so every call of the stage builder works on it, in VEHICLE coordinates); `Vehicle.add(name,
stage, origin)` files it, `child=` files it under another part. `Vehicle.export(path)` shifts every part to its own
origin, folds colours (at most `limit` a part: one draw call each), writes creased normals and a json that
write-glb-parts.mjs turns into the file that ships.
"""
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "stage-builder"))
import lib  # noqa: E402
from lib import (V, unit, rot, frame, merge, xf, box, frustum, rod, lathe, disc, torus, plate, grid, hexrgb)  # noqa: E402
from stagelib import Stage, shade, mix, revolve, bell_profile, UP, DOWN  # noqa: E402


def polar(r, deg, y=0.0):
    a = math.radians(deg)
    return V(r * math.cos(a), y, r * math.sin(a))


def ring_angles(n, a0=0.0):
    return [a0 + 360.0 * k / n for k in range(n)]


def basis_about(axis):
    """Rotation matrix whose +Y column is `axis` (a unit vector)."""
    w = unit(axis)
    u, v = frame(w)          # u x v = w
    return np.column_stack([u, w, -v]) if False else np.column_stack([v, w, u])


def tube(points, r, seg=6, closed=False):
    """A round rod through a poly-line (spheres at the corners)."""
    parts = [rod(a, b, r, seg) for a, b in zip(points[:-1], points[1:])]
    for p in points[1:-1]:
        parts.append(lib.sphere(p, r * 1.02, 3, seg))
    return merge(parts)


def arc_points(c, axis, ref, radius, a0, a1, n=12):
    """Points on a circle (centre c, normal axis) from angle a0 to a1 (degrees) measured from the vector ref."""
    c, w = V(c), unit(axis)
    u = unit(V(ref) - np.dot(V(ref), w) * w)
    v = np.cross(w, u)
    out = []
    for k in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * k / n)
        out.append(c + radius * (math.cos(a) * u + math.sin(a) * v))
    return out


def lathe_y(y0, prof, seg=48, x=0.0, z=0.0, close_bottom=False, close_top=False):
    """A surface of revolution about the vertical through (x, z): prof = [(y, r), ...] with y rising. Closed ends
    when asked (discs)."""
    parts = [revolve(y0, prof, seg, x, z)]
    if close_bottom:
        parts.append(lib.disc((x, prof[0][0], z), DOWN, prof[0][1], seg))
    if close_top:
        parts.append(lib.disc((x, prof[-1][0], z), UP, prof[-1][1], seg))
    return merge(parts)


def panel_lathe(st, label, y0, y1, r0, r1, col, n_panels=4, tint=0.04, seg=48, role="body", caps=False):
    """A tapering barrel cut into `n_panels` axial bands alternately lighter and darker."""
    for k in range(n_panels):
        a = y0 + (y1 - y0) * k / n_panels
        b = y0 + (y1 - y0) * (k + 1) / n_panels
        ra = r0 + (r1 - r0) * k / n_panels
        rb = r0 + (r1 - r0) * (k + 1) / n_panels
        c = shade(col, 1 + tint * (1 if k % 2 == 0 else -1))
        st.add(label, role, c, frustum((0, a, 0), (0, b, 0), ra, rb, seg, caps=False))


def weld_ring(st, label, y, r, col, w=0.03, lift=0.008, seg=48, role="body"):
    st.add(label, role, col, frustum((0, y - w / 2, 0), (0, y + w / 2, 0), r + lift, r + lift, seg, caps=False))


def hatch_plate(st, label, y, ang, r, size, col, lift=0.012, role="body", rounded=False):
    """A flush access panel standing `lift` proud of a cylinder or cone skin at azimuth `ang` degrees."""
    a = math.radians(ang)
    n = np.array([math.cos(a), 0, math.sin(a)])
    t = np.array([-math.sin(a), 0, math.cos(a)])
    R = np.column_stack([t, [0, 1, 0], n])
    w, h = size
    st.add(label, role, col, box(n * (r + lift / 2 - 0.004) + np.array([0, y, 0]), (w, h, lift), R))


def bolt_ring(c, axis, radius, n, r_bolt, h, ref=(1, 0, 0), seg=6):
    """Bolt heads (short cylinders) standing on a circle of radius `radius` about axis through c."""
    c, w = V(c), unit(axis)
    u = unit(V(ref) - np.dot(V(ref), w) * w)
    v = np.cross(w, u)
    parts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        p = c + radius * (math.cos(a) * u + math.sin(a) * v)
        parts.append(frustum(p, p + w * h, r_bolt, r_bolt * 0.8, seg, caps=True))
    return merge(parts)


class Vehicle:
    """A tree of named parts."""

    def __init__(self, name):
        self.name = name
        self.parts = []          # dicts: name, stage, origin, children, note

    def add(self, name, stage, origin, child_of=None, note=""):
        d = {"name": name, "stage": stage, "origin": V(*origin), "children": [], "note": note}
        if child_of is None:
            self.parts.append(d)
        else:
            self.find(child_of)["children"].append(d)
        return d

    def find(self, name, lst=None):
        for d in (lst if lst is not None else self.parts):
            if d["name"] == name:
                return d
            f = self.find(name, d["children"]) if d["children"] else None
            if f:
                return f
        raise KeyError(name)

    def walk(self, lst=None, parent=None):
        for d in (lst if lst is not None else self.parts):
            yield d, parent
            yield from self.walk(d["children"], d)

    def tris(self):
        return sum(d["stage"].m.triangles() for d, _ in self.walk())

    def whole(self):
        """One Model with every part in vehicle coordinates (for the picture)."""
        m = lib.Model(self.name)
        for d, _ in self.walk():
            m.parts.extend(d["stage"].m.parts)
        return m

    def export(self, path, limit=12, crease=40.0, foil_crease=12.0, verbose=True):
        """The json write-glb-parts.mjs reads: {name, parts: [{name, origin (relative to the parent), groups, children}]}.
        The model is not modified (parts are copied before they are moved)."""
        tmp = path + ".part.json"
        stats = []

        def one(d, parent_origin):
            st = d["stage"]
            m = lib.Model(d["name"])
            m.parts = list(st.m.parts)
            o = d["origin"]
            m.transform(t=-o)
            keep = st.m
            st.m = m
            merges = st.reduce_colours(limit) if m.parts else []
            st.m = keep
            rec = {"name": d["name"], "origin": (o - parent_origin).round(5).tolist(), "groups": [], "children": []}
            if m.parts:
                tris, ncol = m.export(None, crease=crease, foil_crease=foil_crease)
                rec["groups"] = m._recs
                stats.append((d["name"], tris, ncol, merges))
            for c in d["children"]:
                rec["children"].append(one(c, o))
            return rec

        parts = [one(d, V(0, 0, 0)) for d in self.parts]
        if os.path.exists(tmp):
            os.remove(tmp)
        with open(path, "w") as fh:
            json.dump({"name": self.name, "parts": parts}, fh, separators=(",", ":"))
        if verbose:
            for n, t, c, mg in stats:
                print("  %-22s %6d tris %2d colours%s" % (n, t, c, ("  (merged %d)" % len(mg)) if mg else ""), flush=True)
            print("  %s: %d triangles in %d parts" % (self.name, sum(s[1] for s in stats), len(stats)), flush=True)
        return sum(s[1] for s in stats)


def new_stage(name):
    return Stage(name)


# ---- a faster Model.export (same json, same creased normals; the stage-builder's version loops in Python per corner) -----
def _fast_export(self, path, crease=40.0, max_colours=14, foil_crease=None):
    base_cos = math.cos(math.radians(crease))
    recs = []
    groups = self.groups()
    self.folds = []
    while len(groups) > max_colours:
        small = min(groups, key=lambda k: len(groups[k][1]))
        rgb = np.array(hexrgb(small[1]))
        cands = [k for k in groups if k != small and k[0] == small[0]] or [k for k in groups if k != small]
        near = min(cands, key=lambda k: np.sum((np.array(hexrgb(k[1])) - rgb) ** 2))
        groups[near] = merge([groups[near], groups.pop(small)])
        self.folds.append("%s %s -> %s" % (small[0], small[1], near[1]))
    for (role, colour), (Vv, F) in sorted(groups.items()):
        cosc = math.cos(math.radians(foil_crease)) if (foil_crease is not None and role == "foil") else base_cos
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
        T = len(Fw)
        corner_v = Fw.reshape(-1)                      # corner c = 3 t + i
        corner_t = np.repeat(np.arange(T), 3)
        order = np.argsort(corner_v, kind="stable")
        sv = corner_v[order]
        starts = np.nonzero(np.r_[True, sv[1:] != sv[:-1]])[0]
        ends = np.r_[starts[1:], len(sv)]
        nrm = np.zeros((len(corner_v), 3))
        for s, e in zip(starts, ends):
            cs = order[s:e]                            # the corners at this vertex
            ts = corner_t[cs]
            fu_v = fu[ts]
            M = fu_v @ fu_v.T >= cosc                  # which incident faces each corner's face smooths with
            sums = M.astype(float) @ fn[ts]
            nrm[cs] = sums
        ln = np.linalg.norm(nrm, axis=1)
        ln[ln == 0] = 1
        nrm = nrm / ln[:, None]
        q = np.round(nrm * 32).astype(np.int64)
        keyc = np.column_stack([corner_v, q])
        _, first, remap = np.unique(keyc, axis=0, return_index=True, return_inverse=True)
        remap = remap.reshape(-1)
        pos = P[corner_v[first]]
        nor = nrm[first]
        recs.append({"role": role, "colour": colour, "positions": np.round(pos, 5).tolist(), "normals": np.round(nor, 4).tolist(), "indices": remap.tolist()})
    self._recs = recs
    if path:
        with open(path, "w") as fh:
            json.dump({"name": self.name, "groups": recs}, fh, separators=(",", ":"))
    return sum(len(r["indices"]) // 3 for r in recs), len(recs)


lib.Model.export = _fast_export
