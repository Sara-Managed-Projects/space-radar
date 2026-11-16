// tests/test_resolveid.mjs -- what a link's id names (ui/resolveid.js): `#at=`, `#go=` and an embed's `at=`.
// Review of 16 Nov 2026: `#at=m31`, `#at=m42`, `#at=m45`, `#at=ngc224` and `#at=andromeda` said "not on this
// map", `#at=m1` opened M10, and an embed with an unknown id showed a bare Earth and no word. A table of ids
// against the real deep-sky file, the worlds, the exotics and a few satellites as the catalogue names them.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { resolveId, idKey, keysOf, ID_PREFIXES } = await import(join(JS, 'ui/resolveid.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { LAYERS, exoticRecords } = await import(join(JS, 'data/layers.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const sat = (n, name, layer, meta = {}) => ({ id: `sat-${n}`, name, klass: layer === 'stations' ? 'station' : /R\/B/.test(name) ? 'rocket' : 'satellite', layer, meta: { noradId: n, ...meta } });
const records = [
  ...LAYERS.find((l) => l.id === 'worlds').sample(),
  ...parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8'))),
  ...exoticRecords(),
  ...(LAYERS.find((l) => l.id === 'galaxy').sample ? LAYERS.find((l) => l.id === 'galaxy').sample() : []),
  sat(25544, 'ISS (ZARYA)', 'stations', { intlDesignator: '1998-067A', why: 'people live here' }),
  sat(49044, 'ISS (NAUKA)', 'stations', { intlDesignator: '2021-066A' }),
  sat(20580, 'HST', 'visual', { intlDesignator: '1990-037B', why: 'hubble' }),
  sat(60001, 'HUBBLE 6', 'active'),
  sat(60002, 'M10 TEST SAT', 'active'),
  { id: 'hip-27989', name: 'Betelgeuse', klass: 'star', layer: 'stars', meta: { hip: 27989, aliases: ['Alpha Orionis', 'HIP 27989', '58 Ori'] } },
  { id: 'star-kepler-186', name: 'Kepler-186', klass: 'star', layer: 'systems', meta: { aliases: ['Kepler-186'] } },
  { id: 'exo-kepler-186-f', name: 'Kepler-186 f', klass: 'exoplanet', layer: 'exoplanets', meta: { aliases: ['Kepler-186'] } },
  { id: 'comet-1P', name: '1P/Halley', klass: 'comet', layer: 'comets', meta: {} },
  { id: 'obs-mpc-m31', name: 'Ursa Havaintokeskus, Artjarvi', klass: 'site', layer: 'observatories', meta: { aliases: ['M31'] } },
];
const byId = new Map(records.map((r) => [r.id, r]));
const have = { records, layers: LAYERS, recordById: (id) => byId.get(id) || null };
const got = (text) => { const r = resolveId(text, have); return r ? r.id : null; };

