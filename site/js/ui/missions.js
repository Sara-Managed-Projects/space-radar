// ui/missions.js -- a mission as a place in time (public #452, internal #269).
//
// Contract: mountMission(host, record, ctx) -> boolean (whether this record has a mission)
//           openEvent(ctx, id) -> boolean       the deep link `#event=<mission>.<event>`
//           install(ctx)                         once: keeps the `event` key honest as the selection changes
// Also exported, pure, for tests/test_missions.mjs:
//   MISSIONS, missionOf(recordId), findEvent(id) -> {mission, event, index} | null, eventId(mission, event),
//   eventMs(event), nearestIndex(mission, tMs), placement(event, record, tMs, propagate) -> {kind, moves},
//   cruiseKnot(samples, tMs) -> a sample | null, eventWhen(event), eventNote(mission, event, place)
//
// WHY. NASA's Eyes lets you stand at Voyager's Neptune flyby; here Voyager was a model at the
// live clock, often on the night side of nothing. A mission's card now lists its dated events
// (registry/missions.yaml, a source on every mission and the dates read there) with Prev and
// Next. Choosing one sets the clock to that moment and frames the craft, and the address bar
// carries `#event=apollo-11.landing`, so any moment of a mission is a link.
//
// WHAT THE MAP CAN AND CANNOT SHOW IS SAID, NOT HIDDEN. The registry marks each event:
//   site    a landing site: it is where it is on any date, and the Moon and Mars are worked out
//           for any date. The clock moves and the camera frames the site, in that day's light.
//   cruise  a craft coasting out of the Solar System. If the map holds a path for that date it
//           is used; if not, the craft is drawn on the straight line back from its measured
//           position today (cruiseKnot), which the note says, with how good that is.
//   none    the map has no path for the craft on that date: we have no ephemeris of our own yet
//           (internal #277). The event is told, THE CLOCK DOES NOT MOVE, and the note says why.
//           Where the event happened at a world the map draws for any date, the card offers
//           that world on that day instead, which is true: the planet and its moons were there.
//
// Nothing here is in the first visit: main.js imports this file the first time a card opens.

import { COPY, t, timeText } from '../copy/en.js';
import { MISSIONS } from '../data/missions.js';
import { propagate as propagateRecord } from '../propagate/index.js';
import { write as writeUrl, read as readUrl } from './urlstate.js';

export { MISSIONS };

const DAY_MS = 86400e3;
/** A `cruise` knot is laid this far before the event, so the hour around it is on the line too. */
const KNOT_LEAD_MS = 30 * DAY_MS;

export function missionOf(recordId) {
  return MISSIONS.find((m) => m.record === recordId) || null;
}

export function eventId(mission, event) {
  return `${mission.id}.${event.id}`;
}

/** `voyager-1.jupiter` -> {mission, event, index}; anything else -> null. */
export function findEvent(id) {
  const text = String(id || '');
  const dot = text.indexOf('.');
  if (dot < 1) return null;
  const mission = MISSIONS.find((m) => m.id === text.slice(0, dot));
  if (!mission) return null;
  const index = mission.events.findIndex((e) => e.id === text.slice(dot + 1));
  return index < 0 ? null : { mission, event: mission.events[index], index };
}

/** The instant of an event: its own time, or noon UTC of a day given without one. */
export function eventMs(event) {
  const d = String((event && event.date) || '');
  return Date.parse(/T/.test(d) ? d : `${d}T12:00:00Z`);
}

/** The last event at or before `tMs`, or the first when the clock is before them all. */
export function nearestIndex(mission, tMs) {
  let at = 0;
  mission.events.forEach((e, i) => { if (eventMs(e) <= tMs) at = i; });
  return at;
}

/**
 * A knot for a coasting craft at `tMs`, on the straight line through the sample nearest in time,
 * at that sample's velocity. Null when the samples have no velocity to go by. Pure.
 */
