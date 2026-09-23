// tests/test_systems.mjs -- a star system at its own scale, and the trip "Travel to exoplanets"
// (spec 0040, 2026-09-23).
//
//   node tests/test_systems.mjs
//
// What check_registry.py cannot see from the YAML alone:
//
//   1. THE NUMBERS. Kepler's third law holds on TRAPPIST-1's seven rows within 5 % (they agree to
//      0.13 %), and a mutated a_au is refused by the same rule in the browser's code.
//   2. THE PLANETS ARE THE TABLE'S RECORDS, NOT COPIES. Every system planet is an id parseExoplanets()
//      makes from a row of that host; scripts/_exo_ids.py derives the same id for every row of the
//      file; the host star is one new record, and the exoplanet layer's count is unchanged.
//   3. THE STAGE. unit_km is exactly 100 000 in both registry/stages.yaml and scene/stage.js (the
//      ladder's units were typed 1 000 times wrong twice in spec 0028), the origin is the host star,
//      nothing is squeezed from it.
//   4. THE DRAWING. At a transit instant the planet is on the line from its star toward us; the
//      illustrative phase is stable; the one-pixel floor applies at the whole-system framing and
//      not at eight radii; the geometry is under 10 000 triangles.
//   5. THE TRIP, run by the real machine: eleven stops, the generated count, e fourth on the
//      system's stage and selected, the camera outside every subject, the honesty line on every
//      system card, Mercury's ring on the last stop only, and leaving back to Earth.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

