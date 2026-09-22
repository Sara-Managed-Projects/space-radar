// What a card says about its own drawing, its position's age, and its comparisons -- the small
// lies the 2026-09-08 review measured, each now asserted so it cannot come back.
//
//   node tests/test_cards_copy.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { drawingLine, classLine, flyTo, rightNowFor, firstSentence } = await import(join(JS, 'ui/cards.js'));
const { compare } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const has = (s, needle) => typeof s === 'string' && s.includes(needle);

// --- "drawn as", for every class -------------------------------------------------------------
const iss = { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station', layer: 'stations', meta: { noradId: 25544 } };
const geo = { id: 'sat-1', name: 'SOME COMSAT 7', klass: 'satellite', layer: 'geo-ring', meta: { noradId: 1 } };
const plain = { id: 'sat-2', name: 'SOME CUBESAT', klass: 'satellite', layer: 'active', meta: { noradId: 2 } };
const apollo = { id: 'apollo-11', name: 'Apollo 11 landing site', klass: 'site', layer: 'hand-kept-sites', siteClass: 'pad', meta: { siteKind: 'pad' } };
const world = { id: 'moon', name: 'Moon', klass: 'world', meta: {} };
check(has(drawingLine(iss), 'International Space Station'), `a real model of THIS object says so: ${drawingLine(iss)}`);
// ...and HOW it was made, which is a second claim and was wrong for every one of them. A `file:`
// entry is somebody else's model, loaded; a `build:` entry is scene/models.js working from
// published metres. One string was making both claims, so Hubble's card said "drawn from
// published dimensions" about NASA's own CAD.
check(has(drawingLine(iss), 'published model of'), `a loaded model says it is a model: ${drawingLine(iss)}`);
const soyuz = { id: 'sat-3', name: 'SOYUZ-MS 29', klass: 'satellite', layer: 'stations', meta: { noradId: 3 } };
check(has(drawingLine(soyuz), 'not this exact one') && !has(drawingLine(soyuz), 'published model'),
  `a procedural family shape does not claim to be somebody's model: ${drawingLine(soyuz)}`);
const rocket = { id: 'l-1', name: 'Falcon 9', klass: 'rocket', layer: 'launches', meta: { drawsAs: 'variant', rocket: 'Falcon 9', sizeM: 70 } };
check(has(drawingLine(rocket), 'published dimensions'),
  `a rocket IS built from published dimensions and still says so: ${drawingLine(rocket)}`);
// "geostationary", not "communications": the ring holds weather, Earth-observation and surveillance
// satellites too, and the orbit is the only thing the entry actually knows (scene/realmodels.js,
// GEO_BUS). A default that names a mission is a default that is wrong for some of what it reaches.
check(has(drawingLine(geo), 'geostationary satellite') && has(drawingLine(geo), 'not this exact one'), `a class default admits it: ${drawingLine(geo)}`);
check(!has(drawingLine(geo), 'communications'), `the ring default does not claim a mission it cannot know: ${drawingLine(geo)}`);
check(has(drawingLine(plain), 'generic satellite'), `the procedural shape admits it: ${drawingLine(plain)}`);
// The review's example was "Apollo sites drawn as a pad and no card says so". Since then the sites
// got a real lunar-module model, so the honest line is now the specific one -- and a DSN dish is
// the class-default case: one 70 m antenna model stands in for every dish.
check(has(drawingLine(apollo), 'lunar module'), `a site with a real model says which: ${drawingLine(apollo)}`);
const dish = { id: 'dss-14', name: 'Goldstone DSS-14', klass: 'site', layer: 'hand-kept-sites', siteClass: 'dish', meta: { siteKind: 'dish' } };
check(has(drawingLine(dish), 'Deep Space Network antenna') && has(drawingLine(dish), 'not this exact one'), `a class-default site model admits it: ${drawingLine(dish)}`);
check(drawingLine(world) === null, 'a world has no drawing line');
const star = { id: 'hip-32349', name: 'Sirius', klass: 'star', layer: 'stars', propagator: 'static', frame: 'sun-inertial', pos: { x: 1, y: 0, z: 0 }, meta: { distLy: 8.6 } };
const exo = { id: 'exo-proxima-cen-b', name: 'Proxima Cen b', klass: 'exoplanet', layer: 'exoplanets', propagator: 'static', frame: 'sun-inertial', pos: { x: 1, y: 0, z: 0 }, meta: { distLy: 4.24 } };
const dso = { id: 'dso-m31', name: 'Andromeda Galaxy', klass: 'dso', layer: 'deep-sky', propagator: 'static', frame: 'sun-inertial', pos: { x: 1, y: 0, z: 0 }, meta: { distLy: 2540000 } };
const exotic = { id: 'exotic-sgr-a-star', name: 'Sagittarius A*', klass: 'exotic', layer: 'exotics', propagator: 'static', frame: 'sun-inertial', pos: { x: 1, y: 0, z: 0 }, meta: { kind: 'blackhole', distLy: 26996 } };
check(has(drawingLine(exotic), 'ring'), `an extreme object says it is a ring: ${drawingLine(exotic)}`);
check(has(drawingLine(dso), 'soft mark'), `a deep-sky object says it is a soft mark: ${drawingLine(dso)}`);
check(has(drawingLine(exo), 'at its star'), `an exoplanet says it is drawn at its star: ${drawingLine(exo)}`);
check(has(drawingLine(star), 'point of light'), `a star says it is a point of light sized by brightness: ${drawingLine(star)}`);
check(has(drawingLine({ klass: 'rocket', meta: { drawsAs: 'generic', rocket: 'Nova' } }), 'generic rocket'), 'a record with its own drawsAs keeps the launch wording');

// --- the class line names the age of the elements --------------------------------------------
const nineteenH = 19 * 3600 * 1000;
const tMs = Date.parse('2026-09-08T12:00:00Z');
const gp = { cls: 'inferred', epoch: tMs - nineteenH, satrec: {}, meta: {} };
const line = classLine(gp, { cls: 'inferred', tMs });
check(has(line, '19'), `a GP record's class line carries its element age: ${line}`);
const fixed = { cls: 'inferred', epoch: tMs, meta: {} };
check(!has(classLine(fixed, { cls: 'inferred', tMs }), '19'), 'a record with neither elements nor satrec makes no claim about element age');

// --- comparisons that tell no small lies -----------------------------------------------------
check(compare('altitudeKm', 0) === null, 'no driving chip at 0 km (a launch pad)');
check(compare('altitudeKm', 0.4) === null, 'no driving chip under a kilometre');
check(has(compare('altitudeKm', 400), 'driving'), 'the driving chip still exists at 400 km');
check(has(compare('sizeM', 46), '15-storey'), `46 m is storeys, not a football field: ${compare('sizeM', 46)}`);
check(has(compare('sizeM', 70), '25-storey'), `70 m: ${compare('sizeM', 70)}`);
check(has(compare('sizeM', 121), '40-storey'), `121 m: ${compare('sizeM', 121)}`);
check(has(compare('sizeM', 100), 'football'), 'a 100 m thing keeps the football field');

// magnitude bands: Betelgeuse (0.5) is one of the brightest stars; Polaris (2.0) an ordinary one
check(compare('magnitude', 0.5) === 'as bright as the brightest stars', `mag 0.5 is a first-magnitude star (${compare('magnitude', 0.5)})`);
check(compare('magnitude', 2.0) === 'as bright as an ordinary star' && compare('magnitude', 13.4).startsWith('too faint'), 'mag 2 is ordinary, mag 13 needs a telescope');

// --- "Fly to it" is main.js's flight, not a second one -----------------------------------------
// The card flew to a record's TRUE position. Every planet but the stage world is drawn nearer than
// it is, so Mars's own "Fly to it" arrived 1.8 au past the disc, looking at nothing -- found on
// 2026-09-16 by pressing it. The card now hands the record to ctx.flyToRecord, which knows.
{
  const marsRec = { id: 'mars', name: 'Mars', klass: 'world', layer: 'worlds', meta: {} };
  const calls = [];
  const rigCalls = [];
  const ctxMain = {
    flyToRecord: (record, ms) => calls.push([record.id, ms]),
    cameraRig: { flyTo: (o) => rigCalls.push(o), follow: () => {} },
    stage: { toScene: () => ({ length: () => 1 }) },
  };
  flyTo(marsRec, ctxMain, { ok: true, posKm: { x: 1, y: 0, z: 0 }, frame: 'sun-inertial' });
  check(calls.length === 1 && calls[0][0] === 'mars', `the card's Fly to it hands Mars to ctx.flyToRecord (${JSON.stringify(calls)})`);
  check(rigCalls.length === 0, 'and does not also fly the camera itself to the true position');
  // Without main.js (a test, an embed) the old flight still works for things nothing moves.
  const rig2 = [];
  flyTo({ id: 'iss', klass: 'station' }, { cameraRig: { flyTo: (o) => rig2.push(o), follow: () => {} }, stage: { toScene: () => ({ length: () => 6.8 }) } },
    { ok: true, posKm: { x: 6800, y: 0, z: 0 }, frame: 'earth-inertial' });
  check(rig2.length === 1, 'with no ctx.flyToRecord the card still flies on its own');
}

// A CRAFT AT L1 OR L2 IS 1.5 MILLION KM FROM EARTH, WHATEVER ITS DRAWING SAYS.
//
// data/sample.js draws JWST, Gaia and SOHO on Earth's own orbit (construction A), and that stand-in
// sits anything up to ~1.1 million km from the real Earth. So the distance FROM EARTH the card
// computed off the drawing was the construction's error: on 2026-09-21 the JWST card read
// "0.4x the Moon's distance", 0.001 au and 0.009 radio-minutes, directly above a note saying 1.5
// million km. The comparison chip is computed from the same number as these rows, so the rows are
// what is asserted.
{
  const { sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
  const rows = sampleDeepSpace();
  const ctx = { clock: { now: () => Date.UTC(2026, 8, 21) }, worlds: null, selected: () => null };
  const cell = (id, label) => {
    const r = rows.find((x) => x.id === id);
    const hit = r && rightNowFor(r, ctx).find(([k]) => k === label);
    return hit ? hit[1] : null;
  };
  for (const id of ['deep-jwst', 'deep-gaia', 'deep-soho']) {
    const d = cell(id, 'Distance from Earth');
    check(d && /^0\.010? astronomical units$/.test(d), `${id} is about 1.5 million km (0.010 au) from Earth, not "${d}"`);
    const radio = cell(id, 'Radio time each way');
    check(radio && /^0\.08\d? minutes$/.test(radio), `${id} is about 5 radio-seconds away (0.083 minutes), not "${radio}"`);
  }
  // Only Earth-anchored craft: MRO sits on Mars's orbit, where the construction's error is a few
  // per cent of the real distance, and it must still be COMPUTED -- with no Earth position in this
  // harness that is the honest "could not work this out", not a borrowed constant.
  const mro = rows.find((x) => x.id === 'deep-mro');
  check(mro && !(mro.meta && 'earthRangeKm' in mro.meta), 'a Mars-anchored craft carries no fixed Earth range');
  check(cell('deep-mro', 'Distance from Earth') !== '0.010 astronomical units', 'MRO is not given the L2 distance');
}

// WHAT THE FIRST SENTENCE CLAIMS ABOUT AN ORBIT. Read off the live site, 2026-09-21: "Ceres is a
// near-Earth object" -- Ceres's perihelion is 2.55 au, and the record said `neo: false` -- and
// "Hale-Bopp ... closest to the Sun on Fri 28 Mar", which was 1997 and read as next March.
{
  const { sampleAsteroids } = await import(join(JS, 'data/sample.js'));
  const now = Date.UTC(2026, 8, 21);
  const ctx = { clock: { now: () => now }, worlds: null, selected: () => null };
  const m = { ok: true, tMs: now, altKm: null, distSunKm: null, distEarthKm: null, speedKmh: null };
  for (const r of sampleAsteroids()) {
    const said = firstSentence(r, ctx, m, { state: 'none' });
    const text = Array.isArray(said) ? said.join(' ') : String(said);
    if (r.meta.neo === false) check(!/near-Earth/.test(text) && /main belt/.test(text), `${r.name} (q ${r.meta.qAu} au) is not a near-Earth object: "${text}"`);
    else check(/near-Earth/.test(text), `${r.name} is a near-Earth object and should say so: "${text}"`);
  }
  const comet = (ms) => ({ id: 'c', name: 'C/TEST', klass: 'comet', frame: 'sun-inertial', meta: { perihelionMs: ms } });
  const far = String(firstSentence(comet(Date.UTC(1997, 2, 28, 12)), ctx, m, { state: 'none' }));
  check(/1997/.test(far), `a perihelion 29 years ago must carry its year: "${far}"`);
  const near = String(firstSentence(comet(Date.UTC(2026, 10, 2, 12)), ctx, m, { state: 'none' }));
  check(!/2026/.test(near) && /Nov/.test(near), `a perihelion six weeks out keeps the short form: "${near}"`);
}

if (problems.length) {
  console.log(`cards copy: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('cards copy ok: every class says what it is drawn as, a GP card names its element age, and no chip lies below a kilometre');
