// What a card says about its own drawing, its position's age, and its comparisons -- the small
// lies the 2026-09-08 review measured, each now asserted so it cannot come back.
//
//   node tests/test_cards_copy.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { drawingLine, classLine } = await import(join(JS, 'ui/cards.js'));
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
check(has(drawingLine(geo), 'communications satellite') && has(drawingLine(geo), 'not this exact one'), `a class default admits it: ${drawingLine(geo)}`);
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

if (problems.length) {
  console.log(`cards copy: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('cards copy ok: every class says what it is drawn as, a GP card names its element age, and no chip lies below a kilometre');
