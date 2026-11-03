"""voskhod-3kd: the Voskhod 3KD spacecraft of Voskhod 2 (18-19 March 1965, Leonov's spacewalk), in named parts.

  vk-im              the instrument module: the Vostok one (2.25 m x 2.43 m), grey drum, sixteen jets, the twelve green
                     nitrogen spheres, the louvred radiator cone, the TDU/KTDU retro engine at the foot
  vk-sphere          the 2.3 m descent sphere (the Vostok one, the ejection seat gone: two seats in it, not drawn)
  vk-hatch           the entry hatch with its porthole (not jettisoned on this flight)
  vk-antennas        the four hairpin loops and four whips, as vostok-3ka
  vk-retro           the back-up solid-fuel retro rocket on top of the sphere: a stepped cylinder with its nozzles
  volga-stowed       the VOLGA airlock as launched: its 1.2 m steel ring on the sphere, the four oxygen spheres, the
                     folded fabric, the upper ring and the closed outer hatch, 0.74 m proud of the hull
  volga              the VOLGA airlock deployed: the lower ring, the double-walled fabric tube 2.5 m long held out by 40
                     air-booms, the upper ring round the 65 cm outer hatch (closed, hinged, with its handle), the camera boom,
                     the four oxygen spheres (the two lights and two cameras are inside, not drawn)
  volga-hatch-open   an overlay for `volga`: the open mouth (the hatch opens INWARD, so from outside an open hatch is a
                     dark hole): a black disc just proud of the closed hatch, with the ring's inner lip
  umbilical          Leonov's 5.35 m tether and hose, an S of cable from the airlock's upper ring out to its end

Metres, +Y up the spacecraft's axis (the sphere on top), the origin on the lower interface of the instrument module, like
vostok-3ka. The airlock stands from the sphere's centre toward azimuth 180 (-X) at 8 degrees above the equator: opposite
the entry opening (azimuth 0, elevation 32, toward +X) of the Vostok sphere this one is built on.
"""
import contextlib
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vlib import *  # noqa: F401,F403,E402
import lib  # noqa: E402
import vostok3ka as v3  # noqa: E402
from vostok3ka import C_SPH, R_SPH, sph_dir, to_world  # noqa: E402

AL_AZ, AL_EL = 180.0, 8.0          # the airlock's axis, from the sphere's centre
D_A = sph_dir(AL_AZ, AL_EL)
R_A = basis_about(D_A)             # local frame (+Y along the airlock axis, origin at the sphere's centre) -> spacecraft

# airlock stations along its axis, from the sphere's centre
S_RING = 0.98          # the lower ring's plane (the sphere's surface at the ring's radius 0.62 is at 0.968)
L_TUBE = 2.5           # the fabric tube
S_TOP = S_RING + L_TUBE   # the upper ring's lower edge: 3.48
RING_H = 0.15
S_MOUTH = S_TOP + RING_H + 0.15 # the hatch's seat: the mouth of the airlock, 3.78
RR = 0.62              # the rings' outer radius: 1.2 m wide
R_HATCH = 0.325        # the outer hatch: 65 cm
R_TUBE = 0.56

FAB = "#E6DFCB"        # the fabric
FAB_D = "#CFC7B0"
SILVER = "#A5ACB3"     # the aluminised outer layer (seams)
TAPE = "#7C5C3C"       # the brown tapes round the bag and the tube
RING = "#B5BBC1"
RING_D = "#7D848B"
MAROON = "#6D4A45"     # the rubberised shoulder round the hatch
HATCH = "#8E9499"
BLACK = v3.BLACK
STEEL = v3.STEEL
STEEL_D = v3.STEEL_D
BOLT = v3.BOLT
WHITE = "#ECEDEC"
OXY = "#9DA3AA"        # the oxygen spheres, silver-grey


def A(mesh):
    return to_world(mesh, R_A)


def apt(p):
    return C_SPH + R_A @ V(*p)


def alp(r, deg, s):
    """A point of the airlock frame: radius r, angle deg about the axis, station s (local +Y)."""
    a = math.radians(deg)
    return V(r * math.cos(a), s, r * math.sin(a))


