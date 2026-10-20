// scene/deep/magellanic.js -- the Magellanic Bridge and the Magellanic Stream as neutral hydrogen (internal spec 0077
// stage W2-e, internal #783; DS-08, package section 5.2 layer 5). A deep layer (scene/deep/heroes.js DEEP_LAYERS) on the
// Milky Way's and the Local Group's stages, fetched the first time one of them is entered; never at boot.
//   createLayer(THREE, env) -> { group, frame(info), ready(), stats(), dispose() }
//     info = { camera, renderer, stage, gain, visible, before }
// Pure, for tests/test_hero_smc.mjs: magToGal, galToEq, directionOf, distanceAt, keepAt, sheetOf, lookFor.
//
// WHAT IT DRAWS. The hydrogen the HI4PI survey maps by its 21 cm radio line where it moves too fast to be the Milky
// Way's (Westmeier 2018), in the part of the sky round the Clouds and along the Stream: one sheet, one draw call. It
// gives off no light an eye or a camera would see, so it is drawn in FALSE colour, faint, and not at all under the Eye
// exposure; the card and the registry say so. Its place ON THE SKY and its column along each line are measured; WHERE IT
// IS ALONG OUR LINE is a model (registry/deepsky-heroes/smc.yaml, part `stream`): the Bridge between the LMC's measured
// distance and the SMC's, the Stream from the SMC's distance at its root to a model's distance at its far end. The
// Clouds' own hydrogen fades out inside their catalogue ellipses (their heroes draw them), and the Leading Arm is not
// drawn (its distance is uncertain in another way).
//
// A SHEET, NOT A FOG. The gas is a surface at that modelled distance, lit by its column: seen face on it is the map;
// seen at a slant its column grows as a thin layer's does (1 / |cos|, capped at two and a half times), so edge on it is
// a brighter line, never a slab of haze; nothing in it moves.

import { eqToEcl } from '../nebulae.js';
import { exposureLook, EXPOSURES } from '../exposure.js';
import { HERO as SMC } from '../../data/hero-smc.js';

export const UNDER_MEASURED = { gas: 'same' };
const D2R = Math.PI / 180;
const KLY_KM = 9460730472580.8 * 1e3;
const SUN_INERTIAL = 'sun-inertial';
const TEX_URL = '../../../images/deep/magellanic/hi-column.webp';
export const SHAPE = {
  step: 1,          // the sheet's vertices, degrees
  peak: 0.26,       // its brightest, a display value: a radio map is a faint overlay, never a glow
  limbCap: 2.5,     // a slant's column grows as 1 / |cos| up to this
  gamma: 1.6,       // the column's log scale to light: the faint Stream stays faint
};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const galVec = (l, b) => [Math.cos(b * D2R) * Math.cos(l * D2R), Math.cos(b * D2R) * Math.sin(l * D2R), Math.sin(b * D2R)];

// Magellanic coordinates (Nidever, Majewski & Butler Burton 2008): the pole at Galactic (188.5, -7.5) degrees, longitude 0
// at the LMC's Galactic place (280.47, -32.75). The bake's frame (scripts/build_deep_magellanic.py).
const M_POLE = galVec(188.5, -7.5);
const M_X = (() => { const z0 = galVec(280.47, -32.75); const k = dot(z0, M_POLE); return norm([z0[0] - k * M_POLE[0], z0[1] - k * M_POLE[1], z0[2] - k * M_POLE[2]]); })();
const M_Y = cross(M_POLE, M_X);
/** A Magellanic (L, B) in degrees -> a Galactic unit vector. Pure. */
export function magToGal(L, B) {
  const c = Math.cos(B * D2R), s = Math.sin(B * D2R), cl = Math.cos(L * D2R), sl = Math.sin(L * D2R);
  return [0, 1, 2].map((i) => c * cl * M_X[i] + c * sl * M_Y[i] + s * M_POLE[i]);
}
// Galactic -> equatorial J2000 (the IAU matrix's transpose: rows are the equatorial axes in Galactic coordinates).
const G2E = [
  [-0.0548755604162154, 0.4941094278755837, -0.8676661490190047],
  [-0.8734370902348850, -0.4448296299600112, -0.1980763734312015],
  [-0.4838350155487132, 0.7469822444972189, 0.4559837761750669],
];
/** A Galactic unit vector -> an equatorial one. Pure. */
export const galToEq = (g) => G2E.map((r) => r[0] * g[0] + r[1] * g[1] + r[2] * g[2]);
/** A Magellanic (L, B) -> a sun-inertial (ecliptic J2000) unit vector, the frame of every record's place. Pure. */
export const directionOf = (L, B) => eqToEcl(galToEq(magToGal(L, B)));

