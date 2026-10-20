// tests/test_passport_kinds.mjs -- the passport's second page: places by kind, and the notes (internal i#911,
// SR-PLAN-144, release 1.3.0).
//
//   node tests/test_passport_kinds.mjs
//
// WHAT IS HELD. The kinds: every class the map draws belongs to one kind or to none, on purpose; a place's kind
// is the one kept at the time, else its record's, else its id's. The notes: each is a statement that is true
// or not, with its words; they are stamped once and never taken back; none needs anything but this browser's
// own passport. And what the page must never become: a score. No level, streak, percentage, "to go", rank,
// badge, unlock or sharing appears in its words or its code, and the page sends nothing anywhere.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const eq = (got, want, what) => check(Object.is(got, want), `${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const { install, walk } = await import('./helpers/fakedom.mjs');
install();
const K = await import(join(JS, 'ui/passportkinds.js'));
const P = await import(join(JS, 'ui/passport.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
const { FAMILIES, familyOfKlass, familyOfId, kindCounts, statsOf, ACHIEVEMENTS, noteAchievements, notedList, kindsSections } = K;
const W = COPY.passportKinds;

// --- the kinds ------------------------------------------------------------------------------------------
eq(FAMILIES.length, 9, 'nine kinds');
check(FAMILIES.every((f) => W.kinds[f] && W.kinds[f].length <= 40), 'every kind has words of 40 characters or fewer');
check(Object.keys(W.kinds).length === FAMILIES.length, 'and the words name no kind that is not listed');
// every class the map draws (registry/visual-classes.yaml and the record builders): a kind, or none on purpose
const visual = readFileSync(join(ROOT, 'registry/visual-classes.yaml'), 'utf8');
const ALL = new Set(['world', 'station', 'satellite', 'debris', 'rocket', 'probe', 'telescope', 'asteroid', 'comet', 'star', 'exoplanet', 'dso', 'exotic', 'site', 'storm', 'earthevent', 'aurora', 'lightning', 'oddity', 'unknown']);
const NONE_ON_PURPOSE = new Set(['oddity', 'unknown']);
for (const k of ALL) check(familyOfKlass(k) !== null || NONE_ON_PURPOSE.has(k), `class "${k}" belongs to a kind or is named as none on purpose`);
for (const k of NONE_ON_PURPOSE) eq(familyOfKlass(k), null, `"${k}" is in no kind`);
eq(familyOfKlass('toString'), null, 'a name from Object.prototype is no kind');
eq(familyOfKlass('world'), 'worlds', 'a world');
eq(familyOfKlass('debris'), 'satellites', 'debris is counted with satellites');
eq(familyOfKlass('exotic'), 'deep', 'an exotic object is deep sky');
check(visual.length > 0, 'the visual classes file was read');
eq(familyOfId('jupiter'), 'worlds', 'a planet from its id alone');
eq(familyOfId('dso-m31'), 'deep', 'a deep-sky id');
eq(familyOfId('sat-25544'), 'satellites', 'a satellite id');
eq(familyOfId('hip-32349'), null, 'an id that does not say is no kind');

// --- counting -------------------------------------------------------------------------------------------
const rec = (id, klass) => ({ id, klass });
const book = { jupiter: rec('jupiter', 'world'), 'sat-25544': rec('sat-25544', 'station'), 'dso-m31': rec('dso-m31', 'dso') };
const byId = (id) => book[id] || null;
const base = () => ({ ...P.emptyPassport(), visited: { jupiter: 1, 'sat-25544': 2, 'dso-m31': 3, 'dso-m1': 4, 'hip-1': 5, 'comet-x': 6 }, kinds: { 'comet-x': 'small' } });
{
  const c = kindCounts(base(), byId);
  eq(JSON.stringify(c), JSON.stringify({ worlds: 1, stations: 1, deep: 2, small: 1 }), 'by the kept kind, else the record, else the id; an unknown place is in none');
  eq(statsOf(base(), byId).total, 6, 'the total counts every place');
  eq(JSON.stringify(kindCounts(P.emptyPassport(), byId)), '{}', 'nothing opened, nothing counted');
  eq(JSON.stringify(kindCounts(null, byId)), '{}', 'no passport, nothing counted');
  const odd = { ...P.emptyPassport(), visited: { a: 1 }, kinds: { a: 'toString' } };
  eq(JSON.stringify(kindCounts(odd, byId)), '{}', 'a kept kind that is not a kind is not counted');
}

// --- the notes ------------------------------------------------------------------------------------------
check(ACHIEVEMENTS.length === Object.keys(W.noted).length && ACHIEVEMENTS.every((a) => W.noted[a.id]), 'every note has words and every word is a note');
for (const a of ACHIEVEMENTS) {
  const w = W.noted[a.id];
  check(w.name.length <= 32 && w.said.length <= 60, `${a.id}: a name of 32 characters and a line of 60 (${w.name.length}, ${w.said.length})`);
  check(!/[!]|\s--\s|→/.test(w.name + w.said), `${a.id}: plain words`);
}
{
  const NOW = Date.UTC(2026, 9, 20, 12);
  const none = noteAchievements(P.emptyPassport(), byId, NOW);
  eq(Object.keys(none.ach).length, 0, 'an empty passport holds no note');
  const one = noteAchievements({ ...P.emptyPassport(), visited: { jupiter: 1 } }, byId, NOW);
  eq(Object.keys(one.ach).join(), 'first', 'one place opened holds the first note only');
  eq(one.ach.first, NOW, 'stamped with the day it was seen to hold');
  const later = noteAchievements(one, byId, NOW + 86400e3);
  eq(later.ach.first, NOW, 'a stamp is never moved');
  // never taken back: the place falls out of the passport, the note stays
  const fallen = noteAchievements({ ...one, visited: {} }, byId, NOW + 2 * 86400e3);
  eq(fallen.ach.first, NOW, 'a note is not taken back when its place is no longer kept');
  // all eight planets
  const eight = Object.fromEntries(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].map((id, i) => [id, i + 1]));
  eq(!!noteAchievements({ ...P.emptyPassport(), visited: eight }, byId, NOW).ach.planets, true, 'all eight planets');
  const seven = { ...eight }; delete seven.venus;
  eq(!!noteAchievements({ ...P.emptyPassport(), visited: seven }, byId, NOW).ach.planets, false, 'seven is not eight');
  // a trip, a tick
  const tripped = noteAchievements({ ...P.emptyPassport(), trips: { t: { done: 1, doneAt: NOW } } }, byId, NOW);
  eq(!!tripped.ach.trip, true, 'a finished trip');
  eq(!!noteAchievements({ ...P.emptyPassport(), trips: { t: { done: 0, stop: 2, count: 5, at: NOW } } }, byId, NOW).ach.trip, false, 'a trip left half way is not finished');
  eq(!!noteAchievements({ ...P.emptyPassport(), seen: { 'sat-25544': NOW } }, byId, NOW).ach.eyes, true, 'a tick of seen');
  // every kind
  const every = { ...P.emptyPassport(), visited: {}, kinds: {} };
  FAMILIES.forEach((f, i) => { every.visited[`x${i}`] = i + 1; every.kinds[`x${i}`] = f; });
  eq(!!noteAchievements(every, byId, NOW).ach.every, true, 'one of every kind');
  delete every.visited.x0; delete every.kinds.x0; every.ach = {};
  eq(!!noteAchievements(every, byId, NOW).ach.every, false, 'one kind short');
  eq(noteAchievements(null, byId, NOW), null, 'no passport, no throw');
  eq(noteAchievements(P.emptyPassport(), byId, NaN).ach && Object.keys(P.emptyPassport().ach || {}).length, 0, 'no clock, no stamp');
  // the list: newest first
  const list = notedList({ ach: { first: 100, trip: 300, deep: 200, nonsense: 400, eyes: -1 } });
  eq(list.map((x) => x[0]).join(), 'trip,deep,first', 'newest first, unknown and broken stamps left out');
}

// --- the passport record keeps them ---------------------------------------------------------------------
{
  const raw = { v: 1, visited: { jupiter: 5, 'dso-m1': 6 }, trips: {}, seen: {}, first: 5, last: 6, wonder: null, kinds: { jupiter: 'worlds', 'dso-m1': 'deep', ghost: 'worlds', 'dso-x': 'nonsense' }, ach: { first: 7, nope: 8, planets: -1, deep: 'x' } };
  const p = P.sanitize(JSON.parse(JSON.stringify(raw)));
  eq(JSON.stringify(p.kinds), JSON.stringify({ jupiter: 'worlds', 'dso-m1': 'deep' }), 'kept kinds: only for places kept, only real kinds');
  eq(JSON.stringify(p.ach), JSON.stringify({ first: 7 }), 'kept notes: only real notes with a real day');
  const text = JSON.stringify(p);
  eq(JSON.stringify(P.sanitize(JSON.parse(text))), text, 'sanitize is stable on its own output');
  eq(P.sanitize({ v: 1 }).kinds && Object.keys(P.sanitize({ v: 1 }).kinds).length, 0, 'an old record gains empty kinds');
  const rv = P.recordVisit(P.emptyPassport(), 'jupiter', 1000, 'worlds');
  eq(rv.kinds.jupiter, 'worlds', 'a visit keeps the kind it was');
  const again = P.recordVisit(rv, 'jupiter', 2000, 'stations');
  eq(again.kinds.jupiter, 'worlds', 'the first visit decides, like its day');
  const noKind = P.recordVisit(P.emptyPassport(), 'jupiter', 1000);
  eq(Object.keys(noKind.kinds).length, 0, 'a visit with no kind keeps none');
  // the cap that drops old places drops their kinds
  let big = P.emptyPassport();
  for (let i = 0; i < P.VISITED_CAP + 20; i += 1) big = P.recordVisit(big, `p${i}`, 1000 + i, 'stars');
  eq(Object.keys(big.visited).length, P.VISITED_CAP, 'the passport still caps its places');
  eq(Object.keys(big.kinds).length, P.VISITED_CAP, 'and the kinds go with them');
  // Forget me removes the whole record
  const store = new Map();
  const storage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  P.writePassport(storage, noteAchievements(P.recordVisit(P.emptyPassport(), 'jupiter', 1000, 'worlds'), byId, 2000));
  check(store.has(P.KEY) && JSON.parse(store.get(P.KEY)).ach.first === 2000, 'the note is in the one record');
  P.forgetPassport(storage);
  check(!store.has(P.KEY), 'Forget me removes the kinds and the notes with the rest');
}

// --- the view ---------------------------------------------------------------------------------------------
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
{
  const p = noteAchievements({ ...base(), trips: { a: { done: 1, doneAt: 5 } } }, byId, Date.UTC(2026, 9, 20));
  const [kinds, noted] = kindsSections(p, { recordById: byId }, el);
  const names = kinds.querySelectorAll('.sr-list__name').map((n) => n.textContent);
  eq(names.join('|'), [W.kinds.worlds, W.kinds.stations, W.kinds.small, W.kinds.deep].join('|'), 'kinds in the fixed order, none with a zero');
  eq(kinds.querySelectorAll('.sr-list__value').map((n) => n.textContent).join(), '1,1,1,2', 'with their counts');
  check(noted.querySelectorAll('li').length >= 4, 'the notes that hold are listed');
  check(noted.querySelector('.sr-passport__fine').textContent === W.notedFine, 'and the page says what the day means');
  const empty = kindsSections(P.emptyPassport(), { recordById: byId }, el);
  eq(empty[0].querySelector('.sr-passport__empty').textContent, W.noKinds, 'an empty passport says so, once');
  eq(empty[1].querySelector('.sr-passport__empty').textContent, W.noNoted, 'and there are no notes to show');
  // a different order of visits gives the same page
  const flipped = { ...base(), visited: Object.fromEntries(Object.entries(base().visited).reverse()) };
  eq(kindsSections(flipped, { recordById: byId }, el)[0].textContent, kindsSections(base(), { recordById: byId }, el)[0].textContent, 'the same kinds in the same order whatever the order of the visits');
}

// --- never a score -------------------------------------------------------------------------------------------
const all = JSON.stringify(W);
check(!/\b(score|level|streak|rank|badge|unlock|points?|xp|leaderboard|achievement|win|won|reward|collect|complete|progress|to go|left to)\b/i.test(all), `its words do not keep score (${(/\b(score|level|streak|rank|badge|unlock|points?|xp|leaderboard|achievement|win|won|reward|collect|complete|progress|to go|left to)\b/i.exec(all) || [])[0]})`);
check(!/%|percent/i.test(all), 'its words quote no percentage of anything');
const src = readFileSync(join(JS, 'ui/passportkinds.js'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
check(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|navigator\.|location|document\.cookie|import\(/.test(src), 'it reads the passport it is handed and nothing else: no request, no storage of its own, no dynamic import');
check(!/Math\.random|Date\.now\(/.test(src), 'it is a function of the passport it is handed');

if (problems.length) { console.error('passport kinds FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`passport kinds ok: ${FAMILIES.length} kinds, ${ACHIEVEMENTS.length} notes stamped once and never taken back, kept in the one record and gone with Forget me, nothing that keeps score`);
