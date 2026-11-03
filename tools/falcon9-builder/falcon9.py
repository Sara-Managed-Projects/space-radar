"""The Falcon 9 Full Thrust of 21 December 2015 (flight 20, ORBCOMM OG2 Mission 2), in parts for the Moment `falcon9-og2-2`
(release 1.7.6, internal #1058 and #867): the first stage with its nine Merlin 1D, four landing legs and four grid fins as
parts the Moment poses, and the upper stack (the second stage with its Merlin Vacuum, the two fairing halves).

Two files, each a tree of named parts for the Moments player (tools/vostok-builder/vlib.py, write-glb-parts.mjs):

  falcon9-stage1.glb   booster (tanks, interstage, octaweb, nine engines, cable raceways), leg-a .. leg-d (stowed: folded up the side
                       from their hinges at the base), fin-a .. fin-d (stowed: lying flat on the top of the interstage)
  falcon9-upper.glb    stage2 (the 1.4.0 build of the second stage, tools/stage-builder/stages.py falcon9), fairing-a and fairing-b

WHAT IS PUBLISHED (Wikipedia, "Falcon 9 Full Thrust", opened 3 November 2026, from SpaceX): the first stage 41.2 m long and 3.7 m across, the fairing 5.2 m
across, 69.8 m in all with the fairing, grid fins that were aluminium until June 2017 (so those of flight 20), nine Merlin 1D (an octagon round one),
the second stage 13.8 m with its engine (the 1.4.0 row). OURS: every other size, compared with one CC0 photograph of the stage on Landing Zone 1 (Commons,
"Falcon 9 first stage at LZ-1(two)"; compared, not traced): the interstage, the stowed leg and fin shapes, the hinge places, the fairing's flare and ogive.
Metres, +Y up, the booster's engine exits at y = 0, the octagon's ring at 1.05 m.
"""
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "stage-builder"))
sys.path.insert(0, os.path.join(HERE, "..", "vostok-builder"))
from vlib import *  # noqa: F401,F403,E402
import lib  # noqa: E402
from lib import V, box, frustum, rod, merge, torus  # noqa: E402
from stagelib import Stage, shade  # noqa: E402
from stages import falcon9  # noqa: E402

R = 1.83
WHITE = "#EEF0F1"
SOOT = "#7A7570"
BLACK = "#26282C"
CARBON = "#2B2D31"
METAL = "#8A8F96"
STEEL = "#A9AEB5"
DARK = "#3B3E43"
Y_TANK0, Y_LOX, Y_TOP, Y_INTER = 3.4, 17.6, 41.2, 45.6
LEG_HINGE_Y, LEG_LEN = 2.2, 7.56
FIN_Y = 44.0


def ring_xz(r, deg):
    a = math.radians(deg)
    return r * math.cos(a), r * math.sin(a)


