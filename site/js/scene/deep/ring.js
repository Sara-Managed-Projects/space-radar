// scene/deep/ring.js -- the Ring Nebula (M57, NGC 6720) as a hero (internal spec 0076 stage W3-b, #872): the
// first planetary nebula after the Helix, built from the class's shared part (scene/deep/shellneb.js). Fetched
// by scene/deep/deepsky.js when M57 is near (scene/deep/heroes.js); never at boot. scene/deep/helix.js says
// what a hero answers: createHero(THREE, env) -> { group, levels, setLevel, frame, ready, stats, dispose, card }.
// Pure, for tests/test_hero_ring.mjs: geometryOf, columnsAt, columnMap, columnsFrom, columnJs, knotsOf, paletteFor, samplesFor,
//   sharesFor, SHAPE, SHADERS, UNDER_MEASURED, COPY_BLOCK
//
// ITS SHAPE IS PUBLISHED; ITS LIGHT IS THE PHOTOGRAPH'S.
//   The shape (O'Dell, Ferland, Henney & Peimbert 2013, AJ 145, 92, "ODFHP13"; the press release heic1310 of
//   the same data: "a distorted doughnut" with "a rugby ball slotted into the doughnut's central gap"):
//   * THE MAIN RING, a thick disc nearly in the plane of the sky: its ionisation boundary 44″ along the
//     apparent major axis (PA 60°) and 30″ along the minor, the major axis tilted 13.5° with its NE end near
//     (the SW tip is redshifted). Inside it a cavity. Its thickness is not given: an illustration.
//   * THE LOBES, "pointed almost at the observer", in the cavity: one prolate spheroid along the disc's axis,
//     as wide as the cavity and 59″ long each way (the polar semi-axis of O'Dell, Sabbadin & Henney 2007). The
//     paper has "no evidence about the form of the Lobes": their form is an illustration.
//   * THE INNER HALO, its loops "almost all of them within 65″" of the star: a thick spherical shell round the
//     ring out to 62″, the edge of the photograph's light. The outer halo (115″) is outside the photograph and
//     is not drawn.
//   Lengths are the paper's arcseconds at OUR distance (the record's), so the size on the sky is the measured one.
//   The light: the Hubble photograph the app shows (heic1310a, NASA, ESA and C. R. O'Dell, CC BY 4.0), its stars
//   taken out (scripts/build_deep_ring.py -> images/deep/ring/ring-light.webp). Each sky point's light is spread
//   along OUR line through the three layers in proportion to their density there (a weight per layer; the
//   disc's density exp(-u⁴) through its thickness, the lobes and the halo even), divided by that line's own
//   column of density, found exactly per sky point (columnsAt): so FROM OUR SIDE THE MODEL IS THE PHOTOGRAPH,
//   whatever the steps, and turned it is the same structure foreshortened: the ring a band, the blue cavity's
//   light a rugby ball along the axis, the orange fringe a faint halo round both.
//   The knots: ODFHP13 finds dark knots of about 0.2″ (150 au) near the ionisation boundaries; Wesson et al.
//   2024 count some 20 000 globules in the bright shell. We draw a seeded SAMPLE of 150 to 1 000 in the outer
//   part of the ring, at least 2.2 px wide with their darkness exaggerated (the registry says so). The white
//   dwarf: about 135 000 K (Sahai et al. 2025, of published 101 000 to 162 000 K).
//
// HOW IT IS DRAWN (no pass, no render target, no bloom). Three meshes, three draw calls, in the SKY FRAME (x
// west, y north, z toward the Sun, light-years about the star):
//   gas    one bounding sphere drawn by its back faces. For each layer the fragment finds the part of the view
//          ray inside it EXACTLY (the disc's slab and ellipses, the spheroid, the shell: shellneb.js layerSpan,
//          quadSpan, shellSpan) and spends its samples only there; the disc's steps carry their profile's exact
//          integral (shellneb.js slabIntegral, the front of spec 0075 task 45). Each layer emits and absorbs its
//          own light a little (compensated on our line, as the Helix's rings), so edge on the ring keeps its
//          colour and does not add up to white. Samples: 4 a layer on T0, 8 at level 2, half the march's above.
//   knots  one instanced quad per knot (shellneb.js): a dark head, a bright cusp toward the star, a short tail.
//   star   the white dwarf: a point of a few pixels with a soft halo in its material.
// The photograph is the truth from our side: the gas and the knots give way to it by its own share (info.photo),
// so on our line of sight the Hubble picture is drawn, and 25 to 50° off it the reconstruction takes over.
//
// 0078 r14-neb-b: begin
// EVERY RING-LIKE PLANETARY, NOT ONLY M57 (release 1.4.0 stage r14-neb-b). The module reads its hero's own profile
// (env.profile: registry/deepsky-heroes/<id>.yaml): the light map (`light.file`, its photograph's row `light.row` and
// its `peak`), the ring, the lobes and the halo, the knots' count and seed, the star's colour. Two options the Dumbbell
// (M27, a thick equatorial ring seen nearly EDGE ON) needs and M57 does not: `disc.in_plane` (the semi-axes are the
// ring's own radii in its plane, not the apparent ones) and `disc.window: point` (the ring's window is read at each
// point's own radius in the disc's plane, not where our line crosses its middle plane: edge on, our line runs along
// the plane). The halo carries light when its weight is above 0 (the Southern Ring's molecular halo), in a third
// loop. And since the photographs are no longer drawn on the sky (Ivan, 2026-10-26: "no photos only realistic 3ds"),
// T0 draws the model too (one step a layer at its middle), unless a profile sets `frame.min_tier`.
// 0078 r14-neb-b: end
//
// LOOKS. The light is shown with the exposure's own stretch, as the photograph is. The photograph's colours are
// NARROWBAND (helium, oxygen, hydrogen, nitrogen and sulphur filters given colours by ESA/Hubble): not what an
// eye sees, under every look, and the registry says so. Nothing moves, under any look: the expansion (19 and
// 34 km/s) is a few milliarcseconds a year, and nothing here is generated to move.

import { drawnUnder } from '../exposure.js';
import { HERO as PROFILE } from '../../data/hero-m57.js';
import { NEBULAE } from '../../data/nebulae.js';
import {
  D2R, AU_LY, norm, cross, dot, smooth, f3, ringAxis, skyDir, uvOf, uvAt, layerSpan, quadSpan, shellSpan, spanLen, spanT,
  slabIntegral, quarticCdf, paletteOf, sharesOf, samplesOf, viewSize, seeded, GLSL, SHELL_SHADERS, shellMaterial, skyPlacer,
  starMesh, knotMaterial, knotMesh, lightTexture, QUAD_BYTES,
} from './shellneb.js';

export const UNDER_MEASURED = { knots: 'same', drift: 'still' };
export const COPY_BLOCK = 'deepRing';
export const DRAWN = ['reconstruction'];

