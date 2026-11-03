"""The Hubble Space Telescope as it left Discovery on 25 April 1990 (STS-31), in parts for the Moment `hubble-deployment`
(release 1.7.6, internal #1058). Derived from release 1.3.0's builder of the telescope as it has flown since Servicing
Mission 4 (NORAD 20580; `hubble.glb`), kept in ~/space-radar-handoff/release-1.3/W3-a/build/hubble.py. What changed, and
why (each against the photographs of the release, NASA, public domain: IMAX Cargo Bay Camera frames of 25 April 1990):
- the aperture door is SHUT (the telescope's checkout came first; the press kit plans its opening for flight day 3) and the high gain antennas and the arrays are split off as parts
  the Moment poses: `array-l`, `array-r` (the blankets, drawn unrolled; the Moment scales them along the tube to stow
  them) and `hga-l`, `hga-r` (mast, gimbal and dish, drawn deployed; the Moment folds them along the tube);
- the arrays are the FIRST ones, the golden-yellow ESA blankets of 1990 (the first arrays, SA-1, were replaced in 1993; the dark blue SA-3 came in 2002), the
  amber cells and their grid read from the photographs; the sizes are the same 2.45 x 7.56 m;
- everything else (the tube, the aft section, the bulkhead, the handrails) is the 1.3.0 build, which was made from the
  SM4 photographs: details of the later servicing (the SM4 soft-capture mechanism on the aft bulkhead, the WFC3 and COS
  bays' decals) are on it and are not those of 1990. The Moment says the model is built from published dimensions.
Run: `python3 tools/hubble-builder/hubble_sts31.py out.json` then write-glb-parts.mjs (tools/vostok-builder/build.sh's step).

Original header follows.

The Hubble Space Telescope as it has flown since Servicing Mission 4 (May 2009), NORAD 20580.

Cited (opened pages):
- ESA/Hubble fact sheet (esahubble.org/about/general/fact_sheet/): "Length: 13.2 m, diameter: 4.2 m";
  solar arrays "two solar panels each 2.45 x 7.56 m" (BUILT: each wing 7.56 m along the tube, 2.45 m wide;
  NASA's science.nasa.gov gives 7.1 x 2.6 m, within 0.5 m).
- NASA HST Media Reference Guide, sec. 5 (lhea.gsfc.nasa.gov/archive/sm3b/art/pdf/media-guide/sec5.pdf):
  aperture door "approximately 10 feet (3 m) in diameter", "opens a maximum of 105 degrees" (BUILT open
  105 degrees), "The outside is covered with solar-reflecting material, and the inside is painted black";
  light shield "13 feet (4 m) long and 10 feet (3 m) in internal diameter", "Handrails encircle the light
  shield", "Two systems are located on the front end of the light shield" (two magnetometers, two sun
  sensors), "supports the forward Low Gain Antenna"; forward shell "13 feet (4 m) long and 10 feet (3 m) in
  diameter", "two grapple fixtures next to the HGA drives", rings "on the outside"; the Equipment Section a
  "doughnut-shaped barrel", "10 bays for equipment and two bays to support aft trunnion pins and scuff
  plates", "bays are 4 feet (1.2 m) wide", scuff plates "on struts that extend approximately 30 inches";
  aft shroud "11.5 feet (3.5 m) long and 14 feet (4.3 m) in diameter", "Doors on the outside of the
  shroud"; aft bulkhead with "three radial aluminum support beams"; LGAs "set 180 degrees apart on the
  light shield and aft bulkhead", "spiral cones"; "Silvered FOSR tape on the aft shroud and aft bulkhead
  exteriors", "Aluminum FOSR tape on the aperture door"; MLI "outer layer of aluminized Teflon".
- STScI HST primer (hst-docs.stsci.edu): V2 parallels the SA masts, V3 the HGA masts.
- From the photographs (NASA, public domain; refs/hubble/sources.txt): the step from the 3.1 m tube to
  the 4.2 m aft section 7.9 m behind the door hinge, the Equipment Section 1.7 m long, the SA masts at its
  forward edge, the wings' inner edge 2.85 m from the axis, the HGA dish centres ~4.7 m from the axis.
OURS: every size not cited (masts, dishes 1.3 m as briefed, handrails, small boxes), within the photos.

Frame: NASA 3D Resources' "Hubble Space Telescope (A)" frame, as briefed: the long axis (V1) along Y with
the aperture door at +Y, metres, centred on the body; the SA masts (V2) along X; the HGA masts (V3) along Z.
The door hinges on the +Z (+V3, Sun) side and the cells face +Z, as in every SM4 release photograph (the
door's white outer face and the cells are seen from the same side). ARRAY_ROLL turns both wings about
their masts (0 = the wings lie along the tube, as photographed; 90 = cells to +Y, as (A) has them).
"""
import math
import sys

import numpy as np

import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "stage-builder"))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vostok-builder"))
import vlib  # noqa: F401  (its fast Model.export, which also keeps the records for the part writer)
from lib import (V, box, disc, frustum, grid, lathe, merge, Model, plate, quad, rod, rot, sphere, torus, unit, xf)

ARRAY_ROLL = 0.0

# ---- colours (14 groups at most) -------------------------------------------------------------------------
FOIL_A = "#CFD3D8"     # aluminised Teflon MLI, the light ones
FOIL_B = "#B8BDC4"     # ... a shade darker
FOIL_C = "#A2A8B0"     # ... darker panels and the taped seams
SHROUD = "#B4BBC5"     # silvered FOSR tape on the aft shroud and bulkhead (bare metal look)
SHROUD_D = "#98A0AB"   # its darker panels, the Equipment Section doors
WHITE = "#E7E9EB"      # NOBL panels, radiators, the door's outside, the arrays' backs
RAIL = "#D9A62E"       # the yellow handrails
CELL = "#22254C"       # the round decals on the bay doors
ARR_CELL = "#B9862A"   # the 1990 arrays' cells: golden amber with a darker grid (photographs of 25 April 1990)
ARR_GRID = "#E3BD62"   # the lighter busbars and edge tapes
BLACK = "#1E2127"      # the door's inside, the aperture, light shades, black boxes
METAL = "#6B717A"      # masts, mechanisms, panel lines
GOLD = "#C9A24A"       # scuff plates, brackets, gimbals (gold foil and anodise)
LIGHT = "#C9CED4"      # array frames, door rim, hinge, LGA cones
DARK = "#4A4F58"       # the bulkhead's dark tiles, the HGA dishes

class PModel(Model):
    """A Model whose adds are filed under the part named by `cur` (label `part|label`)."""
    cur = "rest"

    def add(self, label, role, colour, mesh):
        super().add(self.cur + "|" + label, role, colour, mesh)


m = PModel("hubble-sts31")

# ---- stations along the tube (Y, metres) ----------------------------------------------------------------
Y_AFT = -6.6          # aft bulkhead
Y_ES0 = -3.05         # aft shroud / Equipment Section (aft shroud 3.55 m: cited 3.5 m)
Y_ES1 = -1.25         # Equipment Section / forward shell (ES 1.8 m, from the photographs)
Y_LS0 = 2.6           # forward shell / light shield (each ~4 m: cited 4 m)
Y_FRONT = 6.6         # front of the light shield (13.2 m overall: cited)
R_T = 1.55            # the tube with its blanket (3 m internal: cited)
R_AS = 2.14           # aft shroud (4.3 m: cited)
R_ES = 2.16           # Equipment Section, 12 flat bays (circumradius)
Y_SA = -0.85           # the SA masts
Y_HGA = -0.75         # the HGA masts

UP = np.array([0.0, 1.0, 0.0])


