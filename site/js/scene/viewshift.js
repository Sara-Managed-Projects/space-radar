// scene/viewshift.js -- keep what the camera is looking at in the part of the screen nobody covers.
//
// Contract: createViewShift(camera, canvas, opts) -> { update(dtMs), shiftPx(), shiftXPx(), dispose() }
// Also exported, pure, so the measurement can be tested without a DOM:
//   coveredFromBottom(rects, w, h) -> how many pixels of the canvas, from the bottom up, are under
//                                     full-width panels stacked on its bottom edge
//   coveredFromLeft(rects, w, h)   -> how many, from the left edge, are under a tall docked column
//   coveredFromTop(rects, w, h)    -> how many, from the top down, are under a wide bar at the top
//   pillCovers(rect, w, centreX)   -> the time pill as a bar, when it lies under the subject
//   uncoveredBand(h, top, bottom)  -> {top, bottom, centre, shift}: the band nobody covers, and the
//                                     view offset that puts the centre of the view in its middle
//
// WHY. The camera rig aims at a target and the projection puts that target in the middle of the
// canvas. On a phone the card is a bottom sheet over the lower half of that canvas, so the thing
// the card is about sat on the sheet's top edge, half behind it -- measured 2026-09-22 on the "To
// the edge" trip at 390 px: Sirius's glare cut by the sheet at 50 % of the height, a trip's subject
// and every selection on a phone alike. Nothing in the app knew any part of the canvas was covered.
//
// HOW. THREE's view offset renders a window of a larger virtual image; offsetting the window down
// by d moves everything up by d without touching the camera, its target or its flights. Labels and
// picking go through the same projection matrix, so they move with it. d is half the covered band,
// which puts the centre of the view in the centre of what is left. The desktop sidebar (spec 0061)
// is the same rule turned on its side: a tall column docked on the LEFT edge moves the view right by
// half its right edge (coveredFromLeft). Any other side panel moves nothing.
//
// COST. The panels are measured four times a second, not per frame: reading a layout box after the
// labels have written theirs forces a layout, and a quarter-second is below what a sheet's own
// slide takes. The shift eases toward the measurement, so a card opening does not jolt the scene;
// with reduced motion it snaps.

export const MEASURE_MS = 250;
export const EASE_MS = 180;
export const MAX_SHIFT_FRACTION = 0.3; // never push the centre above 20 % of the height
const FULL_WIDTH = 0.8; // a panel this wide or wider spans the canvas

// The bottom-anchored panels, in no particular order: the phone's sheet (spec 0061 task 3: the
// sidebar at its peek, half or full height, measured where its transform puts it, so a drag moves
// the scene with it), the card wherever it floats, a trip's toolbar under the sheet on a phone and
// a trip's sheet where it floats (spec 0061 task 7; on a desktop the toolbar is a pill a third of
// the width, which the FULL_WIDTH rule leaves out, and the sheet is in the sidebar), and the share
// sheet, which is a bottom sheet on a phone (spec 0061 task 8). Panels were left out of this list
// twice and each time the Earth sat behind one while the free part of the screen showed empty sky
// (Ivan's screenshot, 2026-09-22): a new bottom sheet is a row here. Only the PHONE's sidebar: on a
// desktop it is a column down the left, which is the horizontal case below.
const SELECTORS = [
  'html.sr-phone #sr-side',
  '#sr-card',
  '#sr-trip .sr-trip__toolbar',
  '#sr-trip .sr-tripsheet',
  'html.sr-phone #sr-share',
];

// THE TIME PILL (internal #421). It became two rows on 2026-10-06 (48 px to 102 px) and nothing
// here knew: on a desktop a world's lower limb sat under it, and on a phone at peek it and the
// sheet covered the lower third of the Earth. It is not a full-width bar (560 px on a desktop), so
// the FULL_WIDTH rule leaves it out; what matters is whether it lies under where the subject is
// drawn, the middle of the band the sidebar leaves (pillCovers). It floats PILL_GAP_PX above the
// edge, or the sheet, and that gap is counted as its own.
const PILL_SELECTORS = ['#sr-time'];
export const PILL_GAP_PX = 28;

/**
 * A floating pill as the bar it amounts to: null when it does not lie under the subject's column
 * (`centreX`, canvas px), else its box widened to the canvas and lowered by its gap. Pure.
 */
