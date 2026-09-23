// ui/postcard.js -- a picture of what the visitor sees, with the card's own caption (spec 0033).
//
// Imported on the first tap of "Save a picture" (ui/share.js), never at boot.
//
// A PICTURE OUTLIVES ITS CONTEXT (spec 0017, 2026-09). A screenshot of the map travels without the
// card that says the position is worked out from elements three days old, or that the model is a
// class default and not this spacecraft. So the postcard carries the card's own lines under the
// picture: the name, where and when, the first sentence, the class-and-age line and the sources,
// every one read from ui/cards.js (cardWords), so the picture can never state a number the card
// does not. tests/test_share.mjs compares them string for string.
//
// THE LAYOUT. 1080 x 1350, the portrait ratio phones and feeds share: the frame is the top
// 1080 x 1080, untouched (no vignette, no logo over the image), and the caption is an opaque band
// of the map's own background from 1080 down, with "spaceradar.ai" small at its right edge. The
// same band routine makes every trip's 1200 x 630 preview (ogPicture, scripts/shots.mjs), so the
// page and CI share one composer and one font.
//
// THE FONT is the page's own stack read off <body>, not a web font: a canvas cannot wait for a face
// to load, and a caption that fell back to Times on one phone in ten is worse than the system face.

import { COPY, t, timeText } from '../copy/en.js';
import { cardWords } from './cards.js';
import { toast } from './share.js';

export const PC_W = 1080;
export const PC_H = 1350;
export const BAND_H = 270;
export const OG_W = 1200;
export const OG_H = 630;
// The lower fifth, as spec 0033 req 6 puts it.
export const OG_BAND_H = 126;

const FALLBACK_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const FALLBACK_COLOURS = { space: '#0b0e14', fg: '#e8ecf2', dim: '#9aa4b2' };

function pageFont() {
  try {
    const f = getComputedStyle(document.body).fontFamily;
    return f && f.trim() ? f : FALLBACK_FONT;
  } catch {
    return FALLBACK_FONT;
  }
}

function pageColours() {
  const out = { ...FALLBACK_COLOURS };
  try {
    const css = getComputedStyle(document.documentElement);
    for (const [key, name] of [['space', '--sr-space'], ['fg', '--sr-text'], ['dim', '--sr-text-dim']]) {
      const v = css.getPropertyValue(name).trim();
      if (v) out[key] = v;
    }
  } catch {
    /* node, or a page without the stylesheet: the palette's own values above */
  }
  return out;
}

/** "23 Sep 2026, 14:05 UTC": the instant the sky in the picture is from. */
export function whenLine(ms) {
  if (!Number.isFinite(ms)) return '';
  return t(COPY.share.when, { date: timeText.utcDate(ms), time: timeText.utcTime(ms).slice(0, 5) });
}

/**
 * The five caption lines and the mark, as strings. Every line with a record is the card's own
 * (ui/cards.js cardWords). A stop with no record -- a place, not an object -- captions itself with
 * the trip's title and the stop's title, and claims nothing it could be wrong about.
 */
export function postcardCaption(record, ctx, tripState) {
  const nowMs = ctx && ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : NaN;
  if (!record) {
    return {
      name: (tripState && tripState.tourTitle) || COPY.app.name,
      where: whenLine(nowMs),
      sentence: (tripState && tripState.stopTitle) || '',
      honesty: '',
      sources: '',
      mark: COPY.share.mark,
    };
  }
  const w = cardWords(record, ctx);
  const row = w.rows[0];
  const where = [row ? t(COPY.share.row, { label: row[0], value: row[1] }) : '', whenLine(Number.isFinite(w.tMs) ? w.tMs : nowMs)]
    .filter(Boolean)
    .join(COPY.punctuation.separator);
  return {
    name: w.klass ? w.name + COPY.punctuation.separator + w.klass : w.name,
    where,
    sentence: w.sentence,
    honesty: w.honesty,
    sources: w.sources,
    mark: COPY.share.mark,
  };
}

// ------------------------------------------------------------------------------- the layout

/** Words into lines no wider than `max`, at most `maxLines`; a cut ends in an ellipsis. */
export function wrap(text, max, width, maxLines) {
  const ell = COPY.punctuation.ellipsis;
  let lines = [];
  let line = '';
  for (const word of String(text || '').split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (!line || width(next) <= max) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (/\s/.test(last) && width(last + ell) > max) last = last.replace(/\s+\S+$/, '');
    lines[maxLines - 1] = last + ell;
  }
  // A single word wider than the band is cut by characters rather than running off it.
  return lines.map((l) => {
    let cut = l;
    while (cut.length > 1 && width(cut) > max) cut = cut.slice(0, cut.endsWith(ell) ? -2 : -1) + ell;
    return cut;
  });
}

