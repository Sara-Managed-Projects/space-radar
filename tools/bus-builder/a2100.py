"""Lockheed Martin A2100 (A2100A, AX, AXS): the 19 geostationary satellites of the catalogue whose bus the sources name.

Metres, the app's axes: +Z the Earth deck, +X the wing axis, +Y the side the cells face.

WHAT IS PUBLISHED. McDowell's GCAT (CC BY 4.0, read 2026-11-07), the 19 mapped satellites: median 'Length' 5.5 m, 'Diameter' 2.4 m, 'Span' 26 m (14.7 to 30.8), mass 4 048 kg, shape 'Box + 2 Pan'. Wikipedia 'A2100' (read 2026-11-07): the central propellant tank 0.90 m across and up to 2.55 m long, two flanking oxidiser tanks of 0.54 m, the LEROS apogee engine.
WHAT IS READ OFF PICTURES, AGAINST THOSE METRES: a slender box in silver and white blanket with a gold lower end, wings of four panels held on stand-off struts, a pair of large reflectors on arms at the Earth end (renders of EchoStar 3, Nimiq 1, Telkom 1, GE-7, BSAT-3, BSAT-3C, GE-1).
Looked at only: the makers' renders on Gunter's Space Page, which are renders and not photographs of flight hardware (craft that fly 36 000 km out are not photographed
from outside). WHAT IS OURS, because no page opened gives it: the body's three sizes (1.9 x 1.8 x 4.4 m), the panel width (1.8 m), the reflectors' sizes and tilts. One file stands for the family at the median size of the satellites mapped to it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-a2100"
SX, SY, SZ = 1.9, 1.8, 4.4
SPAN, NP = 26, 4


def build(wings=True):
    m = Model(FILE_ID)
    standard(m, SX, SY, SZ, (NP, panel_len(SPAN, SX, NP, 0.8, 0.4), 1.8, (7, 12)),
             [("reflector-main", 1.25, 0.5, 1.2, 1.05, 0.33, 35, -0.5), ("reflector-low", 1.1, -1.4, 0.9, 0.8, 0.27, 65, -1.4)], foil=SILVER_FOIL, yoke=0.8, sada=0.4, wings=wings)
    return m
