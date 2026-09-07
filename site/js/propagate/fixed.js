// propagate/fixed.js -- things that do not move: pads, dishes, observatories, landing sites,
// rovers, the visitor's pin.
//
// A fixed record carries geodetic coordinates in DEGREES, because that is what every upstream
// source and every human types. Degrees are the UI boundary, and a registry row is the UI; the
// conversion to radians happens here and nowhere downstream.
//
// The position is `measured` -- a launch pad's coordinates are a surveyed fact.
//
// FIXED IS NOT EARTH-FIXED. This propagator used to hard-code 'earth-fixed' and the WGS84 radius
// and ignore record.frame entirely, so the Apollo 11 site, Apollo 17, Chang'e 4 and the four Mars
// rovers were all drawn on Earth's surface -- Tranquility Base came out in the Central African
// Republic -- with a confident card underneath. Every Earth row was correct BECAUSE of that
// hard-coded string, which is why tests/fixtures/fixed-golden.json exists: it is the before
// picture, and every Earth row in it must stay byte-identical forever.

import {
  geodeticToEcef,
  sphericalToBodyFixed,
  bodyFixedToInertial,
  parseFrame,
  worldRadiusKm,
} from './frames.js';

const DEG = Math.PI / 180;

/** Accepts {latDeg,lonDeg,altKm}, {lat,lon,alt}, or radians as {latRad,lonRad,altKm}. */
export function normaliseFixed(f) {
  if (!f) return null;
  let latRad;
  let lonRad;
  if (Number.isFinite(f.latRad) && Number.isFinite(f.lonRad)) {
    latRad = f.latRad;
    lonRad = f.lonRad;
  } else {
    const latDeg = Number.isFinite(f.latDeg) ? f.latDeg : f.lat;
    const lonDeg = Number.isFinite(f.lonDeg) ? f.lonDeg : f.lon;
    if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;
    latRad = latDeg * DEG;
    lonRad = lonDeg * DEG;
  }
  const altKm = Number.isFinite(f.altKm)
    ? f.altKm
    : Number.isFinite(f.alt)
      ? f.alt
      : Number.isFinite(f.elevationM)
        ? f.elevationM / 1000
        : 0;
  if (Math.abs(latRad) > Math.PI / 2 + 1e-9) return null;
  return { latRad, lonRad, altKm };
}

/**
 * The surface point in the world's own body-fixed frame, km.
 *
 * Earth goes through the WGS84 ellipsoid, because that is the datum its coordinates were
 * surveyed against and the datum scene/earth.js builds its mesh from. Every other world is a
 * sphere of its mean radius: that is what worlds.js draws, what the textures are mapped to, and
 * what a published planetocentric lat/lon is measured on. A flattening term nobody applies to the
 * mesh would only lift the marker off the surface it is standing on.
 */
function surfacePoint(world, gd) {
  if (world === 'earth') return geodeticToEcef(gd.latRad, gd.lonRad, gd.altKm);
  const radiusKm = worldRadiusKm(world);
  if (radiusKm === null) return null; // a world with no radius: refuse rather than assume Earth
  return sphericalToBodyFixed(gd.latRad, gd.lonRad, gd.altKm, radiusKm);
}

/** propagate signature: (record, tMs) -> {x, y, z, frame, cls} | null. */
export function fixed(record, tMs) {
  if (!record) return null;
  const gd = normaliseFixed(record.fixed || record.site || record.pad);
  if (!gd) return null;

  const f = parseFrame(record.frame || 'earth-fixed');
  if (!f) return null;

  const surface = surfacePoint(f.world, gd);
  if (!surface) return null;

  if (f.kind === 'fixed') {
    return {
      x: surface.x, y: surface.y, z: surface.z,
      frame: `${f.world}-fixed`,
      cls: 'measured',
    };
  }

  // A fixed record whose layer wants it in the inertial frame still gets one answer, not two
  // conventions. That needs the clock, so refuse rather than guess.
  if (!Number.isFinite(tMs)) return null;
  const inertial = bodyFixedToInertial(surface, f.world, tMs);
  if (!inertial) return null;
  return {
    x: inertial.x, y: inertial.y, z: inertial.z,
    frame: `${f.world}-inertial`,
    cls: 'measured',
  };
}

export default fixed;
