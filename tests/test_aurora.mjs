// tests/test_aurora.mjs -- the northern and southern lights from NOAA's OVATION forecast (spec 0053 task 3).
//
// No network. What is checked is every rule that decides what the night side shows:
//   1. the grid decode, on the answer NOAA really gave at 19:38 UTC on 2026-09-30 (saved, brotli):
//      65 160 cells, rows south first, bytes = percent * 255 / 100, the times, the summary;
//   2. the half-degree texture keeps the forecast (no cell's light moved or invented) and is smooth;
//   3. probability to emission: nothing under 3 %, monotonic, a quiet oval faint, never above 1;
//   4. the night mask, the JS twin of the shader's: full in the dark, none in daylight, monotonic;
//   5. the colour ramp by height: green rules at 120 km, red above 200 km, violet only at the bottom
//      of BRIGHT aurora, and a vertical column of full emission sums to about the green line's colour;
//   6. the early discard's arc maths (maxDotOnArc) against a brute-force walk along the arc;
//   7. the refresh schedule: a quarter hour, 3/6/12-minute retries, never on saveData or hidden;
//   8. when the band is drawn (the clock within 3 h of the forecast) and the card's words for each case,
//      including "not a photograph";
//   9. the Kp line: nothing below Kp 5, the reach when the oval comes far south;
//  10. the shader carries the JS twins' numbers, and nothing is fetched from the boot path.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const O = await import(join(JS, 'data/ovation.js'));
const A = await import(join(JS, 'scene/aurora.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---- 1. the grid decode --------------------------------------------------------------------------
const body = brotliDecompressSync(readFileSync(join(ROOT, 'tests/fixtures/ovation/quiet-2026-09-30T1938Z.json.br'))).toString('utf8');
const raw = JSON.parse(body);
check(raw.coordinates.length === 65160 && raw['Data Format'] === '[Longitude, Latitude, Aurora]', 'the fixture is a whole OVATION answer');
const out = O.parseOvation(body);
check(out.cells === 65160, `every cell decoded (${out.cells})`);
check(out.grid.length === O.GRID_W * O.GRID_H && O.GRID_W === 360 && O.GRID_H === 181, 'a 360 x 181 grid');
check(out.observationMs === Date.parse('2026-09-30T19:38:00Z') && out.forecastMs === Date.parse('2026-09-30T21:08:00Z'), 'observation and forecast times read');
let mismatched = 0;
for (const [lon, lat, p] of raw.coordinates) {
  const b = out.grid[(lat + 90) * 360 + lon];
  if (b !== Math.round((p * 255) / 100)) mismatched++;
}
check(mismatched === 0, `every cell lands at row lat+90, column lon, as percent*255/100 (${mismatched} wrong)`);
check(O.cellPercent(out.grid, -90, 0) === (out.grid[0] * 100) / 255, 'row 0 is the south pole');
check(O.percentToByte(100) === 255 && O.percentToByte(0) === 0 && O.percentToByte(-5) === 0 && O.percentToByte(140) === 255, 'bytes clamp');
// NOAA's answer that evening: a quiet oval, 12 % at most in the north and 14 % in the south.
check(out.summary.north.peak === 12 && out.summary.south.peak === 14 && out.summary.peak === 14, `peaks ${out.summary.north.peak}/${out.summary.south.peak}`);
check(out.summary.north.edgeLat === 67 && out.summary.south.edgeLat === -54, `equatorward edges at 10 %: ${out.summary.north.edgeLat}, ${out.summary.south.edgeLat}`);
check(O.parseOvation({ coordinates: [[10, 65, 50], [400, 65, 20], ['x', 1, 2], [0, 95, 9]] }).cells === 2, 'a malformed or out-of-grid cell is skipped, a lon past 360 wraps');
let threw = false;
try { O.parseOvation({ nope: 1 }); } catch { threw = true; }
check(threw, 'a body with no coordinates is refused');

// ---- 2. the half-degree texture ---------------------------------------------------------------------
const tex = O.upsampleGrid(out.grid);
check(tex.length === O.TEX_W * O.TEX_H && O.TEX_W === 720 && O.TEX_H === 361, 'a 720 x 361 texture');
const sum = (a) => a.reduce((s, v) => s + v, 0);
const meanGrid = sum(out.grid) / out.grid.length;
const meanTex = sum(tex) / tex.length;
check(near(meanTex, meanGrid, 0.15), `the texture keeps the forecast's mean (${meanTex.toFixed(3)} vs ${meanGrid.toFixed(3)})`);
check(tex.reduce((m, v) => Math.max(m, v), 0) <= out.grid.reduce((m, v) => Math.max(m, v), 0), 'the smoothing invents no brighter cell');
// Smooth: no step between neighbouring texels bigger than the grid's own step between whole degrees.
let gridStep = 0; let texStep = 0;
for (let r = 0; r < O.GRID_H; r++) for (let c = 0; c < 359; c++) gridStep = Math.max(gridStep, Math.abs(out.grid[r * 360 + c + 1] - out.grid[r * 360 + c]));
for (let r = 0; r < O.TEX_H; r++) for (let c = 0; c < 719; c++) texStep = Math.max(texStep, Math.abs(tex[r * 720 + c + 1] - tex[r * 720 + c]));
check(texStep < gridStep, `the texture is smoother than the grid (largest step ${texStep} vs ${gridStep})`);
const uv = A.gridUv(0, 0);
check(near(uv.u * 720 - 0.5, 0, 1e-9) && near(uv.v * 361 - 0.5, 180, 1e-9), 'gridUv puts lat 0 lon 0 on texel (0, 180)');
const uvN = A.gridUv(90, 359.5);
check(near(uvN.u * 720 - 0.5, 719, 1e-9) && near(uvN.v * 361 - 0.5, 360, 1e-9), 'gridUv puts the north pole on the last row');
check(A.reachLatDeg(out.grid) === 48, `the early discard reaches 48 degrees on the quiet day (got ${A.reachLatDeg(out.grid)}), not 0 for the equator's 1-3 % band`);
check(A.reachLatDeg(new Uint8Array(65160)) === 88, 'an empty grid reaches nowhere');

// ---- 3. probability to emission -----------------------------------------------------------------------
const e = A.probabilityToEmission;
check(e(0) === 0 && e(0.03) === 0, 'nothing at or below 3 %');
let mono = true;
for (let p = 0; p < 1; p += 0.01) if (e(p + 0.01) < e(p) - 1e-12) mono = false;
check(mono, 'emission never falls as the probability rises');
check(e(0.1) > 0.05 && e(0.1) < 0.2, `a 10 % oval is faint (${e(0.1).toFixed(3)})`);
check(e(0.6) > 0.7 && e(1) <= 1, `a 60 % storm is bright and nothing exceeds 1 (${e(0.6).toFixed(3)})`);

// ---- 4. the night mask --------------------------------------------------------------------------------
const nm = A.nightMask;
check(nm(-1) === 1 && nm(-0.1) === 1, 'full in the dark');
check(nm(0.02) === 0 && nm(0.5) === 0, 'none in daylight');
check(nm(-0.04) > 0 && nm(-0.04) < 1, 'a fade across the terminator, not an edge');
let monoN = true;
for (let d = -1; d < 1; d += 0.01) if (nm(d + 0.01) > nm(d) + 1e-12) monoN = false;
check(monoN, 'the mask never rises towards the Sun');
check(A.NIGHT.lit < 0.12, 'the aurora is gone before the Earth\'s own twilight band (earth.js TERMINATOR.end 0.12) lights the ground');

// ---- 5. the colour ramp by height ----------------------------------------------------------------------
const col = (h, k) => A.auroraColour(h, k);
const g120 = col(120, 1);
check(g120[1] > g120[0] * 4 && g120[1] > g120[2] * 2.5, `green rules at 120 km (${g120.map((x) => x.toFixed(4))})`);
const r260 = col(260, 1);
check(r260[0] > r260[1], `red rules above 200 km (${r260.map((x) => x.toFixed(4))})`);
const v98faint = col(98, 0.3);
const v98bright = col(98, 1);
check(v98faint[2] < v98bright[2] && v98bright[2] > v98bright[0], 'violet appears at the bottom only when the aurora is bright');
check(col(98, 0.3)[2] <= col(98, 0.3)[1] * 0.6, 'no violet in a faint curtain');
// A vertical column, summed at 1 km, of full emission: about the green line's colour, a little warm.
const column = [0, 0, 0];
for (let h = A.AURORA_BASE_KM; h <= A.AURORA_TOP_KM; h += 1) { const c = col(h, 1); for (let i = 0; i < 3; i++) column[i] += c[i]; }
check(near(column[1], A.GREEN_557[1], 0.08), `a vertical column's green is the green line's (${column[1].toFixed(3)})`);
check(column[0] < column[1] * 0.45, `seen from above it is green (#7DFF9A core and a red fringe), not yellow (${column.map((x) => x.toFixed(3))})`);
// The profile and its integral agree (the shader uses the integral along each step).
for (const em of Object.values(A.EMISSIONS)) {
  let s = 0;
  for (let h = em.peakKm - 6 * em.belowKm; h < em.peakKm + 6 * em.aboveKm; h += 0.05) s += A.profile(em, h) * 0.05;
  check(near(s, A.columnKm(em), 0.02 * A.columnKm(em)), `profile integrates to its column (${s.toFixed(2)} vs ${A.columnKm(em)})`);
  const lo = em.peakKm - 30; const hi = em.peakKm + 50;
  let s2 = 0;
  for (let h = lo; h < hi; h += 0.01) s2 += A.profile(em, h) * 0.01;
  check(near(A.profileIntegral(em, hi) - A.profileIntegral(em, lo), s2, 0.01 * s2 + 0.01), 'the integral is the profile\'s');
}

// ---- 6. the early discard's arc --------------------------------------------------------------------------
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const slerpMax = (a, b, z) => {
  let m = -Infinity;
  for (let i = 0; i <= 2000; i++) { const t = i / 2000; const p = norm(a.map((x, k) => x * (1 - t) + b[k] * t)); m = Math.max(m, p[0] * z[0] + p[1] * z[1] + p[2] * z[2]); }
  return m;
};
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 * 2 - 1; };
let arcBad = 0;
for (let i = 0; i < 300; i++) {
  const a = norm([rnd(), rnd(), rnd()]);
  const b = norm([rnd(), rnd(), rnd()]);
  if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < -0.95) continue;
  const z = norm([rnd(), rnd(), rnd()]);
  if (Math.abs(A.maxDotOnArc(a, b, z) - slerpMax(a, b, z)) > 1e-3) arcBad++;
}
check(arcBad === 0, `maxDotOnArc agrees with a walk along the arc (${arcBad} of 300 disagree)`);
const ax = A.dipoleAxisLocal();
check(near(Math.hypot(...ax), 1, 1e-9) && ax[1] > 0.98, 'the dipole axis is a unit vector near the north pole');

