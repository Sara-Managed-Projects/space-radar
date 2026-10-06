// ui/embed.js -- one live object in someone else's page (public #439, spec 0059 requirement 8).
//
// Never at boot: main.js imports this only for an address with `?embed=1`, and ui/sharesheet.js
// (itself imported on the first Share) for the snippet. A normal visit downloads none of it.
//
// Contract:
//   installEmbed(search) -> Promise<{ link, attach(ctx) }>   the page's half, before the shell is built
//   pure, for tests/test_embed.mjs and the share sheet:
//     isEmbed(search)                 does this address ask for the embed
//     embedLink(search)               the view its query names: {at, trip, stop, t, stage, exp}
//     embedState(shareState, trip)    what of the view on screen an embed carries
//     embedUrl(state, base)           `…/?embed=1&at=sat-25544`
//     fullUrl(state, base)            the same view in the whole app: `…/#at=sat-25544`
//     embedSnippet(state, opts)       the <iframe> a journalist pastes
//
// WHY. "The way this gets in front of people who will never type the name is a journalist's
// article on launch morning. They will not send their readers to a dashboard. They will embed a
// thing." So: the scene, the object's own tag (the HUD's reticle and readout, ui/hud.js) and ONE
// link, "Open in Space Radar". No sidebar, no rail, no time pill, no search, no trip list, no
// sources button, no hint, no toast.
//
// THE ADDRESS is a query, `?embed=1&at=<id>` or `?embed=1&trip=<id>`, not the app's hash: a CMS
// that strips fragments from an iframe's src still embeds the right thing, and CloudFront's logs
// (the only counting the project allows) see `embed=1` without a script on the page. Only the
// EMBED_KEYS are read; the hash is still honoured and wins, so a link made by hand works too.
//
// HOW IT IS LIGHT. The app's first screen is one static module graph, and an embed boots the same
// one (a second, smaller app would be a second thing to keep honest). What it skips is everything
// the full map fetches AFTER its first view: the controls hint, the subscribe row, the aurora, the
// weather, today's clouds and the idle load of the far catalogues (main.js, each `!embed`), which
// load only if the link itself names something in them. And no service worker: ui/offline.js is
// not fetched for an embed, so a frame under someone else's headline stores nothing on the
// reader's device (a worker already installed by a visit to the full map still serves its files).
//
// THE KEYBOARD is the host page's. Inside the frame only the camera's own keys are let through
// (scene/camera.js CAMERA_KEYS); H, P, L, / and Escape do nothing, because the panels they open
// are not on screen.

import { COPY } from '../copy/en.js';
import { CAMERA_KEYS } from '../scene/camera.js';

/** The keys an embed's query may carry, in the order they are written. */
export const EMBED_KEYS = ['at', 'trip', 'stop', 't', 'stage', 'exp'];
export const EMBED_SIZE = { width: 600, height: 400 };
const SVG_NS = 'http://www.w3.org/2000/svg';
const SAFE_VALUE = /^[A-Za-z0-9._:+\- ]{1,80}$/;

export function isEmbed(search) {
  return /[?&]embed=1(?:&|$)/.test(String(search || ''));
}

/** The view the query names. Unknown keys and values that are not an id, a number or an instant are dropped. */
export function embedLink(search) {
  const out = {};
  let params;
  try { params = new URLSearchParams(String(search || '')); } catch { return out; }
  for (const key of EMBED_KEYS) {
    const v = params.get(key);
    if (v && SAFE_VALUE.test(v)) out[key] = v;
  }
  return out;
}

/**
 * What of the view on screen an embed carries: a trip (from its first stop, or the stop it is at),
 * else the selection and the stage; the moment and the exposure only when they are not the
 * defaults. Never the visitor's place: it is not in the share state to begin with (ui/share.js).
 */
export function embedState(st, trip = null) {
  const s = st || {};
  const out = {};
  const id = trip || s.trip;
  if (id) {
    out.trip = String(id);
    if (!trip && Number(s.stop) > 1) out.stop = String(Number(s.stop));
    return out;
  }
  if (s.at) out.at = String(s.at);
  if (s.stage) out.stage = String(s.stage);
  if (s.t && s.t !== 'now') out.t = String(s.t);
  if (s.exp === 'eye' || s.exp === 'deep') out.exp = s.exp;
  return out;
}

const rootOf = (base) => (String(base || '/').endsWith('/') ? String(base || '/') : `${base}/`);
const pairs = (st) => EMBED_KEYS.filter((k) => st && st[k] != null && st[k] !== '').map((k) => `${k}=${encodeURIComponent(String(st[k]))}`);

