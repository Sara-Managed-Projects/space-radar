// tests/test_geo_buses.mjs -- which bus a geostationary satellite flies, sourced, and what its card says (release 2.0.0, batch m2-buses; forge #117).
//
// 466 geostationary satellites wore one SSL-1300 (the NASA model) whatever they were. registry/geo-buses.yaml now names the bus of 363 of them, each with its citations
// (Wikidata's `spacecraft bus`, the Wikipedia infobox, Gunter's Space Page, McDowell's GCAT), found by catalogue number and never by name. Only the SSL-1300 has a file (NASA's own
// model); eight families built in tools/bus-builder were HELD, so their satellites keep the stand-in and their card NAMES THE BUS and whose word it is. Held here, with no browser:
//   1. Every row cites at least one source, with a reference and the words it says; no catalogue number is listed twice; every row's bus is a bus of the table, with a label.
//   2. A bus with a file has it on disc and a route; a bus without one says why (`note`, beginning `held:`), and no file of a held family is in site/models.
//   3. realModelFor() answers every row: NASA's SSL-1300 file for an SSL-1300; for every other bus the stand-in (`generic`, "a geostationary satellite") carrying `sourcedBus`
//      = the bus's label and one of the sources the row cites.
//   4. The NAME decides nothing: the same name on a number the registry does not list is the plain stand-in, and a number that is listed is its bus whatever it is called.
//   5. The generated mirror site/js/data/geobuses.js holds exactly the registry's numbers (scripts/gen_geo_buses_js.py --check says the same).
// b200-m4-buses: since batch m4-buses nine families are drawn by files of ours (Eurostar E3000, Boeing 702HP/MP, 702SP, A2100AX, Spacebus 4000B, GEOStar-2, DFH-4, I-3K, I-2K): their rows wear the file, except a
// `stand_in` row (a satellite whose biggest part, a large reflector, a telescope or relay dishes, the family's file does not draw), which keeps the stand-in and names its bus as a held family's do.
//   node tests/test_geo_buses.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const { realModelFor, REAL_MODELS } = await import(pathToFileURL(join(ROOT, 'site/js/scene/realmodels.js')).href);
await import(pathToFileURL(join(ROOT, 'site/js/scene/sourcedtables.js')).href); // the CubeSat and bus tables come with the card and the shapes, not the boot (scene/sourcedtables.js)
const { GEO_BUS_NORADS, GEO_BUS_LABELS } = await import(pathToFileURL(join(ROOT, 'site/js/data/geobuses.js')).href);

