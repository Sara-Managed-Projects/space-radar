// tests/test_story.mjs -- this week's story out of the catalogue (public #450; ui/story.js).
//
// Asserted, with no browser:
//   THE WEEK is ISO 8601's, and it picks the rule; a rule with no answer hands on to the next.
//   EACH RULE is arithmetic on element sets: the answer is checked here against a brute-force pass
//     over the same sets, and every number in the card's words is one of those.
//   WHAT IS LEFT OUT: sets older than seven days, provisional sets, an orbit under the ground.
//   NOTHING IS TYPED: every string is a template from copy/en.later.js with its numbers filled in,
//     the title claims only "our catalogue", and the rule is printed with the count it was asked of.
//   LAZY: ui/today.js imports it, and today.js is fetched after the first visit.
//
//   node tests/test_story.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const S = await mod('ui/story.js');
const P = await mod('data/parsers.js');
const { COPY } = await mod('copy/en.js');

// --- the week ---------------------------------------------------------------------------------
const wk = (iso) => { const w = S.isoWeek(Date.parse(iso)); return `${w.year}-W${w.week}`; };
check(wk('2026-10-08T12:00:00Z') === '2026-W41', `8 October 2026 is in week 41 (${wk('2026-10-08T12:00:00Z')})`);
check(wk('2026-01-01T00:00:00Z') === '2026-W1', `1 January 2026, a Thursday, is in week 1 (${wk('2026-01-01T00:00:00Z')})`);
check(wk('2027-01-03T23:59:00Z') === '2026-W53', `3 January 2027, a Sunday, still belongs to 2026's week 53 (${wk('2027-01-03T23:59:00Z')})`);
check(wk('2024-12-30T00:00:00Z') === '2025-W1', `30 December 2024, a Monday, opens 2025's week 1 (${wk('2024-12-30T00:00:00Z')})`);

// --- element sets, as the parser makes them ------------------------------------------------------
const NOW = Date.parse('2026-10-08T16:00:00Z');
const MU = 398600.4418;
const R = 6378.137;
/** A GP row for an orbit given by its perigee and apogee heights. */
function row(name, norad, intl, perigeeKm, apogeeKm, epochIso) {
  const a = R + (perigeeKm + apogeeKm) / 2;
  const e = (apogeeKm - perigeeKm) / (2 * a);
  const n = Math.sqrt(MU / (a * a * a)) * 86400 / (2 * Math.PI);
  return { OBJECT_NAME: name, OBJECT_ID: intl, EPOCH: epochIso, MEAN_MOTION: n, ECCENTRICITY: e, INCLINATION: 51.6, RA_OF_ASC_NODE: 10, ARG_OF_PERICENTER: 20, MEAN_ANOMALY: 30, EPHEMERIS_TYPE: 0, CLASSIFICATION_TYPE: 'U', NORAD_CAT_ID: norad, ELEMENT_SET_NO: 999, REV_AT_EPOCH: 1, BSTAR: 0.0001, MEAN_MOTION_DOT: 0, MEAN_MOTION_DDOT: 0 };
}
const FRESH = '2026-10-07T12:00:00';
const rows = [
  row('LOW ONE', 50001, '2022-001A', 180, 195, FRESH),
  row('HIGH FLYER', 40001, '2015-011B', 9000, 150000, FRESH),
  row('OLD TIMER', 900, '1964-063C', 1000, 1050, FRESH),
  row('STALE AND LOWER', 50002, '2022-001B', 120, 130, '2026-09-20T00:00:00'),
  ...Array.from({ length: 12 }, (_, i) => row(`SHELL ${i + 1}`, 60001 + i, '2024-050' + String.fromCharCode(65 + i), 541 + (i % 3), 548, FRESH)),
  ...Array.from({ length: 5 }, (_, i) => row(`OTHER ${i + 1}`, 61001 + i, '2023-020' + String.fromCharCode(65 + i), 700 + 40 * i, 720 + 40 * i, FRESH)),
];
const recs = P.parseCelestrakGP(rows, { layer: 'active', source: 'celestrak-active' });
check(recs.length === rows.length, `the fixture parses (${recs.length} of ${rows.length})`);
const sets = S.freshSets(recs, NOW);
check(sets.length === rows.length - 1 && !sets.some((r) => r.name === 'STALE AND LOWER'), `a set 18 days old is left out (${sets.length} kept)`);
check(S.freshSets([{ ...recs[0], meta: { ...recs[0].meta, provisional: true } }], NOW).length === 0, 'a provisional set is left out');
check(S.freshSets([{ ...recs[0], meta: { ...recs[0].meta, perigeeKm: -40 } }], NOW).length === 0, 'an orbit under the ground is a bad set, not a story');
check(S.freshSets([{ ...recs[0], propagator: 'static' }], NOW).length === 0, 'only element sets are asked');
check(S.freshSets(recs.concat(recs), NOW).length === sets.length, 'a record loaded by two layers is counted once');

