// scene/deep/galclusters.js -- galaxy clusters and quasars (internal spec 0076 W4-b; internal #784, spec 0075 task 28).
// A deep layer on the local-group rung: scene/deep/heroes.js DEEP_LAYERS (`// 0076 W4-b`) builds it the first time that rung is
// entered and never at boot. The numbers behind it are site/data/deep/galclusters.{json,bin}, baked by
// scripts/build_deep_galclusters.py from registry/galaxy-clusters.yaml (read its head for the sources, the cuts and the licences).
//
//   createLayer(THREE, env) -> { group, frame(info), ready(), stats(), describe(id), dispose() }
//     env  = { recordById?(id), on?(), load?(): Promise<{manifest, buffer}>, base?: URL }   (load is for tests)
//     info = { camera, renderer, stage, gain, visible }
//   Pure, for tests/test_galclusters.mjs: parseMembers, rowOf, arraysOf, colourOf, tileFade, crowd, tileRadiusPx, quasarOf, hostOf, EXTENT.
//
// WHAT IS DRAWN.
//   - CLUSTERS: Virgo, Coma, Fornax and Perseus, 3 596 member galaxies in all, each cluster ONE DRAW CALL: an instanced quad per
//     galaxy (a billboard in the vertex shader, no point-size ceiling), culled whole by the frustum and by its size on the screen.
//     Every galaxy stands where the catalogue puts it: its DIRECTION is measured; its DISTANCE is its own where surface brightness
//     fluctuations measured one (71 in Virgo) and else its cluster's, by the cluster's method (SBF for Virgo and Fornax, the members'
//     mean redshift in the map's one cosmology for Coma and Perseus); its DEPTH inside the cluster, for those without a distance of
//     their own, is MODELLED (an offset along our line of sight, seeded by the galaxy's id, from the cluster's published rms scatter or,
//     where there is none, the spread of its members on the sky: a cluster is round), so that seen from the side a cluster is a swarm
//     and not one thin sheet. Its SIZE is the catalogue's half-light radius at that distance: the impostor is as wide, on the screen,
//     as the galaxy is from where the camera stands (never under a mark's floor), so flying into a cluster the galaxies grow as they
//     should. Its LIGHT is its catalogue magnitude, an exposure and not photometry. Its COLOUR is g - r where the catalogue has both.
//     The profile is one round, centrally peaked shape for all (ellipticity and orientation are not drawn): an illustration, said so.
//   - QUASARS: 3C 273 and 3C 279 (registry/exotics.yaml, at their comoving distance from their redshift, as TON 618 is). Each is a bright
//     point at its record's place; 3C 273 also has its HOST galaxy, a faint round impostor at the angular size the source gives
//     (29 arcseconds across as seen from the Sun, an E4 of magnitude 16). 3C 279 has none, because the source gives no size. No glare, no
//     bloom, no spikes (tests/test_contract.mjs): a point's size grows a little with its brightness, as a star's does.
//
// NOTHING IS PAST THE HORIZON; NOTHING MOVES. No member is drawn at a distance of 46 billion light-years or more (the farthest is 334
// million); under the Measured look and reduced motion nothing moves, because nothing here ever does.
//
// HONEST BRIGHTNESS AT ANY DISTANCE. A crowd of galaxies seen from afar must not add up to a white blob: the cluster's whole light is
// stepped back by `crowd` (the members' footprint against the cluster's area on the screen), and it fades out below FADE_PX (no pop).
//
// ONE FRAME, ONE PRECISION. Each cluster's mesh matrix puts its centre where the stage puts it (float64) and the members' offsets are
// float32 million light-years about that centre (at most 25), so what the GPU sees is camera-relative as in scene/deep/localvolume.js.

import { EXOTICS } from '../../data/exotics.js';
import { COPY, t } from '../../copy/en.js';
import '../../copy/en.later.js';

