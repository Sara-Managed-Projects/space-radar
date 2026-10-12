// tests/test_minify_real.mjs -- the minifier a deploy runs over the ES modules (internal #515):
// pinned, checked, and what it writes is still the app.
//
//   node tests/test_minify_real.mjs
//
// WHAT COULD VISIBLY CHANGE: nothing should; what could BREAK is a name read by a string, a lazy
// import that lost its file, a licence header dropped, or a different minifier than the one that
// was reviewed. So:
//   1. THE TOOL. scripts/get_esbuild.py's pins are well formed; an archive that is not the one npm
//      published is refused and nothing is kept; a binary in the cache that is not the recorded one
//      is thrown away, not run.
//   2. THE TREE. `minify_site.py --esbuild auto` builds; scripts/check_built_tree.mjs --tests passes
//      on it: every import as in the stripped tree and a file, every module node can load exporting
//      the same names, the node tests that compute passing AGAINST THE BUILT TREE, and the boot
//      graph inside `deployed_boot_js_bytes`.
//   3. THE LIMITS. Stylesheets, `*.min.js` and the one classic script are byte for byte what the
//      first pass wrote; every licence comment the first pass kept is in the built file; nothing is
//      written into site/.
//   4. THE MAPS. Each minified module has a map with the source as written inside, and a mapping
//      that still points at code after the licence header was put back above it.
//   5. THE SAME BYTES TWICE (what scripts/verify-deploy.sh relies on).
//   6. THE WIRING. deploy.sh checks the tree before it uploads, sends the maps as JSON beside the
//      code, and has --strip-only as the way back; screens.yml and verify-deploy.sh build the same tree.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.error(`FAIL: ${what}`); } };
const tmp = mkdtempSync(join(tmpdir(), 'sr-minify-real-'));
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26, cwd: ROOT, ...opts });

// --- 1. the tool ----------------------------------------------------------------------------------
let r = run('python3', ['scripts/get_esbuild.py', '--check']);
check(r.status === 0 && /pinned for darwin-x64, darwin-arm64, linux-x64, linux-arm64/.test(r.stdout), `the pins are well formed (${r.stdout}${r.stderr})`);
const py = (code) => run('python3', ['-c', `import sys, os\nsys.path.insert(0, 'scripts')\nimport get_esbuild as g\n${code}`], { env: { ...process.env, XDG_CACHE_HOME: join(tmp, 'cache') } });
r = py(`
name = g.this_platform()
try:
    g.ensure(name, fetch=lambda url: b'not the archive')
    print('KEPT')
except g.Refused as why:
    print('REFUSED', why)
print('FILES', sum(len(f) for _, _, f in os.walk(os.environ['XDG_CACHE_HOME'])) if os.path.isdir(os.environ['XDG_CACHE_HOME']) else 0)
assert g.url(name).startswith('https://registry.npmjs.org/@esbuild/' + name + '/-/' + name + '-' + g.VERSION + '.tgz')
`);
check(/REFUSED .*not the one npm published/.test(r.stdout) && /FILES 0/.test(r.stdout), `an archive with another SHA-512 is refused and nothing is kept (${r.stdout}${r.stderr})`);
r = py(`
name = g.this_platform()
target = g.cache_dir() / (g.VERSION + '-' + name) / 'esbuild'
target.parent.mkdir(parents=True)
target.write_bytes(b'#!/bin/sh\\necho planted\\n')
def offline(url):
    raise OSError('no network in this test')
try:
    print('RAN', g.ensure(name, fetch=offline))
except g.Refused as why:
    print('REFUSED', why)
print('PLANTED_LEFT', target.exists())
`);
check(/REFUSED/.test(r.stdout) && /PLANTED_LEFT False/.test(r.stdout), `a binary in the cache that is not the recorded one is deleted, never run (${r.stdout}${r.stderr})`);

