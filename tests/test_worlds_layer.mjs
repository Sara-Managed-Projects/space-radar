// tests/test_worlds_layer.mjs -- spec 0028 step 0: the worlds are objects.
//
// A planet is a record (search finds it, the layer list counts it, a tap picks it) and the picker
// is fair to the small thing: a moon's disc drawn over a planet's disc is what a finger means.
// Sections 7 to 10 hold Pluto and Jupiter's four big moons to numbers from outside this repository,
// 11 to 14 do the same for Phobos, Deimos, Enceladus, Titan, Triton and Charon against JPL
// Horizons, and for Neptune's "how to see it" line, and 15 to 18 for Saturn's Mimas, Tethys,
// Dione, Rhea and Iapetus and Uranus's Miranda, Ariel, Umbriel, Titania and Oberon.
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
  // The lower-left corner: the lower-right one held nothing until 2026-09-22, when Uranus, which
  // is drawn there on this date, got five moons and Umbriel's one-pixel disc landed 12 px from it.
  check(worlds.pick(-0.95, -0.95, camera, vp) === null, 'a tap in the corner, off every disc, picks nothing');
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
// ...and the six whose orbits propagate/moons.js fits to JPL Horizons (sections 11 to 14)...
const SIX = ['phobos', 'deimos', 'enceladus', 'titan', 'triton', 'charon'];
// ...and the ten more it fits the same way (sections 15 to 18).
const TEN = ['mimas', 'tethys', 'dione', 'rhea', 'iapetus', 'miranda', 'ariel', 'umbriel', 'titania', 'oberon'];
const rowOf = (id) => WORLDS.find((w) => w.id === id);
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

  // A moon is placed from its planet's drawn disc, so the planet has to come first in the table.
  for (const w of WORLDS) {
    if (!w.parent) continue;
    check(WORLDS.findIndex((x) => x.id === w.parent) < WORLDS.findIndex((x) => x.id === w.id), `${w.parent} comes before ${w.id} in WORLDS`);
  }
  // No map ships for them, none is fetched, and their one colour runs light to dark in the order of
  // their measured albedo (NASA fact sheets, registry/worlds.yaml `facts.albedo`) -- ALL the flat
  // worlds in one order, the sixteen moons added on 2026-09-22 among the first five: twenty-one,
  // from Enceladus (1.0) to Phobos (0.07). Dione and Rhea share the sheet's 0.7, so between those
  // two the rule is "not lighter" rather than "darker"; everywhere the albedo drops, so must the
  // colour. Iapetus's 0.275 is the mean of its sheet's two faces (scene/worlds.js says why).
  const lum = (hex) => {
    const c = new THREE.Color(hex);
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; // linear, which is what the shader works in
  };
  const FLAT = WORLDS.filter((w) => w.look.flat).map((w) => w.id);
  check(FLAT.length === 21 && [...NEW_WORLDS, ...SIX, ...TEN].every((id) => FLAT.includes(id)), `twenty-one flat worlds (${FLAT})`);
  const byAlbedo = FLAT.map(rowOf).sort((a, b) => b.look.albedo - a.look.albedo || FLAT.indexOf(a.id) - FLAT.indexOf(b.id));
  check(byAlbedo[0].id === 'enceladus' && byAlbedo[byAlbedo.length - 1].id === 'phobos', `Enceladus is the lightest flat world and Phobos the darkest (${byAlbedo.map((w) => w.id)})`);
  let ties = 0;
  for (let i = 1; i < byAlbedo.length; i++) {
    const [a, b] = [byAlbedo[i - 1], byAlbedo[i]];
    const tie = a.look.albedo === b.look.albedo;
    if (tie) ties++;
    check(tie ? lum(a.look.tint) >= lum(b.look.tint) : lum(a.look.tint) > lum(b.look.tint),
      `${a.id} (albedo ${a.look.albedo}) is drawn ${tie ? 'no darker' : 'lighter'} than ${b.id} (${b.look.albedo})`);
  }
  check(ties === 1 && rowOf('dione').look.albedo === rowOf('rhea').look.albedo, `the one tie in albedo is Dione and Rhea (${ties})`);
  check(lum(rowOf('titan').look.tint) > lum(rowOf('callisto').look.tint) && lum(rowOf('oberon').look.tint) - lum(rowOf('titan').look.tint) > 0.01,
    'Titan, darkened on 2026-09-22 to make room, still sits above Callisto and a clear step below Oberon');
  for (const id of FLAT) {
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
  check(FLAT.every((id) => !earth.waitingMaps().includes(id) && earth.preload(id) === false)
    && !fetched.some((u) => FLAT.some((id) => u.includes(id))), `nothing is ever fetched for them (${fetched.filter((u) => FLAT.some((id) => u.includes(id)))})`);

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

// 11. SIX MORE MOONS, AGAINST JPL HORIZONS (2026-09-22). propagate/moons.js fits a precessing ellipse
// to Horizons vectors; these are Horizons vectors at four instants that were not in the fit,
// fetched on 2026-09-22 with
//   https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='606'&CENTER='500@699'
//     &EPHEM_TYPE='VECTORS'&REF_PLANE='FRAME'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&VEC_CORR='NONE'
//     &OUT_UNITS='KM-S'&TIME_TYPE='UT'&START_TIME='2026-09-22 12:00'&STOP_TIME='2026-09-22 12:01'&STEP_SIZE='1'
// (Titan shown; COMMAND 401/402 with CENTER 500@499 for Phobos and Deimos, 602 with 500@699 for
// Enceladus, 801 with 500@899 for Triton, 901 with 500@999 for Charon): geometric, relative to the
// planet's body centre, ICRF axes, km. Four instants in 2026-2027 are held to a little over the
// worst error moons.js measured over 2024-2030 (4.4, 34, 509, 538, 1.7 and 0.11 km); one in 2005
// and one in 2045, twenty years either side of the fitted epoch, to a little over the worst over
// 2000-2050 (5.9, 120, 1 480, 836, 9.8 and 0.7 km). Every tolerance is under 0.7 % of the orbit. The
// far pair is what sees a slow term: MEASURED, dropping Phobos's quadratic term or putting one part
// per million on Titan's mean motion both pass the 2026-2027 points and fail these.
const HORIZONS = {
  phobos: [
    ['2026-01-15T06:00:00Z', -6068.767, 4289.359, 5788.761],
    ['2026-09-22T12:00:00Z', 7029.715, 5994.615, -678.371],
    ['2027-03-10T18:30:00Z', 5598.892, -5179.064, -5560.739],
    ['2027-09-22T00:00:00Z', 8128.092, 4068.430, -2690.250],
    ['2005-06-01T09:00:00Z', -2529.401, -8438.517, -2897.988],
    ['2045-06-01T21:00:00Z', -7826.544, -4893.655, 1956.851],
  ],
  deimos: [
    ['2026-01-15T06:00:00Z', -20553.503, 1770.320, 11153.485],
    ['2026-09-22T12:00:00Z', -9004.518, -20758.357, -6203.921],
    ['2027-03-10T18:30:00Z', 1805.491, -20450.389, -11359.594],
    ['2027-09-22T00:00:00Z', -17950.996, 7847.121, 12892.123],
    ['2005-06-01T09:00:00Z', -20231.569, -9965.850, 6464.769],
    ['2045-06-01T21:00:00Z', 1066.950, -20978.420, -10436.490],
  ],
  enceladus: [
    ['2026-01-15T06:00:00Z', 206620.808, -116527.822, -9210.737],
    ['2026-09-22T12:00:00Z', -225571.098, -75245.528, 24932.632],
    ['2027-03-10T18:30:00Z', 201241.398, 122459.316, -26302.490],
    ['2027-09-22T00:00:00Z', -214141.414, -100325.371, 25821.553],
    ['2005-06-01T09:00:00Z', -131538.599, 199140.082, -3308.799],
    ['2045-06-01T21:00:00Z', 7542.234, 236683.170, -18045.992],
  ],
  titan: [
    ['2026-01-15T06:00:00Z', 594310.463, -1040057.023, 17137.393],
    ['2026-09-22T12:00:00Z', -1226750.972, -229647.760, 124112.208],
    ['2027-03-10T18:30:00Z', 658245.439, 1004830.958, -125681.447],
    ['2027-09-22T00:00:00Z', -996516.462, 758856.244, 37447.563],
    ['2005-06-01T09:00:00Z', -1115755.048, 575542.745, 59583.158],
    ['2045-06-01T21:00:00Z', -409411.118, -1156125.920, 112950.686],
  ],
  triton: [
    ['2026-01-15T06:00:00Z', 299167.367, 187601.217, -34069.430],
    ['2026-09-22T12:00:00Z', -279338.618, -102559.458, 193101.636],
    ['2027-03-10T18:30:00Z', -197927.732, -223384.626, -191827.553],
    ['2027-09-22T00:00:00Z', -259648.518, -73084.370, 230379.095],
    ['2005-06-01T09:00:00Z', 112777.278, -75262.185, -327875.831],
    ['2045-06-01T21:00:00Z', -89162.780, -207926.326, -273313.555],
  ],
  charon: [
    ['2026-01-15T06:00:00Z', -8931.740, -10424.362, -13988.057],
    ['2026-09-22T12:00:00Z', -14034.057, -12151.027, 6283.425],
    ['2027-03-10T18:30:00Z', 13998.517, 12091.292, -6461.234],
    ['2027-09-22T00:00:00Z', -11478.883, -8721.651, 13274.360],
    ['2005-06-01T09:00:00Z', 14373.145, 13294.036, -751.750],
    ['2045-06-01T21:00:00Z', -13633.463, -13375.860, -4396.624],
  ],
};
const HORIZONS_TOL_KM = { phobos: 10, deimos: 40, enceladus: 600, titan: 600, triton: 5, charon: 1 };
const HORIZONS_FAR_TOL_KM = { phobos: 10, deimos: 150, enceladus: 1500, titan: 900, triton: 12, charon: 1 };
const isFar = (iso) => !/^202[67]/.test(iso);
const PARENT = { phobos: 'mars', deimos: 'mars', enceladus: 'saturn', titan: 'saturn', triton: 'neptune', charon: 'pluto' };
{
  const { positionOf } = await import(join(JS, 'scene/worlds.js'));
  const { worldPositionKm } = await import(join(JS, 'propagate/body.js'));
  const { moonOffsetKm, moonParent, eclipticToEquatorial, temeToJ2000 } = await import(join(JS, 'propagate/frames.js'));
  const { MOON_ELEMENTS_VALID } = await import(join(JS, 'propagate/moons.js'));
  check(Object.keys(HORIZONS).length === SIX.length && SIX.every((id) => HORIZONS[id]), 'a Horizons table for every one of the six');
  for (const id of SIX) {
    check(moonParent(id) === PARENT[id] && rowOf(id).parent === PARENT[id], `${id} goes round ${PARENT[id]} in frames.js and in WORLDS`);
    const rec = recs.find((r) => r.id === id);
    for (const [iso, x, y, z] of HORIZONS[id]) {
      const t = Date.parse(iso);
      // The offset itself, as a VECTOR against Horizons' -- a distance alone would pass a moon on
      // the far side of the right-sized circle.
      const off = moonOffsetKm(id, t);
      const miss = off ? Math.hypot(off.x - x, off.y - y, off.z - z) : NaN;
      const tol = (isFar(iso) ? HORIZONS_FAR_TOL_KM : HORIZONS_TOL_KM)[id];
      check(miss < tol, `${id} at ${iso} is ${miss.toFixed(2)} km from where Horizons puts it (tolerance ${tol} km)`);
      // And what the drawing uses: the moon's heliocentric position less its planet's, back in
      // equatorial axes, is that same offset, so its distance from the planet is Horizons' too.
      const m = positionOf(id, t);
      const p = positionOf(PARENT[id], t);
      const d = m && p ? eclipticToEquatorial({ x: m.x - p.x, y: m.y - p.y, z: m.z - p.z }) : null;
      const dist = d ? Math.hypot(d.x, d.y, d.z) : NaN;
      check(Math.abs(dist - Math.hypot(x, y, z)) < tol,
        `${id} is drawn ${dist.toFixed(1)} km from ${PARENT[id]} at ${iso}; Horizons: ${Math.hypot(x, y, z).toFixed(1)}`);
      const q = propagate(rec, t);
      check(q && Math.hypot(q.x - m.x, q.y - m.y, q.z - m.z) < 1e-3, `${id}: the record's propagator and the drawing agree at ${iso}`);
      // From Earth: the planet is back-dated by the light time, so the moon must be too (body.js).
      const ge = worldPositionKm(id, t, 'earth-inertial');
      const gp = worldPositionKm(PARENT[id], t, 'earth-inertial');
      const seen = temeToJ2000({ x: ge.x - gp.x, y: ge.y - gp.y, z: ge.z - gp.z }, t);
      const lightMs = (Math.hypot(gp.x, gp.y, gp.z) / 299792.458) * 1000;
      const then = moonOffsetKm(id, t - lightMs);
      const lag = Math.hypot(seen.x - then.x, seen.y - then.y, seen.z - then.z);
      const skipped = Math.hypot(off.x - then.x, off.y - then.y, off.z - then.z);
      check(lag < 5 && skipped > 100,
        `${id} seen from Earth at ${iso} is ${lag.toFixed(2)} km from where it was when the light left (skipping the light time would be ${Math.round(skipped)} km)`);
    }
    // Outside the span the error was measured over, a refusal and not a guess.
    for (const t of [MOON_ELEMENTS_VALID.fromMs - 86400000, MOON_ELEMENTS_VALID.toMs + 86400000]) {
      check(positionOf(id, t) === null && propagate(rec, t) === null && worldPositionKm(id, t, 'earth-inertial') === null,
        `${id} is not placed on ${new Date(t).toISOString().slice(0, 10)}, outside 2000-2050`);
    }
    check(positionOf(id, NaN) === null, `no time, no ${id}`);
  }
  // Charon from Pluto: the pair keeps its measured separation, 19 596 km (NASA's Pluto fact sheet).
  const t = Date.parse('2026-09-22T12:00:00Z');
  const c = positionOf('charon', t);
  const pl = positionOf('pluto', t);
  const sep = Math.hypot(c.x - pl.x, c.y - pl.y, c.z - pl.z);
  check(Math.abs(sep - 19596) < 40, `Charon is ${sep.toFixed(0)} km from Pluto; NASA: 19 596`);
}

// 12. Found by name and by their numbered designations ("Saturn VI" is Titan), ahead of craft and
// debris named after them, and "Mars I" means Phobos rather than the start of Deimos's "Mars II".
{
  const idx = buildIndex([...loaded, { id: 'sat-11', name: 'TITAN 3C TRANSTAGE DEB', klass: 'debris', layer: 'debris', meta: {} },
    { id: 'probe-1', name: 'PHOBOS-GRUNT', klass: 'probe', layer: 'deep-space', meta: {} },
    { id: 'sat-12', name: 'TRITON-1', klass: 'satellite', layer: 'active', meta: {} }], LAYERS);
  for (const [q, want] of [['titan', 'titan'], ['enceladus', 'enceladus'], ['triton', 'triton'], ['charon', 'charon'],
    ['phobos', 'phobos'], ['deimos', 'deimos'], ['saturn vi', 'titan'], ['saturn ii', 'enceladus'], ['neptune i', 'triton'],
    ['pluto i', 'charon'], ['mars i', 'phobos'], ['mars ii', 'deimos'], ['jupiter i', 'io'], ['saturn', 'saturn'],
    ['neptune', 'neptune'], ['mars', 'mars'], ['pluto', 'pluto']]) {
    const hit = findMatches(idx, q).hits[0];
    check(hit && hit.record.id === want, `"${q}" finds ${want} first (got ${hit && hit.record.id})`);
  }
}

// 13. How they are drawn: from Earth, around their planet's drawn disc at its enlargement, like
// Jupiter's four; from inside their own system, everything at its true place and size.
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { stage, STAGES } = await import(join(JS, 'scene/stage.js'));
  const { createWorlds, positionOf } = await import(join(JS, 'scene/worlds.js'));
  const t = Date.parse('2026-09-22T12:00:00Z');
  stage.setWorld('earth');
  stage.setTime(t);
  const earth = createWorlds(new THREE.Scene(), { textureBase: null });
  earth.update(t);
  for (const id of SIX) {
    const P = earth.meshFor(PARENT[id]);
    const pv = earth.viewScale(PARENT[id]);
    const m = earth.meshFor(id);
    const mt = positionOf(id, t);
    const pt = positionOf(PARENT[id], t);
    const trueRadii = Math.hypot(mt.x - pt.x, mt.y - pt.y, mt.z - pt.z) / rowOf(PARENT[id]).radiusKm;
    const drawnRadii = m.position.distanceTo(P.position) / P.scale.x;
    check(pv.exaggerated && m.visible && Math.abs(drawnRadii - trueRadii) / trueRadii < 1e-6,
      `${id} is drawn ${drawnRadii.toFixed(3)} ${PARENT[id]} radii from the drawn ${PARENT[id]}; it is ${trueRadii.toFixed(3)} from the real one`);
    check(m.scale.x < P.scale.x, `${id} is drawn smaller than ${PARENT[id]}`);
    const vs = earth.viewScale(id);
    check(vs.exaggerated && vs.withParent && vs.note.includes(rowOf(PARENT[id]).display) && vs.note.includes(rowOf(id).display),
      `${id}'s card says how it is drawn: "${vs.note}"`);
    check(STAGES[id] && STAGES[id].unitKm > 0, `${id} can be the centre of the map`);
  }
  earth.dispose();
  // The one-pixel floor is measured from the CAMERA. By Earth it is what it was; flown to three
  // drawn Mars radii from the drawn Mars, a floor measured from Earth drew Phobos a quarter of
  // Mars's width (2026-09-22), where its true share, 11.08 / 3389.5, is 0.33 %.
  {
    const cam = new THREE.PerspectiveCamera(45, 800 / 600, 1e-5, 1e9);
    const near = createWorlds(new THREE.Scene(), { textureBase: null, camera: cam });
    near.update(t);
    const M = near.meshFor('mars');
    const Ph = near.meshFor('phobos');
    const byEarth = Ph.scale.x / M.scale.x;
    cam.position.copy(M.position).add(new THREE.Vector3(0, 0, 3 * M.scale.x));
    cam.updateMatrixWorld();
    near.update(t);
    const byMars = Ph.scale.x / M.scale.x;
    const trueShare = rowOf('phobos').radiusKm / rowOf('mars').radiusKm;
    check(byEarth > 0.1, `from Earth, Phobos keeps its one-pixel floor (${(byEarth * 100).toFixed(1)} % of the drawn Mars)`);
    check(byMars < 3 * trueShare, `by the drawn Mars, Phobos is ${(byMars * 100).toFixed(2)} % of it, near its true ${(trueShare * 100).toFixed(2)} %`);
    near.dispose();
  }
  // From each moon's planet and from the moon itself: one system, drawn true.
  for (const [centre, members] of [['saturn', ['saturn', 'titan', 'enceladus']], ['titan', ['saturn', 'titan', 'enceladus']],
    ['mars', ['mars', 'phobos', 'deimos']], ['phobos', ['mars', 'phobos', 'deimos']], ['neptune', ['neptune', 'triton']],
    ['triton', ['neptune', 'triton']], ['pluto', ['pluto', 'charon']], ['charon', ['pluto', 'charon']]]) {
    stage.setWorld(centre);
    stage.setTime(t);
    const w = createWorlds(new THREE.Scene(), { textureBase: null });
    w.update(t);
    for (const id of members) {
      const vs = w.viewScale(id);
      check(vs && !vs.exaggerated && Math.abs(w.drawnRadiusUnits(id) * stage.unitKm - rowOf(id).radiusKm) < 1e-6 * rowOf(id).radiusKm,
        `from ${centre}, ${id} is drawn where it is at the size it is`);
    }
    check(w.drawnPositionOf(centre).length() === 0, `${centre} is the origin of its own stage`);
    check(w.viewScale('jupiter').exaggerated, `from ${centre}, Jupiter is squeezed`);
    if (centre === 'pluto') {
      const km = w.drawnPositionOf('charon').length() * stage.unitKm;
      check(Math.abs(km - 19596) < 40, `from Pluto, Charon is drawn ${km.toFixed(0)} km away (NASA: 19 596)`);
    }
    w.dispose();
  }
  stage.setWorld('earth');
}

