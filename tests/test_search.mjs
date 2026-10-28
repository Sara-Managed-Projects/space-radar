// tests/test_search.mjs -- spec 0021 as spec 0026 item 7 finishes it: eight rows, whole words
// first, the buried-letters fallback announced, aliases from the registry.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { ALIASES } = await import(join(JS, 'data/aliases.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const rec = (id, name, layer = 'active', meta = {}) => ({ id, name, klass: 'satellite', layer, meta });
const recs = [
  rec('sat-25544', 'ISS (ZARYA)', 'stations', { noradId: 25544, why: 'people live here' }),
  rec('sat-1', 'SWISSCUBE'),
  rec('sat-2', 'MISSION 7'),
  rec('sat-3', 'ISS DEB (CZ-4 R/B)'),
  rec('sat-20580', 'HST', 'notable', { noradId: 20580, why: 'hubble' }),
  rec('sat-4', 'HUBBLE 6'),
  rec('sat-5', 'LEMUR-2-HUBBLE-4'),
  ...Array.from({ length: 20 }, (_, i) => rec(`st-${i}`, `STARLINK-${1000 + i}`)),
];
const index = buildIndex(recs, LAYERS);

// requirement 4: whole word first; buried letters do not appear beside a real match
const iss = findMatches(index, 'iss');
check(iss.hits[0].record.id === 'sat-25544', `"iss" puts the station first (${iss.hits[0] && iss.hits[0].record.name})`);
check(!iss.hits.some((h) => h.record.name === 'SWISSCUBE' || h.record.name === 'MISSION 7'), '"iss" does not list SWISSCUBE or MISSION 7 beside the station');
check(iss.fallback === false, 'a boundary match is not a fallback');
// the fallback: a query that only appears buried
const wis = findMatches(index, 'wiss');
check(wis.hits.length === 1 && wis.hits[0].record.name === 'SWISSCUBE' && wis.fallback === true, `"wiss" falls back to buried letters and says so (${JSON.stringify({ n: wis.hits.length, fb: wis.fallback })})`);
// requirement 5: a catalogue number first and alone at the top
const num = findMatches(index, '25544');
check(num.hits[0].record.id === 'sat-25544', 'a NORAD number finds its object first');
// requirement 6: aliases come from the registry mirror
check(ALIASES.hubble === 'hst' && ALIASES.jwst === 'james webb' && ALIASES.tiangong === 'css', 'the alias table is the registry mirror');
// "jwst" is how the telescope is written, and no record is called that: it sits at L2, has no
// CelesTrak element set, and the app's record is the deep-space layer's full name. The old alias
// ran the other way (webb -> jwst) and pointed at a name nothing had, so "jwst" found nothing.
{
  const deep = buildIndex([
    { id: 'deep-jwst', name: 'James Webb Space Telescope', klass: 'telescope', layer: 'deep-space', meta: {} },
    { id: 'deep-voyager-1', name: 'Voyager 1', klass: 'probe', layer: 'deep-space', meta: {} },
    { id: 'deep-voyager-2', name: 'Voyager 2', klass: 'probe', layer: 'deep-space', meta: {} },
    { id: 'dso-x', name: "Webb's Cross Cluster", klass: 'dso', layer: 'deep-sky', meta: {} },
  ], LAYERS);
  const j = findMatches(deep, 'jwst');
  check(j.hits[0] && j.hits[0].record.id === 'deep-jwst', `"jwst" finds the James Webb Space Telescope (${j.hits[0] && j.hits[0].record.name})`);
  check(findMatches(deep, 'webb').hits.some((h) => h.record.id === 'deep-jwst'), '"webb" still finds it by its own name');
  const g = findMatches(deep, 'golden record');
  check(g.hits.length === 2 && g.hits.every((h) => /^Voyager/.test(h.record.name)), `"golden record" leads to the two Voyagers that carry it (${g.hits.map((h) => h.record.name)})`);
}
const hub = findMatches(index, 'hubble');
check(hub.hits[0].record.id === 'sat-20580', `"hubble" puts HST first through the alias, above the satellites named after it (${hub.hits[0] && hub.hits[0].record.name})`);
check(Object.keys(ALIASES).every((k) => k === k.toLowerCase()), 'alias keys are lower-cased');
// Spec 0061 task 5: a query that matches nothing offers the nearest names (ui/search.js closest).
{
  const { closest } = await import(join(JS, 'ui/search.js'));
  const worlds = buildIndex([
    { id: 'jupiter', name: 'Jupiter', klass: 'world', layer: 'stations', meta: {} },
    { id: 'saturn', name: 'Saturn', klass: 'world', layer: 'stations', meta: {} },
    { id: 'ghost', name: 'Ghost of Jupiter', klass: 'dso', layer: 'active', meta: {} },
    { id: 'sat-9', name: 'JUPITER 3 (ECHOSTAR 24)', klass: 'satellite', layer: 'active', meta: {} },
    { id: 'mars', name: 'Mars', klass: 'world', layer: 'stations', meta: {} },
  ], LAYERS);
  check(findMatches(worlds, 'jupitr').hits.length === 0, '"jupitr" matches nothing');
  const near = closest(worlds, 'jupitr');
  check(near.length === 3 && near[0].record.id === 'jupiter', `and its nearest name is Jupiter, first (${near.map((h) => h.name)})`);
  check(closest(worlds, 'satrun')[0] && closest(worlds, 'satrun')[0].record.id === 'saturn', 'two letters swapped is one slip: "satrun" offers Saturn');
  check(closest(worlds, 'xyzzy').length === 0, 'a word near nothing offers nothing');
  check(closest(worlds, 'mas').length === 0 && closest(worlds, '99999').length === 0, 'never for three letters, never for a number');
  check(new Set(near.map((h) => h.record.id)).size === near.length, 'one row per object');
  const src = readFileSync(join(JS, 'ui/search.js'), 'utf8');
  check(/setActive\(state\.hits\.length && !state\.missed \? 0 : -1\)/.test(src), 'a nearest name is offered, not highlighted: Enter does not fly to a guess');
  check(/sr-search__empty/.test(src) && /COPY\.search\.noMatch, \{ q: shown \}/.test(src), 'the empty state quotes the query back');
}
// requirement 7: eight rows, and the total says how many more
const star = findMatches(index, 'starlink');
check(star.hits.length === 8 && star.total === 20, `eight rows shown of ${star.total}`);
// determinism
check(JSON.stringify(findMatches(index, 'starlink').hits.map((h) => h.record.id)) === JSON.stringify(star.hits.map((h) => h.record.id)), 'the same query gives the same order');