/** Under the Measured look (scene/exposure.js MEASURED_RULES): positions, distances and sizes are the catalogue's; nothing moves. */
export const UNDER_MEASURED = { clusters: 'same', quasars: 'same' };
export const COPY_BLOCK = 'r12Far';
export const MAGIC = 'SRGC';
export const STRIDE = 20;
export const EXTENT = 4;      // half of a galaxy's quad, in half-light radii
export const MIN_PX = 3;      // CSS px: the smallest mark (a galaxy no wider is drawn at this)
export const MAX_PX = 1400;   // CSS px: half a quad is never wider (past it a galaxy fades rather than grows)
export const CULL_PX = 3;     // the cluster's radius on the screen below which it is not drawn
export const FADE_PX = 40;    // and from which, going smaller, it fades out
export const FOOT_PX = 4.5;   // the footprint of one member, CSS px of radius, for the crowd
const SUN_INERTIAL = 'sun-inertial';
const LY_KM = 9460730472580.8;
const MLY_KM = LY_KM * 1e6;
const ARCSEC = Math.PI / 648000;
const OBLIQUITY = 23.4392911 * (Math.PI / 180);

/** The whole cluster's light as its radius on the screen shrinks from FADE_PX to CULL_PX: 1 to 0, smooth. Pure. */
export function tileFade(radiusPx) {
  if (!(radiusPx < FADE_PX)) return 1;
  const k = Math.min(1, Math.max(0, (radiusPx - CULL_PX) / (FADE_PX - CULL_PX)));
  return k * k * (3 - 2 * k);
}
/** The footprint of `count` members against the area of a cluster `radiusPx` wide: 1 when they have room, less as they pile up. Pure. */
export function crowd(radiusPx, count) {
  if (!(radiusPx > 0) || !(count > 0)) return 0;
  const room = (Math.PI * radiusPx * radiusPx) / (count * Math.PI * FOOT_PX * FOOT_PX);
  return Math.min(1, Math.sqrt(room));
}
/** A cluster's radius on the screen, CSS px; Infinity from inside it. Pure. */
export function tileRadiusPx(radiusScene, distanceScene, fovYRad, viewH) {
  if (!(distanceScene > radiusScene)) return Infinity;
  return (Math.asin(radiusScene / distanceScene) / (fovYRad / 2)) * (viewH / 2);
}

/** The bin's rows, read and checked. Pure. */
export function parseMembers(buffer) {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== MAGIC) throw new Error(`galclusters: not a members file (${magic})`);
  const version = view.getUint32(4, true);
  const count = view.getUint32(8, true);
  const stride = view.getUint32(12, true);
  if (stride !== STRIDE || buffer.byteLength !== 16 + count * stride) throw new Error(`galclusters: ${buffer.byteLength} bytes for ${count} rows of ${stride}`);
  return { version, count, stride, view };
}
/** One row as an object (tests, probes). Pure. */
export function rowOf(tile, i) {
  const v = tile.view;
  const at = 16 + i * STRIDE;
  const flags = v.getUint8(at + 19);
  return {
    off: [v.getFloat32(at, true), v.getFloat32(at + 4, true), v.getFloat32(at + 8, true)],
    reMly: v.getFloat32(at + 12, true),
    absMag: v.getInt16(at + 16, true) / 200,
    colourCode: v.getUint8(at + 18),
    ownDistance: (flags & 1) === 1,
    sizeMeasured: (flags & 2) === 2,
  };
}
/** The colour of a g - r code ((g - r + 0.2) * 100): blue-white for a blue galaxy, warm for a red one, neutral for none. Pure. */
export function colourOf(code) {
  if (!code) return [0.9, 0.9, 0.95];
  const gr = code / 100 - 0.2;
  const k = Math.min(1, Math.max(0, (gr - 0.3) / 0.5));
  return [0.78 + 0.22 * k, 0.86 - 0.04 * k, 1.0 - 0.34 * k];
}
/** The instanced attributes of rows [from, from + count). Pure. */
export function arraysOf(tile, from, count) {
  const A = { off: new Float32Array(count * 3), re: new Float32Array(count), mag: new Float32Array(count), colour: new Float32Array(count * 3) };
  let own = 0;
  let sized = 0;
  for (let i = 0; i < count; i++) {
    const r = rowOf(tile, from + i);
    const c = colourOf(r.colourCode);
    for (let k = 0; k < 3; k++) { A.off[i * 3 + k] = r.off[k]; A.colour[i * 3 + k] = c[k]; }
    A.re[i] = r.reMly;
    A.mag[i] = r.absMag;
    if (r.ownDistance) own += 1;
    if (r.sizeMeasured) sized += 1;
  }
  return { ...A, own, sized };
}

