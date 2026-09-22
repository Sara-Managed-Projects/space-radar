// tests/test_viewshift.mjs -- the part of the canvas a phone's sheets cover, and what that moves.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { coveredFromBottom, shiftFor, MAX_SHIFT_FRACTION } = await import(join(ROOT, 'site/js/scene/viewshift.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// A 390 x 844 phone (CSS px), as measured on the "To the edge" trip, 2026-09-22.
const W = 390, H = 844;
const bar = { top: 700, bottom: 844, width: 390 };        // the trip's bottom bar
const card = { top: 400, bottom: 700, width: 390 };       // the card sheet resting on it
check(coveredFromBottom([], W, H) === 0, 'nothing on the canvas covers nothing');
check(coveredFromBottom([bar], W, H) === 144, 'a bar on the bottom edge covers its own height');
check(coveredFromBottom([card, bar], W, H) === 444, `a sheet resting on the bar covers both (${coveredFromBottom([card, bar], W, H)})`);
check(coveredFromBottom([card], W, H) === 0, 'a panel floating off the bottom edge covers nothing from the bottom');
check(coveredFromBottom([{ top: 100, bottom: 844, width: 380 }], 1280, 800) === 0, 'the desktop side card is not full width and moves nothing');
check(coveredFromBottom([{ top: 780, bottom: 845, width: 390 }], W, H) === 64, 'a border pixel past the edge still counts as on it');
check(shiftFor(444, H) === 222, 'the shift is half the covered band, so the centre of the view is the centre of what is left');
check(shiftFor(800, H) === H * MAX_SHIFT_FRACTION, 'and it is capped, so a sheet over the whole screen does not throw the scene off the top');
check(shiftFor(0, H) === 0 && shiftFor(NaN, H) === 0, 'no cover, no shift');

if (problems.length) { console.error('viewshift FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('viewshift ok: sheets stacked on the bottom edge are measured, a side panel is not, and the view moves up by half of what they cover');
