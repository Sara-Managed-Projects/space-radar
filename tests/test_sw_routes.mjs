// tests/test_sw_routes.mjs -- the service worker's routing table and its stamp (issues #290, #453).
//
//   node tests/test_sw_routes.mjs
//
// site/sw.js is evaluated here with a stand-in `self`, and its pure functions are asked where each
// kind of request goes, at the root of a host AND in a subfolder (a school serves the folder at
// http://server/space-radar/). Then scripts/stamp_sw.py is run on the real tree: the shell it names
// must be the app and nothing a visitor has not asked for, and every hash must be the file's.
// The page's side (js/ui/offline.js): who gets a worker, and what a first visit hands it to keep.
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

function loadWorker(source) {
  const listeners = {};
  const self = { addEventListener: (name, fn) => { listeners[name] = fn; }, registration: { scope: 'https://x.test/' } };
  vm.runInNewContext(source, { self, URL, URLSearchParams, Promise, Set, Array, setTimeout, console, crypto: globalThis.crypto });
  return { api: self.__srServiceWorker, listeners };
}

const source = readFileSync(join(ROOT, 'site/sw.js'), 'utf8');
const { api, listeners } = loadWorker(source);
check(api && typeof api.routeFor === 'function', 'sw.js does not expose routeFor on self.__srServiceWorker');
for (const name of ['install', 'activate', 'fetch', 'message']) check(typeof listeners[name] === 'function', `sw.js has no ${name} listener`);
check(api.BUILD.version === 'dev' && api.BUILD.shell.length === 0 && api.BUILD.kill === false,
  'the committed sw.js must be unstamped (version dev): a stamp in git conflicts in every pull request');
check(api.stamped(api.BUILD) === false, 'an unstamped build must not count as stamped');
check(api.stamped({ version: 'abc', shell: [['index.html', '00']] }) === true, 'a build with a version and a shell is stamped');

// --- the table, at the root and in a subfolder -------------------------------------------------
for (const scope of ['https://www.spaceradar.ai/', 'http://school-server:8177/space-radar/', 'http://localhost:8177/a/b/']) {
  const at = (p) => scope + p;
  const kind = (p, extra = {}) => api.routeFor({ url: at(p), method: 'GET', ...extra }, scope);
  const TABLE = [
    // [path, request extras, kind, cache key relative to the scope]
    ['', { mode: 'navigate' }, 'shell', 'index.html'],
    ['index.html', { mode: 'navigate' }, 'shell', 'index.html'],
    ['?utm=1#trip=moon-landings', { mode: 'navigate' }, 'shell', 'index.html'],
    ['manifest.webmanifest', {}, 'shell', 'manifest.webmanifest'],
    ['js/main.js', {}, 'shell', 'js/main.js'],
    ['js/ui/tonight.js?v=2', {}, 'shell', 'js/ui/tonight.js'],
    ['css/ui.css', {}, 'shell', 'css/ui.css'],
    ['vendor/three.module.min.js', {}, 'shell', 'vendor/three.module.min.js'],
    ['fonts/inter-400-latin.woff2', {}, 'shell', 'fonts/inter-400-latin.woff2'],
    ['images/icons/icon-192.png', {}, 'shell', 'images/icons/icon-192.png'],
    ['textures/2k_earth_daymap.webp', {}, 'asset', 'textures/2k_earth_daymap.webp'],
    ['models/iss.glb', {}, 'asset', 'models/iss.glb'],
    ['audio/narration/moon-landings-1.opus', {}, 'asset', 'audio/narration/moon-landings-1.opus'],
    ['images/eht-m87.jpg', {}, 'asset', 'images/eht-m87.jpg'],
    ['data/stars.bin', {}, 'asset', 'data/stars.bin'],
    ['og/default.png', {}, 'asset', 'og/default.png'],
    ['data/v1/index.json', {}, 'data', 'data/v1/index.json'],
    ['data/v1/celestrak-stations.json', {}, 'data', 'data/v1/celestrak-stations.json'],
    ['sw.js', {}, 'pass', null],
    ['t/moon-landings.html', { mode: 'navigate' }, 'pass', null],
    ['o/europa.html', { mode: 'navigate' }, 'pass', null],
    ['robots.txt', {}, 'pass', null],
    ['js/main.js', { method: 'POST' }, 'pass', null],
    ['audio/beds/earth.opus', { range: true }, 'pass', null],
    ['?sw=0', { mode: 'navigate' }, 'pass', null],
    ['js/main.js?sw=0', {}, 'pass', null],
  ];
  for (const [path, extra, want, key] of TABLE) {
    const got = kind(path, extra);
    check(got.kind === want, `${at(path)} ${JSON.stringify(extra)}: routed ${got.kind} (${got.why || got.key}), expected ${want}`);
    if (key !== null) check(got.key === at(key), `${at(path)}: cached under ${got.key}, expected ${at(key)}`);
  }
  // Nothing outside the worker's own folder, and no other origin, is ever answered by it.
  for (const url of ['https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json',
    'https://gibs.earthdata.nasa.gov/wmts/x.png', new URL(scope).origin + '/elsewhere/js/main.js',
    new URL(scope).origin.replace('http', 'ws') + '/js/main.js', 'not a url']) {
    const got = api.routeFor({ url, method: 'GET' }, scope);
    if (url.startsWith(scope)) continue;
    check(got.kind === 'pass', `${url} under scope ${scope}: routed ${got.kind}, and must pass untouched`);
  }
}
check(api.routeFor({ url: 'https://www.spaceradar.ai/js/main.js' }, 'https://www.spaceradar.ai/copy/').kind === 'pass',
  'a worker in a subfolder must not answer for the folder above it');

