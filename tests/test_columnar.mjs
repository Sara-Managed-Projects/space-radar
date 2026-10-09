// tests/test_columnar.mjs -- a saved catalogue published as columns decodes to the verbatim rows
// (internal #523), and the browser falls back to the verbatim file on any doubt.
//
//   node tests/test_columnar.mjs
//   node tests/test_columnar.mjs --measure=/path/to/celestrak-active.json    # sizes and parse times of a whole file
//
// WHAT COULD VISIBLY CHANGE: a satellite in the wrong place. A column file that lost a row, put
// one row's inclination beside another's name, or rounded a mean motion would draw exactly that.
// So, on a cut of the copy the live site served on 2026-10-08 (the first, a middle and the last
// 40 rows of CelesTrak's active catalogue):
//   1. scripts/columnar.py encodes it and data/columnar.js decodes it, and the result is
//      deep-equal to the verbatim rows: every key, in order, every value, of the same type.
//   2. data/parsers.js parseCelestrakGP() gives the same records from both.
//   3. data/sources.js load() reads the column file when the manifest names it, and the verbatim
//      file when the column file is missing, is not JSON, is from another publish, or does not
//      add up -- and hands the same rows on in every case.
//   4. A body that is not uniform flat rows is refused by the encoder and published as before.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { decodeColumns, COLUMNS_FORMAT } = await import(join(ROOT, 'site/js/data/columnar.js'));
const { parseCelestrakGP } = await import(join(ROOT, 'site/js/data/parsers.js'));

let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.error(`FAIL: ${what}`); } };
const same = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch { return false; } };
const tmp = mkdtempSync(join(tmpdir(), 'sr-columnar-'));
// scripts/columnar.py through its own functions, with the row floor lowered for a small fixture.
const py = (code, ...args) => execFileSync('python3', ['-c', `import sys, json\nsys.path.insert(0, ${JSON.stringify(join(ROOT, 'scripts'))})\nimport columnar\n${code}`, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 });
const twinOf = (path, out) => py('columnar.MIN_ROWS = 2\no = columnar.column_file(json.load(open(sys.argv[1])))\nopen(sys.argv[2], "w").write(json.dumps(o, separators=(",", ":")) if o else "null")', path, out);

const measure = (process.argv.find((a) => a.startsWith('--measure=')) || '').slice(10);
if (measure) {
  const out = join(tmp, 'whole.cols.json');
  py('o = columnar.column_file(json.load(open(sys.argv[1])))\nopen(sys.argv[2], "w").write(json.dumps(o, separators=(",", ":")))', measure, out);
  const a = readFileSync(measure); const b = readFileSync(out);
  const br = (buf, q) => zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: q } }).length;
  const time = (fn) => { let best = Infinity; for (let i = 0; i < 5; i++) { const t = performance.now(); fn(); best = Math.min(best, performance.now() - t); } return best; };
  const verbatim = JSON.parse(a).body;
  const tA = time(() => JSON.parse(a.toString('utf8')).body);
  const tB = time(() => decodeColumns(JSON.parse(b.toString('utf8'))));
  check(same(decodeColumns(JSON.parse(b)), verbatim), 'the whole file decodes to its verbatim rows');
  console.log(`measured on ${measure} (${verbatim.length} rows): verbatim ${a.length} B raw, ${br(a, 5)} B at Brotli 5; columns ${b.length} B raw, ${br(b, 5)} B at Brotli 5; `
    + `parse to rows ${tA.toFixed(0)} ms verbatim, ${tB.toFixed(0)} ms columns (best of 5, this machine)`);
}