// --- each rule against a brute-force answer ------------------------------------------------------
const by = (f) => sets.reduce((a, b) => (f(b) < f(a) ? b : a));
const numbersIn = (text) => (text.match(/\d[\d ]*/g) || []).map((x) => Number(x.replace(/ /g, '')));
const lowest = S.storyFor('lowest', recs, NOW);
check(lowest && lowest.record === by((r) => r.meta.apogeeKm) && lowest.record.name === 'LOW ONE', `lowest: the lowest highest point (${lowest && lowest.record.name})`);
check(lowest && numbersIn(lowest.line).join() === [Math.round(lowest.record.meta.apogeeKm), Math.round(lowest.record.meta.perigeeKm), Math.round(lowest.record.meta.periodMin)].join(), `lowest: its line carries its own three numbers (${lowest && lowest.line})`);
check(lowest && Math.abs(lowest.numbers.apogeeKm - 195) < 0.5 && Math.abs(lowest.numbers.perigeeKm - 180) < 0.5, 'lowest: the heights are the orbit\'s, to the kilometre');
const farthest = S.storyFor('farthest', recs, NOW);
check(farthest && farthest.record === by((r) => -r.meta.apogeeKm) && farthest.record.name === 'HIGH FLYER', `farthest: the highest point (${farthest && farthest.record.name})`);
check(farthest && /days\.$/.test(farthest.line) && numbersIn(farthest.line)[0] === 150000, `farthest: a lap of more than two days is said in days (${farthest && farthest.line})`);
const busiest = S.storyFor('busiest', recs, NOW);
{
  const counts = new Map();
  for (const r of sets) { const b = Math.floor(((r.meta.apogeeKm + r.meta.perigeeKm) / 2) / S.BAND_KM); counts.set(b, (counts.get(b) || 0) + 1); }
  const [band, n] = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  check(busiest && busiest.numbers.loKm === band * S.BAND_KM && busiest.numbers.inBand === n && n === 12, `busiest: the fullest ${S.BAND_KM} km (${busiest && busiest.title}, ${busiest && busiest.numbers.inBand})`);
  check(busiest && numbersIn(busiest.line).join() === [n, sets.length, Math.round((100 * n) / sets.length), 100].join(), `busiest: its line carries the count, the total and the share (${busiest && busiest.line})`);
}
const oldest = S.storyFor('oldest', recs, NOW);
check(oldest && oldest.record.name === 'OLD TIMER' && oldest.numbers.launchYear === 1964 && oldest.numbers.years === 62, `oldest: the earliest launch year, and its age in 2026 (${oldest && oldest.line})`);
for (const s of [lowest, farthest, busiest, oldest]) {
  if (!s) continue;
  check(numbersIn(s.rule).includes(sets.length), `${s.ruleId}: the rule is printed with the number of sets it was asked of ("${s.rule}")`);
  check(/catalogue|we hold/.test(s.title), `${s.ruleId}: the title claims only what this map holds ("${s.title}")`);
  check([...s.rule].length <= 60, `${s.ruleId}: the rule is a chrome line of at most 60 characters (${[...s.rule].length})`);
  check(s.kicker.includes('41') && s.week.week === 41, `${s.ruleId}: dated by its week`);
  check(!/[!]|--/.test(s.title + s.line + s.rule), `${s.ruleId}: no exclamation and no double dash`);
}

// --- the week picks, and an empty rule hands on ---------------------------------------------------
const weekly = S.weeklyStory(recs, NOW);
check(weekly && weekly.ruleId === S.RULES[41 % S.RULES.length], `week 41 takes rule ${41 % S.RULES.length} (${weekly && weekly.ruleId})`);
const nextWeek = S.weeklyStory(recs.map((r) => ({ ...r, epoch: r.epoch + 7 * 86400e3 })), NOW + 7 * 86400e3);
check(nextWeek && nextWeek.ruleId === S.RULES[42 % S.RULES.length] && nextWeek.ruleId !== weekly.ruleId, `and week 42 the next one (${nextWeek && nextWeek.ruleId})`);
const noYear = recs.slice(0, 3).map((r) => ({ ...r, meta: { ...r.meta, launchYear: null } }));
check(S.storyFor('oldest', noYear, NOW) === null, 'a rule with no answer says nothing');
const wOld = Date.parse('2026-10-22T12:00:00Z'); // week 43 -> rule 3, oldest
check(S.RULES[S.isoWeek(wOld).week % S.RULES.length] === 'oldest', 'week 43 is the oldest rule\'s');
const handed = S.weeklyStory(noYear.map((r) => ({ ...r, epoch: wOld - 3600e3 })), wOld);
check(handed && handed.ruleId !== 'oldest', `and with no launch years it hands on to the next rule (${handed && handed.ruleId})`);
check(S.weeklyStory([], NOW) === null && S.weeklyStory(recs, NaN) === null, 'no element sets, no story');

// --- nothing typed, and lazy ------------------------------------------------------------------------
const src = readFileSync(join(JS, 'ui/story.js'), 'utf8');
check(!/['"`][A-Z][a-z]+ [a-z]+ [a-z]+/.test(src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')), 'ui/story.js writes no sentence of its own: the words are copy');
check(!/fetch\(|XMLHttpRequest|document\.|window\./.test(src), 'and it reads nothing but the records it is handed');
for (const id of S.RULES) check(COPY.story[id] && COPY.story[id].title && COPY.story[id].line && COPY.story[id].rule, `copy has the ${id} rule's three templates`);
const today = readFileSync(join(JS, 'ui/today.js'), 'utf8');
check(/import \{ weeklyStory \} from '\.\/story\.js';/.test(today) && /storyRule\.textContent = made\.rule;/.test(today), 'the Today shelf draws it, with its rule as the last line');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(!/from '\.\/ui\/(story|today)\.js'/.test(main), 'neither is a static import of main.js');

if (problems.length) { console.error(`story: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log(`story ok: four rules over ${sets.length} fresh sets: "${lowest.title}" | "${farthest.line}" | "${busiest.title}" | "${oldest.line}"; week 41 takes "${weekly.ruleId}"`);
