"""The thirteen stages of release 1.4.0 stage r14-m1, each a few dozen calls on stagelib.Stage.

  python3 stages.py <id> [<id> ...]      builds out/<id>/<id>.json  (python3 fastrender.py in.json out.png: six views)
Dimensions are the published ones; each function says where. Colours are ours, read off the photographs
named in the registry row.

SHIPPED (registry/models.yaml, site/models): delta2, centaur3, centaur_d, falcon9, h2a, kosmos3m.
BUILT AND NOT SHIPPED, because no photograph of the flight hardware that a person could check the shape against is free to use
(the issue stays open; what is missing is in the pull request): zenit2 (#1159), blok_e (#1161), tsyklon3 (#1162), blok_dm (#1163),
cz4 (#1168), breezem (#1170), pslv (#1171). They are here so that the next person starts from the numbers and the part library,
not from nothing; their shapes are plain stages with the right dimensions and engines, nothing more.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stagelib import Stage, shade, mix, revolve, UP, DOWN  # noqa: E402
import lib  # noqa: E402
from lib import V, rod, box, frustum, merge, torus  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "out")

WHITE = "#E8EAEC"
OFFWHITE = "#D9DCDF"
STEEL = "#A9AEB5"
STEEL_D = "#7B8189"
GUNMETAL = "#5C6168"
BLACK = "#26282C"
DARKGREY = "#3A3D43"
GOLD = "#C9A24A"
RED_BOTTLE = "#B8484F"


def ang_ring(n, a0=0.0):
    return [a0 + 360.0 * k / n for k in range(n)]


def polar(r, deg, y=0.0):
    a = math.radians(deg)
    return V(r * math.cos(a), y, r * math.sin(a))


def checker(s, y0, y1, r, n, c1, c2, rows=2, lift=0.012):
    """A ring of alternating tiles (a roll-pattern band) on a cylinder."""
    per = []
    for row in range(rows):
        ya, yb = y0 + (y1 - y0) * row / rows, y0 + (y1 - y0) * (row + 1) / rows
        for k in range(n):
            a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
            col = c1 if (k + row) % 2 == 0 else c2
            P = [[(r + lift) * math.cos(a), y, (r + lift) * math.sin(a)] for a in (a0, a1) for y in (ya, yb)]
            # vertices: 0=(a0,ya) 1=(a0,yb) 2=(a1,ya) 3=(a1,yb); angle rises counter-clockwise from +Y
            F = [[0, 3, 1], [0, 2, 3]]
            per.append((col, (np.array(P), np.array(F))))
    for col in (c1, c2):
        s.body("checker", col, merge([m for c, m in per if c == col]))


# ============================================================================================ Delta II
def delta2():
    """Delta II second stage, Delta K: 2.44 m across, 6 m long, one AJ10-118K (Wikipedia, Delta II, which
    cites the Boeing Delta II Payload Planner's Guide). Colours and parts from NASA's photographs KSC-02PD-2058
    and -2059, 'Delta II second stage' (George Shelton) and 'Delta II 7920 second stage': an olive
    primer-green tank barrel between two white flange bands, a bare lower dome with the large red helium
    spheres hung round it, the grey engine bell, the dark guidance section and its white cap ring."""
    s = Stage("delta2-second-stage")
    R = 1.22
    GREEN = "#6F8352"
    yd = 2.35  # equator of the lower dome
    s.engine_head("aj10", 1.28, 0.17, 0.34, GUNMETAL, line_col=STEEL)
    s.bell_ext("aj10-bell", 1.28, 0.13, 0.50, 1.28, 0.62, "#8A9098", "#5A5F66", seg=40, n=16, p=1.6,
               ribs_fixed=6, ribs_ext=0, joint_col=STEEL_D)
    s.cone("engine-blanket", 1.30, 1.78, 0.30, 0.62, "#B9BEC6", role="foil", seg=32)
    for a in (35, 215):  # the two gimbal actuators
        s.body("actuator", STEEL, rod(polar(0.5, a, 1.95), polar(0.17, a + 10, 1.4), 0.035, 8))
    s.dome("lower-dome", yd, R, 0.85, "#7C828A", up=False, seg=48, n=10, welds=2)
    s.barrel("aft-band", yd, yd + 0.3, R + 0.02, WHITE, seg=48)
    s.ring("aft-flange", yd, R, 0.06, STEEL, lift=0.045, seg=48)
    s.barrel("tank", yd + 0.3, 4.55, R, GREEN, seg=48, welds=3, weld_col=shade(GREEN, 0.8), panels=4, tint=0.04)
    s.pad("tunnel", 3.6, 100, R, (0.16, 1.7, 0.07), shade(GREEN, 0.7))
    s.pad("tunnel2", 3.6, 262, R, (0.12, 1.7, 0.05), shade(GREEN, 0.78))
    s.barrel("fwd-band", 4.55, 4.85, R + 0.02, WHITE, seg=48)
    s.ring("fwd-flange", 4.85, R, 0.07, STEEL, lift=0.05, seg=48)
    s.cone("fwd-step", 4.87, 5.05, R - 0.02, 1.0, "#9AA0A6", seg=48)
    s.barrel("guidance", 5.05, 5.55, 1.0, "#3C4047", seg=40, welds=1)
    for k, a in enumerate(ang_ring(6, 12)):
        s.pad("bay-%d" % k, 5.30, a, 1.0, (0.36, 0.30, 0.07), "#B7BCC3" if k % 2 else "#8A9098")
    s.cone("cap-cone", 5.55, 5.7, 1.0, 0.96, WHITE, seg=40)
    s.barrel("cap-ring", 5.7, 6.0, 0.97, WHITE, seg=40)
    s.plate_disc("cap", 6.0, 0.97, "#C9CDD2", seg=40)
    # the red helium spheres hung round the dome (two large, two small) on struts
    for a, r, y, rr in ((20, 0.32, 1.95, 1.10), (200, 0.32, 1.95, 1.10), (110, 0.22, 1.80, 0.98), (290, 0.22, 1.80, 0.98)):
        c = polar(rr, a, y)
        s.bottle("he-bottle", c, r, RED_BOTTLE)
        s.body("bottle-strut", STEEL_D, rod(c + V(0, r * 0.9, 0), polar(R - 0.05, a, yd - 0.05), 0.03, 6))
        s.body("bottle-strut2", STEEL_D, rod(c, polar(0.55, a, 1.55), 0.025, 6))
    for a in (60, 150, 240, 330):
        s.pipe("fuel-line", [polar(1.05, a, yd - 0.1), polar(0.82, a, 1.95), polar(0.32, a, 1.55)], 0.028, "#AEB3BA")
    for a in (45, 135, 225, 315):
        s.thruster_pod("n2-pod", yd + 0.18, a, R + 0.02, "#50555C", BLACK)
    return s


# ============================================================================================ Centaur III
def centaur3():
    """Common Centaur (Centaur III) of Atlas V: 3.05 m across and 12.68 m long with one RL10 (ULA Atlas V
    Launch Services User's Guide 2010, as Wikipedia 'Centaur (rocket stage)' cites it; engine 2.32 m long and 1.53
    m across at the exit). Photographs: the Space Force pictures of the Centaur at Los Angeles AFB (public
    domain), NASA/SDASM pictures of Centaur tanks and tube-wall bells."""
    s = Stage("atlas5-centaur")
    R = 1.525
    yt = 2.32  # throat plane
    s.engine_head("rl10", yt, 0.36, 0.34, "#70757C", line_col="#999DA3")
    s.bell_ext("rl10-bell", yt, 0.15, 0.765, 2.32, 1.05, "#8C9096", "#2B2D31", seg=48, n=26, p=1.7,
               ribs_fixed=14, ribs_ext=7, joint_col="#6C727A")
    for a in (60, 180, 300):
        s.body("actuator", STEEL, rod(polar(0.55, a, 2.85), polar(0.28, a, 2.35), 0.035, 8))
    ya = 3.35
    s.dome("aft-dome", ya, R, 0.95, "#868A90", up=False, seg=64, n=10, welds=3)
    s.cone("engine-foil", 2.5, 2.95, 0.52, 0.34, "#C8CDD4", role="foil", seg=32)
    for k in range(6):
        a = 60 * k + 15
        s.body("dome-tab", STEEL_D, box(polar(1.05, a, ya - 0.45), (0.5, 0.05, 0.14), lib.rot("y", -a)))
    s.barrel("lh2", ya, 9.5, R, "#8F9398", seg=64, welds=6, weld_col="#72777C", panels=6, tint=0.025, weld_w=0.04)
    s.ring("intermediate-bulkhead", 9.5, R, 0.1, "#7F858C", lift=0.025, seg=64)
    s.barrel("lox", 9.5, 10.9, R, "#93979C", seg=64, welds=1, weld_col="#72777C", panels=2, tint=0.025, weld_w=0.04)
    s.dome("fwd-dome", 10.9, R, 0.62, "#868A90", up=True, seg=64, n=8, welds=2)
    for a in (80, 235):
        s.pad("fill-line", 6.8, a, R, (0.09, 6.4, 0.09), "#7B8086")
    s.pad("cable-duct", 6.2, 150, R, (0.2, 7.4, 0.06), "#C9CDD2")
    for a in (30, 120, 210, 300):
        s.thruster_pod("rcs", ya + 0.1, a, R, "#43474D", BLACK, n=2)
    s.barrel("fwd-adapter", 11.25, 12.55, 1.42, "#E2E5E8", seg=56, welds=1, weld_col="#989CA1")
    s.cone("fwd-adapter-cone", 11.15, 11.25, R, 1.42, "#989CA1", seg=56)
    for k, a in enumerate(ang_ring(5, 20)):
        s.pad("avionics-%d" % k, 11.9, a, 1.42, (0.55, 0.42, 0.18), "#CDD1D6" if k % 2 else "#7C8188")
    s.ring("payload-ring", 12.6, 1.42, 0.12, "#7B8189", lift=0.03, seg=56)
    s.plate_disc("fwd-plate", 12.66, 1.45, "#6C727A", seg=56)
    s.foil_patches("fwd-foil", 11.35, 12.45, 1.42, GOLD, 5, seed=3, size=(0.55, 0.3))
    for a in (0, 120, 240):
        s.bottle("he", polar(1.0, a + 30, ya - 0.2), 0.19, "#CBD0D6")
    return s


# ============================================================================================ Centaur D
def centaur_d():
    """Centaur D / D-1A of Atlas-Centaur and Titan-Centaur: 3.05 m (10 ft) across, 9.6 m (31.5 ft) long,
    two RL10A-3 engines, four 6 lbf hydrazine thrusters (NASA NTRS 19750004937, Titan IIIE/Centaur D-1T
    Systems Summary, as Wikipedia 'Centaur (rocket stage)' quotes it). Photographs: NASA Lewis 'Centaur 6A
    ... Space Power Chambers Shop Area' (GRC-1964-C-71099; the ribbed stainless aft bulkhead, two corrugated
    bells), 'Centaur 1964 71100L', SDASM 'Centaur Removal From Transporter into Work Stand' (forward equipment)."""
    s = Stage("centaur-d")
    R = 1.525
    # two RL10A-3: fixed bells, 1.5 m long, 1.0 m exit, canted 4 degrees outward, with their pump heads
    for sx, tilt in ((-1, 4.0), (1, -4.0)):
        x = sx * 0.50
        s.engine_head("rl10", 1.6, 0.25, 0.30, "#70757C", x=x, line_col="#999DA3")
        s.bell("rl10-bell", 1.6, 0.10, 0.50, 1.55, "#93979C", x=x, seg=40, n=22, p=1.7, ribs=18,
               rib_col="#798086", tilt=(0, tilt), inner_col="#6A7078")
        s.body("actuator", STEEL, rod(V(x + sx * 0.38, 2.4, 0.0), V(x + sx * 0.2, 1.65, 0.0), 0.03, 8))
        s.body("duct", "#7B8086", rod(V(x * 1.6, 2.2, 0.6), V(x, 1.75, 0.18), 0.06, 8))
        s.body("duct2", "#7B8086", rod(V(x * 1.6, 2.2, -0.6), V(x, 1.75, -0.18), 0.06, 8))
    ya = 2.75
    s.dome("aft-bulkhead", ya, R, 0.95, "#8C9096", up=False, seg=64, n=10, welds=4)
    for k in range(14):  # the rows of doubler tabs on the aft bulkhead
        a = 360 * k / 14 + 8
        s.body("doubler", "#6F747A", box(polar(1.18, a, ya - 0.5), (0.34, 0.04, 0.10), lib.rot("y", -a)))
        s.body("doubler", "#6F747A", box(polar(0.82, a + 12, ya - 0.78), (0.26, 0.04, 0.08), lib.rot("y", -a - 12)))
    s.barrel("lh2", ya, 6.35, R, "#94989D", seg=64, welds=5, weld_col="#72777C", panels=5, tint=0.03, weld_w=0.045)
    s.ring("intermediate-bulkhead", 6.35, R, 0.12, "#80868D", lift=0.03, seg=64)
    s.barrel("lox", 6.35, 7.45, R, "#989CA2", seg=64, welds=1, weld_col="#72777C", panels=2, tint=0.03, weld_w=0.045)
    s.dome("fwd-bulkhead", 7.45, R, 0.62, "#8C9096", up=True, seg=64, n=8, welds=2)
    for a in (90, 250):
        s.pad("line", 4.8, a, R, (0.08, 4.2, 0.08), "#7B8086")
    # forward equipment: a ring of boxes on a truss, gold and silver foil over the guidance package
    s.truss_band("fwd-truss", 8.0, 8.55, R, R, "#7C8188", n=12, tube=0.03)
    for k, a in enumerate(ang_ring(8, 10)):
        s.pad("equip-%d" % k, 8.9, a, 1.42, (0.5, 0.5, 0.22), "#E4E7EA" if k % 3 else "#C9CDD2")
    s.barrel("fwd-skin", 8.55, 9.45, 1.42, "#D8DCE0", seg=56)
    s.foil_patches("fwd-foil", 8.6, 9.4, 1.42, GOLD, 7, seed=5, size=(0.6, 0.4))
    s.foil_patches("fwd-silver", 8.6, 9.4, 1.42, "#C8CDD4", 6, seed=9, size=(0.5, 0.4))
    s.ring("fwd-ring", 9.5, 1.42, 0.12, "#7B8189", lift=0.03, seg=56)
    s.plate_disc("fwd-plate", 9.56, 1.45, "#6C727A", seg=56)
    for a in (40, 140, 220, 320):
        s.thruster_pod("hydrazine", ya + 0.1, a, R, "#43474D", BLACK, n=1)
    return s


# ============================================================================================ Falcon 9
def falcon9():
    """Falcon 9 second stage (Full Thrust): 3.7 m across, 13.8 m long including the engine (Wikipedia, Falcon 9,
    'Second stage' table, which quotes SpaceX). One Merlin Vacuum with its niobium nozzle extension.
    Photographs: Commons 'Falcon 9 second stage fuel tank' (white tank barrel), 'Merlin nozzle' (the bell),
    SpaceX's Thaicom 8 pictures on Commons (CC0): white skin, the cable raceway, the black engine section."""
    s = Stage("falcon9-second-stage")
    R = 1.83
    WH = "#EDEFF0"
    yt = 3.05
    s.engine_head("mvac", yt, 0.42, 0.52, "#6E7279", line_col="#B5BAC1")
    s.bell_ext("mvac-bell", yt, 0.19, 1.34, 3.05, 1.0, "#B7BBC1", "#3B3D42", seg=64, n=30, p=1.9,
               ribs_fixed=9, ribs_ext=12, joint_col="#7A7F86")
    s.cone("thrust-skirt", 2.55, 3.95, 1.05, R, "#2E3034", seg=64)
    s.barrel("engine-band", 3.95, 4.95, R, "#2A2B2F", seg=64, welds=1, weld_col="#1F2023")
    s.ring("band-top", 4.95, R, 0.05, "#56595E", lift=0.015, seg=64)
    s.barrel("rp1", 4.95, 8.0, R, WH, seg=64, welds=2, weld_col="#C9CCCF", panels=3, tint=0.012, weld_w=0.05)
    s.ring("common-bulkhead", 8.0, R, 0.07, "#D0D3D6", lift=0.02, seg=64)
    s.barrel("lox", 8.0, 12.45, R, WH, seg=64, welds=3, weld_col="#C9CCCF", panels=4, tint=0.012, weld_w=0.05)
    s.dome("fwd-dome", 12.45, R, 0.62, "#E6E8EA", up=True, seg=64, n=8, welds=1)
    s.cone("paf-cone", 12.95, 13.3, 1.18, 1.0, "#303236", seg=48)
    s.barrel("paf", 13.3, 13.8, 1.0, "#26282C", seg=48, welds=1, weld_col="#4A4C52")
    s.ring("paf-lip", 13.8, 1.0, 0.06, "#7E8289", lift=0.03, seg=48)
    s.plate_disc("paf-plate", 13.8, 1.0, "#34363A", seg=48)
    s.pad("raceway", 8.7, 95, R, (0.22, 7.6, 0.07), "#DADDE0")
    for k in range(9):
        s.pad("bracket", 5.2 + k * 0.82, 95, R, (0.28, 0.08, 0.1), "#BDC1C5")
    s.pad("conduit", 8.4, 275, R, (0.10, 8.2, 0.05), "#D4D7DA")
    for a in (20, 200):
        s.thruster_pod("gn2-top", 12.2, a, R, "#2C2D31", "#101114", n=2, size=(0.34, 0.2, 0.12))
    for a in (110, 290):
        s.thruster_pod("gn2-bot", 4.3, a, R, "#2C2D31", "#101114", n=2, size=(0.34, 0.2, 0.12))
    for a in (60, 240):
        s.body("antenna", "#C7CACE", box(polar(R + 0.08, a, 12.0), (0.05, 0.5, 0.16), lib.rot("y", -a)))
    s.foil_patches("heat-patch", 9.0, 11.0, R, "#CFC9C0", 3, seed=11, size=(0.6, 0.8), amp=0.004, lift=0.006)
    return s


