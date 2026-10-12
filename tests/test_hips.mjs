// tests/test_hips.mjs -- sky/hips.js: the HEALPix tile addressing a HiPS sky is read with
// (internal #286). Pure maths, so it is held here without a browser or a network.
//
//   node tests/test_hips.mjs
//
// What can go wrong silently: a tile drawn in the wrong diamond, or the right diamond turned, is
// still a picture of sky. So the numbering is held to the standard's own fixed points (the twelve
// base tiles' centres), to its inverse over the whole sphere, and to the one orientation that
// scripts/build_otherlight.py measured against the real survey.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const H = await import(join(ROOT, 'site/js/sky/hips.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DEG = Math.PI / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const radec = (ra, dec) => [Math.cos(dec * DEG) * Math.cos(ra * DEG), Math.cos(dec * DEG) * Math.sin(ra * DEG), Math.sin(dec * DEG)];

// 1. The twelve base tiles: four round the north (centres at 45, 135, 225, 315 degrees and
//    latitude asin(2/3)), four on the equator (0, 90, 180, 270), four round the south.
for (let f = 0; f < 12; f += 1) {
  const c = H.tileCentre(0, f);
  const lon = ((Math.atan2(c[1], c[0]) / DEG) + 360) % 360;
  const lat = Math.asin(c[2]) / DEG;
  const wantLat = f < 4 ? Math.asin(2 / 3) / DEG : f < 8 ? 0 : -Math.asin(2 / 3) / DEG;
  const wantLon = f < 4 ? 45 + 90 * f : f < 8 ? 90 * (f - 4) : 45 + 90 * (f - 8);
  check(Math.abs(lat - wantLat) < 1e-9 && Math.abs(lon - wantLon) < 1e-9, `base tile ${f} is centred at ${lon.toFixed(3)}, ${lat.toFixed(3)}; the standard puts it at ${wantLon}, ${wantLat.toFixed(3)}`);
  check(H.nestOf(0, c) === f, `the centre of base tile ${f} is in base tile ${H.nestOf(0, c)}`);
}

// 2. Numbering and its inverse agree on every tile of orders 1 to 4, and a tile's grid is inside it.
for (let order = 1; order <= 4; order += 1) {
  let bad = 0;
  for (let n = 0; n < 12 * 4 ** order; n += 1) if (H.nestOf(order, H.tileCentre(order, n)) !== n) bad += 1;
  check(bad === 0, `order ${order}: ${bad} tiles whose centre is not in themselves`);
}
check(H.tileXy(3, 0 * 64 + 0b100111).ix === 0b011 && H.tileXy(3, 0b100111).iy === 0b101, 'NESTED: x is the even bits of the number, y the odd ones');
// A parent holds its four children: tile n of order k is tiles 4n..4n+3 of order k+1.
for (const n of [0, 17, 300, 767]) for (let c = 0; c < 4; c += 1) check(H.nestOf(3, H.tileCentre(4, n * 4 + c)) === n, `order-4 tile ${n * 4 + c} is inside order-3 tile ${n}`);

// 3. Random directions round-trip, and every direction is within tileRadius of its tile's centre.
{
  let worst = 0;
  let s = 12345;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  for (let i = 0; i < 4000; i += 1) {
    const d = radec(rnd() * 360, Math.asin(rnd() * 2 - 1) / DEG);
    const { face, x, y } = H.dirToFaceXy(d);
    const back = H.faceXyToDir(face, x, y);
    worst = Math.max(worst, Math.acos(Math.min(1, dot(d, back))));
    for (const order of [0, 3, 6]) {
      const ang = Math.acos(Math.min(1, dot(d, H.tileCentre(order, H.nestOf(order, d)))));
      check(ang <= H.tileRadius(order), `a point ${(ang / DEG).toFixed(2)} degrees from its order-${order} tile's centre: tileRadius says at most ${(H.tileRadius(order) / DEG).toFixed(2)}`);
    }
  }
  check(worst < 1e-6, `a direction through dirToFaceXy and back moves by ${worst} rad`);
}

// 4. The cone: the tile under the axis first, everything near it, nothing from the far side.
{
  const d = radec(83.8, -5.4); // Orion
  const got = H.tilesInCone(3, d, 10 * DEG);
  check(got[0] === H.nestOf(3, d), 'the tile the camera looks at is first');
  check(got.length >= 4 && got.length <= 24, `a 10 degree cone at order 3 asks for ${got.length} tiles`);
  for (const n of got) check(Math.acos(dot(d, H.tileCentre(3, n))) <= 10 * DEG + H.tileRadius(3) + 1e-9, `tile ${n} is outside the cone`);
  // No tile whose centre is inside the cone is missed.
  let missed = 0;
  for (let n = 0; n < 768; n += 1) if (Math.acos(dot(d, H.tileCentre(3, n))) < 10 * DEG && !got.includes(n)) missed += 1;
  check(missed === 0, `${missed} tiles inside the cone were not asked for`);
  check(H.tilesInCone(6, d, 2 * DEG, 12).length <= 12, 'the cap holds');
  check(H.tilesInCone(0, d, Math.PI).length === 12, 'the whole sky is twelve base tiles');
}

