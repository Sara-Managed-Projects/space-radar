// tests/test_from_tag.mjs -- `?from=<channel>` is harmless and leaves no trace (growth: channel tags).
//
//   node tests/test_from_tag.mjs
//
// Claims, without a browser:
//   1. `/?from=ig` loads the normal home and the address bar reads `/`: ui/urlstate.js dropFrom takes
//      only that key off the query with history.replaceState, keeps every other key and the hash,
//      and changes nothing when there is no tag. main.js calls it first thing in boot().
//   2. The tag is read INTO NOTHING: run with every storage, request and cookie door replaced by a
//      recorder, dropFrom touches none of them, and its source names none of them.
//   3. No link the app makes carries it: the app's base, every share link form, the embed's address
//      and the embed snippet, built on a page whose address HAS the tag, contain no `from=`. The one
//      place the string is written is the embed's link back (`?from=embed`), on purpose.
//   4. Every canonical link ignores the query: the home page's is the bare address.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const U = await import(join(ROOT, 'site/js/ui/urlstate.js'));
const S = await import(join(ROOT, 'site/js/ui/share.js'));
const E = await import(join(ROOT, 'site/js/ui/embed.js'));

// --- 1. the address bar --------------------------------------------------------------------------
const run = (pathname, search, hash) => {
  const calls = [];
  const loc = { pathname, search, hash, origin: 'https://www.spaceradar.ai' };
  const hist = { state: null, replaceState: (...a) => calls.push(a) };
  const changed = U.dropFrom(loc, hist);
  return { changed, calls };
};
let r = run('/', '?from=ig', '');
check(r.changed && r.calls.length === 1 && r.calls[0][2] === '/', `/?from=ig becomes / (${JSON.stringify(r.calls)})`);
r = run('/', '?from=embed', '#at=sat-25544&exp=deep');
check(r.calls[0] && r.calls[0][2] === '/#at=sat-25544&exp=deep', `the hash survives (${r.calls[0] && r.calls[0][2]})`);
r = run('/site/', '?embed=1&from=yt&sw=0', '#trip=moon-landings');
check(r.calls[0] && r.calls[0][2] === '/site/?embed=1&sw=0#trip=moon-landings', `other keys stay, in order, under a prefix (${r.calls[0] && r.calls[0][2]})`);
r = run('/', '?from=', '');
check(r.calls[0] && r.calls[0][2] === '/', 'an empty tag is dropped too');
for (const [s, why] of [['', 'no query'], ['?embed=1', 'no tag'], ['?xfrom=1&afrom=2', 'a key that only ends in "from"'], ['?tier=low', 'another key']]) {
  r = run('/', s, '#at=x');
  check(!r.changed && r.calls.length === 0, `${why}: the address bar is not touched`);
}
const hist2 = { state: { k: 1 }, replaceState() { throw new Error('refused'); } };
check(U.dropFrom({ pathname: '/', search: '?from=ig', hash: '' }, hist2) === false, 'a browser that refuses replaceState does not break boot');
check(U.dropFrom(null, null) === false, 'no location (a worker, a test) is a no-op');
const main = read('site/js/main.js');
check(/export async function boot\(\{ setStatus \} = \{\}\) \{\s*const say = [^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*dropFrom\(\);/.test(main), 'main.js calls dropFrom() first in boot(), before anything reads the address');
check(/import \{ dropFrom,/.test(main), 'main.js imports it from ui/urlstate.js');

// --- 2. read into nothing ------------------------------------------------------------------------
{
  const touched = [];
  const trap = (name) => new Proxy(function () {}, {
    get: (_t, k) => { touched.push(`${name}.${String(k)}`); return () => {}; },
    set: (_t, k) => { touched.push(`${name}.${String(k)}=`); return true; },
    apply: () => { touched.push(`${name}()`); return undefined; },
    construct: () => { touched.push(`new ${name}`); return {}; },
  });
  const saved = {};
  const doors = ['localStorage', 'sessionStorage', 'indexedDB', 'caches', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'Image', 'BroadcastChannel'];
  for (const d of doors) { saved[d] = Object.getOwnPropertyDescriptor(globalThis, d); Object.defineProperty(globalThis, d, { value: trap(d), configurable: true, writable: true }); }
  const savedNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: trap('navigator'), configurable: true, writable: true });
  const doc = { set cookie(v) { touched.push('document.cookie='); }, get cookie() { touched.push('document.cookie'); return ''; } };
  Object.defineProperty(globalThis, 'document', { value: doc, configurable: true, writable: true });
  const calls = [];
  Object.defineProperty(globalThis, 'location', { value: { pathname: '/', search: '?from=ig', hash: '#at=sat-25544', origin: 'https://www.spaceradar.ai' }, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'history', { value: { state: null, replaceState: (...a) => calls.push(a) }, configurable: true, writable: true });
  const changed = U.dropFrom();
  check(changed && calls.length === 1 && calls[0][2] === '/#at=sat-25544', 'the no-argument form main.js uses reads the page\'s own location and history');
  check(touched.length === 0, `no storage, request, cookie or beacon is touched (${touched.join(', ')})`);
  for (const d of doors) { if (saved[d]) Object.defineProperty(globalThis, d, saved[d]); else delete globalThis[d]; }
  if (savedNav) Object.defineProperty(globalThis, 'navigator', savedNav); else delete globalThis.navigator;
  delete globalThis.document; delete globalThis.location; delete globalThis.history;
}
{
  const src = read('site/js/ui/urlstate.js');
  const body = /export function dropFrom[\s\S]*?\n\}\n/.exec(src);
  check(!!body, 'dropFrom is found in the source');
  const code = (body ? body[0] : '').replace(/\/\/[^\n]*/g, '');
  const bad = /localStorage|sessionStorage|indexedDB|\bcaches\b|fetch\(|XMLHttpRequest|sendBeacon|cookie|WebSocket|new Image|navigator|\.href\b|postMessage|dispatchEvent|CustomEvent/.exec(code);
  check(!bad, `dropFrom's source names no storage, request, beacon, cookie or event (${bad && bad[0]})`);
  check(!/const\s+\w*[Ff]rom\w*\s*=|let\s+\w*[Ff]rom\w*\s*=/.test(code), 'and keeps the tag in no variable');
  // Nothing else in the app reads the query for it: the string `from=` is written only by the embed's link back.
  const stray = [];
  const walk = (dir) => {
    for (const f of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${f.name}`;
      if (f.isDirectory()) { if (f.name !== 'vendor') walk(rel); } else if (f.name.endsWith('.js') && /[?&]from=|\.(?:get|has|delete)\(['"]from['"]\)/.test(read(rel).replace(/\/\/[^\n]*/g, ''))) stray.push(rel);
    }
  };
  walk('site/js');
  check(stray.every((f) => f === 'site/js/ui/embed.js' || f === 'site/js/ui/urlstate.js'), `only ui/embed.js and ui/urlstate.js name the tag (${stray.join(', ')})`);
}

// --- 3. no link carries it -----------------------------------------------------------------------
{
  const loc = { origin: 'https://www.spaceradar.ai', pathname: '/', search: '?from=ig', hash: '' };
  const base = S.appBase(loc);
  const states = [{}, { at: 'sat-25544' }, { trip: 'moon-landings', stop: 3 }, { trip: 'moon-landings' }, { at: 'mars', stage: 'mars', t: '2027-01-01T00:00:00Z', exp: 'deep', rate: 60 }, { at: 'x', from: 'ig', source: 'ig' }];
  const links = [base];
  for (const st of states) links.push(S.shareUrl(st, base), E.embedUrl(E.embedState(st), base), E.fullUrl(E.embedState(st), base), E.embedSnippet(E.embedState(st), { base }));
  check(links.every((l) => !/from=|\?from|&from/.test(l)), `no share link, embed address or snippet contains the tag (${links.filter((l) => /from=/.test(l))[0]})`);
  check(base === 'https://www.spaceradar.ai/', `the app's base ignores the query (${base})`);
  // The hash is read through KEYS: `#from=ig` is not a key and never reaches a link.
  Object.defineProperty(globalThis, 'location', { value: { hash: '#at=sat-25544&from=ig', search: '?from=ig', pathname: '/' }, configurable: true, writable: true });
  check(!('from' in U.read()), 'a `from` in the hash is dropped on read, like every key outside KEYS');
  delete globalThis.location;
  check(!U.KEYS.includes('from'), 'from is not one of the app\'s state keys');
}

// --- 4. canonical ignores the query --------------------------------------------------------------
{
  const html = read('site/index.html');
  const canon = /<link rel="canonical" href="([^"]*)">/.exec(html);
  check(canon && canon[1] === 'https://www.spaceradar.ai/', `index.html's canonical is the bare address (${canon && canon[1]})`);
  check(!/location\.search[^\n]*canonical|canonical[^\n]*location\.search/.test(read('site/js/main.js')), 'nothing rewrites the canonical from the query');
}

if (problems.length) { console.error('from-tag FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('from-tag ok: ?from= is dropped from the address bar with replaceState (the hash and the other keys stay), read into nothing (no storage, request, cookie or beacon), in no share link, embed address or snippet, and the canonical is the bare address');
