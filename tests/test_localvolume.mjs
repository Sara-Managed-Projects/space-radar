// tests/test_localvolume.mjs -- the local volume's tile, its honesty, its bounds, and the precision of
// the cosmic stage (internal spec 0075 stage e: task 16, DS-D04, DS-D06; task 17, DS-D09, DS-D10).
//
//   node tests/test_localvolume.mjs
//
// 1. THE TILE. site/data/deep/localvolume.{bin,json}: the manifest's hash is the file's, it is small,
//    every galaxy has a direction, a distance, a range and a method, and a galaxy whose distance is
//    only inferred (its group's, its velocity's) is drawn as a LINE over its range, never a point.
//    No galaxy of the tile is a deep-sky record drawn twice, and nothing the map draws as a measured
//    place lies past the horizon (data/cosmology.js horizonLy).
// 2. THE LAYER (scene/deep/localvolume.js), with three.js and no GPU: one draw call (two while one range
//    is shown), no line of range in a default view, fading as it shrinks, culled whole by the
//    frustum and by its size on the screen, memory fixed.
// 3. PRECISION, as tests/test_follow_steady.mjs measures it: what the GPU draws in float32 against what
//    float64 says, in pixels, over 180 frames of a slow orbit, with the camera 1 million light-years from
//    a galaxy of the tile, 1 billion light-years from the Sun, at the 50 billion light-year edge, and 1
//    selected TON 618 (18.3 billion light-years out) where main.js meets it: on the local-group stage, a
//    thousandth of its distance away (scene/camera.js steadyDistance). Under a quarter of a pixel, or
//    the selection's brackets and its dot part. From 0.4 units, where every exotic used to be met, TON
//    618 wandered 4 px: the test says so, so a change back is caught.
// 4. THE EDGE: the wheel stops at 50 billion light-years on every stage.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const LV = await import(join(JS, 'scene/deep/localvolume.js'));
const { horizonLy } = await import(join(JS, 'data/cosmology.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { createCameraRig, EDGE_LY, edgeDistance, steadyDistance } = await import(join(JS, 'scene/camera.js'));
const { EDGE_KM } = await import(join(JS, 'scene/handoff.js'));
const { EXOTICS } = await import(join(JS, 'data/exotics.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const LY_KM = 9460730472580.8;
const MLY_KM = LY_KM * 1e6;

// ---- 1. the tile ---------------------------------------------------------------------------------
const BIN = readFileSync(join(ROOT, 'site/data/deep/localvolume.bin'));
const MAN = JSON.parse(readFileSync(join(ROOT, 'site/data/deep/localvolume.json'), 'utf8'));
const buffer = BIN.buffer.slice(BIN.byteOffset, BIN.byteOffset + BIN.byteLength);
const tile = LV.parseTile(buffer);
const T = MAN.tiles[0];
check(createHash('sha256').update(BIN).digest('hex') === T.sha256, 'the manifest\'s sha256 is the tile\'s');
check(T.bytes === BIN.byteLength && T.count === tile.count && MAN.names.length === tile.count, `the manifest counts the tile (${T.count} rows, ${tile.count} read, ${MAN.names.length} names)`);
const fileBytes = BIN.byteLength + Buffer.byteLength(JSON.stringify(MAN));
check(fileBytes <= BUDGETS.deep_localvolume_bytes, `the tile and its manifest are within the budget (${fileBytes} B of ${BUDGETS.deep_localvolume_bytes}; registry/budgets.yaml deep_localvolume_bytes)`);
check(tile.count >= 700 && tile.count <= 900, `about 800 galaxies of the local volume (${tile.count})`);
{
  const { WE_SHOW } = await import(join(JS, 'data/ladder.js'));
  const row = (WE_SHOW || []).find((r) => /nearby galaxies/.test(r.what));
  check(row && row.n === tile.count, `the "how far" panel's honesty row counts the tile (${row && row.n} against ${tile.count})`);
}
check(/Karachentsev/.test(MAN.source.name) && /J\/AJ\/145\/101/.test(MAN.source.vizier) && MAN.source.terms_read && MAN.source.credit, 'the source, its terms as read and its credit travel with the tile');
let inferred = 0;
let bad = 0;
const H = horizonLy() / 1e6;
let far = 0;
for (let i = 0; i < tile.count; i++) {
  const g = LV.rowOf(tile, i);
  const m = MAN.methods[g.method];
  const unit = Math.hypot(...g.dir);
  if (!(Math.abs(unit - 1) < 1e-5) || !(g.loMly > 0 && g.loMly <= g.dMly && g.dMly <= g.hiMly) || !m) { bad += 1; continue; }
  if (g.inferred !== (m.kind === 'inferred')) bad += 1;
  if (g.inferred) {
    inferred += 1;
    // the catalogue's "about 2 Mpc" either side, never nearer than a fifth of the distance
    if (!(Math.abs(g.hiMly - g.dMly - 2 * 3.2615637771674333) < 1e-3)) bad += 1;
  }
  far = Math.max(far, g.hiMly);
}
check(bad === 0, `every galaxy has a unit direction, a distance inside its range and a known method (${bad} do not)`);
check(inferred === T.lines && tile.count - inferred === T.points, `the manifest counts ${inferred} galaxies with an inferred distance and ${tile.count - inferred} measured`);
check(far < 200 && far < H, `the tile ends at ${far.toFixed(1)} million light-years: nothing near the horizon (${(H / 1000).toFixed(1)} billion)`);
// Nothing drawn as a measured place past the horizon: the exotics (TON 618 the farthest) and the tile.
for (const e of EXOTICS) check(!(Number(e.distLy) >= horizonLy()), `${e.name} is not past the horizon (${e.distLy} ly)`);
// One galaxy, one mark: none of the tile is a deep-sky record (the same rule as the build's, by place and depth).
{
  const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects.filter((o) => o.kind === 'galaxy');
  const sep = (ra1, de1, ra2, de2) => { const r = Math.PI / 180; const c = Math.sin(de1 * r) * Math.sin(de2 * r) + Math.cos(de1 * r) * Math.cos(de2 * r) * Math.cos((ra1 - ra2) * r); return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI * 60; };
  const e = 23.4392911 * Math.PI / 180;
  let twins = 0;
  for (let i = 0; i < tile.count; i++) {
    const g = LV.rowOf(tile, i);
    const [x, ye, ze] = g.dir; // ecliptic -> equatorial
    const y = ye * Math.cos(e) - ze * Math.sin(e), z = ye * Math.sin(e) + ze * Math.cos(e);
    const ra = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360, dec = Math.asin(z) * 180 / Math.PI;
    for (const o of dso) if (sep(ra, dec, o.raDeg, o.decDeg) < 1.0 && Math.abs(Math.log(g.dMly * 1e6 / o.distLy)) < Math.log(1.5)) twins += 1;
  }
  check(twins === 0, `no galaxy of the tile is also a deep-sky record within an arcminute (${twins})`);
}

// ---- 2. the layer --------------------------------------------------------------------------------
stage.setWorld('local-group');
const layer = LV.createLayer(THREE, { load: async () => ({ manifest: MAN, buffer }) });
await layer.whenLoaded();
check(layer.ready() && layer.stats().loaded, `the layer loads from the tile (${layer.stats().failed || 'ok'})`);
const W = 1600, HPX = 900;
const cam = new THREE.PerspectiveCamera(50, W / HPX, 1e-5, 1e9);
const renderer = { domElement: { clientHeight: HPX }, getPixelRatio: () => 1 };
const look = (from, at) => { cam.position.set(...from); cam.up.set(0, 1, 0); cam.lookAt(new THREE.Vector3(...at)); cam.updateMatrixWorld(true); };
look([0, 5, 30], [0, 0, 0]);
layer.frame({ camera: cam, renderer, stage, gain: 1 });
let s = layer.stats();
check(s.culled === null && layer.group.visible && s.calls === 1 && s.inferred === inferred && s.rangeShown === -1, `from 30 Mly the tile is one draw call with no range drawn (${s.calls} calls, ${s.inferred} inferred as points, range ${s.rangeShown})`);
{
  // No line in a default view (review of #1182: 280 ranges read as streaks): every galaxy is a point, the
  // inferred ones fainter, wider and grey-blue; a range only for the one asked for.
  const lineObj = layer.group.children.find((o) => o.isLineSegments);
  check(lineObj && !lineObj.visible, 'the range line is hidden by default');
  const pts = layer.group.children.find((o) => o.isPoints);
  check(pts && pts.geometry.getAttribute('position').count === tile.count, `every galaxy is a point (${pts && pts.geometry.getAttribute('position').count})`);
  check(LV.INFERRED_LIGHT < 1 && LV.INFERRED_SIZE > 1 && LV.INFERRED_COLOUR.join() !== '0.95,0.95,1', 'an inferred galaxy is dimmer, wider and in its own swatch');
  let k = -1; for (let i = 0; i < tile.count && k < 0; i++) if (LV.rowOf(tile, i).inferred) k = i;
  check(layer.showRange(k) && lineObj.visible, 'one inferred galaxy\'s range can be shown');
  layer.frame({ camera: cam, renderer, stage, gain: 1 });
  check(layer.stats().calls === BUDGETS.deep_localvolume_draw_calls, `with a range shown the tile is ${BUDGETS.deep_localvolume_draw_calls} draw calls at most (registry/budgets.yaml deep_localvolume_draw_calls)`);
  let m = -1; for (let i = 0; i < tile.count && m < 0; i++) if (!LV.rowOf(tile, i).inferred) m = i;
  check(!layer.showRange(m) && !lineObj.visible && layer.showRange(-1) === false, 'a measured galaxy has no range line, and -1 clears it');
}
check(s.bytes > 0 && s.bytes < 100000, `its GPU attributes are fixed and small (${s.bytes} B)`);
look([0, 0, 300], [0, 0, 600]);
layer.frame({ camera: cam, renderer, stage, gain: 1 });
check(layer.stats().culled === 'frustum' && !layer.group.visible, `looking away from it, the frustum culls it (${layer.stats().culled})`);
look([0, 0, 50000], [0, 0, 0]);
layer.frame({ camera: cam, renderer, stage, gain: 1 });
check(layer.stats().culled === 'size' && layer.stats().calls === 0, `from 50 billion light-years it is a speck and is not drawn (${layer.stats().culled}, ${layer.stats().radiusPx} px)`);
// It fades out as it shrinks, never a pop: full from FADE_PX, none at CULL_PX, monotonic between.
{
  let mono = true;
  for (let r = LV.CULL_PX; r < LV.FADE_PX + 5; r += 0.5) if (LV.tileFade(r + 0.5) < LV.tileFade(r)) mono = false;
  check(LV.tileFade(LV.CULL_PX) === 0 && LV.tileFade(LV.FADE_PX) === 1 && LV.tileFade(1e6) === 1 && mono && LV.FADE_PX >= 8 * LV.CULL_PX, `the tile fades from ${LV.FADE_PX} px down to ${LV.CULL_PX} px, smoothly`);
  look([0, 0, 4000], [0, 0, 0]);
  layer.frame({ camera: cam, renderer, stage, gain: 1 });
  const f = layer.stats();
  check(f.culled === null && f.fade > 0 && f.fade < 1, `from 4 billion light-years it is drawn part-faded (${f.radiusPx} px, ${f.fade})`);
}
const g0 = layer.galaxy(0);
check(g0 && g0.name && g0.method && g0.method.code && g0.method.words, 'each galaxy answers its name and its method in words');

// ---- 3. precision ---------------------------------------------------------------------------------
const f32 = (m) => { const o = new THREE.Matrix4(); o.elements = Array.from(new Float32Array(m.elements)); return o; };
const toPx = (v) => ({ x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * HPX });
/** As the GPU: modelView (float64 product, uploaded float32) times a float32 attribute. */
const drawnPx = (c, model, xyz) => {
  const mv = new THREE.Matrix4().multiplyMatrices(c.matrixWorldInverse, model);
  const v = new THREE.Vector3(Math.fround(xyz[0]), Math.fround(xyz[1]), Math.fround(xyz[2])).applyMatrix4(f32(mv)).applyMatrix4(f32(c.projectionMatrix));
  return toPx(v);
};
const exactPx = (c, model, xyz) => toPx(new THREE.Vector3(...xyz).applyMatrix4(model).applyMatrix4(c.matrixWorldInverse).applyMatrix4(c.projectionMatrix));
const spread = (pts) => Math.hypot(Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y)));
const STEADY_PX = 0.25;

/** 180 frames of a slow orbit round `targetScene` at `dist` units: the dot's wander and its gap from float64. */
function orbit(targetScene, dist, model, xyz) {
  const c = new THREE.PerspectiveCamera(50, W / HPX, 1e-5, 1e9);
  const rig = createCameraRig(c, null);
  rig.flyTo({ targetScene, distance: dist, ms: 0 });
  rig.update(0.016, 16);
  const dots = [];
  let gap = 0;
  for (let i = 0; i < 180; i++) {
    rig.flyTo({ azimuth: rig.state.azimuth + 0.0007, polar: rig.state.polar, distance: dist, ms: 0 });
    rig.update(0.016, 16);
    c.updateMatrixWorld(true);
    const d = drawnPx(c, model, xyz);
    const e = exactPx(c, model, xyz);
    dots.push(d);
    gap = Math.max(gap, Math.hypot(d.x - e.x, d.y - e.y));
  }
  return { wander: spread(dots), gap, distance: rig.state.distance };
}
const I = new THREE.Matrix4();
// a galaxy of the tile, 1 Mly away: the layer's own matrix and float32 attribute
{
  let k = 0; let best = 0;
  for (let i = 0; i < tile.count; i++) { const g = LV.rowOf(tile, i); if (!g.inferred && g.dMly > best && g.dMly < 40) { best = g.dMly; k = i; } }
  const g = LV.rowOf(tile, k);
  const xyz = g.dir.map((v) => v * g.dMly);
  const model = layer.group.matrixWorld.clone();
  const at = new THREE.Vector3(...xyz).applyMatrix4(model);
  const r = orbit(at, 1, model, xyz);
  check(r.wander < STEADY_PX && r.gap < STEADY_PX, `a tile galaxy ${g.dMly.toFixed(1)} Mly out, seen from 1 Mly: it wanders ${r.wander.toFixed(3)} px, ${r.gap.toFixed(3)} px off float64 (under ${STEADY_PX})`);
}
// the Sun from 1 Gly and from the edge
for (const [ly, name] of [[1e9, '1 billion'], [5e10, '50 billion']]) {
  const r = orbit(new THREE.Vector3(0, 0, 0), ly * LY_KM / stage.unitKm, I, [0, 0, 0]);
  check(r.wander < STEADY_PX && r.gap < STEADY_PX, `the Sun from ${name} light-years: it wanders ${r.wander.toFixed(3)} px, ${r.gap.toFixed(3)} px off float64`);
}
// a record far out, as the glyph layer holds it (absolute scene units in float32): TON 618 from 1 Mly
{
  const ton = EXOTICS.find((x) => x.id === 'ton-618');
  const ra = ton.raDeg * Math.PI / 180, dec = ton.decDeg * Math.PI / 180, e = 23.4392911 * Math.PI / 180, r = ton.distLy * LY_KM;
  const ex = Math.cos(dec) * Math.cos(ra), ey = Math.cos(dec) * Math.sin(ra), ez = Math.sin(dec);
  const at = stage.toScene({ x: ex * r, y: (ey * Math.cos(e) + ez * Math.sin(e)) * r, z: (-ey * Math.sin(e) + ez * Math.cos(e)) * r }, 'sun-inertial');
  const old = orbit(at, 0.4, I, [at.x, at.y, at.z]);
  check(old.wander > 1, `TON 618 met from 0.4 units, as every exotic was, wanders ${old.wander.toFixed(2)} px (the fault this guards against is reproduced)`);
  const d = Math.max(0.4, steadyDistance(at.length()));
  const res = orbit(at, d, I, [at.x, at.y, at.z]);
  check(res.wander < STEADY_PX && res.gap < STEADY_PX, `TON 618 (${(ton.distLy / 1e9).toFixed(1)} Gly) met from ${d.toFixed(1)} Mly: its dot wanders ${res.wander.toFixed(3)} px and is ${res.gap.toFixed(3)} px off float64 (under ${STEADY_PX})`);
  console.log(`  TON 618: from 0.4 Mly it wandered ${old.wander.toFixed(2)} px; from ${d.toFixed(1)} Mly ${res.wander.toFixed(3)} px`);
}

// ---- 4. the edge ----------------------------------------------------------------------------------
check(Math.abs(EDGE_KM / (EDGE_LY * LY_KM) - 1) < 1e-12 && EDGE_LY === 5e10, `the climb's edge and the wheel's are both 50 billion light-years (${EDGE_KM} km)`);
check(EDGE_LY > horizonLy() && EDGE_LY < horizonLy() * 1.1, 'the edge is a little past the horizon: the band between is the illustration');
for (const id of ['local-group', 'galaxy', 'stellar']) {
  stage.setWorld(id);
  const c = new THREE.PerspectiveCamera(50, W / HPX, 1e-5, 1e9);
  const rig = createCameraRig(c, null);
  rig.flyTo({ targetScene: new THREE.Vector3(0, 0, 0), distance: 1e30, ms: 0 });
  rig.update(0.016, 16);
  const ly = rig.state.distance * stage.unitKm / LY_KM;
  check(Math.abs(ly / EDGE_LY - 1) < 1e-9 && Math.abs(edgeDistance(stage.unitKm) - rig.state.distance) < 1e-6 * rig.state.distance, `on the ${id} stage the wheel stops at the edge (${(ly / 1e9).toFixed(3)} billion light-years)`);
}
stage.setWorld('earth');

if (problems.length) {
  console.error(`localvolume: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`localvolume ok: ${tile.count} galaxies (${tile.count - inferred} points, ${inferred} inferred as fainter points, a range only on request), ${fileBytes} B with the manifest, one draw call, fading then culled by size, culled by frustum; steady to ${STEADY_PX} px at 1 Mly, 1 Gly and 50 Gly; the wheel stops at 50 billion light-years`);
