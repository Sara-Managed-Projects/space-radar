// ui/trippicker.js -- what the trips are, in the order they are offered (spec 0029).
//
// Pure exports, tested by tests/test_trips_panel.mjs:
//   tripOrder(rows)                     the ones that can run first, registry order within
//   groupTrips(tours, groups, plans)    the drawn structure, empty groups removed
//   nextTripId(tours, fromId)           `next:` when it names a trip, else the positional successor
//   nextTripOrder(tours, fromId)        every other trip, the one to offer first at the head
//   eventTypeOf(tour)                   the event type its first `{event:}` stop names, or null
//   eventSubtitle(tour, nowMs, ...)     "Next: 2 August 2027" for an event trip, else null
//
// THE CONTROL IS GONE, THE ORDER IS NOT. Until spec 0061 this module also drew the panel's Trips
// section: a <select> of every trip, the chosen one's paragraph, and one orange Start. Row D draws
// the trips as cards in the explore view (ui/explore.js), two columns, a tap on a card to start it,
// and that view reads its structure from groupTrips() here -- so a trip that cannot fill its own
// floor is still GREYED WITH ITS REASON and never hidden (spec 0025 req 6), and the ones that can
// run still lead. The end card's "next trip" (ui/tripframe.js) reads nextTripOrder() as before.
//
// THE [data-trip] CONTRACT moved with the control: each trip card in #sr-side carries `data-trip`,
// and ui/tripframe.js teardown() looks it up to put focus back after Leave when whatever started the
// trip never took focus (a programmatic click, the console).

import { COPY, t, timeText } from '../copy/en.js';
import { nextEvent } from '../data/events.js';

// ---------------------------------------------------------------------------------------
// The pure parts
// ---------------------------------------------------------------------------------------

/**
 * The order trips are shown in: the ones that can run first, each group in the registry's own
 * order. Pure. `rows` is [{id, off, index}].
 *
 * With CelesTrak refusing a visitor's IP -- a phone behind carrier NAT, on its first visit -- the
 * first thing in the Trips panel was the headline trip, greyed, saying "Only 1 of the stops on this
 * trip can be found right now, and it needs 3" above two trips that would have run (2026-09-22).
 * A refused trip still shows, with its reason; it no longer leads.
 */
export function tripOrder(rows) {
  return (Array.isArray(rows) ? rows.slice() : [])
    .sort((a, b) => (Number(!!a.off) - Number(!!b.off)) || (a.index - b.index))
    .map((r) => r.id);
}

/**
 * What the picker draws: [{group, display, trips: [{id, title, blurb, planned, off, reason, count,
 * estimateMs}]}], one entry per group that has a trip, in the table's `order`, trips inside a
 * group in tripOrder(). Pure.
 *
 * `plans` is a Map of trip id to what trip.plan(id) resolved to ({offerable, reason, count,
 * estimateMs}). A trip not in it yet is still being planned: drawn in registry order, not marked
 * off, its details line saying so. Before the layers land the map is empty and nothing is off.
 *
 * A trip whose group is not a row of the table is refused by scripts/check_registry.py, so this
 * never sees one from the shipped registry; if it did, the trip is listed last under no heading
 * rather than not at all, because the panel's rule is that every trip is listed.
 */
