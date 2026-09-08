#!/usr/bin/env python3
"""An ILLUSTRATIVE Milky Way -- site/data/galaxy.bin (spec 0028 step 6).

    python3 scripts/build-galaxy.py

Nobody has a picture of our galaxy from outside. What exists are measurements: the distance to the
centre, the fitted spiral arms, the disc's size, a debated bar. This script turns those numbers into
a point cloud a person can fly around, and the numbers are all it uses -- every constant below names
its source, and where the sources disagree (the bar) the middle of the published range is taken and
the card says so. It is a MODEL, declared `illustrative` in registry/models.yaml; the stars around
the Sun (stars3d) are the measured layer, and the two are never confused.

SOURCES (read 2026-09-08; scratchpad note kept in the internal repo)
  Reid et al. 2019, ApJ 885:131 (arXiv:1910.03357): R0 = 8.15 kpc; Table 2 log-periodic spiral
    fits per arm (beta_kink, R_kink, pitch angles inside/outside the kink, width, azimuth range).
  Wikipedia "Milky Way": stellar disc diameter 26.8 kpc, thickness up to 1.35 kpc.
  Wikipedia "Galactic Center": bar half-length 1-5 kpc, angle 10-50 deg to the Sun-centre line --
    debated; 3 kpc and 30 deg are taken, the middles.
  Galactic frame: IAU J2000 galactic centre RA 266.405 Dec -28.936, north pole RA 192.85948 Dec 27.12825.

GEOMETRY
  Galactocentric axes, heliocentric-parallel: x towards l=0 (Sun -> centre), y towards l=90, z to
  the north galactic pole. The Sun sits at (-R0, 0, 0). Reid's azimuth beta is 0 towards the Sun
  and increases in the direction of rotation (clockwise from the north pole), so a point at
  (R, beta) is R * (-cos beta, sin beta). A log spiral: ln(R / R_kink) = -(beta - beta_kink) tan psi.
  Points are written HELIOCENTRIC (the Sun at the origin, as every other layer), rotated from
  galactic to equatorial J2000 (the standard IAU matrix) and then to the ecliptic axes of the app's
  sun-inertial frame, in KILOPARSECS (one unit on the `galaxy` rung).

FORMAT (little-endian)
  header  'SRGX' u32 version=1  u32 count
  point   f32 x y z (kpc, heliocentric ecliptic J2000)  u8 kind (0 disc, 1 bulge, 2 bar, 3 arm)
          u8 weight (0..255, how bright to draw)  u16 pad                          -- 16 bytes
"""
from __future__ import annotations

import math
import random
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site/data/galaxy.bin"
SEED = 20260908

R0_KPC = 8.15                 # Reid et al. 2019
DISC_RADIUS_KPC = 13.4        # half of 26.8 kpc, Wikipedia "Milky Way"
DISC_SCALE_KPC = 2.6          # exponential scale length: a common textbook value, illustrative
DISC_HEIGHT_KPC = 0.3         # scale height; the disc is "up to 1.35 kpc" thick (Wikipedia)
BULGE_RADIUS_KPC = 1.5
BAR_HALF_KPC = 3.0            # middle of the debated 1-5 kpc (Wikipedia "Galactic Center")
BAR_ANGLE_DEG = 30.0          # middle of the debated 10-50 deg
OBLIQUITY_DEG = 23.4392911

# Reid et al. 2019, Table 2: (name, beta_kink deg, R_kink kpc, psi_lt deg, psi_gt deg, width kpc, beta_min, beta_max)
ARMS = [
    ("3-kpc", 15, 3.52, -4.2, -4.2, 0.18, 15, 18),
    ("Norma-Outer", 18, 4.46, -1.0, 19.5, 0.14, 5, 54),
    ("Scutum-Centaurus", 23, 4.91, 14.1, 12.1, 0.23, 0, 104),
    ("Sagittarius-Carina", 24, 6.04, 17.1, 1.0, 0.27, 2, 97),
    ("Local", 9, 8.26, 11.4, 11.4, 0.31, -8, 34),
    ("Perseus", 40, 8.87, 10.3, 8.7, 0.35, -23, 115),
    ("Outer", 18, 12.24, 3.0, 9.4, 0.65, -16, 71),
]
# The fits cover the measured azimuth ranges; to draw a whole galaxy each arm is continued past its
# measured range with the outer pitch angle. Continuation is the illustration; the fitted part is
# the measurement, and `weight` is lower where the arm is continued so the eye can tell.
CONTINUE_DEG = 200

