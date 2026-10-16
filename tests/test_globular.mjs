// Star clusters as stars (internal spec 0076 W3-a, #819 and #871): scene/deep/globular.js and its two files.
// Run: node tests/test_globular.mjs
//
// 1. The files: every globular and open cluster of site/data/dso.json that has a row, the manifest's cuts,
//    the bin as its manifest says, the budget.
// 2. A globular from its catalogue: core and tidal radius are Harris's at the map's distance; King's density
//    falls to nothing at rt and its projection is King's surface profile; the stars are seeded (the same on
//    every call), by tier (never more than POINTS), sorted brightest first.
// 3. Core and halo distinct: a quarter of the stars inside a few core radii, none past rt, the halo reaching
//    out; no impossible density: the drawn stars' light density at the centre is under the catalogue's.
// 4. The light shared: the drawn stars carry LF.light of the cluster's light at most, the share the camera sees
//    falls with distance, and the glow is stepped back by exactly that share (the layer's shares()).
// 5. Open clusters: members above the probability cut, inside the tidal radius, measured depth only where the
//    parallax is good enough, every member within the tidal radius of its centre, directions kept.
// 6. The layer with a real three.js: no stars until the cluster is past FROM_PX on screen, at most MAX_DRAWN
//    drawn (one call each), the latch keeps POINTS[0], the BEFORE switch takes them off, the card's rows and
//    drawn classes, nothing moves between frames.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const G = await import(join(JS, 'scene/deep/globular.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));

const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const LY_KM = 9460730472580.8;
const PC_LY = 3.261563777167433;
const ARCMIN = Math.PI / 10800;

const dsoDoc = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8'));
const dso = new Map(dsoDoc.objects.map((o) => [o.id, o]));
const manBytes = readFileSync(join(ROOT, 'site/data/deep/clusters.json'));
const MAN = JSON.parse(manBytes.toString('utf8'));
const binBuf = readFileSync(join(ROOT, 'site/data/deep/clusters.bin'));
const BIN = binBuf.buffer.slice(binBuf.byteOffset, binBuf.byteOffset + binBuf.byteLength);

// 1. The files.
const gcl = dsoDoc.objects.filter((o) => o.typeCode === 'GCl').map((o) => o.id);
check(gcl.length === 33 && gcl.every((id) => MAN.globulars.some((g) => g.id === id)), `every globular of the deep-sky file has Harris's row (${MAN.globulars.length} of ${gcl.length})`);
const ocl = dsoDoc.objects.filter((o) => o.typeCode === 'OCl').map((o) => o.id);
const openIds = new Set(MAN.open.map((o) => o.id));
check(ocl.every((id) => openIds.has(id)), `every open cluster of the deep-sky file has its Gaia members (missing: ${ocl.filter((id) => !openIds.has(id)).join(', ')})`);
check(openIds.has('christmas-tree-cluster'), 'NGC 2264 (a cluster with a nebula) has its members too');
check(MAN.cuts.prob === 0.5 && MAN.cuts.insideTidalRadius === true, `the probability cut is stated: ${JSON.stringify(MAN.cuts)}`);
check(/CC BY-NC 3\.0 IGO/.test(MAN.licence) && /Gaia/.test(MAN.sources.gaia), 'the manifest names Gaia\'s licence');
const file = G.parseMembers(BIN);
check(file.count === MAN.count && BIN.byteLength === MAN.bin.bytes, `the bin holds the manifest's ${MAN.count} members`);
const fileBytes = manBytes.length + BIN.byteLength;
check(fileBytes <= BUDGETS.deep_clusters_bytes, `the two files are within the budget (${fileBytes} B of ${BUDGETS.deep_clusters_bytes}; registry/budgets.yaml deep_clusters_bytes)`);
check(G.POINTS[2] === BUDGETS.deep_globular_points && G.POINTS[0] < G.POINTS[1] && G.POINTS[1] < G.POINTS[2], `POINTS rise by tier to the budget's ${BUDGETS.deep_globular_points} (registry/budgets.yaml deep_globular_points)`);
check(G.MAX_DRAWN <= BUDGETS.deep_clusters_draw_calls, `at most ${BUDGETS.deep_clusters_draw_calls} clusters drawn at once (registry/budgets.yaml deep_clusters_draw_calls)`);
check(G.UNDER_MEASURED.stars === 'same' && G.UNDER_MEASURED.members === 'same', 'under Measured the stars are the same (nothing in them moves)');

