// scene/cometfield.js -- every comet the Small-Body Database has an orbit for, drawn (internal spec 0079 stage A8, internal #1068).
//
// Contract: createCometField(THREE, env) -> { group, update(camera, renderer, visible, tMs, selectedId), pickAll(ndcX, ndcY, camera, viewport, limit),
//                                             recordById(id), ownsId(id), whenLoaded(), state(), dispose() }
//     env = { scene?, load?(): Promise<Record[]> (a test's), recordsFor?(layer) -> the layer's own records, tier?() -> 0..2 }
//   Pure, for tests/test_cometfield.mjs: keplerPosAu, orbitPoints, tailPoints, tailLengthAu, magNow, orbitWeight, ORBIT_SAMPLES, R_CUT_AU, tierLimit
//
// WHAT WAS THERE. The comets layer (data/layers.js) downloaded every comet of the feed (4 082 on 2026-10-28) and drew the 60 that are brightest in
// the sky now: a glyph, a card and, for the selected one, its orbit (scene/orbitline.js). The rest were parsed and dropped.
//
// WHAT THIS ADDS, while the layer is on and the stage is a heliocentric one, never at boot (main.js imports this the first time):
//   - A FEW ORBITS, from the feed's own elements (q, e, i, node, argument of perihelion), as one indexed line mesh in one draw call: the
//     selected comet's, a handful of famous ones (FAMOUS: Halley, Hale-Bopp, NEOWISE...) and the few brightest now, faint; never all of
//     them. (Release 1.5.0 drew all 4 000 at once: 1 300 of them are sungrazers that pass within 0.01 au of the Sun, so they piled up
//     into a band through the Sun's disc and a beam outward; see orbitRows.) The whole ellipse, or for a long or open orbit the part
//     inside R_CUT_AU, so a hyperbola is its passage. The orbit is the two-body path in space; it does not change with the clock.
//   - Every comet's PLACE as a small point, from the same elements and the app's clock (two-body, so `inferred`, as its glyph is).
//     The 60 comets that have a glyph keep it; their point is not drawn twice. A sungrazer's point is fainter still (a thousand of one
//     family are one haze, not a thousand dots), and a place beyond POINT_MAX_AU is not drawn: a two-body hyperbola with a 1895 perihelion
//     is millions of au out by now and was a dotted ray, so its card says where it is and the map does not.
//   - TAILS on the bright ones: a comet whose brightness law is in the feed (M1) and which would be at least magnitude TAIL_MAG now and
//     is nearer the Sun than TAIL_AU. Two ribbons from the head, away from the Sun: the ion tail straight and blue, the dust tail
//     curved back along the orbit and cream. WHAT IS MEASURED: where the Sun is, so the tail's direction (a comet's gas tail points
//     away from it). WHAT IS NOT: the length and width, which are ours (tailLengthAu: longer the brighter and the nearer the Sun,
//     none past TAIL_AU), and the dust's bend, which is drawn and not computed from grain sizes. The card says so (data/layers.js).
//   - Any comet is selectable: a tap finds the nearest point or the nearest part of an orbit, and the comet becomes a record on demand
//     (parseComets' shape, the layer's own id), so its card and its orbit line are the layer's.
//
// COUNTS. The Minor Planet Center lists 4 644 comets (summary dated 2026-04-14); the Small-Body Database holds orbits for 4 082 on 2026-10-28.
// Only a comet with elements can be drawn at a place, so the count is the feed's, and the layer's card line says it. Comets that
// broke up are in the feed with their elements and stay in it.

import { load } from '../data/sources.js';
import { parseComets } from '../data/parsers.js';
import { stage } from './stage.js';

