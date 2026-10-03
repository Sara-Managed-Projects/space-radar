// scene/tilemath.js -- the arithmetic of a world drawn from map tiles (spec 0065 tasks 1-2).
//
// Pure: no THREE, no network, no clock. scene/tiles.js draws with it and tests/test_tiles.mjs holds
// every function here to numbers worked out by hand.
//
// THE ADDRESSING. NASA's Solar System Treks serves each mosaic as a WMTS pyramid in plain longitude
// and latitude (EPSG:4326's shape on another body): level 0 is two 256-pixel tiles side by side,
// west and east, and every level doubles both ways, so level z is 2^(z+1) columns by 2^z rows and a
// tile is 180 / 2^z degrees on a side. Row 0 is the NORTH edge and column 0 starts at 180 W.
// Measured 2026-10-03 against trek.nasa.gov: level 0 answers 0/0/0 and 0/0/1 and 404s 0/0/2 and
// 0/1/0; the Moon's WAC mosaic and Mars's THEMIS mosaic both answer to level 8. The
// commented-out 3 x 2 matrix in the host's own capabilities file is not what it serves.
//
// WHICH LEVEL. A tile is fine enough when one of its texels is no wider on the ground than one
// screen pixel is there: texel = pi R / (tilePx 2^z), pixel = distance x the angle of one pixel.
// The level is chosen per tile from the distance to its NEAREST point, so the ground under the
// camera gets the finest tiles and the limb, a thousand kilometres off, coarse ones.
//
// AND HOW OBLIQUELY IT IS SEEN. Ground near the limb is seen edge-on: a screen pixel there is as
// narrow as anywhere across the line of sight and 1 / cos(e) longer along it, e being the angle
// between the ground's normal and the camera. The level is chosen for the geometric mean of the two,
// footprint / sqrt(cos e), which the anisotropic filter then draws well; choosing for the narrow
// side alone asked for 135 tiles and 4.8 MB with the whole disc of the Moon in view (measured
// 2026-10-03), most of them spent on ground squeezed into the limb.
//
// WHAT IS NOT DONE HERE. A tile near a pole is as many texels wide as one on the equator though it
// covers a sliver: that is the equirectangular pinch, and the cube-face tiles of internal issue
// #278 are the cure.

const RAD = Math.PI / 180;

/** Columns and rows at a level: two tiles by one at level 0 (`matrix` in registry/tilesets.yaml). */
export function matrixAt(z, matrix = [2, 1]) {
  const n = 2 ** z;
  return { cols: matrix[0] * n, rows: matrix[1] * n };
}

/** A tile's side in degrees at a level. */
export function tileSpanDeg(z, matrix = [2, 1]) {
  return 180 / (matrix[1] * 2 ** z);
}

/** East longitude in [-180, 180). */
export function wrapLon(lonDeg) {
  let l = ((lonDeg + 180) % 360 + 360) % 360 - 180;
  if (l === 180) l = -180;
  return l;
}

/** The tile holding a point: {z, x (column), y (row, 0 at the north edge)}. The poles and 180 E clamp. */
export function lonLatToTile(lonDeg, latDeg, z, matrix = [2, 1]) {
  const { cols, rows } = matrixAt(z, matrix);
  const span = tileSpanDeg(z, matrix);
  const x = Math.min(cols - 1, Math.max(0, Math.floor((wrapLon(lonDeg) + 180) / span)));
  const y = Math.min(rows - 1, Math.max(0, Math.floor((90 - latDeg) / span)));
  return { z, x, y };
}

/** A tile's edges in degrees. */
export function tileBounds(z, x, y, matrix = [2, 1]) {
  const span = tileSpanDeg(z, matrix);
  const west = -180 + x * span;
  const north = 90 - y * span;
  return { west, east: west + span, south: north - span, north };
}

/** The cache key, in the order the URL carries them: level / row / column. */
export function tileKey(z, x, y) { return z + '/' + y + '/' + x; }

/** `{z}` the level, `{y}` the row, `{x}` the column -- WMTS's TileMatrix, TileRow, TileCol. */
export function tileUrl(template, z, x, y) {
  return String(template).replace('{z}', z).replace('{y}', y).replace('{x}', x);
}