# ============================================================================================ H-IIA
def h2a():
    """H-IIA second stage: 4 m across, 9.2 m long, one LE-5B (Wikipedia, H-IIA, Second stage table, which
    quotes JAXA). Photographs: Commons 'H-IIA F34/F35 2nd stage' and 'F36 2nd stage' (CC BY 4.0, Quasi-Zenith
    Satellite System website, Cabinet Office of Japan): the cream sprayed-insulation skin, the metal
    forward flange ring with its bolt circle, the vent loop on the forward dome, the black open aft skirt.
    The H-IIA family drawing (Ofuku, CC BY 3.0) for the dark bands."""
    s = Stage("h2a-second-stage")
    R = 2.0
    TAN = "#CDB68C"
    yt = 2.45
    s.engine_head("le5b", yt, 0.45, 0.42, "#7C8189", line_col="#B5BAC1")
    s.bell_ext("le5b-bell", yt, 0.17, 0.80, 2.45, 0.95, "#BDB5A8", "#202226", seg=56, n=26, p=1.8,
               ribs_fixed=7, ribs_ext=0, joint_col="#6C7077")
    for a in (70, 250):
        s.body("actuator", STEEL, rod(polar(0.62, a, 3.0), polar(0.30, a, 2.55), 0.04, 8))
    s.barrel("aft-skirt", 2.9, 4.2, R, "#34363B", seg=64, welds=1, weld_col="#4B4E55")
    s.dome("aft-dome", 4.2, R * 0.98, 1.25, "#B9A47F", up=False, seg=64, n=8, welds=2)
    s.ring("aft-flange", 4.2, R, 0.1, "#9A9FA7", lift=0.03, seg=64)
    s.barrel("tank", 4.2, 8.15, R, TAN, seg=64, welds=4, weld_col="#B39E78", panels=6, tint=0.03, weld_w=0.05)
    s.ring("fwd-flange", 8.15, R, 0.16, "#A7ACB3", lift=0.045, seg=64)
    s.dome("fwd-dome", 8.15, R * 0.98, 1.05, "#CBB48A", up=True, seg=64, n=8, welds=1)
    for k in range(48):
        a = 360 * k / 48
        s.body("bolt", "#6C7077", box(polar(R + 0.02, a, 8.24), (0.07, 0.05, 0.07), lib.rot("y", -a)))
    s.pipe("vent-loop", [polar(0.55, a, 9.18 + 0.03) for a in range(0, 361, 30)], 0.035, "#B9BEC5")
    s.pipe("vent-pipe", [polar(0.55, 0, 9.2), polar(1.1, 0, 9.0), polar(1.7, 0, 8.4), polar(R + 0.04, 0, 8.1)], 0.035, "#B9BEC5")
    s.pad("cable", 6.2, 160, R, (0.2, 3.5, 0.06), "#CFC2A8")
    s.pad("cable2", 6.2, 330, R, (0.14, 3.5, 0.05), "#C2B290")
    for a in (35, 125, 215, 305):
        s.thruster_pod("rcs", 3.3, a, R, "#3C3F45", "#15161A", n=2, size=(0.4, 0.25, 0.15))
    return s


