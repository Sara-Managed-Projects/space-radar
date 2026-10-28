"""r7-8k72k: the R-7 8K72K 'Vostok-K' launcher that put Gagarin into orbit, in named parts.

  boosters-4   the four strap-on blocks (B, V, G, D: booster-b ... booster-d), each a long oblique cone on its
               RD-107 (four main chambers and two verniers), with its air rudder and the nose fitting that rides on the core
  core-stage   block A: the 2.95 m core on its RD-108 (four main chambers and four verniers), the shoulder ring the strap-ons
               ride on, the cable tunnels, and the open lattice truss on top of it (the truss stays with the core)
  blok-e       block E, the third stage (RD-0109 in the truss, four verniers), the payload adapter
  fairing      the payload shroud: ogive and cylinder

Metres, +Y up the axis, y = 0 at the plane of the nozzle exits (the base of the stack), the payload (vostok-3ka, origin at its
lower interface) standing on the adapter at y = 31.5 inside the fairing. The strap-ons stand on the diagonals (45, 135, ...
degrees from +X), their air rudders pointing out.

Dimensions (published): overall 38.246 m with the shroud, span 10.303 m across the rudders, central block 28.131 m, strap-on
19.608 m, block III 2.980 m (the Russian cutaway drawing on Wikimedia Commons, 'R-7 vostok.jpg'); core diameter 2.95 m, strap-on
2.68 m, block E 2.56 m (Astronautix, ru.wikipedia). The shroud's length, the positions of the joints, the tail sections and every
fitting are read off that drawing and the photographs of the museum copies at VDNKh and Kaluga, and are ILLUSTRATIVE in the metre.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlib import *  # noqa: F401,F403,E402
import lib  # noqa: E402

# ---- published numbers
R_CORE = 1.475           # 2.95 m
R_BOOST = 1.34           # 2.68 m
R_E = 1.28               # 2.56 m
H_TOTAL = 38.246
Y_BOOST_BASE = 1.0       # the skirts end here; the nozzles hang to y = 0
Y_CORE_BASE = 0.95
Y_BOOST_TIP = 19.6
Y_TRUSS0, Y_TRUSS1 = 27.2, 28.4
Y_E0, Y_E1 = 28.4, 31.5
Y_FAIR0, Y_FAIR_OGIVE, Y_FAIR1 = 31.5, 35.2, H_TOTAL
D_BOOST = R_CORE + R_BOOST + 0.03       # the strap-ons' axes at the base, 2.845 m from the core's

# ---- colours (ours, read off the photographs of the museum copies at VDNKh and Kaluga)
SKIN = "#BCC2C7"          # the silver-grey skin
SKIN_D = "#A9AFB5"
SKIN_L = "#CBD0D4"
RING = "#9CA2A9"
HATCH = "#8F959C"
SEAM = "#7D838A"
DARK = "#2A2C30"
NOZ = "#8A9096"
NOZ_IN = "#A63B2D"        # the red inside of the chambers (the photograph from below)
CHAMBER = "#767C83"
RUDDER = "#A3A9AF"
RED = "#B23A2E"
BRACE = "#6B7178"
COPPER = "#B87B3F"


def tint_skin(k, n=2, d=0.02):
    return shade(SKIN, 1 + d * (1 if k % n == 0 else -1))


def loft(sections, ex, ez, seg=40, caps=False):
    """Circles (y, r, c) -> a skin: each centre is c along `ex` (a horizontal unit vector) from the axis. Faces out."""
    ex, ez = V(ex), V(ez)
    t = np.linspace(0, 2 * math.pi, seg, endpoint=False)
    P, F = [], []
    for k, (y, r, c) in enumerate(sections):
        for a in t:
            P.append(ex * (c + r * math.cos(a)) + ez * (r * math.sin(a)) + V(0, y, 0))
    n = len(sections)
    for k in range(n - 1):
        for i in range(seg):
            j = (i + 1) % seg
            p0, p1, p2, p3 = k * seg + i, k * seg + j, (k + 1) * seg + j, (k + 1) * seg + i
            F += [[p0, p2, p1], [p0, p3, p2]]
    m = (np.array(P), np.array(F, dtype=np.int64))
    # make faces look out of the loft's own axis (a reference point inside)
    cen = m[0].mean(axis=0)
    return orient_mesh(m, cen)


def orient_mesh(mesh, ref):
    Vv, F = mesh
    c = Vv[F].mean(axis=1)
    n = np.cross(Vv[F[:, 1]] - Vv[F[:, 0]], Vv[F[:, 2]] - Vv[F[:, 0]])
    # ref is a point; use the nearest axis point: for a tall shape compare against the axis at the same height
    ax = np.array([ref[0], 0.0, ref[2]])
    d = c - np.stack([np.full(len(c), ref[0]), c[:, 1], np.full(len(c), ref[2])], axis=1)
    s = float(np.sum(np.sign(np.sum(n * d, axis=1))))
    return (Vv, F[:, ::-1].copy()) if s < 0 else mesh


def engine_cluster(st, label, cx, cz, ex, ez, y_skirt, mains, verniers, rt=0.105, re=0.31, length=0.92, seg=14):
    """Main chambers at (u, v) offsets from (cx, cz) along (ex, ez); verniers likewise; each a barrel into the skirt and a bell
    hanging to y = 0."""
    ex, ez = V(ex), V(ez)
    for (u, v) in mains:
        p = V(cx, 0, cz) + ex * u + ez * v
        # a barrel (the chamber) and a collar where it leaves the skirt
        st.add(label + "-chamber", "body", CHAMBER, frustum(V(p[0], y_skirt - 0.02, p[2]), V(p[0], y_skirt - length + 0.02 + 0.06, p[2]), 0.205, rt + 0.02, 12, caps=False))
        st.bell(label + "-main", y_skirt - 0.08, rt, re, length - 0.08, NOZ, seg=seg, n=7, p=1.7, ribs=2, x=p[0], z=p[2], inner_col=NOZ_IN, wall=0.014)
    for (u, v) in verniers:
        p = V(cx, 0, cz) + ex * u + ez * v
        st.add(label + "-vernier-mount", "body", BRACE, box(V(p[0], y_skirt - 0.05, p[2]), (0.12, 0.10, 0.12)))
        st.bell(label + "-vernier", y_skirt - 0.1, 0.028, 0.07, 0.34, NOZ, seg=8, n=4, p=1.6, x=p[0], z=p[2], inner_col=NOZ_IN, wall=0.008)


def build_booster(name, ang):
    """One strap-on, in vehicle coordinates, its axis at the base on azimuth `ang` degrees."""
    st = Stage(name)
    a = math.radians(ang)
    ex = V(math.cos(a), 0, math.cos(a) * 0 + math.sin(a))      # radial, out from the core
    ez = V(-math.sin(a), 0, math.cos(a))                       # tangential
    cx0 = D_BOOST
    x_in = cx0 - R_BOOST       # the inner generatrix stays vertical, hugging the core (radial distance)
    seg = 40
    # ---- sections: tail drum (cylinder), shoulder, then the long cone to the nose
    y_cyl1 = 4.6
    secs = []
    ys_cyl = [Y_BOOST_BASE, 1.5, 2.2, 3.0, 3.8, y_cyl1]
    for y in ys_cyl:
        secs.append((y, R_BOOST, x_in + R_BOOST))
    n_cone = 12
    r_top = 0.15
    for k in range(1, n_cone + 1):
        t = k / n_cone
        # a very slightly convex cone (a long ogive-like taper), so the strap-on's outline is as in the photographs
        r = R_BOOST + (r_top - R_BOOST) * (t ** 0.97)
        y = y_cyl1 + (Y_BOOST_TIP - 0.5 - y_cyl1) * t
        secs.append((y, r, x_in + r))
    # panelled skin: alternate tints by ring
    for k in range(len(secs) - 1):
        m = loft([secs[k], secs[k + 1]], ex, ez, seg)
        st.add("skin", "body", tint_skin(k), m)
    # the nose cap and the fitting that rides on the core
    y_tip = secs[-1][0]
    r_tip = secs[-1][1]
    cx_tip = secs[-1][2]
    st.add("nose", "body", SKIN_D, xf(lib.sphere(V(0, 0, 0), r_tip * 1.08, 6, 14, 180.0, 1.5), None, ex * cx_tip + V(0, y_tip + 0.12, 0)))
    st.add("nose-fitting", "body", BRACE, box(ex * (cx_tip - r_tip * 0.9) + V(0, y_tip - 0.30, 0), (0.30, 0.55, 0.26), np.column_stack([ex, [0, 1, 0], ez])))
    # weld rings and the toothed band at the shoulder
    for y in (2.2, 3.4, y_cyl1, 7.0, 9.4, 11.8, 14.2, 16.6, 18.4):
        yy = float(y)
        # radius at that height, linearly between sections
        for k in range(len(secs) - 1):
            if secs[k][0] <= yy <= secs[k + 1][0]:
                f = (yy - secs[k][0]) / max(secs[k + 1][0] - secs[k][0], 1e-9)
                r = secs[k][1] + (secs[k + 1][1] - secs[k][1]) * f
                c = secs[k][2] + (secs[k + 1][2] - secs[k][2]) * f
                break
        w = 0.05 if abs(yy - y_cyl1) < 1e-6 else 0.032
        st.add("ring", "body", RING if abs(yy - y_cyl1) > 1e-6 else SEAM,
               loft([(yy - w / 2, r + 0.014, c), (yy + w / 2, r + 0.014, c)], ex, ez, seg))
    # the toothed band under the shoulder weld: forty small brackets
    teeth = []
    for k in range(40):
        t = 2 * math.pi * k / 40
        p = ex * (cx0 + (R_BOOST + 0.02) * math.cos(t)) + ez * ((R_BOOST + 0.02) * math.sin(t)) + V(0, y_cyl1 - 0.13, 0)
        n = ex * math.cos(t) + ez * math.sin(t)
        teeth.append(box(p, (0.10, 0.06, 0.03), np.column_stack([-ez * math.cos(t) + ex * math.sin(t), [0, 1, 0], n])))
    st.add("teeth", "body", SEAM, merge(teeth))
    # the access panels and ports on the tail drum, away from the core (the side facing the core is bare)
    rng = np.random.default_rng(int(ang) + 7)
    placed = 0
    for k in range(60):
        th = rng.uniform(-150, 150)          # degrees from the outward radial
        y = rng.uniform(1.25, 4.3)
        w, h = rng.uniform(0.18, 0.38), rng.uniform(0.2, 0.42)
        if any(abs(th - tt) < 28 and abs(y - yy) < 0.5 for tt, yy in [(0, 0)] * 0):
            continue
        t = math.radians(th)
        p = ex * (cx0 + (R_BOOST + 0.006) * math.cos(t)) + ez * ((R_BOOST + 0.006) * math.sin(t)) + V(0, y, 0)
        n = ex * math.cos(t) + ez * math.sin(t)
        R = np.column_stack([-ez * math.cos(t) + ex * math.sin(t), [0, 1, 0], n])
        st.add("hatch", "body", HATCH if placed % 3 else RING, box(p, (w, h, 0.028), R))
        placed += 1
        if placed >= 14:
            break
    # round ports: a pair of small steel rings with dark centres
    for th, y in ((40, 2.0), (-70, 3.2), (115, 2.7)):
        t = math.radians(th)
        n = ex * math.cos(t) + ez * math.sin(t)
        p = ex * (cx0 + (R_BOOST + 0.01) * math.cos(t)) + ez * ((R_BOOST + 0.01) * math.sin(t)) + V(0, y, 0)
        st.add("port", "body", BRACE, frustum(p, p + n * 0.03, 0.09, 0.08, 14, caps=True))
        st.add("port-dark", "body", DARK, lib.disc(p + n * 0.032, n, 0.06, 12))
    # the air rudder: a swept triangle on the outward side of the tail drum, 1.0 m out
    R_out = R_BOOST
    pts = [ex * (cx0 + R_out - 0.04) + V(0, 2.75, 0), ex * (cx0 + R_out - 0.04) + V(0, 1.15, 0), ex * (cx0 + R_out + 1.05) + V(0, 1.12, 0)]
    st.add("rudder", "body", RUDDER, plate(pts, 0.05, n=ez))
    pts2 = [ex * (cx0 + R_out + 0.35) + V(0, 1.2, 0), ex * (cx0 + R_out + 1.05) + V(0, 1.14, 0), ex * (cx0 + R_out + 0.5) + V(0, 1.75, 0)]
    st.add("rudder-edge", "body", SEAM, plate(pts2, 0.07, n=ez))
    # the skirt's lower ring and the dark engine bay under it
    st.add("skirt-ring", "body", RING, loft([(Y_BOOST_BASE - 0.04, R_BOOST + 0.012, x_in + R_BOOST), (Y_BOOST_BASE + 0.12, R_BOOST + 0.012, x_in + R_BOOST)], ex, ez, seg))
    bay = lib.disc(ex * cx0 + V(0, Y_BOOST_BASE - 0.02, 0), DOWN, R_BOOST - 0.02, seg)
    st.add("bay", "body", DARK, bay)
    # the engine: four main chambers (a 2 x 2 square, 0.75 m between centres) and two verniers on the tangent
    s = 0.375
    mains = [(s, s), (s, -s), (-s, s), (-s, -s)]
    verns = [(0.0, 1.02), (0.0, -1.02)]
    engine_cluster(st, "rd107", ex[0] * cx0, ex[2] * cx0, ex, ez, Y_BOOST_BASE - 0.02, mains, verns)
    # struts to the core: four short ones near the tail, as in the photograph's brackets
    for dy in (1.9, 2.6):
        for dz in (-0.5, 0.5):
            p0 = ex * (x_in + 0.12) + ez * dz + V(0, dy, 0)
            p1 = ex * (R_CORE - 0.02) + ez * dz * 0.6 + V(0, dy + 0.1, 0)
            st.add("tie", "body", BRACE, rod(p0, p1, 0.03, 5))
    return st


def build_core():
    st = Stage("core-stage")
    seg = 64
    # skin: the tail skirt, the flare, the barrel in 14 bands with the tints of its panels, the shoulder to the truss
    secs = [(Y_CORE_BASE, 1.30), (2.2, 1.30), (3.3, 1.30), (3.9, R_CORE)]
    ys = [3.9, 5.4, 7.0, 8.8, 10.6, 12.4, 14.2, 16.0, 17.8, 19.2, 20.2, 21.8, 23.4, 25.0, 26.4]
    for y in ys[1:]:
        secs.append((y, R_CORE))
    secs.append((Y_TRUSS0, R_E + 0.03))
    for k in range(len(secs) - 1):
        (ya, ra), (yb, rb) = secs[k], secs[k + 1]
        st.add("skin", "body", tint_skin(k, 2, 0.03), frustum((0, ya, 0), (0, yb, 0), ra, rb, seg, caps=False))
    # the top shoulder's lid, the tail's lower ring and engine bay
    st.add("top-lid", "body", DARK, lib.disc((0, Y_TRUSS0, 0), UP, R_E, seg))
    st.add("skirt-ring", "body", RING, frustum((0, Y_CORE_BASE - 0.05, 0), (0, Y_CORE_BASE + 0.14, 0), 1.315, 1.315, seg, caps=False))
    st.add("bay", "body", DARK, lib.disc((0, Y_CORE_BASE - 0.02, 0), DOWN, 1.28, seg))
    # weld rings
    for y in (3.9, 5.4, 8.8, 12.4, 16.0, 19.2, 21.8, 25.0, 26.4):
        weld_ring(st, "ring", y, R_CORE if y > 3.95 else 1.3, RING, 0.034, 0.012, seg)
    # the shoulder the strap-ons ride on: a thicker ring at 19.2 to 20.0 and four pads with their yokes
    st.add("shoulder", "body", SKIN_D, frustum((0, 19.25, 0), (0, 20.05, 0), R_CORE + 0.035, R_CORE + 0.035, seg, caps=False))
    st.add("shoulder-top", "body", SKIN_D, lib.disc((0, 20.05, 0), UP, R_CORE + 0.035, seg, r_in=R_CORE - 0.01))
    for ang in ring_angles(4, 45):
        a = math.radians(ang)
        n = V(math.cos(a), 0, math.sin(a))
        t = V(-math.sin(a), 0, math.cos(a))
        R = np.column_stack([t, [0, 1, 0], n])
        st.add("pad", "body", BRACE, box(n * (R_CORE + 0.12) + V(0, 19.55, 0), (0.55, 0.75, 0.22), R))
        st.add("yoke", "body", SEAM, merge([box(n * (R_CORE + 0.12) + t * s + V(0, 19.55, 0) + n * 0.08, (0.09, 0.85, 0.2), R) for s in (-0.3, 0.3)]))
    # cable tunnels: two narrow raised strips along the barrel on the sides between the strap-ons
    for ang in (0.0, 180.0):
        a = math.radians(ang)
        n = V(math.cos(a), 0, math.sin(a))
        t = V(-math.sin(a), 0, math.cos(a))
        R = np.column_stack([t, [0, 1, 0], n])
        st.add("tunnel", "body", SKIN_L, box(n * (R_CORE + 0.04) + V(0, 15.0, 0), (0.16, 24.0, 0.09), R))
    # access panels, five a side, and the round ports near the top
    rng = np.random.default_rng(3)
    for k in range(30):
        ang = rng.choice([0, 90, 180, 270]) + rng.uniform(-25, 25)
        y = rng.uniform(4.2, 18.5) if k % 3 else rng.uniform(21, 26)
        hatch_plate(st, "hatch", y, ang, R_CORE, (rng.uniform(0.22, 0.4), rng.uniform(0.25, 0.5)), HATCH if k % 2 else RING, lift=0.026)
    # the hatches of the tail skirt
    for k in range(10):
        ang = 360 * k / 10 + 18
        hatch_plate(st, "tail-hatch", rng.uniform(1.4, 3.0), ang, 1.30, (0.3, 0.4), HATCH, lift=0.026)
    # tail: the engine, four main chambers in a 2 x 2 square and four verniers at the corners, as in the photograph from below
    s = 0.40
    mains = [(s, s), (s, -s), (-s, s), (-s, -s)]
    verns = [(0.0, 1.05), (0.0, -1.05), (1.05, 0.0), (-1.05, 0.0)]
    # the core's engine sits turned 45 degrees to the strap-ons' axes: its chambers point along the cross
    engine_cluster(st, "rd108", 0.0, 0.0, V(1, 0, 0), V(0, 0, 1), Y_CORE_BASE - 0.02, mains, verns, re=0.31, length=0.9)
    # the open lattice between the core and block E: two rings and 24 zig-zag struts, a dark floor
    r0, r1 = R_E + 0.03, R_E
    n = 12
    pts0 = [polar(r0, 360.0 * k / n, Y_TRUSS0) for k in range(n)]
    pts1 = [polar(r1, 360.0 * (k + 0.5) / n, Y_TRUSS1) for k in range(n)]
    rods = []
    for k in range(n):
        rods.append(rod(pts0[k], pts1[k], 0.05, 6))
        rods.append(rod(pts0[(k + 1) % n], pts1[k], 0.05, 6))
    st.add("truss", "body", SKIN_D, merge(rods))
    st.add("truss-ring-lo", "body", SKIN_D, torus((0, Y_TRUSS0, 0), UP, r0, 0.07, 40, 6))
    st.add("truss-ring-hi", "body", SKIN_D, torus((0, Y_TRUSS1, 0), UP, r1, 0.07, 40, 6))
    return st


def build_blok_e():
    st = Stage("blok-e")
    seg = 56
    y0, y1 = Y_E0, Y_E1
    # the hull: 4 bands, a skirt ring below, the cap above
    ys = [y0 + 0.1, 29.2, 30.0, 30.8, y1 - 0.06]
    for k in range(len(ys) - 1):
        st.add("hull", "body", tint_skin(k, 2, 0.03), frustum((0, ys[k], 0), (0, ys[k + 1], 0), R_E, R_E, seg, caps=False))
    st.add("hull-skirt", "body", RING, frustum((0, y0 - 0.02, 0), (0, y0 + 0.16, 0), R_E + 0.016, R_E + 0.016, seg, caps=False))
    st.add("hull-floor", "body", DARK, lib.disc((0, y0 - 0.01, 0), DOWN, R_E, seg))
    st.add("hull-top-ring", "body", RING, frustum((0, y1 - 0.18, 0), (0, y1 + 0.02, 0), R_E + 0.018, R_E + 0.018, seg, caps=False))
    for y in (29.2, 30.0, 30.8):
        weld_ring(st, "ring", y, R_E, RING, 0.03, 0.01, seg)
    st.add("lid", "body", SKIN_D, lib.disc((0, y1 + 0.02, 0), UP, R_E + 0.018, seg))
    # the payload adapter: a short cone the instrument module's flange stands on (inside the shroud)
    st.add("adapter", "body", BRACE, frustum((0, y1 + 0.02, 0), (0, y1 + 0.32, 0), 1.18, 0.98, 48, caps=True))
    # access panels, round ports and the red-ringed fittings of the photographs
    rng = np.random.default_rng(9)
    for k in range(16):
        hatch_plate(st, "hatch", rng.uniform(29.0, 31.2), rng.uniform(0, 360), R_E, (rng.uniform(0.2, 0.36), rng.uniform(0.22, 0.4)), HATCH if k % 2 else RING, lift=0.024)
    for ang in (30.0, 150.0, 270.0):
        a = math.radians(ang)
        n = V(math.cos(a), 0, math.sin(a))
        p = n * R_E + V(0, 30.4, 0)
        st.add("port", "body", BRACE, frustum(p, p + n * 0.035, 0.11, 0.1, 16, caps=True))
        st.add("port-dark", "body", DARK, lib.disc(p + n * 0.037, n, 0.07, 12))
    # the engine RD-0109: a chamber into the hull and the bell hanging into the truss, nozzle exit r 0.40 at y = 27.55
    ye = Y_E0 - 0.1
    st.add("rd0109-chamber", "body", CHAMBER, frustum((0, ye, 0), (0, ye - 0.35, 0), 0.30, 0.16, 18, caps=False))
    st.bell("rd0109", ye - 0.35, 0.10, 0.40, 0.78, NOZ, seg=22, n=8, p=1.7, ribs=2, inner_col=NOZ_IN, wall=0.014)
    # the four steering nozzles round the base of the hull
    for ang in ring_angles(4, 0):
        p = polar(1.02, ang, y0 - 0.02)
        st.add("vernier-mount", "body", BRACE, box(p + V(0, 0.05, 0), (0.16, 0.14, 0.16)))
        st.bell("rd0109-vernier", y0 - 0.06, 0.03, 0.075, 0.34, NOZ, seg=10, n=4, p=1.6, x=p[0], z=p[2], inner_col=NOZ_IN, wall=0.008)
    # the separation ring: a dark band where the hull meets the truss
    st.add("sep-band", "body", DARK, frustum((0, y0 + 0.16, 0), (0, y0 + 0.26, 0), R_E + 0.006, R_E + 0.006, seg, caps=False))
    return st


def build_fairing():
    st = Stage("fairing")
    seg = 56
    R_F = 1.36
    # cylinder in 5 bands and a dark joint ring at the base
    ys = [Y_FAIR0 + 0.14, 32.4, 33.3, 34.2, Y_FAIR_OGIVE]
    for k in range(len(ys) - 1):
        st.add("shroud", "body", tint_skin(k, 2, 0.03), frustum((0, ys[k], 0), (0, ys[k + 1], 0), R_F, R_F, seg, caps=False))
    st.add("joint", "body", DARK, frustum((0, Y_FAIR0 - 0.02, 0), (0, Y_FAIR0 + 0.16, 0), R_F + 0.012, R_F + 0.012, seg, caps=False))
    for y in (32.4, 33.3, 34.2):
        weld_ring(st, "ring", y, R_F, RING, 0.03, 0.01, seg)
    # the ogive: a tangent ogive from r = 1.36 at y = 35.2 to the point at 38.246, as a profile of 14 rings
    L = Y_FAIR1 - Y_FAIR_OGIVE
    rho = (R_F ** 2 + L ** 2) / (2 * R_F)
    prof = []
    n = 14
    for k in range(n + 1):
        x = L * k / n
        r = math.sqrt(max(rho ** 2 - x ** 2, 0.0)) + R_F - rho
        prof.append((Y_FAIR_OGIVE + x, max(r, 0.045)))
    for k in range(n):
        st.add("ogive", "body", shade(SKIN_L, 1 + 0.03 * (1 if k % 2 else -1)), frustum((0, prof[k][0], 0), (0, prof[k + 1][0], 0), prof[k][1], prof[k + 1][1], seg, caps=False))
    st.add("nose", "body", SKIN_D, xf(lib.sphere(V(0, 0, 0), 0.07, 5, 10), None, V(0, Y_FAIR1 - 0.02, 0)))
    # the two halves' seams: a raised strip at 0 and 180 degrees from the base to the nose
    for ang in (0.0, 180.0):
        a = math.radians(ang)
        n_ = V(math.cos(a), 0, math.sin(a))
        t_ = V(-math.sin(a), 0, math.cos(a))
        R = np.column_stack([t_, [0, 1, 0], n_])
        st.add("seam", "body", SEAM, box(n_ * (R_F + 0.012) + V(0, (Y_FAIR0 + Y_FAIR_OGIVE) / 2, 0), (0.05, Y_FAIR_OGIVE - Y_FAIR0, 0.026), R))
        # up the ogive: eight short strips following the profile
        for k in range(n - 2):
            ya, ra = prof[k]
            yb, rb = prof[k + 1]
            st.add("seam", "body", SEAM, rod(n_ * (ra + 0.012) + V(0, ya, 0), n_ * (rb + 0.012) + V(0, yb, 0), 0.02, 4))
    # access panels, the umbilical hatches and the round ports
    rng = np.random.default_rng(21)
    for k in range(14):
        hatch_plate(st, "hatch", rng.uniform(32.0, 35.0), rng.uniform(10, 350), R_F, (rng.uniform(0.2, 0.34), rng.uniform(0.25, 0.4)), HATCH if k % 2 else RING, lift=0.024)
    for ang, y in ((60.0, 33.8), (240.0, 34.4)):
        a = math.radians(ang)
        n_ = V(math.cos(a), 0, math.sin(a))
        p = n_ * R_F + V(0, y, 0)
        st.add("port", "body", BRACE, frustum(p, p + n_ * 0.04, 0.12, 0.11, 16, caps=True))
        st.add("port-dark", "body", DARK, lib.disc(p + n_ * 0.042, n_, 0.075, 12))
    return st


def build():
    veh = Vehicle("r7-8k72k")
    # the four strap-ons, B, V, G, D, on the diagonals
    angs = {"booster-b": 45.0, "booster-v": 135.0, "booster-g": 225.0, "booster-d": 315.0}
    grp = Stage("boosters-4")           # the group node carries no geometry of its own
    veh.add("boosters-4", grp, (0.0, 8.0, 0.0), note="the four strap-on blocks; each is its own child node")
    for nm, ang in angs.items():
        b = build_booster(nm, ang)
        a = math.radians(ang)
        # centre of mass of an empty strap-on: low, where the engine and the tail are (the cone is a thin skin)
        veh.add(nm, b, (D_BOOST * math.cos(a) * 0.93, 8.0, D_BOOST * math.sin(a) * 0.93), child_of="boosters-4")
    veh.add("core-stage", build_core(), (0.0, 13.0, 0.0))
    veh.add("blok-e", build_blok_e(), (0.0, 30.0, 0.0))
    veh.add("fairing", build_fairing(), (0.0, 35.0, 0.0))
    return veh


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "out/r7-8k72k.json"
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    v = build()
    v.export(out, limit=12)
