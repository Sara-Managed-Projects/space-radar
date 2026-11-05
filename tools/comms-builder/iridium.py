"""Iridium NEXT (Thales Alenia Space, ELiTeBus-1000), the 66 operational satellites and the spares: NORAD 41917 onwards, IRIDIUM 100 to 181.

Metres, the app's axes: +Z the Earth face (the Main Mission Antenna), +X the wing axis, +Y the side the cells face.

WHAT IS PUBLISHED (eoPortal, 'Iridium NEXT', read 2026-11-05): 'Size in launch configuration 3.1 m x 2.4 m x 1.5 m', 'Deployed wingspan 9.4 m',
launch mass about 860 kg; ONE 48-beam L-band transmit/receive phased array (the Main Mission Antenna: 168 transmit/receive modules, Thales
Alenia Space); two steerable 20/30 GHz feeder links; four 23 GHz cross-links, two steerable and two fixed; a hosted-payload slot of 30 x 40 x
70 cm on the Earth face (Aireon's ADS-B receiver on all 81, an AIS receiver on 58), two solar wings.
WHAT IS READ OFF PICTURES, AGAINST THOSE METRES: the layout, from Thales Alenia Space's render and Iridium's cut-away on eoPortal and from the
photograph of the stack in its fairing (SpaceX, on eoPortal): the foil-edged silver slab, the copper hexagon-tiled Main Mission Antenna
with its scalloped edge on the Earth face, the hosted-payload box beside it, the two feeder dishes and two cross-link dishes on the face's corners,
the two wings of two panels each on a boom from the middle of the long sides. The sizes of the panels, the dishes and the antenna are ours.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clib import *  # noqa: F401,F403,E402

SILVER = "#C3C8CF"
SILVER_D = "#9AA1AB"
GOLD = "#C9A24A"
GOLD_D = "#A97F34"
GOLD_L = "#DDBB64"
COPPER = "#B9622C"
COPPER_D = "#9B4C20"
COPPER_L = "#CC7A3E"
BLACK = "#23262C"
GREY = "#6C737E"
WHITE = "#E6E8EB"
CELL = "#26407A"
CELL_BACK = "#2A2D33"
PAD = "#C9CDD3"

FILE_ID = "iridium-next"
X, Y, Z = 2.4, 3.1, 0.75         # the bus slab: 2.4 across the wing roots, 3.1 long, 0.75 thick (1.5 with the antenna module, the hosted bay and the dishes)
SPAN = 9.4


def build():
    m = Model("iridium-next")
    zc = -0.2
    # --- the bus: silver radiator slab with taped seams, foil along every edge
    m.add("bus", "body", SILVER, box((0, 0, zc), (X, Y, Z)))
    for sgn in (-1, 1):
        m.add("seam", "body", SILVER_D, lib.seams_on_face((sgn * X / 2, 0, zc), (sgn, 0, 0), (0, 1, 0), Y * 0.92, Z * 0.9, 5, 3, width=0.012, lift=0.004))
    m.add("seam", "body", SILVER_D, lib.seams_on_face((0, 0, zc - Z / 2), (0, 0, -1), (1, 0, 0), X * 0.92, Y * 0.92, 4, 6, width=0.012, lift=0.004))
    m.add("edge-foil", "foil", GOLD, edge_strips((0, 0, zc), (X, Y, Z), 0.16, 0.025, "xXZz", crinkle=0.016, seed=3))
    m.add("edge-foil-y", "foil", GOLD_D, edge_strips((0, 0, zc), (X, Y, Z), 0.10, 0.02, "yY", crinkle=0.014, seed=9))
    # foil blankets over the aft third of the back (the Earth-away side) and the corners
    for k, (cx, cy) in enumerate([(-0.55, -0.9), (0.6, 0.2), (-0.3, 1.0)]):
        m.add("mli", "foil", GOLD_L if k % 2 else GOLD, grid((cx, cy, zc - Z / 2 - 0.012), (1, 0, 0), (0, 1, 0), 0.7, 0.55, 4, 3, crinkle=0.02, seed=20 + k))

    # --- the Earth face (+Z): the antenna module, the copper Main Mission Antenna, the hosted-payload box
    zf = zc + Z / 2                                   # the face, 0.6 up
    mc = (0.0, -0.45, zf + 0.25)
    m.add("mma-module", "body", SILVER, box(mc, (1.78, 1.78, 0.5), faces="xXyYZ"))
    # the scalloped rim of the module's face: a row of small notches along its edges
    for i in range(-4, 5):
        for sgn in (-1, 1):
            m.add("mma-rim", "body", SILVER_D, box((mc[0] + i * 0.19, mc[1] + sgn * 0.86, zf + 0.508), (0.1, 0.05, 0.016)))
            m.add("mma-rim", "body", SILVER_D, box((mc[0] + sgn * 0.86, mc[1] + i * 0.19, zf + 0.508), (0.05, 0.1, 0.016)))
    zp = zf + 0.503
    R = 0.74

    def inside(x, y):
        return abs(x) < R * 1.0 and abs(y) < R * 1.0 and (abs(x) + abs(y)) < R * 1.28

    m.add("mma-plate", "body", COPPER_D, box((mc[0], mc[1], zp), (1.52, 1.52, 0.004), faces="Z"))
    ch = hex_cells((mc[0], mc[1], zp + 0.004), (0, 0, 1), (1, 0, 0), R, 0.105, 0.012, inside)
    m.add("mma-tiles", "body", COPPER, ch)
    # a lighter ring of tiles marks the 168 modules' clusters: a second tone on every third tile along rows
    ch2 = hex_cells((mc[0], mc[1], zp + 0.0075), (0, 0, 1), (1, 0, 0), R, 0.055, 0.2, lambda x, y: inside(x, y) and ((round(x / 0.1) + round(y / 0.09)) % 3 == 0))
    m.add("mma-tiles", "body", COPPER_L, ch2)

    # the hosted-payload bay (the 30 x 40 x 70 cm slot; Aireon's ADS-B receiver): two stacked silver boxes, the upper one ribbed
    hc = (0.0, 1.0, zf + 0.15)
    m.add("hosted", "body", SILVER, box(hc, (1.1, 0.78, 0.3)))
    m.add("hosted-upper", "body", WHITE, box((0.0, 1.0, zf + 0.37), (0.9, 0.6, 0.14)))
    for k in range(-4, 5):
        m.add("hosted-rib", "body", SILVER_D, box((k * 0.1, 1.0, zf + 0.47), (0.03, 0.58, 0.06)))
    m.add("hosted-grid", "body", GREY, lib.seams_on_face((0, 1.0, zf + 0.3), (0, 0, 1), (1, 0, 0), 1.0, 0.7, 6, 3, width=0.012, lift=0.002))
    m.add("hosted-foil", "foil", GOLD, edge_strips(hc, (1.1, 0.78, 0.3), 0.05, 0.012, "xX", crinkle=0.01, seed=33))
    # the AIS blade and the ADS-B patch beside the box
    m.add("ais", "body", BLACK, box((0.7, 1.25, zf + 0.12), (0.03, 0.22, 0.22)))
    m.add("ads-b", "body", WHITE, box((-0.78, 0.7, zf + 0.04), (0.26, 0.26, 0.06)))

    # --- the four 23 GHz cross-links and two feeder dishes: dishes on short arms at the Earth face's corners
    def mount(p, axis, r, depth, col=SILVER, arm=0.18, tilt=0.0):
        p = V(p)
        a = unit(axis)
        m.add("dish-arm", "body", GREY, rod(p, p + a * arm * 0.5, 0.02, 8))
        m.add("dish-yoke", "body", BLACK, box(p + a * arm * 0.55, (0.09, 0.09, 0.07), R=frame_of(a)))
        m.add("dish", "body", col, dish(p + a * arm, a, r, depth))
        m.add("dish-feed", "body", GREY, rod(p + a * (arm + depth), p + a * (arm + depth * 0.4), 0.008, 5))
    # feeder dishes (steerable): the -Y corners, looking outward and Earthward
    mount((0.95, -1.35, zf + 0.12), (0.45, -0.3, 0.84), 0.19, 0.06)
    mount((-0.95, -1.35, zf + 0.12), (-0.45, -0.3, 0.84), 0.19, 0.06)
    # cross-link dishes (steerable): the +Y corners
    mount((1.0, 1.4, zf + 0.1), (0.5, 0.35, 0.78), 0.12, 0.04)
    mount((-1.0, 1.4, zf + 0.1), (-0.5, 0.35, 0.78), 0.12, 0.04)
    # the two fixed cross-link horns
    for sgn in (-1, 1):
        m.add("horn", "body", GREY, frustum((sgn * 0.5, 0.2, zf + 0.0), (sgn * 0.5, 0.2, zf + 0.12), 0.03, 0.065, 10))

    # --- thrusters and star trackers on the aft (anti-Earth) face
    za = zc - Z / 2
    for i, j in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
        m.add("thruster", "body", BLACK, frustum((i * 0.8, j * 1.2, za), (i * 0.8, j * 1.2, za - 0.1), 0.035, 0.065, 10))
    for sgn in (-1, 1):
        m.add("startracker", "body", BLACK, frustum((sgn * 0.5, 0.2, za), (sgn * 0.5, 0.2, za - 0.2), 0.08, 0.1, 12))
        m.add("startracker-baffle", "body", GREY, frustum((sgn * 0.5, 0.2, za - 0.2), (sgn * 0.5, 0.2, za - 0.34), 0.1, 0.12, 12, caps=False, open_top=True))
    # an omni whip on the anti-Earth face and two TT&C patches on the sides
    m.add("omni", "body", GREY, rod((0.0, 0.2, za), (0.0, 0.2, za - 0.3), 0.012, 6))
    m.add("omni-ball", "body", WHITE, sphere((0.0, 0.2, za - 0.31), 0.03, 4, 8))

    # --- the two wings: boom, drive, yoke, two panels each; 9.4 m tip to tip
    boom_l = 0.41
    pw, ph = 1.5, 2.3                  # a panel 1.5 along the span, 2.3 across (along Z)
    for sgn in (-1, 1):
        x0 = sgn * X / 2
        m.add("boom", "body", SILVER_D, rod((x0, 0.0, zc), (x0 + sgn * boom_l, 0.0, zc), 0.035, 10))
        m.add("sada", "body", GREY, box((x0 + sgn * 0.12, 0.0, zc), (0.22, 0.28, 0.28)))
        m.add("sada-foil", "foil", GOLD, box((x0 + sgn * 0.12, 0.0, zc), (0.23, 0.29, 0.29), faces="yY"))
        xr = x0 + sgn * boom_l
        m.add("yoke", "body", SILVER_D, box((xr, 0.0, zc), (0.06, 0.1, ph * 0.96), faces="xXyYzZ"))
        for k in range(2):
            xc = xr + sgn * (0.04 + pw / 2 + k * (pw + 0.05))
            for role, col, mesh in solar_panel((xc, 0.0, zc), (0, 0, 1), (1, 0, 0), ph, pw, (18, 6), 0.012, SILVER_D, CELL, CELL_BACK, thick=0.03, border=0.03):
                m.add("panel", role, col, mesh)
            # hold-down and hinge pads on the panels' edges (the render's white fittings)
            for zz in (-ph * 0.4, ph * 0.4):
                m.add("pad", "body", PAD, box((xc - sgn * pw * 0.5, 0.0, zc + zz), (0.07, 0.04, 0.12)))
        m.add("hinge", "body", PAD, box((xr + sgn * (0.04 + pw + 0.025), 0.0, zc), (0.06, 0.05, 0.22)))
    return m


if __name__ == "__main__":
    mod = build()
    lo, hi = mod.bounds()
    print("tris", mod.triangles(), "bounds", np.round(lo, 2), np.round(hi, 2), "span", round(hi[0] - lo[0], 2))
