"""vostok-seat: the ejection seat of Vostok with its pilot, in two named parts.

  vostok-seat    the seat: the silver hull with its riveted bands and the two ejection-rocket housings at its foot, the
                 backrest on its two rails, the pan with the boat pack, the headrest with the parachute container, the
                 armrests with the ejection handles, the harness
  vostok-pilot   the cosmonaut in the SK-1 pressure suit under its orange outer layer: white helmet with the visor, the
                 white gloves, the boots, the ventilation hose

Metres. The seat's frame: +Y runs up the rails toward the head (the way the seat flies), +Z out of the backrest toward the
pilot's chest, X across; the origin is at the pan's middle (about the centre of mass of seat and pilot together). The pilot sits
as the photographs of the flown seat (RKK Energia, Museum of Cosmonautics Moscow, Technik Museum Speyer) show him: back on the
backrest, thighs forward, shins down to the foot rest, forearms on the armrests.

NO PUBLISHED DIMENSION OF THE SEAT WAS FOUND (Factory 918, S. M. Alekseyev: no drawing with metres was opened). The seat is
drawn to a 1.75 m cosmonaut (Gagarin was 1.57 m; the suit and the seat are sized for the programme's limit) and its parts are
read off the photographs against his body: every size is ILLUSTRATIVE.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlib import *  # noqa: F401,F403,E402
import lib  # noqa: E402

ALU = "#B2B8BE"        # the seat's bare aluminium, riveted
ALU_D = "#8B9299"
ALU_L = "#C6CBD0"
RAIL = "#7E858C"
STRAP = "#8A6A3E"      # the harness's leather
STRAP_W = "#D9D2C0"
BUCKLE = "#A9AEB4"
ORANGE = "#EE6A1E"     # the SK-1's orange outer layer
ORANGE_D = "#D4561A"
WHITE = "#ECEEEE"      # helmet, gloves
VISOR = "#2A3138"
BOOT = "#3A332E"
HOSE = "#B9BEC3"
BLACK = "#25272B"
RED = "#B8342B"        # the ejection handle's grip


def limb(a, b, r0, r1=None, seg=10):
    return frustum(V(*a), V(*b), r0, r1 if r1 is not None else r0, seg, caps=True)


def joint(c, r, seg=10):
    return lib.sphere(V(*c), r, 5, seg)


def build_seat():
    st = Stage("vostok-seat")
    # ---- the hull: a TROUGH, an elliptic half-cylinder along Y open toward the pilot (+Z), 1.2 m long, riveted bands, a cream lining,
    # a closed foot plate (the photograph of the seat shows the pilot lying IN the silver tub with the white cushions at his sides)
    seg = 18
    rx, rz, cz = 0.33, 0.30, 0.20
    def arc(y0, y1, rx_, rz_, back=True, flip=False):
        a0, a1 = (math.pi, 2 * math.pi)       # the half with z < cz: the back of the tub
        P, F = [], []
        for y in (y0, y1):
            for i in range(seg + 1):
                a = a0 + (a1 - a0) * i / seg
                P.append([rx_ * math.cos(a), y, cz + rz_ * math.sin(a)])
        n = seg + 1
        for i in range(seg):
            if flip:
                F += [[i, i + 1, n + i + 1], [i, n + i + 1, n + i]]
            else:
                F += [[i, n + i + 1, i + 1], [i, n + i, n + i + 1]]
        return np.array(P), np.array(F)
    ys = [-0.60, -0.40, -0.20, 0.00, 0.20, 0.40, 0.60]
    for k in range(len(ys) - 1):
        st.add("hull", "body", shade(ALU, 1 + 0.035 * (1 if k % 2 else -1)), arc(ys[k], ys[k + 1], rx, rz))
    st.add("lining", "body", STRAP_W, arc(-0.60, 0.60, rx - 0.03, rz - 0.03, flip=True))
    # the rolled edge along both sides, and the foot plate closing the tub
    for sx in (-1, 1):
        st.add("rim", "body", ALU_L, rod(V(sx * rx, -0.60, cz), V(sx * rx, 0.60, cz), 0.022, 8))
    c_lo = V(0, -0.60, cz)
    half_disc = lib.disc(V(0, 0, 0), DOWN, 1.0, 36)
    Vv, F = half_disc
    keep = [i for i in range(len(F)) if Vv[F[i]][:, 2].mean() <= 0.02]
    st.add("hull-foot", "body", ALU_D, xf((Vv, F[keep]), np.diag([rx, 1, rz]), c_lo))
    for y in (-0.40, -0.20, 0.0, 0.20, 0.40):
        st.add("band", "body", ALU_D, arc(y - 0.012, y + 0.012, rx + 0.008, rz + 0.008))
    rivets = []
    for y in (-0.50, -0.30, -0.10, 0.10, 0.30, 0.50):
        for k in range(14):
            a = math.pi + math.pi * (k + 0.5) / 14
            p = V((rx + 0.008) * math.cos(a), y, cz + (rz + 0.008) * math.sin(a))
            rivets.append(lib.sphere(p, 0.006, 3, 5))
    st.add("rivets", "body", ALU_L, merge(rivets))
    # the two ejection-rocket housings under the foot plate: short cylinders with a flared mouth, pointing down the seat
    zr = cz - 0.12
    for x in (-0.14, 0.14):
        st.add("rocket", "body", ALU_D, frustum(V(x, -0.60, zr), V(x, -0.82, zr), 0.115, 0.115, 20, caps=False))
        st.add("rocket-mouth", "body", ALU_L, frustum(V(x, -0.82, zr), V(x, -0.88, zr), 0.115, 0.135, 20, caps=False))
        st.add("rocket-throat", "body", BLACK, lib.disc(V(x, -0.86, zr), DOWN, 0.105, 20))
        st.add("rocket-band", "body", RAIL, frustum(V(x, -0.68, zr), V(x, -0.70, zr), 0.12, 0.12, 20, caps=False))
    # access plates on the hull
    for y, deg, w, h in ((0.05, 215, 0.12, 0.14), (0.28, 250, 0.14, 0.12), (-0.10, 300, 0.12, 0.10), (0.42, 330, 0.10, 0.12)):
        ar = math.radians(deg)
        p = V((rx + 0.008) * math.cos(ar), y, cz + (rz + 0.008) * math.sin(ar))
        n = unit(V(math.cos(ar) / rx, 0, math.sin(ar) / rz))
        t_ = V(-n[2], 0, n[0])
        st.add("plate", "body", ALU_L, box(p + n * 0.004, (w, h, 0.01), np.column_stack([t_, [0, 1, 0], n])))
    # ---- the rails: two tubes down the back of the hull, with their carriages
    for x in (-0.30, 0.30):
        st.add("rail", "body", RAIL, rod(V(x, -0.70, -0.16), V(x, 1.10, -0.16), 0.022, 10))
        st.add("rail-arm", "body", RAIL, merge([rod(V(x * 0.96, y, -0.08), V(x, y, -0.16), 0.016, 6) for y in (-0.30, 0.15, 0.55, 0.95)]))
        st.add("carriage", "body", ALU_D, box(V(x, 0.20, -0.16), (0.06, 0.20, 0.06)))
    # ---- backrest: a shaped plate on the hull's front, side wings, and the headrest above it
    st.add("backrest", "body", ALU, box(V(0, 0.42, 0.075), (0.50, 0.95, 0.035)))
    st.add("back-pad", "body", STRAP_W, box(V(0, 0.42, 0.10), (0.42, 0.88, 0.03)))
    for x in (-0.27, 0.27):
        st.add("wing", "body", ALU_D, box(V(x, 0.34, 0.14), (0.04, 0.70, 0.12)))
    # the headrest: a wide plate with two side cheeks, and the parachute container behind it
    st.add("headrest", "body", ALU, box(V(0, 0.90, 0.10), (0.42, 0.20, 0.045)))
    for x in (-0.215, 0.215):
        st.add("cheek", "body", ALU_D, box(V(x, 0.90, 0.16), (0.04, 0.20, 0.13)))
    st.add("chute-box", "body", ALU_D, box(V(0, 0.98, -0.13), (0.40, 0.34, 0.24)))
    st.add("chute-lid", "body", ALU_L, box(V(0, 1.16, -0.13), (0.42, 0.03, 0.26)))
    st.add("chute-latch", "body", BUCKLE, merge([box(V(x, 1.12, 0.0), (0.04, 0.06, 0.02)) for x in (-0.12, 0.12)]))
    # ---- the pan, the boat pack under it, the calf rest
    st.add("pan", "body", ALU, box(V(0, -0.075, 0.33), (0.46, 0.035, 0.46)))
    st.add("pan-pad", "body", STRAP_W, box(V(0, -0.045, 0.30), (0.42, 0.03, 0.42)))
    st.add("boat", "body", ORANGE_D, box(V(0, -0.15, 0.30), (0.46, 0.09, 0.46)))
    st.add("boat-strap", "body", STRAP, merge([box(V(x, -0.15, 0.30), (0.03, 0.10, 0.48)) for x in (-0.12, 0.12)]))
    st.add("pan-front", "body", ALU_D, box(V(0, -0.11, 0.55), (0.50, 0.12, 0.03)))
    st.add("calf-rest", "body", ALU_D, box(V(0, -0.40, 0.58), (0.44, 0.04, 0.34)))
    st.add("foot-plate", "body", ALU, box(V(0, -0.46, 0.80), (0.46, 0.04, 0.32)))
    for x in (-0.20, 0.20):
        st.add("foot-strut", "body", ALU_D, rod(V(x, -0.14, 0.55), V(x, -0.46, 0.64), 0.016, 6))
    st.add("foot-strap", "body", STRAP, merge([box(V(x, -0.43, 0.84), (0.05, 0.02, 0.20)) for x in (-0.10, 0.10)]))
    # ---- armrests with the controls: the ejection handle on the right (a loop), the left hand's pad
    for x in (-0.31, 0.31):
        st.add("arm-post", "body", ALU_D, box(V(x, 0.05, 0.22), (0.05, 0.22, 0.05)))
        st.add("armrest", "body", ALU, box(V(x, 0.18, 0.40), (0.07, 0.04, 0.40)))
        st.add("arm-pad", "body", STRAP_W, box(V(x, 0.205, 0.40), (0.06, 0.02, 0.34)))
    # the ejection handles: a red grip on a bar, one each side
    for x in (-0.31, 0.31):
        st.add("handle-bar", "body", ALU_D, rod(V(x, 0.20, 0.52), V(x, 0.20, 0.62), 0.011, 6))
        st.add("handle", "body", RED, frustum(V(x - 0.04 * np.sign(x), 0.21, 0.62), V(x + 0.04 * np.sign(x), 0.21, 0.62), 0.016, 0.016, 8, caps=True))
    # ---- the harness: two shoulder straps, a lap belt, the buckle
    for x in (-0.12, 0.12):
        st.add("strap", "body", STRAP, box(V(x, 0.45, 0.255), (0.055, 0.60, 0.012), rot("x", -12)))
    st.add("lap-belt", "body", STRAP, box(V(0, 0.02, 0.33), (0.42, 0.045, 0.014)))
    st.add("buckle", "body", BUCKLE, box(V(0, 0.03, 0.345), (0.07, 0.07, 0.014)))
    return st


def build_pilot():
    st = Stage("vostok-pilot")
    # joints
    hip_c = V(0, 0.02, 0.19)
    sh_c = V(0, 0.56, 0.20)
    # torso: a tapering oval (suit and parachute pack): two stacked frusta + shoulder bar
    def oval(y0, y1, rx0, rz0, rx1, rz1, cz, seg=20):
        t = np.linspace(0, 2 * math.pi, seg, endpoint=False)
        P, F = [], []
        for y, rx, rz in ((y0, rx0, rz0), (y1, rx1, rz1)):
            for a in t:
                P.append([rx * math.cos(a), y, cz + rz * math.sin(a)])
        for i in range(seg):
            j = (i + 1) % seg
            F += [[i, seg + j, j], [i, seg + i, seg + j]]
        return np.array(P), np.array(F)
    st.add("torso", "body", ORANGE, oval(0.02, 0.30, 0.20, 0.15, 0.23, 0.17, 0.19))
    st.add("chest", "body", ORANGE, oval(0.30, 0.54, 0.23, 0.17, 0.205, 0.145, 0.20))
    st.add("pelvis", "body", ORANGE, oval(-0.10, 0.02, 0.19, 0.17, 0.20, 0.15, 0.20))
    st.add("shoulders", "body", ORANGE, xf(lib.sphere(V(0, 0, 0), 0.215, 6, 14), np.diag([1.0, 0.45, 0.62]), V(0, 0.54, 0.20)))
    # the chest pack (the suit's ventilation unit): a flat box with two hose fittings
    st.add("chest-pack", "body", ORANGE_D, box(V(0, 0.34, 0.38), (0.26, 0.20, 0.07)))
    st.add("fitting", "body", HOSE, merge([frustum(V(x, 0.30, 0.42), V(x, 0.30, 0.47), 0.026, 0.022, 8, caps=True) for x in (-0.07, 0.07)]))
    # the ventilation hose: from the hip to the seat's side, a corrugated silver tube
    hose = [V(0.15, 0.05, 0.38), V(0.30, 0.0, 0.34), V(0.33, -0.12, 0.20), V(0.28, -0.20, 0.0)]
    st.add("hose", "body", HOSE, tube(hose, 0.018, 8))
    # neck ring and the helmet
    st.add("neck-ring", "body", HOSE, frustum(V(0, 0.64, 0.20), V(0, 0.69, 0.20), 0.115, 0.115, 18, caps=False))
    hc = V(0, 0.82, 0.21)
    st.add("helmet", "body", WHITE, lib.sphere(hc, 0.195, 9, 20))
    # the visor: a dark dome on the face (toward +Z), under a white frame ring
    vd = V(0, -0.015, 1.0)
    st.add("visor", "body", VISOR, xf(lib.sphere(V(0, 0, 0), 0.155, 6, 14, 100.0, 1.0, axis=(0, 0, 1)), None, hc + V(0, -0.01, 0.085)))
    st.add("visor-frame", "body", WHITE, xf(lib.torus(V(0, 0, 0), (0, 0, 1), 0.15, 0.014, 20, 5), None, hc + V(0, -0.01, 0.10)))
    st.add("helmet-lock", "body", HOSE, lib.torus(hc + V(0, -0.15, 0), UP, 0.13, 0.012, 20, 5))
    # arms: shoulder -> elbow -> hand, orange sleeves, white gloves
    for s in (-1, 1):
        sh = V(s * 0.225, 0.52, 0.20)
        el = V(s * 0.28, 0.27, 0.30)
        hd = V(s * 0.265, 0.22, 0.58)
        st.add("arm", "body", ORANGE, limb(sh, el, 0.058, 0.05))
        st.add("elbow", "body", ORANGE, joint(el, 0.052))
        st.add("forearm", "body", ORANGE, limb(el, hd - V(0, 0, 0.09), 0.05, 0.042))
        st.add("shoulder-j", "body", ORANGE, joint(sh, 0.065))
        st.add("cuff", "body", HOSE, frustum(hd - V(0, 0, 0.11), hd - V(0, 0, 0.08), 0.045, 0.045, 12, caps=False))
        st.add("glove", "body", WHITE, xf(lib.sphere(V(0, 0, 0), 0.058, 5, 10), np.diag([1.0, 0.85, 1.35]), hd - V(0, 0, 0.02)))
    # legs: hip -> knee (thighs forward, a little raised) -> ankle (shins down) -> boots on the foot plate
    for s in (-1, 1):
        hp = V(s * 0.105, 0.02, 0.19)
        kn = V(s * 0.13, 0.05, 0.64)
        an = V(s * 0.13, -0.38, 0.72)
        st.add("thigh", "body", ORANGE, limb(hp, kn, 0.092, 0.07))
        st.add("hip-j", "body", ORANGE, joint(hp, 0.092))
        st.add("knee", "body", ORANGE, joint(kn, 0.072))
        st.add("shin", "body", ORANGE, limb(kn, an, 0.068, 0.052))
        st.add("boot", "body", BOOT, box(an + V(0, -0.045, 0.07), (0.115, 0.09, 0.27)))
        st.add("boot-top", "body", BOOT, limb(an + V(0, 0.07, 0), an - V(0, 0.01, 0), 0.062, 0.06))
    return st


def build():
    veh = Vehicle("vostok-seat")
    veh.add("vostok-seat", build_seat(), (0.0, 0.10, 0.0))
    veh.add("vostok-pilot", build_pilot(), (0.0, 0.25, 0.30))
    return veh


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "out/vostok-seat.json"
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    v = build()
    v.export(out, limit=14)