// the registry's rows are one JSON mapping a line, after the dash
const text = readFileSync(join(ROOT, 'registry/geo-buses.yaml'), 'utf8');
const buses = []; const sats = []; let section = '';
for (const line of text.split('\n')) {
  if (/^buses:/.test(line)) section = 'buses';
  else if (/^satellites:/.test(line)) section = 'satellites';
  else if (/^  - \{/.test(line)) (section === 'buses' ? buses : sats).push(JSON.parse(line.slice(4)));
}
check(buses.length >= 20 && sats.length >= 300, `registry/geo-buses.yaml was read (${buses.length} buses, ${sats.length} satellites)`);

// 1
const SOURCES = new Set(['wikidata', 'wikipedia', 'gunter', 'gcat']);
const seen = new Set(); const ids = new Set(buses.map((b) => b.id));
for (const s of sats) {
  check(Number.isInteger(s.norad) && !seen.has(s.norad), `${s.name}: ${s.norad} is listed twice or is not a number`);
  seen.add(s.norad);
  check(ids.has(s.bus), `${s.name}: bus ${s.bus} is not in \`buses\``);
  check(Array.isArray(s.cite) && s.cite.length >= 1, `${s.name} (${s.norad}) has no citation: a bus is never guessed from the name`);
  for (const c of s.cite || []) check(SOURCES.has(c.by) && String(c.ref || '').length > 1 && String(c.says || '').length > 1, `${s.name}: a citation without a known source, a reference or the words it says (${JSON.stringify(c)})`);
}

// 2
const drawn = new Map();
for (const b of buses) {
  check(typeof b.label === 'string' && b.label.length > 2 && GEO_BUS_LABELS[b.id] === b.label, `bus ${b.id}: no label, or data/geobuses.js disagrees about it`);
  if (b.file) {
    check(existsSync(join(ROOT, 'site/models', b.file)), `bus ${b.id}: site/models/${b.file} is not on disc`);
    const entry = REAL_MODELS.geoBus[b.id];
    check(entry && entry.file === b.file && entry.name === b.name, `bus ${b.id}: the route in scene/realmodels.js (${entry && entry.file}, ${entry && entry.name}) is not the registry's (${b.file}, ${b.name})`);
    drawn.set(b.id, b);
  } else {
    check(String(b.note || '').startsWith('held:'), `bus ${b.id} has no file and no \`held:\` reason`);
    check(!REAL_MODELS.geoBus[b.id], `bus ${b.id} is held and scene/realmodels.js routes it`);
  }
}
for (const id of Object.keys(REAL_MODELS.geoBus)) check(drawn.has(id), `scene/realmodels.js has a bus ${id} that the registry does not draw`);
// b200-m4-buses: begin -- nine families are drawn by files of ours since batch m4-buses, each `made: 'renders'` (from the maker's renders) or `'dimensions'` (from photographs: the I-3K and I-2K); any other bus file in site/models is a held one and must not ship
const OURS = ['eurostar-e3000', 'boeing-702', 'boeing-702sp', 'a2100ax', 'spacebus-4000b', 'geostar-2', 'dfh-4', 'i-3k', 'i-2k'];
check(drawn.size === 1 + OURS.length && drawn.has('ssl-1300') && OURS.every((id) => drawn.has(id)), `the drawn families are NASA's SSL-1300 and ${OURS.join(', ')} (${[...drawn.keys()].join(', ')})`);
const shipped = new Set([...drawn.values()].map((b) => b.file));
for (const f of readdirSync(join(ROOT, 'site/models'))) check(!/^bus-/.test(f) || shipped.has(f), `site/models/${f} is a held bus file and must not ship`);
for (const id of OURS) {
  const e = REAL_MODELS.geoBus[id];
  check(e && e.generic === true && ['renders', 'dimensions'].includes(e.made) && e.made === drawn.get(id).made && e.axes === 'app' && e.colour === 'satellite' && !e.sourcedBus, `bus ${id}: a family of ours is worn as the kind of thing, at the app's axes, and says how it was built (${JSON.stringify(e)})`);
}
// b200-m4-buses: end

// 3
const orbit = { meanMotion: 1.0027, eccentricity: 0.0002, inclinationDeg: 0.05 };
const rec = (norad, name) => ({ id: `sat-${norad}`, name, klass: 'satellite', layer: 'active', meta: { noradId: norad, ...orbit } });
const BY = { gcat: 'GCAT', gunter: 'Gunter\u2019s Space Page', wikipedia: 'Wikipedia', wikidata: 'Wikidata' };
const busOf = new Map(buses.map((b) => [b.id, b]));
let ssl = 0; let named = 0;
for (const s of sats) {
  const got = realModelFor(rec(s.norad, s.name));
  // b200-m4-buses: begin -- a drawn family's row wears its file (a `stand_in` row keeps the stand-in and names its bus, below)
  if (drawn.has(s.bus) && !s.stand_in) {
    const b = drawn.get(s.bus);
    check(got && got.file === b.file && got.generic === true && got.name === b.name && !got.sourcedBus, `${s.name} (${s.norad}): a ${s.bus} wears ${got && got.file}, not ${b.file}`);
    ssl += 1;
  } else if (drawn.has(s.bus) && s.bus === 'ssl-1300') {
    check(false, `${s.name} (${s.norad}): an SSL-1300 may not be a stand_in row`);
  // b200-m4-buses: end
  } else {
    const label = busOf.get(s.bus).label;
    const cited = s.cite.map((c) => BY[c.by]);
    check(got && got.file === 'bus-ssl1300.glb' && got.generic === true && got.name === 'a geostationary satellite', `${s.name} (${s.norad}): its bus ${s.bus} is not drawn, so it keeps the stand-in; got ${got && got.name}`);
    check(got && got.sourcedBus && got.sourcedBus.name === label && cited.includes(got.sourcedBus.by), `${s.name} (${s.norad}): the card must name ${label} and one of ${cited.join(', ')}; got ${JSON.stringify(got && got.sourcedBus)}`);
    named += 1;
  }
}
check(ssl >= 240 && named >= 60, `the table covers ${ssl} satellites of drawn families and ${named} of other buses`); // b200-m4-buses: 94 SSL-1300s and the four families of ours

// 4. the name decides nothing
const listed = sats.find((s) => !drawn.has(s.bus) || s.stand_in);
const renamed = realModelFor(rec(listed.norad, 'INTELSAT 14 (IS 14)'));
check(renamed && renamed.sourcedBus && renamed.sourcedBus.name === busOf.get(listed.bus).label, 'a listed number is its bus whatever it is called');
const unlisted = realModelFor(rec(99999, listed.name));
check(unlisted && unlisted.name === 'a geostationary satellite' && !unlisted.sourcedBus, 'an unlisted number with a listed satellite\'s name is the plain stand-in: the name decides nothing');
const notGeo = realModelFor({ id: 'x', name: listed.name, klass: 'satellite', layer: 'active', meta: { noradId: listed.norad, meanMotion: 14.2, eccentricity: 0.001, inclinationDeg: 51 } });
check(!notGeo || !notGeo.sourcedBus, 'a held bus names itself only on a satellite in the ring: the stand-in is for the ring');
const notSat = realModelFor({ id: 'x', name: listed.name, klass: 'debris', layer: 'active', meta: { noradId: listed.norad, ...orbit } });
check(!notSat || (!notSat.sourcedBus && notSat.file !== 'bus-ssl1300.glb'), 'a debris-class object never wears a satellite bus');

// 5
const fromRegistry = {};
const PREF = ['gcat', 'gunter', 'wikipedia', 'wikidata'];
for (const s of sats) {
  const key = drawn.has(s.bus) && !s.stand_in ? s.bus : `${s.bus}:${PREF.find((p) => s.cite.some((c) => c.by === p))}`; // b200-m4-buses: a stand_in row is keyed as held
  (fromRegistry[key] ||= []).push(s.norad);
}
for (const k of Object.keys(fromRegistry)) check(JSON.stringify([...fromRegistry[k]].sort((a, b) => a - b)) === JSON.stringify(GEO_BUS_NORADS[k]), `data/geobuses.js disagrees with the registry about ${k}`);
check(Object.keys(GEO_BUS_NORADS).length === Object.keys(fromRegistry).length, 'data/geobuses.js lists a key the registry does not');

// 6. the card sentence: in every language, with both holes, and the card code asks for it
for (const lang of ['en', 'ar', 'de', 'es', 'fr', 'he', 'hi', 'pt', 'ru', 'uk', 'zh']) {
  const src = readFileSync(join(ROOT, `site/js/copy/${lang}.js`), 'utf8');
  const m = /objectBus"?: ['"]([^\n]*)['"],/.exec(src);
  check(!!m && m[1].includes('{bus}') && m[1].includes('{source}'), `site/js/copy/${lang}.js has no objectBus with {bus} and {source}`);
}
check(/entry\.sourcedBus && T\.objectBus/.test(readFileSync(join(ROOT, 'site/js/ui/cards.js'), 'utf8')), 'ui/cards.js does not print the bus of a stand-in satellite');

if (problems.length) { console.error('geo buses FAILED:\n  ' + problems.slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`geo buses ok: ${sats.length} satellites, each with a citation; ${ssl} wear their own family's file (NASA's SSL-1300 or one of ours), ${named} keep the stand-in and a card that names their bus and its source (${buses.length - drawn.size} held families); the name decides nothing`);