// 14. The cards: what each one is, how to see it (never "your own eyes"), that it is a plain ball,
// that Phobos and Deimos are not balls at all, and where it all came from. And Neptune, whose card
// said "You can see this one with your own eyes" at magnitude 7.7 until this change.
{
  const { firstSentence, drawingLine, seeItLine } = await import(join(JS, 'ui/cards.js'));
  const { positionOf } = await import(join(JS, 'scene/worlds.js'));
  const now = Date.parse('2026-09-22T12:00:00Z');
  const ctx = { clock: { now: () => now }, worlds: { positionOf }, selected: () => null };
  const WHAT = { titan: 'Huygens', enceladus: 'geysers', triton: 'orbits backwards', charon: 'half Pluto', phobos: 'spiralling in', deimos: 'smaller of Mars' };
  // How each can be seen, and the magnitude its line must name (registry/worlds.yaml `facts.seen`).
  const SEE = { titan: /8\.2.*small telescope/, enceladus: /11\.7.*telescope/, triton: /13\.5.*telescope/, charon: /16\.8.*14-inch telescope/, phobos: /11\.3.*glare/, deimos: /12\.4.*glare/ };
  for (const id of SIX) {
    const r = recs.find((x) => x.id === id);
    const e = positionOf('earth', now);
    const p = positionOf(id, now);
    const s = String(firstSentence(r, ctx, { ok: true, tMs: now, distEarthKm: Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z), altKm: null }, { state: 'na' }));
    const across = Math.round(r.meta.radiusKm * 2);
    check(s.length <= 160 && s.includes(WHAT[id]) && s.replace(/\s/g, '').includes(`about${across}kmacross`),
      `${id}'s first sentence says what it is and how big, in 160 characters: "${s}" (${s.length})`);
    const see = seeItLine(r, ctx, { ok: true, tMs: now }, { state: 'na' });
    check(!/your own eyes/.test(see) && /^(Not by eye|Barely)/.test(see) && SEE[id].test(see), `${id} says how it can really be seen: "${see}"`);
    const draw = drawingLine(r) || '';
    const lumpy = id === 'phobos' || id === 'deimos';
    check(/no surface map/.test(draw) && /true shape is not drawn/.test(draw) === lumpy,
      `${id}'s drawing line${lumpy ? ' says its true shape is not drawn' : ''}: ${draw}`);
    check(/Astronomy Engine/.test(r.meta.cite) && /JPL Horizons/.test(r.meta.cite) && /read 2026-09-22/.test(r.meta.cite),
      `${id}'s source line names the ephemeris, the fit and the day its facts were read`);
  }
  const neptune = seeItLine(recs.find((x) => x.id === 'neptune'), ctx, { ok: true, tMs: now }, { state: 'na' });
  check(!/your own eyes/.test(neptune) && /7\.7/.test(neptune) && /binoculars/.test(neptune), `Neptune no longer claims the naked eye: "${neptune}"`);
  const uranus = seeItLine(recs.find((x) => x.id === 'uranus'), ctx, { ok: true, tMs: now }, { state: 'na' });
  check(/your own eyes/.test(uranus), `Uranus, at magnitude 5.4 to 6.0, keeps its line: "${uranus}"`);
}