const MAX_N = 24;          // samples a layer at most (48 march steps at Ultra)
const KNOTS_BY_TIER = [150, 600, 1000];
const LIGHT_URL = '../../../images/deep/ring/ring-light.webp';
const LIGHT_SIZE = [512, 512];
// 0078 r14-neb-b: begin (each profile's own light map and its photograph's row)
// The light is the profile's `part: light` layer (the generator mirrors `layers`, not a top-level `light:`); M57's
// profile has none and keeps W3-b's map.
const lightOf = (P) => (P && Array.isArray(P.layers) && P.layers.find((l) => l && l.part === 'light')) || (P && P.light) || null;
/** The light map's URL, relative to this module, from the light layer's `file` (M57's when there is none). Pure. */
export const lightUrlOf = (P) => { const L = lightOf(P); return L && L.file ? `../../../${String(L.file).replace(/^site\//, '')}` : LIGHT_URL; };
/** The photograph's row (data/nebulae.js) the light map was baked from: its `row`, M57's by default. Pure. */
export const lightRowOf = (P) => { const L = lightOf(P); return NEBULAE.find((r) => r.id === ((L && L.row) || 'm57')) || null; };
/** The light map's brightest luminance (its manifest's peak_lum_p99): its `peak`, else SHAPE.peak (M57's). Pure. */
export const peakOf = (P) => { const L = lightOf(P); return L && Number(L.peak) > 0 ? Number(L.peak) : SHAPE.peak; };
/** The light map's size in pixels (its `size`), for the GPU estimate. Pure. */
export const lightSizeOf = (P) => { const L = lightOf(P); return L && Array.isArray(L.size) ? L.size : LIGHT_SIZE; };
/** The tier below which the model is not drawn (`frame.min_tier`, 0 by default since r14-neb-b). Pure. */
export const minTierOf = (P) => (P && P.frame && Number.isFinite(Number(P.frame.min_tier)) ? Number(P.frame.min_tier) : 0);
// 0078 r14-neb-b: end
// The shape of the light inside the layers. ONE table: the GLSL below is written from it.
export const SHAPE = {
  slab: 1.6,                // the disc's box reaches 1.6 of its half-thickness: exp(-1.6⁴) is 0.15 % of its middle
  edge: 0.1,                // the disc's window across the ring rises and falls over this, in the ring's radii, either side
  outer: 1.08,              // and falls about here: the ionisation boundary's bright rim and its fringe belong to the ring
  boundQ: 1.26,             // the bounding ellipsoid reaches this far across the ring (its window and a little of its lean)
  nearFade: 0.3,            // gas nearer the camera than this (in the lobes' length) fades out: from inside, stars through the cavity
  insideFloor: 0.15,        // and what is left of the gas's light with the camera deep in the cavity (the lobes' wall)
  lean: 0.15,               // the disc's box reaches this much further: its walls run along our line, which leans 13.5° off its axis
  kappa: 2.0,               // self-absorption: optical depth per unit of the light's luminance (edge on, not white)
  knee: 0.8,                // one soft knee over the brightest channel, hue kept
  minColumn: 1e-5,          // a sky point whose line crosses (almost) nothing keeps its light off the model
  exposure: 1.0,            // the whole, against the photograph's own levels (its light IS the photograph's)
  adapt: 0.3,               // what is left of its light when it fills the view (the eye's adaptation; inside, a third)
  peak: 0.777,              // the photograph's brightest luminance (its light map's 99th percentile: manifest.json peak_lum_p99)
};

// --------------------------------------------------------------------------------- the geometry

const rows3 = (a, b, c) => [a, b, c];
const scaled = (v, k) => [v[0] * k, v[1] * k, v[2] * k];

/** The profile's numbers in light-years, about the white dwarf, in the sky frame. Pure. */
export function geometryOf(profile = PROFILE) {
  const P = profile && Array.isArray(profile.layers) && profile.layers.some((l) => l && l.part === 'disc') ? profile : PROFILE;
  const fr = P.frame || {};
  const dist = Number(fr.distance_ly) || 2700;
  const ly = (arcsec) => (Number(arcsec) || 0) * dist * Math.PI / 648000;
  const part = (k) => P.layers.find((l) => l && l.part === k) || {};
  const disc = part('disc'), lobes = part('lobes'), halo = part('halo'), knots = part('knots'), star = part('star');
  const tilt = Number(disc.tilt_deg) || 0;
  const a = ringAxis(tilt, Number(disc.near_pa_deg) || 0);
  // The apparent major axis (PA major_pa_deg) is the tilted one: lifted into the disc's plane, its length is the
  // apparent one over cos(tilt), so that seen from here the ring's outline is the photograph's ellipse.
  const m = skyDir(Number(disc.major_pa_deg) || 0);
  const e1 = norm([m[0] - a[0] * dot(m, a), m[1] - a[1] * dot(m, a), m[2] - a[2] * dot(m, a)]);
  const e2 = cross(a, e1);
  // 0078 r14-neb-b: `in_plane` gives the ring's own radii in its plane (an edge-on ring's apparent minor axis is its thickness)
  const inPlane = !!disc.in_plane;
  const A = ly(disc.semi_major_arcsec) / (inPlane ? 1 : Math.cos(tilt * D2R)), B = ly(disc.semi_minor_arcsec), H = ly(disc.thickness_arcsec / 2);
  const qIn = Number(disc.inner_q) || 0.5;
  const cq = Number(lobes.equator_q) || qIn, Lp = ly(lobes.polar_semi_axis_arcsec);
  const Ri = ly(halo.inner_arcsec), Ro = ly(halo.outer_arcsec);
  const row = lightRowOf(P) || { ra_deg: 283.39685, dec_deg: 33.02893, width_arcmin: 2.1, height_arcmin: 2.1, north_deg: 11.2 };
  const g = {
    distanceLy: dist, axis: a, e1, e2, A, B, H, qIn, tiltDeg: tilt,
    // 0078 r14-neb-b: an edge-on ring's window is read at the point, over a softer edge of its own (`disc.edge`, in the
    // ring's radii): its rim runs deep along our line, and a ray a few degrees off it must not cross the rim in one step
    point: disc.window === 'point', round: disc.window === 'point' && disc.round === true, edgeP: Math.max(SHAPE.edge, Number(disc.edge) || SHAPE.edge),
    lean: disc.window === 'point' ? Math.max(SHAPE.edge, Number(disc.edge) || SHAPE.edge) - SHAPE.edge : SHAPE.lean,
    // the disc in its own scaled frame: (x/A, y/B) round, z in half-thicknesses
    Sd: rows3(scaled(e1, 1 / A), scaled(e2, 1 / B), scaled(a, 1 / H)),
    // the lobes: a spheroid as wide as the cavity (cq of the ring's ellipse) and Lp along the axis
    Sl: rows3(scaled(e1, 1 / (cq * A)), scaled(e2, 1 / (cq * B)), scaled(a, 1 / Lp)), Lp, cq,
    // the inner halo: a shell between two spheres
    So: rows3([1 / Ro, 0, 0], [0, 1 / Ro, 0], [0, 0, 1 / Ro]), Si: rows3([1 / Ri, 0, 0], [0, 1 / Ri, 0], [0, 0, 1 / Ri]), Ri, Ro,
    w: [Number(disc.weight ?? 1), Number(lobes.weight ?? 1), Number(halo.weight ?? 0)],
    uv: uvOf(row, [Number(fr.ra_deg) || 283.39587, Number(fr.dec_deg) || 33.02858], dist),
    knots: {
      qFrom: Number(knots.q_from) || 0.72, qTo: Number(knots.q_to) || 1.0,
      head: (Number(knots.head_au) || 150) / 2 * AU_LY, tail: (Number(knots.tail_au) || 300) * AU_LY,
      count: knots.count_drawn || KNOTS_BY_TIER, minPx: Number(knots.min_px) || 2.2,
      seed: Number(knots.seed) || 6720, // 0078 r14-neb-b
    },
    starK: Number(star.temp_k) || 135000,
  };
  // THE BOUNDING ELLIPSOID (an early exit for every ray that misses it): round the disc's box out to boundQ of its
  // ellipse and the lobes' length; the halo's sphere only while it carries light (its weight is 0 since 0076 W3-b's
  // second look: the fringe is the disc's window, and the halo's grain and cost went with it).
  const c1 = Math.max(Lp, SHAPE.slab * H) * 1.02;
  const kk = 1 / Math.sqrt(Math.max(0.05, 1 - (SHAPE.slab * H / c1) ** 2));
  const bq = g.point ? Math.max(SHAPE.boundQ, SHAPE.outer + g.edgeP + 0.05) : SHAPE.boundQ; // 0078 r14-neb-b: its softer rim inside
  g.bA = bq * A * kk; g.bB = bq * B * kk; g.bC = c1;
  if (g.w[2] > 0) { g.bA = Math.max(g.bA, Ro); g.bB = Math.max(g.bB, Ro); g.bC = Math.max(g.bC, Ro); }
  g.Sb = rows3(scaled(e1, 1 / g.bA), scaled(e2, 1 / g.bB), scaled(a, 1 / g.bC));
  g.bound = Math.max(g.bA, g.bB, g.bC);
  return g;
}

