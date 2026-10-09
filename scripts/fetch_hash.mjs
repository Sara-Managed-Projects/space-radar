#!/usr/bin/env node
// What a host really sends for a list of paths: the SHA-256 of each body AFTER decoding, and the
// encoding it travelled in. For scripts/verify-deploy.sh.
//
//   printf 'js/main.js\nindex.html\n' | node scripts/fetch_hash.mjs --base=https://www.spaceradar.ai
//   ... --accept=identity        the Accept-Encoding to send (default: br, gzip)
//
// One line per path, tab separated: <sha256 or ERROR> <content-encoding or -> <status> <path>.
//
// WHY NODE AND NOT CURL (2026-10-09, internal #514). The code and the data are stored at Brotli 11,
// and the curl that ships with macOS cannot decode Brotli: `curl --compressed` would compare the
// compressed bytes with the file and call every one different. node's fetch decodes br and gzip.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=')]; }));
const base = (opt.base || '').replace(/\/+$/, '');
if (!base) { console.error('fetch_hash: --base=URL is required'); process.exit(2); }
const accept = opt.accept || 'br, gzip';
const paths = readFileSync(0, 'utf8').split('\n').filter(Boolean);

async function one(path) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${base}/${path.split('/').map(encodeURIComponent).join('/')}`, { headers: { 'accept-encoding': accept }, redirect: 'follow', signal: AbortSignal.timeout(120000) });
      const body = Buffer.from(await res.arrayBuffer());
      return [createHash('sha256').update(body).digest('hex'), res.headers.get('content-encoding') || '-', res.status, path];
    } catch (e) {
      if (attempt >= 2) return ['ERROR', '-', 0, path];
    }
  }
}

const out = new Array(paths.length);
let next = 0;
await Promise.all(Array.from({ length: Number(opt.parallel) || 6 }, async () => {
  while (next < paths.length) { const i = next++; out[i] = await one(paths[i]); }
}));
for (const row of out) console.log(row.join('\t'));
