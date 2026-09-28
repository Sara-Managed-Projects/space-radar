// ui/cleanview.js -- one control that takes every panel off the screen, and puts them back.
//
// Contract: createCleanView(ctx) -> { isOn(), set(on), toggle() }
// Also exported, pure, for the test: wantsToggle(event, activeElement) -> 'toggle' | 'leave' | null
//
// WHY. Ivan, 2026-09-28: "should have possibility to hide each panel so fully see the space only".
// Every panel had its own Close, and nothing cleared the screen: the panel, the sources strip, the
// card, the labels, the tab bar and the GitHub mark all stayed, so no view of the scene was ever
// just the scene -- not for looking, and not for a screenshot or a postcard. EVE Online's "hide
// UI" camera mode is the model: one key, everything goes, the scene keeps running.
//
// HOW. A class on <html>. The CSS (ui.css, "clean view") hides every direct child of <body> except
// the scene, the stage-change veil and this button, so a panel added later is hidden without
// anyone remembering to list it here. Hidden with `visibility`, so the phone's view shift
// (scene/viewshift.js), which skips an invisible panel, lets the scene use the whole screen.
// Nothing is destroyed: a trip keeps flying and a card keeps its place, and both come back as
// they were.
//
// KEYS. H toggles (not while typing in a field, and not with a modifier, so the browser's own
// shortcuts are left alone); Escape leaves, before anything else sees it, because with every
// panel hidden the visitor cannot see what else Escape would have closed.

import { COPY } from '../copy/en.js';

const HOST_ID = 'sr-clean';
const ROOT_CLASS = 'sr-clean';
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

export function createCleanView(ctx) {
  const root = document.documentElement;
  let on = false;

  const button = document.createElement('button');
  button.id = HOST_ID;
  button.type = 'button';
  button.className = 'sr-clean-toggle';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  button.appendChild(svg);

  function paint() {
    path.setAttribute('d', on ? EYE_SHUT : EYE_OPEN);
    const label = on ? COPY.clean.show : COPY.clean.hide;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function set(next) {
    const want = !!next;
    if (want === on) return;
    on = want;
    root.classList.toggle(ROOT_CLASS, on);
    paint();
    window.dispatchEvent(new CustomEvent('sr:clean', { detail: { on } }));
  }

  button.addEventListener('click', () => set(!on));
  paint();
  document.body.appendChild(button);

  // Capture phase: Escape must reach this before the card's or the trip's own Escape handlers,
  // which would otherwise close something the visitor cannot see.
  document.addEventListener('keydown', (event) => {
    const what = wantsToggle(event, document.activeElement, on);
    if (!what) return;
    event.preventDefault();
    event.stopPropagation();
    set(what === 'toggle' ? !on : false);
  }, true);

  const api = { isOn: () => on, set, toggle: () => set(!on) };
  if (ctx) ctx.cleanView = api;
  return api;
}
