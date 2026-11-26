// ui/mapapirecord.js -- the recording half of window.srMap (ui/mapapi.js, docs/PLUGINS.md): fetched on the first
// srMap.record.start() or srMap.record.frames(), never before.
//
// Contract: startLive(ctx, opts, win) -> { stop() -> Promise<Blob>, state() }   the map's canvas, as Record records it
//           createFrameEncoder(opts, win) -> { add(canvas, repeat?) -> Promise, done() -> Promise<Blob>, kind, width, height }
//           picture(ctx, opts, win) -> Promise<HTMLCanvasElement>   one still frame at any size, in tiles past the GPU's limit
// Pure, for tests/test_mapapi.mjs: SIZES, sizeFor(crop, size), cleanCredit(lines), sharpRatio(...), tilesFor(...)
//
// `corner: 'none'` records the scene alone (no lines in the corner); `sharp: true` raises the map's drawing buffer to the
// clip's own pixels for the length of the recording (a 4K clip of a 1440 px window is drawn at 4K, not stretched to it),
// as far as the GPU allows, and puts it back at stop(). A slow GPU then drops frames: MediaRecorder records in real time.
//
// LIVE is ui/recorder.js's live way, without its panel: after each render (main.js ctx.makeFrame, through the frame taps
// ui/makers.js runs) the map's canvas is cropped into a 2D canvas with the map's credit and the instant in the corner,
// and a script's own credit lines under them, and MediaRecorder records that canvas. FRAMES is the frame-by-frame way
// for a picture a script draws itself (a timelapse of satellite days): each canvas handed to add() is encoded with
// WebCodecs at its own timestamp into a WebM (ui/webm.js), so the clip plays at its frame rate however slowly it was
// drawn; where WebCodecs cannot encode, MediaRecorder is paced, a frame's time a frame. Nothing leaves the device.

import { outputSize, compose, cropRect, frameEncoder, pickMime, FPS, MAX_S } from './recorder.js';
import { muxWebm } from './webm.js';

export const SIZES = { 720: 720, 1080: 1080, 2160: 2160 };

/** The clip's size: the crop's shape at 720, 1080 or 2160 px on its short side, even numbers. Pure. */
export function sizeFor(crop, size) {
  const base = outputSize(crop, false); // 1080 on the short side
  const k = (SIZES[size] || 1080) / 1080;
  const w = Math.round(base.w * k), h = Math.round(base.h * k);
  return { w: w - (w % 2), h: h - (h % 2) };
}

/** At most three credit lines of at most 120 characters, plain text. Pure. */
export function cleanCredit(lines) {
  return (Array.isArray(lines) ? lines : [lines]).filter((l) => typeof l === 'string' && l.trim()).slice(0, 3).map((l) => l.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120));
}

/**
 * The pixel ratio that draws `W` x `H` of the crop from a `cssW` x `cssH` canvas, at most `maxBuf` device pixels on the
 * long side and 4 times the CSS pixels; null when `now` is already at least that sharp. Pure.
 */
export function sharpRatio(cssW, cssH, crop, W, H, maxBuf, now = 1) {
  if (!(cssW > 0 && cssH > 0 && W > 0 && H > 0)) return null;
  const r = cropRect(cssW, cssH, crop);
  let ratio = Math.max(W / r.sw, H / r.sh);
  if (maxBuf > 0) ratio = Math.min(ratio, maxBuf / Math.max(cssW, cssH));
  ratio = Math.min(4, ratio);
  return ratio > (now || 1) + 0.01 ? Math.round(ratio * 1000) / 1000 : null;
}

/**
 * A still `W` x `H` cut into tiles of at most `max` px a side, row by row: [{x, y, w, h}]. Pure.
 */
export function tilesFor(W, H, max) {
  const m = Math.max(256, Math.floor(max) || 4096);
  const out = [];
  for (let y = 0; y < H; y += m) for (let x = 0; x < W; x += m) out.push({ x, y, w: Math.min(m, W - x), h: Math.min(m, H - y) });
  return out;
}

/** The GPU's largest drawing buffer side, or 4096 when it does not say. */
function gpuMax(three) {
  try {
    const gl = three.getContext();
    return Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0]) || 4096;
  } catch { return 4096; }
}