def fluted(s0, s1, r0, amp, lobes, per, nst, bulge=0.0, pinch=0.6):
    """A tube of `lobes` air-booms: pillows between seams, about local +Y, outward faces. Returns (the pillows, the
    seam ribbons that run along the valleys)."""
    n = lobes * per
    P = np.zeros((nst + 1, n, 3))
    for k in range(nst + 1):
        t = k / nst
        s = s0 + (s1 - s0) * t
        Rk = r0 + bulge * math.sin(math.pi * t)
        a_k = amp * (1.0 - pinch * (1.0 - math.sin(math.pi * t) ** 0.5))
        for i in range(n):
            q = (i % per) / per
            r = Rk + a_k * 0.5 * (1 - math.cos(2 * math.pi * q))
            th = 2 * math.pi * i / n
            P[k, i] = (r * math.cos(th), s, r * math.sin(th))
    Vv = P.reshape(-1, 3)
    F = []
    for k in range(nst):
        for i in range(n):
            j = (i + 1) % n
            p0, p1, p2, p3 = k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i
            F += [[p0, p2, p1], [p0, p3, p2]]
    body = (Vv, np.array(F, dtype=np.int64))
    rib = []
    for L in range(lobes):
        i = L * per
        th = 2 * math.pi * i / n
        tang = V(-math.sin(th), 0, math.cos(th))
        rows = []
        for k in range(nst + 1):
            c = P[k, i]
            radial = V(math.cos(th), 0, math.sin(th))
            rows.append((c + radial * 0.006 - tang * 0.011, c + radial * 0.006 + tang * 0.011))
        pts = np.array([x for pair in rows for x in pair])
        ff = []
        for k in range(nst):
            a, b, c2, d = 2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2
            ff += [[a, c2, b], [a, d, c2]]
        rib.append((pts, np.array(ff, dtype=np.int64)))
    return body, merge(rib)


def dome_prof(R, h, n=7):
    """(s, r) of a shallow dome from its rim (s 0, radius R) to its crown (s h): faces outward and up."""
    out = []
    for k in range(n + 1):
        r = R * (1 - k / n)
        out.append((h * (1 - (r / R) ** 2), r))
    return out


def band(s, r, w=0.028, seg=64):
    return frustum((0, s - w / 2, 0), (0, s + w / 2, 0), r, r, seg, caps=False)


def rim(s, r, w=0.03, seg=64, a=(0, 0, 0), axis=(0, 1, 0), bump=0.008):
    """A rolled rim or a clamp band: a three-point profile turned about the axis (the cheap stand-in for a torus)."""
    return lathe(a, V(*axis), [(s - w / 2, r - 0.004), (s, r + bump), (s + w / 2, r - 0.004)], seg)


def sweep(points, radii, seg=5, caps=True):
    """A round cable through a poly-line (parallel-transported frames), radius per point; closed ends."""
    pts = [V(p) for p in points]
    n = len(pts)
    tg = []
    for k in range(n):
        a = pts[max(k - 1, 0)]
        b = pts[min(k + 1, n - 1)]
        tg.append(unit(b - a))
    u = frame(tg[0])[0]
    rings = []
    for k in range(n):
        w = tg[k]
        u = unit(u - np.dot(u, w) * w)
        v = np.cross(w, u)
        rad = radii[k] if hasattr(radii, "__len__") else radii
        ring = [pts[k] + rad * (math.cos(2 * math.pi * i / seg) * u + math.sin(2 * math.pi * i / seg) * v) for i in range(seg)]
        rings.append(ring)
    Vv = np.array([p for ring in rings for p in ring])
    F = []
    for k in range(n - 1):
        for i in range(seg):
            j = (i + 1) % seg
            p0, p1, p2, p3 = k * seg + i, k * seg + j, (k + 1) * seg + j, (k + 1) * seg + i
            F += [[p0, p2, p1], [p0, p3, p2]]
    Vv = np.vstack([Vv, pts[0], pts[-1]])
    if caps:
        c0, c1 = n * seg, n * seg + 1
        for i in range(seg):
            j = (i + 1) % seg
            F.append([c0, i, j])
            F.append([c1, (n - 1) * seg + j, (n - 1) * seg + i])
    m = (Vv, np.array(F, dtype=np.int64))
    # make the winding outward whatever the frame's handedness gave: test against the first ring's outward direction
    c = pts[0]
    f0 = m[1][0]
    nrm = np.cross(m[0][f0[1]] - m[0][f0[0]], m[0][f0[2]] - m[0][f0[0]])
    mid = (m[0][f0[0]] + m[0][f0[1]] + m[0][f0[2]]) / 3 - pts[0]
    if np.dot(nrm, mid) < 0:
        m = (m[0], m[1][:, ::-1].copy())
    return m


