// tests/test_postcard.mjs -- the postcard's composer, with a canvas stub in node (spec 0033).
//
//   node tests/test_postcard.mjs
//
// The composer is the part of the picture that can be wrong without a browser: where the frame
// goes, where the band starts, which caption line is drawn where and in what order, and what gets
// cut when a sentence is long. A 4 x 5 pixel "frame" and a stub canvas that records every call
// are enough to hold all of it. What the frame LOOKS like is measured in headless Chrome (the PR's
// browser check), not here: there is no GL in node.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const pc = await import(join(JS, 'ui/postcard.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// A canvas that records, and measures text as half its font size per character: close enough to
// a real face for the layout to wrap where a person would expect.
function stubCanvas(w, h) {
  const calls = [];
  const g = {
    font: '10px x', fillStyle: '#000', textAlign: 'left', textBaseline: 'alphabetic',
    drawImage: (...a) => calls.push({ op: 'drawImage', a }),
    fillRect: (...a) => calls.push({ op: 'fillRect', a, fill: g.fillStyle }),
    fillText: (text, x, y) => calls.push({ op: 'fillText', text, x, y, font: g.font, fill: g.fillStyle, align: g.textAlign }),
    measureText: (s) => ({ width: String(s).length * 0.5 * Number((/(\d+(?:\.\d+)?)px/.exec(g.font) || [0, 10])[1]) }),
  };
  return { width: w, height: h, calls, getContext: () => g };
}
const opts = { createCanvas: stubCanvas, colours: { space: '#0b0e14', fg: '#e8ecf2', dim: '#9aa4b2' }, fontFamily: 'sans-serif' };
const frame = { width: 4, height: 5 };

const caption = {
  name: 'Io · Moon',
  where: 'Distance from the Sun: 5.30 astronomical units · 23 Sep 2026, 14:05 UTC',
  sentence: 'Io is a moon of Jupiter, the most volcanically active body in the Solar System.',
  honesty: 'Position worked out from a published orbit, not measured today.',
  sources: 'Source: JPL Horizons',
  mark: COPY.share.mark,
};

// ------------------------------------------------------------------------------- the postcard
const { canvas, lines, band } = pc.composePostcard(frame, caption, opts);
check(canvas.width === 1080 && canvas.height === 1350, `the postcard is 1080 x 1350: ${canvas.width} x ${canvas.height}`);
check(pc.PC_W === 1080 && pc.PC_H === 1350 && pc.BAND_H === 270, 'the stated sizes');
check(band.top === 1080 && band.height === 270, `the band runs 1080..1350: ${band.top}+${band.height}`);

const draw = canvas.calls.find((c) => c.op === 'drawImage');
// 4 x 5 into a 1080 x 1080 square: cover scale 270, so the source crop is 4 x 4, centred (y 0.5).
check(draw && draw.a[0] === frame, 'the frame is drawn');
check(draw && draw.a.slice(1).join() === '0,0.5,4,4,0,0,1080,1080', `cover-fit and centred, never stretched: ${draw && draw.a.slice(1)}`);
const fill = canvas.calls.find((c) => c.op === 'fillRect');
check(fill && fill.a.join() === '0,1080,1080,270' && fill.fill === '#0b0e14', `the band is opaque --space from 1080 down: ${fill && fill.a} ${fill && fill.fill}`);
const drawIdx = canvas.calls.indexOf(draw);
check(canvas.calls.findIndex((c) => c.op === 'fillText') > drawIdx, 'the caption is drawn after the frame, and never over it');

const texts = canvas.calls.filter((c) => c.op === 'fillText');
check(texts.every((c) => c.y > 1080 && c.y < 1350), `every caption line is inside the band: ${texts.map((c) => c.y)}`);
check(texts.every((c) => c.x >= 0 && c.x <= 1080), 'and inside the width');
const order = lines.map((l) => l.key).filter((k, i, a) => a.indexOf(k) === i);
check(order.join() === 'name,where,sentence,honesty,sources,mark', `five caption lines in order, then the mark: ${order}`);
const ys = lines.filter((l) => l.key !== 'mark').map((l) => l.y);
check(ys.every((y, i) => i === 0 || y > ys[i - 1]), `each line below the last: ${ys}`);
const mark = lines.find((l) => l.key === 'mark');
const sources = lines.find((l) => l.key === 'sources');
check(mark && mark.align === 'right' && mark.x === 1080 - pc.POSTCARD.pad, 'spaceradar.ai sits at the band\'s right edge');
check(mark && sources && mark.y === sources.y, 'on the sources line');
check(texts.find((c) => c.text === caption.honesty), 'the honesty line is drawn whole when it fits');
check(texts.find((c) => c.text === 'Io · Moon' && c.fill === '#e8ecf2'), 'the name is in --text');

