// tests/test_boot_diet.mjs -- what must stay OUT of the first visit, and the stand-ins that keep it out
// (internal #405, 2026-10-06).
//
// The first visit was 5 773 324 B by CI's count that day, 921 kB of it modules and data the first
// screen does not use: the card, the trips and their stops, the model shapes, the glTF loader, the
// deep-sky table and the words of all of them. Each now loads when it is wanted. A static import is
// one line, and one line anywhere in the boot graph puts any of them back without a test failing --
// the byte budget would notice weeks later, as it did. This test notices the line.
//
//   1. THE BOOT GRAPH (the static imports reachable from main.js) names none of the deferred modules.
//   2. THE WORDS: every module that reads a section of copy/en.later.js imports it; no boot module
//      does; no section is in both files.
//   3. THE TRIPS' INDEX agrees with the trips: same ids in the same order, the card's fields, the
//      stop count, the minutes, and the event type ui/trippicker.js reads from a full trip's stops.
//   4. THE TRIP'S STAND-IN (ui/tripgate.js): idle and index before the module, the module's own
//      answers after, listeners carried across, one import however many callers.
//   5. THE CARD'S STAND-IN (ui/cardgate.js): the last request is the one shown.
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const JS = join(SITE, 'js');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const rel = (p) => relative(SITE, p).split('\\').join('/');

