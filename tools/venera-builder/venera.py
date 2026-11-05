"""venera-builder: the Venera 9 and 10 landers, as they stand on Venus (release 1.9.0, batch E, internal #1076).

One model, `venera-9`, a tree of one NAMED PART, on the part-aware builder of release 1.5.0 (tools/vostok-builder/vlib.py, on the
part library of tools/stage-builder). Metres, +Y up the lander's axis, the origin on the ground under the middle of the landing ring.
Venera 10 is the same design (the sites say so: registry/landing-sites-1-5.yaml 'Landed three days after its twin'), so the file is
routed to both.

WHAT IS PUBLISHED AND WHAT IS READ OFF A PICTURE.
  * Published (Schroeder, Bayandor and Samareh, 'Impact and crashworthiness characteristics of Venera type landers for future Venus
    missions', AIAA, NASA NTRS 20170002533, read 2026-11-05): the lander is the payload module (a ball about one metre across with an
    80 cm pressure vessel inside it), 18 legs, a hollow metal ring (a torus with holes in its skin) that crushes on landing, a
    drag plate and a parachute capsule; it entered in a 2.4 m sphere. Wikipedia, 'Venera 9': the ring-shaped aerodynamic shield and
    the crushable doughnut-shaped landing cushion, two camera lens covers, the instrument list. The paper's own preliminary design
    puts the ring's radius at 0.9 m and the payload 0.65 m above it.
  * Read off the photographs of the 1:1 replica in the Tsiolkovsky Museum, Kaluga (Stolbovsky, 'Venera 9 Space Probe 01' and '02',
    CC BY 4.0; DonSimon, 'Kaluga Wikiexpedition (2016-06-11) 0139', CC BY 4.0) against the ball's one metre and the 2.4 m shell the
    whole stands in: the ring 1.8 m across (the paper's 0.9 m radius, and the picture agrees), the drag plate 2.2 m (it must go in
    the 2.4 m shell), the cylinder 0.84 m across and 0.6 m tall, the whole 2.0 m high. Every other size is OURS, read off those
    pictures, to about ten per cent. The Moscow replica (Alexxx1979, CC BY-SA) and the Venera 12 cut-away (US Navy, public domain)
    were looked at only.
  * NO LETTERING, flag or badge is drawn (the replicas carry red lettering round the belt; the belt is plain here).
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vostok-builder"))
from vlib import *  # noqa: F401,F403,E402
import lib  # noqa: E402

# colours (sRGB hex), read off the photographs of the replica
STEEL = "#BDC2C8"        # the lower shell's polished steel
STEEL_D = "#8C939B"
STEEL_L = "#D5D9DD"
CREAM = "#E4DABC"        # the upper shell's paint
CREAM_D = "#CFC29B"
CREAM_L = "#EEE6CF"
BROWN = "#7B4B2E"        # the copper-brown ribs of the cylinder
BRASS = "#A98A4C"        # rivet heads
BLACK = "#1B1D20"
CABLE = "#34383E"
GLASS = "#9FB2B8"
ALU = "#B4B8B6"          # the drag plate's face

SEG = 72
YC, A_L, B_L = 0.72, 0.545, 0.60     # the lower shell: an ellipsoid, centre height and its two half-axes
Y_BOT = YC - B_L                     # 0.12: the shell's lowest point, above the ring's underside
Y_BELT0, Y_BELT1 = 0.80, 0.93        # the plain belt where the replica carries its lettering
Y_NECK = 1.22                        # where the shell has narrowed to the neck
R_NECK = 0.42
Y_DISC = 1.32                        # the drag plate's middle
R_DISC = 1.10                        # 2.2 m across
Y_CYL0, Y_CYL1 = 1.37, 1.97          # the cylinder's foot and top
R_CYL = 0.42
R_RING = 0.90                        # 1.8 m across


def r_low(y):
    """The lower shell's radius at height y (an ellipsoid up to the belt)."""
    t = (y - YC) / B_L
    return A_L * math.sqrt(max(0.0, 1.0 - t * t))


def rev(poly, seg=SEG, open_=False):
    """A solid of revolution about +Y from a closed polygon of (r, y) points, counter-clockwise (outer wall up, top inward,
    inner wall down, underside outward), so that every face looks out."""
    pts = [(y, r) for r, y in poly]
    if not open_:
        pts.append(pts[0])
    return lib.lathe((0, 0, 0), (0, 1, 0), pts, seg)