// A long sentence is cut to three lines with an ellipsis; a long honesty line keeps at least one.
{
  const long = {
    ...caption,
    sentence: Array.from({ length: 60 }, (_, i) => `word${i}`).join(' '),
    honesty: Array.from({ length: 40 }, (_, i) => `clause${i}`).join(' '),
  };
  const { lines: L } = pc.composePostcard(frame, long, opts);
  const sent = L.filter((l) => l.key === 'sentence');
  const hon = L.filter((l) => l.key === 'honesty');
  check(sent.length >= 1 && sent.length <= 3 && sent[sent.length - 1].text.endsWith(COPY.punctuation.ellipsis), `a long sentence is cut with an ellipsis: ${sent.length} lines`);
  check(hon.length >= 1, 'the honesty line is never cut away');
  check(L.filter((l) => l.key !== 'mark').every((l) => l.y < 1350), 'nothing runs off the foot');
  const used = L.reduce((m, l) => Math.max(m, l.y), 0);
  check(used <= 1350 - pc.POSTCARD.pad / 2, `the layout fits inside the band's padding: last baseline ${used}`);
}

// --------------------------------------------------------------------------- the trip preview
{
  const og = pc.composeCard(frame, { title: 'Where we have landed on the Moon', blurb: 'The first soft landing, the first people, a rover driven from Earth, the far side, the south pole and the first private landers.', mark: COPY.share.mark }, pc.OG, opts);
  check(og.canvas.width === 1200 && og.canvas.height === 630, 'a trip preview is 1200 x 630');
  check(og.band.top === 504 && og.band.height === 126, `its band is the lower fifth: ${og.band.top}+${og.band.height}`);
  const d = og.canvas.calls.find((c) => c.op === 'drawImage');
  check(d && d.a.slice(5).join() === '0,0,1200,504', `the frame fills the upper four fifths: ${d && d.a.slice(5)}`);
  check(og.lines.map((l) => l.key).filter((k, i, a) => a.indexOf(k) === i).join() === 'title,blurb,mark', 'title, blurb, mark');
  check(og.lines.every((l) => l.y > 504 && l.y < 630), `every line in the band: ${og.lines.map((l) => l.y)}`);
  // The first local render cut every long blurb to one line; the band is sized for two.
  check(og.lines.filter((l) => l.key === 'blurb').length === 2, `a long blurb keeps two lines: ${og.lines.filter((l) => l.key === 'blurb').length}`);
}

// ---------------------------------------------------------------------------- wrap and names
{
  const width = (s) => s.length;
  check(pc.wrap('a bb ccc dddd', 6, width, 5).join('|') === 'a bb|ccc|dddd', 'wraps at word boundaries');
  const cut = pc.wrap('one two three four five six', 9, width, 2);
  check(cut.length === 2 && cut[1].endsWith(COPY.punctuation.ellipsis) && cut.every((l) => width(l) <= 9), `cut to two lines with an ellipsis: ${cut.join('|')}`);
  const huge = pc.wrap('abcdefghijklmnopqrstuvwxyz', 8, width, 1);
  check(huge.length === 1 && width(huge[0]) <= 8, `a word wider than the band is cut by characters: ${huge}`);
  check(pc.wrap('', 10, width, 3).length === 0, 'nothing to say is no lines');
}
check(pc.fileName('europa', Date.UTC(2026, 8, 23, 23, 59)) === 'space-radar-europa-2026-09-23.png', `the file name: ${pc.fileName('europa', Date.UTC(2026, 8, 23, 23, 59))}`);
check(pc.fileName('sat-25544 (ISS)', Date.UTC(2026, 0, 2)) === 'space-radar-sat-25544-iss-2026-01-02.png', 'an id with spaces and brackets is made safe for a file name');
check(pc.fileName(null, NaN) === 'space-radar-view-now.png', 'no id and no time still names a file');

if (problems.length) {
  console.error(`postcard: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`postcard ok: 1080 x 1350 with the band at 1080..1350, five lines in order plus the mark, long lines cut with the honesty line kept; the trip preview 1200 x 630 with its band in the lower fifth`);
