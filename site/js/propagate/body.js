// propagate/body.js -- the worlds, from astronomy-engine.
//
// `measured` in the sense the app means it: these are the positions, not a guess at them.
// astronomy-engine's VSOP87/ELP truncations are good to well under an arcsecond for the planets
// and a few kilometres for the Moon over the years this app covers -- far below one screen pixel.
// A moon of another planet -- Jupiter's four, Phobos, Deimos, Enceladus, Titan, Triton, Charon -- is
// its planet plus an offset (frames.js moonOffsetKm says from where).
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
  isPlanetMoon,
  moonParent,
  moonOffsetKm,
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
      } else if (isPlanetMoon(key)) {
        // GeoVector back-dates the planet by the light time, 33 to 54 minutes over a year for
        // Jupiter. The moon's offset must be taken at that same earlier instant, or it is added to a
        // planet from a different moment: Io moves 17.4 km/s round Jupiter, 52 000 km in the 50.1
        // minutes the light took on 2026-09-22 (measured with this file's own GeoVector). At noon
        // UTC that day, measured the same way, skipping it would put Phobos 1 900 km out (14.3
        // minutes from Mars), Enceladus 53 000 km (70 minutes from Saturn), Triton 63 000 km (4.0
        // hours from Neptune) and Charon 3 900 km (4.9 hours from Pluto, six Charon radii).
        const planet = bodyForWorld(moonParent(key));
        if (!planet) return null;
        const g = Astronomy.GeoVector(planet, date, false);
        const lightDays = Math.hypot(g.x, g.y, g.z) / Astronomy.C_AUDAY;
        const off = moonOffsetKm(key, tMs - lightDays * 86400000);
        if (!off) return null;
        eqj = { x: g.x * KM_PER_AU + off.x, y: g.y * KM_PER_AU + off.y, z: g.z * KM_PER_AU + off.z };
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
