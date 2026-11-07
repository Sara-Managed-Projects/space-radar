"""Thales Alenia Space Spacebus 4000B (B2, B3) and 3000B (B2, B3): the geostationary satellites of the catalogue whose bus the sources name as a B member (registry/geo-buses.yaml,
bus `spacebus-4000b`). Rebuilt in batch m4-buses (release 2.0.0) after the m2 hold. The C members (C2, C3, C4) stay held under `spacebus-4000`: their renders disagree on the wing
(cross-shaped on AMC-12, AMC-23, Eutelsat W3B and W7; straight on W6A, APStar-7 and Hellas Sat 3).

Metres, the app's axes: +Z the Earth deck, +X the wing axis (north-south), +Y east-west (the side the cells face).

WHAT IS PUBLISHED, AND USED AS THE SIZE: Wikipedia 'Spacebus' (read 2026-11-07): 'The B series used the same basic structure as the 3000 series'; 'Spacebus 4000B3 satellites are 3.7
metres (12 ft) in height'. McDowell's GCAT (CC BY 4.0, satcat.tsv of 2026-11-07), the B rows: 'Diameter' 1.8 for most (2.3 to 3.5 for a few), 'Length' 2.8 to 5.5 m, 'Span' 17 to 38 m
(median 30). Drawn: a box 1.8 x 1.8 x 3.4 m, 4.4 m with the deck antennas; 30.0 m over the wings.
WHAT IS READ OFF PICTURES: Thales Alenia Space's renders, LOOKED AT ONLY: Inmarsat GX5 on Wikimedia Commons ('Satellite Inmarsat GX5.jpg', CC BY-SA 4.0) and Athena-Fidus,
Bangabandhu-1, Galaxy 17 and Merah Putih 2 on Gunter's Space Page, which agree with one another: a narrow box in gold and copper blanket; north and south faces of bright, blue-silver
OSR radiators wider than the box; two reflectors off each of the east and west walls, one high and one low; straight wings of three or four panels on long V yokes. No photograph of a
flown Spacebus 4000B under a free licence was found (Commons by every satellite's name; NASA's and ESA's libraries), so the card says the shape is built from published sizes and the
maker's renders.
WHAT IS OURS (ESTIMATED): the reflectors' 2.2 m and 2.0 m, their arms and tilts; four panels of 2.2 x 2.85 m a wing; the yoke's 2.0 m; the radiators' extra width; the feeds and horns.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geoparts import *  # noqa: F401,F403,E402

FILE_ID = "bus-spacebus-4000b"
SX, SY, SZ = 1.8, 1.8, 3.4
SPAN, NP, PW = 30.0, 4, 2.2
YOKE, SADA = 2.0, 0.35
COPPER = "#B9853C"
OSR_BLUE = "#A9B8C6"      # the renders' bright blue-silver radiators: silvered OSR, metal
OSR_BLUE_SEAM = "#7F8EA0"


def build(wings=True):
    m = Model(FILE_ID)
    zf = SZ / 2
    blanket_box(m, SX, SY, SZ, GOLD, patch=(COPPER, GOLD_D), seed=61, seams=(2, 5), crinkle=0.045)
    radiators(m, SX, SY, SZ, face=OSR_BLUE, seam=OSR_BLUE_SEAM, over=0.3, wide=0.5, tiles=(6, 10), zc=-0.1)
    earth_deck(m, SX, SY, SZ, COPPER, horns=((0.0, -0.4, 2, 3),), omnis=((-0.6, 0.6), (0.6, 0.6)), sensor=(0.0, 0.45))
    for sgn in (-1, 1):
        side_reflector(m, "reflector-high", sgn, SY, SZ, 0.35, 1.3, zf + 0.5, 2.2, 25, feed=(2, 3))
        side_reflector(m, "reflector-low", sgn, SY, SZ, -0.35, 1.25, zf - 1.55, 2.0, 15, feed=(2, 2), feed_z=-zf + 0.55)
    aft(m, SX, SY, SZ, foil=GOLD, engine_r=(0.08, 0.3, 0.7), ring=0.5)
    if wings:
        pl = round(((SPAN - SX) / 2 - 0.05 - SADA - YOKE - (NP - 1) * 0.07) / NP, 2)
        for sgn in (-1, 1):
            wing(m, sgn, sgn * (SX / 2 + 0.05), NP, pl, PW, (9, 12), yoke_len=YOKE, sada_len=SADA, z=-0.1, sada_r=0.15)
    return palette(m, {**COMMON_FOLDS})
