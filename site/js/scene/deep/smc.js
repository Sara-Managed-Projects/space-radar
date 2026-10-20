// scene/deep/smc.js -- the Small Magellanic Cloud as a hero: its stars where Gaia counts them on the sky, and as deep
// along our line as its Cepheids and red clump are measured to be (internal spec 0077 stage W2-e, internal #783; DS-08).
// Fetched by scene/deep/deepsky.js when the SMC is near (scene/deep/heroes.js); never at boot. registry/deepsky-heroes/
// smc.yaml is its profile (every number below that is not a drawing choice comes from there, with its source).
// scene/deep/helix.js's head says what a hero answers. The Bridge and the Stream are scene/deep/magellanic.js's.
//
// WHAT IT IS. A dwarf irregular galaxy torn by the LMC, not a disc: its young stars (the Cepheids) stretch more than
// 25 to 30 kpc along our line, from east/north-east (near) to south-west (far) (Ripepi et al. 2017; Scowcroft et al.
// 2016), and its old stars lie near a plane tilted about 40 degrees with its eastern side nearer (Tatton et al. 2021).
//
// WHAT IT DRAWS, in the sky frame at the catalogue centre (x west, y north, z toward the Sun; one unit 100 ly):
//   * its UNRESOLVED LIGHT as PATCHES (0077 W3-f, internal #783: the march it replaced cost five times main's frame on a
//     runner and read as a veil close up). A few thousand soft patches of light, each a small ball of the galaxy's light
//     at a place drawn from the two Gaia maps (where on the sky) and the population's sech^2 spread about its measured
//     mean depth there (how far along our line), exactly as its stars are drawn. A patch's size follows how crowded its
//     population is round it (so about OVERLAP patches cover any spot seen from the side, and many more along our line);
//     its light is its population's column there over the patches that share it, so seen from the Sun the patches add
//     up to the weighted maps (tests/test_hero_smc.mjs holds the sum to 12 % in half-degree cells). Where the SMC's
//     photograph covers the sky, the patch takes ITS colour there, spread through the two populations in proportion to
//     their counts: seen along our line the model is the photograph; turned, the young light stands in a long streak
//     toward and away from us and the old in a tilted slab. The photograph's STARS are taken out first, and 47 Tucanae
//     and NGC 362 in front of it (scripts/build_deep_smc.py --light). Beyond the photograph's frame the maps' own light,
//     in illustrative colours. A patch is a patch of light of a fixed size in light-years: its surface brightness is the
//     same from every distance; close up it is held small and gives up the light it would have spread over the view,
//     so the camera is among stars, never in a fog, and the cost is a few points' fill, not a march over the screen.
//   * STARS: points drawn from the same maps at depths drawn from the same spreads: a statistical population, never a
//     Gaia star at a parallax distance. Each is a pinpoint whose light falls as 1/d^2 and which gets smaller close up,
//     never larger; their summed light is the same at every tier.
// Two draw calls. Every part is weighted by 1 - share x cover, where cover is how much of the photograph is drawn
// there (scene/nebulae.js's fade, baked per map bin as lmc.js photoCover makes it) and share how much of it is drawn
// now: at arrival the photograph shows what it shows and the model draws the rest (a patch under a whole photograph is
// not drawn at all); turned, the photograph fades and the model is whole.
//
// UNDER THE MEASURED LOOK: the same (a labelled model); nothing ever moves.

import { stage } from '../stage.js';
import { PICTURE_FOR, pictureBasis, pictureHalfExtent } from '../nebulae.js';
import { photoCover, readMaps, rng } from './lmc.js';
import { exposureLook, EXPOSURES, drawnUnder } from '../exposure.js';
import { HERO as PROFILE } from '../../data/hero-smc.js';
import '../../copy/en.deepheroes.js'; // the card's words (deepCarina, deepSmc), fetched with the hero

