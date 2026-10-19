// tests/test_galclusters.mjs -- galaxy clusters and quasars (internal spec 0076 W4-b, #784): scene/deep/galclusters.js and its two files.
//
//   node tests/test_galclusters.mjs
//
// 1. THE FILES. site/data/deep/galclusters.{json,bin}: the manifest's hash is the bin's, it is small, the four clusters of
//    registry/galaxy-clusters.yaml are there with the method of their distance in words, every member stands at a catalogued distance
//    (its own, or its cluster's by the cluster's method) with a modelled depth that is stated as modelled, none is a deep-sky record
//    drawn twice, and nothing is near the horizon.
// 2. THE DISTANCES. Coma's and Perseus's come from their members' mean redshift in the map's one cosmology (data/cosmology.js); Virgo's
//    and Fornax's are the published SBF means; a galaxy's own distance moves it off its cluster's.
// 3. THE LAYER, with three.js and no GPU: one draw call per cluster, culled whole by the frustum and by its size on the screen, fading as
//    it shrinks, its crowd never a white-out, fixed memory.
// 4. THE QUASARS. 3C 273 and 3C 279 at the exotics records' own places, the magnitude the catalogue gives from the Sun, 3C 273's host at
//    the angular size the source gives and 3C 279 with none, the words on the card.
// 5. THE SHADERS, read as text (there is no GPU here): their varyings agree, their attributes are set, no reserved word, no time.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const G = await import(join(JS, 'scene/deep/galclusters.js'));
const { horizonLy, comovingLy } = await import(join(JS, 'data/cosmology.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { EXOTICS } = await import(join(JS, 'data/exotics.js'));
const { exoticRecords } = await import(join(JS, 'data/layers.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
const { DEEP_LAYERS } = await import(join(JS, 'scene/deep/heroes.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const LY_KM = 9460730472580.8;
const MPC_MLY = 3.261563777167433;

// ---- 1. the files ---------------------------------------------------------------------------------
const BIN = readFileSync(join(ROOT, 'site/data/deep/galclusters.bin'));
const MAN = JSON.parse(readFileSync(join(ROOT, 'site/data/deep/galclusters.json'), 'utf8'));
const buffer = BIN.buffer.slice(BIN.byteOffset, BIN.byteOffset + BIN.byteLength);
const tile = G.parseMembers(buffer);
check(createHash('sha256').update(BIN).digest('hex') === MAN.bin.sha256 && MAN.bin.bytes === BIN.byteLength, 'the manifest\'s sha256 and size are the bin\'s');
check(MAN.count === tile.count && MAN.clusters.reduce((n, c) => n + c.count, 0) === tile.count, `the manifest counts the bin (${tile.count} rows)`);
const fileBytes = BIN.byteLength + Buffer.byteLength(JSON.stringify(MAN));
check(fileBytes <= BUDGETS.deep_galclusters_bytes, `the members and their manifest are within the budget (${fileBytes} B of ${BUDGETS.deep_galclusters_bytes}; registry/budgets.yaml deep_galclusters_bytes)`);
check(BUDGETS.deep_galclusters_draw_calls === 6, 'the draw-call budget is one per cluster (four) and one per quasar (two)');
check(JSON.stringify(MAN.clusters.map((c) => c.id)) === JSON.stringify(['virgo', 'coma', 'fornax', 'perseus']), 'Virgo, Coma, Fornax and Perseus');
check(/VizieR/.test(MAN.licence) && /public domain/.test(MAN.licence) && MAN.sources.evcc && MAN.sources.sbf && MAN.sources.coma && MAN.sources.perseus && MAN.sources.fornax && MAN.sources.sdss, 'the licences and the six sources travel with the files');
for (const c of MAN.clusters) {
  check(c.distance && (c.distance.method === 'sbf' || c.distance.method === 'redshift') && c.catalogue && c.source && /read 2026-10-20/.test(c.source), `${c.id}: its distance method, its catalogue and its sources (with the day read) are stated`);
  check(c.depth && (c.depth.kind === 'measured' || c.depth.kind === 'modelled') && c.depth.note && c.depth.cutSigma === 2.5 && c.depth.sigmaMly > 0, `${c.id}: the depth of the members with no distance of their own is stated as ${c.depth && c.depth.kind}, with its sigma and its cut`);
}
check(MAN.clusters.find((c) => c.id === 'coma').depth.kind === 'modelled' && MAN.clusters.find((c) => c.id === 'virgo').depth.kind === 'measured', 'Virgo\'s depth is a published scatter, Coma\'s a modelled one');
{
  let bad = 0;
  let far = 0;
  const seen = { own: 0, sized: 0 };
  for (const c of MAN.clusters) {
    let own = 0;
    let sized = 0;
    let maxOff = 0;
    for (let i = 0; i < c.count; i++) {
      const r = G.rowOf(tile, c.offset + i);
      if (!r.off.every(Number.isFinite) || !Number.isFinite(r.absMag) || !(r.reMly >= 0) || r.absMag < -26 || r.absMag > -8) bad += 1;
      if (r.sizeMeasured !== (r.reMly > 0)) bad += 1;
      if (r.ownDistance) own += 1;
      if (r.sizeMeasured) sized += 1;
      maxOff = Math.max(maxOff, Math.hypot(...r.off));
    }
    if (own !== c.own || sized !== c.sized || Math.abs(maxOff - c.radiusMly) > 1e-2) bad += 1;
    seen.own += own;
    seen.sized += sized;
    far = Math.max(far, c.distMly + maxOff);
  }
  check(bad === 0, `every member has finite offsets, a size consistent with its flag and an absolute magnitude of a galaxy (${bad} do not)`);
  check(far < 400 && far < horizonLy() / 1e6, `nothing is drawn past ${far.toFixed(0)} million light-years: well inside the horizon (${(horizonLy() / 1e9).toFixed(1)} billion)`);
  check(seen.own === MAN.clusters.find((c) => c.id === 'virgo').own && seen.own > 50, `the galaxies at a distance of their own are Virgo's SBF galaxies (${seen.own})`);
}
// One galaxy, one mark: no member is a deep-sky galaxy record within the build's 90 arcseconds, and the ones left out are named records.
{
  const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects.filter((o) => o.kind === 'galaxy');
  const ids = new Set(dso.map((o) => `dso-${o.id}`));
  const virgo = MAN.clusters.find((c) => c.id === 'virgo');
  check(virgo.excluded.length >= 10 && virgo.excluded.includes('dso-m87') && virgo.excluded.every((id) => ids.has(id)), `Virgo leaves out ${virgo.excluded.length} galaxies the map already draws as records (M87 among them)`);
  const toEcl = (raDeg, decDeg) => G.eclipticDir(raDeg, decDeg);
  let twins = 0;
  for (const c of MAN.clusters) {
    const cdir = c.centre.dir;
    for (let i = 0; i < c.count; i++) {
      const r = G.rowOf(tile, c.offset + i);
      const p = [cdir[0] * c.distMly + r.off[0], cdir[1] * c.distMly + r.off[1], cdir[2] * c.distMly + r.off[2]];
      const n = Math.hypot(...p);
      for (const o of dso) {
        const d = toEcl(o.raDeg, o.decDeg);
        const dot = (p[0] * d[0] + p[1] * d[1] + p[2] * d[2]) / n;
        if (dot > Math.cos(60 * Math.PI / 648000) && Math.abs(Math.log(n * 1e6 / o.distLy)) < Math.log(1.5)) twins += 1;
      }
    }
  }
  check(twins === 0, `no member is also a deep-sky record within a minute of arc (${twins})`);
}

// ---- 2. the distances -----------------------------------------------------------------------------
{
  const by = (id) => MAN.clusters.find((c) => c.id === id);
  check(Math.abs(by('virgo').distMpc - 16.5) < 1e-6 && by('virgo').distance.method === 'sbf' && by('virgo').distance.systematic_mpc === 1.1, 'Virgo: 16.5 Mpc by SBF (Mei and others 2007), its systematic error kept');
  check(Math.abs(by('fornax').distMpc - 20.0) < 1e-6 && by('fornax').distance.method === 'sbf', 'Fornax: 20.0 Mpc by SBF (Blakeslee and others 2009)');
  for (const id of ['coma', 'perseus']) {
    const c = by(id);
    const chi = comovingLy(c.distance.zMean) / 1e6;
    check(c.distance.method === 'redshift' && Math.abs(c.distMly / chi - 1) < 0.003, `${c.name}: ${c.distMly} Mly is the comoving distance of its members' mean redshift ${c.distance.zMean} (${chi.toFixed(2)} by data/cosmology.js)`);
  }
  check(by('coma').distMly > 300 && by('coma').distMly < 360, `Coma is about 330 million light-years away (${by('coma').distMly})`);
  // The depth of the members is spread about the cluster's distance: the SBF galaxies and the modelled ones both.
  const virgo = by('virgo');
  const depths = [];
  const dir = virgo.centre.dir;
  for (let i = 0; i < virgo.count; i++) {
    const r = G.rowOf(tile, virgo.offset + i);
    const p = [dir[0] * virgo.distMly + r.off[0], dir[1] * virgo.distMly + r.off[1], dir[2] * virgo.distMly + r.off[2]];
    depths.push({ d: Math.hypot(...p) / MPC_MLY, own: r.ownDistance });
  }
  const own = depths.filter((x) => x.own);
  const mean = (a) => a.reduce((s, x) => s + x.d, 0) / a.length;
  check(own.length > 50 && Math.abs(mean(own) - 16.5) < 1.5, `Virgo's SBF galaxies stand about 16.5 Mpc out (mean ${mean(own).toFixed(2)} of ${own.length}), a few at the W' cloud's 23`);
  check(own.some((x) => x.d > 20) && depths.filter((x) => !x.own).every((x) => Math.abs(x.d - 16.5) < 3 * 0.6 + 1), 'the W\' cloud is where its SBF distances put it (past 20 Mpc), the modelled depths stay within 2.5 sigma of the cluster');
}

// ---- 3. the layer ---------------------------------------------------------------------------------
stage.setWorld('local-group');
const records = new Map(exoticRecords().map((r) => [r.id, r]));
const recordById = (id) => records.get(id) || null;
const layer = G.createLayer(THREE, { load: async () => ({ manifest: MAN, buffer }), recordById });
await layer.whenLoaded();
check(layer.ready() && layer.stats().loaded && !layer.stats().failed, `the layer loads from the files (${layer.stats().failed || 'ok'})`);
const W = 1600, HPX = 900;
const cam = new THREE.PerspectiveCamera(50, W / HPX, 1e-5, 1e9);
const renderer = { domElement: { clientHeight: HPX }, getPixelRatio: () => 1 };
const lookAt = (from, at) => { cam.position.set(...from); cam.up.set(0, 1, 0); cam.lookAt(new THREE.Vector3(...at)); cam.updateMatrixWorld(true); };
const sceneOf = (km) => stage.toScene(km, 'sun-inertial');
const clusterAt = (id) => { const c = MAN.clusters.find((x) => x.id === id); const r = c.distMly * 1e6 * LY_KM; return sceneOf({ x: c.centre.dir[0] * r, y: c.centre.dir[1] * r, z: c.centre.dir[2] * r }); };
const away = (id, mly) => { const c = clusterAt(id); const n = c.clone().normalize(); return c.clone().addScaledVector(n, mly); };   // mly further from the Sun, on the line
// From the Sun's side, 150 Mly out from Virgo, looking in.
{
  const v = clusterAt('virgo');
  lookAt(away('virgo', -30).toArray(), v.toArray());
  layer.frame({ camera: cam, renderer, stage, gain: 1 });
  const s = layer.stats();
  const virgo = s.clusters.find((c) => c.id === 'virgo');
  check(virgo.culled === null && layer.group.visible && virgo.radiusPx > 100 && s.calls >= 1, `Virgo from 30 Mly nearer the Sun is drawn, ${virgo.radiusPx} px in radius (${virgo.culled})`);
  const meshes = layer.group.children.filter((o) => o.name.startsWith('deep-galcluster-'));
  check(meshes.length === 4 && meshes.every((m) => m.geometry.instanceCount > 0), 'four meshes, one per cluster: an instanced quad for every member');
  const drawn = meshes.filter((m) => m.visible);
  check(drawn.length === s.clusters.filter((c) => c.culled === null).length && s.calls === drawn.length + s.quasars.filter((q) => !q.culled).length, `one draw call each (${s.calls} calls)`);
  check(s.calls <= BUDGETS.deep_galclusters_draw_calls, `within the draw-call budget (${s.calls} of ${BUDGETS.deep_galclusters_draw_calls})`);
  check(s.bytes > 0 && s.bytes < 200000, `its GPU attributes are fixed and small (${s.bytes} B)`);
}
{
  // Looking away: the frustum culls every cluster. From very far: a speck, not drawn.
  lookAt([0, 0, 0], clusterAt('virgo').clone().multiplyScalar(-1).toArray());
  layer.frame({ camera: cam, renderer, stage, gain: 1 });
  check(layer.stats().clusters.every((c) => c.culled === 'frustum') && layer.stats().calls === layer.stats().quasars.filter((q) => !q.culled).length, `looking away from it, the frustum culls the clusters (${layer.stats().clusters.map((c) => c.culled).join(', ')})`);
  lookAt([0, 0, 40000], [0, 0, 0]);
  layer.frame({ camera: cam, renderer, stage, gain: 1 });
  check(layer.stats().clusters.every((c) => c.culled === 'size' || c.culled === 'frustum'), `from 40 billion light-years the clusters are specks and are not drawn (${layer.stats().clusters.map((c) => c.culled).join(', ')})`);
  // It fades out as it shrinks, never a pop: full from FADE_PX, none at CULL_PX, monotonic between.
  let mono = true;
  for (let r = G.CULL_PX; r < G.FADE_PX + 5; r += 0.5) if (G.tileFade(r + 0.5) < G.tileFade(r)) mono = false;
  check(G.tileFade(G.CULL_PX) === 0 && G.tileFade(G.FADE_PX) === 1 && G.tileFade(1e6) === 1 && mono, `a cluster fades from ${G.FADE_PX} px down to ${G.CULL_PX} px, smoothly`);
  // A crowd of galaxies never adds up to a white blob: the light steps back as they pile up, and is whole when they have room.
  const n = MAN.clusters.find((c) => c.id === 'coma').count;
  let monoC = true;
  for (let r = 5; r < 4000; r *= 1.1) if (G.crowd(r * 1.1, n) < G.crowd(r, n)) monoC = false;
  check(monoC && G.crowd(30, n) < 0.25 && G.crowd(3000, n) === 1 && G.crowd(0, n) === 0 && G.crowd(100, 0) === 0, `the crowd dims 1 826 members in a cluster 30 px wide to ${G.crowd(30, n).toFixed(2)} and leaves them whole with room (${G.crowd(3000, n)})`);
  // Inside a cluster (the radius on the screen is infinite): drawn whole.
  const c0 = clusterAt('coma');
  lookAt(c0.clone().add(new THREE.Vector3(2, 1, 1)).toArray(), c0.clone().add(new THREE.Vector3(-3, 0, 0)).toArray());
  layer.frame({ camera: cam, renderer, stage, gain: 1 });
  const coma = layer.stats().clusters.find((c) => c.id === 'coma');
  check(coma.culled === null && coma.radiusPx === 'inside' && coma.fade === 1, `inside Coma its members are drawn whole (${coma.culled}, ${coma.radiusPx}, fade ${coma.fade})`);
}

// ---- precision: a member 1 Mly from the camera, in Coma, 334 Mly from the Sun -----------------------
{
  const f32 = (m) => { const o = new THREE.Matrix4(); o.elements = Array.from(new Float32Array(m.elements)); return o; };
  const toPx = (v) => ({ x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * HPX });
  const mesh = layer.group.children.find((o) => o.name === 'deep-galcluster-coma');
  const coma = MAN.clusters.find((c) => c.id === 'coma');
  const r = G.rowOf(tile, coma.offset + 5);
  const model = mesh.matrixWorld.clone();
  const target = new THREE.Vector3(...r.off).applyMatrix4(model);
  let worst = 0;
  for (let i = 0; i < 90; i++) {
    const a = i * 0.002;
    cam.position.set(target.x + Math.cos(a), target.y + 0.2, target.z + Math.sin(a));
    cam.lookAt(target);
    cam.updateMatrixWorld(true);
    const mv = new THREE.Matrix4().multiplyMatrices(cam.matrixWorldInverse, model);
    const gpu = new THREE.Vector3(...r.off.map(Math.fround)).applyMatrix4(f32(mv)).applyMatrix4(f32(cam.projectionMatrix));
    const exact = new THREE.Vector3(...r.off).applyMatrix4(model).applyMatrix4(cam.matrixWorldInverse).applyMatrix4(cam.projectionMatrix);
    const a1 = toPx(gpu), b1 = toPx(exact);
    worst = Math.max(worst, Math.hypot(a1.x - b1.x, a1.y - b1.y));
  }
  check(worst < 0.25, `a Coma member seen from 1 Mly: the GPU's place is ${worst.toFixed(3)} px off float64 (under 0.25)`);
}

// ---- 4. the quasars -------------------------------------------------------------------------------
{
  const recs = records; // the layer stamped these
  for (const q of MAN.quasars) {
    const o = G.quasarOf(q);
    const rec = recs.get(q.record);
    const x = EXOTICS.find((e) => e.id === q.id);
    check(o && rec && x && x.kind === 'quasar' && Number.isFinite(x.redshift), `${q.id}: a quasar row with a redshift, and a record`);
    if (!o || !rec) continue;
    const dp = Math.hypot(o.posKm.x - rec.pos.x, o.posKm.y - rec.pos.y, o.posKm.z - rec.pos.z) / Math.hypot(rec.pos.x, rec.pos.y, rec.pos.z);
    check(dp < 1e-9, `${q.id}: drawn at the exotics record's own place (off by ${dp.toExponential(1)} of its distance)`);
    check(Math.abs(o.distLy / comovingLy(x.redshift) - 1) < 0.005, `${q.id}: ${o.distLy} ly is the comoving distance of z = ${x.redshift}`);
    // Seen from the Sun the magnitude is the catalogue's own.
    const pc = o.distLy / 3.261563777167433;
    check(Math.abs(o.absMag + 5 * Math.log10(pc / 10) - x.vmag) < 1e-9, `${q.id}: from the Sun it is magnitude ${x.vmag}, as the catalogue gives`);
    check(x.distLy < horizonLy(), `${q.id} is not past the horizon`);
  }
  const q273 = G.quasarOf(MAN.quasars.find((q) => q.id === '3c-273'));
  const q279 = G.quasarOf(MAN.quasars.find((q) => q.id === '3c-279'));
  check(q279 && q279.host === null, '3C 279 has no host drawn: its source gives no size');
  check(q273.host && q273.host.morphology === 'E4' && q273.host.sizeArcsec === 29 && q273.host.apparentMag === 16, '3C 273\'s host: an E4, 29 arcseconds, magnitude 16');
  const angular = (q273.host.mapRadiusMly * 1e6) / q273.distLy / (Math.PI / 648000);
  check(Math.abs(angular - 14.5) < 1e-6, `from the Sun the host's radius subtends ${angular.toFixed(3)} arcseconds: the source's 29 across`);
  check(q273.host.trueWidthLy > 230000 && q273.host.trueWidthLy < 300000, `its true width, from the angular-diameter distance, is about ${Math.round(q273.host.trueWidthLy / 1e4) * 1e4} light-years`);
  check(Math.abs(q273.host.reMly * G.EXTENT - q273.host.mapRadiusMly) < 1e-12, 'the impostor\'s edge is the source\'s radius');
  // In the scene: two meshes, 3C 273 with two instances (the point and the host), 3C 279 with one.
  const qm = layer.group.children.filter((o) => o.name.startsWith('deep-quasar-'));
  const m273 = qm.find((o) => o.name.endsWith('3c-273')), m279 = qm.find((o) => o.name.endsWith('3c-279'));
  check(qm.length === 2 && m273.geometry.instanceCount === 2 && m279.geometry.instanceCount === 1, 'a mesh each: the point and the host for 3C 273, the point alone for 3C 279');
  // The card says what is drawn, once the layer has stamped the record.
  const r273 = recs.get('exotic-3c-273');
  check(typeof r273.meta.departure === 'string' && /29 arcseconds/.test(r273.meta.departure) && /270,000|280,000|260,000/.test(r273.meta.departure) && /redshift/.test(r273.meta.departure), `3C 273's card says what is drawn (${r273.meta.departure && r273.meta.departure.slice(0, 80)}...)`);
  const r279 = recs.get('exotic-3c-279');
  check(typeof r279.meta.departure === 'string' && /no size/.test(r279.meta.departure), '3C 279\'s card says its host is not drawn');
}
{
  // The quasar is drawn from the Sun's side (in view) as one call each.
  const q = layer.stats().quasars;
  check(q.length === 2 && q.every((x) => 'culled' in x), 'the stats name both quasars');
  const x273 = G.quasarOf(MAN.quasars.find((q2) => q2.id === '3c-273'));
  const at = sceneOf(x273.posKm);
  lookAt([0, 0, 0], at.toArray());
  layer.frame({ camera: cam, renderer, stage, gain: 1 });
  check(layer.stats().quasars.find((s) => s.id === '3c-273').culled === null, 'looking at 3C 273 from the Sun, it is drawn');
  lookAt(at.clone().add(new THREE.Vector3(0.3, 0.1, 0.2)).toArray(), at.toArray());
  layer.frame({ camera: cam, renderer, stage, gain: 1 });
  check(layer.stats().quasars.find((s) => s.id === '3c-273').culled === null, '0.4 Mly from 3C 273 it is drawn: nothing vanishes when close');
}
{
  // describe(): four lines of words, every placeholder filled.
  const lines = ['virgo', 'coma'].map((id) => layer.describe(id));
  check(lines.every((d) => d && d.lines.length === 4 && d.lines.every((l) => typeof l === 'string' && l.length > 20 && !/[{}]|undefined|NaN/.test(l))), 'a cluster describes itself in four sentences, none with a hole in it');
  check(/megaparsecs/.test(lines[0].lines[1]) && /redshift/.test(lines[1].lines[1]) && /model/.test(lines[0].lines[2]) && /model/.test(lines[1].lines[2]), 'Virgo says SBF, Coma says redshift, both say their depth is a model');
  const W4 = COPY.r12Far;
  check(W4 && W4.quasar && W4.cluster, 'the words block r12Far exists (copy/en.later.js)');
}

// ---- 5. the shaders, as text -----------------------------------------------------------------------
{
  const src = readFileSync(join(JS, 'scene/deep/galclusters.js'), 'utf8');
  const block = (name) => { const m = src.match(new RegExp('const ' + name + ' = /\\* glsl \\*/ `([\\s\\S]*?)`;')); return m ? m[1] : ''; };
  const sets = [['VERT_GAL', 'FRAG_GAL', ['aOff', 'aRe', 'aMag', 'aColour']], ['VERT_QSO', 'FRAG_QSO', ['aKind', 'aRe', 'aMag']]];
  const RESERVED = ['half', 'fixed', 'long', 'short', 'double', 'input', 'output', 'sample', 'common', 'partition', 'active', 'filter', 'image2D', 'resource', 'unsigned', 'superp', 'sizeof', 'cast', 'namespace', 'using', 'template', 'this', 'packed', 'goto', 'inline', 'noinline', 'volatile', 'public', 'static', 'extern', 'external', 'interface'];
  for (const [vn, fn, attrs] of sets) {
    const v = block(vn), f = block(fn);
    check(v.length > 200 && f.length > 100, `${vn} and ${fn} are in the file`);
    const varyings = (s) => [...s.matchAll(/varying\s+(\w+)\s+(\w+)\s*;/g)].map((m) => `${m[1]} ${m[2]}`);
    const vv = new Set(varyings(v));
    check(varyings(f).every((x) => vv.has(x)), `${fn}'s varyings are ${vn}'s, with the same types (${varyings(f).join(', ')})`);
    for (const a of attrs) check(new RegExp(`attribute\\s+\\w+\\s+${a}\\b`).test(v), `${vn} declares ${a}`);
    for (const w of RESERVED) check(!new RegExp(`\\b(float|vec2|vec3|vec4|int|bool)\\s+${w}\\b`).test(v + f), `${vn}/${fn} declare nothing named ${w}, a reserved word of GLSL`);
    check((v.match(/{/g) || []).length === (v.match(/}/g) || []).length && (f.match(/{/g) || []).length === (f.match(/}/g) || []).length, `${vn} and ${fn} have balanced braces`);
    check(!/uTime|uNow|iTime|Date\.now|random\(|rand\(/.test(v + f), `${vn}/${fn} have no clock and no noise: nothing moves, under any look`);
    check(/gl_FragColor/.test(f) && /gl_Position/.test(v), `${vn} sets gl_Position and ${fn} sets gl_FragColor`);
    check(!/\bbloom\b|\bflare\b|\bspike\b|\bdiffraction\b/i.test(v + f), `${vn}/${fn} draw no bloom, flare or spike`);
  }
  // every attribute the shaders read is set on the geometry
  const gal = layer.group.children.find((o) => o.name === 'deep-galcluster-virgo').geometry;
  check(['aOff', 'aRe', 'aMag', 'aColour', 'position'].every((a) => gal.getAttribute(a)), 'the cluster geometry sets every attribute VERT_GAL reads');
  const qso = layer.group.children.find((o) => o.name === 'deep-quasar-3c-273').geometry;
  check(['aKind', 'aRe', 'aMag', 'position'].every((a) => qso.getAttribute(a)), 'the quasar geometry sets every attribute VERT_QSO reads');
}

// ---- how it is built in -----------------------------------------------------------------------------
{
  const row = DEEP_LAYERS.find((l) => l.id === 'galclusters');
  check(row && row.stages.join() === 'local-group' && typeof row.build === 'function' && typeof row.ask === 'function', 'heroes.js DEEP_LAYERS builds it on the local-group rung, by dynamic import');
  const ask = row.ask({ recordById }, () => true);
  check(ask.recordById === recordById && ask.on() === true, 'the coordinator hands it recordById and the probe switch');
  const off = G.createLayer(THREE, { load: async () => ({ manifest: MAN, buffer }), recordById, on: () => false });
  await off.whenLoaded();
  lookAt(away('virgo', -30).toArray(), clusterAt('virgo').toArray());
  off.frame({ camera: cam, renderer, stage, gain: 1 });
  check(!off.group.visible && off.stats().calls === 0, 'with the probe switch off nothing is drawn: the BEFORE of a look');
  off.dispose();
  const boot = readFileSync(join(JS, 'main.js'), 'utf8');
  check(!/galclusters/.test(boot), 'main.js does not import it: it arrives by dynamic import with the local-group rung, never at boot');
}

layer.dispose();
if (problems.length) {
  console.error('galclusters FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`galclusters ok: ${MAN.clusters.length} clusters and ${tile.count} members in ${fileBytes} B, one draw call each; ${MAN.quasars.length} quasars at their comoving distance, 3C 273 with a host of 29 arcseconds; the shaders read as text`);