/** The key of a tile's ancestor `up` levels above it, or null past level 0. */
export function ancestorKey(z, x, y, up = 1) {
  if (up > z) return null;
  return tileKey(z - up, x >> up, y >> up);
}

/** A key back into numbers. */
export function parseKey(key) {
  const [z, y, x] = String(key).split('/').map(Number);
  return { z, x, y };
}

/** True when tile `a` lies inside tile `b` (and is not `b`). */
export function isDescendant(a, b) {
  const up = a.z - b.z;
  return up > 0 && (a.x >> up) === b.x && (a.y >> up) === b.y;
}

/** One texel's width on the ground, in radians of arc (multiply by the radius for km). */
export function texelRad(z, tilePx = 256, matrix = [2, 1]) {
  return Math.PI / (matrix[1] * 2 ** z * tilePx);
}

/**
 * The coarsest level whose texel is no wider than `footprintRad` (one screen pixel on the ground,
 * as an arc), clamped to [min, max]. A footprint of 0 or less is the finest level there is.
 */
export function levelForFootprint(footprintRad, { tilePx = 256, matrix = [2, 1], min = 0, max = 30 } = {}) {
  if (!(footprintRad > 0)) return max;
  const z = Math.ceil(Math.log2(Math.PI / (matrix[1] * tilePx * footprintRad)) - 1e-9);
  return Math.min(max, Math.max(min, z));
}

/**
 * The arc from a point to the nearest point of a tile, radians. 0 inside it. The nearest point is
 * taken by clamping the latitude and the longitude each to the tile's range, which is exact on a
 * parallel or a meridian and within a few per cent of the tile's side everywhere else; select()
 * allows for that with a margin.
 */
export function arcToTile(lonDeg, latDeg, b) {
  const lat = Math.min(b.north, Math.max(b.south, latDeg));
  const mid = (b.west + b.east) / 2;
  const half = (b.east - b.west) / 2;
  const off = wrapLon(lonDeg - mid);
  const dLon = Math.max(0, Math.abs(off) - half);
  if (dLon === 0 && lat === latDeg) return 0;
  const p1 = latDeg * RAD;
  const p2 = lat * RAD;
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dLon * RAD);
  return Math.acos(Math.min(1, Math.max(-1, c)));
}

/** How far round the globe a camera `dist` radii from the centre can see: the arc to its horizon. */
export function horizonArc(dist) {
  return dist > 1 ? Math.acos(1 / dist) : 0;
}

/** The straight distance, in radii, from a camera `dist` radii out to a surface point `arc` away. */
export function rangeTo(dist, arc) {
  return Math.sqrt(Math.max(0, 1 + dist * dist - 2 * dist * Math.cos(arc)));
}

/**
 * The cosine of the emission angle at a surface point `arc` from the camera's sub-point: 1 straight
 * down, 0 at the horizon. Floored at MIN_COS_E so the limb's own tiles are coarse, not absent.
 */
export const MIN_COS_E = 0.15;
export function cosEmission(dist, arc) {
  const range = rangeTo(dist, arc);
  if (!(range > 0)) return 1;
  return Math.min(1, Math.max(MIN_COS_E, (dist * Math.cos(arc) - 1) / range));
}

/**
 * The level the ground straight under the camera asks for, unclamped below: what decides whether
 * the tiles are worth starting at all (`start_level`).
 */
export function nadirLevel(view, set) {
  const foot = (view.dist - 1) * view.pixelRad;
  return levelForFootprint(foot, { tilePx: set.tilePx, matrix: set.matrix, min: 0, max: set.maxLevel });
}

/**
 * The tiles to draw for a view: every tile on the camera's side of the horizon (and inside
 * `view.inView`, when given), each at the level its nearest point asks for, never coarser than
 * `set.minLevel` -- so the whole visible ground comes from one mosaic and there is no edge where
 * the tiles stop and the base map starts.
 *
 * @param {object} view  { lonDeg, latDeg, dist, pixelRad, inView? } -- the camera's sub-point, its
 *   distance from the centre in radii, the angle of one device pixel, and an optional test
 *   (bounds, z, x, y) -> boolean for the view frustum.
 * @param {object} set   { minLevel, maxLevel, tilePx, matrix }
 * @param {object} [opts] { maxTiles, detail } -- `detail` > 1 accepts texels that many pixels wide.
 *   Over `maxTiles` the whole selection is redone coarser, so a 4k screen gets an even picture one
 *   notch down, not a sharp middle with holes round it.
 * @returns {{tiles: {z,x,y,key,range}[], detail: number}} nearest first.
 */
