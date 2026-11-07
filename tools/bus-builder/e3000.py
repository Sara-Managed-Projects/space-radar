"""Airbus Eurostar E3000 (and its S, LX, EOR and e members): the 48 geostationary satellites of the catalogue whose bus the sources name. Rebuilt in batch m4-buses (release 2.0.0).

Metres, the app's axes: +Z the Earth deck, +X the wing axis (north-south), +Y east-west (the side the cells face).

WHAT IS PUBLISHED, AND USED AS THE SIZE:
  - the stowed body: MEASAT-3B 6.6 x 2.8 x 2.3 m (Wikipedia 'MEASAT-3b', read 2026-11-07), Intelsat 10-02 7.5 x 2.9 x 2.4 m (Wikipedia infobox, read 2026-11-07); the
    stowed height takes in the Earth-deck antenna tower and the stowed reflectors. Drawn: a box 2.4 (north-south) x 2.9 (east-west) x 4.8 m, 6.9 m with the tower.
  - the span: MEASAT-3B 39.4 m, GCAT's median of the 48 mapped satellites 39 m (30 to 47; McDowell, CC BY 4.0, read 2026-11-07). Drawn 39.2 m.
  - the width over the antennas: Eutelsat 70B 'is 7 m high with a width of 8 m due to the antennas' (Wikipedia, read 2026-11-07). Drawn 8.7 m: the renders' reflectors are nearly the wall's height, so they are drawn 2.9 and 2.7 m, larger than 70B's width alone would give.
WHAT IS READ OFF PICTURES (Airbus's own renders, on Gunter's Space Page, LOOKED AT ONLY: Arabsat 5A, 5B, 5C, Astra 1M, 1N, 2E, 3B, 5B, Eutelsat 3B, 9B, 172B, W5A, Hot Bird 8,
Amazonas 2, Anasis-2, Ekspress-AM7, AMU1, DirecTV-15, SES-11; NASA's render of SES-14 with GOLD; the UK MOD's of Skynet 5D). The twenty-odd renders agree on one layout, and that is
what is drawn: a tall box in gold blanket; the north and south faces wholly radiator, broad silver OSR panels standing proud of the box and longer than it; on each of the east and west
faces TWO large deployed reflectors on hinge arms from the top of the wall, one high above the deck and one lower and outboard, their concave faces turned to the Earth and to the
feed clusters low on the same wall; an Earth-deck tower carrying a smaller dual reflector, horns and the TT&C antennas; long wings of four panels each, every one on a long thin
V-shaped yoke from the drive at mid-height of the radiator face; the apogee engine and thruster pods on the aft end.
THERE IS NO PHOTOGRAPH of a flown E3000 under a free licence (none on Wikimedia Commons, none in NASA's or ESA's open libraries, searched 2026-11-07), so this is drawn from the
maker's renders, which are consistent with each other, and the card and registry/models.yaml say so.
WHAT IS OURS (ESTIMATED), because no page opened gives it: the reflectors' 2.9 m and 2.7 m diameters (the renders show them nearly the wall's height; 8.7 m over them, against Eutelsat 70B's 8 m), their positions and tilts; the deck reflector's 1.6 m; the
panel size (3.9 x 2.5 m, four a wing, from the span and the renders' proportions); the yoke's 2.8 m; the horn and feed clusters; the radiator tile pattern. A satellite's own payload
(how many reflectors, which feeds) differs from one to the next: this file draws the family's common layout, not any one satellite's antennas.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-eurostar-e3000"
SX, SY, SZ = 2.4, 2.9, 4.8          # north-south, east-west, height
SPAN, NP, PW = 39.2, 4, 2.5
YOKE, SADA = 2.8, 0.45


def osr_radiator(m, sgn, sy, sz, zc, over=0.3, tiles=(6, 14)):
    """A north or south radiator: a broad OSR panel standing 6 cm proud of the box, `over` metres longer than it at the aft end, tiled (the mirror tiles' seams) and edged."""
    x = sgn * (SX / 2 + 0.06)
    h = sz + over
    c = (x, 0, zc - over / 2)
    n, u = (sgn, 0, 0), (0, 1, 0)
    m.add("radiator-panel", "body", STRUCT, lib.box(c, (0.05, sy + 0.08, h)))
    m.add("osr", "body", OSR, lib.grid((x + sgn * 0.03, 0, zc - over / 2), (0, sgn, 0) if sgn > 0 else (0, 0, 1), (0, 0, 1) if sgn > 0 else (0, 1, 0), sy if sgn > 0 else h, h if sgn > 0 else sy, 1, 1))
    m.add("osr-seam", "body", OSR_D, lib.seams_on_face((x + sgn * 0.036, 0, zc - over / 2), n, u, sy, h, tiles[0], tiles[1], width=0.014, lift=0.0))
    for k in (-1, 1):
        m.add("radiator-edge", "body", SILVER_D, lib.box((x + sgn * 0.01, k * (sy / 2 + 0.04), zc - over / 2), (0.08, 0.04, h)))
    # the heat-pipe headers across the panel, two silver bands
    for zz in (zc - h * 0.25, zc + h * 0.2):
        m.add("heat-pipe", "body", SILVER_D, lib.box((x + sgn * 0.04, 0, zz), (0.025, sy * 0.96, 0.05)))


def feed_cluster(m, label, c, n, rows, cols, pitch=0.2, r0=0.085, depth=0.3):
    """A feed array low on the east or west wall looking up at its reflector: horns on a gold-wrapped plate, a waveguide run down to the wall."""
    horn_array(m, label, c, n, (1, 0, 0), rows, cols, pitch, r0, depth, plate_col=GOLD_D, horn_col=WHITE)
    c, n = V(c), unit(V(n))
    m.add(label + "-mount", "foil", GOLD, lib.box(c - n * 0.12, (cols * pitch + 0.1, 0.24, rows * pitch * 0.9 + 0.1), up_frame(n, (1, 0, 0))))


def build(wings=True):
    m = Model(FILE_ID)
    zf = SZ / 2
    body(m, SX, SY, SZ, foil=GOLD, rad_x=OSR, seed=11, radiator_seams=(4, 8))
    deck(m, SX, SY, SZ, tone=GOLD_D, foil=GOLD)
    for sgn in (-1, 1):
        osr_radiator(m, sgn, SY, SZ, 0.0)

    # the east and west walls: foil-wrapped equipment boxes and waveguide runs, the feeds low down
    for sgn in (-1, 1):
        y = sgn * (SY / 2 + 0.06)
        for k, (zz, w) in enumerate(((0.9, 1.4), (-0.2, 1.1), (1.7, 0.9))):
            m.add("wall-unit", "foil", GOLD_L if k % 2 else GOLD, lib.box((0.3 * (-1) ** k, y + sgn * 0.12, zz), (w, 0.24, 0.5), crinkle=0.015, seed=40 + k, div=0.25))
        for xx in (-0.7, -0.45, 0.55):
            m.add("waveguide", "body", SILVER, lib.rod((xx, y + sgn * 0.05, -zf + 1.2), (xx, y + sgn * 0.05, zf - 0.3), 0.03, 6))
        feed_cluster(m, "feed-high", (-0.45, y + sgn * 0.18, -zf + 1.0), (0, sgn * 0.42, 0.91), 3, 3)
        feed_cluster(m, "feed-low", (0.55, y + sgn * 0.18, -zf + 0.65), (0, sgn * 0.62, 0.78), 2, 3)

    # the two big deployed reflectors a side: hinge arms from the top of the wall
    for sgn in (-1, 1):
        y0 = sgn * SY / 2
        # high: 2.9 m, above the deck and outboard (Astra 2E, Eutelsat 9B: nearly the height of the wall)
        reflector(m, "reflector-high", (0.45, y0 + sgn * 1.7, zf + 0.85), (0, -sgn * 0.26, 0.966), 1.45, 1.45, 0.33, up=(1, 0, 0),
                  arm_from=(0.45, y0 + sgn * 0.05, zf - 0.15), feed=False, ribs=10)
        # low: 2.7 m, lower and further out
        reflector(m, "reflector-low", (-0.5, y0 + sgn * 1.6, zf - 1.85), (0, -sgn * 0.2, 0.98), 1.35, 1.35, 0.3, up=(1, 0, 0),
                  arm_from=(-0.5, y0 + sgn * 0.05, zf - 0.35), feed=False, ribs=10)
        # the second arm of each, a brace from lower on the wall
        m.add("reflector-brace", "body", GREY, lib.rod((0.45, y0 + sgn * 0.05, zf - 1.1), (0.45, y0 + sgn * 1.2, zf + 0.55), 0.025, 5))
        m.add("reflector-brace", "body", GREY, lib.rod((-0.5, y0 + sgn * 0.05, zf - 2.6), (-0.5, y0 + sgn * 1.1, zf - 1.9), 0.025, 5))

    # the Earth deck: a tower with a dual reflector, horn clusters, TT&C omnis, an Earth sensor
    m.add("tower", "foil", GOLD, lib.box((0.0, -0.25, zf + 0.55), (1.3, 1.0, 1.1), crinkle=0.02, seed=7, div=0.3))
    m.add("tower-top", "body", BLACK, lib.grid((0.0, -0.25, zf + 1.105), (1, 0, 0), (0, 1, 0), 1.3, 1.0))
    reflector(m, "deck-reflector", (0.0, -0.2, zf + 1.95), (0, 0.42, 0.91), 0.8, 0.8, 0.18, up=(1, 0, 0), arm_from=(0.0, -0.4, zf + 1.1), feed=False, ribs=8)
    m.add("subreflector", "body", DISH_BACK, clib_dish((0.0, 0.55, zf + 1.45), (0, -0.6, 0.8), 0.24, 0.05))
    m.add("subreflector-strut", "body", GREY, lib.rod((0.0, 0.25, zf + 1.1), (0.0, 0.55, zf + 1.42), 0.02, 5))
    horn_array(m, "deck-horns", (0.0, 0.85, zf + 0.04), (0, 0, 1), (1, 0, 0), 2, 4, 0.24, 0.1, 0.25)
    for xx in (-0.85, 0.85):
        omni(m, (xx, 1.15, zf), (0, 0, 1), 0.55)
    m.add("earth-sensor", "body", BLACK, lib.box((0.8, -1.1, zf + 0.08), (0.22, 0.22, 0.16)))
    m.add("earth-sensor-eye", "body", GREY, lib.frustum((0.8, -1.1, zf + 0.16), (0.8, -1.1, zf + 0.24), 0.06, 0.08, 10))

    # aft end: apogee engine, four thruster pods, the omni antenna, star trackers on the walls
    engine(m, (0, 0, -zf + 0.05), 0.1, 0.38, 0.85)
    for ex in (-1, 1):
        for ey in (-1, 1):
            p = (ex * (SX / 2 - 0.15), ey * (SY / 2 - 0.15), -zf)
            m.add("thruster-pod", "foil", GOLD_D, lib.box((p[0], p[1], p[2] + 0.05), (0.26, 0.26, 0.12)))
            thrusters(m, [((p[0], p[1], p[2] - 0.02), (ex * 0.3, ey * 0.3, -0.9)), ((p[0], p[1] + ey * 0.1, p[2] + 0.15), (0, ey * 0.9, -0.3))])
    omni(m, (0.6, 0.5, -zf - 0.38), (0, 0, -1), 0.6)
    startracker(m, (0.7, SY / 2 + 0.08, -0.9), (0.0, 1.0, 0.35))
    startracker(m, (-0.7, -SY / 2 - 0.08, -0.9), (0.0, -1.0, 0.35))

    if wings:
        pl = round(((SPAN - SX) / 2 - 0.06 - SADA - YOKE - (NP - 1) * 0.07) / NP, 2)
        for sgn in (-1, 1):
            wing(m, sgn, sgn * (SX / 2 + 0.06), NP, pl, PW, (10, 14), yoke_len=YOKE, sada_len=SADA, z=-0.2, sada_r=0.2)
    return palette(m, {**COMMON_FOLDS})


def clib_dish(c, n, r, depth):
    """A small solid dish (the sub-reflector): comms-builder's paraboloid."""
    import clib
    return clib.dish(V(c), unit(V(n)), r, depth, seg=18)
