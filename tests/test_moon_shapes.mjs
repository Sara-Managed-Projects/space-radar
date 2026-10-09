// PHOBOS AND DEIMOS IN THEIR MEASURED SHAPES, AND EVERY MOON'S MAP (2026-10-05, issues #389, #408).
//
// Both moons of Mars were balls of their mean radius. Their shapes are published (NASA Planetary
// Data System: Gaskell's Phobos, Thomas's Deimos), and scripts/build-moon-shapes.py turns each into
// a radius every 5 degrees (site/js/data/moonshapes.js). scene/moonshape.js bends the world's
// sphere to it, keeping the texture coordinates, and scene/worlds.js fetches both files by dynamic
// import the first time the moon is big enough to show a shape. This holds:
//   1. the numbers: Phobos is 27 x 22 x 18 km (NASA, quoted on its card) and its long axis points
//      at Mars; Deimos is smaller in every direction;
//   2. the bending: every vertex moves along its own radius, the map's coordinates do not move, and
//      the seam and the poles have one normal each;
//   3. the loading: nothing at boot, a promise on preload, and a ball until it resolves;
//   4. the maps (registry/textures.yaml): every world's own map is one file of at most 250 kB that
//      scene/worlds.js names, says how much of the sphere it covers when that is not all of it, and
//      a world with a side nobody has photographed says so on its card.
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { applyMoonShape, radiusAt, decodeGrid } = await import(join(JS, 'scene/moonshape.js'));
const { MOON_SHAPES, MOON_SHAPE_STEP_DEG } = await import(join(JS, 'data/moonshapes.js'));
const { WORLDS, createWorlds, worldRecords } = await import(join(JS, 'scene/worlds.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { drawingLine } = await import(join(JS, 'ui/cards.js'));
const { TEXTURES } = await import(join(JS, 'data/textures.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const rowOf = (id) => WORLDS.find((w) => w.id === id);

// 1. The numbers.
{
  check(MOON_SHAPE_STEP_DEG === 5 && Object.keys(MOON_SHAPES).join() === 'phobos,deimos', `two shapes on a 5 degree grid (${Object.keys(MOON_SHAPES)})`);
  for (const [id, s] of Object.entries(MOON_SHAPES)) {
    const grid = decodeGrid(s.grid);
    check(grid.length === 37 * 72, `${id}: 37 rows of 72 radii (${grid.length})`);
    check(s.radiusKm === rowOf(id).radiusKm, `${id}: the grid is in shares of the world's own radius (${s.radiusKm} against ${rowOf(id).radiusKm})`);
    const ext = (lat, lon) => (radiusAt(grid, 5, lat, lon) + radiusAt(grid, 5, -lat, lon + 180)) * s.radiusKm;
    const toPlanet = ext(0, 0);
    const along = ext(0, 90);
    const pole = ext(90, 0);
    if (id === 'phobos') {
      // "27 by 22 by 18 km" (NASA Science, registry/worlds.yaml facts.shape) is the longest reach in
      // each direction; through the centre along the three axes Gaskell's model measures 25.5, 23.1
      // and 18.2. Two kilometres of slack, on a 5 degree grid of bytes.
      check(Math.abs(toPlanet - 27) < 2 && Math.abs(along - 22) < 2 && Math.abs(pole - 18) < 2,
        `Phobos measures ${toPlanet.toFixed(1)} x ${along.toFixed(1)} x ${pole.toFixed(1)} km through its centre; NASA says 27 x 22 x 18`);
    } else {
      // "15 by 12 by 11 km" (NASA Science): the long axis toward Mars, as for every locked moon.
      check(toPlanet > along && along > pole - 1.5 && toPlanet > 13 && toPlanet < 17 && pole > 8 && pole < 12.5,
        `Deimos measures ${toPlanet.toFixed(1)} x ${along.toFixed(1)} x ${pole.toFixed(1)} km through its centre; NASA says 15 x 12 x 11`);
    }
    check(Math.abs(rowOf(id).look.reach - s.maxKm / s.radiusKm) < 0.01, `${id}: scene/worlds.js frames its arrival on its longest radius (reach ${rowOf(id).look.reach}; the model's is ${(s.maxKm / s.radiusKm).toFixed(3)})`);
    check(s.minKm < s.radiusKm && s.maxKm > s.radiusKm && s.minKm > 0.5 * s.radiusKm && s.maxKm < 1.5 * s.radiusKm, `${id}: every radius fits a byte's range (${s.minKm} to ${s.maxKm} km)`);
  }
  check(Math.abs(radiusAt(decodeGrid(MOON_SHAPES.phobos.grid), 5, 12, 359.9) - radiusAt(decodeGrid(MOON_SHAPES.phobos.grid), 5, 12, 0.1)) < 0.01, 'longitude wraps without a step');
}

// 2. The bending.
{
  const geo = new THREE.SphereGeometry(1, 64, 48);
  const before = geo.attributes.position.array.slice();
  const uv = geo.attributes.uv.array.slice();
  applyMoonShape(geo, MOON_SHAPES.phobos, MOON_SHAPE_STEP_DEG);
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  let off = 0, lo = Infinity, hi = 0, bad = 0;
  for (let i = 0; i < pos.count; i++) {
    const b = new THREE.Vector3(before[i * 3], before[i * 3 + 1], before[i * 3 + 2]);
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    off = Math.max(off, 1 - a.clone().normalize().dot(b.normalize()));
    lo = Math.min(lo, a.length());
    hi = Math.max(hi, a.length());
    const n = new THREE.Vector3().fromBufferAttribute(nrm, i);
    if (Math.abs(n.length() - 1) > 1e-3 || n.dot(a.normalize()) < 0.2) bad += 1;
  }
  check(off < 1e-9, `every vertex moved along its own radius (${off})`);
  check(lo > 0.7 && lo < 0.85 && hi > 1.15 && hi < 1.3, `the ball is now ${lo.toFixed(2)} to ${hi.toFixed(2)} mean radii: Phobos is 8 to 14 km from its centre`);
  check(bad === 0, `every normal is a unit vector pointing outward (${bad} are not)`);
  check(geo.attributes.uv.array.every((v, i) => v === uv[i]), 'the texture coordinates did not move: the map lands where it did');
  // The long axis is along mesh X, which a locked moon points at its planet.
  geo.computeBoundingBox();
  const size = geo.boundingBox.getSize(new THREE.Vector3());
  check(size.x > size.z && size.z > size.y, `longest toward Mars, shortest pole to pole (${size.x.toFixed(2)} x ${size.z.toFixed(2)} x ${size.y.toFixed(2)})`);
  // The seam: columns 0 and 64 of a row are one place, and must be one normal.
  let seam = 0;
  for (let iy = 1; iy < 48; iy++) seam = Math.max(seam, new THREE.Vector3().fromBufferAttribute(nrm, iy * 65).distanceTo(new THREE.Vector3().fromBufferAttribute(nrm, iy * 65 + 64)));
  check(seam < 1e-6, `no crease down longitude 180 (${seam})`);
  check(geo.boundingSphere && Math.abs(geo.boundingSphere.radius - hi) < 0.05, 'the bounding sphere was measured again, so the moon is not culled at the edge of the screen');
}

// 3. The loading.
{
  const src = readFileSync(join(JS, 'scene/worlds.js'), 'utf8');
  check(!/^import[^\n]*moonshape/m.test(src) && /import\('\.\/moonshape\.js'\)/.test(src) && /import\('\.\.\/data\/moonshapes\.js'\)/.test(src),
    'scene/worlds.js fetches the shapes by dynamic import only: nothing at boot');
  const fetched = [];
  const w = createWorlds(new THREE.Scene(), { textureBase: 't/', loadTexture: (url, onLoad) => { fetched.push(url); const tex = new THREE.Texture(); if (onLoad) onLoad(tex); return tex; } });
  check(!w.hasShape('phobos') && !w.hasShape('deimos'), 'both are balls until somebody looks');
  check(w.preloadShape('europa') === null, 'a round moon has no shape to fetch');
  const ok = await w.preloadShape('deimos');
  check(ok === true && w.hasShape('deimos') && !w.hasShape('phobos'), 'Deimos takes its shape when asked, and Phobos is not fetched with it');
  check(w.preloadShape('deimos') === null, 'and is asked once');
  w.preload('phobos');
  await new Promise((r) => setTimeout(r, 50));
  check(w.hasShape('phobos') && fetched.some((u) => /phobos/.test(u)), `selecting Phobos fetches its map and its shape (${fetched})`);
  const g = w.meshFor('phobos').geometry;
  g.computeBoundingBox();
  check(g.boundingBox.max.x > 1.1, 'the mesh on screen is the bent one');
}

// 4. The maps.
{
  const MAX = BUDGETS.moon_map_bytes;
  check(MAX === 250000, `a moon's map may be 250 kB (registry/budgets.yaml moon_map_bytes: ${MAX})`);
  const mine = TEXTURES.filter((t) => t.slot === 'map' && rowOf(t.world) && rowOf(t.world).look.flat);
  const mapped = WORLDS.filter((w) => w.look.flat && w.look.map);
  check(mapped.length === 20 && mine.length === 20, `twenty of the twenty-one flat worlds wear a map (${mapped.length} in worlds.js, ${mine.length} in the registry); Deimos has none`);
  for (const w of mapped) {
    const row = mine.find((t) => t.world === w.id);
    const f = row && row.files.find((x) => x.tier === 0);
    check(f && f.file === `textures/${w.look.map}`, `${w.id}: scene/worlds.js names the registry's file (${w.look.map} against ${f && f.file})`);
    if (!f) continue;
    const size = statSync(join(ROOT, 'site', f.file)).size;
    check(size === f.bytes && size <= MAX, `${w.id}: ${f.file} is ${size} bytes, the registry's ${f.bytes}, and at most ${MAX}`);
    check(row.when === 'boot' && row.files.length === 1, `${w.id}: one file for every device, fetched when the moon is first big enough (scene/worlds.js), not a tier`);
    check(typeof row.coverage === 'number' && row.coverage > 0.3 && row.coverage <= 1, `${w.id}: the row says how much of the sphere the map covers (${row.coverage})`);
    check(['tinted', 'toned', 'colour', 'infrared', 'redblue', 'balanced'].includes(w.look.mapKind), `${w.id}: its row says what kind of picture the map is (${w.look.mapKind})`);
    check(w.rotation === 'locked' || w.rotation === 'iau', `${w.id}: a mapped world turns, so the map faces the right way`);
    // A side nobody has photographed is said on the card; a whole map says nothing about coverage.
    const rec = worldRecords().find((r) => r.id === w.id);
    const line = drawingLine(rec) || '';
    const part = COPY.drawing.worldCoverage[w.id];
    if (row.coverage < 0.95) check(part && line.includes(part) && /left plain, not guessed/.test(part), `${w.id}: ${Math.round(row.coverage * 100)} % of it is mapped, and its card says the rest is not a guess: ${line}`);
    else check(!part, `${w.id}: mapped all over, so its card says nothing about a missing side`);
    if (w.look.mapKind !== 'colour') check(line.includes(COPY.drawing.worldMap[w.look.mapKind]), `${w.id}: its card says the map is ${w.look.mapKind}: ${line}`);
    check(line.includes(COPY.drawing.worldLit), `${w.id}: and how it is lit`);
  }
  const deimos = drawingLine(worldRecords().find((r) => r.id === 'deimos')) || '';
  check(/measured shape/.test(deimos) && /no surface map of Deimos/.test(deimos) && !/plain ball/.test(deimos), `Deimos has its shape and no map, and says both: ${deimos}`);
  const phobos = drawingLine(worldRecords().find((r) => r.id === 'phobos')) || '';
  check(phobos.includes(COPY.drawing.worldShaped) && !/no surface map/.test(phobos), `Phobos has both: ${phobos}`);
}

// 5. The card's third number. A moon's card leads with how far, how fast and "a turn"; every moon
//    here keeps one face to its planet and is drawn so, and astronomy-engine has a rotation model
//    only for the Earth's Moon, so the other twenty read "— days a turn" (seen 2026-10-05 on
//    Ganymede). A locked moon's turn is its lap, measured from where it is drawn.
{
  const { moonLapHours } = await import(join(JS, 'propagate/frames.js'));
  const t = Date.parse('2026-10-05T00:00:00Z');
  // The published sidereal periods in days, as NASA's planetary satellite fact sheets give them.
  // Typed from memory, not read off the sheets on the day: the drawn orbits (fitted to JPL Horizons,
  // propagate/moons.js) agree with every one to 0.4 %, which is what this holds.
  const DAYS = { io: 1.769138, europa: 3.551181, ganymede: 7.154553, callisto: 16.689017, phobos: 0.31891, deimos: 1.26244, mimas: 0.9424218,
    enceladus: 1.370218, tethys: 1.887802, dione: 2.736915, rhea: 4.517500, titan: 15.945421, iapetus: 79.330183, miranda: 1.413479,
    ariel: 2.520379, umbriel: 4.144176, titania: 8.705867, oberon: 13.463234, triton: 5.876854, charon: 6.3872 };
  for (const [id, days] of Object.entries(DAYS)) {
    const got = moonLapHours(id, t) / 24;
    check(Math.abs(got - days) / days < 0.004, `${id} goes round in ${got.toFixed(4)} days as drawn; the published period is ${days}`);
    check(rowOf(id).rotation === 'locked', `${id} is drawn keeping one face to its planet`);
  }
  check(moonLapHours('moon', t) === null && moonLapHours('mars', t) === null && moonLapHours('nothing', t) === null, 'only a planet\'s moon has a lap here');
}

// --- Iapetus turns about its orbit's normal, not Saturn's pole (internal #436) ---------------------
{
  const { orbitPole } = await import(join(JS, 'scene/worlds.js'));
  // A circular orbit tilted 15 degrees from the x-y plane, seen at two times a day apart.
  const tilt = (15 * Math.PI) / 180; const R = 3.5e6;
  const at = (th) => ({ x: R * Math.cos(th), y: R * Math.sin(th) * Math.cos(tilt), z: R * Math.sin(th) * Math.sin(tilt) });
  const north = new THREE.Vector3(0, 1, 0); // scene axes: sun-inertial z is scene y
  const pole = orbitPole(at(0.3), at(0.35), north);
  // sun-inertial normal is (0, -sin t, cos t); in scene axes (x, z, -y) that is (0, cos t, sin t).
  check(Math.abs(pole.x) < 1e-9 && Math.abs(pole.y - Math.cos(tilt)) < 1e-9 && Math.abs(pole.z - Math.sin(tilt)) < 1e-9, 'the orbit normal of a tilted circle, in scene axes');
  check(orbitPole(at(0.3), at(0.35), new THREE.Vector3(0, -1, 0)).y < 0, 'turned to the planet\'s north side whichever way the orbit runs');
  check(orbitPole(at(0.3), at(0.3), north) === null, 'two times the same: no normal');
  const w = createWorlds(new THREE.Scene(), { textureBase: 't/', loadTexture: (url, onLoad) => { const tex = new THREE.Texture(); if (onLoad) onLoad(tex); return tex; } });
  w.update(Date.parse('2026-10-08T12:00:00Z'));
  const up = (id) => new THREE.Vector3(0, 1, 0).applyQuaternion(w.meshFor(id).quaternion);
  const deg = (a, b) => (Math.acos(Math.min(1, Math.max(-1, a.dot(b)))) * 180) / Math.PI;
  const ia = deg(up('iapetus'), up('saturn'));
  check(ia > 8 && ia < 25, `Iapetus's axis is tens of degrees off Saturn's, along its orbit (${ia.toFixed(1)} degrees)`);
  check(deg(up('titan'), up('saturn')) < 2 && deg(up('rhea'), up('saturn')) < 2, 'the others keep the planet\'s pole');
}

{
  const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
  check(/record\.klass === 'asteroid'\) \{\s+const sunAt = worlds\.drawnPositionOf\('sun'\);/.test(main), 'a small body is met on its sunlit side');
}

if (problems.length) { console.error('moon shapes FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('moon shapes ok: Phobos is 27 x 22 x 18 km with its long axis at Mars and Deimos is smaller every way; the sphere is bent along its own radii with its map coordinates, seam and poles intact; nothing is fetched at boot; and twenty flat worlds wear one map each of at most 250 kB that says what kind of picture it is and which side nobody has seen');
