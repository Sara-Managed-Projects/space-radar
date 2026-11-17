// scene/deep/streams.js -- stellar streams round the Milky Way: Sagittarius, Orphan-Chenab, GD-1 and Palomar 5, from the
// tracks of the galstreams library (Mateu 2023, MNRAS 520, 5225; BSD 3-Clause; internal #420, the deep-space review of
// 2026-11-16, idea 2). A deep layer (scene/deep/heroes.js DEEP_LAYERS) on the ladder's stages, fetched the first time one of
// them is entered; never at boot. Drawn only with the camera far from the Sun (from 15 000 ly, whole by 40 000): from home a
// stream is a faint band of the sky, not a thing with a place.
//   createLayer(THREE, env) -> { group, frame(info), ready(), stats(), dispose() }
//     info = { camera, renderer, stage, gain, visible, before }; env.data hands the parsed file in (the tests)
// Pure, for tests/test_streams.mjs: pointsOf, tracks, ribbonOf, lengthKly, nearestTo, lookFor, fadeAt, SHAPE, STYLE.
//
// WHAT IT DRAWS. Each stream's TRACK (a line through its member stars: where it lies on the sky, and how far it is from the
// Sun) as one line, and a faint ribbon of points about it; two draw calls for all four. The track's points are the library's
// own (ra, dec, distance), turned to light-years about the Sun in the scene's axes and thinned to about one point in 100
// (scripts/build_deep_streams.py): nothing is smoothed, fitted or extended, and no Sun-to-centre distance is assumed.
//
// WHAT IS MEASURED AND WHAT IS NOT (registry/streams.yaml). The tracks are fits through the streams' stars, so where each
// stream lies on the sky is measured; its distance along it is measured for Sagittarius (RR Lyrae, Ramos et al. 2020),
// Orphan-Chenab (Koposov et al. 2019) and Palomar 5 (RR Lyrae, Price-Whelan et al. 2019), and ADOPTED for GD-1 (a gradient
// the authors propose). The ribbon of points is ILLUSTRATIVE: their count, their scatter about the line, and the width
// of the ribbon (a few times each stream's measured width where the library gives one) are display values, not stars. The
// stars themselves, and the Sagittarius stream's second wrap, are not drawn. No star here is exact: it is a hint of a
// band, which is why the layer is off under the Eye exposure (no eye sees them).
import { exposureLook, EXPOSURES } from '../exposure.js';

const SUN_INERTIAL = 'sun-inertial';
const KLY_KM = 9460730472580.8 * 1e3;
const DATA_URL = '../../../data/deep/streams.json';
export const SHAPE = {
  near: [15000, 40000], // ly from the Sun: it fades in over these (a flight out of the Solar System)
  line: 0.55,           // the track's light, a display value
  ribbon: 0.16,         // each ribbon point's light, a display value
  pointPx: 2.2,         // a ribbon point's size, CSS px
  scatter: 0.5,         // the ribbon's spread: a point's offset about the track, in units of its half-width, gaussian
};
export const STYLE = { ribbonCount: 1400 }; // across the four streams, shared by their length
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** A stream's points as [x, y, z] kly about the Sun (sun-inertial) from the baked file's flat numbers. Pure. */
export function pointsOf(stream) {
  const p = (stream && stream.pts) || [], out = [];
  for (let i = 0; i + 2 < p.length; i += 3) out.push([p[i], p[i + 1], p[i + 2]]);
  return out;
}
/** The streams of a parsed file: [{ id, colour, ribbon, pts: [[x, y, z]...] }]. Pure. */
export const tracks = (data) => ((data && data.streams) || []).map((s) => ({ id: s.id, colour: (s.colour || [1, 1, 1]).map(Number), ribbon: Number(s.ribbon_kly) || 0.2, pts: pointsOf(s) }));

/** The length of a polyline, kly. Pure. */
export function lengthKly(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
  return s;
}
/** The nearest of a track's points to a place, kly: { dist, index }. Pure. */
export function nearestTo(pts, at) {
  let best = { dist: Infinity, index: -1 };
  pts.forEach((p, i) => { const d = Math.hypot(p[0] - at[0], p[1] - at[1], p[2] - at[2]); if (d < best.dist) best = { dist: d, index: i }; });
  return best;
}

