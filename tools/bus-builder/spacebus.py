"""Thales Alenia Space Spacebus 3000 and 4000 (the B2, B3, C2, C3 and C4 classes): the 32 geostationary satellites of the catalogue whose bus the sources name.

Metres, the app's axes: +Z the Earth deck, +X the wing axis, +Y the side the cells face.

WHAT IS PUBLISHED. McDowell's GCAT (CC BY 4.0, read 2026-11-07), the 32 mapped satellites: median 'Length' 5.0 m, 'Diameter' 2.1 m, 'Span' 32.9 m (17 to 38), mass 4 004 kg, shape 'Box + 2 Pan'. Gunter's Space Page, bus pages 'Spacebus-3000/4000 B-Class' and 'C-Class': launch mass 3 000 to 5 900 kg, array power up to 15.8 kW, antenna accommodation 'from 2.4 m to 3.2 x 2.4 m'.
WHAT IS READ OFF PICTURES, AGAINST THOSE METRES: a box with a gold foil body and silver radiators on the north and south faces, five panels a wing on a short yoke, two large shaped reflectors on the east and west faces at the Earth end, a smaller one lower, feed clusters on the Earth deck (renders of Arabsat 3A, Atlantic Bird 2, Eutelsat W, Eurobird 1, Hispasat 1C, Sirius 2).
Looked at only: the makers' renders on Gunter's Space Page, which are renders and not photographs of flight hardware (craft that fly 36 000 km out are not photographed
from outside). WHAT IS OURS, because no page opened gives it: the body's three sizes (1.9 x 1.9 x 3.9 m), the panel width (1.9 m), the reflector sizes and positions, the horn clusters. One file stands for the family at the median size of the satellites mapped to it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-spacebus-4000"
SX, SY, SZ = 1.9, 1.9, 3.9
SPAN, NP = 32.9, 5


def build(wings=True):
    m = Model(FILE_ID)
    standard(m, SX, SY, SZ, (NP, panel_len(SPAN, SX, NP, 0.9, 0.45), 1.9, (8, 12)),
             [("reflector-main", 1.15, 0.6, 1.2, 1.1, 0.35, 25, -0.4), ("reflector-low", 1.0, -1.1, 0.9, 0.8, 0.27, 62, -1.2)], yoke=0.9, sada=0.45, wings=wings)
    return m
