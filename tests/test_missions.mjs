// tests/test_missions.mjs -- a mission as a place in time (public #452; registry/missions.yaml,
// ui/missions.js, the `event` key of ui/urlstate.js).
//
// The registry: every mission names a record the map has and a source, every event a date that
// parses, a title and one sentence, in order. The honesty: which events move the clock, on what
// grounds, and that an event the map cannot place never does. The straight-line path a coasting
// craft is drawn on, against the distances NASA gives for those very days.
//
//   node tests/test_missions.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.history = { replaceState(_a, _b, url) { location.hash = url.includes('#') ? url.slice(url.indexOf('#')) : ''; } };
const M = await import(join(JS, 'ui/missions.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { KEYS, read, write, laterLink } = await import(join(JS, 'ui/urlstate.js'));
const { sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { SITES } = await import(join(JS, 'data/sites.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- the registry ----------------------------------------------------------------------------------
const deep = sampleDeepSpace();
const known = new Set([...deep.map((r) => r.id), ...SITES.map((s) => s.id), 'sat-25544']);
const WORLDS = new Set(['earth', 'moon', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
check(M.MISSIONS.length >= 6, `a handful of flagship missions (${M.MISSIONS.length})`);
const ids = new Set();
let events = 0;
for (const m of M.MISSIONS) {
  check(!ids.has(m.id), `${m.id}: one row a mission`); ids.add(m.id);
  check(known.has(m.record), `${m.id}: its record ${m.record} is one the map has`);
  check(m.source && /^https:\/\/([a-z0-9-]+\.)*nasa\.gov\//.test(m.source.url) && m.source.name.length > 3, `${m.id}: a source with a name and a link to a NASA page`);
  check(/^2026-\d\d-\d\d$/.test(String(m.read)), `${m.id}: the day its events were read on their pages`);
  check(m.events.length >= 3, `${m.id}: at least three events`);
  let last = -Infinity;
  const seen = new Set();
  for (const e of m.events) {
    events += 1;
    const where = `${m.id}.${e.id}`;
    const ms = M.eventMs(e);
    check(Number.isFinite(ms), `${where}: its date parses (${e.date})`);
    check(ms > last, `${where}: events are in order of time`); last = ms;
    check(!seen.has(e.id) && /^[a-z0-9-]+$/.test(e.id), `${where}: a plain id, once`); seen.add(e.id);
    check(e.title && [...e.title].length <= 34, `${where}: a title that fits one line of the card (${[...String(e.title)].length})`);
    check(e.text && [...e.text].length <= 160 && /\.$/.test(e.text), `${where}: one sentence of 160 characters at most (${[...String(e.text)].length})`);
    check(!/!| -- |→/.test(e.title + e.text), `${where}: no exclamation mark, double hyphen or arrow`);
    check(['site', 'cruise', 'none'].includes(e.place), `${where}: place is site, cruise or none`);
    check(!e.world || WORLDS.has(e.world), `${where}: its world is one the map draws for any date`);
    check(e.precision === undefined || e.precision === 'day', `${where}: precision is day or absent`);
    check((e.precision === 'day') === !/T/.test(e.date), `${where}: a date without a time says it is known to the day`);
    check(ms < Date.parse('2026-10-06T00:00:00Z'), `${where}: it has happened (a planned date is the launches list's business)`);
    check(M.findEvent(where) && M.findEvent(where).event === e, `${where}: found by its link id`);
    check(e.source === undefined || (/^https:\/\/([a-z0-9-]+\.)*nasa\.gov\//.test(e.source.url) && e.source.name.length > 3), `${where}: an event read on another page names that NASA page`);
  }
  // A landing site's events on the ground are placeable; nothing else claims to be a site.
  for (const e of m.events) if (e.place === 'site') check(SITES.some((s) => s.id === m.record), `${m.id}.${e.id}: only a landing site is a site`);
}
check(M.findEvent('voyager-1') === null && M.findEvent('nobody.launch') === null && M.findEvent('voyager-1.nothing') === null && M.findEvent('') === null, 'a link that names no event finds none');
check(M.eventMs({ date: '1990-02-14', precision: 'day' }) === Date.parse('1990-02-14T12:00:00Z'), 'an event known to the day sits at noon UTC');
const v1 = M.MISSIONS.find((m) => m.id === 'voyager-1');
check(M.nearestIndex(v1, Date.parse('1985-01-01T00:00:00Z')) === 2 && M.nearestIndex(v1, Date.parse('1970-01-01T00:00:00Z')) === 0 && M.nearestIndex(v1, Date.now()) === v1.events.length - 1, 'the card opens on the last event before the clock');

// --- what moves the clock --------------------------------------------------------------------------
const rec = (id) => deep.find((r) => r.id === id);
const never = () => null;
const jupiter = v1.events.find((e) => e.id === 'jupiter');
check(M.placement(jupiter, rec('deep-voyager-1'), M.eventMs(jupiter)).moves === false, 'Voyager 1 at Jupiter: the map has no path for 1979, so the clock does not move');
check(M.placement(jupiter, rec('deep-voyager-1'), M.eventMs(jupiter), () => ({ x: 1, y: 1, z: 1 })).moves === false, 'not even if something answers for that date: the registry says none');
const apollo = M.MISSIONS.find((m) => m.id === 'apollo-11');
const landing = apollo.events.find((e) => e.id === 'landing');
check(M.placement(landing, { id: 'apollo-11' }, M.eventMs(landing)).kind === 'site' && M.placement(landing, { id: 'apollo-11' }, M.eventMs(landing)).moves, 'the Apollo 11 landing is a place on the Moon: the clock goes to 1969');
check(M.placement(apollo.events[0], { id: 'apollo-11' }, M.eventMs(apollo.events[0])).moves === false, 'its launch is not: the craft in flight has no path');
const interstellar = v1.events.find((e) => e.id === 'interstellar');
{
  const live = { id: 'deep-voyager-1', propagator: 'sampled', samples: [{ tMs: Date.parse('2026-09-27T00:00:00Z'), rKm: [-4.81e9, -2.04e10, 1.48e10], vKmS: [-3.2, -13.4, 9.9] }] };
  check(M.placement(interstellar, live, M.eventMs(interstellar), never).kind === 'cruise', 'with a path that covers only this month, 2012 is drawn on the straight line back');
  check(M.placement(interstellar, live, M.eventMs(interstellar), () => ({ x: 1, y: 2, z: 3 })).kind === 'path', 'and on the map\'s own path when it has one');
  check(M.placement(interstellar, { id: 'x', propagator: 'sgp4' }, M.eventMs(interstellar), never).moves === false, 'a record with no samples to go by is not placed');
}
check(M.placement(null, rec('deep-voyager-1'), 0).moves === false && M.placement(jupiter, null, 0).moves === false, 'no event or no record: nothing moves');

// --- the straight line, against NASA's distances for those days -----------------------------------
const AU = 149597870.7;
const r = (k) => Math.hypot(k.x, k.y, k.z) / AU;
const line = (id, date) => {
  const record = rec(id);
  const at = propagate(record, Date.parse(date)) || M.cruiseKnot(record.samples, Date.parse(date));
  return r(at);
};
const v1Pale = line('deep-voyager-1', '1990-02-14T12:00:00Z');
const v1Most = line('deep-voyager-1', '1998-02-17T12:00:00Z');
const v1Out = line('deep-voyager-1', '2012-08-25T12:00:00Z');
const v2Out = line('deep-voyager-2', '2018-11-05T12:00:00Z');
const nhArr = line('deep-new-horizons', '2019-01-01T05:33:00Z');
check(Math.abs(v1Pale - 40.5) < 1.5, `Voyager 1 on the Pale Blue Dot day: ${v1Pale.toFixed(1)} au drawn, about 40.5 real`);
check(Math.abs(v1Most - 69.4) < 1.5, `Voyager 1 overtaking Pioneer 10: ${v1Most.toFixed(1)} au drawn, 69.4 real`);
check(Math.abs(v1Out - 121.6) < 1.5, `Voyager 1 leaving the heliosphere: ${v1Out.toFixed(1)} au drawn, about 121.6 real`);
check(Math.abs(v2Out - 119) < 1.5, `Voyager 2 leaving it: ${v2Out.toFixed(1)} au drawn, about 119 real`);
check(Math.abs(nhArr - 43.4) < 1.5, `New Horizons at Arrokoth: ${nhArr.toFixed(1)} au drawn, 43.4 real`);
{
  const s = [{ tMs: 1000e3, rKm: [10, 20, 30], vKmS: [1, 0, -1] }];
  const k = M.cruiseKnot(s, 0);
  check(k && k.x === -990 && k.y === 20 && k.z === 1030 && k.vx === 1, 'a knot is the sample moved back along its velocity');
  check(M.cruiseKnot([{ tMs: 0, x: 1, y: 1, z: 1 }], 5) === null && M.cruiseKnot([], 5) === null, 'no velocity, no line');
}

// --- the words -------------------------------------------------------------------------------------
check(M.eventWhen(jupiter) === '5 March 1979, 12:05 UTC' && M.eventWhen(interstellar) === '25 August 2012' && M.eventMs(M.findEvent('new-horizons.pluto').event) === Date.parse('2015-07-14T12:00:00Z'), `a time in UTC, or the day alone (${M.eventWhen(jupiter)} / ${M.eventWhen(interstellar)})`);
check(M.eventNote(v1, jupiter, { kind: 'none', moves: false }, 'Jupiter').includes('the clock stays where it is') && M.eventNote(v1, jupiter, { kind: 'none', moves: false }, 'Jupiter').includes('Voyager 1'), 'an event the map cannot place says the clock has not moved, and why');
check(/straight line/.test(M.eventNote(v1, interstellar, { kind: 'cruise', moves: true })) && /astronomical unit/.test(M.eventNote(v1, interstellar, { kind: 'cruise', moves: true })), 'the straight line says it is one, and how good it is');
check(M.eventNote(apollo, landing, { kind: 'site', moves: true }) === COPY.mission.noteSite, 'a site says the map can show it');

// --- the link --------------------------------------------------------------------------------------
check(KEYS.includes('event') && KEYS.indexOf('event') > KEYS.indexOf('at'), '`event` is a key of the hash, after `at`');
write({ event: 'apollo-11.landing', m: 'wonder' });
check(location.hash === '#m=wonder&event=apollo-11.landing' && read().event === 'apollo-11.landing', `the link reads #event=<mission>.<event> (${location.hash})`);
write({ event: null });
check(read().event === undefined, 'and leaves when it is cleared');
check(laterLink({ event: 'apollo-11.landing', m: 'wonder' }, true).event === undefined, 'a link\'s event is not applied over a trip the visitor started');

// --- the wiring, as text ---------------------------------------------------------------------------
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(!/^import .*missions\.js/m.test(main) && /import\('\.\/ui\/missions\.js'\)/.test(main), 'the mission events are a dynamic import');
check(/st\.event && typeof ctx\.wantMissions/.test(main) && /COPY\.mission\.unknown/.test(main), 'a link\'s event is opened once the layers land, and an unknown one says so');
const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
check(!/^import .*missions/m.test(cards) && /ctx\.wantMissions\(\)/.test(cards), 'the card asks for them and does not import them');
const yaml = readFileSync(join(ROOT, 'registry/missions.yaml'), 'utf8');
check(/internal #277/.test(yaml) && /reviewed_on: 2026-/.test(yaml) && /NOTHING HERE IS FROM MEMORY/.test(yaml), 'the registry says what is missing (our own ephemerides), when its dates were read, and that none is from memory');
check(/event\.source \|\| mission\.source/.test(readFileSync(join(JS, 'ui/missions.js'), 'utf8')), 'the card links to the page the shown event was read on');

if (problems.length) { console.error('missions FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`missions ok: ${M.MISSIONS.length} missions, ${events} dated events each with a source; a site moves the clock, a flyby with no path does not; the straight line puts Voyager 1 at ${v1Out.toFixed(1)} au in August 2012 (121.6) and New Horizons at ${nhArr.toFixed(1)} at Arrokoth (43.4)`);
