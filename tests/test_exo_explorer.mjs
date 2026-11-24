// tests/test_exo_explorer.mjs -- the exoplanet explorer (forge #564; research train "catalogues").
//
//   node tests/test_exo_explorer.mjs
//
// What it holds: a log scale places only positive values and every planet is counted (drawn, no value, zero or less, hidden),
// the habitable zone is Kopparapu et al. (2014) at the Sun's temperature (their published limits), the "Found by" colours are
// five distinct class colours of the palette, the link round-trips, the side file joins the layer's planets by name, has the
// columns it says and stays inside its budget row, and the module is fetched only when the explorer opens.
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const X = await import(join(JS, 'ui/exoexplorer.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { parseExoplanets } = await import(join(JS, 'data/parsers.js'));

// --- scales -----------------------------------------------------------------------------------------------------------
const lg = X.makeScale(1, 1000, true, 0, 300);
check(near(lg.map(1), 0, 1e-9) && near(lg.map(10), 100, 1e-9) && near(lg.map(1000), 300, 1e-9), 'a log scale spaces decades evenly');
check(Number.isNaN(lg.map(0)) && Number.isNaN(lg.map(-5)), 'a log scale places no value of zero or less (NaN, counted by the caller)');
check(JSON.stringify(lg.ticks()) === '[1,10,100,1000]', `log ticks are the decades: ${JSON.stringify(lg.ticks())}`);
const ln = X.makeScale(1990, 2026, false, 0, 360);
check(near(ln.map(2008), 180, 1e-9) && ln.ticks().every((v) => v >= 1990 && v <= 2026) && ln.ticks().length >= 3, 'a linear scale and its round ticks');
const flat = X.makeScale(5, 5, true, 0, 100);
check(Number.isFinite(flat.map(5)), 'one value alone still gets a scale');

// --- every planet counted ---------------------------------------------------------------------------------------------
const rows = [
  { name: 'a', method: 'Transit', periodDays: 3, radiusEarths: 1 },
  { name: 'b', method: 'Radial Velocity', periodDays: 300, radiusEarths: null },
  { name: 'c', method: 'Imaging', periodDays: 0, radiusEarths: 10 },
  { name: 'd', method: 'Microlensing', periodDays: 1000, radiusEarths: 5 },
  { name: 'e', method: 'Pulsar Timing', periodDays: 20, radiusEarths: 2 },
  { name: 'f', method: 'Transit', periodDays: 10, radiusEarths: 3, radiusLimit: 'upper' },
];
const res = X.plotRows(rows, 'period', 'radius', { xLog: true, yLog: true, hidden: new Set(['microlensing']) });
check(res.points.length === 2 && res.missing === 2 && res.nonPositive === 1 && res.hidden === 1, `drawn 2, no value 2 (one a limit), zero or less 1, hidden 1: ${JSON.stringify({ n: res.points.length, m: res.missing, z: res.nonPositive, h: res.hidden })}`);
check(res.points.length + res.missing + res.nonPositive + res.hidden === rows.length, 'every planet is in exactly one count');
const lin = X.plotRows(rows, 'period', 'radius', { xLog: false, yLog: false });
check(lin.nonPositive === 0 && lin.points.some((p) => p.r.name === 'c'), 'on a linear scale a period of 0 is drawn, not counted out');
check(X.methodGroup('Transit') === 'transit' && X.methodGroup('Radial Velocity') === 'rv' && X.methodGroup('Pulsar Timing') === 'other' && X.methodGroup(null) === 'other', 'the Archive\'s methods fall into five groups');

// --- the habitable zone: Kopparapu et al. (2014), ApJ Letters 787, L29 -----------------------------------------------
// Their Table 1, a planet of one Earth mass round a 5 780 K star: S_eff = 1.776 (recent Venus), 1.107 (runaway greenhouse),
// 0.356 (maximum greenhouse), 0.320 (early Mars); the Solar System's HZ is 0.95 to 1.67 au (their abstract).
const sun = X.hzInsolation(5780);
check(near(sun.wideInner, 1.776, 1e-3) && near(sun.inner, 1.107, 1e-3) && near(sun.outer, 0.356, 1e-3) && near(sun.wideOuter, 0.320, 1e-3), `the Sun's four limits: ${JSON.stringify(sun)}`);
check(near(1 / Math.sqrt(sun.inner), 0.95, 0.005) && near(1 / Math.sqrt(sun.outer), 1.67, 0.01), 'which is 0.95 to 1.67 au for the Sun\'s light');
const cool = X.hzInsolation(3000);
check(cool.inner < sun.inner && cool.outer < sun.outer && cool.inner > cool.outer, 'a cool star\'s zone sits at less starlight (more of its light is infrared)');
check(X.hzInsolation(2000) === null && X.hzInsolation(8000) === null, 'outside the fit\'s 2 600-7 200 K there is no band drawn');

// --- colours ----------------------------------------------------------------------------------------------------------
const ui = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
const css = readFileSync(join(ROOT, 'site/css/catalogue.css'), 'utf8');
const hexes = X.METHOD_GROUPS.map((g) => {
  const tok = X.METHOD_TOKENS[g];
  const m = new RegExp(`${tok}:\\s*(#[0-9a-f]{6})`, 'i').exec(ui);
  check(!!m, `${g} is drawn in ${tok}, a token of css/ui.css`);
  check(new RegExp(`\\.sr-exo__sw--${g}\\s*\\{\\s*background:\\s*var\\(${tok}\\)`).test(css), `its swatch in the "Found by" chip is the same token`);
  return m ? m[1].toLowerCase() : g;
});
check(new Set(hexes).size === hexes.length, `the five groups have five different colours: ${hexes.join(' ')}`);
const src = readFileSync(join(JS, 'ui/exoexplorer.js'), 'utf8');
check(!/#[0-9a-f]{6}\b|rgba?\(/i.test(src.replace(/^\s*\/\/.*$/gm, '')), 'the canvas reads its colours from the tokens, never a literal');

// --- the link ---------------------------------------------------------------------------------------------------------
for (const st of [X.parseArg(''), X.parseArg('insol,starTeff'), X.parseArg('mass,radius,nl'), X.parseArg('year,period,ll')]) {
  const again = X.parseArg(X.argOf(st));
  check(JSON.stringify(again) === JSON.stringify(st), `the link round-trips: ${X.argOf(st)}`);
}
check(X.parseArg('').x === 'period' && X.parseArg('').y === 'radius', 'with no value it opens on year length against size');
check(X.parseArg('year,distance,ll').xLog === false, 'the discovery year is never a log axis');
check(X.parseArg('radius,radius').y !== 'radius', 'never one column on both axes');
check(X.parseArg('nonsense,insol').x === 'period' && X.parseArg('nonsense,insol').y === 'insol', 'an unknown column falls back, the known one is kept');

// --- the words --------------------------------------------------------------------------------------------------------
await import(join(JS, 'copy/en.exoexplorer.js'));
for (const a of X.AXIS_IDS) check(COPY.exoExplorer.axes[a] && a in COPY.exoExplorer.units, `the column ${a} has a name and a unit`);
for (const g of X.METHOD_GROUPS) check(COPY.exoExplorer.method[g], `the group ${g} has a name`);
for (const p of X.PRESETS) check(COPY.exoExplorer.presets[p.id], `the view ${p.id} has a name`);

// --- the side file, joined to the layer -------------------------------------------------------------------------------
const sidePath = join(ROOT, 'site/data/exoplanets-explorer.json');
const side = JSON.parse(readFileSync(sidePath, 'utf8'));
check(JSON.stringify(side.cols) === '["name","aAu","insol","teqK","starMassSuns"]' && side.count === side.rows.length && side.doi === '10.26133/NEA13' && /^\d{4}-\d{2}-\d{2}$/.test(side.read), 'the side file says its columns, its count, its DOI and the day it was read');
const budgets = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');
const cap = Number((/id: exo_explorer_bytes, value: (\d+)/.exec(budgets) || [])[1]);
const size = statSync(sidePath).size;
check(cap > 0 && size <= cap, `site/data/exoplanets-explorer.json is ${size} B, inside registry/budgets.yaml exo_explorer_bytes (${cap})`);
const records = parseExoplanets(readFileSync(join(ROOT, 'site/data/exoplanets.csv'), 'utf8'));
const joined = X.joinExtra(records, side);
const withInsol = joined.filter((r) => Number.isFinite(r.insol)).length;
check(joined.length === records.length && withInsol / joined.length > 0.85, `the side file joins the bundled planets by name: ${withInsol} of ${joined.length} have the starlight`);
const earthLike = joined.find((r) => r.name === 'Kepler-452 b');
check(earthLike && near(earthLike.insol, 1.1, 0.2) && near(earthLike.periodDays, 384.8, 1), 'Kepler-452 b, about the Earth\'s year and the Earth\'s light, has both');
check(X.joinExtra(records.slice(0, 3), null).every((r) => r.insol === null), 'without the side file the four columns are blank, never guessed');

// --- fetched on first use ---------------------------------------------------------------------------------------------
const diet = readFileSync(join(ROOT, 'tests/test_boot_diet.mjs'), 'utf8');
check(/'js\/ui\/exoexplorer\.js'/.test(diet) && /'js\/copy\/en\.exoexplorer\.js'/.test(diet), 'the boot diet holds the module and its words out of the first visit');
check(/fetched when the explorer opens|readJsonCopy\(\[\{ url: new URL\('\.\.\/\.\.\/data\/exoplanets-explorer\.json'/.test(src), 'the side file is read by the explorer, not at boot');

if (problems.length) { console.error(`exo explorer FAILED (${problems.length}):\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`exo explorer ok: log scales place only positive values and every planet is counted, Kopparapu's limits for the Sun (1.776, 1.107, 0.356, 0.320), five distinct class colours, the link round-trips, ${withInsol} of ${joined.length} planets joined to the side file's starlight (${size} B of ${cap})`);
