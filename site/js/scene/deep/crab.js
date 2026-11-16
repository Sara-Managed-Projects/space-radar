// scene/deep/crab.js -- the Crab Nebula as itself: a cage of filaments round a blue-white glow, and inside it the
// pulsar with its wind's two rings and two jets (the 2026-11-16 deep-space review, fault 2; the hero held since
// 2026-10-17 was a photograph carried on an ellipsoid: "turned it is a pale egg, from inside a grey wash"). Fetched by
// scene/deep/deepsky.js when M1 is near (scene/deep/heroes.js); never at boot. scene/deep/helix.js says what a hero
// answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_crab.mjs: envelopeOf, radiusAt, icosphere, honeycomb, filamentsOf, windOf, boost, expansionAt,
//   yearOf, glowOf, glowColumn, erfc, UNDER_MEASURED, SHADERS, COPY_BLOCK.
//
// WHAT IS MEASURED, WHAT IS MODELLED, WHAT IS ILLUSTRATIVE (registry/deepsky-heroes/crab.yaml holds every number).
//   MEASURED   its place and distance (the record's); the outline's reach along the pulsar's axis (no gas beyond 2
//              parsecs) and the empty middle (none within half a parsec), the pinched waist round the plane of the
//              pulsar's torus, the two fast lobes 120 degrees apart, and the SCALE of the honeycomb the filaments make
//              (cells about a tenth of a half-turn across in the outer lobes, bigger and thicker ones deeper in):
//              Martin, Milisavljevic & Drissen 2021 (MNRAS 502, 1864), from 310 000 spectra. The pulsar wind's two
//              rings: their radii, the direction and tilt of their axis and the speed of the flow that brightens
//              their near side: Ng & Romani 2004 and 2008, fits to Chandra's X-ray pictures. How fast it grows:
//              1.160 thousandths a year (Nugent 1998, as Martin et al. use it), from the supernova of 1054.
//   MODELLED   WHERE EACH FILAMENT IS. The cage is a honeycomb of the measured scale drawn on the measured outline, not
//              the real filaments one by one (the paper's data cube is not public). The lobes' and the waist's depth,
//              the glow's shape (a soft ellipsoid inside the cage), the jets' length and speed, the growth as a power
//              law from 1054 that has the measured rate today.
//   ILLUSTRATIVE  the colours. The filaments and the glow take theirs from Hubble's false-colour mosaic at the same
//              place on the sky (heic0515a, its stars removed: the map the app already ships); the pulsar's wind is
//              X-ray light, which no eye sees, drawn violet-blue.
//
// HOW IT IS DRAWN (no pass, no render target, no bloom; gasmat.js COLOUR_POLICY: display values, additive, opaque
// list, no depth write). Three draw calls in the SKY FRAME (x west, y north, z toward the Sun, light-years about the
// record's place), all inside one group scaled about the pulsar by the clock's expansion:
//   the cage    every filament a ribbon that faces the camera: as wide as it is, never under a pixel and a third (it
//               dims by the difference), soft across, knotted along. Its colour is the mosaic's where it stands.
//   the glow    the synchrotron light as a Gaussian ellipsoid whose column along any ray is known in closed form (an
//               error function): no march, no bands, right from outside and from inside, where it is a faint blue
//               haze toward the middle and never a wash, because the cage stays sharp round the camera.
//   the wind    the two rings and the jets as soft points, each brightened or dimmed by the flow's speed toward the
//               CAMERA (Ng & Romani's own Doppler factor, (1 - n.beta)^-(1+Gamma)): from the Sun's side the
//               north-west half of the rings is the bright one, as in Chandra's picture, and it changes as the view turns.
// Nothing here moves by itself; the clock grows it (invisible in a lifetime: a tenth of a per cent a year).

import { stage } from '../stage.js';
import { drawnUnder } from '../exposure.js';
import { part, shellOf, sharesFor, paletteFor, placeSkyGroup, loadMap, cameraInSky, COPY_BLOCK } from './remnant.js';

export { COPY_BLOCK };
/** Under the Measured look: the knots along a filament are generated detail and go; the rest is the model itself, and
 * its growth is the app clock's at the measured rate, not an animation. */
export const UNDER_MEASURED = { cage: 'same', knots: 'hidden', glow: 'same', wind: 'same', growth: 'same' };

