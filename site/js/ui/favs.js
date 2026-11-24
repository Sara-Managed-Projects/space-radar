// ui/favs.js -- the heart: a favourite kept in this browser (`sr:favs`), told to the platform where there is one.
//
// Contract, pure (tests/test_platform_bridge.mjs):
//   FAVS_KEY, FAVS_CAP
//   okKey(key)                        'site:slug' with a site the platform contract lists
//   readFavs(storage) -> [key]        oldest first; what is not a key is dropped, capped at FAVS_CAP
//   writeFavs(storage, keys) -> bool
//   toggleFav(storage, key, on) -> bool   the state now; a storage that keeps nothing answers `on` and keeps nothing
// Contract, DOM:
//   heartButton(key, words, opts) -> HTMLButtonElement   `.ui-btn--icon` with aria-pressed and data-sr-fav
//   wireHeart(button, words, opts)                       the same behaviour for a heart already in the page (the Lab's)
//
// WHY LOCAL FIRST. A heart works for everyone, signed in or not, on localhost and in a fork: it is a list in this
// browser, like the passport, and "Forget me" clears it. Where the platform runs, sr('fav', key, on) lets it keep the
// same list for an account (platform-bridge.js); nothing here builds a request.
//
// ONE OWNER FOR A PRESS (2026-11-24). This file answers the press, and only this file: the heart carries
// `data-sr-fav-host`, which tells platform.js the page handles it (the platform contract's note). platform.js used to answer
// the same click too, so every press turned the heart on and straight back off. Now it keeps the account in step with
// sr('fav') and never presses a heart itself. Signed in, the account's list is the truth, not this browser's: the press
// does not write `sr:favs` (that row is the hearts made signed out, offered to the account at sign-in), platform.js shows
// the account's state through aria-pressed (and puts a heart back when the account refused it), and the words follow.

import { sr, onPlatform } from './platform-bridge.js';

export const FAVS_KEY = 'sr:favs';
export const FAVS_CAP = 500;
const SITES = ['map', 'blog', 'video', 'games', 'models', 'lab', 'trip'];
// Lucide `heart` (ISC), on the 24 box; filled with the ink when pressed (ui.css, static.css).
const HEART = [['path', { d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' }]];
const SVG_NS = 'http://www.w3.org/2000/svg';

export function okKey(key) {
  if (typeof key !== 'string' || key.length > 120) return false;
  const i = key.indexOf(':');
  return i > 0 && SITES.includes(key.slice(0, i)) && key.length > i + 1;
}

export function readFavs(storage) {
  try {
    const raw = storage ? JSON.parse(storage.getItem(FAVS_KEY) || '[]') : [];
    if (!Array.isArray(raw)) return [];
    const out = [...new Set(raw.filter(okKey))];
    return out.slice(Math.max(0, out.length - FAVS_CAP));
  } catch { return []; }
}

export function writeFavs(storage, keys) {
  try {
    if (!storage) return false;
    const list = [...new Set((keys || []).filter(okKey))];
    storage.setItem(FAVS_KEY, JSON.stringify(list.slice(Math.max(0, list.length - FAVS_CAP))));
    return true;
  } catch { return false; }
}

export function toggleFav(storage, key, on) {
  if (!okKey(key)) return false;
  const list = readFavs(storage).filter((k) => k !== key);
  if (on) list.push(key);
  writeFavs(storage, list);
  return !!on;
}

const localStore = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };

// Whether the platform said someone is signed in (its `sr:platform` event; never on localhost, in a fork or offline).
let signedIn = false;
let listening = false;
const wired = new Set();
function listen(doc) {
  if (listening || !doc) return;
  listening = true;
  onPlatform((d) => { signedIn = !!(d && d.signedIn); }, doc);
  // Another tab changed the signed-out list: the hearts here follow (signed in, platform.js paints them).
  const win = doc.defaultView;
  if (win) win.addEventListener('storage', (e) => {
    if (signedIn || (e && e.key !== FAVS_KEY && e.key !== null)) return;
    for (const h of [...wired]) { if (!h.b.isConnected) { wired.delete(h); continue; } h.paint(readFavs(h.storage).includes(h.key)); }
  });
}

function heartIcon(doc) {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'sr-icon sr-icon--heart' })) svg.setAttribute(k, v);
  for (const [tag, attrs] of HEART) {
    const part = doc.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) part.setAttribute(k, v);
    svg.appendChild(part);
  }
  return svg;
}

/**
 * Wire a heart: `words` is {add, remove} (the names for a screen reader and the tooltip, in the page's language). Other
 * hearts for the same key on the page follow it, and so does a change made in another tab.
 */
export function wireHeart(b, words, opts = {}) {
  const key = b && b.getAttribute('data-sr-fav');
  if (!okKey(key)) return b;
  const storage = opts.storage !== undefined ? opts.storage : localStore();
  const doc = b.ownerDocument;
  listen(doc);
  // The words say what a press will do; they follow aria-pressed whoever set it (this file, or platform.js signed in).
  const label = () => {
    const said = b.getAttribute('aria-pressed') === 'true' ? words.remove : words.add;
    if (b.getAttribute('aria-label') !== said) b.setAttribute('aria-label', said);
    if (b.title !== said) b.title = said;
  };
  const paint = (on) => { b.setAttribute('aria-pressed', on ? 'true' : 'false'); label(); };
  b.setAttribute('data-sr-fav-host', '');
  if (!b.hasAttribute('aria-pressed') || !signedIn) paint(readFavs(storage).includes(key));
  else label();
  const win = doc && doc.defaultView;
  if (win && typeof win.MutationObserver === 'function') new win.MutationObserver(label).observe(b, { attributes: true, attributeFilter: ['aria-pressed'] });
  wired.add({ b, key, storage, paint });
  b.addEventListener('click', () => {
    const want = b.getAttribute('aria-pressed') !== 'true';
    // Signed out (or with no platform at all) the list is this browser's; signed in it is the account's (platform.js).
    const on = signedIn ? want : toggleFav(storage, key, want);
    for (const other of doc.querySelectorAll('[data-sr-fav]')) if (other !== b && other.getAttribute('data-sr-fav') === key) other.setAttribute('aria-pressed', on ? 'true' : 'false');
    paint(on);
    sr('fav', key, on);
    sr('track', on ? 'favourite_add' : 'favourite_remove', { key });
  });
  return b;
}

export function heartButton(key, words, opts = {}) {
  const doc = opts.document || document;
  const b = doc.createElement('button');
  b.type = 'button';
  // A small round icon button, or with `tile` a button as wide as its cell in the card's row of tiles (still the icon
  // alone: a word did not fit beside Look inside and Spotted, and the name is in aria-label and title).
  b.className = `ui-btn${opts.tile ? '' : ' ui-btn--icon ui-btn--sm'} sr-heart${opts.className ? ` ${opts.className}` : ''}`;
  b.setAttribute('data-sr-fav', key);
  b.appendChild(heartIcon(doc));
  return wireHeart(b, words, opts);
}