// A small deterministic generator, so the ribbon is the same every run.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/**
 * `count` points about a track: along it at random, offset across it by a gaussian of `halfWidth` kly in a random
 * direction square to the track. Illustrative (SHAPE). Pure; the same every run.
 */
export function ribbonOf(pts, count, halfWidth, seed = 1) {
  const R = rng(seed), out = new Float32Array(count * 3);
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, R()))) * Math.cos(2 * Math.PI * R());
  for (let k = 0; k < count; k++) {
    const u = R() * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(u)), f = u - i;
    const a = pts[i], b = pts[i + 1];
    const p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    let t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const tl = Math.hypot(...t) || 1; t = t.map((v) => v / tl);
    let r = [gauss(), gauss(), gauss()];
    const d = r[0] * t[0] + r[1] * t[1] + r[2] * t[2];
    r = r.map((v, j) => v - d * t[j]);
    const rl = Math.hypot(...r) || 1;
    const w = halfWidth * SHAPE.scatter * Math.abs(gauss());
    out[3 * k] = p[0] + (r[0] / rl) * w; out[3 * k + 1] = p[1] + (r[1] / rl) * w; out[3 * k + 2] = p[2] + (r[2] / rl) * w;
  }
  return out;
}
/** How much is drawn with the camera `ly` light-years from the Sun. Pure. */
export const fadeAt = (ly) => smooth(ly, SHAPE.near[0], SHAPE.near[1]);
/** Its light under an exposure, from the coordinator's gain: none under Eye. Pure. */
export function lookFor(gain = 1) {
  const mode = EXPOSURES.find((m) => Math.abs(exposureLook(m).milkyWay - gain) < 1e-6) || 'camera';
  return { mode, on: mode !== 'eye', gain: mode === 'deep' ? 1.3 : 1 };
}

