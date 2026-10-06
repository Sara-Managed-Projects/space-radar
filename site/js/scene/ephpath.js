// scene/ephpath.js -- the path a craft has flown so far, as a thin line (internal #406).
//
// Contract: createEphPath(scene, stage) -> { set(eph | null, klass), update(tMs), dispose(), line }
// Pure and exported for the test: countUpTo(times, tMs) -> how many samples are at or before tMs
//
// When a craft with a file of its own path is selected (propagate/ephemeris.js), the samples of
// that file up to the clock's time are joined into a line that ends at the craft. They are the
// file's own samples, already dense where the path bends (a flyby in minutes) and sparse where it
// does not (a decade of cruise in months), so nothing is resampled; a file of more than
// MAX_POINTS samples is thinned evenly.
//
// ROUND WHAT. Seen from the stage of the world the craft is passing (Voyager 1 from Jupiter's
// stage in March 1979, Apophis from the Earth's in April 2029), the line is the path ROUND THAT
// WORLD: the stretch of the file kept relative to it, with the world held where it is now, which
// is the curve of the flyby. Drawn round the Sun instead, those same days are a nearly straight
// streak, because Jupiter itself moves sixteen of its own radii a day. An orbiter's years round
// its planet are its last NEAR_POINTS samples, a few laps and not a ball of wool. From any other
// stage the line is the path in space, round the Sun, from launch to the clock's time.
//
// Never at boot: ui/missions.js imports this the first time a path file lands.
//
// THE ARITHMETIC. The points are heliocentric kilometres in float64. The stage's frame is a
// rotation and a shift of that, the same for every point at one instant, so four conversions
// (the origin and three axes) give the whole map and the rest is a multiply. The vertices are
// float32 offsets from the craft, and the line's own position carries the large number, as
// scene/orbitline.js does and for its reason: at 170 au a float32 scene unit is whole kilometres.

import * as THREE from '../../vendor/three.module.min.js';
import { pathOf, stateAt } from '../propagate/ephemeris.js';
import { worldHelioEclKm } from '../propagate/frames.js';
import { CLASS_COLOURS } from './glyphatlas.js';

export const MAX_POINTS = 4096;
export const NEAR_POINTS = 1500;
const AXIS_KM = 1e9;

/** How many of the ascending `times` are at or before `tMs`. Pure. */
export function countUpTo(times, tMs) {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= tMs) lo = mid + 1; else hi = mid;
  }
  return lo;
}

export function createEphPath(scene, stage) {
  const positions = new Float32Array((MAX_POINTS + 1) * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthTest: true, depthWrite: false });
  const line = new THREE.Line(geometry, material);
  line.name = 'eph-path';
  line.frustumCulled = false;
  line.visible = false;
  line.renderOrder = 1;
  if (scene) scene.add(line);

  let eph = null;
  let path = null;
  let stride = 1;
  let builtAt = NaN;
  let builtStage = null;
  const o = new THREE.Vector3();
  const ax = new THREE.Vector3();
  const ay = new THREE.Vector3();
  const az = new THREE.Vector3();
  const here = new THREE.Vector3();

  function set(next, klass) {
    eph = next || null;
    path = eph ? pathOf(eph) : null;
    stride = path ? Math.max(1, Math.ceil(path.t.length / MAX_POINTS)) : 1;
    builtAt = NaN;
    line.visible = false;
    if (eph) material.color.set(CLASS_COLOURS[klass] || '#E8ECF2');
  }

  function update(tMs) {
    if (!eph || !path) return;
    if (tMs === builtAt && builtStage === stage.worldId) return;
    builtAt = tMs;
    builtStage = stage.worldId;
    const st = stateAt(eph, tMs);
    const c = st && st.centre !== 'sun' ? worldHelioEclKm(st.centre, tMs) : null;
    if (!st || (st.centre !== 'sun' && !c)) { line.visible = false; return; }
    const hx = st.x + (c ? c.x : 0);
    const hy = st.y + (c ? c.y : 0);
    const hz = st.z + (c ? c.z : 0);
    // The map from heliocentric km to scene units at this instant: where the Sun is, and where a
    // point AXIS_KM along each axis is.
    if (!stage.toSceneInto({ x: 0, y: 0, z: 0 }, 'sun-inertial', o, tMs)
      || !stage.toSceneInto({ x: AXIS_KM, y: 0, z: 0 }, 'sun-inertial', ax, tMs)
      || !stage.toSceneInto({ x: 0, y: AXIS_KM, z: 0 }, 'sun-inertial', ay, tMs)
      || !stage.toSceneInto({ x: 0, y: 0, z: AXIS_KM }, 'sun-inertial', az, tMs)) { line.visible = false; return; }
    ax.sub(o).multiplyScalar(1 / AXIS_KM);
    ay.sub(o).multiplyScalar(1 / AXIS_KM);
    az.sub(o).multiplyScalar(1 / AXIS_KM);
    here.set(o.x + hx * ax.x + hy * ay.x + hz * az.x, o.y + hx * ax.y + hy * ay.y + hz * az.y, o.z + hx * ax.z + hy * ay.z + hz * az.z);
    let n = 0;
    const put = (dx, dy, dz) => {
      positions[n * 3] = dx * ax.x + dy * ay.x + dz * az.x;
      positions[n * 3 + 1] = dx * ax.y + dy * ay.y + dz * az.y;
      positions[n * 3 + 2] = dx * ax.z + dy * ay.z + dz * az.z;
      n += 1;
    };
    if (st.centre !== 'sun' && st.centre === stage.worldId) {
      // Round the world this stage is centred on: offsets within the segment, no Sun in the sum.
      const seg = st.seg;
      const upTo = countUpTo(seg.t, tMs / 1000);
      for (let i = Math.max(0, upTo - NEAR_POINTS); i < upTo; i++) put(seg.p[i * 3] - st.x, seg.p[i * 3 + 1] - st.y, seg.p[i * 3 + 2] - st.z);
    } else {
      const upTo = countUpTo(path.t, tMs);
      for (let i = 0; i < upTo; i += stride) put(path.xyz[i * 3] - hx, path.xyz[i * 3 + 1] - hy, path.xyz[i * 3 + 2] - hz);
    }
    // and the craft itself, where the line ends
    positions[n * 3] = 0; positions[n * 3 + 1] = 0; positions[n * 3 + 2] = 0;
    n += 1;
    line.position.copy(here);
    geometry.attributes.position.needsUpdate = true;
    geometry.setDrawRange(0, n);
    line.visible = n >= 2;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    if (scene) scene.remove(line);
  }

  return { set, update, dispose, line, hasLine: () => line.visible };
}
