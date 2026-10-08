// ui/welcome.js -- a first visit's three lines and its two ways in (public #241, #287).
//
// Contract: createWelcome(ctx, opts) -> { root, maybeShow(), show(), hide(reason), isOpen() }
// Also exported, pure, for tests/test_welcome.mjs:
//   WELCOME_KEY, whyNot(state), decide(storage, state), welcomeLines(touch, C), firstTrip(rows)
//
// WHY. A first visit landed on a globe, a search field and four tabs, and nothing said what the
// dots are, how to move, or what a trip is. The home's first line (ui/sentence.js) is a fact, not
// an orientation. So, once, at the head of the home: three short lines and two buttons.
//
//   Every dot is a real thing. Press one.
//   Drag to turn. Scroll to go closer.          (pinch, on touch)
//   A guided trip is one story in minutes.
//   [ Guided trip ]  [ Look around ]
//
// One line each at the sidebar's width: a chrome line that wraps is a bug (docs/ui-guide.md 4).
//
// "Guided trip" starts the first trip the home offers that can run (the first card, pressed: the
// card owns the waiting and the refusals). "Look around" puts the lines away and leaves the map.
// It is the one ember on the home, for as long as it is up, and it is not a modal: the map stays
// live behind it and any press on the map is "Look around".
//
// ONCE. Remembered in localStorage['sr:welcome'] the moment it shows. A browser that keeps
// nothing gets no welcome: "once" could not be kept there (the controls hint's rule,
// ui/keyhint.js). Never for a link to somewhere, an embed, a reel, a running trip or an automated
// browser (the same rule as the opening, scene/framing.js openingPlan). ctx.welcome.show() opens
// it whatever the memory says, for a probe.
//
// REDUCED MOTION. Nothing here moves: the section fades in (ui.css, the guide's 120 ms fade under
// reduced motion) and the trip it starts cuts instead of flying, as every trip does.
//
// ON A PHONE the home is a sheet at its peek, where these lines would be under the fold, so the
// sheet is raised to half while they are up.
//
// Fetched after the first visit has settled (main.js), never at boot.

import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { loadCss } from './latercss.js';
import { icon } from './icons.js';

export const WELCOME_KEY = 'sr:welcome';

/** Why not to show it, or null to show it. Pure. */
export function whyNot(s = {}) {
  if (s.seen === null) return 'no-memory';
  if (s.seen) return 'seen';
  if (s.deepLink) return 'deep-link';
  if (s.embed) return 'embed';
  if (s.ambient) return 'reel';
  if (s.tripRunning) return 'trip';
  if (s.automated) return 'automated';
  return null;
}

function readSeen(storage) {
  try { return storage ? storage.getItem(WELCOME_KEY) === '1' : null; } catch { return null; }
}

function markSeen(storage) {
  try { if (!storage) return false; storage.setItem(WELCOME_KEY, '1'); return true; } catch { return false; }
}

/** The decision and its memory: null to show (remembered now), else why not. Never throws. */
export function decide(storage, s = {}) {
  const reason = whyNot({ ...s, seen: readSeen(storage) });
  if (reason) return reason;
  return markSeen(storage) ? null : 'no-memory';
}

/** The three lines, the second in the words of the hand that is there. Pure. */
export function welcomeLines(touch, C = COPY.welcome) {
  return [C.dots, touch ? C.moveTouch : C.move, C.trips];
}

/** The first trip that can run among the home's rows ({id, off}), or null. Pure. */
export function firstTrip(rows) {
  const hit = (Array.isArray(rows) ? rows : []).find((r) => r && r.id && !r.off);
  return hit ? hit.id : null;
}

function isTouch(win) {
  try { return !!(win.matchMedia && win.matchMedia('(hover: none) and (pointer: coarse)').matches); } catch { return false; }
}

function storageOf(win) {
  try { return win.localStorage; } catch { return null; }
}

