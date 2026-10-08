// tests/test_comeback.mjs -- a reason to come back (public #395): "Remind me" on a card and the
// visitor's own "Seen it" tick in the passport (ui/cardextras.js, ui/passport.js, data/ics.js).
//
//   node tests/test_comeback.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const P = await mod('ui/passport.js');
const X = await mod('ui/cardextras.js');
const I = await mod('data/ics.js');
const { COPY } = await mod('copy/en.js');

// --- the tick: the visitor's word and its day, in the one passport record ------------------------
const T0 = Date.parse('2026-10-08T21:14:00Z');
let p = P.emptyPassport();
check(p.seen && Object.keys(p.seen).length === 0, 'a new passport has seen nothing');
p = P.recordSeen(p, 'sat-25544', T0);
p = P.recordSeen(p, 'sat-25544', T0 + 86400e3);
check(p.seen['sat-25544'] === T0, 'the first tick\'s day is the one kept');
p = P.recordSeen(p, 'moon', T0 + 3600e3);
check(P.seenList(p).map(([id]) => id).join() === 'moon,sat-25544', 'listed newest first');
check(Object.keys(p.visited).length === 0, 'a tick is not a place opened, and opening a place is not a tick');
p = P.recordSeen(p, 'moon', T0 + 7200e3, false);
check(!p.seen.moon && p.seen['sat-25544'] === T0, 'a tick can be taken back');
check(P.recordSeen(P.emptyPassport(), '', T0).seen[''] === undefined && Object.keys(P.recordSeen(P.emptyPassport(), 'x', NaN).seen).length === 0, 'a bad id or a bad time is no tick');
let many = P.emptyPassport();
for (let i = 0; i < P.SEEN_CAP + 25; i++) many = P.recordSeen(many, `sat-${i}`, T0 + i * 1000);
check(Object.keys(many.seen).length === P.SEEN_CAP && !many.seen['sat-0'] && many.seen[`sat-${P.SEEN_CAP + 24}`], `capped at ${P.SEEN_CAP}, the oldest dropped`);
// It survives the storage round trip, and what is not the right shape is dropped.
const kept = new Map();
const storage = { getItem: (k) => (kept.has(k) ? kept.get(k) : null), setItem: (k, v) => { kept.set(k, String(v)); }, removeItem: (k) => kept.delete(k) };
P.writePassport(storage, p);
check(P.readPassport(storage).seen['sat-25544'] === T0 && [...kept.keys()].join() === P.KEY, 'kept in the passport\'s one record, and nowhere else');
check(Object.keys(P.sanitize({ v: 1, seen: { ok: T0, bad: 'yesterday', '': T0, neg: -5 } }).seen).join() === 'ok', 'a tick with no real time is dropped on reading');
check(Object.keys(P.sanitize({ v: 1 }).seen).length === 0, 'a passport from before the ticks reads as none');
P.forgetPassport(storage);
check(Object.keys(P.readPassport(storage).seen).length === 0, 'Forget me clears the ticks with the rest');
const throws = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
check(P.writePassport(throws, p) === false && Object.keys(P.readPassport(throws).seen).length === 0, 'a browser that keeps nothing keeps no tick, and says so');
// The API a card uses (createPassport builds DOM; its two methods are read here).
const src0 = read('site/js/ui/passport.js');
check(/seenAt: \(id\) => \(p\.seen && p\.seen\[id\]\) \|\| 0,/.test(src0) && /p = recordSeen\(p, id, now\(\), on !== false\);\s*changed\(\);\s*return available;/.test(src0), 'markSeen writes through recordSeen and answers whether it was kept; seenAt reads it');
const src = read('site/js/ui/passport.js');
check(!/fetch\(|XMLHttpRequest|sendBeacon|new URL\(/.test(src), 'the passport still builds no URL and makes no request');
check(/Your passport: places opened, trips finished, things ticked as seen\./.test(read('site/js/copy/en.later.js')), 'the Sources sheet says the ticks are kept');

// --- which cards offer it ---------------------------------------------------------------------------
check(X.offersSeen({ id: 'sat-25544', klass: 'station' }) && X.offersSeen({ id: 'moon', klass: 'world' }) && X.offersSeen({ id: 'star-sirius', klass: 'star' }), 'a station, the Moon and a star can be ticked');
check(!X.offersSeen({ id: 'earth', klass: 'world' }) && !X.offersSeen({ id: 'site-ksc', klass: 'site' }) && !X.offersSeen({ id: 'exo-b', klass: 'exoplanet' }) && !X.offersSeen(null), 'the Earth, a pad and a planet nobody has seen cannot');

// --- Remind me: the thing's next dated event, as one calendar file with its reminder ---------------
const iss = { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station' };
const items = [
  { kind: 'pass', record: iss, tMs: T0 + 5 * 3600e3 },
  { kind: 'pass', record: iss, tMs: T0 + 2 * 3600e3 },
  { kind: 'pass', record: iss, tMs: T0 - 600e3 },
  { kind: 'launch', record: { id: 'launch-1', name: 'Falcon 9' }, tMs: T0 + 3600e3 },
  { kind: 'shower', label: 'Orionids', tMs: T0 + 86400e3 },
];
const next = X.nextEventFor(iss, items, T0);
check(next && next.tMs === T0 + 2 * 3600e3, 'the next event that is this thing\'s, not one that has begun and not another\'s');
check(X.nextEventFor({ id: 'moon' }, items, T0) === null && X.nextEventFor(iss, [], T0) === null && X.nextEventFor(null, items, T0) === null, 'nothing dated, no button');
const ics = I.toIcs(next, { title: 'ISS passes over you', description: 'ISS passes over you', url: 'https://www.spaceradar.ai/#at=sat-25544', nowMs: T0 });
check(typeof ics === 'string' && /BEGIN:VEVENT/.test(ics) && /BEGIN:VALARM/.test(ics) && /TRIGGER:-PT15M/.test(ics), 'the file is one event with a reminder 15 minutes before a pass');
check(/DTSTART:20261008T231400Z/.test(ics), 'at the pass\'s own minute, in UTC');
const extras = read('site/js/ui/cardextras.js');
check(/m\.saveCalendar\(item, nowMs\)/.test(extras) && /export async function saveCalendar/.test(read('site/js/ui/next.js')), 'the card\'s button hands the row to the Coming up list\'s own calendar writer');
check(!/fetch\(/.test(read('site/js/data/ics.js')), 'which builds the file in the browser and sends nothing');
check(/for \(const n of skyControls\(record, ctx\)\) body\.appendChild\(n\);/.test(read('site/js/ui/cards.js')), 'the card draws both');
const C = COPY.passport;
for (const k of ['seenIt', 'remind']) check(C[k].split(' ').length <= 2, `"${C[k]}" is a button of at most two words`);
for (const k of ['seenTitle', 'noSeen', 'seenTitleOff', 'seenTitleOn', 'seenNotKept']) check([...C[k]].length <= 60 && !/!/.test(C[k]), `passport.${k} is a calm line of at most 60 characters (${[...C[k]].length})`);

if (problems.length) { console.error(`come back: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log(`come back ok: a "${C.seenIt}" tick kept with its day (first tick wins, ${P.SEEN_CAP} at most, cleared by Forget me, none without storage); "${C.remind}" is the thing's next event as an .ics with its alarm`);
