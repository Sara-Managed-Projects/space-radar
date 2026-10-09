// site/sw.js -- the service worker: Space Radar after the network has gone (issues #290, #453).
//
// WHAT IT IS FOR. A school with no internet, and a person on a hill who opened the page once at
// home. After one visit the app starts with no network at all: the page and its code from here,
// the maps, models, stars and sounds the visitor has already used from here, and the saved data
// copies from here when the network does not answer. Nothing in this file draws anything, and
// nothing in it makes old data look new: a saved copy carries its own `fetched_at`, and the status
// line says "Offline" (ui/offline.js, ui/explore.js statusSummary).
//
// THE ROUTING TABLE is routeFor() below, a pure function tests/test_sw_routes.mjs reads. Four answers:
//
//   shell   the page, js/, css/, vendor/, fonts/, the manifest and its icons.
//           STAMPED (a deploy or a release zip, scripts/stamp_sw.py): one consistent set, precached
//           at install under the build's own cache name and verified file by file against the
//           SHA-256 the stamp recorded, then served cache-first. A new deploy is a new sw.js, which
//           installs beside the old one, and the page says "A newer version is ready" (one quiet
//           line with Reload); it takes over on that reload, or when the last tab closes. The page
//           is therefore never a mix of two releases, and never stale for longer than one visit.
//           A FILE THE LAST BUILD ALREADY HOLDS IS NOT FETCHED AGAIN (internal #518, 2026-10-09):
//           a deploy changes a handful of the shell's files, and the new worker used to ask the
//           server for all of them. It now looks in the previous build's shell cache first and
//           takes a file from there when its SHA-256 is the one THIS build was stamped with: the
//           same check a download gets, so a copy can never be a stale file under a new build.
//           UNSTAMPED (a git clone, a dev server): network first, the cache only when the server
//           does not answer, so an edit is never hidden behind this file.
//   asset   textures/, models/, audio/, images/, og/ and the bundled data/ files (stars, the galaxy,
//           the constellations): cache first, refreshed in the background, and only what a visitor
//           has actually used. Nobody is made to download 15 MB of narration they never played.
//   data    data/v1/, the saved copies of the live feeds: network first. When a copy is already
//           here and the network has not answered in DATA_TIMEOUT_MS, the copy answers.
//   pass    everything else, untouched: other origins (CelesTrak, NASA's tiles, Launch Library:
//           data/sources.js keeps its own copy of each feed with the age it was read at, and a
//           worker answering for a publisher would make that age a lie), POSTs, range requests,
//           the share pages under t/ and o/, and this file.
//
// EVERY PATH IS RELATIVE TO THE WORKER'S OWN FOLDER (its scope), so a copy served from
// http://school-server/space-radar/ works exactly like one at the root of a host.
//
// SWITCHING IT OFF. Open the page with `?sw=0`: the worker unregisters itself, deletes its caches
// and lets the network answer (handled HERE, so it works even when the cached page is the thing
// that is broken). For everybody at once: `python3 scripts/stamp_sw.py --kill` writes a worker that
// does the same on activation; deploy that and every visitor is back on the plain network after
// their next visit.

/* BUILD:BEGIN -- scripts/stamp_sw.py rewrites the next line at deploy and release time. Committed, it says 'dev'. */
const BUILD = { version: 'dev', shell: [], kill: false };
/* BUILD:END */

const PREFIX = 'sr-sw-';
const SHELL_CACHE = PREFIX + 'shell-' + BUILD.version;
const ASSET_CACHE = PREFIX + 'assets-v1';
const DATA_CACHE = PREFIX + 'data-v1';
const DATA_TIMEOUT_MS = 3000;
const WARM_AT_ONCE = 4;

const SHELL_DIRS = ['js/', 'css/', 'vendor/', 'fonts/', 'images/icons/'];
const SHELL_FILES = ['', 'index.html', 'manifest.webmanifest'];
const ASSET_DIRS = ['textures/', 'models/', 'audio/', 'images/', 'og/', 'data/'];
const DATA_DIR = 'data/v1/';

