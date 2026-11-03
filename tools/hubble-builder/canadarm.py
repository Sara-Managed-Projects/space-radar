"""The Shuttle Remote Manipulator System (the Canadarm) on its port sill, and the Hubble's berth in the bay, in parts
for the Moment `hubble-deployment` (release 1.7.6, internal #1058).

THE FRAME is the file `site/models/shuttle-orbiter.glb`'s own (metres, +Y toward the nose, +X starboard, +Z up out of the
open bay, y = 0 at the tail's tip): the arm is stowed on the port longeron (x = -2.6) with its shoulder at the bay's
forward end (y = 27.0) and lies straight aft. The Moment lays this file on the orbiter with `keepXZ` and no offset, and
turns the three links about their joints (`pose` keyframes computed by tools/moments-build/hubble.mjs).

WHAT IS PUBLISHED: the RMS is 15.2 m (50 ft) long and 38 cm (15 in) across (Wikipedia, "Canadarm"; the IEEE Canadian
Millennium Project's technical page, read 3 November 2026, which gives the carbon-composite upper arm boom as about 5 m and
the lower as about 5.8 m, each 33 cm across), six joints (shoulder yaw and
pitch, elbow pitch, wrist pitch, yaw and roll), a closed-circuit television camera at the elbow and one at the wrist, the
end effector a snare on the grapple fixture's probe, white thermal blankets with gold at the joints (as the photographs
of the arm on STS-31 show: NASA, public domain, 'Canada' on the lower arm). OURS: every other size, within the photographs;
the wordmark is not drawn.
The berth: the telescope sat on two aft trunnion latches on the longerons and one keel latch on the bay floor (the
Hubble's own trunnions and keel fitting are on its model, `hubble-sts31`); the latches here are ours in shape.

parts: body (the base, the retention latches, the berth), rms-upper, rms-lower, rms-wrist.
"""
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "stage-builder"))
sys.path.insert(0, os.path.join(HERE, "..", "vostok-builder"))
import vlib  # noqa: F401,E402
from lib import V, box, frustum, merge, Model, sphere, torus, rod  # noqa: E402

WHITE = "#F0F0EE"
GREYW = "#CFCFCD"
GOLD = "#C9A24A"
DARK = "#3A3D42"
METAL = "#8A9099"
BLACK = "#1E2127"
CAM = "#2A2D33"

P0 = np.array([-2.62, 27.0, -0.80])     # the shoulder joint's centre
L1, L2, L3 = 6.0, 6.8, 2.4              # shoulder to elbow, elbow to wrist (the booms are about 5.0 and 5.8 m, the joints' housings the rest), wrist to the end effector's tip: 15.2 m in all
D = np.array([0.0, -1.0, 0.0])          # the stowed direction: aft
UP = np.array([0.0, 0.0, 1.0])
SIDE = np.array([1.0, 0.0, 0.0])
R_ARM = 0.19


def at(a, off=(0, 0, 0)):
    """The point `a` metres along the stowed arm from the shoulder, offset (x, y, z)."""
    return P0 + D * a + np.array(off, float)


def tube(a0, a1, r=R_ARM, col=WHITE, seg=20):
    return frustum(at(a0), at(a1), r, r, seg=seg)


def band(a, w=0.12, r=R_ARM + 0.012):
    return frustum(at(a - w / 2), at(a + w / 2), r, r, seg=20)


def cyl_x(c, length, r, seg=20):
    c = np.array(c, float)
    return frustum(c - SIDE * length / 2, c + SIDE * length / 2, r, r, seg=seg)


parts = {k: Model(k) for k in ("body", "rms-upper", "rms-lower", "rms-wrist")}


def add(part, label, role, col, mesh):
    parts[part].add(label, role, col, mesh)


# ---- the base: the shoulder's pedestal on the longeron, the retention latches ---------------------------------------
add("body", "shoulder-pedestal", "body", METAL, box(P0 + np.array([0, 0, -0.34]), (0.9, 1.1, 0.5)))
add("body", "shoulder-pedestal-dark", "body", DARK, box(P0 + np.array([0, 0.0, -0.62]), (0.7, 0.9, 0.08)))
for y in (21.2, 15.4):
    add("body", "retention-latch", "body", DARK, box(np.array([-2.62, y, -0.98]), (0.5, 0.5, 0.36)))
    add("body", "retention-jaw", "body", METAL, box(np.array([-2.62, y, -0.74]), (0.34, 0.28, 0.14)))

# ---- the upper arm: shoulder housing, boom, bands, the elbow's housing -----------------------------------------------
add("rms-upper", "shoulder-housing", "foil", GOLD, merge([frustum(at(-0.3), at(0.45), 0.31, 0.27, seg=24)]))
add("rms-upper", "shoulder-pitch", "body", GREYW, cyl_x(at(0.0), 0.8, 0.22))
add("rms-upper", "upper-boom", "body", WHITE, tube(0.45, L1 - 0.4))
add("rms-upper", "upper-bands", "body", GREYW, merge([band(a) for a in np.linspace(1.2, L1 - 1.0, 6)]))
add("rms-upper", "upper-cable-tray", "body", METAL, box(at(3.3, (0, 0, R_ARM + 0.03)), (0.07, L1 - 1.9, 0.05)))
add("rms-upper", "elbow-housing", "foil", GOLD, merge([cyl_x(at(L1), 0.72, 0.27)]))
add("rms-upper", "elbow-caps", "body", GREYW, merge([cyl_x(at(L1, (0.38, 0, 0)), 0.06, 0.29), cyl_x(at(L1, (-0.38, 0, 0)), 0.06, 0.29)]))

