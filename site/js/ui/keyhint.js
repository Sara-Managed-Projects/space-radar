// ui/keyhint.js -- the controls hint, shown once (spec 0068 task 2).
//
// Ivan, 2026-10-02: "add info how to control with buttons, I think it should appear once in the
// right bottom corner (arrows buttons and w s buttons) it should be nicely designed in general
// styles buttons with some nice animation". A small glass panel in the bottom-right corner: the
// keys that move the camera drawn as keycaps that press themselves once, in order, and the four
// keys that work the chrome. On a touch screen it is the gestures instead.
//
// ONCE PER VISITOR. Remembered in localStorage['sr:keyhint'] the moment it shows, so a reload in
// the middle of it does not show it again. A browser that refuses storage (it throws: Safari with
// site data blocked, a sandboxed frame) gets no hint at all: "once" is a promise this page could
// not keep there, and a hint that comes back on every visit is nagging, not help. ctx.keyhint.show()
// opens it on request whatever the memory says (the What-to-show row that will call it is a
// follow-up of spec 0068).
//
// WHEN. LAZY: main.js imports this KEYHINT_MS after sr:layers-ready, so the first visit's bytes are
// the map's, then calls maybeShow(). Never during a trip (the trip has its own keys and its own
// toolbar), never when the visitor arrived by a link (they came to see something in particular, and
// the trip or the object is on screen), never over a clear screen (H). A suppressed hint is not
// remembered, so it waits for the next ordinary visit.
//
// GONE. The × (a 44 px target on a phone), Escape, the first real hand on the camera (a drag, the
// wheel, a pinch or one of its keys; KEY_GRACE_MS later, so the keycap that was pressed is seen
// lighting up), a trip starting, or AUTO_HIDE_MS untouched. The auto-hide waits while the pointer
// is over it or focus is in it, as a toast does (docs/ui-guide.md §3.14).
//
// HONEST KEYS. Every keycap names the KeyboardEvent.key values it stands for, and
// tests/test_keyhint.mjs holds each one to the module that answers it: scene/camera.js CAMERA_KEYS
// for turning and zooming, ui/explore.js for /, ui/cleanview.js for H, ui/rail.js for L and P. A keycap for a key that
// does nothing is the worst thing a hint can show.
//
// MOTION. The panel comes up 8 px and fades in (--sr-mid); each keycap presses once, in turn, a
// --sr-fast apart (keyhint.css). Nothing loops. Reduced motion: a 120 ms fade, keycaps still.

import { COPY } from '../copy/en.js';
import { icon } from './cards.js';

export const STORE_KEY = 'sr:keyhint';
/** Untouched, it goes by itself (about twelve seconds is two slow reads of it). */
export const AUTO_HIDE_MS = 12000;
/** The hand on the camera that dismisses it counts only once it has been up this long. */
export const MIN_SHOWN_MS = 1200;
/** A key from the hint lights its keycap; the hint goes this long after, so the light is seen. */
export const KEY_GRACE_MS = 1600;

/**
 * The keyboard version. `keys` are the KeyboardEvent.key values a cap stands for, in the order
 * the camera reads them (scene/camera.js applyHeldKeys). `does`/`how` are COPY.keyHint keys.
 */
export const KEY_ROWS = [
  {
    id: 'turn', does: 'turn', how: 'drag', howIcon: 'move', layout: 'arrows',
    caps: [
      { id: 'up', keys: ['ArrowUp'] },
      { id: 'left', keys: ['ArrowLeft'] },
      { id: 'down', keys: ['ArrowDown'] },
      { id: 'right', keys: ['ArrowRight'] },
    ],
  },
  {
    id: 'zoom', does: 'zoom', how: 'wheel', howIcon: 'mouse', layout: 'zoom',
    caps: [
      { id: 'w', keys: ['w', 'W'] },
      { id: 's', keys: ['s', 'S'] },
      { id: 'plus', keys: ['+', '='] },
      { id: 'minus', keys: ['-', '_'] },
      { id: 'pgUp', keys: ['PageUp'], wide: true },
      { id: 'pgDn', keys: ['PageDown'], wide: true },
    ],
  },
];

