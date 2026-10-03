// tests/test_tiles.mjs -- a close world drawn from map tiles (spec 0065 tasks 1-2): the addressing,
// which tiles a view asks for and at what level, what is drawn while they arrive, the cache, and the
// rules that keep a first visit, a phone and a failing host out of it.
//
// Pure: scene/tilemath.js has no THREE in it, and scene/tiles.js takes its loader, its worlds and
// its camera as arguments, so fake tiles on a fake clock drive it here. What a real browser draws
// with the same code is the screenshots in the PR (tools/cdp.mjs), not asserted here.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const M = await import(join(JS, 'scene/tilemath.js'));
const T = await import(join(JS, 'scene/tiles.js'));
const { TILESETS } = await import(join(JS, 'data/tilesets.js'));
const { TEXTURES } = await import(join(JS, 'data/textures.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const { WORLDS, worldMaterial, WORLD_FRAG, WORLD_VERT } = await import(join(JS, 'scene/worlds.js'));
const { variantFor } = await import(join(JS, 'scene/texturetiers.js'));
const { TIER_PLANET_SLOTS } = await import(join(JS, 'scene/quality.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// --- 1. the addressing ----------------------------------------------------------------------------
// Trek's pyramid, measured 2026-10-03: level 0 is 0/0/0 and 0/0/1; 0/0/2 and 0/1/0 are 404.
check(JSON.stringify(M.matrixAt(0)) === '{"cols":2,"rows":1}', 'level 0 is two tiles by one');
check(M.matrixAt(8).cols === 512 && M.matrixAt(8).rows === 256, 'level 8 is 512 by 256');
check(M.tileSpanDeg(0) === 180 && M.tileSpanDeg(3) === 22.5, 'a tile is 180 / 2^z degrees');
{
  const same = (got, x, y, why) => check(got.x === x && got.y === y, `${why}: got column ${got.x}, row ${got.y}; want ${x}, ${y}`);
  same(M.lonLatToTile(-180, 90, 0), 0, 0, 'the north-west corner is tile 0/0/0');
  same(M.lonLatToTile(0.001, 0, 0), 1, 0, 'just east of the prime meridian is the east tile');
  same(M.lonLatToTile(-0.001, 0, 0), 0, 0, 'just west of it is the west tile');
  same(M.lonLatToTile(180, -90, 3), 0, 7, '180 E is 180 W, and the south pole clamps to the last row');
  same(M.lonLatToTile(179.999, -89.999, 3), 15, 7, 'the south-east corner');
  // Apollo 11, 23.473 E 0.674 N: at level 8 a tile is 0.703125 degrees.
  same(M.lonLatToTile(23.473, 0.674, 8), 289, 127, 'Tranquility Base at level 8');
  // Olympus Mons, 226.2 E = -133.8, 18.65 N, level 7 (1.40625 degrees).
  same(M.lonLatToTile(226.2, 18.65, 7), 32, 50, 'Olympus Mons at level 7, from an east longitude past 180');
  const b = M.tileBounds(8, 289, 127);
  check(b.west <= 23.473 && b.east > 23.473 && b.south <= 0.674 && b.north > 0.674, 'the bounds of that tile hold the point');
  check(near(b.east - b.west, 0.703125) && near(b.north - b.south, 0.703125), 'and are one span on a side');
  const top = M.tileBounds(0, 1, 0);
  check(top.west === 0 && top.east === 180 && top.north === 90 && top.south === -90, 'tile 0/0/1 is the eastern hemisphere');
}
check(M.tileKey(7, 32, 50) === '7/50/32', 'the key is level/row/column, the order the URL carries');
check(M.tileUrl('https://h/x/{z}/{y}/{x}.jpg', 7, 32, 50) === 'https://h/x/7/50/32.jpg', '{z}/{y}/{x} is TileMatrix/TileRow/TileCol');
check(M.ancestorKey(7, 32, 50) === '6/25/16' && M.ancestorKey(7, 32, 50, 4) === '3/3/2' && M.ancestorKey(2, 1, 1, 3) === null, 'ancestors halve the column and the row');
check(M.isDescendant(M.parseKey('7/50/32'), M.parseKey('3/3/2')) && !M.isDescendant(M.parseKey('7/50/32'), M.parseKey('3/3/3'))
  && !M.isDescendant(M.parseKey('3/3/2'), M.parseKey('3/3/2')), 'a tile is inside its ancestor and no other, and not inside itself');
check(M.wrapLon(190) === -170 && M.wrapLon(-190) === 170 && M.wrapLon(180) === -180 && M.wrapLon(360) === 0, 'longitudes wrap to [-180, 180)');

// --- 2. the level for a pixel's footprint -----------------------------------------------------------
// The Moon, R = 1737.4 km: a level-8 texel is pi R / (256 x 256) = 83.3 m, the mosaic's own 100 m class.
check(near(M.texelRad(8) * 1737.4, 0.08329, 1e-4), `a level-8 texel on the Moon is ${(M.texelRad(8) * 1737.4 * 1000).toFixed(1)} m, want 83.3`);
check(near(M.texelRad(8) * 3389.5, 0.1625, 1e-3), 'a level-8 texel on Mars is 162 m');
{
  // 300 km over the Moon at 900 pixels tall, 45 degrees of view: a pixel is 276 m of ground.
  const pixelRad = (2 * Math.tan((45 * Math.PI) / 360)) / 900;
  const foot = (300 / 1737.4) * pixelRad;
  check(near(foot * 1737.4, 0.2761, 1e-3), `a pixel from 300 km is ${(foot * 1737.4 * 1000).toFixed(0)} m, want 276`);
  check(M.levelForFootprint(foot) === 7, 'which level 7 (167 m) resolves and level 6 (333 m) does not');
  check(M.levelForFootprint(foot, { max: 6 }) === 6 && M.levelForFootprint(foot, { min: 8 }) === 8, 'clamped to what the set has');
  check(M.levelForFootprint(M.texelRad(5)) === 5, 'a footprint of exactly one level-5 texel is level 5');
  check(M.levelForFootprint(M.texelRad(5) * 1.001) === 5 && M.levelForFootprint(M.texelRad(5) * 0.999) === 6, 'and a hair finer is level 6');
  check(M.levelForFootprint(0, { max: 8 }) === 8, 'no footprint at all is the finest level');
  // Where the tiles start (start_level 5): a level-4 texel wider than a pixel.
  const set = { tilePx: 256, matrix: [2, 1], maxLevel: 8 };
  const startAlt = M.texelRad(4) / pixelRad; // in radii
  check(near(startAlt * 1737.4, 1448, 2), `at 900 px the Moon's tiles start ${(startAlt * 1737.4).toFixed(0)} km up, want about 1448`);
  check(M.nadirLevel({ dist: 1 + startAlt * 0.99, pixelRad }, set) === 5 && M.nadirLevel({ dist: 1 + startAlt * 1.01, pixelRad }, set) === 4, 'nadirLevel crosses 5 there');
}

// --- 3. which tiles a view asks for -----------------------------------------------------------------
check(near(M.horizonArc(2), Math.PI / 3) && M.horizonArc(1) === 0, 'from two radii the horizon is 60 degrees round');
check(near(M.rangeTo(1.5, 0), 0.5) && near(M.rangeTo(2, Math.PI / 3), Math.sqrt(3)), 'the range to the sub-point is the altitude; to the horizon, the tangent');
{
  const b = M.tileBounds(3, 8, 3); // 0..22.5 E, 0..22.5 N
  check(M.arcToTile(10, 10, b) === 0, 'a point inside a tile is no arc from it');
  check(near(M.arcToTile(-10, 10, b), 10 * Math.PI / 180 * Math.cos(10 * Math.PI / 180), 2e-3), 'ten degrees west along a parallel');
  check(near(M.arcToTile(10, -30, b), 30 * Math.PI / 180), 'thirty degrees south along a meridian');
  check(near(M.arcToTile(-170, 10, M.tileBounds(3, 15, 3)), M.arcToTile(170, 10, M.tileBounds(3, 0, 3)), 1e-12), 'the arc crosses 180 the short way');
}
const MOON = TILESETS.find((s) => s.world === 'moon');
const MARS = TILESETS.find((s) => s.world === 'mars');
check(!!MOON && !!MARS, 'the Moon and Mars each have a tile set');
const pixelRad = (2 * Math.tan((45 * Math.PI) / 360)) / 900;
{
  const view = { lonDeg: 23.473, latDeg: 0.674, dist: 1 + 300 / 1737.4, pixelRad };
  const { tiles, detail } = M.selectTiles(view, MOON);
  const keys = new Set(tiles.map((t) => t.key));
  check(detail === 1, 'no budget, no coarsening');
  check(keys.has('7/63/144'), 'the tile under the camera is level 7 (Tranquility Base: column 144, row 63)');
  check(tiles[0].key === '7/63/144' && tiles[0].range < tiles[tiles.length - 1].range, 'nearest first');
  check(tiles.every((t) => t.z >= MOON.minLevel && t.z <= 7), `every tile is between minLevel and 7: ${[...new Set(tiles.map((t) => t.z))]}`);
  check(tiles.some((t) => t.z === MOON.minLevel) || tiles.some((t) => t.z === 5), 'the limb is drawn coarser than the ground under the camera');
  // No hole and no overlap: every point on the near side of the horizon is in exactly one tile.
  const horizon = M.horizonArc(view.dist);
  let holes = 0, doubles = 0, n = 0;
  for (let lat = -40; lat <= 40; lat += 1.7) {
    for (let lon = -20; lon <= 65; lon += 1.7) {
      const p1 = lat * Math.PI / 180, p0 = view.latDeg * Math.PI / 180;
      const arc = Math.acos(Math.sin(p1) * Math.sin(p0) + Math.cos(p1) * Math.cos(p0) * Math.cos((lon - view.lonDeg) * Math.PI / 180));
      if (arc > horizon * 0.98) continue;
      n += 1;
      const hit = tiles.filter((t) => { const b = M.tileBounds(t.z, t.x, t.y); return lon >= b.west && lon < b.east && lat > b.south && lat <= b.north; }).length;
      if (hit === 0) holes += 1;
      if (hit > 1) doubles += 1;
    }
  }
  check(n > 500 && holes === 0 && doubles === 0, `the visible ground is covered once: ${n} points, ${holes} in no tile, ${doubles} in two`);
  // Nothing behind the Moon.
  check(!tiles.some((t) => { const b = M.tileBounds(t.z, t.x, t.y); return M.arcToTile(view.lonDeg, view.latDeg, b) > horizon + 0.05; }), 'no tile beyond the horizon');
  // A budget coarsens the whole picture; it does not cut the far tiles off a sharp middle.
  const capped = M.selectTiles(view, MOON, { maxTiles: 40 });
  check(capped.tiles.length <= 40 && capped.detail > 1, `40 tiles at most: ${capped.tiles.length} at detail ${capped.detail.toFixed(2)}`);
  check(Math.max(...capped.tiles.map((t) => t.z)) < 7, 'and they are coarser tiles, the same ground');
  // The frustum test is the caller's: with one that accepts a single degree, a handful of tiles.
  const narrow = M.selectTiles({ ...view, inView: (b) => M.arcToTile(view.lonDeg, view.latDeg, b) < 0.02 }, MOON);
  check(narrow.tiles.length > 0 && narrow.tiles.length < 12 && narrow.tiles.every((t) => t.z === 7), `a narrow view asks for few tiles: ${narrow.tiles.length}`);
  // Across 180: columns 0 and the last, side by side.
  const far = M.selectTiles({ lonDeg: 180, latDeg: 0, dist: view.dist, pixelRad }, MOON).tiles;
  check(far.some((t) => t.z === 7 && t.x === 0) && far.some((t) => t.z === 7 && t.x === 255), 'over the far side the selection wraps the 180 meridian');
  // Over a pole the cap is every longitude.
  const pole = M.selectTiles({ lonDeg: 0, latDeg: 90, dist: view.dist, pixelRad }, MOON).tiles;
  check(new Set(pole.filter((t) => t.y === 0 || M.tileBounds(t.z, t.x, t.y).north === 90).map((t) => Math.sign(M.tileBounds(t.z, t.x, t.y).west + 1e-9))).size === 2, 'over the pole both hemispheres are asked for');
  // A set never asks past its last level, however close the camera.
  const mars = M.selectTiles({ lonDeg: -133.8, latDeg: 18.65, dist: 1 + 70 / 3389.5, pixelRad }, MARS).tiles;
  check(Math.max(...mars.map((t) => t.z)) === MARS.maxLevel && mars[0].key === '8/101/65', `seventy km over Olympus Mons is level ${MARS.maxLevel} and no finer: ${mars[0].key}`);
}

{
  // Obliquity: straight down a tile is judged at its own size; towards the limb it may be coarser.
  check(near(M.cosEmission(1.2, 0), 1, 1e-12), 'straight down the ground faces the camera');
  check(near(M.cosEmission(2, Math.PI / 3), M.MIN_COS_E), 'at the horizon it is edge-on, floored');
  check(near(M.cosEmission(2, Math.PI / 6), (2 * Math.cos(Math.PI / 6) - 1) / M.rangeTo(2, Math.PI / 6)), 'in between, (D cos a - 1) / range');
  // The whole disc in view, 1300 km over the Moon: the middle is level 5 and the limb coarser.
  const view = { lonDeg: -46, latDeg: 10, dist: 1 + 1300 / 1737.4, pixelRad };
  const { tiles } = M.selectTiles(view, MOON);
  const at = (lon, lat) => tiles.find((t) => { const b = M.tileBounds(t.z, t.x, t.y); return lon >= b.west && lon < b.east && lat > b.south && lat <= b.north; });
  check(at(-46, 10).z === 5, `under the camera: level ${at(-46, 10).z}, want 5`);
  check(at(-46 + 50, 10).z < 5, `fifty degrees round, near the limb: level ${at(-46 + 50, 10).z}, coarser than 5`);
  check(tiles.length <= 100, `the whole near side to the horizon is ${tiles.length} tiles, want 100 at most`);
}

// --- 4. what is drawn while tiles arrive -------------------------------------------------------------
{
  const wanted = [{ z: 5, x: 10, y: 7, key: '5/7/10' }, { z: 5, x: 11, y: 7, key: '5/7/11' }];
  const set = (arr) => JSON.stringify([...arr].sort());
  const ready = new Set();
  const solid = new Set();
  const draw = (prev = []) => M.drawSet(wanted, (k) => ready.has(k), (k) => solid.has(k), prev, 3);
  check(draw().size === 0, 'nothing has arrived: nothing is drawn, the globe shows');
  ready.add('3/1/2'); // the level-3 ancestor of both
  check(set(draw()) === set(['3/1/2']), 'the coarse cover alone stands in for both');
  ready.add('5/7/10');
  check(set(draw()) === set(['3/1/2', '5/7/10']), 'a tile that has arrived fades in OVER its ancestor');
  solid.add('5/7/10');
  check(set(draw()) === set(['3/1/2', '5/7/10']), 'the ancestor stays while its other child is missing');
  ready.add('5/7/11'); solid.add('5/7/11');
  check(set(draw()) === set(['5/7/10', '5/7/11']), 'both solid: the ancestor is dropped');
  // Zooming out: the level-4 parent is wanted and not here yet; its children that were on screen stay.
  const out = M.drawSet([{ z: 4, x: 5, y: 3, key: '4/3/5' }], (k) => ready.has(k), (k) => solid.has(k), ['5/7/10', '5/7/11'], 3);
  check(set(out) === set(['3/1/2', '5/7/10', '5/7/11']), `zooming out keeps the finer tiles until the coarser one lands: ${set(out)}`);
  ready.add('4/3/5'); solid.add('4/3/5');
  const landed = M.drawSet([{ z: 4, x: 5, y: 3, key: '4/3/5' }], (k) => ready.has(k), (k) => solid.has(k), ['5/7/10', '5/7/11'], 3);
  check(set(landed) === set(['4/3/5']), 'and lets them go when it has');
  // No ancestor coarser than minLevel is ever drawn.
  ready.clear(); ready.add('2/0/1');
  check(draw().size === 0, 'an ancestor below minLevel is not a stand-in');
  const under = M.underlay([{ z: 7, x: 144, y: 63, key: 'a', range: 1 }, { z: 7, x: 145, y: 63, key: 'b', range: 2 }, { z: 3, x: 9, y: 3, key: 'c', range: 3 }, { z: 4, x: 0, y: 0, key: 'd', range: 4 }], 3);
  check(under.length === 1 && under[0].key === '3/3/9', 'the coarse cover of a selection is the level-3 ancestors of its fine tiles, once each; a level-4 tile gets none');
}

// --- 5. the cache ------------------------------------------------------------------------------------
{
  const lru = M.createLru(3);
  for (const k of ['a', 'b', 'c']) lru.touch(k);
  check(lru.trim().length === 0, 'at capacity nothing goes');
  lru.touch('a'); lru.touch('d');
  check(JSON.stringify(lru.trim()) === '["b"]', 'over capacity the least recently used goes: b, not a (touched since)');
  lru.touch('e'); lru.touch('f');
  check(JSON.stringify(lru.trim((k) => k === 'c')) === '["a","d"]' && lru.has('c'), 'a pinned tile is never evicted; the next oldest goes instead');
  lru.setCapacity(1);
  check(JSON.stringify(lru.trim((k) => k === 'c' || k === 'e' || k === 'f')) === '[]' && lru.size === 3, 'when everything is pinned the cache runs over rather than punch a hole');
}

// --- 6. the patch ------------------------------------------------------------------------------------
{
  // The same axes as the sphere the world is: a SphereGeometry vertex at (u, v) is where
  // unitFromLonLat puts longitude (u - 0.5) 360 and latitude (v - 0.5) 180.
  const g = new THREE.SphereGeometry(1, 16, 8);
  const pos = g.attributes.position, uv = g.attributes.uv;
  let worst = 0;
  for (let i = 0; i < pos.count; i++) {
    const p = M.unitFromLonLat((uv.getX(i) - 0.5) * 360, (uv.getY(i) - 0.5) * 180);
    worst = Math.max(worst, Math.hypot(p[0] - pos.getX(i), p[1] - pos.getY(i), p[2] - pos.getZ(i)));
  }
  check(worst < 1e-6, `a tile's patch lies where the globe's own map puts that longitude and latitude (worst ${worst.toExponential(1)})`);
  const back = M.lonLatFromUnit(...M.unitFromLonLat(-133.8, 18.65).map((v) => v * 1.4));
  check(near(back.lonDeg, -133.8, 1e-9) && near(back.latDeg, 18.65, 1e-9) && near(back.dist, 1.4, 1e-12), 'and back');
  const b = M.tileBounds(7, 144, 63);
  const a = M.patchArrays(b, 4);
  check(a.positions.length === 75 && a.uvs.length === 50 && a.indices.length === 96, 'a 4-segment patch is 25 vertices and 32 triangles');
  check(near(a.globe[0], (b.west + 180) / 360, 1e-6) && near(a.globe[1], (b.south + 90) / 180, 1e-6) && near(a.globe[48], (b.east + 180) / 360, 1e-6) && near(a.globe[49], (b.north + 90) / 180, 1e-6),
    'and each vertex knows its place on the whole map: u from 180 W, v from the south pole');
  const east = M.patchArrays(M.tileBounds(3, 15, 3), 4);
  check(near(east.globe[8], 1, 1e-6), 'the tile that ends at 180 E ends at u = 1, not 0: no wrap inside a patch');
  // uv (0, 0) is the south-west corner; (1, 1) the north-east.
  const sw = M.unitFromLonLat(b.west, b.south), ne = M.unitFromLonLat(b.east, b.north);
  check(near(a.positions[0], sw[0], 1e-6) && near(a.positions[1], sw[1], 1e-6) && a.uvs[0] === 0 && a.uvs[1] === 0, 'v = 0 is the south edge');
  check(near(a.positions[72], ne[0], 1e-6) && near(a.positions[73], ne[1], 1e-6) && a.uvs[48] === 1 && a.uvs[49] === 1, 'v = 1 is the north edge');
  // Every triangle faces outward: its normal points the way its own position does.
  let inward = 0;
  for (let i = 0; i < a.indices.length; i += 3) {
    const v = [0, 1, 2].map((k) => new THREE.Vector3().fromArray(a.positions, a.indices[i + k] * 3));
    const nrm = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
    if (nrm.dot(v[0]) <= 0) inward += 1;
  }
  check(inward === 0, `${inward} of a patch's triangles face into the globe`);
  check(M.patchSegments(3) === 24 && M.patchSegments(8) === 4 && M.patchSegments(5) === 8, 'about one segment per 0.75 degrees, 4 to 24');
}

// --- 7. the shader is the world's own, with two lines changed ---------------------------------------
{
  const f = T.tileFragment();
  check(f.includes('gl_FragColor = vec4( colour, uFade );') && f.includes('uniform float uFade;'), 'the fragment shader fades');
  check(f.includes('texture2D( uBaseMap, vUvGlobe ).rgb * clamp( dot( tile, vec3( 0.2126, 0.7152, 0.0722 ) ) * uTint.r,') && f.includes(': tile * uTint;'),
    'a detail tile multiplies the brightness of the world\'s own map; a colour tile is its own picture times the grade');
  // Everything else is WORLD_FRAG, line for line: only the map read, the output and four declarations differ.
  const mine = new Set(f.split('\n'));
  const lost = WORLD_FRAG.split('\n').filter((l) => !mine.has(l));
  check(lost.length === 2 && lost.some((l) => l.includes('vec3 base = mix(')) && lost.some((l) => l.includes('gl_FragColor = vec4( colour, 1.0 )')), `the tile shader drops ${lost.length} of the world's lines, want the map read and the output only`);
  const v = T.tileVertex();
  check(/vFragDepth = 1\.0 \+ gl_Position\.w \* 0\.9990;/.test(v), 'the vertex shader pulls the depth a thousandth nearer');
  check(v.includes('attribute vec2 uvGlobe;') && v.includes('vUvGlobe = uvGlobe;'), 'and carries the point\'s place on the world\'s own map');
  const kept = new Set(v.split('\n'));
  check(WORLD_VERT.split('\n').every((l) => kept.has(l) || l.includes('vUv = uv;')), 'and is otherwise WORLD_VERT');
  let moved = 0;
  for (const bad of ['void main() { gl_FragColor = vec4( colour, 1.0 ); }']) { try { T.tileFragment(bad); } catch { moved += 1; } }
  try { T.tileVertex('#include <logdepthbuf_vertex>'); } catch { moved += 1; }
  check(moved === 2, 'a shader whose map read or uv line has moved is refused too');
}
{
  let threw = false;
  try { T.tileFragment('void main() { gl_FragColor = vec4(1.0); }'); } catch { threw = true; }
  check(threw, 'a WORLD_FRAG whose last line has moved is refused, not silently drawn without a fade');
}

// --- 8. the module on a fake clock ------------------------------------------------------------------
function rig({ tier = 1, saveData = false, altKm = 300, fail = false, hasMap = true, world = 'moon', radiusKm = 1737.4 } = {}) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), worldMaterial(null, 0xffffff));
  mesh.scale.setScalar(radiusKm / 1000);
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e7);
  const place = (km) => { camera.position.set((radiusKm + km) / 1000, 0, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true); };
  place(altKm);
  const asked = [];
  const pending = [];
  let changes = 0;
  const tiles = T.createPlanetTiles({
    worlds: { meshFor: (id) => (id === world ? mesh : null), hasMap: () => hasMap },
    camera,
    viewport: () => 900,
    tier,
    saveData,
    onChange: () => { changes += 1; },
    loadTile: (url, signal) => new Promise((resolve, reject) => {
      asked.push(url);
      const job = { url, done: false };
      pending.push(job);
      job.finish = () => {
        if (job.done) return;
        job.done = true;
        if (fail) reject(new Error('HTTP 503')); else resolve({ image: { width: 256, height: 256, close() {} }, bytes: 25000 });
      };
      if (signal) signal.addEventListener('abort', () => { if (!job.done) { job.done = true; const e = new Error('aborted'); e.name = 'AbortError'; reject(e); } });
    }),
  });
  let now = 1000;
  // Advance the clock in 50 ms frames; `answer` settles whatever is in flight each frame.
  const run = async (ms, answer = true) => {
    for (let t = 0; t < ms; t += 50) {
      now += 50;
      tiles.frame(now);
      if (answer) for (const j of pending.splice(0)) j.finish();
      await new Promise((r) => setImmediate(r));
    }
  };
  return { tiles, mesh, camera, place, asked, pending, run, changes: () => changes, now: () => now };
}
{
  // A laptop 300 km over the Moon.
  const r = rig();
  r.tiles.frame(1000);
  check(r.tiles.state().inFlight === T.MAX_FETCHES && r.asked.length === T.MAX_FETCHES, `at most ${T.MAX_FETCHES} fetches at once: ${r.asked.length}`);
  check(/\/3\/\d+\/\d+\.jpg$/.test(r.asked[0]), `the coarse cover is asked for first: ${r.asked[0]}`);
  check(r.asked.every((u) => u.startsWith('https://trek.nasa.gov/tiles/Moon/')), 'from the Moon set\'s host and no other');
  check(r.tiles.credits().length === 0, 'no credit before a tile is on screen');
  await r.run(3000);
  const s = r.tiles.state();
  const moon = s.sets[MOON.id];
  check(moon.on && moon.showing && moon.master === 1, 'the layer is on and fully faded in');
  check(moon.level === 7 && moon.loading === 0 && moon.drawn === moon.wanted, `every wanted tile is drawn and nothing else: level ${moon.level}, ${moon.drawn} of ${moon.wanted}`);
  check(moon.wanted <= T.DRAW_TILES[1], `within the T1 draw budget: ${moon.wanted}`);
  check(s.bytes === s.loaded * 25000 && s.failed === 0, 'bytes are counted as they arrive');
  check(JSON.stringify(r.tiles.credits()) === JSON.stringify([MOON.credit]) && r.changes() === 1, 'the credit is the registry\'s line, announced once');
  const group = r.mesh.children.find((c) => c.name === MOON.id + '-tiles');
  const patches = group ? group.children.filter((c) => c.visible) : [];
  check(patches.length === moon.drawn, `${patches.length} patches are visible children of the world's own mesh`);
  const p = patches[0];
  check(p.material.transparent && p.material.depthWrite === false && p.material.depthTest === true, 'a patch tests depth and never writes it');
  check(p.renderOrder > 0 && p.renderOrder < 1, `a patch draws after the globe and before the air shell and the marks: ${p.renderOrder}`);
  check(p.material.uniforms.uSunDir === r.mesh.material.uniforms.uSunDir && p.material.uniforms.uEarthshine === r.mesh.material.uniforms.uEarthshine
    && p.material.uniforms.uEclipse === r.mesh.material.uniforms.uEclipse, 'a patch shares the globe\'s light: the same uniform objects');
  check(p.material.uniforms.uMap !== r.mesh.material.uniforms.uMap && p.material.uniforms.uFade.value === 1, 'and has its own map and fade');
  check(p.material.uniforms.uDetail.value === 0, 'the Moon\'s tiles are their own picture, not detail');
  const tint = p.material.uniforms.uTint.value;
  check(near(tint.r, MOON.grade[0]) && near(tint.g, MOON.grade[1]) && near(tint.b, MOON.grade[2]), 'graded to the map under it (registry grade)');
  // Seen again: nothing more is fetched.
  const before = r.asked.length;
  await r.run(1000);
  check(r.asked.length === before, 'a still camera fetches nothing more');
  // Away: the layer fades out and every tile is freed.
  r.place(20000);
  await r.run(2000);
  const gone = r.tiles.state().sets[MOON.id];
  check(!gone.on && !gone.showing && gone.cached === 0 && gone.master === 0, 'far away the tiles fade out and are freed');
  check(!r.mesh.children.some((c) => c.name === MOON.id + '-tiles'), 'and their group leaves the mesh');
  check(r.tiles.credits().length === 0 && r.changes() === 2, 'the credit goes with them');
}
{
  // Mars: detail over the globe's own map, whichever map that is at the time.
  const r = rig({ world: 'mars', radiusKm: 3389.5, altKm: 400 });
  await r.run(3000);
  const s = r.tiles.state().sets[MARS.id];
  check(s.showing && s.drawn === s.wanted && r.asked.every((u) => u.includes('/Mars/EQ/') && u.endsWith('.png')), 'Mars is drawn from its own set, PNG tiles');
  const p = r.mesh.children.find((c) => c.name === MARS.id + '-tiles').children.find((c) => c.visible);
  check(MARS.mode === 'detail' && p.material.uniforms.uDetail.value === 1, 'Mars\'s tiles are detail');
  check(p.material.uniforms.uBaseMap === r.mesh.material.uniforms.uMap, 'over the globe\'s own map: the same uniform object, so a 4k swap reaches the tile');
  check(near(p.material.uniforms.uTint.value.r, MARS.grade[0]), 'scaled by one over the mosaic\'s mean');
  check(!!p.geometry.attributes.uvGlobe, 'with the map\'s uv on every vertex');
  check(JSON.stringify(r.tiles.credits()) === JSON.stringify([MARS.credit]), 'and credited as detail');
}
{
  // Hysteresis: on at the start altitude, still on a little above it, off past STOP_HYSTERESIS.
  const startKm = (M.texelRad(MOON.startLevel - 1) / pixelRad) * 1737.4;
  const r = rig({ altKm: startKm * 1.05 });
  await r.run(500);
  check(!r.tiles.state().sets[MOON.id].on && r.asked.length === 0, 'just above the start altitude: nothing');
  r.place(startKm * 0.95); await r.run(500);
  check(r.tiles.state().sets[MOON.id].on, 'just below it: on');
  r.place(startKm * 1.1); await r.run(500);
  check(r.tiles.state().sets[MOON.id].on, 'a little back out: still on (no flapping at the threshold)');
  r.place(startKm * 1.3); await r.run(200);
  check(!r.tiles.state().sets[MOON.id].on, 'well back out: off');
}
{
  // The rules that keep it out.
  for (const [why, opts] of [['a phone (tier 0)', { tier: 0 }], ['data-saver', { saveData: true }], ['a world whose own map has not arrived', { hasMap: false }]]) {
    const r = rig(opts);
    await r.run(1000);
    check(r.asked.length === 0, `${why}: ${r.asked.length} tiles asked for, want 0`);
  }
  // The latch: everything freed, nothing asked again.
  const r = rig();
  await r.run(2000);
  r.tiles.latch();
  const n = r.asked.length;
  await r.run(1000);
  const s = r.tiles.state();
  check(s.latched && s.sets[MOON.id].cached === 0 && r.asked.length === n && r.tiles.credits().length === 0, 'the latch frees every tile and none is fetched again');
  check(r.tiles.setTier(2) === 1, 'and a latched device is not promoted');
}
{
  // A host that fails: six tries, then it is left alone, and the globe is what is on screen.
  const r = rig({ fail: true });
  await r.run(3000);
  const s = r.tiles.state();
  check(r.asked.length === T.FAILS_TO_PAUSE && s.failed === T.FAILS_TO_PAUSE && s.paused, `a failing host is asked ${r.asked.length} times and then left alone (want ${T.FAILS_TO_PAUSE})`);
  check(!s.sets[MOON.id].showing && r.tiles.credits().length === 0 && r.changes() === 0, 'nothing is shown and nothing is credited');
  await r.run(10000);
  check(r.asked.length === T.FAILS_TO_PAUSE, 'ten seconds later it has still not been asked again');
}
{
  // A pan: fetches the view has left are aborted, and the cache keeps to its ceiling.
  const r = rig();
  r.tiles.frame(1000);
  r.camera.position.set(0, 0, -(1737.4 + 300) / 1000); r.camera.lookAt(0, 0, 0); r.camera.updateMatrixWorld(true); // 90 E
  await r.run(300, false);
  check(r.tiles.state().aborted > 0, 'tiles of the view that was left are aborted, not waited for');
  // Round the equator in 8-degree steps: far more tiles than the cache holds.
  for (let lon = 0; lon < 360; lon += 8) {
    const p = M.unitFromLonLat(lon, 0).map((v) => v * (1737.4 + 300) / 1000);
    r.camera.position.set(p[0], p[1], p[2]); r.camera.lookAt(0, 0, 0); r.camera.updateMatrixWorld(true);
    await r.run(400);
  }
  const s = r.tiles.state();
  check(s.loaded > T.CACHE_TILES[1] && s.evicted > 0, `a trip round the Moon loads ${s.loaded} tiles and evicts ${s.evicted}`);
  check(s.sets[MOON.id].cached <= T.CACHE_TILES[1], `and never keeps more than ${T.CACHE_TILES[1]}: ${s.sets[MOON.id].cached}`);
  const group = r.mesh.children.find((c) => c.name === MOON.id + '-tiles');
  check(group.children.length === s.sets[MOON.id].cached, 'an evicted tile\'s patch has left the scene with it');
}

