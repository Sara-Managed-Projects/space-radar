// tests/test_landing_sites.mjs -- the places a machine came down, from registry/sites.yaml to the
// screen. Twenty-one of them arrived on 2026-09-22, making thirty drawn on the Moon and Mars, and
// each has five ways to be wrong that a validator reading the YAML cannot see:
//
//   1. THE RECORD IS NOT THE ROW. data/sample.js used to hold a hand-ported copy of every site;
//      it now builds the records from the generated mirror, and this is the check the old port
//      never had: one record per row, same numbers, same world.
//   2. IT IS NOT ON ITS WORLD. A body-fixed coordinate in the wrong frame lands on Earth, or at
//      Earth's radius around the Moon -- both have happened in this repository (scene/stage.js).
//   3. IT IS DRAWN AS SOMETHING ELSE. A surface row that matched no model was drawn as a launch
//      pad: Curiosity, InSight, Zhurong and Chang'e 4 all were, under a card saying "a generic
//      ground site". Every landing now has to reach a lander, a rover or the lunar module.
//   4. THE CARD SAYS SOMETHING ELSE. The row's own sentence first, the world named, and a
//      stand-in shape that admits it is one.
//   5. NOBODY CAN FIND IT. A site in no search result is a site nobody visits.
//
// Plus the geometry nobody would check by eye: a far-side site really faces away from Earth, and
// flying to a near-side one does not park the camera inside the Moon.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { SITES } = await import(join(JS, 'data/sites.js'));
const { handKeptSites, sampleOddities, sampleDeepSpace, sampleAsteroids, sampleReentries } = await import(join(JS, 'data/sample.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { toStage } = await import(join(JS, 'propagate/frames.js'));
const { worldPositionKm, WORLD_RADIUS_KM } = await import(join(JS, 'propagate/body.js'));
const { realModelFor, REAL_MODELS } = await import(join(JS, 'scene/realmodels.js'));
const { modelFor, builderKlass, disposeModels } = await import(join(JS, 'scene/models.js'));
const { firstSentence, rightNowFor, drawingLine } = await import(join(JS, 'ui/cards.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { worldRecords, positionOf } = await import(join(JS, 'scene/worlds.js'));
const { nadirOf, standOnGround, altitudeCapApplies } = await import(join(JS, 'scene/heroes.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const tMs = Date.parse('2026-03-15T12:00:00.000Z');

const records = handKeptSites();
const byId = new Map(records.map((r) => [r.id, r]));
const landings = records.filter((r) => r.meta && r.meta.siteKind === 'surface');

// ------------------------------------------------------------------------ 1. the row is the record
const rowsDrawn = SITES.filter((row) => row.record !== false);
check(records.length === rowsDrawn.length, `${rowsDrawn.length} sites.yaml rows are records and handKeptSites() returns ${records.length}`);
check(records.length === byId.size, 'two records share an id');
for (const row of rowsDrawn) {
  const r = byId.get(row.id);
  if (!r) { problems.push(`ROW      ${row.id} is in sites.yaml and is not a record`); continue; }
  check(r.name === row.display, `ROW      ${row.id} is named ${JSON.stringify(r.name)}, the row says ${JSON.stringify(row.display)}`);
  check(r.fixed.latDeg === row.lat && r.fixed.lonDeg === row.lon,
    `ROW      ${row.id} is at ${r.fixed.latDeg}, ${r.fixed.lonDeg} and the row says ${row.lat}, ${row.lon}`);
  check(r.frame === `${row.world}-fixed`, `ROW      ${row.id} is in ${r.frame}, on a row that says ${row.world}`);
  check(r.meta.doing === row.doing, `ROW      ${row.id} lost its sentence`);
  check(r.cls === 'measured', `ROW      ${row.id} is ${r.cls}; a published coordinate is measured, not a sample`);
}
for (const row of SITES.filter((x) => x.record === false)) {
  check(!byId.has(row.id), `ROW      ${row.id} says record: false and is a record anyway`);
}
// And the mirror is the YAML: gen_sites_js.py --check proves bytes, this proves the count a
// reader of the YAML would get, so a row the generator silently dropped would show here too.
const yamlRows = (readFileSync(join(ROOT, 'registry/sites.yaml'), 'utf8').match(/^ {2}- (\{id: |id: )/gm) || []).length;
check(yamlRows === SITES.length, `registry/sites.yaml has ${yamlRows} rows and the mirror ${SITES.length}`);

// -------------------------------------------------------------------- 2. on its own world's surface
for (const r of landings) {
  const world = r.meta.world;
  const p = propagate(r, tMs);
  if (!p) { problems.push(`WORLD    ${r.id} has no position`); continue; }
  check(p.frame === `${world}-fixed`, `WORLD    ${r.id} answers in ${p.frame}, not ${world}-fixed`);
  const km = Math.hypot(p.x, p.y, p.z);
  if (Math.abs(km - WORLD_RADIUS_KM[world]) > 0.5) {
    problems.push(`WORLD    ${r.id} is ${km.toFixed(1)} km from the centre of ${world}, whose radius is ${WORLD_RADIUS_KM[world]}`);
  }
  // The body-fixed vector's own latitude and longitude are the row's. A frame that swapped an
  // axis or read west for east would keep the radius and fail this.
  const lat = (Math.asin(p.z / km) * 180) / Math.PI;
  let lon = (Math.atan2(p.y, p.x) * 180) / Math.PI;
  const want = ((r.fixed.lonDeg % 360) + 360) % 360;
  lon = ((lon % 360) + 360) % 360;
  let dLon = Math.abs(lon - want);
  if (dLon > 180) dLon = 360 - dLon;
  check(Math.abs(lat - r.fixed.latDeg) < 1e-6 && dLon < 1e-6,
    `WORLD    ${r.id} comes back as ${lat.toFixed(5)}, ${lon.toFixed(5)} from a row at ${r.fixed.latDeg}, ${r.fixed.lonDeg}`);
}

// ------------------------------------------------------ the near side, the far side, and the pole
// Seen from the Moon's centre, the site dotted with the direction to Earth. Libration moves this by
// a few degrees, so only sites clearly on one side are held to it: IM-1 at 80 S sits on the limb.
const moonKm = worldPositionKm('moon', tMs, 'earth-inertial');
const facing = (rec) => {
  const p = propagate(rec, tMs);
  const g = p && toStage(rec, p, { worldId: 'earth', frame: 'earth-inertial', tMs }, tMs);
  if (!g || !moonKm) return NaN;
  const s = { x: g.x - moonKm.x, y: g.y - moonKm.y, z: g.z - moonKm.z };
  const rs = Math.hypot(s.x, s.y, s.z);
  const rm = Math.hypot(moonKm.x, moonKm.y, moonKm.z);
  return -(s.x * moonKm.x + s.y * moonKm.y + s.z * moonKm.z) / (rs * rm);
};
let sided = 0;
for (const r of landings.filter((x) => x.meta.world === 'moon')) {
  const la = (r.fixed.latDeg * Math.PI) / 180;
  const lo = (r.fixed.lonDeg * Math.PI) / 180;
  const nominal = Math.cos(la) * Math.cos(lo); // +1 at the sub-Earth point, -1 opposite it
  if (Math.abs(nominal) < 0.35) continue;
  const got = facing(r);
  sided += 1;
  check(Math.sign(got) === Math.sign(nominal),
    `SIDE     ${r.id} should be on the ${nominal > 0 ? 'near' : 'far'} side (cos to Earth ${nominal.toFixed(2)}), got ${got.toFixed(2)}`);
}
check(sided >= 15, `only ${sided} lunar sites were clearly on one side; the check means nothing`);
check(facing(byId.get('change-6')) < -0.5, "Chang'e 6 is the far side's first sample return, and it must face away from Earth");

// ------------------------------------------------------------ 3. drawn as what landed, never a pad
const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
const budgetOf = (id) => Number(((yaml.split('\n').find((l) => l.includes(`id: ${id},`)) || '').match(/budget_tris:\s*(\d+)/) || [])[1] || 0);
const trisOf = (obj) => {
  let n = 0;
  obj.traverse((m) => { if (m.isMesh) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
  return n;
};
const shapes = {};
for (const r of landings) {
  const shape = r.meta.siteShape;
  shapes[shape] = (shapes[shape] || 0) + 1;
  const entry = realModelFor(r);
  if (!shape) { problems.push(`DRAWN    ${r.id} has no shape and would be drawn as a launch pad`); continue; }
  if (!entry) { problems.push(`DRAWN    ${r.id} says ${shape} and matches no model route -- it would be drawn as a launch pad`); continue; }
  check(entry.file !== 'pad.glb' && entry.build !== 'pad', `DRAWN    ${r.id} is routed to a launch pad`);
  if (shape === 'lunar-module') {
    // A row saying lunar-module with no bySite entry would fall to... nothing, and be a pad.
    check(REAL_MODELS.bySite[r.id] && entry.file === 'lunar-module.glb' && !entry.generic,
      `DRAWN    ${r.id} says lunar-module and is drawn with ${JSON.stringify(entry)}; add it to realmodels.js bySite`);
  } else if (REAL_MODELS.bySite[r.id]) {
    // A model of the vehicle itself (Perseverance) outranks the stand-in, as it should.
    check(Boolean(entry.file), `DRAWN    ${r.id} has a bySite entry with no file`);
  } else {
    check(entry.build === shape && entry.generic === true,
      `DRAWN    ${r.id} says ${shape} and is routed to ${JSON.stringify(entry)}`);
    const obj = modelFor(builderKlass(r.klass, entry.build), entry.build, { record: r });
    check(!obj.userData.generic, `DRAWN    ${r.id}: modelFor has no ${entry.build} shape and fell back to a satellite`);
    disposeModels(obj);
  }
}
for (const [shape, id] of [['lander', 'lander-generic'], ['rover', 'rover-generic']]) {
  const obj = modelFor('site', shape);
  const tris = trisOf(obj);
  const budget = budgetOf(id);
  check(budget > 0, `BUDGET   registry/models.yaml has no budget_tris for ${id}`);
  check(tris <= budget, `BUDGET   site:${shape} is ${tris} tris, over ${id}'s budget_tris ${budget}`);
  // heroes.js sizes a model by a pixel target on the assumption it is one unit across, and the
  // GLBs are normalised to exactly that: a stand-in built smaller is drawn smaller than its
  // neighbours, which is how the rover would have come out at two fifths of a lander.
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z);
  check(Math.abs(span - 1) <= 0.06, `UNIT     site:${shape} is ${span.toFixed(3)} units across, not one`);
  disposeModels(obj);
}

// ------------------------------------------------------------------ standing up on its own world
// scene/heroes.js stands a site's model along "away from the centre", and until 2026-09-22 the
// centre was the stage origin for every model: from the Earth stage each lunar lander was stood up
// away from the EARTH, 42 to 164 degrees off its own vertical (Apollo 11's LM at 153). nadirOf now
// takes the centre of the world the site is on. Checked from the Earth stage, where the two differ,
// against the world's true centre -- the Moon is drawn where it is -- and for Mars against a disc
// put somewhere else entirely, because Mars is drawn compressed and a site stands on the DISC.
{
  const at = (id) => { const w = positionOf(id, tMs); return w && stage.toScene(w, w.frame, tMs); };
  const moonAt = at('moon');
  const marsDisc = new THREE.Vector3(1234, -56, 789);
  const centreOf = (id, out) => (id === 'moon' ? out.copy(moonAt) : id === 'mars' ? out.copy(marsDisc) : null);
  let stood = 0;
  for (const r of landings) {
    const p = propagate(r, tMs);
    const pos = stage.toScene(p, p.frame, tMs);
    if (!pos) continue;
    const centre = r.meta.world === 'moon' ? moonAt : marsDisc;
    const down = nadirOf(r, pos, centreOf, new THREE.Vector3());
    const want = centre.clone().sub(pos).normalize();
    const off = (Math.acos(Math.min(1, Math.max(-1, down.dot(want)))) * 180) / Math.PI;
    check(off < 1e-3, `UPRIGHT  ${r.id} is drawn ${off.toFixed(1)} degrees off its own world's vertical`);
    stood += 1;
  }
  check(stood === landings.length, `UPRIGHT  only ${stood} of ${landings.length} sites could be placed from the Earth stage`);
  // And the stage's own ground keeps the origin: Goldstone stands up away from the Earth's centre.
  const dss = byId.get('dss-14');
  const pd = propagate(dss, tMs);
  const posD = stage.toScene(pd, pd.frame, tMs);
  const downD = nadirOf(dss, posD, centreOf, new THREE.Vector3());
  check(downD.dot(posD.clone().multiplyScalar(-1).normalize()) > 1 - 1e-9, 'UPRIGHT  a dish on the Earth no longer points its feet at the Earth\'s centre');
}

// A REAL MODEL ON THE GROUND STANDS ON IT. realmodels.js centres a file on its bounding box and the
// swap in heroes.js dropped the stand-in's `up` attitude, so the lunar module was drawn at a
// seeded angle with its descent stage underground (headless Chrome, 2026-09-22). A wrapper built
// the way normalise() builds one -- a 9.4 x 7 unit box, centred, scaled to one unit -- must come out
// standing on its origin with the `up` attitude.
{
  const file = new THREE.Mesh(new THREE.BoxGeometry(9.4, 7, 9.4));
  const inner = new THREE.Group();
  file.position.set(0, 0, 0);
  inner.add(file);
  inner.scale.setScalar(1 / 9.4);
  const wrapper = new THREE.Group();
  wrapper.add(inner);
  standOnGround(wrapper);
  wrapper.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrapper, true);
  check(Math.abs(box.min.y) < 1e-9, `GROUND   a real model's lowest point is ${box.min.y.toFixed(3)} units from the ground it stands on`);
  check(Math.abs(box.max.y - 7 / 9.4) < 1e-9, 'GROUND   standing a model up changed its height');
  check(wrapper.userData.attitude === 'up', `GROUND   a real model on the ground has attitude ${wrapper.userData.attitude}, not up`);
  const heroes = readFileSync(join(JS, 'scene/heroes.js'), 'utf8');
  check(/userData\.attitude === 'up'\) standOnGround\(clone\)/.test(heroes), 'GROUND   heroes.js no longer stands a swapped-in ground model up');
}

// A SITE IS NEVER SHRUNK TO ITS "ALTITUDE". heroes.js caps a model at its height above the stage
// world so a satellite cannot reach into the planet, and it used to decide who is on the ground by
// the sign of |pos| - R: on the Moon's stage Chang'e 4 came out a few centimetres up and was drawn
// zero pixels across (headless Chrome, 2026-09-22). Every site is exempt by what it is.
{
  for (const r of records) check(!altitudeCapApplies(r), `GROUND   ${r.id} would be capped at its altitude above the stage world`);
  check(altitudeCapApplies({ id: 'sat', propagator: 'sgp4' }), 'GROUND   a satellite is no longer capped at its altitude');
  const heroes = readFileSync(join(JS, 'scene/heroes.js'), 'utf8');
  const calls = heroes.match(/heroScale\(px, c\.d,[^;]*;/g) || [];
  check(calls.length === 2 && calls.every((c) => c.includes('altitudeCapApplies(c.record)')),
    `GROUND   every heroScale call must ask altitudeCapApplies first (${calls.length} calls)`);
}

// ---------------------------------------------------------------------------------- 4. the card
const ctx = { clock: { now: () => tMs } };
const WORLD_WORD = { moon: /Moon/, mars: /Mars/ };
for (const r of landings) {
  const sentence = firstSentence(r, ctx, { tMs }, null);
  const doing = String(r.meta.doing).replace(/\.\s*$/, '');
  check(sentence.startsWith(doing), `CARD     ${r.id} opens with ${JSON.stringify(sentence)}, not its own sentence`);
  const rows = rightNowFor(r, ctx).map(([k, v]) => `${k}: ${v}`).join(' | ');
  check(WORLD_WORD[r.meta.world].test(rows), `CARD     ${r.id}'s card never says it is on ${r.meta.world}: ${rows}`);
  check(!/Height above the ground|Passing over/.test(rows), `CARD     ${r.id} gets an Earth row: ${rows}`);
  const line = drawingLine(r) || '';
  if (r.meta.siteShape === 'lander' || (r.meta.siteShape === 'rover' && !REAL_MODELS.bySite[r.id])) {
    check(line.includes(`a ${r.meta.siteShape}`) && /not this exact one/.test(line),
      `CARD     ${r.id} is a stand-in and its card does not say so: ${JSON.stringify(line)}`);
  }
  check(!/ground site|launch pad/.test(line), `CARD     ${r.id} still says ${JSON.stringify(line)}`);
}

// --------------------------------------------------------------- flying there stays out of the Moon
// The rig frames a flight outward from the world it was last taught, and main.js used to teach it
// Earth once and never again: a near-side lunar site sits on the line from Earth's centre through
// the Moon, so "outward" ran into the Moon and the camera parked 231 km under Apollo 12 (measured
// in headless Chrome, 2026-09-22). main.js now teaches the rig the site's own world before it
// flies (teachRigWorld). This holds both halves: the rig, taught the Moon, frames from outside it
// -- and the premise, that untaught it goes in, so the day the rig changes this says so.
{
  const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
  const moonAt = new THREE.Vector3(255, -132, 274); // where the Moon is drawn from the Earth stage, roughly
  const R = WORLD_RADIUS_KM.moon / 1000;
  const subEarth = moonAt.clone().add(moonAt.clone().normalize().multiplyScalar(-R));
  const fly = (teach) => {
    const cam = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
    cam.position.set(0, 0, 22);
    const rig = createCameraRig(cam, null, { worldRadius: 6.371 });
    if (teach) { rig.setWorldRadius(R); rig.setWorldCentre(moonAt); }
    rig.flyTo({ targetScene: subEarth, distance: 0.315, ms: 0 });
    rig.update(0.016);
    return cam.position.distanceTo(moonAt);
  };
  const taught = fly(true);
  const untaught = fly(false);
  check(taught > R, `FLY      taught the Moon, the rig still parks the camera ${((R - taught) * 1000).toFixed(0)} km inside it`);
  check(untaught < R, 'FLY      the rig no longer flies into an untaught world; the teachRigWorld comment in main.js is now history, say so there');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  const body = main.slice(main.indexOf('function flyToRecord('), main.indexOf('function surfaceWorldOf('));
  check(/teachRigWorld\(record\)[\s\S]*cameraRig\.flyTo\(/.test(body),
    'FLY      main.js flyToRecord no longer teaches the rig the record\'s world before it flies');
}

// ------------------------------------------------------------------------------ 5. search finds it
const index = buildIndex(records, LAYERS);
const first = (q) => (findMatches(index, q).hits[0] || {}).record;
for (const [q, id] of [
  ['opportunity', 'opportunity'], ['viking 2', 'viking-2'], ['lunokhod 1', 'lunokhod-1'],
  ["chang'e 6", 'change-6'], ['change 6', 'change-6'], ['sojourner', 'mars-pathfinder'],
  ['pragyan', 'chandrayaan-3'], ['tranquility base', 'apollo-11'], ['odysseus', 'im-1'],
  ['blue ghost', 'blue-ghost-1'], ['surveyor 3', 'surveyor-3'], ['mars 3', 'mars-3'],
]) {
  const got = first(q);
  check(got && got.id === id, `SEARCH   "${q}" should find ${id} first, found ${got ? got.id : 'nothing'}`);
}

// --------------------------------------------------------------- no id another bundled record has
const others = new Map();
for (const r of [...sampleOddities(), ...sampleDeepSpace(), ...sampleAsteroids(), ...sampleReentries(), ...worldRecords()]) {
  others.set(r.id, r.layer || r.klass);
}
for (const r of records) {
  check(!others.has(r.id), `ID       ${r.id} is also the id of a record in ${others.get(r.id)}; a tap or a trip could find the wrong one`);
}

if (problems.length) {
  console.log(`landing sites: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
const count = (w) => landings.filter((r) => r.meta.world === w).length;
console.log(
  `landing sites ok: ${count('moon')} on the Moon and ${count('mars')} on Mars, every one on its own ` +
    `world's surface at its row's coordinates; ${JSON.stringify(shapes)}, none a launch pad; ` +
    `${sided} lunar sites on the side of the Moon their longitude says`,
);