/** The chrome's keys, one cap each. */
export const CHROME_KEYS = [
  { id: 'slash', keys: ['/'], does: 'search' },
  { id: 'h', keys: ['h', 'H'], does: 'hide' },
  { id: 'l', keys: ['l', 'L'], does: 'show' },
  { id: 'p', keys: ['p', 'P'], does: 'share' },
  { id: 'esc', keys: ['Escape'], does: 'esc', wide: true },
];

/** The touch version: what each gesture does to the camera (scene/camera.js pointers). */
export const TOUCH_ROWS = [
  { id: 'drag', does: 'turn' },
  { id: 'pinch', does: 'zoom' },
  { id: 'two', does: 'pan' },
  { id: 'tap', does: 'pick' },
];

/** Every cap, in the order they press. */
export function allCaps() {
  return [...KEY_ROWS.flatMap((r) => r.caps), ...CHROME_KEYS];
}

/** The cap a KeyboardEvent.key lights, or null. Pure. */
export function capForKey(key) {
  const hit = allCaps().find((c) => c.keys.includes(key));
  return hit ? hit.id : null;
}

/** true seen, false not yet, null when the storage cannot be read at all. Never throws. */
export function readSeen(storage) {
  try {
    if (!storage) return null;
    return storage.getItem(STORE_KEY) === '1';
  } catch {
    return null;
  }
}

