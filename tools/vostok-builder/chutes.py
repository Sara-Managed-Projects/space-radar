"""vostok-chutes: the parachutes of Vostok, each canopy its own named part, drawn inflated.

  chute-sa-drogue     the capsule's pullout parachute, 1.5 m^2 (RussianSpaceWeb, 'Botched Vostok launch tests emergency landing'): it pulls the braking canopy out
  chute-sa-brake      the capsule's braking parachute, 18 m^2 (same page): 180 m/s to 70 m/s, released at 4 km
  chute-sa-main       the capsule's main canopy (PS-6415-59), 574 m^2 (same page), released at 2 km
  chute-pilot-drogue  the seat's stabilising drogue (museum: 2 m^2)
  chute-pilot-main    the cosmonaut's main canopy, 83.5 m^2 (Rambler)
  chute-pilot-reserve the cosmonaut's reserve canopy, 56 m^2 (Rambler); on 12 April 1961 it opened by itself and both flew

Metres, +Y up. Each canopy's ORIGIN is where its suspension lines meet (the confluence, where the load hangs); the canopy,
risers and lines stand above it. The canopies are laid out in a row along +X for the file; the registry row's `attach` says
where each origin is. Nominal diameters from the cited areas (a flat circle: d = sqrt(4 A / pi)); the inflated shape (about
0.66 of the nominal across, a gored oblate dome with a small vent at the apex, a scalloped skirt, one line to a gore) and every
colour are ILLUSTRATIVE: no published drawing of the canopies was found. The orange and white gores are the visibility scheme of
the recovery forces' parachutes read off photographs of the descent module and the cosmonaut's parachute on the ground.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlib import *  # noqa: F401,F403,E402
import lib  # noqa: E402

ORANGE = "#F0721E"
WHITE = "#EFEDE6"
LINE = "#D8D2C4"
RISER = "#C9B98E"
CONE = "#E8E4DA"
BAND = "#B8481F"
METAL = "#A0A6AC"


def nominal_d(area):
    return math.sqrt(4 * area / math.pi)


def canopy(st, label, area, gores, line_len, rise=0.0, sub=2, rows=9, vent=0.04, line_r=0.012, col_a=ORANGE, col_b=WHITE, flat=False, riser_len=0.0, cone=False):
    """A gored dome with its lines to the confluence at the origin. `area` m^2 nominal; `line_len` the suspension lines'
    length from the skirt to the confluence."""
    D = nominal_d(area)
    a = 0.33 * D                      # inflated radius at the skirt zone (0.66 of the nominal across)
    b = 0.30 * D if not flat else 0.17 * D       # the height of the dome above the skirt plane
    y_skirt = riser_len + line_len * 0.9
    # profile: from the skirt (angle 90 degrees below the apex plane) up to the vent
    def prof(t):
        # t = 0 at the skirt, 1 at the vent: an ellipse quadrant, the skirt flaring a touch out then in
        th = math.radians(88 * (1 - t) + 7 * t)
        return a * math.sin(th) * (1.0 + 0.06 * math.sin(math.pi * (1 - t))), b * math.cos(th)
    cols = gores * sub
    P = np.zeros((rows + 1, cols + 1, 3))
    for j in range(rows + 1):
        t = j / rows
        r0, h = prof(t)
        for i in range(cols + 1):
            ang = 2 * math.pi * i / cols
            g = (i % sub) / sub
            bulge = 1.0 + 0.045 * math.sin(math.pi * g) * (0.4 + 0.6 * math.sin(math.pi * min(t * 1.0, 1.0)))
            # the scalloped skirt: the hem rides up between lines
            hem = (0.07 * D * 0.06) * (1 - math.cos(2 * math.pi * g)) * (1 - t) ** 2 if True else 0
            P[j, i] = [r0 * bulge * math.cos(ang), y_skirt + h + hem, r0 * bulge * math.sin(ang)]
    # meshes per colour: even gores a, odd gores b; both faces
    for ci, col in enumerate((col_a, col_b)):
        faces = []
        Vv = P.reshape(-1, 3)
        for gidx in range(gores):
            if gidx % 2 != ci:
                continue
            for s in range(sub):
                i = gidx * sub + s
                for j in range(rows):
                    p0 = j * (cols + 1) + i
                    p1 = j * (cols + 1) + i + 1
                    p2 = (j + 1) * (cols + 1) + i + 1
                    p3 = (j + 1) * (cols + 1) + i
                    faces += [[p0, p1, p2], [p0, p2, p3], [p0, p2, p1], [p0, p3, p2]]
        st.add(label, "foil", col, (Vv, np.array(faces, dtype=np.int64)))
    # the vent's rim: a thin dark-banded ring at the apex
    r0, h = prof(1.0)
    st.add(label + "-vent", "body", BAND, frustum((0, y_skirt + h - 0.01, 0), (0, y_skirt + h + 0.01, 0), r0 * 1.02, r0 * 1.02, 16, caps=False))
    # the skirt band (a darker hem tape) and the radial seams
    r0, h = prof(0.0)
    st.add(label + "-hem", "body", BAND, frustum((0, y_skirt - 0.012 * D, 0), (0, y_skirt + 0.012 * D, 0), r0 * 1.004, r0 * 1.004, cols, caps=False))
    # the lines: one to each gore, from the skirt to the confluence, then the risers (two cords) to a single ring at the origin
    lines = []
    for gidx in range(gores):
        ang = 2 * math.pi * (gidx * sub) / cols
        top = V(r0 * math.cos(ang), y_skirt, r0 * math.sin(ang))
        mid = V(0.0, riser_len, 0.0) if riser_len else V(0, 0, 0)
        lines.append(rod(top, mid, line_r, 3))
    st.add(label + "-lines", "body", LINE, merge(lines))
    if riser_len:
        st.add(label + "-riser", "body", RISER, rod(V(0, 0, 0), V(0, riser_len, 0), line_r * 3.2, 5))
    st.add(label + "-ring", "body", METAL, lib.torus(V(0, 0, 0), (0, 0, 1), line_r * 7, line_r * 1.6, 12, 4))
    return D, y_skirt + b


def build():
    veh = Vehicle("vostok-chutes")
    x = 0.0
    out = []

    def put(name, area, **kw):
        nonlocal x
        st = Stage(name)
        D, top = canopy(st, name, area, **kw)
        r = 0.33 * D
        x += r + 1.5
        # move the part to its slot in the row: the file's own layout (the origin is the confluence)
        st.m.transform(t=(x, 0, 0))
        veh.add(name, st, (x, 0.0, 0.0))
        out.append((name, D, top, x))
        x += r + 1.5
        return st

    # the capsule's: drogue, brake, main
    put("chute-sa-drogue", 1.5, gores=8, line_len=3.0, riser_len=1.0, sub=2, rows=5, line_r=0.012, flat=True)
    put("chute-sa-brake", 18.0, gores=12, line_len=9.0, riser_len=2.0, sub=2, rows=6, line_r=0.02, flat=True)
    put("chute-sa-main", 574.0, gores=48, line_len=26.0, riser_len=5.0, sub=1, rows=10, line_r=0.03)
    # the seat's and the cosmonaut's: stabilising drogue, main, reserve
    put("chute-pilot-drogue", 2.0, gores=8, line_len=2.2, riser_len=0.6, sub=2, rows=5, line_r=0.008, flat=True)
    put("chute-pilot-main", 83.5, gores=24, line_len=9.0, riser_len=1.5, sub=2, rows=8, line_r=0.016)
    put("chute-pilot-reserve", 56.0, gores=20, line_len=7.5, riser_len=1.3, sub=2, rows=8, line_r=0.014, col_a=ORANGE, col_b=WHITE)
    veh.layout = out
    return veh


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "out/vostok-chutes.json"
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    v = build()
    v.export(out, limit=8)
    for n, D, top, x in v.layout:
        print("  %-20s nominal %.1f m, top %.1f m above its confluence, at x = %.2f" % (n, D, top, x))
