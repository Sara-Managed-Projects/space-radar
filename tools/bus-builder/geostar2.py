"""Northrop Grumman (Orbital) GEOStar-2 (Star-2, Star-2.4, GEOStar-2e): the 27 geostationary satellites of the catalogue whose bus the sources name. Rebuilt in batch m4-buses
(release 2.0.0) after the m2 hold.

Metres, the app's axes: +Z the Earth deck, +X the wing axis (north-south), +Y east-west (the side the cells face).

WHAT IS PUBLISHED, AND USED AS THE SIZE: McDowell's GCAT (CC BY 4.0, satcat.tsv of 2026-11-07), the 27 satellites: 'Length' 3.2 to 5.6 m (median 4.7, with the stowed antennas),
'Diameter' 2.0 to 3.4 m (median 2.3), 'Span' 17.0 to 25.6 m (median 22.4), launch mass 2 000 to 3 300 kg: the SMALLEST of the drawn buses. Drawn: a box 1.8 (north-south) x 2.3
(east-west) x 3.2 m, 4.4 m with the deck antennas; 22.4 m over the wings.
WHAT IS READ OFF PICTURES: Orbital ATK's and Northrop Grumman's renders on Gunter's Space Page (Amazonas 4A, Azerspace-1, Eutelsat 5 West B, Galaxy 30, Horizons-2, Hylas 2; looked at
only), which agree with one another: a small box in mottled silver and dark blanket; two large shaped reflectors, one off each of the east and west walls, swung up high beside the deck;
long narrow wings of three panels, each with a pale end panel and the deployment cables running along its edges, on a short yoke. No photograph of a flown GEOStar-2 under a free licence
was found (Commons by every satellite's name; NASA's library), so the card says the shape is built from published sizes and the maker's renders.
WHAT IS OURS (ESTIMATED): the reflectors' 2.4 m and their arms and tilts; three panels of 2.15 x 2.6 m and a 0.7 m pale end panel a wing (the end panel's purpose is not published: it
is drawn as the renders show it); the yoke; the feeds and horns; the radiator tiles.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geoparts import *  # noqa: F401,F403,E402

FILE_ID = "bus-geostar-2"
SX, SY, SZ = 1.8, 2.3, 3.2
SPAN, NP, PW = 22.4, 3, 2.15
YOKE, SADA, TIP = 0.9, 0.35, 0.7
MLI_SILVER = "#B7BCC4"


def build(wings=True):
    m = Model(FILE_ID)
    zf = SZ / 2
    blanket_box(m, SX, SY, SZ, MLI_SILVER, patch=(BLANKET_BLACK, SILVER_FOIL), seed=21, seams=(3, 4), crinkle=0.045)
    radiators(m, SX, SY, SZ, tiles=(5, 8))
    earth_deck(m, SX, SY, SZ, MLI_SILVER, horns=((0.0, -0.5, 2, 2),), omnis=((-0.55, 0.75), (0.55, 0.75)), sensor=(0.0, 0.35))
    m.add("deck-tower", "foil", BLANKET_BLACK, lib.box((0.0, -0.45, zf + 0.4), (0.8, 0.7, 0.8), crinkle=0.02, seed=8, div=0.25))
    reflector(m, "deck-reflector", (0.0, 0.1, zf + 1.05), (0, -0.4, 0.92), 0.5, 0.5, 0.1, up=(1, 0, 0), arm_from=(0.0, -0.3, zf + 0.8), feed=True, ribs=6)
    for sgn in (-1, 1):
        # the large shaped reflector, swung up high beside the deck
        side_reflector(m, "reflector", sgn, SY, SZ, 0.0, 1.45, zf + 0.35, 2.4, 25, front=DISH_FRONT, back=SILVER_FOIL, feed=(3, 3))
        for k, zz in enumerate((-0.6, 0.4)):
            m.add("wall-unit", "foil", BLANKET_BLACK, lib.box((0.3 * (-1) ** k, sgn * (SY / 2 + 0.12), zz), (0.8, 0.2, 0.45), crinkle=0.02, seed=60 + k, div=0.2))
    aft(m, SX, SY, SZ, foil=SILVER_FOIL, engine_r=(0.07, 0.26, 0.6), ring=0.5)
    if wings:
        pl = round(((SPAN - SX) / 2 - 0.05 - SADA - YOKE - TIP - NP * 0.07) / NP, 2)
        for sgn in (-1, 1):
            x0 = sgn * (SX / 2 + 0.05)
            xe = wing(m, sgn, x0, NP, pl, PW, (8, 10), yoke_len=YOKE, sada_len=SADA, z=-0.2, sada_r=0.15)
            # the pale end panel the renders draw at each wing's tip, and the cables along the wing's edges
            m.add("tip-panel", "body", WHITE_OSR, lib.box((xe + sgn * (0.07 + TIP / 2), 0, -0.2), (TIP, 0.03, PW * 0.96)))
            for k in (-1, 1):
                m.add("wing-cable", "body", SILVER_D, lib.rod((x0 + sgn * (SADA + YOKE), 0.03, -0.2 + k * PW * 0.52), (xe + sgn * (0.07 + TIP), 0.03, -0.2 + k * PW * 0.52), 0.012, 4))
    return palette(m, {**COMMON_FOLDS, ("foil", GOLD): SILVER_FOIL, ("body", SILVER): SILVER_D})