// What the note says is not searched (2026-09-22): four registry-disabled layers were "still
// loading" in every note, forever.
{
  const { coverageOf } = await import(join(JS, 'ui/search.js'));
  const layers = [
    { id: 'stations', display: 'Crewed stations' },
    { id: 'visual', display: 'Bright enough to see' },
    { id: 'active', display: 'Everything active', enabled: false },
    { id: 'starlink', display: 'Starlink', deferred: true },
    { id: 'worlds', display: 'Planets' },
    { id: 'gone', display: 'Gone', forcedOff: true },
  ];
  const cov = coverageOf(layers, new Map([['worlds', 10]]), new Set(['visual']));
  check(cov.loading.join() === 'Crewed stations', `not answered yet: loading (${cov.loading})`);
  check(cov.unread.join() === 'Bright enough to see', `answered with nothing: could not be read (${cov.unread})`);
  check(cov.deferred.join() === 'Starlink', `held back by data saver: its own reason (${cov.deferred})`);
  check(!cov.all.includes('Everything active') && !cov.all.includes('Gone'), 'a layer the registry switched off is not "still loading"');
}

// --- at full scale (spec 0049 req 9, task 4; internal #131, #432) ---------------------------------
// 5 000 names shaped like the active catalogue: the station, the two UME satellites that carry
// "ISS" in brackets, three hundred ISS DEB pieces, rocket bodies and a few thousand payloads.
{
  const big = [
    rec('sat-25544', 'ISS (ZARYA)', 'stations', { noradId: 25544, why: 'people live here' }),
    rec('sat-8709', 'UME 1 (ISS 1)', 'active', { noradId: 8709 }),
    rec('sat-10674', 'UME 2 (ISS-B)', 'active', { noradId: 10674 }),
    ...Array.from({ length: 300 }, (_, i) => ({ ...rec(`deb-${i}`, 'ISS DEB', 'debris-field', { noradId: 47000 + i }), klass: 'debris' })),
    ...Array.from({ length: 400 }, (_, i) => ({ ...rec(`rb-${i}`, `CZ-${2 + (i % 5)}C R/B`, 'debris-field', { noradId: 50000 + i }), klass: 'debris' })),
    ...Array.from({ length: 2600 }, (_, i) => rec(`sl-${i}`, `STARLINK-${1000 + i}`, 'starlink', { noradId: 60000 + i })),
    ...Array.from({ length: 600 }, (_, i) => rec(`ow-${i}`, `ONEWEB-${String(i).padStart(4, '0')}`, 'active', { noradId: 70000 + i })),
    ...Array.from({ length: 1097 }, (_, i) => rec(`misc-${i}`, `${['COSMOS', 'IRIDIUM', 'FLOCK 4Q', 'LEMUR-2', 'YAOGAN', 'GLOBALSTAR M'][i % 6]} ${100 + i}`, 'active', { noradId: 80000 + i })),
  ];
  check(big.length === 5000, `the fixture is 5 000 names (${big.length})`);
  const bigIndex = buildIndex(big, LAYERS);
  const got = findMatches(bigIndex, 'iss').hits.map((h) => h.record);
  const at = (id) => got.findIndex((r) => r.id === id);
  check(got[0] && got[0].id === 'sat-25544', `at 5 000 names "iss" still puts the station first (${got[0] && got[0].name})`);
  check(at('sat-8709') !== 0 && at('sat-10674') !== 0, 'UME 1 (ISS 1) and UME 2 (ISS-B) never outrank ISS (ZARYA)');
  const firstDeb = got.findIndex((r) => r.klass === 'debris');
  const lastPayload = Math.max(at('sat-8709'), at('sat-10674'));
  check(firstDeb === -1 || lastPayload === -1 || firstDeb > lastPayload, `debris of the same score sorts below payloads (first piece at ${firstDeb}, last payload at ${lastPayload})`);
  // The timing: every query a visitor types on the way to a name, each run five times, the median
  // of each held under 50 ms. Node on a laptop measures 1 to 5 ms; the bound is CI's.
  const queries = ['i', 'is', 'iss', 'star', 'starlink-12', 'cosmos 5', 'oneweb-0420', '25544', 'zzzz', 'hubble'];
  let worst = 0;
  let worstQ = '';
  for (const q of queries) {
    const runs = [];
    for (let i = 0; i < 5; i += 1) { const t0 = performance.now(); findMatches(bigIndex, q); runs.push(performance.now() - t0); }
    runs.sort((x, y) => x - y);
    if (runs[2] > worst) { worst = runs[2]; worstQ = q; }
  }
  check(worst <= 50, `a query over 5 000 names answers in 50 ms or less (the slowest median: "${worstQ}" at ${worst.toFixed(1)} ms)`);
  console.log(`  at 5 000 names the slowest of ${queries.length} queries is "${worstQ}", ${worst.toFixed(1)} ms (median of 5)`);
}