// Each block: size in px, weight, colour key, line height, most lines, fewest it may be cut to.
const POSTCARD_BLOCKS = [
  { key: 'name', size: 34, weight: 600, colour: 'fg', lh: 1.2, max: 1, min: 1, gap: 2 },
  { key: 'where', size: 20, weight: 400, colour: 'dim', lh: 1.3, max: 1, min: 1, gap: 6 },
  { key: 'sentence', size: 26, weight: 400, colour: 'fg', lh: 1.25, max: 3, min: 1, gap: 6 },
  { key: 'honesty', size: 18, weight: 400, colour: 'dim', lh: 1.3, max: 2, min: 1, gap: 2 },
  // Two lines: a world's sources name four publications, and one line cut them at the second.
  { key: 'sources', size: 18, weight: 400, colour: 'dim', lh: 1.3, max: 2, min: 1, gap: 0 },
];

// Sized so a two-line blurb fits the 126 px band: at 32/21 px with 20 px padding every blurb
// longer than one line was cut to one with an ellipsis (read in the first local render, 2026-09-23).
const OG_BLOCKS = [
  { key: 'title', size: 30, weight: 600, colour: 'fg', lh: 1.2, max: 1, min: 1, gap: 4 },
  { key: 'blurb', size: 19, weight: 400, colour: 'dim', lh: 1.25, max: 2, min: 1, gap: 0 },
];

/**
 * Where every caption line goes, as {text, x, y, font, colour, align} with y the baseline. Pure:
 * `measure(text, font)` is the only thing it asks of a canvas, so a test can hold it in node.
 * Lines are taken from the sentence first, then the sources, and the honesty line last when the
 * band runs out, because the honesty line is the reason the caption exists.
 */
export function layoutCaption(caption, box, measure, blocks = POSTCARD_BLOCKS, fontFamily = FALLBACK_FONT) {
  const pad = box.pad;
  const markFont = `400 ${box.markSize}px ${fontFamily}`;
  const markW = caption.mark ? measure(caption.mark, markFont) : 0;
  const inner = box.width - 2 * pad;
  const cut = blocks.map((b) => ({ ...b, lines: [] }));
  const fontOf = (b) => `${b.weight} ${b.size}px ${fontFamily}`;
  const lay = () => {
    for (const b of cut) {
      // The last block shares its line with the mark, so it is narrower by the mark and a gap.
      const room = b === cut[cut.length - 1] && markW ? inner - markW - pad : inner;
      b.lines = caption[b.key] ? wrap(caption[b.key], room, (s) => measure(s, fontOf(b)), b.max) : [];
    }
    return cut.reduce((h, b) => h + (b.lines.length ? b.lines.length * b.size * b.lh + b.gap : 0), 0);
  };
  const room = box.height - 2 * pad;
  let used = lay();
  for (const key of ['sentence', 'sources', 'honesty', 'blurb']) {
    const b = cut.find((x) => x.key === key);
    while (b && used > room && b.max > b.min) {
      b.max -= 1;
      used = lay();
    }
  }
  const out = [];
  let y = box.top + pad;
  // The mark shares the LAST block's last line (laid narrower for it above); with that block
  // empty it sits on the band's own foot instead of over a full-width line.
  let markBaseline = box.top + box.height - pad;
  for (const b of cut) {
    if (!b.lines.length) continue;
    for (const text of b.lines) {
      const lineH = b.size * b.lh;
      y += lineH;
      // The baseline sits a fifth of the line height above the line's foot, for descenders.
      const baseline = Math.round(y - lineH * 0.2);
      out.push({ key: b.key, text, x: box.left + pad, y: baseline, font: fontOf(b), colour: b.colour, align: 'left' });
      if (b === cut[cut.length - 1]) markBaseline = baseline;
    }
    y += b.gap;
  }
  if (caption.mark) {
    out.push({ key: 'mark', text: caption.mark, x: box.left + box.width - pad, y: markBaseline, font: markFont, colour: 'dim', align: 'right' });
  }
  return out;
}

// ------------------------------------------------------------------------------ the composer

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * The picture and its band on one canvas. `frame` is any drawable (the canvas renderTo() returns);
 * it is scaled to cover the picture area and centred, never stretched. Synchronous; returns
 * { canvas, lines, band } so a test can read the layout it drew.
 */
