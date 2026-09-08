// tests/test_quality.mjs -- spec 0026 req 18: the frame-rate latch and data-saver.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { createFrameLatch, shouldSaveData } = await import(join(JS, 'scene/quality.js'));
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

if (problems.length) { console.error('quality FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('quality ok: the latch trips once after three slow seconds and never on stutters; data-saver follows the connection');
