"""ISRO I-3K (I-3000): the 10 geostationary satellites of the catalogue whose bus the sources name.

Metres, the app's axes: +Z the Earth deck, +X the wing axis, +Y the side the cells face.

WHAT IS PUBLISHED. McDowell's GCAT (CC BY 4.0, read 2026-11-07), the 10 mapped satellites: median 'Length' 3.1 m, 'Diameter' 1.8 m, 'Span' 20 m (15.4 to 37.4), mass 3 379 kg, shape 'Box + 2 Pan'. Gunter's Space Page bus page 'I-3K (I-3000) Bus' lists 13 satellites.
WHAT IS READ OFF PICTURES, AGAINST THOSE METRES: a small box in gold and white with a wing of three wide panels each side and two or three gimballed reflectors on the sides and the top (renders of Eutelsat W2M, GSAT-8, GSAT-10, GSAT-15, GSAT-16, GSAT-17, GSAT-18, GSAT-19).
Looked at only: the makers' renders on Gunter's Space Page, which are renders and not photographs of flight hardware (craft that fly 36 000 km out are not photographed
from outside). WHAT IS OURS, because no page opened gives it: the body's sizes (1.7 x 1.7 x 2.4 m), the panel width (2.0 m), the reflectors. One file stands for the family at the median size of the satellites mapped to it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-i3k"
SX, SY, SZ = 1.7, 1.7, 2.4
SPAN, NP = 20, 3


def build(wings=True):
    m = Model(FILE_ID)
    standard(m, SX, SY, SZ, (NP, panel_len(SPAN, SX, NP, 0.5, 0.3), 2.0, (8, 10)),
             [("reflector-main", 0.95, 0.35, 0.95, 0.85, 0.27, 30, -0.3), ("reflector-low", 0.9, -0.8, 0.75, 0.65, 0.22, 65, -0.8)], yoke=0.5, sada=0.3, engine_r=(0.07, 0.24, 0.45), horns=((0.4, 2, 3),), wings=wings)
    return m
