// scene/dsoglow.js -- a deep-sky object drawn as big as it is, when that is bigger than its dot.
//
// Contract: createDsoGlow(scene) -> { setRecords(records), setPictured(ids), setShapedShare(k),
//   rebuild(), update(camera, renderer, visible), count(), dispose(), group }
// Also exported, pure, for the test: glowFor(record) -> {colour, sizeKm, shape?} | null,
//   SHAPED, majorAxisDir(pos, paDeg) -> unit vector in the sun-inertial frame
//
// WHY. Every deep-sky object was one 8 px dot whatever its size. On the "To the edge" trip the
// Pleiades stop is 100 light-years from a cluster 19 light-years across -- eleven degrees of sky --
// and it was that dot (measured 2026-09-22). The records know how big they are: 202 of 209 carry a
// major axis (OpenNGC or the hand row's source), and data/parsers.js turns it into `sizeLy`.
//
// WHAT IT IS, AND IS NOT. A soft round glow at the measured distance, the measured size across,
// coloured by what the thing is. It is not the shape: the file has no minor axis or position angle,
// so an edge-on galaxy glows round, and the card says "its true shape is not drawn". Dark nebulae
// get no glow (they are dark), and Andromeda has a model of its own (scene/galaxy.js). An object
// whose photograph has landed (scene/nebulae.js, spec 0067) drops its glow: a pink disc laid over
// the Orion Nebula's own picture would tint the thing it stood in for.
//
// TWO GALAXIES HAVE A SHAPE (public #385, 2026-10-08). Andromeda's companions M32 and M110 were
// two unnamed dots beside her. OpenNGC does list a minor axis and a position angle for them
// (SHAPED below, read from its NGC.csv that day), so those two are drawn as soft ELLIPSES with a
// bright middle: as long and as wide as the catalogue says, turned as it says. The turn is the one
// seen from the Sun: the major axis is laid on the sky at its position angle, east of north
// (majorAxisDir), and projected by the camera like anything else, so from Earth's side it is
// right and from far off that line it is the same flat ellipse seen askew, which is an
// illustration and the card says so. While Andromeda's own photograph is drawn they step back
// (setShapedShare), because the photograph already holds both of them.
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

/**
 * The galaxies drawn as ellipses. OpenNGC, database_files/NGC.csv, read 2026-10-08:
 *   NGC0221 (M32):  MajAx 7.74', MinAx 4.86', PosAng 170, Hubble E
 *   NGC0205 (M110): MajAx 16.22', MinAx 9.59', PosAng 170, Hubble E
 * The major axes are the ones site/data/dso.json already carries (tests/test_dso.mjs holds the
 * two to each other). `of`: the object whose photograph holds this one too.
 */
export const SHAPED = {
  'dso-m32': { majArcmin: 7.74, minArcmin: 4.86, paDeg: 170, of: 'dso-m31' },
  'dso-m110': { majArcmin: 16.22, minArcmin: 9.59, paDeg: 170, of: 'dso-m31' },
};

const OBLIQUITY = 23.4392911 * (Math.PI / 180);
/** The north celestial pole in the sun-inertial (ecliptic J2000) frame. */
const POLE = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)];

/**
 * Which way an object's major axis points, as a unit vector in the frame its position is in
 * (sun-inertial): on the sky plane at `pos`, `paDeg` east of north. Pure.
 */
export function majorAxisDir(pos, paDeg) {
  const l = Math.hypot(pos.x, pos.y, pos.z) || 1;
  const u = [pos.x / l, pos.y / l, pos.z / l];
  // east = pole x line of sight, north = line of sight x east
  let e = [POLE[1] * u[2] - POLE[2] * u[1], POLE[2] * u[0] - POLE[0] * u[2], POLE[0] * u[1] - POLE[1] * u[0]];
  const el = Math.hypot(e[0], e[1], e[2]) || 1;
  e = [e[0] / el, e[1] / el, e[2] / el];
  const n = [u[1] * e[2] - u[2] * e[1], u[2] * e[0] - u[0] * e[2], u[0] * e[1] - u[1] * e[0]];
  const pa = (paDeg * Math.PI) / 180;
  const c = Math.cos(pa);
  const k = Math.sin(pa);
  return { x: n[0] * c + e[0] * k, y: n[1] * c + e[1] * k, z: n[2] * c + e[2] * k };
}

