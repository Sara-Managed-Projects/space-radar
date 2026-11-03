"""leonov-eva: Alexei Leonov in the Berkut suit, as in the film of the first spacewalk (Voskhod 2, 18 March 1965), in two parts.

  leonov-suit   the Berkut suit (a Sokol-1 pressure suit with a second, white outer layer), puffed, in the pose of the film:
                the helmet with its window frame, its hinged gold sun visor and ear cups; the grey metal neck ring; the
                body with its chest pockets and thigh pockets, the grey harness straps with their central ring, the white
                hoses over the shoulders to the chest connectors and the belly loop, the chest camera; the arms forward
                and down with the quilted elbows, the orange-red stripe down the outer sleeve and leg, the metal wrist
                rings, the gloves (white, black palms); the legs trailing with the quilted knees, the soft overboots
  leonov-pack   the white metal EVA backpack on the back (45 minutes of oxygen): the rounded slab with its round gauge
                window, the two raised ribs, the screws, the relief valve on top, the hose fittings, the tether ring

Metres. +Y up the body toward the head, +Z out of the chest, +X his left; one posed mesh (no rig); the origin at the centre
of mass of the whole (computed from the model's volume in 1.8 m of height, the pack included). About 1.8 m head to heel.
NO LETTERING is drawn (the helmet's red letters are not a shape).
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlib import *  # noqa: F401,F403,E402
import lib  # noqa: E402

SUIT = "#E3DCC9"        # the white outer layer, cream under the museum lights
SUIT_D = "#CEC6B1"
QUILT = "#D6CEB9"
STRIPE = "#D8501E"      # the orange-red stripe down the outer sleeve and leg
STRAP = "#767B80"       # the grey harness
METAL = "#A9AFB5"
METAL_D = "#7A8087"
PACK = "#E9E9E5"        # the white metal pack
GAUGE = "#4A4E53"
GLASS = "#1B2A38"
GLOVE = "#E9E5D8"
PALM = "#2B2B2E"
BOOT = "#DDD6C2"
SOLE = "#8C7B5B"
GOLD = "#8F6E2E"       # the sun visor's gold
HOSE = "#E6E1D2"
HOSE_D = "#CBC5B3"
BLUE = "#2F5FA8"
BLACK = "#24272B"


def rim(s, r, w, seg, a=(0, 0, 0), axis=(0, 1, 0), bump=0.006):
    return lathe(a, V(*axis), [(s - w / 2, r - 0.003), (s, r + bump), (s + w / 2, r - 0.003)], seg)


def limb(a, b, r0, r1, bulge=0.10, seg=14, n=4):
    a, b = V(*a), V(*b)
    L = np.linalg.norm(b - a)
    prof = []
    for k in range(n + 1):
        t = k / n
        prof.append((L * t, (r0 + (r1 - r0) * t) * (1 + bulge * math.sin(math.pi * t))))
    return lathe(a, b - a, prof, seg, closed=False)


def joint(c, r, nl=6, nn=12):
    return lib.sphere(V(*c), r, nl, nn)


def ribbon(points, w, lift_dir, lift=0.004):
    """A flat strip following a poly-line, `w` wide, pushed `lift` along lift_dir(point)."""
    rows = []
    n = len(points)
    for k in range(n):
        p = V(*points[k])
        t = unit(V(*points[min(k + 1, n - 1)]) - V(*points[max(k - 1, 0)]))
        o = unit(lift_dir(p))
        side = unit(np.cross(t, o))
        c = p + o * lift
        rows += [c - side * w / 2, c + side * w / 2]
    ff = []
    for k in range(n - 1):
        ff += [[2 * k, 2 * k + 1, 2 * k + 3], [2 * k, 2 * k + 3, 2 * k + 2]]
    m = (np.array(rows), np.array(ff, dtype=np.int64))
    f0 = m[1][0]
    nrm = np.cross(m[0][f0[1]] - m[0][f0[0]], m[0][f0[2]] - m[0][f0[0]])
    if np.dot(nrm, unit(lift_dir(V(*points[0])))) < 0:
        m = (m[0], m[1][:, ::-1].copy())
    return m


def stripe_on(centres, radii, outer, w=0.022, lift=0.004):
    """A strip lying on a limb's skin on its `outer` side: centres along the limb's axis, the limb's radius at each."""
    cs = [V(*c) for c in centres]
    n = len(cs)
    rows, nn = [], []
    for k in range(n):
        t = unit(cs[min(k + 1, n - 1)] - cs[max(k - 1, 0)])
        o = unit(V(*outer) - np.dot(V(*outer), t) * t)
        side = unit(np.cross(t, o))
        c = cs[k] + o * (radii[k] + lift)
        rows += [c - side * w / 2, c + side * w / 2]
        nn.append(o)
    ff = []
    for k in range(n - 1):
        ff += [[2 * k, 2 * k + 1, 2 * k + 3], [2 * k, 2 * k + 3, 2 * k + 2]]
    m = (np.array(rows), np.array(ff, dtype=np.int64))
    f0 = m[1][0]
    if np.dot(np.cross(m[0][f0[1]] - m[0][f0[0]], m[0][f0[2]] - m[0][f0[0]]), nn[0]) < 0:
        m = (m[0], m[1][:, ::-1].copy())
    return m