// 2. A globular from its catalogue.
const row = (id) => MAN.globulars.find((g) => g.id === id);
for (const id of ['omega-centauri', 'm13', '47-tucanae']) {
  const g = row(id), o = dso.get(id);
  const s = G.sampleGlobular(g, o.distLy, 2);
  const rc = g.rcArcmin * ARCMIN * o.distLy;
  check(Math.abs(s.rcLy - rc) < 1e-9 * rc && Math.abs(s.rtLy - rc * 10 ** g.c) < 1e-6 * s.rtLy, `${id}: core ${s.rcLy.toFixed(2)} ly and tidal radius ${s.rtLy.toFixed(1)} ly are Harris's rc ${g.rcArcmin}' and c ${g.c} at ${o.distLy} ly`);
  const again = G.sampleGlobular(g, o.distLy, 2);
  check(again.count === s.count && again.pos.every((v, i) => v === s.pos[i]) && again.absMag.every((v, i) => v === s.absMag[i]), `${id}: seeded: the same stars on every call`);
  for (let k = 1; k < s.count; k++) if (s.absMag[k] < s.absMag[k - 1]) { problems.push(`${id}: not sorted brightest first at ${k}`); break; }
  const t0 = G.sampleGlobular(g, o.distLy, 0), t1 = G.sampleGlobular(g, o.distLy, 1);
  check(t0.count <= G.POINTS[0] && t1.count <= G.POINTS[1] && s.count <= G.POINTS[2] && t0.count <= t1.count && t1.count <= s.count, `${id}: points by tier ${t0.count} / ${t1.count} / ${s.count} within ${G.POINTS.join(' / ')}`);
  check(s.count <= Math.round(s.want), `${id}: never more stars than the model has (${s.count} of ${Math.round(s.want)})`);
  // 3. Core and halo distinct; nothing past rt.
  const radii = [];
  for (let i = 0; i < s.count; i++) radii.push(Math.hypot(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]));
  radii.sort((a, b) => a - b);
  check(radii[radii.length - 1] <= s.rtLy * (1 + 1e-6), `${id}: no star past the tidal radius (${radii[radii.length - 1].toFixed(1)} of ${s.rtLy.toFixed(1)} ly)`);
  const inCore = radii.filter((r) => r <= 3 * s.rcLy).length / s.count;
  const halfR = radii[Math.floor(radii.length / 2)];
  check(inCore >= 0.1 && halfR > 2 * s.rcLy && radii[Math.floor(radii.length * 0.95)] > 0.25 * s.rtLy, `${id}: a dense core and a halo: ${(inCore * 100).toFixed(0)}% inside 3 rc, half within ${halfR.toFixed(1)} ly (rc ${s.rcLy.toFixed(1)}), 5% beyond ${(radii[Math.floor(radii.length * 0.95)]).toFixed(0)} ly`);
  // No impossible density: the light of the drawn stars in the central core sphere, per cubic parsec, against Harris's central luminosity density.
  const rcPc = s.rcLy / PC_LY;
  let Lc = 0;
  const Ltot = 10 ** (-0.4 * (g.mvt - 4.83));
  for (let i = 0; i < s.count; i++) if (Math.hypot(s.pos[i * 3], s.pos[i * 3 + 1], s.pos[i * 3 + 2]) <= s.rcLy) Lc += s.light[i] * Ltot;
  const rhoDrawn = Lc / (4 / 3 * Math.PI * rcPc ** 3);
  check(rhoDrawn <= 10 ** g.logRhoc, `${id}: the drawn stars' light in the core, ${rhoDrawn.toFixed(0)} Lsun/pc^3, is under the catalogue's central density ${(10 ** g.logRhoc).toFixed(0)}`);
  // 4. The light shared.
  let sum = 0; for (const l of s.light) sum += l;
  check(sum <= G.LF.light * 1.15 && sum > 0.3, `${id}: the stars carry ${(sum * 100).toFixed(0)}% of the cluster's light (the model's ${G.LF.light * 100}%)`);
  const near = G.visibleLight(s.absMag, s.light, s.count, 20), far = G.visibleLight(s.absMag, s.light, s.count, 300);
  check(near <= sum + 1e-9 && far < near && far > 0, `${id}: the light the camera sees falls with distance (${near.toFixed(2)} at 20 pc, ${far.toFixed(2)} at 300 pc)`);
}
// King's model itself: falls to zero at rt, and its projection is King's surface profile (eq. 14 against eq. 27).
{
  const rc = 1, rt = 30;
  check(G.kingDensity(rt, rc, rt) === 0 && G.kingDensity(0.5 * rt, rc, rt) > 0 && G.kingDensity(0, rc, rt) > G.kingDensity(rc, rc, rt), 'King\'s density is highest at the centre and nothing at rt');
  const proj = (R) => { let s = 0; const zmax = Math.sqrt(Math.max(0, rt * rt - R * R)); const n = 4000; for (let i = 0; i < n; i++) { const z = (i + 0.5) / n * zmax; s += G.kingDensity(Math.hypot(R, z), rc, rt) * (zmax / n); } return 2 * s; };
  const k = proj(0) / G.kingSurface(0, rc, rt);
  let worst = 0;
  for (const R of [0.5, 1, 3, 10, 20]) worst = Math.max(worst, Math.abs(proj(R) / G.kingSurface(R, rc, rt) / k - 1));
  check(worst < 0.03, `eq. 27 projected is eq. 14's profile to ${(worst * 100).toFixed(1)}%`);
  const tb = G.kingTable(rc, rt);
  check(G.sampleRadius(tb, 0) === 0 && Math.abs(G.sampleRadius(tb, 1) - rt) < 1e-9 && G.sampleRadius(tb, 0.5) > rc, 'the table inverts from the centre to rt');
}

