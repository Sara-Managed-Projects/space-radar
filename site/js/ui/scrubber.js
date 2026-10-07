// ui/scrubber.js -- the timeline in the time pill (public #455, internal #273 and #301).
//
// Contract: createScrubber(ctx, pill) -> { root, paint(), marks(), destroy() }
// Also exported, pure, for tests/test_scrubber.mjs:
//   SCALES, tapeX(tMs, centreMs, unit, width), tapeTime(x, centreMs, unit, width),
//   tickPlan(centreMs, unit, width) -> {stepPx, offsetPx, labels: [{x, text, day}]},
//   markOf(item, nowMs) -> {id, tMs, kind, what, record} | null, mergeMarks(known, items, nowMs, window),
//   nearestMark(marks, x, centreMs, unit, width, reachPx), roughSpans(centreMs, anchorMs, unit, width),
//   stepMark(marks, tMs, dir) -> the mark before or after | null, moonMarks(nowMs) -> items
//
// WHY A TAPE AND NOT A THUMB. The window is a month back and a year on (ui/timepill.js says why),
// and the things worth scrubbing to are a pass in forty minutes and an eclipse in ten months. On
// one fixed track 395 days wide the next pass is a pixel from now and a thumb cannot be put on it.
// So the track moves and the mark stays: time is a tape under a fixed line a third of the way along, as a
// tuner's dial is, and as Windy's timeline is on a phone. Dragging the tape anywhere moves time,
// which is a target a thumb cannot miss, and the unit button (a minute, an hour, a day) is also
// how much of the tape is in view: two hours, a day, a month.
//
// WHAT IS ON THE TAPE.
//   ticks     a rule every five minutes, hour or day, in UTC, with a label every half hour, six
//             hours or week. Drawn as one repeating background, not as elements.
//   now       where the real present is, with the word; pressing it is Live. Letting go of a drag
//             within a few pixels of it is Live too: "now" snaps.
//   marks     what is coming, from the same list "Coming up" shows (ui/next.js, through
//             ctx.explore.next.items()): the next pass over your place, launches, a close
//             approach, a shower's peak, an eclipse; and the Moon's four named phases, worked out
//             here (moonMarks), which move the clock and select nothing. Each is a button: it moves the clock there
//             and, when the event is a thing on the map, selects it. A mark once seen stays on
//             the tape after the clock passes it, so jumping to one does not make it vanish.
//   rougher   past a week either side of now a satellite's place along its orbit is not to be
//             trusted (its elements are days old); the tape is hatched there and says so. The
//             planets and the Moon are right for centuries, and the note says that too.
//   the ends  a month back and a year on the tape stops.
//
// IT IS A SLIDER for a keyboard and a screen reader: Left and Right step by the unit, Page Up and
// Page Down by six, Home is now; its value text is the pill's own words.
//
// Fetched after the first visit has settled (main.js), so none of this is a first visit's cost.
// It reads ctx.clock through the pill and never Date.now(): "now" is the pill's anchor.

import { COPY, t, timeText } from '../copy/en.js';
import { UNIT_MS, SCRUB_BACK_MS, SCRUB_FORWARD_MS, FINE_MS } from './timepill.js';
import { rowText } from './next.js';
import { isJunk } from '../sky/tonightbest.js';
import '../copy/en.later.js';
import * as Astronomy from '../../vendor/astronomy.js';

/**
 * Per unit: how many pixels one unit of time takes, the minor tick, and the labelled tick.
 * Chosen so the labels are at least 96 px apart and a phone's 250 px of tape shows about an
 * hour, half a day, or two weeks.
 */
