// scene/asteroidcloud.js -- the brightest numbered asteroids as points (research train "catalogues", forge #560): the near-Earth
// catalogue's optional layer, switched on from its view (ui/neobrowser.js), never at boot and never by itself.
//
// Contract: createAsteroidCloud(THREE, ctx, opts) -> { setOn(on) -> Promise, more() -> Promise<boolean>, state(), dispose() }
//   opts = { colours: [near-Earth, belt, trojan, beyond] as '#rrggbb' (the layers' own class colours), base: URL of site/data/ }
//   Pure, for tests/test_neo_browser.mjs: unpack(buffer), groupOf(a, e), positionsAt(els, tMs, out), A_MIN, A_MAX, HEAD_BYTES, ROW_BYTES
//
// LEVEL OF DETAIL BY ASKING. site/data/asteroids/cloud.json lists TIERS of 25 000 (scripts/build-asteroid-cloud.py), brightest
// first. Switched on, the first tier is fetched (300 kB); "More" fetches the next, and so on to the last one we keep. Each tier
// is ONE THREE.Points with its own buffer: a draw call a tier, four at most, and nothing is drawn or computed while it is off.
//
// THE PLACES are two-body positions from the packed elements, worked out on the CPU when the clock has moved REFRESH_SIM_MS
// (and no more often than every REFRESH_WALL_MS of wall time, however fast the clock runs), in au on the ecliptic J2000 axes
// about the Sun; the objects' matrix carries them into the stage's scene each frame (scene/cometfield.js place, the same affine).
// Not selectable: a point is not a record, and the line under the switch says so.

import { stage, isLadderStage } from './stage.js';

export const AU_KM = 149597870.7;
export const A_MIN = 0.6;
export const A_MAX = 100;
export const HEAD_BYTES = 24;
export const ROW_BYTES = 12;
const SUN_INERTIAL = 'sun-inertial';
const GM_AU3_D2 = 0.00029591220828559104; // the Gaussian constant squared, au^3/day^2
const DAY_MS = 86400000;
const REFRESH_SIM_MS = DAY_MS;
const REFRESH_WALL_MS = 250;
const TWO_PI = Math.PI * 2;

/** A packed tier (scripts/build-asteroid-cloud.py) as Float32Arrays of a (au), e, and the angles in radians. Pure. */
export function unpack(buffer) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SRAC' || dv.getUint8(4) !== 1) throw new Error('not an asteroid cloud tier');
  const tier = dv.getUint8(5);
  const n = dv.getUint32(8, true);
  const epochJd = dv.getFloat64(16, true);
  if (buffer.byteLength !== HEAD_BYTES + n * ROW_BYTES) throw new Error('a tier of the wrong length');
  const a = new Float32Array(n), e = new Float32Array(n), i = new Float32Array(n), om = new Float32Array(n), w = new Float32Array(n), ma = new Float32Array(n);
  const span = Math.log(A_MAX / A_MIN);
  for (let k = 0; k < n; k++) {
    const o = HEAD_BYTES + k * ROW_BYTES;
    a[k] = A_MIN * Math.exp((dv.getUint16(o, true) / 65535) * span);
    e[k] = dv.getUint16(o + 2, true) / 65535;
    i[k] = (dv.getUint16(o + 4, true) / 65535) * Math.PI;
    om[k] = (dv.getUint16(o + 6, true) / 65535) * TWO_PI;
    w[k] = (dv.getUint16(o + 8, true) / 65535) * TWO_PI;
    ma[k] = (dv.getUint16(o + 10, true) / 65535) * TWO_PI;
  }
  return { tier, n, epochMs: (epochJd - 2440587.5) * DAY_MS, a, e, i, om, w, ma };
}

/** 0 near-Earth (q under 1.3 au), 2 Jupiter's Trojans (a 5.05 to 5.35), 3 beyond Jupiter (a over 5.5), 1 the main belt. Pure. */
export function groupOf(a, e) {
  if (a * (1 - e) < 1.3) return 0;
  if (a >= 5.05 && a <= 5.35) return 2;
  if (a > 5.5) return 3;
  return 1;
}

/** Every row's heliocentric ecliptic J2000 place at `tMs`, au, into `out` (3 a row). Two-body, as propagate/kepler.js. Pure. */
export function positionsAt(els, tMs, out) {
  const days = (tMs - els.epochMs) / DAY_MS;
  for (let k = 0; k < els.n; k++) {
    const a = els.a[k], e = els.e[k];
    let M = (els.ma[k] + Math.sqrt(GM_AU3_D2 / (a * a * a)) * days) % TWO_PI;
    if (M < 0) M += TWO_PI;
    let E = e > 0.8 ? Math.PI : M;
    for (let it = 0; it < 12; it++) {
      const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      E -= d;
      if (Math.abs(d) < 1e-9) break;
    }
    const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const cO = Math.cos(els.om[k]), sO = Math.sin(els.om[k]), cw = Math.cos(els.w[k]), sw = Math.sin(els.w[k]), ci = Math.cos(els.i[k]), si = Math.sin(els.i[k]);
    out[3 * k] = (cO * cw - sO * sw * ci) * x + (-cO * sw - sO * cw * ci) * y;
    out[3 * k + 1] = (sO * cw + cO * sw * ci) * x + (-sO * sw + cO * cw * ci) * y;
    out[3 * k + 2] = sw * si * x + cw * si * y;
  }
  return out;
}

const VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aGroup;
uniform float uPixelRatio;
uniform vec3 uColours[4];
varying vec3 vColour;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // near-Earth rocks a little larger and full strength; the belt and beyond fainter: the crowd, not the subject
  float near = 1.0 - step(0.5, aGroup);
  int g = int(aGroup + 0.5);
  vec3 c = g == 0 ? uColours[0] : g == 1 ? uColours[1] : g == 2 ? uColours[2] : uColours[3];
  vColour = c * mix(0.45, 1.0, near);
  gl_PointSize = mix(1.5, 2.5, near) * uPixelRatio;
  #include <logdepthbuf_vertex>
}`;
const FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
varying vec3 vColour;
void main() {
  #include <logdepthbuf_fragment>
  float r = length(gl_PointCoord - vec2(0.5)) * 2.0;
  if (r >= 1.0) discard;
  gl_FragColor = vec4(vColour * (1.0 - r * r), 1.0);
}`;

export function createAsteroidCloud(THREE, ctx, opts = {}) {
  const base = opts.base || new URL('../../data/asteroids/', import.meta.url).href;
  const colours = (opts.colours || ['#B8926A', '#B8926A', '#E8ECF2', '#E8ECF2']).map((c) => new THREE.Color(c));
  const uniforms = { uPixelRatio: { value: 1 }, uColours: { value: colours } };
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const tiers = []; // { els, pos, points, lastT, lastWall }
  const S = { on: false, meta: null, failed: null, loading: null, raf: 0 };
  const _m = new THREE.Matrix4();

  const meta = () => S.meta ? Promise.resolve(S.meta) : fetch(`${base}cloud.json`, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(`cloud.json ${r.status}`); return r.json(); }).then((m) => { S.meta = m; return m; });

  function nowMs() { return Number.isFinite(ctx.frameT) ? ctx.frameT : ctx.clock.now(); }

  /** The stage's affine for au about the Sun (scene/cometfield.js place). */
  function placeMatrix(tMs) {
    const A = stage.affineFrom ? stage.affineFrom(SUN_INERTIAL, tMs) : null;
    if (!A) return false;
    const k = AU_KM;
    _m.set(A.x[0] * k, A.y[0] * k, A.z[0] * k, A.o[0], A.x[1] * k, A.y[1] * k, A.z[1] * k, A.o[1], A.x[2] * k, A.y[2] * k, A.z[2] * k, A.o[2], 0, 0, 0, 1);
    const sun = stage.toScene({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, tMs);
    if (sun) _m.setPosition(sun);
    return true;
  }

  function addTier(els) {
    const pos = new Float32Array(els.n * 3);
    const groups = new Float32Array(els.n);
    for (let k = 0; k < els.n; k++) groups[k] = groupOf(els.a[k], els.e[k]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aGroup', new THREE.BufferAttribute(groups, 1));
    const points = new THREE.Points(g, material);
    points.name = `asteroid-cloud-${els.tier}`;
    points.frustumCulled = false;
    points.matrixAutoUpdate = false;
    const tier = { els, pos, points, lastT: NaN, lastWall: 0 };
    // The place is this frame's: the stage moves under a planet's stage, and the clock may run fast.
    points.onBeforeRender = (renderer) => {
      const tMs = nowMs();
      if (placeMatrix(tMs)) { points.matrixWorld.copy(_m); }
      if (renderer && renderer.getPixelRatio) uniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, renderer.getPixelRatio()));
      const wall = performance.now();
      if (!Number.isFinite(tier.lastT) || (Math.abs(tMs - tier.lastT) > REFRESH_SIM_MS && wall - tier.lastWall > REFRESH_WALL_MS)) {
        positionsAt(els, tMs, pos);
        g.attributes.position.needsUpdate = true;
        tier.lastT = tMs;
        tier.lastWall = wall;
      }
    };
    positionsAt(els, nowMs(), pos);
    tier.lastT = nowMs();
    ctx.scene.add(points);
    tiers.push(tier);
  }

  function loadTier(k) {
    return meta().then((m) => {
      const t = m.tiers[k];
      if (!t) return false;
      return fetch(`${base}${t.file}`).then((r) => { if (!r.ok) throw new Error(`${t.file} ${r.status}`); return r.arrayBuffer(); })
        .then((buf) => { addTier(unpack(buf)); show(); return true; });
    });
  }

  // Off a heliocentric stage (a rung of the ladder) the points have nothing to stand round: hidden, as the comet field is.
  function show() {
    const ladder = isLadderStage(stage.worldId);
    for (const t of tiers) t.points.visible = S.on && !ladder;
  }
  function watch() {
    if (!S.on) { S.raf = 0; return; }
    show();
    S.raf = requestAnimationFrame(watch);
  }

  function setOn(on) {
    S.on = !!on;
    if (!S.on) { show(); return Promise.resolve(true); }
    if (!S.raf) S.raf = requestAnimationFrame(watch);
    if (tiers.length) { show(); return Promise.resolve(true); }
    if (!S.loading) S.loading = loadTier(0).catch((e) => { S.failed = String(e && e.message || e); S.loading = null; throw e; });
    return S.loading;
  }

  /** The next tier, if there is one we keep. */
  function more() {
    if (!S.on || !S.meta || tiers.length >= S.meta.tiers.length) return Promise.resolve(false);
    return loadTier(tiers.length);
  }

  function state() {
    const m = S.meta;
    const shown = tiers.reduce((n, t) => n + t.els.n, 0);
    return {
      on: S.on, failed: S.failed, tiers: tiers.length, shown, numbered: m ? m.numbered : null,
      hMax: m && tiers.length ? m.tiers[tiers.length - 1].hMax : null,
      next: m && tiers.length < m.tiers.length ? m.tiers[tiers.length].count : 0,
      calls: S.on ? tiers.filter((t) => t.points.visible).length : 0,
    };
  }

  function dispose() {
    S.on = false;
    for (const t of tiers) { ctx.scene.remove(t.points); t.points.geometry.dispose(); }
    tiers.length = 0;
    material.dispose();
  }

  return { setOn, more, state, dispose };
}
