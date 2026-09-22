// The deep-space layer's two halves agree: the list the harvester fetches from JPL Horizons
// (harvest/lists/horizons-ids.yaml) and the records the browser draws (data/sample.js
// sampleDeepSpace()). Ten craft were added on 2026-09-22, Psyche to STEREO-A, and each can appear
// two ways -- as the bundled stand-in, and as JPL's own vectors once the harvester's snapshot holds
// its id -- so both ways are checked here, against positions fetched from Horizons that day. The five
// that circle another world (MRO, Mars Express, Hope, Juno, LRO) are drawn from that world, and
// have a section of their own below.
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
const { drawingLine, firstSentence, classLine, honestyClause, rightNowFor } = await import(join(JS, 'ui/cards.js'));
const { toStage, worldHelioEclKm, WORLD_RADIUS_KM } = await import(join(JS, 'propagate/frames.js'));
const { lapTimes } = await import(join(JS, 'propagate/orbiter.js'));
const { TDB_MINUS_UTC_MS } = await import(join(JS, 'data/parsers.js'));

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
// `center:` is optional and names the world a craft circles (2026-09-22); the rest are the Sun's.
const list = idLines.map((l) => {
  const m = /id:\s*"(-?\d+)"\s*,\s*name:\s*"([^"]+)"\s*,\s*app_id:\s*([a-z0-9-]+)\s*(?:,\s*center:\s*"'500@(\d+)'"\s*)?\}/.exec(l);
  return m ? { id: m[1], name: m[2], appId: m[3], center: m[4] ? Number(m[4]) : null } : { bad: l };
});
check(list.every((r) => !r.bad), `every horizons-ids.yaml row reads as {id, name, app_id[, center]}: ${JSON.stringify(list.filter((r) => r.bad))}`);
const rows = list.filter((r) => !r.bad);
check(new Set(rows.map((r) => r.id)).size === rows.length, 'no Horizons id is fetched twice');

const records = sampleDeepSpace();
const byId = new Map(records.map((r) => [r.id, r]));
check(records.length === 22, `the deep-space layer holds twenty-two records (found ${records.length})`);
check(byId.size === records.length, 'record ids are unique');

