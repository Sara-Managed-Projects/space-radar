"""Parts shared by the geostationary-bus builders of release 2.0.0 (batch m2-buses), on the part library of
tools/stage-builder/lib.py and the helpers of tools/comms-builder/clib.py.

Metres, the app's axes for a satellite: +Z the Earth (nadir) deck, +X the wing axis (north-south), +Y the side the cells face
(east-west is Y). The body's long axis is Z, as the craft stand on the launcher (McDowell's GCAT 'Length' is that height, 'Diameter' the
width across). A bus here is a few dozen calls: `body`, `wing`, `reflector`, `horn_array`, `engine`, `thrusters`, and the builders only say
which sizes and how many.

WHAT IS PUBLISHED AND WHAT IS READ OFF PICTURES. Every bus module carries its own head note: the sizes it takes from McDowell's GCAT (CC BY 4.0),
from the makers' and Wikipedia's pages, and the layout it reads off the maker's renders (Gunter's Space Page, looked at only: renders, not
photographs of flight hardware, which do not exist for craft that fly 36 000 km out). Nothing here is traced from a picture and no
picture is in a file; where a size is not published it is ours and the head note says so.

Colours are flat ones of ours in the app's roles (body, foil, solar-panel, mirror): at most 14 per file.
"""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "comms-builder"))
from clib import *  # noqa: F401,F403,E402
import lib  # noqa: E402

GOLD = "#C9A24A"
GOLD_D = "#A97F34"
GOLD_L = "#DDBB64"
WHITE = "#E6E9EE"
OSR = "#C5CCD6"           # optical solar reflector radiator, silvery white
OSR_D = "#A6AEBA"
SILVER = "#B9BEC6"
SILVER_D = "#8F97A3"
STRUCT = "#5C626C"
BLACK = "#24272E"
GREY = "#6C737E"
CELL = "#2E4E8C"
CELL_BACK = "#9CA3AD"     # the grey carbon back of a panel
SILVER_FOIL = "#C3C9D0"
DARK_FOIL = "#6E7279"
DISH_FRONT = "#D2D5D8"
DISH_BACK = "#EEF0F2"


def up_frame(n, up):
    """An orthonormal matrix with +Z column n and +X as close to `up` x n as it can be."""
    n = unit(V(n))
    u = unit(np.cross(V(up), n))
    if np.linalg.norm(np.cross(V(up), n)) < 1e-6:
        u = unit(np.cross((1, 0, 0), n))
    v = np.cross(n, u)
    return np.column_stack([u, v, n])


def foil_box(m, label, c, size, faces, div=0.4, crinkle=0.035, seed=1, colour=GOLD):
    """Blanket faces of a box: rumpled sheets cut about `div` metres, so the folds catch the light."""
    m.add(label, "foil", colour, lib.box(c, size, faces=faces, div=div, crinkle=crinkle, seed=seed))


