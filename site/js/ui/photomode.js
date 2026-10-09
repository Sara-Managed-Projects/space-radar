// ui/photomode.js -- compose a picture: everything off the screen, a frame, a caption (public #288).
//
// Never at boot: ui/sharesheet.js imports this when its "Photo mode" is pressed. P opens Share, as
// it always did; photo mode is one press further in, and takes no key of its own.
//
// Contract: openPhotoMode(ctx, { record, opener }) -> { close(), state() }   (one at a time)
// Also exported, pure, for tests/test_photomode.mjs:
//   SHAPES                               the four presets, in the order the bar shows them
//   frameRect(viewW, viewH, shape, margin) -> { x, y, w, h, fovScale }
//   LENS, clampLens(deg, own)            the lens slider's range, and a value held inside it
//
// WHAT IT IS. The clear screen (ui/cleanview.js, H) with a frame on it. The camera stays free:
// drag, pinch, the arrow keys, all as ever, because nothing here sits over the canvas but four
// dimmed mattes that pass every press through. One bar at the foot: the shape (16:9, 1:1, 4:5,
// 9:16), the lens (the field of view, 15 to 75 degrees, put back on leaving), the caption strip
// on or off, PNG instead of JPEG, Save picture (the one ember), and leave.
//
// THE PICTURE IS THE FRAME. Save goes through the postcard's own path (ui/printcompose.js
// makePostcard): the scene drawn again at the preset's size, not a crop of the screen. The frame
// is centred on the screen, so its picture is the same camera with the field of view narrowed by
// the share of the screen's height the frame takes (frameRect's fovScale); the caption strip seen
// in the frame is drawn by the same function that draws it on the picture (drawBand), so what is
// composed is what is saved.
//
// THE CAPTION says what a picture needs once it has left the page: the name (the card's own, or
// the trip and its stop, or the app), the instant the sky is from, the exposure when it is not the
// camera's, "spaceradar.ai", and one line that it is a drawing from measured positions and not a
// photograph. Off, the picture is the scene alone.
//
// LEAVING. The close button, Escape and H all leave: the last two are the clear screen's own keys
// (it hears them first and says so with `sr:clean`), so there is one rule for both. The screen goes
// back to how it was, and focus to whatever opened the share sheet.

import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';
import { toast } from './share.js';
import { tagLines } from './cards.js';
import { makePostcard, pictureSize, caption, drawBand, saveBlob, PICTURE_PRESETS } from './printcompose.js';

export const SHAPES = Object.keys(PICTURE_PRESETS);
/**
 * The lens (internal #397): the camera's vertical field of view, in degrees. 45 is the map's own
 * (scene/renderer.js). 15 is a long lens that flattens a planet against its moons; 75 takes in
 * a horizon. Put back when photo mode is left.
 */
export const LENS = { min: 15, max: 75, step: 1 };
/** A lens inside the range, or the map's own when it is not a number. Pure. */
export function clampLens(deg, own = 45) {
  const v = Number(deg);
  return Number.isFinite(v) ? Math.min(LENS.max, Math.max(LENS.min, Math.round(v))) : own;
}
const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_DPR = 2;

/**
 * The frame on a screen of viewW x viewH: the largest box of the shape that fits inside the
 * margins, CENTRED (the camera looks through the middle of the screen, and so must the picture).
 * `fovScale` is its share of the screen's height. Pure.
 */
export function frameRect(viewW, viewH, shape, margin = { x: 16, y: 16 }) {
  const [pw, ph] = PICTURE_PRESETS[shape] || PICTURE_PRESETS['1:1'];
  const a = pw / ph;
  const vw = Math.max(1, Number(viewW) || 1);
  const vh = Math.max(1, Number(viewH) || 1);
  const maxW = Math.max(1, vw - 2 * margin.x);
  const maxH = Math.max(1, vh - 2 * margin.y);
  let w = maxW;
  let h = w / a;
  if (h > maxH) { h = maxH; w = h * a; }
  w = Math.round(w);
  h = Math.round(h);
  return { x: Math.round((vw - w) / 2), y: Math.round((vh - h) / 2), w, h, fovScale: h / vh };
}

