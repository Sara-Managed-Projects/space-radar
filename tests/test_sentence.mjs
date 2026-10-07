// tests/test_sentence.mjs -- one true sentence, the home's first line (public #395, #450;
// ui/sentence.js).
//
// The sentence is generated, so the test is the rule that makes it: which clause leads, that a
// clause whose data is missing is not a candidate (never "nobody is in orbit" from a failed
// download), that with nothing known there is no line, that it is one sentence of at most 60
// characters, and that every clause names where its data came from.
//
//   node tests/test_sentence.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const S = await import(join(JS, 'ui/sentence.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const H = 3600e3;
const D = 86400e3;
// 7 October 2026, 09:00 UTC: the Moon a waning crescent, three days from new.
const now = Date.parse('2026-10-07T09:00:00Z');
const iss = { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station', layer: 'stations', meta: {} };
const stage = { id: 'sat-1', name: 'SL-8 R/B', klass: 'rocket', layer: 'visual', meta: {} };
const launch = { id: 'l1', name: 'Falcon 9 Block 5 | Starlink Group 15-25', klass: 'rocket', layer: 'launches', meta: { rocket: 'Falcon 9 Block 5' } };
const neo = { id: 'neo-1', name: '2015 TS238', klass: 'asteroid', layer: 'asteroids', meta: {} };
const storm = (name) => ({ id: `storm-${name}`, name, klass: 'storm', layer: 'storms', meta: {} });
const full = {
  nowMs: now,
  items: [
    { kind: 'pass', record: stage, tMs: now + 1 * H },
    { kind: 'pass', record: iss, tMs: now + 3 * H },
    { kind: 'launch', record: launch, tMs: now + 6 * H, precision: 'Minute' },
    { kind: 'approach', record: neo, tMs: now + 2 * D, ld: 3.2 },
    { kind: 'shower', record: null, label: 'Orionids', tMs: now + 20 * H, zhr: 20 },
  ],
  crew: { ISS: 7, Tiangong: 3 },
  station: iss,
  storms: [storm('Humberto'), storm('Imelda'), storm('Jerry')],
  launched: { count: 70, newest: { id: 'sat-9', name: 'STARLINK-36001', layer: 'just-launched' } },
};
const ids = (list) => list.map((c) => c.id).join();

// --- the ranking, with everything known ---------------------------------------------------------------
{
  const c = S.sentenceCandidates(full);
  check(ids(c) === 'pass,launch,shower,crew,moon,storms,approach,launched', `the order: your pass, a launch today, a shower's peak, the crew, a Moon three days from new, the storms, a close approach, what went up (${ids(c)})`);
  const plain = S.sentenceCandidates({ ...full, nowMs: Date.parse('2026-10-15T09:00:00Z'), items: [] });
  check(ids(plain) === 'crew,storms,launched,moon', `and on a plain day the Moon is last (${ids(plain)})`);
  check(c[0].record === iss && c[0].clause === 'the ISS passes over you in 3 hours', `the pass is the station's, never the spent stage an hour sooner (${c[0].clause})`);
  check(c[1].clause === 'Falcon 9 Block 5 is due to launch in 6 hours', `a launch is its rocket, and its time a plan (${c[1].clause})`);
  check(c.find((x) => x.id === 'crew').clause === 'ten people are in orbit right now', `the crew is the sum of the headcount, in words (${c.find((x) => x.id === 'crew').clause})`);
  check(c.find((x) => x.id === 'storms').clause === 'three storms are turning', 'the storms are counted');
  check(c.find((x) => x.id === 'launched').clause === '70 new objects reached orbit in 30 days', 'what went up is the layer\'s count, and says over how long');
  check(c.find((x) => x.id === 'moon').clause === 'the Moon is three days from new', `the Moon counts down to new (${c.find((x) => x.id === 'moon').clause})`);
  check(/^the Moon is \d+ % lit$/.test(S.moonClause(Date.parse('2026-10-15T09:00:00Z')).clause), `and between the two says how much is lit (${S.moonClause(Date.parse('2026-10-15T09:00:00Z')).clause})`);
  check(c.every((x) => x.source && x.score > 0 && x.clause && x.act), 'every candidate has a source, a rank and somewhere to go');
  check(c.every((x) => x.clause[0] === x.clause[0].toLowerCase() || /^[A-Z0-9]/.test(x.clause)), 'clauses are written to stand second: the sentence capitalises the first');
  const soon = S.sentenceCandidates({ ...full, items: [{ kind: 'launch', record: launch, tMs: now + 1 * H, precision: 'Minute' }, full.items[1]] });
  check(soon[0].id === 'launch', 'a launch inside two hours leads even a pass');
}

// --- missing data: a clause is skipped, never invented -------------------------------------------------
{
  check(!S.sentenceCandidates({ ...full, crew: null }).some((c) => c.id === 'crew'), 'no headcount read: no crew clause');
  check(!S.sentenceCandidates({ ...full, crew: {} }).some((c) => c.id === 'crew') && !S.sentenceCandidates({ ...full, crew: { ISS: 0 } }).some((c) => c.id === 'crew'), 'an empty headcount is not "nobody is in orbit"');
  check(S.sentenceCandidates({ ...full, crew: { ISS: 1 } }).find((c) => c.id === 'crew').clause === 'one person is in orbit right now', 'one person is one person');
  check(S.sentenceCandidates({ ...full, crew: { ISS: 7, Tiangong: NaN, x: 'three' } }).find((c) => c.id === 'crew').clause === 'seven people are in orbit right now', 'a count that is not a number is not counted');
  check(!S.sentenceCandidates({ ...full, storms: [] }).some((c) => c.id === 'storms') && !S.sentenceCandidates({ ...full, storms: null }).some((c) => c.id === 'storms'), 'no storms loaded: no storm clause, not "no storms"');
  check(S.sentenceCandidates({ ...full, storms: [storm('Humberto')] }).find((c) => c.id === 'storms').clause === 'one storm is turning', 'one storm is one storm');
  check(!S.sentenceCandidates({ ...full, launched: null }).some((c) => c.id === 'launched') && !S.sentenceCandidates({ ...full, launched: { count: 0 } }).some((c) => c.id === 'launched'), 'nothing counted: nothing said about what went up');
  const noPlace = S.sentenceCandidates({ ...full, items: full.items.filter((i) => i.kind !== 'pass') });
  check(!noPlace.some((c) => c.id === 'pass') && noPlace[0].id === 'launch', 'no place set, so no pass in the list: no pass clause, and the launch leads');
  check(!S.sentenceCandidates({ ...full, items: [{ kind: 'pass', record: stage, tMs: now + H }] }).some((c) => c.id === 'pass'), 'a spent rocket body alone is no pass to lead with');
  check(!S.sentenceCandidates({ ...full, items: [{ kind: 'pass', record: iss, tMs: now + 30 * H }, { kind: 'launch', record: launch, tMs: now + 30 * H }, { kind: 'approach', record: neo, tMs: now + 5 * D }, { kind: 'shower', label: 'Orionids', tMs: now + 3 * D }] }).some((c) => ['pass', 'launch', 'approach', 'shower'].includes(c.id)), 'a pass or a launch past 24 hours, an approach past three days, a peak past tomorrow: not today\'s');
  check(!S.sentenceCandidates({ ...full, items: [{ kind: 'launch', record: launch, tMs: now + 6 * H, precision: 'Month' }] }).some((c) => c.id === 'launch'), 'a launch whose time is only a month is not "in 6 hours"');
  check(!S.sentenceCandidates({ ...full, items: [{ kind: 'launch', record: launch, tMs: now - 2 * H }] }).some((c) => c.id === 'launch'), 'nothing in the past');
  const bare = S.sentenceCandidates({ nowMs: now });
  check(ids(bare) === 'moon', `with nothing loaded the Moon is still true (${ids(bare)})`);
  check(S.sentenceCandidates({}).length === 0 && S.sentenceCandidates().length === 0, 'with no clock, nothing');
  check(S.compose([]) === null && S.compose(null) === null, 'and with no candidate there is no line');
}

// --- the Moon near full and near new -----------------------------------------------------------------
{
  // New Moon 10 October 2026 about 15:50 UTC; full Moon 26 October about 04:12 UTC.
  check(S.moonClause(Date.parse('2026-10-10T08:00:00Z')).clause === 'the Moon is new today', `new within half a day (${S.moonClause(Date.parse('2026-10-10T08:00:00Z')).clause})`);
  check(S.moonClause(Date.parse('2026-10-25T04:00:00Z')).clause === 'the Moon is one day from full', `a day from full (${S.moonClause(Date.parse('2026-10-25T04:00:00Z')).clause})`);
  check(S.moonClause(Date.parse('2026-10-23T04:00:00Z')).clause === 'the Moon is three days from full', `three days from full (${S.moonClause(Date.parse('2026-10-23T04:00:00Z')).clause})`);
  check(S.moonClause(Date.parse('2026-10-25T04:00:00Z')).score > 70 && S.moonClause(Date.parse('2026-10-15T09:00:00Z')).score < 40, 'a Moon about to be full outranks the crew; a plain crescent ranks last');
  check(S.moonClause(NaN) === null, 'no time, no Moon');
}

// --- one sentence, one line ----------------------------------------------------------------------------
{
  const made = S.compose(S.sentenceCandidates(full));
  check(made.text === 'The ISS passes over you in 3 hours.' || made.parts.length === 2, `the lead is capitalised and ends as a sentence (${made.text})`);
  check([...made.text].length <= S.MAX_CHARS && S.MAX_CHARS === 60, `inside the guide's 60 characters (${[...made.text].length})`);
  const two = S.compose(S.sentenceCandidates({ nowMs: Date.parse('2026-10-25T04:00:00Z'), storms: full.storms }));
  check(two.text === 'The Moon is one day from full, and three storms are turning.' && two.parts.length === 2 && two.sources.join() === 'Astronomy Engine,GDACS', `two clauses when both fit, each with its source (${two.text})`);
  const narrow = S.compose(S.sentenceCandidates({ nowMs: Date.parse('2026-10-25T04:00:00Z'), storms: full.storms }), 40);
  check(narrow.text === 'The Moon is one day from full.' && narrow.parts.length === 1, 'and the lead alone in a narrower column');
  const crew = S.compose(S.sentenceCandidates({ nowMs: now, crew: { ISS: 7, Tiangong: 3 }, station: iss }));
  check(crew.text === 'Ten people are in orbit right now.', `the crew leads a quiet day, alone when the Moon's clause would make it two lines (${crew.text})`);
  check(crew.parts[0].record === iss && crew.parts[0].act === 'select', 'a press goes to the lead clause\'s subject: the station');
  check(S.compose([{ id: 'x', clause: 'a'.repeat(80), source: 's' }]) === null, 'a clause too long for a line is no sentence');
  const skip = S.compose([{ id: 'a', clause: 'the first clause', source: 'one' }, { id: 'b', clause: 'b'.repeat(50), source: 'two' }, { id: 'c', clause: 'the third', source: 'three' }]);
  check(skip.text === 'The first clause, and the third.' && skip.sources.join() === 'one,three', 'a second clause that does not fit is passed over for one that does');
  check(!/!/.test(made.text) && /\.$/.test(made.text) && !/\.\./.test(made.text), 'no exclamation, one full stop');
}

// --- lazy, and generated ------------------------------------------------------------------------------
{
  const src = readFileSync(join(JS, 'ui/sentence.js'), 'utf8');
  check(!/20\d\d-\d\d-\d\d/.test(src.replace(/\/\/.*$/gm, '')) && Object.values(COPY.sentence).flat().every((v) => typeof v !== 'string' || !/\b20\d\d\b/.test(v)), 'no date is written in the module or its copy');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(!/sentence\.js/.test(main), 'main.js does not import it: it arrives with the dated cards, after the first visit has settled');
  check(/import \{ createSentence \} from '\.\/sentence\.js';/.test(readFileSync(join(JS, 'ui/today.js'), 'utf8')), 'ui/today.js brings it');
  check(Object.keys(COPY.sentence.sources).sort().join() === 'approach,crew,launch,launched,moon,pass,shower,storms', 'eight kinds of clause, eight sources');
  check(/scrollWidth > text\.clientWidth/.test(src) && /for \(const c of candidates\)/.test(src), 'the element measures its own line: two clauses, else the first one that fits alone');
}

if (problems.length) { console.error('sentence FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`sentence ok: "${S.compose(S.sentenceCandidates(full)).text}" | "${S.compose(S.sentenceCandidates({ nowMs: now, crew: full.crew, station: iss })).text}" | "${S.compose(S.sentenceCandidates({ nowMs: Date.parse('2026-10-25T04:00:00Z'), storms: full.storms })).text}"; a clause with no data is skipped, none at all is no line`);
