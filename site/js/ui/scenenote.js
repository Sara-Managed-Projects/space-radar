// ui/scenenote.js -- one note on the scene when no satellite could be read at all.
//
// Contract: createSceneNote(ctx) -> { check(), say(text, opts?), clearLink(), destroy() }
// Also exported, pure, for the test: refusedEverywhere(statuses, counts) -> boolean
//
// `say(text)` (spec 0032, 2026-09-23) is the second thing the note can carry: one line about a
// deep link that named a trip, an object or a place this map does not have. Same place on the
// screen, same close button, no "why" button (there is no drawer to open for it). It takes the
// note over until it is closed; the satellite line, if it is due, comes back after.
// A LINK'S line (`say(text, { link: true })`, main.js linkNote) does not wait to be closed: it goes after
// LINK_NOTE_MS, and at once when the next link is applied (`clearLink()`), so "That object is not on this
// map" is never left standing over the next, valid view (review of 16 Nov 2026).
//
// WHY. A visitor whose connection CelesTrak refuses -- a phone behind carrier NAT on its first
// visit, or this machine for all of 2026-09-22 -- saw a beautiful Earth with nothing on it and not a
// word about why. The reason was one tap away, in the Sources drawer, which nobody opens to find
// out why a map is empty. So the scene says it, once, in one line: what is missing, whose feed it
// is, and what still works. A button goes to the full account; the note closes, and it goes away by
// itself the moment a satellite layer does arrive.
//
// WHEN. Only after the first round of layers has settled (no flash while things are merely slow),
// only when EVERY CelesTrak file said "could not look" and the station and bright-satellite layers
// hold nothing, and never during a trip, which has its own frame.

import { COPY } from '../copy/en.js';

const SATELLITE_LAYERS = ['stations', 'visual'];
/** How long a link's line stays when nobody closes it: long enough to read twice. */
export const LINK_NOTE_MS = 9000;

/** Pure. `statuses` is sources.status(); `counts` maps a layer id to its record count. */
export function refusedEverywhere(statuses, counts) {
  const celestrak = (Array.isArray(statuses) ? statuses : []).filter((s) => s && /^celestrak-/.test(String(s.id)));
  if (!celestrak.length) return false;
  if (!celestrak.every((s) => s.state === 'could-not-look')) return false;
  return SATELLITE_LAYERS.every((id) => !((counts && counts.get(id)) > 0));
}

export function createSceneNote(ctx) {
  if (typeof document === 'undefined') return { check() {}, say() {}, clearLink() {}, destroy() {} };
  const T = COPY.sceneNote;
  const root = document.createElement('aside');
  root.className = 'sr-scenenote sr-float';
  root.setAttribute('role', 'status');
  root.hidden = true;
  const text = document.createElement('p');
  text.className = 'sr-scenenote__text';
  text.textContent = T.refused;
  const why = document.createElement('button');
  why.type = 'button';
  why.className = 'ui-btn ui-btn--sm ui-btn--secondary';
  why.textContent = T.why;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'ui-close';
  // The icon set's x (ui/icons.js `x`), drawn here: this note is in the boot graph and icons.js is not.
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  for (const [k, v] of [['viewBox', '0 0 24 24'], ['width', '20'], ['height', '20'], ['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '1.75'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true'], ['focusable', 'false'], ['class', 'sr-icon sr-icon--x']]) svg.setAttribute(k, v);
  for (const d of ['M18 6 6 18', 'm6 6 12 12']) svg.appendChild(document.createElementNS(NS, 'path')).setAttribute('d', d);
  close.appendChild(svg);
  close.title = T.closeTitle;
  close.setAttribute('aria-label', T.closeTitle);
  root.append(text, why, close);
  document.body.appendChild(root);

  let settled = false;
  let dismissed = false;
  let said = null;

  function check() {
    if (said) {
      text.textContent = said;
      text.title = '';
      why.hidden = true;
      root.hidden = false;
      return;
    }
    text.textContent = T.refused;
    text.title = T.refusedTitle;
    why.hidden = false;
    if (!settled || dismissed) { root.hidden = true; return; }
    const counts = new Map(SATELLITE_LAYERS.map((id) => [id, (ctx.recordsFor(id) || []).length]));
    let statuses = [];
    try { statuses = ctx.sources && typeof ctx.sources.status === 'function' ? ctx.sources.status() : []; } catch { statuses = []; }
    root.hidden = !refusedEverywhere(statuses, counts);
  }

  /** One line of the caller's own, until it is closed; a link's line (`opts.link`) also goes by itself. */
  let saidByLink = false;
  let linkTimer = 0;
  function say(line, opts = null) {
    clearTimeout(linkTimer);
    said = line ? String(line) : null;
    saidByLink = !!(said && opts && opts.link);
    if (saidByLink) linkTimer = setTimeout(clearLink, LINK_NOTE_MS);
    check();
  }
  /** Take a link's line down (the next link is being applied, or its time is up). Any other line stays. */
  function clearLink() {
    clearTimeout(linkTimer);
    if (!saidByLink) return;
    saidByLink = false;
    said = null;
    check();
  }

  why.addEventListener('click', () => {
    // The sources sheet, a view of the sidebar since spec 0061 (ui/shell.js openSources: the sheet
    // at full on a phone, the sidebar's sources view on a desktop).
    if (ctx.shell) ctx.shell.openSources();
  });
  // Closing the link's line closes only that line; the satellite line is its own dismissal.
  close.addEventListener('click', () => { clearTimeout(linkTimer); saidByLink = false; if (said) said = null; else dismissed = true; check(); });
  const onReady = () => { settled = true; check(); };
  const onLayer = () => check();
  window.addEventListener('sr:layers-ready', onReady);
  window.addEventListener('sr:layer', onLayer);

  return {
    check,
    say,
    clearLink,
    destroy() {
      clearTimeout(linkTimer);
      window.removeEventListener('sr:layers-ready', onReady);
      window.removeEventListener('sr:layer', onLayer);
      root.remove();
    },
  };
}
