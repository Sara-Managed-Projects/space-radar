"""Parametric rocket-stage builder (release 1.4.0, stage r14-m1).

One builder, thirteen stages. A stage is a list of calls on `Stage` -- a tank barrel (with its weld rings
and stringers), a dome, a cone or a skirt, an interstage truss, a bell with its nozzle extension, a toroidal
tank, foil patches, bottles, thruster pods, pipes and boxes -- with the published dimensions as the
arguments. +Y is the stage's axis, the engine is at -Y, metres; the origin is moved to the middle of the
overall length at the end (`Stage.centre()`).

Everything is built on lib.py (the part library of release 1.3.0 W3-a): `Model.add(label, role, colour, mesh)`
with role body / foil / solar-panel; the app reads the role and the colour to pick the look (white paint,
bare metal, gold foil, black blanket ...).
"""
import math
import sys
import os

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib  # noqa: E402
from lib import (V, unit, rot, frame, merge, xf, box, frustum, rod, lathe, disc, torus, plate, grid,
                 Model, hexrgb)  # noqa: E402

UP = (0, 1, 0)
DOWN = (0, -1, 0)


def shade(hexcol, f):
    """A colour times f (f < 1 darker, > 1 lighter), clamped."""
    rgb = [max(0.0, min(1.0, c * f)) for c in hexrgb(hexcol)]
    return "#%02X%02X%02X" % tuple(int(round(c * 255)) for c in rgb)


def mix(a, b, t):
    ra, rb = hexrgb(a), hexrgb(b)
    return "#%02X%02X%02X" % tuple(int(round((x * (1 - t) + y * t) * 255)) for x, y in zip(ra, rb))


def revolve(y0, pts, seg=48, x=0.0, z=0.0):
    """A surface of revolution about the vertical line through (x, z). `pts` are (y, r) in order along
    the profile; y must be monotonic. Faces outward when y rises along the list, and also when it falls
    (the axis is turned over)."""
    pts = [(float(a), float(b)) for a, b in pts]
    if pts[-1][0] >= pts[0][0]:
        axis, prof = UP, [(a - y0, r) for a, r in pts]
    else:
        axis, prof = DOWN, [(y0 - a, r) for a, r in pts]
    return lathe((x, y0, z), axis, prof, seg)


def bell_profile(r_throat, r_exit, length, n=14, p=1.8, wall=0.0):
    """(s, r) from the throat to the exit: a Rao-like parabola, `s` along the axis away from the throat."""
    out = []
    for k in range(n + 1):
        s = k / n
        out.append((length * s, r_throat + (r_exit - r_throat) * (1 - (1 - s) ** p)))
    return out


