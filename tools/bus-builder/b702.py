"""Boeing 702HP and 702MP (BSS-702): the geostationary satellites of the catalogue whose bus the sources name as a 702 of the larger two members. Rebuilt in batch m4-buses
(release 2.0.0). The 702SP, which is smaller and all-electric, is its own file (b702sp.py), and the GEM (SkyTerra 1, a 22 m reflector) is not drawn.

Metres, the app's axes: +Z the Earth deck, +X the wing axis (north-south), +Y east-west (the side the cells face).

WHAT IS PUBLISHED, AND USED AS THE SIZE: McDowell's GCAT (CC BY 4.0, satcat.tsv of 2026-11-07), the 702HP and 702MP satellites mapped here: 'Length' 6.0 to 9.0 m, median
7.0; 'Diameter' 2.0 to 3.5, median 3.2; 'Span' 33.8 to 48.1 m, median 40 (Galaxy 3C 47.8, Anik F2 45.6, DirecTV 11 and 12 48.1, SES-9 44, Intelsat 35e and 37e 44, AMOS-17 and
JCSAT-18 35, Inmarsat-5 33.8). Drawn: a body 3.0 (north-south) x 3.3 (east-west) x 5.6 m, 7.0 m with the Earth-deck antennas; 40.4 m over the wings. Gunter's Space Page, bus page
'HS-702 / BSS-702' (read 2026-11-07): 'Deployable radiators use flexible heat pipes, which increase packageable radiator area'; the payload module 'mounts to the common bus module';
the first 702s flew 'solar arrays with concentrators' and the later ones flat triple-junction arrays (the concentrator troughs are NOT drawn: of the satellites mapped here only
Galaxy 3C flew them, and it is the oldest).
WHAT IS READ OFF PICTURES: one PHOTOGRAPH of flight hardware, Morelos 3 (a 702HP) stowed in the clean room at Cape Canaveral beside its fairing (Wikimedia Commons, 'Satelite Morelos
III.jpg', CC BY-SA 4.0, looked at only): the body wrapped in BLACK blanket, the stowed wing stack on the north face. The US Air Force's public-domain drawing of WGS, which is a 702HP
(Commons 'MC-2941 Wideband Global SATCOM Satellite.png'): the wing carried on ONE long mast from its drive, not a yoke; the broad RIBBED radiator panels folded out beside the body
at the Earth end of the north and south faces; the dark blanket. Boeing's renders on Gunter's Space Page (Anik F2, DirecTV-10, Galaxy 3C, Inmarsat-5, Intelsat 21, Horizons-3e,
AMOS-17; looked at only): the very long narrow wings of five or six panels with red hinge lines; four large reflectors in an X about the body, two on the east face and two on the
west, side by side, each on a deployment arm from the Earth end of its wall; smaller dishes and horns on the deck.
WHAT IS OURS (ESTIMATED), because no page opened gives it: the reflectors' 2.7 m (from the renders, against the 3.3 m body), their arms and tilts; the deployed radiators' size
(1.9 x 3.0 m each) and angle; the mast's 3.2 m; five panels of 2.5 x 3.1 m a wing; the deck antennas. A satellite's own payload differs from the next (Inmarsat-5's Ka-band
steerable dishes, Morelos 3's 22 m L-band reflector): this file draws the family's common layout. Morelos 3 is routed to the stand-in for that reason (registry/geo-buses.yaml).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glib import *  # noqa: F401,F403,E402

FILE_ID = "bus-boeing-702"
SX, SY, SZ = 3.0, 3.3, 5.6
SPAN, NP, PW = 40.4, 6, 2.35
MAST, SADA = 3.2, 0.4
BLANKET = "#2B2E35"      # the black Kapton the Morelos 3 photograph shows
BLANKET_L = "#4A4E57"
RED_LINE = "#9A3B2E"
RAD_SILVER = "#9EA4AE"   # silvered OSR radiator, metal: the WGS drawing's grey ribbed panels, not white paint
RAD_RIB = "#767C86"     # the hinge and harness lines the renders draw red on the cells


def dark_body(m, sx, sy, sz, seed=5):
    """The 702's box: black blanket on every face but the radiators, rumpled and taped, with grey patches; the north and south faces ribbed radiators."""
    m.add("structure", "body", STRUCT, lib.box((0, 0, 0), (sx - 0.02, sy - 0.02, sz - 0.02)))
    for sgn in (-1, 1):
        y = sgn * (sy / 2 + 0.02)
        m.add("blanket", "foil", BLANKET, lib.grid((0, y, 0), (0, 0, 1) if sgn > 0 else (1, 0, 0), (1, 0, 0) if sgn > 0 else (0, 0, 1), sz * 0.99 if sgn > 0 else sx * 0.99, sx * 0.99 if sgn > 0 else sz * 0.99,
                                                  int(sz / 0.3) if sgn > 0 else int(sx / 0.3), int(sx / 0.3) if sgn > 0 else int(sz / 0.3), crinkle=0.035, seed=seed + sgn))
        m.add("blanket-seam", "body", BLANKET_L, lib.seams_on_face((0, y + sgn * 0.03, 0), (0, sgn, 0), (1, 0, 0), sx * 0.96, sz * 0.96, 3, 5, width=0.02, lift=0.0))
        for col, mesh in lib.patches_on_face((0, y + sgn * 0.04, 0), (0, sgn, 0), (1, 0, 0), sx, sz, 5, 0.45, [BLANKET_L, SILVER_FOIL], seed + 30 + sgn, lift=0.0, amp=0.02):
            m.add("blanket-patch", "foil", col, mesh)
    # north and south: the fixed ribbed radiator over the Earth-end 60 % of the face (the payload's), black blanket below it over the bus module
    for sgn in (-1, 1):
        ribbed_radiator(m, (sgn * (sx / 2 + 0.03), 0, sz * 0.2), (sgn, 0, 0), (0, 1, 0), sy * 0.98, sz * 0.58, 16)
        m.add("blanket", "foil", BLANKET, lib.grid((sgn * (sx / 2 + 0.02), 0, -sz * 0.3), (0, 1, 0) if sgn > 0 else (0, 0, 1), (0, 0, 1) if sgn > 0 else (0, 1, 0),
                                                  sy * 0.98 if sgn > 0 else sz * 0.38, sz * 0.38 if sgn > 0 else sy * 0.98, 9 if sgn > 0 else 6, 6 if sgn > 0 else 9, crinkle=0.035, seed=40 + sgn))
    za = -sz / 2
    m.add("aft-blanket", "foil", BLANKET, lib.grid((0, 0, za - 0.01), (0, 1, 0), (1, 0, 0), sy * 0.98, sx * 0.98, 6, 6, crinkle=0.03, seed=seed + 9))
    m.add("adapter-cone", "body", SILVER_D, lib.frustum((0, 0, za), (0, 0, za - 0.4), min(sx, sy) * 0.4, 0.6, 28, caps=False))
    m.add("adapter-ring", "body", GREY, lib.torus((0, 0, za - 0.41), (0, 0, 1), 0.6, 0.035, 36, 6))
    for ex in (-1, 1):
        for ey in (-1, 1):
            m.add("rail", "body", SILVER_D, lib.box((ex * (sx / 2 + 0.01), ey * (sy / 2 + 0.01), 0), (0.06, 0.06, sz)))


