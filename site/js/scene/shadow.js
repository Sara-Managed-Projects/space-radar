// scene/shadow.js -- is a satellite in the Sun, or in Earth's shadow, right now (spec 0026 req 12).
//
// The satellitemap.space study's second take: the single bit that makes "can I see it" mean
// something and makes a night sky look alive. The test is the classic shadow CYLINDER -- behind
// Earth on the anti-Sun side and within one Earth radius of the Sun line -- and it is done in scene
// units, so it is the same code whatever frame the record came in. It ignores the penumbra (a few
// seconds either side of each crossing) and atmospheric refraction; sky/passes.js uses satellite.js's
// exact shadowFraction for the pass predictions, where the seconds matter. Here, for twenty
// thousand dots ten times a second, a cylinder is honest to the eye and free.
//
// Also here: standsOn, groundLit and worldCentreScene, the same question for a lander on another
// world's night side (public #403).

import * as THREE from '../../vendor/three.module.min.js';
import { stage } from './stage.js';
import { propagate } from '../propagate/index.js';

export const EARTH_RADIUS_KM = 6371;
const _d = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Vector3();
const _sun = new THREE.Vector3();
const _p = new THREE.Vector3();
const ZERO = { x: 0, y: 0, z: 0 };

/**
 * Pure: is `sat` inside Earth's shadow cylinder? All three positions in the same units; `radius`
 * is Earth's radius in those units. `sunDir` may be a position (the Sun) or a direction: only its
 * direction from `earth` is used.
 */
export function inEarthShadow(sat, earth, sun, radius) {
  _d.set(sat.x - earth.x, sat.y - earth.y, sat.z - earth.z);
  _s.set(sun.x - earth.x, sun.y - earth.y, sun.z - earth.z);
  const len = _s.length();
  if (!(len > 0)) return false;
  _s.multiplyScalar(1 / len);
  const along = _d.dot(_s);
  if (along >= 0) return false; // on the Sun's side of Earth: lit
  const perp2 = _d.lengthSq() - along * along;
  return perp2 < radius * radius;
}

/** The Sun's angular radius from the Earth, as a tangent: how fast the penumbra widens behind it. */
const SUN_SPREAD = 0.00465;

/**
 * Pure: how much of the Sun a satellite still sees, 0 (the umbra) to 1 (full sunlight), with the
 * penumbra between: the band at the cylinder's edge that widens with distance behind the Earth,
 * tens of kilometres deep on the far side of a low orbit. The same arguments as inEarthShadow, which is this at a
 * hard edge. A satellite crossing it fades over seconds, as one does in the sky (internal #393).
 */
export function earthShadowLit(sat, earth, sun, radius) {
  _d.set(sat.x - earth.x, sat.y - earth.y, sat.z - earth.z);
  _s.set(sun.x - earth.x, sun.y - earth.y, sun.z - earth.z);
  const len = _s.length();
  if (!(len > 0)) return 1;
  _s.multiplyScalar(1 / len);
  const along = _d.dot(_s);
  if (along >= 0) return 1;
  const perp = Math.sqrt(Math.max(0, _d.lengthSq() - along * along));
  const half = Math.max(1e-9, -along * SUN_SPREAD);
  const k = (perp - (radius - half)) / (2 * half);
  return k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
}

/**
 * Earth's centre and the Sun in scene units for the current stage and time, or null when the stage
 * cannot express Earth's frame. Cached per tMs so a layer of twenty thousand asks once.
 */
let cacheT = NaN;
let cacheOk = false;
export function sunAndEarthScene(tMs) {
  const t = Number.isFinite(tMs) ? tMs : stage.tMs;
  if (t === cacheT) return cacheOk ? { earth: _e, sun: _sun, radius: EARTH_RADIUS_KM / stage.unitKm } : null;
  cacheT = t;
  cacheOk = !!(stage.toSceneInto(ZERO, 'earth-inertial', _e, t) && stage.toSceneInto(ZERO, 'sun-inertial', _sun, t));
  return cacheOk ? { earth: _e, sun: _sun, radius: EARTH_RADIUS_KM / stage.unitKm } : null;
}

/**
 * A THING STANDING ON ANOTHER WORLD AT NIGHT (public #403). A lander's mark was drawn at full
 * brightness wherever its world had turned it: the lit test above was asked only of things round
 * the Earth, so Curiosity's dot shone on a Mars that was black to the horizon. A ground site on
 * the Earth already dims at night (it is inside the Earth's shadow cylinder); these do the same.
 */
/** The world a record stands on when that is not the Earth: 'mars' for the frame 'mars-fixed'. */
export function standsOn(record) {
  const f = record && record.frame;
  if (typeof f !== 'string' || !f.endsWith('-fixed')) return null;
  const world = f.slice(0, -6);
  return world && world !== 'earth' ? world : null;
}

/**
 * Pure: 1 where the ground under a thing on a world's surface is in daylight, 0 where it is night.
 * The same cylinder as earthShadowLit, with the world's radius taken as the thing's own distance
 * from its centre, so it needs no table of radii and a rover on a mountain is not special.
 */
export function groundLit(site, centre, sun) {
  const r = Math.hypot(site.x - centre.x, site.y - centre.y, site.z - centre.z);
  return r > 0 ? earthShadowLit(site, centre, sun, r) : 1;
}

