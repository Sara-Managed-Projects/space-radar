"""The bus the two X-ray observatories share, XRISM (2023) and Hitomi / ASTRO-H (2016): built in code, metres, the app's axes
(+Z toward the Earth face, the mirrors at -Z, the paddles along X, their cells toward +Y).

PUBLISHED (arXiv 2303.00985 section 2.2, opened 2026-10-13): the envelope 7.9 x 9.2 x 3.1 m; 'the main body is composed of eight side panels
(SP1-8) of 990 x 3100 mm'; the paddles are stowed on SP2 and SP4. From that: an octagonal bus 2.39 m across its flats and 3.1 m high,
two paddles reaching 4.6 m from the axis.
READ OFF PICTURES, LOOKED AT ONLY (nothing of them is in the file): NASA Goddard's turntable renders of XRISM (Commons, public domain: the pale
blue panels of the bus with gold edges, a gold blanketed flare above it and a gold drum, four dark barrels on the top, two three-panel dark
paddles low on the bus, a round dark aperture ring at the base) and NASA's drawing of Hitomi (Commons, public domain: the octagonal
bus under a short drum with four barrels, a square tube with an octagonal plate on the base).
OURS (not published; marked so in the registry rows): the heights of the flare and the drum, the drum's radius, the barrels' sizes and
places, the panel colours, the seams, the equipment bay, the paddle booms, every fitting.
"""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "weak-builder"))
import wlib  # noqa: E402
from wlib import *  # noqa: E402,F401,F403
import lib  # noqa: E402

GOLD_F = "#C9A24A"
GOLD_DK = "#9C7A33"
GOLD_LT = "#DDBB62"
PANEL = "#A7B6CC"        # the bus's painted panels, pale blue-grey in the renders
PANEL_D = "#7E8FA8"
FRAME = "#D5DAE2"
BAY = "#575D68"
BAY_L = "#9AA1AD"
WHITE_R = "#E3E7EC"
APERTURE = "#15171B"
COPPER = "#B8782E"
CELLS = "#243F85"
BACKS = "#AEB5BF"
HINGE = "#8E96A3"

APO = 1.195              # the bus's flats, half of 2.39 m (990 mm sides)
ACR = APO / math.cos(math.pi / 8)
BUS_H = 3.1              # the eight panels' 3 100 mm
Z_TOP, Z_BASE = -3.95, 3.95


def foil_cone(m, label, z0, r0, z1, r1, n=20, col=GOLD_F, crinkle=0.02, seed=1, nu=2, nz=None, role="foil"):
    """A rumpled foil wall: a frustum of n facets between the rings (r0 at z0) and (r1 at z1), facing outward."""
    nz = nz or max(2, int(abs(z1 - z0) / 0.3))
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        A = (r0 * math.cos(a0), r0 * math.sin(a0), z0)
        B = (r0 * math.cos(a1), r0 * math.sin(a1), z0)
        C = (r1 * math.cos(a1), r1 * math.sin(a1), z1)
        D = (r1 * math.cos(a0), r1 * math.sin(a0), z1)
        mid = (math.cos((a0 + a1) / 2), math.sin((a0 + a1) / 2), 0)
        m.add(label, role, col, lib.quad(A, B, C, D, nu, nz, crinkle=crinkle, seed=seed + i, outward=mid))


def ring(c, r, tube, col, m, label="band", seg=40):
    m.add(label, "body", col, lib.torus(c, (0, 0, 1), r, tube, seg, 5))


def barrel(m, c, r, length, label, col_rim=SILVER, seg=24):
    """A barrel standing on the top plate at c, reaching to -Z: a gold-wrapped tube, a silver rim and a dark aperture."""
    c = V(c)
    tip = c + V(0, 0, -length)
    m.add(label + "-tube", "foil", GOLD_DK, frustum(c, tip, r, r * 0.97, seg))
    m.add(label + "-rim", "body", col_rim, lib.torus(tip, (0, 0, 1), r * 0.99, r * 0.07, seg, 5))
    m.add(label + "-aperture", "body", APERTURE, lib.dome(tip + V(0, 0, 0.01), r * 0.93, axis=(0, 0, -1), nlat=4, nlon=seg, height=r * 0.45))