# --------------------------------------------------------------------------------------------------- the airlock parts
def oxygen_spheres(st):
    """The four spherical oxygen tanks round the lower ring, with their straps, valves and hoses."""
    for k in range(4):
        ang = 45.0 + 90.0 * k
        r_c = 0.80
        s_c = math.sqrt(R_SPH ** 2 - r_c ** 2) + 0.15
        c = alp(r_c, ang, s_c)
        out = alp(1.0, ang, 0.0)
        st.add("oxygen", "body", OXY, A(lib.sphere(c, 0.17, 6, 10)))
        st.add("oxygen-strap", "body", STEEL, A(merge([rim(c[1], 0.168, 0.026, 12, a=(c[0], 0, c[2]), bump=0.006),
                                                       lathe(c, np.cross(out, V(0, 1, 0)), [(-0.013, 0.166), (0.0, 0.176), (0.013, 0.166)], 12)])))
        st.add("oxygen-valve-blue", "body", "#2F5FA8", A(box(c + alp(0.17, ang + 70, 0.02), (0.05, 0.05, 0.05), None)))
        st.add("oxygen-valve", "body", STEEL_D, A(frustum(c + V(0, 0.15, 0), c + V(0, 0.24, 0), 0.034, 0.026, 8, caps=True)))
        # a hose from the ring's manifold to the sphere
        h0 = alp(0.665, ang - 14, S_RING + 0.02)
        h1 = alp(0.74, ang - 6, s_c + 0.04)
        h2 = c + V(0, 0.11, 0)
        st.add("oxygen-hose", "body", FAB_D, A(sweep([h0, (h0 + h1) / 2 + V(0, 0.03, 0), h1, (h1 + h2) / 2 + alp(0.04, ang, 0), h2], 0.014, 5)))
    st.add("manifold", "body", STEEL, A(rim(S_RING + 0.02, 0.675, 0.04, 40, bump=0.012)))


def lower_ring(st):
    """The 1.2 m metal ring on the sphere: a seat that follows the hull, the ring, its clamp band, 24 bolts."""
    st.add("ring-seat", "body", RING_D, A(lathe((0, 0, 0), V(0, 1, 0), [(0.90, RR + 0.01), (S_RING + 0.0, RR + 0.01)], 56)))
    st.add("ring-low", "body", RING, A(lathe((0, 0, 0), V(0, 1, 0), [(S_RING, RR + 0.04), (S_RING + 0.13, RR + 0.04), (S_RING + 0.13, RR - 0.02)], 56)))
    st.add("ring-low-top", "body", STEEL, A(lib.disc(V(0, S_RING + 0.13, 0), V(0, 1, 0), RR + 0.04, 56, r_in=RR - 0.02)))
    st.add("ring-bolts", "body", BOLT, A(bolt_ring((0, S_RING + 0.13, 0), V(0, 1, 0), RR + 0.01, 24, 0.012, 0.014, ref=(1, 0, 0), seg=4)))
    st.add("ring-clamp", "body", STEEL_D, A(lathe((0, 0, 0), V(0, 1, 0), [(S_RING + 0.13, R_TUBE + 0.04), (S_RING + 0.2, R_TUBE + 0.03)], 56)))


