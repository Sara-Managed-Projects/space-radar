// ui/cleanview.js -- one control that takes every panel off the screen, and puts them back.
//
// Contract: createCleanView(ctx) -> { isOn(), set(on), toggle(), state(), setState(s) }
// Also exported, pure, for the test: wantsToggle(event, activeElement) -> 'toggle' | 'leave' | null,
//   nextScreen(state, key, prev) -> 'full' | 'hud' | 'clear' | null, SCREENS, EYE_IDLE_MS
//
// WHY. Ivan, 2026-09-28: "should have possibility to hide each panel so fully see the space only".
// Every panel had its own Close, and nothing cleared the screen: the panel, the sources strip, the
// card, the labels, the tab bar and the GitHub mark all stayed, so no view of the scene was ever
// just the scene -- not for looking, and not for a screenshot or a postcard. EVE Online's "hide
// UI" camera mode is the model: one key, everything goes, the scene keeps running.
//
// HOW. A class on <html>. The CSS (ui.css, "clean view") hides every direct child of <body> except
// the scene, the stage-change veil and what is marked `.sr-over-clean` (this button, the postcard
// camera, its menu and the toast), so a panel added later is hidden without
// anyone remembering to list it here. Hidden with `visibility`, so the phone's view shift
// (scene/viewshift.js), which skips an invisible panel, lets the scene use the whole screen.
// Nothing is destroyed: a trip keeps flying and a card keeps its place, and both come back as
// they were.
//
// THREE SCREENS (spec 0046 task 3, internal #126). Full; HUD, where the panels go and what is
// about the scene stays (the labels, the reticle with its tag and chevron, the time pill); and
// Clear, the scene alone. `h` goes to Clear and back; Shift+H goes to HUD (and from HUD on to
// Clear); Escape always comes back to Full. Classes on <html>: `sr-clean` for Clear, as before,
// and `sr-hud`. While the panels are away the eye is dim, and after three seconds without a
// pointer or a key it fades out, so a still picture has nothing on it; any movement brings it back.
// The first time in a visit that the panels go, one line says which key brings them back.
//
// KEYS. H toggles (not while typing in a field, and not with a modifier, so the browser's own
// shortcuts are left alone); Escape leaves, before anything else sees it, because with every
// panel hidden the visitor cannot see what else Escape would have closed.

import { COPY } from '../copy/en.js';

const HOST_ID = 'sr-clean';
const ROOT_CLASS = 'sr-clean';
const HUD_CLASS = 'sr-hud';
const IDLE_CLASS = 'is-idle';
export const SCREENS = ['full', 'hud', 'clear'];
/** How long the eye stays after the last pointer move or key before it fades, ms. */
export const EYE_IDLE_MS = 3000;

/**
 * The screen a key leads to, or null when the key is not ours here. `key` is 'h', 'H' (Shift+H) or
 * 'Escape'; `prev` is the screen before this one, so `h` on a clear screen goes back to the HUD
 * when that is where it came from. Pure.
 */
export function nextScreen(state, key, prev) {
  if (key === 'Escape') return state === 'full' ? null : 'full';
  if (key === 'H') return state === 'hud' ? 'clear' : 'hud';
  if (key === 'h') return state === 'clear' ? (prev === 'hud' ? 'hud' : 'full') : 'clear';
  return null;
}
const SVG_NS = 'http://www.w3.org/2000/svg';

// Two drawings, ours: an open eye (panels shown; press to hide them) and an eye with a stroke
// through it (panels hidden; press to bring them back). 24-unit box, stroked, no fill.
const EYE_OPEN = 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z';
const EYE_SHUT = 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z M4 4l16 16';

/**
 * What a key press means here, or null. Pure: the caller passes the event's fields and the
 * focused element, so the test needs no DOM.
 */
export function wantsToggle(event, activeElement, on) {
  if (!event || event.defaultPrevented) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const tag = activeElement && activeElement.tagName ? String(activeElement.tagName).toUpperCase() : '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!(activeElement && activeElement.isContentEditable);
  if (event.key === 'Escape') return on ? 'leave' : null;
  if (typing) return null;
  if (event.key === 'h' || event.key === 'H') return 'toggle';
  return null;
}

/**
 * @param {Object} ctx
 * @param {{host?: Element, className?: string}} [opts]  spec 0061: the button is the tool rail's
 *   third (ui/rail.js). The rail is inside #sr-shell, which the clear screen hides like any panel;
 *   ui.css brings this one button back, alone and dim, in the rail's corner.
 */
export function createCleanView(ctx, opts = {}) {
  const root = document.documentElement;
  let state = 'full';
  let prev = 'full';
  let hinted = false;
  let idleTimer = null;

  const button = document.createElement('button');
  button.id = HOST_ID;
  button.type = 'button';
  button.className = `${opts.className || 'sr-clean-toggle'} sr-over-clean`;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', opts.host ? '20' : '22');
  svg.setAttribute('height', opts.host ? '20' : '22');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.75');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  button.appendChild(svg);

  function paint() {
    const away = state !== 'full';
    path.setAttribute('d', away ? EYE_SHUT : EYE_OPEN);
    const label = away ? COPY.clean.show : COPY.clean.hide;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.setAttribute('aria-pressed', away ? 'true' : 'false');
  }

  // The eye fades when nothing has moved for a while, and only while the panels are away.
  function wake() {
    button.classList.remove(IDLE_CLASS);
    clearTimeout(idleTimer);
    idleTimer = state === 'full' ? null : setTimeout(() => { if (state !== 'full' && document.activeElement !== button) button.classList.add(IDLE_CLASS); }, EYE_IDLE_MS);
  }

  function hint() {
    if (hinted) return;
    hinted = true;
    // ui/share.js is not a first visit's module; its toast stays over a clear screen.
    import('./share.js').then((m) => m.toast(COPY.clean.hint, 5000)).catch(() => {});
  }

  function setState(next) {
    if (!SCREENS.includes(next) || next === state) return;
    prev = state;
    state = next;
    root.classList.toggle(ROOT_CLASS, state === 'clear');
    root.classList.toggle(HUD_CLASS, state === 'hud');
    paint();
    wake();
    if (state !== 'full') hint();
    // `on` is what it always was, the clear screen: photo mode and the Tonight view listen for it.
    window.dispatchEvent(new CustomEvent('sr:clean', { detail: { on: state === 'clear', state } }));
  }
  const set = (on) => setState(on ? 'clear' : 'full');

  button.addEventListener('click', () => setState(state === 'full' ? 'clear' : 'full'));
  for (const type of ['pointermove', 'pointerdown', 'keydown']) window.addEventListener(type, () => { if (state !== 'full') wake(); }, { passive: true });
  paint();
  (opts.host || document.body).appendChild(button);

  // Capture phase: Escape must reach this before the card's or the trip's own Escape handlers,
  // which would otherwise close something the visitor cannot see.
  document.addEventListener('keydown', (event) => {
    const what = wantsToggle(event, document.activeElement, state !== 'full');
    if (!what) return;
    // Shift decides, not the letter's case: Caps Lock sends 'H' without it.
    const next = nextScreen(state, what === 'leave' ? 'Escape' : event.shiftKey ? 'H' : 'h', prev);
    if (!next) return;
    event.preventDefault();
    event.stopPropagation();
    setState(next);
  }, true);

  const api = { isOn: () => state === 'clear', set, toggle: () => set(state !== 'clear'), state: () => state, setState };
  if (ctx) ctx.cleanView = api;
  return api;
}
