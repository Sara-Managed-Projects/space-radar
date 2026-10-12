#!/usr/bin/env node
// Is the tree a deploy is about to upload still the app? For the minifier's second pass (internal #515).
//
//   node scripts/check_built_tree.mjs --built "$BUILT/min"            # graph, exports, budget (seconds)
//   node scripts/check_built_tree.mjs --built "$BUILT/min" --tests    # ...and the node tests below, against it
//   node scripts/check_built_tree.mjs --built DIR --discover          # run EVERY node test against it and say
//                                                                     # which pass (to maintain TESTS)
//
// `--built` is what scripts/minify_site.py wrote (js/, css/, vendor/; with or without --tree).
//
// WHAT A MINIFIER COULD BREAK, AND WHAT CATCHES EACH
//   1. An import that no longer names its file, or a lazy `import()` that was dropped. For every
//      module, the addresses it imports (static, dynamic, and `new URL(..., import.meta.url)` for a
//      worker) are the same set as in the stripped-only tree, and each one is a file of the built tree.
//   2. An export renamed, or a module that no longer evaluates. Every module node can load from
//      site/ as written is loaded from the built tree too, and must export the same names with the
//      same kinds (function, object, number...). Modules that need a document fail in both and are
//      counted, not hidden.
//   3. Behaviour. The node tests in TESTS run in a copy of the repository whose site/ IS the built
//      tree: ephemerides, SGP4, the sky's mathematics, the parsers, the trips' route builders, the
//      service worker's routes. They are the tests that import modules and compute; a test that
//      reads a source file as text is not in the list, because the built tree has other text.
//   4. Size. The static graph from js/main.js (what a first visit parses before the first frame)
//      is inside `deployed_boot_js_bytes` of registry/budgets.yaml.
// The browser half is CI's: screens.yml builds its served tree with the same flag, so the boot,
// the drawn checks, the walks and the first-visit budget all run on the minified modules.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// The node tests that import the site's modules and compute, and so mean the same thing against
// the built tree. Found with --discover on 2026-10-09; add a new behavioural test here.
// NOT tests/test_trip_og.mjs, though it passes: it copies the tree and deletes a picture from its
// copy, and in the shadow below the copy's site/og is a LINK to the real one. It deleted
// site/og/people-in-space.png from the checkout on the day this was written; the guard after the
// run (`before`/`after`) is there so that the next such test fails this gate instead.
// Taken out on 2026-10-09: test_audio, test_cardlive, test_dso, test_station_shapes and test_systems
// gained checks that read a source file as text (the bulk close-out), so they no longer mean the
// same thing against built text. They still run against the source in ci.yml.
export const TESTS = [
  'test_air.mjs',
  'test_ascent_attitude.mjs',
  'test_atmo_lut.mjs',
  'test_autopilot_trip.mjs',
  'test_chrome_copy.mjs',
  'test_chromelock.mjs',
  'test_climb.mjs',
  'test_clusters.mjs',
  'test_colorkeys.mjs',
  'test_comets_rank.mjs',
  'test_deep_space.mjs',
  'test_eclipse.mjs',
  'test_eclipse_path.mjs',
  'test_ephemerides.mjs',
  'test_events.mjs',
  'test_exoplanets.mjs',
  'test_exotics.mjs',
  'test_far_bodies.mjs',
  'test_figures.mjs',
  'test_framing.mjs',
  'test_groundpictures.mjs',
  'test_groundsky_smoke.mjs',
  'test_guessplace.mjs',
  'test_guide_rails.mjs',
  'test_hips.mjs',
  'test_ics.mjs',
  'test_labels.mjs',
  'test_labels_rank.mjs',
  'test_ladder.mjs',
  'test_ladder_ui.mjs',
  'test_layers_registry.mjs',
  'test_moon_trip.mjs',
  'test_onemark.mjs',
  'test_orbitline.mjs',
  'test_outer_trip.mjs',
  'test_pickrank.mjs',
  'test_planetarium_trips.mjs',
  'test_postcard.mjs',
  'test_provisional.mjs',
  'test_quality.mjs',
  'test_quality_pool.mjs',
  'test_radiants.mjs',
  'test_real_models.mjs',
  'test_render_ready.mjs',
  'test_rings.mjs',
  'test_riseany.mjs',
  'test_riseset.mjs',
  'test_route_builders.mjs',
  'test_scenenote.mjs',
  'test_sgp4.mjs',
  'test_sky_trips.mjs',
  'test_skystars.mjs',
  'test_snapshot_parsers.mjs',
  'test_sources_cache.mjs',
  'test_spaceweather.mjs',
  'test_stardisc.mjs',
  'test_starsnotable.mjs',
  'test_station_trip.mjs',
  'test_status_kinds.mjs',
  'test_stop_time.mjs',
  'test_systems_binaries.mjs',
  'test_systems_table.mjs',
  'test_trains.mjs',
  'test_trajectory.mjs',
  'test_trip_scale.mjs',
  'test_trips_panel.mjs',
  'test_whattoshow.mjs',
  'test_world_light.mjs',
  'test_world_looks.mjs',
  'test_worlds_layer.mjs',
  'test_year_trip.mjs',
];

