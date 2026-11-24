// ui/shell.js -- the layout: one sidebar, one tool rail, one time pill (spec 0061 §1).
//
// Contract: createShell(ctx, opts) -> { el, side, show(view), back(), view(), collapse(on),
//                                       collapsed(), isPhone(), host(view), railHost, timeHost,
//                                       lineHost, seatSearch(node), sheet() }
// Also exported, pure, for tests/test_shell.mjs:
//   createViewStack(root)          push / pop / remove over the four views
//   readCollapsed(storage), writeCollapsed(storage, on)
//
// WHY. The maintainer, 2026-09-29: "now it is ugly and not structured, very bad experience". The first screen
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
//       .sr-side__head                      PINNED: the wordmark, the hide control, the search and the
//                                           tabs (ui/explore.js fills it); every view but a trip's opens under it
//       .sr-side__open                      the open card's row ("Mars ›" and its close) while another view shows
//       .sr-side__view[data-view=home]      ui/explore.js's lists
//       .sr-side__view[data-view=card]      the breadcrumb, then the #sr-card host ui/cards.js fills
//       .sr-side__view[data-view=sources]   the breadcrumb, then ui/status.js
//       .sr-side__view[data-view=trip]      a guided trip's sheet: the intro, the stop card, the end
//                                           (ui/tripframe.js fills it; spec 0061 task 7)
//       .sr-strip                           the slim strip while the panel is hidden
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
// is how the shell learns it opened or closed, and `sr:select` how it learns the selection changed under a card already open.
//
// THE WAY BACK SAYS WHERE IT GOES (2026-11-23). A visitor's review: once something was clicked it was hard to get back to
// the search, and the arrow that hid the panel looked like the arrow that went back. So the search and the tabs are pinned
// above every view (typing works while a card is open), and each pushed view's back row names the view under it --
// "‹ Results for “mars”", "‹ Planets", "‹ Search" (crumbFor) -- and returns to exactly that: the same results open again, the
// same tab. Back and Escape step back one view and keep the selection; only the card's own close puts it down. The open
// card waits in a row under the tabs ("Mars ›") until it is closed or chosen again.
//
// HIDING THE PANEL. Its own control, Lucide's panel-left-close on the panel's outer edge, "Hide panel", and the `[` key
// (panelKey). Hidden, the panel is a slim strip: show it again, the search, the four tabs and the open card's name. The
// choice is localStorage['sr:side'] ('collapsed' or absent), read in a try/catch because Safari's private mode throws on
// it, and a card opening un-hides the panel for as long as it is open without writing the choice down.
//
// THE SCENE MOVES OUT FROM UNDER IT. scene/viewshift.js measures #sr-side and moves the view right
// by half its right edge (row D draws the Earth 150 px right of the window's middle at 1440); the
// pill is centred on the same band by --sr-scene-left (ui.css): 380 px open, 0 collapsed or phone.
//
// A GUIDED TRIP IS A VIEW (spec 0061 task 7). The maintainer, 2026-10-01: the trips were the one place the old
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
// full (a page of rows), a trip at half; closing a card puts the sheet back at peek. The breadcrumb
// sits in the handle's row, and a swipe down to peek is a step back: peek is the home's height.
// The scene moves up out from under it by scene/viewshift.js, which measures the sheet and the top bar.
//
// `sr:shell` {view, collapsed, phone, sheet} is said on every change, for anything that wants to
// follow it.

import { COPY, t } from '../copy/en.js';
import { createSheet } from './sheet.js';

export const SIDE_KEY = 'sr:side';
export const VIEWS = ['home', 'card', 'sources', 'trip', 'passport'];
// b200-f1-find: begin -- Find (ui/find.js, forge #150/#152/#153): a pushed view like the sources sheet
VIEWS.push('find');
// b200-f1-find: end
VIEWS.push('ops'); // research train (ops): live operations (ui/ops.js), a pushed view like Find
/** The spec's line between the sidebar and the phone's sheet (0061 req 1 and 8). */
export const DESKTOP_QUERY = '(min-width: 900px)';
/**
 * A phone held sideways (internal #455): wider than tall and under 500 px high. The page is still the phone's (the top bar, the
 * rail in it), but the sheet docks to the side as a column, as the desktop's sidebar does, instead of a full-width bottom sheet
 * that left 147 px of sky at 844 x 390. css/ui.css `html.sr-phone-land`; scene/viewshift.js counts the column as it does the sidebar.
 */
