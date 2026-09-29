// ui/printcompose.js -- the postcard's picture: the size, the caption, the tag, the JPEG and the PDF.
//
// Loaded on the first save, never at boot (ui/printcard.js holds only the button and its menu):
// 20 kB that a visitor who never prints does not download (2026-09-29, the first-visit budget).
//
// Contract: makePostcard(ctx, format, opts) -> { blob, name, out }
// Also exported, pure, for the test: printSize(aspect), caption(ctx, record, tripState),
//   pdfFromJpeg(jpegBytes, pxW, pxH, ptW, ptH) -> Uint8Array,
//   tagText(lines, behind), printTag(lines, at, size, measure) (spec 0047 task 3)
//
// WHY. Ivan, 2026-09-28: "postcards of space on click, where current screen will be as postcard
// which is possible to print then (could be downloaded in PDF or JPEG)". Spec 0033's "Save a
// picture" is a 1080 x 1350 card about ONE object, made for a phone's share sheet. This is the
// other thing: whatever is on screen, at print resolution, full bleed, in the orientation of the
// screen, as a file a print shop or a home printer takes.
//
// THE SIZE. The standard postcard, 6 x 4 inches, at 300 dots per inch: 1800 x 1200 px landscape
// (1200 x 1800 on a portrait phone). The scene is re-rendered at that size (scene/renderer.js
// renderTo), not upscaled from the screen, so a print is as sharp as the textures allow. Labels and
// panels are HTML over the canvas and are not in it: the picture is the scene alone, which is what
// the clean view (ui/cleanview.js) shows too.
//
// THE CAPTION is a slim band inside the picture's lower edge, over a darkening that keeps it
// readable on a bright Earth: what it is (the card's own name for the selection, or the trip and
// its stop, or the app), when the sky is from, and "spaceradar.ai". A picture outlives its context
// (spec 0017), so the instant is always there.
//
// THE PDF is written here, by hand: one page of exactly 6 x 4 in (432 x 288 pt), one JPEG image
// XObject (DCTDecode, so the JPEG bytes go in unchanged) drawn to fill it. PDF 1.4 needs no more
// than five objects for that, and a library would be 300 kB for a file this function makes in 60
// lines. Nothing is uploaded; the file is saved on the device.
//
// WITH THE TAG (spec 0047 req 11, off by default). The HUD's brackets and tag are HTML over the
// canvas, so a print leaves them out. Ticked, the picture carries the selection's brackets and its
// tag, drawn onto the image in the same words: the three lines come from ui/cards.js tagLines(),
// the one author of words about an object, and the placement is ui/hud.js tagPlacement(), so the
// tag flips at the print's edges as it does on the screen. Where the selection is off the picture
// there is nothing to draw, and nothing is.

import { COPY, t } from '../copy/en.js';
import { tagLines } from './cards.js';
import { tagPlacement, reticleBox, LEADER_PX } from './hud.js';

export const PRINT_DPI = 300;
export const PRINT_LONG_IN = 6;
export const PRINT_SHORT_IN = 4;
const JPEG_QUALITY = 0.92;
const SVG_NS = 'http://www.w3.org/2000/svg';

/** Landscape unless the screen is portrait: {w, h} in px at 300 dpi and {ptW, ptH} in points. */
export function printSize(aspect) {
  const portrait = Number.isFinite(aspect) && aspect < 1;
  const long = PRINT_LONG_IN * PRINT_DPI;
  const short = PRINT_SHORT_IN * PRINT_DPI;
  const inW = portrait ? PRINT_SHORT_IN : PRINT_LONG_IN;
  const inH = portrait ? PRINT_LONG_IN : PRINT_SHORT_IN;
  return { w: portrait ? short : long, h: portrait ? long : short, ptW: inW * 72, ptH: inH * 72, portrait };
}

function whenText(ms) {
  if (!Number.isFinite(ms)) return '';
  const iso = new Date(ms).toISOString();
  return t(COPY.print.when, { date: iso.slice(0, 10), time: iso.slice(11, 16) });
}