def booster():
    s = Stage("falcon9-stage1")
    # engine section: the octaweb under a skirt (the heat shield), nine bells hung from it
    s.barrel("skirt", 0.9, Y_TANK0, R, "#2E3034", seg=64, welds=1, weld_col="#1F2023")
    s.plate_disc("octaweb-plate", 1.0, R - 0.06, "#4A4D53", up=False, seg=64)
    s.ring("skirt-lip", 0.9, R, 0.08, "#56595E", lift=0.02, seg=64)
    spots = [(0.0, 0.0)] + [ring_xz(1.05, 45 * k + 22.5) for k in range(8)]
    for k, (x, z) in enumerate(spots):
        s.bell("merlin-%d" % k, 1.5, 0.12, 0.46, 1.5, "#8D9299", x=x, z=z, seg=28, n=12, p=1.8, ribs=3, inner_col="#3A3C41")
        s.body("merlin-head", "#6C7077", frustum((x, 1.5, z), (x, 1.95, z), 0.20, 0.17, 18))
    # the tanks: RP-1 below, liquid oxygen above, white, welded in rings, a raceway and its brackets up one side
    s.barrel("rp1", Y_TANK0, Y_LOX, R, WHITE, seg=64, welds=4, weld_col="#C9CCCF", panels=4, tint=0.012, weld_w=0.05)
    s.ring("common-dome", Y_LOX, R, 0.08, "#D3D6D9", lift=0.02, seg=64)
    s.barrel("lox", Y_LOX, Y_TOP, R, WHITE, seg=64, welds=8, weld_col="#C9CCCF", panels=8, tint=0.012, weld_w=0.05)
    s.pad("raceway", 22.0, 100, R, (0.24, 36.5, 0.08), "#DDE0E3")
    for k in range(18):
        s.pad("raceway-bracket", 4.6 + k * 2.1, 100, R, (0.3, 0.1, 0.1), "#BDC1C5")
    s.pad("lox-line", 22.0, 280, R, (0.14, 36.5, 0.06), "#D6D9DC")
    # soot on the engine end, where the exhaust and the landing burns went, to the first welds (what a booster looks like after the flight is shown only at the end)
    # the interstage: black carbon composite with a ring of panels, the separation ring on top, and the four hinge brackets of the grid fins
    s.barrel("interstage", Y_TOP, Y_INTER, R, "#2A2C30", seg=64, welds=1, weld_col="#15161A")
    s.ring("sep-ring-lo", Y_TOP, R, 0.1, "#4B4E54", lift=0.03, seg=64)
    s.ring("sep-ring-hi", Y_INTER, R, 0.1, "#5A5D63", lift=0.03, seg=64)
    for k in range(12):
        a = 30 * k
        s.pad("inter-panel", 43.4, a, R, (0.7, 1.3, 0.05), "#34373C")
    for k in range(4):
        a = 90 * k
        x, z = ring_xz(R + 0.05, a)
        s.body("fin-bracket", METAL, box(V(x, FIN_Y + 0.7, z), (0.16, 0.22, 0.16)))
    # leg hinges: four fittings at the skirt
    for k in range(4):
        a = 45 + 90 * k
        x, z = ring_xz(R + 0.06, a)
        s.body("leg-hinge", METAL, box(V(x, LEG_HINGE_Y, z), (0.3, 0.3, 0.3), lib.rot("y", -a)))
    return s


def leg(k):
    """One landing leg, STOWED: folded up the side from its hinge at the base. The Moment turns it by 110 degrees about the tangent at the hinge to put the foot 9 m out and 0.4 m below the engines."""
    a = 45 + 90 * k
    ar = math.radians(a)
    rh = V(math.cos(ar), 0, math.sin(ar))
    th = V(-math.sin(ar), 0, math.cos(ar))
    up = V(0, 1, 0)
    hinge = rh * (R + 0.12) + up * LEG_HINGE_Y
    top = hinge + rh * 0.16 + up * LEG_LEN
    s = Stage("leg-%s" % "abcd"[k])
    Rm = np.column_stack([th, up, rh])
    s.body("leg-strut", CARBON, box((hinge + top) / 2 + rh * 0.12, (0.5, LEG_LEN, 0.34), Rm))
    s.body("leg-honeycomb", "#3A3D42", box((hinge + top) / 2 + rh * 0.3, (0.38, LEG_LEN - 0.4, 0.08), Rm))
    for sgn in (-1, 1):
        s.body("leg-brace", CARBON, rod(hinge + th * sgn * 0.7 + rh * 0.1 + up * 0.2, hinge + rh * 0.26 + up * (LEG_LEN * 0.62), 0.05, 6))
    s.body("leg-hinge-fitting", METAL, box(hinge, (0.42, 0.34, 0.34), Rm))
    s.body("leg-foot", STEEL, box(top + rh * 0.16, (0.7, 0.16, 0.5), Rm))
    s.body("leg-foot-pad", DARK, box(top + rh * 0.3, (0.52, 0.06, 0.36), Rm))
    s.body("leg-piston", METAL, rod(hinge + rh * 0.42 + up * 0.6, hinge + rh * 0.4 + up * 3.4, 0.07, 8))
    return s


