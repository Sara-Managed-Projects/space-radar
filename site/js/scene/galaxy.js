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
// ANDROMEDA, FROM THE SAME MODEL (2026-09-22). The "To the edge" trip stops 300 000 light-years
// from Andromeda, where a galaxy 130 000 light-years across fills a quarter of the sky -- and it was
// an 8 px dot. It is now this same point cloud, moved to Andromeda's measured position, scaled to
// the diameter its own card prints and turned to its measured tilt (ANDROMEDA below, all sourced).
// That makes it an illustration twice over: our own galaxy's model, standing in for arms nobody has
// mapped star by star. The M31 record's card says so (data/parsers.js), as the Milky Way's does.
// It shares the colours and weights, and costs one more position buffer and no download.
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

// Andromeda's disc as measured. Position, distance and major axis are the M31 row's
// (site/data/dso.json, test_galaxy checks they agree), so the drawing is the size its card prints;
// the tilt is sourced here.
export const ANDROMEDA = {
  raDeg: 10.68479,
  decDeg: 41.26906,
  distLy: 2540000,
  majAxArcmin: 177.83,    // OpenNGC, via the M31 row
  inclinationDeg: 77,     // Wikipedia, Andromeda Galaxy: "inclined an estimated 77 deg relative to Earth"
  positionAngleDeg: 38,   // major axis, east of north (e.g. Draine et al. 2014, arXiv:1306.2304)
  nearSide: 'NW',         // the north-western edge is the near one, from its dust lanes (same source)
  templateDiameterLy: 87400, // the Milky Way record's own size (data/layers.js), which this model is
};

/** The diameter the M31 card prints: its major axis at its distance (data/parsers.js sizeLy). */
export function andromedaDiameterLy(g = ANDROMEDA) {
  return g.distLy * (g.majAxArcmin / 60) * (Math.PI / 180);
}

