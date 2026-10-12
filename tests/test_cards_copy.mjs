// What a card says about its own drawing, its position's age, and its comparisons -- the small
// lies the 2026-09-08 review measured, each now asserted so it cannot come back.
//
//   node tests/test_cards_copy.mjs
import { readFileSync } from 'node:fs';
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
check(has(drawingLine(dso), 'soft glow') && has(drawingLine(dso), 'true shape is not drawn'), `a deep-sky object says it is a soft glow, not its shape: ${drawingLine(dso)}`);
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
// data/sample.js draws JWST and SOHO on Earth's own orbit (construction A), and that stand-in
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
  // Gaia was the third until 2026-09-22: it left L2 in March 2025 (Horizons -139479), and is now
  // drawn on its own orbit round the Sun, so it must NOT be given the L2 distance.
  for (const id of ['deep-jwst', 'deep-soho']) {
    const d = cell(id, 'Distance from Earth');
    check(d && /^0\.010? astronomical units$/.test(d), `${id} is about 1.5 million km (0.010 au) from Earth, not "${d}"`);
    const radio = cell(id, 'Radio time each way');
    check(radio && /^0\.08\d? minutes$/.test(radio), `${id} is about 5 radio-seconds away (0.083 minutes), not "${radio}"`);
  }
  // Only Earth-anchored craft: MRO is drawn from Mars (construction D) and its distance must still
  // be COMPUTED, never a borrowed constant.
  const mro = rows.find((x) => x.id === 'deep-mro');
  check(mro && !(mro.meta && 'earthRangeKm' in mro.meta), 'a craft round Mars carries no fixed Earth range');
  check(cell('deep-mro', 'Distance from Earth') !== '0.010 astronomical units', 'MRO is not given the L2 distance');
  const gaia = rows.find((x) => x.id === 'deep-gaia');
  check(gaia && !(gaia.meta && 'earthRangeKm' in gaia.meta), 'Gaia, off L2 since 2025, carries no L2 range');
  check(cell('deep-gaia', 'Distance from Earth') !== '0.010 astronomical units', 'Gaia is not given the L2 distance');
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

