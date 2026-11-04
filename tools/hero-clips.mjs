// A short clip of each deep-space hero, to catch motion defects that one still cannot show (internal #779, the
// package's runbook item: "a 5-10 s clip per hero"). The picture a frame at a time from a headless Chrome on the
// film clock of tools/render-trip.mjs (`?render=1&clock=1`, site/js/ui/rendermode.js createFilmClock), so a slow
// machine changes how long this takes and nothing about what is in a frame.
//
//   node tools/hero-clips.mjs <hero id | all> [--seconds=6] [--fps=30] [--every=3] [--res=960x540]
//        [--out=out/hero-clips] [--gl=swiftshader|gpu] [--base=http://127.0.0.1:8830] [--port=8830]
//   node tools/hero-clips.mjs --help
//
//   out/hero-clips/<hero>/0000.jpg ...   every `--every`-th frame of the clip
//   out/hero-clips/<hero>/<hero>.mp4     only where `ffmpeg` is on the PATH (or FFMPEG=<path>); nothing is installed
//   out/hero-clips/<hero>/clip.json      one row a frame (camera distance and angles, the hero's level, march steps and share,
//                                        the renderer's calls and triangles) and the defects found in them
//   out/hero-clips/summary.json          every hero's defects in one file
//
// WHAT IS FILMED. The hero's own arrival, as a visitor gets it: the record selected (the app's flight, skipped over
// by moving the film clock past it), the camera put at three times the arrival distance, then ONE flight on the film
// clock to a third of it while turning 40 degrees, for `--seconds`. The sky is held at one instant (2026-10-15
// 12:00 UTC, as the heroes probe holds it) and `?look=1` freezes the deep sky's gas and seeds the dice (scene/perf.js).
//
// WHAT IS A DEFECT (clip.json `defects`, and the exit code is 1 when any hero has one):
//   pop       the camera's distance or angle moves more than five times what its neighbours (four frames either side) move,
//             and by more than a small step: an ease in, an ease out or a hold is not a pop; one frame that leaps is
//   flicker   the hero's level goes up and down more than twice in the clip
//   jump      the hero's share of the picture changes by more than 0.35 between two frames
//   absent    the hero never reached level 2 in the clip (nothing was filmed of it)
// A defect is a place to look at the frames, not a verdict: a flight that ends is not a pop, and the thresholds are
// in this file (THRESHOLDS) for that reason.
//
// NOTHING BUT OUR OWN FILES: every request to another host is refused, so the frames do not depend on what a server
// answered that minute. No post-processing, no render target, nothing added to the page: it reads what the app says.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n, d) => { const h = args.find((a) => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
const USAGE = `usage: node tools/hero-clips.mjs <hero id | all> [--seconds=6] [--fps=30] [--every=3] [--res=960x540]
         [--out=out/hero-clips] [--gl=swiftshader|gpu] [--base=<url of a served site>] [--port=8830]
  A clip of a deep-space hero's arrival on the film clock, frames and a row a frame, and the defects found.
  Chrome is /Applications/Google Chrome.app unless CHROME is set; ffmpeg joins the frames only if it is on the PATH.`;

/** The numbers a clip is judged by. Pure: `rows` in, defect names out. */
export const THRESHOLDS = { popFactor: 5, popMinStep: 0.002, popWindow: 4, flickerTurns: 2, shareJump: 0.35, level: 2 };
export function defectsOf(rows, t = THRESHOLDS) {
  const out = [];
  const steps = (key) => rows.slice(1).map((r, i) => Math.abs(r[key] - rows[i][key]));
  const median = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  for (const [key, name] of [['logDistance', 'distance'], ['azimuth', 'azimuth'], ['polar', 'polar']]) {
    const s = steps(key);
    let worst = -1; let ref = 0;
    for (let i = 0; i < s.length; i += 1) {
      const near = s.slice(Math.max(0, i - t.popWindow), i).concat(s.slice(i + 1, i + 1 + t.popWindow));
      const m = median(near);
      if (s[i] > t.popMinStep && s[i] > t.popFactor * m && (worst < 0 || s[i] > s[worst])) { worst = i; ref = m; }
    }
    if (worst >= 0) out.push({ defect: 'pop', what: name, frame: worst + 1, step: s[worst], neighbours: ref });
  }
  let turns = 0; let dir = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const d = Math.sign(rows[i].level - rows[i - 1].level);
    if (d !== 0) { if (dir !== 0 && d !== dir) turns += 1; dir = d; }
  }
  if (turns > t.flickerTurns) out.push({ defect: 'flicker', what: 'level', turns });
  for (let i = 1; i < rows.length; i += 1) {
    const d = Math.abs(rows[i].share - rows[i - 1].share);
    if (d > t.shareJump) { out.push({ defect: 'jump', what: 'share', frame: i, step: d }); break; }
  }
  if (!rows.some((r) => r.level >= t.level)) out.push({ defect: 'absent', what: 'the hero never reached level ' + t.level });
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (args.includes('--help') || args.includes('-h') || !args.find((a) => !a.startsWith('--'))) {
    console.log(USAGE);
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 2);
  }
  await main();
}

