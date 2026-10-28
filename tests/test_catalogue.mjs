// tests/test_catalogue.mjs -- every known deep-sky object (internal spec 0079 stage A2, internal #1060): the two files
// scripts/build_deep_catalogue.py bakes, the layer that draws them (scene/deep/catalogue.js) and the search that finds them.
//
//   node tests/test_catalogue.mjs
//
// 1. THE FILES. The manifests' hashes are the files', every count adds up (OpenNGC 13 372 in all, Harris 157, Green 310,
//    Caldwell 109 each placed), nothing the map already draws is drawn twice (by designation and by id), the licence of each
//    file is stated, and the Gaia-derived clusters sit in their own file.
// 2. THE ROWS. Quantised values decode to what the sources say (NGC 1, IC 1396, a Harris cluster, a Green remnant), a distance
//    is one of the named methods, an inferred one carries a range, an overlay moves an OpenNGC cluster to its Gaia distance.
// 3. THE RECORDS. A row becomes a deep-sky record on demand (parseDso's shape), the card's sources and honesty words are there,
//    its id finds its row, and a name typed finds it (designation, Caldwell number, common name).
// 4. THE LAYER, three.js without a GPU: one draw call (two with a range), culled whole by the frustum and by size, a tap finds
//    an object, memory is fixed, the shader holds no undefined `pow` of a negative.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const C = await import(join(JS, 'scene/deep/catalogue.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const file = (name) => { const b = readFileSync(join(ROOT, 'site/data/deep', name)); return { b, ab: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; };

// ---- 1. the files ----------------------------------------------------------------------------------
const mainF = file('catalogue.bin'), ocF = file('catalogue-oc.bin');
const MAIN = JSON.parse(readFileSync(join(ROOT, 'site/data/deep/catalogue.json'), 'utf8'));
const OC = JSON.parse(readFileSync(join(ROOT, 'site/data/deep/catalogue-oc.json'), 'utf8'));
check(createHash('sha256').update(mainF.b).digest('hex') === MAIN.sha256 && createHash('sha256').update(ocF.b).digest('hex') === OC.sha256, 'the manifests\' sha256 are the files\'');
const mainTile = C.parseTile(mainF.ab), ocTile = C.parseTile(ocF.ab);
check(mainTile.count === MAIN.count && MAIN.names.length === MAIN.count && ocTile.count === OC.count && OC.names.length === OC.count, 'each manifest counts its file');
const raw = mainF.b.length + ocF.b.length + readFileSync(join(ROOT, 'site/data/deep/catalogue.json')).length + readFileSync(join(ROOT, 'site/data/deep/catalogue-oc.json')).length;
check(raw <= BUDGETS.deep_catalogue_bytes, `the four files are within the budget (${raw} B of ${BUDGETS.deep_catalogue_bytes}; registry/budgets.yaml deep_catalogue_bytes)`);
{
  const t = MAIN.totals, o = OC.totals;
  check(t.openngc === 13372 && t.openngc_taken + MAIN.sections.find((s) => s.src === 'openngc').to === 13372, `all 13 372 OpenNGC objects are accounted for: ${t.openngc_taken} the map already draws, ${MAIN.sections[0].to} in the file`);
  check(MAIN.taken.length === t.openngc_taken, 'the manifest names the objects it left out');
  check(t.harris_total === 157 && t.harris_added === MAIN.sections.find((s) => s.src === 'harris').to - MAIN.sections.find((s) => s.src === 'harris').from, `Harris's 157 globulars: ${t.harris_added} added, the rest are OpenNGC's rows or the map's own`);
  check(t.green_total === 310 && t.green_added + MAIN.green_skipped.length === 310, `Green's 310 remnants: ${t.green_added} added, ${MAIN.green_skipped.length} are OpenNGC's or the map's own`);
  check(Object.keys(MAIN.caldwellTable).length === 109 && Object.values(MAIN.caldwellTable).every((e) => e.row !== undefined || e.id) && t.caldwell === 109, 'all 109 Caldwell objects are placed: a row of the file, or a record the map already has');
  check(o.hr23_open === 6818 && o.hr23_new + o.hr23_overlay + o.hr23_merged + o.hr23_taken === 6818, `Hunt & Reffert's 6 818 open clusters: ${o.hr23_new} new, ${o.hr23_overlay} lend OpenNGC's their Gaia distance (${o.hr23_merged} more fall on the same row), ${o.hr23_taken} are the map's own`);
  check(MAIN.count + OC.count > 19000, `more than 19 000 objects in all (${MAIN.count + OC.count})`);
}
check(/CC BY-SA 4\.0/.test(MAIN.sources.openngc.licence) && /BY-NC 3\.0 IGO/.test(OC.sources.hr23.licence), 'each file states its licence, and the Gaia-derived one is apart');
check(!MAIN.sections.some((s) => s.src === 'hr23') && OC.sections.every((s) => s.src === 'hr23'), 'no Gaia-derived row is in the OpenNGC file');
check(!/hashpn/.test(JSON.stringify(MAIN.sources)), 'HASH is not a source (its database is behind a registration)');

