"""Globalstar second generation (Thales Alenia Space, ELiTeBus-1000): the 25 craft M073 to M097 and M087, launched 2010 to 2013.

Metres, the app's axes: +Z the Earth face (the two big S/L-band array antennas), +X the wing axis, +Y the side the cells face.

PUBLISHED: McDowell's GCAT (CC BY 4.0): 'Length 4.0, Diameter 2.0, Span 12.0' m, shape 'Trap Cyl + 2 Pan', 715 kg; Gunter's Space Page: ELiTeBus-1000,
two deployable arrays of 2.4 kW (BOL), 16 C-to-S and 16 L-to-C transponders; Wikipedia: 'two body-mounted, Earth-facing array antennas'.
READ OFF THE ARTIST'S RENDER ON GUNTER'S PAGE (looked at only; the one picture of this craft there is; no photograph of the flight hardware
is on any free page): a flat TRAPEZOIDAL slab edged in gold foil with a white face, on the Earth face one large black PLEATED conical array dish
and one smaller one (each with a silver feed at its middle and a gold rim), a copper-coloured hexagonal panel, two small white round horns,
black whip antennas standing along the edges, gold foil on the end faces, wings of THREE long panels each on a short yoke from the two ends.
OURS (not published): the body's thickness and taper, every antenna's size and place, the panels' width (1.25 m), the cell grid.
The 2.0 m 'Diameter' is taken as the body's long edge along the wing axis; the 12 m span then fixes each panel's length at 1.47 m.
"""
import wlib
from wlib import *  # noqa: F401,F403

FILE_ID = "globalstar-2"
WHITE_P = "#E4E7EB"
WHITE_D = "#BFC5CE"
BLK = "#1F2227"
BLK_L = "#3A3F47"
COPPER = "#B8693A"
BLUE_P = "#2B4C97"
CELL_B = "#26407F"

SX, SZ = 2.0, 0.46           # long edge along the wing axis; thickness along the Earth axis
HW0, HW1 = 0.70, 0.50        # half width (Y) at the -X end and at the +X end: the trapezoid
OUT = [(-SX / 2, -HW0), (SX / 2, -HW1), (SX / 2, HW1), (-SX / 2, HW0)]   # counter-clockwise seen from +Z


