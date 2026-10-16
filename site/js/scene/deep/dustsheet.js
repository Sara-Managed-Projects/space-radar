// scene/deep/dustsheet.js -- dark and reflection nebulae as SHEETS of dust in depth: the Horsehead against IC 434, the
// Coalsack against the Milky Way, M78 and the Iris lit by their stars, and any dust whose profile says `part: dust`
// (internal spec 0076 stage W3-c, internal #784, #806; spec 0075 task 28). Fetched by scene/deep/deepsky.js when the
// nebula is near (scene/deep/heroes.js); never at boot. scene/deep/helix.js says what a hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_dustsheet.mjs: sheetOf, ccm, reddening, decodeTau, halfAt, profileAt, columnJs, closedJs,
//   transmissionTo, hg, phaseFactor, keepRadiusPx, keepActive, samplesFor, starLook, SHAPE, UNDER_MEASURED, COPY_BLOCK.
//
// ONE MODULE FOR EVERY SHEET. Nothing here names an object: registry/deepsky-heroes/<id>.yaml gives up to three LAYERS
// parallel to the sky, each with its depth (z, light-years toward the Sun) and half-thickness: the dust in FRONT (the
// dust map's red channel), the LIGHT (a photograph's glow, or the starlight a reflection nebula scatters), and the dust
// BEHIND (the map's green channel). scripts/build_deep_sheets.py bakes the maps; the module docstring there gives the
// rule that reads an optical depth from a picture's darkness.
//
// DUST ABSORBS; IT NEVER GLOWS. Two meshes, in this order, each the layers' bounding box drawn by its back faces in the
// SKY FRAME (x west, y north, z toward the Sun, light-years about the record's place):
//   absorb  a MULTIPLY blend in its own material (CustomBlending: Zero, SrcColor): every pixel drawn before it (the
//           catalogue's stars, the Milky Way, the photographs) is multiplied by the dust's transmission, per channel by
//           the Cardelli, Clayton & Mathis (1989) law, so what is behind is dimmed AND reddened, and nothing is added.
//           The transmission is applied to the display values as T^(1/2.2): the framebuffer holds display values.
//           A catalogue star IN FRONT of the dust (scripts/build_deep_sheets.py lists them) is kept clear: each frame
//           the hero passes those on the camera's side of the dust, and a disc the star's own size round each is left.
//   light   additive: the light layer's glow, dimmed and reddened by the dust between it and the camera (the layers
//           are crossed in the order the ray meets them), and for a reflection nebula weighted by a Henyey-Greenstein
//           phase function of the angle star - dust - eye against that angle seen from here. The light is only where
//           the photograph has it: the star lights the dust near it, and nothing spreads it further.
//   star    a reflection nebula's own star, at its SIMBAD place and a stated depth (one Points draw); the catalogue's
//           copy steps aside while it is drawn (scene/starholes.js setExtraHole), as orion.js does for theta2 Ori A.
// Each layer is sampled n times through its own depth (8 at level 2, up to 16 at level 3); on T0 and under the latch
// each layer's crossing of its middle plane is found in closed form, one map lookup each. A static per-pixel offset
// (grain, never bands). From our line the light layer is the photograph (light x transmission = the picture: the bake's
// rule), and where the app shows that photograph the hero gives way to it by its own share (info.photo).
//
// LOOKS. Nothing in it moves. The light has the exposure's own stretch, as the photographs have. Under Measured nothing
// changes: every part is a reconstruction of measured numbers or a stated model, and the card says which.

import { stage } from '../stage.js';
import { drawnUnder } from '../exposure.js';
import { STAR_LIGHT_GLSL } from '../stretch.js';
import { kelvinToRgb, STAR_CHROMA } from '../starfield.js';
import { setExtraHole } from '../starholes.js';
import {
  part, offsetLy, uvOf, coverAt, featherOf, paletteFor, sharesFor, placeSkyGroup, loadMap, cameraInSky, COMMON_GLSL, VERT, COPY_BLOCK,
} from './remnant.js';

export { COPY_BLOCK };
export const UNDER_MEASURED = { dust: 'same', light: 'same', motion: 'still' };

const MAX_N = 16;          // samples a layer at most (level 3)
const MAX_KEEP = 48;       // catalogue stars kept clear of the dust at once
const STARS_URL = '../../../images/deep/sheets/stars.json';
// ONE table: the GLSL below is written from it.
export const SHAPE = {
  thinFrom: 0.35,     // a dust layer's half-thickness at its edge, of its fullest (it grows with sqrt(tau / tau_max))
  slantCap: 0.3,      // the closed form's 1 / |cos| stops at cos 0.3 (3.3 times): an edge-on sheet is a line, not a blaze
  grazeFrom: 0.02,    // and it fades out below cos 0.02 to 0.10: the thinnest thing seen exactly edge on is nothing
  grazeTo: 0.10,
  shoulder: 1.0,      // a soft shoulder over 1 (as remnant.js)
  keepFeather: 0.35,  // a kept star's disc is feathered over this fraction of its radius
  pad: 0.05,          // ly over each layer's thickest point
};
const f3 = (x) => Number(x).toFixed(4);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

// ------------------------------------------------------------------------------- the dust's colour