def body(m, sx, sy, sz, foil=GOLD, rad_x=OSR, sy_foil_faces="yY", seed=3, radiator_seams=(3, 5), cap_foil=True, zcap=0.0):
    """The bus box. The +/-X faces (north and south, where the wings come out) are radiator panels with their seams; the +/-Y faces (east and
    west) and the ends are gold foil over a dark structure; a launch-adapter ring on the aft end."""
    m.add("structure", "body", STRUCT, lib.box((0, 0, 0), (sx - 0.02, sy - 0.02, sz - 0.02)))
    for sgn in (-1, 1):
        m.add("radiator", "body", rad_x, lib.grid((sgn * sx / 2, 0, 0), (0, 1, 0) if sgn > 0 else (0, 0, 1), (0, 0, 1) if sgn > 0 else (0, 1, 0), sy, sz, 1, 1))
        m.add("radiator-seam", "body", OSR_D, lib.seams_on_face((sgn * (sx / 2 + 0.004), 0, 0), (sgn, 0, 0), (0, 1, 0), sy * 0.96, sz * 0.96, radiator_seams[0], radiator_seams[1], width=0.012, lift=0.0))
    # foil faces: east and west, with taped seams and a few patches
    for sgn in (-1, 1):
        c = (0, sgn * (sy / 2 + 0.03), 0)
        m.add("foil-" + ("e" if sgn > 0 else "w"), "foil", foil, lib.grid(c, (0, 0, 1) if sgn > 0 else (1, 0, 0), (1, 0, 0) if sgn > 0 else (0, 0, 1), (sz if sgn > 0 else sx) * 0.98, (sx if sgn > 0 else sz) * 0.98, max(8, int(sz / 0.3)) if sgn > 0 else max(4, int(sx / 0.3)), max(4, int(sx / 0.3)) if sgn > 0 else max(8, int(sz / 0.3)), crinkle=0.03, seed=seed + (1 if sgn > 0 else 0)))
        m.add("foil-seam", "foil", GOLD_D, lib.seams_on_face((0, sgn * (sy / 2 + 0.05), 0), (0, sgn, 0), (1, 0, 0), sx * 0.96, sz * 0.96, 3, 6, width=0.012, lift=0.0))
        for col, mesh in lib.patches_on_face((0, sgn * (sy / 2 + 0.06), 0), (0, sgn, 0), (1, 0, 0), sx, sz, 6, 0.4, [GOLD_L, GOLD, GOLD_D], seed + 20 + (3 if sgn > 0 else 0), lift=0.0, amp=0.02):
            m.add("foil-patch", "foil", col, mesh)
    # the edges of the box: a frame of structural rails, grey, at the corners
    for ex in (-1, 1):
        for ey in (-1, 1):
            m.add("rail", "body", SILVER_D, lib.box((ex * (sx / 2 + 0.01), ey * (sy / 2 + 0.01), 0), (0.05, 0.05, sz)))
    # the aft (-Z) end: a foil skirt and the launch-adapter ring
    za = -sz / 2
    m.add("aft-foil", "foil", foil, lib.grid((0, 0, za - 0.01), (0, 1, 0), (1, 0, 0), sy * 0.98, sx * 0.98, 5, 5, crinkle=0.03, seed=seed + 5))
    m.add("adapter-cone", "body", SILVER_D, lib.frustum((0, 0, za), (0, 0, za - 0.35), min(sx, sy) * 0.36, 0.55, 28, caps=False))
    m.add("adapter-ring", "body", GREY, lib.torus((0, 0, za - 0.36), (0, 0, 1), 0.55, 0.03, 36, 6))


def deck(m, sx, sy, sz, tone=BLACK, foil=GOLD):
    """The Earth deck (+Z): a dark deck with a gold foil frame, a few sun and earth sensors."""
    zf = sz / 2
    m.add("earth-deck", "body", tone, lib.grid((0, 0, zf + 0.005), (1, 0, 0), (0, 1, 0), sx * 0.98, sy * 0.98, 1, 1))
    m.add("deck-foil", "foil", foil, edge_strips((0, 0, 0), (sx, sy, sz), 0.16, 0.02, "Z", crinkle=0.02, seed=4))
    for p in ((sx * 0.38, sy * 0.36), (-sx * 0.38, -sy * 0.36)):
        m.add("sun-sensor", "body", GREY, lib.box((p[0], p[1], zf + 0.04), (0.08, 0.08, 0.06)))
        m.add("sun-sensor-eye", "body", BLACK, lib.frustum((p[0], p[1], zf + 0.07), (p[0], p[1], zf + 0.1), 0.025, 0.03, 10))


def horn_array(m, label, c, n, u, rows, cols, pitch, r0, depth, plate_col=OSR_D, horn_col=WHITE, inside=BLACK):
    """A cluster of conical horns on a plate: rows x cols horns `pitch` apart, mouth radius r0, length `depth`, standing along n from c."""
    c, n, u = V(c), unit(V(n)), unit(V(u))
    v = np.cross(n, u)
    w = (cols - 1) * pitch + 2.4 * r0
    h = (rows - 1) * pitch + 2.4 * r0
    m.add(label + "-plate", "body", plate_col, lib.box(c + n * 0.01, (w, h, 0.02), np.column_stack([u, v, n])))
    for i in range(rows):
        for j in range(cols):
            p = c + u * ((j - (cols - 1) / 2) * pitch) + v * ((i - (rows - 1) / 2) * pitch)
            m.add(label, "body", horn_col, lib.frustum(p + n * 0.02, p + n * (0.02 + depth), r0 * 0.45, r0, 10, caps=False))
            m.add(label + "-mouth", "body", inside, lib.disc(p + n * (0.02 + depth) - n * 0.004, n, r0 * 0.85, 10))


