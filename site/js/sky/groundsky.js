// sky/groundsky.js -- the sky as it looks from the ground, drawn for the sky view (pub #454;
// internal #351 zoom, #352 the air, #353 fainter stars, #356 grids, #357 how dark the sky is).
//
// Contract: createGroundSky(ctx, env) -> { update(frame), setOptions(o), showPass(track, marks),
//             clearPass(), mark(azDeg, altDeg), apparentOf(id), stats(), dispose(), ready }
//   env:   { group, radius, observer, domElement, options }   group is sky/skyview.js's local frame
//   frame: { tMs, fovDeg, sunAltDeg, sunAzDeg, moonBright, camera, renderer }
// Loaded by sky/skyview.js with a dynamic import the first time the sky view opens: none of this,
// and none of the data it reads, is on the first visit.
//
// WHY IT IS ITS OWN LAYER. The orbital scene's sky (scene/starfield.js) is 5 044 stars at fixed
// sizes on a sphere that knows nothing of the ground: no air, no horizon, one field of view. And
// scene/worlds.js draws the planets 0.4 degrees wide so they can be found from orbit. From the
// ground both are wrong, so while this layer is up sky/skyview.js veils them and this draws:
//
//   the Milky Way   the scene's own panorama, turned with the stars, faded by the Moon, twilight,
//                   the horizon's air and the kind of sky chosen
//   the stars       ONE draw call: points with a shader. To magnitude 6 at once (data/stars.bin,
//                   80 kB, already in the cache), then the 109 389 of data/stars3d.bin (HYG v4.4,
//                   2.6 MB, fetched here and only here unless the Stars layer has it already).
//                   The limit is sky/skymath.js limitingMagnitude(): the eye's in a wide field,
//                   deeper as the field narrows. The shader lifts each star by refraction, dims and
//                   reddens it by its air mass, and makes it twinkle near the horizon.
//   the bodies      the Sun, the Moon and seven planets from sky/skybodies.js: a point while small,
//                   a disc at its true apparent size once the field is narrow enough, lit from
//                   where the Sun really is, turned by its IAU rotation model; Saturn's rings at
//                   their real tilt; Jupiter's four moons as points.
//   lines           the 89 figures, and on request the Sun's path, the sky's equator and two grids.
//   names           HTML over the canvas: figures, the brightest stars, the bodies.
//
// WHAT IS MEASURED, COMPUTED, DRAWN. Star positions, magnitudes and colours are catalogue
// measurements. Planet positions, sizes, phases and the ring tilt are computed (Astronomy Engine).
// Refraction, extinction and the limiting magnitude are models of an average clear night
// (sky/skymath.js says which). Twinkling is drawn: it is the right kind of flicker in the right
// place, not a simulation of tonight's air. The figures are a convention. copy/en.js says so in
// one line under the controls.

import * as THREE from '../../vendor/three.module.min.js';
import * as Astronomy from '../../vendor/astronomy.js';
import { bvToKelvin, kelvinToRgb } from '../scene/starfield.js';
import { COPY, t } from '../copy/en.js';
import {
  GLSL_AIR, DARKNESS, DEFAULT_DARKNESS, refractionDeg, airmass, extinctionTint, flattening,
  limitingMagnitude, fovName, pixelsPerDegree,
} from './skymath.js';
import { BODIES, bodyView, jupiterMoons, eqjToLocal, localOf, altAzOf } from './skybodies.js';
import { eclToEq, eclipticRing } from './figures.js';

const DEG = Math.PI / 180;
const EXT_K = 0.2;
const RO = { milkyway: -99, stars: -98, lines: -97, points: -96, discs: -95, arc: 99 };
const LABEL_POOL = 44;
const BODY_REFRESH_MS = 1000; // of the clock; a tenth of that once the field is narrow
const LABEL_REFRESH_MS = 250; // of the wall clock: which names are shown, not where
const MILKY_WAY_GAIN = 0.5;

// What a body looks like before (or without) its map: one flat colour, and whether it shines.
const LOOK = {
  sun: { colour: [1.0, 0.96, 0.86], emissive: 1, limb: 0.55 },
  moon: { colour: [0.72, 0.71, 0.69], map: '2k_moon.jpg', limb: 0 },
  mercury: { colour: [0.62, 0.6, 0.58], limb: 0 },
  venus: { colour: [0.96, 0.93, 0.84], limb: 0.2 },
  mars: { colour: [0.82, 0.48, 0.3], map: '2k_mars.jpg', limb: 0.1 },
  jupiter: { colour: [0.84, 0.76, 0.66], map: '2k_jupiter.jpg', limb: 0.45 },
  saturn: { colour: [0.88, 0.8, 0.62], map: '2k_saturn.jpg', limb: 0.45, rings: true },
  uranus: { colour: [0.66, 0.86, 0.9], limb: 0.4 },
  neptune: { colour: [0.36, 0.5, 0.94], limb: 0.4 },
};
// A map is fetched only once its disc is this many pixels across: before that it is a dot.
const MAP_AT_PX = 10;

// ------------------------------------------------------------------------------------ shaders