/** The unit direction of a J2000 position in the map's sun-inertial (ecliptic J2000) axes. Pure. */
export function eclipticDir(raDeg, decDeg) {
  const ra = raDeg * (Math.PI / 180);
  const dec = decDeg * (Math.PI / 180);
  const x = Math.cos(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra);
  const z = Math.sin(dec);
  return [x, y * Math.cos(OBLIQUITY) + z * Math.sin(OBLIQUITY), -y * Math.sin(OBLIQUITY) + z * Math.cos(OBLIQUITY)];
}
/**
 * A quasar from the exotics file and the manifest: where it is (km, sun-inertial, exactly the record's), the magnitude it would have
 * if seen from a point `distLy` away as it is from the Sun (so that from the Sun it is the catalogue's own), and its host. Pure.
 */
export function quasarOf(q, exotics = EXOTICS) {
  const x = exotics.find((e) => e.id === q.id);
  if (!x) return null;
  const d = eclipticDir(x.raDeg, x.decDeg);
  const r = x.distLy * LY_KM;
  const pc = x.distLy / 3.261563777167433;
  const equiv = (m) => m - 5 * Math.log10(pc / 10);
  return { id: q.id, record: q.record, name: x.name, posKm: { x: d[0] * r, y: d[1] * r, z: d[2] * r }, distLy: x.distLy, redshift: x.redshift, absMag: equiv(x.vmag ?? q.vmag), host: q.host ? hostOf(q.host, x, equiv) : null };
}
/**
 * The host galaxy as the map draws it. The source gives an apparent size: its radius times the comoving distance is the radius
 * the impostor has in the map, so from the Sun it subtends what the telescopes measured; its edge is EXTENT half-light radii. The
 * galaxy's true width is that angle times the angular-diameter distance (comoving over 1 + z), for the words. Pure.
 */
export function hostOf(host, x, equiv) {
  const radiusRad = (host.apparent_size_arcsec / 2) * ARCSEC;
  const mapRadiusMly = (radiusRad * x.distLy) / 1e6;
  return {
    morphology: host.morphology, apparentMag: host.apparent_mag, sizeArcsec: host.apparent_size_arcsec,
    mapRadiusMly, reMly: mapRadiusMly / EXTENT, absMag: equiv(host.apparent_mag),
    trueWidthLy: 2 * radiusRad * (x.distLy / (1 + x.redshift)),
  };
}

// ---------------------------------------------------------------------------------------------- shaders
// The galaxies. `position` is the quad's corner (-1 or 1 on each of x and y).
const VERT_GAL = /* glsl */ `
attribute vec3 aOff;       // million light-years from the cluster's centre, in the map's axes (the mesh matrix carries the scale and the rotation)
attribute float aRe;       // half-light radius, million light-years (0: not measured, a mark at the floor)
attribute float aMag;      // absolute magnitude in the catalogue's band
attribute vec3 aColour;
uniform float uScale;      // scene units per million light-years
uniform float uPxPerRad;   // CSS px per radian at the centre of the view
uniform float uMinPx;
uniform float uMaxPx;
varying vec2 vP;
varying vec3 vColour;
varying float vLight;
varying float vExt;
void main() {
  vec4 mv = modelViewMatrix * vec4(aOff, 1.0);
  float dMly = max(1.0e-9, length(mv.xyz) / uScale);
  float reCss = aRe / dMly * uPxPerRad;                         // its half-light radius on the screen, CSS px
  float re = max(reCss, uMinPx * 0.5);                          // never under half the smallest mark
  float ext = re * ${EXTENT.toFixed(1)};
  float past = ext > uMaxPx ? uMaxPx / ext : 1.0;               // so large it spans the view: it fades rather than grows
  ext = min(ext, uMaxPx);
  // Its apparent magnitude from the camera: M + 5 log10(d / 10 pc).
  float m = aMag + 5.0 * log(dMly * 1.0e6 / 32.6156) / log(10.0);
  float lit = clamp((19.0 - m) / 11.0, 0.0, 1.0);
  // A floor: every catalogued galaxy shows; its light spreads over its disc when it is wide (surface brightness).
  float spread = clamp((uMinPx * 2.5) / (2.0 * re), 0.12, 1.0);
  vLight = (0.45 + 0.75 * lit) * spread * past;
  vColour = aColour;
  vP = position.xy;
  vExt = ext / re;
  float halfView = ext * (-mv.z) / uPxPerRad;                       // half the quad, view-space units at its depth
  if (mv.z > -1.0e-12) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  gl_Position = projectionMatrix * vec4(mv.xy + position.xy * halfView, mv.z, 1.0);
}`;

