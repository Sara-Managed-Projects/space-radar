// scene/deep/globular.js -- star clusters as stars (internal spec 0076 W3-a; internal #819, the globulars, and
// #871, the open clusters). One deep layer for both kinds: scene/deep/deepsky.js builds it under its `0076 W3-a`
// anchor on every rung of the ladder, the first time a rung is entered, never at boot.
//
//   createLayer(THREE, env) -> { group, frame(info), ready(), stats(), shares(), taken(id), dispose() }
//     env  = { records(), recordById(id), radiusPx(id), quality(), pictureShare(id), on(), load?(), loadMembers?(), base? }
//     info = { camera, renderer, stage, gain, visible }
//   Pure, for tests/test_globular.mjs: kingDensity, kingSurface, kingTable, sampleRadius, giantCount, sampleGlobular,
//   visibleLight, parseMembers, membersOf, seedOf, mulberry32, fadeFor, POINTS, MAX_DRAWN, FROM_PX, FULL_PX, LF
//
// WHY. A globular cluster was a glow with grain (scene/dsoglow.js `globular`): from close it was a smooth ball with
// no stars in it, and from inside it was nothing. An open cluster but four was a haze with stand-in points that
// were not its stars. Both are now stars.
//
// GLOBULARS: A MODEL OF ITS KIND, FROM ITS OWN CATALOGUE NUMBERS. Harris (1996, VizieR VII/202) gives each of the
// map's 33 its core radius rc and its concentration c = log10(rt / rc); at the map's distance for it those are a
// core and a tidal radius in light-years. The stars are placed by King's (1962, AJ 67, 471, eq. 27) density in
// space for that rc and rt -- a dense core and a halo thinning to nothing at rt, so the two are distinct because
// the catalogue says they are -- seeded by the record's id, so every visit draws the same stars. Their number and
// brightness are a model: stars brighter than the old main-sequence turn-off (LF.tip to LF.cut, absolute V), with
// a luminosity function rising 0.3 dex a magnitude, and together LF.light of the cluster's integrated light MVt;
// near its horizontal-branch magnitude a share of them sit on the horizontal branch, blue in the proportion its
// HBR says. Their colours are illustrative. So each point is one plausible giant, never a "star" carrying the
// light of thousands: from inside the outskirts the sky is what so many giants would make, not a wall of light.
// The rest of the light -- the faint stars no point stands for -- stays the glow and the holder, stepped back by
// exactly the light the points draw at the camera's distance (shares(), visibleLight): the sum is the cluster.
//
// OPEN CLUSTERS: THEIR OWN MEMBERS. scripts/build_deep_clusters.py keeps, for 36 of them, the Gaia DR3 members
// of Hunt & Reffert (2023, VizieR J/A+A/673/A114) with a membership probability of at least 0.5 inside the
// tidal radius (the manifest's `cuts`), less the stars the map's own catalogue already draws (scene/stars3d.js;
// the Pleiades', the Beehive's and the Southern Pleiades' bright stars are gathered there, scene/clusters.js).
// Each keeps its measured direction; its depth is its own parallax where that is good to a quarter of the
// cluster's half-member radius, else modelled (the build script says how), and the flags say which. Their glow of
// a kind steps back in full: the members are the cluster's light.
//
// WHEN AND HOW MUCH. A cluster is drawn while its radius on screen is past FROM_PX, fully past FULL_PX (no pop:
// the glow fades as the stars come), at most MAX_DRAWN at once, the largest; one draw call each. Its points are
// built once per tier (POINTS) and sorted brightest first, so the frame latch keeps the brightest POINTS[0] by
// the draw range. A star's size and light are scene/stars3d.js's curve for its absolute magnitude at its distance
// from the camera, and fade out over the last magnitude before LIMIT_MAG. Nothing moves: no proper motion is
// drawn, under any look. Where a photograph of the cluster is drawn, its stars give way to it.

import { stage } from '../stage.js';
import { STAR_LIGHT_GLSL } from '../stretch.js';
import { starTint } from '../starfield.js';
import { COPY, t } from '../../copy/en.js';
import '../../copy/en.later.js';

