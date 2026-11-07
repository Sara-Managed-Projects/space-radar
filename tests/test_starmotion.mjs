// tests/test_starmotion.mjs -- the sky of another millennium (forge #141): sky/starmotion.js, data/starmotion.bin,
// ui/deeptime.js's pure parts.
//
//   node tests/test_starmotion.mjs
//
// What it holds:
//   1. THE LONG-TERM PRECESSION IS VONDRAK 2011: at J2000 its poles are the J2000 ones (the periodic and polynomial
//      terms cancel to a milliarcsecond, which only the right coefficients do), the pole moves 20.04" a year in x
//      as the IAU 2006 rate says, the obliquity is 84 381.406", and within a few centuries it agrees with the IAU 1976
//      matrix sky/constellation.js uses to an arcsecond-sized margin.
//   2. THE POLE STARS of history: Polaris nearest the pole about 2100 (under half a degree), Thuban within a degree
//      about 2800 BC, Vega within 7 degrees about AD 13 700 -- with the stars at their moved places.
//   3. BARNARD'S STAR in the year 12 000: the issue's test. Its closest approach is 3.7 to 3.8 light-years between
//      11 500 and 12 000 (the literature: 3.75 ly about 11 800), and its place in 12 000 is the straight-line
//      space-motion answer worked here independently from its Gaia DR3 astrometry, to 0.2 degrees.
//   4. THE FILE: 17 207 stars, every naked-eye one, Barnard's corrected, under its budget.
//   5. THE FAR SKY'S FRAME: for a clock near now, farEqjToLocal agrees with Astronomy Engine's own (sky/skybodies.js)
//      to 0.05 degrees, and the calendar's Sun with the engine's to 0.05 degrees.
//   6. motionYears is 0 within 50 years of now and the years from J2000 beyond; the deep-time row's year words,
//      steps and readout.
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const M = await import(join(ROOT, 'site/js/sky/starmotion.js'));
const A = await import(join(ROOT, 'site/vendor/astronomy.js'));
const { eqjToLocal } = await import(join(ROOT, 'site/js/sky/skybodies.js'));
const { precessTo1875 } = await import(join(ROOT, 'site/js/sky/constellation.js'));
const D = await import(join(ROOT, 'site/js/ui/deeptime.js'));
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
const budgets = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DEG = Math.PI / 180;
const AS = DEG / 3600;
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / DEG;
const dirOf = (raDeg, decDeg) => [Math.cos(decDeg * DEG) * Math.cos(raDeg * DEG), Math.cos(decDeg * DEG) * Math.sin(raDeg * DEG), Math.sin(decDeg * DEG)];
const mul = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];

// 1. Vondrak 2011
const p0 = M.equatorPole(2000);
check(Math.abs(p0[0]) < 1e-3 * AS && Math.abs(p0[1]) < 1e-3 * AS, `the J2000 pole is off by ${(p0[0] / AS).toExponential(2)}", ${(p0[1] / AS).toExponential(2)}"`);
check(Math.abs(M.obliquityDeg(2000) * 3600 - 84381.406) < 0.001, `the J2000 obliquity is ${(M.obliquityDeg(2000) * 3600).toFixed(4)}"`);
const rate = M.equatorPole(2001)[0] / AS;
check(Math.abs(rate - 20.04) < 0.01, `the pole moves ${rate.toFixed(3)}" a year in x (IAU 2006: 20.04)`);
for (const y of [1600, 2400]) {
  // constellation.js precesses to 1875 with the IAU 1976 matrix; compare where the J2000 pole of `y` lands.
  const P = M.precessionMatrix(y);
  const poleY = [P[6], P[7], P[8]];
  const viaLieske = precessTo1875([0, 0, 1], y);
  const viaVondrak = precessTo1875(poleY, 2000);
  check(ang(viaLieske, viaVondrak) < 0.01, `the pole of ${y}: Vondrak and Lieske differ by ${ang(viaLieske, viaVondrak).toFixed(4)} deg`);
}