export const UNDER_MEASURED = { stars: 'same', light: 'same', motion: 'still' };
/** The words block the card reads for this hero's record (copy/en.later.js). */
export const COPY_BLOCK = 'deepSmc';
export const DRAWN = { 'dso-smc': ['model'] };
export const MAP_BINS = 128;
const D2R = Math.PI / 180;
const MAP_URL = new URL('../../../data/deep/smc-density.bin', import.meta.url);
const LIGHT_URL = new URL('../../../images/deep/smc/smc-light.webp', import.meta.url);
// Drawing choices (not measurements).
export const SHAPE = {
  adapt: 0.45,       // what is left of its light when it fills the view (the eye's adaptation)
  inside: 0.12,      // what is left of the unresolved light with the camera inside the galaxy
  sparkle: 0.18,     // the points' share of the light (on top of the unresolved light: sparkle, not the body)
  sparklePx: 1.5,    // a point's size, CSS px; down to 0.6 of it close up (never grown)
  sparkleCap: 0.55,  // the brightest a point is drawn
  mapLight: 0.55,    // the maps' light at their peak, beyond the photograph (a display value, illustrative)
  // 0077 W3-f: the patches (the unresolved light)
  overlap: 3,        // patches over any spot seen from the side, about (along our line many more)
  widthUnits: 90,    // the populations' width on the sky the side view crosses, object units (2.6 degrees at the distance)
  patchMin: 2,       // a patch's radius, object units (200 ly) at least
  patchMax: 40,      // and at most (4 000 ly): the faint outskirts are soft, never one blob
  patchMaxPx: 22,    // CSS px: held no wider on the screen (close up a patch gives its light up, never grows into a veil)
  patchMinPx: 1.5,   // and no narrower (its light spread over the pixels it is given)
};
/** Patches by tier (the unresolved light): their summed light is the same at every tier, only finer. */
export const PATCHES = { t0: 2500, t1: 8000, t2: 12000 };
/** The integral of a patch's Gaussian over its point, as a share of the point's square (spiral.js SPRITE_AREA). */
const PATCH_SIGMA = 0.18;
export const PATCH_AREA = 2 * Math.PI * PATCH_SIGMA * PATCH_SIGMA * (1 - Math.exp(-0.25 / (2 * PATCH_SIGMA * PATCH_SIGMA)));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const part = (P, k) => (P.layers || []).find((l) => l && l.part === k) || {};
const isOurs = (p) => p && Array.isArray(p.layers) && p.layers.some((l) => l && l.part === 'young');
const OBLIQUITY = 23.4392911 * D2R;
const POLE = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)];
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** An equatorial J2000 unit vector. Pure. */
export function eqDir(raDeg, decDeg) {
  const a = raDeg * D2R, d = decDeg * D2R;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

/**
 * The hero's numbers in object units (100 ly) from its profile: the distance D, the extent's fade, and per population
 * its map, weight, colour, spread z0 and its mean depth as a linear function of the sky offset (degrees east, north):
 * zbar = a * east + b * north, held within +-max. Pure.
 */
export function geometryOf(profile = PROFILE) {
  const P = isOurs(profile) ? profile : PROFILE;
  const unit = Number(P.frame.units_ly) || 100;
  const D = (Number(P.frame.distance_ly) || 203650) / unit;
  const kpcPerDeg = D * unit * D2R; // ly a degree on the sky at the distance
  const old = part(P, 'old'), young = part(P, 'young');
  // the old plane: tilted incl about the line of nodes at nodes_pa; its near side's direction on the sky is 90 degrees
  // from the line of nodes, toward near_side (E: east)
  const nodes = Number(old.nodes_pa_deg) * D2R;
  let nearDir = [Math.cos(nodes), -Math.sin(nodes)]; // (east, north) perpendicular to the nodes (PA + 90)
  if (old.near_side === 'E' && nearDir[0] < 0) nearDir = [-nearDir[0], -nearDir[1]];
  const tanI = Math.tan(Number(old.incl_deg) * D2R);
  const yp = Number(young.near_pa_deg) * D2R;
  const yDir = [Math.sin(yp), Math.cos(yp)]; // PA east of north -> (east, north)
  const yk = Number(young.depth_ly_per_deg) / unit;
  const pops = [
    { name: 'old', map: Number(old.map) || 0, weight: Number(old.weight) || 1, colour: old.colour || [1, 0.84, 0.66], z0: Number(old.z0_ly) / unit, a: nearDir[0] * tanI * kpcPerDeg / unit, b: nearDir[1] * tanI * kpcPerDeg / unit, max: 400, count: old.count || {} },
    { name: 'young', map: Number(young.map) || 1, weight: Number(young.weight) || 0.6, colour: young.colour || [0.66, 0.79, 1], z0: Number(young.z0_ly) / unit, a: yDir[0] * yk, b: yDir[1] * yk, max: (Number(young.depth_max_ly) || 45000) / unit, count: young.count || {} },
  ];
  const ext = P.frame.extent || {};
  const fade = [Number(ext.fade_from_deg) || 3.2, Number(ext.fade_to_deg) || 4.6];
  const R = Math.tan(fade[1] * D2R) * (D + 500);
  const zMax = Math.max(...pops.map((p) => Math.min(p.max, Math.hypot(p.a, p.b) * fade[1]) + 4 * p.z0));
  const m = part(P, 'maps');
  // the galaxy's core, for "is the camera inside it": its inner radius on the sky, and the populations' depth there
  const core = [Math.tan(fade[0] * D2R) * D, Math.max(...pops.map((p) => 1.5 * p.z0))];
  return { D, unit, pops, fade, core, box: { min: [-R, -R, -zMax], max: [R, R, zMax] }, bins: Number(m.bins) || MAP_BINS, binDeg: Number(m.bin_deg) || 0.075, centre: [P.frame.centre.ra_deg, P.frame.centre.dec_deg] };
}

/** The sky offset (degrees east, north) of a point of the frame as seen from the Sun. Pure. */
export function skyOf(g, p) {
  const k = 1 / (g.D - p[2]) / D2R;
  return [-p[0] * k, p[1] * k];
}

/** A population's mean depth at a sky offset (object units toward the Sun). Pure. */
export function meanDepth(pop, east, north) {
  return clamp(pop.a * east + pop.b * north, -pop.max, pop.max);
}

/** Bilinear sample of a map (row 0 south, x east) at (east, north) degrees; 0 off it. Pure. */
export function mapAt(g, map, east, north) {
  const n = g.bins, bin = g.binDeg;
  const fx = (east + (n * bin) / 2) / bin - 0.5, fy = (north + (n * bin) / 2) / bin - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  if (x0 < 0 || y0 < 0 || x0 + 1 >= n || y0 + 1 >= n) return 0;
  const tx = fx - x0, ty = fy - y0;
  const at = (x, y) => map[y * n + x];
  return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty;
}

/** The drawn extent's taper at a sky offset: 1 inside fade_from, 0 past fade_to. Pure. */
export const taperAt = (g, east, north) => 1 - smooth(Math.hypot(east, north), g.fade[0], g.fade[1]);

/** The fraction of a sech^2 layer (mean m, scale z0) between depths za and zb. Pure. */
export function slab(za, zb, m, z0) {
  const t = (z) => Math.tanh(clamp((z - m) / z0, -9, 9));
  return Math.abs(t(zb) - t(za)) / 2;
}

/**
 * The patches of unresolved light, seeded (0077 W3-f): per population a share of the tier's count by its light, each at
 * a place drawn from its map (a bin by its weight, a place in it at random) and a depth drawn from its spread about its
 * mean depth there (as starsOf). For each: its radius R (object units), from how crowded its population is round it in
 * three dimensions, so that about SHAPE.overlap of them cover a spot seen across the galaxy's width; and its FLUX, its
 * population's column over the patches that share it, divided by the patch's own area on the sky as seen from the Sun:
 * so from the Sun the patches add up to the population's weighted map (the photograph's light where it covers it, which
 * the shader multiplies in). {pos: Float32Array(3n), col: Float32Array(4n) colour + flux, sky: Float32Array(4n) east,
 * north (degrees, from the Sun), R, population; n}. Pure.
 */
export function patchesOf(g, maps, tier = 1, seed = 783) {
  const total = PATCHES[['t0', 't1', 't2'][clamp(tier | 0, 0, 2)]];
  const r = rng(seed);
  const N = g.bins, bin2 = g.binDeg * g.binDeg;
  const pops = g.pops.map((p) => {
    const map = maps[p.map];
    const cdf = new Float64Array(N * N);
    let sum = 0;
    if (map) for (let k = 0; k < N * N; k++) {
      const x = k % N, y = Math.floor(k / N);
      sum += map[k] * taperAt(g, (x + 0.5 - N / 2) * g.binDeg, (y + 0.5 - N / 2) * g.binDeg); cdf[k] = sum;
    }
    return { p, map, cdf, sum, light: p.weight * sum * bin2 };
  });
  const L = pops.reduce((a, q) => a + q.light, 0) || 1;
  const out = [];
  pops.forEach((q, pi) => {
    const n = Math.round(total * q.light / L);
    if (!q.map || !(n > 0) || !(q.sum > 0)) return;
    const Z = q.sum * bin2;                    // the population's map summed over the sky, map x deg^2
    for (let s = 0; s < n; s++) {
      const want = r() * q.sum;
      let lo = 0, hi = q.cdf.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (q.cdf[mid] < want) lo = mid + 1; else hi = mid; }
      const w = q.cdf[lo] - (lo ? q.cdf[lo - 1] : 0);              // this bin's map x taper
      const east = (lo % N + r() - N / 2) * g.binDeg, north = (Math.floor(lo / N) + r() - N / 2) * g.binDeg;
      const m = meanDepth(q.p, east, north);
      const u = clamp(r(), 1e-6, 1 - 1e-6);
      const t = clamp(Math.atanh(2 * u - 1), -4, 4);
      const z = m + t * q.p.z0;
      const Dz = g.D - z, perDeg = Dz * D2R;                      // object units a degree, at the patch
      const perDeg2 = n * w / Z;                                   // patches a square degree here, seen from the Sun
      const c = 1 / Math.cosh(t);
      const n3 = perDeg2 / (perDeg * perDeg) * (c * c) / (2 * q.p.z0); // patches an object unit cubed
      const R = clamp(Math.sqrt(SHAPE.overlap / (Math.PI * Math.max(1e-12, n3) * SHAPE.widthUnits)), SHAPE.patchMin, SHAPE.patchMax);
      const rDeg = R / perDeg;
      const area = PATCH_AREA * (2 * rDeg) * (2 * rDeg);           // its light's footprint from the Sun, deg^2
      const flux = q.p.weight * (Z / n) / area;
      const k = Dz * D2R;
      out.push(-east * k, north * k, z, ...q.p.colour, flux, east, north, R, pi);
    }
  });
  const n = out.length / 11;
  const pos = new Float32Array(3 * n), col = new Float32Array(4 * n), sky = new Float32Array(4 * n);
  for (let i = 0; i < n; i++) { pos.set(out.slice(11 * i, 11 * i + 3), 3 * i); col.set(out.slice(11 * i + 3, 11 * i + 7), 4 * i); sky.set(out.slice(11 * i + 7, 11 * i + 11), 4 * i); }
  return { pos, col, sky, n };
}

