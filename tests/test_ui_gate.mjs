// tests/test_ui_gate.mjs -- the two browser gates of screens.yml, the half node can hold (internal
// #374 and #123).
//
//   1. THE UI GATE's bookkeeping (scripts/check-ui.mjs sort()): a finding fails unless
//      tests/probes/ui_probe.known.json excuses it with an issue; an entry that matches nothing is
//      stale and fails; an entry for the phone does not excuse the desktop.
//   2. THE PROBE measures a control cut by the fold or its scroller by its box, skips a control
//      drawn for a screen reader only, and takes one capital letter as a name (the three faults
//      that kept it out of CI), and both probes still parse as the body of an async function.
//   3. THE TRIPS WALK reads both budget rows by name, every stop of every trip, and the frame.
//   4. screens.yml runs both, uploads `trip-stops`, and runs the walk on a dispatch or when what it
//      reads changed.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

// --- 1 ---
const { sort, KNOWN } = await import(pathToFileURL(join(ROOT, 'scripts', 'check-ui.mjs')).href);
{
  const known = [
    { size: 'phone', match: '^share: 2 ember-filled buttons', issue: 'internal #1' },
    { match: 'pill-not-live: target 1 x 14', issue: 'internal #2' },
    { size: 'desktop', match: 'never matches', issue: 'internal #3' },
  ];
  const problems = ['share: 2 ember-filled buttons at once: a, b', 'pill-not-live: target 1 x 14, under 44: button', 'home: no name: button.x'];
  const phone = sort(problems, 'phone', known);
  assert.deepEqual(phone.failing, ['home: no name: button.x']);
  assert.equal(phone.excused.length, 2);
  assert.ok(phone.excused[0].includes('[known: internal #1]'));
  assert.equal(phone.stale.length, 0, 'the desktop\'s entry is not the phone\'s to match');
  const desktop = sort(problems, 'desktop', known);
  assert.deepEqual(desktop.failing, ['share: 2 ember-filled buttons at once: a, b', 'home: no name: button.x'], 'a phone-only entry does not excuse the desktop');
  assert.deepEqual(desktop.stale.map((k) => k.issue), ['internal #3'], 'an entry that matches nothing is stale');
  assert.ok(Array.isArray(KNOWN));
  for (const k of KNOWN) {
    assert.ok(k.match && new RegExp(k.match), 'a known finding has a pattern');
    assert.match(String(k.issue || ''), /#\d+/, `a known finding names its issue (${k.match})`);
    assert.ok(!k.size || k.size === 'phone' || k.size === 'desktop');
  }
}

// --- 2 ---
{
  const probe = read('tests/probes/ui_probe.js');
  new AsyncFunction(probe);
  assert.ok(/function cutBy\(target\)/.test(probe) && /const cut = cutBy\(target\);/.test(probe), 'a control cut by the fold or its scroller is measured by its box');
  assert.ok(/scrollHeight > n\.clientHeight/.test(probe), 'and only an ancestor that scrolls excuses it');
  assert.ok(/forReadersOnly\(target\)/.test(probe), 'a control for a screen reader only has no target');
  assert.ok(/\\p\{Lu\}/.test(probe), 'one capital letter is a name');
  assert.ok(/clipped, readersOnly/.test(probe), 'and the walk counts what it measured by the box');
}

// --- 3 ---
{
  const probe = read('tools/trips-cost.probe.js');
  new AsyncFunction(probe);
  assert.ok(/BUDGETS\.draw_calls_per_stop/.test(probe) && /BUDGETS\.triangles_per_stop/.test(probe), 'the walk reads both rows from data/budgets.js');
  assert.ok(/ctx\.trip\.tours\(\)/.test(probe) && /for \(let i = 0; i < count; i \+= 1\)/.test(probe), 'every stop of every trip');
  assert.ok(/ONE_COLOUR_MAX = 0\.9998/.test(probe) && /imageSmoothingEnabled = false/.test(probe), 'and an empty frame is a finding: every pixel read, the star field\'s own floor');
  assert.ok(/skipped\.push/.test(probe), 'a trip that cannot be offered without the catalogues is skipped and named');
  const { BUDGETS } = await import(pathToFileURL(join(ROOT, 'site', 'js', 'data', 'budgets.js')).href);
  assert.ok(BUDGETS.draw_calls_per_stop > 0 && BUDGETS.triangles_per_stop > 0);
  new AsyncFunction(read('tests/probes/perf-active-probe.js'));
}

// --- 4 ---
{
  const yml = read('.github/workflows/screens.yml');
  assert.ok(/\n {2}ui:\n/.test(yml) && /node scripts\/check-ui\.mjs --base=/.test(yml), 'screens.yml has the ui job');
  assert.ok(/\n {2}trips:\n/.test(yml) && /node scripts\/check-trips\.mjs --base=/.test(yml), 'and the trips job');
  assert.ok(/name: trip-stops/.test(yml) && /trips\.json/.test(yml), 'which uploads trip-stops');
  assert.ok(/workflow_dispatch/.test(yml) && /registry\/tours\\\.yaml\|registry\/budgets\\\.yaml/.test(yml), 'on a dispatch, or when the trips or the budgets changed');
  for (const path of ['scripts/check-ui.mjs', 'tests/probes/ui_probe.js', 'scripts/check-trips.mjs', 'tools/trips-cost.probe.js']) {
    assert.ok(yml.includes(`- "${path}"`), `a change to ${path} runs screens.yml`);
  }
}
console.log('ui gate ok: known findings need an issue and cannot go stale, the probe measures a cut control by its box, the trips walk reads both budget rows at every stop, and screens.yml runs both');