/**
 * Where a request goes. Pure: strings in, a plain object out.
 * @param {{url:string, method?:string, mode?:string, range?:boolean}} req
 * @param {string} scope  the worker's folder as an absolute URL ending in '/'
 * @returns {{kind:'shell'|'asset'|'data'|'pass', key?:string, why?:string}}
 *   key: the URL the answer is cached under (no query, no fragment; the page itself is index.html)
 */
function routeFor(req, scope) {
  if ((req.method || 'GET') !== 'GET') return { kind: 'pass', why: 'not a GET' };
  if (req.range) return { kind: 'pass', why: 'a range request' };
  let url;
  let base;
  try {
    url = new URL(req.url);
    base = new URL(scope);
  } catch {
    return { kind: 'pass', why: 'not a URL' };
  }
  if (url.origin !== base.origin) return { kind: 'pass', why: 'another origin' };
  if (!url.pathname.startsWith(base.pathname)) return { kind: 'pass', why: 'outside the scope' };
  if (killAsked(req.url)) return { kind: 'pass', why: 'sw=0' };
  const path = url.pathname.slice(base.pathname.length);
  const at = (p) => base.origin + base.pathname + p;
  if (path === 'sw.js') return { kind: 'pass', why: 'the worker itself' };
  if (SHELL_FILES.includes(path)) return { kind: 'shell', key: at(path === '' ? 'index.html' : path) };
  if (req.mode === 'navigate') return { kind: 'pass', why: 'a page that is not the app' };
  if (path.startsWith(DATA_DIR)) return { kind: 'data', key: at(path) };
  if (SHELL_DIRS.some((d) => path.startsWith(d))) return { kind: 'shell', key: at(path) };
  if (ASSET_DIRS.some((d) => path.startsWith(d))) return { kind: 'asset', key: at(path) };
  return { kind: 'pass', why: 'nothing this worker keeps' };
}

/** True when the address asks for the worker to be switched off (`?sw=0`). Pure. */
function killAsked(href) {
  try {
    return new URL(href).searchParams.get('sw') === '0';
  } catch {
    return false;
  }
}

/** True when this file was stamped by scripts/stamp_sw.py: there is a build to be consistent with. Pure. */
function stamped(build) {
  return !!build && build.version !== 'dev' && Array.isArray(build.shell) && build.shell.length > 0;
}

/** Caches from an earlier build of this worker, to delete on activation. Pure. */
function staleCaches(names, keep) {
  return names.filter((n) => n.startsWith(PREFIX) && !keep.includes(n));
}

/** What a response must be to be kept: a whole, successful, same-origin answer. Pure. */
function keepable(response) {
  return !!response && response.status === 200 && (response.type === 'basic' || response.type === 'default');
}

/** Lower-case hex of a SHA-256. */
async function sha256(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const scope = () => self.registration.scope;

async function put(cacheName, key, response) {
  if (!keepable(response)) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(key, response);
  } catch {
    /* a full disk or a private window: the answer was still given, it is only not kept */
  }
}

async function tell(message) {
  try {
    const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const page of pages) page.postMessage(message);
  } catch {
    /* nobody to tell */
  }
}

// Whether the last same-origin read reached the server. Said to the page only when it changes.
let offline = null;
function sawNetwork(ok) {
  if (offline === !ok) return;
  offline = !ok;
  tell({ type: 'sr-net', offline });
}

/**
 * Every file of a build's shell, each one checked against the stamp: from an earlier build's
 * cache when the copy there IS this build's file, from the network otherwise.
 *
 * No caches and no fetch of its own, so tests/test_sw_routes.mjs can run it: `held(url)` answers
 * with a Response an earlier build kept (or nothing), `download(url)` asks the server.
 * @returns {Promise<{entries: Array<[string, Response]>, reused: number, fetched: number}>}
 */
