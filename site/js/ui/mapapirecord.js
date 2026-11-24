// ui/mapapirecord.js -- the recording half of window.srMap (ui/mapapi.js, docs/PLUGINS.md): fetched on the first
// srMap.record.start() or srMap.record.frames(), never before.
//
// Contract: startLive(ctx, opts, win) -> { stop() -> Promise<Blob>, state() }   the map's canvas, as Record records it
//           createFrameEncoder(opts, win) -> { add(canvas, repeat?) -> Promise, done() -> Promise<Blob>, kind, width, height }
// Pure, for tests/test_mapapi.mjs: SIZES, sizeFor(crop, size), cleanCredit(lines)
//
// LIVE is ui/recorder.js's live way, without its panel: after each render (main.js ctx.makeFrame, through the frame taps
// ui/makers.js runs) the map's canvas is cropped into a 2D canvas with the map's credit and the instant in the corner,
// and a script's own credit lines under them, and MediaRecorder records that canvas. FRAMES is the frame-by-frame way
// for a picture a script draws itself (a timelapse of satellite days): each canvas handed to add() is encoded with
// WebCodecs at its own timestamp into a WebM (ui/webm.js), so the clip plays at its frame rate however slowly it was
// drawn; where WebCodecs cannot encode, MediaRecorder is paced, a frame's time a frame. Nothing leaves the device.

import { outputSize, compose, frameEncoder, pickMime, FPS, MAX_S } from './recorder.js';
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

function tapsChanged(ctx) { if (typeof ctx.frameHooksChanged === 'function') ctx.frameHooksChanged(); }

export async function startLive(ctx, opts = {}, win = window) {
  const doc = win.document;
  if (typeof win.MediaRecorder !== 'function') throw new Error('MediaRecorder is not offered here');
  // The frame taps live in ui/makers.js (ctx.frameHooksChanged): make sure it is installed.
  if (typeof ctx.wantMakers === 'function') await ctx.wantMakers();
  const crop = ['wide', 'square', 'tall'].includes(opts.crop) ? opts.crop : 'wide';
  const { w: W, h: H } = sizeFor(crop, opts.size);
  const extra = cleanCredit(opts.credit || []);
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
    compose(g, ctx.renderer.domElement, W, H, crop, ctx.clock.now(), extra);
    if (track && typeof track.requestFrame === 'function') track.requestFrame();
    frames += 1;
    if ((performance.now() - began) / 1000 >= maxS) handle.stop();
  };
  ctx.frameTaps = ctx.frameTaps || new Set();
  ctx.frameTaps.add(tap);
  tapsChanged(ctx);
  rec.start(1000);
  let blob = null;
  const handle = {
    width: W, height: H, type: mime.mime.split(';')[0],
    state: () => ({ recording: !done, frames, seconds: (performance.now() - began) / 1000 }),
    async stop() {
      if (blob) return blob;
      if (!done) {
        done = true;
        ctx.frameTaps.delete(tap);
        tapsChanged(ctx);
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
