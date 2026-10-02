// tests/test_first_visit_bytes.mjs -- what a first visit costs, as a number CI reads (spec 0044).
//
//   node tests/test_first_visit_bytes.mjs                         the rules, on fixtures (ci.yml)
//   node tests/test_first_visit_bytes.mjs --base=http://127.0.0.1:8177 [--out=f.json]
//                                                                 a real boot, in Playwright (screens.yml)
//   node tests/test_first_visit_bytes.mjs --from=bytes.json       a boot recorded by
//                                                                 `tools/cdp.mjs --bytes=bytes.json`
//
// The programme adds fonts, sound, pictures and a sheet, each cheap on its own. The first visit was
// 2.36 MB on the live site on 2026-09-21 and nothing measured it after that, so this does: boot the
// app as a phone with CelesTrak and Launch Library blocked, wait for `window.__srLayersReady`
// (main.js sets it with `sr:layers-ready`) and two seconds more, and sum what crossed the wire.
//
// WHAT IS COUNTED. The protocol's `encodedDataLength` per request, headers included: what DevTools
// calls "transferred". CI serves site/ with python's http.server, which does not compress and has no
// /data/v1 saved copy, so the CI number is larger than the live one; `first_visit_bytes` in
// registry/budgets.yaml is set on the CI number, and its reason says so.
//
// Four things must stay at zero whatever the total: anything under /audio/ (spec 0035: nothing before
// a gesture), anything under /og/ (spec 0033: those are for chat previews), and galaxy.bin and
// stars3d.bin (spec 0028: fetched when the ladder needs them). The fonts under /fonts/ have their own
// line and budget, and a Cyrillic file on this English page fails (spec 0045 req 5). stars3d.names.json, exoplanets.csv
// and stars.bin are printed on their own line: they are the one known saving (spec 0044 req 5), and
// whether to defer them is decided by that line.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { BUDGETS } = await import(join(ROOT, 'site/js/data/budgets.js'));

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

