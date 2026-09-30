// ui/rail.js -- the tool rail: three 48 px buttons in one glass column, top right (spec 0061 req 5).
//
// Contract: createRail(ctx, host) -> { root, openShow(), closeShow(), toggleShow() }
// Also exported, pure: railKey(event, activeElement) -> 'show' | 'print' | null
//
//   [layers]   What to show: the layers with their counts and swatches, colour by, sound, density
//   [camera]   Postcard: ui/printcard.js's JPEG / PDF menu, anchored to this button
//   [eye]      Hide everything: ui/cleanview.js (H)
//
// WHY. Three loose icons sat in the top right corner at three different offsets, which moved again
// when a card opened (ui.css kept `right: calc(var(--sr-card-w) + 128px)` rules for each), with the
// GitHub mark beside them. The card now lives in the sidebar, so the right edge is always free and
// the tools can be one object: one column, one glass, hairlines between the buttons, as row D draws
// it. The GitHub mark went to the sources sheet's footer (ui/status.js).
//
// KEYS. L opens What to show, P the postcard menu; H is ui/cleanview.js's own. Not while typing in
// a field and not with a modifier, so the browser's shortcuts are left alone (the same rule as H).
// Escape closes an open popover before anything else sees it.

import { COPY } from '../copy/en.js';
import { createPrintButton } from './printcard.js';
import { createCleanView } from './cleanview.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// Two stacked leaves: the layers mark every map app uses. Ours, drawn on the 24-unit box.
const LAYERS_PATH = 'M12 3 3 8l9 5 9-5-9-5Z M3 13l9 5 9-5';

/** What a key press means to the rail, or null. Pure, like ui/cleanview.js wantsToggle. */
export function railKey(event, activeElement) {
  if (!event || event.defaultPrevented) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const tag = activeElement && activeElement.tagName ? String(activeElement.tagName).toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (activeElement && activeElement.isContentEditable)) return null;
  if (event.key === 'l' || event.key === 'L') return 'show';
  if (event.key === 'p' || event.key === 'P') return 'print';
  return null;
}

function icon(d) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.6');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  return svg;
}

export function createRail(ctx, host) {
  const root = document.createElement('nav');
  root.id = 'sr-rail';
  root.className = 'sr-rail sr-float';
  root.setAttribute('aria-label', COPY.rail.label);
  (host || document.body).appendChild(root);

  // --- What to show ------------------------------------------------------------------------------
  const showBtn = document.createElement('button');
  showBtn.type = 'button';
  showBtn.className = 'sr-rail__btn sr-rail__btn--show';
  showBtn.setAttribute('aria-label', COPY.rail.show);
  showBtn.title = COPY.rail.show;
  showBtn.setAttribute('aria-haspopup', 'dialog');
  showBtn.setAttribute('aria-expanded', 'false');
  showBtn.appendChild(icon(LAYERS_PATH));
  root.appendChild(showBtn);

  const pop = document.createElement('div');
  pop.id = 'sr-show';
  pop.className = 'sr-pop sr-float';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', COPY.controls.layersTitle);
  pop.hidden = true;
  document.body.appendChild(pop);
  // Its contents are built on the first opening: ui/whattoshow.js and the colour key are 15 kB of a
  // first visit that most visitors never open (0061 req 14).
  let show = null;
  let loading = null;
  const load = () => loading || (loading = import('./whattoshow.js').then((m) => {
    show = m.createWhatToShow(ctx);
    pop.appendChild(show.root);
    return show;
  }).catch((e) => { loading = null; console.warn('What to show did not load', e); }));

  function openShow() {
    if (!pop.hidden) return;
    if (ctx && ctx.printCard) ctx.printCard.close();
    pop.hidden = false;
    showBtn.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    load().then(() => {
      if (pop.hidden || !show) return;
      show.refresh();
      const first = pop.querySelector('input, button, select');
      if (first && (document.activeElement === showBtn || document.activeElement === document.body)) first.focus({ preventScroll: true });
    });
  }
  function closeShow(returnFocus) {
    if (pop.hidden) return;
    pop.hidden = true;
    showBtn.setAttribute('aria-expanded', 'false');
    root.classList.remove('is-open');
    if (returnFocus) showBtn.focus({ preventScroll: true });
  }
  const toggleShow = () => (pop.hidden ? openShow() : closeShow(false));
  showBtn.addEventListener('click', toggleShow);
  document.addEventListener('pointerdown', (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !showBtn.contains(e.target)) closeShow(false);
  });

  // --- Postcard and Hide: the two existing modules, seated in the rail ---------------------------
  createPrintButton(ctx, { host: root, className: 'sr-rail__btn sr-rail__btn--print' });
  createCleanView(ctx, { host: root, className: 'sr-rail__btn sr-rail__btn--clean' });

  // Capture phase, as the postcard menu and the clear screen do: Escape must close the popover
  // before the card underneath hears it and closes too.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); e.stopPropagation(); closeShow(true); return; }
    const what = railKey(e, document.activeElement);
    if (!what) return;
    if (document.documentElement.classList.contains('sr-trip-mode')) return; // the trip owns the screen
    e.preventDefault();
    if (what === 'show') toggleShow();
    else if (ctx && ctx.printCard) { closeShow(false); ctx.printCard.toggle(); }
  }, true);

  const api = { root, openShow, closeShow: () => closeShow(false), toggleShow, ready: () => load() };
  if (ctx) ctx.rail = api;
  return api;
}
