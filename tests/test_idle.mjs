// tests/test_idle.mjs -- with nothing moving the loop draws twenty frames a second, and "nothing
// moving" is one list that this test names in full (internal #520).
//
//   node tests/test_idle.mjs
//
// WHAT COULD VISIBLY CHANGE: a motion that goes stepped because the loop thought the picture was
// still: a trip's flight, the reel, the sky from the ground, a film's frames, a selection's pulse,
// a map fading in. It is a cap and never a stop, so nothing can freeze; this test is about the
// cap applying only where it should:
//   1. THE PREDICATE. movingReasons() answers [] for exactly one state (the Earth's stage, the live
//      clock at rate 1, nothing selected, nothing running, the camera where it was, nothing new on
//      the GPU) and names its reason for every other one, each on its own.
//   2. THE WIRING. Every field the predicate reads is filled by main.js's frame; the frame asks
//      the gate before the clock ticks and reports after render(); a capped frame's length never
//      reaches the frame latch or the tier promoter (fifty milliseconds by choice is not a slow
//      device, and the latch is one-way).
//   3. THE GATE, on a simulated display: every frame while anything moves and for two seconds
//      after; then one in three at 60 Hz and one in six at 120 Hz; every frame again from the
//      frame a hand touches the page or a reason appears.
//   4. WHO GETS IT. Not a film, not an automated browser unless it asks; `?idle=0` for anyone.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { movingReasons, createIdleGate, idleCapWanted, createFrameLatch, IDLE_FRAME_MS, IDLE_AFTER_MS } = await import(join(ROOT, 'site/js/scene/quality.js'));
let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.error(`FAIL: ${what}`); } };

// --- 1. the predicate -----------------------------------------------------------------------------
const STILL = { film: false, clockMode: 'live', clockRate: 1, trip: false, autopilot: false, sky: false, stage: 'earth', climb: false, selected: false, cameraMoved: false, animatedLayer: false, loading: false };
check(movingReasons(STILL).length === 0, `the home view at rest is the one still state (${movingReasons(STILL)})`);
const EACH = [
  [{ film: true }, 'film'], [{ clockMode: 'scrub' }, 'clock'], [{ clockMode: 'fixed' }, 'clock'], [{ clockRate: 60 }, 'clock'], [{ clockRate: 0 }, 'clock'], [{ clockRate: -1 }, 'clock'],
  [{ trip: true }, 'trip'], [{ autopilot: true }, 'autopilot'], [{ sky: true }, 'sky'],
  [{ stage: 'sun' }, 'stage'], [{ stage: 'moon' }, 'stage'], [{ stage: 'galaxy' }, 'stage'], [{ stage: undefined }, 'stage'],
  [{ climb: true }, 'climb'], [{ selected: true }, 'selection'], [{ cameraMoved: true }, 'camera'], [{ animatedLayer: true }, 'layer'], [{ loading: true }, 'loading'],
];
for (const [change, reason] of EACH) {
  const why = movingReasons({ ...STILL, ...change });
  check(why.length === 1 && why[0] === reason, `${JSON.stringify(change)} alone is "${reason}" and nothing else (${why})`);
}
const NAMES = ['film', 'clock', 'trip', 'autopilot', 'sky', 'stage', 'climb', 'selection', 'camera', 'layer', 'loading'];
check(JSON.stringify([...new Set(EACH.map(([, r]) => r))]) === JSON.stringify(NAMES), 'every reason is exercised, in the order the function gives them');
check(JSON.stringify(movingReasons({ ...STILL, film: true, clockRate: 9, trip: true, autopilot: true, sky: true, stage: 'sun', climb: true, selected: true, cameraMoved: true, animatedLayer: true, loading: true })) === JSON.stringify(NAMES), 'all at once: all eleven');
check(movingReasons().length > 0 && movingReasons({}).length > 0, 'a state nobody filled in is NOT still: the cap needs every answer');
// The list in the code is this list: a twelfth reason added to the function must be added here.
const quality = readFileSync(join(ROOT, 'site/js/scene/quality.js'), 'utf8');
const body = quality.slice(quality.indexOf('export function movingReasons'), quality.indexOf('export function idleCapWanted'));
const pushed = [...body.matchAll(/why\.push\('([a-z]+)'\)/g)].map((m) => m[1]);
check(JSON.stringify(pushed) === JSON.stringify(NAMES), `movingReasons() pushes exactly these eleven (${pushed})`);
const fields = [...new Set([...body.matchAll(/\bs\.([A-Za-z]+)/g)].map((m) => m[1]))];
check(JSON.stringify(fields.slice().sort()) === JSON.stringify(Object.keys(STILL).sort()), `and reads exactly the twelve fields of the still state (${fields})`);

