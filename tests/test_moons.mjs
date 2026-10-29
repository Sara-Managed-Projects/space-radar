// tests/test_moons.mjs -- every moon (release 1.5.0, internal spec 0079 stage A3, internal i#1061).
//
// What this holds, each against something outside the code that draws it:
//   - THE FILES: site/data/moons.json and site/data/companions.json, compact (gzipped sizes), one record per row, every id unique and
//     none of them an id of registry/worlds.yaml (the 21 moons the map already had are not here).
//   - WHERE: each planet moon's two-body position, from the shipped orbit and mean period, against JPL Horizons' own vectors for 1 May 2026
//     and 1 May 2027 (tests/fixtures/moons_horizons.json, read from the Horizons API on 2026-10-28, ecliptic J2000, centred on the planet).
//     The file records, per moon, how far the model was on those two days (`err`), and this test holds that number to the vectors: a
//     moon more than 30 degrees out is `illustrative` in its place, never `inferred`.
//   - THE GEOMETRY: every moon's distance from its planet lies between its periapsis and its apoapsis, whatever the clock says.
//   - WHAT THE CARD SAYS: a first sentence under 160 characters, the rows, the honesty clause, the "drawn as" line, the source line.
//   - FOUND: search finds a moon by its name and by its provisional designation.
//   - THE LAYERS: both load through `fetchLazy` (a stubbed fetch reads the files), neither is at boot, neither is on by default.
//   - THE DWARF PLANETS' MOONS and the five candidates: a measured lap, an illustrative place, and no "dwarf planet" said of a candidate.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const moonsJson = JSON.parse(read('site/data/moons.json'));
const compJson = JSON.parse(read('site/data/companions.json'));
// A page's fetch, for the layers' own loaders: the two files, from disk.
globalThis.fetch = async (u) => {
  const name = String(u).split('/').pop().split('?')[0];
  if (!/^(moons|companions)\.json$/.test(name)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => JSON.parse(read(`site/data/${name}`)) };
};

