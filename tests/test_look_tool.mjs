// tests/test_look_tool.mjs -- the look tool (.github/workflows/look.yml) and its one switch in the app.
//
//   node tests/test_look_tool.mjs
//
// 1. THE SWITCH. `?look=1` keeps the frame latch and the pixel-ratio governor from being fed, and
//    does nothing else: the first probes held the latch by pretending the page was hidden, which
//    also stopped the loader that turns the Sun's detail on. It is a query key for tools: an embed
//    cannot set it (its address is written by someone else's page) and no deep link carries it
//    (ui/urlstate.js KEYS).
// 2. THE VERDICT. A page that logged an error, or a probe that returned `fail` or nothing, is a
//    failed job; a browser with no WebGL2 context is neutral and says why; anything else passes.
// 3. THE PROBES. Each file under tests/probes/look/ is a body that parses behind the prelude, names
//    itself, ends by returning finish(...), and reads a flare's time from `maxMs`.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookHeld, idleCapWanted } from '../site/js/scene/quality.js';
import { KEYS } from '../site/js/ui/urlstate.js';
import { judge, summarise, pageErrorsOf } from '../tools/look-summary.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const problems = [];
const ok = (cond, what) => { if (!cond) problems.push(what); };

// 1. The switch.
ok(lookHeld({ search: '?look=1' }) === true, '?look=1 holds');
ok(lookHeld({ search: '?sw=0&look=1' }) === true, '?sw=0&look=1 holds');
ok(lookHeld({ search: '?look=1&tier=2' }) === true, '?look=1&tier=2 holds');
for (const s of ['', '?', '?look=0', '?look=true', '?look=10', '?outlook=1', '?look', '?sw=0', '#look=1']) ok(lookHeld({ search: s }) === false, `${JSON.stringify(s)} must not hold`);
ok(lookHeld() === false && lookHeld({}) === false, 'no address does not hold');
ok(lookHeld({ search: '?embed=1&at=moon&look=1' }) === false, 'an embed cannot hold the latch');
ok(lookHeld({ search: '?look=1&embed=1' }) === false, 'an embed cannot hold the latch, either order');
ok(!KEYS.includes('look'), "ui/urlstate.js KEYS must not carry 'look': it is a query key for tools, not view state");
// It does not reach the idle cap, which has its own key.
ok(idleCapWanted({ search: '?look=1', webdriver: false }) === true && idleCapWanted({ search: '?look=1', webdriver: true }) === false, '?look=1 must not change who gets the idle cap');