def build_volga():
    st = Stage("volga")
    lower_ring(st)
    # ---- the tube: 40 air-booms in three groups (three brown tapes, one at each third), pillows with silver seams
    body, seams = fluted(S_RING + 0.13, S_TOP, R_TUBE, 0.038, 40, 3, 4, bulge=0.012)
    st.add("fabric", "body", FAB, A(body))
    st.add("seams", "body", SILVER, A(seams))
    for k, s in enumerate((S_RING + 0.13 + L_TUBE * 0.17, S_RING + 0.13 + L_TUBE * 0.5, S_RING + 0.13 + L_TUBE * 0.83)):
        t = (s - (S_RING + 0.13)) / (S_TOP - S_RING - 0.13)
        st.add("tape", "body", TAPE, A(band(s, R_TUBE + 0.012 + 0.038 + 0.012 * math.sin(math.pi * t), 0.03, 60)))
    # the three feeders of the three groups: silver pipes from the manifold up the tube's side to the upper ring
    for k in range(3):
        ang = 20 + 120 * k
        pts = [alp(R_TUBE + 0.08, ang, S_RING + 0.2), alp(R_TUBE + 0.095, ang + 3, S_RING + 0.2 + 0.4),
               alp(R_TUBE + 0.095, ang - 3, (S_RING + 0.2 + S_TOP) / 2), alp(R_TUBE + 0.07, ang, S_TOP - 0.1)]
        st.add("feeder", "body", SILVER, A(sweep(pts, 0.011, 5)))
    # ---- the upper ring: 1.2 m wide, silver, stamped with 40 ribs, a rolled rim; then the maroon shoulder and the hatch collar
    z0, z1 = S_TOP, S_TOP + RING_H
    st.add("ring-up", "body", RING, A(lathe((0, 0, 0), V(0, 1, 0), [(z0 - 0.02, R_TUBE + 0.02), (z0, RR), (z1 - 0.02, RR), (z1, RR - 0.03)], 48)))
    st.add("ring-up-rim", "body", STEEL, A(merge([rim(z1 - 0.015, RR - 0.012, 0.04, 48, bump=0.014), rim(z0 + 0.012, RR - 0.005, 0.032, 48, bump=0.012)])))
    ribs = []
    for k in range(40):
        a = 360.0 * (k + 0.5) / 40
        p0, p1 = alp(RR + 0.004, a, z0 + 0.04), alp(RR + 0.004, a, z1 - 0.04)
        ribs.append(frustum(p0, p1, 0.016, 0.016, 5, caps=False))
    st.add("ring-up-ribs", "body", RING_D, A(merge(ribs)))
    st.add("shoulder", "body", MAROON, A(lathe((0, 0, 0), V(0, 1, 0), [(z1 - 0.02, RR - 0.03), (z1 + 0.04, RR - 0.05), (S_MOUTH - 0.03, R_HATCH + 0.07), (S_MOUTH, R_HATCH + 0.04)], 56)))
    st.add("collar", "body", STEEL, A(merge([lathe((0, 0, 0), V(0, 1, 0), [(S_MOUTH - 0.04, R_HATCH + 0.045), (S_MOUTH + 0.035, R_HATCH + 0.035), (S_MOUTH + 0.035, R_HATCH - 0.01)], 48),
                                              lib.disc(V(0, S_MOUTH + 0.035, 0), V(0, 1, 0), R_HATCH + 0.035, 48, r_in=R_HATCH - 0.01)])))
    st.add("collar-bolts", "body", BOLT, A(bolt_ring((0, S_MOUTH + 0.035, 0), V(0, 1, 0), R_HATCH + 0.012, 20, 0.008, 0.012, ref=(1, 0, 0), seg=4)))
    # ---- the outer hatch (shown closed): a shallow dish with four radial ribs, a rim, a hinge on one side and a handle on the other
    sm = S_MOUTH + 0.035
    dish = lathe((0, sm, 0), V(0, 1, 0), dome_prof(R_HATCH, 0.08, 4), 32)
    st.add("hatch", "body", HATCH, A(dish))
    st.add("hatch-rim", "body", RING_D, A(rim(sm + 0.03, R_HATCH - 0.005, 0.04, 40, bump=0.014)))
    rr = []
    for k in range(4):
        a = 45.0 + 90.0 * k
        rr.append(sweep([alp(0.03, a, sm + 0.095), alp(0.15, a, sm + 0.084), alp(0.26, a, sm + 0.06), alp(R_HATCH - 0.03, a, sm + 0.034)], 0.014, 5))
    st.add("hatch-ribs", "body", RING_D, A(merge(rr)))
    # the handle: a loop standing on the rim at angle 0, the hinge two blocks and a pin at angle 180
    st.add("handle", "body", STEEL, A(sweep([alp(R_HATCH - 0.07, 0, sm + 0.075), alp(R_HATCH - 0.07, 0, sm + 0.125), alp(R_HATCH + 0.02, 0, sm + 0.125), alp(R_HATCH + 0.04, 0, sm + 0.08)], 0.014, 6)))
    for dz in (-0.1, 0.1):
        p = alp(R_HATCH + 0.01, 180, sm + 0.03) + V(0, 0, dz)
        st.add("hinge", "body", STEEL_D, A(box(p, (0.07, 0.07, 0.08), None)))
    st.add("hinge-pin", "body", STEEL, A(rod(alp(R_HATCH + 0.015, 180, sm + 0.05) + V(0, 0, -0.14), alp(R_HATCH + 0.015, 180, sm + 0.05) + V(0, 0, 0.14), 0.014, 6)))
    # ---- the camera boom (three 16 mm cameras flew: two inside the airlock, with its two lights, one outside on a boom on the upper ring;
    # only the outside one can be seen)
    # the boom: from a bracket on the ring at angle 0, out and up 0.7 m, with the camera at its tip looking back at the hatch
    b0 = alp(RR - 0.02, 0, z0 + 0.075)
    b1 = alp(RR + 0.3, 0, z1 + 0.22)
    b2 = alp(RR + 0.62, 0, z1 + 0.46)
    st.add("boom-bracket", "body", STEEL_D, A(box(b0 + V(0.02, 0, 0), (0.1, 0.1, 0.09), None)))
    st.add("boom", "body", STEEL, A(sweep([b0, (b0 + b1) / 2 + V(0, 0.02, 0), b1, b2], 0.014, 6)))
    cam_axis = unit(alp(0.1, 0, S_MOUTH + 0.05) - b2)
    cam_R = basis_about(cam_axis)
    st.add("camera", "body", "#3A3D42", A(xf(box(V(0, 0, 0), (0.12, 0.17, 0.09), None), cam_R, b2 + cam_axis * 0.0)))
    st.add("camera-lens", "body", STEEL, A(xf(frustum(V(0, 0.08, 0), V(0, 0.15, 0), 0.032, 0.042, 12, caps=True), cam_R, b2)))
    st.add("camera-glass", "body", "#1E2C3A", A(xf(lib.disc(V(0, 0.151, 0), V(0, 1, 0), 0.036, 12), cam_R, b2)))
    oxygen_spheres(st)
    return st