def skin(prof, seg=SEG):
    """An open surface of revolution from (y, r) points with y rising: faces outward."""
    return lib.lathe((0, 0, 0), (0, 1, 0), [(y, r) for y, r in prof], seg)


def sector(prof, a0, a1, nseg=6):
    """A patch of a surface of revolution: `prof` = [(y, r), ...] with y rising, angles a0..a1 degrees."""
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


def az(a_deg, r, y):
    a = math.radians(a_deg)
    return V(r * math.cos(a), y, r * math.sin(a))


def out(a_deg):
    a = math.radians(a_deg)
    return V(math.cos(a), 0, math.sin(a))


def frame_at(a_deg):
    """Rotation whose columns are the tangent, up and outward directions at azimuth a."""
    n = out(a_deg)
    t = V(-math.sin(math.radians(a_deg)), 0, math.cos(math.radians(a_deg)))
    return np.column_stack([t, [0, 1, 0], n])


def rivet(c, n, r=0.0085, h=0.006):
    n = unit(n)
    return frustum(c, c + n * h, r, 0.0, 4, caps=True)


def rivet_row(st, label, y, r, count, a0=0.0, col=BRASS, skip=None):
    parts = []
    for k in range(count):
        a = a0 + 360.0 * k / count
        if skip and skip(a):
            continue
        parts.append(rivet(az(a, r - 0.002, y), out(a)))
    st.add(label, "body", col, merge(parts))


def build_ring(st):
    """The landing ring: a hollow metal torus with a rolled steel rim, a cream top flange with a ring of rivets, and a dark inner wall."""
    # the cross-section, counter-clockwise: the rolled outer rim up, the flat top inward, the inner wall down, the underside out
    rim = [(0.80, 0.0), (0.86, 0.006), (0.895, 0.03), (0.905, 0.07), (0.895, 0.11), (0.875, 0.135)]
    st.add("ring-rim", "body", STEEL, skin([(y, r) for r, y in rim]))
    st.add("ring-top", "body", CREAM, lib.lathe((0, 0, 0), (0, 1, 0), [(0.138, 0.875), (0.150, 0.84), (0.153, 0.66)], SEG))
    st.add("ring-top-under", "body", CREAM_D, lib.lathe((0, 0, 0), (0, 1, 0), [(0.153, 0.66), (0.0, 0.66)], SEG))
    st.add("ring-inner", "body", STEEL_D, lib.lathe((0, 0, 0), (0, 1, 0), [(0.0, 0.66), (0.153, 0.66)], SEG))
    st.add("ring-floor", "body", STEEL_D, lib.disc((0, 0.006, 0), (0, 1, 0), 0.80, SEG, r_in=0.60))
    # the rivet circle on the flange and the bolt ring just inside it
    rivet_row(st, "ring-rivets", 0.150, 0.80, 90, 1.5, BRASS)
    parts = []
    for k in range(60):
        a = 360.0 * k / 60
        parts.append(rivet(az(a, 0.70, 0.153), (0, 1, 0), 0.008, 0.005))
    st.add("ring-bolts", "body", STEEL_L, merge(parts))
    # the rim's own rivet row and the lip's holes (the paper: holes in the shell so the gas can leave when it crushes)
    parts = []
    for k in range(48):
        a = 360.0 * k / 48 + 3.75
        p = az(a, 0.896, 0.075)
        parts.append(frustum(p - out(a) * 0.004, p + out(a) * 0.002, 0.012, 0.012, 6, caps=True))
    st.add("ring-holes", "body", BLACK, merge(parts))
    # the web braces under the flange, between the ring and the inner wall
    parts = []
    for k in range(18):
        a = 360.0 * k / 18 + 10
        parts.append(box(tuple(az(a, 0.78, 0.075)), (0.17, 0.12, 0.012), frame_at(a)))
    st.add("ring-ribs", "body", STEEL_D, merge(parts))


