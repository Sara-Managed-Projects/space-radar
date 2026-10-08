// tests/test_passport.mjs -- the passport: where a visitor has been, kept in this browser only
// (spec 0041; public #240, internal #119; ui/passport.js, and the wonder line in ui/today.js).
//
// The store is the rule: it is capped, it survives a record that will not parse and a storage
// that throws, a trip left in the last 24 hours is offered again from its stop and one left
// longer ago is not, "Forget me" leaves nothing, and no storage reads as a first visit. Then the
// wonder of the day: an event inside 30 days before a famous thing, the same one all day, never
// the same two days running. And that none of it is in the boot graph or builds a request.
//
//   node tests/test_passport.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const P = await import(join(JS, 'ui/passport.js'));
const T = await import(join(JS, 'ui/today.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const now = Date.parse('2026-10-07T09:00:00Z');
const H = 3600e3;
const D = 86400e3;
const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, map: m };
};
const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('denied'); } };

// --- the store: empty, kept, read back --------------------------------------------------------------
check(P.KEY === 'sr:passport', 'one key, sr:passport');
{
  const s = memory();
  check(JSON.stringify(P.readPassport(s)) === JSON.stringify(P.emptyPassport()), 'nothing kept reads as the empty passport');
  let p = P.recordVisit(P.emptyPassport(), 'moon', now);
  p = P.recordVisit(p, 'moon', now + H);
  check(p.visited.moon === now && P.placesSeen(p) === 1 && p.first === now && p.last === now + H, 'a place is kept once, with the first time it was opened');
  check(P.writePassport(s, p) === true && P.readPassport(s).visited.moon === now, 'and comes back from the storage as it went in');
  check([...s.map.keys()].join() === 'sr:passport', 'nothing else is written');
  check(P.forgetPassport(s) === true && s.map.size === 0 && P.placesSeen(P.readPassport(s)) === 0, 'Forget me leaves nothing behind');
}

// --- capped -----------------------------------------------------------------------------------------
{
  let p = P.emptyPassport();
  for (let i = 0; i < P.VISITED_CAP + 50; i += 1) p = P.recordVisit(p, `sat-${i}`, now + i);
  check(P.placesSeen(p) === P.VISITED_CAP && !p.visited['sat-0'] && !p.visited['sat-49'] && p.visited['sat-50'] && p.visited[`sat-${P.VISITED_CAP + 49}`], `the places are capped at ${P.VISITED_CAP}, the oldest dropped`);
  for (let i = 0; i < P.TRIPS_CAP + 5; i += 1) p = P.recordStop(p, `trip-${i}`, 1, 5, now + i);
  check(Object.keys(p.trips).length === P.TRIPS_CAP && !p.trips['trip-0'], `and the trips at ${P.TRIPS_CAP}`);
  const bytes = JSON.stringify(p).length;
  check(bytes < 16000, `a full passport is ${bytes} bytes: small`);
  check(P.recordVisit(P.emptyPassport(), 'x'.repeat(200), now).visited['x'.repeat(200)] === undefined && P.placesSeen(P.recordVisit(P.emptyPassport(), '', now)) === 0, 'an id that is not an id is not kept');
}

// --- corrupt data -----------------------------------------------------------------------------------
{
  for (const bad of ['{not json', '[]', '"a string"', 'null', '{"v":2,"visited":{"moon":1}}', '{"v":1,"visited":"all of them","trips":7}']) {
    const s = memory();
    s.setItem(P.KEY, bad);
    const p = P.readPassport(s);
    check(P.placesSeen(p) === 0 && P.tripsDone(p) === 0 && p.v === 1, `a record that is not a passport reads as empty (${bad})`);
  }
  const mixed = P.sanitize({ v: 1, visited: { moon: now, mars: 'yesterday', '': now, venus: -4 }, trips: { a: { done: 2, doneAt: now }, b: { done: 'many', stop: 3, count: 10, at: now }, c: 'x', d: { done: 0, stop: -1, count: 4, at: now } }, wonder: { day: 'today', id: 'moon' }, first: 'long ago', extra: { url: 'https://example.com' } });
  check(Object.keys(mixed.visited).join() === 'moon' && mixed.trips.a.done === 2 && mixed.trips.b.done === 0 && mixed.trips.b.stop === 3 && !mixed.trips.c && mixed.trips.d.stop === undefined && mixed.wonder === null && mixed.first === 0 && mixed.extra === undefined, 'what is the right shape is kept, the rest dropped, field by field');
}