/** Under the Measured look (scene/exposure.js MEASURED_RULES): the points are the record's model or its catalogue members, and nothing moves. */
export const UNDER_MEASURED = { stars: 'same', members: 'same' };
/** The card's words block (copy/en.later.js r12Clusters) and what is drawn, by kind (data/deepsky.js DRAWN_CLASSES). */
export const COPY_BLOCK = 'r12Clusters';
export const DRAWN = { globular: ['model'], open: ['catalogue'] };

/** Stars drawn for one globular, by tier (T0, T1, T2): the brightest of the model's, never more than it has. */
export const POINTS = [3000, 10000, 24000];
export const MAX_DRAWN = 3;
export const FROM_PX = 14;      // CSS px of the cluster's radius on screen: its stars start
export const FULL_PX = 48;      // and are fully drawn (the point glow is a soft dot until here)
export const KEEP_MS = 10000;   // a cluster not drawn this long gives its buffers back
export const LIMIT_MAG = 7.5;   // the faintest apparent magnitude drawn, as scene/stars3d.js under Camera
/**
 * The globulars' luminosity function (a model, said on the card): absolute V from `tip` (the red-giant tip) to
 * `cut` (about the main-sequence turn-off), dlog10 N / dM = `slope`; together `light` of the cluster's light.
 * `hbShare` of the stars near the horizontal branch's magnitude sit on it.
 */
export const LF = { tip: -2.5, cut: 4.0, slope: 0.3, light: 0.6, hbShare: 0.35 };

const LY_KM = 9460730472580.8;
const PC_KM = 30856775814913.67;
const PC_LY = PC_KM / LY_KM;
const SUN_V = 4.83;
const SUN_INERTIAL = 'sun-inertial';
const ARCMIN = Math.PI / 10800;
const smooth = (x, a, b) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// ------------------------------------------------------------------------------------------- pure
/** A string's fixed 32-bit seed (FNV-1a). Pure. */
export function seedOf(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** A small seeded generator in [0, 1). Pure, deterministic. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** King (1962) eq. 27: the density in space at radius r for core rc and tidal radius rt, unnormalised; 0 past rt. Pure. */
export function kingDensity(r, rc, rt) {
  if (!(r >= 0) || r >= rt) return 0;
  const a = 1 + (rt / rc) ** 2;
  const z = Math.sqrt((1 + (r / rc) ** 2) / a);
  return (Math.acos(z) / z - Math.sqrt(1 - z * z)) / (Math.PI * rc * a ** 1.5 * z * z);
}
/** King (1962) eq. 14: the surface density at projected radius R, unnormalised; 0 past rt. Pure. */
export function kingSurface(R, rc, rt) {
  if (!(R >= 0) || R >= rt) return 0;
  const s = 1 / Math.sqrt(1 + (R / rc) ** 2) - 1 / Math.sqrt(1 + (rt / rc) ** 2);
  return s * s;
}
/** The cumulative number of stars inside r, on a grid dense at the centre: { r, cdf } with cdf rising 0 to 1. Pure. */
export function kingTable(rc, rt, n = 2048) {
  const r = new Float64Array(n + 1);
  const cdf = new Float64Array(n + 1);
  let prev = 0;
  for (let i = 0; i <= n; i++) {
    r[i] = rt * (i / n) ** 2;
    const f = kingDensity(r[i], rc, rt) * r[i] * r[i];
    if (i > 0) cdf[i] = cdf[i - 1] + 0.5 * (f + prev) * (r[i] - r[i - 1]);
    prev = f;
  }
  const total = cdf[n] || 1;
  for (let i = 0; i <= n; i++) cdf[i] /= total;
  return { r, cdf };
}
/** The radius below which a share u of the stars lie (the table inverted, linear between rows). Pure. */
export function sampleRadius(table, u) {
  const { r, cdf } = table;
  let lo = 0, hi = cdf.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cdf[m] < u) lo = m; else hi = m; }
  const span = cdf[hi] - cdf[lo];
  return r[lo] + (span > 0 ? (u - cdf[lo]) / span : 0) * (r[hi] - r[lo]);
}