const main = read('site/js/main.js');
ok((main.match(/lookHeld\(/g) || []).length === 1, 'main.js reads the switch once');
ok(/const looking = lookHeld\(\{ search: location\.search \}\);/.test(main), 'main.js reads the switch from the query, in startLoop');
const uses = main.split('\n').filter((l) => /\blooking\b/.test(l) && !/^\s*(\/\/|\*)/.test(l));
// The read, the two branches that feed the governor and the latch, and ctx.latch.held for a probe.
ok(uses.length === 4, `main.js uses \`looking\` on ${uses.length} lines, not 4: the switch must do only what it says\n    ${uses.join('\n    ')}`);
ok(uses.some((l) => /if \(!looking && !document\.hidden && !ctx\.renderMode && !capped && !latch\.latched\) \{/.test(l)), 'the branch that feeds the governor and the latch is closed by the switch');
ok(uses.some((l) => /\} else if \(!looking && capped && !document\.hidden && !ctx\.renderMode && !latch\.latched && scaler\.rest\(nowReal\)\) \{/.test(l)), 'the resting step of the governor is closed by the switch');
// The loaders stay behind the page being visible, and nothing else.
ok(/if \(ctx\.quality && !document\.hidden\) \{\n\s+if \(!capped\) ctx\.quality\.frame\(frameMs, nowReal, latch\.latched\);/.test(main), 'the tier and its loaders (ctx.quality.frame, tick) must not ask the switch');
ok(!/look=1/.test(read('site/js/ui/embed.js')), 'ui/embed.js must not write look=1');
ok(/\?look=1/.test(read('tools/README.md')), 'tools/README.md documents ?look=1');

// 2. The verdict.
const good = { errors: [], warns: ['w'], shots: [{ name: 'a', note: 'home', calls: 10, triangles: 20 }], render: { calls: 1, triangles: 2, textures: 3, programs: 4 }, held: true };
ok(judge(good, '').status === 'pass', 'a clean run passes');
ok(judge({ ...good, errors: ['console.error: THREE.WebGLProgram: Shader Error'] }, '').status === 'fail', 'a console.error fails the job');
ok(judge({ ...good, fail: 'the drift reached 1 of 4 stops' }, '').status === 'fail', 'a probe that returns fail fails the job');
ok(judge(null, 'DRIVER FAILED: chrome never opened the debugging port').status === 'fail', 'a probe that returned nothing fails the job');
ok(judge(good, '[pageerror] TypeError: x is not a function\n    at main.js:1').status === 'fail', 'an uncaught error only the tool saw fails the job');
ok(judge(good, '[warning] slow\n[log] hello\n[cdp] shot a').status === 'pass', 'warnings and logs on stderr do not fail the job');
ok(judge({ ...good, errors: ['console.error: boom at line 3'] }, '[error] boom at line 3').errors.length === 1, 'an error seen by the probe and by the tool is counted once');
const neutral = judge({ neutral: 'webkit 18.2 could not create a WebGL2 context in this container: no GL' }, '[error] ignored');
ok(neutral.status === 'neutral' && /WebGL2/.test(neutral.reasons[0]), 'no WebGL2 context is neutral, with what the browser said');
ok(pageErrorsOf('[error] a\n[pageerror] b\n[warning] c').length === 2, 'pageErrorsOf reads the two kinds of error line');
const page = summarise({ out: { ...good, frames: { home: { frames: 120, medianMs: 250, p95Ms: 400, minMs: 200, maxMs: 900, calls: 5, triangles: 6, latched: false } }, gl: 'SwiftShader' }, errText: '', pictures: [{ file: 'a.png', bytes: 1234 }], probe: 'frametime', browser: 'chromium', hold: 'true' }).text;
for (const want of ['PASS', 'draw calls', 'textures', 'programs', '## Errors (0)', '## Warnings (1)', '`a.png` (1,234 B): home', 'absolute numbers mean nothing', '| home | 120 | 250 | 400 |']) ok(page.includes(want), `summary.md lacks ${JSON.stringify(want)}`);
ok(/asked to be held and was not/.test(summarise({ out: { ...good, held: undefined }, errText: '', hold: 'true' }).text), 'the summary says when the latch was asked held and the ref has no switch');

// 3. The probes.
const dir = join(ROOT, 'tests/probes/look');
const prelude = read('tests/probes/look/_prelude.js');
const AsyncFunction = (async () => {}).constructor;
const probes = readdirSync(dir).filter((f) => f.endsWith('.js') && !f.startsWith('_')).map((f) => f.slice(0, -3)).sort();
for (const want of ['smoke', 'worlds', 'sun', 'jupiter', 'saturn', 'lights', 'frametime']) ok(probes.includes(want), `tests/probes/look/${want}.js is missing`);
for (const name of probes) {
  const body = read(`tests/probes/look/${name}.js`);
  try { new AsyncFunction(prelude + '\n' + body); } catch (e) { problems.push(`${name}.js does not parse behind the prelude: ${e.message}`); }
  ok(body.includes(`look.probe = '${name}';`), `${name}.js must name itself: look.probe = '${name}';`);
  ok(/return finish\([^)]*\);\s*$/.test(body), `${name}.js must end with return finish(...)`);
  ok(!/document, 'hidden'/.test(body), `${name}.js must not pretend the page is hidden: ?look=1 holds the latch`);
}
ok(!/document, 'hidden'/.test(prelude), 'the prelude must not pretend the page is hidden');
ok(/f\.maxMs/.test(read('tests/probes/look/sun.js')) && /c\.startMs/.test(read('tests/probes/look/sun.js')), 'sun.js reads a flare from maxMs and a CME from startMs (data/sunactivity.js)');

// The workflow: its triggers and what it promises.
const wf = read('.github/workflows/look.yml');
for (const want of ['workflow_dispatch:', 'probe:', 'ref:', 'width:', 'height:', 'mobile:', 'hold_latch:', 'browser:', 'harvest:', '"site/js/scene/**"', '"site/js/main.js"', '"site/textures/**"', 'name: look-${{ matrix.probe }}-${{ matrix.browser }}', 'tools/look-summary.mjs', 'tools/look-playwright.mjs', 'tools/cdp.mjs', '&look=1', 'GITHUB_STEP_SUMMARY', 'mcr.microsoft.com/playwright:v1.49.1-jammy']) ok(wf.includes(want), `look.yml lacks ${want}`);
ok(read('.github/workflows/screens.yml').includes('mcr.microsoft.com/playwright:v1.49.1-jammy'), 'look.yml and screens.yml pin the same Playwright image');

if (problems.length) { console.error('look tool FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`look tool ok: ?look=1 holds the latch and the governor and nothing else, an embed and a deep link cannot set it, the verdict fails on an error and is neutral without WebGL2, and ${probes.length} probes parse behind the prelude`);
