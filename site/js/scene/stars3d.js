// scene/stars3d.js -- the stars as places, not as a picture (spec 0028 step 3).
//
// Contract: createStars3d(scene, opts) -> { load, ensureGeometry, records, count, unplaced,
//   setVisible, setOpacity, rebuild, update, pickAll, dispose }
//
// 109 389 stars from HYG v4.4 (site/data/stars3d.bin, scripts/build-stars3d.py) as ONE Points
// cloud. Two things decide how it is drawn, and both are the stage's (spec 0005):
//
//   TRUE mode   -- on a rung of the ladder (stage.js `ladder`), every star sits at its measured
//                  position, one unit = the rung's unit_km, and its size comes from its ABSOLUTE
//                  magnitude and its distance from the camera, computed on the GPU. Fly towards
//                  Sirius and it brightens; leave the Sun behind and it becomes one more star.
//   SHELL mode  -- on a world stage the true positions are past the far plane (Proxima is 4e10
//                  units from Earth), so the same stars are drawn as DIRECTIONS on a shell that
//                  follows the camera, sized by apparent magnitude. That is the sky sphere again,
//                  with 109 389 stars instead of 5 044 -- and registry/lod.yaml fades it in only
//                  once the sky-from-here has faded out, so no star is ever drawn twice.
//
// COST. Static: the buffers are built once per stage change (109 389 frame conversions, float64,
// no allocation) and nothing is touched per frame but a uniform and, in shell mode, the group's
// position. The binary (2.6 MB) is fetched the first time a star could actually be seen; the
// names file (3 390 named stars with positions, 0.3 MB) is what search and the card need, and it
// loads with the layer.
//
// HONESTY. Only stars with a measured distance are here; the 10 224 HYG rows without one are
// counted (`unplaced()`) and never drawn on an invented shell. A tap on an unnamed star yields a
// record that says it is unnamed, with the HYG row number.

import * as THREE from '../../vendor/three.module.min.js';
import { stage, isLadderStage } from './stage.js';
import { bvToKelvin, kelvinToRgb } from './starfield.js';
import { COPY, t } from '../copy/en.js';

export const LY_KM = 9460730472580.8;
export const PC_KM = 30856775814913.67;
const SHELL_UNITS = 1e8; // the shell's radius in scene units: far inside the 1e9 far plane
const RECORD_BYTES = 24;
const HEADER_BYTES = 16;
const PICK_PX = 24;
const SUN_INERTIAL = 'sun-inertial';

const VERT = /* glsl */ `
attribute float aAbsMag;
attribute float aAppMag;
attribute vec3 aColour;
uniform float uPixelRatio;
uniform float uGain;
uniform float uShell;
uniform float uUnitsPerPc;
varying vec3 vColour;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  float m;
  if ( uShell > 0.5 ) {
    m = aAppMag;
  } else {
    // apparent magnitude at the CAMERA: M + 5 log10( d / 10 pc )
    float dpc = max( 1e-9, length( position - cameraPosition ) / uUnitsPerPc );
    m = aAbsMag + 5.0 * log( dpc / 10.0 ) / log( 10.0 );
  }
  // the same curve as starfield.js magToSize / magToAlpha, extended one magnitude fainter
  float tt = clamp( ( 6.5 - m ) / 8.0, 0.0, 1.0 );
  gl_PointSize = ( 1.0 + 5.0 * pow( tt, 1.6 ) ) * uPixelRatio;
  vAlpha = ( m > 7.5 ) ? 0.0 : ( 0.35 + 0.65 * tt ) * uGain;
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
  float a = 1.0 - smoothstep( 0.12, 0.5, d );
  if ( a <= 0.0 ) discard;
  gl_FragColor = vec4( vColour, a * vAlpha );
  #include <colorspace_fragment>
}
`;

/** Parse the binary. Exported so a test can hold the format without a scene. */
export function parseStars3d(buffer) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SR3D') throw new Error(`stars3d.bin: bad magic ${JSON.stringify(magic)}`);
  const version = dv.getUint32(4, true);
  const count = dv.getUint32(8, true);
  const unplaced = dv.getUint32(12, true);
  if (buffer.byteLength !== HEADER_BYTES + count * RECORD_BYTES) throw new Error('stars3d.bin: length does not match its count');
  const posLy = new Float32Array(count * 3);
  const absMag = new Float32Array(count);
  const appMag = new Float32Array(count);
  const ci = new Float32Array(count);
  const nameRef = new Uint16Array(count);
  for (let i = 0; i < count; i++) {
    const o = HEADER_BYTES + i * RECORD_BYTES;
    posLy[i * 3] = dv.getFloat32(o, true);
    posLy[i * 3 + 1] = dv.getFloat32(o + 4, true);
    posLy[i * 3 + 2] = dv.getFloat32(o + 8, true);
    absMag[i] = dv.getFloat32(o + 12, true);
    appMag[i] = dv.getFloat32(o + 16, true);
    const c = dv.getInt16(o + 20, true);
    ci[i] = c === -32768 ? NaN : c / 1000;
    nameRef[i] = dv.getUint16(o + 22, true);
  }
  return { version, count, unplaced, posLy, absMag, appMag, ci, nameRef };
}