let REAL = Date.parse('2026-09-23T12:00:00Z');
const realDateNow = Date.now;
Date.now = () => REAL;

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const S = await import(join(JS, 'scene/systems.js'));
const { SYSTEMS } = await import(join(JS, 'data/systems.js'));
const { stage, STAGES, isSystemStage, isLadderStage, systemOriginOf } = await import(join(JS, 'scene/stage.js'));
const { parseExoplanets } = await import(join(JS, 'data/parsers.js'));
const { systemHostRecords, LAYERS } = await import(join(JS, 'data/layers.js'));
const { createWorlds, compressesFrom, WORLDS } = await import(join(JS, 'scene/worlds.js'));
const { createCameraRig, worldFramingDistance } = await import(join(JS, 'scene/camera.js'));
const { systemLine, drawingLine } = await import(join(JS, 'ui/cards.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { clock } = await import(join(JS, 'clock.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const notes = [];
const DAY_MS = 86400000;

const sys = SYSTEMS.find((s) => s.id === 'trappist-1');
check(!!sys && sys.planets.length === 7, `TRAPPIST-1 is a system with seven planets (${sys && sys.planets.length})`);

// ---------------------------------------------------------------------- 1. Kepler's third law
const ratios = [];
for (const p of sys.planets) {
  const m = S.keplerMismatch(p, sys.star.massSuns);
  ratios.push(`${p.id.slice(-1)} ${(sys.star.massSuns * (1 + m)).toFixed(5)}`);
  check(Math.abs(m) <= 0.05, `${p.id}: a^3/P^2 is ${(m * 100).toFixed(2)} % from the star's mass`);
}
notes.push(`a^3/P^2 against ${sys.star.massSuns}: ${ratios.join(', ')}`);
{
  const e = sys.planets.find((p) => p.id === 'exo-trappist-1-e');
  const typo = { ...e, aAu: 0.03925 }; // one slipped digit
  check(Math.abs(S.keplerMismatch(typo, sys.star.massSuns)) > 0.05, 'a mutated a_au (0.03925 for 0.02925) is refused by Kepler');
  const slight = { ...e, aAu: e.aAu * 1.01 };
  check(Math.abs(S.keplerMismatch(slight, sys.star.massSuns)) < 0.05, 'a 1 % change in a_au (3 % in a^3) is inside the 5 %');
}
// (tests/test_refusals.py makes the same slip in registry/systems.yaml, and check_registry.py
// refuses it with the three numbers.)

// --------------------------------------------------- 2. the planets are the table's own records
const csv = readFileSync(join(ROOT, 'site/data/exoplanets.csv'), 'utf8');
const exo = parseExoplanets(csv);
const exoIds = new Set(exo.map((r) => r.id));
const trappist = exo.filter((r) => r.meta.host === 'TRAPPIST-1');
check(trappist.length === 7, `the table has seven TRAPPIST-1 planets (${trappist.length})`);
for (const p of sys.planets) check(exoIds.has(p.id) && trappist.some((r) => r.id === p.id), `${p.id} is a record parseExoplanets() makes from a TRAPPIST-1 row`);
const hosts = systemHostRecords();
const host = hosts.find((r) => r.id === 'star-trappist-1');
check(hosts.length === SYSTEMS.length, `one host record per system (${hosts.length})`);
check(host && host.klass === 'star' && host.layer === 'systems' && host.propagator === 'static' && host.cls === 'measured', 'the host is a static, measured star record in the systems layer');
check(host && !exoIds.has(host.id), 'the host star is not an exoplanet id');
check(!hosts.some((r) => r.klass === 'exoplanet'), 'the systems layer makes no planet records: one planet, one record');
if (host) {
  const e = exo.find((r) => r.id === 'exo-trappist-1-e');
  const d = Math.hypot(host.pos.x - e.pos.x, host.pos.y - e.pos.y, host.pos.z - e.pos.z);
  check(d < 1, `the host star sits on its planets' glyph (${d.toFixed(3)} km off)`);
  check(Math.abs(host.meta.distLy - 40.54) < 0.05, `TRAPPIST-1 is ${host.meta.distLy} light-years out`);
}
check(exo.length > 6000 && exo.length < 7000, `the exoplanet layer's own count is unchanged (${exo.length})`);
{
  // scripts/_exo_ids.py derives the same id from every row: the validator and the browser agree.
  const py = execFileSync('python3', ['-c', [
    'import sys, json',
    `sys.path.insert(0, ${JSON.stringify(join(ROOT, 'scripts'))})`,
    'from _exo_ids import exo_id, read_rows',
    'print(json.dumps([exo_id(r["pl_name"]) for r in read_rows()]))',
  ].join('\n')], { encoding: 'utf8' });
  const pyIds = JSON.parse(py);
  const same = pyIds.length === exo.length && pyIds.every((id, i) => id === exo[i].id);
  check(same, `scripts/_exo_ids.py and parseExoplanets() make the same id for all ${exo.length} rows`);
}
const layerRow = LAYERS.find((l) => l.id === 'systems');
check(layerRow && layerRow.draw === 'systems' && layerRow.klass === 'star', 'the systems layer is drawn by scene/systems.js, not as glyphs');

// ------------------------------------------------------------------------------ 3. the stage
check(STAGES['system-trappist-1'] && STAGES['system-trappist-1'].unitKm === 100000, `scene/stage.js: unit_km is exactly 100 000 (${STAGES['system-trappist-1'] && STAGES['system-trappist-1'].unitKm})`);
{
  const yaml = readFileSync(join(ROOT, 'registry/stages.yaml'), 'utf8');
  const row = yaml.split(/\n\s*- id: /).find((b) => b.startsWith('system-trappist-1'));
  check(row && /\n\s*unit_km: 100000\b/.test(row) && /kind: system/.test(row) && /centre: star-trappist-1/.test(row), 'registry/stages.yaml: system-trappist-1 is a system stage of exactly 100 000 km, centred on star-trappist-1');
}
check(isSystemStage('system-trappist-1') && !isLadderStage('system-trappist-1') && !isSystemStage('stellar') && !isSystemStage('earth'), 'a system stage is neither a rung nor a world');
check(compressesFrom('system-trappist-1') === false, 'nothing is squeezed from a system stage');
const hostKm = S.hostPositionKm(sys);
{
  const o = systemOriginOf('system-trappist-1');
  check(o && Math.hypot(o.x - hostKm.x, o.y - hostKm.y, o.z - hostKm.z) < 1e-3, 'the stage origin is registered at the host star');
  stage.setWorld('system-trappist-1');
  stage.setTime(REAL);
  const v = stage.toScene(hostKm, 'sun-inertial', REAL);
  check(v && v.length() < 1e-6, `the host star is the stage's origin (${v && v.length()})`);
  const sun = stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial', REAL);
  check(sun && sun.length() > 1e9, `the Sun is past the far plane from here (${sun && sun.length().toExponential(2)} units)`);
  stage.setWorld('earth');
}

// ----------------------------------------------------------------------------- 4. the drawing
const basis = S.systemBasis(hostKm);
const toEarth = { x: -hostKm.x, y: -hostKm.y, z: -hostKm.z };
const norm = (v) => { const l = Math.hypot(v.x, v.y, v.z); return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const earthDir = norm(toEarth);
for (const p of sys.planets) {
  const t0 = (p.transitMidJd - 2440587.5) * DAY_MS;
  const at = S.planetPosition(p, t0, basis);
  const r = Math.hypot(at.x, at.y, at.z);
  check(dot(norm(at), earthDir) > 0.99, `${p.id}: at its transit it is between its star and us (dot ${dot(norm(at), earthDir).toFixed(6)})`);
  check(Math.abs(r / (p.aAu * S.AU_KM) - 1) < 1e-9, `${p.id}: on a circle of its a_au`);
  const half = S.planetPosition(p, t0 + (p.periodDays * DAY_MS) / 2, basis);
  check(dot(norm(half), earthDir) < -0.99, `${p.id}: half a period later it is behind its star`);
  // Ten years on, still on its transit line at a whole number of periods: the phase keeps its digits.
  const n = Math.round((3650 * DAY_MS) / (p.periodDays * DAY_MS));
  const later = S.planetPosition(p, t0 + n * p.periodDays * DAY_MS, basis);
  check(dot(norm(later), earthDir) > 0.9999, `${p.id}: ${n} periods on it transits again`);
}
check(Math.abs(dot(basis.u, basis.v)) < 1e-12 && Math.abs(basis.v.z) < 1e-12, 'the orbit plane holds our line of sight and a level axis');
{
  const a = S.illustrativePhase('exo-kepler-90-h');
  check(a === S.illustrativePhase('exo-kepler-90-h') && a >= 0 && a < 2 * Math.PI, 'an illustrative phase is the same every time for an id, in [0, 2 pi)');
  check(a !== S.illustrativePhase('exo-kepler-90-g'), 'and different ids get different phases');
  check(sys.planets.every(S.phaseIsMeasured), 'every TRAPPIST-1 planet has a transit time, so every phase is measured');
}
{
  const e = sys.planets.find((p) => p.id === 'exo-trappist-1-e');
  const trueUnits = (e.radiusEarths * S.EARTH_RADIUS_KM) / 100000;
  check(S.floorRadiusUnits(trueUnits, 200) > trueUnits * 3, `at 200 units (the whole system) e is floored to a pixel (${S.floorRadiusUnits(trueUnits, 200).toFixed(3)} for ${trueUnits.toFixed(3)})`);
  check(S.floorRadiusUnits(trueUnits, trueUnits * 8) === trueUnits, 'at eight radii e is drawn at its true size');
}

// ----------------------------------------------------------------------- 4b. the scene module
const FOV = 45;
const ASPECT = 1280 / 800;
const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 1e-5, 1e9);
camera.position.set(0, 0, 22);
camera.updateProjectionMatrix();
const scene = new THREE.Scene();
const records = [...exo, ...hosts];
const byId = new Map(records.map((r) => [r.id, r]));
let selected = null;
const ctx = {
  camera,
  clock,
  layers: LAYERS,
  recordsFor: (id) => records.filter((r) => r.layer === id),
  recordById: (id) => byId.get(id) || null,
  isLayerOn: () => true,
  setLayerOn() {},
  selected: () => selected,
};
const systems = S.createSystems(scene, ctx);
ctx.systems = systems;
stage.setWorld('system-trappist-1');
stage.setTime(REAL);
systems.enter('system-trappist-1');
camera.position.set(0, 150, 150);
systems.update(REAL, camera);
{
  const st = systems.stats();
  check(st.active && st.meshes === 8 && st.rings === 7, `eight spheres and seven rings (${JSON.stringify(st)})`);
  check(st.triangles < 10000, `${st.triangles} triangles, under 10 000`);
  notes.push(`${st.triangles} triangles on the stage`);
  const e = systems.drawnPositionOf('exo-trappist-1-e');
  check(e && Math.abs(e.length() - (0.02925 * S.AU_KM) / 100000) < 1e-3, `e is drawn ${e && e.length().toFixed(2)} units from its star`);
  check(systems.records().length === 8, `the stage's records are the star and its seven planets (${systems.records().length})`);
  check(systems.records().filter((r) => r.klass === 'exoplanet').every((r) => byId.get(r.id) === r), 'and they are the exoplanet layer\'s own objects');
  const line = systemLine(byId.get('exo-trappist-1-e'));
  check(line && /NASA Exoplanet Archive/.test(line) && /illustrative/.test(line) && !/places on their orbits/.test(line), `the card's line on the stage: "${line}"`);
  check(drawingLine(byId.get('exo-trappist-1-e')) === line, 'and it is the drawing line of a planet on its stage');
  check(systemLine(byId.get('exo-proxima-cen-b')) === null, 'a planet with no system row keeps its own line');
  stage.setWorld('stellar');
  check(systemLine(byId.get('exo-trappist-1-e')) === null && /at its star/.test(drawingLine(byId.get('exo-trappist-1-e'))), 'off its stage e is a mark at its star again');
  check(systems.drawnPositionOf('exo-trappist-1-e') === null, 'and scene/systems.js does not place it');
  systems.leave();
  check(systems.stats().meshes === 0, 'leaving the stage drops the geometry');
}

// ------------------------------------------------------------------------------- 5. the trip
const TRIP_ID = 'travel-to-exoplanets';
const trip = TOURS.find((t) => t.id === TRIP_ID);
check(!!trip, `there is a '${TRIP_ID}' trip`);
if (trip) {
  check(trip.stops.length === 11, `${trip.stops.length} stops; the spec has eleven`);
  check(trip.group === 'beyond' && trip.stage === 'stellar', `group ${trip.group}, stage ${trip.stage}`);
  check(JSON.stringify(trip.requires) === JSON.stringify(['stars', 'exoplanets', 'systems']), `requires ${trip.requires}`);
  check(/back to Earth/.test(trip.blurb), 'leaving changes the stage, and the blurb says so');
  const count = csv.split('\n').filter((l) => l.trim() && !l.startsWith('#')).length - 1;
  const grouped = String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  check(trip.stops[0].card.body.startsWith(`${grouped} planets`), `the first card's count is the table's ${count}, grouped with a narrow space: "${trip.stops[0].card.body.slice(0, 20)}"`);
  const order = trip.stops.slice(3, 10).map((s) => s.target.record);
  check(JSON.stringify(order) === JSON.stringify(['e', 'b', 'c', 'd', 'f', 'g', 'h'].map((x) => `exo-trappist-1-${x}`)), `e first, then b to h: ${order.join(', ')}`);
  for (const s of trip.stops.slice(2)) check(s.stage === 'system-trappist-1', `${s.id}: flown on the system's stage`);
  for (const s of trip.stops.slice(3, 10)) check(s.frame_radii === 8, `${s.id}: framed at eight radii`);
  check(trip.stops.filter((s) => s.mercury_ring).map((s) => s.id).join() === 'mercury', 'Mercury\'s ring is on the last stop only');
  for (const s of trip.stops) check(!/habitab/i.test(`${s.card.title} ${s.card.body}`), `${s.id}: no card says "habitable" without a cited page`);
}

// The machine, with the real clock, rig, worlds and scene/systems.js.
{
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  stage.setWorld('earth');
  stage.setOrigin(null);
  const worlds = createWorlds(new THREE.Scene(), { textureBase: null, camera });
  worlds.update(REAL);
  const frames = [];
  globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  const pump = (n = 4) => {
    for (let i = 0; i < n; i += 1) {
      for (const fn of frames.splice(0, frames.length)) {
        try { fn(0); } catch { /* ui/cards.js wants a document; not under test */ }
      }
    }
  };
  const passes = (ms) => { REAL += ms; clock.tick(ms); };
  Object.assign(ctx, {
    cameraRig: rig,
    worlds,
    select(record) { selected = record; },
    deselect() { selected = null; rig.stopFollow(); },
    // main.js ctx.setStage, less the renderer, and with sr:stage's systems.enter/leave inline.
    setStage(id) {
      if (!STAGES[id] || stage.worldId === id) return false;
      stage.setWorld(id);
      if (isSystemStage(id)) systems.enter(id); else systems.leave();
      worlds.update(clock.now());
      const w = WORLDS.find((x) => x.id === id);
      const onSystem = isSystemStage(id);
      const r = w ? w.radiusKm / stage.unitKm : onSystem ? systems.starRadiusUnits() : 0;
      rig.setWorldRadius(r);
      rig.setWorldCentre({ x: 0, y: 0, z: 0 });
      rig.stopFollow();
      rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: w ? worldFramingDistance(r, FOV, ASPECT) : onSystem ? systems.framingDistanceUnits(id) : 5, ms: 0 });
      return true;
    },
  });
  const machine = createTrip(ctx);
  ctx.trip = machine;
  const plan = await machine.plan(TRIP_ID);
  check(plan && plan.count === 11 && plan.dropped.length === 0, `${plan && plan.count} of 11 stops resolved (${plan && JSON.stringify(plan.dropped)})`);
  await machine.start(TRIP_ID);
  pump();
  machine.play();
  pump(1);
  const shots = [];
  for (let i = 0; i < 11; i += 1) {
    const stop = trip.stops[i];
    rig.finishFlight();
    pump(2);
    rig.update(0.016);
    systems.update(clock.now(), camera);
    check(machine.state.index === i && machine.state.stopId === stop.id, `stop ${i + 1}: the trip is at ${machine.state.stopId}`);
    check(stage.worldId === (stop.stage || trip.stage), `${stop.id}: on the ${stage.worldId} stage`);
    const rec = stop.target.record ? byId.get(stop.target.record) : null;
    if (rec) check(selected && selected.id === rec.id, `${stop.id}: ${selected && selected.id} is selected`);
    if (stop.id === 'e') {
      check(selected && selected.id === 'exo-trappist-1-e' && stage.worldId === 'system-trappist-1', 'stop 4: exo-trappist-1-e selected on system-trappist-1');
    }
    if (isSystemStage(stage.worldId)) {
      const pos = systems.drawnPositionOf(rec.id);
      const dist = camera.position.distanceTo(pos);
      if (S.systemOfRecordId(rec.id).planet) {
        const want = (S.systemOfRecordId(rec.id).planet.radiusEarths * S.EARTH_RADIUS_KM * 8) / 100000;
        check(Math.abs(dist / want - 1) < 1e-3, `${stop.id}: the camera is ${dist.toFixed(3)} units out, eight radii is ${want.toFixed(3)}`);
        const r = camera.position.length();
        check(r > systems.starRadiusUnits() * 1.02, `${stop.id}: the camera is outside the star`);
      } else {
        const fit = systems.framingDistanceUnits('system-trappist-1', { mercury: !!stop.mercury_ring });
        check(dist >= fit * 0.999, `${stop.id}: the whole of it fits (camera ${dist.toFixed(0)} units, fit ${fit.toFixed(0)})`);
        // Every planet inside the frame on a 1280 x 800 screen.
        camera.updateMatrixWorld(true);
        for (const p of sys.planets) {
          const v = systems.drawnPositionOf(p.id).project(camera);
          check(Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1, `${stop.id}: ${p.id} is in the frame (${v.x.toFixed(2)}, ${v.y.toFixed(2)})`);
        }
      }
      check(systems.stats().scaleRing === !!stop.mercury_ring, `${stop.id}: Mercury's ring is ${systems.stats().scaleRing ? 'drawn' : 'not drawn'}`);
      check(systemLine(rec) !== null, `${stop.id}: the card's honesty line is there`);
      shots.push(`${stop.id} ${dist.toFixed(2)}u`);
    }
    passes(2000);
    if (i < 10) { machine.next(); pump(1); }
  }
  notes.push(`camera distances: ${shots.join(', ')}`);
  machine.stop('left');
  pump(2);
  check(stage.worldId === 'earth', `leaving left the map on ${stage.worldId}`);
  check(systems.stats().meshes === 0 && systems.stats().scaleRing === false, 'and the system and its ring are gone');
  machine.dispose();
  worlds.dispose();
}

Date.now = realDateNow;
if (problems.length) {
  console.error(`systems FAILED (${problems.length}):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`systems ok: TRAPPIST-1's seven rows obey Kepler, its planets are the table's records on a 100 000 km stage, each transits toward us, and the eleven-stop trip runs end to end (${notes.join('; ')})`);