// Every id the harvester fetches has a record under the app id the list names, with the same name.
for (const r of rows) {
  const rec = byId.get(r.appId);
  check(rec, `horizons-ids.yaml ${r.id} (${r.name}) names ${r.appId}, which sampleDeepSpace() does not have`);
  if (!rec) continue;
  check(String(rec.meta.horizonsId) === r.id, `${r.appId} carries horizonsId ${rec.meta.horizonsId}, the list says ${r.id}`);
  check(rec.name === r.name, `${r.appId} is called "${rec.name}" in the app and "${r.name}" in the list`);
  // A craft drawn from its world must be FETCHED relative to that world, and nothing else may be:
  // data/parsers.js keeps the stand-in for any other answer, so a mismatch here is a craft that
  // would silently never use the snapshot.
  const naif = { mars: 499, jupiter: 599, moon: 301 }[rec.meta.orbits] || null;
  check(r.center === naif, `${r.appId}: the list asks for it relative to ${r.center || 'the Sun'}, the app draws it from ${rec.meta.orbits || 'the Sun'}`);
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
check(JSON.stringify(unlisted) === JSON.stringify(['deep-solar-orbiter']),
  `only Solar Orbiter goes without a Horizons id; Gaia has one since 2026-09-22 (found ${unlisted})`);
// A model keyed on an id the harvester does not fetch would be a model on a stand-in forever.
for (const key of Object.keys(REAL_MODELS.horizons)) {
  check(listed.has(key), `scene/realmodels.js draws Horizons id ${key}, which horizons-ids.yaml does not fetch`);
}

// --- every record ----------------------------------------------------------------------------
for (const rec of records) {
  const md = rec.meta || {};
  const frame = md.orbits ? `${md.orbits}-inertial` : 'sun-inertial';
  check(rec.layer === 'deep-space' && rec.source === 'horizons-deep-space' && rec.frame === frame,
    `${rec.id}: layer, source and frame (${rec.frame}) are the deep-space layer's`);
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
  // Gaia joined this table on 2026-09-22, when it turned out to have left L2 in March 2025. Same
  // query, COMMAND='-139479'.
  'deep-gaia': { epoch: '2026-09-22', at: { '2026-09-22': [135000631, -85879500, -160555], '2026-11-21': [151241804, 55026517, -217869], '2027-03-21': [-95522318, 122030231, 98154] },
    claims: [['2026-11-21', 0, 2000, 'within 2 000 km for two months'], ['2027-03-21', 15000, 22000, '20 000 km for six']] },
};
const ADDED = [...Object.keys(HORIZONS), 'deep-hope'];

for (const [id, h] of Object.entries(HORIZONS)) {
  const rec = byId.get(id);
  check(rec, `${id} is in the layer`);
  if (!rec) continue;
  check(rec.klass === (id === 'deep-gaia' ? 'telescope' : 'probe'), `${id} is a ${rec.klass}`);
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
// --- craft round another world (added 2026-09-22) ------------------------------------------------
// MRO, Mars Express, Hope, Juno and LRO are drawn FROM the world they circle (data/sample.js
// construction D, propagate/orbiter.js). What is held here, each against JPL's own numbers:
//   1. the stand-in starts on Horizons' state and strays exactly as its card says;
//   2. neither the stand-in nor the harvested snapshot is ever drawn inside the world;
//   3. the snapshot's arcs stay within the distance the card states;
//   4. the drawn craft is as far from the DRAWN world as the real one is from the real one;
//   5. the card never calls either "measured", and says what is known instead;
//   6. a snapshot that cannot place them (heliocentric, or coarser than six hours) is refused.
const ROUND = {
  'deep-mro': 'mars', 'deep-mars-express': 'mars', 'deep-hope': 'mars', 'deep-juno': 'jupiter', 'deep-lro': 'moon',
};
// JPL Horizons, EPHEM_TYPE=VECTORS, CENTER='500@499' (Mars; 599 Jupiter, 301 the Moon), VEC_TABLE=2,
// OUT_UNITS=KM-S, 00:00 TDB on the date, fetched 2026-09-22, to 0.1 km. The first date is the
// stand-in's own epoch; the others are where its `drift` sentence makes a claim, with the range of
// distances that sentence can honestly be read to allow.
const ROUND_HORIZONS = {
  'deep-mro': { at: { '2026-09-22': [919.3, 803.9, 3481.3], '2026-09-23': [2131.6, -2270.5, 1971.5], '2026-09-26': [-2160.6, 2262.9, -1853.8], '2026-09-27': [-1310.3, 3019.1, 1622.4] },
    claims: [['2026-09-23', 1000, 2200, '1 600 km from MRO after a day'], ['2026-09-26', 3650, 7400, 'after four days where MRO is on that ring is not known'], ['2026-09-27', 3650, 7400, 'not known']] },
  'deep-mars-express': { at: { '2026-09-22': [1422.3, -1469.8, 3262.3], '2026-09-23': [-5517.5, 203.3, -12549.7], '2026-09-24': [-609.2, 7213, -1555.6] },
    claims: [['2026-09-23', 0, 3000, 'up to 3 000 km from it within a day'], ['2026-09-24', 3000, 30000, 'after two days where it is on that orbit is not known']] },
  'deep-hope': { at: { '2026-09-22': [-13429.2, 32991.7, -4245.4], '2026-10-22': [-6561, 31325.7, -8434.6], '2026-11-21': [681.6, 27654.9, -12083.2] },
    claims: [['2026-10-22', 0, 200, 'within 200 km for a month'], ['2026-11-21', 0, 350, '350 km for two']] },
  'deep-juno': { at: { '2026-09-22': [1350578.5, -661190.2, -5432547.7], '2026-10-11': [523666.9, -724714.1, -1097504.3], '2026-10-13': [140139.5, 338003.8, -1443841.8] },
    claims: [['2026-10-11', 0, 6000, 'within 6 000 km until its close pass of 11 October 2026'], ['2026-10-13', 20000, Infinity, 'wrong after it']] },
  'deep-lro': { at: { '2026-09-22': [-1673.3, -729.4, 131.4], '2026-10-06': [1629.2, 728.2, 323.2], '2026-10-22': [-464.8, 55.8, 1760.7] },
    claims: [['2026-10-06', 0, 100, 'within 100 km of it for two weeks'], ['2026-10-22', 400, 800, 'about 600 km off after a month']] },
};
// The UTC instant of 00:00 TDB on a date: the orbiters are on the UTC clock (data/parsers.js).
const atTdb = (iso) => at(iso) - TDB_MINUS_UTC_MS;
const jdTdbToUtcMs = (jd) => (jd - 2440587.5) * 86400000 - TDB_MINUS_UTC_MS;
const MIN = 60000;
const HOUR = 3600000;
const radius = (p) => Math.hypot(p.x, p.y, p.z);

// The snapshot as the harvester writes it once horizons-ids.yaml asks for these relative to their
// world, cut from real answers: tests/fixtures/snapshots/horizons-round-a-world.json says which.
const ROUND_FX = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/snapshots/horizons-round-a-world.json'), 'utf8'));
const ROUND_FX_TRUTH_JUNO = () => ROUND_FX.truth['-61'];
const roundLive = new Map(parseHorizonsVectors(ROUND_FX.body, sampleDeepSpace()).map((r) => [r.id, r]));
// The worst distance from JPL's finer-step truth each card allows ("within about 160 km" and so
// on), measured over 2026-09-22..10-22 in data/sample.js; Juno's is at its perijove, 2026-10-11
// 22:59 TDB, which the fixture straddles.
const ARC_KM = { 'deep-mro': 165, 'deep-mars-express': 92, 'deep-hope': 1, 'deep-juno': 950, 'deep-lro': 7 };

for (const [id, world] of Object.entries(ROUND)) {
  const rec = byId.get(id);
  check(rec, `${id} is in the layer`);
  if (!rec) continue;
  const R = WORLD_RADIUS_KM[world];
  const md = rec.meta;
  check(rec.propagator === 'orbiter' && rec.frame === `${world}-inertial` && md.orbits === world && md.construction === 'round-a-world',
    `${id} is drawn from ${world}: ${rec.propagator}, ${rec.frame}, ${md.orbits}`);
  check(rec.cls === 'sample' && rec.muKm3S2 > 0 && rec.samples.length === 1, `${id}: one bundled state and ${world}'s GM`);

  // 1. On Horizons' state at its epoch, and straying as the card says.
  const h = ROUND_HORIZONS[id];
  const p0 = propagate(rec, atTdb('2026-09-22'));
  const d0 = p0 ? dist(p0, h.at['2026-09-22']) : Infinity;
  check(d0 < 1, `${id}: ${d0.toFixed(2)} km from Horizons at its own epoch -- a digit is wrong, or the TDB shift is`);
  for (const [iso, lo, hi, says] of h.claims) {
    const p = propagate(rec, atTdb(iso));
    const d = p ? dist(p, h.at[iso]) : Infinity;
    check(d >= lo && d <= hi, `${id}: the card says "${says}", and on ${iso} it is ${Math.round(d).toLocaleString('en')} km`);
  }
  for (const [, , , says] of h.claims) check(md.why.includes(says.split(' ').slice(0, 3).join(' ')), `${id}: the card carries "${says}"`);
  if (id === 'deep-juno') {
    // "Until its close pass" at 10-minute steps through the pass itself (perijove 2026-10-11 22:59
    // TDB, in the fixture's truth), where Juno moves 55 km/s and a minute is 3 300 km.
    let before = 0;
    let after = Infinity;
    for (const [jd, x, y, z] of ROUND_FX_TRUTH_JUNO()) {
      const p = propagate(rec, jdTdbToUtcMs(jd));
      const d = p ? dist(p, [x, y, z]) : Infinity;
      if (jd <= 2461325.5) before = Math.max(before, d); // to 2026-10-12 00:00 TDB
      else if (jd >= 2461325.75) after = Math.min(after, d); // from 06:00
    }
    check(before <= 6000, `Juno's stand-in is ${Math.round(before)} km out through its close pass; the card says within 6 000`);
    check(after > 6000, `Juno's stand-in is only ${Math.round(after)} km out after its close pass, where the card says it is wrong`);
  }

  // 2. Never inside its world: 48 hours at one-minute steps, the stand-in and the snapshot, and a
  //    lap a year on for the stand-in, which draws for ever.
  const live = roundLive.get(id);
  check(live && live.propagator === 'orbiter' && live.cls === 'inferred' && live.frame === rec.frame,
    `${id}: a snapshot relative to ${world} becomes JPL's states, inferred (${live && live.propagator}/${live && live.cls})`);
  const sweepFrom = world === 'jupiter' ? jdTdbToUtcMs(ROUND_FX.truth['-61'][0][0]) : atTdb('2026-09-23');
  let lowest = Infinity;
  let lowestLive = Infinity;
  for (let t = sweepFrom; t <= sweepFrom + 48 * HOUR; t += MIN) {
    const p = propagate(rec, t);
    const q = live && propagate(live, t);
    lowest = Math.min(lowest, p ? radius(p) : -Infinity);
    lowestLive = Math.min(lowestLive, q ? radius(q) : -Infinity);
  }
  for (let t = at('2027-09-22'); t <= at('2027-09-22') + md.periodMin * MIN; t += md.periodMin * MIN / 500) {
    const p = propagate(rec, t);
    lowest = Math.min(lowest, p ? radius(p) : -Infinity);
  }
  check(lowest > R + 50, `${id}: the stand-in comes within ${Math.round(lowest - R)} km of ${world}'s surface`);
  check(lowestLive > R + 50, `${id}: the snapshot comes within ${Math.round(lowestLive - R)} km of ${world}'s surface`);

  // 3. The snapshot's arcs against JPL's own finer steps.
  const truth = ROUND_FX.truth[String(md.horizonsId)];
  let worst = 0;
  for (const [jd, x, y, z] of truth) {
    const q = live && propagate(live, jdTdbToUtcMs(jd));
    worst = Math.max(worst, q ? dist(q, [x, y, z]) : Infinity);
  }
  check(worst <= ARC_KM[id], `${id}: the snapshot strays ${worst.toFixed(1)} km from JPL, and the card allows ${ARC_KM[id]}`);

  // 4. Drawn from the drawn world: on that world's own stage (sun-inertial, origin on the world),
  //    the craft is |p| from Astronomy Engine's world -- the one scene/worlds.js draws.
  for (const t of [sweepFrom, sweepFrom + 7 * HOUR, sweepFrom + 31 * HOUR]) {
    const p = propagate(live, t);
    const onStage = p && toStage(live, p, { worldId: world, frame: 'sun-inertial' }, t);
    const o = worldHelioEclKm(world, t);
    const off = onStage ? Math.abs(dist(onStage, [o.x, o.y, o.z]) - radius(p)) : Infinity;
    check(off < 1e-3, `${id}: drawn ${off} km off its own distance from the drawn ${world}`);
  }

  // 5. The card: never "measured", and what IS known.
  for (const [how, r] of [['stand-in', rec], ['snapshot', live]]) {
    if (!r) continue;
    const m = { cls: propagate(r, sweepFrom).cls, tMs: sweepFrom };
    const line = classLine(r, m) + ' ' + (honestyClause(r) || '');
    check(!/\bmeasured position\b|closer to the truth/i.test(line), `${id} (${how}): the card claims a measurement: "${line}"`);
    // "circles Mars over the poles every 112 minutes, 240 to 310 km up": the row's own `orbit`.
    const orbit = md.snapshotKnown.slice('it '.length, md.snapshotKnown.indexOf(';'));
    check(/ every [\d ]+ (minutes|hours|days)/.test(orbit) && / km/.test(orbit) && line.includes(orbit),
      `${id} (${how}): the card says how high and how often: "${line}"`);
  }
  // "Standing on: Mars" was MRO's first row in the browser, 2026-09-22. It is in orbit, and the
  // height is the one the orbit sentence gives.
  for (const [how, r] of [['stand-in', rec], ['snapshot', live]]) {
    const cells = new Map(rightNowFor(r, { clock: { now: () => sweepFrom }, worlds: null, selected: () => null }));
    const up = cells.get(`Height above ${world === 'moon' ? 'the Moon' : world[0].toUpperCase() + world.slice(1)}`);
    const km = up ? Number(up.replace(/[^\d]/g, '')) : NaN;
    check(cells.has('In orbit round') && !cells.has('Standing on') && km > 0 && km < 6e6,
      `${id} (${how}): the card says it is in orbit, and how high: ${JSON.stringify([...cells])}`);
  }
  check(typeof live.meta.orbitKnown === 'string' && live.meta.orbitKnown.includes('every six hours'),
    `${id}: the snapshot's card says how it is drawn: "${live.meta.orbitKnown}"`);
  for (const s of [md.why, md.snapshotKnown, md.note]) check(!s.includes(' -- '), `${id}: a " -- " in its copy`);
}

// 6. What cannot place them is refused. The fixture texts made heliocentric (their centre line
//    rewritten to the Sun, as every snapshot before 2026-09-22 was) keep the stand-in; so does a
//    snapshot twelve hours apart, which the `arc` sentences were not measured at.
{
  const helio = {};
  const coarse = {};
  for (const [k, text] of Object.entries(ROUND_FX.body)) {
    helio[k] = text.replace(/Center body name:[^\n]*/, 'Center body name: Sun (10)');
    const lines = text.split('\n');
    const soe = lines.indexOf('$$SOE');
    coarse[k] = lines.filter((l, i) => i <= soe || !/^\d/.test(l) || (i - soe) % 2 === 1).join('\n');
  }
  for (const [label, body] of [['heliocentric', helio], ['twelve-hourly', coarse]]) {
    const got = new Map(parseHorizonsVectors(body, sampleDeepSpace()).map((r) => [r.id, r]));
    for (const id of Object.keys(ROUND)) {
      const r = got.get(id);
      check(r && r.cls === 'sample' && r.meta.construction === 'round-a-world', `${id}: a ${label} snapshot must leave the stand-in (${r && r.meta.construction})`);
    }
  }
}

// 7. The orbit line. Evenly spaced in time, a lap of Juno's crossed Jupiter; lapTimes() spaces the
//    points in eccentric anomaly. The lowest point of any chord of the line, over a lap started
//    every day for a month, for the stand-in.
{
  const juno = byId.get('deep-juno');
  const lowestChord = (times) => {
    const pts = times.map((t) => propagate(juno, t)).filter(Boolean);
    let m = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      for (let k = 0; k <= 10; k++) {
        const f = k / 10;
        m = Math.min(m, Math.hypot(a.x + f * (b.x - a.x), a.y + f * (b.y - a.y), a.z + f * (b.z - a.z)));
      }
    }
    return m;
  };
  let even = Infinity;
  let spaced = Infinity;
  const P = juno.meta.periodMin * MIN;
  for (let d = 0; d < 30; d++) {
    const t0 = at('2026-09-22') + d * 86400000;
    even = Math.min(even, lowestChord(Array.from({ length: 240 }, (_, k) => t0 + (P * k) / 240)));
    spaced = Math.min(spaced, lowestChord(lapTimes(juno, t0, 240)));
  }
  check(even < WORLD_RADIUS_KM.jupiter, `evenly spaced, Juno's line should cut Jupiter (it is why lapTimes exists): lowest ${Math.round(even)} km`);
  check(spaced > WORLD_RADIUS_KM.jupiter + 5000, `Juno's orbit line comes within ${Math.round(spaced - WORLD_RADIUS_KM.jupiter)} km of Jupiter`);
}
// One sentence each, sourced in the comment beside it; the older rows' notes predate that rule.
for (const id of ADDED) {
  const note = byId.get(id) && byId.get(id).meta.note;
  check(typeof note === 'string' && note.endsWith('.') && !/\.\s+[A-Z]/.test(note.slice(0, -1)), `${id}: the note is one sentence: "${note}"`);
}

// --- the two ways a record appears -----------------------------------------------------------
// With the snapshot: a Horizons body for every listed id turns each into JPL's vectors, and keeps
// its name, note, destination and aliases -- data/parsers.js replaces the position and nothing else.
// These made-up bodies name no centre, which reads as the Sun's: right for the craft on their own
// paths round the Sun, and exactly what the five round another world must refuse (section above).
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
    if (rec.meta.horizonsId == null || rec.meta.orbits) {
      check(rec.cls === 'sample' && rec.propagator === base.propagator, `${rec.id} has no id, or circles a world, and stays the stand-in`);
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
    check(rec && rec.cls === 'sample' && rec.propagator === byId.get(id).propagator, `${id}: missing from an older snapshot, it is the bundled stand-in`);
  }
  check(partial.get('deep-voyager-1').cls === 'measured', 'and the older snapshot still makes Voyager 1 measured');
  // ...and it held -74 and -61 heliocentric, which since 2026-09-22 cannot place MRO or Juno.
  for (const id of ['deep-mro', 'deep-juno']) check(partial.get(id).cls === 'sample', `${id}: an older, heliocentric snapshot leaves the stand-in`);
}

