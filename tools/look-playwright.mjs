// tools/look-playwright.mjs -- a look probe in Firefox or WebKit (or Playwright's Chromium).
//
//   node tools/look-playwright.mjs <url> <probe.js> --browser=firefox|webkit|chromium
//        [--width=1440] [--height=900] [--mobile] [--shot-dir=dir] [--block=host,...]
//
// tools/cdp.mjs speaks the DevTools protocol, which is Chromium's. This is the same contract through
// Playwright, for the two engines that protocol does not reach: the probe file is one body run
// inside an async function in the page, `await window.cdpShot(name)` writes <shot-dir>/<name>.png,
// what the probe returns is printed as JSON on stdout, and the page's console errors and uncaught
// errors go to stderr as `[error] ...` and `[pageerror] ...` lines, as `CDP_LOGS=1` prints them. So
// a probe under tests/probes/look/ does not know which browser it is in.
//
// BEFORE THE APP IS LOADED the runner asks a blank page for a WebGL2 context, starting the engine
// each way it knows (WAYS below) until one answers. An engine that cannot make one in this
// container cannot draw the app at all, and that is a finding and not a failure: the runner prints
// `{ "neutral": "<what the browser reported, each way>" }` and exits 0, and tools/look-summary.mjs
// writes the reason down and leaves the job green.
//
// Needs the `playwright` package (CI: `npm install --no-save playwright@1.49.1` inside the pinned
// image mcr.microsoft.com/playwright:v1.49.1-jammy, as screens.yml does). Not run on a laptop
// unless someone installs it; tools/cdp.mjs is the laptop's tool.
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [url, scriptPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!url || !scriptPath) { console.error('usage: node tools/look-playwright.mjs <url> <probe.js> --browser=firefox|webkit|chromium [--width=] [--height=] [--mobile] [--shot-dir=] [--block=host,...]'); process.exit(2); }
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
const BROWSER = arg('browser', 'firefox');
const MOBILE = process.argv.includes('--mobile');
const W = Number(arg('width', '1440'));
const H = Number(arg('height', '900'));
const SHOT_DIR = arg('shot-dir', '');
const BLOCK = arg('block', '').split(',').map((h) => h.trim()).filter(Boolean);
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });

/** What a blank page says when asked for the context the app needs. Runs in the page. */
const ASK_WEBGL2 = `(() => {
  const c = document.createElement('canvas');
  let said = '';
  c.addEventListener('webglcontextcreationerror', (e) => { said = e.statusMessage || 'webglcontextcreationerror with no message'; });
  let gl = null;
  try { gl = c.getContext('webgl2'); } catch (e) { said = String(e); }
  if (!gl) {
    let one = null;
    try { one = c.getContext('webgl'); } catch (e) { /* said above */ }
    return { ok: false, said: said || 'getContext("webgl2") returned null and fired no error', webgl1: !!one };
  }
  const x = gl.getExtension('WEBGL_debug_renderer_info');
  return { ok: true, renderer: String(x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)), version: String(gl.getParameter(gl.VERSION)) };
})()`;

/**
 * How the engine is started, in the order tried: the first that gives a blank page a WebGL2 context
 * is the one the probe runs in, and what each of the others reported is kept (`glTried`).
 * MEASURED 2026-10-12 in mcr.microsoft.com/playwright:v1.49.1-jammy on a GitHub runner: WebKit 18.2
 * headless makes a context as it comes (it names its GL "Apple GPU"). Firefox 132 headless with NO
 * DISPLAY makes none ("Exhausted GL driver options", FEATURE_FAILURE_WEBGL_EXHAUSTED_DRIVERS); under
 * `xvfb-run` the same headless start makes one on llvmpipe. So run this under xvfb-run, as look.yml
 * does; the second and third way are for a container where that is still not enough.
 */
const WAYS = [
  { name: 'headless, as it comes', options: { headless: true } },
  ...(BROWSER === 'firefox' ? [{ name: 'headless, webgl.force-enabled and software WebRender', options: { headless: true, firefoxUserPrefs: { 'webgl.force-enabled': true, 'webgl.disabled': false, 'gfx.webrender.software': true, 'layers.acceleration.force-enabled': true } } }] : []),
  // A window on a virtual display (the caller wraps this in xvfb-run): GLX through Mesa's llvmpipe.
  ...(process.env.DISPLAY ? [{ name: 'a window on the display ' + process.env.DISPLAY, options: { headless: false, ...(BROWSER === 'firefox' ? { firefoxUserPrefs: { 'webgl.force-enabled': true } } : {}) } }] : []),
];

let browser = null;
try {
  const pw = await import('playwright');
  if (!pw[BROWSER]) throw new Error('no such browser: ' + BROWSER);
  const tried = [];
  let page = null; let gl = null; let version = '';
  for (const way of WAYS) {
    browser = await pw[BROWSER].launch(way.options);
    version = browser.version();
    const context = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: MOBILE ? 3 : 1,
      hasTouch: MOBILE,
      // Firefox has no mobile emulation and refuses the option.
      ...(MOBILE && BROWSER !== 'firefox' ? { isMobile: true } : {}),
    });
    if (BLOCK.length) await context.route((u) => BLOCK.some((h) => u.hostname.endsWith(h)), (route) => route.abort());
    page = await context.newPage();
    await page.goto('about:blank');
    gl = await page.evaluate(ASK_WEBGL2);
    tried.push({ way: way.name, ...gl });
    process.stderr.write(`[look] ${BROWSER} ${version}, ${way.name}: webgl2 ${gl.ok ? 'ok, ' + gl.renderer + ', ' + gl.version : 'REFUSED: ' + gl.said}\n`);
    if (gl.ok) break;
    await browser.close().catch(() => {});
    browser = null;
  }
  if (!gl || !gl.ok) {
    console.log(JSON.stringify({ neutral: `${BROWSER} ${version} could not create a WebGL2 context in this container. ` + tried.map((t) => `Started ${t.way}: ${t.said}${t.webgl1 ? ' (a WebGL 1 context was made; the app needs 2)' : ' (no WebGL 1 context either)'}`).join(' '), browser: BROWSER, browserVersion: version, glTried: tried }, null, 2));
  } else {
    // A resource that did not load is the browser's own line, not the page's console.error (and the
    // DevTools protocol does not put it in the console at all): `[network]`, which fails nothing.
    // WebKit words it "Failed to load resource", Firefox "Cross-Origin Request Blocked" (a --block host).
    const kind = (m) => (/^Failed to load resource|Cross-Origin Request Blocked/.test(m.text()) ? 'network' : m.type() === 'warning' ? 'warning' : 'error');
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') process.stderr.write(`[${kind(m)}] ${m.text()}${kind(m) === 'network' && m.location().url ? ' ' + m.location().url : ''}\n`); });
    page.on('pageerror', (e) => process.stderr.write(`[pageerror] ${(e && (e.stack || e.message)) || e}\n`));
    await page.exposeFunction('cdpShot', async (name) => {
      if (!SHOT_DIR) return;
      await page.screenshot({ path: join(SHOT_DIR, String(name).replace(/[^\w.-]/g, '_') + '.png') });
    });
    const body = readFileSync(scriptPath, 'utf8');
    await page.goto(url, { waitUntil: 'commit' });
    const value = await page.evaluate('(async () => {\n' + body + '\n})()');
    console.log(JSON.stringify({ ...(value && typeof value === 'object' ? value : { value }), browser: BROWSER, browserVersion: version, glTried: tried }, null, 2));
  }
} catch (e) {
  console.error('DRIVER FAILED:', (e && (e.stack || e.message)) || e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  process.exit(process.exitCode || 0);
}