def build():
    m = Model("globalstar-2")
    zt, zb = SZ / 2, -SZ / 2
    # --- the slab: a gold frame, a white face each side, gold foil walls
    def p3(pts, z):
        return [(p[0], p[1], z) for p in pts]
    m.add("structure", "body", WHITE_D, plate(p3(OUT, 0.0), SZ - 0.02, (0, 0, 1)))
    inn = inset(OUT, 0.11)
    m.add("face", "body", WHITE_P, plate(p3(inn, zt + 0.002), 0.012, (0, 0, 1)))
    m.add("face", "body", WHITE_P, plate(p3(inn, zb - 0.002), 0.012, (0, 0, 1)))
    # gold border bands on the two faces (between the outline and the inset outline)
    for z, nz in ((zt + 0.001, 1), (zb - 0.001, -1)):
        for k in range(4):
            a, b = OUT[k], OUT[(k + 1) % 4]
            ia, ib = inn[k], inn[(k + 1) % 4]
            pts = [(a[0], a[1], z), (b[0], b[1], z), (ib[0], ib[1], z), (ia[0], ia[1], z)]
            m.add("border", "foil", GOLD, quad(*pts, 6, 2, crinkle=0.01, seed=3 + k, outward=(0, 0, nz)))
    outline_walls(m, OUT, zb, zt, GOLD, "wall", crinkle=0.016, seed=11)
    # gold seams in the walls and the +X/-X end caps' darker foil patches
    m.add("end-patch", "foil", GOLD_D, grid((-SX / 2 - 0.02, 0, 0.0), (0, 0, 1), (0, 1, 0), 0.34, 0.8, 3, 5, crinkle=0.012, seed=5))
    m.add("end-patch", "foil", GOLD_D, grid((SX / 2 + 0.02, 0, 0.0), (0, 1, 0), (0, 0, 1), 0.7, 0.34, 5, 3, crinkle=0.012, seed=6))
    m.add("blue-patch", "body", BLUE_P, grid((-0.8, 0.52, zt + 0.012), (1, 0, 0), (0, 1, 0), 0.11, 0.11, 1, 1))

    # --- the Earth face (+Z): two array antennas, the copper hexagon, two horns, sun and earth sensors
    f = zt + 0.012
    # the large array: a pleated black cup 0.9 across, a gold rim, a silver feed disc at its middle
    c1 = V(-0.38, 0.06, f)
    m.add("array-rim", "foil", GOLD, torus(c1 + V(0, 0, 0.17), (0, 0, 1), 0.45, 0.025, 40, 6))
    m.add("array-collar", "foil", GOLD_D, frustum(c1, c1 + V(0, 0, 0.165), 0.47, 0.46, 40, caps=False))
    m.add("array-cup", "body", BLK, fluted(c1 + V(0, 0, 0.01), (0, 0, 1), 0.44, 0.1, 0.16, 14, seg=56, rings=5, amp=0.06))
    m.add("array-ribs", "body", BLK_L, merge([rod(c1 + V(0, 0, 0.012) + V(math.cos(a), math.sin(a), 0) * 0.1, c1 + V(0, 0, 0.17) + V(math.cos(a), math.sin(a), 0) * 0.44, 0.012, 4) for a in [2 * math.pi * k / 14 for k in range(14)]]))
    m.add("array-feed", "body", SILVER, frustum(c1 + V(0, 0, 0.012), c1 + V(0, 0, 0.05), 0.1, 0.075, 24))
    m.add("array-feed-lens", "body", SILVER_D, disc(c1 + V(0, 0, 0.052), (0, 0, 1), 0.06, 20))
    # the smaller array
    c2 = V(0.52, 0.1, f)
    m.add("array2-rim", "foil", GOLD, torus(c2 + V(0, 0, 0.125), (0, 0, 1), 0.27, 0.02, 32, 6))
    m.add("array2-collar", "foil", GOLD_D, frustum(c2, c2 + V(0, 0, 0.123), 0.285, 0.28, 32, caps=False))
    m.add("array2-cup", "body", BLK, fluted(c2 + V(0, 0, 0.01), (0, 0, 1), 0.265, 0.06, 0.12, 12, seg=40, rings=4, amp=0.06))
    m.add("array2-feed", "body", SILVER, frustum(c2 + V(0, 0, 0.012), c2 + V(0, 0, 0.04), 0.06, 0.045, 18))
    # the copper hexagon (an L-band panel), its frame and its studs
    hx = V(0.12, -0.38, f)
    m.add("hex-frame", "foil", GOLD, hexplate(hx + V(0, 0, 0.006), (0, 0, 1), (1, 0, 0), 0.46, 0.014))
    m.add("hex", "body", COPPER, hexplate(hx + V(0, 0, 0.02), (0, 0, 1), (1, 0, 0), 0.40, 0.012))
    for k in range(6):
        a = math.radians(60 * k + 30)
        m.add("hex-stud", "body", SILVER_D, frustum(hx + V(0.14 * math.cos(a), 0.14 * math.sin(a), 0.026), hx + V(0.14 * math.cos(a), 0.14 * math.sin(a), 0.05), 0.02, 0.016, 8))
    # two round white horns (C band) and sun sensors at the +X end
    for p in ((0.82, -0.3), (0.82, -0.16)):
        q = V(p[0], p[1], f)
        m.add("horn", "body", WHITE_P, frustum(q, q + V(0, 0, 0.07), 0.07, 0.045, 18))
        m.add("horn-eye", "body", SILVER_D, disc(q + V(0, 0, 0.072), (0, 0, 1), 0.04, 14))
    for p in ((-0.9, -0.5), (0.88, 0.38)):
        q = V(p[0], p[1], f)
        m.add("sun-sensor", "body", SILVER_D, box(q + V(0, 0, 0.02), (0.07, 0.07, 0.04)))
        m.add("sun-sensor-eye", "body", BLK, frustum(q + V(0, 0, 0.04), q + V(0, 0, 0.06), 0.022, 0.026, 10))
    # panel seams on the white face
    m.add("seam", "body", WHITE_D, lib.seams_on_face((0, 0, f + 0.0), (0, 0, 1), (1, 0, 0), SX * 0.86, 1.0, 5, 3, width=0.008, lift=0.001))

    # --- the black whip antennas standing along the edges (read off the render)
    for k, x in enumerate((-0.75, -0.45, -0.1, 0.25, 0.6)):
        hw = HW0 + (HW1 - HW0) * (x + SX / 2) / SX
        for s in (1, -1):
            if s < 0 and k % 2:
                continue
            p = V(x, s * (hw + 0.012), zt - 0.12)
            m.add("whip", "body", BLK, frustum(p, p + V(0, s * 0.26, 0.16), 0.022, 0.006, 8))
            m.add("whip-base", "body", SILVER_D, frustum(p - V(0, s * 0.012, 0), p + V(0, s * 0.04, 0), 0.034, 0.034, 8))

    # --- the anti-Earth face (-Z): two thrusters, a star tracker with a baffle, a radiator grid
    fb = zb - 0.012
    m.add("seam", "body", WHITE_D, lib.seams_on_face((0, 0, fb), (0, 0, -1), (1, 0, 0), SX * 0.86, 1.0, 4, 3, width=0.008, lift=-0.001))
    for x in (-0.7, 0.7):
        p = V(x, 0.0, fb)
        m.add("thruster-mount", "body", SILVER_D, frustum(p, p + V(0, 0, -0.06), 0.07, 0.05, 12))
        o, i = lib.nozzle(p + V(0, 0, -0.06), (0, 0, -1), 0.12, 0.03, 0.07, 12)
        m.add("thruster", "body", "#7B6A55", o)
        m.add("thruster-in", "body", BLK, i)
    m.add("startracker", "body", BLK, box((0.0, 0.28, fb - 0.04), (0.14, 0.14, 0.08)))
    m.add("startracker-baffle", "body", GREY, frustum((0.0, 0.28, fb - 0.08), (0.0, 0.28, fb - 0.34), 0.07, 0.11, 14, caps=False))

    # --- the two wings: a short yoke, a drive, three panels each 1.47 x 1.25 m
    pl = 1.47
    for sgn in (-1, 1):
        wing(m, sgn, sgn * SX / 2, 3, pl, 1.25, (10, 6), yoke_len=0.2, sada_len=0.25, sada_r=0.1, gap=0.07, thick=0.025, cell_gap=0.012, back_col=GREY, rails=True, truss=True)
    return m
