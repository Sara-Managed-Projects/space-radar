// `?render=1`: window.__srRender.ready RESOLVES, on the sources as written and on the tree a deploy
// serves (scripts/minify_site.py), in the same number of steps and with the same cue sheet; and a
// link with no trip in its hash is refused at once, in words (internal #423).
//   node tests/test_render_ready.mjs
//
// WHY. The regression walk of 2026-10-06 reported that `ready` "never resolves on the minified
// tree". Measured the next day with the warm-up's stages written down: it resolved, after 44.5 real
// seconds -- 27 of them the saved catalogues coming down a throttled line (film time stands still
// while anything loads), 10 the twelve film seconds of warm-up -- and the walk gave up at 45. The
// tree served from the sources had no saved catalogues, so it was ready in a few seconds, and the
// difference was put down to the minifier. Nothing was wrong with either tree; what was wrong is
// that a slow warm-up and a stuck one looked the same from outside. So: (1) the mode now says its
// stage, and this test holds the order; (2) this test drives install() -> attach() -> ready ->
// frames in node against BOTH trees and asks for the same answer from each, which is the check
// that would say so if stripping a module ever did change what it does; (3) the one case that did
// wait for nothing (`?render=1&trip=<id>`, the trip in the query) is refused straight away.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const EPOCH = Date.UTC(2026, 9, 7, 12, 0, 0);
const TRIP = 'people-in-space';

function fakeNode() {
  const node = { children: [], style: {}, className: '', textContent: '', id: '', appendChild(c) { node.children.push(c); return c; }, classList: { toggle() {}, add() {}, remove() {} } };
  return node;
}

/** One boot of render mode with nothing real behind it but the clock module and the mode itself. */
async function drive(jsRoot, { hash = `#trip=${TRIP}`, layersAfterMs = 400, introAfterMs = 900 } = {}) {
  const { install, renderOptions, WARM_S } = await import(pathToFileURL(join(jsRoot, 'ui/rendermode.js')).href);
  const stagesSeen = [];
  const listeners = [];
  const g = {
    Date,
    performance: { now: () => 5000 },
    setTimeout: (fn, ms, ...a) => setTimeout(fn, ms, ...a),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
    console: { error() {}, warn() {} },
    location: { hash, search: `?render=1&fps=30&at=${EPOCH}` },
    addEventListener() {},
    __srLayersReady: false,
  };
  globalThis.document = {
    createElement: () => fakeNode(), head: fakeNode(), body: fakeNode(), documentElement: fakeNode(),
    getElementById: () => null,
    fonts: { load: () => Promise.resolve([]), ready: Promise.resolve() },
  };
  const mode = install(renderOptions(g.location.search), g);
  check(g.__srRender === mode && mode.stage === 'installed', 'install() puts the mode on the window, stage "installed"');
  // The app's side, on FILM time (g.setTimeout is the mode's now): the layers land, then the link
  // puts the trip at its intro; Start moves it on.
  const state = { phase: 'idle', tourId: null, index: -1, stops: [], generation: 0 };
  const trip = {
    get state() { return state; },
    onChange(fn) { listeners.push(fn); },
    play() { state.phase = 'flight'; state.index = 0; for (const fn of listeners) fn(state); },
    holdDwell() {}, next() {},
  };
  g.setTimeout(() => { g.__srLayersReady = true; }, layersAfterMs);
  if (/trip=/.test(hash)) g.setTimeout(() => { state.phase = 'intro'; state.tourId = TRIP; }, introAfterMs);
  const frames = { n: 0 };
  const raf = () => g.requestAnimationFrame(() => { frames.n += 1; if (stagesSeen[stagesSeen.length - 1] !== mode.stage) stagesSeen.push(mode.stage); raf(); });
  raf();
  mode.attach({ trip, stage: { worldId: 'earth' } });
  const t0 = Date.now();
  const outcome = await Promise.race([
    mode.ready.then((d) => ({ ok: true, d }), (e) => ({ ok: false, message: String(e && e.message) })),
    new Promise((r) => setTimeout(() => r({ ok: false, message: 'NOT WITHIN 30 REAL SECONDS' }), 30000)),
  ]);
  const ms = Date.now() - t0;
  const made = [];
  if (outcome.ok) for (let k = 0; k < 4; k += 1) made.push(await mode.frame(k));
  return { outcome, ms, framesAtReady: frames.n, stagesSeen, made, describe: mode.describe(), stage: mode.stage, warmFrames: Math.round(WARM_S * 30) };
}