const STAR_VERT = /* glsl */ `
attribute float aMag;
attribute vec3 aColour;
uniform mat3 uEqToLocal;
uniform float uLimit, uPx, uTime, uTwinkle, uExtK, uAir, uRadius;
varying vec3 vColour;
varying float vAlpha;
varying float vGlare;
${GLSL_AIR}
void main() {
  vec3 d = airLift(uEqToLocal * position, uAir);
  float x = airMass(d.y) - 1.0;
  float f = uLimit - (aMag + uExtK * x);
  float alpha = clamp((f + 0.6) / 2.2, 0.0, 1.0);
  float size = min(12.0, 1.5 * pow(1.32, max(f, 0.0)));
  float glare = clamp((f - 4.5) / 4.0, 0.0, 1.0);
  float ph = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2832;
  float amp = uTwinkle * clamp(0.05 * x, 0.0, 0.5);
  alpha *= 1.0 + amp * sin(uTime * (7.0 + ph) + ph * 3.0) * sin(uTime * 3.1 + ph);
  vColour = aColour * vec3(1.0, exp(-0.045 * x), exp(-0.11 * x));
  vAlpha = alpha;
  vGlare = glare;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(d * uRadius, 1.0);
  gl_PointSize = max(1.5, size * (1.0 + 2.2 * glare) * uPx);
  // Under the horizon, or too faint to see: off the screen, so it costs no fragments.
  if (alpha <= 0.004 || d.y < -0.03) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vColour;
varying float vAlpha;
varying float vGlare;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float coreR = 1.0 / (1.0 + 2.2 * vGlare);
  float core = 1.0 - smoothstep(coreR * 0.45, coreR, r);
  float halo = vGlare * 0.3 * pow(max(0.0, 1.0 - r), 2.5);
  float a = (core + halo) * vAlpha;
  if (a <= 0.002) discard;
  gl_FragColor = vec4(mix(vColour, vec3(1.0), core * 0.35 * vGlare), a);
  #include <colorspace_fragment>
}
`;

const LINE_VERT = /* glsl */ `
uniform mat3 uEqToLocal;
uniform float uUseEq, uAir, uRadius;
varying float vY;
${GLSL_AIR}
void main() {
  vec3 d = uUseEq > 0.5 ? airLift(uEqToLocal * position, uAir) : position;
  vY = d.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(d * uRadius, 1.0);
}
`;
const LINE_FRAG = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
varying float vY;
void main() {
  float a = uOpacity * smoothstep(-0.01, 0.04, vY);
  if (a <= 0.002) discard;
  gl_FragColor = vec4(uColour, a);
  #include <colorspace_fragment>
}
`;

const MW_VERT = /* glsl */ `
uniform mat3 uRot;
uniform float uRadius;
varying vec2 vUv;
varying float vY;
void main() {
  vUv = uv;
  vec3 d = uRot * position;
  vY = d.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(d * uRadius, 1.0);
}
`;
const MW_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uGain;
varying vec2 vUv;
varying float vY;
void main() {
  // The panorama's floor is a dim brown everywhere; only what stands above it is the Milky Way.
  vec3 c = max(texture2D(uMap, vUv).rgb - 0.012, 0.0);
  // The air: nothing of it survives the last few degrees above the horizon.
  float air = smoothstep(0.0, 0.3, vY);
  gl_FragColor = vec4(c * uGain * air, 1.0);
  #include <colorspace_fragment>
}
`;

// One body as a sphere seen from far away, drawn on a square that faces the visitor. vP is the
// position on that square in body radii; the sphere's normal, the Sun's direction and the body's
// own axes are all in the square's frame (x right, y up, z towards the visitor).
const DISC_VERT = /* glsl */ `
uniform vec3 uCentre, uRight, uUp;
uniform float uHalf, uExtent, uSquash;
varying vec2 vP;
void main() {
  vP = position.xy * uExtent;
  vec3 p = uCentre + (uRight * position.x + uUp * position.y * uSquash) * uHalf;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;
const DISC_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uUseMap, uEmissive, uLimb, uRings, uOpacity, uCover, uGain;
uniform vec3 uColour, uSun, uTint;
uniform mat3 uBody; // columns: the body's x, y, z axes
varying vec2 vP;
const float PI = 3.141592653589793;
float ringDensity(float r) {
  // Saturn's main rings in Saturn radii: C, B, the Cassini division, A.
  float c = smoothstep(1.235, 1.26, r) * (1.0 - smoothstep(1.50, 1.53, r)) * 0.18;
  float b = smoothstep(1.50, 1.55, r) * (1.0 - smoothstep(1.93, 1.95, r)) * 0.95;
  float a = smoothstep(2.02, 2.04, r) * (1.0 - smoothstep(2.25, 2.27, r)) * 0.7;
  return c + b + a;
}
void main() {
  float r2 = dot(vP, vP);
  float px = fwidth(vP.x) * 1.5;
  vec3 col = vec3(0.0);
  float cover = 0.0;
  float zSphere = -1e9;
  if (r2 < 1.0) {
    float z = sqrt(1.0 - r2);
    zSphere = z;
    vec3 n = vec3(vP, z);
    vec3 albedo = uColour;
    if (uUseMap > 0.5) {
      vec3 nb = vec3(dot(uBody[0], n), dot(uBody[1], n), dot(uBody[2], n));
      vec2 uv = vec2(atan(nb.y, nb.x) / (2.0 * PI) + 0.5, asin(clamp(nb.z, -1.0, 1.0)) / PI + 0.5);
      albedo = texture2D(uMap, uv).rgb;
    }
    float lit = smoothstep(-0.02, 0.12, dot(n, uSun)) * mix(1.0, max(dot(n, uSun), 0.0), 0.6);
    float limb = 1.0 - uLimb * (1.0 - z);
    col = albedo * limb * mix(lit + 0.012, 1.0, uEmissive);
    cover = 1.0 - smoothstep(1.0 - px, 1.0, sqrt(r2));
  }
  if (uRings > 0.5) {
    vec3 n = uBody[2];
    float nz = abs(n.z) < 1e-4 ? 1e-4 : n.z;
    float z = -(vP.x * n.x + vP.y * n.y) / nz;
    vec3 q = vec3(vP, z);
    float dens = ringDensity(length(q));
    // Behind the globe, or in its shadow (the Sun is behind the planet as the ring sees it).
    if (z < zSphere) dens = 0.0;
    float along = dot(q, uSun);
    if (along < 0.0 && length(q - along * uSun) < 1.0) dens *= 0.08;
    vec3 ringCol = vec3(0.86, 0.8, 0.66) * (0.55 + 0.45 * smoothstep(1.5, 1.95, length(q)));
    col = mix(col, ringCol, dens);
    cover = max(cover, dens);
  }
  if (cover <= 0.002) discard;
  // Premultiplied: light is added, and what is behind is hidden only where uCover says (the Sun).
  gl_FragColor = vec4(col * uTint * uGain * cover * uOpacity, cover * uCover * uOpacity);
  #include <colorspace_fragment>
}
`;

