// scene/galaxy.js -- the Milky Way as a place, and honestly a model (spec 0028 step 6).
//
// Contract: createGalaxy(scene, opts) -> { ensureGeometry, setVisible, setOpacity, rebuild, update,
//   count, dispose, mode }
//
// site/data/galaxy.bin is a point cloud built by scripts/build-galaxy.py from PUBLISHED NUMBERS --
// Reid et al. 2019's fitted spiral arms and R0, the disc's measured size, the debated bar taken at
// the middle of its range -- and it is an ILLUSTRATION: nobody has seen our galaxy from outside.
// registry/models.yaml says so (`cls: illustrative`), the layer's sentence says so, and the record
// for the galaxy says so on its card. The stars around the Sun (scene/stars3d.js) are the measured
// layer; this is the shape they sit in.
//
// Static like the stars: one buffer, rebuilt only when the stage changes (140 292 conversions,
// float64, no allocation), and registry/lod.yaml fades it in as the camera leaves the stellar
// neighbourhood (`galaxy-model`). It is never drawn from a world stage: from Earth it would be a
// 2 MB download to paint a wisp behind the Moon, and the sky panorama already IS the view from here.

import * as THREE from '../../vendor/three.module.min.js';
import { stage, isLadderStage } from './stage.js';

export const KPC_KM = 30856775814913670; // one kiloparsec (1 pc = 3.0857e13 km; the first draft wrote the parsec here)
const HEADER = 12;
const STRIDE = 16;
const SUN_INERTIAL = 'sun-inertial';
// kind -> colour: disc pale, bulge warm, bar amber, arms blue-white (young stars)
const KIND_RGB = [
  [0.78, 0.80, 0.92],
  [1.0, 0.86, 0.66],
  [1.0, 0.78, 0.52],
  [0.72, 0.84, 1.0],
];

