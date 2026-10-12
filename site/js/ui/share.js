// ui/share.js -- the one way in to sharing (spec 0033, spec 0061 task 8).
//
// Contract, stable (the trip toolbar calls it):
//   installShare(ctx) -> ctx.share = { open, close, isOpen }
//   ctx.share.open({ record, trip, opener }) -> Promise
//     record  what to share (its tag, words, page); omitted: the selection, else the view
//     trip    true, or the running trip's id: it, where it is; another id or {id}: its page. Beats record.
//     opener  where focus returns on close (default: the focused element)
// Also: appBase, shareUrl, shareState, tripWords (pure), toast, openShare, savePostcard, shareButton.
//
// WHY ONE ENTRY. There were three. Ivan, 2026-10-01: "full post, postcard, link and full text".
// This loads with every card, so it is the link rules and the door only: ui/sharesheet.js is
// imported on the first open.

import { COPY } from '../copy/en.js';
import { read } from './urlstate.js';

// A trip AT a stop (ui/trip.js STOP_PHASES); on its intro or end card it shares its own page.
const AT_STOP = ['flight', 'settle', 'dwell', 'held', 'paused'];

/** Where the app lives: `https://www.spaceradar.ai/`, or `…/site/` on a local server. */
export function appBase(loc = typeof location !== 'undefined' ? location : null) {
  if (!loc || !loc.origin) return '/';
  return loc.origin + String(loc.pathname || '/').replace(/[^/]*$/, '');
}

/** The link for a view. Pure. A trip at stop 1 or on its intro is its short page, else the hash.
 * Keys are picked one by one: the visitor's own place can never reach a shared URL. */
export function shareUrl(st, base = appBase()) {
  const s = st || {};
  const root = String(base).endsWith('/') ? String(base) : `${base}/`;
  const stop = Number(s.stop) || 0;
  if (s.trip && stop <= 1) return `${root}t/${encodeURIComponent(s.trip)}.html`;
  const keys = [];
  const put = (k, v) => {
    if (v !== undefined && v !== null && v !== '') keys.push(`${k}=${encodeURIComponent(String(v))}`);
  };
  if (s.m && s.m !== 'wonder') put('m', s.m);
  if (s.trip) {
    put('trip', s.trip);
    put('stop', stop);
  } else put('at', s.at);
  // No `t` is now, no `rate` is 1.
  if (s.t && s.t !== 'now') put('t', s.t);
  if (s.rate && Number(s.rate) !== 1) put('rate', s.rate);
  if (!s.trip) put('stage', s.stage); // a trip picks its own stage at every stop
  if (s.exp === 'eye' || s.exp === 'deep') put('exp', s.exp); // the shutter (#460)
  return keys.length ? `${root}#${keys.join('&')}` : root;
}

/** The state to share now: the hash, with a running trip's position and the card's own record. */
export function shareState(ctx, atId) {
  const st = { ...read() };
  delete st.trip;
  delete st.stop;
  st.exp = ctx && ctx.exposure ? ctx.exposure.mode() : null; // as it IS
  const trip = ctx && ctx.trip && ctx.trip.state;
  if (trip && trip.phase !== 'idle' && trip.tourId) {
    st.trip = trip.tourId;
    st.stop = AT_STOP.includes(trip.phase) && trip.index >= 0 ? trip.index + 1 : 0;
  } else if (atId) st.at = atId;
  return st;
}

/** A running trip's title and blurb, or null. */
export function tripWords(ctx) {
  const trip = ctx && ctx.trip;
  const st = trip && trip.state;
  if (!st || st.phase === 'idle' || !st.tourId || typeof trip.tours !== 'function') return null;
  const tour = trip.tours().find((x) => x.id === st.tourId);
  return tour ? { title: tour.title, text: tour.blurb } : { title: st.tourTitle, text: '' };
}

let toastNode = null;
let toastTimer = 0;

/** One line at the foot of the screen, one at a time; `ms` 0 keeps it up, no line hides it. */
export function toast(line, ms = 2000) {
  if (typeof document === 'undefined') return null;
  if (!toastNode || !toastNode.isConnected) {
    toastNode = document.createElement('div');
    toastNode.className = 'sr-toast sr-over-clean';
    toastNode.setAttribute('role', 'status');
    document.body.appendChild(toastNode);
  }
  toastNode.textContent = line || '';
  toastNode.hidden = !line;
  clearTimeout(toastTimer);
  if (ms > 0) toastTimer = setTimeout(() => { toastNode.hidden = true; }, ms);
  return toastNode;
}

// What went wrong is left on ctx for a browser check, and said in one line.
const oops = (ctx, key, line, e) => {
  toast(line);
  if (ctx) ctx[key] = { error: String((e && e.message) || e) };
  return null;
};

let sheet = null;
let loading = null;
const load = (ctx) => loading || (loading = import('./sharesheet.js')
  .then((m) => (sheet = m.createShareSheet(ctx)))
  .catch((e) => { loading = null; throw e; }));

/** ctx.share: the door; the sheet behind it loads on the first open. */
export function installShare(ctx) {
  const api = {
    open: (opts = {}) => load(ctx)
      .then((s) => s.open({ ...opts, opener: opts.opener || document.activeElement }))
      .catch((e) => oops(ctx, 'lastShare', COPY.share.failed, e)),
    close: () => sheet && sheet.close(),
    isOpen: () => !!sheet && sheet.isOpen(),
  };
  if (ctx) ctx.share = api;
  return api;
}

/** The sheet, installing the door if the rail has not (a test, an embed). */
export const openShare = (ctx, opts) => ((ctx && ctx.share) || installShare(ctx)).open(opts);

let saving = false;

/** The card's Postcard: this view's print picture with `record`'s tag, saved. */
export async function savePostcard(ctx, record) {
  if (saving) return null;
  saving = true;
  toast(COPY.print.making, 0);
  try {
    const { makePostcard } = await import('./printcompose.js');
    const { out } = await makePostcard(ctx, 'jpeg', { record: record || null, withTag: !!record });
    toast(COPY.print.saved);
    if (ctx) ctx.lastPrint = out;
    return out;
  } catch (e) {
    return oops(ctx, 'lastPrint', COPY.print.failed, e);
  } finally {
    saving = false;
  }
}

/** The trip bar's Share: the running trip, at the stop it is on. */
export function shareButton(ctx, className) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = COPY.share.link;
  b.title = COPY.share.linkTitle;
  b.setAttribute('aria-haspopup', 'dialog');
  b.addEventListener('click', () => openShare(ctx, { trip: true, opener: b }));
  return b;
}