// ---- one object, one mark --------------------------------------------------------------------------
const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects;
const lv = JSON.parse(readFileSync(join(ROOT, 'site/data/deep/localvolume.json'), 'utf8')).names;
const T = C.buildTable({ manifest: MAIN, tile: mainTile }, { manifest: OC, tile: ocTile });
{
  const have = new Set(dso.filter((o) => o.designation).map((o) => C.designationKey(o.designation)));
  for (const n of lv) { const m = /^(NGC|IC)\s*0*(\d+)$/.exec(n.trim()); if (m) have.add(C.designationKey(`${m[1]} ${m[2]}`)); }
  let twins = 0;
  const names = [...MAIN.names, ...OC.names];
  for (const n of names) if (have.has(C.designationKey(n))) twins += 1;
  check(twins === 0, `no object of the files is one the map already draws, by designation (${twins})`);
  const ids = new Set(dso.map((o) => `dso-${o.id}`));
  const mine = T.ids.map((x) => `dso-${x}`);
  check(new Set(mine).size === T.n && !mine.some((x) => ids.has(x)) && mine.every((x) => !x.startsWith('dso-lv-')), 'every id is unique and none is a record the map has');
  // also not within an arcminute of a Messier object or hand row of the same kind of class
  let near = 0;
  for (const o of dso) {
    if (o.raDeg == null || o.typeCode === 'G' || !o.majAxArcmin || o.majAxArcmin < 5) continue;
    for (let i = 0; i < T.n; i++) {
      if (Math.abs(T.decDeg[i] - o.decDeg) > 0.02) continue;
      const dra = Math.abs(T.raDeg[i] - o.raDeg) * Math.cos((o.decDeg * Math.PI) / 180);
      if (dra < 0.01 && T.cls[i] === (MAIN.classes.findIndex((c) => c.code === o.typeCode))) near += 1;
    }
  }
  check(near === 0, `no object of the files sits on top of a map record of its own class (${near})`);
}