// --- a storage that throws, and none ---------------------------------------------------------------
{
  check(JSON.stringify(P.readPassport(throwing)) === JSON.stringify(P.emptyPassport()), 'a storage that throws reads as the empty passport');
  check(P.writePassport(throwing, P.recordVisit(P.emptyPassport(), 'moon', now)) === false, 'a write that throws is swallowed, and says it was not kept');
  check(P.forgetPassport(throwing) === false, 'so is a forget');
  // Forget me also clears the sound choices (internal #437), and nothing else.
  {
    const kept = new Map([[P.KEY, '{}'], ['sr.audio', 'on'], ['sr.audio.volume', '0.4'], ['sr.voice', 'off'], ['sr:side', 'open']]);
    const st = { getItem: (k) => (kept.has(k) ? kept.get(k) : null), setItem: (k, v) => kept.set(k, v), removeItem: (k) => kept.delete(k) };
    check(P.forgetPassport(st) === true && [...kept.keys()].join() === 'sr:side', `Forget me clears the passport and the three sound keys and leaves the layout (${[...kept.keys()]})`);
    const engine = readFileSync(join(JS, 'audio/engine.js'), 'utf8');
    const narration = readFileSync(join(JS, 'audio/narration.js'), 'utf8');
    check(engine.includes("STORE_KEY = 'sr.audio'") && engine.includes("VOLUME_KEY = 'sr.audio.volume'") && narration.includes("VOICE_KEY = 'sr.voice'") && P.SOUND_KEYS.join() === 'sr.audio,sr.audio.volume,sr.voice', 'the sound keys Forget me clears are the audio engine\'s own');
    // The Sources sheet says what is kept, and its claims are the code's.
    const status = readFileSync(join(JS, 'ui/status.js'), 'utf8');
    const all = readdirSync(join(JS, 'ui')).concat(readdirSync(join(JS, 'scene')).map((f) => '../scene/' + f)).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(JS, 'ui', f), 'utf8')).join('\n');
    check(/COPY\.kept\.title/.test(status) && /COPY\.kept\.lines/.test(status) && /COPY\.kept\.none/.test(status), 'the Sources sheet has the section "What this site keeps on your device"');
    check(!/document\.cookie|sendBeacon|gtag\(/.test(all), 'no cookies and no analytics, as that section says');
  }
  check(JSON.stringify(P.readPassport(null)) === JSON.stringify(P.emptyPassport()) && P.writePassport(null, P.emptyPassport()) === false, 'no storage at all is a first visit');
  check(P.safeStorage({ get localStorage() { throw new Error('SecurityError'); } }) === null, 'a window whose storage throws when asked for has none');
}

