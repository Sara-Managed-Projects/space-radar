"""Mitsubishi Electric DS2000: the 8 geostationary satellites of the catalogue whose bus the sources name.

Metres, the app's axes: +Z the Earth deck, +X the wing axis, +Y the side the cells face.

WHAT IS PUBLISHED. McDowell's GCAT (CC BY 4.0, read 2026-11-07), the 8 mapped satellites: median 'Length' 6.2 m, 'Diameter' 3.8 m, 'Span' 30 m (17 to 31.6), mass 4 964 kg, shape 'Box + 2 Pan'. Gunter's Space Page bus page 'DS-2000' lists 19 satellites.
WHAT IS READ OFF PICTURES, AGAINST THOSE METRES: a tall box in black and silver blanket with a gold lower end, wings of three to four wide panels, a reflector pair on the east and west faces (renders of DRTS, DSN-1 / Superbird 8, DSN-2, Es'hail 2, Himawari 8, JDRS-1).
Looked at only: the makers' renders on Gunter's Space Page, which are renders and not photographs of flight hardware (craft that fly 36 000 km out are not photographed
from outside). WHAT IS OURS, because no page opened gives it: the body's three sizes (3.0 x 2.8 x 5.0 m), the panel width (2.4 m), the reflectors. One file stands for the family at the median size of the satellites mapped to it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-ds2000"
SX, SY, SZ = 3.0, 2.8, 5.0
SPAN, NP = 30, 4


def build(wings=True):
    m = Model(FILE_ID)
    standard(m, SX, SY, SZ, (NP, panel_len(SPAN, SX, NP, 1.0, 0.5), 2.4, (10, 13)),
             [("reflector-main", 1.2, 0.5, 1.2, 1.05, 0.34, 28, -0.5), ("reflector-low", 1.1, -1.6, 0.9, 0.8, 0.27, 62, -1.6)], foil=DARK_FOIL, yoke=1.0, sada=0.5, wings=wings)
    return m