// --- 1. the rows --------------------------------------------------------------------------------
const fixture = join(ROOT, 'tests/fixtures/snapshots/celestrak-active-cut.json');
const snapshot = JSON.parse(readFileSync(fixture, 'utf8'));
const verbatim = snapshot.body;
twinOf(fixture, join(tmp, 'cut.cols.json'));
const twinText = readFileSync(join(tmp, 'cut.cols.json'), 'utf8');
const twin = JSON.parse(twinText);
check(verbatim.length === 120 && Object.keys(verbatim[0]).length === 17, `the fixture is 120 real rows of 17 keys (${verbatim.length}, ${Object.keys(verbatim[0]).length})`);
check(twin && twin.format === COLUMNS_FORMAT && twin.rows === 120 && twin.columns.keys.length === 17 && !('body' in twin), 'the twin holds 17 columns of 120 and no body');
check(twin.fetched_at === snapshot.fetched_at && twin.valid_until === snapshot.valid_until && twin.source === snapshot.source && twin.schema === snapshot.schema, 'and the same stamps as the verbatim file');
const rows = decodeColumns(twin);
check(same(rows, verbatim), 'the decoded rows are the verbatim rows: every key and every value');
check(rows.every((r, i) => JSON.stringify(Object.keys(r)) === JSON.stringify(Object.keys(verbatim[i]))), 'with the keys in the same order');
check(JSON.stringify(rows) === JSON.stringify(verbatim), 'and they print to the same text');
check(twinText.length < readFileSync(fixture, 'utf8').length * 0.45, `the twin is under 45 % of the verbatim text (${twinText.length} of ${readFileSync(fixture, 'utf8').length})`);

// --- 2. the parser ------------------------------------------------------------------------------
const a = parseCelestrakGP(verbatim);
const b = parseCelestrakGP(rows);
check(a.length === 120 && same(a, b), `parseCelestrakGP gives the same ${a.length} records from both`);

// --- a decoder that refuses rather than guesses -------------------------------------------------
const broken = (change) => { const t = JSON.parse(twinText); change(t); try { decodeColumns(t); return false; } catch { return true; } };
check(broken((t) => { t.columns.cols[3].pop(); }), 'a column one short is refused');
check(broken((t) => { t.rows = 119; }), 'a row count that is not the columns\' is refused');
check(broken((t) => { t.columns.keys.pop(); }), 'a key without its column is refused');
check(broken((t) => { t.columns.keys[1] = t.columns.keys[0]; }), 'a repeated key is refused');
check(broken((t) => { t.format = 'columns-2'; }), 'another format is refused');
check(broken((t) => { delete t.columns; }), 'a file with no columns is refused');

// --- 4. what the encoder leaves alone -----------------------------------------------------------
const refuses = (body) => { const p = join(tmp, 'x.json'); writeFileSync(p, JSON.stringify({ schema: 1, source: 'x', body })); twinOf(p, join(tmp, 'x.cols.json')); return readFileSync(join(tmp, 'x.cols.json'), 'utf8') === 'null'; };
check(refuses([{ a: 1, b: 2 }, { a: 1 }]), 'a row missing a key: not encoded');
check(refuses([{ a: 1, b: 2 }, { b: 2, a: 1 }]), 'rows with their keys in another order: not encoded');
check(refuses([{ a: 1, b: { nested: true } }, { a: 2, b: {} }]), 'a nested value (the launches): not encoded');
check(refuses({ fields: ['a'], data: [[1]] }), 'a body that is not a list (JPL\'s tables): not encoded');
check(refuses('NORAD_CAT_ID,NAME\n1,A\n'), 'CSV text (the SATCAT): not encoded');
check(!refuses([{ a: null, b: 'x', c: 1.5e-7, d: true }, { a: 0, b: '', c: -3, d: false }]), 'nulls, empty strings, small numbers and booleans are values like any other');

