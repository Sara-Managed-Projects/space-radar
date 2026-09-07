// Take the README's pictures. Runs in CI, in the Playwright container -- the same rule the rest of
// this repo follows: a browser belongs on a runner, not on somebody's laptop.
//
//   node scripts/shots.mjs --base=http://127.0.0.1:8177 --out=assets/readme
//
// Every shot drives the REAL app against LIVE data, so a picture in the README cannot drift from
// what the app does. That is also the risk: an upstream outage changes the pictures. The script
// waits for a minimum number of objects before shooting and fails loudly if they never arrive,
// rather than quietly producing a photograph of an empty sky.
//
// THREE OPTIONAL FLAGS, all of which exist because "take one picture again" should not mean
// "take all of them again against a moving sky":
//
//   --only=trip,oddities   take just these shots, by name
//   --min-records=6        the floor `ready()` waits for. Some shots need only bundled data
//   --block=celestrak      abort every request whose URL matches this regex, immediately
//
// `--block` is for a machine that cannot reach a host AT ALL. There is no fetch timeout in the
// app and the loader is sequential, so one dead socket blocks every layer behind it for as long
// as the OS takes to give up -- minutes. Aborting changes nothing the app REPORTS (it still says
// "could not look", which is true), it only stops the wait. It must never be used to make a
// source that works look like one that does not.

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
const ONLY = (arg('only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const BLOCK = arg('block', '');

/** Wait until the app has booted AND has real objects, not just a canvas. */
async function ready(page, min = MIN_RECORDS, layer = null, layersReady = false) {
  // ATTACHED, NOT VISIBLE, AND THE DISTINCTION IS THE WHOLE POINT ON A PHONE. Below 600 px
  // ui/mobile.js turns this panel into a drawer that starts CLOSED, and a closed drawer is now
  // `visibility: hidden` so a keyboard user cannot tab into 34 controls sitting off the bottom
  // of the screen. Waiting for it to be visible therefore waited for something that is correctly
  // never going to happen, and the mobile shot timed out after 60 s against a perfectly healthy
  // page. What this check is actually for is "ui/controls.js has built its host", which is
  // `attached`. Above 600 px the panel IS always open, so the stronger assertion still runs
  // there -- the check is not weakened, it is asked per regime.
  await page.waitForSelector('#sr-controls', { state: 'attached', timeout: 90_000 });
  const wide = await page.evaluate(() => !window.matchMedia('(max-width: 600px)').matches);
  if (wide) await page.waitForSelector('#sr-controls', { state: 'visible', timeout: 90_000 });
  await page.waitForFunction(
    (n) => window.spaceRadar && window.spaceRadar.records().length >= n,
    min,
    { timeout: 90_000 }
  );
  // A shot of one layer waits for THAT layer, not for the total: `oddities` is bundled and lands
  // in the first second, while `active` is a five-megabyte parse. Waiting on the total would
  // shoot the odd things before their models exist, or wait two minutes for nothing.
  if (layer) {
    await page.waitForFunction(
      (id) => window.spaceRadar.recordsFor(id).length > 0,
      layer,
      { timeout: 90_000 }
    );
  }
  // A shot OF THE PANEL waits for every layer to have finished, because the panel is a list of
  // counts and a count that has not arrived reads as a count of nothing.
  if (layersReady) {
    await page.waitForFunction(() => window.__srLayersReady === true, null, { timeout: 180_000 });
  }
  // One more beat so textures finish decoding and the first camera ease settles.
  await page.waitForTimeout(2500);
}

const hideControls = (page) =>
  page.evaluate(() => {
    const c = document.getElementById('sr-controls');
    if (c) c.style.display = 'none';
  });

/** Fly the trip to one stop and let it settle, without racing its own scheduler. */
async function tripTo(page, tourId, index) {
  await page.evaluate((id) => window.spaceRadar.trip.start(id), tourId);
  await page.waitForTimeout(800);
  await page.evaluate(() => window.spaceRadar.trip.play());
  await page.waitForTimeout(6000);
  for (let i = 0; i < index; i += 1) {
    await page.evaluate(() => window.spaceRadar.trip.next());
    await page.waitForTimeout(6500);
  }
  // Wait for the stop to be REACHED, so the picture is of a stop and not of a camera halfway to
  // the next one -- but do not pause, because pausing replaces the progress row with the pause
  // chip and the progress row is half of what this picture is for. The dwell is twelve seconds;
  // a screenshot fits inside it with room to spare.
  await page.waitForFunction(
    () => window.spaceRadar.trip.state.phase === 'dwell',
    null,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(1800);
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

  // --- the odd things, and the trips -----------------------------------------------------
  // These five need no network at all: every record they show is checked into this repository.
  // `layer` and `minRecords` say so, so they can be taken on a machine that cannot reach a
  // catalogue -- and so a satellite outage cannot silently turn them into pictures of nothing.

  {
    // The tall viewport is the point: the card must fit whole, because the two blocks that make
    // this feature what it is -- "Often said" and the provenance line under the buttons -- are
    // the last things on it. A 900 px shot cuts off exactly the honesty.
    name: 'oddities',
    viewport: { width: 1600, height: 1120 },
    layer: 'oddities',
    minRecords: 6,
    async run(page) {
      await hideStatus(page);
      await hideControls(page);
      await page.evaluate(() => {
        const sr = window.spaceRadar;
        sr.select(sr.recordById('tesla-roadster'));
      });
      await page.waitForTimeout(6000);
    },
  },
  {
    // THE CARD ON ITS OWN, and that is the point: at README width a card inside a 1600 px frame is
    // 180 px wide and every word on it is unreadable, which loses exactly the thing the picture is
    // there to show. `element` shoots the card and nothing else.
    //
    // The lightsaber because its card carries the whole apparatus at once: a measured position, a
    // myth corrected with the source of the correction, and a drawing that says out loud it is the
    // kind of thing and not this exact one.
    name: 'oddity-card',
    // Short on purpose: the card is as tall as the frame, so a tall frame is a tall picture with
    // an inch of empty card under the last line of it.
    viewport: { width: 1600, height: 720 },
    layer: 'oddities',
    minRecords: 6,
    element: '#sr-card',
    async run(page) {
      await hideStatus(page);
      await hideControls(page);
      await page.evaluate(() => {
        const sr = window.spaceRadar;
        sr.select(sr.recordById('rotj-lightsaber'));
      });
      await page.waitForTimeout(6000);
    },
  },
  {
    // The layer as a row in the panel, with its count. Clipped to the panel and scrolled to the
    // list, because the interesting thing here is one checkbox among sixteen, not the sky.
    name: 'oddities-layer',
    viewport: { width: 1600, height: 1000 },
    layer: 'oddities',
    minRecords: 6,
    layersReady: true,
    clip: { x: 0, y: 0, width: 470, height: 292 },
    async run(page) {
      await hideStatus(page);
      await page.evaluate(() => {
        const rows = [...document.querySelectorAll('#sr-controls .sr-layer')];
        const odd = rows.find((r) => /Odd things/.test(r.textContent || ''));
        const panel = document.getElementById('sr-controls');
        if (odd && panel) {
          // Put the odd-things row a third of the way down the crop, so the rows above and below
          // it are visible: the claim is "it is one row like the others, with a count like the
          // others", and one row on its own cannot make it.
          panel.scrollTop += odd.getBoundingClientRect().top - panel.getBoundingClientRect().top - 96;
        }
      });
      await page.waitForTimeout(1200);
    },
  },
  {
    name: 'trip',
    viewport: { width: 1600, height: 900 },
    layer: 'oddities',
    minRecords: 6,
    async run(page) {
      await hideStatus(page);
      // Stop 4 of 6, the Golden Record: the camera flies to VOYAGER 1, because the record is not
      // a record of its own -- it is bolted to the spacecraft and drawn as a child of its model.
      // The card is about the record, the camera is where the record actually is, and the picture
      // shows both halves of that at once.
      await tripTo(page, 'strangest-things', 3);
    },
  },
  {
    name: 'trip-intro',
    viewport: { width: 1600, height: 900 },
    layer: 'oddities',
    minRecords: 6,
    async run(page) {
      await hideStatus(page);
      await page.evaluate(() => {
        const sr = window.spaceRadar;
        sr.deselect();
        sr.cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 26, ms: 0 });
      });
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.spaceRadar.trip.start('strangest-things'));
      await page.waitForTimeout(2500);
    },
  },
];