export function groupTrips(tours, groups, plans) {
  const list = Array.isArray(tours) ? tours : [];
  const table = (Array.isArray(groups) ? groups : [])
    .filter((g) => g && g.id)
    .map((g, i) => ({ id: g.id, display: g.display || '', order: Number(g.order) || 0, i }))
    .sort((a, b) => (a.order - b.order) || (a.i - b.i));
  const known = new Set(table.map((g) => g.id));
  const byGroup = new Map();
  list.forEach((tour, index) => {
    if (!tour || !tour.id) return;
    const plan = plans && typeof plans.get === 'function' ? plans.get(tour.id) : null;
    const planned = !!plan;
    const off = planned && !plan.offerable;
    const key = known.has(tour.group) ? tour.group : null;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push({
      id: tour.id,
      index,
      title: tour.title,
      blurb: tour.blurb,
      planned,
      off,
      // A plan() that threw: the trip stays choosable, with no shape line (see plan() below).
      failed: planned && !!plan.failed,
      reason: off ? plan.reason || '' : null,
      count: planned ? plan.count : null,
      estimateMs: planned ? plan.estimateMs : null,
    });
  });
  const out = [];
  for (const g of [...table, { id: null, display: '' }]) {
    const rows = byGroup.get(g.id);
    if (!rows || !rows.length) continue;
    const byId = new Map(rows.map((r) => [r.id, r]));
    out.push({ group: g.id, display: g.display, trips: tripOrder(rows).map((id) => byId.get(id)) });
  }
  return out;
}

/**
 * The trip the end card offers first: the registry's `next:` when it names another trip that
 * exists, else the trip after this one in registry order, wrapping at the end. Null with nothing
 * else to offer. Pure.
 *
 * Until 2026-09-22 the pick was positional only (spec 0025 §11.1 asked for a field "before the
 * fifth trip lands"; the fifth landed that day), so the Moon trip led on to the outer planets by
 * accident of file order and the outer planets led back round to the stations.
 */
export function nextTripId(tours, fromId) {
  const list = (Array.isArray(tours) ? tours : []).filter((tour) => tour && tour.id);
  const here = list.findIndex((tour) => tour.id === fromId);
  const from = here >= 0 ? list[here] : null;
  if (from && from.next && from.next !== fromId && list.some((tour) => tour.id === from.next)) {
    return from.next;
  }
  const walk = here < 0 ? list : list.slice(here + 1).concat(list.slice(0, here));
  return walk.length ? walk[0].id : null;
}

/**
 * Every trip but this one, the one nextTripId() names at the head and the positional walk after
 * it. ui/tripframe.js walks this through plan() and offers the first that can run today, so a
 * `next:` that cannot run falls back to what the end card offered before the field existed.
 */
export function nextTripOrder(tours, fromId) {
  const list = (Array.isArray(tours) ? tours : []).filter((tour) => tour && tour.id);
  const here = list.findIndex((tour) => tour.id === fromId);
  const walk = here < 0 ? list.slice() : list.slice(here + 1).concat(list.slice(0, here));
  const first = nextTripId(list, fromId);
  if (!first) return walk;
  return walk.filter((tour) => tour.id === first).concat(walk.filter((tour) => tour.id !== first));
}

/**
 * The event type an event trip is timed by: the first stop whose `time:` is spec 0030's reference
 * form, `{event: <type>.next, offset_s}`. Null for a trip with none. Pure.
 */
export function eventTypeOf(tour) {
  for (const stop of (tour && Array.isArray(tour.stops) ? tour.stops : [])) {
    const ref = stop && stop.time && typeof stop.time === 'object' ? stop.time.event : null;
    const m = /^([a-z0-9-]+)\.next$/.exec(String(ref || ''));
    if (m) return m[1];
  }
  return null;
}

/**
 * The line under an event trip's title: when its event next happens (spec 0031 task 5). A trip in
 * the Events group is only as good as its date, and "Chasing the solar eclipse" means February or
 * August depending on the day it is read. Null for a trip timed by no event, or when nothing of
 * that type falls in the next 400 days. Pure given `resolve` (data/events.js nextEvent).
 */
export function eventSubtitle(tour, nowMs, observer = null, resolve = nextEvent) {
  const type = eventTypeOf(tour);
  if (!type) return null;
  let ev = null;
  try { ev = resolve(type, nowMs, observer); } catch { ev = null; }
  return ev && Number.isFinite(ev.t) ? t(COPY.trip.nextEventLine, { date: timeText.longDate(ev.t) }) : null;
}