/** Cardelli, Clayton & Mathis (1989) A(lambda) / A(V) in the optical and near infrared (0.3 to 3.3 um^-1). Pure. */
export function ccm(lambdaUm, rv = 3.1) {
  const x = 1 / lambdaUm;
  if (x >= 1.1 && x <= 3.3) {
    const y = x - 1.82;
    const a = 1 + 0.17699 * y - 0.50447 * y ** 2 - 0.02427 * y ** 3 + 0.72085 * y ** 4 + 0.01979 * y ** 5 - 0.7753 * y ** 6 + 0.32999 * y ** 7;
    const b = 1.41338 * y + 2.28305 * y ** 2 + 1.07233 * y ** 3 - 5.38434 * y ** 4 - 0.62251 * y ** 5 + 5.3026 * y ** 6 - 2.09002 * y ** 7;
    return a + b / rv;
  }
  if (x >= 0.3 && x < 1.1) return (0.574 * x ** 1.61) + (-0.527 * x ** 1.61) / rv;
  return NaN;
}

/** The optical depth per channel for an optical depth of 1 in V: [r, g, b] at the profile's wavelengths. Pure. */
export function reddening(red = {}) {
  const lam = Array.isArray(red.lambda_um) && red.lambda_um.length === 3 ? red.lambda_um.map(Number) : [0.61, 0.55, 0.45];
  const rv = Number(red.rv) || 3.1;
  return lam.map((l) => ccm(l, rv));
}

/** The dust map's channel value (0..1) to an optical depth: tau_max x v^2 (scripts/build_deep_sheets.py save_dust). Pure. */
export function decodeTau(v, tauMax) { return tauMax * Math.max(0, v) * Math.max(0, v); }

// --------------------------------------------------------------------------------------- the layers

const LAYER = { none: 0, front: 1, light: 2, back: 3 };

/**
 * The profile's layers in the sky frame (ly about the record's place): each {kind, z, half}, sorted from the highest z
 * (nearest the Sun) down; the light's and the dust's uv maps; the box; the reddening; the stars; the phase function.
 * Pure.
 */
export function sheetOf(profile) {
  const P = profile || {};
  const fr = P.frame || {};
  const dist = Number(fr.distance_ly) || 1000;
  const ra0 = Number(fr.ra_deg) || 0, dec0 = Number(fr.dec_deg) || 0;
  const li = part(P, 'light'), du = part(P, 'dust'), st = part(P, 'stars'), sc = part(P, 'scatter');
  // a profile with neither picture (a stub) still gets a small frame round the record, so nothing is NaN
  const stub = { ra_deg: ra0, dec_deg: dec0, width_arcmin: 10, height_arcmin: 10, north_deg: 0 };
  const picL = li.picture || du.picture || stub, picD = du.picture || li.picture || stub;
  const uvL = uvOf(picL, ra0, dec0, dist);
  const uvD = uvOf(picD, ra0, dec0, dist);
  const layers = [];
  if (li.file) layers.push({ kind: 'light', z: Number(li.z_ly) || 0, half: Math.max(0.01, Number(li.half_ly) || 0.3) });
  if (du.front) layers.push({ kind: 'front', z: Number(du.front.z_ly) || 0, half: Math.max(0.01, Number(du.front.half_ly) || 0.5) });
  if (du.back) layers.push({ kind: 'back', z: Number(du.back.z_ly) || 0, half: Math.max(0.01, Number(du.back.half_ly) || 0.5) });
  layers.sort((a, b) => b.z - a.z);
  const corners = [];
  for (const uv of [uvL, uvD]) if (uv) for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) corners.push(uv.xyOf(u, v));
  const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
  const zlo = (layers.length ? Math.min(...layers.map((l) => l.z - l.half)) : -1) - SHAPE.pad;
  const zhi = (layers.length ? Math.max(...layers.map((l) => l.z + l.half)) : 1) + SHAPE.pad;
  const stars = (st.stars || []).map((s) => {
    const [x, y] = offsetLy(ra0, dec0, s.ra_deg, s.dec_deg, dist);
    return { id: s.id, pos: [x, y, Number(s.z_ly) || 0], v: Number(s.v_mag), temp: Number(s.temp_k) || 10000, catalogue: !!s.catalogue };
  });
  return {
    distanceLy: dist, layers, uvL, uvD, edgeL: featherOf(li), edgeD: featherOf(du), tauMax: Number(du.tau_max) || 3, k: reddening(du.reddening), stars,
    phase: sc.g !== undefined ? { g: clamp(Number(sc.g), -0.95, 0.95), lo: Number((sc.range || [])[0]) || 0.25, hi: Number((sc.range || [])[1]) || 3, star: stars[0] || null } : null,
    box: { min: [Math.min(...xs), Math.min(...ys), zlo], max: [Math.max(...xs), Math.max(...ys), zhi] },
    hasLight: !!li.file, hasDust: !!du.file,
  };
}

/**
 * The march's grazing factor at |cos| = mu: a thin layer seen nearly edge on gathers 1 / mu of its column, which the
 * closed form caps at 1 / slantCap and fades below grazeTo; the march is multiplied by mu x that, so both agree and an
 * edge-on sheet is a line, never a blaze. 1 face on. Pure.
 */
export function grazeOf(mu) {
  return smooth(mu, SHAPE.grazeFrom, SHAPE.grazeTo) * Math.min(1, mu / SHAPE.slantCap);
}

/** A dust layer's half-thickness where its optical depth is tau: thinner at its edges (the GLSL's halfAt). Pure. */
export function halfAt(half, tau, tauMax) {
  return half * (SHAPE.thinFrom + (1 - SHAPE.thinFrom) * Math.sqrt(clamp(tau / Math.max(tauMax, 1e-6), 0, 1)));
}

/** A layer's profile across its depth: a raised cosine of half-width h, its integral 1 (the GLSL's profileAt). Pure. */
export function profileAt(dz, h) {
  if (!(h > 0) || Math.abs(dz) >= h) return 0;
  return (1 + Math.cos(Math.PI * dz / h)) / (2 * h);
}