// --- 2. the wiring --------------------------------------------------------------------------------
const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
const loop = main.slice(main.indexOf('function startLoop('));
const call = loop.slice(loop.indexOf('idle.drew(nowReal, movingReasons({'), loop.indexOf('}));', loop.indexOf('idle.drew(nowReal, movingReasons({')));
for (const f of fields) check(new RegExp(`\\n\\s+${f}: `).test(call), `main.js's frame fills \`${f}\``);
const at = (needle) => { const i = loop.indexOf(needle); if (i < 0) check(false, `main.js's loop has no \`${needle}\``); return i; };
check(at('if (idle.skip(nowReal)) return;') < at('clock.tick(dt);') && at('requestAnimationFrame(frame);\n    if (idle.skip(nowReal)) return;') > 0, 'a skipped frame does nothing: the gate is asked first, before the clock ticks');
check(at('idle.drew(nowReal, movingReasons({') > at('\n    render();'), 'the question is asked after render(), which is what brings the camera up to this frame');
check(/!capped && !latch\.latched\) \{[\s\S]*?scaler\.push\(frameMs, nowReal, calm, !shown\)[\s\S]*?latch\.push\(frameMs, nowReal\)/.test(loop) && /if \(!capped\) ctx\.quality\.frame\(frameMs, nowReal, latch\.latched\)/.test(loop), 'a capped frame is not fed to the scale, the latch or the tier promoter');
check(/const capped = idle\.capped\(nowReal\) \|\| wasCapped;/.test(loop), 'nor is the first frame after the cap lifts, whose length was the cap\'s');
check(/heroes\.update\(t, \{ frameMs: capped \? freeFrameMs : frameMs,/.test(loop), 'the model pool is told the device\'s own frame time, not the cap\'s');
check(/film: !!ctx\.renderMode,/.test(call) && /trip: !!\(st && st\.phase !== 'idle'\),/.test(call) && /autopilot: !!\(ctx\.autopilot && ctx\.autopilot\.engaged\),/.test(call) && /sky: !!\(ctx\.skyView && ctx\.skyView\.active\),/.test(call),
  'the film clock, a trip, the reel and the sky view are each asked by their own flag');
check(/clockMode: clock\.mode,\s*\n\s*clockRate: clock\.rate,/.test(call), 'and the clock by its mode and its rate');
// A layer counts while it is MOVING, not while it is switched on: the aurora and the lightning are
// on for every first visit, and CI's browser showed the switch alone kept the loop at full rate.
check(/animatedLayer: layerAnimating\(nowReal\),/.test(call), 'the layers are asked whether they are moving now');
check(/aurora && aurora\.visible && aurora\.folds/.test(loop) && /ctx\.isLayerOn\('lightning'\) && ctx\.weather && typeof ctx\.weather\.perMinute === 'function' \? ctx\.weather\.perMinute\(\) : 0/.test(loop) && /flashes > 0 \|\| !!ctx\.wind \|\| !!ctx\.earthOverlay/.test(loop),
  'the aurora by its folds on screen, lightning by the strikes in its map, the wind and an overlay by being there');
check(/let layerMoving = true;/.test(loop), 'and until they have been asked, they are taken to be moving');
{
  // The two modules answer in the shape the loop reads.
  const aurora = readFileSync(join(ROOT, 'site/js/scene/aurora.js'), 'utf8');
  const lightning = readFileSync(join(ROOT, 'site/js/scene/weather/lightning.js'), 'utf8');
  check(/visible: drawing\.visible,\s*\n\s*folds: drawing\.folds,/.test(aurora), 'scene/aurora.js state() says whether it is visible and whether its folds are drawn');
  check(/perMinute: \(\) => \(model \? Math\.round\(st\.perMin\)/.test(lightning) && /perMinute: \(\) => \(off \|\| api\.failed \? 0 : undefined\)/.test(main), 'lightning says how many strikes a minute its map holds, and the stand-in says none');
}
const wakes = (/for \(const type of \[([^\]]+)\]\) \{\s*\n\s*window\.addEventListener\(type, wake, \{ passive: true, capture: true \}\)/.exec(loop) || [, ''])[1];
for (const type of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart', 'touchmove', 'resize', 'hashchange']) check(wakes.includes(`'${type}'`), `a ${type} wakes the loop`);
// A capped frame really would have tripped the latch: this is why it is kept away from it.
{
  const latch = createFrameLatch();
  let tripped = false;
  for (let t = 0; t < 6000; t += IDLE_FRAME_MS) tripped = latch.push(IDLE_FRAME_MS, t) || tripped;
  check(tripped, 'six seconds of 50 ms frames trip the frame latch, for good: the reason the cap\'s frames never reach it');
}

// --- 3. the gate on a simulated display -----------------------------------------------------------
function run(hz, seconds, script, opts) {
  const gate = createIdleGate(opts);
  const step = 1000 / hz;
  const drawnAt = [];
  for (let i = 0; i * step < seconds * 1000; i++) {
    const now = i * step;
    const act = script(now, gate) || {};
    if (gate.skip(now)) continue;
    drawnAt.push(now);
    gate.drew(now, act.reasons || []);
  }
  const between = (a, b) => drawnAt.filter((t) => t >= a && t < b).length;
  return { gate, between };
}
// Moving for one second, then still.
let r = run(60, 12, (now) => ({ reasons: now < 1000 ? ['camera'] : [] }));
check(r.between(0, 1000) === 60, `every frame while the camera moves (${r.between(0, 1000)})`);
check(r.between(1000, 1000 + IDLE_AFTER_MS) >= 119, `and for two seconds after it stops (${r.between(1000, 3000)} of 120)`);
check(r.between(4000, 5000) === 20 && r.between(10000, 11000) === 20, `then twenty a second, one frame in three (${r.between(4000, 5000)}, ${r.between(10000, 11000)})`);
check(IDLE_FRAME_MS === 50 && IDLE_AFTER_MS >= 1500, 'two frames per 100 ms glyph tick, after at least a second and a half of stillness');
r = run(120, 8, () => ({}));
check(r.between(4000, 5000) === 20, `a 120 Hz display idles at the same twenty (${r.between(4000, 5000)})`);
r = run(30, 8, () => ({}));
check(r.between(4000, 5000) === 15, `a 30 Hz display idles at fifteen: one frame in two, never fewer (${r.between(4000, 5000)})`);
// A hand on the page: the very next frame is drawn, and every one after it for two seconds.
r = run(60, 12, (now, gate) => { if (Math.abs(now - 6000) < 8) gate.wake(now); return {}; });
check(r.between(5000, 6000) === 20 && r.between(6000, 7000) === 60 && r.between(7000, 8000) >= 59 && r.between(9000, 10000) === 20, `a pointer at 6 s: 20, then 60, 60, and 20 again once it has been still (${[5, 6, 7, 9].map((s) => r.between(s * 1000, s * 1000 + 1000))})`);
// A reason that appears with no hand on the page (a trip starting from a link, a map landing):
// seen at the next drawn frame, at most one cap away, and every frame from then on.
r = run(60, 12, (now) => ({ reasons: now >= 6000 && now < 8000 ? ['trip'] : [] }));
check(r.between(6000, 6100) >= 4 && r.between(6100, 8000) === 114 && r.between(11000, 12000) === 20, `a trip at 6 s is at full rate within one capped frame (${r.between(6000, 6100)} in its first tenth, ${r.between(6100, 8000)} of 114 after)`);
const s = r.gate.state();
check(s.enabled && s.drawn + s.skipped === 720 && s.capped > 0 && Array.isArray(s.reasons), `the gate counts what it drew and skipped (${JSON.stringify(s)})`);
// Switched off, it never skips.
r = run(60, 6, () => ({}), { enabled: false });
check(r.between(0, 6000) === 360 && r.gate.capped(5000) === false, 'a gate that is not enabled draws every frame');

// --- 4. who gets it -------------------------------------------------------------------------------
check(idleCapWanted({ search: '', webdriver: false }) === true, 'a visitor gets the cap');
check(idleCapWanted({ search: '', webdriver: true }) === false, 'an automated browser does not: a probe that counts frames measures what it did');
check(idleCapWanted({ search: '?idle=1', webdriver: true }) === true && idleCapWanted({ search: '?at=iss&idle=1', webdriver: true }) === true, 'unless it asks with ?idle=1');
check(idleCapWanted({ search: '?idle=0', webdriver: false }) === false, '?idle=0 switches it off for anyone');
check(idleCapWanted({ search: '?idle=1', webdriver: false, film: true }) === false, 'a film is never capped, whatever the address says');
check(/createIdleGate\(\{ enabled: idleCapWanted\(\{ search: location\.search, webdriver: navigator\.webdriver === true, film: !!ctx\.renderMode \}\) \}\)/.test(loop), 'main.js asks exactly that');

// A real browser: screens.yml asks for the cap on the tree a deploy uploads and reads the loop's own counts.
check(/check-drawn\.mjs --base=http:\/\/127\.0\.0\.1:8178 --idle/.test(readFileSync(join(ROOT, '.github/workflows/screens.yml'), 'utf8')) && /index\.html\?idle=1/.test(readFileSync(join(ROOT, 'scripts/check-drawn.mjs'), 'utf8')),
  'screens.yml runs the drawn check with --idle, which loads the page with ?idle=1');

if (failed) { console.error(`\nidle: ${failed} check(s) FAILED`); process.exit(1); }
console.log(`idle ok: ${NAMES.length} reasons, each held on its own and each filled by main.js's frame; at rest a 60 Hz display draws 20 frames a second instead of 60, and every frame again from the frame anything moves; a capped frame never reaches the frame latch`);
