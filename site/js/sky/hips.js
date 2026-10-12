// sky/hips.js -- reading a HiPS sky: which tile is where, which tiles a view needs, and a cache
// (internal #286; docs/research/2026-10-wwt.md finding 4).
//
// Contract (all pure, no three, no DOM, no fetch: tests/test_hips.mjs runs it under node):
//   faceXyToDir(face, x, y) -> [x, y, z]        a point of a base tile, x and y in 0..1
//   dirToFaceXy(dir) -> { face, x, y }          its inverse
//   nestOf(order, dir) -> npix                  the tile a direction falls in, NESTED numbering
//   tileXy(order, npix) -> { face, ix, iy }
//   tileGrid(order, npix, n, toEq?) -> { positions: Float32Array, uvs: Float32Array, index: Uint16Array }
//   tileCentre(order, npix) -> dir, tileRadius(order) -> radians
//   tilesInCone(order, dir, radiusRad, cap?) -> npix[]
//   orderFor(fovDeg, heightPx, tileWidth, minOrder, maxOrder) -> order
//   tileUrl(base, order, npix, ext) -> string
//   frameToEq(frame) -> nine numbers, row-major: the survey's frame to equatorial J2000
//   createLru(cap, onEvict) -> { get(k), set(k, v), has(k), delete(k), size(), keys() }
//
// WHAT HiPS IS. The IVOA's standard for a sky cut into tiles (Fernique et al. 2015, A&A 578, A114;
// the recommendation is HiPS 1.0, 2017). The sphere is HEALPix's twelve equal-area diamonds; at
// order k each is cut into 4^k tiles, numbered in the NESTED scheme, and tile n of order k is the
// file `Norder{k}/Dir{floor(n / 10000) * 10000}/Npix{n}.jpg`. CDS in Strasbourg serves more than
// a thousand surveys this way with `Access-Control-Allow-Origin: *`.
//
// THE ONE THING THE STANDARD LEAVES TO THE READER TO GET WRONG is how a tile's picture lies in its
// diamond. Measured 2026-10-06, not taken on trust: scripts/build_otherlight.py bakes a whole sky
// from the order-3 tiles in each of the eight possible orientations, and only one has no seams
// (and puts the Galactic centre, Andromeda and the Large Magellanic Cloud where they are): the
// picture's columns run along HEALPix's y, its rows, from the top, along HEALPix's x. So with
// three.js's flipped textures a tile's uv is (y, 1 - x). The same function draws the tiles here.
//
// The HEALPix formulas are Gorski et al. 2005 (ApJ 622, 759) as healpix_base.cc writes them.

const JRLL = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4];
const JPLL = [1, 3, 5, 7, 0, 2, 4, 6, 1, 3, 5, 7];
const HALF_PI = Math.PI / 2;
const DEG = Math.PI / 180;

/** A point of base tile `face` (0..11), x and y in 0..1 along its two edges, as a unit vector. */
export function faceXyToDir(face, x, y) {
  const jr = JRLL[face] - x - y;
  let nr;
  let z;
  if (jr < 1) { nr = jr; z = 1 - (nr * nr) / 3; }
  else if (jr > 3) { nr = 4 - jr; z = (nr * nr) / 3 - 1; }
  else { nr = 1; z = ((2 - jr) * 2) / 3; }
  let tmp = JPLL[face] * nr + x - y;
  if (tmp < 0) tmp += 8;
  if (tmp >= 8) tmp -= 8;
  const phi = nr < 1e-15 ? 0 : (0.5 * HALF_PI * tmp) / nr;
  const s = Math.sqrt(Math.max(0, 1 - z * z));
  return [s * Math.cos(phi), s * Math.sin(phi), z];
}

