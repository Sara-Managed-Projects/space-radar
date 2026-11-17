// scene/deep/localdust.js -- the Sun's neighbourhood as real 3D dust: the Local Bubble and the clouds round it (internal #423,
// idea 5 of the 16 Nov review). A deep layer (scene/deep/heroes.js DEEP_LAYERS) on the stellar rung, fetched the first time that
// rung is entered; never at boot. It is seen from OUTSIDE the neighbourhood: faded in as the camera leaves it (from 300 ly out
// of the Sun, whole by 1 500) and out again past the neighbourhood's own scale (8 000 to 30 000 ly), and not at all under the
// Eye exposure (no eye sees dust that gives off no light).
//   createLayer(THREE, env) -> { group, frame(info), ready(), stats(), dispose() }
//     env  = { load?(): Promise<{manifest, buffer}>, base?: URL }   (load is for tests)
//     info = { camera, renderer, stage, gain, visible, before }
// Pure, for tests/test_localdust.mjs: parseDust, pointsOf, galToEcl, lookFor, fadeFor
//
// WHAT IT DRAWS. Edenhofer, Zucker, Frank and others (2024, A&A 685, A82; Zenodo 10.5281/zenodo.8187943, CC BY 4.0) mapped the
// dust's extinction density in 3D from Gaia parallaxes and spectra, out to 1.25 kpc, to a few parsecs. scripts/build_deep_localdust.py
// reduces its posterior mean to 8 pc cells within 640 pc of the Sun and draws 40 000 points from them, each in a cell chosen in
// proportion to the cell's density (capped, so Orion and Taurus do not take every point). The Sun stands in the cavity of low density
// round it, the Local Bubble, whose wall (170 pc on average, O'Neill and others 2024, ApJ 973, 138) is the ring of points round it.
//   MEASURED: where the dust is, and how dense, in 8 pc cells, in the map's own axes.
//   MODELLED / ILLUSTRATIVE (the card and registry/visual-classes.yaml LOCAL_DUST say so): the points are a random sample of that
//   density, never grains; the soft warm colour is false (dust is dark against the stars, and glows only in the infrared); the dust
//   does not dim the stars behind it here, and nothing in it moves.
// ONE POINTS DRAW CALL, 160 kB of data (4 bytes a point), additive, no depth test, like the other deep layers.

import { eqToEcl } from '../nebulae.js';
import { exposureLook, EXPOSURES } from '../exposure.js';

export const UNDER_MEASURED = { dust: 'same' };
const PC_KM = 30856775814913.67;
const SUN_INERTIAL = 'sun-inertial';
export const FILES = { json: 'localdust.json', bin: 'localdust.bin' };
export const SHAPE = {
  in: [300, 1500],        // ly of the camera from the Sun: it fades in over these (a flight out of the neighbourhood)
  out: [8000, 30000],     // and out again over these
  close: [20, 90],        // pc of a point from the camera: nearer than this it fades (never a haze in the face)
  sizePc: 18,             // a point's diameter in pc (a little over two 8 pc cells)
  minPx: 2, maxPx: 40,    // CSS px
  peak: 0.5,              // the brightest point's light before the exposure's gain: a display value
  gamma: 1.8,             // the log density to light (a faint cell is far fainter than a dense one)
  colour: [0.74, 0.5, 0.32],
};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Galactic -> equatorial J2000 (the IAU matrix's transpose: rows are the equatorial axes in Galactic coordinates), then the ecliptic: the frame of every record's place.
const G2E = [
  [-0.0548755604162154, 0.4941094278755837, -0.8676661490190047],
  [-0.8734370902348850, -0.4448296299600112, -0.1980763734312015],
  [-0.4838350155487132, 0.7469822444972189, 0.4559837761750669],
];
/** A Galactic vector -> a sun-inertial (ecliptic J2000) one. Pure. */
export const galToEcl = (g) => eqToEcl(G2E.map((r) => r[0] * g[0] + r[1] * g[1] + r[2] * g[2]));

/** The file's head and rows, checked. Pure. */
export function parseDust(buffer) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SRLD') throw new Error(`localdust: not a dust file (${magic})`);
  const version = dv.getUint32(4, true), count = dv.getUint32(8, true), stride = dv.getUint32(12, true);
  if (buffer.byteLength !== 16 + count * stride) throw new Error(`localdust: ${buffer.byteLength} bytes for ${count} rows of ${stride}`);
  return { version, count, stride, rows: new Uint8Array(buffer, 16, count * stride) };
}
/** The points: positions in pc about the Sun on the sun-inertial axes, and each one's light 0..1 (a log-density byte). Pure. */
export function pointsOf(file, manifest) {
  const n = file.count, q = (2 * manifest.grid.boxPc) / 255, box = manifest.grid.boxPc;
  const pos = new Float32Array(n * 3), light = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * file.stride;
    const e = galToEcl([file.rows[o] * q - box, file.rows[o + 1] * q - box, file.rows[o + 2] * q - box]);
    pos[i * 3] = e[0]; pos[i * 3 + 1] = e[1]; pos[i * 3 + 2] = e[2];
    light[i] = file.rows[o + 3] / 255;
  }
  return { count: n, pos, light };
}
/** How much of the layer shows with the camera `ly` from the Sun. Pure. */
export function fadeFor(ly) { return smooth(ly, SHAPE.in[0], SHAPE.in[1]) * (1 - smooth(ly, SHAPE.out[0], SHAPE.out[1])); }
/** Its light under an exposure, from the coordinator's gain: none under Eye. Pure. */
export function lookFor(gain = 1) {
  const mode = EXPOSURES.find((m) => Math.abs(exposureLook(m).milkyWay - gain) < 1e-6) || 'camera';
  return { mode, on: mode !== 'eye', gain: mode === 'deep' ? 1.3 : 1 };
}

