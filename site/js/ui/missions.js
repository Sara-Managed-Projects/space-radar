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
//   path    the map holds a file of the craft's own path, from JPL Horizons, covering that date
//           (propagate/ephemeris.js, registry/ephemerides.yaml). The file is fetched, the clock
//           moves, the map goes to the world the craft was passing and frames the two together,
//           and the note says how closely the file follows JPL's track. `path_at` is where the
//           clock goes when that is not the event's own instant: a launch (JPL's track begins some
//           minutes after liftoff) and a flyby dated to the day (the closest pass in the track).
//   none    the map has no path for the craft on that date. The event is told, THE CLOCK DOES
//           NOT MOVE, and the note says why.
//           Where the event happened at a world the map draws for any date, the card offers
//           that world on that day instead, which is true: the planet and its moons were there.
//
// Nothing here is in the first visit: main.js imports this file the first time a card opens.

import { COPY, t, timeText, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { MISSIONS } from '../data/missions.js';
import { propagate as propagateRecord } from '../propagate/index.js';
import { covers, ensure, indexOf, loaded, stateAt } from '../propagate/ephemeris.js';
import { worldRadiusKm } from '../propagate/frames.js';
import { write as writeUrl, read as readUrl } from './urlstate.js';

export { MISSIONS };

const DAY_MS = 86400e3;
/** A `cruise` knot is laid this far before the event, so the hour around it is on the line too. */
const KNOT_LEAD_MS = 30 * DAY_MS;

export function missionOf(recordId) {
  return MISSIONS.find((m) => m.record === recordId || (m.path_record && m.path_record === recordId)) || null;
}

/**
 * The id of the record an event is shown on: the mission's own, or its `path_record` for an event
 * drawn from a path file (Perseverance's launch is Mars 2020's cruise; its landing is the site).
 */
export function subjectId(mission, event) {
  return event && event.place === 'path' && mission.path_record ? mission.path_record : mission.record;
}

/** That record, turning its layer on if it is off (as a link to an event does). Null if the map has none. */
function subjectOf(ctx, mission, event, fallback) {
  const id = subjectId(mission, event);
  if (fallback && fallback.id === id) return fallback;
  const record = typeof ctx.recordById === 'function' ? ctx.recordById(id) : null;
  if (record) showLayer(ctx, record);
  return record;
}

function showLayer(ctx, record) {
  if (record.layer && typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(record.layer) && typeof ctx.setLayerOn === 'function') {
    ctx.setLayerOn(record.layer, true);
    document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: record.layer, on: true, handled: true, from: 'link' } }));
  }
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

/**
 * Where the clock goes for an event: its own instant, or `path_at` (registry/missions.yaml): the
 * first minute of JPL's track for a launch, the closest pass in that track for a flyby NASA dates
 * to the day.
 */
export function eventClockMs(event) {
  const from = event && event.path_at ? Date.parse(event.path_at) : NaN;
  return Number.isFinite(from) ? from : eventMs(event);
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
  // The craft's own file, by its index: the registry may say `path` only where the file spans the
  // date (scripts/build_ephemerides.py --check refuses otherwise), and this asks again.
  if (event.place === 'path') return covers(record.id, eventClockMs(event)) ? { kind: 'path', moves: true } : no;
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
  if (place.kind === 'path') {
    const row = indexOf(mission.record);
    if (!row) return M.notePath;
    const E = COPY.ephemeris;
    const km = fmt.int(row.goodToKm);
    if (!event.path_at) return t(E.note, { km });
    // A day with no time on NASA's page: the clock goes to the closest pass in JPL's track.
    if (event.precision === 'day') return t(E.noteDay, { time: timeText.utcHm(eventClockMs(event)), km });
    return t(E.noteLate, { n: fmt.int(Math.round((eventClockMs(event) - eventMs(event)) / 60e3)), km });
  }
  if (place.kind === 'cruise') return t(M.noteCruise, { name: mission.display });
  return worldName ? t(M.noteNoneWorld, { name: mission.display }) : t(M.noteNone, { name: mission.display });
}

// ------------------------------------------------------------------------------------------ the card

