"""msl-builder: the Mars Science Laboratory's entry vehicle and its descent stage, for the Curiosity Moment (release 1.7.9).

Two models, each a tree of NAMED PARTS (tools/vostok-builder/vlib.py, on the part library of tools/stage-builder):

  msl-entry          the aeroshell: `msl-heat-shield` (the 70 degree sphere-cone of dark PICA tiles with its rim lip) and
                     `msl-backshell` (the white cone with its round access plugs, its square hatch, four thruster-pod windows and
                     the parachute canister on top). Metres, +Y up the axis towards the HEAT SHIELD's nose (the way the vehicle
                     flies), the origin on the top of the parachute canister, so a vehicle flown 'prograde' goes heat shield first.
  msl-descent-stage  `msl-descent-stage`: the rocket backpack that carried Curiosity down: a frame of aluminium beams and struts,
                     six propellant and pressurant tanks in gold thermal blanket, four outrigger pods with two throttleable
                     Mars Landing Engines each, the antenna mast, the radar antennas and the three struts that held the rover.
                     Metres, +Y up (the deck up, the rover below), the origin on the centre of the frame's underside.

WHAT IS PUBLISHED AND WHAT IS READ OFF A PICTURE. NASA's Mars Science Laboratory press kit (Wikimedia Commons, 'MSL Press Kit.pdf',
public domain) gives the heat shield's diameter, 4.5 m (14 feet 9 inches), the cruise vehicle's height, 3 m, the eight throttleable
Mars landing engines of 400 to 3 100 N, the 7.6 m bridle and the 6 tungsten entry balance masses. Everything else is read off the
photographs of the flight hardware that NASA published (all public domain on Wikimedia Commons: 'MSL Capsule.jpg', 'Msl capsule
cruiseStage.jpg', 'MSL DescentStage.jpg', the labelled 'MSL-descent-stage-with-labe.png', and the artist's pictures 'Curiosity Inside
Aeroshell, Artist's Concept.jpg'), against the 4.5 m: the backshell's 1.45 m height and 0.95 m top plate, the sphere-cone's 0.75 m depth,
the rim, the twelve round plugs, the hatch; the descent stage's 2.7 m frame, its six tanks, its four pods. NO DRAWING WITH
DIMENSIONS of the backshell or the descent stage was found, so those are ILLUSTRATIVE to about ten per cent; the model says so
(registry/models.yaml honesty). No logo, flag or lettering is drawn.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vostok-builder"))
from vlib import *  # noqa: F401,F403,E402
import lib  # noqa: E402

# colours (sRGB hex): read off the photographs
WHITE = "#E7E5DF"        # the backshell's white paint
WHITE_D = "#D5D3CC"
PLUG = "#8E8D88"
HOLE = "#1B1D20"
WINDOW = "#15171A"
SILVER = "#B7BCC3"
SILVER_D = "#8B929A"
ALU = "#A9AEB5"
PICA = "#2D2B29"         # the heat shield's tiles: charcoal
PICA_L = "#3A3735"
SEAM = "#171615"
LIP = "#3C3935"
GOLD = "#C98A2E"        # kapton-wrapped tanks
GOLD_D = "#A96E1F"
GOLD_L = "#D6A646"
ORANGE = "#C4622A"      # the engines' outer skins
NOZ = "#5A4B42"
BLACK = "#202226"
MLI = "#C9CDD2"

R_BASE = 2.25            # 4.5 m heat shield
Y_PLATE = 0.30           # the backshell's top plate
Y_RIM = 1.75             # the backshell's base
Y_LIP = 1.85             # top of the heat shield's rim
THETA = math.radians(70)  # the sphere-cone's half angle
RN = 0.60                # the nose's radius
PHI = math.radians(90 - 70)
R_NOSE_EDGE = RN * math.sin(PHI)
Y_CONE_TOP = Y_LIP + (R_BASE - R_NOSE_EDGE) / math.tan(THETA)   # where the cone meets the nose cap
Y_NOSE = Y_CONE_TOP + RN * (1 - math.cos(PHI))
R_TOP = 0.95             # the top plate


def sector(prof, a0, a1, nseg=6):
    """A patch of a surface of revolution about +Y: `prof` = [(y, r), ...] (y rising or falling), angles a0..a1 degrees. Faces outward
    when y rises along the profile (as lib.lathe)."""
    u, v = lib.frame(V(0, 1, 0))
    P, F = [], []
    ts = np.linspace(math.radians(a0), math.radians(a1), nseg + 1)
    for y, r in prof:
        for t in ts:
            P.append(r * (math.cos(t) * u + math.sin(t) * v) + V(0, y, 0))
    n = len(ts)
    for k in range(len(prof) - 1):
        for i in range(nseg):
            a, b, c, d = k * n + i, k * n + i + 1, (k + 1) * n + i + 1, (k + 1) * n + i
            F += [[a, b, c], [a, c, d]]
    return np.array(P), np.array(F, dtype=np.int64)


def cone_r(y):
    """The backshell's radius at height y (its straight cone from the top plate to the base)."""
    return R_TOP + (R_BASE - R_TOP) * (y - Y_PLATE) / (Y_RIM - Y_PLATE)