/** Raise the drawing buffer for a sharp clip: {apply(), restore()} or null (scene/renderer.js resize(true) puts it back). */
function sharpen(ctx, crop, W, H) {
  const R = ctx.renderer;
  const three = R && R.renderer;
  if (!three || !R.size || typeof three.setPixelRatio !== 'function') return null;
  const { width, height } = R.size;
  const ratio = sharpRatio(width, height, crop, W, H, gpuMax(three), R.pixelRatio);
  if (!ratio) return null;
  // Only between two frames: a new size clears the buffer, so the frame just drawn is copied first (the tap's order).
  const apply = () => {
    if (Math.abs(three.getPixelRatio() - ratio) < 0.001) return;
    three.setPixelRatio(ratio);
    three.setSize(R.size.width, R.size.height, false);
  };
  return { ratio, apply, restore: () => { if (typeof R.resize === 'function') R.resize(true); } };
}

function tapsChanged(ctx) { if (typeof ctx.frameHooksChanged === 'function') ctx.frameHooksChanged(); }

export async function startLive(ctx, opts = {}, win = window) {
  const doc = win.document;
  if (typeof win.MediaRecorder !== 'function') throw new Error('MediaRecorder is not offered here');
  // The frame taps live in ui/makers.js (ctx.frameHooksChanged): make sure it is installed.
  if (typeof ctx.wantMakers === 'function') await ctx.wantMakers();
  const crop = ['wide', 'square', 'tall'].includes(opts.crop) ? opts.crop : 'wide';
  const { w: W, h: H } = sizeFor(crop, opts.size);
  const extra = cleanCredit(opts.credit || []);
  const corner = opts.corner !== 'none' && opts.corner !== false;
  const sharp = opts.sharp === true ? sharpen(ctx, crop, W, H) : null;
  const maxS = Number.isFinite(opts.maxS) ? Math.max(1, Math.min(MAX_S, opts.maxS)) : MAX_S;
  const mime = pickMime(win.MediaRecorder.isTypeSupported ? win.MediaRecorder.isTypeSupported.bind(win.MediaRecorder) : null);
  if (!mime) throw new Error('no video format is offered here');
  const comp = doc.createElement('canvas');
  comp.width = W;
  comp.height = H;
  const g = comp.getContext('2d');
  const stream = comp.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const rec = new win.MediaRecorder(stream, { mimeType: mime.mime, videoBitsPerSecond: W * H * FPS * 0.15 });
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  const stopped = new Promise((resolve) => { rec.onstop = resolve; });
  const began = performance.now();
  let frames = 0;
  let done = false;
  const tap = (t) => {
    if (done) return;
    compose(g, ctx.renderer.domElement, W, H, crop, ctx.clock.now(), extra, corner);
    if (track && typeof track.requestFrame === 'function') track.requestFrame();
    if (sharp) sharp.apply();
    frames += 1;
    if ((performance.now() - began) / 1000 >= maxS) handle.stop();
  };
  ctx.frameTaps = ctx.frameTaps || new Set();
  ctx.frameTaps.add(tap);
  tapsChanged(ctx);
  if (sharp) sharp.apply();
  rec.start(1000);
  let blob = null;
  const handle = {
    width: W, height: H, type: mime.mime.split(';')[0], sharp: sharp ? sharp.ratio : null,
    state: () => ({ recording: !done, frames, seconds: (performance.now() - began) / 1000 }),
    async stop() {
      if (blob) return blob;
      if (!done) {
        done = true;
        ctx.frameTaps.delete(tap);
        tapsChanged(ctx);
        if (sharp) sharp.restore();
        rec.stop();
      }
      await stopped;
      blob = new Blob(chunks, { type: mime.mime.split(';')[0] });
      return blob;
    },
  };
  return handle;
}