// READ OFF THE LIVE SITE, 2026-09-22, ONE CARD AT A TIME: sentences that were grammatical nonsense,
// wrong about a colour, or measuring a thing against itself.
{
  const now = Date.UTC(2026, 8, 22);
  const ctx = { clock: { now: () => now }, worlds: null, selected: () => null, observer: { latRad: 0.71, lonRad: -1.29 } };
  const m0 = { ok: true, tMs: now, altKm: null, distSunKm: null, distEarthKm: null, speedKmh: null };
  const text = (x) => (Array.isArray(x) ? x.join(' ') : String(x));

  // "Arcturus is ... a orange star"
  const star = (name, spect) => ({ id: name, name, klass: 'star', frame: 'sun-inertial', meta: { spect, distLy: 36.7, lum: 116 } });
  check(/an orange star/.test(text(firstSentence(star('Arcturus', 'K2IIIp'), ctx, m0, { state: 'none' }))), 'Arcturus is an orange star, with an n');
  check(/a white star/.test(text(firstSentence(star('Vega', 'A0Vvar'), ctx, m0, { state: 'none' }))), 'and Vega is still a white star');

  // "Proxima Centauri is a star 4.23 light-years away, one of the nearest there are, a red star,
  // the light you see left it 4 years ago": "star" twice, and two sentences joined by a comma.
  // Read on the "To the edge" trip card. The colour is in the lead now; the light is a participle.
  const proxima = text(firstSentence({ id: 'hip-70890', name: 'Proxima Centauri', klass: 'star', frame: 'sun-inertial', meta: { spect: 'M5.5Ve', distLy: 4.23 } }, ctx, m0, { state: 'none' }));
  check(proxima === 'Proxima Centauri is a red star 4.23 light-years away, one of the nearest there are, seen as it was 4 years ago.', `Proxima's sentence is one sentence: "${proxima}"`);
  // "Checkmark Nebula is a h ii region nebula": the type was lowered wholesale and the article
  // did not know an initialism is said by its letters. And "the large magellanic cloud".
  const m17 = text(firstSentence({ id: 'dso-m17', name: 'Checkmark Nebula', klass: 'dso', frame: 'sun-inertial', meta: { distLy: 5500, distLyLow: 5000, distLyHigh: 6000, typeText: 'H II region nebula with cluster' } }, ctx, m0, { state: 'none' }));
  check(/is an H II region nebula with cluster/.test(m17), `an H II region keeps its capitals and takes "an": "${m17}"`);
  const tarantula = text(firstSentence({ id: 'dso-tarantula-nebula', name: 'Tarantula Nebula', klass: 'dso', frame: 'sun-inertial', meta: { distLy: 160000, typeText: 'emission nebula in the Large Magellanic Cloud' } }, ctx, m0, { state: 'none' }));
  check(/in the Large Magellanic Cloud/.test(tarantula), `a proper name inside a type keeps its capitals: "${tarantula}"`);
  const barred = text(firstSentence({ id: 'dso-m95', name: 'M95', klass: 'dso', frame: 'sun-inertial', meta: { distLy: 33000000, typeText: 'Barred Spiral galaxy' } }, ctx, m0, { state: 'none' }));
  check(/is a barred spiral galaxy/.test(barred), `ordinary type words are still lowered: "${barred}"`);
  // "about 131 391 light-years across": an angle times a distance, printed to six figures.
  const big = text(firstSentence({ id: 'dso-m31', name: 'Andromeda Galaxy', klass: 'dso', frame: 'sun-inertial', meta: { distLy: 2540000, sizeLy: 131391.3, typeText: 'Spiral galaxy' } }, ctx, m0, { state: 'none' }));
  check(/about 130\u00a0?\s?000 light-years across/.test(big.replace(/\u202f/g, ' ')), `a size is given to two figures: "${big}"`);
  const home = text(firstSentence({ id: 'dso-milky-way', name: 'The Milky Way', klass: 'dso', frame: 'sun-inertial', meta: { home: true, distLy: 26582, sizeLy: 87400, con: 'Sagittarius', typeText: 'Barred spiral galaxy' } }, ctx, m0, { state: 'none' }));
  check(!/seen as it was/.test(home), `the galaxy we are inside is not "seen as it was" anything: "${home}"`);
  // "a radio message takes 1431 minutes each way": Voyager 1, a day away. Hours past two hours.
  const voyager = text(firstSentence({ id: 'deep-voyager-1', name: 'Voyager 1', klass: 'probe', frame: 'sun-inertial', meta: {} }, ctx, { ...m0, lightMinutes: 1431, distSunKm: 172 * 149597870.7 }, { state: 'none' }));
  check(/takes 23\.9 hours each way/.test(voyager) && !/1431/.test(voyager.replace(/\s/g, '')), `a day's radio time is said in hours: "${voyager}"`);
  const mars = text(firstSentence({ id: 'deep-mro', name: 'MRO', klass: 'probe', frame: 'sun-inertial', meta: {} }, ctx, { ...m0, lightMinutes: 12.5, distSunKm: 1.5 * 149597870.7 }, { state: 'none' }));
  check(/takes 12\.5 minutes each way/.test(mars), `twelve minutes is still minutes: "${mars}"`);
  // A craft round another world says which world, and a radio time under a minute is said in
  // seconds: LRO's card read "out in the solar system" and "0.022 minutes each way" (2026-09-22).
  const lro = text(firstSentence({ id: 'deep-lro', name: 'Lunar Reconnaissance Orbiter', klass: 'probe', frame: 'moon-inertial', meta: { orbits: 'moon' } },
    ctx, { ...m0, lightMinutes: 0.0215, distSunKm: 149597870.7, worldId: 'moon' }, { state: 'none' }));
  check(/circling the Moon/.test(lro) && !/out in the solar system/.test(lro), `LRO circles the Moon: "${lro}"`);
  check(/takes 1\.29 seconds each way/.test(lro) && !/minutes/.test(lro), `and its radio time is in seconds: "${lro}"`);
  const mro2 = text(firstSentence({ id: 'deep-mro', name: 'MRO', klass: 'probe', frame: 'mars-inertial', meta: { orbits: 'mars' } },
    ctx, { ...m0, lightMinutes: 14.3, distSunKm: 1.5 * 149597870.7, worldId: 'mars' }, { state: 'none' }));
  check(/circling Mars/.test(mro2), `MRO circles Mars: "${mro2}"`);
  // One limit for "can I see it" (2026-09-22): the chip said faint at 6.5 while the sky line said visible.
  {
    const { compare, COPY: C, NAKED_EYE_LIMIT } = await import(join(ROOT, 'site/js/copy/en.js'));
    check(NAKED_EYE_LIMIT === 6.5, 'the naked-eye limit is 6.5');
    check(compare('magnitude', 6.5) === 'just visible from a dark place' && compare('magnitude', 6.6) === 'too faint to see without a telescope',
      `the chip turns at the same limit (6.5: "${compare('magnitude', 6.5)}", 6.6: "${compare('magnitude', 6.6)}")`);
    check(!!C.sky.nakedEye, 'the sky line exists');
  }
  const m31 = text(firstSentence({ id: 'dso-m31', name: 'Andromeda Galaxy', klass: 'dso', frame: 'sun-inertial', meta: { distLy: 2540000, typeText: 'spiral galaxy' } }, ctx, m0, { state: 'none' }));
  check(!/the light you see/.test(m31) && /seen as it was 2\.54 million years ago/.test(m31), `a deep-sky sentence hangs the light's age off itself: "${m31}"`);

  // Capella and Dubhe: HYG gives the companion's type for both; the shipped data carries SIMBAD's
  const { readFileSync } = await import('node:fs');
  const rows = JSON.parse(readFileSync(join(ROOT, 'site/data/stars3d.names.json'), 'utf8')).rows;
  const byHip = (hip) => rows.find((r) => r[4] === hip);
  check(byHip(24608) && /^G/.test(byHip(24608)[5]), `Capella's type is a G giant, not ${byHip(24608) && byHip(24608)[5]}`);
  check(byHip(54061) && /^K/.test(byHip(54061)[5]), `Dubhe's type is a K giant, not ${byHip(54061) && byHip(54061)[5]}`);
  check(/a yellow star/.test(text(firstSentence(star('Capella', byHip(24608)[5]), ctx, m0, { state: 'none' }))), 'Capella is described as yellow');

  // The Sun, Earth and the Moon, against themselves
  const { worldRecords } = await import(join(JS, 'scene/worlds.js'));
  const w = (id) => worldRecords().find((r) => r.id === id);
  const sunSays = text(firstSentence(w('sun'), ctx, m0, { state: 'none' }));
  check(/the star at the centre/.test(sunSays) && !/is a world/.test(sunSays), `the Sun is a star, not a world: "${sunSays}"`);
  check(!rightNowFor(w('sun'), ctx).some(([k]) => k === 'Distance from the Sun'), 'the Sun has no distance from the Sun');
  const earthRows = rightNowFor(w('earth'), ctx).map(([k]) => k);
  check(!earthRows.includes('Distance from Earth') && !earthRows.includes('Radio time each way'), `Earth is not measured from Earth: ${earthRows}`);
  const moonSays = text(firstSentence(w('moon'), ctx, { ...m0, distEarthKm: 392400 }, { state: 'none' }));
  check(!/Moon's distance/.test(moonSays) && /392\s400 km away/.test(moonSays), `the Moon is not 1.02x the Moon's distance: "${moonSays}"`);

  // Goldstone stands a kilometre up, on the ground
  const { handKeptSites } = await import(join(JS, 'data/sample.js'));
  const dss14 = handKeptSites().find((r) => /DSS-14/.test(r.name));
  const dssRows = dss14 ? rightNowFor(dss14, ctx).map(([k]) => k) : null;
  check(dssRows && !dssRows.includes('Height above the ground'), `a dish on the ground has no height above it: ${dssRows}`);

  // A rocket on its pad four days before launch does not pass over anything
  const launch = (t0) => ({ id: 'l', name: 'Long March 8A', klass: 'rocket', propagator: 'ascent', frame: 'earth-fixed', cls: 'illustrative', meta: {},
    ascent: { t0Ms: t0, durationS: 540, pad: { latRad: 0.342, lonRad: 1.936, altKm: 0 }, padLatDeg: 19.6, padLonDeg: 110.95, targetAltKm: 500, targetInclRad: 0.72, orbitAbbrev: 'LEO', orbitClass: 'LEO', azimuthSign: 1 } });
  const onPad = rightNowFor(launch(now + 4 * 86400e3), ctx).map(([k]) => k);
  check(onPad.length === 1 && onPad[0] === 'Where it stands', `a rocket on its pad only stands there: ${onPad}`);
  const { seeItLine } = await import(join(JS, 'ui/cards.js'));
  const padLine = seeItLine(launch(now + 4 * 86400e3), ctx, { ...m0, frame: 'earth-fixed' }, { state: 'na' });
  check(/stands on the ground/.test(padLine), `a rocket on its pad has nothing to look up for yet: "${padLine}"`);
  const flying = rightNowFor(launch(now - 200e3), ctx).map(([k]) => k);
  check(flying.includes('Height above the ground'), `two hundred seconds after lift-off it has a height again: ${flying}`);
}

// "SL-8 R/B is a rocket launch." -- a spent stage from the 1970s, one of the brightest objects in the
// visual layer, described with the upcoming-launch template. A launch has an ascent block; a stage
// in orbit is an SGP4 record, and says what it is.
{
  const now = Date.UTC(2026, 8, 22);
  const ctx = { clock: { now: () => now }, worlds: null, selected: () => null };
  const m = { ok: true, tMs: now, altKm: 783, distSunKm: null, distEarthKm: null, speedKmh: 26841 };
  const stage = { id: 'sat-12139', name: 'SL-8 R/B', klass: 'rocket', layer: 'visual', propagator: 'sgp4', frame: 'earth-inertial', meta: { launchYear: 1980 } };
  const said = String(firstSentence(stage, ctx, m, { state: 'none' }));
  check(!/rocket launch/.test(said) && /spent rocket stage/.test(said) && /783 km up/.test(said) && /1980/.test(said), `a stage in orbit is not a launch: "${said}"`);
  const launch = { id: 'l', name: 'Falcon 9', klass: 'rocket', layer: 'launches', propagator: 'ascent', frame: 'earth-fixed', ascent: { t0Ms: now + 86400e3 }, meta: {} };
  check(/rocket launch/.test(String(firstSentence(launch, ctx, { ...m, altKm: 0 }, { state: 'none' }))), 'and a launch is still a launch');
}

// "CREW DRAGON 12 is a satellite going round the Earth", beside the ISS's own height and ground point.
// The kind comes from the model route; "docked at" from distance to a crewed station, right now.
{
  const now = Date.UTC(2026, 8, 22);
  const at = (x) => ({ x, y: 0, z: 0 });
  const iss = { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station', layer: 'stations', propagator: 'static', frame: 'earth-inertial', pos: at(6800), meta: { why: 'people live here', noradId: 25544 } };
  const nauka = { id: 'sat-49044', name: 'ISS (NAUKA)', klass: 'station', layer: 'stations', propagator: 'static', frame: 'earth-inertial', pos: at(6800.05), meta: { noradId: 49044 } };
  const dragon = { id: 'sat-1', name: 'CREW DRAGON 12', klass: 'satellite', layer: 'stations', propagator: 'static', frame: 'earth-inertial', pos: at(6800.3), meta: {} };
  const faraway = { ...dragon, id: 'sat-2', name: 'CREW DRAGON 13', pos: at(8400) };
  const all = [iss, nauka, dragon, faraway];
  const ctx = { clock: { now: () => now }, worlds: null, selected: () => null, records: () => all };
  const m = (r) => ({ ok: true, tMs: now, posKm: r.pos, frame: r.frame, altKm: 431, distSunKm: null, distEarthKm: null, speedKmh: 27500 });
  const said = String(firstSentence(dragon, ctx, m(dragon), { state: 'none' }));
  check(/is a Dragon spacecraft docked at the International Space Station/.test(said), `a Dragon 0.3 km from the ISS is docked at it -- the station, not its Nauka module: "${said}"`);
  const free = String(firstSentence(faraway, ctx, m(faraway), { state: 'none' }));
  check(/is a Dragon spacecraft going round the Earth/.test(free) && !/docked/.test(free), `a Dragon 1 600 km away is not docked: "${free}"`);
  const sl = { id: 'sat-9', name: 'STARLINK-31234', klass: 'satellite', layer: 'starlink-trains', propagator: 'static', frame: 'earth-inertial', pos: at(6930), meta: { launchYear: 2025 } };
  const slSaid = String(firstSentence(sl, { ...ctx, records: () => [sl] }, m(sl), { state: 'none' }));
  check(/is a Starlink V2 Mini going round the Earth/.test(slSaid), `a Starlink says what kind it is: "${slSaid}"`);
  const hst = { id: 'sat-20580', name: 'HST', klass: 'satellite', layer: 'visual', propagator: 'static', frame: 'earth-inertial', pos: at(6850), meta: { noradId: 20580 } };
  const hstSaid = String(firstSentence(hst, { ...ctx, records: () => [hst] }, m(hst), { state: 'none' }));
  check(/Hubble Space Telescope is a space telescope going round the Earth/.test(hstSaid), `Hubble is a space telescope, not a satellite: "${hstSaid}"`);
  const plain = { ...sl, id: 'sat-8', name: 'KNACKSAT-2', layer: 'stations' };
  check(/is a satellite going round the Earth/.test(String(firstSentence(plain, { ...ctx, records: () => [plain] }, m(plain), { state: 'none' }))), 'a CubeSat with no route is still just a satellite');
}

// A record whose klass is not one of COPY.klass -- a typo in a feed or a registry row -- had no
// template, and the card borrowed the satellite template's lead: "WEATHER-BALLOON-1 is a satellite
// going round the Earth" for a thing that is not a satellite and may not even orbit. Never invent.
{
  const now = Date.UTC(2026, 8, 22);
  const ctx = { clock: { now: () => now }, worlds: null, selected: () => null, records: () => [] };
  const m = { ok: true, tMs: now, altKm: 1, distSunKm: null, distEarthKm: null, speedKmh: 1 };
  const mystery = { id: 'x-1', name: 'WEATHER-BALLOON-1', klass: 'balloon', layer: 'misc', meta: {} };
  const said = String(firstSentence(mystery, ctx, m, { state: 'none' }));
  check(!/satellite/.test(said) && !/going round the Earth/.test(said), `an unrecognised klass is not called a satellite: "${said}"`);
  check(/WEATHER-BALLOON-1/.test(said) && /do not know what kind/.test(said), `it says plainly that the kind is not known: "${said}"`);
}

// "Found: 2 016, Transit" (a year printed as a quantity) and "123P/West-Hartley is a comet on a long
// loop around the Sun" (a 7.6-year comet) -- both read off the live site, 2026-09-22.
{
  const now = Date.UTC(2026, 8, 22);
  const ctx = { clock: { now: () => now }, worlds: null, selected: () => null };
  const m = { ok: true, tMs: now, altKm: null, distSunKm: null, distEarthKm: null };
  const planet = { id: 'trappist-1-b', name: 'TRAPPIST-1 b', klass: 'exoplanet', frame: 'sun-inertial', propagator: 'static', pos: { x: 1, y: 0, z: 0 },
    meta: { host: 'TRAPPIST-1', distLy: 40.5, year: 2016, discYear: 2016, method: 'Transit', discMethod: 'Transit' } };
  const found = rightNowFor(planet, ctx).find(([k]) => k === 'Found');
  check(found && /2016/.test(found[1]) && !/2\s016/.test(found[1]), `a discovery year is a year, not a quantity: ${found && found[1]}`);
  const comet = (name, orbitType, years) => ({ id: name, name, klass: 'comet', frame: 'sun-inertial', meta: { orbitType, periodDays: years * 365.25 } });
  const west = String(firstSentence(comet('123P/West-Hartley', 'P', 7.6), ctx, m, { state: 'none' }));
  check(/comes round the Sun every 7\.6/.test(west) && !/long loop/.test(west), `a 7.6-year comet comes round, it is not on a long loop: "${west}"`);
  const hb = String(firstSentence(comet('C/1995 O1 (Hale-Bopp)', 'C', 2400), ctx, m, { state: 'none' }));
  check(/long loop/.test(hb), `Hale-Bopp, 2 400 years, is on a long loop: "${hb}"`);
}

// --- a trip stop's "Shown at" line (spec 0030) -------------------------------------------------
// A named rate is a picture ("ten minutes a second"); any other is the number, grouped the way every
// number on the page is: a narrow no-break space (U+202F, fmt.int, public #211), never a comma.
{
  const { formatRate, formatShownAt } = await import(join(JS, 'copy/en.js'));
  check(formatRate(600) === 'ten minutes a second', `formatRate(600) is the named words: "${formatRate(600)}"`);
  check(formatRate(525600) === 'a day every sixth of a second', `the year trip's rate is named: "${formatRate(525600)}"`);
  check(formatRate(1234) === '1\u202f234 times faster than life', `formatRate(1234) is the generic form, grouped: ${JSON.stringify(formatRate(1234))}`);
  check(!/,/.test(formatRate(123456)), 'a rate is never grouped with a comma');
  check(formatRate(0) === '' && formatRate(NaN) === '', 'no rate, no words');
  const at = Date.parse('2027-08-02T10:07:00Z');
  check(formatShownAt(at, 600) === '2 Aug 2027, 10:07 UTC', `the instant is UTC, to the minute: "${formatShownAt(at, 600)}"`);
  // From an hour a second up, the minutes turn over sixty times a second and the day is the reading.
  check(formatShownAt(at, 3600) === '2 Aug 2027', `at an hour a second, the day alone: "${formatShownAt(at, 3600)}"`);
}

// #279: a card under a stop title that already names its object does not name it twice more.
{
  const { sameName, withoutLeadingName } = await import(join(JS, 'ui/cards.js'));
  check(sameName('The International Space Station', 'International Space Station'), 'a leading "The" still names it');
  check(sameName('Hubble', 'Hubble'), 'an exact title names it');
  check(!sameName('A visit to an older robot', 'Apollo 12 lunar module Intrepid'), 'a title about the stop does not');
  check(!sameName('The first people', 'Apollo 11 lunar module'), 'nor does a title that shares no name');
  check(!sameName('', 'Anything'), 'no title, no match');
  
  const s = withoutLeadingName('International Space Station is a crewed space station in low Earth orbit.', 'International Space Station');
  check(s === 'It is a crewed space station in low Earth orbit.', `the sentence starts "It is": ${s}`);
  const t = withoutLeadingName('The Hubble Space Telescope was launched in 1990.', 'Hubble Space Telescope');
  check(t === 'It was launched in 1990.', `"The X was" becomes "It was": ${t}`);
  const u = withoutLeadingName('Pete Conrad and Alan Bean, November 1969.', 'Apollo 12 lunar module Intrepid');
  check(u === 'Pete Conrad and Alan Bean, November 1969.', 'a sentence that does not open with the name is left alone');
}

// --- the tracked object's tag says the card's honesty line, shorter (spec 0047 req 4) ---------------
// For every class fixture: the tag's line 3 is a prefix of the card's class-and-age line, cut at a
// clause and never past TAG_HONESTY_MAX; and tagLines() hands back exactly that string.
{
  const { shortHonesty, honestyLine: fullLine, tagLines, TAG_HONESTY_MAX } = await import(join(JS, 'ui/cards.js'));
  const tNow = Date.parse('2026-09-08T12:00:00Z');
  const FIXTURES = [
    ['measured', { cls: 'measured', meta: {} }],
    ['inferred, a GP set 19 h old', { cls: 'inferred', epoch: tNow - nineteenH, satrec: {}, meta: {} }],
    ['inferred, no elements', { cls: 'inferred', meta: {} }],
    ['inferred, unknown age', { cls: 'inferred', elements: {}, meta: {} }],
    ['illustrative', { cls: 'illustrative', meta: {} }],
    ['sample, with its why', { cls: 'sample', meta: { why: 'no public feed for this craft' } }],
    ['unknown class', { cls: 'mystery', meta: {} }],
    ['provisional', { cls: 'inferred', epoch: tNow - 3600e3, satrec: {}, meta: { provisional: true } }],
    ['attached', { cls: 'inferred', epoch: tNow - 3600e3, satrec: {}, meta: { attachedToName: 'the ISS' } }],
    ['surveyed split', { cls: 'inferred', meta: { anchorName: 'The Apollo 11 retroreflector', anchorUncertaintyM: 0.4, objectPrecisionM: 20, objectHow: 'photogrammetric' } }],
    ['arc caveat', { cls: 'inferred', epoch: tNow - 400 * 86400e3, elements: {}, meta: { arcEnd: '2018-03-01', orbitCaveat: 'JPL says the orbit may be off by millions of km' } }],
    ['storm', { cls: 'measured', klass: 'storm', meta: { advisoryMs: tNow - 3 * 3600e3 } }],
    ['unplaceable', { cls: 'inferred', meta: { unplaceable: true, whyUnknown: 'nobody tracked it', wouldNeed: 'a radar survey' } }],
  ];
  for (const [name, rec] of FIXTURES) {
    const m = { cls: rec.cls, tMs: tNow };
    const full = fullLine(rec, m);
    const short = shortHonesty(rec, m);
    check(short.length > 0 && full.startsWith(short.replace(/…$/, '')), `${name}: the tag's line is the start of the card's ("${short}" / "${full}")`);
    check(short.length <= TAG_HONESTY_MAX + 1, `${name}: the tag's line is at most ${TAG_HONESTY_MAX} characters (${short.length})`);
    check(!/ — /.test(short), `${name}: cut at the first clause (${short})`);
  }
  const rec = FIXTURES[1][1];
  const lines = tagLines({ ...rec, name: 'X', klass: 'satellite' }, { clock: { now: () => tNow } }, { cls: 'inferred', tMs: tNow, ok: false, frame: 'earth-inertial' });
  check(lines.honesty === shortHonesty(rec, { cls: 'inferred', tMs: tNow }), `tagLines() carries shortHonesty() unchanged (${lines.honesty})`);
  check(/19 hours old/.test(lines.honesty), 'and it keeps the element age');
}

// --- the card view (spec 0061 §4): three numbers per class, from the card's own rows -----------
//
// The card leads with three numbers, and each one is a row the card prints (and the rows are what
// the HUD tag reads), so the three can never be a second sum that disagrees with the rest. A row
// the card does not print is "—" with its caption, never a guess and never left out. The honesty
// line stays at the foot whatever the layout.
{
  const C = await import(join(JS, 'ui/cards.js'));
  const { COPY } = await import(join(JS, 'copy/en.js'));
  const { readFileSync } = await import('node:fs');
  const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
  const { worldRecords, positionOf } = await import(join(JS, 'scene/worlds.js'));
  const { sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
  const MISSING = COPY.card.hero.missing;
  const gp = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
  const [issGp] = parseCelestrakGP(gp, { layer: 'stations', source: 'celestrak-stations' });
  const now = issGp.epoch + 3 * 3600e3;
  const ctx = { clock: { now: () => now }, worlds: { positionOf: (id, t) => positionOf(id, t) }, selected: () => null };
  const m0 = (r) => ({ tMs: now, frame: r.frame, ok: true });
  const words = (r) => C.cardWords(r, ctx);
  // The three for a record: [num, caption] each, and the rows they must have come from.
  const three = (r) => {
    const rows = C.rightNowFor(r, ctx);
    const w = words(r);
    return { rows, heroes: C.heroNumbers(r, { ...m0(r), distSunKm: null }, rows), honesty: w.honesty };
  };
  const fromRow = (rows, label, num) => rows.some(([k, v]) => k === label && String(v).includes(num));
  const R = COPY.card.rows;
  const W = (id) => worldRecords().find((r) => r.id === id);
  const star = { id: 'hip-32349', name: 'Sirius', klass: 'star', layer: 'stars', propagator: 'static', frame: 'sun-inertial', pos: { x: 8.6 * 9.4607e12, y: 0, z: 0 }, cls: 'measured', meta: { hip: '32349', spect: 'A0m...', distLy: 8.6, mag: -1.44, lum: 22.8 } };
  const m42 = { id: 'dso-m42', name: 'Great Orion Nebula', klass: 'dso', layer: 'deep-sky', propagator: 'static', frame: 'sun-inertial', pos: { x: 1344 * 9.4607e12, y: 0, z: 0 }, cls: 'measured', meta: { distLy: 1344, distLyLow: 1324, distLyHigh: 1364, kind: 'nebula', typeText: 'H II region nebula', sizeLy: 35, con: 'Orion', mag: 4 } };
  const voyager = sampleDeepSpace().find((r) => r.id === 'deep-voyager-1');
  const CASES = [
    // [what, record, kind, the row each number must come from, in order]
    ['the ISS (Earth orbiter)', issGp, 'orbiter', [R.altitude, R.speed, R.period]],
    ['Mars (planet)', W('mars'), 'planet', [R.distanceFromSun, R.spin, R.yearLength]],
    ['the Moon', W('moon'), 'moon', [R.altitude, R.speed, R.spin]],
    ['Sirius (star)', star, 'star', [R.distanceFromSun, R.brightness, R.spectralType]],
    ['M42 (deep sky)', m42, 'dso', [R.lightLeft, R.across, R.brightness]],
    ['Voyager 1 (craft beyond Earth)', voyager, 'craft', [R.distanceFromEarth, R.speed, R.launched]],
  ];
  for (const [what, r, kind, labels] of CASES) {
    if (!r) { problems.push(`no record for ${what}`); continue; }
    const { rows, heroes, honesty } = three(r);
    check(C.heroKind(r, m0(r)) === kind, `${what} is a ${kind} card (${C.heroKind(r, m0(r))})`);
    check(heroes.length === 3, `${what}: three numbers, not ${heroes.length}`);
    heroes.forEach((h, i) => {
      check(!h.missing && h.num !== MISSING, `${what}: number ${i + 1} (${labels[i]}) is there: ${JSON.stringify(h)}`);
      check(fromRow(rows, labels[i], h.num), `${what}: "${h.num}" is the card's own "${labels[i]}" row (${JSON.stringify(rows.find(([k]) => k === labels[i]))})`);
      check(typeof h.caption === 'string' && h.caption.length > 0 && h.caption.length <= 18, `${what}: number ${i + 1} has a one-line caption: "${h.caption}"`);
    });
    // The honesty line is still on every card, and the tag's short line is still its first clause.
    check(typeof honesty === 'string' && honesty.length > 0, `${what}: the honesty line stays (${honesty})`);
    check(honesty.startsWith(C.shortHonesty(r, { ...m0(r), cls: r.cls }).replace(/…$/, '')), `${what}: the tag's short line is the start of the card's honesty line`);
  }
  // The units row D draws, from the rows' own units.
  const issHero = three(issGp).heroes;
  check(issHero.map((h) => h.caption).join('|') === 'km up|km/h|min a lap', `the ISS reads "km up", "km/h", "min a lap": ${issHero.map((h) => h.caption)}`);
  const marsHero = three(W('mars')).heroes;
  check(marsHero[0].caption === 'AU from Sun' && /a turn$/.test(marsHero[1].caption) && /a year$/.test(marsHero[2].caption), `Mars reads AU from Sun, a turn, a year: ${marsHero.map((h) => h.caption)}`);
  check(/^24\.6$/.test(marsHero[1].num) && marsHero[2].num === '687', `Mars turns in 24.6 hours and goes round in 687 days: ${marsHero.map((h) => h.num)}`);
  const vHero = three(voyager).heroes;
  check(vHero[2].num === C.heroSplit(three(voyager).rows.find(([k]) => k === R.launched)[1]).num && Number(vHero[2].num.replace(/ /g, '')) > 17000, `Voyager 1's days since launch are counted from 5 September 1977: ${vHero[2].num}`);
  // A missing row is "—" with its caption, never a guess and never a hole in the row of three.
  const bare = { ...star, id: 'hyg-1', meta: { distLy: 30 } };
  const bh = three(bare).heroes;
  check(bh.length === 3 && bh[0].num !== MISSING && bh[1].num === MISSING && bh[2].num === MISSING && bh[1].missing && bh[1].caption === COPY.card.hero.captions.brightness,
    `a star with no magnitude or class keeps three cells, the last two "—": ${JSON.stringify(bh)}`);
  const noLaunch = { ...voyager, meta: { ...voyager.meta, launchDate: undefined } };
  const nl = three(noLaunch).heroes;
  check(nl[2].num === MISSING && nl[2].caption === COPY.card.hero.captions.launched, `a craft with no launch day shows "—" days since launch: ${JSON.stringify(nl[2])}`);
  const lost = C.heroNumbers(issGp, { tMs: now, frame: 'earth-inertial', ok: false }, [[R.altitude, COPY.card.couldNotLook]]);
  check(lost.length === 3 && lost.every((h) => h.num === MISSING), `an orbiter the propagator lost is three "—", not three zeroes: ${lost.map((h) => h.num)}`);
  // One number, not a range or a sentence.
  check(C.heroSplit('27 556 km/h').num === '27 556' && C.heroSplit('magnitude −1.44').num === '−1.44', 'a value splits into its number and unit, a magnitude included');
  check(C.heroSplit('1 324 to 1 364 light-years') === null && C.heroSplit(COPY.card.couldNotLook) === null, 'a range or "could not work this out" is not one number');
  // The microlabel: what and where, four words at most, worked out rather than typed.
  const iss = C.microLabel(issGp, { ...m0(issGp), altKm: 420 });
  check(iss === `${COPY.klass.station} · ${COPY.card.regime.leo}`, `the ISS's microlabel is "${COPY.klass.station} · ${COPY.card.regime.leo}": ${iss}`);
  check(C.microLabel(W('mars'), { ...m0(W('mars')), distSunKm: 1.5 * 149597870.7 }) === `${COPY.card.microKlass.planet} · ${COPY.card.regime.inner}`, 'Mars is a planet in the inner solar system');
  check(C.microLabel(voyager, { ...m0(voyager), distSunKm: 172 * 149597870.7 }).endsWith(COPY.card.regime.beyondNeptune), 'Voyager 1 is beyond Neptune');
  check(C.microLabel(m42, m0(m42)) === 'Nebula · In Orion', `M42 is a nebula in Orion: ${C.microLabel(m42, m0(m42))}`);
  for (const r of [issGp, W('mars'), W('moon'), star, m42, voyager]) {
    const words4 = C.microLabel(r, { ...m0(r), altKm: 420, distSunKm: 1.5e8 }).split(/\s+/).filter((w) => w !== '·').length;
    check(words4 <= 5, `${r.name}'s microlabel is short (${words4} words)`);
  }
}

// --- the card view's rows that open in place, and its action row ------------------------------
{
  // A DOM small enough to press a button in. Nothing here lays anything out.
  class N {
    constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.hidden = false; this.className = ''; this.id = ''; this._t = ''; this.listeners = {}; this.style = {};
      const self = this; this.classList = { add: (...c) => { self.className = [...new Set([...self.className.split(/\s+/).filter(Boolean), ...c])].join(' '); }, contains: (c) => self.className.split(/\s+/).includes(c) }; }
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; }
    set textContent(v) { this.children = []; this._t = String(v); }
    get textContent() { return this._t + this.children.map((c) => c.textContent).join(''); }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
    click() { if (this.disabled) return; for (const f of this.listeners.click || []) f({ target: this }); }
    all() { return [this, ...this.children.flatMap((c) => c.all())]; }
  }
  const before = globalThis.document;
  globalThis.document = { createElement: (t) => new N(t), createElementNS: (_n, t) => new N(t) };
  const C = await import(join(JS, 'ui/cards.js'));
  const { COPY } = await import(join(JS, 'copy/en.js'));
  const panel = new N('div');
  const seen = [];
  const row = C.disclosure('about', COPY.card.sections.about, null, panel, false, (on) => seen.push(on));
  const head = row.children[0];
  check(head.tagName === 'BUTTON' && head.type === 'button', 'a section row is a real button');
  check(head.getAttribute('aria-expanded') === 'false' && panel.hidden === true, 'it starts shut: aria-expanded="false" and its panel hidden');
  check(head.getAttribute('aria-controls') === panel.id && panel.getAttribute('aria-labelledby') === head.id && panel.getAttribute('role') === 'region', 'the button controls its panel, and the panel is a region named by the button');
  head.click();
  check(head.getAttribute('aria-expanded') === 'true' && panel.hidden === false && seen.join() === 'true', `pressed, it opens in place and says so (${head.getAttribute('aria-expanded')}, hidden ${panel.hidden})`);
  head.click();
  check(head.getAttribute('aria-expanded') === 'false' && panel.hidden === true && seen.join() === 'true,false', 'pressed again, it shuts');
  const reopened = C.disclosure('about', COPY.card.sections.about, COPY.card.sections.placeGuessed, new N('div'), true);
  check(reopened.children[0].getAttribute('aria-expanded') === 'true' && reopened.children[0].children[1].textContent === COPY.card.sections.placeGuessed, 'a section the visitor left open is built open, with its hint');
  // Icons are Lucide, drawn the guide's way (docs/ui-guide.md §3.16).
  const svg = C.icon('crosshair');
  check(svg.getAttribute('viewBox') === '0 0 24 24' && svg.getAttribute('stroke-width') === '1.75' && svg.getAttribute('stroke-linecap') === 'round' && svg.getAttribute('stroke-linejoin') === 'round' && svg.getAttribute('aria-hidden') === 'true', 'an icon is a 24 box, stroke 1.75, round, hidden from a screen reader');
  // The action row: Follow and Ride along where the camera may ride, else Fly to it and See it;
  // Postcard and Share always; exactly one primary.
  const A = COPY.card.actions;
  const orbiting = { id: 'sat-25544', klass: 'station', propagator: 'sgp4', frame: 'earth-inertial', meta: {} };
  const mOk = { ok: true, frame: 'earth-inertial', tMs: Date.UTC(2026, 9, 1) };
  const ride = { rideAlong: () => true };
  const labels = (bs) => bs.map((b) => b.children[1].textContent).join();
  const primaries = (bs) => bs.filter((b) => b.className.split(' ').includes('sr-act--primary')).length;
  const a1 = C.actionButtons(orbiting, ride, mOk);
  check(labels(a1) === [A.follow, A.ride, A.postcard, A.share].join() && primaries(a1) === 1 && a1[0].className.includes('primary'), `an Earth orbiter: Follow (the one primary), Ride along, Postcard, Share: ${labels(a1)}`);
  const a2 = C.actionButtons({ id: 'mars', klass: 'world', propagator: 'body', frame: 'sun-inertial', meta: {} }, ride, { ok: true, frame: 'sun-inertial' });
  check(labels(a2) === [A.flyTo, A.seeShort, A.postcard, A.share].join() && primaries(a2) === 1, `a planet: Fly to it, See it, Postcard, Share: ${labels(a2)}`);
  const a3 = C.actionButtons({ id: 'hip-1', klass: 'star', propagator: 'static', frame: 'sun-inertial', meta: {} }, ride, { ok: true, frame: 'sun-inertial' });
  check(a3[1].disabled !== true, 'See it is on for a star: the sky from your place shows it');
  const a4 = C.actionButtons({ id: 'deep-voyager-1', klass: 'probe', propagator: 'sampled', frame: 'sun-inertial', meta: {} }, ride, { ok: true, frame: 'sun-inertial' });
  check(a4[1].disabled === true && a4[1].title === COPY.sky.notVisibleFromGround, `See it is off for a craft beyond Earth, and its tooltip says why: ${a4[1].title}`);
  // The Earth's card carries the legend of the map over the globe (internal #386 item 1).
  {
    const earth = { id: 'earth', klass: 'world', meta: {} };
    const shown = { id: 'sea-temperature', status: 'shown', title: 'Sea surface temperature', what: 'The temperature of the sea.', cls: 'analysed', rule: 'daily', dateWords: '5 October 2026', credit: 'GHRSST', legend: { unit: '°C', low: '0', high: '32', stops: ['#2b001a', '#6b0200'] } };
    let st = shown;
    const octx = { overlayState: () => st };
    const box = C.overlayBlock(earth, octx);
    check(box && box.hidden === false && box.children[0].children[0].textContent === 'Sea surface temperature' && box.children[0].children[3].textContent === '32 °C', `with a map up, the Earth's card shows its legend (${box && box.children[0].children[0].textContent})`);
    check(/The picture is of 5 October 2026\./.test(box.children[1].textContent) && /GHRSST/.test(box.children[1].textContent), `and its sentence: the day and whose data (${box.children[1].textContent})`);
    st = { id: null, status: 'off' };
    const off = C.overlayBlock(earth, octx);
    check(off && off.hidden === true && off.children[1].textContent === '', 'with none, the block is there and hidden, for the next one to fill');
    st = { id: 'wind', kind: 'wind', status: 'shown', cls: 'modelled', date: Date.UTC(2026, 9, 7, 12), speedup: 86400, meanSpeed: 7.2, maxSpeed: 28, still: false, credit: 'NOAA', legend: { unit: 'm/s', low: '0', high: '25', stops: ['#5E78C8', '#FFD166'] } };
    const wind = C.overlayBlock(earth, octx);
    check(wind.children[0].children[0].textContent === 'Wind' && /a day of wind in a second/.test(wind.children[1].textContent), 'the wind is keyed the same way');
    check(C.overlayBlock({ id: 'mars', klass: 'world', meta: {} }, octx) === null && C.overlayBlock(earth, {}) === null, 'no other card has it');
    check(/addEventListener\('sr:overlay'/.test(readFileSync(join(JS, 'ui/cards.js'), 'utf8')), 'and it is repainted when the overlay changes');
  }
  // A rock on its ellipse close to the Earth says its place is approximate (internal #298).
  {
    const rock = { id: 'asteroid-x', name: '2026 XX', klass: 'asteroid', propagator: 'kepler', frame: 'sun-inertial', cls: 'inferred', meta: {} };
    const close = { ok: true, frame: 'sun-inertial', tMs: Date.UTC(2026, 9, 7), distEarthKm: 0.01 * 149597870.7 };
    const far = { ...close, distEarthKm: 0.4 * 149597870.7 };
    check(C.nearEarthOnEllipse(rock, close) === true && C.nearEarthOnEllipse(rock, far) === false && C.NEAR_EARTH_KM === 0.05 * 149597870.7, 'inside 0.05 au of the Earth a two-body rock is flagged, and not beyond');
    check(C.honestyClause(rock, close) === COPY.cls.nearEarthApprox && /approximate/.test(COPY.cls.nearEarthApprox) && /Earth’s pull/.test(COPY.cls.nearEarthApprox) && C.honestyClause(rock, far) !== COPY.cls.nearEarthApprox, `its card says so, and why: ${C.honestyClause(rock, close)}`);
    check(C.nearEarthOnEllipse({ ...rock, klass: 'probe' }, close) === false && C.nearEarthOnEllipse({ ...rock, propagator: 'sampled' }, close) === false && C.nearEarthOnEllipse({ ...rock, frame: 'earth-inertial' }, close) === false, 'not a spacecraft, not a sampled track, not an Earth orbit');
    const { EPHEMERIS_OF } = await import(join(JS, 'propagate/index.js'));
    EPHEMERIS_OF.set('asteroid-x', (tMs) => (tMs > Date.UTC(2026, 0, 1) ? { x: 1, y: 2, z: 3, frame: 'sun-inertial' } : null));
    check(C.nearEarthOnEllipse(rock, close) === false && C.nearEarthOnEllipse(rock, { ...close, tMs: Date.UTC(2020, 0, 1) }) === true, 'a rock drawn from its own path file at that moment is not flagged: the pull is in the path');
    EPHEMERIS_OF.delete('asteroid-x');
  }
  // An ended craft after its end (internal #424): Fly to it is off and says the day; the row is "Ended".
  {
    const cassini = { id: 'deep-cassini', name: 'Cassini', klass: 'probe', propagator: 'sampled', frame: 'sun-inertial', samples: [], meta: { endDate: '2017-09-15' } };
    const after = { ok: false, frame: 'sun-inertial', tMs: Date.UTC(2026, 9, 7) };
    const a5 = C.actionButtons(cassini, ride, after);
    check(a5[0].disabled === true && a5[0].title === 'It ended on 15 September 2017. Choose an event of its mission to go there', `an ended craft: Fly to it is off and says when it ended (${a5[0].title})`);
    check(C.endedWords(cassini, after) === '15 September 2017' && C.endedWords(cassini, { ok: true, tMs: Date.UTC(2010, 0, 1) }) === null && C.endedWords(cassini, { ok: false, tMs: Date.UTC(1990, 0, 1) }) === null, 'ended is said only after the end, and never while the craft is drawn');
    const rows = C.rightNowFor(cassini, { clock: { now: () => Date.UTC(2026, 9, 7) } });
    check(rows.length === 1 && rows[0][0] === COPY.card.rows.ended && rows[0][1] === '15 September 2017', `its rows are one line, Ended and the day, not "could not work this out" (${JSON.stringify(rows)})`);
    check(/ended || pathEnds \? \[\] : heroNumbers\(record, m, rows\)/.test(readFileSync(join(JS, 'ui/cards.js'), 'utf8')) && COPY.card.endedLine.includes('{date}'), 'and one line stands where its three numbers would be dashes');
    const a6 = C.actionButtons({ id: 'x', klass: 'probe', propagator: 'sampled', frame: 'sun-inertial', meta: {} }, ride, { ok: false, frame: 'sun-inertial' });
    check(a6[0].disabled === true && a6[0].title === A.flyNowhere, 'any other switched-off Fly to it says why');
  }
  // Stardust's path stops 13 days before its mission (internal #478): in the gap the card says so, not "could not work this out".
  {
    const sd = { id: 'deep-stardust', name: 'Stardust', klass: 'probe', propagator: 'sampled', frame: 'sun-inertial', samples: [], meta: { endDate: '2011-03-25', pathEndDate: '2011-03-12' } };
    const gap = { ok: false, frame: 'sun-inertial', tMs: Date.UTC(2011, 2, 18) };
    check(C.pathEndedWords(sd, gap) === '12 March 2011' && C.endedWords(sd, gap) === null, 'between the path\'s end and the mission\'s: the path has ended, the mission has not');
    check(C.pathEndedWords(sd, { ok: true, tMs: Date.UTC(2011, 2, 18) }) === null && C.pathEndedWords(sd, { ok: false, tMs: Date.UTC(2011, 2, 1) }) === null && C.pathEndedWords(sd, { ok: false, tMs: Date.UTC(2026, 9, 7) }) === null, 'not while it is drawn, not before the path ends, not after the mission (that is "Ended")');
    const rows = C.rightNowFor(sd, { clock: { now: () => gap.tMs } });
    check(rows.length === 1 && rows[0][0] === COPY.card.rows.pathEnds && rows[0][1] === '12 March 2011', `its row is "Its path ends" and the day (${JSON.stringify(rows)})`);
    const aa = C.actionButtons(sd, ride, gap);
    check(aa[0].disabled === true && /^Its path ends on 12 March 2011/.test(aa[0].title), `Fly to it is off and says why (${aa[0].title})`);
  }
  check(a1.every((b) => b.title && b.children[0].getAttribute('aria-hidden') === 'true'), 'every action has its words in a tooltip and an icon hidden from a screen reader');
  // The flood light (internal #272): one quiet switch on the card of anything drawn as a model,
  // its note on screen for as long as the lamp is, remembered for the session.
  {
    const F = COPY.flood;
    const store = new Map();
    const hadStore = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) } });
    const calls = [];
    const fctx = { setFloodLight: (on) => { calls.push(on); return on; } };
    check(C.offersFlood(orbiting) && C.offersFlood({ id: 'deep-dawn', klass: 'probe', meta: {} }) && C.offersFlood({ id: 'apollo-11', klass: 'site', meta: {} }), 'a station, a probe and a lander on the Moon offer the lamp');
    check(!C.offersFlood({ id: 'mars', klass: 'world', meta: {} }) && !C.offersFlood({ id: 'hip-1', klass: 'star', meta: {} }) && !C.offersFlood(null), 'a planet and a star do not: their light is not a model\'s');
    check(C.floodControls({ id: 'mars', klass: 'world', meta: {} }, fctx).length === 0, 'and their cards carry no switch');
    const [btn, note] = C.floodControls(orbiting, fctx);
    check(btn.tagName === 'BUTTON' && btn.type === 'button' && btn.textContent === F.on && btn.getAttribute('aria-pressed') === 'false' && btn.title === F.title, `the switch starts off and says "${F.on}"`);
    check(note.hidden === true && calls.length === 0, 'in the real light there is no note and nothing is switched');
    btn.click();
    check(btn.getAttribute('aria-pressed') === 'true' && btn.textContent === F.off && note.hidden === false && note.textContent === F.note && calls.join() === 'true', 'pressed, the lamp is on and the card says it is not the real light');
    check(store.get('sr.flood') === '1' && C.floodWantedNow() === true, 'and the session remembers');
    const [btn2, note2] = C.floodControls({ id: 'deep-dawn', klass: 'probe', meta: {} }, fctx);
    check(btn2.getAttribute('aria-pressed') === 'true' && note2.hidden === false && calls.join() === 'true,true', 'the next card opens lit, with its note');
    btn2.click();
    check(btn2.getAttribute('aria-pressed') === 'false' && note2.hidden === true && calls.join() === 'true,true,false' && store.get('sr.flood') === '0', 'pressed again, the real light is back');
    check(F.on.split(' ').length <= 2 && F.off.split(' ').length <= 2 && /not the real light/.test(F.note) && F.note.length <= 40, 'two words a button, and a note of one line that says whose light it is');
    if (hadStore) Object.defineProperty(globalThis, 'sessionStorage', hadStore); else delete globalThis.sessionStorage;
  }
  globalThis.document = before;
}

if (problems.length) {
  console.log(`cards copy: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('cards copy ok: every class says what it is drawn as, a GP card names its element age, and no chip lies below a kilometre');
