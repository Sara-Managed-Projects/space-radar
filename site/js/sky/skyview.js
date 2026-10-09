// sky/skyview.js — the same scene, a different camera position.
//
// Contract (tests/test_contract.mjs):
//   createSkyView(ctx) -> { enter(observer), exit(), update(tMs), active }
//
// Spec 0014 requirement 1: this is NOT a second engine. Every record is already in the right
// place; this moves the camera to the visitor's own patch of ground, widens the field of view and
// adds the four things a beginner needs to read a sky — a horizon, the cardinal points, altitude
// ticks and a sky whose colour is the real Sun's.
//
// THE SKY ITSELF (2026-10-05, pub #454, internal #351 to #357). The first time the view opens it
// imports sky/groundsky.js, which draws the stars, the Milky Way, the Sun, the Moon and the planets
// as they look from the ground: lifted and dimmed by the air, limited by how dark the sky is, and
// at their true size, so the field of view can close from 120 degrees to a telescope's. While that
// layer is up the dome here is an opaque veil over the orbital scene's own sky (5 044 stars with
// no air, and planets drawn 0.4 degrees wide so they can be found from orbit). Until it has
// loaded, and wherever it cannot (a test with no DOM), the view is what it was: the scene's sky
// under a dome that hides more of it as the Sun comes up.
//
// Units: kilometres, radians. Degrees appear only in the two *InWords helpers, which are the UI
// boundary.
//
// Frame: everything is built in a local right-handed basis with +X east, +Y up (zenith), +Z south,
// and the whole group is oriented into scene space each frame from the observer's east/north/up
// measured THROUGH stage.toScene. That is what makes it frame-agnostic: it is correct whether the
// stage draws in earth-fixed or earth-inertial, and it follows Earth's rotation for free.

import * as THREE from '../../vendor/three.module.min.js';
import * as Astronomy from '../../vendor/astronomy.js';
import { SHOWERS } from '../data/showers.js';
import { activeShowers, radiantAltAz } from './radiants.js';
import { COPY, t, fmt } from '../copy/en.js';
import { twilightPhase, glowOfLights, DARKNESS, DARKNESS_IDS, CULTURE_IDS, DEFAULT_DARKNESS, FOV, clampFov, zoomFov, fovName, refractionDeg } from './skymath.js';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Eye height. Spec 0014 design: "The camera sits 1.7 m above the surface at the observer."
const EYE_HEIGHT_KM = 0.0017;

// Wider than the orbital view: standing under the sky you see much more of it at once.
const SKY_FOV_DEG = 72;

// How often the Sun is re-solved, in clock milliseconds. It moves 15 arcseconds a second.
const SUN_REFRESH_MS = 5000;

// One press of + or - : the field closes or opens by this ratio (four presses halve it).
const KEY_ZOOM = 1.19;
// J2000 mean obliquity, as scene/galaxy.js: `sun-inertial` (ecliptic) to the sky's equatorial frame.
const COS_OBLIQUITY = Math.cos(23.4392911 * DEG2RAD);
const SIN_OBLIQUITY = Math.sin(23.4392911 * DEG2RAD);
// The bodies sky/skybodies.js solves; the other worlds have no place in the sky from the ground.
const SKY_BODIES = new Set(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);

const HORIZON_SEGMENTS = 720;
const DOME_SEGMENTS = 64;

// docs/design-language.md palette, for the marks drawn on the sky. The sky's own colours are
// below: they are a picture of the air, not chrome.
const TOKENS = {
  space: 0x0b0e14,
  spaceEdge: 0x05070a,
  earthOcean: 0x1b4f8a,
  atmosphere: 0x6ec3ff,
  nightLights: 0xffc98a,
  moonGlow: 0xaab6d8,
  text: 0xe8ecf2,
  textDim: 0x9aa4b2,
};

/**
 * The five stops, keyed on the REAL Sun elevation. Twilight is the moment worth designing for, so
 * three of the five live in the 12 degrees around the horizon. `horizon` and `zenith` are the
 * air's colours away from the Sun; `warm` is the colour of the band on the Sun's side and `glow`
 * how strong it is; `alpha` is how much of the orbital scene's star field the dome hides while the
 * ground sky has not loaded. Drawn, not measured: the colours are a painter's, read off twilight
 * photographs, and the copy says the sky's colour follows the Sun rather than the weather.
 */
const SKY_STOPS = [
  { sunElDeg: -18, name: 'night', horizon: 0x0a0e17, zenith: 0x04060b, warm: 0x3a2a22, alpha: 0.14, glow: 0.0 },
  { sunElDeg: -12, name: 'nautical', horizon: 0x13233f, zenith: 0x070c18, warm: 0x8a4a2a, alpha: 0.45, glow: 0.3 },
  { sunElDeg: -6, name: 'civil', horizon: 0x3d5c8c, zenith: 0x12284e, warm: 0xe8894a, alpha: 0.8, glow: 0.8 },
  { sunElDeg: 0, name: 'golden', horizon: 0x9db2cc, zenith: 0x2e5c9c, warm: 0xffb45e, alpha: 0.98, glow: 1.0 },
  { sunElDeg: 6, name: 'day', horizon: 0xa8cdee, zenith: 0x2b6cc4, warm: 0xfff1d6, alpha: 1.0, glow: 0.2 },
];

/** Where the sky view keeps what the visitor chose: lines, names, how dark the sky is, red light. */
export const SKY_OPTIONS_KEY = 'sr.sky';
export const SKY_OPTION_DEFAULTS = Object.freeze({
  figures: true, names: true, grid: false, starGrid: false, sunPath: false, equator: false,
  art: false, bounds: false, meteors: true, trails: false, culture: 'western',
  // The land drawn see-through, so what is under the horizon can be found (internal #450 req 8).
  seeThrough: false,
  // `darknessBy`: 'place' reads the kind of sky off the night lights at the place (sky/skyglow.js);
  // 'you' is the visitor's own pick of `darkness`, which always wins once made.
  darkness: DEFAULT_DARKNESS, darknessBy: 'place', red: false,
});
const DARKNESS_BY = ['place', 'you'];

/** The stored choices over the defaults; anything unknown or unreadable is the default. Pure. */
export function readSkyOptions(storage) {
  const out = { ...SKY_OPTION_DEFAULTS };
  try {
    const raw = storage && storage.getItem(SKY_OPTIONS_KEY);
    const got = raw ? JSON.parse(raw) : null;
    if (got && typeof got === 'object') {
      for (const k of Object.keys(SKY_OPTION_DEFAULTS)) {
        if (k === 'darkness') { if (DARKNESS_IDS.includes(got[k])) out[k] = got[k]; }
        else if (k === 'culture') { if (CULTURE_IDS.includes(got[k])) out[k] = got[k]; }
        else if (k === 'darknessBy') { if (DARKNESS_BY.includes(got[k])) out[k] = got[k]; }
        else if (typeof got[k] === 'boolean') out[k] = got[k];
      }
      // Stored before there was a map to read: a kind of sky other than the default was a choice.
      if (!DARKNESS_BY.includes(got.darknessBy) && out.darkness !== DEFAULT_DARKNESS) out.darknessBy = 'you';
    }
  } catch { /* a storage that throws, or a value that is not JSON: the defaults */ }
  return out;
}

export function writeSkyOptions(storage, options) {
  try { if (storage) storage.setItem(SKY_OPTIONS_KEY, JSON.stringify(options)); } catch { /* private mode */ }
}

import { azimuthInWords, altitudeInWords } from './skywords.js';
export { azimuthInWords, altitudeInWords };

/**
 * Where the Sun is, in the words the twilight definitions actually use (spec 0014 requirement 7).
 * 'golden' is the only non-standard one and it is the design's, not astronomy's.
 */
export function sunPhaseName(sunElDeg) {
  return twilightPhase(sunElDeg);
}

// ---------------------------------------------------------------------------- helpers

function normaliseObserver(o) {
  if (!o) return null;
  let latDeg;
  let lonDeg;
  if (Number.isFinite(o.latRad) && Number.isFinite(o.lonRad)) {
    latDeg = o.latRad * RAD2DEG;
    lonDeg = o.lonRad * RAD2DEG;
  } else if (Number.isFinite(o.latDeg) && Number.isFinite(o.lonDeg)) {
    latDeg = o.latDeg;
    lonDeg = o.lonDeg;
  } else if (Number.isFinite(o.latitude) && Number.isFinite(o.longitude)) {
    latDeg = o.latitude;
    lonDeg = o.longitude;
  } else if (Number.isFinite(o.lat) && Number.isFinite(o.lon)) {
    latDeg = o.lat;
    lonDeg = o.lon;
  } else {
    return null;
  }
  let altKm = 0;
  if (Number.isFinite(o.altKm)) altKm = o.altKm;
  else if (Number.isFinite(o.heightKm)) altKm = o.heightKm;
  else if (Number.isFinite(o.altM)) altKm = o.altM / 1000;
  else if (Number.isFinite(o.altitude)) altKm = o.altitude / 1000;
  else if (Number.isFinite(o.alt)) altKm = o.alt / 1000;
  return { latDeg, lonDeg, altKm, latRad: latDeg * DEG2RAD, lonRad: lonDeg * DEG2RAD };
}