class Stage:
    def __init__(self, name):
        self.m = Model(name)
        self.name = name
        self.notes = []

    # ---- low level -----------------------------------------------------------------------------------
    def add(self, label, role, col, mesh):
        self.m.add(label, role, col, mesh)

    def body(self, label, col, mesh):
        self.m.add(label, "body", col, mesh)

    def foil(self, label, col, mesh):
        self.m.add(label, "foil", col, mesh)

    # ---- tanks and skins -----------------------------------------------------------------------------
    def barrel(self, label, y0, y1, r, col, role="body", seg=64, welds=0, weld_col=None, weld_w=0.035,
               weld_lift=0.012, tint=0.0, panels=1, stringers=0, stringer_col=None, stringer_w=0.05,
               stringer_h=0.01, r_top=None, caps=False):
        """A cylinder (or a slightly tapering one) with `welds` equal rings, `stringers` straight ribs
        and, when `tint` is set, `panels` axial segments alternately a little lighter and darker (the
        eye reads them as skin panels)."""
        r_top = r if r_top is None else r_top
        if panels > 1 and tint:
            for k in range(panels):
                a, b = y0 + (y1 - y0) * k / panels, y0 + (y1 - y0) * (k + 1) / panels
                ra, rb = r + (r_top - r) * k / panels, r + (r_top - r) * (k + 1) / panels
                c = shade(col, 1 + tint * (1 if k % 2 == 0 else -1))
                self.add(label, role, c, frustum((0, a, 0), (0, b, 0), ra, rb, seg, caps=False))
        else:
            self.add(label, role, col, frustum((0, y0, 0), (0, y1, 0), r, r_top, seg, caps=caps))
        wc = weld_col or shade(col, 0.82)
        for k in range(1, welds + 1):
            y = y0 + (y1 - y0) * k / (welds + 1)
            rr = r + (r_top - r) * (y - y0) / (y1 - y0)
            self.add(label + "-weld", role, wc,
                     frustum((0, y - weld_w / 2, 0), (0, y + weld_w / 2, 0), rr + weld_lift, rr + weld_lift, seg, caps=False))
        if stringers:
            sc = stringer_col or shade(col, 0.88)
            for k in range(stringers):
                a = 2 * math.pi * k / stringers
                n = np.array([math.cos(a), 0, math.sin(a)])
                R = np.column_stack([np.array([-math.sin(a), 0, math.cos(a)]), np.array([0, 1, 0]), n])
                rm = (r + r_top) / 2
                self.add(label + "-stringer", role, sc,
                         box(n * (rm + stringer_h / 2) + np.array([0, (y0 + y1) / 2, 0]),
                             (stringer_w, y1 - y0, stringer_h), R))

    def ring(self, label, y, r, h, col, role="body", lift=0.02, seg=64, r_in=None):
        """A flange or band: `h` tall, standing `lift` proud of radius r."""
        self.add(label, role, col, frustum((0, y - h / 2, 0), (0, y + h / 2, 0), r + lift, r + lift, seg, caps=False))
        # the top face of the lip, so the step catches light
        self.add(label, role, col, lib.disc((0, y + h / 2, 0), UP, r + lift, seg, r_in=r))
        self.add(label, role, shade(col, 0.8), lib.disc((0, y - h / 2, 0), DOWN, r + lift, seg, r_in=r))

    def dome(self, label, y_eq, r, h, col, up=True, role="body", seg=64, n=10, welds=0, cap_r=0.0, kind="ellipse"):
        """An elliptical dome standing on the circle of radius r at y_eq, `h` tall (up or down). The pole
        can be flattened (cap_r > 0 stops short of the axis)."""
        pts = []
        for k in range(n + 1):
            t = math.radians(90 * k / n)
            rr = r * math.cos(t)
            pts.append((h * math.sin(t), max(rr, cap_r)))
        s = 1 if up else -1
        prof = [(a, b) for a, b in pts]
        axis = UP if up else DOWN
        m = lathe((0, y_eq, 0), axis, prof, seg)
        self.add(label, role, col, m)
        if welds:
            for k in range(1, welds + 1):
                t = math.radians(90 * k / (welds + 1))
                y = y_eq + s * h * math.sin(t)
                rr = r * math.cos(t)
                self.add(label + "-weld", role, shade(col, 0.82),
                         frustum((0, y - 0.015, 0), (0, y + 0.015, 0), rr + 0.006, rr + 0.006, seg, caps=False))

    def cone(self, label, y0, y1, r0, r1, col, role="body", seg=64, caps=False):
        self.add(label, role, col, frustum((0, y0, 0), (0, y1, 0), r0, r1, seg, caps=caps))

    def plate_disc(self, label, y, r, col, up=True, role="body", seg=64, r_in=0.0):
        self.add(label, role, col, lib.disc((0, y, 0), UP if up else DOWN, r, seg, r_in=r_in))

    # ---- engines -------------------------------------------------------------------------------------
    def bell(self, label, y_top, rt, re, length, col, col_in=None, x=0.0, z=0.0, seg=36, n=16, p=1.8,
             ribs=0, rib_col=None, tilt=(0, 0), role="body", wall=0.012, inner_col=None):
        """A bell nozzle hanging down from y_top (the throat plane) at (x, z): an outer shell, an inner
        shell a little in, a lip at the exit and `ribs` corrugation rings (tube-wall cooling jacket).
        `tilt` = (about x, about z) degrees for a gimballed engine."""
        prof = bell_profile(rt, re, length, n, p)
        outer = lathe((0, 0, 0), DOWN, prof, seg)
        inner = lathe((0, 0, 0), DOWN, [(s, max(r - wall, 0.01)) for s, r in prof], seg)
        inner = (inner[0], inner[1][:, ::-1])
        lip = lathe((0, -length, 0), UP, [(0, re - wall), (0.0, re), (-0.02, re)], seg) if False else None
        meshes = [("o", outer, col), ("i", inner, inner_col or shade(col, 0.55))]
        # the exit lip: a thin ring joining the two shells
        rim = frustum((0, -length, 0), (0, -length + wall * 1.6, 0), re + 0.004, re + 0.004, seg, caps=False)
        rimd = lib.disc((0, -length, 0), DOWN, re + 0.004, seg, r_in=re - wall)
        meshes.append(("lip", merge([rim, rimd]), shade(col, 0.8)))
        if ribs:
            rc = rib_col or shade(col, 0.82)
            rs = []
            for k in range(1, ribs + 1):
                s = length * k / (ribs + 1)
                rr = rt + (re - rt) * (1 - (1 - s / length) ** p)
                rs.append(frustum((0, -s - 0.012, 0), (0, -s + 0.012, 0), rr + 0.008, rr + 0.008, seg, caps=False))
            meshes.append(("ribs", merge(rs), rc))
        R = rot("x", tilt[0]) @ rot("z", tilt[1])
        for tag, mesh, c in meshes:
            self.add(label + "-" + tag, role, c, xf(mesh, R, (x, y_top, z)))

    def bell_ext(self, label, y_throat, rt, re, length, split, col_fixed, col_ext, seg=40, n=22, p=1.8,
                 ribs_fixed=10, ribs_ext=0, joint_col=None, x=0.0, z=0.0, ext_role="body", fixed_role="body"):
        """A bell whose lower part (below `split` of the length, measured from the throat) is a nozzle
        extension of another colour, with a joint ring where they meet."""
        prof = bell_profile(rt, re, length, n, p)
        a = [(s, r) for s, r in prof if s <= split + 1e-9]
        r_split = rt + (re - rt) * (1 - (1 - split / length) ** p)
        if a[-1][0] < split - 1e-9:
            a.append((split, r_split))
        b = [(split, r_split)] + [(s, r) for s, r in prof if s > split + 1e-9]
        for tag, pr, c, rl in (("fixed", a, col_fixed, fixed_role), ("ext", b, col_ext, ext_role)):
            outer = lathe((0, 0, 0), DOWN, pr, seg)
            inner = lathe((0, 0, 0), DOWN, [(s, max(r - 0.012, 0.01)) for s, r in pr], seg)
            inner = (inner[0], inner[1][:, ::-1])
            self.add(label + "-" + tag, rl, c, xf(outer, None, (x, y_throat, z)))
            self.add(label + "-" + tag + "-in", rl, shade(c, 0.6), xf(inner, None, (x, y_throat, z)))
        jc = joint_col or shade(col_fixed, 0.7)
        self.add(label + "-joint", "body", jc,
                 frustum((x, y_throat - split - 0.05, z), (x, y_throat - split + 0.05, z), r_split + 0.03, r_split + 0.03, seg, caps=False))
        rc = shade(col_fixed, 0.82)
        rs = []
        for k in range(1, ribs_fixed + 1):
            s = split * k / (ribs_fixed + 1)
            rr = rt + (re - rt) * (1 - (1 - s / length) ** p)
            rs.append(frustum((x, y_throat - s - 0.01, z), (x, y_throat - s + 0.01, z), rr + 0.007, rr + 0.007, seg, caps=False))
        if rs:
            self.add(label + "-ribs", fixed_role, rc, merge(rs))
        if ribs_ext:
            rs = []
            for k in range(1, ribs_ext + 1):
                s = split + (length - split) * k / (ribs_ext + 1)
                rr = rt + (re - rt) * (1 - (1 - s / length) ** p)
                rs.append(frustum((x, y_throat - s - 0.012, z), (x, y_throat - s + 0.012, z), rr + 0.007, rr + 0.007, seg, caps=False))
            self.add(label + "-extribs", ext_role, shade(col_ext, 0.85), merge(rs))

    def engine_head(self, label, y, r, h, col, pump_col=None, x=0.0, z=0.0, seg=24, lines=4, line_col=None):
        """The injector dome and a turbopump / gas-generator cluster above a bell: a drum, two cans and
        a ring of feed lines."""
        self.body(label + "-head", col, frustum((x, y, z), (x, y + h, z), r, r * 0.8, seg, caps=True))
        pc = pump_col or shade(col, 0.8)
        for k in range(lines):
            a = 2 * math.pi * (k + 0.3) / lines
            c0 = V(x + math.cos(a) * r * 0.95, y + h * 0.55, z + math.sin(a) * r * 0.95)
            self.body(label + "-pump", pc, frustum(c0 - V(0, h * 0.35, 0), c0 + V(0, h * 0.45, 0), r * 0.22, r * 0.22, 10, caps=True))
        lc = line_col or shade(col, 1.15)
        for k in range(lines):
            a = 2 * math.pi * (k + 0.8) / lines
            p0 = V(x + math.cos(a) * r * 0.9, y + h * 0.9, z + math.sin(a) * r * 0.9)
            p1 = V(x + math.cos(a) * r * 1.5, y + h * 1.7, z + math.sin(a) * r * 1.5)
            self.body(label + "-line", lc, rod(p0, p1, r * 0.06, 6))

    # ---- structure -----------------------------------------------------------------------------------
    def truss_band(self, label, y0, y1, r0, r1, col, n=12, tube=0.035, twist=True, rings=True, seg=6, role="body"):
        """An open lattice between two circles: `n` zig-zag pairs of tubes plus a ring at each end."""
        pts0 = [V(r0 * math.cos(2 * math.pi * k / n), y0, r0 * math.sin(2 * math.pi * k / n)) for k in range(n)]
        pts1 = [V(r1 * math.cos(2 * math.pi * (k + 0.5) / n), y1, r1 * math.sin(2 * math.pi * (k + 0.5) / n)) for k in range(n)]
        parts = []
        for k in range(n):
            parts.append(rod(pts0[k], pts1[k], tube, seg))
            parts.append(rod(pts0[(k + 1) % n], pts1[k], tube, seg))
        self.add(label, role, col, merge(parts))
        if rings:
            self.add(label + "-ring0", role, col, torus((0, y0, 0), UP, r0, tube * 1.3, 40, 6))
            self.add(label + "-ring1", role, col, torus((0, y1, 0), UP, r1, tube * 1.3, 40, 6))

    def struts(self, label, pts_a, pts_b, col, r=0.03, seg=6, role="body"):
        self.add(label, role, col, merge([rod(a, b, r, seg) for a, b in zip(pts_a, pts_b)]))

    def toroid(self, label, y, R, r, col, role="body", seg=64, side=16, squash=1.0, welds=0):
        """A toroidal tank of ring radius R and tube radius r (squash < 1 flattens it)."""
        T = torus((0, 0, 0), UP, R, r, seg, side)
        Vv, F = T
        Vv = Vv.copy()
        Vv[:, 1] *= squash
        self.add(label, role, col, (Vv + V(0, y, 0), F))

    def sphere(self, label, c, r, col, role="body", seg=20, nlat=10, squash=1.0):
        self.add(label, role, col, lib.sphere(c, r, nlat, seg, 180.0, squash))

    def bottle(self, label, c, r, col, role="body", band=True):
        """A helium / nitrogen sphere with a small boss on top and a mounting band round it."""
        self.add(label, role, col, lib.sphere(c, r, 8, 16, 180.0))
        c = V(c)
        self.add(label + "-boss", "body", shade(col, 0.6), frustum(c + V(0, r * 0.92, 0), c + V(0, r * 1.18, 0), r * 0.16, r * 0.12, 8, caps=True))
        if band:
            self.add(label + "-band", "body", shade(col, 0.55), frustum(c - V(0, r * 0.1, 0), c + V(0, r * 0.1, 0), r * 1.02, r * 1.02, 16, caps=False))

    def pipe(self, label, pts, r, col, role="body", seg=6):
        parts = [rod(a, b, r, seg) for a, b in zip(pts[:-1], pts[1:])]
        for p in pts[1:-1]:
            parts.append(lib.sphere(p, r * 1.05, 4, 6))
        self.add(label, role, col, merge(parts))

    def pad(self, label, y, ang_deg, r, size, col, role="body", lift=0.01, thick=0.04, tilt=0.0):
        """A box standing on the skin at height y and azimuth ang (degrees), `size` = (width, height, depth)."""
        a = math.radians(ang_deg)
        n = np.array([math.cos(a), 0, math.sin(a)])
        t = np.array([-math.sin(a), 0, math.cos(a)])
        R = np.column_stack([t, [0, 1, 0], n])
        w, h, d = size
        self.add(label, role, col, box(n * (r + d / 2 - lift) + np.array([0, y, 0]), (w, h, d), R))

    def thruster_pod(self, label, y, ang_deg, r, col, nozzle_col, n=2, spread=0.12, size=(0.22, 0.14, 0.1), dirv=(0, 0, 1)):
        a = math.radians(ang_deg)
        nn = np.array([math.cos(a), 0, math.sin(a)])
        t = np.array([-math.sin(a), 0, math.cos(a)])
        R = np.column_stack([t, [0, 1, 0], nn])
        w, h, d = size
        self.body(label, col, box(nn * (r + d / 2 - 0.01) + np.array([0, y, 0]), (w, h, d), R))
        for k in range(n):
            off = (k - (n - 1) / 2) * spread
            base = nn * (r + d - 0.01) + t * off + np.array([0, y, 0])
            self.body(label + "-n", nozzle_col, frustum(base, base + nn * 0.09, 0.022, 0.04, 8, caps=True))

    def foil_patches(self, label, y0, y1, r, col, count, seed=1, size=(0.5, 0.4), amp=0.012, lift=0.012, ang_span=(0, 360),
                     seg_u=4, seg_v=4):
        """Rumpled blanket patches on a cylinder: `count` rectangles bent round the skin, wrinkled `amp`."""
        rng = np.random.default_rng(seed)
        parts = []
        for k in range(count):
            a0 = math.radians(rng.uniform(*ang_span))
            wv = size[0] * rng.uniform(0.7, 1.3)
            hv = size[1] * rng.uniform(0.7, 1.2)
            yc = rng.uniform(y0 + hv / 2, y1 - hv / 2)
            da = wv / r
            P = []
            for i in range(seg_u + 1):
                for j in range(seg_v + 1):
                    a = a0 + da * (i / seg_u - 0.5)
                    y = yc + hv * (j / seg_v - 0.5)
                    edge = i in (0, seg_u) or j in (0, seg_v)
                    rr = r + lift + (0 if edge else rng.uniform(-1, 1) * amp)
                    P.append([rr * math.cos(a), y, rr * math.sin(a)])
            F = []
            for i in range(seg_u):
                for j in range(seg_v):
                    p0, p1, p2, p3 = i * (seg_v + 1) + j, (i + 1) * (seg_v + 1) + j, (i + 1) * (seg_v + 1) + j + 1, i * (seg_v + 1) + j + 1
                    # a increases counter-clockwise seen from +Y, so [p0, p3, p2] faces outward
                    F += [[p0, p3, p2], [p0, p2, p1]]
            parts.append((np.array(P), np.array(F)))
        self.foil(label, col, merge(parts))

    # ---- finish --------------------------------------------------------------------------------------
    def centre(self):
        lo, hi = self.m.bounds()
        self.m.transform(t=(0, -(lo[1] + hi[1]) / 2, 0))
        return hi[1] - lo[1]

    def export(self, outdir, views=None, size=460):
        os.makedirs(outdir, exist_ok=True)
        length = self.centre()
        js = os.path.join(outdir, self.name + ".json")
        tris, ncol = self.m.export(js, crease=40, foil_crease=12)
        return js, None, tris, ncol, length