# IAU galactic -> equatorial J2000, as ROWS giving equatorial x, y, z from galactic x, y, z. This is the
# transpose of the familiar equatorial -> galactic matrix; the check is that galactic (1,0,0), the
# centre, comes out at RA 266.4 Dec -28.9, and build-galaxy's own test asserts exactly that.
G2E = (
    (-0.0548755604, 0.4941094279, -0.8676661490),
    (-0.8734370902, -0.4448296300, -0.1980763734),
    (-0.4838350155, 0.7469822445, 0.4559837762),
)


def gal_to_ecl(x, y, z):
    ex = G2E[0][0] * x + G2E[0][1] * y + G2E[0][2] * z
    ey = G2E[1][0] * x + G2E[1][1] * y + G2E[1][2] * z
    ez = G2E[2][0] * x + G2E[2][1] * y + G2E[2][2] * z
    ce, se = math.cos(math.radians(OBLIQUITY_DEG)), math.sin(math.radians(OBLIQUITY_DEG))
    return ex, ey * ce + ez * se, -ey * se + ez * ce


def arm_radius(beta_deg, beta_kink, r_kink, psi_lt, psi_gt):
    psi = psi_lt if beta_deg <= beta_kink else psi_gt
    return r_kink * math.exp(-math.radians(beta_deg - beta_kink) * math.tan(math.radians(psi)))


def main() -> int:
    rnd = random.Random(SEED)
    pts = []  # (x, y, z galactocentric kpc, kind, weight)

    # disc: exponential in radius, exponential in height, thinning past the edge
    for _ in range(70000):
        r = rnd.expovariate(1 / DISC_SCALE_KPC)
        if r > DISC_RADIUS_KPC * 1.15:
            continue
        a = rnd.uniform(0, 2 * math.pi)
        z = rnd.expovariate(1 / DISC_HEIGHT_KPC) * rnd.choice((-1, 1))
        w = 90 if r < DISC_RADIUS_KPC else 40
        pts.append((r * math.cos(a), r * math.sin(a), z, 0, w))
    # bulge: a squashed ball
    for _ in range(12000):
        r = abs(rnd.gauss(0, BULGE_RADIUS_KPC * 0.6))
        u, v = rnd.uniform(-1, 1), rnd.uniform(0, 2 * math.pi)
        s = math.sqrt(1 - u * u)
        pts.append((r * s * math.cos(v), r * s * math.sin(v), r * u * 0.6, 1, 200))
    # bar: along a line through the centre at BAR_ANGLE from the Sun line, near end at positive l
    ang = math.radians(BAR_ANGLE_DEG)
    ux, uy = -math.cos(ang), math.sin(ang)  # unit vector from the centre towards the near end
    for _ in range(14000):
        t = rnd.gauss(0, BAR_HALF_KPC * 0.55)
        t = max(-BAR_HALF_KPC, min(BAR_HALF_KPC, t))
        off = rnd.gauss(0, 0.35)
        z = rnd.gauss(0, 0.25)
        pts.append((t * ux - off * uy, t * uy + off * ux, z, 2, 170))
    # arms: log spirals from Reid 2019, Gaussian width, brighter where measured
    for name, bk, rk, plt, pgt, width, bmin, bmax in ARMS:
        n = 9000 if name not in ("3-kpc", "Local") else 3500
        for _ in range(n):
            beta = rnd.uniform(bmin - 20, bmax + CONTINUE_DEG)
            r = arm_radius(beta, bk, rk, plt, pgt)
            if r > DISC_RADIUS_KPC or r < 2.5:
                continue
            r += rnd.gauss(0, width)
            b = math.radians(beta)
            z = rnd.gauss(0, DISC_HEIGHT_KPC * 0.6)
            measured = bmin <= beta <= bmax
            pts.append((-r * math.cos(b), r * math.sin(b), z, 3, 255 if measured else 130))

    rnd.shuffle(pts)
    out = bytearray(struct.pack("<4sII", b"SRGX", 1, len(pts)))
    for gx, gy, gz, kind, w in pts:
        # galactocentric -> heliocentric galactic (Sun at (-R0,0,0)) -> ecliptic
        hx, hy, hz = gx + R0_KPC, gy, gz
        x, y, z = gal_to_ecl(hx, hy, hz)
        out += struct.pack("<fffBBH", x, y, z, kind, w, 0)
    OUT.write_bytes(out)
    print(f"galaxy: {len(pts)} points, seed {SEED} -> {OUT.stat().st_size} B")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