/** WGS-84 geodetic to earth-fixed km. Same maths as satellite.js's geodeticToEcf. */
function geodeticToEcefKm(latRad, lonRad, altKm) {
  const a = 6378.137;
  const f = (6378.137 - 6356.7523142) / 6378.137;
  const e2 = 2 * f - f * f;
  const sinLat = Math.sin(latRad);
  const n = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  return {
    x: (n + altKm) * Math.cos(latRad) * Math.cos(lonRad),
    y: (n + altKm) * Math.cos(latRad) * Math.sin(lonRad),
    z: (n * (1 - e2) + altKm) * sinLat,
  };
}

/** Local direction from azimuth (from north, clockwise) and altitude, in the +X east / +Y up / +Z south basis. */
function localDir(azRad, altRad, out) {
  const ca = Math.cos(altRad);
  return out.set(Math.sin(azRad) * ca, Math.sin(altRad), -Math.cos(azRad) * ca);
}

function lerpColour(a, b, t, out) {
  return out.copy(a).lerp(b, t);
}

/** The two colours, the alpha and the glow for a given Sun elevation, blended between five stops. */
function skyAt(sunElDeg, out) {
  let lo = SKY_STOPS[0];
  let hi = SKY_STOPS[SKY_STOPS.length - 1];
  let t = 0;
  if (sunElDeg <= lo.sunElDeg) {
    hi = lo;
  } else if (sunElDeg >= hi.sunElDeg) {
    lo = hi;
  } else {
    for (let i = 0; i < SKY_STOPS.length - 1; i += 1) {
      if (sunElDeg >= SKY_STOPS[i].sunElDeg && sunElDeg <= SKY_STOPS[i + 1].sunElDeg) {
        lo = SKY_STOPS[i];
        hi = SKY_STOPS[i + 1];
        t = (sunElDeg - lo.sunElDeg) / (hi.sunElDeg - lo.sunElDeg);
        break;
      }
    }
  }
  out.loHorizon.setHex(lo.horizon);
  out.hiHorizon.setHex(hi.horizon);
  out.loZenith.setHex(lo.zenith);
  out.hiZenith.setHex(hi.zenith);
  out.warm.setHex(lo.warm).lerp(out.hiWarm.setHex(hi.warm), t);
  lerpColour(out.loHorizon, out.hiHorizon, t, out.horizon);
  lerpColour(out.loZenith, out.hiZenith, t, out.zenith);
  out.alpha = lo.alpha + (hi.alpha - lo.alpha) * t;
  out.glow = lo.glow + (hi.glow - lo.glow) * t;
  out.name = t < 0.5 ? lo.name : hi.name;
  return out;
}

/**
 * City light pollution, as a band that hugs the WHOLE horizon rather than the sun's own
 * direction. Visible once the sky is actually dark; the sun's own twilight glow (above, keyed to
 * its azimuth) takes over as it climbs back toward the horizon, so this fades out by sunset/dawn
 * rather than stacking with it.
 * `horizonGlowStrength(-18) === 0.3`, `horizonGlowStrength(0) === 0`.
 *
 * With a kind of sky (sky/skymath.js DARKNESS: 'city', 'town', 'dark') the band is that sky's:
 * strong over a city, a trace in a dark place. Without one it is the 0.3 it was drawn at first.
 */
export function horizonGlowStrength(sunElDeg, darkness, lights) {
  if (!Number.isFinite(sunElDeg)) return 0;
  // With the place's own night-lights reading (sky/skyglow.js, 0 to 1) the band is that place's,
  // not its word's: a dark-sky town like Flagstaff reads 'town' and has next to no glow.
  const full = Number.isFinite(lights) ? 0.5 * glowOfLights(lights) : DARKNESS[darkness] ? 0.5 * DARKNESS[darkness].glow : 0.3;
  if (sunElDeg <= -10) return full;
  if (sunElDeg >= 0) return 0;
  return full * (-sunElDeg / 10);
}

/**
 * How much the Moon is lifting the sky right now, 0 (not up, new, or below the horizon) to 1
 * (high and full). Scales with altitude -- full strength by about 30 degrees up, nothing below
 * the horizon -- and with the illuminated fraction, so a thin crescent barely shows.
 */
export function moonBrightness(moonAltDeg, illumFrac) {
  if (!Number.isFinite(moonAltDeg) || moonAltDeg <= 0) return 0;
  const frac = Number.isFinite(illumFrac) ? illumFrac : 0;
  const altFactor = Math.min(1, Math.sin(moonAltDeg * DEG2RAD) * 2);
  return Math.max(0, Math.min(1, altFactor * frac));
}

/**
 * A deterministic skyline. Deterministic matters: a profile regenerated per frame would shimmer,
 * and this is meant to read as "the far edge of a town", not as noise.
 * @returns {number} altitude in radians of the top of the silhouette at this azimuth
 */
function skylineAlt(azRad) {
  const a = azRad;
  // Far hills, a tree line on them, and a few flat roofs: the far edge of a town, anywhere.
  const hills = 1.1 + 0.9 * Math.sin(a * 2 + 0.7) + 0.5 * Math.sin(a * 5 + 2.1) + 0.25 * Math.sin(a * 11 + 4.4);
  const trees = 0.35 * Math.abs(Math.sin(a * 37 + 1.1)) * (0.5 + 0.5 * Math.sin(a * 3 + 0.4)) + 0.1 * Math.sin(a * 97 + 0.3);
  const block = Math.max(0, Math.sin(a * 23 + 1.3)) > 0.93 ? 0.7 : 0;
  return Math.max(0.3, hills + trees + block) * DEG2RAD;
}

function makeLetterTexture(letter) {
  const size = 128;
  const canvas =
    typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, size, size);
  g.font = '600 78px Inter, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // docs/design-language.md, Labels: `text` with a 2 px `space` halo.
  g.lineWidth = 7;
  g.lineJoin = 'round';
  g.strokeStyle = '#0B0E14';
  g.strokeText(letter, size / 2, size / 2 + 3);
  g.fillStyle = '#E8ECF2';
  g.fillText(letter, size / 2, size / 2 + 3);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace ?? tex.colorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** A name on the sky, the cardinals' style, with a small ring on the left that marks the point. */
