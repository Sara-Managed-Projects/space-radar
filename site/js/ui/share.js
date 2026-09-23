// ui/share.js -- one Share control, on the card and in the letterbox (spec 0033, 2026-09-23).
// The link is the state: the hash keys ui/urlstate.js owns, or a trip's own page. The share sheet
// where the device has one; else the clipboard and a toast (desktop Chrome and Firefox have no
// sheet). No network, no SDK. The postcard module loads on the first tap only, and this file
// stays under 6 kB because it loads with every card (req 8; tests/test_share.mjs holds both).

import { COPY } from '../copy/en.js';
import { read } from './urlstate.js';

// A trip AT a stop (ui/trip.js STOP_PHASES); on its intro or end card it shares its own page.
const AT_STOP = ['flight', 'settle', 'dwell', 'held', 'paused'];

/** Where the app lives: `https://www.spaceradar.ai/`, or `…/site/` on a local server. */
export function appBase(loc = typeof location !== 'undefined' ? location : null) {
  if (!loc || !loc.origin) return '/';
  return loc.origin + String(loc.pathname || '/').replace(/[^/]*$/, '');
}

/**
 * The link for a view. Pure. A trip at stop 1 or on its intro is its short page, else the hash.
 * Keys are picked one by one, so a field not named here -- the visitor's own place above all --
 * can never reach a shared URL.
 */
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
  // No `t` means now and no `rate` means 1, as main.js writes them.
  if (s.t && s.t !== 'now') put('t', s.t);
  if (s.rate && Number(s.rate) !== 1) put('rate', s.rate);
  if (!s.trip) put('stage', s.stage); // a trip picks its own stage at every stop
  return keys.length ? `${root}#${keys.join('&')}` : root;
}

/** The state to share now: the hash, with a running trip's position and the card's own record. */
export function shareState(ctx, atId) {
  const st = { ...read() };
  delete st.trip;
  delete st.stop;
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
    toastNode.className = 'sr-toast';
    toastNode.setAttribute('role', 'status');
    document.body.appendChild(toastNode);
  }
  toastNode.textContent = line || '';
  toastNode.hidden = !line;
  clearTimeout(toastTimer);
  if (ms > 0) toastTimer = setTimeout(() => { toastNode.hidden = true; }, ms);
  return toastNode;
}

/** Share the view. A running trip's title and blurb beat the card's `words`: the link is the
 * trip's then. What happened is left on ctx.lastShare for a browser check. */
export async function shareLink(ctx, words, atId) {
  const url = shareUrl(shareState(ctx, atId));
  const w = tripWords(ctx) || words || {};
  const out = { url, title: w.title || COPY.app.name, text: w.text || '', via: null };
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title: out.title, text: out.text, url });
      out.via = 'share';
    } catch (e) {
      // A dismissed sheet is an answer, not an error; any other failure falls to the copy.
      out.via = e && e.name === 'AbortError' ? 'dismissed' : null;
    }
  }
  if (!out.via) {
    try {
      await nav.clipboard.writeText(url);
      out.via = 'clipboard';
    } catch {
      out.via = 'none';
    }
    // The clipboard refused (an unfocused page, no permission): the toast carries the link itself.
    toast(out.via === 'none' ? url : COPY.share.copied, out.via === 'none' ? 8000 : 2000);
  }
  if (ctx) ctx.lastShare = out;
  return out;
}

let busy = false;

/** "Save a picture": ui/postcard.js, imported on the first tap. */
export async function savePicture(ctx, record) {
  if (busy) return null;
  busy = true;
  toast(COPY.share.making, 0);
  try {
    const { savePostcard } = await import('./postcard.js');
    return await savePostcard(ctx, record, shareUrl(shareState(ctx, record && record.id)));
  } catch (e) {
    toast(COPY.share.failed);
    if (ctx) ctx.lastPostcard = { error: String(e && e.message || e) };
    return null;
  } finally {
    busy = false;
  }
}

function button(className, label, title, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = label;
  b.title = title;
  b.addEventListener('click', onClick);
  return b;
}

/** `words()` is read at the tap, so the sentence is the one on screen then. */
export function shareButton(ctx, className, words, atId) {
  return button(className, COPY.share.link, COPY.share.linkTitle, () =>
    shareLink(ctx, typeof words === 'function' ? words() : words, atId));
}

export function pictureButton(ctx, className, record) {
  return button(className, COPY.share.picture, COPY.share.pictureTitle, () => savePicture(ctx, record));
}
