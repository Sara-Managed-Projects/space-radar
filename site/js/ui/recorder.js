// ui/recorder.js -- Record: any view, flight path or trip as a video, with the credit and the date in the corner
// and an end card that is a door back to the exact view (forge #156).
//
// Contract: createRecorder(ctx) -> { open({ opener, source }), close(), isOpen(), start(opts), stop(), active,
//                                    frame(t), state(), root }
//           filmRecord(ctx, film, search) -> Promise   the frame-by-frame recording, on render mode's clock
// Pure, for tests/test_recorder.mjs:
//   CROPS, FPS, END_S, VIEW_SECONDS, MIME_ORDER, outputSize(crop, phone), cropRect(sw, sh, crop),
//   pickMime(isTypeSupported), recordPlan(g), creditLine(ms), dateLine(ms), fileName(crop, ms, ext),
//   displayUrl(url), wrapText(text, width, measure), filmUrl(base, hash, opts), parseRecord(search), frameTotal(seconds, fps)
//
// WHAT A CLIP IS. The map's canvas, cropped to 16:9 (YouTube), a square (Instagram's feed) or 9:16 (Reels, TikTok,
// Shorts) at 1080 px on its short side (720 on a phone), at 30 frames a second. Bottom left, small, on a shade so it
// reads over a bright Earth: "spaceradar.ai" with the maps' credit, and the instant the sky is shown at, as the
// postcard prints it (ui/printcompose.js: a picture outlives its context). Then three seconds of end card: "See it
// yourself", the link to the view the clip began on (with `cam=`, so it opens framed as it was), or the flight's
// `#path=` link, or the trip's page. Nothing is uploaded: the file is saved on the device, or handed to its share.
//
// TWO WAYS TO RECORD.
//   LIVE, the default on a capable device: MediaRecorder on a 2D canvas the frame is copied into after each render
//   (main.js ctx.makeFrame, the same task as the render, so the drawing buffer is still there: scene/renderer.js
//   renderTo says why). The trip's sound comes too when sound is on: the audio engine's master gain
//   (audio/engine.js) is also connected to a MediaStream destination for the length of the clip.
//   FRAME BY FRAME, the default on a slow device (tier 0, scene/quality.js) and a choice everywhere: the page
//   reloads into render mode on its own clock (`?render=1&clock=1&record=...`, ui/rendermode.js createFilmClock)
//   with the same view in its address, and each frame is drawn, waited for until nothing in it is loading, and
//   encoded with WebCodecs at its own timestamp (n / 30 s) into a WebM written here (ui/webm.js). However slow the
//   device, the clip plays at 30 frames a second with no frame dropped or doubled. It is silent, and says so: the
//   film clock plays no sound (ui/rendermode.js, THE VOICE IS NOT PLAYED HERE). Where WebCodecs cannot encode VP9
//   or VP8, MediaRecorder is paced instead: resumed for one frame's 33 ms and paused while the next is drawn.
//
// WHICH FORMAT. What the browser says it can record (MediaRecorder.isTypeSupported): WebM where it is offered (Chrome,
// Edge, Firefox), which YouTube takes; else MP4 (Safari), which every network takes (MIME_ORDER says why WebM leads). Where neither MediaRecorder nor WebCodecs exists, Record says so and records nothing.
//
// NEVER AT BOOT: main.js imports this on the share sheet's Record, the flight editor's Record, or a film address.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.make.js';
import { loadCss } from './latercss.js';
import { createSheet } from './sheet.js';
import { toast, appBase, shareUrl, shareState } from './share.js';
import { camValue, read as readUrl } from './urlstate.js';
import { saveBlob } from './printcompose.js';
import { muxWebm } from './webm.js';

export const FPS = 30;
export const END_S = 3;
export const VIEW_SECONDS = [10, 20, 30, 60];
/** Width:height of each crop. */
export const CROPS = { wide: [16, 9], square: [1, 1], tall: [9, 16] };
/** The longest a trip or a view is recorded for, whatever happens: ten minutes. */
export const MAX_S = 600;
/**
 * In this order: WebM where it is offered (Chrome, Edge, Firefox), else MP4 (Safari, whose only kind it is).
 * MEASURED 2026-11-07 in headless Chrome: MediaRecorder said yes to `video/mp4;codecs=avc1...` and then handed
 * back an empty file for a 1080 x 1920 canvas drawn every frame, where WebM recorded it; so MP4 is not preferred
 * where WebM is there to take its place.
 */
