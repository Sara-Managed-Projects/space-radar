// tests/test_today.mjs -- the home's dated cards and the way back from an automatic move
// (internal #270 and #274; public #395, #450; ui/today.js, ui/camundo.js).
//
// The cards are generated from what is loaded, so the test is the rule that makes them: which
// card comes first, what is left out, that nothing is typed by hand, and that a spent rocket
// body is never the pass a person is told to go out for.
//
//   node tests/test_today.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const T = await import(join(JS, 'ui/today.js'));
const U = await import(join(JS, 'ui/camundo.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const now = Date.parse('2026-10-06T08:16:00Z');
const H = 3600e3;
const D = 86400e3;
const iss = { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station', layer: 'stations', meta: {} };
const stage = { id: 'sat-1', name: 'SL-8 R/B', klass: 'rocket', layer: 'visual', meta: {} };
const hst = { id: 'sat-20580', name: 'HST', klass: 'telescope', layer: 'visual', meta: {} };
const launch = { id: 'l1', name: 'Nuri | NeonSat-2 to 6', klass: 'rocket', layer: 'launches', meta: {} };
const neo = { id: 'neo-1', name: '2015 TS238', klass: 'asteroid', layer: 'asteroids', meta: {} };
const items = [
  { kind: 'pass', record: stage, tMs: now + 2 * H },
  { kind: 'pass', record: hst, tMs: now + 5 * H },
  { kind: 'pass', record: iss, tMs: now + 9 * H },
  { kind: 'launch', record: launch, tMs: now + 22 * H, precision: 'Minute' },
  { kind: 'approach', record: neo, tMs: now + 2.5 * D, ld: 3.2 },
  { kind: 'approach', record: { ...neo, id: 'neo-2', name: '2026 TB' }, tMs: now + 3 * D, ld: 8 },
  { kind: 'shower', record: null, label: 'Orionids', tMs: now + 15 * D, zhr: 20 },
  { kind: 'solar-eclipse', record: null, label: 'Total solar eclipse', eclipseKind: 'total', tMs: Date.parse('2027-08-02T10:07:00Z') },
];

// --- the Moon --------------------------------------------------------------------------------------
const moon = T.moonCard(now);
check(moon && moon.title === 'Waning crescent Moon' && /^2\d % lit · new Moon on 1[01] Oct$/.test(moon.line) && moon.kicker === '06 Oct', `the Moon on 6 October 2026: a waning crescent, a quarter lit, new on the 10th (${moon && moon.title} / ${moon && moon.line})`);
const full = T.moonCard(Date.parse('2026-10-26T12:00:00Z'));
check(full && full.title === 'Full Moon' && /last quarter on/.test(full.line), `and full on the 26th (${full && full.title} / ${full && full.line})`);

// --- which cards, in what order ----------------------------------------------------------------------
const cards = T.todayCards({ items, nowMs: now, launched: { count: 203, newest: { id: 'sat-9', name: 'STARLINK-36001' } } });
check(cards.length === T.MAX_CARDS && T.MAX_CARDS === 4, `four cards at most (${cards.length})`);
check(cards[0].record === iss, `the pass is the station's, not the spent rocket body two hours sooner (${cards[0].title})`);
check(cards[1].record === launch && /planned/.test(cards[1].line), `then the next launch, which says its time is a plan (${cards[1].line})`);
check(cards[2].id === 'moon', 'then the Moon');
check(cards[3].record === neo && /3\.20?× Moon/.test(cards[3].line), `then the soonest of the rest, a close approach with its distance (${cards[3].line})`);
check(cards.every((c) => c.kicker && c.title && c.act), 'every card has a date, a title and somewhere to go');
{
  const quiet = T.todayCards({ items: [items[0], items[6], items[7]], nowMs: now, launched: { count: 203, newest: { id: 'sat-9', name: 'STARLINK-36001' } } });
  check(!quiet.some((c) => c.record === stage), 'a spent rocket body alone is no pass card at all');
  check(quiet.map((c) => c.id.split(':')[0]).join(',') === 'moon,shower,launched,solar-eclipse', `with no launch: the Moon, the shower, what went up, the eclipse (${quiet.map((c) => c.id)})`);
  const eclipse = quiet.find((c) => c.act === 'earth-then');
  check(eclipse && eclipse.kicker === '02 Aug 2027', `an eclipse ten months off carries its year (${eclipse && eclipse.kicker})`);
  check(quiet.find((c) => c.id === 'launched').title === '203 new objects in orbit' && quiet.find((c) => c.id === 'launched').line === 'Newest: STARLINK-36001', 'what went up is counted from the layer, and names the newest');
}
check(T.todayCards({ items: [], nowMs: now }).map((c) => c.id).join(',') === 'moon', 'with nothing loaded the Moon is still true; a card with no data is left out');
check(T.todayCards({ items: [{ kind: 'pass', record: iss, tMs: now + 30 * H }], nowMs: now })[0].id === 'moon', 'a pass more than a day off is not today\'s');
check(T.todayCards({ items: [{ kind: 'launch', record: launch, tMs: now - 5 * H }], nowMs: now }).length === 1, 'nothing in the past');
{
  const two = T.todayCards({ items: items.filter((i) => i.kind === 'approach'), nowMs: now });
  check(two.filter((c) => c.act === 'select').length === 1, 'one close approach, not a shelf of them');
}

// --- nothing typed that can go stale -------------------------------------------------------------------
const src = readFileSync(join(JS, 'ui/today.js'), 'utf8');
check(!/20\d\d-\d\d-\d\d/.test(src.replace(/\/\/.*$/gm, '')) && Object.values(COPY.today).flat().every((v) => typeof v !== 'string' || !/\b20\d\d\b/.test(v)), 'no date is written in the module or its copy: every card is worked out');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(!/^import .*today\.js/m.test(main) && /import\('\.\/ui\/today\.js'\)/.test(main) && Number(/TODAY_MS = (\d+)/.exec(main)[1]) > 2000, 'the cards are a dynamic import, after the first visit has settled');

// --- the way back from an automatic move (internal #274) ------------------------------------------------
check(U.undoWords('Hubble Space Telescope') === 'Moved to Hubble Space Telescope' && U.undoWords('') === COPY.undo.movedNowhere, 'the toast says where the view went');
check([...U.undoWords('The International Space Station and everything docked to it')].length <= 44 && U.undoWords('The International Space Station and everything docked to it').endsWith('…'), 'a long name is cut at a word');
check([...COPY.undo.back].length <= 60 && COPY.undo.back === 'Back to where you were', 'and offers the way back in words');
const view = (over) => ({ stage: 'earth', moment: 'wonder', selected: null, clock: { mode: 'live', t: now }, ...over });
check(U.sameView(view(), view()) && !U.sameView(view(), view({ stage: 'sun' })) && !U.sameView(view(), view({ selected: iss })) && !U.sameView(view(), view({ clock: { mode: 'scrub', t: now } })), 'an undo is offered only when the view changed: the stage, the selection or the clock');
check(U.sameView(view({ clock: { mode: 'scrub', t: now } }), view({ clock: { mode: 'scrub', t: now + 30e3 } })) && !U.sameView(null, view()), 'a scrubbed clock half a minute on is the same view');
check(/opts\.from !== 'pick'/.test(main) && /select\(hit, \{ from: 'pick' \}\)/.test(main), 'a tap on the thing itself is pointing at it: no toast');
check(/if \(inTrip\(\)\) return null/.test(main), 'and a trip\'s own stops are not offered back');
check(/ctx\.rememberView\(\)/.test(readFileSync(join(JS, 'ui/explore.js'), 'utf8')) && /ctx\.rememberView\(\)/.test(readFileSync(join(JS, 'ui/scrubber.js'), 'utf8')) && /ctx\.rememberView\(\)/.test(readFileSync(join(JS, 'ui/missions.js'), 'utf8')), 'a tab, a mark on the timeline and a mission\'s event each keep the view first');
check(U.UNDO_MS >= 4000 && U.UNDO_MS <= 8000 && /pointerenter/.test(readFileSync(join(JS, 'ui/camundo.js'), 'utf8')) && /Escape/.test(readFileSync(join(JS, 'ui/camundo.js'), 'utf8')), 'the toast stays a few seconds, holds under the pointer and the focus, and Escape puts it away');

if (problems.length) { console.error('today FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`today ok: ${cards.map((c) => c.title).join(' | ')}; the Moon "${moon.line}"; an undo only when the view changed`);
