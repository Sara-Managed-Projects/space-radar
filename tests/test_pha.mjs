// tests/test_pha.mjs -- the potentially hazardous asteroids layer (release 2.1.0, internal #37).
//
// What this holds, each against something outside the code that draws it:
//   - THE FILE: site/data/pha.json, compact (gzipped size), one record per row (less the ones data/sample.js already draws by name),
//     every id unique, every row inside the definition NASA gives (MOID of 0.05 au or less, absolute magnitude 22 or less, with room for the 32 whose H has moved to 22.6:
//     https://cneos.jpl.nasa.gov/about/neo_groups.html, read 2026-11-15).
//   - WHERE: two-body motion from the shipped elements against JPL Horizons' own heliocentric vectors for every 64th row on
//     15 November 2026 and 9 June 2027 (tests/fixtures/pha_horizons.json, read from the Horizons API on 2026-11-15). The drift is
//     measured here and held to a number the layer's sentence can stand behind; a place is never called better than `inferred`.
//   - THE GEOMETRY: every asteroid's distance from the Sun lies between its perihelion and its aphelion, whatever the clock says.
//   - THE CARD: a first sentence under 160 characters, the "why" line with the MOID in it, the source line, the honesty line.
//   - FOUND: search finds an asteroid by its name and by its designation.
//   - THE LAYER: it loads through `fetchLazy` (a stubbed fetch reads the file), is not at boot, not in the first minute and not on by default.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const json = JSON.parse(read('site/data/pha.json'));
globalThis.fetch = async (u) => {
  const name = String(u).split('/').pop().split('?')[0];
  if (name !== 'pha.json') return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => JSON.parse(read('site/data/pha.json')) };
};