/**
 * What the patches add up to on the sky seen from the Sun, in cells of `cellDeg` (east, north): each patch's whole light
 * (flux x its footprint) in the cell of its centre, per square degree. With colour 1 this is each cell's weighted map,
 * statistically. For the test. Pure.
 */
export function patchSky(g, P, cellDeg = 0.5) {
  const half = (g.bins * g.binDeg) / 2, M = Math.ceil((2 * half) / cellDeg);
  const sum = new Float64Array(M * M);
  for (let i = 0; i < P.n; i++) {
    const e = P.sky[4 * i], nn = P.sky[4 * i + 1];
    const x = Math.floor((e + half) / cellDeg), y = Math.floor((nn + half) / cellDeg);
    if (x < 0 || y < 0 || x >= M || y >= M) continue;
    const rDeg = P.sky[4 * i + 2] / ((g.D - P.pos[3 * i + 2]) * D2R);
    sum[y * M + x] += P.col[4 * i + 3] * PATCH_AREA * 4 * rDeg * rDeg / (cellDeg * cellDeg);
  }
  return { sum, M, cellDeg, half };
}

/**
 * The stars, seeded: per population n points drawn from its map (a bin by its weight, a place in it at random, a depth
 * from its spread about its mean depth there). Each point's flux is its population's share of SHAPE.sparkle split
 * equally, so the summed light is the same at every tier. {pos: Float32Array(3n), col: Float32Array(4n)}. Pure.
 */
