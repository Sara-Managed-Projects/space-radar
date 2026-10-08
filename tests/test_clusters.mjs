// The Pleiades as a cluster of its catalogued stars (public #271): scene/clusters.js.
// Run: node tests/test_clusters.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { CLUSTERS, eclDirection, clusterMembers, drawnPositions, depthOf } = await import(join(ROOT, 'site/js/scene/clusters.js'));
const { parseStars3d } = await import(join(ROOT, 'site/js/scene/stars3d.js'));
const { parseDso } = await import(join(ROOT, 'site/js/data/parsers.js'));

const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8'));
const bin = readFileSync(join(ROOT, 'site/data/stars3d.bin'));
const data = parseStars3d(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const dist = (a, i) => Math.hypot(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]);

// 1. The rows are the deep-sky file's rows, and the direction is the one that file was built with.
for (const c of CLUSTERS) {
  const row = dso.objects.find((o) => o.id === c.id);
  check(row && row.raDeg === c.raDeg && row.decDeg === c.decDeg && row.distLy === c.distLy, `${c.id}: the centre and distance are site/data/dso.json's`);
  if (!row) continue;
  const d = eclDirection(c.raDeg, c.decDeg);
  const r = Math.hypot(...row.posLy);
  const cos = (d[0] * row.posLy[0] + d[1] * row.posLy[1] + d[2] * row.posLy[2]) / r;
  check(cos > 0.999999, `${c.id}: eclDirection() points at the file's own position (cos ${cos})`);
}

// 2. Membership, measured on the shipped catalogue.
const m45 = CLUSTERS.find((c) => c.id === 'm45');
const hyades = CLUSTERS.find((c) => c.id === 'hyades');
const pleiads = clusterMembers(data.posLy, data.count, m45);
const hyads = clusterMembers(data.posLy, data.count, hyades);
check(pleiads.length >= 30 && pleiads.length <= 60, `the Pleiades' cone holds 30 to 60 catalogue stars (${pleiads.length})`);
check(hyads.length >= 80 && hyads.length <= 160, `the Hyades' cone holds 80 to 160 catalogue stars (${hyads.length})`);
const depths = pleiads.map((i) => dist(data.posLy, i));
const spread = Math.max(...depths) - Math.min(...depths);
check(spread > 150, `the catalogue's distances to the Pleiades' stars run over ${Math.round(spread)} light-years: the streak this file exists for`);
check(pleiads.filter((i) => data.appMag[i] < 4.5).length >= 6, 'the six or seven naked-eye sisters are among them');

// 3. What is drawn: direction kept, distance the cluster's, within its depth; nothing else moves.
const { drawLy, moved } = drawnPositions(data.posLy, data.count);
// Two more the eye knows (public #424): the Beehive and the Southern Pleiades.
const m44 = CLUSTERS.find((c) => c.id === 'm44');
const ic2602 = CLUSTERS.find((c) => c.id === 'ic-2602');
const bees = clusterMembers(data.posLy, data.count, m44);
const south = clusterMembers(data.posLy, data.count, ic2602);
check(bees.length >= 15 && bees.length <= 40, `the Beehive's cone holds 15 to 40 catalogue stars (${bees.length})`);
check(south.length >= 15 && south.length <= 40, `the Southern Pleiades' cone holds 15 to 40 catalogue stars (${south.length})`);
for (const [c, list] of [[m44, bees], [ic2602, south]]) {
  const ds = list.map((i) => dist(data.posLy, i));
  check(Math.max(...ds) - Math.min(...ds) > 10 * c.depthLy, `${c.id}: the catalogue strings its stars over ${Math.round(Math.max(...ds) - Math.min(...ds))} light-years, many times its depth`);
  const row = dso.objects.find((o) => o.id === c.id);
  const half = 0.5 * (row.majAxArcmin / 60) * (Math.PI / 180) * row.distLy;
  check(Math.abs(half - c.depthLy) <= 1, `${c.id}: depthLy ${c.depthLy} is half its width on the sky at its distance (${half.toFixed(1)} light-years)`);
  check(list.every((i) => moved.get(i) === c.id), `${c.id}: its members are gathered`);
  let worst = 0;
  for (const i of list) worst = Math.max(worst, Math.abs(dist(drawLy, i) - c.distLy));
  check(worst <= c.depthLy + 0.01, `${c.id}: drawn within ${c.depthLy} light-years of its distance (${worst.toFixed(2)})`);
  const card = parseDso(dso).find((r) => r.id === `dso-${c.id}`);
  check(card && typeof card.meta.departure === 'string' && card.meta.departure.includes('not measured'), `${c.id}: the card says how its stars are drawn`);
}
check(moved.size === pleiads.length + bees.length + south.length && pleiads.every((i) => moved.get(i) === 'm45'), 'exactly the three gathered clusters\' members are regrouped');
check(hyads.every((i) => !moved.has(i)), 'the Hyades\' stars stay where the catalogue puts them');
let worstDir = 0, worstDepth = 0, others = 0;
for (let i = 0; i < data.count; i++) {
  if (!moved.has(i)) { if (drawLy[i * 3] !== data.posLy[i * 3] || drawLy[i * 3 + 2] !== data.posLy[i * 3 + 2]) others++; continue; }
  const a = dist(data.posLy, i), b = dist(drawLy, i);
  const cos = (data.posLy[i * 3] * drawLy[i * 3] + data.posLy[i * 3 + 1] * drawLy[i * 3 + 1] + data.posLy[i * 3 + 2] * drawLy[i * 3 + 2]) / (a * b);
  worstDir = Math.max(worstDir, 1 - cos);
  if (moved.get(i) === 'm45') worstDepth = Math.max(worstDepth, Math.abs(b - m45.distLy));
}
check(others === 0, `no other star is moved (${others})`);
check(worstDir < 1e-6, `a member keeps its measured direction (1 - cos ${worstDir})`);
check(worstDepth <= m45.depthLy + 0.01, `a member is drawn within ${m45.depthLy} light-years of the cluster's distance (${worstDepth.toFixed(2)})`);
check(depthOf(7) === depthOf(7) && Math.abs(depthOf(7)) <= 1, 'the drawn depth is a fixed number per star');
check(data.posLy !== drawLy && dist(data.posLy, pleiads[0]) !== dist(drawLy, pleiads[0]), 'the catalogue\'s own positions are left as they were');

// 4. The card says so.
const rec = parseDso(dso).find((r) => r.id === 'dso-m45');
check(rec && typeof rec.meta.departure === 'string' && rec.meta.departure.includes('gathered') && rec.meta.departure.includes('not measured'), 'the Pleiades\' record carries the sentence that says how its stars are drawn');

if (problems.length) { console.error(`clusters: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log(`clusters ok: ${pleiads.length} Pleiades stars gathered from a ${Math.round(spread)} light-year streak, ${bees.length} Beehive and ${south.length} Southern Pleiades stars gathered, ${hyads.length} Hyades stars left in place`);
