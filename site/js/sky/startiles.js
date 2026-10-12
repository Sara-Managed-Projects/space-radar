// sky/startiles.js -- the stars past the 109 389 of HYG, in tiles fetched by where the view looks
// (internal #353, check 11 against Stellarium).
//
// Contract (pure):
//   LEVELS                              [{ nside, from, to, dir, want }] the two sets of tiles, their magnitudes,
//                                       and the limiting magnitude from which a sky asks for them
//   npix(nside), ang2pix(nside, dir), pix2dir(nside, pix)   HEALPix, the RING numbering
//   tileRadiusDeg(nside)                no point of a tile is farther than this from its centre
//   tilesInCone(nside, dir, radiusDeg)  -> the tiles a view cone can touch, nearest first
//   tileAxes(nside, pix)                -> { c, e1, e2 } the tile's tangent plane
//   tilePath(level, pix)                -> 'n8/123.bin'
//   parseTile(buffer)                   -> { nside, pix, count, pos, col, mag }  (col needs `colour`)
//   levelsWanted(limitMag)              -> the levels a sky this deep shows
// and createStarTiles(env) -> { update(dirEq, radiusDeg, limit), drawn(), state(), each(fn), dispose() }
//     env: { root, material(), fetchBytes(path), colour(bv, out, i), renderOrder, radius, cap }
// Loaded by sky/groundsky.js with a dynamic import the first time the field has closed far enough
// to show a star the HYG files do not hold: never on a first visit, and never for a wide sky.
//
// THE DATA is AT-HYG v4.0 (David Nash, CC BY-SA 4.0, codeberg.org/astronexus/athyg; read
// 2026-10-07): Tycho-2's stars with Gaia DR3's distances, by the author of the HYG database the
// sky already draws. scripts/build-startiles.py cuts it at magnitude 10.5, drops every star the
// HYG files already have, and writes the rest by HEALPix tile. ESA's own Gaia archive was read
// the same day and NOT used: its terms are CC BY-NC 3.0 IGO, and this site ships nothing that
// forbids commercial use (CREDITS.md 3j).
//
// WHY HEALPix, AND WHY TWO LEVELS. HEALPix (Gorski et al. 2005) cuts the sphere into 12 x nside^2
// tiles of equal area, so a tile holds about the same number of stars at the pole as at the
// equator. A wide field shows few magnitudes over much sky; a narrow field many over little. So
// the stars to magnitude 9 are in 48 large tiles (nside 2), and those from 9 to 10.5 in 768
// small ones (nside 8): either way a view asks for a handful of files of a few kilobytes.
//
// FORMAT (little-endian): 'SRST', u16 version 1, u16 nside, u32 pix, u32 count, f32 span; then
// count records of 6 bytes: u16 u, u16 v (the star on the tile's tangent plane, -span to +span),
// u8 magnitude (steps of 0.02 from 6.0), u8 B-V (steps of 0.02 from -0.5; 255 not measured).
// Brightest first, so a reader draws a prefix.

import * as THREE from '../../vendor/three.module.min.js';

const DEG = Math.PI / 180;
export const LEVELS = [
  { nside: 2, from: 6.0, to: 9.0, dir: 'n2', want: 7.3 },
  { nside: 8, from: 9.0, to: 10.5, dir: 'n8', want: 8.6 },
];
export const TILE_MAG0 = 6.0;
export const TILE_MAG_STEP = 0.02;

export const npix = (nside) => 12 * nside * nside;

/** The tile a unit vector (equatorial J2000) falls in. RING numbering, north to south. */
export function ang2pix(nside, dir) {
  const z = Math.max(-1, Math.min(1, dir[2]));
  const za = Math.abs(z);
  let phi = Math.atan2(dir[1], dir[0]);
  if (phi < 0) phi += 2 * Math.PI;
  const tt = (phi / (Math.PI / 2)) % 4;
  if (za <= 2 / 3) {
    const t1 = nside * (0.5 + tt);
    const t2 = nside * z * 0.75;
    const jp = Math.floor(t1 - t2);
    const jm = Math.floor(t1 + t2);
    const ir = nside + 1 + jp - jm;
    const kshift = 1 - (ir & 1);
    let ip = Math.floor((jp + jm - nside + kshift + 1) / 2);
    ip = ((ip % (4 * nside)) + 4 * nside) % (4 * nside);
    return 2 * nside * (nside - 1) + (ir - 1) * 4 * nside + ip;
  }
  const tp = tt - Math.floor(tt);
  const tmp = nside * Math.sqrt(3 * (1 - za));
  const jp = Math.floor(tp * tmp);
  const jm = Math.floor((1 - tp) * tmp);
  const ir = jp + jm + 1;
  let ip = Math.floor(tt * ir);
  ip = ((ip % (4 * ir)) + 4 * ir) % (4 * ir);
  return z > 0 ? 2 * ir * (ir - 1) + ip : npix(nside) - 2 * ir * (ir + 1) + ip;
}

