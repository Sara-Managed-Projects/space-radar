"""Parts shared by the communications-satellite builders (release 1.9.0, batch comms): on the part library of
tools/stage-builder/lib.py. Metres, the app's axes for a satellite: +Z the Earth face, +X the wing axis, +Y the
side the cells face. Every part is a flat colour of ours in one of the app's roles (body, foil, solar-panel)."""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "stage-builder"))
import lib  # noqa: E402
from lib import V, unit, rot, box, frustum, rod, lathe, sphere, disc, torus, merge, xf, grid, quad, Model  # noqa: E402


def frame_of(n, up=(0, 1, 0)):
    """An orthonormal matrix whose +Z column is n (u, v, n)."""
    n = unit(n)
    u = unit(np.cross(up, n)) if abs(np.dot(unit(up), n)) < 0.95 else unit(np.cross((1, 0, 0), n))
    v = np.cross(n, u)
    return np.column_stack([u, v, n])


def edge_strips(c, size, width, lift, faces, crinkle=0.012, seed=1):
    """Rumpled foil strips along the edges of the chosen faces of a box centred on c (size sx, sy, sz):
    `faces` is a string of 'xXyYzZ' as lib.box. A strip is `width` wide, stands `lift` proud, runs the whole edge."""
    c = V(c)
    sx, sy, sz = size
    out = []
    spec = {"x": ((-1, 0, 0), (0, 1, 0), (0, 0, 1), sy, sz), "X": ((1, 0, 0), (0, 1, 0), (0, 0, 1), sy, sz),
            "y": ((0, -1, 0), (1, 0, 0), (0, 0, 1), sx, sz), "Y": ((0, 1, 0), (1, 0, 0), (0, 0, 1), sx, sz),
            "z": ((0, 0, -1), (1, 0, 0), (0, 1, 0), sx, sy), "Z": ((0, 0, 1), (1, 0, 0), (0, 1, 0), sx, sy)}
    half = {"x": sx, "X": sx, "y": sy, "Y": sy, "z": sz, "Z": sz}
    k = 0
    for f in faces:
        n, u, v, su, sv = spec[f]
        n, u, v = V(n), V(u), V(v)
        fc = c + n * (half[f] / 2 + lift / 2)
        for sgn in (-1, 1):
            out.append(_strip(fc + v * sgn * (sv / 2 - width / 2), u, v, n, su, width, lift, crinkle, seed + k))
            k += 1
            out.append(_strip(fc + u * sgn * (su / 2 - width / 2), v, u, n, sv, width, lift, crinkle, seed + k))
            k += 1
    return merge(out)


def _strip(c, along, across, n, length, width, lift, crinkle, seed):
    """One rumpled strip, a sheet `length` x `width` lying on a face, lifted by `lift`."""
    nu = max(2, int(length / 0.25))
    return grid(c + unit(n) * lift / 2, along, across, length, width, nu, 2, crinkle=crinkle, seed=seed)


def dish(c, axis, r, depth, seg=20, rim=0.0, rings=5):
    """A paraboloid dish with its vertex at c looking along axis (the open side), radius r, depth `depth`."""
    prof = []
    for k in range(rings + 1):
        s = k / rings
        prof.append((depth * s * s, r * s))
    prof2 = [(p[0] + 0.004, p[1]) for p in prof][::-1]
    a = lathe(c, axis, prof, seg)
    b = lathe(c, axis, [(0.0, 0.0)] + [(p[0] - 0.006, p[1]) for p in prof[1:]], seg)
    return merge([a, (b[0], b[1][:, ::-1])])


def solar_panel(c, u, v, su, sv, cells, gap, frame_col, cell_col, back_col, thick=0.025, border=0.02):
    """A solar panel: substrate with its back in back_col, cell tiles on the +n face (n = u x v)."""
    return lib.cell_panel(c, u, v, su, sv, cells, gap, frame_col, cell_col=cell_col, thick=thick, back_col=back_col, border=border)


def hex_cells(c, n, u, radius, cell, gap, shape=None):
    """A field of hexagonal tiles (a phased array's elements) filling a disc/ellipse; returns [(mesh)] as one merged mesh.
    `cell` is the flat-to-flat size of one tile; `shape(x, y)` -> bool decides which centres are kept."""
    c, n, u = V(c), unit(n), unit(u)
    v = np.cross(n, u)
    step = cell + gap
    rows = int(radius * 2 / (step * 0.866)) + 2
    cols = int(radius * 2 / step) + 2
    tiles = []
    for j in range(-rows, rows + 1):
        for i in range(-cols, cols + 1):
            x = (i + 0.5 * (j % 2)) * step
            y = j * step * 0.866
            if shape is not None and not shape(x, y):
                continue
            p = c + u * x + v * y
            tiles.append(lib.prism(p, n, 6, cell, 0.004))
    return merge(tiles)