# ============================================================================================ Kosmos-3M
def kosmos3m():
    """Kosmos-3M second stage (the 'Kosmos-2' stage of 11K65M): 2.4 m across, 6.0 m long, one 11D49 (Encyclopedia
    Astronautica, 'Kosmos 11K65M': 'Diameter 2.40 m; Length 6.00 m; 1,435 kg empty'). Photographs: Commons
    'Cosmos3M.jpg' (Trash777, CC BY-SA 4.0) and 'Kosmos rocket.jpg' (Dmitry Shipulja, CC0): the white
    skin with orange belts, the grey instrument section with the two long cylinders on its side and the
    checkerboard roll band at the top; the infographic (Julio Perez Suarez, CC BY-SA 3.0) for the 11D49
    with its steering nozzles."""
    s = Stage("kosmos3m-second-stage")
    R = 1.2
    ORANGE = "#D9692A"
    GREYB = "#7C8087"
    yt = 1.05
    s.engine_head("11d49", yt, 0.22, 0.28, "#7C8087", line_col="#B5BAC1")
    s.bell("11d49-bell", yt, 0.09, 0.40, 0.95, "#A9AEB5", seg=36, n=16, p=1.7, ribs=7, inner_col="#55595F")
    for k, a in enumerate(ang_ring(4, 45)):  # the four steering nozzles of the turbine exhaust
        p = polar(0.62, a, 1.12)
        s.bell("steer-%d" % k, 1.12, 0.03, 0.10, 0.40, "#8A9098", x=p[0], z=p[2], seg=16, n=8, tilt=(0, 0), inner_col="#3A3D42")
        s.body("steer-pipe", STEEL_D, rod(polar(0.22, a, 1.25), polar(0.62, a, 1.15), 0.03, 6))
    ya = 1.75
    s.dome("aft-dome", ya, R, 0.62, "#B5BAC1", up=False, seg=56, n=8, welds=1)
    # white skin with two orange belts: the belts are the skin itself, not a layer on it (no z-fighting at close-up)
    segs = [(ya, 2.25, "#E7E9EB"), (2.25, 2.7, ORANGE), (2.7, 3.55, "#E7E9EB"), (3.55, 4.0, ORANGE), (4.0, 4.55, "#E7E9EB")]
    for k, (a, b, col) in enumerate(segs):
        s.barrel("tank-%d" % k, a, b, R, col, seg=56, panels=2 if b - a > 0.6 else 1, tint=0.015 if col != ORANGE else 0.0)
        if k:
            s.add("seam", "body", "#B9BCBF", frustum((0, a - 0.015, 0), (0, a + 0.015, 0), R + 0.012, R + 0.012, 56, caps=False))
    s.ring("tank-joint", 4.55, R, 0.1, "#9AA0A8", lift=0.02, seg=56)
    s.barrel("instrument", 4.55, 5.55, R, GREYB, seg=56, welds=1, weld_col="#5F6369")
    checker(s, 5.15, 5.55, R, 28, "#E7E9EB", "#26282C", rows=2)
    for a in (30, 150):  # the two long low-thrust tanks on the instrument section
        s.body("lt-tank", "#5C6168", frustum(polar(R + 0.14, a, 4.65), polar(R + 0.14, a, 5.45), 0.12, 0.12, 16, caps=True))
        s.body("lt-clamp", "#8A9098", frustum(polar(R + 0.14, a, 4.85), polar(R + 0.14, a, 4.9), 0.135, 0.135, 16, caps=False))
        s.body("lt-clamp", "#8A9098", frustum(polar(R + 0.14, a, 5.2), polar(R + 0.14, a, 5.25), 0.135, 0.135, 16, caps=False))
    s.pad("duct", 5.0, 250, R, (0.14, 1.0, 0.05), "#55595F")
    s.cone("adapter", 5.55, 6.0, R, 0.95, "#8A9098", seg=56)
    s.ring("adapter-ring", 6.0, 0.95, 0.08, "#C9CDD2", lift=0.02, seg=56)
    s.plate_disc("adapter-plate", 6.04, 0.97, "#5C6168", seg=56)
    for a in (0, 90, 180, 270):
        s.thruster_pod("ctl", 2.0, a + 45, R, "#43474D", BLACK, n=2, size=(0.28, 0.2, 0.1))
    return s


