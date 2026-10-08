// ui/timepill.js -- the clock, as one pill at the foot of the scene (spec 0061 req 6, design §7).
//
// Contract: createTimePill(ctx, host) -> { root, paint(), destroy(), tapeHost, anchor(), unit(),
//           setUnit(u), goTo(ms), step(dir), toLive(), words(), onPaint(fn), setEventStep(fn) }
// Also exported, pure, for tests/test_shell.mjs:
//   PILL_RATES, nextRate(rate), stepMs(rate), clampToWindow(tMs, anchorMs, fromMs), pillText(state),
//   PILL_UNITS, UNIT_MS, nextUnit(unit), SCRUB_BACK_MS, SCRUB_FORWARD_MS, FINE_MS
//
// WHY. The clock was the fourth section of a 3 800 px column: a UTC line, a local line, Play,
// Now, six speed buttons and a range slider, found by scrolling past the trips and the layers.
// Time is not a setting; it is the one control a map of things in motion is about. Row D puts it
// where every video player puts it: a pill, bottom centre of the picture, reading LIVE and the time.
//
//   ‹   ● LIVE · 29 SEP 21:14 UTC   1×   ›                live: an ember dot, a quiet border
//   ‹   ○ 30 SEP 03:40 UTC · +6 h   60×  ›   Live         not live: ember border and "Live" back
//
// SINCE 2026-10-06 IT HAS TWO ROWS (public #455, internal #273 and #301: "Windy made the time
// slider the reason to stay; ours is hidden"). The upper row is the timeline: ‹, a tape that is
// dragged under a fixed mark, ›. The tape itself -- its ticks, the marks for what is coming, the
// drag -- is ui/scrubber.js, fetched after the first visit has settled (main.js); until it lands
// the row is a bare rule between the two steps, which already work. The lower row is what the
// pill always was: the readout, the step size, the speed, and Live.
//
//   ‹  |  ·  |  ·  ◆ |  ·  ▲  ·  |  ·  |  ·  ›           the tape: drag it, tap a mark
//   ● LIVE · 29 SEP 21:14 UTC      1 h    1×               live: an ember dot, a quiet border
//   ○ 30 SEP 03:40 UTC · in 6 hours  1 h  60×   Live       not live: ember border and "Live" back
//
// WHAT EACH PART DOES. ‹ and › step by the chosen size: a minute, an hour, a day, or to the event
// before and after (the unit button cycles them, and the tape shows two hours, a day or a month to
// match). The readout is a
// button: a click holds time still or lets it run (the old Pause), Left and Right on it step, and
// a drag along it scrubs, one step per 48 px. The rate button cycles 1× · 60× · 600× · 3600×.
// "Live" appears only when the picture is not now, and is the one place the pill turns ember
// (0045: ember is the only interactive colour, and here it also means "this is not the present").
//
// HOW FAR, AND HOW GOOD. Spec 0005 set the window at a week back and thirty days on. It is now a
// month back and a year on, measured from the last live instant, because the planets, the moons
// and the eclipses are worked out from theories that hold for centuries, and next August's
// eclipse is the thing people want to scrub to. What does NOT hold is a satellite: its elements
// are a few days old, and past about a week either side its place along its orbit is rough (the
// orbit itself, its height and its tilt, stays right for months). The tape draws that boundary
// and says so (FINE_MS; COPY.timePill.rough). A clock that something else put outside the window
// -- a mission's event in 1979 (ui/missions.js), a link's #t= -- is left where it is: steps and
// drags move freely from there, and Live comes back.
//
// THE LIVE LINE (spec 0061 task 3). On a phone the same words are also one line under the top bar's
// search ("● LIVE · 02 OCT 05:43 UTC"), in the shell's lineHost: the pill hides while a card is up
// and when the sheet is full, and whether the picture is now is the one thing a visitor must
// always be able to see (docs/ui-guide.md principle 6). It is text, not a control; the pill is the
// control. It sits on a small glass pill of its own: bare over a white cloud (the ISS's card, row
// D's own picture) the halo the globe labels use was not enough to read it (principle 8). The line is display: none on a desktop, where the pill never goes.
//
// It reads ctx.clock and never Date.now(): the present is clock.now() while the clock is live,
// remembered as the scrub anchor, exactly as the panel's clock did.

