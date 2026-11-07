"""Lockheed Martin A2100AX and A2100AXS: the geostationary satellites of the catalogue whose bus the sources name as an A2100AX or AXS (registry/geo-buses.yaml, bus
`a2100ax`). Rebuilt in batch m4-buses (release 2.0.0). The smaller A2100A and the later LM 2100 look different and are not drawn by this file.

Metres, the app's axes: +Z the Earth deck, +X the wing axis (north-south), +Y east-west (the side the cells face).

WHAT IS PUBLISHED, AND USED AS THE SIZE: McDowell's GCAT (CC BY 4.0, satcat.tsv of 2026-11-07), the A2100AX and AXS satellites: 'Length' 4.5 to 7.7 m, median 6.0; 'Diameter'
1.8 to 3.6, median 2.5; 'Span' 21 to 27 m, median 26.9. Wikipedia 'JCSAT-3A' (read 2026-11-07): '27 x 9 m with solar panels and antennas deployed'. Wikipedia 'A2100' (read
2026-11-07): the central propellant tank and the LEROS apogee engine. Drawn: a body 2.2 (north-south) x 2.5 (east-west) x 4.9 m, 6.0 m with the deck tower; 26.9 m over the
wings; 8.9 m across the deployed reflectors.
WHAT IS READ OFF PICTURES: Lockheed Martin's renders on Gunter's Space Page (AMC-15, Astra 1KR, Astra 1L, GE-1A; looked at only), which agree with one another: a tall box in
crinkled SILVER blanket; on the north and south faces broad, dark, mirror-like OSR radiator panels standing out from the box; one large deployed reflector on each of the east
and west walls, swung out on its arm from the Earth end, and a dual reflector on a tower on the Earth deck; BROAD wings of four near-square panels, each wing standing off the
body on a long triangular yoke of struts (the stand-off the m2 draft left out). There is no photograph of a flown commercial A2100 under a free licence (Commons, NASA, searched
2026-11-07): the card says the shape is drawn from the maker's renders.
WHAT IS OURS (ESTIMATED): the reflectors' 3.0 m (from JCSAT-3A's 9 m width) and the deck reflector's 1.5 m, their arms and tilts; the panel size (2.6 x 2.55 m, four a wing,
from the span and the renders' proportions); the yoke's 2.2 m; the horn clusters and feeds; the radiator tile pattern.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-a2100ax"
SX, SY, SZ = 2.2, 2.5, 4.9
SPAN, NP, PW = 26.9, 4, 2.6
YOKE, SADA = 2.2, 0.4
OSR_DARK = "#4C5068"      # the renders' dark, mirror-like radiators (they show the black of space)
OSR_DARK_SEAM = "#7A7F99"
SILVER_BLANKET = "#C8CCD2"


def build(wings=True):
    m = Model(FILE_ID)
    zf = SZ / 2
    # the box in crinkled silver blanket, the dark radiators north and south standing proud and longer than the box
    m.add("structure", "body", STRUCT, lib.box((0, 0, 0), (SX - 0.02, SY - 0.02, SZ - 0.02)))
    for sgn in (-1, 1):
        y = sgn * (SY / 2 + 0.02)
        m.add("blanket", "foil", SILVER_BLANKET, lib.grid((0, y, 0), (0, 0, 1) if sgn > 0 else (1, 0, 0), (1, 0, 0) if sgn > 0 else (0, 0, 1), SZ * 0.99 if sgn > 0 else SX * 0.99, SX * 0.99 if sgn > 0 else SZ * 0.99,
                                                          18 if sgn > 0 else 8, 8 if sgn > 0 else 18, crinkle=0.045, seed=60 + sgn))
        m.add("blanket-seam", "body", SILVER_D, lib.seams_on_face((0, y + sgn * 0.04, 0), (0, sgn, 0), (1, 0, 0), SX * 0.96, SZ * 0.96, 3, 6, width=0.018, lift=0.0))
        for col, mesh in lib.patches_on_face((0, y + sgn * 0.05, 0), (0, sgn, 0), (1, 0, 0), SX, SZ, 7, 0.4, [SILVER_FOIL, GOLD_D, SILVER_D], 70 + sgn, lift=0.0, amp=0.02):
            m.add("blanket-patch", "foil", col, mesh)
        # equipment boxes in silver blanket along the wall
        for k, zz in enumerate((-1.4, -0.3, 0.8)):
            m.add("wall-unit", "foil", SILVER_FOIL, lib.box((0.35 * (-1) ** k, y + sgn * 0.13, zz), (1.1, 0.24, 0.55), crinkle=0.02, seed=80 + k, div=0.25))
    for sgn in (-1, 1):
        x = sgn * (SX / 2 + 0.07)
        h = SZ + 0.4
        m.add("radiator-panel", "body", STRUCT, lib.box((x, 0, -0.1), (0.05, SY + 0.3, h)))
        m.add("osr", "body", OSR_DARK, lib.grid((x + sgn * 0.03, 0, -0.1), (0, sgn, 0) if sgn > 0 else (0, 0, 1), (0, 0, 1) if sgn > 0 else (0, 1, 0), (SY + 0.3) if sgn > 0 else h, h if sgn > 0 else (SY + 0.3), 1, 1))
        m.add("osr-seam", "body", OSR_DARK_SEAM, lib.seams_on_face((x + sgn * 0.036, 0, -0.1), (sgn, 0, 0), (0, 1, 0), SY + 0.3, h, 5, 12, width=0.012, lift=0.0))
        for k in (-1, 1):
            m.add("radiator-edge", "body", SILVER_D, lib.box((x, k * (SY / 2 + 0.17), -0.1), (0.08, 0.04, h)))
    # Earth deck: silver blanket, a tower with a dual reflector, horns, omnis
    m.add("earth-deck", "foil", SILVER_FOIL, lib.grid((0, 0, zf + 0.01), (1, 0, 0), (0, 1, 0), SX * 0.98, SY * 0.98, 7, 7, crinkle=0.025, seed=5))
    m.add("tower", "foil", SILVER_BLANKET, lib.box((0.0, 0.3, zf + 0.5), (1.1, 0.9, 1.0), crinkle=0.025, seed=6, div=0.25))
    reflector(m, "deck-reflector", (0.0, -0.35, zf + 1.45), (0, 0.45, 0.89), 0.75, 0.75, 0.17, up=(1, 0, 0), arm_from=(0.0, 0.0, zf + 1.0), feed=False, ribs=8)
    m.add("subreflector-strut", "body", GREY, lib.rod((0.0, 0.6, zf + 1.0), (0.0, 0.75, zf + 1.35), 0.02, 5))
    m.add("subreflector", "body", DISH_BACK, lib.disc((0.0, 0.75, zf + 1.38), unit(V(0, -0.5, 0.86)), 0.22, 16))
    horn_array(m, "deck-horns", (0.0, -0.75, zf + 0.03), (0, 0, 1), (1, 0, 0), 2, 3, 0.22, 0.09, 0.25)
    for xx in (-0.8, 0.8):
        omni(m, (xx, 1.0, zf), (0, 0, 1), 0.5)
    # one large reflector a side, on its arm from the Earth end of the wall; the feed low on the wall
    for sgn in (-1, 1):
        y0 = sgn * SY / 2
        reflector(m, "reflector", (0.0, y0 + sgn * 1.85, zf - 0.4), (0, -sgn * 0.45, 0.89), 1.5, 1.5, 0.33, up=(1, 0, 0),
                  arm_from=(0.0, y0 + sgn * 0.08, zf - 0.2), feed=False, ribs=12)
        m.add("reflector-brace", "body", GREY, lib.rod((0.0, y0 + sgn * 0.08, zf - 1.3), (0.0, y0 + sgn * 1.2, zf - 0.6), 0.025, 5))
        horn_array(m, "feed", (0.0, y0 + sgn * 0.18, -zf + 1.2), (0, sgn * 0.5, 0.86), (1, 0, 0), 3, 3, 0.22, 0.09, 0.32, plate_col=SILVER_D, horn_col=WHITE)
        for xx in (-0.4, 0.4):
            m.add("waveguide", "body", SILVER, lib.rod((xx, y0 + sgn * 0.08, -zf + 1.2), (xx, y0 + sgn * 0.08, zf - 0.3), 0.03, 6))
    # aft: LEROS apogee engine, thrusters, star trackers, adapter ring
    za = -zf
    m.add("aft-blanket", "foil", SILVER_BLANKET, lib.grid((0, 0, za - 0.01), (0, 1, 0), (1, 0, 0), SY * 0.98, SX * 0.98, 6, 6, crinkle=0.03, seed=9))
    m.add("adapter-cone", "body", SILVER_D, lib.frustum((0, 0, za), (0, 0, za - 0.3), 0.8, 0.6, 28, caps=False))
    m.add("adapter-ring", "body", GREY, lib.torus((0, 0, za - 0.31), (0, 0, 1), 0.6, 0.035, 36, 6))
    engine(m, (0, 0, za + 0.05), 0.08, 0.3, 0.7, foil=SILVER_FOIL)
    for ex in (-1, 1):
        for ey in (-1, 1):
            thrusters(m, [((ex * (SX / 2 - 0.1), ey * (SY / 2 - 0.1), za), (ex * 0.35, ey * 0.35, -0.87)), ((ex * (SX / 2 - 0.3), ey * (SY / 2 + 0.03), za + 0.4), (ex * 0.1, ey * 0.95, -0.3))])
    startracker(m, (0.6, SY / 2 + 0.1, -0.9), (0.0, 1.0, 0.3))
    startracker(m, (-0.6, -SY / 2 - 0.1, -0.9), (0.0, -1.0, 0.3))
    if wings:
        pl = round(((SPAN - SX) / 2 - 0.1 - SADA - YOKE - (NP - 1) * 0.07) / NP, 2)
        for sgn in (-1, 1):
            xs = sgn * (SX / 2 + 0.1)
            wing(m, sgn, xs, NP, pl, PW, (14, 14), yoke_len=YOKE, sada_len=SADA, z=0.0, sada_r=0.18)
            # the stand-off struts: two diagonals from the box's corners to the yoke's outer end, the A2100's triangle
            xe = xs + sgn * (SADA + YOKE)
            for k in (-1, 1):
                m.add("standoff-strut", "body", SILVER_D, lib.rod((xs, 0, k * 1.3), (xe, 0, k * PW * 0.38), 0.03, 6))
    return palette(m, {**COMMON_FOLDS, ("foil", GOLD_D): GOLD, ("foil", SILVER_D): SILVER_FOIL})