const opt = { tests: false, discover: false, site: join(ROOT, 'site') };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--built') opt.built = resolve(process.argv[++i]);
  else if (a === '--site') opt.site = resolve(process.argv[++i]);
  else if (a === '--tests') opt.tests = true;
  else if (a === '--discover') opt.discover = true;
  else if (a === '--quiet') opt.quiet = true;
  else { console.error(`check_built_tree: unknown option ${a}`); process.exit(2); }
}
if (!opt.built || !existsSync(join(opt.built, 'js/main.js'))) { console.error('check_built_tree: --built DIR must hold js/main.js (scripts/minify_site.py --out DIR)'); process.exit(2); }

const problems = [];
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const modules = (root) => ['js', 'vendor'].flatMap((d) => walk(join(root, d))).filter((p) => p.endsWith('.js')).map((p) => relative(root, p).split(sep).join('/')).sort();
const tmp = mkdtempSync(join(tmpdir(), 'sr-built-'));

// --- 1. the same imports, and each one a file -----------------------------------------------------
const stripped = join(tmp, 'stripped');
{
  const r = spawnSync('python3', [join(ROOT, 'scripts/minify_site.py'), '--site', opt.site, '--out', stripped, '--quiet'], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(`check_built_tree: could not build the stripped tree to compare with:\n${r.stderr}`); process.exit(2); }
}
const Q = '["\'`]';
const SPEC = [
  new RegExp(`(?:^|[;}\\s])(?:import|export)\\s*(?:[\\w$*{},\\s]+?\\s*from\\s*)?${Q}([^"'\`\\n]+)${Q}`, 'g'),
  new RegExp(`\\bimport\\s*\\(\\s*${Q}([^"'\`\\n$]+)${Q}\\s*\\)`, 'g'),
  new RegExp(`new\\s+URL\\s*\\(\\s*${Q}([^"'\`\\n$]+)${Q}\\s*,\\s*import\\.meta\\.url\\s*\\)`, 'g'),
];
const STATIC = SPEC[0];
function specifiers(text, only) {
  const out = new Set();
  for (const re of only ? [only] : SPEC) for (const m of text.matchAll(re)) if (/^\.{1,2}\//.test(m[1])) out.add(m[1]);
  return out;
}
const builtModules = modules(opt.built);
const sourceModules = modules(opt.site);
if (JSON.stringify(builtModules) !== JSON.stringify(sourceModules)) {
  const missing = sourceModules.filter((m) => !builtModules.includes(m));
  const extra = builtModules.filter((m) => !sourceModules.includes(m));
  problems.push(`the built tree does not hold the source's modules (missing ${missing.slice(0, 5)}, extra ${extra.slice(0, 5)})`);
}
let edges = 0;
for (const rel of builtModules) {
  if (!existsSync(join(stripped, rel))) continue;
  const want = specifiers(readFileSync(join(stripped, rel), 'utf8'));
  const got = specifiers(readFileSync(join(opt.built, rel), 'utf8'));
  const lost = [...want].filter((s) => !got.has(s));
  const gained = [...got].filter((s) => !want.has(s));
  if (lost.length || gained.length) problems.push(`${rel}: its imports changed (lost ${lost.slice(0, 4)}, gained ${gained.slice(0, 4)})`);
  for (const s of got) {
    edges++;
    const target = posix.normalize(posix.join(posix.dirname(rel), s.split(/[?#]/)[0]));
    // A data file beside the code (`new URL('../data/x.bin', import.meta.url)`) is not in a built
    // folder without --tree: look in the source for anything that is not code.
    if (!existsSync(join(opt.built, target)) && !existsSync(join(opt.site, target))) problems.push(`${rel} imports ${s}, which is no file`);
  }
}

// --- 4. the boot graph's bytes --------------------------------------------------------------------
function closure(root, entry) {
  const seen = new Set([entry]);
  const queue = [entry];
  while (queue.length) {
    const rel = queue.pop();
    for (const s of specifiers(readFileSync(join(root, rel), 'utf8'), STATIC)) {
      const target = posix.normalize(posix.join(posix.dirname(rel), s));
      if (target.endsWith('.js') && !seen.has(target) && existsSync(join(root, target))) { seen.add(target); queue.push(target); }
    }
  }
  return seen;
}
const sizeOf = (root, set) => [...set].reduce((n, rel) => n + statSync(join(root, rel)).size, 0);
const boot = closure(opt.built, 'js/main.js');
const bootBytes = sizeOf(opt.built, boot);
const bootStripped = sizeOf(stripped, closure(stripped, 'js/main.js'));
const row = /id: deployed_boot_js_bytes, value: (\d+)/.exec(readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8'));
if (!row) problems.push('registry/budgets.yaml has no deployed_boot_js_bytes row');
else if (bootBytes > Number(row[1])) problems.push(`the boot graph of the built tree is ${bootBytes} B in ${boot.size} modules, over deployed_boot_js_bytes ${row[1]}`);
if (boot.size < 100) problems.push(`the boot graph was not read (${boot.size} modules from js/main.js)`);

// --- 2. the same exports --------------------------------------------------------------------------
// In a child, so a module that starts a timer or touches a global does not live in this process.
const shadow = join(tmp, 'shadow');
mkdirSync(join(shadow, 'site'), { recursive: true });
for (const d of ['js', 'css', 'vendor']) cpSync(join(opt.built, d), join(shadow, 'site', d), { recursive: true });
for (const name of readdirSync(opt.site)) if (!existsSync(join(shadow, 'site', name))) symlinkSync(join(opt.site, name), join(shadow, 'site', name));
const probe = `
  const [a, b, list] = [process.argv[1], process.argv[2], JSON.parse(process.argv[3])];
  // A module that fails later, on its own (a fetch it starts at load), is not this comparison's business.
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', () => {});
  const shape = (ns) => Object.keys(ns).sort().map((k) => k + ':' + typeof ns[k]).join(',');
  const out = { same: 0, both_fail: 0, problems: [] };
  for (const rel of list) {
    let want, got, wantErr, gotErr;
    try { want = shape(await import(a + rel)); } catch (e) { wantErr = String(e && e.message).slice(0, 120); }
    try { got = shape(await import(b + rel)); } catch (e) { gotErr = String(e && e.message).slice(0, 120); }
    if (wantErr && gotErr) out.both_fail++;
    else if (wantErr) out.problems.push(rel + ': loads built and not as written (' + wantErr + ')');
    else if (gotErr) out.problems.push(rel + ': loads as written and not built (' + gotErr + ')');
    else if (want !== got) out.problems.push(rel + ': exports differ');
    else out.same++;
  }
  console.log('RESULT ' + JSON.stringify(out));
  process.exit(0);
`;
// Workers post a message when they load and the service-worker-shaped files want `self`: not modules to import here.
const loadable = builtModules.filter((m) => m.startsWith('js/') && !/worker\.js$/.test(m));
const exp = spawnSync(process.execPath, ['--input-type=module', '-e', probe, `${pathToFileURL(opt.site).href}/`, `${pathToFileURL(join(shadow, 'site')).href}/`, JSON.stringify(loadable)], { encoding: 'utf8', maxBuffer: 1 << 26, timeout: 300000 });
const line = (exp.stdout || '').split('\n').find((l) => l.startsWith('RESULT '));
let exportsSame = 0; let needDocument = 0;
if (!line) problems.push(`the export comparison did not finish (${(exp.stderr || '').slice(0, 600)})`);
else {
  const res = JSON.parse(line.slice(7));
  exportsSame = res.same; needDocument = res.both_fail;
  problems.push(...res.problems);
  if (res.same < 150) problems.push(`only ${res.same} modules could be loaded in node from both trees: the comparison is not looking at the app`);
}

// --- 3. the node tests, against the built tree ----------------------------------------------------
let ran = 0;
if (opt.tests || opt.discover) {
  for (const name of readdirSync(ROOT)) {
    if (name === 'site' || name === 'tests' || name.startsWith('.git') || name === 'node_modules') continue;
    symlinkSync(join(ROOT, name), join(shadow, name));
  }
  // The tests are COPIED: node follows a link to the real file, and a test run from the real
  // tests/ would import the real site/.
  mkdirSync(join(shadow, 'tests'));
  for (const name of readdirSync(join(ROOT, 'tests'))) {
    const from = join(ROOT, 'tests', name);
    if (name === 'fixtures' || name === 'vendor') symlinkSync(from, join(shadow, 'tests', name));
    else cpSync(from, join(shadow, 'tests', name), { recursive: true });
  }
  const list = opt.discover ? readdirSync(join(ROOT, 'tests')).filter((f) => /^test_.*\.mjs$/.test(f) && f !== 'test_trip_og.mjs').sort() : TESTS;
  // The shadow links to the real site/ for everything that is not code. A test must not write there.
  const listing = () => walk(opt.site).map((p) => { const st = statSync(p); return `${relative(opt.site, p)} ${st.size} ${st.mtimeMs}`; }).sort().join('\n');
  const before = listing();
  const passed = [];
  for (const t of list) {
    const r = spawnSync(process.execPath, [join(shadow, 'tests', t)], { cwd: shadow, encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 26 });
    ran++;
    if (r.status === 0) passed.push(t);
    else if (!opt.discover) problems.push(`tests/${t} fails against the built tree:\n      ${((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-4).join('\n      ')}`);
    if (opt.discover) console.log(`${r.status === 0 ? 'pass' : 'FAIL'} ${t}`);
  }
  if (listing() !== before) problems.push('a test run against the built tree changed a file of the real site/ through the shadow\'s links: find it (git status) and take it out of TESTS');
  if (opt.discover) console.log(`\n${passed.length} of ${list.length} pass against the built tree:\n${passed.map((t) => `  '${t}',`).join('\n')}`);
}

rmSync(tmp, { recursive: true, force: true });
if (problems.length) { console.error(`check_built_tree FAILED:\n  ${problems.join('\n  ')}`); process.exit(1); }
if (!opt.quiet) {
  console.log(`built tree ok: ${builtModules.length} modules, ${edges} imports each the same as the stripped tree's and each a file; `
    + `${exportsSame} modules export the same names from both trees (${needDocument} more need a document and load in neither); `
    + `the boot graph is ${bootBytes} B in ${boot.size} modules (stripped only: ${bootStripped} B; budget ${row[1]})`
    + (ran ? `; ${ran} node tests pass against it` : ''));
}