# ============================================================================================ Zenit-2
def zenit2():
    """Zenit-2 second stage (SL-16 R/B): 3.9 m across, 11.5 m long, one RD-120 and the four-chamber RD-8
    vernier (Encyclopedia Astronautica, 'Zenit-2': 'Diameter 3.90 m; Length 11.50 m; 9,000 kg empty'; engine
    RD-120 912 kN and RD-8 as Wikipedia 'Zenit-2' states). The RD-120 bell (about 1.5 m across at the exit) and
    the RD-8's four 0.25 m nozzles are ours, from the engines' published thrust and the stage's width: no
    photograph of this stage's engine bay is free to use."""
    s = Stage("zenit2-second-stage")
    R = 1.95
    CREAM = "#CFC7B4"
    yt = 2.15
    s.engine_head("rd120", yt, 0.34, 0.45, "#75797F", line_col="#B5BAC1")
    s.bell("rd120-bell", yt, 0.13, 0.74, 1.6, "#9A9FA7", seg=44, n=20, p=1.7, ribs=10, inner_col="#4C5056")
    for k, a in enumerate(ang_ring(4, 45)):  # RD-8 verniers
        p = polar(1.12, a, yt - 0.1)
        s.bell("rd8-%d" % k, yt - 0.1, 0.045, 0.14, 0.55, "#8A9098", x=p[0], z=p[2], seg=16, n=8, tilt=(0, 0), inner_col="#3A3D42")
        s.body("rd8-boom", STEEL_D, rod(polar(0.5, a, yt + 0.3), p + V(0, 0.05, 0), 0.04, 6))
    s.cone("engine-cone", 2.0, 3.4, 0.95, R, "#8E9096", seg=64)
    s.barrel("skirt", 3.4, 4.2, R, "#B5B2A8", seg=64, welds=1, weld_col="#8F8C84")
    s.barrel("tank", 4.2, 10.0, R, CREAM, seg=64, welds=5, weld_col="#A9A18E", panels=6, tint=0.025, weld_w=0.05)
    s.ring("intertank", 7.2, R, 0.12, "#A9A18E", lift=0.03, seg=64)
    s.dome("fwd-dome", 10.0, R, 0.6, "#C8C0AC", up=True, seg=64, n=8, welds=1)
    s.cone("adapter", 10.3, 10.95, 1.5, 1.25, "#7C8087", seg=56)
    s.barrel("adapter-ring", 10.95, 11.5, 1.25, "#5C6168", seg=56, welds=1)
    s.plate_disc("adapter-plate", 11.5, 1.25, "#3A3D43", seg=56)
    for a in (0, 90, 180, 270):
        s.thruster_pod("rcs", 3.6, a + 30, R, "#43474D", BLACK, n=2, size=(0.34, 0.24, 0.12))
    s.pad("cable", 7.5, 120, R, (0.22, 5.0, 0.07), "#BBB39F")
    return s


