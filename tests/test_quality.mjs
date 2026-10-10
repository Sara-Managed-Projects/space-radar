// tests/test_quality.mjs -- spec 0026 req 18: the frame-rate latch and data-saver.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { createFrameLatch, createScaleGovernor, SCALE_STEPS, shouldSaveData } = await import(join(JS, 'scene/quality.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// slow frames: 40 ms each; the latch needs a full window AND three seconds over the line
{
  const latch = createFrameLatch();
  let tripped = 0, at = null, now = 0;
  for (let i = 0; i < 200; i++) { now += 40; if (latch.push(40, now)) { tripped++; at = now; } }
  check(tripped === 1, `trips exactly once (${tripped})`);
  check(at !== null && at >= 20 * 40 + 3000 && at <= 20 * 40 + 3000 + 80, `after the window filled and three seconds passed (${at} ms)`);
  check(latch.latched === true, 'and stays latched');
}
// fast frames never trip
{
  const latch = createFrameLatch();
  let tripped = 0, now = 0;
  for (let i = 0; i < 1000; i++) { now += 16; if (latch.push(16, now)) tripped++; }
  check(tripped === 0 && latch.latched === false, '60 fps never trips');
}
// a short stutter recovers before three seconds: no trip
{
  const latch = createFrameLatch();
  let tripped = 0, now = 0;
  for (let i = 0; i < 60; i++) { now += 40; if (latch.push(40, now)) tripped++; }   // 2.4 s slow
  for (let i = 0; i < 60; i++) { now += 16; if (latch.push(16, now)) tripped++; }   // then fast
  check(tripped === 0, 'a two-second stutter does not trip it');
}
// one giant frame (a tab coming back) is clamped, not a trip
{
  const latch = createFrameLatch();
  let tripped = 0, now = 0;
  for (let i = 0; i < 19; i++) { now += 16; latch.push(16, now); }
  now += 5000; if (latch.push(5000, now)) tripped++;
  for (let i = 0; i < 30; i++) { now += 16; if (latch.push(16, now)) tripped++; }
  check(tripped === 0, 'one huge frame among fast ones does not trip it');
}
check(createFrameLatch().push(NaN, 0) === false && createFrameLatch().push(-5, 0) === false, 'bad durations are ignored');

// data-saver reads the connection honestly
check(shouldSaveData({ saveData: true }) === true, 'saveData asks, we save');
check(shouldSaveData({ effectiveType: '3g' }) === true && shouldSaveData({ effectiveType: '2g' }) === true && shouldSaveData({ effectiveType: 'slow-2g' }) === true, '2g/3g save');
check(shouldSaveData({ effectiveType: '4g' }) === false, '4g does not');
check(shouldSaveData(undefined) === false && shouldSaveData(null) === false, 'no API (Safari, Firefox): treated as fast, which is what it says');