// --- 9. the budgets ----------------------------------------------------------------------------------
{
  check(T.CACHE_TILES[0] === 0 && T.DRAW_TILES[0] === 0, 'tier 0 has no tiles');
  check(T.DRAW_TILES[1] < T.CACHE_TILES[1] && T.DRAW_TILES[2] < T.CACHE_TILES[2], 'the cache holds more than one screen of tiles');
  // T1's maps at their worst (tests/test_tiers.mjs section 4) plus a full tile cache, against the budget.
  const mib = (f) => (f.px[0] * f.px[1] * (f.format === 'mono' ? 1 : 4) * 4) / 3 / 1048576;
  let gpu = (2048 * 1024 * 4 * 4) / 3 / 1048576;
  for (const row of TEXTURES.filter((x) => x.world === 'earth' || x.world === 'sky' || x.id === 'saturn-ring')) { const f = variantFor(row, 1); if (f) gpu += mib(f); }
  gpu += TIER_PLANET_SLOTS[1] * Math.max(...TEXTURES.filter((x) => x.when === 'near').map((x) => mib(variantFor(x, 1))));
  const cache = T.CACHE_TILES[1] * T.TILE_GPU_MIB;
  check(near(T.TILE_GPU_MIB, 1 / 3, 1e-3), 'a 256-pixel RGBA tile with mipmaps is a third of a MiB');
  check(gpu + cache <= BUDGETS.tier1_texture_gpu_mib, `T1 maps (${gpu.toFixed(1)} MiB) and a full tile cache (${cache.toFixed(1)} MiB) are over tier1_texture_gpu_mib ${BUDGETS.tier1_texture_gpu_mib}`);
  check(BUDGETS.planet_tile_requests_first_visit === 0, 'registry/budgets.yaml: a first visit asks for no tiles');
}

