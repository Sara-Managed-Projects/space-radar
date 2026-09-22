// Evaluate a script inside a page in a REAL headless Chrome, with nothing installed: Node 22 ships a
// WebSocket client and Chrome ships the DevTools protocol.
//
//   node tools/cdp.mjs <url> <script.js> [--width=1280] [--height=800]      CDP_TRACE=1 for steps
//
// The script body runs inside an async function in the page; `return` a JSON-able value and it is
// printed. CI has Playwright (scripts/check-drawn.mjs); this is for a machine that does not.
//
// WHY IT EXISTS. The Claude desktop app's browser pane gives a hidden page ZERO animation frames --
// measured 0 frames in 4 s -- and loses the WebGL context, so nothing the app draws per frame, hero
// models above all, can be observed there. Headless Chrome with SwiftShader is slow (3 fps at a
// small viewport) but it is a real GL context, and every pixel number in the 2026-09-17 reviews
// came from here.
//
// THE RECIPE IS THE ONLY ONE OF FIVE THAT WORKED, and each failure was silent:
//   - Page.navigate on a freshly created target and then evaluate: fine ONLY once the target was
//     made at about:blank first (below). Made at the url directly, evaluate ran in the old
//     about:blank context and answered every question about the wrong document.
//   - /json/new?<url> opened about:blank whatever was passed.
//   - attaching to the page /json/list showed at the right url: its one context had origin "://".
// And three that looked like hangs and were not:
//   - node never exits while the WebSocket is open, and a piped stdout is block-buffered, so the
//     result sat unflushed -- hence the explicit exit in `finally`;
//   - python3 -m http.server is single threaded and the app asks for ~87 files (tools/serve.py);
//   - Chrome updating itself mid-session took 14 s to open the port, so the wait is 60 s.
//
// BUDGET YOUR BOOTS. Each boot of the app pulls the live catalogues. About fifteen in an hour got
// this machine a 403 from CelesTrak on 2026-09-17, which then looks exactly like an empty layer.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, scriptPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!url || !scriptPath) { console.error('usage: node tools/cdp.mjs <url> <script.js> [--width=] [--height=] [--mobile] [--shot=] [--cpuprofile=] [--block=host,...]'); process.exit(2); }
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
const W = Number(arg('width', '1280'));
const H = Number(arg('height', '800'));
const PORT = Number(arg('port', String(9300 + Math.floor(Math.random() * 600))));
// --mobile: a phone, properly -- device pixel ratio, touch points and a phone user agent, not
// just a narrow window. The CSS is keyed on width, but `hover: none` and `pointer: coarse` are
// not, and the app asks about touch.
const MOBILE = process.argv.includes('--mobile');
// --shot=out.png: a PNG of the page after the script has run, WebGL canvas included.
const SHOT = arg('shot', '');
// --cpuprofile=out.json: a CPU profile of the page while the script runs, plus a self-time
// summary on stderr. What blocks the main thread is JavaScript, so this is meaningful even
// though headless renders in software.
const CPUPROFILE = arg('cpuprofile', '');
const DPR = Number(arg('dpr', MOBILE ? '3' : '1'));
// --block=celestrak.org[,other.host]: refuse those requests inside the page. Every boot of the app
// asks CelesTrak for five files, CelesTrak allows each file once per IP per two hours, and a day of
// headless measurement ends in its hard 403 (2026-09-17 and again 2026-09-22). Blocking it here
// means a probe that is not ABOUT live data does not spend the budget the next real visit needs --
// the app then behaves exactly as it does when CelesTrak says no, which is itself worth testing.
const BLOCK = arg('block', '').split(',').map((h) => h.trim()).filter(Boolean);
const trace = (m) => { if (process.env.CDP_TRACE) process.stderr.write('[cdp] ' + m + '\n'); };

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = mkdtempSync(join(tmpdir(), 'cdp-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile,
  '--window-size=' + W + ',' + H, '--hide-scrollbars', '--mute-audio',
  // No GPU in headless: SwiftShader is a software GL that still runs the real three.js pipeline.
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--no-first-run', '--no-default-browser-check',
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeErr = '';
chrome.stderr.on('data', (d) => { chromeErr += d; });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function version() {
  for (let i = 0; i < 600; i++) {
    try { const r = await fetch('http://127.0.0.1:' + PORT + '/json/version'); if (r.ok) return r.json(); } catch {}
    await sleep(100);
  }
  throw new Error('chrome never opened the debugging port\n' + chromeErr.slice(-800));
}

let id = 0;
const pending = new Map();
function send(ws, method, params, sessionId) {
  const msgId = ++id;
  const msg = { id: msgId, method, params: params || {} };
  if (sessionId) msg.sessionId = sessionId;
  ws.send(JSON.stringify(msg));
  return new Promise((res, rej) => pending.set(msgId, { res, rej }));
}

try {
  trace('launching');
  const v = await version();
  trace('port open');
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = (e) => j(new Error('ws: ' + (e.message || 'failed'))); });
  const logs = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) rej(new Error(m.error.message + ' ' + (m.error.data || '')));
      else res(m.result);
      return;
    }
    if (m.method === 'Runtime.consoleAPICalled') logs.push('[' + m.params.type + '] ' + m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '));
    if (m.method === 'Runtime.exceptionThrown') logs.push('[pageerror] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  };
  const { targetId } = await send(ws, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send(ws, 'Target.attachToTarget', { targetId, flatten: true });
  trace('attached');
  await send(ws, 'Page.enable', {}, sessionId);
  await send(ws, 'Runtime.enable', {}, sessionId);
  await send(ws, 'Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: MOBILE, screenWidth: W, screenHeight: H }, sessionId);
  if (MOBILE) {
    await send(ws, 'Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
    await send(ws, 'Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36',
      platform: 'Android',
      userAgentMetadata: { platform: 'Android', platformVersion: '14', architecture: '', model: 'Pixel 8', mobile: true, brands: [{ brand: 'Chromium', version: '153' }], fullVersion: '153.0.0.0' },
    }, sessionId);
  }
  if (BLOCK.length) {
    await send(ws, 'Network.enable', {}, sessionId);
    await send(ws, 'Network.setBlockedURLs', { urls: BLOCK.map((h) => `*${h}*`) }, sessionId);
    trace('blocking ' + BLOCK.join(', '));
  }
  await send(ws, 'Page.navigate', { url }, sessionId);
  trace('navigated');

  if (CPUPROFILE) {
    await send(ws, 'Profiler.enable', {}, sessionId);
    await send(ws, 'Profiler.setSamplingInterval', { interval: 200 }, sessionId);
    await send(ws, 'Profiler.start', {}, sessionId);
  }
  const body = readFileSync(scriptPath, 'utf8');
  trace('evaluating');
  const r = await send(ws, 'Runtime.evaluate', {
    expression: '(async () => {\n' + body + '\n})()',
    awaitPromise: true, returnByValue: true,
  }, sessionId);
  trace('done');
  if (CPUPROFILE) {
    const { profile } = await send(ws, 'Profiler.stop', {}, sessionId);
    writeFileSync(CPUPROFILE, JSON.stringify(profile));
    // Self time per function: the profile is samples plus the time between them.
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const self = new Map();
    const total = (profile.endTime - profile.startTime) / 1000;
    for (let i = 0; i < profile.samples.length; i += 1) {
      const dt = (profile.timeDeltas[i] || 0) / 1000;
      const n = byId.get(profile.samples[i]);
      if (!n) continue;
      const f = n.callFrame;
      const where = (f.url || '').split('/').slice(-2).join('/').split('?')[0];
      const key = `${f.functionName || '(anonymous)'} ${where}${f.lineNumber >= 0 ? ':' + (f.lineNumber + 1) : ''}`;
      self.set(key, (self.get(key) || 0) + dt);
    }
    const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 18);
    console.error(`--- cpu profile: ${total.toFixed(0)} ms wall, top self time ---`);
    for (const [k, ms] of top) console.error(`${ms.toFixed(0).padStart(7)} ms  ${(100 * ms / total).toFixed(1).padStart(5)} %  ${k}`);
  }
  if (SHOT) {
    const shot = await send(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
    writeFileSync(SHOT, Buffer.from(shot.data, 'base64'));
    trace('wrote ' + SHOT);
  }
  if (r.exceptionDetails) {
    console.error('PAGE THREW:', r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    if (logs.length) console.error(logs.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(r.result.value, null, 2));
    if (process.env.CDP_LOGS && logs.length) console.error('--- console ---\n' + logs.join('\n'));
  }
} catch (e) {
  console.error('DRIVER FAILED:', e.message);
  process.exitCode = 1;
} finally {
  chrome.kill('SIGKILL');
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
  await new Promise((r) => process.stdout.write('', r));
  process.exit(process.exitCode || 0);
}