const VERT = /* glsl */ `
attribute float aWeight;
attribute vec3 aColour;
uniform float uPixelRatio;
uniform float uGain;
uniform float uUnitsPerKpc;
varying vec3 vColour;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  // A point is a patch of galaxy ~150 pc across: bigger when the camera is close, never below 1.5 px.
  float dKpc = max( 1e-6, -mv.z / uUnitsPerKpc );
  gl_PointSize = clamp( 0.15 / dKpc * 600.0, 1.5, 6.0 ) * uPixelRatio;
  vAlpha = aWeight * uGain * 0.55;
  vColour = aColour;
}
`;
const FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
#include <common>
void main() {
  if ( vAlpha <= 0.0 ) discard;
  float d = length( gl_PointCoord - vec2( 0.5 ) );
  float a = 1.0 - smoothstep( 0.1, 0.5, d );
  if ( a <= 0.0 ) discard;
  gl_FragColor = vec4( vColour, a * vAlpha );
  #include <colorspace_fragment>
}
`;

/** Parse the binary. Exported for the test. */
export function parseGalaxy(buffer) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SRGX') throw new Error(`galaxy.bin: bad magic ${JSON.stringify(magic)}`);
  const version = dv.getUint32(4, true);
  const count = dv.getUint32(8, true);
  if (buffer.byteLength !== HEADER + count * STRIDE) throw new Error('galaxy.bin: length does not match its count');
  const posKpc = new Float32Array(count * 3);
  const kind = new Uint8Array(count);
  const weight = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = HEADER + i * STRIDE;
    posKpc[i * 3] = dv.getFloat32(o, true);
    posKpc[i * 3 + 1] = dv.getFloat32(o + 4, true);
    posKpc[i * 3 + 2] = dv.getFloat32(o + 8, true);
    kind[i] = dv.getUint8(o + 12);
    weight[i] = dv.getUint8(o + 13) / 255;
  }
  return { version, count, posKpc, kind, weight };
}

export function createGalaxy(scene, opts = {}) {
  const here = typeof import.meta !== 'undefined' ? import.meta.url : undefined;
  const src = opts.bin ?? (here ? new URL('../../data/galaxy.bin', here) : 'data/galaxy.bin');
  const group = new THREE.Group();
  group.name = 'galaxy';
  group.renderOrder = -1;
  if (scene) scene.add(group);

  let data = null;
  let geometry = null;
  let points = null;
  let layerOn = true;
  let opacity = 0;
  let builtFor = null;
  let loading = null;
  const uniforms = { uPixelRatio: { value: 1 }, uGain: { value: 0 }, uUnitsPerKpc: { value: 1 } };

  function ensureGeometry() {
    if (data) return Promise.resolve(data);
    if (loading) return loading;
    loading = (opts.binBuffer
      ? Promise.resolve(opts.binBuffer)
      // `no-cache` = revalidate: the name never changes, the bytes do; unchanged, the answer is a 304.
      : fetch(String(src), { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(`${src}: HTTP ${r.status}`); return r.arrayBuffer(); }))
      .then((buf) => { data = parseGalaxy(buf); build(); rebuild(); return data; })
      .catch((err) => { console.warn('galaxy: could not load', err); loading = null; return null; });
    return loading;
  }

  function build() {
    const n = data.count;
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geometry.setAttribute('aWeight', new THREE.BufferAttribute(data.weight, 1));
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const c = KIND_RGB[data.kind[i]] || KIND_RGB[0];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    geometry.setAttribute('aColour', new THREE.BufferAttribute(col, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    points = new THREE.Points(geometry, material);
    points.name = 'galaxy';
    points.frustumCulled = false;
    points.renderOrder = -1;
    group.add(points);
    applyVisibility();
  }

  const _km = { x: 0, y: 0, z: 0 };
  const _v = new THREE.Vector3();

  /** Positions for the current stage. Only a rung draws the model; on a world stage it is hidden. */
  function rebuild() {
    if (!data || !geometry) return;
    const key = stage.worldId;
    if (key === builtFor) return;
    builtFor = key;
    if (!isLadderStage(stage.worldId)) { applyVisibility(); return; }
    const tMs = stage.tMs;
    const pos = geometry.getAttribute('position').array;
    for (let i = 0; i < data.count; i++) {
      _km.x = data.posKpc[i * 3] * KPC_KM;
      _km.y = data.posKpc[i * 3 + 1] * KPC_KM;
      _km.z = data.posKpc[i * 3 + 2] * KPC_KM;
      if (!stage.toSceneInto(_km, SUN_INERTIAL, _v, tMs)) { pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0; continue; }
      pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
    }
    geometry.getAttribute('position').needsUpdate = true;
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30 * KPC_KM / stage.unitKm);
    uniforms.uUnitsPerKpc.value = KPC_KM / stage.unitKm;
    applyVisibility();
  }

  function applyVisibility() {
    if (points) points.visible = layerOn && opacity > 0 && isLadderStage(stage.worldId);
    uniforms.uGain.value = opacity;
  }
  function setVisible(on) { layerOn = on !== false; applyVisibility(); if (layerOn && opacity > 0 && isLadderStage(stage.worldId)) ensureGeometry(); }
  /** registry/lod.yaml's `galaxy-model` hook, 0..1. */
  function setOpacity(k) {
    opacity = Math.min(1, Math.max(0, Number(k) || 0));
    applyVisibility();
    if (layerOn && opacity > 0 && isLadderStage(stage.worldId)) ensureGeometry();
  }
  function update(camera, renderer) {
    if (!points) return;
    if (renderer && typeof renderer.getPixelRatio === 'function') uniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, renderer.getPixelRatio()));
  }
  function dispose() {
    if (geometry) geometry.dispose();
    if (points && points.material) points.material.dispose();
    if (scene) scene.remove(group);
    data = null; geometry = null; points = null; builtFor = null;
  }
  return {
    ensureGeometry, setVisible, setOpacity, rebuild, update, dispose, group,
    count: () => (data ? data.count : null),
    mode: () => (points && points.visible ? 'drawn' : 'hidden'),
  };
}
