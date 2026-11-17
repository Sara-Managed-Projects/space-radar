"""Fengyun-3 first batch, FY-3A to FY-3D (SAST for CMA and NSMC): the polar-orbiting weather craft of 2008, 2010, 2013 and 2017.

Metres, the app's axes: +Z the Earth face (the imaging and sounding instruments), the body's 4.4 m along Y, +X the wing axis, the wing's cells to -Z (the sky).

PUBLISHED (eoPortal, 'FY-3', read 2026-11-17; the page's own text): a hexahedron of 4.4 x 2.0 x 2.0 m stowed and 4.4 x 10 x 3.8 m deployed; ONE solar array on one side
of the main body, 22.464 m2; the MWRI microwave imager 'an offset parabolic reflector with the dimensions of 977.4 mm x 897.0 mm' on a drum, and two quasi-optical reflectors
(860 mm and 1300 mm) of the sounders; the instrument list of the FY-3A schematic (ERM, IRAS, VIRR, MWTS, MERSI, SBUS, TOU on the Earth side; MWRI, SEM, SIM).
The array's split into FOUR panels of 2.0 x 2.808 m is the one that makes the cited 22.464 m2 AND the 10 m flight span with a 0.8 m yoke (4 x 2.0 x 2.808 = 22.464).
READ OFF PICTURES, LOOKED AT ONLY: the photograph of the Fengyun-3 mockup in the Shanghai science museum (CC BY 2.0, Commons): a silvered-and-blue blanketed long box, stepped
silver housings with dark apertures and white cylinders on the Earth face, white rods with cone tips, a white dish on a boom, the wing on a truss from the upper edge; the
eoPortal schematic of FY-3A (image credit CMA/NSMC): a silver body with a cream-and-gold sky end, the instruments labelled, four dark-blue panels with white strips between them;
and a CC BY 4.0 rendering by China News Service (Commons): gold foil on the sky face, two black-apertured cylinders, round white dish on a long mast, a long whip.
OURS (not published): every instrument's size and place except the MWRI reflector, the blanket colours, the yoke's truss, the whip's length.
"""
import wlib
from wlib import *  # noqa: F401,F403

FILE_ID = "fengyun-3"
BX, BY, BZ = 2.0, 4.4, 2.0
FOIL = "#C3CAD4"
FOIL_B = "#9EB0C8"
WHITE_P = "#E6E9ED"
HOUSE = "#8C939E"
HOUSE_D = "#565C67"
APER = "#15171B"
CELL_F = "#243F85"
STRIP = "#D6DAE0"
BACK = "#B2B8C1"


def cyl(m, label, role, col, c, axis, r, length, seg=20):
    c, w = V(c), unit(V(axis))
    m.add(label, role, col, frustum(c, c + w * length, r, r, seg))