/** The centre of a tile, a unit vector. */
export function pix2dir(nside, pix) {
  const n = npix(nside);
  const ncap = 2 * nside * (nside - 1);
  let z;
  let phi;
  if (pix < ncap) {
    const ir = Math.floor((1 + Math.sqrt(1 + 2 * pix)) / 2);
    const ip = pix + 1 - 2 * ir * (ir - 1);
    z = 1 - (ir * ir) / (3 * nside * nside);
    phi = (ip - 0.5) * Math.PI / (2 * ir);
  } else if (pix < n - ncap) {
    const k = pix - ncap;
    const ir = Math.floor(k / (4 * nside)) + nside;
    const ip = (k % (4 * nside)) + 1;
    const fodd = ((ir + nside) & 1) ? 1 : 0.5;
    z = (2 * nside - ir) * 2 / (3 * nside);
    phi = (ip - fodd) * Math.PI / (2 * nside);
  } else {
    const k = n - pix;
    const ir = Math.floor((1 + Math.sqrt(2 * k - 1)) / 2);
    const ip = 4 * ir + 1 - (k - 2 * ir * (ir - 1));
    z = -1 + (ir * ir) / (3 * nside * nside);
    phi = (ip - 0.5) * Math.PI / (2 * ir);
  }
  const s = Math.sqrt(Math.max(0, 1 - z * z));
  return [s * Math.cos(phi), s * Math.sin(phi), z];
}

/**
 * No point of a tile is farther than this from its centre: a little over one tile width (the
 * tiles round the poles are long and thin). tests/test_startiles.mjs holds it with 200 000 points.
 */
export function tileRadiusDeg(nside) {
  return 1.05 * Math.sqrt(4 * Math.PI / npix(nside)) / DEG;
}

const centres = new Map();
function centresOf(nside) {
  let c = centres.get(nside);
  if (!c) {
    c = [];
    for (let p = 0; p < npix(nside); p += 1) c.push(pix2dir(nside, p));
    centres.set(nside, c);
  }
  return c;
}

/** The tiles a cone of `radiusDeg` about `dir` can touch, nearest first. */
export function tilesInCone(nside, dir, radiusDeg) {
  const reach = Math.min(180, radiusDeg + tileRadiusDeg(nside));
  const cosReach = Math.cos(reach * DEG);
  const out = [];
  const cs = centresOf(nside);
  for (let p = 0; p < cs.length; p += 1) {
    const c = cs[p];
    const d = c[0] * dir[0] + c[1] * dir[1] + c[2] * dir[2];
    if (d >= cosReach) out.push({ pix: p, cos: d });
  }
  return out.sort((a, b) => b.cos - a.cos).map((t) => t.pix);
}

/** A tile's tangent plane: its centre, east along the parallel, north. */
export function tileAxes(nside, pix) {
  const c = pix2dir(nside, pix);
  const n = Math.hypot(c[0], c[1]);
  const e1 = [-c[1] / n, c[0] / n, 0];
  const e2 = [c[1] * e1[2] - c[2] * e1[1], c[2] * e1[0] - c[0] * e1[2], c[0] * e1[1] - c[1] * e1[0]];
  return { c, e1, e2 };
}

export const tilePath = (level, pix) => `${level.dir}/${pix}.bin`;

/**
 * Which levels a sky whose faintest star is `limitMag` asks for. The HYG files are complete to
 * about 7.3 (Hipparcos's own limit), so the first level waits for a sky deeper than that; the
 * second for one that is about to show a star of magnitude 9.
 */
export function levelsWanted(limitMag) {
  return LEVELS.filter((l) => limitMag > l.want);
}

