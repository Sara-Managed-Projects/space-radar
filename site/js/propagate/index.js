// propagate/index.js -- one signature, eight implementations, and the extension point.
//
// Every propagator is (record, tMs) -> {x, y, z, frame, cls} | null. Adding a ninth is a file
// under propagate/ and a row in PROPAGATORS. Nothing else in the app learns its name. (The eighth,
// `orbiter`, arrived 2026-09-22 for craft that circle another world: propagate/orbiter.js.)
//
// Two rules are enforced here rather than trusted to each propagator:
//   1. A propagator never throws. A record with bad data draws nothing; it does not take the
//      frame down with it.
//   2. A record's honesty can only get stricter. A record declared `sample` or `illustrative`
//      stays that way whatever the maths returns, and an `inferred` position never gets promoted
//      to `measured` by a record that claims to be measured.

import { sgp4 } from './sgp4.js';
import { kepler } from './kepler.js';
import { sampled } from './sampled.js';
import { body } from './body.js';
import { fixed } from './fixed.js';
import { ascent } from './ascent.js';
import { staticPos } from './static.js';
import { orbiter } from './orbiter.js';

export { sgp4, kepler, sampled, body, fixed, ascent, staticPos, orbiter };

/** The registry. Key = record.propagator. */
export const PROPAGATORS = { sgp4, kepler, sampled, body, fixed, ascent, static: staticPos, orbiter };

/**
 * A craft's own path, once its file is here (propagate/ephemeris.js, internal #277): record id ->
 * (tMs) -> {x, y, z, frame, cls: 'inferred', eph: true} | null. Empty at boot and filled only
 * when a craft's card opens. Inside the file's span it answers INSTEAD of the record's own
 * propagator, and with its own honesty: the stand-in a record carries (`sample`, a straight
 * line) says nothing about a position read from JPL's track, so the record's class is not
 * applied to it. Outside the span it returns null and the record answers as before.
 */
export const EPHEMERIS_OF = new Map();

// Strictest first. A propagator may only move a record down this list, never up.
const CLASS_ORDER = ['measured', 'inferred', 'illustrative', 'sample'];

function weakest(a, b) {
  const ia = CLASS_ORDER.indexOf(a);
  const ib = CLASS_ORDER.indexOf(b);
  if (ia < 0) return CLASS_ORDER.includes(b) ? b : 'inferred';
  if (ib < 0) return a;
  return ia >= ib ? a : b;
}

/**
 * Position a record at clock time tMs. Returns {x, y, z, frame, cls} in the record's own frame --
 * frames.toStage() puts it in the scene's. Returns null when the record cannot be answered for,
 * which is a third answer and not the same as zero: the caller draws nothing and the card says so.
 */
export function propagate(record, tMs) {
  if (!record || !Number.isFinite(tMs)) return null;
  if (EPHEMERIS_OF.size) {
    const own = EPHEMERIS_OF.get(record.id);
    let at = null;
    try { at = own ? own(tMs) : null; } catch (err) { at = null; }
    if (at && Number.isFinite(at.x) && Number.isFinite(at.y) && Number.isFinite(at.z)) return at;
  }
  const fn = PROPAGATORS[record.propagator];
  if (typeof fn !== 'function') return null;

  let out;
  try {
    out = fn(record, tMs);
  } catch (err) {
    return null;
  }
  if (!out) return null;
  if (!Number.isFinite(out.x) || !Number.isFinite(out.y) || !Number.isFinite(out.z)) return null;

  out.frame = out.frame || record.frame || 'earth-inertial';
  out.cls = weakest(out.cls || 'inferred', record.cls || 'measured');
  if (!Number.isFinite(out.tMs)) out.tMs = tMs;
  return out;
}

export default propagate;