def dish_parts(c, n, rx, ry, depth, up=(0, 0, 1), seg=28, rings=5):
    """An elliptical paraboloid shell opening along n: (front mesh, back mesh, rim mesh). rx along the `up` x n direction, ry across."""
    R = up_frame(n, up)
    S = np.diag([rx, ry, 1.0])
    prof = []
    for k in range(rings + 1):
        s = k / rings
        prof.append((s * s, s))
    t = np.linspace(0, 2 * math.pi, seg, endpoint=False)
    def shell(off):
        P = []
        for z, rr in prof:
            for a in t:
                P.append(((rr * math.cos(a)) * 1.0, (rr * math.sin(a)) * 1.0, z * depth + off))
        P = np.array(P)
        F = []
        for k in range(rings):
            for i in range(seg):
                j = (i + 1) % seg
                p0, p1, p2, p3 = k * seg + i, k * seg + j, (k + 1) * seg + j, (k + 1) * seg + i
                F += [[p0, p1, p2], [p0, p2, p3]]
        P2 = (P * np.array([rx, ry, 1.0])) @ R.T + V(c)
        return P2, np.array(F, dtype=np.int64)
    front = shell(0.0)
    back = shell(-0.07)
    back = (back[0], back[1][:, ::-1])
    rim_pts = np.array([[math.cos(a) * rx, math.sin(a) * ry, depth - 0.0] for a in t])
    rim = []
    for i in range(seg):
        a = rim_pts[i] @ R.T + V(c)
        b = rim_pts[(i + 1) % seg] @ R.T + V(c)
        rim.append(lib.rod(a, b, 0.018, 5))
    return front, back, lib.merge(rim), R


def reflector(m, label, c, n, rx, ry, depth, up=(0, 0, 1), arm_from=None, feed=True, ribs=8, back_col=DISH_BACK, front_col=DISH_FRONT, foil=GOLD, seg=28):
    """A deployed mesh/shell reflector: shell (front and back in their own tones), a rim, radial ribs on the back, a hinge arm of gold foil to
    `arm_from` (a point on the body), and a feed horn on struts at the focus."""
    front, back, rim, R = dish_parts(c, n, rx, ry, depth, up, seg)
    m.add(label + "-front", "body", front_col, front)
    m.add(label + "-back", "body", back_col, back)
    m.add(label + "-rim", "body", back_col, rim)
    c = V(c)
    n = unit(V(n))
    # back ribs: radial rods from the vertex to the rim
    for k in range(ribs):
        a = 2 * math.pi * k / ribs
        e = (np.array([math.cos(a) * rx, math.sin(a) * ry, depth]) @ R.T) + c
        m.add(label + "-rib", "body", back_col, lib.rod(c + n * -0.02, e + n * -0.012, 0.012, 4))
    hub = c - n * 0.04
    m.add(label + "-hub", "body", GREY, lib.frustum(c, hub, 0.1, 0.08, 10))
    if arm_from is not None:
        ap = V(arm_from)
        m.add(label + "-arm", "foil", foil, lib.rod(ap, hub, 0.035, 8))
        m.add(label + "-hinge", "body", GREY, lib.frustum(ap, ap + unit(hub - ap) * 0.12, 0.06, 0.05, 10))
    if feed:
        side = R[:, 0]
        fp = c + n * (depth * 1.6) - side * rx * 0.55
        m.add(label + "-feed", "body", WHITE, lib.frustum(fp, fp + unit(c + n * depth * 0.5 - fp) * 0.22, 0.03, 0.09, 10, caps=False))
        for k in range(3):
            a = 2 * math.pi * k / 3 + 0.4
            e = (np.array([math.cos(a) * rx * 0.9, math.sin(a) * ry * 0.9, depth * 0.85]) @ R.T) + c
            m.add(label + "-feed-strut", "body", GREY, lib.rod(fp, e, 0.008, 4))


