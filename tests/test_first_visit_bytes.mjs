// tests/test_first_visit_bytes.mjs -- what a first visit costs, as a number CI reads (spec 0044).
//
//   node tests/test_first_visit_bytes.mjs                         the rules, on fixtures (ci.yml)
//   node tests/test_first_visit_bytes.mjs --base=http://127.0.0.1:8177 [--out=f.json]
//                                                                 a real boot, in Playwright (screens.yml)
//   node tests/test_first_visit_bytes.mjs --from=bytes.json       a boot recorded by
//                                                                 `tools/cdp.mjs --bytes=bytes.json`
//   ... --embed=moon                                              with --base or --from: the light embed
//                                                                 (`?embed=1&at=moon`, js/embedlite.js),
//                                                                 held to embed_first_visit_bytes and to
//                                                                 its own list of what it may not fetch
//   ... --info                                                    with --base or --from: the total is
//                                                                 reported and not held to the budget
//                                                                 (a boot of site/ as written)
//
// The programme adds fonts, sound, pictures and a sheet, each cheap on its own. The first visit was
// 2.36 MB on the live site on 2026-09-21 and nothing measured it after that, so this does: boot the
// app as a phone with CelesTrak and Launch Library blocked, wait for `window.__srLayersReady`
// (main.js sets it with `sr:layers-ready`) and two seconds more, and sum what crossed the wire.
//
// WHAT IS COUNTED. The protocol's `encodedDataLength` per request, headers included: what DevTools
// calls "transferred". CI serves the tree with python's http.server, which does not compress and has
// no /data/v1 saved copy, so the CI number is larger than the live one; `first_visit_bytes` in
// registry/budgets.yaml is set on the CI number, and its reason says so.
//
// WHICH TREE (internal #405, 2026-10-06). The gate is what a visitor is SENT: scripts/deploy.sh
// uploads js/ and css/ without their comments (scripts/minify_site.py), so screens.yml builds that
// tree (`minify_site.py --tree`), serves it and gates on it. site/ as written is booted too, with
// `--info`: its total is printed and kept in first-visit-source.json, the rules about what may not
// be asked for at boot still fail it, and its size does not -- a comment in the source is free, by
// design, and a gate on the source's bytes would be a tax on saying why. To measure the same thing
// on your own machine:
//   python3 scripts/minify_site.py --out /tmp/served --tree && python3 tools/serve.py /tmp/served 8190
//
// Four things must stay at zero whatever the total: anything under /audio/ (spec 0035: nothing before
// a gesture), anything under /og/ (spec 0033: those are for chat previews), and galaxy.bin and
// stars3d.bin (spec 0028: fetched when the ladder needs them), and the nebulae's photographs with the
// module and registry that draw them (spec 0067: a rung of the ladder, a selection, or the shutter).
// The film camera (spec 0070, js/ui/rendermode.js) is for tools/render-trip.mjs alone: a visit that
// fetches it fails. The fonts under /fonts/ have their own
// line and budget, and a Cyrillic file on this English page fails (spec 0045 req 5). stars3d.names.json, exoplanets.csv
// and stars.bin are printed on their own line: they are the one known saving (spec 0044 req 5), and
// whether to defer them is decided by that line.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { BUDGETS } = await import(join(ROOT, 'site/js/data/budgets.js'));
// Spec 0065: the hosts a close world's map tiles come from. A first visit asks none of them for anything.
const { TILESETS } = await import(join(ROOT, 'site/js/data/tilesets.js'));
// By the address up to the level, not by the host: the Earth's tiles (2026-10-06) come from NASA GIBS,
// which today's clouds also come from, on a first visit and by design.
const TILE_PREFIXES = TILESETS.flatMap((s) => [s.url, s.relief && s.relief.url]).filter(Boolean).map((u) => u.slice(0, u.indexOf('{')));

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : '';
};