const { buildMoons, buildCompanions, EPOCH_MS, PLACE_LIMIT_DEG } = await import(join(JS, 'data/moons.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { LAYERS, loadLayer } = await import(join(JS, 'data/layers.js'));
const { firstSentence, drawingLine, sourceLine, klassLabel } = await import(join(JS, 'ui/cards.js'));
const { honestyLine } = await import(join(JS, 'ui/cardfacts.js'));
const { moonRows } = await import(join(JS, 'ui/moonfacts.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { wholePathTimes, wholePathKind } = await import(join(JS, 'scene/orbitline.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const moons = buildMoons(moonsJson);
const comp = buildCompanions(compJson);
const DAY = 86400000;

// --- the files --------------------------------------------------------------------------------------------
check(moons.length === moonsJson.rows.length && moons.length >= 430, `a record for every row of moons.json (${moons.length} of ${moonsJson.rows.length})`);
check(gzipSync(readFileSync(join(ROOT, 'site/data/moons.json'))).length <= 32000, 'moons.json gzips to 32 kB or less');
check(gzipSync(readFileSync(join(ROOT, 'site/data/companions.json'))).length <= 50000, 'companions.json gzips to 50 kB or less');
const worldIds = new Set([...read('registry/worlds.yaml').matchAll(/^\s+- id: (\S+)/gm)].map((m) => m[1]));
const ids = [...moons, ...comp].map((r) => r.id);
check(new Set(ids).size === ids.length, `every id is unique (${ids.length - new Set(ids).size} repeated)`);
check(ids.every((id) => !worldIds.has(id)), `no id of registry/worlds.yaml is made again: ${ids.filter((id) => worldIds.has(id)).join(', ')}`);
check(worldIds.size >= 31 && ['io', 'titan', 'triton', 'charon', 'phobos', 'oberon'].every((id) => worldIds.has(id)), 'the 21 moons the map already drew are still worlds');

// --- the geometry ------------------------------------------------------------------------------------------
let outside = 0;
for (const r of moons) {
  check(r.layer === 'moons' && r.klass === 'moon' && r.propagator === 'kepler' && /^(jupiter|saturn|uranus|neptune|pluto)-inertial$/.test(r.frame), `${r.id}: layer, class, propagator and frame`);
  const el = r.elements;
  for (const dt of [0, 200 * DAY, -400 * DAY]) {
    const p = propagate(r, EPOCH_MS + dt);
    if (!p || ![p.x, p.y, p.z].every(Number.isFinite)) { check(false, `${r.id}: no position at ${dt / DAY} days`); continue; }
    const d = Math.hypot(p.x, p.y, p.z);
    const q = el.aKm * (1 - el.e);
    const Q = el.aKm * (1 + el.e);
    if (d < q * 0.999 || d > Q * 1.001) outside += 1;
    check(p.frame === r.frame, `${r.id}: the answer is in the record's frame`);
  }
  // the lap comes out as the period that was measured
  check(Math.abs((2 * Math.PI * Math.sqrt(el.aKm ** 3 / el.muKm3S2)) / 86400 / r.meta.periodDays - 1) < 1e-9, `${r.id}: mu makes the lap the mean period`);
  check((r.cls === 'inferred') === (r.meta.placeState === 'good'), `${r.id}: only the kind of moon that was held to JPL is inferred in its place (${r.cls}, ${r.meta.placeState})`);
}
check(outside === 0, `${outside} positions fall outside their own orbit's periapsis and apoapsis`);

// --- against Horizons ----------------------------------------------------------------------------------------
const fx = JSON.parse(read('tests/fixtures/moons_horizons.json'));
check(Object.keys(fx.moons).length >= 40, 'forty moons or more are held to JPL Horizons');
const angle = (p, q) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); return (2 * Math.asin(Math.min(1, d / (2 * Math.max(Math.hypot(...p), Math.hypot(...q)))))) * 180 / Math.PI; };
const worst = { good: 0, lost: 0 };
const count = { good: 0, lost: 0 };
for (const [id, byDay] of Object.entries(fx.moons)) {
  const r = moons.find((m) => m.id === id);
  if (!r) { check(false, `${id} is in the fixture and not in the file`); continue; }
  const kind = r.meta.placeState === 'good' ? 'good' : 'lost';
  count[kind] += 1;
  for (const [day, vec] of Object.entries(byDay)) {
    const p = propagate(r, Date.parse(`${day}T00:00:00Z`));
    worst[kind] = Math.max(worst[kind], angle([p.x, p.y, p.z], vec));
  }
}
const chk = moonsJson.check;
check(chk && chk.good[0] === count.good && chk.lost[0] === count.lost, `the file's check counts ${JSON.stringify(chk)} agree with the fixture (${count.good} good, ${count.lost} lost)`);
check(chk && Math.abs(chk.good[1] - worst.good) <= 1.01 && Math.abs(chk.lost[1] - worst.lost) <= 1.01, `the file's worst errors ${JSON.stringify(chk)} are what propagate gives (${worst.good.toFixed(1)}, ${worst.lost.toFixed(1)})`);
check(worst.good <= PLACE_LIMIT_DEG, `the moons called inferred stayed within ${PLACE_LIMIT_DEG} degrees of Horizons (${worst.good.toFixed(1)})`);
check(count.good >= 25, `at least 25 of the moons called inferred were checked (${count.good})`);

// --- the card ---------------------------------------------------------------------------------------------------
const ctx = { records: () => [...moons, ...comp], layers: LAYERS, sources: { SOURCES: {} } };
const m0 = { tMs: Date.UTC(2026, 10, 15), ok: true, distSunKm: 7.4e8, distEarthKm: 6.1e8, altKm: 1e7, frame: 'jupiter-inertial', worldId: 'jupiter', cls: 'inferred' };
const one = (id) => [...moons, ...comp].find((r) => r.id === id);
for (const id of ['himalia', 'pasiphae', 'phoebe', 'nix', 'sycorax', 'dysnomia', 'vanth', 'linus', 'remus', 'salacia', 'ixion', '2002-xv93', '2017-of201']) {
  const r = one(id);
  if (!r) { check(false, `${id} is not a record`); continue; }
  const s = firstSentence(r, ctx, { ...m0, frame: r.frame }, { state: 'none' });
  check(typeof s === 'string' && s.length > 20 && s.length <= 160 && !/undefined|NaN|\{/.test(s), `${id}: first sentence ${JSON.stringify(s)}`);
  const rows = r.klass === 'moon' ? moonRows(r) : [];
  check(rows.every(([a, b]) => a && b && !/undefined|NaN|\{/.test(`${a} ${b}`)), `${id}: rows ${JSON.stringify(rows)}`);
  const h = honestyLine(r, { ...m0, frame: r.frame, cls: r.cls });
  check(/JPL|paper|Horizons/.test(h) || r.klass !== 'moon', `${id}: honesty ${h}`);
  check(!/undefined|NaN|\{/.test(h), `${id}: honesty has a hole ${h}`);
  check(typeof sourceLine(r, ctx) === 'string' && /Small-Body|Solar System Dynamics|Wikipedia|read/.test(sourceLine(r, ctx)), `${id}: source line ${sourceLine(r, ctx)}`);
  if (r.klass === 'moon') check(/point/.test(drawingLine(r, m0.tMs) || ''), `${id}: drawn as a point, and says so: ${drawingLine(r, m0.tMs)}`);
}
const him = one('himalia');
check(firstSentence(him, ctx, m0, { state: 'none' }).startsWith('Himalia is a moon of Jupiter'), `Himalia's sentence: ${firstSentence(him, ctx, m0, { state: 'none' })}`);
check(klassLabel(him) === 'Moon', 'the badge says Moon');
const retro = moons.filter((r) => r.meta.backwards);
check(retro.length > 200 && /opposite way/.test(firstSentence(retro[0], ctx, m0, { state: 'none' })), 'a retrograde moon says it goes round the opposite way');
check(moonRows(him).some(([a]) => a === COPY.moonCard.rows.place), "a planet's moon prints how far its place on the orbit can be trusted");
check(moons.filter((r) => r.cls === 'inferred').length >= 150, 'most of the slow moons are inferred in their place');

// --- found --------------------------------------------------------------------------------------------------------
const index = buildIndex([...moons, ...comp], LAYERS);
const first = (q) => { const m = findMatches(index, q); return m.hits[0] ? m.hits[0].record.id : null; };
for (const [q, id] of [['himalia', 'himalia'], ['Pasiphae', 'pasiphae'], ['S/2011 J 4', 's2011-j-4'], ['S2011 J 4', 's2011-j-4'], ['dysnomia', 'dysnomia'], ['Linus', 'linus'], ['Ilmarë', 'ilmare'], ['salacia', 'salacia'], ['2017 OF201', '2017-of201']]) check(first(q) === id, `search "${q}" finds ${id} first (${first(q)})`);

// --- the orbit line -------------------------------------------------------------------------------------------------
for (const id of ['himalia', 'phoebe', 'sycorax', 'nereid']) {
  const r = one(id);
  const when = Date.UTC(2026, 10, 20);
  check(wholePathKind(r) === 'orbit', `${id}: the line is the whole orbit`);
  const times = wholePathTimes(r, when);
  check(times && times.length === 241 && times.some((x) => { const P = r.meta.periodDays * DAY; const k = ((x - when) % P + P) % P; return Math.min(k, P - k) < 1000; }), `${id}: 240 points and today, so the line passes through the dot`);
}

// --- the layers -------------------------------------------------------------------------------------------------------
for (const id of ['moons', 'companions']) {
  const layer = LAYERS.find((l) => l.id === id);
  check(layer && typeof layer.fetchLazy === 'function' && layer.defaultOn === false && layer.noModel === true, `${id}: a lazy layer, off by default, no model`);
  const got = layer ? await loadLayer(layer, Date.now()) : [];
  check(got.length === (id === 'moons' ? moons.length : comp.length), `${id}: loadLayer returns ${id === 'moons' ? moons.length : comp.length} records (${got.length})`);
}
const main = read('site/js/main.js');
check(/LATER_LAYERS\.add\('moons'\);\s*LATER_LAYERS\.add\('companions'\);/.test(main), 'main.js loads the two layers after the first visit, not at boot');
const layersJs = read('site/js/data/layers.js');
check(!/from '\.\/moons\.js'/.test(layersJs), 'data/layers.js imports data/moons.js only dynamically');

// --- the dwarf planets' moons and the candidates ------------------------------------------------------------------------
const far = compJson.far.map((f) => f[0]);
check(['dysnomia', 'hiiaka', 'namaka', 'vanth', 'weywot', 'xiangliu', 'mk2', 'actaea', 'ilmare'].every((id) => far.includes(id) && one(id)), 'the nine moons the stage names are all there');
for (const id of far) {
  const r = one(id);
  check(r.cls === 'illustrative' && r.propagator === 'companion' && r.meta.placeIllustrative === true, `${id}: lap measured, place illustrative`);
  // its distance from its parent is its own orbit's, whatever the date
  const el = r.elements;
  const p1 = propagate(r, EPOCH_MS);
  const base = propagate({ ...r, propagator: 'kepler', elements: r.parentElements }, EPOCH_MS);
  const d = Math.hypot(p1.x - base.x, p1.y - base.y, p1.z - base.z);
  check(d >= el.aKm * (1 - el.e) * 0.999 && d <= el.aKm * (1 + el.e) * 1.001, `${id}: ${Math.round(d)} km from its parent, orbit ${Math.round(el.aKm)} km`);
  check(Math.abs((2 * Math.PI * Math.sqrt(el.aKm ** 3 / el.muKm3S2)) / 86400 / r.meta.lapDays - 1) < 1e-9, `${id}: the lap is the measured one`);
}
const cands = comp.filter((r) => r.klass === 'asteroid');
check(cands.length === 5 && cands.every((r) => r.meta.farKind === 'candidate'), 'five candidates, each a dwarf-planet candidate');
for (const r of cands) {
  const s = firstSentence(r, ctx, { ...m0, frame: 'sun-inertial', distSunKm: 6.1e9 }, { state: 'none' });
  check(/may be a dwarf planet/.test(s) && !/is a dwarf planet/.test(s), `${r.id}: ${s}`);
  check(klassLabel(r) === 'Dwarf-planet candidate', `${r.id}: badge`);
  const p = propagate(r, Date.UTC(2026, 10, 15));
  check(p && Math.hypot(p.x, p.y, p.z) > 25 * 149597870.7, `${r.id} is beyond Neptune's orbit`);
}
check(['salacia', 'varda', 'ixion', '2002-xv93', '2017-of201'].every((id) => cands.some((r) => r.id === id)), 'Salacia, Varda, Ixion, 2002 XV93 and 2017 OF201');

// --- the totals --------------------------------------------------------------------------------------------------------------
const planetsMoons = moons.length + 21; // the 21 the worlds already had
check(planetsMoons >= 455 && planetsMoons <= 470, `${planetsMoons} planetary moons, with the 21 already drawn (JPL's table: 460)`);
check(comp.filter((r) => r.klass === 'moon').length >= 480, 'at least 480 companions of asteroids and far worlds');

if (problems.length) { console.error('moons FAILED:\n  ' + problems.slice(0, 40).join('\n  ') + (problems.length > 40 ? `\n  ... and ${problems.length - 40} more` : '')); process.exit(1); }
console.log(`moons ok: ${moons.length} planetary moons (${moons.filter((r) => r.cls === 'inferred').length} inferred in their place, the rest illustrative), ${comp.filter((r) => r.klass === 'moon').length} companions, ${cands.length} candidates, ${Object.keys(fx.moons).length} held to Horizons`);