def spline(points, per=4):
    """A Catmull-Rom curve through the points, `per` samples a span."""
    P = [V(*p) for p in points]
    Q = [P[0]] + P + [P[-1]]
    out = []
    for i in range(1, len(Q) - 2):
        p0, p1, p2, p3 = Q[i - 1], Q[i], Q[i + 1], Q[i + 2]
        for k in range(per):
            t = k / per
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(P[-1])
    return out


def obox(c, size, fwd, upref=(0, 1, 0)):
    """A box of (width, height, length) centred at c, its length along `fwd`, its height roughly along upref."""
    f = unit(V(*fwd))
    right = unit(np.cross(V(*upref), f))
    up = np.cross(f, right)
    return xf(box(V(0, 0, 0), size, None), np.column_stack([right, up, f]), V(*c))


def outward(mesh, ref):
    Vv, F = mesh
    cen = Vv[F].mean(axis=1)
    n = np.cross(Vv[F[:, 1]] - Vv[F[:, 0]], Vv[F[:, 2]] - Vv[F[:, 0]])
    if np.sum(np.sign(np.sum(n * (cen - V(*ref)), axis=1))) < 0:
        return Vv, F[:, ::-1].copy()
    return mesh


def pipe(points, r, seg=5):
    """A round cable through a poly-line (no spheres at the corners), closed ends, outward faces."""
    pts = [V(*p) for p in points]
    n = len(pts)
    tg = [unit(pts[min(k + 1, n - 1)] - pts[max(k - 1, 0)]) for k in range(n)]
    u = frame(tg[0])[0]
    Pv, F = [], []
    for k in range(n):
        w = tg[k]
        u = unit(u - np.dot(u, w) * w)
        v = np.cross(w, u)
        rad = r[k] if hasattr(r, "__len__") else r
        for i in range(seg):
            Pv.append(pts[k] + rad * (math.cos(2 * math.pi * i / seg) * u + math.sin(2 * math.pi * i / seg) * v))
    for k in range(n - 1):
        for i in range(seg):
            j = (i + 1) % seg
            p0, p1, p2, p3 = k * seg + i, k * seg + j, (k + 1) * seg + j, (k + 1) * seg + i
            F += [[p0, p2, p1], [p0, p3, p2]]
    Pv += [pts[0], pts[-1]]
    c0, c1 = n * seg, n * seg + 1
    for i in range(seg):
        j = (i + 1) % seg
        F += [[c0, i, j], [c1, (n - 1) * seg + j, (n - 1) * seg + i]]
    m = (np.array(Pv), np.array(F, dtype=np.int64))
    f0 = m[1][0]
    nrm = np.cross(m[0][f0[1]] - m[0][f0[0]], m[0][f0[2]] - m[0][f0[0]])
    if np.dot(nrm, (m[0][f0[0]] + m[0][f0[1]] + m[0][f0[2]]) / 3 - pts[0]) < 0:
        m = (m[0], m[1][:, ::-1].copy())
    return m


# ------------------------------------------------------------------------------------------------------------- the pose
HIP = {1: V(0.10, -0.06, 0.0), -1: V(-0.10, -0.06, 0.0)}
KNEE = {1: V(0.115, -0.46, -0.10), -1: V(-0.115, -0.44, -0.07)}
ANKLE = {1: V(0.125, -0.80, -0.27), -1: V(-0.12, -0.78, -0.21)}
SHOULDER = {1: V(0.225, 0.47, 0.0), -1: V(-0.225, 0.47, 0.0)}
ELBOW = {1: V(0.305, 0.24, 0.19), -1: V(-0.30, 0.25, 0.17)}
WRIST = {1: V(0.355, 0.10, 0.46), -1: V(-0.33, 0.17, 0.44)}
HEAD_C = V(0.0, 0.745, 0.045)
CHEST_BACK_Z = -0.15


