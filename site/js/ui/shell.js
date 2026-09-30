// ui/shell.js -- the layout: one sidebar, one tool rail, one time pill (spec 0061 §1).
//
// Contract: createShell(ctx, opts) -> { el, side, show(view), back(), view(), collapse(on),
//                                       collapsed(), isPhone(), host(view), railHost, timeHost }
// Also exported, pure, for tests/test_shell.mjs:
//   createViewStack(root)          push / pop / remove over the four views
//   readCollapsed(storage), writeCollapsed(storage, on)
//
// WHY. Ivan, 2026-09-29: "now it is ugly and not structured, very bad experience". The first screen
// was two stacked prose panels on the left, a card as a third panel on the right, and five loose
// icons in the corners; nothing said which of them was the place to start. Row D of the design
// canvas ("Space Radar redesign directions") is the answer this builds: the structure of a map app
// -- ONE sidebar that holds one view at a time, a tool rail, a time bar -- and nothing else docked.
//
// Layout only: the shell builds the boxes and hands them out; ui/explore.js, ui/cards.js,
// ui/status.js, ui/rail.js and ui/timepill.js fill them, so the phone's sheet (0061 task 3) can
// re-seat the same boxes without touching their contents.
//
//   #sr-shell
//     #sr-side         the sidebar: 360 px, 20 px in from the left, top and bottom (row D's inset)
//       .sr-side__view[data-view=home]      ui/explore.js
//       .sr-side__view[data-view=card]      "‹ Explore", then the #sr-card host ui/cards.js fills
//       .sr-side__view[data-view=sources]   "‹ Explore", then ui/status.js
//       .sr-side__handle                    the 48 px handle while collapsed
//     #sr-rail         ui/rail.js
//     #sr-time         ui/timepill.js
//
// THE CARD MOVES; ITS CONTENTS DO NOT. ui/cards.js looks its host up by id and builds it on <body>
// when there is none, so the shell makes `#sr-card` first and seats it: inside the card view on a
// desktop, on <body> on a phone (where it is still today's bottom sheet, until 0061 task 3) and on
// <body> during a trip (ui/tripframe.js hides the sidebar, and the trip's card has its own place in
// the frame -- ui.css `html.sr-trip-mode #sr-card`). appendChild MOVES a node, so the card keeps its
// listeners, its scroll and its focus across the move. A MutationObserver on its `hidden` attribute
// is how the shell learns it opened or closed: cards.js is not edited to call the shell, which keeps
// it one of the two modules a parallel tracking PR is allowed to touch.
//
// COLLAPSE. The handle is 48 px: the wordmark's first letter and a chevron. The choice is
// localStorage['sr:side'] ('collapsed' or absent), read in a try/catch because Safari's private mode
// throws on it, and a card opening un-collapses the sidebar for as long as it is open without
// writing the choice down.
//
// THE SCENE MOVES OUT FROM UNDER IT. scene/viewshift.js measures #sr-side and moves the view right
// by half its right edge (row D draws the Earth 150 px right of the window's middle at 1440); the
// pill is centred on the same band by --sr-scene-left (ui.css): 380 px open, 0 collapsed or phone.
//
// `sr:shell` {view, collapsed} is said on every change, for anything that wants to follow it.

import { COPY } from '../copy/en.js';

export const SIDE_KEY = 'sr:side';
export const VIEWS = ['home', 'card', 'sources', 'trip'];
/** The spec's line between the sidebar and the phone's sheet (0061 req 1 and 8). */
export const DESKTOP_QUERY = '(min-width: 900px)';

const TRIP_CLASS = 'sr-trip-mode';
const COLLAPSED_CLASS = 'sr-side-collapsed';