const LY_KM = 9460730472580.8;
const OBLIQUITY = 23.4392911 * (Math.PI / 180);
const D2R = Math.PI / 180;
const eqToSun = (v) => [v[0], v[1] * Math.cos(OBLIQUITY) + v[2] * Math.sin(OBLIQUITY), -v[1] * Math.sin(OBLIQUITY) + v[2] * Math.cos(OBLIQUITY)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const comb = (a, ka, b, kb) => [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];

/**
 * Andromeda's disc axes in the sun-inertial frame: the major axis on the sky, the in-plane axis
 * across it (tipped so the north-west edge is the near one), and the normal. Pure, for the test.
 */
export function andromedaAxes(g = ANDROMEDA) {
  const a = g.raDeg * D2R, d = g.decDeg * D2R;
  const los = [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; // Sun -> M31
  const east = [-Math.sin(a), Math.cos(a), 0];
  const north = [-Math.sin(d) * Math.cos(a), -Math.sin(d) * Math.sin(a), Math.cos(d)];
  const pa = g.positionAngleDeg * D2R, inc = g.inclinationDeg * D2R;
  const major = comb(north, Math.cos(pa), east, Math.sin(pa));
  const northWest = comb(north, Math.sin(pa), east, -Math.cos(pa)); // the minor axis, NW half
  // In the disc and across the major axis: it shows cos(i) of itself on the sky, toward the NW,
  // and its sin(i) points back along the line of sight toward us -- which is what "near side" means.
  const across = comb(northWest, Math.cos(inc), los, -Math.sin(inc));
  const normal = cross(major, across);
  return { los: eqToSun(los), major: eqToSun(major), across: eqToSun(across), normal: eqToSun(normal) };
}

// The Milky Way model's own pole: the north galactic pole, RA 192.85948 deg, Dec +27.12825 deg (J2000).
const NGP = (() => { const a = 192.85948 * D2R, d = 27.12825 * D2R; return eqToSun([Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]); })();

/**
 * The model moved onto Andromeda: every point, in kpc from the Sun. `centreKpc` is the model's own
 * centre (the mean of its bulge). Pure, for the test.
 */
export function andromedaFromModel(posKpc, count, centreKpc, g = ANDROMEDA) {
  const { major, across, normal } = andromedaAxes(g);
  const u = unit(cross(NGP, [0, 0, 1]));
  const v = cross(NGP, u);
  const k = andromedaDiameterLy(g) / g.templateDiameterLy;
  const KPC_LY = KPC_KM / LY_KM;
  const at = eqToSun((() => { const a = g.raDeg * D2R, d = g.decDeg * D2R; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; })())
    .map((c) => c * g.distLy / KPC_LY);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const q = [posKpc[i * 3] - centreKpc[0], posKpc[i * 3 + 1] - centreKpc[1], posKpc[i * 3 + 2] - centreKpc[2]];
    const x = dot(q, u) * k, y = dot(q, v) * k, z = dot(q, NGP) * k;
    out[i * 3] = at[0] + major[0] * x + across[0] * y + normal[0] * z;
    out[i * 3 + 1] = at[1] + major[1] * x + across[1] * y + normal[1] * z;
    out[i * 3 + 2] = at[2] + major[2] * x + across[2] * y + normal[2] * z;
  }
  return out;
}

const VERT = /* glsl */ `
attribute float aWeight;
attribute vec3 aColour;
uniform float uPixelRatio;
uniform float uGain;
uniform float uUnitsPerKpc;
uniform float uPatchKpc;
varying vec3 vColour;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  // A point is a patch of galaxy ~150 pc across: bigger when the camera is close, never below 1.5 px.
  float dKpc = max( 1e-6, -mv.z / uUnitsPerKpc );
  gl_PointSize = clamp( uPatchKpc / dKpc * 600.0, 1.5, 6.0 ) * uPixelRatio;
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
  let twinGeometry = null;
  let twinPoints = null;
  let twinKpc = null;
  let layerOn = true;
  let opacity = 0;
  let builtFor = null;
  let loading = null;
  const uniforms = { uPixelRatio: { value: 1 }, uGain: { value: 0 }, uUnitsPerKpc: { value: 1 }, uPatchKpc: { value: 0.15 } };
  // Andromeda shares every uniform but the patch size, which scales with the model.
  const twinUniforms = { ...uniforms, uPatchKpc: { value: 0.15 * andromedaDiameterLy() / ANDROMEDA.templateDiameterLy } };

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

    let cx = 0, cy = 0, cz = 0, nb = 0;
    for (let i = 0; i < n; i++) if (data.kind[i] === 1) { cx += data.posKpc[i * 3]; cy += data.posKpc[i * 3 + 1]; cz += data.posKpc[i * 3 + 2]; nb++; }
    twinKpc = andromedaFromModel(data.posKpc, n, nb ? [cx / nb, cy / nb, cz / nb] : [0, 0, 0]);
    twinGeometry = new THREE.BufferGeometry();
    twinGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    twinGeometry.setAttribute('aWeight', geometry.getAttribute('aWeight'));
    twinGeometry.setAttribute('aColour', geometry.getAttribute('aColour'));
    twinPoints = new THREE.Points(twinGeometry, new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, uniforms: twinUniforms,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    twinPoints.name = 'galaxy:andromeda';
    twinPoints.frustumCulled = false;
    twinPoints.renderOrder = -1;
    group.add(twinPoints);
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
    const fill = (src, geo) => {
      const pos = geo.getAttribute('position').array;
      for (let i = 0; i < data.count; i++) {
        _km.x = src[i * 3] * KPC_KM;
        _km.y = src[i * 3 + 1] * KPC_KM;
        _km.z = src[i * 3 + 2] * KPC_KM;
        if (!stage.toSceneInto(_km, SUN_INERTIAL, _v, tMs)) { pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0; continue; }
        pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
      }
      geo.getAttribute('position').needsUpdate = true;
    };
    fill(data.posKpc, geometry);
    if (twinGeometry && twinKpc) fill(twinKpc, twinGeometry);
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30 * KPC_KM / stage.unitKm);
    uniforms.uUnitsPerKpc.value = KPC_KM / stage.unitKm;
    applyVisibility();
  }

  function applyVisibility() {
    if (points) points.visible = layerOn && opacity > 0 && isLadderStage(stage.worldId);
    if (twinPoints) twinPoints.visible = !!(points && points.visible);
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
    if (twinGeometry) twinGeometry.dispose();
    if (twinPoints && twinPoints.material) twinPoints.material.dispose();
    twinGeometry = null; twinPoints = null; twinKpc = null;
    if (scene) scene.remove(group);
    data = null; geometry = null; points = null; builtFor = null;
  }
  return {
    ensureGeometry, setVisible, setOpacity, rebuild, update, dispose, group,
    count: () => (data ? data.count : null),
    mode: () => (points && points.visible ? 'drawn' : 'hidden'),
  };
}
