// tests/test_ci_runs_every_test.mjs -- every test file in tests/ is run by .github/workflows/ci.yml.
//
// ci.yml names its steps by hand, each with the reason it exists; scripts/test.sh and the local
// gate run tests by pattern. So a test could be written, pass on a laptop, be in the gate, and be
// in no workflow: on 2026-10-07 that was true of fourteen node tests (the boot diet's among them)
// and two Python ones. internal #378 was the same thing seen from the other side: a test red on a
// laptop and "green in CI". This is the step that keeps the hand-written list whole.
//   node tests/test_ci_runs_every_test.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8');
// What a step RUNS, not what a comment mentions.
const run = ci.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const files = readdirSync(join(ROOT, 'tests')).filter((f) => /^test_.*\.(mjs|py)$/.test(f)).sort();
const problems = [];
if (files.length < 140) problems.push(`tests/ was not read (${files.length} files)`);
for (const f of files) {
  const cmd = f.endsWith('.py') ? `python3 tests/${f}` : `node tests/${f}`;
  const re = new RegExp(`(?:run: |&& |\\n\\s+)${cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`);
  if (!re.test(run)) problems.push(`tests/${f} is run by no step of .github/workflows/ci.yml: add "run: ${cmd}" with the reason it exists`);
}
// And the other way: a step must not name a test that is gone.
for (const m of run.matchAll(/(?:node|python3) tests\/(test_[\w.-]+\.(?:mjs|py))/g)) {
  if (!files.includes(m[1])) problems.push(`ci.yml runs tests/${m[1]}, which does not exist`);
}
if (problems.length) { console.error('ci runs every test FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`ci runs every test ok: all ${files.length} test files in tests/ are run by a step of ci.yml, and no step names a test that is gone`);
