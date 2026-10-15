// scene/deep/localvolume.js -- the local volume's galaxies as one static tile (internal spec 0075 stage e,
// task 16, DS-D04, DS-D06; design section 2). The coordinator (scene/deep/deepsky.js) builds it from
// scene/deep/heroes.js DEEP_LAYERS on the local-group stage, and never at boot.
//
//   createLayer(THREE, env) -> { group, frame(info), ready(), stats(), dispose() }
//     env = { load?(): Promise<{manifest, buffer}>, base?: URL }   (load is for tests)
//     info = { camera, renderer, gain, visible }
//
// WHAT IS DRAWN. 800 galaxies of the Updated Nearby Galaxy Catalog (Karachentsev, Makarov & Kaisina
// 2013), baked by scripts/build_deep_localvolume.py into site/data/deep/localvolume.{bin,json}: every
// galaxy within about 36 million light-years that the catalogue has, less the Milky Way and the 68
// the map already draws as deep-sky records (one galaxy, one mark).
//   - A galaxy with a distance of its own (the tip of the red giant branch, Cepheids, Tully-Fisher...)
//     is a POINT at that distance, as wide on the screen as its Holmberg diameter is from where the
//     camera stands (never under MIN_PX), as bright as its B magnitude makes it from there.
//   - A galaxy whose distance is only inferred (its group's, its velocity's, its look's) is a FAINTER,
//     LARGER, SOFTER point in its own grey-blue swatch, at its most likely distance: its direction is
//     measured, its depth is not, and the different mark says so (the "How far" panel's honesty row
//     names both; package section 6.1). Its range of distance is drawn as a line along its sky
//     direction only for the one galaxy asked for (`showRange(i)`: a later selection or hover), never
//     for all of them: 280 lines read as streaks across the whole view (review of #1182).
//   - Colours of the measured are by type, an illustration: early types warm, spirals white, irregulars blue.
//
// ONE TILE, ONE DRAW CALL (two while a range is shown; the budget is five per class, requirement 18).
// The tile is culled whole by the view's frustum against its bounding sphere, and by its projected
// size: it fades out between FADE_PX and CULL_PX in radius (a speck inside the deep-sky marks) and is
// not drawn below that. Its memory is fixed: the attributes below, about 40 kB, nothing per frame.
//
// PRECISION (DS-D10). Positions are in million light-years about the Sun, in float32: the farthest is
// 107, held to a few light-years. The object's matrix carries them into the stage's scene units, and
// three.js multiplies it by the view in float64 before the GPU sees one float32 matrix, so what the
// shader receives is camera-relative. tests/test_localvolume.mjs holds a galaxy still to a quarter of
// a pixel with the camera 1 million and 1 billion light-years out.

export const UNDER_MEASURED = { marks: 'same' };

const MLY_KM = 9460730472580.8 * 1e6;
const SUN_INERTIAL = 'sun-inertial';
export const MAGIC = 'SRLV';
export const MIN_PX = 3; // CSS px: the smallest a galaxy is drawn, as a point
export const MAX_PX = 256; // CSS px: past this a galaxy's own light is spread too thin to see
export const CULL_PX = 3; // CSS px of the whole tile's radius on screen, below which it is not drawn
export const FADE_PX = 40; // and from which, going smaller, it fades out (no pop)
/** The inferred galaxies' swatch: a cool grey, apart from the type colours. */
export const INFERRED_COLOUR = [0.6, 0.66, 0.8];
/** Their light against a measured galaxy's, and how much wider their soft mark is. */
export const INFERRED_LIGHT = 0.45;
export const INFERRED_SIZE = 1.7;
/** The tile's light as its radius on screen shrinks from FADE_PX to CULL_PX: 1 to 0, smooth. Pure. */
export function tileFade(radiusPx) {
  if (!(radiusPx < FADE_PX)) return 1;
  const t = Math.min(1, Math.max(0, (radiusPx - CULL_PX) / (FADE_PX - CULL_PX)));
  return t * t * (3 - 2 * t);
}
const COLOURS = [
  [1.0, 0.86, 0.7], // early type
  [0.95, 0.95, 1.0], // spiral
  [0.72, 0.84, 1.0], // irregular or blue dwarf
  [0.88, 0.88, 0.92], // type not given
];

/** The tile's float32 rows, read and checked. Pure. */
export function parseTile(buffer) {
  const head = new DataView(buffer, 0, 16);
  const magic = String.fromCharCode(head.getUint8(0), head.getUint8(1), head.getUint8(2), head.getUint8(3));
  if (magic !== MAGIC) throw new Error(`localvolume: not a tile (${magic})`);
  const version = head.getUint32(4, true);
  const count = head.getUint32(8, true);
  const stride = head.getUint32(12, true);
  if (buffer.byteLength !== 16 + count * stride * 4) throw new Error(`localvolume: ${buffer.byteLength} bytes for ${count} rows of ${stride}`);
  return { version, count, stride, rows: new Float32Array(buffer, 16, count * stride) };
}