def on_cone(y, az_deg, lift=0.0):
    """A point on the backshell's skin and its outward normal."""
    a = math.radians(az_deg)
    r = cone_r(y) + lift
    slope = (R_BASE - R_TOP) / (Y_RIM - Y_PLATE)
    nrm = unit(V(math.cos(a), -slope, math.sin(a)))      # outward and up (the skin faces away from the heat shield)
    return V(r * math.cos(a), y, r * math.sin(a)), nrm


def basis_from(n, up_hint=(0, 1, 0)):
    n = unit(n)
    t = unit(np.cross(V(*up_hint), n))
    b = np.cross(n, t)
    return np.column_stack([t, b, n])   # columns: tangent, bitangent, normal


def build_heat_shield():
    st = Stage("msl-heat-shield")
    # the profile from the nose (top, y high) down the sphere-cone to the rim
    cap = [(Y_NOSE - RN * (1 - math.cos(PHI * k / 3)), RN * math.sin(PHI * k / 3)) for k in range(4)]
    # the cone is cut into four bands of tiles, and each band into tiles (113 tiles in the real shield; here about a hundred)
    r_edges = [R_NOSE_EDGE, 0.78, 1.28, 1.78, R_BASE]
    counts = [8, 14, 20, 26]
    # the cone's height at radius r: from Y_CONE_TOP at the nose edge down to Y_LIP at the base, a straight line
    y_at = lambda r: Y_CONE_TOP - (r - R_NOSE_EDGE) / (R_BASE - R_NOSE_EDGE) * (Y_CONE_TOP - Y_LIP)
    # an underlay of the seam colour a hair under the tiles, so the gaps between them are the dark of the glue and not the sky
    under = [(y_at(R_BASE), R_BASE - 0.004), (y_at(R_NOSE_EDGE) - 0.004, R_NOSE_EDGE)]
    st.add("underlay", "body", SEAM, sector([(y - 0.004, r - 0.004) for y, r in under], 0, 360, 72))
    for bi in range(4):
        n = counts[bi]
        # profile falling with y as r grows: faces outward when y FALLS along the list? lathe faces out when y rises: list from outer to inner
        prof = [(y_at(r_edges[bi + 1]), r_edges[bi + 1]), (y_at(r_edges[bi]), r_edges[bi])]
        for k in range(n):
            a0, a1 = 360.0 * k / n, 360.0 * (k + 1) / n
            gap = 0.55   # degrees left between neighbouring tiles
            col = PICA if (k + bi) % 2 == 0 else PICA_L
            st.add("tile", "body", col, sector(prof, a0 + gap, a1 - gap, 3))
        # the seams between rings: a darker ring
    for r in r_edges[1:-1]:
        st.add("seam", "body", SEAM, frustum((0, y_at(r) - 0.004, 0), (0, y_at(r) + 0.004, 0), r + 0.004, r + 0.004, 56, caps=False))
    # the nose cap (a smooth ablator, a little lighter), its dark centre
    st.add("nose", "body", PICA_L, lib.lathe(V(0, 0, 0), V(0, 1, 0), [(y, r) for y, r in reversed(cap)], 40))
    # the rim lip: a short dark cylinder at the shield's base, and a slightly proud ring above it where the backshell's base is bolted
    st.add("lip", "body", LIP, frustum((0, Y_RIM, 0), (0, Y_LIP + 0.02, 0), R_BASE, R_BASE, 72, caps=False))
    st.add("lip-ring", "body", SEAM, frustum((0, Y_LIP, 0), (0, Y_LIP + 0.03, 0), R_BASE + 0.012, R_BASE + 0.012, 72, caps=False))
    st.add("lip-under", "body", PICA, sector([(Y_LIP, R_BASE - 0.05), (Y_LIP, R_BASE)], 0, 360, 72))
    return st