// ------------------------------------------------------------ the layers along a ray (mirrored in GLSL)
//
// Each layer's density is SOFT, so that no surface of it (and no jump in a line's column) shows as a seam when
// the nebula is turned, and each is integrated along a ray in closed form, step by step:
//   disc   exp(-u⁴) through its thickness (crisp faces, integrated exactly: the front of spec 0075 task 45),
//          times a window across the ring's ellipse, from the cavity's edge to the ionisation boundary
//          (`edge` either side), read where our line through the point crosses the disc's middle plane: the
//          ring's walls run along our line (13.5° from its axis), so the window is constant along our line
//   lobes  1 - s² inside the spheroid (s its ellipsoidal radius): a quadratic along any ray, integrated exactly
//   halo   (r² - Ri²)(Ro² - r²) between its two spheres, normalised to 1 at its middle: a quartic along any
//          ray, integrated exactly
// Along our line the lobes' and the halo's columns are exact and the disc's is its window at its middle
// times its exact slab integral, so from our side the model is the photograph whatever the steps.

const mul = (S, v) => [dot(S[0], v), dot(S[1], v), dot(S[2], v)];
const Z = [0, 0, 1];
const windowOf = (g, q) => smooth(q, g.qIn - SHAPE.edge, g.qIn + SHAPE.edge) * (1 - smooth(q, SHAPE.outer - SHAPE.edge, SHAPE.outer + SHAPE.edge));
/** The disc's window at sky point (x, y): where our line through it crosses the disc's middle plane. Pure. */
function windowAt(g, x, y) {
  const q0 = mul(g.Sd, [x, y, 0]), qz = [g.Sd[0][2], g.Sd[1][2], g.Sd[2][2]];
  const z = -q0[2] / qz[2];
  return windowOf(g, Math.hypot(q0[0] + qz[0] * z, q0[1] + qz[1] * z));
}

// 0078 r14-neb-b: begin
/** `window: point`: the ring's window at the point's own radius in the disc's plane (an edge-on ring). Pure. */
function windowPoint(g, p) {
  const q = Math.hypot(...mul(g.Sd, p).slice(0, 2)), e = g.edgeP || SHAPE.edge;
  return smooth(q, g.qIn - e, g.qIn + e) * (1 - smooth(q, SHAPE.outer - e, SHAPE.outer + e));
}
/**
 * `round: true` (lead review of #1298, the Southern Ring): the ring's cross-section an ellipse, not a slab with crisp faces:
 * its half-thickness shrinks toward its inner and outer rims as sqrt(1 - ((q - mid) / half-width)^2), so seen from the side
 * it is a torus, never a box. 1 for a ring without it. Pure; GLSL tubeOf() is the same.
 */
export function tubeAt(g, q) {
  if (!g.round) return 1;
  const mid = (g.qIn + SHAPE.outer) / 2, hw = (SHAPE.outer - g.qIn) / 2 + (g.edgeP || SHAPE.edge);
  const u = (q - mid) / hw;
  return Math.sqrt(Math.max(0.04, 1 - u * u));
}
/** An edge-on (`window: point`) ring's density at point p: its window there, its quartic profile across the tube. Pure. */
function pointDensity(g, p) {
  const d = mul(g.Sd, p);
  const z = d[2] / tubeAt(g, Math.hypot(d[0], d[1]));
  return windowPoint(g, p) * Math.exp(-(z ** 4));
}
/** The disc's window for a step at point p of a ray: along our line (M57's) or at the point (`window: point`). Pure. */
const windowFor = (g, p) => (g.point ? windowPoint(g, p) : windowAt(g, p[0], p[1]));
// 0078 r14-neb-b: end
/** The disc's span along a ray: in its scaled frame the ellipses are circles (t keeps its meaning). Pure. */
function discSpan(g, ro, rd, t0, t1) {
  const lean = g.lean === undefined ? SHAPE.lean : g.lean; // 0078 r14-neb-b
  return layerSpan(mul(g.Sd, ro), mul(g.Sd, rd), Z, SHAPE.slab, Math.max(0, g.qIn - SHAPE.edge - lean), SHAPE.outer + SHAPE.edge + lean, t0, t1);
}
/** A quadric's quadratic along a ray, about its point of closest approach: s² = a·τ² + b2, τ = t - tc. Pure. */
function quadAlong(S, ro, rd) {
  const q0 = mul(S, ro), qd = mul(S, rd);
  const A = dot(qd, qd), B = dot(q0, qd), C = dot(q0, q0);
  return A > 1e-12 ? { a: A, tc: -B / A, b2: C - B * B / A } : { a: 0, tc: 0, b2: C };
}
/**
 * ∫ 4 s² (1 - s²) dτ from 0 to τ, s² = a·τ² + b2 (the lobes: a WALL, densest half-way out, empty at the middle
 * and at the surface, so that from inside the camera sits in a hollow and not in the brightest gas). Pure.
 */
function lobeF(L, tau) {
  const t2 = tau * tau, a = L.a, b2 = L.b2;
  const s2 = a * t2 * tau / 3 + b2 * tau;                                  // ∫ s²
  const s4 = a * a * t2 * t2 * tau / 5 + 2 * a * b2 * t2 * tau / 3 + b2 * b2 * tau; // ∫ s⁴
  return 4 * (s2 - s4);
}
/** ∫ (r² - Ri²)(Ro² - r²) / n0 dτ from 0 to τ, r² = τ² + ρ² (the halo). Pure. */
function haloF(g, rho2, tau) {
  const t2 = tau * tau, ri2 = g.Ri * g.Ri, ro2 = g.Ro * g.Ro;
  const n0 = ((ro2 - ri2) / 2) ** 2;
  const p1 = t2 * tau / 3 + rho2 * tau;                                   // ∫ r²
  const p2 = t2 * t2 * tau / 5 + 2 * rho2 * t2 * tau / 3 + rho2 * rho2 * tau; // ∫ r⁴
  return (-p2 + (ri2 + ro2) * p1 - ri2 * ro2 * tau) / n0;
}
/** A step [a, b] of span coordinates through a span's pieces, as t-intervals, each given to `fn(ta, tb)`. Pure. */
function stepSum(s, a, b, fn) {
  if (!s || !(b > a)) return 0;
  const l1 = Math.max(0, s[1] - s[0]);
  let sum = 0;
  if (a < l1) sum += fn(s[0] + a, s[0] + Math.min(b, l1));
  if (b > l1) sum += fn(s[2] + Math.max(a, l1) - l1, s[2] + b - l1);
  return sum;
}

/**
 * Each layer's column of density along OUR line at sky point (x, y) (light-years): [disc, lobes, halo]. The light
 * of (x, y) is spread in proportion to w·column. Pure; GLSL columnsAt() is the same arithmetic.
 */
