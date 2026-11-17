"""Parts shared by the four rebuilds of release 2.1.0 (batch models-weak): on the part library of tools/stage-builder/lib.py,
the helpers of tools/comms-builder/clib.py and the bus parts of tools/bus-builder/glib.py. Metres, the app's axes for a satellite:
+Z the Earth face, +X the wing axis, +Y the side the cells face. Every part is a flat colour of ours in one of the app's roles."""
import math
import os
import sys

import numpy as np

WHERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(WHERE, "..", "bus-builder"))
sys.path.insert(0, os.path.join(WHERE, "..", "comms-builder"))
sys.path.insert(0, os.path.join(WHERE, "..", "stage-builder"))
from glib import *  # noqa: F401,F403,E402
import lib  # noqa: E402
from lib import V, unit, rot, box, frustum, rod, lathe, sphere, disc, torus, merge, xf, grid, quad, plate, prism, Model  # noqa: E402,F401


def inset(points, d):
    """A convex outline (counter-clockwise in its plane) moved inward by d on every edge (2-D points)."""
    P = [np.array(p, float) for p in points]
    n = len(P)
    lines = []
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]
        t = unit(b - a)
        nrm = np.array([-t[1], t[0]])
        lines.append((a + nrm * d, t))
    out = []
    for i in range(n):
        p0, t0 = lines[i - 1]
        p1, t1 = lines[i]
        A = np.array([[t0[0], -t1[0]], [t0[1], -t1[1]]])
        s = np.linalg.solve(A, p1 - p0)
        out.append(p0 + t0 * s[0])
    return out


def fluted(c, axis, r_rim, r_tip, depth, flutes, seg=48, rings=4, amp=0.05, inside=True):
    """A shallow cone cup (a dish of pleats): rim radius r_rim at c+axis*depth, tip radius r_tip at c, `flutes` ribs round it. Open to +axis.
    Returns the surface as one mesh (the faces look along +axis, into the cup)."""
    c, w = V(c), unit(axis)
    u, v = lib.frame(w)
    P, F = [], []
    for k in range(rings + 1):
        s = k / rings
        r = r_tip + (r_rim - r_tip) * s
        for i in range(seg):
            t = 2 * math.pi * i / seg
            rr = r * (1 + amp * s * math.cos(flutes * t))
            P.append(c + w * (depth * s ** 1.4) + rr * (math.cos(t) * u + math.sin(t) * v))
    for k in range(rings):
        for i in range(seg):
            j = (i + 1) % seg
            p0, p1, p2, p3 = k * seg + i, k * seg + j, (k + 1) * seg + j, (k + 1) * seg + i
            F += [[p0, p2, p1], [p0, p3, p2]] if inside else [[p0, p1, p2], [p0, p2, p3]]
    return np.array(P), np.array(F, dtype=np.int64)


def hexplate(c, n, u, across, thick=0.02):
    """A regular hexagonal plate with a corner toward u."""
    c, n, u = V(c), unit(n), unit(u)
    v = np.cross(n, u)
    R = across / 2
    pts = [c + R * (math.cos(math.radians(60 * k)) * u + math.sin(math.radians(60 * k)) * v) for k in range(6)]
    return plate(pts, thick, n)


def wall(a, b, z0, z1, out2d, nu=8, nv=2, crinkle=0.012, seed=1):
    """A rumpled foil wall on the edge a-b (2-D points) of an outline, from height z0 to z1, facing outward (out2d)."""
    a, b = np.array(a, float), np.array(b, float)
    cx = (a + b) / 2
    L = np.linalg.norm(b - a)
    n = unit(np.array([out2d[0], out2d[1], 0.0]))
    v = np.array([0, 0, 1.0])
    u = np.cross(v, n)
    return grid((cx[0], cx[1], (z0 + z1) / 2), u, v, L, z1 - z0, nu, nv, crinkle=crinkle, seed=seed)


def outline_walls(m, pts, z0, z1, colour, label="wall", crinkle=0.014, seed=1, skip=(), step=0.22):
    """Rumpled foil walls round a convex outline (counter-clockwise)."""
    P = [np.array(p, float) for p in pts]
    n = len(P)
    cen = sum(P) / n
    for i in range(n):
        if i in skip:
            continue
        a, b = P[i], P[(i + 1) % n]
        mid = (a + b) / 2
        t = b - a
        out = np.array([t[1], -t[0]])
        if np.dot(out, mid - cen) < 0:
            out = -out
        L = np.linalg.norm(t)
        m.add(label, "foil", colour, wall(a, b, z0, z1, out, nu=max(3, int(L / step)), nv=max(2, int((z1 - z0) / step)), crinkle=crinkle, seed=seed + i))


def finish(model, fid, views=None, out="out"):
    """Write out/<id>.json and a picture; print what was built."""
    os.makedirs(os.path.join(WHERE, out), exist_ok=True)
    tris, ncol = model.export(os.path.join(WHERE, out, fid + ".json"))
    lo, hi = model.bounds()
    print(fid, "triangles", tris, "colours", ncol, "folds", getattr(model, "folds", []), "size", np.round(hi - lo, 2))
    return tris, ncol