def ribbed_radiator(m, c, n, u, su, sv, ribs, frame=True, face=RAD_SILVER, rib=RAD_RIB):
    """A radiator panel: silver OSR face with `ribs` heat-pipe ribs running along v (n x u), a grey edge frame. Centred on c, facing n."""
    c, n, u = V(c), unit(V(n)), unit(V(u))
    v = np.cross(n, u)
    R = np.column_stack([u, v, n])
    m.add("radiator-face", "body", face, lib.box(c, (su, sv, 0.04), R))
    for k in range(ribs):
        x = -su / 2 + su * (k + 0.5) / ribs
        m.add("radiator-rib", "body", rib, lib.box(c + u * x + n * 0.035, (0.035, sv * 0.97, 0.03), R))
    if frame:
        for s in (-1, 1):
            m.add("radiator-frame", "body", SILVER_D, lib.box(c + u * s * su / 2 + n * 0.02, (0.05, sv, 0.06), R))
            m.add("radiator-frame", "body", SILVER_D, lib.box(c + v * s * sv / 2 + n * 0.02, (su, 0.05, 0.06), R))


def deployed_radiators(m, sx, sy, sz, out=1.9, h=3.0, angle=20, back=BLANKET):
    """The 702's deployable radiators: on the north and south faces, one panel hinged at each east and west edge, swung out beside the body at the Earth end, `angle`
    degrees back from the face's plane; ribbed on the face that looks north or south, black blanket behind."""
    a = math.radians(angle)
    for sx_ in (-1, 1):
        for sy_ in (-1, 1):
            hinge = V(sx_ * (sx / 2 + 0.05), sy_ * (sy / 2 + 0.02), sz / 2 - h / 2 - 0.1)
            u = unit(V(-sx_ * math.sin(a), sy_ * math.cos(a), 0))   # out from the hinge, leaning back toward the body's plane
            n = unit(np.cross(u, V(0, 0, 1)) * (1 if np.dot(np.cross(u, V(0, 0, 1)), V(sx_, 0, 0)) > 0 else -1))
            c = hinge + u * (out / 2 + 0.05)
            ribbed_radiator(m, c, n, u, out, h, 9)
            m.add("radiator-back", "foil", back, lib.grid(c - n * 0.03, -u, np.cross(n, u), out * 0.98, h * 0.98, 4, 6, crinkle=0.02, seed=int(7 + sx_ * 3 + sy_)))
            for zz in (-h / 2 + 0.2, h / 2 - 0.2):
                m.add("radiator-hinge", "body", GREY, lib.frustum(hinge + V(0, 0, zz) - V(0, 0, 0.12), hinge + V(0, 0, zz) + V(0, 0, 0.12), 0.05, 0.05, 8))