/** Which event each mission's card is showing, and which the clock was last put at. */
const shown = new Map();
let applied = null; // the event id the clock was last moved to
const listOpen = new Set();
/** Events whose path file did not load when asked: the note says so, and choosing again retries. */
const failed = new Set();
let asked = 0;

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
function choose(ctx, mission, index, cardRecord) {
  const event = mission.events[index];
  const id = eventId(mission, event);
  const tMs = eventMs(event);
  shown.set(mission.id, index);
  // The record this event is shown on, which for a mission with a `path_record` is not always
  // the one whose card was open.
  const record = subjectOf(ctx, mission, event, cardRecord) || cardRecord;
  const place = placement(event, record, tMs);
  if (record !== cardRecord && !place.moves) ctx.select(record, { undo: false });
  writeUrl({ event: id });
  if (place.kind === 'path') {
    // The file first: the clock does not move until the map can show the craft there.
    failed.delete(id);
    const mine = ++asked;
    ensure(record.id).then((eph) => {
      if (mine !== asked) return; // a later choice has been made while this one was fetching
      if (!eph) {
        failed.add(id);
        applied = null;
        if (typeof ctx.refreshCard === 'function') ctx.refreshCard();
        return;
      }
      goToPath(ctx, record, eph, id, eventClockMs(event));
    });
    return;
  }
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

/**
 * Which stage an instant of a craft's path is seen from. Round a world, that world's own stage:
 * there the world is at its true size and the craft exactly as far from it as JPL has it (on the
 * Earth's stage a planet is drawn nearer and larger than it is, and the craft would be nowhere
 * near the disc). Round the Sun, the stage stays if it is the Earth's or the Sun's, and another
 * world's stage gives way to the Sun's. Pure.
 */
export function stageForPath(centre, stageNow) {
  if (centre && centre !== 'sun') return centre;
  return stageNow === 'earth' || stageNow === 'sun' ? stageNow : 'sun';
}

/**
 * How far behind the craft the camera stands so the world it is passing is in the picture: the
 * rig arrives beyond its subject looking back at the stage's world, so the world sits behind the
 * craft. `d` is the craft's distance from the world's centre and `R` the world's radius, in the
 * same unit. Four radii from the world at least (a disc under half the frame's height), and never
 * closer to the craft than three fifths of its own distance from the world. Pure.
 */
export function withWorldDistance(d, R) {
  if (!(d > 0) || !(R > 0)) return NaN;
  return Math.max(4 * R - d, 0.6 * d);
}

/**
 * Radians off the line from the world through the craft that the camera stands: the rig's own 0.6
 * suits a satellite over a limb and here put Jupiter half out of the top of the frame (seen
 * 2026-10-06). At 0.3 the world's disc sits beside the craft, its centre about eleven degrees off.
 */
const WITH_WORLD_TILT = 0.3;

/** Set the clock to a moment of the craft's own path, go to the world it was at, frame the two. */
function goToPath(ctx, record, eph, id, tMs) {
  if (typeof ctx.rememberView === 'function') ctx.rememberView();
  applied = id;
  ctx.clock.goTo(tMs);
  const st = stateAt(eph, tMs);
  const centre = st ? st.centre : 'sun';
  const stageId = stageForPath(centre, ctx.stage ? ctx.stage.worldId : 'earth');
  if (typeof ctx.selected === 'function' && ctx.selected() !== record) ctx.select(record, { undo: false, fly: false });
  if (typeof ctx.setStage === 'function' && ctx.stage && ctx.stage.worldId !== stageId) ctx.setStage(stageId);
  const fly = () => {
    if (typeof ctx.selected === 'function' && ctx.selected() !== record) ctx.select(record, { undo: false, fly: false });
    const at = centre !== 'sun' && centre !== 'earth' && typeof ctx.positionOfRecord === 'function' ? ctx.positionOfRecord(record) : null;
    const R = worldRadiusKm(centre) / (ctx.stage ? ctx.stage.unitKm : 1);
    const distance = at ? withWorldDistance(Math.hypot(at.x, at.y, at.z), R) : NaN;
    if (at && distance > 0 && ctx.cameraRig) {
      ctx.cameraRig.flyTo({ targetScene: at, distance, tilt: WITH_WORLD_TILT, ms: 900 });
      ctx.cameraRig.follow(() => ctx.positionOfRecord(record));
    } else if (typeof ctx.flyToRecord === 'function') ctx.flyToRecord(record);
    if (typeof ctx.offerUndo === 'function') ctx.offerUndo(timeText.utcLong(tMs));
    if (typeof ctx.refreshCard === 'function') ctx.refreshCard();
  };
  if (typeof ctx.afterClockJump === 'function') ctx.afterClockJump(fly); else fly();
}

/** A `none` event that happened at a world: that world, on that day. The craft is not drawn. */
function seeWorld(ctx, event, world) {
  if (typeof ctx.rememberView === 'function') ctx.rememberView();
  applied = null;
  ctx.clock.goTo(eventMs(event));
  const go = () => ctx.select(world, { remembered: true });
  if (typeof ctx.afterClockJump === 'function') ctx.afterClockJump(go); else go();
}

/**
 * What the card says of a craft drawn from its own file at `tMs`, or null when it is not (no
 * file here yet, or the clock outside its span). Up to two sentences: how closely the file
 * follows JPL's track, and what JPL's own header says of that track where it is rough or a plan.
 * Pure but for `loaded`, which a test fills through ensure().
 */
export function pathWords(recordId, tMs) {
  const row = indexOf(recordId);
  if (!row || !loaded(recordId) || !covers(recordId, tMs)) return null;
  const out = [t(COPY.ephemeris.drawn, { km: fmt.int(row.goodToKm) })];
  if (row.rough && tMs < Date.parse(row.rough.until)) out.push(row.rough.text);
  return out;
}

let pathImport = null;
/** The thin line of the craft's path so far (scene/ephpath.js), fetched with the first file. */
function showPath(ctx, record, eph) {
  if (!ctx.scene || !ctx.stage) return;
  if (!pathImport) {
    pathImport = import('../scene/ephpath.js').then((m) => { ctx.ephPath = m.createEphPath(ctx.scene, ctx.stage); return ctx.ephPath; })
      .catch((e) => { pathImport = null; console.warn('the path line did not load', e); return null; });
  }
  pathImport.then((line) => { if (line && typeof ctx.selected === 'function' && ctx.selected() === record) line.set(eph, record.klass); });
}

/** A record with a file: fetch it when its card opens, then draw from it and say so. */
function wantPath(ctx, record) {
  const here = loaded(record.id);
  if (here) { showPath(ctx, record, here); return; }
  ensure(record.id).then((eph) => {
    if (!eph || typeof ctx.selected !== 'function' || ctx.selected() !== record) return;
    showPath(ctx, record, eph);
    if (typeof ctx.refreshCard === 'function') ctx.refreshCard();
  });
}

function appendPathWords(host, record, now) {
  const words = pathWords(record.id, now);
  if (!words) return false;
  for (const w of words) host.appendChild(el('p', 'sr-mission__note sr-mission__path', w));
  return true;
}

export function mountMission(host, record, ctx) {
  const mission = record ? missionOf(record.id) : null;
  const file = record ? indexOf(record.id) : null;
  if (!host) return false;
  host.hidden = !mission;
  while (host.firstChild) host.removeChild(host.firstChild);
  if (file) wantPath(ctx, record);
  if (!mission) {
    // No event list, but its own path (Apophis, OSIRIS-APEX): the card still says what is drawn.
    if (file) {
      host.className = 'sr-card__mission sr-mission';
      host.hidden = !appendPathWords(host, record, ctx.clock.now());
    }
    return false;
  }
  const M = COPY.mission;
  const now = ctx.clock.now();
  if (!shown.has(mission.id)) shown.set(mission.id, nearestIndex(mission, now));
  const index = Math.min(mission.events.length - 1, Math.max(0, shown.get(mission.id)));
  const event = mission.events[index];
  const id = eventId(mission, event);
  const tMs = eventClockMs(event);
  const subject = subjectId(mission, event) === record.id ? record : (typeof ctx.recordById === 'function' ? ctx.recordById(subjectId(mission, event)) : null) || record;
  const place = placement(event, subject, eventMs(event));
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
  const note = el('p', 'sr-mission__note', here ? M.here : failed.has(id) ? COPY.ephemeris.failed : eventNote(mission, event, place, world && world.name));
  if (here) note.classList.add('is-here');
  host.appendChild(note);
  // Drawn from its own file at the clock's time: how closely, and what JPL says of the track.
  appendPathWords(host, record, now);
  // On the straight line, the clock being there does not make the place measured: say both. And
  // where the clock went to a moment that is not the event's own (`path_at`), say which.
  if (here && (place.kind === 'cruise' || event.path_at)) host.appendChild(el('p', 'sr-mission__note', eventNote(mission, event, place)));

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
  const record = subjectOf(ctx, found.mission, found.event, null);
  if (!record) return false;
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
    if (!found || !rec || (rec.id !== found.mission.record && rec.id !== found.mission.path_record)) writeUrl({ event: null });
  });
  // The line of a craft's path belongs to the selection too.
  window.addEventListener('sr:select', (e) => {
    const rec = e && e.detail;
    if (ctx.ephPath && (!rec || !loaded(rec.id))) ctx.ephPath.set(null);
  });
  // Live again: the clock is no longer at any event.
  if (ctx && ctx.clock && typeof ctx.clock.onChange === 'function') {
    ctx.clock.onChange((c) => { if (c.mode === 'live') applied = null; });
  }
}