/** The glow a record gets, or null. Pure. */
export function glowFor(record) {
  if (!record || record.klass !== 'dso' || MODELLED.has(record.id)) return null;
  const md = record.meta || {};
  const code = md.typeCode || null;
  if (code && NO_GLOW.has(code)) return null;
  const sizeLy = Number(md.sizeLy);
  if (!(sizeLy > 0) || !record.pos) return null;
  const colour = COLOURS[code] || COLOURS[md.kind === 'galaxy' ? 'G' : md.kind === 'cluster' ? 'OCl' : 'Neb'];
  const row = SHAPED[record.id];
  const shape = row ? { ratio: row.minArcmin / row.majArcmin, paDeg: row.paDeg, of: row.of } : null;
  return shape ? { colour, sizeKm: sizeLy * LY_KM, shape } : { colour, sizeKm: sizeLy * LY_KM };
}

const VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColour;
attribute vec3 aMajor;   // where the major axis ends, as an offset in scene units; zero for a round glow
attribute float aRatio;  // minor over major; 0 for a round glow
uniform float uPixelRatio;
uniform float uViewportH;
uniform float uAspect;
uniform float uGain;
uniform float uShaped;
varying vec3 vColour;
varying float vAlpha;
varying vec2 vAxis;
varying float vRatio;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  vRatio = aRatio;
  vAxis = vec2( 1.0, 0.0 );
  if ( aRatio > 0.0 ) {
    // The major axis on the screen: its far end projected like any point, less the centre.
    vec4 tip = projectionMatrix * modelViewMatrix * vec4( position + aMajor, 1.0 );
    vec2 d = ( tip.xy / tip.w - gl_Position.xy / gl_Position.w ) * vec2( uAspect, 1.0 );
    float len = length( d );
    if ( len > 1e-9 ) vAxis = d / len;
  }
  float d = max( 1e-12, -mv.z );
  // its diameter on screen, in CSS px
  float px = aSize / d * projectionMatrix[1][1] * 0.5 * uViewportH;
  vAlpha = uGain * smoothstep( 4.0, 14.0, px ) * ( 1.0 - smoothstep( 220.0, 420.0, px ) );
  if ( aRatio > 0.0 ) vAlpha *= uShaped;
  gl_PointSize = clamp( px, 1.0, 420.0 ) * uPixelRatio;
  vColour = aColour;
}
`;

const FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
varying vec2 vAxis;
varying float vRatio;
#include <common>
void main() {
  if ( vAlpha <= 0.0 ) discard;
  vec2 q = gl_PointCoord - vec2( 0.5 );
  float r2 = dot( q, q ) * 4.0;           // 0 at the centre, 1 at the rim
  float a;
  if ( vRatio > 0.0 ) {
    // An ellipse: along the major axis the sprite's own radius, across it vRatio of that.
    // gl_PointCoord runs down the screen, the projected axis up it.
    vec2 p = vec2( q.x, -q.y ) * 2.0;
    float along = dot( p, vAxis );
    float across = dot( p, vec2( -vAxis.y, vAxis.x ) ) / vRatio;
    r2 = along * along + across * across;
    if ( r2 >= 1.0 ) discard;
    // An elliptical galaxy is brightest in the middle and falls away steeply: a core on a halo.
    a = ( 2.2 * exp( -14.0 * r2 ) + exp( -3.2 * r2 ) ) * ( 1.0 - r2 );
  } else {
    if ( r2 >= 1.0 ) discard;
    a = exp( -3.2 * r2 ) * ( 1.0 - r2 ); // soft, and zero at the measured edge
  }
  gl_FragColor = vec4( vColour, min( 1.0, a * vAlpha * 0.34 ) );
  #include <colorspace_fragment>
}
`;