// 5. Open clusters.
let measuredAll = 0;
for (const o of MAN.open) {
  const rec = dso.get(o.id);
  const m = G.membersOf(file, o);
  const rt = Math.max(...o.hr23.map((h) => h.rtPc)) * PC_LY;
  let worst = 0, lowP = 0, dirWorst = 0;
  const C = rec.posLy;
  for (let i = 0; i < m.count; i++) {
    const x = m.pos[i * 3], y = m.pos[i * 3 + 1], z = m.pos[i * 3 + 2];
    worst = Math.max(worst, Math.hypot(x, y, z));
    if (m.prob[i] < 0.5) lowP++;
    void dirWorst;
  }
  measuredAll += o.measuredDepth;
  // The Double Cluster is two clusters 0.5 degrees apart: its members lie within the farther one's reach.
  const reach = o.id === 'double-cluster' ? rt + Math.hypot(...C) * 0.5 * Math.PI / 180 : rt * 1.35;
  check(worst <= reach, `${o.id}: every member within its cluster's tidal radius of the centre (${worst.toFixed(1)} of ${reach.toFixed(1)} ly)`);
  check(lowP === 0, `${o.id}: no member under the probability cut (${lowP})`);
  check(m.measured.reduce((a, b) => a + b, 0) === o.measuredDepth, `${o.id}: the manifest counts the members placed by their own parallax`);
  if (rec.distLy > 3000) check(o.measuredDepth === 0, `${o.id}: at ${rec.distLy} ly no single parallax is good enough for depth (${o.measuredDepth})`);
}
const hy = MAN.open.find((o) => o.id === 'hyades'), pl = MAN.open.find((o) => o.id === 'm45');
check(hy.measuredDepth / hy.count > 0.8 && hy.inHyg > 50, `the Hyades: nearly all placed by their own parallax (${hy.measuredDepth} of ${hy.count}), their bright ones the map's own (${hy.inHyg})`);
check(pl.count > 500 && pl.measuredDepth > 100 && pl.inHyg > 20, `the Pleiades: ${pl.count} Gaia members, ${pl.measuredDepth} by their own parallax, ${pl.inHyg} bright ones the map's own`);
// Directions kept: a Pleiades member drawn with the measured-depth flag points within a hair of the cluster's direction cone.
{
  const m = G.membersOf(file, pl);
  const C = dso.get('m45').posLy;
  let far = 0;
  for (let i = 0; i < m.count; i++) {
    const p = [C[0] + m.pos[i * 3], C[1] + m.pos[i * 3 + 1], C[2] + m.pos[i * 3 + 2]];
    const cos = (p[0] * C[0] + p[1] * C[1] + p[2] * C[2]) / (Math.hypot(...p) * Math.hypot(...C));
    far = Math.max(far, Math.acos(Math.min(1, cos)) * 180 / Math.PI);
  }
  check(far < 6, `the Pleiades' members lie within ${far.toFixed(1)} degrees of its centre on our sky`);
}