export async function createFrameEncoder(opts = {}, win = window) {
  const W = Math.max(16, Math.min(3840, Math.round(Number(opts.width) || 1280))) & ~1;
  const H = Math.max(16, Math.min(3840, Math.round(Number(opts.height) || 720))) & ~1;
  const fps = Number.isFinite(opts.fps) ? Math.max(1, Math.min(60, Math.round(opts.fps))) : FPS;
  const config = await frameEncoder(W, H, win);
  const realWait = (ms) => new Promise((r) => setTimeout(r, ms));
  let n = 0;
  if (config) {
    const chunks = [];
    let error = null;
    const enc = new win.VideoEncoder({
      output: (chunk) => { const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b); chunks.push({ data: b, timeMs: chunk.timestamp / 1000, key: chunk.type === 'key' }); },
      error: (e) => { error = String((e && e.message) || e); },
    });
    enc.configure({ ...config, framerate: fps, bitrate: Math.round(W * H * fps * 0.15) });
    return {
      kind: 'webcodecs', width: W, height: H, fps, get frames() { return n; },
      async add(canvas, repeat = 1) {
        for (let i = 0; i < Math.max(1, Math.min(600, repeat | 0)); i += 1) {
          if (error) throw new Error(error);
          const vf = new win.VideoFrame(canvas, { timestamp: Math.round((n * 1e6) / fps), duration: Math.round(1e6 / fps) });
          enc.encode(vf, { keyFrame: n % (fps * 2) === 0 });
          vf.close();
          n += 1;
          while (enc.encodeQueueSize > 4) await realWait(5);
        }
      },
      async done() {
        if (!n) throw new Error('no frames');
        await enc.flush();
        enc.close();
        if (error) throw new Error(error);
        chunks.sort((a, b) => a.timeMs - b.timeMs);
        return new Blob([muxWebm({ width: W, height: H, codec: config.codec, fps, frames: chunks })], { type: 'video/webm' });
      },
    };
  }
  // No encoder: MediaRecorder on a canvas of our own, resumed for one frame's time per frame.
  const mime = pickMime(win.MediaRecorder && win.MediaRecorder.isTypeSupported ? win.MediaRecorder.isTypeSupported.bind(win.MediaRecorder) : null);
  if (!mime) throw new Error('no video format is offered here');
  const comp = win.document.createElement('canvas');
  comp.width = W;
  comp.height = H;
  const g = comp.getContext('2d');
  const stream = comp.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const rec = new win.MediaRecorder(stream, { mimeType: mime.mime, videoBitsPerSecond: W * H * fps * 0.15 });
  const parts = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data); };
  const stopped = new Promise((r) => { rec.onstop = r; });
  rec.start();
  rec.pause();
  return {
    kind: 'paced', width: W, height: H, fps, get frames() { return n; },
    async add(canvas, repeat = 1) {
      g.drawImage(canvas, 0, 0, W, H);
      for (let i = 0; i < Math.max(1, Math.min(600, repeat | 0)); i += 1) {
        rec.resume();
        track.requestFrame();
        await realWait(1000 / fps);
        rec.pause();
        n += 1;
      }
    },
    async done() {
      rec.resume();
      rec.stop();
      await stopped;
      return new Blob(parts, { type: mime.mime.split(';')[0] });
    },
  };
}

/**
 * One still frame of the scene at `width` x `height` (any size up to 16384 a side), as a 2D canvas: scene/renderer.js
 * renderTo() in one go when the GPU can draw it, else in tiles, each a view offset of the same camera
 * (three's setViewOffset), drawn and copied back to back in one task. The map's own chrome is not in it, nor any line.
 */
export async function picture(ctx, opts = {}, win = window) {
  const R = ctx.renderer;
  const three = R && R.renderer;
  const cam = ctx.camera || (R && R.camera);
  if (!three || !cam || typeof R.renderTo !== 'function') throw new Error('no scene to draw');
  const W = Math.max(16, Math.min(16384, Math.round(Number(opts.width) || 1920)));
  const H = Math.max(16, Math.min(16384, Math.round(Number(opts.height) || 1080)));
  const max = gpuMax(three);
  const out = win.document.createElement('canvas');
  out.width = W;
  out.height = H;
  const g = out.getContext('2d');
  if (W <= max && H <= max) {
    const one = R.renderTo(W, H);
    if (!one) throw new Error('the scene could not be drawn');
    g.drawImage(one, 0, 0);
    return out;
  }
  const tiles = tilesFor(W, H, Math.min(max, 4096));
  const scene = R.scene;
  for (const t of tiles) {
    await new Promise((r) => (win.requestAnimationFrame ? win.requestAnimationFrame(() => r()) : setTimeout(r, 16)));
    // As renderTo does (scene/renderer.js), in one task: draw, copy, and put the live size back before the page composites.
    const aspect = cam.aspect;
    const live = R.size;
    const dpr = R.pixelRatio > 0 ? R.pixelRatio : 1;
    try {
      three.setPixelRatio(1);
      three.setSize(t.w, t.h, false);
      cam.aspect = W / H;
      cam.setViewOffset(W, H, t.x, t.y, t.w, t.h);
      three.render(scene, cam);
      g.drawImage(three.domElement, 0, 0, t.w, t.h, t.x, t.y, t.w, t.h);
    } finally {
      cam.clearViewOffset();
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
      three.setPixelRatio(dpr);
      three.setSize(Math.max(1, live.width), Math.max(1, live.height), false);
      three.render(scene, cam);
    }
  }
  return out;
}