// 4. the file
const raw = readFileSync(join(ROOT, 'site/data/starmotion.bin'));
const m = M.parseMotion(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
check(m.count === 17207, `starmotion.bin holds ${m.count} stars`);
check(m.faintest > 7 && m.mag[0] < -1, 'brightest first, Sirius first');
const row = /\{id: star_motion_bytes, value: (\d+)/.exec(budgets);
check(row && statSync(join(ROOT, 'site/data/starmotion.bin')).size <= Number(row[1]), 'starmotion.bin is within registry/budgets.yaml star_motion_bytes');
const match = M.createMatcher(m);
const barnard = match(dirOf(17.963472 * 15, 4.693388), 0.01);
check(barnard >= 0 && Math.abs(m.mag[barnard] - 9.54) < 0.1, "Barnard's Star is in the file");
for (let i = 0; i < 200; i += 1) check(match([m.dir[i * 3], m.dir[i * 3 + 1], m.dir[i * 3 + 2]], 0.001) === i || m.mag[i] > 6, `star ${i} does not find itself`);

// 3. Barnard's Star, independently: Gaia DR3 astrometry, the straight line in space
{
  const ra = 17.963472 * 15 * DEG;
  const dec = 4.693388 * DEG;
  const dPc = 1000 / 546.9759;
  const k = 4.740470463533348;
  const u = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const ea = [-Math.sin(ra), Math.cos(ra), 0];
  const ed = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)];
  const v = [0, 1, 2].map((i) => -110.47 * u[i] + k * -0.801551 * dPc * ea[i] + k * 10.362394 * dPc * ed[i]); // km/s
  const lyPerYrPerKms = 3.2615637771674333 / 977792.2216807891;
  const at = (years) => { const dLy = dPc * 3.2615637771674333; return [0, 1, 2].map((i) => u[i] * dLy + v[i] * lyPerYrPerKms * years); };
  const want = at(10000);
  const got = M.moveOne(m, barnard, 10000);
  const sep = ang(got, want.map((x) => x / Math.hypot(...want)));
  check(sep < 0.2, `Barnard's Star in 12 000 is ${sep.toFixed(3)} degrees from the straight-line answer`);
  let best = [Infinity, 0];
  for (let y = 9000; y <= 15000; y += 25) {
    const yrs = y - 2000;
    const r = Math.hypot(...[0, 1, 2].map((i) => m.dir[barnard * 3 + i] * m.dist[barnard] + m.vel[barnard * 3 + i] * yrs));
    if (r < best[0]) best = [r, y];
  }
  check(best[0] > 3.7 && best[0] < 3.8 && best[1] >= 11500 && best[1] <= 12000, `Barnard's Star's closest is ${best[0].toFixed(3)} ly in ${best[1]}`);
}

// 2. pole stars
const nearestBright = (epj, ra, dec) => {
  const dirs = M.moveAll(m, epj - 2000);
  const p = M.poleStar(m, dirs, epj);
  const want = match(dirOf(ra, dec), 0.05);
  return { same: p.index === want, sep: p.sepDeg };
};
const polaris = nearestBright(2100, 37.9546, 89.2641);
check(polaris.same && polaris.sep < 0.5, `in 2100 the pole star is Polaris, ${polaris.sep.toFixed(2)} degrees from the pole`);
const thuban = nearestBright(-2799, 211.0973, 64.3758);
check(thuban.same && thuban.sep < 1, `in 2800 BC the pole star is Thuban, ${thuban.sep.toFixed(2)} degrees`);
const vega = nearestBright(13700, 279.2347, 38.7837);
check(vega.same && vega.sep < 7, `in AD 13 700 the bright star nearest the pole is Vega, ${vega.sep.toFixed(2)} degrees`);

