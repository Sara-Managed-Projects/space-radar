// tests/test_star_magnitude.mjs -- the stars' brightness and colour are monotonic in their source values (internal #818).
//
// "Nearby star colors/brightness monotonic vs source values." The baseline of 2026-10-14 found stars drawn
// magnitude-scaled with a B-V colour and no test holding the order. This holds, on the real file
// (site/data/stars3d.bin, HYG v4.4) and on the real functions:
//   1. the file's apparent magnitude agrees with its absolute magnitude and distance, for every drawn star within 100 ly;
//   2. a brighter star is never drawn smaller or fainter: both curves (scene/starfield.js magToSize and
//      magToAlpha, and the 3D draw's vertex shader, whose arithmetic is pinned here and re-run) fall as the
//      magnitude rises, across the nearby stars sorted by magnitude;
//   3. on the stellar rung the magnitude is the one at the camera: it grows with distance by 5 log10 of the
//      ratio, so a star drawn from further off is never brighter (scene/stars3d.js apparentMagOf);
//   4. the exposure (Eye, Camera, Deep) only ever lets more stars through, and a star past the limit has no alpha;
//   5. a cooler star (higher B-V) is never bluer: temperature falls and red over blue rises with B-V, in the
//      colour the sprite is given (scene/starfield.js starTint) and across the nearby stars sorted by B-V.
// Run: node tests/test_star_magnitude.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { parseStars3d, apparentMagOf } = await import(join(JS, 'scene/stars3d.js'));
const { magToSize, magToAlpha, bvToKelvin, starTint } = await import(join(JS, 'scene/starfield.js'));
const { exposureLook, EXPOSURES } = await import(join(JS, 'scene/exposure.js'));