// --- the resume rule --------------------------------------------------------------------------------
{
  let p = P.emptyPassport();
  check(P.continuable(p, 'moon-landings', now) === null, 'a trip never started has nowhere to continue from');
  p = P.recordStop(p, 'moon-landings', 0, 10, now);
  check(P.continuable(p, 'moon-landings', now + H) === null, 'left at the first stop: Start goes there anyway');
  p = P.recordStop(p, 'moon-landings', 3, 10, now);
  check(P.continuable(p, 'moon-landings', now + H) === 3, 'left at stop 4 an hour ago: continue from stop 4');
  check(P.continuable(p, 'moon-landings', now + P.RESUME_MS) === 3 && P.continuable(p, 'moon-landings', now + P.RESUME_MS + 1) === null && P.RESUME_MS === 24 * H, 'to the 24th hour, and not a millisecond past it');
  check(P.continuable(p, 'moon-landings', now - H) === null, 'a stop from the future (a clock that moved) is not offered');
  check(P.continuable(p, 'black-holes', now + H) === null, 'another trip is not this one');
  check(P.tripsDone(p) === 0, 'a trip under way is not a trip finished');
  p = P.recordComplete(p, 'moon-landings', now + 2 * H);
  check(P.continuable(p, 'moon-landings', now + 3 * H) === null && P.tripsDone(p) === 1 && p.trips['moon-landings'].doneAt === now + 2 * H, 'finishing it clears the stop and counts the trip, with its date');
  p = P.recordComplete(p, 'moon-landings', now + 2 * H + 5);
  check(p.trips['moon-landings'].done === 1, 'an end card drawn twice is one finish');
  p = P.recordStop(p, 'moon-landings', 2, 10, now + 4 * H);
  check(P.continuable(p, 'moon-landings', now + 5 * H) === 2 && P.tripsDone(p) === 1, 'a replay left half-way is offered again, and the trip stays finished');
  p = P.recordComplete(p, 'moon-landings', now + 6 * H);
  check(p.trips['moon-landings'].done === 2 && P.tripsDone(p) === 1, 'a second run is a second finish of the same one trip');
  check(P.recordStop(P.emptyPassport(), 't', 12, 10, now).trips.t.stop === 9, 'a stop past the end is the last stop');
}

// --- the stamp --------------------------------------------------------------------------------------
{
  let p = P.emptyPassport();
  check(P.stampLine(p, 26, now) === '', 'no trip finished, no stamp');
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) p = P.recordComplete(p, id, now);
  check(/^Trip 7 of 25 · [6-8] October 2026$/.test(P.stampLine(p, 25, now)), `the stamp, dated the visitor's own day: ${P.stampLine(p, 25, now)}`);
  check(P.stampLine(p, 3, now) === '' && P.stampLine(p, NaN, now) === '', 'a total that cannot be right prints nothing');
  // The places under it (public #240): the same count the home's row and the view show.
  check(P.stampPlacesLine(P.emptyPassport()) === '', 'no place opened, no places line');
  {
    let q = P.emptyPassport();
    q = P.recordVisit(q, 'sat-25544', now);
    check(P.stampPlacesLine(q) === '1 place opened so far', `one place: ${P.stampPlacesLine(q)}`);
    for (let i = 0; i < 40; i++) q = P.recordVisit(q, `x-${i}`, now + i);
    check(P.stampPlacesLine(q) === '41 places opened so far' && P.placesSeen(q) === 41, `the count is placesSeen: ${P.stampPlacesLine(q)}`);
  }
}