// The path as the bucket serves it: tools/serve.py at the repository root puts the app under /site/.
function sitePath(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return { origin: u.origin, path: u.pathname.replace(/^\/site(?=\/)/, '') };
  } catch {
    return null;
  }
}

const LAZY = new Set(['galaxy.bin', 'stars3d.bin']);
const DEFERRABLE = new Set(['stars3d.names.json', 'exoplanets.csv', 'stars.bin']);
// Spec 0070: fetched only when the address says `render=1`, which no visitor's does.
const FILM_ONLY = new Set(['/js/ui/rendermode.js']);

/** Sum a boot's requests: `[{url, bytes}]` -> the numbers the gate and the log read. */
function tally(requests, pageOrigin) {
  const t = { total: 0, count: 0, audio: [], audioBytes: 0, og: [], ogBytes: 0, lazy: [], nebulae: [], deferrable: 0, thirdParty: 0, fonts: [], fontBytes: 0, cyrillic: [], tiles: [], film: [] };
  for (const r of requests) {
    const at = sitePath(r.url);
    if (!at) continue; // data: and blob: URLs cross no wire
    const bytes = Number(r.bytes) || 0;
    t.total += bytes;
    t.count += 1;
    const file = at.path.split('/').pop();
    const ours = !pageOrigin || at.origin === pageOrigin;
    if (TILE_PREFIXES.some((p) => (at.origin + at.path).startsWith(p))) t.tiles.push(at.origin + at.path);
    if (!ours) { t.thirdParty += bytes; continue; }
    if (at.path.startsWith('/audio/')) { t.audio.push(at.path); t.audioBytes += bytes; }
    if (at.path.startsWith('/og/')) { t.og.push(at.path); t.ogBytes += bytes; }
    if (at.path.startsWith('/data/') && LAZY.has(file)) t.lazy.push(at.path);
    if (at.path.startsWith('/images/nebulae/') || /^\/js\/(scene|data)\/nebulae\.js$/.test(at.path)) t.nebulae.push(at.path);
    if ([...FILM_ONLY].some((f) => at.path.endsWith(f))) t.film.push(at.path);
    if (at.path.startsWith('/data/') && DEFERRABLE.has(file)) t.deferrable += bytes;
    if (at.path.startsWith('/fonts/') && file.endsWith('.woff2')) {
      t.fonts.push(`${file} ${bytes}`);
      t.fontBytes += bytes;
      if (/-cyrillic\.woff2$/.test(file)) t.cyrillic.push(file);
    }
  }
  return t;
}

/** What is wrong with a tally, against the budgets; empty when the visit is inside them. */
function verdict(t, budgets = BUDGETS, { info = false } = {}) {
  const out = [];
  if (!(t.count > 0)) out.push('no requests were recorded: the measurement measured nothing');
  if (!info && t.total > budgets.first_visit_bytes) out.push(`first visit ${t.total} B is over first_visit_bytes ${budgets.first_visit_bytes} B`);
  // A zero budget is "no request at all": a 404 for a sound is still a sound asked for at boot.
  const over = (paths, bytes, cap) => (cap === 0 ? paths.length > 0 : bytes > cap);
  if (over(t.audio, t.audioBytes, budgets.audio_at_boot_bytes)) out.push(`${t.audio.length} request(s) under /audio/ at boot (spec 0035): ${t.audio.slice(0, 3).join(', ')}`);
  if (over(t.og, t.ogBytes, budgets.og_at_boot_bytes)) out.push(`${t.og.length} request(s) under /og/ at boot (spec 0033): ${t.og.slice(0, 3).join(', ')}`);
  // Spec 0045 req 5: the faces the first screen uses, and never a Cyrillic file on an English page.
  if (t.fontBytes > budgets.fonts_at_boot_bytes) out.push(`fonts at boot ${t.fontBytes} B are over fonts_at_boot_bytes ${budgets.fonts_at_boot_bytes} B: ${t.fonts.join(', ')}`);
  if (t.cyrillic.length) out.push(`a Cyrillic face was fetched by an English page: ${t.cyrillic.join(', ')}`);
  if (t.tiles.length > budgets.planet_tile_requests_first_visit) out.push(`${t.tiles.length} map tile request(s) on a first visit (spec 0065: tiles are for a camera close to a world): ${t.tiles.slice(0, 3).join(', ')}`);
  if (t.lazy.length) out.push(`fetched at boot and meant to wait for the ladder (spec 0028): ${t.lazy.join(', ')}`);
  if (t.nebulae.length) out.push(`fetched at boot and meant to wait for the ladder, a selection or the shutter (spec 0067): ${t.nebulae.slice(0, 3).join(', ')}`);
  if (t.film.length) out.push(`fetched at boot and meant for tools/render-trip.mjs only (spec 0070): ${t.film.join(', ')}`);
  return out;
}

