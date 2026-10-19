// scene/deep/dustsheet.js -- dark and reflection nebulae as SHEETS of dust in depth: the Horsehead against IC 434, the
// Coalsack against the Milky Way, M78 and the Iris lit by their stars, and any dust whose profile says `part: dust`
// (internal spec 0076 stage W3-c, internal #784, #806; spec 0075 task 28). Fetched by scene/deep/deepsky.js when the
// nebula is near (scene/deep/heroes.js); never at boot. scene/deep/helix.js says what a hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_dustsheet.mjs: sheetOf, ccm, reddening, decodeTau, grazeOf, reliefAt, closedJs, transmissionTo,
//   hg, phaseFactor, coverSheet, capLight, orderOf, gridFor, keepRadiusPx, keepActive, starLook, SHAPE, UNDER_MEASURED, COPY_BLOCK.
//
// ONE MODULE FOR EVERY SHEET. Nothing here names an object: registry/deepsky-heroes/<id>.yaml gives up to three LAYERS
// parallel to the sky, each at its depth (z, light-years toward the Sun): the dust in FRONT (the dust map's red
// channel), the LIGHT (a photograph's glow, or the starlight a reflection nebula scatters), and the dust BEHIND (the
// map's green channel). scripts/build_deep_sheets.py bakes the maps; the module docstring there gives the rule that
// reads an optical depth from a picture's darkness.
//
// HOW IT IS DRAWN (no pass, no render target, no bloom; gasmat.js COLOUR_POLICY). Each layer is ONE MESH, a sheet over
// its picture's footprint in the SKY FRAME (x west, y north, z toward the Sun, light-years about the record's place),
// one draw call each, and the hero's star a Points draw: at most four. Each frame they are drawn in the order of their
// depth from the camera, far to near (painter's order), so each one acts on what is behind it:
//   dust    a MULTIPLY blend in its own material (CustomBlending: Zero, SrcColor): every pixel drawn before it (the
//           catalogue's stars, the Milky Way, the photographs, a light layer behind it) is multiplied by the dust's
//           transmission, per channel by the Cardelli, Clayton & Mathis (1989) law, so what is behind is dimmed AND
//           reddened, and nothing is added: DUST ABSORBS; IT NEVER GLOWS. The transmission is applied to the display
//           values as T^(1/2.2) (the framebuffer holds display values). Its optical depth is a column along OUR line,
//           so a ray at angle theta to it crosses tau / |cos theta|, capped and faded at grazing (SHAPE). The sheet's
//           relief: it is lifted away from the light by up to `half_ly` where it is thickest (sqrt(tau / tau_max)), in
//           its vertex shader, so turned it is a lumpy cloud, not a flat card. A catalogue star IN FRONT of the dust
//           (scripts/build_deep_sheets.py lists them) is kept clear: a disc its own size is left round each one on the
//           camera's side of the dust.
//   light   additive: the light layer's glow; the dust in front of it, drawn after it, dims and reddens it. For a
//           reflection nebula it is weighted by a Henyey-Greenstein phase function of the angle star - dust - eye
//           against that angle seen from here (1 on our line). The light is only where the photograph has it.
//   star    a reflection nebula's own star, at its SIMBAD place and a stated depth; the catalogue's copy steps aside
//           while it is drawn (scene/starholes.js setExtraHole), as orion.js does for theta2 Ori A.
// From our line light x transmission is the picture (the bake's rule), at every tier; where the app shows that
// photograph the hero gives way to it by its own share (info.photo). The tier sets only the sheets' grid (gridFor).
//
// LOOKS. Nothing in it moves. The light has the exposure's own stretch, as the photographs have. Under Measured nothing
// changes: every part is a reconstruction of measured numbers or a stated model, and the card says which.

import { stage } from '../stage.js';
import { drawnUnder } from '../exposure.js';
import { STAR_LIGHT_GLSL } from '../stretch.js';
import { kelvinToRgb, STAR_CHROMA } from '../starfield.js';
import { setExtraHole } from '../starholes.js';
import {
  part, offsetLy, uvOf, featherOf, paletteFor, sharesFor, placeSkyGroup, loadMap, cameraInSky, COMMON_GLSL, COPY_BLOCK,
} from './remnant.js';

