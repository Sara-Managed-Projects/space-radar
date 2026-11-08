"""CAST DFH-4 (DongFangHong-4, and the DFH-4E): the geostationary communications satellites of the catalogue whose bus the sources name. Rebuilt in batch m4-buses (release 2.0.0)
after the m2 hold. Gaofen-4 (an imaging telescope), the three Tiantong-1 (a large unfurlable S-band reflector) and the three Tianlian 2 relays (large steerable dishes) fly the bus
under a payload this file does not draw: they are `stand_in` rows in registry/geo-buses.yaml.

Metres, the app's axes: +Z the Earth deck, +X the wing axis (north-south), +Y east-west (the side the cells face).

WHAT IS PUBLISHED, AND USED AS THE SIZE: McDowell's GCAT (CC BY 4.0, satcat.tsv of 2026-11-07): Zhongxing-10 and Paksat-MM1 3.6 x 2.4 m (the box), the others 5.0 x 2.5 m (with
the stowed antennas), 'Span' 30 m for most (15.5 for two), launch mass 5 000 to 5 500 kg: a LARGE box for its span. Drawn: a box 2.4 (north-south) x 2.5 (east-west) x 3.6 m,
5.0 m with the deck antennas; 30.0 m over the wings.
WHAT IS READ OFF PICTURES: the render of Belintersat-1 on Wikimedia Commons ('Belintersat-1.jpg', CC BY-SA 4.0) and CAST's and CGWIC's renders on Gunter's Space Page (Alcomsat-1,
APStar-6C, APStar-6D, APStar-9, Belintersat-1), all LOOKED AT ONLY, which agree with one another: a big box in gold blanket with white radiators north and south; TWO BIG WINGS of three
large panels each, each wing held off the box by crossing struts (an X between the drive and the first panel); one large reflector off each of the east and west walls and a smaller
one on the Earth deck. No photograph of flight hardware under a free licence was found (Commons by every satellite's name; NASA's library), so the card says the shape is built from
published sizes and the maker's renders.
WHAT IS OURS (ESTIMATED): the reflectors' 2.6 m and 1.5 m, their arms and tilts; three panels of 2.6 x 3.95 m a wing; the yoke and its crossing struts; the feeds and horns.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geoparts import *  # noqa: F401,F403,E402

FILE_ID = "bus-dfh-4"
SX, SY, SZ = 2.4, 2.5, 3.6
SPAN, NP, PW = 30.0, 3, 2.6
YOKE, SADA = 1.6, 0.4


def build(wings=True):
    m = Model(FILE_ID)
    zf = SZ / 2
    blanket_box(m, SX, SY, SZ, GOLD, patch=(GOLD_L, GOLD_D), seed=31, seams=(3, 5))
    radiators(m, SX, SY, SZ, tiles=(6, 9))
    earth_deck(m, SX, SY, SZ, GOLD, horns=((0.55, -0.6, 2, 3), (-0.55, -0.6, 2, 2)), omnis=((-0.9, 0.95), (0.9, 0.95)), sensor=(0.0, 0.95))
    m.add("deck-tower", "foil", GOLD_D, lib.box((0.0, 0.15, zf + 0.45), (1.0, 0.9, 0.9), crinkle=0.02, seed=9, div=0.25))
    reflector(m, "deck-reflector", (0.0, -0.4, zf + 1.25), (0, 0.4, 0.92), 0.75, 0.75, 0.16, up=(1, 0, 0), arm_from=(0.0, 0.0, zf + 0.9), feed=False, ribs=8)
    for sgn in (-1, 1):
        side_reflector(m, "reflector", sgn, SY, SZ, 0.0, 1.6, zf - 0.2, 2.6, 22, feed=(3, 3))
        for k, zz in enumerate((-0.9, 0.2)):
            m.add("wall-unit", "foil", GOLD_L, lib.box((0.45 * (-1) ** k, sgn * (SY / 2 + 0.12), zz), (1.0, 0.22, 0.5), crinkle=0.02, seed=70 + k, div=0.25))
    aft(m, SX, SY, SZ, foil=GOLD, engine_r=(0.09, 0.34, 0.8), ring=0.6)
    if wings:
        pl = round(((SPAN - SX) / 2 - 0.05 - SADA - YOKE - (NP - 1) * 0.07) / NP, 2)
        for sgn in (-1, 1):
            x0 = sgn * (SX / 2 + 0.05)
            wing(m, sgn, x0, NP, pl, PW, (10, 14), yoke_len=YOKE, sada_len=SADA, z=0.0, sada_r=0.2)
            xbrace(m, sgn, x0 + sgn * SADA, x0 + sgn * (SADA + YOKE), PW)
    return palette(m, {**COMMON_FOLDS})
