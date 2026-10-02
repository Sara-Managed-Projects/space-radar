// tests/test_trip_pictures.mjs -- the trip cards' pictures (spec 0068 task 1, ui/trippics.js).
//
// Ivan, 2026-10-02: "tour cards should have in background picture for this tour ... should gradual
// image on the grid square". Asserted, with no browser:
//
//   THE FILES: every trip in data/tours.js has site/images/trips/<id>.webp, a real WebP of
//     640 x 360 and at most `trip_picture_bytes` (the same rules as
//     `scripts/build_trip_thumbs.py --check`, which CI's registry job runs with no PIL).
//   THE WIRING: the sidebar's trip cards, the end card's next trip and the intro sheet all draw
//     the trip's picture through ui/trippics.js; the picture is decorative (alt="", aria-hidden),
//     decodes off the main thread, and is asked for only after the first visit settles (past the
//     two seconds the first-visit byte test measures) and only on screen.
//   THE LOOK: the picture fades into the card's glass by a gradient that ends in --sr-glass-strong
//     under the words, and the meta line is a text token (no alpha literal), so the words read on
//     glass over the brightest picture; the hover lean is turned off under reduced motion.
//
//   node tests/test_trip_pictures.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const { TOURS } = await import(pathToFileURL(join(ROOT, 'site/js/data/tours.js')).href);
const { BUDGETS } = await import(pathToFileURL(join(ROOT, 'site/js/data/budgets.js')).href);
const pics = await import(pathToFileURL(join(ROOT, 'site/js/ui/trippics.js')).href);

/** (width, height) from a WebP's first chunk (RFC 9649), or null. */
function webpSize(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = b.toString('ascii', 12, 16);
  const body = b.subarray(20);
  if (kind === 'VP8 ' && body[3] === 0x9d && body[4] === 0x01 && body[5] === 0x2a) return [body.readUInt16LE(6) & 0x3fff, body.readUInt16LE(8) & 0x3fff];
  if (kind === 'VP8L' && body[0] === 0x2f) { const v = body.readUInt32LE(1); return [(v & 0x3fff) + 1, ((v >>> 14) & 0x3fff) + 1]; }
  if (kind === 'VP8X') return [body.readUIntLE(4, 3) + 1, body.readUIntLE(7, 3) + 1];
  return null;
}

// --- the files ---------------------------------------------------------------------------------
const limit = BUDGETS.trip_picture_bytes;
check(Number.isFinite(limit) && limit <= 24000, `trip_picture_bytes is ${limit}; the spec's ceiling is 24 kB`);
const dir = join(ROOT, 'site/images/trips');
const sizes = [];
for (const tour of TOURS) {
  const path = join(dir, `${tour.id}.webp`);
  if (!existsSync(path)) { check(false, `site/images/trips/${tour.id}.webp is missing: its card would have no picture`); continue; }
  const b = readFileSync(path);
  const wh = webpSize(b);
  check(!!wh, `${tour.id}.webp is not a WebP`);
  check(wh && wh[0] === 640 && wh[1] === 360, `${tour.id}.webp is ${wh && wh.join(' x ')}, not 640 x 360`);
  check(b.length <= limit, `${tour.id}.webp is ${b.length} B, over trip_picture_bytes (${limit})`);
  check(pics.tripPictureUrl(tour.id) === `images/trips/${tour.id}.webp`, `the card asks for images/trips/${tour.id}.webp`);
  sizes.push(b.length);
}
if (existsSync(dir)) for (const f of readdirSync(dir)) check(TOURS.some((t) => `${t.id}.webp` === f), `site/images/trips/${f} belongs to no trip`);

// --- the wiring ---------------------------------------------------------------------------------
const explore = read('site/js/ui/explore.js');
const frame = read('site/js/ui/tripframe.js');
const src = read('site/js/ui/trippics.js');
check(/import \{ tripPicture \} from '\.\/trippics\.js';/.test(explore) && /card\.appendChild\(tripPicture\(row\.id, 'sr-tripcard__pic'\)\)/.test(explore), 'the sidebar trip cards draw their pictures');
check(/import \{ tripPicture \} from '\.\/trippics\.js';/.test(frame), 'the trip frame imports the pictures');
check(/p\.appendChild\(tripPicture\(st\.tourId, 'sr-tripsheet__pic'\)\)/.test(frame), 'the intro sheet wears the picture as its header');
check(/card\.appendChild\(tripPicture\(tour\.id, 'sr-tripcard__pic'\)\)/.test(frame), 'the end card\'s next trip has its picture too');
check(/img\.alt = '';/.test(src) && /setAttribute\('aria-hidden', 'true'\)/.test(src), 'the picture is decorative: the title says what the trip is');
check(/img\.decoding = 'async';/.test(src) && /img\.loading = 'lazy';/.test(src), 'decoded off the main thread, lazy');
check(/IntersectionObserver/.test(src), 'asked for only once its card is on screen');
check(/sr:layers-ready/.test(src) && pics.PICTURE_DELAY_MS >= 2500, `and only after the first visit settles (PICTURE_DELAY_MS ${pics.PICTURE_DELAY_MS} after sr:layers-ready)`);
check(/addEventListener\('error', \(\) => img\.remove\(\)/.test(src), 'a picture that fails is removed and the tint is the card again');

// --- the look --------------------------------------------------------------------------------------
const css = read('site/css/ui.css');
const after = /\.sr-tripcard::after \{([^}]*)\}/.exec(css);
check(!!after && /linear-gradient\(180deg, transparent \d+%, var\(--sr-glass\) \d+%, var\(--sr-glass-strong\) \d+%\)/.test(after[1]), 'the picture fades from clear into --sr-glass-strong under the words');
const metas = [...css.matchAll(/\.sr-tripcard__meta \{([^}]*)\}/g)].map((m) => m[1]);
check(metas.some((b) => /color: var\(--sr-text-soft\)/.test(b)) && !metas.some((b) => /rgba\(/.test(b)), 'the meta line is --sr-text-soft, not an alpha literal');
check(/\.sr-tripcard__title,\s*\.sr-tripcard__meta \{[^}]*z-index: 2;/.test(css), 'the words sit over the fade');
check(/@media \(prefers-reduced-motion: reduce\) \{\s*\.sr-tripcard__pic \{ transition: opacity 120ms linear; \}\s*\.sr-tripcard:hover \.sr-tripcard__pic \{ transform: none; \}/.test(css), 'reduced motion: a fade, and no hover lean');
check(/\.sr-tripsheet__pic \{[^}]*mask-image: linear-gradient\(180deg, var\(--sr-text\) \d+%, transparent 100%\);/.test(css), 'the intro header fades into the sidebar\'s glass by a mask');

if (problems.length) {
  console.error('trip pictures FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`trip pictures ok: ${sizes.length} WebPs at 640 x 360 (${Math.min(...sizes)}-${Math.max(...sizes)} B, budget ${limit}), on the cards, the next-trip card and the intro, after the first visit and only on screen`);
