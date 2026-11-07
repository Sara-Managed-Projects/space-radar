// scene/groundstage.js -- standing on another world: the ground at a landing site and the sky above it
// (release 2.0.0 batch f7-ground, forge #146 and #147).
//
// Contract: boot(ctx) -> stage (main.js's whole wiring: one line fetches this module on a `ground=` or `sky=` link)
//           createGroundStage(ctx, { scene, clock, write, note }) -> { open(spec), close(), render(tMs), fromLink(keys, o),
//             look(v), active, state(), dispose() }
//   spec: { ground: 'apollo-15' } (stand and walk at a site with a terrain model) or { sky: 'mars:jezero' } (stand
//         anywhere on the Moon, Mars, Titan or Europa and look up; a site with a terrain model stands on it).
//   write(patch) is ui/urlstate.js write (the stage keeps `ground` and `sky` in the address); note(line, deadKeys) the
//   scene note for a link that names no place this stage knows. boot() wires both, listens to the address itself, and
//   draws the stage from the map scene's onAfterRender while it is up, so the boot graph carries one line for all of it
//   (main.js) and the two URL keys (ui/urlstate.js), and none of its logic.
//
// `#ground=apollo-15` and `#sky=mars:jezero` open it; ui/urlstate.js carries both keys. Fetched by main.js on one of
// those links (or a trip stop that asks for one), never at boot; css/ground.css is linked here.
//
// HOW IT DRAWS, as scene/exostage.js does: the app's renderer, a scene and a camera of its own. While the stage is up
// the map's scene is hidden and main.js calls render() here after its own, so nothing of the Solar System is drawn
// or paid for. Units are METRES in the frame of scripts/build-ground.py and scene/groundmath.js: x east, y up, z south,
// the lander at the origin. That is also sky/worldframe.js's local frame, so a J2000 direction turned by
// worldEqjToLocal() is a direction in this scene with nothing more done to it.
//
// WHAT IS ON SCREEN, AND WHAT KIND OF THING IT IS (the honesty lines under the title say the same):
//   the ground      MEASURED. The heights are the stereo terrain model's (LROC NAC on the Moon, HiRISE on Mars), at
//                   their true vertical scale, the world's curvature included, 2 km square round the lander, and the
//                   global model's (SLDEM2015, MOLA) out to 30 km. Its brightness is the orbiter's picture (its own
//                   shadows are in it, from the Sun of the day it was taken); on Mars that grey is multiplied by the
//                   ground's measured colour (registry/ground.yaml `tint`). No boulder or crater is added.
//   the lander      the model file of registry/models.yaml at the site's coordinates, standing on the ground there;
//                   which way it faces is not from an image (illustrative).
//   the light       COMPUTED for the app's clock: the Sun where sky/worldframe.js puts it, shadows cast by the ground
//                   and the lander (a shadow map round the visitor), and the whole site in shadow when the Sun is
//                   behind the far skyline (groundmath.js horizonProfile).
//   the sky         stars from data/stars.bin, the Sun, the planets, the Earth with its phase, Phobos and Deimos,
//                   all COMPUTED (sky/worldframe.js); the sky's colour from sky/worldair.js, which says which colours
//                   are measured. Discs are the right size and phase, plain colours, not maps.
//
// PHONES FIRST. WebGL only; the near ground is drawn every 2nd post on a laptop and every 4th on tier 0 (65 000
// vertices), its shadow map is 1024 there. Touch: a joystick bottom left walks, a drag elsewhere looks, a pinch
// zooms. Keyboard: WASD or the arrows, Q and E (or the arrows with Alt) to turn, R and F to look up and down,
// Shift to run, + and - to zoom, Escape to leave. Reduced motion: no easing anywhere; a key turns in 15 degree steps.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t as say } from '../copy/en.js';
import { read as readUrlKeys, write as writeUrlKeys, clear as clearUrlKeys } from '../ui/urlstate.js';
import '../copy/en.ground.js';
import { SITES } from '../data/sites.js';
import { bvToKelvin, kelvinToRgb } from './starfield.js';
import {
  decodeHeights, groundHeight, groundNormal, tangentXZ, joystick, stepWalker, horizonProfile, horizonAt, sunlitShare,
  parseGroundLink, EYE_M, SPEEDS, ROVER_TOP_MS,
} from './groundmath.js';
import {
  SKY_WORLDS, worldEqjToLocal, worldBodyView, observerHelioEqjKm, skyTargets, poleStar, localSolarHours, nextRiseSet,
  transits, parseSkyLink, toLocal, altAz,
} from '../sky/worldframe.js';
import { skyLook, srgbToLinear } from '../sky/worldair.js';

const DEG = Math.PI / 180;
const SKY_R = 150000; // metres: the dome and the stars, inside the camera's far plane
const BODY_REFRESH_MS = 400; // of the wall clock: the bodies are re-solved this often while the clock runs
const DISC_COLOURS = {
  earth: [0.32, 0.45, 0.78], moon: [0.55, 0.55, 0.55], phobos: [0.26, 0.23, 0.21], deimos: [0.3, 0.27, 0.24],
  jupiter: [0.86, 0.76, 0.6], saturn: [0.86, 0.79, 0.62], io: [0.85, 0.8, 0.45], ganymede: [0.6, 0.57, 0.52], callisto: [0.4, 0.37, 0.33],
  sun: [1, 0.98, 0.94],
};
/** Catalogue stars a sky draws itself, by world: the J2000 direction from the Sun and a radius (degrees). */
const HIDE_FROM = {
  'proxima-b': { dir: [Math.cos(-60.834 * Math.PI / 180) * Math.cos(219.902 * Math.PI / 180), Math.cos(-60.834 * Math.PI / 180) * Math.sin(219.902 * Math.PI / 180), Math.sin(-60.834 * Math.PI / 180)], deg: 0.3 },
};
/** A body is a disc once it is this wide (degrees); smaller, a point of its magnitude. */
const DISC_FROM_DEG = 0.05;

function linkCss(doc) {
  try {
    const href = new URL('../../css/ground.css', import.meta.url).href;
    if ([...doc.querySelectorAll('link[rel=stylesheet]')].some((l) => l.href === href)) return;
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    doc.head.appendChild(link);
  } catch { /* a test's document */ }
}

