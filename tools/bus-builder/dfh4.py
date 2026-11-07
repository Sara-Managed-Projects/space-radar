"""CAST DFH-4 (Dongfanghong-4, with the DFH-4E): the 20 geostationary satellites of the catalogue whose bus the sources name.

Metres, the app's axes: +Z the Earth deck, +X the wing axis, +Y the side the cells face.

WHAT IS PUBLISHED. McDowell's GCAT (CC BY 4.0, read 2026-11-07), the 20 mapped satellites: median 'Length' 5.0 m, 'Diameter' 2.5 m, 'Span' 30 m (15.5 to 30), mass 5 086 kg, shape 'Box + 2 Pan' (four with a dish). Gunter's Space Page bus page 'DFH-4 Bus' lists 35 satellites.
WHAT IS READ OFF PICTURES, AGAINST THOSE METRES: a box in gold foil with silvery side radiators, wings of four panels, two large reflectors on the east and west faces and a smaller one (renders of AlComSat 1, APStar 6C, APStar 9, Belintersat 1, NigComSat 1, NICASAT 1, PakSat 1R).
Looked at only: the makers' renders on Gunter's Space Page, which are renders and not photographs of flight hardware (craft that fly 36 000 km out are not photographed
from outside). WHAT IS OURS, because no page opened gives it: the body's three sizes (2.3 x 2.3 x 3.8 m), the panel width (2.2 m), the reflectors. One file stands for the family at the median size of the satellites mapped to it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-dfh-4"
SX, SY, SZ = 2.3, 2.3, 3.8
SPAN, NP = 30, 4


def build(wings=True):
    m = Model(FILE_ID)
    standard(m, SX, SY, SZ, (NP, panel_len(SPAN, SX, NP, 0.9, 0.45), 2.2, (9, 13)),
             [("reflector-up", 1.1, 0.6, 1.2, 1.0, 0.32, 25, -0.4), ("reflector-low", 1.05, -1.2, 1.0, 0.85, 0.27, 62, -1.2)], yoke=0.9, sada=0.45, wings=wings)
    return m
