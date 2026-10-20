// ui/camundo.js -- "the view moved, and here is the way back" (internal #274).
//
// Contract: offerUndo(ctx, { name, undo, ms }) -> the toast's node, or null
// Also exported, pure, for tests/test_camundo.mjs:
//   undoWords(name) -> the toast's line;  sameView(a, b) -> whether an undo would change anything
//
// WHY. Choosing a search result, a row of Coming up, a tab, a mark on the timeline or an event of a
// mission moves the camera for you, often across the Solar System, and sometimes moves the clock
// with it. NASA's Eyes says so each time ("Camera is following Saturn · Undo"), and the way back is
// one tap. Here it is the toast (docs/ui-guide.md §3.14): one line, one text action, gone in six
// seconds, held while the pointer or the focus is on it, and Escape puts it away. It is never the
// only way back: the tab, the card's close and Live are all still there.
//
// main.js takes the picture of the view before the move (ctx.rememberView) and knows how to put
// it back (the `undo` it hands over); this file is only the offer. Fetched the first time a view
// moves, so it is not a first visit's cost.

import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';
import { toast } from './share.js';

export const UNDO_MS = 6000;
let serial = 0;

/** The toast's line. A name too long for one line is cut at a word, with an ellipsis. */
export function undoWords(name, night = false) {
  const U = COPY.undo;
  let n = String(name || '').trim();
  if (!n) return U.movedNowhere;
  if ([...n].length > 34) n = `${[...n].slice(0, 33).join('').replace(/\s+\S*$/, '')}${COPY.punctuation.ellipsis}`;
  // A place on the night side is shown from the whole Earth's distance (internal #420, main.js
  // flyToRecord): the line says so, because the camera is not where "moved to" would have it.
  return t(night ? U.night : U.moved, { name: n });
}

/** The same line with no way back: the visitor pointed at the place themselves. */
export function sayNight(name) {
  const node = toast(undoWords(name, true), UNDO_MS);
  if (node) delete node.dataset.undo;
  return node;
}

/** Are two pictures of the view the same place? Then there is nothing to go back to. */
export function sameView(a, b) {
  if (!a || !b) return false;
  const idOf = (r) => (r ? r.id : null);
  return a.stage === b.stage && a.moment === b.moment && idOf(a.selected) === idOf(b.selected)
    && (!a.clock || !b.clock || (a.clock.mode === b.clock.mode && (a.clock.mode === 'live' || Math.abs(a.clock.t - b.clock.t) < 60e3)));
}

export function offerUndo(ctx, opts = {}) {
  if (typeof document === 'undefined' || typeof opts.undo !== 'function') return null;
  const U = COPY.undo;
  const node = toast(undoWords(opts.name, opts.night === true), 0);
  if (!node) return null;
  // The controls hint stands clear of this toast as it does of the pill (ui/keyhint.js place();
  // internal #419 item 3). Said from here, not from toast(): ui/share.js loads with every card
  // and is held under 6 kB.
  window.dispatchEvent(new CustomEvent('sr:toast'));
  const mine = String(serial += 1);
  node.dataset.undo = mine;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sr-toast__action';
  button.textContent = U.back;
  node.appendChild(button);

  let timer = 0;
  const still = () => node.isConnected && node.dataset.undo === mine;
  const close = () => {
    clearTimeout(timer);
    node.removeEventListener('pointerenter', hold);
    node.removeEventListener('pointerleave', run);
    node.removeEventListener('focusin', hold);
    node.removeEventListener('focusout', run);
    node.removeEventListener('keydown', onKey);
    document.removeEventListener('input', onType, true);
    if (!still()) return; // another toast has the node now: it is not ours to hide
    delete node.dataset.undo;
    node.hidden = true;
  };
  function hold() { clearTimeout(timer); }
  function run() { clearTimeout(timer); timer = setTimeout(close, Number.isFinite(opts.ms) ? opts.ms : UNDO_MS); }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  node.addEventListener('pointerenter', hold);
  node.addEventListener('pointerleave', run);
  node.addEventListener('focusin', hold);
  node.addEventListener('focusout', run);
  node.addEventListener('keydown', onKey);
  // Typing in the search field means the visitor has moved on: on a phone the offer would sit on
  // a search row for its six seconds, so it gives way.
  function onType(e) { if (e.target && e.target.closest && e.target.closest('.sr-search__input')) close(); }
  document.addEventListener('input', onType, true);
  button.addEventListener('click', () => {
    close();
    try { opts.undo(); } catch (e) { console.warn('the view could not be put back', e); }
    toast(U.done);
  });
  run();
  return node;
}

