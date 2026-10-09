// tests/test_precompress.mjs -- a deploy stores the code, the models and the bundled data at
// Brotli 11 (internal #514), and nothing a visitor is handed changes by a byte.
//
//   node tests/test_precompress.mjs
//
// WHAT COULD VISIBLY CHANGE: a file that does not decode to itself is a module that does not parse
// or a star field of noise; a file the rule forgot is a 403; a deploy that forgot `--exclude "v1/*"`
// deletes every saved copy. So:
//   1. ONE RULE, FOUR PLACES. scripts/precompress.mjs `precompressed()` against the edge function's
//      pattern for every file of site/, and against scripts/deploy.sh's filters in a dry run.
//   2. The copies decode to the file, byte for byte, Brotli and gzip; keep the file's time (so
//      `aws s3 sync` uploads what changed); and a type the rule does not know stops a --strict run.
//   3. The edge function sends a client without Brotli to /_gz/, and nobody else anywhere.
//   4. scripts/verify-deploy.sh, against a server that answers as CloudFront will: it compares the
//      DECODED body, refuses a file that arrives uncompressed, and refuses a byte that differs.
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { APP_EXT, DATA_EXT, compress, decode, precompressed, run } from '../scripts/precompress.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.error(`FAIL: ${what}`); } };
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const tmp = mkdtempSync(join(tmpdir(), 'sr-precompress-'));

// --- 1. the rule and the edge function agree on every file of the site --------------------------
const edgeSource = readFileSync(join(ROOT, 'scripts/edge/encoding-fallback.js'), 'utf8');
const handler = new Function(`${edgeSource}; return handler;`)();
const ask = (uri, accept) => handler({ request: { uri, headers: accept === null ? {} : { 'accept-encoding': { value: accept } } } }).uri;
const all = walk(SITE).map((p) => relative(SITE, p).split(sep).join('/')).filter((p) => !p.endsWith('.DS_Store'));
const extra = ['data/v1/index.json', 'data/v1/celestrak-active.json', 'index.html', 'sw.js', 'o/iss.html', 'js/README.md', 'js/main.js.map', 'robots.txt', '_gz/js/main.js'];
const disagree = [...all, ...extra].filter((p) => (ask(`/${p}`, 'gzip') === `/_gz/${p}`) !== precompressed(p));
check(all.length > 1500, `site/ was read (${all.length} files)`);
check(disagree.length === 0, `the edge function and precompressed() disagree on ${disagree.slice(0, 5).join(', ')}`);
const stored = all.filter(precompressed);
check(['js/main.js', 'css/ui.css', 'vendor/three.core.js', 'data/stars.bin', 'data/exoplanets.csv', 'data/dso.json', 'models/aqua.glb'].every((p) => !all.includes(p) || stored.includes(p)),
  'the code, stars.bin, the catalogues and the models are stored compressed');
check(stored.includes('data/stars.bin') && stored.includes('js/main.js'), 'stars.bin and main.js are in the tree and in the rule');
check(!['index.html', 'sw.js', 'robots.txt', 'manifest.webmanifest', 't/index.html', 'data/v1/index.json'].some(precompressed) && !all.filter((p) => /\.(html|webp|png|woff2|opus|m4a|jpg)$/.test(p)).some(precompressed),
  'HTML, sw.js, the saved copies, pictures, fonts and sound are never stored compressed');

// --- 3. who is sent to the gzip copy ------------------------------------------------------------
for (const [accept, to] of [['gzip, deflate, br, zstd', '/js/main.js'], ['br', '/js/main.js'], ['gzip, br;q=0.9', '/js/main.js'], ['BR', '/js/main.js'],
  ['gzip, deflate', '/_gz/js/main.js'], ['gzip, br;q=0', '/_gz/js/main.js'], ['', '/_gz/js/main.js'], [null, '/_gz/js/main.js'], ['identity', '/_gz/js/main.js'], ['brotli-ish, gzip', '/_gz/js/main.js']]) {
  check(ask('/js/main.js', accept) === to, `Accept-Encoding ${JSON.stringify(accept)} asks for ${to} (got ${ask('/js/main.js', accept)})`);
}
check(ask('/index.html', 'gzip') === '/index.html' && ask('/', '') === '/' && ask('/data/v1/index.json', 'gzip') === '/data/v1/index.json', 'pages and the saved copies are never redirected');