// --- spec 0049 requirement 9: search at full scale (internal #131) ---------------------------------
// 5 000 names, seeded, with the three families that go wrong on a whole catalogue put in by hand:
// UME 1 (ISS 1) and UME 2 (ISS-B) (two Japanese ionosphere satellites of 1976 and 1978 whose
// catalogue names carry "ISS"), four hundred `ISS DEB` pieces in a debris layer, and the station's
// own modules. The debris sits in a layer the registry does not know (as `debris-clouds` will until
// it is a row), which is the case the layer ladder alone got wrong.
{
  let seed = 5000;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const FAMILIES = ['STARLINK', 'ONEWEB', 'COSMOS', 'FLOCK 4X', 'LEMUR 2', 'YAOGAN', 'GLOBALSTAR M', 'IRIDIUM', 'SL-8 R/B', 'CZ-4C DEB', 'FENGYUN 1C DEB', 'NOAA', 'SES', 'INTELSAT'];
  const big = [];
  let norad = 50000;
  const add = (name, klass, layer, meta = {}) => { norad += 1; big.push({ id: `sat-${meta.noradId || norad}`, name, klass, layer, meta: { noradId: norad, ...meta } }); };
  for (let i = 0; i < 400; i += 1) add('ISS DEB', 'debris', 'debris-clouds');
  for (let i = 0; i < 40; i += 1) add(`ISS DEB (SPX-${i + 1})`, 'debris', 'debris-clouds');
  add('UME 1 (ISS 1)', 'satellite', 'active', { noradId: 8709 });
  add('UME 2 (ISS-B)', 'satellite', 'active', { noradId: 10674 });
  add('ISS (NAUKA)', 'station', 'stations', { noradId: 49044 });
  add('ISS (ZARYA)', 'station', 'stations', { noradId: 25544, why: 'people live here' });
  add('CSS (TIANHE)', 'station', 'stations', { noradId: 48274, why: 'the other crewed station' });
  add('ISS R/B', 'rocket', 'active');
  add('ISS RELAY 2', 'satellite', 'active');
  while (big.length < 5000) {
    const f = FAMILIES[Math.floor(rnd() * FAMILIES.length)];
    const klass = /DEB/.test(f) ? 'debris' : /R\/B/.test(f) ? 'rocket' : 'satellite';
    add(`${f}${klass === 'satellite' ? '-' : ' '}${1000 + Math.floor(rnd() * 9000)}`, klass, klass === 'debris' ? 'debris-clouds' : 'active');
  }
  // Shuffled, so nothing is first because it was added first.
  for (let i = big.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [big[i], big[j]] = [big[j], big[i]]; }
  const bigIndex = buildIndex(big, LAYERS);
  check(bigIndex.n === 5000, `the fixture is 5 000 names (${bigIndex.n})`);
  const r = findMatches(bigIndex, 'iss', 600);
  const names = r.hits.map((h) => h.record.name);
  check(names[0] === 'ISS (ZARYA)', `at full scale "iss" still puts the station first (${names.slice(0, 4).join(' | ')})`);
  check(names[1] === 'ISS (NAUKA)', `then the station's other module, not a satellite or a fragment (${names[1]})`);
  const ume = names.findIndex((n) => n.startsWith('UME 1'));
  check(ume === -1 || ume > names.indexOf('ISS (ZARYA)'), 'UME 1 (ISS 1) never outranks ISS (ZARYA)');
  const firstDeb = names.findIndex((n) => /\bDEB\b/.test(n));
  const relay = names.indexOf('ISS RELAY 2');
  const rb = names.indexOf('ISS R/B');
  check(relay !== -1 && rb !== -1 && firstDeb !== -1, `a payload, a rocket body and a fragment that all start with the word are all offered (${names.slice(0, 8).join(' | ')})`);
  check(relay < rb && rb < firstDeb, `a payload, then a rocket body, then debris, among matches of the same score (${relay}, ${rb}, ${firstDeb})`);
  check(r.total >= 444, `and the count says how many matched (${r.total})`);
  // The alias still reaches the other crewed station: "tiangong" is `css` in the registry.
  const tg = findMatches(bigIndex, 'tiangong', 8);
  check(tg.hits[0] && tg.hits[0].record.name === 'CSS (TIANHE)', `"tiangong" finds the other crewed station in 5 000 names (${tg.hits[0] && tg.hits[0].record.name})`);
  // A catalogue number is still first and alone.
  check(findMatches(bigIndex, '25544', 8).hits[0].record.name === 'ISS (ZARYA)', 'a NORAD number still finds its object in 5 000');
  // TIMING: the worst of several queries, each the median of nine runs, against 50 ms.
  const queries = ['iss', 'starlink', 'deb', 'cosmos 1', 'r/b', '25544', 'qqqzzx', 'tiangong', 'fengyun 1c deb 12'];
  let worst = 0; let worstQ = '';
  for (const q of queries) {
    const runs = [];
    for (let k = 0; k < 9; k += 1) { const t = performance.now(); findMatches(bigIndex, q, 8); runs.push(performance.now() - t); }
    runs.sort((a, b) => a - b);
    if (runs[4] > worst) { worst = runs[4]; worstQ = q; }
  }
  check(worst <= 50, `a query over 5 000 names takes ${worst.toFixed(1)} ms ("${worstQ}", median of nine), over 50 ms`);
  console.log(`search at full scale: 5 000 names, slowest query "${worstQ}" ${worst.toFixed(1)} ms (median of nine)`);
}