// --- found, drawn and described --------------------------------------------------------------
{
  const index = buildIndex(records, LAYERS);
  for (const [q, id] of [['psyche', 'deep-psyche'], ['Europa Clipper', 'deep-europa-clipper'], ['clipper', 'deep-europa-clipper'],
    ['lucy', 'deep-lucy'], ['juice', 'deep-juice'], ['jupiter icy moons', 'deep-juice'], ['bepicolombo', 'deep-bepicolombo'],
    ['hera', 'deep-hera'], ['osiris-apex', 'deep-osiris-apex'], ['osiris-rex', 'deep-osiris-apex'], ['apex', 'deep-osiris-apex'],
    ['hayabusa', 'deep-hayabusa2'], ['hope', 'deep-hope'], ['emirates', 'deep-hope'], ['stereo', 'deep-stereo-a'],
    ['mars express', 'deep-mars-express'], ['lro', 'deep-lro'], ['lunar reconnaissance', 'deep-lro'], ['gaia', 'deep-gaia']]) {
    const hit = findMatches(index, q).hits[0];
    check(hit && hit.record.id === id, `search "${q}" finds ${id} first (got ${hit && hit.record.id})`);
  }
}
for (const id of [...ADDED.filter((x) => x !== 'deep-gaia'), 'deep-mars-express', 'deep-lro']) {
  const rec = byId.get(id);
  // No model of its own in the repository, so the generic probe -- and the card says so. (Gaia,
  // in the osculating table since 2026-09-22, keeps the one scene/models.js builds for it.)
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
  '2026-09-22 sit on JPL\'s positions at their epochs and drift as their cards say; the five round another ' +
  'world never go inside it, stay as close to JPL as their cards say, and are never called measured; a ' +
  'snapshot swaps in vectors and keeps the words; search finds them; each admits its generic shape');