export function cruiseKnot(samples, tMs) {
  if (!Array.isArray(samples) || !samples.length || !Number.isFinite(tMs)) return null;
  const flat = samples.map((s) => (Array.isArray(s.rKm)
    ? { tMs: s.tMs, x: s.rKm[0], y: s.rKm[1], z: s.rKm[2], vx: (s.vKmS || [])[0], vy: (s.vKmS || [])[1], vz: (s.vKmS || [])[2] }
    : s)).filter((s) => [s.tMs, s.x, s.y, s.z, s.vx, s.vy, s.vz].every(Number.isFinite));
  if (!flat.length) return null;
  const near = flat.reduce((a, b) => (Math.abs(b.tMs - tMs) < Math.abs(a.tMs - tMs) ? b : a));
  const dt = (tMs - near.tMs) / 1000;
  return { tMs, x: near.x + near.vx * dt, y: near.y + near.vy * dt, z: near.z + near.vz * dt, vx: near.vx, vy: near.vy, vz: near.vz };
}

/**
 * Can the map show this event's subject at its moment? `{kind, moves}`:
 *   site    yes, a place on a world                         moves the clock
 *   path    yes, the map holds a path covering that date    moves the clock
 *   cruise  yes, on the straight line back (see above)      moves the clock
 *   none    no                                              the clock stays
 * `propagate` is propagate/index.js's, passed in so a test can hold it.
 */
export function placement(event, record, tMs, propagate = propagateRecord) {
  const no = { kind: 'none', moves: false };
  if (!event || !record || !Number.isFinite(tMs)) return no;
  if (event.place === 'site') return { kind: 'site', moves: true };
  if (event.place !== 'cruise') return no;
  let at = null;
  try { at = propagate(record, tMs); } catch { at = null; }
  if (at) return { kind: 'path', moves: true };
  return record.propagator === 'sampled' && cruiseKnot(record.samples, tMs) ? { kind: 'cruise', moves: true } : no;
}

/** Give a coasting craft a knot before `tMs` so the sampled propagator answers there. */
function layCruise(record, tMs) {
  const knot = cruiseKnot(record.samples, tMs - KNOT_LEAD_MS);
  if (!knot) return false;
  // A new array: propagate/sampled.js caches what it has sorted by the array's identity.
  record.samples = [knot, ...record.samples];
  return true;
}

/** "5 March 1979, 12:05 UTC", or the date alone for an event known to the day. */
export function eventWhen(event) {
  const ms = eventMs(event);
  const date = timeText.utcLong(ms);
  return event.precision === 'day' ? date : t(COPY.mission.when, { date, time: timeText.utcHm(ms) });
}

/** The honesty line under an event: what the map did with the clock, and why. */
export function eventNote(mission, event, place, worldName) {
  const M = COPY.mission;
  if (place.kind === 'site') return M.noteSite;
  if (place.kind === 'path') return M.notePath;
  if (place.kind === 'cruise') return t(M.noteCruise, { name: mission.display });
  return worldName ? t(M.noteNoneWorld, { name: mission.display }) : t(M.noteNone, { name: mission.display });
}

// ------------------------------------------------------------------------------------------ the card

/** Which event each mission's card is showing, and which the clock was last put at. */
const shown = new Map();
let applied = null; // the event id the clock was last moved to
const listOpen = new Set();

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function button(className, text, focusKey) {
  const b = el('button', className, text);
  b.type = 'button';
  if (focusKey) b.dataset.focus = focusKey;
  return b;
}

function worldRecord(ctx, event) {
  if (!event.world || event.world === 'earth' || typeof ctx.recordById !== 'function') return null;
  return ctx.recordById(event.world);
}

