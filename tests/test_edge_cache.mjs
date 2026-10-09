// tests/test_edge_cache.mjs -- the app files are kept by the edge between deploys and still
// revalidated by every browser (internal #513).
//
//   node tests/test_edge_cache.mjs
//
// WHAT COULD VISIBLY CHANGE: a deploy that nobody sees. If a browser kept the page, or the edge
// kept the last build with nothing to tell it otherwise, visitors would run old code for up to a
// year. So this holds, from scripts/deploy.sh itself:
//   1. THE HEADER. Read as a browser reads it: fresh for zero seconds and bound to revalidate, on
//      every app file, HTML and sw.js included. Read as a shared cache reads it: fresh for a year.
//   2. EVERY path uploaded with that header is named in the invalidation the same script sends.
//   3. The app is never deployed with that header and no invalidation: without --distribution the
//      script stops before it asks AWS anything.
//   4. After the invalidation the script waits for it and compares the edge's ETag for index.html
//      and js/main.js with the files it uploaded; a mismatch is a failed deploy, not a "done".
//   5. --no-edge-cache is the deploy of before: plain no-cache.
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const deploy = readFileSync(join(ROOT, 'scripts/deploy.sh'), 'utf8');
const code = deploy.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.error(`FAIL: ${what}`); } };

// --- 1. the header, as each kind of cache reads it ------------------------------------------------
/** Seconds a response stays fresh, and whether it must be revalidated once stale (RFC 9111). */
function freshness(header, shared) {
  const d = Object.fromEntries(header.toLowerCase().split(',').map((p) => p.trim().split('=')).map(([k, v]) => [k, v === undefined ? true : v]));
  if (d['no-store']) return { seconds: 0, revalidates: true, stores: false };
  if (d['no-cache']) return { seconds: 0, revalidates: true, stores: true };
  if (shared && d.private) return { seconds: 0, revalidates: true, stores: false };
  const seconds = shared && d['s-maxage'] !== undefined ? Number(d['s-maxage']) : Number(d['max-age'] ?? NaN);
  return { seconds, revalidates: !!d['must-revalidate'] || (shared && (!!d['proxy-revalidate'] || d['s-maxage'] !== undefined)), stores: true };
}
const value = (/^REVALIDATE="([^"]+)"$/m.exec(code) || [])[1] || '';
const browser = freshness(value, false);
const edge = freshness(value, true);
check(browser.seconds === 0 && browser.revalidates && browser.stores, `a browser must revalidate an app file on every load ("${value}" reads as ${JSON.stringify(browser)})`);
check(edge.seconds === 31536000 && edge.stores, `the edge keeps it for a year, until the invalidation ("${value}" reads as ${JSON.stringify(edge)})`);
check(!/no-cache|no-store|private|immutable/.test(value), `nothing in "${value}" that CloudFront documents as "cache for the minimum TTL", and never immutable`);
const old = freshness('no-cache', true);
check(old.seconds === 0, 'and plain no-cache, the header of before, gave the edge nothing to keep');

