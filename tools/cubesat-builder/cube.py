"""CubeSat models of release 2.0.0 (batch m2-buses; forge #118): 1U, 2U, 3U, 6U and 12U, each stowed (body-mounted cells) and, for 3U, 6U and 12U, with two
deployed wings; plus Spire's Lemur-2 as the NASA photograph shows it. On the part library of tools/stage-builder/lib.py.

Metres, the app's axes for a satellite: the long axis is Z (the end with the aperture or the antenna on +Z, the Earth end), the wings come out of the +/-X faces and their cells
face +Y. The standard fixes the body: the CubeSat Design Specification rev. 14.1 (cubesat.org, 2022-02-09) gives a 1U as 100 x 100 x 113.5 mm, a 2U as 227.0 mm long, a 3U as 340.5 mm,
a 6U as 100 x 226.3 x 366 mm and a 12U as 226.3 x 226.3 x 366 mm, with rails at least 8.5 mm wide. WHAT THE STANDARD DOES NOT FIX, AND IS OURS: the cell layout (two 40 x 80 mm cells
a unit on each long face), the end plates' fittings and the antenna, and the deployed wings (three hinged panels a side, each 0.095 m out by the body's length along it, read off the
public-domain NASA photograph of a Planet Dove with its wings open, ISS-49, `ISS-49 CubeSat deploying.jpg` on Wikimedia Commons, looked at only). Which craft wears the wings is read from
McDowell's GCAT `Shape` column ('Box + 2 pan' against 'Box'), which registry/cubesats.yaml cites per catalogue number.
"""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "comms-builder"))
from clib import *  # noqa: F401,F403,E402
import lib  # noqa: E402

RAIL = "#B9BEC6"
RAIL_D = "#8F97A3"
PLATE = "#C9CDD3"        # anodised aluminium end plates
SIDE = "#454B55"         # the PCB back and the frame between cells
CELL = "#223A6E"
CELL_D = "#1B2D55"
GOLD = "#C9A24A"
BLACK = "#24272E"
GREY = "#6C737E"
GREEN = "#2F7A52"
WING_BACK = "#D8CBB4"    # the pale back of a Dove's wing, as the photograph shows it
WHITE = "#E6E9EE"

DIMS = {  # units -> (x, y, z) in metres
    "1u": (0.1, 0.1, 0.1135), "2u": (0.1, 0.1, 0.227), "3u": (0.1, 0.1, 0.3405),
    "6u": (0.2263, 0.1, 0.366), "12u": (0.2263, 0.2263, 0.366),
}
RW = 0.0085  # rail width, the standard's minimum


