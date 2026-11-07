"""HELD, NOT SHIPPED (no file, no route; registry/geo-buses.yaml says why): the renders of the I-2K's satellites show a long boom with a gold solar-sail trim tab and wings of three panels, and this draft draws neither.

ISRO I-2K (I-2000): the 8 geostationary satellites of the catalogue whose bus the sources name.

Metres, the app's axes: +Z the Earth deck, +X the wing axis, +Y the side the cells face.

WHAT IS PUBLISHED. McDowell's GCAT (CC BY 4.0, read 2026-11-07), the 8 mapped satellites: median 'Length' 3.6 m, 'Diameter' 2.0 m, 'Span' 9.5 m (9 to 12), mass 2 250 kg, shape 'Box + 2 Pan'. Gunter's Space Page bus page 'I-2K (I-2000) Bus' lists 26 satellites.
WHAT IS READ OFF PICTURES, AGAINST THOSE METRES: a small box in gold and white with a short wing of two panels each side and a deployed reflector on one face (renders of INSAT-2A, 2C, 2E, 3A, 3B, 3C, 3D, 3DR).
Looked at only: the makers' renders on Gunter's Space Page, which are renders and not photographs of flight hardware (craft that fly 36 000 km out are not photographed
from outside). WHAT IS OURS, because no page opened gives it: the body's sizes (1.8 x 1.8 x 2.8 m), the panel width (1.4 m), the reflector. One file stands for the family at the median size of the satellites mapped to it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-i2k"
SX, SY, SZ = 1.8, 1.8, 2.8
SPAN, NP = 9.5, 2


def build(wings=True):
    m = Model(FILE_ID)
    standard(m, SX, SY, SZ, (NP, panel_len(SPAN, SX, NP, 0.3, 0.3), 1.4, (6, 8)),
             [("reflector-main", 0.9, 0.3, 0.85, 0.75, 0.25, 30, -0.3)], yoke=0.3, sada=0.3, engine_r=(0.07, 0.22, 0.4), horns=((0.4, 2, 2),), wings=wings)
    return m