def build():
    m = Model("fengyun-3")
    zf, zs = BZ / 2, -BZ / 2
    # --- the body: a hexahedron in silvered, rumpled blanket, white rails along the edges
    m.add("structure", "body", HOUSE_D, box((0, 0, 0), (BX - 0.04, BY - 0.04, BZ - 0.04)))
    m.add("foil-x-", "foil", FOIL, grid((-BX / 2 - 0.02, 0, 0), (0, 0, 1), (0, 1, 0), BZ * 0.99, BY * 0.99, 8, 16, crinkle=0.03, seed=21))
    m.add("foil-x+", "foil", FOIL_B, grid((BX / 2 + 0.02, 0, 0), (0, 1, 0), (0, 0, 1), BY * 0.99, BZ * 0.99, 16, 8, crinkle=0.03, seed=22))
    m.add("foil-y-", "foil", FOIL, grid((0, -BY / 2 - 0.02, 0), (1, 0, 0), (0, 0, 1), BX * 0.99, BZ * 0.99, 8, 8, crinkle=0.03, seed=23))
    m.add("foil-y+", "foil", FOIL_B, grid((0, BY / 2 + 0.02, 0), (0, 0, 1), (1, 0, 0), BZ * 0.99, BX * 0.99, 8, 8, crinkle=0.03, seed=24))
    m.add("foil-earth", "foil", FOIL, grid((0, 0, zf + 0.02), (1, 0, 0), (0, 1, 0), BX * 0.99, BY * 0.99, 8, 16, crinkle=0.025, seed=25))
    m.add("foil-sky", "foil", GOLD, grid((0, 0, zs - 0.02), (0, 1, 0), (1, 0, 0), BY * 0.99, BX * 0.99, 16, 8, crinkle=0.03, seed=26))
    for k, y in enumerate((-1.5, -0.5, 0.5, 1.5)):
        m.add("seam", "foil", GOLD_D, box((0, y, zs - 0.04), (BX * 0.96, 0.02, 0.01)))
    for k, y in enumerate((-1.1, 0.0, 1.1)):
        m.add("seam", "foil", HOUSE, box((-BX / 2 - 0.045, y, 0), (0.01, 0.02, BZ * 0.96)))
    for ex in (-1, 1):
        for ez in (-1, 1):
            m.add("rail", "body", WHITE_P, box((ex * (BX / 2 + 0.01), 0, ez * (BZ / 2 + 0.01)), (0.06, BY + 0.04, 0.06)))
    for ey in (-1, 1):
        for ez in (-1, 1):
            m.add("rail", "body", WHITE_P, box((0, ey * (BY / 2 + 0.01), ez * (BZ / 2 + 0.01)), (BX + 0.04, 0.06, 0.06)))
        for ex in (-1, 1):
            m.add("rail", "body", WHITE_P, box((ex * (BX / 2 + 0.01), ey * (BY / 2 + 0.01), 0), (0.06, 0.06, BZ + 0.04)))
    # a white radiator patch on each end
    m.add("radiator", "body", WHITE_P, box((0, -BY / 2 - 0.05, 0.1), (1.2, 0.02, 0.9)))
    m.add("radiator", "body", WHITE_P, box((0, BY / 2 + 0.05, -0.2), (1.2, 0.02, 0.8)))

    # --- the Earth face: stepped instrument housings, round-apertured drums, white rods (read off the mockup and the schematic)
    f = zf + 0.04
    # MERSI and VIRR: two silver housings with dark square apertures and a scan mirror hood, on the -Y half
    for (x, y, sx_, sy_, h) in ((-0.45, -1.55, 0.8, 0.9, 0.42), (0.5, -1.35, 0.7, 0.8, 0.36)):
        m.add("housing", "body", HOUSE, box((x, y, f + h / 2), (sx_, sy_, h)))
        m.add("housing-top", "body", HOUSE_D, box((x, y, f + h + 0.015), (sx_ * 0.8, sy_ * 0.8, 0.03)))
        m.add("aperture", "body", APER, frustum((x, y, f + h), (x, y, f + h + 0.1), 0.26, 0.2, 18, caps=False))
        m.add("aperture-glass", "body", APER, disc((x, y, f + h + 0.002), (0, 0, 1), 0.25, 18))
    # the sounder drums: two white cylinders with dark, tilted apertures (MWTS, MWHS)
    for (x, y) in ((-0.5, -0.25), (0.45, -0.1)):
        m.add("drum", "body", WHITE_P, frustum((x, y, f), (x, y, f + 0.5), 0.28, 0.28, 22))
        m.add("drum-ring", "body", HOUSE, torus((x, y, f + 0.5), (0, 0, 1), 0.27, 0.02, 22, 6))
        m.add("drum-aperture", "body", APER, disc((x, y, f + 0.505), (0, 0, 1), 0.22, 20))
        m.add("drum-mirror", "body", HOUSE, frustum((x, y, f + 0.5), (x + 0.1, y, f + 0.72), 0.05, 0.12, 12))
    # IRAS / ERM / SBUS / TOU: dark boxes and a cone, on the +Y half
    m.add("housing", "body", HOUSE_D, box((-0.45, 0.8, f + 0.17), (0.9, 0.7, 0.34)))
    m.add("housing", "body", HOUSE, box((0.45, 0.9, f + 0.14), (0.8, 0.6, 0.28)))
    m.add("aperture", "body", APER, frustum((-0.45, 0.8, f + 0.34), (-0.45, 0.8, f + 0.42), 0.18, 0.14, 16, caps=False))
    m.add("aperture", "body", APER, box((0.45, 1.19, f + 0.14), (0.5, 0.02, 0.2)))
    m.add("sbus", "body", HOUSE_D, box((-0.4, 1.7, f + 0.14), (0.8, 0.5, 0.28)))
    m.add("tou", "body", APER, box((0.5, 1.8, f + 0.12), (0.7, 0.3, 0.24)))
    m.add("erm", "body", HOUSE, frustum((-0.5, 1.15, f), (-0.5, 1.15, f + 0.28), 0.17, 0.12, 14))
    # a stepped plate and a horn pair on the middle, white rods with cone tips (the mockup's GNOS and data antennas)
    m.add("step", "body", HOUSE, box((0.0, 0.3, f + 0.03), (1.7, 0.5, 0.06)))
    for k, (x, y) in enumerate(((-0.8, 0.25), (-0.6, 0.35), (0.7, 0.28), (0.85, 0.12), (0.0, 1.2))):
        m.add("rod", "body", WHITE_P, rod((x, y, f), (x, y, f + 0.2), 0.015, 6))
        m.add("rod-tip", "body", WHITE_P, frustum((x, y, f + 0.2), (x, y, f + 0.3), 0.035, 0.006, 8))
    for x in (-0.8, 0.8):
        m.add("earth-sensor", "body", HOUSE_D, box((x, -1.95, f + 0.04), (0.14, 0.14, 0.08)))
        m.add("earth-sensor-eye", "body", APER, frustum((x, -1.95, f + 0.08), (x, -1.95, f + 0.11), 0.04, 0.05, 10))
    # thruster pods at the corners of the Earth face
    for ex in (-1, 1):
        for ey in (-1, 1):
            p = V(ex * 0.85, ey * 2.0, f)
            m.add("thruster", "body", "#7B6A55", frustum(p, p + V(0, ey * 0.12, 0.1), 0.05, 0.08, 10))

    # --- the sky face: the microwave imager's drum with its 0.98 x 0.90 m offset reflector, a white 1.3 m dish on a mast, the S-band whip, sun sensors
    s0 = zs - 0.04
    m.add("mwri-drum", "body", WHITE_P, frustum((-0.45, -1.1, s0), (-0.45, -1.1, s0 - 0.55), 0.4, 0.4, 24))
    m.add("mwri-ring", "body", HOUSE, torus((-0.45, -1.1, s0 - 0.55), (0, 0, 1), 0.39, 0.025, 24, 6))
    m.add("mwri-arm", "body", HOUSE, rod((-0.45, -1.1, s0 - 0.55), (-0.2, -0.9, s0 - 0.8), 0.04, 8))
    # the reflector: an ellipse 0.977 x 0.897 m, tilted, concave side toward the sky end
    rf = V(-0.2, -0.9, s0 - 0.85)
    m.add("mwri-reflector", "body", WHITE_P, dish(rf, (0.15, 0.55, -0.82), 0.46, 0.13, seg=28))
    m.add("mwri-feed", "body", HOUSE, rod(rf + V(0, 0, 0.0), rf + V(0.0, 0.5, 0.35), 0.02, 6))
    m.add("mwri-horn", "body", APER, frustum(rf + V(0.0, 0.5, 0.35), rf + V(0.0, 0.55, 0.45), 0.04, 0.07, 10))
    # the 1.3 m quasi-optical reflector (a white disc dish) on a boom at the +Y end
    dc = V(0.25, 1.5, s0 - 0.7)
    m.add("dish-mast", "body", HOUSE, rod((0.25, 1.5, s0), dc, 0.045, 8))
    m.add("dish", "body", WHITE_P, dish(dc, (0.0, -0.45, -1.0), 0.65, 0.14, seg=32))
    m.add("dish-rim", "body", HOUSE, torus(dc + unit(V(0.0, -0.45, -1.0)) * 0.14, (0.0, -0.45, -1.0), 0.65, 0.012, 32, 5))
    m.add("dish-struts", "body", HOUSE, merge([rod(dc + unit(V(0.0, -0.45, -1.0)) * 0.14 + V(0.65 * math.cos(a), 0.65 * math.sin(a) * 0.9, 0), dc + unit(V(0.0, -0.45, -1.0)) * 0.34, 0.01, 4) for a in (0, 2.1, 4.2)]))
    # the S-band whip and two sun sensors
    m.add("whip", "body", HOUSE, rod((-0.8, 1.9, s0), (-0.8, 1.9, s0 - 1.0), 0.012, 5))
    m.add("whip-base", "body", WHITE_P, frustum((-0.8, 1.9, s0), (-0.8, 1.9, s0 - 0.12), 0.05, 0.03, 10))
    for p in ((0.7, -1.9), (-0.8, -1.9)):
        m.add("sun-sensor", "body", HOUSE_D, box((p[0], p[1], s0 - 0.03), (0.1, 0.1, 0.06)))

    # --- the one wing: a truss yoke from the +X face's sky edge, FOUR panels 2.0 x 2.808 m with white strips between, cells to -Z
    zw = zs + 0.12
    x0 = BX / 2
    yk = 1.14
    for sy in (-1, 1):
        for sz in (-1, 1):
            m.add("yoke", "body", HOUSE, rod((x0, sy * 0.35, zw + sz * 0.1), (x0 + yk, sy * 0.9, zw + sz * 0.1), 0.03, 6))
    for k in range(5):
        xx = x0 + yk * (k / 4)
        yy = 0.35 + 0.55 * (k / 4)
        m.add("yoke-lace", "body", HOUSE, rod((xx, -yy, zw + 0.1), (xx, yy, zw + 0.1), 0.015, 5))
        m.add("yoke-lace", "body", HOUSE, rod((xx, -yy, zw - 0.1), (xx, yy, zw - 0.1), 0.015, 5))
    m.add("sada", "body", HOUSE_D, frustum((x0, -0.3, zw), (x0 + 0.1, -0.3, zw), 0.15, 0.15, 14))
    pl, pw, gap = 1.7, 3.31, 0.02
    xs = x0 + yk
    for i in range(4):
        xc = xs + pl / 2
        for role, col, mesh in lib.cell_panel((xc, 0, zw), (0, 1, 0), (1, 0, 0), pw, pl, (12, 8), 0.012, STRIP, cell_col=CELL_F, thick=0.03, back_col=BACK, border=0.04):
            m.add("panel", role, col, mesh)
        m.add("panel-stiffener", "body", HOUSE, lib.seams_on_face((xc, 0, zw + 0.018), (0, 0, 1), (1, 0, 0), pl * 0.96, pw * 0.96, 3, 4, width=0.05, lift=0.0))
        for k in (-1, 1):
            m.add("panel-rail", "body", STRIP, box((xc, k * pw / 2, zw), (pl, 0.04, 0.045)))
        m.add("hinge", "body", HOUSE_D, box((xs + pl + gap / 2, 0, zw), (gap + 0.04, pw * 0.2, 0.05)))
        xs += pl + gap
    palette(m, {(None, "#7B6A55"): "#8C6A45"})
    return m