const browser = await chromium.launch({ args: ['--enable-gpu', '--use-gl=angle', '--ignore-gpu-blocklist'] });
await mkdir(OUT, { recursive: true });
let failed = 0;

const wanted = ONLY.length ? shots.filter((s) => ONLY.includes(s.name)) : shots;
const missing = ONLY.filter((n) => !shots.some((s) => s.name === n));
if (missing.length) {
  console.error(`no such shot: ${missing.join(', ')}. Known: ${shots.map((s) => s.name).join(', ')}`);
  process.exit(2);
}

for (const shot of wanted) {
  const context = await browser.newContext({
    viewport: shot.viewport,
    deviceScaleFactor: SCALE,
    // A fixed place and language so the shots do not change with the runner.
    locale: 'en-GB',
    timezoneId: 'UTC',
  });
  if (BLOCK) await context.route(new RegExp(BLOCK), (route) => route.abort('connectionfailed'));
  // Set before any app code runs, so a layer that lands early is not a layer nobody heard.
  await context.addInitScript(() => {
    window.addEventListener('sr:layers-ready', () => { window.__srLayersReady = true; });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.warn(`  page error: ${e.message}`));
  try {
    await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await ready(page, shot.minRecords ?? MIN_RECORDS, shot.layer || null, shot.layersReady === true);
    await shot.run(page);
    const path = `${OUT}/${shot.name}.png`;
    if (shot.element) await page.locator(shot.element).screenshot({ path });
    else await page.screenshot(shot.clip ? { path, clip: shot.clip } : { path });
    const n = await page.evaluate(() => window.spaceRadar.records().length);
    console.log(`  ${shot.name.padEnd(15)} ${shot.viewport.width}x${shot.viewport.height} @${SCALE}x  ${n} records  -> ${path}`);
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