export function starsOf(g, maps, tier = 1, seed = 1519) {
  const key = ['t0', 't1', 't2'][clamp(tier | 0, 0, 2)];
  const r = rng(seed);
  const out = [];
  let total = 0;
  for (const p of g.pops) total += p.weight;
  for (const p of g.pops) {
    const n = Number(p.count[key]) || 0;
    const map = maps[p.map];
    if (!map || !(n > 0)) continue;
    const N = g.bins;
    const cdf = new Float64Array(N * N);
    let sum = 0;
    for (let k = 0; k < N * N; k++) {
      const x = k % N, y = Math.floor(k / N);
      const east = (x + 0.5 - N / 2) * g.binDeg, north = (y + 0.5 - N / 2) * g.binDeg;
      sum += map[k] * taperAt(g, east, north); cdf[k] = sum;
    }
    if (!(sum > 0)) continue;
    // the population's share of the sparkle, times a mean surface brightness of 0.25 (a display value), split equally
    const flux = (p.weight / total) * SHAPE.sparkle * 0.25 / n;
    for (let s = 0; s < n; s++) {
      const want = r() * sum;
      let lo = 0, hi = cdf.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < want) lo = mid + 1; else hi = mid; }
      const east = (lo % N + r() - N / 2) * g.binDeg, north = (Math.floor(lo / N) + r() - N / 2) * g.binDeg;
      const u = clamp(r(), 1e-6, 1 - 1e-6);
      const z = meanDepth(p, east, north) + clamp(Math.atanh(2 * u - 1), -4, 4) * p.z0;
      const k = (g.D - z) * D2R;
      // a drawn luminosity: most faint, a few bright (lmc.js luminosity's shape), the population's mean kept
      const L = 0.45 * Math.pow(1 - 0.995 * r(), -0.55);
      out.push(-east * k, north * k, z, ...p.colour, flux * L);
    }
  }
  const n = out.length / 7;
  const pos = new Float32Array(3 * n), col = new Float32Array(4 * n);
  for (let i = 0; i < n; i++) { pos.set(out.slice(7 * i, 7 * i + 3), 3 * i); col.set(out.slice(7 * i + 3, 7 * i + 7), 4 * i); }
  return { pos, col, n };
}

/** The exposure from the coordinator's gain: the photograph's stretch. Pure. */
export function paletteFor(gain = 1, profile = PROFILE) {
  const P = isOurs(profile) ? profile : PROFILE;
  const mode = EXPOSURES.find((m) => Math.abs(exposureLook(m).milkyWay - gain) < 1e-6) || 'camera';
  const L = exposureLook(mode);
  return { mode, enhanced: mode === 'deep' && !!(P.colours && P.colours.enhanced), gain: L.nebulaGain, gamma: L.nebulaGamma, saturation: L.nebulaSaturation };
}

/** How much draws: the whole model from level 2, its light adapting as it fills the view, the body stepping back inside. Pure. */
export function sharesFor({ level = 0, rPx = 0, viewH = 800, inside = 0 } = {}) {
  const lv = clamp(Number(level) || 0, 0, 1);
  const fill = Number.isFinite(rPx) ? Math.max(0, Number(rPx) || 0) / Math.max(1, viewH / 2) : Infinity;
  const light = 1 - (1 - SHAPE.adapt) * (Number.isFinite(fill) ? smooth(fill, 0.7, 2) : 1);
  return { body: lv * (1 - (1 - SHAPE.inside) * clamp(inside, 0, 1)), stars: lv, light };
}

/**
 * The per-bin texture data: the two maps (square roots, for 8-bit precision at the faint end), the photograph's cover
 * there (scene/nebulae.js's fade) and the taper; and the photograph's (u, v) of each bin's direction. Pure.
 */
