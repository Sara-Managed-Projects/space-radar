// ui/catalogue.js -- the catalogues: a view of the sidebar like Find (research train "catalogues"; forge #551, #553, #560,
// #564). One catalogue at a time, each its own module, fetched the first time it is opened:
//
//   launches     ui/launcharchive.js   every orbital launch since 1957 (GCAT), a table, and the launches replayed on the globe
//   calendar     ui/skycalendar.js     the sky's dated events by month, and the calendar feeds
//   eclipse      ui/eclipsecheck.js    2 August 2027: what a place sees, from NASA's Besselian elements
//   asteroids    ui/neobrowser.js      the near-Earth asteroids, a table, the orbit drawn on a choice
//   exoplanets   ui/exoexplorer.js     any two columns of the Exoplanet Archive against each other
//
// Contract: createCatalogue(ctx, host) -> { root, open(which, opts), openLink(value), close(), current() }
//   host       the shell's `catalogue` view (ui/shell.js host('catalogue'))
//   a module   exports mount(pane, ctx, api) -> { show(arg), hide?() }; `api.writeLink(arg)` puts `cat=<which>:<arg>` in the
//              address, `api.close()` steps back
// Also exported, pure: parseCat(value) -> {which, arg} | null, catValue(which, arg) -> string, CATALOGUES
//
// THE ADDRESS SAYS WHICH. `#cat=launches`, `#cat=launches:1969`, `#cat=eclipse`: a link opens the same catalogue at the same
// place (ui/urlstate.js `cat`). Leaving the view takes the key out.

import { COPY } from '../copy/en.js';
import '../copy/en.catalogues.js';
import { loadCss } from './latercss.js';
import { el, button, track } from './catalogkit.js';
import * as urlstate from './urlstate.js';

export const CATALOGUES = ['launches', 'calendar', 'eclipse', 'asteroids', 'exoplanets'];
const MODULES = {
  launches: () => import('./launcharchive.js').then((m) => m.mountLaunchArchive),
  calendar: () => import('./skycalendar.js').then((m) => m.mountSkyCalendar),
  eclipse: () => import('./eclipsecheck.js').then((m) => m.mountEclipseCheck),
  asteroids: () => import('./neobrowser.js').then((m) => m.mountNeoBrowser),
  exoplanets: () => import('./exoexplorer.js').then((m) => m.mountExoExplorer),
};

/** `launches:1969` -> {which: 'launches', arg: '1969'}; anything not a catalogue -> null. Pure. */
export function parseCat(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  const i = s.indexOf(':');
  const which = (i < 0 ? s : s.slice(0, i)).toLowerCase();
  if (!CATALOGUES.includes(which)) return null;
  return { which, arg: i < 0 ? '' : s.slice(i + 1) };
}

/** The other way. Pure. */
export function catValue(which, arg) {
  return arg === undefined || arg === null || arg === '' ? which : `${which}:${arg}`;
}

export function createCatalogue(ctx, host) {
  const C = COPY.catalogue;
  loadCss('find');
  loadCss('catalogue');
  const root = el('div', 'sr-cat');
  root.setAttribute('aria-label', C.label);
  (host || document.body).appendChild(root);
  const head = el('div', 'sr-cat__head');
  const eyebrow = el('p', 'sr-micro', C.label);
  const title = el('h2', 'sr-cat__title');
  head.append(eyebrow, title);
  root.appendChild(head);

  const panes = new Map(); // which -> {pane, mounted: Promise<{show, hide}>}
  let now = null;

  function writeLink(which, arg) {
    try { urlstate.write({ cat: which ? catValue(which, arg) : null }); } catch { /* the view works without the address bar */ }
  }

  function paneFor(which) {
    if (panes.has(which)) return panes.get(which);
    const pane = el('div', 'sr-cat__pane');
    pane.dataset.cat = which;
    pane.hidden = true;
    root.appendChild(pane);
    const wait = el('p', 'sr-cat__wait', C.loading);
    pane.appendChild(wait);
    const entry = { pane, mounted: null };
    const api = { writeLink: (arg) => { if (now === which) writeLink(which, arg); }, close: () => close() };
    const tryMount = () => {
      entry.mounted = MODULES[which]()
        .then((mount) => { wait.remove(); return mount(pane, ctx, api) || {}; })
        .catch((e) => {
          console.warn(`the ${which} catalogue did not load`, e);
          wait.textContent = C.failed;
          const again = button('ui-btn ui-btn--sm ui-btn--secondary', C.retry);
          again.addEventListener('click', () => { again.remove(); wait.textContent = C.loading; tryMount(); });
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
    if (!CATALOGUES.includes(which)) return null;
    if (ctx.shell && typeof ctx.shell.show === 'function') ctx.shell.show('catalogue');
    const before = now;
    now = which;
    title.textContent = C.titles[which];
    for (const [k, p] of panes) if (k !== which) { p.pane.hidden = true; if (p.mounted) p.mounted.then((m) => m && m.hide && m.hide()); }
    const entry = paneFor(which);
    entry.pane.hidden = false;
    // Another catalogue starts at its top: the view's scroller is shared, and the last one's place in it means nothing here.
    if (before !== which && host) host.scrollTop = 0;
    if (before !== which) track('tab_open', { tab: `catalogue_${which}` });
    writeLink(which, opts.arg || '');
    return (entry.mounted || (entry.retry && entry.retry()) || Promise.resolve(null)).then((m) => {
      if (m && typeof m.show === 'function' && now === which) m.show(opts.arg || '', opts);
      if (opts.focus !== false) { const first = entry.pane.querySelector('button, input, select, a[href]'); if (first) first.focus({ preventScroll: true }); }
      return m;
    });
  }

  function openLink(value) {
    const p = parseCat(value);
    if (!p) return null;
    return open(p.which, { arg: p.arg, focus: false });
  }

  function close() {
    if (ctx.shell && typeof ctx.shell.back === 'function' && ctx.shell.view() === 'catalogue') ctx.shell.back();
  }

  // Leaving the view: the open catalogue stops what it plays (a replay, a drawn orbit stays until it is cleared by its own
  // module), and the address forgets it.
  window.addEventListener('sr:shell', (e) => {
    if (!e.detail || e.detail.view === 'catalogue' || !now) return;
    const p = panes.get(now);
    if (p && p.mounted) p.mounted.then((m) => m && m.hide && m.hide());
    writeLink(null);
    now = null;
  });

  const api = { root, open, openLink, close, current: () => now };
  ctx.catalogue = api;
  return api;
}
