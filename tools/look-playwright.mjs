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
// BEFORE THE APP IS LOADED the runner asks a blank page for a WebGL2 context. An engine that cannot
// make one in this container cannot draw the app at all, and that is a finding and not a failure:
// the runner prints `{ "neutral": "<what the browser reported>" }` and exits 0, and
// tools/look-summary.mjs writes the reason down and leaves the job green.
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

let browser = null;
try {
  const pw = await import('playwright');
  if (!pw[BROWSER]) throw new Error('no such browser: ' + BROWSER);
  // Firefox headless leaves WebGL to its software path by itself; WebKit's Linux port draws with
  // the container's Mesa (llvmpipe). Nothing is forced on here: what they do unasked is the finding.
  browser = await pw[BROWSER].launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: MOBILE ? 3 : 1,
    hasTouch: MOBILE,
    // Firefox has no mobile emulation and refuses the option.
    ...(MOBILE && BROWSER !== 'firefox' ? { isMobile: true } : {}),
  });
  if (BLOCK.length) await context.route((u) => BLOCK.some((h) => u.hostname.endsWith(h)), (route) => route.abort());
  const page = await context.newPage();
  const version = browser.version();

  await page.goto('about:blank');
  const gl = await page.evaluate(ASK_WEBGL2);
  process.stderr.write(`[look] ${BROWSER} ${version}: webgl2 ${gl.ok ? 'ok, ' + gl.renderer + ', ' + gl.version : 'REFUSED: ' + gl.said}\n`);
  if (!gl.ok) {
    console.log(JSON.stringify({ neutral: `${BROWSER} ${version} could not create a WebGL2 context in this container: ${gl.said}${gl.webgl1 ? ' (a WebGL 1 context was made; the app needs 2)' : ' (no WebGL 1 context either)'}`, browser: BROWSER, browserVersion: version }, null, 2));
  } else {
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') process.stderr.write(`[${m.type() === 'warning' ? 'warning' : 'error'}] ${m.text()}\n`); });
    page.on('pageerror', (e) => process.stderr.write(`[pageerror] ${(e && (e.stack || e.message)) || e}\n`));
    await page.exposeFunction('cdpShot', async (name) => {
      if (!SHOT_DIR) return;
      await page.screenshot({ path: join(SHOT_DIR, String(name).replace(/[^\w.-]/g, '_') + '.png') });
    });
    const body = readFileSync(scriptPath, 'utf8');
    await page.goto(url, { waitUntil: 'commit' });
    const value = await page.evaluate('(async () => {\n' + body + '\n})()');
    console.log(JSON.stringify({ ...(value && typeof value === 'object' ? value : { value }), browser: BROWSER, browserVersion: version, glAsked: gl }, null, 2));
  }
} catch (e) {
  console.error('DRIVER FAILED:', (e && (e.stack || e.message)) || e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  process.exit(process.exitCode || 0);
}
