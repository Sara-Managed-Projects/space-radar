// The UI probe as a gate (internal #374, spec 0061 task 6): tests/probes/ui_probe.js walked in a real
// browser at a phone's size and a desktop's, and every measured problem is a failure.
//
//   node scripts/check-ui.mjs --base=http://127.0.0.1:8177                    # both sizes
//   node scripts/check-ui.mjs --base=http://127.0.0.1:8177 --phone --out=ui-phone.json
//
// CI runs it in the `ui` job of .github/workflows/screens.yml (Playwright's Chromium, software GL).
// On a machine without Playwright the same probe runs under tools/cdp.mjs: its header says how.
//
// WHAT IT ADDS TO THE PROBE: the browser (a phone is a touch device with a coarse pointer, which is
// what turns the 24 px floor into 44), CelesTrak and Launch Library refused so a run never spends
// the per-IP budget a visitor needs, and KNOWN below: findings that are real, have an issue, and
// are not this gate's to fix. A finding in KNOWN is printed and does not fail; an entry of KNOWN
// that no longer matches anything FAILS, so the list cannot outlive what it excuses.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
const has = (n) => process.argv.includes('--' + n);
const BASE = arg('base', 'http://127.0.0.1:8177');
const OUT = arg('out', '');
const SIZES = [
  ...(has('desktop') ? [] : [{ name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]),
  ...(has('phone') ? [] : [{ name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }]),
];
const BLOCKED = /(^|\.)(celestrak\.org|ll\.thespacedevs\.com)$/;

/**
 * Findings that are real and are somebody else's to fix: {size, match, issue}. `match` is tested
 * against "<state>: <problem>". Keep it empty when you can.
 */
export const KNOWN = JSON.parse(readFileSync(join(here, '..', 'tests', 'probes', 'ui_probe.known.json'), 'utf8')).known;

/** Split a run's problems into the ones that fail and the ones KNOWN excuses; name the stale entries. */
export function sort(problems, size, known = KNOWN) {
  const mine = known.filter((k) => !k.size || k.size === size);
  const used = new Set();
  const failing = [];
  const excused = [];
  for (const p of problems) {
    const k = mine.find((row) => new RegExp(row.match).test(p));
    if (k) { used.add(k); excused.push(`${p}  [known: ${k.issue}]`); } else failing.push(p);
  }
  return { failing, excused, stale: mine.filter((k) => !used.has(k)) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { chromium } = await import('playwright'); // here, so tests/test_ui_gate.mjs can import sort() without a browser
  const probe = readFileSync(join(here, '..', 'tests', 'probes', 'ui_probe.js'), 'utf8');
  const browser = await chromium.launch();
  const report = {};
  let failed = 0;
  for (const size of SIZES) {
    const { name, ...device } = size;
    const context = await browser.newContext(device);
    await context.route((url) => BLOCKED.test(url.hostname), (route) => route.abort());
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    const began = Date.now();
    let result;
    try {
      await page.goto(`${BASE}/index.html?sw=0&walk=gate`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      // The probe is the body of an async function (tools/cdp.mjs runs it the same way).
      result = await page.evaluate(`(async () => {${probe}\n})()`);
    } catch (e) {
      result = { ok: false, problems: [`the probe did not finish: ${e.message}`], states: {} };
    }
    await context.close();
    const problems = [...(result.problems || []), ...pageErrors.map((m) => `page error: ${m}`)];
    const { failing, excused, stale } = sort(problems, name);
    const states = Object.entries(result.states || {});
    const targets = states.reduce((n, [, s]) => n + (s.targets || 0), 0);
    const clipped = states.reduce((n, [, s]) => n + (s.clipped || 0), 0);
    report[name] = { seconds: Math.round((Date.now() - began) / 1000), coarse: result.coarse, min: result.min, states: states.length, targets, clipped, failing, excused, stale, result };
    console.log(`[${name}] ${states.length} states, ${targets} targets measured whole and ${clipped} by their box (cut by the fold or a scroller), floor ${result.min} px, ${report[name].seconds} s`);
    for (const p of excused) console.log(`  known: ${p}`);
    for (const p of failing) console.error(`::error::[${name}] ${p}`);
    for (const k of stale) console.error(`::error::[${name}] tests/probes/ui_probe.known.json excuses /${k.match}/ (${k.issue}) and nothing matched it: it is fixed, so remove the entry`);
    // A walk that measured nothing is not a pass.
    if (states.length < 10 || targets < 40) { console.error(`::error::[${name}] the walk measured ${targets} targets in ${states.length} states: it did not walk the app`); failed += 1; }
    failed += failing.length + stale.length;
  }
  await browser.close();
  if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 1));
  console.log(failed ? `ui gate FAILED: ${failed} findings` : 'ui gate ok: every control measured has a name and a target of its size, no text under the floor, nothing scrolls sideways, one ember fill at most');
  process.exit(failed ? 1 : 0);
}