export function composeCard(frame, caption, spec, opts = {}) {
  const create = opts.createCanvas || makeCanvas;
  const colours = opts.colours || pageColours();
  const fontFamily = opts.fontFamily || (typeof document !== 'undefined' ? pageFont() : FALLBACK_FONT);
  const canvas = create(spec.width, spec.height);
  const g = canvas.getContext('2d');
  const picH = spec.height - spec.bandH;
  if (frame && frame.width > 0 && frame.height > 0) {
    const s = Math.max(spec.width / frame.width, picH / frame.height);
    const sw = spec.width / s;
    const sh = picH / s;
    g.drawImage(frame, (frame.width - sw) / 2, (frame.height - sh) / 2, sw, sh, 0, 0, spec.width, picH);
  }
  g.fillStyle = colours.space;
  g.fillRect(0, picH, spec.width, spec.bandH);
  const measure = (text, font) => {
    g.font = font;
    return g.measureText(text).width;
  };
  const band = { left: 0, top: picH, width: spec.width, height: spec.bandH, pad: spec.pad, markSize: spec.markSize };
  const lines = layoutCaption(caption, band, measure, spec.blocks, fontFamily);
  g.textBaseline = 'alphabetic';
  for (const line of lines) {
    g.font = line.font;
    g.fillStyle = colours[line.colour] || colours.fg;
    g.textAlign = line.align;
    g.fillText(line.text, line.x, line.y);
  }
  return { canvas, lines, band };
}

export const POSTCARD = { width: PC_W, height: PC_H, bandH: BAND_H, pad: 24, markSize: 18, blocks: POSTCARD_BLOCKS };
export const OG = { width: OG_W, height: OG_H, bandH: OG_BAND_H, pad: 16, markSize: 18, blocks: OG_BLOCKS };

/** The postcard: 1080 x 1350, the frame on top and the card's caption in the band. */
export function composePostcard(frame, caption, opts) {
  return composeCard(frame, caption, POSTCARD, opts);
}

export function pngOf(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob gave nothing'))), 'image/png');
  });
}

/** `space-radar-europa-2026-09-23.png`: what it is and the day the sky in it is from. */
export function fileName(id, ms) {
  const safe = String(id || 'view').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'view';
  const date = Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : 'now';
  return t(COPY.share.fileName, { id: safe, date });
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
  // Long enough for the browser to have started the save; a blob URL is memory until revoked.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Make the postcard and hand it over: the share sheet as a FILE where the device can take one
 * (navigator.canShare({files})), a download everywhere else. Nothing is uploaded anywhere.
 * `url` is the view's link, put in the share text so a picture sent on still leads back.
 */
export async function savePostcard(ctx, record, url) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const api = ctx && ctx.rendererApi;
  // The picture area is square (1080 x 1080), so that is the size the frame is drawn at.
  const frame = api && typeof api.renderTo === 'function' ? api.renderTo(PC_W, PC_H - BAND_H) : null;
  if (!frame) throw new Error('no frame: the map is not drawing');
  const tripState = ctx.trip && ctx.trip.state;
  const caption = postcardCaption(record, ctx, tripState);
  const { canvas } = composePostcard(frame, caption);
  const blob = await pngOf(canvas);
  const id = record ? record.id : tripState && tripState.tourId;
  const name = fileName(id, ctx.clock && ctx.clock.now());
  const text = [caption.sentence, url].filter(Boolean).join(' ');
  let via = 'download';
  let file = null;
  try {
    file = new File([blob], name, { type: 'image/png' });
  } catch {
    file = null;
  }
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  if (file && typeof nav.canShare === 'function' && typeof nav.share === 'function' && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: caption.name, text });
      via = 'share';
    } catch (e) {
      // Dismissed is an answer. Anything else (the tap's activation ran out while the PNG was
      // encoding, on a slow phone) still gets the picture, as a download.
      if (e && e.name === 'AbortError') via = 'dismissed';
      else download(blob, name);
    }
  } else download(blob, name);
  toast(via === 'download' ? COPY.share.saved : null);
  const ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
  ctx.lastPostcard = { caption, bytes: blob.size, width: canvas.width, height: canvas.height, fileName: name, via, ms };
  return ctx.lastPostcard;
}

/**
 * A trip's preview picture, 1200 x 630: the frame as it is now, and the trip's title and blurb in
 * the lower fifth. scripts/shots.mjs calls this in the page at a trip's first stop and writes the
 * PNG to site/og/<id>.png; the root's site/og/default.png is the same with the app's own words.
 */
export async function ogPicture(ctx, words) {
  const api = ctx && ctx.rendererApi;
  const frame = api && typeof api.renderTo === 'function' ? api.renderTo(OG_W, OG_H - OG_BAND_H) : null;
  if (!frame) throw new Error('no frame: the map is not drawing');
  const caption = { title: words.title, blurb: words.blurb, mark: COPY.share.mark };
  const { canvas } = composeCard(frame, caption, OG);
  return pngOf(canvas);
}
