// ui/sheet.js -- the phone's one bottom sheet: three heights, a handle, a drag that snaps (spec 0061
// task 3, docs/ui-guide.md §3.11).
//
// Contract: createSheet(root, opts) -> { handle, set(detent, how), detent(), height(), refresh(),
//                                        destroy() }
// Also exported, pure, for tests/test_sheet.mjs:
//   DETENTS, PEEK_PX, HALF_FRACTION, FULL_GAP_PX, FLING_PX_PER_MS, SLOP_PX
//   sheetHeights({viewH, fullH, safeBottom}) -> {peek, half, full} in px
//   snapDetent(h, v, heights, order)         -> the detent a release at height h, speed v lands on
//   cycleDetent(detent, dir, order)          -> {detent, dir}: a tap on the handle
//   stepDetent(detent, by, order)            -> the detent one ↑ or ↓ away
//   dragHeight(startH, dy, heights)          -> the height under the finger, rubber-banded
//   velocityOf(samples)                      -> px/ms, up positive, from the last 100 ms
//
// WHY. The phone had two buttons at the foot (Explore, Sources), each opening a drawer that was
// either shut or 62 % of the screen, and the card was a third sheet of its own over both. Three
// things at the bottom of a 390 px screen, two of them modal in effect, and the Earth behind
// whichever was open. A map app has ONE sheet with detents (Apple calls them that, HIG Sheets; M3
// gives the handle a 48 dp band): low, it is a row of tabs over the whole scene; half, it reads
// beside the scene; full, it is a page. The sidebar's views (ui/shell.js) are its content, so the
// card, the sources and a trip are the same sheet at different heights, never a second one.
//
//   peek   96 px: the 48 px handle band and the tabs. The scene is the product.
//   half   48 % of the window: a card's name, its three numbers and its actions.
//   full   the window less 60 px: a page that scrolls; the band of scene above says "still here".
//
// THE DRAG. The handle and anything marked [data-sheet-grab] drag at every height. Below full the
// whole sheet drags, because nothing in it scrolls there (ui.css holds the content still), so a
// swipe has nothing else to mean. At full the content scrolls and only the handle and the head
// drag: one gesture, one meaning, wherever the finger lands. A press that moves less than SLOP_PX
// is a tap and reaches the button under it; one that moved is a drag and its click is swallowed.
// On release the sheet snaps to the nearest height, unless the finger was moving faster than
// 0.5 px/ms (the guide's number), which carries it to the next height in that direction: a flick
// from peek goes to half even if it travelled 20 px.
//
// The canvas never hears any of it: the camera listens on the canvas (scene/camera.js), and the
// sheet is above the canvas, not inside it.
//
// MOTION. A snap is --sr-slow (320 ms) on transform, from ui.css; under reduced motion it jumps.
// During a drag there is no transition, so the sheet is under the finger, not behind it.
//
// THE SAME SHEET FOR SHARE. ui/sharesheet.js gives its phone sheet this behaviour with two heights
// and a dismiss: half (so the picture and its actions are up and the selection is still on screen
// above them) and full, and a drag down from half closes it.

import { COPY, t } from '../copy/en.js';

export const DETENTS = ['peek', 'half', 'full'];
/** docs/ui-guide.md §3.11: the 48 px handle band and the 48 px tabs. */
export const PEEK_PX = 96;
export const HALF_FRACTION = 0.48;
/** At full, this much of the scene stays above the sheet, so the visitor knows where they are. */
export const FULL_GAP_PX = 60;
/** A release faster than this carries the sheet to the next height (docs/ui-guide.md §3.11). */
export const FLING_PX_PER_MS = 0.5;
/** A press that moves less than this is a tap. */
export const SLOP_PX = 8;
const VELOCITY_WINDOW_MS = 100;
const RUBBER = 0.25;
const SWALLOW_MS = 400;

// What each height is called, for the handle's description: one row per height, so a fourth height
// is one line here (scripts/check_copy.py reads tables like this one for literals).
const HEIGHT_WORDS = [
  { id: 'closed', label: COPY.sheet.closed },
  { id: 'peek', label: COPY.sheet.peek },
  { id: 'half', label: COPY.sheet.half },
  { id: 'full', label: COPY.sheet.full },
];