// --- 10. off the first visit --------------------------------------------------------------------------
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/import\('\.\/scene\/tiles\.js'\)/.test(main), 'main.js imports scene/tiles.js dynamically');
  for (const f of ['scene/tiles.js', 'scene/tilemath.js', 'data/tilesets.js']) {
    const name = f.split('/').pop();
    check(!new RegExp(`^\\s*import[^;]*from\\s*'[^']*${name.replace('.', '\\.')}'`, 'm').test(main), `main.js must not import ${f} statically: it is not part of a first visit`);
    check(!readFileSync(join(ROOT, 'site/index.html'), 'utf8').includes(f), `site/index.html must not preload ${f}`);
  }
  // Every set is a world we draw, served over https, and the levels are in order.
  for (const s of TILESETS) {
    check(WORLDS.some((w) => w.id === s.world), `${s.id}: world ${s.world} is not drawn`);
    check(/^https:\/\//.test(s.url) && ['{z}', '{y}', '{x}'].every((k) => s.url.includes(k)), `${s.id}: the url is not an https template`);
    check(s.minLevel <= s.startLevel && s.startLevel <= s.maxLevel, `${s.id}: minLevel <= startLevel <= maxLevel`);
    check(Array.isArray(s.grade) && s.grade.length === 3 && s.grade.every((g) => g > 0), `${s.id}: grade is three positive gains`);
  }
}

if (problems.length) { console.error('tiles FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`tiles ok: ${TILESETS.length} tile sets (${TILESETS.map((s) => s.world + ' to level ' + s.maxLevel).join(', ')}); addressing, level by footprint, ` +
  'cover without holes, draw-while-loading, LRU, six fetches at once, nothing on T0 / data-saver / after the latch, a failing host left alone');