// --- 2. the tree ----------------------------------------------------------------------------------
const built = join(tmp, 'built');
const stripped = join(tmp, 'stripped');
r = run('python3', ['scripts/minify_site.py', '--out', built, '--esbuild', 'auto', '--node', process.execPath]);
check(r.status === 0 && /esbuild minified \d+ modules/.test(r.stdout), `minify_site.py --esbuild auto builds, and node --check reads every module (${(r.stdout + r.stderr).slice(-400)})`);
const summary = (r.stdout.match(/esbuild minified (\d+) modules, (\d+) B -> (\d+) B/) || []).slice(1).map(Number);
run('python3', ['scripts/minify_site.py', '--out', stripped, '--quiet']);
r = run(process.execPath, ['scripts/check_built_tree.mjs', '--built', built, '--tests'], { timeout: 1500000 });
check(r.status === 0, `scripts/check_built_tree.mjs --tests passes on the built tree:\n${(r.stderr || r.stdout).slice(0, 3000)}`);
const gate = r.stdout.trim();
check(/(\d+) node tests pass against it/.test(gate) && Number(gate.match(/(\d+) node tests pass/)[1]) >= 40, `at least forty node tests ran against the built tree (${gate.slice(-120)})`);
// The gate has teeth: a built tree with one export renamed, and one with a lazy import gone, fail.
{
  const { cpSync, writeFileSync } = await import('node:fs');
  const bad = join(tmp, 'bad');
  cpSync(built, bad, { recursive: true });
  const victim = join(bad, 'js/ui/offline.js');
  const text = readFileSync(victim, 'utf8');
  writeFileSync(victim, text.replace(/as swWanted\b/, 'as swWantez'));
  const one = run(process.execPath, ['scripts/check_built_tree.mjs', '--built', bad]);
  check(text.includes('as swWanted') && one.status === 1 && /js\/ui\/offline\.js: exports differ/.test(one.stderr), `a renamed export is caught (${one.stderr.slice(0, 300)})`);
  writeFileSync(victim, text);
  const src = join(bad, 'js/main.js');
  const s = readFileSync(src, 'utf8');
  writeFileSync(src, s.replace('import("./ui/offline.js")', 'import("./ui/offline.mjs")'));
  const two = run(process.execPath, ['scripts/check_built_tree.mjs', '--built', bad]);
  check(s.includes('import("./ui/offline.js")') && two.status === 1 && /js\/main\.js: its imports changed/.test(two.stderr), `a lazy import that lost its file is caught (${two.stderr.slice(0, 300)})`);
}

// --- 3. the limits --------------------------------------------------------------------------------
const rels = (root) => walk(root).map((p) => relative(root, p).split(sep).join('/'));
const all = rels(stripped);
const untouched = all.filter((p) => p.endsWith('.css') || p.endsWith('.min.js') || p === 'vendor/basis/basis_transcoder.js' || p.endsWith('.wasm'));
check(untouched.length >= 10 && untouched.every((p) => readFileSync(join(built, p)).equals(readFileSync(join(stripped, p)))),
  `stylesheets, *.min.js, the transcoder and its wasm are what the first pass wrote (${untouched.filter((p) => !readFileSync(join(built, p)).equals(readFileSync(join(stripped, p)))).slice(0, 3)})`);
const maps = rels(built).filter((p) => p.endsWith('.js.map'));
check(maps.length === summary[0] && maps.length > 200, `one map per minified module (${maps.length} maps, ${summary[0]} modules)`);
const KEEP = /licen[cs]e|copyright|@preserve|SPDX|\(c\)/i;
const astro = readFileSync(join(built, 'vendor/astronomy.js'), 'utf8');
check(astro.startsWith('/**') && /MIT License/.test(astro.slice(0, 600)) && /Copyright \(c\) 2019-2023 Don Cross/.test(astro.slice(0, 600)), 'vendor/astronomy.js still opens with its MIT notice');
let lost = 0; let kept = 0;
for (const p of maps.map((m) => m.slice(0, -4))) {
  // Every comment the first pass kept on a line of its own is in the built file, whole.
  for (const m of readFileSync(join(stripped, p), 'utf8').matchAll(/^\s*(\/\*[\s\S]*?\*\/|\/\/[^\n]*)$/gm)) {
    if (!KEEP.test(m[1])) continue;
    kept++;
    if (!readFileSync(join(built, p), 'utf8').includes(m[1])) lost++;
  }
}
check(kept >= 5 && lost === 0, `every licence or copyright comment the first pass kept is in the built file (${kept} kept, ${lost} lost)`);
const dirty = run('git', ['status', '--porcelain', '--', 'site']);
check(!/\.map\b/.test(dirty.stdout) && !existsSync(join(SITE, 'js/main.js.map')), 'nothing is written into site/: the repository still runs as written');