def build_shell(st):
    """The ball: a polished steel lower shell in riveted panels with straps over its joints, a plain cream belt, a cream upper shell
    narrowing to the neck, and the legs."""
    # the lower pole cap, cream (the bottom shows under the ring in the photographs)
    cap = [(Y_BOT + 0.0, 0.0)] + [(YC - B_L * math.cos(math.radians(a)), A_L * math.sin(math.radians(a))) for a in (12, 24, 36)]
    st.add("shell-pole", "body", CREAM_D, skin(cap))
    # the steel: six panels of the ellipsoid from 36 degrees off the pole up to the belt, each a shade apart
    lat = [36, 48, 60, 72, 84, 90]
    prof = [(YC - B_L * math.cos(math.radians(a)), A_L * math.sin(math.radians(a))) for a in lat]
    prof = [(y, r) for y, r in prof if y <= Y_BELT0 - 0.02]
    prof.append((Y_BELT0, r_low(Y_BELT0) - 0.001))
    for k in range(6):
        col = shade(STEEL, (1.04, 0.96, 1.0, 0.93, 1.05, 0.98)[k])
        st.add("shell-steel", "body", col, sector(prof, 60 * k + 1.2, 60 * (k + 1) - 1.2, 8))
    # the dark gaps between panels
    st.add("shell-seams", "body", STEEL_D, skin([(y, r - 0.006) for y, r in prof]))
    # the belt: plain cream, where the replica has its lettering
    st.add("belt", "body", CREAM, skin([(Y_BELT0 - 0.004, r_low(Y_BELT0) + 0.002), (0.86, 0.543), (Y_BELT1, 0.535)]))
    st.add("belt-lip", "body", STEEL_L, frustum((0, Y_BELT0 - 0.012, 0), (0, Y_BELT0 + 0.014, 0), r_low(Y_BELT0) + 0.006, r_low(Y_BELT0) + 0.006, SEG, caps=False))
    # the upper shell: the belt's curve in to the neck, then the neck
    up = [(Y_BELT1, 0.535), (0.98, 0.525), (1.03, 0.50), (1.08, 0.47), (1.13, 0.446), (1.18, 0.43), (Y_NECK, R_NECK), (Y_DISC - 0.03, R_NECK)]
    st.add("shell-upper", "body", CREAM, skin(up))
    st.add("belt-rib", "body", CREAM_D, frustum((0, Y_BELT1 - 0.008, 0), (0, Y_BELT1 + 0.008, 0), 0.541, 0.541, SEG, caps=False))
    # the steel horizontal seams and their rivets
    for y in (0.48, 0.64):
        st.add("seam-band", "body", STEEL_L, frustum((0, y - 0.012, 0), (0, y + 0.012, 0), r_low(y) + 0.004, r_low(y) + 0.004, SEG, caps=False))
        rivet_row(st, "seam-rivets", y + 0.026, r_low(y + 0.026) + 0.002, 72, 0.0)
        rivet_row(st, "seam-rivets", y - 0.026, r_low(y - 0.026) + 0.002, 72, 2.5)
    rivet_row(st, "belt-rivets", Y_BELT0 + 0.028, 0.5405, 54, 0.0)
    # eighteen straps over the joints, a flat bar from the belt down to a leg bracket
    parts, brackets = [], []
    for k in range(18):
        a = 20.0 * k + 10.0
        y0, y1 = 0.30, Y_BELT0 + 0.006
        # a strap hugs the ellipsoid: a thin box segmented in three
        ys = np.linspace(y0, y1, 4)
        for ya, yb in zip(ys[:-1], ys[1:]):
            ra, rb = r_low(ya) + 0.006, r_low(yb) + 0.006
            pa, pb = az(a, ra, ya), az(a, rb, yb)
            mid = (pa + pb) / 2
            d = pb - pa
            parts.append(box(tuple(mid), (0.062, float(np.linalg.norm(d)) * 1.04, 0.010), _strap_frame(a, d)))
        # the leg bracket: where the strap meets the leg, a small lug with a bolt
        brackets.append(az(a, r_low(0.34) + 0.012, 0.34))
    st.add("straps", "body", STEEL_L, merge(parts))
    return brackets


def _strap_frame(a_deg, d):
    """Rotation for a thin plate lying on the shell: columns = across (tangent), along d, normal."""
    n0 = out(a_deg)
    t = V(-math.sin(math.radians(a_deg)), 0, math.cos(math.radians(a_deg)))
    along = unit(d)
    n = unit(np.cross(t, along))
    if np.dot(n, n0) < 0:
        n = -n
    return np.column_stack([t, along, n])


