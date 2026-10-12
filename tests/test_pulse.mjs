// A pulsar's pulse (public #426): the period it is drawn with, the light through one turn, the
// card's sentence, and the Event Horizon Telescope's pictures on their own cards.
// Run: node tests/test_pulse.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { shownPeriod, pulseAt, MIN_SHOWN_S, PULSE_FLOOR, PULSE_WIDTH } = await import(join(JS, 'scene/pulse.js'));
const { EXOTICS } = await import(join(JS, 'data/exotics.js'));

const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

// ---- 1. the scaling ---------------------------------------------------------------------------
const cases = [
  [0.0333924123, 100, 'the Crab: 33 ms, a hundred times slower, 3.3 s'],
  [0.089328385024, 10, 'Vela: 89 ms, ten times slower'],
  [1.3373021601895, 1, 'PSR B1919+21, the first one found: 1.34 s, as it is'],
  [7.55592, 1, 'the magnetar: 7.6 s, as it is'],
  [0.00139595482, 1000, 'the fastest known: 1.4 ms, a thousand times slower'],
  [0.5, 1, 'exactly half a second is not slowed'],
  [0.05, 10, '50 ms becomes exactly half a second'],
];
for (const [p, slower, what] of cases) {
  const s = shownPeriod(p);
  check(s && s.slower === slower && Math.abs(s.shownS - p * slower) < 1e-12, `${what} (got x${s && s.slower}, ${s && s.shownS.toFixed(3)} s)`);
}
check(shownPeriod(null) === null && shownPeriod(0) === null && shownPeriod(-1) === null && shownPeriod(NaN) === null, 'no period, no pulse');
const withPeriod = EXOTICS.filter((x) => x.periodS > 0);
check(withPeriod.length >= 9, `the registry's rows with a period all blink (${withPeriod.length})`);
for (const x of withPeriod) {
  const s = shownPeriod(x.periodS);
  check(s.shownS >= MIN_SHOWN_S && s.shownS < MIN_SHOWN_S * 10 || s.slower === 1, `${x.id}: drawn at ${s.shownS.toFixed(2)} s, between half a second and five (or its own rate)`);
  check([1, 10, 100, 1000].includes(s.slower), `${x.id}: slowed by a power of ten a card can say (${s.slower})`);
  // The least power: one less would be under half a second.
  check(s.slower === 1 || x.periodS * (s.slower / 10) < MIN_SHOWN_S, `${x.id}: by the least power of ten that does it`);
}

// ---- 2. the light through one turn --------------------------------------------------------------
{
  const P = 2;
  check(Math.abs(pulseAt(0, P) - 1) < 1e-12 && Math.abs(pulseAt(P, P) - 1) < 1e-9 && Math.abs(pulseAt(7 * P, P) - 1) < 1e-9, 'full at the start of every turn');
  check(Math.abs(pulseAt(P / 2, P) - PULSE_FLOOR) < 1e-6, 'and down to the floor half a turn later: a light left on, so the place is not lost');
  check(Math.abs(pulseAt(0.1 * P, P) - pulseAt(0.9 * P, P)) < 1e-9, 'the flash is the same coming and going');
  let lit = 0;
  for (let i = 0; i < 1000; i++) if (pulseAt((i / 1000) * P, P) > 0.5 * (1 + PULSE_FLOOR)) lit++;
  check(lit / 1000 > 0.08 && lit / 1000 < 0.16, `the flash is above half its height for ${(lit / 10).toFixed(1)} % of the turn: a blink, not a throb (sigma ${PULSE_WIDTH})`);
  check(pulseAt(1, 0) === PULSE_FLOOR && pulseAt(1, NaN) === PULSE_FLOOR, 'no period: the steady floor');
}

// ---- 3. the GPU's formula is the same one, and the wall's clock drives it -----------------------
const src = readFileSync(join(JS, 'scene/pulsars.js'), 'utf8');
check(/float phase = fract\( uTime \/ aPeriod \);/.test(src) && /min\( phase, 1\.0 - phase \) \//.test(src) && /exp\( -d \* d \)/.test(src), 'the shader computes pulseAt()');
check(src.includes('${PULSE_WIDTH.toFixed(3)}') && src.includes('${PULSE_FLOOR.toFixed(2)}'), 'with the module\'s own width and floor');
check(/prefers-reduced-motion: reduce/.test(src) && /uSteady/.test(src), 'steady under reduced motion');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/import\('\.\/scene\/pulsars\.js'\)/.test(main) && !/^import .*pulsars\.js/m.test(main), 'main.js imports the pulsars when they are first drawn, not at boot');
check(/ctx\.pulsars\.update\(ctx\.camera, ctx\.renderer, exoticsOn, nowReal\)/.test(main), 'and drives them with the wall clock, not the map\'s');

// ---- 4. the card's sentence, and the pictures outside a trip -----------------------------------
const layers = await import(join(JS, 'data/layers.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const fn = layers.exoticRecords || null;
const recs = fn ? fn() : null;
if (!recs) problems.push('data/layers.js exports exoticRecords()');
else {
  const by = new Map(recs.map((r) => [r.id, r]));
  check(/100 times slower/.test(by.get('exotic-crab-pulsar').meta.departure || ''), `the Crab's card says a hundred times slower (${by.get('exotic-crab-pulsar').meta.departure})`);
  check((by.get('exotic-psr-b1919-21').meta.departure || '') === COPY.drawing.exoticDeparture.pulseTrue, 'the first pulsar\'s card says it blinks at its own rate');
  check(/1[\s,  ]?000 times slower/.test(by.get('exotic-psr-j1748-2446ad').meta.departure || ''), `the fastest one's says a thousand (${by.get('exotic-psr-j1748-2446ad').meta.departure})`);
  for (const id of ['exotic-sgr-a-star', 'exotic-m87-star']) check((by.get(id).meta.departure || '').includes('far larger'), `${id}: the card says its picture is drawn far larger than life`);
  for (const id of ['exotic-cygnus-x-1', 'exotic-gaia-bh1', 'exotic-gaia-bh3']) check(!by.get(id).meta.departure, `${id}: no picture, no pulse, no sentence`);
}
check(/cardPortrait = record && record\.klass === 'exotic' && record\.meta && record\.meta\.image/.test(main), 'a black hole with a picture shows it while its card is open');
check(/const want = tripUp \? tripPortrait : cardPortrait;/.test(main), 'and inside a trip the trip decides');

if (problems.length) { console.error(`pulse: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log(`pulse ok: ${withPeriod.length} rows blink, each slowed by the least power of ten that brings it to ${MIN_SHOWN_S} s, and each card says so; the two photographed black holes are drawn while their cards are open`);