export function binTextures(g, maps, row = null, ell = null) {
  const N = g.bins;
  const a = new Uint8Array(N * N * 4);
  const c0 = eqDir(...g.centre);
  const east = norm(cross([0, 0, 1], c0)), north = cross(c0, east);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = y * N + x;
    const e = (x + 0.5 - N / 2) * g.binDeg, n = (y + 0.5 - N / 2) * g.binDeg;
    const te = Math.tan(e * D2R), tn = Math.tan(n * D2R);
    const eq = norm([c0[0] + te * east[0] + tn * north[0], c0[1] + te * east[1] + tn * north[1], c0[2] + te * east[2] + tn * north[2]]);
    const cov = row ? photoCover(row, ell, eq) : 0;
    a[4 * k] = Math.round(Math.sqrt(clamp(maps[0] ? maps[0][k] : 0, 0, 1)) * 255);
    a[4 * k + 1] = Math.round(Math.sqrt(clamp(maps[1] ? maps[1][k] : 0, 0, 1)) * 255);
    a[4 * k + 2] = Math.round(cov * 255);
    a[4 * k + 3] = Math.round(taperAt(g, e, n) * 255);
  }
  return { a, N, uv: row ? pictureAffine(g, row) : null };
}

/**
 * The photograph's (u, v) as an affine map of the sky offset (degrees east, north): u = c[0] + e m[0] + n m[1],
 * v = c[1] + e m[2] + n m[3], fitted by least squares over the maps' field. Two tangent planes 0.2 degrees apart differ
 * from affine by far less than a pixel of the photograph over it; per-bin values read through a texture would be
 * blocky (the bins are 4.5'). Pure.
 */
export function pictureAffine(g, row) {
  const c0 = eqDir(...g.centre);
  const east = norm(cross([0, 0, 1], c0)), north = cross(c0, east);
  let S = [0, 0, 0, 0, 0, 0], Su = [0, 0, 0], Sv = [0, 0, 0];
  const half = (g.bins * g.binDeg) / 2;
  for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) {
    const e = -half + (i / 12) * 2 * half, n = -half + (j / 12) * 2 * half;
    const te = Math.tan(e * D2R), tn = Math.tan(n * D2R);
    const q = pictureUvOf(row, norm([c0[0] + te * east[0] + tn * north[0], c0[1] + te * east[1] + tn * north[1], c0[2] + te * east[2] + tn * north[2]]));
    if (!q) continue;
    const x = [1, e, n];
    // normal equations, symmetric 3 x 3 (S: 11 1e 1n ee en nn)
    S = [S[0] + 1, S[1] + e, S[2] + n, S[3] + e * e, S[4] + e * n, S[5] + n * n];
    for (let k = 0; k < 3; k++) { Su[k] += x[k] * q.u; Sv[k] += x[k] * q.v; }
  }
  const A = [[S[0], S[1], S[2]], [S[1], S[3], S[4]], [S[2], S[4], S[5]]];
  const solve = (b) => {
    const m = A.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < 3; c++) {
      let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
      [m[c], m[p]] = [m[p], m[c]];
      for (let r = 0; r < 3; r++) if (r !== c) { const f = m[r][c] / m[c][c]; for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k]; }
    }
    return [m[0][3] / m[0][0], m[1][3] / m[1][1], m[2][3] / m[2][2]];
  };
  const u = solve(Su), v = solve(Sv);
  return { c: [u[0], v[0]], m: [u[1], u[2], v[1], v[2]] };
}

// A picture's (u, v) for an equatorial direction (scene/nebulae.js pictureBasis), as lmc.js pictureUv.
function pictureUvOf(row, eq) {
  const { centre, right, up } = pictureBasis(row);
  const along = dot(eq, centre);
  if (!(along > 1e-6)) return null;
  const h = pictureHalfExtent(row);
  return { u: 0.5 + dot(eq, right) / along / h.x / 2, v: 0.5 + dot(eq, up) / along / h.y / 2 };
}

/** The sky frame at an object, in sun-inertial: west, north, and toward the Sun (orion.js skyFrame). Pure. */
export function skyFrame(posKm) {
  const u = norm([posKm.x, posKm.y, posKm.z]);
  const e = norm(cross(POLE, u));
  return { west: [-e[0], -e[1], -e[2]], north: cross(u, e), toward: [-u[0], -u[1], -u[2]] };
}