/** One record per named star, from the names file. Exported for the test and for search. */
export function recordsFromNames(rows) {
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const [idx, proper, bayer, flam, hip, spect, distLy, mag, lum, x, y, z] = r;
    if (!Number.isFinite(x)) continue;
    const name = proper || bayer || flam || (hip ? `HIP ${hip}` : null);
    if (!name) continue;
    const aliases = [bayer, flam, hip ? `HIP ${hip}` : null].filter((a) => a && a !== name);
    out.push(starRecord(idx, name, { x, y, z }, { hip, spect, distLy, mag, lum, aliases, named: true }));
  }
  return out;
}

function starRecord(idx, name, ly, meta) {
  return {
    id: meta.hip ? `hip-${meta.hip}` : `hyg-${idx}`,
    name,
    klass: 'star',
    layer: 'stars',
    propagator: 'static',
    frame: SUN_INERTIAL,
    pos: { x: ly.x * LY_KM, y: ly.y * LY_KM, z: ly.z * LY_KM },
    cls: 'measured',
    meta: { starIndex: idx, cite: 'HYG Stellar Database v4.4 (CC BY-SA 4.0), Gaia and Hipparcos distances', ...meta },
  };
}

export function createStars3d(scene, opts = {}) {
  const here = typeof import.meta !== 'undefined' ? import.meta.url : undefined;
  const src = {
    bin: opts.bin ?? (here ? new URL('../../data/stars3d.bin', here) : 'data/stars3d.bin'),
    names: opts.names ?? (here ? new URL('../../data/stars3d.names.json', here) : 'data/stars3d.names.json'),
  };
  const group = new THREE.Group();
  group.name = 'stars3d';
  group.renderOrder = -1; // after the sky sphere (-2), before every world
  if (scene) scene.add(group);

  let data = null; // parseStars3d result
  let namedRows = null;
  let records = [];
  let points = null;
  let geometry = null;
  let layerOn = true;
  let opacity = 0;
  let mode = null; // 'true' | 'shell'
  let builtFor = null; // `${stage.worldId}:${mode}`
  let loadingBin = null;
  const uniforms = {
    uPixelRatio: { value: 1 },
    uGain: { value: 0 },
    uShell: { value: 1 },
    uUnitsPerPc: { value: 1 },
  };

  // `no-cache` = revalidate against the server (a 304 when unchanged): the files keep their names
  // when a rebuild changes them, so a plain cached copy could be a month stale.
  async function fetchJson(u) { const r = await fetch(String(u), { cache: 'no-cache' }); if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return r.json(); }
  async function fetchBin(u) { const r = await fetch(String(u), { cache: 'no-cache' }); if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return r.arrayBuffer(); }

  /** The named stars, as records: what the layer, search and the card work from. Small file. */
  async function load() {
    if (namedRows) return records;
    const doc = opts.namesDoc || await fetchJson(src.names);
    namedRows = Array.isArray(doc && doc.rows) ? doc.rows : [];
    records = recordsFromNames(namedRows);
    return records;
  }

  /** The binary, once, the first time a star could be seen. */
  function ensureGeometry() {
    if (data) return Promise.resolve(data);
    if (loadingBin) return loadingBin;
    loadingBin = (opts.binBuffer ? Promise.resolve(opts.binBuffer) : fetchBin(src.bin))
      .then((buf) => {
        data = parseStars3d(buf);
        buildPoints();
        rebuild();
        return data;
      })
      .catch((err) => { console.warn('stars3d: could not load', err); loadingBin = null; return null; });
    return loadingBin;
  }

  function buildPoints() {
    const n = data.count;
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geometry.setAttribute('aAbsMag', new THREE.BufferAttribute(data.absMag, 1));
    geometry.setAttribute('aAppMag', new THREE.BufferAttribute(data.appMag, 1));
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const bv = Number.isFinite(data.ci[i]) ? data.ci[i] : 0.65; // no colour index: draw it Sun-like
      const rgb = kelvinToRgb(bvToKelvin(bv));
      c.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('aColour', new THREE.BufferAttribute(col, 3));
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      // Opaque list on purpose, like starfield.js: `transparent: true` would draw after Earth.
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    points = new THREE.Points(geometry, material);
    points.name = 'stars3d';
    points.frustumCulled = false;
    points.renderOrder = -1;
    group.add(points);
    applyVisibility();
  }

  const _km = { x: 0, y: 0, z: 0 };
  const _v = new THREE.Vector3();

  /**
   * Fill the position attribute for the current stage. TRUE positions on a rung; unit directions
   * on the shell on a world stage. Called on `sr:stage` and once after the binary arrives.
   */
  function rebuild() {
    if (!data || !geometry) return;
    const nextMode = isLadderStage(stage.worldId) ? 'true' : 'shell';
    const key = `${stage.worldId}:${nextMode}`;
    if (key === builtFor) return;
    mode = nextMode;
    builtFor = key;
    const tMs = stage.tMs;
    const pos = geometry.getAttribute('position').array;
    const n = data.count;
    let bad = 0;
    for (let i = 0; i < n; i++) {
      _km.x = data.posLy[i * 3] * LY_KM;
      _km.y = data.posLy[i * 3 + 1] * LY_KM;
      _km.z = data.posLy[i * 3 + 2] * LY_KM;
      if (!stage.toSceneInto(_km, SUN_INERTIAL, _v, tMs)) { bad++; pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0; continue; }
      if (mode === 'shell') _v.normalize().multiplyScalar(SHELL_UNITS);
      pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
    }
    geometry.getAttribute('position').needsUpdate = true;
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), mode === 'shell' ? SHELL_UNITS * 1.01 : 1e9);
    uniforms.uShell.value = mode === 'shell' ? 1 : 0;
    uniforms.uUnitsPerPc.value = PC_KM / stage.unitKm;
    if (mode === 'true') group.position.set(0, 0, 0);
    if (bad) console.warn(`stars3d: ${bad} stars could not be placed in the ${stage.worldId} stage`);
  }

  function applyVisibility() {
    if (points) points.visible = layerOn && opacity > 0;
    uniforms.uGain.value = opacity;
  }

  /** The layer's checkbox. */
  function setVisible(on) { layerOn = on !== false; applyVisibility(); if (layerOn && opacity > 0) ensureGeometry(); }

  /** registry/lod.yaml's `stars-3d` hook, 0..1. Fetches the binary the first time it is above 0. */
  function setOpacity(k) {
    opacity = Math.min(1, Math.max(0, Number(k) || 0));
    applyVisibility();
    if (layerOn && opacity > 0) ensureGeometry();
  }

  /** Per frame: the shell follows the camera; the pixel ratio follows the renderer. */
  function update(camera, renderer) {
    if (!points) return;
    if (renderer && typeof renderer.getPixelRatio === 'function') uniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, renderer.getPixelRatio()));
    if (mode === 'shell' && camera) group.position.copy(camera.position);
  }

  const _m = new THREE.Matrix4();

  /**
   * Every star within the forgiveness rule, nearest first, as {record, px, score} for
   * scene/pickrank.js. An unnamed star becomes a record here and now, saying it is unnamed.
   */
  function pickAll(ndcX, ndcY, camera, viewport, limit = 6) {
    if (!points || !points.visible || !geometry || !camera || !viewport) return [];
    camera.updateMatrixWorld();
    group.updateMatrixWorld();
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(group.matrixWorld);
    const e = _m.elements;
    const pos = geometry.getAttribute('position').array;
    const halfW = viewport.w * 0.5, halfH = viewport.h * 0.5;
    const out = [];
    for (let i = 0; i < data.count; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const w = e[3] * x + e[7] * y + e[11] * z + e[15];
      if (w <= 0) continue;
      const cx = (e[0] * x + e[4] * y + e[8] * z + e[12]) / w;
      const cy = (e[1] * x + e[5] * y + e[9] * z + e[13]) / w;
      const dx = (cx - ndcX) * halfW, dy = (cy - ndcY) * halfH;
      const px = Math.sqrt(dx * dx + dy * dy);
      if (px > PICK_PX) continue;
      // Faint stars are not drawn (alpha 0 past magnitude 7.5 in shell mode); do not let them be tapped.
      if (mode === 'shell' && data.appMag[i] > 7.5) continue;
      out.push({ i, px });
    }
    out.sort((p, q) => p.px - q.px);
    return out.slice(0, Math.max(1, limit)).map(({ i, px }) => ({ record: recordAt(i), px, score: px }));
  }

  /** The record for star `i` of the binary: the named one if it has a name, a plain one if not. */
  function recordAt(i) {
    const ref = data.nameRef[i];
    if (ref > 0 && namedRows && namedRows[ref - 1]) {
      const rec = records.find((r) => r.meta.starIndex === namedRows[ref - 1][0]);
      if (rec) return rec;
    }
    const x = data.posLy[i * 3], y = data.posLy[i * 3 + 1], z = data.posLy[i * 3 + 2];
    const distLy = Math.hypot(x, y, z);
    return starRecord(i, t(COPY.stars.unnamed, { n: String(i) }), { x, y, z }, {
      distLy: Math.round(distLy * 100) / 100,
      mag: Math.round(data.appMag[i] * 100) / 100,
      named: false,
    });
  }

  function dispose() {
    if (geometry) geometry.dispose();
    if (points && points.material) points.material.dispose();
    if (scene) scene.remove(group);
    data = null; geometry = null; points = null; builtFor = null;
  }

  return {
    load,
    ensureGeometry,
    records: () => records,
    count: () => (data ? data.count : namedRows ? null : null),
    unplaced: () => (data ? data.unplaced : null),
    setVisible,
    setOpacity,
    rebuild,
    update,
    pickAll,
    recordAt,
    dispose,
    group,
    /** For tests: which mode the buffers were last built for. */
    mode: () => mode,
  };
}