// --- 4. the maps ----------------------------------------------------------------------------------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function firstSegment(mappings) {
  // The first mapped segment of the file: [generated line, generated column, source, line, column].
  const lines = mappings.split(';');
  const at = lines.findIndex((l) => l.length > 0);
  const seg = lines[at].split(',')[0];
  const out = []; let value = 0; let shift = 0;
  for (const ch of seg) {
    const d = B64.indexOf(ch);
    value += (d & 31) << shift;
    if (d & 32) { shift += 5; continue; }
    out.push(value & 1 ? -(value >> 1) : value >> 1);
    value = 0; shift = 0;
  }
  return [at, ...out];
}
for (const p of ['js/main.js', 'vendor/astronomy.js', 'js/scene/glyphs.js']) {
  const code = readFileSync(join(built, p), 'utf8');
  const map = JSON.parse(readFileSync(join(built, `${p}.map`), 'utf8'));
  const source = readFileSync(join(SITE, p), 'utf8');
  check(map.version === 3 && JSON.stringify(map.sources) === JSON.stringify([`source:///${p}`]) && map.sourcesContent[0] === source, `${p}.map holds the file as written, under a name that is no folder of this machine`);
  check(code.trimEnd().endsWith(`//# sourceMappingURL=${p.split('/').pop()}.map`), `${p} names its map`);
  const [genLine, genCol, , srcLine, srcCol] = firstSegment(map.mappings);
  const header = code.slice(0, code.indexOf('\nimport') + 1 || 0).split('\n').length - 1;
  const generated = code.split('\n')[genLine];
  const original = source.split('\n')[srcLine] || '';
  // The first mapped token: `import` or `export` or `const` in both, at the mapped places.
  const word = (text, col) => (text.slice(col).match(/^[A-Za-z_$]+/) || [''])[0];
  check(generated !== undefined && !generated.startsWith('/*') && !generated.startsWith(' *') && word(generated, genCol) !== '' && word(generated, genCol) === word(original, srcCol),
    `${p}: the first mapping points at the same word in the built file (line ${genLine + 1}) and in the source (line ${srcLine + 1}): "${word(generated || '', genCol)}" / "${word(original, srcCol)}"`);
  if (p === 'vendor/astronomy.js') check(genLine > 20 && header >= 0, `the map of a file with a licence header is shifted by the header (first mapped line ${genLine + 1})`);
}

// --- 5. the same bytes twice ----------------------------------------------------------------------
const again = join(tmp, 'again');
run('python3', ['scripts/minify_site.py', '--out', again, '--esbuild', 'auto', '--quiet']);
const differ = rels(built).filter((p) => !existsSync(join(again, p)) || !readFileSync(join(again, p)).equals(readFileSync(join(built, p))));
check(differ.length === 0, `two builds are the same bytes, maps included (${differ.slice(0, 3)})`);

// --- 6. the wiring --------------------------------------------------------------------------------
const deploy = readFileSync(join(ROOT, 'scripts/deploy.sh'), 'utf8');
check(/REAL=\(--esbuild auto\)/.test(deploy) && /--strip-only\)\s+REAL=\(\)/.test(deploy), 'deploy.sh minifies by default, and --strip-only is the way back');
check(/check_built_tree\.mjs" --built "\$BUILT\/min" \$\{TESTS/.test(deploy) && deploy.indexOf('check_built_tree.mjs" --built') < deploy.indexOf('"$APP/css" "s3://$BUCKET/css"'), 'the built tree is checked, with the node tests, BEFORE anything is uploaded');
check(/TESTS=\(--tests\); \[ "\$DRY_RUN" = "1" \] && TESTS=\(\)/.test(deploy), 'only a dry run skips the node tests');
check((deploy.match(/--exclude "\*" --include "\*\.map" --delete/g) || []).length === 2 && /"\$MAPS\/js"\s+"s3:\/\/\$BUCKET\/js"/.test(deploy) && /application\/json; charset=utf-8" \\\n\s+--exclude "\*" --include "\*\.map"/.test(deploy),
  'the maps of js/ and vendor/ go up as JSON, with --delete so a deploy without the pass removes the old ones');
check((deploy.match(/--exclude "\*\.map"/g) || []).length >= 2, 'and a map is never uploaded as JavaScript');
const verify = readFileSync(join(ROOT, 'scripts/verify-deploy.sh'), 'utf8');
check(/minify_site\.py --out "\$MIN\/min" --quiet \$\{REAL/.test(verify) && /REAL=\(--esbuild auto\)/.test(verify) && /--strip-only\) REAL=\(\)/.test(verify), 'verify-deploy.sh builds the same tree to compare with');
const screens = readFileSync(join(ROOT, '.github/workflows/screens.yml'), 'utf8');
check(/minify_site\.py --out "\$RUNNER_TEMP\/served" --tree --esbuild auto --node node/.test(screens) && /check-drawn\.mjs --base=http:\/\/127\.0\.0\.1:8178/.test(screens), 'screens.yml serves the minified tree to the byte gate and to a drawn check');
check(/esbuild 0\.25\.9/.test(readFileSync(join(ROOT, 'CREDITS.md'), 'utf8')), 'CREDITS.md names the tool and its licence');

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`\nminify (real): ${failed} check(s) FAILED`); process.exit(1); }
console.log(`minify (real) ok: esbuild at its pinned hash took ${summary[0]} modules from ${summary[1]} B to ${summary[2]} B with a map beside each; ${gate.replace(/^built tree ok: /, '')}`);
