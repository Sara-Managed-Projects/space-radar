// ui/shell.js -- the layout: one sidebar, one tool rail, one time pill (spec 0061 §1).
//
// Contract: createShell(ctx, opts) -> { el, side, show(view), back(), view(), collapse(on),
//                                       collapsed(), isPhone(), host(view), railHost, timeHost,
//                                       lineHost, seatSearch(node), sheet() }
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
//       .sr-side__view[data-view=trip]      a guided trip's sheet: the intro, the stop card, the end
//                                           (ui/tripframe.js fills it; spec 0061 task 7)
//       .sr-side__handle                    the 48 px handle while collapsed
//     #sr-top          the phone's top bar: the search, the rail, the live line (display: none on a
//                      desktop, where the search is in the sidebar and the rail in its corner)
//     #sr-rail         ui/rail.js
//     #sr-time         ui/timepill.js
//
// THE CARD MOVES; ITS CONTENTS DO NOT. ui/cards.js looks its host up by id and builds it on <body>
// when there is none, so the shell makes `#sr-card` first and seats it: inside the card view, at
// every width now that the phone's sidebar is a sheet (0061 task 3), and, during a trip, in the slot
// the trip frame hands over with seatTrip(slot), which is in the trip view of this sidebar.
// appendChild MOVES a node, so the card keeps its listeners, its scroll and its focus across the move. A MutationObserver on its `hidden` attribute
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
// A GUIDED TRIP IS A VIEW (spec 0061 task 7). Ivan, 2026-10-01: the trips were the one place the old
// design survived -- a card floating mid-scene and two black bars. On a desktop the sidebar now
// stays up during a trip and shows its `trip` view, pushed over whatever was there and popped when
// the trip ends; a sidebar the visitor had collapsed opens for the trip without the choice being
// written down. The rail and the pill go (the trip's toolbar is the controls and it owns the clock).
//
// THE PHONE (spec 0061 task 3, docs/ui-guide.md §3.11 and §5). Under 900 px the same sidebar is a
// bottom sheet of three heights (ui/sheet.js): peek shows its handle and the tabs, half a card,
// full a page. Nothing is rebuilt for it: the shell seats the same boxes differently. The search
// box moves from the explore view's head to a top bar (seatSearch), the rail moves into that bar
// beside it, and the time pill's live line sits under them. Each view picks its height when it
// comes up: a card at half (its name, numbers and actions, and the scene above), the sources at
// full (a page of rows), a trip at half; closing a card puts the sheet back at peek. The scene
// moves up out from under it by scene/viewshift.js, which measures the sheet and the top bar.
//
// `sr:shell` {view, collapsed, phone, sheet} is said on every change, for anything that wants to
// follow it.

import { COPY } from '../copy/en.js';
import { createSheet } from './sheet.js';

export const SIDE_KEY = 'sr:side';
export const VIEWS = ['home', 'card', 'sources', 'trip'];
/** The spec's line between the sidebar and the phone's sheet (0061 req 1 and 8). */
export const DESKTOP_QUERY = '(min-width: 900px)';

const TRIP_CLASS = 'sr-trip-mode';
const COLLAPSED_CLASS = 'sr-side-collapsed';
const PHONE_CLASS = 'sr-phone';
/** What drags the sheet at full, besides its handle: each view's head (ui/sheet.js THE DRAG). */
const SHEET_GRAB = '.sr-explore__head, .sr-side__bar, .sr-card__header, .sr-tripsheet__head';
/** What scrolls in the sheet at full and is put back to its top below it. */
const SHEET_SCROLL = '.sr-explore__body, .sr-side__cardslot, .sr-side__sourceshost, .sr-side__trip';

/**
 * The height a view asks for when it comes up on a phone, given the view it replaced. Pure, for
 * tests/test_sheet.mjs. null keeps the sheet where the visitor left it.
 */
