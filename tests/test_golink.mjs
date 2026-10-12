#!/usr/bin/env node
// `#go=<id>` (internal #466, site/js/ui/golink.js) and the film clock on its own
// (site/js/ui/rendermode.js createFilmClock, `?render=1&clock=1`). No browser.
//
// Run: node tests/test_golink.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { landingPlan, zoomAt, LAND_FROM, LAND_MS } from '../site/js/ui/golink.js';
import { renderOptions } from '../site/js/ui/rendermode.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
const problems = [];
const check = (ok, what) => { if (ok) passed += 1; else problems.push(what); };

// --- the move ----------------------------------------------------------------------------------
check(zoomAt(0) === 0 && zoomAt(1) === 1 && zoomAt(-1) === 0 && zoomAt(2) === 1, 'the way in runs from 0 to 1 and no further');
check(zoomAt(0.2) > 0.2 && zoomAt(0.99) > 0.9999, 'quick out of the dot, at rest on arrival');
{
  let prev = -1; let back = false;
  for (let i = 0; i <= 100; i += 1) { const z = zoomAt(i / 100); if (z < prev) back = true; prev = z; }
  check(!back, 'and never backwards');
}
check(landingPlan({ distance: 10, reducedMotion: true }) === null, 'reduced motion: the landing does not travel');
check(landingPlan({ distance: 0 }) === null && landingPlan() === null, 'no arrival distance, no move');
const plan = landingPlan({ distance: 10 });
check(plan && plan.from === 10 * LAND_FROM && plan.to === 10 && plan.ms === LAND_MS && plan.ease === zoomAt, 'the move ends at the app\'s own arrival distance');
check(LAND_MS >= 4000 && LAND_MS <= 9000, 'slow, and over before a visitor gives up');

// --- where it loads ----------------------------------------------------------------------------
const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
check(/import\('\.\/ui\/golink\.js'\)/.test(main) && !/^import [^\n]*golink/m.test(main) && /const goLanding = /.test(main), 'main.js imports ui/golink.js only for a link with go=');
check(/if \(film \|\| !goId \|\| tripRunning/.test(main), 'never while a film is made, nor over a trip the visitor started');
check(!readFileSync(join(ROOT, 'site/index.html'), 'utf8').includes('golink'), 'index.html does not preload it');
const go = readFileSync(join(ROOT, 'site/js/ui/golink.js'), 'utf8');
check(/prefers-reduced-motion/.test(go) && /ctx\.openAt\(id\)/.test(go) && /onCancel/.test(go), 'the landing asks the app for its own arrival, honours reduced motion, and can be interrupted');
check(!/^import /m.test(go), 'and brings no module with it');
const url = readFileSync(join(ROOT, 'site/js/ui/urlstate.js'), 'utf8');
check(/'go'/.test(url) && /out\.at = out\.go/.test(url), '`go` is a key of the link, read as `at`');

// --- the film clock without a trip -------------------------------------------------------------
check(renderOptions('?render=1&clock=1&fps=30&at=1791460800000').clockOnly === true, '`&clock=1` asks for the clock alone');
check(renderOptions('?render=1').clockOnly === false && renderOptions('?clock=1') === null, 'and only beside render=1');
const mod = readFileSync(join(ROOT, 'site/js/ui/rendermode.js'), 'utf8');
check(/export function createFilmClock/.test(mod) && /if \(opts\.clockOnly\) \{ mode\.ctx = ctx;/.test(mod) && /\n    film,\n/.test(mod), 'the mode hands over its clock and the scene, and starts no trip');

if (problems.length) {
  console.error(`test_golink: ${problems.length} problem(s)\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`test_golink: ${passed} checks passed`);