export function columnsAt(g, x, y) {
  const ro = [x, y, 2 * g.bound], rd = [0, 0, -1];
  const qd = mul(g.Sd, rd);
  let disc;
  if (g.point) {
    // 0078 r14-neb-b: the window changes along our line: the disc's density summed over its span (the midpoint rule
    // at 160 steps; the GLSL's steps are the same density at their jittered points)
    const s = discSpan(g, ro, rd, 0, 4 * g.bound);
    const L = spanLen(s), n = 160;
    disc = 0;
    if (L > 0) for (let i = 0; i < n; i++) {
      const t = spanT(s, (i + 0.5) * L / n);
      const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
      disc += pointDensity(g, p) * L / n;
    }
  } else disc = windowAt(g, x, y) * 2 * quarticCdf(SHAPE.slab) / Math.abs(qd[2]);
  const L = quadAlong(g.Sl, ro, rd);
  const lobes = L.b2 < 1 && L.a > 0 ? 2 * lobeF(L, Math.sqrt((1 - L.b2) / L.a)) : 0;
  const rho2 = x * x + y * y;
  const zo = rho2 < g.Ro * g.Ro ? Math.sqrt(g.Ro * g.Ro - rho2) : 0, zi = rho2 < g.Ri * g.Ri ? Math.sqrt(g.Ri * g.Ri - rho2) : 0;
  const halo = 2 * (haloF(g, rho2, zo) - haloF(g, rho2, zi));
  return [disc, lobes, Math.max(0, halo)];
}

/**
 * The columns tabulated once, when the hero is built: COLUMN_MAP x COLUMN_MAP sky points over the bound's square,
 * [disc, lobes, halo] per point (texel centres), so the fragment reads one texture where it would solve three
 * quadrics a sample. The columns are smooth by construction (the layers are soft), so a bilinear read is close:
 * tests/test_hero_ring.mjs holds the column on our line to the photograph through this map. Pure.
 */
export const COLUMN_MAP = 192;
export function columnMap(g, n = COLUMN_MAP) {
  const data = new Float32Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const c = columnsAt(g, ((i + 0.5) / n - 0.5) * 2 * g.bound, ((j + 0.5) / n - 0.5) * 2 * g.bound);
    data.set([c[0], c[1], c[2], 1], 4 * (j * n + i));
  }
  return { n, data, extent: g.bound };
}
/** The map read bilinearly at sky point (x, y), as the GPU's linear filter reads it (clamped at the edges). Pure. */
export function columnsFrom(map, x, y) {
  const n = map.n;
  const fx = Math.min(n - 1, Math.max(0, (x / (2 * map.extent) + 0.5) * n - 0.5)), fy = Math.min(n - 1, Math.max(0, (y / (2 * map.extent) + 0.5) * n - 0.5));
  const i0 = Math.floor(fx), j0 = Math.floor(fy), i1 = Math.min(n - 1, i0 + 1), j1 = Math.min(n - 1, j0 + 1), ax = fx - i0, ay = fy - j0;
  const at = (i, j, c) => map.data[4 * (j * n + i) + c];
  return [0, 1, 2].map((c) => (at(i0, j0, c) * (1 - ax) + at(i1, j0, c) * ax) * (1 - ay) + (at(i0, j1, c) * (1 - ax) + at(i1, j1, c) * ax) * ay);
}
/**
 * Samples a layer from the coordinator's n: the disc 0.75 of it, the lobes 0.4 (their light is smooth along a ray), the
 * halo a half (it carries light only while its weight is above 0). On T0 n is 1: one step a layer at its middle. Each step's density is integrated exactly, so fewer steps
 * mean grain, never a wrong column. GLSL main() takes the same. Pure.
 */
export const layerSamples = (n) => [Math.max(1, Math.round(n * 0.75)), Math.max(1, Math.round(n * 0.4)), Math.max(1, Math.round(n / 2))]; // 0078 r14-neb-b: the halo half (it carries light only in the Southern Ring and the Dumbbell, where a quarter was grain)
export const haloSamples = (n) => layerSamples(n)[2];

/** Each layer's spans along a ray, and the step integral of its density over span coordinates [a, b]. Pure. */
function layersAlong(g, ro, rd, t0, t1) {
  const q0 = mul(g.Sd, ro), qd = mul(g.Sd, rd);
  const L = quadAlong(g.Sl, ro, rd);
  const tc = -dot(ro, rd), rho2 = Math.max(0, dot(ro, ro) - tc * tc);
  const ls = quadSpan(g.Sl, ro, rd, t0, t1);
  return [
    // 0078 r14-neb-b: with the window at the point (`window: point`), the step is the density AT the sample times the step's
    // length: unbiased under the jitter (the window times the slab's exact integral is not, where both change in one step)
    { s: discSpan(g, ro, rd, t0, t1), step: (s, a, b, p) => (g.point ? pointDensity(g, p) * (b - a) : windowAt(g, p[0], p[1]) * slabIntegral(s, a, b, q0[2], qd[2])) },
    { s: ls ? [ls[0], ls[1], ls[1], ls[1]] : null, step: (s, a, b) => stepSum(s, a, b, (ta, tb) => lobeF(L, tb - L.tc) - lobeF(L, ta - L.tc)) },
    { s: shellSpan(g.So, g.Si, ro, rd, t0, t1), step: (s, a, b) => stepSum(s, a, b, (ta, tb) => haloF(g, rho2, tb - tc) - haloF(g, rho2, ta - tc)) },
  ];
}

/**
 * The colour along a ray from ro (unit rd): `light(x, y)` -> stretched [r, g, b] (or null outside the picture),
 * n samples a layer, offset j in [0, 1). Returns {rgb} before the share and the gain. FRAG's main(). Pure.
 */
export function columnJs(g, ro, rd, n = 8, j = 0.5, light = () => [0, 0, 0], map = null, peak = SHAPE.peak) {
  const colsAt = map ? (x, y) => columnsFrom(map, x, y) : (x, y) => columnsAt(g, x, y);
  const S = SHAPE;
  const bb = quadSpan(g.Sb, ro, rd, 0, Infinity);
  if (!bb) return { rgb: [0, 0, 0] };
  const [t0, t1] = bb;
  const jit = n <= 1 ? 0.5 : j; // T0: one step a layer, at its middle (no grain)
  const fin = insideOf(g, ro);
  let rgb = [0, 0, 0];
  const layers = layersAlong(g, ro, rd, t0, t1);
  for (let k = 0; k < (g.w[2] > 0 ? 3 : 2); k++) {
    const { s, step } = layers[k];
    const L = spanLen(s);
    if (!(L > 0)) continue;
    const nk = layerSamples(n)[k];
    const dt = L / nk;
    let T = 1;
    for (let i = 0; i < nk; i++) {
      const t = spanT(s, (i + jit) * dt);
      const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
      const lc = light(p[0], p[1]);
      if (!lc) continue;
      const fade = fin * nearOf(g, t);
      const col = colsAt(p[0], p[1]);
      const N = g.w[0] * col[0] + g.w[1] * col[1] + g.w[2] * col[2];
      if (!(N > S.minColumn)) continue;
      const lum = 0.2126 * lc[0] + 0.7152 * lc[1] + 0.0722 * lc[2];
      const share = g.w[k] * col[k] / N; // this layer's part of the sky point's light
      const rhoDt = g.w[k] * Math.max(0, step(s, i * dt, (i + 1) * dt, p)) / N;
      const tau = S.kappa * lum * share;
      const comp = tau > 1e-4 ? tau / (1 - Math.exp(-tau)) : 1;
      const ab = S.kappa * lum * rhoDt;
      const w = ab > 1e-5 ? (1 - Math.exp(-ab)) / (S.kappa * lum) : rhoDt;
      for (let c = 0; c < 3; c++) rgb[c] += T * lc[c] * comp * w * fade;
      T *= Math.exp(-ab);
    }
  }
  rgb = capLight(rgb, peak);
  return { rgb };
}

