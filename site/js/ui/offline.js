// ui/offline.js -- the page's side of the service worker (site/sw.js; issues #290, #453).
//
// Exports: createOffline(ctx), plus the pure pieces tests/test_sw_routes.mjs reads: swWanted,
// warmList, UPDATE_CHECK_MS.
//
// IMPORTED LATE, by main.js, OFFLINE_MS after sr:layers-ready: a first visit's bytes are the map's
// (tests/test_first_visit_bytes.mjs measures to two seconds after that event), and a worker that
// started downloading during boot would be competing with the catalogue for a phone's connection.
//
// WHAT IT DOES
//   - registers `sw.js` beside the page (relative, so a copy in a subfolder gets a worker scoped
//     to that subfolder), unless the address says `?sw=0`, which unregisters it and deletes what
//     it kept. An automated browser (navigator.webdriver) gets no worker unless it asks with
//     `?sw=1`: a screenshot run must measure the app, not a cache.
//   - tells the worker what this visit loaded before the worker existed (`sr-warm`), so the maps
//     and models already on screen are there next time with no network.
//   - when a newer build has installed and is waiting, says so in one quiet line with Reload
//     (the toast, ui-guide §3.14). Not reloading is fine: the new build takes over when the last
//     tab closes.
//   - keeps ctx.net.offline true while the network is absent (the browser says so, or the worker
//     could not reach our own server), and fires `sr:net`; the status line reads it
//     (ui/explore.js statusSummary: "Offline: showing saved copies from 3 days ago").
import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { toast } from './share.js';

/** How often an open page asks whether a newer build exists (the browser also asks on every visit). */
export const UPDATE_CHECK_MS = 60 * 60 * 1000;
const TOAST_MS = 4000;

/**
 * Whether this page should have a worker, and why not. Pure.
 * @param {{search?:string, secure?:boolean, supported?:boolean, webdriver?:boolean}} env
 * @returns {'register'|'unregister'|'none'}
 */
export function swWanted(env) {
  const e = env || {};
  if (!e.supported) return 'none';
  let asked = null;
  try { asked = new URLSearchParams(e.search || '').get('sw'); } catch { asked = null; }
  if (asked === '0') return 'unregister';
  if (!e.secure) return 'none';
  if (e.webdriver && asked !== '1') return 'none';
  return 'register';
}

/**
 * What this visit loaded from the page's own folder, for the worker to keep. Pure.
 * @param {string[]} names  resource URLs (performance.getEntriesByType('resource') names)
 * @param {string} base     the page's folder, absolute, ending in '/'
 */
export function warmList(names, base) {
  const out = new Set();
  for (const name of Array.isArray(names) ? names : []) {
    const href = String(name).split('#')[0].split('?')[0];
    if (href.startsWith(base) && href.length > base.length) out.add(href);
  }
  return [...out];
}

async function forget() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch { /* none */ }
  try {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith('sr-sw-')).map((n) => caches.delete(n)));
  } catch { /* none */ }
}

/** @returns {Promise<{state:string, registration?:ServiceWorkerRegistration}>} */
export async function createOffline(ctx) {
  const net = { offline: typeof navigator !== 'undefined' && navigator.onLine === false, worker: 'none', version: null };
  if (ctx) ctx.net = net;
  const said = () => window.dispatchEvent(new CustomEvent('sr:net', { detail: { offline: net.offline } }));
  let browserOffline = net.offline;
  let workerOffline = false;
  const settle = () => {
    const now = browserOffline || workerOffline;
    if (now !== net.offline) { net.offline = now; said(); }
  };
  window.addEventListener('offline', () => { browserOffline = true; settle(); });
  window.addEventListener('online', () => { browserOffline = false; workerOffline = false; settle(); });
  if (net.offline) said();

  const want = swWanted({
    search: location.search,
    secure: window.isSecureContext === true,
    supported: 'serviceWorker' in navigator,
    webdriver: navigator.webdriver === true,
  });
  net.worker = want;
  if (want === 'unregister') { await forget(); return { state: 'unregistered' }; }
  if (want !== 'register') return { state: 'none' };

  const sw = navigator.serviceWorker;
  const controlledAtStart = !!sw.controller;
  sw.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'sr-net' || data.type === 'sr-version') {
      workerOffline = data.offline === true;
      if (data.version) net.version = data.version;
      settle();
    }
  });
  // A newer build took over because somebody pressed Reload (here or in another tab): this page's
  // code is the old build's, so it reloads too. The first worker claiming a first visit is not that.
  let reloading = false;
  sw.addEventListener('controllerchange', () => {
    if (!controlledAtStart || reloading) return;
    // A screen playing on its own never reloads mid-trip: ui/autopilot.js does it between two.
    if (ctx && ctx.autopilot && ctx.autopilot.engaged) { ctx.autopilot.controllerChanged(); return; }
    reloading = true;
    location.reload();
  });

  let registration;
  try {
    registration = await sw.register('sw.js');
  } catch (e) {
    console.warn('the service worker did not register', e);
    net.worker = 'failed';
    return { state: 'failed' };
  }

  const offer = (waiting) => {
    if (!waiting || !sw.controller) return;
    // ...and is never asked: the newer build takes over between two trips (spec 0036).
    if (ctx && ctx.autopilot && ctx.autopilot.engaged) { ctx.autopilot.updateWaiting(waiting); return; }
    const node = toast(COPY.offline.updateReady, TOAST_MS);
    if (!node) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sr-toast__action';
    button.textContent = COPY.offline.reload;
    button.addEventListener('click', () => waiting.postMessage({ type: 'sr-skip-waiting' }));
    node.appendChild(button);
  };
  if (registration.waiting) offer(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const coming = registration.installing;
    if (!coming) return;
    coming.addEventListener('statechange', () => { if (coming.state === 'installed') offer(coming); });
  });
  setInterval(() => { if (!document.hidden) registration.update().catch(() => {}); }, UPDATE_CHECK_MS);

  sw.ready.then((reg) => {
    const active = reg.active;
    if (!active) return;
    active.postMessage({ type: 'sr-version' });
    const names = performance.getEntriesByType('resource').map((r) => r.name);
    active.postMessage({ type: 'sr-warm', urls: warmList(names, new URL('./', location.href).href) });
  }).catch(() => {});
  return { state: 'registered', registration };
}
