// Does the app actually DRAW the world it says it is drawing?
//
//   node scripts/check-drawn.mjs --base=http://127.0.0.1:8177
//
// WHY THIS EXISTS. On 2026-09-08 one flag -- `transparent: true` on the Milky Way panorama, added
// so the scale ladder could fade it -- put the sky in three's transparent render list. A
// transparent material draws after every opaque object whatever its renderOrder, and the sky is
// drawn with depthTest OFF, so the panorama painted over the Earth, the Moon, the Sun, every
// planet and every spacecraft model. The live site showed a ring of satellites around an empty
// sky for eight days.
//
// EVERY GUARD IN THE REPOSITORY PASSED. The unit tests do not have a GPU. `screens` booted the
// app, waited for `#sr-controls`, photographed a black rectangle and reported success -- which is
// the failure its own header warns about ("a guard that REPORTS wrongly is indistinguishable from
// one that BEHAVES wrongly and is harder to notice"), one level deeper than the version that
// photographed a failure panel. A picture nobody looks at is not a check.
//
// So this asks the only question that would have caught it, and asks it of PIXELS:
//
//   1. hide the stage world's mesh, render, read the buffer;
//   2. show it, render, read again;
//   3. the two must differ over a good part of the frame.
//
// Toggling the mesh rather than sampling a colour is deliberate: it needs no opinion about what
// Earth looks like at this minute. Day side, night side with city lights, cloud over ocean -- all
// of them differ from the stars behind them. Only "not drawn at all" does not.
//
// The sky is checked the same way and for the same reason: hiding the panorama would "fix" the
// world check and break the picture, so both have to be on screen at once.
import { chromium } from 'playwright';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const BASE = arg('base', 'http://127.0.0.1:8177');
const VIEWPORT = { width: Number(arg('width', '1280')), height: Number(arg('height', '800')) };
// --mobile: a phone, not just a narrow window -- device pixel ratio and touch as well as size. The
// phone regime went unchecked in every review until 2026-09-20 because nothing here could boot one.
const MOBILE = process.argv.includes('--mobile');
// The "app is up" selector differs by viewport: the desktop rail is #sr-controls, the phone's is
// its bottom bar. The screenshot step above this one in screens.yml has always known that.
const UP = arg('selector', MOBILE ? '.sr-mobilebar' : '#sr-controls');
// MEASURED, not guessed, in the app on 2026-09-17 at the default view (camera 22 units out):
//   healthy                       Earth 25.4 % of the frame, sky 68.2 %
//   the 2026-09-08 bug put back   Earth  1.03 %  -- the atmosphere's rim, and nothing else
// Five per cent sits an order of magnitude below the first and five times above the second.
const WORLD_MIN_PCT = Number(arg('world-min', '5'));
// Stars are sparse by design, so the sky's floor is much lower -- but it is not zero.
const SKY_MIN_PCT = Number(arg('sky-min', '0.02'));

const fail = (msg) => { console.error(`::error::${msg}`); process.exitCode = 1; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: MOBILE ? 3 : 1, isMobile: MOBILE, hasTouch: MOBILE });
const problems = [];
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
// SOUND IS A CHOICE (spec 0035 req 1, 2026-09-23): a first visit asks for nothing under /audio/
// and makes no AudioContext. Every request is logged from the first byte; the path is matched
// from its root, because the engine's own modules live at /js/audio/ and are rightly loaded.
const audioRequests = [];
page.on('request', (req) => {
  try {
    if (new URL(req.url()).pathname.startsWith('/audio/')) audioRequests.push(req.url());
  } catch { /* a data: or blob: URL is not a sound file */ }
});