/** Go to an event: the clock and the camera when the map can show it; the words either way. */
function choose(ctx, mission, index, record) {
  const event = mission.events[index];
  const id = eventId(mission, event);
  const tMs = eventMs(event);
  shown.set(mission.id, index);
  writeUrl({ event: id });
  const place = placement(event, record, tMs);
  if (place.moves) {
    if (typeof ctx.rememberView === 'function') ctx.rememberView();
    if (place.kind === 'cruise') layCruise(record, tMs);
    applied = id;
    ctx.clock.goTo(tMs);
    // The flight starts once the scene stands at that moment (main.js afterClockJump says why).
    const fly = () => {
      if (typeof ctx.selected === 'function' && ctx.selected() === record) { if (typeof ctx.flyToRecord === 'function') ctx.flyToRecord(record); }
      else ctx.select(record, { undo: false });
      if (typeof ctx.offerUndo === 'function') ctx.offerUndo(timeText.utcLong(tMs));
    };
    if (typeof ctx.selected === 'function' && ctx.selected() !== record) ctx.select(record, { undo: false, fly: false });
    if (typeof ctx.afterClockJump === 'function') ctx.afterClockJump(fly); else fly();
  } else {
    applied = null;
    // The card is repainted by the clock when it moves; here it has not, so ask for it.
    if (typeof ctx.refreshCard === 'function') ctx.refreshCard();
  }
}

/** A `none` event that happened at a world: that world, on that day. The craft is not drawn. */
function seeWorld(ctx, event, world) {
  if (typeof ctx.rememberView === 'function') ctx.rememberView();
  applied = null;
  ctx.clock.goTo(eventMs(event));
  const go = () => ctx.select(world, { remembered: true });
  if (typeof ctx.afterClockJump === 'function') ctx.afterClockJump(go); else go();
}