def long_faces(m, x, y, z, cell_rows=None):
    """Body-mounted cell panels on the four long faces: a dark PCB panel and two cells a unit (40 x 80 mm), a 2 mm border."""
    units = max(1, round(z / 0.1135))
    for axis, sgn in (("x", 1), ("x", -1), ("y", 1), ("y", -1)):
        if axis == "x":
            n, u, v, su, sv = V(sgn, 0, 0), V(0, 1, 0), V(0, 0, 1), y, z
            c = V(sgn * (x / 2 + 0.002), 0, 0)
        else:
            n, u, v, su, sv = V(0, sgn, 0), V(0, 0, 1), V(1, 0, 0), z, x
            c = V(0, sgn * (y / 2 + 0.002), 0)
        # the panel: u x v must point along n; swap when it does not
        if np.dot(np.cross(u, v), n) < 0:
            u, v, su, sv = v, u, sv, su
        inner_u, inner_v = su - 2 * RW - 0.004, sv - 2 * RW - 0.004
        m.add("pcb", "body", SIDE, lib.grid(c, u, v, inner_u + 0.004, inner_v + 0.004, 1, 1))
        # cells: columns along the short side of 0.042 pitch, rows 0.082 pitch along the long side
        long_is_u = abs(np.dot(u, V(0, 0, 1))) > 0.5
        lng, sht = (inner_u, inner_v) if long_is_u else (inner_v, inner_u)
        ncol = max(1, int(sht // 0.042))
        nrow = max(2, int(lng // 0.082))
        cl, cs = lng / nrow - 0.004, sht / ncol - 0.004
        tiles = []
        for i in range(nrow):
            for j in range(ncol):
                a = -lng / 2 + (i + 0.5) * lng / nrow
                b = -sht / 2 + (j + 0.5) * sht / ncol
                pu, pv = (a, b) if long_is_u else (b, a)
                su_, sv_ = (cl, cs) if long_is_u else (cs, cl)
                tiles.append(lib.grid(c + n * 0.001 + u * pu + v * pv, u, v, su_, sv_, 1, 1))
        m.add("cells", "solar-panel", CELL, lib.merge(tiles))


def frame(m, x, y, z):
    """Four rails (8.5 mm square, the standard's minimum), a frame, two end plates."""
    m.add("frame", "body", SIDE, lib.box((0, 0, 0), (x - 0.002, y - 0.002, z - 0.002)))
    for ex in (-1, 1):
        for ey in (-1, 1):
            m.add("rail", "body", RAIL, lib.box((ex * (x / 2 - RW / 2), ey * (y / 2 - RW / 2), 0), (RW, RW, z)))
            # the rail ends stand a hair proud: the dispenser's contact
            for ez in (-1, 1):
                m.add("rail-end", "body", RAIL_D, lib.box((ex * (x / 2 - RW / 2), ey * (y / 2 - RW / 2), ez * (z / 2 + 0.0015)), (RW * 0.9, RW * 0.9, 0.003)))
    # the end plates: aluminium, with a recess frame
    for ez in (-1, 1):
        m.add("end-plate", "body", PLATE, lib.grid((0, 0, ez * (z / 2 + 0.0005)), (1, 0, 0) if ez > 0 else (0, 1, 0), (0, 1, 0) if ez > 0 else (1, 0, 0), x - 2 * RW, y - 2 * RW, 1, 1))
        m.add("end-recess", "body", RAIL_D, lib.torus((0, 0, ez * (z / 2 + 0.002)), (0, 0, 1), min(x, y) * 0.3, 0.0015, 24, 4))


def fittings(m, x, y, z):
    """The +Z end: an aperture window with a baffle, a patch antenna, a sun sensor; the -Z end: a separation switch, a remove-before-flight pin socket, an access port."""
    zt = z / 2
    s = min(x, y)
    m.add("aperture", "body", BLACK, lib.frustum((0, 0, zt), (0, 0, zt + 0.012), s * 0.22, s * 0.2, 20))
    m.add("aperture-baffle", "body", GREY, lib.frustum((0, 0, zt + 0.012), (0, 0, zt + 0.03), s * 0.21, s * 0.25, 20, caps=False))
    m.add("aperture-glass", "body", "#243044", lib.disc((0, 0, zt + 0.013), (0, 0, 1), s * 0.19, 20))
    m.add("sun-sensor", "body", BLACK, lib.box((s * 0.33, s * 0.33, zt + 0.003), (0.012, 0.012, 0.006)))
    m.add("patch", "body", GOLD, lib.box((-s * 0.3, s * 0.3, zt + 0.003), (0.03, 0.03, 0.004)))
    zb = -z / 2
    m.add("rbf-socket", "body", RAIL_D, lib.frustum((s * 0.28, 0, zb), (s * 0.28, 0, zb - 0.008), 0.007, 0.007, 12))
    m.add("rbf-pin-flag", "body", "#B33A3A", lib.box((s * 0.28, 0, zb - 0.012), (0.03, 0.008, 0.002)))
    m.add("access-port", "body", BLACK, lib.frustum((-s * 0.28, 0, zb), (-s * 0.28, 0, zb - 0.006), 0.011, 0.011, 12))
    m.add("sep-switch", "body", GREY, lib.box((0, s * 0.3, zb - 0.002), (0.012, 0.012, 0.004)))


def whip(m, x, y, z, length=0.17):
    """A UHF whip, a tape-measure blade (we draw it straight, rod 1.2 mm), from a socket on the aft end, out along the body."""
    p = V(-x * 0.3, -y * 0.3, -z / 2)
    m.add("whip-socket", "body", GREY, lib.frustum(p, p + V(0, 0, -0.008), 0.005, 0.004, 8))
    m.add("whip", "foil", RAIL, lib.rod(p + V(0, 0, -0.008), p + V(x * 0.55, y * 0.2, -0.008 - length * 0.6), 0.0012, 4))


def wings(m, x, y, z, panels=3, out=0.095):
    """Two wings of `panels` hinged panels, each `out` m out by the body's length, on hinges along the +/-X rails. Cells face +Y, the pale back -Y."""
    for sgn in (-1, 1):
        x0 = sgn * (x / 2 + 0.002)
        for k in range(panels):
            xc = x0 + sgn * (out * (k + 0.5) + 0.004 * k)
            # the panel: u = Z, v = X so that n = u x v = +Y
            for role, col, mesh in lib.cell_panel((xc, y / 2 * 0.0, 0), (0, 0, 1), (1, 0, 0), z * 0.96, out, (max(2, round(z / 0.082)), max(1, int(out // 0.042))), 0.003, WING_BACK, cell_col=CELL, thick=0.003, back_col=WING_BACK, border=0.004):
                m.add("wing-panel", role, col, mesh)
            m.add("wing-hinge", "body", GREY, lib.rod((x0 + sgn * (out * k + 0.004 * k), 0.0, -z * 0.45), (x0 + sgn * (out * k + 0.004 * k), 0.0, z * 0.45), 0.0028, 6))
        m.add("wing-root", "body", RAIL_D, lib.box((x0 - sgn * 0.002, 0, 0), (0.006, 0.012, z * 0.92)))


def build(units="3u", with_wings=False):
    X, Y, Z = DIMS[units]
    m = Model("cubesat-" + units + ("-wings" if with_wings else ""))
    frame(m, X, Y, Z)
    long_faces(m, X, Y, Z)
    fittings(m, X, Y, Z)
    whip(m, X, Y, Z)
    if with_wings:
        wings(m, X, Y, Z)
    return m