/** Henyey-Greenstein's phase function at cos(theta) = mu, per steradian times 4 pi. Pure. */
export function hg(mu, g) { const d = 1 + g * g - 2 * g * mu; return (1 - g * g) / (d * Math.sqrt(d)); }

/**
 * How much brighter the scattered light at p is seen from `cam` than from our line: star -> p -> eye against star ->
 * p -> the Sun's direction (+z), clamped to the profile's range. Pure.
 */
export function phaseFactor(ph, p, cam) {
  if (!ph || !ph.star) return 1;
  const i = norm([p[0] - ph.star.pos[0], p[1] - ph.star.pos[1], p[2] - ph.star.pos[2]]);
  const o = norm([cam[0] - p[0], cam[1] - p[1], cam[2] - p[2]]);
  const mu = i[0] * o[0] + i[1] * o[1] + i[2] * o[2];
  return clamp(hg(mu, ph.g) / hg(i[2], ph.g), ph.lo, ph.hi);
}

/** The stretch of the ray inside a layer's slab [z - half, z + half] and the box's x and y, from t = 0: [t0, t1]. Pure. */
export function layerSpan(g, L, ro, rd) {
  let t0 = 0, t1 = Infinity;
  const lo = [g.box.min[0], g.box.min[1], L.z - L.half], hi = [g.box.max[0], g.box.max[1], L.z + L.half];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(rd[a]) < 1e-12) { if (ro[a] < lo[a] || ro[a] > hi[a]) return null; continue; }
    let ta = (lo[a] - ro[a]) / rd[a], tb = (hi[a] - ro[a]) / rd[a];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
  }
  return t1 > t0 ? [t0, t1] : null;
}

/**
 * The march (the GLSL's main() of both meshes): along ro + t rd (unit rd, sky frame, ly), n samples a layer at offset
 * j, the layers met in the ray's order. `tau(u, v)` -> [front, back] optical depths in V; `light(u, v)` -> the
 * stretched picture. Returns {T: [r, g, b] transmission, C: [r, g, b] light, before the share and the gain}. Pure.
 */
export function columnJs(g, ro, rd, { n = 8, j = 0.5, tau = () => [0, 0], light = () => [0, 0, 0] } = {}) {
  const T = [1, 1, 1], C = [0, 0, 0];
  const order = rd[2] < 0 ? g.layers : [...g.layers].reverse();
  const q = grazeOf(Math.abs(rd[2]));
  for (const L of order) {
    const sp = layerSpan(g, L, ro, rd);
    if (!sp) continue;
    const dt = (sp[1] - sp[0]) / n;
    for (let k = 0; k < n; k++) {
      const t = sp[0] + (k + j) * dt;
      const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, ro[2] + rd[2] * t];
      if (L.kind === 'light') {
        const [u, v] = g.uvL.at(p[0], p[1]);
        const w = profileAt(p[2] - L.z, L.half) * coverAt(u, v, g.edgeL) * dt * q * phaseFactor(g.phase, p, ro);
        if (!(w > 0)) continue;
        const e = light(u, v);
        for (let c = 0; c < 3; c++) C[c] += T[c] * e[c] * w;
      } else {
        const [u, v] = g.uvD.at(p[0], p[1]);
        const tv = tau(u, v)[L.kind === 'front' ? 0 : 1] * coverAt(u, v, g.edgeD);
        const h = halfAt(L.half, tv, g.tauMax);
        const d = tv * profileAt(p[2] - L.z, h) * dt * q;
        for (let c = 0; c < 3; c++) T[c] *= Math.exp(-d * g.k[c]);
      }
    }
  }
  return { T, C };
}

/**
 * T0 and the latch: each layer's crossing of its middle plane in closed form, slant 1 / max(|cos|, slantCap), faded
 * at grazing (the GLSL's CHEAP path). Same answer as columnJs on our line. Pure.
 */
export function closedJs(g, ro, rd, { tau = () => [0, 0], light = () => [0, 0, 0] } = {}) {
  const T = [1, 1, 1], C = [0, 0, 0];
  if (Math.abs(rd[2]) < 1e-9) return { T, C };
  const mu = Math.abs(rd[2]);
  const slant = smooth(mu, SHAPE.grazeFrom, SHAPE.grazeTo) / Math.max(mu, SHAPE.slantCap);
  const order = rd[2] < 0 ? g.layers : [...g.layers].reverse();
  for (const L of order) {
    const t = (L.z - ro[2]) / rd[2];
    if (!(t > 0)) continue;
    const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, L.z];
    if (p[0] < g.box.min[0] || p[0] > g.box.max[0] || p[1] < g.box.min[1] || p[1] > g.box.max[1]) continue;
    if (L.kind === 'light') {
      const [u, v] = g.uvL.at(p[0], p[1]);
      const e = light(u, v), w = coverAt(u, v, g.edgeL) * slant * phaseFactor(g.phase, p, ro);
      for (let c = 0; c < 3; c++) C[c] += T[c] * e[c] * w;
    } else {
      const [u, v] = g.uvD.at(p[0], p[1]);
      const tv = tau(u, v)[L.kind === 'front' ? 0 : 1] * coverAt(u, v, g.edgeD) * slant;
      for (let c = 0; c < 3; c++) T[c] *= Math.exp(-tv * g.k[c]);
    }
  }
  return { T, C };
}

/** What a star at `p` (sky frame) seen from `cam` keeps of its light through the dust (the per-channel T). Pure. */
export function transmissionTo(g, p, cam, opts = {}) {
  const d = [p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]];
  const len = Math.hypot(...d);
  const rd = d.map((x) => x / len);
  const gg = { ...g, layers: g.layers.filter((L) => (L.z - cam[2]) / (rd[2] || 1e-12) > 0 && (L.z - cam[2]) / (rd[2] || 1e-12) < len && L.kind !== 'light') };
  return (opts.closed ? closedJs : columnJs)(gg, cam, rd, opts).T;
}

