// scene/viewshift.js -- keep what the camera is looking at in the part of the screen nobody covers.
//
// Contract: createViewShift(camera, canvas, opts) -> { update(dtMs), shiftPx(), dispose() }
// Also exported, pure, so the measurement can be tested without a DOM:
//   coveredFromBottom(rects, w, h) -> how many pixels of the canvas, from the bottom up, are under
//                                     full-width panels stacked on its bottom edge
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
// which puts the centre of the view in the centre of what is left. A side panel (the desktop card)
// is not full width and moves nothing.
//
// COST. The panels are measured four times a second, not per frame: reading a layout box after the
// labels have written theirs forces a layout, and a quarter-second is below what a sheet's own
// slide takes. The shift eases toward the measurement, so a card opening does not jolt the scene;
// with reduced motion it snaps.

export const MEASURE_MS = 250;
export const EASE_MS = 180;
export const MAX_SHIFT_FRACTION = 0.3; // never push the centre above 20 % of the height
const FULL_WIDTH = 0.8; // a panel this wide or wider spans the canvas

// The bottom-anchored panels, in no particular order: the object card (a bottom sheet on a phone),
// the trip's bottom bar, the phone's tab bar, and the two drawers the tab bar opens (Trips &
// layers, and the sources panel). The drawers were left out until 2026-09-22: with one open, the
// Earth sat behind it and the free half of the screen above showed empty sky (Ivan's screenshot).
// Only the PHONE's open drawers: on a desktop #sr-status is the permanent strip along the bottom
// and #sr-controls the bar along the top, and neither should move the scene.
const SELECTORS = [
  '#sr-card',
  '#sr-trip .sr-trip__bar--bottom',
  '.sr-mobilebar',
  'html.sr-phone #sr-controls.sr-drawer-open',
  'html.sr-phone #sr-status.sr-drawer-open',
];

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
      if (r.bottom >= edge - 4 && r.top < edge) {
        edge = Math.max(0, r.top);
        moved = true;
      }
    }
  }
  return h - edge;
}

/** The view offset for a covered band: half of it, capped. */
export function shiftFor(coveredPx, h) {
  if (!(coveredPx > 0) || !(h > 0)) return 0;
  return Math.min(coveredPx / 2, h * MAX_SHIFT_FRACTION);
}

export function createViewShift(camera, canvas, opts = {}) {
  const doc = opts.document || (typeof document !== 'undefined' ? document : null);
  const reduced = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let target = 0;
  let current = 0;
  let sinceMeasure = Infinity;
  let lastKey = '';

  function visible(node) {
    if (!node || node.hidden) return false;
    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(node) : null;
    return !(cs && (cs.display === 'none' || cs.visibility === 'hidden'));
  }

  function measure() {
    if (!doc || !canvas || !canvas.getBoundingClientRect) return 0;
    const c = canvas.getBoundingClientRect();
    const rects = [];
    for (const sel of SELECTORS) {
      const node = doc.querySelector(sel);
      if (!visible(node)) continue;
      const r = node.getBoundingClientRect();
      if (!(r.height > 0)) continue;
      rects.push({ top: r.top - c.top, bottom: r.bottom - c.top, width: r.width });
    }
    return shiftFor(coveredFromBottom(rects, c.width, c.height), c.height);
  }

  function update(dtMs) {
    sinceMeasure += dtMs;
    if (sinceMeasure >= MEASURE_MS) {
      sinceMeasure = 0;
      target = measure();
    }
    const w = canvas.clientWidth | 0;
    const h = canvas.clientHeight | 0;
    if (!w || !h) return;
    const k = reduced && reduced.matches ? 1 : 1 - Math.exp(-dtMs / EASE_MS);
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.5) current = target;
    const px = Math.round(current);
    const key = `${w}x${h}:${px}`;
    if (key === lastKey) return; // resize() in scene/renderer.js resets the projection; the key covers it
    lastKey = key;
    if (px === 0) camera.clearViewOffset();
    else camera.setViewOffset(w, h, 0, px, w, h);
  }

  return {
    update,
    shiftPx: () => Math.round(current),
    dispose() { camera.clearViewOffset(); },
  };
}