try {
  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  // The same "the app is up" selector the screens job waits for, then the handle the app hangs on
  // window once boot is done. No wait on RECORDS: the world is drawn from bundled ephemeris and
  // needs no network, and a red build for somebody else's outage is how a team learns to ignore
  // red builds.
  await page.waitForSelector(UP, { state: 'attached', timeout: 90_000 });
  await page.waitForFunction(() => !!(window.spaceRadar && window.spaceRadar.worlds), null, { timeout: 90_000 });

  const seen = await page.evaluate(() => {
    const ctx = window.spaceRadar;
    const r = ctx.renderer;
    const cam = ctx.camera;
    const gl = r.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const buf = () => {
      r.render(ctx.scene, cam);
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return px;
    };
    // Everything here happens in ONE task: the app's own frame loop never runs between the two
    // renders, so nothing but the toggle can explain a difference.
    const share = (node) => {
      if (!node) return null;
      const on = buf();
      const was = node.visible;
      node.visible = false;
      const off = buf();
      node.visible = was;
      let differ = 0;
      for (let i = 0; i < on.length; i += 4) {
        if (Math.abs(on[i] - off[i]) + Math.abs(on[i + 1] - off[i + 1]) + Math.abs(on[i + 2] - off[i + 2]) > 12) differ += 1;
      }
      return +((100 * differ) / (w * h)).toFixed(3);
    };

    const stageId = ctx.stage.worldId;
    const world = ctx.worlds.meshFor(stageId);
    const sky = ctx.scene.children.find((o) => o.name === 'starfield');

    // The runtime form of the rule the regression broke, in case some other material acquires it.
    const offenders = [];
    ctx.scene.traverse((o) => {
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) {
        if (m.depthTest === false && m.transparent === true) offenders.push(o.name || o.type);
      }
    });

    // A label is centred on what it names, so half hangs past that point. Before #136 only the
    // ANCHOR was kept on screen: on a 375 px phone, names ran up to 77 px off the side. Any label
    // that is drawn must be inside the window, whatever the viewport.
    const clipped = [];
    for (const el of document.querySelectorAll('div.label')) {
      if (el.hidden) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4) continue;
      if (r.right > window.innerWidth + 1 || r.left < -1) {
        clipped.push(`${(el.textContent || '').trim().slice(0, 20)} ${Math.round(r.left)}..${Math.round(r.right)}`);
      }
    }

    return {
      clipped,
      labelCount: document.querySelectorAll('div.label').length,
      stageId,
      viewport: [w, h],
      worldPct: share(world),
      skyPct: share(sky),
      offenders,
      cameraDistance: cam.position.length(),
    };
  });

  // After the checks above: the boot has had its ~90 s, the layers have landed or given up, and
  // the page has been rendered twice. A sound fetched at boot would be in the log by now.
  const sound = await page.evaluate(() => {
    const a = window.spaceRadar && window.spaceRadar.audio;
    return { exists: !!a, context: a ? a.context : 'no engine', on: a ? a.isOn() : null };
  });
  if (!sound.exists) fail('window.spaceRadar.audio is missing: main.js wireSound() did not run');
  else if (sound.context !== null) fail('an AudioContext exists after boot with no gesture (spec 0035 req 1)');
  if (audioRequests.length) {
    fail(`${audioRequests.length} request(s) under /audio/ before any gesture (spec 0035 req 1): ${audioRequests.slice(0, 3).join(', ')}`);
  } else {
    console.log('sound: 0 requests under /audio/ and no AudioContext at boot');
  }

  if (seen.clipped.length) {
    fail(
      `${seen.clipped.length} label(s) run off the edge of a ${VIEWPORT.width}x${VIEWPORT.height} window: ` +
        `${seen.clipped.join('; ')}. ui/labels.js clampLabelX() keeps the box inside the host.`
    );
  }
  console.log(`stage world: ${seen.stageId}   viewport: ${seen.viewport.join('x')}   camera ${seen.cameraDistance.toFixed(1)} units out`);
  console.log(`the stage world covers ${seen.worldPct} % of the frame; the sky ${seen.skyPct} %`);

  if (!(seen.worldPct >= WORLD_MIN_PCT)) {
    fail(
      `${seen.stageId} is not on screen: hiding its mesh changes ${seen.worldPct} % of the frame, ` +
        `and a drawn globe changes at least ${WORLD_MIN_PCT} %. Something opaque is being painted over, ` +
        `or the world is not being drawn at all.`
    );
  }
  if (!(seen.skyPct >= SKY_MIN_PCT)) {
    fail(`the sky is not on screen: hiding the starfield changes ${seen.skyPct} % of the frame (floor ${SKY_MIN_PCT} %).`);
  }
  if (seen.offenders.length) {
    fail(
      `these draw after every opaque object and paint over them -- transparent with depthTest off: ` +
        `${[...new Set(seen.offenders)].join(', ')}. See the Milky Way in scene/starfield.js.`
    );
  }
  for (const p of problems) fail(p);
  if (!process.exitCode) console.log(`drawn ok at ${VIEWPORT.width}x${VIEWPORT.height}${MOBILE ? ' (phone)' : ''}: the world and the sky are both on screen, nothing draws over them, and ${seen.labelCount} label(s) stay inside the window`);
} finally {
  await browser.close();
}