export function pillCovers(rect, w, centreX) {
  if (!rect || !(w > 0) || !(rect.bottom > rect.top)) return null;
  if (!(rect.left <= centreX && rect.right >= centreX)) return null;
  return { top: rect.top, bottom: rect.bottom + PILL_GAP_PX, width: w };
}

// THE PHONE'S TOP BAR (spec 0061 task 3): the search, the tools and the live line across the top,
// and during a trip its own bar of title and Leave. docs/ui-guide.md §5: the subject sits in the
// middle of the band BETWEEN the top bar and the sheet, not merely above the sheet, or a half
// sheet puts it under the search box.
const TOP_SELECTORS = ['html.sr-phone #sr-top', 'html.sr-phone #sr-trip .sr-trip__top'];
const TOP_REACH = 0.25; // a bar must start in the top quarter to count as docked there

// THE DESKTOP SIDEBAR (spec 0061 req 1). A 360 px column 20 px in from the left covers a quarter of
// a 1440 px window, and the globe centred on the WINDOW sat with its left limb under it. Row D draws
// the Earth centred on what is left (150 px right of the window's middle at 1440): the view is moved
// right by half the column's right edge, the same half-the-covered-band rule as the bottom.
const LEFT_SELECTORS = ['html:not(.sr-phone) #sr-side'];
const LEFT_EDGE_PX = 40; // a column must start this near the left edge to count as docked there
const TALL = 0.6; // and run at least this share of the canvas's height

/**
 * @param {{left:number, right:number, top:number, bottom:number}[]} rects  canvas-relative CSS px
 * @returns {number} px covered from the left edge by a tall column docked on it
 */
export function coveredFromLeft(rects, w, h) {
  if (!(w > 0) || !(h > 0)) return 0;
  let edge = 0;
  for (const r of Array.isArray(rects) ? rects : []) {
    if (!r || r.left > LEFT_EDGE_PX || r.right <= 0 || r.bottom - r.top < h * TALL) continue;
    edge = Math.max(edge, Math.min(r.right, w * 0.5));
  }
  return edge;
}

/**
 * @param {{top:number, bottom:number, width:number}[]} rects  canvas-relative CSS px
 * @returns {number} px covered from the bottom edge up by panels stacked on it
 */
export function coveredFromBottom(rects, w, h) {
  if (!(w > 0) || !(h > 0)) return 0;
  const wide = (Array.isArray(rects) ? rects : []).filter(
    (r) => r && r.width >= w * FULL_WIDTH && r.bottom > r.top && r.top < h
  );
  // Walk up from the bottom edge: a panel counts if it reaches down to the edge of what is already
  // covered (4 px of slack for borders and rounding), so a card resting on a bar counts and a panel
  // floating mid-screen does not.
  let edge = h;
  let moved = true;
  while (moved) {
    moved = false;
    for (const r of wide) {
      // The edge only ever rises, so the walk ends. (Found 2026-10-08: a panel whose top is ABOVE
      // the canvas, a full sheet scrolled by a focus, kept "moving" the edge from 0 to 0 for ever
      // and hung the page.)
      const top = Math.max(0, r.top);
      if (r.bottom >= edge - 4 && top < edge) {
        edge = top;
        moved = true;
      }
    }
  }
  return h - edge;
}

/**
 * @param {{top:number, bottom:number, width:number}[]} rects  canvas-relative CSS px
 * @returns {number} px covered from the top edge down by wide bars that start near it
 */
export function coveredFromTop(rects, w, h) {
  if (!(w > 0) || !(h > 0)) return 0;
  let edge = 0;
  for (const r of Array.isArray(rects) ? rects : []) {
    if (!r || r.width < w * FULL_WIDTH || !(r.bottom > r.top) || r.top > h * TOP_REACH) continue;
    edge = Math.max(edge, Math.min(r.bottom, h * 0.5));
  }
  return edge;
}

/** The view offset for a covered band: half of it, capped. */
export function shiftFor(coveredPx, h) {
  if (!(coveredPx > 0) || !(h > 0)) return 0;
  return Math.min(coveredPx / 2, h * MAX_SHIFT_FRACTION);
}

/**
 * The band nobody covers, between `top` px of bar and `bottom` px of sheet, and the view offset
 * that moves the centre of the view into its middle: half the difference, capped either way.
 * Positive moves the picture up. Pure.
 */
