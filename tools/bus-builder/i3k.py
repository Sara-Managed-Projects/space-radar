"""ISRO I-3K (I-3000): the ten GSATs of the catalogue whose bus the sources name. Rebuilt in batch m4-buses (release 2.0.0) after the m2 hold.

Metres, the app's axes: +Z the Earth deck, +X the wing axis (north-south), +Y east-west (the side the cells face).

WHAT IS PUBLISHED, AND USED AS THE SIZE: McDowell's GCAT (CC BY 4.0, satcat.tsv of 2026-11-07), the ten: 'Length' 3.1 m for GSAT-10, 16, 17, 18, 19, 29 (4.0 to 4.1 for GSAT-8,
15, 24, 30, with antennas), 'Diameter' 1.7 to 2.0 (2.3 to 2.5), 'Span' 15.4 to 20 m (25 for GSAT-24 and 30, 37.4 for GSAT-8). Drawn: a box 1.8 (north-south) x 2.0 (east-west) x 3.1 m,
4.1 m with the deck antennas; 20.0 m over the wings.
WHAT IS READ OFF PICTURES, AND THESE ARE PHOTOGRAPHS: ISRO's own clean-room photographs on Wikimedia Commons (GODL-India; LOOKED AT ONLY): GSAT-19 in the clean room at SDSC SHAR and
in the compact antenna test facility, GSAT-30 in the clean room with its reflector deployed and during the solar-array deployment test. They show: the box wrapped in crinkled GOLD
kapton; WHITE radiators on the north and south faces; a large DARK carbon-fibre reflector swung out on the east or west wall, about the width of the box; three-panel wings with
dark cells crossed by red-orange string lines, on a short yoke. ISRO's renders on Gunter's Space Page (GSAT-8, 10, 16, 17, 18, 24, 29; looked at only) agree and show a reflector on
each wall and smaller dishes on the deck.
WHAT IS OURS (ESTIMATED): the reflectors' 2.2 m and 1.2 m and their arms and tilts; three near-square panels of 2.2 x 2.5 m a wing (GSAT-30 photograph, GSAT-10 render); the yoke; the feeds and horns.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geoparts import *  # noqa: F401,F403,E402

FILE_ID = "bus-i-3k"
SX, SY, SZ = 1.8, 2.0, 3.1
SPAN, NP, PW = 20.0, 3, 2.2
YOKE, SADA = 1.0, 0.35
DARK_CELL = "#23252E"


def build(wings=True):
    m = Model(FILE_ID)
    zf = SZ / 2
    blanket_box(m, SX, SY, SZ, GOLD, patch=(GOLD_L, GOLD_D), seed=41, seams=(3, 4), crinkle=0.05)
    radiators(m, SX, SY, SZ, tiles=(4, 8))
    earth_deck(m, SX, SY, SZ, GOLD, horns=((0.4, -0.45, 2, 2),), omnis=((-0.6, 0.7), (0.6, 0.7)), sensor=(-0.4, -0.5))
    for xx, tilt in ((-0.35, 0.3), (0.4, -0.25)):
        m.add("dish-post", "body", GREY, lib.frustum((xx, 0.25, zf), (xx, 0.25, zf + 0.35), 0.06, 0.05, 8))
        reflector(m, "deck-dish", (xx, 0.25, zf + 0.4), (tilt, 0.0, 0.96), 0.6, 0.6, 0.12, up=(1, 0, 0), feed=True, ribs=6, front_col=GRAPHITE, back_col=GRAPHITE_BACK)
    for sgn in (-1, 1):
        side_reflector(m, "reflector", sgn, SY, SZ, 0.0, 1.35, zf - 0.35, 2.2, 22, front=GRAPHITE, back=GRAPHITE_BACK, feed=(2, 3))
        for k, zz in enumerate((-0.8, 0.15)):
            m.add("wall-unit", "foil", GOLD_L, lib.box((0.35 * (-1) ** k, sgn * (SY / 2 + 0.11), zz), (0.8, 0.2, 0.45), crinkle=0.025, seed=80 + k, div=0.2))
    aft(m, SX, SY, SZ, foil=GOLD, engine_r=(0.07, 0.27, 0.6), ring=0.5)
    if wings:
        pl = round(((SPAN - SX) / 2 - 0.05 - SADA - YOKE - (NP - 1) * 0.07) / NP, 2)
        for sgn in (-1, 1):
            x0 = sgn * (SX / 2 + 0.05)
            wing(m, sgn, x0, NP, pl, PW, (8, 10), yoke_len=YOKE, sada_len=SADA, z=0.0, sada_r=0.15)
            strings(m, sgn, x0, NP, pl, PW, SADA, YOKE)
    return palette(m, {**COMMON_FOLDS, ("solar-panel", CELL): DARK_CELL})
