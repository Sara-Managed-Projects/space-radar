"""Kinéis (release 2.0.0, batch m3-mid; forge #128): the 25 nanosatellites of the Kinéis IoT constellation (Hemeria platform, Thales Alenia Space payload), on the part library of tools/stage-builder/lib.py.

WHAT MAKES IT KINÉIS (written down before building, and read off the photographs):
  1. a tall gold-foil body with ONE 12-lobed grey ring and a pale square plate on a long face;
  2. six solar panels, three hinged in a row to each side, with copper-coloured edge tabs and a 3-wide cell grid;
  3. at the Earth end a twisted four-strand UHF helix on ring spacers, with the S-band antenna's white tube on its tip;
  4. a fan of VHF (AIS) rods that stand out sideways from the Earth end.
Photographs, looked at only, all on Wikimedia Commons under CC BY-SA 4.0 (they are not shipped, and nothing is traced): 'Kineis satellite model.jpg' (a 1:1 model, three-quarter view from the
Earth end), 'Maquette satellite Kineis IAC 2022 01.jpg' (CLS's model, face-on) and '... 02.jpg' (Hemeria's model, from the other side), and 'Kinéis sat.jpg' (the flight units of one launch in a
clean room, panels folded). Sizes: the body 450 x 260 x 240 mm without appendages is the external volume of the operator's orbital-debris assessment in its FCC filing (SAT-PDR-20191011-00113,
a pre-launch figure); 1.6 m across the six panels is the operator's own press release of 18 March 2025 ('140 x 160', read as centimetres: it also says six panels in two wings and a 16U volume);
the mass is 28 kg there and about 30 kg at CNES and Gunter's Space Page. WHAT IS OURS: the panel length (0.40 m, from the folded panels of the flight photograph, which cover 0.88 of the body;
the two models' panels are shorter, about 0.29 m), the cell count, the helix's length (0.66 m: its stowed drum is a quarter of that in the flight photograph, and the press release says the
antenna is stowed at a quarter of its length) and radius, the rods' count (four long, two short, as the two model photographs show) and lengths, the ring's size and the foil's wrinkles.
Metres, the app's axes for a satellite: the long axis is Z with the Earth end (helix, rods) on +Z, the panels come out of the +/-X faces, cells and the ring face +Y.
"""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "stage-builder"))
import lib  # noqa: E402
from lib import V, Model  # noqa: E402

GOLD = "#C79A3C"        # the Kapton foil, crinkled
GOLD_D = "#9C7428"
RING = "#BFC2C6"        # the 12-lobed ring: pale grey
PLATE = "#D8D5CC"
CELL = "#1A2036"
TAB = "#B5663A"         # copper-coloured PCB tabs and frame
ROD = "#B9BDC4"         # silver VHF rods
CU = "#C0794B"          # the helix's copper strands
DARK = "#23262D"
WHITE = "#E8EAEC"
BLUE = "#3A6FB5"

BX, BY, BZ = 0.26, 0.24, 0.45  # body, metres (the FCC filing's 450 x 260 x 240 mm)
PW, PL, GAP = 0.223, 0.40, 0.004  # one panel: 6 x 0.223 + the body = 1.6 m span


def body(m):
    # foil on the four long faces and the -Z end, a dark carbon end plate on the Earth end (+Z), seen in the photographs as a dark base with a ring of screws
    for i, (faces, seed) in enumerate((("xX", 3), ("yY", 7), ("z", 11))):
        m.add("foil", "foil", GOLD, lib.box((0, 0, 0), (BX - 0.002, BY - 0.002, BZ - 0.002), crinkle=0.006, seed=seed, div=0.03, faces=faces))
    m.add("earth-plate", "body", DARK, lib.box((0, 0, BZ / 2 + 0.006), (BX, BY, 0.012)))
    m.add("earth-plate-screws", "body", ROD, lib.merge([lib.frustum((x * 0.5, y * 0.5, BZ / 2 + 0.0125), (x * 0.5, y * 0.5, BZ / 2 + 0.017), 0.004, 0.004, 8)
                                                        for x in (-BX, BX) for y in (-BY, BY)] +
                                                       [lib.frustum((x, y, BZ / 2 + 0.0125), (x, y, BZ / 2 + 0.017), 0.004, 0.004, 8) for x in (-0.07, 0.07) for y in (-0.08, 0.08)]))
    # a round port on the top (-Z) end, as the 1:1 model shows
    m.add("top-port", "body", DARK, lib.frustum((0.02, 0.0, -BZ / 2 - 0.002), (0.02, 0.0, -BZ / 2 - 0.008), 0.013, 0.011, 14))


