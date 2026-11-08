// tests/test_recorder.mjs -- Record (forge #156): ui/recorder.js's pure parts and ui/webm.js's file.
//
//   node tests/test_recorder.mjs
//
// THE SHAPES are 16:9, square and 9:16 at 1080 px on the short side (720 on a phone), even numbers, and the crop is
// the middle of the canvas at that shape, as large as fits. THE FORMAT is MP4 where the browser records it, else
// WebM, else nothing; the plan says frame by frame needs WebCodecs (or MediaRecorder, paced). THE CORNER says
// spaceradar.ai and the instant in UTC; THE END CARD's link is shown without its scheme and wrapped to the card.
// THE FILM ADDRESS round-trips. THE WEBM is read back element by element: the EBML header says webm, the segment's
// size is the rest of the file, the track is VP9 at its size and frame duration, every frame is in a SimpleBlock
// at its own time, keyframes start clusters, and each cue points at a cluster.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mod = (rel) => import(pathToFileURL(join(ROOT, 'site/js', rel)).href);
const R = await mod('ui/recorder.js');
const W = await mod('ui/webm.js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- shapes and crops ---------------------------------------------------------------------------------------
check(same(R.outputSize('wide'), { w: 1920, h: 1080 }), '16:9 is 1920 x 1080');
check(same(R.outputSize('square'), { w: 1080, h: 1080 }), 'square is 1080');
check(same(R.outputSize('tall'), { w: 1080, h: 1920 }), '9:16 is 1080 x 1920');
check(same(R.outputSize('wide', true), { w: 1280, h: 720 }) && same(R.outputSize('tall', true), { w: 720, h: 1280 }), 'a phone records at 720');
check(same(R.outputSize('nonsense'), { w: 1920, h: 1080 }), 'an unknown crop is 16:9');
const c1 = R.cropRect(1600, 900, 'tall');
check(Math.abs(c1.sw / c1.sh - 9 / 16) < 1e-9 && c1.sh === 900 && Math.abs(c1.sx - (1600 - c1.sw) / 2) < 1e-9 && c1.sy === 0, 'a vertical crop of a landscape screen is its middle, full height');
const c2 = R.cropRect(390, 844, 'wide');
check(c2.sw === 390 && Math.abs(c2.sh - 390 * 9 / 16) < 1e-9 && c2.sx === 0, 'a 16:9 crop of a phone held upright is full width');
const c3 = R.cropRect(1000, 1000, 'square');
check(same(c3, { sx: 0, sy: 0, sw: 1000, sh: 1000 }), 'a square crop of a square is all of it');

// --- the format ---------------------------------------------------------------------------------------------
const safari = (m) => m.startsWith('video/mp4');
const firefox = (m) => m.startsWith('video/webm');
const chrome = () => true;
check(R.pickMime(chrome).ext === 'webm' && R.pickMime(chrome).mime === 'video/webm;codecs=vp9,opus', 'WebM, VP9 first, where the browser records both');
check(R.pickMime(firefox).ext === 'webm', 'WebM where it is all there is');
check(R.pickMime(safari).ext === 'mp4' && R.pickMime(safari).mime.includes('avc1'), 'MP4 where WebM is not offered');
check(R.pickMime(() => false) === null && R.pickMime(null) === null, 'nothing, honestly, where nothing is recorded');
check(R.pickMime(() => { throw new Error('no'); }) === null, 'a browser that throws on a type does not record it');
const proto = { captureStream() {} };
check(same(R.recordPlan({}), { live: null, frames: null }), 'no MediaRecorder and no WebCodecs: no plan');
check(R.recordPlan({ MediaRecorder: { isTypeSupported: firefox }, HTMLCanvasElement: { prototype: proto } }).frames === 'paced', 'MediaRecorder alone: frames are paced');
check(R.recordPlan({ VideoEncoder() {}, VideoFrame() {} }).frames === 'webcodecs' && R.recordPlan({ VideoEncoder() {}, VideoFrame() {} }).live === null, 'WebCodecs alone: frame by frame only');

// --- the corner and the end card ----------------------------------------------------------------------------
const ms = Date.UTC(2026, 10, 7, 14, 3, 30);
check(R.dateLine(ms) === '2026-11-07 14:03 UTC', `the date is UTC to the minute (${R.dateLine(ms)})`);
check(R.creditLine().startsWith('spaceradar.ai'), 'the credit names the site first');
check(R.fileName('tall', ms, 'mp4') === 'spaceradar-2026-11-07-1403-tall.mp4' && R.fileName('x', ms, 'ogg') === 'spaceradar-2026-11-07-1403-wide.webm', 'the file name');
check(R.displayUrl('https://www.spaceradar.ai/#at=moon') === 'spaceradar.ai/#at=moon', 'a link reads without its scheme');
const measure = (s) => s.length * 10;
const lines = R.wrapText('spaceradar.ai/#path=zABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 120, measure);
check(lines.every((l) => measure(l) <= 120) && lines.join('') === 'spaceradar.ai/#path=zABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'a long link is cut to the card and nothing is lost');
check(same(R.wrapText('See it yourself', 100, measure), ['See it ', 'yourself']), 'words break at spaces');
check(R.frameTotal(20) === 600 && R.frameTotal(R.END_S) === 90, '20 s at 30 fps is 600 frames; the end card is 90');

// --- the film address ---------------------------------------------------------------------------------------
const film = R.filmUrl('https://www.spaceradar.ai/?x=1#old', '#at=moon&cam=1,2,3', { crop: 'square', seconds: 20, source: 'view', end: 'https://www.spaceradar.ai/#at=moon' });
check(film.startsWith('https://www.spaceradar.ai/?render=1&clock=1&fps=30&record=square,20,view&end=') && film.endsWith('#at=moon&cam=1,2,3'), `the film address (${film})`);
const back = R.parseRecord(new URL(film).search);
check(same(back, { crop: 'square', seconds: 20, source: 'view', end: 'https://www.spaceradar.ai/#at=moon' }), 'and back');
check(R.parseRecord('?record=wide,999,view').seconds === R.MAX_S && R.parseRecord('?record=huge,20,view') === null && R.parseRecord('') === null, 'the film address is held to its forms');

// --- the WebM file, read back -------------------------------------------------------------------------------
check(same([...W.vintSize(0)], [0x80]) && same([...W.vintSize(126)], [0xfe]) && same([...W.vintSize(127)], [0x40, 0x7f]) && same([...W.vintSize(300)], [0x41, 0x2c]), 'EBML sizes are the shortest that hold them');
const frames = [];
for (let n = 0; n < 75; n += 1) frames.push({ data: Uint8Array.from([n, n, n]), timeMs: (n * 1000) / 30, key: n % 30 === 0 });
const file = W.muxWebm({ width: 1080, height: 1920, codec: 'vp09.00.10.08', fps: 30, frames });

function readVint(b, i, keepMarker) {
  let len = 1;
  while (len <= 8 && !(b[i] & (0x80 >> (len - 1)))) len += 1;
  let v = keepMarker ? b[i] : b[i] & (0xff >> len);
  for (let k = 1; k < len; k += 1) v = v * 256 + b[i + k];
  return { v, len };
}
function walk(b, start, end, depth, out) {
  let i = start;
  while (i < end) {
    const id = readVint(b, i, true);
    const size = readVint(b, i + id.len);
    const at = i + id.len + size.len;
    const node = { id: id.v, at: i, data: at, size: size.v, kids: [] };
    out.push(node);
    if (depth.has(id.v)) walk(b, at, at + size.v, depth, node.kids);
    i = at + size.v;
  }
  return out;
}
const MASTERS = new Set([0x1A45DFA3, 0x18538067, 0x1549A966, 0x1654AE6B, 0xAE, 0xE0, 0x1F43B675, 0x1C53BB6B, 0xBB, 0xB7]);
const tree = walk(file, 0, file.length, MASTERS, []);
const uintOf = (n) => { let v = 0; for (let k = 0; k < n.size; k += 1) v = v * 256 + file[n.data + k]; return v; };
const strOf = (n) => String.fromCharCode(...file.subarray(n.data, n.data + n.size));
const find = (list, id) => list.find((n) => n.id === id);
check(tree.length === 2 && tree[0].id === 0x1A45DFA3 && tree[1].id === 0x18538067, 'an EBML header and one Segment');
check(strOf(find(tree[0].kids, 0x4282)) === 'webm', 'DocType webm');
const seg = tree[1];
check(seg.data + seg.size === file.length, 'the segment\'s size is the rest of the file');
const info = find(seg.kids, 0x1549A966);
check(uintOf(find(info.kids, 0x2AD7B1)) === 1000000, 'timecodes in milliseconds');
const dur = find(info.kids, 0x4489);
check(Math.abs(new DataView(file.buffer, file.byteOffset + dur.data, 8).getFloat64(0) - 2500) < 1e-6, 'the duration is 75 frames at 30 fps: 2 500 ms');
const track = find(find(seg.kids, 0x1654AE6B).kids, 0xAE);
check(strOf(find(track.kids, 0x86)) === 'V_VP9', 'one VP9 track');
check(uintOf(find(find(track.kids, 0xE0).kids, 0xB0)) === 1080 && uintOf(find(find(track.kids, 0xE0).kids, 0xBA)) === 1920, 'its size');
check(uintOf(find(track.kids, 0x23E383)) === Math.round(1e9 / 30), 'its frame duration');
const clusters = seg.kids.filter((n) => n.id === 0x1F43B675);
check(clusters.length === 3, `a cluster per keyframe (${clusters.length})`);
const blocks = [];
for (const cl of clusters) {
  const base = uintOf(find(cl.kids, 0xE7));
  for (const b of cl.kids.filter((n) => n.id === 0xA3)) {
    const rel = new DataView(file.buffer, file.byteOffset + b.data + 1, 2).getInt16(0);
    blocks.push({ t: base + rel, key: !!(file[b.data + 3] & 0x80), first: file[b.data + 4] });
  }
}
check(blocks.length === 75 && blocks.every((b, n) => b.t === Math.round((n * 1000) / 30) && b.first === n), 'every frame in a SimpleBlock at its own time, in order');
check(blocks.filter((b) => b.key).length === 3 && blocks[0].key && blocks[30].key && blocks[60].key, 'the keyframes are marked');
const cues = find(seg.kids, 0x1C53BB6B).kids;
check(cues.length === 3 && cues.every((cp, k) => {
  const pos = uintOf(find(find(cp.kids, 0xB7).kids, 0xF1));
  return seg.data + pos === clusters[k].at;
}), 'each cue points at its cluster');
let threw = false;
try { W.muxWebm({ width: 2, height: 2, codec: 'vp8', fps: 30, frames: [{ data: new Uint8Array(1), timeMs: 0, key: false }] }); } catch { threw = true; }
check(threw, 'a file must start on a keyframe');
const v8 = W.muxWebm({ width: 2, height: 2, codec: 'vp8', fps: 30, frames: [{ data: new Uint8Array(1), timeMs: 0, key: true }] });
check(new TextDecoder().decode(v8).includes('V_VP8'), 'VP8 is written too');

if (problems.length) {
  console.error(`test_recorder: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('test_recorder: the shapes, the crop, the format, the corner, the end card, the film address and the WebM file hold');
