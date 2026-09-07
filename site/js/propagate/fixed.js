// propagate/fixed.js -- things that do not move: pads, dishes, observatories, the visitor's pin.
//
// A fixed record carries geodetic coordinates in DEGREES, because that is what every upstream
// source and every human types. Degrees are the UI boundary, and a registry row is the UI; the
// conversion to radians happens here and nowhere downstream.
//
// The position is `measured` -- a launch pad's coordinates are a surveyed fact.

import { geodeticToEcef, ecefToEci, gmst } from './frames.js';

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

/** propagate signature: (record, tMs) -> {x, y, z, frame, cls} | null. */
export function fixed(record, tMs) {
  if (!record) return null;
  const gd = normaliseFixed(record.fixed || record.site || record.pad);
  if (!gd) return null;

  const ecef = geodeticToEcef(gd.latRad, gd.lonRad, gd.altKm);
  const frame = record.frame || 'earth-fixed';

  // A fixed record whose layer wants it in the inertial frame still gets one answer, not two
  // conventions. Anything else needs the clock, so refuse rather than guess.
  if (frame === 'earth-inertial') {
    if (!Number.isFinite(tMs)) return null;
    const eci = ecefToEci(ecef, gmst(tMs));
    return { x: eci.x, y: eci.y, z: eci.z, frame, cls: 'measured' };
  }

  return { x: ecef.x, y: ecef.y, z: ecef.z, frame: 'earth-fixed', cls: 'measured' };
}

export default fixed;