const bin = readFileSync(join(ROOT, 'site/data/stars3d.bin'));
const data = parseStars3d(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const names = JSON.parse(readFileSync(join(ROOT, 'site/data/stars3d.names.json'), 'utf8')).rows;
const PC_PER_LY = 1 / 3.261563777;
const FILE_LIMIT = 7.5; // the faintest magnitude the file holds and the shader draws (uMagLimit)
const distLy = (i) => Math.hypot(data.posLy[i * 3], data.posLy[i * 3 + 1], data.posLy[i * 3 + 2]);

// The nearby stars that are drawn: within 100 ly of the Sun and no fainter than the file's limit.
const near = [];
for (let i = 0; i < data.count; i += 1) {
  const d = distLy(i);
  if (d > 1 && d <= 100 && data.appMag[i] <= FILE_LIMIT) near.push(i);
}
check(near.length > 300 && near.length < 3000, `a plausible set of nearby drawn stars (${near.length})`);

// 1. The file agrees with itself: m = M + 5 log10(d / 10 pc).
let worst = 0;
for (const i of near) worst = Math.max(worst, Math.abs(data.absMag[i] + 5 * Math.log10(distLy(i) * PC_PER_LY / 10) - data.appMag[i]));
check(worst < 0.01, `apparent magnitude is absolute magnitude plus the distance modulus for every nearby drawn star (worst ${worst.toFixed(4)})`);

// 2. A brighter star is never smaller or fainter. The 3D draw's own curve (VERT in scene/stars3d.js), pinned and re-run.
const src3d = readFileSync(join(JS, 'scene/stars3d.js'), 'utf8');
check(/float tt = clamp\( \( 6\.5 - m \) \/ 8\.0, 0\.0, 1\.0 \);/.test(src3d)
  && /float core = 1\.0 \+ 5\.0 \* pow\( tt, 1\.6 \);/.test(src3d)
  && /\( 0\.35 \+ 0\.65 \* tt \) \* uGain/.test(src3d), 'the 3D draw\'s curve is the one this test re-runs (tt, core and alpha lines)');
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const coreOf = (m) => 1 + 5 * clamp01((6.5 - m) / 8) ** 1.6;
const alphaOf = (m) => 0.35 + 0.65 * clamp01((6.5 - m) / 8);
const byMag = near.slice().sort((a, b) => data.appMag[a] - data.appMag[b]);
const falls = (f) => byMag.every((i, k) => k === 0 || f(data.appMag[i]) <= f(data.appMag[byMag[k - 1]]) + 1e-12);
for (const [name, f] of [['magToSize', magToSize], ['magToAlpha', magToAlpha], ['the 3D core', coreOf], ['the 3D alpha', alphaOf]]) {
  check(falls(f), `${name} never rises as the magnitude does, across the ${byMag.length} nearby stars sorted by magnitude`);
}
const steps = [-1.5, 0, 1, 2, 3, 4, 5, 6];
for (const [name, f] of [['magToSize', magToSize], ['magToAlpha', magToAlpha], ['the 3D core', coreOf], ['the 3D alpha', alphaOf]]) {
  check(steps.every((m, k) => k === 0 || f(m) < f(steps[k - 1])), `${name} falls at every whole magnitude from -1.5 to 6, so a magnitude is always a visible step`);
}
const row = (proper) => names.find((r) => r[1] === proper);
const sirius = row('Sirius'); const vega = row('Vega'); const altair = row('Altair');
check(sirius && vega && altair, 'Sirius, Vega and Altair are named rows');
if (sirius && vega && altair) {
  const m = (r) => data.appMag[r[0]];
  check(m(sirius) < m(vega) && m(vega) < m(altair), `the file orders them Sirius ${m(sirius).toFixed(2)}, Vega ${m(vega).toFixed(2)}, Altair ${m(altair).toFixed(2)}`);
  check(magToSize(m(sirius)) > magToSize(m(vega)) && magToSize(m(vega)) > magToSize(m(altair)), 'and the sky draws them in that size order');
  check(coreOf(m(sirius)) > coreOf(m(vega)) && coreOf(m(vega)) > coreOf(m(altair)), 'and so does the 3D draw');
}

// 3. On the stellar rung the magnitude is the one at the camera: further off is fainter, by 5 log10 of the ratio.
const probe = byMag.filter((i) => data.appMag[i] < 3).slice(0, 12);
check(probe.length >= 5, `a handful of bright nearby stars to move away from (${probe.length})`);
const at = (i, k) => { // the camera k times as far from star i as the Sun is, along the line through the Sun (positions in pc, unitsPerPc 1)
  const p = [0, 1, 2].map((a) => data.posLy[i * 3 + a] * PC_PER_LY);
  return apparentMagOf(data.appMag[i], data.absMag[i], false, p[0], p[1], p[2], { x: p[0] * (1 - k), y: p[1] * (1 - k), z: p[2] * (1 - k) }, 1);
};
for (const i of probe) {
  const ms = [0.5, 1, 2, 4, 8].map((k) => at(i, k));
  check(ms.every((m, k) => k === 0 || m > ms[k - 1]), `star ${i}: twice as far is fainter at every step`);
  check(Math.abs(at(i, 2) - at(i, 1) - 5 * Math.log10(2)) < 1e-6, `star ${i}: doubling the distance costs 5 log10 2 = 1.505 magnitudes`);
  check(Math.abs(at(i, 1) - data.appMag[i]) < 0.01, `star ${i}: from the Sun the stellar rung shows the catalogue's magnitude`);
  check(apparentMagOf(data.appMag[i], data.absMag[i], true, 9, 9, 9, { x: 0, y: 0, z: 0 }, 1) === data.appMag[i], `star ${i}: in shell mode the catalogue's magnitude is used as it stands`);
}

// 4. The exposure only lets more through, and the shader gives a star past the limit no alpha.
check(/vAlpha = \( m > uMagLimit \) \? 0\.0 : /.test(src3d), 'a star past the magnitude limit has alpha 0');
const countTo = (lim) => { let n = 0; for (let i = 0; i < data.count; i += 1) if (data.appMag[i] <= lim) n += 1; return n; };
const drawn = EXPOSURES.map((e) => ({ e, lim: exposureLook(e).starLimit, n: countTo(Math.min(FILE_LIMIT, exposureLook(e).starLimit)) }));
check(drawn.every((d, k) => k === 0 || (d.lim >= drawn[k - 1].lim && d.n >= drawn[k - 1].n)), `Eye, Camera, Deep show no fewer stars each (${drawn.map((d) => `${d.e} ${d.n}`).join(', ')})`);
check(drawn[0].n < drawn[1].n, 'and a longer exposure than the Eye\'s shows more');
check(drawn.every((d) => d.lim <= FILE_LIMIT), 'no exposure asks for a star the file does not hold');
check(drawn[0].n > 8000 && drawn[0].n < 11000, `the Eye shows about the naked-eye count (${drawn[0].n})`);

// 5. A cooler star is never bluer.
const grid = []; for (let bv = -0.3; bv <= 2.0001; bv += 0.05) grid.push(bv);
check(grid.every((bv, k) => k === 0 || bvToKelvin(bv) < bvToKelvin(grid[k - 1])), 'temperature falls at every step of B-V from -0.3 to 2.0');
const warmth = (bv) => { const t = starTint(bv); return t[0] / Math.max(t[2], 1e-6); };
check(grid.every((bv, k) => k === 0 || warmth(bv) >= warmth(grid[k - 1]) - 1e-9), 'red over blue in the sprite\'s colour never falls as B-V rises');
check(warmth(-0.3) < 1 && warmth(2.0) > 3 && warmth(0.65) > 1 && warmth(0.65) < 2, `and ends where it should: blue at -0.3 (${warmth(-0.3).toFixed(2)}), cream at the Sun's 0.65 (${warmth(0.65).toFixed(2)}), red at 2.0 (${warmth(2.0).toFixed(2)})`);
const coloured = near.filter((i) => Number.isFinite(data.ci[i])).sort((a, b) => data.ci[a] - data.ci[b]);
check(coloured.length > 200, `nearby stars with a colour index (${coloured.length})`);
check(coloured.every((i, k) => k === 0 || bvToKelvin(data.ci[i]) <= bvToKelvin(data.ci[coloured[k - 1]]) + 1e-9), 'across the nearby stars sorted by B-V, temperature never rises');
check(coloured.every((i, k) => k === 0 || warmth(data.ci[i]) >= warmth(data.ci[coloured[k - 1]]) - 1e-9), 'and red over blue never falls');
check(near.every((i) => starTint(data.ci[i]).every((c) => c >= 0 && c <= 1)), 'every tint is a colour (channels between 0 and 1, the brightest at 1), a star with no colour index included');

if (problems.length) { console.error('star magnitude FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`star magnitude ok: ${near.length} nearby drawn stars, brightness and colour in the order of their magnitude and B-V, the exposure only adding stars`);
