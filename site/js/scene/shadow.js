// scene/shadow.js -- is a satellite in the Sun, or in Earth's shadow, right now (spec 0026 req 12).
//
// The satellitemap.space study's second take: the single bit that makes "can I see it" mean
// something and makes a night sky look alive. The test is the classic shadow CYLINDER -- behind
// Earth on the anti-Sun side and within one Earth radius of the Sun line -- and it is done in scene
// units, so it is the same code whatever frame the record came in. It ignores the penumbra (a few
// seconds either side of each crossing) and atmospheric refraction; sky/passes.js uses satellite.js's
// exact shadowFraction for the pass predictions, where the seconds matter. Here, for twenty
// thousand dots ten times a second, a cylinder is honest to the eye and free.

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
