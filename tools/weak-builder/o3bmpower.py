"""O3b mPOWER (Boeing 702X, SES): the twelve craft F1 to F13 launched 2022 to 2025 into the 8 000 km equatorial and inclined orbits.

Metres, the app's axes: +Z the Earth face (the electronically steered phased array), +X the wing axis, +Y the side the cells face.

PUBLISHED: McDowell's GCAT (CC BY 4.0): 'Length 1.2, Diameter 3.0, Span 27.0' m, 'Box + 2 pan', bus 702X, Boeing; Gunter's Space Page: BSS-702X, two
deployable arrays, an all-electric propulsion system; Wikipedia: 'electronically steered phased array antennas ... up to 5000 spot beams per satellite'.
READ OFF TWO PICTURES, LOOKED AT ONLY: a CC0 photograph of a desk model on Wikimedia Commons (Blervis) and the artist's render on Gunter's Space Page:
a long box (3.0 m the long edge) with a black face and white faces with aluminium brackets, TWO ROUND GOLD-FOIL DISCS on an end face, two wings of FOUR
panels each standing off on a pair of struts that open to the panel's width (a V), blue-grey cell grids with red interconnect traces and a thin pale frame.
OURS (not published): the box's 1.5 m width, the phased array's tile count and size, every strut, bracket, disc and sensor, the panels' width (3.0 m)
and the 2.7 m length that the 27 m span fixes once the 1.5 m yokes and 0.3 m drives are taken out.
"""
import wlib
from wlib import *  # noqa: F401,F403

FILE_ID = "o3b-mpower"
BX, BY, BZ = 1.5, 3.0, 1.2
WHITE_P = "#E4E7EB"
OSR_P = "#CDD3DC"
BLK = "#16181D"
TILE = "#2A3144"
TILE2 = "#323A50"
MLI = "#2F3239"
MLI_D = "#202228"
GOLD_F = "#C9A24A"
CELL_G = "#35497C"


