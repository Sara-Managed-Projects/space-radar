// tests/test_catalog_numbers.mjs -- a NORAD catalogue number is read, ranged and keyed in one place
// (site/js/data/catnum.js), and an object numbered 100 000 and up is an object like any other.
//
//   node tests/test_catalog_numbers.mjs
//
// WHAT COULD VISIBLY CHANGE. Until 2026-10-14 data/parsers.js read every number of 90 000 and up as
// a placeholder. The five-digit catalogue ran out on 2026-07-11 (CelesTrak), so every object
// catalogued since is numbered 100 000 and up: 772 objects on the live copy of 2026-10-12, Sentinel-3C
// (100690) among them, were drawn at 70 %, classed `inferred` however fresh, carded "not yet in the
// public catalogue", left out of the weekly stories, keyed `int-<designator>` instead of `sat-<n>`,
// and the Today panel named the wrong newest launch. So:
//   1. the helper's table: five digits, Alpha-5 both ways (A0001 <-> 100001, no I, no O), nine-digit
//      OMM numbers, and every documented range edge;
//   2. the parser on REAL rows either side of the five-digit end (tests/fixtures/snapshots/
//      celestrak-past-99999.json, cut from the copies the site served), held to the satcat rows of
//      the same objects, which is the authority saying they are catalogued;
//   3. a share link round trip: the record's id -> share.js -> the hash -> urlstate.js -> the record,
//      by number (`100690`, Alpha-5 `A0690`) and by the old `int-` id, and the light embed's reading;
//   4. no precision lost: the column twin carries a nine-digit number exactly, and no site code packs a
//      catalogue number into a typed array that cannot hold one.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const N = await import(join(JS, 'data/catnum.js'));
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
const { parseSatcat } = await import(join(JS, 'data/satcat.js'));
const { decodeColumns } = await import(join(JS, 'data/columnar.js'));
const { shareUrl } = await import(join(JS, 'ui/share.js'));
const { read } = await import(join(JS, 'ui/urlstate.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const eq = (got, want, what) => check(Object.is(got, want), `${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// --- 1. the table -------------------------------------------------------------------------------
// [value, catalogNumber, alpha5 of that number, range]
const TABLE = [
  [5, 5, '00005', 'catalogued'],
  ['00005', 5, '00005', 'catalogued'],
  [25544, 25544, '25544', 'catalogued'],
  [' 25544 ', 25544, '25544', 'catalogued'],
  [69999, 69999, '69999', 'catalogued'], // the last five-digit number (CelesTrak: "run out ... at 69999")
  [70000, 70000, '70000', 'reserved'],
  [80000, 80000, '80000', 'analyst'], // Space-Track's analyst range, 80 000-89 999
  [89999, 89999, '89999', 'analyst'],
  [90000, 90000, '90000', 'reserved'],
  [99999, 99999, '99999', 'reserved'],
  [100000, 100000, 'A0000', 'catalogued'], // Space-Track's own example, "100000 => A0000"
  ['A0000', 100000, 'A0000', 'catalogued'],
  ['A0001', 100001, 'A0001', 'catalogued'],
  [100001, 100001, 'A0001', 'catalogued'],
  ['A0690', 100690, 'A0690', 'catalogued'], // Sentinel-3C
  ['a0690', 100690, 'A0690', 'catalogued'],
  ['H9999', 179999, 'H9999', 'catalogued'],
  ['J0000', 180000, 'J0000', 'catalogued'], // I is skipped: H = 17, J = 18
  ['N9999', 229999, 'N9999', 'catalogued'],
  ['P0000', 230000, 'P0000', 'catalogued'], // O is skipped: N = 22, P = 23
  ['S9999', 269999, 'S9999', 'catalogued'],
  ['T0000', 270000, 'T0000', 'analyst'], // Space Fence analyst objects, CelesTrak's "27xxxx"
  [270438, 270438, 'T0438', 'analyst'],
  ['Z9999', 339999, 'Z9999', 'analyst'], // Alpha-5's last
  [340000, 340000, null, 'catalogued'], // beyond Alpha-5: OMM only
  ['100690', 100690, 'A0690', 'catalogued'], // OMM CSV text
  [798999999, 798999999, null, 'catalogued'],
  [799000000, 799000000, null, 'launch-nominal'], // 18 SDS launch nominals, 799xxxxxx
  [799512345, 799512345, null, 'launch-nominal'], // and its analyst range, 7995xxxxx
  [799999999, 799999999, null, 'launch-nominal'],
  [800000000, 800000000, null, 'catalogued'],
  [999999999, 999999999, null, 'catalogued'],
  ['999999999', 999999999, null, 'catalogued'],
];
for (const [value, n, a5, range] of TABLE) {
  eq(N.catalogNumber(value), n, `catalogNumber(${JSON.stringify(value)})`);
  eq(N.alpha5(n), a5, `alpha5(${n})`);
  if (a5) eq(N.catalogNumber(a5), n, `catalogNumber(alpha5(${n}))`);
  eq(N.catalogRange(value), range, `catalogRange(${JSON.stringify(value)})`);
  eq(N.isCatalogued(value), range === 'catalogued', `isCatalogued(${JSON.stringify(value)})`);
  eq(N.satId(value), range === 'catalogued' ? `sat-${n}` : null, `satId(${JSON.stringify(value)})`);
}
for (const bad of [0, -5, 1.5, NaN, Infinity, 1000000000, '1000000000', '', 'ISS', 'I0000', 'O0000', 'A000', 'A00000', '25544U', null, undefined, {}]) {
  eq(N.catalogNumber(bad), null, `catalogNumber(${String(bad)}) is not a number`);
  eq(N.catalogRange(bad), null, `catalogRange(${String(bad)})`);
  eq(N.satId(bad), null, `satId(${String(bad)})`);
}
// Alpha-5 both ways, over the whole range: one number, one field.
for (let n = 100000; n <= 339999; n += 997) eq(N.catalogNumber(N.alpha5(n)), n, `Alpha-5 round trip of ${n}`);
// a TLE's first line, columns 3-7
eq(N.tleCatalogNumber('1 25544U 98067A   26285.50000000  .00010000  00000-0  18000-3 0  9990'), 25544, 'a five-digit TLE');
eq(N.tleCatalogNumber('1 A0690U 26209B   26285.16089526  .00000041  00000-0  36000-4 0  9993'), 100690, 'an Alpha-5 TLE');
eq(N.tleCatalogNumber('2 25544  51.6400 '), null, 'line 2 is not line 1');
// what a link says
for (const text of ['100690', 'A0690', 'a0690', 'sat-100690', 'SAT-100690']) eq(N.satIdOf(text), 'sat-100690', `satIdOf(${text})`);
for (const text of ['85000', 'europa', 'int-2026-209B', 'sat-', 'sat-799000123', '']) eq(N.satIdOf(text), null, `satIdOf(${text})`);

// --- 2. the parser on real rows ---------------------------------------------------------------------
const fixture = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/snapshots/celestrak-past-99999.json'), 'utf8'));
const recs = parseCelestrakGP(fixture.body, { source: 'celestrak-active' });
const satcat = new Map(parseSatcat(fixture.satcat).map((r) => [r.id, r]));
eq(recs.length, 5, 'the five real rows give five records');
for (const r of recs) {
  const n = r.meta.catalogueNumber;
  eq(r.id, `sat-${n}`, `${r.name} is keyed by its number`);
  eq(r.meta.noradId, n, `${r.name} has its NORAD id`);
  eq(r.meta.provisional, false, `${r.name} is not provisional`);
  const row = satcat.get(n);
  check(!!row && row.intl === r.meta.intlDesignator, `${r.name} (${n}) is the satcat's own ${n} (${row && row.intl} vs ${r.meta.intlDesignator})`);
}
const s3c = recs.find((r) => r.meta.catalogueNumber === 100690);
check(!!s3c && s3c.name === 'SENTINEL-3C' && s3c.id === 'sat-100690', `Sentinel-3C is sat-100690 (${s3c && s3c.id})`);
// the satcat: the last five-digit number is 69999 and the next object is 100000, nothing between
const ids = [...parseSatcat(fixture.satcat).map((r) => r.id)].sort((a, b) => a - b);
check(ids.includes(69999) && ids.includes(100000) && !ids.some((n) => n > 69999 && n < 100000), `the fixture's satcat jumps 69999 -> 100000 (${ids})`);
// a stand-in number still is one
const nominal = parseCelestrakGP([{ ...fixture.body[0], NORAD_CAT_ID: 799000123, OBJECT_ID: '2026-999A' }], { source: 'celestrak-supplemental-starlink' })[0];
check(nominal && nominal.meta.provisional === true && nominal.id === 'int-2026-999A' && nominal.meta.noradId === null, 'a launch-nominal number is still a stand-in, keyed by its designator');
const analyst = parseCelestrakGP([{ ...fixture.body[0], NORAD_CAT_ID: 85000, OBJECT_ID: '' }], { source: 'celestrak-x' })[0];
check(analyst && analyst.meta.provisional === true && analyst.id === 'celestrak-x-0', `an analyst number with no designator is keyed by its source (${analyst && analyst.id})`);

// --- 3. a share link round trip -------------------------------------------------------------------
const byId = new Map(recs.map((r) => [r.id, r]));
const url = shareUrl({ at: s3c.id }, 'https://www.spaceradar.ai/');
eq(url, 'https://www.spaceradar.ai/#at=sat-100690', 'the share link names the number');
globalThis.location = { hash: new URL(url).hash };
const back = read();
check(byId.get(back.at) === s3c, `the link reads back to Sentinel-3C (${back.at})`);
for (const typed of ['100690', 'A0690']) {
  globalThis.location = { hash: `#at=${typed}` };
  check(byId.get(N.satIdOf(read().at)) === s3c, `#at=${typed} names Sentinel-3C`);
}
delete globalThis.location;
// main.js resolveAt (not importable in node): numbers through the helper, and the old `int-` ids still open
const main = readFileSync(join(JS, 'main.js'), 'utf8');
const resolve = main.slice(main.indexOf('function resolveAt('), main.indexOf('function openAt('));
check(/import \{ satIdOf \} from '\.\/data\/catnum\.js';/.test(main) && resolve.includes('satIdOf(text)'), 'main.js resolveAt reads a number through data/catnum.js');
check(!/sat-\$\{text\}/.test(resolve), 'main.js resolveAt does not build `sat-<text>` by hand');
check(/\/\^int-\(\.\+\)\$\/\.exec\(text\)/.test(resolve) && resolve.includes('intlDesignator === intl[1]'), 'a link made before 2026-10-14 (#at=int-2026-209B) still opens its object');
const L = await import(join(JS, 'embedlite.js'));
eq(JSON.stringify(L.liteTarget('?embed=1&at=100690')), '{"kind":"station","id":"sat-100690"}', 'the light embed reads 100690');
eq(JSON.stringify(L.liteTarget('?embed=1&at=A0690')), '{"kind":"station","id":"sat-100690"}', 'the light embed reads A0690');
eq(L.liteTarget('?embed=1&at=85000'), null, 'an analyst number is not a light-embed target');

// --- 4. no precision lost ----------------------------------------------------------------------------
// The column twin (scripts/columnar.py -> data/columnar.js) is JSON numbers: nine digits come back exact.
const rows = fixture.body.map((r, i) => ({ ...r, NORAD_CAT_ID: [100690, 799512345, 999999999, 5, 339999][i] }));
const twin = JSON.parse(execFileSync('python3', ['-c', `import sys, json\nsys.path.insert(0, ${JSON.stringify(join(ROOT, 'scripts'))})\nimport columnar\nprint(json.dumps({"format": columnar.FORMAT, "rows": len(json.load(sys.stdin)), "columns": columnar.encode(json.loads(sys.argv[1]))}))`, JSON.stringify(rows)], { input: JSON.stringify(rows), encoding: 'utf8' }));
const decoded = decodeColumns(twin).map((r) => r.NORAD_CAT_ID);
eq(JSON.stringify(decoded), JSON.stringify(rows.map((r) => r.NORAD_CAT_ID)), 'the column twin carries nine-digit catalogue numbers exactly');
// Why a narrow typed array must never hold one: these lose it.
check(Math.fround(799512345) !== 799512345 && new Uint16Array([100690])[0] !== 100690 && new Int16Array([40697])[0] !== 40697, 'Float32, Uint16 and Int16 cannot hold a catalogue number');
// ...and no site code puts one there: a line naming a catalogue field names no narrow typed array.
const NARROW = /\b(?:Float32Array|Float16Array|Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array)\b|Math\.fround/;
const FIELD = /\b(?:noradId|catalogueNumber|NORAD_CAT_ID|satnum)\b/;
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
});
let scanned = 0;
for (const file of walk(JS)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  if (!lines.some((l) => FIELD.test(l))) continue;
  scanned += 1;
  lines.forEach((l, i) => { if (FIELD.test(l) && NARROW.test(l)) problems.push(`${relative(ROOT, file)}:${i + 1} packs a catalogue number into a narrow typed array`); });
}
check(scanned >= 10, `the scan read the files that name a catalogue field (${scanned})`);

if (problems.length) { console.error('catalog numbers FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`catalog numbers ok: ${TABLE.length} table rows and the Alpha-5 round trip; five real rows either side of 99 999 keyed sat-<n> and confirmed by the satcat; `
  + `the share link round trip by id, number, Alpha-5 and old int- id; nine digits survive the column twin; no narrow typed array holds one (${scanned} files scanned)`);