# ============================================================================================ Blok E
def blok_e():
    """Vostok upper stage, Blok E (SL-3 R/B): 2.56 m across, 2.84 m long, one RD-0109 (Wikipedia,
    'Vostok (rocket family)': third stage 2.56 m, 2.84 m, 1,440 kg empty; RD-0109 1.555 m long, 0.733 m across).
    The four vernier nozzles and the RD-0109 as the cutaway 'Block-E rocket stage' (Alexander Mokletsov, CC BY-SA 3.0) shows
    them; skin and truss simplified."""
    s = Stage("blok-e")
    R = 1.28
    yt = 1.15
    s.engine_head("rd0109", yt, 0.2, 0.3, "#6F747B", line_col="#B5BAC1")
    s.bell("rd0109-bell", yt, 0.09, 0.36, 0.95, "#9AA0A8", seg=36, n=16, p=1.7, ribs=6, inner_col="#4C5056")
    for k, a in enumerate(ang_ring(4, 45)):
        p = polar(0.52, a, yt + 0.12)
        s.bell("vern-%d" % k, yt + 0.12, 0.04, 0.12, 0.5, "#8A9098", x=p[0], z=p[2], seg=16, n=8, inner_col="#3A3D42")
    s.truss_band("tail-truss", 0.75, 1.55, 0.55, R, "#8A9098", n=12, tube=0.035)
    s.dome("aft-dome", 1.55, R, 0.35, "#9AA0A8", up=False, seg=56, n=6)
    s.barrel("hull", 1.55, 2.5, R, "#A9ABA6", seg=56, welds=2, weld_col="#81837F", panels=3, tint=0.03)
    s.cone("nose-cone", 2.5, 2.84, R, 0.9, "#8E908B", seg=56)
    s.ring("adapter", 2.84, 0.9, 0.08, "#C9CDD2", lift=0.02, seg=48)
    s.plate_disc("cap", 2.88, 0.92, "#5C6168", seg=48)
    for a in (45, 225):
        s.pad("tank-bump", 2.0, a, R, (0.5, 0.7, 0.12), "#8E908B")
    return s