export function sheetFor(view, from) {
  if (view === from) return null;
  if (view === 'card' || view === 'trip') return 'half';
  if (view === 'sources') return 'full';
  if (view === 'home') return from === 'sources' ? 'half' : from ? 'peek' : null;
  return null;
}

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

  // The trip view: empty until ui/tripframe.js seats its sheet in it (host('trip')).
  const tripView = el('div', 'sr-side__view sr-side__trip');
  tripView.dataset.view = 'trip';
  views.set('trip', tripView);
  let tripSlot = null;

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

  // The phone's top bar: the search, then the rail (What to show and More), then the live line.
  // First in the DOM, so the tab order on a phone is the order on screen: top, sheet, pill.
  const top = el('div', 'sr-top');
  top.id = 'sr-top';
  top.setAttribute('role', 'group');
  top.setAttribute('aria-label', COPY.shell.topLabel);
  const topRow = el('div', 'sr-top__row');
  const searchSlot = el('div', 'sr-top__search');
  const toolsSlot = el('div', 'sr-top__tools');
  const lineHost = el('div', 'sr-top__line');
  topRow.append(searchSlot, toolsSlot);
  top.append(topRow, lineHost);

  shell.appendChild(top);
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
    let want = cardSlot;
    if (tripOn()) want = tripSlot && tripSlot.isConnected ? tripSlot : document.body;
    if (cardHost.parentNode !== want) want.appendChild(cardHost);
    cardHost.classList.toggle('is-docked', want === cardSlot || want === tripSlot);
  }

  // --- the phone: the sheet, the top bar, the search's seat ----------------------------------------
  let sheet = null;
  let searchNode = null;
  let searchHome = null;
  let shownView = null;

  /** The explore view hands its search box over once; the shell seats it by the width (ui/explore.js). */
  function seatSearch(node) {
    if (!node) return;
    if (!searchNode) searchHome = { parent: node.parentNode, next: node.nextSibling };
    searchNode = node;
    layout();
  }

  /** Seat the boxes for this width: the sheet and the top bar under 900 px, the sidebar from it. */
  function layout() {
    const phone = isPhone();
    root.classList.toggle(PHONE_CLASS, phone);
    if (phone) {
      if (railHost.parentNode !== toolsSlot) toolsSlot.appendChild(railHost);
      if (searchNode && searchNode.parentNode !== searchSlot) searchSlot.appendChild(searchNode);
      placeholder(COPY.search.placeholderPhone);
      if (!sheet) {
        sheet = createSheet(side, {
          initial: 'peek',
          publish: true,
          grab: SHEET_GRAB,
          scrollers: SHEET_SCROLL,
          onChange: (detent) => announce(detent),
        });
      }
    } else {
      if (railHost.parentNode !== shell) shell.insertBefore(railHost, timeHost);
      if (searchNode && searchHome && searchNode.parentNode !== searchHome.parent) {
        const next = searchHome.next && searchHome.next.parentNode === searchHome.parent ? searchHome.next : null;
        searchHome.parent.insertBefore(searchNode, next);
      }
      if (sheet) { sheet.destroy(); sheet = null; }
      placeholder(COPY.search.placeholder);
    }
  }

  function placeholder(words) {
    const input = searchNode && searchNode.querySelector('input');
    if (input && words) input.placeholder = words;
  }

  function announce(detent) {
    try {
      window.dispatchEvent(new CustomEvent('sr:shell', { detail: { view: stack.current(), collapsed: collapsedNow, phone: isPhone(), sheet: detent || null } }));
    } catch { /* an old browser still gets the layout */ }
  }

  /**
   * The trip view comes and goes with the trip: the sidebar's view on a desktop, the sheet's on a
   * phone; a window that crosses 900 px mid-trip keeps it.
   */
  function syncTrip() {
    const want = tripOn();
    if (want && stack.current() !== 'trip') {
      show('trip');
    } else if (!want && stack.remove('trip')) {
      lastDir = 'pop';
      if (stack.current() === 'home') collapsedNow = collapsedChoice;
      paint();
    }
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
    const folded = collapsedNow && !isPhone() && view !== 'trip';
    side.classList.toggle('is-collapsed', folded);
    root.classList.toggle(COLLAPSED_CLASS, folded);
    handle.setAttribute('aria-expanded', collapsedNow ? 'false' : 'true');
    // A collapsed sidebar's views are out of the tab order as well as out of sight.
    for (const node of views.values()) node.inert = folded;
    // On a phone a view comes up at its own height (sheetFor), and only when it changed.
    const from = shownView;
    shownView = view;
    const want = sheet ? sheetFor(view, from) : null;
    if (want && sheet.detent() !== want) sheet.set(want);
    else announce(sheet ? sheet.detent() : null);
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
    syncTrip();
    const open = !cardHost.hidden;
    if (open && !tripOn()) {
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
  if (mm && mm.addEventListener) mm.addEventListener('change', () => { layout(); onCardChange(); paint(); });
  // A turned phone or a resized window: the heights are the window's, so they are measured again.
  window.addEventListener('resize', () => { if (sheet) sheet.refresh(); });

  // Escape in the sources sheet goes back to where the visitor was. The card handles its own
  // (ui/cards.js), and a clear screen takes Escape before either (ui/cleanview.js, capture phase).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (stack.current() === 'sources') { back(); }
  });

  layout();
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
    host: (view) => (view === 'home' ? home : view === 'card' ? cardSlot : view === 'sources' ? sourcesHost : view === 'trip' ? tripView : null),
    /** Where the card sits while a trip runs (ui/tripframe.js): its sheet's slot, or null for <body>. */
    seatTrip(slot) {
      tripSlot = slot || null;
      placeCard();
    },
    railHost,
    timeHost,
    /** Where the time pill writes its live line: the phone's top bar, under the search. */
    lineHost,
    seatSearch,
    /** The phone's sheet (ui/sheet.js), or null at 900 px and wider. */
    sheet: () => sheet,
    /** Open the sources sheet from anywhere: the status line, a scene note, `#sources`. */
    openSources() {
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
