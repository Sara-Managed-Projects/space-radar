// tests/test_worlds_layer.mjs -- spec 0028 step 0: the worlds are objects.
//
// A planet is a record (search finds it, the layer list counts it, a tap picks it) and the picker
// is fair to the small thing: a moon's disc drawn over a planet's disc is what a finger means.
// Sections 7 to 10 hold Pluto and Jupiter's four big moons to numbers from outside this repository.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { worldRecords, pickWorldDisc, WORLDS, WORLD_ALIASES } = await import(join(JS, 'scene/worlds.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { LAYERS, loadLayer } = await import(join(JS, 'data/layers.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));

// 1. one record per world, and the contract's propagator answers for every one of them
const recs = worldRecords();
check(recs.length === WORLDS.length, `one record per world (${recs.length} vs ${WORLDS.length})`);
const tMs = Date.parse('2026-09-08T12:00:00Z');
for (const r of recs) {
  check(r.klass === 'world' && r.layer === 'worlds' && r.propagator === 'body', `${r.id} is a world record on the worlds layer`);
  const p = propagate(r, tMs);
  check(p && Number.isFinite(p.x) && p.cls === 'measured', `${r.id} propagates to a measured position`);
}
check(recs.find((r) => r.id === 'mars').meta.aliases.includes('the Red Planet'), 'Mars carries its alias');
for (const id of Object.keys(WORLD_ALIASES)) check(WORLDS.some((w) => w.id === id), `alias table names a real world: ${id}`);

// 2. the layer row loads its records through the contract's loader, like any other layer
const row = LAYERS.find((l) => l.id === 'worlds');
check(!!row && row.draw === 'worlds' && row.noModel === true, 'the worlds layer row exists, draws no glyphs and no hero model');
check(LAYERS[0] && LAYERS[0].id === 'worlds', 'the worlds layer is first, so its records are the last to be picked over a glyph');
const loaded = await loadLayer(row, tMs);
check(loaded.length === WORLDS.length && loaded.every((r) => r.layer === 'worlds'), `loadLayer gives ${loaded.length} world records`);

// 3. search: by name and by alias, with the world first
const index = buildIndex([...loaded, { id: 'sat-1', name: 'MARS ODYSSEY', klass: 'satellite', layer: 'active', meta: {} }], LAYERS);
const mars = findMatches(index, 'mars');
check(mars.hits[0] && mars.hits[0].record.id === 'mars', `"mars" finds Mars first (got ${mars.hits[0] && mars.hits[0].record.id})`);
const red = findMatches(index, 'red planet');
check(red.hits[0] && red.hits[0].record.id === 'mars', '"red planet" finds Mars by alias');
const luna = findMatches(index, 'luna');
check(luna.hits[0] && luna.hits[0].record.id === 'moon', '"luna" finds the Moon');
const sun = findMatches(index, 'the sun');
check(sun.hits[0] && sun.hits[0].record.id === 'sun', '"the sun" finds the Sun');

// 4. picking: the smaller disc wins when the finger could mean either; nothing far away picks
const big = { id: 'earth', cx: 400, cy: 300, r: 200 };
const small = { id: 'moon', cx: 450, cy: 300, r: 6 };
check(pickWorldDisc([big, small], 452, 301)?.id === 'moon', 'a tap on the Moon drawn over Earth picks the Moon');
check(pickWorldDisc([big, small], 300, 300)?.id === 'earth', 'a tap on Earth away from the Moon picks Earth');
check(pickWorldDisc([big, small], 400, 40) === null, 'a tap 60 px outside every edge picks nothing');
check(pickWorldDisc([big, small], 400, 90)?.id === 'earth', 'a tap 10 px outside Earth\'s edge is forgiven');
check(pickWorldDisc([], 1, 1) === null, 'no discs, no pick');