export function uncoveredBand(h, top, bottom) {
  const H = Number(h) > 0 ? Number(h) : 0;
  const t = Math.max(0, Number(top) || 0);
  const b = Math.max(0, Number(bottom) || 0);
  const cap = H * MAX_SHIFT_FRACTION;
  const shift = Math.max(-cap, Math.min(cap, (b - t) / 2));
  return { top: t, bottom: H - b, centre: H / 2 - shift, shift };
}

export function createViewShift(camera, canvas, opts = {}) {
  const doc = opts.document || (typeof document !== 'undefined' ? document : null);
  const reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  // The sheet changing height or a view changing is measured on the next frame, not up to a
  // quarter-second later: the shift then eases alongside the sheet's own 320 ms snap.
  const remeasure = () => { sinceMeasure = Infinity; };
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('sr:shell', remeasure);
  let target = 0;
  let current = 0;
  let targetX = 0;
  let currentX = 0;
  let sinceMeasure = Infinity;
  let lastKey = '';

  function visible(node) {
    if (!node || node.hidden) return false;
    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(node) : null;
    return !(cs && (cs.display === 'none' || cs.visibility === 'hidden'));
  }

  function rectsOf(selectors, c) {
    const rects = [];
    for (const sel of selectors) {
      const node = doc.querySelector(sel);
      if (!visible(node)) continue;
      const r = node.getBoundingClientRect();
      if (!(r.height > 0)) continue;
      rects.push({ top: r.top - c.top, bottom: r.bottom - c.top, width: r.width });
    }
    return rects;
  }

  function measure() {
    if (!doc || !canvas || !canvas.getBoundingClientRect) return 0;
    const c = canvas.getBoundingClientRect();
    const rects = rectsOf(SELECTORS, c);
    for (const sel of PILL_SELECTORS) {
      const node = doc.querySelector(sel);
      if (!visible(node)) continue;
      const r = node.getBoundingClientRect();
      const bar = pillCovers({ left: r.left - c.left, right: r.right - c.left, top: r.top - c.top, bottom: r.bottom - c.top }, c.width, c.width / 2 + targetX);
      if (bar) rects.push(bar);
    }
    const bottom = coveredFromBottom(rects, c.width, c.height);
    const top = coveredFromTop(rectsOf(TOP_SELECTORS, c), c.width, c.height);
    return Math.round(uncoveredBand(c.height, top, bottom).shift);
  }

  function measureLeft() {
    if (!doc || !canvas || !canvas.getBoundingClientRect) return 0;
    const c = canvas.getBoundingClientRect();
    const rects = [];
    for (const sel of LEFT_SELECTORS) {
      const node = doc.querySelector(sel);
      if (!visible(node)) continue;
      const r = node.getBoundingClientRect();
      if (!(r.width > 0)) continue;
      rects.push({ left: r.left - c.left, right: r.right - c.left, top: r.top - c.top, bottom: r.bottom - c.top });
    }
    return Math.round(coveredFromLeft(rects, c.width, c.height) / 2);
  }

  function update(dtMs) {
    sinceMeasure += dtMs;
    if (sinceMeasure >= MEASURE_MS) {
      sinceMeasure = 0;
      targetX = measureLeft(); // first: the pill is judged against the column the subject is in
      target = measure();
    }
    const w = canvas.clientWidth | 0;
    const h = canvas.clientHeight | 0;
    if (!w || !h) return;
    const k = reduced && reduced.matches ? 1 : 1 - Math.exp(-dtMs / EASE_MS);
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.5) current = target;
    currentX += (targetX - currentX) * k;
    if (Math.abs(targetX - currentX) < 0.5) currentX = targetX;
    const px = Math.round(current);
    const pxX = Math.round(currentX);
    const key = `${w}x${h}:${px}:${pxX}`;
    if (key === lastKey) return; // resize() in scene/renderer.js resets the projection; the key covers it
    lastKey = key;
    if (px === 0 && pxX === 0) camera.clearViewOffset();
    // A window moved LEFT by pxX moves the picture right by pxX, into the band the sidebar leaves.
    else camera.setViewOffset(w, h, -pxX, px, w, h);
  }

  return {
    update,
    shiftPx: () => Math.round(current),
    shiftXPx: () => Math.round(currentX),
    dispose() {
      camera.clearViewOffset();
      if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('sr:shell', remeasure);
    },
  };
}