def wing(m, sgn, x0, n_panels, panel_len, panel_w, cells, yoke_len=0.9, gap=0.07, thick=0.03, cell_gap=0.012, back_col=CELL_BACK, z=0.0, hold=True, sada_r=0.17, sada_len=0.5, rails=True, truss=True, panel_w_tip=None, skew=0.0):
    """One wing out of the +/-X face at x0: a drive (cylinder with a foil band), a yoke truss, n panels edge to edge with hinges and rails.
    Cells face +Y (u = Z across, v = X along: n = u x v = +Y). `cells` = (across, along)."""
    s = sgn
    m.add("sada", "body", GREY, lib.frustum((x0, 0, z), (x0 + s * sada_len, 0, z), sada_r, sada_r, 14))
    m.add("sada-foil", "foil", GOLD, lib.frustum((x0 + s * 0.08, 0, z), (x0 + s * (sada_len - 0.08), 0, z), sada_r + 0.02, sada_r + 0.02, 14, caps=False))
    m.add("sada-ring", "body", SILVER_D, lib.torus((x0 + s * sada_len, 0, z), (1, 0, 0), sada_r * 0.9, 0.03, 18, 6))
    xe = x0 + s * (sada_len + yoke_len)
    # the yoke: two tubes opening to the panel's width, and a cross-brace
    for k in (-1, 1):
        m.add("yoke", "body", SILVER_D, lib.rod((x0 + s * sada_len, 0, z + k * 0.08), (xe, 0, z + k * panel_w * 0.38), 0.03, 6))
    m.add("yoke-brace", "body", SILVER_D, lib.rod((xe, 0, z - panel_w * 0.38), (xe, 0, z + panel_w * 0.38), 0.025, 6))
    xs = xe
    for i in range(n_panels):
        pw = panel_w if panel_w_tip is None else panel_w + (panel_w_tip - panel_w) * i / max(1, n_panels - 1)
        xc = xs + s * (panel_len / 2)
        for role, col, mesh in lib.cell_panel((xc, 0, z), (0, 0, 1), (1, 0, 0), pw, panel_len, cells, cell_gap, SILVER_D, cell_col=CELL, thick=thick, back_col=back_col, border=0.03):
            m.add("panel", role, col, mesh)
        if rails:
            for k in (-1, 1):
                m.add("panel-rail", "body", SILVER_D, lib.box((xc, 0, z + k * (pw / 2)), (panel_len, thick * 1.5, 0.035)))
        if i < n_panels - 1:
            m.add("hinge", "body", GREY, lib.box((xs + s * (panel_len + gap / 2), 0, z), (gap, thick * 1.6, pw * 0.96)))
        xs = xs + s * (panel_len + gap)
    return xs


def engine(m, c, r_throat=0.09, r_exit=0.34, length=0.7, foil=GOLD):
    """The apogee engine on the aft end: a bell nozzle pointing -Z from c, with a gold foil sleeve at its throat."""
    outer, inner = lib.nozzle(c, (0, 0, -1), length, r_throat, r_exit, 24)
    m.add("engine-bell", "body", "#7B6A55", outer)
    m.add("engine-bell-in", "body", BLACK, inner)
    m.add("engine-sleeve", "foil", foil, lib.frustum(c, V(c) + V(0, 0, -0.18), r_throat * 1.8, r_throat * 2.2, 14, caps=False))


def thrusters(m, pts, r=0.045):
    """Small attitude and station-keeping thrusters: (point, direction) pairs, each a grey bell on a short mount."""
    for p, d in pts:
        p, d = V(p), unit(V(d))
        m.add("thruster-mount", "body", GREY, lib.frustum(p - d * 0.03, p + d * 0.05, r * 1.1, r * 0.8, 10))
        outer, inner = lib.nozzle(p + d * 0.05, d, 0.12, r * 0.4, r * 1.2, 12)
        m.add("thruster", "body", "#7B6A55", outer)
        m.add("thruster-in", "body", BLACK, inner)


def omni(m, c, n, length=0.5, r=0.025, col=WHITE):
    """A TT&C omni-directional antenna: a short post with a cone cap."""
    c, n = V(c), unit(V(n))
    m.add("ttc-post", "body", GREY, lib.rod(c, c + n * length * 0.4, r * 1.4, 8))
    m.add("ttc-cone", "body", col, lib.frustum(c + n * length * 0.4, c + n * length, r * 2.2, r * 0.5, 10))