const stream = () => (SMC.layers || []).find((l) => l && l.part === 'stream') || {};

/** The modelled distance (ly) of the gas at Magellanic longitude L (registry/deepsky-heroes/smc.yaml `stream.distance`). Pure. */
export function distanceAt(L, s = stream()) {
  const d = s.distance || {};
  const lmc = Number(d.lmc_ly) || 161740, smc = Number(d.smc_ly) || 203650, root = Number(d.root_l_deg) || -15.5, tip = Number(d.tip_ly) || 330000;
  const lMin = Number((s.map || {}).l_min) || -150;
  if (L >= 0) return lmc;                                   // round the LMC (the Leading Arm is not drawn)
  if (L >= root) return lmc + (smc - lmc) * (L / root);      // the Bridge: from the LMC's distance to the SMC's
  return smc + (tip - smc) * clamp((L - root) / (lMin - root), 0, 1); // the Stream: from its root to the model's far end
}

/** How much of the gas at (L, B) is drawn: none inside the Clouds' own ellipses or along the Leading Arm. Pure. */
export function keepAt(L, B) {
  const sep = (L0, B0) => { const a = magToGal(L, B), b = magToGal(L0, B0); return Math.acos(clamp(dot(a, b), -1, 1)) / D2R; };
  // the LMC's catalogue ellipse is 645' x 517' (about 5 degrees in radius), the SMC's 320' (2.7 degrees)
  const lmc = smooth(sep(0.0, 2.4) / 5.0, 0.55, 1.0), smc = smooth(sep(-15.5, -11.6) / 2.7, 0.55, 1.0);
  const arm = 1 - smooth(L, 2, 8);
  return lmc * smc * arm;
}

/** The sheet: a grid over the map's crop, every `step` degrees; positions in kly about the Sun (sun-inertial). Pure. */
export function sheetOf(s = stream(), step = SHAPE.step) {
  const m = s.map || { l_min: -150, l_max: 20, b_min: -40, b_max: 30 };
  const nl = Math.round((m.l_max - m.l_min) / step) + 1, nb = Math.round((m.b_max - m.b_min) / step) + 1;
  const pos = new Float32Array(nl * nb * 3), uv = new Float32Array(nl * nb * 2), keep = new Float32Array(nl * nb), nrm = new Float32Array(nl * nb * 3);
  const P = (L, B) => { const v = directionOf(L, B), d = distanceAt(L, s) / 1000; return [v[0] * d, v[1] * d, v[2] * d]; };
  for (let j = 0; j < nb; j++) for (let i = 0; i < nl; i++) {
    const L = m.l_max - i * step, B = m.b_max - j * step, k = j * nl + i;
    const p = P(L, B);
    pos.set(p, 3 * k);
    // the texture: column 0 at l_max, row 0 at b_max (the bake's), so u runs with i and v against j (texture v up)
    uv.set([(i * step) / (m.l_max - m.l_min), 1 - (j * step) / (m.b_max - m.b_min)], 2 * k);
    keep[k] = keepAt(L, B);
    const a = P(L - 0.5, B), b = P(L + 0.5, B), c = P(L, B - 0.5), d = P(L, B + 0.5);
    nrm.set(norm(cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [d[0] - c[0], d[1] - c[1], d[2] - c[2]])), 3 * k);
  }
  const index = [];
  for (let j = 0; j < nb - 1; j++) for (let i = 0; i < nl - 1; i++) { const k = j * nl + i; index.push(k, k + nl, k + 1, k + 1, k + nl, k + nl + 1); }
  return { pos, uv, keep, nrm, index, nl, nb };
}