def build_volga_stowed():
    st = Stage("volga-stowed")
    lower_ring(st)
    s_top = 1.15 + 0.74 - 0.25            # the upper ring's lower edge; ring 0.15, shoulder and hatch 0.1 above it: 0.74 m proud
    body, _ = fluted(S_RING + 0.13, s_top, 0.575, 0.045, 24, 3, 4, bulge=0.025, pinch=0.4)
    st.add("fabric", "body", FAB_D, A(body))
    for s in (S_RING + 0.13 + 0.22, S_RING + 0.13 + 0.40):
        st.add("tape", "body", TAPE, A(band(s, 0.60 + 0.025 + 0.012, 0.03, 56)))
    st.add("seam-line", "body", SILVER, A(merge([sweep([alp(0.62, a, S_RING + 0.16), alp(0.645, a, (S_RING + s_top) / 2), alp(0.62, a, s_top - 0.01)], 0.007, 4) for a in (0.0, 120.0, 240.0)])))
    z0, z1 = s_top, s_top + 0.15
    st.add("ring-up", "body", RING, A(lathe((0, 0, 0), V(0, 1, 0), [(z0 - 0.03, 0.6), (z0, RR), (z1 - 0.02, RR), (z1, RR - 0.03)], 48)))
    st.add("ring-up-rim", "body", STEEL, A(merge([rim(z1 - 0.015, RR - 0.012, 0.04, 48, bump=0.014), rim(z0 + 0.012, RR - 0.005, 0.032, 48, bump=0.012)])))
    ribs = []
    for k in range(40):
        a = 360.0 * (k + 0.5) / 40
        ribs.append(frustum(alp(RR + 0.004, a, z0 + 0.04), alp(RR + 0.004, a, z1 - 0.04), 0.016, 0.016, 5, caps=False))
    st.add("ring-up-ribs", "body", RING_D, A(merge(ribs)))
    sm = 1.15 + 0.74 - 0.065
    st.add("shoulder", "body", MAROON, A(lathe((0, 0, 0), V(0, 1, 0), [(z1 - 0.02, RR - 0.03), (z1 + 0.03, RR - 0.05), (sm - 0.02, R_HATCH + 0.07), (sm, R_HATCH + 0.04)], 56)))
    st.add("collar", "body", STEEL, A(lathe((0, 0, 0), V(0, 1, 0), [(sm - 0.03, R_HATCH + 0.045), (sm + 0.02, R_HATCH + 0.035), (sm + 0.02, R_HATCH - 0.01)], 48)))
    dish = lathe((0, sm + 0.01, 0), V(0, 1, 0), dome_prof(R_HATCH, 0.055, 4), 32)
    st.add("hatch", "body", HATCH, A(dish))
    st.add("hatch-rim", "body", RING_D, A(rim(sm + 0.03, R_HATCH - 0.005, 0.036, 40, bump=0.012)))
    st.add("handle", "body", STEEL, A(sweep([alp(R_HATCH - 0.07, 0, sm + 0.05), alp(R_HATCH - 0.07, 0, sm + 0.09), alp(R_HATCH + 0.02, 0, sm + 0.09), alp(R_HATCH + 0.04, 0, sm + 0.05)], 0.012, 6)))
    oxygen_spheres(st)
    return st


