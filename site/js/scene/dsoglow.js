// scene/dsoglow.js -- a deep-sky object drawn as big as it is, when that is bigger than its dot.
//
// Contract: createDsoGlow(scene) -> { setRecords(records), rebuild(), update(camera, renderer,
//   visible), count(), dispose(), group }
// Also exported, pure, for the test: glowFor(record) -> {colour, sizeKm} | null
//
// WHY. Every deep-sky object was one 8 px dot whatever its size. On the "To the edge" trip the
// Pleiades stop is 100 light-years from a cluster 19 light-years across -- eleven degrees of sky --
// and it was that dot (measured 2026-09-22). The records know how big they are: 202 of 209 carry a
// major axis (OpenNGC or the hand row's source), and data/parsers.js turns it into `sizeLy`.
//
// WHAT IT IS, AND IS NOT. A soft round glow at the measured distance, the measured size across,
// coloured by what the thing is. It is not the shape: the file has no minor axis or position angle,
// so an edge-on galaxy glows round, and the card says "its true shape is not drawn". Dark nebulae
// get no glow (they are dark), and Andromeda has a model of its own (scene/galaxy.js).
//
// WHEN. Only on a rung of the ladder, only with the deep-sky layer drawn, and only while the glow is
// between a few pixels (below that the dot says it all) and a few hundred (above that the camera is
// nearly inside it, and GPUs cap a point's size, so a clamped glow would claim the wrong size; it
// fades out first).

import * as THREE from '../../vendor/three.module.min.js';
import { stage, isLadderStage } from './stage.js';

const LY_KM = 9460730472580.8;
const SUN_INERTIAL = 'sun-inertial';
const NO_GLOW = new Set(['DrkN', '**', 'Other']);
const MODELLED = new Set(['dso-m31']); // drawn by scene/galaxy.js

// typeCode (OpenNGC) -> the colour it glows. Light, not photographs: galaxies warm starlight, young
// open clusters blue-white, old globulars pale gold, emission nebulae hydrogen pink, planetaries the
// teal of ionised oxygen, reflection nebulae blue.
const COLOURS = {
  G: [1.0, 0.92, 0.82],
  OCl: [0.78, 0.86, 1.0],
  '*Ass': [0.78, 0.86, 1.0],
  GCl: [1.0, 0.94, 0.78],
  PN: [0.55, 0.95, 0.85],
  HII: [1.0, 0.55, 0.66],
  Neb: [1.0, 0.6, 0.7],
  'Cl+N': [1.0, 0.62, 0.72],
  SNR: [0.85, 0.72, 1.0],
  RfN: [0.62, 0.76, 1.0],
};

/** The glow a record gets, or null. Pure. */
export function glowFor(record) {
  if (!record || record.klass !== 'dso' || MODELLED.has(record.id)) return null;
  const md = record.meta || {};
  const code = md.typeCode || null;
  if (code && NO_GLOW.has(code)) return null;
  const sizeLy = Number(md.sizeLy);
  if (!(sizeLy > 0) || !record.pos) return null;
  const colour = COLOURS[code] || COLOURS[md.kind === 'galaxy' ? 'G' : md.kind === 'cluster' ? 'OCl' : 'Neb'];
  return { colour, sizeKm: sizeLy * LY_KM };
}

const VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColour;
uniform float uPixelRatio;
uniform float uViewportH;
uniform float uGain;
varying vec3 vColour;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  float d = max( 1e-12, -mv.z );
  // its diameter on screen, in CSS px
  float px = aSize / d * projectionMatrix[1][1] * 0.5 * uViewportH;
  vAlpha = uGain * smoothstep( 4.0, 14.0, px ) * ( 1.0 - smoothstep( 220.0, 420.0, px ) );
  gl_PointSize = clamp( px, 1.0, 420.0 ) * uPixelRatio;
  vColour = aColour;
}
`;

const FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
#include <common>
void main() {
  if ( vAlpha <= 0.0 ) discard;
  vec2 q = gl_PointCoord - vec2( 0.5 );
  float r2 = dot( q, q ) * 4.0;           // 0 at the centre, 1 at the rim
  if ( r2 >= 1.0 ) discard;
  float a = exp( -3.2 * r2 ) * ( 1.0 - r2 ); // soft, and zero at the measured edge
  gl_FragColor = vec4( vColour, a * vAlpha * 0.34 );
  #include <colorspace_fragment>
}
`;

export function createDsoGlow(scene) {
  const group = new THREE.Group();
  group.name = 'dso-glow';
  group.renderOrder = -1;
  if (scene) scene.add(group);
  const uniforms = { uPixelRatio: { value: 1 }, uViewportH: { value: 800 }, uGain: { value: 1 } };
  let glows = [];
  let geometry = null;
  let points = null;
  let builtFor = null;
  const _v = new THREE.Vector3();

  function setRecords(records) {
    glows = [];
    for (const r of records || []) {
      const g = glowFor(r);
      if (g) glows.push({ record: r, ...g });
    }
    builtFor = null;
    rebuild();
  }

  function rebuild() {
    if (!isLadderStage(stage.worldId)) { if (points) points.visible = false; return; }
    if (builtFor === stage.worldId && points) return;
    builtFor = stage.worldId;
    const n = glows.length;
    if (!geometry || geometry.getAttribute('position').count !== n) {
      if (points) { group.remove(points); geometry.dispose(); points.material.dispose(); }
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
      geometry.setAttribute('aColour', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      points = new THREE.Points(geometry, new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, uniforms,
        transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      }));
      points.name = 'dso-glow';
      points.frustumCulled = false;
      points.renderOrder = -1;
      group.add(points);
    }
    const pos = geometry.getAttribute('position').array;
    const size = geometry.getAttribute('aSize').array;
    const col = geometry.getAttribute('aColour').array;
    for (let i = 0; i < n; i++) {
      const g = glows[i];
      const ok = stage.toSceneInto(g.record.pos, SUN_INERTIAL, _v, stage.tMs);
      pos[i * 3] = ok ? _v.x : 0; pos[i * 3 + 1] = ok ? _v.y : 0; pos[i * 3 + 2] = ok ? _v.z : 0;
      size[i] = ok ? g.sizeKm / stage.unitKm : 0;
      col[i * 3] = g.colour[0]; col[i * 3 + 1] = g.colour[1]; col[i * 3 + 2] = g.colour[2];
    }
    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('aSize').needsUpdate = true;
    geometry.getAttribute('aColour').needsUpdate = true;
  }

  /** Per frame: the viewport and pixel ratio; `visible` is the deep-sky layer's own answer. */
  function update(camera, renderer, visible) {
    if (!points) return;
    points.visible = !!visible && isLadderStage(stage.worldId);
    if (!points.visible) return;
    if (renderer && typeof renderer.getPixelRatio === 'function') uniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, renderer.getPixelRatio()));
    if (renderer && renderer.domElement) uniforms.uViewportH.value = renderer.domElement.clientHeight || uniforms.uViewportH.value;
  }

  function dispose() {
    if (geometry) geometry.dispose();
    if (points) points.material.dispose();
    if (scene) scene.remove(group);
    geometry = null; points = null; glows = [];
  }

  return { setRecords, rebuild, update, dispose, group, count: () => glows.length };
}