/**
 * The three heights for a window. Pure. `fullH` is the sheet's own laid-out height (the window
 * less FULL_GAP_PX, less a trip's toolbar under it); `safeBottom` the home indicator's inset, which
 * peek adds so the tabs never sit on it. Half never drops under peek or rises over full.
 */
export function sheetHeights({ viewH, fullH, safeBottom } = {}) {
  const vh = Number(viewH) > 0 ? Number(viewH) : 0;
  const full = Number(fullH) > 0 ? Math.round(Number(fullH)) : Math.max(0, Math.round(vh - FULL_GAP_PX));
  const peek = Math.min(full, PEEK_PX + Math.max(0, Math.round(Number(safeBottom) || 0)));
  const half = Math.min(full, Math.max(peek, Math.round(vh * HALF_FRACTION)));
  return { peek, half, full };
}

function ordered(heights, order) {
  return (order || Object.keys(heights || {}))
    .filter((id) => Number.isFinite(heights && heights[id]))
    .map((id) => ({ id, h: heights[id] }))
    .sort((a, b) => a.h - b.h);
}

/**
 * Where a release lands. Pure. `h` is the height at release, `v` the speed in px/ms with up
 * positive. Faster than FLING_PX_PER_MS goes to the next height in the direction of travel from
 * where the sheet is now (past the last one, the last one); slower goes to the nearest.
 */
export function snapDetent(h, v, heights, order) {
  const list = ordered(heights, order);
  if (!list.length) return null;
  const x = Number(h) || 0;
  const speed = Number(v) || 0;
  if (speed > FLING_PX_PER_MS) {
    const above = list.find((d) => d.h > x + 1);
    return (above || list[list.length - 1]).id;
  }
  if (speed < -FLING_PX_PER_MS) {
    const below = [...list].reverse().find((d) => d.h < x - 1);
    return (below || list[0]).id;
  }
  let best = list[0];
  for (const d of list) if (Math.abs(d.h - x) < Math.abs(best.h - x)) best = d;
  return best.id;
}

/**
 * A tap on the handle: peek → half → full → half → peek (docs/ui-guide.md §3.11). `dir` is 1 while
 * going up and -1 coming down; it turns at either end. Pure.
 */
export function cycleDetent(detent, dir, order) {
  const list = order || DETENTS;
  const i = Math.max(0, list.indexOf(detent));
  let d = dir === -1 ? -1 : 1;
  if (list.length < 2) return { detent: list[0], dir: d };
  if (i + d < 0 || i + d >= list.length) d = -d;
  const j = i + d;
  const turn = j === 0 ? 1 : j === list.length - 1 ? -1 : d;
  return { detent: list[j], dir: turn };
}

/** One step up (by = 1) or down (by = -1), stopping at the ends. Pure. */
export function stepDetent(detent, by, order) {
  const list = order || DETENTS;
  const i = list.indexOf(detent);
  if (i < 0) return list[0];
  return list[Math.min(list.length - 1, Math.max(0, i + (by > 0 ? 1 : -1)))];
}

/**
 * The height under the finger: where the drag began plus how far it went up, with a quarter of any
 * travel past the lowest or the highest height, so the sheet gives a little at the ends and then
 * resists rather than stopping dead. Pure.
 */
export function dragHeight(startH, dy, heights) {
  const list = ordered(heights);
  const want = (Number(startH) || 0) + (Number(dy) || 0);
  if (!list.length) return Math.max(0, want);
  const lo = list[0].h;
  const hi = list[list.length - 1].h;
  if (want > hi) return hi + (want - hi) * RUBBER;
  if (want < lo) return Math.max(0, lo - (lo - want) * RUBBER);
  return want;
}

