"""QPS-SAR (release 2.0.0, batch m3-mid; forge #174): iQPS's X-band SAR microsatellites, the twelve of units 5 and later in the catalogue, on the part library of tools/stage-builder/lib.py.

WHAT MAKES IT QPS-SAR (written down before building):
  1. a 3.6 m deployable mesh dish, a deep bowl (1.0 m deep) of pale gold mesh gores held by thin curved ribs and a double rim hoop;
  2. a small feed reflector (a shallow saucer) held above the bowl on a three-legged stand;
  3. a 0.8 m cube bus under the bowl's apex, its faces tiled with black cells in gold frames;
  4. a spray of fine wires between the bowl's root and the bus (the folding mechanism's springs and cords).
Sources (looked at only; none is traced or shipped): the photograph of a QPS-SAR with its 3.6 m antenna deployed in a hall, in eoPortal's QPS-SAR article (Figure 1, credit iQPS) and
iQPS's artist's rendition of QPS-SAR 3 on the same page; eoPortal's text ('0.8 m in diameter and 0.15 m in height when stowed ... unfolds to a seamless bowl 3.6 m in diameter', 'body-mounted solar
panels', ~100 kg); the bus 0.8 x 0.8 x 0.8 m and the antenna 3.6 x 1.0 m are in iQPS's investor presentations (the photograph there is QPS-SAR 1's flight model); the 36 leaf springs from
unit 3 on are in the same filings. WHAT IS OURS: the paraboloid's profile (a parabola of 3.6 m by 1.0 m), the gores as flat facets between ribs, the rib section, the stand's height and
legs (a photograph shows three), the saucer's 0.5 m, the cell grid on the faces, the wires' count; the rendition shows two small deployed panels on arms that the photograph and the text do
not, and they are not drawn.
Metres, the app's axes for a satellite: Earth side +Z; the dish opens toward +Z, the bus is on -Z of the apex, with a 0.05 m gap.
"""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "stage-builder"))
import lib  # noqa: E402
from lib import V, Model  # noqa: E402

MESH = "#DDBB6A"
RIB = "#A9843F"
GOLD = "#C9A24A"
CELL = "#14171F"
FOIL = "#BE9335"
WHITE = "#D5D6D4"
SAUCER = "#6E5C3C"
GREY = "#8E9299"

CUBE = 0.8
D, DEPTH = 3.6, 1.0
FOC = (D / 2) ** 2 / (4 * DEPTH)  # parabola z = r^2 / (4 f)
R_HUB = 0.25
N_RIBS = 36
Z_APEX = CUBE / 2 + 0.05


def dish_z(r):
    return Z_APEX + r * r / (4 * FOC)


def bowl(m):
    rows = 14
    rs = np.linspace(R_HUB, D / 2, rows + 1)
    verts, faces = [], []
    for k in range(N_RIBS):
        a0, a1 = 2 * math.pi * k / N_RIBS, 2 * math.pi * (k + 1) / N_RIBS
        base = len(verts)
        for r in rs:
            verts.append((r * math.cos(a0), r * math.sin(a0), dish_z(r)))
            verts.append((r * math.cos(a1), r * math.sin(a1), dish_z(r)))
        for i in range(rows):
            p0, p1, p2, p3 = base + 2 * i, base + 2 * i + 1, base + 2 * i + 2, base + 2 * i + 3
            # the dish opens toward +Z: the inside faces +Z (counter-clockwise seen from +Z)
            faces += [[p0, p2, p1], [p1, p2, p3]]
    mesh = (np.array(verts), np.array(faces, dtype=np.int64))
    # a mesh is seen from both sides
    m.add("mesh", "foil", MESH, lib.merge([mesh, (mesh[0].copy(), mesh[1][:, ::-1].copy())]))
    ribs = []
    for k in range(N_RIBS):
        a = 2 * math.pi * k / N_RIBS
        pts = [V(r * math.cos(a), r * math.sin(a), dish_z(r) + 0.004) for r in rs]
        ribs += [lib.rod(pts[i], pts[i + 1], 0.011, 4) for i in range(rows)]
    m.add("ribs", "body", RIB, lib.merge(ribs))
    zr = dish_z(D / 2)
    m.add("rim-hoop", "body", RIB, lib.torus((0, 0, zr + 0.004), (0, 0, 1), D / 2, 0.016, 72, 6))
    m.add("rim-hoop-2", "body", RIB, lib.torus((0, 0, zr - 0.07), (0, 0, 1), D / 2 - 0.02, 0.011, 72, 6))
    m.add("hub", "body", GOLD, lib.frustum((0, 0, Z_APEX - 0.02), (0, 0, Z_APEX + 0.03), R_HUB + 0.02, R_HUB + 0.01, 36))