/**
 * THE CORE NEVER GOES WHITE (photometric discipline): a line through the nebula turned off its axis crosses more
 * of the ring than ours does and the lobes' blue adds to the ring's orange, so the column there could pass the
 * photograph's brightest. Its luminance is held to the photograph's own (SHAPE.peak, the light map's 99th
 * percentile, in the exposure's stretch), colour kept; then one soft knee over the brightest channel. Pure;
 * GLSL capLight() is the same.
 */
export function capLight(rgb, peak = SHAPE.peak) {
  const y = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  let c = y > peak ? rgb.map((x) => x * peak / y) : rgb.slice();
  const m = Math.max(...c), K = SHAPE.knee;
  if (m > K) { const kk = (K + (1 - K) * (1 - Math.exp(-(m - K) / (1 - K)))) / m; c = c.map((x) => x * kk); }
  return c;
}

// ----------------------------------------------------------------------------- tiers, shares, palette

/** Samples a layer: 4 on T0, 8 at level 2, half the march's steps above. Pure. */
export const samplesFor = (o = {}) => (Number(o.tier) >= 1 ? samplesOf(o, MAX_N) : 2); // 0078 r14-neb-b: T0 two a layer, jittered: one at the middle left dark holes on a phone (look run 40443020998), four cost 3x the photograph there (lead review of #1298)
/**
 * From inside the nebula the gas round the camera would fill the view. Its light falls off as the camera goes into
 * the lobes' wall (SHAPE.insideFloor deep in the cavity) and, for every sample, as the sample nears the camera
 * (gone at the camera, whole from nearFade of the lobes' length): from inside, the wall round the camera and
 * stars through the cavity, not fog. From outside both are 1. Pure; GLSL main() takes the same.
 */
export function insideOf(g, cam) {
  const s = Math.hypot(...mul(g.Sl, cam));
  return SHAPE.insideFloor + (1 - SHAPE.insideFloor) * smooth(s, 0.8, 1.5);
}
export const nearOf = (g, dist) => smooth(dist, 0, SHAPE.nearFade * g.Lp);
/** How much of each part draws (shellneb.js sharesOf, with SHAPE.adapt). Pure. */
export const sharesFor = (o = {}) => sharesOf(o, SHAPE.adapt);
/** The exposure's stretch and the knots' and the star's colours (shellneb.js paletteOf). Pure. */
export function paletteFor(gain = 1, profile = PROFILE) {
  const P = profile && profile.colours && profile.colours.lines ? profile : PROFILE;
  return paletteOf(gain, P, { Ha: '#f08a50', star: '#c9d8ff' });
}

/** The knots, seeded, in the outer part of the ring: {pos: Float32Array(3n), knot: Float32Array(4n)}. Pure. */
export function knotsOf(g, n, seed = (g.knots && g.knots.seed) || 6720) {
  const { rand, gauss } = seeded(seed);
  const pos = new Float32Array(3 * n), knot = new Float32Array(4 * n);
  const K = g.knots;
  for (let i = 0; i < n; i++) {
    const phi = 2 * Math.PI * rand();
    // thicker toward the outer edge (the ionisation boundary), as the photograph's dark specks are
    const q = K.qFrom + (K.qTo - K.qFrom) * Math.sqrt(rand());
    const u = Math.max(-1, Math.min(1, gauss() * 0.4));
    const p = [0, 1, 2].map((c) => g.e1[c] * Math.cos(phi) * q * g.A + g.e2[c] * Math.sin(phi) * q * g.B + g.axis[c] * u * g.H);
    pos.set(p, 3 * i);
    // lighter than the Helix's (0.4 to 0.65): on a phone's small view the exaggerated heads read as specks
    knot.set([K.head * (0.6 + 0.8 * rand()), K.tail * (0.4 + 0.6 * rand()), 0.18 + 0.14 * rand(), rand()], 4 * i);
  }
  return { pos, knot };
}

// ------------------------------------------------------------------------------------- the GLSL