/** px/ms over the last VELOCITY_WINDOW_MS of {y, t} samples, up positive (y grows downward). */
export function velocityOf(samples) {
  const s = Array.isArray(samples) ? samples.filter((p) => p && Number.isFinite(p.y) && Number.isFinite(p.t)) : [];
  if (s.length < 2) return 0;
  const last = s[s.length - 1];
  let first = s[0];
  for (const p of s) if (last.t - p.t <= VELOCITY_WINDOW_MS) { first = p; break; }
  const dt = last.t - first.t;
  if (!(dt > 0)) return 0;
  return (first.y - last.y) / dt;
}

function wordFor(id) {
  const row = HEIGHT_WORDS.find((w) => w.id === id);
  return row ? row.label : '';
}

/** Not a drag: fields and controls that use a drag of their own. */
function ownsDrag(node) {
  return !!(node && node.closest && node.closest('input, textarea, select, [contenteditable="true"], .sr-time__read'));
}

/**
 * Give `root` the sheet's heights and drag. `root` is laid out at its full height by CSS
 * (`bottom` and `top` fixed) and moved down by `--sr-sheet-y`; this sets that, `data-detent` on
 * the root, and, with `publish`, `--sr-sheet-h` and `data-sheet` on <html> for the pill and the
 * toasts to follow.
 *
 * @param {HTMLElement} root
 * @param {{detents?: string[], initial?: string, heights?: () => object, dismiss?: () => void,
 *          onChange?: (detent: string, h: number) => void, publish?: boolean, label?: string,
 *          grab?: string, scrollers?: string}} opts
 *   grab: a selector for what drags at every height besides the handle (each view's head);
 *   scrollers: what scrolls at the top height and goes back to its top below it.
 */
