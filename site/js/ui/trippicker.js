// ui/trippicker.js -- the Trips section of the panel: every trip, grouped, in one <select>, with
// the chosen trip's details and a single Start under it (spec 0029).
//
// Contract export: createTripPicker(ctx, host) -> { root, plan(), destroy() }
// Pure exports, tested by tests/test_trips_panel.mjs:
//   tripOrder(rows)                     the ones that can run first, registry order within
//   groupTrips(tours, groups, plans)    the drawn structure, empty groups removed
//   nextTripId(tours, fromId)           `next:` when it names a trip, else the positional successor
//   nextTripOrder(tours, fromId)        every other trip, the one to offer first at the head
//
// WHY A <select>. The panel was a flat list of buttons, one per trip; the sixth trip was already
// written when Ivan asked for a drop-down "as we will add more and more excursion types"
// (2026-09-22). A native select is free where a hand-built list is expensive: a keyboard model, a
// screen-reader model, a picker sheet on iOS and Android, no focus trap, and nothing to position.
// The last one is the deciding one: on a phone this panel is a bottom sheet that scrolls (site.css
// `html.sr-phone #sr-controls`), and anything absolutely positioned inside it clips at the sheet's
// edge, which is why ui/search.js keeps its listbox in flow. ui/colorkey.js already uses a native
// select in this same panel.
//
// WHAT DID NOT CHANGE. Start still calls trip.start(id); the frame, the state machine and the
// intro card are untouched. A trip that cannot fill its own floor is still GREYED WITH ITS REASON
// and never hidden (spec 0025 req 6). The reason goes in the details block under the select, and
// the option gets a short suffix rather than `disabled`: iOS draws a disabled option as plain grey
// text with no reason attached, and an option you cannot choose is a reason you cannot read.
//
// THE [data-trip] CONTRACT. Exactly one element in #sr-controls carries `data-trip`: the Start
// button, whose dataset.trip follows the selection. ui/tripframe.js teardown() looks it up to put
// focus back after Leave when whatever started the trip never took focus (a programmatic click,
// the console). When the visitor changed the select during the trip, focus still lands on Start,
// which is the right place to land.
//
// TWO HOSTS. The panel mounts this today; spec 0042's landing sheet mounts the same control. So
// the picker owns its own planning: it listens for `sr:layers-ready` once, and exposes plan() for
// a host built after that event has already fired.

import { COPY, t } from '../copy/en.js';
import { TOUR_GROUPS } from '../data/tours.js';
import { shapeLine } from './tripframe.js';

const SELECT_ID = 'sr-trips-select';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function button(className, text, title) {
  const b = el('button', className, text);
  b.type = 'button';
  if (title) b.title = title;
  return b;
}

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

// ---------------------------------------------------------------------------------------
// The control
// ---------------------------------------------------------------------------------------

function groupLabel(group) {
  const n = group.trips.length;
  return t(n === 1 ? COPY.trip.groupCountOne : COPY.trip.groupCount, { display: group.display, count: n });
}

function rowOf(drawn, id) {
  for (const g of drawn) for (const row of g.trips) if (row.id === id) return row;
  return null;
}

function firstId(drawn, wantOfferable) {
  for (const g of drawn) {
    for (const row of g.trips) {
      if (!wantOfferable || (row.planned && !row.off)) return row.id;
    }
  }
  return null;
}