/** One row as an object (tests, the probe's debug). Pure. */
export function rowOf(tile, i) {
  const s = tile.stride;
  const r = tile.rows;
  const flags = r[i * s + 9];
  return {
    dir: [r[i * s], r[i * s + 1], r[i * s + 2]],
    dMly: r[i * s + 3], loMly: r[i * s + 4], hiMly: r[i * s + 5], radiusMly: r[i * s + 6],
    absMag: r[i * s + 7], kind: r[i * s + 8],
    inferred: (flags & 1) === 1, rangeAssumed: (flags & 2) === 2, method: flags >> 8,
  };
}

/**
 * The geometry's arrays from the tile: every galaxy one point at its catalogue distance, million
 * light-years; `inferred` 1 for a galaxy whose distance is not its own (fainter, wider, grey-blue). Pure.
 */
export function arraysOf(tile) {
  const n = tile.count;
  const P = { position: new Float32Array(n * 3), radius: new Float32Array(n), mag: new Float32Array(n), colour: new Float32Array(n * 3), inferred: new Float32Array(n) };
  let far = 0;
  let nInferred = 0;
  for (let i = 0; i < n; i++) {
    const g = rowOf(tile, i);
    const c = g.inferred ? INFERRED_COLOUR : COLOURS[Math.max(0, Math.min(3, Math.round(g.kind)))];
    far = Math.max(far, g.hiMly);
    for (let k = 0; k < 3; k++) { P.position[i * 3 + k] = g.dir[k] * g.dMly; P.colour[i * 3 + k] = c[k]; }
    P.radius[i] = g.radiusMly;
    P.mag[i] = Number.isFinite(g.absMag) ? g.absMag : 99;
    P.inferred[i] = g.inferred ? 1 : 0;
    if (g.inferred) nInferred += 1;
  }
  return { points: P, nPts: n - nInferred, nInferred, farMly: far };
}

/** One galaxy's range of distance as a line of two segments (low end, the value, high end). Pure. */
export function rangeOf(tile, i) {
  const g = rowOf(tile, i);
  const at = [g.loMly, g.dMly, g.dMly, g.hiMly];
  const position = new Float32Array(12);
  for (let v = 0; v < 4; v++) for (let k = 0; k < 3; k++) position[v * 3 + k] = g.dir[k] * at[v];
  return { position, weight: new Float32Array([0, 1, 1, 0]) };
}

/** The whole tile's radius on the screen, CSS px; Infinity from inside it. Pure. */
export function tileRadiusPx(radiusScene, distanceScene, fovYRad, viewH) {
  if (!(distanceScene > radiusScene)) return Infinity;
  return (Math.asin(radiusScene / distanceScene) / (fovYRad / 2)) * (viewH / 2);
}

const VERT_POINTS = /* glsl */ `
attribute float aRadius;   // half the Holmberg diameter, million light-years
attribute float aMag;      // absolute B magnitude (99: none catalogued)
attribute vec3 aColour;
attribute float aInferred; // 1: the distance is not its own (fainter, wider, softer)
uniform float uScale;      // scene units per million light-years
uniform float uPxPerRad;   // CSS px per radian at the centre of the view
uniform float uPixelRatio;
uniform float uMinPx;
uniform float uMaxPx;
varying vec3 vColour;
varying float vLight;
varying float vSoft;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float dMly = max(1e-9, length(mv.xyz) / uScale);
  float wide = 2.0 * aRadius / dMly * uPxPerRad;                       // its true width, CSS px
  float size = clamp(wide, uMinPx * mix(1.0, ${INFERRED_SIZE.toFixed(2)}, aInferred), uMaxPx);
  // Its apparent B magnitude from the camera: M + 5 log10(d / 10 pc).
  float m = aMag + 5.0 * log(dMly * 1.0e6 / 32.6156) / log(10.0);
  float lit = aMag > 90.0 ? 0.3 : clamp((19.0 - m) / 11.0, 0.0, 1.0);
  // A floor: every catalogued galaxy shows as a mark of the map; its light spreads over its disc when
  // it is wide (surface brightness), and past uMaxPx it fades rather than grow.
  float spread = clamp((uMinPx * 2.5) / size, 0.18, 1.0);
  float past = wide > uMaxPx ? uMaxPx / wide : 1.0;
  vLight = (0.45 + 0.75 * lit) * spread * spread * past * mix(1.0, ${INFERRED_LIGHT.toFixed(2)}, aInferred);
  vSoft = aInferred;
  vColour = aColour;
  gl_PointSize = size * uPixelRatio;
}`;