def build():
    m = Model("o3b-mpower")
    # --- the box: a dark core, white radiator faces at the two wing sides, black blanket on the long Y faces
    m.add("structure", "body", MLI_D, box((0, 0, 0), (BX - 0.02, BY - 0.02, BZ - 0.02)))
    for sgn in (-1, 1):
        c = V(sgn * (BX / 2 + 0.004), 0, 0)
        m.add("radiator", "body", WHITE_P, grid(c, (0, 1, 0) if sgn > 0 else (0, 0, 1), (0, 0, 1) if sgn > 0 else (0, 1, 0), (BY if sgn > 0 else BZ) * 0.98, (BZ if sgn > 0 else BY) * 0.98, 1, 1))
        m.add("radiator-seam", "body", OSR_P, lib.seams_on_face(c + V(sgn * 0.002, 0, 0), (sgn, 0, 0), (0, 1, 0), BY * 0.94, BZ * 0.94, 5, 3, width=0.014, lift=0.0))
        # aluminium corner brackets on the white faces, as on the model
        for ey in (-1, 1):
            for ez in (-1, 1):
                m.add("bracket", "body", SILVER, box((sgn * (BX / 2 + 0.03), ey * (BY / 2 - 0.16), ez * (BZ / 2 - 0.12)), (0.06, 0.28, 0.2)))
        for ey in (-0.8, 0, 0.8):
            m.add("bracket", "body", SILVER_D, box((sgn * (BX / 2 + 0.025), ey, 0), (0.05, 0.14, 0.14)))
    # black multilayer blanket, rumpled, on the long +Y / -Y faces and the anti-Earth face
    for sgn in (-1, 1):
        m.add("blanket", "foil", MLI, grid((0, sgn * (BY / 2 + 0.012), 0), (0, 0, 1) if sgn > 0 else (1, 0, 0), (1, 0, 0) if sgn > 0 else (0, 0, 1), (BZ if sgn > 0 else BX) * 0.98, (BX if sgn > 0 else BZ) * 0.98, 6, 6, crinkle=0.012, seed=7 + sgn))
    m.add("blanket-aft", "foil", MLI, grid((0, 0, -BZ / 2 - 0.012), (1, 0, 0), (0, -1, 0), BX * 0.98, BY * 0.98, 6, 14, crinkle=0.012, seed=3))
    for k, y in enumerate((-1.0, 0.0, 1.0)):
        m.add("blanket-seam", "foil", GOLD_D, box((0, y, -BZ / 2 - 0.022), (BX * 0.96, 0.02, 0.008)))
    for ex in (-1, 1):
        for ey in (-1, 1):
            m.add("rail", "body", SILVER_D, box((ex * (BX / 2 + 0.008), ey * (BY / 2 + 0.008), 0), (0.04, 0.04, BZ)))
            m.add("rail", "body", SILVER_D, box((ex * (BX / 2 + 0.008), 0, ey * (BZ / 2 + 0.008)), (0.04, BY, 0.04)))

    # --- the Earth face (+Z): the phased array, a frame of 2 x 4 sub-arrays, each of square elements
    zf = BZ / 2
    pw, ph = BX - 0.12, BY - 0.12
    m.add("array-base", "body", BLK, grid((0, 0, zf + 0.004), (1, 0, 0), (0, 1, 0), BX * 0.99, BY * 0.99, 1, 1))
    nx, ny = 2, 4
    sw, sh = pw / nx, ph / ny
    for i in range(nx):
        for j in range(ny):
            cx, cy = -pw / 2 + sw * (i + 0.5), -ph / 2 + sh * (j + 0.5)
            tiles = []
            cols, rows = 8, 8
            tg = 0.006
            ts_u, ts_v = (sw - 0.03 - (cols - 1) * tg) / cols, (sh - 0.03 - (rows - 1) * tg) / rows
            for a in range(cols):
                for b in range(rows):
                    x = cx - sw / 2 + 0.015 + ts_u / 2 + a * (ts_u + tg)
                    y = cy - sh / 2 + 0.015 + ts_v / 2 + b * (ts_v + tg)
                    tiles.append(grid((x, y, zf + 0.014), (1, 0, 0), (0, 1, 0), ts_u, ts_v, 1, 1))
            m.add("array-tiles", "body", TILE if (i + j) % 2 == 0 else TILE2, merge(tiles))
            m.add("array-frame", "body", "#4A505A", box((cx, cy, zf + 0.008), (sw - 0.004, sh - 0.004, 0.01)))
    # sensors and small antennas on the Earth face's margin
    for p in ((-0.62, 1.40), (0.62, -1.40)):
        m.add("earth-sensor", "body", GREY, box((p[0] * 0.9, p[1], zf + 0.035), (0.09, 0.09, 0.05)))
        m.add("earth-sensor-eye", "body", BLK, frustum((p[0] * 0.9, p[1], zf + 0.06), (p[0] * 0.9, p[1], zf + 0.085), 0.03, 0.04, 10))
    for y in (1.43, -1.43):
        m.add("horn", "body", WHITE_P, frustum((0.0, y, zf + 0.02), (0.0, y, zf + 0.11), 0.03, 0.065, 14))
        m.add("horn-eye", "body", BLK, disc((0.0, y, zf + 0.112), (0, 0, 1), 0.052, 12))

    # --- the anti-Earth face (-Z): two white radiator panels, an omni antenna and two patches of gold foil
    for y in (-0.75, 0.75):
        m.add("aft-radiator", "body", WHITE_P, box((0.0, y, -BZ / 2 - 0.03), (BX * 0.82, 1.0, 0.02)))
        m.add("aft-radiator-seam", "body", OSR_P, lib.seams_on_face((0.0, y, -BZ / 2 - 0.042), (0, 0, -1), (1, 0, 0), BX * 0.8, 0.98, 3, 4, width=0.01, lift=0.0))
    m.add("omni", "body", WHITE_P, frustum((0.0, 0.0, -BZ / 2 - 0.02), (0.0, 0.0, -BZ / 2 - 0.3), 0.05, 0.09, 12))
    m.add("omni-tip", "body", GREY, rod((0.0, 0.0, -BZ / 2 - 0.3), (0.0, 0.0, -BZ / 2 - 0.5), 0.012, 6))
    for p in ((-0.4, 0.0), (0.4, 0.0)):
        m.add("aft-patch", "foil", GOLD_F, grid((p[0], p[1], -BZ / 2 - 0.036), (1, 0, 0), (0, 1, 0), 0.3, 0.45, 4, 5, crinkle=0.012, seed=int(50 + p[0] * 10)))

    # --- the -Y end: two round gold-foil discs (the electric thrusters, as on the model), and on the +Y end two star trackers
    for x in (-0.38, 0.38):
        p = V(x, -BY / 2 - 0.02, -0.12)
        m.add("thruster-foil", "foil", GOLD_F, frustum(p, p + V(0, -0.05, 0), 0.31, 0.31, 28))
        m.add("thruster-ring", "body", SILVER_D, torus(p + V(0, -0.05, 0), (0, 1, 0), 0.27, 0.014, 28, 6))
        m.add("thruster-grid", "body", BLK, disc(p + V(0, -0.052, 0), (0, -1, 0), 0.22, 24))
        m.add("thruster-hub", "body", GREY, frustum(p + V(0, -0.052, 0), p + V(0, -0.09, 0), 0.05, 0.04, 12))
    for x in (-0.38, 0.38):
        p = V(x, BY / 2, 0.3)
        m.add("startracker", "body", BLK, box(p + V(0, 0.05, 0), (0.12, 0.1, 0.12)))
        m.add("startracker-baffle", "body", GREY, frustum(p + V(0, 0.1, 0), p + V(0, 0.38, 0), 0.07, 0.12, 14, caps=False))

    # --- the two wings: a drive, a pair of stout struts opening to the panel's width (the V on the model), FOUR panels each
    pl, pw, yoke = 2.685, 3.0, 1.5
    for sgn in (-1, 1):
        x0 = sgn * BX / 2
        m.add("sada", "body", WHITE_P, frustum((x0 + sgn * 0.04, 0, 0), (x0 + sgn * 0.34, 0, 0), 0.16, 0.16, 18))
        m.add("sada-foil", "foil", GOLD_F, frustum((x0 + sgn * 0.1, 0, 0), (x0 + sgn * 0.28, 0, 0), 0.18, 0.18, 18, caps=False))
        m.add("sada-ring", "body", SILVER_D, torus((x0 + sgn * 0.34, 0, 0), (1, 0, 0), 0.15, 0.03, 18, 6))
        xe = x0 + sgn * (0.34 + yoke)
        for k in (-1, 1):
            m.add("yoke", "body", WHITE_P, rod((x0 + sgn * 0.34, 0, k * 0.1), (xe, 0, k * (pw / 2 - 0.1)), 0.06, 8))
            m.add("yoke-joint", "body", SILVER_D, frustum((xe - sgn * 0.05, 0, k * (pw / 2 - 0.1)), (xe + sgn * 0.06, 0, k * (pw / 2 - 0.1)), 0.09, 0.09, 10))
        m.add("yoke-brace", "body", WHITE_P, rod((xe, 0, -pw / 2 + 0.1), (xe, 0, pw / 2 - 0.1), 0.05, 8))
        m.add("yoke-mid", "body", WHITE_P, rod((x0 + sgn * 0.34, 0, 0), (xe, 0, 0), 0.045, 8))
        xs = xe
        gap = 0.07
        for i in range(4):
            xc = xs + sgn * pl / 2
            for role, col, mesh in lib.cell_panel((xc, 0, 0), (0, 0, 1), (1, 0, 0), pw, pl, (12, 11), 0.014, SILVER_D, cell_col=CELL_G, thick=0.028, back_col=WHITE_P, border=0.03):
                m.add("panel", role, col, mesh)
            for k in (-1, 1):
                m.add("panel-rail", "body", SILVER_D, box((xc, 0, k * pw / 2), (pl, 0.04, 0.04)))
            if i < 3:
                m.add("hinge", "body", GREY, box((xs + sgn * (pl + gap / 2), 0, 0), (gap, 0.045, pw * 0.97)))
            xs = xs + sgn * (pl + gap)
    palette(m, {(None, SILVER_D): "#BEC4CD", (None, "#6C737E"): "#9097A2"})
    return m