/** Can this browser hand a picture file to the device's share sheet? Pure on what it is given. */
export function canShareFiles(nav) {
  if (!nav || typeof nav.share !== 'function' || typeof nav.canShare !== 'function' || typeof File === 'undefined') return false;
  try { return nav.canShare({ files: [new File([''], 'x.jpg', { type: 'image/jpeg' })] }) === true; } catch { return false; }
}

/**
 * Hand a made picture (`{blob, name}` from makePostcard) to the device: 'shared', 'dismissed' when
 * the visitor closed the sheet (an answer, nothing more is done), or 'saved' when the device would
 * not take the file after all (a gesture that expired while the picture was drawn): the picture is
 * then saved, so the press is never lost. Only the file is shared: no text, no link, no place.
 */
export async function sharePicture(nav, made, save) {
  const file = new File([made.blob], made.name, { type: made.blob.type || 'image/jpeg' });
  try {
    if (!nav.canShare({ files: [file] })) throw new Error('refused');
    await nav.share({ files: [file] });
    return 'shared';
  } catch (e) {
    if (e && e.name === 'AbortError') return 'dismissed';
    save(made.blob, made.name);
    return 'saved';
  }
}

// Lucide (ISC), docs/ui-guide.md §3.16.
const ICONS = {
  x: ['M18 6 6 18', 'm6 6 12 12'],
  download: ['M12 15V3', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5'],
};

function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of [['viewBox', '0 0 24 24'], ['width', '20'], ['height', '20'], ['fill', 'none'], ['stroke', 'currentColor'],
    ['stroke-width', '1.75'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true'], ['focusable', 'false']]) svg.setAttribute(k, v);
  for (const d of ICONS[name] || []) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
  return n;
}

function button(className, label, title, iconName) {
  const b = el('button', className);
  b.type = 'button';
  if (iconName) b.appendChild(icon(iconName));
  if (label) b.appendChild(el('span', 'sr-photo__label', label));
  if (title) b.title = title;
  return b;
}

let current = null;

export function openPhotoMode(ctx, opts = {}) {
  if (current) current.close();
  const P = COPY.photo;
  const record = opts.record !== undefined ? opts.record : ctx && typeof ctx.selected === 'function' ? ctx.selected() : null;
  const clean = ctx && ctx.cleanView;
  const wasClean = !!(clean && clean.isOn());
  let shape = SHAPES.includes(opts.shape) ? opts.shape : '1:1';
  let withCaption = opts.caption !== false;
  let asPng = opts.format === 'png';
  const cam = ctx && ctx.camera;
  const ownFov = cam && Number.isFinite(cam.fov) ? cam.fov : null;
  let rect = null;
  let busy = false;
  let open = true;

  const root = el('div', 'sr-photo sr-over-clean');
  root.id = 'sr-photo';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', P.title);
  const mattes = ['top', 'bottom', 'left', 'right'].map((side) => el('div', `sr-photo__matte sr-photo__matte--${side}`));
  const frame = el('div', 'sr-photo__frame');
  const band = el('canvas', 'sr-photo__band');
  band.setAttribute('aria-hidden', 'true');
  frame.appendChild(band);

  const bar = el('div', 'sr-photo__bar sr-float');
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', P.barLabel);
  const shapes = el('div', 'sr-photo__shapes');
  shapes.setAttribute('role', 'group');
  shapes.setAttribute('aria-label', P.shapesLabel);
  const shapeBtns = SHAPES.map((id) => {
    const b = button('sr-photo__seg', P.shapes[id], t(P.shapeTitle, { shape: P.shapes[id] }), '');
    b.dataset.shape = id;
    b.addEventListener('click', () => { shape = id; paint(); });
    shapes.appendChild(b);
    return b;
  });
  // The lens: a slider, because a field of view is a quantity and the picture answers as it moves.
  const lens = el('label', 'sr-photo__lens');
  const lensWord = el('span', 'sr-photo__label', P.lens);
  const lensInput = el('input', 'sr-photo__range');
  lensInput.type = 'range';
  lensInput.min = String(LENS.min);
  lensInput.max = String(LENS.max);
  lensInput.step = String(LENS.step);
  lensInput.value = String(clampLens(ownFov, 45));
  const lensOut = el('span', 'sr-photo__lensval sr-num');
  lens.append(lensWord, lensInput, lensOut);
  lens.hidden = ownFov === null;
  const setLens = (deg) => {
    if (!cam || ownFov === null) return;
    cam.fov = clampLens(deg, ownFov);
    if (typeof cam.updateProjectionMatrix === 'function') cam.updateProjectionMatrix();
    paint();
  };
  lensInput.addEventListener('input', () => setLens(lensInput.value));
  // The clock, inside the frame (internal #397): the time pill is hidden with the rest of the chrome,
  // so two steps of the pill's own unit are here. The picture's strip carries the instant it shows.
  const pill = ctx && ctx.timePill && typeof ctx.timePill.step === 'function' ? ctx.timePill : null;
  const timeBox = el('div', 'sr-photo__time');
  timeBox.setAttribute('role', 'group');
  timeBox.setAttribute('aria-label', P.timeLabel);
  const stepTitle = (dir) => t(P.timeTitle, { dir: dir < 0 ? P.earlier : P.later, unit: pill && typeof pill.unit === 'function' ? (COPY.timePill.unitWords[pill.unit()] || '') : '' }).trim();
  const earlierBtn = button('sr-photo__btn', P.earlier, '', '');
  const laterBtn = button('sr-photo__btn', P.later, '', '');
  earlierBtn.addEventListener('click', () => { pill.step(-1); setTimeout(paint, 60); });
  laterBtn.addEventListener('click', () => { pill.step(1); setTimeout(paint, 60); });
  timeBox.append(earlierBtn, laterBtn);
  timeBox.hidden = !pill;
  const captionBtn = button('sr-photo__btn', P.caption, P.captionTitle, '');
  captionBtn.addEventListener('click', () => { withCaption = !withCaption; paint(); });
  // PNG: the same picture without JPEG's loss, for somebody who will edit it. Off by default: it is several times the bytes.
  const pngBtn = button('sr-photo__btn', P.png, P.pngTitle, '');
  pngBtn.addEventListener('click', () => { asPng = !asPng; paint(); });
  const saveBtn = button('sr-photo__btn sr-photo__save', P.save, P.saveTitle, 'download');
  const closeBtn = button('sr-photo__close', '', P.done, 'x');
  closeBtn.setAttribute('aria-label', P.done);
  // The device's own share, straight from the frame (internal #397): built only where the browser
  // can hand a file on (navigator.canShare), so a desktop without it has no dead button.
  const shareBtn = canShareFiles(typeof navigator !== 'undefined' ? navigator : null) ? button('sr-photo__btn sr-photo__share', P.share, P.shareTitle, '') : null;
  bar.append(shapes, lens, timeBox, captionBtn, pngBtn, ...(shareBtn ? [shareBtn] : []), saveBtn, closeBtn);
  root.append(...mattes, frame, bar);
  document.body.appendChild(root);

  function words() {
    let name = null;
    try { name = record ? tagLines(record, ctx).name : null; } catch { name = null; }
    return caption(ctx, record, ctx && ctx.trip && ctx.trip.state, name, { honesty: true });
  }

  /** The frame where the bar leaves it room, and the strip in it exactly as the picture will carry it. */
  function paint() {
    if (!open) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Centred, so the room the bar takes at the foot is given up at the top as well.
    const foot = vh - bar.getBoundingClientRect().top;
    rect = frameRect(vw, vh, shape, { x: 16, y: Math.max(16, Math.round(foot) + 16) });
    for (const [k, v] of [['x', rect.x], ['y', rect.y], ['w', rect.w], ['h', rect.h]]) root.style.setProperty(`--sr-photo-${k}`, `${v}px`);
    for (const b of shapeBtns) b.setAttribute('aria-pressed', b.dataset.shape === shape ? 'true' : 'false');
    if (pill) {
      earlierBtn.title = stepTitle(-1);
      laterBtn.title = stepTitle(1);
    }
    captionBtn.setAttribute('aria-pressed', withCaption ? 'true' : 'false');
    pngBtn.setAttribute('aria-pressed', asPng ? 'true' : 'false');
    saveBtn.title = asPng ? P.saveTitlePng : P.saveTitle;
    if (cam && ownFov !== null) {
      const deg = clampLens(cam.fov, ownFov);
      if (lensInput.value !== String(deg)) lensInput.value = String(deg);
      const text = t(P.lensValue, { n: String(deg) });
      if (lensOut.textContent !== text) lensOut.textContent = text;
      lensInput.setAttribute('aria-label', t(P.lensTitle, { n: String(deg) }));
      lens.title = lensInput.getAttribute('aria-label');
    }
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    band.width = Math.round(rect.w * dpr);
    band.height = Math.round(rect.h * dpr);
    const g = band.getContext('2d');
    if (g) {
      g.clearRect(0, 0, band.width, band.height);
      if (withCaption) drawBand(g, words(), { w: band.width, h: band.height });
    }
  }

  async function save() {
    if (busy || !rect) return;
    busy = true;
    saveBtn.disabled = true;
    toast(P.making, 0);
    try {
      const made = await makePostcard(ctx, asPng ? 'png' : 'jpeg', {
        record, withTag: false, size: pictureSize(shape), fovScale: rect.fovScale, caption: withCaption, honesty: true,
      });
      toast(P.saved);
      if (ctx) ctx.lastPhoto = { ...made.out, shape, caption: withCaption, fovScale: rect.fovScale, lens: cam ? cam.fov : null };
    } catch (e) {
      toast(P.failed, 4000);
      if (ctx) ctx.lastPhoto = { error: String((e && e.message) || e) };
    } finally {
      busy = false;
      saveBtn.disabled = false;
    }
  }
  saveBtn.addEventListener('click', save);

  /** The same composed picture handed to the device's share sheet; saved instead when the device refuses it. */
  async function share() {
    if (busy || !rect) return;
    busy = true;
    saveBtn.disabled = true;
    if (shareBtn) shareBtn.disabled = true;
    toast(P.making, 0);
    let made = null;
    try {
      made = await makePostcard(ctx, asPng ? 'png' : 'jpeg', {
        record, withTag: false, size: pictureSize(shape), fovScale: rect.fovScale, caption: withCaption, honesty: true, save: false,
      });
      const via = await sharePicture(navigator, made, saveBlob);
      toast(via === 'saved' ? P.sharedSaved : '', via === 'saved' ? 4000 : 1);
      if (ctx) ctx.lastPhoto = { ...made.out, shape, caption: withCaption, fovScale: rect.fovScale, lens: cam ? cam.fov : null, via };
    } catch (e) {
      toast(P.failed, 4000);
      if (ctx) ctx.lastPhoto = { error: String((e && e.message) || e) };
    } finally {
      busy = false;
      saveBtn.disabled = false;
      if (shareBtn) shareBtn.disabled = false;
    }
  }
  if (shareBtn) shareBtn.addEventListener('click', share);

  const onClean = (e) => { if (open && e && e.detail && e.detail.on === false) close(true); };
  // The instant in the strip is the clock's: once a second is as often as its minute can change.
  const tick = setInterval(() => { if (withCaption) paint(); }, 1000);

  function close(cleanAlreadyOff = false) {
    if (!open) return;
    open = false;
    clearInterval(tick);
    window.removeEventListener('resize', paint);
    window.removeEventListener('sr:clean', onClean);
    root.remove();
    // The lens was photo mode's: the map gets its own back.
    if (cam && ownFov !== null && cam.fov !== ownFov) { cam.fov = ownFov; if (typeof cam.updateProjectionMatrix === 'function') cam.updateProjectionMatrix(); }
    if (current === api) current = null;
    if (clean && !wasClean && !cleanAlreadyOff) clean.set(false);
    const back = opts.opener;
    if (back && back.isConnected && typeof back.focus === 'function') back.focus({ preventScroll: true });
  }
  closeBtn.addEventListener('click', () => close());

  if (clean) clean.set(true);
  window.addEventListener('sr:clean', onClean);
  window.addEventListener('resize', paint);
  paint();
  saveBtn.focus({ preventScroll: true });

  const api = { close: () => close(), save, state: () => ({ open, shape, caption: withCaption, rect, words: withCaption ? words() : null, format: asPng ? 'png' : 'jpeg', lens: cam ? cam.fov : null }), setLens, root };
  current = api;
  if (ctx) ctx.photo = api;
  return api;
}