// ------------------------------------------------------------------------------------ helpers

function radecDir(raDeg, decDeg) {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const c = Math.cos(dec);
  return [c * Math.cos(ra), c * Math.sin(ra), Math.sin(dec)];
}

function localFromAltAz(azDeg, altDeg) {
  const a = azDeg * DEG;
  const h = altDeg * DEG;
  const c = Math.cos(h);
  return [Math.sin(a) * c, Math.sin(h), -Math.cos(a) * c];
}

/** A true local direction lifted by refraction: what the eye sees. */
function lift(l) {
  const { altDeg, azDeg } = altAzOf(l);
  return localFromAltAz(azDeg, altDeg + refractionDeg(altDeg));
}

function starColour(bv, out, i) {
  const rgb = kelvinToRgb(bvToKelvin(Number.isFinite(bv) ? bv : 0.6));
  // Kept a little towards white: on a screen the full black-body colour reads as paint.
  _c.setRGB(1 + (rgb[0] - 1) * 0.8, 1 + (rgb[1] - 1) * 0.8, 1 + (rgb[2] - 1) * 0.8, THREE.SRGBColorSpace);
  out[i * 3] = _c.r;
  out[i * 3 + 1] = _c.g;
  out[i * 3 + 2] = _c.b;
}
const _c = new THREE.Color();

/** How many of an ascending magnitude list are at or under `mag`. */
export function countBrighter(mags, mag) {
  let lo = 0;
  let hi = mags.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (mags[mid] <= mag) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** data/stars.bin: ra, dec, mag, B-V as four floats a star. Returns arrays sorted by magnitude. */
export function parseNakedEye(buffer) {
  const f = new Float32Array(buffer);
  const n = Math.floor(f.length / 4);
  const rows = [];
  for (let i = 0; i < n; i += 1) rows.push({ dir: radecDir(f[i * 4], f[i * 4 + 1]), mag: f[i * 4 + 2], bv: f[i * 4 + 3] });
  return packStars(rows);
}

/**
 * data/stars3d.bin (scripts/build-stars3d.py): position in light-years on the ecliptic J2000 axes,
 * apparent magnitude, B-V. Only the direction is used here. `fainterThan` drops what the naked-eye
 * file already has, so no star is drawn twice.
 */
export function parseDeep(buffer, fainterThan = -Infinity) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SR3D') throw new Error('stars3d.bin: not the file this was written for');
  const count = dv.getUint32(8, true);
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const o = 16 + i * 24;
    const mag = dv.getFloat32(o + 16, true);
    if (!(mag > fainterThan)) continue;
    const x = dv.getFloat32(o, true);
    const y = dv.getFloat32(o + 4, true);
    const z = dv.getFloat32(o + 8, true);
    const n = Math.hypot(x, y, z);
    if (!(n > 0)) continue;
    const ci = dv.getInt16(o + 20, true);
    rows.push({ dir: eclToEq([x / n, y / n, z / n]), mag, bv: ci === -32768 ? NaN : ci / 1000 });
  }
  return packStars(rows);
}

function packStars(rows) {
  rows.sort((a, b) => a.mag - b.mag);
  const n = rows.length;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const mag = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const r = rows[i];
    pos[i * 3] = r.dir[0];
    pos[i * 3 + 1] = r.dir[1];
    pos[i * 3 + 2] = r.dir[2];
    mag[i] = r.mag;
    starColour(r.bv, col, i);
  }
  return { pos, col, mag, count: n };
}

function joinStars(a, b) {
  // Both are sorted and every star of b is fainter than every star of a, so the join is sorted.
  const n = a.count + b.count;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const mag = new Float32Array(n);
  pos.set(a.pos); pos.set(b.pos, a.count * 3);
  col.set(a.col); col.set(b.col, a.count * 3);
  mag.set(a.mag); mag.set(b.mag, a.count);
  return { pos, col, mag, count: n };
}

// ------------------------------------------------------------------------------------ the layer

