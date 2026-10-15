// scene/deep/cmb.js -- the light of the young universe, as our sky shows it, at the horizon (internal
// spec 0076 stage W1-b, internal #781; spec 0075 task 24, DS-17; package CMB_AND_HORIZON).
//
// Never at boot: scene/shells.js imports this when the camera, on a rung of the ladder, is a fifth of
// the way out to the horizon (tests/test_boot_diet.mjs), and the map is fetched then (119 kB).
//
// WHAT IS MEASURED AND WHAT IS DRAWN.
//   - MEASURED: the map. WMAP's nine-year Internal Linear Combination map (NASA, LAMBDA; Bennett et al.
//     2013): the temperature of the microwave background in every direction of OUR sky, a millionth of
//     a degree at a time, smoothed to one degree, with its average (2.7255 K) and the dipole of our own
//     motion taken out. scripts/build_deep_cmb.py turns it into a grey picture in Galactic longitude and
//     latitude, linear from -SCALE_UK to +SCALE_UK microkelvin; this module turns Galactic to the map's
//     axes (ecliptic J2000, scene/stage.js) and colours each grey by STOPS, the same scale the legend
//     prints (scene/shells.js), so a colour on the sphere means the number under it on the bar.
//   - ILLUSTRATION: where it is put. The light left, about 370 000 years after the Big Bang, from a
//     sphere around us whose radius is now cmbLy() (data/cosmology.js, 45.3 billion light-years, just
//     inside the 46.2 Gly horizon). Each direction's temperature is painted at that radius in that
//     direction, so from the Sun the sphere IS the sky we measure. Seen from anywhere else, and from
//     outside above all, it is a picture of our sky wrapped on the place its light came from: nobody
//     there would see it, and an observer there sees another map. The words say so (scene/shells.js).
//     It is not a wall: nothing ends there, and the band past it says it is an illustration too.
//   - It is painted on the sphere's INSIDE, as the sky is seen from within: from inside, on the last
//     third of the way out (from about 30 billion light-years), it is the sky ahead; from outside, the
//     near side is clear and the far side's inside is seen through it. (The first look, 2026-10-15,
//     painted the outside too: from just outside, a few texels of a one-degree map filled the view as
//     blurred blobs.) It is never the backdrop of the deep sky: in visible light the sky behind the
//     galaxies is dark, and a microwave map behind them would say otherwise.
//
// THE COLOUR. A diverging scale of this map's own, dark at the average so the sphere never washes the
// view (no bloom, no glow, nothing additive): blue colder, orange warmer, both ends clipped at +-200
// microkelvin (0.45 % of the sky is past them, mostly along the Galactic plane, where some of the
// Galaxy's own microwaves remain in an ILC map). Display values, toneMapped false, no colour-space
// conversion (deep/gasmat.js COLOUR_POLICY), so the canvas legend and the sphere are the same colours.
//
// Contract: createCmb(parent, opts) -> { update(camera, rUnits, nowMs), state(), dispose() }
// Pure, for tests: SCENE_FROM_GAL, galToScene(v), sceneToGal(v), galUv(sceneDir), greyToUk(g),
// colourAt(uk), cmbOpacity(ratio), STOPS, SCALE_UK, MAP_URL, LOAD_RATIO.

import * as THREE from '../../../vendor/three.module.min.js';

/** Under the Measured look (scene/exposure.js): the map is measured and still; it is drawn as in Film. */
export const UNDER_MEASURED = { map: 'same' };
/** The legend's ends, microkelvin: scripts/build_deep_cmb.py SCALE_UK and the manifest's `scaleUk`. */
export const SCALE_UK = 200;
export const MAP_URL = '../../../images/deep/cmb/wmap-ilc-9yr.webp';
/** The map is fetched once the camera is this share of the way out to it (about 9 billion light-years). */
export const LOAD_RATIO = 0.2;
/** Seven colours at equal steps from -SCALE_UK to +SCALE_UK (display sRGB). */
export const STOPS = Object.freeze(['#8fb4ee', '#3f72cf', '#1f3a73', '#16181f', '#6b2f1c', '#c8652c', '#f4b870']);

// --- the frame: Galactic -> equatorial J2000 -> ecliptic J2000 -> the scene's axes ---------------------
// Equatorial J2000 -> Galactic (Hipparcos, ESA SP-1200 vol. 1, eq. 1.5.11; as sky/hips.js EQ_TO_GAL).
const EQ_TO_GAL = [
  -0.0548755604, -0.8734370902, -0.4838350155,
  0.4941094279, -0.44482963, 0.7469822445,
  -0.867666149, -0.1980763734, 0.4559837762,
];
const EPS = 23.4392911 * (Math.PI / 180); // the obliquity of J2000 (data/parsers.js OBLIQUITY_RAD)
const mul = (a, b) => {
  const o = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) for (let k = 0; k < 3; k++) o[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
  return o;
};
const T = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
const ce = Math.cos(EPS), se = Math.sin(EPS);
const EQ_TO_ECL = [1, 0, 0, 0, ce, se, 0, -se, ce];
// scene/stage.js: scene.x = frame.x, scene.y = frame.z, scene.z = -frame.y
const ECL_TO_SCENE = [1, 0, 0, 0, 0, 1, 0, -1, 0];
/** Galactic unit vector -> the scene's axes on a rung of the ladder (row-major 3 x 3). */
export const SCENE_FROM_GAL = Object.freeze(mul(ECL_TO_SCENE, mul(EQ_TO_ECL, T(EQ_TO_GAL))));
const GAL_FROM_SCENE = T(SCENE_FROM_GAL);
const apply = (m, v) => ({
  x: m[0] * v.x + m[1] * v.y + m[2] * v.z,
  y: m[3] * v.x + m[4] * v.y + m[5] * v.z,
  z: m[6] * v.x + m[7] * v.y + m[8] * v.z,
});
export const galToScene = (v) => apply(SCENE_FROM_GAL, v);
export const sceneToGal = (v) => apply(GAL_FROM_SCENE, v);

