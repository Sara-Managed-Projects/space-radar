#!/usr/bin/env node
// scripts/first-load.mjs -- the first load as a phone sees it: bytes, requests and the time to the first frame (forge #170).
//
//   node scripts/first-load.mjs --bytes=bytes.json --probe=probe.json [--origin=http://127.0.0.1:8466] [--gate]
//        a boot recorded by tools/cdp.mjs (--bytes) running tests/probes/first-load.js, through render.sh: prints the
//        three numbers, and with --gate holds them to registry/budgets.yaml (exit 1 when over)
//   node scripts/first-load.mjs --ci=.ci-screens/first-visit.json
//        CI (screens.yml): the request count of the boot tests/test_first_visit_bytes.mjs measured, held to its row
//   node scripts/first-load.mjs --help
//
// THE METHOD is docs/FIRST_LOAD.md's, and registry/first-load.yaml keeps every measurement it was used for. A phone,
// properly (390 x 844, device pixel ratio 3, touch, an Android user agent: cdp.mjs --mobile), on Lighthouse's mobile
// profile (Slow 4G and the CPU four times slower: --net=slow4g --cpu=4), CelesTrak and Launch Library refused as every
// first-visit measure here refuses them (a boot is not to spend their rate limits). Counted as tests/test_first_visit_bytes.mjs
// counts: every request that started before the app's end-of-first-visit mark, its bytes as they crossed the wire.
//
// THE ROWS (registry/budgets.yaml): first_visit_bytes (already CI's), first_visit_requests, phone_first_frame_ms. The two new
// rows were set 10 % above what was measured on 2026-11-07, which is the issue's own line: a first load that grows more
// than 10 % fails. A time measured in emulation on one laptop is not a phone's time, and a CI runner draws in software,
// so phone_first_frame_ms is held only with --gate, on a machine like the one that set it, never in CI.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HELP = `usage: node scripts/first-load.mjs --bytes=bytes.json --probe=probe.json [--origin=URL] [--gate]
       node scripts/first-load.mjs --ci=first-visit.json
The first load's bytes, requests and time to the first frame (forge #170; method in docs/FIRST_LOAD.md).`;

/** Sum a boot's rows as tests/test_first_visit_bytes.mjs does: http(s) only, nothing that started after the first visit. */
export function summarise(rows, origin = '') {
  const out = { bytes: 0, requests: 0, ours: 0, oursRequests: 0, thirdParty: 0, hosts: {} };
  for (const r of rows || []) {
    let u;
    try { u = new URL(r.url); } catch { continue; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
    if (r.after) continue;
    const b = Number(r.bytes) || 0;
    out.bytes += b;
    out.requests += 1;
    out.hosts[u.host] = (out.hosts[u.host] || 0) + b;
    if (!origin || u.origin === origin) { out.ours += b; out.oursRequests += 1; } else out.thirdParty += b;
  }
  return out;
}

/** The time to the first frame a probe can stand behind, or null (the probe began after the frame: only a bound). */
export function firstFrameOf(probe) {
  if (!probe || probe.firstFrameLate || !Number.isFinite(probe.firstFrame)) return null;
  return probe.firstFrame;
}

/** The rows a first load is held to, and what is over: [] when all are inside. */
export function overBudget({ bytes, requests, firstFrameMs }, budgets) {
  const out = [];
  const row = (id, v) => { if (Number.isFinite(v) && Number.isFinite(budgets[id]) && v > budgets[id]) out.push(`${id}: ${v} > ${budgets[id]}`); };
  row('first_visit_bytes', bytes);
  row('first_visit_requests', requests);
  row('phone_first_frame_ms', firstFrameMs);
  return out;
}

/** A row set 10 % above a measure, rounded up to a round number: the issue's "fails if the first load grows more than 10 %". */
export function tenPercentOver(measured, step = 1) {
  return Math.ceil((measured * 1.1) / step) * step;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h') || !argv.length) { console.log(HELP); process.exit(argv.length ? 0 : 2); }
  const arg = (n) => { const h = argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : ''; };
  const { BUDGETS } = await import(join(ROOT, 'site/js/data/budgets.js'));
  if (arg('ci')) {
    const t = JSON.parse(readFileSync(arg('ci'), 'utf8'));
    const over = overBudget({ requests: t.count }, BUDGETS);
    console.log(`first load (CI): ${t.count} requests, budget ${BUDGETS.first_visit_requests}`);
    if (over.length) { console.error(`over: ${over.join('; ')}`); process.exit(1); }
    return;
  }
  const rows = JSON.parse(readFileSync(arg('bytes'), 'utf8'));
  const probe = arg('probe') ? JSON.parse(readFileSync(arg('probe'), 'utf8')) : null;
  const s = summarise(Array.isArray(rows) ? rows : rows.requests, arg('origin'));
  const firstFrameMs = firstFrameOf(probe);
  const result = { bytes: s.bytes, requests: s.requests, ours: s.ours, thirdParty: s.thirdParty, firstFrameMs, firstContentfulPaintMs: probe ? probe.firstContentfulPaint : null, layersReadyMs: probe ? probe.layersReady : null, webgl: probe ? probe.webgl : null };
  console.log(JSON.stringify(result, null, 1));
  if (probe && firstFrameMs === null) console.error('the probe began after the first frame: its time is only an upper bound and is not used');
  if (argv.includes('--gate')) {
    const over = overBudget(result, BUDGETS);
    if (over.length) { console.error(`over: ${over.join('; ')}`); process.exit(1); }
    console.error('inside every row');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
