// tests/test_chrome_quiet.mjs -- the walk notices another project's headless Chrome (internal #460 item 3).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { foreignHeadless, waitForQuiet } from '../tools/chrome-quiet.lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };
const ps = [
  '  101 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --remote-debugging-port=9300 --user-data-dir=/var/folders/x/T/cdp-AbC123 about:blank',   // ours (tools/cdp.mjs)
  '  102 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --remote-debugging-port=9400 --user-data-dir=/tmp/other-project-profile about:blank',   // foreign
  '  103 /usr/bin/chromium --headless --disable-gpu --screenshot=/tmp/a.png https://example.org',                                                                         // foreign
  '  104 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --type=renderer --headless=new --user-data-dir=/tmp/other-project-profile',                          // a child
  '  105 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9222',                                                                     // a visible Chrome: not headless
  '  106 node tools/walk.mjs --dir=site --note=--headless chrome',                                                                                                         // mentions the words only
].join('\n');
const found = foreignHeadless(ps, 1).map((o) => o.pid);
check(JSON.stringify(found) === '[102,103]', `foreign headless Chromes are 102 and 103, got ${JSON.stringify(found)}`);
check(foreignHeadless('', 1).length === 0 && foreignHeadless('garbage\n\n', 1).length === 0, 'an empty or odd process list is quiet');
// it waits while one runs, and stops waiting at the limit
{
  let n = 0; let slept = 0;
  const left = await waitForQuiet(60000, { ps: () => (++n < 4 ? ps : ''), sleep: async (ms) => { slept += ms; }, stepMs: 5000 });
  check(left.length === 0 && slept === 15000, `it waited for a machine that went quiet (${slept} ms, ${left.length} left)`);
  slept = 0;
  const stuck = await waitForQuiet(20000, { ps: () => ps, sleep: async (ms) => { slept += ms; }, stepMs: 5000 });
  check(stuck.length === 2 && slept === 20000, `it gave up at the limit and reported who was still there (${stuck.length}, ${slept} ms)`);
}
// the walk uses it, says so, and does not outwait the lock's six minutes
const walk = readFileSync(join(ROOT, 'tools/walk.mjs'), 'utf8');
check(/waitForQuiet\(QUIET_WAIT_MS\)/.test(walk) && /measuring beside/.test(walk) && /ran beside \$\{contended\}/.test(walk), 'tools/walk.mjs waits, warns while it measures, and warns again at the end');
const quiet = Number((/arg\('quiet-wait', '(\d+)'\)/.exec(walk) || [])[1]);
check(quiet > 0 && quiet * 1000 < 6 * 60e3, `--quiet-wait defaults to ${quiet} s, under the lock's six minutes`);
const probe = readFileSync(join(ROOT, 'tools/walk.probe.js'), 'utf8');
check(/\{ flow: 'history'/.test(walk) && /async history\(\)/.test(probe), 'the walk has a Back and Forward flow');
check(/\{ flow: 'skip'/.test(walk) && /async skip\(\)/.test(probe), 'the walk has a skip-links and focus flow');
if (problems.length) { console.error('chrome quiet FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('chrome quiet ok: another project\'s headless Chrome is found, waited for for a bounded time, and named in the walk\'s output');
