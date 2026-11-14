// internal #279: star colours come from the colorimetric black-body table, within 2/255 of every one of its 391 rows.
// The full table is read from the source page's saved copy only when it is given (BBR_COLOR=<file>); CI holds the
// knots, their order, the white point, the ends and the hue ordering.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { kelvinToRgb, bvToKelvin } = await import(join(ROOT, 'site/js/scene/starfield.js'));
const { BLACKBODY } = await import(join(ROOT, 'site/js/data/blackbody.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const px = (k) => kelvinToRgb(k).map((v) => Math.round(v * 255));

check(BLACKBODY.rgb.length === BLACKBODY.kelvin.length * 6 && BLACKBODY.kelvin.every((k, i) => i === 0 || k > BLACKBODY.kelvin[i - 1]), 'the knots are in order, six hex digits each');
check(BLACKBODY.kelvin[0] === 1000 && BLACKBODY.kelvin.at(-1) === 40000, 'from 1 000 K to 40 000 K, as the source');
// Values of the source's 2 degree rows (read 2026-11-14), at knots and between them.
const rows = { 1000: [255, 51, 0], 3000: [255, 185, 105], 5800: [255, 241, 231], 10000: [207, 218, 255], 40000: [161, 183, 255] };
for (const [k, want] of Object.entries(rows)) {
  const got = px(Number(k));
  check(got.every((v, i) => Math.abs(v - want[i]) <= 2), `${k} K is ${want} in the table (got ${got})`);
}
check(kelvinToRgb(500).join() === kelvinToRgb(1000).join() && kelvinToRgb(90000).join() === kelvinToRgb(40000).join(), 'outside the table the ends hold');
for (const k of [1000, 2345, 4000, 5772, 6500, 6600, 9000, 20000, 40000]) {
  const c = kelvinToRgb(k);
  check(Math.max(...c) === 1 && c.every((v) => v >= 0 && v <= 1), `${k} K: brightest channel 1, all in range`);
}
const sun = px(5772);
check(sun[0] === 255 && sun[1] > 225 && sun[2] > 210 && sun[2] < sun[1], 'the Sun is a cream white, red full and blue the lowest');
check(px(3000)[2] < px(5000)[2] && px(5000)[2] < px(8000)[2] && px(30000)[0] < px(8000)[0], 'cooler is redder, hotter is bluer');
check(bvToKelvin(0.65) > 5000, 'bvToKelvin is untouched');
// the whole table, when the saved page is at hand
const saved = process.env.BBR_COLOR;
if (saved && existsSync(saved)) {
  let worst = 0, n = 0;
  for (const line of readFileSync(saved, 'utf8').split('\n')) {
    const m = line.replace(/<[^>]*>/g, '').match(/^\s*(\d+) K\s+2deg\s+[\d.]+ [\d.]+\s+[\d.e+]+\s+[\d.]+ [\d.]+ [\d.]+\s+(\d+)\s+(\d+)\s+(\d+)\s+#/);
    if (!m) continue;
    const got = px(Number(m[1]));
    worst = Math.max(worst, ...got.map((v, i) => Math.abs(v - Number(m[2 + i]))));
    n += 1;
  }
  check(n === 391 && worst <= 2, `all ${n} rows within 2/255 of the source (worst ${worst})`);
}
if (problems.length) { console.error('blackbody FAILED:\n  - ' + problems.join('\n  - ')); process.exit(1); }
console.log('blackbody ok: star colours interpolate the colorimetric table, ends held, white near 6 500 K');