const _centres = new Map();
let centresT = NaN;
/** A world's centre in scene units for the current stage, or null. Asked once per world per tMs. */
export function worldCentreScene(world, tMs) {
  const t = Number.isFinite(tMs) ? tMs : stage.tMs;
  if (t !== centresT) { _centres.clear(); centresT = t; }
  if (_centres.has(world)) return _centres.get(world);
  const out = new THREE.Vector3();
  let ok = false;
  try { ok = !!stage.toSceneInto(ZERO, `${world}-inertial`, out, t); } catch { ok = false; }
  _centres.set(world, ok ? out : null);
  return ok ? out : null;
}

/** Does this record's frame put it round the Earth, where Earth's shadow is the question? */
export function orbitsEarth(record) {
  const f = record && record.frame;
  return f === 'earth-inertial' || f === 'earth-fixed';
}

/**
 * For a card: 'sunlit' | 'shadow' | null (not an Earth-orbiting thing, or no position). Uses the
 * record's own propagated position at tMs.
 */
export function sunlitState(record, tMs) {
  if (!orbitsEarth(record)) return null;
  const t = Number.isFinite(tMs) ? tMs : stage.tMs;
  const p = propagate(record, t);
  if (!p) return null;
  const ref = sunAndEarthScene(t);
  if (!ref) return null;
  if (!stage.toSceneInto(p, p.frame || record.frame, _p, t)) return null;
  return inEarthShadow(_p, ref.earth, ref.sun, ref.radius) ? 'shadow' : 'sunlit';
}

/**
 * THE RED OF THE PENUMBRA (release 1.2.0 stage W2-a, internal #917). At orbital sunrise and sunset
 * the sunlight that reaches a craft has come through the Earth's air edge-on, as a sunset's does,
 * and is red: the station turns copper, then orange, then white, over some ten seconds, and its
 * arrays' glint comes back in the same colours. MODELLED, and only this: Rayleigh scattering by a
 * single exponential atmosphere along the straight line to the Sun's centre. No refraction (which
 * bends the light round the limb and flattens the Sun), no ozone, no aerosols, no clouds: real
 * sunrises from orbit are browner and more banded, and the card does not claim more.
 *
 *   tauRgb     the Rayleigh optical depth of the whole vertical column at sea level at 650, 550
 *              and 450 nm: 0.008569 l^-4 (1 + 0.0113 l^-2 + 0.00013 l^-4), l in micrometres
 *              (Hansen and Travis 1974, Space Science Reviews 16, 527, their formula for the
 *              standard atmosphere) -- 0.0493, 0.0973, 0.2213.
 *   scaleKm    the density's scale height.
 *   airmass    a straight line that grazes the ball at height h crosses exp(-h / H) sqrt(2 pi R / H)
 *              vertical columns (both halves of the chord; R 6371 km, H 8 km): 70.7 at the ground.
 *   topKm      above this the line is in sunlight unreddened (0.5 % or less in blue).
 */
export const AIR_REDDENING = { tauRgb: [0.0493, 0.0973, 0.2213], scaleKm: 8, airmass: 70.7, topKm: 60 };
/** On by default; a probe switches it off for the picture before (tests/probes/look/r12-nearby.js). */
let airReddening = true;
export function setAirReddening(on) { airReddening = !!on; return airReddening; }
export function airReddeningOn() { return airReddening; }

/**
 * Pure: the share of the Sun's light in red, green and blue that crosses the air along a line
 * grazing the Earth `tangentKm` above the ground (AIR_REDDENING). 0 below the ground: the Earth is
 * in the way, which the geometric shadow already says.
 */
export function airTransmission(tangentKm) {
  if (!(tangentKm >= 0)) return [0, 0, 0];
  if (tangentKm >= AIR_REDDENING.topKm) return [1, 1, 1];
  const cols = AIR_REDDENING.airmass * Math.exp(-tangentKm / AIR_REDDENING.scaleKm);
  return AIR_REDDENING.tauRgb.map((t) => Math.exp(-t * cols));
}

/**
 * Pure: the sunlight on `sat` as [r, g, b] shares of full sunlight: the Earth's geometric shadow
 * (earthShadowLit) times the air's reddening along the line to the Sun when that line passes the
 * Earth on its way. Same arguments as earthShadowLit; `radiusKm` is the Earth's radius in km, which
 * sets the scale height in the scene's units.
 */
export function sunlightOn(sat, earth, sun, radius, radiusKm = EARTH_RADIUS_KM) {
  const lit = earthShadowLit(sat, earth, sun, radius);
  if (lit <= 0) return [0, 0, 0];
  _d.set(sat.x - earth.x, sat.y - earth.y, sat.z - earth.z);
  _s.set(sun.x - earth.x, sun.y - earth.y, sun.z - earth.z);
  const len = _s.length();
  if (!(len > 0)) return [lit, lit, lit];
  _s.multiplyScalar(1 / len);
  const along = _d.dot(_s);
  if (along >= 0) return [lit, lit, lit];
  const perp = Math.sqrt(Math.max(0, _d.lengthSq() - along * along));
  const t = airTransmission(((perp - radius) / radius) * radiusKm);
  return t.map((x) => x * lit);
}

/**
 * The same reddening in GLSL, for scene/models.js's shadow (the lines it adds name this): `hR` is
 * the grazing height over the scale height. One exp a fragment, only inside the Earth's shadow side.
 */
export const AIR_TINT_GLSL = `vec3 srAirTint( float hR ) {
  if ( hR >= ${(AIR_REDDENING.topKm / AIR_REDDENING.scaleKm).toFixed(2)} ) return vec3( 1.0 );
  float cols = ${AIR_REDDENING.airmass.toFixed(1)} * exp( -max( hR, 0.0 ) );
  return exp( -vec3( ${AIR_REDDENING.tauRgb.map((x) => x.toFixed(4)).join(', ')} ) * cols );
}`;
