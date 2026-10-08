// ui/base.js -- "Return to base": one control that brings the view home from anywhere
// (public #241).
//
// Contract: createBase(ctx, opts) -> { root, refresh(), go(), destroy() }
// Also exported, pure, for tests/test_base.mjs:
//   awayFromBase({ stageId, selected, live, distance, homeDistance, tripRunning }) -> boolean
//   NEAR, FAR
//   returnToBase(ctx) -> does it: the trip left, the clock live, the Earth whole in view, the home
//     view of the sidebar, and the way back offered (ui/camundo.js)
//
// WHY. A visitor four clicks into the Pleiades, or a week ahead on the clock, or on a card of a
// card, had no one way back to where they started: Escape pops one thing, the Earth tab changes
// the stage but not the clock, "Live" changes the clock but not the stage. Home is the first
// frame: the Earth's stage, nothing selected, the clock live, the whole globe in view.
//
// WHERE. A house in the tool rail, first, on a desktop; the same button in the phone's top bar
// beside What to show (ui.css shows it there). It is there ONLY WHILE THE VIEW IS AWAY: at home
// it has nothing to do, and a control that does nothing is clutter (the pill's "Live" button
// follows the same rule). During a trip the rail is hidden, so the trip's own top bar carries a
// house beside Leave (ui/tripframe.js): it leaves the trip and comes home.
//
// AWAY means: another stage, or a selection, or a clock that is not live, or a camera much
// nearer or much farther than the home view (under NEAR or over FAR times its distance). Turning
// the globe is not being away.
//
// THE WAY BACK. Coming home is the app moving the view for the visitor, so it remembers the view
// first and offers "Back to where you were" (docs/ui-guide.md section 3.14), unless a trip was
// just left: the trip's own leave has already put its saved view back.
//
// Fetched after the first visit has settled (main.js), never at boot.

import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { icon } from './icons.js';

/** Nearer than this share of the home distance, or farther than FAR times it, is away. */
export const NEAR = 0.5;
export const FAR = 2;
const REFRESH_MS = 1000;

/** Is the view somewhere other than the first frame? Pure. */
export function awayFromBase({ stageId, selected = false, live = true, distance = NaN, homeDistance = NaN, tripRunning = false } = {}) {
  if (tripRunning) return true;
  if (stageId && stageId !== 'earth') return true;
  if (selected) return true;
  if (!live) return true;
  if (Number.isFinite(distance) && homeDistance > 0) {
    if (distance < homeDistance * NEAR || distance > homeDistance * FAR) return true;
  }
  return false;
}

const inTrip = (doc) => doc.documentElement.classList.contains('sr-trip-mode');

/** Bring the view home. Returns false when there was nothing to do it with. */
export function returnToBase(ctx, doc = document) {
  if (!ctx || typeof ctx.frameEarth !== 'function') return false;
  const wasTrip = inTrip(doc);
  if (wasTrip && ctx.trip && typeof ctx.trip.stop === 'function') ctx.trip.stop('left');
  const remember = !wasTrip && typeof ctx.rememberView === 'function' && typeof ctx.offerUndo === 'function';
  if (remember) ctx.rememberView();
  const run = () => {
    if (ctx.clock && ctx.clock.mode && ctx.clock.mode !== 'live' && typeof ctx.clock.live === 'function') ctx.clock.live();
    ctx.frameEarth();
    if (ctx.shell && typeof ctx.shell.show === 'function') ctx.shell.show('home');
    if (remember) ctx.offerUndo(COPY.base.name);
  };
  const moves = ctx.stage && ctx.stage.worldId !== 'earth';
  if (moves && ctx.veil && typeof ctx.veil.through === 'function') ctx.veil.through(run);
  else run();
  return true;
}

/**
 * @param {Object} ctx  the app: stage, clock, cameraRig, selected(), homeDistance(), frameEarth, shell
 * @param {{ host?: Element, win?: Window }} [opts]  host: the rail
 */
export function createBase(ctx, opts = {}) {
  const win = opts.win || window;
  const doc = win.document;
  const B = COPY.base;
  const root = document.createElement('button');
  root.type = 'button';
  root.className = 'sr-rail__btn sr-rail__btn--base';
  root.setAttribute('aria-label', B.label);
  root.title = B.title;
  root.appendChild(icon('house', 20));
  // IN THE RAIL ONLY WHILE AWAY: put in and taken out, not hidden. The rail's buttons are `display:
  // grid`, which beats the `hidden` attribute, and a rule to answer that would have to be in the
  // first visit's stylesheet for a button a first visit never shows.
  const host = opts.host || doc.getElementById('sr-rail');
  let on = false;

  function refresh() {
    const rig = ctx.cameraRig && ctx.cameraRig.state;
    const away = awayFromBase({
      stageId: ctx.stage ? ctx.stage.worldId : 'earth',
      selected: !!(typeof ctx.selected === 'function' && ctx.selected()),
      live: !ctx.clock || !ctx.clock.mode || ctx.clock.mode === 'live',
      distance: rig && !rig.flying ? rig.distance : NaN,
      homeDistance: typeof ctx.homeDistance === 'function' ? ctx.homeDistance() : NaN,
    });
    // Not over a clear screen (H): the rail there is the eye and Share alone (ui/cleanview.js).
    const want = away && !doc.documentElement.classList.contains('sr-clean');
    if (want === on || !host) return;
    on = want;
    if (want) { host.insertBefore(root, host.firstChild); return; }
    // Going with the focus on it would drop the focus to the page: hand it to the rail's next.
    const next = doc.activeElement === root ? root.nextElementSibling : null;
    root.remove();
    if (next) next.focus({ preventScroll: true });
  }
  const go = () => returnToBase(ctx, doc);
  root.addEventListener('click', go);
  const onAny = () => refresh();
  win.addEventListener('sr:stage', onAny);
  win.addEventListener('sr:select', onAny);
  win.addEventListener('sr:clean', onAny);
  const timer = win.setInterval(refresh, REFRESH_MS);
  refresh();
  return {
    root,
    refresh,
    go,
    destroy() {
      win.clearInterval(timer);
      win.removeEventListener('sr:stage', onAny);
      win.removeEventListener('sr:select', onAny);
      win.removeEventListener('sr:clean', onAny);
      root.remove();
    },
  };
}