/** Its light under an exposure, from the coordinator's gain: none under Eye (no eye sees 21 cm). Pure. */
export function lookFor(gain = 1) {
  const mode = EXPOSURES.find((m) => Math.abs(exposureLook(m).milkyWay - gain) < 1e-6) || 'camera';
  return { mode, on: mode !== 'eye', gain: mode === 'deep' ? 1.3 : 1 };
}

const VERT = /* glsl */ `
attribute vec2 aUv;
attribute float aKeep;
attribute vec3 aNormal;
varying vec2 vUv;
varying float vKeep;
varying float vMu;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vUv = aUv; vKeep = aKeep;
  // in view space: three.js makes modelViewMatrix in float64 on the CPU, so the GPU sees camera-relative numbers
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  vMu = abs( dot( normalize( normalMatrix * aNormal ), normalize( -mv.xyz ) ) );
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}
`;
const FRAG = /* glsl */ `
uniform sampler2D uMap;   // g: (log10 N - log_min) / (log_max - log_min)
uniform vec3 uColour;
uniform float uGain;
varying vec2 vUv;
varying float vKeep;
varying float vMu;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  float v = texture2D( uMap, vUv ).g;
  if ( v <= 0.002 || vKeep <= 0.002 ) discard;
  float limb = min( 1.0 / max( vMu, 1e-3 ), ${SHAPE.limbCap.toFixed(1)} );
  float a = pow( v, ${SHAPE.gamma.toFixed(2)} ) * ${SHAPE.peak.toFixed(3)} * limb * vKeep * uGain;
  gl_FragColor = vec4( uColour * a, 1.0 );
}
`;
export const SHADERS = { vertex: VERT, fragment: FRAG };

export function createLayer(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'deep-magellanic';
  group.renderOrder = -1;
  group.matrixAutoUpdate = false;
  group.visible = false;
  const s = stream();
  const sh = sheetOf(s);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(sh.pos, 3));
  geo.setAttribute('aUv', new THREE.Float32BufferAttribute(sh.uv, 2));
  geo.setAttribute('aKeep', new THREE.Float32BufferAttribute(sh.keep, 1));
  geo.setAttribute('aNormal', new THREE.Float32BufferAttribute(sh.nrm, 3));
  geo.setIndex(sh.index);
  const state = { loaded: false, failed: null, placedFor: null, calls: 0, on: false };
  const blank = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
  blank.needsUpdate = true;
  let tex = null;
  if (typeof document !== 'undefined' && THREE.TextureLoader) {
    tex = new THREE.TextureLoader().load(new URL(TEX_URL, import.meta.url).href, () => { state.loaded = true; }, undefined, (e) => { state.failed = String(e && e.message || e); });
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  } else if (env.texture) { tex = env.texture; state.loaded = true; }
  const uniforms = { uMap: { value: tex || blank }, uColour: { value: new THREE.Vector3(...(s.colour || [0.45, 0.62, 1])) }, uGain: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: false, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  mat.name = 'deep-magellanic-gas';
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'deep-magellanic-shells';
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  group.add(mesh);
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
    if (sun) _m.setPosition(sun);
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
      group.visible = state.on;
      if (!state.on) return;
      uniforms.uGain.value = look.gain;
      state.calls = 1;
    },
    ready: () => state.loaded || !!state.failed,
    stats: () => ({ id: 'magellanic', loaded: state.loaded, failed: state.failed, on: state.on, calls: state.calls, vertices: sh.pos.length / 3, triangles: sh.index.length / 3, bytes: sh.pos.byteLength + sh.uv.byteLength + sh.keep.byteLength + sh.nrm.byteLength + sh.index.length * 4 + 680 * 280 * 4 }),
    dispose() {
      geo.dispose(); mat.dispose(); blank.dispose();
      if (tex && !env.texture) tex.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}