export function embedUrl(st, base = 'https://www.spaceradar.ai/') {
  return `${rootOf(base)}?${['embed=1', ...pairs(st)].join('&')}`;
}

/** The same view in the whole app, for "Open in Space Radar". */
export function fullUrl(st, base = 'https://www.spaceradar.ai/') {
  const keys = pairs(st);
  return keys.length ? `${rootOf(base)}#${keys.join('&')}` : rootOf(base);
}

const attr = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The snippet. A `title` (a frame without one is nameless to a screen reader), lazy loading (it
 * sits under someone else's headline), fullscreen allowed and nothing else, no border, and a
 * width that gives way on a phone. docs/EMBEDDING.md is its manual.
 */
export function embedSnippet(st, opts = {}) {
  const w = Number(opts.width) > 0 ? Math.round(opts.width) : EMBED_SIZE.width;
  const h = Number(opts.height) > 0 ? Math.round(opts.height) : EMBED_SIZE.height;
  const title = opts.title || COPY.app.name;
  return `<iframe src="${attr(embedUrl(st, opts.base))}" title="${attr(title)}" width="${w}" height="${h}" loading="lazy" allow="fullscreen" style="border:0;max-width:100%"></iframe>`;
}

// ------------------------------------------------------------------------------ in the page

function loadCss() {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('../../css/embed.css', import.meta.url).href;
    const done = () => resolve();
    link.addEventListener('load', done);
    link.addEventListener('error', done);
    setTimeout(done, 2000);
    document.head.appendChild(link);
  });
}

/** Lucide `external-link` (ISC), docs/ui-guide.md §3.16: 24 box, stroke 1.75, round, 16 px inline. */
function outIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of [['viewBox', '0 0 24 24'], ['width', '16'], ['height', '16'], ['fill', 'none'], ['stroke', 'currentColor'],
    ['stroke-width', '1.75'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true'], ['focusable', 'false']]) svg.setAttribute(k, v);
  for (const d of ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6']) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

/**
 * The page's half. Called by main.js before anything is built: the class and the stylesheet are in
 * place before the shell exists, so no panel is ever painted in the frame.
 */
export async function installEmbed(search = typeof location !== 'undefined' ? location.search : '') {
  const link = embedLink(search);
  document.documentElement.classList.add('sr-embed');
  await loadCss();
  // The host page owns the keyboard: only the camera's keys pass (window, capture: before every
  // handler the app puts on the document).
  window.addEventListener('keydown', (e) => {
    if (!CAMERA_KEYS.has(e.key)) e.stopImmediatePropagation();
  }, true);

  function attach(ctx) {
    const E = COPY.embed;
    const bar = document.createElement('nav');
    bar.id = 'sr-embed';
    bar.className = 'sr-embed-bar';
    bar.setAttribute('aria-label', E.barLabel);
    const open = document.createElement('a');
    open.className = 'sr-embed__open sr-float';
    open.target = '_blank';
    open.rel = 'noopener';
    open.title = E.openTitle;
    const word = document.createElement('span');
    word.textContent = E.open;
    open.append(word, outIcon());
    // A trip's one line: where it is. The stop's own words are in the full map, one press away.
    const what = document.createElement('p');
    what.className = 'sr-embed__what sr-float';
    what.hidden = true;
    bar.append(what, open);
    document.body.appendChild(bar);
    const say = (st) => {
      const on = !!(st && st.phase !== 'idle' && st.tourTitle);
      what.hidden = !on;
      what.textContent = on ? [st.tourTitle, st.stopTitle].filter(Boolean).join(COPY.punctuation.separator) : '';
    };
    if (ctx && ctx.trip && typeof ctx.trip.onChange === 'function') ctx.trip.onChange(say);
    // The link follows the view: the selection the visitor ends up on, at the moment shown.
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    const paint = () => {
      const st = { ...link };
      const sel = ctx && typeof ctx.selected === 'function' ? ctx.selected() : null;
      const trip = ctx && ctx.trip && ctx.trip.state;
      if (trip && trip.phase !== 'idle' && trip.tourId) { st.trip = trip.tourId; delete st.at; }
      else if (sel && sel.id) { st.at = sel.id; delete st.trip; delete st.stop; }
      open.href = fullUrl(st, base);
    };
    paint();
    open.addEventListener('pointerdown', paint);
    open.addEventListener('focus', paint);
    if (ctx) ctx.embed = { link, bar, href: () => { paint(); return open.href; } };
    return bar;
  }

  return { link, attach };
}