const FRAG_GAL = /* glsl */ `
uniform float uGain;
uniform float uFade;       // the whole cluster: as it shrinks to a speck, and as its members pile up
varying vec2 vP;
varying vec3 vColour;
varying float vLight;
varying float vExt;
void main() {
  float q = length(vP);
  if (q > 1.0) discard;
  float r = q * vExt;                                           // in half-light radii
  float prof = exp(-2.0 * pow(r, 0.8));                         // peaked and round: an illustration of a galaxy's light
  float edge = 1.0 - smoothstep(0.7, 1.0, q);
  gl_FragColor = vec4(vColour * (vLight * prof * edge * uGain * uFade), 1.0);
}`;

// The quasar: instance 0 is the bright point (aKind 1), instance 1 its host galaxy (aKind 0) where the source gives one.
const VERT_QSO = /* glsl */ `
attribute float aKind;     // 1: the bright point; 0: the host galaxy
attribute float aRe;       // the host's half-light radius, million light-years (the map's)
attribute float aMag;      // the magnitude it would have seen from 1 parsec x 10, so that from the Sun it is the catalogue's
uniform float uScale;
uniform float uPxPerRad;
uniform float uMinPx;
uniform float uMaxPx;
varying vec2 vP;
varying float vLight;
varying float vExt;
varying float vKind;
void main() {
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float dMly = max(1.0e-9, length(mv.xyz) / uScale);
  float m = aMag + 5.0 * log(dMly * 1.0e6 / 32.6156) / log(10.0);
  float lit = clamp((19.0 - m) / 11.0, 0.0, 1.0);
  float ext;
  float re;
  if (aKind > 0.5) {
    re = 0.6 + 1.6 * lit;                                       // the point's width: a little wider when brighter, as a star's is
    ext = re * 3.0;
    vLight = 0.6 + 0.4 * lit;
  } else {
    re = max(aRe / dMly * uPxPerRad, uMinPx * 0.5);
    ext = re * ${EXTENT.toFixed(1)};
    float past = ext > uMaxPx ? uMaxPx / ext : 1.0;
    ext = min(ext, uMaxPx);
    float spread = clamp((uMinPx * 2.5) / (2.0 * re), 0.12, 1.0);
    vLight = (0.45 + 0.75 * lit) * spread * past * 0.8;
  }
  vKind = aKind;
  vP = position.xy;
  vExt = ext / re;
  float halfView = ext * (-mv.z) / uPxPerRad;
  if (mv.z > -1.0e-12) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  gl_Position = projectionMatrix * vec4(mv.xy + position.xy * halfView, mv.z, 1.0);
}`;