const GAS_VERT = /* glsl */ `
varying vec3 vObj;
${GLSL.common}
void main() {
  vObj = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;

const GAS_FRAG = /* glsl */ `
#define MAX_N ${MAX_N}
uniform vec3 uCam;        // the camera in the sky frame, light-years (CPU, float64, each frame)
uniform mat3 uSd;         // the disc's scaled frame (rows: major / A, minor / B, axis / H)
uniform mat3 uSl;         // the lobes' spheroid
uniform vec4 uDisc;       // its box in half-thicknesses, the cavity's edge in the ring's radii, the window's mode (1: at the point), its lean
uniform vec2 uHalo;       // 0078 r14-neb-b: the halo's inner and outer radii (ly)
uniform float uEdgeP;     // 0078 r14-neb-b: an edge-on ring's softer rim (ring.js windowPoint)
uniform vec3 uRound;      // 0078 r14-neb-b: a round ring's tube (ring.js tubeAt): on, middle, half-width
uniform vec3 uW;          // the layers' weights: disc, lobes, halo
uniform vec4 uUv;         // the light map: u0, v0, 1 / W, 1 / H
uniform vec2 uRot;        // and its turn: cos r, sin r (the archive's north)
uniform float uBound;
uniform mat3 uSb;         // the bounding ellipsoid: a ray that misses it is discarded at once
uniform float uJit;       // 1: a per-pixel offset; 0 on T0 (one step a layer, at its middle)
uniform float uInside;    // ring.js insideOf: the gas's light with the camera in the lobes' wall
uniform float uNear;      // ring.js nearOf: the distance over which gas near the camera fades in (ly)
uniform int uN;           // samples a layer
uniform sampler2D uLight; // the photograph without its stars (display values, gasmat.js COLOUR_POLICY)
uniform sampler2D uCols;  // each layer's column along our line, tabulated (ring.js columnMap): disc, lobes, halo
uniform float uColScale;  // 1 / (2 * the map's extent)
uniform float uPeak;      // the photograph's brightest luminance in the exposure's stretch (ring.js capLight)
uniform float uGamma;     // the exposure's stretch, as scene/nebulae.js gives the photograph
uniform float uSat;
uniform float uShare;
uniform float uGain;
varying vec3 vObj;
#include <common>
#include <logdepthbuf_pars_fragment>
${GLSL.layerSpan}${GLSL.pixelHash}${GLSL.front}${GLSL.quadSpan}
// The photograph's colour at sky point (x, y), stretched as the exposure stretches the photograph.
vec3 lightAt( vec2 xy ) {
  vec2 uv = uUv.xy + vec2( xy.x * uRot.x - xy.y * uRot.y, xy.x * uRot.y + xy.y * uRot.x ) * uUv.zw;
  if ( uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0 ) return vec3( 0.0 );
  vec3 c = pow( max( texture2D( uLight, uv ).rgb, vec3( 0.0 ) ), vec3( uGamma ) );
  float y = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  return vec3( y ) + ( c - vec3( y ) ) * uSat;
}
vec4 discSpan( vec3 ro, vec3 rd, float t0, float t1 ) {
  return layerSpan( uSd * ro, uSd * rd, vec3( 0.0, 0.0, 1.0 ), ${f3(SHAPE.slab)}, max( 0.0, uDisc.y - ${f3(SHAPE.edge)} - uDisc.w ), ${f3(SHAPE.outer + SHAPE.edge)} + uDisc.w, t0, t1 );
}
float windowOf( float q ) {
  return smoothstep( uDisc.y - ${f3(SHAPE.edge)}, uDisc.y + ${f3(SHAPE.edge)}, q ) * ( 1.0 - smoothstep( ${f3(SHAPE.outer - SHAPE.edge)}, ${f3(SHAPE.outer + SHAPE.edge)}, q ) );
}
// the disc's window at a sky point: where our line through it crosses the disc's middle plane (ring.js windowAt)
float windowAt( vec2 xy ) {
  vec3 q0 = uSd * vec3( xy, 0.0 );
  vec3 qz = uSd * vec3( 0.0, 0.0, 1.0 );
  float z = -q0.z / qz.z;
  return windowOf( length( q0.xy + qz.xy * z ) );
}
// 0078 r14-neb-b: an edge-on ring's window, at the point's own radius in the disc's plane (ring.js windowPoint)
float windowFor( vec3 p ) {
  if ( uDisc.z < 0.5 ) return windowAt( p.xy );
  float q = length( ( uSd * p ).xy );
  return smoothstep( uDisc.y - uEdgeP, uDisc.y + uEdgeP, q ) * ( 1.0 - smoothstep( ${f3(SHAPE.outer)} - uEdgeP, ${f3(SHAPE.outer)} + uEdgeP, q ) );
}
// 0078 r14-neb-b: a round ring's half-thickness at radius q (ring.js tubeAt): uRound = (on, middle, half-width)
float tubeOf( vec3 p ) {
  if ( uRound.x < 0.5 ) return 1.0;
  float u = ( length( ( uSd * p ).xy ) - uRound.y ) / uRound.z;
  return sqrt( max( 0.04, 1.0 - u * u ) );
}
// 0078 r14-neb-b: the halo, a shell between two spheres: its span (two pieces) and its density's exact integral (ring.js haloF)
vec4 haloSpan( vec3 ro, vec3 rd, float t0, float t1 ) {
  float tc = -dot( ro, rd );
  float r2 = dot( ro, ro ) - tc * tc;
  float ro2 = uHalo.y * uHalo.y, ri2 = uHalo.x * uHalo.x;
  if ( r2 >= ro2 ) return vec4( 0.0 );
  float ho = sqrt( ro2 - r2 );
  float a = max( t0, tc - ho ), b = min( t1, tc + ho );
  if ( b <= a ) return vec4( 0.0 );
  if ( r2 >= ri2 ) return vec4( a, b, b, b );
  float hi = sqrt( ri2 - r2 );
  return vec4( a, max( a, min( b, tc - hi ) ), min( b, max( a, tc + hi ) ), b );
}
float haloF( float rho2, float tau ) {
  float t2 = tau * tau, ri2 = uHalo.x * uHalo.x, ro2 = uHalo.y * uHalo.y;
  float n0 = ( ro2 - ri2 ) * ( ro2 - ri2 ) / 4.0;
  float p1 = t2 * tau / 3.0 + rho2 * tau;
  float p2 = t2 * t2 * tau / 5.0 + 2.0 * rho2 * t2 * tau / 3.0 + rho2 * rho2 * tau;
  return ( -p2 + ( ri2 + ro2 ) * p1 - ri2 * ro2 * tau ) / n0;
}
// a quadric's quadratic along a ray about its closest point: (a, tc, b2), s^2 = a (t - tc)^2 + b2 (ring.js quadAlong)
vec3 quadAlong( mat3 S, vec3 ro, vec3 rd ) {
  vec3 q0 = S * ro;
  vec3 qd = S * rd;
  float A = dot( qd, qd );
  float B = dot( q0, qd );
  float C = dot( q0, q0 );
  return A > 1e-12 ? vec3( A, -B / A, C - B * B / A ) : vec3( 0.0, 0.0, C );
}
float lobeF( vec3 L, float tau ) {
  float t2 = tau * tau;
  float s2 = L.x * t2 * tau / 3.0 + L.z * tau;
  float s4 = L.x * L.x * t2 * t2 * tau / 5.0 + 2.0 * L.x * L.z * t2 * tau / 3.0 + L.z * L.z * tau;
  return 4.0 * ( s2 - s4 );
}
// the step [a, b] of span coordinates through a span's pieces: the lobes' and the halo's exact integrals
float lobeStep( vec4 s, float a, float b, vec3 L ) {
  float l1 = max( 0.0, s.y - s.x );
  float sum = 0.0;
  if ( a < l1 ) sum += lobeF( L, s.x + min( b, l1 ) - L.y ) - lobeF( L, s.x + a - L.y );
  if ( b > l1 ) sum += lobeF( L, s.z + b - l1 - L.y ) - lobeF( L, s.z + max( a, l1 ) - l1 - L.y );
  return sum;
}

// One step of a layer: its light emitted and self-absorbed, compensated so that on our line the column is the
// photograph's (ring.js columnJs). cols: the line's columns at the sample, ck this layer's, st its step integral.
void emitStep( inout vec3 C, inout float T, vec3 lc, vec3 cols, float wk, float ck, float st, float fade ) {
  float N = dot( uW, cols );
  if ( N <= ${SHAPE.minColumn.toExponential(1)} ) return;
  float lum = dot( lc, vec3( 0.2126, 0.7152, 0.0722 ) );
  float share = wk * ck / N;
  float rhoDt = wk * max( 0.0, st ) / N;
  float tau = ${f3(SHAPE.kappa)} * lum * share;
  float comp = tau > 1e-4 ? tau / ( 1.0 - exp( -tau ) ) : 1.0;
  float ab = ${f3(SHAPE.kappa)} * lum * rhoDt;
  float w = ab > 1e-5 ? ( 1.0 - exp( -ab ) ) / ( ${f3(SHAPE.kappa)} * lum ) : rhoDt;
  C += T * lc * comp * w * fade;
  T *= exp( -ab );
}
vec3 colsAt( vec2 xy ) { return texture2D( uCols, xy * uColScale + 0.5 ).rgb; }
// ring.js capLight: the luminance held to the photograph's brightest, then the soft knee
vec3 capLight( vec3 c ) {
  float y = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  if ( y > uPeak ) c *= uPeak / y;
  float mx = max( c.r, max( c.g, c.b ) );
  if ( mx > ${f3(SHAPE.knee)} ) c *= ( ${f3(SHAPE.knee)} + ${f3(1 - SHAPE.knee)} * ( 1.0 - exp( -( mx - ${f3(SHAPE.knee)} ) / ${f3(1 - SHAPE.knee)} ) ) ) / mx;
  return c;
}