/** A tile's bytes as unit vectors, magnitudes and (with `colour`) colours, brightest first. */
export function parseTile(buffer, colour) {
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== 'SRST' || dv.getUint16(4, true) !== 1) throw new Error('star tile: not the file this was written for');
  const nside = dv.getUint16(6, true);
  const pix = dv.getUint32(8, true);
  const count = dv.getUint32(12, true);
  const span = dv.getFloat32(16, true);
  if (buffer.byteLength < 20 + count * 6 || pix >= npix(nside)) throw new Error('star tile: cut short');
  const { c, e1, e2 } = tileAxes(nside, pix);
  const pos = new Float32Array(count * 3);
  const mag = new Float32Array(count);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const o = 20 + i * 6;
    const u = (dv.getUint16(o, true) / 65535 * 2 - 1) * span;
    const v = (dv.getUint16(o + 2, true) / 65535 * 2 - 1) * span;
    const x = c[0] + u * e1[0] + v * e2[0];
    const y = c[1] + u * e1[1] + v * e2[1];
    const z = c[2] + u * e1[2] + v * e2[2];
    const n = Math.hypot(x, y, z);
    pos[i * 3] = x / n; pos[i * 3 + 1] = y / n; pos[i * 3 + 2] = z / n;
    mag[i] = TILE_MAG0 + dv.getUint8(o + 4) * TILE_MAG_STEP;
    const bv = dv.getUint8(o + 5);
    if (colour) colour(bv === 255 ? NaN : bv / 50 - 0.5, col, i);
    else { col[i * 3] = 1; col[i * 3 + 1] = 1; col[i * 3 + 2] = 1; }
  }
  return { nside, pix, count, pos, col, mag };
}

function countBrighter(mags, mag) {
  let lo = 0;
  let hi = mags.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (mags[mid] <= mag) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function createStarTiles(env) {
  const tiles = new Map(); // 'n8/123' -> { points, mag, seen } | { asked: true }
  const cap = env.cap || 48;
  const PARALLEL = 4;
  let flying = 0;
  let tick = 0;
  let drawn = 0;
  let bytes = 0;
  let failed = 0;
  let disposed = false;
  const material = env.material();

  function ask(level, pix) {
    const key = tilePath(level, pix);
    if (tiles.has(key) || flying >= PARALLEL || disposed) return;
    tiles.set(key, { asked: true, seen: tick });
    flying += 1;
    env.fetchBytes(`../../data/startiles/${key}`).then((buf) => {
      flying -= 1;
      if (disposed) return;
      const t = parseTile(buf, env.colour);
      bytes += buf.byteLength;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(t.pos, 3));
      geo.setAttribute('aColour', new THREE.BufferAttribute(t.col, 3));
      geo.setAttribute('aMag', new THREE.BufferAttribute(t.mag, 1));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), env.radius * 2);
      const points = new THREE.Points(geo, material);
      points.name = `ground-stars-${key}`;
      points.frustumCulled = false;
      points.renderOrder = env.renderOrder;
      points.visible = false;
      env.root.add(points);
      tiles.set(key, { points, mag: t.mag, pos: t.pos, seen: tick });
    }).catch(() => {
      flying -= 1;
      failed += 1;
      // Not asked again at once: a missing tile is a hole in that patch, not a loop of requests.
      tiles.set(key, { asked: true, failed: true, seen: tick });
    });
  }

  function evict() {
    const loaded = [...tiles.entries()].filter(([, t]) => t.points);
    if (loaded.length <= cap) return;
    loaded.sort((a, b) => a[1].seen - b[1].seen);
    for (const [key, t] of loaded.slice(0, loaded.length - cap)) {
      t.points.geometry.dispose();
      env.root.remove(t.points);
      tiles.delete(key);
    }
  }

  return {
    /** Each frame: where the view looks (J2000), how wide a cone it sees, how faint it goes. */
    update(dirEq, radiusDeg, limit) {
      tick += 1;
      drawn = 0;
      const wanted = new Set();
      for (const level of levelsWanted(limit)) {
        for (const pix of tilesInCone(level.nside, dirEq, radiusDeg)) {
          const key = tilePath(level, pix);
          wanted.add(key);
          const t = tiles.get(key);
          if (!t) ask(level, pix);
          else t.seen = tick;
        }
      }
      for (const [key, t] of tiles) {
        if (!t.points) continue;
        const on = wanted.has(key);
        t.points.visible = on;
        if (!on) continue;
        const n = countBrighter(t.mag, limit + 0.6);
        t.points.geometry.setDrawRange(0, n);
        t.drawnNow = n;
        drawn += n;
      }
      if (tick % 120 === 0) evict();
      return drawn;
    },
    /** Every star drawn now, for "what is that": fn(pos, mag, count). */
    each(fn) {
      for (const t of tiles.values()) if (t.points && t.points.visible) fn(t.pos, t.mag, t.drawnNow || 0);
    },
    drawn: () => drawn,
    state: () => ({ tiles: [...tiles.values()].filter((t) => t.points).length, asked: tiles.size, drawn, bytes, failed, flying }),
    dispose() {
      disposed = true;
      for (const t of tiles.values()) if (t.points) { t.points.geometry.dispose(); env.root.remove(t.points); }
      tiles.clear();
      material.dispose();
    },
  };
}