check(api.killAsked('https://x.test/?sw=0') && !api.killAsked('https://x.test/?sw=1') && !api.killAsked('https://x.test/'),
  'killAsked: only ?sw=0 switches the worker off');
const stale = api.staleCaches(['sr-sw-shell-old', 'sr-sw-shell-new', 'sr-sw-assets-v1', 'sr.v1.bulk', 'someone-elses'], ['sr-sw-shell-new', 'sr-sw-assets-v1']);
check(JSON.stringify(stale) === JSON.stringify(['sr-sw-shell-old']),
  `staleCaches must delete only this worker's old caches (never data/sources.js's sr.v1.bulk); got ${JSON.stringify(stale)}`);
check(api.keepable({ status: 200, type: 'basic' }) && !api.keepable({ status: 206, type: 'basic' })
  && !api.keepable({ status: 0, type: 'opaque' }) && !api.keepable({ status: 404, type: 'basic' }) && !api.keepable(null),
  'keepable: only a whole, successful, same-origin answer is kept');
check(api.DATA_TIMEOUT_MS > 0 && api.DATA_TIMEOUT_MS <= 3000, 'a saved copy must answer within 3 s when the network does not');

// --- the stamp ---------------------------------------------------------------------------------
const out = mkdtempSync(join(tmpdir(), 'sw-stamp-'));
try {
  execFileSync('python3', [join(ROOT, 'scripts/stamp_sw.py'), '--out', join(out, 'sw.js')], { stdio: 'pipe' });
  const stampedSource = readFileSync(join(out, 'sw.js'), 'utf8');
  const stampedApi = loadWorker(stampedSource).api;
  const build = stampedApi.BUILD;
  check(/^[0-9a-f]{16}$/.test(build.version), `a stamped build's version is 16 hex characters; got ${build.version}`);
  check(stampedApi.stamped(build), 'a stamped file must count as stamped');
  check(stampedApi.SHELL_CACHE === 'sr-sw-shell-' + build.version, 'the shell cache is named for the build');
  const paths = build.shell.map(([p]) => p);
  for (const need of ['index.html', 'manifest.webmanifest', 'js/main.js', 'js/ui/tonight.js', 'js/ui/offline.js', 'css/ui.css',
    'vendor/three.module.min.js', 'fonts/inter-400-latin.woff2', 'images/icons/icon-192.png']) {
    check(paths.includes(need), `the shell must name ${need}: without it the app does not start offline`);
  }
  for (const p of paths) {
    check(!/^(audio|og|textures|models|data)\//.test(p), `the shell names ${p}: assets are kept as they are used, never precached`);
    check(!/cyrillic/.test(p), `the shell names ${p}: an English page never fetches a Cyrillic font`);
    check(p !== 'js/ui/rendermode.js' && p !== 'sw.js' && !p.endsWith('.md'), `the shell must not name ${p}`);
    check(stampedApi.routeFor({ url: 'https://x.test/' + p, mode: p === 'index.html' ? 'navigate' : undefined }, 'https://x.test/').kind === 'shell',
      `${p} is in the stamp and the routing table does not treat it as shell`);
  }
  for (const [p, hash] of build.shell) {
    const real = createHash('sha256').update(readFileSync(join(ROOT, 'site', p))).digest('hex').slice(0, hash.length);
    check(hash.length === 16 && real === hash, `${p}: the stamp's hash is not the file's`);
  }
  // Every module the page preloads is in the shell, or the first offline start would stall on it.
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  for (const m of html.matchAll(/rel="(?:modulepreload|stylesheet|manifest)" href="([^"]+)"/g)) {
    check(paths.includes(m[1]), `index.html loads ${m[1]} and the stamp does not name it`);
  }
  // Stamping does not touch the tree, and only the BUILD block differs.
  check(readFileSync(join(ROOT, 'site/sw.js'), 'utf8') === source, 'stamping with --out changed site/sw.js');
  const strip = (text) => text.replace(/\/\* BUILD:BEGIN[\s\S]*?BUILD:END \*\//, '');
  check(strip(stampedSource) === strip(source), 'a stamp must change the BUILD block and nothing else');

  execFileSync('python3', [join(ROOT, 'scripts/stamp_sw.py'), '--kill', '--out', join(out, 'kill.js')], { stdio: 'pipe' });
  const kill = loadWorker(readFileSync(join(out, 'kill.js'), 'utf8')).api.BUILD;
  check(kill.kill === true && kill.shell.length === 0, '--kill must stamp a worker that removes itself');
} finally {
  rmSync(out, { recursive: true, force: true });
}

// --- the page's side ---------------------------------------------------------------------------
const { swWanted, warmList } = await import(join(ROOT, 'site/js/ui/offline.js'));
const on = { supported: true, secure: true, webdriver: false, search: '' };
check(swWanted(on) === 'register', 'a secure page in a browser that has workers registers one');
check(swWanted({ ...on, search: '?sw=0' }) === 'unregister', '?sw=0 unregisters');
check(swWanted({ ...on, secure: false, search: '?sw=0' }) === 'unregister', '?sw=0 unregisters even on an insecure page');
check(swWanted({ ...on, secure: false }) === 'none', 'an insecure page (http on a LAN) gets no worker: the browser would refuse it');
check(swWanted({ ...on, supported: false }) === 'none', 'no worker support, no worker');
check(swWanted({ ...on, webdriver: true }) === 'none', 'an automated browser gets no worker, so screenshots and byte counts measure the app');
check(swWanted({ ...on, webdriver: true, search: '?sw=1' }) === 'register', 'an automated browser that asks with ?sw=1 gets one');
const warm = warmList(['http://h/sub/textures/a.jpg?x=1', 'http://h/sub/textures/a.jpg', 'http://h/sub/', 'http://h/other/b.js',
  'https://celestrak.org/x', 'http://h/sub/js/main.js#y'], 'http://h/sub/');
check(JSON.stringify(warm) === JSON.stringify(['http://h/sub/textures/a.jpg', 'http://h/sub/js/main.js']),
  `warmList keeps this folder's files once each, without queries; got ${JSON.stringify(warm)}`);

// main.js registers it late and by dynamic import; nothing imports ui/offline.js statically.
const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
check(/import\('\.\/ui\/offline\.js'\)/.test(main) && !/^import[^\n]*offline\.js/m.test(main),
  'main.js must load ui/offline.js by dynamic import, after sr:layers-ready');
check(!/modulepreload" href="js\/ui\/offline\.js"/.test(readFileSync(join(ROOT, 'site/index.html'), 'utf8')),
  'ui/offline.js must not be preloaded: it is not a first visit\'s cost');

if (problems.length) {
  for (const p of problems) console.error('FAIL ' + p);
  console.error(`\n${problems.length} problem(s) with the service worker`);
  process.exit(1);
}
console.log('service worker ok: the routing table holds at the root and in a subfolder, other origins pass untouched, and the stamp names the app and only the app');