// --- 2. the copies ------------------------------------------------------------------------------
const src = join(tmp, 'src');
for (const p of ['js/main.js', 'css/ui.css', 'data/stars.bin', 'data/constellation-names.json', 'data/places.png']) {
  mkdirSync(dirname(join(src, p)), { recursive: true });
  cpSync(join(SITE, p), join(src, p));
}
mkdirSync(join(src, 'data/v1'), { recursive: true });
writeFileSync(join(src, 'data/v1/index.json'), '{"the harvester":"owns this"}');
writeFileSync(join(src, 'js/empty.js'), '');
writeFileSync(join(src, 'js/README.md'), '# the module contract');
const when = new Date('2026-01-02T03:04:05Z');
utimesSync(join(src, 'data/stars.bin'), when, when);
const sum = await run({ from: src, dirs: ['js', 'css', 'data'], out: join(tmp, 'br'), gzip: join(tmp, 'gz'), quality: 11, cache: join(tmp, 'cache') });
check(sum.files === 5, `five files were compressed (${sum.files}): not the README, the picture or data/v1`);
const made = walk(join(tmp, 'br')).map((p) => relative(join(tmp, 'br'), p).split(sep).join('/')).sort();
check(JSON.stringify(made) === JSON.stringify(['css/ui.css', 'data/constellation-names.json', 'data/stars.bin', 'js/empty.js', 'js/main.js']), `the Brotli tree holds exactly the rule's files (${made})`);
for (const p of made) {
  const want = readFileSync(join(src, p));
  check(zlib.brotliDecompressSync(readFileSync(join(tmp, 'br', p))).equals(want), `${p}: the Brotli copy decodes to the file`);
  check(zlib.gunzipSync(readFileSync(join(tmp, 'gz', p))).equals(want), `${p}: the gzip copy decodes to the file`);
}
const starsRaw = statSync(join(src, 'data/stars.bin')).size;
const starsBr = statSync(join(tmp, 'br/data/stars.bin')).size;
check(starsBr < starsRaw * 0.75, `stars.bin, which went out whole, is at most three quarters of itself (${starsRaw} -> ${starsBr})`);
check(statSync(join(tmp, 'br/js/main.js')).size < statSync(join(tmp, 'gz/js/main.js')).size, 'Brotli 11 is smaller than gzip 9 for main.js');
check(Math.abs(statSync(join(tmp, 'br/data/stars.bin')).mtimeMs - when.getTime()) < 2000, "a copy keeps its file's time, so a sync uploads only what changed");
// The cache: a second run reads what the first wrote, and gives the same bytes.
const again = await run({ from: src, dirs: ['js', 'css', 'data'], out: join(tmp, 'br2'), quality: 11, cache: join(tmp, 'cache') });
check(again.br === sum.br && readFileSync(join(tmp, 'br2/js/main.js')).equals(readFileSync(join(tmp, 'br/js/main.js'))), 'a second run from the cache writes the same bytes');
check(readdirSync(join(tmp, 'cache')).length === 10, 'the cache holds one Brotli and one gzip entry per file');
// --strict: an unknown type in a code folder stops the run; the module contract does not.
let threw = '';
writeFileSync(join(src, 'js/shader.glsl'), 'void main(){}');
try { await run({ from: src, dirs: ['js'], out: join(tmp, 'br3'), strict: true, quality: 1, cache: null }); } catch (e) { threw = e.message; }
check(/shader\.glsl/.test(threw), `--strict refuses a type it would otherwise leave out of the upload (${threw})`);
rmSync(join(src, 'js/shader.glsl'));
check(decode(await compress(Buffer.from('abc'), 'gz'), 'gzip').toString() === 'abc' && decode(Buffer.from('abc'), '-').toString() === 'abc', 'decode() reads gzip and passes an unencoded body through');

// --- 1b. deploy.sh's plan, dry, against a fake aws ----------------------------------------------
const bin = join(tmp, 'bin');
mkdirSync(bin);
const log = join(tmp, 'aws.log');
writeFileSync(join(bin, 'aws'), `#!/bin/sh\necho "$*" >> "${log}"\nexit 0\n`);
chmodSync(join(bin, 'aws'), 0o755);
const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
const plan = (...flags) => {
  writeFileSync(log, '');
  const r = spawnSync('bash', [join(ROOT, 'scripts/deploy.sh'), '--bucket', 'example-bucket', '--assets-only', '--dry-run', ...flags], { env, encoding: 'utf8' });
  check(r.status === 0, `deploy.sh --assets-only --dry-run ${flags.join(' ')} runs (${(r.stderr || '').slice(-300)})`);
  return readFileSync(log, 'utf8').split('\n').filter((l) => l.startsWith('s3 sync'));
};
const syncs = plan();
const to = (prefix) => syncs.filter((l) => l.includes(` s3://example-bucket/${prefix} `));
const data = to('data');
check(data.length === 2, `two syncs to data/: the pictures as they are, the catalogues compressed (${data.length})`);
const plain = data.find((l) => !l.includes('--content-encoding'));
const packed = data.find((l) => l.includes('--content-encoding br'));
check(plain && DATA_EXT.every((e) => plain.includes(`--exclude *.${e}`)) && plain.includes('--exclude v1/*'), 'the plain data sync leaves out every compressed type, and data/v1');
check(packed && packed.includes('--exclude * ') && DATA_EXT.every((e) => packed.includes(`--include *.${e}`)) && / --exclude v1\/\*$/.test(packed.trim()),
  'the compressed data sync takes exactly the rule\'s types, and `--exclude "v1/*"` is its LAST filter (a later filter wins)');