// 15. TEN MORE MOONS, AGAINST JPL HORIZONS (2026-09-22): Saturn's Mimas, Tethys, Dione, Rhea and
// Iapetus, Uranus's Miranda, Ariel, Umbriel, Titania and Oberon, the same six instants and the same
// query as section 11 with COMMAND 601/603/604/605/608 and CENTER '500@699' for Saturn's, COMMAND
// 705/701/702/703/704 and CENTER '500@799' for Uranus's. Tolerances are a little over what
// propagate/moons.js measured over 2024-2030 for the four near instants and over 2000-2050 for the
// far pair: Mimas 130 and 703, Tethys 83 and 119, Dione 211 and 235, Rhea 161 and 199, Iapetus
// 3 709 and 6 800, Miranda 57 and 117, Ariel 80 and 114, Umbriel 362 and 410, Titania 1 008 and
// 996, Oberon 1 208 and 1 230. MEASURED, one at a time: Mimas with its three `lib` terms taken
// away fails every instant by 100 000 km and more; without the third alone, 2026 by 560 km; Tethys
// without its first by 10 000; Miranda without its first by 3 000; Titania and Oberon without their
// second eccentricity vector by 1 400 and 1 900 over the far pair; Iapetus without its second
// inclination vector by 9 000; Uranus's pole for its antipode puts all five on the wrong side.
const HORIZONS_TEN = {
  mimas: [
    ['2026-01-15T06:00:00Z', -185075.056, -14746.184, 19351.431],
    ['2026-09-22T12:00:00Z', 172934.138, 58938.969, -14498.427],
    ['2027-03-10T18:30:00Z', -92549.884, -160090.130, 22984.824],
    ['2027-09-22T00:00:00Z', 71936.942, -167679.304, 8663.782],
    ['2005-06-01T09:00:00Z', -173926.478, -62176.860, 24441.826],
    ['2045-06-01T21:00:00Z', -72861.443, -168720.392, 15625.533],
  ],
  tethys: [
    ['2026-01-15T06:00:00Z', 230012.239, -184200.959, -4988.146],
    ['2026-09-22T12:00:00Z', -282122.682, 84022.905, 12467.901],
    ['2027-03-10T18:30:00Z', 213820.511, 200150.214, -32884.584],
    ['2027-09-22T00:00:00Z', -286011.509, -64359.593, 29917.162],
    ['2005-06-01T09:00:00Z', -239299.335, -169418.207, 29733.990],
    ['2045-06-01T21:00:00Z', 291345.523, 35636.030, -25895.086],
  ],
  dione: [
    ['2026-01-15T06:00:00Z', 207385.505, -315770.637, 5304.908],
    ['2026-09-22T12:00:00Z', -67432.482, 369943.912, -21320.585],
    ['2027-03-10T18:30:00Z', 265079.065, 264633.672, -42115.412],
    ['2027-09-22T00:00:00Z', -362600.623, 99983.795, 23688.720],
    ['2005-06-01T09:00:00Z', -372124.058, -47175.342, 35353.637],
    ['2045-06-01T21:00:00Z', 179032.361, -331177.243, 8910.795],
  ],
  rhea: [
    ['2026-01-15T06:00:00Z', 222264.772, -477097.004, 18747.191],
    ['2026-09-22T12:00:00Z', 111982.772, 512742.389, -49348.391],
    ['2027-03-10T18:30:00Z', -208138.520, -481071.026, 55052.987],
    ['2027-09-22T00:00:00Z', 427428.960, -307200.230, -11724.884],
    ['2005-06-01T09:00:00Z', -262845.055, 457200.533, -8337.960],
    ['2045-06-01T21:00:00Z', -515275.968, -100357.056, 52510.299],
  ],
  iapetus: [
    ['2026-01-15T06:00:00Z', -3591032.199, -48866.937, 706280.295],
    ['2026-09-22T12:00:00Z', -2225361.645, -2878609.924, -89994.338],
    ['2027-03-10T18:30:00Z', 512500.031, -3449587.191, -741624.904],
    ['2027-09-22T00:00:00Z', -53249.719, 3475257.125, 656009.542],
    ['2005-06-01T09:00:00Z', -3486413.026, -988247.942, 520477.165],
    ['2045-06-01T21:00:00Z', -1040018.783, -3430114.146, -448788.471],
  ],
  miranda: [
    ['2026-01-15T06:00:00Z', 124254.924, -32830.468, -19363.119],
    ['2026-09-22T12:00:00Z', 115908.808, -21156.960, -54837.988],
    ['2027-03-10T18:30:00Z', 49234.438, -46516.880, 110595.614],
    ['2027-09-22T00:00:00Z', 114219.456, -47223.184, 39627.231],
    ['2005-06-01T09:00:00Z', -34558.703, -16101.926, 124070.203],
    ['2045-06-01T21:00:00Z', 1288.887, 36501.609, -124814.735],
  ],
  ariel: [
    ['2026-01-15T06:00:00Z', -154630.015, 3583.083, 112107.707],
    ['2026-09-22T12:00:00Z', 139944.317, -63041.451, 113559.532],
    ['2027-03-10T18:30:00Z', 178894.373, -22843.688, -62469.841],
    ['2027-09-22T00:00:00Z', -186491.756, 36933.606, 17939.950],
    ['2005-06-01T09:00:00Z', 66576.944, -61642.162, 167753.894],
    ['2045-06-01T21:00:00Z', 4165.425, -51912.029, 183520.095],
  ],
  umbriel: [
    ['2026-01-15T06:00:00Z', 145560.345, 29162.725, -221838.487],
    ['2026-09-22T12:00:00Z', -250752.416, 33964.266, 79540.361],
    ['2027-03-10T18:30:00Z', -196235.843, 87579.646, -157043.322],
    ['2027-09-22T00:00:00Z', -259645.473, 55913.390, 7770.983],
    ['2005-06-01T09:00:00Z', -248375.090, 71898.331, -57407.873],
    ['2045-06-01T21:00:00Z', 259440.790, -51774.472, -22661.228],
  ],
  titania: [
    ['2026-01-15T06:00:00Z', -64980.788, -101865.824, 420242.029],
    ['2026-09-22T12:00:00Z', -419087.569, 108756.839, -51942.703],
    ['2027-03-10T18:30:00Z', 365254.733, -136773.487, 196726.216],
    ['2027-09-22T00:00:00Z', -227068.657, 145994.356, -342193.301],
    ['2005-06-01T09:00:00Z', -414904.225, 114245.678, -74810.568],
    ['2045-06-01T21:00:00Z', -138146.368, -81653.937, 406345.744],
  ],
  oberon: [
    ['2026-01-15T06:00:00Z', 446742.372, -188532.426, 322779.785],
    ['2026-09-22T12:00:00Z', -567911.638, 135943.734, -32436.222],
    ['2027-03-10T18:30:00Z', 536147.320, -59724.999, -219359.616],
    ['2027-09-22T00:00:00Z', -536873.721, 59235.632, 221777.641],
    ['2005-06-01T09:00:00Z', -414992.916, 192380.215, -363318.670],
    ['2045-06-01T21:00:00Z', -475283.832, 13440.065, 340170.935],
  ],
};
const TEN_TOL_KM = { mimas: 200, tethys: 120, dione: 260, rhea: 210, iapetus: 4200, miranda: 90, ariel: 120, umbriel: 420, titania: 1100, oberon: 1300 };
const TEN_FAR_TOL_KM = { mimas: 800, tethys: 160, dione: 300, rhea: 260, iapetus: 7500, miranda: 160, ariel: 160, umbriel: 480, titania: 1100, oberon: 1350 };
const TEN_PARENT = { mimas: 'saturn', tethys: 'saturn', dione: 'saturn', rhea: 'saturn', iapetus: 'saturn', miranda: 'uranus', ariel: 'uranus', umbriel: 'uranus', titania: 'uranus', oberon: 'uranus' };
{
  const { positionOf } = await import(join(JS, 'scene/worlds.js'));
  const { worldPositionKm } = await import(join(JS, 'propagate/body.js'));
  const { moonOffsetKm, moonParent, eclipticToEquatorial, temeToJ2000 } = await import(join(JS, 'propagate/frames.js'));
  const { MOON_ELEMENTS, MOON_ELEMENTS_VALID } = await import(join(JS, 'propagate/moons.js'));
  check(Object.keys(HORIZONS_TEN).length === TEN.length && TEN.every((id) => HORIZONS_TEN[id]), 'a Horizons table for every one of the ten');
  for (const id of TEN) {
    check(moonParent(id) === TEN_PARENT[id] && rowOf(id).parent === TEN_PARENT[id], `${id} goes round ${TEN_PARENT[id]} in frames.js and in WORLDS`);
    const rec = recs.find((r) => r.id === id);
    check(!!rec, `${id} is a world record`);
    for (const [iso, x, y, z] of HORIZONS_TEN[id]) {
      const t = Date.parse(iso);
      const off = moonOffsetKm(id, t);
      const miss = off ? Math.hypot(off.x - x, off.y - y, off.z - z) : NaN;
      const tol = (isFar(iso) ? TEN_FAR_TOL_KM : TEN_TOL_KM)[id];
      check(miss < tol, `${id} at ${iso} is ${miss.toFixed(2)} km from where Horizons puts it (tolerance ${tol} km)`);
      // Under 0.45 % of the orbit, whatever the tolerance: a moon on the wrong side of a circle
      // the right size would pass a distance check and must not pass this one.
      check(tol / MOON_ELEMENTS[id].a < 0.0045, `${id}'s tolerance is under 0.45 % of its orbit`);
      const m = positionOf(id, t);
      const p = positionOf(TEN_PARENT[id], t);
      const d = m && p ? eclipticToEquatorial({ x: m.x - p.x, y: m.y - p.y, z: m.z - p.z }) : null;
      const dist = d ? Math.hypot(d.x, d.y, d.z) : NaN;
      check(Math.abs(dist - Math.hypot(x, y, z)) < tol,
        `${id} is drawn ${dist.toFixed(1)} km from ${TEN_PARENT[id]} at ${iso}; Horizons: ${Math.hypot(x, y, z).toFixed(1)}`);
      const q = propagate(rec, t);
      check(q && Math.hypot(q.x - m.x, q.y - m.y, q.z - m.z) < 1e-3, `${id}: the record's propagator and the drawing agree at ${iso}`);
      // From Earth the planet is back-dated by its light time (79 minutes for Saturn, 2 hours 40 for
      // Uranus on 2026-09-22), so the moon must be too. Skipping it would move Mimas 6 000 km.
      const ge = worldPositionKm(id, t, 'earth-inertial');
      const gp = worldPositionKm(TEN_PARENT[id], t, 'earth-inertial');
      const seen = temeToJ2000({ x: ge.x - gp.x, y: ge.y - gp.y, z: ge.z - gp.z }, t);
      const lightMs = (Math.hypot(gp.x, gp.y, gp.z) / 299792.458) * 1000;
      const then = moonOffsetKm(id, t - lightMs);
      const lag = Math.hypot(seen.x - then.x, seen.y - then.y, seen.z - then.z);
      const skipped = Math.hypot(off.x - then.x, off.y - then.y, off.z - then.z);
      check(lag < 5 && skipped > 100,
        `${id} seen from Earth at ${iso} is ${lag.toFixed(2)} km from where it was when the light left (skipping the light time would be ${Math.round(skipped)} km)`);
    }
    for (const t of [MOON_ELEMENTS_VALID.fromMs - 86400000, MOON_ELEMENTS_VALID.toMs + 86400000]) {
      check(positionOf(id, t) === null && propagate(rec, t) === null && worldPositionKm(id, t, 'earth-inertial') === null,
        `${id} is not placed on ${new Date(t).toISOString().slice(0, 10)}, outside 2000-2050`);
    }
    check(positionOf(id, NaN) === null, `no time, no ${id}`);
    // The pole is the planet's own, held, as moons.js says: Saturn's for its five, the antipode of
    // Uranus's for its five (Uranus turns backwards about its IAU pole, and so its moons go round
    // the other end of the axis).
    const el = MOON_ELEMENTS[id];
    const pole = TEN_PARENT[id] === 'saturn' ? [40.589, 83.537] : [77.311, 15.175];
    check(el.poleRa === pole[0] && el.poleDec === pole[1], `${id}'s pole is ${TEN_PARENT[id]}'s own (${el.poleRa}, ${el.poleDec})`);
  }
  // The Mimas-Tethys resonance, as the fit found it: the two swing on the same seventy-year beat
  // (Wikipedia, Tethys: "locked in an inclination resonance with Mimas"), Mimas twenty times as far
  // as Tethys for being a sixteenth of its mass.
  const { mimas, tethys } = MOON_ELEMENTS;
  const yr = (nu) => 360 / nu / 365.25;
  check(yr(mimas.libNu) > 65 && yr(mimas.libNu) < 75 && yr(tethys.libNu) > 65 && yr(tethys.libNu) < 75,
    `Mimas and Tethys share a ~70-year libration (${yr(mimas.libNu).toFixed(1)}, ${yr(tethys.libNu).toFixed(1)} years)`);
  const ratio = Math.hypot(mimas.libA, mimas.libB) / Math.hypot(tethys.libA, tethys.libB);
  check(ratio > 15 && ratio < 25, `Mimas swings ${ratio.toFixed(1)} times as far as Tethys`);
  // Iapetus's plane is two: the second inclination vector is 7 to 9 degrees and nowhere near zero.
  const { iapetus } = MOON_ELEMENTS;
  const i2 = 2 * Math.atan(Math.hypot(iapetus.q2, iapetus.p2)) * 180 / Math.PI;
  check(i2 > 7 && i2 < 9, `Iapetus carries a second inclination of ${i2.toFixed(2)} degrees`);
}

