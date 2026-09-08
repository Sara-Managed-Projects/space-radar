// tests/test_ladder_ui.mjs -- spec 0028 step 8: the breadcrumb and the trip to the edge name real things.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { LADDER_RUNGS, WE_SHOW } = await import(join(JS, 'data/ladder.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { worldRecords } = await import(join(JS, 'scene/worlds.js'));
const { recordsFromNames } = await import(join(JS, 'scene/stars3d.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { STAGES } = await import(join(JS, 'scene/stage.js'));

// every record the app can produce without a network, by id
const ids = new Map();
for (const r of worldRecords()) ids.set(r.id, r);
for (const r of recordsFromNames(JSON.parse(readFileSync(join(ROOT, 'site/data/stars3d.names.json'), 'utf8')).rows)) ids.set(r.id, r);
for (const r of parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')))) ids.set(r.id, r);
for (const l of LAYERS) if (typeof l.sample === 'function' && (l.id === 'exotics' || l.id === 'galaxy')) for (const r of l.sample()) ids.set(r.id, r);

check(LADDER_RUNGS.length === 8, `eight rungs (${LADDER_RUNGS.length})`);
let prev = 0;
for (const rung of LADDER_RUNGS) {
  const key = rung.target.world || rung.target.record;
  const rec = ids.get(key);
  check(!!rec, `rung ${rung.id} names a record the app has (${key})`);
  if (rec && rung.target.record) check(rec.layer === rung.layer, `rung ${rung.id} names its record's layer (${rec.layer} vs ${rung.layer})`);
  // distances climb: km for the first three, light-years after
  const distKm = rec && rec.pos ? Math.hypot(rec.pos.x, rec.pos.y, rec.pos.z) : null;
  if (distKm !== null) { check(distKm > prev, `${rung.id} is farther than the rung before it`); prev = distKm; }
}
check(WE_SHOW.length === 4 && WE_SHOW.every((w) => Number.isInteger(w.n) && w.source), 'the honesty line has four sourced numbers');
check(WE_SHOW.find((w) => w.what === 'stars drawn').n === 109389, 'the star count in the honesty line matches the binary');

const trip = TOURS.find((t) => t.id === 'to-the-edge');
check(!!trip && trip.stage === 'stellar' && STAGES[trip.stage] && STAGES[trip.stage].ladder, 'the edge trip lives on the stellar rung');
check(trip.stops.length === 8, `eight stops (${trip.stops.length})`);
for (const stop of trip.stops) {
  const key = stop.target.world || stop.target.record;
  check(ids.has(key), `stop ${stop.id} targets a record the app has (${key})`);
  check(Number.isFinite(stop.distance_km) && stop.distance_km > 1e12, `stop ${stop.id} frames from at least a light-year (${stop.distance_km})`);
}
check(trip.stops[trip.stops.length - 1].card.body.includes('109 389') && trip.stops[trip.stops.length - 1].card.body.includes('13 372'), 'the last card carries the honesty numbers');
check(trip.blurb.includes('back to Earth'), 'the blurb says leaving returns to Earth');

if (problems.length) { console.error('ladder ui FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('ladder ui ok: eight rungs, each farther than the last and each a real record; the edge trip has eight resolvable stops on the stellar rung');
