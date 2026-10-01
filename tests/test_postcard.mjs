// tests/test_postcard.mjs -- the trip preview's composer, with a canvas stub in node (spec 0033).
//
//   node tests/test_postcard.mjs
//
// The composer is the part of the picture that can be wrong without a browser: where the frame
// goes, where the band starts, which caption line is drawn where and in what order, and what gets
// cut when a line is long. (Its 1080 x 1350 "Save a picture" left with spec 0061 task 8: the share
// sheet hands out the print postcard, tests/test_printcard.mjs.) A 4 x 5 pixel "frame" and a stub canvas that records every call
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
check(!('composePostcard' in pc) && !('savePostcard' in pc) && !('postcardCaption' in pc), 'the 1080 x 1350 picture is gone: the share sheet hands out one postcard, the print');

if (problems.length) {
  console.error(`postcard: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`postcard ok: the trip preview 1200 x 630 with its band in the lower fifth, title, blurb and mark in order, a long blurb kept to two lines; wrap cuts at words`);