def mast_wing(m, sgn, x0, n_panels, panel_len, panel_w, cells, mast=3.0, sada=0.4, gap=0.06, z=0.0, thick=0.035, red=True, sada_r=0.2):
    """A 702 wing: the drive, ONE long mast (a tube with a small root fitting) to the middle of the inner panel's edge, then n panels, cells facing +Y, red hinge lines."""
    s = sgn
    m.add("sada", "body", GREY, lib.frustum((x0, 0, z), (x0 + s * sada, 0, z), sada_r, sada_r * 0.9, 14))
    m.add("sada-foil", "foil", BLANKET, lib.frustum((x0 + s * 0.06, 0, z), (x0 + s * (sada - 0.06), 0, z), sada_r + 0.02, sada_r * 0.9 + 0.02, 14, caps=False))
    xm = x0 + s * sada
    xe = xm + s * mast
    m.add("mast", "body", WHITE, lib.rod((xm, 0, z), (xe, 0, z), 0.055, 10))
    m.add("mast-fitting", "body", SILVER_D, lib.frustum((xe - s * 0.25, 0, z), (xe, 0, z), 0.06, 0.12, 10))
    m.add("mast-fitting", "body", SILVER_D, lib.box((xe + s * 0.03, 0, z), (0.06, 0.08, panel_w * 0.5)))
    xs = xe + s * 0.06
    for i in range(n_panels):
        xc = xs + s * panel_len / 2
        for role, col, mesh in lib.cell_panel((xc, 0, z), (0, 0, 1), (1, 0, 0), panel_w, panel_len, cells, 0.012, SILVER_D, cell_col=CELL, thick=thick, back_col=CELL_BACK, border=0.03):
            m.add("panel", role, col, mesh)
        if red:
            # the renders' red lines: the string harness running the length of each panel, and the hinge line
            for k in (-0.22, 0.22):
                m.add("panel-harness", "body", RED_LINE, lib.box((xc, thick / 2 + 0.006, z + k * panel_w), (panel_len * 0.96, 0.004, 0.025)))
        for k in (-1, 1):
            m.add("panel-rail", "body", SILVER_D, lib.box((xc, 0, z + k * panel_w / 2), (panel_len, thick * 1.4, 0.035)))
        if i < n_panels - 1:
            m.add("hinge", "body", RED_LINE if red else GREY, lib.box((xs + s * (panel_len + gap / 2), 0, z), (gap, thick * 1.5, panel_w * 0.96)))
        xs = xs + s * (panel_len + gap)
    return xs