// 16. Found by name and by their numbered designations, ahead of craft named after them; "Uranus I"
// is Ariel and not the start of "Uranus II", "Uranus III" or "Uranus IV".
{
  const idx = buildIndex([...loaded, { id: 'sat-13', name: 'ARIEL 4', klass: 'satellite', layer: 'active', meta: {} },
    { id: 'sat-14', name: 'OBERON-1', klass: 'satellite', layer: 'active', meta: {} },
    { id: 'sat-15', name: 'MIRANDA', klass: 'debris', layer: 'debris', meta: {} },
    { id: 'sat-16', name: 'TITAN 3C TRANSTAGE DEB', klass: 'debris', layer: 'debris', meta: {} }], LAYERS);
  for (const [q, want] of [['mimas', 'mimas'], ['tethys', 'tethys'], ['dione', 'dione'], ['rhea', 'rhea'], ['iapetus', 'iapetus'],
    ['miranda', 'miranda'], ['ariel', 'ariel'], ['umbriel', 'umbriel'], ['titania', 'titania'], ['oberon', 'oberon'],
    ['saturn i', 'mimas'], ['saturn iii', 'tethys'], ['saturn iv', 'dione'], ['saturn v', 'rhea'], ['saturn viii', 'iapetus'],
    ['uranus i', 'ariel'], ['uranus ii', 'umbriel'], ['uranus iii', 'titania'], ['uranus iv', 'oberon'], ['uranus v', 'miranda'],
    ['saturn ii', 'enceladus'], ['saturn vi', 'titan'], ['uranus', 'uranus'], ['saturn', 'saturn'], ['titan', 'titan']]) {
    const hit = findMatches(idx, q).hits[0];
    check(hit && hit.record.id === want, `"${q}" finds ${want} first (got ${hit && hit.record.id})`);
  }
  // Nothing is dropped on the way to search: every one of the 31 worlds is in the index.
  const missing = WORLDS.map((w) => w.id).filter((id) => !findMatches(idx, rowOf(id).display).hits.some((h) => h.record.id === id));
  check(missing.length === 0, `every world can be found by its own name; these cannot: ${missing}`);
}

