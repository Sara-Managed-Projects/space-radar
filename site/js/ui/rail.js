// ui/rail.js -- the tool rail: three 48 px buttons in one glass column, top right (spec 0061 req 5).
//
// Contract: createRail(ctx, host) -> { root, openShow(), closeShow(), closeMore(), toggleShow() }
// Also exported, pure: railKey(event, activeElement) -> 'show' | 'share' | 'keys' | null
//
//   [layers]   What to show: the layers with their counts and swatches, colour by, sound, density
//   [share]    Share: the one share sheet (ui/share.js ctx.share.open, ui/sharesheet.js), with the
//              postcard, the link and the text (spec 0061 task 8; it was the camera until then)
//   [eye]      Hide everything: ui/cleanview.js (H)
//   [tour]     The tour (ui/onboarding.js, internal spec 0074; the maintainer, 2026-10-14: "on the right should
//              appear another icon of onboarding"): fetched on the first press, a row of More on a phone
//   [blog]     The journal at blog.spaceradar.ai (the maintainer, 2026-11-02), a link in a new tab, a row of More on a phone
//   [games]    The team's space games at games.spaceradar.ai (the maintainer, 2026-11-11: off the explore panel, onto the rail,
//              "animated"), a link in a new tab with the chrome's one slow breath (ui.css), a row of More on a phone
//   [mail]     Free email updates (2026-11-10): a popover, #sr-sub, built by ui/subscribepop.js on the first press (the What
//              to show pattern), a row of More on a phone. It opens only on a click; Escape, Close and a press outside shut it
//   [github]   The repository, the mark from ui/github.js (the maintainer, 2026-10-02: the next icon after the eye)
//   [more]     The phone only: Share, Hide and the repository, folded into one menu (below)
//
// WHY. Three loose icons sat in the top right corner at three different offsets, which moved again
// when a card opened (ui.css kept `right: calc(var(--sr-card-w) + 128px)` rules for each), with the
// GitHub mark beside them. The card now lives in the sidebar, so the right edge is always free and
// the tools can be one object: one column, one glass, hairlines between the buttons, as row D draws
// it. The GitHub mark is the rail's last button (it spent 2026-09-30 to 10-02 in the sources footer,
// where the maintainer missed it).
//
// KEYS. L opens What to show, P the share sheet, ? every key (ui/keyhint.js); H is ui/cleanview.js's own. Not S for share:
// S is held to move the camera back (scene/camera.js CAMERA_KEYS), and P was the postcard's key,
// so the hand that knew it still finds the picture there. Not while typing in a field and not with
// a modifier, so the browser's shortcuts are left alone (the same rule as H). Escape closes an
// open popover before anything else sees it.
//
// ON A PHONE (spec 0061 task 3, docs/ui-guide.md §3.8). The rail sits in the top bar beside the
// search (ui/shell.js), and four 48 px squares there would leave the search a third of a 390 px
// screen. What to show keeps its own button -- it is the one tool a visitor reaches for -- and the
// other three fold into More: a menu of three named rows, Share, Hide the panels and the source on
// GitHub, each the same action as its rail button (the buttons stay, out of sight, so their keys,
// their states and the clear screen's way back are unchanged). A row has its name in words: a
// menu of bare icons is a guessing game (NN/g, icon usability). On a desktop More is not drawn.