def build_backshell():
    st = Stage("msl-backshell")
    # the white cone: six bands of paint, alternately a shade lighter (the panels' joints show as a tint)
    bands = 6
    for k in range(bands):
        a = Y_PLATE + (Y_RIM - Y_PLATE) * k / bands
        b = Y_PLATE + (Y_RIM - Y_PLATE) * (k + 1) / bands
        col = shade(WHITE, 1.0 + 0.018 * (1 if k % 2 == 0 else -1))
        st.add("skin", "body", col, frustum((0, a, 0), (0, b, 0), cone_r(a), cone_r(b), 72, caps=False))
    # radial panel seams: sixteen thin grey lines up the cone
    for k in range(16):
        a = math.radians(360.0 * k / 16 + 11.25)
        p0 = V((cone_r(Y_PLATE) + 0.004) * math.cos(a), Y_PLATE, (cone_r(Y_PLATE) + 0.004) * math.sin(a))
        p1 = V((cone_r(Y_RIM) + 0.004) * math.cos(a), Y_RIM, (cone_r(Y_RIM) + 0.004) * math.sin(a))
        st.add("seam", "body", WHITE_D, rod(p0, p1, 0.006, 4))
    # the base ring (where the backshell meets the heat shield): a slightly proud band
    st.add("base-ring", "body", WHITE_D, frustum((0, Y_RIM - 0.14, 0), (0, Y_RIM, 0), cone_r(Y_RIM - 0.14) + 0.012, R_BASE + 0.012, 72, caps=False))
    # the top plate and the parachute canister: a flat annulus, a short cone, the canister's cap and its low-gain antenna disc
    st.add("plate", "body", WHITE, lib.disc(V(0, Y_PLATE, 0), V(0, 1, 0), R_TOP, 72, r_in=0.72))
    st.add("canister", "body", shade(WHITE, 0.97), frustum((0, Y_PLATE, 0), (0, 0.06, 0), 0.72, 0.58, 56, caps=False))
    st.add("canister-top", "body", SILVER, lib.disc(V(0, 0.06, 0), V(0, 1, 0), 0.58, 56))
    st.add("antenna", "body", SILVER_D, frustum((0, 0.0, 0), (0, 0.06, 0), 0.30, 0.34, 40, caps=True))
    st.add("canister-band", "body", PLUG, frustum((0, 0.15, 0), (0, 0.19, 0), 0.665, 0.655, 56, caps=False))
    # twelve round plugs (the access covers), two rings of six staggered round the cone
    for k in range(12):
        az = 360.0 * k / 12 + (0 if k % 2 == 0 else 0)
        y = 0.62 if k % 2 == 0 else 0.98
        p, n = on_cone(y, az, 0.0)
        R = basis_from(n)
        st.add("plug", "body", PLUG, xf(frustum((0, -0.004, 0), (0, 0.016, 0), 0.115, 0.108, 18, caps=True), np.column_stack([R[:, 0], R[:, 2], -R[:, 1]]), p))
        st.add("plug-dark", "body", HOLE, xf(frustum((0, 0.014, 0), (0, 0.02, 0), 0.05, 0.05, 12, caps=True), np.column_stack([R[:, 0], R[:, 2], -R[:, 1]]), p))
    # the square access hatch with its rivets, and four thruster pods in dark windows (the reaction control jets for the guided entry)
    p, n = on_cone(0.95, 18.0, 0.0)
    R = basis_from(n)
    st.add("hatch", "body", WHITE_D, box(p + n * 0.006, (0.62, 0.52, 0.02), R))
    for dx in (-0.25, 0.25):
        for dy in (-0.2, 0.2):
            q = p + n * 0.018 + R[:, 0] * dx + R[:, 1] * dy
            st.add("rivet", "body", SILVER_D, xf(frustum((0, 0, 0), (0, 0.01, 0), 0.016, 0.014, 6, caps=True), np.column_stack([R[:, 0], R[:, 2], -R[:, 1]]), q))
    for k in range(4):
        az = 45.0 + 90.0 * k
        p, n = on_cone(1.15, az, 0.0)
        R = basis_from(n)
        st.add("window", "body", WINDOW, box(p + n * 0.003, (0.52, 0.30, 0.025), R))
        for dx in (-0.1, 0.1):
            q = p + n * 0.02 + R[:, 0] * dx
            st.add("jet", "body", SILVER_D, xf(frustum((0, 0, 0), (0, 0.06, 0), 0.045, 0.07, 12, caps=False), np.column_stack([R[:, 0], R[:, 2], -R[:, 1]]), q))
    # the cable-guard rail round the base (a thin ring), and the lifting lugs near the plate
    st.add("rail", "body", SILVER_D, torus(V(0, Y_RIM - 0.2, 0), V(0, 1, 0), cone_r(Y_RIM - 0.2) + 0.03, 0.012, 72, 5))
    for k in range(3):
        a = math.radians(120.0 * k + 60)
        q = V((R_TOP + 0.02) * math.cos(a), Y_PLATE + 0.03, (R_TOP + 0.02) * math.sin(a))
        st.add("lug", "body", SILVER_D, torus(q, V(-math.sin(a), 0, math.cos(a)), 0.045, 0.012, 12, 5))
    return st