export function createWelcome(ctx, opts = {}) {
  const win = opts.win || window;
  const doc = win.document;
  const C = COPY.welcome;
  let root = null;
  let open = false;

  const pane = () => doc.getElementById('sr-pane-earth');
  const cards = () => [...(pane() ? pane().querySelectorAll('.sr-tripcard') : [])];

  function build() {
    root = doc.createElement('section');
    root.className = 'sr-sect sr-welcome';
    root.setAttribute('aria-label', C.label);
    const h = doc.createElement('h2');
    h.className = 'sr-micro';
    h.textContent = C.title;
    root.appendChild(h);
    const list = doc.createElement('ul');
    list.className = 'sr-welcome__lines';
    for (const line of welcomeLines(isTouch(win), C)) {
      const li = doc.createElement('li');
      li.textContent = line;
      list.appendChild(li);
    }
    root.appendChild(list);
    const row = doc.createElement('div');
    row.className = 'sr-welcome__actions';
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'sr-welcome__btn sr-welcome__go';
    go.title = C.tripTitle;
    go.appendChild(icon('play', 16));
    go.appendChild(doc.createTextNode(C.trip));
    const look = document.createElement('button');
    look.type = 'button';
    look.className = 'sr-welcome__btn sr-welcome__look';
    look.title = C.lookTitle;
    look.appendChild(icon('compass', 16));
    look.appendChild(doc.createTextNode(C.look));
    row.append(go, look);
    root.appendChild(row);
    go.addEventListener('click', () => {
      const id = firstTrip(cards().map((c) => ({ id: c.dataset.trip, off: c.classList.contains('is-off') })));
      const card = id ? cards().find((c) => c.dataset.trip === id) : null;
      hide('trip');
      if (card) card.click();
    });
    look.addEventListener('click', () => hide('look'));
  }

  // A press on the map is "Look around"; a trip that starts, or a thing chosen, ends it too.
  const onScene = (e) => { if (open && e.target && e.target.id === 'stage') hide('scene'); };
  const onSelect = (e) => { if (open && e.detail) hide('select'); };
  let offTrip = null;

  async function show() {
    if (open) return;
    const host = pane();
    if (!host) return;
    // Its rules come with it (css/finishers.css), and it is not shown unstyled.
    await loadCss('finishers', doc);
    if (open) return;
    if (!root) build();
    host.insertBefore(root, host.firstChild);
    open = true;
    doc.documentElement.classList.add('sr-welcoming');
    // Under the fold of a phone's peek: raise the sheet to half while the lines are up.
    try {
      const sheet = ctx.shell && typeof ctx.shell.sheet === 'function' ? ctx.shell.sheet() : null;
      if (sheet && typeof sheet.detent === 'function' && sheet.detent() === 'peek') sheet.set('half');
    } catch { /* no sheet: a desktop */ }
    doc.addEventListener('pointerdown', onScene, true);
    win.addEventListener('sr:select', onSelect);
    if (ctx.trip && typeof ctx.trip.onChange === 'function' && !offTrip) {
      offTrip = ctx.trip.onChange((st) => { if (open && st && st.phase && st.phase !== 'idle') hide('trip'); });
    }
  }

  function hide() {
    if (!open) return;
    open = false;
    doc.documentElement.classList.remove('sr-welcoming');
    doc.removeEventListener('pointerdown', onScene, true);
    win.removeEventListener('sr:select', onSelect);
    if (typeof offTrip === 'function') { offTrip(); offTrip = null; }
    const hadFocus = root.contains(doc.activeElement);
    root.remove();
    if (hadFocus) {
      const tab = doc.querySelector('.sr-tabs__tab[aria-selected="true"]');
      if (tab) tab.focus({ preventScroll: true });
    }
  }

  function maybeShow() {
    const cls = doc.documentElement.classList;
    const reason = decide('storage' in opts ? opts.storage : storageOf(win), {
      deepLink: !!opts.deepLink,
      embed: !!opts.embed,
      ambient: cls.contains('sr-ambient'),
      tripRunning: !!(ctx.trip && ctx.trip.state && ctx.trip.state.phase && ctx.trip.state.phase !== 'idle'),
      automated: !!opts.automated,
    });
    if (reason) return reason;
    show();
    return null;
  }

  return { get root() { return root; }, maybeShow, show, hide, isOpen: () => open };
}