// ------------------------------------------------------------------------------- the kept stars

/** The radius in CSS px a catalogue star of magnitude m is drawn to (scene/stars3d.js's size), and a pixel more. Pure. */
export function keepRadiusPx(m) {
  const tt = clamp((6.5 - m) / 8, 0, 1);
  const glow = clamp((2.5 - m) / 4, 0, 1), glare = clamp((-1.5 - m) / 6, 0, 1);
  const core = (1 + 5 * tt ** 1.6) * (1 + 0.8 * glow);
  return 0.5 * (core * (1 + 4 * glow) + 26 * glare) + 1;
}

/**
 * Which of the listed catalogue stars ([x, y, z, M] in the sky frame) the dust must leave alone from `cam`: those on the
 * camera's side of the front layer's middle (or of the only dust layer). Returns [{pos, radiusPx}] at most MAX_KEEP. Pure.
 */
export function keepActive(g, list, cam) {
  const dust = g.layers.find((L) => L.kind === 'front') || g.layers.find((L) => L.kind === 'back');
  if (!dust || !Array.isArray(list)) return [];
  const side = Math.sign(cam[2] - dust.z) || 1;
  const out = [];
  for (const s of list) {
    if (!Array.isArray(s) || s.length < 4) continue;
    if ((Math.sign(s[2] - dust.z) || 1) !== side) continue;
    const dLy = Math.hypot(s[0] - cam[0], s[1] - cam[1], s[2] - cam[2]);
    const m = s[3] + 5 * Math.log10(Math.max(1e-6, dLy / 3.26156) / 10);
    if (m > 8) continue;
    out.push({ pos: [s[0], s[1], s[2]], radiusPx: keepRadiusPx(m) });
    if (out.length >= MAX_KEEP) break;
  }
  return out;
}

/** Samples a layer: 8 at level 2, half the march's steps at level 3 (8 to 16); 0 means the closed form. Pure. */
export function samplesFor({ tier = 1, steps = 0, cheap = false, slow = false } = {}) {
  if (cheap || !(tier >= 1)) return 0;
  const n = Math.max(8, Math.min(MAX_N, Math.round((Number(steps) || 0) / 2)));
  return slow ? Math.max(4, Math.round(n / 2)) : n;
}

/** A hero's own star at the camera (orion.js starLook): a small hard core and a compact halo, size capped. Pure. */
export function starLook(m) {
  const tt = clamp((6.5 - m) / 8, 0, 1), over = clamp((-1.5 - m) / 6, 0, 1);
  const core = 1.2 + 1.6 * tt, size = core * (2 + 1.2 * over);
  return { size, core: core / size, glow: 0.35 + 0.65 * Math.max(tt, over), alpha: m > 7.5 ? 0 : (0.35 + 0.65 * tt) * (1 + 1.5 * over) };
}

function tintOf(kelvin) {
  const rgb = kelvinToRgb(kelvin);
  const mean = (rgb[0] + rgb[1] + rgb[2]) / 3;
  const out = rgb.map((v) => clamp(mean + (v - mean) * STAR_CHROMA, 0, 1));
  const max = Math.max(...out) || 1;
  return out.map((v) => v / max);
}

// ------------------------------------------------------------------------------------------- the GLSL

const LAYERS_GLSL = /* glsl */ `
#define MAX_N ${MAX_N}
uniform vec3 uCam;          // the camera in the sky frame, ly (CPU, float64, each frame)
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform vec3 uLayerZ;       // the three layer slots, from the highest z down: their middles, ly
uniform vec3 uLayerH;       // their half-thickness, ly
uniform vec3 uLayerKind;    // 0 none, 1 dust in front (red channel), 2 light, 3 dust behind (green channel)
uniform vec2 uUvL0;
uniform vec2 uUvLx;
uniform vec2 uUvLy;
uniform vec2 uUvD0;
uniform vec2 uUvDx;
uniform vec2 uUvDy;
uniform sampler2D uDust;    // R: sqrt(tau_front / tau_max), G: sqrt(tau_back / tau_max)
uniform vec2 uEdgeL;        // the light's and the dust's picture edge feathers (coverAt)
uniform vec2 uEdgeD;
uniform float uTauMax;
uniform vec3 uK;            // A(lambda) / A(V) at red, green and blue (Cardelli, Clayton & Mathis 1989)
uniform int uN;             // samples a layer; 0: the closed form
uniform float uShare;
varying vec3 vObj;
${COMMON_GLSL}
vec2 uvL( vec2 xy ) { return uUvL0 + xy.x * uUvLx + xy.y * uUvLy; }
vec2 uvD( vec2 xy ) { return uUvD0 + xy.x * uUvDx + xy.y * uUvDy; }
float tauAt( vec2 xy, float kind ) {
  vec2 uv = uvD( xy );
  vec2 v = texture2D( uDust, uv ).rg;
  float t = kind < 1.5 ? v.r : v.g;
  return uTauMax * t * t * coverAt( uv, uEdgeD );
}
float grazeOf( float mu ) {
  return smoothstep( ${f3(SHAPE.grazeFrom)}, ${f3(SHAPE.grazeTo)}, mu ) * min( 1.0, mu / ${f3(SHAPE.slantCap)} );
}
float halfAt( float hw, float tau ) {
  return hw * ( ${f3(SHAPE.thinFrom)} + ${f3(1 - SHAPE.thinFrom)} * sqrt( clamp( tau / max( uTauMax, 1e-6 ), 0.0, 1.0 ) ) );
}
float profileAt( float dz, float h ) {
  if ( h <= 0.0 || abs( dz ) >= h ) return 0.0;
  return ( 1.0 + cos( 3.14159265 * dz / h ) ) / ( 2.0 * h );
}
// layerSpan: the ray inside slot s's slab and the box's x and y, from t = 0 (y <= x: none)
vec2 layerSpan( vec3 ro, vec3 rd, float z, float h ) {
  vec3 lo = vec3( uBoxMin.xy, z - h ), hi = vec3( uBoxMax.xy, z + h );
  vec3 inv = 1.0 / ( abs( rd ) + 1e-9 ) * sign( rd + 1e-12 );
  vec3 ta = ( lo - ro ) * inv, tb = ( hi - ro ) * inv;
  vec3 tn = min( ta, tb ), tf = max( ta, tb );
  return vec2( max( max( tn.x, tn.y ), max( tn.z, 0.0 ) ), min( min( tf.x, tf.y ), tf.z ) );
}
float slotOf( vec3 v, int s ) { return s == 0 ? v.x : ( s == 1 ? v.y : v.z ); }
`;