def radial(phi):
    """Unit vector out from the axis at azimuth phi (degrees; 0 = +X, 90 = +Z)."""
    a = math.radians(phi)
    return np.array([math.cos(a), 0.0, math.sin(a)])


def tangent(phi):
    a = math.radians(phi)
    return np.array([-math.sin(a), 0.0, math.cos(a)])


def cpt(R, phi, y):
    return radial(phi) * R + UP * y


def orient_out(mesh, axis_pt=(0, 0, 0)):
    """Flip faces of a mesh round the Y axis so they face away from it."""
    P, F = mesh
    P = np.asarray(P, float)
    F = np.asarray(F, np.int64).copy()
    n = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    c = P[F].mean(axis=1)
    r = c - np.asarray(axis_pt, float)
    r[:, 1] = 0
    bad = np.einsum("ij,ij->i", n, r) < 0
    F[bad] = F[bad][:, ::-1]
    return P, F


def orient_to(mesh, d):
    """Flip faces so they face along d."""
    P, F = mesh
    F = np.asarray(F, np.int64).copy()
    n = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    bad = n @ np.asarray(d, float) < 0
    F[bad] = F[bad][:, ::-1]
    return P, F


def cyl_patch(R, phi0, phi1, y0, y1, nphi, ny, inward=False, rfun=None):
    """A piece of a cylinder round Y (faces outward unless inward)."""
    ph = np.linspace(phi0, phi1, nphi + 1)
    ys = np.linspace(y0, y1, ny + 1)
    P = []
    for p in ph:
        for y in ys:
            r = R if rfun is None else rfun(p, y)
            P.append(cpt(r, p, y))
    P = np.array(P)
    F = []
    for i in range(nphi):
        for j in range(ny):
            a, b, c, d = i * (ny + 1) + j, (i + 1) * (ny + 1) + j, (i + 1) * (ny + 1) + j + 1, i * (ny + 1) + j + 1
            F += [[a, b, c], [a, c, d]]
    mesh = orient_out((P, np.array(F)))
    if inward:
        mesh = (mesh[0], mesh[1][:, ::-1])
    return mesh


def ring_strip(R, y, width, phi0=0, phi1=360, seg=72, lift=0.006):
    """A thin band round the tube (a taped seam, a panel line)."""
    return cyl_patch(R + lift, phi0, phi1, y - width / 2, y + width / 2, seg, 1)


def long_strip(R, phi, y0, y1, width, lift=0.006):
    """A thin strip along the tube at azimuth phi."""
    dphi = math.degrees(width / R)
    return cyl_patch(R + lift, phi - dphi / 2, phi + dphi / 2, y0, y1, 1, max(1, int((y1 - y0) / 1.0)))


def bar(a, b, w, h=None, up=None):
    """A square-section bar from a to b (w wide, h deep), its depth along `up` when given."""
    a, b = V(a), V(b)
    d = unit(b - a)
    if up is None:
        up = np.array([0, 1.0, 0]) if abs(d[1]) < 0.9 else np.array([1.0, 0, 0])
    u = unit(np.cross(up, d))
    v = np.cross(d, u)
    R = np.column_stack([u, v, d])
    return box((a + b) / 2, (w, h or w, np.linalg.norm(b - a)), R)


rails = []          # yellow handrails, gathered


def handrail(pts, out, off=0.075, post=0.55):
    """A handrail along the polyline pts (on the surface), standing `off` out along out(p) on posts."""
    pts = [V(p) for p in pts]
    lifted = [p + out(p) * off for p in pts]
    for a, b in zip(lifted[:-1], lifted[1:]):
        rails.append(bar(a, b, 0.032))
    total = [pts[0]]
    for a, b in zip(pts[:-1], pts[1:]):
        L = np.linalg.norm(b - a)
        k = max(1, int(L / post))
        for t in range(1, k + 1):
            total.append(a + (b - a) * t / k)
    for p in total:
        rails.append(bar(p, p + out(p) * off, 0.022))


def rad_out(p):
    q = np.array([p[0], 0.0, p[2]])
    return unit(q)


# =============================================================================================================
# 1. THE TUBE: forward shell and light shield, one blanket of aluminised Teflon in panels with taped seams.
#    The vertices are pushed in and out (a crumple that is zero on the seams and largest mid-panel, plus the
#    forward shell's stiffening rings showing through), and each panel takes one of three silvers.
# =============================================================================================================
NPHI, NY = 112, 84
PAN_PHI = 16                       # panels round the tube
LS_ROWS = [Y_ES1, -0.5, 0.45, 1.45, Y_LS0, 3.3, 4.0, 4.7, 5.4, 6.05, Y_FRONT]   # panel seams along it
rng = np.random.default_rng(20580)
noise = rng.uniform(-1, 1, (NPHI + 1, NY + 1))
noise[-1, :] = noise[0, :]
noise2 = rng.uniform(-1, 1, (NPHI + 1, NY + 1))
noise2[-1, :] = noise2[0, :]
ys = np.linspace(Y_ES1, Y_FRONT, NY + 1)
# snap the grid rows nearest the panel seams onto them, so the seams lie on grid lines
for yb in LS_ROWS:
    k = int(np.argmin(np.abs(ys - yb)))
    ys[k] = yb
phs = np.linspace(0, 360, NPHI + 1)


def seam_weight(phi, y):
    pw = 360.0 / PAN_PHI
    fu = (phi % pw) / pw
    k = np.searchsorted(LS_ROWS, y, side="right") - 1
    k = min(max(k, 0), len(LS_ROWS) - 2)
    fv = (y - LS_ROWS[k]) / (LS_ROWS[k + 1] - LS_ROWS[k])
    return math.sin(math.pi * fu) * math.sin(math.pi * min(max(fv, 0), 1))


# FOLDS: a crumpled blanket is long creases, not dimples. Each panel gets a few straight folds (ridges and
# valleys with a sharp tent profile), mostly running along the tube as the photographs show, plus a little
# fine noise; all of it fades to nothing on the taped seams.
frng = np.random.default_rng(125)
FOLDS = {}


