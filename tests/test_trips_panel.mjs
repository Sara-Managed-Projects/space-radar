// tests/test_trips_panel.mjs -- the Trips picker: the trips that can run lead, every trip sits
// under its group, and the end card knows which trip comes next (specs 0025, 0029).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { tripOrder, groupTrips, nextTripId, nextTripOrder } = await import(join(JS, 'ui/trippicker.js'));
const { TOURS, TOUR_GROUPS } = await import(join(JS, 'data/tours.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- tripOrder --------------------------------------------------------------------------
// 2026-09-22, CelesTrak refusing the IP: the headline trip, greyed with "Only 1 of the stops on this
// trip can be found right now", led the panel above two that would have run.
const refused = tripOrder([
  { id: 'people-in-space', index: 0, off: true },
  { id: 'strangest-things', index: 1, off: false },
  { id: 'to-the-edge', index: 2, off: false },
]);
check(refused.join() === 'strangest-things,to-the-edge,people-in-space', `runnable trips first, the refused one last and still there (${refused})`);
const allRun = tripOrder([{ id: 'a', index: 0, off: false }, { id: 'b', index: 1, off: false }, { id: 'c', index: 2, off: false }]);
check(allRun.join() === 'a,b,c', 'with everything runnable the registry order stands');
const noneRun = tripOrder([{ id: 'a', index: 0, off: true }, { id: 'b', index: 1, off: true }]);
check(noneRun.join() === 'a,b', 'with nothing runnable the registry order stands');
check(tripOrder(null).length === 0, 'nothing in, nothing out');

// --- groupTrips -------------------------------------------------------------------------
// A small registry of its own, so the cases read without the real file open: four groups, one
// of them empty, written out of `order` on purpose.
const GROUPS = [
  { id: 'beyond', display: 'Beyond', order: 3 },
  { id: 'earth-orbit', display: 'Around the Earth', order: 1 },
  { id: 'events', display: 'Things about to happen', order: 4 },
  { id: 'solar-system', display: 'Around the Solar System', order: 2 },
];
const TRIPS = [
  { id: 'people-in-space', title: 'People', blurb: 'b1', group: 'earth-orbit', next: 'strangest-things' },
  { id: 'strangest-things', title: 'Strange', blurb: 'b2', group: 'solar-system', next: 'moon-landings' },
  { id: 'to-the-edge', title: 'Edge', blurb: 'b3', group: 'beyond' },
  { id: 'moon-landings', title: 'Moon', blurb: 'b4', group: 'solar-system', next: 'outer-solar-system' },
  { id: 'outer-solar-system', title: 'Outer', blurb: 'b5', group: 'solar-system', next: 'to-the-edge' },
];

const unplanned = groupTrips(TRIPS, GROUPS, new Map());
check(unplanned.map((g) => g.group).join() === 'earth-orbit,solar-system,beyond', `groups by order, the empty one dropped (${unplanned.map((g) => g.group)})`);
check(unplanned.map((g) => g.display).join('|') === 'Around the Earth|Around the Solar System|Beyond', 'each group carries its display string');
check(unplanned[1].trips.map((r) => r.id).join() === 'strangest-things,moon-landings,outer-solar-system', 'inside a group the registry order stands before any plan lands');
check(unplanned.every((g) => g.trips.every((r) => !r.off && !r.planned && r.reason === null)), 'before the plans land nothing is off and nothing is planned');
check(unplanned[0].trips[0].title === 'People' && unplanned[0].trips[0].blurb === 'b1', 'a row carries the title and blurb the details block prints');

const plans = new Map([
  ['people-in-space', { offerable: false, reason: 'Only 1 of the stops can be found', count: 1, estimateMs: 0 }],
  ['strangest-things', { offerable: false, reason: 'Only 2 of the stops can be found', count: 2, estimateMs: 0 }],
  ['moon-landings', { offerable: true, reason: null, count: 10, estimateMs: 200000 }],
  ['outer-solar-system', { offerable: true, reason: null, count: 10, estimateMs: 210000 }],
]);
const planned = groupTrips(TRIPS, GROUPS, plans);
check(planned[1].trips.map((r) => r.id).join() === 'moon-landings,outer-solar-system,strangest-things', `tripOrder applies inside a group: the refused trip goes last and stays (${planned[1].trips.map((r) => r.id)})`);
const strange = planned[1].trips.find((r) => r.id === 'strangest-things');
check(strange && strange.off && strange.planned && strange.reason === 'Only 2 of the stops can be found', 'an off trip carries its reason');
const moon = planned[1].trips.find((r) => r.id === 'moon-landings');
check(moon && !moon.off && moon.planned && moon.count === 10 && moon.estimateMs === 200000, 'an offerable trip carries its count and estimate for the shape line');
const edge = planned[2].trips[0];
check(edge.id === 'to-the-edge' && !edge.planned && !edge.off, 'a trip whose plan has not landed is neither off nor planned');
check(planned.length === 3, 'a group is drawn when it has a trip, even one that cannot run (never hidden)');

// A trip whose group is not in the table is refused by check_registry.py; if one ever reached
// here it is listed last, under no heading, rather than dropped.
const stray = groupTrips([...TRIPS, { id: 'x', title: 'X', blurb: '', group: 'nowhere' }], GROUPS, new Map());
check(stray.length === 4 && stray[3].group === null && stray[3].trips[0].id === 'x', 'a trip with an unknown group is still listed, last');
check(groupTrips(null, null, null).length === 0, 'nothing in, nothing out');

// The shipped registry: five trips in three groups, and every trip is drawn exactly once.
const shipped = groupTrips(TOURS, TOUR_GROUPS, new Map());
const drawnIds = shipped.flatMap((g) => g.trips.map((r) => r.id));
check(shipped.length === 3, `the shipped registry draws three groups (${shipped.map((g) => g.group)})`);
check(drawnIds.length === TOURS.length && new Set(drawnIds).size === TOURS.length, 'every shipped trip is drawn once');

// --- nextTripId / nextTripOrder -------------------------------------------------------------
check(nextTripId(TRIPS, 'people-in-space') === 'strangest-things', '`next:` names the follow-on');
check(nextTripId(TRIPS, 'moon-landings') === 'outer-solar-system', '`next:` wins over the positional successor');
check(nextTripId(TRIPS, 'to-the-edge') === 'moon-landings', 'without `next:` the positional successor is offered');
check(nextTripId(TRIPS.slice(0, 3), 'to-the-edge') === 'people-in-space', 'the positional walk wraps at the end of the list');
check(nextTripId([TRIPS[0]], 'people-in-space') === null, 'with one trip there is nothing to offer');
check(nextTripId(TRIPS, 'not-a-trip') === 'people-in-space', 'an unknown current trip offers the first trip');
check(nextTripId([{ id: 'a', next: 'a' }, { id: 'b' }], 'a') === 'b', 'a `next:` naming itself is ignored');
check(nextTripId([{ id: 'a', next: 'zz' }, { id: 'b' }], 'a') === 'b', 'a `next:` naming nothing that exists is ignored');

// From the oddities trip the positional successor is the edge trip; `next:` names the Moon, which
// is two rows down. The Moon goes to the head and the rest keep their walk, so a `next:` that
// cannot run today falls back to exactly what the card offered before the field existed.
const order = nextTripOrder(TRIPS, 'strangest-things').map((tour) => tour.id);
check(order.join() === 'moon-landings,to-the-edge,outer-solar-system,people-in-space', `the end card walks the named one first, then the positional wrap (${order})`);
check(!order.includes('strangest-things'), 'the current trip is never offered as its own follow-on');
const plain = nextTripOrder(TRIPS, 'to-the-edge').map((tour) => tour.id);
check(plain.join() === 'moon-landings,outer-solar-system,people-in-space,strangest-things', `without a \`next:\` the walk is the positional one (${plain})`);
check(nextTripOrder(TRIPS, 'nope').length === TRIPS.length, 'an unknown current trip walks every trip');

// The shipped chain: stations, oddities, the Moon, the outer planets, and out of the Solar System.
const chain = ['people-in-space'];
for (let i = 0; i < 4; i += 1) chain.push(nextTripId(TOURS, chain[chain.length - 1]));
check(chain.join() === 'people-in-space,strangest-things,moon-landings,outer-solar-system,to-the-edge', `the shipped \`next:\` chain leads a stranger outward (${chain})`);

// --- event trips (spec 0031 task 5) -----------------------------------------------------
// A trip in the Events group says when its event next happens, from the first `{event:}` stop
// (spec 0030's reference form). From 2026-09-22 the next solar eclipse is the February annular.
{
  const { eventTypeOf, eventSubtitle } = await import(join(JS, 'ui/trippicker.js'));
  const eclipseTrip = {
    id: 'chasing-the-eclipse', group: 'events',
    stops: [{ id: 'earth', target: { world: 'earth' } }, { id: 'shadow', target: { world: 'earth' }, time: { event: 'solar-eclipse.next', offset_s: -5400 } }],
  };
  check(eventTypeOf(eclipseTrip) === 'solar-eclipse', `the trip is timed by its first {event:} stop (${eventTypeOf(eclipseTrip)})`);
  const line = eventSubtitle(eclipseTrip, Date.UTC(2026, 8, 22));
  // 15:59 UT on 6 February 2027 is already the 7th east of UTC+8, and the zone is the visitor's.
  check(/^Next: [67] February 2027$/.test(String(line)), `and its subtitle is the February date: "${line}"`);
  check(eventSubtitle(TOURS[0], Date.UTC(2026, 8, 22)) === null, 'a trip timed by no event has no subtitle');
  check(eventSubtitle({ stops: [{ time: { event: 'nonsense.next' } }] }, Date.UTC(2026, 8, 22)) === null, 'an event type nobody builds has none either');
  check(eventSubtitle({ stops: [{ time: 'now' }] }, Date.UTC(2026, 8, 22)) === null, '`time: now` is not an event');
}

if (problems.length) { console.error('trips panel FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('trips panel ok: the trips that can run lead; every trip sits under its group, a refused one last with its reason; the end card offers the named next trip first');
