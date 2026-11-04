// tests/test_phone_menu_gate.mjs -- the half of the phone menu check that node can hold (public #1322).
//
//   node tests/test_phone_menu_gate.mjs
//
// scripts/check-phone-menu.mjs opens deep scenes in a real browser at 320 and 390 px and measures the
// breadcrumbs against the More button (the `ui` job of .github/workflows/screens.yml). This holds what a
// browser is not needed for:
//   1. EACH RULE FAILS ON A BROKEN MEASUREMENT. The fixture is a real run (2026-11-04, 320 px, Apollo 14's
//      card, the sheet peeking): the More button at 257,9 to 303,55; the rail and its Back button under it at
//      y 116; the card's chain below the fold. Moving the rail up onto the button, running a crumb off the
//      right edge, a button something else covers, a sideways scroll, a menu that stays shut or open after
//      Escape: each is a finding, and the real run is none.
//   2. THE CHECK CANNOT GO QUIET. The sizes are 320 and 390 px, there are scenes and sheet positions, and
//      the script says "did not look" when it opened nothing.
//   3. screens.yml RUNS IT in the `ui` job, and re-runs it when the script changes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const G = await import(pathToFileURL(join(ROOT, 'scripts', 'check-phone-menu.mjs')).href);

// --- 1 ---
const box = (l, t, r, b) => ({ l, t, r, b });
const real = () => ({
  more: box(257, 9, 303, 55),
  targets: [
    { name: 'Sun', box: box(16, 883, 60, 927) },
    { name: 'Apollo 14 lunar module Antares', box: box(25, 927, 216, 971) },
    { name: 'BackEarth', box: box(16, 116, 92, 162) },
    { name: 'Back', box: box(29, 117, 79, 161) },
  ],
  covered: [],
  scrollW: 320,
  window: [320, 640],
});
assert.deepEqual(G.findings(real()), [], 'the real run has no finding');

assert.ok(G.overlaps(box(0, 0, 10, 10), box(5, 5, 15, 15)) && !G.overlaps(box(0, 0, 10, 10), box(10, 0, 20, 10)), 'sharing area is an overlap; a touching edge is not');

{
  const m = real();
  m.targets[2].box = box(200, 9, 300, 55); // the rail back where #1319 found it, over the button
  const f = G.findings(m);
  assert.ok(f.some((x) => /"BackEarth" overlaps the More button/.test(x)), `a crumb on the button is named: ${f}`);
}
{
  const m = real();
  m.targets[1].box = box(25, 927, 380, 971); // a long name that runs past the right edge
  assert.ok(G.findings(m).some((x) => /"Apollo 14 lunar module Antares" runs outside the window/.test(x)), 'a crumb cut at the side is named');
  const below = real();
  below.targets[0].box = box(16, 900, 60, 944); // below the fold of a peeking sheet: by design, not a finding
  assert.deepEqual(G.findings(below), [], 'a chain below the fold is not a finding');
}
{
  const m = real();
  m.covered = ['280,32'];
  assert.ok(G.findings(m).some((x) => /under the More button at 280,32/.test(x)), 'a covered button is named');
  const s = real();
  s.scrollW = 340;
  assert.ok(G.findings(s).some((x) => /scrolls sideways/.test(x)), 'a sideways scroll is named');
  const n = real();
  n.more = null;
  assert.deepEqual(G.findings(n), ['the More button is not on screen'], 'no button is a finding, not a pass');
  const off = real();
  off.more = box(300, 9, 346, 55);
  assert.ok(G.findings(off).some((x) => /More button is not inside the window/.test(x)), 'a button off the edge is named');
}
{
  const ok = { opened: true, expanded: 'true', box: box(100, 60, 300, 300), focused: true, closed: true };
  assert.deepEqual(G.menuFindings(ok, 320, 640), [], 'a menu that opens inside the window, takes focus and closes is fine');
  assert.ok(G.menuFindings({ ...ok, opened: false }, 320, 640)[0].includes('did not open'), 'a menu that stays shut is named');
  assert.ok(G.menuFindings({ ...ok, expanded: 'false' }, 320, 640).some((x) => /aria-expanded/.test(x)), 'a button that does not say it is expanded is named');
  assert.ok(G.menuFindings({ ...ok, box: box(100, 60, 340, 300) }, 320, 640).some((x) => /not inside the window/.test(x)), 'a menu wider than the window is named');
  assert.ok(G.menuFindings({ ...ok, focused: false }, 320, 640).some((x) => /focus/.test(x)), 'a menu that takes no focus is named');
  assert.ok(G.menuFindings({ ...ok, closed: false }, 320, 640).some((x) => /Escape/.test(x)), 'a menu Escape leaves open is named');
}

// --- 2 ---
assert.deepEqual(G.SIZES.map((s) => s.viewport.width), [320, 390], 'the two phone widths of the issue');
assert.ok(G.SCENES.length >= 3 && G.DETENTS.length >= 2, 'several deep scenes, each with the sheet at more than one height');
{
  const src = read('scripts/check-phone-menu.mjs');
  assert.ok(/did not look/.test(src) && /scenes < SIZES\.length/.test(src), 'a run that opened nothing fails');
  assert.ok(/--help/.test(src) && /process\.exit\(0\)/.test(src), 'it answers --help');
  assert.ok(/\.sr-rail__btn--more/.test(src) && /\.sr-scalerail/.test(src) && /\.sr-card__crumb/.test(src), 'it measures the button and both kinds of breadcrumb by the classes the app draws');
  const css = read('site/css/finishers.css') + read('site/css/ui.css');
  for (const c of ['sr-rail__btn--more', 'sr-scalerail__back', 'sr-card__crumb']) assert.ok(css.includes(c), `${c} is still a class the app styles`);
  const copy = read('site/js/ui/rail.js');
  assert.ok(/menu\.id = 'sr-more'/.test(copy) && /closeMore\(true\)/.test(copy), 'the menu is #sr-more and Escape closes it');
}

// --- 3 ---
{
  const yml = read('.github/workflows/screens.yml');
  assert.ok(/node scripts\/check-phone-menu\.mjs --base=http:\/\/127\.0\.0\.1:8177/.test(yml), 'screens.yml runs the phone menu check against the served site');
  assert.ok(/- "scripts\/check-phone-menu\.mjs"/.test(yml), 'and re-runs on a change to the script');
}

console.log('phone menu gate ok: each rule fails on a broken measurement, the real run is clean, it measures 320 and 390 px and cannot pass having looked at nothing, and screens.yml runs it');