// --- 2. what carries it is what is invalidated ----------------------------------------------------
const uses = [...code.matchAll(/"s3:\/\/\$BUCKET\/([\w/]+)"[^\n]*(?:\\\n[^\n]*)*?--cache-control "\$(\w+)"/g)].map((m) => [m[1], m[2]]);
const revalidated = [...new Set(uses.filter(([, v]) => v === 'REVALIDATE').map(([p]) => p))].sort();
check(JSON.stringify(revalidated) === JSON.stringify(['_gz/css', '_gz/js', 'css', 'embed', 'js', 'o', 'press', 'share', 't', 'vendor']), `the folders stored for revalidation are the app's and the pages' (${revalidated})`);
// The growth pages (scripts/seo_pages.py) are synced by a loop over pages-dirs.txt, share/ among them: the same list is invalidated.
check(/"s3:\/\/\$BUCKET\/\$dir" --cache-control "\$REVALIDATE"/.test(code) && /PATHS\+=\("\/\$dir\/\*"\)/.test(code), 'every directory in pages-dirs.txt carries it and is invalidated by the same list');
check(!/--cache-control "no-cache"/.test(code) && (code.match(/--cache-control "\$REVALIDATE"/g) || []).length === 16, 'no upload still says a literal no-cache: all sixteen read $REVALIDATE');
check(/aws s3 cp "\$path" "s3:\/\/\$BUCKET\/\$name" --region "\$REGION" \\\n\s+--cache-control "\$REVALIDATE"/.test(code), 'the root files (index.html, sw.js, the manifest, the sitemap) carry it too');
const paths = (/PATHS=\(([^)]*)\)/.exec(code) || [])[1] || '';
const invalidated = [...paths.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
for (const p of revalidated.filter((x) => !x.startsWith('_gz/') && x !== 'share')) check(invalidated.includes(`/${p}/*`), `/${p}/* is invalidated on every deploy`);
check(/PATHS\+=\("\/_gz\/\*"\)/.test(code), '/_gz/* is invalidated with it');
const rootFiles = [...(/for f in ([\s\S]*?); do/.exec(code) || [, ''])[1].matchAll(/\/([\w.-]+):/g)].map((m) => m[1]);
check(/PATHS\+=\("\/\$KEYFILE"\)/.test(code), 'the IndexNow key file is invalidated by name');
check(rootFiles.length === 8 && rootFiles.every((f) => invalidated.includes(`/${f}`)) && invalidated.includes('/'), `every root file is invalidated by name, and "/" itself (${rootFiles})`);
// vendor/ is the one folder with the long browser lifetime; the maps beside it revalidate.
check(uses.some(([p, v]) => p === 'vendor' && v === 'LONG') && /LONG="public, max-age=2592000"/.test(code) && /DATA="public, max-age=3600"/.test(code), 'vendor/, the textures and the data keep the lifetimes they had');

// --- 3. and 5. never the header without the invalidation -----------------------------------------
const tmp = mkdtempSync(join(tmpdir(), 'sr-edge-'));
mkdirSync(join(tmp, 'bin'));
const log = join(tmp, 'aws.log');
writeFileSync(join(tmp, 'bin/aws'), `#!/bin/sh\necho "$*" >> "${log}"\nexit 0\n`);
chmodSync(join(tmp, 'bin/aws'), 0o755);
writeFileSync(log, '');
const env = { ...process.env, PATH: `${join(tmp, 'bin')}:${process.env.PATH}` };
let r = spawnSync('bash', [join(ROOT, 'scripts/deploy.sh'), '--bucket', 'example-bucket', '--app-only'], { env, encoding: 'utf8' });
check(r.status === 1 && /pass --distribution ID, or --no-edge-cache/.test(r.stderr) && readFileSync(log, 'utf8') === '', `the app is not deployed with s-maxage and no invalidation, and AWS is not asked anything first (${r.status}: ${r.stderr.trim().slice(0, 200)})`);
r = spawnSync('bash', [join(ROOT, 'scripts/deploy.sh'), '--bucket', 'example-bucket'], { env, encoding: 'utf8' });
check(r.status === 1 && readFileSync(log, 'utf8') === '', 'nor is a full deploy');
// An assets-only deploy stores nothing with s-maxage, so it may still run without a distribution.
writeFileSync(log, '');
r = spawnSync('bash', [join(ROOT, 'scripts/deploy.sh'), '--bucket', 'example-bucket', '--assets-only', '--dry-run'], { env, encoding: 'utf8' });
const assets = readFileSync(log, 'utf8');
check(r.status === 0 && assets.includes('s3 sync') && !assets.includes('s-maxage'), `an assets-only deploy stores nothing with s-maxage (${r.stderr.trim().slice(-200)})`);
check(/\[ "\$EDGE_CACHE" = "1" \] \|\| REVALIDATE="no-cache"/.test(code) && /--no-edge-cache\) EDGE_CACHE=0/.test(code), '--no-edge-cache stores the app as plain no-cache, and then no distribution is demanded');
check(/\[ "\$EDGE_CACHE" = "1" \] && \[ "\$WHAT" != "assets" \] && \[ "\$DRY_RUN" != "1" \] && \[ -z "\$DISTRIBUTION" \]/.test(code), 'the refusal is for exactly that case: the app, for real, with the edge cache, and no distribution');

// --- 4. the invalidation is waited for, then checked ----------------------------------------------
const at = (needle) => code.indexOf(needle);
check(at('create-invalidation --distribution-id "$DISTRIBUTION"') > 0 && at('aws cloudfront wait invalidation-completed --distribution-id "$DISTRIBUTION" --id "$INVALIDATION"') > at('create-invalidation --distribution-id "$DISTRIBUTION"'), 'the script waits for its own invalidation');
check(at('edge_check index.html "$SITE/index.html"') > at('wait invalidation-completed') && at('edge_check js/main.js "$APP/js/main.js"') > at('wait invalidation-completed'), 'and then asks the edge for the page and the entry module');
check(/\[ "\$want" = "\$got" \] \|\| die "the edge answers \$path with ETag/.test(code), 'a different ETag at the edge fails the deploy');
check(/sed -e 's\/\^W\\\/\/\/' -e 's\/"\/\/g'/.test(code), "a weak ETag (CloudFront compressed the body) is compared by its hash");
// The ETag the script expects is the MD5 of the file it uploaded: what S3 reports for a single-part upload.
check(/hashlib\.md5\(open\(sys\.argv\[1\],"rb"\)\.read\(\)\)\.hexdigest\(\)/.test(code), 'the expected ETag is the MD5 of the uploaded file');

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`\nedge cache: ${failed} check(s) FAILED`); process.exit(1); }
console.log(`edge cache ok: "${value}" is zero seconds and must-revalidate to a browser and a year to the edge; ${revalidated.length} folders and ${rootFiles.length} root files carry it and every one is invalidated; no app deploy without the invalidation, which is waited for and checked by ETag`);