def build_entry():
    veh = Vehicle("msl-entry")
    shield = build_heat_shield()
    back = build_backshell()
    veh.add("msl-heat-shield", shield, (0.0, 2.1, 0.0))
    veh.add("msl-backshell", back, (0.0, 0.95, 0.0))
    return veh


# ------------------------------------------------------------------------------------------------------------------------
# the descent stage

def beam(a, b, w, col, st, label="beam", role="body"):
    """A square-section beam between two points."""
    a, b = V(*a), V(*b)
    d = b - a
    L = np.linalg.norm(d)
    u, v = lib.frame(unit(d))
    R = np.column_stack([u, unit(d), v])
    st.add(label, role, col, box((a + b) / 2, (w, L, w), R))


def tank(st, c, r, col=GOLD, label="tank"):
    st.add(label, "foil", col, lib.sphere(V(*c), r, 8, 16))
    # the tank's straps: two bands
    st.add(label + "-band", "body", SILVER_D, torus(V(*c), V(0, 1, 0), r * 0.995, 0.012, 24, 5))
    st.add(label + "-band", "body", SILVER_D, torus(V(*c), V(1, 0, 0), r * 0.995, 0.012, 24, 5))


def mle(st, top, tilt_deg, az_deg):
    """One Mars landing engine: a copper-coloured housing with its nozzle, hanging from `top`, canted out by tilt_deg."""
    a = math.radians(az_deg)
    out = V(math.cos(a), 0, math.sin(a))
    t = math.radians(tilt_deg)
    axis = unit(-V(0, 1, 0) * math.cos(t) + out * math.sin(t))
    top = V(*top)
    st.add("mle-body", "body", ORANGE, frustum(top, top + axis * 0.32, 0.085, 0.07, 14, caps=True))
    st.add("mle-nozzle", "body", NOZ, frustum(top + axis * 0.32, top + axis * 0.72, 0.045, 0.16, 18, caps=False))
    st.add("mle-lip", "body", BLACK, torus(top + axis * 0.72, axis, 0.158, 0.008, 18, 4))
    return top + axis * 0.72