const FRAG_QSO = /* glsl */ `
uniform float uGain;
varying vec2 vP;
varying float vLight;
varying float vExt;
varying float vKind;
void main() {
  float q = length(vP);
  if (q > 1.0) discard;
  float r = q * vExt;
  float prof = vKind > 0.5 ? exp(-r * r * 0.5) : exp(-2.0 * pow(r, 0.8));
  float edge = 1.0 - smoothstep(0.7, 1.0, q);
  vec3 colour = vKind > 0.5 ? vec3(0.82, 0.9, 1.0) : vec3(1.0, 0.9, 0.78);
  gl_FragColor = vec4(colour * (vLight * prof * edge * uGain), 1.0);
}`;

async function fetchFiles(base) {
  const at = (name) => String(new URL(`data/deep/${name}`, base));
  const [mr, br] = await Promise.all([fetch(at('galclusters.json')), fetch(at('galclusters.bin'))]);
  if (!mr.ok || !br.ok) throw new Error(`galclusters: HTTP ${mr.status} / ${br.status}`);
  return { manifest: await mr.json(), buffer: await br.arrayBuffer() };
}

export function createLayer(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'deep-galclusters';
  group.renderOrder = -1;
  group.visible = false;
  const shared = {
    uScale: { value: 1 }, uPxPerRad: { value: 1000 }, uMinPx: { value: MIN_PX }, uMaxPx: { value: MAX_PX }, uGain: { value: 1 },
  };
  const state = { loaded: false, failed: null, manifest: null, tile: null, bytes: 0, fileBytes: 0, placedFor: null, calls: 0 };
  const clusters = [];   // { info, mesh, material, uniforms, radiusPx, culled, fade, crowd }
  const quasars = [];    // { q, mesh, uniforms, culled }
  const sphere = new THREE.Sphere();
  const frustum = new THREE.Frustum();
  const _m = new THREE.Matrix4();
  const _c = new THREE.Vector3();
  const _p = new THREE.Vector3();

  const base = env.base || (typeof import.meta !== 'undefined' ? new URL('../../../', import.meta.url) : null);
  const loading = Promise.resolve()
    .then(() => (env.load ? env.load() : fetchFiles(base)))
    .then(({ manifest, buffer }) => {
      state.manifest = manifest;
      state.tile = parseMembers(buffer);
      state.fileBytes = buffer.byteLength + JSON.stringify(manifest).length;
      for (const info of manifest.clusters) clusters.push(buildCluster(info));
      for (const q of manifest.quasars || []) { const o = quasarOf(q); if (o) quasars.push(buildQuasar(o)); }
      state.loaded = true;
      stamp();
    })
    .catch((e) => { state.failed = String(e && e.message || e); console.warn('deep: the galaxy clusters did not load', e); });

  function material(vert, frag, uniforms) {
    return new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, uniforms,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
  }
  function quadGeometry() {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
    return g;
  }
  function bytesOf(g) { return Object.values(g.attributes).reduce((n, a) => n + a.array.byteLength, 0); }

  function buildCluster(info) {
    const A = arraysOf(state.tile, info.offset, info.count);
    const g = quadGeometry();
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(A.off, 3));
    g.setAttribute('aRe', new THREE.InstancedBufferAttribute(A.re, 1));
    g.setAttribute('aMag', new THREE.InstancedBufferAttribute(A.mag, 1));
    g.setAttribute('aColour', new THREE.InstancedBufferAttribute(A.colour, 3));
    g.instanceCount = info.count;
    const uniforms = { ...shared, uFade: { value: 1 } };
    const mat = material(VERT_GAL, FRAG_GAL, uniforms);
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = `deep-galcluster-${info.id}`;
    mesh.frustumCulled = false; // the whole cluster is culled here, once (frame)
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = -1;
    mesh.visible = false;
    group.add(mesh);
    state.bytes += bytesOf(g);
    return { info, mesh, material: mat, uniforms, radiusPx: 0, culled: 'not placed', fade: 0, crowd: 0, own: A.own, sized: A.sized };
  }
  function buildQuasar(q) {
    const g = quadGeometry();
    const kinds = q.host ? [1, 0] : [1];
    g.setAttribute('aKind', new THREE.InstancedBufferAttribute(new Float32Array(kinds), 1));
    g.setAttribute('aRe', new THREE.InstancedBufferAttribute(new Float32Array(q.host ? [0, q.host.reMly] : [0]), 1));
    g.setAttribute('aMag', new THREE.InstancedBufferAttribute(new Float32Array(q.host ? [q.absMag, q.host.absMag] : [q.absMag]), 1));
    g.instanceCount = kinds.length;
    const uniforms = { ...shared };
    const mesh = new THREE.Mesh(g, material(VERT_QSO, FRAG_QSO, uniforms));
    mesh.name = `deep-quasar-${q.id}`;
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.renderOrder = -1;
    mesh.visible = false;
    group.add(mesh);
    state.bytes += bytesOf(g);
    return { q, mesh, uniforms, culled: 'not placed' };
  }

  // The card: what is drawn for each quasar, said once (ui/cards.js appends a row's `departure` to its "drawn as" line and listens for
  // `sr:drawn-changed`). The words are copy/en.later.js r12Far.
  const stamped = new Set();
  function stamp() {
    const W = COPY[COPY_BLOCK];
    if (!W || !W.quasar) return;
    const fresh = [];
    for (const { q } of quasars) {
      if (stamped.has(q.id)) continue;
      const rec = env.recordById ? env.recordById(q.record) : null;
      if (!rec || !rec.meta) continue;
      if (!rec.meta.departure) {
        rec.meta.departure = q.host
          ? t(W.quasar.host, { size: String(q.host.sizeArcsec), ly: (Math.round(q.host.trueWidthLy / 1e4) * 1e4).toLocaleString('en-US') })
          : W.quasar.point;
      }
      stamped.add(q.id);
      fresh.push(rec.id);
    }
    if (fresh.length && typeof window !== 'undefined' && window.dispatchEvent && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('sr:drawn-changed', { detail: { ids: fresh } }));
  }

  /** A mesh matrix: the stage's axes carried onto million light-years, the origin at `centreKm` (sun-inertial). */
  function place(stage, A, centreKm, mesh) {
    const k = MLY_KM;
    _m.set(
      A.x[0] * k, A.y[0] * k, A.z[0] * k, 0,
      A.x[1] * k, A.y[1] * k, A.z[1] * k, 0,
      A.x[2] * k, A.y[2] * k, A.z[2] * k, 0,
      0, 0, 0, 1,
    );
    const at = stage.toSceneInto ? stage.toSceneInto(centreKm, SUN_INERTIAL, _p, stage.tMs) : null;
    if (!at) return false;
    _m.setPosition(_p);
    mesh.matrix.copy(_m);
    mesh.matrixWorldNeedsUpdate = true;
    return true;
  }
  function placeAll(stage) {
    const key = `${stage.worldId}:${stage.unitKm}`;
    if (state.placedFor === key) return true;
    const A = stage.affineFrom ? stage.affineFrom(SUN_INERTIAL, stage.tMs) : null;
    if (!A) return false;
    let ok = true;
    for (const c of clusters) {
      const d = c.info.centre.dir;
      const r = c.info.distMly * MLY_KM;
      ok = place(stage, A, { x: d[0] * r, y: d[1] * r, z: d[2] * r }, c.mesh) && ok;
    }
    for (const s of quasars) ok = place(stage, A, s.q.posKm, s.mesh) && ok;
    if (!ok) return false;
    shared.uScale.value = MLY_KM / stage.unitKm;
    state.placedFor = key;
    return true;
  }

  function frame(info = {}) {
    state.calls = 0;
    const camera = info.camera;
    const on = env.on ? env.on() !== false : true;
    if (!state.loaded || !camera || info.visible === false || !info.stage || !on) {
      group.visible = false;
      for (const c of clusters) { c.mesh.visible = false; c.culled = state.loaded ? 'off' : 'not loaded'; }
      for (const s of quasars) { s.mesh.visible = false; s.culled = state.loaded ? 'off' : 'not loaded'; }
      return;
    }
    if (!placeAll(info.stage)) { group.visible = false; return; }
    group.visible = true;
    group.updateMatrixWorld(true);
    const viewH = info.renderer && info.renderer.domElement ? info.renderer.domElement.clientHeight || 800 : info.viewH || 800;
    const fovY = (camera.fov * Math.PI) / 180 / (camera.zoom || 1);
    shared.uPxPerRad.value = (viewH / 2) / Math.tan(fovY / 2);
    shared.uGain.value = Number.isFinite(info.gain) && info.gain > 0 ? info.gain : 1;
    camera.updateMatrixWorld();
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(_m);
    const unit = shared.uScale.value;
    for (const c of clusters) {
      _c.setFromMatrixPosition(c.mesh.matrixWorld);
      sphere.center.copy(_c);
      sphere.radius = c.info.radiusMly * unit;
      c.radiusPx = tileRadiusPx(sphere.radius, camera.position.distanceTo(_c), fovY, viewH);
      c.mesh.visible = false;
      if (!frustum.intersectsSphere(sphere)) { c.culled = 'frustum'; continue; }
      if (c.radiusPx < CULL_PX) { c.culled = 'size'; continue; }
      c.crowd = Number.isFinite(c.radiusPx) ? crowd(c.radiusPx, c.info.count) : 1;
      c.fade = tileFade(c.radiusPx) * c.crowd;
      c.uniforms.uFade.value = c.fade;
      c.mesh.visible = true;
      c.culled = null;
      state.calls += 1;
    }
    for (const s of quasars) {
      _c.setFromMatrixPosition(s.mesh.matrixWorld);
      sphere.center.copy(_c);
      // the host's radius, and a margin of two per cent of the distance for the bright point's own width on the screen
      sphere.radius = (s.q.host ? s.q.host.mapRadiusMly * unit : 0) + camera.position.distanceTo(_c) * 0.02;
      s.mesh.visible = frustum.intersectsSphere(sphere);
      s.culled = s.mesh.visible ? null : 'frustum';
      if (s.mesh.visible) state.calls += 1;
    }
  }

  /** The words for one cluster (a card, a label, a probe): what the layer knows about how it draws it. */
  function describe(id) {
    const c = clusters.find((x) => x.info.id === id);
    const W = COPY[COPY_BLOCK];
    if (!c || !W || !W.cluster) return null;
    const i = c.info;
    const T = W.cluster;
    const lines = [
      t(i.own > 0 ? T.members : T.membersNoOwn, { n: String(i.count), own: String(i.own), catalogue: i.catalogue }),
      i.distance.method === 'sbf'
        ? t(T.distanceSbf, { mpc: String(i.distMpc), mly: String(Math.round(i.distMly)) })
        : t(T.distanceZ, { z: String(i.distance.zMean), mly: String(Math.round(i.distMly)) }),
      i.depth.kind === 'measured' ? t(T.depthMeasured, { rms: String(Math.round((i.depth.sigmaMly / 3.261563777) * 100) / 100) }) : T.depthModelled,
      T.size,
    ];
    return { id, name: i.name, lines };
  }

  return {
    group,
    frame,
    describe,
    whenLoaded: () => loading,
    ready: () => state.loaded || !!state.failed,
    stats: () => ({
      id: 'galclusters', loaded: state.loaded, failed: state.failed,
      members: state.tile ? state.tile.count : 0, calls: state.calls, bytes: state.bytes, fileBytes: state.fileBytes,
      clusters: clusters.map((c) => ({ id: c.info.id, count: c.info.count, own: c.own, sized: c.sized, culled: c.culled, radiusPx: Number.isFinite(c.radiusPx) ? Math.round(c.radiusPx) : 'inside', fade: Math.round(c.fade * 1000) / 1000, crowd: Math.round(c.crowd * 1000) / 1000 })),
      quasars: quasars.map((s) => ({ id: s.q.id, host: !!s.q.host, culled: s.culled })),
    }),
    dispose() {
      for (const o of [...clusters.map((c) => c.mesh), ...quasars.map((s) => s.mesh)]) { o.geometry.dispose(); o.material.dispose(); }
      if (group.parent) group.parent.remove(group);
    },
  };
}
