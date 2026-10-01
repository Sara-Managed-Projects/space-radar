// ui/postcard.js -- a picture with a caption band, for a trip's link preview (spec 0033).
//
// Imported by scripts/shots.mjs inside the page, never by the app at boot. Until 2026-10-01 it also
// made the card's 1080 x 1350 "Save a picture"; the share sheet (ui/sharesheet.js, spec 0061 task 8)
// now hands out the print postcard instead (ui/printcompose.js), so one picture is shared, not two.
//
// THE LAYOUT. A frame on top, untouched (no vignette, no logo over the image), and an opaque band of
// the map's own background under it with the caption lines and "spaceradar.ai" small at the right.
// A trip's preview is 1200 x 630 with the band in the lower fifth.
//
// THE FONT is the page's own stack read off <body>, not a web font: a canvas cannot wait for a face
// to load, and a caption that fell back to Times on one phone in ten is worse than the system face.

import { COPY } from '../copy/en.js';

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
export function layoutCaption(caption, box, measure, blocks = OG_BLOCKS, fontFamily = FALLBACK_FONT) {
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

export const OG = { width: OG_W, height: OG_H, bandH: OG_BAND_H, pad: 16, markSize: 18, blocks: OG_BLOCKS };

export function pngOf(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob gave nothing'))), 'image/png');
  });
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