// 17. How they are drawn: from Earth around the drawn Saturn or Uranus at its enlargement; from
// Saturn, Iapetus, Uranus and Miranda, at their true places and sizes. And nothing is silently
// dropped by the layer's budget on the way.
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { stage, STAGES } = await import(join(JS, 'scene/stage.js'));
  const { createWorlds, positionOf } = await import(join(JS, 'scene/worlds.js'));
  const t = Date.parse('2026-09-22T12:00:00Z');
  check(loaded.length === 31 && row.budget.maxItems >= loaded.length + 4,
    `the worlds layer loads all 31 records with room to spare (${loaded.length} of ${row.budget.maxItems})`);
  stage.setWorld('earth');
  stage.setTime(t);
  const earth = createWorlds(new THREE.Scene(), { textureBase: null });
  earth.update(t);
  for (const id of TEN) {
    const P = earth.meshFor(TEN_PARENT[id]);
    const pv = earth.viewScale(TEN_PARENT[id]);
    const m = earth.meshFor(id);
    const mt = positionOf(id, t);
    const pt = positionOf(TEN_PARENT[id], t);
    const trueRadii = Math.hypot(mt.x - pt.x, mt.y - pt.y, mt.z - pt.z) / rowOf(TEN_PARENT[id]).radiusKm;
    const drawnRadii = m.position.distanceTo(P.position) / P.scale.x;
    check(pv.exaggerated && m.visible && Math.abs(drawnRadii - trueRadii) / trueRadii < 1e-6,
      `${id} is drawn ${drawnRadii.toFixed(3)} ${TEN_PARENT[id]} radii from the drawn ${TEN_PARENT[id]}; it is ${trueRadii.toFixed(3)} from the real one`);
    check(m.scale.x < P.scale.x, `${id} is drawn smaller than ${TEN_PARENT[id]}`);
    const vs = earth.viewScale(id);
    check(vs.exaggerated && vs.withParent && vs.note.includes(rowOf(TEN_PARENT[id]).display) && vs.note.includes(rowOf(id).display),
      `${id}'s card says how it is drawn: "${vs.note}"`);
    check(STAGES[id] && STAGES[id].unitKm === (rowOf(id).radiusKm < 500 ? 100 : 1000), `${id} can be the centre of the map, at the unit its size sets`);
  }
  // Iapetus is 61 Saturn radii out and Mimas 3.2: the system keeps its shape around the drawn disc.
  const S = earth.meshFor('saturn');
  const far = earth.meshFor('iapetus').position.distanceTo(S.position) / S.scale.x;
  const near = earth.meshFor('mimas').position.distanceTo(S.position) / S.scale.x;
  check(far > 55 && far < 66 && near > 3.0 && near < 3.4, `from Earth, Iapetus is drawn ${far.toFixed(1)} Saturn radii out and Mimas ${near.toFixed(2)}`);
  earth.dispose();
  for (const [centre, members] of [['saturn', ['saturn', 'mimas', 'tethys', 'dione', 'rhea', 'iapetus', 'titan']],
    ['iapetus', ['saturn', 'iapetus', 'titan']], ['mimas', ['saturn', 'mimas', 'enceladus']],
    ['uranus', ['uranus', 'miranda', 'ariel', 'umbriel', 'titania', 'oberon']], ['miranda', ['uranus', 'miranda', 'ariel']], ['oberon', ['uranus', 'oberon']]]) {
    stage.setWorld(centre);
    stage.setTime(t);
    const w = createWorlds(new THREE.Scene(), { textureBase: null });
    w.update(t);
    for (const id of members) {
      const vs = w.viewScale(id);
      check(vs && !vs.exaggerated && Math.abs(w.drawnRadiusUnits(id) * stage.unitKm - rowOf(id).radiusKm) < 1e-6 * rowOf(id).radiusKm,
        `from ${centre}, ${id} is drawn where it is at the size it is`);
    }
    check(w.drawnPositionOf(centre).length() === 0, `${centre} is the origin of its own stage`);
    check(w.viewScale('jupiter').exaggerated, `from ${centre}, Jupiter is squeezed`);
    w.dispose();
  }
  stage.setWorld('earth');
}

