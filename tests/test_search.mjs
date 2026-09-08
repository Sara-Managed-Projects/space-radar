// tests/test_search.mjs -- spec 0021 as spec 0026 item 7 finishes it: eight rows, whole words
// first, the buried-letters fallback announced, aliases from the registry.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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
check(ALIASES.hubble === 'hst' && ALIASES.webb === 'jwst' && ALIASES.tiangong === 'css', 'the alias table is the registry mirror');
const hub = findMatches(index, 'hubble');
check(hub.hits[0].record.id === 'sat-20580', `"hubble" puts HST first through the alias, above the satellites named after it (${hub.hits[0] && hub.hits[0].record.name})`);
check(Object.keys(ALIASES).every((k) => k === k.toLowerCase()), 'alias keys are lower-cased');
// requirement 7: eight rows, and the total says how many more
const star = findMatches(index, 'starlink');
check(star.hits.length === 8 && star.total === 20, `eight rows shown of ${star.total}`);
// determinism
check(JSON.stringify(findMatches(index, 'starlink').hits.map((h) => h.record.id)) === JSON.stringify(star.hits.map((h) => h.record.id)), 'the same query gives the same order');

if (problems.length) { console.error('search FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('search ok: whole words first, buried letters only as an announced fallback, eight rows, aliases from the registry');