export { COPY_BLOCK };
export const UNDER_MEASURED = { dust: 'same', light: 'same', motion: 'still' };

const MAX_KEEP = 48;       // catalogue stars kept clear of the dust at once
const STARS_URL = '../../../images/deep/sheets/stars.json';
const GRID_BY_TIER = [32, 64, 96];
// ONE table: the GLSL below is written from it.
export const SHAPE = {
  slantCap: 0.3,      // 1 / |cos| stops at cos 0.3 (3.3 times): an edge-on sheet is a line, not a blaze
  grazeFrom: 0.02,    // and it fades out below cos 0.02 to 0.10: the thinnest thing seen exactly edge on is nothing
  grazeTo: 0.10,
  shoulder: 1.0,      // a soft shoulder over 1 (as remnant.js)
  keepFeather: 0.35,  // a kept star's disc is feathered over this fraction of its radius
  pad: 0.05,          // ly over each layer's highest point
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
    // the photograph's own brightest display luminance (the bake's peak_p99): a sheet's light never passes it
    peak: Number(li.peak) > 0 ? Number(li.peak) : 1,
    // below this tier the hero steps aside and main's photograph, glow and holder draw the object (`min_tier`)
    minTier: Number.isFinite(Number(fr.min_tier)) ? Number(fr.min_tier) : 0,
  };
}

/**
 * The slant a sheet's column is crossed at, |cos| = mu to our line: 1 / max(mu, slantCap), faded out below grazeTo, so
 * an edge-on sheet is a line, never a blaze. 1 face on. Pure.
 */
export function grazeOf(mu) {
  return smooth(mu, SHAPE.grazeFrom, SHAPE.grazeTo) / Math.max(mu, SHAPE.slantCap);
}

/**
 * A sheet's picture edge: feathered from edge[0] to edge[1] of its half-size on a squircle (q^4), the GLSL's
 * coverSheet (cheaper than remnant.js's cube root, the same kind of edge). Pure.
 */
export function coverSheet(u, v, edge = [0.88, 0.995]) {
  const qx = Math.abs(u * 2 - 1), qy = Math.abs(v * 2 - 1);
  const e = Math.sqrt(Math.sqrt(qx ** 4 + qy ** 4));
  const f = 1 - smooth(e, edge[0], edge[1]);
  return f * f;
}

/**
 * THE LIGHT NEVER OUTSHINES THE PICTURE (photometric discipline; ring.js capLight for M57 does the same): turned, the
 * slant and the phase function could lift a sheet's light past the photograph's brightest, so its luminance is held
 * to `peak` (the light map's 99th percentile), colour kept. Pure; the GLSL's cap is the same.
 */
export function capLight(rgb, peak) {
  const y = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return y > peak ? rgb.map((x) => x * peak / y) : rgb.slice();
}

