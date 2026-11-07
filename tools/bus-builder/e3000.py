"""Airbus Eurostar E3000 (and E3000S, E3000EOR): the 48 geostationary satellites of the catalogue whose bus the sources name.

Metres, the app's axes: +Z the Earth deck, +X the wing axis, +Y the side the cells face.

WHAT IS PUBLISHED. McDowell's GCAT (CC BY 4.0, read 2026-11-07), the 48 mapped satellites: median 'Length' 5.3 m, 'Diameter' 2.8 m, 'Span' 39 m (30 to 47), mass 5 382 kg, shape 'Box + 2 Pan'. Gunter's Space Page, bus page 'Eurostar-3000': the 49 satellites of the bus with their masses (4 600 to 6 400 kg).
WHAT IS READ OFF PICTURES, AGAINST THOSE METRES: a tall box with silvery radiator panels on the north and south faces, the wings out of those faces on a short yoke with a drive, a lower propulsion section in gold foil, four shaped reflectors (two on each of the east and west faces, the upper pair near the Earth end) on hinge arms, feed-horn clusters on the Earth deck (renders of Amazonas 2, Arabsat 5A, Astra 2E, Astra 3B, SES 6, SES 10, Eutelsat 3B, KA-SAT).
Looked at only: the makers' renders on Gunter's Space Page, which are renders and not photographs of flight hardware (craft that fly 36 000 km out are not photographed
from outside). WHAT IS OURS, because no page opened gives it: the body's three sizes (2.4 x 2.3 x 4.0 m), the panel count (four a wing) and size (4.0 x 2.2 m), the reflectors' sizes (2.4 x 2.0 m), the horn clusters. One file stands for the family at the median size of the satellites mapped to it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-eurostar-e3000"
SX, SY, SZ = 2.4, 2.3, 4.0


def build(wings=True):
    m = Model(FILE_ID)
    standard(m, SX, SY, SZ, (4, 4.0, 2.2, (9, 17)),
             [("reflector-up", 0.95, 0.55, 1.2, 1.0, 0.32, 20, -0.4), ("reflector-low", 1.05, -1.25, 1.15, 0.95, 0.3, 62, -1.3)], wings=wings)
    return m