const kB = (n) => `${(n / 1000).toFixed(1)} kB`;
function report(t, where) {
  console.log(`first visit (${where}): ${t.total} B in ${t.count} requests, budget ${BUDGETS.first_visit_bytes} B`);
  console.log(`  deferrable at boot (stars3d.names.json + exoplanets.csv + stars.bin): ${t.deferrable} B (${kB(t.deferrable)})`);
  console.log(`  fonts: ${t.fontBytes} B (${kB(t.fontBytes)}) of ${BUDGETS.fonts_at_boot_bytes} B in ${t.fonts.length} file(s)${t.fonts.length ? `: ${t.fonts.join(', ')}` : ''}`);
  console.log(`  from other hosts: ${t.thirdParty} B (${kB(t.thirdParty)})`);
  console.log(`  under /audio/: ${t.audio.length}; under /og/: ${t.og.length}; galaxy.bin or stars3d.bin: ${t.lazy.length}; map tiles: ${t.tiles.length}; nebula pictures or their module: ${t.nebulae.length}; film camera: ${t.film.length}`);
}

// THE LIGHT EMBED (internal #396, 2026-10-07). `?embed=1&at=<a world or a station>` is booted by
// js/embedlite.js and draws one object: its own budget row, and a list of what such a frame has no
// business asking for -- the whole app's entry and its panels, the trips, the sky from the ground,
// the service worker, the clouds and the Milky Way it does not draw, and the full-size maps of the
// Earth and the Moon that its 1024-pixel copies stand in for.
const EMBED_FORBIDDEN = [
  [/\/js\/main\.js$/, 'the whole app\'s entry'],
  [/\/js\/ui\/(explore|shell|rail|timepill|search|trip|tripframe|trippicker|sheet|sources|layerspanel|offline)[^/]*\.js$/, 'a panel, the trips or the offline module'],
  [/\/js\/sky\/skyview\.js$/, 'the sky from the ground'],
  [/\/js\/data\/tours[^/]*\.js$/, 'the trips'],
  [/\/sw\.js$/, 'the service worker'],
  [/\/textures\/2k_earth_(daymap|nightmap|clouds)\.|\/textures\/2k_moon\.|\/textures\/4k\//, 'a full-size map'],
  [/\/textures\/2k_stars_milky_way\.|\/data\/constellation/, 'the Milky Way or the constellation lines'],
  [/\/data\/(stars3d|galaxy|exoplanets|dso)[^/]*$/, 'a far catalogue'],
];
function embedVerdict(t, requests, budgets = BUDGETS) {
  const out = [];
  if (t.total > budgets.embed_first_visit_bytes) out.push(`the light embed's first visit ${t.total} B is over embed_first_visit_bytes ${budgets.embed_first_visit_bytes} B`);
  for (const r of requests) {
    const at = sitePath(r.url);
    if (!at) continue;
    const hit = EMBED_FORBIDDEN.find(([re]) => re.test(at.path));
    if (hit) out.push(`the light embed asked for ${at.path} (${hit[1]})`);
  }
  if (!requests.some((r) => /\/js\/embedlite\.js(\?|$)/.test(r.url))) out.push('js/embedlite.js was not fetched: this was not the light embed');
  if (t.audio.length || t.og.length) out.push('the light embed asked for a sound or a preview picture');
  return out;
}

function finish(problems, what) {
  if (problems.length) {
    for (const p of problems) console.error(`::error::${p}`);
    process.exit(1);
  }
  console.log(`first visit ok: ${what}`);
}

// --- a real boot, in Playwright (screens.yml) ---------------------------------------------------
async function boot(base, path = 'index.html') {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    // The protocol, not Playwright's response events: `encodedDataLength` is the same count
    // tools/cdp.mjs --bytes takes, so a local or live measurement and CI's agree on what a byte is.
    const cdp = await context.newCDPSession(page);
    const requests = new Map();
    cdp.on('Network.requestWillBeSent', (e) => requests.set(e.requestId, { url: e.request.url, bytes: 0 }));
    const done = (e) => { const q = requests.get(e.requestId); if (q) q.bytes = e.encodedDataLength || 0; };
    cdp.on('Network.loadingFinished', done);
    cdp.on('Network.loadingFailed', done);
    await cdp.send('Network.enable');
    // CelesTrak allows one download per file per IP per two hours, and CI must not be red because
    // somebody else's service is down; blocked, the app behaves as it does when they say no.
    await cdp.send('Network.setBlockedURLs', { urls: ['*celestrak.org*', '*thespacedevs.com*'] });
    await page.goto(`${base}/${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(() => window.__srLayersReady === true, null, { timeout: 240_000 });
    await page.waitForTimeout(2000);
    return { requests: [...requests.values()], origin: new URL(base).origin };
  } finally {
    await browser.close();
  }
}

const BASE = arg('base');
const FROM = arg('from');
const EMBED = arg('embed');
if (BASE || FROM) {
  const { requests, origin } = BASE
    ? await boot(BASE, EMBED ? `index.html?embed=1&at=${encodeURIComponent(EMBED)}` : 'index.html')
    : (() => {
      const requests = JSON.parse(readFileSync(FROM, 'utf8'));
      const first = requests.map((r) => sitePath(r.url)).find(Boolean);
      return { requests, origin: first && first.origin };
    })();
  const INFO = process.argv.includes('--info');
  const t = tally(requests, origin);
  if (EMBED) {
    console.log(`light embed, at=${EMBED} (${BASE || FROM}): ${t.total} B in ${t.count} requests, budget ${BUDGETS.embed_first_visit_bytes} B`);
    if (arg('out')) writeFileSync(arg('out'), JSON.stringify({ ...t, budget: BUDGETS.embed_first_visit_bytes, embed: EMBED, requests }, null, 1));
    finish(INFO ? [] : embedVerdict(t, requests), INFO ? `the light embed's total is information here` : `the light embed is inside its budget and fetched nothing it does not draw`);
  } else {
  report(t, `${BASE || FROM}${INFO ? ', for information: the source as written, not held to the budget' : ''}`);
  if (arg('out')) writeFileSync(arg('out'), JSON.stringify({ ...t, budget: BUDGETS.first_visit_bytes, info: INFO, requests }, null, 1));
  finish(verdict(t, BUDGETS, { info: INFO }), INFO ? 'nothing lazy was fetched (the total is information here)' : 'inside the budget, and nothing lazy was fetched');
  }
} else {
  // --- the rules, on fixtures: no browser, so ci.yml's node job runs it ---------------------------
  const problems = [];
  const check = (ok, msg) => { if (!ok) problems.push(msg); };
  const O = 'http://127.0.0.1:8177';
  const visit = [
    { url: `${O}/index.html`, bytes: 5000 },
    { url: `${O}/js/main.js`, bytes: 50000 },
    { url: `${O}/js/audio/engine.js`, bytes: 9000 }, // the engine's module is not a sound
    { url: `${O}/data/stars.bin`, bytes: 81000 },
    { url: `${O}/data/stars3d.names.json`, bytes: 288000 },
    { url: `${O}/data/exoplanets.csv`, bytes: 582000 },
    { url: 'https://minorplanetcenter.net/iau/MPCORB/CometEls.txt', bytes: 163000 },
    { url: 'data:image/jpeg;base64,AAAA', bytes: 0 },
  ];
  const t = tally(visit, O);
  check(t.count === 7, `data: URLs cross no wire and are not counted (counted ${t.count})`);
  check(t.total === 1178000, `the total is every request's bytes (${t.total})`);
  check(t.deferrable === 951000, `the deferrable line is names + csv + stars.bin, not stars3d.bin (${t.deferrable})`);
  check(t.thirdParty === 163000, `another host's bytes count in the total and are printed apart (${t.thirdParty})`);
  check(verdict(t).length === 0, `a 1.18 MB visit with nothing lazy passes: ${verdict(t).join('; ')}`);
  check(verdict(t, { ...BUDGETS, first_visit_bytes: 1000000 }).some((p) => /over first_visit_bytes/.test(p)), 'the same visit fails at a 1 000 000 B budget');
  check(verdict(tally([...visit, { url: `${O}/audio/bed-earth.opus`, bytes: 1 }], O)).some((p) => /\/audio\//.test(p)), 'a sound at boot fails');
  check(verdict(tally([...visit, { url: `${O}/og/default.png`, bytes: 1 }], O)).some((p) => /\/og\//.test(p)), 'a preview picture at boot fails');
  check(verdict(tally([...visit, { url: `${O}/data/galaxy.bin`, bytes: 1 }], O)).some((p) => /galaxy\.bin/.test(p)), 'the galaxy at boot fails');
  check(verdict(tally([...visit, { url: `${O}/site/data/stars3d.bin`, bytes: 1 }], O)).some((p) => /stars3d\.bin/.test(p)), 'the 3D stars at boot fail, served under /site/ too');
  check(verdict(tally([...visit, { url: `${O}/images/nebulae/m42.webp`, bytes: 1 }], O)).some((p) => /spec 0067/.test(p)), 'a nebula\'s photograph at boot fails');
  check(verdict(tally([...visit, { url: `${O}/site/js/scene/nebulae.js`, bytes: 1 }], O)).some((p) => /spec 0067/.test(p)) && verdict(tally([...visit, { url: `${O}/js/data/nebulae.js`, bytes: 1 }], O)).some((p) => /spec 0067/.test(p)), 'and so do the module that draws them and its registry');
  check(verdict(tally([...visit, { url: `${O}/js/scene/exposure.js`, bytes: 2000 }], O)).length === 0, 'the shutter\'s own small module is on the boot path, by design');
  const withFonts = [...visit, { url: `${O}/fonts/inter-400-latin.woff2`, bytes: 19176 }, { url: `${O}/fonts/jetbrains-mono-400-latin.woff2`, bytes: 9324 }];
  check(tally(withFonts, O).fontBytes === 28500 && verdict(tally(withFonts, O)).length === 0, 'two Latin faces at boot are counted and pass');
  check(verdict(tally(withFonts, O), { ...BUDGETS, fonts_at_boot_bytes: 20000 }).some((p) => /fonts_at_boot_bytes/.test(p)), 'fonts over their own budget fail');
  check(verdict(tally([...withFonts, { url: `${O}/fonts/inter-400-cyrillic.woff2`, bytes: 6004 }], O)).some((p) => /Cyrillic/.test(p)), 'a Cyrillic face on an English page fails');
  check(verdict(tally([...visit, { url: 'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/3/2/7.jpg', bytes: 30000 }], O)).some((p) => /map tile request/.test(p)), 'a map tile on a first visit fails (spec 0065)');
  check(verdict(tally([...visit, { url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/500m/3/2/5.jpeg', bytes: 40000 }], O)).some((p) => /map tile request/.test(p)), 'and so does one of the Earth\'s, from NASA GIBS');
  check(verdict(tally([...visit, { url: 'https://trek.nasa.gov/tiles/Moon/EQ/LRO_LOLA_Shade_Global_256ppd_v06/1.0.0/default/default028mm/3/2/7.png', bytes: 40000 }], O)).some((p) => /map tile request/.test(p)), 'and a relief tile');
  check(!verdict(tally([...visit, { url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/GOES-East_ABI_Band13_Clean_Infrared/default/2026-10-06T00:00:00Z/2km/2/1/1.png', bytes: 40000 }], O)).some((p) => /map tile request/.test(p)), 'today\'s clouds, from the same host, are not map tiles');
  check(verdict(tally([], O)).some((p) => /measured nothing/.test(p)), 'an empty record fails rather than passing as zero bytes');
  check(verdict(tally([...visit, { url: `${O}/js/ui/rendermode.js`, bytes: 1 }], O)).some((p) => /render-trip/.test(p)), 'the film camera at boot fails');

  // The wiring: the flag the real boot waits on, and the CI step that runs the real boot.
  const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
  check(/window\.__srLayersReady = true;\s*\n\s*window\.dispatchEvent\(new CustomEvent\('sr:layers-ready'\)\)/.test(main), 'main.js sets window.__srLayersReady as it dispatches sr:layers-ready');
  // Internal #188: the named stars and the exoplanet table are held out of the boot lanes and
  // loaded after sr:layers-ready (or when the ladder, the search box, a trip or a link needs them).
  check(/const LATER_LAYERS = new Set\(\['stars', 'exoplanets', 'deep-sky'\]\);/.test(main) && /if \(LATER_LAYERS\.has\(layer\.id\)\) \{ later\.push\(layer\); continue; \}/.test(main),
    'main.js keeps the named stars and the exoplanets out of the boot lanes');
  check(/dispatchEvent\(new CustomEvent\('sr:layers-ready'\)\);\s*\n\s*setTimeout\(\(\) => \{[\s\S]{0,200}loadAfterFirstVisit\(\)[\s\S]{0,120}LATER_LAYERS_MS\)/.test(main),
    'and loads them LATER_LAYERS_MS after sr:layers-ready');
  check(/function openAt\(ctx, id\) \{[\s\S]{0,400}loadAfterFirstVisit\(\)\.then/.test(main), 'a link to a star or an exoplanet waits for them rather than saying it names nothing');
  // Spec 0070: the film camera is a dynamic import behind `render=1`, and not in the preload block.
  check(/\/\[\?&\]render=1\(\?:&\|\$\)\/\.test\(location\.search\)\s*\n\s*\? await import\('\.\/ui\/rendermode\.js'\)/.test(main) && !/^import [^\n]*rendermode/m.test(main),
    'main.js imports ui/rendermode.js only for an address with render=1');
  check(!readFileSync(join(ROOT, 'site/index.html'), 'utf8').includes('rendermode'), 'and index.html does not preload it');
  const screens = readFileSync(join(ROOT, '.github/workflows/screens.yml'), 'utf8');
  check(/node tests\/test_first_visit_bytes\.mjs --base=/.test(screens), 'screens.yml boots the app through this test');
  // Internal #405: the gate is on the tree a deploy uploads, and the source is measured beside it.
  check(/python3 scripts\/minify_site\.py --out "\$RUNNER_TEMP\/served" --tree/.test(screens) && /http\.server 8178 --directory "\$RUNNER_TEMP\/served"/.test(screens),
    'screens.yml builds the stripped tree and serves it');
  check(/test_first_visit_bytes\.mjs --base=http:\/\/127\.0\.0\.1:8178 --out=\.ci-screens\/first-visit\.json/.test(screens), 'the gate boots the stripped tree');
  check(/test_first_visit_bytes\.mjs --base=http:\/\/127\.0\.0\.1:8177 --info --out=\.ci-screens\/first-visit-source\.json/.test(screens), 'and the source is booted for information');
  check(verdict(t, { ...BUDGETS, first_visit_bytes: 1000000 }, { info: true }).length === 0, 'with --info the total is not held to the budget');
  check(verdict(tally([...visit, { url: `${O}/audio/bed-earth.opus`, bytes: 1 }], O), BUDGETS, { info: true }).some((p) => /\/audio\//.test(p)), 'and a sound at boot still fails');
  const deploy = readFileSync(join(ROOT, 'scripts/deploy.sh'), 'utf8');
  check(/minify_site\.py" --site "\$SITE" --out "\$BUILT\/min" --node node/.test(deploy) && /"\$APP\/js"\s+"s3:\/\/\$BUCKET\/js"/.test(deploy) && /"\$APP\/css" "s3:\/\/\$BUCKET\/css"/.test(deploy),
    'scripts/deploy.sh uploads the stripped js/ and css/: the tree this test gates is the tree that is served');
  check(BUDGETS.audio_at_boot_bytes === 0 && BUDGETS.og_at_boot_bytes === 0, 'nothing under /audio/ or /og/ at boot, by budget');
  // The light embed's own rules (internal #396).
  {
    const O2 = 'http://127.0.0.1:8178';
    const lean = [
      { url: `${O2}/index.html?embed=1&at=moon`, bytes: 12000 }, { url: `${O2}/js/embedlite.js`, bytes: 9000 },
      { url: `${O2}/vendor/three.module.min.js`, bytes: 365000 }, { url: `${O2}/textures/embed/moon.webp`, bytes: 81000 },
    ];
    const te = tally(lean, O2);
    check(embedVerdict(te, lean).length === 0, `a light embed inside its budget passes (${embedVerdict(te, lean).join('; ')})`);
    check(BUDGETS.embed_first_visit_bytes > 0 && BUDGETS.embed_first_visit_bytes <= 2500000, `embed_first_visit_bytes is at most 2.5 MB (${BUDGETS.embed_first_visit_bytes})`);
    check(BUDGETS.embed_first_visit_bytes < BUDGETS.first_visit_bytes, 'and under the whole app\'s first visit');
    check(embedVerdict(te, lean, { ...BUDGETS, embed_first_visit_bytes: 100000 }).some((p) => /over embed_first_visit_bytes/.test(p)), 'over its budget fails');
    for (const [bad, why] of [['js/main.js', 'entry'], ['js/ui/explore.js', 'panel'], ['js/ui/trip.js', 'trips'], ['js/sky/skyview.js', 'ground'], ['sw.js', 'worker'],
      ['textures/2k_earth_clouds.webp', 'map'], ['textures/2k_moon.jpg', 'map'], ['textures/2k_stars_milky_way.webp', 'Milky Way'], ['data/stars3d.bin', 'catalogue'], ['js/data/tours.js', 'trips']]) {
      const withBad = [...lean, { url: `${O2}/${bad}`, bytes: 10 }];
      check(embedVerdict(tally(withBad, O2), withBad).some((p) => p.includes(`/${bad}`)), `a light embed that asks for ${bad} fails (${why})`);
    }
    const noLite = lean.filter((r) => !/embedlite/.test(r.url));
    check(embedVerdict(tally(noLite, O2), noLite).some((p) => /was not the light embed/.test(p)), 'a boot that never fetched js/embedlite.js is not counted as one');
    check(/test_first_visit_bytes\.mjs --base=http:\/\/127\.0\.0\.1:8178 --embed=moon/.test(screens) && /--embed=25544/.test(screens), 'screens.yml boots the light embed for the Moon and for the station');
  }

  finish(problems, `the rules hold on fixtures (budget ${BUDGETS.first_visit_bytes} B; ${t.total} B passes, 1 000 000 B fails it; sound, previews, the galaxy, the 3D stars, the nebulae, a Cyrillic face and fonts over their budget each fail)`);
}
