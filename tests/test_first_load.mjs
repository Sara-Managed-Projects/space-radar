// tests/test_first_load.mjs -- the first load keeps phones in front (forge #170).
//
//   node tests/test_first_load.mjs
//
// Holds scripts/first-load.mjs's pure half, and registry/first-load.yaml against registry/budgets.yaml:
//   - every budget row of a first load stays under the smallest first load the competitor review found, so a phone's
//     first load can never be allowed to grow into one of theirs;
//   - every local measure is inside its rows, and the rows are at most 10 % above the newest measure (the issue's line);
//   - the scene is WebGL and nothing in the app asks for WebGPU (CosmosMap's is the reach we do not give up);
//   - docs/FIRST_LOAD.md and the /about/ line quote the yaml's numbers, and say nothing of a competitor the yaml does not.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(join(ROOT, 'scripts/first-load.mjs'));
const { BUDGETS } = await import(join(ROOT, 'site/js/data/budgets.js'));

// --- the pure half
const rows = [
  { url: 'https://www.spaceradar.ai/', bytes: 1000 },
  { url: 'https://www.spaceradar.ai/js/main.js', bytes: 500 },
  { url: 'https://services.swpc.noaa.gov/x.json', bytes: 20 },
  { url: 'data:image/png;base64,AAAA', bytes: 99 },
  { url: 'https://www.spaceradar.ai/late.json', bytes: 7000, after: true },
  { url: 'not a url', bytes: 5 },
];
assert.deepEqual(F.summarise(rows, 'https://www.spaceradar.ai'), {
  bytes: 1520, requests: 3, ours: 1500, oursRequests: 2, thirdParty: 20, hosts: { 'www.spaceradar.ai': 1500, 'services.swpc.noaa.gov': 20 },
}, 'as tests/test_first_visit_bytes.mjs counts: no data: URL, nothing after the first visit');
assert.equal(F.firstFrameOf({ firstFrame: 1234, firstFrameLate: false }), 1234);
assert.equal(F.firstFrameOf({ firstFrame: 555, firstFrameLate: true }), null, 'a probe that began after the frame has only a bound');
assert.equal(F.firstFrameOf(null), null);
assert.deepEqual(F.overBudget({ bytes: 10, requests: 3, firstFrameMs: 50 }, { first_visit_bytes: 10, first_visit_requests: 2, phone_first_frame_ms: 100 }), ['first_visit_requests: 3 > 2']);
assert.deepEqual(F.overBudget({ requests: 1 }, { first_visit_requests: 2 }), []);
assert.equal(F.tenPercentOver(151), 167);
assert.equal(F.tenPercentOver(14418, 100), 15900);