# ---- the lower arm: its boom, the elbow camera on its bracket, the wrist housing -------------------------------------
add("rms-lower", "lower-boom", "body", WHITE, tube(L1 + 0.3, L1 + L2 - 0.45))
add("rms-lower", "lower-bands", "body", GREYW, merge([band(a) for a in np.linspace(L1 + 1.3, L1 + L2 - 1.1, 6)]))
add("rms-lower", "elbow-camera-bracket", "body", METAL, merge([rod(at(L1 + 0.1, (0, 0, 0.26)), at(L1 + 0.1, (0, 0, 0.55)), 0.04)]))
add("rms-lower", "elbow-camera", "body", CAM, merge([box(at(L1 + 0.1, (0, 0, 0.66)), (0.22, 0.26, 0.22)), frustum(at(L1 + 0.1, (0, 0, 0.66)), at(L1 - 0.1, (0, 0, 0.66)), 0.07, 0.09, seg=12)]))
add("rms-lower", "elbow-camera-pt", "body", GREYW, box(at(L1 + 0.1, (0, 0, 0.5)), (0.3, 0.14, 0.1)))
add("rms-lower", "wrist-pitch-housing", "foil", GOLD, merge([cyl_x(at(L1 + L2 - 0.25), 0.55, 0.22)]))

# ---- the wrist: yaw and roll housings, the end effector with its snare ring, the wrist camera and its light ---------------
w0 = L1 + L2
add("rms-wrist", "wrist-yaw-housing", "body", GREYW, merge([frustum(at(w0 - 0.15), at(w0 + 0.95), 0.2, 0.18, seg=20)]))
add("rms-wrist", "wrist-roll-gold", "foil", GOLD, merge([frustum(at(w0 + 0.95), at(w0 + 1.2), 0.2, 0.2, seg=20)]))
add("rms-wrist", "end-effector", "body", WHITE, merge([frustum(at(w0 + 1.2), at(w0 + L3 - 0.2), 0.17, 0.2, seg=20)]))
add("rms-wrist", "snare-ring", "body", METAL, merge([torus(at(w0 + L3 - 0.1), D, 0.2, 0.03, 24, 6), frustum(at(w0 + L3 - 0.2), at(w0 + L3), 0.2, 0.22, seg=20, caps=False)]))
add("rms-wrist", "wrist-camera", "body", CAM, merge([box(at(w0 + 1.6, (0, 0, 0.3)), (0.2, 0.3, 0.2)), frustum(at(w0 + 1.45, (0, 0, 0.3)), at(w0 + 1.25, (0, 0, 0.3)), 0.06, 0.08, seg=12)]))
add("rms-wrist", "wrist-light", "body", METAL, box(at(w0 + 1.6, (0, 0, -0.3)), (0.16, 0.2, 0.14)))
add("rms-wrist", "wrist-camera-arm", "body", METAL, merge([rod(at(w0 + 1.6, (0, 0, 0.17)), at(w0 + 1.6, (0, 0, 0.3)), 0.03), rod(at(w0 + 1.6, (0, 0, -0.17)), at(w0 + 1.6, (0, 0, -0.3)), 0.03)]))

# ---- the berth: the two aft trunnion latches on the longerons, the keel latch on the bay floor ---------------------------
Y_TRUN = 21.94          # the telescope's equipment section, where its trunnions are (hubble-sts31 y -2.15 -> 19.79 - y)
for s in (-1, 1):
    add("body", "trunnion-latch", "body", METAL, box(np.array([s * 2.43, Y_TRUN, -1.45]), (0.5, 0.7, 0.42)))
    add("body", "trunnion-jaw", "body", DARK, box(np.array([s * 2.25, Y_TRUN, -1.33]), (0.2, 0.55, 0.22)))
    add("body", "trunnion-gold", "foil", GOLD, box(np.array([s * 2.62, Y_TRUN, -1.45]), (0.12, 0.62, 0.34), crinkle=0.01, div=0.12, seed=7))
add("body", "keel-pedestal", "body", METAL, merge([box(np.array([0, 18.8, -3.62]), (0.6, 0.9, 0.7)), box(np.array([0, 18.8, -3.12]), (0.36, 0.5, 0.35))]))
add("body", "keel-latch", "body", DARK, box(np.array([0, 18.8, -3.3]), (0.5, 0.3, 0.2)))
add("body", "keel-base", "body", GREYW, box(np.array([0, 18.8, -3.95]), (1.6, 1.4, 0.18)))


def export(path):
    recs = []
    for name in ("body", "rms-upper", "rms-lower", "rms-wrist"):
        pm = parts[name]
        tris, ncol = pm.export(None, crease=40, foil_crease=12, max_colours=8)
        print("  %-10s %5d tris %d colours" % (name, tris, ncol))
        recs.append({"name": name, "origin": [0, 0, 0], "groups": pm._recs, "children": []})
    with open(path, "w") as fh:
        json.dump({"name": "shuttle-rms", "parts": recs}, fh, separators=(",", ":"))


if __name__ == "__main__":
    export(sys.argv[1] if len(sys.argv) > 1 else "shuttle-rms.json")
