// moments/world.js -- a Moment on another world: its axes, its turn and the Sun seen from it (release 1.7.9, internal #1058).
//
// Curiosity's landing (and New Horizons at Pluto) are played in a frame about the WORLD's centre, with the world's north pole
// for +Z, as the Earth moments are in TEME (z the pole): `fixedToInertial` turns a body-fixed vector by the prime meridian's
// angle about z, and the stage draws +Y (three.js) for the north pole as it always has. The IAU rotation elements come from
// astronomy-engine's `RotationAxis` (the WGCCRE 2015 report): the pole's right ascension and declination, and `spin`, the angle
// W of the prime meridian from the node of the world's equator on the ICRF equator. In the frame whose z is the pole and whose
// x is that node (right ascension of the pole plus 90 degrees), the prime meridian lies at W from x: so `turn` is W, and the
// world-fixed longitude 0 is `fixedToInertial([1, 0, 0], W)`.
//
// The Sun's direction is seen from the world's centre (the world's heliocentric vector reversed), turned into that frame.
// Nothing here knows three.js, so node holds it (tests/test_moments_mars.mjs).

import * as Astronomy from '../../vendor/astronomy.js';

const BODIES = { mars: Astronomy.Body.Mars, pluto: Astronomy.Body.Pluto };
const DEG = Math.PI / 180;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** The world's pole and node axes in the ICRF equatorial frame at `ms`, and the prime meridian's angle W (radians). */
export function worldAxes(id, ms) {
  const body = BODIES[id];
  if (!body) return null;
  const ax = Astronomy.RotationAxis(body, new Date(ms));
  const z = unit([ax.north.x, ax.north.y, ax.north.z]);
  const node = (ax.ra * 15 + 90) * DEG;
  const x = unit([Math.cos(node), Math.sin(node), 0]);
  const y = unit(cross(z, x));
  return { x, y, z, w: ax.spin * DEG };
}

/** The prime meridian's angle at `ms`, radians (the stage's `sidereal`). */
export function worldTurn(id) {
  return (ms) => { const a = worldAxes(id, ms); return a ? a.w : 0; };
}

/** A vector of the ICRF equatorial frame in the world's frame (x the node, z the pole). */
export function toWorldFrame(a, v) {
  return [dot(v, a.x), dot(v, a.y), dot(v, a.z)];
}

/** The unit vector from the world's centre to the Sun, in the world's frame, at `ms`. */
export function sunFromWorld(id, ms) {
  const body = BODIES[id];
  const a = worldAxes(id, ms);
  if (!body || !a) return [1, 0, 0];
  const h = Astronomy.HelioVector(body, new Date(ms));
  return unit(toWorldFrame(a, [-h.x, -h.y, -h.z]));
}

/** The world's heliocentric distance in au at `ms`. */
export function sunDistanceAu(id, ms) {
  const body = BODIES[id];
  if (!body) return 1;
  const h = Astronomy.HelioVector(body, new Date(ms));
  return Math.hypot(h.x, h.y, h.z);
}

/** Local mean solar time at east longitude `lonDeg` (degrees) on a world, in hours: the Sun's hour angle in the world's own frame plus 12. */
export function localSolarHours(id, ms, lonDeg) {
  const a = worldAxes(id, ms);
  if (!a) return NaN;
  const s = sunFromWorld(id, ms);
  // Sun's longitude east of the prime meridian: its angle in the equator minus W.
  let sunLon = Math.atan2(s[1], s[0]) - a.w;
  let h = 12 + (lonDeg * DEG - sunLon) * 12 / Math.PI;
  h = ((h % 24) + 24) % 24;
  return h;
}
