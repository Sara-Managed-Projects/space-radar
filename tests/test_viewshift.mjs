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

// The Trips & layers drawer (62vh, over the 60 px tab bar) is a sheet like the card, and it was
// not measured until 2026-09-22: the Earth sat behind it while the top half showed empty sky.
const drawer = { top: 321, bottom: 844, width: 390 };
const tabbar = { top: 784, bottom: 844, width: 390 };
check(coveredFromBottom([drawer, tabbar], W, H) === 523, `an open drawer covers its own band (${coveredFromBottom([drawer, tabbar], W, H)})`);
check(shiftFor(523, H) === H * MAX_SHIFT_FRACTION, 'and the shift for it hits the cap, so the Earth lands in the free band rather than off the top');
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(join(ROOT, 'site/js/scene/viewshift.js'), 'utf8');
  check(/html\.sr-phone #sr-controls\.sr-drawer-open/.test(src) && /html\.sr-phone #sr-status\.sr-drawer-open/.test(src),
    'the two phone drawers are measured, and only when open, and only on the phone');
  check(!/'#sr-status'|'#sr-controls'/.test(src), 'the desktop strip and top bar are never measured');
  const css = readFileSync(join(ROOT, 'site/css/site.css'), 'utf8');
  const block = css.slice(css.indexOf('html.sr-phone #sr-controls,\nhtml.sr-phone #sr-status {'));
  check(/padding-top: var\(--sr-pad\);/.test(block.slice(0, block.indexOf('}'))),
    'the phone sheet resets the top bar\'s safe-area padding, so its head sits flush against its edge');
}

if (problems.length) { console.error('viewshift FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('viewshift ok: sheets stacked on the bottom edge are measured, a side panel is not, and the view moves up by half of what they cover');