// 5. the real picker with a real camera: Earth at the origin of an Earth stage, camera 22 units out
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const { createWorlds } = await import(join(JS, 'scene/worlds.js'));
  stage.setWorld('earth');
  stage.setTime(tMs);
  const scene = new THREE.Scene();
  const worlds = createWorlds(scene, { textureBase: null });
  worlds.update(tMs);
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 1e-5, 1e9);
  camera.position.set(0, 0, 22);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  const vp = { w: 800, h: 600 };
  check(worlds.pick(0, 0, camera, vp)?.id === 'earth', 'a tap dead centre on Earth picks Earth');
  check(worlds.pick(0.95, 0.95, camera, vp) === null, 'a tap in the corner, off every disc, picks nothing');
  const all = worlds.pickAll(0, 0, camera, vp);
  check(all.length >= 1 && all[0].record.id === 'earth' && all[0].edge === 0 && all[0].r > 100, `pickAll at the centre lists Earth first with the finger on it (${JSON.stringify(all.map((c) => [c.record.id, Math.round(c.edge), Math.round(c.r)]))})`);
  check(worlds.drawnPositionOf('earth') && worlds.drawnPositionOf('earth').length() === 0, 'the stage world is drawn at the origin');
  check(Math.abs(worlds.drawnRadiusUnits('earth') - 6378.137 / 1000) < 0.01 || Math.abs(worlds.drawnRadiusUnits('earth') - 6.371) < 0.01, `Earth's drawn radius is its radius in units (${worlds.drawnRadiusUnits('earth')})`);
  worlds.setVisible(false);
  worlds.update(tMs);
  check(worlds.meshFor('mars').visible === false && worlds.meshFor('earth').visible === true && worlds.meshFor('sun').visible === true, 'switching the layer off hides Mars but never the stage world or the Sun');
  worlds.setVisible(true);
  worlds.update(tMs);
  check(worlds.meshFor('mars').visible === true, 'switching it back on shows Mars again');
  worlds.dispose();
}

// 6. A PLANET'S MAP IS FETCHED WHEN IT CAN BE SEEN, NOT AT BOOT.
//
// Every world used to fetch its 2048 x 1024 map at construction: 6.4 MB on the wire and about
// 139 MB of GPU memory against a 150 MB phone budget for everything, while from the default Earth
// view nine of those fourteen maps paint discs a few pixels wide. This watches the loader.
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const { createWorlds, TEXTURE_AT_HALF_VIEW } = await import(join(JS, 'scene/worlds.js'));
  stage.setWorld('earth');
  stage.setTime(tMs);
  const fetched = [];
  const pending = new Map();
  const loadTexture = (url, onLoad) => {
    fetched.push(url);
    const tex = new THREE.Texture();
    pending.set(url, () => onLoad && onLoad(tex));
    return tex;
  };
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 1e-5, 1e9);
  camera.position.set(0, 0, 22); // the default view: a few Earth radii out
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const worlds = createWorlds(new THREE.Scene(), { textureBase: 't/', loadTexture, camera });

  const EAGER = ['t/2k_earth_daymap.jpg', 't/2k_earth_nightmap.webp', 't/2k_earth_clouds.webp', 't/2k_saturn_ring_alpha.png'];
  const lazyWorlds = WORLDS.filter((w) => !w.look.earth && w.look.map);
  check(fetched.length === EAGER.length && EAGER.every((u) => fetched.includes(u)),
    `construction fetches Earth's three maps and the ring strip, nothing else (${JSON.stringify(fetched)})`);
  check(lazyWorlds.length === 9 && worlds.waitingMaps().length === lazyWorlds.length, `nine worlds -- the Sun, the Moon and seven planets -- wait for their maps (${worlds.waitingMaps().length})`);

  worlds.update(tMs);
  check(fetched.length === EAGER.length,
    `from the default view no planet, the Moon or the Sun is big enough to fetch (${JSON.stringify(fetched.slice(EAGER.length))})`);

  // Until the map arrives the world is its measured mean colour -- not white, which is what an
  // unloaded cel material used to fall back to, and not black.
  for (const w of lazyWorlds) {
    const m = worlds.meshFor(w.id).material;
    const colour = m.uniforms ? m.uniforms.uTint.value : m.color;
    const hasMap = m.uniforms ? m.uniforms.uHasMap.value === 1 : !!m.map;
    const hex = colour.getHex();
    check(!hasMap && Number.isFinite(w.look.tint) && hex !== 0xffffff && hex !== 0x000000,
      `${w.id} waits in its mean colour, not a map and not white (#${hex.toString(16)})`);
  }

  // Fly the camera to Mars's drawn disc: past the threshold, fetched exactly once.
  const marsAt = worlds.drawnPositionOf('mars');
  const marsR = worlds.drawnRadiusUnits('mars');
  camera.position.copy(marsAt).add(new THREE.Vector3(0, 0, marsR * 4));
  camera.updateMatrixWorld();
  worlds.update(tMs);
  worlds.update(tMs);
  const marsFetches = fetched.filter((u) => u.endsWith('2k_mars.jpg')).length;
  check(marsFetches === 1, `Mars's map is fetched once when its disc fills the view, over two frames (${marsFetches})`);
  check(!worlds.waitingMaps().includes('mars'), 'and Mars stops waiting');
  const mars = worlds.meshFor('mars').material.uniforms;
  check(mars.uHasMap.value === 0, 'the map is not used before it has arrived');
  pending.get('t/2k_mars.jpg')();
  check(mars.uHasMap.value === 1 && mars.uTint.value.getHex() === 0xffffff && mars.uMap.value,
    'when it arrives the map replaces the mean colour, untinted');

  // Selecting a world starts its map at once, whatever size it is drawn.
  check(worlds.preload('saturn') === true && fetched.includes('t/2k_saturn.jpg'), 'preload(saturn) fetches Saturn now');
  check(worlds.preload('saturn') === false, 'and a second preload does not fetch it again');
  pending.get('t/2k_sun.jpg');
  check(worlds.preload('sun') === true, 'the Sun can be preloaded too');
  pending.get('t/2k_sun.jpg')();
  const sunMat = worlds.meshFor('sun').material;
  check(sunMat.map && sunMat.color.getHex() === 0xffffff, 'the Sun, a basic material, takes its map the same way');
  check(worlds.preload('earth') === false, 'Earth never waits: its maps were fetched at construction');

  // The threshold means what it says: a disc just under it does not fetch, just over it does.
  const w2 = createWorlds(new THREE.Scene(), { textureBase: 't/', loadTexture: () => new THREE.Texture(), camera });
  const jup = worlds.drawnPositionOf('jupiter');
  const jr = worlds.drawnRadiusUnits('jupiter');
  const tanHalf = Math.tan((45 * Math.PI) / 360);
  for (const [factor, want] of [[0.95, true], [1.05, false]]) {
    const dist = jr / (TEXTURE_AT_HALF_VIEW * tanHalf) * factor;
    camera.position.copy(jup).add(new THREE.Vector3(0, 0, dist));
    camera.updateMatrixWorld();
    w2.update(tMs);
    const fetchedNow = !w2.waitingMaps().includes('jupiter');
    if (fetchedNow !== want) problems.push(`Jupiter at ${factor}x the threshold distance: fetched=${fetchedNow}, expected ${want}`);
    if (want) break;
  }
  worlds.dispose();
  w2.dispose();
}