/** The model's stars between LF.tip and LF.cut for a cluster of integrated absolute magnitude mvt. Pure. */
export function giantCount(mvt, lf = LF) {
  const L = 10 ** (-0.4 * (mvt - SUN_V));
  const ln10 = Math.LN10;
  const a = lf.slope * ln10, b = (lf.slope - 0.4) * ln10;
  const nInt = (Math.exp(a * lf.cut) - Math.exp(a * lf.tip)) / a;
  const lInt = (10 ** (0.4 * SUN_V)) * (Math.exp(b * lf.cut) - Math.exp(b * lf.tip)) / b;
  return lf.light * L / (lInt / nInt);
}

/**
 * One globular's stars, for a manifest row at the map's distance and a tier. Positions are light-years about
 * the centre, on the sun-inertial axes; sorted brightest first; `light` is each star's share of the cluster's
 * light in the same order. Seeded by the record id: the same stars on every visit. Pure.
 */
export function sampleGlobular(row, distLy, tier = 1, lf = LF) {
  const rcLy = row.rcArcmin * ARCMIN * distLy;
  const rtLy = rcLy * 10 ** row.c;
  const want = giantCount(row.mvt, lf);
  const cap = POINTS[Math.max(0, Math.min(POINTS.length - 1, tier | 0))];
  const n = Math.max(1, Math.min(cap, Math.round(want)));
  // Fewer than the model has: the brightest n, i.e. the function cut where n of them are brighter.
  const e = (m) => 10 ** (lf.slope * m);
  const mLim = n < want ? Math.log10(e(lf.tip) + (n / want) * (e(lf.cut) - e(lf.tip))) / lf.slope : lf.cut;
  const rnd = mulberry32(seedOf(String(row.id)));
  const table = kingTable(rcLy, rtLy);
  const blue = Number.isFinite(row.hbr) ? (row.hbr + 1) / 2 : 0.5;
  const feh = Number.isFinite(row.feh) ? row.feh : -1.5;
  const mHB = Number.isFinite(row.mHB) ? row.mHB : 0.6;
  const stars = [];
  for (let i = 0; i < n; i++) {
    let m = Math.log10(e(lf.tip) + rnd() * (e(mLim) - e(lf.tip))) / lf.slope;
    let bv;
    const onHB = m > mHB - 0.4 && m < mHB + 1.2 && rnd() < lf.hbShare;
    if (onHB) {
      const isBlue = rnd() < blue;
      m = mHB + (isBlue ? 0.25 : 0) + 0.12 * (rnd() - 0.5);
      bv = isBlue ? -0.05 + 0.2 * rnd() : 0.6 + 0.12 * rnd() + 0.15 * (feh + 1.5);
    } else {
      const up = (lf.cut - m) / (lf.cut - lf.tip);
      bv = 0.55 + 0.9 * up ** 1.6 + 0.3 * (feh + 1.5) + 0.06 * (rnd() - 0.5);
    }
    const r = sampleRadius(table, rnd());
    const cz = 2 * rnd() - 1, ph = 2 * Math.PI * rnd(), sz = Math.sqrt(1 - cz * cz);
    stars.push({ m, bv: Math.min(1.8, Math.max(-0.2, bv)), x: r * sz * Math.cos(ph), y: r * sz * Math.sin(ph), z: r * cz });
  }
  stars.sort((p, q) => p.m - q.m);
  const L = 10 ** (-0.4 * (row.mvt - SUN_V));
  const pos = new Float32Array(n * 3), absMag = new Float32Array(n), bv = new Float32Array(n), light = new Float64Array(n);
  stars.forEach((s, i) => { pos[i * 3] = s.x; pos[i * 3 + 1] = s.y; pos[i * 3 + 2] = s.z; absMag[i] = s.m; bv[i] = s.bv; light[i] = 10 ** (-0.4 * (s.m - SUN_V)) / L; });
  return { count: n, want, rcLy, rtLy, mLim, pos, absMag, bv, light };
}

/**
 * The share of the cluster's light the drawn stars show from `distPc`: those brighter than LIMIT_MAG there, the
 * last magnitude fading as the shader fades it, among the first `drawn` (the draw range). Pure.
 */
export function visibleLight(absMag, light, drawn, distPc, limit = LIMIT_MAG) {
  const mu = 5 * Math.log10(Math.max(1e-6, distPc) / 10);
  let sum = 0;
  for (let i = 0; i < Math.min(drawn, absMag.length); i++) {
    const m = absMag[i] + mu;
    if (m >= limit) break; // sorted brightest first
    sum += light[i] * (1 - smooth(m, limit - 1, limit));
  }
  return sum;
}

