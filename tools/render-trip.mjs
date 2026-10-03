// Render a trip as a video for YouTube: the picture a frame at a time from a headless Chrome, the
// voice and the music laid under it, and the files an upload needs (spec 0070).
//
//   node tools/render-trip.mjs <trip> [--res=1920x1080] [--fps=30] [--out=out]
//        [--captions] [--stops=N] [--gl=gpu|swiftshader] [--format=jpeg|png] [--crf=18]
//        [--at=<ISO time>] [--thumb-stop=<stop id>] [--ui-scale=1.5] [--base=http://127.0.0.1:8830] [--port=8830] [--live]
//        [--fresh] [--frames-only] [--keep-frames]
//
//   out/<trip>.mp4               H.264 yuv420p + AAC, -14 LUFS
//   out/<trip>.srt, .vtt         the narration's captions on the film's clock
//   out/<trip>.chapters.txt      YouTube chapter lines
//   out/<trip>.description.txt   title, link, chapters, sources and credits
//   out/<trip>.thumb.jpg         1280 x 720
//   out/<trip>.json              the cue sheet, the timings and what was measured
//   out/.cache/<trip>-<res>-<fps>/   the frames; a stopped render goes on from the last one
//
// HOW. The page does the hard part: `?render=1` (site/js/ui/rendermode.js) runs the app on a clock
// that moves only when this file asks for the next frame, and answers when that frame is drawn and
// nothing in it is still loading. So this is a loop: ask for frame n, photograph the page, write
// the file. The machine's speed changes how long a render takes and nothing about what is in it.
//
// THE DRIVER is tools/cdp.mjs's recipe (a target made at about:blank, attached, then navigated:
// that file says why each other way failed), kept open for thousands of calls instead of one.
//
// A REAL GPU BY DEFAULT. tools/cdp.mjs forces SwiftShader because its probes must draw the same on
// every machine; a film wants the fastest correct picture, and headless Chrome on this Mac gets
// the Intel GPU through ANGLE's Metal backend when nothing forces software (measured 2026-10-03).
// `--gl=swiftshader` is the fallback for a machine with no GPU: the same frames, far slower.
//
// NOTHING BUT OUR OWN FILES unless --live: every request to another host is refused. Two reasons.
// A film whose frames depend on what NASA's cloud server answered that minute is not the same
// film twice, and a render resumed after a stop would change its weather half way. And a day of
// headless boots ends in CelesTrak's 403 (tools/cdp.mjs says so). The trip's satellites then come
// from the saved copy, site/data/v1/ -- a checkout has none, so copy the live one first
// (tools/README.md has the command) -- and the Earth wears its static clouds, not today's.
//
// RESUMABLE. The frames are files; the instant frame 0 is computed for is written beside them
// (cache.json) and handed back to the page on the next run, which replays the frames already on
// disc without photographing them and carries on.
//
// NOTHING IS UPLOADED. The files are for a person to upload by hand.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOURS } from '../site/js/data/tours.js';
import { NARRATION } from '../site/js/data/narration.js';
import { AUDIO } from '../site/js/data/audio.js';
import { parseVtt, holdFor, clipKey } from '../site/js/audio/narration.js';
import {
  timeline, chapters, chaptersText, captions, srtText, vttText, bedSegments, voiceSpans, audioGraph,
  descriptionText, frameName, resumeFrom, thumbFrame, TARGET_LUFS, TARGET_TP,
} from './render-trip.lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const args = process.argv.slice(2);
const tripId = args.find((a) => !a.startsWith('--'));
const flag = (n) => args.includes('--' + n);
const arg = (n, d) => { const h = args.find((a) => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
const tour = TOURS.find((t) => t.id === tripId);
if (!tour) {
  console.error('usage: node tools/render-trip.mjs <trip> [--res=1920x1080] [--fps=30] [--out=out] [--captions] [--stops=N] [--gl=gpu|swiftshader]');
  console.error('trips: ' + TOURS.map((t) => t.id).join(', '));
  process.exit(2);
}
const [W, H] = arg('res', '1920x1080').split('x').map(Number);
const FPS = Number(arg('fps', '30'));
const OUT = resolve(arg('out', join(ROOT, 'out')));
const GL = arg('gl', 'gpu');
const FORMAT = arg('format', 'jpeg') === 'png' ? 'png' : 'jpeg';
const EXT = FORMAT === 'png' ? 'png' : 'jpg';
const CRF = arg('crf', '18');
const CAPTIONS = flag('captions');
const STOPS = Number(arg('stops', '0'));
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(arg('port', String(8830 + Math.floor(Math.random() * 20))));
const BASE = arg('base', '');
// --at=2026-10-03T18:00:00Z: the instant frame 0 is computed for (default: now). The same instant,
// the same data and the same machine give the same frames.
const AT = arg('at', '') ? (Number(arg('at', '')) || Date.parse(arg('at', ''))) : 0;
// The thumbnail's stop: the closest shot the trip has (the subject large, and in this app's
// framing dark sky beside it for the words), or the first stop when no stop names a distance.
const closest = tour.stops.filter((s) => Number(s.distance_km) > 0).sort((a, b) => a.distance_km - b.distance_km)[0];
const THUMB_STOP = arg('thumb-stop', (closest || tour.stops[0]).id);
// --ui-scale=1.5: the page is laid out 1280 x 720 and drawn at 1.5 device pixels, so the picture is
// still 1920 x 1080 and the app's own 13 px labels and HUD tag are 20 px of it: the size they are
// read at on a laptop, which a 1080p video watched on a phone otherwise shrinks to nothing.
const UI_SCALE = Number(arg('ui-scale', '1.5')) || 1;
const CSS_W = Math.round(W / UI_SCALE);
const CSS_H = Math.round(H / UI_SCALE);
const variant = `${tripId}-${W}x${H}-${FPS}${UI_SCALE !== 1.5 ? '-x' + UI_SCALE : ''}${CAPTIONS ? '-cc' : ''}${STOPS ? '-s' + STOPS : ''}`;
const CACHE = join(OUT, '.cache', variant);
const log = (m) => process.stderr.write(`[render ${new Date().toISOString().slice(11, 19)}] ${m}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ the frames on disc
if (flag('fresh')) rmSync(CACHE, { recursive: true, force: true });
mkdirSync(CACHE, { recursive: true });
const cacheFile = join(CACHE, 'cache.json');
const sheetFile = join(CACHE, 'sheet.json');
let cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : null;
let sheet = existsSync(sheetFile) ? JSON.parse(readFileSync(sheetFile, 'utf8')) : null;
const thumbSrc = join(CACHE, 'thumb.png');
const started = Date.now();
let renderSeconds = cache && cache.renderSeconds ? cache.renderSeconds : 0;

async function render() {
  const have = resumeFrom(readdirSync(CACHE), EXT);
  // Frame 0's instant: this run's, or the one the frames on disc were computed for.
  const epochMs = cache ? cache.epochMs : AT || Math.floor(Date.now() / 1000) * 1000;
  if (!cache) { cache = { trip: tripId, epochMs, w: W, h: H, fps: FPS, renderSeconds: 0 }; writeFileSync(cacheFile, JSON.stringify(cache)); }
  if (have) log(`${have} frames on disc: replaying them, then carrying on`);

  let server = null;
  let base = BASE;
  if (!base) {
    server = spawn('python3', [join(ROOT, 'tools', 'serve.py'), SITE, String(PORT)], { stdio: 'ignore' });
    base = `http://127.0.0.1:${PORT}`;
  }
  const profile = mkdtempSync(join(tmpdir(), 'render-'));
  const debugPort = 9300 + Math.floor(Math.random() * 600);
  const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profile,
    `--window-size=${CSS_W},${CSS_H}`, '--hide-scrollbars', '--mute-audio',
    ...(GL === 'swiftshader' ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--ignore-gpu-blocklist']),
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--no-first-run', '--no-default-browser-check',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let chromeErr = '';
  chrome.stderr.on('data', (d) => { chromeErr = (chromeErr + d).slice(-4000); });
  const cleanup = () => {
    try { chrome.kill('SIGKILL'); } catch { /* gone */ }
    if (server) { try { server.kill('SIGKILL'); } catch { /* gone */ } }
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* in use */ }
  };
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });

  try {
    let version = null;
    for (let i = 0; i < 600 && !version; i += 1) {
      try { const r = await fetch(`http://127.0.0.1:${debugPort}/json/version`); if (r.ok) version = await r.json(); } catch { /* not yet */ }
      if (!version) await sleep(100);
    }
    if (!version) throw new Error('chrome never opened the debugging port\n' + chromeErr.slice(-800));
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = (e) => j(new Error('ws: ' + (e.message || 'failed'))); });
    let id = 0;
    const pending = new Map();
    const logs = [];
    const refused = new Set();
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pending.has(m.id)) {
        const { res, rej } = pending.get(m.id);
        pending.delete(m.id);
        if (m.error) rej(new Error(m.error.message + ' ' + (m.error.data || '')));
        else res(m.result);
        return;
      }
      if (m.method === 'Fetch.requestPaused') {
        const u = m.params.request.url;
        const ours = u.startsWith(base + '/') || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:');
        if (!ours) refused.add(new URL(u).host);
        send(ours ? 'Fetch.continueRequest' : 'Fetch.failRequest', ours ? { requestId: m.params.requestId } : { requestId: m.params.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
        return;
      }
      if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) logs.push('[' + m.params.type + '] ' + m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 300));
      if (m.method === 'Runtime.exceptionThrown') logs.push('[pageerror] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    };
    let sessionId = null;
    const send = (method, params) => {
      const msgId = ++id;
      const msg = { id: msgId, method, params: params || {} };
      if (sessionId) msg.sessionId = sessionId;
      ws.send(JSON.stringify(msg));
      return new Promise((res, rej) => pending.set(msgId, { res, rej }));
    };
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    ({ sessionId } = await send('Target.attachToTarget', { targetId, flatten: true }));
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: CSS_W, height: CSS_H, deviceScaleFactor: UI_SCALE, mobile: false, screenWidth: CSS_W, screenHeight: CSS_H });
    // Only this machine answers (see NOTHING BUT OUR OWN FILES, above); --live lets the page out.
    if (!flag('live')) await send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('the page threw: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + (logs.length ? '\n' + logs.slice(-12).join('\n') : ''));
      return r.result.value;
    };
    const shoot = async (format) => {
      const shot = await send('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: 95 } : {}), captureBeyondViewport: false, optimizeForSpeed: true });
      return Buffer.from(shot.data, 'base64');
    };

    // `tier=2`: the sharpest maps, which headless Chrome would otherwise not be given (main.js).
    const q = `render=1&fps=${FPS}&at=${epochMs}&tier=2${CAPTIONS ? '&captions=1' : ''}${STOPS ? '&stops=' + STOPS : ''}`;
    const url = `${base}/?${q}#trip=${tripId}`;
    log(`opening ${url}`);
    await send('Page.navigate', { url });
    // The module is imported by boot(); until it is, there is nothing to await.
    for (let i = 0; ; i += 1) {
      const state = await evaluate('(() => { const r = window.__srRender; return r ? (r.ready ? "ready" : "installed") : (document.getElementById("boot") && document.getElementById("boot").classList.contains("boot-failed") ? "failed: " + document.getElementById("boot-sub").textContent : "") })()');
      if (state === 'ready') break;
      if (String(state).startsWith('failed')) throw new Error('the app did not boot: ' + state);
      if (i > 1200) throw new Error('render mode never installed' + (logs.length ? '\n' + logs.slice(-12).join('\n') : ''));
      await sleep(100);
    }
    const gpu = await evaluate(`(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl && gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
    log(`drawing with ${gpu}`);
    const first = await evaluate('window.__srRender.ready.then(() => window.__srRender.describe())');
    log(`ready: "${first.title}", frame 0 is ${new Date(first.epochMs).toISOString()}`);

    const thumbStop = tour.stops.find((s) => s.id === THUMB_STOP) || tour.stops[0];
    const thumbHold = Math.max(thumbStop.dwell_ms || 0, holdFor(Number(NARRATION.clips[clipKey(tripId, thumbStop.id)]) || 0));
    let thumbAt = null;
    let n = 0;
    let lastLog = Date.now();
    const t0 = Date.now();
    for (;;) {
      const r = await evaluate(`window.__srRender.frame(${n})`);
      if (n >= have) {
        writeFileSync(join(CACHE, frameName(n, EXT)), await shoot(FORMAT));
      }
      if (thumbAt === null) {
        const s = await evaluate(`(() => { const s = window.__srRender.stops.find((x) => x.id === ${JSON.stringify(thumbStop.id)}); return s ? s.arriveFrame : null; })()`);
        if (s !== null) thumbAt = thumbFrame({ arriveFrame: s }, FPS, thumbHold);
      }
      if (n === thumbAt && (n >= have || !existsSync(thumbSrc))) {
        await evaluate('window.__srRender.thumb(true)');
        writeFileSync(thumbSrc, await shoot('png'));
        await evaluate('window.__srRender.thumb(false)');
      }
      if (Date.now() - lastLog > 30000) {
        lastLog = Date.now();
        const made = Math.max(1, n + 1 - have);
        log(`frame ${n}${r.totalFrames ? '/' + r.totalFrames : ''} (${r.phase}${r.stopId ? ' ' + r.stopId : ''}), ${((Date.now() - t0) / 1000 / made).toFixed(2)} s a frame`);
        cache.renderSeconds = renderSeconds + (Date.now() - t0) / 1000;
        writeFileSync(cacheFile, JSON.stringify(cache));
      }
      if (r.done) break;
      n += 1;
      if (n > FPS * 3600) throw new Error('an hour of film and no end: the trip is not finishing');
    }
    sheet = await evaluate('window.__srRender.describe()');
    writeFileSync(sheetFile, JSON.stringify(sheet, null, 1));
    renderSeconds += (Date.now() - t0) / 1000;
    cache.renderSeconds = renderSeconds;
    cache.gpu = gpu;
    writeFileSync(cacheFile, JSON.stringify(cache));
    if (refused.size) log(`refused, as asked: ${[...refused].join(', ')}`);
    log(`${sheet.totalFrames} frames in ${Math.round(renderSeconds)} s${logs.length ? `; the page said ${logs.length} thing(s), the last: ${logs[logs.length - 1]}` : ''}`);
  } finally {
    cleanup();
  }
}

function ffmpeg(argv, { capture = false } = {}) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-y', ...argv], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 && !capture) throw new Error(`ffmpeg ${argv.slice(0, 6).join(' ')} ... failed:\n${String(r.stderr).slice(-1500)}`);
  return String(r.stderr || '');
}

function encode() {
  const tl = timeline(sheet);
  mkdirSync(OUT, { recursive: true });
  const stem = join(OUT, tripId + (STOPS ? `.first${STOPS}` : ''));
  const video = join(CACHE, 'video.mp4');
  const audio = join(CACHE, 'audio.wav');

  // Chrome's JPEG is full-range BT.601; YouTube wants limited-range BT.709, said in the stream.
  log('encoding the picture');
  ffmpeg([
    '-framerate', String(FPS), '-start_number', '0', '-i', join(CACHE, 'f%06d.' + EXT), '-frames:v', String(tl.frames),
    '-vf', `scale=${W}:${H}:in_range=full:out_range=tv:${FORMAT === 'jpeg' ? 'in_color_matrix=bt601:' : ''}out_color_matrix=bt709,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF, '-profile:v', 'high', '-bf', '2', '-g', String(Math.round(FPS / 2)),
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
    '-movflags', '+faststart', video,
  ]);

  log('mixing the sound');
  const bedOf = (rung) => AUDIO.find((a) => a.kind === 'bed' && a.stage === rung) || AUDIO.find((a) => a.kind === 'bed');
  const beds = bedSegments(tl).map((b) => ({ ...b, row: bedOf(b.rung) }));
  const plan = audioGraph({
    clips: tl.stops.filter((s) => s.clip).map((s) => ({ file: join(SITE, NARRATION.base, tripId, s.id + '.opus'), at: s.clip.start })),
    beds: beds.map((b) => ({ file: join(SITE, b.row.file), start: b.start, end: b.end })),
    spans: voiceSpans(tl),
    duration: tl.duration,
  });
  // Two passes: the first measures the mix, the second moves it to -14 LUFS knowing what it is.
  const norm = `loudnorm=I=${TARGET_LUFS}:TP=${TARGET_TP}:LRA=11`;
  const pass1 = ffmpeg([...plan.inputs, '-filter_complex', `${plan.filter};[mix]${norm}:print_format=json[out]`, '-map', '[out]', '-f', 'null', '-']);
  const m = JSON.parse(pass1.slice(pass1.lastIndexOf('{'), pass1.lastIndexOf('}') + 1));
  const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  ffmpeg([...plan.inputs, '-filter_complex', `${plan.filter};[mix]${norm}:${measured},aresample=48000[out]`, '-map', '[out]', '-c:a', 'pcm_s16le', audio]);

  log('putting them together');
  ffmpeg(['-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-shortest', '-movflags', '+faststart', stem + '.mp4']);

  // What was made, measured from the file itself.
  const probe = ffmpeg(['-i', stem + '.mp4', '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { capture: true });
  const lufs = (/Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/.exec(probe) || [])[1];
  const peak = (/True peak:\s+Peak:\s+(-?[\d.]+) dBFS/.exec(probe) || [])[1];
  const dur = (/Duration: ([\d:.]+)/.exec(probe) || [])[1];

  const cuesByStop = {};
  for (const s of tl.stops) {
    const f = join(SITE, NARRATION.base, tripId, s.id + '.vtt');
    cuesByStop[s.id] = existsSync(f) ? parseVtt(readFileSync(f, 'utf8')) : [];
  }
  const cues = captions(tl, cuesByStop);
  writeFileSync(stem + '.srt', srtText(cues));
  writeFileSync(stem + '.vtt', vttText(cues));
  const ch = chapters(tl);
  writeFileSync(stem + '.chapters.txt', chaptersText(ch));
  writeFileSync(stem + '.description.txt', descriptionText({
    tour, tl, truth: sheet.truth, voiceCredit: tl.stops.some((s) => s.clip) ? NARRATION.credit : '',
    bedCredits: [...new Set(beds.map((b) => b.row.credit))], url: `https://www.spaceradar.ai/#trip=${tripId}`,
  }));
  if (existsSync(thumbSrc)) ffmpeg(['-i', thumbSrc, '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '2', '-frames:v', '1', '-update', '1', stem + '.thumb.jpg']);
  const summary = {
    trip: tripId, title: tour.title, file: stem + '.mp4', bytes: statSync(stem + '.mp4').size, width: W, height: H, fps: FPS,
    frames: tl.frames, seconds: tl.duration, container: dur, lufs: Number(lufs), truePeakDb: Number(peak),
    renderSeconds: Math.round(renderSeconds), secondsPerFrame: Math.round((renderSeconds / tl.frames) * 100) / 100, gpu: cache && cache.gpu,
    computedFor: new Date(sheet.epochMs).toISOString(), chaptersValid: ch.valid, stops: tl.stops, beds: beds.map((b) => ({ rung: b.rung, start: b.start, end: b.end, credit: b.row.credit })),
  };
  writeFileSync(stem + '.json', JSON.stringify(summary, null, 1));
  log(`${stem}.mp4: ${tl.duration} s, ${(summary.bytes / 1e6).toFixed(1)} MB, ${lufs} LUFS, peak ${peak} dBTP`);
  if (!ch.valid) log('fewer than three chapters of ten seconds: YouTube will show none');
  if (!flag('keep-frames') && flag('clean')) rmSync(CACHE, { recursive: true, force: true });
  return summary;
}

try {
  const complete = sheet && sheet.done && resumeFrom(readdirSync(CACHE), EXT) >= sheet.totalFrames;
  if (!complete) await render();
  else log(`all ${sheet.totalFrames} frames are on disc`);
  if (!flag('frames-only')) console.log(JSON.stringify(encode(), null, 1));
  log(`done in ${Math.round((Date.now() - started) / 1000)} s`);
  process.exit(0);
} catch (e) {
  console.error('RENDER FAILED:', e.message);
  process.exit(1);
}
