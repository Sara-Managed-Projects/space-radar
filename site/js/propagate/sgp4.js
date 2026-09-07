// propagate/sgp4.js -- SGP4 for anything with a TLE or an OMM.
//
// The output frame is TEME, which the contract calls `earth-inertial`. satellite.js names it
// "ECI"; it is not J2000. See the note at the top of frames.js -- 0.37 deg in 2026.
//
// Class: `measured` while the clock is inside MEASURED_WINDOW_MS of the element set's epoch,
// `inferred` outside it. A TLE is a fit, not an observation, so even "measured" is generous; but
// the honest distinction a beginner needs is between "this is where it was tracked" and "this is
// where the maths says it drifted to", and the epoch is the line between them.

import * as satellite from '../../vendor/satellite.esm.js';

/** Inside this window either side of epoch, an SGP4 position is called `measured`. */
export const MEASURED_WINDOW_MS = 12 * 3600 * 1000;

/** Beyond this, the element set is too old to draw at all. */
export const MAX_AGE_MS = 30 * 24 * 3600 * 1000;

const satrecCache = new WeakMap();

function jdayToMs(jd) {
  return (jd - 2440587.5) * 86400000;
}

/**
 * Build a satrec from whatever the parser had: an already-built satrec, an OMM JSON object, or
 * a pair (or triple) of TLE lines. Returns null if it cannot be built.
 */
export function satrecFrom(input) {
  if (!input) return null;
  try {
    // Already a satrec.
    if (typeof input === 'object' && input.jdsatepoch !== undefined && input.no !== undefined) {
      return input.error ? null : input;
    }
    // TLE lines.
    if (Array.isArray(input)) {
      const lines = input.filter((l) => typeof l === 'string' && l.trim().length > 60);
      if (lines.length < 2) return null;
      const rec = satellite.twoline2satrec(lines[lines.length - 2], lines[lines.length - 1]);
      return rec && !rec.error ? rec : null;
    }
    if (typeof input === 'object' && (input.line1 || input.tle1)) {
      const rec = satellite.twoline2satrec(input.line1 || input.tle1, input.line2 || input.tle2);
      return rec && !rec.error ? rec : null;
    }
    // CelesTrak GP JSON (OMM).
    if (typeof input === 'object' && input.MEAN_MOTION !== undefined) {
      const rec = satellite.json2satrec(input);
      return rec && !rec.error ? rec : null;
    }
  } catch (err) {
    return null;
  }
  return null;
}

function resolveSatrec(record) {
  if (!record) return null;
  const cached = satrecCache.get(record);
  if (cached !== undefined) return cached;
  const rec = satrecFrom(record.satrec || record.omm || record.tle || null);
  satrecCache.set(record, rec);
  return rec;
}

/** Epoch of the element set in ms, from the satrec if the record did not carry one. */
export function epochMs(record) {
  if (record && Number.isFinite(record.epoch)) return record.epoch;
  const rec = resolveSatrec(record);
  if (rec && Number.isFinite(rec.jdsatepoch)) return jdayToMs(rec.jdsatepoch);
  return NaN;
}

/**
 * propagate signature: (record, tMs) -> {x, y, z, frame, cls} | null.
 * record.satrec is a satrec, an OMM object, or TLE lines.
 */
export function sgp4(record, tMs) {
  const rec = resolveSatrec(record);
  if (!rec) return null;
  if (!Number.isFinite(tMs)) return null;

  const epoch = epochMs(record);
  const age = Number.isFinite(epoch) ? Math.abs(tMs - epoch) : 0;
  if (age > MAX_AGE_MS) return null;

  let pv;
  try {
    pv = satellite.propagate(rec, new Date(tMs));
  } catch (err) {
    return null;
  }
  if (!pv || !pv.position || typeof pv.position === 'boolean') return null;
  const p = pv.position;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return null;
  // A decayed object comes back inside the Earth; drawing that is worse than not drawing it.
  if (Math.hypot(p.x, p.y, p.z) < 6300) return null;

  return {
    x: p.x,
    y: p.y,
    z: p.z,
    frame: record.frame || 'earth-inertial',
    cls: age <= MEASURED_WINDOW_MS ? 'measured' : 'inferred',
  };
}

/**
 * The velocity as well, for anything that needs a heading or a Doppler shift. Same frame, km/s.
 * Returns null on the same conditions as sgp4().
 */
export function sgp4State(record, tMs) {
  const rec = resolveSatrec(record);
  if (!rec || !Number.isFinite(tMs)) return null;
  let pv;
  try {
    pv = satellite.propagate(rec, new Date(tMs));
  } catch (err) {
    return null;
  }
  if (!pv || !pv.position || !pv.velocity || typeof pv.position === 'boolean') return null;
  const epoch = epochMs(record);
  const age = Number.isFinite(epoch) ? Math.abs(tMs - epoch) : 0;
  return {
    x: pv.position.x,
    y: pv.position.y,
    z: pv.position.z,
    vx: pv.velocity.x,
    vy: pv.velocity.y,
    vz: pv.velocity.z,
    frame: record.frame || 'earth-inertial',
    cls: age <= MEASURED_WINDOW_MS ? 'measured' : 'inferred',
  };
}

export default sgp4;
