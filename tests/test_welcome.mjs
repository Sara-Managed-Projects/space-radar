// tests/test_welcome.mjs -- a first visit's three lines and two ways in (public #241, #287;
// ui/welcome.js).
//
// Asserted, with no browser:
//   ONCE: the first decision shows it and remembers; the second does not; a storage that throws
//     means no welcome. Never for a link, an embed, a reel, a running trip or an automated browser,
//     and none of those is remembered.
//   THREE LINES, each at most 60 characters, the middle one in the words of the hand that is there.
//   TWO BUTTONS of at most two words; one ember; the first trip that can run is the one started.
//   LAZY: main.js imports it dynamically; 44 px targets on a phone; reduced motion is a fade.
//
//   node tests/test_welcome.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const w = await mod('ui/welcome.js');
const { COPY } = await mod('copy/en.js');

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, m };
};
const fresh = memory();
check(w.decide(fresh, {}) === null, 'a first visit is welcomed');
check(fresh.m.get(w.WELCOME_KEY) === '1', `and it is remembered under ${w.WELCOME_KEY}`);
check(w.decide(fresh, {}) === 'seen', 'a second visit is not');
const throws = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };
check(w.decide(throws, {}) === 'no-memory' && w.decide(null, {}) === 'no-memory', 'no storage, no welcome: it could not be once');
check(w.decide({ getItem: () => null, setItem() { throw new Error('Quota'); } }, {}) === 'no-memory', 'a storage that will not write is no memory either');
for (const [state, why] of [[{ deepLink: true }, 'deep-link'], [{ embed: true }, 'embed'], [{ ambient: true }, 'reel'], [{ tripRunning: true }, 'trip'], [{ automated: true }, 'automated']]) {
  const s = memory();
  check(w.decide(s, state) === why, `${why}: no welcome (got ${w.decide(memory(), state)})`);
  check(!s.m.has(w.WELCOME_KEY), `${why}: not remembered, so the next ordinary visit is welcomed`);
}

const C = COPY.welcome;
for (const touch of [false, true]) {
  const lines = w.welcomeLines(touch);
  check(lines.length === 3, 'three lines');
  for (const l of lines) check(typeof l === 'string' && l.length > 0 && l.length <= 60, `a line is at most 60 characters: "${l}" is ${l && l.length}`);
}
check(w.welcomeLines(true)[1] !== w.welcomeLines(false)[1], 'the second line is the gestures on touch and the pointer elsewhere');
check(/pinch/i.test(w.welcomeLines(true)[1]) && /scroll/i.test(w.welcomeLines(false)[1]), 'pinch on touch, scroll with a pointer');
for (const key of ['trip', 'look']) check(C[key].trim().split(/\s+/).length <= 2, `button "${C[key]}" is at most two words`);
check(C.title.trim().split(/\s+/).length <= 4, 'the microlabel is at most four words');
for (const s of Object.values(C)) check(!/[!→]/.test(s) && !/please/i.test(s), `no exclamation, arrow or "please": "${s}"`);

check(w.firstTrip([{ id: 'a', off: true }, { id: 'b', off: false }, { id: 'c' }]) === 'b', 'the first trip that can run is the one started');
check(w.firstTrip([{ id: 'a', off: true }]) === null && w.firstTrip(null) === null, 'none can run: none is started');

const src = read('site/js/ui/welcome.js');
check((src.match(/sr-welcome__go/g) || []).length === 1 && (src.match(/sr-welcome__look/g) || []).length === 1, 'two buttons, built once each');
{
  const css0 = read('site/css/finishers.css');
  const rule = (sel) => (new RegExp(sel.replace(/[.]/g, '\\.') + '\\s*\\{([^}]*)\\}').exec(css0) || [])[1] || '';
  check(/background:\s*var\(--sr-ember\)/.test(rule('.sr-welcome__go')), 'Guided trip is the ember');
  check(!/--sr-ember/.test(rule('.sr-welcome__look')), 'Look around is not: one ember on the home');
}
const main = read('site/js/main.js');
check(/import\('\.\/ui\/welcome\.js'\)/.test(main) && !/^import[^\n]*welcome/m.test(main), 'main.js imports it dynamically, never statically');
const css = read('site/css/finishers.css');
check(/\.sr-welcome/.test(css) && !/sr-welcome/.test(read('site/css/ui.css')), 'its rules are in css/finishers.css, which comes with it, and not in the first visit\'s sheet');
check(!/finishers/.test(read('site/index.html')), 'index.html neither preloads the module nor links its sheet');
check(!/@keyframes[^{]*welcome/.test(css), 'nothing of it loops or bounces');

if (problems.length) {
  console.error('welcome FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`welcome ok: once (none without storage, a link, an embed, a reel, a trip or automation); three lines of ${w.welcomeLines(false).map((l) => l.length).join(', ')} characters; "${C.trip}" and "${C.look}"`);