// The ABSORB mesh: the transmission, per channel, raised to 1 / 2.2 (display values), and kept stars left clear.
const ABSORB_FRAG = /* glsl */ `
${LAYERS_GLSL}
uniform vec4 uKeep[ ${MAX_KEEP} ];   // xyz: a kept star in the sky frame; w: its disc's radius, radians
uniform int uKeepN;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCam;
  vec3 rd = normalize( vObj - ro );
  float j = pixelHash( gl_FragCoord.xy );
  float q = grazeOf( abs( rd.z ) );
  float tau = 0.0;
  for ( int s = 0; s < 3; s++ ) {
    float kind = slotOf( uLayerKind, s );
    if ( kind < 0.5 || abs( kind - 2.0 ) < 0.5 ) continue;
    float z = slotOf( uLayerZ, s ), h = slotOf( uLayerH, s );
    if ( uN <= 0 ) {
      if ( abs( rd.z ) < 1e-6 ) continue;
      float t = ( z - ro.z ) / rd.z;
      vec3 p = ro + rd * t;
      if ( t <= 0.0 || any( lessThan( p.xy, uBoxMin.xy ) ) || any( greaterThan( p.xy, uBoxMax.xy ) ) ) continue;
      float mu = abs( rd.z );
      tau += tauAt( p.xy, kind ) * smoothstep( ${f3(SHAPE.grazeFrom)}, ${f3(SHAPE.grazeTo)}, mu ) / max( mu, ${f3(SHAPE.slantCap)} );
      continue;
    }
    vec2 sp = layerSpan( ro, rd, z, h );
    if ( sp.y <= sp.x ) continue;
    float dt = ( sp.y - sp.x ) / float( uN );
    for ( int k = 0; k < MAX_N; k++ ) {
      if ( k >= uN ) break;
      vec3 p = ro + rd * ( sp.x + ( float( k ) + j ) * dt );
      float tv = tauAt( p.xy, kind );
      tau += tv * profileAt( p.z - z, halfAt( h, tv ) ) * dt * q;
    }
  }
  vec3 T = exp( -tau * uK );
  // a kept star (in front of the dust from here): its disc left clear
  float keep = 0.0;
  for ( int i = 0; i < ${MAX_KEEP}; i++ ) {
    if ( i >= uKeepN ) break;
    vec3 d = normalize( uKeep[ i ].xyz - ro );
    float a = acos( clamp( dot( d, rd ), -1.0, 1.0 ) );
    keep = max( keep, 1.0 - smoothstep( uKeep[ i ].w * ${f3(1 - SHAPE.keepFeather)}, uKeep[ i ].w, a ) );
  }
  T = mix( T, vec3( 1.0 ), keep );
  gl_FragColor = vec4( mix( vec3( 1.0 ), pow( T, vec3( 1.0 / 2.2 ) ), uShare ), 1.0 );
}
`;