// ---------------------------------------------------------------------------------------------
// THE WAY BACK, KEPT (internal spec 0076 W3-d; internal #883, the package's SR-PLAN-115).
//
// Contract: noteSelection(record, ctx, nameOf) -> whether a step was kept;  noteHidden(ctx);
//   wireTrail(ctx);  goBack(ctx) -> whether there was a step;  trailState() -> { size, top }
// Pure, for tests/test_navigate.mjs: pushStep(steps, entry, max), sameStep(a, b), TRAIL_MAX.
//
// The toast above offers ONE way back for six seconds. The visitor's own path is longer than that:
// a search to Jupiter, a tap on Europa, a star from the Next list. Each place the card has stood on
// is a step here, newest last, at most TRAIL_MAX of them, and Back (ui/scalerail.js) walks them in
// reverse: camera, stage, selection and clock as they were, as the toast's undo puts them.
//
// KEPT FOR THE SESSION ONLY, NEVER SENT. A plain array in this module: no storage, no URL, no
// request. A reload starts with no steps, as a first visit does.
//
// HOW A STEP IS TAKEN, without a hook in main.js (the brief: a hook a stage does not own is asked
// for, not taken). ui/cards.js showCard() calls noteSelection() synchronously inside main.js
// select(), before the flight starts, so on the same stage the camera is still where the visitor
// left it. A selection that changes the stage has moved the camera already by then, so the view is
// also sampled every SAMPLE_MS while nothing flies (the camera at rest, no climb, no trip, no
// drift): the last sample taken after the previous step is the place to come back to. When there is
// none (a selection made mid-flight) the step keeps the record alone and Back flies to it.
// ---------------------------------------------------------------------------------------------

/** At least ten steps (internal spec 0076 W3-d acceptance); twenty, so a long evening still has its start. */
export const TRAIL_MAX = 20;
const SAMPLE_MS = 250;
const RESTORE_MS = 600;
const trail = { steps: [], current: undefined, last: null, ctx: null, timer: 0, restoring: false };

const idOf = (r) => (r && r.id !== undefined ? String(r.id) : null);
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Two steps are one place: the same thing chosen on the same stage. Pure. */
export function sameStep(a, b) {
  return !!a && !!b && idOf(a.selected) === idOf(b.selected) && a.stage === b.stage;
}

/** Keep `entry` as the newest step; the same place twice in a row is kept once; the oldest go past `max`. Pure. */
export function pushStep(steps, entry, max = TRAIL_MAX) {
  if (!entry) return steps;
  const top = steps[steps.length - 1];
  if (top && sameStep(top, entry)) steps[steps.length - 1] = entry;
  else steps.push(entry);
  while (steps.length > max) steps.shift();
  return steps;
}

function busy() {
  if (typeof document === 'undefined') return false;
  const cls = document.documentElement.classList;
  // A trip's stops and the drift choose for the visitor: neither is the visitor's own path.
  return cls.contains('sr-trip-mode') || cls.contains('sr-ambient');
}

function quiet(ctx) {
  const rig = ctx.cameraRig;
  if (rig && rig.state && rig.state.flying) return false;
  if (ctx.climb && ctx.climb.state && ctx.climb.state.active) return false;
  return !busy();
}

function clockOf(ctx) {
  const c = ctx.clock;
  return c && typeof c.now === 'function' ? { mode: c.mode, t: c.now(), rate: c.rate } : null;
}

function viewOf(ctx, selected, name) {
  return {
    selected: selected || null,
    name: name || null,
    stage: ctx.stage ? ctx.stage.worldId : null,
    moment: ctx.moment,
    clock: clockOf(ctx),
    rig: ctx.cameraRig && typeof ctx.cameraRig.saveState === 'function' ? ctx.cameraRig.saveState() : null,
    at: nowMs(),
  };
}

function changed() {
  if (typeof window === 'undefined' || !window.dispatchEvent) return;
  window.dispatchEvent(new CustomEvent('sr:trail', { detail: trailState() }));
}

/** Start the sampler, once. Every module that is handed the app's ctx may call it (cards, the scale badge, the climb). */
export function wireTrail(ctx) {
  if (!ctx || trail.ctx) return;
  trail.ctx = ctx;
  if (typeof setInterval !== 'function') return;
  trail.timer = setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (trail.restoring || !quiet(ctx)) return;
    const cur = trail.current;
    // The card's place is on the stage it was chosen on: once a tab has moved the stage under it, a
    // sample would pair the thing with somewhere it is not, and the last true one is kept instead.
    if (cur && ctx.stage && cur.stage !== ctx.stage.worldId) return;
    trail.last = viewOf(ctx, cur ? cur.record : null, cur ? cur.name : null);
  }, SAMPLE_MS);
  // Under node (the tests paint cards) a sampler must not keep the process alive.
  if (trail.timer && typeof trail.timer.unref === 'function') trail.timer.unref();
}