export function createDsoGlow(scene) {
  const group = new THREE.Group();
  group.name = 'dso-glow';
  group.renderOrder = -1;
  if (scene) scene.add(group);
  const uniforms = { uPixelRatio: { value: 1 }, uViewportH: { value: 800 }, uAspect: { value: 1.6 }, uGain: { value: 1 }, uShaped: { value: 1 } };
  let glows = [];
  let geometry = null;
  let points = null;
  let builtFor = null;
  let pictured = new Set(); // record ids scene/nebulae.js is drawing as photographs
  const _v = new THREE.Vector3();
  const _w = new THREE.Vector3();
  const _tip = { x: 0, y: 0, z: 0 };

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
      geometry.setAttribute('aMajor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      geometry.setAttribute('aRatio', new THREE.BufferAttribute(new Float32Array(n), 1));
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
    const major = geometry.getAttribute('aMajor').array;
    const ratio = geometry.getAttribute('aRatio').array;
    for (let i = 0; i < n; i++) {
      const g = glows[i];
      const ok = stage.toSceneInto(g.record.pos, SUN_INERTIAL, _v, stage.tMs);
      // A shaped galaxy: the end of its major axis, half its length from the centre, in the scene.
      let shaped = false;
      if (ok && g.shape) {
        const dir = majorAxisDir(g.record.pos, g.shape.paDeg);
        const half = g.sizeKm / 2;
        _tip.x = g.record.pos.x + dir.x * half; _tip.y = g.record.pos.y + dir.y * half; _tip.z = g.record.pos.z + dir.z * half;
        shaped = stage.toSceneInto(_tip, SUN_INERTIAL, _w, stage.tMs);
        if (shaped) _w.sub(_v);
      }
      major[i * 3] = shaped ? _w.x : 0; major[i * 3 + 1] = shaped ? _w.y : 0; major[i * 3 + 2] = shaped ? _w.z : 0;
      ratio[i] = shaped ? g.shape.ratio : 0;
      pos[i * 3] = ok ? _v.x : 0; pos[i * 3 + 1] = ok ? _v.y : 0; pos[i * 3 + 2] = ok ? _v.z : 0;
      size[i] = ok && !pictured.has(g.record.id) ? g.sizeKm / stage.unitKm : 0;
      col[i * 3] = g.colour[0]; col[i * 3 + 1] = g.colour[1]; col[i * 3 + 2] = g.colour[2];
    }
    geometry.getAttribute('position').needsUpdate = true;
    geometry.getAttribute('aSize').needsUpdate = true;
    geometry.getAttribute('aColour').needsUpdate = true;
    geometry.getAttribute('aMajor').needsUpdate = true;
    geometry.getAttribute('aRatio').needsUpdate = true;
  }

  /** The records now drawn as photographs: their glows go (size 0 is below the 4 px floor). */
  function setPictured(ids) {
    pictured = new Set(ids || []);
    builtFor = null;
    rebuild();
  }

  /** Per frame: the viewport and pixel ratio; `visible` is the deep-sky layer's own answer. */
  function update(camera, renderer, visible) {
    if (!points) return;
    points.visible = !!visible && isLadderStage(stage.worldId);
    if (!points.visible) return;
    if (renderer && typeof renderer.getPixelRatio === 'function') uniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, renderer.getPixelRatio()));
    if (renderer && renderer.domElement) uniforms.uViewportH.value = renderer.domElement.clientHeight || uniforms.uViewportH.value;
    if (camera && camera.aspect > 0) uniforms.uAspect.value = camera.aspect;
  }

  function dispose() {
    if (geometry) geometry.dispose();
    if (points) points.material.dispose();
    if (scene) scene.remove(group);
    geometry = null; points = null; glows = [];
  }

  /** The shutter (scene/exposure.js `milkyWay`): a glow is faint light too (internal #343). */
  function setExposure(k) { uniforms.uGain.value = Number.isFinite(k) && k > 0 ? k : 1; }

  /**
   * How much of the shaped galaxies is drawn, 0 to 1: main.js hands it one minus how much of
   * Andromeda's photograph is on screen, as it does for her stand-in model (scene/galaxy.js).
   */
  function setShapedShare(k) { uniforms.uShaped.value = Number.isFinite(k) ? Math.min(1, Math.max(0, k)) : 1; }

  return { setRecords, setPictured, setShapedShare, setExposure, rebuild, update, dispose, group, count: () => glows.length, shaped: () => glows.filter((g) => g.shape).map((g) => g.record.id) };
}