// THE RESOLUTION SCALE BEFORE THE LATCH (internal #521)
{
  check(JSON.stringify(createScaleGovernor({ deviceRatio: 2 }).steps) === '[2,1.5,1.25,1]' && JSON.stringify(SCALE_STEPS) === '[2,1.5,1.25,1]', 'a ratio-2 device has the ladder 2, 1.5, 1.25, 1');
  check(JSON.stringify(createScaleGovernor({ deviceRatio: 1.75 }).steps) === '[1.75,1.5,1.25,1]', 'a ratio-1.75 device starts at its own ratio');
  check(JSON.stringify(createScaleGovernor({ deviceRatio: 3 }).steps) === '[2,1.5,1.25,1]' && JSON.stringify(createScaleGovernor({ deviceRatio: 1 }).steps) === '[1]', 'a ratio above 2 starts at 2; a ratio of 1 has one step');
  check(createScaleGovernor({ deviceRatio: 1 }).atFloor === true, 'a ratio-1 device feeds the latch from the first frame, as before');
  // Constant 40 ms frames: one step down per three seconds (plus the 20-frame window), then the latch.
  const g = createScaleGovernor({ deviceRatio: 2 });
  const latch = createFrameLatch();
  const log = [];
  let now = 0, trippedAt = null;
  for (let n = 0; n < 2000 && trippedAt === null; n++) {
    now += 40;
    if (g.push(40, now)) log.push([now, g.scale]);
    if (g.atFloor && latch.push(40, now)) trippedAt = now;
  }
  check(JSON.stringify(log.map((x) => x[1])) === '[1.5,1.25,1]', `slow frames walk down 1.5, 1.25, 1 (${JSON.stringify(log)})`);
  check(log.every((x, k) => k === 0 || x[0] - log[k - 1][0] >= 3000), 'steps are at least three seconds apart');
  check(trippedAt !== null && trippedAt > log[2][0] + 3000, `the latch trips only after the floor and its own three seconds (${trippedAt})`);
  g.freeze();
  for (let n = 0; n < 400; n++) { now += 5; g.push(5, now); }
  check(g.scale === 1, 'frozen after the latch: the ladder does not climb');
}
{
  // One stall does not cost the visit its quality: slow for 4 s, then fast: one step down, then back up after 10 s.
  const g = createScaleGovernor({ deviceRatio: 2 });
  const latch = createFrameLatch();
  let now = 0, down = 0, up = 0, tripped = false, last = 2;
  for (let n = 0; n < 130; n++) { now += 40; if (g.push(40, now)) { down++; last = g.scale; } if (g.atFloor && latch.push(40, now)) tripped = true; }
  check(down === 1 && last === 1.5 && !tripped, `a four-second stall costs one step, not the latch (steps down ${down}, ratio ${last}, latched ${tripped})`);
  for (let n = 0; n < 2000; n++) { now += 8; if (g.push(8, now)) { up++; last = g.scale; } if (g.atFloor && latch.push(8, now)) tripped = true; }
  check(up === 1 && g.scale === 2 && !tripped, `fast frames bring the ratio back (${up} step up, ratio ${g.scale})`);
}
{
  // Never up while the picture is busy; down regardless.
  const g = createScaleGovernor({ deviceRatio: 2 });
  let now = 0;
  for (let n = 0; n < 130; n++) { now += 40; g.push(40, now, false); }
  check(g.scale === 1.5, 'a step down does not wait for calm');
  for (let n = 0; n < 1500; n++) { now += 8; g.push(8, now, false); }
  check(g.scale === 1.5, 'a step up waits for calm');
  for (let n = 0; n < 1500; n++) { now += 8; g.push(8, now, true); }
  check(g.scale === 2, 'and comes when it is calm');
  check(createScaleGovernor({ deviceRatio: 2 }).push(NaN, 0) === false, 'bad durations are ignored');
}