def startracker(m, c, n, r=0.06):
    """A star tracker: a box with a baffle cone."""
    c, n = V(c), unit(V(n))
    R = up_frame(n, (0, 0, 1))
    m.add("star-tracker", "body", BLACK, lib.box(c + n * 0.05, (r * 2.0, r * 2.0, 0.1), R))
    m.add("star-tracker-baffle", "body", GREY, lib.frustum(c + n * 0.1, c + n * 0.3, r * 0.9, r * 1.45, 12, caps=False))


def write(model, fid):
    """Export out/<id>.json beside this file and a six-view picture; prints the count."""
    out = os.path.join(HERE, "out")
    os.makedirs(out, exist_ok=True)
    tris, ncol = model.export(os.path.join(out, fid + ".json"))
    lo, hi = model.bounds()
    print(fid, "triangles", tris, "colours", ncol, "folds", getattr(model, "folds", []), "size", np.round(hi - lo, 2))
    return tris, ncol


def standard(m, sx, sy, sz, panels, reflectors, foil=GOLD, rad=OSR, yoke=1.0, sada=0.5, horns=((0.55, 3, 3), (-0.55, 3, 3)), side_horns=True, engine_r=(0.1, 0.36, 0.8), wings=True, ttc=2, dish_front=DISH_FRONT, dish_back=DISH_BACK, panel_gap=0.07, deck_tone=BLACK, seams=(3, 5)):
    """A conventional three-axis comsat: body, Earth deck with horn clusters and TT&C posts, `reflectors` (label, y_out, z, rx, ry, depth, angle_deg, arm_z) mirrored
    east and west (angle: of the aperture from +Z toward outward Y), aft engine and four thruster groups, two star trackers, `panels` = (n, length, width, (cells across, along)) a wing each side."""
    body(m, sx, sy, sz, foil=foil, rad_x=rad, radiator_seams=seams)
    deck(m, sx, sy, sz, tone=deck_tone, foil=foil)
    zf = sz / 2
    for xo, rows, cols in horns:
        horn_array(m, "horn-cluster", (xo * sx / 2.4, 0.0, zf + 0.04), (0, 0, 1), (1, 0, 0), rows, cols, 0.26, 0.11, 0.2)
    for k in range(ttc):
        omni(m, (0.0, (0.7 if k == 0 else -0.7) * sy / 2.3, zf), (0, 0, 1), 0.45)
    for sgn in (-1, 1):
        if side_horns:
            horn_array(m, "side-horns", (0.0, sgn * (sy / 2 + 0.05), zf - 1.0), (0, sgn, 0), (1, 0, 0), 2, 3, 0.26, 0.11, 0.18)
        for label, yo, z, rx, ry, depth, ang, armz in reflectors:
            a = math.radians(ang)
            reflector(m, label, (0.0, sgn * (sy / 2 + yo), zf + z), (0.0, sgn * math.sin(a), math.cos(a)), rx, ry, depth, up=(1, 0, 0),
                      arm_from=(0.0, sgn * sy / 2, zf + armz), front_col=dish_front, back_col=dish_back)
    if engine_r:
        engine(m, (0, 0, -sz / 2 + 0.05), *engine_r)
    for ex in (-1, 1):
        for ey in (-1, 1):
            thrusters(m, [((ex * (sx / 2 - 0.08), ey * (sy / 2 - 0.08), -sz / 2), (ex * 0.35, ey * 0.35, -0.87))])
            thrusters(m, [((ex * (sx / 2 - 0.3), ey * (sy / 2 + 0.03), -sz / 2 + 0.4), (ex * 0.1, ey * 0.95, -0.3))])
    startracker(m, (0.7 * sx / 2.4, sy / 2 - 0.1, -sz * 0.08), (0.0, 1.0, 0.2))
    startracker(m, (-0.7 * sx / 2.4, -sy / 2 + 0.1, -sz * 0.08), (0.0, -1.0, 0.2))
    if wings:
        n, pl, pw, cells = panels
        for sgn in (-1, 1):
            wing(m, sgn, sgn * sx / 2, n, pl, pw, cells, yoke_len=yoke, sada_len=sada, gap=panel_gap)


def panel_len(span, sx, n, yoke=1.0, sada=0.5, gap=0.07):
    """The length of each of n panels so that the two wings span `span` tip to tip over a body `sx` wide."""
    return round(((span - sx) / 2 - sada - yoke - (n - 1) * gap) / n, 2)