import { COPY, t, timeText, inWords } from '../copy/en.js';

export const PILL_RATES = [1, 60, 600, 3600];
/** How far one ‹ or › goes at each rate: a step the eye can follow at that speed. */
const STEPS = { 0: 600e3, 1: 600e3, 60: 3600e3, 600: 6 * 3600e3, 3600: 86400e3 };
export const SCRUB_BACK_MS = 30 * 86400e3; // a month back (spec 0005 had a week)
export const SCRUB_FORWARD_MS = 365 * 86400e3; // a year on (spec 0005 had thirty days)
/** Inside this of now a satellite's drawn place is good; beyond it the tape says "rougher". */
export const FINE_MS = 7 * 86400e3;
// `event` (internal #408, #269's Prev/Next): ‹ and › go to the mark before and the mark after on
// the timeline, instead of a fixed step. It is a fourth stop of the same button so the pill grows
// no wider on a phone. The tape shows what the day view shows (a month), a drag along the readout
// moves by days, and until ui/scrubber.js has landed with the marks a step is a day.
export const PILL_UNITS = ['minute', 'hour', 'day', 'event'];
export const UNIT_MS = { minute: 60e3, hour: 3600e3, day: 86400e3, event: 86400e3 };
const DEFAULT_UNIT = 'hour';

/** The step size after this one; anything unknown goes to the default. */
export function nextUnit(unit) {
  const i = PILL_UNITS.indexOf(unit);
  return i < 0 ? DEFAULT_UNIT : PILL_UNITS[(i + 1) % PILL_UNITS.length];
}
const DRAG_PX_PER_STEP = 48;
const REFRESH_MS = 500;

/** The rate after this one in the cycle; a rate not in it (10×, 36000× from an old link) goes to 1×. */
export function nextRate(rate) {
  const i = PILL_RATES.indexOf(Number(rate));
  return i < 0 ? PILL_RATES[0] : PILL_RATES[(i + 1) % PILL_RATES.length];
}

/** One ‹ › step, in ms of app time, for a rate. The nearest smaller rate's step for one off the cycle. */
export function stepMs(rate) {
  const r = Number(rate) || 0;
  if (STEPS[r]) return STEPS[r];
  let best = STEPS[1];
  for (const k of Object.keys(STEPS).map(Number).sort((a, b) => a - b)) if (k <= r) best = STEPS[k];
  return best;
}

/**
 * Keep a scrub inside the window around the last live instant. `fromMs` is where the clock is
 * now: when that is already outside the window (a mission's event, a link) the move is free, or
 * one step from 1979 would land on last month.
 */
export function clampToWindow(tMs, anchorMs, fromMs) {
  if (!Number.isFinite(anchorMs)) return tMs;
  const lo = anchorMs - SCRUB_BACK_MS;
  const hi = anchorMs + SCRUB_FORWARD_MS;
  if (Number.isFinite(fromMs) && (fromMs < lo || fromMs > hi)) return tMs;
  return Math.min(hi, Math.max(lo, tMs));
}

/**
 * The readout's words. Pure. `state` = {tMs, live, rate, anchorMs}. Live: "LIVE · 29 SEP 21:14 UTC";
 * otherwise the shown instant and how far it is from the anchor: "30 SEP 03:40 UTC · in 6 hours".
 */
