// The boot as a timeline, in CI (internal #528, 2026-10-10).
//
//   node scripts/boot-timeline.mjs --base=http://127.0.0.1:8178 --out=.ci-screens/boot-timeline.json
//   node scripts/boot-timeline.mjs --base=... --gate          # also fail over the budgets.yaml rows
//
// Boots the app in Playwright's Chromium as a phone does not (a desktop window; `--mobile` for a phone), runs
// tests/probes/boot-timeline.js in the page (the same text tools/cdp.mjs runs on a machine with Chrome and no
// Playwright), prints the timeline and writes it as JSON: parse, first paint, main module, layers ready,
// every long task, total blocking time. CelesTrak and Launch Library are refused, as in the first-visit
// byte gate, so the timeline is the app's own work and not a catalogue's latency.
//
// REPORT ONLY BY DEFAULT. A runner's clock is not a laptop's: the first CI runs set the numbers, and the
// rows `boot_longest_task_ms` and `boot_blocking_ms` in registry/budgets.yaml are read here with `--gate`.
// Until someone switches the gate on in screens.yml this step reports and cannot fail a build.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const BASE = arg('base', 'http://127.0.0.1:8178');
const OUT = arg('out', '');
const GATE = process.argv.includes('--gate');
const MOBILE = process.argv.includes('--mobile');

/** The value of a budgets.yaml row, read without a YAML library: `- {id: x, value: 123, ...}`. */
export function budget(id, text = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8')) {
  const m = new RegExp(`\\{id:\\s*${id}\\s*,\\s*value:\\s*([0-9.]+)`).exec(text);
  return m ? Number(m[1]) : null;
}

/** Judge a timeline against the rows: a list of sentences, empty when it holds. */
export function judge(t, limits) {
  const out = [];
  if (!t.layersReadyFound) out.push('the layers never became ready');
  if (limits.longest != null && t.longestTaskMs > limits.longest) out.push(`the longest task took ${t.longestTaskMs} ms (budget ${limits.longest} ms)`);
  if (limits.blocking != null && t.totalBlockingMs > limits.blocking) out.push(`total blocking time is ${t.totalBlockingMs} ms (budget ${limits.blocking} ms)`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium } = await import('playwright');
  const body = readFileSync(join(ROOT, 'tests/probes/boot-timeline.js'), 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: MOBILE ? { width: 390, height: 844 } : { width: 1280, height: 800 }, deviceScaleFactor: MOBILE ? 3 : 1, isMobile: MOBILE, hasTouch: MOBILE });
  for (const host of ['celestrak.org', 'll.thespacedevs.com']) await page.route(`**://${host}/**`, (r) => r.abort());
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
  const timeline = await page.evaluate(`(async () => { ${body} })()`);
  await browser.close();
  console.log(JSON.stringify(timeline, null, 2));
  if (OUT) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, JSON.stringify(timeline, null, 2)); }
  const limits = { longest: budget('boot_longest_task_ms'), blocking: budget('boot_blocking_ms') };
  const problems = judge(timeline, limits);
  for (const p of problems) console.error(`${GATE ? '::error::' : '::warning::'}boot timeline: ${p}`);
  if (GATE && problems.length) process.exit(1);
}