// "Source not recorded" on every world card: the positions come from Astronomy Engine (propagate/
// body.js), and the card's source line reads meta.cite first.
{
  const { worldRecords: wr } = await import(join(JS, 'scene/worlds.js'));
  const uncited = wr().filter((r) => !/Astronomy Engine/.test((r.meta && r.meta.cite) || '')).map((r) => r.id);
  check(uncited.length === 0, `every world names where its position comes from; these do not: ${uncited}`);
}

// 7. PLUTO AND JUPITER'S FOUR BIG MOONS (2026-09-22). Each claim below is checked against a number
// from somewhere else: the moons' distances from Jupiter against the semi-major axes on NASA's
// Jovian satellite fact sheet (the page registry/worlds.yaml cites for their radii), Pluto's
// distance against where it is in 2026 (35.4 to 35.7 au by this ephemeris; Wikipedia gives a
// semi-major axis of 39.5 au and a 1989 perihelion of 29.7, so it is still near the inner part).
const NEW_WORLDS = ['pluto', 'io', 'europa', 'ganymede', 'callisto'];
{
  const { positionOf } = await import(join(JS, 'scene/worlds.js'));
  const { worldPositionKm } = await import(join(JS, 'propagate/body.js'));
  const { temeToJ2000, jupiterMoonOffsetKm } = await import(join(JS, 'propagate/frames.js'));
  const AU = 149597870.7;
  // NASA fact sheet semi-major axes, km. Eccentricities are 0.0041, 0.0094, 0.0013 and 0.0074, so
  // 1.5 % holds every one of them at every point on its orbit, and a moon swapped for its
  // neighbour (the nearest pair, Europa and Ganymede, differ by 60 %) fails at once.
  const AXIS_KM = { io: 421800, europa: 671100, ganymede: 1070400, callisto: 1882700 };
  for (const iso of ['2026-01-01T00:00:00Z', '2026-05-17T06:00:00Z', '2026-09-22T12:00:00Z', '2026-12-31T18:00:00Z']) {
    const t = Date.parse(iso);
    const j = positionOf('jupiter', t);
    for (const [id, a] of Object.entries(AXIS_KM)) {
      const m = positionOf(id, t);
      const d = m && j ? Math.hypot(m.x - j.x, m.y - j.y, m.z - j.z) : NaN;
      check(Math.abs(d - a) / a < 0.015, `${id} is ${Math.round(d)} km from Jupiter at ${iso}; NASA's semi-major axis is ${a}`);
      // The card measures through the record's propagator, the drawing through positionOf: one answer.
      const rec = recs.find((r) => r.id === id);
      const p = propagate(rec, t);
      check(p && Math.hypot(p.x - m.x, p.y - m.y, p.z - m.z) < 1e-3, `${id}: the record's propagator and the drawing agree at ${iso}`);
      // And from Earth: GeoVector back-dates Jupiter by the light time (50 minutes on 2026-09-22),
      // so the moon must be back-dated with it. A distance cannot see the mistake -- a moon on a
      // near-circle is the same distance from Jupiter 50 minutes earlier -- so the OFFSET is
      // compared, as a vector, with the one from when the light left: measured at these four
      // instants, 17 000 to 52 000 km apart if the back-dating is skipped, 0.0 km when it is not.
      const ge = worldPositionKm(id, t, 'earth-inertial');
      const gj = worldPositionKm('jupiter', t, 'earth-inertial');
      const seen = temeToJ2000({ x: ge.x - gj.x, y: ge.y - gj.y, z: ge.z - gj.z }, t);
      const lightMs = (Math.hypot(gj.x, gj.y, gj.z) / 299792.458) * 1000;
      const then = jupiterMoonOffsetKm(id, t - lightMs);
      const nowOff = jupiterMoonOffsetKm(id, t);
      const miss = Math.hypot(seen.x - then.x, seen.y - then.y, seen.z - then.z);
      const skipped = Math.hypot(nowOff.x - then.x, nowOff.y - then.y, nowOff.z - then.z);
      check(miss < 500 && skipped > 10000,
        `${id} seen from Earth is ${Math.round(miss)} km from where it was when the light left (skipping the light time would be ${Math.round(skipped)} km)`);
    }
    const pl = positionOf('pluto', t);
    const au = pl ? Math.hypot(pl.x, pl.y, pl.z) / AU : NaN;
    check(au > 35.0 && au < 36.0, `Pluto is ${au.toFixed(2)} au from the Sun at ${iso}; in 2026 it is between 35 and 36`);
  }
  check(positionOf('ganymede', NaN) === null, 'no time, no Ganymede: a refusal, not a guess');
}

