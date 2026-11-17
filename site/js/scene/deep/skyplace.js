// scene/deep/skyplace.js -- where a deep-sky object's own axes lie in the scene, for the objects built from published
// 3D data (scene/deep/homunculus.js and its kin). Fetched with them; never at boot. Pure but for placeSky.
//
//   skyFrame(posKm)            -> { west, north, toward }   the sky frame at a place, in sun-inertial (ecliptic J2000)
//   placeSky(THREE, group, rec, stage)   writes group.matrix: the sky frame's basis in the scene's axes (no scale, no place)
//   axisOnSky(inclDeg, paDeg)  -> [w, n, t]   a unit axis `incl` degrees from our line of sight, its FAR end toward
//                                             position angle `pa` (north through east), in (west, north, toward the Sun)
//   tiltOf(inclDeg, paDeg)     -> 9 numbers, row-major: a model drawn with its axis up the page (x right, y the axis'
//                                 far end, z toward the observer) carried onto the sky (west, north, toward the Sun)
//   yearOf(tMs)                -> the calendar year, with its fraction
const D2R = Math.PI / 180;
const OBLIQUITY = 23.4392911 * D2R;
const POLE = [0, Math.sin(OBLIQUITY), Math.cos(OBLIQUITY)]; // the north celestial pole, sun-inertial
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** The sky frame at an object, in sun-inertial: west, north, and toward the Sun (scene/deep/remnant.js skyFrame). Pure. */
export function skyFrame(posKm) {
  const u = norm([posKm.x, posKm.y, posKm.z]);
  const east = norm(cross(POLE, u));
  const north = cross(u, east);
  return { west: [-east[0], -east[1], -east[2]], north, toward: [-u[0], -u[1], -u[2]] };
}

/** The sky frame's basis in the scene, at the record: writes `group.matrix` (a rotation only). */
export function placeSky(THREE, group, rec, stage) {
  if (!rec || !rec.pos) return false;
  const f = skyFrame(rec.pos);
  const c = new THREE.Vector3(), tip = new THREE.Vector3();
  if (!stage.toSceneInto(rec.pos, 'sun-inertial', c, stage.tMs)) return false;
  const k = 1e12;
  const dir = (v) => {
    stage.toSceneInto({ x: rec.pos.x + v[0] * k, y: rec.pos.y + v[1] * k, z: rec.pos.z + v[2] * k }, 'sun-inertial', tip, stage.tMs);
    return tip.clone().sub(c).normalize();
  };
  const x = dir(f.west), y = dir(f.north);
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  y.crossVectors(z, x).normalize();
  group.matrix.makeBasis(x, y, z);
  group.matrixWorldNeedsUpdate = true;
  return true;
}

/** An axis `incl` degrees from our line of sight whose far end points to position angle `pa`: (west, north, toward). Pure. */
export function axisOnSky(inclDeg, paDeg) {
  const i = inclDeg * D2R, pa = paDeg * D2R;
  return [-Math.sin(i) * Math.sin(pa), Math.sin(i) * Math.cos(pa), -Math.cos(i)];
}

/**
 * The rotation that carries a model drawn un-tilted (x right, y its axis' far end, z toward the observer) onto the sky:
 * first the axis is tipped back from the page until it is `incl` degrees from our line (a turn about x), then turned
 * in the plane of the sky until its far end points to position angle `pa` (a turn about our line). Row-major. Pure.
 */
export function tiltOf(inclDeg, paDeg) {
  const th = -(90 - inclDeg) * D2R, pa = paDeg * D2R;
  const c = Math.cos(th), s = Math.sin(th), cz = Math.cos(pa), sz = Math.sin(pa);
  // Rz(pa) . Rx(th)
  return [cz, -sz * c, sz * s, sz, cz * c, -cz * s, 0, s, c];
}

/** The calendar year of a clock time, with its fraction (a year of 365.2425 days from 2000-01-01). Pure. */
export const yearOf = (tMs) => 2000 + (tMs - Date.UTC(2000, 0, 1)) / (365.2425 * 86400e3);
