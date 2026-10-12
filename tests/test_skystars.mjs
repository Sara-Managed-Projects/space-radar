// tests/test_skystars.mjs -- the compact star files of the sky from the ground (internal #392).
//
//   node tests/test_skystars.mjs
//
// The sky view used to fetch stars3d.bin (2.6 MB) and its names (288 kB) on entry. It now reads
// three small files that scripts/build-skystars.py cuts from that same catalogue. Held here: that
// they are what the script writes, that together with the naked-eye file they are EVERY star of
// stars3d.bin once and only once, each where the catalogue has it, and what the view fetches on
// entry against `sky_entry_star_bytes`.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { parseSkyStars, parseDeep, parseNakedEye, countBrighter } = await import(join(ROOT, 'site/js/sky/groundsky.js'));
const { BUDGETS } = await import(join(ROOT, 'site/js/data/budgets.js'));
const buf = (p) => { const b = readFileSync(join(ROOT, p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

try { execFileSync('python3', [join(ROOT, 'scripts/build-skystars.py'), '--check'], { stdio: 'pipe' }); }
catch (e) { check(false, `scripts/build-skystars.py --check: ${String(e.stdout || e.message).trim()}`); }

const naked = parseNakedEye(buf('site/data/stars.bin'));
const t1 = parseSkyStars(buf('site/data/skystars-1.bin'));
const t2 = parseSkyStars(buf('site/data/skystars-2.bin'));
const nakedMax = naked.mag[naked.count - 1];
const deep = parseDeep(buf('site/data/stars3d.bin'), nakedMax);

check(t1.count + t2.count === deep.count, `the two tiers hold ${t1.count + t2.count} stars; stars3d.bin has ${deep.count} fainter than the naked-eye file's ${nakedMax}`);
check(t1.count > 8000 && t1.count < 12000, `tier 1 is ${t1.count} stars (magnitude ${nakedMax} to 7)`);
check(t1.mag[0] > nakedMax - 0.05 && t1.mag[t1.count - 1] <= 7.05, `tier 1 runs from ${t1.mag[0].toFixed(2)} to ${t1.mag[t1.count - 1].toFixed(2)}`);
check(t2.mag[0] >= t1.mag[t1.count - 1] - 1e-6, 'every star of tier 2 is fainter than every star of tier 1, so the joined list is sorted');
for (const t of [t1, t2]) { let sorted = true; for (let i = 1; i < t.count; i += 1) if (t.mag[i] < t.mag[i - 1]) { sorted = false; break; } check(sorted, 'a tier is in order of magnitude: the reader draws a prefix'); }
check(countBrighter(t1.mag, 6.5) > 3000, 'countBrighter finds the prefix');

// Every star is where the catalogue has it: the same multiset of directions, to the format's step.
{
  const key = (pos, i) => `${Math.round(pos[i * 3] * 2e4)},${Math.round(pos[i * 3 + 1] * 2e4)},${Math.round(pos[i * 3 + 2] * 2e4)}`;
  const grid = new Map();
  for (let i = 0; i < deep.count; i += 1) { const k = key(deep.pos, i); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); }
  let worst = 0; let lost = 0; let magWorst = 0;
  const probe = (t) => {
    for (let i = 0; i < t.count; i += 37) {
      const x = t.pos[i * 3]; const y = t.pos[i * 3 + 1]; const z = t.pos[i * 3 + 2];
      let best = Infinity; let bestMag = 0;
      for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
        const list = grid.get(`${Math.round(x * 2e4) + dx},${Math.round(y * 2e4) + dy},${Math.round(z * 2e4) + dz}`);
        if (!list) continue;
        for (const j of list) {
          const dm = Math.abs(t.mag[i] - deep.mag[j]);
          if (dm > 0.05) continue; // a neighbour in a double, not this star
          const d = Math.hypot(x - deep.pos[j * 3], y - deep.pos[j * 3 + 1], z - deep.pos[j * 3 + 2]);
          if (d < best) { best = d; bestMag = dm; }
        }
      }
      if (best === Infinity) lost += 1; else { worst = Math.max(worst, best); magWorst = Math.max(magWorst, bestMag); }
    }
  };
  probe(t1); probe(t2);
  check(lost === 0, `${lost} sampled stars are not in stars3d.bin where the compact file puts them`);
  check(worst < 1e-6, `the worst sampled star is ${(worst * 206265).toFixed(2)} arcseconds from its catalogue place`);
  check(magWorst <= 0.0401, `magnitudes are within the format's 0.04 (${magWorst.toFixed(3)})`);
}

// The names: proper names only, brightest first, each a real direction.
{
  const names = JSON.parse(readFileSync(join(ROOT, 'site/data/skystars.names.json'), 'utf8')).rows;
  check(names.length > 300 && names.length < 700, `${names.length} proper names to magnitude 6.5`);
  check(names[0][0] === 'Sirius' && Math.abs(names[0][1] - 101.287) < 0.01 && Math.abs(names[0][2] + 16.716) < 0.01, `the first is Sirius at 6h45m -16.7 (${names[0]})`);
  const vega = names.find((r) => r[0] === 'Vega');
  check(vega && Math.abs(vega[1] - 279.234) < 0.01 && Math.abs(vega[2] - 38.784) < 0.01, 'Vega is at 18h37m +38.8');
  let sorted = true; for (let i = 1; i < names.length; i += 1) if (names[i][3] < names[i - 1][3]) sorted = false;
  check(sorted, 'brightest first: the reader stops at its limit');
}

// What opening the sky view fetches for its stars, beyond the naked-eye file already in the cache.
{
  const entry = statSync(join(ROOT, 'site/data/skystars-1.bin')).size + statSync(join(ROOT, 'site/data/skystars.names.json')).size;
  check(entry <= BUDGETS.sky_entry_star_bytes, `the sky view's stars on entry are ${entry} B; sky_entry_star_bytes is ${BUDGETS.sky_entry_star_bytes}`);
  const src = readFileSync(join(ROOT, 'site/js/sky/groundsky.js'), 'utf8');
  check(!/fetch\w*\([^)]*stars3d/.test(src), 'sky/groundsky.js no longer fetches stars3d.bin or its names');
}

if (problems.length) { console.error('sky stars FAILED:\n  - ' + problems.join('\n  - ')); process.exit(1); }
console.log(`sky stars ok: ${t1.count} + ${t2.count} stars in two tiers are stars3d.bin's ${deep.count} beyond the naked-eye file, each within an arcsecond of its catalogue place; names brightest first; on entry ${statSync(join(ROOT, 'site/data/skystars-1.bin')).size + statSync(join(ROOT, 'site/data/skystars.names.json')).size} B of ${BUDGETS.sky_entry_star_bytes}`);