function el(doc, tag, cls, text) {
  const node = doc.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

const dataUrl = (path) => new URL(`../../data/${path}`, import.meta.url).href;

async function fetchBytes(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function reducedMotion() {
  try { return !!(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

function pad2(n) { return String(n).padStart(2, '0'); }
function hhmm(hours) {
  if (!Number.isFinite(hours)) return '';
  const m = Math.round(hours * 60) % 1440;
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}
function utcWords(tMs) {
  const d = new Date(tMs);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}

// ------------------------------------------------------------------------------------------------ shaders

const DOME_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const DOME_FRAG = /* glsl */ `
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 glow;
uniform vec3 sunDir;
uniform float glowDeg;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float up = clamp(d.y, 0.0, 1.0);
  vec3 c = mix(horizon, zenith, pow(up, 0.45));
  float ang = degrees(acos(clamp(dot(d, sunDir), -1.0, 1.0)));
  c += glow * (glowDeg > 0.0 ? exp(-ang / max(glowDeg, 1.0)) : 0.0);
  c *= d.y < 0.0 ? 0.6 : 1.0;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;
const STAR_VERT = /* glsl */ `
attribute float mag;
attribute vec3 tint;
uniform float limit;
uniform float pxScale;
uniform vec3 hideDir;   // a catalogue star this sky draws itself (Alpha Centauri, from Proxima): not drawn twice
uniform float hideCos;
varying vec3 vTint;
varying float vAlpha;
void main() {
  float b = pow(10.0, -0.4 * (mag - limit));
  vAlpha = dot(normalize(position), hideDir) > hideCos ? 0.0 : clamp(b, 0.0, 1.0);
  vTint = tint;
  gl_PointSize = clamp(1.4 + 2.2 * log(1.0 + b) , 1.0, 9.0) * pxScale;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const STAR_FRAG = /* glsl */ `
uniform float visible;
varying vec3 vTint;
varying float vAlpha;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float a = vAlpha * visible * (1.0 - r) ;
  gl_FragColor = vec4(vTint * a, 1.0);
  #include <colorspace_fragment>
}`;
const DISC_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const DISC_FRAG = /* glsl */ `
uniform vec3 colour;
uniform vec3 lightView;   // the direction to the Sun from the body, in the disc's own frame (x right, y up, z to the eye)
uniform float glowK;      // the Sun: a soft corona round the disc
uniform float alpha;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  if (glowK > 0.0) {
    float core = smoothstep(0.52, 0.48, r);
    float halo = exp(-max(r - 0.5, 0.0) * 6.0) * 0.6 * glowK * (1.0 - smoothstep(0.7, 1.0, r));
    gl_FragColor = vec4(colour * (core * 6.0 + halo) * alpha, 1.0);
  } else {
    if (r > 1.0) discard;
    vec3 n = vec3(vUv, sqrt(max(0.0, 1.0 - r * r)));
    float lit = max(dot(n, normalize(lightView)), 0.0);
    float edge = smoothstep(1.0, 0.94, r);
    gl_FragColor = vec4(colour * (0.02 + 1.1 * lit) * edge * alpha, 1.0);
  }
  #include <colorspace_fragment>
}`;

// ------------------------------------------------------------------------------------------------ the stage

export function createGroundStage(ctx, opts = {}) {
  const renderer = ctx.renderer;
  const doc = typeof document !== 'undefined' ? document : null;
  const clock = opts.clock || null;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.08, 400000);
  const size = new THREE.Vector2();
  const L = () => COPY.ground;

  let active = false;
  let place = null; // { world, latDeg, lonDeg, name, groundId, manifest }
  let mode = 'walk';
  let ground = null; // { near, far, meshes: [], model, profile, limitM }
  let walker = { x: 0, z: 0, yawDeg: 0, pitchDeg: 0 };
  let fovDeg = 62;
  let lastReal = 0;
  let lastBodies = -Infinity;
  let lastClock = NaN;
  let bodies = [];
  let starsLoaded = null;
  let names = [];
  let pole = null;
  let ui = null;
  let opening = null;
  let savedShadow = null;
  let disposed = false;
  let panelOpen = false;
  const folds = { card: false, panel: false };
  let pending = null; // { want, p }: an opening under way
  let writing = true; // a trip's stop opens the stage without touching the address (ui/trip.js)
  let events = null;
  const input = { keys: new Set(), stick: { x: 0, y: 0 }, look: { dx: 0, dy: 0 } };

  // --- the sky: dome, stars, planets as points, discs ---------------------------------------------------------
  const skyGroup = new THREE.Group(); // turned by worldEqjToLocal each frame: J2000 inside, local outside
  const domeMat = new THREE.ShaderMaterial({
    vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, side: THREE.BackSide, depthTest: false, depthWrite: false,
    uniforms: { zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, glow: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, glowDeg: { value: 10 } },
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(SKY_R * 1.05, 48, 24), domeMat);
  dome.renderOrder = -20;
  dome.frustumCulled = false;
  scene.add(dome);
  const starMat = new THREE.ShaderMaterial({
    vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { limit: { value: 6.0 }, pxScale: { value: 1 }, visible: { value: 1 }, hideDir: { value: new THREE.Vector3(0, 0, 1) }, hideCos: { value: 2 } },
  });
  let stars = null;
  const planetGeo = new THREE.BufferGeometry();
  // The bodies' points share the stars' shader and look, not their hidden star (they are in the local frame).
  const planetMat = starMat.clone();
  planetMat.uniforms = { ...starMat.uniforms, hideCos: { value: 2 }, hideDir: { value: new THREE.Vector3(0, 0, 1) } };
  const planetPoints = new THREE.Points(planetGeo, planetMat);
  planetPoints.renderOrder = -18;
  planetPoints.frustumCulled = false;
  scene.add(planetPoints);
  scene.add(skyGroup);
  const discs = new Map(); // id -> mesh

  // --- light ----------------------------------------------------------------------------------------------------
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  const shadowCam = sun.shadow.camera;
  shadowCam.left = -260; shadowCam.right = 260; shadowCam.top = 260; shadowCam.bottom = -260;
  shadowCam.near = 10; shadowCam.far = 4000;
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.HemisphereLight(0x000000, 0x000000, 1);
  scene.add(fill);
  // THE HAZE (modelled): Mars's dust and Titan's smog fade the far ground into the horizon's colour, as every rover
  // picture of a distant rim shows. A fog of the sky's horizon colour, thinning to nothing on an airless world.
  const HAZE_KM = { mars: 55, titan: 6, earth: 120 };
  const haze = new THREE.Fog(0x000000, 1500, 60000);

  function tier() { return ctx.quality && Number.isFinite(ctx.quality.tier) ? ctx.quality.tier : 1; }

  // --- stars ----------------------------------------------------------------------------------------------------
  function loadStars() {
    if (starsLoaded) return starsLoaded;
    starsLoaded = Promise.all([
      fetchBytes(dataUrl('stars.bin')),
      fetch(dataUrl('skystars.names.json')).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([bytes, json]) => {
      // data/stars.bin: ra, dec, mag, B-V as four floats a star (sky/groundsky.js parseNakedEye reads the same file).
      const f = new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4));
      const n = Math.floor(f.length / 4);
      const pos = new Float32Array(n * 3), mag = new Float32Array(n), tint = new Float32Array(n * 3);
      const c = new THREE.Color();
      for (let i = 0; i < n; i += 1) {
        const ra = f[i * 4] * DEG, dec = f[i * 4 + 1] * DEG;
        pos[i * 3] = Math.cos(dec) * Math.cos(ra); pos[i * 3 + 1] = Math.cos(dec) * Math.sin(ra); pos[i * 3 + 2] = Math.sin(dec);
        mag[i] = f[i * 4 + 2];
        const rgb = kelvinToRgb(bvToKelvin(Number.isFinite(f[i * 4 + 3]) ? f[i * 4 + 3] : 0.6));
        c.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
        tint[i * 3] = c.r; tint[i * 3 + 1] = c.g; tint[i * 3 + 2] = c.b;
      }
      const geo = new THREE.BufferGeometry();
      const far = new Float32Array(pos.length);
      for (let i = 0; i < pos.length; i += 1) far[i] = pos[i] * SKY_R;
      geo.setAttribute('position', new THREE.BufferAttribute(far, 3));
      geo.setAttribute('mag', new THREE.BufferAttribute(mag, 1));
      geo.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
      stars = new THREE.Points(geo, starMat);
      stars.renderOrder = -19;
      stars.frustumCulled = false;
      skyGroup.add(stars);
      const D = (a, d) => [Math.cos(d * DEG) * Math.cos(a * DEG), Math.cos(d * DEG) * Math.sin(a * DEG), Math.sin(d * DEG)];
      names = ((json && json.rows) || []).filter((r) => r && r[0] && Number.isFinite(r[3])).map((r) => ({ name: r[0], mag: r[3], dir: D(r[1], r[2]) }));
      return { pos, mag };
    }).catch((e) => { console.warn('the stars did not load', e); return null; });
    return starsLoaded;
  }

  // --- the ground -----------------------------------------------------------------------------------------------
  function gridFrom(bands, size, step) {
    const h = new Float32Array(size * size);
    let o = 0;
    for (const b of bands) { h.set(b, o); o += b.length; }
    return { size, step, h };
  }

  function texture(url, onReady) {
    const tex = new THREE.TextureLoader().load(url, onReady);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false; // row 0 of the picture is the north edge, which is v = 0 here
    tex.anisotropy = tier() >= 1 ? 8 : 2;
    return tex;
  }

  /** A patch of a grid as a mesh: posts r0..r1, c0..c1 every `stride`, normals from the full grid, uv over the patch. */
  function patch(grid, r0, r1, c0, c1, stride, skipCell) {
    const half = (grid.size - 1) / 2;
    const rows = Math.floor((r1 - r0) / stride) + 1;
    const cols = Math.floor((c1 - c0) / stride) + 1;
    const pos = new Float32Array(rows * cols * 3), nor = new Float32Array(rows * cols * 3), uv = new Float32Array(rows * cols * 2);
    const H = grid.h, S = grid.size;
    const at = (r, c) => H[Math.min(S - 1, Math.max(0, r)) * S + Math.min(S - 1, Math.max(0, c))];
    let k = 0;
    for (let i = 0; i < rows; i += 1) {
      const r = r0 + i * stride;
      for (let j = 0; j < cols; j += 1) {
        const c = c0 + j * stride;
        let h = at(r, c);
        if (!Number.isFinite(h)) h = 0;
        pos[k * 3] = (c - half) * grid.step; pos[k * 3 + 1] = h; pos[k * 3 + 2] = (r - half) * grid.step;
        const hx = at(r, c + 1) - at(r, c - 1), hz = at(r + 1, c) - at(r - 1, c);
        const nx = Number.isFinite(hx) ? -hx / (2 * grid.step) : 0, nz = Number.isFinite(hz) ? -hz / (2 * grid.step) : 0;
        const len = Math.hypot(nx, 1, nz);
        nor[k * 3] = nx / len; nor[k * 3 + 1] = 1 / len; nor[k * 3 + 2] = nz / len;
        uv[k * 2] = (c - c0) / (c1 - c0); uv[k * 2 + 1] = (r - r0) / (r1 - r0);
        k += 1;
      }
    }
    const index = [];
    for (let i = 0; i < rows - 1; i += 1) {
      for (let j = 0; j < cols - 1; j += 1) {
        const r = r0 + i * stride, c = c0 + j * stride;
        if (skipCell && skipCell(r, c, stride)) continue;
        if (!Number.isFinite(at(r, c)) || !Number.isFinite(at(r + stride, c + stride))) continue;
        const a = i * cols + j, b = a + 1, d = a + cols, e = d + 1;
        index.push(a, d, b, b, d, e);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(index);
    geo.computeBoundingSphere();
    return geo;
  }

  function groundMaterial(map, tint) {
    // A grey orthoimage of mean brightness about 128 (build-ground.py's stretch), multiplied so the mean ground is the
    // site's measured colour (registry/ground.yaml `tint`); the Moon's stays grey.
    const m = new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 });
    if (Array.isArray(tint)) {
      const lin = srgbToLinear(tint);
      const grey = srgbToLinear([128, 128, 128])[0];
      m.color.setRGB(lin[0] / grey, lin[1] / grey, lin[2] / grey);
    }
    return m;
  }

  async function buildGround(manifest) {
    const base = `ground/${manifest.id}/`;
    const near = manifest.near, far = manifest.far;
    const [nearBands, farBytes] = await Promise.all([
      Promise.all(near.files.map((f) => fetchBytes(dataUrl(base + f)).then(inflate).then((b) => decodeHeights(b, near.size, near.min, near.q)))),
      fetchBytes(dataUrl(base + far.file)).then(inflate).then((b) => decodeHeights(b, far.size, far.min, far.q)),
    ]);
    const nearGrid = gridFrom(nearBands, near.size, near.stepM);
    const farGrid = { size: far.size, step: far.stepM, h: farBytes };
    const meshes = [];
    const t = tier();
    const stride = t <= 0 ? 4 : 2;
    const halfPosts = (near.size - 1) / 2;
    const q = Math.floor(near.size / 2);
    // The near ground: four quarters, one orthoimage tile each.
    const quarters = [[0, 0], [0, 1], [1, 0], [1, 1]];
    quarters.forEach(([qr, qc], k) => {
      const r0 = qr * q, c0 = qc * q;
      const r1 = Math.min(near.size - 1, r0 + q), c1 = Math.min(near.size - 1, c0 + q);
      const geo = patch(nearGrid, r0, r1, c0, c1, stride);
      const mesh = new THREE.Mesh(geo, groundMaterial(texture(dataUrl(base + manifest.orthoNear.files[k])), manifest.tint));
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      meshes.push(mesh);
    });
    // The far ground, with a hole where the near ground is (a far cell wholly inside it is not drawn), lowered a
    // decimetre so the two never fight where the hole's edge meets the near ground's.
    const nearHalfM = halfPosts * near.stepM;
    const fHalf = (far.size - 1) / 2;
    const skip = (r, c, s) => {
      const x0 = (c - fHalf) * far.stepM, x1 = (c + s - fHalf) * far.stepM;
      const z0 = (r - fHalf) * far.stepM, z1 = (r + s - fHalf) * far.stepM;
      return x0 > -nearHalfM && x1 < nearHalfM && z0 > -nearHalfM && z1 < nearHalfM;
    };
    const farGeo = patch(farGrid, 0, far.size - 1, 0, far.size - 1, t <= 0 ? 2 : 1, skip);
    const farMesh = new THREE.Mesh(farGeo, groundMaterial(texture(dataUrl(base + manifest.orthoFar.file)), manifest.tint));
    farMesh.position.y = -0.1;
    farMesh.receiveShadow = true;
    meshes.push(farMesh);
    // A skirt round the near ground, four metres down, so no crack shows between the two grids.
    const skirtPts = [];
    const edge = (r, c) => [(c - halfPosts) * near.stepM, groundHeight(nearGrid, null, (c - halfPosts) * near.stepM, (r - halfPosts) * near.stepM), (r - halfPosts) * near.stepM];
    const ring = [];
    for (let c = 0; c < near.size; c += stride) ring.push(edge(0, c));
    for (let r = 0; r < near.size; r += stride) ring.push(edge(r, near.size - 1));
    for (let c = near.size - 1; c >= 0; c -= stride) ring.push(edge(near.size - 1, c));
    for (let r = near.size - 1; r >= 0; r -= stride) ring.push(edge(r, 0));
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      if (!Number.isFinite(a[1]) || !Number.isFinite(b[1])) continue;
      skirtPts.push(a[0], a[1], a[2], b[0], b[1], b[2], a[0], a[1] - 4, a[2], b[0], b[1], b[2], b[0], b[1] - 4, b[2], a[0], a[1] - 4, a[2]);
    }
    const skirtGeo = new THREE.BufferGeometry();
    skirtGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(skirtPts), 3));
    skirtGeo.computeVertexNormals();
    const skirt = new THREE.Mesh(skirtGeo, new THREE.MeshStandardMaterial({ color: 0x3a3330, roughness: 1, side: THREE.DoubleSide }));
    meshes.push(skirt);
    for (const m of meshes) scene.add(m);
    const g = { near: nearGrid, far: farGrid, meshes, limitM: nearHalfM - 4, model: null, modelOffset: [0, 0], profile: null, manifest };
    g.profile = horizonProfile(farGrid, 0, 0, EYE_M, 360, nearGrid);
    drawTraverse(g);
    return g;
  }

  /** The rover's documented path on the ground (data/traverses.js), where the site has one. */
  async function drawTraverse(g) {
    try {
      const { TRAVERSES } = await import('../data/traverses.js');
      const rows = (TRAVERSES || []).filter((t) => t && t.site === g.manifest.site);
      for (const row of rows) {
        for (const path of row.paths || []) {
          const pts = [];
          for (const [lon, lat] of path) {
            const [x, z] = tangentXZ(lat, lon, g.manifest.latDeg, g.manifest.lonDeg, g.manifest.radiusKm);
            const h = groundHeight(g.near, g.far, x, z);
            if (Number.isFinite(h)) pts.push(x, h + 0.08, z);
          }
          if (pts.length < 6) continue;
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
          const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffcf7a, transparent: true, opacity: 0.85 }));
          g.meshes.push(line);
          if (ground === g) scene.add(line);
        }
      }
    } catch (e) { console.warn('the traverse did not load', e); }
  }

  async function placeModel(g) {
    const spec = g.manifest.model;
    if (!spec || !spec.file) return;
    try {
      const { loadRealModel } = await import('./realmodels.js');
      const obj = await loadRealModel({ file: spec.file }, { keepMaterials: true });
      if (!obj || ground !== g) return;
      const model = obj.clone(true);
      // Only what is still there: the ascent stages left; their descent stages stand where they landed.
      if (spec.hide) for (const name of spec.hide) { const n = model.getObjectByName(name); if (n) n.visible = false; }
      const units = obj.userData.sourceSizeUnits || 1;
      model.scale.setScalar(spec.size_m ? spec.size_m : units * (spec.metres_per_unit || 1));
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      // Stood on its lowest point: the box after scaling, lifted so its floor meets the ground under it.
      model.position.set(0, 0, 0);
      model.rotation.y = -(spec.heading_deg || 0) * DEG;
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const floor = groundHeight(g.near, g.far, 0, 0);
      model.position.y = (Number.isFinite(floor) ? floor : 0) - box.min.y;
      model.userData.lift = model.position.y - (Number.isFinite(floor) ? floor : 0);
      g.model = model;
      scene.add(model);
      paintUi();
    } catch (e) { console.warn('the lander did not load', e); }
  }

  function clearGround() {
    if (!ground) return;
    for (const m of ground.meshes) {
      scene.remove(m);
      m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) { if (mat.map) mat.map.dispose(); mat.dispose(); }
    }
    if (ground.model) scene.remove(ground.model);
    ground = null;
  }

  // The pole star, with its direction and its name when the names file has a star within a tenth of a degree of it.
  function poleWithName(p, s) {
    if (!p || !s) return null;
    const dir = [s.pos[p.index * 3], s.pos[p.index * 3 + 1], s.pos[p.index * 3 + 2]];
    const near = names.find((row) => row.dir[0] * dir[0] + row.dir[1] * dir[1] + row.dir[2] * dir[2] > Math.cos(0.1 * DEG));
    return { ...p, dir, name: near ? near.name : null };
  }

  // --- opening --------------------------------------------------------------------------------------------------
  let indexP = null;
  function groundIndex() {
    if (!indexP) indexP = fetch(dataUrl('ground/index.json')).then((r) => (r.ok ? r.json() : { grounds: [] })).catch(() => ({ grounds: [] }));
    return indexP;
  }

  async function resolve(spec) {
    if (spec.ground) {
      const id = parseGroundLink(spec.ground);
      const idx = await groundIndex();
      const row = id && (idx.grounds || []).find((g) => g.id === id || g.site === id);
      if (!row) return null;
      const manifest = await fetch(dataUrl(`ground/${row.id}/site.json`)).then((r) => r.json());
      return { world: manifest.world, latDeg: manifest.latDeg, lonDeg: manifest.lonDeg, name: row.name, groundId: row.id, manifest, link: { ground: row.id } };
    }
    const p = parseSkyLink(spec.sky);
    if (!p) return null;
    let latDeg = p.latDeg, lonDeg = p.lonDeg, name = null, siteId = null;
    if (p.site) {
      const s = SITES.find((r) => r.id === p.site && r.world === p.world);
      if (!s) return null;
      latDeg = s.lat; lonDeg = ((s.lon % 360) + 360) % 360; name = s.display; siteId = s.id;
    }
    const idx = await groundIndex();
    const row = siteId && (idx.grounds || []).find((g) => g.site === siteId);
    const manifest = row ? await fetch(dataUrl(`ground/${row.id}/site.json`)).then((r) => r.json()).catch(() => null) : null;
    // A site whose ground stands somewhere else than its landing row (Opportunity, at the end of its traverse): the
    // sky is the ground's, so the two cannot disagree.
    if (manifest) { latDeg = manifest.latDeg; lonDeg = manifest.lonDeg; name = row.name; }
    const text = p.site ? `${p.world}:${p.site}` : `${p.world}:${Math.round(latDeg * 100) / 100},${Math.round(lonDeg * 100) / 100}`;
    return { world: p.world, latDeg, lonDeg, name, groundId: manifest ? row.id : null, manifest, link: { sky: text }, sky: true, exo: !!SKY_WORLDS[p.world].exo };
  }

  async function open(spec = {}) {
    const job = (async () => {
      const next = await resolve(spec);
      if (!next) return false;
      ensureUi();
      clearGround();
      place = next;
      mode = next.sky ? 'sky' : 'walk';
      // A few paces south-west of the lander, facing it: the lander in the middle of the view, the ground beyond it.
      walker = next.groundId ? { x: -14, z: 22, yawDeg: 32.5, pitchDeg: next.sky ? 28 : -5 } : { x: 0, z: 0, yawDeg: 0, pitchDeg: 28 };
      bodies = [];
      events = null;
      lastBodies = -Infinity;
      setActive(true);
      paintUi();
      loadStars().then((s) => { if (s && place === next) { pole = poleWithName(poleStar(next.world, now(), s), s); paintUi(); } });
      if (next.manifest) {
        ground = await buildGround(next.manifest);
        if (place !== next) { clearGround(); return false; }
        placeModel(ground);
      } else {
        ground = null;
      }
      plainGround(!next.manifest);
      paintUi();
      if (writing && typeof opts.write === 'function') opts.write({ ground: next.link.ground || null, sky: next.link.sky || null });
      return true;
    })();
    opening = job;
    job.then(() => { if (opening === job) opening = null; }, () => { if (opening === job) opening = null; });
    return job.catch((e) => { console.warn('the ground did not open', e); return false; });
  }

  // A world with no terrain model here: a plain dark ground to the horizon, which the stage calls not measured.
  let plain = null;
  function plainGround(on) {
    if (on && !plain) {
      plain = new THREE.Mesh(new THREE.CircleGeometry(60000, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1 }));
      plain.receiveShadow = false;
    }
    if (plain) { if (on) scene.add(plain); else scene.remove(plain); }
  }

  // The stage is drawn right after the map's own render (which, with the map's scene hidden, only clears): from the
  // scene's onAfterRender, so the loop in main.js needs no line for it. three.js supports a render inside it.
  const sceneAfter = opts.scene ? opts.scene.onAfterRender : null;
  function setActive(on) {
    active = on;
    if (opts.scene) {
      opts.scene.visible = !on;
      opts.scene.onAfterRender = on ? () => render(now()) : sceneAfter;
    }
    if (doc) doc.documentElement.classList.toggle('sr-ground-on', on);
    if (ui) ui.root.hidden = !on;
    if (on) {
      if (savedShadow === null) { savedShadow = { enabled: renderer.shadowMap.enabled, type: renderer.shadowMap.type }; }
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      sun.shadow.mapSize.set(tier() <= 0 ? 1024 : 2048, tier() <= 0 ? 1024 : 2048);
      lastReal = 0;
      if (ui) setTimeout(() => { try { ui.root.focus({ preventScroll: true }); } catch { /* old browser */ } }, 0);
    } else if (savedShadow) {
      renderer.shadowMap.enabled = savedShadow.enabled;
      renderer.shadowMap.type = savedShadow.type;
      savedShadow = null;
    }
  }

  function close() {
    if (!active) return;
    setActive(false);
    clearGround();
    plainGround(false);
    place = null;
    if (writing && typeof opts.write === 'function') opts.write({ ground: null, sky: null });
  }

  /** A link's keys: `ground` or `sky` opens that place (and a note says so when it names none this stage knows); neither closes. */
  async function fromLink(keys = {}, { quiet = false } = {}) {
    writing = !quiet;
    if (!keys.ground && !keys.sky) { if (active) close(); return false; }
    // The same place again (the address written back, or only its clock changed): nothing to rebuild. And the same
    // place twice before the first has opened (main.js's line and this stage's own listener both hear a pasted link).
    if (active && place && ((keys.ground && place.link.ground === keys.ground) || (keys.sky && place.link.sky === keys.sky))) return true;
    const want = keys.ground ? `g:${keys.ground}` : `s:${keys.sky}`;
    if (pending && pending.want === want) return pending.p;
    const p = open(keys.ground ? { ground: keys.ground } : { sky: keys.sky });
    pending = { want, p };
    const ok = await p;
    if (pending && pending.p === p) pending = null;
    if (!ok && typeof opts.note === 'function') opts.note(L()[keys.ground ? 'unknownGround' : 'unknownSky'], [keys.ground ? 'ground' : 'sky']);
    return ok;
  }

  function now() {
    if (clock && typeof clock.now === 'function') return clock.now();
    return Date.now();
  }

  // --- the UI ---------------------------------------------------------------------------------------------------
  function ensureUi() {
    if (ui || !doc) return;
    linkCss(doc);
    const T = L();
    const root = el(doc, 'section', 'sr-ground');
    root.setAttribute('aria-label', T.stageLabel);
    root.tabIndex = -1;
    const shield = el(doc, 'div', 'sr-ground__shield');
    const card = el(doc, 'div', 'sr-ground__card sr-float');
    const tag = el(doc, 'p', 'sr-ground__tag');
    // The name is the card's fold: on a phone the card starts as this one line, the sky above it (internal review of
    // 2026-11-07: the card and the sky's list together covered the Earth over Gale at dusk).
    const name = el(doc, 'h2', 'sr-ground__name');
    const fold = el(doc, 'button', 'sr-ground__fold');
    fold.type = 'button';
    fold.setAttribute('aria-controls', 'sr-ground-card-body');
    name.appendChild(fold);
    const body = el(doc, 'div', 'sr-ground__body');
    body.id = 'sr-ground-card-body';
    const time = el(doc, 'p', 'sr-ground__line sr-num');
    const l1 = el(doc, 'p', 'sr-ground__line');
    const l2 = el(doc, 'p', 'sr-ground__line sr-ground__line--model');
    const more = el(doc, 'details', 'sr-ground__more');
    const moreSum = el(doc, 'summary', null, T.sources);
    const src = el(doc, 'p', 'sr-ground__src');
    more.append(moreSum, src);
    body.append(time, l1, l2, more);
    card.append(tag, name, body);
    const bar = el(doc, 'div', 'sr-ground__bar');
    const drive = el(doc, 'button', 'sr-btn', T.drive);
    const skyBtn = el(doc, 'button', 'sr-btn', T.skyOpen);
    const leave = el(doc, 'button', 'sr-btn sr-btn--quiet', T.leave);
    for (const b of [drive, skyBtn, leave]) b.type = 'button';
    drive.setAttribute('aria-pressed', 'false');
    skyBtn.setAttribute('aria-expanded', 'false');
    bar.append(drive, skyBtn, leave);
    const panel = el(doc, 'div', 'sr-ground__panel sr-float');
    panel.hidden = true;
    panel.id = 'sr-ground-sky';
    skyBtn.setAttribute('aria-controls', panel.id);
    const panelTitle = el(doc, 'h3', 'sr-ground__ptitle');
    const pfold = el(doc, 'button', 'sr-ground__fold', T.skyTitle);
    pfold.type = 'button';
    pfold.setAttribute('aria-controls', 'sr-ground-sky-body');
    panelTitle.appendChild(pfold);
    const pbody = el(doc, 'div', 'sr-ground__body');
    pbody.id = 'sr-ground-sky-body';
    const list = el(doc, 'ul', 'sr-ground__list');
    const skyNote = el(doc, 'p', 'sr-ground__src');
    pbody.append(list, skyNote);
    panel.append(panelTitle, pbody);
    // Folded on a narrow screen to begin with; a tap on either title opens it.
    const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches;
    folds.card = narrow;
    folds.panel = narrow;
    fold.addEventListener('click', () => { folds.card = !folds.card; paintUi(); });
    pfold.addEventListener('click', () => { folds.panel = !folds.panel; paintUi(); });
    const pad = el(doc, 'div', 'sr-ground__pad');
    pad.setAttribute('role', 'application');
    pad.setAttribute('aria-label', T.padLabel);
    const thumb = el(doc, 'div', 'sr-ground__thumb');
    pad.appendChild(thumb);
    const labels = el(doc, 'div', 'sr-ground__labels');
    labels.setAttribute('aria-hidden', 'true');
    const live = el(doc, 'p', 'sr-ground__live');
    live.setAttribute('aria-live', 'polite');
    const keys = el(doc, 'p', 'sr-ground__keys', T.keys);
    root.append(shield, labels, card, bar, panel, pad, keys, live);
    doc.body.appendChild(root);

    leave.addEventListener('click', () => close());
    drive.addEventListener('click', () => setMode(mode === 'drive' ? 'walk' : 'drive'));
    skyBtn.addEventListener('click', () => { panelOpen = !panelOpen; paintUi(); if (panelOpen) refreshEvents(); });
    root.addEventListener('keydown', (e) => onKey(e, true));
    root.addEventListener('keyup', (e) => onKey(e, false));
    root.addEventListener('blur', () => input.keys.clear(), true);

    // Look: a drag on the shield; zoom: the wheel or a pinch.
    const touches = new Map();
    let pinch0 = null;
    shield.addEventListener('pointerdown', (e) => {
      shield.setPointerCapture(e.pointerId);
      touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch0 = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), fov: fovDeg }; }
    });
    shield.addEventListener('pointermove', (e) => {
      const was = touches.get(e.pointerId);
      if (!was) return;
      touches.set(e.pointerId, [e.clientX, e.clientY]);
      if (touches.size === 2 && pinch0) {
        const [a, b] = [...touches.values()];
        fovDeg = Math.min(90, Math.max(8, pinch0.fov * (pinch0.d / Math.max(Math.hypot(a[0] - b[0], a[1] - b[1]), 1))));
      } else {
        const k = fovDeg / Math.max(1, size.y || 600);
        walker.yawDeg = (((walker.yawDeg - (e.clientX - was[0]) * k) % 360) + 360) % 360;
        walker.pitchDeg = Math.max(-80, Math.min(85, walker.pitchDeg + (e.clientY - was[1]) * k));
      }
    });
    const up = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = null; };
    shield.addEventListener('pointerup', up);
    shield.addEventListener('pointercancel', up);
    shield.addEventListener('wheel', (e) => { e.preventDefault(); fovDeg = Math.min(90, Math.max(8, fovDeg * Math.exp(e.deltaY * 0.001))); }, { passive: false });

    // The joystick: a thumb in a ring; its push walks (or drives) while it is held.
    let stickId = null;
    const centre = () => { const r = pad.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width / 2]; };
    const moveStick = (e) => {
      const [cx, cy, rad] = centre();
      input.stick = joystick(e.clientX - cx, e.clientY - cy, rad);
      const dx = Math.max(-rad, Math.min(rad, e.clientX - cx)), dy = Math.max(-rad, Math.min(rad, e.clientY - cy));
      thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    pad.addEventListener('pointerdown', (e) => { stickId = e.pointerId; pad.setPointerCapture(e.pointerId); moveStick(e); });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
    const release = (e) => { if (e.pointerId !== stickId) return; stickId = null; input.stick = { x: 0, y: 0 }; thumb.style.transform = ''; };
    pad.addEventListener('pointerup', release);
    pad.addEventListener('pointercancel', release);

    ui = { root, tag, name, fold, body, pfold, pbody, time, l1, l2, src, more, drive, skyBtn, panel, list, skyNote, labels, live, labelPool: [] };
  }

  function onKey(e, down) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key;
    if (down && k === 'Escape') { e.preventDefault(); close(); return; }
    if (down && (k === '+' || k === '=')) { fovDeg = Math.max(8, fovDeg / 1.19); e.preventDefault(); return; }
    if (down && (k === '-' || k === '_')) { fovDeg = Math.min(90, fovDeg * 1.19); e.preventDefault(); return; }
    const moves = ['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'];
    const key = k.length === 1 ? k.toLowerCase() : k;
    if (!moves.includes(key)) return;
    e.preventDefault();
    if (down && reducedMotion() && (key === 'q' || key === 'e')) {
      // Reduced motion: a turn is a step, not a glide.
      walker.yawDeg = (((walker.yawDeg + (key === 'e' ? 15 : -15)) % 360) + 360) % 360;
      return;
    }
    if (down) input.keys.add(key); else input.keys.delete(key);
    if (key === 'Shift') { if (down) input.keys.add('Shift'); else input.keys.delete('Shift'); }
  }

  function readInput() {
    const K = input.keys;
    let forward = (K.has('w') || K.has('ArrowUp') ? 1 : 0) - (K.has('s') || K.has('ArrowDown') ? 1 : 0);
    let strafe = (K.has('d') ? 1 : 0) - (K.has('a') ? 1 : 0);
    let turn = (K.has('e') || K.has('ArrowRight') ? 1 : 0) - (K.has('q') || K.has('ArrowLeft') ? 1 : 0);
    const look = (K.has('r') ? 1 : 0) - (K.has('f') ? 1 : 0);
    if (mode === 'drive') { turn += strafe; strafe = 0; }
    if (input.stick.x || input.stick.y) {
      forward += input.stick.y;
      if (mode === 'drive') turn += input.stick.x; else strafe += input.stick.x;
    }
    return { forward: Math.max(-1, Math.min(1, forward)), strafe: Math.max(-1, Math.min(1, strafe)), turn: Math.max(-1, Math.min(1, turn)), look, run: K.has('Shift') };
  }

  function setMode(next) {
    if (next === 'drive' && !(ground && ground.model && place && place.world === 'mars')) return;
    mode = next;
    if (mode === 'drive' && ground) { walker.x = ground.modelOffset[0]; walker.z = ground.modelOffset[1]; walker.pitchDeg = -12; }
    if (mode === 'walk' && ground) { walker.z += 6; walker.pitchDeg = -4; }
    paintUi();
    if (ui) ui.live.textContent = mode === 'drive' ? say(L().driving, { x: Math.round(SPEEDS.drive / ROVER_TOP_MS) }) : L().walking;
  }

  function paintUi() {
    if (!ui || !place) return;
    const T = L();
    const W = T.worlds[place.world] || place.world;
    // The tag keeps the one word of honesty a folded card still shows: whether the ground is measured.
    const kind = place.exo ? T.kindModelled : place.groundId ? T.kindMeasured : T.kindPlain;
    ui.tag.textContent = `${place.groundId ? say(T.tagGround, { world: W }) : say(T.tagSky, { world: W })} · ${kind}`;
    ui.fold.textContent = place.name || say(T.placeAt, { world: W, lat: place.latDeg.toFixed(2), lon: place.lonDeg.toFixed(2) });
    ui.fold.setAttribute('aria-expanded', folds.card ? 'false' : 'true');
    ui.body.hidden = folds.card;
    ui.pfold.setAttribute('aria-expanded', folds.panel ? 'false' : 'true');
    ui.pbody.hidden = folds.panel;
    if (place.manifest) {
      const m = place.manifest;
      ui.l1.textContent = T.measuredGround;
      ui.l2.textContent = m.model ? say(T.modelLine, { what: m.model.what || '' }) : '';
      ui.src.textContent = (m.sources || []).map((s) => `${s.what}: ${s.credit}. ${s.licence}.`).join(' ');
      ui.more.hidden = false;
    } else {
      ui.l1.textContent = T.plainGround;
      ui.l2.textContent = '';
      ui.src.textContent = '';
      ui.more.hidden = true;
    }
    const isRover = !!(ground && ground.model && place.world === 'mars');
    ui.drive.hidden = !isRover;
    ui.drive.setAttribute('aria-pressed', mode === 'drive' ? 'true' : 'false');
    ui.drive.textContent = mode === 'drive' ? T.walk : T.drive;
    ui.skyBtn.setAttribute('aria-expanded', panelOpen ? 'true' : 'false');
    ui.skyBtn.textContent = panelOpen ? T.skyClose : T.skyOpen;
    ui.panel.hidden = !panelOpen;
    paintPanel();
  }

  function paintPanel() {
    if (!ui || !panelOpen || !place) return;
    const T = L();
    const items = [];
    const sky = SKY_WORLDS[place.world];
    if (pole) items.push(say(T.poleStar, { name: pole.name || T.unnamedStar, sep: pole.sepDeg.toFixed(1), mag: pole.mag.toFixed(1) }));
    else items.push(T.noPoleStar);
    if (events) {
      for (const e of events.riseSet) {
        const nm = T.bodies[e.id] || e.id;
        if (e.rise === null && e.set === null) items.push(say(e.id === SKY_WORLDS[place.world].parent ? T.neverSets : T.notToday, { name: nm }));
        else {
          if (e.rise) items.push(say(T.rises, { name: nm, local: hhmm(localSolarHours(place.world, place.lonDeg, e.rise)), utc: utcWords(e.rise) }));
          if (e.set) items.push(say(T.sets, { name: nm, local: hhmm(localSolarHours(place.world, place.lonDeg, e.set)), utc: utcWords(e.set) }));
        }
      }
      for (const tr of events.transits) {
        items.push(say(T.transit, { front: T.bodies[tr.front] || tr.front, local: hhmm(localSolarHours(place.world, place.lonDeg, tr.tMs)), utc: utcWords(tr.tMs), s: tr.durationS || '?' }));
      }
      if (events.transitsSearched && !events.transits.length) items.push(say(T.noTransit, { days: events.transitsSearched }));
    } else {
      items.push(T.working);
    }
    const earth = bodies.find((b) => b.id === 'earth');
    if (earth && place.world !== 'earth') items.push(say(T.earthNow, { alt: earth.altDeg.toFixed(1), az: earth.azDeg.toFixed(0), lit: Math.round(earth.phaseFraction * 100), mag: earth.mag.toFixed(1) }));
    ui.list.replaceChildren(...items.map((s) => el(doc, 'li', null, s)));
    ui.skyNote.textContent = `${T.airNotes[place.world] || ''} ${sky && sky.parent ? (sky.exo ? T.starNote : T.parentNote) : ''} ${T.discNote} ${T.frameNote}`.trim();
  }

  /** The events of this sky, worked out after the first frame and in small pieces, so the stage never stalls. */
  function refreshEvents() {
    if (!place) return;
    const here = place;
    const t0 = now();
    const pl = { world: here.world, latDeg: here.latDeg, lonDeg: here.lonDeg };
    const ids = [...(SKY_WORLDS[here.world].exo ? [] : ['sun']), ...(here.world === 'mars' ? ['earth', 'phobos', 'deimos'] : []), ...(here.world === 'moon' ? ['earth'] : []), ...(SKY_WORLDS[here.world].parent ? [SKY_WORLDS[here.world].parent] : [])];
    const out = { riseSet: [], transits: [], transitsSearched: 0 };
    const queue = ids.map((id) => () => {
      const r = nextRiseSet(id, pl, t0);
      out.riseSet.push({ id, rise: r.rise, set: r.set });
    });
    if (here.world === 'mars') {
      // Phobos and Deimos over the Sun, a sol at a time for the next ten sols.
      // A quarter of a sol a piece, so no piece holds the page for more than a few tens of milliseconds.
      const sol = SKY_WORLDS.mars.day * 3600e3;
      for (let k = 0; k < 40; k += 1) {
        const a = t0 + (k * sol) / 4, b = t0 + ((k + 1) * sol) / 4;
        queue.push(() => {
          for (const front of ['phobos', 'deimos']) {
            for (const hit of transits(front, 'sun', pl, a, b, { stepMs: front === 'phobos' ? 90e3 : 240e3 })) {
              if (!out.transits.some((o) => o.front === front && Math.abs(o.tMs - hit.tMs) < 600e3)) out.transits.push({ front, back: 'sun', ...hit });
            }
          }
          if ((k + 1) % 4 === 0) out.transitsSearched = (k + 1) / 4;
          out.transits.sort((x, y) => x.tMs - y.tMs);
        });
      }
    }
    // A timer, not requestIdleCallback: a page that draws every frame (this one, while walking) may never be idle.
    const next = () => {
      if (place !== here || !queue.length) return;
      queue.shift()();
      events = { ...out, transits: out.transits.slice(0, 3) };
      paintPanel();
      setTimeout(next, 30);
    };
    setTimeout(next, 30);
  }

  // --- each frame -----------------------------------------------------------------------------------------------
  let sunNow = null;
  /** What lights this world: the Sun, or its own star. */
  function lightOf() { return (place && SKY_WORLDS[place.world] && SKY_WORLDS[place.world].light) || 'sun'; }
  /** A disc's plain colour: a star's from its temperature (scene/starfield.js), a body's from DISC_COLOURS. */
  function discColour(b) {
    if (b.star && Number.isFinite(b.teffK)) { const c = new THREE.Color(); const k = kelvinToRgb(b.teffK); c.setRGB(k[0], k[1], k[2], THREE.SRGBColorSpace); return [c.r, c.g, c.b]; }
    return DISC_COLOURS[b.id] || [0.8, 0.8, 0.8];
  }
  function sunAlt() { return sunNow ? sunNow.altDeg : -90; }

  function solveBodies(t) {
    if (!place) return;
    const pl = { world: place.world, latDeg: place.latDeg, lonDeg: place.lonDeg };
    const cache = { obs: observerHelioEqjKm(pl.world, pl.latDeg, pl.lonDeg, t), m: worldEqjToLocal(pl.world, pl.latDeg, pl.lonDeg, t) };
    bodies = [];
    for (const id of skyTargets(place.world)) {
      const v = worldBodyView(id, t, pl, cache);
      if (v) bodies.push(v);
    }
    // The light: the Sun, or a planet of another star's own star (sky/worldframe.js SKY_WORLDS `light`).
    const lampId = lightOf();
    sunNow = bodies.find((b) => b.id === lampId) || null;
    // Points for the small ones (the planets, most of the time), discs for the wide ones.
    const pts = bodies.filter((b) => b.id !== lampId && b.diameterDeg < DISC_FROM_DEG);
    const pos = new Float32Array(pts.length * 3), mag = new Float32Array(pts.length), tint = new Float32Array(pts.length * 3);
    pts.forEach((b, i) => {
      pos[i * 3] = b.local[0] * SKY_R; pos[i * 3 + 1] = b.local[1] * SKY_R; pos[i * 3 + 2] = b.local[2] * SKY_R;
      mag[i] = b.mag;
      const c = b.star ? discColour(b) : DISC_COLOURS[b.id] || [1, 0.95, 0.85];
      tint[i * 3] = Math.min(1, c[0] * 1.3); tint[i * 3 + 1] = Math.min(1, c[1] * 1.3); tint[i * 3 + 2] = Math.min(1, c[2] * 1.3);
    });
    planetGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    planetGeo.setAttribute('mag', new THREE.BufferAttribute(mag, 1));
    planetGeo.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
    const wide = bodies.filter((b) => b.id === lampId || b.diameterDeg >= DISC_FROM_DEG);
    const keep = new Set(wide.map((b) => b.id));
    for (const [id, mesh] of discs) if (!keep.has(id)) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); discs.delete(id); }
    for (const b of wide) {
      let mesh = discs.get(b.id);
      if (!mesh) {
        const mat = new THREE.ShaderMaterial({
          vertexShader: DISC_VERT, fragmentShader: DISC_FRAG, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
          uniforms: { colour: { value: new THREE.Vector3(...discColour(b)) }, lightView: { value: new THREE.Vector3(0, 0, 1) }, glowK: { value: b.id === lampId ? 1 : 0 }, alpha: { value: 1 } },
        });
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        mesh.renderOrder = b.id === lampId ? -17 : -16;
        mesh.frustumCulled = false;
        discs.set(b.id, mesh);
        scene.add(mesh);
      }
      mesh.userData.view = b;
    }
  }

  const _m4 = new THREE.Matrix4();
  const _v = new THREE.Vector3();
  const _q = new THREE.Quaternion();

  function placeDiscs() {
    for (const [id, mesh] of discs) {
      const b = mesh.userData.view;
      if (!b) continue;
      // The Sun's quad is twice its disc, for the glow round it; a body's quad is its disc.
      const lamp = id === lightOf();
      const d = lamp ? b.diameterDeg * 2 : b.diameterDeg;
      const R = SKY_R * 0.9;
      const w = 2 * R * Math.tan((d * DEG) / 2);
      mesh.position.set(camera.position.x + b.local[0] * R, camera.position.y + b.local[1] * R, camera.position.z + b.local[2] * R);
      mesh.quaternion.copy(camera.quaternion);
      mesh.scale.setScalar(w);
      if (!lamp) {
        // The Sun's direction from the body, in the disc's frame (the camera's axes): which side is lit.
        const m = worldEqjToLocal(place.world, place.latDeg, place.lonDeg, lastClock);
        if (m) {
          const ls = toLocal(m, b.toSun);
          _v.set(ls[0], ls[1], ls[2]).applyQuaternion(_q.copy(camera.quaternion).invert());
          mesh.material.uniforms.lightView.value.copy(_v);
        }
        // A disc hides what is behind it (Phobos crossing the Sun is a dark disc on it); behind Titan's haze it is a
        // faint glow, there and drawn faint.
        const haze = place.world === 'titan';
        mesh.material.uniforms.alpha.value = haze ? 0.15 : 1;
        mesh.material.blending = haze ? THREE.AdditiveBlending : THREE.NormalBlending;
      }
    }
  }

  function paintSky(t) {
    const look = skyLook(place.world, sunAlt());
    domeMat.uniforms.zenith.value.setRGB(...look.zenith);
    domeMat.uniforms.horizon.value.setRGB(...look.horizon);
    domeMat.uniforms.glow.value.setRGB(...look.glow);
    domeMat.uniforms.glowDeg.value = look.glowDeg;
    if (sunNow) domeMat.uniforms.sunDir.value.set(sunNow.local[0], sunNow.local[1], sunNow.local[2]);
    // How faint a star shows: the sky's brightness sets the limit (magnitude 6 on a dark night, about -1 by day, so
    // only Venus, Jupiter or the Earth stand out of a Martian dusk), as sky/skymath.js limitingMagnitude does at home.
    starMat.uniforms.visible.value = look.stars > 0.02 ? 1 : 0.35;
    starMat.uniforms.limit.value = -1 + 7 * look.stars;
    // From Proxima b, Alpha Centauri A and B are drawn as the two stars they are there; the catalogue's one point
    // for the pair, where the Sun sees it, is not.
    const hide = HIDE_FROM[place.world];
    if (hide) { starMat.uniforms.hideDir.value.set(...hide.dir); starMat.uniforms.hideCos.value = Math.cos(hide.deg * DEG); } else starMat.uniforms.hideCos.value = 2;
    starMat.uniforms.pxScale.value = renderer.getPixelRatio();
    dome.position.copy(camera.position);
    skyGroup.position.copy(camera.position);
    planetPoints.position.copy(camera.position);
    const m = worldEqjToLocal(place.world, place.latDeg, place.lonDeg, t);
    if (m) {
      _m4.set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
      skyGroup.matrixAutoUpdate = false;
      _m4.setPosition(camera.position);
      skyGroup.matrix.copy(_m4);
      skyGroup.matrixWorldNeedsUpdate = true;
    }
    // The light: the Sun's direction, its share above the far skyline, and the sky's own fill.
    if (sunNow) {
      const s = sunNow.local;
      const skyline = ground && ground.profile ? horizonAt(ground.profile, sunNow.azDeg) : 0;
      const share = sunlitShare(sunNow.altDeg, Math.max(skyline, ground ? -2 : 0), sunNow.diameterDeg / 2);
      const strength = place.world === 'titan' ? 0.35 : place.world === 'mars' ? 2.6 : SKY_WORLDS[place.world].exo ? 2.8 : 3.2;
      sun.intensity = strength * share;
      sun.visible = share > 0.001;
      const at = [walker.x, walker.z];
      const gy = ground ? groundHeight(ground.near, ground.far, at[0], at[1]) : 0;
      sun.target.position.set(at[0], Number.isFinite(gy) ? gy : 0, at[1]);
      sun.position.set(at[0] + s[0] * 2000, (Number.isFinite(gy) ? gy : 0) + s[1] * 2000, at[1] + s[2] * 2000);
      sun.target.updateMatrixWorld();
    }
    if (HAZE_KM[place.world]) {
      scene.fog = haze;
      haze.color.setRGB(...look.horizon);
      haze.near = 800;
      haze.far = HAZE_KM[place.world] * 1000;
    } else scene.fog = null;
    // The sky's own light on the ground: on Mars the dust scatters a good share of the day into the shadows.
    const fillK = place.world === 'mars' ? 0.9 * look.light + 0.03 : place.world === 'titan' ? 0.5 * look.light + 0.02 : SKY_WORLDS[place.world].exo ? 0.6 * look.light + 0.02 : 0.015;
    fill.color.setRGB((look.horizon[0] + 0.02) * fillK * 3, (look.horizon[1] + 0.02) * fillK * 3, (look.horizon[2] + 0.02) * fillK * 3);
    fill.groundColor.setRGB(0.02 * fillK, 0.015 * fillK, 0.01 * fillK);
    // On the Moon the Earth lights the night side: a hundredth of the day at most, enough to see the ground by.
    if (place.world === 'moon') {
      const earth = bodies.find((b) => b.id === 'earth');
      const e = earth && earth.altDeg > 0 ? earth.phaseFraction * 0.05 : 0;
      fill.color.setRGB(0.012 + e, 0.014 + e, 0.02 + e * 1.2);
    }
  }

  function placeCamera() {
    renderer.getSize(size);
    // A picture drawn into a target (ui/postcard.js, the trips' pictures: renderer.renderTo) takes the target's shape.
    const rt = renderer.getRenderTarget();
    if (rt) size.set(rt.width, rt.height);
    camera.aspect = size.x / Math.max(size.y, 1);
    camera.fov = fovDeg;
    camera.updateProjectionMatrix();
    const g = ground;
    const h = g ? groundHeight(g.near, g.far, walker.x, walker.z) : 0;
    const yaw = walker.yawDeg * DEG, pitch = walker.pitchDeg * DEG;
    const look = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    if (mode === 'drive' && g && g.model) {
      // Behind and above the rover, looking where it looks.
      const back = 9, high = 3.2;
      const fx = Math.sin(yaw), fz = -Math.cos(yaw);
      const cx = walker.x - fx * back, cz = walker.z - fz * back;
      const ch = groundHeight(g.near, g.far, cx, cz);
      camera.position.set(cx, Math.max(Number.isFinite(ch) ? ch : h, h) + high, cz);
      camera.lookAt(walker.x + look.x * 10, h + 1.2 + look.y * 10, walker.z + look.z * 10);
      // The rover on the ground: its heading, and tilted to the slope under it.
      const n = groundNormal(g.near, g.far, walker.x, walker.z);
      g.model.position.set(walker.x, h + (g.model.userData.lift || 0), walker.z);
      const upV = new THREE.Vector3(n[0], n[1], n[2]);
      const qa = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), upV);
      const qb = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
      g.model.quaternion.copy(qa.multiply(qb));
      g.modelOffset = [walker.x, walker.z];
    } else {
      camera.position.set(walker.x, (Number.isFinite(h) ? h : 0) + EYE_M, walker.z);
      camera.lookAt(camera.position.x + look.x, camera.position.y + look.y, camera.position.z + look.z);
    }
    camera.updateMatrixWorld();
  }

  function labelPool(n) {
    while (ui.labelPool.length < n) {
      const s = el(doc, 'span', 'sr-ground__label');
      ui.labels.appendChild(s);
      ui.labelPool.push(s);
    }
    return ui.labelPool;
  }

  function placeLabels() {
    if (!ui || !doc) return;
    const T = L();
    const want = [];
    const limit = starMat.uniforms.limit.value;
    // From Mars the Moon sits a few tenths of a degree from the Earth: one name for the pair.
    const earth = bodies.find((b) => b.id === 'earth');
    const moon = bodies.find((b) => b.id === 'moon');
    const pair = !!(earth && moon && earth.dir[0] * moon.dir[0] + earth.dir[1] * moon.dir[1] + earth.dir[2] * moon.dir[2] > Math.cos(1.5 * DEG));
    for (const b of [...bodies].sort((x, y) => x.mag - y.mag)) {
      if (b.id === lightOf() || (pair && b.id === 'moon')) continue;
      if (b.diameterDeg < DISC_FROM_DEG && b.mag > Math.min(3.5, limit)) continue;
      want.push({ text: pair && b.id === 'earth' ? T.earthAndMoon : T.bodies[b.id] || b.id, local: b.local });
    }
    const card = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
    for (const [k, az] of card) want.push({ text: T.compass[k], local: [Math.sin(az * DEG), 0.004, -Math.cos(az * DEG)], cls: 'is-compass' });
    if (pole && pole.dirLocal && pole.mag < limit) want.push({ text: say(T.poleLabel, { name: pole.name || T.unnamedStar }), local: pole.dirLocal, cls: 'is-pole' });
    const pool = labelPool(want.length);
    const w = size.x, hpx = size.y;
    const placed = [];
    for (let i = 0; i < pool.length; i += 1) {
      const node = pool[i];
      const it = want[i];
      if (!it) { node.hidden = true; continue; }
      _v.set(camera.position.x + it.local[0] * 1000, camera.position.y + it.local[1] * 1000, camera.position.z + it.local[2] * 1000).project(camera);
      const behind = _v.z > 1 || _v.z < -1;
      const { altDeg, azDeg } = altAz(it.local);
      const skyline = ground && ground.profile ? horizonAt(ground.profile, azDeg) - 0.3 : 0;
      const hidden = behind || (it.cls !== 'is-compass' && altDeg < skyline);
      const px = (_v.x * 0.5 + 0.5) * w, py = (-_v.y * 0.5 + 0.5) * hpx;
      // Two names closer than a short word are one too many: the first (the brighter body, or a compass point) wins.
      const crowded = placed.some(([qx, qy]) => Math.abs(qx - px) < 70 && Math.abs(qy - py) < 16);
      if (hidden || crowded) { node.hidden = true; continue; }
      placed.push([px, py]);
      node.hidden = false;
      node.className = `sr-ground__label ${it.cls || ''}`.trim();
      if (node.textContent !== it.text) node.textContent = it.text;
      node.style.transform = `translate(${Math.round(px)}px, ${Math.round(py)}px)`;
    }
  }

  function paintTime(t) {
    if (!ui || !place) return;
    const lst = localSolarHours(place.world, place.lonDeg, t);
    const T = L();
    const alt = sunNow ? sunNow.altDeg.toFixed(1) : '?';
    // Under a star that never moves there is no time of day to tell, only where the star stands.
    const text = SKY_WORLDS[place.world].exo
      ? say(T.timeLineStar, { utc: utcWords(t), star: T.bodies[lightOf()] || lightOf(), sun: alt })
      : say(T.timeLine, { local: hhmm(lst), utc: utcWords(t), sun: alt });
    if (ui.time.textContent !== text) ui.time.textContent = text;
  }

  /** One frame, called by main.js's loop after its own render while the stage is up. */
  function render(tMs) {
    if (!active || !place || disposed) return;
    const nowReal = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const dt = lastReal ? (nowReal - lastReal) / 1000 : 0;
    lastReal = nowReal;
    const t = Number.isFinite(tMs) ? tMs : now();
    // Walk or drive.
    if (ground) {
      const inp = readInput();
      walker = stepWalker(walker, inp, dt, { mode: mode === 'drive' ? 'drive' : 'walk', limitM: ground.limitM, height: (x, z) => groundHeight(ground.near, null, x, z) });
    } else {
      const inp = readInput();
      walker = { ...walker, ...stepWalker(walker, { ...inp, forward: 0, strafe: 0 }, dt, {}) };
    }
    // A held key or thumb moves the walker between the events that wake the loop: keep it drawing every frame.
    if (ctx.idle && typeof ctx.idle.wake === 'function' && (input.keys.size || input.stick.x || input.stick.y)) ctx.idle.wake(nowReal);
    const jumped = !Number.isFinite(lastClock) || Math.abs(t - lastClock) > 60e3;
    if (jumped || nowReal - lastBodies > BODY_REFRESH_MS) {
      lastBodies = nowReal;
      solveBodies(t);
      if (pole && pole.dir) { const m = worldEqjToLocal(place.world, place.latDeg, place.lonDeg, t); if (m) pole.dirLocal = toLocal(m, pole.dir); }
      paintTime(t);
      if (jumped && panelOpen && Number.isFinite(lastClock)) refreshEvents();
    }
    lastClock = t;
    placeCamera();
    paintSky(t);
    placeDiscs();
    renderer.render(scene, camera);
    placeLabels();
  }

  function state() {
    return {
      active, mode, world: place ? place.world : null, latDeg: place ? place.latDeg : null, lonDeg: place ? place.lonDeg : null,
      ground: place ? place.groundId : null, walker: { ...walker }, fovDeg,
      sun: sunNow ? { altDeg: sunNow.altDeg, azDeg: sunNow.azDeg } : null,
      bodies: bodies.map((b) => ({ id: b.id, altDeg: +b.altDeg.toFixed(2), azDeg: +b.azDeg.toFixed(2), mag: +b.mag.toFixed(2), lit: +b.phaseFraction.toFixed(2) })),
      pole: pole ? { name: pole.name, sepDeg: pole.sepDeg } : null,
      model: !!(ground && ground.model), events,
      opening: !!opening,
    };
  }

  /** Point the view: for the tools that take this package's pictures, and a trip's stop. */
  function look(v = {}) {
    if (Number.isFinite(v.yawDeg)) walker.yawDeg = v.yawDeg;
    if (Number.isFinite(v.pitchDeg)) walker.pitchDeg = v.pitchDeg;
    if (Number.isFinite(v.fovDeg)) fovDeg = v.fovDeg;
    if (Number.isFinite(v.x)) walker.x = v.x;
    if (Number.isFinite(v.z)) walker.z = v.z;
    if (v.panel !== undefined) { panelOpen = !!v.panel; paintUi(); if (panelOpen) refreshEvents(); }
    if (v.mode) setMode(v.mode);
    return state();
  }

  function dispose() {
    close();
    disposed = true;
    if (ui) ui.root.remove();
  }

  return {
    open, close, render, fromLink, look, state, dispose,
    get active() { return active; },
  };
}