async function gatherShell(shell, base, held, download) {
  const entries = [];
  let reused = 0;
  let fetched = 0;
  const queue = shell.slice();
  const matches = async (response, want) => (await sha256(await response.clone().arrayBuffer())).slice(0, want.length) === want;
  const worker = async () => {
    while (queue.length) {
      const [path, want] = queue.shift();
      const url = base + path;
      let kept = null;
      try {
        kept = await held(url);
        // The stamp's hash, of the bytes as they are in the cache now: not the old stamp's word
        // for them. A file that changed in this deploy fails here and is downloaded.
        if (kept && !(keepable(kept) && await matches(kept, want))) kept = null;
      } catch {
        kept = null; // a cache that cannot be read is a cache that holds nothing
      }
      if (kept) {
        reused += 1;
        entries.push([url, kept]);
        continue;
      }
      const response = await download(url);
      if (!keepable(response)) throw new Error(`${path}: the server answered ${response.status}`);
      // A deploy in progress, or an edge still holding the previous release: refuse the whole
      // install. The old worker keeps serving the old, consistent shell and the browser tries
      // again on the next visit. A shell that is half of two releases is the one thing worse.
      if (!(await matches(response, want))) throw new Error(`${path}: not the file this build was stamped with`);
      fetched += 1;
      entries.push([url, response]);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { entries, reused, fetched };
}

/** The shell caches of earlier builds: where an unchanged file can be taken from. Pure. */
function donorCaches(names, own) {
  return names.filter((n) => n.startsWith(PREFIX + 'shell-') && n !== own);
}

/** The whole shell, each file checked against the stamp, then kept in one step. */
async function precache() {
  const cache = await caches.open(SHELL_CACHE);
  let donors = [];
  try {
    donors = await Promise.all(donorCaches(await caches.keys(), SHELL_CACHE).map((n) => caches.open(n)));
  } catch {
    donors = [];
  }
  const held = async (url) => {
    for (const donor of donors) {
      const hit = await donor.match(url);
      if (hit) return hit;
    }
    return null;
  };
  // `no-cache`: revalidate with the server, so a browser's own old copy is never precached.
  const download = (url) => fetch(new Request(url, { cache: 'no-cache', credentials: 'same-origin' }));
  const { entries } = await gatherShell(BUILD.shell, scope(), held, download);
  await Promise.all(entries.map(([url, response]) => cache.put(url, response)));
}

async function unregisterAndForget() {
  try {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith(PREFIX)).map((n) => caches.delete(n)));
  } catch {
    /* nothing to delete */
  }
  try {
    await self.registration.unregister();
  } catch {
    /* already gone */
  }
}

self.addEventListener('install', (event) => {
  if (BUILD.kill) {
    self.skipWaiting();
    return;
  }
  if (stamped(BUILD)) event.waitUntil(precache());
  // An unstamped worker keeps nothing a second copy could disagree with, so it never waits.
  else self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (BUILD.kill) {
      await unregisterAndForget();
      const pages = await self.clients.matchAll({ type: 'window' });
      for (const page of pages) page.navigate(page.url).catch(() => {});
      return;
    }
    const names = await caches.keys();
    await Promise.all(staleCaches(names, [SHELL_CACHE, ASSET_CACHE, DATA_CACHE]).map((n) => caches.delete(n)));
    // Take the page that registered us, so what it loads from here on is kept as it is used.
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  // The page's Reload: let the waiting build take over now.
  if (data.type === 'sr-skip-waiting') self.skipWaiting();
  // What the first visit loaded before this worker existed: keep it too.
  if (data.type === 'sr-warm' && Array.isArray(data.urls)) event.waitUntil(warm(data.urls));
  if (data.type === 'sr-version' && event.source) {
    event.source.postMessage({ type: 'sr-version', version: BUILD.version, stamped: stamped(BUILD), offline: offline === true });
  }
});

/**
 * Keep what the page already has. The browser's own cache answers most of these without the
 * network (the textures and models are served with a month's lifetime), so this costs a first
 * visit close to nothing. The saved data copies are asked for with `only-if-cached`: whatever the
 * browser still holds is kept, and nothing is downloaded twice (a second read of a 7 MB catalogue
 * would not be close to nothing; data/sources.js keeps its own copy of most feeds as well).
 */