/** The stored choice. Anything but 'collapsed' is open; a storage that throws is open too. */
export function readCollapsed(storage) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    return !!s && s.getItem(SIDE_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

export function writeCollapsed(storage, on) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (!s) return false;
    if (on) s.setItem(SIDE_KEY, 'collapsed');
    else s.removeItem(SIDE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * The sidebar's views as a stack. Pure. `home` is the floor and is never popped; pushing a view
 * already in the stack brings it to the top rather than stacking it twice, so card -> sources ->
 * card is two entries and one Back goes to sources, not to a second copy of the card.
 */
export function createViewStack(root = 'home') {
  let stack = [root];
  const current = () => stack[stack.length - 1];
  return {
    current,
    depth: () => stack.length,
    list: () => stack.slice(),
    push(view) {
      if (!VIEWS.includes(view) || view === root) return false;
      if (current() === view) return false;
      stack = stack.filter((v) => v !== view);
      stack.push(view);
      return true;
    },
    pop() {
      if (stack.length > 1) stack.pop();
      return current();
    },
    /** Take a view out wherever it is: the card closing under the sources sheet. */
    remove(view) {
      if (view === root) return false;
      const before = stack.length;
      stack = stack.filter((v) => v !== view);
      return stack.length !== before;
    },
    reset() { stack = [root]; },
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

/** The "‹ Explore" row at the top of a pushed view. */
function backRow(label, onBack) {
  const row = el('div', 'sr-side__bar');
  const b = el('button', 'sr-side__back');
  b.type = 'button';
  b.appendChild(el('span', 'sr-side__chev', COPY.shell.backChevron));
  b.appendChild(el('span', null, label));
  b.setAttribute('aria-label', COPY.shell.backLabel);
  b.addEventListener('click', onBack);
  row.appendChild(b);
  return { row, button: b };
}

export function createShell(ctx, opts = {}) {
  const storage = opts.storage;
  // The sources sheet is built the first time it is opened (opts.loadSources, main.js), not at boot:
  // it is never on the first screen now, and ui/status.js with the GitHub mark and the space-weather
  // line is 26 kB a visitor who never opens it need not download (0061 req 14: the first visit must
  // not grow, and the shell's own modules are new bytes).
  let sourcesLoad = null;
  function ensureSources() {
    if (!sourcesLoad) {
      sourcesLoad = typeof opts.loadSources === 'function'
        ? Promise.resolve().then(() => opts.loadSources(sourcesHost)).catch((e) => { sourcesLoad = null; console.warn('the sources sheet did not load', e); })
        : Promise.resolve();
    }
    return sourcesLoad;
  }
  const mm = typeof matchMedia === 'function' ? matchMedia(DESKTOP_QUERY) : null;
  const root = document.documentElement;
  const stack = createViewStack('home');
  let collapsedChoice = readCollapsed(storage);
  let collapsedNow = collapsedChoice;
  let lastDir = 'push';

  const shell = el('div', 'sr-shell');
  shell.id = 'sr-shell';

  const side = el('aside', 'sr-side sr-float');
  side.id = 'sr-side';
  side.setAttribute('aria-label', COPY.shell.sideLabel);

  const views = new Map();
  const home = el('div', 'sr-side__view sr-side__home');
  home.dataset.view = 'home';
  views.set('home', home);

  const card = el('div', 'sr-side__view sr-side__card');
  card.dataset.view = 'card';
  // Back from the card is "put the selection down": the camera stops following, the HUD clears and
  // `at` leaves the address bar, which is what the card's own × has always done through deselect().
  const cardBack = backRow(COPY.shell.back, () => {
    if (ctx && typeof ctx.deselect === 'function') ctx.deselect();
    else back();
    landFocus();
  });
  card.appendChild(cardBack.row);
  const cardSlot = el('div', 'sr-side__cardslot');
  card.appendChild(cardSlot);
  views.set('card', card);

  const sources = el('div', 'sr-side__view sr-side__sources');
  sources.dataset.view = 'sources';
  const sourcesBack = backRow(COPY.shell.back, () => { back(); landFocus(); });

  // The back button that was pressed has just been hidden with its view, and focus hidden with it
  // falls to <body> (measured): a keyboard visitor would start again from the top of the page. It
  // lands on the view now showing -- the chosen tab at home -- as the disclosure pattern asks.
  function landFocus() {
    const a = document.activeElement;
    if (a && a !== document.body && a.isConnected && !a.closest('[hidden]')) return;
    const view = views.get(stack.current());
    const target = view && (view.querySelector('[role="tab"][aria-selected="true"]') || view.querySelector('button, [href], input'));
    if (target) target.focus({ preventScroll: true });
  }
  sources.appendChild(sourcesBack.row);
  const sourcesHost = el('div', 'sr-side__sourceshost');
  sources.appendChild(sourcesHost);
  views.set('sources', sources);

  for (const v of views.values()) side.appendChild(v);

  // The collapsed handle: the wordmark's first letter and a chevron, 48 px, in the sidebar's place.
  const handle = el('button', 'sr-side__handle');
  handle.type = 'button';
  handle.appendChild(el('span', 'sr-side__handle-mark', COPY.shell.handleMark));
  handle.appendChild(el('span', 'sr-side__chev', COPY.shell.openChevron));
  handle.setAttribute('aria-label', COPY.shell.expand);
  handle.title = COPY.shell.expand;
  handle.setAttribute('aria-expanded', 'false');
  handle.addEventListener('click', () => collapse(false));
  side.appendChild(handle);

  const railHost = el('div', 'sr-rail-host');
  const timeHost = el('div', 'sr-time-host');
  shell.appendChild(side);
  shell.appendChild(railHost);
  shell.appendChild(timeHost);
  document.body.appendChild(shell);

  // The card's host, made here so the shell can seat it (see THE CARD MOVES above).
  let cardHost = document.getElementById('sr-card');
  if (!cardHost) {
    cardHost = el('aside', 'sr-card');
    cardHost.id = 'sr-card';
    cardHost.hidden = true;
  }

  const isPhone = () => !(mm ? mm.matches : true);
  const tripOn = () => root.classList.contains(TRIP_CLASS);

  function placeCard() {
    const want = !isPhone() && !tripOn() ? cardSlot : document.body;
    if (cardHost.parentNode !== want) want.appendChild(cardHost);
    cardHost.classList.toggle('is-docked', want === cardSlot);
  }

  function paint() {
    const view = stack.current();
    for (const [id, node] of views) {
      const on = id === view;
      node.hidden = !on;
      node.classList.toggle('is-current', on);
    }
    side.dataset.view = view;
    side.dataset.dir = lastDir;
    side.classList.toggle('is-collapsed', collapsedNow && !isPhone());
    root.classList.toggle(COLLAPSED_CLASS, collapsedNow && !isPhone());
    handle.setAttribute('aria-expanded', collapsedNow ? 'false' : 'true');
    // A collapsed sidebar's views are out of the tab order as well as out of sight.
    for (const node of views.values()) node.inert = collapsedNow && !isPhone();
    try {
      window.dispatchEvent(new CustomEvent('sr:shell', { detail: { view, collapsed: collapsedNow } }));
    } catch { /* an old browser still gets the layout */ }
  }

  function show(view) {
    if (view === 'home') { stack.reset(); lastDir = 'pop'; paint(); return true; }
    if (view === 'sources') ensureSources();
    if (!stack.push(view)) { paint(); return false; }
    lastDir = 'push';
    // A card or the sources sheet opened on a collapsed sidebar opens it for as long as it is up.
    if (collapsedNow) collapsedNow = false;
    paint();
    return true;
  }

  function back() {
    const before = stack.current();
    stack.pop();
    lastDir = 'pop';
    if (stack.current() === 'home') collapsedNow = collapsedChoice;
    paint();
    return before !== stack.current();
  }

  function collapse(on) {
    collapsedChoice = !!on;
    collapsedNow = collapsedChoice;
    writeCollapsed(storage, collapsedChoice);
    paint();
    if (!collapsedNow) {
      // Focus follows the visitor's hand: into the sidebar they just opened, onto the control that
      // opens it again when they close it.
      const target = home.querySelector('.sr-explore__collapse');
      if (target && document.activeElement === handle) target.focus({ preventScroll: true });
    } else if (side.contains(document.activeElement) || document.activeElement === document.body) {
      handle.focus({ preventScroll: true });
    }
  }

  // The card opening and closing, read off its own `hidden` attribute.
  function onCardChange() {
    placeCard();
    const open = !cardHost.hidden;
    if (open && !isPhone() && !tripOn()) {
      if (stack.current() !== 'card') show('card');
    } else if (!open && stack.remove('card')) {
      lastDir = 'pop';
      if (stack.current() === 'home') collapsedNow = collapsedChoice;
      paint();
    }
  }
  if (typeof MutationObserver === 'function') {
    new MutationObserver(onCardChange).observe(cardHost, { attributes: true, attributeFilter: ['hidden'] });
    // A trip starting or ending is a class on <html> (ui/tripframe.js): the card changes seat then.
    let wasTrip = tripOn();
    new MutationObserver(() => {
      const now = tripOn();
      if (now === wasTrip) return;
      wasTrip = now;
      onCardChange();
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  if (mm && mm.addEventListener) mm.addEventListener('change', () => { onCardChange(); paint(); });

  // Escape in the sources sheet goes back to where the visitor was. The card handles its own
  // (ui/cards.js), and a clear screen takes Escape before either (ui/cleanview.js, capture phase).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (stack.current() === 'sources' && !isPhone()) { back(); }
  });

  placeCard();
  paint();

  const api = {
    el: shell,
    side,
    show,
    back,
    view: () => stack.current(),
    stack: () => stack.list(),
    collapse,
    collapsed: () => collapsedNow,
    isPhone,
    host: (view) => (view === 'home' ? home : view === 'card' ? cardSlot : view === 'sources' ? sourcesHost : null),
    railHost,
    timeHost,
    /** Open the sources sheet from anywhere: the status line, a scene note, `#sources`. */
    openSources() {
      if (isPhone() && ctx && ctx.mobile && typeof ctx.mobile.setOpen === 'function') { ctx.mobile.setOpen('sources'); return; }
      show('sources');
      return ensureSources().then(() => {
        const head = sourcesHost.querySelector('h2');
        if (head && stack.current() === 'sources') { head.tabIndex = -1; head.focus({ preventScroll: true }); }
      });
    },
    /** Resolves once the sources sheet is built; for the phone's drawer and for probes. */
    ensureSources,
  };
  if (ctx) ctx.shell = api;
  return api;
}