const VERT = /* glsl */ `
attribute float aLight;
uniform float uUnitsPerPc;
uniform float uPixelRatio;
uniform float uViewH;     // the drawing buffer's height in px
uniform float uGain;
varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  float depth = max( 1e-9, -mv.z );
  float dpc = length( mv.xyz ) / uUnitsPerPc;
  float px = ${SHAPE.sizePc.toFixed(1)} * uUnitsPerPc * 0.5 * uViewH * projectionMatrix[1][1] / depth;
  float size = clamp( px, ${SHAPE.minPx.toFixed(1)} * uPixelRatio, ${SHAPE.maxPx.toFixed(1)} * uPixelRatio );
  gl_PointSize = size;
  // a point drawn wider than its own size (clamped up) carries the same light over more pixels
  float spread = min( 1.0, ( px * px ) / max( 1.0, size * size ) );
  vA = pow( aLight, ${SHAPE.gamma.toFixed(2)} ) * ${SHAPE.peak.toFixed(2)} * spread * uGain * smoothstep( ${SHAPE.close[0].toFixed(1)}, ${SHAPE.close[1].toFixed(1)}, dpc );
}
`;
const FRAG = /* glsl */ `
uniform vec3 uColour;
varying float vA;
void main() {
  if ( vA <= 0.002 ) discard;
  float d = length( gl_PointCoord - vec2( 0.5 ) ) * 2.0;
  float f = exp( -3.0 * d * d ) * ( 1.0 - smoothstep( 0.8, 1.0, d ) );
  gl_FragColor = vec4( uColour * f * vA, 1.0 );
}
`;
export const SHADERS = { vertex: VERT, fragment: FRAG };

async function fetchAll(base) {
  const get = (n) => fetch(String(new URL(`data/deep/${n}`, base)));
  const [j, b] = await Promise.all([get(FILES.json), get(FILES.bin)]);
  if (!j.ok || !b.ok) throw new Error(`localdust: HTTP ${j.status} / ${b.status}`);
  return { manifest: await j.json(), buffer: await b.arrayBuffer() };
}

export function createLayer(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'deep-localdust';
  group.renderOrder = -1;
  group.matrixAutoUpdate = false;
  group.visible = false;
  const base = env.base || (typeof import.meta !== 'undefined' ? new URL('../../../', import.meta.url) : null);
  const state = { loaded: false, failed: null, loading: true, calls: 0, on: false, fade: 0, placedFor: null, count: 0, bytes: 0, fileBytes: 0 };
  const uniforms = { uUnitsPerPc: { value: 1 }, uPixelRatio: { value: 1 }, uViewH: { value: 1080 }, uColour: { value: new THREE.Vector3(...SHAPE.colour) }, uGain: { value: 1 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: false, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  mat.name = 'deep-localdust';
  let mesh = null;
  const sunAt = new THREE.Vector3();
  const _m = new THREE.Matrix4();

  const loading = Promise.resolve()
    .then(() => (env.load ? env.load() : fetchAll(base)))
    .then(({ manifest, buffer }) => {
      const file = parseDust(buffer);
      const p = pointsOf(file, manifest);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(p.pos, 3));
      geo.setAttribute('aLight', new THREE.BufferAttribute(p.light, 1));
      mesh = new THREE.Points(geo, mat);
      mesh.name = 'deep-localdust-points';
      mesh.frustumCulled = false;
      mesh.renderOrder = -1;
      group.add(mesh);
      state.count = p.count; state.bytes = p.pos.byteLength + p.light.byteLength; state.fileBytes = buffer.byteLength + JSON.stringify(manifest).length;
      state.loaded = true;
    })
    .catch((e) => { state.failed = String(e && e.message || e); console.warn('deep: the local dust did not load', e); })
    .finally(() => { state.loading = false; });

  /** The group's matrix: pc on the sun-inertial axes about the Sun, into the stage's scene units. */
  function place(stage) {
    const key = `${stage.worldId}:${stage.unitKm}`;
    if (state.placedFor === key) return true;
    const A = stage.affineFrom ? stage.affineFrom(SUN_INERTIAL, stage.tMs) : null;
    if (!A) return false;
    const k = PC_KM;
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
    group, loading,
    frame(info = {}) {
      state.calls = 0;
      const look = lookFor(Number.isFinite(info.gain) ? info.gain : 1);
      state.on = !!(info.camera && info.visible !== false && !info.before && state.loaded && look.on && info.stage && place(info.stage));
      if (state.on) {
        const ly = info.camera.position.distanceTo(sunAt) * info.stage.unitKm / 9460730472580.8;
        state.fade = fadeFor(ly);
        state.on = state.fade > 0.005;
      }
      group.visible = state.on;
      if (!state.on) return;
      const r = info.renderer;
      uniforms.uUnitsPerPc.value = PC_KM / info.stage.unitKm;
      uniforms.uPixelRatio.value = r && r.getPixelRatio ? r.getPixelRatio() : 1;
      uniforms.uViewH.value = r && r.domElement ? r.domElement.height || 1080 : 1080;
      uniforms.uGain.value = look.gain * state.fade;
      state.calls = 1;
    },
    ready: () => !state.loading,
    stats: () => ({ id: 'localdust', loaded: state.loaded, failed: state.failed, on: state.on, fade: Math.round(state.fade * 100) / 100, calls: state.calls, points: state.count, bytes: state.bytes, fileBytes: state.fileBytes }),
    dispose() {
      if (mesh) { mesh.geometry.dispose(); group.remove(mesh); }
      mat.dispose();
      if (group.parent) group.parent.remove(group);
    },
  };
}