/**
 * main.js's one line: on a `ground=` or `sky=` link (at boot or pasted later), make the stage once and open that place.
 * Never in an embed (a frame under someone else's page keeps to the map). The stage listens to the address from then
 * on, so a link without either key closes it.
 */
export function boot(ctx) {
  if (/[?&]embed=1(?:&|$)/.test(location.search)) return null;
  stageOf(ctx);
  ctx.ground.fromLink(readUrlKeys());
  return ctx.ground;
}

/**
 * ui/trip.js's `stand:` stop: `{ground: 'apollo-15'}` or `{sky: 'mars:jezero'}`, with `yaw`, `pitch` and `fov` (degrees)
 * for where to look and `panel: true` to open the sky's list. Opened without writing the address (the trip owns it).
 */
export function standFor(ctx, stand) {
  const g = stageOf(ctx);
  const keys = stand.ground ? { ground: stand.ground } : { sky: stand.sky };
  return g.fromLink(keys, { quiet: true }).then((ok) => {
    if (ok) g.look({ yawDeg: stand.yaw, pitchDeg: stand.pitch, fovDeg: stand.fov, panel: stand.panel === true ? true : undefined });
    return ok;
  });
}

function stageOf(ctx) {
  if (!ctx.ground) {
    ctx.ground = createGroundStage(ctx, {
      scene: ctx.scene,
      clock: ctx.clock,
      write: writeUrlKeys,
      note: (line, dead) => { if (ctx.sceneNote && typeof ctx.sceneNote.say === 'function') ctx.sceneNote.say(line); clearUrlKeys(dead); },
    });
    // The address from then on: a link without `ground` or `sky` closes the stage, unless a trip opened it.
    window.addEventListener('hashchange', () => { const k = readUrlKeys(); if (k.ground || k.sky || !document.documentElement.classList.contains('sr-trip-mode')) ctx.ground.fromLink(k); });
  }
  return ctx.ground;
}