export const MIME_ORDER = [
  ['video/webm;codecs=vp9,opus', 'webm'], ['video/webm;codecs=vp8,opus', 'webm'], ['video/webm', 'webm'],
  ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'], ['video/mp4;codecs=avc1', 'mp4'], ['video/mp4', 'mp4'],
];
const FRAME_CODECS = ['vp09.00.10.08', 'vp8'];

/** The clip's size in pixels: 1080 on the short side (720 on a phone), even numbers. Pure. */
export function outputSize(crop, phone = false) {
  const [a, b] = CROPS[crop] || CROPS.wide;
  const short = phone ? 720 : 1080;
  const w = a >= b ? Math.round((short * a) / b) : short;
  const h = a >= b ? short : Math.round((short * b) / a);
  return { w: w - (w % 2), h: h - (h % 2) };
}

/** The middle of the source with the crop's shape, as large as fits: { sx, sy, sw, sh }. Pure. */
export function cropRect(sw, sh, crop) {
  const [a, b] = CROPS[crop] || CROPS.wide;
  const want = a / b;
  let w = sw;
  let h = sw / want;
  if (h > sh) { h = sh; w = sh * want; }
  return { sx: (sw - w) / 2, sy: (sh - h) / 2, sw: w, sh: h };
}

/** The first type the browser records, or null. `isTypeSupported` is MediaRecorder's. Pure. */
export function pickMime(isTypeSupported) {
  if (typeof isTypeSupported !== 'function') return null;
  for (const [mime, ext] of MIME_ORDER) {
    try { if (isTypeSupported(mime)) return { mime, ext }; } catch { /* a browser that throws on a type does not record it */ }
  }
  return null;
}

/** What this browser can do: { live: {mime, ext} | null, frames: 'webcodecs' | 'paced' | null }. `g` is the window. Pure. */
export function recordPlan(g = globalThis) {
  const MR = g.MediaRecorder;
  const canvasStream = !!(g.HTMLCanvasElement && g.HTMLCanvasElement.prototype && typeof g.HTMLCanvasElement.prototype.captureStream === 'function');
  const live = MR && canvasStream ? pickMime(MR.isTypeSupported ? MR.isTypeSupported.bind(MR) : null) : null;
  const frames = typeof g.VideoEncoder === 'function' && typeof g.VideoFrame === 'function' ? 'webcodecs' : live ? 'paced' : null;
  return { live, frames };
}

