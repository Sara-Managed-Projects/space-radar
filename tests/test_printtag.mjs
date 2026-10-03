// tests/test_printtag.mjs -- the tracked object's tag on the screen postcard (spec 0047 task 3,
// req 11): off by default; when ticked, the strings drawn are tagLines()'s own, the brackets land on
// the selection's place in the print, the tag flips at the print's edges, and nothing is drawn for a
// selection outside the picture.
//
//   node tests/test_printtag.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { printTag, tagText, printSize } = await import(join(JS, 'ui/printcompose.js'));
const { tagLines } = await import(join(JS, 'ui/cards.js'));
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

const gp = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
const [iss] = parseCelestrakGP(gp, { layer: 'stations', source: 'celestrak-stations' });
const T0 = iss.epoch + 3 * 3600e3;
const london = { name: 'London', latRad: 51.5 * Math.PI / 180, lonRad: -0.13 * Math.PI / 180, altKm: 0 };
const lines = tagLines(iss, { clock: { now: () => T0 }, observer: london });
const measure = (text, px) => String(text).length * px * 0.55;
const size = printSize(1440 / 900); // 1800 x 1200

// --- the words are the tag's, unchanged --------------------------------------------------------
const text = tagText(lines);
check(text.name === lines.name, `the name is tagLines()'s (${text.name})`);
const want = lines.readouts.map((r) => `${r.num} ${r.unit.toUpperCase()}${r.suffix ? ' ' + r.suffix : ''}`).join(' · ');
check(text.readouts === want && lines.readouts.length === 3, `the readouts are tagLines()'s, joined as the screen shows them (${text.readouts})`);
check(text.honesty.toLowerCase() === lines.honesty.toLowerCase() && /^[A-Z]/.test(text.honesty), `the honesty line is tagLines()'s, first letter raised as the tag's CSS does (${text.honesty})`);
check(/behind Earth$/.test(tagText(lines, 'behind Earth').readouts), 'behind a world, the HUD\'s words are added');
check(tagText(null) === null, 'no lines, no tag');

// --- placement: the brackets on the selection's place in the print ------------------------------
// The print keeps the vertical field of view at its own aspect: y maps straight, x by the aspects.
const at = { ndc: { x: 0, y: 0 }, aspect: 1440 / 900, boxPx: 272, viewH: 900 };
const mid = printTag(lines, at, size, measure);
check(mid && near(mid.box.x, 900) && near(mid.box.y, 600), `the centre of the screen is the centre of the print (${mid && [mid.box.x, mid.box.y]})`);
check(mid && near(mid.box.side, 272 * 1200 / 900), `the box scales with the print's height (${mid && mid.box.side.toFixed(1)})`);
check(mid.text.name === lines.name && mid.text.readouts === want, 'printTag() draws exactly tagText()');
const off = { ndc: { x: 0.5, y: 0.25 }, aspect: 2, boxPx: 0, viewH: 800 };
const o = printTag(lines, off, size, measure);
check(o && near(o.box.x, ((0.5 * 2 / 1.5) + 1) / 2 * 1800) && near(o.box.y, (1 - 0.25) / 2 * 1200), `x is scaled by the ratio of the aspects (${o && [o.box.x.toFixed(1), o.box.y]})`);
check(o && near(o.box.side, 40 * 1200 / 800), 'no box on the screen: the rule\'s 40 px minimum (ui/hud.js RETICLE_MIN_PX, issue #318), scaled');
// Flips at the print's edges, and stays inside it.
const inside = (d) => d.tag.x >= 0 && d.tag.y >= 0 && d.tag.x + d.tag.w <= size.w && d.tag.y + d.tag.h <= size.h;
const corners = [
  [{ x: -0.9, y: 0.9 }, 'right', 'down'],
  [{ x: 0.9, y: 0.9 }, 'left', 'down'],
  [{ x: 0.9, y: -0.9 }, 'left', 'up'],
  [{ x: -0.9, y: -0.9 }, 'right', 'up'],
];
for (const [ndc, side, vert] of corners) {
  const d = printTag(lines, { ndc, aspect: 1.5, boxPx: 28, viewH: 900 }, size, measure);
  check(d && d.tag.side === side && d.tag.vert === vert && inside(d), `at ndc ${ndc.x},${ndc.y} the tag goes ${vert}/${side} and stays in the print (${d && d.tag.vert}/${d && d.tag.side})`);
}
check(printTag(lines, { ndc: { x: 1.5, y: 0 }, aspect: 1.5, viewH: 900 }, size, measure) === null, 'a selection off the side of the picture: nothing drawn');
check(printTag(lines, { offscreen: true }, size, measure) === null, 'behind the camera: nothing drawn');
check(printTag(lines, { ndc: { x: 0.95, y: 0 }, aspect: 2.2, viewH: 900 }, size, measure) === null, 'on a wider screen than the print, a point near the edge falls outside it');
const behind = printTag(lines, { ...at, behind: 'behind Earth' }, size, measure);
check(behind.occluded === true && /behind Earth/.test(behind.text.readouts), 'occluded: drawn at half, and said');

// --- on with a selection, and wired -----------------------------------------------------------------
// Spec 0061 task 8: the share sheet composes the postcard WITH the selection's tag (a box the visitor
// can untick), and the card's Postcard saves it with the tag; the picture is a dynamic import.
const sheet = readFileSync(join(JS, 'ui/sharesheet.js'), 'utf8');
const door = readFileSync(join(JS, 'ui/share.js'), 'utf8');
const made = readFileSync(join(JS, 'ui/printcompose.js'), 'utf8');
check(/tagBox\.checked = true/.test(sheet) && /withTag: !!cur\.record && tagBox\.checked/.test(sheet), 'the sheet tags the selection unless the box is unticked, read at each drawing');
check(/withTag: !!record/.test(door) && /import\('\.\/printcompose\.js'\)/.test(door) && !/from '\.\/printcompose\.js'/.test(door), 'the card\'s Postcard tags its record, and loads the picture on first use');
check(/const at = opts\.withTag && record \? liveTagAt\(ctx, record\) : null;\n\s+const frame = api/.test(made), 'the live projection is read before renderTo() changes the camera\'s aspect');
check(/lines = record \? tagLines\(record, ctx\) : null/.test(made) && /printTag\(lines \|\| tagLines\(record, ctx\), at, size, measure\)/.test(made), 'the print reads tagLines(), the card\'s words');

if (problems.length) { console.error('printtag FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('printtag ok: the drawn strings are tagLines()\'s; the brackets land where the selection is in the print and scale with it; the tag flips at all four corners of the print; nothing drawn off the picture; on with a selection in the share sheet');
