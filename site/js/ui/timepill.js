// ui/timepill.js -- the clock, as one pill at the foot of the scene (spec 0061 req 6, design §7).
//
// Contract: createTimePill(ctx, host) -> { root, paint(), destroy() }
// Also exported, pure, for tests/test_shell.mjs:
//   PILL_RATES, nextRate(rate), stepMs(rate), clampToWindow(tMs, anchorMs), pillText(state)
//
// WHY. The clock was the fourth section of a 3 800 px column: a UTC line, a local line, Play,
// Now, six speed buttons and a range slider, found by scrolling past the trips and the layers.
// Time is not a setting; it is the one control a map of things in motion is about. Row D puts it
// where every video player puts it: a pill, bottom centre of the picture, reading LIVE and the time.
//
//   ‹   ● LIVE · 29 SEP 21:14 UTC   1×   ›                live: an ember dot, a quiet border
//   ‹   ○ 30 SEP 03:40 UTC · +6 h   60×  ›   Live         not live: ember border and "Live" back
//
// WHAT EACH PART DOES. ‹ and › step by the rate's natural step (STEPS below: ten minutes at 1×, a
// day at 3600×). The readout is a button: a click holds time still or lets it run (the old Pause),
// Left and Right on it step, and a drag along it scrubs -- one step per 48 px, inside the scrub
// window spec 0005 set (a week back, thirty days on), measured from the last live instant. The rate
// button cycles 1× · 60× · 600× · 3600×. "Live" appears only when the picture is not now, and is
// the one place the pill turns ember (0045: ember is the only interactive colour, and here it also
// means "this is not the present").
//
// It reads ctx.clock and never Date.now(): the present is clock.now() while the clock is live,
// remembered as the scrub anchor, exactly as the panel's clock did.

import { COPY, t, timeText, inWords } from '../copy/en.js';

export const PILL_RATES = [1, 60, 600, 3600];
/** How far one ‹ or › goes at each rate: a step the eye can follow at that speed. */
const STEPS = { 0: 600e3, 1: 600e3, 60: 3600e3, 600: 6 * 3600e3, 3600: 86400e3 };
const SCRUB_BACK_MS = 7 * 86400e3; // spec 0005: -7 days
const SCRUB_FORWARD_MS = 30 * 86400e3; // spec 0005: +30 days
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

/** Keep a scrub inside spec 0005's window around the last live instant. */
export function clampToWindow(tMs, anchorMs) {
  if (!Number.isFinite(anchorMs)) return tMs;
  return Math.min(anchorMs + SCRUB_FORWARD_MS, Math.max(anchorMs - SCRUB_BACK_MS, tMs));
}

/**
 * The readout's words. Pure. `state` = {tMs, live, rate, anchorMs}. Live: "LIVE · 29 SEP 21:14 UTC";
 * otherwise the shown instant and how far it is from the anchor: "30 SEP 03:40 UTC · in 6 hours".
 */
export function pillText(state) {
  const s = state || {};
  if (!Number.isFinite(s.tMs)) return COPY.timePill.unknown;
  const when = timeText.pillUtc(s.tMs);
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
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', T.label);

  const prev = button('sr-time__step', T.prev, T.prevTitle);
  const read = button('sr-time__read');
  const dot = el('span', 'sr-time__dot');
  dot.setAttribute('aria-hidden', 'true');
  const words = el('span', 'sr-time__words');
  read.appendChild(dot);
  read.appendChild(words);
  const rateBtn = button('sr-time__rate');
  const next = button('sr-time__step', T.next, T.nextTitle);
  const live = button('sr-time__live', T.backToLive, T.backToLiveTitle);
  live.hidden = true;
  // What changed, for a screen reader, once per change and not once a second.
  const say = el('span', 'sr-hidden-text');
  say.setAttribute('role', 'status');
  say.setAttribute('aria-live', 'polite');

  root.append(prev, read, rateBtn, next, live, say);
  (host || document.body).appendChild(root);

  let anchorMs = safeNow();
  let pausedRate = null;

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
  }

  function goTo(ms) {
    if (!clock || !Number.isFinite(ms)) return;
    try { clock.goTo(clampToWindow(ms, anchorMs)); } catch { /* the pill repaints what is true */ }
    paint();
  }

  function step(dir) {
    const rate = Number(clock && clock.rate);
    goTo(safeNow() + dir * stepMs(rate === 0 ? pausedRate || 1 : rate));
    say.textContent = words.textContent;
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
  live.addEventListener('click', () => {
    try { clock.live(); } catch { /* nothing else to try */ }
    pausedRate = null;
    paint();
    say.textContent = words.textContent;
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
    const rate = Number(clock && clock.rate);
    goTo(drag.t0 + (dx / DRAG_PX_PER_STEP) * stepMs(rate === 0 ? pausedRate || 1 : rate));
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
    destroy() { clearInterval(timer); root.remove(); },
  };
  if (ctx) ctx.timePill = api;
  return api;
}