// 8. They are found by name and by the names people type.
{
  const idx = buildIndex([...loaded, { id: 'sat-9', name: 'IO-117', klass: 'satellite', layer: 'active', meta: {} },
    { id: 'sat-10', name: 'EUROPA CLIPPER', klass: 'probe', layer: 'deep-space', meta: {} }], LAYERS);
  for (const [q, want] of [['pluto', 'pluto'], ['io', 'io'], ['europa', 'europa'], ['ganymede', 'ganymede'], ['callisto', 'callisto'],
    ['jupiter ii', 'europa'], ['jupiter iii', 'ganymede'], ['134340', 'pluto'], ['jupiter', 'jupiter']]) {
    const hit = findMatches(idx, q).hits[0];
    check(hit && hit.record.id === want, `"${q}" finds ${want} first (got ${hit && hit.record.id})`);
  }
}

// 9. How they are drawn.
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const { createWorlds, MOON_VIEW, PLANET_VIEW } = await import(join(JS, 'scene/worlds.js'));
  const t = Date.parse('2026-09-22T12:00:00Z');
  const moons = ['io', 'europa', 'ganymede', 'callisto'];
  const rowOf = (id) => WORLDS.find((w) => w.id === id);

  // A moon is placed from its planet's drawn disc, so the planet has to come first in the table.
  for (const w of WORLDS) {
    if (!w.parent) continue;
    check(WORLDS.findIndex((x) => x.id === w.parent) < WORLDS.findIndex((x) => x.id === w.id), `${w.parent} comes before ${w.id} in WORLDS`);
  }
  // No map ships for them, none is fetched, and their one colour runs light to dark in the order of
  // their measured albedo (NASA fact sheets, registry/worlds.yaml `facts.albedo`).
  const lum = (hex) => {
    const c = new THREE.Color(hex);
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; // linear, which is what the shader works in
  };
  const byAlbedo = NEW_WORLDS.map(rowOf).sort((a, b) => b.look.albedo - a.look.albedo);
  for (let i = 1; i < byAlbedo.length; i++) {
    check(lum(byAlbedo[i - 1].look.tint) > lum(byAlbedo[i].look.tint),
      `${byAlbedo[i - 1].id} (albedo ${byAlbedo[i - 1].look.albedo}) is drawn lighter than ${byAlbedo[i].id} (${byAlbedo[i].look.albedo})`);
  }
  for (const id of NEW_WORLDS) {
    const w = rowOf(id);
    check(w.look.flat === true && !w.look.map, `${id} is flat and names no map`);
  }

  // From EARTH: Jupiter is squeezed, and its moons are drawn around the drawn Jupiter at Jupiter's
  // own enlargement -- same shape measured in Jupiter radii, the real one's centre recoverable.
  stage.setWorld('earth');
  stage.setTime(t);
  const fetched = [];
  const earth = createWorlds(new THREE.Scene(), { textureBase: 't/', loadTexture: (u) => { fetched.push(u); return new THREE.Texture(); } });
  earth.update(t);
  const J = earth.meshFor('jupiter');
  const jv = earth.viewScale('jupiter');
  check(jv.exaggerated && jv.angularFactor > 10, `Jupiter is squeezed from Earth (${jv.angularFactor.toFixed(1)}x wider)`);
  const { positionOf } = await import(join(JS, 'scene/worlds.js'));
  const jt = positionOf('jupiter', t);
  for (const id of moons) {
    const m = earth.meshFor(id);
    const mt = positionOf(id, t);
    const trueRadii = Math.hypot(mt.x - jt.x, mt.y - jt.y, mt.z - jt.z) / rowOf('jupiter').radiusKm;
    const drawnRadii = m.position.distanceTo(J.position) / J.scale.x;
    check(m.visible && Math.abs(drawnRadii - trueRadii) / trueRadii < 1e-6,
      `${id} is drawn ${drawnRadii.toFixed(3)} Jupiter radii from the drawn Jupiter; it is ${trueRadii.toFixed(3)} from the real one`);
    const vs = earth.viewScale(id);
    const floor = (m.position.length() * stage.unitKm) * MOON_VIEW.MIN_ANGULAR_RADIUS_RAD;
    check(Math.abs(vs.drawnRadiusKm - Math.max(floor, rowOf(id).radiusKm * jv.drawnRadiusKm / jv.trueRadiusKm)) < 1e-6 * vs.drawnRadiusKm,
      `${id}'s drawn radius is Jupiter's enlargement or the one-pixel floor, whichever is bigger (${vs.drawnRadiusKm.toFixed(0)} km)`);
    check(m.scale.x < J.scale.x, `${id} is drawn smaller than Jupiter`);
    check(vs.exaggerated && vs.cls === 'illustrative' && /Jupiter is drawn \d+ times wider/.test(vs.note) && vs.note.includes(rowOf(id).display),
      `${id}'s card says how it is drawn: "${vs.note}"`);
  }
  check(MOON_VIEW.MIN_ANGULAR_RADIUS_RAD < PLANET_VIEW.MIN_ANGULAR_RADIUS_RAD / 3, 'a moon\'s floor is under a third of a planet\'s');
  const pv = earth.viewScale('pluto');
  check(pv.exaggerated && /true direction/.test(pv.note), `Pluto is squeezed like the planets: "${pv.note}"`);
  check(NEW_WORLDS.every((id) => !earth.waitingMaps().includes(id) && earth.preload(id) === false)
    && !fetched.some((u) => NEW_WORLDS.some((id) => u.includes(id))), `nothing is ever fetched for them (${fetched.filter((u) => NEW_WORLDS.some((id) => u.includes(id)))})`);

  // A tap on a moon's drawn disc means the moon, even with Jupiter's larger disc a few pixels away.
  const eu = earth.meshFor('europa').position.clone();
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 1e-5, 1e9);
  camera.position.copy(eu).add(eu.clone().normalize().multiplyScalar(-40 * J.scale.x));
  camera.lookAt(eu);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  check(earth.pick(0, 0, camera, { w: 800, h: 600 })?.id === 'europa', 'a tap on Europa near Jupiter picks Europa');
  earth.dispose();

  // From JUPITER, and from EUROPA: one system, everything at its true place and size.
  for (const centre of ['jupiter', 'europa']) {
    stage.setWorld(centre);
    stage.setTime(t);
    const w = createWorlds(new THREE.Scene(), { textureBase: null });
    w.update(t);
    for (const id of ['jupiter', ...moons]) {
      const vs = w.viewScale(id);
      check(vs && !vs.exaggerated && Math.abs(w.drawnRadiusUnits(id) * stage.unitKm - rowOf(id).radiusKm) < 1e-6 * rowOf(id).radiusKm,
        `from ${centre}, ${id} is drawn where it is at the size it is`);
    }
    check(w.viewScale('earth').exaggerated, `from ${centre}, Earth is squeezed`);
    check(w.drawnPositionOf(centre).length() === 0, `${centre} is the origin of its own stage`);
    w.dispose();
  }
  stage.setWorld('earth');
}