const FRAG_POINTS = /* glsl */ `
uniform float uGain;
uniform float uFade;       // the whole tile, as it shrinks to a speck (tileFade)
varying vec3 vColour;
varying float vLight;
varying float vSoft;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  float k = mix(2.2, 3.6, vSoft);                                         // an inferred one: softer
  float floorK = exp(-k);
  float prof = (exp(-r2 * k) - floorK) / (1.0 - floorK);                  // a soft disc, 0 at its rim
  gl_FragColor = vec4(vColour * (vLight * prof * uGain * uFade), 1.0);
}`;

const VERT_LINES = /* glsl */ `
attribute float aWeight;  // 1 at the catalogue's distance, 0 at either end of the range
varying float vWeight;
varying vec3 vColour;
varying vec3 vView;       // view space, interpolated per fragment: how near the camera this bit of line is
void main() {
  vWeight = aWeight;
  vColour = vec3(${INFERRED_COLOUR.join(', ')});
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

// The one range shown: along the line of sight, brightest at the catalogue's value, gone at its ends;
// where it passes near the camera it fades.
const FRAG_LINES = /* glsl */ `
uniform float uGain;
uniform float uScale;
varying float vWeight;
varying vec3 vColour;
varying vec3 vView;
void main() {
  float dMly = length(vView) / uScale;
  float nearFade = smoothstep(1.5, 5.0, dMly);
  gl_FragColor = vec4(vColour * (0.45 * vWeight * nearFade * uGain * uFade), 1.0);
}`;

async function fetchTile(base) {
  const at = (name) => String(new URL(`data/deep/${name}`, base));
  const [mr, br] = await Promise.all([fetch(at('localvolume.json')), fetch(at('localvolume.bin'))]);
  if (!mr.ok || !br.ok) throw new Error(`localvolume: HTTP ${mr.status} / ${br.status}`);
  return { manifest: await mr.json(), buffer: await br.arrayBuffer() };
}

export function createLayer(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'deep-localvolume';
  group.renderOrder = -1;
  group.matrixAutoUpdate = false;
  group.visible = false;
  const uniforms = {
    uScale: { value: 1 }, uPxPerRad: { value: 1000 }, uPixelRatio: { value: 1 },
    uMinPx: { value: MIN_PX }, uMaxPx: { value: MAX_PX }, uGain: { value: 1 }, uFade: { value: 1 },
  };
  const state = { loaded: false, failed: null, manifest: null, tile: null, arrays: null, bytes: 0, fileBytes: 0, placedFor: null, culled: 'not loaded', radiusPx: 0, calls: 0 };
  let points = null;
  let lines = null;
  let rangeShown = -1;
  const sphere = new THREE.Sphere();
  const frustum = new THREE.Frustum();
  const _m = new THREE.Matrix4();
  const _c = new THREE.Vector3();

  const base = env.base || (typeof import.meta !== 'undefined' ? new URL('../../../', import.meta.url) : null);
  const loading = Promise.resolve()
    .then(() => (env.load ? env.load() : fetchTile(base)))
    .then(({ manifest, buffer }) => {
      const tile = parseTile(buffer);
      const arrays = arraysOf(tile);
      state.manifest = manifest;
      state.tile = tile;
      state.arrays = arrays;
      state.fileBytes = buffer.byteLength;
      build(arrays);
      state.loaded = true;
    })
    .catch((e) => { state.failed = String(e && e.message || e); console.warn('deep: the local volume did not load', e); });

  function build(a) {
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(a.points.position, 3));
    pg.setAttribute('aRadius', new THREE.BufferAttribute(a.points.radius, 1));
    pg.setAttribute('aMag', new THREE.BufferAttribute(a.points.mag, 1));
    pg.setAttribute('aColour', new THREE.BufferAttribute(a.points.colour, 3));
    pg.setAttribute('aInferred', new THREE.BufferAttribute(a.points.inferred, 1));
    points = new THREE.Points(pg, new THREE.ShaderMaterial({
      vertexShader: VERT_POINTS, fragmentShader: FRAG_POINTS, uniforms,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    points.name = 'deep-localvolume-points';
    points.frustumCulled = false; // the whole tile is culled here, once (frame)
    points.renderOrder = -1;
    // One range at a time: four vertices, filled by showRange(i), hidden until then.
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    lg.setAttribute('aWeight', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 0]), 1));
    lines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
      vertexShader: VERT_LINES, fragmentShader: FRAG_LINES, uniforms,
      transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    lines.name = 'deep-localvolume-ranges';
    lines.frustumCulled = false;
    lines.renderOrder = -1;
    lines.visible = false;
    group.add(points, lines);
    state.bytes = [pg, lg].reduce((n, g) => n + Object.values(g.attributes).reduce((k, at) => k + at.array.byteLength, 0), 0);
    sphere.radius = a.farMly;
  }

  /** The tile's matrix: million light-years about the Sun, sun-inertial, into this stage's scene. */
  function place(stage) {
    const key = `${stage.worldId}:${stage.unitKm}`;
    if (state.placedFor === key) return true;
    const A = stage.affineFrom ? stage.affineFrom(SUN_INERTIAL, stage.tMs) : null;
    if (!A) return false;
    const k = MLY_KM;
    _m.set(
      A.x[0] * k, A.y[0] * k, A.z[0] * k, A.o[0],
      A.x[1] * k, A.y[1] * k, A.z[1] * k, A.o[1],
      A.x[2] * k, A.y[2] * k, A.z[2] * k, A.o[2],
      0, 0, 0, 1,
    );
    // The Sun's own place: the affine map's origin is a probe point; carry it back to the Sun.
    const sun = stage.toScene({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, stage.tMs);
    if (sun) _m.setPosition(sun);
    group.matrix.copy(_m);
    group.matrixWorldNeedsUpdate = true;
    uniforms.uScale.value = MLY_KM / stage.unitKm;
    state.placedFor = key;
    return true;
  }

  function frame(info = {}) {
    state.calls = 0;
    const camera = info.camera;
    if (!state.loaded || !camera || info.visible === false || !info.stage) { group.visible = false; state.culled = state.loaded ? 'off' : 'not loaded'; return; }
    if (!place(info.stage)) { group.visible = false; state.culled = 'no frame'; return; }
    group.updateMatrixWorld(true);
    const viewH = info.renderer && info.renderer.domElement ? info.renderer.domElement.clientHeight || 800 : info.viewH || 800;
    const fovY = (camera.fov * Math.PI) / 180 / (camera.zoom || 1);
    uniforms.uPxPerRad.value = (viewH / 2) / Math.tan(fovY / 2);
    if (info.renderer && typeof info.renderer.getPixelRatio === 'function') uniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, info.renderer.getPixelRatio()));
    uniforms.uGain.value = Number.isFinite(info.gain) && info.gain > 0 ? info.gain : 1;
    // Culled whole: by the frustum, then by its size on the screen.
    _c.setFromMatrixPosition(group.matrixWorld);
    sphere.center.copy(_c);
    const R = (state.arrays ? state.arrays.farMly : 0) * uniforms.uScale.value;
    sphere.radius = R;
    camera.updateMatrixWorld();
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(_m);
    state.radiusPx = tileRadiusPx(R, camera.position.distanceTo(_c), fovY, viewH);
    if (!frustum.intersectsSphere(sphere)) { group.visible = false; state.culled = 'frustum'; return; }
    if (state.radiusPx < CULL_PX) { group.visible = false; state.culled = 'size'; return; }
    uniforms.uFade.value = tileFade(state.radiusPx);
    group.visible = true;
    state.culled = null;
    state.calls = 1 + (lines && lines.visible ? 1 : 0);
  }

  /** Show one galaxy's range of distance (a selection or a hover will ask), or none (-1). */
  function showRange(i) {
    if (!lines || !state.tile) return false;
    const ok = Number.isInteger(i) && i >= 0 && i < state.tile.count && rowOf(state.tile, i).inferred;
    rangeShown = ok ? i : -1;
    lines.visible = ok;
    if (ok) {
      lines.geometry.getAttribute('position').array.set(rangeOf(state.tile, i).position);
      lines.geometry.getAttribute('position').needsUpdate = true;
    }
    return ok;
  }

  return {
    group,
    frame,
    showRange,
    whenLoaded: () => loading,
    ready: () => state.loaded || !!state.failed,
    stats: () => ({
      id: 'localvolume', loaded: state.loaded, failed: state.failed,
      galaxies: state.tile ? state.tile.count : 0,
      points: state.arrays ? state.arrays.nPts : 0, inferred: state.arrays ? state.arrays.nInferred : 0, rangeShown,
      fade: Math.round(uniforms.uFade.value * 100) / 100,
      bytes: state.bytes, fileBytes: state.fileBytes, calls: state.calls, culled: state.culled,
      radiusPx: Number.isFinite(state.radiusPx) ? Math.round(state.radiusPx) : 'inside',
    }),
    /** A galaxy's name and catalogue facts by tile row, for a probe or a later card. */
    galaxy: (i) => (state.tile && i >= 0 && i < state.tile.count ? { name: state.manifest.names[i], ...rowOf(state.tile, i), method: state.manifest.methods[rowOf(state.tile, i).method] } : null),
    dispose() {
      for (const o of [points, lines]) if (o) { o.geometry.dispose(); o.material.dispose(); }
      if (group.parent) group.parent.remove(group);
    },
  };
}