def build_descent():
    st = Stage("msl-descent-stage")
    H = 1.05                                  # the frame's height
    S = 1.30                                  # half the frame's width
    corners = [(sx * S, sz * S) for sx in (-1, 1) for sz in (-1, 1)]
    # lower and upper rails
    for y in (0.0, H):
        for (x0, z0), (x1, z1) in (((-S, -S), (S, -S)), ((S, -S), (S, S)), ((S, S), (-S, S)), ((-S, S), (-S, -S))):
            beam((x0, y, z0), (x1, y, z1), 0.10, ALU, st, "rail")
    for x, z in corners:
        beam((x, 0, z), (x, H, z), 0.10, ALU, st, "post")
    # cross beams on the upper and the lower plane, and the diagonals between the planes
    beam((-S, 0, 0), (S, 0, 0), 0.09, ALU, st, "cross")
    beam((0, 0, -S), (0, 0, S), 0.09, ALU, st, "cross")
    beam((-S, H, 0), (S, H, 0), 0.08, SILVER, st, "cross")
    beam((0, H, -S), (0, H, S), 0.08, SILVER, st, "cross")
    for x, z in corners:
        st.add("brace", "body", SILVER_D, rod(V(x, 0, z), V(-x * 0.1, H, -z * 0.1), 0.03, 5))
        st.add("brace", "body", SILVER_D, rod(V(x, H, z), V(x * 0.05, 0.0, z * 0.05), 0.03, 5))
    # three big propellant spheres and three smaller pressurant tanks, in gold blanket, standing on the lower plane
    for k in range(3):
        a = math.radians(90 + 120 * k)
        tank(st, (0.68 * math.cos(a), 0.66, 0.68 * math.sin(a)), 0.50, GOLD, "tank")
    for k in range(3):
        a = math.radians(30 + 120 * k)
        tank(st, (1.02 * math.cos(a), 0.42, 1.02 * math.sin(a)), 0.31, GOLD_D, "tank-small")
    # the central column: the sky crane's bridle spool housing, a silver barrel with a collar
    st.add("column", "body", SILVER, frustum((0, 0.0, 0), (0, 0.95, 0), 0.20, 0.20, 24, caps=True))
    st.add("column-ring", "body", SILVER_D, torus(V(0, 0.55, 0), V(0, 1, 0), 0.205, 0.02, 24, 5))
    # blanketed electronics boxes between the tanks (crinkled silver MLI)
    for (x, z, w, h) in ((1.12, 0.0, 0.34, 0.5), (-1.12, 0.1, 0.40, 0.4), (0.1, -1.12, 0.36, 0.45), (-0.2, 1.12, 0.40, 0.4)):
        st.add("mli", "foil", MLI, box((x, 0.22 + h / 2, z), (w, h, w * 1.2), None, 0.012, int(abs(x * 7 + z * 3))))
    # the four outrigger pods: a boom from each corner out and down to a pod carrying a pair of engines
    flame_pts = []
    for k, (x, z) in enumerate(corners):
        a = math.degrees(math.atan2(z, x))
        out = V(x, 0, z) / math.hypot(x, z)
        pod = V(x, 0, z) + out * 0.55 + V(0, -0.25, 0)
        beam((x, 0.1, z), tuple(pod), 0.09, ALU, st, "boom")
        st.add("boom-wrap", "foil", GOLD_L, rod(V(x, 0.1, z) + (pod - V(x, 0.1, z)) * 0.25, V(x, 0.1, z) + (pod - V(x, 0.1, z)) * 0.8, 0.075, 8))
        st.add("pod", "foil", MLI, box(tuple(pod + V(0, 0.05, 0)), (0.48, 0.30, 0.48), None, 0.01, 40 + k))
        perp = V(-math.sin(math.radians(a)), 0, math.cos(math.radians(a)))
        for s in (-1, 1):
            top = pod + perp * 0.14 * s + V(0, -0.12, 0)
            flame_pts.append([float(c) for c in mle(st, tuple(top), 14.0, a)])
    # blanket patches (crinkled silver MLI) laid over the frame's four sides, between the posts, as in the lab photograph
    for k, (x, z) in enumerate(((S, 0.0), (-S, 0.0), (0.0, S), (0.0, -S))):
        w = (0.05, 0.62, 1.7) if x else (1.7, 0.62, 0.05)
        st.add("blanket", "foil", MLI, box((x * 0.985, 0.34, z * 0.985), (w[0] * (0.5 if not x else 1), 0.34, w[2] * (0.5 if x else 1)), None, 0.02, 60 + k))
        st.add("blanket-gold", "foil", GOLD_L, box((x * 0.985, 0.74, z * 0.985), (w[0] * (0.7 if not x else 1), 0.26, w[2] * (0.7 if x else 1)), None, 0.02, 90 + k))
    # tanks' feed lines and the hydrazine plumbing: a few thin silver tubes along the rails
    for (x0, z0, x1, z1) in ((-S, -S, S, -S), (S, -S, S, S), (S, S, -S, S), (-S, S, -S, -S)):
        st.add("line", "body", SILVER_D, rod(V(x0, 0.2, z0), V(x1, 0.2, z1), 0.018, 5))
    # the radar antennas on the underside (the terminal descent sensor's six small horns) and the three rover struts
    for k in range(6):
        a = math.radians(60 * k + 20)
        q = V(0.55 * math.cos(a), -0.02, 0.55 * math.sin(a))
        st.add("radar", "body", BLACK, frustum(q, q + V(0, -0.1, 0), 0.04, 0.075, 8, caps=True))
    for k in range(3):
        a = math.radians(120 * k + 90)
        q = V(0.95 * math.cos(a), 0.0, 0.95 * math.sin(a))
        st.add("strut", "body", SILVER_D, rod(q, q + V(0, -0.34, 0), 0.04, 6))
        st.add("strut-foot", "body", BLACK, frustum(q + V(0, -0.34, 0), q + V(0, -0.38, 0), 0.06, 0.06, 8, caps=True))
    # the antenna mast on top (the tall whip, label 4 in NASA's drawing) and two small dishes
    st.add("mast", "body", BLACK, rod(V(0, H, 0), V(0, H + 1.05, 0), 0.026, 6))
    st.add("mast-foot", "body", SILVER_D, frustum((0, H, 0), (0, H + 0.12, 0), 0.07, 0.04, 10, caps=True))
    st.add("dish", "body", WHITE_D, lib.dome(V(1.05, H + 0.08, -0.9), 0.14, (0, 1, 0), 4, 14, 0.07))
    st.add("dish-stem", "body", SILVER_D, rod(V(1.05, H, -0.9), V(1.05, H + 0.1, -0.9), 0.012, 4))
    st.add("star", "body", BLACK, box((-1.0, H + 0.05, 1.0), (0.14, 0.1, 0.14)))
    return st, flame_pts


def build_descent_vehicle():
    st, pts = build_descent()
    veh = Vehicle("msl-descent-stage")
    veh.add("msl-descent-stage", st, (0.0, 0.5, 0.0))
    return veh, pts


if __name__ == "__main__":
    which = sys.argv[1]
    out = sys.argv[2]
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    if which == "entry":
        v = build_entry()
        v.export(out, limit=14)
        print("Y_NOSE", round(Y_NOSE, 3), "Y_CONE_TOP", round(Y_CONE_TOP, 3))
    else:
        v, pts = build_descent_vehicle()
        v.export(out, limit=14)
        print("ENGINES (vehicle frame, nozzle exits):")
        import json
        print(json.dumps([[round(c, 3) for c in p] for p in pts]))