def build_hatch_open():
    st = Stage("volga-hatch-open")
    sm = S_MOUTH + 0.035
    st.add("void", "body", "#17191D", A(lib.disc(V(0, sm + 0.095, 0), V(0, 1, 0), R_HATCH - 0.012, 40)))
    st.add("lip", "body", RING_D, A(lib.disc(V(0, sm + 0.096, 0), V(0, 1, 0), R_HATCH + 0.02, 40, r_in=R_HATCH - 0.012)))
    return st


def umbilical_path(n=32, length=5.35, amp=0.42, plane_dir=None):
    """The tether's centre-line in the AIRLOCK frame: from the upper ring's rim at angle 270 out along the axis in a gentle S
    whose bends lie in the plane of the axis and `plane_dir`; its arc length is `length`. Returns the points (local frame)."""
    plane_dir = V(0, 0, 1) if plane_dir is None else plane_dir
    p0 = alp(RR - 0.04, 270.0, S_TOP + RING_H - 0.01)     # the clip on the ring's rim (local -Z: the side away from the camera)

    def pts(X):
        out = []
        for k in range(n + 1):
            t = k / n
            along = X * t
            lat = amp * math.sin(2 * math.pi * t) * (0.4 + 0.6 * t) + 0.05 * math.sin(math.pi * t)
            out.append(p0 + V(0, 1, 0) * along + plane_dir * lat)
        return out
    lo, hi = 3.0, length
    for _ in range(40):
        mid = (lo + hi) / 2
        P = pts(mid)
        L = sum(np.linalg.norm(P[k + 1] - P[k]) for k in range(n))
        if L > length:
            hi = mid
        else:
            lo = mid
    return pts((lo + hi) / 2)


def build_umbilical():
    st = Stage("umbilical")
    P = umbilical_path()
    # the tether: a white-sheathed steel cable, and the hose of the oxygen supply, a little thicker, twisted round it
    n = len(P)
    tang = [unit(P[min(k + 1, n - 1)] - P[max(k - 1, 0)]) for k in range(n)]
    side = [unit(np.cross(tg, V(1, 0, 0))) for tg in tang]
    off_a = [P[k] + side[k] * 0.022 for k in range(n)]
    off_b = [P[k] - side[k] * 0.022 for k in range(n)]
    st.add("tether", "body", "#E9E6DA", A(sweep(off_a, 0.015, 4)))
    st.add("hose", "body", "#CFC9B6", A(sweep(off_b, 0.022, 6)))
    st.add("hose-fitting", "body", STEEL, A(sweep([P[0] - side[0] * 0.022 - tang[0] * 0.03, P[0] - side[0] * 0.022 + tang[0] * 0.05], 0.03, 8)))
    st.add("end-fitting", "body", STEEL, A(sweep([P[-1] - tang[-1] * 0.08, P[-1] + tang[-1] * 0.03], 0.034, 8)))
    return st, P


def umbilical_end():
    P = umbilical_path()
    return apt(P[-1]), apt(P[0])


def build_retro():
    """The back-up solid-fuel retro rocket on the sphere's pole: a stepped cylinder, the nozzles round its top (illustrative
    size and nozzle count: no drawing with metres was opened; four nozzles canted outward 18 degrees)."""
    st = Stage("vk-retro")
    y0 = C_SPH[1] + R_SPH - 0.03          # the pole
    st.add("base-ring", "body", STEEL, lathe((0, y0, 0), UP, [(0.0, 0.46), (0.05, 0.46), (0.05, 0.40)], 40))
    st.add("collar-low", "body", "#8E9499", lathe((0, y0, 0), UP, [(0.05, 0.40), (0.42, 0.40)], 40))
    st.add("collar-low-top", "body", RING_D, lib.disc(V(0, y0 + 0.42, 0), UP, 0.40, 40, r_in=0.30))
    st.add("band-low", "body", STEEL, merge([rim(0.10, 0.402, 0.03, 32, a=(0, y0, 0), axis=(0, 1, 0), bump=0.012), rim(0.30, 0.402, 0.03, 32, a=(0, y0, 0), axis=(0, 1, 0), bump=0.012)]))
    st.add("case", "body", "#9AA0A6", lathe((0, y0, 0), UP, [(0.42, 0.30), (0.82, 0.30)], 40))
    st.add("case-band", "body", STEEL, merge([rim(0.50, 0.302, 0.028, 32, a=(0, y0, 0), bump=0.011), rim(0.72, 0.302, 0.028, 32, a=(0, y0, 0), bump=0.011)]))
    st.add("head", "body", RING_D, lathe((0, y0, 0), UP, [(0.82, 0.30), (0.86, 0.27), (0.90, 0.24)], 40, closed=True))
    mouths = []
    for k in range(4):
        a = 45.0 + 90.0 * k
        d = unit(V(math.cos(math.radians(a)) * math.sin(math.radians(18)), math.cos(math.radians(18)), math.sin(math.radians(a)) * math.sin(math.radians(18))))
        base = V(0.17 * math.cos(math.radians(a)), y0 + 0.86, 0.17 * math.sin(math.radians(a)))
        st.add("nozzle", "body", "#6F757C", frustum(base, base + d * 0.14, 0.04, 0.062, 12, caps=False))
        st.add("nozzle-throat", "body", BLACK, lib.disc(base + d * 0.14, d, 0.058, 12))
        st.add("nozzle-root", "body", STEEL_D, frustum(base - d * 0.03, base + d * 0.01, 0.052, 0.045, 12, caps=True))
        mouths.append((base + d * 0.14).round(4).tolist())
    # a cable run from the case's skirt down to the sphere
    return st, mouths


