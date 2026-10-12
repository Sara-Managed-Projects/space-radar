// The trips walk in CI (spec 0044 task 3, internal #123): tools/trips-cost.probe.js in Playwright's
// Chromium at a desktop's size and a phone's. Every stop of every trip: draw calls and triangles a
// frame against registry/budgets.yaml (`draw_calls_per_stop`, `triangles_per_stop`), and no frame
// empty (the probe's header says why that is not "95 % one colour").
//
//   node scripts/check-trips.mjs --base=http://127.0.0.1:8177 --out=.ci-screens/trips.json
//   node scripts/check-trips.mjs --base=... --desktop --trips=moon-landings,the-living-earth
//
// Writes one row per stop per viewport to --out and exits 1 on any finding, on a trip that was not
// reached inside --budget seconds a viewport (default 1500), or on a walk that read fewer than
// --min-trips trips (default 20: of twenty-six on 2026-10-08, twenty-four are offerable in CI).
// CelesTrak and Launch Library are refused, as everywhere in CI: a stop whose object comes from
// them is then drawn without it, which is what a visitor those hosts refuse sees, and a trip that
// cannot be offered without them (the station's two) is skipped and named.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
const has = (n) => process.argv.includes('--' + n);
const BASE = arg('base', 'http://127.0.0.1:8177');
const OUT = arg('out', '');
const TRIPS = arg('trips', '');
const BUDGET = Number(arg('budget', '1500'));
const SETTLE = arg('settle', '1500');
const MIN_TRIPS = TRIPS ? 1 : Number(arg('min-trips', '20'));
const SIZES = [
  ...(has('phone') ? [] : [{ name: 'desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }]),
  ...(has('desktop') ? [] : [{ name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]),
];
const BLOCKED = /(^|\.)(celestrak\.org|ll\.thespacedevs\.com)$/;
const probe = readFileSync(join(here, '..', 'tools', 'trips-cost.probe.js'), 'utf8');

const browser = await chromium.launch();
const report = {};
let failed = 0;
for (const size of SIZES) {
  const { name, ...device } = size;
  const context = await browser.newContext(device);
  await context.route((url) => BLOCKED.test(url.hostname), (route) => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout((BUDGET + 600) * 1000);
  const began = Date.now();
  let r;
  try {
    await page.goto(`${BASE}/index.html?sw=0&cost=1&budget=${BUDGET}&settle=${SETTLE}${TRIPS ? '&walktrip=' + TRIPS : ''}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    r = await page.evaluate(`(async () => {${probe}\n})()`);
  } catch (e) {
    r = { ok: false, problems: [`the probe did not finish: ${e.message}`], rows: [], notReached: [] };
  }
  await context.close();
  report[name] = { minutes: Math.round((Date.now() - began) / 6000) / 10, ...r };
  const problems = [...(r.problems || []), ...(r.notReached || []).map((id) => `${id}: not reached inside ${BUDGET} s`)];
  if (!(r.rows || []).length) problems.push('the walk read no stops');
  else if ((r.trips || 0) < MIN_TRIPS) problems.push(`only ${r.trips} trips could be walked, under ${MIN_TRIPS}: ${(r.skipped || []).join('; ')}`);
  for (const sk of r.skipped || []) console.log(`  skipped, not offerable here: ${sk}`);
  console.log(`[${name}] ${r.stops || 0} stops of ${r.trips || 0} trips (of ${r.of || '?'}) in ${report[name].minutes} min: draw calls median ${r.calls && r.calls.median}, max ${r.calls && r.calls.max}; triangles median ${r.triangles && r.triangles.median}, max ${r.triangles && r.triangles.max}; the emptiest frame is ${r.oneColour && (r.oneColour.max * 100).toFixed(3)} % one colour`);
  for (const w of (r.calls && r.calls.worst) || []) console.log(`  most draw calls: ${w}`);
  for (const w of (r.triangles && r.triangles.worst) || []) console.log(`  most triangles: ${w}`);
  for (const p of problems) console.error(`::error::[${name}] ${p}`);
  failed += problems.length;
}
await browser.close();
if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(failed ? `trips walk FAILED: ${failed} findings` : 'trips walk ok: every stop walked is inside its draw-call and triangle budgets, and none is an empty frame');
process.exit(failed ? 1 : 0);