void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCam;
  vec3 rd = normalize( vObj - ro );
  // the bounding ellipsoid: an early exit for every ray that misses it
  vec2 bb = quadSpan( uSb, ro, rd, 0.0, 1e9 );
  if ( bb.y <= bb.x ) discard;
  float t0 = bb.x;
  float t1 = bb.y;
  // a static per-pixel offset: grain, never bands, and no temporal state (T0: the middle of each step)
  float j = uJit > 0.5 ? pixelHash( gl_FragCoord.xy ) : 0.5;
  vec3 col = vec3( 0.0 );
  // Two loops, one a layer, each computing only its own integral (one loop with a branch per layer had every step
  // evaluate all of them on a GPU that runs both sides). Samples a layer: ring.js layerSamples.
  // ---- the disc: its profile integrated exactly per step, its window constant along our line
  vec4 s = discSpan( ro, rd, t0, t1 );
  float L = spanLen( s );
  if ( L > 0.0 ) {
    float zq = ( uSd * ro ).z;
    float dzq = ( uSd * rd ).z;
    int nd = max( 1, int( float( uN ) * 0.75 + 0.5 ) );
    float dt = L / float( nd );
    float T = 1.0;
    for ( int i = 0; i < MAX_N; i++ ) {
      if ( i >= nd ) break;
      float t = spanT( s, ( float( i ) + j ) * dt );
      vec3 p = ro + rd * t;
      vec3 cols = colsAt( p.xy );
      // 0078 r14-neb-b: an edge-on ring's step is its density at the sample times the step (ring.js layersAlong)
      float uq = ( zq + dzq * t ) / tubeOf( p );
      float st = uDisc.z > 0.5 ? windowFor( p ) * exp( -uq * uq * uq * uq ) * dt : windowAt( p.xy ) * slabIntegral( s, float( i ) * dt, float( i + 1 ) * dt, zq, dzq );
      emitStep( col, T, lightAt( p.xy ), cols, uW.x, cols.x, st, uInside * smoothstep( 0.0, uNear, t ) );
    }
  }
  // ---- the lobes: a wall, integrated exactly per step
  vec2 l = quadSpan( uSl, ro, rd, t0, t1 );
  if ( l.y > l.x ) {
    s = vec4( l.x, l.y, l.y, l.y );
    vec3 La = quadAlong( uSl, ro, rd );
    int nl = max( 1, int( float( uN ) * 0.4 + 0.5 ) );
    float dt = ( l.y - l.x ) / float( nl );
    float T = 1.0;
    for ( int i = 0; i < MAX_N; i++ ) {
      if ( i >= nl ) break;
      float t = l.x + ( float( i ) + j ) * dt;
      vec3 p = ro + rd * t;
      vec3 cols = colsAt( p.xy );
      float st = lobeStep( s, float( i ) * dt, float( i + 1 ) * dt, La );
      emitStep( col, T, lightAt( p.xy ), cols, uW.y, cols.y, st, uInside * smoothstep( 0.0, uNear, t ) );
    }
  }
  // ---- the halo: only while it carries light (M57's weight is 0: no loop, no cost); a quarter of the samples
  if ( uW.z > 0.0 ) {
    s = haloSpan( ro, rd, t0, t1 );
    float Lh = spanLen( s );
    if ( Lh > 0.0 ) {
      float tc = -dot( ro, rd );
      float rho2 = max( 0.0, dot( ro, ro ) - tc * tc );
      int nh = max( 1, int( float( uN ) * 0.5 + 0.5 ) );
      float dt = Lh / float( nh );
      float T = 1.0;
      for ( int i = 0; i < MAX_N; i++ ) {
        if ( i >= nh ) break;
        float ta = float( i ) * dt, tb = float( i + 1 ) * dt;
        float t = spanT( s, ( float( i ) + j ) * dt );
        vec3 p = ro + rd * t;
        vec3 cols = colsAt( p.xy );
        // the step through the span's pieces (ring.js stepSum)
        float l1 = max( 0.0, s.y - s.x );
        float st = 0.0;
        if ( ta < l1 ) st += haloF( rho2, s.x + min( tb, l1 ) - tc ) - haloF( rho2, s.x + ta - tc );
        if ( tb > l1 ) st += haloF( rho2, s.z + tb - l1 - tc ) - haloF( rho2, s.z + max( ta, l1 ) - l1 - tc );
        emitStep( col, T, lightAt( p.xy ), cols, uW.z, cols.z, st, uInside * smoothstep( 0.0, uNear, t ) );
      }
    }
  }
  col = capLight( col );
  // additive (SRC_ALPHA, ONE): alpha 1 adds the light whole
  gl_FragColor = vec4( col * uGain * uShare, 1.0 );
}
`;

/** The shader sources, for tests/test_hero_ring.mjs (the JS above mirrors GAS_FRAG). */
export const SHADERS = { gasVertex: GAS_VERT, gas: GAS_FRAG, ...SHELL_SHADERS };

// ------------------------------------------------------------------------------------- the hero

const M3 = (THREE, S) => new THREE.Matrix3().set(...S[0], ...S[1], ...S[2]);

/**
 * TIER 0: PHOTOGRAPH ONLY. On T0 (phones) the model is not drawn at all: M57 is drawn as main draws it, its
 * photograph on our line and its holder and point glow off it. The coordinator (deepsky.js) reads the profile's
 * `shipped` every frame and drops a hero that is not, restoring the holder and the glow; so the profile's
 * `shipped` becomes "shipped AND the device's tier is at least `min`", and the record's drawn-by-a-hero stamps
 * (meta.heroDrawn, heroId, heroCopy: what the card says) are taken off while it is not drawn and put back when it
 * is. `shipped` can still be set (the look probe's BEFORE shots set it). A hook in deepsky.js (a hero's own tier
 * floor) would replace this; it is not this stage's file. Pure but for the profile and record it is given.
 */
export function tierFloor(profile, tierOf, record = null, min = 1) {
  if (!profile || typeof tierOf !== 'function') return profile;
  const own = Object.getOwnPropertyDescriptor(profile, 'shipped');
  if (own && own.get && own.get.tierFloor) return profile; // once
  let base = !!profile.shipped;
  let saved = null;
  const KEYS = ['heroDrawn', 'heroId', 'heroCopy'];
  const get = () => {
    let tier = 1;
    try { const q = tierOf(); tier = Number.isFinite(q && q.tier) ? q.tier : Number(q); } catch { tier = 1; }
    const on = base && !(tier < min);
    const meta = record && record.meta;
    if (meta) {
      if (!on && meta.heroId === profile.id) { saved = Object.fromEntries(KEYS.map((k) => [k, meta[k]])); for (const k of KEYS) delete meta[k]; }
      else if (on && saved) { for (const k of KEYS) if (saved[k] !== undefined) meta[k] = saved[k]; saved = null; }
    }
    return on;
  };
  get.tierFloor = true;
  Object.defineProperty(profile, 'shipped', { get, set: (v) => { base = !!v; }, configurable: true, enumerable: true });
  return profile;
}

export function createHero(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = `deep-hero-${(env.profile && env.profile.id) || 'm57'}`;
  const profile = env.profile && Array.isArray(env.profile.layers) && env.profile.layers.some((l) => l && l.part === 'disc') ? env.profile : PROFILE;
  // Tier 0: photograph only (the coordinator drops the hero and draws M57 as main does). See tierFloor.
  // 0078 r14-neb-b: only below the profile's `frame.min_tier` (0 by default: the photographs are not drawn any more)
  const minTier = minTierOf(profile);
  if (minTier > 0 && typeof env.quality === 'function') tierFloor(profile, env.quality, env.record, minTier);
  const hid = String(profile.id || 'm57');
  const peak = peakOf(profile);
  const g = geometryOf(profile);
  const placer = skyPlacer(THREE, group, env);
  const sky = placer.sky;

  // --- the light: the photograph without its stars (scripts/build_deep_ring.py). Fetched with the hero.
  const light = lightTexture(THREE, new URL(lightUrlOf(profile), import.meta.url).href, hid); // 0078 r14-neb-b
  const pal0 = paletteFor(1, profile);
  const lightSize = lightSizeOf(profile); // 0078 r14-neb-b
  // --- the columns along our line, tabulated once (half floats, filtered linearly)
  const cmap = columnMap(g);
  const half = new Uint16Array(cmap.data.length);
  for (let i = 0; i < half.length; i++) half[i] = THREE.DataUtils.toHalfFloat(cmap.data[i]);
  const colTex = new THREE.DataTexture(half, cmap.n, cmap.n, THREE.RGBAFormat, THREE.HalfFloatType);
  colTex.colorSpace = THREE.NoColorSpace;
  colTex.minFilter = colTex.magFilter = THREE.LinearFilter;
  colTex.wrapS = colTex.wrapT = THREE.ClampToEdgeWrapping;
  colTex.generateMipmaps = false;
  colTex.needsUpdate = true;
  // --- the gas
  // the bounding ellipsoid's own mesh (drawn by its back faces): fewer pixels than the sphere round it
  const gasGeo = new THREE.IcosahedronGeometry(1.09, 3);
  gasGeo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(...g.e1), new THREE.Vector3(...g.e2), new THREE.Vector3(...g.axis)).multiply(new THREE.Matrix4().makeScale(g.bA, g.bB, g.bC)));
  const gasMat = shellMaterial(THREE, {
    vertexShader: GAS_VERT, fragmentShader: GAS_FRAG, side: THREE.BackSide,
    uniforms: {
      uCam: { value: new THREE.Vector3(0, 0, 10) },
      uSd: { value: M3(THREE, g.Sd) }, uSl: { value: M3(THREE, g.Sl) },
      uDisc: { value: new THREE.Vector4(SHAPE.slab, g.qIn, g.point ? 1 : 0, g.lean) }, uW: { value: new THREE.Vector3(...g.w) }, uHalo: { value: new THREE.Vector2(g.Ri, g.Ro) }, uEdgeP: { value: g.edgeP }, uRound: { value: new THREE.Vector3(g.round ? 1 : 0, (g.qIn + SHAPE.outer) / 2, (SHAPE.outer - g.qIn) / 2 + g.edgeP) },
      uUv: { value: new THREE.Vector4(g.uv.u0, g.uv.v0, 1 / g.uv.W, 1 / g.uv.H) }, uRot: { value: new THREE.Vector2(g.uv.cos, g.uv.sin) },
      uBound: { value: g.bound }, uSb: { value: M3(THREE, g.Sb) }, uJit: { value: 1 }, uInside: { value: 1 }, uNear: { value: SHAPE.nearFade * g.Lp }, uN: { value: 8 }, uLight: { value: light.tex }, uCols: { value: colTex }, uColScale: { value: 1 / (2 * cmap.extent) }, uPeak: { value: peak },
      uGamma: { value: pal0.gamma }, uSat: { value: pal0.saturation }, uShare: { value: 0 }, uGain: { value: 1 },
    },
  });
  gasMat.name = `deep-${hid}-gas`;
  const gas = new THREE.Mesh(gasGeo, gasMat);
  gas.name = `${group.name}-shells`;
  gas.renderOrder = -1;
  sky.add(gas);

  // --- the knots (built for the tier; rebuilt if the tier changes)
  const knotMat = knotMaterial(THREE, { minPx: g.knots.minPx, cusp: pal0.cusp, name: `deep-${hid}` });
  let knots = null, knotTier = -1, knotCount = 0, knotBytes = 0;
  function buildKnots(tier) {
    if (knots && knotTier === tier) return;
    const n = (Array.isArray(g.knots.count) ? g.knots.count : KNOTS_BY_TIER)[Math.max(0, Math.min(2, tier | 0))] | 0;
    if (knots) { sky.remove(knots); knots.geometry.dispose(); }
    const data = knotsOf(g, n);
    knots = knotMesh(THREE, data, knotMat);
    knots.name = `${group.name}-knots`;
    sky.add(knots);
    knotTier = tier; knotCount = n; knotBytes = data.pos.byteLength + data.knot.byteLength;
  }
  buildKnots(1);

  // --- the white dwarf
  const { mesh: star, mat: starMat, geo: starGeo } = starMesh(THREE, pal0.star, `deep-${hid}`);
  star.name = `${group.name}-star`;
  sky.add(star);

  let level = 0, levelShare = 0, samples = 8, tierNow = 1, last = { gas: 0, knots: 0, star: 0, photo: 0, light: 1 }, palette = pal0;
  const _cam = new THREE.Vector3();
  const setColour = (u, c) => u.value.setRGB(c[0], c[1], c[2], THREE.NoColorSpace);

  return {
    group,
    levels: [2, 3],
    // the card's words block (copy/en.later.js deepRing): its source line and its caveat rows
    card: { copy: COPY_BLOCK },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? Math.min(1, Math.max(0, share)) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      placer.update();
      const tier = Number.isFinite(info.tier) ? info.tier : 1;
      if (tier !== tierNow || !knots) { tierNow = tier; buildKnots(tier); }
      const { vw, vh } = viewSize();
      const sh = sharesFor({ level: tier >= minTier ? levelShare : 0, rPx: info.rPx, photo: info.photo, viewH: vh }); // 0078 r14-neb-b
      last = { ...sh, photo: Number(info.photo) || 0 };
      samples = samplesFor({ tier, steps: info.steps });
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (gain !== palette.gainIn) {
        palette = { ...paletteFor(gain, profile), gainIn: gain };
        setColour(knotMat.uniforms.uCusp, palette.cusp); setColour(starMat.uniforms.uColour, palette.star);
        gasMat.uniforms.uGamma.value = palette.gamma; gasMat.uniforms.uSat.value = palette.saturation;
        gasMat.uniforms.uPeak.value = peak ** palette.gamma; // the peak in the same stretch as the light
      }
      const look = info.look || 'film';
      const gu = gasMat.uniforms;
      gu.uShare.value = light.state() === 'ready' ? sh.gas : 0;
      gu.uN.value = samples;
      gu.uJit.value = samples > 1 ? 1 : 0;
      gu.uGain.value = palette.gain * SHAPE.exposure * sh.light;
      knotMat.uniforms.uGain.value = palette.gain * sh.light;
      knotMat.uniforms.uShare.value = drawnUnder(look, UNDER_MEASURED.knots) ? sh.knots : 0;
      starMat.uniforms.uShare.value = sh.star;
      gas.visible = gu.uShare.value > 0.002;
      knots.visible = knotCount > 0 && knotMat.uniforms.uShare.value > 0.002;
      star.visible = sh.star > 0.002;
      knotMat.uniforms.uViewH.value = vh;
      starMat.uniforms.uView.value.set(vw, vh);
      if (info.camera) {
        gu.uCam.value.copy(placer.camera(info.camera, _cam));
        gu.uInside.value = insideOf(g, [_cam.x, _cam.y, _cam.z]);
      }
    },
    // The light map is the one thing it fetches: ready once it has landed (or failed, and said so).
    ready: () => light.state() !== 'loading',
    stats: () => ({
      level, share: Math.round(last.gas * 100) / 100, photo: Math.round(last.photo * 100) / 100, star: Math.round(last.star * 100) / 100,
      light: light.state(), samples, tier: tierNow, palette: palette.mode, knots: knotCount, meshes: 3, points: knotCount, textures: light.tex ? 2 : 1, front: 'exact',
      bytes: knotBytes + gasGeo.getAttribute('position').array.byteLength + QUAD_BYTES * 2 + half.byteLength + (light.tex ? Math.round(lightSize[0] * lightSize[1] * 4 * 4 / 3) : 0),
    }),
    dispose() {
      if (knots) knots.geometry.dispose();
      gasGeo.dispose(); starGeo.dispose();
      gasMat.dispose(); knotMat.dispose(); starMat.dispose();
      if (light.tex) light.tex.dispose();
      colTex.dispose();
      knots = null;
      if (group.parent) group.parent.remove(group);
    },
  };
}

/** (u, v) on the light map of sky point (x, y), for tests: shellneb.js uvAt with this hero's mapping. Pure. */
export const lightUv = (g, x, y) => uvAt(g.uv, x, y);