// The table. Left: what a link carries. Right: the record it must open (null: the map does not have it).
const TABLE = [
  // the canonical id, with and without the prefix of its kind
  ['dso-m31', 'dso-m31'], ['m31', 'dso-m31'], ['M31', 'dso-m31'], ['sat-25544', 'sat-25544'], ['moon', 'moon'], ['mars', 'mars'],
  ['kepler-186-f', 'exo-kepler-186-f'], ['kepler-186', 'star-kepler-186'], ['hip-27989', 'hip-27989'], ['1p', 'comet-1P'],
  // Messier, NGC and IC designations, in every spelling
  ['m42', 'dso-m42'], ['m45', 'dso-m45'], ['M 31', 'dso-m31'], ['messier-31', 'dso-m31'], ['messier 31', 'dso-m31'], ['Messier31', 'dso-m31'],
  ['ngc224', 'dso-m31'], ['ngc-224', 'dso-m31'], ['NGC 224', 'dso-m31'], ['ngc_224', 'dso-m31'], ['ngc1952', 'dso-m1'],
  // an exact number never runs on into a longer one
  ['m1', 'dso-m1'], ['M1', 'dso-m1'], ['m 1', 'dso-m1'], ['m10', 'dso-m10'], ['m11', 'dso-m11'], ['m100', 'dso-m100'], ['m999', null], ['ngc 22', null], ['ngc22', null],
  // NORAD numbers and international designators
  ['25544', 'sat-25544'], ['norad-25544', 'sat-25544'], ['NORAD 25544', 'sat-25544'], ['1998-067A', 'sat-25544'], ['1990-037B', 'sat-20580'], ['1990-037b', 'sat-20580'], ['int-1998-067A', 'sat-25544'],
  ['99999', null],
  // HIP numbers and other names a star carries
  ['hip27989', 'hip-27989'], ['HIP 27989', 'hip-27989'], ['alpha-orionis', 'hip-27989'],
  // common names, and the slugs the search pages use (scripts/seo_common.py slug_of)
  ['andromeda-galaxy', 'dso-m31'], ['Andromeda Galaxy', 'dso-m31'], ['andromeda', 'dso-m31'], ['crab-nebula', 'dso-m1'], ['orion-nebula', 'dso-m42'], ['pleiades', 'dso-m45'],
  ['the-moon', 'moon'], ['luna', 'moon'], ['milky-way', 'dso-milky-way'], ['sagittarius-a-star', 'exotic-sgr-a-star'], ['sgr-a', 'exotic-sgr-a-star'], ['halley', 'comet-1P'],
  // what a person would type, through the search box's index and aliases
  ['iss', 'sat-25544'], ['hubble', 'sat-20580'], ['hst', 'sat-20580'], ['hubble-space-telescope', 'sat-20580'], ['space+station', 'sat-25544'],
  // nothing
  ['zzzz-not-a-thing', null], ['', null], ['   ', null], ['x', null],
];
for (const [text, want] of TABLE) {
  const r = got(text);
  check(r === want, `#at=${JSON.stringify(text)} opens ${want} (got ${r})`);
}
// The search box agrees with the link: the same words typed there list the same object first.
{
  const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
  const index = buildIndex(records, LAYERS);
  for (const [typed, want] of [['m1', 'dso-m1'], ['M 31', 'dso-m31'], ['m31', 'dso-m31'], ['ngc 224', 'dso-m31'], ['ngc224', 'dso-m31'], ['m45', 'dso-m45']]) {
    const first = findMatches(index, typed, 3).hits[0];
    check(first && first.record.id === want, `typed in the search box, "${typed}" lists ${want} first (${first && first.record.id})`);
  }
}
// A script-like or absurd id is nothing, and does not throw.
for (const bad of ['<img src=x onerror=1>', '%', 'a'.repeat(20000), '__proto__', 'constructor', null, undefined, 12]) {
  let r = 'threw';
  try { r = resolveId(bad, have); } catch { r = 'threw'; }
  check(r === null, `a link's id of ${String(bad).slice(0, 24)} is nothing (${r && r.id ? r.id : r})`);
}
// keys
check(idKey('NGC 224') === 'ngc224' && idKey('ngc-224') === 'ngc224' && idKey('Vía Láctea') === 'vialactea' && idKey('The Moon') === 'moon' && idKey('Sagittarius A*') === 'sagittariusastar', 'a key ignores case, accents, spaces and punctuation, and reads * as "star" as a page slug does');
check(keysOf(byId.get('dso-m31')).some((k) => k.key === 'm31') && keysOf(byId.get('dso-m31')).some((k) => k.key === 'ngc224') && keysOf(byId.get('dso-m31')).some((k) => k.key === 'andromedagalaxy'), 'the Andromeda Galaxy answers to m31, ngc224 and its own name');
check(ID_PREFIXES.includes('dso') && ID_PREFIXES.includes('exo') && ID_PREFIXES.includes('star'), 'the prefixes a bare id may leave out');

// main.js asks this resolver and nothing else, says so when it finds nothing, and an embed says it too.
const main = readFileSync(join(JS, 'main.js'), 'utf8');
const openAt = main.slice(main.indexOf('function openAt('), main.indexOf('// --- small helpers'));
check(/import\('\.\/ui\/resolveid\.js'\)/.test(openAt) && /how\.resolveId\(text,/.test(openAt) && !/function resolveAt\(/.test(main) && !/findMatches/.test(main), 'main.js openAt resolves a link through ui/resolveid.js, with no second resolver of its own');
check(/linkNote\(ctx, COPY\.link\.unknownAt, \['at'\]\);\s*if \(typeof ctx\.selected === 'function' && ctx\.selected\(\) && typeof ctx\.deselect === 'function'\) ctx\.deselect\(\);/.test(openAt), 'an unknown id says so and leaves nothing selected from before ("showing the default view")');
check(/ctx\.embed\.note\(COPY\.link\.unknownAt\)/.test(openAt), 'an embed with an unknown id says so in its own line');
const embed = readFileSync(join(JS, 'ui/embed.js'), 'utf8');
check(/note: sayNote/.test(embed) && /const sayNote = \(text\) => \{ note = String\(text \|\| ''\); say\(/.test(embed), 'ui/embed.js has a line for it');
check(!/^import [^\n]*resolveid/m.test(main), 'the resolver is not in the boot graph: fetched for a link that is not a plain record id');
const docs = readFileSync(join(ROOT, 'docs/EMBEDDING.md'), 'utf8');
check(/at=m31/.test(docs) && !/any of the 26/.test(docs), 'docs/EMBEDDING.md names a catalogue designation for at=, and no longer counts the trips by hand');

if (problems.length) {
  console.error(`resolveid FAILED (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`resolveid ok: ${TABLE.length} ids in the table (record ids, Messier, NGC, HIP, NORAD, international designators, names, slugs) open what they name; m1 is the Crab Nebula and never M10; an unknown id is nothing, said in one line, in an embed too`);