const D2R = Math.PI / 180;
const LY_PER_PC = 3.261563777;
const ARCSEC = D2R / 3600;
const YEAR_MS = 365.2425 * 86400e3;
const f3 = (x) => Number(x).toFixed(4);
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** A small seeded generator (mulberry32): the same cage on every visit. Pure. */
export function seeded(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The app clock as a year (a mean Gregorian year from 1970). Pure. */
export const yearOf = (tMs) => 1970 + (Number(tMs) || 0) / YEAR_MS;

// ------------------------------------------------------------------------------------- the envelope

/**
 * The outline in the sky frame: the profile's ellipsoid (its long axis the pulsar's, scene/deep/remnant.js shellOf)
 * with the waist pinched round the torus's plane and the south-east lobe swollen, as Martin et al. 2021 describe it.
 * The lobe's direction: the axis's near end turned `from_axis_deg` about the sky's north, AWAY from us, so the two
 * lobes are 120 degrees apart seen from the north (their "top" view) and the lobe is still south-east on the sky. Pure.
 */
export function envelopeOf(profile) {
  const g = shellOf(profile);
  const en = part(profile, 'envelope');
  const A = g.axes[0];
  const pinch = en.pinch || {}, lobe = en.lobe || {};
  // the axis seen from the north: an angle in the (x west, z toward us) plane; turned away from us keeps x's sign
  const h = Math.hypot(A[0], A[2]) || 1;
  const a0 = Math.atan2(A[0], A[2]);
  const turn = num(lobe.from_axis_deg, 60) * D2R * (A[0] < 0 ? -1 : 1);
  const L = norm([Math.sin(a0 + turn) * h, A[1], Math.cos(a0 + turn) * h]);
  return {
    centre: g.centre, axes: g.axes, semi: g.semi, axis: A, lobe: L, uv: g.uv, distanceLy: g.distanceLy,
    pinchDepth: clamp(num(pinch.depth, 0), 0, 0.6), pinchWidth: Math.max(1, num(pinch.width_deg, 20)) * D2R,
    lobeGain: clamp(num(lobe.gain, 0), 0, 1), lobeWidth: Math.max(1, num(lobe.width_deg, 35)) * D2R,
    voidLy: num(en.void_pc, 0.5) * LY_PER_PC,
  };
}

/** How far the outline reaches from the centre along the unit direction `d` (sky frame), light-years. Pure. */
export function radiusAt(E, d) {
  const o = E.axes.map((a, i) => dot(d, a) / E.semi[i]);
  const base = 1 / Math.sqrt(dot(o, o));
  const lat = Math.asin(clamp(dot(d, E.axis), -1, 1));
  const waist = 1 - E.pinchDepth * Math.exp(-((lat / E.pinchWidth) ** 2));
  const off = Math.acos(clamp(dot(d, E.lobe), -1, 1));
  const lobe = 1 + E.lobeGain * Math.exp(-((off / E.lobeWidth) ** 2));
  return base * waist * lobe;
}

// ------------------------------------------------------------------------------------ the honeycomb

/** An icosahedron divided `level` times: {verts (unit), faces}. 12, 42, 162 corners; 20, 80, 320 faces. Pure. */
export function icosphere(level) {
  const t = (1 + Math.sqrt(5)) / 2;
  const verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
  let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let l = 0; l < level; l++) {
    const cache = new Map();
    const mid = (a, b) => {
      const k = a < b ? a * 65536 + b : b * 65536 + a;
      let m = cache.get(k);
      if (m === undefined) { m = verts.length; verts.push(norm(add(verts[a], verts[b]))); cache.set(k, m); }
      return m;
    };
    const next = [];
    for (const [a, b, c] of faces) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    faces = next;
  }
  return { verts, faces };
}

/**
 * A honeycomb on the unit sphere: the dual of a divided icosahedron whose corners were first moved at random by up to
 * `jitter` of an edge. Its cells are the corners (12 five-sided, the rest six-sided before the jitter), its walls the
 * `edges` between `nodes` (one node a face). {nodes, edges, cells, cellRad}: cellRad the mean cell's angular
 * diameter in radians. Pure.
 */
