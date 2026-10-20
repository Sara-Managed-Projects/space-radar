// scene/moonshape.js -- bend a unit sphere to a moon's measured shape (2026-10-05).
//
// Contract: applyMoonShape(geometry, shape, stepDeg) -> geometry   (mutates and returns it)
//           radiusAt(grid, stepDeg, latDeg, eastLonDeg) -> radius as a share of the mean radius
//           decodeGrid(base64) -> Uint8Array
//
// Fetched with data/moonshapes.js by scene/worlds.js the first time Phobos or Deimos is big enough
// on screen to show a shape; nothing here is loaded at boot. The sphere keeps its vertices, its
// faces and its texture coordinates -- Phobos's map still lands where it did -- and every vertex is
// moved along its own radius to the model's radius in that direction.
//
// The grid (scripts/build-moon-shapes.py): rows from latitude -90 to +90, columns of EAST longitude
// from 0, a byte b for a radius of 0.5 + b / 255. The mesh's axes are scene/worlds.js's: +Y north,
// longitude 0 at +X (the middle of the map), east toward -Z.

/** @param {string} b64 @returns {Uint8Array} */
export function decodeGrid(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Bilinear in the grid; longitude wraps, latitude is clamped to the poles. */
export function radiusAt(grid, stepDeg, latDeg, eastLonDeg) {
  const cols = Math.round(360 / stepDeg);
  const rows = Math.round(180 / stepDeg) + 1;
  const fy = Math.max(0, Math.min(rows - 1, (latDeg + 90) / stepDeg));
  const fx = ((((eastLonDeg % 360) + 360) % 360) / stepDeg);
  const y0 = Math.min(rows - 2, Math.floor(fy));
  const x0 = Math.floor(fx) % cols;
  const x1 = (x0 + 1) % cols;
  const ty = fy - y0;
  const tx = fx - Math.floor(fx);
  const at = (y, x) => 0.5 + grid[y * cols + x] / 255;
  return (at(y0, x0) * (1 - tx) + at(y0, x1) * tx) * (1 - ty) + (at(y0 + 1, x0) * (1 - tx) + at(y0 + 1, x1) * tx) * ty;
}

/**
 * @param {import('../../vendor/three.module.min.js').BufferGeometry} geometry  a unit SphereGeometry
 * @param {{grid: string}} shape  a row of data/moonshapes.js MOON_SHAPES
 * @param {number} stepDeg
 */
export function applyMoonShape(geometry, shape, stepDeg) {
  const grid = decodeGrid(shape.grid);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.hypot(x, y, z) || 1;
    const lat = (Math.asin(Math.max(-1, Math.min(1, y / len))) * 180) / Math.PI;
    const lon = (Math.atan2(-z, x) * 180) / Math.PI;
    const r = radiusAt(grid, stepDeg, lat, lon) / len;
    pos.setXYZ(i, x * r, y * r, z * r);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  // A sphere's seam is two columns of vertices in one place, and each pole a whole row: the normals
  // computed from one side's faces only would draw a crease down longitude 180 and a star at each pole.
  const nrm = geometry.attributes.normal;
  const p = geometry.parameters || {};
  const w = (p.widthSegments || 0) + 1;
  const h = (p.heightSegments || 0) + 1;
  if (w > 1 && h > 1 && w * h === pos.count) {
    for (let iy = 0; iy < h; iy++) {
      const a = iy * w;
      const b = a + w - 1;
      const pole = iy === 0 || iy === h - 1;
      let nx = 0;
      let ny = 0;
      let nz = 0;
      for (let ix = pole ? 0 : w - 1; ix < w; ix++) { nx += nrm.getX(a + ix); ny += nrm.getY(a + ix); nz += nrm.getZ(a + ix); }
      if (!pole) { nx += nrm.getX(a); ny += nrm.getY(a); nz += nrm.getZ(a); }
      const l = Math.hypot(nx, ny, nz) || 1;
      if (pole) for (let ix = 0; ix < w; ix++) nrm.setXYZ(a + ix, nx / l, ny / l, nz / l);
      else { nrm.setXYZ(a, nx / l, ny / l, nz / l); nrm.setXYZ(b, nx / l, ny / l, nz / l); }
    }
    nrm.needsUpdate = true;
  }
  geometry.computeBoundingSphere();
  return geometry;
}

// 0077 W3-d: begin
// ------------------------------------------------------------------------------------------------
// A SMALL BODY TURNING AS MEASURED (release 1.3.0 stage W3-d, internal #866). Ryugu, Itokawa and Didymos are
// drawn from their published shape models (site/models/asteroid-*.glb, scripts/small-body-glb.py), in their
// own axes: +z the pole, +x the prime meridian. scene/realmodels.js gives each route a `spin`: the pole's
// right ascension and declination (J2000) and the prime meridian W = w0 + wDegPerDay * days from J2000, the
// IAU's form, from the mission's own SPICE constants or shape-model label. scene/heroes.js fetches this
// module when such a model is first drawn, and turns it by applySpin every frame, at the time being DRAWN
// (scrub the clock and it turns with it).
//
// MEASURED AND NOT. The pole and the rate are measured. The PHASE (which side faces the Sun at a given
// instant) is the model's w0 carried forward from its epoch, and is not a prediction: Itokawa's spin has
// been speeding up since Hayabusa measured it (YORP), so its phase today could be anywhere. A moon
// (Dimorphos) goes round its primary in the primary's equator at its measured distance and period after
// DART's impact, keeping one face to it; where it is on that orbit is illustrative. ui/cards.js says both.

const DEG = Math.PI / 180;
/** J2000.0 (2000-01-01 12:00 TT) in Unix ms: TT runs 64.184 s ahead of UTC then. */
export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0) - 64184;
const OBLIQUITY = 23.4392911 * DEG;
const rotZ = (v, a) => { const c = Math.cos(a); const s = Math.sin(a); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
const rotX = (v, a) => { const c = Math.cos(a); const s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
/** Equatorial J2000 to ecliptic J2000 (the app's sun-inertial axes). */
const toEcliptic = (v) => [v[0], v[1] * Math.cos(OBLIQUITY) + v[2] * Math.sin(OBLIQUITY), -v[1] * Math.sin(OBLIQUITY) + v[2] * Math.cos(OBLIQUITY)];

/** The prime meridian's angle at `tMs`, radians in [0, 2 pi). Pure. */
export function spinAngle(spin, tMs) {
  const days = (tMs - J2000_MS) / 86400e3;
  const w = (spin.w0Deg + spin.wDegPerDay * days) % 360;
  return ((w + 360) % 360) * DEG;
}

/**
 * The body's own x, y and z axes in ecliptic J2000 at `tMs`: body -> EQJ is Rz(ra + 90) Rx(90 - dec) Rz(W),
 * the IAU convention and propagate/frames.js bodyFixedToInertial's, then the obliquity. Pure.
 */
export function spinAxes(spin, tMs) {
  const W = spinAngle(spin, tMs);
  const a = spin.poleRaDeg * DEG;
  const d = spin.poleDecDeg * DEG;
  const turn = (e) => toEcliptic(rotZ(rotX(rotZ(e, W), Math.PI / 2 - d), a + Math.PI / 2));
  return { x: turn([1, 0, 0]), y: turn([0, 1, 0]), z: turn([0, 0, 1]) };
}

/**
 * Where a moon is on its primary's equator, in the PRIMARY'S OWN axes (it turns with the primary's mesh):
 * the angle it has gone round in inertial space less the primary's own turn. Pure.
 */
export function moonAngle(spin, tMs) {
  const m = spin.moon;
  const days = (tMs - J2000_MS) / 86400e3;
  const inertial = ((days * 24) / m.periodH) * 2 * Math.PI;
  const a = (inertial - spinAngle(spin, tMs)) % (2 * Math.PI);
  return a < 0 ? a + 2 * Math.PI : a;
}

/**
 * Turn a loaded model to its body's axes at `tMs`, and put its moon where it goes. `toScene(v, out)` turns an
 * ecliptic direction into the scene's (scene/stage.js dirToScene with frame 'sun-inertial'); `basis` is a
 * THREE.Matrix4 to work in. Returns false when the scene could not express a direction (nothing is turned).
 */
export function applySpin(obj, spin, tMs, toScene, basis, vx, vy, vz) {
  if (!obj || !spin || !Number.isFinite(tMs)) return false;
  const ax = spinAxes(spin, tMs);
  const x = toScene(ax.x, vx);
  const y = toScene(ax.y, vy);
  const z = toScene(ax.z, vz);
  if (!x || !y || !z) return false;
  basis.makeBasis(x, y, z);
  obj.quaternion.setFromRotationMatrix(basis);
  if (spin.moon) {
    if (obj.userData.moonNode === undefined) obj.userData.moonNode = obj.getObjectByName(spin.moon.node) || null;
    const node = obj.userData.moonNode;
    if (node) {
      const th = moonAngle(spin, tMs);
      node.position.set(spin.moon.aKm * Math.cos(th), spin.moon.aKm * Math.sin(th), 0);
      // One face to the primary: the moon's own +x (toward Didymos in DIMORPHOS_FIXED) points home.
      node.rotation.set(0, 0, th + Math.PI);
    }
  }
  return true;
}
// 0077 W3-d: end