// ---- 2. the rows -----------------------------------------------------------------------------------
{
  const row = (name) => { const i = T.parts[0].manifest.names.indexOf(name); return i; };
  const i1 = row('NGC 1');
  const r1 = C.decodeRow(mainTile, i1);
  check(Math.abs(r1.raDeg - 1.816) < 1e-3 && Math.abs(r1.decDeg - 27.708) < 1e-3, `NGC 1 sits at 1.816, +27.708 (${r1.raDeg.toFixed(4)}, ${r1.decDeg.toFixed(4)})`);
  check(MAIN.methods[r1.method] === 'redshift' && !r1.inferred && r1.distLy > 1.5e8 && r1.distLy < 3e8 && r1.loLy < r1.distLy && r1.distLy < r1.hiLy, `NGC 1 is placed by its redshift with a range (${Math.round(r1.distLy / 1e6)} Mly)`);
  const ic = row('IC 1396');
  const rc = C.decodeRow(mainTile, ic);
  check(Math.abs(rc.majArcmin - 14) < 0.1 && Math.abs(T.distLy[ic] - 3060) < 400, `IC 1396 is 14′ wide, about 3 000 light-years away (${rc.majArcmin && rc.majArcmin.toFixed(2)}, ${Math.round(T.distLy[ic])})`);
  const pal = row('Pal 1');
  check(pal > 0 && MAIN.methods[T.method[pal]] === 'harris' && T.cls[pal] === 3 && T.distLy[pal] > 30000 && T.distLy[pal] < 45000, `Palomar 1, a Harris-only globular, is placed by Harris (${Math.round(T.distLy[pal])} ly)`);
  const g = row('G1.9+0.3');
  check(g > 0 && T.cls[g] === 10 && MAIN.methods[T.method[g]] === 'typical' && T.inferred[g] === 1, 'G1.9+0.3, Green’s youngest remnant, has no distance of its own: it is the typical mark');
  let counts = { measured: 0, inferred: 0, bad: 0 };
  for (let i = 0; i < T.n; i++) {
    const name = C.designationKey(i < T.nMain ? MAIN.names[i] : OC.names[i - T.nMain]);
    if (!(T.loLy[i] > 0 && T.loLy[i] <= T.distLy[i] * 1.0001 && T.distLy[i] <= T.hiLy[i] * 1.0001)) counts.bad += 1;
    if (!(T.raDeg[i] >= 0 && T.raDeg[i] < 360 && Math.abs(T.decDeg[i]) <= 90.0001)) counts.bad += 1;
    if (T.inferred[i]) counts.inferred += 1; else counts.measured += 1;
    if (!name) counts.bad += 1;
  }
  check(counts.bad === 0, `every row has a place, a name and a distance inside its range (${counts.bad} do not)`);
  check(counts.inferred > 1000 && counts.measured > 10000, `${counts.measured} distances are measured or derived, ${counts.inferred} are only typical or from a small velocity, and drawn as such`);
  // the overlay: OpenNGC clusters take the Gaia distance
  const [orow, od] = OC.overlay[0];
  check(T.method[orow] === MAIN.methods.indexOf('gaia') && Math.round(T.distLy[orow]) === od && !T.inferred[orow], `an OpenNGC cluster takes the Gaia distance of its overlay (${MAIN.names[orow]}, ${od} ly)`);
  check(OC.overlay.every((e) => e[0] < T.nMain && T.cls[e[0]] !== 0) && OC.overlay.length === OC.totals.hr23_overlay, 'every overlay row is an OpenNGC cluster-like row');
  // a hundred random positions survive the round trip through the quantiser to well under an arcsecond
  let worst = 0;
  for (let i = 0; i < T.nMain; i += 131) worst = Math.max(worst, Math.abs(T.decDeg[i] - Math.round(T.decDeg[i] * 3600) / 3600));
  check(worst < 1.0 / 3600 * 0.51, 'positions are held to about an arcsecond or better');
}

// ---- 3. the records and the search -----------------------------------------------------------------
{
  const i = T.parts[0].manifest.names.indexOf('NGC 1');
  const rec = C.recordOfRow(T, i);
  check(rec && rec.klass === 'dso' && rec.layer === 'deep-sky' && rec.id === 'dso-ngc-1' && rec.frame === 'sun-inertial' && Number.isFinite(rec.pos.x), 'a row is a deep-sky record in parseDso\'s shape');
  check(rec.meta.typeText === 'Galaxy' && rec.meta.distance && rec.meta.distance.method === 'redshift' && /OpenNGC/.test(rec.meta.cite) && /redshift/.test(rec.meta.distanceSource), 'its card names its type, its method and its source');
  check(rec.meta.drawsAs === 'variant' && /mark from the catalogue/.test(rec.meta.drawnName) && /never under a few pixels/.test(rec.meta.departure), 'and says it is a mark from the catalogue, not a picture');
  const k = [...T.inferred].findIndex((v) => v === 1 && T.cls[0] !== undefined);
  const inf = C.recordOfRow(T, k);
  check(inf.meta.distance === null && /^not measured/.test(inf.meta.distanceSource) && /not its own/.test(inf.meta.departure), 'an inferred object says "not measured" and carries no method');
  const sn = C.recordOfRow(T, T.parts[0].manifest.names.indexOf('G1.9+0.3'));
  check(/Green/.test(sn.meta.cite) && /remnant/.test(sn.meta.why || ''), 'a remnant cites Green and says what it is');
  const oc = C.recordOfRow(T, T.nMain);
  check(/Hunt & Reffert/.test(oc.meta.why || '') && /Hunt & Reffert/.test(oc.meta.distanceSource) && oc.meta.distance && oc.meta.distance.method === 'parallax', 'a Gaia cluster says where its distance comes from');
  const all = parseDso({ objects: [C.rowOf(T, 0), C.rowOf(T, T.nMain + 5), C.rowOf(T, T.n - 1)] });
  check(all.length === 3, 'rows at both ends of the table parse');
  // search
  const s1 = C.searchNames(T, 'NGC 1', 3);
  check(s1.length && s1[0].name === 'NGC 1', `"NGC 1" finds NGC 1 first (${s1.map((x) => x.name).join(', ')})`);
  const s2 = C.searchNames(T, 'Caldwell 20', 3);
  check(s2.length && s2[0].id === 'dso-north-america-nebula', 'a Caldwell number of an object the map has finds that record');
  const s3 = C.searchNames(T, 'c 99', 3);
  check(s3.length && /Caldwell 99|Coalsack/i.test(s3[0].name), 'a Caldwell number of a catalogue row finds the row');
  const s4 = C.searchNames(T, 'IC 1396', 3);
  check(s4.length && s4[0].row >= 0 && s4[0].name.startsWith('IC 1396') , 'a designation finds its row');
  check(C.designationKey('NGC 0224') === 'ngc224' && C.designationKey('Caldwell 20') === 'c20' && C.designationKey('c-020') === 'c20', 'designations compare without spaces, zeros or hyphens');
  const first = [...Array(300).keys()].map((n) => C.searchNames(T, `ngc ${n * 23 + 1}`, 1));
  check(first.every((a) => Array.isArray(a)), 'searching is total');
}