// 5. the far frame agrees with the engine near now
const obs = new A.Observer(51.5, -0.1, 0);
for (const ms of [Date.UTC(2026, 10, 7, 22), Date.UTC(2100, 5, 1, 3)]) {
  const a = eqjToLocal(new Date(ms), obs);
  const b = M.farEqjToLocal(ms, 51.5, -0.1);
  let worst = 0;
  for (const v of [[1, 0, 0], [0, 1, 0], [0, 0, 1], dirOf(83, -5)]) worst = Math.max(worst, ang(mul(a, v), mul(b, v)));
  check(worst < 0.05, `near now the far frame is ${worst.toFixed(4)} degrees from the engine's`);
  const s = A.GeoVector(A.Body.Sun, new Date(ms), true);
  const sun = [s.x, s.y, s.z].map((x) => x / s.Length());
  check(ang(sun, M.calendarSunEqj(ms)) < 0.05, `the calendar's Sun is ${ang(sun, M.calendarSunEqj(ms)).toFixed(3)} degrees from the engine's`);
}
check(M.isFar(Date.UTC(2026, 0, 1)) === false && M.isFar(Date.UTC(2000, 0, 1) + 3000 * 365.25 * 864e5) === true, 'isFar past 2 500 years from J2000');
// a far clock goes through the long-term frame in sky/skybodies.js, and the Moon is not drawn
{
  const d = new Date(0); d.setUTCFullYear(50000, 10, 7); d.setUTCHours(22);
  const a = eqjToLocal(d, obs);
  const b = M.farEqjToLocal(d.getTime(), 51.5, -0.1);
  check(a.every((x, i) => Math.abs(x - b[i]) < 1e-12), 'sky/skybodies.js eqjToLocal is the long-term frame on a far clock');
}

// 6. gates and words
const now = Date.UTC(2026, 10, 7);
check(M.motionYears(now + 40 * 365.25 * 864e5, now) === 0, 'within 50 years nothing moves');
// Julian years: 10 000 Gregorian years are 0.2 of a Julian year short of 10 000.
check(Math.abs(M.motionYears(Date.UTC(12000, 0, 1, 12), now) - 9999.8) < 0.05, 'the year 12 000 moves the stars 10 000 years from J2000');
const K = COPY.deepTime;
const sp = (x) => String(x).replace(/\s/g, ' '); // fmt.int groups with a no-break space
check(K && sp(D.yearWords(14000, K)) === 'AD 14 000' && sp(D.yearWords(-2799, K)) === '2 800 BC' && D.yearWords(2026, K) === '2026', `year words: ${D.yearWords(14000, K)}, ${D.yearWords(-2799, K)}`);
const s1 = D.shiftYears(Date.UTC(2024, 1, 29, 22, 30), 1000, now);
check(new Date(s1).getUTCFullYear() === 3024 && new Date(s1).getUTCHours() === 22, 'a step keeps the hour');
const s2 = D.shiftYears(now, 500000, now);
check(new Date(s2).getUTCFullYear() === 2026 + M.DEEP_YEARS, 'a step stops at 100 000 years');
const w = D.deepWords({ epoch: 13700, pole: { name: 'Vega', mag: 0, sepDeg: 6.2 } }, true, K);
check(w && /13 700/.test(sp(w.line)) && /^Pole star: Vega/.test(w.pole) && /Moon/.test(w.line), `the readout: ${w && w.line} / ${w && w.pole}`);
const w2 = D.deepWords({ epoch: 2026, pole: { name: null, mag: 3.6, sepDeg: 10.9 } }, false, K);
check(/^No bright/.test(w2.pole) && /magnitude 3/.test(sp(w2.pole)) && !/Moon/.test(w2.line), `no pole star: ${w2.pole}`);
check(D.deepWords(null, false, K) === null, 'no readout for today');

if (problems.length) {
  console.error(`starmotion FAILED (${problems.length}):\n  ` + problems.slice(0, 30).join('\n  '));
  process.exit(1);
}
console.log(`starmotion ok: Vondrak 2011 to a milliarcsecond at J2000; Polaris ${polaris.sep.toFixed(2)} deg (2100), Thuban ${thuban.sep.toFixed(2)} (2800 BC), Vega ${vega.sep.toFixed(2)} (13 700); Barnard's Star held in 12 000; ${m.count} stars`);