// --- the registry, read as the flat YAML it is (one `- {...}` row a line, JSON-like values)
const yaml = readFileSync(join(ROOT, 'registry/first-load.yaml'), 'utf8');
const section = (name) => {
  const body = yaml.split(new RegExp(`^${name}:\\s*$`, 'm'))[1] || '';
  return body.split(/^\S/m)[0].split('\n').filter((l) => /^\s+- \{/.test(l)).map((l) => {
    const o = {};
    for (const m of l.matchAll(/(\w+): ("(?:[^"\\]|\\.)*"|[^,}]+)/g)) {
      const v = m[2].trim();
      o[m[1]] = v.startsWith('"') ? JSON.parse(v) : v === 'null' ? null : v === 'true' ? true : v === 'false' ? false : Number.isFinite(Number(v)) ? Number(v) : v;
    }
    return o;
  });
};
const measured = section('measurements');
const others = section('others');
assert.ok(measured.length >= 3, 'the base, the branch and the live site');
assert.deepEqual(others.map((o) => o.id).sort(), ['cosmoscope', 'cosmosmap', 'solar-system-scope', 'spaceengine'], 'the four of the review, no more');
for (const o of others) assert.match(o.source, /forge #170/, `${o.id}: the figure is the issue's, not ours`);

// --- phones in front: no first-load row may let us grow into the smallest first load the review found
const theirs = others.filter((o) => Number.isFinite(o.bytes) && /^a first load/.test(o.comparable)).map((o) => o.bytes);
assert.ok(theirs.length >= 2, 'Cosmoscope and Solar System Scope are first loads like ours');
const smallest = Math.min(...theirs);
for (const id of ['first_visit_bytes', 'embed_first_visit_bytes']) {
  assert.ok(BUDGETS[id] > 0 && BUDGETS[id] * 4 < smallest, `${id} (${BUDGETS[id]} B) stays under a quarter of the smallest rival first load (${smallest} B)`);
}
assert.ok(BUDGETS.first_visit_bytes + BUDGETS.after_first_visit_bytes < smallest / 4, 'the first minute too');

// --- the measures and the rows
const local = measured.filter((m) => m.compressed === false);
const newest = local[local.length - 1];
for (const m of local) {
  assert.ok(m.ours <= BUDGETS.first_visit_bytes, `${m.id}: our own ${m.ours} B inside first_visit_bytes`);
  assert.ok(m.requests <= BUDGETS.first_visit_requests, `${m.id}: ${m.requests} requests inside first_visit_requests`);
  assert.ok(m.first_frame_ms <= BUDGETS.phone_first_frame_ms, `${m.id}: first frame ${m.first_frame_ms} ms inside phone_first_frame_ms`);
  assert.equal(m.webgl, 2, `${m.id}: the scene got WebGL 2`);
}
assert.ok(BUDGETS.first_visit_requests <= F.tenPercentOver(newest.requests), 'first_visit_requests is at most 10 % above the newest measure');
assert.ok(BUDGETS.phone_first_frame_ms <= F.tenPercentOver(newest.first_frame_ms, 100), 'phone_first_frame_ms is at most 10 % above the newest measure');
const live = measured.find((m) => m.id === 'live');
assert.ok(live && live.compressed === true && live.bytes < smallest / 10, 'the live first load is under a tenth of the smallest rival first load');

// --- WebGL, never WebGPU
const files = [];
const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith('.js')) files.push(p); } };
walk(join(ROOT, 'site/js'));
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  assert.ok(!/navigator\s*\.\s*gpu\b|WebGPURenderer/.test(src), `${f.slice(ROOT.length + 1)} asks for WebGPU: a WebGPU path may be added only beside WebGL, with this test changed to say so`);
}
assert.match(readFileSync(join(ROOT, 'site/js/scene/renderer.js'), 'utf8'), /new THREE\.WebGLRenderer\(|WebGLRenderer\(/, 'the scene is drawn with WebGL (scene/renderer.js)');

// --- what is said in public
const doc = readFileSync(join(ROOT, 'docs/FIRST_LOAD.md'), 'utf8');
const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
for (const m of measured) {
  assert.ok(doc.includes(`${group(m.bytes)} B`), `docs/FIRST_LOAD.md quotes ${m.id}'s ${m.bytes} B`);
  assert.ok(doc.includes(`| ${m.requests} |`), `docs/FIRST_LOAD.md quotes ${m.id}'s ${m.requests} requests`);
}
for (const o of others) assert.ok(doc.includes(o.name), `docs/FIRST_LOAD.md names ${o.name}`);
assert.match(doc, /we do not claim otherwise/, 'where we do not lead (requests), the page says so');
const about = readFileSync(join(ROOT, 'scripts/seo_pages.py'), 'utf8');
assert.match(about, /Built for phones first:<\/strong> on an emulated mid-range phone over slow 4G, the map draws its first frame in about (\d+) seconds/, 'the /about/ line forge #170 asks for, as measured: emulation, not a real old phone');
assert.ok(about.includes(`first frame in about ${Math.round(live.first_frame_ms / 1000)} seconds`), 'the /about/ seconds are the live measure');
assert.match(about, /docs\/FIRST_LOAD\.md">how it is measured/, 'and where it is measured');
assert.ok(about.includes(`first load of ${(live.bytes / 1e6).toFixed(1)} MB (measured on 7 November 2026)`), 'the /about/ number is the live measure');
const aboutBlock = about.slice(about.indexOf('# b200-f4-cards: begin (forge #170'), about.indexOf('# b200-f4-cards: end', about.indexOf('# b200-f4-cards: begin (forge #170')));
for (const o of others) assert.ok(!aboutBlock.includes(o.name), `the /about/ line names no competitor (${o.name})`);

// --- the tools
const cdp = readFileSync(join(ROOT, 'tools/cdp.mjs'), 'utf8');
assert.match(cdp, /slow4g/, 'tools/cdp.mjs has the Slow 4G profile');
assert.match(cdp, /Emulation\.setCPUThrottlingRate/, 'and the slower CPU');
assert.match(readFileSync(join(ROOT, '.github/workflows/screens.yml'), 'utf8'), /node scripts\/first-load\.mjs --ci=\.ci-screens\/first-visit\.json/, 'CI holds the request count');

console.log('test_first_load: ok');