function makeRadiantTexture(text) {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) return null;
  canvas.width = 512;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, 512, 64);
  g.lineWidth = 3;
  g.strokeStyle = '#FF9F43';
  g.beginPath();
  g.arc(32, 32, 14, 0, Math.PI * 2);
  g.stroke();
  g.font = '600 30px Inter, system-ui, sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.lineWidth = 6;
  g.lineJoin = 'round';
  g.strokeStyle = '#0B0E14';
  g.strokeText(text, 58, 34);
  g.fillStyle = '#E8ECF2';
  g.fillText(text, 58, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace ?? tex.colorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------- the view

/**
 * @param {object} ctx main.js's context: { clock, stage, scene, camera, cameraRig, ... }.
 *   Optional extras this module will use if they are there:
 *     ctx.domElement / ctx.renderer.domElement — to attach its own look-around drag
 * @param {object} [options] domeRadius, fovDeg, minElevationDeg
 */
export function createSkyView(ctx, options = {}) {
  const camera = ctx?.camera;
  const scene = ctx?.scene;
  if (!camera || !scene) throw new Error('createSkyView needs ctx.camera and ctx.scene');

  const fovDeg = Number(options.fovDeg) || SKY_FOV_DEG;
  // The field of view: where it is, and where the wheel or a pinch has asked it to go.
  let fov = fovDeg;
  let fovWant = fovDeg;
  let fovTold = NaN;
  const storage = options.storage !== undefined ? options.storage : (typeof localStorage !== 'undefined' ? localStorage : null);
  const skyOptions = readSkyOptions(storage);
  // WHAT A TRIP STOP HOLDS OVER THE VISITOR'S OWN CHOICES (2026-10-06, hold() below): a kind of
  // sky for "the same patch from a city, a town and a dark place", and one shower's radiant to
  // mark whatever the date. Never stored: letting go puts back exactly what they chose.
  let held = null;
  // The kind of sky the night lights at this place suggest, once read: { key, id, lights } or null.
  let placeSky = null;
  let placeSkyAsked = '';
  const darknessNow = () => {
    if (held && held.darkness) return { id: held.darkness, by: 'trip' };
    if (skyOptions.darknessBy === 'place') return placeSky && placeSky.id ? { id: placeSky.id, by: 'place', lights: placeSky.lights } : { id: skyOptions.darkness, by: placeSky ? 'unread' : 'reading' };
    return { id: skyOptions.darkness, by: 'you' };
  };
  const worn = () => { const d = darknessNow(); return { ...skyOptions, darkness: d.id, lights: d.by === 'place' && Number.isFinite(d.lights) ? d.lights : null }; };
  // "Point your phone" (internal #450): sky/pointing.js once the switch has been pressed, or null.
  let pointing = null;
  let pointAsked = 0;
  let pointWhy = '';
  let reticle = null;
  let centreAt = 0;
  const _q = new THREE.Quaternion();
  // The showers whose meteors may be drawn now, with where each radiant is (placeRadiants()).
  let showersNow = [];
  const _upView = new THREE.Vector3();
  const _viewInv = new THREE.Matrix4();
  // sky/groundsky.js, once it has loaded; null before that and in a test with no DOM.
  let ground = null;
  let groundAsked = 0;
  let groundKey = '';
  let pendingPass = null;
  const domElement =
    options.domElement || ctx.domElement || ctx.renderer?.domElement || null;

  let isActive = false;
  let observer = null;
  let observerA = null; // astronomy-engine Observer
  let saved = null;
  let group = null;

  // Where the visitor is looking. Damped, so a drag or a gyroscope reads as a head turn.
  let azRad = 0;
  let altRad = 0.12;
  let dAz = 0;
  let dAlt = 0;

  let sunElDeg = -18;
  let sunAzDeg = 0;
  let sunSolvedAtMs = -Infinity;

  let moonElDeg = -90;
  let moonAzDeg = 0;
  let moonIllumFrac = 0;
  let moonSolvedAtMs = -Infinity;

  const sky = {
    horizon: new THREE.Color(),
    zenith: new THREE.Color(),
    loHorizon: new THREE.Color(),
    hiHorizon: new THREE.Color(),
    loZenith: new THREE.Color(),
    hiZenith: new THREE.Color(),
    warm: new THREE.Color(),
    hiWarm: new THREE.Color(),
    alpha: 0.14,
    glow: 0,
    horizonGlow: 0,
    moonBright: 0,
    name: 'night',
  };

  const _east = new THREE.Vector3();
  const _north = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _south = new THREE.Vector3();
  const _o = new THREE.Vector3();
  const _p = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _basis = new THREE.Matrix4();
  const _groundColour = new THREE.Color();
  const _nightLights = new THREE.Color(TOKENS.nightLights);
  const _dayGround = new THREE.Color(0x1c261a);

  let parts = null;

  // ------------------------------------------------------------------ scene position

  /** earth-fixed km -> scene, through the stage so this works in whatever frame it draws in. */
  function sceneOf(ecefKm, out) {
    const s = ctx.stage?.toScene?.(ecefKm, 'earth-fixed');
    if (s) return out.set(s.x, s.y, s.z);
    // No stage: treat earth-fixed kilometres as scene units. Degrades, does not go dark.
    return out.set(ecefKm.x, ecefKm.y, ecefKm.z);
  }

  /**
   * Observer position and the east/north/up basis, both measured in SCENE space by pushing three
   * nearby earth-fixed points through the stage and differencing. One kilometre is far enough to
   * beat float noise and small enough that the curvature error is under a milliradian.
   */
  function measureFrame() {
    const { latRad, lonRad, altKm } = observer;
    const base = geodeticToEcefKm(latRad, lonRad, altKm + EYE_HEIGHT_KM);
    sceneOf(base, _o);

    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinLon = Math.sin(lonRad);
    const cosLon = Math.cos(lonRad);
    const D = 1; // km

    sceneOf({ x: base.x - sinLon * D, y: base.y + cosLon * D, z: base.z }, _p);
    _east.copy(_p).sub(_o).normalize();
    sceneOf(
      {
        x: base.x - sinLat * cosLon * D,
        y: base.y - sinLat * sinLon * D,
        z: base.z + cosLat * D,
      },
      _p,
    );
    _north.copy(_p).sub(_o).normalize();
    sceneOf(
      {
        x: base.x + cosLat * cosLon * D,
        y: base.y + cosLat * sinLon * D,
        z: base.z + sinLat * D,
      },
      _p,
    );
    _up.copy(_p).sub(_o).normalize();
    _south.copy(_north).negate();
  }

  // ------------------------------------------------------------------ geometry

  function domeRadius() {
    const r = Number(options.domeRadius) || 1;
    const near = Number.isFinite(camera.near) ? camera.near : 0.001;
    const far = Number.isFinite(camera.far) ? camera.far : 1e7;
    return Math.min(Math.max(r, near * 50), far * 0.25);
  }

  function buildSkyDome(R) {
    const geo = new THREE.SphereGeometry(R, DOME_SEGMENTS, DOME_SEGMENTS / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uHorizon: { value: new THREE.Color(SKY_STOPS[0].horizon) },
        uZenith: { value: new THREE.Color(SKY_STOPS[0].zenith) },
        uGlow: { value: new THREE.Color(SKY_STOPS[0].warm) },
        uPollution: { value: new THREE.Color(TOKENS.nightLights) },
        uGlowStrength: { value: 0 },
        uHorizonGlowStrength: { value: 0 },
        uMoonGlow: { value: new THREE.Color(TOKENS.moonGlow) },
        uMoonBrightness: { value: 0 },
        uAlpha: { value: 0.14 },
        uSunDir: { value: new THREE.Vector3(0, -1, 0) },
        uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
        uSunHalo: { value: 0 },
      },
      vertexShader: `
        varying vec3 vLocal;
        void main() {
          vLocal = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uHorizon; uniform vec3 uZenith; uniform vec3 uGlow; uniform vec3 uPollution;
        uniform float uGlowStrength; uniform float uAlpha; uniform vec3 uSunDir; uniform vec3 uMoonDir;
        uniform float uHorizonGlowStrength; uniform vec3 uMoonGlow; uniform float uMoonBrightness;
        uniform float uSunHalo;
        varying vec3 vLocal;
        void main() {
          vec3 d = normalize(vLocal);
          float t = clamp(d.y, 0.0, 1.0);
          // pow < 1 keeps the horizon band wide, which is where all the colour is at twilight
          vec3 c = mix(uHorizon, uZenith, pow(t, 0.5));
          // Twilight's band: on the Sun's side of the sky, lying along the horizon.
          vec3 sun = normalize(uSunDir);
          float side = 0.5 + 0.5 * dot(normalize(d.xz + vec2(1e-5)), normalize(sun.xz + vec2(1e-5)));
          float band = uGlowStrength * (0.25 + 0.75 * pow(side, 2.5)) * exp(-t * (3.0 + 5.0 * (1.0 - side)));
          c = mix(c, uGlow, clamp(band, 0.0, 0.92));
          // The Sun's own aureole: tight, then wide, only while it is near or above the horizon.
          float toSun = max(dot(d, sun), 0.0);
          c += uGlow * uSunHalo * (0.9 * pow(toSun, 900.0) + 0.3 * pow(toSun, 90.0) + 0.12 * pow(toSun, 10.0));
          // Light pollution hugs the whole horizon, not just the sun's own bearing.
          // The mix is of light, not of screen values: two per cent here is already a visible band.
          float pollution = uHorizonGlowStrength * pow(1.0 - t, 8.0);
          c = mix(c, uPollution, clamp(pollution, 0.0, 0.85));
          // Moonlight lifts the whole dome a little and most of all around the Moon itself.
          float toMoon = max(dot(d, normalize(uMoonDir)), 0.0);
          c = mix(c, uMoonGlow, uMoonBrightness * (0.05 + 0.06 * pow(toMoon, 6.0) + 0.1 * pow(toMoon, 300.0)));
          float a = uAlpha * mix(1.0, 0.86, t);
          a = clamp(a + uMoonBrightness * 0.25, 0.0, 1.0);
          if (uAlpha >= 0.999) a = 1.0;
          gl_FragColor = vec4(c, a);
          #include <colorspace_fragment>
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -100; // painted before everything, so records draw over it
    return mesh;
  }

  /** A soft dark skyline: an opaque cap from just under the silhouette down to the nadir. */
  function buildGround(R) {
    const seg = HORIZON_SEGMENTS;
    const rings = [
      { d: 0.1 * DEG2RAD, alpha: 0.0 }, // a tenth of a degree of soft edge, so it is a skyline and not a haze
      { d: 0.0, alpha: 1.0 },
      { d: -1.6 * DEG2RAD, alpha: 1.0 },
    ];
    const pos = [];
    const alpha = [];
    const idx = [];
    const rowLen = seg + 1;

    for (let r = 0; r < rings.length; r += 1) {
      for (let i = 0; i <= seg; i += 1) {
        const az = (i / seg) * Math.PI * 2;
        const alt = skylineAlt(az) + rings[r].d;
        localDir(az, alt, _dir).multiplyScalar(R * 0.99);
        pos.push(_dir.x, _dir.y, _dir.z);
        alpha.push(rings[r].alpha);
      }
    }
    // The nadir cap, one ring at -30 degrees and a pole.
    const nadirRingStart = rings.length * rowLen;
    for (let i = 0; i <= seg; i += 1) {
      const az = (i / seg) * Math.PI * 2;
      localDir(az, -30 * DEG2RAD, _dir).multiplyScalar(R * 0.99);
      pos.push(_dir.x, _dir.y, _dir.z);
      alpha.push(1);
    }
    const poleIdx = pos.length / 3;
    pos.push(0, -R * 0.99, 0);
    alpha.push(1);

    const bands = [
      [0, 1],
      [1, 2],
      [2, nadirRingStart / rowLen],
    ];
    for (const [a, b] of bands) {
      for (let i = 0; i < seg; i += 1) {
        const ia = a * rowLen + i;
        const ib = b * rowLen + i;
        idx.push(ia, ib, ia + 1, ia + 1, ib, ib + 1);
      }
    }
    for (let i = 0; i < seg; i += 1) {
      idx.push(nadirRingStart + i, poleIdx, nadirRingStart + i + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alpha, 1));
    geo.setIndex(idx);

    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(TOKENS.spaceEdge) } },
      vertexShader: `
        attribute float aAlpha; varying float vA;
        void main() { vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: `
        uniform vec3 uColor; varying float vA;
        void main() { gl_FragColor = vec4(uColor, vA); }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 100; // over everything: you cannot see what is below your horizon
    return mesh;
  }

  function lineSegments(points, colour, opacity, renderOrder) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const mat = new THREE.LineBasicMaterial({
      color: colour,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
    });
    const obj = new THREE.LineSegments(geo, mat);
    obj.frustumCulled = false;
    obj.renderOrder = renderOrder;
    return obj;
  }

  /** The horizon ring plus an azimuth tick every 30 degrees, cardinals longer. */
  function buildHorizon(R) {
    const pts = [];
    const push = (az, alt) => {
      localDir(az, alt, _dir).multiplyScalar(R * 0.97);
      pts.push(_dir.x, _dir.y, _dir.z);
    };
    for (let i = 0; i < HORIZON_SEGMENTS; i += 1) {
      push((i / HORIZON_SEGMENTS) * Math.PI * 2, 0);
      push(((i + 1) / HORIZON_SEGMENTS) * Math.PI * 2, 0);
    }
    for (let d = 0; d < 360; d += 30) {
      const az = d * DEG2RAD;
      const cardinal = d % 90 === 0;
      push(az, (cardinal ? -3.2 : -1.5) * DEG2RAD);
      push(az, (cardinal ? 3.2 : 1.5) * DEG2RAD);
    }
    return lineSegments(pts, TOKENS.textDim, 0.42, 101);
  }

  /** Altitude ticks every 30 degrees, on every 30 degrees of azimuth, plus faint arcs to join them. */
  function buildAltitudeTicks(R) {
    const ticks = [];
    const arcs = [];
    const pushTo = (arr, az, alt) => {
      localDir(az, alt, _dir).multiplyScalar(R * 0.97);
      arr.push(_dir.x, _dir.y, _dir.z);
    };
    for (const altDeg of [30, 60]) {
      for (let d = 0; d < 360; d += 30) {
        const az = d * DEG2RAD;
        const half = (d % 90 === 0 ? 2.6 : 1.4) * DEG2RAD;
        pushTo(ticks, az - half, altDeg * DEG2RAD);
        pushTo(ticks, az + half, altDeg * DEG2RAD);
      }
      // A dashed arc: draw every other segment.
      const n = 120;
      for (let i = 0; i < n; i += 2) {
        pushTo(arcs, (i / n) * Math.PI * 2, altDeg * DEG2RAD);
        pushTo(arcs, ((i + 1) / n) * Math.PI * 2, altDeg * DEG2RAD);
      }
    }
    // The zenith, a small cross.
    for (const az of [0, Math.PI / 2]) {
      pushTo(ticks, az, 87 * DEG2RAD);
      pushTo(ticks, az + Math.PI, 87 * DEG2RAD);
    }
    return {
      ticks: lineSegments(ticks, TOKENS.textDim, 0.34, 101),
      arcs: lineSegments(arcs, TOKENS.textDim, 0.13, 101),
    };
  }

  function buildCardinals(R) {
    const g = new THREE.Group();
    const letters = [
      ['N', 0],
      ['E', 90],
      ['S', 180],
      ['W', 270],
    ];
    for (const [letter, azDeg] of letters) {
      const tex = makeLetterTexture(letter);
      if (!tex) continue;
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      // sizeAttenuation stays on, and the sprite sits at a fixed radius, so it subtends a
      // constant angle: about 3 degrees tall whatever the dome radius is.
      const s = R * 0.055;
      sprite.scale.set(s, s, 1);
      localDir(azDeg * DEG2RAD, 4.2 * DEG2RAD, _dir).multiplyScalar(R * 0.95);
      sprite.position.copy(_dir);
      sprite.renderOrder = 102;
      sprite.frustumCulled = false;
      g.add(sprite);
    }
    return g;
  }

  function build() {
    const R = domeRadius();
    group = new THREE.Group();
    group.name = 'sky-from-here';
    group.frustumCulled = false;
    const dome = buildSkyDome(R);
    const ground = buildGround(R);
    const horizon = buildHorizon(R);
    const { ticks, arcs } = buildAltitudeTicks(R);
    const cardinals = buildCardinals(R);
    const radiants = new THREE.Group();
    radiants.name = 'sky-radiants';
    group.add(dome, ground, horizon, ticks, arcs, cardinals, radiants);
    parts = { R, dome, ground, horizon, ticks, arcs, cardinals, radiants };
    radiantsFor = null;
  }

  // The radiants of the showers near their peak, re-placed once a minute: a radiant moves across
  // the sky at the stars' pace, a quarter of a degree a minute.
  let radiantsFor = null;   // the local date the sprites were made for
  let radiantsAt = -Infinity;
  function placeRadiants(tMs) {
    if (!parts || !parts.radiants || !observer) return;
    const day = `${new Date(tMs).toDateString()}|${(held && held.radiant) || ''}`;
    if (radiantsFor !== day) {
      for (const s of [...parts.radiants.children]) { s.material.map?.dispose?.(); s.material.dispose(); parts.radiants.remove(s); }
      // The showers near their peak, and the one a trip stop is about (hold()) whatever the date.
      const marked = activeShowers(tMs, SHOWERS);
      const asked = held && held.radiant ? SHOWERS.find((sh) => sh.id === held.radiant) : null;
      if (asked && !marked.includes(asked)) marked.push(asked);
      for (const sh of marked) {
        const tex = makeRadiantTexture(t(COPY.sky.radiant, { name: sh.display }));
        if (!tex) continue;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
        const h = parts.R * 0.05; // the cardinals are 0.055; a name of this length needs about as much
        sprite.scale.set(h * 8, h, 1);
        sprite.center.set(32 / 512, 0.5); // the ring, not the middle of the name, sits on the point
        sprite.renderOrder = 102;
        sprite.frustumCulled = false;
        sprite.userData.shower = sh;
        parts.radiants.add(sprite);
      }
      radiantsFor = day;
      radiantsAt = -Infinity;
    }
    if (tMs - radiantsAt < 60e3 && tMs >= radiantsAt) return;
    radiantsAt = tMs;
    const where = { latRad: observer.latDeg * DEG2RAD, lonRad: observer.lonDeg * DEG2RAD };
    showersNow = [];
    for (const sprite of parts.radiants.children) {
      const sh = sprite.userData.shower;
      const aa = radiantAltAz(sh, tMs, where);
      sprite.visible = !!aa && aa.altDeg > 0;
      if (!aa) continue;
      showersNow.push({ id: sh.id, display: sh.display, zhr: sh.zhr, vKms: sh.v_kms, altDeg: aa.altDeg, azDeg: aa.azDeg, held: !!held && held.radiant === sh.id });
      localDir(aa.azDeg * DEG2RAD, aa.altDeg * DEG2RAD, _dir).multiplyScalar(parts.R * 0.94);
      sprite.position.copy(_dir);
    }
  }

  function disposeGroup() {
    if (!group) return;
    group.traverse((o) => {
      o.geometry?.dispose?.();
      const m = o.material;
      if (Array.isArray(m)) m.forEach((x) => x?.dispose?.());
      else {
        m?.map?.dispose?.();
        m?.dispose?.();
      }
    });
    if (ground) { try { ground.dispose(); } catch { /* already gone */ } ground = null; }
    lastTap = null;
    veilWorlds(false);
    groundAsked += 1; // an import still in flight belongs to a view that has closed
    group.parent?.remove(group);
    group = null;
    parts = null;
  }

  // ------------------------------------------------------------------ the Sun

  function solveSun(tMs) {
    if (!observerA) return;
    if (Math.abs(tMs - sunSolvedAtMs) < SUN_REFRESH_MS) return;
    sunSolvedAtMs = tMs;
    const date = new Date(tMs);
    // astronomy-engine, not a low-precision series: the whole gradient hangs off this number.
    const eq = Astronomy.Equator(Astronomy.Body.Sun, date, observerA, true, true);
    const hor = Astronomy.Horizon(date, observerA, eq.ra, eq.dec, 'normal');
    sunElDeg = hor.altitude;
    sunAzDeg = hor.azimuth;
  }

  // Moves 0.5 degrees an hour, far slower than the Sun needs watching for; the same clock-driven
  // refresh keeps this off the hot path.
  function solveMoon(tMs) {
    if (!observerA) return;
    if (Math.abs(tMs - moonSolvedAtMs) < SUN_REFRESH_MS) return;
    moonSolvedAtMs = tMs;
    const date = new Date(tMs);
    const eq = Astronomy.Equator(Astronomy.Body.Moon, date, observerA, true, true);
    const hor = Astronomy.Horizon(date, observerA, eq.ra, eq.dec, 'normal');
    moonElDeg = hor.altitude;
    moonAzDeg = hor.azimuth;
    moonIllumFrac = Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction;
  }

  function applySky() {
    skyAt(sunElDeg, sky);
    sky.horizonGlow = horizonGlowStrength(sunElDeg, ground ? worn().darkness : undefined);
    sky.moonBright = moonBrightness(moonElDeg, moonIllumFrac);
    const u = parts?.dome?.material?.uniforms;
    if (u) {
      u.uHorizon.value.copy(sky.horizon);
      u.uZenith.value.copy(sky.zenith);
      u.uGlow.value.copy(sky.warm);
      // With the ground sky up the dome is the whole background: it hides the orbital scene's sky.
      u.uAlpha.value = ground ? 1 : sky.alpha;
      u.uGlowStrength.value = sky.glow;
      u.uHorizonGlowStrength.value = sky.horizonGlow;
      u.uMoonBrightness.value = sky.moonBright;
      // The aureole: full from the horizon up, gone by the end of civil twilight.
      u.uSunHalo.value = Math.max(0, Math.min(1, (sunElDeg + 6) / 6));
      localDir(sunAzDeg * DEG2RAD, sunElDeg * DEG2RAD, u.uSunDir.value);
      localDir(moonAzDeg * DEG2RAD, moonElDeg * DEG2RAD, u.uMoonDir.value);
    }
    // The skyline silhouette picks up the same warmth as the horizon it sits against, so the
    // ground reads as a lit skyline rather than a flat cut-out at night; by day it is land.
    const gu = parts?.ground?.material?.uniforms?.uColor;
    if (gu) {
      const day = Math.max(0, Math.min(1, (sunElDeg + 8) / 14));
      _groundColour.setHex(TOKENS.spaceEdge).lerp(_dayGround, day * 0.9).lerp(_nightLights, sky.horizonGlow * 0.5);
      gu.value.copy(_groundColour);
    }
    if (parts) {
      // The ground sky brings its own air and land (sky/skyair.js, sky/landscape.js).
      parts.dome.visible = !ground;
      parts.ground.visible = !ground;
      // The 30 and 60 degree arcs were the only grid there was; the ground sky has its own.
      parts.ticks.visible = !ground;
      parts.arcs.visible = !ground;
    }
  }

  // ------------------------------------------------------------------ the ground sky

  /** Import and build sky/groundsky.js for this place, once per entry. Nothing without a DOM. */
  function askGround() {
    if (ground || typeof document === 'undefined' || options.ground === false) return;
    const mine = ++groundAsked;
    const forObserver = observer;
    import('./groundsky.js').then((m) => {
      if (mine !== groundAsked || !isActive || !group || !parts || observer !== forObserver) return;
      ground = m.createGroundSky(ctx, { group, radius: parts.R, observer, domElement, options: worn(), pointAt });
      veilWorlds(true);
      if (pendingPass) { ground.showPass(pendingPass.track, pendingPass.marks); }
      tell();
    }).catch((e) => console.warn('the ground sky did not load', e));
  }

  /**
   * The orbital scene's worlds, out of the way while the ground sky draws its own. The dome hides
   * what is opaque; Saturn's ring, the atmospheres and the Sun's glow are transparent and draw
   * after it, so the whole group is switched off and back on (scene/worlds.js never touches its
   * root's visibility).
   */
  function veilWorlds(on) {
    const root = ctx.worlds && ctx.worlds.root;
    if (root) root.visible = !on;
  }

  /**
   * The satellites' dots in the same air as the stars (internal #393): scene/glyphs.js lifts and
   * dims them in its shader once it knows which way is up for the eye. `null` hands them back.
   */
  function skyGlyphs(on) {
    const layers = ctx.glyphLayers;
    if (!layers || typeof layers.values !== 'function') return;
    if (on) {
      _viewInv.copy(camera.matrixWorld).invert();
      _upView.copy(_up).transformDirection(_viewInv);
    }
    for (const gl of layers.values()) if (gl && typeof gl.setSky === 'function') gl.setSky(on ? _upView : null);
  }

  /**
   * ONE APPARENT PLACE (internal #418): where the air puts something. `apparent(p)` lifts a scene
   * position in place, as scene/glyphs.js's shader lifts a satellite's dot, so its name (ui/labels.js)
   * sits on the dot; `trueNdc(x, y)` takes a tap the other way, to where the thing under it is
   * before the air, so the pick (main.js) finds what the eye was on.
   */
  function airShift(p, sign) {
    const d = _dir.copy(p).sub(_o);
    const dist = d.length();
    if (!(dist > 0)) return p;
    d.divideScalar(dist);
    const sinAlt = THREE.MathUtils.clamp(d.dot(_up), -1, 1);
    const alt = Math.asin(sinAlt);
    const to = alt + sign * refractionDeg(alt * RAD2DEG) * DEG2RAD;
    const level = d.addScaledVector(_up, -sinAlt);
    const n = level.length();
    if (n < 1e-6) return p;
    return p.copy(level).multiplyScalar(Math.cos(to) / n).addScaledVector(_up, Math.sin(to)).multiplyScalar(dist).add(_o);
  }
  function trueNdc(x, y) {
    airShift(_p.set(x, y, 0.5).unproject(camera), -1).project(camera);
    return [_p.x, _p.y];
  }

  /**
   * How dark the sky of this place is likely to be, from the night lights of the Earth
   * (sky/skyglow.js), asked once per place and only while the visitor has not chosen for themselves.
   * Nothing is sent anywhere: the map is one of the site's own textures.
   */
  function askPlaceSky() {
    if (typeof document === 'undefined' || !observer || skyOptions.darknessBy !== 'place' || options.glow === false) return;
    const key = `${observer.latDeg.toFixed(3)},${observer.lonDeg.toFixed(3)}`;
    if (placeSkyAsked === key) return;
    placeSkyAsked = key;
    placeSky = null;
    const saving = typeof navigator !== 'undefined' && !!(navigator.connection && navigator.connection.saveData);
    if (saving) { placeSky = { key, id: null, lights: null }; tell(); return; }
    const at = observer;
    import('./skyglow.js').then(async (m) => {
      const lights = await m.sampleNightLights(String(new URL('../../textures/4k/earth_night.webp', import.meta.url)), at.latDeg, at.lonDeg);
      if (placeSkyAsked !== key) return;
      placeSky = { key, id: m.darknessFromLights(lights), lights };
      if (ground) ground.setOptions(worn());
      tell();
    }).catch(() => { if (placeSkyAsked === key) { placeSky = { key, id: null, lights: null }; tell(); } });
  }

  /** Say what changed, to whoever draws the controls (ui/tonight.js): the field and the choices. */
  function tell() {
    fovTold = fov;
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') return;
    window.dispatchEvent(new CustomEvent('sr:sky', { detail: { fovDeg: fovWant, field: fovName(fovWant), options: { ...skyOptions }, darkness: darknessNow(), active: isActive, pointing: pointingNow() } }));
  }

  function applyRed() {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('sr-night-red', isActive && !!skyOptions.red);
  }

  function setOption(key, value) {
    if (!(key in SKY_OPTION_DEFAULTS)) return false;
    if (key === 'darkness') { if (!DARKNESS_IDS.includes(value)) return false; }
    else if (key === 'culture') { if (!CULTURE_IDS.includes(value)) return false; }
    else if (key === 'darknessBy') { if (!DARKNESS_BY.includes(value)) return false; }
    else value = !!value;
    // Picking a kind of sky is the visitor overruling the map, even when it is the one the map chose.
    const overrule = key === 'darkness' && skyOptions.darknessBy !== 'you';
    if (skyOptions[key] === value && !overrule) return false;
    skyOptions[key] = value;
    if (key === 'darkness') skyOptions.darknessBy = 'you';
    if (key === 'darknessBy' && value === 'place' && isActive) askPlaceSky();
    writeSkyOptions(storage, skyOptions);
    if (ground) ground.setOptions(worn());
    applyRed();
    tell();
    return true;
  }

  /**
   * Hold a kind of sky and a shower's radiant for a trip stop, or let both go with `null`:
   * `{ darkness: 'city' | 'town' | 'dark', radiant: <registry/showers.yaml id> }`, either or
   * neither. The visitor's stored choices are not touched and the panel still shows them.
   */
  function hold(over) {
    const darkness = over && DARKNESS_IDS.includes(over.darkness) ? over.darkness : null;
    const radiant = over && typeof over.radiant === 'string' && SHOWERS.some((sh) => sh.id === over.radiant) ? over.radiant : null;
    const next = darkness || radiant ? { darkness, radiant } : null;
    if ((held && held.darkness) === (next && next.darkness) && (held && held.radiant) === (next && next.radiant)) return false;
    held = next;
    radiantsFor = null;
    if (ground) ground.setOptions(worn());
    return true;
  }

  function setFov(deg, { instant = false } = {}) {
    fovWant = clampFov(deg);
    if (instant) fov = fovWant;
    tell();
  }

  // ------------------------------------------------------------------ looking around

  function lookBy(dAzRad, dAltRad) {
    dAz += dAzRad;
    dAlt += dAltRad;
  }

  function lookAtAngles(azR, altR) {
    // While the phone is the view, the visitor turns to a thing; the ring still marks it.
    if (pointing) return;
    if (Number.isFinite(azR)) {
      dAz = 0;
      azRad = azR;
    }
    if (Number.isFinite(altR)) {
      dAlt = 0;
      altRad = THREE.MathUtils.clamp(altR, -20 * DEG2RAD, 89 * DEG2RAD);
    }
  }

  /** Point the view at a pass, or at anything with an azimuth and an altitude in degrees. */
  function lookAtDeg(azDeg, altDeg) {
    lookAtAngles(azDeg * DEG2RAD, altDeg * DEG2RAD);
  }

  /**
   * Turn to something and ring it: `{azDeg, altDeg}`, or `{body: 'saturn'}` for the Sun, the Moon
   * or a planet (where the air puts it now). `fovDeg` closes or opens the field on the way.
   * Returns false when the body is under the horizon or unknown.
   */
  function pointAt(target, opts = {}) {
    if (!target) return false;
    let where = null;
    let dirOf = null;
    if (target.body) {
      const read = () => (ground ? ground.apparentOf(target.body) : null);
      // Worked out here and now, not read from the last frame: the clock may just have jumped.
      if (observerA) {
        try {
          const date = new Date(ctx.clock?.now?.() ?? Date.now());
          const name = String(target.body).charAt(0).toUpperCase() + String(target.body).slice(1);
          const eq = Astronomy.Equator(name, date, observerA, true, true);
          const hor = Astronomy.Horizon(date, observerA, eq.ra, eq.dec, 'normal');
          where = { azDeg: hor.azimuth, altDeg: hor.altitude };
        } catch { where = null; }
      }
      if (!where || where.altDeg < 0) return false;
      dirOf = () => { const w = read() || where; const v = new THREE.Vector3(); localDir(w.azDeg * DEG2RAD, w.altDeg * DEG2RAD, v); return [v.x, v.y, v.z]; };
    } else if (Array.isArray(target.dirEq) || (Number.isFinite(target.raDeg) && Number.isFinite(target.decDeg))) {
      // A place among the stars (J2000): a star, a nebula, a galaxy. The ground sky knows where the
      // air puts it; before it has loaded, Astronomy Engine's horizon is within a degree of that.
      let d = target.dirEq;
      if (!d) {
        const a = target.raDeg * DEG2RAD;
        const c = Math.cos(target.decDeg * DEG2RAD);
        d = [c * Math.cos(a), c * Math.sin(a), Math.sin(target.decDeg * DEG2RAD)];
      }
      // Worked out here and now, as for a body: the clock may just have jumped, and the ground
      // sky's own matrix is the last frame's. The ring that follows it reads the ground sky.
      const now = () => {
        if (!observerA) return null;
        try {
          const date = new Date(ctx.clock?.now?.() ?? Date.now());
          const v = Astronomy.RotateVector(Astronomy.Rotation_EQJ_HOR(date, observerA), new Astronomy.Vector(d[0], d[1], d[2], Astronomy.MakeTime(date)));
          const hor = Astronomy.HorizonFromVector(v, 'normal');
          return { azDeg: hor.lon, altDeg: hor.lat };
        } catch { return null; }
      };
      const read = () => (ground && typeof ground.apparentOfEq === 'function' ? ground.apparentOfEq(d) : now());
      where = now() || read();
      if (!where || where.altDeg < 0) return false;
      dirOf = () => { const w = read() || where; const v = new THREE.Vector3(); localDir(w.azDeg * DEG2RAD, w.altDeg * DEG2RAD, v); return [v.x, v.y, v.z]; };
    } else if (Number.isFinite(target.azDeg) && Number.isFinite(target.altDeg)) {
      where = target;
      const v = new THREE.Vector3();
      localDir(where.azDeg * DEG2RAD, where.altDeg * DEG2RAD, v);
      dirOf = () => [v.x, v.y, v.z];
    } else return false;
    lookAtDeg(where.azDeg, where.altDeg);
    if (Number.isFinite(opts.fovDeg)) setFov(opts.fovDeg, { instant: opts.instant === true });
    if (ground && opts.mark !== false) ground.mark(dirOf);
    return true;
  }

  /**
   * Turn the sky to a record (the search box, internal #393 finding 7): the Sun, the Moon or a
   * planet where it is now; a star, a nebula, a galaxy or a planet of another star at its place
   * among the stars. Returns 'shown', 'below' (it is under the horizon now) or null (not a thing
   * with a place in this sky: a satellite, whose own glyph is already there).
   */
  function pointAtRecord(record, opts = {}) {
    if (!record || !isActive) return null;
    if (record.klass === 'world') {
      if (record.id === 'earth') return null;
      if (!SKY_BODIES.has(record.id)) return null;
      return pointAt({ body: record.id }, opts) ? 'shown' : 'below';
    }
    if (!['star', 'dso', 'exoplanet', 'exotic'].includes(record.klass)) return null;
    const p = record.pos;
    if (!p || !(Math.hypot(p.x, p.y, p.z) > 0)) return null;
    // `sun-inertial` is ecliptic J2000; the sky's catalogue frame is equatorial J2000.
    const n = Math.hypot(p.x, p.y, p.z);
    const dirEq = [p.x / n, (p.y * COS_OBLIQUITY - p.z * SIN_OBLIQUITY) / n, (p.y * SIN_OBLIQUITY + p.z * COS_OBLIQUITY) / n];
    return pointAt({ dirEq }, opts) ? 'shown' : 'below';
  }

  /**
   * WHAT IS THAT (check 6 against Stellarium). A tap on the sky names the nearest star, planet or
   * deep-sky object in a small tag under it; the same thing tapped again, or the tag pressed, opens
   * its card. Returns true when the tap was answered here (main.js then leaves the selection alone).
   * A star has a card when it is one of the 3 390 with a name; the rest are named by their magnitude.
   */
  let lastTap = null;
  let starDirs = null;
  function recordOf(what) {
    if (what.kind === 'body' || what.kind === 'dso') return typeof ctx.recordById === 'function' ? ctx.recordById(what.id) : null;
    const list = ctx.stars3d && typeof ctx.stars3d.records === 'function' ? ctx.stars3d.records() : [];
    if (!list || !list.length) return null;
    if (!starDirs || starDirs.n !== list.length) {
      const dirs = new Float32Array(list.length * 3);
      list.forEach((r, i) => {
        const p = r.pos || {};
        const n = Math.hypot(p.x, p.y, p.z) || 1;
        // `sun-inertial` is ecliptic J2000; the sky's catalogue frame is equatorial J2000.
        dirs[i * 3] = p.x / n;
        dirs[i * 3 + 1] = (p.y * COS_OBLIQUITY - p.z * SIN_OBLIQUITY) / n;
        dirs[i * 3 + 2] = (p.y * SIN_OBLIQUITY + p.z * COS_OBLIQUITY) / n;
      });
      starDirs = { n: list.length, dirs };
    }
    let best = -1;
    let bestCos = Math.cos(0.05 * DEG2RAD);
    const d = what.dirEq;
    for (let i = 0; i < starDirs.n; i += 1) {
      const c = starDirs.dirs[i * 3] * d[0] + starDirs.dirs[i * 3 + 1] * d[1] + starDirs.dirs[i * 3 + 2] * d[2];
      if (c > bestCos) { bestCos = c; best = i; }
    }
    return best >= 0 ? list[best] : null;
  }
  function tagWords(what, record) {
    if (what.words) return what.words; // a tap on empty sky: the constellation (sky/groundsky.js)
    const W = COPY.sky.what;
    const mag = Number.isFinite(what.mag) ? fmt.num(what.mag, 1) : null;
    const name = what.name || (record && record.name) || W.star;
    let sub;
    if (what.kind === 'body') sub = what.id === 'sun' ? W.sun : what.id === 'moon' ? W.moon : t(W.planet, { mag });
    else if (what.kind === 'star') sub = t(W.starMag, { mag });
    else sub = mag ? t(W.dsoMag, { kind: (record && record.meta && record.meta.typeText) || W.dso, mag }) : ((record && record.meta && record.meta.typeText) || W.dso);
    return { name, sub, label: t(record ? W.open : W.plain, { name, sub }), title: record ? W.openTitle : '' };
  }
  function openTagged(what) {
    const record = what && what.record;
    if (record && typeof ctx.select === 'function') ctx.select(record, { from: 'pick' });
    if (ground) ground.hideTag();
    lastTap = null;
  }
  function tapSky(clientX, clientY) {
    if (!isActive || !ground || typeof ground.whatAt !== 'function' || !domElement?.getBoundingClientRect) return false;
    const what = ground.whatAt(clientX, clientY, camera, domElement.getBoundingClientRect());
    if (!what) { ground.hideTag(); lastTap = null; return false; }
    const key = what.kind === 'star' ? `star:${what.dirEq.map((v) => v.toFixed(5)).join(',')}` : `${what.kind}:${what.id}`;
    if (lastTap && lastTap.key === key && ground.tagged()) {
      const again = lastTap.what;
      if (again.record) { openTagged(again); return true; }
      return true; // no card to open: the tag stays, and says all there is
    }
    what.record = recordOf(what);
    ground.showTag(what, tagWords(what, what.record), openTagged);
    lastTap = { key, what };
    return what.kind !== 'sky'; // empty sky is named, and still deselects (main.js)
  }

  /**
   * POINT YOUR PHONE (internal #450). `pointPhone(true)` must be called from the tap itself: iOS
   * gives its permission prompt only to a user gesture, so the request is made here and now, before
   * the module (sky/pointing.js, with the magnetic model) has even been fetched. Resolves to
   * { ok: true } or { ok: false, why: 'denied' | 'none' | 'unsupported' | 'place' }; a refusal
   * leaves the drag view exactly as it was. `pointPhone(false)` lets go of the sensor and the wake lock.
   */
  function pointingNow() {
    const s = pointing ? pointing.state : null;
    return s ? { ...s, why: '' } : { on: false, why: pointWhy };
  }
  function showReticle(on) {
    if (typeof document === 'undefined' || !document.createElement) return;
    if (on && !reticle) {
      reticle = document.createElement('div');
      reticle.className = 'sr-skyreticle';
      reticle.setAttribute('aria-hidden', 'true');
      (domElement && domElement.parentNode ? domElement.parentNode : document.body).appendChild(reticle);
    }
    if (reticle) reticle.hidden = !on;
    if (document.documentElement && document.documentElement.classList) document.documentElement.classList.toggle('sr-pointing', !!on);
  }
  function pointPhone(want) {
    if (!want) {
      pointAsked += 1;
      const was = pointing;
      pointing = null;
      if (was) { try { was.stop(); } catch { /* gone */ } }
      showReticle(false);
      if (was && lastTap && lastTap.auto && ground) { ground.hideTag(); lastTap = null; }
      if (was) tell();
      return Promise.resolve({ ok: true });
    }
    if (pointing) return Promise.resolve({ ok: true });
    const fail = (why) => { pointWhy = why; tell(); return { ok: false, why }; };
    if (!isActive || !observer) return Promise.resolve(fail('place'));
    const D = typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined;
    if (typeof D === 'undefined') return Promise.resolve(fail('unsupported'));
    let permission = null;
    if (typeof D.requestPermission === 'function') {
      try { permission = Promise.resolve(D.requestPermission()).catch(() => 'denied'); } catch { permission = Promise.resolve('denied'); }
    }
    const mine = ++pointAsked;
    const forObserver = observer;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return import('./pointing.js').then(async (m) => {
      const src = m.createPointing({
        observer: forObserver, permission, reduced,
        startLook: { azDeg: azRad * RAD2DEG, altDeg: altRad * RAD2DEG },
        onChange: () => { if (pointing === src) tell(); },
      });
      const got = await src.start();
      if (!got.ok) return mine === pointAsked ? fail(got.why) : got;
      if (mine !== pointAsked || !isActive || observer !== forObserver) { src.stop(); return { ok: false, why: 'stopped' }; }
      pointing = src;
      pointWhy = '';
      showReticle(true);
      tell();
      return got;
    }).catch(() => fail('unsupported'));
  }
  /**
   * What the phone is pointing at, named in the tag without a tap, twice a second: the same tag a
   * tap makes, so pressing it opens the card. Empty sky takes an automatic tag away again.
   */
  /**
   * Where the phone points, on the canvas (CSS px from its corner). Not its middle: on a phone the
   * picture is moved up into the band the sheet and the time pill leave free (scene/viewshift.js),
   * so the line of sight is drawn above the middle and the reticle belongs there.
   */
  const aimPx = { x: NaN, y: NaN };
  function placeReticle() {
    const w = domElement?.clientWidth || 0;
    const h = domElement?.clientHeight || 0;
    if (!w || !h) return;
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    _p.set(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(parts?.R ?? 1).add(camera.position).project(camera);
    const x = (_p.x * 0.5 + 0.5) * w;
    const y = (-_p.y * 0.5 + 0.5) * h;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (reticle && (Math.abs(x - aimPx.x) > 0.5 || Math.abs(y - aimPx.y) > 0.5)) {
      reticle.style.left = `${x.toFixed(1)}px`;
      reticle.style.top = `${y.toFixed(1)}px`;
    }
    aimPx.x = x;
    aimPx.y = y;
  }
  function nameCentre() {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - centreAt < 500 || !ground || typeof ground.whatAt !== 'function' || !domElement?.getBoundingClientRect) return;
    centreAt = now;
    const r = domElement.getBoundingClientRect();
    const what = Number.isFinite(aimPx.x) ? ground.whatAt(r.left + aimPx.x, r.top + aimPx.y, camera, r) : null;
    if (!what || what.kind === 'sky') {
      if (lastTap && lastTap.auto) { ground.hideTag(); lastTap = null; }
      return;
    }
    const key = what.kind === 'star' ? `star:${what.dirEq.map((v) => v.toFixed(5)).join(',')}` : `${what.kind}:${what.id}`;
    if (lastTap && lastTap.key === key && ground.tagged()) return;
    what.record = recordOf(what);
    ground.showTag(what, tagWords(what, what.record), openTagged);
    lastTap = { key, what, auto: true };
  }

  /** A deep-sky picture under a tap, as a record id (`dso-m42`), or null: main.js opens its card. */
  function pickSky(clientX, clientY) {
    if (!isActive || !ground || typeof ground.pickAt !== 'function' || !domElement?.getBoundingClientRect) return null;
    return ground.pickAt(clientX, clientY, camera, domElement.getBoundingClientRect());
  }

  /**
   * + and - zoom the sky, as the wheel does (internal #393 finding 7). The orbital camera reads the
   * same keys as "nearer" and "farther" (scene/camera.js); here the camera has no distance, so the
   * keys close and open the field instead. Not while typing, and not with a modifier (the
   * browser's own zoom).
   */
  function onKeyDown(e) {
    if (!isActive || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const tag = e.target && e.target.tagName ? String(e.target.tagName).toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
    if (e.key === '+' || e.key === '=') setFov(zoomFov(fovWant, 1 / KEY_ZOOM));
    else if (e.key === '-' || e.key === '_') setFov(zoomFov(fovWant, KEY_ZOOM));
    else return;
    e.preventDefault?.();
  }

  /** A pass drawn across the sky (ui/tonight.js works the track out): see groundsky.showPass. */
  function showPass(track, marks) {
    pendingPass = track ? { track, marks } : null;
    if (!ground) return;
    if (track) ground.showPass(track, marks);
    else ground.clearPass();
  }

  let drag = null;
  const touches = new Map();
  let pinch = null;
  function onPointerDown(e) {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, fov: fovWant };
      drag = null;
      return;
    }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    domElement?.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!isActive) return;
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size >= 2) {
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      setFov(pinch.fov * (pinch.d / d));
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    const h = domElement?.clientHeight || 800;
    // The sky follows the finger: a pixel is the same angle whatever the field is.
    const perPx = (fov * DEG2RAD) / h;
    // With the phone as the view a drag is "Line it up": the offset between its compass and the sky.
    if (pointing) pointing.dragBy(-(e.clientX - drag.x) * perPx * RAD2DEG, (e.clientY - drag.y) * perPx * RAD2DEG);
    else lookBy(-(e.clientX - drag.x) * perPx, (e.clientY - drag.y) * perPx);
    drag.x = e.clientX;
    drag.y = e.clientY;
  }
  function onPointerUp(e) {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    if (drag && drag.id === e.pointerId) drag = null;
    domElement?.releasePointerCapture?.(e.pointerId);
  }
  function onWheel(e) {
    if (!isActive) return;
    // The wheel is this view's zoom here, not the orbital camera's distance.
    e.preventDefault?.();
    e.stopImmediatePropagation?.();
    const dy = Math.max(-240, Math.min(240, Number(e.deltaY) || 0)) * (e.deltaMode === 1 ? 16 : 1);
    setFov(zoomFov(fovWant, Math.exp(dy * 0.0016)));
  }

  function attachInput() {
    if (!domElement?.addEventListener) return;
    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('pointercancel', onPointerUp);
    domElement.addEventListener('wheel', onWheel, { capture: true, passive: false });
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('keydown', onKeyDown);
  }
  function detachInput() {
    if (!domElement?.removeEventListener) return;
    domElement.removeEventListener('pointerdown', onPointerDown);
    domElement.removeEventListener('pointermove', onPointerMove);
    domElement.removeEventListener('pointerup', onPointerUp);
    domElement.removeEventListener('pointercancel', onPointerUp);
    domElement.removeEventListener('wheel', onWheel, { capture: true });
    if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('keydown', onKeyDown);
    touches.clear();
    pinch = null;
    drag = null;
  }

  // ------------------------------------------------------------------ enter / update / exit

  function enter(o) {
    const next = normaliseObserver(o) || normaliseObserver(ctx.observer);
    if (!next) return false;
    observer = next;
    observerA = new Astronomy.Observer(observer.latDeg, observer.lonDeg, observer.altKm * 1000);
    sunSolvedAtMs = -Infinity;
    moonSolvedAtMs = -Infinity;

    if (!isActive) {
      saved = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        fov: camera.fov,
        up: camera.up.clone(),
        rig: ctx.cameraRig?.saveState?.() ?? null,
      };
      ctx.cameraRig?.stopFollow?.();
      attachInput();
    }

    // A new place is a new sky: the ground layer is built for one observer.
    const key = `${observer.latDeg.toFixed(4)},${observer.lonDeg.toFixed(4)}`;
    if (ground && groundKey !== key) { try { ground.dispose(); } catch { /* gone */ } ground = null; veilWorlds(false); }
    // The declination was this place's: a new place switches the phone off rather than point wrong.
    if (pointing && groundKey !== key) pointPhone(false);
    groundKey = key;
    if (!group) build();
    if (group.parent !== scene) scene.add(group);

    if (!isActive) { fov = fovDeg; fovWant = fovDeg; }
    camera.fov = fov;
    camera.updateProjectionMatrix?.();

    // Open facing the equator. Low-orbit traffic is inclined at 50-100 degrees, so from a
    // northern latitude it all appears to the south, and the other way round below the equator.
    measureFrame();
    camera.up.copy(_up);
    azRad = observer.latDeg >= 0 ? Math.PI : 0;
    altRad = 12 * DEG2RAD;
    dAz = 0;
    dAlt = 0;

    isActive = true;
    ctx.starfield?.setLines?.(true);
    askGround();
    askPlaceSky();
    applyRed();
    update(ctx.clock?.now?.() ?? 0);
    tell();
    return true;
  }

  function update(tMs) {
    if (!isActive || !observer) return;
    const t = Number.isFinite(tMs) ? tMs : (ctx.clock?.now?.() ?? 0);

    measureFrame();
    solveSun(t);
    solveMoon(t);
    applySky();
    placeRadiants(t);

    // Damped look. No dt is passed in by the contract, so this is a fixed per-frame fraction --
    // it is a head turn, not scene state, so it does not need to be frame-rate exact.
    const k = 0.25;
    azRad += dAz * k;
    dAz *= 1 - k;
    altRad = THREE.MathUtils.clamp(altRad + dAlt * k, -20 * DEG2RAD, 89 * DEG2RAD);
    dAlt *= 1 - k;

    // The field eases to where the wheel left it, in ratio: zoom is multiplicative.
    if (fov !== fovWant) {
      fov = Math.abs(Math.log(fovWant / fov)) < 0.002 ? fovWant : fov * Math.pow(fovWant / fov, k);
      camera.fov = fov;
      camera.updateProjectionMatrix?.();
    } else if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix?.();
    }

    // Local basis into scene space: +X east, +Y up, +Z south.
    _basis.makeBasis(_east, _up, _south);
    group.position.copy(_o);
    group.quaternion.setFromRotationMatrix(_basis);
    group.updateMatrixWorld(true);

    camera.position.copy(_o);
    camera.up.copy(_up);
    const aimed = pointing ? pointing.sample(typeof performance !== 'undefined' ? performance.now() : Date.now()) : null;
    if (aimed) {
      // The phone's attitude in the local frame (east, up, south), roll and all; the angles are
      // read back from it so `look`, the labels and switching off all carry on from where it points.
      _q.set(aimed[0], aimed[1], aimed[2], aimed[3]);
      _dir.set(0, 0, -1).applyQuaternion(_q);
      altRad = Math.asin(THREE.MathUtils.clamp(_dir.y, -1, 1));
      if (Math.hypot(_dir.x, _dir.z) > 1e-4) azRad = Math.atan2(_dir.x, -_dir.z);
      dAz = 0;
      dAlt = 0;
      camera.quaternion.copy(group.quaternion).multiply(_q);
    } else {
      localDir(azRad, altRad, _dir).applyQuaternion(group.quaternion);
      camera.lookAt(_p.copy(_o).addScaledVector(_dir, parts?.R ?? 1));
    }
    camera.updateMatrixWorld?.(true);
    if (aimed) { placeReticle(); nameCentre(); }

    // A radiant's name keeps its size on the screen as the field closes (it is a mark, not a thing).
    if (parts && parts.radiants.children.length) {
      const k = parts.R * 0.05 * Math.min(1, fov / SKY_FOV_DEG);
      for (const sprite of parts.radiants.children) sprite.scale.set(k * 8, k, 1);
    }
    skyGlyphs(true);
    if (ground) {
      ground.update({ tMs: t, fovDeg: fov, sunAltDeg: sunElDeg, sunAzDeg, moonBright: sky.moonBright, camera, renderer: ctx.renderer, showers: showersNow });
    }
  }

  function exit() {
    if (!isActive) return;
    pointPhone(false);
    isActive = false;
    held = null;
    showersNow = [];
    skyGlyphs(false);
    ctx.starfield?.setLines?.(false);
    detachInput();
    disposeGroup();
    pendingPass = null;
    applyRed();
    tell();
    if (saved) {
      camera.up.copy(saved.up);
      camera.fov = saved.fov;
      camera.updateProjectionMatrix?.();
      camera.position.copy(saved.position);
      camera.quaternion.copy(saved.quaternion);
      // The camera is exactly where the rig left it, so the rig only needs to re-read it -- a
      // flight back would be a flight to where we already are.
      if (saved.rig?.target) ctx.cameraRig?.setTarget?.(saved.rig.target);
      else ctx.cameraRig?.sync?.();
      saved = null;
    }
  }

  return {
    enter,
    exit,
    update,
    get active() {
      return isActive;
    },

    // beyond the contract, additive: what the tilt handler, the pass cards and status need.
    get observer() {
      return observer;
    },
    get sun() {
      return { elevationDeg: sunElDeg, azimuthDeg: sunAzDeg, phase: sunPhaseName(sunElDeg) };
    },
    get look() {
      return { azimuthDeg: (((azRad * RAD2DEG) % 360) + 360) % 360, altitudeDeg: altRad * RAD2DEG };
    },
    lookBy,
    lookAtDeg,
    pointPhone,
    /** The phone as the view: { on, kind, accuracyDeg, declinationDeg, offsetAzDeg, offsetTiltDeg, why }. */
    get pointing() {
      return pointingNow();
    },
    /** Forget "Line it up": the compass's own north again. */
    resetPointing: () => { if (pointing) pointing.resetOffset(); },
    /** The brightest of the Moon and the planets well up now, to line the compass up on: an id, or null. */
    lineUpTarget() {
      if (!ground) return null;
      let best = null;
      for (const id of ['moon', 'venus', 'jupiter', 'mars', 'saturn']) {
        const a = ground.apparentOf(id);
        if (a && a.altDeg > 8 && (id === 'moon' || a.mag < 1.5) && (!best || a.mag < best.mag)) best = { id, mag: a.mag };
      }
      return best ? best.id : null;
    },
    // the field of view, the choices, and what the Tonight list asks for (2026-10-05)
    get fovDeg() {
      return fovWant;
    },
    get field() {
      return fovName(fovWant);
    },
    setFov,
    /** The planet or the Moon at the centre and the width of the round field that frames it, or null (#351). */
    bodyAtCentre: () => (ground && typeof ground.bodyNear === 'function' ? ground.bodyNear(azRad * RAD2DEG, altRad * RAD2DEG) : null),
    zoomBy: (factor) => setFov(zoomFov(fovWant, factor)),
    get options() {
      return { ...skyOptions };
    },
    setOption,
    hold,
    /** What a trip stop is holding over the stored choices, or null: for the test and a probe. */
    get held() {
      return held ? { ...held } : null;
    },
    pointAt,
    pointAtRecord,
    apparent: (p) => (isActive && ground ? airShift(p, 1) : p),
    trueNdc: (x, y) => (isActive && ground ? trueNdc(x, y) : [x, y]),
    pickSky,
    tapSky,
    /** The kind of sky drawn now and who chose it: { id, by: 'place' | 'you' | 'trip' | 'reading' | 'unread', lights }. */
    get darkness() {
      return darknessNow();
    },
    /** The showers whose meteors are being drawn and how many an hour this sky would show, or null. */
    get meteors() {
      // The ground sky's own count of every source active tonight (sky/meteors.js), once it is up.
      const note = ground ? ground.stats().meteorNote : null;
      if (note) return note;
      if (!showersNow.length) return null;
      const m = ground ? ground.stats().meteors : null;
      const up = showersNow.filter((s) => s.altDeg > 0);
      return { showers: (up.length ? up : showersNow).map((s) => s.display), down: !up.length, perHour: m ? m.perHour : null, drawn: m ? m.drawn : 0, last: m ? m.last : null };
    },
    /** Draw one meteor now: for the probe and a trip stop. */
    meteorNow: (i, opts) => (ground ? ground.meteorNow(i, opts) : null),
    showPass,
    /** True while the ground sky is drawing the stars and planets itself (ui/labels.js asks). */
    get ownsSky() {
      return isActive && !!ground;
    },
    /** What the ground sky has drawn and fetched, or null before it loads: for the probes. */
    groundStats: () => (ground ? ground.stats() : null),
    /** The deep-sky pictures and the other-light layer as the ground sky draws them, for the probes. */
    groundPictures: () => (ground && ground.pictures ? ground.pictures() : null),
    groundOtherLight: () => (ground && ground.otherLight ? ground.otherLight() : null),
    dispose() {
      exit();
      detachInput();
      disposeGroup();
    },
  };
}

export { SKY_STOPS, EYE_HEIGHT_KM, SKY_FOV_DEG, FOV };