def fin(k):
    """One grid fin, STOWED: a lattice 1.5 m across and 1.0 m tall lying flat on the interstage; the Moment swings it 90 degrees about its hinge edge."""
    a = 90 * k + 0.0
    ar = math.radians(a)
    rh = V(math.cos(ar), 0, math.sin(ar))
    th = V(-math.sin(ar), 0, math.cos(ar))
    up = V(0, 1, 0)
    c = rh * (R + 0.2) + up * FIN_Y
    s = Stage("fin-%s" % "abcd"[k])
    Rm = np.column_stack([th, up, rh])
    W, H, D = 1.5, 1.0, 0.28
    for dy in (-H / 2 + 0.02, H / 2 - 0.02):
        s.body("fin-frame", "#4A4E55", box(c + up * dy, (W, 0.05, D), Rm))
    for dt in (-W / 2 + 0.025, W / 2 - 0.025):
        s.body("fin-frame", "#4A4E55", box(c + th * dt, (0.05, H, D), Rm))
    for i in range(1, 6):
        s.body("fin-lattice", "#5B5F66", box(c + th * (-W / 2 + W * i / 6), (0.025, H - 0.06, D * 0.92), Rm))
    for j in range(1, 4):
        s.body("fin-lattice", "#5B5F66", box(c + up * (-H / 2 + H * j / 4), (W - 0.06, 0.025, D * 0.92), Rm))
    s.body("fin-hinge-arm", METAL, box(c - th * (W / 2 + 0.08) - rh * 0.1, (0.16, 0.3, 0.26), Rm))
    return s


def upper():
    s2 = falcon9()                                     # the second stage as built in 1.4.0: y 0 to 13.8, 3.66 m across
    return s2


def fairing_halves():
    """The fairing: 5.2 m across, 13.1 m long, white, with the flare down to the second stage's 3.66 m at its base. Two halves, cut along x = 0."""
    base, ytop = 13.55, 26.65
    pts = [(base, 1.83), (base + 0.35, 1.9), (base + 2.4, 2.6), (base + 6.2, 2.6)]
    n = 9
    for i in range(1, n + 1):          # a tangent ogive: radius 2.6 down to a 0.25 m nose
        u = i / n
        pts.append((base + 6.2 + (ytop - base - 6.2) * u, 2.6 * math.sqrt(max(1e-4, 1 - u ** 2.2)) * (1 - 0.0) + 0.25 * u))
    prof = [(y - base, r) for y, r in pts]
    parts = [lib.lathe((0, base, 0), (0, 1, 0), prof, 64)]
    out = {"a": [], "b": []}
    P, F = parts[0]
    cen = P[F].mean(axis=1)
    for side, key in ((1, "a"), (-1, "b")):
        sel = F[(cen[:, 0] * side) >= 0]
        out[key] = (P, sel)
    return out


def build_stage1():
    veh = Vehicle("falcon9-stage1")
    veh.add("booster", booster(), (0.0, 20.0, 0.0))
    for k in range(4):
        veh.add("leg-%s" % "abcd"[k], leg(k), (0.0, 6.0, 0.0))
    for k in range(4):
        veh.add("fin-%s" % "abcd"[k], fin(k), (0.0, FIN_Y, 0.0))
    return veh


def build_upper():
    veh = Vehicle("falcon9-upper")
    veh.add("stage2", upper(), (0.0, 7.0, 0.0))
    halves = fairing_halves()
    for key in ("a", "b"):
        st = Stage("fairing-" + key)
        st.add("fairing-skin", "body", "#F2F3F3", halves[key])
        veh.add("fairing-" + key, st, (0.0, 20.0, 0.0))
    return veh


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "out"
    os.makedirs(out, exist_ok=True)
    build_stage1().export(os.path.join(out, "falcon9-stage1.json"))
    build_upper().export(os.path.join(out, "falcon9-upper.json"))
