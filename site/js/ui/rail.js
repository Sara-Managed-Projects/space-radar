// ui/rail.js -- the tool rail: three 48 px buttons in one glass column, top right (spec 0061 req 5).
//
// Contract: createRail(ctx, host) -> { root, openShow(), closeShow(), toggleShow() }
// Also exported, pure: railKey(event, activeElement) -> 'show' | 'share' | null
//
//   [layers]   What to show: the layers with their counts and swatches, colour by, sound, density
//   [share]    Share: the one share sheet (ui/share.js ctx.share.open, ui/sharesheet.js), with the
//              postcard, the link and the text (spec 0061 task 8; it was the camera until then)
//   [eye]      Hide everything: ui/cleanview.js (H)
//   [github]   The repository, the mark from ui/github.js (Ivan, 2026-10-02: the next icon after the eye)
//
// WHY. Three loose icons sat in the top right corner at three different offsets, which moved again
// when a card opened (ui.css kept `right: calc(var(--sr-card-w) + 128px)` rules for each), with the
// GitHub mark beside them. The card now lives in the sidebar, so the right edge is always free and
// the tools can be one object: one column, one glass, hairlines between the buttons, as row D draws
// it. The GitHub mark is the rail's last button (it spent 2026-09-30 to 10-02 in the sources footer,
// where Ivan missed it).
//
// KEYS. L opens What to show, P the share sheet; H is ui/cleanview.js's own. Not S for share:
// S is held to move the camera back (scene/camera.js CAMERA_KEYS), and P was the postcard's key,
// so the hand that knew it still finds the picture there. Not while typing in a field and not with
// a modifier, so the browser's shortcuts are left alone (the same rule as H). Escape closes an
// open popover before anything else sees it.

import { COPY } from '../copy/en.js';
import { installShare } from './share.js';
import { createCleanView } from './cleanview.js';
import { createGitHubMark } from './github.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// Two stacked leaves: the layers mark every map app uses. Ours, drawn on the 24-unit box.
const LAYERS_PATH = ['M12 3 3 8l9 5 9-5-9-5Z', 'M3 13l9 5 9-5'];
// Lucide `share` (ISC): the arrow out of the tray, the platform mark for "send this somewhere".
const SHARE_PATH = ['M12 2v13', 'm16 6-4-4-4 4', 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8'];

/** What a key press means to the rail, or null. Pure, like ui/cleanview.js wantsToggle. */
export function railKey(event, activeElement) {
  if (!event || event.defaultPrevented) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const tag = activeElement && activeElement.tagName ? String(activeElement.tagName).toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (activeElement && activeElement.isContentEditable)) return null;
  if (event.key === 'l' || event.key === 'L') return 'show';
  if (event.key === 'p' || event.key === 'P') return 'share';
  return null;
}

/** A 20 px stroked icon, docs/ui-guide.md §3.16: the 24 box, stroke 1.75, round caps and joins. */
function icon(paths) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
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
    if (ctx && ctx.share) ctx.share.close();
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

  // --- Share: the door to the one sheet, which loads on the first press ------------------------
  const share = installShare(ctx);
  const shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.className = 'sr-rail__btn sr-rail__btn--share sr-over-clean';
  shareBtn.setAttribute('aria-label', COPY.rail.share);
  shareBtn.title = COPY.rail.share;
  shareBtn.setAttribute('aria-haspopup', 'dialog');
  shareBtn.appendChild(icon(SHARE_PATH));
  root.appendChild(shareBtn);
  const toggleShare = () => {
    if (share.isOpen()) { share.close(); return; }
    closeShow(false);
    share.open({ opener: shareBtn });
  };
  shareBtn.addEventListener('click', toggleShare);

  // --- Hide: the existing module, seated in the rail --------------------------------------------
  createCleanView(ctx, { host: root, className: 'sr-rail__btn sr-rail__btn--clean' });

  // --- The repository: GitHub's own mark, after the eye ---------------------------------------------
  createGitHubMark(root, { className: 'sr-rail__btn sr-rail__btn--github' });

  // Capture phase, as the postcard menu and the clear screen do: Escape must close the popover
  // before the card underneath hears it and closes too.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); e.stopPropagation(); closeShow(true); return; }
    const what = railKey(e, document.activeElement);
    if (!what) return;
    if (document.documentElement.classList.contains('sr-trip-mode')) return; // the trip owns the screen
    e.preventDefault();
    if (what === 'show') toggleShow();
    else toggleShare();
  }, true);

  const api = { root, openShow, closeShow: () => closeShow(false), toggleShow, ready: () => load() };
  if (ctx) ctx.rail = api;
  return api;
}