/** A dust sheet's relief where its optical depth is tau: lifted away from the light by up to `half` (ly). Pure. */
export function reliefAt(half, tau, tauMax) {
  return half * Math.sqrt(clamp(tau / Math.max(tauMax, 1e-6), 0, 1));
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

/**
 * What the sheets do along a ray: each layer met at its middle plane in the ray's order, its column crossed at
 * grazeOf's slant (the meshes' fragment shaders; the relief, which moves a dust sheet along z, is not modelled here).
 * `tau(u, v)` -> [front, back] optical depths in V; `light(u, v)` -> the stretched picture. Returns {T: [r, g, b]
 * transmission, C: [r, g, b] light, before the share and the gain}. Pure.
 */
export function closedJs(g, ro, rd, { tau = () => [0, 0], light = () => [0, 0, 0] } = {}) {
  const T = [1, 1, 1], C = [0, 0, 0];
  if (Math.abs(rd[2]) < 1e-9) return { T, C };
  const slant = grazeOf(Math.abs(rd[2]));
  const order = rd[2] < 0 ? g.layers : [...g.layers].reverse();
  for (const L of order) {
    const t = (L.z - ro[2]) / rd[2];
    if (!(t > 0)) continue;
    const p = [ro[0] + rd[0] * t, ro[1] + rd[1] * t, L.z];
    if (p[0] < g.box.min[0] || p[0] > g.box.max[0] || p[1] < g.box.min[1] || p[1] > g.box.max[1]) continue;
    if (L.kind === 'light') {
      const [u, v] = g.uvL.at(p[0], p[1]);
      const w = coverSheet(u, v, g.edgeL) * slant * phaseFactor(g.phase, p, ro);
      const e = capLight(light(u, v).map((x) => x * w), g.peak);
      for (let c = 0; c < 3; c++) C[c] += T[c] * e[c];
    } else {
      const [u, v] = g.uvD.at(p[0], p[1]);
      const tv = tau(u, v)[L.kind === 'front' ? 0 : 1] * coverSheet(u, v, g.edgeD) * slant;
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
  return closedJs(gg, cam, rd, opts).T;
}

/**
 * The draw order: the layers (and the star, `{kind: 'star', z}`) from the farthest from the camera to the nearest, by
 * their middle planes' z against the camera's. Returns the items in that order. Pure.
 */
export function orderOf(items, camZ) {
  return [...items].sort((a, b) => Math.abs(b.z - camZ) - Math.abs(a.z - camZ));
}

/** A sheet's grid, vertices a side: 32 on T0 and under the latch, 64 on T1, 96 on T2. Pure. */
export function gridFor({ tier = 1, cheap = false } = {}) {
  return cheap ? GRID_BY_TIER[0] : GRID_BY_TIER[clamp(Math.trunc(tier) || 0, 0, 2)];
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

// A sheet: a grid over the picture's (u, v), placed by the uv map's inverse, lifted by its relief for dust.
const SHEET_VERT = /* glsl */ `
attribute vec2 aUv;         // the picture's (u, v) of this vertex
uniform vec3 uCorner;       // the sky frame's (x, y) at uv (0, 0), and z: the layer's middle
uniform vec2 uAlongU;       // (x, y) per unit u
uniform vec2 uAlongV;       // (x, y) per unit v
uniform sampler2D uDust;
uniform float uTauMax;
uniform float uRelief;      // ly at full optical depth, signed (away from the light)
uniform float uChannel;     // 0: red (front), 1: green (behind)
varying vec2 vUv;
varying vec3 vPos;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vUv = aUv;
  vec2 xy = uCorner.xy + aUv.x * uAlongU + aUv.y * uAlongV;
  float z = uCorner.z;
  if ( uRelief != 0.0 ) {
    vec2 t = texture2D( uDust, aUv ).rg;
    float v = uChannel < 0.5 ? t.r : t.g;
    z += uRelief * v;          // sqrt(tau / tau_max) is the channel's own value
  }
  vPos = vec3( xy, z );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( vPos, 1.0 );
  #include <logdepthbuf_vertex>
}
`;

const SHEET_COMMON = /* glsl */ `
uniform vec3 uCam;          // the camera in the sky frame, ly (CPU, float64, each frame)
uniform vec2 uEdge;         // the picture's edge feather (coverAt)
uniform float uShare;
varying vec2 vUv;
varying vec3 vPos;
${COMMON_GLSL}
float grazeOf( float mu ) {
  return smoothstep( ${f3(SHAPE.grazeFrom)}, ${f3(SHAPE.grazeTo)}, mu ) / max( mu, ${f3(SHAPE.slantCap)} );
}
float coverSheet( vec2 uv, vec2 edge ) {
  vec2 q = abs( uv * 2.0 - 1.0 );
  q *= q;
  float f = 1.0 - smoothstep( edge.x, edge.y, sqrt( sqrt( q.x * q.x + q.y * q.y ) ) );
  return f * f;
}
`;

// DUST: the multiply. The transmission per channel, raised to 1 / 2.2 (display values), kept stars left clear.
const ABSORB_FRAG = /* glsl */ `
${SHEET_COMMON}
uniform sampler2D uDust;    // R: sqrt(tau_front / tau_max), G: sqrt(tau_back / tau_max)
uniform float uTauMax;
uniform float uChannel;
uniform vec3 uK;            // A(lambda) / A(V) at red, green and blue (Cardelli, Clayton & Mathis 1989)
uniform vec4 uKeep[ ${MAX_KEEP} ];   // xyz: a kept star in the sky frame; w: the cosine of its disc's radius
uniform int uKeepN;
uniform float uKeepIn;      // the feather: the disc's inner cosine is 1 - (1 - w) x this
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 rd = normalize( vPos - uCam );
  vec2 t = texture2D( uDust, vUv ).rg;
  float v = uChannel < 0.5 ? t.r : t.g;
  float tau = uTauMax * v * v * coverSheet( vUv, uEdge ) * grazeOf( abs( rd.z ) );
  if ( tau < 0.002 ) discard;
  // what is behind keeps T = exp(-tau k) of its light; on display values that is T^(1/2.2) = exp(-tau k / 2.2)
  float keep = 0.0;
  for ( int i = 0; i < ${MAX_KEEP}; i++ ) {
    if ( i >= uKeepN ) break;
    float c = dot( normalize( uKeep[ i ].xyz - uCam ), rd );
    float w = uKeep[ i ].w;
    keep = max( keep, smoothstep( w, 1.0 - ( 1.0 - w ) * uKeepIn, c ) );
  }
  vec3 Td = mix( exp( -tau * uK * ${f3(1 / 2.2)} ), vec3( 1.0 ), keep );   // T^(1/2.2), one exp
  gl_FragColor = vec4( mix( vec3( 1.0 ), Td, uShare ), 1.0 );
}
`;

// LIGHT: additive, phase-weighted for a reflection nebula.
const LIGHT_FRAG = /* glsl */ `
${SHEET_COMMON}
uniform sampler2D uLight;   // display values (gasmat.js COLOUR_POLICY)
uniform float uGain;
uniform vec3 uStar;         // the lighting star, sky frame (uPhase.x == 0: no phase function)
uniform vec3 uPhase;        // g, the factor's floor and ceiling
uniform float uPeak;        // the photograph's brightest luminance, in the exposure's stretch (capLight)
#include <common>
#include <logdepthbuf_pars_fragment>
float hg( float mu, float g ) { float d = 1.0 + g * g - 2.0 * g * mu; return ( 1.0 - g * g ) / ( d * sqrt( d ) ); }
void main() {
  #include <logdepthbuf_fragment>
  if ( uShare <= 0.0 ) discard;
  vec3 rd = normalize( vPos - uCam );
  float w = coverSheet( vUv, uEdge ) * grazeOf( abs( rd.z ) );
  if ( w <= 0.0 ) discard;
  if ( abs( uPhase.x ) > 1e-4 ) {
    vec3 i = normalize( vPos - uStar );
    w *= clamp( hg( dot( i, -rd ), uPhase.x ) / hg( i.z, uPhase.x ), uPhase.y, uPhase.z );
  }
  vec3 col = stretchLight( texture2D( uLight, vUv ).rgb ) * w;
  float y = dot( col, vec3( 0.2126, 0.7152, 0.0722 ) );
  if ( y > uPeak ) col *= uPeak / y;     // never brighter than the photograph's own brightest
  col *= uGain * uShare;
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

/** The shader sources, for tests/test_dustsheet.mjs (closedJs mirrors the sheets). */
export const SHADERS = { sheetVertex: SHEET_VERT, absorb: ABSORB_FRAG, light: LIGHT_FRAG, starVertex: STAR_VERT, star: STAR_FRAG, common: SHEET_COMMON };

// -------------------------------------------------------------------------------------- the hero

const fileUrl = (path) => `../../../${String(path || '').replace(/^site\//, '')}`;

/** A grid of n x n vertices over (u, v) in [0, 1]^2, two triangles a cell. */
function gridGeometry(THREE, n) {
  const uv = new Float32Array(2 * n * n), pos = new Float32Array(3 * n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) uv.set([i / (n - 1), j / (n - 1)], 2 * (j * n + i));
  const idx = [];
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i; idx.push(a, a + 1, a + n, a + 1, a + n + 1, a + n); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); // placed in the vertex shader
  geo.setAttribute('aUv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
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
  const camU = { value: new THREE.Vector3(0, 0, 50) };
  const dustU = { value: dustTex || blank };
  const shared = { transparent: false, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide };
  const lightZ = (g.layers.find((L) => L.kind === 'light') || {}).z;
  let gridN = gridFor({ tier: 1 });
  let geo = gridGeometry(THREE, gridN);
  // one mesh a layer
  const items = g.layers.map((L) => {
    const uv = L.kind === 'light' ? g.uvL : g.uvD;
    const c0 = uv.xyOf(0, 0), cu = uv.xyOf(1, 0), cv = uv.xyOf(0, 1);
    const sheetU = {
      uCam: camU, uCorner: { value: new THREE.Vector3(c0[0], c0[1], L.z) },
      uAlongU: { value: new THREE.Vector2(cu[0] - c0[0], cu[1] - c0[1]) }, uAlongV: { value: new THREE.Vector2(cv[0] - c0[0], cv[1] - c0[1]) },
      uDust: dustU, uTauMax: { value: g.tauMax }, uChannel: { value: L.kind === 'back' ? 1 : 0 }, uShare: { value: 0 },
      uEdge: { value: new THREE.Vector2(...(L.kind === 'light' ? g.edgeL : g.edgeD)) },
      uGamma: { value: pal0.gamma }, uSat: { value: pal0.saturation },
      // a dust sheet is lifted away from the light (toward the Sun if there is none)
      uRelief: { value: L.kind === 'light' ? 0 : (Number.isFinite(lightZ) && L.z < lightZ ? -1 : 1) * L.half },
    };
    let mat;
    if (L.kind === 'light') {
      const ph = g.phase;
      mat = new THREE.ShaderMaterial({
        vertexShader: SHEET_VERT, fragmentShader: LIGHT_FRAG, ...shared, blending: THREE.AdditiveBlending,
        uniforms: { ...sheetU, uLight: { value: lightTex || blank }, uGain: { value: 1 },
          uStar: { value: new THREE.Vector3(...(ph && ph.star ? ph.star.pos : [0, 0, 0])) }, uPhase: { value: new THREE.Vector3(...(ph ? [ph.g, ph.lo, ph.hi] : [0, 1, 1])) },
          uPeak: { value: g.peak ** pal0.gamma } },
      });
      mat.name = 'deep-dust-light';
    } else {
      mat = new THREE.ShaderMaterial({
        vertexShader: SHEET_VERT, fragmentShader: ABSORB_FRAG, ...shared,
        uniforms: { ...sheetU, uK: { value: new THREE.Vector3(...g.k) }, uKeep: { value: Array.from({ length: MAX_KEEP }, () => new THREE.Vector4(0, 0, 0, 1)) }, uKeepN: { value: 0 }, uKeepIn: { value: SHAPE.keepFeather } },
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
        blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
      });
      mat.name = 'deep-dust-absorb';
      mat.defines = { GAS_ABSORB: '' };   // it absorbs (gasmat.js's flag for a material that darkens what is behind it)
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `${group.name}-${L.kind}-shells`; // the contract's draw-order check knows a deep mesh by `-shells`
    mesh.frustumCulled = false;
    mesh.renderOrder = -0.9;
    sky.add(mesh);
    return { kind: L.kind, z: L.z, mesh, mat };
  });
  const absorbs = items.filter((it) => it.kind !== 'light');

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
    starPts.renderOrder = -0.9;
    sky.add(starPts);
  }
  const drawItems = starPts ? [...items, { kind: 'star', z: g.stars[0].pos[2], mesh: starPts }] : items;
  const twinId = (sid) => `${id}:${sid}`;
  const holesOff = () => { for (const s of g.stars) setExtraHole(twinId(s.id), null); };

  let stepped = false, level = 0, levelShare = 0, tierNow = 1, cheap = false, palette = { ...pal0, gainIn: 1 }, last = { gas: 0, light: 1, photo: 0 }, kept = 0, order = [];
  const _inv = new THREE.Matrix4(), _id = new THREE.Matrix4(), _cam = new THREE.Vector3(), _tw = new THREE.Vector3();
  return {
    group,
    levels: [2, 3],
    // One lookup a pixel, only where a sheet is: it costs about what the holder it replaces does (spec 0076 W1-a's hook).
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
      // below the profile's min_tier the hero steps aside for good on this device: its line's stub says not shipped,
      // and the coordinator draws the object as main does (the photograph, the glow, the holder)
      if (tier < g.minTier) {
        if (env.stub) env.stub.shipped = false;
        for (const it of items) { it.mat.uniforms.uShare.value = 0; it.mesh.visible = false; }
        if (starPts) starPts.visible = false;
        stepped = true;
        return;
      }
      const n = gridFor({ tier, cheap });
      if (n !== gridN) { const old = geo; gridN = n; geo = gridGeometry(THREE, n); for (const it of items) it.mesh.geometry = geo; old.dispose(); }
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, photo: info.photo, viewH: vh });
      last = { ...sh, photo: Number(info.photo) || 0 };
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (gain !== palette.gainIn) {
        palette = { ...paletteFor(gain, profile), gainIn: gain };
        for (const it of items) {
          it.mat.uniforms.uGamma.value = palette.gamma; it.mat.uniforms.uSat.value = palette.saturation;
          if (it.mat.uniforms.uPeak) it.mat.uniforms.uPeak.value = g.peak ** palette.gamma; // the peak in the light's own stretch
        }
      }
      const look = info.look || 'film';
      const keepDust = drawnUnder(look, UNDER_MEASURED.dust) ? 1 : 0, keepLight = drawnUnder(look, UNDER_MEASURED.light) ? 1 : 0;
      const ready = dustState === 'ready' && lightState === 'ready';
      for (const it of items) {
        const u = it.mat.uniforms;
        u.uShare.value = ready ? sh.gas * (it.kind === 'light' ? keepLight : keepDust) : 0;
        if (it.kind === 'light') u.uGain.value = palette.gain * sh.light;
        it.mesh.visible = u.uShare.value > 0.002;
      }
      if (starMat) {
        starMat.uniforms.uShare.value = sh.gas;
        starMat.uniforms.uPixelRatio.value = (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1;
        starPts.visible = starMat.uniforms.uShare.value > 0.002;
      }
      if (!info.camera) return;
      const cam = cameraInSky(group, sky, info.camera, _cam, _inv, _id);
      camU.value.copy(cam);
      // painter's order: far to near, so each dust sheet multiplies what is behind it
      order = orderOf(drawItems, cam.z);
      order.forEach((it, i) => { it.mesh.renderOrder = -0.9 + 0.01 * i; });
      const P = info.camera.projectionMatrix.elements;
      const pixAng = 2 / Math.max(1, P[5] * vh);
      // the catalogue's stars in front of the dust from here: their discs kept clear
      const act = listState === 'ready' && absorbs.some((it) => it.mesh.visible) ? keepActive(g, keepList, [cam.x, cam.y, cam.z]) : [];
      for (const it of absorbs) {
        const ku = it.mat.uniforms.uKeep.value;
        act.forEach((s, i) => ku[i].set(s.pos[0], s.pos[1], s.pos[2], Math.cos(s.radiusPx * pixAng)));
        it.mat.uniforms.uKeepN.value = act.length;
      }
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
      path: stepped ? 'stepped aside (below min_tier)' : 'sheets', grid: gridN, tier: tierNow, cheap, palette: palette.mode, kept, order: order.map((it) => it.kind),
      meshes: items.length + (starPts ? 1 : 0), textures: (lightTex ? 1 : 0) + (dustTex ? 1 : 0),
      bytes: items.length * gridN * gridN * 20 + (lightTex ? Math.round(512 * 512 * 4 * 4 / 3) : 0) + (dustTex ? Math.round(512 * 512 * 4 * 4 / 3) : 0),
      camLy: [Math.round(_cam.x * 100) / 100, Math.round(_cam.y * 100) / 100, Math.round(_cam.z * 100) / 100],
    }),
    dispose() {
      holesOff();
      geo.dispose();
      for (const it of items) it.mat.dispose();
      if (starMat) { starMat.dispose(); starGeo.dispose(); }
      for (const t of [lightTex, dustTex]) if (t) t.dispose();
      blank.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}