// The LIGHT mesh: the light layer, through the dust the ray met before it, phase-weighted for a reflection nebula.
const LIGHT_FRAG = /* glsl */ `
${LAYERS_GLSL}
uniform sampler2D uLight;   // display values (gasmat.js COLOUR_POLICY)
uniform float uGain;
uniform vec3 uStar;         // the lighting star, sky frame (uPhase.x == 0: no phase function)
uniform vec3 uPhase;        // g, the factor's floor and ceiling
#include <common>
#include <logdepthbuf_pars_fragment>
float hg( float mu, float g ) { float d = 1.0 + g * g - 2.0 * g * mu; return ( 1.0 - g * g ) / ( d * sqrt( d ) ); }
float phaseAt( vec3 p, vec3 ro ) {
  if ( abs( uPhase.x ) < 1e-4 ) return 1.0;
  vec3 i = normalize( p - uStar );
  vec3 o = normalize( ro - p );
  return clamp( hg( dot( i, o ), uPhase.x ) / hg( i.z, uPhase.x ), uPhase.y, uPhase.z );
}
void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 ro = uCam;
  vec3 rd = normalize( vObj - ro );
  float j = pixelHash( gl_FragCoord.xy );
  float q = grazeOf( abs( rd.z ) );
  vec3 T = vec3( 1.0 );
  vec3 C = vec3( 0.0 );
  for ( int qi = 0; qi < 3; qi++ ) {
    int s = rd.z < 0.0 ? qi : 2 - qi;     // the slots run from the highest z down: a ray going down meets them so
    float kind = slotOf( uLayerKind, s );
    if ( kind < 0.5 ) continue;
    float z = slotOf( uLayerZ, s ), h = slotOf( uLayerH, s );
    bool lit = abs( kind - 2.0 ) < 0.5;
    if ( uN <= 0 ) {
      if ( abs( rd.z ) < 1e-6 ) continue;
      float t = ( z - ro.z ) / rd.z;
      vec3 p = vec3( ( ro + rd * t ).xy, z );
      if ( t <= 0.0 || any( lessThan( p.xy, uBoxMin.xy ) ) || any( greaterThan( p.xy, uBoxMax.xy ) ) ) continue;
      float mu = abs( rd.z );
      float slant = smoothstep( ${f3(SHAPE.grazeFrom)}, ${f3(SHAPE.grazeTo)}, mu ) / max( mu, ${f3(SHAPE.slantCap)} );
      if ( lit ) {
        vec2 uv = uvL( p.xy );
        C += T * stretchLight( texture2D( uLight, uv ).rgb ) * ( coverAt( uv, uEdgeL ) * slant * phaseAt( p, ro ) );
      } else T *= exp( -tauAt( p.xy, kind ) * slant * uK );
      continue;
    }
    vec2 sp = layerSpan( ro, rd, z, h );
    if ( sp.y <= sp.x ) continue;
    float dt = ( sp.y - sp.x ) / float( uN );
    for ( int k = 0; k < MAX_N; k++ ) {
      if ( k >= uN ) break;
      vec3 p = ro + rd * ( sp.x + ( float( k ) + j ) * dt );
      if ( lit ) {
        vec2 uv = uvL( p.xy );
        float w = profileAt( p.z - z, h ) * coverAt( uv, uEdgeL ) * dt * q;
        if ( w > 0.0 ) C += T * stretchLight( texture2D( uLight, uv ).rgb ) * ( w * phaseAt( p, ro ) );
      } else {
        float tv = tauAt( p.xy, kind );
        T *= exp( -tv * profileAt( p.z - z, halfAt( h, tv ) ) * dt * q * uK );
      }
    }
  }
  vec3 col = C * uGain * uShare;
  float mx = max( col.r, max( col.g, col.b ) );
  if ( mx > ${f3(SHAPE.shoulder)} ) col *= ( ${f3(SHAPE.shoulder)} + ( 1.0 - exp( -( mx - ${f3(SHAPE.shoulder)} ) ) ) * 0.5 ) / mx;
  gl_FragColor = vec4( col, 1.0 );   // additive (SrcAlpha, One): alpha 1
}
`;

// The hero's own star (orion.js STAR_VERT kind 0): its magnitude at the camera, dimmed by nothing (it is in front).
const STAR_VERT = /* glsl */ `
attribute vec4 aStar;       // colour (rgb); w: V seen from the Sun
uniform vec3 uCam;
uniform float uDistLy;
uniform float uPixelRatio;
uniform float uShare;
uniform float uGain;
varying vec3 vColour;
varying float vAlpha;
varying float vCore;
varying float vGlow;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
  float d = max( 1e-4, length( position - uCam ) );
  float m = aStar.w + 5.0 * log( d / uDistLy ) / log( 10.0 );
  float tt = clamp( ( 6.5 - m ) / 8.0, 0.0, 1.0 );
  float over = clamp( ( -1.5 - m ) / 6.0, 0.0, 1.0 );
  float core = 1.2 + 1.6 * tt;
  float size = core * ( 2.0 + 1.2 * over );
  gl_PointSize = mv.z < 0.0 ? size * uPixelRatio : 0.0;
  vCore = core / size;
  vGlow = 0.35 + 0.65 * max( tt, over );
  vColour = aStar.rgb;
  vAlpha = ( m > 7.5 ? 0.0 : ( 0.35 + 0.65 * tt ) * ( 1.0 + 1.5 * over ) ) * uShare * uGain;
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
varying float vCore;
varying float vGlow;
#include <common>
#include <logdepthbuf_pars_fragment>
${STAR_LIGHT_GLSL}
void main() {
  #include <logdepthbuf_fragment>
  if ( vAlpha <= 0.002 ) discard;
  float d = length( gl_PointCoord - 0.5 );
  vec2 light = starLight( d, vCore, vGlow );
  float a = light.x + light.y;
  if ( a <= 0.003 ) discard;
  gl_FragColor = vec4( mix( vColour, vec3( 1.0 ), 0.5 * light.x ) * a * vAlpha, 1.0 );
}
`;

/** The shader sources, for tests/test_dustsheet.mjs (columnJs and closedJs mirror them). */
export const SHADERS = { vertex: VERT, absorb: ABSORB_FRAG, light: LIGHT_FRAG, starVertex: STAR_VERT, star: STAR_FRAG, layers: LAYERS_GLSL };

// -------------------------------------------------------------------------------------- the hero

const fileUrl = (path) => `../../../${String(path || '').replace(/^site\//, '')}`;
const KIND_CODE = { front: LAYER.front, light: LAYER.light, back: LAYER.back };

/** The three layer slots' uniforms (from the highest z down; empty slots are kind 0). Pure. */
export function slotsOf(g) {
  const z = [0, 0, 0], h = [0, 0, 0], kind = [0, 0, 0];
  g.layers.slice(0, 3).forEach((L, i) => { z[i] = L.z; h[i] = L.half; kind[i] = KIND_CODE[L.kind] || 0; });
  return { z, h, kind };
}