export const LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 500px)';

const TRIP_CLASS = 'sr-trip-mode';
const COLLAPSED_CLASS = 'sr-side-collapsed';
const PHONE_CLASS = 'sr-phone';
const LAND_CLASS = 'sr-phone-land';
/** What drags the sheet at full, besides its handle: each view's head (ui/sheet.js THE DRAG). */
const SHEET_GRAB = '.sr-explore__head, .sr-side__bar, .sr-side__open, .sr-card__header, .sr-tripsheet__head';
/** What scrolls in the sheet at full and is put back to its top below it. */
const SHEET_SCROLL = '.sr-explore__body, .sr-side__cardslot, .sr-side__sourceshost, .sr-side__trip';

/**
 * The height a view asks for when it comes up on a phone, given the view it replaced. Pure, for
 * tests/test_sheet.mjs. null keeps the sheet where the visitor left it.
 */
export function sheetFor(view, from) {
  if (view === from) return null;
  // b200-f1-find: begin -- Find comes up at half: what it lights is on the globe above it
  if (view === 'find') return 'half';
  // b200-f1-find: end
  if (view === 'ops') return 'half'; // research train (ops): a row flies the globe above it
  if (view === 'card' || view === 'trip') return 'half';
  if (view === 'sources' || view === 'passport') return 'full';
  if (view === 'home') return from === 'sources' || from === 'passport' ? 'half' : from ? 'peek' : null;
  return null;
}

/** A query longer than this is cut, with an ellipsis, so the back row stays one line of chrome (60 characters). */
export const CRUMB_QUERY_MAX = 24;

/**
 * What the back row of a pushed view says: the name of the view under it. Pure, for tests/test_shell.mjs.
 * `under` is that view's id; `info.home` is what the home showed when the view was pushed over it ({q} a query whose
 * results were open, {tab} the tab a row was chosen from, or neither: a click on the map, a link), `info.card` the open
 * card's name. "Results for “mars”" / "Planets" / "Search" / "Sources" / "Mars".
 */
export function crumbFor(under, info = {}, words = COPY) {
  const S = words.shell;
  if (under === 'home') {
    const home = info.home || {};
    const q = String(home.q || '').trim();
    if (q.length >= 2) return t(S.results, { q: q.length > CRUMB_QUERY_MAX ? `${q.slice(0, CRUMB_QUERY_MAX - 1)}…` : q });
    if (home.tab && words.tabs && words.tabs[home.tab]) return words.tabs[home.tab];
    return S.search;
  }
  if (under === 'card') return String(info.card || '').trim() || S.card;
  if (under === 'sources' || under === 'passport' || under === 'find') return S[under];
  if (under === 'ops') return (words.ops && words.ops.label) || S.search; // research train (ops): its words come with it (copy/en.ops.js)
  return S.search;
}

/**
 * Whether a key press hides or shows the panel: `[` alone, never while something is typed, never with a modifier, never
 * mid-composition. Pure. `typing` says whether an element is a place a person types (ui/explore.js isTypingIn).
 */
export function panelKey(event, activeElement, typing = () => false) {
  if (!event || event.defaultPrevented || event.key !== COPY.shell.panelKey) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.isComposing || event.keyCode === 229) return false;
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  const sentTo = (path && path[0]) || event.target || null;
  return !(typing(activeElement) || typing(sentTo));
}

/**
 * A move of the phone's sheet the visitor made: is it a step back? Down to peek from any pushed view but a trip's, yes
 * (peek is the home's height: its handle and its tabs). Pure.
 */