export const SCALES = {
  minute: { pxPerMs: 4 / 60e3, tickMs: 5 * 60e3, labelMs: 30 * 60e3 },
  hour: { pxPerMs: 20 / 3600e3, tickMs: 3600e3, labelMs: 6 * 3600e3 },
  day: { pxPerMs: 16 / 86400e3, tickMs: 86400e3, labelMs: 7 * 86400e3 },
};
// Stepping by event (ui/timepill.js PILL_UNITS): the widest view, where the most marks are in sight.
SCALES.event = SCALES.day;
/**
 * Where on the tape the fixed line stands: a third of the way along, not the middle. What is
 * coming is what people scrub to, and with the line in the middle half of a phone's tape was the
 * last six hours (seen at 390 px, 2026-10-06: no mark in view with a pass nine hours off).
 */
export const CURSOR_AT = 1 / 3;
const SNAP_PX = 6;
const TAP_PX = 4;
const MARK_REACH_PX = 22;
const MARK_EDGE_PX = 22;
const MARKS_KEPT = 40;
const DAY_MS = 86400e3;

/** Where an instant sits on a tape `width` wide whose centre is `centreMs`. */
export function tapeX(tMs, centreMs, unit, width) {
  const s = SCALES[unit] || SCALES.hour;
  return width * CURSOR_AT + (tMs - centreMs) * s.pxPerMs;
}

/** And back: the instant under a pixel. */
export function tapeTime(x, centreMs, unit, width) {
  const s = SCALES[unit] || SCALES.hour;
  return centreMs + (x - width * CURSOR_AT) / s.pxPerMs;
}

/**
 * The ticks as a background (its period and where it starts) and the labels as a short list.
 * Ticks and labels fall on round UTC instants. A label that falls on a midnight is the day.
 */
export function tickPlan(centreMs, unit, width) {
  const s = SCALES[unit] || SCALES.hour;
  const stepPx = s.tickMs * s.pxPerMs;
  const leftMs = tapeTime(0, centreMs, unit, width);
  const firstTick = Math.ceil(leftMs / s.tickMs) * s.tickMs;
  const offsetPx = tapeX(firstTick, centreMs, unit, width);
  const labels = [];
  // A week of days counts from a Monday (the epoch was a Thursday: three days on).
  const phase = unit === 'day' ? 4 * DAY_MS : 0;
  let at = Math.ceil((leftMs - phase) / s.labelMs) * s.labelMs + phase;
  const rightMs = tapeTime(width, centreMs, unit, width);
  for (; at <= rightMs && labels.length < 24; at += s.labelMs) {
    const day = unit === 'day' || at % DAY_MS === 0;
    labels.push({ tMs: at, x: tapeX(at, centreMs, unit, width), text: day ? timeText.utcDay(at) : timeText.utcHm(at), day });
  }
  return { stepPx, offsetPx, labels };
}

/** A step by event ignores a mark this close to the clock: it is the one the clock is already at. */
const EVENT_SLACK_MS = 60e3;
/** The Moon's phases on the tape: this many before now and after (four are one month). */
const MOON_BACK = 2;
const MOON_ON = 8;
const QUARTERS = ['new', 'firstQuarter', 'full', 'lastQuarter'];

/**
 * The mark before (`dir` < 0) or after the instant `tMs`, or null: what ‹ and › go to when the
 * step is "Event" (internal #408). `marks` is sorted by time, as mergeMarks leaves it.
 */
export function stepMark(marks, tMs, dir, slackMs = EVENT_SLACK_MS) {
  const list = Array.isArray(marks) ? marks : [];
  if (!Number.isFinite(tMs)) return null;
  if (dir < 0) {
    for (let i = list.length - 1; i >= 0; i -= 1) if (list[i].tMs < tMs - slackMs) return list[i];
    return null;
  }
  for (const m of list) if (m.tMs > tMs + slackMs) return m;
  return null;
}

/**
 * The Moon's named phases round `nowMs` as items for the tape (internal #408: "a quiet week shows
 * two marks"). Worked out here from the same theory that draws the Moon (astronomy-engine,
 * SearchMoonQuarter), so they cost no request; good to the minute for centuries. Not on the Coming
 * up list: a phase is on the Tonight tab already, and the list is for things that pass.
 */
