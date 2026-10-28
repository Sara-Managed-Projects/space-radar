// scene/unplaced.js -- the stars that have a direction and a brightness and no distance (release 1.5.0, stage A4, internal #1062).
//
// Contract: createUnplaced(scene, opts) -> { load, setVisible, setOpacity, setMagLimit, setHoles, rebuild, update, pickAll, recordAt,
//   count, mode, dispose, group }
//
// HYG v4.4 has 119 614 stars; 109 389 have a parallax and scene/stars3d.js puts them where they are. The other 10 224 have none
// (a star drawn on a made-up shell would be a confident lie about where it is), and until now they were not drawn at all. They are
// drawn here as DIRECTIONS on the same sky sphere the placed stars use from a world's stage, by the same shader and the same light
// (stars3d.js STARS3D_VERT, so a star of magnitude 8 looks the same whichever file it is in), and nowhere else: on the ladder's
// rungs, where a star needs a place in space, they are not drawn, and the card of one says so. Taking one makes a record with no
// distance (`meta.noDistance`) and a direction only; the map does not fly to it.
//
// SOURCE. site/data/a45/unplaced.bin (8 bytes a star, as data/skystars-*.bin, and the HYG id) and unplaced.names.json (the 63 with a
// proper, Bayer, Flamsteed or IAU name), written by scripts/gen_a45_data.py. Fetched (123 kB) the first time the sky sphere's 3D
// stars fade in (main.js), never at boot.
//
// NOT HERE. The ground sky (sky/groundsky.js) draws the stars AT-HYG adds to magnitude 10.5, which includes most of these; nothing
// here touches it, so no star is drawn twice there.

import * as THREE from '../../vendor/three.module.min.js';
import { stage, isLadderStage } from './stage.js';
import { starTint } from './starfield.js';
import { holeUniforms, setHoles as setHoleUniforms } from './starholes.js';
import { stretchUniforms } from './stretch.js';
import { STARS3D_VERT, STARS3D_FRAG } from './stars3d.js';
import { loadUnplaced, parseUnplaced, eclipticDirection, unplacedRecord } from '../data/a45.js';

const SUN_INERTIAL = 'sun-inertial';
const SHELL_UNITS = 1e8; // as stars3d.js: far inside the far plane
const PICK_PX = 24;

