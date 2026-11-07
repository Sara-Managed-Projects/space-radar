// tests/test_geo_buses.mjs -- a geostationary satellite wears the bus a source names for it, and no other (release 2.0.0, batch m2-buses; forge #117).
//
// 466 geostationary satellites wore one SSL-1300 (the NASA model) whatever they were. registry/geo-buses.yaml now names the bus of 363 of them, each with its citations
// (Wikidata's `spacecraft bus`, the Wikipedia infobox, Gunter's Space Page, McDowell's GCAT), found by catalogue number and never by name. Held here, with no browser:
//   1. Every row cites at least one source, with a reference and the words it says; no catalogue number is listed twice; every row's bus is a bus of the table.
//   2. A bus with a file has the file on disc and a card name; a bus without one says why (`note`) and its satellites keep the stand-in.
//   3. realModelFor() answers every row: the file of its bus when drawn, the stand-in (`generic`, "a geostationary satellite") when not.
//   4. The NAME decides nothing: the same name on a number the registry does not list is the stand-in, and a number that is listed is its bus whatever it is called.
//   5. The generated mirror site/js/data/geobuses.js holds exactly the numbers of the drawn buses (scripts/gen_geo_buses_js.py --check says the same).
//   node tests/test_geo_buses.mjs
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const { realModelFor, REAL_MODELS } = await import(pathToFileURL(join(ROOT, 'site/js/scene/realmodels.js')).href);
const { GEO_BUS_NORADS } = await import(pathToFileURL(join(ROOT, 'site/js/data/geobuses.js')).href);

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
  if (b.file) {
    check(existsSync(join(ROOT, 'site/models', b.file)), `bus ${b.id}: site/models/${b.file} is not on disc`);
    const entry = REAL_MODELS.geoBus[b.id];
    check(entry && entry.file === b.file && entry.name === b.name, `bus ${b.id}: the route in scene/realmodels.js (${entry && entry.file}, ${entry && entry.name}) is not the registry's (${b.file}, ${b.name})`);
    drawn.set(b.id, b);
  } else {
    check(String(b.note || '').startsWith('held:'), `bus ${b.id} has no file and no \`held:\` reason`);
  }
}
for (const id of Object.keys(REAL_MODELS.geoBus)) check(drawn.has(id), `scene/realmodels.js has a bus ${id} that the registry does not draw`);

// 3
const orbit = { meanMotion: 1.0027, eccentricity: 0.0002, inclinationDeg: 0.05 };
const rec = (norad, name) => ({ id: `sat-${norad}`, name, klass: 'satellite', layer: 'active', meta: { noradId: norad, ...orbit } });
let wornOwn = 0; let standIn = 0;
for (const s of sats) {
  const got = realModelFor(rec(s.norad, s.name));
  if (drawn.has(s.bus)) {
    const b = drawn.get(s.bus);
    check(got && got.file === b.file && got.name === b.name, `${s.name} (${s.norad}): wears ${got && got.file}, the registry says ${b.file}`);
    check(got && got.generic === true, `${s.name}: a bus file is the kind of thing, and the card must say so (generic)`);
    wornOwn += 1;
  } else {
    check(got && got.file === 'bus-ssl1300.glb' && got.generic === true && got.name === 'a geostationary satellite', `${s.name} (${s.norad}): its bus ${s.bus} is not drawn, so it keeps the stand-in; got ${got && got.name}`);
    standIn += 1;
  }
}
check(wornOwn >= 250, `at least 250 satellites wear their own bus (${wornOwn})`);

// 4. the name decides nothing
const listed = sats.find((s) => s.bus === 'eurostar-e3000');
const renamed = realModelFor(rec(listed.norad, 'INTELSAT 14 (IS 14)'));
check(renamed && renamed.file === 'bus-eurostar-e3000.glb', 'a listed number is its bus whatever it is called');
const unlisted = realModelFor(rec(99999, listed.name));
check(unlisted && unlisted.name === 'a geostationary satellite', 'an unlisted number with a listed satellite\'s name is the stand-in: the name decides nothing');
const notGeo = realModelFor({ id: 'x', name: listed.name, klass: 'debris', layer: 'active', meta: { noradId: listed.norad, ...orbit } });
check(!notGeo || notGeo.file !== 'bus-eurostar-e3000.glb', 'a debris-class object never wears a satellite bus');

// 5
const fromRegistry = {};
for (const s of sats) if (drawn.has(s.bus)) (fromRegistry[s.bus] ||= []).push(s.norad);
for (const k of Object.keys(fromRegistry)) check(JSON.stringify([...fromRegistry[k]].sort((a, b) => a - b)) === JSON.stringify(GEO_BUS_NORADS[k]), `data/geobuses.js disagrees with the registry about ${k}`);
check(Object.keys(GEO_BUS_NORADS).length === Object.keys(fromRegistry).length, 'data/geobuses.js lists a bus the registry does not draw');

if (problems.length) { console.error('geo buses FAILED:\n  ' + problems.slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`geo buses ok: ${sats.length} satellites, each with a citation; ${wornOwn} wear the file of their sourced bus (${drawn.size} drawn families), ${standIn} are sourced to a bus that is not drawn yet and keep the stand-in; the name decides nothing`);
