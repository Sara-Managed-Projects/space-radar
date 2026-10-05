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