/** Sum a boot's requests: `[{url, bytes}]` -> the numbers the gate and the log read. */
function tally(requests, pageOrigin) {
  const t = { total: 0, count: 0, audio: [], audioBytes: 0, og: [], ogBytes: 0, lazy: [], deferrable: 0, thirdParty: 0, fonts: [], fontBytes: 0, cyrillic: [] };
  for (const r of requests) {
    const at = sitePath(r.url);
    if (!at) continue; // data: and blob: URLs cross no wire
    const bytes = Number(r.bytes) || 0;
    t.total += bytes;
    t.count += 1;
    const file = at.path.split('/').pop();
    const ours = !pageOrigin || at.origin === pageOrigin;
    if (!ours) { t.thirdParty += bytes; continue; }
    if (at.path.startsWith('/audio/')) { t.audio.push(at.path); t.audioBytes += bytes; }
    if (at.path.startsWith('/og/')) { t.og.push(at.path); t.ogBytes += bytes; }
    if (at.path.startsWith('/data/') && LAZY.has(file)) t.lazy.push(at.path);
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
function verdict(t, budgets = BUDGETS) {
  const out = [];
  if (!(t.count > 0)) out.push('no requests were recorded: the measurement measured nothing');
  if (t.total > budgets.first_visit_bytes) out.push(`first visit ${t.total} B is over first_visit_bytes ${budgets.first_visit_bytes} B`);
  // A zero budget is "no request at all": a 404 for a sound is still a sound asked for at boot.
  const over = (paths, bytes, cap) => (cap === 0 ? paths.length > 0 : bytes > cap);
  if (over(t.audio, t.audioBytes, budgets.audio_at_boot_bytes)) out.push(`${t.audio.length} request(s) under /audio/ at boot (spec 0035): ${t.audio.slice(0, 3).join(', ')}`);
  if (over(t.og, t.ogBytes, budgets.og_at_boot_bytes)) out.push(`${t.og.length} request(s) under /og/ at boot (spec 0033): ${t.og.slice(0, 3).join(', ')}`);
  // Spec 0045 req 5: the faces the first screen uses, and never a Cyrillic file on an English page.
  if (t.fontBytes > budgets.fonts_at_boot_bytes) out.push(`fonts at boot ${t.fontBytes} B are over fonts_at_boot_bytes ${budgets.fonts_at_boot_bytes} B: ${t.fonts.join(', ')}`);
  if (t.cyrillic.length) out.push(`a Cyrillic face was fetched by an English page: ${t.cyrillic.join(', ')}`);
  if (t.lazy.length) out.push(`fetched at boot and meant to wait for the ladder (spec 0028): ${t.lazy.join(', ')}`);
  return out;
}

const kB = (n) => `${(n / 1000).toFixed(1)} kB`;
function report(t, where) {
  console.log(`first visit (${where}): ${t.total} B in ${t.count} requests, budget ${BUDGETS.first_visit_bytes} B`);
  console.log(`  deferrable at boot (stars3d.names.json + exoplanets.csv + stars.bin): ${t.deferrable} B (${kB(t.deferrable)})`);
  console.log(`  fonts: ${t.fontBytes} B (${kB(t.fontBytes)}) of ${BUDGETS.fonts_at_boot_bytes} B in ${t.fonts.length} file(s)${t.fonts.length ? `: ${t.fonts.join(', ')}` : ''}`);
  console.log(`  from other hosts: ${t.thirdParty} B (${kB(t.thirdParty)})`);
  console.log(`  under /audio/: ${t.audio.length}; under /og/: ${t.og.length}; galaxy.bin or stars3d.bin: ${t.lazy.length}`);
}

function finish(problems, what) {
  if (problems.length) {
    for (const p of problems) console.error(`::error::${p}`);
    process.exit(1);
  }
  console.log(`first visit ok: ${what}`);
}

// --- a real boot, in Playwright (screens.yml) ---------------------------------------------------
async function boot(base) {
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
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(() => window.__srLayersReady === true, null, { timeout: 240_000 });
    await page.waitForTimeout(2000);
    return { requests: [...requests.values()], origin: new URL(base).origin };
  } finally {
    await browser.close();
  }
}

const BASE = arg('base');
const FROM = arg('from');
if (BASE || FROM) {
  const { requests, origin } = BASE
    ? await boot(BASE)
    : (() => {
      const requests = JSON.parse(readFileSync(FROM, 'utf8'));
      const first = requests.map((r) => sitePath(r.url)).find(Boolean);
      return { requests, origin: first && first.origin };
    })();
  const t = tally(requests, origin);
  report(t, BASE || FROM);
  if (arg('out')) writeFileSync(arg('out'), JSON.stringify({ ...t, budget: BUDGETS.first_visit_bytes, requests }, null, 1));
  finish(verdict(t), 'inside the budget, and nothing lazy was fetched');
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
  const withFonts = [...visit, { url: `${O}/fonts/inter-400-latin.woff2`, bytes: 19176 }, { url: `${O}/fonts/jetbrains-mono-400-latin.woff2`, bytes: 9324 }];
  check(tally(withFonts, O).fontBytes === 28500 && verdict(tally(withFonts, O)).length === 0, 'two Latin faces at boot are counted and pass');
  check(verdict(tally(withFonts, O), { ...BUDGETS, fonts_at_boot_bytes: 20000 }).some((p) => /fonts_at_boot_bytes/.test(p)), 'fonts over their own budget fail');
  check(verdict(tally([...withFonts, { url: `${O}/fonts/inter-400-cyrillic.woff2`, bytes: 6004 }], O)).some((p) => /Cyrillic/.test(p)), 'a Cyrillic face on an English page fails');
  check(verdict(tally([], O)).some((p) => /measured nothing/.test(p)), 'an empty record fails rather than passing as zero bytes');

  // The wiring: the flag the real boot waits on, and the CI step that runs the real boot.
  const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
  check(/window\.__srLayersReady = true;\s*\n\s*window\.dispatchEvent\(new CustomEvent\('sr:layers-ready'\)\)/.test(main), 'main.js sets window.__srLayersReady as it dispatches sr:layers-ready');
  // Internal #188: the named stars and the exoplanet table are held out of the boot lanes and
  // loaded after sr:layers-ready (or when the ladder, the search box, a trip or a link needs them).
  check(/const LATER_LAYERS = new Set\(\['stars', 'exoplanets'\]\);/.test(main) && /if \(LATER_LAYERS\.has\(layer\.id\)\) \{ later\.push\(layer\); continue; \}/.test(main),
    'main.js keeps the named stars and the exoplanets out of the boot lanes');
  check(/dispatchEvent\(new CustomEvent\('sr:layers-ready'\)\);\s*\n\s*setTimeout\(\(\) => \{[\s\S]{0,200}loadAfterFirstVisit\(\)[\s\S]{0,120}LATER_LAYERS_MS\)/.test(main),
    'and loads them LATER_LAYERS_MS after sr:layers-ready');
  check(/function openAt\(ctx, id\) \{[\s\S]{0,400}loadAfterFirstVisit\(\)\.then/.test(main), 'a link to a star or an exoplanet waits for them rather than saying it names nothing');
  const screens = readFileSync(join(ROOT, '.github/workflows/screens.yml'), 'utf8');
  check(/node tests\/test_first_visit_bytes\.mjs --base=/.test(screens), 'screens.yml boots the app through this test');
  check(BUDGETS.audio_at_boot_bytes === 0 && BUDGETS.og_at_boot_bytes === 0, 'nothing under /audio/ or /og/ at boot, by budget');

  finish(problems, `the rules hold on fixtures (budget ${BUDGETS.first_visit_bytes} B; ${t.total} B passes, 1 000 000 B fails it; sound, previews, the galaxy, the 3D stars, a Cyrillic face and fonts over their budget each fail)`);
}
