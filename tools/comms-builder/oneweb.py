"""OneWeb first generation (Airbus OneWeb Satellites, the Arrow platform): the 648 launched 2019 to 2023, ONEWEB-0006 onwards.

Metres, the app's axes: +Z the Earth face (the Ku horn arrays and the two gateway dishes), +X the wing axis, +Y the side the cells face.

WHAT IS PUBLISHED (eoPortal, 'OneWeb', read 2026-11-05): 'a box shaped structure measuring approximately 1 m x 1 m x 1.3 m', about 150 kg, two solar
panels that unfold in orbit, 16 fixed Ku-band user beams (highly elliptical, each about 1600 km by 65 km on the ground), two steerable Ka-band
gateway beams, an electric (xenon Hall) propulsion system, a carbon-fibre or aluminium sandwich structure under metal-coated polyimide film.
WHAT IS READ OFF PICTURES, AGAINST THOSE METRES: the layout, from Airbus's render and photographs on eoPortal (the factory pair in foil; the stack on its
dispenser): gold-foil box with a pale radiator face on each side the wings come out of, a black top deck with two Ka gateway dishes on gimbal arms,
a bay of ribbed white Ku horn arrays on the Earth face, a Hall thruster on a foil face. The array panels (1.2 x 1.6 m, eight by eleven cells) and
their booms (0.85 m) are READ OFF THE RENDER against the 1 m bus and are ours: eoPortal prints no array size. The brief said to leave out a part
with no primary number; the arrays are NOT left out, because a OneWeb without its wings is not one, and they are marked as estimated.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clib import *  # noqa: F401,F403,E402

FILE_ID = "oneweb"
GOLD = "#C9A24A"
GOLD_D = "#A97F34"
GOLD_L = "#DDBB64"
PALE = "#D5DCE6"
PALE_D = "#B9C2CF"
SILVER = "#C3C8CF"
SILVER_D = "#8F97A3"
WHITE = "#E9ECEF"
BLACK = "#22252B"
GREY = "#6C737E"
DISH = "#B8BEC8"
CELL = "#1F3E86"
CELL_BACK = "#2B2F36"
KAPTON = "#C47A35"

X, Y, Z = 1.0, 1.0, 1.3


def build():
    m = Model("oneweb")
    # --- the box: the two X faces are pale radiator panels (the wings come out of them), the Y faces and the ends are gold foil
    m.add("bus", "body", PALE, box((0, 0, 0), (X, Y, Z), faces="xX"))
    m.add("bus", "body", SILVER_D, box((0, 0, 0), (X, Y, Z), faces="yYz"))
    # foil: a rumpled blanket over each Y face, and gold L-brackets at the corners of the radiator faces
    for sgn in (-1, 1):
        m.add("blanket", "foil", GOLD, grid((0, sgn * (Y / 2 + 0.035), 0), (1, 0, 0) if sgn < 0 else (0, 0, 1), (0, 0, 1) if sgn < 0 else (1, 0, 0), X * 0.98 if sgn < 0 else Z * 0.98, Z * 0.98 if sgn < 0 else X * 0.98, 8, 10, crinkle=0.018, seed=5 + sgn))
        m.add("blanket-seam", "foil", GOLD_D, grid((0, sgn * (Y / 2 + 0.06), 0.0), (1, 0, 0) if sgn < 0 else (0, 0, 1), (0, 0, 1) if sgn < 0 else (1, 0, 0), 0.012 if sgn < 0 else Z * 0.9, Z * 0.9 if sgn < 0 else 0.012, 1, 6, crinkle=0.0))
    m.add("edge-foil", "foil", GOLD_L, edge_strips((0, 0, 0), (X, Y, Z), 0.09, 0.02, "xX", crinkle=0.012, seed=2))
    # the radiator faces' corners: gold foil L-patches (two strips each) over the stowed array's hold-downs, a grey fitting in each
    for sgn in (-1, 1):
        for i in (-1, 1):
            for j in (-1, 1):
                cx, cz = i * 0.34, j * 0.5
                m.add("corner-foil", "foil", GOLD, box((sgn * (X / 2 + 0.018), i * 0.4, j * 0.5), (0.035, 0.2, 0.12)))
                m.add("corner-foil", "foil", GOLD, box((sgn * (X / 2 + 0.018), i * 0.45, j * 0.4), (0.035, 0.1, 0.32)))
                m.add("bracket", "body", GREY, box((sgn * (X / 2 + 0.04), i * 0.4, j * 0.5), (0.04, 0.07, 0.07)))
    # the radiator faces' panel seams
    for sgn in (-1, 1):
        m.add("seam", "body", PALE_D, lib.seams_on_face((sgn * X / 2, 0, 0), (sgn, 0, 0), (0, 1, 0), Y * 0.8, Z * 0.8, 3, 4, width=0.008, lift=0.003))

    # --- the Earth face (+Z): a black deck, the bay of ribbed Ku horn arrays, two Ka gateway dishes on gimbal arms
    zf = Z / 2
    m.add("deck", "body", BLACK, box((0, 0, zf + 0.02), (X, Y, 0.04), faces="xXyYZ"))
    # the Ku horn bay: two white ribbed panels side by side in a foil frame
    m.add("bay", "body", GOLD_D, box((0, 0.02, zf + 0.06), (0.84, 0.62, 0.04)))
    for sgn in (-1, 1):
        m.add("horn-panel", "body", WHITE, box((sgn * 0.2, 0.02, zf + 0.1), (0.38, 0.56, 0.04)))
        for k in range(-7, 8):
            m.add("horn-rib", "body", SILVER_D, box((sgn * 0.2 + k * 0.024, 0.02, zf + 0.13), (0.011, 0.52, 0.03)))
    # the two Ka dishes: on bent gimbal arms from the deck's corners
    for sx, sy in ((-1, -1), (1, 1)):
        p = V(sx * 0.3, sy * 0.3, zf + 0.04)
        m.add("gimbal-base", "body", GREY, frustum(p, p + V(0, 0, 0.1), 0.06, 0.04, 10))
        m.add("gimbal-arm", "body", GREY, rod(p + V(0, 0, 0.1), p + V(sx * 0.05, 0, 0.3), 0.015, 8))
        axis = (sx * 0.35, sy * 0.15, 0.9)
        c0 = p + V(sx * 0.05, 0, 0.3)
        m.add("dish", "body", DISH, dish(c0, axis, 0.19, 0.07, seg=24))
        m.add("dish-feed", "body", GREY, rod(c0 + unit(axis) * 0.07, c0 + unit(axis) * 0.0, 0.01, 6))
        m.add("dish-strut", "body", GREY, rod(c0 + unit(axis) * 0.07, c0 + unit(axis) * 0.07 + V(0, 0, 0.0), 0.01, 4))
    # two small antennas and sun sensors on the deck
    m.add("tmtc", "body", WHITE, frustum((0.35, -0.3, zf + 0.04), (0.35, -0.3, zf + 0.14), 0.04, 0.02, 10))
    m.add("tmtc", "body", WHITE, frustum((-0.35, 0.3, zf + 0.04), (-0.35, 0.3, zf + 0.14), 0.04, 0.02, 10))
    for p in ((0.4, 0.42), (-0.42, -0.42)):
        m.add("sun-sensor", "body", GREY, box((p[0], p[1], zf + 0.06), (0.06, 0.06, 0.04)))

    # --- the aft face (-Z): the Hall thruster, star trackers
    za = -zf
    m.add("thruster-plate", "body", BLACK, frustum((0, -Y / 2, -0.1), (0, -Y / 2 - 0.02, -0.1), 0.12, 0.12, 20))
    m.add("thruster-ring", "body", GREY, torus((0, -Y / 2 - 0.03, -0.1), (0, 1, 0), 0.075, 0.015, 20, 6))
    m.add("thruster-cap", "body", "#A33030", frustum((0, -Y / 2 - 0.03, -0.1), (0, -Y / 2 - 0.06, -0.1), 0.05, 0.05, 14))
    for sx in (-1, 1):
        m.add("startracker", "body", BLACK, frustum((sx * 0.3, 0, za), (sx * 0.3, 0, za - 0.12), 0.07, 0.09, 12))
        m.add("startracker-baffle", "body", GREY, frustum((sx * 0.3, 0, za - 0.12), (sx * 0.3, 0, za - 0.3), 0.09, 0.11, 12, caps=False, open_top=True))

    # --- the two wings: ONE panel each on a boom from the middle of a radiator face
    boom = 0.85
    pw, ph = 1.2, 1.6                         # across the span x across (Z): read off the render, ours
    for sgn in (-1, 1):
        x0 = sgn * X / 2
        m.add("boom", "body", SILVER_D, rod((x0, 0, 0), (x0 + sgn * (boom + 0.1), 0, 0), 0.016, 8))
        m.add("sada", "body", GREY, box((x0 + sgn * 0.07, 0, 0), (0.14, 0.18, 0.18)))
        m.add("sada-foil", "foil", GOLD, box((x0 + sgn * 0.07, 0, 0), (0.15, 0.19, 0.19), faces="yY"))
        xc = x0 + sgn * (boom + 0.1 + pw / 2)
        m.add("yoke", "body", SILVER_D, box((x0 + sgn * (boom + 0.06), 0, 0), (0.05, 0.1, ph * 0.9)))
        for role, col, mesh in solar_panel((xc, 0.0, 0.0), (0, 0, 1), (1, 0, 0), ph, pw, (11, 8), 0.014, SILVER_D, CELL, CELL_BACK, thick=0.025, border=0.025):
            m.add("panel", role, col, mesh)
    return m


if __name__ == "__main__":
    mod = build()
    lo, hi = mod.bounds()
    print("tris", mod.triangles(), np.round(lo, 2), np.round(hi, 2))