export const AU_KM = 149597870.7;
const GM_SUN = 1.32712440018e11; // km^3/s^2
const SUN_INERTIAL = 'sun-inertial';
/** An orbit is drawn out to this distance from the Sun, au; a longer one is cut there (a passage). Neptune is at 30. */
export const R_CUT_AU = 120;
export const ORBIT_SAMPLES = 41; // odd, so the middle sample is perihelion
/** The most orbits drawn at once (the selected one, the famous ones, the brightest now): the line mesh is this big and no bigger. */
export const ORBIT_MAX = 40;
/** A comet nearer the Sun than this at perihelion, au, is a sungrazer: its orbit is drawn only for the selected one, its point is faint. */
export const SUNGRAZER_AU = 0.06;
/** A place farther from the Sun than this, au, is not drawn as a point (the orbits are cut at R_CUT_AU; this is the Oort cloud's inner edge). */
export const POINT_MAX_AU = 1000;
/** Famous comets, in the order they are drawn when a tier cannot draw them all (by their designation in the feed's full name). */
export const FAMOUS = [/^\s*1P\//, /^\s*C\/1995 O1/, /^\s*C\/2020 F3/, /^\s*C\/1996 B2/, /^\s*C\/2023 A3/, /^\s*67P\//, /^\s*2P\//, /^\s*109P\//, /^\s*12P\//, /^\s*C\/2011 W3/, /^\s*C\/2012 S1/, /^\s*C\/2022 E3/, /^\s*C\/2025 N1/, /^\s*C\/2021 A1/, /^\s*C\/2006 P1/, /^\s*17P\//];
/** A tail is drawn on a comet at least this bright now (magnitude, total, the feed's law) and nearer the Sun than this (au). */
export const TAIL_MAG = 12;
export const TAIL_AU = 3.4;
export const TAIL_MAX = 48;
export const TAIL_SEGMENTS = 12;
const REFRESH_SIM_MS = 600e3; // places and tails are worked out again after this much clock
const PICK_PX = 14;
const PICK_BEHIND_PX = 3;
const DEG = Math.PI / 180;

// ------------------------------------------------------------------------------------------------ the maths
/** Newton for Kepler's equation, ellipse (E - e sin E = M) and hyperbola (e sinh H - H = M). */
function solveKepler(M, e) {
  if (e < 1) {
    let E = e > 0.8 ? Math.PI * Math.sign(M || 1) : M + e * Math.sin(M);
    for (let k = 0; k < 40; k++) {
      const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= d;
      if (Math.abs(d) < 1e-12) break;
    }
    return E;
  }
  let H = Math.asinh(M / e);
  for (let k = 0; k < 40; k++) {
    const d = (e * Math.sinh(H) - H - M) / (e * Math.cosh(H) - 1);
    H -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return H;
}

/** Rotate an orbital-plane point (x, y) by the argument of perihelion, inclination and node into the ecliptic J2000 axes. */
function rotate(el, x, y, out, at) {
  const cO = Math.cos(el.omRad), sO = Math.sin(el.omRad), cw = Math.cos(el.wRad), sw = Math.sin(el.wRad), ci = Math.cos(el.iRad), si = Math.sin(el.iRad);
  out[at] = (cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y;
  out[at + 1] = (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y;
  out[at + 2] = (sw * si) * x + (cw * si) * y;
}

/**
 * The heliocentric ecliptic J2000 position of an element set at app time `tMs`, au, and the velocity direction's plane coordinates are
 * not needed: [x, y, z, r] or null. `el` is parseComets' `elements` (qKm, e, iRad, omRad, wRad, tpMs). Two-body, as propagate/kepler.js.
 */
export function keplerPosAu(el, tMs, out = [0, 0, 0, 0]) {
  const q = el.qKm / AU_KM, e = el.e;
  if (!(q > 0) || !(e >= 0)) return null;
  const dt = (tMs - el.tpMs) / 1000;
  let x, y;
  if (Math.abs(e - 1) < 1e-6) {
    const W = dt * Math.sqrt(GM_SUN / (2 * Math.pow(q * AU_KM, 3)));
    const s = 2 * Math.sinh(Math.asinh(1.5 * W) / 3);
    x = q * (1 - s * s); y = 2 * q * s;
  } else if (e < 1) {
    const a = q / (1 - e);
    const n = Math.sqrt(GM_SUN / Math.pow(a * AU_KM, 3));
    let M = (n * dt) % (2 * Math.PI);
    if (M > Math.PI) M -= 2 * Math.PI; else if (M < -Math.PI) M += 2 * Math.PI;
    const E = solveKepler(M, e);
    x = a * (Math.cos(E) - e); y = a * Math.sqrt(1 - e * e) * Math.sin(E);
  } else {
    const a = q / (e - 1); // |a|
    const n = Math.sqrt(GM_SUN / Math.pow(a * AU_KM, 3));
    const H = solveKepler(n * dt, e);
    x = a * (e - Math.cosh(H)); y = a * Math.sqrt(e * e - 1) * Math.sinh(H);
  }
  rotate(el, x, y, out, 0);
  out[3] = Math.hypot(x, y);
  return out;
}

/**
 * The orbit as `n` points in au on the ecliptic J2000 axes, from one end of the part inside `rCutAu` to the other, denser near perihelion. A
 * closed orbit that fits is the whole ellipse (the first point is the last). Pure; `el` as keplerPosAu.
 */
export function orbitPoints(el, n = ORBIT_SAMPLES, rCutAu = R_CUT_AU) {
  const q = el.qKm / AU_KM, e = el.e;
  const out = new Float32Array(n * 3);
  const p = q * (1 + e);
  const tmp = [0, 0, 0];
  let nuLim;
  if (e < 1 && q * (1 + e) / (1 - e) <= rCutAu) {
    const a = q / (1 - e), b = a * Math.sqrt(1 - e * e);
    for (let k = 0; k < n; k++) {
      const u = -1 + (2 * k) / (n - 1);
      const E = Math.PI * Math.sign(u) * Math.abs(u) ** 1.7;
      rotate(el, a * (Math.cos(E) - e), b * Math.sin(E), tmp, 0);
      out[k * 3] = tmp[0]; out[k * 3 + 1] = tmp[1]; out[k * 3 + 2] = tmp[2];
    }
    return out;
  }
  const c = e > 0 ? Math.max(-1, Math.min(1, (p / rCutAu - 1) / e)) : 0;
  nuLim = Math.acos(c);
  if (e > 1) nuLim = Math.min(nuLim, Math.acos(-1 / e) * 0.985);
  for (let k = 0; k < n; k++) {
    const s = -1 + (2 * k) / (n - 1);
    const nu = nuLim * Math.sign(s) * Math.abs(s) ** 1.7;
    const r = p / (1 + e * Math.cos(nu));
    rotate(el, r * Math.cos(nu), r * Math.sin(nu), tmp, 0);
    out[k * 3] = tmp[0]; out[k * 3 + 1] = tmp[1]; out[k * 3 + 2] = tmp[2];
  }
  return out;
}

/** The total magnitude the feed's law gives: M1 + 15 log10 r (data/layers.js cometMagNow's approximation), or null where there is no M1. Pure. */
export function magNow(H, rAu) {
  return Number.isFinite(H) ? H + 15 * Math.log10(Math.max(rAu, 0.05)) : null;
}

/** An orbit line's brightness 0..1 from how bright the comet is now (fainter than 17 is the floor); one with no brightness law is the floor. Pure. */
export function orbitWeight(mag) {
  return Number.isFinite(mag) ? Math.max(0.14, Math.min(1, (18 - mag) / 9)) : 0.14;
}

/** The first n comets of a list sorted brightest first that a tier draws orbits of: T0 400, T1 2 000, T2 all. Pure. */
export function tierLimit(tier) {
  return tier <= 0 ? 400 : tier === 1 ? 2000 : Infinity;
}

/**
 * Which comets' orbits are drawn: the selected one (whatever it is), then the famous ones the feed has (FAMOUS, in that order; a tier takes
 * 5, 12 or all), then the brightest now that are in an apparition and are not sungrazers, defunct ("D/") or coronagraph fragments (a tier
 * adds 2, 6 or 12). At most ORBIT_MAX, no row twice. `rows` are {name, q (au), tpMs, mag (now, NaN where none)}. Pure.
 */
export function orbitRows(rows, tMs, tier, selected = -1) {
  const out = [];
  const take = (i) => { if (i >= 0 && i < rows.length && !out.includes(i) && out.length < ORBIT_MAX) out.push(i); };
  take(selected);
  const t = tier <= 0 ? 0 : tier === 1 ? 1 : 2;
  const quiet = (r) => !(r.q < SUNGRAZER_AU) && !/^\s*\d+D\//.test(String(r.name)) && !/SOHO|STEREO|LASCO/i.test(String(r.name));
  let famous = 0;
  for (const re of FAMOUS) {
    if (famous >= [5, 12, 16][t]) break;
    const i = rows.findIndex((r) => re.test(String(r.name)) && quiet(r));
    if (i >= 0) { take(i); famous += 1; }
  }
  const bright = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (Number.isFinite(r.mag) && quiet(r) && Math.abs(tMs - r.tpMs) <= 1100 * 86400e3) bright.push(i);
  }
  bright.sort((a, b) => rows[a].mag - rows[b].mag);
  for (const i of bright.slice(0, [2, 6, 12][t])) take(i);
  return out;
}

/**
 * May this comet be drawn with a tail at app time `tMs`? Only one in an apparition (within 400 days of its perihelion), not one that has
 * not been seen again ("D/", Brorsen's, Biela's) and not a fragment seen only by a coronagraph (SOHO, STEREO, LASCO: their brightness law is
 * a few sightings, data/layers.js says so). Pure.
 */
export function tailEligible(record, tMs) {
  if (!record || !record.elements) return false;
  const name = String(record.name || '');
  if (/^\s*\d+D\//.test(name) || /\b[0-9]+D\b/.test(String(record.meta && record.meta.designation))) return false;
  if (/SOHO|STEREO|LASCO/i.test(name)) return false;
  return Math.abs(tMs - record.elements.tpMs) <= 400 * 86400e3;
}

/** Illustrative: a tail's length in au from how bright the comet is and how near the Sun. 0 where it has none. Pure. */
export function tailLengthAu(mag, rAu) {
  if (!Number.isFinite(mag) || !(rAu > 0) || rAu >= TAIL_AU || mag > TAIL_MAG) return 0;
  const near = Math.pow(Math.max(0, (TAIL_AU - rAu) / (TAIL_AU - 0.3)), 1.3);
  const bright = Math.min(1.6, Math.pow(10, 0.06 * (TAIL_MAG - mag)));
  return Math.min(1.2, 0.09 * near * bright * 3.2);
}

/**
 * A tail's centre line, TAIL_SEGMENTS + 1 points from the head, au, in the ecliptic axes. `head` and `vel` (the comet's heading) are 3-vectors;
 * the ion tail is straight away from the Sun, the dust tail bends back against the heading. Pure.
 */
export function tailPoints(head, vel, lengthAu, kind) {
  const r = Math.hypot(head[0], head[1], head[2]) || 1;
  const away = [head[0] / r, head[1] / r, head[2] / r];
  const vn = Math.hypot(vel[0], vel[1], vel[2]) || 1;
  const back = [-vel[0] / vn, -vel[1] / vn, -vel[2] / vn];
  const out = new Float32Array((TAIL_SEGMENTS + 1) * 3);
  for (let k = 0; k <= TAIL_SEGMENTS; k++) {
    const t = k / TAIL_SEGMENTS;
    for (let c = 0; c < 3; c++) {
      out[k * 3 + c] = head[c] + (kind === 'dust' ? (away[c] * t + back[c] * 0.55 * t * t) * lengthAu * 0.8 : away[c] * t * lengthAu);
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ the shaders
// The renderer's depth is logarithmic (scene/renderer.js), so a shader that tests depth takes three.js's chunks for it.
const VERT_ORBIT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aWeight;
varying float vWeight;
void main() {
  vWeight = aWeight;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}`;
const FRAG_ORBIT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColour;
uniform float uLight;
varying float vWeight;
void main() {
  #include <logdepthbuf_fragment>
  gl_FragColor = vec4(uColour * (uLight * vWeight), 1.0);
}`;
const VERT_POINT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aWeight;
attribute float aShown;
attribute float aIndex;
uniform float uPixelRatio;
uniform float uSelected;
varying float vWeight;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float sel = step(abs(aIndex - uSelected), 0.5);
  vWeight = aShown * (0.3 + 0.5 * aWeight);
  // small points (a place is two-body, not a picture of the comet): 2 to 3 px, a sungrazer's (aShown below a half) 1.5; the selected one larger
  float tiny = 1.0 - step(0.5, aShown);
  gl_PointSize = (mix(2.0 + 1.2 * aWeight, 1.5, tiny) + sel * 6.0) * uPixelRatio * step(0.01, aShown);
  #include <logdepthbuf_vertex>
}`;
const FRAG_POINT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColour;
varying float vWeight;
void main() {
  #include <logdepthbuf_fragment>
  float r = length(gl_PointCoord - vec2(0.5)) * 2.0;
  if (r >= 1.0) discard;
  float a = (exp(-6.0 * r * r) + 0.25 * (1.0 - r)) * vWeight;
  gl_FragColor = vec4(uColour * a, 1.0);
}`;
// A tail: a ribbon along its centre line, turned to face the camera, widening and fading to its tip.
const VERT_TAIL = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 aTangent;   // direction of the centre line here, au
attribute float aT;        // 0 at the head, 1 at the tip
attribute float aSide;     // -1 or +1
attribute float aWidth;    // half width at the tip, au
attribute vec3 aTint;
varying float vT;
varying float vSide;
varying vec3 vTint;
void main() {
  vT = aT; vSide = aSide; vTint = aTint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 along = normalize((modelViewMatrix * vec4(aTangent, 0.0)).xyz);
  vec3 side = cross(along, normalize(mv.xyz));
  vec3 across = length(side) > 1.0e-5 ? normalize(side) : vec3(1.0, 0.0, 0.0);   // looking straight down a tail
  float scale = length(modelViewMatrix[0].xyz);   // scene units per au
  mv.xyz += across * aSide * aWidth * scale * (0.12 + 0.88 * aT);
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const FRAG_TAIL = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uLight;
varying float vT;
varying float vSide;
varying vec3 vTint;
void main() {
  #include <logdepthbuf_fragment>
  float across = 1.0 - abs(vSide);
  float along = pow(1.0 - vT, 1.6);
  float a = across * across * along * uLight;
  gl_FragColor = vec4(vTint * a, 1.0);
}`;

// ------------------------------------------------------------------------------------------------ what the card says
/** The card's "drawn as" line gains these (ui/cards.js appends a record's own `departure`). */
export const NOTE_POINT = 'in the map as a point at its two-body place on the orbit its elements give, with that orbit drawn as a line; only the layer\u2019s brightest sixty have the comet\u2019s own shape';
export const NOTE_TAIL = 'its tail is illustrative: it points away from the Sun, as a comet\u2019s tail does, and its length and bend are ours, worked out from how bright the comet is and how near the Sun';

// ------------------------------------------------------------------------------------------------ the field
export function createCometField(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'comet-field';
  group.matrixAutoUpdate = false;
  group.visible = false;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const uniforms = {
    uColour: { value: new THREE.Color(0xd9f3ff) }, uLight: { value: 0.3 }, uPixelRatio: { value: 1 }, uSelected: { value: -1 },
  };
  const tailUniforms = { uLight: { value: 0.85 } };
  const S = { loaded: false, failed: null, n: 0, records: [], byId: new Map(), els: [], H: [], pos: null, r: null, mag: null, lastT: NaN, placedFor: null, tails: 0, drawn: 0, orbitVerts: 0, rows: [], bytes: 0 };
  let orbits = null, points = null, tailMesh = null;
  const _m = new THREE.Matrix4();
  const tailRows = []; // the comets with a tail now: row indices
  const noted = new Set(); // rows whose card carries the tail's note
  const scratch = [0, 0, 0, 0];
  const scratch2 = [0, 0, 0, 0];

  /** A point's light: 0 where the layer's own glyph stands for it, a fifth for a sungrazer (a family of a thousand is one haze), else 1. */
  const shownOf = (i) => (S.rows[i].own ? 0 : S.rows[i].q < SUNGRAZER_AU ? 0.2 : 1);

  const loading = Promise.resolve()
    .then(() => (env.load ? env.load() : load('jpl-sbdb-comets').then((res) => (res && res.data != null ? parseComets(res.data) : []))))
    .then((records) => build(records))
    .catch((e) => { S.failed = String((e && e.message) || e); console.warn('the comets’ orbits did not load', e); });

  function build(records) {
    const own = new Set(((env.recordsFor && env.recordsFor('comets')) || []).map((r) => r.id));
    // brightest first (a tier keeps the front of the list): by the feed's law at the time of loading, unknown ones after
    const t0 = Date.now();
    const keyed = records.filter((r) => r && r.elements && Number.isFinite(r.elements.qKm)).map((r) => {
      const p = keplerPosAu(r.elements, t0, [0, 0, 0, 0]);
      const mag = p ? magNow(r.meta && r.meta.absoluteMagnitude, p[3]) : null;
      return { r, mag };
    });
    keyed.sort((a, b) => (a.mag === null) - (b.mag === null) || (a.mag - b.mag));
    const n = keyed.length;
    S.n = n;
    S.records = keyed.map((k) => k.r);
    S.els = S.records.map((r) => r.elements);
    S.H = S.records.map((r) => (r.meta && Number.isFinite(r.meta.absoluteMagnitude) ? r.meta.absoluteMagnitude : NaN));
    S.rows = S.records.map((r, i) => ({ i, own: own.has(r.id), name: r.name, q: r.elements.qKm / AU_KM, tpMs: r.elements.tpMs, mag: NaN }));
    S.records.forEach((r, i) => {
      S.byId.set(r.id, i);
      r.layer = 'comets';
      if (r.meta) { r.meta.fieldNote = true; r.meta.departure = NOTE_POINT; }
    });
    S.pos = new Float32Array(n * 3);
    S.r = new Float32Array(n);
    S.mag = new Float32Array(n).fill(NaN);
    // ---- orbits: one indexed line mesh with room for ORBIT_MAX of them, filled for the few that are drawn (setOrbits)
    const verts = ORBIT_MAX * ORBIT_SAMPLES;
    const idx = new Uint32Array(ORBIT_MAX * (ORBIT_SAMPLES - 1) * 2);
    let k = 0;
    for (let i = 0; i < ORBIT_MAX; i++) {
      for (let v = 0; v < ORBIT_SAMPLES - 1; v++) { idx[k++] = i * ORBIT_SAMPLES + v; idx[k++] = i * ORBIT_SAMPLES + v + 1; }
    }
    const og = new THREE.BufferGeometry();
    og.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts * 3), 3));
    og.setAttribute('aWeight', new THREE.BufferAttribute(new Float32Array(verts), 1));
    og.setIndex(new THREE.BufferAttribute(idx, 1));
    og.setDrawRange(0, 0);
    orbits = new THREE.LineSegments(og, new THREE.ShaderMaterial({
      vertexShader: VERT_ORBIT, fragmentShader: FRAG_ORBIT, uniforms,
      transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    orbits.name = 'comet-orbits';
    orbits.frustumCulled = false;
    // ---- places: one point each
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(S.pos, 3));
    pg.setAttribute('aWeight', new THREE.BufferAttribute(new Float32Array(n).fill(0.14), 1));
    pg.setAttribute('aShown', new THREE.BufferAttribute(new Float32Array(n).map((_, i) => shownOf(i)), 1));
    pg.setAttribute('aIndex', new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => i), 1));
    points = new THREE.Points(pg, new THREE.ShaderMaterial({
      vertexShader: VERT_POINT, fragmentShader: FRAG_POINT, uniforms,
      transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    points.name = 'comet-points';
    points.frustumCulled = false;
    // ---- tails: TAIL_MAX comets x two ribbons x (TAIL_SEGMENTS + 1) x two sides
    const per = (TAIL_SEGMENTS + 1) * 2;
    const tv = TAIL_MAX * 2 * per;
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tv * 3), 3));
    tg.setAttribute('aTangent', new THREE.BufferAttribute(new Float32Array(tv * 3), 3));
    tg.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(tv), 1));
    tg.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(tv), 1));
    tg.setAttribute('aWidth', new THREE.BufferAttribute(new Float32Array(tv), 1));
    tg.setAttribute('aTint', new THREE.BufferAttribute(new Float32Array(tv * 3), 3));
    const ti = [];
    for (let m = 0; m < TAIL_MAX * 2; m++) for (let s = 0; s < TAIL_SEGMENTS; s++) {
      const a = m * per + s * 2;
      ti.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    tg.setIndex(new THREE.BufferAttribute(new Uint32Array(ti), 1));
    tg.setDrawRange(0, 0);
    tailMesh = new THREE.Mesh(tg, new THREE.ShaderMaterial({
      vertexShader: VERT_TAIL, fragmentShader: FRAG_TAIL, uniforms: tailUniforms,
      transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    tailMesh.name = 'comet-tails';
    tailMesh.frustumCulled = false;
    group.add(orbits, points, tailMesh);
    if (env.scene) env.scene.add(group);
    S.bytes = [og, pg, tg].reduce((a, g) => a + Object.values(g.attributes).reduce((c, at) => c + at.array.byteLength, 0) + (g.index ? g.index.array.byteLength : 0), 0);
    S.loaded = true;
  }

  /** The group's matrix: au about the Sun, sun-inertial, into this stage's scene (re-made every frame: a planet's stage moves). */
  function place(tMs) {
    const A = stage.affineFrom ? stage.affineFrom(SUN_INERTIAL, tMs) : null;
    if (!A) return false;
    const k = AU_KM;
    _m.set(
      A.x[0] * k, A.y[0] * k, A.z[0] * k, A.o[0],
      A.x[1] * k, A.y[1] * k, A.z[1] * k, A.o[1],
      A.x[2] * k, A.y[2] * k, A.z[2] * k, A.o[2],
      0, 0, 0, 1,
    );
    const sun = stage.toScene({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, tMs);
    if (sun) _m.setPosition(sun);
    group.matrix.copy(_m);
    group.matrixWorldNeedsUpdate = true;
    return true;
  }

  const velScratch = [0, 0, 0];
  /** Work out every comet's place and the tails (when the clock has moved REFRESH_SIM_MS or the first time). */
  function refresh(tMs, limit) {
    S.lastT = tMs;
    const wAttr = points.geometry.getAttribute('aWeight');
    {
      // the comets that have a glyph (the layer's own records, landed by now): their point is not drawn
      const own = new Set(((env.recordsFor && env.recordsFor('comets')) || []).map((r) => r.id));
      for (let i = 0; i < S.n; i++) S.rows[i].own = own.has(S.records[i].id);
    }
    const shown = points.geometry.getAttribute('aShown');
    let nTail = 0;
    tailRows.length = 0;
    for (let i = 0; i < S.n; i++) {
      const p = keplerPosAu(S.els[i], tMs, scratch);
      if (!p || !Number.isFinite(p[0])) { S.pos[i * 3] = S.pos[i * 3 + 1] = S.pos[i * 3 + 2] = 0; S.r[i] = 0; wAttr.array[i] = 0; shown.array[i] = 0; S.rows[i].mag = NaN; continue; }
      S.pos[i * 3] = p[0]; S.pos[i * 3 + 1] = p[1]; S.pos[i * 3 + 2] = p[2]; S.r[i] = p[3];
      shown.array[i] = p[3] > POINT_MAX_AU ? 0 : shownOf(i); // a two-body place thousands of au out is not drawn
      const m = magNow(S.H[i], p[3]);
      S.mag[i] = m === null ? NaN : m;
      S.rows[i].mag = S.mag[i];
      wAttr.array[i] = orbitWeight(m);
      if (nTail < TAIL_MAX && m !== null && p[3] < TAIL_AU && m <= TAIL_MAG && i < limit && tailEligible(S.records[i], tMs)) { tailRows.push(i); nTail += 1; }
    }
    wAttr.needsUpdate = true;
    shown.needsUpdate = true;
    orbitKey = ''; // the brightest now may have changed
    points.geometry.getAttribute('position').needsUpdate = true;
    fillTails(tMs);
    // the cards: the comets with a tail now say it is illustrative, the layer's own sixty as well as the field's
    const tailIds = new Set(tailRows.map((i) => S.records[i].id));
    const ownRecords = (env.recordsFor && env.recordsFor('comets')) || [];
    for (const r of ownRecords) noteTail(r, tailIds.has(r.id));
    for (const i of tailRows) noteTail(S.records[i], true);
    for (const i of noted) if (!tailIds.has(S.records[i].id)) { noteTail(S.records[i], false); noted.delete(i); }
    for (const i of tailRows) noted.add(i);
  }

  const ION = [0.42, 0.7, 1.0], DUST = [1.0, 0.9, 0.7];
  function fillTails(tMs) {
    const g = tailMesh.geometry;
    const pos = g.getAttribute('position').array, tan = g.getAttribute('aTangent').array, aT = g.getAttribute('aT').array, side = g.getAttribute('aSide').array, wid = g.getAttribute('aWidth').array, tint = g.getAttribute('aTint').array;
    const per = (TAIL_SEGMENTS + 1) * 2;
    let m = 0;
    for (const i of tailRows) {
      const head = [S.pos[i * 3], S.pos[i * 3 + 1], S.pos[i * 3 + 2]];
      const later = keplerPosAu(S.els[i], tMs + 3600e3, scratch2);
      const vel = later ? [later[0] - head[0], later[1] - head[1], later[2] - head[2]] : [1, 0, 0];
      const L = tailLengthAu(S.mag[i], S.r[i]);
      if (!(L > 0)) continue;
      for (const kind of ['ion', 'dust']) {
        const pts = tailPoints(head, vel, L, kind);
        const halfW = L * (kind === 'ion' ? 0.035 : 0.09);
        const col = kind === 'ion' ? ION : DUST;
        for (let k = 0; k <= TAIL_SEGMENTS; k++) {
          const a = k === 0 ? 0 : k - 1, b = Math.min(TAIL_SEGMENTS, k + 1);
          const tx = pts[b * 3] - pts[a * 3], ty = pts[b * 3 + 1] - pts[a * 3 + 1], tz = pts[b * 3 + 2] - pts[a * 3 + 2];
          for (let s = 0; s < 2; s++) {
            const v = m * per + k * 2 + s;
            pos[v * 3] = pts[k * 3]; pos[v * 3 + 1] = pts[k * 3 + 1]; pos[v * 3 + 2] = pts[k * 3 + 2];
            tan[v * 3] = tx; tan[v * 3 + 1] = ty; tan[v * 3 + 2] = tz;
            aT[v] = k / TAIL_SEGMENTS; side[v] = s === 0 ? -1 : 1; wid[v] = halfW;
            tint[v * 3] = col[0]; tint[v * 3 + 1] = col[1]; tint[v * 3 + 2] = col[2];
          }
        }
        m += 1;
      }
    }
    S.tails = m / 2;
    g.setDrawRange(0, m * TAIL_SEGMENTS * 6);
    for (const name of ['position', 'aTangent', 'aT', 'aSide', 'aWidth', 'aTint']) g.getAttribute(name).needsUpdate = true;
  }

  function noteTail(r, on) {
    if (!r || !r.meta) return;
    const base = r.meta.fieldNote === true ? NOTE_POINT : '';
    if (on) r.meta.departure = base ? `${base}. ${NOTE_TAIL}` : NOTE_TAIL;
    else if (r.meta.departure === NOTE_TAIL || r.meta.departure === `${NOTE_POINT}. ${NOTE_TAIL}`) { if (base) r.meta.departure = NOTE_POINT; else delete r.meta.departure; }
  }

  // ---- the few orbits that are drawn: the selected comet's, the famous, the brightest now (orbitRows)
  let orbitKey = '';
  function setOrbits(tier, selRow) {
    const key = `${tier}:${selRow}`;
    if (key === orbitKey) return;
    orbitKey = key;
    const rows = orbitRows(S.rows, S.lastT, tier, selRow);
    const g = orbits.geometry;
    const pos = g.getAttribute('position'), wt = g.getAttribute('aWeight');
    rows.forEach((row, slot) => {
      const pts = orbitPoints(S.els[row], ORBIT_SAMPLES, R_CUT_AU);
      pos.array.set(pts, slot * ORBIT_SAMPLES * 3);
      const picked = row === selRow;
      const w = picked ? 0.9 : S.rows[row].mag === S.rows[row].mag ? 0.5 : 0.4; // the selected one is the line to read; the others are faint
      for (let v = 0; v < ORBIT_SAMPLES; v++) {
        const r = Math.hypot(pts[v * 3], pts[v * 3 + 1], pts[v * 3 + 2]);
        wt.array[slot * ORBIT_SAMPLES + v] = picked ? w : w / (1 + Math.pow(r / 24, 1.5));
      }
    });
    pos.needsUpdate = true; wt.needsUpdate = true;
    g.setDrawRange(0, rows.length * (ORBIT_SAMPLES - 1) * 2);
    S.drawn = rows.length;
    S.orbitVerts = rows.length * ORBIT_SAMPLES;
  }

  let selectedRow = -1;
  /** Per frame. `visible`: the comets layer is drawable and the stage is a heliocentric one. `tMs` the app clock. */
  function update(camera, renderer, visible, tMs, selectedId) {
    if (!S.loaded) { group.visible = false; return; }
    if (!visible || !camera || !Number.isFinite(tMs)) { group.visible = false; return; }
    if (!place(tMs)) { group.visible = false; return; }
    if (renderer && typeof renderer.getPixelRatio === 'function') uniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, renderer.getPixelRatio()));
    const tier = env.tier ? env.tier() : 1;
    const limit = tierLimit(tier);
    if (!Number.isFinite(S.lastT) || Math.abs(tMs - S.lastT) > REFRESH_SIM_MS) refresh(tMs, limit);
    const row = typeof selectedId === 'string' && S.byId.has(selectedId) ? S.byId.get(selectedId) : -1;
    if (row !== selectedRow) { selectedRow = row; uniforms.uSelected.value = row; }
    setOrbits(tier, row);
    group.updateMatrixWorld(true);
    group.visible = true;
  }

  // ---- records on demand
  const made = new Map();
  function recordAt(i) {
    if (!S.loaded || !(i >= 0 && i < S.n)) return null;
    const r = S.records[i];
    if (!made.has(i)) {
      if (r.meta && Number.isFinite(S.mag[i])) r.meta.magNow = S.mag[i];
      made.set(i, true);
    }
    return r;
  }
  const rowOf = (id) => (S.loaded && S.byId.has(id) ? S.byId.get(id) : -1);

  const _p = new THREE.Vector3();
  /** Candidates for a tap: {record, px, score}, nearest first. A comet with a glyph is the glyph layer's, not this field's. */
  function pickAll(ndcX, ndcY, camera, viewport, limit = 6) {
    if (!S.loaded || !group.visible || !camera || !viewport) return [];
    camera.updateMatrixWorld();
    group.updateMatrixWorld();
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(group.matrixWorld);
    const e = _m.elements;
    const halfW = viewport.w * 0.5, halfH = viewport.h * 0.5;
    const out = [];
    const lim = Math.min(S.n, tierLimit(env.tier ? env.tier() : 1));
    for (let i = 0; i < lim; i++) {
      if (S.rows[i].own) continue;
      const x = S.pos[i * 3], y = S.pos[i * 3 + 1], z = S.pos[i * 3 + 2];
      const w = e[3] * x + e[7] * y + e[11] * z + e[15];
      if (w <= 0) continue;
      const dx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / w - ndcX) * halfW, dy = ((e[1] * x + e[5] * y + e[9] * z + e[13]) / w - ndcY) * halfH;
      const px = Math.sqrt(dx * dx + dy * dy);
      if (px <= PICK_PX) out.push({ i, px });
    }
    out.sort((p, q) => p.px - q.px);
    return out.slice(0, Math.max(1, limit)).map(({ i, px }) => ({ record: recordAt(i), px, score: px + PICK_BEHIND_PX })).filter((c) => c.record);
  }

  return {
    group, update, pickAll, recordAt,
    recordById: (id) => recordAt(rowOf(id)),
    ownsId: (id) => rowOf(id) >= 0,
    count: () => S.n,
    whenLoaded: () => loading,
    /** The comets that have a tail now, brightest first: [{ id, name, mag, rAu, tailAu }] (a probe's and a card's). */
    tails: () => tailRows.map((i) => ({ id: S.records[i].id, name: S.records[i].name, mag: S.mag[i], rAu: S.r[i], tailAu: tailLengthAu(S.mag[i], S.r[i]) })),
    /** A comet's current tail length in au (0: none), for the card and the probes. */
    tailOf: (id) => { const i = rowOf(id); return i >= 0 ? tailLengthAu(S.mag[i], S.r[i]) : 0; },
    state: () => ({ loaded: S.loaded, failed: S.failed, comets: S.n, drawn: S.drawn, tails: S.tails, visible: group.visible, orbitVerts: S.orbitVerts, bytes: S.bytes, calls: group.visible ? 2 + (S.tails > 0 ? 1 : 0) : 0, reduced }),
    dispose() {
      for (const o of [orbits, points, tailMesh]) if (o) { o.geometry.dispose(); o.material.dispose(); }
      if (group.parent) group.parent.remove(group);
    },
  };
}