const pad = (n) => String(n).padStart(2, '0');
/** "2026-11-07 14:03 UTC": the instant the sky in the frame is shown at. Pure. */
export function dateLine(ms) {
  const d = new Date(Number(ms));
  if (!Number.isFinite(d.getTime())) return '';
  return t(COPY.record.date, { when: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` });
}
/** The corner's first line. Pure. */
export function creditLine() {
  return COPY.record.credit;
}
/** `spaceradar-2026-11-07-1403-wide.webm`. Pure. */
export function fileName(crop, ms, ext) {
  const d = new Date(Number(ms));
  const stamp = Number.isFinite(d.getTime()) ? `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}` : 'now';
  return `spaceradar-${stamp}-${CROPS[crop] ? crop : 'wide'}.${ext === 'mp4' ? 'mp4' : 'webm'}`;
}
/** A link as a person reads it on a card: no scheme, no `www.`. Pure. */
export function displayUrl(url) {
  return String(url || '').replace(/^https?:\/\//, '').replace(/^www\./, '');
}
/** Lines of at most `width` (as `measure` counts), broken at spaces, or anywhere in a word too long for one. Pure. */
export function wrapText(text, width, measure) {
  const lines = [];
  let line = '';
  const push = () => { if (line) lines.push(line); line = ''; };
  for (const word of String(text || '').split(/(\s+)/)) {
    if (!word) continue;
    if (measure(line + word) <= width) { line += word; continue; }
    if (/^\s+$/.test(word)) { push(); continue; }
    push();
    for (const ch of word) {
      if (line && measure(line + ch) > width) push();
      line += ch;
    }
  }
  push();
  return lines;
}
/** Frames in `seconds` of film. Pure. */
export function frameTotal(seconds, fps = FPS) {
  return Math.max(1, Math.round(Number(seconds) * fps));
}

/** The film address a frame-by-frame recording runs at: the same view, on render mode's clock. Pure. */
export function filmUrl(base, hash, { crop = 'wide', seconds = 20, source = 'view', end = '' } = {}) {
  const h = String(hash || '').replace(/^#/, '');
  const rec = [CROPS[crop] ? crop : 'wide', Math.min(MAX_S, Math.max(1, Math.round(seconds))), source === 'path' ? 'path' : 'view'].join(',');
  return `${String(base).replace(/[?#].*$/, '')}?render=1&clock=1&fps=${FPS}&record=${rec}${end ? `&end=${encodeURIComponent(end)}` : ''}${h ? `#${h}` : ''}`;
}
/** And the options back from the query, or null. Pure. */
export function parseRecord(search) {
  const q = new URLSearchParams(String(search || ''));
  const m = /^(wide|square|tall),(\d{1,3}),(view|path)$/.exec(q.get('record') || '');
  if (!m) return null;
  return { crop: m[1], seconds: Math.min(MAX_S, Math.max(1, Number(m[2]))), source: m[3], end: q.get('end') || '' };
}

// ---------------------------------------------------------------------------------------------- drawing

function fontPx(H) { return Math.max(12, Math.round(H * 0.022)); }

/** The scene, cropped, and the corner's two lines over a shade. */
function compose(g, src, W, H, crop, clockMs) {
  const r = cropRect(src.width, src.height, crop);
  g.drawImage(src, r.sx, r.sy, r.sw, r.sh, 0, 0, W, H);
  const lines = [creditLine(), dateLine(clockMs)];
  let px = fontPx(Math.min(W, H) * 1.6);
  let padPx = Math.round(px * 0.9);
  g.font = `500 ${px}px Inter, system-ui, sans-serif`;
  let w = Math.max(...lines.map((l) => g.measureText(l).width));
  // A square or an upright clip is narrower than the line: the type is made smaller until it fits, never cut.
  if (w > W - padPx * 2) {
    px = Math.max(10, Math.floor((px * (W - padPx * 2)) / w));
    padPx = Math.round(px * 0.9);
    g.font = `500 ${px}px Inter, system-ui, sans-serif`;
    w = Math.max(...lines.map((l) => g.measureText(l).width));
  }
  const boxH = px * 2 * 1.35 + padPx;
  const grad = g.createLinearGradient(0, H - boxH - padPx * 2, 0, H);
  grad.addColorStop(0, 'rgba(11,14,20,0)');
  grad.addColorStop(1, 'rgba(11,14,20,0.55)');
  g.fillStyle = grad;
  g.fillRect(0, H - boxH - padPx * 2, Math.min(W, w + padPx * 4), boxH + padPx * 2);
  g.fillStyle = 'rgba(232,236,242,0.92)';
  g.textBaseline = 'alphabetic';
  g.fillText(lines[0], padPx, H - padPx - px * 1.35);
  g.fillStyle = 'rgba(232,236,242,0.72)';
  g.fillText(lines[1], padPx, H - padPx);
}

/** The end card: where to see it yourself, the link in ember, the credit under it. */
function endCard(g, W, H, url) {
  const E = COPY.record;
  g.fillStyle = '#0b0e14';
  g.fillRect(0, 0, W, H);
  const short = Math.min(W, H);
  const big = Math.round(short * 0.075);
  const mid = Math.round(short * 0.042);
  const small = Math.round(short * 0.028);
  const width = W * 0.84;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#e8ecf2';
  g.font = `600 ${big}px Inter, system-ui, sans-serif`;
  let y = H * 0.36;
  g.fillText(E.endTitle, W / 2, y);
  g.font = `500 ${mid}px Inter, system-ui, sans-serif`;
  g.fillStyle = '#ff9f43';
  y += big * 1.1;
  const lines = wrapText(displayUrl(url), width, (s) => g.measureText(s).width).slice(0, 6);
  for (const l of lines) { y += mid * 1.3; g.fillText(l, W / 2, y); }
  g.font = `400 ${small}px Inter, system-ui, sans-serif`;
  g.fillStyle = '#9aa4b2';
  y += mid * 1.6;
  g.fillText(E.endLine, W / 2, y);
  y += small * 1.5;
  for (const l of wrapText(E.endCredit, width, (s) => g.measureText(s).width)) { g.fillText(l, W / 2, y); y += small * 1.35; }
  g.textAlign = 'start';
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
  return n;
}
function radio(name, value, label, checked) {
  const row = el('label', 'sr-make__choice');
  const r = el('input');
  r.type = 'radio';
  r.name = name;
  r.value = value;
  r.checked = !!checked;
  row.append(r, el('span', null, label));
  return { row, r };
}
const isPhone = () => document.documentElement.classList.contains('sr-phone');

/** The link the end card shows for a view: the one the share sheet would give, framed as the camera stands now. */
function viewLink(ctx) {
  const rec = typeof ctx.selected === 'function' ? ctx.selected() : null;
  const url = shareUrl(shareState(ctx, rec ? rec.id : null), appBase());
  if (/\/t\/[^/#]+\.html/.test(url) || /[#&]trip=/.test(url)) return url;
  let cam = '';
  try { cam = camValue(ctx.camPose()); } catch { cam = ''; }
  return cam ? `${url}${url.includes('#') ? '&' : '#'}cam=${cam}` : url;
}

// ------------------------------------------------------------------------------------------------- live

export function createRecorder(ctx) {
  const R = COPY.record;
  const doc = document;
  // The phone's sheet measures the panel, so it is seated once the panel's rules have landed (css/make.css).
  const cssReady = loadCss('make', doc);
  const plan = recordPlan(window);
  let opener = null;
  let job = null; // { comp, g, crop, W, H, rec, chunks, began, seconds, source, url, phase, dest, mime }
  let made = null; // { blob, name }

  const root = el('section', 'sr-make sr-make--small sr-float sr-over-clean');
  root.id = 'sr-record';
  root.setAttribute('aria-labelledby', 'sr-record-title');
  root.hidden = true;
  const head = el('div', 'sr-make__head');
  const title = el('h2', 'sr-make__title', R.title);
  title.id = 'sr-record-title';
  title.tabIndex = -1;
  const closeBtn = el('button', 'sr-make__close', '×');
  closeBtn.type = 'button';
  closeBtn.title = R.close;
  closeBtn.setAttribute('aria-label', R.close);
  head.append(title, closeBtn);
  const body = el('div', 'sr-make__body');

  const what = el('div', 'sr-make__choices');
  what.setAttribute('role', 'radiogroup');
  what.setAttribute('aria-label', R.whatLabel);
  const srcView = radio('sr-rec-src', 'view', R.sourceView, true);
  const srcPath = radio('sr-rec-src', 'path', R.sourcePath);
  const srcTrip = radio('sr-rec-src', 'trip', R.sourceTrip);
  what.append(srcView.row, srcPath.row, srcTrip.row);
  const lenWrap = el('label', 'sr-make__field');
  lenWrap.appendChild(el('span', 'sr-make__fieldname', R.length));
  const lenSel = el('select', 'sr-make__select');
  for (const s of VIEW_SECONDS) { const o = el('option', null, t(R.seconds, { n: s })); o.value = String(s); lenSel.appendChild(o); }
  lenSel.value = '20';
  lenWrap.appendChild(lenSel);
  const shapes = el('div', 'sr-make__choices');
  shapes.setAttribute('role', 'radiogroup');
  shapes.setAttribute('aria-label', R.shapeLabel);
  const shapeRadios = Object.keys(CROPS).map((c, i) => radio('sr-rec-shape', c, R.crops[c], i === 0));
  for (const s of shapeRadios) shapes.appendChild(s.row);
  const smoothRow = el('label', 'sr-make__check');
  const smoothBox = el('input');
  smoothBox.type = 'checkbox';
  smoothRow.append(smoothBox, el('span', null, R.smooth));
  const smoothNote = el('p', 'sr-make__note', R.smoothNote);
  const soundNote = el('p', 'sr-make__note');
  const status = el('p', 'sr-make__status');
  status.setAttribute('role', 'status');
  const acts = el('div', 'sr-make__acts');
  const goBtn = el('button', 'sr-make__btn sr-make__btn--primary', R.start);
  goBtn.type = 'button';
  const saveBtn = el('button', 'sr-make__btn', R.save);
  saveBtn.type = 'button';
  saveBtn.hidden = true;
  const shareBtn = el('button', 'sr-make__btn', R.share);
  shareBtn.type = 'button';
  shareBtn.hidden = true;
  acts.append(goBtn, saveBtn, shareBtn);
  body.append(what, lenWrap, shapes, smoothRow, smoothNote, soundNote, acts, status);
  root.append(head, body);
  doc.body.appendChild(root);

  const sourceNow = () => (srcPath.r.checked ? 'path' : srcTrip.r.checked ? 'trip' : 'view');
  const cropNow = () => (shapeRadios.find((s) => s.r.checked) || shapeRadios[0]).r.value;
  const tripOn = () => !!(ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle');
  const pathOk = () => !!(ctx.flight && ctx.flight.state().keys >= 2);
  const soundOn = () => !!(ctx.audio && typeof ctx.audio.isOn === 'function' && ctx.audio.isOn() && ctx.audio.context && ctx.audio.master);

  function say(line) { status.textContent = line || ''; }

  function paint() {
    srcPath.r.disabled = !pathOk();
    srcTrip.r.disabled = !tripOn();
    if ((srcPath.r.checked && srcPath.r.disabled) || (srcTrip.r.checked && srcTrip.r.disabled)) srcView.r.checked = true;
    lenWrap.hidden = sourceNow() !== 'view';
    smoothBox.disabled = !plan.frames || sourceNow() === 'trip' || !!job;
    if (sourceNow() === 'trip') smoothBox.checked = false;
    soundNote.textContent = smoothBox.checked ? R.silent : soundOn() ? R.withSound : R.noSound;
    goBtn.textContent = job ? R.stop : R.start;
    goBtn.disabled = !job && !(smoothBox.checked ? plan.frames : plan.live);
    for (const n of [what, shapes]) for (const i of n.querySelectorAll('input')) if (job) i.disabled = true;
    if (!plan.live && !plan.frames) say(R.cannot);
  }
  for (const r of [srcView.r, srcPath.r, srcTrip.r, smoothBox, ...shapeRadios.map((s) => s.r)]) r.addEventListener('change', paint);

  function frameHooks() { if (typeof ctx.frameHooksChanged === 'function') ctx.frameHooksChanged(); }

  /** Copy this frame into the clip (main.js ctx.makeFrame, straight after the render). */
  function frame() {
    if (!job || job.phase === 'done') return;
    if (job.phase === 'end') endCard(job.g, job.W, job.H, job.url);
    else compose(job.g, ctx.renderer.domElement, job.W, job.H, job.crop, ctx.clock.now());
    if (job.track && typeof job.track.requestFrame === 'function') job.track.requestFrame();
    const s = (performance.now() - job.began) / 1000;
    if (job.phase === 'rolling') {
      const over = job.source === 'trip' ? !tripOn() || ctx.trip.state.phase === 'end' : job.source === 'path' ? !ctx.flight.playing() : s >= job.seconds;
      if (over || s >= MAX_S) { job.phase = 'end'; job.endAt = performance.now(); }
      say(t(R.rolling, { at: fmt.int(Math.floor(s)) }));
    } else if (job.phase === 'end' && performance.now() - job.endAt >= END_S * 1000) {
      job.phase = 'done';
      job.rec.stop();
    }
  }

  async function start() {
    if (job) return false;
    const crop = cropNow();
    const source = sourceNow();
    if (smoothBox.checked) return toFilm(crop, source);
    if (!plan.live) { say(R.cannot); return false; }
    const { w: W, h: H } = outputSize(crop, isPhone());
    const comp = doc.createElement('canvas');
    comp.width = W;
    comp.height = H;
    const g = comp.getContext('2d');
    // A frame is handed over when it is drawn (requestFrame), not sampled: MEASURED 2026-11-07 in headless Chrome, a
    // canvas stream sampled at 30 fps while a 2D canvas was drawn every animation frame recorded an empty file, in WebM
    // and in MP4; the same canvas with requestFrame after each drawing recorded.
    const stream = comp.captureStream(0);
    const track = stream.getVideoTracks()[0];
    let dest = null;
    if (soundOn()) {
      try {
        dest = ctx.audio.context.createMediaStreamDestination();
        ctx.audio.master.connect(dest);
        for (const tr of dest.stream.getAudioTracks()) stream.addTrack(tr);
      } catch { dest = null; }
    }
    const url = source === 'path' ? (await ctx.flight.linkFor()).url : viewLink(ctx);
    let rec;
    try {
      rec = new MediaRecorder(stream, { mimeType: plan.live.mime, videoBitsPerSecond: W * H * FPS * 0.15 });
    } catch (e) {
      say(R.cannot);
      if (ctx) ctx.lastRecord = { error: String((e && e.message) || e) };
      return false;
    }
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    job = { comp, g, crop, W, H, rec, chunks, track, began: performance.now(), seconds: Number(lenSel.value), source, url, phase: 'rolling', dest, mime: plan.live };
    rec.onstop = () => finish(job);
    rec.start(1000);
    if (source === 'path') { ctx.flight.scrubTo(0); ctx.flight.play(); }
    made = null;
    saveBtn.hidden = true;
    shareBtn.hidden = true;
    frameHooks();
    paint();
    if (ctx) ctx.lastRecord = { started: true, mime: plan.live.mime, w: W, h: H, source, crop, url };
    return true;
  }

  function finish(j) {
    if (j.dest) { try { ctx.audio.master.disconnect(j.dest); } catch { /* already gone */ } }
    const blob = new Blob(j.chunks, { type: j.mime.mime.split(';')[0] });
    job = null;
    frameHooks();
    if (!blob.size) {
      // The browser said it could record this kind and gave back nothing: said, not saved as an empty file.
      made = null;
      say(R.empty);
      if (ctx) ctx.lastRecord = { ...(ctx.lastRecord || {}), done: true, bytes: 0, empty: true };
      paint();
      return;
    }
    made = { blob, name: fileName(j.crop, Date.now(), j.mime.ext) };
    saveBtn.hidden = false;
    shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [new File([blob], made.name, { type: blob.type })] }));
    say(t(R.made, { mb: fmt.num(blob.size / 1e6, 1) }));
    if (ctx) ctx.lastRecord = { ...(ctx.lastRecord || {}), done: true, bytes: blob.size, type: blob.type, name: made.name };
    paint();
  }

  function stop() {
    if (!job) return;
    if (job.phase === 'rolling') { job.phase = 'end'; job.endAt = performance.now(); if (job.source === 'path' && ctx.flight) ctx.flight.stop('recorded'); }
  }

  /** Frame by frame: the same view, reloaded on render mode's clock, and recorded there. */
  async function toFilm(crop, source) {
    const seconds = source === 'path' ? Math.ceil(ctx.flight.state().totalMs / 1000) + 1 : Number(lenSel.value);
    // The view as the end card will link it (what is selected, where the camera stands, the clock), or the flight's link.
    const end = source === 'path' ? (await ctx.flight.linkFor()).url : viewLink(ctx);
    const hash = end.includes('#') ? end.slice(end.indexOf('#') + 1) : '';
    location.assign(filmUrl(appBase(), hash, { crop, seconds, source, end }));
    return true;
  }

  goBtn.addEventListener('click', () => (job ? stop() : start()));
  saveBtn.addEventListener('click', () => { if (made) { saveBlob(made.blob, made.name); toast(R.saved, 3000); } });
  shareBtn.addEventListener('click', async () => {
    if (!made) return;
    try { await navigator.share({ files: [new File([made.blob], made.name, { type: made.blob.type })], title: R.title }); } catch { /* dismissed is an answer */ }
  });

  let sheet = null;
  function seat() {
    if (isPhone() && !sheet) sheet = createSheet(root, { detents: ['peek', 'half', 'full'], initial: 'half', grab: '.sr-make__title', scrollers: '.sr-make__body', label: R.sheet });
    else if (!isPhone() && sheet) { sheet.destroy(); sheet = null; }
    if (sheet) sheet.set('half');
  }
  function open(opts = {}) {
    opener = opts.opener || doc.activeElement;
    root.hidden = false;
    if (opts.source === 'path' || (opts.source == null && pathOk() && ctx.flight.isOpen())) srcPath.r.checked = pathOk();
    else if (opts.source === 'trip' || (opts.source == null && tripOn())) srcTrip.r.checked = tripOn();
    // A slow device records frame by frame unless the visitor says otherwise (scene/quality.js tier 0).
    if (!job) smoothBox.checked = !!plan.frames && (!plan.live || (ctx.quality && ctx.quality.tier === 0));
    cssReady.then(() => { if (!root.hidden) seat(); });
    paint();
    title.focus({ preventScroll: true });
  }
  function close() {
    if (root.hidden) return;
    root.hidden = true;
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }
  closeBtn.addEventListener('click', close);
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } });

  return {
    open, close, isOpen: () => !root.hidden, start, stop, frame,
    get active() { return !!job; },
    state: () => ({ recording: !!job, phase: job ? job.phase : null, made: made ? { bytes: made.blob.size, name: made.name } : null, plan }),
    root,
  };
}

// --------------------------------------------------------------------------------------- frame by frame

async function frameEncoder(W, H, g) {
  if (typeof g.VideoEncoder !== 'function') return null;
  for (const codec of FRAME_CODECS) {
    const config = { codec, width: W, height: H, bitrate: Math.round(W * H * FPS * 0.15), framerate: FPS, latencyMode: 'quality' };
    try {
      const ok = await g.VideoEncoder.isConfigSupported(config);
      if (ok && ok.supported) return config;
    } catch { /* the next codec */ }
  }
  return null;
}

/**
 * The frame-by-frame recording (`?render=1&clock=1&record=wide,20,view#...`): wait on the film clock until the map
 * is up, then for each frame advance the clock one frame, copy the frame, encode it at n / FPS seconds; then the end
 * card; then save the file. `window.__srRecord` says where it is, for the visitor's panel and for a check.
 */
export async function filmRecord(ctx, film, search, g = window) {
  const R = COPY.record;
  const opts = parseRecord(search);
  if (!opts) return null;
  loadCss('make', g.document);
  g.document.documentElement.classList.add('sr-filming'); // only the scene and the progress (css/make.css)
  const state = { stage: 'warming', frame: 0, frames: 0, done: false, error: null, bytes: 0, type: '', codec: '' };
  g.__srRecord = state;
  const panel = el('div', 'sr-make sr-make--film sr-float');
  panel.setAttribute('role', 'status');
  const line = el('p', 'sr-make__status', R.filmWarming);
  const back = el('a', 'sr-make__btn', R.back);
  back.href = opts.end || appBase();
  back.hidden = true;
  const again = el('button', 'sr-make__btn sr-make__btn--primary', R.save);
  again.type = 'button';
  again.hidden = true;
  panel.append(el('p', 'sr-make__title', R.filmTitle), line, again, back);
  g.document.body.appendChild(panel);
  try {
    for (let i = 0; i < 4000 && !g.__srLayersReady; i += 1) await film.advance();
    // A second of film for the later layers and the maps the view asks for, as render mode warms a trip.
    for (let i = 0; i < FPS * 2; i += 1) await film.advance();
    // The flight is opened from the address as a link opens it, while the film clock is moved for it (its keys' things
    // may wait on layers whose timers run on that clock), then put back at its start for the first frame.
    if (opts.source === 'path' && typeof ctx.wantFlight === 'function') {
      const f = await ctx.wantFlight();
      let landed = false;
      const opened = f ? f.openLink(readUrl().path || '').finally(() => { landed = true; }) : Promise.resolve(false);
      for (let i = 0; i < 3000 && !landed; i += 1) await film.advance();
      if (!(await opened)) throw new Error(COPY.flight.badLink);
      f.stop('film');
      f.close();
    }
    const { w: W, h: H } = outputSize(opts.crop, false);
    const comp = g.document.createElement('canvas');
    comp.width = W;
    comp.height = H;
    const cg = comp.getContext('2d');
    const src = ctx.renderer.domElement;
    const total = frameTotal(opts.seconds);
    const endFrames = frameTotal(END_S);
    state.frames = total + endFrames;
    const config = await frameEncoder(W, H, g);
    const chunks = [];
    let encoder = null;
    let paced = null;
    if (config) {
      state.codec = config.codec;
      encoder = new g.VideoEncoder({
        output: (chunk) => { const b = new Uint8Array(chunk.byteLength); chunk.copyTo(b); chunks.push({ data: b, timeMs: chunk.timestamp / 1000, key: chunk.type === 'key' }); },
        error: (e) => { state.error = String((e && e.message) || e); },
      });
      encoder.configure(config);
    } else {
      // No WebCodecs encoder for VP9 or VP8: MediaRecorder, resumed for exactly one frame and paused while the next is drawn.
      const mime = pickMime(g.MediaRecorder && g.MediaRecorder.isTypeSupported ? g.MediaRecorder.isTypeSupported.bind(g.MediaRecorder) : null);
      if (!mime) throw new Error(R.cannot);
      const stream = comp.captureStream(0);
      const track = stream.getVideoTracks()[0];
      const rec = new g.MediaRecorder(stream, { mimeType: mime.mime, videoBitsPerSecond: W * H * FPS * 0.15 });
      const parts = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data); };
      const stopped = new Promise((r) => { rec.onstop = r; });
      rec.start();
      rec.pause();
      paced = { rec, track, parts, stopped, mime };
      state.codec = mime.mime;
    }
    const flight = opts.source === 'path' ? ctx.flight : null;
    if (flight) { flight.scrubTo(0); flight.play(); }
    let endUrl = opts.end;
    if (flight) endUrl = (await flight.linkFor()).url;
    state.stage = 'filming';
    // Copied in the render's own task (main.js ctx.makeFrame): after it, the drawing buffer is not kept.
    ctx.filmCapture = () => compose(cg, src, W, H, opts.crop, ctx.clock.now());
    if (typeof ctx.frameHooksChanged === 'function') ctx.frameHooksChanged();
    for (let n = 0; n < total + endFrames; n += 1) {
      if (n < total) await film.advance();
      else {
        if (n === total) { ctx.filmCapture = null; if (typeof ctx.frameHooksChanged === 'function') ctx.frameHooksChanged(); }
        endCard(cg, W, H, endUrl);
      }
      if (encoder) {
        const vf = new g.VideoFrame(comp, { timestamp: Math.round((n * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
        encoder.encode(vf, { keyFrame: n % (FPS * 2) === 0 || n === total });
        vf.close();
        // Never more than a few frames queued: a phone's encoder is slower than its drawing at 1080p.
        while (encoder.encodeQueueSize > 4) await film.realWait(5);
      } else {
        paced.rec.resume();
        paced.track.requestFrame();
        await film.realWait(1000 / FPS);
        paced.rec.pause();
      }
      state.frame = n + 1;
      line.textContent = t(R.filmFrame, { n: fmt.int(n + 1), total: fmt.int(total + endFrames) });
      if (state.error) throw new Error(state.error);
    }
    let blob;
    let ext = 'webm';
    if (encoder) {
      await encoder.flush();
      encoder.close();
      chunks.sort((a, b) => a.timeMs - b.timeMs);
      blob = new Blob([muxWebm({ width: W, height: H, codec: config.codec, fps: FPS, frames: chunks })], { type: 'video/webm' });
    } else {
      paced.rec.resume();
      paced.rec.stop();
      await paced.stopped;
      ext = paced.mime.ext;
      blob = new Blob(paced.parts, { type: paced.mime.mime.split(';')[0] });
    }
    const name = fileName(opts.crop, Date.now(), ext);
    Object.assign(state, { stage: 'done', done: true, bytes: blob.size, type: blob.type, name, url: URL.createObjectURL(blob) });
    line.textContent = t(R.filmDone, { mb: fmt.num(blob.size / 1e6, 1), s: fmt.int(opts.seconds + END_S) });
    again.hidden = false;
    back.hidden = false;
    again.addEventListener('click', () => saveBlob(blob, name));
    saveBlob(blob, name);
    return state;
  } catch (e) {
    state.error = String((e && e.message) || e);
    state.stage = 'failed';
    line.textContent = t(R.filmFailed, { why: state.error });
    back.hidden = false;
    return state;
  }
}