export function moonMarks(nowMs, back = MOON_BACK, on = MOON_ON) {
  const out = [];
  if (!Number.isFinite(nowMs)) return out;
  try {
    let q = Astronomy.SearchMoonQuarter(new Date(nowMs - (back * 29.53 / 4 + 1) * DAY_MS));
    for (let i = 0; i < back + on + 2 && out.length < back + on; i += 1) {
      const tMs = q.time.date.getTime();
      const phase = COPY.tonight.best.phases[QUARTERS[q.quarter]];
      out.push({ kind: 'moon', tMs, label: QUARTERS[q.quarter], what: t(COPY.timePill.moonMark, { phase, date: timeText.dateNear(tMs, nowMs) }) });
      q = Astronomy.NextMoonQuarter(q);
    }
  } catch { /* no phases on the tape; everything else stands */ }
  return out;
}

const MARK_KINDS = { 'launch': 'launch', 'approach': 'approach', 'perihelion': 'approach', 'pass': 'pass', 'train': 'pass', 'shower': 'shower', 'solar-eclipse': 'eclipse', 'lunar-eclipse': 'eclipse', 'moon': 'moon' };

/** One "Coming up" item as a mark, or null for what has no instant to go to (a storm under way). */
export function markOf(item, nowMs) {
  if (!item || !Number.isFinite(item.tMs)) return null;
  const kind = MARK_KINDS[item.kind];
  if (!kind) return null;
  // A spent rocket body's pass is not something to scrub to (sky/tonightbest.js isJunk).
  if (kind === 'pass' && isJunk(item.record)) return null;
  const rid = item.record ? item.record.id : item.label || item.kind;
  let what = '';
  // An item that brings its own words (a Moon phase) keeps them; the rest are Coming up's rows.
  try { what = item.what || rowText(item, nowMs); } catch { what = ''; }
  return { id: `${item.kind}:${rid}:${Math.round(item.tMs / 60e3)}`, tMs: item.tMs, kind, what: what.replace(/\.$/, ''), record: item.record || null };
}

/**
 * The marks to draw: the ones already known that are still inside the window, and the new ones.
 * A known mark keeps its words (they were true when it was coming up: "in 2 hours" is refreshed
 * while it is still on the list). Sorted by time, the nearest MARKS_KEPT to now kept.
 */
export function mergeMarks(known, items, nowMs, win) {
  const byId = new Map();
  for (const m of Array.isArray(known) ? known : []) if (m && m.tMs >= win.lo && m.tMs <= win.hi) byId.set(m.id, m);
  for (const it of Array.isArray(items) ? items : []) {
    const m = markOf(it, nowMs);
    if (m && m.tMs >= win.lo && m.tMs <= win.hi) byId.set(m.id, m);
  }
  const all = [...byId.values()].sort((a, b) => a.tMs - b.tMs);
  if (all.length <= MARKS_KEPT) return all;
  return all.sort((a, b) => Math.abs(a.tMs - nowMs) - Math.abs(b.tMs - nowMs)).slice(0, MARKS_KEPT).sort((a, b) => a.tMs - b.tMs);
}

/** The mark a tap at `x` means, if one is within reach. */
export function nearestMark(marks, x, centreMs, unit, width, reachPx = MARK_REACH_PX) {
  let best = null;
  let bestD = reachPx;
  for (const m of marks || []) {
    const d = Math.abs(tapeX(m.tMs, centreMs, unit, width) - x);
    if (d <= bestD) { best = m; bestD = d; }
  }
  return best;
}

/**
 * The stretches of the tape, in pixels, that are past the fine zone ({left, right}, each
 * {x, w} or null) and past the window's ends ({endLeft, endRight}).
 */
