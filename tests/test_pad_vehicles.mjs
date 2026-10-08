// tests/test_pad_vehicles.mjs -- a rocket on a hand-kept pad is drawn only around its listed
// liftoffs (public #427, 2026-10-08): a Saturn V on Launch Complex 39A today would be a false picture.
//
//   node tests/test_pad_vehicles.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { padVehicleShown, PAD_LEAD_MS, REAL_MODELS, realModelFor } = await import(join(JS, 'scene/realmodels.js'));
const { handKeptSites } = await import(join(JS, 'data/sample.js'));
const { MISSIONS } = await import(join(JS, 'data/missions.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const at = (s) => Date.parse(s);

const sites = handKeptSites();
const pads = sites.filter((r) => r.meta.siteKind === 'pad');
check(pads.length === 2, `two hand-kept pads (${pads.length})`);
for (const pad of pads) {
  const entry = REAL_MODELS.bySite[pad.id];
  check(entry && entry.file && realModelFor(pad) === entry, `${pad.id} wears a vehicle's file`);
  const list = pad.meta.liftoffs;
  check(Array.isArray(list) && list.length >= 3, `${pad.id} lists its liftoffs: a vehicle with no list would stand there on every date`);
  // The same instants as the mission's events, so the card's own buttons are the way to see it.
  const mission = MISSIONS.find((m) => m.record === pad.id);
  check(mission && JSON.stringify(mission.events.map((e) => e.date)) === JSON.stringify(list), `${pad.id}: liftoffs are its mission's events, in order`);
  check(/drawn only/.test(pad.meta.doing) && /choose one to go there/.test(pad.meta.doing), `${pad.id}: its sentence says when the vehicle is drawn and how to get there`);
  for (const when of list || []) {
    const timed = when.includes('T');
    // Where the card's button puts the clock: the instant, or noon UTC of a day (ui/missions.js eventMs).
    const clock = timed ? at(when) : at(`${when}T12:00:00Z`);
    check(padVehicleShown(pad, clock), `${pad.id}: shown where the event ${when} puts the clock`);
    if (timed) {
      check(padVehicleShown(pad, at(when) - PAD_LEAD_MS) && !padVehicleShown(pad, at(when) - PAD_LEAD_MS - 1), `${pad.id}: on the pad from 24 hours before ${when}, not earlier`);
      check(padVehicleShown(pad, at(when) + 59e3) && !padVehicleShown(pad, at(when) + 60e3), `${pad.id}: gone when the minute of ${when} is over`);
    } else {
      check(!padVehicleShown(pad, at(`${when}T00:00:00Z`) - 1) && !padVehicleShown(pad, at(`${when}T00:00:00Z`) + 24 * 3600e3), `${pad.id}: only on the UTC day ${when}`);
    }
  }
  check(!padVehicleShown(pad, at('2026-10-08T12:00:00Z')) && !padVehicleShown(pad, at('1975-01-01T00:00:00Z')) && !padVehicleShown(pad, NaN), `${pad.id}: an empty pad today, in 1975 and with no clock`);
}
const saturn = sites.find((r) => r.id === 'saturn-v-lc-39a');
check(saturn && padVehicleShown(saturn, at('1969-07-16T13:32:00Z')) && padVehicleShown(saturn, at('1969-07-16T06:00:00Z')) && !padVehicleShown(saturn, at('1969-07-16T13:33:00Z')) && !padVehicleShown(saturn, at('1969-07-20T20:17:00Z')),
  'Saturn V: on the pad on the morning of 16 July 1969, gone a minute after liftoff and on the landing day');
// Everything else is untouched: a record with no list is always shown.
check(padVehicleShown({ id: 'apollo-11', meta: {} }, at('2026-10-08T12:00:00Z')) && padVehicleShown(null, 0) && padVehicleShown({ meta: { liftoffs: [] } }, 0), 'a record with no liftoffs is not gated');
// And the scene asks: without this line the function is a comment.
const heroes = readFileSync(join(JS, 'scene/heroes.js'), 'utf8');
check(/if \(!padVehicleShown\(c\.record, tMs\)\) \{ obj\.visible = false; continue; \}/.test(heroes), 'scene/heroes.js hides a pad vehicle outside its windows');

if (problems.length) { console.error(`pad vehicles: ${problems.length} problem(s)`); for (const p of problems) console.error('  ' + p); process.exit(1); }
console.log(`pad vehicles ok: ${pads.length} pads, each vehicle drawn only around its listed liftoffs and hidden today`);