// 5. The order for a field of view: deeper as the field closes, inside the survey's range.
{
  const o = (fov) => H.orderFor(fov, 900, 512, 3, 8);
  check(o(45) === 3 && o(1) === 7 && o(0.3) === 8, `45 degrees is order ${o(45)} (3), 1 degree order ${o(1)} (7), 0.3 degrees order ${o(0.3)} (8)`);
  let last = 0;
  for (const fov of [90, 45, 20, 10, 5, 2, 1, 0.3]) { check(o(fov) >= last, `order falls from ${last} to ${o(fov)} as the field closes to ${fov}`); last = o(fov); }
  check(H.orderFor(0.1, 900, 512, 3, 3) === 3, 'never past the survey\'s deepest order');
}

// 6. The file a tile is, word for word as the standard writes it.
check(H.tileUrl('https://a/b/', 3, 27, 'jpg') === 'https://a/b/Norder3/Dir0/Npix27.jpg', H.tileUrl('https://a/b/', 3, 27, 'jpg'));
check(H.tileUrl('https://a/b', 8, 123456, 'png') === 'https://a/b/Norder8/Dir120000/Npix123456.png', H.tileUrl('https://a/b', 8, 123456, 'png'));

// 7. A tile's grid: its corners are the tile's, and the picture lies in it the measured way round
//    (columns along HEALPix y, rows from the top along x: uv = (y, 1 - x)).
{
  const g = H.tileGrid(3, 300, 4);
  check(g.positions.length === 75 && g.uvs.length === 50 && g.index.length === 96, 'a 4 x 4 grid is 25 points and 32 triangles');
  const { face, ix, iy } = H.tileXy(3, 300);
  const p = (i, j) => [g.positions[(j * 5 + i) * 3], g.positions[(j * 5 + i) * 3 + 1], g.positions[(j * 5 + i) * 3 + 2]];
  const uv = (i, j) => [g.uvs[(j * 5 + i) * 2], g.uvs[(j * 5 + i) * 2 + 1]];
  check(dot(p(0, 0), H.faceXyToDir(face, ix / 8, iy / 8)) > 1 - 1e-7, 'grid point (0,0) is the tile\'s (x, y) = (0, 0) corner');
  check(dot(p(4, 0), H.faceXyToDir(face, (ix + 1) / 8, iy / 8)) > 1 - 1e-7, 'i runs along x');
  check(uv(0, 0)[0] === 0 && uv(0, 0)[1] === 1 && uv(4, 0)[0] === 0 && uv(4, 0)[1] === 0 && uv(0, 4)[0] === 1, 'uv = (y, 1 - x)');
  for (let k = 0; k < 25; k += 1) check(H.nestOf(3, [g.positions[k * 3] * 0.999 + H.tileCentre(3, 300)[0] * 0.001, g.positions[k * 3 + 1] * 0.999 + H.tileCentre(3, 300)[1] * 0.001, g.positions[k * 3 + 2] * 0.999 + H.tileCentre(3, 300)[2] * 0.001]) === 300, 'every grid point, nudged inward, is in the tile');
  const inset = H.tileGrid(3, 300, 1, null, 0.01).uvs;
  check(Math.abs(inset[0] - 0.01) < 1e-6 && Math.abs(inset[1] - 0.99) < 1e-6, 'the inset pulls the picture\'s edge in');
}

// 8. Galactic surveys: the Galactic centre and pole land where the IAU puts them in J2000.
{
  const m = H.frameToEq('galactic');
  const gc = H.rotate(m, [1, 0, 0]);
  const pole = H.rotate(m, [0, 0, 1]);
  check(Math.acos(dot(gc, radec(266.405, -28.936))) < 0.01 * DEG, 'Galactic (0, 0) is 17h45.6m -28.94');
  check(Math.acos(dot(pole, radec(192.859, 27.128))) < 0.01 * DEG, 'the Galactic north pole is 12h51.4m +27.13');
  const back = H.rotate(H.eqToFrame('galactic'), gc);
  check(Math.abs(back[0] - 1) < 1e-9, 'eqToFrame undoes frameToEq');
  check(H.frameToEq('equatorial')[0] === 1 && H.frameToEq('equatorial')[4] === 1, 'an equatorial survey is not turned');
}

// 9. The cache: least recently used out first, and the evicted one is handed back to be disposed.
{
  const out = [];
  const c = H.createLru(2, (k, v) => out.push([k, v]));
  c.set('a', 1); c.set('b', 2); c.get('a'); c.set('c', 3);
  check(out.length === 1 && out[0][0] === 'b' && c.has('a') && c.has('c') && c.size() === 2, 'b was the least recently used');
}

if (problems.length) { console.error('hips FAILED:\n  - ' + problems.slice(0, 20).join('\n  - ')); process.exit(1); }
console.log('hips ok: twelve base tiles where the standard puts them, NESTED numbering and its inverse on 4 092 tiles and 4 000 directions, the cone, the order by field of view, the tile path, the measured orientation, Galactic to J2000, the cache');