export function roughSpans(centreMs, anchorMs, unit, width) {
  const x = (ms) => tapeX(ms, centreMs, unit, width);
  const span = (a, b) => { const lo = Math.max(0, a); const hi = Math.min(width, b); return hi > lo ? { x: lo, w: hi - lo } : null; };
  const lo = x(anchorMs - SCRUB_BACK_MS);
  const hi = x(anchorMs + SCRUB_FORWARD_MS);
  return {
    left: span(lo, x(anchorMs - FINE_MS)),
    right: span(x(anchorMs + FINE_MS), hi),
    endLeft: span(-Infinity, lo),
    endRight: span(hi, Infinity),
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

export function createScrubber(ctx, pill) {
  const T = COPY.timePill;
  const clock = ctx && ctx.clock;
  const host = pill && pill.tapeHost;
  if (!host || !clock) return { root: null, paint() {}, marks: () => [], destroy() {} };

  const root = el('div', 'sr-tape');
  root.tabIndex = 0;
  root.setAttribute('role', 'slider');
  root.setAttribute('aria-label', T.tapeLabel);
  root.setAttribute('aria-orientation', 'horizontal');
  root.title = T.tapeTitle;
  const ticks = el('div', 'sr-tape__ticks');
  const roughL = el('div', 'sr-tape__rough');
  const roughR = el('div', 'sr-tape__rough');
  const endL = el('div', 'sr-tape__end');
  const endR = el('div', 'sr-tape__end');
  for (const n of [roughL, roughR]) n.title = T.roughTitle + COPY.punctuation.sentenceJoin + T.worlds;
  for (const n of [endL, endR]) n.title = T.endTitle;
  const roughWordL = el('span', 'sr-tape__roughword', T.rough);
  const roughWordR = el('span', 'sr-tape__roughword', T.rough);
  roughL.appendChild(roughWordL);
  roughR.appendChild(roughWordR);
  const labels = el('div', 'sr-tape__labels');
  labels.setAttribute('aria-hidden', 'true');
  const markList = el('div', 'sr-tape__marks');
  markList.setAttribute('role', 'group');
  const nowBtn = el('button', 'sr-tape__now', T.now);
  nowBtn.type = 'button';
  nowBtn.title = T.nowTitle;
  nowBtn.setAttribute('aria-label', T.nowTitle);
  const cursor = el('div', 'sr-tape__cursor');
  cursor.setAttribute('aria-hidden', 'true');
  root.append(ticks, roughL, roughR, endL, endR, labels, markList, nowBtn, cursor);
  host.appendChild(root);
  host.classList.add('has-tape');

  let width = root.clientWidth || 0;
  let marks = [];
  let drag = null;
  const labelPool = [];
  const markNodes = new Map();

  const now = () => { try { const v = clock.now(); return Number.isFinite(v) ? v : NaN; } catch { return NaN; } };
  const isLive = () => !clock.mode || clock.mode === 'live';

  function place(node, span) {
    node.hidden = !span;
    if (!span) return;
    node.style.left = `${span.x}px`;
    node.style.width = `${span.w}px`;
  }

  function paint() {
    const tMs = now();
    if (!Number.isFinite(tMs)) return;
    if (!width) width = root.clientWidth || 0;
    if (!width) return;
    const unit = pill.unit();
    const anchor = pill.anchor();
    const plan = tickPlan(tMs, unit, width);
    ticks.style.backgroundSize = `${plan.stepPx}px 100%`;
    ticks.style.backgroundPositionX = `${plan.offsetPx}px`;
    while (labelPool.length < plan.labels.length) { const s = el('span', 'sr-tape__label'); labels.appendChild(s); labelPool.push(s); }
    labelPool.forEach((node, i) => {
      const l = plan.labels[i];
      node.hidden = !l;
      if (!l) return;
      if (node.textContent !== l.text) node.textContent = l.text;
      node.classList.toggle('is-day', !!l.day);
      node.style.transform = `translateX(${l.x}px)`;
    });
    const spans = roughSpans(tMs, anchor, unit, width);
    place(roughL, spans.left);
    place(roughR, spans.right);
    place(endL, spans.endLeft);
    place(endR, spans.endRight);
    const nowX = tapeX(anchor, tMs, unit, width);
    const nowShown = !isLive() && nowX >= 0 && nowX <= width;
    nowBtn.hidden = !nowShown;
    if (nowShown) nowBtn.style.transform = `translateX(${nowX}px)`;
    root.classList.toggle('is-live', isLive());
    root.classList.toggle('is-rough', Math.abs(tMs - anchor) > FINE_MS);
    // The marks: one button each, made once and moved.
    const seen = new Set();
    for (const m of marks) {
      const x = tapeX(m.tMs, tMs, unit, width);
      // Not in the tape's last MARK_EDGE_PX either side: there the mark's 44 px target is clipped
      // by the tape and shares its pixels with the step button beside it, so a tap on a launch
      // eight hours off was "forward one hour" (internal #419 item 6, seen at 390 px).
      if (x < MARK_EDGE_PX || x > width - MARK_EDGE_PX) continue;
      seen.add(m.id);
      let b = markNodes.get(m.id);
      if (!b) {
        b = el('button', 'sr-tape__mark');
        b.type = 'button';
        b.dataset.kind = m.kind;
        b.dataset.mark = m.id;
        b.appendChild(el('span', 'sr-tape__glyph'));
        markList.appendChild(b);
        markNodes.set(m.id, b);
      }
      const label = t(T.markTitle, { what: m.what });
      if (b.title !== label) { b.title = label; b.setAttribute('aria-label', label); }
      b.style.transform = `translateX(${x}px)`;
      b.classList.toggle('is-here', Math.abs(x - width * CURSOR_AT) < 1.5);
    }
    for (const [id, b] of markNodes) if (!seen.has(id)) { b.remove(); markNodes.delete(id); }
    // The slider's value: minutes from now, and the pill's own words.
    root.setAttribute('aria-valuemin', String(-Math.round(SCRUB_BACK_MS / 60e3)));
    root.setAttribute('aria-valuemax', String(Math.round(SCRUB_FORWARD_MS / 60e3)));
    root.setAttribute('aria-valuenow', String(Math.round((tMs - anchor) / 60e3)));
    const text = pill.words() + (Math.abs(tMs - anchor) > FINE_MS ? COPY.punctuation.sentenceJoin + T.roughSay : '');
    if (root.getAttribute('aria-valuetext') !== text) root.setAttribute('aria-valuetext', text);
  }

  function readMarks() {
    const next = ctx.explore && ctx.explore.next;
    const items = next && typeof next.items === 'function' ? next.items() : [];
    const anchor = pill.anchor();
    marks = mergeMarks(marks, items.concat(moonMarks(anchor)), now(), { lo: anchor - SCRUB_BACK_MS, hi: anchor + SCRUB_FORWARD_MS });
    paint();
  }

  function goToMark(m) {
    // The picture of the view is taken before the clock moves, so the way back (main.js
    // rememberView, offered by select below) puts the time back too.
    if (typeof ctx.rememberView === 'function') ctx.rememberView();
    pill.goTo(m.tMs);
    pill.say(m.what);
    if (!m.record || typeof ctx.select !== 'function') return;
    // As ui/search.js does: a record whose layer is off has no mark on the map to fly to.
    if (m.record.layer && typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(m.record.layer) && typeof ctx.setLayerOn === 'function') {
      ctx.setLayerOn(m.record.layer, true);
      document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: m.record.layer, on: true, handled: true, from: 'timeline' } }));
    }
    // Once the scene stands at that moment (main.js afterClockJump), so the flight goes to
    // where the thing is then and not where it was a moment ago.
    const go = () => ctx.select(m.record, { remembered: true });
    if (typeof ctx.afterClockJump === 'function') ctx.afterClockJump(go); else go();
  }

  // ‹ and › with the step at "Event" (ui/timepill.js): the mark before or after the clock.
  if (typeof pill.setEventStep === 'function') {
    pill.setEventStep((dir) => {
      const m = stepMark(marks, now(), dir);
      if (m) goToMark(m);
      return !!m;
    });
  }

  // --- the drag: the tape follows the finger, so a drag to the left goes forward in time ---------
  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, t0: now(), moved: false, id: e.pointerId, target: e.target };
    try { root.setPointerCapture(e.pointerId); } catch { /* fine without */ }
  });
  root.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < TAP_PX) return;
    drag.moved = true;
    root.classList.add('is-dragging');
    const s = SCALES[pill.unit()] || SCALES.hour;
    pill.goTo(drag.t0 - dx / s.pxPerMs);
  });
  const endDrag = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const d = drag;
    drag = null;
    root.classList.remove('is-dragging');
    if (e && e.type === 'pointercancel') return;
    const unit = pill.unit();
    const rect = root.getBoundingClientRect();
    if (d.moved) {
      // Let go within a few pixels of now: it is now.
      if (Math.abs(tapeX(pill.anchor(), now(), unit, width) - width * CURSOR_AT) <= SNAP_PX) pill.toLive();
      else pill.say(pill.words());
      return;
    }
    // A tap. On "now": Live. On or near a mark: go there. Anywhere else: that instant.
    if (d.target === nowBtn) { pill.toLive(); return; }
    const x = e.clientX - rect.left;
    const hit = nearestMark(marks, x, now(), unit, width);
    if (hit) { goToMark(hit); return; }
    pill.goTo(tapeTime(x, now(), unit, width));
    pill.say(pill.words());
  };
  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);
  // A mark or "now" pressed from the keyboard (a pointer's press is the tap above, which has the
  // pointer captured, so no click of its own follows a drag).
  root.addEventListener('click', (e) => {
    if (e.detail !== 0) return; // a pointer's click: handled at pointerup
    const b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b === nowBtn) { pill.toLive(); root.focus({ preventScroll: true }); return; }
    const m = marks.find((x) => x.id === b.dataset.mark);
    if (m) goToMark(m);
  });
  root.addEventListener('wheel', (e) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!d) return;
    e.preventDefault();
    const s = SCALES[pill.unit()] || SCALES.hour;
    pill.goTo(now() + d / s.pxPerMs);
  }, { passive: false });
  root.addEventListener('keydown', (e) => {
    if (e.target !== root) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowDown') pill.step(-1);
    else if (k === 'ArrowRight' || k === 'ArrowUp') pill.step(1);
    else if (k === 'PageDown') pill.goTo(now() - 6 * UNIT_MS[pill.unit()]);
    else if (k === 'PageUp') pill.goTo(now() + 6 * UNIT_MS[pill.unit()]);
    else if (k === 'Home') pill.toLive();
    else return;
    e.preventDefault();
  });

  const onResize = () => { width = root.clientWidth || 0; paint(); };
  let observer = null;
  if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(onResize); observer.observe(root); }
  else window.addEventListener('resize', onResize);
  pill.onPaint(paint);
  const onData = () => readMarks();
  window.addEventListener('sr:layer', onData);
  window.addEventListener('sr:observer', onData);
  window.addEventListener('sr:next', onData);
  readMarks();

  return {
    root,
    paint,
    marks: () => marks.slice(),
    destroy() {
      if (observer) observer.disconnect(); else window.removeEventListener('resize', onResize);
      window.removeEventListener('sr:layer', onData);
      window.removeEventListener('sr:observer', onData);
      window.removeEventListener('sr:next', onData);
      if (typeof pill.setEventStep === 'function') pill.setEventStep(null);
      host.classList.remove('has-tape');
      root.remove();
    },
  };
}