// --- the places the view links ---------------------------------------------------------------------
{
  const records = { moon: { id: 'moon', name: 'The Moon', klass: 'world' }, 'sat-25544': { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station' }, 'sat-9': { id: 'sat-9', name: 'STARLINK-1', klass: 'satellite' }, 'sat-8': { id: 'sat-8', name: 'STARLINK-2', klass: 'satellite' } };
  let p = P.emptyPassport();
  p = P.recordVisit(p, 'sat-9', now);
  p = P.recordVisit(p, 'sat-8', now + 1);
  p = P.recordVisit(p, 'sat-25544', now + 2);
  p = P.recordVisit(p, 'moon', now + 3);
  p = P.recordVisit(p, 'gone-from-the-map', now + 4);
  const got = P.notableVisited(p, (id) => records[id] || null, 3).map((r) => r.id);
  check(got.join() === 'moon,sat-25544,sat-8', `a world, then a station, then the newest of the rest; what the map no longer holds is not linked (${got})`);
  check(P.placesSeen(p) === 5, 'but it is still counted');
}

// --- the wonder of the day ---------------------------------------------------------------------------
{
  const day = P.dayNumberOf(now);
  const famous = ['exotic-a', 'exotic-b', 'exotic-c', 'mars', 'moon'].map((id) => ({ id }));
  const events = [{ id: 'shower:1' }, { id: 'approach:neo-1' }];
  check(P.wonderOfTheDay({ events, famous, dayNumber: day }).id === 'shower:1', 'an event inside 30 days comes before a famous thing');
  const none = P.wonderOfTheDay({ events: [], famous, dayNumber: day });
  check(none.kind === 'object' && none.id === famous[day % famous.length].id, 'with none, the famous thing whose turn the day is');
  const seq = [];
  for (let d = day; d < day + 40; d += 1) seq.push(P.wonderOfTheDay({ events: [], famous, dayNumber: d }).id);
  check(seq.every((id, i) => i === 0 || id !== seq[i - 1]) && new Set(seq).size === famous.length, 'the list turns: a new one each day, every one in its turn');
  // A visitor who comes every day, with the same eclipse three weeks off the whole time.
  let prev = null;
  const seen = [];
  for (let d = day; d < day + 12; d += 1) {
    const w = P.wonderOfTheDay({ events: [events[0]], famous, dayNumber: d, prev });
    check(P.wonderOfTheDay({ events: [events[0]], famous, dayNumber: d, prev: { day: d, id: w.id } }).id === w.id, 'the same one all day: a reload does not reshuffle');
    seen.push(w.id);
    prev = { day: d, id: w.id };
  }
  check(seen.every((id, i) => i === 0 || id !== seen[i - 1]), `never the same two days running (${seen.slice(0, 5).join(' > ')})`);
  check(seen.filter((id) => id === 'shower:1').length === 6, 'the event is the wonder every other day until it has happened');
  check(P.wonderOfTheDay({ events: [], famous: [{ id: 'only' }], dayNumber: day, prev: { day: day - 1, id: 'only' } }).id === 'only', 'one thing in the list is that thing');
  check(P.wonderOfTheDay({ events: [], famous: [], dayNumber: day }) === null && P.wonderOfTheDay({ events, famous }) === null, 'nothing to choose from, or no day, is no line');
  check(P.wonderOfTheDay({ events, famous, dayNumber: day, prev: { day, id: 'no-longer-there' } }).id === 'shower:1', 'today\'s, if it has gone, is chosen again');

  const neo = { id: 'neo-1', name: '2015 TS238', klass: 'asteroid', layer: 'asteroids', meta: {} };
  const items = [
    { kind: 'pass', record: { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station' }, tMs: now + 2 * H },
    { kind: 'launch', record: { id: 'l1', name: 'Nuri', layer: 'launches', meta: {} }, tMs: now + 5 * H },
    { kind: 'approach', record: neo, tMs: now + 2 * D, ld: 3.2 },
    { kind: 'shower', record: null, label: 'Orionids', tMs: now + 14 * D, zhr: 20 },
    { kind: 'solar-eclipse', record: null, label: 'Total solar eclipse', eclipseKind: 'total', tMs: now + 300 * D },
  ];
  const we = T.wonderEvents(items, now);
  check(we.map((c) => c.id.split(':')[0]).join() === 'shower,approach', `the events a wonder may be: a shower before a close approach; a pass and a launch are daily bread; an eclipse 300 days off is not this month's (${we.map((c) => c.id)})`);
  const fam = T.famousThings([{ id: 'mars', name: 'Mars', klass: 'world' }, { id: 'exotic-m87-star', name: 'M87*', klass: 'exotic' }, { id: 'sat-1', name: 'A satellite', klass: 'satellite' }, { id: 'earth', name: 'Earth', klass: 'world' }]);
  check(fam.map((c) => c.id).join() === 'earth,exotic-m87-star,mars' && fam.every((c) => c.act === 'select' && c.record), 'the famous things: the extremes and the worlds, in a fixed order, each a place to go');
  const cards = T.todayCards({ items, nowMs: now, skipId: we[0].id });
  check(!cards.some((c) => c.id === we[0].id), 'the wonder is not said again on the shelf under it');
}

// --- just happened (internal #134) --------------------------------------------------------------------
{
  const L = (id, ago, status) => ({ id, name: `Rocket ${id}`, layer: 'launches', meta: { netMs: now - ago, statusAbbrev: status } });
  const got = T.justHappened([L('a', 30 * H, 'Success'), L('b', 5 * H, 'In Flight'), L('c', 2 * H, 'Go'), L('d', 60 * H, 'Success'), L('e', -3 * H, 'Go')], now);
  check(got && got.record.id === 'b' && got.line === 'Lifted off 5 hours ago', `the newest launch the list says has flown, with its age (${got && got.line})`);
  check(T.justHappened([L('c', 2 * H, 'Go'), L('d', 60 * H, 'Success'), L('e', -3 * H, 'Go')], now) === null, 'a passed time still marked "Go" is a stale list, not a launch: nothing is claimed; nor past 48 hours');
  check(T.justHappened([L('f', 3 * H, 'Failure')], now).line === 'Launch failed 3 hours ago', 'a failure is said as one');
  check(T.justHappened([], now) === null && T.justHappened(null, now) === null, 'no launches loaded is no row');
}

// --- private, lazy, and where it is drawn ------------------------------------------------------------
{
  const src = readFileSync(join(JS, 'ui/passport.js'), 'utf8').replace(/\/\/.*$/gm, '');
  check(!/fetch\(|XMLHttpRequest|sendBeacon|new URL\(|location\.|WebSocket|new Image/.test(src), 'ui/passport.js builds no request and no URL: nothing leaves the device');
  const users = ['ui/today.js', 'ui/sentence.js', 'ui/explore.js', 'ui/tripframe.js', 'ui/shell.js', 'main.js', 'ui/urlstate.js', 'ui/share.js'].filter((f) => /sr:passport['"`]\]|getItem\(\s*['"`]sr:passport/.test(readFileSync(join(JS, f), 'utf8')));
  check(users.length === 0, `nothing but ui/passport.js reads the record (${users})`);
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(!/^import .*passport\.js/m.test(main) && /ctx\.wantPassport = \(\) => passport \|\| \(passport = import\('\.\/ui\/passport\.js'\)/.test(main), 'main.js fetches the passport on demand, once');
  const frame = readFileSync(join(JS, 'ui/tripframe.js'), 'utf8');
  check(/sr-tripsheet__stamp/.test(frame) && /pass\.stamp\(st\.tourId, total\)/.test(frame) && /stamp\.hidden = true/.test(frame), 'the end card carries the stamp, hidden until there is one');
  check(/sr-tripsheet__seen/.test(frame) && /pass\.stampPlaces\(\)/.test(frame) && /places\.hidden = true/.test(frame), 'and under it the places opened so far, hidden until there are some (public #240)');
  const explore = readFileSync(join(JS, 'ui/explore.js'), 'utf8');
  check(/ctx\.passport \? ctx\.passport\.resume\(row\.id\) : null/.test(explore) && /trip\.jumpTo\(resume\.index\)/.test(explore) && /'sr:passport'/.test(explore), 'a trip card offers the stop it was left at, and starts there');
  const { COPY } = await import(join(JS, 'copy/en.js'));
  check(/only/.test(COPY.passport.kept) && /browser/.test(COPY.passport.kept) && [...COPY.passport.kept].length <= 60, 'the view says once, in one line, that this lives only in this browser');
  check(src.split('P.kept').length === 2, 'and says it in one place');
  check(/P\.forgetConfirm/.test(src) && /CONFIRM_MS/.test(src), 'Forget me asks once before it forgets');
}

if (problems.length) { console.error('passport FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`passport ok: capped at ${P.VISITED_CAP} places and ${P.TRIPS_CAP} trips, empty on corrupt data and on a storage that throws, a trip left within 24 h continues from its stop, the stamp "${P.stampLine(P.recordComplete(P.emptyPassport(), 'a', now), 26, now)}", the wonder never the same two days running, just-happened only for a launch the list says has flown`);