export function selectTiles(view, set, opts = {}) {
  const maxTiles = opts.maxTiles > 0 ? opts.maxTiles : Infinity;
  let detail = opts.detail > 0 ? opts.detail : 1;
  let tiles = pass(view, set, detail);
  for (let i = 0; i < 12 && tiles.length > maxTiles; i++) {
    detail *= Math.SQRT2;
    tiles = pass(view, set, detail);
  }
  tiles.sort((a, b) => (a.range - b.range) || (a.z - b.z) || (a.y - b.y) || (a.x - b.x));
  if (tiles.length > maxTiles) tiles.length = maxTiles;
  return { tiles, detail };
}

function pass(view, set, detail) {
  const matrix = set.matrix || [2, 1];
  const tilePx = set.tilePx || 256;
  const horizon = horizonArc(view.dist);
  const out = [];
  const root = matrixAt(0, matrix);
  const visit = (z, x, y) => {
    const b = tileBounds(z, x, y, matrix);
    const arc = arcToTile(view.lonDeg, view.latDeg, b);
    // The margin covers arcToTile's clamp and keeps a tile that only just clears the limb.
    if (arc - 0.05 * (b.north - b.south) * RAD > horizon) return;
    if (view.inView && !view.inView(b, z, x, y)) return;
    const range = rangeTo(view.dist, Math.min(arc, horizon));
    const oblique = Math.sqrt(cosEmission(view.dist, Math.min(arc, horizon)));
    const fine = texelRad(z, tilePx, matrix) * oblique <= range * view.pixelRad * detail;
    if (z >= set.maxLevel || (z >= set.minLevel && fine)) {
      out.push({ z, x, y, key: tileKey(z, x, y), range });
      return;
    }
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) visit(z + 1, x * 2 + i, y * 2 + j);
  };
  for (let y = 0; y < root.rows; y++) for (let x = 0; x < root.cols; x++) visit(0, x, y);
  return out;
}

/**
 * What to put on screen this frame, given what has arrived. For each wanted tile:
 *   - arrived and fully faded in: it alone;
 *   - otherwise: it (if it has arrived, fading in), the nearest arrived ancestor under it, and any
 *     finer tile inside it that was on screen last frame -- so zooming out never drops back to the
 *     base map while the coarser tile is on its way, and zooming in sharpens over what was there.
 * A child is drawn after its parent (scene/tiles.js orders by level), so the finest wins.
 *
 * @param {{z,x,y,key}[]} wanted
 * @param {(key: string) => boolean} isReady   the tile's picture has arrived
 * @param {(key: string) => boolean} isSolid   ...and its fade has finished
 * @param {Iterable<string>} prevDrawn         the keys drawn last frame
 * @param {number} minLevel                    no ancestor coarser than this is used
 * @returns {Set<string>}
 */
export function drawSet(wanted, isReady, isSolid, prevDrawn, minLevel = 0) {
  const out = new Set();
  let prev = null;
  for (const w of wanted) {
    const ready = isReady(w.key);
    if (ready) out.add(w.key);
    if (ready && isSolid(w.key)) continue;
    for (let up = 1; w.z - up >= minLevel; up++) {
      const a = ancestorKey(w.z, w.x, w.y, up);
      if (a && isReady(a)) { out.add(a); break; }
    }
    if (!prev) prev = [...prevDrawn].map((k) => ({ key: k, ...parseKey(k) }));
    for (const p of prev) if (isDescendant(p, w) && isReady(p.key)) out.add(p.key);
  }
  return out;
}

/**
 * The coarse tiles fetched first under a selection: the ancestor at `level` of each wanted tile at
 * least two levels finer. A handful of them cover the middle of the view, so the ground changes
 * mosaic once, early, and every finer tile then sharpens a picture that is already there. A wanted
 * tile only one level finer gets none: its ancestor would cost a quarter of what it stands in for.
 */
export function underlay(wanted, level) {
  const seen = new Map();
  for (const w of wanted) {
    if (w.z < level + 2) continue;
    const up = w.z - level;
    const key = tileKey(level, w.x >> up, w.y >> up);
    if (!seen.has(key)) seen.set(key, { z: level, x: w.x >> up, y: w.y >> up, key, range: w.range });
  }
  return [...seen.values()];
}