def build(wings=True):
    m = Model(FILE_ID)
    zf = SZ / 2
    dark_body(m, SX, SY, SZ)
    deployed_radiators(m, SX, SY, SZ)
    # the Earth deck: black blanket (Morelos 3), a horn tower and two steerable spot dishes, TT&C omnis
    m.add("earth-deck", "foil", BLANKET, lib.grid((0, 0, zf + 0.01), (1, 0, 0), (0, 1, 0), SX * 0.98, SY * 0.98, 8, 8, crinkle=0.03, seed=3))
    m.add("deck-tower", "foil", BLANKET, lib.box((0, 0, zf + 0.35), (1.4, 1.2, 0.7), crinkle=0.02, seed=8, div=0.3))
    horn_array(m, "deck-horns", (0, 0, zf + 0.71), (0, 0, 1), (1, 0, 0), 3, 3, 0.26, 0.11, 0.3)
    for xx, yy, tilt in ((-1.0, -1.0, 0.25), (1.0, 1.0, -0.25)):
        m.add("spot-gimbal", "body", GREY, lib.frustum((xx, yy, zf), (xx, yy, zf + 0.45), 0.09, 0.07, 10))
        reflector(m, "spot-dish", (xx, yy, zf + 0.5), (0, tilt, 0.97), 0.42, 0.42, 0.1, up=(1, 0, 0), feed=True, ribs=6)
    for xx in (-1.25, 1.25):
        omni(m, (xx, 0.0, zf), (0, 0, 1), 0.55)
    m.add("earth-sensor", "body", BLACK, lib.box((0.0, 1.35, zf + 0.09), (0.25, 0.25, 0.18)))

    # four large reflectors in an X: two on the east wall and two on the west, side by side, each on an arm from the Earth end of its wall, feeds on the wall
    for sgn in (-1, 1):
        y0 = sgn * SY / 2
        for xs_ in (-1, 1):
            cx = xs_ * 1.15
            reflector(m, "reflector", (cx, y0 + sgn * 1.75, zf - 0.6), (xs_ * 0.18, -sgn * 0.42, 0.89), 1.35, 1.35, 0.3, up=(1, 0, 0),
                      arm_from=(cx * 0.6, y0 + sgn * 0.05, zf - 0.25), feed=False, ribs=10)
            m.add("reflector-brace", "body", GREY, lib.rod((cx * 0.6, y0 + sgn * 0.05, zf - 1.5), (cx, y0 + sgn * 1.0, zf - 0.75), 0.025, 5))
            # the sunshield ring the renders draw round each dish's rim
            m.add("sunshield", "foil", "#D9CFB8", lib.torus((cx, y0 + sgn * 1.75, zf - 0.6) + V(xs_ * 0.18, -sgn * 0.42, 0.89) * 0.3, V(xs_ * 0.18, -sgn * 0.42, 0.89), 1.36, 0.05, 24, 4))
            horn_array(m, "feed", (cx * 0.55, y0 + sgn * 0.16, -zf + 1.3), (0, sgn * 0.55, 0.83), (1, 0, 0), 2, 2, 0.26, 0.11, 0.35, plate_col=SILVER_D, horn_col=WHITE)
        for xx in (-0.5, 0.0, 0.5):
            m.add("waveguide", "body", SILVER, lib.rod((xx, y0 + sgn * 0.08, -zf + 1.3), (xx, y0 + sgn * 0.08, zf - 0.3), 0.035, 6))

    # aft end: the bipropellant apogee engine, four XIPS ion thrusters on their gimbals, chemical thruster pods, star trackers
    engine(m, (0, 0, -zf + 0.05), 0.1, 0.36, 0.8)
    for ex in (-1, 1):
        for ey in (-1, 1):
            p = V(ex * (SX / 2 - 0.25), ey * (SY / 2 - 0.25), -zf - 0.05)
            m.add("xips-gimbal", "body", GREY, lib.box(p + V(0, 0, -0.05), (0.3, 0.3, 0.12)))
            d = unit(V(ex * 0.25, ey * 0.25, -0.93))
            m.add("xips-body", "body", SILVER_D, lib.frustum(p - V(0, 0, 0.1), p - V(0, 0, 0.1) + d * 0.22, 0.17, 0.17, 18))
            m.add("xips-grid", "body", BLACK, lib.disc(p - V(0, 0, 0.1) + d * 0.225, d, 0.15, 18))
            thrusters(m, [((ex * (SX / 2 - 0.08), ey * (SY / 2 + 0.03), -zf + 0.5), (0, ey * 0.95, -0.3))])
    startracker(m, (0.9, SY / 2 + 0.05, -1.4), (0.0, 1.0, 0.35))
    startracker(m, (-0.9, -SY / 2 - 0.05, -1.4), (0.0, -1.0, 0.35))

    if wings:
        pl = round(((SPAN - SX) / 2 - 0.05 - SADA - MAST - 0.06 - (NP - 1) * 0.06) / NP, 2)
        for sgn in (-1, 1):
            mast_wing(m, sgn, sgn * (SX / 2 + 0.05), NP, pl, PW, (8, 10), mast=MAST, sada=SADA, z=-0.6)
    return palette(m, {**COMMON_FOLDS, ("body", BLANKET_L): GREY, ("foil", BLANKET_L): SILVER_FOIL})
