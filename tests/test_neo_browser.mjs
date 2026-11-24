// tests/test_neo_browser.mjs -- the near-Earth asteroid catalogue (research train "catalogues", forge #560).
//
//   node tests/test_neo_browser.mjs
//
// What it holds: the delta-v is Shoemaker and Helin's, to six of Lance Benner's published values within 1 %; a size from H is
// CNEOS's range; every CNEOS approach in the bundled file joins a row with an orbit; the next pass is the first after now; the
// filters; a row the map has no record of becomes a record whose two-body place lies on its orbit; the packed point tiers read
// back to their orbits within the rounding and are in budget; the saved copy is a registry row the browser reads first.
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const N = await import(join(JS, 'data/neocat.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const cloud = await import(join(JS, 'scene/asteroidcloud.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { filterNeo, sizeText } = await import(join(JS, 'ui/neobrowser.js'));

// --- delta-v ------------------------------------------------------------------------------------------------------------
// Benner's rendezvous table (echo.jpl.nasa.gov/~lance/delta_v/delta_v.rendezvous.html, 2013, as the MIT-licensed Asterank
// repository keeps it in data/pipeline/out/deltav/db.csv), against JPL's elements of 2026-11-24 (SBDB, epoch JD 2461200.5).
const BENNER = [
  ['101955 Bennu (1999 RQ36)', 1.126391025894812, 0.2037450762416414, 6.03494377024794, 5.087],
  ['1991 VG', 1.032344696903566, 0.05250367125371361, 1.429664294627039, 3.998],
  ['1999 AO10', 0.9120145031259664, 0.1109040287099387, 2.579727052454163, 5.379],
  ['2000 SG344', 0.9774830528591593, 0.06690808733689509, 0.1131132433726803, 4.156],
  ['2001 FR85', 0.9828276788139952, 0.02790088936520501, 5.246326107484063, 5.064],
  ['2006 RH120', 1.033232818800996, 0.02449745482749494, 0.5943471837144731, 3.813],
];
for (const [name, a, e, i, want] of BENNER) {
  const dv = N.deltaV(a, e, i);
  check(Number.isFinite(dv) && Math.abs(dv - want) / want < 0.01, `${name}: delta-v ${dv && dv.toFixed(3)} km/s, Benner ${want} (1 % allowed)`);
}
// By hand: the Earth's own orbit (a 1, e 0, i 0) is the Apollo branch with every term but leaving low Earth orbit zero:
// F = U0 (sqrt 2 - 1), U0 = 7.727 / 29.784, and dv = 30 F + 0.5 = 3.724 km/s.
check(near(N.deltaV(1, 0, 0), 30 * (7.727 / 29.784) * (Math.SQRT2 - 1) + 0.5, 1e-9), 'the Earth\'s own orbit works out by hand');
check(N.deltaV(1, 1.2, 0) === null && N.deltaV(-1, 0.1, 0) === null && N.deltaV(1, 0.1, NaN) === null, 'no orbit, no number');
check(N.deltaV(2.5, 0.6, 40) > N.deltaV(2.5, 0.6, 5), 'a steeper orbit costs more');

// --- size from H --------------------------------------------------------------------------------------------------------
const s1 = N.sizeFromH(17.75);
check(near(s1.minKm, 0.749, 0.002) && near(s1.maxKm, 1.675, 0.003), `H 17.75 is 0.75 to 1.7 km (CNEOS's kilometre line): ${s1.minKm.toFixed(3)} to ${s1.maxKm.toFixed(3)}`);
const s2 = N.sizeFromH(22);
check(near(Math.sqrt(s2.minKm * s2.maxKm), 0.140, 0.03), 'H 22 is about 140 m, the hazardous line');
check(N.sizeKm({ diameterKm: 0.49, H: 20 }) === 0.49, 'a measured diameter wins over the estimate');
check(/estimated/.test(sizeText({ diameterKm: null, H: 22 })) && !/estimated/.test(sizeText({ diameterKm: 1.2, H: 17 })), 'an estimate says so, a measurement does not');
check(sizeText({ diameterKm: 0.35, H: 20 }) === '350 m' && sizeText({ diameterKm: 16.84, H: 10.4 }) === '17 km', 'metres under a kilometre, kilometres above');

// --- the bundled file ---------------------------------------------------------------------------------------------------
const json = JSON.parse(readFileSync(join(ROOT, 'site/data/neo-browser.json'), 'utf8'));
const data = N.readFile(json);
check(data.rows.length === json.counts.rows && data.rows.length > 4000, `the file reads to its ${json.counts.rows} rows`);
check(data.counts.rows < data.counts.neo, 'it says it is not every near-Earth asteroid, and how many there are');
const pdes = new Set(data.rows.map((r) => r.pdes));
check(pdes.size === data.rows.length, 'no asteroid twice');
const lost = data.approaches.filter((a) => !pdes.has(a.pdes) && !(json.unjoined || []).includes(a.pdes));
check(lost.length === 0, `every CNEOS approach joins a row with an orbit, or is listed as unjoined (${lost.length} lost)`);
check(data.rows.every((r) => r.why >= 1 && r.why <= 7 && N.CLASSES.includes(r.cls) && r.a > 0 && r.e >= 0 && r.e < 1), 'every row is there for a reason, with an orbit and a class');
check(data.rows.filter((r) => r.pha).length === json.counts.pha, 'every hazardous one is in it');
const bennu = data.rows.find((r) => r.pdes === '101955');
check(bennu && bennu.pha && bennu.name === 'Bennu' && bennu.label === '101955 Bennu', 'Bennu is "101955 Bennu", hazardous');

// --- the passes ---------------------------------------------------------------------------------------------------------
const rows = [{ pdes: 'A', label: 'A', name: '', why: 4, cls: 'APO' }, { pdes: 'B', label: 'B', name: 'Bee', why: 1, cls: 'ATE' }];
const list = [{ pdes: 'A', tMs: 100, distAu: 0.01, vKmS: 5 }, { pdes: 'A', tMs: 300, distAu: 0.02, vKmS: 6 }, { pdes: 'A', tMs: 200, distAu: 0.03, vKmS: 7 }, { pdes: 'Z', tMs: 500, distAu: 0.04, vKmS: 8 }];
const joined = N.withApproaches(rows, list, 150);
check(joined[0].next.tMs === 200 && joined[0].passes === 2 && near(joined[0].next.ld, 0.03 * 149597870.7 / 384400, 1e-9), 'the next pass is the first after now, in lunar distances, and the passes still to come are counted');
check(joined[1].next === null && joined.unjoined.join() === 'Z', 'a rock with no pass has none; a pass of a rock with no orbit is named, not drawn');
check(rows[0].next === undefined, 'the rows given are not changed');
const cad = { fields: ['des', 'orbit_id', 'jd', 'cd', 'dist', 'v_rel'], data: [['2026 VV11', '3', '2461370.388980047', '2026-Nov-25 21:20', '0.0414932467382157', '8.72993134451695'], ['bad', '1', 'x', '', 'y', '1']] };
const fromCad = N.approachesFromCad(cad);
check(fromCad.length === 1 && fromCad[0].pdes === '2026 VV11' && new Date(fromCad[0].tMs).toISOString().slice(0, 16) === '2026-11-25T21:20', 'our saved copy of CNEOS reads to the same shape, its time from the Julian date');
check(N.approachesFromCad(null).length === 0 && N.approachesFromCad({ count: 0 }).length === 0, 'an empty or missing copy is no passes');

// --- the filters --------------------------------------------------------------------------------------------------------
const pool = [
  { pdes: '433', label: '433 Eros', name: 'Eros', why: 2, cls: 'AMO', next: null },
  { pdes: '99942', label: '99942 Apophis', name: 'Apophis', why: 5, cls: 'ATE', next: { tMs: 1 } },
  { pdes: '2024 YR4', label: '2024 YR4', name: '', why: 4, cls: 'APO', next: { tMs: 2 } },
];
const ids = (f) => filterNeo(pool, f).map((r) => r.pdes).join();
check(ids({ which: 'pha' }) === '99942' && ids({ which: 'km' }) === '433' && ids({ which: 'close' }) === '99942,2024 YR4', 'which: hazardous, a kilometre, passing close');
check(ids({ cls: 'APO' }) === '2024 YR4' && ids({ q: 'apo' }) === '99942' && ids({ q: 'yr4' }) === '2024 YR4' && ids({}) === '433,99942,2024 YR4', 'the orbit class and the name');

// --- a record of its own ------------------------------------------------------------------------------------------------
await import(join(JS, 'copy/en.neo.js'));
const yr4 = data.rows.find((r) => !r.pha && !(r.why & 1) && r.why & 4) || data.rows[0];
const rec = N.recordFor({ ...yr4, next: null });
check(rec.propagator === 'kepler' && rec.frame === 'sun-inertial' && rec.cls === 'inferred' && rec.klass === 'asteroid' && rec.id.startsWith('neo-'), 'a record like the layers\', called inferred');
const p = propagate(rec, Date.parse('2027-01-01T00:00:00Z'));
const rAu = p ? Math.hypot(p.x, p.y, p.z) / 149597870.7 : NaN;
check(rAu >= yr4.a * (1 - yr4.e) - 1e-6 && rAu <= yr4.a * (1 + yr4.e) + 1e-6, `its place is on its orbit (${rAu.toFixed(3)} AU, between perihelion and aphelion)`);
check(rec.meta.why.includes(COPY.neo.reasons.close) && !/\{/.test(rec.meta.why), 'its card says why it is in the catalogue');

// --- the points ---------------------------------------------------------------------------------------------------------
const meta = JSON.parse(readFileSync(join(ROOT, 'site/data/asteroids/cloud.json'), 'utf8'));
const t0 = readFileSync(join(ROOT, 'site/data/asteroids', meta.tiers[0].file));
const els = cloud.unpack(t0.buffer.slice(t0.byteOffset, t0.byteOffset + t0.byteLength));
check(els.n === meta.tiers[0].count && els.tier === 0, 'a tier reads back to its count');
let bad = 0;
for (let k = 0; k < els.n; k++) if (!(els.a[k] >= 0.6 && els.a[k] <= 100 && els.e[k] < 1 && els.i[k] <= Math.PI)) bad++;
check(bad === 0, `every packed orbit is an orbit (${bad} not)`);
// 1 Ceres is the brightest numbered asteroid that is not a dwarf planet beyond: a 2.77 au, e 0.0796, i 10.59 degrees (SBDB)
let ceres = -1;
for (let k = 0; k < 50; k++) if (near(els.a[k], 2.77, 0.01) && near(els.e[k], 0.0796, 0.002) && near(els.i[k] * 180 / Math.PI, 10.59, 0.02)) ceres = k;
check(ceres >= 0, 'Ceres is among the first rows, to the rounding');
// pack and unpack by hand: the rounding is a ten-thousandth of a at worst
const span = Math.log(100 / 0.6);
for (const a of [0.7, 1.0, 2.77, 5.2, 39.5]) {
  const q = Math.round(Math.log(a / 0.6) / span * 65535);
  const back = 0.6 * Math.exp(q / 65535 * span);
  check(Math.abs(back - a) / a < 1e-4, `a = ${a} au survives the packing (${back})`);
}
const circ = { n: 1, epochMs: 0, a: Float32Array.of(1), e: Float32Array.of(0), i: Float32Array.of(0), om: Float32Array.of(0), w: Float32Array.of(0), ma: Float32Array.of(0) };
const out = new Float32Array(3);
cloud.positionsAt(circ, 0, out);
check(near(out[0], 1, 1e-6) && near(out[1], 0, 1e-6), 'a circle at 1 au starts at perihelion');
cloud.positionsAt(circ, 365.2568984 / 4 * 86400000, out);
check(near(out[0], 0, 1e-3) && near(out[1], 1, 1e-3), 'and is a quarter round a quarter of a sidereal year later');
check(cloud.groupOf(1.4, 0.3) === 0 && cloud.groupOf(2.7, 0.1) === 1 && cloud.groupOf(5.2, 0.1) === 2 && cloud.groupOf(30, 0.1) === 3, 'near-Earth, the belt, the Trojans, beyond');
check(meta.tiers.reduce((n, t) => n + t.count, 0) < meta.numbered, 'the line can say how many of how many: the cloud is not every asteroid');

// --- budgets ------------------------------------------------------------------------------------------------------------
const budgets = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');
const row = (id) => { const m = new RegExp(`id: ${id}, value: (\\d+)`).exec(budgets); return m ? Number(m[1]) : NaN; };
const fileBytes = statSync(join(ROOT, 'site/data/neo-browser.json')).size;
check(fileBytes <= row('neo_browser_bytes'), `site/data/neo-browser.json is ${fileBytes} B, the budget neo_browser_bytes ${row('neo_browser_bytes')}`);
for (const t of meta.tiers) {
  const b = statSync(join(ROOT, 'site/data/asteroids', t.file)).size;
  check(b <= row('asteroid_cloud_tier_bytes'), `${t.file} is ${b} B, the budget asteroid_cloud_tier_bytes ${row('asteroid_cloud_tier_bytes')}`);
}
check(meta.tiers.length <= row('asteroid_cloud_tiers'), `${meta.tiers.length} tiers, the budget asteroid_cloud_tiers ${row('asteroid_cloud_tiers')}`);

// --- the saved copy -----------------------------------------------------------------------------------------------------
const reg = readFileSync(join(ROOT, 'registry/sources.yaml'), 'utf8');
check(/- id: jpl-cad-decade\n[\s\S]*?browser: false[\s\S]*?parser: jpl_cad/.test(reg), 'the ten-year list is a harvested row, never fetched by a browser, with jpl-cad\'s guard');
const { SOURCES } = await import(join(JS, 'data/sources.js'));
check(SOURCES['jpl-cad-decade'] && SOURCES['jpl-cad-decade'].browser === false, 'and the page knows it (data/sources.js)');
const view = readFileSync(join(JS, 'ui/neobrowser.js'), 'utf8');
check(/load\('jpl-cad-decade'/.test(view) && /approachesFromCad\(saved\.data\)/.test(view), 'the view reads our saved copy\'s passes before the bundled ones');
check(/import\('\.\.\/scene\/asteroidcloud\.js'\)/.test(view) && /hide\(\) \{ if \(cloud/.test(view), 'the points are fetched on the switch and switched off when the view is left');
check(!/track\('(?!select_object|layer_toggle)/.test(view), 'only the contract\'s event names');

if (problems.length) { console.error(`neo browser FAILED (${problems.length}):\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`neo browser ok: delta-v within 1 % of six of Benner's values, sizes from H as CNEOS's, ${data.approaches.length} approaches all joined to ${data.rows.length} orbits, the next pass after now, filters, a record on its orbit, ${meta.tiers.length} point tiers that read back within a ten-thousandth, in budget, and the saved copy first`);