// --- the tree a deploy serves --------------------------------------------------------------------
const out = mkdtempSync(join(tmpdir(), 'sr-min-'));
const built = spawnSync('python3', [join(ROOT, 'scripts/minify_site.py'), '--out', out, '--tree', '--quiet'], { encoding: 'utf8' });
check(built.status === 0, `scripts/minify_site.py builds: ${(built.stderr || '').slice(-200)}`);

const results = {};
try {
  for (const [name, jsRoot] of [['as written', join(ROOT, 'site/js')], ['stripped', join(out, 'js')]]) {
    const r = await drive(jsRoot);
    results[name] = r;
    check(r.outcome.ok, `${name}: __srRender.ready resolves (${r.outcome.message || ''}; stopped in stage "${r.stage}", warm-up ${r.describe.warmed}/${r.describe.warmFrames})`);
    if (!r.outcome.ok) continue;
    const d = r.outcome.d;
    check(d.trip === TRIP && d.epochMs === EPOCH && d.fps === 30, `${name}: the cue sheet names the trip, the instant and the rate (${JSON.stringify([d.trip, d.epochMs, d.fps])})`);
    check(r.stage === 'ready' && r.describe.warmed === r.warmFrames && r.describe.error === null, `${name}: the stage is "ready" after all ${r.warmFrames} warm-up frames (${r.stage}, ${r.describe.warmed})`);
    // ('faces' is between two frames: the faces are waited for with the film standing still.)
    check(r.stagesSeen.join(' > ') === 'layers > warming > settling > ready', `${name}: the stages come in order, as a frame sees them: ${r.stagesSeen.join(' > ')}`);
    check(r.made.length === 4 && r.made.every((f, k) => f.n === k && f.pending === 0), `${name}: frames 0 to 3 are made in order with nothing loading`);
  }
  const a = results['as written'], b = results.stripped;
  if (a && b && a.outcome.ok && b.outcome.ok) {
    check(a.framesAtReady === b.framesAtReady, `both trees are ready after the same number of film frames (as written ${a.framesAtReady}, stripped ${b.framesAtReady})`);
    check(JSON.stringify(a.outcome.d) === JSON.stringify(b.outcome.d), `both trees hand back the same cue sheet:\n    ${JSON.stringify(a.outcome.d)}\n    ${JSON.stringify(b.outcome.d)}`);
    check(JSON.stringify(a.made) === JSON.stringify(b.made), 'and the same first four frames');
  }

  // --- no trip in the hash: said at once, not after thirty film seconds ----------------------------
  for (const hash of ['', '#at=25544', '#trip=']) {
    const r = await drive(join(ROOT, 'site/js'), { hash });
    check(!r.outcome.ok && /no trip in the link/.test(r.outcome.message || '') && /#trip=<id>/.test(r.outcome.message || ''), `a render link with the hash "${hash}" is refused in words: ${r.outcome.message}`);
    check(r.stage === 'failed' && typeof r.describe.error === 'string', `and the mode says it failed (${r.stage})`);
    check(r.framesAtReady <= 1 && r.ms < 2000, `at once: ${r.framesAtReady} film frames and ${r.ms} ms, not thirty film seconds`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (problems.length) { console.error('render ready FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`render ready ok: ready resolves on the sources and on the stripped tree after the same ${results.stripped.framesAtReady} film frames with the same cue sheet, the stages are said in order, and a link with no #trip= is refused at once`);
process.exit(0);
