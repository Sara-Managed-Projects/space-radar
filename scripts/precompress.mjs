#!/usr/bin/env node
// Compress what a deploy uploads, once, at the best ratio: Brotli 11, and gzip 9 beside it.
//
//   node scripts/precompress.mjs --from "$APP" --dirs css,js,vendor --strict --out "$BUILT/br" --gzip "$BUILT/gz"
//   node scripts/precompress.mjs --from site --dirs data --out "$BUILT/br" --gzip "$BUILT/gz"
//   node scripts/precompress.mjs --from site --dirs js,css,vendor,data --report      # sizes only, writes nothing
//
// WHY (internal #514, 2026-10-09). CloudFront compresses on the fly at about Brotli 5, sends some
// files to a Brotli-capable browser as gzip (both halves of three.js among them, MEASURED on the
// live site on 2026-10-08) and does not compress `application/octet-stream` at all, so `stars.bin`
// went out whole. An object stored already compressed, with `Content-Encoding: br`, is sent as it is
// stored. Brotli 11 is slow (seconds per megabyte), which is why it belongs in the deploy and not at
// the edge, and why the results are kept in a cache keyed by the SHA-256 of the file: a deploy
// compresses only what changed since the last one.
//
// WHAT IS COMPRESSED is one rule, `precompressed(path)` below, and three other places follow it:
// scripts/deploy.sh (which syncs these with `--content-encoding`), scripts/verify-deploy.sh (which
// expects `content-encoding: br` on exactly these) and scripts/edge/encoding-fallback.js (which
// sends a client without Brotli to the gzip copy). tests/test_precompress.mjs holds the four together.
//
// WHAT IS NOT: HTML, robots.txt, the sitemap, the manifest and sw.js stay as written and are
// compressed by CloudFront per request, because a crawler or a link unfurler may not accept Brotli
// and those are the files it reads. Pictures, fonts and sound are compressed formats already.
// /data/v1/ is the harvester's.
//
// THE MODELS ARE (MEASURED 2026-10-09: the 70 .glb files are 8 832 216 B and went out whole, because
// CloudFront does not compress `model/gltf-binary`; Brotli 11 makes them 5 322 504 B, 40 % less).
//
// Local development is untouched: nothing here writes under site/, and tools/serve.py serves the
// source as written.
//
// No dependencies: node's own zlib.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, utimesSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

// The code: every file under these three folders with one of these endings.
export const APP_DIRS = ['js', 'css', 'vendor'];
export const APP_EXT = ['js', 'css', 'wasm'];
// The bundled data: the star catalogues are binary and were sent uncompressed.
export const DATA_EXT = ['bin', 'json', 'csv', 'txt'];
// Beside the code and never uploaded as code: the module contract, and source maps (sent on their own).
const APP_BESIDE = ['md', 'map'];

const ext = (p) => (p.includes('.') ? p.slice(p.lastIndexOf('.') + 1).toLowerCase() : '');

/** Is this path (relative to the site root, forward slashes) stored compressed by a deploy? */
export function precompressed(path) {
  const p = path.replace(/^\/+/, '');
  const top = p.split('/')[0];
  if (APP_DIRS.includes(top)) return APP_EXT.includes(ext(p));
  if (top === 'data') return !p.startsWith('data/v1/') && DATA_EXT.includes(ext(p));
  if (top === 'models') return ext(p) === 'glb';
  return false;
}

const TEXT = new Set(['js', 'css', 'json', 'csv', 'txt']);
const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

export async function compress(bytes, kind, quality = 11) {
  if (kind === 'gz') return gzip(bytes, { level: 9 });
  return brotli(bytes, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: quality,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: bytes.length,
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_GENERIC,
    },
  });
}

export function decode(bytes, encoding) {
  if (encoding === 'br') return zlib.brotliDecompressSync(bytes);
  if (encoding === 'gzip' || encoding === 'gz') return zlib.gunzipSync(bytes);
  return bytes;
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (name === '.DS_Store') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (s.isFile()) out.push(p);
  }
  return out;
}