// 18. The cards: what each one is, how to see it with its magnitude, that it is a plain ball, and
// where it came from. Iapetus's says it has two faces. Checked at three dates, because the
// distance is part of the sentence and the 160 characters have to hold at each.
{
  const { firstSentence, drawingLine, seeItLine } = await import(join(JS, 'ui/cards.js'));
  const { positionOf } = await import(join(JS, 'scene/worlds.js'));
  const WHAT = { mimas: 'crater a third', tethys: 'water ice', dione: 'ice cliffs', rhea: 'second largest', iapetus: 'dark as coal',
    miranda: 'Grand Canyon', ariel: 'brightest', umbriel: 'darkest', titania: 'largest moon', oberon: 'second largest' };
  const SEE = { mimas: /12\.9.*telescope/, tethys: /10\.2.*telescope/, dione: /10\.4.*telescope/, rhea: /magnitude 10\b.*telescope/,
    iapetus: /10\.2.*11\.9.*dark side.*telescope/, miranda: /16\.6.*telescopes/, ariel: /14\.8.*telescope/, umbriel: /15\.1.*telescope/,
    titania: /13\.9.*telescope/, oberon: /14\.1.*telescope/ };
  for (const iso of ['2026-01-15T06:00:00Z', '2026-09-22T12:00:00Z', '2027-09-22T00:00:00Z']) {
    const now = Date.parse(iso);
    const ctx = { clock: { now: () => now }, worlds: { positionOf }, selected: () => null };
    for (const id of TEN) {
      const r = recs.find((x) => x.id === id);
      const e = positionOf('earth', now);
      const p = positionOf(id, now);
      const s = String(firstSentence(r, ctx, { ok: true, tMs: now, distEarthKm: Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z), altKm: null }, { state: 'na' }));
      const across = Math.round(r.meta.radiusKm * 2);
      check(s.length <= 160 && s.includes(WHAT[id]) && s.replace(/\s/g, '').includes(`about${across}kmacross`),
        `${id}'s first sentence says what it is and how big, in 160 characters at ${iso.slice(0, 10)}: "${s}" (${s.length})`);
      check(!s.includes(' -- '), `${id}'s sentence writes no double-hyphen dash`);
      if (iso.startsWith('2026-09')) {
        const see = seeItLine(r, ctx, { ok: true, tMs: now }, { state: 'na' });
        check(!/your own eyes/.test(see) && /^(Not by eye|Barely)/.test(see) && SEE[id].test(see), `${id} says how it can really be seen: "${see}"`);
        const draw = drawingLine(r) || '';
        check(/no surface map/.test(draw) && !/true shape is not drawn/.test(draw), `${id}'s drawing line says it is a plain ball and not that it is lumpy: ${draw}`);
        check(/Astronomy Engine/.test(r.meta.cite) && /JPL Horizons/.test(r.meta.cite) && /read 2026-09-22/.test(r.meta.cite),
          `${id}'s source line names the ephemeris, the fit and the day its facts were read`);
      }
    }
  }
  const iap = recs.find((x) => x.id === 'iapetus');
  check(/both albedos/.test(iap.meta.cite), 'Iapetus\'s source line says two albedos were read, not one');
}

if (problems.length) {
  console.error('worlds layer FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`worlds layer ok: ${recs.length} worlds are records, searchable by name and alias, and the smaller disc wins a tap, and a planet's map waits until its disc can show it; Pluto and Jupiter's four big moons sit where NASA's numbers put them, the moons drawn around the drawn Jupiter, and each card says what it is, how big, how far and that it is a plain ball; Phobos, Deimos, Enceladus, Titan, Triton and Charon sit within 0.3 % of their orbits of where JPL Horizons puts them, and Neptune's card no longer claims the naked eye; Saturn's Mimas, Tethys, Dione, Rhea and Iapetus and Uranus's five sit within 0.45 %, with their planets' own poles, and their cards say what each is, how to see it and that Iapetus has two faces`);
