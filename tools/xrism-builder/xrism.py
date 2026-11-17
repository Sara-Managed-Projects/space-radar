"""XRISM (JAXA / NASA, launched 2023): the bus of xlib, a flare and a gold drum, a top plate with two large barrels (the soft X-ray
telescopes, the mirrors) and two small ones, two three-panel paddles. 7.9 m tall (published), 9.2 m across the paddles (published).
Which barrel is which and where each stands is ours (read off the NASA renders, looked at only)."""
import xlib
from xlib import *  # noqa: F401,F403

FILE_ID = "xrism"


def build():
    m = Model("xrism")
    bus(m)
    z_drum0, z_drum1 = Z_BASE - BUS_H - 1.25, Z_TOP + 0.75   # 3.95 - 3.1 - 1.25 = -0.4 ; -3.2
    drum(m, z_drum0, z_drum1)
    for c, r, L, name in (((0.42, -0.24, z_drum1), 0.38, 0.95, "sxt-1"), ((-0.42, 0.24, z_drum1), 0.38, 0.95, "sxt-2"),
                          ((-0.5, -0.62, z_drum1), 0.17, 0.6, "star-tracker"), ((0.5, 0.62, z_drum1), 0.17, 0.6, "sun-baffle")):
        barrel(m, c, r, L, name)
    paddles(m, zc=Z_BASE - BUS_H + 1.1)
    return m