const LINE_VERT = /* glsl */ `
attribute vec3 aColour;
varying vec3 vColour;
void main() {
  vColour = aColour;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;
const LINE_FRAG = /* glsl */ `
uniform float uGain;
varying vec3 vColour;
void main() { gl_FragColor = vec4( vColour * ${SHAPE.line.toFixed(3)} * uGain, 1.0 ); }`;
const POINT_VERT = /* glsl */ `
attribute vec3 aColour;
uniform float uPixelRatio;
varying vec3 vColour;
void main() {
  vColour = aColour;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  gl_PointSize = ${SHAPE.pointPx.toFixed(1)} * uPixelRatio;
}`;
const POINT_FRAG = /* glsl */ `
uniform float uGain;
varying vec3 vColour;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( q, q );
  if ( r2 > 1.0 ) discard;
  gl_FragColor = vec4( vColour * ${SHAPE.ribbon.toFixed(3)} * ( 1.0 - r2 ) * uGain, 1.0 );
}`;
/** The shader sources, for the test. */
export const SHADERS = { lineVertex: LINE_VERT, lineFrag: LINE_FRAG, pointVertex: POINT_VERT, pointFrag: POINT_FRAG };

export function createLayer(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'deep-streams';
  group.renderOrder = -1;
  group.matrixAutoUpdate = false;
  group.visible = false;
  const state = { loaded: false, failed: null, placedFor: null, calls: 0, on: false, fade: 0, lines: 0, ribbon: 0 };
  const sunAt = new THREE.Vector3();
  let loading = false, geoLine = null, geoPts = null, matLine = null, matPts = null;

  function build(data) {
    const T = tracks(data);
    const segs = [], segCol = [];
    for (const s of T) for (let i = 1; i < s.pts.length; i++) { segs.push(...s.pts[i - 1], ...s.pts[i]); segCol.push(...s.colour, ...s.colour); }
    const total = T.reduce((a, s) => a + lengthKly(s.pts), 0) || 1;
    const rib = [], ribCol = [];
    T.forEach((s, k) => {
      const n = Math.max(20, Math.round(STYLE.ribbonCount * lengthKly(s.pts) / total));
      const r = ribbonOf(s.pts, n, s.ribbon / 2, 101 + k);
      for (let i = 0; i < r.length; i++) rib.push(r[i]);
      for (let i = 0; i < n; i++) ribCol.push(...s.colour);
    });
    geoLine = new THREE.BufferGeometry();
    geoLine.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    geoLine.setAttribute('aColour', new THREE.Float32BufferAttribute(segCol, 3));
    geoPts = new THREE.BufferGeometry();
    geoPts.setAttribute('position', new THREE.Float32BufferAttribute(rib, 3));
    geoPts.setAttribute('aColour', new THREE.Float32BufferAttribute(ribCol, 3));
    const flags = { transparent: false, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending };
    matLine = new THREE.ShaderMaterial({ vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, uniforms: { uGain: { value: 1 } }, ...flags });
    matLine.name = 'deep-streams-tracks';
    matPts = new THREE.ShaderMaterial({ vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, uniforms: { uGain: { value: 1 }, uPixelRatio: { value: 1 } }, ...flags });
    matPts.name = 'deep-streams-ribbons';
    const lines = new THREE.LineSegments(geoLine, matLine);
    lines.name = 'deep-streams-shells'; // the contract's draw-order check knows a deep mesh by `-shells`
    const pts = new THREE.Points(geoPts, matPts);
    pts.name = 'deep-streams-ribbon-shells';
    for (const o of [lines, pts]) { o.frustumCulled = false; o.renderOrder = -1; group.add(o); }
    state.lines = segs.length / 6; state.ribbon = rib.length / 3; state.loaded = true;
  }

  if (env.data) build(env.data);
  else if (typeof document !== 'undefined' && typeof fetch === 'function') {
    loading = true;
    fetch(new URL(DATA_URL, import.meta.url).href).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { build(d); loading = false; })
      .catch((e) => { state.failed = String((e && e.message) || e); loading = false; });
  }

  const _m = new THREE.Matrix4();
  function place(stage) {
    const key = `${stage.worldId}:${stage.unitKm}`;
    if (state.placedFor === key) return true;
    const A = stage.affineFrom ? stage.affineFrom(SUN_INERTIAL, stage.tMs) : null;
    if (!A) return false;
    const k = KLY_KM;
    _m.set(
      A.x[0] * k, A.y[0] * k, A.z[0] * k, A.o[0],
      A.x[1] * k, A.y[1] * k, A.z[1] * k, A.o[1],
      A.x[2] * k, A.y[2] * k, A.z[2] * k, A.o[2],
      0, 0, 0, 1,
    );
    const sun = stage.toScene({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, stage.tMs);
    if (sun) { _m.setPosition(sun); sunAt.set(sun.x, sun.y, sun.z); }
    group.matrix.copy(_m);
    group.matrixWorldNeedsUpdate = true;
    state.placedFor = key;
    return true;
  }

  return {
    group,
    frame(info = {}) {
      state.calls = 0;
      const look = lookFor(Number.isFinite(info.gain) ? info.gain : 1);
      state.on = !!(info.camera && info.visible !== false && !info.before && state.loaded && look.on && info.stage && place(info.stage));
      if (state.on) {
        const ly = info.camera.position.distanceTo(sunAt) * info.stage.unitKm / 9460730472580.8;
        state.fade = fadeAt(ly);
        state.on = state.fade > 0.005;
      }
      group.visible = state.on;
      if (!state.on) return;
      matLine.uniforms.uGain.value = look.gain * state.fade;
      matPts.uniforms.uGain.value = look.gain * state.fade;
      matPts.uniforms.uPixelRatio.value = (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1;
      state.calls = 2;
    },
    // nothing in flight: the file has landed, failed, or was never asked for (no document: a test)
    ready: () => !loading,
    stats: () => ({ id: 'streams', loaded: state.loaded, failed: state.failed, on: state.on, fade: Math.round(state.fade * 100) / 100, calls: state.calls, segments: state.lines, ribbonPoints: state.ribbon, bytes: (state.lines * 12 + state.ribbon * 3) * 4 }),
    dispose() {
      if (geoLine) geoLine.dispose();
      if (geoPts) geoPts.dispose();
      if (matLine) matLine.dispose();
      if (matPts) matPts.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}
