// tests/test_riseset.mjs -- rises, highest and sets from a place (internal #299): sky/riseset.js
// and the card's sentence (ui/cards.js worldFromLine, seeItLine).
//   node tests/test_riseset.mjs
import { riseHighestSet, RISE_SET_BODIES } from '../site/js/sky/riseset.js';
import { COPY, timeText } from '../site/js/copy/en.js';

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const london = { name: 'London', latDeg: 51.5, lonDeg: -0.1, altKm: 0 };
const min = (a, b) => Math.abs(a - b) / 60e3;

// The Sun over London on 8 October 2026: up about 06:13 UTC, down about 17:22 UTC (the almanac's
// 07:13 and 18:22 summer time), highest about 32.5 degrees (90 - 51.5 - 6 of southern declination).
{
  const night = Date.UTC(2026, 9, 8, 2, 0);
  const r = riseHighestSet('sun', london, night);
  check(r && !r.upNow && min(r.riseMs, Date.UTC(2026, 9, 8, 6, 13)) < 6, `sunrise ${r && new Date(r.riseMs).toISOString()}`);
  check(r && min(r.setMs, Date.UTC(2026, 9, 8, 17, 22)) < 6, `sunset ${r && new Date(r.setMs).toISOString()}`);
  check(r && Math.abs(r.highAltDeg - 32.5) < 1 && min(r.highMs, Date.UTC(2026, 9, 8, 11, 48)) < 6, `highest ${r && r.highAltDeg} at ${r && new Date(r.highMs).toISOString()}`);
  check(r && r.riseAzDeg > 90 && r.riseAzDeg < 105 && r.setAzDeg > 255 && r.setAzDeg < 270, `rises a little south of east, sets a little south of west (${r && r.riseAzDeg}, ${r && r.setAzDeg})`);
  const noon = riseHighestSet('sun', london, Date.UTC(2026, 9, 8, 10, 0));
  check(noon.upNow && noon.riseMs === null && noon.highMs !== null && noon.setMs !== null && noon.highMs < noon.setMs, 'up in the morning: highest, then sets');
  const pm = riseHighestSet('sun', london, Date.UTC(2026, 9, 8, 15, 0));
  check(pm.upNow && pm.highMs === null && min(pm.setMs, Date.UTC(2026, 9, 8, 17, 22)) < 6, 'up in the afternoon: past its highest, sets tonight');
  // Midsummer at Tromso: the Sun does not set. Midwinter: it does not rise.
  const tromso = { latDeg: 69.65, lonDeg: 18.96 };
  const mid = riseHighestSet('sun', tromso, Date.UTC(2026, 5, 21, 0, 0));
  check(mid.upNow && mid.always && mid.setMs === null, 'the midnight Sun does not set');
  const dark = riseHighestSet('sun', tromso, Date.UTC(2026, 11, 21, 0, 0));
  check(!dark.upNow && dark.never, 'the polar night: it does not rise');
  check(RISE_SET_BODIES.length === 10 && riseHighestSet('io', london, night) === null && riseHighestSet('mars', null, night) === null, 'ten bodies; anything else, or no place, is null');
  for (const id of RISE_SET_BODIES) {
    const b = riseHighestSet(id, london, night);
    check(b && (b.never || b.always || (b.setMs > night && (b.upNow || b.riseMs > night))), `${id}: times are ahead of now`);
  }
}

// The card's sentence.
{
  const { worldFromLine, seeItLine } = await import('../site/js/ui/cards.js');
  const night = Date.UTC(2026, 9, 8, 2, 0);
  const ctx = { observer: london, clock: { now: () => night } };
  const line = worldFromLine({ id: 'sun', klass: 'world' }, ctx, { tMs: night });
  check(/^From London: rises \d\d:\d\d in the east, highest \d\d:\d\d, about three and a half fists above the horizon; sets \d\d:\d\d in the west\.$/.test(line), `the Sun before dawn: ${line}`);
  check(line.includes(timeText.hhmm(riseHighestSet('sun', london, night).riseMs)), 'the times are the clock formatter\'s');
  const up = worldFromLine({ id: 'sun', klass: 'world' }, ctx, { tMs: Date.UTC(2026, 9, 8, 10, 0) });
  check(/^From London: up now, about .* above the horizon, in the south-south-east\. Highest \d\d:\d\d, .*; sets \d\d:\d\d in the west\.$/.test(up), `the Sun mid-morning: ${up}`);
  const past = worldFromLine({ id: 'sun', klass: 'world' }, ctx, { tMs: Date.UTC(2026, 9, 8, 15, 0) });
  check(/Past its highest; sets \d\d:\d\d in the west\.$/.test(past), `the Sun mid-afternoon: ${past}`);
  const noName = worldFromLine({ id: 'mars', klass: 'world' }, { observer: { latRad: 0.9, lonRad: 0 }, clock: ctx.clock }, { tMs: night });
  check(noName && noName.startsWith(`From ${COPY.sky.worldHere}`), `a place with no name is "where you are": ${noName}`);
  check(worldFromLine({ id: 'mars', klass: 'world' }, { clock: ctx.clock }, { tMs: night }) === null, 'no place, no line');
  check(worldFromLine({ id: 'titan', klass: 'world' }, ctx, { tMs: night }) === null, 'a moon the library does not solve: no line');
  const see = seeItLine({ id: 'jupiter', klass: 'world', meta: {} }, ctx, { ok: true, tMs: night }, { state: 'na' });
  check(see.startsWith('From London: ') && see.endsWith(COPY.sky.worldFrom.honest) && !see.includes('not in this version'), `Jupiter's card says when: ${see}`);
  const nep = seeItLine({ id: 'neptune', klass: 'world', meta: {} }, ctx, { ok: true, tMs: night }, { state: 'na' });
  check(nep.startsWith(COPY.sky.worldSee.neptune) && nep.includes('From London: '), 'Neptune: what it takes to see it, then when');
  const noPlace = seeItLine({ id: 'jupiter', klass: 'world', meta: {} }, { clock: ctx.clock }, { ok: true, tMs: night }, { state: 'na' });
  check(noPlace === COPY.sky.worldNoRise, 'without a place the old line stands');
  console.log('  ' + see);
}

if (problems.length) { console.error(`test_riseset: ${problems.length} problem(s)`); for (const p of problems) console.error('  - ' + p); process.exit(1); }
console.log('test_riseset: ok');