/** Remember it; false when the storage refused. Never throws. */
export function markSeen(storage) {
  try {
    if (!storage) return false;
    storage.setItem(STORE_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Why not to show it now, or null to show it. Pure.
 * @param {{seen: boolean|null, tripRunning?: boolean, deepLink?: boolean, clean?: boolean}} s
 */
export function whyNot(s) {
  if (s.seen === null) return 'no-memory';
  if (s.seen) return 'seen';
  if (s.deepLink) return 'deep-link';
  if (s.tripRunning) return 'trip';
  if (s.clean) return 'clean';
  return null;
}

/**
 * The first visit's decision, and its memory: null to show it (and it is remembered now), else
 * why not. A storage that can be read but not written is no memory either: showing it would be
 * showing it again next time. Never throws.
 */
export function decide(storage, s) {
  const reason = whyNot({ ...s, seen: readSeen(storage) });
  if (reason) return reason;
  return markSeen(storage) ? null : 'no-memory';
}

/** 'touch' on a screen with no hover and a coarse pointer, else 'keys'. */
export function hintMode(win) {
  try {
    const mm = win && typeof win.matchMedia === 'function' ? win.matchMedia('(hover: none) and (pointer: coarse)') : null;
    return mm && mm.matches ? 'touch' : 'keys';
  } catch {
    return 'keys';
  }
}

function storageOf(win) {
  try { return win.localStorage; } catch { return null; }
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
// Lucide (ISC; CREDITS.md): `move` and `mouse`, drawn as docs/ui-guide.md §3.16 says.
const GLYPHS = {
  move: [['path', { d: 'M12 2v20' }], ['path', { d: 'm15 19-3 3-3-3' }], ['path', { d: 'm19 9 3 3-3 3' }],
    ['path', { d: 'M2 12h20' }], ['path', { d: 'm5 9-3 3 3 3' }], ['path', { d: 'm9 5 3-3 3 3' }]],
  mouse: [['rect', { x: 5, y: 2, width: 14, height: 20, rx: 7 }], ['path', { d: 'M12 6v4' }]],
};

function glyph(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor',
    'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) {
    svg.setAttribute(k, String(v));
  }
  for (const [tag, attrs] of GLYPHS[name] || []) {
    const part = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) part.setAttribute(k, String(v));
    svg.appendChild(part);
  }
  return svg;
}

/** keyhint.css, linked on the first show and waited for, so the panel never shows unstyled. */
let cssLoading = null;
function loadCss() {
  if (cssLoading) return cssLoading;
  cssLoading = new Promise((resolve) => {
    const href = new URL('../../css/keyhint.css', import.meta.url).href;
    if ([...document.querySelectorAll('link[rel=stylesheet]')].some((l) => l.href === href)) { resolve(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    document.head.appendChild(link);
  });
  return cssLoading;
}

/**
 * The hint for this page, made once; ctx.keyhint is its api.
 * @param {Object} ctx  the app (window.spaceRadar): trip, cameraRig
 * @param {{deepLink?: boolean, win?: Window}} [opts]
 */
export function createKeyHint(ctx, opts = {}) {
  if (ctx && ctx.keyhint && ctx.keyhint.isReal) return ctx.keyhint;
  const win = opts.win || window;
  const W = COPY.keyHint;
  let root = null;
  let mode = null;
  let open = false;
  let shownAt = 0;
  let autoTimer = 0;
  let keyTimer = 0;
  let held = 0; // the pointer over it, or focus in it: the auto-hide waits
  const caps = new Map();

  function cap(c, i) {
    const k = el('kbd', `sr-keyhint__cap${c.wide ? ' sr-keyhint__cap--wide' : ''}`, W.caps[c.id]);
    k.dataset.cap = c.id;
    k.style.setProperty('--i', String(i));
    caps.set(c.id, k);
    return k;
  }

  function line(doesKey, howKey, howIcon) {
    const words = el('span', 'sr-keyhint__words');
    words.appendChild(el('span', 'sr-keyhint__does', W.does[doesKey]));
    if (howKey) {
      const how = el('span', 'sr-keyhint__how');
      if (howIcon) how.appendChild(glyph(howIcon));
      how.appendChild(el('span', null, W.how[howKey]));
      words.appendChild(how);
    }
    return words;
  }

  function buildKeys(body) {
    let i = 0;
    for (const row of KEY_ROWS) {
      const r = el('div', `sr-keyhint__row sr-keyhint__row--${row.id}`);
      const keys = el('span', `sr-keyhint__keys sr-keyhint__keys--${row.layout}`);
      for (const c of row.caps) keys.appendChild(cap(c, i++));
      r.appendChild(keys);
      r.appendChild(line(row.does, row.how, row.howIcon));
      body.appendChild(r);
    }
    const grid = el('div', 'sr-keyhint__chrome');
    for (const c of CHROME_KEYS) {
      const item = el('div', 'sr-keyhint__item');
      item.appendChild(cap(c, i++));
      item.appendChild(el('span', 'sr-keyhint__does', W.does[c.does]));
      grid.appendChild(item);
    }
    body.appendChild(grid);
  }

  function buildTouch(body) {
    const grid = el('div', 'sr-keyhint__touch');
    TOUCH_ROWS.forEach((row, i) => {
      const item = el('div', 'sr-keyhint__item');
      const pad = el('span', `sr-keyhint__pad sr-keyhint__pad--${row.id}`);
      pad.setAttribute('aria-hidden', 'true');
      pad.style.setProperty('--i', String(i));
      const fingers = row.id === 'pinch' || row.id === 'two' ? 2 : 1;
      for (let f = 0; f < fingers; f += 1) pad.appendChild(el('span', 'sr-keyhint__dot'));
      item.appendChild(pad);
      const words = el('span', 'sr-keyhint__words');
      words.appendChild(el('span', 'sr-keyhint__does', W.does[row.does]));
      words.appendChild(el('span', 'sr-keyhint__how', W.how[row.id]));
      item.appendChild(words);
      grid.appendChild(item);
    });
    body.appendChild(grid);
  }

  function build() {
    mode = hintMode(win);
    root = el('section', `sr-keyhint sr-float sr-keyhint--${mode}`);
    root.hidden = true;
    root.setAttribute('role', 'status');
    root.setAttribute('aria-live', 'polite');
    root.setAttribute('aria-label', mode === 'touch' ? W.labelTouch : W.label);
    const head = el('header', 'sr-keyhint__head');
    head.appendChild(el('p', 'sr-keyhint__micro', mode === 'touch' ? W.titleTouch : W.title));
    const close = el('button', 'sr-keyhint__close');
    close.type = 'button';
    close.setAttribute('aria-label', W.close);
    close.title = W.closeTitle;
    close.appendChild(icon('x', 16));
    close.addEventListener('click', () => hide('close'));
    head.appendChild(close);
    root.appendChild(head);
    const body = el('div', 'sr-keyhint__body');
    if (mode === 'touch') buildTouch(body);
    else buildKeys(body);
    root.appendChild(body);
    const hold = () => { held += 1; clearTimeout(autoTimer); };
    const release = () => { held = Math.max(0, held - 1); if (!held && open) armAuto(); };
    root.addEventListener('pointerenter', hold);
    root.addEventListener('pointerleave', release);
    root.addEventListener('focusin', hold);
    root.addEventListener('focusout', release);
    document.body.appendChild(root);
  }

  function armAuto() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => { if (!held) hide('timeout'); }, AUTO_HIDE_MS);
  }

  /** Out of the time pill's way: where they would overlap (a narrow scene, a phone), it rises above. */
  function place() {
    root.style.removeProperty('bottom');
    const pill = document.querySelector('.sr-time');
    if (!pill) return;
    const b = pill.getBoundingClientRect();
    if (!(b.width > 0)) return; // hidden (a trip, a clear screen): nothing to avoid
    const a = root.getBoundingClientRect();
    const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    if (overlap) root.style.bottom = `${Math.round(win.innerHeight - b.top + 12)}px`;
  }

  async function show() {
    if (open) return true;
    await loadCss();
    if (!root) build();
    open = true;
    shownAt = Date.now();
    root.classList.remove('is-leaving');
    root.hidden = false;
    // A fresh run of the keycap sequence on every showing (keyhint.css keys it on .is-playing).
    root.classList.remove('is-playing');
    void root.offsetWidth;
    root.classList.add('is-playing');
    place();
    if (!held) armAuto();
    return true;
  }

  function hide() {
    if (!open || !root) return;
    open = false;
    clearTimeout(autoTimer);
    clearTimeout(keyTimer);
    keyTimer = 0;
    const hadFocus = root.contains(document.activeElement);
    root.classList.add('is-leaving');
    setTimeout(() => { if (!open && root) { root.hidden = true; root.classList.remove('is-leaving'); } }, 160);
    for (const k of caps.values()) k.classList.remove('is-down');
    if (hadFocus && document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
  }

  /** A real hand on the camera: gone, after a beat (it has been read). */
  function handled() {
    if (!open || Date.now() - shownAt < MIN_SHOWN_MS || keyTimer) return;
    keyTimer = setTimeout(() => { keyTimer = 0; hide('used'); }, KEY_GRACE_MS);
  }

  /** The first visit's one chance: shown unless whyNot() says otherwise, and remembered. */
  async function maybeShow() {
    const html = document.documentElement;
    const reason = decide(storageOf(win), {
      deepLink: !!opts.deepLink,
      tripRunning: !!(ctx && ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle') || html.classList.contains('sr-trip-mode'),
      clean: html.classList.contains('sr-clean'),
    });
    if (reason) return reason;
    await show();
    return null;
  }

  // The keys: a cap lights while its key is down. On the WINDOW in the capture phase, the first stop
  // of every key: the clear screen stops H's propagation at the document (ui/cleanview.js), and the
  // H cap must still light. Escape closes the hint before anything else hears it (the document's
  // capture, as the rail's popover does), unless something has already taken it.
  win.addEventListener('keydown', (e) => {
    if (!open || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target && e.target.tagName ? String(e.target.tagName).toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const id = capForKey(e.key);
    if (!id) return;
    const k = caps.get(id);
    if (k) k.classList.add('is-down');
    if (id !== 'esc') handled();
  }, true);
  win.addEventListener('keyup', (e) => {
    const id = capForKey(e.key);
    const k = id ? caps.get(id) : null;
    if (k) k.classList.remove('is-down');
  });
  document.addEventListener('keydown', (e) => {
    if (!open || e.key !== 'Escape' || e.defaultPrevented) return;
    e.preventDefault();
    e.stopPropagation();
    hide('esc');
  }, true);
  if (ctx && ctx.cameraRig && typeof ctx.cameraRig.onUserInput === 'function') {
    ctx.cameraRig.onUserInput((kind) => { if (kind !== 'keys') handled(); });
  }
  if (ctx && ctx.trip && typeof ctx.trip.onChange === 'function') {
    ctx.trip.onChange((st) => { if (st && st.phase !== 'idle') hide('trip'); });
  }
  win.addEventListener('resize', () => { if (open) place(); });

  const api = { isReal: true, show, hide, maybeShow, isOpen: () => open, mode: () => mode, el: () => root };
  if (ctx) ctx.keyhint = api;
  return api;
}