export function pillText(state) {
  const s = state || {};
  if (!Number.isFinite(s.tMs)) return COPY.timePill.unknown;
  const when = timeText.pillUtc(s.tMs, s.live ? undefined : s.anchorMs);
  if (s.live) return t(COPY.timePill.live, { when });
  if (s.rate === 0) return t(COPY.timePill.held, { when });
  const off = Number.isFinite(s.anchorMs) ? inWords(s.tMs - s.anchorMs) : '';
  return off ? t(COPY.timePill.away, { when, off }) : when;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function button(className, text, label) {
  const b = el('button', className, text);
  b.type = 'button';
  if (label) { b.setAttribute('aria-label', label); b.title = label; }
  return b;
}

export function createTimePill(ctx, host) {
  const clock = ctx && ctx.clock;
  const T = COPY.timePill;
  const root = el('div', 'sr-time sr-float');
  root.id = 'sr-time';
  // A named region: the pill is page content outside the sidebar and the map, and content outside
  // every landmark is skipped by a reader's landmark keys (axe `region`, measured 2026-10-08).
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', T.label);

  const prev = button('sr-time__step', T.prev, T.prevTitle);
  const read = button('sr-time__read');
  const dot = el('span', 'sr-time__dot');
  dot.setAttribute('aria-hidden', 'true');
  const words = el('span', 'sr-time__words');
  read.appendChild(dot);
  read.appendChild(words);
  const unitBtn = button('sr-time__unit');
  const rateBtn = button('sr-time__rate');
  const next = button('sr-time__step', T.next, T.nextTitle);
  // The timeline's seat: ui/scrubber.js fills it. Empty, it is a rule between the two steps.
  const tapeHost = el('div', 'sr-time__tape');
  const live = button('sr-time__live', T.backToLive, T.backToLiveTitle);
  live.hidden = true;
  // What changed, for a screen reader, once per change and not once a second.
  const say = el('span', 'sr-hidden-text');
  say.setAttribute('role', 'status');
  say.setAttribute('aria-live', 'polite');

  const tapeRow = el('div', 'sr-time__tape-row');
  tapeRow.append(prev, tapeHost, next);
  const row = el('div', 'sr-time__row');
  row.append(read, unitBtn, rateBtn, live);
  root.append(tapeRow, row, say);
  (host || document.body).appendChild(root);

  const lineHost = ctx && ctx.shell && ctx.shell.lineHost;
  const line = el('p', 'sr-liveline sr-float');
  const lineDot = el('span', 'sr-time__dot');
  lineDot.setAttribute('aria-hidden', 'true');
  const lineWords = el('span', 'sr-liveline__words');
  line.append(lineDot, lineWords);
  if (lineHost) lineHost.appendChild(line);

  let anchorMs = safeNow();
  let pausedRate = null;
  let unit = DEFAULT_UNIT;
  let eventStep = null; // ui/scrubber.js: (dir) -> whether there was a mark that way to go to
  const painters = [];

  function safeNow() {
    try { const v = clock.now(); return Number.isFinite(v) ? v : NaN; } catch { return NaN; }
  }
  const isLive = () => !clock || !clock.mode || clock.mode === 'live';

  function paint() {
    const tMs = safeNow();
    const liveNow = isLive();
    if (liveNow && Number.isFinite(tMs)) anchorMs = tMs;
    const rate = Number(clock && clock.rate);
    const text = pillText({ tMs, live: liveNow, rate, anchorMs });
    if (words.textContent !== text) words.textContent = text;
    if (lineWords.textContent !== text) lineWords.textContent = text;
    line.classList.toggle('is-away', !liveNow);
    root.classList.toggle('is-live', liveNow);
    root.classList.toggle('is-away', !liveNow);
    root.classList.toggle('is-held', rate === 0);
    live.hidden = liveNow;
    const shownRate = rate === 0 ? pausedRate || 1 : rate;
    const rateText = t(T.rate, { n: String(shownRate) });
    if (rateBtn.textContent !== rateText) rateBtn.textContent = rateText;
    rateBtn.setAttribute('aria-label', t(T.rateTitle, { n: String(shownRate), next: String(nextRate(shownRate)) }));
    rateBtn.title = rateBtn.getAttribute('aria-label');
    const hold = rate === 0 ? T.run : T.hold;
    read.setAttribute('aria-label', t(T.readLabel, { text, hold }));
    read.title = Number.isFinite(tMs) ? t(T.localTitle, { time: timeText.localTime(tMs), zone: timeText.timeZoneName(), hold }) : hold;
    if (unitBtn.textContent !== T.units[unit]) unitBtn.textContent = T.units[unit];
    const unitLabel = t(T.unitTitle, { unit: T.unitWords[unit], next: T.unitWords[nextUnit(unit)] });
    if (unitBtn.title !== unitLabel) { unitBtn.title = unitLabel; unitBtn.setAttribute('aria-label', unitLabel); }
    root.dataset.unit = unit;
    const byEvent = unit === 'event';
    const prevLabel = byEvent ? T.prevEvent : T.prevTitle;
    if (prev.title !== prevLabel) {
      prev.title = prevLabel; prev.setAttribute('aria-label', prevLabel);
      const nextLabel = byEvent ? T.nextEvent : T.nextTitle;
      next.title = nextLabel; next.setAttribute('aria-label', nextLabel);
    }
    for (const fn of painters) { try { fn(); } catch (e) { console.warn('a time pill painter failed', e); } }
  }

  function goTo(ms) {
    if (!clock || !Number.isFinite(ms)) return;
    try { clock.goTo(clampToWindow(ms, anchorMs, safeNow())); } catch { /* the pill repaints what is true */ }
    paint();
  }

  function step(dir) {
    if (unit === 'event' && eventStep) {
      // The scrubber moves the clock, selects the thing and says its words; nothing that way is said too.
      if (!eventStep(dir)) say.textContent = dir < 0 ? T.noEventBack : T.noEventOn;
      return;
    }
    goTo(safeNow() + dir * UNIT_MS[unit]);
    say.textContent = words.textContent;
  }

  function toLive() {
    try { clock.live(); } catch { /* nothing else to try */ }
    pausedRate = null;
    paint();
    say.textContent = words.textContent;
  }

  function setUnit(u) {
    if (!PILL_UNITS.includes(u) || u === unit) return;
    unit = u;
    paint();
  }

  function toggleHold() {
    if (!clock) return;
    const rate = Number(clock.rate);
    try {
      if (rate === 0) { clock.setRate(pausedRate || 1); pausedRate = null; }
      else { pausedRate = Number.isFinite(rate) && rate > 0 ? rate : 1; clock.setRate(0); }
    } catch { /* a clock that refuses 0 keeps running; the pill says what is true */ }
    paint();
    say.textContent = words.textContent;
  }

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  rateBtn.addEventListener('click', () => {
    const rate = Number(clock && clock.rate);
    const to = nextRate(rate === 0 ? pausedRate || 1 : rate);
    pausedRate = null;
    try { clock.setRate(to); } catch { /* repaint says what happened */ }
    paint();
    say.textContent = rateBtn.textContent;
  });
  unitBtn.addEventListener('click', () => {
    setUnit(nextUnit(unit));
    say.textContent = T.unitWords[unit];
  });
  live.addEventListener('click', () => {
    toLive();
    read.focus({ preventScroll: true });
  });

  // The readout: a click holds or runs, arrows step, a drag scrubs. A drag of more than 4 px is a
  // scrub and swallows the click that ends it, so letting go after a scrub does not also pause.
  let drag = null;
  read.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, t0: safeNow(), moved: false, id: e.pointerId };
    try { read.setPointerCapture(e.pointerId); } catch { /* fine without */ }
  });
  read.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 4) return;
    drag.moved = true;
    root.classList.add('is-scrubbing');
    goTo(drag.t0 + (dx / DRAG_PX_PER_STEP) * UNIT_MS[unit]);
  });
  const endDrag = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const moved = drag.moved;
    drag = null;
    root.classList.remove('is-scrubbing');
    if (moved) { read.dataset.dragged = '1'; say.textContent = words.textContent; }
  };
  read.addEventListener('pointerup', endDrag);
  read.addEventListener('pointercancel', endDrag);
  read.addEventListener('click', () => {
    if (read.dataset.dragged) { delete read.dataset.dragged; return; }
    toggleHold();
  });
  read.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  if (clock && typeof clock.onChange === 'function') clock.onChange(() => paint());
  // The minute ticks over while live and nothing tells the clock's listeners; a slow timer does.
  const timer = setInterval(paint, REFRESH_MS);
  paint();

  const api = {
    root,
    paint,
    destroy() { clearInterval(timer); root.remove(); line.remove(); },
    // For ui/scrubber.js, which draws the timeline in tapeHost and moves time through these.
    tapeHost,
    anchor: () => anchorMs,
    unit: () => unit,
    setUnit,
    goTo,
    step,
    toLive,
    words: () => words.textContent,
    say: (text) => { say.textContent = text || ''; },
    setEventStep: (fn) => { eventStep = typeof fn === 'function' ? fn : null; },
    onPaint: (fn) => { if (typeof fn === 'function') painters.push(fn); },
  };
  if (ctx) ctx.timePill = api;
  return api;
}