// --- 1. the boot graph ---------------------------------------------------------------------------
// The same rule as scripts/gen_modulepreload.py: `import ... from`, `export ... from` and the bare
// side-effect form; never `import(`.
const STATIC = /(?:\bimport|\bexport)\s*(?:[^'";()]*?\bfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/g;
function graph(entry) {
  const seen = new Set();
  const todo = [entry];
  while (todo.length) {
    const path = todo.pop();
    if (seen.has(path)) continue;
    let text;
    try { text = readFileSync(path, 'utf8'); } catch { continue; }
    seen.add(path);
    for (const m of text.matchAll(STATIC)) todo.push(join(dirname(path), m[1]));
  }
  return seen;
}
const boot = new Set([...graph(join(JS, 'main.js'))].map(rel));
const DEFERRED = {
  'js/ui/cards.js': 'the card: ui/cardgate.js fetches it on the first selection',
  'js/ui/trip.js': 'the trip: ui/tripgate.js fetches it when a trip is opened, linked or planned',
  'js/data/tours.js': 'the trips\' stops: they arrive with ui/trip.js; the cards read data/tours-index.js',
  'js/data/narration.js': 'the narration manifest: it arrives with the trip frame',
  'js/ui/tripframe.js': 'the trip frame: imported when the first trip starts',
  'js/scene/models.js': 'the model shapes: scene/heroes.js fetches them when a record wants geometry',
  'vendor/GLTFLoader.js': 'the glTF loader: scene/realmodels.js fetches it inside loadRealModel()',
  'vendor/meshopt_decoder.module.js': 'the meshopt decoder: with the glTF loader',
  'vendor/BufferGeometryUtils.js': 'the glTF loader\'s helper',
  'js/copy/en.later.js': 'the words of what loads later',
  'js/sky/groundsky.js': 'the sky from the ground: sky/skyview.js fetches it when the sky view opens',
  'js/sky/skyculture.js': 'other peoples\' figures, the borders and the pictures: sky/groundsky.js fetches it when one is asked for',
  'js/sky/meteors.js': 'a shower\'s streaks: sky/groundsky.js fetches it when a shower is active',
  'js/sky/skyglow.js': 'the night lights at a place: sky/skyview.js fetches it when the sky view opens',
  'js/ui/missions.js': 'the mission events: main.js fetches them with the first card',
  'js/propagate/ephemeris.js': 'the reader of a craft\'s own path file: it arrives with ui/missions.js',
  'js/data/ephemerides.js': 'the index of the path files: with the reader',
  'js/scene/ephpath.js': 'the line of a craft\'s path: ui/missions.js fetches it with the first file',
};
for (const [path, why] of Object.entries(DEFERRED)) {
  check(!boot.has(path), `${path} is in the boot graph again (a static import reaches it from main.js). ${why}`);
}
check(boot.has('js/ui/cardgate.js') && boot.has('js/ui/tripgate.js') && boot.has('js/data/tours-index.js'), 'the stand-ins and the trips\' index are what the boot graph imports');

// --- 2. the words --------------------------------------------------------------------------------
const { COPY } = await import(join(JS, 'copy/en.js'));
const bootKeys = new Set(Object.keys(COPY));
await import(join(JS, 'copy/en.later.js'));
const laterKeys = Object.keys(COPY).filter((k) => !bootKeys.has(k));
check(laterKeys.length >= 20, `copy/en.later.js adds ${laterKeys.length} sections to COPY: the split has gone, or this test reads the wrong file`);
const laterText = readFileSync(join(JS, 'copy/en.later.js'), 'utf8');
for (const k of bootKeys) check(!new RegExp(`^  ${k}:`, 'm').test(laterText), `COPY.${k} is defined in copy/en.js and again in copy/en.later.js`);
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : f.endsWith('.js') ? [p] : [];
});
const reads = new RegExp(`COPY\\.(${laterKeys.join('|')})\\b`);
const importsLater = /import\s+'(?:\.\.?\/)+(?:copy\/)?en\.later\.js';/;
let readers = 0;
for (const path of walk(JS)) {
  if (path.includes(`${join(JS, 'copy')}`)) continue;
  // Code only: a comment may name a section without reading it.
  const code = readFileSync(path, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const hit = reads.exec(code);
  if (!hit) continue;
  readers += 1;
  check(importsLater.test(code), `${rel(path)} reads COPY.${hit[1]}, which is in copy/en.later.js, and does not import that file: the section is undefined until something else happens to load it`);
  check(!boot.has(rel(path)), `${rel(path)} is in the boot graph and reads COPY.${hit[1]} from copy/en.later.js: move the section back to copy/en.js`);
}
check(readers >= 20, `only ${readers} modules read a later section: the reader check is not seeing them`);
// And en.js itself reads none of them (ageInWords and the rest are called at boot).
const enCode = readFileSync(join(JS, 'copy/en.js'), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
check(!reads.test(enCode), 'copy/en.js reads a section that lives in copy/en.later.js');

// --- 3. the index --------------------------------------------------------------------------------
const { TOURS, TOUR_GROUPS } = await import(join(JS, 'data/tours.js'));
const index = await import(join(JS, 'data/tours-index.js'));
const { eventTypeOf } = await import(join(JS, 'ui/trippicker.js'));
check(JSON.stringify(index.TOUR_GROUPS) === JSON.stringify(TOUR_GROUPS), 'the index and the trips list the same groups');
check(index.TOURS_INDEX.length === TOURS.length, `the index has ${index.TOURS_INDEX.length} rows for ${TOURS.length} trips`);
TOURS.forEach((tour, i) => {
  const row = index.TOURS_INDEX[i] || {};
  check(row.id === tour.id, `index row ${i} is ${row.id}, the trip there is ${tour.id}`);
  for (const k of ['title', 'blurb', 'group', 'next', 'requires_observer', 'min_stops', 'estimate_ms']) {
    check(JSON.stringify(row[k]) === JSON.stringify(tour[k]), `${tour.id}: the index's ${k} is not the trip's`);
  }
  check(row.count === tour.stops.length, `${tour.id}: the index says ${row.count} stops, the trip has ${tour.stops.length}`);
  check(!('stops' in row), `${tour.id}: the index carries stops; it is the file that must not`);
  check(eventTypeOf(row) === eventTypeOf(tour), `${tour.id}: the index says its event is ${eventTypeOf(row)}, its stops say ${eventTypeOf(tour)}`);
});
const indexBytes = statSync(join(JS, 'data/tours-index.js')).size;
check(indexBytes < 16000, `data/tours-index.js is ${indexBytes} B: a row has grown past what a card needs`);

// --- 4. the trip's stand-in ----------------------------------------------------------------------
const { createTripGate } = await import(join(JS, 'ui/tripgate.js'));
const { idleTripState } = await import(join(JS, 'ui/tripstate.js'));
{
  let loads = 0;
  const heard = [];
  const realListeners = new Set();
  const realState = { ...idleTripState(), phase: 'intro', tourId: 'x' };
  const real = {
    start: (id) => Promise.resolve({ id, offerable: true }),
    plan: (id) => Promise.resolve({ id, offerable: true, count: 3 }),
    play: () => 'played', stop() {}, next() {}, back() {}, replay() {}, jumpTo: (n) => `jump ${n}`, pause() {}, resume() {},
    holdDwell() {}, dwellFraction: () => 0.5, currentRecordId: () => 'sat-1', dispose() {},
    setPacing: (mode) => { real.pacing = mode; },
    onChange: (fn) => { realListeners.add(fn); return () => realListeners.delete(fn); },
    tours: () => TOURS,
    state: realState,
  };
  const gate = createTripGate({}, () => { loads += 1; return Promise.resolve({ createTrip: () => real }); });
  check(gate.loaded === false && loads === 0, 'making the stand-in fetches nothing');
  check(gate.state.phase === 'idle' && gate.state.tourId === null, 'before the module, the state is idle');
  check(JSON.stringify(gate.state) === JSON.stringify(idleTripState()), 'and it is the literal ui/trip.js starts from');
  check(gate.tours() === index.TOURS_INDEX, 'before the module, tours() is the index');
  check(gate.currentRecordId() === null && gate.dwellFraction() === 0 && gate.play() === undefined, 'a call that means nothing with no trip running does nothing');
  check(loads === 0, 'and none of those fetched the module');
  const off = gate.onChange((st) => heard.push(st.phase));
  const dropped = gate.onChange(() => heard.push('dropped'));
  dropped();
  gate.setPacing('reader');
  const [a, b] = await Promise.all([gate.start('x'), gate.plan('x')]);
  check(loads === 1, `two callers at once made ${loads} imports`);
  check(a && a.id === 'x' && b && b.count === 3, 'start() and plan() answer with the module\'s own answers');
  check(gate.loaded === true && gate.state === realState && gate.tours() === TOURS, 'after the module, the state and the trips are its own');
  check(real.pacing === 'reader', 'a pacing asked for before the module is applied when it lands');
  for (const fn of realListeners) fn(realState);
  check(heard.join() === 'intro', `a listener registered before the module hears the trip, and one removed does not (heard: ${heard.join()})`);
  off();
  check(realListeners.size === 0, 'removing a listener removes it from the module');
  check(gate.play() === 'played' && gate.jumpTo(2) === 'jump 2' && gate.currentRecordId() === 'sat-1', 'calls are forwarded');
  // A module that cannot be fetched: start() answers null (the caller's "nothing started"), and the next call asks again.
  let tries = 0;
  const realWarn = console.warn;
  console.warn = () => {};
  const flaky = createTripGate({}, () => { tries += 1; return tries === 1 ? Promise.reject(new Error('offline')) : Promise.resolve({ createTrip: () => real }); });
  const first = await flaky.start('x');
  const second = await flaky.start('x');
  console.warn = realWarn;
  check(first === null && second && second.id === 'x' && tries === 2, 'a failed import answers null and is asked for again');
}
// The gate has every member the trip has.
{
  const src = readFileSync(join(JS, 'ui/trip.js'), 'utf8');
  const api = /\n  return \{\n([\s\S]*?)\n  \};\n\}\s*$/.exec(src);
  check(!!api, 'ui/trip.js ends with the object it returns (this test reads its members)');
  const members = api ? [...api[1].matchAll(/^\s{4}([A-Za-z_]\w*)\b/gm)].map((m) => m[1]) : [];
  const gate = createTripGate({}, () => new Promise(() => {}));
  for (const name of members) check(name in gate, `ui/trip.js returns \`${name}\` and ui/tripgate.js has no such member`);
  check(/const state = idleTripState\(\);/.test(src), 'ui/trip.js starts from ui/tripstate.js idleTripState()');
}

// --- 5. the card's stand-in ----------------------------------------------------------------------
{
  const src = readFileSync(join(JS, 'ui/cardgate.js'), 'utf8');
  check(/import\('\.\/cards\.js'\)/.test(src) && !/^import\s/m.test(src), 'ui/cardgate.js imports nothing statically and the card dynamically');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/from '\.\/ui\/cardgate\.js'/.test(main) && !/from '\.\/ui\/cards\.js'/.test(main), 'main.js shows the card through ui/cardgate.js');
  check(/from '\.\/ui\/tripgate\.js'/.test(main) && !/from '\.\/ui\/trip\.js'/.test(main), 'main.js makes ctx.trip through ui/tripgate.js');
  // The warm-up is past the two seconds tests/test_first_visit_bytes.mjs waits after sr:layers-ready.
  const warm = /const WARM_MS = (\d+);/.exec(main);
  check(warm && Number(warm[1]) >= 3000, 'main.js warms the deferred modules at least 3 s after sr:layers-ready');
}

if (problems.length) {
  for (const p of problems) console.error(`::error::${p}`);
  process.exit(1);
}
console.log(`boot diet ok: ${Object.keys(DEFERRED).length} deferred modules are out of the ${boot.size}-module boot graph, ${readers} modules import the ${laterKeys.length} later sections of the copy they read, the index matches ${TOURS.length} trips, and the stand-ins hold`);