/** The band's two lines. The selection's own name, else the trip and its stop, else the app. */
export function caption(ctx, record, tripState) {
  const nowMs = ctx && ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : NaN;
  let title = COPY.app.name;
  if (record && (record.name || record.id)) title = String(record.name || record.id);
  else if (tripState && tripState.tourTitle && tripState.phase && tripState.phase !== 'idle') {
    title = tripState.stopTitle ? `${tripState.tourTitle}${COPY.punctuation.separator}${tripState.stopTitle}` : tripState.tourTitle;
  }
  return { title, when: whenText(nowMs), mark: COPY.print.mark };
}

// ------------------------------------------------------------------------------------ the PDF

function latin1(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}

/**
 * A one-page PDF 1.4 whose page is ptW x ptH points and holds the JPEG, full bleed. The JPEG is
 * embedded as it is (DCTDecode). Pure: bytes in, bytes out.
 */
export function pdfFromJpeg(jpeg, pxW, pxH, ptW, ptH) {
  const parts = [];
  const offsets = [];
  let length = 0;
  const push = (chunk) => {
    const bytes = typeof chunk === 'string' ? latin1(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const obj = (n, body) => {
    offsets[n] = length;
    push(`${n} 0 obj\n${body}\nendobj\n`);
  };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  push(jpeg);
  push('\nendstream\nendobj\n');
  const draw = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
  const xref = length;
  let table = 'xref\n0 6\n0000000000 65535 f \n';
  for (let n = 1; n <= 5; n++) table += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(length);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

// ------------------------------------------------------------------------------ the tag

/**
 * The tag's three lines as the print draws them: the name, the readouts joined as the screen shows
 * them (units in capitals, as the tag's CSS sets them), and the honesty line with its first letter
 * raised. Every word is tagLines()'s; `behind` adds the HUD's "behind Earth".
 */
export function tagText(lines, behind = null) {
  if (!lines) return null;
  const readouts = lines.readouts.map((r) => `${r.num} ${String(r.unit).toUpperCase()}${r.suffix ? ' ' + r.suffix : ''}`);
  if (behind) readouts.push(behind);
  const h = String(lines.honesty || '');
  return { name: lines.name, readouts: readouts.join(COPY.punctuation.separator), honesty: h ? h[0].toUpperCase() + h.slice(1) : '' };
}

/**
 * Where the brackets and the tag go on a print of `size`, and how big. `at` is the selection on the
 * live screen: {ndc: {x, y}, behind, aspect, boxPx, viewH}. The print is drawn again with the same
 * vertical field of view at its own aspect (scene/renderer.js renderTo), so y maps straight across,
 * x is scaled by the ratio of the aspects, and a length scales by print height over screen height.
 * The type is a share of the print's short side, as the caption's is, so it reads in the hand.
 * `measure(text, px, weight)` gives a width in px (a 2D context's, or a fake in the test).
 *
 * @returns {null | {box: {x, y, side}, tag: {x, y, w, h, side, vert}, leader: [x0, y0, x1, y1], text, font: {name, line}}}
 */
export function printTag(lines, at, size, measure) {
  const text = tagText(lines, at && at.behind);
  if (!text || !at || !at.ndc || at.offscreen) return null;
  const sx = (Number(at.aspect) || size.w / size.h) / (size.w / size.h);
  const nx = at.ndc.x * sx;
  const ny = at.ndc.y;
  if (!(Math.abs(nx) <= 1 && Math.abs(ny) <= 1)) return null;
  const px = { x: ((nx + 1) / 2) * size.w, y: ((1 - ny) / 2) * size.h };
  const k = size.h / (Number(at.viewH) || size.h);
  // The screen's box when the HUD framed one, else the rule's minimum; scaled to the print.
  const side = Math.max(reticleBox(0), Number(at.boxPx) || 0) * k;
  const short = Math.min(size.w, size.h);
  const font = { name: Math.round(short * 0.03), line: Math.round(short * 0.024) };
  const pad = Math.round(font.line * 0.6);
  const w = Math.max(measure(text.name, font.name, 600), measure(text.readouts, font.line, 400), measure(text.honesty, font.line, 400)) + pad * 2;
  const h = font.name * 1.3 + font.line * 1.4 * 2 + pad * 2;
  const leader = LEADER_PX * k;
  const place = tagPlacement(px, side, { w, h }, size.w, size.h, leader, Math.round(short * 0.02));
  // The leader from the box's corner to the tag's nearest corner, at 45 degrees as on the screen.
  const cx = place.side === 'left' ? px.x - side / 2 : place.side === 'right' ? px.x + side / 2 : px.x;
  const cy = place.vert === 'up' ? px.y - side / 2 : px.y + side / 2;
  const tx = place.side === 'left' ? place.x + w : place.side === 'right' ? place.x : place.x + w / 2;
  const ty = place.vert === 'up' ? place.y + h : place.y;
  return { box: { x: px.x, y: px.y, side }, tag: { x: place.x, y: place.y, w, h, side: place.side, vert: place.vert, pad }, leader: [cx, cy, tx, ty], text, font, k, occluded: !!at.behind };
}

function drawTag(g, d, fontFamily) {
  const ember = '#ff9f43';
  const k = d.k;
  // The brackets: 8 px ticks, 1.5 px thick on the screen. On paper that scaled to 2 px at 300 dpi,
  // a sixth of a millimetre, and the first sample print lost them in the clouds (2026-09-29), so
  // the print draws them half as long again and twice as thick: still the screen's shape.
  const b = d.box;
  const half = b.side / 2;
  const tick = 12 * k;
  g.save();
  g.strokeStyle = ember;
  g.lineWidth = Math.max(3, 3 * k);
  g.globalAlpha = d.occluded ? 0.5 : 1; // behind a world: at half, as on the screen
  g.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = b.x + sx * half;
    const y = b.y + sy * half;
    g.moveTo(x - sx * tick, y);
    g.lineTo(x, y);
    g.lineTo(x, y - sy * tick);
  }
  g.stroke();
  g.globalAlpha = 0.6;
  g.lineWidth = Math.max(1, k);
  g.beginPath();
  g.moveTo(d.leader[0], d.leader[1]);
  g.lineTo(d.leader[2], d.leader[3]);
  g.stroke();
  g.globalAlpha = 1;
  // The tag on the full glass: a print has no blur behind it and may land on a bright cloud.
  const tg = d.tag;
  g.fillStyle = 'rgba(11,14,20,0.82)';
  g.fillRect(tg.x, tg.y, tg.w, tg.h);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#e8ecf2';
  g.font = `600 ${d.font.name}px ${fontFamily}`;
  let y = tg.y + tg.pad + d.font.name;
  g.fillText(d.text.name, tg.x + tg.pad, y);
  g.font = `400 ${d.font.line}px ${fontFamily}`;
  y += d.font.line * 1.4;
  g.fillText(d.text.readouts, tg.x + tg.pad, y);
  g.fillStyle = '#9aa4b2';
  y += d.font.line * 1.4;
  g.fillText(d.text.honesty, tg.x + tg.pad, y);
  g.restore();
}

// ------------------------------------------------------------------------------ the picture

function compose(frame, words, size, tag = null) {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const g = canvas.getContext('2d');
  g.fillStyle = '#0b0e14';
  g.fillRect(0, 0, size.w, size.h);
  if (frame) g.drawImage(frame, 0, 0, size.w, size.h);
  // The band: a darkening up from the lower edge, then two lines and the mark. Sizes are fractions
  // of the short side, so landscape and portrait read the same in the hand.
  const short = Math.min(size.w, size.h);
  const bandH = Math.round(short * 0.16);
  const grad = g.createLinearGradient(0, size.h - bandH, 0, size.h);
  grad.addColorStop(0, 'rgba(11,14,20,0)');
  grad.addColorStop(1, 'rgba(11,14,20,0.82)');
  g.fillStyle = grad;
  g.fillRect(0, size.h - bandH, size.w, bandH);
  let font = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  try { font = getComputedStyle(document.body).fontFamily || font; } catch { /* the default stack */ }
  const pad = Math.round(short * 0.04);
  const big = Math.round(short * 0.042);
  const small = Math.round(short * 0.026);
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#e8ecf2';
  g.font = `600 ${big}px ${font}`;
  g.textAlign = 'left';
  const maxW = size.w - pad * 3 - g.measureText(words.mark).width;
  let title = words.title;
  while (title.length > 4 && g.measureText(title).width > maxW) title = title.slice(0, -2);
  if (title !== words.title) title = title.trimEnd() + '…';
  g.fillText(title, pad, size.h - pad - small * 1.5);
  g.font = `400 ${small}px ${font}`;
  g.fillStyle = '#9aa4b2';
  g.fillText(words.when, pad, size.h - pad);
  g.textAlign = 'right';
  g.fillStyle = '#e8ecf2';
  g.fillText(words.mark, size.w - pad, size.h - pad);
  if (tag) drawTag(g, tag, font);
  return canvas;
}

/** The selection on the live screen, for printTag(); null when there is nothing to tag. */
function liveTagAt(ctx, record) {
  if (!ctx || !record || typeof ctx.positionOfRecord !== 'function' || !ctx.camera) return null;
  const p = ctx.positionOfRecord(record);
  if (!p || !Number.isFinite(p.x)) return null;
  const v = p.clone().applyMatrix4(ctx.camera.matrixWorldInverse);
  if (v.z >= 0) return { offscreen: true };
  v.applyMatrix4(ctx.camera.projectionMatrix);
  const st = ctx.hud && typeof ctx.hud.state === 'function' ? ctx.hud.state() : {};
  const el = ctx.renderer && ctx.renderer.domElement;
  return {
    ndc: { x: v.x, y: v.y },
    aspect: ctx.camera.aspect,
    boxPx: st && st.mode === 'on' && st.framing ? st.box : 0,
    viewH: el && el.clientHeight > 0 ? el.clientHeight : window.innerHeight,
    behind: st && st.occluded ? t(COPY.hud.behind, { world: COPY.worlds[st.occluded] || st.occluded }) : null,
  };
}

function blobOf(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob gave nothing'))), type, quality);
  });
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function fileName(words, ms, ext) {
  const id = String(words.title || 'view').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'view';
  const date = Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : 'now';
  return t(COPY.print.fileName, { id, date, ext });
}

/**
 * The whole picture, from the live scene: re-rendered at print size, captioned, tagged when asked,
 * as a JPEG or a one-page PDF, and saved on the device. Throws when there is no frame to print.
 */
export async function makePostcard(ctx, format, opts = {}) {
  const t0 = performance.now();
  const api = ctx && ctx.rendererApi;
  const canvas = ctx && ctx.renderer && ctx.renderer.domElement;
  const aspect = canvas && canvas.clientHeight > 0 ? canvas.clientWidth / canvas.clientHeight : 1.5;
  const size = printSize(aspect);
  const record = ctx && typeof ctx.selected === 'function' ? ctx.selected() : null;
  // Read on the live camera BEFORE renderTo(), which changes its aspect for the one print frame.
  const at = opts.withTag && record ? liveTagAt(ctx, record) : null;
  const frame = api && typeof api.renderTo === 'function' ? api.renderTo(size.w, size.h) : null;
  if (!frame) throw new Error('no frame: the map is not drawing');
  const words = caption(ctx, record, ctx && ctx.trip && ctx.trip.state);
  let tag = null;
  if (at) {
    const m = document.createElement('canvas').getContext('2d');
    let family = 'system-ui, sans-serif';
    try { family = getComputedStyle(document.body).fontFamily || family; } catch { /* the default */ }
    const measure = (text, px, weight) => { m.font = `${weight} ${px}px ${family}`; return m.measureText(text).width; };
    tag = printTag(tagLines(record, ctx), at, size, measure);
  }
  const picture = compose(frame, words, size, tag);
  const jpeg = await blobOf(picture, 'image/jpeg', JPEG_QUALITY);
  const nowMs = ctx && ctx.clock ? ctx.clock.now() : Date.now();
  let blob = jpeg;
  if (format === 'pdf') {
    const bytes = new Uint8Array(await jpeg.arrayBuffer());
    blob = new Blob([pdfFromJpeg(bytes, size.w, size.h, size.ptW, size.ptH)], { type: 'application/pdf' });
  }
  const name = fileName(words, nowMs, format === 'pdf' ? 'pdf' : 'jpg');
  download(blob, name);
  const out = { format, bytes: blob.size, width: size.w, height: size.h, fileName: name, words, tag: tag ? { text: tag.text, box: tag.box, place: tag.tag } : null, ms: Math.round(performance.now() - t0) };
  return { blob, name, out };
}