// ---- 7. the refresh schedule --------------------------------------------------------------------------
check(O.REFRESH_MS === 15 * 60000, 'a quarter hour, the registry row\'s cadence');
check(O.nextLookMs({ ok: true }) === O.REFRESH_MS, 'after a good look: a quarter hour');
check(O.nextLookMs({ ok: false, failures: 1 }) === 3 * 60000 && O.nextLookMs({ ok: false, failures: 2 }) === 6 * 60000
  && O.nextLookMs({ ok: false, failures: 3 }) === 12 * 60000 && O.nextLookMs({ ok: false, failures: 9 }) === O.REFRESH_MS, 'retries at 3, 6, 12 minutes, then a quarter hour');
check(!O.mayLook({ saveData: true }) && !O.mayLook({ hidden: true }) && !O.mayLook({ busy: true }) && O.mayLook({}), 'never on saveData, never hidden, one at a time');
check(O.START_DELAY_MS >= 5000, 'the first look waits after the layers have landed');
check(O.OVATION_URL === 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json', 'NOAA\'s own URL');
const sourcesYaml = readFileSync(join(ROOT, 'registry/sources.yaml'), 'utf8');
check(/id: swpc-ovation\n\s+url: https:\/\/services\.swpc\.noaa\.gov\/json\/ovation_aurora_latest\.json\n\s+auth: none\n\s+browser: true/.test(sourcesYaml), 'the registry row says the browser may ask NOAA');

