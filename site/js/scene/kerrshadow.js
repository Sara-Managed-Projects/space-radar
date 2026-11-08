// scene/kerrshadow.js -- the shadow of a spinning black hole as seen from far away, for scene/blackhole.js (forge #149).
//
// Contract (pure, tests/test_kerrshadow.mjs):
//   photonOrbits(a) -> { pro, retro }               radii of the prograde and retrograde circular photon orbits, M
//   kerrOutline(a, inclDeg, n) -> [[x, y], ...]     the shadow's edge on the sky, M; +x towards the side that turns towards us
//   shadowFourier(a, inclDeg) -> [c0, c1, c2, c3]   its radius about the hole's centre, R(psi) ~ sum c_k cos(k psi)
//   SPINS                                           the spin each drawn hole is given, and why
//
// WHY. scene/blackhole.js traces light through the Schwarzschild metric: a hole that does not turn, whose shadow
// is a circle sqrt(27) M wide whatever the angle. A turning hole drags space round with it: light going the way it
// turns can skim closer before it is lost, light going the other way is lost further out, so the shadow is pushed
// away from the side coming towards us and flattened on that side (Bardeen 1973). Seen from along the axis it is
// still a circle, a little smaller; seen edge-on at the highest spin it is a D. This module gives that outline
// EXACTLY (it is a closed formula: the photon orbits of the Kerr metric and their impact parameters), and the
// shader bends its own picture so the edge of its shadow lands on this outline. The bending is the MODEL, and the
// card says so: the light inside and outside the edge is still Schwarzschild's.
//
// The formulas are Bardeen's (in "Black Holes", Les Houches 1972, 1973), as in Chandrasekhar's "The Mathematical
// Theory of Black Holes" (1983) section 63: for a circular photon orbit of radius r, with M = 1,
//   xi(r)  = (r^2 (3 - r) - a^2 (r + 1)) / (a (r - 1))                    the axial angular momentum over energy
//   eta(r) = r^3 (4 a^2 - r (r - 3)^2) / (a^2 (r - 1)^2)                   Carter's constant over energy squared
// and on the sky of an observer at inclination i: x = xi / sin i, y = +-sqrt(eta + a^2 cos^2 i - xi^2 cot^2 i).

const DEG = Math.PI / 180;

/**
 * The spin given to each drawn hole: chosen, not measured (no spin is measured for either). EHT 2019 paper V
 * (ApJL 875, L5) found its images matched by turning holes and not by still ones, and its best-fitting models for
 * M87* turn at a = 0.94 with the spin pointing away from us; EHT 2022 paper V (ApJL 930, L16) favours a = 0.5 to
 * 0.94 for Sagittarius A*, seen within 50 degrees of the axis.
 */
export const SPINS = { 'm87-star': 0.94, 'sgr-a-star': 0.5 };

/** The prograde (inner) and retrograde (outer) circular photon orbits of a hole of spin `a`, in M. */
export function photonOrbits(a) {
  const s = Math.max(0, Math.min(0.9999, Math.abs(a)));
  return {
    pro: 2 * (1 + Math.cos((2 / 3) * Math.acos(-s))),
    retro: 2 * (1 + Math.cos((2 / 3) * Math.acos(s))),
  };
}

/**
 * The shadow's edge as seen from inclination `inclDeg` (0 along the spin axis), `n` points round it, in M. +x is
 * towards the side of the sky where the hole's turning comes towards us; +y along the projected spin axis.
 */
export function kerrOutline(a, inclDeg, n = 128) {
  const s = Math.max(0, Math.min(0.9999, Math.abs(a)));
  const inc = Math.max(0.5, Math.min(90, Math.abs(inclDeg))) * DEG;
  if (s < 1e-3) {
    const R = Math.sqrt(27);
    return Array.from({ length: n }, (_, k) => [R * Math.cos((2 * Math.PI * k) / n), R * Math.sin((2 * Math.PI * k) / n)]);
  }
  const { pro, retro } = photonOrbits(s);
  const si = Math.sin(inc);
  const ci = Math.cos(inc);
  const upper = [];
  const steps = 4000;
  for (let k = 0; k <= steps; k += 1) {
    const r = pro + ((retro - pro) * k) / steps;
    const xi = (r * r * (3 - r) - s * s * (r + 1)) / (s * (r - 1));
    const eta = (r * r * r * (4 * s * s - r * (r - 3) * (r - 3))) / (s * s * (r - 1) * (r - 1));
    const arg = eta + s * s * ci * ci - xi * xi * (ci * ci) / (si * si);
    if (arg < 0) continue;
    upper.push([xi / si, Math.sqrt(arg)]);
  }
  // The upper half from one end to the other, then the lower half back: a closed outline.
  const lower = upper.slice().reverse().map(([x, y]) => [x, -y]);
  const ring = upper.concat(lower);
  if (ring.length <= n) return ring;
  const out = [];
  for (let k = 0; k < n; k += 1) out.push(ring[Math.floor((k * ring.length) / n)]);
  return out;
}

/**
 * The outline's radius about the hole's centre as a function of the angle psi from +x: R(psi) ~ c0 + c1 cos psi +
 * c2 cos 2psi + c3 cos 3psi, least squares over the outline. Four numbers a shader can take as one vec4.
 */
export function shadowFourier(a, inclDeg) {
  const pts = kerrOutline(a, inclDeg, 256);
  // Normal equations for the four cosines.
  const A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  const b = [0, 0, 0, 0];
  for (const [x, y] of pts) {
    const psi = Math.atan2(y, x);
    const R = Math.hypot(x, y);
    const f = [1, Math.cos(psi), Math.cos(2 * psi), Math.cos(3 * psi)];
    for (let i = 0; i < 4; i += 1) {
      b[i] += f[i] * R;
      for (let j = 0; j < 4; j += 1) A[i][j] += f[i] * f[j];
    }
  }
  // Gaussian elimination: four unknowns.
  for (let i = 0; i < 4; i += 1) {
    let p = i;
    for (let r = i + 1; r < 4; r += 1) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < 4; r += 1) {
      const k = A[r][i] / A[i][i];
      for (let c = i; c < 4; c += 1) A[r][c] -= k * A[i][c];
      b[r] -= k * b[i];
    }
  }
  const c = [0, 0, 0, 0];
  for (let i = 3; i >= 0; i -= 1) {
    let v = b[i];
    for (let j = i + 1; j < 4; j += 1) v -= A[i][j] * c[j];
    c[i] = v / A[i][i];
  }
  return c;
}