/** Where a scene direction reads the picture: u from Galactic longitude (0 at l = 0), v from latitude (1 at b = +90). */
export function galUv(dir) {
  const n = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const g = sceneToGal({ x: dir.x / n, y: dir.y / n, z: dir.z / n });
  let l = Math.atan2(g.y, g.x);
  if (l < 0) l += 2 * Math.PI;
  const b = Math.asin(Math.max(-1, Math.min(1, g.z)));
  return { u: l / (2 * Math.PI), v: 0.5 + b / Math.PI, lDeg: (l * 180) / Math.PI, bDeg: (b * 180) / Math.PI };
}

/** A grey of the picture (0..255) -> microkelvin. */
export const greyToUk = (g) => (g / 127.5 - 1) * SCALE_UK;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const STOP_RGB = STOPS.map(hex);
/** The colour of a temperature, display sRGB 0..1, exactly as the shader mixes it. */
export function colourAt(uk) {
  const x = Math.min(STOPS.length - 1 - 1e-6, Math.max(0, ((uk / SCALE_UK + 1) / 2) * (STOPS.length - 1)));
  const i = Math.floor(x);
  const f = x - i;
  return STOP_RGB[i].map((c, k) => c + (STOP_RGB[i + 1][k] - c) * f);
}

const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
/**
 * How strongly the map is drawn from a camera `ratio` of its radius from the Sun: nothing before two
 * thirds of the way out (30 billion light-years), all of it from 0.8, the same through the surface
 * (only its inside is painted, so there is no wall to pass through) and outside, gone by 150 radii.
 */
export function cmbOpacity(ratio) {
  if (!(ratio > 0)) return 0;
  return 0.8 * smooth(0.66, 0.8, ratio) * (1 - smooth(40, 150, ratio));
}

const VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #include <logdepthbuf_vertex>
}`;
const FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap;
uniform mat3 uToGal;
uniform vec3 uStops[7];
uniform float uOpacity;
varying vec3 vDir;
void main() {
  #include <logdepthbuf_fragment>
  vec3 g = uToGal * normalize(vDir);
  float l = atan(g.y, g.x);
  if (l < 0.0) l += 2.0 * PI;
  float b = asin(clamp(g.z, -1.0, 1.0));
  // No mipmaps: the map is smooth at a degree, and a level picked across the seam at l = 0 would show it.
  float t = texture2D(uMap, vec2(l / (2.0 * PI), 0.5 + b / PI)).r;
  float x = clamp(t * 6.0, 0.0, 5.9999);
  int i = int(floor(x));
  gl_FragColor = vec4(mix(uStops[i], uStops[i + 1], fract(x)), uOpacity);
}`;

/**
 * The map's sphere, unit radius, scaled by update() to the background's radius on the current rung.
 * `opts.loadMap(url, onLoad, onError)` -> texture: how the picture is read (a test hands in its own).
 */
export function createCmb(parent, opts = {}) {
  const url = new URL(MAP_URL, import.meta.url).href;
  let status = 'loading';
  let readyAt = 0;
  const loadMap = opts.loadMap || ((u, ok, bad) => new THREE.TextureLoader().load(u, ok, undefined, bad));
  const tex = loadMap(url, () => { status = 'ready'; readyAt = 0; }, (e) => { status = 'failed'; console.warn('the microwave background map did not load', e); });
  tex.colorSpace = THREE.NoColorSpace; // the greys are numbers, not colours
  tex.wrapS = THREE.RepeatWrapping; // across l = 0
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const toGal = new THREE.Matrix3().set(...GAL_FROM_SCENE);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uMap: { value: tex },
      uToGal: { value: toGal },
      uStops: { value: STOP_RGB.map((c) => new THREE.Vector3(...c)) },
      uOpacity: { value: 0 },
    },
    transparent: true, depthWrite: false, depthTest: true, toneMapped: false, side: THREE.BackSide, // the inside only
  });
  const geom = new THREE.SphereGeometry(1, 128, 64);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.name = 'shells:cmb';
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = -1; // under the wire and the words
  parent.add(mesh);
  let opacity = 0;
  let side = null;

  /** `rUnits`: the background's radius in this rung's units. Returns the strength it is drawn with. */
  function update(camera, rUnits, nowMs = (typeof performance !== 'undefined' ? performance.now() : 0)) {
    const ratio = camera && rUnits > 0 ? camera.position.length() / rUnits : 0;
    let k = cmbOpacity(ratio);
    if (status !== 'ready') k = 0;
    else if (k > 0) {
      // A map that lands while it should already be there comes in over half a second, never at once.
      if (!readyAt) readyAt = nowMs;
      k *= smooth(0, 500, nowMs - readyAt);
    }
    opacity = k;
    side = k > 0 ? (ratio < 1 ? 'inside' : 'outside') : null;
    mesh.visible = k > 0.005;
    if (mesh.visible) {
      mesh.scale.setScalar(rUnits);
      mat.uniforms.uOpacity.value = k;
    }
    return k;
  }

  function state() {
    return { status, opacity, side, drawn: mesh.visible && opacity > 0.005, scaleUk: SCALE_UK, url: MAP_URL };
  }

  function dispose() {
    parent.remove(mesh);
    geom.dispose();
    mat.dispose();
    tex.dispose();
  }

  return { update, state, dispose };
}
