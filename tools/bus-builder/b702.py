"""Boeing 702 (HP, MP and SP; BSS-702): the 27 geostationary satellites of the catalogue whose bus the sources name.

Metres, the app's axes: +Z the Earth deck, +X the wing axis, +Y the side the cells face.

WHAT IS PUBLISHED. McDowell's GCAT (CC BY 4.0, read 2026-11-07), the 27 mapped satellites: median 'Length' 7.0 m, 'Diameter' 3.2 m, 'Span' 36.9 m (30 to 48.1), mass 5 965 kg, shape 'Box + 2 Pan'. Gunter's Space Page lists 44 satellites on the bus.
WHAT IS READ OFF PICTURES, AGAINST THOSE METRES: a box with long, narrow wings of several panels each, a cluster of round reflectors at the Earth end, gold foil and white radiators (renders of Anik F1, Galaxy 11, PAS-1R, Anik F2, DIRECTV 10, Galaxy 3C, Inmarsat 5, NSS-8).
Looked at only: the makers' renders on Gunter's Space Page, which are renders and not photographs of flight hardware (craft that fly 36 000 km out are not photographed
from outside). WHAT IS OURS, because no page opened gives it: the body's three sizes (2.8 x 2.6 x 5.2 m), the panel count (five a wing) and width (2.4 m), the reflectors. The early concentrator arrays (flat reflector troughs beside the cells) of the first 702s are NOT drawn: the later HP and MP wings are flat. One file stands for the family at the median size of the satellites mapped to it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-boeing-702"
SX, SY, SZ = 2.8, 2.6, 5.2
SPAN, NP = 36.9, 5


def build(wings=True):
    m = Model(FILE_ID)
    standard(m, SX, SY, SZ, (NP, panel_len(SPAN, SX, NP, 1.0, 0.5), 2.4, (10, 12)),
             [("reflector-up", 1.05, 0.6, 1.0, 0.9, 0.3, 25, -0.4), ("reflector-mid", 1.15, -0.6, 1.0, 0.9, 0.3, 50, -0.8), ("reflector-low", 1.0, -1.7, 0.85, 0.75, 0.25, 70, -1.7)],  wings=wings)
    return m