export function honeycomb(level, seed = 1, jitter = 0.3) {
  const { verts, faces } = icosphere(level);
  const rnd = seeded(seed);
  const edgeRad = Math.acos(clamp(dot(verts[faces[0][0]], verts[faces[0][1]]), -1, 1));
  const moved = verts.map((p) => {
    const u = norm(cross(p, Math.abs(p[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), w = cross(p, u);
    const r = jitter * edgeRad * Math.sqrt(rnd()), a = rnd() * 2 * Math.PI;
    return norm(add(add(p, u, r * Math.cos(a)), w, r * Math.sin(a)));
  });
  const nodes = faces.map(([a, b, c]) => norm(add(add(moved[a], moved[b]), moved[c])));
  const seen = new Map(), edges = [];
  faces.forEach((f, i) => {
    for (let k = 0; k < 3; k++) {
      const a = f[k], b = f[(k + 1) % 3], key = a < b ? a * 65536 + b : b * 65536 + a;
      const j = seen.get(key);
      if (j === undefined) seen.set(key, i); else edges.push([j, i]);
    }
  });
  return { nodes, edges, cells: verts.length, cellRad: 2 * Math.sqrt(4 / verts.length) };
}

/**
 * The cage: every filament as a chain of straight pieces, in light-years about the CENTRE of expansion. Two
 * honeycombs (the profile's `nets`: a coarse one deep in with thick walls, a fine one on the outline with thin ones:
 * Martin et al.'s hierarchy), spikes that reach inward from the fine one's corners (the "bubble and spike" of
 * Rayleigh-Taylor fingers, Hester 2008 as they cite it) and struts from the coarse net out to the fine one. Returns
 * { a, b (Float32Array, 3 a piece), width, along (2 a piece: the distance along its filament at each end), bright, net
 * (0 deep, 1 outline, 2 spike or strut), count, nets: [{cells, cellRad, pieces}] }. `detail` 0..1 thins the chains
 * for a slow device. Pure.
 */
export function filamentsOf(profile, { detail = 1 } = {}) {
  const E = envelopeOf(profile);
  const fl = part(profile, 'filaments');
  const rnd = seeded(num(fl.seed, 1054));
  const A = [], B = [], W = [], S = [], Br = [], N = [];
  const piece = (p, q, w, s0, s1, bright, net) => { A.push(p[0], p[1], p[2]); B.push(q[0], q[1], q[2]); W.push(w); S.push(s0, s1); Br.push(bright); N.push(net); };
  const at = (d, frac) => { const r = Math.max(E.voidLy * 1.02, radiusAt(E, d) * frac); return [d[0] * r, d[1] * r, d[2] * r]; };
  const chain = (pts, w, bright, net) => {
    let s = rnd() * 40;
    for (let i = 0; i + 1 < pts.length; i++) {
      const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]);
      piece(pts[i], pts[i + 1], w, s, s + l, bright, net);
      s += l;
    }
  };
  const nets = [];
  const built = [];
  const rows = Array.isArray(fl.nets) ? fl.nets : [];
  rows.forEach((row, ni) => {
    const hc = honeycomb(num(row.level, 1), num(fl.seed, 1054) + 17 * (ni + 1), num(row.jitter, 0.35));
    const [f0, f1] = Array.isArray(row.at) ? row.at.map(Number) : [0.9, 1];
    const frac = hc.nodes.map(() => f0 + (f1 - f0) * rnd());
    const K = Math.max(2, Math.round(num(row.pieces, 6) * (0.5 + 0.5 * detail)));
    const wob = num(row.wobble, 0.12) * hc.cellRad;
    const before = W.length;
    for (const [i, j] of hc.edges) {
      const n1 = hc.nodes[i], n2 = hc.nodes[j];
      // a wall bows sideways and in or out between its corners (straight and rounded boundaries, both seen)
      const side = norm(cross(n1, n2)), bow = (rnd() * 2 - 1) * wob, sag = (rnd() * 2 - 1) * 0.04;
      const pts = [];
      for (let k = 0; k <= K; k++) {
        const s = k / K, hump = Math.sin(Math.PI * s);
        const dir = k === 0 ? n1 : k === K ? n2 : norm(add([n1[0] * (1 - s) + n2[0] * s, n1[1] * (1 - s) + n2[1] * s, n1[2] * (1 - s) + n2[2] * s], side, bow * hump));
        pts.push(at(dir, (frac[i] * (1 - s) + frac[j] * s) * (1 + sag * hump)));
      }
      chain(pts, num(row.width_ly, 0.08) * (0.7 + 0.6 * rnd()), num(row.bright, 1) * (0.55 + 0.9 * rnd()), ni === 0 && rows.length > 1 ? 0 : 1);
    }
    nets.push({ name: row.name || `net-${ni}`, cells: hc.cells, cellRad: hc.cellRad, pieces: W.length - before, at: [f0, f1] });
    built.push({ hc, frac });
  });
  // spikes: from a share of the outline net's corners straight in toward the centre
  const sp = fl.spikes || {};
  const outer = built[built.length - 1], inner = built.length > 1 ? built[0] : null;
  if (outer && num(sp.share, 0) > 0 && detail > 0.4) {
    const [l0, l1] = Array.isArray(sp.length) ? sp.length.map(Number) : [0.08, 0.2];
    outer.hc.nodes.forEach((n, i) => {
      if (rnd() > num(sp.share, 0.5)) return;
      const len = l0 + (l1 - l0) * rnd();
      chain([at(n, outer.frac[i]), at(n, outer.frac[i] - len * 0.5), at(n, outer.frac[i] - len)], num(sp.width_ly, 0.05), num(sp.bright, 0.7) * (0.6 + 0.8 * rnd()), 2);
    });
  }
  // struts: each deep corner tied to the outline corner nearest its direction (the cage is a foam, not two skins)
  if (outer && inner && num(fl.struts, 0) > 0) {
    inner.hc.nodes.forEach((n, i) => {
      if (rnd() > num(fl.struts, 0.4)) return;
      let best = 0, bc = -2;
      outer.hc.nodes.forEach((m, j) => { const c = dot(n, m); if (c > bc) { bc = c; best = j; } });
      const m = outer.hc.nodes[best];
      const midDir = norm(add(n, m));
      chain([at(n, inner.frac[i]), at(midDir, (inner.frac[i] + outer.frac[best]) / 2), at(m, outer.frac[best])], num(sp.width_ly, 0.05) * 1.2, num(sp.bright, 0.7) * (0.6 + 0.6 * rnd()), 2);
    });
  }
  return {
    a: new Float32Array(A), b: new Float32Array(B), width: new Float32Array(W), along: new Float32Array(S), bright: new Float32Array(Br),
    net: new Float32Array(N), count: W.length, nets, envelope: E,
  };
}

// ------------------------------------------------------------------------------- the pulsar's wind

/** Ng & Romani's Doppler factor: a flow of speed `beta` (of light's) at cosine `c` to the line to the eye. Pure. */
export function boost(beta, c, gamma = 1.5) {
  return Math.max(0.05, 1 - c * beta) ** -(1 + gamma);
}

/** A fitted ring's frame in the sky frame from its position angle and inclination (Ng & Romani 2004, their x', y', z'). Pure. */
export function ringFrame(paDeg, inclDeg) {
  const pa = paDeg * D2R, incl = inclDeg * D2R;
  const axis = norm([-Math.sin(pa) * Math.sin(incl), Math.cos(pa) * Math.sin(incl), Math.cos(incl)]);
  const e1 = norm([Math.cos(pa), Math.sin(pa), 0]);
  return { axis, e1, e2: cross(axis, e1) };
}

/**
 * The pulsar's wind as points about the pulsar, light-years: the two fitted rings (a Gaussian tube of dispersion
 * `blur` round each circle, the flow radial in the ring's plane at its fitted speed), the two jets along the outer
 * ring's axis (their length and speed are NOT fitted: the profile's own, said to be a model) and the pulsar. Returns
 * { pos, vel (3 a piece), size, beta, amp, kind (0 ring, 1 jet, 2 pulsar), count, rings: [{rLy, blurLy, beta, axis}] }. Pure.
 */
export function windOf(profile, { detail = 1 } = {}) {
  const wd = part(profile, 'wind');
  const dist = num(wd.distance_pc, 2000) * LY_PER_PC;
  const rnd = seeded(num(wd.seed, 531));
  const gauss = () => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const P = [], V = [], S = [], Bt = [], Am = [], Kd = [];
  const put = (p, v, size, beta, amp, kind) => { P.push(p[0], p[1], p[2]); V.push(v[0], v[1], v[2]); S.push(size); Bt.push(beta); Am.push(amp); Kd.push(kind); };
  const rings = [];
  for (const key of ['inner', 'outer']) {
    const r = wd[key];
    if (!r) continue;
    const F = ringFrame(num(r.pa_deg, 0), num(r.incl_deg, 0));
    const rLy = num(r.r_arcsec, 10) * ARCSEC * dist, blurLy = num(r.blur_arcsec, 2) * ARCSEC * dist, beta = num(r.beta, 0.5);
    rings.push({ name: key, rLy, blurLy, beta, axis: F.axis, e1: F.e1, e2: F.e2 });
    const n = Math.round(num(r.points, 600) * (0.5 + 0.5 * detail));
    for (let i = 0; i < n; i++) {
      const ph = rnd() * 2 * Math.PI, c = Math.cos(ph), s = Math.sin(ph);
      const radial = add([F.e1[0] * c, F.e1[1] * c, F.e1[2] * c], F.e2, s);
      const rr = rLy + gauss() * blurLy, zz = gauss() * blurLy;
      put(add([radial[0] * rr, radial[1] * rr, radial[2] * rr], F.axis, zz), radial, Math.max(blurLy * 2.2, rLy * 0.05), beta, num(r.amp, 1), 0);
    }
  }
  const jets = wd.jets;
  if (jets && rings.length) {
    const ax = rings[rings.length - 1].axis;
    const len = num(jets.length_ly, 2), from = num(jets.from_ly, 0.15), n = Math.round(num(jets.points, 300) * (0.5 + 0.5 * detail));
    for (const sign of [1, -1]) {
      const u = norm(cross(ax, [0, 1, 0])), w = cross(ax, u);
      for (let i = 0; i < n; i++) {
        const t = rnd(), z = from + (len - from) * t, wide = num(jets.width_ly, 0.08) * (0.5 + 1.2 * t);
        const ox = gauss() * wide * 0.5, oy = gauss() * wide * 0.5;
        const p = add(add([ax[0] * z * sign, ax[1] * z * sign, ax[2] * z * sign], u, ox), w, oy);
        put(p, [ax[0] * sign, ax[1] * sign, ax[2] * sign], wide * 1.6, num(jets.beta, 0.4), num(jets.amp, 0.6) * (1 - 0.6 * t), 1);
      }
    }
  }
  put([0, 0, 0], [0, 0, 1], num(wd.pulsar_ly, 0.03), 0, num(wd.pulsar_amp, 3), 2);
  return { pos: new Float32Array(P), vel: new Float32Array(V), size: new Float32Array(S), beta: new Float32Array(Bt), amp: new Float32Array(Am), kind: new Float32Array(Kd), count: S.length, rings, gamma: num(wd.photon_index, 1.5) };
}

// --------------------------------------------------------------------------------------- the clock

/**
 * How large the nebula is at `year`, as a share of its size at the profile's epoch: nothing before the supernova, then
 * a power law from the explosion whose rate at the epoch is the measured one (the measured motions, run back in
 * straight lines, meet at `convergence_year`, later than the explosion, because the pulsar has pushed the gas: the
 * exponent is (epoch - explosion) / (epoch - convergence), a little over 1). Pure.
 */
export function expansionAt(profile, year) {
  const e = part(profile, 'expansion');
  const t0 = num(e.explosion_year, 1054), tr = num(e.epoch_year, 2016.9), tc = num(e.convergence_year, 1130);
  if (!(year > t0)) return 0;
  const k = (tr - t0) / Math.max(1, tr - tc);
  return clamp(((year - t0) / (tr - t0)) ** k, 0, num(e.max, 4));
}

// ---------------------------------------------------------------------------------------- the glow

/** Complementary error function for x >= 0 (Abramowitz & Stegun 7.1.26, to 1.5e-7) times exp(x^2): the GLSL's. Pure. */
export function erfcx(x) {
  const t = 1 / (1 + 0.3275911 * x);
  return t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
}
export const erfc = (x) => (x >= 0 ? erfcx(x) * Math.exp(-x * x) : 2 - erfcx(-x) * Math.exp(-x * x));

/** The synchrotron glow's Gaussian ellipsoid: the envelope's axes, each semi-axis `sigma` times the envelope's. Pure. */
export function glowOf(profile) {
  const E = envelopeOf(profile);
  const sy = part(profile, 'synchrotron');
  const k = clamp(num(sy.sigma, 0.45), 0.05, 1);
  const sig = E.semi.map((s) => s * k);
  return { centre: E.centre, axes: E.axes, sigma: sig, ref: Math.sqrt(Math.PI) * Math.min(...sig), amp: num(sy.amp, 0.5), colour: Array.isArray(sy.colour) ? sy.colour.map(Number) : [0.62, 0.78, 1] };
}

/**
 * The glow's column along ro + t rd, t >= 0 (unit rd, sky frame, ly), as a share of the column straight through the
 * middle along the shortest axis: exp(-q) integrated in closed form, q = A t^2 + 2 B t + C. Also returns `tPeak`,
 * where on the ray the glow is strongest. FRAG_GLOW's main(). Pure.
 */
export function glowColumn(G, ro, rd) {
  const q = [ro[0] - G.centre[0], ro[1] - G.centre[1], ro[2] - G.centre[2]];
  const o = G.axes.map((a, i) => dot(q, a) / G.sigma[i]);
  const e = G.axes.map((a, i) => dot(rd, a) / G.sigma[i]);
  const A = dot(e, e), B = dot(o, e), C = dot(o, o);
  const x = B / Math.sqrt(A);
  const half = 0.5 * Math.sqrt(Math.PI / A);
  const I = x >= 0 ? half * erfcx(x) * Math.exp(-C) : half * (2 * Math.exp(x * x - C) - erfcx(-x) * Math.exp(-C));
  return { column: I / G.ref, tPeak: Math.max(0, -B / A) };
}

// ----------------------------------------------------------------------------------------- the GLSL

const LIGHT_GLSL = /* glsl */ `
uniform sampler2D uLight;   // Hubble's mosaic without its stars (display values), in the sky frame about the record
uniform vec2 uUv0;
uniform vec2 uUx;
uniform vec2 uUy;
vec3 lightAt( vec2 xy ) {
  vec2 uv = uUv0 + xy.x * uUx + xy.y * uUy;
  vec2 q = abs( uv * 2.0 - 1.0 );
  float inside = 1.0 - smoothstep( 0.86, 0.99, max( q.x, q.y ) );
  return texture2D( uLight, uv ).rgb * inside;
}
`;

const VERT_CAGE = /* glsl */ `
attribute vec3 aA;        // the piece's two ends, ly about the centre of expansion
attribute vec3 aB;
attribute vec4 aEnd;      // x: which end (0, 1); y: which side (-1, 1); z: its width, ly; w: the distance along the filament, ly
attribute vec2 aLook;     // x: brightness; y: 0 deep net, 1 outline net, 2 spike or strut
uniform vec3 uCentre;
uniform float uViewH;     // the view's height, device pixels
uniform float uMinPx;
uniform float uFloor;     // a filament's light where the mosaic is dark (the far side, the model's own reach)
uniform vec3 uWarmDeep;
uniform vec3 uWarmRim;
uniform vec3 uCool;
varying vec3 vCol;
varying vec3 vP;          // x: across (-1..1); y: along, ly; z: what is left of a filament thinner than uMinPx
${LIGHT_GLSL}
void main() {
  vec4 a = modelViewMatrix * vec4( uCentre + aA, 1.0 );
  vec4 b = modelViewMatrix * vec4( uCentre + aB, 1.0 );
  vec3 p = mix( a.xyz, b.xyz, aEnd.x );
  vec3 side = cross( b.xyz - a.xyz, p );
  float sl = length( side );
  side = sl > 1e-20 ? side / sl : vec3( 1.0, 0.0, 0.0 );
  float unit = length( ( modelViewMatrix * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );   // view units a light-year (the clock's growth in it)
  float pxPerRad = projectionMatrix[ 1 ][ 1 ] * uViewH * 0.5;
  float dist = max( length( p ), 1e-20 );
  float wPx = aEnd.z * unit * pxPerRad / dist;
  float usePx = max( wPx, uMinPx );
  p += side * aEnd.y * 0.5 * usePx * dist / pxPerRad;
  gl_Position = projectionMatrix * vec4( p, 1.0 );
  vec3 at = uCentre + mix( aA, aB, aEnd.x );
  vec3 c = lightAt( at.xy );
  float lum = dot( c, vec3( 0.3, 0.5, 0.2 ) );
  float warm = clamp( 0.55 + 1.6 * ( c.r - c.b ), 0.0, 1.0 );
  vec3 tint = mix( uCool, aLook.y < 0.5 ? uWarmDeep : uWarmRim, warm );
  vCol = tint * aLook.x * ( uFloor + ( 1.0 - uFloor ) * smoothstep( 0.02, 0.45, lum ) * 1.5 );
  vP = vec3( aEnd.y, aEnd.w, clamp( wPx / uMinPx, 0.0, 1.0 ) );
}
`;

const FRAG_CAGE = /* glsl */ `
uniform float uShare;
uniform float uGain;
uniform float uKnots;     // 1: knotted along (Film); 0: even (Measured)
varying vec3 vCol;
varying vec3 vP;
float h1( float n ) { return fract( sin( n * 127.1 ) * 43758.5453 ); }
float vnoise( float x ) { float i = floor( x ), f = fract( x ); f = f * f * ( 3.0 - 2.0 * f ); return mix( h1( i ), h1( i + 1.0 ), f ); }
void main() {
  if ( uShare <= 0.0 ) discard;
  float across = exp( -3.2 * vP.x * vP.x );
  float knots = mix( 1.0, 0.35 + 1.1 * vnoise( vP.y * 9.0 ) + 0.5 * vnoise( vP.y * 31.0 ), uKnots );
  gl_FragColor = vec4( vCol * across * knots * vP.z * uShare * uGain, 1.0 );   // additive
}
`;

const VERT_BOX = /* glsl */ `
varying vec3 vObj;
void main() {
  vObj = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const FRAG_GLOW = /* glsl */ `
uniform vec3 uCam;          // the camera in the scaled sky frame, ly (CPU, float64, each frame)
uniform vec3 uCentre;
uniform mat3 uAxes;         // columns: the ellipsoid's axes, unit
uniform vec3 uSigma;        // its Gaussian's three dispersions, ly
uniform float uRef;         // the column straight through the middle along the shortest axis
uniform vec3 uColour;
uniform float uPhoto;       // how far the mosaic's blue shapes it (0: the plain ellipsoid)
uniform float uShare;
uniform float uGain;
varying vec3 vObj;
${LIGHT_GLSL}
// erfc(x) exp(x^2) for x >= 0 (Abramowitz & Stegun 7.1.26)
float erfcx( float x ) {
  float t = 1.0 / ( 1.0 + 0.3275911 * x );
  return t * ( 0.254829592 + t * ( -0.284496736 + t * ( 1.421413741 + t * ( -1.453152027 + t * 1.061405429 ) ) ) );
}
void main() {
  if ( uShare <= 0.0 ) discard;
  vec3 rd = normalize( vObj - uCam );
  vec3 o = ( ( uCam - uCentre ) * uAxes ) / uSigma;
  vec3 e = ( rd * uAxes ) / uSigma;
  float A = dot( e, e ), B = dot( o, e ), C = dot( o, o );
  float x = B / sqrt( A );
  float half_ = 0.5 * sqrt( 3.14159265 / A );
  float I = x >= 0.0 ? half_ * erfcx( x ) * exp( -C ) : half_ * ( 2.0 * exp( x * x - C ) - erfcx( -x ) * exp( -C ) );
  vec3 at = uCam + rd * max( 0.0, -B / A );
  vec3 c = lightAt( at.xy );
  float blue = clamp( dot( c, vec3( 0.05, 0.35, 0.75 ) ) * 1.6, 0.0, 1.4 );
  vec3 col = uColour * ( I / uRef ) * mix( 1.0, 0.35 + blue, uPhoto ) * uShare * uGain;
  gl_FragColor = vec4( col, 1.0 );   // additive
}
`;

const VERT_WIND = /* glsl */ `
attribute vec3 iPos;      // ly about the pulsar
attribute vec3 iVel;      // the flow's direction, unit
attribute vec4 iLook;     // x: size, ly; y: the flow's speed (of light's); z: brightness; w: 0 ring, 1 jet, 2 the pulsar
uniform vec3 uCentre;
uniform vec3 uCam;        // the camera in the scaled sky frame
uniform float uViewH;
uniform float uMinPx;
uniform float uIndex;     // 1 + the photon index
uniform float uNorm;
uniform vec3 uXray;
uniform vec3 uStar;
varying vec2 vQ;
varying vec3 vCol;
void main() {
  vec3 at = uCentre + iPos;
  vec4 mv = modelViewMatrix * vec4( at, 1.0 );
  float unit = length( ( modelViewMatrix * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );
  float pxPerRad = projectionMatrix[ 1 ][ 1 ] * uViewH * 0.5;
  float dist = max( length( mv.xyz ), 1e-20 );
  float px = iLook.x * unit * pxPerRad / dist;
  float minPx = iLook.w > 1.5 ? uMinPx * 2.2 : uMinPx;
  float usePx = max( px, minPx );
  float kept = iLook.w > 1.5 ? 1.0 : clamp( ( px * px ) / ( minPx * minPx ), 0.0, 1.0 );
  mv.xy += position.xy * usePx * dist / pxPerRad;
  gl_Position = projectionMatrix * mv;
  vec3 n = normalize( uCam - at );
  float dop = pow( max( 1.0 - dot( n, iVel ) * iLook.y, 0.05 ), -uIndex ) * ( iLook.y > 0.0 ? uNorm : 1.0 );
  vCol = ( iLook.w > 1.5 ? uStar : uXray ) * iLook.z * dop * kept;
  vQ = position.xy;
}
`;

const FRAG_WIND = /* glsl */ `
uniform float uShare;
uniform float uGain;
varying vec2 vQ;
varying vec3 vCol;
void main() {
  float r2 = dot( vQ, vQ );
  if ( uShare <= 0.0 || r2 > 1.0 ) discard;
  gl_FragColor = vec4( vCol * exp( -4.5 * r2 ) * uShare * uGain, 1.0 );   // additive
}
`;

/** The shader sources, for tests/test_crab.mjs (glowColumn mirrors FRAG_GLOW). */
export const SHADERS = { cageVert: VERT_CAGE, cageFrag: FRAG_CAGE, glowFrag: FRAG_GLOW, windVert: VERT_WIND, windFrag: FRAG_WIND };

// ----------------------------------------------------------------------------------------- the hero

const fileUrl = (path) => `../../../${String(path || '').replace(/^site\//, '')}`;

export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const id = profile.id || 'crab';
  const group = new THREE.Group();
  group.name = `deep-hero-${id}`;
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  // everything is drawn in `body`, the sky frame scaled about the centre of expansion by the clock's growth
  const body = new THREE.Group();
  body.name = `${group.name}-body`;
  body.matrixAutoUpdate = false;
  sky.add(body);
  let basisFor = null;

  const q0 = typeof env.quality === 'function' ? env.quality() || {} : {};
  const detail = q0.tier >= 1 && !q0.latched ? 1 : 0.5;
  const fil = filamentsOf(profile, { detail });
  const E = fil.envelope;
  const G = glowOf(profile);
  const wind = windOf(profile, { detail });
  const fl = part(profile, 'filaments'), wd = part(profile, 'wind'), sy = part(profile, 'synchrotron');
  const col = (v, d) => new THREE.Vector3(...(Array.isArray(v) && v.length === 3 ? v.map(Number) : d));

  const browser = typeof document !== 'undefined';
  let lightTex = null, lightState = 'none';
  const li = part(profile, 'light');
  if (browser && THREE.TextureLoader && li.file) {
    lightState = 'loading';
    lightTex = loadMap(THREE, fileUrl(li.file), (st) => { lightState = st; });
  }
  const pal0 = paletteFor(1, profile);
  const centre = new THREE.Vector3(...E.centre);
  const uvU = { uLight: { value: lightTex }, uUv0: { value: new THREE.Vector2(E.uv.u0, E.uv.v0) }, uUx: { value: new THREE.Vector2(...E.uv.ux) }, uUy: { value: new THREE.Vector2(...E.uv.uy) } };
  const flags = { transparent: false, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending };
  const viewH = () => ((typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800) * Math.min(2, (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1);

  // --- the cage: four corners a piece
  const n = fil.count;
  const aA = new Float32Array(n * 12), aB = new Float32Array(n * 12), aEnd = new Float32Array(n * 16), aLook = new Float32Array(n * 8);
  const index = new Uint32Array(n * 6);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k, end = k >> 1, side = k & 1 ? 1 : -1;
      for (let c = 0; c < 3; c++) { aA[v * 3 + c] = fil.a[i * 3 + c]; aB[v * 3 + c] = fil.b[i * 3 + c]; }
      aEnd[v * 4] = end; aEnd[v * 4 + 1] = side; aEnd[v * 4 + 2] = fil.width[i]; aEnd[v * 4 + 3] = fil.along[i * 2 + end];
      aLook[v * 2] = fil.bright[i]; aLook[v * 2 + 1] = fil.net[i];
    }
    index.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3], i * 6);
  }
  const cageGeo = new THREE.BufferGeometry();
  cageGeo.setAttribute('position', new THREE.BufferAttribute(aA, 3));
  cageGeo.setAttribute('aA', new THREE.BufferAttribute(aA, 3));
  cageGeo.setAttribute('aB', new THREE.BufferAttribute(aB, 3));
  cageGeo.setAttribute('aEnd', new THREE.BufferAttribute(aEnd, 4));
  cageGeo.setAttribute('aLook', new THREE.BufferAttribute(aLook, 2));
  cageGeo.setIndex(new THREE.BufferAttribute(index, 1));
  const cageMat = new THREE.ShaderMaterial({
    vertexShader: VERT_CAGE, fragmentShader: FRAG_CAGE, side: THREE.DoubleSide, ...flags,
    uniforms: {
      ...uvU, uCentre: { value: centre }, uViewH: { value: 800 }, uMinPx: { value: num(fl.min_px, 1.3) }, uFloor: { value: num(fl.floor, 0.3) },
      uWarmDeep: { value: col(fl.colours && fl.colours.deep, [1, 0.42, 0.18]) }, uWarmRim: { value: col(fl.colours && fl.colours.rim, [1, 0.62, 0.3]) }, uCool: { value: col(fl.colours && fl.colours.cool, [0.62, 0.95, 0.6]) },
      uShare: { value: 0 }, uGain: { value: 1 }, uKnots: { value: 1 },
    },
  });
  cageMat.name = 'deep-crab-cage';
  const cage = new THREE.Mesh(cageGeo, cageMat);
  cage.name = `${group.name}-cage-shells`;   // the contract's draw-order check knows a deep mesh by `-shells`
  cage.frustumCulled = false;
  cage.renderOrder = -1;
  body.add(cage);

  // --- the glow: a box round the ellipsoid, drawn by its back faces
  const R = Math.max(...E.semi) * (1 + E.lobeGain) * 1.05;
  const glowGeo = new THREE.BoxGeometry(2 * R, 2 * R, 2 * R);
  glowGeo.translate(E.centre[0], E.centre[1], E.centre[2]);
  const axes = new THREE.Matrix3().set(
    G.axes[0][0], G.axes[1][0], G.axes[2][0],
    G.axes[0][1], G.axes[1][1], G.axes[2][1],
    G.axes[0][2], G.axes[1][2], G.axes[2][2],
  );
  const glowMat = new THREE.ShaderMaterial({
    vertexShader: VERT_BOX, fragmentShader: FRAG_GLOW, side: THREE.BackSide, ...flags,
    uniforms: {
      ...uvU, uCam: { value: new THREE.Vector3(0, 0, 50) }, uCentre: { value: centre }, uAxes: { value: axes }, uSigma: { value: new THREE.Vector3(...G.sigma) },
      uRef: { value: G.ref }, uColour: { value: new THREE.Vector3(...G.colour) }, uPhoto: { value: num(sy.photo, 0.7) }, uShare: { value: 0 }, uGain: { value: 1 },
    },
  });
  glowMat.name = 'deep-crab-glow';
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.name = `${group.name}-glow-shells`;
  glow.frustumCulled = false;
  glow.renderOrder = -2;
  body.add(glow);

  // --- the wind: one instanced square a point
  const windGeo = new THREE.InstancedBufferGeometry();
  windGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]), 3));
  windGeo.setIndex([0, 1, 2, 2, 1, 3]);
  const iLook = new Float32Array(wind.count * 4);
  for (let i = 0; i < wind.count; i++) { iLook[i * 4] = wind.size[i]; iLook[i * 4 + 1] = wind.beta[i]; iLook[i * 4 + 2] = wind.amp[i]; iLook[i * 4 + 3] = wind.kind[i]; }
  windGeo.setAttribute('iPos', new THREE.InstancedBufferAttribute(wind.pos, 3));
  windGeo.setAttribute('iVel', new THREE.InstancedBufferAttribute(wind.vel, 3));
  windGeo.setAttribute('iLook', new THREE.InstancedBufferAttribute(iLook, 4));
  windGeo.instanceCount = wind.count;
  const windMat = new THREE.ShaderMaterial({
    vertexShader: VERT_WIND, fragmentShader: FRAG_WIND, side: THREE.DoubleSide, ...flags,
    uniforms: {
      uCentre: { value: centre }, uCam: { value: new THREE.Vector3(0, 0, 50) }, uViewH: { value: 800 }, uMinPx: { value: num(wd.min_px, 1.6) },
      uIndex: { value: 1 + wind.gamma }, uNorm: { value: num(wd.norm, 0.3) }, uXray: { value: col(wd.colour, [0.56, 0.58, 1]) }, uStar: { value: col(wd.pulsar_colour, [1, 1, 1]) },
      uShare: { value: 0 }, uGain: { value: 1 },
    },
  });
  windMat.name = 'deep-crab-wind';
  const windMesh = new THREE.Mesh(windGeo, windMat);
  windMesh.name = `${group.name}-wind-shells`;
  windMesh.frustumCulled = false;
  windMesh.renderOrder = -1;
  body.add(windMesh);

  let level = 0, levelShare = 0, tierNow = 1, palette = { ...pal0, gainIn: 1 }, last = { gas: 0, light: 1, photo: 0 }, scale = 1, yearNow = 0;
  const _inv = new THREE.Matrix4(), _id = new THREE.Matrix4(), _cam = new THREE.Vector3();
  const setScale = (s) => {
    scale = s;
    // T(centre) S(s) T(-centre): the growth is about the centre of expansion
    body.matrix.makeScale(s, s, s).setPosition(E.centre[0] * (1 - s), E.centre[1] * (1 - s), E.centre[2] * (1 - s));
    body.matrixWorldNeedsUpdate = true;
  };
  setScale(1);
  return {
    group,
    levels: [2, 3],
    // Three additive draws with no march: about what the holder it replaces costs (internal spec 0076 W1-a's hook).
    latchSafe: true,
    card: { copy: COPY_BLOCK, drawn: { [profile.record]: (profile.drawn || ['model']).slice() } },
    setLevel(lv, share = 1) {
      level = lv;
      levelShare = lv >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) { basisFor = stage.worldId; placeSkyGroup(THREE, sky, env.record); }
      tierNow = Number.isFinite(info.tier) ? info.tier : 1;
      const look = info.look || 'film';
      yearNow = yearOf(stage.tMs);
      const s = expansionAt(profile, yearNow);
      if (Math.abs(s - scale) > 1e-6) setScale(Math.max(1e-4, s));
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, photo: info.photo, viewH: (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800 });
      last = { ...sh, photo: Number(info.photo) || 0 };
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (gain !== palette.gainIn) palette = { ...paletteFor(gain, profile), gainIn: gain };
      const ready = lightState !== 'loading';
      const share = ready && s > 0.002 ? sh.gas : 0;
      const g = palette.gain * sh.light;
      const vh = viewH();
      cageMat.uniforms.uShare.value = share * (drawnUnder(look, UNDER_MEASURED.cage) ? 1 : 0);
      cageMat.uniforms.uGain.value = g * num(fl.gain, 1);
      cageMat.uniforms.uKnots.value = drawnUnder(look, UNDER_MEASURED.knots) ? 1 : 0;
      cageMat.uniforms.uViewH.value = vh;
      glowMat.uniforms.uShare.value = share * (drawnUnder(look, UNDER_MEASURED.glow) ? 1 : 0);
      glowMat.uniforms.uGain.value = g * G.amp;
      windMat.uniforms.uShare.value = share * (drawnUnder(look, UNDER_MEASURED.wind) ? 1 : 0);
      windMat.uniforms.uGain.value = g * num(wd.gain, 1);
      windMat.uniforms.uViewH.value = vh;
      cage.visible = cageMat.uniforms.uShare.value > 0.002;
      glow.visible = glowMat.uniforms.uShare.value > 0.002;
      windMesh.visible = windMat.uniforms.uShare.value > 0.002;
      if (info.camera) {
        cameraInSky(group, sky, info.camera, _cam, _inv, _id);
        // the camera in the body's own (unscaled) frame: the shaders' rays are straight lines there too
        const k = 1 / Math.max(1e-4, scale);
        _cam.set(E.centre[0] + (_cam.x - E.centre[0]) * k, E.centre[1] + (_cam.y - E.centre[1]) * k, E.centre[2] + (_cam.z - E.centre[2]) * k);
        glowMat.uniforms.uCam.value.copy(_cam);
        windMat.uniforms.uCam.value.copy(_cam);
      }
    },
    ready: () => lightState !== 'loading',
    stats: () => ({
      level, share: Math.round(last.gas * 100) / 100, photo: Math.round(last.photo * 100) / 100, light: lightState, path: 'cage',
      tier: tierNow, palette: palette.mode, meshes: 3, textures: lightTex ? 1 : 0, filaments: fil.count, nets: fil.nets.map((x) => `${x.name}:${x.cells}`),
      wind: wind.count, scale: Math.round(scale * 1e4) / 1e4, year: Math.round(yearNow),
      bytes: aA.byteLength * 2 + aEnd.byteLength + aLook.byteLength + index.byteLength + wind.pos.byteLength * 2 + iLook.byteLength + (lightTex ? Math.round(512 * 512 * 4 * 4 / 3) : 0),
      camLy: [Math.round(_cam.x * 100) / 100, Math.round(_cam.y * 100) / 100, Math.round(_cam.z * 100) / 100],
    }),
    dispose() {
      cageGeo.dispose(); cageMat.dispose(); glowGeo.dispose(); glowMat.dispose(); windGeo.dispose(); windMat.dispose();
      if (lightTex) lightTex.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}