def ring_and_plate(m):
    """The 12-lobed ring and the square plate with three fittings, on the +Y face (the face the cells face)."""
    y = BY / 2 + 0.002
    z0 = -0.02  # the ring sits a little above the middle of the long face
    R = 0.088
    lugs, bolts = [], []
    for k in range(12):
        a = 2 * math.pi * k / 12
        c = V(R * math.cos(a), y + 0.007, z0 + R * math.sin(a))
        # a lug is tangent to the ring: u along the tangent, v along the radius
        tang = V(-math.sin(a), 0, math.cos(a))
        rad = V(math.cos(a), 0, math.sin(a))
        Rm = np.column_stack([tang, V(0, 1, 0), rad])
        lugs.append(lib.box(c, (0.047, 0.014, 0.024), Rm))
        bolts.append(lib.frustum(c + V(0, 0.007, 0), c + V(0, 0.011, 0), 0.0045, 0.0045, 8))
    m.add("ring", "body", RING, lib.merge(lugs))
    m.add("ring-bolts", "body", ROD, lib.merge(bolts))
    m.add("plate", "body", PLATE, lib.box((0, y + 0.004, z0), (0.105, 0.008, 0.105)))
    fit = [lib.frustum((dx, y + 0.008, z0 + dz), (dx, y + 0.014, z0 + dz), r, r, 12) for dx, dz, r in ((0, 0, 0.012), (-0.034, -0.034, 0.005), (0.034, 0.034, 0.005))]
    m.add("plate-fittings", "body", GOLD_D, lib.merge(fit))
    m.add("plate-eye", "body", DARK, lib.disc((0, y + 0.0145, z0), (0, 1, 0), 0.006, 12))


def wings(m):
    """Six panels, three a side, hinged edge to edge. Each: a copper-coloured PCB, a 3 x 10 grid of cells, mounting tabs at both ends. Out of the +/-X faces at the +Y face plane."""
    for sgn in (-1, 1):
        for k in range(3):
            xc = sgn * (BX / 2 + GAP + PW / 2 + k * (PW + GAP))
            zc = -BZ / 2 + PL / 2 + 0.02  # aligned toward the top end, as the photographs show
            c = V(xc, BY / 2 - 0.004, zc)
            # u = Z (length), v = X so that n = u x v = +Y
            for role, col, mesh in lib.cell_panel(c, (0, 0, 1), (1, 0, 0), PL, PW, (10, 3), 0.002, TAB, cell_col=CELL, thick=0.004, back_col="#8A5A3C", border=0.026):
                m.add("panel", role, col, mesh)
            # the mounting tabs: a small white-grey bush at each corner pair
            tabs = []
            for dz in (-1, 1):
                for dx in (-1, 0, 1):
                    p = c + V(dx * PW * 0.36, 0.0035, dz * (PL / 2 - 0.013))
                    tabs.append(lib.frustum(p, p + V(0, 0.003, 0), 0.0065, 0.0065, 10))
            m.add("panel-tabs", "body", RING, lib.merge(tabs))
            # the hinge between this panel and the next (or the body)
            xh = sgn * (BX / 2 + GAP / 2 + k * (PW + GAP))
            m.add("hinge", "body", ROD, lib.rod((xh, BY / 2 - 0.004, zc - 0.07), (xh, BY / 2 - 0.004, zc + 0.07), 0.0035, 6))