import { COPY } from '../copy/en.js';
import { installShare } from './share.js';
import { createCleanView } from './cleanview.js';
import { createGitHubMark } from './github.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// Two stacked leaves: the layers mark every map app uses. Ours, drawn on the 24-unit box.
const LAYERS_PATH = ['M12 3 3 8l9 5 9-5-9-5Z', 'M3 13l9 5 9-5'];
// Lucide `share` (Feather-derived, MIT: CREDITS.md): the arrow out of the tray, the platform mark for "send this somewhere".
const SHARE_PATH = ['M12 2v13', 'm16 6-4-4-4 4', 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8'];
// Lucide `ellipsis-vertical` (Feather's `more-vertical`, MIT): three dots, the circles written as two arcs each.
const MORE_PATH = ['M12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z', 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z', 'M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z'];
// Lucide `eye-off` (ISC), for the menu's Hide row.
const HIDE_PATH = [
  'M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49',
  'M14.084 14.158a3 3 0 0 1-4.242-4.242',
  'M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143',
  'm2 2 20 20',
];

// Lucide `circle-question-mark` (Feather's `help-circle`, MIT): the mark every app starts its help with. The circle as one path.
const TOUR_PATH = ['M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'];

// Lucide `newspaper` (ISC): the mark for the journal.
// Lucide `mail` (ISC), the rectangle as a path: the envelope of the email updates.
const MAIL_PATH = ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'];
// Lucide `gamepad` (ISC), its rectangle, cross and buttons as one path: the Games link.
const GAMEPAD_PATH = ['M6 12h4M8 10v4M15 13h.01M18 11h.01M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z'];
// Lucide `box` (ISC): the Models link.
const MODELS_PATH = ['M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z', 'm3.3 7 8.7 5 8.7-5', 'M12 22V12'];
// Lucide `circle-play` (ISC): the Video link.
const VIDEO_PATH = ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z', 'm10 8 6 4-6 4Z'];
const BLOG_PATH = ['M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2', 'M18 14h-8', 'M15 18h-5', 'M10 6h8v4h-8V6Z'];

/** What a key press means to the rail, or null. Pure, like ui/cleanview.js wantsToggle. */
export function railKey(event, activeElement) {
  if (!event || event.defaultPrevented) return null;
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const tag = activeElement && activeElement.tagName ? String(activeElement.tagName).toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (activeElement && activeElement.isContentEditable)) return null;
  if (event.key === 'l' || event.key === 'L') return 'show';
  if (event.key === 'p' || event.key === 'P') return 'share';
  // `?`: every key the app answers, in the controls hint (public #315, ui/keyhint.js).
  if (event.key === '?') return 'keys';
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
  showBtn.dataset.tour = 'layers';
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
    // The controls hint goes, as it does for a trip: its close button showed beside this panel
    // (internal #419 item 5).
    if (ctx && ctx.keyhint && typeof ctx.keyhint.hide === 'function') ctx.keyhint.hide('popover');
    if (!menu.hidden) closeMore(false);
    closeSub();
    pop.hidden = false;
    showBtn.setAttribute('aria-expanded', 'true');
    root.classList.add('is-open');
    load().then(() => {
      if (pop.hidden || !show) return;
      show.refresh();
      const first = pop.querySelector('[data-autofocus]') || pop.querySelector('input, button, select');
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
  shareBtn.dataset.tour = 'share';
  shareBtn.appendChild(icon(SHARE_PATH));
  root.appendChild(shareBtn);
  const toggleShare = () => {
    if (share.isOpen()) { share.close(); return; }
    closeShow(false);
    closeSub();
    share.open({ opener: shareBtn });
  };
  shareBtn.addEventListener('click', toggleShare);

  // --- Hide: the existing module, seated in the rail --------------------------------------------
  createCleanView(ctx, { host: root, className: 'sr-rail__btn sr-rail__btn--clean' });

  // --- The tour: the fourth tool (internal spec 0074), its module fetched on the first press -----
  const tourBtn = document.createElement('button');
  tourBtn.type = 'button';
  tourBtn.className = 'sr-rail__btn sr-rail__btn--tour';
  tourBtn.setAttribute('aria-label', COPY.rail.tour);
  tourBtn.title = COPY.rail.tour;
  tourBtn.setAttribute('aria-pressed', 'false');
  tourBtn.dataset.tour = 'tour';
  tourBtn.appendChild(icon(TOUR_PATH));
  root.appendChild(tourBtn);
  const toggleTour = () => { closeShow(false); if (ctx && typeof ctx.wantOnboarding === 'function') ctx.wantOnboarding('rail'); };
  tourBtn.addEventListener('click', toggleTour);

  // --- The journal: a plain link, it leaves the map ------------------------------------------------
  const blogLink = document.createElement('a');
  blogLink.className = 'sr-rail__btn sr-rail__btn--blog';
  blogLink.href = COPY.rail.blogHref;
  blogLink.target = '_blank';
  blogLink.rel = 'noopener';
  blogLink.setAttribute('aria-label', COPY.rail.blog);
  blogLink.title = COPY.rail.blog;
  blogLink.appendChild(icon(BLOG_PATH));
  root.appendChild(blogLink);

  // --- Games: the same kind of link; its glow breathes (ui.css .sr-rail__btn--games::before) -------
  const gamesLink = document.createElement('a');
  gamesLink.className = 'sr-rail__btn sr-rail__btn--games';
  gamesLink.href = COPY.games.href;
  gamesLink.target = '_blank';
  gamesLink.rel = 'noopener';
  gamesLink.setAttribute('aria-label', COPY.games.title);
  gamesLink.title = COPY.games.title;
  gamesLink.appendChild(icon(GAMEPAD_PATH));
  root.appendChild(gamesLink);

  // --- Email updates: the What to show pattern, its contents fetched on the first press ------------
  const subBtn = document.createElement('button');
  subBtn.type = 'button';
  subBtn.className = 'sr-rail__btn sr-rail__btn--sub';
  subBtn.setAttribute('aria-label', COPY.rail.subscribe);
  subBtn.title = COPY.rail.subscribe;
  subBtn.setAttribute('aria-haspopup', 'dialog');
  subBtn.setAttribute('aria-expanded', 'false');
  subBtn.appendChild(icon(MAIL_PATH));
  root.appendChild(subBtn);
  // The popover, its closing (Escape, Close, a press outside) and its focus are the lazy module's: the boot graph holds
  // the button alone. Opening it closes the other popovers (ui/subscribepop.js); opening one of them closes it (closeSub).
  let sub = null;
  const subscribe = () => sub || (sub = import('./subscribepop.js').then((m) => m.mountSubscribe(ctx, subBtn, moreBtn))
    .catch((e) => { sub = null; console.warn('Email updates did not load', e); }));
  const closeSub = () => { if (sub) sub.then((s) => s && s.close(false)); };
  subBtn.addEventListener('click', () => subscribe().then((s) => s && s.toggle(subBtn)));

  // --- The repository: GitHub's own mark, after the eye ---------------------------------------------
  const gitHub = createGitHubMark(root, { className: 'sr-rail__btn sr-rail__btn--github' });

  // --- More: the phone's menu of the three tools that fold away (ON A PHONE above) -----------------
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'sr-rail__btn sr-rail__btn--more';
  moreBtn.setAttribute('aria-label', COPY.rail.more);
  moreBtn.title = COPY.rail.more;
  moreBtn.setAttribute('aria-haspopup', 'menu');
  moreBtn.setAttribute('aria-expanded', 'false');
  moreBtn.setAttribute('aria-controls', 'sr-more');
  moreBtn.dataset.tour = 'more';
  moreBtn.appendChild(icon(MORE_PATH));
  root.appendChild(moreBtn);

  const menu = document.createElement('div');
  menu.id = 'sr-more';
  menu.className = 'sr-pop sr-more sr-float';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', COPY.rail.moreLabel);
  menu.hidden = true;
  document.body.appendChild(menu);

  function menuRow(tag, glyph, words, act) {
    const row = document.createElement(tag);
    row.className = 'sr-more__item';
    row.setAttribute('role', 'menuitem');
    row.tabIndex = -1;
    if (tag === 'button') row.type = 'button';
    row.appendChild(glyph);
    const span = document.createElement('span');
    span.textContent = words;
    row.appendChild(span);
    row.addEventListener('click', (e) => { closeMore(false); act(e); });
    menu.appendChild(row);
    return row;
  }
  menuRow('button', icon(SHARE_PATH), COPY.rail.menuShare, () => share.open({ opener: moreBtn }));
  menuRow('button', icon(HIDE_PATH), COPY.rail.menuHide, () => { if (ctx && ctx.cleanView) ctx.cleanView.set(true); });
  menuRow('button', icon(TOUR_PATH), COPY.rail.menuTour, toggleTour);
  menuRow('button', icon(MAIL_PATH), COPY.rail.subscribe, () => subscribe().then((s) => s && s.open(moreBtn)));
  for (const [glyph, words, href] of [[BLOG_PATH, COPY.rail.blog, COPY.rail.blogHref], [GAMEPAD_PATH, COPY.games.label, COPY.games.href],
    [MODELS_PATH, COPY.rail.models, COPY.rail.modelsHref], [VIDEO_PATH, COPY.rail.video, COPY.rail.videoHref]]) {
    const row = menuRow('a', icon(glyph), words, () => {});
    row.href = href;
    row.target = '_blank';
    row.rel = 'noopener';
  }
  // Buy Me a Coffee: index.html's floating cup (css/coffee.css) is a desktop's; a phone has this row, the same drawing.
  const cup = document.querySelector('body > .coffee');
  if (cup) {
    cup.setAttribute('aria-label', COPY.rail.coffeeLabel);
    cup.title = COPY.rail.coffeeLabel;
    const row = menuRow('a', cup.querySelector('svg').cloneNode(true), COPY.rail.coffee, () => {});
    row.href = cup.href;
    row.target = '_blank';
    row.rel = 'noopener';
  }
  // GitHub's own mark, cloned from the rail's link: the octicon is not redrawn (ui/github.js).
  const mark = gitHub && gitHub.querySelector('svg') ? gitHub.querySelector('svg').cloneNode(true) : icon([]);
  mark.setAttribute('width', '20');
  mark.setAttribute('height', '20');
  const ghRow = menuRow('a', mark, COPY.rail.menuGitHub, () => {});
  ghRow.href = gitHub ? gitHub.href : COPY.mark.href;
  ghRow.target = '_blank';
  ghRow.rel = 'noopener noreferrer';
  const items = () => [...menu.querySelectorAll('.sr-more__item')];

  function openMore() {
    if (!menu.hidden) return;
    closeShow(false);
    closeSub();
    if (ctx && ctx.share) ctx.share.close();
    menu.hidden = false;
    moreBtn.setAttribute('aria-expanded', 'true');
    items()[0].focus({ preventScroll: true });
  }
  function closeMore(returnFocus) {
    if (menu.hidden) return;
    menu.hidden = true;
    moreBtn.setAttribute('aria-expanded', 'false');
    if (returnFocus) moreBtn.focus({ preventScroll: true });
  }
  moreBtn.addEventListener('click', () => (menu.hidden ? openMore() : closeMore(false)));
  // The menu pattern's keys: arrows move, Home and End jump, Tab leaves and closes it.
  menu.addEventListener('keydown', (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    let to = null;
    if (e.key === 'ArrowDown') to = list[(i + 1) % list.length];
    else if (e.key === 'ArrowUp') to = list[(i + list.length - 1) % list.length];
    else if (e.key === 'Home') to = list[0];
    else if (e.key === 'End') to = list[list.length - 1];
    else if (e.key === 'Tab') closeMore(false);
    if (!to) return;
    e.preventDefault();
    to.focus();
  });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !moreBtn.contains(e.target)) closeMore(false);
  });

  // Capture phase, as the postcard menu and the clear screen do: Escape must close the popover
  // before the card underneath hears it and closes too.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); e.stopPropagation(); closeShow(true); return; }
    if (e.key === 'Escape' && !menu.hidden) { e.preventDefault(); e.stopPropagation(); closeMore(true); return; }
    const what = railKey(e, document.activeElement);
    if (!what) return;
    if (document.documentElement.classList.contains('sr-trip-mode')) return; // the trip owns the screen
    e.preventDefault();
    if (what === 'show') toggleShow();
    else if (what === 'keys') { if (ctx && ctx.keyhint && typeof ctx.keyhint.toggleAll === 'function') ctx.keyhint.toggleAll(); }
    else toggleShare();
  }, true);

  const api = { root, openShow, closeShow: () => closeShow(false), closeMore: () => closeMore(false), toggleShow, ready: () => load() };
  if (ctx) ctx.rail = api;
  return api;
}
