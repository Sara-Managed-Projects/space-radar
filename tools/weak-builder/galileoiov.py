"""Galileo In-Orbit Validation craft GSAT0101 to GSAT0103 (Astrium / EADS CASA Espacio and SSTL payload; ESA, EUSPA): the first four craft, 2011 and 2012.

Metres, the app's axes: +Z the Earth face (the L-band array), +X the wing axis, +Y the black end, -Y the clock end (the pale cross radiator).

PUBLISHED (EUSPA 'Galileo Satellite Metadata', section 6.1; ESA 'The first four satellites'; ILRS): the box is 2.611 x 1.149 x 1.149 m, the arrays 5.000 x 1.082 m each,
13 m tip to tip, the L-band array's phase centre at 1375.5, 600, 1100.5 mm and the laser retro-reflector (planar, 84 corner cubes of 33 mm) at 2298, 595, 1174 mm in the
box frame; the surfaces: black carbon-filled Kapton on the -X end, optical-surface radiator on the +X (clock) end, germanium-coated black Kapton foil on the +Z face;
ESA names the antennas on the Earth face: L-band (navigation), SAR (search and rescue), C-band (mission uplink), infrared Earth sensors and Sun sensors.
READ OFF TWO PICTURES, LOOKED AT ONLY: the Science Museum Group's scale model (CC BY 4.0) and the model photograph by Pouyana (CC BY-SA 3.0), both on Commons:
a dark blue-black blanketed box with PALE JIGSAW RADIATOR PANELS across its two long wing sides and bronze hold-down brackets, a CREAM hexagonal array of round
cups on the Earth face, a small hexagonal and a round antenna, a dark plate of cubes, a hexagonal lattice with a small dish at the far end, a pale cross radiator
on the clock end, and long two-panel arrays on a thin arm with an orange drive block, each array divided by grey frames.
OURS (not published): the count of cups (37), the jigsaw shapes, every bracket, peg and sensor, the lattice, the arrays' cell grid.
"""
import wlib
from wlib import *  # noqa: F401,F403

FILE_ID = "galileo-iov"
BX, BY, BZ = 1.149, 2.611, 1.149
MLI = "#24272F"
MLI_L = "#2F333D"
RAD = "#DADEE4"
RAD_D = "#B4BBC6"
CREAM = "#E8DEC0"
BRONZE = "#A9824A"
ORANGE = "#C9772E"
CELL_I = "#27407A"
FRAME = "#8A9099"
DISH_W = "#DEE1E5"


