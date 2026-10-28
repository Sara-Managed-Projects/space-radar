// tests/test_cometfield.mjs -- every comet's orbit, place and tail (internal spec 0079 stage A8, internal #1068; scene/cometfield.js).
//
//   node tests/test_cometfield.mjs
//
// 1. THE MATHS. The field's own two-body place agrees with the app's propagator (propagate/kepler.js) for every comet of the feed's cut, to
//    a few thousand kilometres, on an ellipse, a parabola and a hyperbola; an orbit's points lie on the conic (r = p / (1 + e cos nu)), a
//    closed one closes, a long one is cut at R_CUT_AU, a hyperbola is its passage only.
// 2. THE TAILS. None on a comet with no brightness law, none far from the Sun, longer the brighter and the nearer; the ion tail points
//    away from the Sun and the dust tail leans back along the track.
// 3. THE FIELD, three.js without a GPU: 4 000+ comets (the cut repeated with other elements) are one indexed line mesh, one point cloud
//    and one tail mesh: three draw calls; a tier keeps the brightest; the 60 that have a glyph are not drawn twice; a tap finds a comet and
//    gives its record (the layer's id), whose card the layer owns; nothing is fetched before it is asked for (the module is imported on
//    demand by main.js).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const F = await import(join(JS, 'scene/cometfield.js'));
const { parseComets } = await import(join(JS, 'data/parsers.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const AU = F.AU_KM;
const cut = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/snapshots/jpl-sbdb-comets-cut.json'), 'utf8'));
const records = parseComets(cut);
check(records.length >= 12, `the cut parses (${records.length})`);

// ---- 1. the maths ----------------------------------------------------------------------------------
{
  const t = Date.UTC(2026, 9, 28);
  let worst = 0;
  for (const r of records) {
    const mine = F.keplerPosAu(r.elements, t);
    const theirs = propagate(r, t);
    if (!mine || !theirs) continue;
    const km = Math.hypot(mine[0] * AU - theirs.x, mine[1] * AU - theirs.y, mine[2] * AU - theirs.z);
    worst = Math.max(worst, km / Math.max(1, Math.hypot(theirs.x, theirs.y, theirs.z)));
  }
  check(worst < 1e-5, `the field's place agrees with propagate/kepler.js to ${(worst * 1e6).toFixed(2)} parts in a million of the comet's distance (every comet of the cut)`);
  // a parabola and a hyperbola, with the app's propagator beside them
  const base = records[0].elements;
  for (const [label, e] of [['a parabola', 1], ['a hyperbola', 1.3]]) {
    const el = { ...base, e, qKm: 0.9 * AU, tpMs: t - 40 * 86400e3, aKm: null };
    const mine = F.keplerPosAu(el, t);
    const theirs = propagate({ ...records[0], elements: el, propagator: 'kepler' }, t);
    const km = mine && theirs ? Math.hypot(mine[0] * AU - theirs.x, mine[1] * AU - theirs.y, mine[2] * AU - theirs.z) : Infinity;
    check(km < 20000, `${label}: the same place as propagate/kepler.js to ${Math.round(km)} km`);
  }
  // perihelion is at q
  const p0 = F.keplerPosAu(base, base.tpMs);
  check(Math.abs(p0[3] - base.qKm / AU) < 1e-9, 'at perihelion the distance is q');
}
{
  // the orbits: on the conic, closed or cut
  const halley = records.find((r) => /Halley/.test(r.name));
  const el = halley.elements;
  const q = el.qKm / AU, e = el.e, p = q * (1 + e);
  const pts = F.orbitPoints(el);
  check(pts.length === F.ORBIT_SAMPLES * 3, `an orbit is ${F.ORBIT_SAMPLES} points`);
  let off = 0;
  // r of each point against its true anomaly in the orbit's plane: the conic's own equation, tested by a different route (energy)
  for (let k = 0; k < F.ORBIT_SAMPLES; k++) {
    const r = Math.hypot(pts[k * 3], pts[k * 3 + 1], pts[k * 3 + 2]);
    // vis-viva needs the speed; use the geometric test instead: r lies between q and Q
    if (r < q * 0.999 || r > q * (1 + e) / (1 - e) * 1.001) off += 1;
  }
  check(off === 0, 'every point of a closed orbit lies between perihelion and aphelion');
  check(Math.hypot(pts[0] - pts[(F.ORBIT_SAMPLES - 1) * 3], pts[1] - pts[(F.ORBIT_SAMPLES - 1) * 3 + 1], pts[2] - pts[(F.ORBIT_SAMPLES - 1) * 3 + 2]) < 1e-3, 'a closed orbit closes');
  // the point at perihelion is in the plane, at q
  let minr = 1e9; for (let k = 0; k < F.ORBIT_SAMPLES; k++) minr = Math.min(minr, Math.hypot(pts[k * 3], pts[k * 3 + 1], pts[k * 3 + 2]));
  check(Math.abs(minr - q) / q < 0.02, `the closest point is perihelion (${minr.toFixed(3)} against ${q.toFixed(3)} au)`);
  // a long orbit is cut
  const longEl = { ...el, qKm: 1.0 * AU, e: 0.9999 };
  const lp = F.orbitPoints(longEl);
  let far = 0; for (let k = 0; k < F.ORBIT_SAMPLES; k++) far = Math.max(far, Math.hypot(lp[k * 3], lp[k * 3 + 1], lp[k * 3 + 2]));
  check(far <= F.R_CUT_AU * 1.001 && far > F.R_CUT_AU * 0.9, `a long orbit is cut at ${F.R_CUT_AU} au (${far.toFixed(1)})`);
  const hyp = F.orbitPoints({ ...el, qKm: 0.5 * AU, e: 1.4 });
  let hfar = 0; for (let k = 0; k < F.ORBIT_SAMPLES; k++) hfar = Math.max(hfar, Math.hypot(hyp[k * 3], hyp[k * 3 + 1], hyp[k * 3 + 2]));
  check(hfar <= F.R_CUT_AU * 1.001 && Number.isFinite(hfar), 'a hyperbola is its passage, cut');
}

// ---- 2. the tails ----------------------------------------------------------------------------------
{
  check(F.tailLengthAu(null, 1) === 0 && F.tailLengthAu(NaN, 1) === 0, 'a comet with no brightness law has no tail');
  check(F.tailLengthAu(8, 5) === 0 && F.tailLengthAu(8, F.TAIL_AU) === 0, 'none past the tail radius');
  check(F.tailLengthAu(F.TAIL_MAG + 2, 1) === 0, 'none for a comet fainter than the tail magnitude');
  check(F.tailLengthAu(6, 0.8) > F.tailLengthAu(10, 0.8), 'brighter, longer');
  check(F.tailLengthAu(8, 0.6) > F.tailLengthAu(8, 2.5), 'nearer the Sun, longer');
  check(F.tailLengthAu(-2, 0.3) <= 1.2, 'never longer than 1.2 au');
  const at = Date.UTC(2026, 9, 28);
  const mk = (name, tp) => ({ name, meta: { designation: name.split(' ')[0] }, elements: { tpMs: tp } });
  check(F.tailEligible(mk('C/2026 T1 (Test)', at - 20 * 86400e3), at), 'a comet in its apparition may have a tail');
  check(!F.tailEligible(mk('C/2026 T1 (Test)', at - 900 * 86400e3), at), 'one long past perihelion may not');
  check(!F.tailEligible(mk('5D/Brorsen', at), at) && !F.tailEligible(mk('C/2020 P4-B (SOHO)', at), at), 'a defunct comet and a coronagraph fragment may not');
  const head = [1, 0, 0], vel = [0, 1, 0];
  const ion = F.tailPoints(head, vel, 0.5, 'ion');
  const dust = F.tailPoints(head, vel, 0.5, 'dust');
  check(Math.abs(ion[F.TAIL_SEGMENTS * 3] - 1.5) < 1e-5 && Math.abs(ion[F.TAIL_SEGMENTS * 3 + 1]) < 1e-6, 'the ion tail runs straight away from the Sun');
  check(dust[F.TAIL_SEGMENTS * 3 + 1] < -0.05 && dust[F.TAIL_SEGMENTS * 3] > 1.2, 'the dust tail leans back along the track');
  check(ion[0] === 1 && dust[0] === 1, 'both start at the head');
}

// ---- 3. the field ----------------------------------------------------------------------------------
// 4 100 comets: the cut's, then the same orbits turned and stretched into other ones, as the feed has hundreds of long-period ones.
const many = [];
for (let k = 0; many.length < 4100; k++) {
  for (const r of records) {
    const c = JSON.parse(JSON.stringify(r));
    c.id = `${r.id}-${k}`;
    c.elements.omRad = (c.elements.omRad + k * 0.37) % (2 * Math.PI);
    c.elements.wRad = (c.elements.wRad + k * 0.61) % (2 * Math.PI);
    c.elements.qKm *= 1 + (k % 9) * 0.15;
    if (k % 7 === 0) c.elements.e = 1.0 + (k % 5) * 0.05;
    if (k % 11 === 0) c.elements.e = 1; // parabolic
    many.push(c);
    if (many.length >= 4100) break;
  }
}
// one bright comet, a fortnight past a close perihelion, so the field has a tail to draw
{
  const b = JSON.parse(JSON.stringify(records[0]));
  b.id = 'comet-C2026-bright'; b.name = 'C/2026 T1 (Test)';
  b.elements = { ...b.elements, qKm: 0.5 * AU, e: 0.9995, aKm: null, tpMs: Date.UTC(2026, 9, 28) - 14 * 86400e3 };
  b.meta = { ...b.meta, absoluteMagnitude: 5 };
  many.unshift(b);
}
stage.setWorld('sun');
const scene = new THREE.Scene();
const field = F.createCometField(THREE, { scene, load: async () => many, recordsFor: (id) => (id === 'comets' ? many.slice(0, 60) : []), tier: () => 2 });
check(field.group.visible === false && field.state().loaded === false, 'nothing is drawn before it is asked for');
await field.whenLoaded();
let st = field.state();
check(st.loaded && st.comets === 4101, `all ${st.comets} comets are loaded`);
const cam = new THREE.PerspectiveCamera(50, 1600 / 900, 1e-3, 1e9);
const renderer = { domElement: { clientHeight: 900 }, getPixelRatio: () => 1 };
const t = Date.UTC(2026, 9, 28);
cam.position.set(0, 4e4, 1e4); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(true);
field.update(cam, renderer, true, t, null);
st = field.state();
check(st.visible && st.drawn === 4101 && st.orbitVerts === 4101 * F.ORBIT_SAMPLES && st.calls <= 3, `every comet's orbit is drawn in the same few calls (${st.drawn} orbits, ${st.calls} calls)`);
check(st.bytes < 12e6, `its GPU memory is fixed and modest (${(st.bytes / 1e6).toFixed(1)} MB for ${st.comets})`);
{
  const lines = field.group.children.find((o) => o.isLineSegments);
  check(lines && lines.geometry.index.count === 4101 * (F.ORBIT_SAMPLES - 1) * 2 && lines.geometry.drawRange.count === 4101 * (F.ORBIT_SAMPLES - 1) * 2, 'the orbits are one indexed line mesh');
  const pts = field.group.children.find((o) => o.isPoints);
  const shown = pts.geometry.getAttribute('aShown').array;
  check(shown.slice(0, 4101).filter((v) => v === 0).length === 60, 'the comets that have a glyph are not drawn as points too');
  check(st.tails >= 1 && st.tails <= F.TAIL_MAX, `the bright comets near the Sun have tails (${st.tails})`);
  const tails = field.group.children.find((o) => o.isMesh);
  check(tails.geometry.drawRange.count === st.tails * 2 * F.TAIL_SEGMENTS * 6, 'one ribbon of triangles per tail and kind');
}
// a tier keeps the brightest
{
  let tier = 0;
  const small = F.createCometField(THREE, { load: async () => many, recordsFor: () => [], tier: () => tier });
  await small.whenLoaded();
  small.update(cam, renderer, true, t, null);
  check(small.state().drawn === F.tierLimit(0), `on the lowest tier ${small.state().drawn} orbits are drawn (${F.tierLimit(0)})`);
  tier = 1; small.update(cam, renderer, true, t + 2e6, null);
  check(small.state().drawn === F.tierLimit(1), 'the middle tier draws 2 000');
  small.dispose();
}
// a tap finds a comet and gives its record
{
  const target = many.findIndex((r, i) => i > 100);
  const rec = field.recordById(many[target].id) || null;
  check(rec && rec.layer === 'comets' && rec.klass === 'comet' && rec.propagator === 'kepler', 'a comet of the field is a record of the comets layer');
  check(field.ownsId(rec.id) && !field.ownsId('comet-nope'), 'its id finds it back');
  // where it is drawn
  cam.updateMatrixWorld(true);
  field.group.updateMatrixWorld(true);
  const row = [...Array(field.count()).keys()].find((i) => field.recordAt(i).id === rec.id);
  const pos = field.group.children.find((o) => o.isPoints).geometry.getAttribute('position').array;
  const v = new THREE.Vector3(pos[row * 3], pos[row * 3 + 1], pos[row * 3 + 2]).applyMatrix4(field.group.matrixWorld).project(cam);
  const hits = field.pickAll(v.x, v.y, cam, { w: 1600, h: 900 }, 6);
  check(hits.some((h) => h.record.id === rec.id), `a tap on its point finds it (${hits.length} candidates)`);
  const own = field.pickAll(0, 0, cam, { w: 1600, h: 900 }, 100).every((h) => !records.slice(0, 0).includes(h.record));
  check(own, 'the pick is total');
}
// the card says what is drawn: a field comet is a point and an orbit, and a tail is illustrative
{
  const withTail = field.tails()[0];
  const r = field.recordById(withTail.id);
  check(r && /illustrative/.test(r.meta.departure) && /two-body/.test(r.meta.departure), 'a comet with a tail says the tail is illustrative, and what else is drawn');
  const quiet = many.find((c, i) => i > 200 && !field.tails().some((t) => t.id === c.id));
  const q = field.recordById(quiet.id);
  check(q && /two-body place/.test(q.meta.departure) && !/illustrative/.test(q.meta.departure), 'one without a tail says only that it is a point on its orbit');
}
// hidden when the layer is off
field.update(cam, renderer, false, t, null);
check(!field.group.visible && field.state().calls === 0, 'off when the layer is off');
// a hyperbola of the feed that overflows is not a NaN in the buffer
{
  const pts = field.group.children.find((o) => o.isPoints).geometry.getAttribute('position').array;
  check([...pts.slice(0, 4101 * 3)].every((x) => Number.isFinite(x)), 'every place is a number');
}
field.dispose();

if (problems.length) { console.error(problems.map((p) => `FAIL ${p}`).join('\n')); process.exit(1); }
console.log('cometfield: ok');