// ---- 4. the layer ----------------------------------------------------------------------------------
stage.setWorld('local-group');
const layer = C.createLayer(THREE, { load: async () => ({ main: { manifest: MAIN, buffer: mainF.ab }, oc: { manifest: OC, buffer: ocF.ab } }) });
await layer.whenLoaded();
check(layer.ready() && layer.stats().loaded && layer.stats().objects === T.n, `the layer loads both files (${layer.stats().failed || layer.stats().objects})`);
const W = 1600, HPX = 900;
const cam = new THREE.PerspectiveCamera(50, W / HPX, 1e-5, 1e9);
const renderer = { domElement: { clientHeight: HPX }, getPixelRatio: () => 1 };
const look = (from, at) => { cam.position.set(...from); cam.up.set(0, 1, 0); cam.lookAt(new THREE.Vector3(...at)); cam.updateMatrixWorld(true); };
look([0, 5, 300], [0, 0, 0]);
layer.frame({ camera: cam, renderer, stage, gain: 1 });
let s = layer.stats();
check(s.culled === null && layer.group.visible && s.calls === 1 && s.inferred > 1000 && s.rangeShown === -1, `from 300 Mly it is one draw call, no range drawn (${s.calls}, ${s.inferred} inferred, ${s.culled})`);
check(s.calls <= BUDGETS.deep_catalogue_draw_calls, 'within the draw-call budget');
{
  const pts = layer.group.children.find((o) => o.isPoints);
  check(pts && pts.geometry.getAttribute('position').count === T.n, `every object is a point (${pts && pts.geometry.getAttribute('position').count})`);
  const lineObj = layer.group.children.find((o) => o.isLineSegments);
  check(lineObj && !lineObj.visible, 'the range line is hidden by default');
  const k = [...T.inferred].findIndex((v) => v === 1);
  check(layer.showRange(k) && lineObj.visible, 'an inferred object\'s range can be shown');
  layer.frame({ camera: cam, renderer, stage, gain: 1 });
  check(layer.stats().calls === BUDGETS.deep_catalogue_draw_calls, `with a range shown it is ${BUDGETS.deep_catalogue_draw_calls} draw calls`);
  const m = [...T.inferred].findIndex((v) => v === 0);
  check(!layer.showRange(m) && !lineObj.visible, 'a measured object has no range line');
  check(layer.stats().bytes > 0 && layer.stats().bytes < 2000000, `its GPU attributes are fixed (${layer.stats().bytes} B)`);
  // the selected one is lit: selecting by id sets the uniform
  layer.frame({ camera: cam, renderer, stage, gain: 1, selectedId: `dso-${T.ids[7]}` });
  check(pts.material.uniforms.uSelected.value === 7, 'the selected object is lit');
}
look([0, 0, 20000], [0, 0, 40000]);
layer.frame({ camera: cam, renderer, stage, gain: 1 });
check(layer.stats().culled === 'frustum' && !layer.group.visible, `from outside it, looking away, the frustum culls it (${layer.stats().culled})`);
look([0, 0, 5000000], [0, 0, 0]);
layer.frame({ camera: cam, renderer, stage, gain: 1 });
check(layer.stats().culled === 'size' && layer.stats().calls === 0, `from 5 trillion light-years it is a speck and is not drawn (${layer.stats().culled}, ${layer.stats().radiusPx} px)`);
{
  let mono = true;
  for (let r = C.CULL_PX; r < C.FADE_PX + 5; r += 0.5) if (C.tileFade(r + 0.5) < C.tileFade(r)) mono = false;
  check(C.tileFade(C.CULL_PX) === 0 && C.tileFade(C.FADE_PX) === 1 && mono, 'it fades out smoothly as it shrinks');
}
// a tap finds an object; its id finds it back
{
  stage.setWorld('galaxy');
  const target = T.ids.findIndex((x, i) => T.cls[i] === 3 && !T.inferred[i] && T.distLy[i] < 60000);
  const rec = layer.recordAt(target);
  const tp = new THREE.Vector3(); stage.toSceneInto(rec.pos, 'sun-inertial', tp, stage.tMs);
  look([tp.x * 0.5, tp.y * 0.5 + 0.2, tp.z * 0.5], [tp.x, tp.y, tp.z]);
  layer.frame({ camera: cam, renderer, stage, gain: 1 });
  check(layer.group.visible, 'the catalogue is drawn on the galaxy rung');
  const proj = tp.clone().project(cam);
  const hit = layer.pickAll(proj.x, proj.y, cam, { w: W, h: HPX }, 6);
  check(hit.length && hit.some((h) => h.record.id === rec.id), `a tap on a globular finds it (${hit.map((h) => h.record.id).join(', ')})`);
  check(layer.ownsId(rec.id) && layer.recordById(rec.id) === rec && layer.rowOfId('dso-m31') === -1 && !layer.ownsId('dso-lv-ngc0024'), 'its id finds it back, and not the map\'s own records');
}
// the shaders: nothing the compilers disagree on
{
  const src = readFileSync(join(JS, 'scene/deep/catalogue.js'), 'utf8');
  const frag = src.slice(src.indexOf('const FRAG_POINTS'), src.indexOf('const VERT_LINES'));
  check(!/pow\(/.test(frag), 'the fragment shader has no pow() (an undefined result for a negative base)');
  check((frag.match(/\{/g) || []).length === (frag.match(/\}/g) || []).length, 'its braces balance');
  check(C.GLYPHS.length === MAIN.classes.length && C.CLASS_COLOURS.length === MAIN.classes.length && C.GROUP_OF.length === MAIN.classes.length, 'one glyph, one colour and one group per class');
}
// the search field's rows (ui/searchrows.js): a designation fetches the catalogue once and its best rows are offered as extras
{
  const SR = await import(join(JS, 'ui/searchrows.js'));
  check(SR.wantCatalogue('saturn', async () => layer) === null && SR.wantCatalogue('', async () => layer) === null, 'a name that is not a designation fetches nothing');
  let asked = 0;
  const wait = SR.wantCatalogue('NGC 6397', async () => { asked += 1; return layer; });
  check(wait && typeof wait.then === 'function', 'a designation asks for the catalogue');
  await wait;
  check(SR.wantCatalogue('NGC 6397', async () => { asked += 1; return layer; }) === null && asked === 1, 'and asks once');
  const globular = T.parts[0].manifest.names.findIndex((nm, i) => /^NGC \d/.test(nm) && T.cls[i] === 3);
  const nm = T.parts[0].manifest.names[globular];
  const ex = SR.findExtras(nm.toLowerCase());
  check(ex.some((x) => x.extra === 'catalogue' && x.record === `dso-${T.ids[globular]}`), `"${nm.toLowerCase()}" is offered as a catalogue row (${ex.map((x) => x.extra + ':' + x.name).join(', ')})`);
  check(SR.findExtras('saturn').every((x) => x.extra !== 'catalogue'), 'other queries get no catalogue row');
  let selected = null;
  const ctx = { isLayerOn: () => true, setLayerOn() {}, recordById: () => null, wantDeep: async () => ({ loadCatalogue: async () => layer }), select: (r) => { selected = r; } };
  const hit = ex.find((x) => x.extra === 'catalogue');
  check(SR.runExtra(ctx, hit) === true, 'pressing the row is handled');
  await new Promise((r) => setTimeout(r, 20));
  check(selected && selected.id === hit.record, 'and selects the object once the catalogue is there');
}
layer.dispose();

if (problems.length) { console.error(problems.map((p) => `FAIL ${p}`).join('\n')); process.exit(1); }
console.log('catalogue: ok');