function args(argv) {
  const a = { dirs: [], quality: 11, cache: join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'space-radar', 'precompress') };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => { if (i + 1 >= argv.length) throw new Error(`${k} needs a value`); return argv[++i]; };
    if (k === '--from') a.from = next();
    else if (k === '--out') a.out = next();
    else if (k === '--gzip') a.gzip = next();
    else if (k === '--dirs') a.dirs = next().split(',').filter(Boolean);
    else if (k === '--quality') a.quality = Number(next());
    else if (k === '--cache') a.cache = next();
    else if (k === '--no-cache') a.cache = null;
    else if (k === '--strict') a.strict = true;
    else if (k === '--report') a.report = true;
    else if (k === '--quiet') a.quiet = true;
    else throw new Error(`unknown option ${k}`);
  }
  if (!a.from || !a.dirs.length || (!a.out && !a.report)) throw new Error('usage: precompress.mjs --from DIR --dirs a,b --out DIR [--gzip DIR] [--strict] [--no-cache] | --report');
  return a;
}

async function cached(cache, hash, kind, quality, make) {
  if (!cache) return make();
  const file = join(cache, `${hash}.${kind === 'gz' ? 'gz9' : `br${quality}`}`);
  if (existsSync(file)) return readFileSync(file);
  const bytes = await make();
  mkdirSync(cache, { recursive: true });
  // Written under another name and moved: two deploys at once never read half a file.
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, bytes);
  renameSync(tmp, file);
  return bytes;
}

export async function run(a) {
  const todo = [];
  for (const d of a.dirs) {
    const root = join(a.from, d);
    if (!existsSync(root)) throw new Error(`${root} is missing`);
    for (const file of walk(root)) {
      const rel = relative(a.from, file).split(sep).join('/');
      if (precompressed(rel)) { todo.push([file, rel]); continue; }
      // --strict is for the code folders, which are uploaded from the compressed copy ONLY: a file
      // this rule does not know would be missing from the bucket, so it stops the deploy instead.
      if (a.strict && !APP_BESIDE.includes(ext(rel))) throw new Error(`${rel}: not a type precompress.mjs knows; add it to APP_EXT or it is never uploaded`);
    }
  }
  const sum = { files: 0, raw: 0, br: 0, gz: 0 };
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const [file, rel] = todo[next++];
      const bytes = readFileSync(file);
      const hash = createHash('sha256').update(bytes).digest('hex');
      const stat = statSync(file);
      for (const [kind, dir] of [['br', a.out || (a.report ? '' : null)], ['gz', a.gzip || (a.report ? '' : null)]]) {
        if (dir === null || dir === undefined) continue;
        const packed = await cached(a.cache, hash, kind, a.quality, () => compress(bytes, kind, a.quality));
        // The whole point is that a browser decodes this to the file: check it does, every time.
        if (!decode(packed, kind).equals(bytes)) throw new Error(`${rel}: the ${kind} copy does not decode to the file`);
        sum[kind] += packed.length;
        if (dir) {
          const target = join(dir, rel);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, packed);
          // The source's own time, so `aws s3 sync` (size and time) uploads what changed and not all of it.
          // EXCEPT A COPY AS BIG AS THE FILE. `aws s3 sync` skips an object of the same size unless
          // the source is newer, and it cannot see `Content-Encoding`: a small incompressible file
          // whose Brotli copy is the same number of bytes (18 of the star tiles,
          // data/startiles/n8/*.bin, internal #514) kept its old time, matched the raw object the
          // bucket already held, and stayed stored without `Content-Encoding: br`. Such a copy
          // keeps the time it was written (now), so the sync sends it; it is a few kilobytes.
          if (packed.length !== bytes.length) utimesSync(target, stat.atime, stat.mtime);
        }
      }
      sum.files++;
      sum.raw += bytes.length;
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return sum;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const a = args(process.argv.slice(2));
    const sum = await run(a);
    if (!a.quiet) {
      const pct = (n) => (sum.raw ? `${Math.round((100 * n) / sum.raw)} %` : '-');
      console.log(`precompress: ${sum.files} files in ${a.dirs.join(', ')}: ${sum.raw} B -> Brotli ${a.quality} ${sum.br} B (${pct(sum.br)})`
        + (a.gzip || a.report ? `, gzip 9 ${sum.gz} B (${pct(sum.gz)})` : ''));
    }
  } catch (e) {
    console.error(`precompress: ${e.message}`);
    process.exit(1);
  }
}