/** The base tile a direction is in, and where in it. */
export function dirToFaceXy(dir) {
  const n = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const z = dir[2] / n;
  const za = Math.abs(z);
  let tt = (((Math.atan2(dir[1], dir[0]) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / HALF_PI;
  if (tt >= 4) tt = 3.9999999999;
  const lim = 1 - 1e-12;
  if (za <= 2 / 3) {
    const jp = 0.5 + tt - z * 0.75;
    const jm = 0.5 + tt + z * 0.75;
    const ifp = Math.floor(jp);
    const ifm = Math.floor(jm);
    const face = ifp === ifm ? ((ifp & 3) | 4) : ifp < ifm ? (ifp & 3) : (ifm & 3) + 8;
    return { face, x: Math.min(lim, Math.max(0, jm - ifm)), y: Math.min(lim, Math.max(0, 1 - (jp - ifp))) };
  }
  const ntt = Math.min(3, Math.floor(tt));
  const tp = tt - ntt;
  const tmp = Math.sqrt(3 * (1 - za));
  const jp = Math.min(lim, tp * tmp);
  const jm = Math.min(lim, (1 - tp) * tmp);
  return z >= 0 ? { face: ntt, x: 1 - jm, y: 1 - jp } : { face: ntt + 8, x: jp, y: jm };
}

function spread(v) {
  let out = 0;
  for (let b = 0; b < 13; b += 1) out += ((v >> b) & 1) * 4 ** b;
  return out;
}
function compress(v) {
  let out = 0;
  for (let b = 0; b < 13; b += 1) out |= (Math.floor(v / 4 ** b) & 1) << b;
  return out;
}

/** Tile `npix` of `order`: its base tile and its column and row there. */
export function tileXy(order, npix) {
  const per = 4 ** order;
  const face = Math.floor(npix / per);
  const inFace = npix - face * per;
  return { face, ix: compress(inFace), iy: compress(Math.floor(inFace / 2)) };
}

/** The tile of `order` a direction falls in (NESTED). */
export function nestOf(order, dir) {
  const { face, x, y } = dirToFaceXy(dir);
  const n = 2 ** order;
  return face * 4 ** order + spread(Math.floor(x * n)) + 2 * spread(Math.floor(y * n));
}

export function tileCentre(order, npix) {
  const { face, ix, iy } = tileXy(order, npix);
  const n = 2 ** order;
  return faceXyToDir(face, (ix + 0.5) / n, (iy + 0.5) / n);
}

/**
 * No point of a tile is farther than this from its centre. Measured over every corner of every
 * tile (2026-10-06): 48.2 degrees for a base tile, and 55.2, 58.3, 59.8, 60.9, 61.1 degrees
 * / 2^order at orders 1, 2, 3, 5 and 7 (the tiles beside the poles are the long ones), so 62.
 */
export function tileRadius(order) {
  return (62 * DEG) / 2 ** order;
}

const rot = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

// Equatorial J2000 -> Galactic (Hipparcos, ESA SP-1200 vol. 1, eq. 1.5.11); its transpose goes back.
const EQ_TO_GAL = [
  -0.0548755604, -0.8734370902, -0.4838350155,
  0.4941094279, -0.44482963, 0.7469822445,
  -0.867666149, -0.1980763734, 0.4559837762,
];
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

/** The rotation from a survey's `hips_frame` to equatorial J2000, and back. */
export function frameToEq(frame) { return frame === 'galactic' ? transpose(EQ_TO_GAL) : IDENTITY; }
export function eqToFrame(frame) { return frame === 'galactic' ? EQ_TO_GAL : IDENTITY; }
export const rotate = rot;

/**
 * A tile as a small grid a renderer can draw: (n + 1)^2 unit directions (through `toEq`, nine
 * numbers, when the survey is not equatorial), the texture coordinate of each, and the triangles.
 * `inset` pulls the texture coordinates in by that share of the tile (half a texel when the tile
 * is a cell of a bigger picture, so bilinear filtering does not bleed its neighbour in).
 */
export function tileGrid(order, npix, n = 4, toEq = null, inset = 0) {
  const { face, ix, iy } = tileXy(order, npix);
  const side = 2 ** order;
  const positions = new Float32Array((n + 1) * (n + 1) * 3);
  const uvs = new Float32Array((n + 1) * (n + 1) * 2);
  let k = 0;
  for (let j = 0; j <= n; j += 1) {
    for (let i = 0; i <= n; i += 1) {
      const fx = i / n;
      const fy = j / n;
      let d = faceXyToDir(face, (ix + fx) / side, (iy + fy) / side);
      if (toEq) d = rot(toEq, d);
      positions[k * 3] = d[0]; positions[k * 3 + 1] = d[1]; positions[k * 3 + 2] = d[2];
      // The picture's columns run along y; its rows, from the top, along x (see the header).
      uvs[k * 2] = inset + fy * (1 - 2 * inset);
      uvs[k * 2 + 1] = 1 - (inset + fx * (1 - 2 * inset));
      k += 1;
    }
  }
  const index = new Uint16Array(n * n * 6);
  let t = 0;
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const a = j * (n + 1) + i;
      const b = a + 1;
      const c = a + n + 1;
      const d = c + 1;
      index[t++] = a; index[t++] = b; index[t++] = c;
      index[t++] = b; index[t++] = d; index[t++] = c;
    }
  }
  return { positions, uvs, index };
}

/**
 * The tiles of `order` that may show inside a cone: the twelve base tiles, each cut in four as
 * long as it still touches the cone. Nearest the axis first; never more than `cap`.
 */
export function tilesInCone(order, dir, radiusRad, cap = 64) {
  const n = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const u = [dir[0] / n, dir[1] / n, dir[2] / n];
  let level = [];
  for (let f = 0; f < 12; f += 1) level.push(f);
  const touching = (k, list) => {
    const out = [];
    const reach = radiusRad + tileRadius(k);
    for (const p of list) {
      const c = tileCentre(k, p);
      const ang = Math.acos(Math.max(-1, Math.min(1, c[0] * u[0] + c[1] * u[1] + c[2] * u[2])));
      if (ang <= reach) out.push({ p, ang });
    }
    return out;
  };
  let kept = touching(0, level);
  for (let k = 1; k <= order; k += 1) {
    level = [];
    for (const t of kept) { const b = t.p * 4; level.push(b, b + 1, b + 2, b + 3); }
    kept = touching(k, level);
  }
  kept.sort((a, b) => a.ang - b.ang);
  return kept.slice(0, cap).map((t) => t.p);
}

/**
 * The order worth fetching for a field of view: the shallowest whose tiles have at least two
 * thirds of a picture pixel per screen pixel (a little soft beats four times the bytes).
 */
export function orderFor(fovDeg, heightPx, tileWidth = 512, minOrder = 0, maxOrder = 3) {
  const want = (fovDeg / Math.max(1, heightPx)) * 1.5; // degrees a picture pixel may span
  let k = minOrder;
  while (k < maxOrder && 58.6 / (2 ** k * tileWidth) > want) k += 1;
  return k;
}

export function tileUrl(base, order, npix, ext = 'jpg') {
  return `${String(base).replace(/\/$/, '')}/Norder${order}/Dir${Math.floor(npix / 10000) * 10000}/Npix${npix}.${ext}`;
}

/** Least recently used out first. `onEvict(key, value)` is where a texture is disposed. */
export function createLru(cap, onEvict) {
  const map = new Map();
  return {
    get(k) {
      if (!map.has(k)) return undefined;
      const v = map.get(k);
      map.delete(k);
      map.set(k, v);
      return v;
    },
    set(k, v) {
      if (map.has(k)) map.delete(k);
      map.set(k, v);
      while (map.size > cap) {
        const old = map.keys().next().value;
        const ov = map.get(old);
        map.delete(old);
        if (onEvict) onEvict(old, ov);
      }
    },
    has: (k) => map.has(k),
    delete(k) { return map.delete(k); },
    size: () => map.size,
    keys: () => [...map.keys()],
  };
}
