// moments/debriscloud.js -- a named breakup's pieces in a Moment (forge #153, release 2.0.0): the effect `debris-cloud`.
//
// Contract:
//   readPieces(doc)                    -> [{meta: {apogeeKm, perigeeKm, inclinationDeg}}], from a pieces file (below)
//   fillCloud(out, pieces, cloud, tMs, origin) -> how many points were written into `out` (Float32Array, x y z each),
//                                         metres in the stage's three.js axes, relative to `origin` (the floating origin)
//   createDebrisCloud({count, colour, sizePx, pixelRatio}) -> { points, positions, set(n), dispose() }
//
// WHAT IT DRAWS. The pieces of a breakup of data/clouds.js (CLOUDS: Fengyun-1C, Cosmos 1408 ...) where its spreadAt()
// puts them at the mission's instant: at the event every piece is at the perigee of the orbit the catalogue gives it
// TODAY, on one line from the Earth's centre (so the cloud is born as a short radial line, not a point: drag has lowered
// many perigees since 2007, and the story's foot line says so), and moves under two-body motion plus the Earth's J2 drift
// of its node, perigee and mean anomaly. That model is
// f1-find's, used unchanged, so the Moment and the map's "Play from the event" draw the same cloud; its honesty (today's
// orbits, survivors only, an illustrative plane at the event) is the story's `cloudNote`, on the player's foot line.
//
// THE FILE. site/data/moments/paths/<id>-pieces.json, written by scripts/build_moment_fengyun1c.py from CelesTrak's
// satellite catalogue: {note, cloud, read, source, pieces: [apogee km, perigee km, inclination in tenths of a degree, ...]}
// as one flat list of integers (2 310 pieces are 27 kB), fetched by the player only when a moment names it.
//
// WHY ONE POINT A PIECE, OF A FIXED SIZE. A piece is 5 cm to a metre and the camera is thousands of kilometres off: no
// piece could be seen at its size, and a cloud is read by its shape. A fixed few CSS pixels (`sizePx`, times the
// renderer's pixel ratio, which three.js's point size does not apply by itself) keeps every piece visible and none
// pretending to a size. The Earth hides the pieces behind it (the depth test); they do not light or cast.

import * as THREE from '../../vendor/three.module.min.js';
import { spreadAt } from '../data/clouds.js';

/** The pieces of a pieces file, as data/clouds.js reads a record (apogee, perigee, inclination). */
export function readPieces(doc) {
  const flat = doc && Array.isArray(doc.pieces) ? doc.pieces : [];
  const out = [];
  for (let i = 0; i + 2 < flat.length; i += 3) {
    const apo = Number(flat[i]), peri = Number(flat[i + 1]), inc = Number(flat[i + 2]) / 10;
    if (Number.isFinite(apo) && Number.isFinite(peri) && Number.isFinite(inc)) out.push({ meta: { apogeeKm: apo, perigeeKm: peri, inclinationDeg: inc } });
  }
  return out;
}

const scratch = { x: 0, y: 0, z: 0 };

/**
 * Where every piece is at `tMs`, written into `out` as three.js-axis metres relative to `origin` ([x, y, z] in the same
 * axes and units). The Earth-inertial km of spreadAt are turned as moments/stage.js eciToThree turns a vector:
 * (x, y, z) -> (x, z, -y). Before the event nothing is written (0 is returned).
 */
export function fillCloud(out, pieces, cloud, tMs, origin) {
  let n = 0;
  const ox = origin[0], oy = origin[1], oz = origin[2];
  for (const piece of pieces) {
    if (!spreadAt(piece, cloud, tMs, scratch)) continue;
    const k = n * 3;
    out[k] = scratch.x * 1000 - ox;
    out[k + 1] = scratch.z * 1000 - oy;
    out[k + 2] = -scratch.y * 1000 - oz;
    n += 1;
  }
  return n;
}

/** The points: one vertex a piece, `sizePx` CSS pixels across whatever the distance. */
export function createDebrisCloud({ count, colour = '#ff8a5c', sizePx = 2.5, pixelRatio = 1 } = {}) {
  const positions = new Float32Array(Math.max(1, count) * 3);
  const geometry = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(positions, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', attr);
  geometry.setDrawRange(0, 0);
  const material = new THREE.PointsMaterial({ color: new THREE.Color(colour), size: sizePx * pixelRatio, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.name = 'moment-debris-cloud';
  return {
    points,
    positions,
    set(n) {
      geometry.setDrawRange(0, n);
      attr.needsUpdate = n > 0;
      points.visible = n > 0;
    },
    dispose() {
      if (points.parent) points.parent.remove(points);
      geometry.dispose();
      material.dispose();
    },
  };
}
