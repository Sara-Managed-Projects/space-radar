"""Boeing 702SP: the all-electric, smallest member of the 702 family, the geostationary satellites of the catalogue whose bus the sources name as a 702SP (ABS-2A, ABS-3A,
Eutelsat 115 West B, Eutelsat 117 West B, SES-15, SES-20, SES-21). Built in batch m4-buses (release 2.0.0), on the 702's parts (b702.py).

Metres, the app's axes: +Z the Earth deck, +X the wing axis (north-south), +Y east-west (the side the cells face).

WHAT IS PUBLISHED, AND USED AS THE SIZE: Gunter's Space Page, bus page 'HS-702 / BSS-702' (read 2026-11-07), quoting Boeing: 'a van-sized spacecraft 15 ft. high and 7 ft.
wide' (4.6 x 2.1 m) 'that weighs 4,000 lb. at launch'; all-electric, xenon ion (XIPS) thrusters for orbit raising and station-keeping, no apogee engine. McDowell's GCAT (CC BY 4.0,
satcat.tsv of 2026-11-07): ABS-2A, ABS-3A and Eutelsat 115 West B 4.6 x 2.1 m, span 40.0 m; Eutelsat 117 West B 4.8 x 2.1 m, 32.6 m; SES-15 6.0 x 2.0 m, 40 m; SES-20 and 21
5.0 x 3.5 m, 30 m. Drawn: a body 2.1 x 2.1 x 3.6 m, 4.6 m with the deck antennas and the ion thrusters; 40.0 m over the wings.
WHAT IS READ OFF PICTURES: SpaceX's public-domain (CC0) on-board photograph of ABS-3A and Eutelsat 115 West B separating (Wikimedia Commons 'ABS-EUTELSAT Separation
(16788442562).jpg', looked at only: a compact box in silver blanket, the dual-launch adapter ring on its aft end); Boeing's renders on Gunter's Space Page (ABS-2A, ABS-3A,
Eutelsat 115 West B, Eutelsat 117 West B; looked at only), which agree with one another: a small box, very long narrow wings of six panels with red hinge and harness lines,
and FOUR REFLECTORS IN AN X on long splayed arms, two off the east wall and two off the west, well clear of the body.
WHAT IS OURS (ESTIMATED): the reflectors' 2.2 m, their arms (2.0 m) and tilts; six panels of 2.2 x 2.65 m a wing; the 1.6 m mast; the four ion thrusters' places on the aft
corners; the deck horns. SES-20 and SES-21 are wider (GCAT 3.5 m) and have a different payload: they wear the same file, which draws the family's common layout.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from b702 import *  # noqa: F401,F403,E402

FILE_ID = "bus-boeing-702sp"
SX, SY, SZ = 2.1, 2.1, 3.6
SPAN, NP, PW = 40.0, 6, 2.2
MAST, SADA = 1.6, 0.35


def build(wings=True):
    m = Model(FILE_ID)
    zf = SZ / 2
    # the box: silver blanket on east and west (the separation photograph), ribbed radiators north and south
    m.add("structure", "body", STRUCT, lib.box((0, 0, 0), (SX - 0.02, SY - 0.02, SZ - 0.02)))
    for sgn in (-1, 1):
        y = sgn * (SY / 2 + 0.02)
        m.add("blanket", "foil", SILVER_FOIL, lib.grid((0, y, 0), (0, 0, 1) if sgn > 0 else (1, 0, 0), (1, 0, 0) if sgn > 0 else (0, 0, 1), SZ * 0.99 if sgn > 0 else SX * 0.99, SX * 0.99 if sgn > 0 else SZ * 0.99,
                                                       12 if sgn > 0 else 7, 7 if sgn > 0 else 12, crinkle=0.03, seed=20 + sgn))
        m.add("blanket-seam", "body", SILVER_D, lib.seams_on_face((0, y + sgn * 0.03, 0), (0, sgn, 0), (1, 0, 0), SX * 0.96, SZ * 0.96, 2, 4, width=0.02, lift=0.0))
        for col, mesh in lib.patches_on_face((0, y + sgn * 0.04, 0), (0, sgn, 0), (1, 0, 0), SX, SZ, 4, 0.35, [BLANKET, GOLD_D], 50 + sgn, lift=0.0, amp=0.015):
            m.add("blanket-patch", "foil", col, mesh)
        ribbed_radiator(m, (sgn * (SX / 2 + 0.03), 0, 0), (sgn, 0, 0), (0, 1, 0), SY * 0.98, SZ * 0.98, 12)
        for ey in (-1, 1):
            m.add("rail", "body", SILVER_D, lib.box((sgn * (SX / 2 + 0.01), ey * (SY / 2 + 0.01), 0), (0.05, 0.05, SZ)))
    m.add("earth-deck", "foil", SILVER_FOIL, lib.grid((0, 0, zf + 0.01), (1, 0, 0), (0, 1, 0), SX * 0.98, SY * 0.98, 6, 6, crinkle=0.02, seed=4))
    horn_array(m, "deck-horns", (0.0, -0.35, zf + 0.02), (0, 0, 1), (1, 0, 0), 2, 3, 0.24, 0.1, 0.28)
    for xx in (-0.8, 0.8):
        omni(m, (xx, 0.7, zf), (0, 0, 1), 0.5)
    m.add("earth-sensor", "body", BLACK, lib.box((0.0, 0.75, zf + 0.08), (0.22, 0.22, 0.16)))

    # four reflectors in an X on long splayed arms
    for sgn in (-1, 1):
        y0 = sgn * SY / 2
        for xs_ in (-1, 1):
            c = V(xs_ * 1.55, y0 + sgn * 1.85, zf - 0.2)
            nrm = unit(V(-xs_ * 0.25, -sgn * 0.38, 0.89))
            root = V(xs_ * 0.55, y0 + sgn * 0.05, zf - 0.35)
            reflector(m, "reflector", c, nrm, 1.1, 1.1, 0.24, up=(1, 0, 0), arm_from=root, feed=False, ribs=10)
            m.add("sunshield", "foil", "#D9CFB8", lib.torus(c + nrm * 0.24, nrm, 1.11, 0.045, 30, 5))
            m.add("reflector-brace", "body", GREY, lib.rod(root - V(0, 0, 0.9), c - nrm * 0.05 - (c - root) * 0.35, 0.022, 5))
            horn_array(m, "feed", (xs_ * 0.5, y0 + sgn * 0.15, -zf + 0.9), (xs_ * 0.3, sgn * 0.5, 0.81), (1, 0, 0), 2, 2, 0.24, 0.1, 0.32, plate_col=SILVER_D, horn_col=WHITE)
        for xx in (-0.45, 0.45):
            m.add("waveguide", "body", SILVER, lib.rod((xx, y0 + sgn * 0.08, -zf + 0.9), (xx, y0 + sgn * 0.08, zf - 0.3), 0.03, 6))

    # aft: the dual-launch adapter ring (the photograph), four XIPS ion thrusters on gimbal arms, no apogee engine
    za = -zf
    m.add("aft-blanket", "foil", SILVER_FOIL, lib.grid((0, 0, za - 0.01), (0, 1, 0), (1, 0, 0), SY * 0.98, SX * 0.98, 5, 5, crinkle=0.025, seed=9))
    m.add("adapter-cone", "body", SILVER_D, lib.frustum((0, 0, za), (0, 0, za - 0.3), 0.75, 0.6, 28, caps=False))
    m.add("adapter-ring", "body", GREY, lib.torus((0, 0, za - 0.31), (0, 0, 1), 0.6, 0.035, 36, 6))
    for ex in (-1, 1):
        for ey in (-1, 1):
            base = V(ex * (SX / 2 - 0.2), ey * (SY / 2 - 0.2), za)
            p = base + V(ex * 0.15, ey * 0.15, -0.35)
            m.add("xips-arm", "body", GREY, lib.rod(base, p, 0.04, 6))
            d = unit(V(ex * 0.3, ey * 0.3, -0.9))
            m.add("xips-body", "body", SILVER_D, lib.frustum(p, p + d * 0.2, 0.15, 0.15, 18))
            m.add("xips-grid", "body", BLACK, lib.disc(p + d * 0.205, d, 0.13, 18))
    startracker(m, (0.6, SY / 2 + 0.05, -0.8), (0.0, 1.0, 0.35))
    startracker(m, (-0.6, -SY / 2 - 0.05, -0.8), (0.0, -1.0, 0.35))

    if wings:
        pl = round(((SPAN - SX) / 2 - 0.05 - SADA - MAST - 0.06 - (NP - 1) * 0.06) / NP, 2)
        for sgn in (-1, 1):
            mast_wing(m, sgn, sgn * (SX / 2 + 0.05), NP, pl, PW, (10, 14), mast=MAST, sada=SADA, z=-0.3, sada_r=0.16)
    return palette(m, {**COMMON_FOLDS, ("foil", GOLD_D): GOLD})