# ============================================================================================ Tsyklon-3
def tsyklon3():
    """Tsyklon-3 third stage S5M (11S693; SL-14 R/B): 2.25 m across and 2.58 m tall, one RD-861 whose own
    size is 1.56 m long and 1.53 m across (Encyclopedia Astronautica 'Tsyklon 3-3', 'RD-861', read 2026-10-26).
    The drawing 'Tsyklon-3 sizes' (Sergento, CC BY-SA 3.0) shows the stage's conical aft interstage and 2.7 m
    payload section. Shape is a plain stage with one very large bell: its skin and fittings are not drawn from any photograph."""
    s = Stage("tsyklon3-third-stage")
    R = 1.125
    yt = 1.55
    s.engine_head("rd861", yt, 0.34, 0.4, "#6F747B", line_col="#B5BAC1")
    s.bell("rd861-bell", yt, 0.14, 0.72, 1.56, "#9A9FA7", seg=44, n=20, p=1.7, ribs=9, inner_col="#4C5056")
    s.truss_band("interstage", 1.35, 2.15, 0.9, R, "#8A9098", n=10, tube=0.035)
    s.dome("aft-dome", 2.15, R, 0.4, "#A9ABA6", up=False, seg=56, n=6)
    s.barrel("tank", 2.15, 3.4, R, "#C4C6C0", seg=56, welds=1, weld_col="#9E9F99", panels=2, tint=0.03)
    s.dome("fwd-dome", 3.4, R, 0.45, "#B9BBB5", up=True, seg=56, n=6)
    s.barrel("adapter", 3.7, 4.05, 0.85, "#8E908B", seg=48)
    s.ring("adapter-ring", 4.05, 0.85, 0.08, "#C9CDD2", lift=0.02, seg=48)
    for a in (60, 240):
        s.pad("bottle-pad", 2.8, a, R, (0.4, 0.4, 0.14), "#A0A29C")
    return s