# --------------------------------------------------------------------------------------------------- the Vostok pieces, leaner
@contextlib.contextmanager
def lean(torus_seg=0.65, sphere_scale=0.7):
    """Run a vostok3ka builder with its fine details cut to the triangle budget of this model: fewer segments in the straps,
    the nitrogen spheres and the pipes. vostok3ka.py itself is untouched."""
    o_sphere, o_torus_l, o_torus_v, o_tube = lib.sphere, lib.torus, v3.torus, v3.tube

    def sph(c, r, nlat=10, nlon=16, *a, **k):
        return o_sphere(c, r, max(4, int(round(nlat * sphere_scale))), max(8, int(round(nlon * sphere_scale))), *a, **k)

    def tor(c, n, R, r, seg=24, side=6):
        return o_torus_l(c, n, R, r, max(10, int(round(seg * torus_seg))), max(3, side - 1) if side > 4 else side)

    def tub(points, r, seg=6, closed=False):
        seg = max(4, seg - 1)
        parts = [rod(a, b, r, seg) for a, b in zip(points[:-1], points[1:])]
        return merge(parts)

    o_bolt, o_bell, o_shell = v3.bolt_ring, Stage.bell, v3.sphere_shell

    def bolts(*a, **k):
        k["seg"] = 5
        return o_bolt(*a, **k)

    def bell(self, label, y_top, rt, re, length, col, *a, **k):
        k["seg"] = min(k.get("seg", 36), 24)
        k["n"] = min(k.get("n", 16), 8)
        return o_bell(self, label, y_top, rt, re, length, col, *a, **k)

    def shell(Rr, theta_open, theta_end=180.0, n=26, seg=56, inward=False):
        return o_shell(Rr, theta_open, theta_end, min(n, 8) if inward else min(n, 3), min(seg, 48 if not inward else 32), inward)

    lib.sphere, lib.torus, v3.torus, v3.tube = sph, tor, tor, tub
    v3.bolt_ring, Stage.bell, v3.sphere_shell = bolts, bell, shell
    try:
        yield
    finally:
        lib.sphere, lib.torus, v3.torus, v3.tube = o_sphere, o_torus_l, o_torus_v, o_tube
        v3.bolt_ring, Stage.bell, v3.sphere_shell = o_bolt, o_bell, o_shell


def build_im():
    with lean():
        st = v3.build_im()
    # the nitrogen spheres' crossed straps and the collar's holes are redrawn cheaper: one belt and one band round each sphere,
    # and the holes as four-sided dark plugs
    st.m.parts = [p for p in st.m.parts if p[0] not in ("bottle-strap", "collar-holes")]
    for k in range(12):
        a = 360.0 * (k + 0.5) / 12
        c = polar(1.02, a, 2.27)
        ar = math.radians(a)
        tang = V(-math.sin(ar), 0, math.cos(ar))
        st.add("bottle-strap", "body", STEEL, merge([rim(c[1], 0.176, 0.022, 14, a=(c[0], 0, c[2]), bump=0.006),
                                                      lathe(c, tang, [(-0.011, 0.172), (0.0, 0.182), (0.011, 0.172)], 14)]))
    holes = []
    for k in range(36):
        a = 360.0 * k / 36
        p = polar(0.95, a, 2.145)
        n_ = unit(V(math.cos(math.radians(a)), 0.3, math.sin(math.radians(a))))
        holes.append(frustum(p, p + n_ * 0.012, 0.018, 0.018, 4, caps=True))
    st.add("collar-holes", "body", BLACK, merge(holes))
    return st


