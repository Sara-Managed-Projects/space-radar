// tests/test_local_names.mjs -- the names of things in the page's language (ui/localnames.js, internal #310).
// Review of 16 Nov 2026, the Spanish app: "Luna" found three Soviet landers, "Marte", "Sol", "Tierra", "Vía Láctea" and
// "Estación Espacial Internacional" found nothing or the wrong thing, the Moon's card was titled "The Moon" and 39 of
// the 40 layer names were English. Every language is walked here, with its own words for the same six things.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const N = await import(join(JS, 'ui/localnames.js'));
const { buildIndex, findMatches, fold } = await import(join(JS, 'ui/search.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { LAYER_ROWS } = await import(join(JS, 'data/layers.registry.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { displayName } = await import(join(JS, 'ui/cardfacts.js'));
const { labelName } = await import(join(JS, 'ui/labels.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { LANGUAGES } = await import(join(JS, 'copy/lang.js'));
const langs = Object.keys(LANGUAGES).filter((c) => c !== 'en');

// A fresh set of records each time: the worlds, the deep sky, the Milky Way and a few satellites as the catalogue names them.
const dso = JSON.parse(read('site/data/dso.json'));
const sat = (n, name, layer, meta = {}) => ({ id: `sat-${n}`, name, klass: layer === 'stations' ? 'station' : 'satellite', layer, meta: { noradId: n, ...meta } });
const fresh = () => [
  ...LAYERS.find((l) => l.id === 'worlds').sample(),
  ...LAYERS.find((l) => l.id === 'galaxy').sample(),
  ...parseDso(dso),
  sat(25544, 'ISS (ZARYA)', 'stations', { why: 'people live here' }),
  sat(49044, 'ISS (NAUKA)', 'stations'),
  sat(60001, 'ISS DEB', 'active'),
  { id: 'moon-luna-23', name: 'Luna 23', klass: 'site', layer: 'landing-sites', meta: {} },
  { id: 'moon-luna-24', name: 'Luna 24', klass: 'site', layer: 'landing-sites', meta: {} },
  sat(25994, 'TERRA', 'visual'),
  { id: 'star-solaris', name: 'Solaris', klass: 'star', layer: 'stars', meta: {} },
  { id: 'deep-solar-orbiter', name: 'Solar Orbiter', klass: 'probe', layer: 'deep-space', meta: {} },
];
const firstOf = (index, q) => { const f = findMatches(index, q, 8); return f.hits[0] && !f.fallback ? f.hits[0].record.id : null; };

// ---- English is as it was: no record carries a local name, and the old words find the old things ----
{
  const recs = fresh();
  const index = buildIndex(recs, LAYERS);
  check(firstOf(index, 'moon') === 'moon' && firstOf(index, 'mars') === 'mars' && firstOf(index, 'iss') === 'sat-25544', 'in English "moon", "mars" and "iss" find what they found');
  check(firstOf(index, 'luna') !== null, 'and "luna" finds something (the landers, or the Moon by its alias)');
  check(index.name2.every((x) => x === ''), 'no second name is indexed in English');
}

// ---- the files: one per language, made from the catalogs, with the six names every language must have ----
const SIX = ['The Moon', 'Mars', 'The Sun', 'Earth', 'The Milky Way', 'International Space Station'];
const WANT = { 'The Moon': 'moon', Mars: 'mars', 'The Sun': 'sun', Earth: 'earth', 'The Milky Way': 'dso-milky-way', 'International Space Station': 'sat-25544' };
for (const lang of langs) {
  const path = `site/data/names/${lang}.json`;
  check(existsSync(join(ROOT, path)), `${path} exists (scripts/gen_names_i18n.py)`);
  if (!existsSync(join(ROOT, path))) continue;
  const doc = JSON.parse(read(path));
  const names = doc.names;
  check(doc.lang === lang && doc.count === Object.keys(names).length && doc.count >= 200, `${lang}: ${doc.count} names that differ from the English`);
  // A name the language writes as English does ("Mars" in French and German) is not in the file: it needs no entry.
  check(SIX.filter((k) => typeof names[k] === 'string' && names[k] && names[k] !== k).length >= 5, `${lang}: the Moon, Mars, the Sun, the Earth, the Milky Way and the station have names (${SIX.map((k) => names[k] || k).join(' | ')})`);
  const size = Buffer.byteLength(read(path));
  check(size < 40000, `${lang}: the file is small (${size} B), and only this language's visit fetches it`);

  const recs = fresh();
  const n = N.applyNames(recs, names, lang);
  check(n >= 60, `${lang}: ${n} records took a name`);
  check(N.applyNames(recs, names, lang) === 0, `${lang}: running it again changes nothing`);
  const byId = new Map(recs.map((r) => [r.id, r]));
  const index = buildIndex(recs, LAYERS);
  for (const english of SIX) {
    const local = names[english];
    const want = WANT[english];
    if (!local) { check(firstOf(index, english) === want, `${lang}: "${english}", the same word in this language, finds ${want}`); continue; }
    // typed as the catalog writes it (article and accents), without the article, without the accents, in lower case
    const bare = N.bareName(local, lang);
    for (const typed of new Set([local, bare, fold(bare), bare.toLowerCase(), fold(local.toLowerCase())])) {
      if ([...typed].length < 2) continue;
      check(firstOf(index, typed) === want, `${lang}: "${typed}" finds ${want} first (${firstOf(index, typed)})`);
    }
    const rec = byId.get(want);
    check(rec.meta.localName === bare && rec.meta.aliases.includes(english), `${lang}: ${want} keeps "${english}" as another name`);
    // the card's title, the label and the search row are drawn with it
    check(displayName(rec) === labelName(rec) && fold(displayName(rec).toLowerCase()) === fold(local.toLowerCase()), `${lang}: the card of ${want} is titled "${displayName(rec)}"`);
    const hit = findMatches(index, bare, 3).hits[0];
    check(hit && hit.name === displayName(rec), `${lang}: its search row reads "${hit && hit.name}"`);
  }
  // the English names still find them, and nothing about the record's identity changed
  check(firstOf(index, 'moon') === 'moon' && firstOf(index, 'mars') === 'mars' && firstOf(index, 'iss') === 'sat-25544' && firstOf(index, 'international space station') === 'sat-25544', `${lang}: the English names still find the Moon, Mars and the station`);
  check(byId.get('moon').name === 'The Moon' && byId.get('sat-25544').name === 'ISS (ZARYA)' && byId.get('moon').id === 'moon', `${lang}: a record's own name and id are the catalogue's, untouched`);
}

// ---- Spanish, as the review typed it ----
{
  const names = JSON.parse(read('site/data/names/es.json')).names;
  const recs = fresh();
  N.applyNames(recs, names, 'es');
  const index = buildIndex(recs, LAYERS);
  const TYPED = [['Luna', 'moon'], ['la Luna', 'moon'], ['luna', 'moon'], ['Marte', 'mars'], ['Sol', 'sun'], ['Tierra', 'earth'], ['Júpiter', 'jupiter'], ['Jupiter', 'jupiter'], ['jupiter', 'jupiter'],
    ['Vía Láctea', 'dso-milky-way'], ['via lactea', 'dso-milky-way'], ['Estación Espacial Internacional', 'sat-25544'], ['estacion espacial', 'sat-25544'], ['Nebulosa de Orión', 'dso-m42'], ['Galaxia de Andrómeda', 'dso-m31'], ['andromeda', 'dso-m31']];
  for (const [typed, want] of TYPED) check(firstOf(index, typed) === want, `es: "${typed}" finds ${want} first (${firstOf(index, typed)})`);
  const luna = findMatches(index, 'luna', 8).hits.map((h) => h.record.id);
  check(luna[0] === 'moon' && luna.includes('moon-luna-23'), `es: "luna" lists the Moon first and the Luna landers under it (${luna})`);
  const sol = findMatches(index, 'sol', 8).hits.map((h) => h.record.id);
  check(sol[0] === 'sun' && sol.includes('star-solaris'), `es: "sol" lists the Sun before Solaris and Solar Orbiter (${sol})`);
  check(displayName(recs.find((r) => r.id === 'moon')) === 'La Luna' && displayName(recs.find((r) => r.id === 'sat-25544')) === 'Estación Espacial Internacional', 'es: the cards are titled La Luna and Estación Espacial Internacional');
}

// ---- pieces ----
check(N.bareName('la Luna', 'es') === 'Luna' && N.bareName('el Sol', 'es') === 'Sol' && N.bareName('l’Étoile polaire', 'fr') === 'Étoile polaire' && N.bareName('die Milchstraße', 'de') === 'Milchstraße' && N.bareName('a Via Láctea', 'pt') === 'Via Láctea', 'a leading article is taken off for the index');
check(N.bareName('Las', 'es') === 'Las' && N.bareName('Луна', 'ru') === 'Луна' && N.bareName('Lagrange', 'es') === 'Lagrange', 'and nothing else is');
check(fold('júpiter') === 'jupiter' && fold('vía láctea') === 'via lactea' && fold('jupiter') === 'jupiter' && fold('étoile') === 'etoile' && fold('月球') === '月球', 'accents are folded for the search, other scripts are left as they are');
check(N.applyNames([{ id: 'x', name: 'Nothing Known', klass: 'satellite', meta: {} }], { 'The Moon': 'la Luna' }, 'es') === 0, 'a name the file does not have stays English');

// ---- the layers' names ----
const enNames = COPY.controls.layerName;
check(LAYER_ROWS.length === 40 && LAYER_ROWS.every((l) => enNames[l.id] === l.display) && Object.keys(enNames).length === LAYER_ROWS.length, 'copy has every layer\'s name, the same words as the registry\'s `display`');
for (const lang of langs) {
  const file = await import(join(JS, `copy/${lang}.js`));
  const names = file.COPY.controls && file.COPY.controls.layerName;
  const missing = LAYER_ROWS.filter((l) => !names || typeof names[l.id] !== 'string' || !names[l.id].trim()).map((l) => l.id);
  check(missing.length === 0, `${lang}: every layer has a name (${missing.join(', ') || 'all 40'})`);
  if (names) {
    const same = LAYER_ROWS.filter((l) => names[l.id] === l.display).map((l) => l.id);
    check(same.length <= 4, `${lang}: the names are translated, not copied (${same.length} the same as English: ${same.join(', ')})`);
    const long = LAYER_ROWS.filter((l) => [...String(names[l.id] || '')].length > 44).map((l) => `${l.id} (${[...names[l.id]].length})`);
    check(long.length === 0, `${lang}: no layer name is over 44 letters (${long.join(', ')})`);
  }
}
const main = read('site/js/main.js');
check(/for \(const l of LAYERS\) \{ const n = COPY\.controls\.layerName\[l\.id\]; if \(n && n !== l\.display\) \{ l\.displayEn = l\.display; l\.display = n; \} \}/.test(main), 'main.js writes a language\'s layer names over `display` before any panel is built');
check(main.indexOf('COPY.controls.layerName[l.id]') < main.indexOf('createShell(ctx') && main.indexOf('COPY.controls.layerName[l.id]') < main.indexOf('createRail(ctx'), 'before the shell and the rail are built');
check(/if \(document\.documentElement\.lang !== 'en'\) import\('\.\/ui\/localnames\.js'\)\.then\(\(m\) => m\.installLocalNames\(ctx\)\)/.test(main) && !/^import [^\n]*localnames/m.test(main), 'the names are fetched only when the page is not in English, and never at boot');
const search = read('site/js/ui/search.js');
check(/window\.addEventListener\('sr:names', onLayer\)/.test(search), 'the search index is built again when the names land');

// ---- installLocalNames: one fetch of the page language's file, then every arriving layer is named ----
{
  const fetched = [];
  const heard = {};
  const saved = { window: globalThis.window, CustomEvent: globalThis.CustomEvent };
  const events = [];
  globalThis.window = { addEventListener: (type, fn) => { heard[type] = fn; }, dispatchEvent: (e) => { events.push(e); return true; } };
  globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
  try {
    const recs = fresh();
    const names = JSON.parse(read('site/data/names/fr.json'));
    const fetchImpl = async (url) => { fetched.push(String(url)); return { ok: true, json: async () => names }; };
    const n = await N.installLocalNames({ records: () => recs }, { lang: 'fr', fetchImpl });
    check(fetched.length === 1 && /data\/names\/fr\.json$/.test(fetched[0]) && n >= 60, `French fetches data/names/fr.json once and names ${n} records`);
    check(events.length === 1 && events[0].type === 'sr:names' && typeof heard['sr:layer'] === 'function' && typeof heard['sr:later-layers'] === 'function', 'it says so once, and listens for the layers still to come');
    const none = await N.installLocalNames({ records: () => recs }, { lang: 'en', fetchImpl });
    check(none === 0 && fetched.length === 1, 'English fetches nothing');
    const failed = await N.installLocalNames({ records: () => fresh() }, { lang: 'de', fetchImpl: async () => { throw new Error('offline'); } });
    check(failed === 0, 'a file that does not arrive leaves the names in English, and does not throw');
  } finally {
    for (const k of ['window', 'CustomEvent']) { if (saved[k] === undefined) delete globalThis[k]; else globalThis[k] = saved[k]; }
  }
}

if (problems.length) {
  console.error(`local names FAILED (${problems.length}):\n  ${problems.slice(0, 40).join('\n  ')}`);
  process.exit(1);
}
console.log(`local names ok: in ${langs.length} languages the Moon, Mars, the Sun, the Earth, the Milky Way and the station are found by that language's own words (with or without article and accents) and by the English ones, their cards and rows are titled in the language, and all 40 layers have a name`);
