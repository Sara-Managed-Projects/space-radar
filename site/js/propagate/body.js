// propagate/body.js -- the worlds, from astronomy-engine.
//
// `measured` in the sense the app means it: these are the positions, not a guess at them.
// astronomy-engine's VSOP87/ELP truncations are good to well under an arcsecond for the planets
// and a few kilometres for the Moon over the years this app covers -- far below one screen pixel.
//
// astronomy-engine returns AU in EQJ (equatorial J2000). Everything here converts to km, and to
// the axes the record's frame asks for:
//   sun-inertial     heliocentric, ecliptic J2000 axes
//   earth-inertial   geocentric, TEME axes (so a world sits correctly among the SGP4 satellites)
//   earth-fixed      ECEF, for a sub-solar or sub-lunar point

import * as Astronomy from '../../vendor/astronomy.js';
import {
  KM_PER_AU,
  bodyForWorld,
  worldHelioEclKm,
  j2000ToTeme,
  eciToEcef,
  gmst,
  parseFrame,
} from './frames.js';

// Mean radii, km. The table moved to frames.js, which is where the geometry that needs it lives
// (a body-fixed surface point is a radius plus two angles). Re-exported so this module's contract
// is unchanged and there is still exactly one table.
export { WORLD_RADIUS_KM } from './frames.js';

function nameOf(record) {
  if (!record) return null;
  const b = record.body || record.world || record.id;
  if (!b) return null;
  return String(b).toLowerCase();
}

/**
 * A world's position in an arbitrary frame, km. Returns null if the world has no ephemeris or the
 * frame is not one this app can express (moon-fixed has no v1 rotation model).
 */
export function worldPositionKm(worldId, tMs, frame = 'sun-inertial') {
  if (!Number.isFinite(tMs)) return null;
  const key = String(worldId || '').toLowerCase();
  const target = parseFrame(frame);
  if (!target) return null;

  // Geocentric shortcuts: they avoid differencing two ~1.5e8 km vectors to get 4e5 km, which
  // throws away eight of float64's sixteen digits.
  if (target.world === 'earth') {
    let eqj = null;
    const date = new Date(tMs);
    try {
      if (key === 'moon') {
        const m = Astronomy.GeoMoon(date);
        eqj = { x: m.x * KM_PER_AU, y: m.y * KM_PER_AU, z: m.z * KM_PER_AU };
      } else if (key === 'earth') {
        eqj = { x: 0, y: 0, z: 0 };
      } else {
        const body = bodyForWorld(key);
        if (!body) return null;
        // aberration off: we want where it is, not where it is seen.
        const g = Astronomy.GeoVector(body, date, false);
        eqj = { x: g.x * KM_PER_AU, y: g.y * KM_PER_AU, z: g.z * KM_PER_AU };
      }
    } catch (err) {
      return null;
    }
    const teme = j2000ToTeme(eqj, tMs);
    return target.kind === 'fixed' ? eciToEcef(teme, gmst(tMs)) : teme;
  }

  const helio = worldHelioEclKm(key, tMs);
  if (!helio) return null;
  if (target.world === 'sun' && target.kind === 'inertial') return helio;

  const origin = worldHelioEclKm(target.world, tMs);
  if (!origin || target.kind !== 'inertial') return null;
  return { x: helio.x - origin.x, y: helio.y - origin.y, z: helio.z - origin.z };
}

/** Sun -> world unit vector in the world's own inertial frame; what the lighting needs. */
export function sunDirection(worldId, tMs, frame) {
  const f = frame || `${String(worldId || 'earth').toLowerCase()}-inertial`;
  const p = worldPositionKm('sun', tMs, f);
  if (!p) return null;
  const r = Math.hypot(p.x, p.y, p.z);
  if (!(r > 0)) return null;
  return { x: p.x / r, y: p.y / r, z: p.z / r };
}

/** propagate signature: (record, tMs) -> {x, y, z, frame, cls} | null. */
export function body(record, tMs) {
  const name = nameOf(record);
  if (!name || !Number.isFinite(tMs)) return null;
  const frame = (record && record.frame) || 'sun-inertial';
  let p;
  try {
    p = worldPositionKm(name, tMs, frame);
  } catch (err) {
    return null;
  }
  if (!p || !Number.isFinite(p.x)) return null;
  return { x: p.x, y: p.y, z: p.z, frame, cls: 'measured' };
}

export default body;