def build_suit():
    st = Stage("leonov-suit")
    # ---- torso: an oval, puffed, a pelvis under it, the yoke at the shoulders
    torso_prof = [(-0.12, 0.17), (-0.04, 0.205), (0.12, 0.215), (0.30, 0.225), (0.44, 0.235), (0.54, 0.20), (0.585, 0.12)]
    st.add("torso", "body", SUIT, xf(lathe((0, 0, 0), UP, torso_prof, 20), np.diag([1.0, 1.0, 0.70]), V(0, 0, 0.0)))
    st.add("pelvis", "body", SUIT, xf(lib.sphere(V(0, 0, 0), 0.20, 6, 14), np.diag([1.0, 0.7, 0.82]), V(0, -0.06, 0.0)))
    for sg in (1, -1):
        st.add("hip-joint", "body", SUIT, joint(HIP[sg], 0.118))
        st.add("shoulder-joint", "body", SUIT, joint(SHOULDER[sg], 0.098))
    # ---- legs trailing: thigh, knee with its quilting, shin, the overboot
    for sg in (1, -1):
        st.add("thigh", "body", SUIT, limb(HIP[sg], KNEE[sg], 0.118, 0.098, 0.06, 14, 4))
        st.add("knee-joint", "body", SUIT, joint(KNEE[sg], 0.098))
        st.add("shin", "body", SUIT, limb(KNEE[sg], ANKLE[sg], 0.098, 0.072, 0.07, 14, 4))
        ax = ANKLE[sg] - KNEE[sg]
        st.add("knee-quilt", "body", QUILT, merge([rim(s, 0.103, 0.022, 12, a=KNEE[sg], axis=ax, bump=0.007) for s in (-0.03, 0.01, 0.05, 0.09, 0.13)]))
        # the quilted calf at the back of the shin
        # the cuff and the boot: soft white overboot, toes pointed (relaxed in the weightlessness)
        st.add("ankle-ring", "body", METAL, rim(0.005, 0.078, 0.034, 12, a=ANKLE[sg] + unit(KNEE[sg] - ANKLE[sg]) * 0.04, axis=unit(ANKLE[sg] - KNEE[sg]), bump=0.01))
        toe = unit(V(0.0, -0.55, 0.83))
        heel = ANKLE[sg] + V(0, -0.02, -0.03)
        st.add("boot", "body", BOOT, lathe(heel, toe, [(0.0, 0.052), (0.05, 0.082), (0.13, 0.085), (0.22, 0.072), (0.285, 0.045), (0.31, 0.0)], 12))
        st.add("boot-sole", "body", SOLE, obox(heel + toe * 0.14 + unit(np.cross(V(1, 0, 0), toe)) * 0.079, (0.135, 0.010, 0.27), toe, (0, 1, 0)))
        # the orange stripe down the outer leg
        cl = [HIP[sg] + V(0, 0.04, 0), HIP[sg] + (KNEE[sg] - HIP[sg]) * 0.5, KNEE[sg], KNEE[sg] + (ANKLE[sg] - KNEE[sg]) * 0.5, ANKLE[sg] + (KNEE[sg] - ANKLE[sg]) * 0.12]
        st.add("stripe", "body", STRIPE, stripe_on(cl, (0.114, 0.124, 0.104, 0.090, 0.076), (sg, 0, 0)))
        # pocket flap on the thigh
        pc = HIP[sg] + (KNEE[sg] - HIP[sg]) * 0.45 + V(-sg * 0.012, 0.0, 0.114)
        st.add("thigh-pocket", "body", SUIT_D, obox(pc, (0.085, 0.115, 0.016), (0, -0.3, 1), (0, 1, 0)))
    # ---- arms forward and down: upper arm, elbow with its quilting, forearm, wrist ring, glove
    for sg in (1, -1):
        st.add("upper-arm", "body", SUIT, limb(SHOULDER[sg], ELBOW[sg], 0.092, 0.080, 0.08, 14, 4))
        st.add("elbow-joint", "body", SUIT, joint(ELBOW[sg], 0.082))
        st.add("forearm", "body", SUIT, limb(ELBOW[sg], WRIST[sg], 0.082, 0.062, 0.06, 14, 4))
        axa = WRIST[sg] - ELBOW[sg]
        st.add("elbow-quilt", "body", QUILT, merge([rim(s, 0.085, 0.020, 12, a=ELBOW[sg] - unit(axa) * 0.10, axis=axa, bump=0.007) for s in (0.0, 0.035, 0.07, 0.105, 0.14, 0.175)]))
        st.add("wrist-ring", "body", METAL, rim(0.0, 0.066, 0.034, 12, a=WRIST[sg] - unit(axa) * 0.02, axis=axa, bump=0.010))
        # the glove: a palm, four fingers a little curled, the thumb; white, with the black palm pad on the underside
        d = unit(axa)
        d = unit(d * 0.8 + V(0, 0, 0.2))
        side = unit(np.cross(d, V(0, 1, 0)))
        down = unit(np.cross(side, d))
        knuckle = WRIST[sg] + d * 0.085
        st.add("glove", "body", GLOVE, xf(lib.sphere(V(0, 0, 0), 0.058, 5, 10), np.column_stack([side * 1.05, -down * 0.65, d * 1.5]), WRIST[sg] + d * 0.055))
        st.add("palm-pad", "body", PALM, xf(box(V(0, 0, 0), (0.07, 0.008, 0.06), None), np.column_stack([side, -down, d]), WRIST[sg] + d * 0.06 + down * 0.035))
        fing = []
        for k, off in enumerate((-0.036, -0.012, 0.012, 0.036)):
            ln = (0.085, 0.092, 0.088, 0.072)[k]
            p0 = knuckle + side * off
            p1 = p0 + d * ln * 0.55 + down * (-0.002)
            p2 = p1 + (d * 0.7 + down * 0.35) * ln * 0.45
            fing.append(pipe([p0, p1, p2], (0.0155, 0.0140, 0.0115), 5))
        thumb0 = WRIST[sg] + d * 0.05 + side * (0.045 * sg) - down * 0.012
        fing.append(pipe([thumb0, thumb0 + d * 0.035 + side * (0.02 * sg), thumb0 + d * 0.065 + side * (0.026 * sg) - down * 0.01], (0.019, 0.017, 0.013), 5))
        st.add("fingers", "body", GLOVE, merge(fing))
        # the orange stripe down the outer sleeve: shoulder, over the elbow, to the wrist
        cl = [SHOULDER[sg] + V(0, 0.02, 0), SHOULDER[sg] + (ELBOW[sg] - SHOULDER[sg]) * 0.5, ELBOW[sg], ELBOW[sg] + (WRIST[sg] - ELBOW[sg]) * 0.5, WRIST[sg] - unit(axa) * 0.035]
        st.add("stripe", "body", STRIPE, stripe_on(cl, (0.098, 0.092, 0.086, 0.072, 0.064), (sg, 0.3, 0)))
    # the sleeve patch on the left forearm (a dark window, as the museum suit has) and the chest pockets: two round flaps
    pc = ELBOW[1] + (WRIST[1] - ELBOW[1]) * 0.42
    st.add("sleeve-patch", "body", "#3B342B", obox(pc + V(0.0, 0.074, 0.005), (0.065, 0.006, 0.075), WRIST[1] - ELBOW[1], (1, 0, 0)))
    for sg in (1, -1):
        st.add("chest-pocket", "body", SUIT_D, xf(lathe((0, 0, 0), V(0, 0, 1), [(0.0, 0.07), (0.018, 0.064), (0.024, 0.0)], 16), np.diag([1.0, 0.9, 1.0]), V(sg * 0.105, 0.27, 0.131)))
    # ---- the harness: two grey straps from the shoulders to the central ring, one strap down the belly, the ring's fittings
    def torso_z(y, x):
        return 0.7 * 0.225 * math.sqrt(max(1 - (x / 0.235) ** 2, 0.02)) + 0.003
    for sg in (1, -1):
        pts = [V(sg * 0.17, 0.545, 0.10), V(sg * 0.15, 0.46, 0.13), V(sg * 0.08, 0.40, 0.145), V(0.0, 0.34, 0.152)]
        st.add("harness", "body", STRAP, ribbon(pts, 0.05, lambda p: V(0.4 * np.sign(p[0]), 0.2, 1.0), 0.010))
    st.add("harness", "body", STRAP, ribbon([V(0, 0.34, 0.152), V(0, 0.22, 0.158), V(0, 0.10, 0.158), V(0, 0.02, 0.150)], 0.05, lambda p: V(0, 0.0, 1.0), 0.010))
    st.add("ring", "body", METAL, xf(lathe((0, 0, 0), V(0, 0, 1), [(0.0, 0.036), (0.014, 0.036), (0.014, 0.012)], 16), None, V(0, 0.345, 0.160)))
    st.add("ring-hub", "body", METAL_D, xf(lathe((0, 0, 0), V(0, 0, 1), [(0.0, 0.016), (0.03, 0.012), (0.034, 0.0)], 10), None, V(0, 0.345, 0.172)))
    # the chest camera on a bracket under the ring (a film camera with its lens forward)
    st.add("camera-bracket", "body", STRAP, box(V(0.0, 0.215, 0.165), (0.10, 0.07, 0.014), None))
    st.add("camera", "body", "#35383D", box(V(0.0, 0.215, 0.215), (0.115, 0.075, 0.095), None))
    st.add("camera-lens", "body", METAL, frustum(V(0.0, 0.215, 0.26), V(0.0, 0.215, 0.305), 0.030, 0.036, 12, caps=True))
    st.add("camera-glass", "body", GLASS, lib.disc(V(0.0, 0.215, 0.3055), V(0, 0, 1), 0.030, 12))
    st.add("camera-top", "body", METAL_D, box(V(0.0, 0.262, 0.215), (0.07, 0.012, 0.07), None))
    # ---- the hoses: over each shoulder from the pack to the chest connector, and the belly loop with its silver fitting
    for sg in (1, -1):
        hp = [V(sg * 0.12, 0.47, -0.22), V(sg * 0.17, 0.60, -0.15), V(sg * 0.235, 0.63, -0.02), V(sg * 0.20, 0.60, 0.11), V(sg * 0.15, 0.44, 0.19), V(sg * 0.10, 0.29, 0.188)]
        st.add("hose", "body", HOSE, pipe(spline(hp, 3), 0.019, 6))
        st.add("hose-fitting", "body", METAL, frustum(V(sg * 0.10, 0.29, 0.188), V(sg * 0.10, 0.26, 0.19), 0.028, 0.024, 8, caps=True))
        st.add("hose-blue", "body", BLUE, frustum(V(sg * 0.10, 0.275, 0.189), V(sg * 0.10, 0.262, 0.19), 0.030, 0.030, 8, caps=True))
    loop = [V(-0.10, 0.12, 0.17), V(-0.19, 0.07, 0.19), V(-0.25, -0.02, 0.15), V(-0.20, -0.10, 0.16), V(-0.10, -0.06, 0.17), V(-0.06, 0.04, 0.165)]
    st.add("belly-hose", "body", HOSE_D, pipe(spline(loop, 3), 0.017, 6))
    st.add("belly-fitting", "body", METAL, frustum(V(-0.10, 0.12, 0.17), V(-0.09, 0.15, 0.17), 0.027, 0.023, 8, caps=True))
    # ---- the neck ring, the helmet: the shell, the window frame, the gold sun visor on its two hinges, the ear cups
    st.add("neck-ring", "body", METAL, rim(0.0, 0.118, 0.040, 20, a=V(0, 0.585, 0.02), bump=0.012))
    st.add("collar", "body", SUIT_D, lathe(V(0, 0.56, 0.02), UP, [(0.0, 0.135), (0.03, 0.12), (0.045, 0.115)], 20))
    hc = HEAD_C
    st.add("helmet", "body", SUIT, xf(lib.sphere(V(0, 0, 0), 0.19, 8, 18), np.diag([1.0, 1.04, 1.06]), hc))
    st.add("helmet-rim", "body", METAL, rim(0.0, 0.182, 0.020, 20, a=hc + V(0, -0.135, -0.01), bump=0.007))
    vis_c = hc + V(0, -0.012, 0.0)
    st.add("window-frame", "body", SUIT_D, xf(lathe((0, 0, 0), V(0, 0, 1), [(0.172, 0.14), (0.205, 0.125), (0.212, 0.10)], 20), None, hc + V(0, -0.012, 0.0)))
    st.add("sun-visor", "body", GOLD, xf(lib.sphere(V(0, 0, 0), 0.215, 6, 16, 54.0, 1.0, axis=(0, 0, -1)), np.diag([1.0, 0.96, 1.0]), hc + V(0, -0.015, 0.0)))
    for sg in (1, -1):
        st.add("visor-hinge", "body", METAL, frustum(hc + V(sg * 0.178, 0.005, 0.045), hc + V(sg * 0.208, 0.005, 0.045), 0.026, 0.020, 10, caps=True))
        st.add("ear-cup", "body", SUIT_D, xf(lib.sphere(V(0, 0, 0), 0.058, 5, 9), np.diag([0.55, 1.0, 1.0]), hc + V(sg * 0.188, -0.02, -0.01)))
    st.add("visor-tab", "body", METAL_D, box(hc + V(0, -0.128, 0.14), (0.05, 0.016, 0.03), None))
    return st


