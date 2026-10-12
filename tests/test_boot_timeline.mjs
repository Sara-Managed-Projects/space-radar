// tests/test_boot_timeline.mjs -- scripts/boot-timeline.mjs and its probe (internal #528).
// Reads scripts and workflows as text, so it is not in scripts/check_built_tree.mjs TESTS.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { budget, judge } = await import(join(ROOT, 'scripts/boot-timeline.mjs'));

const text = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');
check(budget('boot_longest_task_ms', text) > 0 && budget('boot_blocking_ms', text) > 0, 'both budget rows exist');
check(budget('no_such_row', text) === null, 'a missing row is null, not zero');
check(budget('first_visit_bytes', text) === 2855000, 'the reader finds a row by its id, with the digits intact');

const ok = { layersReadyFound: true, longestTaskMs: 400, totalBlockingMs: 900 };
check(judge(ok, { longest: 3000, blocking: 6000 }).length === 0, 'a quiet boot holds');
check(judge({ ...ok, longestTaskMs: 3500 }, { longest: 3000, blocking: 6000 }).length === 1, 'a long task fails the first row');
check(judge({ ...ok, totalBlockingMs: 9000 }, { longest: 3000, blocking: 6000 }).length === 1, 'blocking time fails the second');
check(judge({ ...ok, layersReadyFound: false }, { longest: null, blocking: null }).length === 1, 'layers that never come are a failure whatever the budgets');
check(judge({ ...ok, longestTaskMs: 1e9 }, { longest: null, blocking: null }).length === 0, 'a row that is missing is not a gate');

// The probe is the body of an async function (tools/cdp.mjs and Playwright both run it as one).
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const body = readFileSync(join(ROOT, 'tests/probes/boot-timeline.js'), 'utf8');
let made = null;
try { made = new AsyncFunction(body); } catch (e) { check(false, `the probe does not parse: ${e.message}`); }
check(made && /return out;\s*$/.test(body), 'the probe returns its timeline');
for (const k of ['layersReady', 'firstContentfulPaint', 'longTasks', 'longestTaskMs', 'totalBlockingMs', 'tasksOver100Ms', 'mainModuleLoaded']) check(body.includes(k), `the probe reports ${k}`);
check(/buffered:\s*true/.test(body), 'long tasks are read buffered, so a late observer sees the boot');

const screens = readFileSync(join(ROOT, '.github/workflows/screens.yml'), 'utf8');
check(/scripts\/boot-timeline\.mjs --base=http:\/\/127\.0\.0\.1:8178/.test(screens), 'screens.yml runs the timeline on the tree a deploy uploads');
check(!/boot-timeline\.mjs[^\n]*--gate/.test(screens), 'and only reports: the gate is switched on by someone who has seen the first numbers');

if (problems.length) { console.error('boot timeline FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('boot timeline ok: the two budget rows are read, judged and left as a report in screens.yml; the probe parses and returns the timeline');