# ============================================================================================ CZ-4 third
def cz4_third():
    """Long March 4B / 4C third stage: 2.9 m across, 4.79 m long, two YF-40 engines of 1.2 m by 0.63 m (Wikipedia
    'Long March 4B' and 'YF-40'; the infobox's 14.79 m reads as a typo for 4.79 m, which Everyday Astronaut's
    page gives, and 14 t of propellant fits a 1.9 m barrel at 2.9 m across). Shape from the numbers and from
    Commons' 'CZ-4B rendering' (CC BY-SA 4.0) and the CBERS-2B pictures (public domain): white skin, conical aft skirt."""
    s = Stage("cz4-third-stage")
    R = 1.45
    yt = 1.2
    for sx in (-1, 1):
        x = sx * 0.48
        s.engine_head("yf40", yt, 0.2, 0.3, "#6F747B", x=x, line_col="#B5BAC1")
        s.bell("yf40-bell", yt, 0.07, 0.315, 1.2, "#A9AEB5", x=x, seg=28, n=14, p=1.7, ribs=6, tilt=(0, sx * 3.0), inner_col="#4C5056")
    s.cone("aft-skirt", 1.0, 1.9, 1.0, R, "#D8DBDE", seg=56)
    s.barrel("tank", 1.9, 4.0, R, "#E7E9EB", seg=56, welds=2, weld_col="#C3C6C9", panels=3, tint=0.015)
    s.barrel("band", 2.9, 3.15, R + 0.004, "#2F5F9E", seg=56)
    s.cone("fwd-cone", 4.0, 4.79, R, 1.0, "#CFD2D5", seg=56)
    s.ring("adapter-ring", 4.79, 1.0, 0.08, "#9AA0A8", lift=0.03, seg=48)
    for a in (30, 150, 270):
        s.thruster_pod("rcs", 2.2, a, R, "#43474D", BLACK, n=2)
    s.pad("cable", 3.0, 200, R, (0.2, 1.8, 0.06), "#BEC2C6")
    return s


# ============================================================================================ Blok DM
def blok_dm():
    """Proton Blok DM (SL-12 R/B(2)): 3.7 m across, 6.28 m long, one 11D58M (Wikipedia 'Blok D' infobox:
    height 6.28 m, diameter 3.70 m). A spherical oxidiser tank in a conical shell on a toroidal fuel tank,
    joined by two open truss rings, the engine below: the layout of the CGI 'Block-D.jpg' (Eberhard Marx, CC BY 3.0,
    looked at, not traced). Details of the skin are not drawn from a photograph of flight hardware."""
    s = Stage("blok-dm")
    R = 1.85
    yt = 1.9
    s.engine_head("11d58m", yt, 0.3, 0.4, "#6F747B", line_col="#B5BAC1")
    s.bell_ext("11d58m-bell", yt, 0.12, 0.60, 1.9, 1.0, "#A9AEB5", "#4C5056", seg=44, n=22, p=1.7, ribs_fixed=8, ribs_ext=4,
               joint_col="#6C727A")
    s.toroid("fuel-torus", 2.85, 1.15, 0.72, "#C9CBCD", seg=64, side=18, squash=0.8)
    s.barrel("torus-skirt", 2.35, 3.3, R, "#D9DBDD", seg=64, welds=1, weld_col="#AEB1B4")
    s.cone("torus-floor", 2.35, 2.05, R, 0.7, "#B5B8BB", seg=64)
    s.truss_band("lower-truss", 3.3, 4.0, R, 1.35, "#B9BDC2", n=16, tube=0.04)
    s.sphere("lox-tank", (0, 4.7, 0), 1.25, "#CDD0D3", nlat=12, seg=40)
    s.cone("lox-shell", 3.95, 5.25, 1.55, 1.55, "#A7ABB0", seg=64)
    s.cone("cap-cone", 5.35, 6.28, 1.55, 0.85, "#E4E6E8", seg=64)
    s.ring("cap-ring", 6.28, 0.85, 0.08, "#9AA0A8", lift=0.03, seg=48)
    s.truss_band("upper-truss", 5.25, 5.35, 1.55, 1.55, "#B9BDC2", n=16, tube=0.03)
    for a in (0, 90, 180, 270):
        s.thruster_pod("rcs", 3.5, a + 45, R, "#43474D", BLACK, n=2)
        s.bottle("ullage", polar(1.25, a + 20, 3.2), 0.22, "#D6D8DA")
    return s