def build_legs(st, brackets):
    """Eighteen legs: a steel tube from a lug on the shell down and out to a triangular bracket on the ring."""
    tubes, lugs, feet, bolts = [], [], [], []
    for k, b in enumerate(brackets):
        a = 20.0 * k + 10.0
        top = az(a, r_low(0.40) + 0.02, 0.40)
        foot = az(a, 0.775, 0.156)
        tubes.append(rod(top, foot, 0.030, 8))
        lugs.append(lib.sphere(top, 0.042, 4, 8))
        # the shoe where the tube meets the ring: a small wedge of steel and the ring's gusset
        feet.append(box(tuple(foot + V(0, 0.012, 0)), (0.07, 0.03, 0.09), frame_at(a)))
        bolts.append(frustum(foot + V(0, 0.026, 0), foot + V(0, 0.040, 0), 0.016, 0.014, 8, caps=True))
        # a collar a third of the way down
        mid = top + (foot - top) * 0.38
        tubes.append(frustum(mid - unit(foot - top) * 0.025, mid + unit(foot - top) * 0.025, 0.040, 0.040, 10, caps=True))
    st.add("legs", "body", STEEL, merge(tubes))
    st.add("leg-lugs", "body", STEEL_L, merge(lugs))
    st.add("leg-shoes", "body", STEEL_D, merge(feet))
    st.add("leg-bolts", "body", BRASS, merge(bolts))


def instrument(st, label, a, y, size, tilt=0.0, col=CREAM_D, r0=None):
    """A cream box on the upper shell at azimuth a and height y, `size` = (across, height, out), standing on the skin."""
    r_here = (r0 if r0 is not None else _upper_r(y))
    n = out(a)
    R = frame_at(a)
    if tilt:
        R = R @ rot("x", tilt)
    c = az(a, r_here + size[2] / 2 - 0.012, y)
    st.add(label, "body", col, box(tuple(c), size, R))
    return c + n * size[2] / 2


def _upper_r(y):
    pts = [(Y_BELT1, 0.535), (0.98, 0.525), (1.03, 0.50), (1.08, 0.47), (1.13, 0.446), (1.18, 0.43), (Y_NECK, R_NECK), (Y_DISC - 0.03, R_NECK)]
    for (y0, r0), (y1, r1) in zip(pts[:-1], pts[1:]):
        if y0 <= y <= y1:
            return r0 + (r1 - r0) * (y - y0) / (y1 - y0)
    return R_NECK


def build_neck(st):
    """The instruments on the upper shell: angular cream boxes, a canister with a domed foot, the two round gauge eyes, the pipes."""
    # the two-eyed box (the photographs show two round dark ports in a cream box), right of the lettering
    c = instrument(st, "box-eyes", 40, 1.10, (0.26, 0.20, 0.13))
    n = out(40)
    t = V(-math.sin(math.radians(40)), 0, math.cos(math.radians(40)))
    for s in (-1, 1):
        p = c + t * 0.052 * s + V(0, -0.004, 0) + n * 0.004
        st.add("eye-ring", "body", STEEL_L, frustum(p - n * 0.01, p + n * 0.006, 0.036, 0.034, 16, caps=True))
        st.add("eye-glass", "body", GLASS, frustum(p + n * 0.005, p + n * 0.012, 0.028, 0.026, 16, caps=True))
        st.add("eye-centre", "body", BLACK, frustum(p + n * 0.011, p + n * 0.013, 0.013, 0.013, 12, caps=True))
    # the angled cream boxes with their round lens ports, left of the canister
    for a, y, sz in ((100, 1.13, (0.24, 0.24, 0.17)), (162, 1.10, (0.25, 0.21, 0.16)), (214, 1.11, (0.23, 0.22, 0.16))):
        c = instrument(st, "box-wedge", a, y, sz, tilt=-14.0)
        nn = out(a)
        st.add("lens-ring", "body", STEEL, frustum(c - nn * 0.02, c + nn * 0.008, 0.038, 0.036, 14, caps=True))
        st.add("lens-glass", "body", BLACK, frustum(c + nn * 0.007, c + nn * 0.012, 0.027, 0.026, 14, caps=True))
    # the canister with its domed foot (photograph 02, centre), and a second cylinder beside it
    for a, y in ((300, 1.10), (262, 1.08)):
        base = az(a, _upper_r(y) + 0.0, y)
        n = out(a)
        top = base + n * 0.07 + V(0, 0.115, 0)
        bot = base + n * 0.07 - V(0, 0.115, 0)
        st.add("canister", "body", CREAM_L, frustum(bot + V(0, 0.04, 0), top, 0.075, 0.075, 18, caps=True))
        st.add("canister-foot", "body", CREAM_L, lib.dome(bot + V(0, 0.04, 0), 0.075, (0, -1, 0), 4, 18, 0.07))
    # the wedge boxes with the round hole, right of the canister
    c = instrument(st, "box-hole", 330, 1.11, (0.25, 0.21, 0.16), tilt=-10.0)
    st.add("hole", "body", BLACK, frustum(c - out(330) * 0.01, c + out(330) * 0.004, 0.020, 0.020, 12, caps=True))
    # the two bent steel pipes (photograph 02): out of the belt's top, out and up under the drag plate
    for dz, aa in ((0.0, 352), (0.0, 12)):
        p0 = az(aa, 0.535, 0.93)
        p1 = az(aa, 0.62, 0.95)
        p2 = az(aa, 0.64, 1.00)
        p3 = az(aa, 0.64, 1.27)
        st.add("pipe", "body", STEEL, tube([p0, p1, p2, p3], 0.026, 10))
        st.add("pipe-mouth", "body", BLACK, frustum(az(aa, 0.535, 0.93) - out(aa) * 0.03, az(aa, 0.535, 0.93) + out(aa) * 0.008, 0.028, 0.028, 10, caps=True))
        st.add("pipe-clamp", "body", STEEL_D, frustum(p2 + V(0, 0.07, 0), p2 + V(0, 0.095, 0), 0.034, 0.034, 10, caps=True))
    # small studs and a sensor head on the shell
    for a, y in ((8, 1.05), (70, 1.02), (128, 1.06), (186, 1.03), (240, 1.05), (285, 1.0)):
        n = out(a)
        st.add("stud", "body", STEEL, frustum(az(a, _upper_r(y) - 0.004, y), az(a, _upper_r(y) + 0.018, y), 0.011, 0.008, 8, caps=True))
    # the cream flange where the neck meets the plate
    st.add("neck-flange", "body", CREAM_D, frustum((0, Y_DISC - 0.07, 0), (0, Y_DISC - 0.03, 0), R_NECK + 0.02, R_NECK + 0.045, SEG, caps=False))


