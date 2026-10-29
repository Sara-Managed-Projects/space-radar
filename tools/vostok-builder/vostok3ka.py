"""vostok-3ka: the Vostok 3KA spacecraft of Gagarin's flight, in two named parts (and a third, the hatch).

  vostok-sm-sphere   the 2.3 m descent sphere (SA): its ablative coat, the entry opening with its flange, the Vzor window,
                     the vent boss, the green strap, the cable runs, the gold-lined cabin seen through the opening
  vostok-hatch       the entry hatch with its porthole and bolts: jettisoned at 7 km, two seconds before the seat
  vostok-antennas    the four hairpin loops and four whips (folded inside the shroud, deployed after it goes)
  vostok-im          the instrument module (PA): the grey drum with its plumbing, the white sensor discs and the sixteen
                     attitude jets, the ring of twelve green nitrogen spheres, the louvred radiator cone, the TDU-1 retro
                     engine.

Metres, +Y up the spacecraft's axis (the sphere on top), the origin on the lower interface of the instrument module (the
plane the launcher's adapter takes it by). Dimensions: sphere 2.3 m, instrument module 2.25 m long and 2.43 m across,
whole 4.4 m long (Wikipedia 'Vostok (spacecraft)'; ru.wikipedia 'Восток (космический корабль)'). Everything else is read off
the full-size copies and the flown capsules named in registry/models.yaml (row vostok-3ka) and is ILLUSTRATIVE in its sizes.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlib import *  # noqa: F401,F403,E402
import lib  # noqa: E402

R_SPH = 1.15                 # the sphere, 2.3 m across
C_SPH = V(0.0, 3.25, 0.0)    # its centre: 4.4 m - 1.15 m
R_DRUM = 1.215               # 2.43 m across
HATCH_AZ, HATCH_EL = 0.0, 32.0     # the entry opening: toward +X, 32 degrees above the equator
VZOR_AZ, VZOR_EL = 180.0, -28.0    # the window at the cosmonaut's feet: the other side, below the equator

# colours: ours, read off the full-size copies (Speyer, Le Bourget, the Memorial Museum) and the flown capsules
COAT = "#8E9296"            # the wrapped grey-silver skin of the sphere (drawn as structure, not foil: the app's crinkle on a 2.3 m ball is a cracked egg)
COAT_REAR = "#6F7378"
COAT_EDGE = "#C8B58E"       # the cut edge of the coat at the opening: pale ablator
GOLD_IN = "#B9974F"         # the cabin's lining, seen through the opening in every flown capsule's photograph
STEEL = "#A9AFB6"
STEEL_D = "#6C737B"
BOLT = "#8A9098"
GREEN = "#3D6C47"           # the nitrogen spheres
STRAP_GREEN = "#4F6F46"
DRUM = "#93A08F"            # the pistachio-grey of the instrument module's drum
DRUM_D = "#7B8777"
WHITE = "#E6E8E6"
LOUVRE = "#A7AEB5"
LOUVRE_D = "#7E858C"
COPPER = "#B87B3F"
CABLE = "#9A5B30"
BLACK = "#25272B"
GLASS = "#1E2C3A"
CREAM = "#D8CFB8"


def sph_dir(az, el):
    a, e = math.radians(az), math.radians(el)
    return V(math.cos(e) * math.cos(a), math.sin(e), math.cos(e) * math.sin(a))


def orient(mesh, ref, outward=True):
    """Flip the whole mesh if its faces mostly look toward `ref` (for a closed shell: reference inside)."""
    Vv, F = mesh
    if len(F) == 0:
        return mesh
    cen = Vv[F].mean(axis=1)
    n = np.cross(Vv[F[:, 1]] - Vv[F[:, 0]], Vv[F[:, 2]] - Vv[F[:, 0]])
    s = np.sum(n * (cen - ref), axis=1)
    s = float(np.sum(np.sign(s)))
    if (s < 0) == outward:
        return Vv, F[:, ::-1].copy()
    return mesh


def hatch_frame(az, el):
    d = sph_dir(az, el)
    return d, basis_about(d)


def to_world(mesh, R, centre=C_SPH):
    """A mesh built about the hatch axis (+Y local, origin at the sphere's centre) put in the spacecraft's frame."""
    return xf(mesh, R, centre)


def sphere_shell(Rr, theta_open, theta_end=180.0, n=26, seg=56, inward=False):
    """A sphere with a round opening, axis +Y local, from polar angle theta_open to theta_end (degrees), faces outward
    (or inward). Profile points are (s along the axis, r)."""
    prof = []
    for k in range(n + 1):
        th = math.radians(theta_open + (theta_end - theta_open) * k / n)
        prof.append((Rr * math.cos(th), Rr * math.sin(th)))
    m = lathe((0, 0, 0), UP, prof, seg)
    m = orient(m, V(0, 0, 0), outward=not inward)
    return m


def build_sphere():
    st = Stage("vostok-sm-sphere")
    d_h, R_h = hatch_frame(HATCH_AZ, HATCH_EL)
    d_v, R_v = hatch_frame(VZOR_AZ, VZOR_EL)
    th_open = math.degrees(math.asin(0.44 / R_SPH))
    # ---- the coat: the outer skin, in bands of slightly different grey (patches of wrapped foil), the rear darker.
    # The shell is cut in `bands` rings of polar angle from the opening round to the far pole.
    th0 = th_open
    ths = [th0 + (180.0 - th0) * k / 8 for k in range(9)]
    tint = [1.0, 1.03, 0.98, 1.02, 0.95, 0.91, 0.86, 0.80]
    for k in range(8):
        sub = sphere_shell(R_SPH, ths[k], ths[k + 1], n=4, seg=60)
        c = shade(COAT, tint[k])
        st.add("coat", "body", c, to_world(sub, R_h))
    # the wrapped tape's seams: 18 meridians of the wrap from the opening's flange to the far pole, and four parallels
    seams = []
    for g in range(12):
        az = 2 * math.pi * g / 12
        pts = []
        for k in range(9):
            th = math.radians(th_open + 12 + (168.0 - th_open - 12) * k / 8)
            rr = R_SPH + 0.005
            pts.append(V(rr * math.sin(th) * math.cos(az), rr * math.cos(th), rr * math.sin(th) * math.sin(az)))
        seams.append(tube(pts, 0.006, 3))
    for thd in (50.0, 80.0, 112.0, 142.0):
        th = math.radians(thd)
        rr = R_SPH + 0.005
        seams.append(torus(V(0, rr * math.cos(th), 0), UP, rr * math.sin(th), 0.006, 40, 3))
    st.add("coat-seams", "body", shade(COAT, 0.84), to_world(merge(seams), R_h))
    # the rim of the opening: the coat's cut edge, then the collar going into the cabin
    rim_out = (R_SPH * math.cos(math.radians(th_open)), R_SPH * math.sin(math.radians(th_open)))
    R_IN = 1.07
    th_in = math.degrees(math.asin(0.40 / R_IN))
    rim_in = (R_IN * math.cos(math.radians(th_in)), R_IN * math.sin(math.radians(th_in)))
    edge = lathe((0, 0, 0), UP, [rim_in, rim_out], 56)
    edge = orient(edge, V(0, 0, 0), outward=True)
    st.add("coat-edge", "body", COAT_EDGE, to_world(edge, R_h))
    # the cabin: the lining, facing in, with the opening's collar
    cab = sphere_shell(R_IN, th_in, 180.0, n=16, seg=48, inward=True)
    st.add("cabin", "body", GOLD_IN, to_world(cab, R_h))
    # ---- the flange ring round the opening (bare metal, 36 bolts) and a second, wider ring of the coat's edge
    fl = lathe((0, 0, 0), UP, [(rim_out[0] - 0.012, 0.40), (rim_out[0] + 0.045, 0.40), (rim_out[0] + 0.045, 0.505),
                                 (rim_out[0] + 0.02, 0.56), (rim_out[0] - 0.02, 0.60)], 56)
    fl = orient(fl, V(0, rim_out[0] + 0.01, 0), outward=True)
    st.add("flange", "body", STEEL, to_world(fl, R_h))
    st.add("flange-bolts", "body", BOLT, to_world(bolt_ring((0, rim_out[0] + 0.04, 0), UP, 0.455, 36, 0.011, 0.014, ref=(1, 0, 0), seg=6), R_h))
    # the inside lip, a steel ring just inside the opening
    lip = lathe((0, 0, 0), UP, [(rim_in[0] - 0.08, 0.40), (rim_in[0] + 0.01, 0.40)], 56)
    st.add("lip", "body", STEEL_D, to_world(lip, R_h))
    # ---- the cabin's furnishings that show through the opening: the control panel, the globe, the Vzor mirror
    panel_c = V(0.0, 0.78, -0.20)        # in hatch-local coords: below the opening, on the side toward the feet
    st.add("panel", "body", "#2D3036", to_world(box(panel_c, (0.34, 0.07, 0.24), None), R_h))
    st.add("panel-face", "body", "#8E9390", to_world(box(panel_c + V(0.0, 0.04, 0.0), (0.30, 0.012, 0.20), None), R_h))
    for k in range(5):
        a = 2 * math.pi * k / 5
        c = panel_c + V(0.07 * math.cos(a), 0.05, 0.05 * math.sin(a))
        st.add("dial", "body", "#D7D9D3", to_world(frustum(c, c + V(0, 0.012, 0), 0.028, 0.028, 10, caps=True), R_h))
    st.add("globe", "body", "#6B7A86", to_world(lib.sphere(V(0.18, 0.72, 0.12), 0.07, 6, 10), R_h))
    st.add("cabinet", "body", "#2A2D31", to_world(box(V(-0.30, 0.74, 0.0), (0.18, 0.12, 0.46), None), R_h))
    # ---- the Vzor window at the cosmonaut's feet: a bezel and its glass, the cover over it left open
    vz = lathe((0, 0, 0), UP, [(R_SPH - 0.04, 0.0), (R_SPH + 0.0, 0.0)], 4)
    for (r_in, r_out, h, col, nm) in ((0.0, 0.165, 0.030, STEEL, "vzor-bezel"),):
        pass
    c0 = V(0.0, R_SPH, 0.0)
    st.add("vzor-bezel", "body", STEEL, to_world(frustum(c0 - V(0, 0.02, 0), c0 + V(0, 0.032, 0), 0.19, 0.17, 32, caps=False), R_v))
    st.add("vzor-bezel-top", "body", STEEL, to_world(lib.disc(c0 + V(0, 0.032, 0), UP, 0.17, 32, r_in=0.125), R_v))
    st.add("vzor-glass", "body", GLASS, to_world(lib.disc(c0 + V(0, 0.012, 0), UP, 0.125, 32), R_v))
    st.add("vzor-bolts", "body", BOLT, to_world(bolt_ring(c0 + V(0, 0.03, 0), UP, 0.15, 12, 0.008, 0.01, ref=(1, 0, 0), seg=5), R_v))
    # ---- the vent boss at the pole: a dark ring and boss (sa16: the hole at the top)
    c0 = V(0.0, R_SPH, 0.0)
    R_top = np.eye(3)
    st.add("vent", "body", BLACK, xf(frustum(c0 - V(0, 0.01, 0), c0 + V(0, 0.03, 0), 0.11, 0.095, 24, caps=True), None, C_SPH))
    st.add("vent-ring", "body", STEEL_D, xf(lib.torus(c0 + V(0, 0.028, 0), UP, 0.105, 0.012, 24, 5), None, C_SPH))
    # ---- the green strap: a great circle through the poles, a little off the hatch's meridian; two bands of the same
    for az, w in ((90.0, 0.075), (270.0, 0.05)):
        pts = []
        n = 56
        parts = []
        for k in range(n):
            a0 = math.radians(-70 + 250.0 * k / n)
            a1 = math.radians(-70 + 250.0 * (k + 1) / n)
            rr = R_SPH + 0.006
            def pt(a, off):
                p = V(rr * math.cos(a), rr * math.sin(a), off)
                # lean the circle: rotate about the vertical by az
                return C_SPH + rot("y", -az) @ p
            # a flat ribbon: two triangles per step, width w along the circle's axis
            def bandpt(a, off):
                p = V(math.cos(a) * math.sqrt(max(rr * rr - off * off, 1e-6)), math.sin(a) * math.sqrt(max(rr * rr - off * off, 1e-6)), off)
                return C_SPH + rot("y", -az) @ p
            P = np.array([bandpt(a0, -w / 2), bandpt(a1, -w / 2), bandpt(a1, w / 2), bandpt(a0, w / 2)])
            parts.append((P, np.array([[0, 1, 2], [0, 2, 3]])))
        m = orient(merge(parts), C_SPH, outward=True)
        st.add("strap", "body", STRAP_GREEN, m)
    # the flat silver strap with its slots, up the +Z side from the drum to the equator (sa22): a plate and its rungs
    sp = []
    for k in range(7):
        a = math.radians(-62 + 11 * k)
        p = C_SPH + V(0.18, 0, 0) * 0 + (R_SPH + 0.02) * V(0.0, math.sin(a), math.cos(a)) * 1.0
        sp.append(p)
    n_s = unit(V(0, 0, 1))
    st.add("ladder", "body", STEEL, merge([box(sp[k], (0.13, 0.15, 0.012), basis_about(unit(sp[k] - C_SPH))) for k in range(7)]))
    # the cable runs (orange-brown woven sleeving) over the sphere to the bottles
    for az in (-18.0, 20.0):
        pts = []
        for k in range(9):
            a = math.radians(-70 + 9.5 * k)
            pts.append(C_SPH + rot("y", -az) @ V(0, (R_SPH + 0.018) * math.sin(a), (R_SPH + 0.018) * math.cos(a)))
        st.add("cable", "body", CABLE, tube(pts, 0.012, 5))
    return st


def build_hatch():
    st = Stage("vostok-hatch")
    d_h, R_h = hatch_frame(HATCH_AZ, HATCH_EL)
    th_open = math.degrees(math.asin(0.44 / R_SPH))
    s0 = R_SPH * math.cos(math.radians(th_open))
    # the lid: a shallow dish following the sphere, a little proud of the opening's flange
    prof = []
    n = 10
    for k in range(n + 1):
        r = 0.58 * k / n
        s = math.sqrt(max((R_SPH + 0.06) ** 2 - r * r, 0.0))
        prof.append((s, r))
    prof = prof[::-1]       # from the rim to the centre
    lid = lathe((0, 0, 0), UP, prof, 56)
    lid = orient(lid, V(0, 0, 0), outward=True)
    st.add("lid", "body", shade(COAT, 1.04), to_world(lid, R_h))
    # the rim: a steel skirt under the lid's edge and the ring of 36 bolts
    top = math.sqrt((R_SPH + 0.06) ** 2 - 0.58 ** 2)
    st.add("rim", "body", STEEL, to_world(lathe((0, 0, 0), UP, [(top - 0.045, 0.58), (top + 0.004, 0.58)], 56), R_h))
    st.add("rim-top", "body", STEEL, to_world(lib.disc(V(0, top + 0.004, 0), UP, 0.58, 56, r_in=0.535), R_h))
    st.add("bolts", "body", BOLT, to_world(bolt_ring((0, top + 0.006, 0), UP, 0.56, 36, 0.012, 0.014, ref=(1, 0, 0), seg=6), R_h))
    # the porthole at its centre: a steel ring, the glass and a pale reflector ring
    s_c = R_SPH + 0.06
    st.add("port-ring", "body", STEEL, to_world(lib.torus(V(0, s_c + 0.01, 0), UP, 0.135, 0.022, 28, 6), R_h))
    st.add("port-glass", "body", GLASS, to_world(lib.disc(V(0, s_c + 0.005, 0), UP, 0.125, 28), R_h))
    st.add("port-seal", "body", STEEL_D, to_world(lib.disc(V(0, s_c + 0.002, 0), UP, 0.19, 28, r_in=0.14), R_h))
    # latches: six lugs on the lid's skirt
    lugs = []
    for k in range(6):
        a = 2 * math.pi * k / 6 + 0.26
        p = V(0.62 * math.cos(a), top - 0.03, 0.62 * math.sin(a))
        lugs.append(box(p, (0.07, 0.05, 0.05), rot("y", -math.degrees(a))))
    st.add("lugs", "body", STEEL_D, to_world(merge(lugs), R_h))
    return st


def build_im():
    st = Stage("vostok-im")
    # ---- the TDU-1 retro engine and its housing (bottom)
    st.add("tdu-ring", "body", STEEL_D, lib.torus(V(0, 0.30, 0), UP, 0.45, 0.025, 36, 6))
    # the nozzle: a bell hanging from y = 0.66 to the exit at y = 0.0, inside the cone's mouth
    st.bell("tdu", 0.66, 0.07, 0.30, 0.66, "#7A7F86", seg=32, n=12, p=1.7, ribs=3, inner_col="#34373C")
    st.add("tdu-flange", "body", STEEL, lathe((0, 0, 0), UP, [(0.0, 0.31), (0.03, 0.34), (0.07, 0.34)], 32))
    # four legs holding it to the cone's mouth
    for ang in ring_angles(4, 45):
        a = polar(0.33, ang, 0.03)
        b = polar(0.44, ang, 0.30)
        st.add("tdu-leg", "body", STEEL_D, rod(a, b, 0.018, 5))
    # ---- the radiator cone: 24 louvred panels between 24 ribs, from the mouth (r 0.46) to the drum (r 1.215)
    y_c0, y_c1, r_c0, r_c1 = 0.30, 1.50, 0.46, 1.205
    n_pan = 24
    pans, ribs = [], []
    for k in range(n_pan):
        a0 = 2 * math.pi * k / n_pan
        a1 = 2 * math.pi * (k + 1) / n_pan
        am = (a0 + a1) / 2
        # a louvred panel: a shallow inward step (a dish) split in 5 louvre slats down the slope
        for j in range(5):
            t0, t1 = j / 5, (j + 1) / 5
            ra, rb = r_c0 + (r_c1 - r_c0) * t0, r_c0 + (r_c1 - r_c0) * t1
            ya, yb = y_c0 + (y_c1 - y_c0) * t0, y_c0 + (y_c1 - y_c0) * t1
            # each slat's lower edge stands out a little (a lip), its upper edge is tucked in: a stepped surface
            def P(r, y, a, o):
                return [(r + o) * math.cos(a), y, (r + o) * math.sin(a)]
            mid = (a0 * 0.5 + a1 * 0.5)
            pts = [P(ra, ya, a0 + 0.02, 0.012), P(ra, ya, a1 - 0.02, 0.012), P(rb, yb, a1 - 0.02, -0.006), P(rb, yb, a0 + 0.02, -0.006)]
            pans.append((np.array(pts), np.array([[0, 2, 1], [0, 3, 2]]) if False else np.array([[0, 1, 2], [0, 2, 3]])))
        pass
    cone_base = frustum((0, y_c0, 0), (0, y_c1, 0), r_c0 - 0.02, r_c1 - 0.02, n_pan * 2, caps=False)
    st.add("cone-core", "body", LOUVRE_D, cone_base)
    # slats as thin strips on the cone: built as small frusta sections (one per louvre row), 48 segments each
    for j in range(8):
        t0, t1 = (j + 0.08) / 8, (j + 0.92) / 8
        ra, rb = r_c0 + (r_c1 - r_c0) * t0, r_c0 + (r_c1 - r_c0) * t1
        ya, yb = y_c0 + (y_c1 - y_c0) * t0, y_c0 + (y_c1 - y_c0) * t1
        st.add("louvre", "body", LOUVRE if j % 2 == 0 else shade(LOUVRE, 0.9), frustum((0, ya, 0), (0, yb, 0), ra + 0.012, rb + 0.004, n_pan * 2, caps=False))
    for k in range(n_pan):
        a = 360.0 * k / n_pan
        p0, p1 = polar(r_c0, a, y_c0), polar(r_c1, a, y_c1)
        ribs.append(rod(p0 * 1.0, p1 * 1.0, 0.016, 4))
    st.add("cone-ribs", "body", STEEL, merge(ribs))
    # ---- the drum: y 1.50 to 2.06, r 1.215, grey-green in six panels, a seam ring at each end
    st.add("drum-lower-ring", "body", STEEL, frustum((0, 1.47, 0), (0, 1.53, 0), R_DRUM + 0.012, R_DRUM + 0.012, 72, caps=False))
    panel_lathe(st, "drum", 1.50, 2.06, R_DRUM, R_DRUM, DRUM, n_panels=6, tint=0.035, seg=72)
    st.add("drum-top-ring", "body", STEEL, frustum((0, 2.04, 0), (0, 2.09, 0), R_DRUM + 0.01, R_DRUM + 0.01, 72, caps=False))
    st.add("drum-top", "body", DRUM_D, lib.disc((0, 2.09, 0), UP, R_DRUM + 0.01, 72))
    st.add("drum-bottom", "body", DRUM_D, lib.disc((0, 1.47, 0), DOWN, R_DRUM + 0.01, 72))
    # collar under the sphere: a perforated ring (sa23), 36 dark holes
    st.add("collar", "body", STEEL, frustum((0, 2.09, 0), (0, 2.20, 0), 0.98, 0.90, 48, caps=False))
    holes = []
    for k in range(36):
        a = 360.0 * k / 36
        p = polar(0.955, a, 2.145)
        n = polar(1.0, a, 0)
        holes.append(frustum(p, p + unit(V(math.cos(math.radians(a)), 0.3, math.sin(math.radians(a)))) * 0.01, 0.018, 0.018, 6, caps=True))
    st.add("collar-holes", "body", BLACK, merge(holes))
    # ---- the twelve nitrogen spheres: r 0.17 at radius 1.04, y 2.26, in two crossing steel straps each
    for k in range(12):
        a = 360.0 * (k + 0.5) / 12
        c = polar(1.02, a, 2.27)
        st.add("bottle", "body", GREEN, lib.sphere(c, 0.175, 8, 14))
        # straps: two crossing rings, one in the vertical plane through the axis, one horizontal
        ar = math.radians(a)
        radial = V(math.cos(ar), 0, math.sin(ar))
        tang = V(-math.sin(ar), 0, math.cos(ar))
        st.add("bottle-strap", "body", STEEL, merge([
            lib.torus(c, UP, 0.176, 0.008, 18, 4),
            lib.torus(c, tang, 0.176, 0.008, 18, 4)]))
        st.add("bottle-valve", "body", STEEL_D, frustum(c + radial * 0.15, c + radial * 0.22, 0.035, 0.03, 8, caps=True))
    # ---- the plumbing on the drum: pipes, valve blocks, the white sensor discs, the jets
    rng = np.random.default_rng(5)
    for ang, y, w, h, col in ((20, 1.80, 0.20, 0.12, STEEL_D), (80, 1.72, 0.16, 0.14, STEEL), (140, 1.84, 0.22, 0.10, STEEL_D),
                              (200, 1.74, 0.18, 0.13, STEEL), (260, 1.80, 0.26, 0.12, STEEL_D), (320, 1.70, 0.15, 0.15, STEEL)):
        hatch_plate(st, "hatch", y, ang, R_DRUM, (w, h), col, lift=0.02)
    for ang in (40.0, 160.0, 280.0):
        # a white disc on the drum's side: the optical sensor's window with a steel ring
        a = math.radians(ang)
        n = V(math.cos(a), 0, math.sin(a))
        c = n * (R_DRUM + 0.002) + V(0, 1.78, 0)
        st.add("sensor-disc", "body", WHITE, lib.disc(c + n * 0.022, n, 0.165, 28))
        st.add("sensor-ring", "body", STEEL, frustum(c - n * 0.004, c + n * 0.024, 0.19, 0.18, 28, caps=False))
        st.add("sensor-ring-top", "body", STEEL, lib.disc(c + n * 0.024, n, 0.18, 28, r_in=0.162))
    # pipes: eighteen runs, mostly vertical with a jog, silver and copper
    for k in range(20):
        a = rng.uniform(0, 360)
        y0 = rng.uniform(1.58, 1.80)
        L = rng.uniform(0.14, 0.34)
        a2 = a + rng.uniform(-9, 9)
        r = R_DRUM + 0.012
        pts = [polar(r, a, y0), polar(r + 0.014, a, y0 + L * 0.5), polar(r + 0.014, a2, y0 + L), polar(r, a2, y0 + L + 0.04)]
        st.add("pipe", "body", COPPER if k % 3 == 0 else STEEL, tube(pts, 0.008, 5))
    # valve blocks and brackets
    for k in range(16):
        a = rng.uniform(0, 360)
        y = rng.uniform(1.58, 1.98)
        st.add("valve", "body", STEEL_D if k % 2 else STEEL, box(polar(R_DRUM + 0.03, a, y), (0.07, 0.06, 0.05), rot("y", -a)))
        st.add("valve-cyl", "body", STEEL, frustum(polar(R_DRUM + 0.035, a, y) + V(0, 0.03, 0), polar(R_DRUM + 0.035, a, y) + V(0, 0.09, 0), 0.016, 0.016, 8, caps=True))
    # sixteen jets (8 pods of 2) round the lower edge of the drum, each a small cone
    for k in range(8):
        a = 360.0 * (k + 0.5) / 8
        n = polar(1.0, a, 0)
        t = V(-math.sin(math.radians(a)), 0, math.cos(math.radians(a)))
        base = polar(R_DRUM + 0.01, a, 1.60)
        st.add("jet-pod", "body", STEEL_D, box(base + n * 0.03, (0.14, 0.07, 0.06), rot("y", -a)))
        for s in (-0.04, 0.04):
            st.add("jet", "body", BLACK, frustum(base + t * s + n * 0.05, base + t * s + n * 0.12 + V(0, -0.02, 0), 0.016, 0.035, 8, caps=True))
    # brackets where the four sphere straps land on the drum's top
    for ang in ring_angles(4, 0):
        st.add("lug", "body", STEEL, box(polar(1.0, ang, 2.13), (0.12, 0.10, 0.10), rot("y", -ang)))
    return st


def build_antennas():
    st = Stage("vostok-antennas")
    # four hairpin loops standing on the sphere's shoulder (from the full-size copies: tall thin U's, a little outward), and four
    # long whips from bases lower on the sphere, as the photographs of the Le Bourget and Speyer copies show them
    for k, ang in enumerate(ring_angles(4, 45)):
        a = math.radians(ang)
        out = V(math.cos(a), 0, math.sin(a))
        th = math.radians(40.0)
        n = V(math.sin(th) * math.cos(a), math.cos(th), math.sin(th) * math.sin(a))
        base = C_SPH + n * (R_SPH - 0.01)
        st.add("ant-base", "body", STEEL_D, frustum(base - n * 0.03, base + n * 0.06, 0.04, 0.03, 10, caps=True))
        d = unit(n * 0.85 + V(0, 0.55, 0))
        side = V(-math.sin(a), 0, math.cos(a))
        p0 = base + n * 0.05
        p1 = p0 + d * 0.78
        pts_a = [p0 + side * 0.05, p1 + side * 0.05, p1 + d * 0.09 + side * 0.016, p1 + d * 0.09 - side * 0.016, p1 - side * 0.05, p0 - side * 0.05]
        st.add("hairpin", "body", STEEL, tube(pts_a, 0.0125, 5))
    for k, ang in enumerate(ring_angles(4, 0)):
        a = math.radians(ang)
        out = V(math.cos(a), 0, math.sin(a))
        th = math.radians(78.0)
        n = V(math.sin(th) * math.cos(a), math.cos(th), math.sin(th) * math.sin(a))
        base = C_SPH + n * (R_SPH - 0.01)
        d = unit(n * 0.9 + V(0, 0.25, 0))
        st.add("whip-base", "body", STEEL_D, frustum(base - n * 0.03, base + n * 0.07, 0.035, 0.025, 10, caps=True))
        st.add("whip", "body", STEEL, rod(base, base + d * 1.6, 0.012, 5))
    return st


def build():
    veh = Vehicle("vostok-3ka")
    sph = build_sphere()
    hat = build_hatch()
    im = build_im()
    # origins: the part's centre of mass, roughly (metres, the spacecraft's frame)
    veh.add("vostok-im", im, (0.0, 1.35, 0.0))
    veh.add("vostok-sm-sphere", sph, tuple(C_SPH))
    d_h = sph_dir(HATCH_AZ, HATCH_EL)
    veh.add("vostok-antennas", build_antennas(), (0.0, 3.4, 0.0))
    veh.add("vostok-hatch", hat, tuple(C_SPH + d_h * (R_SPH + 0.03)))
    return veh


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "out/vostok-3ka.json"
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    v = build()
    v.export(out)
