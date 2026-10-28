// propagate/companion.js -- a moon of a small body: the parent's orbit round the Sun plus the moon's own round the parent.
// Release 1.5.0, internal spec 0079 stage A3 (internal i#1061).
//
// Two element sets on one record, both in heliocentric ecliptic J2000 axes (data/moons.js builds them there):
//   record.parentElements  the parent body's orbit round the Sun (propagate/kepler.js shape, mu = the Sun's)
//   record.elements        the moon's orbit round the parent, with its own `muKm3S2`: the one that gives the lap that was measured
// The answer is the sum, in the Sun's frame. It is `inferred`; a record whose place on its own orbit is not known (the dwarf
// planets' moons: size, shape and lap are, the tilt and the phase are not) says `illustrative` itself, and index.js only ever
// lets a class get stricter.
import { elementsToState, GM_SUN } from './kepler.js';

/** propagate signature: (record, tMs) -> {x, y, z, frame, cls} | null. */
export function companion(record, tMs) {
  if (!record || !record.elements || !record.parentElements || !Number.isFinite(tMs)) return null;
  const own = record.elements.muKm3S2;
  if (!(own > 0)) return null;
  let moon;
  let parent;
  try {
    moon = elementsToState(record.elements, tMs, own);
    parent = elementsToState(record.parentElements, tMs, GM_SUN);
  } catch (err) {
    return null;
  }
  if (!moon || !parent) return null;
  return { x: parent.x + moon.x, y: parent.y + moon.y, z: parent.z + moon.z, frame: record.frame || 'sun-inertial', cls: 'inferred' };
}

export default companion;