def build_disc(st):
    """The drag plate: a flat ring 2.2 m across with a rolled lip, a cream ribbed upper face round the cylinder, a steel underside."""
    # cross-section (r, y), counter-clockwise: the rolled rim up, the face inward, the inner edge down, the underside out
    poly = [(R_DISC, Y_DISC - 0.02), (R_DISC + 0.012, Y_DISC), (R_DISC, Y_DISC + 0.022), (1.04, Y_DISC + 0.034), (0.62, Y_DISC + 0.040), (0.42, Y_DISC + 0.040),
            (0.42, Y_DISC - 0.03), (0.62, Y_DISC - 0.052), (1.0, Y_DISC - 0.045)]
    st.add("disc", "body", ALU, rev(poly, SEG))
    # the cream rim ring and the inner cream plate round the cylinder
    st.add("disc-face", "body", CREAM_L, lib.disc((0, Y_DISC + 0.0415, 0), (0, 1, 0), 0.72, SEG, r_in=0.43))
    # radial ribs under the plate
    parts = []
    for k in range(24):
        a = 15.0 * k
        parts.append(box(tuple(az(a, 0.70, Y_DISC - 0.06)), (0.016, 0.025, 0.55), frame_at(a)))
    st.add("disc-ribs", "body", STEEL_D, merge(parts))
    # rivets round the lip
    rivet_row(st, "disc-rivets", Y_DISC + 0.036, 1.02, 96, 0.0, STEEL_L)
    # the two camera heads on the plate's rim (the replica's) and the lamps beside them
    for a in (172, 352):
        n = out(a)
        base = az(a, 0.93, Y_DISC + 0.04)
        st.add("cam-base", "body", STEEL, box(tuple(base + V(0, 0.045, 0)), (0.16, 0.09, 0.14), frame_at(a)))
        st.add("cam-box", "body", CREAM, box(tuple(base + V(0, 0.115, 0) - n * 0.012), (0.13, 0.055, 0.12), frame_at(a)))
        st.add("cam-lens", "body", STEEL_D, frustum(base + V(0, 0.07, 0) + n * 0.065, base + V(0, 0.07, 0) + n * 0.105, 0.032, 0.036, 12, caps=True))
        st.add("cam-glass", "body", BLACK, frustum(base + V(0, 0.07, 0) + n * 0.104, base + V(0, 0.07, 0) + n * 0.108, 0.026, 0.026, 12, caps=True))
        # the dark lens cover cast off (cited: two lens covers, one stuck): drawn off on the first, still on in the second
    # two small cream boxes and a little mast on the cream face
    for a, r in ((60, 0.58), (238, 0.60), (300, 0.56)):
        st.add("face-box", "body", CREAM_D, box(tuple(az(a, r, Y_DISC + 0.075)), (0.11, 0.07, 0.09), frame_at(a)))
    st.add("face-mast", "body", STEEL, rod(az(120, 0.60, Y_DISC + 0.04), az(120, 0.60, Y_DISC + 0.20), 0.008, 6))
    st.add("face-mast-tip", "body", STEEL_L, lib.sphere(az(120, 0.60, Y_DISC + 0.205), 0.016, 3, 8))