// A search row is 44 px or more on a phone, and does not give its height up (the ui gate, 2026-10-08).
{
  const css = readFileSync(join(JS, '../css/ui.css'), 'utf8');
  const base = /\n\.sr-search__option \{[^}]*min-height: 44px[^}]*flex: 0 0 auto[^}]*\}/.test(css);
  const phone = /html\.sr-phone \.sr-search__option,[^{]*\{\s*min-height: 48px;/.test(css);
  check(base && phone, 'every search option row is at least 44 px (48 on a phone) and never shrinks');
}

// Search by kind (internal spec 0076 W3-e): its words are a second mirror of the same registry, out of the
// boot graph, and no kind word is also an alias (one word, one meaning: an alias searches ALONGSIDE a name,
// a kind lists a class, and a word that did both would answer two questions at once).
{
  const { KINDS } = await import(join(JS, 'data/kindwords.js'));
  const words = KINDS.flatMap((k) => k.say);
  check(words.length >= 40 && words.includes('galaxies') && words.includes('nebulae') && words.includes('moons'), `the kind words come from the registry (${words.length})`);
  for (const w of words) check(!Object.prototype.hasOwnProperty.call(ALIASES, w), `"${w}" is both an alias and a kind`);
  const src = readFileSync(join(JS, 'ui/search.js'), 'utf8');
  check(!/from '\.\.\/data\/kindwords\.js'/.test(src) && !/from '\.\.\/data\/visualclasses\.js'/.test(src), 'the field on the first screen imports neither the kind words nor the classes');
}

// --- a key typed into search is the search's, whichever transient prompt is up (public #916) -----------------
// 0077 W2-d: begin
// #615 fixed one prompt (the go-back offer sat on the search row for six seconds on a phone). This holds the
// whole class: every global key listener the app has is either shown to leave a focused field alone or named
// here with the reason it may not; every decision function that answers "what does this key mean" is run with
// the search field focused over every key a person types; and the prompts that appear by themselves, built for
// real in a stand-in document, are typed over. Nothing here is a browser: a handler that reads something this
// stand-in lacks fails the test, and is then given what it needs, not skipped.
{
  const { install } = await import('./helpers/fakedom.mjs');
  const doc = install();
  const { readdirSync, statSync } = await import('node:fs');
  const ROOTJS = JS;
  const src = (rel) => readFileSync(join(ROOTJS, rel), 'utf8');
  const strip = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // what a person types into a search field: letters of both cases, digits, punctuation, space, and the named keys
  const KEYS = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 /?.,-+=_*#@!:;\'"[]{}()<>\\|`~%^&', 'Enter', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Tab', 'Escape'];
  const fieldNode = () => ({ tagName: 'INPUT', className: 'sr-search__input', isContentEditable: false });
  const keyEvent = (key, target, extra = {}) => ({ type: 'keydown', key, target, defaultPrevented: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: key.length === 1 && key !== key.toLowerCase(), isComposing: false, keyCode: 0, ...extra });

  // 1. every decision function, with the search field focused: nobody takes a letter, a digit, a space or an arrow
  const { railKey } = await import(join(JS, 'ui/rail.js'));
  const { wantsToggle } = await import(join(JS, 'ui/cleanview.js'));
  const { wantsSearch } = await import(join(JS, 'ui/explore.js'));
  const { keyAction } = await import(join(JS, 'ui/tripframe.js'));
  const field = fieldNode();
  const idleTrip = { phase: 'dwell', index: 1, count: 4 };
  for (const key of KEYS) {
    const e = keyEvent(key, field);
    check(!railKey(e, field), `the rail does not take "${key}" typed into search`);
    check(!wantsSearch(e, field), `"/" in a field is a slash, not a jump to search ("${key}")`);
    if (key !== 'Escape') check(!wantsToggle(e, field, false) && !wantsToggle(e, field, true), `the clear screen does not take "${key}" typed into search`);
    check(!keyAction(e, idleTrip, field, false) && !keyAction(e, idleTrip, field, true), `a running trip does not take "${key}" typed into search`);
  }
  check(wantsToggle(keyEvent('Escape', field), field, false) === null, 'Escape in search is the search\'s when the screen is not clear');
  // ...and the same keys do mean something when nothing is focused, so the checks above are not vacuous
  check(railKey(keyEvent('l', null), null) === 'show' && wantsToggle(keyEvent('h', null), null, false) === 'toggle' && keyAction(keyEvent('ArrowRight', null), idleTrip, null, false) === 'next', 'with nothing focused the same keys are answered');
  // a contenteditable field is a field too
  const editable = { tagName: 'DIV', isContentEditable: true };
  check(!railKey(keyEvent('l', editable), editable) && !wantsToggle(keyEvent('h', editable), editable, false), 'a contenteditable field has the keyboard as an input does');

  // 2. every global key listener in the app, found in the source and classified
  const CLASSES = {
    'ui/rail.js': 'guarded: railKey (above)',
    'ui/cleanview.js': 'guarded: wantsToggle (above)',
    'ui/explore.js': 'guarded: wantsSearch (above)',
    'ui/tripframe.js': 'guarded: keyAction (above)',
    'ui/onboarding.js': 'guarded inline: the tour\'s own keys ignore a field',
    'ui/drift.js': 'guarded inline: Space and N are not taken from a field',
    'ui/keyhint.js': 'guarded inline: the caps do not light for a field; Escape only closes its own hint',
    'sky/skyview.js': 'guarded inline',
    'scene/camera.js': 'guarded inline: keyIsOurs',
    'ui/shell.js': 'Escape only, and only for a view of its own (Sources, Passport)',
    'ui/cards.js': 'Escape only: closes the card',
    'ui/sharesheet.js': 'Escape and Tab only, while the share sheet is open and holds the focus',
    'ui/chooser.js': 'Escape only, while the pick list is open',
    'ui/camundo.js': 'on the toast node itself, Escape only: heard only while a person has moved focus into the toast',
    'ui/scrubber.js': 'on the timeline\'s own slider',
    'ui/embed.js': 'embeds only: the host page owns the keyboard',
    'ui/autopilot.js': 'a mode, not a prompt: while a reel plays any key hands the screen back, which is its whole contract',
    'scene/exostage.js': 'on its own panel',
    'moments/player.js': 'guarded inline: while a moment is open, Space, arrows and chapter keys leave an input that is not the player\'s own scrubber',
  };
  const guards = { 'ui/onboarding.js': /INPUT\|TEXTAREA\|SELECT/, 'ui/drift.js': /tag === 'INPUT'/, 'ui/keyhint.js': /tag === 'INPUT'/, 'sky/skyview.js': /tag === 'INPUT'/, 'scene/camera.js': /tag === 'input'/, 'moments/player.js': /tag === 'INPUT'/ };
  const walkJs = (dir) => readdirSync(dir).flatMap((f) => { const full = join(dir, f); return statSync(full).isDirectory() ? walkJs(full) : full.endsWith('.js') ? [full] : []; });
  const found = [];
  for (const file of walkJs(ROOTJS)) {
    const rel = file.slice(ROOTJS.length + 1);
    const text = strip(readFileSync(file, 'utf8'));
    if (/addEventListener\(\s*['"]key(down|up|press)['"]/.test(text) && /\b(document|doc|window|win|keyTarget)\.addEventListener\(\s*['"]key(down|up|press)['"]|(?:root|node|host)\.addEventListener\(\s*['"]keydown['"]/.test(text)) found.push(rel);
  }
  for (const rel of found) check(!!CLASSES[rel], `${rel} listens for keys: say in test_search.mjs why it leaves a field alone (an unlisted global key listener is the next #615)`);
  for (const rel of Object.keys(CLASSES)) check(found.includes(rel), `${rel} is classified but no longer listens for keys: take it off the list`);
  for (const [rel, re] of Object.entries(guards)) check(re.test(src(rel)), `${rel} no longer checks for a focused field (${re})`);
  // an Escape-only listener must not look at any other key
  for (const rel of ['ui/shell.js', 'ui/cards.js', 'ui/chooser.js']) {
    const body = strip(src(rel));
    const handlers = [...body.matchAll(/addEventListener\(\s*'keydown',\s*(?:\(\w*\)\s*=>|function\s*\(\w*\)|\(\w*,?\s*\w*\)\s*=>|onKey)[\s\S]{0,260}/g)].map((m) => m[0]);
    check(handlers.length > 0 && handlers.every((h) => /key (?:!==|===) 'Escape'/.test(h) || /onKey/.test(h)), `${rel}: its key listener is for Escape and nothing else`);
  }

  // 3. the prompts that come by themselves, built for real, and typed over
  const listeners = [];
  const realAdd = doc.addEventListener;
  doc.addEventListener = (type, fn, capture) => listeners.push({ type, fn, capture: capture === true || !!(capture && capture.capture) });
  doc.removeEventListener = (type, fn) => { const i = listeners.findIndex((l) => l.type === type && l.fn === fn); if (i >= 0) listeners.splice(i, 1); };
  const search = doc.createElement('input');
  search.className = 'sr-search__input';
  doc.body.appendChild(search);
  search.focus();
  doc.activeElement = search;
  const { offerUndo } = await import(join(JS, 'ui/camundo.js'));
  let undone = 0;
  const node = offerUndo({}, { name: 'Jupiter', undo: () => { undone += 1; }, ms: 60000 });
  check(!!node && !node.hidden, 'the go-back offer is up');
  const taken = [];
  for (const key of KEYS) {
    const ev = keyEvent(key, search, { preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, stopImmediatePropagation() { this.stopped = true; } });
    for (const l of listeners.filter((x) => x.type === 'keydown' || x.type === 'keypress')) l.fn(ev);
    if (ev.defaultPrevented || ev.stopped) taken.push(key);
  }
  check(taken.length === 0, `with the go-back offer up, search keeps every key (taken: ${taken.join(' ')})`);
  check(undone === 0, 'and no key presses the offer\'s button');
  check(!node.hidden, 'a key alone does not take the offer away (it gives way to the text, below)');
  // the text arriving: the offer gives way, and the toast is one node that stays for the next line
  const typed = { type: 'input', target: search, defaultPrevented: false };
  for (const l of listeners.filter((x) => x.type === 'input')) l.fn(typed);
  check(node.hidden === true, 'typing in search puts the go-back offer away');
  check(listeners.filter((l) => l.type === 'input' || l.type === 'keydown').length === 0, 'and it leaves no listener behind');
  // other toasts hold no key at all
  const { toast } = await import(join(JS, 'ui/share.js'));
  toast('Link copied', 0);
  const before = listeners.length;
  check(before === 0, 'a plain toast adds no listener to the document');
  // the prompts with no key handler of their own: none of them moves focus at show time
  for (const [rel, allowed] of [['ui/camundo.js', 0], ['ui/launchchip.js', 0], ['ui/scalebadge.js', 0], ['ui/keyhint.js', 0], ['ui/welcome.js', 1]]) {
    const n = (strip(src(rel)).match(/\.focus\(/g) || []).length;
    check(n === allowed, `${rel}: ${n} calls to focus() (allowed ${allowed}; welcome gives focus back only if it had it)`);
  }
  const welcome = strip(src('ui/welcome.js'));
  check(/const hadFocus = root\.contains\(doc\.activeElement\);[\s\S]{0,200}if \(hadFocus\)/.test(welcome), 'the welcome returns focus only when it was inside it');
  doc.addEventListener = realAdd;
}
// 0077 W2-d: end

if (problems.length) { console.error('search FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('search ok: whole words first, buried letters only as an announced fallback, eight rows, aliases from the registry');
