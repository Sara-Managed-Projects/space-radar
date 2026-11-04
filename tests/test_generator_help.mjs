// tests/test_generator_help.mjs -- a generator answers --help and refuses a mistyped flag, and writes nothing either way
// (public #630, #709, #717, #725, #733, #740, #747, #631).
//
// The gap was one surprise: `python3 scripts/gen_aliases_js.py --help` did not print usage, it rewrote a
// tracked file, and `--chek` did the same. Every script that shares scripts/_genmirror.py, and the
// generators that keep their own main(), now print a usage line for --help (exit 0) and `unknown option`
// for anything else (exit 2). A generator that needs a package this machine lacks is counted as skipped.
//   node tests/test_generator_help.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };

// Every script built on the shared Mirror, and the generators that carry their own main().
const own = ['gen_rockets_js.py', 'gen_sources_json.py', 'gen_modulepreload.py', 'gen_home_seo.py', 'gen_contributors.py', 'build-skystars.py', 'build-galaxy.py'];
const mirrors = readdirSync(join(ROOT, 'scripts')).filter((f) => f.endsWith('.py') && !f.startsWith('_') && /_genmirror/.test(readFileSync(join(ROOT, 'scripts', f), 'utf8')));
check(mirrors.length >= 30, `the scripts that use _genmirror were not found (${mirrors.length})`);
const scripts = [...new Set([...mirrors, ...own])].sort();

// What each would write is where a stray run shows: no tracked generated file may change on --help.
const stamp = () => readdirSync(join(ROOT, 'site/js/data')).map((f) => statSync(join(ROOT, 'site/js/data', f)).mtimeMs).join(',');
const before = stamp();

const py = (f, arg) => spawnSync('python3', [join(ROOT, 'scripts', f), arg], { cwd: ROOT, encoding: 'utf8', timeout: 90000, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
let ran = 0; let skipped = 0;
for (const f of scripts) {
  const h = py(f, '--help');
  if (/ModuleNotFoundError|ImportError/.test(String(h.stderr))) { skipped++; continue; }
  ran++;
  check(h.status === 0, `${f} --help exited ${h.status}`);
  check(/usage:/i.test(h.stdout) && h.stdout.includes(f), `${f} --help printed no usage line naming itself`);
  check(!/wrote |is current|up to date/.test(h.stdout), `${f} --help ran the generator`);
  const s = py(f, '--chek');
  check(s.status === 2, `${f} --chek exited ${s.status}, not 2`);
  check(/unknown option: --chek/.test(s.stderr) && /usage:/i.test(s.stderr), `${f} --chek did not say "unknown option" and the usage on stderr`);
}
check(stamp() === before, 'a --help or --chek run changed a file in site/js/data');

if (problems.length) { console.error('generator help FAILED:\n  ' + problems.slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`generator help ok: ${ran} generators print usage for --help and refuse --chek without writing (${skipped} skipped for a missing package)`);
