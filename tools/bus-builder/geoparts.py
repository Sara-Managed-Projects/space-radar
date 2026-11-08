"""Parts the second round of batch m4-buses shares (release 2.0.0; forge #117): the Spacebus 4000B, GEOStar-2, DFH-4, I-3K and I-2K modules.

Each of those buses is drawn to its own layout; what they share is how a part is made, not where it goes: a box whose east and west walls are crinkled blanket in a
given colour with taped seams and patches (`blanket_box`), OSR radiators on the north and south faces (`radiators`), an Earth deck with horns, TT&C omnis and an Earth
sensor (`earth_deck`), the aft end (`aft`) and one deployed reflector with its feed cluster on the wall below it (`side_reflector`). Colours are flat ones in the app's
roles, so scene/pbr.js reads each surface as what it is: a `foil` part in gold or silver is crinkled metal foil, black is black blanket, a grey `body` part is metal.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

WHITE_OSR = "#DADFE6"     # white-painted or white OSR radiator (the GSAT clean-room photographs)
WHITE_OSR_SEAM = "#AEB5C0"
GRAPHITE = "#3B332C"      # a dark carbon-fibre reflector, as ISRO's clean-room photographs show (GSAT-30, GSAT-31)
GRAPHITE_BACK = "#2C2723"
BLANKET_BLACK = "#2B2E35"


def blanket_box(m, sx, sy, sz, colour, patch=(GOLD_L, GOLD_D), seed=3, seams=(3, 5), crinkle=0.04):
    """The box: a structure, its east and west (+/-Y) walls and its aft end in crinkled blanket of `colour`, taped seams and patches, corner rails."""
    m.add("structure", "body", STRUCT, lib.box((0, 0, 0), (sx - 0.02, sy - 0.02, sz - 0.02)))
    for sgn in (-1, 1):
        y = sgn * (sy / 2 + 0.02)
        u, v = ((0, 0, 1), (1, 0, 0)) if sgn > 0 else ((1, 0, 0), (0, 0, 1))
        su, sv = (sz, sx) if sgn > 0 else (sx, sz)
        m.add("blanket", "foil", colour, lib.grid((0, y, 0), u, v, su * 0.99, sv * 0.99, max(4, int(su / 0.25)), max(4, int(sv / 0.25)), crinkle=crinkle, seed=seed + sgn))
        m.add("blanket-seam", "foil", patch[1], lib.seams_on_face((0, y + sgn * 0.035, 0), (0, sgn, 0), (1, 0, 0), sx * 0.96, sz * 0.96, seams[0], seams[1], width=0.02, lift=0.0))
        for col, mesh in lib.patches_on_face((0, y + sgn * 0.045, 0), (0, sgn, 0), (1, 0, 0), sx, sz, 6, 0.4, list(patch), seed + 20 + sgn, lift=0.0, amp=0.025):
            m.add("blanket-patch", "foil", col, mesh)
    m.add("aft-blanket", "foil", colour, lib.grid((0, 0, -sz / 2 - 0.01), (0, 1, 0), (1, 0, 0), sy * 0.98, sx * 0.98, 6, 6, crinkle=crinkle, seed=seed + 9))
    for ex in (-1, 1):
        for ey in (-1, 1):
            m.add("rail", "body", SILVER_D, lib.box((ex * (sx / 2 + 0.01), ey * (sy / 2 + 0.01), 0), (0.05, 0.05, sz)))


def radiators(m, sx, sy, sz, face=WHITE_OSR, seam=WHITE_OSR_SEAM, over=0.0, wide=0.0, tiles=(5, 10), zc=0.0):
    """North and south (+/-X) radiators: an OSR panel 4 cm proud of the box, `wide` metres wider and `over` longer than the face, tiled, with an edge frame."""
    for sgn in (-1, 1):
        x = sgn * (sx / 2 + 0.05)
        w, h = sy + wide, sz + over
        m.add("radiator-panel", "body", STRUCT, lib.box((x, 0, zc), (0.04, w, h)))
        u, v = ((0, 1, 0), (0, 0, 1)) if sgn > 0 else ((0, 0, 1), (0, 1, 0))
        m.add("osr", "body", face, lib.grid((x + sgn * 0.025, 0, zc), u, v, w if sgn > 0 else h, h if sgn > 0 else w, 1, 1))
        m.add("osr-seam", "body", seam, lib.seams_on_face((x + sgn * 0.03, 0, zc), (sgn, 0, 0), (0, 1, 0), w, h, tiles[0], tiles[1], width=0.012, lift=0.0))
        for k in (-1, 1):
            m.add("radiator-edge", "body", SILVER_D, lib.box((x, k * w / 2, zc), (0.07, 0.035, h)))


def earth_deck(m, sx, sy, sz, foil, horns=((0.0, -0.35, 2, 3),), omnis=((-0.6, 0.6), (0.6, 0.6)), sensor=(0.0, 0.7)):
    """The Earth deck (+Z): blanket, horn clusters (x, y, rows, cols), TT&C omnis, an Earth sensor."""
    zf = sz / 2
    m.add("earth-deck", "foil", foil, lib.grid((0, 0, zf + 0.01), (1, 0, 0), (0, 1, 0), sx * 0.98, sy * 0.98, 6, 6, crinkle=0.025, seed=4))
    for x, y, r, c in horns:
        horn_array(m, "deck-horns", (x, y, zf + 0.02), (0, 0, 1), (1, 0, 0), r, c, 0.22, 0.09, 0.26)
    for x, y in omnis:
        omni(m, (x, y, zf), (0, 0, 1), 0.5)
    if sensor:
        m.add("earth-sensor", "body", BLACK, lib.box((sensor[0], sensor[1], zf + 0.08), (0.2, 0.2, 0.16)))
        m.add("earth-sensor-eye", "body", GREY, lib.frustum((sensor[0], sensor[1], zf + 0.16), (sensor[0], sensor[1], zf + 0.23), 0.05, 0.07, 10))


def aft(m, sx, sy, sz, foil=GOLD, engine_r=(0.08, 0.3, 0.7), ring=0.55):
    """The aft (-Z) end: launch-adapter cone and ring, the apogee engine, four thruster pairs, two star trackers on the walls."""
    za = -sz / 2
    m.add("adapter-cone", "body", SILVER_D, lib.frustum((0, 0, za), (0, 0, za - 0.3), min(sx, sy) * 0.4, ring, 28, caps=False))
    m.add("adapter-ring", "body", GREY, lib.torus((0, 0, za - 0.31), (0, 0, 1), ring, 0.032, 36, 6))
    if engine_r:
        engine(m, (0, 0, za + 0.05), *engine_r, foil=foil)
    for ex in (-1, 1):
        for ey in (-1, 1):
            thrusters(m, [((ex * (sx / 2 - 0.1), ey * (sy / 2 - 0.1), za), (ex * 0.35, ey * 0.35, -0.87)), ((ex * (sx / 2 - 0.25), ey * (sy / 2 + 0.03), za + 0.35), (ex * 0.1, ey * 0.95, -0.3))])
    startracker(m, (0.45, sy / 2 + 0.08, -0.6), (0.0, 1.0, 0.3))
    startracker(m, (-0.45, -sy / 2 - 0.08, -0.6), (0.0, -1.0, 0.3))


def side_reflector(m, label, sgn, sy, sz, x, out, z, d, tilt, front=DISH_FRONT, back=DISH_BACK, feed_z=None, feed=(2, 3), depth=None):
    """One deployed reflector of diameter `d` off the east (+1) or west (-1) wall: its vertex `out` metres from the wall at height z (from the box's centre), aperture
    turned `tilt` toward the body from the Earth; a hinge arm and a brace to the wall's Earth end, and its feed cluster low on the same wall."""
    import math
    zf = sz / 2
    y0 = sgn * sy / 2
    n = (0, -sgn * math.sin(math.radians(tilt)), math.cos(math.radians(tilt)))
    c = (x, y0 + sgn * out, z)
    reflector(m, label, c, n, d / 2, d / 2, d * 0.11, up=(1, 0, 0), arm_from=(x, y0 + sgn * 0.05, zf - 0.15), feed=False, ribs=10, front_col=front, back_col=back)
    m.add(label + "-brace", "body", GREY, lib.rod((x, y0 + sgn * 0.05, zf - 1.0), (x, y0 + sgn * out * 0.75, z - 0.1), 0.022, 5))
    if feed:
        fz = (-zf + 0.8) if feed_z is None else feed_z
        horn_array(m, label + "-feed", (x * 0.6, y0 + sgn * 0.16, fz), (0, sgn * 0.5, 0.86), (1, 0, 0), feed[0], feed[1], 0.2, 0.08, 0.28, plate_col=SILVER_D, horn_col=WHITE)
        m.add(label + "-waveguide", "body", SILVER, lib.rod((x * 0.6, y0 + sgn * 0.07, fz), (x * 0.6, y0 + sgn * 0.07, zf - 0.3), 0.03, 6))


def xbrace(m, sgn, x0, x1, w, z=0.0):
    """Two struts crossing between the drive's root and the first panel's corners: the X-shaped yoke CAST's renders show on the DFH-4."""
    for k in (-1, 1):
        m.add("yoke-x", "body", SILVER_D, lib.rod((x0, 0, z - k * w * 0.18), (x1, 0, z + k * w * 0.42), 0.028, 6))


def strings(m, sgn, x0, n, pl, pw, sada, yoke, gap=0.07, z=0.0, col="#9A3B2E", thick=0.03, lines=(-0.25, 0.25)):
    """The red-orange string and harness lines across the cell face of each panel of a glib.wing, as the clean-room photographs of GSAT-30 and GSAT-31 show them."""
    xs = x0 + sgn * (sada + yoke)
    for i in range(n):
        xc = xs + sgn * (pl / 2 + i * (pl + gap))
        for k in lines:
            m.add("panel-string", "body", col, lib.box((xc, thick / 2 + 0.007, z + k * pw), (pl * 0.95, 0.004, 0.022)))