/** The members' file (scripts/build_deep_clusters.py): head and rows, checked. Pure. */
export function parseMembers(buffer) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SRCL') throw new Error(`clusters: not a members file (${magic})`);
  const version = dv.getUint32(4, true), count = dv.getUint32(8, true), stride = dv.getUint32(12, true);
  if (buffer.byteLength !== 16 + count * stride) throw new Error(`clusters: ${buffer.byteLength} bytes for ${count} rows of ${stride}`);
  return { version, count, stride, dv };
}
/** One open cluster's members as arrays (light-years about its centre, sun-inertial axes), brightest first. Pure. */
export function membersOf(file, row) {
  const n = row.count;
  const pos = new Float32Array(n * 3), absMag = new Float32Array(n), bv = new Float32Array(n), prob = new Float32Array(n), measured = new Uint8Array(n);
  const k = row.scaleLy / 32767;
  for (let i = 0; i < n; i++) {
    const o = 16 + (row.offset + i) * file.stride;
    pos[i * 3] = file.dv.getInt16(o, true) * k; pos[i * 3 + 1] = file.dv.getInt16(o + 2, true) * k; pos[i * 3 + 2] = file.dv.getInt16(o + 4, true) * k;
    absMag[i] = file.dv.getInt16(o + 6, true) / 1000;
    bv[i] = file.dv.getUint8(o + 8) / 100 - 0.5;
    prob[i] = file.dv.getUint8(o + 9) / 200;
    measured[i] = file.dv.getUint8(o + 10) & 1;
  }
  return { count: n, pos, absMag, bv, prob, measured };
}

/** How much of a cluster's stars is drawn at a radius on screen: 0 below FROM_PX, 1 past FULL_PX. Pure. */
export function fadeFor(radiusPx) { return smooth(radiusPx, FROM_PX, FULL_PX); }

// ------------------------------------------------------------------------------------------- the card
const groupDigits = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function rowsFor(kind, row, record, built) {
  const W = COPY[COPY_BLOCK];
  if (!W || !W.templates) return null;
  const T = W.templates;
  if (kind === 'globular') {
    // The catalogue's radii at the map's distance and the model's count: no sampling for a card.
    const rcLy = row.rcArcmin * ARCMIN * record.meta.distLy;
    const s = built || { want: giantCount(row.mvt), rcLy, rtLy: rcLy * 10 ** row.c };
    return [
      [T.starsLabel, t(T.globularStars, { n: groupDigits(Math.round(s.want)), rc: s.rcLy < 10 ? s.rcLy.toFixed(1) : groupDigits(s.rcLy), rt: groupDigits(s.rtLy) })],
      [T.lightLabel, t(T.globularLight, { pct: Math.round(LF.light * 100), mv: row.mvt.toFixed(1) })],
      [T.reviewLabel, T.review],
    ];
  }
  const h = row.hr23 || [];
  const depth = row.measuredDepth > 0 ? t(T.openDepthSome, { m: groupDigits(row.measuredDepth), k: groupDigits(row.count - row.measuredDepth) }) : T.openDepthNone;
  return [
    [T.starsLabel, t(row.inHyg > 0 ? T.openStarsHyg : T.openStars, { n: groupDigits(row.count), p: '0.5', h: groupDigits(row.inHyg), name: h.map((x) => x.name.replace(/_/g, ' ')).join(' and ') })],
    [T.depthLabel, depth],
  ];
}