/**
 * Least-recently-used bookkeeping: which keys to let go when there are more than `capacity`.
 * touch(key) marks a use; trim(pinned) returns the keys evicted, oldest first, never one `pinned`
 * says is on screen or on its way -- so the cache can run over its capacity for a frame rather than
 * punch a hole in the picture.
 */
export function createLru(capacity) {
  const order = new Map(); // insertion order is use order: oldest first
  return {
    touch(key) { order.delete(key); order.set(key, true); },
    delete(key) { return order.delete(key); },
    has(key) { return order.has(key); },
    get size() { return order.size; },
    keys() { return [...order.keys()]; },
    setCapacity(n) { capacity = n; },
    get capacity() { return capacity; },
    trim(pinned) {
      const out = [];
      if (order.size <= capacity) return out;
      for (const key of order.keys()) {
        if (order.size - out.length <= capacity) break;
        if (pinned && pinned(key)) continue;
        out.push(key);
      }
      for (const key of out) order.delete(key);
      return out;
    },
  };
}

/** Segments along each side of a tile's patch: about one per 0.75 degrees, 4 to 24. */
export function patchSegments(z, matrix = [2, 1]) {
  return Math.min(24, Math.max(4, Math.ceil(tileSpanDeg(z, matrix) / 0.75)));
}

/**
 * A point of the unit sphere from east longitude and latitude, in the axes three's SphereGeometry
 * gives a world's mesh (scene/worlds.js): +Y the north pole, +X longitude 0, and east towards -Z,
 * which is where an equirectangular map centred on longitude 0 puts them.
 */
export function unitFromLonLat(lonDeg, latDeg, out = [0, 0, 0]) {
  const lon = lonDeg * RAD;
  const lat = latDeg * RAD;
  const c = Math.cos(lat);
  out[0] = c * Math.cos(lon);
  out[1] = Math.sin(lat);
  out[2] = -c * Math.sin(lon);
  return out;
}

/** The reverse: {lonDeg, latDeg, dist} of a point in the mesh's own axes. */
export function lonLatFromUnit(x, y, z) {
  const dist = Math.hypot(x, y, z);
  if (!(dist > 0)) return { lonDeg: 0, latDeg: 0, dist: 0 };
  return {
    lonDeg: Math.atan2(-z, x) / RAD,
    latDeg: Math.asin(Math.max(-1, Math.min(1, y / dist))) / RAD,
    dist,
  };
}

/**
 * The patch of sphere a tile covers, as flat arrays for a BufferGeometry: positions on the unit
 * sphere (which are also the normals), uv with v = 0 on the SOUTH edge (the picture is uploaded
 * bottom row first, as three does), `globe` the same point's place on the world's own whole map, and
 * triangle indices wound to face outward.
 */
export function patchArrays(b, segs) {
  const n = segs + 1;
  const positions = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  const globe = new Float32Array(n * n * 2);
  const p = [0, 0, 0];
  for (let j = 0; j < n; j++) {
    const v = j / segs;
    const lat = b.south + (b.north - b.south) * v;
    for (let i = 0; i < n; i++) {
      const u = i / segs;
      unitFromLonLat(b.west + (b.east - b.west) * u, lat, p);
      const k = j * n + i;
      positions.set(p, k * 3);
      uvs[k * 2] = u;
      uvs[k * 2 + 1] = v;
      // Where the same point is on the world's own map: for a set that is detail over that map.
      globe[k * 2] = (b.west + (b.east - b.west) * u + 180) / 360;
      globe[k * 2 + 1] = (lat + 90) / 180;
    }
  }
  const indices = new Uint16Array(segs * segs * 6);
  let q = 0;
  for (let j = 0; j < segs; j++) {
    for (let i = 0; i < segs; i++) {
      const a = j * n + i;       // south-west
      const e = a + 1;           // south-east
      const c = a + n;           // north-west
      const d = c + 1;           // north-east
      indices[q++] = a; indices[q++] = e; indices[q++] = d;
      indices[q++] = a; indices[q++] = d; indices[q++] = c;
    }
  }
  return { positions, uvs, globe, indices };
}