export function createTripPicker(ctx, host) {
  const trip = ctx && ctx.trip;
  const tours = trip && typeof trip.tours === 'function' ? trip.tours() : [];
  const root = el('section', 'sr-panel sr-trips');
  if (host) host.appendChild(root);
  if (!tours.length) return { root, plan() {}, destroy() { root.remove(); } };

  const plans = new Map();
  let drawn = [];
  let touched = false;   // the visitor has chosen; a plan landing no longer moves the selection
  let alive = true;

  root.appendChild(el('h2', 'sr-panel__title', COPY.trip.sectionTitle));
  root.appendChild(el('p', 'sr-trips__hint', COPY.trip.sectionHint));
  const label = el('label', 'sr-trips__label', COPY.trip.pickerLabel);
  label.htmlFor = SELECT_ID;
  root.appendChild(label);
  const select = el('select', 'sr-trips__select');
  select.id = SELECT_ID;
  root.appendChild(select);

  const details = el('div', 'sr-trips__details');
  const blurb = el('p', 'sr-trips__blurb');
  // THE SHAPE LINE IS NOT INSIDE THE BUTTON, and it is live. Inside, its rewrite as each plan
  // landed changed the button's accessible name under a screen reader (spec 0025's panel review).
  // `aria-live="polite"` announces the resolution when it lands, and the reason when there is one.
  const shape = el('p', 'sr-trips__shape', COPY.trip.planning);
  shape.setAttribute('aria-live', 'polite');
  const start = button('sr-btn sr-btn--primary sr-trips__start', COPY.trip.startTitle);
  details.appendChild(blurb);
  details.appendChild(shape);
  details.appendChild(start);
  root.appendChild(details);

  /** The options, rebuilt from the plans that have landed; the selection survives the rebuild. */
  function paintOptions() {
    drawn = groupTrips(tours, TOUR_GROUPS, plans);
    const want = select.value || firstId(drawn, false);
    select.textContent = '';
    for (const g of drawn) {
      let parent = select;
      if (g.display) {
        parent = el('optgroup');
        parent.label = groupLabel(g);
        select.appendChild(parent);
      }
      for (const row of g.trips) {
        // A refused trip is MARKED, never disabled: the option stays choosable so its reason,
        // printed in the details block, can be read.
        const o = el('option', null, row.off ? `${row.title} ${COPY.trip.cannotRunMark}` : row.title);
        o.value = row.id;
        if (row.off) o.dataset.off = '1';
        parent.appendChild(o);
      }
    }
    if (want) select.value = want;
  }

  /** The chosen trip's blurb, its shape line or its reason, and the one Start button. */
  function paintDetails() {
    const row = rowOf(drawn, select.value);
    if (!row) return;
    blurb.textContent = row.blurb || '';
    shape.textContent = !row.planned
      ? COPY.trip.planning
      : row.off ? row.reason || '' : row.failed ? '' : shapeLine(row.count, row.estimateMs);
    start.dataset.trip = row.id;
    start.disabled = !!row.off;
    details.classList.toggle('is-off', !!row.off);
  }

  function repaint() {
    paintOptions();
    // The initial selection is the first trip that can run. Until the visitor has chosen, a
    // selection a plan just marked off moves on to the first offerable one, so the panel does
    // not open on a greyed trip when one that runs is a line below it.
    if (!touched) {
      const now = rowOf(drawn, select.value);
      if (now && now.off) {
        const better = firstId(drawn, true);
        if (better) select.value = better;
      }
    }
    paintDetails();
  }

  /**
   * Resolve every trip once the layers have landed, and print what is actually on offer. The
   * counts are the one thing in this panel that must not be a guess, so nothing is stated before.
   * A plan that throws leaves its trip choosable with no shape line: trip.start() resolves it
   * again and says why if it cannot run.
   */
  function plan() {
    for (const tour of tours) {
      Promise.resolve(trip.plan(tour.id))
        .then((p) => {
          if (!alive || !p) return;
          plans.set(tour.id, p);
          repaint();
        })
        .catch(() => {
          if (!alive) return;
          plans.set(tour.id, { offerable: true, failed: true });
          repaint();
        });
    }
  }

  select.addEventListener('change', () => {
    touched = true;
    paintDetails();
  });
  start.addEventListener('click', () => {
    try {
      trip.start(select.value);
    } catch {
      /* the panel stays as it was rather than dying with it */
    }
  });
  const onReady = () => plan();
  window.addEventListener('sr:layers-ready', onReady, { once: true });

  repaint();

  return {
    root,
    plan,
    destroy() {
      alive = false;
      window.removeEventListener('sr:layers-ready', onReady);
      root.remove();
    },
  };
}
