"""ISRO I-2K (I-2000): the GSATs and Hylas 1 of the catalogue whose bus the sources name. Rebuilt in batch m4-buses (release 2.0.0) after the m2 hold (whose reason, the INSAT-2 and -3
trim-sail boom, belongs to satellites that are not in today's rows). GSAT-6 (a 6 m unfurlable S-band reflector) and EOS-05 (GISAT-1A, an imaging telescope) fly the bus under a
payload this file does not draw: they are `stand_in` rows in registry/geo-buses.yaml.

Metres, the app's axes: +Z the Earth deck, +X the wing axis (north-south), +Y east-west (the side the cells face).

WHAT IS PUBLISHED, AND USED AS THE SIZE: Wikipedia 'INSAT Satellite bus' (read 2026-11-07), I-2K: 'Dimensions: 1.65 * 1.53m in plan & 3.0m in height', launch mass 2 000 to 2 300 kg.
McDowell's GCAT (CC BY 4.0, satcat.tsv of 2026-11-07): 'Span' 9.0 to 12 m (median 9.5). Drawn: a box 1.65 (north-south) x 1.53 (east-west) x 3.0 m; 9.6 m over the wings.
WHAT IS READ OFF PICTURES, AND THESE ARE PHOTOGRAPHS: ISRO's clean-room photographs of GSAT-31 on Wikimedia Commons (GODL-India; LOOKED AT ONLY): in the compact antenna test facility, at
the reflector deployment test and at the north solar-array deployment test. They show the box in crinkled GOLD kapton, a WHITE radiator face, a large DARK carbon-fibre reflector off
one wall, dark cells with red-orange strings. ISRO's renders on Gunter's Space Page (GSAT-7, 7A, 9, 14, 31, Hylas; looked at only) agree on the box, the dark reflectors and wings of
two panels on GCAT's spans; GSAT-31's photographs show a longer wing than its GCAT span, and the file draws GCAT's.
WHAT IS OURS (ESTIMATED): the reflectors' 2.0 m and 1.4 m and their arms and tilts; two panels of 1.5 x 1.55 m a wing; the yoke; the feeds and horns.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geoparts import *  # noqa: F401,F403,E402

FILE_ID = "bus-i-2k"
SX, SY, SZ = 1.65, 1.53, 3.0
SPAN, NP, PW = 9.6, 2, 1.5
YOKE, SADA = 0.55, 0.3
DARK_CELL = "#23252E"


def build(wings=True):
    m = Model(FILE_ID)
    zf = SZ / 2
    blanket_box(m, SX, SY, SZ, GOLD, patch=(GOLD_L, GOLD_D), seed=51, seams=(2, 4), crinkle=0.05)
    radiators(m, SX, SY, SZ, tiles=(4, 8))
    earth_deck(m, SX, SY, SZ, GOLD, horns=((0.0, -0.35, 2, 2),), omnis=((-0.55, 0.55), (0.55, 0.55)), sensor=(0.45, -0.45))
    # one large reflector on the east wall and a smaller one on the west, as GSAT-31 and the renders show
    side_reflector(m, "reflector", 1, SY, SZ, 0.0, 1.25, zf - 0.4, 2.0, 22, front=GRAPHITE, back=GRAPHITE_BACK, feed=(2, 2))
    side_reflector(m, "reflector-small", -1, SY, SZ, 0.0, 0.95, zf - 0.25, 1.4, 22, front=GRAPHITE, back=GRAPHITE_BACK, feed=(2, 2))
    for sgn in (-1, 1):
        m.add("wall-unit", "foil", GOLD_L, lib.box((0.25, sgn * (SY / 2 + 0.1), -0.5), (0.7, 0.18, 0.4), crinkle=0.025, seed=90 + sgn, div=0.2))
    aft(m, SX, SY, SZ, foil=GOLD, engine_r=(0.06, 0.24, 0.55), ring=0.45)
    if wings:
        pl = round(((SPAN - SX) / 2 - 0.05 - SADA - YOKE - (NP - 1) * 0.07) / NP, 2)
        for sgn in (-1, 1):
            x0 = sgn * (SX / 2 + 0.05)
            wing(m, sgn, x0, NP, pl, PW, (7, 7), yoke_len=YOKE, sada_len=SADA, z=0.0, sada_r=0.13)
            strings(m, sgn, x0, NP, pl, PW, SADA, YOKE)
    return palette(m, {**COMMON_FOLDS, ("solar-panel", CELL): DARK_CELL})