def build_pack():
    st = Stage("leonov-pack")
    # the pack is a rounded slab against the back: 0.36 wide, 0.52 high, 0.17 deep; its outer face looks to -Z
    cx, cy, cz = 0.0, 0.25, -0.235
    a_, b_ = 0.18, 0.26
    n = 28
    levels = [(-0.085, 0.90), (-0.066, 0.985), (0.066, 0.985), (0.085, 0.90)]    # (z, scale): bevel at the two faces

    def cross(scale):
        out = []
        for i in range(n):
            t = 2 * math.pi * i / n
            ct, stt = math.cos(t), math.sin(t)
            x = a_ * np.sign(ct) * abs(ct) ** (2 / 4.0) * scale
            y = b_ * np.sign(stt) * abs(stt) ** (2 / 4.0) * scale
            out.append((x, y))
        return out
    rows = []
    for z, sc in levels:
        rows.append([(cx + x, cy + y, cz + z) for x, y in cross(sc)])
    P = np.array([p for r in rows for p in r])
    F = []
    for k in range(len(rows) - 1):
        for i in range(n):
            j = (i + 1) % n
            F += [[k * n + i, k * n + j, (k + 1) * n + j], [k * n + i, (k + 1) * n + j, (k + 1) * n + i]]
    c0, c1 = len(P), len(P) + 1
    P = np.vstack([P, [cx, cy, cz + levels[0][0]], [cx, cy, cz + levels[-1][0]]])
    for i in range(n):
        j = (i + 1) % n
        F += [[c0, j, i], [c1, (len(rows) - 1) * n + i, (len(rows) - 1) * n + j]]
    slab = outward((P, np.array(F, dtype=np.int64)), (cx, cy, cz))
    st.add("slab", "body", PACK, slab)
    zf = cz - 0.085           # the outer face
    # the round gauge window at the top: bezel, glass, hand
    gc = V(0.0, cy + 0.16, zf - 0.008)
    st.add("gauge-bezel", "body", GAUGE, lathe(gc, V(0, 0, -1), [(0.0, 0.050), (0.012, 0.046), (0.014, 0.036)], 20, closed=False))
    st.add("gauge-glass", "body", GLASS, lib.disc(gc + V(0, 0, -0.0145), V(0, 0, -1), 0.036, 20))
    st.add("gauge-needle", "body", METAL, box(gc + V(0.008, 0.008, -0.0155), (0.026, 0.004, 0.001), rot("z", 45)))
    # the two raised vertical ribs low on the face
    for x in (-0.07, 0.07):
        st.add("rib", "body", PACK, merge([rod(V(x, cy - 0.17, zf - 0.006), V(x, cy - 0.02, zf - 0.006), 0.022, 8),
                                            lib.sphere(V(x, cy - 0.17, zf - 0.006), 0.022, 3, 8), lib.sphere(V(x, cy - 0.02, zf - 0.006), 0.022, 3, 8)]))
    # screws
    for x, y in ((-0.12, cy + 0.04), (0.12, cy + 0.04), (-0.12, cy - 0.20), (0.12, cy - 0.20), (0.0, cy - 0.23)):
        st.add("screw", "body", METAL_D, frustum(V(x, y, zf), V(x, y, zf - 0.010), 0.011, 0.009, 6, caps=True))
    # the relief valve on top, left: a barrel and its knob; the filler on the right; the two hose fittings at the top corners
    vc = V(-0.10, cy + b_ - 0.004, cz)
    st.add("relief-valve", "body", METAL, frustum(vc, vc + V(0, 0.05, 0), 0.028, 0.024, 10, caps=True))
    st.add("relief-valve-cap", "body", METAL_D, frustum(vc + V(0, 0.05, 0), vc + V(0, 0.075, 0), 0.016, 0.012, 8, caps=True))
    st.add("relief-valve-vent", "body", BLACK, frustum(vc + V(0, 0.062, 0), vc + V(0, 0.062, 0.030), 0.007, 0.007, 6, caps=True))
    fc = V(0.10, cy + b_ - 0.004, cz)
    st.add("filler", "body", METAL_D, frustum(fc, fc + V(0, 0.032, 0), 0.026, 0.022, 10, caps=True))
    for sg in (1, -1):
        fp = V(sg * 0.15, cy + b_ - 0.06, cz + 0.07)
        st.add("hose-socket", "body", METAL, frustum(fp, fp + V(sg * 0.012, 0.04, 0.012), 0.026, 0.022, 8, caps=True))
        st.add("hose-socket-blue", "body", BLUE, frustum(fp + V(sg * 0.003, 0.012, 0.003), fp + V(sg * 0.004, 0.02, 0.004), 0.029, 0.029, 8, caps=True))
    # the tether ring low on the right and the carry loop on top
    st.add("tether-ring", "body", METAL, lib.torus(V(0.13, cy - 0.255, cz - 0.02), V(0, 0, 1), 0.030, 0.008, 12, 4))
    st.add("tether-lug", "body", METAL_D, box(V(0.13, cy - 0.245, cz + 0.0), (0.04, 0.026, 0.03), None))
    # the shoulder-strap anchors on the pack's top face
    for sg in (1, -1):
        st.add("strap-anchor", "body", STRAP, box(V(sg * 0.13, cy + 0.255, cz + 0.045), (0.05, 0.02, 0.05), None))
    return st, V(0.13, cy - 0.255, cz - 0.02)


