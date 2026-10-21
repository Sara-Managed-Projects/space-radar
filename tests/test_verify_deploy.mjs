// scripts/verify-deploy.sh compares what the site serves with what deploy.sh UPLOADS, not with site/ as it is
// written (public #1214, the 1.3.0 fix). Since #1214 deploy.sh uploads the Lab from the build (scripts/seo_lab.py
// adds a canonical, Open Graph and JSON-LD to each simulator) and sw.js stamped with the hashes of the app
// (scripts/stamp_sw.py), so a clean deploy reported about 77 lab pages and the worker as "differs".
//
//   1. A server that answers as a clean deploy does (the Lab from the build, the worker stamped, everything else
//      as in site/): every lab page, the list, the worker and index.html verify, with 0 differing, and
//      lab/_template/ (never built, never uploaded) is counted as not deployed, not as missing.
//   2. A server that answers with the files of site/ as written (the old comparison's expectation): the same
//      check names every simulator and the worker as DIFFERS. This is what keeps the first check honest.
//   3. A real change is still caught: one simulator with one byte more.
//   4. The deploy's own sources are what the verifier builds from: seo_lab.build, build_seo.DEFAULT_HOST and
//      stamp_sw.py, so the verifier cannot drift from what deploy.sh runs.
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.error(`FAIL ${what}`); } };

// What a clean deploy uploads, built the way deploy.sh builds it.
const BUILT = mkdtempSync(join(tmpdir(), 'verify-deploy-test-'));
const py = spawnSync('python3', ['-c', [
  'import sys', 'from pathlib import Path', 'sys.path.insert(0, "scripts")', 'import build_seo, seo_lab',
  'seo_lab.build(Path(sys.argv[1]), build_seo.DEFAULT_HOST)'].join('\n'), join(BUILT, 'built')], { cwd: ROOT, encoding: 'utf8' });
check(py.status === 0, `the Lab builds (${py.stderr})`);
const sw = spawnSync('python3', ['scripts/stamp_sw.py', '--site', 'site', '--out', join(BUILT, 'sw.js')], { cwd: ROOT, encoding: 'utf8' });
check(sw.status === 0, `the worker stamps (${sw.stderr})`);

const labDirs = readdirSync(join(SITE, 'lab'), { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_')).map((d) => d.name);
check(labDirs.length > 20, `the Lab has simulators (${labDirs.length})`);
const files = ['index.html', 'sw.js', 'lab/index.html', ...labDirs.map((n) => `lab/${n}/index.html`), 'lab/_template/index.html'];

let mode = 'deploy';
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.slice(1));
  let file = join(SITE, p);
  if (mode !== 'as-written') {
    if (p === 'sw.js') file = join(BUILT, 'sw.js');
    else if (p.startsWith('lab/') && existsSync(join(BUILT, 'built', p))) file = join(BUILT, 'built', p);
    else if (p.startsWith('lab/_template/')) { res.writeHead(404); res.end(); return; } // never uploaded
  }
  let body;
  try { body = readFileSync(file); } catch { res.writeHead(404); res.end(); return; }
  if (mode === 'one-byte' && p === `lab/${labDirs[0]}/index.html`) body = Buffer.concat([body, Buffer.from('<!-- one more byte -->')]);
  res.writeHead(200);
  res.end(body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const verify = (m) => new Promise((resolve) => {
  mode = m;
  const child = spawn('bash', [join(ROOT, 'scripts/verify-deploy.sh'), `--base=${base}`, '--source', ...files], { env: process.env });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('close', (status) => resolve({ status, out }));
});

let v = await verify('deploy');
check(v.status === 0 && / 0 differ,/.test(v.out) && !/DIFFERS|MISSING/.test(v.out), `a clean deploy reports 0 differ (${v.out.trim()})`);
check(new RegExp(`${files.length - 1} match`).test(v.out) && /1 not deployed/.test(v.out), `every page and the worker match, the starter is not deployed (${v.out.trim().split('\n').pop()})`);

v = await verify('as-written');
const differs = (v.out.match(/^DIFFERS {2}lab\/[^/]+\/index\.html/gm) || []).length;
check(v.status === 1 && /DIFFERS {2}sw\.js/.test(v.out) && differs === labDirs.length, `site/ as written differs from what a deploy uploads: the worker and ${labDirs.length} simulators (${differs})`);

v = await verify('one-byte');
check(v.status === 1 && new RegExp(`DIFFERS {2}lab/${labDirs[0]}/index\\.html`).test(v.out) && (v.out.match(/^DIFFERS/gm) || []).length === 1, `one changed byte in one simulator is the only difference reported (${v.out.trim()})`);

// 4. The verifier builds with the deploy's own code.
const verifier = readFileSync(join(ROOT, 'scripts/verify-deploy.sh'), 'utf8');
const deploy = readFileSync(join(ROOT, 'scripts/deploy.sh'), 'utf8');
check(/seo_lab\.build\(Path\(sys\.argv\[1\]\), build_seo\.DEFAULT_HOST\)/.test(verifier) && /stamp_sw\.py --site site/.test(verifier), 'verify-deploy.sh builds the Lab and the worker with seo_lab.py and stamp_sw.py');
check(/build_seo\.py" --out "\$BUILT"/.test(deploy) && /stamp_sw\.py" --site "\$SITE" \$\{OVERLAY/.test(deploy), 'deploy.sh builds them the same way (host default, overlay of the stripped tree)');

server.close();
rmSync(BUILT, { recursive: true, force: true });
if (fails) { console.error(`${fails} failure(s)`); process.exit(1); }
console.log(`verify-deploy ok: a clean deploy reports 0 differ over ${files.length} paths (${labDirs.length} simulators, the list, the worker); site/ as written does not; one byte is caught`);