// ---- 8. when it is drawn, and the card's words --------------------------------------------------------
const f = out.forecastMs;
check(O.auroraMode({ forecastMs: null, clockMs: f }) === 'none', 'nothing held: none');
check(O.auroraMode({ forecastMs: f, clockMs: f + 2 * 3600e3 }) === 'live', 'two hours from the forecast: live');
check(O.auroraMode({ forecastMs: f, clockMs: f - 4 * 3600e3 }) === 'far', 'four hours away: far');
const live = { phase: 'live', on: true, folds: true, forecastMs: f, observationMs: out.observationMs };
const L = A.auroraLine(live, f, out.observationMs + 13 * 60000);
check(L.includes('not a photograph') && L.includes('21:08 UTC') && L.includes('13 minutes ago') && L.includes('NOAA') && L.includes('drawn'), `the live line: ${L}`);
const L0 = A.auroraLine({ ...live, folds: false }, f, out.observationMs + 13 * 60000);
check(L0.includes('not a photograph') && !L0.includes('folds'), 'without folds, no word about them');
check(A.auroraLine({ ...live }, f + 5 * 3600e3, f) === COPY.aurora.far, 'far from the forecast: says so');
check(A.auroraLine({ phase: 'off' }, f, f) === COPY.aurora.saveData, 'saving data: says so');
check(A.auroraLine({ phase: 'failed', on: true, forecastMs: null }, f, f) === COPY.aurora.failed, 'NOAA unreachable: says so');
check(A.auroraLine({ phase: 'waiting', on: true, forecastMs: null }, f, f) === COPY.aurora.waiting, 'not yet: says so');
check(A.auroraLine({ ...live, on: false }, f, f) === COPY.aurora.switchedOff, 'box off: says so');
for (const [k, v] of Object.entries(COPY.aurora)) {
  check(!v.includes(' -- ') && !/TODO|TBD|\{\w+\}\s*$/.test(v.replace(/\{(time|ago|kp|lat)\}/g, 'x')), `copy ${k} has no dash pair or placeholder`);
}
check(/public domain/.test(COPY.aurora.credit) && /NOAA/.test(COPY.aurora.credit), 'the credit names NOAA SWPC and the licence');