/**
 * The card is about to show `record` (ui/cards.js showCard): if that is a new place, the place
 * before it becomes a step. `nameOf(record)` is the card's own name for it, kept for Back's words.
 */
export function noteSelection(record, ctx, nameOf = (r) => (r ? r.name : '')) {
  if (!ctx) return false;
  wireTrail(ctx);
  const was = trail.current;
  const name = record ? String(nameOf(record) || '') : null;
  if (trail.restoring || busy()) {
    trail.current = { record: record || null, name, stage: ctx.stage ? ctx.stage.worldId : null, at: nowMs() };
    return false;
  }
  if (was && idOf(was.record) === idOf(record)) return false; // a repaint of the same card
  const at = nowMs();
  const s = trail.last;
  let entry = null;
  if (s && (!was || (s.at >= was.at && idOf(s.selected) === idOf(was.record)))) entry = s;
  else if (!was) {
    // The first card of the visit, with nothing sampled yet: the view it left is the Earth's, as a
    // first visit opens on it (a deep link selects before anything is drawn and is not a place left).
    const rig = ctx.cameraRig;
    const still = rig && rig.state && !rig.state.flying && ctx.stage && ctx.stage.worldId === 'earth';
    entry = { ...viewOf(ctx, null, null), stage: 'earth', rig: still ? rig.saveState() : null };
  } else {
    entry = { selected: was.record, name: was.name, stage: was.stage, moment: undefined, clock: null, rig: null, at: was.at };
  }
  trail.current = { record: record || null, name, stage: ctx.stage ? ctx.stage.worldId : null, at };
  trail.last = null;
  pushStep(trail.steps, entry);
  changed();
  return true;
}

/** The card was put away: the place is now "nothing chosen" on this stage. */
export function noteHidden(ctx = trail.ctx) {
  if (!ctx || trail.restoring || busy()) return;
  const was = trail.current;
  if (was && !was.record) return;
  trail.current = { record: null, name: null, stage: ctx.stage ? ctx.stage.worldId : null, at: nowMs() };
}

function reduced() {
  try { return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch { return false; }
}

function restoreStep(ctx, e) {
  const clock = ctx.clock;
  if (e.clock && clock) {
    // As main.js restoreView: live comes back live; a shown time more than five minutes off is set again.
    if (e.clock.mode === 'live') { if (clock.mode !== 'live' && typeof clock.live === 'function') clock.live(); }
    else if (clock.mode === 'live' || Math.abs(clock.now() - e.clock.t) > 5 * 60e3) {
      if (typeof clock.goTo === 'function') clock.goTo(e.clock.t);
      if (typeof clock.setRate === 'function') clock.setRate(e.clock.rate);
    }
  }
  if (e.stage && ctx.stage && ctx.stage.worldId !== e.stage && typeof ctx.setStage === 'function') ctx.setStage(e.stage);
  if (e.moment !== undefined && ctx.moment !== e.moment && typeof ctx.setMoment === 'function') ctx.setMoment(e.moment);
  const again = e.selected && typeof ctx.recordById === 'function' ? ctx.recordById(String(e.selected.id)) || e.selected : e.selected;
  if (again && typeof ctx.select === 'function') ctx.select(again, { fly: !e.rig, undo: false });
  else if (!again && typeof ctx.deselect === 'function') ctx.deselect();
  if (e.rig && ctx.cameraRig && typeof ctx.cameraRig.restoreState === 'function') ctx.cameraRig.restoreState(e.rig, reduced() ? 0 : RESTORE_MS);
  else if (!again && e.stage === 'earth' && typeof ctx.frameEarth === 'function') ctx.frameEarth(reduced() ? 0 : RESTORE_MS);
}

/** Back one step along the visitor's own path. False when there is none. */
export function goBack(ctx = trail.ctx) {
  const e = trail.steps.pop();
  if (!e || !ctx) { changed(); return false; }
  trail.restoring = true;
  try { restoreStep(ctx, e); } catch (err) { console.warn('the view could not be put back', err); } finally { trail.restoring = false; }
  trail.current = { record: e.selected || null, name: e.name || null, stage: ctx.stage ? ctx.stage.worldId : e.stage, at: nowMs() };
  trail.last = null;
  changed();
  return true;
}

/** How many steps, and the newest (the one Back goes to): for the rail and the tests. */
export function trailState() {
  const top = trail.steps[trail.steps.length - 1] || null;
  return { size: trail.steps.length, top };
}

/** For the tests: forget everything. */
export function resetTrail() {
  if (trail.timer && typeof clearInterval === 'function') clearInterval(trail.timer);
  trail.steps = [];
  trail.current = undefined;
  trail.last = null;
  trail.ctx = null;
  trail.timer = 0;
  trail.restoring = false;
}