# ============================================================================================ Breeze-M
def breezem():
    """Briz-M core (BREEZE-M R/B): the central block is 2.49 m across; the whole stage with its jettisoned
    toroidal tank is 4.1 m across and 2.65 m high from the payload plane; the 14D30 is 0.95 m across and 1.15 m long
    (Khrunichev's layout drawing 'Компоновка разгонного блока Бриз-М', Commons CC BY-SA 4.0, as read 2026-10-26;
    Wikipedia 'Briz-M' and 'S5.98M'). The tank is a separate catalogue object (BREEZE-M DEB), so the core
    alone is built. Photographs: Commons 'Maquettes étages Briz M et KM' (Pline, CC BY-SA 4.0), the MAKS-2021 layout photograph (Kirill Borisenko, CC BY-SA 4.0)."""
    s = Stage("breezem-core")
    R = 1.245
    yt = 1.15
    s.engine_head("14d30", yt, 0.32, 0.35, "#6F747B", line_col="#B5BAC1")
    s.bell_ext("14d30-bell", yt, 0.10, 0.475, 1.15, 0.7, "#B0B5BC", "#2F3136", seg=40, n=18, p=1.7, ribs_fixed=6, ribs_ext=0,
               joint_col="#6C727A")
    s.cone("engine-skirt", 1.0, 1.55, 0.6, 1.05, "#9AA0A8", seg=48)
    s.dome("aft-dome", 1.55, R, 0.45, "#C9CCCF", up=False, seg=56, n=8, welds=1)
    s.barrel("core", 1.55, 3.15, R, "#D6D8DA", seg=56, welds=2, weld_col="#AEB1B4", panels=3, tint=0.02)
    s.foil_patches("blanket", 1.7, 3.0, R, GOLD, 9, seed=4, size=(0.7, 0.5))
    s.ring("core-ring", 3.15, R, 0.1, "#9AA0A8", lift=0.03, seg=56)
    s.barrel("instrument", 3.15, 3.55, R, "#B9BDC2", seg=56)
    for k, a in enumerate(ang_ring(8, 10)):
        s.pad("hatch-%d" % k, 3.35, a, R, (0.34, 0.26, 0.09), "#8A9098")
    s.cone("power-cone", 3.55, 4.0, R, 1.7, "#A7ABB0", seg=56)
    s.ring("transfer-ring", 4.0, 1.7, 0.1, "#D0D3D5", lift=0.03, seg=56)
    for a in ang_ring(4, 20):
        s.bottle("he", polar(1.12, a, 1.75), 0.26, "#B8BCC1")
    for a in ang_ring(4, 65):
        s.thruster_pod("11d458m", 2.0, a, R, "#43474D", BLACK, n=2, size=(0.34, 0.24, 0.14))
        s.thruster_pod("17d58", 2.45, a + 20, R, "#43474D", BLACK, n=1, size=(0.22, 0.18, 0.1))
    return s


# ============================================================================================ PSLV PS4
def pslv_ps4():
    """PSLV fourth stage PS4 (PSLV R/B): 3.0 m long, 1.34 m across, two L-2-5 engines of 7.4 kN, 2 500 kg of
    MMH/MON (ISRO PSLV-C55 mission brief, as the Commons description of its photographs; Wikipedia 'PSLV'). It
    sits on a 2.1 m interface ring. Photographs: ISRO's, GODL-India (Commons): 'PSLV-C11 Fourthstage' (the
    steel tank with its domed top, the equipment platform with its two gold helium spheres) and 'PSLV-C44 Third and Fourth stages at
    Stage Preparation Facility' (the gold-foil tank, the dark bell, the ribbed black skirt under the white ring)."""
    s = Stage("pslv-ps4")
    R = 0.67
    GOLDF = "#CFA23C"
    yt = 1.15
    for sx in (-1, 1):
        x = sx * 0.2
        s.engine_head("l25", yt, 0.1, 0.18, "#6F747B", x=x, line_col="#B5BAC1")
        s.bell("l25-bell", yt, 0.05, 0.23, 0.75, "#2D2F34", x=x, seg=24, n=12, p=1.7, ribs=3, tilt=(0, sx * 3.0), inner_col="#17181B")
    s.dome("aft-dome", 1.5, R, 0.4, GOLDF, up=False, role="foil", seg=48, n=8)
    s.barrel("tank", 1.5, 2.1, R, GOLDF, role="foil", seg=48)
    s.foil_patches("foil-fold", 1.5, 2.1, R, "#E0B84C", 10, seed=6, size=(0.5, 0.35), amp=0.01, lift=0.01)
    for a in (20, 160, 250):
        s.pipe("strap", [polar(R + 0.02, a, 1.55), polar(R + 0.02, a, 2.05)], 0.012, "#2F5F9E")
    s.dome("fwd-dome", 2.1, R, 0.35, "#B7BCC3", up=True, seg=48, n=8, welds=1)
    s.cone("ribbed-skirt", 2.0, 1.45, 1.05, 0.72, "#26282C", seg=48)
    s.barrel("ring", 2.0, 2.2, 1.05, "#E7EADF", seg=56, welds=1, weld_col="#BEC2B8")
    s.ring("ring-lip", 2.22, 1.05, 0.06, "#C9CDD2", lift=0.03, seg=56)
    for a in (35, 215):
        s.bottle("he", polar(0.95, a, 2.38), 0.17, "#D8B04C")
    s.body("platform", "#8A9098", lib.disc((0, 2.24, 0), UP, 1.04, 56, r_in=R))
    for k, a in enumerate(ang_ring(6, 20)):
        s.pad("box-%d" % k, 2.31, a, 0.92, (0.2, 0.12, 0.16), "#323439" if k % 2 else "#C2C6CB")
    return s


BUILDERS = {
    "delta2": delta2, "centaur3": centaur3, "centaur_d": centaur_d, "falcon9": falcon9, "h2a": h2a,
    "kosmos3m": kosmos3m, "zenit2": zenit2, "blok_e": blok_e, "tsyklon3": tsyklon3, "cz4": cz4_third,
    "blok_dm": blok_dm, "breezem": breezem, "pslv": pslv_ps4,
}

if __name__ == "__main__":
    names = sys.argv[1:] or list(BUILDERS)
    for name in names:
        st = BUILDERS[name]()
        d = os.path.join(OUT, name)
        js, png, tris, ncol, length = st.export(d)
        print(name, tris, "tris", ncol, "colours", "%.2f m" % length, png, flush=True)