def build():
    m = Model("galileo-iov")
    zf = BZ / 2
    # --- the box: dark core in blanket
    m.add("structure", "body", "#1C1E24", box((0, 0, 0), (BX - 0.02, BY - 0.02, BZ - 0.02)))
    # the long wing sides (+X, -X): rumpled dark blanket with pale jigsaw radiator patches, brackets and pegs
    for sgn in (-1, 1):
        c = V(sgn * (BX / 2 + 0.012), 0, 0)
        u = (0, 1, 0) if sgn > 0 else (0, 0, 1)
        v = (0, 0, 1) if sgn > 0 else (0, 1, 0)
        su, sv = (BY, BZ) if sgn > 0 else (BZ, BY)
        m.add("blanket", "foil", MLI, grid(c, u, v, su * 0.99, sv * 0.99, int(su / 0.2), int(sv / 0.2), crinkle=0.01, seed=4 + sgn))
        for col, mesh in lib.patches_on_face(c + V(sgn * 0.004, 0, 0), (sgn, 0, 0), (0, 1, 0), BY * 0.94, BZ * 0.9, 9, 0.5, [RAD, RAD_D, RAD], 30 + sgn, lift=0.004, amp=0.0):
            m.add("radiator-patch", "body", col, mesh)
        for k in range(7):
            y = -1.05 + 0.35 * k
            z = (0.3 if k % 2 else -0.3)
            m.add("peg", "body", "#15171B", rod((sgn * (BX / 2 + 0.01), y, z), (sgn * (BX / 2 + 0.09), y, z), 0.014, 6))
            m.add("peg-tip", "body", FRAME, frustum((sgn * (BX / 2 + 0.09), y, z), (sgn * (BX / 2 + 0.13), y, z), 0.026, 0.012, 8))
    # the +Y end: black carbon-Kapton; the -Y end: the pale cross radiator on a dark blanket
    m.add("end-black", "foil", MLI_L, grid((0, BY / 2 + 0.012, 0), (0, 0, 1), (1, 0, 0), BZ * 0.99, BX * 0.99, 6, 6, crinkle=0.01, seed=9))
    m.add("end-clock", "foil", MLI, grid((0, -BY / 2 - 0.012, 0), (1, 0, 0), (0, 0, 1), BX * 0.99, BZ * 0.99, 6, 6, crinkle=0.01, seed=10))
    m.add("cross", "body", RAD, box((0, -BY / 2 - 0.03, 0), (0.78, 0.02, 0.24)))
    m.add("cross", "body", RAD, box((0, -BY / 2 - 0.03, 0), (0.24, 0.02, 0.78)))
    # the anti-Earth face: the separation ring and a pale plate
    m.add("aft", "foil", MLI, grid((0, 0, -zf - 0.012), (1, 0, 0), (0, -1, 0), BX * 0.99, BY * 0.99, 6, 12, crinkle=0.01, seed=12))
    m.add("sep-ring", "body", FRAME, torus((0, 0.2, -zf - 0.03), (0, 0, 1), 0.38, 0.03, 32, 6))
    m.add("aft-plate", "body", RAD_D, box((0, -0.8, -zf - 0.03), (0.7, 0.5, 0.02)))
    for ex in (-1, 1):
        for ey in (-1, 1):
            m.add("corner-bracket", "body", BRONZE, box((ex * (BX / 2 - 0.02), ey * (BY / 2 - 0.1), zf - 0.01), (0.1, 0.16, 0.1)))
            m.add("corner-bracket", "body", BRONZE, box((ex * (BX / 2 - 0.02), ey * (BY / 2 - 0.1), -zf + 0.01), (0.1, 0.16, 0.1)))

    # --- the Earth face (+Z)
    m.add("earth-face", "foil", MLI, grid((0, 0, zf + 0.012), (1, 0, 0), (0, 1, 0), BX * 0.99, BY * 0.99, 6, 12, crinkle=0.008, seed=14))
    f = zf + 0.02
    # the L-band array: a cream hexagonal plate with 37 round cups in three rings, centred 0.07 m toward the clock end
    ca = V(0.0, -0.07, f)
    m.add("lband-plate", "body", CREAM, hexplate(ca, (0, 0, 1), (1, 0, 0), 1.0, 0.03))
    pitch = 0.14
    pts = [(0.0, 0.0)]
    for ring in (1, 2, 3):
        for k in range(6 * ring):
            side, idx = divmod(k, ring)
            a0 = math.radians(60 * side)
            a1 = math.radians(60 * (side + 1))
            p0 = V(math.cos(a0), math.sin(a0)) * ring
            p1 = V(math.cos(a1), math.sin(a1)) * ring
            pts.append(tuple((p0 + (p1 - p0) * idx / ring)))
    cups, holes = [], []
    for px, py in pts:
        q = ca + V(px * pitch, py * pitch, 0.015)
        cups.append(frustum(q, q + V(0, 0, 0.065), 0.042, 0.064, 14, caps=False))
        holes.append(disc(q + V(0, 0, 0.002), (0, 0, 1), 0.04, 12))
    m.add("lband-cups", "body", CREAM, merge(cups))
    m.add("lband-holes", "body", "#7A735F", merge(holes))
    # the search-and-rescue (hexagonal) and C-band (round) antennas, two infrared Earth sensors, near the +Y end of the array
    m.add("sar-hex", "body", CREAM, hexplate((0.27, 0.62, f + 0.02), (0, 0, 1), (1, 0, 0), 0.26, 0.04))
    m.add("sar-hex-top", "body", RAD_D, hexplate((0.27, 0.62, f + 0.045), (0, 0, 1), (1, 0, 0), 0.19, 0.012))
    m.add("cband", "body", CREAM, frustum((-0.25, 0.62, f), (-0.25, 0.62, f + 0.1), 0.1, 0.07, 18))
    m.add("cband-top", "body", "#8E8873", disc((-0.25, 0.62, f + 0.102), (0, 0, 1), 0.06, 16))
    for x in (-0.4, 0.4):
        m.add("earth-sensor", "body", FRAME, box((x, 0.36, f + 0.04), (0.1, 0.1, 0.08)))
        m.add("earth-sensor-eye", "body", "#101216", frustum((x, 0.36, f + 0.08), (x, 0.36, f + 0.11), 0.03, 0.04, 10))
    # the laser retro-reflector: a plate of 84 corner cubes (7 x 12 of 33 mm) toward the clock end
    rp = V(0.05, -1.0, f)
    m.add("lrr-plate", "body", "#15171B", box(rp + V(0, 0, 0.01), (0.3, 0.5, 0.02)))
    cubes = []
    for i in range(7):
        for j in range(12):
            cubes.append(box(rp + V((i - 3) * 0.04, (j - 5.5) * 0.04, 0.03), (0.033, 0.033, 0.024)))
    m.add("lrr-cubes", "body", "#A9B3C2", merge(cubes))
    # the lattice and the dish at the far (+Y) end: a hexagonal ring of struts, a small dish on a mast
    lc = V(0.0, 1.0, f)
    ring = [lc + V(0.27 * math.cos(math.radians(60 * k)), 0.27 * math.sin(math.radians(60 * k)), 0.06) for k in range(6)]
    for k in range(6):
        a, b = ring[k], ring[(k + 1) % 6]
        m.add("lattice", "body", FRAME, rod(a, b, 0.012, 6))
        m.add("lattice-post", "body", FRAME, rod(lc + V(0.27 * math.cos(math.radians(60 * k)), 0.27 * math.sin(math.radians(60 * k)), 0.0), a, 0.014, 6))
        m.add("lattice-spoke", "body", FRAME, rod(lc + V(0, 0, 0.16), a, 0.008, 5))
    m.add("dish-mast", "body", FRAME, rod(lc + V(0, 0, 0.0), lc + V(0, 0, 0.16), 0.02, 8))
    m.add("dish", "body", DISH_W, dish(lc + V(0, 0, 0.16), (0.25, 0.0, 1.0), 0.15, 0.04, seg=20))
    m.add("dish-feed", "body", FRAME, rod(lc + V(0, 0, 0.16), lc + V(0.02, 0, 0.27), 0.007, 5))

    # --- the two wings: a thin arm with an orange drive block, two panels each 2.5 x 1.082 m, grey frames across every panel
    arm, gap, pl, pw = 0.89, 0.04, 2.5, 1.082
    for sgn in (-1, 1):
        x0 = sgn * BX / 2
        m.add("drive", "body", ORANGE, box((x0 + sgn * 0.12, 0.0, 0.0), (0.16, 0.16, 0.16)))
        m.add("arm", "body", FRAME, rod((x0 + sgn * 0.16, 0, 0), (x0 + sgn * (0.04 + arm), 0, 0), 0.035, 8))
        xs = x0 + sgn * (0.04 + arm)
        for i in range(2):
            xc = xs + sgn * pl / 2
            for role, col, mesh in lib.cell_panel((xc, 0, 0), (0, 0, 1), (1, 0, 0), pw, pl, (6, 14), 0.012, FRAME, cell_col=CELL_I, thick=0.025, back_col=FRAME, border=0.025):
                m.add("panel", role, col, mesh)
            for k in (-1, 1):
                m.add("panel-rail", "body", FRAME, box((xc, 0, k * pw / 2), (pl, 0.04, 0.035)))
            for k in (-1, 0, 1):
                m.add("panel-rib", "body", FRAME, box((xc + k * pl / 3, 0.0, 0.0), (0.03, 0.036, pw)))
            if i == 0:
                m.add("hinge", "body", "#15171B", box((xs + sgn * (pl + gap / 2), 0, 0), (gap, 0.04, pw * 0.2)))
            xs = xs + sgn * (pl + gap)
    return m