export function mountMission(host, record, ctx) {
  const mission = record ? missionOf(record.id) : null;
  if (!host) return false;
  host.hidden = !mission;
  while (host.firstChild) host.removeChild(host.firstChild);
  if (!mission) return false;
  const M = COPY.mission;
  const now = ctx.clock.now();
  if (!shown.has(mission.id)) shown.set(mission.id, nearestIndex(mission, now));
  const index = Math.min(mission.events.length - 1, Math.max(0, shown.get(mission.id)));
  const event = mission.events[index];
  const id = eventId(mission, event);
  const tMs = eventMs(event);
  const place = placement(event, record, tMs);
  // "The clock is here" only while it is: within an hour (a day for an event known to the day).
  const slack = event.precision === 'day' ? DAY_MS : 3600e3;
  const here = applied === id && ctx.clock.mode !== 'live' && Math.abs(now - tMs) <= slack;
  const world = place.moves ? null : worldRecord(ctx, event);

  host.className = 'sr-card__mission sr-mission';
  const head = el('div', 'sr-mission__head');
  head.appendChild(el('h3', 'sr-micro', M.title));
  head.appendChild(el('span', 'sr-mission__count', t(M.count, { i: index + 1, n: mission.events.length })));
  host.appendChild(head);

  const nav = el('div', 'sr-mission__nav');
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', t(M.navLabel, { name: mission.display }));
  const prev = button('sr-mission__step', COPY.timePill.prev, 'mission-prev');
  prev.title = M.prev;
  prev.setAttribute('aria-label', M.prev);
  prev.disabled = index === 0;
  prev.addEventListener('click', () => choose(ctx, mission, index - 1, record));
  const next = button('sr-mission__step', COPY.timePill.next, 'mission-next');
  next.title = M.next;
  next.setAttribute('aria-label', M.next);
  next.disabled = index === mission.events.length - 1;
  next.addEventListener('click', () => choose(ctx, mission, index + 1, record));
  const what = el('div', 'sr-mission__what');
  what.appendChild(el('p', 'sr-mission__when', eventWhen(event)));
  what.appendChild(el('p', 'sr-mission__title', event.title));
  nav.append(prev, what, next);
  host.appendChild(nav);

  host.appendChild(el('p', 'sr-mission__text', event.text));
  const note = el('p', 'sr-mission__note', here ? M.here : eventNote(mission, event, place, world && world.name));
  if (here) note.classList.add('is-here');
  host.appendChild(note);
  // On the straight line, the clock being there does not make the place measured: say both.
  if (here && place.kind === 'cruise') host.appendChild(el('p', 'sr-mission__note', eventNote(mission, event, place)));

  const acts = el('div', 'sr-mission__acts');
  if (place.moves && !here) {
    const go = button('sr-btn sr-btn--quiet sr-mission__go', M.go, 'mission-go');
    go.title = M.goTitle;
    go.addEventListener('click', () => choose(ctx, mission, index, record));
    acts.appendChild(go);
  }
  if (world) {
    const see = button('sr-btn sr-btn--quiet sr-mission__go', t(M.seeWorld, { world: world.name }), 'mission-world');
    see.title = t(M.seeWorldTitle, { world: world.name, name: mission.display });
    see.addEventListener('click', () => seeWorld(ctx, event, world));
    acts.appendChild(see);
  }
  if (acts.firstChild) host.appendChild(acts);

  // Every event, in place: a list of buttons, the shown one marked.
  const open = listOpen.has(mission.id);
  const all = button('sr-more', open ? M.fewer : t(M.all, { n: mission.events.length }), 'mission-all');
  all.setAttribute('aria-expanded', open ? 'true' : 'false');
  const list = el('ol', 'sr-mission__list');
  list.hidden = !open;
  list.id = 'sr-mission-list';
  all.setAttribute('aria-controls', list.id);
  all.addEventListener('click', () => {
    if (listOpen.has(mission.id)) listOpen.delete(mission.id); else listOpen.add(mission.id);
    mountMission(host, record, ctx);
    const again = host.querySelector('[data-focus="mission-all"]');
    if (again) again.focus({ preventScroll: true });
  });
  mission.events.forEach((e, i) => {
    const li = el('li', 'sr-mission__row');
    const b = button('sr-mission__event', null, `mission-ev-${e.id}`);
    b.appendChild(el('span', 'sr-mission__event-when', timeText.utcLong(eventMs(e))));
    b.appendChild(el('span', 'sr-mission__event-title', e.title));
    if (i === index) b.setAttribute('aria-current', 'true');
    b.addEventListener('click', () => choose(ctx, mission, i, record));
    li.appendChild(b);
    list.appendChild(li);
  });
  host.append(all, list);

  const src = el('p', 'sr-mission__source');
  src.appendChild(document.createTextNode(M.source));
  // The page this event was read on: its own where it names one, else the mission's.
  const source = event.source || mission.source;
  const a = el('a', 'sr-mission__link', source.name);
  a.href = source.url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  src.appendChild(a);
  host.appendChild(src);
  return true;
}

/**
 * The deep link: select the mission's record, show the event, and go there when the map can.
 * Returns false when the id names nothing, or the record is not on this map (the caller says so).
 */
export function openEvent(ctx, id) {
  const found = findEvent(id);
  if (!found) return false;
  const record = typeof ctx.recordById === 'function' ? ctx.recordById(found.mission.record) : null;
  if (!record) return false;
  if (record.layer && typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(record.layer) && typeof ctx.setLayerOn === 'function') {
    ctx.setLayerOn(record.layer, true);
    document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: record.layer, on: true, handled: true, from: 'link' } }));
  }
  shown.set(found.mission.id, found.index);
  const place = placement(found.event, record, eventMs(found.event));
  if (!place.moves) ctx.select(record, { undo: false });
  choose(ctx, found.mission, found.index, record);
  return true;
}

let installed = false;
/** The `event` key belongs to the selection: it leaves the address bar when the selection does. */
export function install(ctx) {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('sr:select', (e) => {
    const key = readUrl().event;
    if (!key) return;
    const found = findEvent(key);
    const rec = e && e.detail;
    if (!found || !rec || rec.id !== found.mission.record) writeUrl({ event: null });
  });
  // Live again: the clock is no longer at any event.
  if (ctx && ctx.clock && typeof ctx.clock.onChange === 'function') {
    ctx.clock.onChange((c) => { if (c.mode === 'live') applied = null; });
  }
}