const { buildPha, moidWords } = await import(join(JS, 'data/pha.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { LAYERS, loadLayer } = await import(join(JS, 'data/layers.js'));
const { NAMED_ASTEROIDS } = await import(join(JS, 'data/sample.js'));
const { firstSentence, sourceLine, klassLabel } = await import(join(JS, 'ui/cards.js'));
const { honestyLine } = await import(join(JS, 'ui/cardfacts.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));

const AU = 149597870.7;
const DAY = 86400000;
const recs = buildPha(json);
const col = Object.fromEntries(json.cols.map((c, i) => [c, i]));

// --- the file ------------------------------------------------------------------------------------------------------
const namedNumbers = new Set(NAMED_ASTEROIDS.map((b) => b.id.replace('asteroid-', '')));
const skipped = json.rows.filter((r) => namedNumbers.has(r[col.pdes])).length;
check(json.count === json.rows.length && json.count >= 2400 && json.count <= 3500, `the file holds ${json.rows.length} rows, count says ${json.count}`);
check(recs.length === json.rows.length - skipped, `a record for every row but the ${skipped} drawn by name (${recs.length} of ${json.rows.length})`);
check(skipped >= 2 && skipped <= 15, `Apophis, Bennu and Geographos are in the group and are not made twice (${skipped} skipped)`);
check(gzipSync(readFileSync(join(ROOT, 'site/data/pha.json'))).length <= 150000, 'pha.json gzips to 150 kB or less');
const ids = recs.map((r) => r.id);
check(new Set(ids).size === ids.length, 'every id is unique');
check(json.epochJd === 2461200.5, 'one epoch, 9 June 2026');
for (const r of json.rows) {
  check(r[col.moid] <= 0.05 && r[col.H] <= 22.7, `${r[col.pdes]}: inside the definition (moid ${r[col.moid]}, H ${r[col.H]})`);
}
check(json.rows.filter((r) => r[col.H] > 22).length <= 40, 'only a few rows (JPL\'s flag was set at an older H) are past absolute magnitude 22.0');
for (const spk of json.horizons) check(json.rows.some((r) => r[col.spk] === spk), `Horizons row ${spk} is in the file`);

// --- the geometry --------------------------------------------------------------------------------------------------
let outside = 0;
for (const r of recs) {
  check(r.layer === 'pha' && r.klass === 'asteroid' && r.propagator === 'kepler' && r.frame === 'sun-inertial' && r.cls === 'inferred', `${r.id}: layer, class, propagator, frame, honesty class`);
  const el = r.elements;
  for (const dt of [0, 200 * DAY, -400 * DAY]) {
    const p = propagate(r, el.epochMs + dt);
    if (!p || ![p.x, p.y, p.z].every(Number.isFinite)) { check(false, `${r.id}: no position at ${dt / DAY} days`); continue; }
    const d = Math.hypot(p.x, p.y, p.z);
    if (d < el.qKm * 0.999 || d > el.aKm * (1 + el.e) * 1.001) outside += 1;
  }
}
check(outside === 0, `${outside} positions fall outside their own orbit's perihelion and aphelion`);

// --- against Horizons ----------------------------------------------------------------------------------------------
const fx = JSON.parse(read('tests/fixtures/pha_horizons.json'));
const bySpk = new Map(recs.map((r) => [Number(r.id.slice(4)), r]));
const errs = [[], []];
for (const [spk, row] of Object.entries(fx.rows)) {
  const r = bySpk.get(Number(spk));
  if (!r) continue; // one the layer does not make (Apophis ...)
  fx.days.forEach((day, k) => {
    const p = propagate(r, Date.parse(`${day}T00:00:00Z`));
    const [x, y, z] = row.vectors[k];
    // Horizons' vectors are TDB and our clock is UTC: 69 s, 0.0004 au at 30 km/s per 100 s, far under the limits below.
    errs[k].push(Math.hypot(p.x / AU - x, p.y / AU - y, p.z / AU - z));
  });
}
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
check(errs[0].length >= 30, `at least 30 asteroids were held to Horizons (${errs[0].length})`);
// 15 November 2026 is five months past the epoch; 9 June 2027 is a year. Measured on 2026-11-15: the median rock is 0.0001 and 0.0004 au out, the worst (a close pass bends an orbit) 0.001 and 0.0044 au; the limits below leave room, and the card does not claim better than `inferred`.
check(median(errs[0]) < 0.002, `median miss five months out ${median(errs[0]).toFixed(5)} au`);
check(median(errs[1]) < 0.005, `median miss a year out ${median(errs[1]).toFixed(5)} au`);
check(Math.max(...errs[0]) < 0.01 && Math.max(...errs[1]) < 0.03, `worst misses ${Math.max(...errs[0]).toFixed(3)} and ${Math.max(...errs[1]).toFixed(3)} au`);

// --- the card -------------------------------------------------------------------------------------------------------
const ctx = { records: () => recs, layers: LAYERS, sources: { SOURCES: {} } };
const m0 = { tMs: Date.UTC(2026, 10, 15), ok: true, distSunKm: 1.4e8, distEarthKm: 6e7, altKm: 1e7, frame: 'sun-inertial', worldId: null, cls: 'inferred' };
for (const r of recs.filter((_, i) => i % 97 === 0)) {
  const s = firstSentence(r, ctx, m0, { state: 'none' });
  check(typeof s === 'string' && s.length > 20 && s.length <= 160 && !/undefined|NaN|\{/.test(s), `${r.id}: first sentence ${JSON.stringify(s)}`);
  check(/near-Earth/.test(s), `${r.id}: says it is a near-Earth object: ${s}`);
  check(/within [0-9.]+ au/.test(r.meta.why) && /not a forecast/.test(r.meta.why) && r.meta.why.includes(`magnitude is ${r.meta.absoluteMagnitude} `), `${r.id}: the why line names the distance and its own H and says it is not a forecast`);
  check(/Small-Body Database/.test(sourceLine(r, ctx)) || /Small-Body Database/.test(r.meta.cite), `${r.id}: source line`);
  const h = honestyLine(r, { ...m0, cls: r.cls });
  check(typeof h === 'string' && !/undefined|NaN|\{/.test(h), `${r.id}: honesty ${h}`);
  check(klassLabel(r) === 'Asteroid', `${r.id}: the badge is ${klassLabel(r)}`);
}
check(moidWords(0.0338) === "0.0338 au (13 times the Moon's distance)", `moidWords: ${moidWords(0.0338)}`);
check(moidWords(0.0007) === "0.0007 au (0.3 times the Moon's distance)", `moidWords small: ${moidWords(0.0007)}`);

// --- found ----------------------------------------------------------------------------------------------------------
const index = buildIndex(recs, LAYERS);
const first = (q) => { const m = findMatches(index, q); return m.hits[0] ? m.hits[0].record.id : null; };
const icarus = recs.find((r) => r.name === 'Icarus');
const geo = recs.find((r) => r.name === 'Midas');
check(icarus && geo, 'Icarus and Midas are records');
check(first('Icarus') === icarus.id, `search "Icarus" finds it first (${first('Icarus')})`);
check(first('1981 Midas') === geo.id, `search "1981 Midas" finds it first (${first('1981 Midas')})`);

// --- the layer ------------------------------------------------------------------------------------------------------
const layer = LAYERS.find((l) => l.id === 'pha');
check(layer && layer.defaultOn === false && layer.source === 'bundled' && typeof layer.fetchLazy === 'function', 'the layer exists, is off by default and fetches lazily');
check(layer && layer.moments && !layer.moments.wonder && !layer.moments.now && !layer.moments.next, 'it is in no moment by default');
const main = read('site/js/main.js');
check(/TICKED_LAYERS = new Set\(\['pha'\]\)/.test(main) && /TICKED_LAYERS\.has\(l\.id\)/.test(main) && !/LATER_LAYERS\.add\('pha'\)/.test(main), "main.js holds it until the box is ticked (TICKED_LAYERS), not in the first minute");
const boot = read('site/js/data/layers.js').split('\n').filter((l) => /^import /.test(l)).join('\n');
check(!/pha\.js/.test(boot), 'layers.js does not import data/pha.js statically');
const loaded = await loadLayer(layer, Date.UTC(2026, 10, 15));
check(loaded && (loaded.records || loaded).length === recs.length, 'loadLayer returns the same records');

if (problems.length) { console.error('pha FAILED:\n  ' + problems.slice(0, 40).join('\n  ') + (problems.length > 40 ? `\n  ... and ${problems.length - 40} more` : '')); process.exit(1); }
console.log(`pha ok: ${recs.length} potentially hazardous asteroids, ${errs[0].length} held to Horizons (median miss ${median(errs[0]).toFixed(4)} au at five months, ${median(errs[1]).toFixed(4)} au at a year)`);