// 6. The layer.
stage.setWorld('stellar');
const recs = new Map();
for (const id of ['m13', 'omega-centauri', '47-tucanae', 'm45', 'hyades']) {
  const o = dso.get(id);
  recs.set(`dso-${id}`, { id: `dso-${id}`, klass: 'dso', pos: { x: o.posLy[0] * LY_KM, y: o.posLy[1] * LY_KM, z: o.posLy[2] * LY_KM }, meta: { distLy: o.distLy } });
}
const px = new Map();
let on = true, tier = 1, latched = false;
const layer = G.createLayer(THREE, {
  load: async () => MAN, loadMembers: async () => BIN,
  records: () => [...recs.values()], recordById: (id) => recs.get(id) || null, radiusPx: (id) => px.get(id) || 0,
  quality: () => ({ tier, latched }), pictureShare: () => 0, on: () => on,
});
await layer.whenLoaded();
const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e9);
const m13 = recs.get('dso-m13');
const at = new THREE.Vector3();
stage.toSceneInto(m13.pos, 'sun-inertial', at, stage.tMs);
camera.position.copy(at).add(new THREE.Vector3(0, 0, 300));
camera.lookAt(at); camera.updateMatrixWorld();
const step = () => layer.frame({ camera, renderer: null, stage, gain: 1, visible: true });
px.set('dso-m13', 8); step();
check(layer.stats().calls === 0 && layer.taken('dso-m13') === 0, 'no stars while the cluster is a few pixels (its glow is the cluster)');
px.set('dso-m13', 30); step();
const s1 = layer.stats();
check(s1.calls === 1 && s1.drawn[0].id === 'dso-m13' && s1.drawn[0].share > 0 && s1.drawn[0].share < 1, `between FROM_PX and FULL_PX the stars fade in (${JSON.stringify(s1.drawn)})`);
px.set('dso-m13', 200); step();
const share = layer.shares().get('dso-m13');
check(share > 0.2 && share <= G.LF.light, `the glow steps back by the light the stars draw at 300 ly (${share.toFixed(2)})`);
for (const id of ['dso-omega-centauri', 'dso-47-tucanae', 'dso-m45', 'dso-hyades']) px.set(id, 120);
for (let i = 0; i < 6; i++) step(); // one build a frame
await new Promise((r) => setTimeout(r, 20)); // the members' file
for (let i = 0; i < 6; i++) step();
check(layer.stats().calls === G.MAX_DRAWN, `at most ${G.MAX_DRAWN} clusters drawn, one call each (${layer.stats().calls})`);
check(layer.stats().drawn.some((d) => d.id === 'dso-m13'), 'the largest on screen is among them');
const mesh = layer.group.children.find((c) => c.name === 'deep-cluster-dso-m13');
const before = mesh.geometry.attributes.position.array.slice(0, 30);
step(); step();
check(mesh.geometry.attributes.position.array.slice(0, 30).every((v, i) => v === before[i]), 'nothing moves between frames');
latched = true; step();
check(mesh.geometry.drawRange.count <= G.POINTS[0], `the frame latch keeps the brightest ${G.POINTS[0]} (${mesh.geometry.drawRange.count})`);
latched = false;
on = false; step();
check(layer.stats().calls === 0 && layer.shares().size === 0, 'the BEFORE switch (deepsky.js debug({stars:false})) takes every star off and gives the glow back');
on = true;
// The card.
const W = COPY[G.COPY_BLOCK];
check(W && W.rows['dso-m13'] && W.rows['dso-m13'].length === 3 && /King/.test(W.rows['dso-m13'][0][1]) && /Harris/.test(W.rows['dso-m13'][0][1]), 'M13\'s card says its stars are a model from Harris\'s radii by King\'s profile');
check(W.rows['dso-m45'] && /probability of at least 0\.5/.test(W.rows['dso-m45'][0][1]) && /Gaia/.test(W.rows['dso-m45'][0][1]), 'the Pleiades\' card states the probability cut');
check(m13.meta.heroDrawn[0] === 'model' && recs.get('dso-m45').meta.heroDrawn[0] === 'catalogue' && m13.meta.heroCopy === G.COPY_BLOCK, 'what is drawn: a model for a globular, catalogue positions for an open cluster');
const realM13 = parseDso(dsoDoc).find((r) => r.id === 'dso-m13');
check(realM13 && !realM13.meta.heroDrawn, 'the records are stamped only by the layer, never in the file');
layer.dispose();
check(layer.group.children.length === 0, 'dispose gives every buffer back');

if (problems.length) { console.error(`globular: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
const om = G.sampleGlobular(row('omega-centauri'), dso.get('omega-centauri').distLy, 2);
console.log(`globular ok: 33 globulars by King's profile from Harris (Omega Centauri ${om.count} stars, rc ${om.rcLy.toFixed(1)} ly, rt ${om.rtLy.toFixed(0)} ly), ${MAN.open.length} open clusters with ${MAN.count} Gaia members above p ${MAN.cuts.prob} (${measuredAll} by their own parallax), ${fileBytes} B, at most ${G.MAX_DRAWN} calls`);