export function swipeIsBack(view, detent, how) {
  return !!(how && how.user) && detent === 'peek' && view !== 'home' && view !== 'trip';
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

/** The back row at the top of a pushed view: "‹ Planets". Its words are set by paint(), from the view under it. */
function backRow(onBack) {
  const row = el('div', 'sr-side__bar');
  const b = el('button', 'sr-side__back');
  b.type = 'button';
  b.appendChild(el('span', 'sr-side__chev', COPY.shell.backChevron));
  const words = el('span', 'sr-side__crumb', COPY.shell.search);
  b.appendChild(words);
  b.addEventListener('click', onBack);
  row.appendChild(b);
  return { row, button: b, words };
}

/** One of the icons (ui/icons.js), drawn into `node` once the module is here: it is not a first visit's module. */
let iconsLoad = null;
function iconInto(node, name, size = 20) {
  if (!iconsLoad) iconsLoad = import('./icons.js').catch((e) => { iconsLoad = null; console.warn('the icons did not load', e); return null; });
  iconsLoad.then((m) => { if (m && !node.querySelector('svg')) node.prepend(m.icon(name, size)); });
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
  const mmLand = typeof matchMedia === 'function' ? matchMedia(LANDSCAPE_QUERY) : null;
  const root = document.documentElement;
  const stack = createViewStack('home');
  let collapsedChoice = readCollapsed(storage);
  let collapsedNow = collapsedChoice;
  let lastDir = 'push';
  // What the home showed when a view was pushed over it (the explore view says: its query, the tab a row was chosen from).
  let homeCrumb = {};
  let homeSays = null; // {crumb() -> {q, tab}, restore(crumb)}: ui/explore.js, through setHome

  const shell = el('div', 'sr-shell');
  shell.id = 'sr-shell';

  const side = el('aside', 'sr-side sr-float');
  side.id = 'sr-side';
  side.setAttribute('aria-label', COPY.shell.sideLabel);

  // The pinned head: ui/explore.js puts the wordmark, the hide control, the search and the tabs in it.
  const headHost = el('div', 'sr-side__head');
  side.appendChild(headHost);

  // The open card, while another view shows: its name to go back to it, and its close.
  const openRow = el('div', 'sr-side__open');
  openRow.hidden = true;
  const reopen = el('button', 'ui-row sr-side__reopen');
  reopen.type = 'button';
  const reopenName = el('span', 'ui-row__t sr-side__reopen-name');
  reopen.appendChild(reopenName);
  // Back to the card the visitor stepped away from: its back row keeps the words it had (they came from that home).
  reopen.addEventListener('click', () => { show('card', { again: true }); landFocus(); });
  const unselect = el('button', 'ui-close sr-side__unselect');
  unselect.type = 'button';
  unselect.dataset.icon = 'x';
  unselect.addEventListener('click', () => { if (ctx && typeof ctx.deselect === 'function') ctx.deselect(); landFocus(); });
  openRow.append(reopen, unselect);
  side.appendChild(openRow);

  const views = new Map();
  const crumbs = new Map(); // view -> its back row
  const home = el('div', 'sr-side__view sr-side__home');
  home.dataset.view = 'home';
  views.set('home', home);

  // Back is one step: the view under this one, exactly as it was. It never puts the selection down; the card's close does.
  function stepBack() {
    const to = stack.list()[stack.depth() - 2];
    const crumb = homeCrumb;
    back();
    if (to === 'home' && homeSays && typeof homeSays.restore === 'function') {
      try { homeSays.restore(crumb); } catch { /* the home is there all the same */ }
    }
    landFocus();
    // And once more when everything the step set off has run (internal #460, seen in a real tab on 2026-10-08): focus
    // hidden with its view falls to <body>. landFocus leaves a focus that found a home alone.
    setTimeout(landFocus, 0);
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => landFocus());
  }

  function pushedView(id, className, hostClass) {
    const node = el('div', `sr-side__view ${className}`);
    node.dataset.view = id;
    const crumb = backRow(stepBack);
    crumbs.set(id, crumb);
    node.appendChild(crumb.row);
    const box = el('div', hostClass);
    node.appendChild(box);
    views.set(id, node);
    return box;
  }

  const cardSlot = pushedView('card', 'sr-side__card', 'sr-side__cardslot');
  cardSlot.dataset.tour = 'card'; // the tour's hook (registry/onboarding.yaml)
  const sourcesHost = pushedView('sources', 'sr-side__sources', 'sr-side__sourceshost');

  // The back button that was pressed has just been hidden with its view, and focus hidden with it
  // falls to <body> (measured): a keyboard visitor would start again from the top of the page. It
  // lands on the view now showing -- the chosen tab at home -- as the disclosure pattern asks.
  function landFocus() {
    const a = document.activeElement;
    if (a && a !== document.body && !a.closest('[inert]') && a.isConnected && !a.closest('[hidden]')) return;
    const view = views.get(stack.current());
    const at = stack.current() === 'home' ? headHost : view;
    const target = (at && at.querySelector('[role="tab"][aria-selected="true"]')) || (view && view.querySelector('button, [href], input'));
    if (target) target.focus({ preventScroll: true });
  }

  // The passport (ui/passport.js, spec 0041): a pushed view like the sources sheet, filled by its
  // own module when it is opened. Its body scrolls as the sources sheet's does.
  const passportHost = pushedView('passport', 'sr-side__passport', 'sr-side__sourceshost');

  // b200-f1-find: begin -- the Find view (ui/find.js fills its host when it is first opened)
  const findHost = pushedView('find', 'sr-side__find', 'sr-side__sourceshost sr-side__findhost');
  // b200-f1-find: end
  const opsHost = pushedView('ops', 'sr-side__ops', 'sr-side__sourceshost sr-side__findhost'); // research train (ops)

  // The trip view: empty until ui/tripframe.js seats its sheet in it (host('trip')).
  const tripView = el('div', 'sr-side__view sr-side__trip');
  tripView.dataset.view = 'trip';
  views.set('trip', tripView);
  let tripSlot = null;

  for (const v of views.values()) side.appendChild(v);

  // The hidden panel's strip: show it again, then what ui/explore.js puts in (the search and the tabs), then the open card.
  const strip = el('div', 'sr-strip');
  const stripOpen = el('button', 'ui-btn ui-btn--quiet ui-btn--icon sr-strip__open');
  stripOpen.type = 'button';
  stripOpen.setAttribute('aria-label', COPY.shell.expand);
  stripOpen.setAttribute('aria-keyshortcuts', COPY.shell.panelKey);
  stripOpen.title = t(COPY.shell.keyed, { label: COPY.shell.expand, key: COPY.shell.panelKey });
  stripOpen.setAttribute('aria-expanded', 'false');
  stripOpen.dataset.icon = 'panel-left-open';
  stripOpen.addEventListener('click', () => collapse(false));
  const stripTools = el('div', 'sr-strip__tools');
  const stripCard = el('button', 'sr-strip__card');
  stripCard.type = 'button';
  stripCard.hidden = true;
  const stripCardName = el('span', 'sr-strip__name');
  stripCard.appendChild(stripCardName);
  stripCard.addEventListener('click', () => { collapse(false); show('card', { again: true }); });
  strip.append(stripOpen, stripTools, stripCard);
  side.appendChild(strip);

  const railHost = el('div', 'sr-rail-host');
  const timeHost = el('div', 'sr-time-host');

  // The phone's top bar: the search, then the rail (What to show and More), then the live line.
  // First in the DOM, so the tab order on a phone is the order on screen: top, sheet, pill.
  const top = el('div', 'sr-top');
  top.id = 'sr-top';
  // A named REGION, not a group: the bar is page content outside the sidebar and the map, and axe
  // found it outside every landmark on a phone (`region`, 2026-10-08), as it found the time pill.
  top.setAttribute('role', 'region');
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
    cardHost = el('div', 'sr-card');
    cardHost.id = 'sr-card';
    cardHost.hidden = true;
  }

  const isPhone = () => !(mm ? mm.matches : true);
  const tripOn = () => root.classList.contains(TRIP_CLASS);
  const cardOpen = () => !cardHost.hidden && !tripOn();
  /** The open card's name, as its heading prints it (the page's language), else the selection's. */
  function cardName() {
    const h = cardHost.querySelector('#sr-card-title, #sr-card-lead-title, .sr-card__name');
    const words = h ? h.textContent.trim() : '';
    if (words) return words;
    const rec = ctx && typeof ctx.selected === 'function' ? ctx.selected() : null;
    return rec && rec.name ? String(rec.name) : '';
  }

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
  let holdSheet = false;

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
    root.classList.toggle(LAND_CLASS, phone && !!(mmLand && mmLand.matches));
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
          onChange: (detent, h, changed, how) => {
            // A swipe down to peek is a step back to the home, the selection kept (peek is the home's height).
            if (swipeIsBack(stack.current(), detent, how)) {
              holdSheet = true;
              stack.reset();
              lastDir = 'pop';
              paint();
              landFocus();
              return;
            }
            announce(detent);
          },
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
      drawIcons();
    }
  }

  /** The panel's icons, drawn when ui/icons.js is here: a desktop's only (a phone has no strip and no hide control). */
  function drawIcons() {
    if (isPhone()) return;
    for (const node of side.querySelectorAll('[data-icon]')) iconInto(node, node.dataset.icon, Number(node.dataset.iconSize) || 20);
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

  /** The words of every back row in the stack, the open card's row and the strip's name. */
  function paintCrumbs() {
    const list = stack.list();
    const name = cardName();
    for (let i = 1; i < list.length; i += 1) {
      const crumb = crumbs.get(list[i]);
      if (!crumb) continue;
      const words = crumbFor(list[i - 1], { home: homeCrumb, card: name });
      if (crumb.words.textContent !== words) crumb.words.textContent = words;
      crumb.button.setAttribute('aria-label', t(COPY.shell.backTo, { where: words }));
    }
    const open = cardOpen() && !!name;
    const away = open && stack.current() !== 'card' && stack.current() !== 'trip';
    openRow.hidden = !away;
    if (open) {
      if (reopenName.textContent !== name) reopenName.textContent = name;
      reopen.setAttribute('aria-label', t(COPY.shell.reopen, { name }));
      unselect.setAttribute('aria-label', t(COPY.shell.close, { name }));
      unselect.title = t(COPY.shell.close, { name });
      if (stripCardName.textContent !== name) stripCardName.textContent = name;
      stripCard.setAttribute('aria-label', t(COPY.shell.reopen, { name }));
      stripCard.title = name;
    }
    stripCard.hidden = !open;
    side.classList.toggle('has-card', open);
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
    stripOpen.setAttribute('aria-expanded', folded ? 'false' : 'true');
    // A hidden panel's views are out of the tab order as well as out of sight, and the strip is out while it is open.
    for (const node of views.values()) node.inert = folded;
    headHost.inert = folded;
    openRow.inert = folded;
    strip.inert = !folded;
    paintCrumbs();
    // On a phone a view comes up at its own height (sheetFor), and only when it changed.
    const from = shownView;
    shownView = view;
    // Sideways the sheet is a column, always as tall as the screen: it has one height, half, whatever the view.
    const want = sheet && !holdSheet ? (root.classList.contains(LAND_CLASS) ? 'half' : sheetFor(view, from)) : null;
    holdSheet = false;
    if (want && sheet.detent() !== want) sheet.set(want);
    else announce(sheet ? sheet.detent() : null);
  }

  // FOCUS IS NEVER LOST WHEN A VIEW CHANGES (public #315). A view that goes takes the focus inside it
  // to <body>, and a keyboard visitor starts again from the top of the page. So: was the focus in
  // the sidebar before the change? Then after it, it lands in the view now showing (landFocus,
  // which leaves a focus that survived alone). A focus that was NOT in the sidebar -- on the map,
  // in the time pill -- is never taken: a click on a satellite must not hand Space to a Back button.
  const heldFocus = () => side.contains(document.activeElement);

  /** What the home shows now, kept for the back row of the view pushed over it. */
  function noteHome() {
    if (!homeSays || typeof homeSays.crumb !== 'function') { homeCrumb = {}; return; }
    try { homeCrumb = homeSays.crumb() || {}; } catch { homeCrumb = {}; }
  }

  function show(view, how = {}) {
    const held = heldFocus();
    if (view === 'home') { stack.reset(); lastDir = 'pop'; paint(); if (held) landFocus(); return true; }
    if (view === 'sources') ensureSources();
    if (stack.current() === 'home' && view !== 'trip' && !how.again) noteHome();
    if (!stack.push(view)) { paint(); return false; }
    lastDir = 'push';
    // A card or the sources sheet opened on a collapsed sidebar opens it for as long as it is up.
    if (collapsedNow) collapsedNow = false;
    paint();
    if (held) landFocus();
    return true;
  }

  function back() {
    const held = heldFocus();
    const before = stack.current();
    stack.pop();
    lastDir = 'pop';
    if (stack.current() === 'home') collapsedNow = collapsedChoice;
    paint();
    if (held) landFocus();
    return before !== stack.current();
  }

  function collapse(on) {
    collapsedChoice = !!on;
    collapsedNow = collapsedChoice;
    writeCollapsed(storage, collapsedChoice);
    const wasInStrip = strip.contains(document.activeElement);
    paint();
    if (!collapsedNow) {
      // Focus follows the visitor's hand: into the panel they just opened, onto the control that
      // opens it again when they close it.
      const target = headHost.querySelector('.sr-side__hide');
      if (target && wasInStrip) target.focus({ preventScroll: true });
    } else if (side.contains(document.activeElement) || document.activeElement === document.body) {
      stripOpen.focus({ preventScroll: true });
    }
  }

  // The card opening and closing, read off its own `hidden` attribute.
  function onCardChange() {
    placeCard();
    syncTrip();
    const open = !cardHost.hidden;
    if (open && !tripOn()) {
      if (stack.current() !== 'card') show('card');
      else paintCrumbs();
    } else if (!open && stack.remove('card')) {
      lastDir = 'pop';
      if (stack.current() === 'home') collapsedNow = collapsedChoice;
      paint();
    } else {
      paintCrumbs();
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
  // A new selection under a card already open (the card stays up, so its `hidden` never moves): the card comes back to
  // the top, and the way back is asked again, once the search has had its say about its own text (after this event).
  window.addEventListener('sr:select', (e) => {
    const rec = e && e.detail;
    Promise.resolve().then(() => {
      if (!rec || !cardOpen()) { paintCrumbs(); return; }
      const list = stack.list();
      if (stack.current() !== 'card') { show('card'); return; }
      if (list[list.length - 2] === 'home') noteHome();
      paintCrumbs();
    });
  });
  if (mm && mm.addEventListener) mm.addEventListener('change', () => { layout(); onCardChange(); paint(); });
  if (mmLand && mmLand.addEventListener) mmLand.addEventListener('change', () => { layout(); paint(); });
  // A turned phone or a resized window: the heights are the window's, so they are measured again.
  window.addEventListener('resize', () => { if (sheet) sheet.refresh(); });

  // Escape in the sources sheet goes back to where the visitor was. The card's Escape comes here first (escapeCard,
  // ui/cards.js), and a clear screen takes Escape before either (ui/cleanview.js, capture phase).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (stack.current() === 'sources' || stack.current() === 'passport') stepBack();
    // b200-f1-find: begin
    else if ((stack.current() === 'find' || stack.current() === 'ops') && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('.sr-datejump'))) stepBack();
    // b200-f1-find: end
  });

  layout();
  placeCard();
  paint();

  const api = {
    el: shell,
    side,
    show,
    back,
    /** Back as the back row does it: one view, the selection kept, the home's results or tab as they were. */
    stepBack,
    view: () => stack.current(),
    stack: () => stack.list(),
    collapse,
    collapsed: () => collapsedNow,
    isPhone,
    host: (view) => (view === 'home' ? home : view === 'card' ? cardSlot : view === 'sources' ? sourcesHost : view === 'trip' ? tripView : view === 'passport' ? passportHost : null),
    /** The pinned head (ui/explore.js fills it) and the hidden panel's strip (it adds the search and the tabs). */
    headHost,
    stripHost: stripTools,
    /** The home says what it shows ({q, tab}) for the back row, and puts it back on the way back (ui/explore.js). */
    setHome(says) { homeSays = says || null; },
    /**
     * Escape with the card up (ui/cards.js asks before closing it): on the card view it steps back, the selection kept;
     * over another pushed view that view's own Escape steps back. Returns whether the shell took it. In a trip, never.
     */
    escapeCard() {
      if (tripOn()) return false;
      const view = stack.current();
      if (view === 'card') { stepBack(); return true; }
      return view !== 'home';
    },
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
    /** Draw the icons of the controls marked data-icon, once ui/icons.js is here (on a desktop; ui/explore.js asks). */
    drawIcons,
  };
  // b200-f1-find: begin -- host('find'): the Find view's box
  const hostBefore = api.host;
  api.host = (view) => (view === 'find' ? findHost : view === 'ops' ? opsHost : hostBefore(view));
  // b200-f1-find: end
  if (ctx) ctx.shell = api;
  return api;
}
