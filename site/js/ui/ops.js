// ui/ops.js -- live operations: a view of the sidebar like Find (research train "ops"; forge #558, #561, #562, #563). Four panes,
// each its own module, fetched the first time it is opened:
//
//   state     ui/opsstate.js     State of Space: the numbers that tick, each with its source and date, and the frozen quarters
//   reentry   ui/opsreentry.js   what came down lately, the lowest orbits, the week's closest approaches, the 2009 collision
//   dsn       ui/opsdsn.js       which Deep Space Network dish is talking to which craft, lines on the map, the light time
//   events    ui/opsevents.js    fires, storms, volcanoes and floods; a row flies the globe there with the matching map
//
// Contract: createOps(ctx, host) -> { root, open(which, opts), openLink(value), close(), current() }
//   host       the shell's `ops` view (ui/shell.js host('ops'))
//   a pane     exports mount(pane, ctx, api) -> { show(arg), hide?() }; `api.writeLink(arg)` puts `ops=<which>:<arg>` in the
//              address, `api.close()` steps back
// Also exported, pure: PANES, parseOps(value) -> {which, arg} | null, opsValue(which, arg)
//
// THE ADDRESS SAYS WHICH: `#ops=state`, `#ops=events:volcano`, `#ops=dsn` (ui/urlstate.js `ops`). Leaving the view takes it out.

import { COPY } from '../copy/en.js';
import '../copy/en.ops.js';
import { loadCss } from './latercss.js';
import { el, button, track } from './opskit.js';
import * as urlstate from './urlstate.js';

export const PANES = ['state', 'reentry', 'dsn', 'events'];
const MODULES = {
  state: () => import('./opsstate.js').then((m) => m.mountState),
  reentry: () => import('./opsreentry.js').then((m) => m.mountReentry),
  dsn: () => import('./opsdsn.js').then((m) => m.mountDsn),
  events: () => import('./opsevents.js').then((m) => m.mountEvents),
};

export function parseOps(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  const i = s.indexOf(':');
  const which = (i < 0 ? s : s.slice(0, i)).toLowerCase();
  if (!PANES.includes(which)) return null;
  return { which, arg: i < 0 ? '' : s.slice(i + 1) };
}

export function opsValue(which, arg) {
  return arg === undefined || arg === null || arg === '' ? which : `${which}:${arg}`;
}

export function createOps(ctx, host) {
  const O = COPY.ops;
  loadCss('find');
  loadCss('ops');
  const root = el('div', 'sr-ops');
  root.setAttribute('aria-label', O.label);
  (host || document.body).appendChild(root);

  // The head: the view's name and its four tabs (ui.css .sr-tabs on the shared .ui-seg, as Find's).
  const head = el('div', 'sr-ops__head');
  head.appendChild(el('h2', 'sr-micro', O.label));
  const tabs = el('div', 'ui-seg ui-seg--block sr-tabs sr-ops__tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', O.label);
  head.appendChild(tabs);
  const title = el('h3', 'sr-ops__title');
  head.appendChild(title);
  root.appendChild(head);
  const tabBtns = new Map();
  for (const id of PANES) {
    const b = button('ui-seg__btn', O.tabs[id]);
    b.setAttribute('role', 'tab');
    b.id = `sr-ops-tab-${id}`;
    b.setAttribute('aria-controls', `sr-ops-pane-${id}`);
    b.setAttribute('aria-selected', 'false');
    b.addEventListener('click', () => open(id));
    tabs.appendChild(b);
    tabBtns.set(id, b);
  }
  tabs.addEventListener('keydown', (e) => {
    const i = Math.max(0, PANES.indexOf(now));
    const to = e.key === 'ArrowRight' ? PANES[(i + 1) % PANES.length] : e.key === 'ArrowLeft' ? PANES[(i + PANES.length - 1) % PANES.length]
      : e.key === 'Home' ? PANES[0] : e.key === 'End' ? PANES[PANES.length - 1] : null;
    if (!to) return;
    e.preventDefault();
    open(to, { focus: false });
    tabBtns.get(to).focus();
  });

  const panes = new Map(); // which -> {pane, mounted}
  let now = null;

  function writeLink(which, arg) {
    try { urlstate.write({ ops: which ? opsValue(which, arg) : null }); } catch { /* the view works without the address bar */ }
  }

  function paneFor(which) {
    if (panes.has(which)) return panes.get(which);
    const pane = el('div', 'sr-ops__pane');
    pane.id = `sr-ops-pane-${which}`;
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-labelledby', `sr-ops-tab-${which}`);
    pane.dataset.ops = which;
    pane.hidden = true;
    root.appendChild(pane);
    const wait = el('p', 'sr-ops__wait', O.loading);
    pane.appendChild(wait);
    const entry = { pane, mounted: null };
    const api = { writeLink: (arg) => { if (now === which) writeLink(which, arg); }, close: () => close() };
    const tryMount = () => {
      entry.mounted = MODULES[which]()
        .then((mount) => { wait.remove(); return mount(pane, ctx, api) || {}; })
        .catch((e) => {
          console.warn(`the ${which} pane did not load`, e);
          wait.textContent = O.couldNot;
          const again = button('ui-btn ui-btn--sm', O.retry);
          again.addEventListener('click', () => { again.remove(); wait.textContent = O.loading; tryMount(); });
          wait.after(again);
          entry.mounted = null;
          return null;
        });
      return entry.mounted;
    };
    entry.retry = tryMount;
    tryMount();
    panes.set(which, entry);
    return entry;
  }

  function open(which, opts = {}) {
    if (!PANES.includes(which)) return null;
    if (ctx.shell && typeof ctx.shell.show === 'function' && ctx.shell.view() !== 'ops') ctx.shell.show('ops');
    const before = now;
    now = which;
    title.textContent = O.titles[which];
    for (const [k, b] of tabBtns) b.setAttribute('aria-selected', k === which ? 'true' : 'false');
    for (const [k, p] of panes) if (k !== which) { p.pane.hidden = true; if (p.mounted) p.mounted.then((m) => m && m.hide && m.hide()); }
    const entry = paneFor(which);
    entry.pane.hidden = false;
    if (before !== which) {
      track('tab_open', { tab: `ops_${which}` });
      if (host) host.scrollTop = 0; // a new tab starts at its top, not where the last one was scrolled to
    }
    writeLink(which, opts.arg || '');
    return (entry.mounted || (entry.retry && entry.retry()) || Promise.resolve(null)).then((m) => {
      if (m && typeof m.show === 'function' && now === which) m.show(opts.arg || '', opts);
      return m;
    });
  }

  function openLink(value) {
    const p = parseOps(value);
    if (!p) return null;
    return open(p.which, { arg: p.arg, focus: false });
  }

  function close() {
    if (ctx.shell && typeof ctx.shell.back === 'function' && ctx.shell.view() === 'ops') ctx.shell.back();
  }

  // Leaving the view for home: what a pane keeps going (a timer, a count) stops, and the address forgets it. The DSN lines
  // and an Earth map stay on the globe: they are the visitor's choice, and each pane's own button takes them off.
  window.addEventListener('sr:shell', (e) => {
    const v = e.detail && e.detail.view;
    if (!v || v === 'ops' || v === 'card' || !now) return;
    const p = panes.get(now);
    if (p && p.mounted) p.mounted.then((m) => m && m.hide && m.hide());
    writeLink(null);
    now = null;
  });

  const api = { root, open, openLink, close, current: () => now };
  ctx.ops = api;
  return api;
}