DROP_SPHERE = {"vent", "vent-ring", "panel", "panel-face", "dial", "globe", "cabinet"}


def build_sphere():
    v3.VZOR_AZ, v3.VZOR_EL = 270.0, -30.0     # the Vzor window moved off the airlock's side (azimuth 180)
    with lean(0.8, 0.8):
        st = v3.build_sphere()
    st.m.parts = [p for p in st.m.parts if p[0] not in DROP_SPHERE and p[0] != "coat-seams"]
    # the wrapped tape's seams redrawn as flat ribbons and bands lying on the coat (twelve meridians, four parallels)
    d_h, R_h = v3.hatch_frame(v3.HATCH_AZ, v3.HATCH_EL)
    th_open = math.degrees(math.asin(0.44 / R_SPH))
    rr = R_SPH + 0.004
    rib = []
    for g in range(12):
        az = 2 * math.pi * g / 12
        tg = V(-math.sin(az), 0, math.cos(az))
        rows = []
        for k in range(9):
            th = math.radians(th_open + 12 + (168.0 - th_open - 12) * k / 8)
            c = V(rr * math.sin(th) * math.cos(az), rr * math.cos(th), rr * math.sin(th) * math.sin(az))
            wd = 0.007 * max(math.sin(th), 0.25)
            rows += [c - tg * wd, c + tg * wd]
        ff = []
        for k in range(8):
            ff += [[2 * k, 2 * k + 1, 2 * k + 3], [2 * k, 2 * k + 3, 2 * k + 2]]
        rib.append((np.array(rows), np.array(ff, dtype=np.int64)))
    for thd in (50.0, 80.0, 112.0, 142.0):
        th = math.radians(thd)
        d = math.radians(0.55)
        rib.append(lathe((0, 0, 0), UP, [(rr * math.cos(th + d), rr * math.sin(th + d)), (rr * math.cos(th - d), rr * math.sin(th - d))], 48))
    seams = v3.orient(merge(rib), V(0, 0, 0), outward=True)
    st.add("coat-seams", "body", shade(v3.COAT, 0.84), to_world(seams, R_h))
    return st


def build_hatch():
    with lean(0.8, 0.8):
        return v3.build_hatch()


def build_antennas():
    with lean(0.8, 0.8):
        return v3.build_antennas()


def build():
    veh = Vehicle("voskhod-3kd")
    d_h = sph_dir(v3.HATCH_AZ, v3.HATCH_EL)
    retro, mouths = build_retro()
    umb, P = build_umbilical()
    veh.add("vk-im", build_im(), (0.0, 1.35, 0.0))
    veh.add("vk-sphere", build_sphere(), tuple(C_SPH))
    veh.add("vk-antennas", build_antennas(), (0.0, 3.4, 0.0))
    veh.add("vk-hatch", build_hatch(), tuple(C_SPH + d_h * (R_SPH + 0.03)))
    veh.add("vk-retro", retro, (0.0, C_SPH[1] + R_SPH + 0.42, 0.0))
    veh.add("volga-stowed", build_volga_stowed(), tuple(apt((0, 1.3, 0))))
    veh.add("volga", build_volga(), tuple(apt((0, 2.4, 0))))
    veh.add("volga-hatch-open", build_hatch_open(), tuple(apt((0, S_MOUTH + 0.13, 0))))
    veh.add("umbilical", umb, tuple(apt(P[len(P) // 2])))
    veh.mouths = mouths
    return veh


def numbers(veh):
    """The numbers the Moment needs, printed after a build."""
    print("airlock axis (unit, spacecraft frame):", D_A.round(4).tolist(), "az/el", AL_AZ, AL_EL)
    print("airlock mouth point (hatch seat):", apt((0, S_MOUTH, 0)).round(3).tolist(), " upper ring centre:", apt((0, S_TOP + RING_H / 2, 0)).round(3).tolist())
    e, s = umbilical_end()
    print("umbilical start (ring rim clip):", s.round(3).tolist(), " end:", e.round(3).tolist())
    print("KTDU mouth: [0, 0, 0]; backup retro nozzle mouths:", veh.mouths)
    for d, _ in veh.walk():
        print("  attach", d["name"], d["origin"].round(3).tolist())
    allv = np.vstack([p[3][0] for p in veh.whole().parts])
    print("extent", allv.min(axis=0).round(3).tolist(), allv.max(axis=0).round(3).tolist())


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "out/voskhod-3kd.json"
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    v = build()
    v.export(out)
    numbers(v)