{
  // A 60 Hz screen: frames are never under 16.7 ms, and the ladder still climbs (integration pass, 2026-10-10).
  const g = createScaleGovernor({ deviceRatio: 2 });
  let now = 0;
  for (let n = 0; n < 130; n++) { now += 40; g.push(40, now); }
  check(g.scale === 1.5, 'a stall takes one step');
  let upAt = null; const t0 = now;
  for (let n = 0; n < 900 && upAt === null; n++) { now += 16.7; if (g.push(16.7, now)) upAt = now - t0; }
  check(g.scale === 2 && upAt > 10000 && upAt < 11500, `sixty frames a second bring the ratio back after ten seconds (${upAt} ms, ratio ${g.scale})`);
  // 25 ms frames (forty a second) are not quick enough to try a sharper picture.
  const h = createScaleGovernor({ deviceRatio: 2 });
  now = 0; for (let n = 0; n < 130; n++) { now += 40; h.push(40, now); }
  for (let n = 0; n < 2000; n++) { now += 25; h.push(25, now); }
  check(h.scale === 1.5, 'forty frames a second stay where they are');
}
{
  // A device that cannot hold the higher ratio: quick at 1.5, slow at 2. The step up is tried, fails, and the
  // wait before the next try doubles each time, so the picture does not pump every thirteen seconds.
  const g = createScaleGovernor({ deviceRatio: 2 });
  let now = 0; const ups = [];
  for (let n = 0; n < 130; n++) { now += 40; g.push(40, now); }
  while (now < 400000) { const ms = g.scale === 2 ? 40 : 16.7; now += ms; const was = g.scale; if (g.push(ms, now) && g.scale > was) ups.push(Math.round(now / 1000)); }
  const gaps = ups.slice(1).map((t, k) => t - ups[k]);
  check(ups.length >= 3 && ups.length <= 6 && gaps.every((d, k) => k === 0 || d > gaps[k - 1] * 1.5), `a step up that does not hold is tried less and less often (tries at ${ups.join(', ')} s)`);
  check(g.upHoldMs > 10000 && g.upHoldMs <= 320000, 'the wait has grown, and has a ceiling');
}
{
  // A busy half second now and then (25 ms frames for 0.6 s every 4 s) does not start the ten seconds again.
  const g = createScaleGovernor({ deviceRatio: 2 });
  let now = 0;
  for (let n = 0; n < 130; n++) { now += 40; g.push(40, now); }
  const t0 = now; let upAt = null;
  while (now - t0 < 40000 && upAt === null) { const ms = ((now - t0) % 4000) < 600 ? 25 : 16.7; now += ms; if (g.push(ms, now)) upAt = now - t0; }
  check(g.scale === 2 && upAt !== null && upAt < 16000, `quick seconds add up across a busy moment (${upAt} ms)`);
  // Slow ones (40 ms for a second, every 4 s) are a reason to stay: the count starts again each time.
  const h = createScaleGovernor({ deviceRatio: 2 });
  now = 0; for (let n = 0; n < 130; n++) { now += 40; h.push(40, now); }
  const t1 = now; let moved = false; const was = h.scale;
  while (now - t1 < 40000) { const ms = ((now - t1) % 4000) < 1000 ? 40 : 16.7; now += ms; if (h.push(ms, now) && h.scale > was) moved = true; }
  check(!moved, 'a slow second every four keeps the ratio where it is');
}
{
  // A camera that follows something is never still: with nothing being shown the step comes after thirty seconds.
  const g = createScaleGovernor({ deviceRatio: 2 });
  let now = 0;
  for (let n = 0; n < 130; n++) { now += 40; g.push(40, now); }
  const t0 = now; let upAt = null;
  while (now - t0 < 60000 && upAt === null) { now += 16.7; if (g.push(16.7, now, false, true)) upAt = now - t0; }
  check(g.scale === 2 && upAt > 30000 && upAt < 32000, `a moving camera with nothing shown: the step up comes after thirty seconds (${upAt} ms)`);
  const h = createScaleGovernor({ deviceRatio: 2 });
  now = 0; for (let n = 0; n < 130; n++) { now += 40; h.push(40, now); }
  for (let n = 0; n < 6000; n++) { now += 16.7; h.push(16.7, now, false, false); }
  check(h.scale === 1.5, 'during a trip there is no step up however long it is quick');
}
{
  // The resting view (frames capped by choice): rest() counts as quick time, and brings the ratio back.
  const g = createScaleGovernor({ deviceRatio: 2 });
  let now = 0;
  for (let n = 0; n < 130; n++) { now += 40; g.push(40, now); }
  let up = 0;
  for (let n = 0; n < 250; n++) { now += 50; if (g.rest(now)) up++; }
  check(up === 1 && g.scale === 2, `ten seconds of rest take one step up (${up}, ratio ${g.scale})`);
  check(createScaleGovernor({ deviceRatio: 2 }).rest(0) === false, 'at the top there is nothing to climb');
  const f = createScaleGovernor({ deviceRatio: 2 }); now = 0;
  for (let n = 0; n < 130; n++) { now += 40; f.push(40, now); }
  f.freeze(); for (let n = 0; n < 400; n++) { now += 50; f.rest(now); }
  check(f.scale === 1.5, 'frozen: rest does not climb either');
}

if (problems.length) { console.error('quality FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('quality ok: the latch trips once after three slow seconds and never on stutters; the resolution scale steps 2, 1.5, 1.25, 1 before the latch and comes back; data-saver follows the connection');