SCALE = 0.905         # the pose is drawn at 1.0 and brought to 1.8 m head to toe by one scale


def scale_stage(st, k):
    st.m.parts = [(lab, role, col, (Vv * k, F)) for lab, role, col, (Vv, F) in st.m.parts]


def shift_stage(st, c):
    st.m.parts = [(lab, role, col, (Vv - c, F)) for lab, role, col, (Vv, F) in st.m.parts]


def centre_of_mass(parts):
    """Volume-weighted: each part's triangle fans from its own centre give a signed tetra volume; closed-ish solids only
    (the suit and pack are); a crude density of 1."""
    tot, acc = 0.0, np.zeros(3)
    for st in parts:
        for lab, role, col, (Vv, F) in st.m.parts:
            if len(F) == 0:
                continue
            c0 = Vv.mean(axis=0)
            a, b, c = Vv[F[:, 0]] - c0, Vv[F[:, 1]] - c0, Vv[F[:, 2]] - c0
            vol = np.einsum("ij,ij->i", a, np.cross(b, c)) / 6.0
            cen = (a + b + c) / 4.0 + c0
            v = abs(vol.sum())
            if v < 1e-9:
                continue
            acc += (vol[:, None] * cen).sum(axis=0) / vol.sum() * v
            tot += v
    return acc / tot


def build():
    suit = build_suit()
    pack, ring = build_pack()
    scale_stage(suit, SCALE)
    scale_stage(pack, SCALE)
    ring = ring * SCALE
    c = centre_of_mass([suit, pack])
    shift_stage(suit, c)
    shift_stage(pack, c)
    veh = Vehicle("leonov-eva")
    veh.add("leonov-suit", suit, (0.0, 0.0, 0.0))
    veh.add("leonov-pack", pack, tuple(V(0.0, 0.25, -0.235) * SCALE - c))
    veh.com_shift = c
    veh.tether_ring = ring - c
    return veh


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "out/leonov-eva.json"
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    v = build()
    v.export(out)
    allv = np.vstack([p[3][0] for p in v.whole().parts])
    print("shifted by", np.round(v.com_shift, 3).tolist(), "extent", allv.min(axis=0).round(3).tolist(), allv.max(axis=0).round(3).tolist(),
          "height (y)", round(float(allv[:, 1].max() - allv[:, 1].min()), 3))
    print("tether ring at", np.round(v.tether_ring, 3).tolist(), "pack origin", np.round(v.find("leonov-pack")["origin"], 3).tolist())
