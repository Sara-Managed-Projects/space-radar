// tests/test_tracked.mjs -- A9, tracked objects placed by their own elements (data/tracked.js; release 1.7.7, internal I#1069).
//
// The set harvest/tracked.py builds (tests/helpers/build_tile_fixtures.py, from a cut of 142 real CelesTrak element sets
// of 2026-11-02: debris and rocket bodies from low orbit to beyond geostationary) is read by the page and held to:
//   1. THE ELEMENTS SURVIVE THE QUANTISING. Every object is propagated by SGP4 from CelesTrak's own numbers and from the
//      tile's, at the epoch and for a week after it; the two places are within 10 m (the epoch is kept to the microsecond,
//      the mean motion as a double, the angles to under a millionth of a degree).
//   2. IT REACHES THE WORKER. The record is the shape propagate/worker.js slim() sends (an `omm`, no satrec), and the
//      worker's batch gives the same numbers as the page's sgp4().
//   3. THE MERGE. A record the satcat file lists keeps its name, owner and launch and takes the element set's place
//      (propagator sgp4, class measured or inferred by the epoch's age, no longer illustrative); one with no element
//      set stays illustrative; a piece in the tiles and not in the file is kept.
//   4. THE HONEST WORDS. With tiles the panel says how many dots sit where their element sets put them; without, it
//      says every place is made up. The card's class line reads the omm.
//   5. THE DEVICE. A latched device loads level 0 alone; data-saver none (the layer stays illustrative); a missing set
//      is null; the debris layer's loader asks the tiles, never at boot (the layer is on-demand).
//
//   node tests/test_tracked.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const dir = mkdtempSync(join(tmpdir(), 'trackedfix-'));
execFileSync('python3', [join(ROOT, 'tests/helpers/build_tile_fixtures.py'), dir], { stdio: ['ignore', 'inherit', 'inherit'] });
const expect = JSON.parse(readFileSync(join(dir, 'expect.json'), 'utf8'));
const satellite = await import(join(ROOT, 'site/vendor/satellite.esm.js'));
const TC = await import(join(JS, 'data/tilecloud.js'));
const TR = await import(join(JS, 'data/tracked.js'));
const SC = await import(join(JS, 'data/satcat.js'));
const DB = await import(join(JS, 'ui/debris.js'));
const W = await import(join(JS, 'propagate/worker.js'));
const { sgp4 } = await import(join(JS, 'propagate/sgp4.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));

const bytes = (rel) => { const b = readFileSync(join(dir, rel)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const transport = (log) => (url, reload) => {
  const rel = url.replace(/^data\/v1\/tiles\//, '');
  if (log) log.push(rel);
  if (!existsSync(join(dir, rel))) return Promise.reject(new TC.TileError(`${rel}: HTTP 404`));
  return Promise.resolve(bytes(rel));
};

const gpRows = [...expect.trackedGp.debris, ...expect.trackedGp.rocket];
const gpById = new Map(gpRows.map((r) => [r.NORAD_CAT_ID, r]));
check(gpRows.length === 142, 'the fixture holds 142 element sets');

// --- 1. the elements survive ------------------------------------------------------------------------
const logged = [];
const got = await TR.loadTracked({ fetchBytes: transport(logged), nowMs: Date.parse('2026-11-03T12:00:00Z') });
check(got && got.records.length === gpRows.length && got.failed === 0 && got.level === 2, `all ${gpRows.length} objects come back from the tiles`);
let worst = 0;
let worstAt = '';
let checked = 0;
for (const rec of got.records) {
  const orig = gpById.get(rec.meta.noradId);
  const a = satellite.json2satrec(orig);
  const b = satellite.json2satrec(rec.omm);
  const epoch = Date.parse(orig.EPOCH + 'Z');
  if (Math.abs(epoch - rec.epoch) > 1) check(false, `${orig.OBJECT_NAME}: epoch ${rec.epoch} against ${epoch}`);
  for (const days of [0, 0.5, 1, 3, 7]) {
    const when = new Date(epoch + days * 86400e3);
    const pa = satellite.propagate(a, when).position;
    const pb = satellite.propagate(b, when).position;
    if (!pa || typeof pa === 'boolean' || !pb || typeof pb === 'boolean') {
      check(!!pa === !!pb, `${orig.OBJECT_NAME}: SGP4 answers for one and not the other at +${days} d`);
      continue;
    }
    const d = Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z) * 1000;
    checked += 1;
    if (d > worst) { worst = d; worstAt = `${orig.OBJECT_NAME} +${days} d`; }
  }
}
check(checked > 600, `${checked} positions compared`);
check(worst < 10, `the tile's elements and CelesTrak's put every object within 10 m for a week: worst ${worst.toFixed(3)} m (${worstAt})`);
check(TR.epochText(846934901.815392) === '2026-11-02T11:41:41.815392', 'the epoch is written back to the microsecond');
check(TR.epochText(1.9999999) === '2000-01-01T00:00:01.999999' && TR.epochText(0) === '2000-01-01T00:00:00.000000', 'and does not carry into the next second');

// --- 2. it reaches the worker -----------------------------------------------------------------------
const one = got.records[0];
check(one.propagator === 'sgp4' && one.omm && !one.satrec, 'a record is an sgp4 record with an omm and no satrec');
const slim = W.slim(one);
check(slim && slim.satrec === one.omm && slim.epoch === one.epoch && slim.frame === 'earth-inertial', 'the worker is sent the omm, the epoch and the frame');
const t0 = one.epoch + 3600e3;
const batch = W.propagateBatch(got.records.slice(0, 20).map(W.slim), t0);
let same = 0;
got.records.slice(0, 20).forEach((r, i) => { const p = sgp4(r, t0); if (p && batch[i * 3] === p.x && batch[i * 3 + 1] === p.y && batch[i * 3 + 2] === p.z) same += 1; });
check(same === 20, 'the worker\'s batch is the page\'s sgp4() to the last bit');
check(one.cls === 'measured' || one.cls === 'inferred', 'the class is measured or inferred by the age of the epoch');
const oldOne = TR.tileRecords(got.set, { cols: null, count: 0, level: 0 }, {});
check(Array.isArray(oldOne) && oldOne.length === 0, 'an empty tile is an empty list');
const fresh = TR.tileRecords(got.set, { ...(await got.cloud.load({ maxLevel: 0 })).tiles[0] }, { nowMs: one.epoch + 3600e3 });
const stale = TR.tileRecords(got.set, { ...(await got.cloud.load({ maxLevel: 0 })).tiles[0] }, { nowMs: fresh[0].epoch + 20 * 86400e3 });
check(fresh[0].cls === 'measured' && stale[0].cls === 'inferred', 'seven days is the line between measured and inferred, as for the active satellites');

// --- 3. the merge -----------------------------------------------------------------------------------
const placedA = got.records[0], placedB = got.records[1];
const base = SC.fieldRecords([
  { id: placedA.meta.noradId, name: 'ONE DEB', intl: '1999-025AA', kind: 'debris', launchMs: Date.UTC(1999, 5, 1), apogeeKm: 900, perigeeKm: 800, incDeg: 98, periodMin: 101, owner: 'PRC', rcs: 0.2 },
  { id: 888888, name: 'NO ELEMENTS DEB', intl: '1999-025AB', kind: 'debris', launchMs: Date.UTC(1999, 5, 1), apogeeKm: 900, perigeeKm: 800, incDeg: 98, periodMin: 101, owner: 'PRC', rcs: null },
]);
const merged = TR.mergeTracked(base, [placedA, placedB]);
const m1 = merged.records.find((r) => r.id === `cat-${placedA.meta.noradId}`);
const m2 = merged.records.find((r) => r.id === 'cat-888888');
check(m1.name === 'ONE DEB' && m1.meta.owner === 'PRC' && m1.meta.launchMs === Date.UTC(1999, 5, 1), 'a placed record keeps the catalogue\'s name, owner and launch');
check(m1.propagator === 'sgp4' && m1.omm === placedA.omm && m1.cls !== 'illustrative' && m1.meta.placeIllustrative === false && !('elements' in m1), 'and takes the element set\'s place');
check(m2.propagator === 'kepler' && m2.cls === 'illustrative' && m2.meta.placeIllustrative === true, 'one with no element set stays illustrative');
check(merged.records.length === 3 && merged.placed === 2 && merged.illustrative === 1, 'a tracked piece the file does not list is kept: 2 placed, 1 illustrative');
check(m1.meta.periodMin > 0 && Math.abs(m1.meta.periodMin - 1440 / placedA.meta.meanMotion) < 1e-9, 'its period is the element set\'s');

// --- 4. the honest words ----------------------------------------------------------------------------
const census = { kinds: { debris: 9000, rocket: 1000, dead: 0, working: 0 } };
check(DB.drawnWords(census, { placed: 0 }) === COPY.debris.drawn.replace('{n}', '10 000') || /made-up place/.test(DB.drawnWords(census, { placed: 0 })), 'without tiles the line says the places are made up');
const withTiles = DB.drawnWords(census, { placed: 8200 });
check(/8[\s ,]?200/.test(withTiles) && /1[\s ,]?800/.test(withTiles) && /own element sets/.test(withTiles) && /made-up/.test(withTiles), 'with tiles it says how many are placed and how many are not');
check(/illustrative/.test(DB.honestyWords({ placed: 0 }, Date.UTC(2026, 10, 3))) && !/illustrative/.test(DB.honestyWords({ placed: 5, builtAt: Date.UTC(2026, 10, 3) }, Date.UTC(2026, 10, 3))), 'the closing line drops "illustrative" only when places came from element sets');
check(DB.drawnWords(census, { placed: 99999 }).includes('10') , 'the placed count is never more than the dots');
const facts = readFileSync(join(JS, 'ui/cardfacts.js'), 'utf8');
check(/record\.elements \|\| record\.satrec \|\| record\.omm/.test(facts), 'the card\'s class line counts an omm as elements');
SC.noteFieldStats({ placed: 5, total: 9 });
check(SC.FIELD_STATS.placed === 5 && (SC.noteFieldStats({}), SC.FIELD_STATS.placed === 0), 'the stats are replaced, not added to');

// --- 5. the device ----------------------------------------------------------------------------------
const lat = [];
const latched = await TR.loadTracked({ fetchBytes: transport(lat), plan: { latched: true } });
check(latched && latched.level === 0 && latched.records.length > 0 && latched.records.length < got.records.length, 'a latched device loads level 0 alone');
check(lat.every((p) => !/\bL[12]\//.test(p)), 'and fetches no finer tile');
check(latched.records.every((r) => r.meta.sizeLevel === 0) && latched.records.length === got.set.levels[0].count, 'level 0 is the rocket bodies and the large pieces');
const sd = [];
check((await TR.loadTracked({ fetchBytes: transport(sd), plan: { saveData: true } })) === null && sd.every((p) => p === 'tracked/set.json'), 'data-saver: no tile at all (only set.json is read)');
check((await TR.loadTracked({ fetchBytes: () => Promise.reject(new TC.TileError('404')) })) === null, 'no set on the server: null, and the layer keeps its illustrative places');
const layers = readFileSync(join(JS, 'data/layers.js'), 'utf8');
const block = layers.slice(layers.indexOf("id: 'debris-field'"), layers.indexOf("id: 'launches'"));
check(/import\('\.\/tracked\.js'\)\.then\(\(m\) => m\.parseDebris\(data\)\)/.test(block) && /load: 'on-demand'/.test(block), 'the debris layer parses through data/tracked.js, and only when it is asked for');
check(!/tracked\.js/.test(readFileSync(join(JS, 'main.js'), 'utf8')), 'main.js is untouched: the boot grows by no byte');
// parseDebris: the satcat's records with the tracked ones placed; anything wrong leaves the illustrative ones.
const satText = readFileSync(join(ROOT, 'tests/fixtures/tracked-satcat-sample.csv'), 'utf8');
const plain = SC.fieldRecords(SC.parseSatcat(satText));
const got2 = await TR.parseDebris(satText, { fetchBytes: transport([]), nowMs: Date.parse('2026-11-03T12:00:00Z') });
const placedN = got2.filter((r) => r.propagator === 'sgp4').length;
check(plain.length > 100 && got2.length >= plain.length && placedN > 100 && SC.FIELD_STATS.placed === placedN, `parseDebris: ${placedN} of ${got2.length} placed, and ui/debris.js is told`);
check(got2.filter((r) => r.propagator === 'kepler').every((r) => r.cls === 'illustrative'), 'the ones the tiles do not hold stay illustrative');
const none = await TR.parseDebris(satText, { fetchBytes: () => Promise.reject(new TC.TileError('404')) });
check(none.length === plain.length && none.every((r) => r.propagator === 'kepler') && SC.FIELD_STATS.placed === 0, 'with no set on the server the layer is the illustrative one, as before');
const sd2 = await TR.parseDebris(satText, { fetchBytes: transport([]), plan: { saveData: true } });
check(sd2.every((r) => r.propagator === 'kepler') && SC.FIELD_STATS.placed === 0, 'on data-saver it is the illustrative one too');
const registry = readFileSync(join(ROOT, 'registry/layers.yaml'), 'utf8');
check(/tiles:\s*tracked/.test(registry.slice(registry.indexOf('id: debris-field'), registry.indexOf('id: debris-field') + 900)), 'registry/layers.yaml says the debris layer reads the tracked tiles');

if (problems.length) { console.error(`FAIL: ${problems.length}\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log(`PASS: ${got.records.length} tracked objects come back from tiles within ${worst.toFixed(3)} m of CelesTrak's own SGP4 for a week, reach the worker as an omm, merge into the debris layer keeping the catalogue's names, say how many dots are placed, and load level 0 alone under the latch and none on data-saver`);