// ------------------------------------------------------------------------------------------- shaders
const VERT = /* glsl */ `
attribute float aAbsMag;
attribute vec3 aColour;
uniform float uPixelRatio;
uniform float uGain;
uniform float uShare;
uniform float uUnitsPerPc;
uniform float uMagLimit;
varying vec3 vColour;
varying float vAlpha;
varying float vCore;
varying float vGlare;
varying float vGlow;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  // apparent magnitude at the camera, as scene/stars3d.js: M + 5 log10( d / 10 pc )
  float dpc = max( 1e-6, length( mv.xyz ) / uUnitsPerPc );
  float m = aAbsMag + 5.0 * log( dpc / 10.0 ) / log( 10.0 );
  float tt = clamp( ( 6.5 - m ) / 8.0, 0.0, 1.0 );
  float core = 1.0 + 5.0 * pow( tt, 1.6 );
  float glare = clamp( ( -1.5 - m ) / 6.0, 0.0, 1.0 );
  float glow = clamp( ( 2.5 - m ) / 4.0, 0.0, 1.0 );
  core *= 1.0 + 0.8 * glow;
  float size = core * ( 1.0 + 4.0 * glow ) + 26.0 * glare;
  gl_PointSize = size * uPixelRatio;
  vCore = core / size;
  vGlare = glare;
  vGlow = glow;
  // the last magnitude before the limit fades (no star pops in or out as the camera moves)
  vAlpha = ( 0.35 + 0.65 * tt ) * uGain * uShare * ( 1.0 - smoothstep( uMagLimit - 1.0, uMagLimit, m ) );
  vColour = aColour;
}
`;
const FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
varying float vCore;
varying float vGlare;
varying float vGlow;
#include <common>
${STAR_LIGHT_GLSL}
void main() {
  if ( vAlpha <= 0.003 ) discard;
  float d = length( gl_PointCoord - vec2( 0.5 ) );
  vec2 light = starLight( d, vCore, vGlow );
  float a = light.x + light.y;
  if ( vGlare > 0.0 ) {
    float e = 1.0 - clamp( d / 0.5, 0.0, 1.0 );
    a = max( a, vGlare * 0.8 * e * e );
  }
  if ( a <= 0.003 ) discard;
  gl_FragColor = vec4( mix( vColour, vec3( 1.0 ), 0.4 * light.x * max( vGlow, vGlare ) ), a * vAlpha );
  #include <colorspace_fragment>
}
`;

// ------------------------------------------------------------------------------------------- the layer
async function fetchJson(base, name) { const r = await fetch(String(new URL(`data/deep/${name}`, base))); if (!r.ok) throw new Error(`clusters: ${name}: HTTP ${r.status}`); return r.json(); }
async function fetchBin(base, name) { const r = await fetch(String(new URL(`data/deep/${name}`, base))); if (!r.ok) throw new Error(`clusters: ${name}: HTTP ${r.status}`); return r.arrayBuffer(); }

export function createLayer(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'deep-clusters';
  group.renderOrder = -1;
  const base = env.base || (typeof import.meta !== 'undefined' ? new URL('../../../', import.meta.url) : null);
  const state = { manifest: null, failed: null, members: null, membersFailed: null, membersLoading: null, calls: 0, bytes: 0, fileBytes: 0 };
  const rows = new Map();     // record id -> { kind, row }
  const built = new Map();    // record id -> { mesh, kind, count, tier, absMag, light, usedAt, share, taken, rPx }
  const taken = new Map();    // record id -> the share of its light the stars draw now (the glow and holder step back by it)
  const _c = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _col = new THREE.Color();

  const loading = Promise.resolve()
    .then(() => (env.load ? env.load() : fetchJson(base, 'clusters.json')))
    .then((man) => {
      state.manifest = man;
      state.fileBytes += JSON.stringify(man).length;
      for (const g of man.globulars || []) rows.set(`dso-${g.id}`, { kind: 'globular', row: g });
      for (const o of man.open || []) rows.set(`dso-${o.id}`, { kind: 'open', row: o });
      for (const id of rows.keys()) unstamped.add(id);
      stamp();
    })
    .catch((e) => { state.failed = String(e && e.message || e); console.warn('deep: the clusters did not load', e); });

  // The card: what is drawn for each, and its rows (ui/cardfacts.js reads `heroDrawn` and `heroCopy`). A record the
  // catalogue has not delivered yet is stamped when it arrives (frame() asks again now and then).
  const unstamped = new Set();
  let stampTick = 0;
  function stamp() {
    const W = COPY[COPY_BLOCK];
    for (const id of [...unstamped]) {
      const rec = env.recordById ? env.recordById(id) : null;
      if (!rec || !rec.meta) continue;
      const { kind, row } = rows.get(id);
      if (!rec.meta.heroDrawn) rec.meta.heroDrawn = DRAWN[kind].slice();
      if (!rec.meta.heroCopy) rec.meta.heroCopy = COPY_BLOCK;
      if (W && W.rows && !W.rows[id] && (kind === 'open' || Number.isFinite(rec.meta.distLy))) { const r = rowsFor(kind, row, rec, null); if (r) W.rows[id] = r; }
      unstamped.delete(id);
    }
  }

  function wantMembers() {
    if (state.members || state.membersFailed || state.membersLoading) return;
    state.membersLoading = Promise.resolve()
      .then(() => (env.loadMembers ? env.loadMembers() : fetchBin(base, 'clusters.bin')))
      .then((buf) => { state.members = parseMembers(buf); state.fileBytes += buf.byteLength; })
      .catch((e) => { state.membersFailed = String(e && e.message || e); console.warn('deep: the cluster members did not load', e); })
      .finally(() => { state.membersLoading = null; });
  }

  function material() {
    return new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: { uPixelRatio: { value: 1 }, uGain: { value: 1 }, uShare: { value: 0 }, uUnitsPerPc: { value: 1 }, uMagLimit: { value: LIMIT_MAG } },
      // Opaque list on purpose, like scene/stars3d.js: `transparent: true` would draw after Earth.
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
  }
  function build(id, entry, tier) {
    const rec = env.recordById ? env.recordById(id) : null;
    if (!rec || !rec.meta) return null;
    let a;
    if (entry.kind === 'globular') {
      if (!Number.isFinite(rec.meta.distLy)) return null;
      a = sampleGlobular(entry.row, rec.meta.distLy, tier);
    } else {
      if (!state.members) { wantMembers(); return null; }
      a = membersOf(state.members, entry.row);
      a.light = null;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(a.pos, 3));
    geo.setAttribute('aAbsMag', new THREE.BufferAttribute(a.absMag, 1));
    const col = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) {
      const rgb = starTint(a.bv[i]);
      _col.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
      col[i * 3] = _col.r; col[i * 3 + 1] = _col.g; col[i * 3 + 2] = _col.b;
    }
    geo.setAttribute('aColour', new THREE.BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    const mesh = new THREE.Points(geo, material());
    mesh.name = `deep-cluster-${id}`;
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = -1;
    mesh.visible = false;
    group.add(mesh);
    const bytes = a.count * 4 * 7;
    state.bytes += bytes;
    // The card's numbers are the ones drawn (a globular's count is the model's, its radii the catalogue's).
    const W = COPY[COPY_BLOCK];
    if (entry.kind === 'globular' && W && W.rows) { const r = rowsFor('globular', entry.row, rec, a); if (r) W.rows[id] = r; }
    return { mesh, kind: entry.kind, count: a.count, tier, absMag: a.absMag, light: a.light, usedAt: 0, share: 0, taken: 0, rPx: 0, bytes };
  }
  function drop(id) {
    const b = built.get(id);
    if (!b) return;
    group.remove(b.mesh);
    b.mesh.geometry.dispose();
    b.mesh.material.dispose();
    state.bytes -= b.bytes;
    built.delete(id);
  }
  /** The mesh's matrix: light-years on the sun-inertial axes about the centre, into the stage's scene units. */
  function place(b, rec) {
    if (!rec.pos || !stage.toSceneInto(rec.pos, SUN_INERTIAL, _c, stage.tMs)) return false;
    const k = 1e12; // km along each axis: a direction in float64's comfort
    const axis = (dx, dy, dz, out) => {
      if (!stage.toSceneInto({ x: rec.pos.x + dx * k, y: rec.pos.y + dy * k, z: rec.pos.z + dz * k }, SUN_INERTIAL, out, stage.tMs)) return false;
      out.sub(_c).normalize().multiplyScalar(LY_KM / stage.unitKm);
      return true;
    };
    if (!axis(1, 0, 0, _x) || !axis(0, 1, 0, _y) || !axis(0, 0, 1, _z)) return false;
    b.mesh.matrix.makeBasis(_x, _y, _z).setPosition(_c);
    b.mesh.matrixWorldNeedsUpdate = true;
    return true;
  }

  function frame(info = {}) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const on = info.visible !== false && (env.on ? env.on() !== false : true);
    taken.clear();
    state.calls = 0;
    if (!state.manifest) { for (const b of built.values()) b.mesh.visible = false; return; }
    if (unstamped.size && (stampTick++ % 60) === 0) stamp();
    const q = env.quality ? env.quality() : { tier: 1 };
    const tier = Math.max(0, Math.min(POINTS.length - 1, q.tier | 0));
    // The largest on screen past the start of the fade, at most MAX_DRAWN.
    const want = [];
    if (on) {
      for (const id of rows.keys()) {
        const rp = env.radiusPx ? env.radiusPx(id) || 0 : 0;
        if (rp >= FROM_PX) want.push([id, rp]);
      }
      want.sort((a, b) => b[1] - a[1]);
      want.length = Math.min(want.length, MAX_DRAWN);
    }
    const drawnIds = new Set();
    const camera = info.camera;
    let builds = 0; // one cluster built a frame: a 24 000-star globular is tens of milliseconds of sampling
    for (const [id, rp] of want) {
      const entry = rows.get(id);
      let b = built.get(id);
      if (b && entry.kind === 'globular' && b.tier !== tier && builds === 0) { drop(id); b = null; }
      if (!b) { if (builds > 0) continue; builds += 1; b = build(id, entry, tier); if (!b) continue; built.set(id, b); }
      const rec = env.recordById(id);
      if (!place(b, rec)) continue;
      const photo = env.pictureShare ? Math.min(1, Math.max(0, env.pictureShare(id) || 0)) : 0;
      const share = fadeFor(rp) * (1 - photo);
      const u = b.mesh.material.uniforms;
      u.uShare.value = share;
      u.uGain.value = Number.isFinite(info.gain) ? info.gain : 1;
      u.uUnitsPerPc.value = PC_KM / stage.unitKm;
      u.uPixelRatio.value = info.renderer && info.renderer.getPixelRatio ? info.renderer.getPixelRatio() : 1;
      // The frame latch keeps the brightest POINTS[0] (they are sorted so); nothing else changes.
      const drawn = q.latched ? Math.min(b.count, POINTS[0]) : b.count;
      b.mesh.geometry.setDrawRange(0, drawn);
      b.mesh.visible = share > 0.002;
      b.share = share;
      b.rPx = rp;
      if (b.kind === 'globular' && camera) {
        const centre = _c.set(b.mesh.matrix.elements[12], b.mesh.matrix.elements[13], b.mesh.matrix.elements[14]);
        const dPc = Math.max(1e-3, centre.distanceTo(camera.position) / (PC_KM / stage.unitKm));
        b.taken = share * visibleLight(b.absMag, b.light, drawn, dPc);
      } else {
        b.taken = share;
      }
      if (b.mesh.visible) { b.usedAt = now; state.calls += 1; drawnIds.add(id); taken.set(id, b.taken); }
    }
    for (const [id, b] of built) {
      if (drawnIds.has(id)) continue;
      b.mesh.visible = false;
      b.share = 0;
      if (now - b.usedAt > KEEP_MS) drop(id);
    }
    group.visible = on && state.calls > 0;
  }

  return {
    group, frame,
    ready: () => !!(state.manifest || state.failed) && !state.membersLoading,
    whenLoaded: () => loading,
    /** record id -> the share of its light the stars draw now: deepsky.js steps its glow and holder back by it. */
    shares: () => new Map(taken),
    taken: (id) => taken.get(id) || 0,
    stats: () => ({
      id: 'clusters', loaded: !!state.manifest, failed: state.failed, members: state.members ? state.members.count : 0, membersFailed: state.membersFailed,
      calls: state.calls, bytes: state.bytes, fileBytes: state.fileBytes,
      drawn: [...built.entries()].filter(([, b]) => b.mesh.visible).map(([id, b]) => ({ id, kind: b.kind, points: b.mesh.geometry.drawRange.count === Infinity ? b.count : Math.min(b.count, b.mesh.geometry.drawRange.count), of: b.count, tier: b.tier, share: Math.round(b.share * 100) / 100, taken: Math.round(b.taken * 100) / 100, rPx: Math.round(b.rPx) })),
    }),
    dispose() { for (const id of [...built.keys()]) drop(id); if (group.parent) group.parent.remove(group); },
  };
}
