// Take the README's pictures. Runs in CI, in the Playwright container -- the same rule the rest of
// this repo follows: a browser belongs on a runner, not on somebody's laptop.
//
//   node scripts/shots.mjs --base=http://127.0.0.1:8177 --out=assets/readme
//
// Every shot drives the REAL app against LIVE data, so a picture in the README cannot drift from
// what the app does. That is also the risk: an upstream outage changes the pictures. The script
// waits for a minimum number of objects before shooting and fails loudly if they never arrive,
// rather than quietly producing a photograph of an empty sky.

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const BASE = arg('base', 'http://127.0.0.1:8177');
const OUT = arg('out', 'assets/readme');
const SCALE = Number(arg('scale', '2'));
const MIN_RECORDS = Number(arg('min-records', '150'));

/** Wait until the app has booted AND has real objects, not just a canvas. */
async function ready(page, min = MIN_RECORDS) {
  await page.waitForSelector('#sr-controls', { timeout: 90_000 });
  await page.waitForFunction(
    (n) => window.spaceRadar && window.spaceRadar.records().length >= n,
    min,
    { timeout: 90_000 }
  );
  // One more beat so textures finish decoding and the first camera ease settles.
  await page.waitForTimeout(2500);
}

const hideStatus = (page) =>
  page.evaluate(() => {
    const s = document.getElementById('sr-status');
    if (s) s.style.display = 'none';
  });

const shots = [
  {
    name: 'hero',
    viewport: { width: 1600, height: 900 },
    async run(page) {
      await hideStatus(page);
      await page.evaluate(() => {
        const sr = window.spaceRadar;
        sr.cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 25, ms: 0 });
      });
      await page.waitForTimeout(1500);
    },
  },
  {
    name: 'card',
    viewport: { width: 1600, height: 900 },
    async run(page) {
      await hideStatus(page);
      await page.evaluate(async () => {
        const sr = window.spaceRadar;
        const iss = sr.records().find((r) => /ZARYA/.test(r.name)) || sr.recordsFor('stations')[0];
        if (iss) sr.select(iss);
      });
      await page.waitForTimeout(2500);
    },
  },
  {
    name: 'catalogue',
    viewport: { width: 1600, height: 900 },
    async run(page) {
      await hideStatus(page);
      await page.evaluate(async () => {
        const sr = window.spaceRadar;
        sr.deselect();
        sr.setLayerOn('active', true);
        sr.cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 34, ms: 0 });
      });
      // The full catalogue is a 5 MB fetch and a parse; give it room.
      await page.waitForFunction(
        () => window.spaceRadar.recordsFor('active').length > 5000,
        null,
        { timeout: 120_000 }
      ).catch(() => console.warn('  (the active catalogue did not arrive; shooting anyway)'));
      await page.waitForTimeout(3000);
    },
  },
  {
    name: 'sky',
    viewport: { width: 1600, height: 900 },
    async run(page) {
      await hideStatus(page);
      await page.evaluate(async () => {
        const sr = window.spaceRadar;
        // A place where it is night right now, so the shot is of a dark sky rather than blue.
        const hour = new Date().getUTCHours();
        const lonForNight = ((-15 * hour + 180 + 540) % 360) - 180;
        sr.setObserver({ latDeg: 40, lonDeg: lonForNight, altKm: 0.02, name: 'somewhere dark' });
        sr.setMoment('now');
      });
      await page.waitForTimeout(4000);
    },
  },
  {
    name: 'sources',
    viewport: { width: 1100, height: 900 },
    async run(page) {
      await page.evaluate(() => {
        const s = document.getElementById('sr-status');
        if (s) { s.style.display = ''; s.scrollTop = 0; }
        const c = document.getElementById('sr-controls');
        if (c) c.style.display = 'none';
      });
      await page.waitForTimeout(1500);
    },
  },
  {
    name: 'mobile',
    viewport: { width: 390, height: 844 },
    async run(page) {
      await page.evaluate(() => {
        const sr = window.spaceRadar;
        sr.cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 20, ms: 0 });
      });
      await page.waitForTimeout(1500);
    },
  },
];

const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
await mkdir(OUT, { recursive: true });
let failed = 0;

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: shot.viewport,
    deviceScaleFactor: SCALE,
    // A fixed place and language so the shots do not change with the runner.
    locale: 'en-GB',
    timezoneId: 'UTC',
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.warn(`  page error: ${e.message}`));
  try {
    await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await ready(page);
    await shot.run(page);
    const path = `${OUT}/${shot.name}.png`;
    await page.screenshot({ path });
    const n = await page.evaluate(() => window.spaceRadar.records().length);
    console.log(`  ${shot.name.padEnd(10)} ${shot.viewport.width}x${shot.viewport.height} @${SCALE}x  ${n} records  -> ${path}`);
  } catch (err) {
    failed++;
    console.error(`  ${shot.name}: FAILED -- ${err.message}`);
  }
  await context.close();
}

await browser.close();
if (failed) {
  console.error(`${failed} shot(s) failed`);
  process.exit(1);
}
console.log('all shots taken');
