// tests/test_cli_usage.mjs -- a command-line tool says what it wants instead of crashing (public #1230).
//
// The gap was one traceback: a tool read sys.argv[1], was run with nothing, and printed an IndexError
// where a sentence about the missing file belonged. This holds the line in three parts.
//   1. Every Python tool that uses argparse, or calls usage_if_asked (scripts/_cli.py), answers `--help` with a usage line and exit 0, and every
//      node tool whose source handles `--help` does the same. (A tool that needs a package this machine
//      lacks, such as Pillow or NumPy, is counted as skipped, not passed.)
//   2. A tool that indexes sys.argv[N] / process.argv[N] by hand and has no argparse and never says
//      "usage" is a known gap. The gaps are listed in tests/cli_usage_gaps.txt; a NEW tool with the gap
//      fails here, and a tool that has been fixed must leave the list.
//   3. The classifier itself is tried on samples, so the list cannot go quiet by the check going blind.
//
//   node tests/test_cli_usage.mjs            as CI runs it
//   node tests/test_cli_usage.mjs --list     print the gaps found now (to rewrite the list)
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };

// kind(path, source) -> 'argparse' | 'py-help' | 'node-help' | 'gap' | 'fine'
export function kind(path, src) {
  const py = path.endsWith('.py');
  if (py && /^\s*(import argparse|from argparse import)/m.test(src)) return 'argparse';
  if (py && /\busage_if_asked\(/.test(src)) return 'py-help'; // scripts/_cli.py: -h and --help print the docstring and exit 0
  if (py && /\busage_if_asked\(/.test(src)) return 'py-help'; // scripts/_cli.py: -h and --help print the docstring and exit 0
  if (!py && /--help/.test(src) && /process\.argv/.test(src)) return 'node-help';
  const indexed = py ? /sys\.argv\[\d/.test(src) : /process\.argv\[\d/.test(src);
  const says = /usage/i.test(src) || (!py && /--help/.test(src));
  return indexed && !says ? 'gap' : 'fine';
}

// -- the classifier, on samples -------------------------------------------------------------------
check(kind('a.py', 'import argparse\nap = argparse.ArgumentParser()') === 'argparse', 'argparse is recognised');
check(kind('a.py', 'import sys\nf = open(sys.argv[1])') === 'gap', 'a bare sys.argv[1] is a gap');
check(kind('a.py', 'import sys\nif len(sys.argv) < 2:\n    sys.exit("usage: a.py FILE")\nf = open(sys.argv[1])') === 'fine', 'a usage line clears it');
check(kind('a.py', 'import sys\nprint(sys.argv)') === 'fine', 'reading the whole argv is not indexing it');
check(kind('a.py', 'import sys\nif __name__ == "__main__":\n    usage_if_asked(__doc__)\n    f = open(sys.argv[1])') === 'py-help', 'a script that calls usage_if_asked is run');
check(kind('a.py', 'import sys\nif __name__ == "__main__":\n    usage_if_asked(__doc__)\n    f = open(sys.argv[1])') === 'py-help', 'a script that calls usage_if_asked is run');
check(kind('a.mjs', 'const f = process.argv[2];') === 'gap', 'a bare process.argv[2] is a gap');
check(kind('a.mjs', "if (process.argv.includes('--help')) { console.log('usage: a'); }") === 'node-help', 'a node tool with --help is run');
check(kind('a.mjs', "const f = process.argv[2]; // usage: node a.mjs FILE") === 'fine', 'a usage sentence clears a node tool');

// -- the tree -------------------------------------------------------------------------------------
const files = [];
for (const d of ['scripts', 'tools']) {
  for (const f of readdirSync(join(ROOT, d))) if (/\.(py|mjs)$/.test(f) && !f.startsWith('_')) files.push(`${d}/${f}`);
}
files.sort();
const gaps = [];
const run = [];
for (const f of files) {
  const k = kind(f, readFileSync(join(ROOT, f), 'utf8'));
  if (k === 'gap') gaps.push(f);
  else if (k !== 'fine') run.push([f, k]);
}

if (process.argv.includes('--list')) { console.log(gaps.join('\n')); process.exit(0); }

const listed = readFileSync(join(ROOT, 'tests/cli_usage_gaps.txt'), 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
for (const f of gaps) check(listed.includes(f), `${f} reads its arguments by position and never says "usage": give it argparse or a usage line (or, if that is truly impossible, list it in tests/cli_usage_gaps.txt with a reason)`);
for (const f of listed) check(gaps.includes(f), `${f} is in tests/cli_usage_gaps.txt but no longer has the gap: delete the line`);

let ran = 0; let skipped = 0;
for (const [f, k] of run) {
  const cmd = k === 'node-help' ? process.execPath : 'python3';
  const r = spawnSync(cmd, [join(ROOT, f), '--help'], { cwd: ROOT, encoding: 'utf8', timeout: 90000, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
  const err = String(r.stderr || '');
  if (/ModuleNotFoundError|ImportError|Cannot find (module|package)|ERR_MODULE_NOT_FOUND/.test(err)) { skipped++; continue; }
  ran++;
  check(r.status === 0, `${f} --help exited ${r.status}${r.error ? ' (' + r.error.code + ')' : ''}: ${err.trim().split('\n').slice(-1)[0] || 'no message'}`);
  check(/usage/i.test(String(r.stdout || '')), `${f} --help printed no usage line`);
}

if (problems.length) {
  console.error('FAIL test_cli_usage\n  ' + problems.slice(0, 40).join('\n  ') + (problems.length > 40 ? `\n  ... and ${problems.length - 40} more` : ''));
  process.exit(1);
}
console.log(`ok test_cli_usage (${ran} tools answered --help, ${skipped} skipped for a missing package, ${gaps.length} known gaps, none new)`);
