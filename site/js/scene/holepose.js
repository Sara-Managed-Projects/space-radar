// scene/holepose.js -- a black hole as the Event Horizon Telescope saw it: from Earth, north up, east to the left
// (forge #149). The card's "Seen from Earth" button and its comparison with the EHT pictures stand the camera here.
//
// Contract: earthPose(record, stage) -> { target, toEarth, north } | null     scene axes (THREE.Vector3s)
//             target   the hole's place; toEarth  unit, from the hole towards the Sun (the Earth is 8 light-minutes from
//             it, nothing at 27 000 light-years); north  unit, the celestial north pole square to the line of sight
//           SKY_NORTH_ECL   the J2000 celestial pole in the ecliptic axes of `sun-inertial`
// Pure but for the stage it is handed (stage.toSceneInto, stage.dirToScene: scene/stage.js).
//
// WHY THIS POSE. An EHT picture is the sky as a radio array on Earth recorded it, printed the way astronomers print the
// sky: north at the top and east on the LEFT (the sky is seen from inside). A camera on the line from the hole to us,
// looking at it, with its up set to the celestial pole, draws the same: its right-hand side is forward x up, which for
// the sky is west. Then the bright side of our M87* can be held against theirs, at the same angle.

import * as THREE from '../../vendor/three.module.min.js';

const OBL = 23.4392911 * Math.PI / 180; // the J2000 obliquity scene/blackhole.js and frames.js use
export const SKY_NORTH_ECL = [0, Math.sin(OBL), Math.cos(OBL)];

export function earthPose(record, stage) {
  if (!record || !record.pos || !stage) return null;
  const p = record.pos;
  const n = Math.hypot(p.x, p.y, p.z);
  if (!(n > 0)) return null;
  const target = stage.toSceneInto({ x: p.x, y: p.y, z: p.z }, 'sun-inertial', new THREE.Vector3());
  const toEarth = stage.dirToScene({ x: -p.x / n, y: -p.y / n, z: -p.z / n }, 'sun-inertial', new THREE.Vector3());
  const pole = stage.dirToScene({ x: SKY_NORTH_ECL[0], y: SKY_NORTH_ECL[1], z: SKY_NORTH_ECL[2] }, 'sun-inertial', new THREE.Vector3());
  if (!target || !toEarth || !pole) return null;
  toEarth.normalize();
  const north = pole.addScaledVector(toEarth, -pole.dot(toEarth));
  if (north.lengthSq() < 1e-12) return null;
  return { target, toEarth, north: north.normalize() };
}
