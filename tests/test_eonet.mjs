// tests/test_eonet.mjs -- fires, volcanoes and icebergs from NASA's EONET (internal #281).
//   node tests/test_eonet.mjs
//
// Against what EONET answered on 2026-10-07 (tests/fixtures/eonet/, the two answers cut down to
// nine events, each event verbatim), with no network:
//   1. the records: one point and one date each, the latest of an iceberg's track, sizes in km²;
//   2. drawn from the first report until three days after it was read, and not a month on;
//   3. the card: the sentence, the rows, the honesty line with the publisher's caveat;
//   4. the fetch: two requests, no credentials, one failing leaves the other, both failing rejects;
//   5. nothing at boot: the layer is on demand, off in every moment, its module a dynamic import,
//      and the registry row carries the host, the CORS header and the terms.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const E = await import(join(JS, 'data/eonet.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const C = await import(join(JS, 'ui/cards.js'));
const { LAYERS, loadLayerDetailed } = await import(join(JS, 'data/layers.js'));
const { LAYER_ROWS } = await import(join(JS, 'data/layers.registry.js'));
const { WEATHER } = await import(join(JS, 'data/weather.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const fires = readFileSync(join(ROOT, 'tests/fixtures/eonet/wildfires.json'), 'utf8');
const rest = readFileSync(join(ROOT, 'tests/fixtures/eonet/volcanoes-ice.json'), 'utf8');
const READ = Date.parse('2026-10-07T11:40:00Z');
const D = 86400e3;

// ---- 1. the records ---------------------------------------------------------------------------------
const recs = E.parseEonet([fires, rest], { nowMs: READ });
const kinds = recs.map((r) => r.meta.kind);
check(recs.length === 9 && kinds.filter((k) => k === 'wildfire').length === 4 && kinds.filter((k) => k === 'volcano').length === 3 && kinds.filter((k) => k === 'iceberg').length === 2, `nine events: four fires, three volcanoes, two icebergs (${kinds})`);
check(recs.every((r) => r.klass === 'earthevent' && r.layer === 'earth-events' && r.propagator === 'fixed' && r.frame === 'earth-fixed' && r.cls === 'measured' && r.source === 'weather'), 'each is a measured point on the ground of the earth-events layer');
const bear = recs.find((r) => r.id === 'event-eonet-25043');
check(bear && bear.name === 'Prescribed Fire D3 Bear RX, Greenlee, Arizona' && bear.meta.reportedMs === Date.parse('2026-10-02T17:58:00Z') && Math.abs(bear.meta.latDeg - 33.447133) < 1e-6 && Math.abs(bear.meta.lonDeg + 109.401883) < 1e-6, 'a fire keeps EONET\'s title, its place and the minute of its report');
check(bear && Math.abs(bear.meta.sizeKm2 - 20.53) < 0.01 && bear.meta.agencies.join() === 'IRWIN' && /^https:\/\/irwin\.doi\.gov\//.test(bear.meta.reportUrl), `5 072 acres is 20.5 km², reported by IRWIN (${bear && bear.meta.sizeKm2})`);
const c18c = recs.find((r) => r.name === 'Iceberg C18C');
check(c18c && c18c.meta.reports === 4 && c18c.meta.reportedMs === Date.parse('2026-04-24T00:00:00Z') && c18c.meta.firstMs < c18c.meta.reportedMs && Math.abs(c18c.meta.latDeg + 68.47) < 1e-6, 'an iceberg stands at the LAST point of its track, and remembers the first');
check(c18c && Math.abs(c18c.meta.sizeKm2 - 68.6) < 0.1, `20 square nautical miles is 68.6 km² (${c18c && c18c.meta.sizeKm2})`);
const telica = recs.find((r) => r.name === 'Telica Volcano, Nicaragua');
check(telica && telica.meta.kind === 'volcano' && telica.meta.sizeKm2 === null && telica.meta.agencies[0] === 'SIVolcano', 'a volcano has no size, and the Smithsonian is its source');
check(E.sizeKm2(100, 'hectares') === 1 && E.sizeKm2(5, 'kts') === null && E.sizeKm2(null, 'acres') === null && E.sizeKm2(-3, 'acres') === null, 'an unknown unit or no number is no size, never a guess');
check(E.eventKind({ categories: [{ id: 'severeStorms' }] }) === null && E.parseEonet({ events: [{ id: 'EONET_1', title: 'A storm', categories: [{ id: 'severeStorms' }], geometry: [{ date: '2026-10-01T00:00:00Z', type: 'Point', coordinates: [1, 2] }] }] }).length === 0, 'severe storms are the storms layer\'s and are not drawn twice');
check(E.parseEonet('not json').length === 0 && E.parseEonet({ events: [{ id: 'x', categories: [{ id: 'volcanoes' }], geometry: [{ type: 'Polygon', coordinates: [] }] }] }).length === 0 && E.parseEonet([fires, fires], { nowMs: READ }).length === 4, 'a broken answer, a shape that is not a point and a repeat give nothing extra');
check(E.parseEonet({ events: [{ id: 'y', title: 'Closed', closed: '2026-10-01T00:00:00Z', categories: [{ id: 'wildfires' }], geometry: [{ date: '2026-09-30T00:00:00Z', type: 'Point', coordinates: [1, 2] }] }] }).length === 0, 'a closed event is not drawn');

// ---- 2. when it is drawn -------------------------------------------------------------------------------
{
  const at = (r, t) => propagate(r, t);
  check(at(bear, READ) && at(bear, READ + 2 * D) && !at(bear, READ + 4 * D) && !at(bear, Date.parse('2026-09-01T00:00:00Z')), 'a fire is drawn from its report until three days after it was read, not before and not a week on');
  check(at(telica, Date.parse('2026-07-01T00:00:00Z')) && !at(telica, Date.parse('2026-05-01T00:00:00Z')), 'a volcano is drawn back to the day its eruption began');
  const p = at(bear, READ);
  check(p && p.frame === 'earth-fixed', 'in the Earth\'s own frame, on the ground');
}

// ---- 3. the card ---------------------------------------------------------------------------------------
{
  const ctx = { clock: { now: () => READ, mode: 'live' }, observer: null, records: () => recs };
  const X = COPY.earthEvent;
  const words = C.cardWords(bear, ctx);
  check(/^Prescribed Fire D3 Bear RX, Greenlee, Arizona is a fire that was here at its last report, 2 October 2026, about 21 km² at that report\.$/.test(words.sentence), `the first sentence: ${words.sentence}`);
  const rows = C.earthEventRows(bear);
  const row = (label) => (rows.find((r) => r[0] === label) || [])[1];
  check(row(X.rows.kind) === 'Fire' && row(X.rows.reported) === '2 October 2026' && row(X.rows.size) === '21 km²' && row(X.rows.by) === 'IRWIN, through NASA EONET' && /33\.4/.test(row(X.rows.where)), `the rows name what, when, how big, where and who (${JSON.stringify(rows)})`);
  const vrows = C.earthEventRows(telica);
  check(vrows.some((r) => r[0] === X.rows.since && r[1] === '30 May 2026') && !vrows.some((r) => r[0] === X.rows.size), 'a volcano says since when, and has no size row');
  check(C.earthEventRows(c18c).some((r) => r[0] === X.rows.first), 'an iceberg with a track says when it was first reported');
  const honest = C.honestyClause(bear, { tMs: READ });
  check(honest === 'One point from NASA’s EONET, last reported 2 October 2026 and read 7 October 2026. For looking, not an official record of where or when.', `the honesty line names the source, both dates and the caveat: ${honest}`);
  check(C.drawingLine(bear) === X.drawn && C.seeItLine(bear, ctx, { ok: true, frame: 'earth-fixed' }, null) === X.sky, 'it says it is drawn as a mark, and what it looks like from orbit');
  check(C.rightNowFor(bear, ctx).some((r) => r[0] === X.rows.kind), 'the card\'s rows are the report\'s, with no height or speed');
  check(C.klassLabel(bear) === 'Event on Earth' && C.heroKind(bear, { ok: true, frame: 'earth-fixed' }) === 'other', 'its badge, and no orbiter\'s three numbers');
}

// ---- 4. the fetch --------------------------------------------------------------------------------------
{
  const asked = [];
  const ok = (body) => ({ ok: true, status: 200, text: async () => body });
  const fake = (bodies) => async (url, init) => { asked.push({ url, init }); const b = bodies[asked.length - 1]; if (b === null) throw new Error('offline'); return b === 503 ? { ok: false, status: 503, text: async () => '' } : ok(b); };
  const both = await E.fetchEarthEvents({ fetch: fake([fires, rest]), nowMs: READ });
  check(both.length === 9 && asked.length === 2 && asked.every((a) => a.url.startsWith('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&') && a.init.credentials === 'omit' && a.init.referrerPolicy === 'no-referrer'), 'two requests to EONET, with no credentials and no referrer');
  check(/category=wildfires&days=30$/.test(E.EONET_URLS[0]) && /category=volcanoes,seaLakeIce$/.test(E.EONET_URLS[1]) && !E.EONET_URLS.join().includes('severeStorms'), 'fires by date, volcanoes and ice whole, storms not at all');
  asked.length = 0;
  const half = await E.fetchEarthEvents({ fetch: fake([503, rest]), nowMs: READ });
  check(half.length === 5, `one list failing leaves the other (${half.length})`);
  asked.length = 0;
  let threw = false;
  try { await E.fetchEarthEvents({ fetch: fake([null, null]), nowMs: READ }); } catch { threw = true; }
  check(threw, 'both failing is an error, which the layer reports as could not look');
}

// ---- 5. nothing at boot, and the evidence ---------------------------------------------------------------
{
  const layer = LAYERS.find((l) => l.id === 'earth-events');
  check(layer && layer.load === 'on-demand' && layer.defaultOn === false && Object.values(layer.moments).every((v) => v === false) && layer.source === 'weather' && layer.noModel === true, 'the layer is on demand, off in every moment, fetched by the page itself');
  const row = LAYER_ROWS.find((l) => l.id === 'earth-events');
  check(row && row.group === 'earth' && row.card === 'earthevent' && /- id: earth-events\n(?:.*\n){1,14}    load: on-demand/.test(readFileSync(join(ROOT, 'registry/layers.yaml'), 'utf8')), 'registry/layers.yaml puts it under Weather and ground, on demand');
  const src = readFileSync(join(JS, 'data/layers.js'), 'utf8');
  check(!/^import .*eonet/m.test(src) && /import\('\.\/eonet\.js'\)/.test(src), 'data/eonet.js is a dynamic import of the layers table');
  for (const f of ['main.js', 'ui/cards.js', 'ui/whattoshow.js']) check(!/import[^\n]*eonet\.js/.test(readFileSync(join(JS, f), 'utf8')), `${f} does not import it`);
  // The layer's own loader, with the fetch stubbed: records come back through loadLayerDetailed.
  const real = globalThis.fetch;
  let n = 0;
  globalThis.fetch = async () => { n += 1; const body = n === 1 ? fires : rest; return { ok: true, status: 200, text: async () => body }; };
  const got = await loadLayerDetailed(layer, READ);
  globalThis.fetch = async () => { throw new Error('offline'); };
  const none = await loadLayerDetailed(layer, READ);
  globalThis.fetch = real;
  check(got.records.length === 9 && got.error === null && got.records.every((r) => r.layer === 'earth-events'), `the layer loads its nine records (${got.records.length}, ${got.error})`);
  check(none.records.length === 0 && typeof none.error === 'string' && none.error.length > 0, 'and with no network it has none and says why');
  const w = WEATHER.find((r) => r.id === 'earth-events');
  const wy = readFileSync(join(ROOT, 'registry/weather.yaml'), 'utf8');
  const mine = wy.slice(wy.indexOf('  - id: earth-events'), wy.indexOf('  - id: jupiter-bands'));
  check(w && w.class === 'measured' && w.layer === 'earth-events' && /url: "https:\/\/eonet\.gsfc\.nasa\.gov\/api\/v3\/events"/.test(mine) && /cors: "access-control-allow-origin: \*"/.test(mine) && /read: 2026-10-07/.test(mine) && /general information purposes only/.test(mine) && /not every fire/.test(mine), 'registry/weather.yaml carries the host, the CORS header as measured, the day and the terms');
  check(/eonet\.gsfc\.nasa\.gov/.test(readFileSync(join(ROOT, 'CREDITS.md'), 'utf8')), 'CREDITS.md names EONET');
  check(/sr-swatch--earthevent/.test(readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8')), 'its swatch has a colour');
}

if (problems.length) { console.error('eonet FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`eonet ok: ${recs.length} events from the fixture as points with a date; a fire of 5 072 acres is 21 km²; drawn for three days after it was read; two requests, none at boot`);