def panel_of(phi, y):
    pw = 360.0 / PAN_PHI
    pi_ = int((phi % 360.0) // pw)
    pj = int(min(max(np.searchsorted(LS_ROWS, y, side="right") - 1, 0), len(LS_ROWS) - 2))
    return pi_, pj


def folds(key):
    if key not in FOLDS:
        pi_, pj = key
        pw = 2 * math.pi * R_T / PAN_PHI
        y0, y1 = LS_ROWS[pj], LS_ROWS[pj + 1]
        ls = y0 >= Y_LS0 - 1e-6
        out = []
        for _ in range(int(frng.integers(9, 15))):
            s0 = (pi_ + frng.uniform(0.1, 0.9)) * pw
            yc = frng.uniform(y0, y1)
            ang = frng.normal(0, 0.5) if frng.uniform() < 0.7 else math.pi / 2 + frng.normal(0, 0.4)
            amp = frng.uniform(0.015, 0.045) * (1.25 if ls else 0.9) * (1 if frng.uniform() < 0.6 else -1)
            out.append((s0, yc, math.cos(ang), math.sin(ang), frng.uniform(0.07, 0.17), amp))
        FOLDS[key] = out
    return FOLDS[key]


def tube_r(i, j):
    phi, y = phs[i], ys[j]
    w = seam_weight(phi, y)
    sarc = math.radians(phi % 360.0) * R_T
    off = 0.0
    for s0, yc, cy, cs, wd, a in folds(panel_of(phi - 1e-6 if i == NPHI else phi, y)):
        # distance from the fold's line (direction (cs along arc, cy along the tube))
        d = abs((sarc - s0) * cy - (y - yc) * cs)
        off += a * max(0.0, 1 - d / wd)
    r = R_T + w * (0.014 + off + 0.006 * noise[i, j])
    # the forward shell's outside rings show through as ridges
    if y < Y_LS0:
        for yr in (-0.95, -0.05, 0.95, 1.95):
            r += 0.03 * math.exp(-((y - yr) / 0.07) ** 2)
    # a ridge where the light shield meets the forward shell, and a flare at the front
    r += 0.04 * math.exp(-((y - Y_LS0) / 0.08) ** 2)
    r += 0.03 * math.exp(-((y - (Y_FRONT - 0.05)) / 0.08) ** 2)
    return r


TP = np.zeros((NPHI + 1, NY + 1, 3))
for i in range(NPHI + 1):
    for j in range(NY + 1):
        TP[i, j] = cpt(tube_r(i, j), phs[i], ys[j])
# tangential jitter makes the folds read as folds, not as bumps
for i in range(1, NPHI):
    for j in range(1, NY):
        TP[i, j] += tangent(phs[i]) * 0.012 * noise2[(i * 7) % NPHI, j] * seam_weight(phs[i], ys[j])

panel_cols = {}
groups = {FOIL_A: [], FOIL_B: [], FOIL_C: []}
cyc = [FOIL_A, FOIL_B, FOIL_A, FOIL_C, FOIL_B, FOIL_A]
for i in range(NPHI):
    for j in range(NY):
        pi_ = int((phs[i] + 1e-6) // (360.0 / PAN_PHI))
        yc = (ys[j] + ys[j + 1]) / 2
        pj = int(np.searchsorted(LS_ROWS, yc, side="right") - 1)
        key = (pi_, pj)
        if key not in panel_cols:
            panel_cols[key] = cyc[int(rng.integers(0, len(cyc)))]
        col = panel_cols[key]
        a, b, c, d = TP[i, j], TP[i + 1, j], TP[i + 1, j + 1], TP[i, j + 1]
        groups[col].append((np.array([a, b, c, d]), np.array([[0, 1, 2], [0, 2, 3]])))
for col, parts in groups.items():
    m.add("tube-blanket", "foil", col, orient_out(merge(parts)))

# taped seams: along the tube between panels, and round it at each row
seams = []
for k in range(PAN_PHI):
    phi = k * 360.0 / PAN_PHI
    seams.append(long_strip(R_T + 0.012, phi, Y_ES1 + 0.02, Y_FRONT - 0.02, 0.045, lift=0.0))
for yb in LS_ROWS[1:-1]:
    seams.append(ring_strip(R_T + 0.012, yb, 0.05, seg=96, lift=0.0))
m.add("tube-seams", "foil", FOIL_C, merge(seams))
# the front ring of the light shield and the aperture: black inside, with baffles
m.add("front-ring", "body", LIGHT, merge([cyl_patch(R_T + 0.07, 0, 360, Y_FRONT - 0.14, Y_FRONT, 72, 1),
                                          disc((0, Y_FRONT, 0), (0, 1, 0), R_T + 0.07, 72, r_in=1.43)]))
m.add("aperture", "body", BLACK, merge([cyl_patch(1.43, 0, 360, 3.2, Y_FRONT, 48, 1, inward=True)] +
                                      [orient_to(disc((0, y, 0), (0, 1, 0), 1.43, 48, r_in=1.18), (0, 1, 0)) for y in (5.9, 5.0, 4.1)] +
                                      [orient_to(disc((0, 3.2, 0), (0, 1, 0), 1.43, 48), (0, 1, 0))]))
# the secondary mirror's spider, seen far down the tube
m.add("spider", "body", DARK, merge([bar((0, 3.25, 0), cpt(1.42, a, 3.25), 0.04) for a in (0, 90, 180, 270)] +
                                    [frustum((0, 3.2, 0), (0, 3.45, 0), 0.32, 0.3, seg=20)]))

# =============================================================================================================
# 2. THE APERTURE DOOR: open 105 degrees on its hinge at the +Z rim; aluminium FOSR outside, black inside.
# =============================================================================================================
HINGE = np.array([0.0, Y_FRONT + 0.06, R_T + 0.06])
OPEN = 0.0   # shut: the press kit has it opened after the telescope's checkout, days after the release
t_dir = np.array([0, math.sin(math.radians(OPEN)), -math.cos(math.radians(OPEN))])    # hinge -> tip
s_dir = np.array([1.0, 0, 0])
n_out = unit(np.cross(t_dir, s_dir))
if n_out[2] < 0 or OPEN < 45:
    n_out = np.array([0.0, 1.0, 0.0]) if OPEN < 45 else -n_out
DW, DL = 1.58, 1.72                 # half width; straight part before the round end (3.3 m long)
outline = [(-DW, 0.0), (DW, 0.0)]
for k in range(0, 25):
    a = math.radians(-0 + 180 * k / 24)
    outline.append((DW * math.cos(a), DL + DW * math.sin(a)))
door_pts = [HINGE + s_dir * u + t_dir * (t + 0.05) for u, t in outline]
m.add("door", "body", WHITE, plate(door_pts, 0.07, n_out))
inner = [HINGE + s_dir * u * 0.985 + t_dir * (t * 0.99 + 0.07) - n_out * 0.037 for u, t in outline]
m.add("door-inside", "body", BLACK, orient_to(merge([(np.array(inner + [np.mean(inner, axis=0)]),
                                                       np.array([[len(inner), (k + 1) % len(inner), k] for k in range(len(inner))]))]), -n_out))
# the FOSR tape strips on its outside, a rim, the hinge beam and its arms, the latch fittings
strips = []
for k in range(1, 9):
    u = -DW + 2 * DW * k / 9
    tmax = DL + math.sqrt(max(DW ** 2 - u ** 2, 0)) - 0.06
    strips.append(bar(HINGE + s_dir * u + t_dir * 0.12 + n_out * 0.037, HINGE + s_dir * u + t_dir * tmax + n_out * 0.037, 0.012, 0.004, up=n_out))
m.add("door-tape", "body", LIGHT, merge(strips))
rim = []
for (u0, t0), (u1, t1) in zip(outline, outline[1:] + outline[:1]):
    a = HINGE + s_dir * u0 + t_dir * (t0 + 0.05)
    b = HINGE + s_dir * u1 + t_dir * (t1 + 0.05)
    rim.append(bar(a, b, 0.05, 0.09, up=n_out))
m.add("door-rim", "body", LIGHT, merge(rim))
m.add("door-hinge", "body", LIGHT, merge([bar(HINGE - s_dir * 1.45, HINGE + s_dir * 1.45, 0.14, 0.12)] +
                                         [bar(HINGE + s_dir * u, HINGE + s_dir * u + t_dir * 0.45 + n_out * 0.05, 0.08, 0.1) for u in (-1.2, 1.2)] +
                                         [bar(HINGE + s_dir * u - UP * 0.15 - np.array([0, 0, 0.05]), HINGE + s_dir * u, 0.12, 0.12) for u in (-1.2, 0.0, 1.2)]))
m.add("door-fittings", "foil", GOLD, merge([box(HINGE + s_dir * u + t_dir * t + n_out * 0.07, (0.12, 0.08, 0.08), np.column_stack([s_dir, t_dir, n_out]))
                                            for u, t in ((-1.3, 0.3), (1.3, 0.3), (0.0, DL + DW - 0.06), (-1.45, 1.6), (1.45, 1.6))]))

# =============================================================================================================
# 3. THE EQUIPMENT SECTION: a twelve-sided ring round the tube's aft end. Forward, a blanketed collar with
#    gold handles; aft of it the bays' flat doors (r10: louvred windows, blanketed doors, polished riveted
#    panels; SM4's white NOBL panels; the round decals on the doors either side of +Z), a frame round each.
# =============================================================================================================
NB = 12
apo = R_ES * math.cos(math.pi / NB)
side = 2 * R_ES * math.sin(math.pi / NB)
Y_COL = Y_ES1 - 0.45                     # collar / bay doors
nobl_bays = {2, 3, 6}                     # NOBL white on these (azimuth 15 + 30k)
louvre_bays = {7, 8}                      # the two louvred windows either side of -Z (r10)
es_white, es_door, es_dark, es_lines, es_metal, es_foil = [], [], [], [], [], {FOIL_A: [], FOIL_B: [], FOIL_C: []}
dec, decr = [], []
H = Y_COL - Y_ES0
for k in range(NB):
    phi = 15.0 + 30.0 * k
    n = radial(phi)
    t = tangent(phi)
    Rm = np.column_stack([t, UP, n])
    c = n * apo + UP * (Y_ES0 + Y_COL) / 2
    # the bay's structure and frame
    es_metal.append(box(c - n * 0.03, (side, H, 0.06), Rm, faces="Z"))
    for s in (-1, 1):
        es_lines.append(box(c + t * s * (side / 2 - 0.03) + n * 0.012, (0.06, H, 0.035), Rm))
    es_lines.append(box(c + UP * (H / 2 - 0.03) + n * 0.012, (side, 0.06, 0.035), Rm))
    es_lines.append(box(c - UP * (H / 2 - 0.03) + n * 0.012, (side, 0.06, 0.035), Rm))
    hu, hl = 0.52, H - 0.52 - 0.12          # upper (forward) door and lower panel heights
    cu = c + UP * (H / 2 - 0.06 - hu / 2)
    cl = c - UP * (H / 2 - 0.06 - hl / 2)
    # lower: a polished riveted panel (white NOBL on the NOBL bays)
    if k in nobl_bays:
        es_white.append(box(cl + n * 0.03, (side - 0.14, hl, 0.04), Rm))
        es_lines.append(box(cl + n * 0.052 + UP * 0.05, (side - 0.5, 0.25, 0.006), Rm))
        es_dark.append(box(cl + n * 0.052 - UP * 0.25 + t * 0.3, (0.16, 0.12, 0.006), Rm))
    else:
        es_door.append(box(cl + n * 0.025, (side - 0.14, hl, 0.03), Rm))
        for dy in (-hl / 4, hl / 4):
            es_lines.append(box(cl + n * 0.042 + UP * dy, (side - 0.2, 0.012, 0.004), Rm))
        es_lines.append(box(cl + n * 0.042, (0.012, hl - 0.1, 0.004), Rm))
    # upper: louvred window, blanketed door or NOBL
    if k in louvre_bays:
        es_white.append(box(cu + n * 0.03, (side - 0.16, hu, 0.05), Rm, faces="xXyYZ"))
        es_dark.append(box(cu + n * 0.058, (side - 0.36, hu - 0.16, 0.006), Rm))
        for j in range(7):
            es_white.append(box(cu + n * 0.064 + t * (-(side - 0.4) / 2 + j * (side - 0.4) / 6), (0.025, hu - 0.18, 0.012), Rm))
    elif k in nobl_bays or k in (4, 5):
        es_white.append(box(cu + n * 0.03, (side - 0.14, hu, 0.04), Rm))
        if k in (4, 5):
            # the round decals photographed on the two doors either side of +Z (r11, r12)
            p = cu + n * 0.054 + t * (0.18 if k == 4 else -0.18)
            dec.append(disc(p, n, 0.12, 16))
            decr.append(disc(p - n * 0.002, n, 0.16, 16, r_in=0.12))
    else:
        es_foil[(FOIL_A, FOIL_B, FOIL_C)[k % 3]].append(grid(cu + n * 0.035, t, UP, side - 0.12, hu, 4, 3, crinkle=0.02, seed=60 + k))
    handrail([c + n * 0.03 + t * (side / 2 - 0.1) + UP * (H / 2 - 0.2), c + n * 0.03 + t * (side / 2 - 0.1) - UP * (H / 2 - 0.2)],
             lambda p, n=n: n, off=0.07)
m.add("es-structure", "body", METAL, merge(es_metal))
m.add("es-frames", "body", METAL, merge(es_lines))
m.add("es-nobl", "body", WHITE, merge(es_white))
m.add("es-doors", "body", SHROUD_D, merge(es_door))
m.add("es-dark", "body", BLACK, merge(es_dark))
for col, parts in es_foil.items():
    if parts:
        m.add("es-door-blanket", "foil", col, merge(parts))
m.add("es-decals", "solar-panel", CELL, merge(dec))
m.add("es-decal-rims", "body", WHITE, merge(decr))
# the blanketed collar forward of the bays: twelve crumpled facets, gold handles
for k in range(NB):
    phi = 15.0 + 30.0 * k
    a0, a1 = phi - 15, phi + 15
    q = quad(cpt(R_ES, a0, Y_COL), cpt(R_ES, a1, Y_COL), cpt(R_ES, a1, Y_ES1), cpt(R_ES, a0, Y_ES1), 6, 4, crinkle=0.025, seed=80 + k, outward=radial(phi))
    m.add("es-collar", "foil", (FOIL_A, FOIL_B, FOIL_A, FOIL_C)[k % 4], q)
    rails.append(box(cpt(apo + 0.06, phi + 6, Y_COL + 0.25), (0.05, 0.16, 0.04), np.column_stack([tangent(phi), UP, radial(phi)])))
# the annulus from the tube up to the Equipment Section, blanketed
ann = []
ang = np.linspace(0, 360, 49)
for a0, a1 in zip(ang[:-1], ang[1:]):
    ann.append((np.array([cpt(R_T, a0, Y_ES1), cpt(R_T, a1, Y_ES1), cpt(R_ES * 0.99, a1, Y_ES1), cpt(R_ES * 0.99, a0, Y_ES1)]),
                np.array([[0, 1, 2], [0, 2, 3]])))
m.add("es-annulus", "foil", FOIL_B, orient_to(merge(ann), (0, 1, 0)))
m.add("es-aft-ring", "body", METAL, merge([orient_to(disc((0, Y_ES0 + 0.003, 0), (0, 1, 0), R_ES + 0.03, 48, r_in=R_AS - 0.02), (0, 1, 0))]))
handrail([cpt(R_ES - 0.02, a, Y_ES1 + 0.02) for a in np.linspace(8, 352, 30)], lambda p: np.array([0, 1.0, 0]), off=0.08, post=0.9)
handrail([cpt(apo, a, Y_COL) for a in np.linspace(10, 170, 10)], rad_out, off=0.07, post=0.9)
handrail([cpt(apo, a, Y_COL) for a in np.linspace(190, 350, 10)], rad_out, off=0.07, post=0.9)

# =============================================================================================================
# 4. THE AFT SHROUD: silvered FOSR panels in a grid of riveted seams; on -Z (r10) a white band at the top, the
#    fixed-head star trackers' two big dark light shades and a round port, a gold handrail down the middle,
#    the big white radiator toward -X; on the +Z side the access doors with handrails and latches.
# =============================================================================================================
AS_ROWS = np.linspace(Y_AFT, Y_ES0, 8)
AS_COLS = 20
asg = {SHROUD: [], SHROUD_D: []}
for i in range(AS_COLS):
    for j in range(len(AS_ROWS) - 1):
        col = SHROUD if rng.uniform() < 0.75 else SHROUD_D
        a0, a1 = 360 * i / AS_COLS, 360 * (i + 1) / AS_COLS
        asg[col].append(cyl_patch(R_AS, a0, a1, AS_ROWS[j], AS_ROWS[j + 1], 3, 1))
for col, parts in asg.items():
    m.add("aft-shroud", "body", col, merge(parts))
lines = [ring_strip(R_AS, y, 0.022, seg=96, lift=0.004) for y in AS_ROWS[1:-1]]
lines += [long_strip(R_AS, 360 * i / AS_COLS, Y_AFT + 0.05, Y_ES0 - 0.05, 0.02, lift=0.004) for i in range(AS_COLS)]
# rivet rows halfway across some panels (the photographs' quilted look)
lines += [long_strip(R_AS, 360 * (i + 0.5) / AS_COLS, AS_ROWS[j] + 0.06, AS_ROWS[j + 1] - 0.06, 0.008, lift=0.004)
          for i in range(AS_COLS) for j in range(len(AS_ROWS) - 1) if (i + 2 * j) % 3 == 0]
# access doors on the +Z side: heavier outlines, handrails both sides, latches
latches = []
for phi in (35, 145):
    w = math.degrees(1.3 / R_AS)
    y0, y1 = Y_AFT + 0.35, Y_ES0 - 0.3
    for s in (-1, 1):
        lines.append(long_strip(R_AS, phi + s * w / 2, y0, y1, 0.05, lift=0.008))
        handrail([cpt(R_AS, phi + s * (w / 2 - 4), y0 + 0.25), cpt(R_AS, phi + s * (w / 2 - 4), y1 - 0.25)], rad_out, off=0.075)
    lines.append(ring_strip(R_AS, y0, 0.05, phi - w / 2, phi + w / 2, seg=8, lift=0.008))
    lines.append(ring_strip(R_AS, y1, 0.05, phi - w / 2, phi + w / 2, seg=8, lift=0.008))
    for y in np.linspace(y0 + 0.3, y1 - 0.3, 4):
        latches.append(box(cpt(R_AS + 0.025, phi + w / 2, y), (0.1, 0.12, 0.06), np.column_stack([tangent(phi + w / 2), UP, radial(phi + w / 2)])))
# the white band at the top of the -Z face, with a framed rectangle in it (r10)
lines.append(long_strip(R_AS, -90, Y_ES0 - 0.6, Y_AFT + 0.3, 0.02, lift=0.006))
m.add("aft-band", "body", WHITE, cyl_patch(R_AS + 0.02, -126, -56, Y_ES0 - 0.8, Y_ES0 - 0.03, 12, 1))
m.add("aft-band-detail", "body", LIGHT, merge([ring_strip(R_AS + 0.02, Y_ES0 - 0.3, 0.04, -100, -78, seg=4, lift=0.01),
                                               ring_strip(R_AS + 0.02, Y_ES0 - 0.62, 0.04, -100, -78, seg=4, lift=0.01),
                                               long_strip(R_AS + 0.02, -100, Y_ES0 - 0.64, Y_ES0 - 0.28, 0.04, lift=0.01),
                                               long_strip(R_AS + 0.02, -78, Y_ES0 - 0.64, Y_ES0 - 0.28, 0.04, lift=0.01)]))
m.add("aft-band-dark", "body", BLACK, merge([long_strip(R_AS + 0.02, a, Y_ES0 - 0.6, Y_ES0 - 0.3, 0.07, lift=0.012) for a in (-112, -66)]))
m.add("aft-lines", "body", METAL, merge(lines))
m.add("aft-latches", "body", DARK, merge(latches))
# the big white radiator toward -X (r10's right-hand edge), standing proud, with a frame and fittings
for phi_c, span, y0, y1 in ((-148, 52, Y_AFT + 0.2, Y_ES0 - 0.03),):
    m.add("radiator", "body", WHITE, cyl_patch(R_AS + 0.06, phi_c - span / 2, phi_c + span / 2, y0, y1, 10, 2))
    fr = [long_strip(R_AS + 0.06, phi_c + s * span / 2, y0, y1, 0.05, lift=0.006) for s in (-1, 1)]
    fr += [ring_strip(R_AS + 0.06, y, 0.05, phi_c - span / 2, phi_c + span / 2, seg=10, lift=0.006) for y in (y0, y1)]
    m.add("radiator-frame", "body", LIGHT, merge(fr))
    m.add("radiator-gap", "body", BLACK, cyl_patch(R_AS + 0.01, phi_c + span / 2, phi_c + span / 2 + 3, y0, y1, 1, 1))
    bolts = [box(cpt(R_AS + 0.08, phi_c + rng.uniform(-span / 2.4, span / 2.4), rng.uniform(y0 + 0.1, y1 - 0.1)), (0.06, 0.06, 0.06)) for _ in range(26)]
    m.add("radiator-bolts", "body", METAL, merge(bolts))
# the fixed-head star trackers' light shades: two big dark ovals and a round port on -Z (r10, r02)
shades, shades_in, shade_rims = [], [], []
for phi, y, a, b in ((-112, -4.85, 0.34, 0.53), (-68, -4.85, 0.34, 0.53), (-90, -4.13, 0.27, 0.27)):
    n, t = radial(phi), tangent(phi)
    c = n * (R_AS + 0.02) + UP * y
    ring_o, ring_i, ring_d = [], [], []
    K = 28
    for k in range(K):
        th = 2 * math.pi * k / K
        ring_o.append(c + t * a * 1.14 * math.cos(th) + UP * b * 1.1 * math.sin(th) + n * 0.03)
        ring_i.append(c + t * a * math.cos(th) + UP * b * math.sin(th) + n * 0.035)
        ring_d.append(c + t * a * 0.7 * math.cos(th) + UP * b * 0.7 * math.sin(th) + UP * 0.04 + n * 0.04)
    P = np.array(ring_i + [c - n * 0.05])
    shades.append(orient_to((P, np.array([[K, k, (k + 1) % K] for k in range(K)])), n))
    P = np.array(ring_d + [c + n * 0.04])
    shades_in.append(orient_to((P, np.array([[K, k, (k + 1) % K] for k in range(K)])), n))
    P2 = np.array(ring_o + ring_i)
    F2 = [[k, (k + 1) % K, K + (k + 1) % K] for k in range(K)] + [[k, K + (k + 1) % K, K + k] for k in range(K)]
    shade_rims.append(orient_to((P2, np.array(F2)), n))
m.add("fhst-shades", "body", DARK, merge(shades))
m.add("fhst-shades-in", "body", BLACK, merge(shades_in))
m.add("fhst-rims", "body", LIGHT, merge(shade_rims))
handrail([cpt(R_AS, -90, -4.5), cpt(R_AS, -90, Y_AFT + 0.4)], rad_out, off=0.07)
# gold handrails round the aft end
handrail([cpt(R_AS, a, Y_AFT + 0.22) for a in np.linspace(10, 170, 12)], rad_out, off=0.07, post=0.8)
handrail([cpt(R_AS, a, Y_AFT + 0.22) for a in np.linspace(190, 350, 12)], rad_out, off=0.07, post=0.8)

# =============================================================================================================
# 5. THE AFT BULKHEAD: silver panels, three radial beams, dark tiles, four vent ports, handrails, the gold rim,
#    and SM4's Soft Capture Mechanism ring standing off its centre.
# =============================================================================================================
BN = np.array([0, -1.0, 0])
m.add("bulkhead", "body", SHROUD, orient_to(disc((0, Y_AFT, 0), BN, R_AS, 72), BN))
m.add("bulkhead-rim", "foil", GOLD, merge([cyl_patch(R_AS + 0.03, 0, 360, Y_AFT - 0.02, Y_AFT + 0.1, 72, 1),
                                           orient_to(disc((0, Y_AFT - 0.02, 0), BN, R_AS + 0.03, 72, r_in=R_AS - 0.06), BN)]))
beams, tiles = [], []
for a in (150, 240, 330):
    beams.append(bar(cpt(0.75, a, Y_AFT - 0.04), cpt(R_AS - 0.08, a, Y_AFT - 0.04), 0.14, 0.08, up=BN))
for a in range(30, 360, 60):
    beams.append(bar(cpt(0.2, a, Y_AFT - 0.01), cpt(R_AS - 0.1, a, Y_AFT - 0.01), 0.025, 0.02, up=BN))
# the dark tiles in a chequer near the rim (r04)
for k in range(46):
    a = rng.uniform(0, 360)
    r = rng.uniform(1.3, 2.0)
    if any(abs(((a - b + 180) % 360) - 180) < 9 for b in (150, 240, 330)):
        continue
    tiles.append(grid(cpt(r, a, Y_AFT - 0.006), radial(a), tangent(a), rng.uniform(0.1, 0.22), rng.uniform(0.08, 0.25)))
m.add("bulkhead-beams", "body", LIGHT, merge(beams))
m.add("bulkhead-tiles", "body", DARK, orient_to(merge(tiles), BN))
ports, port_rims = [], []
for a in (68, 96, 278, 306):
    c = cpt(1.45, a, Y_AFT - 0.01)
    ports.append(orient_to(disc(c + BN * 0.005, BN, 0.27, 20), BN))
    port_rims.append(torus(c + BN * 0.02, BN, 0.3, 0.035, 20, 4))
    port_rims.append(frustum(c, c - BN * 0.0 + BN * 0.06, 0.27, 0.25, seg=20, caps=False))
m.add("bulkhead-ports", "body", DARK, merge(ports))
m.add("bulkhead-port-rims", "body", LIGHT, merge(port_rims))
# handrail loops on the bulkhead (r04)
handrail([cpt(1.0, 120, Y_AFT), cpt(1.65, 135, Y_AFT), cpt(1.75, 160, Y_AFT), cpt(1.2, 175, Y_AFT)], lambda p: BN, off=0.08)
handrail([cpt(0.9, 290, Y_AFT), cpt(1.6, 300, Y_AFT), cpt(1.9, 318, Y_AFT)], lambda p: BN, off=0.08)
handrail([cpt(0.8, 20, Y_AFT), cpt(1.7, 10, Y_AFT)], lambda p: BN, off=0.08)
# the Soft Capture Mechanism: a ring on six struts, three alignment petals, a central box
SC = np.array([0.15, Y_AFT - 0.42, -0.1])
m.add("scm-ring", "body", METAL, merge([torus(SC, BN, 0.62, 0.065, 36, 6)] +
                                       [orient_to(disc(SC + BN * 0.02, BN, 0.7, 36, r_in=0.56), BN)]))
struts = []
for k in range(6):
    a = 60 * k + 15
    p = SC + cpt(0.6, a, 0) * 1.0
    q = np.array([0.15, Y_AFT, -0.1]) + cpt(0.85, a + (25 if k % 2 else -25), 0)
    struts.append(rod(p, q, 0.03, 6))
m.add("scm-struts", "body", LIGHT, merge(struts))
pet = []
for k in range(3):
    a = 120 * k + 90
    p0 = SC + cpt(0.6, a - 14, 0)
    p1 = SC + cpt(0.6, a + 14, 0)
    p2 = SC + cpt(0.32, a, 0) + BN * 0.18
    pet.append(plate([p0, p1, p2], 0.02))
m.add("scm-petals", "body", DARK, merge(pet))
m.add("scm-core", "body", LIGHT, merge([box((0.15, Y_AFT - 0.15, -0.1), (0.5, 0.3, 0.5)), box((0.6, Y_AFT - 0.12, 0.45), (0.35, 0.24, 0.3)),
                                        box((-0.55, Y_AFT - 0.1, -0.6), (0.3, 0.2, 0.45))]))
m.add("scm-targets", "body", BLACK, merge([orient_to(disc((0.15, Y_AFT - 0.305, -0.1), BN, 0.12, 12), BN)]))
# umbilical boxes and the hump of electronics on the bulkhead
m.add("bulkhead-boxes", "body", METAL, merge([box(cpt(1.2, a, Y_AFT - 0.1), (0.35, 0.2, 0.3), None) for a in (150, 280, 0)]))

# =============================================================================================================
# 6. THE SOLAR ARRAYS (SA3): on masts along +-X at the Equipment Section's forward edge; each wing two
#    panels 3.6 x 2.45 m either side of its central mast, cells to +Z, white backs with silver bracing.
# =============================================================================================================
X_IN, X_OUT = 2.85, 5.30
PL, GAP = 3.6, 0.36
wing_parts = {}


PART = "rest"


def wadd(col, role, mesh):
    wing_parts.setdefault((s, PART, role, col), []).append(mesh)


for s in (-1, 1):
    PART = "rest"
    ex = np.array([s, 0.0, 0.0])
    # the stub mast and the drive at its root, the elbow at the wing
    root = np.array([s * (R_T + 0.02), Y_SA, 0.0])
    elbow = np.array([s * X_IN, Y_SA, 0.0])
    wadd(METAL, "body", bar(root, elbow, 0.16, 0.16))
    wadd(GOLD, "foil", box(root + ex * 0.2, (0.42, 0.42, 0.42), crinkle=0.012, div=0.14, seed=31 + s))
    wadd(LIGHT, "body", box(root + ex * 0.45, (0.12, 0.5, 0.5)))
    PART = "mast"          # from here out: the mast, the drum and the truss (folded along the tube when stowed)
    wadd(METAL, "body", box(elbow, (0.3, 0.42, 0.3)))
    # the drum the blankets wind on, across the mast (the Moment scales the blankets down to it to stow them)
    wadd(SHROUD, "body", frustum(np.array([s * (X_IN + 0.06), Y_SA, 0.0]), np.array([s * (X_OUT - 0.06), Y_SA, 0.0]), 0.2, 0.2, seg=20))
    wadd(METAL, "body", frustum(np.array([s * (X_IN + 0.0), Y_SA, 0.0]), np.array([s * (X_IN + 0.06), Y_SA, 0.0]), 0.24, 0.24, seg=20))
    wadd(METAL, "body", frustum(np.array([s * (X_OUT - 0.06), Y_SA, 0.0]), np.array([s * X_OUT, Y_SA, 0.0]), 0.24, 0.24, seg=20))
    # the wing's own mast across it, a truss, and the spreader at its tip
    tip = np.array([s * X_OUT, Y_SA, 0.0])
    for dy in (-0.11, 0.11):
        for dz in (-0.06, 0.06):
            wadd(LIGHT, "body", bar(elbow + np.array([0, dy, dz]), tip + np.array([0, dy, dz]), 0.03, 0.03))
    for k in range(9):
        x = X_IN + (X_OUT - X_IN) * k / 8
        p = np.array([s * x, Y_SA, 0])
        wadd(LIGHT, "body", bar(p + np.array([0, -0.11, 0.06]), p + np.array([0, 0.11, 0.06]), 0.02, 0.02))
        wadd(LIGHT, "body", bar(p + np.array([0, -0.11, -0.06]), p + np.array([0, 0.11, -0.06]), 0.02, 0.02))
    wadd(METAL, "body", box(tip, (0.12, GAP + 0.1, 0.14)))
    PART = "array"
    for side_y in (-1, 1):
        yc = Y_SA + side_y * (GAP / 2 + PL / 2)
        c = np.array([s * (X_IN + X_OUT) / 2, yc, 0.0])
        W = X_OUT - X_IN
        Rw = np.column_stack([ex, UP, np.cross(ex, UP)])   # third column = +-Z
        nz = np.array([0, 0, 1.0])
        # substrate, white back, frame
        wadd(LIGHT, "body", box(c, (W, PL, 0.04), np.eye(3)))
        wadd(ARR_GRID, "body", grid(c - nz * 0.023, np.array([0, 1.0, 0]), np.array([1.0, 0, 0]), PL - 0.06, W - 0.06))
        for e in (-1, 1):
            wadd(LIGHT, "body", box(c + ex * e * (W / 2 - 0.02), (0.06, PL + 0.04, 0.08), np.eye(3)))
            wadd(LIGHT, "body", box(c + UP * e * (PL / 2 - 0.02), (W, 0.05, 0.07), np.eye(3)))
        # back bracing: an X and a cross bar, a centre line, the yellow harness ties
        back = c - nz * 0.05
        for e in (-1, 1):
            wadd(LIGHT, "body", bar(back + ex * (-W / 2 + 0.05) + UP * e * (PL / 2 - 0.05), back + ex * (W / 2 - 0.05) - UP * e * (PL / 2 - 0.05), 0.04, 0.04))
        wadd(LIGHT, "body", bar(back + ex * (-W / 2 + 0.05), back + ex * (W / 2 - 0.05), 0.04, 0.04))
        wadd(METAL, "body", bar(back + UP * (-PL / 2 + 0.05) + nz * 0.022, back + UP * (PL / 2 - 0.05) + nz * 0.022, 0.012, 0.004))
        for e in (-0.25, 0.25):
            for k in range(10):
                yy = -PL / 2 + 0.2 + k * (PL - 0.4) / 9
                wadd(RAIL, "body", box(back + nz * 0.024 + ex * e * W + UP * yy, (0.03, 0.08, 0.006)))
        # cells: five strips along the tube, busbars between them
        wadd(LIGHT, "body", grid(c + nz * 0.022, ex, UP, W - 0.08, PL - 0.08))
        nst, ncell = 5, 9
        sw = (W - 0.1 - (nst - 1) * 0.035) / nst
        cl = (PL - 0.1 - (ncell - 1) * 0.01) / ncell
        tiles_ = []
        for a in range(nst):
            for b in range(ncell):
                xx = -W / 2 + 0.05 + sw / 2 + a * (sw + 0.035)
                yy = -PL / 2 + 0.05 + cl / 2 + b * (cl + 0.01)
                tiles_.append(grid(c + nz * 0.026 + ex * xx + UP * yy, ex if s > 0 else -ex, UP if s > 0 else UP, sw, cl))
        wadd(ARR_CELL, "solar-panel", orient_to(merge(tiles_), nz))
    PART = "mast"
    # hinge brackets from the mast to each panel
    for side_y in (-1, 1):
        for x in (X_IN + 0.3, X_OUT - 0.3):
            p = np.array([s * x, Y_SA + side_y * 0.11, 0])
            wadd(METAL, "body", bar(p, p + np.array([0, side_y * (GAP / 2 - 0.08), 0]), 0.08, 0.06))

Rroll = rot("x", -ARRAY_ROLL)
for (side_, part_, role, col), parts in wing_parts.items():
    mesh = merge(parts)
    m.cur = "rest" if part_ == "rest" else "%s-%s" % (part_, "l" if side_ < 0 else "r")
    m.add("solar-array", role, col, xf(mesh, Rroll, about=(0, Y_SA, 0)))
m.cur = "rest"

# =============================================================================================================
# 7. THE HIGH-GAIN ANTENNAS: dishes ~1.3 m on masts along +-Z from the forward shell, gimbal boxes.
# =============================================================================================================
for s, aim in ((1, (0.25, 0.55, 0.8)), (-1, (-0.2, -0.35, -0.9))):
    m.cur = "hga-r" if s > 0 else "hga-l"
    nz = np.array([0, 0, float(s)])
    root = np.array([0, Y_HGA, s * (R_T + 0.0)])
    top = np.array([0, Y_HGA, s * 4.55])
    m.add("hga-drive", "foil", GOLD, box(root + nz * 0.12, (0.4, 0.4, 0.26), crinkle=0.01, div=0.13, seed=40 + s))
    m.add("hga-mast", "body", METAL, merge([bar(root + nz * 0.2, top, 0.11, 0.11),
                                             box(root + nz * 1.4, (0.16, 0.16, 0.14)), box(root + nz * 0.4, (0.22, 0.3, 0.14))]))
    gim = top + nz * 0.12
    m.add("hga-gimbal", "body", LIGHT, merge([box(gim, (0.26, 0.26, 0.2)), box(gim + nz * 0.14 + np.array([0.0, 0.05, 0]), (0.16, 0.34, 0.12))]))
    m.add("hga-gimbal-gold", "foil", GOLD, box(gim + np.array([0.18, 0, 0]), (0.12, 0.2, 0.16)))
    ax = unit(aim)
    dc = gim + nz * 0.25 + ax * 0.15
    prof = [(0.17 * (r / 0.66) ** 2, r) for r in np.linspace(0.02, 0.66, 9)]
    front = lathe(dc, ax, prof, 32)
    front = orient_to(front, ax) if False else front
    # the concave face looks along ax, the back the other way
    P, F = front
    cen = dc + ax * 0.09
    nrm = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    cc = P[F].mean(axis=1)
    inward = np.einsum("ij,ij->i", nrm, cen - cc) > 0
    Ff = F.copy()
    Ff[~inward] = Ff[~inward][:, ::-1]
    m.add("hga-dish", "body", DARK, (P, Ff))
    m.add("hga-dish-back", "body", METAL, (P - ax * 0.01, Ff[:, ::-1]))
    m.add("hga-dish-rim", "body", LIGHT, torus(dc + ax * 0.17, ax, 0.66, 0.015, 32, 4))
    m.add("hga-feed", "body", LIGHT, merge([frustum(dc, dc + ax * 0.16, 0.06, 0.035, seg=10)]))
m.cur = "rest"

# =============================================================================================================
# 8. SMALL THINGS: low-gain antennas, magnetometers and sun sensors at the front, grapple fixtures, scuff
#    plates, trunnion pins, handrails along the tube.
# =============================================================================================================
# low-gain antennas (white spiral cones), one at the front of the light shield, one on the bulkhead's rim
fl = np.array([0.0, Y_FRONT - 0.35, -(R_T + 0.12)])
m.add("lga", "body", LIGHT, merge([frustum(fl, fl + np.array([0, 0.42, -0.0]), 0.13, 0.04, seg=16), sphere(fl + np.array([0, 0.42, 0]), 0.04, 4, 10)]))
m.add("lga-mount", "body", METAL, merge([bar(fl - np.array([0, 0.1, 0]), fl + np.array([0, 0.05, 0.14]), 0.08, 0.08)]))
al = cpt(R_AS - 0.15, 40, Y_AFT - 0.05)
ad = unit(radial(40) * 0.75 + np.array([0, -0.65, 0]))
m.add("lga", "body", WHITE, merge([frustum(al, al + ad * 0.42, 0.14, 0.05, seg=16), sphere(al + ad * 0.42, 0.05, 4, 10)]))
m.add("lga-mount", "body", METAL, box(al, (0.2, 0.12, 0.2)))
# magnetometers on gold truss brackets either side of the light shield's front (r10)
for s in (-1, 1):
    base = np.array([s * R_T, 5.75, 0.0])
    tip = base + np.array([s * 0.5, 0, 0])
    tr = []
    for dy in (-0.3, 0.3):
        for dz in (-0.25, 0.25):
            tr.append(rod(base + np.array([0, dy, dz]), tip + np.array([0, dy * 0.4, dz * 0.4]), 0.018, 5))
    tr.append(rod(base + np.array([0, -0.3, 0.25]), tip + np.array([0, 0.12, -0.1]), 0.014, 5))
    tr.append(rod(base + np.array([0, 0.3, -0.25]), tip + np.array([0, -0.12, 0.1]), 0.014, 5))
    m.add("mag-truss", "foil", GOLD, merge(tr))
    m.add("magnetometer", "body", LIGHT, box(tip + np.array([s * 0.12, 0, 0]), (0.24, 0.32, 0.22)))
    m.add("magnetometer-cap", "body", BLACK, box(tip + np.array([s * 0.25, 0, 0]), (0.03, 0.2, 0.14)))
# coarse sun sensors (small boxes with black eyes) on the +Z side near the front, two on the aft shroud
css = [(cpt(R_T + 0.06, 80, 5.05), radial(80)), (cpt(R_T + 0.06, 100, 4.45), radial(100)),
       (cpt(R_AS + 0.05, 250, -6.1), radial(250)), (cpt(R_AS + 0.05, 290, -6.1), radial(290))]
for p, n in css:
    Rm = np.column_stack([tangent(math.degrees(math.atan2(n[2], n[0]))), UP, n])
    m.add("css", "body", LIGHT, box(p, (0.18, 0.22, 0.12), Rm))
    m.add("css-eye", "body", BLACK, disc(p + n * 0.062, n, 0.045, 10))
# boxes under the blanket on the light shield (r11a) and a blanketed hump
for phi, y, sz in ((60, 5.6, (0.3, 0.35, 0.18)), (110, 3.9, (0.25, 0.3, 0.16)), (200, 5.2, (0.35, 0.3, 0.2)), (300, 4.4, (0.3, 0.4, 0.18))):
    Rm = np.column_stack([tangent(phi), UP, radial(phi)])
    m.add("ls-box", "foil", FOIL_A, box(cpt(R_T + sz[2] / 2, phi, y), sz, Rm, crinkle=0.012, div=0.1, seed=int(phi)))
# grapple fixtures next to the HGA drives
for phi in (125, 305):
    n = radial(phi)
    p = cpt(R_T + 0.03, phi, Y_HGA + 0.55)
    m.add("grapple-base", "body", LIGHT, frustum(p, p + n * 0.05, 0.2, 0.2, seg=16))
    m.add("grapple-shaft", "body", METAL, merge([frustum(p + n * 0.05, p + n * 0.3, 0.035, 0.035, seg=8),
                                                 box(p + n * 0.3, (0.22, 0.04, 0.04), np.column_stack([tangent(phi), UP, n]))]))
    m.add("grapple-target", "body", BLACK, merge([box(p + n * 0.1 + UP * 0.12, (0.05, 0.04, 0.12), np.column_stack([tangent(phi), UP, n]))]))
# scuff plates: gold discs on three struts, beside where the arrays stow (light shield and ES)
for s in (-1, 1):
    for y, phi_off, R0 in ((4.8, 0, R_T), (-2.75, -28, R_ES - 0.05)):
        phi = (0 if s > 0 else 180) + (phi_off if s > 0 else -phi_off)
        n = radial(phi)
        c = cpt(R0 + 0.75, phi, y)
        m.add("scuff-plate", "foil", GOLD, merge([frustum(c, c + n * 0.04, 0.3, 0.28, seg=20)]))
        legs = []
        for k in range(3):
            a = 2 * math.pi * k / 3
            q = cpt(R0, phi + math.degrees(0.28 * math.cos(a) / R0), y + 0.28 * math.sin(a))
            legs.append(rod(q, c - n * 0.01, 0.025, 6))
        m.add("scuff-struts", "foil", GOLD, merge(legs))
# aft trunnion pins in the trunnion bays at +-X
for s in (-1, 1):
    p = np.array([s * apo, (Y_ES0 + Y_ES1) / 2, 0])
    m.add("trunnion", "body", LIGHT, merge([frustum(p, p + np.array([s * 0.3, 0, 0]), 0.11, 0.11, seg=14),
                                             frustum(p + np.array([s * 0.3, 0, 0]), p + np.array([s * 0.36, 0, 0]), 0.15, 0.15, seg=14)]))
# the forward trunnion/keel fitting under the forward shell
m.add("keel", "body", METAL, merge([box(cpt(R_T + 0.12, 270, 1.0), (0.3, 0.6, 0.24)), frustum(cpt(R_T + 0.2, 270, 1.0), cpt(R_T + 0.55, 270, 1.0), 0.07, 0.07, seg=10)]))
# handrails along the tube (six lines) and round its front and middle
for phi in (22, 68, 158, 202, 248, 338):
    handrail([cpt(R_T, phi, Y_ES1 + 0.2), cpt(R_T, phi, Y_LS0 - 0.15)], rad_out, off=0.08)
    handrail([cpt(R_T, phi, Y_LS0 + 0.15), cpt(R_T, phi, Y_FRONT - 0.3)], rad_out, off=0.08)
for y in (Y_FRONT - 0.22, 3.0):
    for a0 in (5, 95, 185, 275):
        handrail([cpt(R_T, a, y) for a in np.linspace(a0, a0 + 80, 8)], rad_out, off=0.08, post=0.7)
# waveguide / cable run along the tube's -Z side to the forward LGA
m.add("waveguide", "body", LIGHT, merge([bar(cpt(R_T + 0.1, 262, Y_ES1 + 0.1), cpt(R_T + 0.1, 268, Y_FRONT - 0.4), 0.06, 0.06)]))



m.add("handrails", "body", RAIL, merge(rails))

# the two flight-releasable grapple fixtures next to the HGA drives (NASA media guide sec. 5: "two grapple fixtures next to the HGA drives"):
# a base plate with a target, and the probe the arm's snare closes on. The fixture on +Z is the one the arm takes in the Moment: its probe's tip
# is GRAPPLE below (hubble_sts31 frame), and the tools/moments-build/hubble.mjs reads it from here.
GRAPPLE = (0.62, -0.5, R_T + 0.12 + 0.42)
for sz in (1, -1):
    n_ = np.array([0, 0, float(sz)])
    base = np.array([0.62, -0.5, sz * (R_T + 0.1)])
    m.add("grapple-plate", "body", LIGHT, box(base, (0.46, 0.46, 0.06)))
    m.add("grapple-target", "body", BLACK, box(base + n_ * 0.035, (0.34, 0.06, 0.012)))
    m.add("grapple-target", "body", BLACK, box(base + n_ * 0.035, (0.06, 0.34, 0.012)))
    m.add("grapple-probe", "body", METAL, merge([frustum(base + n_ * 0.03, base + n_ * 0.36, 0.045, 0.045, seg=12),
                                                 sphere(base + n_ * 0.4, 0.075, 5, 12)]))

PARTS = ["rest", "mast-l", "mast-r", "array-l", "array-r", "hga-l", "hga-r"]


def split():
    """One Model per part (labels are `part|label`, the label's own name after the bar)."""
    out = {}
    for label, role, colour, mesh in m.parts:
        part, name = label.split("|", 1)
        out.setdefault(part, Model(part)).parts.append((name, role, colour, mesh))
    return out


if __name__ == "__main__":
    import json
    out = sys.argv[1] if len(sys.argv) > 1 else "hubble-sts31.json"
    lo, hi = m.bounds()
    print("hubble-sts31: %d triangles, bounds %s .. %s" % (m.triangles(), np.round(lo, 2), np.round(hi, 2)))
    recs = []
    for name in PARTS:
        pm = split()[name]
        tris, ncol = pm.export(None, crease=40, foil_crease=12, max_colours=12)
        print("  %-8s %6d tris %2d colours" % (name, tris, ncol), "folds", pm.folds)
        recs.append({"name": name if name != "rest" else "body", "origin": [0, 0, 0], "groups": pm._recs, "children": []})
    with open(out, "w") as fh:
        json.dump({"name": "hubble-sts31", "parts": recs}, fh, separators=(",", ":"))
