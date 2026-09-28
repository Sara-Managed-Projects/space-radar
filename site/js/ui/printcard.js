// ui/printcard.js -- the screen as a printable postcard: a JPEG, or a PDF sized for a print shop.
//
// Contract: createPrintButton(ctx) -> { open(), close(), save(format) }
// Also exported, pure, for the test: printSize(aspect), caption(ctx, record, tripState),
//   pdfFromJpeg(jpegBytes, pxW, pxH, ptW, ptH) -> Uint8Array
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

import { COPY, t } from '../copy/en.js';
import { toast } from './share.js';

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

// ------------------------------------------------------------------------------ the picture

function compose(frame, words, size) {
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
  return canvas;
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

// -------------------------------------------------------------------------------- the button

export function createPrintButton(ctx) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sr-print-toggle sr-over-clean';
  button.setAttribute('aria-label', COPY.print.button);
  button.title = COPY.print.button;
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  // A camera, ours: body, lens and the viewfinder bump. 24-unit box, stroked.
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '22');
  svg.setAttribute('height', '22');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M3 8h4l2-3h6l2 3h4v11H3Z M12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  button.appendChild(svg);

  const menu = document.createElement('div');
  menu.className = 'sr-print-menu sr-over-clean';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  const item = (label, format) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.textContent = label;
    b.addEventListener('click', () => { close(); save(format); });
    menu.appendChild(b);
    return b;
  };
  const note = document.createElement('p');
  note.className = 'sr-print-menu__note';
  note.textContent = COPY.print.note;
  menu.appendChild(note);
  const first = item(COPY.print.jpeg, 'jpeg');
  item(COPY.print.pdf, 'pdf');

  function open() {
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    first.focus();
  }
  function close() {
    if (menu.hidden) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }
  button.addEventListener('click', () => (menu.hidden ? open() : close()));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { e.stopPropagation(); close(); button.focus(); } }, true);
  document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !menu.contains(e.target) && !button.contains(e.target)) close(); });

  let busy = false;
  async function save(format) {
    if (busy) return null;
    busy = true;
    toast(COPY.print.making, 0);
    const t0 = performance.now();
    try {
      const api = ctx && ctx.rendererApi;
      const canvas = ctx && ctx.renderer && ctx.renderer.domElement;
      const aspect = canvas && canvas.clientHeight > 0 ? canvas.clientWidth / canvas.clientHeight : 1.5;
      const size = printSize(aspect);
      const frame = api && typeof api.renderTo === 'function' ? api.renderTo(size.w, size.h) : null;
      if (!frame) throw new Error('no frame: the map is not drawing');
      const record = ctx && typeof ctx.selected === 'function' ? ctx.selected() : null;
      const words = caption(ctx, record, ctx && ctx.trip && ctx.trip.state);
      const picture = compose(frame, words, size);
      const jpeg = await blobOf(picture, 'image/jpeg', JPEG_QUALITY);
      const nowMs = ctx && ctx.clock ? ctx.clock.now() : Date.now();
      let blob = jpeg;
      if (format === 'pdf') {
        const bytes = new Uint8Array(await jpeg.arrayBuffer());
        blob = new Blob([pdfFromJpeg(bytes, size.w, size.h, size.ptW, size.ptH)], { type: 'application/pdf' });
      }
      const name = fileName(words, nowMs, format === 'pdf' ? 'pdf' : 'jpg');
      download(blob, name);
      toast(COPY.print.saved);
      const out = { format, bytes: blob.size, width: size.w, height: size.h, fileName: name, words, ms: Math.round(performance.now() - t0) };
      if (ctx) ctx.lastPrint = out;
      return out;
    } catch (e) {
      toast(COPY.print.failed);
      if (ctx) ctx.lastPrint = { error: String((e && e.message) || e) };
      return null;
    } finally {
      busy = false;
    }
  }

  document.body.appendChild(button);
  document.body.appendChild(menu);
  const api = { open, close, save };
  if (ctx) ctx.printCard = api;
  return api;
}
