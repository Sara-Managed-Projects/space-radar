// tests/test_lab_paths.mjs -- the learning paths' one script (scripts/seo_lab_paths.py CLIENT_JS), run with no browser.
//   node tests/test_lab_paths.mjs
// What is kept in `sr:paths` and how a bad record reads; a simulator opened from a path shows its box and its toggle
// writes the tick; a browser that refuses storage gets no toggle; the script never throws without a page around it.
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const js = execFileSync('python3', ['-c', 'import sys; sys.path.insert(0, "scripts"); import seo_lab_paths; sys.stdout.write(seo_lab_paths.CLIENT_JS)'], { cwd: ROOT, encoding: 'utf8' });
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

function store() {
  const d = {};
  return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; }, d };
}
function button(slug) {
  const attrs = { 'aria-pressed': 'false' };
  const on = {};
  return { dataset: { slug }, hidden: false, getAttribute: (k) => attrs[k], setAttribute: (k, v) => { attrs[k] = String(v); },
    addEventListener: (t, f) => { on[t] = f; }, click: () => on.click && on.click(), attrs };
}
function run({ search = '', storage = store(), byId = {} } = {}) {
  const win = { localStorage: storage, addEventListener() {} };
  const doc = { getElementById: (id) => byId[id] || null, querySelectorAll: () => [], querySelector: () => null };
  const ctx = { window: win, document: doc, location: { search, hash: '', pathname: '/lab/x/index.html' }, history: { replaceState() {} }, JSON };
  vm.runInNewContext(js, ctx);
  return { api: win.srPaths, storage };
}

// the record, pure
const { api } = run();
check(api && api.KEY === 'sr:paths', 'the key is the contract row sr:paths');
check(JSON.stringify(api.clean({ orbits: ['a', 'a', 'b'], 'Bad Id': ['a'], light: 'x', sky: [1, 'ok'] })) === JSON.stringify({ orbits: ['a', 'b'], sky: ['ok'] }),
  'clean keeps lower-case ids and slugs, once each');
check(JSON.stringify(api.clean([1, 2])) === '{}' && JSON.stringify(api.clean(null)) === '{}', 'a record that is not an object is nothing');
let v = api.set({}, 'orbits', 'throw-it-faster', true);
check(api.has(v, 'orbits', 'throw-it-faster') && !api.has(v, 'light', 'throw-it-faster'), 'a tick is per path');
v = api.set(v, 'orbits', 'throw-it-faster', false);
check(JSON.stringify(v) === '{}', 'unticking the last one leaves no path behind');
const many = api.clean({ orbits: Array.from({ length: 60 }, (_, i) => `s${i}`) });
check(many.orbits.length === 40, 'a path keeps at most 40 ticks');

// storage
{
  const s = store();
  const r = run({ storage: s });
  check(r.api.write({ orbits: ['a'] }) === true && s.d['sr:paths'] === '{"orbits":["a"]}', 'write keeps the clean record');
  check(JSON.stringify(r.api.read()) === '{"orbits":["a"]}', 'and read gives it back');
  r.api.write({});
  check(!('sr:paths' in s.d), 'an empty record removes the key');
  s.setItem('sr:paths', '{not json');
  check(JSON.stringify(r.api.read()) === '{}', 'a broken record reads as nothing');
}

// a simulator opened from a path
{
  const s = store();
  const b = button('throw-it-faster');
  const box = { hidden: true, querySelector: () => b };
  run({ search: '?path=orbits', storage: s, byId: { 'lpath-orbits': box } });
  check(box.hidden === false, 'the box of the path in the address is shown');
  check(b.attrs['aria-pressed'] === 'false', 'not done yet');
  b.click();
  check(b.attrs['aria-pressed'] === 'true' && s.d['sr:paths'] === '{"orbits":["throw-it-faster"]}', 'Mark as done ticks it, and keeps the tick');
  b.click();
  check(b.attrs['aria-pressed'] === 'false' && !('sr:paths' in s.d), 'pressed again, the tick goes');
}
{
  const other = { hidden: true, querySelector: () => button('x') };
  run({ search: '?path=light', byId: { 'lpath-orbits': other } });
  check(other.hidden === true, 'a box of another path stays hidden');
  run({ search: '', byId: { 'lpath-orbits': other } });
  check(other.hidden === true, 'opened from anywhere else, no box');
}
{
  const refusing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
  const b = button('throw-it-faster');
  const box = { hidden: true, querySelector: () => b };
  run({ search: '?path=orbits', storage: refusing, byId: { 'lpath-orbits': box } });
  check(box.hidden === false && b.hidden === true, 'with no storage the box shows its next link and no toggle');
}

if (fails.length) { console.log(fails.map((f) => 'FAIL ' + f).join('\n')); process.exit(1); }
console.log('lab paths script ok');