// ------------------------------------------------------------------------------------------- GLSL
// 0077 W3-f: the unresolved light as patches (the head of this file): a point a patch, its size from its radius in light-years
// and the camera's focal length, its light from the photograph where it covers the sky (read once a vertex, never a pixel).
const PATCH_VERT = /* glsl */ `
attribute vec4 aCol;        // the population's colour; w: the patch's flux (its population's column over its share)
attribute vec4 aSky;        // east, north (degrees, from the Sun), radius (object units), population (0 old, 1 young)
uniform vec3 uCam;          // the camera in the frame, object units (CPU, float64, each frame)
uniform sampler2D uBins;    // r old, g young (square roots), b the photograph's cover, a the taper
uniform vec2 uPicC;         // the photograph's (u, v) = uPicC + mat2 of the sky offset (pictureAffine)
uniform vec4 uPicM;
uniform sampler2D uPic;     // the SMC's light (the photograph without its stars), display values
uniform float uBinDeg;
uniform float uBins_n;
uniform vec4 uPopA;         // old: weight, z0, a, b
uniform vec4 uPopB;         // young: weight, z0, a, b
uniform float uMapLight;    // the maps' light beyond the photograph
uniform vec4 uLook;         // the photograph's stretch: gamma, saturation, sky floor, 1 once it has landed
uniform float uPhoto;       // how much of the photograph is drawn now
uniform float uPxPerRad;    // CSS px a radian on the screen
uniform float uPixelRatio;
uniform float uShare;
uniform float uGain;
varying vec3 vColour;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
  vec4 b = texture2D( uBins, aSky.xy / ( uBinDeg * uBins_n ) + 0.5 );
  float cov = b.b;
  float keep = uShare * ( 1.0 - uPhoto * cov );
  // the size: its radius over its distance, on the screen; held no wider than ${SHAPE.patchMaxPx} px (close up it gives up its light)
  float d = max( 1e-3, length( position - uCam ) );
  float ideal = 2.0 * aSky.z / d * uPxPerRad;
  float s = clamp( ideal, ${SHAPE.patchMinPx.toFixed(2)}, ${SHAPE.patchMaxPx.toFixed(2)} );
  // its colour: beyond the photograph the maps' light in its population's colour; where the photograph covers the sky,
  // ITS light there, shared by the two populations in proportion to their counts
  vec3 c = aCol.rgb * uMapLight;
  if ( uLook.w > 0.5 && cov > 0.002 ) {
    vec2 sky = aSky.xy;
    vec2 puv = uPicC + vec2( dot( uPicM.xy, sky ), dot( uPicM.zw, sky ) );
    vec3 t = max( texture2D( uPic, puv ).rgb - uLook.z, 0.0 ) / ( 1.0 - uLook.z );
    vec3 p = pow( t, vec3( uLook.x ) );
    float l = dot( p, vec3( 0.2126, 0.7152, 0.0722 ) );
    p = mix( vec3( l ) * vec3( 0.86, 0.96, 1.0 ), p, uLook.y );
    float wsum = uPopA.x * b.r * b.r + uPopB.x * b.g * b.g;
    c = mix( c, p / max( wsum, 1e-3 ), cov );
  }
  float a = aCol.w * keep * uGain * min( 1.0, ( ideal * ideal ) / ( s * s ) );
  // too faint for the framebuffer's 8 bits: drawn at the floor, by chance in proportion (spiral.js's rule)
  float lum = a * max( c.r, max( c.g, c.b ) );
  if ( lum < 0.004 ) a = fract( float( gl_VertexID ) * 0.6180339887 ) * 0.004 < lum ? a * 0.004 / max( lum, 1e-6 ) : 0.0;
  vColour = c * a;
  gl_PointSize = mv.z < 0.0 && a > 0.0 ? s * uPixelRatio : 0.0;
  if ( a <= 0.0 ) gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );
}
`;
const PATCH_FRAG = /* glsl */ `
varying vec3 vColour;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  vec2 q = gl_PointCoord - vec2( 0.5 );
  float r2 = dot( q, q );
  if ( r2 > 0.25 ) discard;
  gl_FragColor = vec4( vColour * exp( -r2 / ${(2 * PATCH_SIGMA * PATCH_SIGMA).toFixed(4)} ), 1.0 );
}
`;
const STAR_VERT = /* glsl */ `
attribute vec4 aCol;        // colour; w: flux, relative to the record's distance
uniform vec3 uCam;
uniform float uD;
uniform float uR;           // the galaxy's radius, object units: a point stands for its share of the galaxy's face
uniform float uPxPerRad;    // CSS px a radian on the screen
uniform float uPixelRatio;
uniform float uShare;
uniform float uGain;
uniform float uPhoto;
uniform sampler2D uBins;
uniform float uBinDeg;
uniform float uBins_n;
varying vec3 vColour;
varying float vAlpha;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
  float d = max( 1e-3, length( position - uCam ) );
  // A point's light is its share of the galaxy's surface brightness spread over the galaxy's face as seen from here:
  // it falls as 1 / d^2, so the summed light per pixel does not change with distance; close up it gets SMALLER (its
  // light in fewer pixels), never larger, and is capped.
  float size = ${SHAPE.sparklePx.toFixed(3)} * clamp( d / 30.0, 0.6, 1.0 );
  float ang = uR / d * uPxPerRad;
  float bright = min( ${SHAPE.sparkleCap.toFixed(3)}, aCol.w * 3.14159265 * ang * ang / ( size * size ) );
  float k = 1.0 / ( uD - position.z ) * 57.29577951;
  vec2 tuv = vec2( -position.x * k, position.y * k ) / ( uBinDeg * uBins_n ) + 0.5;
  float cov = texture2D( uBins, tuv ).b;
  gl_PointSize = mv.z < 0.0 ? size * uPixelRatio : 0.0;
  vColour = aCol.rgb;
  vAlpha = bright * uShare * uGain * ( 1.0 - uPhoto * cov );
}
`;
const STAR_FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  if ( vAlpha <= 0.002 ) discard;
  vec2 c = gl_PointCoord - 0.5;
  float d = length( c );
  float a = exp( -10.0 * d * d ) * ( 1.0 - smoothstep( 0.4, 0.5, d ) );
  if ( a <= 0.003 ) discard;
  gl_FragColor = vec4( vColour * a * vAlpha, 1.0 );
}
`;
export const SHADERS = { bodyVertex: PATCH_VERT, body: PATCH_FRAG, starVertex: STAR_VERT, star: STAR_FRAG };

// -------------------------------------------------------------------------------------- the hero

export function createHero(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'deep-hero-smc';
  const profile = isOurs(env.profile) ? env.profile : PROFILE;
  const g = geometryOf(profile);
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;
  function placeSky() {
    const rec = env.record;
    basisFor = stage.worldId;
    if (!rec || !rec.pos) return;
    const f = skyFrame(rec.pos);
    const c = new THREE.Vector3(), tip = new THREE.Vector3();
    if (!stage.toSceneInto(rec.pos, 'sun-inertial', c, stage.tMs)) return;
    const k = 1e12;
    const dir = (v) => {
      stage.toSceneInto({ x: rec.pos.x + v[0] * k, y: rec.pos.y + v[1] * k, z: rec.pos.z + v[2] * k }, 'sun-inertial', tip, stage.tMs);
      return tip.clone().sub(c).normalize();
    };
    const x = dir(f.west), y = dir(f.north);
    const z = new THREE.Vector3().crossVectors(x, y).normalize();
    y.crossVectors(z, x).normalize();
    sky.matrix.makeBasis(x, y, z);
    sky.matrixWorldNeedsUpdate = true;
  }

  // --- the light (the photograph without its stars and the globulars in front: scripts/build_deep_smc.py --light, in the
  // photograph's own frame, scene/nebulae.js's row) and the maps
  const row = PICTURE_FOR.get('dso-smc') || null;
  let picTex = null, picState = 'none', mapsState = 'none', binTex = null, maps = null;
  const browser = typeof document !== 'undefined';
  if (browser && THREE.TextureLoader && row) {
    picState = 'loading';
    picTex = new THREE.TextureLoader().load(LIGHT_URL.href, () => { picState = 'ready'; }, undefined, () => { picState = 'failed'; });
    picTex.colorSpace = THREE.NoColorSpace;
    picTex.wrapS = picTex.wrapT = THREE.ClampToEdgeWrapping;
  }
  const blank = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
  blank.needsUpdate = true;
  const u = {
    uCam: { value: new THREE.Vector3(0, 0, 4000) }, uBins: { value: blank }, uPicC: { value: new THREE.Vector2(0.5, 0.5) }, uPicM: { value: new THREE.Vector4() }, uPic: { value: picTex || blank },
    uBinDeg: { value: g.binDeg }, uBins_n: { value: g.bins },
    uPopA: { value: new THREE.Vector4(g.pops[0].weight, g.pops[0].z0, g.pops[0].a, g.pops[0].b) },
    uPopB: { value: new THREE.Vector4(g.pops[1].weight, g.pops[1].z0, g.pops[1].a, g.pops[1].b) },
    uMapLight: { value: SHAPE.mapLight }, uLook: { value: new THREE.Vector4(1, 1, Math.min(0.5, Math.max(0, Number(row && row.sky_floor) || 0)), 0) },
    uPhoto: { value: 0 }, uPxPerRad: { value: 900 }, uPixelRatio: { value: 1 }, uShare: { value: 0 }, uGain: { value: 1 },
  };
  // 0077 W3-f: the unresolved light as patches (one Points draw), built with the stars once the maps have landed
  const bodyMat = new THREE.ShaderMaterial({ vertexShader: PATCH_VERT, fragmentShader: PATCH_FRAG, uniforms: u, transparent: false, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  bodyMat.name = 'deep-smc-body';
  let body = null, patchCount = 0, patchBytes = 0;
  function buildPatches(tier) {
    if (!maps) return;
    if (body) { sky.remove(body); body.geometry.dispose(); }
    const P = patchesOf(g, maps, tier);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P.pos, 3));
    geo.setAttribute('aCol', new THREE.Float32BufferAttribute(P.col, 4));
    geo.setAttribute('aSky', new THREE.Float32BufferAttribute(P.sky, 4));
    body = new THREE.Points(geo, bodyMat);
    body.name = `${group.name}-patches`;
    body.renderOrder = -0.97;
    body.frustumCulled = false;
    sky.add(body);
    patchCount = P.n; patchBytes = P.pos.byteLength + P.col.byteLength + P.sky.byteLength;
  }
  const su = { uCam: u.uCam, uD: { value: g.D }, uR: { value: Math.tan(g.fade[0] * D2R) * g.D * 0.6 }, uPxPerRad: u.uPxPerRad, uPixelRatio: u.uPixelRatio, uShare: { value: 0 }, uGain: { value: 1 }, uPhoto: u.uPhoto, uBins: u.uBins, uBinDeg: u.uBinDeg, uBins_n: u.uBins_n };
  const starMat = new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: su, transparent: false, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  starMat.name = 'deep-smc-stars';
  let stars = null, starTier = -1, starCount = 0, starBytes = 0;
  function buildStars(tier) {
    if (!maps || (stars && starTier === tier)) return;
    if (stars) { sky.remove(stars); stars.geometry.dispose(); }
    const s = starsOf(g, maps, tier);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3));
    geo.setAttribute('aCol', new THREE.Float32BufferAttribute(s.col, 4));
    stars = new THREE.Points(geo, starMat);
    stars.name = `${group.name}-stars`;
    stars.frustumCulled = false;
    stars.renderOrder = -0.96;
    sky.add(stars);
    starTier = tier; starCount = s.n; starBytes = s.pos.byteLength + s.col.byteLength;
  }
  const useMaps = (m) => {
    maps = m;
    // the record has no measured ellipse, so scene/nebulae.js fades the photograph by its frame alone (ell null)
    const t = binTextures(g, maps, row, null);
    binTex = new THREE.DataTexture(t.a, t.N, t.N, THREE.RGBAFormat);
    binTex.minFilter = binTex.magFilter = THREE.LinearFilter;
    binTex.wrapS = binTex.wrapT = THREE.ClampToEdgeWrapping;
    binTex.needsUpdate = true;
    if (t.uv) { u.uPicC.value.set(...t.uv.c); u.uPicM.value.set(...t.uv.m); }
    u.uBins.value = binTex;
    mapsState = 'ready';
    buildStars(tierNow);
    buildPatches(tierNow);
  };
  if (browser || env.fetchBin) {
    mapsState = 'loading';
    const load = env.fetchBin || ((url) => fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`)))));
    Promise.resolve().then(() => load(MAP_URL.href)).then((buf) => useMaps(readMaps(buf)))
      .catch((e) => { mapsState = 'failed'; console.warn('deep: the SMC maps did not load', e); });
  }

  let level = 0, levelShare = 0, tierNow = 1, last = { body: 0, stars: 0, light: 1 }, palette = null;
  const _inv = new THREE.Matrix4();
  const _id = new THREE.Matrix4();
  const _cam = new THREE.Vector3();

  return {
    group,
    levels: [2, 3],
    latchSafe: false,
    card: { copy: COPY_BLOCK, drawn: DRAWN },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) placeSky();
      const tier = Number.isFinite(info.tier) ? info.tier : 1;
      if (tier !== tierNow) { tierNow = tier; buildStars(tier); buildPatches(tier); }
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      if (info.camera) {
        if (group.parent) group.parent.updateWorldMatrix(true, false);
        _inv.multiplyMatrices(group.parent ? group.parent.matrixWorld : _id, group.matrix).multiply(sky.matrix).invert();
        _cam.copy(info.camera.position).applyMatrix4(_inv);
        u.uCam.value.copy(_cam);
        u.uPxPerRad.value = (info.camera.projectionMatrix.elements[5] || 1) * vh / 2;
      }
      // inside, or close: the body steps back from 3 core radii in to 1 (look run 2: from 24 000 ly it was a veil); the
      // patches near the camera give up their light besides (held at SHAPE.patchMaxPx)
      const rIn = Math.max(Math.hypot(_cam.x, _cam.y) / g.core[0], Math.abs(_cam.z) / g.core[1]) / 3;
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, viewH: vh, inside: 1 - smooth(rIn, 0.5, 1.2) });
      last = sh;
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (!palette || gain !== palette.gainIn) {
        palette = { ...paletteFor(gain, profile), gainIn: gain };
        u.uLook.value.x = palette.gamma; u.uLook.value.y = palette.saturation;
      }
      u.uLook.value.w = picState === 'ready' ? 1 : 0;
      const keep = drawnUnder(info.look || 'film', UNDER_MEASURED.light) ? 1 : 0;
      const ok = mapsState === 'ready';
      u.uShare.value = ok ? sh.body * keep : 0;
      u.uGain.value = palette.gain * sh.light;
      u.uPhoto.value = clamp(Number(info.photo) || 0, 0, 1);
      su.uShare.value = ok ? sh.stars : 0;
      su.uGain.value = palette.gain * sh.light;
      u.uPixelRatio.value = (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1;
      if (body) body.visible = u.uShare.value > 0.002;
      if (stars) stars.visible = su.uShare.value > 0.002;
    },
    ready: () => mapsState !== 'loading' && picState !== 'loading',
    stats: () => ({
      level, body: Math.round(last.body * 100) / 100, stars: Math.round(last.stars * 100) / 100, light: Math.round(last.light * 100) / 100,
      maps: mapsState, photo: picState, tier: tierNow, palette: palette ? palette.mode : null, points: starCount, patches: patchCount, meshes: 2,
      bytes: starBytes + patchBytes + (binTex ? g.bins * g.bins * 4 : 0),
      camKly: [Math.round(_cam.x) / 10, Math.round(_cam.y) / 10, Math.round(_cam.z) / 10],
    }),
    dispose() {
      if (stars) stars.geometry.dispose();
      if (body) body.geometry.dispose();
      bodyMat.dispose(); starMat.dispose();
      for (const t of [binTex, picTex]) if (t) t.dispose();
      blank.dispose();
      stars = null; body = null;
      if (group.parent) group.parent.remove(group);
    },
  };
}
