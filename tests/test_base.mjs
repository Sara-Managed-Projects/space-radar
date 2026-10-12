// tests/test_base.mjs -- "Return to base" (public #241, ui/base.js).
//
// Asserted, with no browser:
//   AWAY: another stage, a selection, a clock that is not live, a camera much nearer or farther
//     than the home view, a running trip. Turning the globe at the home distance is not away.
//   COMING HOME: the trip is left first; the view is remembered and the way back offered (not
//     after a trip); the clock goes live; the Earth is framed; the sidebar shows its home.
//   WHERE: a house in the rail, taken out at home; the trip's top bar has one beside Leave; a phone
//     shows it in the top bar at 44 px or more.
//   LAZY: main.js imports it dynamically.
//
//   node tests/test_base.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const base = await mod('ui/base.js');
const { COPY } = await mod('copy/en.js');

const home = { stageId: 'earth', selected: false, live: true, distance: 22, homeDistance: 22 };
check(base.awayFromBase(home) === false, 'the first frame is home');
check(base.awayFromBase({ ...home, distance: 22 * 1.5 }) === false && base.awayFromBase({ ...home, distance: 22 * 0.6 }) === false, 'a little nearer or farther is still home');
check(base.awayFromBase({ ...home, stageId: 'sun' }), 'another stage is away');
check(base.awayFromBase({ ...home, stageId: 'stellar' }), 'a rung of the ladder is away');
check(base.awayFromBase({ ...home, selected: true }), 'a selection is away');
check(base.awayFromBase({ ...home, live: false }), 'a clock that is not live is away');
check(base.awayFromBase({ ...home, distance: 22 * base.FAR * 1.01 }) && base.awayFromBase({ ...home, distance: 22 * base.NEAR * 0.99 }), 'far out or close in is away');
check(base.awayFromBase({ ...home, tripRunning: true }), 'a running trip is away');
check(base.awayFromBase({ ...home, distance: NaN }) === false && base.awayFromBase({ stageId: 'earth' }) === false, 'no camera reading: the rest decides');

// --- coming home --------------------------------------------------------------------------------
function world({ trip = false, stage = 'earth', mode = 'live' } = {}) {
  const calls = [];
  const classes = new Set(trip ? ['sr-trip-mode'] : []);
  const doc = { documentElement: { classList: { contains: (c) => classes.has(c) } } };
  const ctx = {
    stage: { worldId: stage },
    clock: { mode, live() { calls.push('live'); this.mode = 'live'; } },
    trip: { stop(why) { calls.push('stop:' + why); classes.delete('sr-trip-mode'); } },
    rememberView() { calls.push('remember'); },
    offerUndo(name) { calls.push('undo:' + name); },
    frameEarth() { calls.push('frame'); },
    shell: { show(v) { calls.push('show:' + v); } },
    veil: { through(fn) { calls.push('veil'); fn(); } },
  };
  return { ctx, doc, calls };
}
{
  const { ctx, doc, calls } = world({ stage: 'sun', mode: 'held' });
  check(base.returnToBase(ctx, doc) === true, 'it says it went');
  check(calls.join(' ') === `remember veil live frame show:home undo:${COPY.base.name}`, `from another stage: remembered, through the veil, live, framed, home shown, the way back offered (got ${calls.join(' ')})`);
}
{
  const { ctx, doc, calls } = world({});
  base.returnToBase(ctx, doc);
  check(!calls.includes('veil') && !calls.includes('live') && calls.includes('frame'), 'on the Earth, live already: no veil, no clock change, the globe framed');
}
{
  const { ctx, doc, calls } = world({ trip: true, stage: 'stellar' });
  base.returnToBase(ctx, doc);
  check(calls[0] === 'stop:left', 'a trip is left first');
  check(!calls.includes('remember') && !calls.some((c) => c.startsWith('undo')), 'and no way back is offered into a trip that is over');
  check(calls.includes('frame') && calls.includes('show:home'), 'then home');
}
check(base.returnToBase({}, { documentElement: { classList: { contains: () => false } } }) === false, 'nothing to do it with: it says so');

// --- where, and lazy ----------------------------------------------------------------------------
const main = read('site/js/main.js');
check(/import\('\.\/ui\/base\.js'\)/.test(main) && !/^import[^\n]*ui\/base\.js/m.test(main), 'main.js imports it dynamically, never statically');
check(/ctx\.homeDistance\s*=/.test(main), 'main.js says what the home distance is');
const frame = read('site/js/ui/tripframe.js');
check(/returnToBase|ctx\.goBase|ctx\.base/.test(frame) && /'house'/.test(frame), 'the trip\'s top bar has a house that comes home');
const src = read('site/js/ui/base.js');
check(/host\.insertBefore\(root, host\.firstChild\)/.test(src) && /root\.remove\(\)/.test(src) && !/root\.hidden/.test(src), 'the house is put into the rail while away and taken out at home, never merely hidden');
{
  // On a phone the rail hides the buttons it names and shows the rest: the house is not named.
  const ui = read('site/css/ui.css');
  const hidden = /html\.sr-phone \.sr-rail__btn--share,[^{]*\{\s*display: none;/.exec(ui);
  check(hidden && !/--base/.test(hidden[0]), 'a phone\'s top bar shows the house: it is not among the rail buttons a phone folds away');
  check(!/rail__btn--base/.test(ui), 'and it costs the first visit\'s stylesheet nothing');
}
for (const key of ['label', 'title', 'name']) check(typeof COPY.base[key] === 'string' && COPY.base[key].length <= 60, `COPY.base.${key} is a short line`);
check(COPY.base.label.trim().split(/\s+/).length <= 3, 'its name is the issue\'s three words at most');

if (problems.length) {
  console.error('base FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`base ok: away on another stage, a selection, a held clock, under ${base.NEAR}x or over ${base.FAR}x the home distance, a trip; home = trip left, remembered, live, framed, the way back offered`);
