"""Hitomi / ASTRO-H (JAXA, launched 2016, lost 26 March 2016): the same bus, a short drum with four large barrels (two hard X-ray and two soft
X-ray telescopes), two paddles, and on the base the extensible optical bench, a square lattice 0.7 m across and 6.4 m long (JAXA's press kit)
ending in an octagonal plate 1.9 m across with the hard X-ray imagers (published: 14 m overall, bench 6.4 m). The body is XRISM's 7.9 m
(the registry row says so). Two soft gamma-ray detectors on the side panels, placed by eye."""
import xlib
from xlib import *  # noqa: F401,F403

FILE_ID = "hitomi"
BENCH = 6.4
SIDE = 0.7


def bench(m):
    z0 = Z_BASE + 0.12          # from the base plate
    n = 12
    dz = BENCH / n
    h = SIDE / 2
    corners = [(h, h), (-h, h), (-h, -h), (h, -h)]
    for (x, y) in corners:
        m.add("longeron", "body", FRAME, lib.rod((x, y, z0), (x, y, z0 + BENCH), 0.03, 8))
    for k in range(n + 1):
        z = z0 + k * dz
        for i in range(4):
            a, b = corners[i], corners[(i + 1) % 4]
            m.add("batten", "body", SILVER, lib.rod((a[0], a[1], z), (b[0], b[1], z), 0.018, 6))
    for k in range(n):
        za, zb = z0 + k * dz, z0 + (k + 1) * dz
        for i in range(4):
            a, b = corners[i], corners[(i + 1) % 4]
            p, q = ((a[0], a[1], za), (b[0], b[1], zb)) if k % 2 == 0 else ((b[0], b[1], za), (a[0], a[1], zb))
            m.add("diagonal", "body", GREY, lib.rod(p, q, 0.012, 5))
    # the fixed base of the bench: a box where it leaves the bus, and a cable harness along one longeron
    m.add("bench-base", "body", BAY, lib.box((0, 0, z0 + 0.1), (SIDE + 0.25, SIDE + 0.25, 0.25)))
    m.add("harness", "body", APERTURE, lib.rod((h + 0.05, h + 0.05, z0), (h + 0.05, h + 0.05, z0 + BENCH), 0.025, 6))
    # the HXI plate: an octagon 1.9 m across in gold foil, a frame round it, and the two imagers' boxes on the face toward the mirrors
    zp = z0 + BENCH
    m.add("hxi-plate", "foil", GOLD_F, lib.prism((0, 0, zp), (0, 0, 1), 8, 1.9, 0.12, start=(1, 0, 0)))
    m.add("hxi-frame", "body", SILVER, lib.torus((0, 0, zp + 0.06), (0, 0, 1), 0.98, 0.03, 8, 5))
    for s in (-1, 1):
        m.add("hxi", "body", BAY_L, lib.box((s * 0.45, 0, zp - 0.2), (0.5, 0.5, 0.3)))
        m.add("hxi-window", "body", APERTURE, lib.box((s * 0.45, 0, zp - 0.36), (0.36, 0.36, 0.02)))
    m.add("hxi-radiator", "body", WHITE_R, lib.box((0, 0, zp + 0.14), (0.9, 0.5, 0.03)))


def build():
    m = Model("hitomi")
    bus(m, flare=False)
    foil_cone(m, "flare", Z_BASE - BUS_H, 1.28, Z_BASE - BUS_H - 0.55, 1.08, n=24, seed=44)
    z0, z1 = Z_BASE - BUS_H - 0.55, Z_TOP + 0.75 + 0.35
    drum(m, z0, z1, r=1.08)
    for c, r, L, name in (((0.5, -0.4, z1), 0.34, 0.9, "hxt-1"), ((-0.5, 0.4, z1), 0.34, 0.9, "hxt-2"),
                          ((-0.5, -0.45, z1), 0.3, 0.6, "sxt-1"), ((0.5, 0.45, z1), 0.3, 0.6, "sxt-2"),
                          ((0.0, -0.8, z1), 0.12, 0.35, "star-tracker"), ((0.0, 0.8, z1), 0.12, 0.35, "sun-baffle")):
        barrel(m, c, r, L, name)
    # the two soft gamma-ray detectors on side panels near the base: foil boxes with white radiators
    for s in (-1, 1):
        th = math.pi / 2 + (math.pi / 4) * (1 if s > 0 else 5)
        d = V(math.cos(th), math.sin(th), 0)
        R = np.column_stack([V(-math.sin(th), math.cos(th), 0), d, V(0, 0, 1)])
        m.add("sgd", "foil", GOLD_F, lib.box(d * (APO + 0.28) + V(0, 0, Z_BASE - 0.8), (0.6, 0.5, 0.9), R, crinkle=0.012, seed=60 + s, div=0.3))
        m.add("sgd-radiator", "body", WHITE_R, lib.box(d * (APO + 0.55) + V(0, 0, Z_BASE - 0.8), (0.5, 0.02, 0.7), R))
    bench(m)
    paddles(m, zc=Z_BASE - BUS_H + 1.1)
    return m