export function createUnplaced(scene, opts = {}) {
  const group = new THREE.Group();
  group.name = 'unplaced';
  group.renderOrder = -1;
  if (scene) scene.add(group);
  let data = null;
  let names = null; // Map: star index -> names row
  let geometry = null;
  let points = null;
  let loading = null;
  let layerOn = true;
  let opacity = 0;
  let mode = null;
  let builtFor = null;
  const made = new Map();
  const uniforms = {
    ...holeUniforms(),
    uPixelRatio: { value: 1 }, uScale: { value: 1 }, uGain: { value: 0 }, uMagLimit: { value: 7.5 }, uShell: { value: 1 }, uUnitsPerPc: { value: 1 },
    ...stretchUniforms(),
  };
  const _v = new THREE.Vector3();
  const _m = new THREE.Matrix4();

  function load() {
    if (loading) return loading;
    loading = (opts.files ? Promise.resolve(opts.files) : loadUnplaced())
      .then(([buf, namesDoc]) => {
        data = parseUnplaced(buf);
        names = new Map(((namesDoc && namesDoc.rows) || []).map((r) => [r[0], r]));
        build();
        rebuild();
        return data;
      })
      .catch((err) => { console.warn('unplaced stars: could not load', err); loading = null; return null; });
    return loading;
  }

  function build() {
    const n = data.count;
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geometry.setAttribute('aAbsMag', new THREE.BufferAttribute(new Float32Array(n), 1)); // unused on the shell: the apparent magnitude rules
    geometry.setAttribute('aAppMag', new THREE.BufferAttribute(data.mag, 1));
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const rgb = starTint(Number.isFinite(data.ci[i]) ? data.ci[i] : 0.65);
      c.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('aColour', new THREE.BufferAttribute(col, 3));
    points = new THREE.Points(geometry, new THREE.ShaderMaterial({
      vertexShader: STARS3D_VERT, fragmentShader: STARS3D_FRAG, uniforms,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    points.name = 'unplaced';
    points.frustumCulled = false;
    points.renderOrder = -1;
    group.add(points);
    apply();
  }

  /** Fill the directions for the stage: on a world's stage a unit vector times the shell; on a rung of the ladder nothing is drawn. */
  function rebuild() {
    if (!data || !geometry) return;
    const next = isLadderStage(stage.worldId) ? 'true' : 'shell';
    const key = `${stage.worldId}:${next}`;
    if (key === builtFor) return;
    mode = next;
    builtFor = key;
    apply();
    if (mode !== 'shell') return;
    const pos = geometry.getAttribute('position').array;
    const A = stage.affineFrom(SUN_INERTIAL, stage.tMs);
    for (let i = 0; i < data.count; i++) {
      const d = eclipticDirection(data.ra[i], data.dec[i]);
      if (A) _v.set(A.x[0] * d[0] + A.y[0] * d[1] + A.z[0] * d[2], A.x[1] * d[0] + A.y[1] * d[1] + A.z[1] * d[2], A.x[2] * d[0] + A.y[2] * d[1] + A.z[2] * d[2]);
      else if (!stage.dirToScene({ x: d[0], y: d[1], z: d[2] }, SUN_INERTIAL, _v)) { pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = 0; continue; }
      _v.normalize().multiplyScalar(SHELL_UNITS);
      pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
    }
    geometry.getAttribute('position').needsUpdate = true;
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), SHELL_UNITS * 1.01);
  }

  function apply() {
    if (points) points.visible = layerOn && opacity > 0 && mode === 'shell';
    uniforms.uGain.value = opacity;
  }
  function setVisible(on) { layerOn = on !== false; apply(); if (layerOn && opacity > 0) load(); }
  function setOpacity(k) { opacity = Math.min(1, Math.max(0, Number(k) || 0)); apply(); if (layerOn && opacity > 0) load(); }
  function setMagLimit(m) { const x = Number(m); uniforms.uMagLimit.value = Number.isFinite(x) ? Math.min(7.5, Math.max(0, x)) : 7.5; }
  function setHoles(list) { return setHoleUniforms(uniforms, list); }
  function setPointScale(k) { uniforms.uScale.value = Math.min(3, Math.max(0.5, Number(k) || 1)); }

  /** Per frame: the shell follows the camera, the pixel ratio follows the renderer. */
  function update(camera, renderer) {
    if (!points) return;
    if (renderer && typeof renderer.getPixelRatio === 'function') uniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, renderer.getPixelRatio()));
    if (mode === 'shell' && camera) group.position.copy(camera.position);
  }

  function recordAt(i) {
    if (!data || i < 0 || i >= data.count) return null;
    if (!made.has(i)) {
      const row = names.get(i) || [i, '', '', '', 0, 0, '', '', data.ra[i], data.dec[i], data.mag[i], data.id[i]];
      made.set(i, unplacedRecord(row));
    }
    return made.get(i);
  }

  /** Every star within the forgiveness rule, nearest first, as {record, px, score} for scene/pickrank.js. */
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
      if (data.mag[i] > uniforms.uMagLimit.value) continue; // not drawn, so not to be tapped
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const w = e[3] * x + e[7] * y + e[11] * z + e[15];
      if (w <= 0) continue;
      const cx = (e[0] * x + e[4] * y + e[8] * z + e[12]) / w;
      const cy = (e[1] * x + e[5] * y + e[9] * z + e[13]) / w;
      const dx = (cx - ndcX) * halfW, dy = (cy - ndcY) * halfH;
      const px = Math.sqrt(dx * dx + dy * dy);
      if (px <= PICK_PX) out.push({ i, px });
    }
    out.sort((p, q) => p.px - q.px);
    return out.slice(0, Math.max(1, limit)).map(({ i, px }) => ({ record: recordAt(i), px, score: px }));
  }

  function dispose() {
    if (geometry) geometry.dispose();
    if (points && points.material) points.material.dispose();
    if (scene) scene.remove(group);
    data = null; geometry = null; points = null; builtFor = null;
  }

  return {
    load, setVisible, setOpacity, setMagLimit, setHoles, setPointScale, rebuild, update, pickAll, recordAt, dispose, group,
    count: () => (data ? data.count : null),
    /** How many are inside the magnitude limit now: the ones the shader draws. */
    drawn: () => { if (!data) return null; let n = 0; for (let i = 0; i < data.count; i++) if (data.mag[i] <= uniforms.uMagLimit.value) n++; return n; },
    mode: () => mode,
    names: () => names,
  };
}