// --- 3. the browser's reader --------------------------------------------------------------------
const store = new Map();
globalThis.localStorage = { get length() { return store.size; }, key: (i) => [...store.keys()][i] ?? null, getItem: (k) => (store.has(k) ? store.get(k) : null), removeItem: (k) => { store.delete(k); }, setItem: (k, v) => { store.set(k, String(v)); } };
delete globalThis.caches;
const future = new Date(Date.now() + 3600e3).toISOString().replace(/\.\d+Z$/, 'Z');
const stamp = new Date(Date.now() - 600e3).toISOString().replace(/\.\d+Z$/, 'Z');
const file = { ...snapshot, fetched_at: stamp, valid_until: future };
const cols = { ...twin, fetched_at: stamp, valid_until: future };
let run = 0;
async function load(serve, rowExtra = { columns: { path: 'celestrak-active.cols.json', bytes: 1, rows: 120 } }) {
  run += 1;
  store.clear();
  const asked = [];
  globalThis.fetch = async (url) => {
    url = String(url);
    asked.push(url.replace(/^.*data\/v1\//, ''));
    if (url.endsWith('data/v1/index.json')) return new Response(JSON.stringify({ schema: 1, generated_at: stamp, snapshots: { 'celestrak-active': { status: 'ok', fetched_at: stamp, valid_until: future, items: 120, ...rowExtra } } }));
    if (url.endsWith('celestrak-active.cols.json')) return serve.cols === undefined ? new Response('gone', { status: 404 }) : new Response(serve.cols);
    if (url.endsWith('celestrak-active.json')) return new Response(JSON.stringify(file));
    return new Response('refused', { status: 403 });
  };
  const mod = await import(join(ROOT, 'site/js/data/sources.js') + `?columnar=${run}`);
  const r = await mod.load('celestrak-active', { await: true });
  return { data: r.data, via: r.via, asked: asked.filter((u) => u !== 'index.json') };
}
let r = await load({ cols: JSON.stringify(cols) });
check(r.via === 'snapshot' && same(r.data, verbatim) && JSON.stringify(r.asked) === JSON.stringify(['celestrak-active.cols.json']), `the column file alone is read, and gives the verbatim rows (asked ${r.asked})`);
const fallsBack = async (what, serve, extra) => {
  const got = await load(serve, extra);
  check(got.via === 'snapshot' && same(got.data, verbatim) && got.asked.includes('celestrak-active.json'), `${what}: the verbatim file is read, and the rows are the same (asked ${got.asked}, via ${got.via})`);
};
await fallsBack('a column file that is not there', {});
await fallsBack('a column file that is not JSON', { cols: '<html>404</html>' });
await fallsBack('a column file from another publish', { cols: JSON.stringify({ ...cols, fetched_at: '2026-01-01T00:00:00Z' }) });
await fallsBack('a column file with a short column', { cols: JSON.stringify({ ...cols, columns: { keys: cols.columns.keys, cols: cols.columns.cols.map((c, i) => (i === 2 ? c.slice(1) : c)) } }) });
await fallsBack('a column file with other rows than the manifest says', { cols: JSON.stringify(cols) }, { columns: { path: 'celestrak-active.cols.json', bytes: 1, rows: 121 } });
r = await load({ cols: JSON.stringify(cols) }, {});
check(same(r.data, verbatim) && JSON.stringify(r.asked) === JSON.stringify(['celestrak-active.json']), `a manifest that names no column file asks for none (asked ${r.asked})`);
r = await load({ cols: JSON.stringify(cols) }, { columns: { path: '../../evil.cols.json', rows: 120 } });
check(same(r.data, verbatim) && JSON.stringify(r.asked) === JSON.stringify(['celestrak-active.json']), 'a path that is not a plain file name beside the manifest is not asked for');

// Not at boot: the decoder is fetched only when a manifest names a column file.
const sources = readFileSync(join(ROOT, 'site/js/data/sources.js'), 'utf8');
check(/await import\('\.\/columnar\.js'\)/.test(sources) && !/^import[^\n]*columnar/m.test(sources), 'data/sources.js loads the decoder by dynamic import');
const refresh = readFileSync(join(ROOT, 'scripts/refresh-snapshots.sh'), 'utf8');
check(/columnar\.publish\(d\)/.test(refresh) && refresh.indexOf('columnar.publish(d)') > refresh.lastIndexOf('derive('), 'scripts/refresh-snapshots.sh publishes the twins, after the cuts');

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`\ncolumnar: ${failed} check(s) FAILED`); process.exit(1); }
console.log(`columnar ok: 120 real rows of CelesTrak's catalogue go to ${twinText.length} B of columns from ${readFileSync(fixture, 'utf8').length} B and come back key for key and value for value; `
  + 'the parser gives the same records; the browser reads the twin when the manifest names it and the verbatim file on any doubt');
