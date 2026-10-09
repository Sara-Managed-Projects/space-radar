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
  'js/ui/overlaykey.js': 'the key of an Earth data map in the sidebar: main.js fetches it the first time a map is asked for',
  'js/scene/handoff.js': 'the stage hand-off\'s maths: scene/climb.js imports it',
  'js/scene/climb.js': 'the continuous flight: main.js fetches it on the first long dolly, the ladder\'s control or a climb stop',
  'js/scene/shells.js': 'the radio bubble and the microwave background: fetched on a rung of the ladder',
  'js/ui/cards.js': 'the card: ui/cardgate.js fetches it on the first selection',
  'js/ui/cardfacts.js': 'what the card knows (its rows, the tag\'s lines): with the card, or alone for the light embed (ui/cardgate.js wantFacts)',
  'js/ui/trip.js': 'the trip: ui/tripgate.js fetches it when a trip is opened, linked or planned',
  'js/data/tours.js': 'the trips\' stops: they arrive with ui/trip.js; the cards read data/tours-index.js',
  'js/data/narration.js': 'the narration manifest: it arrives with the trip frame',
  'js/ui/tripframe.js': 'the trip frame: imported when the first trip starts',
  'js/ui/golink.js': 'the push-in a `#go=` link lands with: main.js fetches it for that link alone',
  'js/ui/autopilot.js': 'a screen that plays on its own: main.js fetches it for `#ambient=` or the Trips section\'s row',
  'js/ui/autopilotplan.js': 'the reel\'s arithmetic: with ui/autopilot.js',
  'js/data/autopilot.js': 'the reels: with ui/autopilot.js',
  'js/scene/models.js': 'the model shapes: scene/heroes.js fetches them when a record wants geometry',
  'js/scene/exoface.js': 'a drawn face for a planet nobody has seen: scene/systems.js fetches it when a system\'s stage is entered',
  'js/scene/exostage.js': 'the plain star stage of an imagined world: main.js fetches it for `#imagine=`',
  'vendor/GLTFLoader.js': 'the glTF loader: scene/realmodels.js fetches it inside loadRealModel()',
  'vendor/meshopt_decoder.module.js': 'the meshopt decoder: with the glTF loader',
  'vendor/BufferGeometryUtils.js': 'the glTF loader\'s helper',
  'js/copy/en.later.js': 'the words of what loads later',
  'js/sky/groundsky.js': 'the sky from the ground: sky/skyview.js fetches it when the sky view opens',
  'js/sky/skyculture.js': 'other peoples\' figures, the borders and the pictures: sky/groundsky.js fetches it when one is asked for',
  'js/sky/meteors.js': 'a shower\'s streaks: sky/groundsky.js fetches it when a shower is active',
  'js/sky/skyglow.js': 'the night lights at a place: sky/skyview.js fetches it when the sky view opens',
  'js/sky/pointing.js': 'the phone as the view: sky/skyview.js fetches it when "Point your phone" is pressed',
  'js/data/wmm2025.js': 'the World Magnetic Model\'s coefficients: they arrive with sky/pointing.js',
  'js/sky/riseset.js': 'rises, highest and sets from a place: it arrives with the card',
  'js/sky/skyair.js': 'the colour of the air: it arrives with sky/groundsky.js',
  'js/sky/landscape.js': 'the land under the sky: it arrives with sky/groundsky.js',
  'js/sky/startiles.js': 'the stars past HYG: sky/groundsky.js fetches it when the field has closed far enough to show one',
  'js/sky/constellation.js': 'which constellation a point is in: sky/groundsky.js fetches it when idle',
  'js/data/showers-activity.js': 'the IMO\'s activity numbers: they arrive with sky/meteors.js',
  'js/ui/missions.js': 'the mission events: main.js fetches them with the first card',
  'js/propagate/ephemeris.js': 'the reader of a craft\'s own path file: it arrives with ui/missions.js',
  'js/data/ephemerides.js': 'the index of the path files: with the reader',
  'js/propagate/pool.js': 'SGP4 for a big catalogue in a worker: main.js fetches it when a layer lands with 2 000 SGP4 records or more',
  'js/propagate/worker.js': 'the worker itself: with propagate/pool.js',
  'js/ui/searchrows.js': 'what a search row says, and the trips, missions and events it finds: ui/search.js fetches it on the field\'s first focus',
  'js/data/tours-words.js': 'the words a trip is found by: with ui/searchrows.js',
  'js/data/missions.js': 'the missions\' events: with ui/missions.js or ui/searchrows.js',
  'js/data/ics.js': 'the calendar file: ui/next.js fetches it when Add to calendar is pressed',
  'js/ui/countdown.js': 'the launch countdown: fetched when a launch is within a day',
  'js/ui/today.js': 'the home\'s dated cards: main.js fetches them after the first visit has settled',
  'js/ui/sentence.js': 'the home\'s first line: it arrives with ui/today.js',
  'js/ui/passport.js': 'the passport: main.js fetches it for the dated cards or the trip frame',
  'js/scene/ephpath.js': 'the line of a craft\'s path: ui/missions.js fetches it with the first file',
  'js/ui/keyhint.js': 'the keys hint: main.js fetches it KEYHINT_MS after sr:layers-ready',
  'js/ui/opening.js': 'the words over a first visit\'s opening shot: fetched only when the shot plays',
  'js/ui/story.js': 'this week\'s story out of the catalogue: it arrives with ui/today.js',
  'js/ui/welcome.js': 'a first visit\'s three lines and two buttons: WELCOME_MS after sr:layers-ready, and only for a visitor not seen before',
  'js/ui/launchchip.js': 'the launch chip: LAUNCHDAY_MS after sr:layers-ready, or with a Starlink launch\'s card',
  'js/ui/base.js': 'Return to base: LAUNCHDAY_MS after sr:layers-ready, or when the trip\'s house is pressed',
  'js/ui/scalebadge.js': 'the scale badge: the first time the Sun\'s stage is entered',
  'js/ui/latercss.js': 'the loader of css/finishers.css: with the first of the four modules above',
  'js/ui/icons.js': 'the icons: they arrive with the first module that draws one (the keys hint, the card, the trip frame)',
  'js/ui/scrubber.js': 'the timeline: SCRUBBER_MS after sr:layers-ready, or on a touch of its seat',
  'js/ui/today.js': 'the dated cards: TODAY_MS after sr:layers-ready',
  'js/ui/offline.js': 'the service worker\'s module: OFFLINE_MS after sr:layers-ready',
  'js/scene/aurora.js': 'the aurora: AURORA_IMPORT_MS after sr:layers-ready',
  'js/scene/wind.js': 'the wind: main.js fetches it when Wind is chosen under Earth data',
  'js/data/wind.js': 'the wind field\'s request and arithmetic: with scene/wind.js',
  'js/data/eonet.js': 'fires, volcanoes and icebergs: data/layers.js fetches it when the layer is ticked',
  'js/data/systems-index.js': 'which stars have a stage: main.js fetches it with the exoplanet table, after the first visit',
  'js/data/systems-table.js': 'thirty-nine star systems in full: scene/systems.js fetches them the first time one is asked for',
  'js/scene/systemextras.js': 'the habitable-zone band and the rings for scale: with data/systems-table.js',
  'js/ui/systemcard.js': 'what a generated system\'s card says: it arrives with the card',
  'js/scene/ktx2.js': 'compressed maps: imported by whoever loads a map that has a .ktx2 twin (spec 0056)',
  'vendor/basis/KTX2Loader.js': 'the KTX2 loader and, through it, the Basis transcoder: scene/ktx2.js fetches it for the first such map',
  'js/ui/truthline.js': 'the one line of truth: with the trip frame, or the film camera',
};
// The light embed (js/embedlite.js) has no star systems at all: neither file can reach it.
{
  const lite = new Set([...graph(join(JS, 'embedlite.js'))].map(rel));
  for (const path of ['js/scene/systems.js', 'js/data/systems-index.js', 'js/data/systems-table.js']) check(!lite.has(path), `${path} is in the light embed's graph: an embed of the Moon would fetch the star systems`);
}
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
// copy/en.facts.js: the four sections ui/cardfacts.js reads, so the light embed does not fetch the rest
// (internal #429). en.later.js imports it; a module may import either for these.
const factsKeys = new Set([...readFileSync(join(JS, 'copy/en.facts.js'), 'utf8').matchAll(/^  (\w+): \{/gm)].map((m) => m[1]));
check(factsKeys.size === 4 && ['klass', 'cls', 'unplaced', 'earthEvent'].every((k) => factsKeys.has(k)), `copy/en.facts.js holds exactly klass, cls, unplaced and earthEvent (has ${[...factsKeys]})`);
check(/import '\.\/en\.facts\.js';/.test(laterText), 'copy/en.later.js imports copy/en.facts.js');
const importsFacts = /import\s+'(?:\.\.?\/)+(?:copy\/)?en\.facts\.js';/;
const readsAll = new RegExp(`COPY\\.(${laterKeys.join('|')})\\b`, 'g');
let readers = 0;
for (const path of walk(JS)) {
  if (path.includes(`${join(JS, 'copy')}`)) continue;
  // Code only: a comment may name a section without reading it.
  const code = readFileSync(path, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  const hit = reads.exec(code);
  if (!hit) continue;
  readers += 1;
  // A section in copy/en.facts.js may come from either file; any other needs en.later.js.
  const needLater = [...code.matchAll(readsAll)].map((m) => m[1]).filter((k) => !factsKeys.has(k));
  check(needLater.length ? importsLater.test(code) : importsLater.test(code) || importsFacts.test(code), `${rel(path)} reads COPY.${needLater[0] || hit[1]}, which is in copy/en.later.js${needLater.length ? '' : ' or en.facts.js'}, and does not import that file: the section is undefined until something else happens to load it`);
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
  // The keys hint does not bring the card (internal #415 item 5): on a connection that saves data the
  // warm-up does not run, and the hint used to fetch 188 kB of card for one icon function.
  const hint = new Set([...graph(join(JS, 'ui/keyhint.js'))].map(rel));
  check(!hint.has('js/ui/cards.js') && hint.has('js/ui/icons.js'), 'ui/keyhint.js draws its icons from ui/icons.js and does not import the card');
  check(!/from '\.\/cards\.js'/.test(readFileSync(join(JS, 'ui/tripframe.js'), 'utf8')), 'ui/tripframe.js takes its icons from ui/icons.js too');
  check(graph(join(JS, 'ui/icons.js')).size === 1, 'ui/icons.js imports nothing');
  // The warm-up is past the two seconds tests/test_first_visit_bytes.mjs waits after sr:layers-ready.
  const warm = /const WARM_MS = (\d+);/.exec(main);
  check(warm && Number(warm[1]) >= 3000, 'main.js warms the deferred modules at least 3 s after sr:layers-ready');
}

// 7. THE TAG'S MODULE (ui/cardfacts.js, what the light embed loads for its tag lines) reaches
//    copy/en.facts.js and not copy/en.later.js (internal #429: 45 kB for four sections).
{
  const facts = new Set([...graph(join(JS, 'ui/cardfacts.js'))].map(rel));
  check(facts.has('js/copy/en.facts.js') && !facts.has('js/copy/en.later.js'), 'ui/cardfacts.js imports copy/en.facts.js and not copy/en.later.js');
}

// 6. THE FONTS the first screen always draws with are preloaded, not found by the stylesheet at
//    66 to 529 ms (internal #533): the four files tests/test_first_visit_bytes.mjs counts.
{
  const html = readFileSync(join(SITE, 'index.html'), 'utf8');
  for (const f of ['inter-400-latin', 'inter-600-latin', 'barlow-semi-condensed-600-latin', 'jetbrains-mono-400-latin']) {
    check(new RegExp(`<link rel="preload" href="fonts/${f}\\.woff2" as="font" type="font/woff2" crossorigin>`).test(html), `index.html preloads fonts/${f}.woff2`);
  }
  check(!/rel="preload"[^>]*cyrillic/.test(html), 'and preloads no Cyrillic face');
}

if (problems.length) {
  for (const p of problems) console.error(`::error::${p}`);
  process.exit(1);
}
console.log(`boot diet ok: ${Object.keys(DEFERRED).length} deferred modules are out of the ${boot.size}-module boot graph, ${readers} modules import the ${laterKeys.length} later sections of the copy they read, the index matches ${TOURS.length} trips, and the stand-ins hold`);