async function main() {
  const which = args.find((a) => !a.startsWith('--'));
  const { HEROES } = await import('../site/js/scene/deep/heroes.js');
  const shipped = [];
  for (const h of HEROES) {
    const p = h.stub || (await h.profile()).HERO;
    if (p && p.shipped === true) shipped.push(h);
  }
  const picked = which === 'all' ? shipped : shipped.filter((h) => h.id === which);
  if (!picked.length) {
    console.error(`no shipped hero called "${which}". Heroes: ${shipped.map((h) => h.id).join(', ')}`);
    process.exit(2);
  }
  const SECONDS = Math.min(10, Math.max(5, Number(arg('seconds', '6')) || 6));
  const FPS = Number(arg('fps', '30'));
  const EVERY = Math.max(1, Number(arg('every', '3')) || 3);
  const [W, H] = arg('res', '960x540').split('x').map(Number);
  const OUT = resolve(arg('out', join(ROOT, 'out', 'hero-clips')));
  const GL = arg('gl', 'swiftshader');
  const PORT = Number(arg('port', String(8830 + Math.floor(Math.random() * 20))));
  const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const FFMPEG = process.env.FFMPEG || 'ffmpeg';
  const AT = Date.UTC(2026, 9, 15, 12, 0, 0);
  const log = (m) => process.stderr.write(`[clips ${new Date().toISOString().slice(11, 19)}] ${m}\n`);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let base = arg('base', '');
  const server = base ? null : spawn('python3', [join(ROOT, 'tools', 'serve.py'), join(ROOT, 'site'), String(PORT)], { stdio: 'ignore' });
  if (!base) base = `http://127.0.0.1:${PORT}`;
  const profile = mkdtempSync(join(tmpdir(), 'hero-clips-'));
  const debugPort = 9300 + Math.floor(Math.random() * 600);
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile, `--window-size=${W},${H}`,
    '--hide-scrollbars', '--mute-audio',
    ...(GL === 'gpu' ? ['--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--no-first-run', '--no-default-browser-check', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const cleanup = () => {
    try { chrome.kill('SIGKILL'); } catch { /* gone */ }
    if (server) { try { server.kill('SIGKILL'); } catch { /* gone */ } }
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* in use */ }
  };
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });

  const summary = [];
  try {
    let version = null;
    for (let i = 0; i < 600 && !version; i += 1) {
      try { const r = await fetch(`http://127.0.0.1:${debugPort}/json/version`); if (r.ok) version = await r.json(); } catch { /* not yet */ }
      if (!version) await sleep(100);
    }
    if (!version) throw new Error('chrome never opened the debugging port');
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error('the debugging socket did not open')); });
    let id = 0; let sessionId = null;
    const pending = new Map();
    const logs = [];
    const send = (method, params) => {
      const msgId = ++id;
      ws.send(JSON.stringify({ id: msgId, method, params: params || {}, ...(sessionId ? { sessionId } : {}) }));
      return new Promise((res, rej) => pending.set(msgId, { res, rej }));
    };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id);
        pending.delete(m.id);
        if (m.error) rej(new Error(m.error.message)); else res(m.result);
        return;
      }
      if (m.method === 'Fetch.requestPaused') {
        const u = m.params.request.url;
        const ours = u.startsWith(base + '/') || /^(data|blob|about):/.test(u);
        send(ours ? 'Fetch.continueRequest' : 'Fetch.failRequest', ours ? { requestId: m.params.requestId } : { requestId: m.params.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
        return;
      }
      if (m.method === 'Runtime.exceptionThrown') logs.push('[pageerror] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    };
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('the page threw: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + (logs.length ? '\n' + logs.slice(-6).join('\n') : ''));
      return r.result.value;
    };

    await send('Page.navigate', { url: `${base}/?render=1&clock=1&look=1&sw=0&tier=2&fps=${FPS}&at=${AT}` });
    // The film clock moves only when asked: the page is brought up by asking, a frame at a time, until it says it is ready.
    await evaluate(`(async () => {
      for (let i = 0; i < 4000 && !(window.__srRender && window.__srRender.film && window.__srLayersReady && window.spaceRadar); i += 1) {
        if (window.__srRender && window.__srRender.film) await window.__srRender.film.advance(); else await new Promise((r) => setTimeout(r, 50));
      }
      if (!(window.__srRender && window.spaceRadar && window.__srLayersReady)) throw new Error('the page never became ready on the film clock');
      const sr = window.spaceRadar; const film = window.__srRender.film;
      // Nothing but the scene is filmed: the shell, the card and the toasts are hidden, as render-trip.mjs does (ui/rendermode.js STYLE).
      const hide = document.createElement('style');
      hide.textContent = 'body > *:not(.sr-scene):not(#labels):not(#sr-hud) { visibility: hidden !important; } #boot { display: none !important; }';
      document.head.appendChild(hide);
      const until = async (fn, frames) => { for (let i = 0; i < frames; i += 1) { if (fn()) return true; await film.advance(); } return !!fn(); };
      window.__clip = {
        until,
        async prepare(recId, heroId) {
          sr.clock.goTo(${AT}); sr.clock.setPaused(true);
          if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit();
          if (!(await until(() => !!sr.recordById(recId), 900))) throw new Error('no record ' + recId);
          if (sr.wantDeep) await sr.wantDeep();
          const r = sr.recordById(recId);
          if (r.layer && !sr.isLayerOn(r.layer)) sr.setLayerOn(r.layer, true);
          sr.select(r, { fly: true, undo: false });
          // The app's own flight is not the clip: move the film clock past it, then draw a few frames.
          const t = film.time; t.jumpTo(t.now() + 90000, t.dateNow() + 90000);
          for (let i = 0; i < 6; i += 1) await film.advance();
          const rig = sr.cameraRig;
          const d0 = rig.state.distance;
          rig.flyTo({ distance: d0 * 3, ms: 0 });
          for (let i = 0; i < 6; i += 1) await film.advance();
          await until(() => !sr.deep || !sr.deep.ready || sr.deep.ready(), 300);
          window.__clip.d0 = d0; window.__clip.recId = recId; window.__clip.heroId = heroId;
          return { d0, stage: sr.stage.worldId };
        },
        begin(ms) {
          const rig = sr.cameraRig;
          rig.flyTo({ distance: window.__clip.d0 * 0.35, azimuth: rig.state.azimuth + 40 * Math.PI / 180, polar: rig.state.polar, ms });
        },
        async frame() {
          await film.advance();
          const rig = sr.cameraRig; const info = sr.renderer.info;
          let level = 0; let loaded = false; let steps = 0;
          try { const h = (sr.deep.stats().heroes || []).find((x) => x.id === window.__clip.heroId); if (h) { level = h.level; loaded = !!h.loaded; steps = h.steps || 0; } } catch { /* older */ }
          let share = 0;
          try { share = sr.deep.heroShareOf(window.__clip.recId) || 0; } catch { /* older */ }
          return { distance: rig.state.distance, logDistance: Math.log(rig.state.distance), azimuth: rig.state.azimuth, polar: rig.state.polar,
            level, loaded, steps, share: Math.round(share * 1000) / 1000, calls: info.render.calls, triangles: info.render.triangles, pending: film.pending() };
        },
      };
      return true;
    })()`);
    log('the page is ready on the film clock');

    const frames = Math.round(SECONDS * FPS);
    for (const hero of picked) {
      const dir = join(OUT, hero.id);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      const prep = await evaluate(`window.__clip.prepare(${JSON.stringify(hero.record)}, ${JSON.stringify(hero.id)})`);
      log(`${hero.id}: arrival distance ${prep.d0.toPrecision(3)} units on the ${prep.stage} stage; filming ${frames} frames`);
      await evaluate(`window.__clip.begin(${SECONDS * 1000})`);
      const rows = [];
      let shots = 0;
      for (let i = 0; i < frames; i += 1) {
        const row = await evaluate('window.__clip.frame()');
        rows.push({ n: i, ...row });
        if (i % EVERY === 0) {
          const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90, captureBeyondViewport: false, optimizeForSpeed: true });
          writeFileSync(join(dir, String(shots).padStart(4, '0') + '.jpg'), Buffer.from(shot.data, 'base64'));
          shots += 1;
        }
      }
      const defects = defectsOf(rows);
      writeFileSync(join(dir, 'clip.json'), JSON.stringify({ hero: hero.id, record: hero.record, seconds: SECONDS, fps: FPS, every: EVERY, at: new Date(AT).toISOString(), arrival: prep, defects, rows }, null, 1));
      let video = null;
      const probe = spawnSync(FFMPEG, ['-version'], { stdio: 'ignore' });
      if (probe.status === 0) {
        const file = join(dir, hero.id + '.mp4');
        const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', String(FPS / EVERY), '-i', join(dir, '%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', file], { stdio: 'inherit' });
        if (r.status === 0 && existsSync(file)) video = file;
      }
      summary.push({ hero: hero.id, frames: rows.length, shots, video, defects });
      log(`${hero.id}: ${rows.length} frames, ${shots} pictures${video ? ', ' + video : ' (no ffmpeg on the PATH: the pictures are the clip)'}, ${defects.length ? 'defects: ' + defects.map((d) => d.defect + ' ' + (d.what || '')).join('; ') : 'no defect found'}`);
    }
    writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
  } finally {
    cleanup();
  }
  if (summary.some((s) => s.defects.length)) process.exitCode = 1;
}
