// tests/test_farclock.mjs -- the map's worlds on a far clock (forge #141; release 2.0.0 batch c2-deep).
//
//   node tests/test_farclock.mjs
//
// The orbital view stopped at AD 50 000: a debugger pause in the stuck page (three samples) was always inside
// astronomy-engine's CalcPlutoOneWay, reached from propagate/frames.js worldHelioEclKm every frame. Outside its table
// (years 0 to 4000) the engine crawls to Pluto in 146-day steps of a four-planet simulation, so the cost of one call
// grows with the years: about 20 000 steps at AD 12 000, 115 000 at AD 50 000. What it holds:
//   1. Pluto and Charon have a place today and none outside the table, and asking costs nothing, in propagate/frames.js
//      and in scene/worlds.js positionOf (the second caller the second pause found);
//   2. every other world with an ephemeris answers at AD 50 000 and 48 000 BC, each in well under a frame's worth;
//   3. the line under the time bar says Pluto is not drawn there (copy/en.deep.js starDeep.noPluto).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(join(ROOT, 'site/js/propagate/frames.js'));
const Wd = await import(join(ROOT, 'site/js/scene/worlds.js'));
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
await import(join(ROOT, 'site/js/copy/en.deep.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const at = (y) => { const d = new Date(0); d.setUTCFullYear(y, 10, 8); return d.getTime(); };
const timed = (w, y) => { const t0 = performance.now(); const r = F.worldHelioEclKm(w, at(y)); return { r, ms: performance.now() - t0 }; };

check(timed('pluto', 2026).r && timed('charon', 2026).r, 'Pluto and Charon have a place today');
for (const y of [50000, 12000, -48000, 4100, -20]) {
  for (const w of ['pluto', 'charon']) { const { r, ms } = timed(w, y); check(r === null && ms < 5, `${w} in ${y}: not drawn, asked in ${ms.toFixed(1)} ms`); }
}
for (const y of [50000, -48000]) { const t0 = performance.now(); const p = Wd.positionOf('pluto', at(y)); check(p === null && performance.now() - t0 < 5, `scene/worlds.js positionOf: Pluto in ${y} not drawn, at once`); }
check(Wd.positionOf('pluto', at(2026)) !== null, 'scene/worlds.js: Pluto drawn today');
check(timed('pluto', 3900).r !== null && timed('pluto', 100).r !== null, 'inside the table it is drawn');
let worst = 0;
for (const w of ['mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
  for (const y of [50000, -48000]) {
    timed(w, y); // the first call fills the engine's caches
    const { r, ms } = timed(w, y);
    worst = Math.max(worst, ms);
    check(r && Number.isFinite(r.x), `${w} in ${y} answers`);
  }
}
check(worst < 50, `the slowest world at a far clock takes ${worst.toFixed(1)} ms`);
check(/Pluto/.test(COPY.starDeep.noPluto) && /0 to 4000/.test(COPY.starDeep.noPluto), 'the line says why Pluto is not drawn');

if (problems.length) { console.error(`farclock: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log(`farclock ok: Pluto and Charon not drawn outside the years 0 to 4000 (no crawl); the other worlds answer at AD 50 000 in ${worst.toFixed(1)} ms at worst`);
