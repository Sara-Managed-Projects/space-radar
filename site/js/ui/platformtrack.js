// ui/platformtrack.js -- what the map tells the platform, and the one thing the platform shows in the map's own chrome.
// Fetched by main.js only where ui/platform-bridge.js loadPlatform() added the platform's script (spaceradar.ai and its
// sites): on localhost, in a fork, in an embed or offline this file is never requested.
//
// Contract: trackMap(ctx, env) -> stop()     listens to the page's own events and pushes sr() commands
//           paintAccount(doc, detail)        fills the rail's `[data-sr-account]` slot (and a row of the phone's More)
//           EVENTS                           the analytics names this file can push (the platform contract's schema)
//
// WHAT IS SAID. The contract's names, with ids, classes, layer and tab names and on/off: `visit` and `select_object`
// when a card opens (`sr:select`), `passport_stamp` with only its class when the passport keeps a new place (`sr:stamp`,
// ui/passport.js), `layer_toggle`, `tab_open` (`sr:shell`), `drift_start`/`drift_stop` (`sr:drift`), `ambient_start`
// (`sr:autopilot`), `trip_start`/`trip_complete` (the trip's own state), `time_travel` (the clock leaving now). The
// search, the share sheet, the recorder, the language menu and the hearts push their own (search.js, sharesheet.js,
// recorder.js, languagepop.js, favs.js).

import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';
import { sr, onPlatform } from './platform-bridge.js';

export const EVENTS = ['select_object', 'passport_stamp', 'layer_toggle', 'tab_open', 'drift_start', 'drift_stop', 'ambient_start',
  'trip_start', 'trip_complete', 'time_travel', 'search', 'share', 'record_start', 'record_export', 'language_change',
  'favourite_add', 'favourite_remove'];

const SVG_NS = 'http://www.w3.org/2000/svg';
// Lucide `circle-user` (ISC): the sign-in mark.
const USER = [['circle', { cx: 12, cy: 12, r: 10 }], ['circle', { cx: 12, cy: 10, r: 3 }], ['path', { d: 'M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662' }]];

function userIcon(doc) {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.75', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(k, v);
  for (const [tag, attrs] of USER) {
    const part = doc.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) part.setAttribute(k, String(v));
    svg.appendChild(part);
  }
  return svg;
}

/** The first letter of a nickname, for the avatar; '' when there is none. */
export const initialOf = (nickname) => (typeof nickname === 'string' ? (Array.from(nickname.trim())[0] || '').toUpperCase() : '');

/** Fill the rail's account slot from the platform's word. Signed out: Sign in. Signed in: the nickname's initial. */
export function paintAccount(doc, detail) {
  const A = COPY.account;
  const slot = doc && doc.querySelector('[data-sr-account]');
  if (!slot || !A) return null;
  const signedIn = !!(detail && detail.signedIn);
  const name = signedIn && typeof detail.nickname === 'string' ? detail.nickname : '';
  const words = signedIn ? (name ? t(A.openNamed, { name }) : A.open) : A.signIn;
  const act = () => sr('ui', signedIn ? 'account' : 'signin');
  slot.textContent = '';
  const b = doc.createElement('button');
  b.type = 'button';
  b.className = 'sr-rail__btn sr-rail__btn--account';
  b.setAttribute('aria-label', words);
  b.title = words;
  b.setAttribute('aria-haspopup', 'dialog');
  const letter = signedIn ? initialOf(name) : '';
  if (letter) {
    const av = doc.createElement('span');
    av.className = 'sr-rail__avatar';
    av.setAttribute('aria-hidden', 'true');
    av.textContent = letter;
    b.appendChild(av);
  } else {
    b.appendChild(userIcon(doc));
  }
  b.addEventListener('click', act);
  slot.appendChild(b);
  slot.hidden = false;
  // The phone folds the rail into More: the same action as a named row there.
  const menu = doc.getElementById('sr-more');
  if (menu) {
    let row = menu.querySelector('.sr-more__item--account');
    if (row) row.remove();
    row = doc.createElement('button');
    row.type = 'button';
    row.className = 'sr-more__item sr-more__item--account';
    row.setAttribute('role', 'menuitem');
    row.tabIndex = -1;
    row.appendChild(userIcon(doc));
    const span = doc.createElement('span');
    span.textContent = words;
    row.appendChild(span);
    row.addEventListener('click', () => {
      menu.hidden = true;
      const more = doc.querySelector('.sr-rail__btn--more');
      if (more) more.setAttribute('aria-expanded', 'false');
      act();
    });
    menu.insertBefore(row, menu.firstChild);
  }
  return b;
}

export function trackMap(ctx, env = {}) {
  const win = env.window || (typeof window !== 'undefined' ? window : null);
  const doc = env.document || (typeof document !== 'undefined' ? document : null);
  if (!win || !doc) return () => {};
  const offs = [];
  const on = (target, name, fn) => { target.addEventListener(name, fn); offs.push(() => target.removeEventListener(name, fn)); };

  on(win, 'sr:select', (e) => {
    const r = e && e.detail;
    if (!r || typeof r.id !== 'string' || !r.id) return;
    sr('visit', r.id, r.klass || '');
    sr('track', 'select_object', { object_class: r.klass || '', object_id: r.id });
  });
  on(win, 'sr:stamp', (e) => sr('track', 'passport_stamp', { object_class: (e && e.detail && e.detail.cls) || '' }));
  on(doc, 'sr:layer-toggle', (e) => {
    const d = (e && e.detail) || {};
    if (typeof d.id === 'string' && d.id) sr('track', 'layer_toggle', { layer: d.id, on: !!d.on });
  });
  let view = '';
  on(win, 'sr:shell', (e) => {
    const v = e && e.detail && e.detail.view;
    if (typeof v === 'string' && v && v !== view) { view = v; sr('track', 'tab_open', { tab: v }); }
  });
  on(win, 'sr:drift', (e) => sr('track', e && e.detail && e.detail.on ? 'drift_start' : 'drift_stop'));
  on(win, 'sr:autopilot', (e) => { if (e && e.detail && e.detail.what === 'start') sr('track', 'ambient_start'); });

  // A trip: started once per run, finished at its end card.
  const trip = ctx && ctx.trip;
  let running = '';
  let finished = '';
  if (trip && typeof trip.onChange === 'function') {
    const off = trip.onChange((st) => {
      if (!st) return;
      if (!st.tourId || st.phase === 'idle') { running = ''; finished = ''; return; }
      if (st.phase === 'resolving') return;
      if (running !== st.tourId) { running = st.tourId; finished = ''; sr('track', 'trip_start', { trip_id: st.tourId }); }
      if (st.phase === 'outro' && finished !== st.tourId) { finished = st.tourId; sr('track', 'trip_complete', { trip_id: st.tourId }); }
    });
    if (typeof off === 'function') offs.push(off);
  }
  // The clock leaving now: once each time it leaves.
  const clock = ctx && ctx.clock;
  if (clock && typeof clock.onChange === 'function') {
    let live = clock.mode === 'live';
    clock.onChange((c) => {
      const now = c.mode === 'live';
      if (live && !now) sr('track', 'time_travel');
      live = now;
    });
  }
  offs.push(onPlatform((detail) => paintAccount(doc, detail), doc));
  return () => { for (const off of offs.splice(0)) off(); };
}
