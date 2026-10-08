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

if (problems.length) { console.error('search FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('search ok: whole words first, buried letters only as an announced fallback, eight rows, aliases from the registry');