def helix(r, y0, y1, turns, width, thick=0.012, n_per_turn=32):
    """A flat band wound round a cylinder of radius r from y0 to y1, `turns` turns, `width` tall."""
    P, F = [], []
    n = int(turns * n_per_turn)
    for i in range(n + 1):
        t = i / n
        a = 2 * math.pi * turns * t
        y = y0 + (y1 - y0 - width) * t
        for dy, rr in ((0.0, r), (width, r), (width, r + thick), (0.0, r + thick)):
            P.append(V(rr * math.cos(a), y + dy, rr * math.sin(a)))
    for i in range(n):
        for k in range(4):
            a0, a1 = i * 4 + k, i * 4 + (k + 1) % 4
            b0, b1 = (i + 1) * 4 + k, (i + 1) * 4 + (k + 1) % 4
            F += [[a0, b0, b1], [a0, b1, a1]]
    P = np.array(P)
    F = np.array(F, dtype=np.int64)
    # every face looks away from the middle of its own cross-section
    sect = (F[:, 0] // 4)
    mid = np.array([P[s_ * 4:s_ * 4 + 4].mean(axis=0) for s_ in range(n + 1)])
    nrm = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    cen = P[F].mean(axis=1)
    flip = np.einsum("ij,ij->i", nrm, cen - mid[sect]) < 0
    F[flip] = F[flip][:, ::-1]
    return P, F


def build_cylinder(st):
    """The cylinder on top (the replica's): a cream drum ringed by a spiral of cream band on ten copper-brown ribs, a steel foot and cap."""
    # the foot: a cream collar on the plate
    st.add("cyl-collar", "body", CREAM_D, frustum((0, Y_CYL0 - 0.03, 0), (0, Y_CYL0 + 0.035, 0), R_CYL + 0.02, R_CYL + 0.012, SEG, caps=True))
    # the drum, a little inside the bands, darker so the gaps read
    st.add("cyl-drum", "body", "#5E3F2A", frustum((0, Y_CYL0 + 0.03, 0), (0, Y_CYL1 - 0.03, 0), R_CYL - 0.025, R_CYL - 0.025, 48, caps=False))
    # ten ribs, thin copper-brown boards standing on the drum
    parts = []
    for k in range(10):
        a = 36.0 * k + 8
        c = az(a, R_CYL - 0.01, (Y_CYL0 + Y_CYL1) / 2)
        parts.append(box(tuple(c), (0.075, Y_CYL1 - Y_CYL0 - 0.05, 0.045), frame_at(a)))
    st.add("cyl-ribs", "body", BROWN, merge(parts))
    # the spiral band: eight and a half turns of a 0.045 m ribbon
    st.add("cyl-band", "body", CREAM, helix(R_CYL + 0.016, Y_CYL0 + 0.04, Y_CYL1 - 0.03, 6.5, 0.072, 0.02))
    # rivets down two ribs
    # the top: a steel flange ring and a cap
    st.add("cyl-flange", "body", STEEL, rev([(R_CYL + 0.06, Y_CYL1 - 0.03), (R_CYL + 0.065, Y_CYL1 - 0.01), (R_CYL + 0.05, Y_CYL1 + 0.012), (0.30, Y_CYL1 + 0.012),
                                             (0.30, Y_CYL1 - 0.03)], SEG))
    st.add("cyl-cap", "body", STEEL_L, frustum((0, Y_CYL1 + 0.012, 0), (0, Y_CYL1 + 0.03, 0), 0.30, 0.27, SEG, caps=True))
    st.add("cyl-cap-ring", "body", STEEL_D, torus(V(0, Y_CYL1 + 0.03, 0), V(0, 1, 0), 0.27, 0.008, SEG, 5))
    rivet_row(st, "cyl-rivets", Y_CYL1 + 0.012, 0.455, 40, 0.0, STEEL_L)


def build_fittings(st):
    """What stands on the ring beside the legs: three lamps with their silver reflectors, two cream ball sensors on arms, two steel
    probes lying along the flange, a coil of cable."""
    # three lamps
    for a in (168, 186, 205):
        base = az(a, 0.74, 0.153)
        n = out(a)
        top = base + V(0, 0.19, 0) + n * 0.035
        st.add("lamp-arm", "body", STEEL, rod(base, top, 0.012, 6))
        st.add("lamp-housing", "body", CREAM_D, frustum(top - n * 0.04, top + n * 0.02, 0.040, 0.045, 12, caps=True))
        st.add("lamp-reflector", "body", STEEL_L, lib.dome(top + n * 0.02, 0.058, tuple(n * 0.8 + V(0, -0.5, 0)), 5, 16, 0.04))
    # two ball sensors
    for a in (10, 24):
        base = az(a, 0.76, 0.153)
        top = base + V(0, 0.15, 0) + out(a) * 0.05
        st.add("ball-arm", "body", STEEL_D, rod(base, top, 0.011, 6))
        st.add("ball", "body", CREAM_L, lib.sphere(top + V(0, 0.04, 0), 0.052, 6, 14))
        st.add("ball-neck", "body", STEEL_L, frustum(top, top + V(0, 0.03, 0), 0.020, 0.028, 10, caps=True))
    # two steel probes along the flange on the right (photograph 02), one with a cable
    for a, ln in ((338, 0.30), (352, 0.26)):
        p = az(a, 0.76, 0.19)
        t = V(-math.sin(math.radians(a)), 0, math.cos(math.radians(a)))
        st.add("probe", "body", STEEL, frustum(p - t * ln / 2, p + t * ln / 2, 0.034, 0.034, 12, caps=True))
        st.add("probe-band", "body", STEEL_D, frustum(p - t * 0.05, p - t * 0.035, 0.037, 0.037, 12, caps=True))
        st.add("probe-end", "body", BLACK, frustum(p + t * ln / 2, p + t * (ln / 2 + 0.012), 0.022, 0.022, 10, caps=True))
    # cable run: a black wire from the shell down to the ring, with a spring
    st.add("cable", "body", CABLE, tube([az(20, 0.55, 0.9), az(20, 0.62, 0.7), az(18, 0.72, 0.4), az(16, 0.78, 0.17)], 0.0075, 5))
    parts = []
    for k in range(10):
        a0 = 2 * math.pi * k / 10 * 2
        parts.append(lib.sphere(az(20, 0.64, 0.30) + V(0.012 * math.cos(a0), 0.012 * k * 0.5 - 0.03, 0.012 * math.sin(a0)), 0.011, 3, 6))
    st.add("spring", "body", STEEL_D, merge(parts))
    # the two small grey sensors on the ring's flange, by the left lamps (a flat plate with a dark window)
    st.add("sensor-plate", "body", CREAM_D, box(tuple(az(150, 0.78, 0.160)), (0.12, 0.012, 0.09), frame_at(150)))
    st.add("sensor-window", "body", BLACK, box(tuple(az(150, 0.78, 0.168)), (0.06, 0.005, 0.045), frame_at(150)))
    # the underside bottle: a small cream bottle under the shell (the ring's other face)
    st.add("bottle", "body", CREAM_L, lib.sphere(az(95, 0.74, 0.20), 0.045, 5, 12))


def build_vehicle():
    st = Stage("venera-9")
    build_ring(st)
    brackets = build_shell(st)
    build_legs(st, brackets)
    build_neck(st)
    build_disc(st)
    build_cylinder(st)
    build_fittings(st)
    veh = Vehicle("venera-9")
    veh.add("venera-9", st, (0.0, 0.85, 0.0))
    return veh


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] in ("-h", "--help"):
        print("usage: python3 tools/venera-builder/venera.py <out.json>   (the part tree json; tools/venera-builder/build.sh writes the .glb)")
        sys.exit(0 if len(sys.argv) == 2 else 2)
    out_path = sys.argv[1]
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    v = build_vehicle()
    v.export(out_path, limit=14)