// 10. The card: what it is, how big, how far, how it is drawn and where each of those came from.
{
  const { firstSentence, drawingLine, rightNowFor, seeItLine } = await import(join(JS, 'ui/cards.js'));
  const { positionOf } = await import(join(JS, 'scene/worlds.js'));
  const now = Date.parse('2026-09-22T12:00:00Z');
  const ctx = { clock: { now: () => now }, worlds: { positionOf }, selected: () => null };
  const WHAT = { pluto: 'dwarf planet', io: 'volcanic', europa: 'ocean under its ice', ganymede: 'biggest in the solar system', callisto: 'cratered' };
  for (const id of NEW_WORLDS) {
    const r = recs.find((x) => x.id === id);
    const rows = rightNowFor(r, ctx);
    const fromEarth = rows.find(([k]) => k === 'Distance from Earth');
    check(fromEarth && /astronomical units/.test(fromEarth[1]), `${id}'s card gives its distance from Earth now (${fromEarth && fromEarth[1]})`);
    const e = positionOf('earth', now);
    const p = positionOf(id, now);
    const s = String(firstSentence(r, ctx, { ok: true, tMs: now, distEarthKm: Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z), altKm: null }, { state: 'na' }));
    const across = Math.round(r.meta.radiusKm * 2);
    check(s.length <= 160 && s.includes(WHAT[id]) && s.replace(/\s/g, '').includes(`about${across}kmacross`),
      `${id}'s first sentence says what it is and how big, in 160 characters: "${s}"`);
    check(!s.includes(' -- '), `${id}'s sentence writes no double-hyphen dash`);
    check(/no surface map/.test(drawingLine(r) || ''), `${id}'s card says it is a plain ball: ${drawingLine(r)}`);
    check(/Astronomy Engine/.test(r.meta.cite) && /read 2026-09-22/.test(r.meta.cite), `${id}'s source line names the ephemeris and the day its facts were read`);
    // "You can see this one with your own eyes" -- every other world's line -- is false of Pluto,
    // at magnitude 15, and of moons lost in Jupiter's glare.
    const see = seeItLine(r, ctx, { ok: true, tMs: now }, { state: 'na' });
    check(!/your own eyes/.test(see) && (id === 'pluto' ? /telescope/.test(see) : /binoculars/.test(see)), `${id} says how it can really be seen: "${see}"`);
  }
  check(drawingLine(recs.find((x) => x.id === 'mars')) === null, 'Mars, which has a map, still has no drawing line');
}

if (problems.length) {
  console.error('worlds layer FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`worlds layer ok: ${recs.length} worlds are records, searchable by name and alias, and the smaller disc wins a tap, and a planet's map waits until its disc can show it; Pluto and Jupiter's four big moons sit where NASA's numbers put them, the moons drawn around the drawn Jupiter, and each card says what it is, how big, how far and that it is a plain ball`);