def feed(m):
    """A three-legged stand rising from the hub past the rim, and the shallow saucer on top."""
    zt = dish_z(D / 2) + 0.2
    legs = []
    for q in range(3):
        a = 2 * math.pi * q / 3 + math.pi / 6
        legs.append(lib.rod(V(0.22 * math.cos(a), 0.22 * math.sin(a), Z_APEX + 0.03), V(0.06 * math.cos(a), 0.06 * math.sin(a), zt - 0.02), 0.014, 8))
    m.add("feed-legs", "body", WHITE, lib.merge(legs))
    # a collar where the legs meet the hub, and a cross-brace a third of the way up (the photograph shows a small junction there)
    m.add("feed-brace", "body", WHITE, lib.torus((0, 0, Z_APEX + 0.33), (0, 0, 1), 0.17, 0.009, 18, 5))
    m.add("saucer", "body", SAUCER, lib.frustum((0, 0, zt - 0.02), (0, 0, zt + 0.05), 0.06, 0.25, 28))
    m.add("saucer-top", "body", GOLD, lib.disc((0, 0, zt + 0.051), (0, 0, 1), 0.245, 28))


def bus(m):
    h = CUBE / 2
    m.add("bus-frame", "body", "#4A3E20", lib.box((0, 0, 0), (CUBE, CUBE, CUBE - 0.004)))
    m.add("bus-top", "foil", FOIL, lib.box((0, 0, 0), (CUBE + 0.002, CUBE + 0.002, CUBE - 0.006), crinkle=0.004, seed=5, div=0.1, faces="Z"))
    tiles = []
    for axis, sgn in (("x", 1), ("x", -1), ("y", 1), ("y", -1), ("z", -1)):
        if axis == "x":
            n, u, v = V(sgn, 0, 0), V(0, 0, 1), V(0, 1, 0)
        elif axis == "y":
            n, u, v = V(0, sgn, 0), V(1, 0, 0), V(0, 0, 1)
        else:
            n, u, v = V(0, 0, sgn), V(0, 1, 0), V(1, 0, 0)
        if np.dot(np.cross(u, v), n) < 0:
            u, v = v, u
        c0 = n * (h + 0.0015)
        ncol, nrow = 2, 15
        cw, ch = (CUBE - 0.06) / ncol - 0.006, (CUBE - 0.06) / nrow - 0.003
        for i in range(ncol):
            for j in range(nrow):
                a = -(CUBE - 0.06) / 2 + (i + 0.5) * (CUBE - 0.06) / ncol
                b = -(CUBE - 0.06) / 2 + (j + 0.5) * (CUBE - 0.06) / nrow
                tiles.append(lib.grid(c0 + u * a + v * b, u, v, cw, ch))
    m.add("cells", "solar-panel", CELL, lib.merge(tiles))
    rails = []
    for ex in (-1, 1):
        for ey in (-1, 1):
            rails.append(lib.box((ex * h, ey * h, 0), (0.016, 0.016, CUBE + 0.004)))
    m.add("bus-rails", "body", FOIL, lib.merge(rails))
    # the spray of wires between the bowl's root and the bus's top edge
    wires = []
    for k in range(N_RIBS):
        a = 2 * math.pi * k / N_RIBS
        wires.append(lib.rod(V(0.27 * math.cos(a), 0.27 * math.sin(a), Z_APEX), V(0.46 * math.cos(a), 0.46 * math.sin(a), h + 0.002), 0.0035, 4))
    m.add("wires", "body", GREY, lib.merge(wires))


def build():
    m = Model("qps")
    bus(m)
    bowl(m)
    feed(m)
    return m