export function createSheet(root, opts = {}) {
  const order = (opts.detents || DETENTS).slice();
  const canDismiss = typeof opts.dismiss === 'function';
  const docEl = document.documentElement;
  let detent = order.includes(opts.initial) ? opts.initial : order[0];
  let dir = 1;
  let h = 0;
  let drag = null;
  let swallowTimer = 0;
  const grabs = opts.grab ? `[data-sheet-grab], ${opts.grab}` : '[data-sheet-grab]';
  const scrollers = opts.scrollers || '[data-sheet-scroll]';

  // The handle: a real button with a name, a description that says the height, and arrow keys.
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'sr-sheet__handle';
  handle.dataset.sheetGrab = '';
  handle.setAttribute('aria-label', opts.label || COPY.sheet.handle);
  const grabber = document.createElement('span');
  grabber.className = 'sr-sheet__grabber';
  grabber.setAttribute('aria-hidden', 'true');
  const said = document.createElement('span');
  said.className = 'sr-hidden-text';
  said.id = `${root.id || 'sr-sheet'}-height`;
  handle.setAttribute('aria-describedby', said.id);
  handle.append(grabber, said);
  root.prepend(handle);
  root.classList.add('sr-sheet');

  function heights() {
    const got = typeof opts.heights === 'function' ? opts.heights() : null;
    const base = got || sheetHeights({
      viewH: window.innerHeight,
      fullH: root.offsetHeight,
      safeBottom: parseFloat(getComputedStyle(root).paddingBottom) || 0,
    });
    return canDismiss ? { closed: 0, ...base } : base;
  }
  const allowed = () => (canDismiss ? ['closed', ...order] : order);

  function paint(px) {
    const all = heights();
    const full = all[order[order.length - 1]];
    h = px;
    root.style.setProperty('--sr-sheet-y', `${Math.round(Math.max(0, full - px))}px`);
    if (opts.publish) docEl.style.setProperty('--sr-sheet-h', `${Math.round(Math.max(0, px))}px`);
  }

  function describe() {
    const text = t(COPY.sheet.state, { height: wordFor(detent) });
    said.textContent = text;
    handle.title = t(COPY.sheet.title, { height: wordFor(detent) });
  }

  /** Go to a height. `how.silent` skips onChange (a resize re-applying the same height). */
  function set(next, how = {}) {
    if (next === 'closed' && canDismiss) {
      paint(0);
      opts.dismiss();
      return;
    }
    if (!order.includes(next)) return;
    const changed = next !== detent;
    detent = next;
    if (detent === order[order.length - 1]) dir = -1;
    else if (detent === order[0]) dir = 1;
    root.dataset.detent = detent;
    if (opts.publish) docEl.dataset.sheet = detent;
    paint(heights()[detent]);
    describe();
    // Leaving full: the page scrolled at full goes back to its top, so half shows the head again.
    if (detent !== order[order.length - 1]) {
      if (root.matches(scrollers)) root.scrollTop = 0;
      for (const n of root.querySelectorAll(scrollers)) n.scrollTop = 0;
    }
    if (!how.silent && typeof opts.onChange === 'function') opts.onChange(detent, h, changed);
  }

  // --- the drag ------------------------------------------------------------------------------
  function grabbable(target) {
    if (!target || ownsDrag(target)) return false;
    if (target.closest && target.closest(grabs)) return true;
    return detent !== order[order.length - 1];
  }

  function swallow(e) {
    e.preventDefault();
    e.stopPropagation();
    root.removeEventListener('click', swallow, true);
  }

  function onDown(e) {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (!grabbable(e.target)) return;
    root.removeEventListener('click', swallow, true);
    drag = { id: e.pointerId, y: e.clientY, h0: h, moved: false, samples: [{ y: e.clientY, t: e.timeStamp }] };
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = drag.y - e.clientY;
    if (!drag.moved) {
      if (Math.abs(dy) < SLOP_PX) return;
      drag.moved = true;
      try { root.setPointerCapture(e.pointerId); } catch { /* the drag still follows inside the sheet */ }
      root.classList.add('is-dragging');
      docEl.classList.add('sr-sheet-dragging');
    }
    drag.samples.push({ y: e.clientY, t: e.timeStamp });
    if (drag.samples.length > 12) drag.samples.shift();
    paint(dragHeight(drag.h0, dy, heights()));
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    root.classList.remove('is-dragging');
    docEl.classList.remove('sr-sheet-dragging');
    try { root.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    // The click that ends a drag is the drag's, not the button's under the finger.
    root.addEventListener('click', swallow, true);
    clearTimeout(swallowTimer);
    swallowTimer = setTimeout(() => root.removeEventListener('click', swallow, true), SWALLOW_MS);
    const v = e.type === 'pointercancel' ? 0 : velocityOf(d.samples);
    set(snapDetent(h, v, heights(), allowed()) || detent);
  }

  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);

  // --- the handle: a tap cycles, the arrows step ---------------------------------------------
  handle.addEventListener('click', () => {
    const c = cycleDetent(detent, dir, order);
    dir = c.dir;
    set(c.detent);
  });
  handle.addEventListener('keydown', (e) => {
    let to = null;
    if (e.key === 'ArrowUp') to = stepDetent(detent, 1, order);
    else if (e.key === 'ArrowDown') to = stepDetent(detent, -1, order);
    else if (e.key === 'Home') to = order[0];
    else if (e.key === 'End') to = order[order.length - 1];
    if (!to) return;
    e.preventDefault();
    set(to);
  });

  // Keyboard and screen-reader visitors tab into content the sheet hides below the screen's edge:
  // the sheet rises to show what took focus, as a page scrolls to it.
  root.addEventListener('focusin', (e) => {
    const top = order[order.length - 1];
    if (detent === top || e.target === handle || !e.target.getBoundingClientRect) return;
    const r = e.target.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 4) set(top);
  });

  function refresh() {
    if (!drag) set(detent, { silent: true });
  }

  set(detent, { silent: true });

  return {
    handle,
    set,
    detent: () => detent,
    height: () => h,
    heights,
    refresh,
    destroy() {
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
      root.removeEventListener('click', swallow, true);
      clearTimeout(swallowTimer);
      handle.remove();
      root.classList.remove('sr-sheet', 'is-dragging');
      root.style.removeProperty('--sr-sheet-y');
      delete root.dataset.detent;
      if (opts.publish) {
        docEl.style.removeProperty('--sr-sheet-h');
        delete docEl.dataset.sheet;
      }
      docEl.classList.remove('sr-sheet-dragging');
    },
  };
}
