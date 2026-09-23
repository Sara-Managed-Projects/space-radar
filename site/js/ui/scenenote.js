// ui/scenenote.js -- one note on the scene when no satellite could be read at all.
//
// Contract: createSceneNote(ctx) -> { check(), say(text), destroy() }
// Also exported, pure, for the test: refusedEverywhere(statuses, counts) -> boolean
//
// `say(text)` (spec 0032, 2026-09-23) is the second thing the note can carry: one line about a
// deep link that named a trip, an object or a place this map does not have. Same place on the
// screen, same close button, no "why" button (there is no drawer to open for it). It takes the
// note over until it is closed; the satellite line, if it is due, comes back after.
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

/** Pure. `statuses` is sources.status(); `counts` maps a layer id to its record count. */
export function refusedEverywhere(statuses, counts) {
  const celestrak = (Array.isArray(statuses) ? statuses : []).filter((s) => s && /^celestrak-/.test(String(s.id)));
  if (!celestrak.length) return false;
  if (!celestrak.every((s) => s.state === 'could-not-look')) return false;
  return SATELLITE_LAYERS.every((id) => !((counts && counts.get(id)) > 0));
}

export function createSceneNote(ctx) {
  if (typeof document === 'undefined') return { check() {}, say() {}, destroy() {} };
  const T = COPY.sceneNote;
  const root = document.createElement('aside');
  root.className = 'sr-scenenote';
  root.setAttribute('role', 'status');
  root.hidden = true;
  const text = document.createElement('p');
  text.className = 'sr-scenenote__text';
  text.textContent = T.refused;
  const why = document.createElement('button');
  why.type = 'button';
  why.className = 'sr-btn sr-scenenote__why';
  why.textContent = T.why;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'sr-scenenote__close';
  close.textContent = T.close;
  close.title = T.closeTitle;
  root.append(text, why, close);
  document.body.appendChild(root);

  let settled = false;
  let dismissed = false;
  let said = null;

  function check() {
    if (said) {
      text.textContent = said;
      why.hidden = true;
      root.hidden = false;
      return;
    }
    text.textContent = T.refused;
    why.hidden = false;
    if (!settled || dismissed) { root.hidden = true; return; }
    const counts = new Map(SATELLITE_LAYERS.map((id) => [id, (ctx.recordsFor(id) || []).length]));
    let statuses = [];
    try { statuses = ctx.sources && typeof ctx.sources.status === 'function' ? ctx.sources.status() : []; } catch { statuses = []; }
    root.hidden = !refusedEverywhere(statuses, counts);
  }

  /** One line of the caller's own, until it is closed. */
  function say(line) {
    said = line ? String(line) : null;
    check();
  }

  why.addEventListener('click', () => {
    if (ctx.mobile && ctx.mobile.isPhone) { ctx.mobile.setOpen('sr-status'); return; }
    const panel = document.getElementById('sr-status');
    if (panel) { panel.scrollIntoView({ block: 'start' }); panel.setAttribute('tabindex', '-1'); panel.focus({ preventScroll: true }); }
  });
  // Closing the link's line closes only that line; the satellite line is its own dismissal.
  close.addEventListener('click', () => { if (said) said = null; else dismissed = true; check(); });
  const onReady = () => { settled = true; check(); };
  const onLayer = () => check();
  window.addEventListener('sr:layers-ready', onReady);
  window.addEventListener('sr:layer', onLayer);

  return {
    check,
    say,
    destroy() {
      window.removeEventListener('sr:layers-ready', onReady);
      window.removeEventListener('sr:layer', onLayer);
      root.remove();
    },
  };
}
