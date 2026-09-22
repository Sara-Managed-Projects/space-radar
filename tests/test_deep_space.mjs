// The deep-space layer's two halves agree: the list the harvester fetches from JPL Horizons
// (harvest/lists/horizons-ids.yaml) and the records the browser draws (data/sample.js
// sampleDeepSpace()). Ten craft were added on 2026-09-22, Psyche to STEREO-A, and each can appear
// two ways -- as the bundled stand-in, and as JPL's own vectors once the harvester's snapshot holds
// its id -- so both ways are checked here, against positions fetched from Horizons that day.
//
//   node tests/test_deep_space.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
const { parseHorizonsVectors } = await import(join(JS, 'data/parsers.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { realModelFor, REAL_MODELS } = await import(join(JS, 'scene/realmodels.js'));
const { drawingLine, firstSentence } = await import(join(JS, 'ui/cards.js'));

const AU_KM = 149597870.7;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const dist = (p, v) => Math.hypot(p.x - v[0], p.y - v[1], p.z - v[2]);
const at = (iso) => Date.parse(iso + 'T00:00:00Z');

// --- the list --------------------------------------------------------------------------------
// No YAML parser in the browser's toolchain, and the rows are one flow mapping per line, so a
// line pattern reads them exactly. A row this pattern cannot read is itself a failure below.
const yamlText = readFileSync(join(ROOT, 'harvest/lists/horizons-ids.yaml'), 'utf8');
const idLines = yamlText.split('\n').filter((l) => /^\s*-\s*\{\s*id:/.test(l));
const list = idLines.map((l) => {
  const m = /id:\s*"(-?\d+)"\s*,\s*name:\s*"([^"]+)"\s*,\s*app_id:\s*([a-z0-9-]+)\s*\}/.exec(l);
  return m ? { id: m[1], name: m[2], appId: m[3] } : { bad: l };
});
check(list.every((r) => !r.bad), `every horizons-ids.yaml row reads as {id, name, app_id}: ${JSON.stringify(list.filter((r) => r.bad))}`);
const rows = list.filter((r) => !r.bad);
check(new Set(rows.map((r) => r.id)).size === rows.length, 'no Horizons id is fetched twice');

const records = sampleDeepSpace();
const byId = new Map(records.map((r) => [r.id, r]));
check(records.length === 20, `the deep-space layer holds twenty records (found ${records.length})`);
check(byId.size === records.length, 'record ids are unique');

// Every id the harvester fetches has a record under the app id the list names, with the same name.
for (const r of rows) {
  const rec = byId.get(r.appId);
  check(rec, `horizons-ids.yaml ${r.id} (${r.name}) names ${r.appId}, which sampleDeepSpace() does not have`);
  if (!rec) continue;
  check(String(rec.meta.horizonsId) === r.id, `${r.appId} carries horizonsId ${rec.meta.horizonsId}, the list says ${r.id}`);
  check(rec.name === r.name, `${r.appId} is called "${rec.name}" in the app and "${r.name}" in the list`);
}
// ...and every record with an id is fetched. The two without one are drawn from an anchor or from
// elements with no phase, and are matched to their shapes by name (scene/realmodels.js, `named:`).
const listed = new Set(rows.map((r) => r.id));
for (const rec of records) {
  const hid = rec.meta.horizonsId;
  if (hid == null) continue;
  check(listed.has(String(hid)), `${rec.id} carries Horizons id ${hid} and the harvester never fetches it`);
}
const unlisted = records.filter((r) => r.meta.horizonsId == null).map((r) => r.id).sort();
check(JSON.stringify(unlisted) === JSON.stringify(['deep-gaia', 'deep-solar-orbiter']),
  `only Gaia and Solar Orbiter go without a Horizons id (found ${unlisted})`);
// A model keyed on an id the harvester does not fetch would be a model on a stand-in forever.
for (const key of Object.keys(REAL_MODELS.horizons)) {
  check(listed.has(key), `scene/realmodels.js draws Horizons id ${key}, which horizons-ids.yaml does not fetch`);
}

// --- every record ----------------------------------------------------------------------------
for (const rec of records) {
  const md = rec.meta || {};
  check(rec.layer === 'deep-space' && rec.source === 'horizons-deep-space' && rec.frame === 'sun-inertial',
    `${rec.id}: layer, source and frame are the deep-space layer's`);
  check(rec.cls === 'sample', `${rec.id}: a bundled stand-in is classed sample, not ${rec.cls}`);
  check(rec.klass === 'probe' || rec.klass === 'telescope', `${rec.id}: klass ${rec.klass}`);
  check(typeof md.note === 'string' && md.note.trim().length > 20, `${rec.id}: has a note`);
  check(typeof md.note === 'string' && md.note.length <= 160, `${rec.id}: note is ${md.note && md.note.length} characters, over 160`);
  for (const [k, s] of [['note', md.note], ['why', md.why], ['destination', md.destination]]) {
    if (typeof s === 'string') check(!s.includes(' -- '), `${rec.id}: ${k} carries a " -- "`);
  }
  check(typeof md.why === 'string' && md.why.length > 40, `${rec.id}: says why it is a stand-in`);
  // No cliffs: a bundled record must answer today and a year from now, not go quietly missing.
  for (const iso of ['2026-09-22', '2027-09-22']) {
    const p = propagate(rec, at(iso));
    check(p && [p.x, p.y, p.z].every(Number.isFinite), `${rec.id}: no position on ${iso}`);
  }
}

// --- the ten added 2026-09-22 ----------------------------------------------------------------
// Positions fetched from JPL Horizons on 2026-09-22 (VECTORS, CENTER='500@10', ecliptic J2000, km,
// 00:00 TDB), rounded to the kilometre. The first date of each is the row's element epoch; the
// others are where the row's `drift` sentence makes a claim, each with the range of distances that
// sentence can honestly be read to allow.
const HORIZONS = {
  'deep-psyche': { epoch: '2026-09-22', at: { '2026-09-22': [3019658, 245025730, -10602988], '2026-12-21': [-178124000, 241936039, -7315395] },
    claims: [['2026-12-21', 1.5e6, 2.6e6, '2 million km after three months']] },
  'deep-lucy': { epoch: '2026-09-22', at: { '2026-09-22': [-555791683, -510436847, -36446382], '2027-03-21': [-520234951, -635617889, -32255521] },
    claims: [['2027-03-21', 0, 16500, 'within 16 000 km for six months']] },
  'deep-europa-clipper': { epoch: '2026-09-22', at: { '2026-09-22': [117851807, -73719082, -4830920], '2026-12-03': [49352377, 138129685, -99424] },
    claims: [['2026-12-03', 0, 12500, 'within 12 000 km until the Earth flyby']] },
  'deep-juice': { epoch: '2026-10-01', at: { '2026-10-01': [146212145, 20041098, -2138], '2026-09-22': [156251883, -2849760, -47407], '2027-01-29': [-169903604, 83587565, -5525] },
    claims: [['2026-09-22', 1.5e6, 2.5e6, 'up to 2 million km out before the flyby'], ['2027-01-29', 80000, 140000, 'about 110 000 km four months after']] },
  'deep-bepicolombo': { epoch: '2026-09-22', at: { '2026-09-22': [-31960030, -62262324, -2141507], '2026-11-21': [-38935247, 31899945, 6157389] },
    claims: [['2026-11-21', 4e6, 6e6, '5 million km after two months']] },
  'deep-hera': { epoch: '2026-09-22', at: { '2026-09-22': [103962921, -188012645, -9272139], '2026-10-22': [141588199, -126123590, -10276588] },
    claims: [['2026-10-22', 100000, 180000, '140 000 km after a month']] },
  'deep-osiris-apex': { epoch: '2026-09-22', at: { '2026-09-22': [145000489, -90438641, -5430], '2027-01-20': [-36209536, 118841431, 8400] },
    claims: [['2027-01-20', 0, 2000, 'within about 1 000 km for four months']] },
  'deep-hayabusa2': { epoch: '2026-09-22', at: { '2026-09-22': [135043485, -67760030, -11093173], '2026-11-21': [144372660, 65443681, -9399866] },
    claims: [['2026-11-21', 100000, 170000, '130 000 km after two months']] },
  'deep-stereo-a': { epoch: '2026-09-22', at: { '2026-09-22': [53180424, 134302536, -190120], '2026-11-21': [-93756534, 110134962, -319800] },
    claims: [['2026-11-21', 0, 5000, 'within a few thousand km for two months']] },
};
const ADDED = [...Object.keys(HORIZONS), 'deep-hope'];

for (const [id, h] of Object.entries(HORIZONS)) {
  const rec = byId.get(id);
  check(rec, `${id} is in the layer`);
  if (!rec) continue;
  check(rec.klass === 'probe', `${id} is a probe`);
  check(rec.propagator === 'kepler' && rec.meta.construction === 'osculating', `${id} is drawn from its osculating elements`);
  check(Number.isFinite(rec.elements.maRad) && rec.elements.tpMs === undefined, `${id} carries a mean anomaly, so its phase is real`);
  check(rec.elements.epochMs === at(h.epoch), `${id}: element epoch is ${new Date(rec.elements.epochMs).toISOString()}, not ${h.epoch}`);
  // At its own epoch the row is JPL's position, to the rounding of the elements.
  const p0 = propagate(rec, at(h.epoch));
  const d0 = p0 ? dist(p0, h.at[h.epoch]) : Infinity;
  check(d0 < 1000, `${id}: ${Math.round(d0)} km from Horizons at its own epoch ${h.epoch} -- a digit is wrong`);
  // And the card's drift sentence is what the elements really do.
  for (const [iso, lo, hi, says] of h.claims) {
    const p = propagate(rec, at(iso));
    const d = p ? dist(p, h.at[iso]) : Infinity;
    check(d >= lo && d <= hi, `${id}: the card says "${says}", and on ${iso} it is ${Math.round(d).toLocaleString('en')} km`);
  }
  check(/JPL Horizons gave for it on \d{1,2} \w+ 2026/.test(rec.meta.why), `${id}: the honesty line names the day the orbit is from`);
}
// Hope orbits Mars and is drawn on Mars's orbit, like MRO: close, not exact.
{
  const hope = byId.get('deep-hope');
  check(hope && hope.meta.construction === 'anchored' && hope.meta.anchor === "Mars's orbit", 'Hope is anchored to Mars');
  const p = hope && propagate(hope, at('2026-09-22'));
  const d = p ? dist(p, [37008400, 228449273, 3874742]) : Infinity;
  check(d < 2e6, `Hope is within the Mars anchor's couple of million km of Horizons (${Math.round(d).toLocaleString('en')} km)`);
}
// One sentence each, sourced in the comment beside it; the older rows' notes predate that rule.
for (const id of ADDED) {
  const note = byId.get(id) && byId.get(id).meta.note;
  check(typeof note === 'string' && note.endsWith('.') && !/\.\s+[A-Z]/.test(note.slice(0, -1)), `${id}: the note is one sentence: "${note}"`);
}

// --- the two ways a record appears -----------------------------------------------------------
// With the snapshot: a Horizons body for every listed id turns each into JPL's vectors, and keeps
// its name, note, destination and aliases -- data/parsers.js replaces the position and nothing else.
function horizonsText(t0Ms, r, v) {
  const jd = (ms) => (ms / 86400000 + 2440587.5).toFixed(9);
  const row = (ms, k) => `${jd(ms)}, A.D. x, ${r.map((c, i) => (c + v[i] * k * 21600).toExponential(15)).join(', ')}, ${v.map((c) => c.toExponential(15)).join(', ')},`;
  return `header\n$$SOE\n${row(t0Ms, 0)}\n${row(t0Ms + 21600000, 1)}\n$$EOE\nfooter`;
}
{
  const t0 = at('2026-09-22');
  const body = {};
  for (const r of rows) body[r.id] = horizonsText(t0, [AU_KM, 0, 0], [0, 29.8, 0]);
  const live = parseHorizonsVectors(body, sampleDeepSpace());
  check(live.length === records.length, 'the snapshot drops no record');
  for (const rec of live) {
    const base = byId.get(rec.id);
    if (rec.meta.horizonsId == null) {
      check(rec.cls === 'sample' && rec.propagator === base.propagator, `${rec.id} has no id and stays the stand-in`);
      continue;
    }
    check(rec.cls === 'measured' && rec.propagator === 'sampled' && rec.meta.construction === 'horizons',
      `${rec.id}: with its id in the snapshot it is drawn from JPL's vectors`);
    check(rec.name === base.name && rec.meta.note === base.meta.note && rec.meta.destination === base.meta.destination &&
      JSON.stringify(rec.meta.aliases) === JSON.stringify(base.meta.aliases),
      `${rec.id}: the snapshot keeps its name, note, destination and aliases`);
  }
  // The live site today: a snapshot harvested before this list grew has only the old eight ids.
  const old = {};
  for (const id of ['-170', '-21', '-74', '-61', '-31', '-32', '-98', '-96']) old[id] = body[id];
  const partial = new Map(parseHorizonsVectors(old, sampleDeepSpace()).map((r) => [r.id, r]));
  for (const id of ADDED) {
    const rec = partial.get(id);
    check(rec && rec.cls === 'sample' && rec.propagator === 'kepler', `${id}: missing from an older snapshot, it is the bundled stand-in`);
  }
  check(partial.get('deep-voyager-1').cls === 'measured', 'and the older snapshot still makes Voyager 1 measured');
}

// --- found, drawn and described --------------------------------------------------------------
{
  const index = buildIndex(records, LAYERS);
  for (const [q, id] of [['psyche', 'deep-psyche'], ['Europa Clipper', 'deep-europa-clipper'], ['clipper', 'deep-europa-clipper'],
    ['lucy', 'deep-lucy'], ['juice', 'deep-juice'], ['jupiter icy moons', 'deep-juice'], ['bepicolombo', 'deep-bepicolombo'],
    ['hera', 'deep-hera'], ['osiris-apex', 'deep-osiris-apex'], ['osiris-rex', 'deep-osiris-apex'], ['apex', 'deep-osiris-apex'],
    ['hayabusa', 'deep-hayabusa2'], ['hope', 'deep-hope'], ['emirates', 'deep-hope'], ['stereo', 'deep-stereo-a']]) {
    const hit = findMatches(index, q).hits[0];
    check(hit && hit.record.id === id, `search "${q}" finds ${id} first (got ${hit && hit.record.id})`);
  }
}
for (const id of ADDED) {
  const rec = byId.get(id);
  // No model of its own in the repository, so the generic probe -- and the card says so.
  check(realModelFor(rec) === null, `${id} must not borrow another craft's model: ${JSON.stringify(realModelFor(rec))}`);
  const line = drawingLine(rec);
  check(typeof line === 'string' && line.includes('a generic probe') && line.includes('not this exact one'),
    `${id}: the card admits the shape is generic: ${line}`);
}
{
  const m = { distSunKm: 1.64 * AU_KM, lightMinutes: 16.1, tMs: at('2026-09-22'), altKm: null };
  const psyche = firstSentence(byId.get('deep-psyche'), {}, m, null);
  check(psyche.includes('on its way to the metal-rich asteroid 16 Psyche'), `the probe card says where Psyche is going: "${psyche}"`);
  check(psyche.length <= 160, `and stays one sentence of 160 characters: ${psyche.length}`);
  const bepi = firstSentence(byId.get('deep-bepicolombo'), {}, m, null);
  check(!bepi.includes('on its way to'), `BepiColombo arrives in months, so it carries no destination to go stale: "${bepi}"`);
}

if (problems.length) {
  console.log(`deep space: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log(`deep space ok: ${rows.length} Horizons ids and ${records.length} records agree both ways; the ten added ` +
  '2026-09-22 sit on JPL\'s positions at their epochs and drift as their cards say; a snapshot swaps in ' +
  'vectors and keeps the words; search finds them; each admits its generic shape');