export function createGroundSky(ctx, env) {
  const group = env.group;
  const R = env.radius;
  const observer = env.observer;
  const observerA = new Astronomy.Observer(observer.latDeg, observer.lonDeg, (observer.altKm || 0) * 1000);
  const here = import.meta.url;
  const url = (p) => new URL(p, here);
  const options = { figures: true, names: true, grid: false, starGrid: false, sunPath: false, equator: false, darkness: DEFAULT_DARKNESS, ...(env.options || {}) };
  const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let disposed = false;
  const stats = { stars: 0, drawn: 0, limit: 0, bytes: 0, deep: false, labels: 0 };

  const root = new THREE.Group();
  root.name = 'ground-sky';
  group.add(root);

  const eqToLocal = new THREE.Matrix3();
  let m9 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

  // ---- stars -----------------------------------------------------------------------------------
  const starUniforms = {
    uEqToLocal: { value: eqToLocal },
    uLimit: { value: 6.5 },
    uPx: { value: 1 },
    uTime: { value: 0 },
    uTwinkle: { value: reducedMotion ? 0 : 1 },
    uExtK: { value: EXT_K },
    uAir: { value: 1 },
    uRadius: { value: R * 0.985 },
  };
  const pointMaterial = (uniforms) => new THREE.ShaderMaterial({
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  let stars = null; // { points, mag }
  let nakedEye = null;
  function setStars(data) {
    if (disposed) return;
    if (stars) { stars.points.geometry.dispose(); root.remove(stars.points); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    geo.setAttribute('aColour', new THREE.BufferAttribute(data.col, 3));
    geo.setAttribute('aMag', new THREE.BufferAttribute(data.mag, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 2);
    const points = new THREE.Points(geo, stars ? stars.points.material : pointMaterial(starUniforms));
    points.name = 'ground-stars';
    points.frustumCulled = false;
    points.renderOrder = RO.stars;
    root.add(points);
    stars = { points, mag: data.mag };
    stats.stars = data.count;
  }

  async function fetchBytes(path) {
    const r = await fetch(String(url(path)));
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    const buf = await r.arrayBuffer();
    stats.bytes += buf.byteLength;
    return buf;
  }
  async function fetchJson(path) {
    const r = await fetch(String(url(path)));
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    const text = await r.text();
    stats.bytes += text.length;
    return JSON.parse(text);
  }

  let deepAsked = false;
  /** The 109 389: asked for once, after the naked-eye sky is up. Saving data waits for a zoom. */
  function askDeep() {
    if (deepAsked || disposed || !nakedEye) return;
    deepAsked = true;
    fetchBytes('../../data/stars3d.bin').then((buf) => {
      if (disposed) return;
      const maxNaked = nakedEye.mag[nakedEye.count - 1];
      setStars(joinStars(nakedEye, parseDeep(buf, maxNaked)));
      stats.deep = true;
    }).catch((e) => { deepAsked = false; console.warn('ground sky: the faint stars did not load', e); });
  }

  // ---- lines -----------------------------------------------------------------------------------
  const lineMaterial = (colour, opacity, useEq) => new THREE.ShaderMaterial({
    vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
    uniforms: {
      uEqToLocal: { value: eqToLocal },
      uUseEq: { value: useEq ? 1 : 0 },
      uAir: { value: 1 },
      uRadius: { value: R * 0.98 },
      uColour: { value: new THREE.Color(colour) },
      uOpacity: { value: opacity },
    },
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  });
  function lineObject(name, verts, colour, opacity, useEq, order = RO.lines) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const obj = new THREE.LineSegments(geo, lineMaterial(colour, opacity, useEq));
    obj.name = name;
    obj.frustumCulled = false;
    obj.renderOrder = order;
    obj.userData.opacity = opacity;
    root.add(obj);
    return obj;
  }
  const ringVerts = (fn, n) => {
    const v = [];
    for (let i = 0; i < n; i += 1) { v.push(...fn(i / n), ...fn((i + 1) / n)); }
    return v;
  };
  const lines = {};
  // The Sun's path: the ecliptic, in the catalogue's frame. sky/figures.js has the ring.
  lines.sunPath = lineObject('sky-sun-path', (() => {
    const pts = eclipticRing(180);
    const v = [];
    for (let i = 0; i < pts.length; i += 1) v.push(...pts[i], ...pts[(i + 1) % pts.length]);
    return v;
  })(), 0xffc98a, 0.5, true);
  lines.equator = lineObject('sky-equator', ringVerts((k) => radecDir(k * 360, 0), 180), 0x6ec3ff, 0.45, true);
  lines.starGrid = lineObject('sky-star-grid', (() => {
    const v = [];
    for (let ra = 0; ra < 360; ra += 30) for (let d = -80; d < 80; d += 4) v.push(...radecDir(ra, d), ...radecDir(ra, d + 4));
    for (let dec = -60; dec <= 60; dec += 30) { if (dec === 0) continue; v.push(...ringVerts((k) => radecDir(k * 360, dec), 120)); }
    return v;
  })(), 0x6ec3ff, 0.2, true);
  lines.grid = lineObject('sky-grid', (() => {
    const v = [];
    for (let az = 0; az < 360; az += 30) for (let h = 0; h < 88; h += 4) v.push(...localFromAltAz(az, h), ...localFromAltAz(az, Math.min(88, h + 4)));
    for (let alt = 15; alt <= 75; alt += 15) v.push(...ringVerts((k) => localFromAltAz(k * 360, alt), 120));
    return v;
  })(), 0x9aa4b2, 0.22, false);
  // The north-south line overhead, part of the grid: where everything is highest.
  lines.meridian = lineObject('sky-meridian', (() => {
    const v = [];
    for (let h = 0; h < 180; h += 3) {
      const a = h <= 90 ? [180, h] : [0, 180 - h];
      const b = h + 3 <= 90 ? [180, h + 3] : [0, 180 - (h + 3)];
      v.push(...localFromAltAz(a[0], a[1]), ...localFromAltAz(b[0], b[1]));
    }
    return v;
  })(), 0x9aa4b2, 0.4, false);
  lines.figures = null;
  let arc = null;

  // ---- the Milky Way ----------------------------------------------------------------------------
  let milkyWay = null;
  const galBasis = new THREE.Matrix3();
  {
    const gc = new THREE.Vector3(...radecDir(266.405, -28.936)); // galactic centre
    const pole = new THREE.Vector3(...radecDir(192.85948, 27.12825)); // galactic north pole
    const x = gc.clone().addScaledVector(pole, -gc.dot(pole)).normalize();
    const south = pole.clone().negate(); // the panorama's top is galactic south (scene/starfield.js)
    const z = new THREE.Vector3().crossVectors(x, south).normalize();
    galBasis.set(x.x, south.x, z.x, x.y, south.y, z.y, x.z, south.z, z.z);
  }
  function buildMilkyWay() {
    const map = ctx.starfield && ctx.starfield.state && ctx.starfield.state.milkyway && ctx.starfield.state.milkyway.material && ctx.starfield.state.milkyway.material.map;
    if (!map || milkyWay || disposed) return;
    const mat = new THREE.ShaderMaterial({
      vertexShader: MW_VERT, fragmentShader: MW_FRAG,
      uniforms: { uMap: { value: map }, uGain: { value: 0 }, uRot: { value: new THREE.Matrix3() }, uRadius: { value: R * 0.99 } },
      side: THREE.BackSide, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    });
    milkyWay = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
    milkyWay.name = 'ground-milkyway';
    milkyWay.frustumCulled = false;
    milkyWay.renderOrder = RO.milkyway;
    root.add(milkyWay);
  }

  // ---- the bodies -------------------------------------------------------------------------------
  const bodyUniforms = { ...starUniforms, uTwinkle: { value: 0 }, uEqToLocal: { value: eqToLocal } };
  const POINTS = BODIES.length + 4; // seven planets (the Sun and the Moon are never points) and four moons
  const bodyGeo = new THREE.BufferGeometry();
  bodyGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POINTS * 3), 3));
  bodyGeo.setAttribute('aColour', new THREE.BufferAttribute(new Float32Array(POINTS * 3).fill(1), 3));
  bodyGeo.setAttribute('aMag', new THREE.BufferAttribute(new Float32Array(POINTS).fill(99), 1));
  const bodyPoints = new THREE.Points(bodyGeo, pointMaterial(bodyUniforms));
  bodyPoints.name = 'ground-bodies';
  bodyPoints.frustumCulled = false;
  bodyPoints.renderOrder = RO.points;
  root.add(bodyPoints);

  const loader = typeof document !== 'undefined' ? new THREE.TextureLoader() : null;
  const discs = new Map();
  const quad = new THREE.PlaneGeometry(2, 2);
  for (const b of BODIES) {
    const look = LOOK[b.id];
    const mat = new THREE.ShaderMaterial({
      vertexShader: DISC_VERT, fragmentShader: DISC_FRAG,
      uniforms: {
        uCentre: { value: new THREE.Vector3() }, uRight: { value: new THREE.Vector3(1, 0, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) },
        uHalf: { value: 0 }, uExtent: { value: look.rings ? 2.4 : 1.08 }, uSquash: { value: 1 },
        uMap: { value: null }, uUseMap: { value: 0 }, uEmissive: { value: look.emissive || 0 }, uLimb: { value: look.limb || 0 },
        uRings: { value: look.rings ? 1 : 0 }, uOpacity: { value: 1 }, uCover: { value: 1 }, uGain: { value: 1 },
        uColour: { value: new THREE.Color().setRGB(look.colour[0], look.colour[1], look.colour[2], THREE.SRGBColorSpace) },
        uSun: { value: new THREE.Vector3(0, 0, 1) }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uBody: { value: new THREE.Matrix3() },
      },
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(quad, mat);
    mesh.name = `ground-${b.id}`;
    mesh.frustumCulled = false;
    mesh.renderOrder = RO.discs + (b.id === 'sun' ? 0 : 0.1);
    mesh.visible = false;
    root.add(mesh);
    discs.set(b.id, { mesh, look, mapAsked: false, view: null, apparent: null, diameterPx: 0 });
  }
  let bodiesAt = -Infinity;
  let moons = [];

  function solveBodies(tMs, fovDeg) {
    const every = fovDeg < 5 ? BODY_REFRESH_MS / 10 : BODY_REFRESH_MS;
    if (Math.abs(tMs - bodiesAt) < every) return;
    bodiesAt = tMs;
    const date = new Date(tMs);
    for (const b of BODIES) {
      const d = discs.get(b.id);
      d.view = bodyView(b.id, date, observerA);
    }
    moons = jupiterMoons(date, observerA);
  }

  const _f = new THREE.Vector3();
  const _x = new THREE.Vector3();
  const _y = new THREE.Vector3();
  const _z = new THREE.Vector3();
  const _v = new THREE.Vector3();
  const _bx = new THREE.Vector3();
  const _by = new THREE.Vector3();
  const _bz = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const toSquare = (v3, out) => out.set(v3.dot(_x), v3.dot(_y), v3.dot(_z));

  function placeBodies(frame, pxPerDeg) {
    const pos = bodyGeo.attributes.position;
    const mag = bodyGeo.attributes.aMag;
    const col = bodyGeo.attributes.aColour;
    let i = 0;
    for (const b of BODIES) {
      const d = discs.get(b.id);
      const view = d.view;
      const u = d.mesh.material.uniforms;
      if (!view) { d.mesh.visible = false; d.apparent = null; if (b.id !== 'sun' && b.id !== 'moon') { mag.array[i] = 99; i += 1; } continue; }
      const trueLocal = localOf(m9, view.dir);
      const aa = altAzOf(trueLocal);
      const altApp = aa.altDeg + refractionDeg(aa.altDeg);
      const l = localFromAltAz(aa.azDeg, altApp);
      d.apparent = { azDeg: aa.azDeg, altDeg: altApp, local: l };
      d.diameterPx = view.diameterDeg * pxPerDeg;
      const isLight = b.id === 'sun' || b.id === 'moon';
      // The point: a planet's, until its disc is wide enough to take over.
      if (!isLight) {
        pos.array[i * 3] = view.dir[0]; pos.array[i * 3 + 1] = view.dir[1]; pos.array[i * 3 + 2] = view.dir[2];
        const fade = Math.max(0, Math.min(1, (d.diameterPx - 3) / 5));
        mag.array[i] = view.mag + fade * 25;
        col.array[i * 3] = d.look.colour[0]; col.array[i * 3 + 1] = d.look.colour[1]; col.array[i * 3 + 2] = d.look.colour[2];
        i += 1;
      }
      // The disc. The Sun and the Moon are always one; a planet from two pixels up.
      const minPx = isLight ? 0 : 2;
      const show = altApp > -1.5 && d.diameterPx >= minPx;
      d.mesh.visible = show;
      if (!show) continue;
      _f.set(l[0], l[1], l[2]);
      _z.copy(_f).negate();
      _y.copy(UP).addScaledVector(_f, -UP.dot(_f)).normalize();
      _x.crossVectors(_y, _z).normalize();
      // Never thinner than a pixel and a half: the Moon in a wide field is still a visible Moon.
      const radiusDeg = Math.max(view.diameterDeg / 2, isLight ? 0.75 / pxPerDeg : 0);
      u.uCentre.value.copy(_f).multiplyScalar(R * 0.975);
      u.uRight.value.copy(_x);
      u.uUp.value.copy(_y);
      u.uHalf.value = R * 0.975 * Math.tan(radiusDeg * DEG) * u.uExtent.value;
      u.uSquash.value = flattening(aa.altDeg);
      toSquare(_v.set(...localOf(m9, view.toSun)), u.uSun.value).normalize();
      const fr = view.frame;
      const bx = toSquare(_v.set(...localOf(m9, fr.x)), _bx);
      const by = toSquare(_v.set(...localOf(m9, fr.y)), _by);
      const bz = toSquare(_v.set(...localOf(m9, fr.z)), _bz);
      u.uBody.value.set(bx.x, by.x, bz.x, bx.y, by.y, bz.y, bx.z, by.z, bz.z);
      const tint = extinctionTint(Math.max(0, altApp));
      const dim = Math.pow(10, -0.4 * EXT_K * (airmass(Math.max(0, altApp)) - 1));
      u.uTint.value.set(tint[0], tint[1], tint[2]);
      // The Sun through 38 air masses is a dull red ball you can look at; the model's dimming is
      // kept gentle for it so it does not vanish before it sets.
      u.uGain.value = b.id === 'sun' ? 0.55 + 0.45 * Math.sqrt(dim) : 0.35 + 0.65 * dim;
      u.uOpacity.value = isLight ? 1 : Math.max(0, Math.min(1, (d.diameterPx - 2) / 3));
      // Light is added to the sky. Only the Sun hides what is behind it: the unlit part of the
      // Moon is the colour of the sky it stands in, by day and by moonlight alike.
      u.uCover.value = b.id === 'sun' ? 1 : 0;
      if (!d.mapAsked && d.look.map && loader && d.diameterPx >= MAP_AT_PX) {
        d.mapAsked = true;
        loader.load(String(url(`../../textures/${d.look.map}`)), (tex) => {
          if (disposed) { tex.dispose(); return; }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          u.uMap.value = tex;
          u.uUseMap.value = 1;
        }, undefined, () => { d.mapAsked = false; });
      }
    }
    // Jupiter's moons: points beside the disc, shown from the moment the field could split them.
    const jup = discs.get('jupiter');
    for (const m of moons) {
      pos.array[i * 3] = m.dir[0]; pos.array[i * 3 + 1] = m.dir[1]; pos.array[i * 3 + 2] = m.dir[2];
      const splitPx = jup && jup.view ? m.offsetRadii * (jup.diameterPx / 2) : 0;
      mag.array[i] = m.hidden || splitPx < 5 ? 99 : m.mag;
      col.array[i * 3] = 1; col.array[i * 3 + 1] = 0.97; col.array[i * 3 + 2] = 0.9;
      i += 1;
    }
    for (; i < POINTS; i += 1) mag.array[i] = 99;
    pos.needsUpdate = true;
    mag.needsUpdate = true;
    col.needsUpdate = true;
  }

  // ---- names ------------------------------------------------------------------------------------
  const labels = { host: null, pool: [], fov: null, mark: null, cands: [], at: -Infinity, markUntil: 0, markDir: null };
  let conNames = [];
  let starNames = [];
  const passMarks = [];
  if (typeof document !== 'undefined') {
    const host = document.createElement('div');
    host.className = 'sr-skylabels';
    host.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < LABEL_POOL; i += 1) {
      const s = document.createElement('span');
      s.className = 'sr-skylabel';
      s.hidden = true;
      host.appendChild(s);
      labels.pool.push({ node: s, text: '', kind: '' });
    }
    labels.fov = document.createElement('div');
    labels.fov.className = 'sr-skyfov sr-num';
    host.appendChild(labels.fov);
    labels.mark = document.createElement('div');
    labels.mark.className = 'sr-skymark';
    labels.mark.hidden = true;
    host.appendChild(labels.mark);
    // In the scene labels' own layer (index.html #labels), so the panels, the veil and H treat them alike.
    (document.getElementById('labels') || document.body).appendChild(host);
    labels.host = host;
  }

  const _w = new THREE.Vector3();
  const _fwd = new THREE.Vector3();
  /** A local direction (already as the eye sees it) to screen pixels, or null when out of view. */
  function toScreen(l, camera, w, h) {
    _w.set(l[0], l[1], l[2]).applyQuaternion(group.quaternion);
    if (_w.dot(_fwd) <= 0.05) return null;
    _w.multiplyScalar(R).add(camera.position).project(camera);
    if (_w.x < -1.05 || _w.x > 1.05 || _w.y < -1.05 || _w.y > 1.05) return null;
    return { x: (_w.x * 0.5 + 0.5) * w, y: (-_w.y * 0.5 + 0.5) * h };
  }

  function starNameLimit(fovDeg) {
    if (fovDeg >= 90) return 1.2;
    if (fovDeg >= 50) return 1.8;
    if (fovDeg >= 25) return 2.8;
    if (fovDeg >= 8) return 4.2;
    return 6.5;
  }

  /** Which names are candidates now: bodies first, then stars by brightness, then the figures. */
  function gatherLabels(frame) {
    const out = [];
    const limit = starUniforms.uLimit.value;
    const B = COPY.sky.bodies || {};
    for (const b of BODIES) {
      const d = discs.get(b.id);
      if (!d.view || !d.apparent || d.apparent.altDeg < 0.3) continue;
      if (b.id !== 'sun' && b.id !== 'moon' && d.view.mag > limit + 0.3 && d.diameterPx < 3) continue;
      const off = Math.max(8, d.diameterPx / 2 * (d.look.rings ? 2.3 : 1) + 6);
      out.push({ kind: 'body', text: B[b.id] || b.body, local: d.apparent.local, pri: 1000 - d.view.mag, dy: off });
    }
    for (const m of passMarks) out.push({ kind: 'pass', text: m.text, local: localFromAltAz(m.azDeg, m.altDeg), pri: 900, dy: 10 });
    if (options.names) {
      const nameLimit = Math.min(starNameLimit(frame.fovDeg), limit - 0.5);
      for (const s of starNames) {
        if (s.mag > nameLimit) break;
        const l = localOf(m9, s.dir);
        if (l[1] < 0.03) continue;
        out.push({ kind: 'star', text: s.name, local: lift(l), pri: 500 - s.mag * 10, dy: 9 });
      }
      if (frame.fovDeg >= 20) {
        for (const c of conNames) {
          const l = localOf(m9, c.dir);
          if (l[1] < 0.1) continue;
          out.push({ kind: 'con', text: c.name, local: l, pri: 100, dy: 0 });
        }
      }
    }
    const L = COPY.sky.lines || {};
    const lineLabel = (on, text, ring) => {
      if (!on || !text) return;
      // Named once, where the line is 12 degrees up on the side it rises.
      let best = null;
      for (const p of ring) {
        const l = localOf(m9, p);
        const alt = Math.asin(l[1]) / DEG;
        if (l[0] <= 0 || alt < 4) continue;
        if (!best || Math.abs(alt - 12) < best.err) best = { err: Math.abs(alt - 12), l };
      }
      if (best) out.push({ kind: 'line', text, local: best.l, pri: 300, dy: 10 });
    };
    lineLabel(options.sunPath, L.sunPath, eclRing);
    lineLabel(options.equator, L.equator, eqRing);
    labels.cands = out.sort((a, b) => b.pri - a.pri);
  }
  const eclRing = eclipticRing(72);
  const eqRing = Array.from({ length: 72 }, (_, i) => radecDir(i * 5, 0));

  function paintLabels(frame, w, h) {
    if (!labels.host) return;
    const camera = frame.camera;
    camera.getWorldDirection(_fwd);
    const now = performance.now();
    if (now - labels.at > LABEL_REFRESH_MS) { labels.at = now; gatherLabels(frame); }
    // The field-of-view line has its place first; no name is drawn under it.
    const fovTop = labels.fov.offsetTop || 24;
    const placed = [{ x0: w / 2 - 110, x1: w / 2 + 110, y0: fovTop - 8, y1: fovTop + 26 }];
    const cap = w < 600 ? 16 : 30;
    let slot = 0;
    for (const c of labels.cands) {
      if (slot >= labels.pool.length || placed.length >= cap) break;
      const p = toScreen(c.local, camera, w, h);
      if (!p) continue;
      const tw = c.text.length * (c.kind === 'con' ? 8.2 : 7.2) + 8;
      const box = { x0: p.x - tw / 2, x1: p.x + tw / 2, y0: p.y + c.dy - 2, y1: p.y + c.dy + 18 };
      if (box.x0 < 4 || box.x1 > w - 4 || box.y1 > h - 4 || box.y0 < 4) continue;
      let clash = false;
      for (const q of placed) { if (box.x0 < q.x1 && box.x1 > q.x0 && box.y0 < q.y1 && box.y1 > q.y0) { clash = true; break; } }
      if (clash) continue;
      placed.push(box);
      const s = labels.pool[slot];
      slot += 1;
      if (s.text !== c.text) { s.node.textContent = c.text; s.text = c.text; }
      if (s.kind !== c.kind) { s.node.className = `sr-skylabel sr-skylabel--${c.kind}`; s.kind = c.kind; }
      s.node.hidden = false;
      s.node.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y + c.dy)}px) translateX(-50%)`;
    }
    for (; slot < labels.pool.length; slot += 1) if (!labels.pool[slot].node.hidden) labels.pool[slot].node.hidden = true;
    stats.labels = placed.length - 1;

    // The field of view, one mono line: the number is the hero (docs/ui-guide.md principle 4).
    const F = COPY.sky.fov || {};
    const name = (F.names || {})[fovName(frame.fovDeg)] || '';
    const text = frame.fovDeg >= 1
      ? t(F.degrees || '{deg}°', { deg: frame.fovDeg >= 10 ? Math.round(frame.fovDeg) : frame.fovDeg.toFixed(1), name })
      : t(F.arcmin || '{min}′', { min: Math.round(frame.fovDeg * 60), name });
    if (labels.fov.textContent !== text) labels.fov.textContent = text;

    // The mark: a ring on what "show me" turned to, for a few seconds.
    if (labels.markDir && now < labels.markUntil) {
      const p = toScreen(labels.markDir(), camera, w, h);
      labels.mark.hidden = !p;
      if (p) labels.mark.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -50%)`;
    } else if (!labels.mark.hidden) {
      labels.mark.hidden = true;
      labels.markDir = null;
    }
  }

  // ---- data -------------------------------------------------------------------------------------
  const ready = (async () => {
    const jobs = [
      fetchBytes('../../data/stars.bin').then((buf) => { nakedEye = parseNakedEye(buf); if (!stats.deep) setStars(nakedEye); }),
      fetchJson('../../data/constellations.lines.json').then((json) => {
        if (disposed || !json || !Array.isArray(json.features)) return;
        const v = [];
        for (const f of json.features) {
          const g = f && f.geometry;
          const multi = !g ? [] : g.type === 'MultiLineString' ? g.coordinates : g.type === 'LineString' ? [g.coordinates] : [];
          for (const line of multi) for (let i = 0; i + 1 < line.length; i += 1) v.push(...radecDir(line[i][0], line[i][1]), ...radecDir(line[i + 1][0], line[i + 1][1]));
        }
        lines.figures = lineObject('sky-figures', v, 0x9aa4b2, 0.34, true);
      }),
      fetchJson('../../data/constellation-names.json').then((rows) => {
        if (!Array.isArray(rows)) return;
        conNames = rows.filter((r) => r && typeof r.ra === 'number').map((r) => ({ name: r.name, dir: radecDir(r.ra, r.dec) }));
      }),
    ];
    await Promise.allSettled(jobs);
    buildMilkyWay();
    // The names of the stars and the faint stars come after the first sky is on screen.
    const later = () => {
      if (disposed) return;
      fetchJson('../../data/stars3d.names.json').then((json) => {
        const rows = (json && json.rows) || [];
        const out = [];
        for (const r of rows) {
          const proper = r[1];
          const mag = r[7];
          if (!proper || !(mag <= 6.5)) continue;
          const n = Math.hypot(r[9], r[10], r[11]);
          if (!(n > 0)) continue;
          out.push({ name: proper, mag, dir: eclToEq([r[9] / n, r[10] / n, r[11] / n]) });
        }
        starNames = out.sort((a, b) => a.mag - b.mag);
      }).catch(() => {});
      const saving = typeof navigator !== 'undefined' && navigator.connection && navigator.connection.saveData;
      if (!saving) askDeep();
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(later, { timeout: 1500 });
    else setTimeout(later, 300);
    return stats;
  })();

  // ---- per frame --------------------------------------------------------------------------------
  function update(frame) {
    if (disposed) return;
    const date = new Date(frame.tMs);
    m9 = eqjToLocal(date, observerA);
    eqToLocal.set(m9[0], m9[1], m9[2], m9[3], m9[4], m9[5], m9[6], m9[7], m9[8]);

    const size = frame.renderer && frame.renderer.domElement ? frame.renderer.domElement : null;
    const w = (size && size.clientWidth) || (typeof innerWidth === 'number' ? innerWidth : 1280);
    const h = (size && size.clientHeight) || (typeof innerHeight === 'number' ? innerHeight : 800);
    const dpr = frame.renderer && frame.renderer.getPixelRatio ? Math.min(2, frame.renderer.getPixelRatio()) : 1;
    const pxPerDeg = pixelsPerDegree(frame.fovDeg, h);
    const sky = DARKNESS[options.darkness] || DARKNESS[DEFAULT_DARKNESS];
    const limit = limitingMagnitude({ fovDeg: frame.fovDeg, darkness: options.darkness, sunAltDeg: frame.sunAltDeg, moon: frame.moonBright });
    stats.limit = limit;
    starUniforms.uLimit.value = limit;
    starUniforms.uPx.value = dpr;
    starUniforms.uTime.value = (performance.now() / 1000) % 3600;
    if (stars) {
      const n = countBrighter(stars.mag, limit + 0.6);
      stars.points.geometry.setDrawRange(0, n);
      stats.drawn = n;
    }
    if (!deepAsked && frame.fovDeg < 40) askDeep();

    // How much of a night it is: 1 once the Sun is 16 degrees down, 0 from 8 degrees down.
    const night = Math.max(0, Math.min(1, (-8 - frame.sunAltDeg) / 8));
    if (!milkyWay) buildMilkyWay();
    if (milkyWay) {
      const u = milkyWay.material.uniforms;
      u.uRot.value.copy(eqToLocal).multiply(galBasis);
      const exposure = ctx.exposure && typeof ctx.exposure.look === 'function' ? (ctx.exposure.look().milkyWay || 1) : 1;
      // A 2k panorama is a wash once the field is a few degrees: it leaves as the field closes.
      const wide = Math.max(0, Math.min(1, (frame.fovDeg - 4) / 16));
      u.uGain.value = MILKY_WAY_GAIN * exposure * sky.milkyWay * night * (1 - 0.85 * frame.moonBright) * wide;
      milkyWay.visible = u.uGain.value > 0.004;
    }

    // Lines go with the stars they join: faint in twilight, a trace by day.
    const lineNight = Math.max(0.15, Math.min(1, (-4 - frame.sunAltDeg) / 10));
    const setLine = (obj, on) => {
      if (!obj) return;
      obj.visible = !!on;
      obj.material.uniforms.uOpacity.value = obj.userData.opacity * lineNight;
    };
    setLine(lines.figures, options.figures);
    setLine(lines.sunPath, options.sunPath);
    setLine(lines.equator, options.equator);
    setLine(lines.starGrid, options.starGrid);
    setLine(lines.grid, options.grid);
    setLine(lines.meridian, options.grid);

    solveBodies(frame.tMs, frame.fovDeg);
    placeBodies(frame, pxPerDeg);
    paintLabels(frame, w, h);
  }

  return {
    ready,
    update,
    setOptions(o) {
      Object.assign(options, o || {});
      labels.at = -Infinity;
    },
    /** Where a body is as the eye sees it: {azDeg, altDeg} with the air's lift, or null. */
    apparentOf(id) {
      const d = discs.get(id);
      if (!d) return null;
      return d.apparent ? { azDeg: d.apparent.azDeg, altDeg: d.apparent.altDeg, diameterDeg: d.view.diameterDeg, mag: d.view.mag } : null;
    },
    /** A pass across the sky: `track` [{azDeg, altDeg, lit}], `marks` [{azDeg, altDeg, text}]. */
    showPass(track, marks) {
      this.clearPass();
      if (!Array.isArray(track) || track.length < 2) return;
      const lit = [];
      const dark = [];
      for (let i = 0; i + 1 < track.length; i += 1) {
        const a = track[i];
        const b = track[i + 1];
        (a.lit && b.lit ? lit : dark).push(...localFromAltAz(a.azDeg, a.altDeg), ...localFromAltAz(b.azDeg, b.altDeg));
      }
      arc = [];
      if (lit.length) arc.push(lineObject('sky-pass-lit', lit, 0xe8ecf2, 0.9, false, RO.arc));
      if (dark.length) arc.push(lineObject('sky-pass-shadow', dark, 0x9aa4b2, 0.4, false, RO.arc));
      for (const m of marks || []) passMarks.push(m);
      labels.at = -Infinity;
    },
    clearPass() {
      for (const o of arc || []) { o.geometry.dispose(); o.material.dispose(); root.remove(o); }
      arc = null;
      passMarks.length = 0;
      labels.at = -Infinity;
    },
    /** Ring a point of the sky for a few seconds. `dir` is a function so a moving thing stays ringed. */
    mark(dir, ms = 6000) {
      labels.markDir = typeof dir === 'function' ? dir : () => dir;
      labels.markUntil = performance.now() + ms;
    },
    stats: () => ({ ...stats }),
    dispose() {
      disposed = true;
      root.traverse((o) => {
        if (o.geometry && o.geometry !== quad) o.geometry.dispose();
        if (o.material) {
          const map = o.material.uniforms && o.material.uniforms.uMap && o.material.uniforms.uMap.value;
          // The Milky Way's map is the scene's; a body's map is this layer's own.
          if (map && o !== milkyWay) map.dispose();
          o.material.dispose();
        }
      });
      quad.dispose();
      group.remove(root);
      if (labels.host) labels.host.remove();
    },
  };
}