def bus(m, seed=10, bay_face=6, flare=True):
    """The octagonal bus, its panels and corner posts, the base, and the gold flare and drum above it."""
    zb0, zb1 = Z_BASE - BUS_H, Z_BASE          # the bus from z = 0.85 to 3.95
    m.add("bus-core", "body", BAY, lib.prism((0, 0, zb0), (0, 0, 1), 8, 2 * APO - 0.1, BUS_H, start=(1, 0, 0)))
    for k in range(8):
        th = math.pi / 4 * k
        n = V(math.cos(th), math.sin(th), 0)
        t = V(-math.sin(th), math.cos(th), 0)
        zc = (zb0 + zb1) / 2
        R = np.column_stack([t, n, V(0, 0, 1)])
        c = n * (APO - 0.015) + V(0, 0, zc)
        if k == bay_face:
            # an open equipment bay: a dark recess with boxes in it
            m.add("bay-floor", "body", BAY, lib.box(c - n * 0.06, (0.9, 0.04, BUS_H - 0.1), R))
            rng = np.random.default_rng(seed)
            for j in range(7):
                zz = zb0 + 0.3 + j * 0.4
                w = rng.uniform(0.3, 0.7)
                m.add("bay-unit", "body", BAY_L if j % 2 else WHITE_R, lib.box(n * (APO - 0.09) + t * rng.uniform(-0.18, 0.18) + V(0, 0, zz), (w, 0.1, 0.28), R))
            continue
        m.add("panel", "body", PANEL, lib.box(c, (0.96, 0.03, BUS_H - 0.06), R))
        for j in (1, 2):   # the panels' horizontal seams, a third of the height apart
            m.add("panel-seam", "body", PANEL_D, lib.box(c + n * 0.016 + V(0, 0, zb0 + BUS_H * j / 3 - zc), (0.96, 0.012, 0.025), R))
        m.add("panel-seam", "body", PANEL_D, lib.box(c + n * 0.016, (0.02, 0.012, BUS_H - 0.1), R))
        if k in (1, 3, 5, 7):
            m.add("radiator", "body", WHITE_R, lib.box(c + n * 0.02 + V(0, 0, 0.55), (0.55, 0.012, 0.85), R))
    # the corner posts, wrapped in gold, and a gold blanket skirt round the top edge of the bus
    for k in range(8):
        th = math.pi / 8 + math.pi / 4 * k
        d = V(math.cos(th), math.sin(th), 0)
        R = np.column_stack([V(-math.sin(th), math.cos(th), 0), d, V(0, 0, 1)])
        m.add("corner-post", "foil", GOLD_F, lib.box(d * (ACR - 0.02) + V(0, 0, (zb0 + zb1) / 2), (0.1, 0.1, BUS_H - 0.04), R, crinkle=0.012, seed=seed + k, div=0.4))
    # the base: an octagonal plate, the round aperture ring, a fluted copper disc inside it
    m.add("base-plate", "body", BAY, lib.prism((0, 0, zb1 - 0.05), (0, 0, 1), 8, 2 * APO, 0.1, start=(1, 0, 0)))
    m.add("base-ring", "body", SILVER, lib.torus((0, 0, zb1 + 0.06), (0, 0, 1), 0.82, 0.05, 40, 6))
    m.add("base-ring-inner", "body", GREY, lib.frustum((0, 0, zb1 + 0.02), (0, 0, zb1 + 0.1), 0.78, 0.78, 40, caps=False))
    m.add("base-disc", "foil", COPPER, wlib.fluted((0, 0, zb1 - 0.12), (0, 0, 1), 0.78, 0.15, 0.18, 14, seg=56, rings=5, amp=0.05, inside=False))
    m.add("base-hub", "body", GREY, lib.frustum((0, 0, zb1 + 0.0), (0, 0, zb1 + 0.12), 0.13, 0.13, 16))
    if flare:
        # the flare: the octagon's corners narrowing to the drum, in rumpled gold
        foil_cone(m, "flare", zb0, 1.28, zb0 - 1.25, 1.02, n=24, seed=seed + 40)
    # a gold blanket flap beside each paddle's root (the renders show gold sheets there)
    for s in (-1, 1):
        m.add("flap", "foil", GOLD_LT, lib.box((s * (APO + 0.03), 0.0, zb0 + 0.55), (0.04, 0.9, 0.9), crinkle=0.01, seed=seed + 50 + s, div=0.3))


def drum(m, z0, z1, r=1.02, seed=70):
    """The gold drum: the optical bench's wrapping, silver tape round it."""
    foil_cone(m, "drum", z0, r, z1, r, n=28, seed=seed, crinkle=0.02, nu=3, nz=10)
    m.add("drum-cap", "foil", GOLD_LT, lib.disc((0, 0, z1), (0, 0, -1), r, 40))
    for z in np.linspace(z0 + 0.7, z1 - 0.5, 3):
        ring(V(0, 0, z), r + 0.018, 0.012, SILVER, m, "tape")
    m.add("drum-skirt", "body", GOLD_DK, lib.torus((0, 0, z0), (0, 0, 1), r + 0.02, 0.03, 40, 5))


def paddles(m, zc, seed=90):
    """The two paddles: three panels each of 1.013 x 2.65 m, 4.6 m from the axis at the tips, cells to +Y, on two booms each."""
    root, tip = 1.56, 4.6
    pw, pl, gap = (tip - root - 2 * 0.02) / 3, 2.65, 0.02
    for s in (-1, 1):
        for zz in (zc - 0.9, zc + 0.9):
            m.add("boom", "body", FRAME, lib.rod((s * APO, 0, zz), (s * (root + 0.02), 0, zz), 0.035, 8))
            m.add("boom-yoke", "body", HINGE, lib.box((s * (root - 0.03), 0, zz), (0.1, 0.08, 0.12)))
        x = root
        for i in range(3):
            xc = s * (x + pw / 2)
            for role, col, mesh in lib.cell_panel((xc, 0, zc), (0, 0, 1), (1, 0, 0), pl, pw, (10, 4), 0.012, FRAME, cell_col=CELLS, thick=0.035, back_col=BACKS, border=0.05):
                m.add("panel", role, col, mesh)
            for zz in (-1, 1):
                m.add("panel-rail", "body", FRAME, lib.box((xc, 0, zc + zz * pl / 2), (pw, 0.04, 0.04)))
            m.add("hinge", "body", HINGE, lib.box((s * (x + pw + gap / 2), 0, zc), (gap + 0.03, 0.05, pl * 0.5)))
            x += pw + gap