export function createHero(THREE, env = {}) {
  const profile = env.profile || {};
  const id = profile.id || 'sheet';
  const group = new THREE.Group();
  group.name = `deep-hero-${id}`;
  const g = sheetOf(profile);
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;

  // --- what it fetches: the light map, the dust map, the catalogue's stars in its footprint
  const browser = typeof document !== 'undefined';
  const li = part(profile, 'light'), du = part(profile, 'dust');
  let lightTex = null, lightState = g.hasLight ? 'none' : 'ready', dustTex = null, dustState = g.hasDust ? 'none' : 'ready', listState = 'none';
  let keepList = [], twins = {};
  if (browser && THREE.TextureLoader) {
    if (g.hasLight) { lightState = 'loading'; lightTex = loadMap(THREE, fileUrl(li.file), (st) => { lightState = st; }); }
    if (g.hasDust) { dustState = 'loading'; dustTex = loadMap(THREE, fileUrl(du.file), (st) => { dustState = st; }); }
  }
  if (browser || env.fetchJson) {
    listState = 'loading';
    const load = env.fetchJson || ((url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))));
    Promise.resolve().then(() => load(new URL(STARS_URL, import.meta.url).href)).then((doc) => {
      const row = (doc && doc[id]) || {};
      keepList = Array.isArray(row.keep) ? row.keep : [];
      twins = row.twins && typeof row.twins === 'object' ? row.twins : {};
      listState = 'ready';
    }).catch((e) => { listState = 'failed'; console.warn('deep: the dust\'s star list did not load', e); });
  } else listState = 'ready';
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat);
  blank.needsUpdate = true;

  const pal0 = paletteFor(1, profile);
  const slots = slotsOf(g);
  const V3 = (v) => new THREE.Vector3(...v);
  const V2 = (v) => new THREE.Vector2(...v);
  const camU = { value: new THREE.Vector3(0, 0, 50) };
  const uvl = g.uvL, uvd = g.uvD;
  const layerU = () => ({
    uCam: camU, uBoxMin: { value: V3(g.box.min) }, uBoxMax: { value: V3(g.box.max) },
    uLayerZ: { value: V3(slots.z) }, uLayerH: { value: V3(slots.h) }, uLayerKind: { value: V3(slots.kind) },
    uUvL0: { value: V2([uvl.u0, uvl.v0]) }, uUvLx: { value: V2(uvl.ux) }, uUvLy: { value: V2(uvl.uy) },
    uUvD0: { value: V2([uvd.u0, uvd.v0]) }, uUvDx: { value: V2(uvd.ux) }, uUvDy: { value: V2(uvd.uy) },
    uDust: { value: dustTex || blank }, uEdgeL: { value: V2(g.edgeL) }, uEdgeD: { value: V2(g.edgeD) }, uTauMax: { value: g.tauMax }, uK: { value: V3(g.k) }, uN: { value: 8 }, uShare: { value: 0 },
    uGamma: { value: pal0.gamma }, uSat: { value: pal0.saturation },
  });
  const size = g.box.max.map((v, i) => v - g.box.min[i]);
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  geo.translate(...g.box.max.map((v, i) => (v + g.box.min[i]) / 2));
  const shared = { transparent: false, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.BackSide };

  // --- absorb: a multiply blend (dst x src), alpha kept
  const absorbMat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: ABSORB_FRAG, ...shared,
    uniforms: { ...layerU(), uKeep: { value: Array.from({ length: MAX_KEEP }, () => new THREE.Vector4(0, 0, 0, 0)) }, uKeepN: { value: 0 } },
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  absorbMat.name = 'deep-dust-absorb';
  absorbMat.defines = { GAS_ABSORB: '' };   // it absorbs (gasmat.js's flag for a material that darkens what is behind it)
  const absorb = new THREE.Mesh(geo, absorbMat);
  absorb.name = `${group.name}-dust-shells`; // the contract's draw-order check knows a deep mesh by `-shells`
  absorb.frustumCulled = false;
  absorb.renderOrder = -0.9;                 // after the stars and the photographs (-1), before its own light
  sky.add(absorb);

  // --- light: additive, after the absorb
  let lightMat = null, lightMesh = null;
  if (g.hasLight) {
    const ph = g.phase;
    lightMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: LIGHT_FRAG, ...shared, blending: THREE.AdditiveBlending,
      uniforms: {
        ...layerU(), uDust: absorbMat.uniforms.uDust, uN: absorbMat.uniforms.uN, uLight: { value: lightTex || blank }, uGain: { value: 1 },
        uStar: { value: V3(ph && ph.star ? ph.star.pos : [0, 0, 0]) }, uPhase: { value: V3(ph ? [ph.g, ph.lo, ph.hi] : [0, 1, 1]) },
      },
    });
    lightMat.name = 'deep-dust-light';
    lightMesh = new THREE.Mesh(geo, lightMat);
    lightMesh.name = `${group.name}-light-shells`;
    lightMesh.frustumCulled = false;
    lightMesh.renderOrder = -0.89;
    sky.add(lightMesh);
  }

  // --- its own star(s)
  let starMat = null, starPts = null, starGeo = null;
  if (g.stars.length) {
    starGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(3 * g.stars.length), star = new Float32Array(4 * g.stars.length);
    g.stars.forEach((s, i) => { pos.set(s.pos, 3 * i); star.set([...tintOf(s.temp), s.v], 4 * i); });
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    starGeo.setAttribute('aStar', new THREE.Float32BufferAttribute(star, 4));
    starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, ...shared, side: THREE.FrontSide, blending: THREE.AdditiveBlending,
      uniforms: { uCam: camU, uDistLy: { value: g.distanceLy }, uPixelRatio: { value: 1 }, uShare: { value: 0 }, uGain: { value: 1 } },
    });
    starMat.name = 'deep-dust-star';
    starPts = new THREE.Points(starGeo, starMat);
    starPts.name = `${group.name}-stars`;
    starPts.frustumCulled = false;
    starPts.renderOrder = -0.88;
    sky.add(starPts);
  }
  const twinId = (sid) => `${id}:${sid}`;
  const holesOff = () => { for (const s of g.stars) setExtraHole(twinId(s.id), null); };

  let level = 0, levelShare = 0, samples = 8, tierNow = 1, slowMs = 0, cheap = false, palette = { ...pal0, gainIn: 1 }, last = { gas: 0, light: 1, photo: 0 }, kept = 0;
  const _inv = new THREE.Matrix4(), _id = new THREE.Matrix4(), _cam = new THREE.Vector3(), _tw = new THREE.Vector3();
  return {
    group,
    levels: [2, 3],
    // The cheap path (one lookup a layer) costs about what the holder it replaces does (internal spec 0076 W1-a's hook).
    latchSafe: true,
    card: { copy: COPY_BLOCK, drawn: { [profile.record]: (profile.drawn || ['reconstruction']).slice() } },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
      if (!group.visible) holesOff();
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) { basisFor = stage.worldId; placeSkyGroup(THREE, sky, env.record); }
      const tier = Number.isFinite(info.tier) ? info.tier : 1;
      tierNow = tier;
      const q = typeof env.quality === 'function' ? env.quality() || {} : {};
      cheap = !(tier >= 1) || !!q.latched;
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, photo: info.photo, viewH: vh });
      last = { ...sh, photo: Number(info.photo) || 0 };
      const dt = Number(info.dtMs) || 0;
      if (!(info.frozen || info.reduced)) slowMs = slowMs * 0.9 + dt * 0.1;
      samples = samplesFor({ tier, steps: level >= 3 ? info.steps : 0, cheap, slow: slowMs > 24 });
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (gain !== palette.gainIn) {
        palette = { ...paletteFor(gain, profile), gainIn: gain };
        for (const m of [absorbMat, lightMat]) if (m) { m.uniforms.uGamma.value = palette.gamma; m.uniforms.uSat.value = palette.saturation; }
      }
      const look = info.look || 'film';
      const keepDust = drawnUnder(look, UNDER_MEASURED.dust) ? 1 : 0, keepLight = drawnUnder(look, UNDER_MEASURED.light) ? 1 : 0;
      const ready = dustState === 'ready' && lightState === 'ready';
      absorbMat.uniforms.uShare.value = ready && g.hasDust ? sh.gas * keepDust : 0;
      absorbMat.uniforms.uN.value = samples;
      absorb.visible = absorbMat.uniforms.uShare.value > 0.002;
      if (lightMat) {
        lightMat.uniforms.uShare.value = ready ? sh.gas * keepLight : 0;
        lightMat.uniforms.uGain.value = palette.gain * sh.light;
        lightMesh.visible = lightMat.uniforms.uShare.value > 0.002;
      }
      if (starMat) {
        starMat.uniforms.uShare.value = sh.gas;
        starMat.uniforms.uPixelRatio.value = (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1;
        starPts.visible = starMat.uniforms.uShare.value > 0.002;
      }
      if (!info.camera) return;
      const cam = cameraInSky(group, sky, info.camera, _cam, _inv, _id);
      camU.value.copy(cam);
      const P = info.camera.projectionMatrix.elements;
      const pixAng = 2 / Math.max(1, P[5] * vh);
      // the catalogue's stars in front of the dust from here: their discs kept clear
      const act = listState === 'ready' && absorb.visible ? keepActive(g, keepList, [cam.x, cam.y, cam.z]) : [];
      const ku = absorbMat.uniforms.uKeep.value;
      act.forEach((s, i) => ku[i].set(s.pos[0], s.pos[1], s.pos[2], s.radiusPx * pixAng));
      absorbMat.uniforms.uKeepN.value = act.length;
      kept = act.length;
      // a star the hero draws itself: the catalogue's copy steps aside (scene/starholes.js)
      if (starPts) {
        info.camera.updateMatrixWorld();
        for (const s of g.stars) {
          const km = twins[s.id];
          const k = starMat.uniforms.uShare.value;
          if (Array.isArray(km) && k > 0.003 && stage.toSceneInto({ x: km[0] * 9460730472580.8, y: km[1] * 9460730472580.8, z: km[2] * 9460730472580.8 }, 'sun-inertial', _tw, stage.tMs)) {
            _tw.applyMatrix4(info.camera.matrixWorldInverse).normalize();
            setExtraHole(twinId(s.id), { dir: [_tw.x, _tw.y, _tw.z], radius: 16 * pixAng, k });
          } else setExtraHole(twinId(s.id), null);
        }
      }
    },
    ready: () => lightState !== 'loading' && dustState !== 'loading' && listState !== 'loading',
    stats: () => ({
      level, share: Math.round(last.gas * 100) / 100, photo: Math.round(last.photo * 100) / 100, light: lightState, dust: dustState, list: listState,
      path: cheap ? 'closed' : 'march', samples, tier: tierNow, palette: palette.mode, kept,
      meshes: 1 + (lightMesh ? 1 : 0) + (starPts ? 1 : 0), textures: (lightTex ? 1 : 0) + (dustTex ? 1 : 0),
      bytes: geo.getAttribute('position').array.byteLength + (lightTex ? Math.round(512 * 512 * 4 * 4 / 3) : 0) + (dustTex ? Math.round(512 * 512 * 4 * 4 / 3) : 0),
      camLy: [Math.round(_cam.x * 100) / 100, Math.round(_cam.y * 100) / 100, Math.round(_cam.z * 100) / 100],
    }),
    dispose() {
      holesOff();
      geo.dispose(); absorbMat.dispose();
      if (lightMat) lightMat.dispose();
      if (starMat) { starMat.dispose(); starGeo.dispose(); }
      for (const t of [lightTex, dustTex]) if (t) t.dispose();
      blank.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}