// ---- 9. the Kp line ------------------------------------------------------------------------------------
check(A.auroraRightNow(4.67, out.summary) === null && A.auroraRightNow(NaN) === null, 'nothing below Kp 5');
check(A.auroraRightNow(5.33, { north: { edgeLat: 64 }, south: { edgeLat: -62 } }) === 'Aurora likely at high latitudes tonight (Kp 5.3).', 'a G1 storm, the oval where it usually is');
check(A.auroraRightNow(7, { north: { edgeLat: 50 }, south: { edgeLat: -54 } }).includes('as far from the poles as 50°'), 'a big storm says how far south');
check(A.auroraRightNow(6, null) === 'Aurora likely at high latitudes tonight (Kp 6).', 'no forecast held: the plain line');

// ---- 10. the shader and the boot path --------------------------------------------------------------------
const F = A.AURORA_FRAG;
check(F.includes(`const vec2 NIGHT = vec2( ${A.NIGHT.dark.toFixed(4)}, ${A.NIGHT.lit.toFixed(4)} );`), 'the shader\'s night mask is the JS twin\'s');
check(F.includes(`vec3( ${A.EMISSIONS.green.peakKm.toFixed(1)}, ${A.EMISSIONS.green.belowKm.toFixed(1)}, ${A.EMISSIONS.green.aboveKm.toFixed(1)} )`), 'the shader\'s green profile is the JS twin\'s');
check(F.includes('AdditiveBlending') === false && /logdepthbuf_fragment/.test(F) && /tonemapping_fragment/.test(F), 'the shader includes log depth and tone mapping');
check(A.FOLDS.diffuse >= 0.7 && A.FOLDS.levels.length === 2 && A.FOLDS.levels[0] !== A.FOLDS.levels[1], 'mostly diffuse light, and at most two arcs, at different contour levels (never parallel copies)');
check(/float arcs\( vec3 dir, float p, float pPole, float peak \)/.test(F) && /equatorward/.test(F), 'the arcs are contours of the forecast on the band\'s equatorward side');
check(/vnoise\( u \* CELLS\.x/.test(F) && /beads/.test(F), 'the arcs kink and break up along the oval');
// The faint edge is paler than the core: less chroma at low emission.
const chroma = (c) => Math.max(...c) - Math.min(...c);
check(chroma(A.auroraColour(118, 0.08).map((x) => x / 0.08)) < chroma(A.auroraColour(118, 0.8).map((x) => x / 0.8)), 'the faint edge is desaturated, the bright core is the green of the line');
check(!/\bpatch\b/.test(F.replace(/\/\/.*$/gm, '')), 'no GLSL ES reserved word `patch` (2026-10-01: it failed to compile silently)');
const auroraSrc = readFileSync(join(JS, 'scene/aurora.js'), 'utf8');
check(/AdditiveBlending/.test(auroraSrc) && /depthWrite: false/.test(auroraSrc), 'additive, no depth write');
check(!/EffectComposer|UnrealBloomPass|RenderPass/.test(auroraSrc), 'no bloom, no post pass');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/addEventListener\('sr:layers-ready', \(\) => ctx\.aurora\.start\(\)/.test(main), 'main.js starts the aurora once the layers have landed, never from boot');
check(/ctx\.aurora\.tick\(t, \{[\s\S]{0,200}latched: latch\.latched[\s\S]{0,120}reducedMotion/.test(main), 'the frame passes the latch and reduced motion to the aurora');
const T0 = A.TIER_STEPS[0];
check(T0.maxSteps <= 8 && A.TIER_STEPS[2].maxSteps >= A.TIER_STEPS[1].maxSteps && A.TIER_STEPS.every((c) => c.folds), 'T0 and the latch: fewer steps; the folds on every tier (without them the oval is a flat plate)');
check(/!reducedMotion && !cheapLatch && cfg\.folds\) u\.uTime\.value/.test(auroraSrc), 'the folds hold still under reduced motion and the latch');
const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
check(/sr-card__aurora[\s\S]{0,80}ctx\.aurora\.line\(/.test(cards), 'the Earth card prints the aurora line');

if (problems.length) {
  console.error('aurora FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`aurora ok: OVATION 2026-09-30 decoded (${out.cells} cells, peaks ${out.summary.north.peak}/${out.summary.south.peak} %), texture, emission, night mask, colour ramp, arc discard, schedule, card words, Kp line`);
