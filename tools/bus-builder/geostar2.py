"""Northrop Grumman (Orbital) GEOStar-2 (Star-2.3, 2.4, 2.4E): the 27 geostationary satellites of the catalogue whose bus the sources name.

Metres, the app's axes: +Z the Earth deck, +X the wing axis, +Y the side the cells face.

WHAT IS PUBLISHED. McDowell's GCAT (CC BY 4.0, read 2026-11-07), the 27 mapped satellites: median 'Length' 4.7 m, 'Diameter' 2.3 m, 'Span' 22.4 m (17 to 25.6), mass 2 938 kg, shape 'Box + 2 Pan'. Gunter's Space Page lists 33 satellites on the bus.
WHAT IS READ OFF PICTURES, AGAINST THOSE METRES: a compact box in dark-silver blanket with a large radiator side, wings of three panels, one or two large reflectors on the east and west faces (renders of Amazonas 4A, AMC-21, AzerSpace 1, Eutelsat 5 West B, Galaxy 12, Galaxy 15, New Dawn).
Looked at only: the makers' renders on Gunter's Space Page, which are renders and not photographs of flight hardware (craft that fly 36 000 km out are not photographed
from outside). WHAT IS OURS, because no page opened gives it: the body's sizes (2.0 x 2.0 x 3.6 m), the panel width (2.0 m), the reflectors. One file stands for the family at the median size of the satellites mapped to it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-geostar-2"
SX, SY, SZ = 2.0, 2.0, 3.6
SPAN, NP = 22.4, 3


def build(wings=True):
    m = Model(FILE_ID)
    standard(m, SX, SY, SZ, (NP, panel_len(SPAN, SX, NP, 0.7, 0.4), 2.0, (9, 12)),
             [("reflector-main", 1.2, 0.3, 1.25, 1.1, 0.36, 30, -0.5)], foil=DARK_FOIL, rad=OSR, yoke=0.7, sada=0.4, engine_r=(0.08, 0.28, 0.55), horns=((0.5, 3, 3),), wings=wings)
    return m