def helix(m):
    """The UHF antenna: four copper strands, one turn over 0.66 m, held by nine pale ring spacers, narrowing toward the tip, with the S-band tube on top."""
    z0, L = BZ / 2 + 0.014, 0.66
    r0, r1 = 0.056, 0.034
    n = 36
    for s in range(4):
        pts = []
        for i in range(n + 1):
            t = i / n
            r = r0 + (r1 - r0) * t
            a = 2 * math.pi * (s / 4 + 1.0 * t)
            pts.append(V(r * math.cos(a), r * math.sin(a), z0 + L * t))
        m.add("helix-strand", "foil", CU, lib.merge([lib.rod(pts[i], pts[i + 1], 0.0026, 4) for i in range(n)]))
    spacers, lugs = [], []
    for j in range(9):
        t = (j + 0.5) / 9.0
        r = r0 + (r1 - r0) * t
        zc = z0 + L * t
        spacers.append(lib.torus((0, 0, zc), (0, 0, 1), r, 0.0035, 20, 5))
        for q in range(4):
            a = 2 * math.pi * (q / 4 + 1.0 * t)
            spacers.append(lib.box((r * math.cos(a), r * math.sin(a), zc), (0.014, 0.014, 0.012), np.column_stack([V(math.cos(a), math.sin(a), 0), V(-math.sin(a), math.cos(a), 0), V(0, 0, 1)])))
    m.add("helix-spacers", "body", RING, lib.merge(spacers))
    # the mount on the plate and the tip's cone, then the S-band antenna's white tube with its blue band
    m.add("helix-base", "body", ROD, lib.frustum((0, 0, BZ / 2 + 0.012), (0, 0, BZ / 2 + 0.026), 0.058, 0.05, 20))
    zt = z0 + L
    m.add("helix-tip", "body", ROD, lib.frustum((0, 0, zt - 0.004), (0, 0, zt + 0.03), 0.034, 0.02, 16))
    m.add("sband", "body", WHITE, lib.frustum((0, 0, zt + 0.03), (0, 0, zt + 0.17), 0.0165, 0.0165, 18))
    m.add("sband-band", "body", BLUE, lib.frustum((0, 0, zt + 0.15), (0, 0, zt + 0.162), 0.0172, 0.0172, 18))


def rods(m):
    """The VHF (AIS) rods: four long and two short, from a silver block on the Earth end plate, standing out sideways and a little away from the body."""
    zb = BZ / 2 + 0.012
    m.add("rod-block", "body", ROD, lib.box((0, 0, zb + 0.008), (0.17, 0.03, 0.016)))
    m.add("rod-hinges", "body", RING, lib.merge([lib.box(V(0.075 * math.cos(math.radians(a)), 0.012 * math.sin(math.radians(a)), zb + 0.02), (0.022, 0.014, 0.014)) for a in (0, 180, 100, 280, 40, 220)]))
    spec = ((168, 0.64, -4), (12, 0.66, -3), (112, 0.62, 10), (296, 0.6, 8), (35, 0.3, 4), (222, 0.3, 4))  # azimuth in the X-Y plane, length, tilt away from the body (+Z), degrees
    long_, short_ = [], []
    for az, L, tilt in spec:
        a, t = math.radians(az), math.radians(tilt)
        d = V(math.cos(a) * math.cos(t), math.sin(a) * math.cos(t), math.sin(t))
        p0 = V(0.07 * math.cos(a), 0.012 * math.sin(a), zb + 0.02)
        (long_ if L > 0.4 else short_).append(lib.rod(p0, p0 + d * L, 0.0055 if L > 0.4 else 0.004, 8))
    m.add("vhf-rods", "body", ROD, lib.merge(long_))
    m.add("vhf-blades", "body", "#9AA0A9", lib.merge(short_))


def build():
    m = Model("kineis")
    body(m)
    ring_and_plate(m)
    wings(m)
    helix(m)
    rods(m)
    return m