check(data.every((l) => !l.includes('--delete') || l.includes('--exclude v1/*')), 'no data sync with --delete can reach the harvester\'s data/v1');
const filterTypes = (plain.match(/--exclude \*\.(\w+)/g) || []).map((m) => m.split('.')[1]).sort();
check(JSON.stringify(filterTypes) === JSON.stringify([...DATA_EXT].sort()), `deploy.sh's data filters are DATA_EXT (${filterTypes})`);
check(to('models').length === 1 && to('models')[0].includes('--content-encoding br') && to('models')[0].includes('model/gltf-binary'), 'the models are stored as Brotli, with their own type');
for (const p of ['_gz/data', '_gz/models']) check(to(p).length >= 1 && to(p).every((l) => l.includes('--content-encoding gzip')), `${p} holds the gzip copies`);
for (const p of ['textures', 'images', 'og', 'audio', 'fonts']) check(to(p).length >= 1 && to(p).every((l) => !l.includes('--content-encoding')), `${p}/ is uploaded as it is`);
const off = plan('--no-precompress');
check(off.length > 5 && off.every((l) => !l.includes('--content-encoding') && !l.includes('/_gz/')) && off.filter((l) => l.includes(' s3://example-bucket/data ')).length === 1,
  '--no-precompress is the deploy of before: no encoding, no _gz/, one data sync');
// The app block is read, not run (tests/test_seo.py runs it): each code sync carries the encoding.
const deploy = readFileSync(join(ROOT, 'scripts/deploy.sh'), 'utf8');
check(/precompress "\$APP" css,js,vendor --strict\n\s+APP="\$BUILT\/br"/.test(deploy), 'the app block compresses whichever tree it uploads, strictly');
check(deploy.indexOf('precompress "$APP" css,js,vendor') > deploy.indexOf('OVERLAY=(--overlay "$BUILT/min")'), 'the worker is stamped from the UNcompressed files: the overlay is set before the tree is swapped');
check(/"\/_gz\/\*"/.test(deploy), 'the gzip copies are invalidated with the app');
check(JSON.stringify(APP_EXT) === JSON.stringify(['js', 'css', 'wasm']), 'APP_EXT is what the three code syncs upload');

// --- 4. verify-deploy.sh against a server that answers as the edge will --------------------------
const files = ['js/main.js', 'data/stars.bin', 'index.html', 'css/ui.css'];
let mode = 'good';
const server = createServer((req, res) => {
  const p = decodeURIComponent(req.url.slice(1));
  let body;
  try { body = readFileSync(join(SITE, p)); } catch { res.writeHead(404); res.end(); return; }
  const accept = String(req.headers['accept-encoding'] || '');
  if (mode === 'changed' && p === 'css/ui.css') body = Buffer.concat([body, Buffer.from('/* one more byte */')]);
  if (precompressed(p) && !(mode === 'plain-stars' && p === 'data/stars.bin')) {
    // As CloudFront does with a stored encoding: sent to everyone, asked for or not.
    const br = /\bbr\b/.test(accept) || mode !== 'fallback';
    res.writeHead(200, { 'content-encoding': br ? 'br' : 'gzip' });
    res.end(br ? zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 1 } }) : zlib.gzipSync(body));
  } else if (/\bgzip\b/.test(accept) && p.endsWith('.html') && mode !== 'plain-stars') {
    res.writeHead(200, { 'content-encoding': 'gzip' });
    res.end(zlib.gzipSync(body));
  } else { res.writeHead(200); res.end(body); }
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
let v = await verify('good');
check(v.status === 0 && /4 match \(3 of them stored as Brotli/.test(v.out) && /gzip fallback is not installed/.test(v.out), `a deployed tree verifies by its DECODED bytes, and says the fallback is missing (${v.out.trim()})`);
v = await verify('fallback');
check(v.status === 0 && /a client without Brotli is sent gzip/.test(v.out), `with the edge function, verify-deploy says a client without Brotli is sent gzip (${v.out.trim()})`);
v = await verify('plain-stars');
check(v.status === 1 && /NOT BROTLI {2}data\/stars\.bin/.test(v.out), `a file that should be stored compressed and arrives whole is refused (${v.out.trim()})`);
v = await verify('changed');
check(v.status === 1 && /DIFFERS {2}css\/ui\.css/.test(v.out) && !/DIFFERS {2}js\/main\.js/.test(v.out), `one changed byte is still caught (${v.out.trim()})`);
server.close();

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`\nprecompress: ${failed} check(s) FAILED`); process.exit(1); }
console.log(`precompress ok: ${stored.length} of ${all.length} files are stored compressed by one rule that deploy.sh, verify-deploy.sh and the edge function follow; copies decode byte for byte; stars.bin ${starsRaw} -> ${starsBr} B`);