async function warm(urls) {
  const base = scope();
  const queue = [];
  const seen = new Set();
  for (const href of urls.slice(0, 600)) {
    const route = routeFor({ url: String(href) }, base);
    if (route.kind === 'pass' || (route.kind === 'shell' && stamped(BUILD))) continue;
    if (seen.has(route.key)) continue;
    seen.add(route.key);
    queue.push(route);
  }
  const worker = async () => {
    while (queue.length) {
      const route = queue.shift();
      const cacheName = route.kind === 'asset' ? ASSET_CACHE : route.kind === 'data' ? DATA_CACHE : SHELL_CACHE;
      const how = route.kind === 'data'
        ? { credentials: 'same-origin', mode: 'same-origin', cache: 'only-if-cached' }
        : { credentials: 'same-origin' };
      try {
        const cache = await caches.open(cacheName);
        if (await cache.match(route.key)) continue;
        await put(cacheName, route.key, await fetch(route.key, how));
      } catch {
        /* one file that could not be kept does not stop the rest */
      }
    }
  };
  await Promise.all(Array.from({ length: WARM_AT_ONCE }, worker));
}

async function fromCache(cacheName, key) {
  try {
    const cache = await caches.open(cacheName);
    return (await cache.match(key)) || null;
  } catch {
    return null;
  }
}

/** Network, and the kept copy only when the network does not answer. */
async function networkFirst(event, route, cacheName, timeoutMs) {
  const kept = await fromCache(cacheName, route.key);
  let keeping = null;
  const live = fetch(event.request).then((response) => {
    sawNetwork(true);
    if (keepable(response)) keeping = put(cacheName, route.key, response.clone());
    return response;
  });
  // Said now, while the event is still open: the answer may arrive after the kept copy was given.
  event.waitUntil(live.then(() => keeping, () => sawNetwork(false)));
  if (!kept) return live;
  const waited = timeoutMs > 0
    ? new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))
    : new Promise(() => {});
  try {
    const first = await Promise.race([live, waited]);
    // A server that answers 404 has answered: there is no such copy, and the cache saying
    // otherwise would hide it. Only silence (no network, too slow, a 5xx) is covered.
    return first && first.status < 500 ? first : kept;
  } catch {
    return kept;
  }
}

// One background refresh per file per life of this worker (the browser stops an idle worker after
// about half a minute, so in practice: once per visit).
const refreshed = new Set();

/** The kept copy at once, refreshed behind it; the network when there is no copy. */
async function cacheFirst(event, route, cacheName, refresh) {
  const kept = await fromCache(cacheName, route.key);
  if (kept) {
    if (refresh && !refreshed.has(route.key)) {
      refreshed.add(route.key);
      event.waitUntil(fetch(route.key, { credentials: 'same-origin' })
        .then((response) => put(cacheName, route.key, response))
        .catch(() => {}));
    }
    return kept;
  }
  try {
    const response = await fetch(event.request);
    if (keepable(response)) event.waitUntil(put(cacheName, route.key, response.clone()));
    return response;
  } catch (e) {
    sawNetwork(false);
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.mode === 'navigate' && killAsked(request.url)) {
    // Switch off first, then let the network answer this very navigation.
    event.respondWith(unregisterAndForget().then(() => fetch(request)));
    return;
  }
  if (BUILD.kill) return;
  const route = routeFor({
    url: request.url, method: request.method, mode: request.mode, range: request.headers.has('range'),
  }, scope());
  if (route.kind === 'pass') return;
  if (route.kind === 'data') {
    event.respondWith(networkFirst(event, route, DATA_CACHE, DATA_TIMEOUT_MS));
  } else if (route.kind === 'asset') {
    event.respondWith(cacheFirst(event, route, ASSET_CACHE, true));
  } else if (stamped(BUILD)) {
    event.respondWith(cacheFirst(event, route, SHELL_CACHE, false));
  } else {
    event.respondWith(networkFirst(event, route, SHELL_CACHE, 0));
  }
});

// For tests/test_sw_routes.mjs, which evaluates this file with a stand-in `self`.
self.__srServiceWorker = {
  BUILD, PREFIX, SHELL_CACHE, ASSET_CACHE, DATA_CACHE, DATA_TIMEOUT_MS,
  routeFor, killAsked, stamped, staleCaches, keepable, gatherShell, donorCaches,
};
