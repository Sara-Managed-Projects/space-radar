// tests/test_attitude.mjs -- which way a spacecraft points: the laws, the Sun, the nadir and the Earth direction,
// and each file's own axes (review of 2026-11-16).
//
// Until that review 99 routed files (every NASA file, the ISS and all the far probes among them) kept a constant
// angle seeded from the object's id: the ISS's arrays, Terra's instruments, Webb's sunshield and Voyager's dish
// pointed nowhere in particular. scene/attitude.js states a few simple laws; registry/models.yaml says, for a file
// in its author's axes, which axis is which and the law (`attitude:`), mirrored into data/modelframes.js. Held here,
// with no browser:
//
//   1. the directions: toward the Sun, toward a world's centre (the nadir), toward the Earth;
//   2. every law puts its axis EXACTLY where it says and the second as near its target as it can go, right-handed,
//      for many places round an orbit; a law that lacks what it needs answers null, never a wrong turn;
//   3. frameQuat(): the turn from a file's axes to the app's, for axis words, for a diagonal, with `cells`;
//   4. every `attitude:` row in the registry is readable, names a routed file, and puts the file's stated face
//      on +Z and its second axis on +X; data/modelframes.js is that table;
//   5. scene/models.js updateModelAttitude flies a framed file by its law: the ISS's own nadir face at the Earth and
//      its forward end along the track; Webb's hot side at the Sun; Voyager's dish at the Earth; a spinning craft turns;
//   6. the card says the attitude is modelled, not measured, in every language, and says nothing for a file with no axes.
//
//   node tests/test_attitude.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const at = (rel) => pathToFileURL(join(ROOT, rel)).href;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const A = await import(at('site/js/scene/attitude.js'));
const { MODEL_FRAMES } = await import(at('site/js/data/modelframes.js'));

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const same = (a, b, eps = 1e-9) => !!a && !!b && near(a[0], b[0], eps) && near(a[1], b[1], eps) && near(a[2], b[2], eps);
const rightHanded = (b) => same(cross(b.x, b.y), b.z, 1e-9) && near(dot(b.x, b.y), 0) && near(Math.hypot(...b.x), 1) && near(Math.hypot(...b.y), 1) && near(Math.hypot(...b.z), 1);

// --- 1. the directions ---------------------------------------------------------------------------------------------
check(same(A.directionTo([7000, 0, 0], [0, 0, 0]), [-1, 0, 0]), 'the nadir of a craft at +X of its world is -X');
check(same(A.directionTo({ x: 0, y: 0, z: 0 }, { x: 0, y: 3, z: 4 }), [0, 0.6, 0.8]), 'a direction is a unit vector, from objects as from arrays');
check(A.directionTo([1, 2, 3], [1, 2, 3]) === null && A.unit([0, 0, 0]) === null && A.unit(null) === null, 'no direction from a point to itself, none of a zero vector');
{
  // The Sun from the Earth and from a craft 42 164 km from it differ by 42 164 / 149.6e6 rad: the Sun's direction at a craft in Earth orbit is the Earth's own.
  const sun = [149.6e6, 0, 0];
  const geo = [0, 42164, 0];
  const here = A.directionTo(geo, sun);
  const angle = Math.acos(Math.min(1, dot(here, A.directionTo([0, 0, 0], sun)))) * 180 / Math.PI;
  check(angle > 0.016 && angle < 0.0162, `the Sun from geostationary height is ${angle.toFixed(4)} degrees from the Sun at the Earth's centre (0.0161)`);
  // The Earth from Voyager 1's distance (about 170 au) is within a third of a degree of the Sun.
  const voyager = [-170 * 149.6e6 * Math.cos(0.6), 170 * 149.6e6 * Math.sin(0.6), 3e9];
  const earth = [149.6e6 * Math.cos(2), 149.6e6 * Math.sin(2), 0];
  const sep = Math.acos(dot(A.directionTo(voyager, earth), A.directionTo(voyager, [0, 0, 0]))) * 180 / Math.PI;
  check(sep > 0 && sep < 0.34, `from 170 au the Earth is ${sep.toFixed(3)} degrees from the Sun (under 0.34): a dish at the Earth is a dish at the Sun`);
  // From Mars at opposition the Earth and the Sun are one direction; at quadrature they are up to about 41 degrees apart, so the two are not the same law.
  const mars = [1.524 * 149.6e6, 0, 0];
  const quad = [149.6e6 * Math.cos(Math.acos(1 / 1.524)), 149.6e6 * Math.sin(Math.acos(1 / 1.524)), 0];
  const el = Math.acos(dot(A.directionTo(mars, quad), A.directionTo(mars, [0, 0, 0]))) * 180 / Math.PI;
  check(el > 40.9 && el < 41.1, `from Mars the Earth is at most ${el.toFixed(1)} degrees from the Sun (41.0)`);
}
check(same(A.squareTo([1, 1, 0], [1, 0, 0]), [0, 1, 0]) && A.squareTo([1, 0, 0], [1, 0, 0]) === null && A.squareTo([1, 0.001, 0], [1, 0, 0]) === null, 'squareTo takes out the part along an axis, and refuses a vector along it');

// --- 2. the laws --------------------------------------------------------------------------------------------------
const NORTH = [0, 1, 0]; // the scene's north on the Earth's stage
const tilt = 23.44 * Math.PI / 180;
for (const season of [0, 0.25, 0.5, 0.8]) {
  // the Sun's direction through a year, in a frame whose +Y is the Earth's axis
  const L = season * 2 * Math.PI;
  const sun = [Math.cos(L), Math.sin(L) * Math.sin(tilt), Math.sin(L) * Math.cos(tilt)];
  for (let k = 0; k < 24; k++) {
    // a craft round the equator, and one on a polar orbit
    const a = (k / 24) * 2 * Math.PI + 0.01;
    for (const [where, pos, vel] of [['equator', [Math.cos(a), 0, Math.sin(a)], [-Math.sin(a), 0, Math.cos(a)]], ['polar', [Math.cos(a), Math.sin(a), 0], [-Math.sin(a), Math.cos(a), 0]]]) {
      const nadir = A.directionTo(pos, [0, 0, 0]);
      const d = { sun, nadir, north: NORTH, heading: vel, earth: nadir };
      const tag = `${where} ${k}/24, season ${season}`;

      const n = A.attitudeAxes('nadir', d);
      if (n) {
        check(rightHanded(n) && same(n.z, nadir), `nadir (${tag}): +Z is at the world's centre, right-handed`);
        check(near(dot(n.x, sun), 0, 1e-9) && dot(n.y, sun) > 0, `nadir (${tag}): the wings' axis is square to the Sun and the cells' side is the Sun's`);
        check(same(A.attitudeAxes('sun-panels', d).x, n.x), `sun-panels is the same law as nadir (${tag})`);
      } else check(Math.abs(dot(sun, nadir)) > 0.9999, `nadir (${tag}) answers only when the Sun is not on the line to the world`);

      if (where === 'equator') {
        const g = A.attitudeAxes('geo', d);
        check(g && rightHanded(g) && same(g.z, nadir) && same(g.x, NORTH), `geo (${tag}): +Z at the Earth, the wings' axis along the Earth's axis, whatever the season`);
        const r = A.attitudeAxes('geo', { ...d, rigid: true });
        check(r && rightHanded(r) && same(r.z, nadir) && Math.abs(dot(r.x, NORTH)) > 1 - 1e-9 && dot(r.y, sun) >= -1e-12, `geo, a rigid file (${tag}): still north-south, turned end for end so its cells are never away from the Sun`);
      }

      const l = A.attitudeAxes('lvlh', d);
      check(l && rightHanded(l) && same(l.z, nadir) && same(l.x, A.unit(vel), 1e-9), `lvlh (${tag}): the same face down and the same end forward`);

      const s = A.attitudeAxes('sun', d);
      check(s && rightHanded(s) && same(s.z, sun) && dot(s.x, NORTH) > 0 && near(dot(s.x, sun), 0), `sun (${tag}): +Z at the Sun, +X as near north as square to the Sun allows`);
      check(same(s.x, A.attitudeAxes('sun', { ...d, nadir: [0, 0, 1] }).x), `sun (${tag}): where the craft is on its orbit does not turn it (it looks at one place in the sky)`);

      const e = A.attitudeAxes('earth', { ...d, earth: [0.6, 0, 0.8] });
      check(e && rightHanded(e) && same(e.z, [0.6, 0, 0.8]) && dot(e.y, sun) >= -1e-12, `earth (${tag}): +Z at the Earth, +Y on the Sun's side`);
    }
  }
}
// the seasons show in `nadir` and not in `geo`: at the June solstice, at six in the morning over the equator, the old rule's wing axis leans 23.44 degrees off north
{
  const sun = [0, Math.sin(tilt), Math.cos(tilt)];
  const nadir = [-1, 0, 0];
  const lean = Math.acos(Math.abs(dot(A.attitudeAxes('nadir', { sun, nadir }).x, NORTH))) * 180 / Math.PI;
  check(near(lean, 23.44, 1e-6), `the Sun-square rule leans a geostationary craft's wings ${lean.toFixed(2)} degrees off north-south at a solstice (23.44); geo does not`);
}
// what a law needs and has not got
check(A.attitudeAxes('geo', { sun: [1, 0, 0], nadir: [0, 0, 1] }) === null, 'geo without a north answers null');
check(A.attitudeAxes('lvlh', { sun: [1, 0, 0], nadir: [0, 0, 1] }) === null && A.attitudeAxes('lvlh', { nadir: [0, 0, 1], heading: [0, 0, 1] }) === null, 'lvlh without a heading, or with one straight down, answers null');
check(A.attitudeAxes('earth', { sun: [1, 0, 0], nadir: [0, 0, 1] }) === null && A.attitudeAxes('spin', { sun: [1, 0, 0] }) === null, 'earth and spin without the Earth answer null');
check(A.attitudeAxes('sun', { nadir: [0, 0, 1], north: [0, 1, 0] }) === null, 'sun without the Sun answers null');
check(A.attitudeAxes('tumble', {}) === null && A.attitudeAxes('up', {}) === null && A.attitudeAxes('fixed', {}) === null, 'the laws of scene/models.js itself are not this file\'s');
// the Earth dead behind the Sun (Voyager): still a steady, right-handed answer
{
  const e = A.attitudeAxes('earth', { sun: [0, 0, 1], earth: [0, 0, 1] });
  check(e && rightHanded(e) && same(e.z, [0, 0, 1]), 'earth with the Sun on the same line still answers, right-handed');
}
// spin: a turn about the dish's line, by the drawn time
{
  const d = { sun: [1, 0, 0], earth: [0, 0, 1] };
  const still = A.attitudeAxes('spin', { ...d, angle: 0 });
  const quarter = A.attitudeAxes('spin', { ...d, angle: Math.PI / 2 });
  check(same(still.x, A.attitudeAxes('earth', d).x) && same(quarter.z, still.z) && same(quarter.x, still.y, 1e-9) && rightHanded(quarter), 'spin turns the craft about +Z, right-handed: a quarter turn puts +X where +Y was');
  check(near(A.spinAngle(0, 12.5), 0) && near(A.spinAngle(12500 / 4, 12.5), Math.PI / 2) && near(A.spinAngle(12500, 12.5), 0) && near(A.spinAngle(-12500 / 4, 12.5), 1.5 * Math.PI), 'spinAngle: one turn in the period, a function of the time drawn, backwards as well');
  check(A.spinAngle(NaN, 12.5) === 0 && A.spinAngle(1000, 0) === 0 && near(A.spinAngle(A.DEFAULT_SPIN_S * 500), Math.PI), 'spinAngle: no clock, no turn; the default period is DEFAULT_SPIN_S');
}
// which law a record flies
check(A.lawFor('sun-panels', { geostationary: true }) === 'geo' && A.lawFor('nadir', { geostationary: true }) === 'geo' && A.lawFor('sun-panels', {}) === 'sun-panels', 'a geostationary craft that would look at its world keeps its wings north-south');
check(A.lawFor('earth-dish', { orbitsWorld: true }) === 'nadir' && A.lawFor('earth-dish', {}) === 'earth', 'a far probe of the app\'s own looks down at the world it circles, and at the Earth on its way');
check(A.lawFor('spin', { orbitsWorld: true }) === 'spin' && A.lawFor('sun', { geostationary: true }) === 'sun' && A.lawFor('lvlh', {}) === 'lvlh', 'a file\'s own law is kept');
check(['up', 'ascent', 'tumble', 'fixed', 'anti-sun'].every((m) => A.lawFor(m, { geostationary: true, orbitsWorld: true }) === m), 'the other attitudes pass through');
check(A.ruleKey('sun-panels') === 'nadir' && A.ruleKey('earth-dish') === 'earth' && A.ruleKey('geo') === 'geo' && A.ruleKey('tumble') === null && A.ruleKey('fixed') === null, 'the card has words for the laws and none for a tumble or a fixed angle');

// --- 3. a file's own axes -----------------------------------------------------------------------------------------
check(same(A.axisOf('x'), [1, 0, 0]) && same(A.axisOf('+y'), [0, 1, 0]) && same(A.axisOf('-Z'), [0, 0, -1]) && same(A.axisOf([0, -1, 1]), [0, -Math.SQRT1_2, Math.SQRT1_2]), 'an axis is a word or three numbers');
check(A.axisOf('w') === null && A.axisOf('xy') === null && A.axisOf([0, 0, 0]) === null && A.axisOf([1, 2]) === null && A.axisOf(null) === null, 'and nothing else');
{
  const q = A.frameQuat({ face: '+z', panel: 'x' });
  check(same(q, [0, 0, 0, 1]), 'a file already in the app\'s axes is not turned');
  const terra = A.frameQuat({ face: '-y', panel: 'z' });
  check(same(A.turn([0, -1, 0], terra), [0, 0, 1]) && same(A.turn([0, 0, 1], terra), [1, 0, 0]), 'Terra: its -Y (the instruments) lands on +Z and its Z (the wing) on +X');
  const l8 = A.frameQuat({ face: '+x', panel: [0, -1, 1] });
  check(same(A.turn([1, 0, 0], l8), [0, 0, 1]) && same(A.turn([0, -Math.SQRT1_2, Math.SQRT1_2], l8), [1, 0, 0], 1e-9), 'Landsat 8: a wing on a diagonal of the file lands on +X');
  const aqua = A.frameQuat({ face: '+z', panel: 'y', cells: '+x' });
  check(same(A.turn([0, 0, 1], aqua), [0, 0, 1]) && same(A.turn([1, 0, 0], aqua), [0, 1, 0]) && same(A.turn([0, 1, 0], aqua), [-1, 0, 0]), 'Aqua: `cells` puts the cells\' side on +Y, turning the wing axis end for end to do it');
  const skew = A.frameQuat({ face: '+z', panel: [1, 0, 1] });
  check(same(A.turn([1, 0, 0], skew), [1, 0, 0]), 'a second axis that is not square to the face is made square first');
  check(A.frameQuat({ face: 'x', panel: 'x' }) === null && A.frameQuat({ face: 'x', panel: '-x' }) === null && A.frameQuat({ panel: 'x' }) === null && A.frameQuat(null) === null, 'a row with no face, or a second axis along it, is not a frame');
  // every pair of axis words is a proper turn (a unit quaternion that takes the pair where it says)
  for (const f of ['+x', '-x', '+y', '-y', '+z', '-z']) for (const p of ['+x', '-x', '+y', '-y', '+z', '-z']) {
    if (f[1] === p[1]) continue;
    const qq = A.frameQuat({ face: f, panel: p });
    check(qq && near(Math.hypot(...qq), 1) && same(A.turn(A.axisOf(f), qq), [0, 0, 1], 1e-9) && same(A.turn(A.axisOf(p), qq), [1, 0, 0], 1e-9), `face ${f}, panel ${p}: a unit quaternion that puts them on +Z and +X`);
  }
}

// --- 4. the registry's rows ---------------------------------------------------------------------------------------
const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
const rows = [...yaml.matchAll(/^ {2}- \{id: ([\w-]+), file: site\/models\/([\w.-]+\.glb),.*?\battitude: \{([^}]*)\}/gm)].map((m) => ({ id: m[1], file: m[2], text: m[3] }));
check(rows.length >= 28, `registry/models.yaml rows with an attitude were read (${rows.length})`);
check(rows.length === Object.keys(MODEL_FRAMES).length, `data/modelframes.js has one entry a row (${Object.keys(MODEL_FRAMES).length} against ${rows.length}): run python3 scripts/gen_model_frames_js.py`);
const { REAL_MODELS } = await import(at('site/js/scene/realmodels.js'));
const routed = new Map(); // file -> [route]
for (const table of Object.values(REAL_MODELS)) for (const e of Object.values(table)) if (e && e.file) routed.set(e.file, (routed.get(e.file) || []).concat(e));
for (const row of rows) {
  const spec = MODEL_FRAMES[row.file];
  if (!spec) { problems.push(`${row.id}: its row has an attitude and data/modelframes.js has no ${row.file}`); continue; }
  check(A.LAWS.includes(spec.law), `${row.id}: law ${spec.law} is one of scene/attitude.js LAWS`);
  const q = A.frameQuat(spec);
  if (!q) { problems.push(`${row.id}: its axes are not a frame (${JSON.stringify(spec)})`); continue; }
  check(same(A.turn(A.axisOf(spec.face), q), [0, 0, 1], 1e-9), `${row.id}: its face ${JSON.stringify(spec.face)} lands on +Z`);
  check(dot(A.turn(A.axisOf(spec.panel), q), [1, 0, 0]) > 0.999999 || (spec.cells != null && dot(A.turn(A.axisOf(spec.panel), q), [1, 0, 0]) < -0.999999), `${row.id}: its second axis ${JSON.stringify(spec.panel)} lands on +X (or -X, to put its cells on +Y)`);
  if (spec.cells != null) check(same(A.turn(A.axisOf(spec.cells), q), [0, 1, 0], 1e-9), `${row.id}: its cells' side lands on +Y`);
  check(routed.has(row.file), `${row.id}: no route wears ${row.file}, so its attitude points nothing`);
  check(!(routed.get(row.file) || []).some((e) => e.axes === 'app'), `${row.id}: a route says axes: 'app' for ${row.file} and its row gives it axes of its own: one or the other`);
  check(spec.spinS === undefined || (spec.law === 'spin' && spec.spinS > 0), `${row.id}: a spin period is for a spinning craft`);
}
// the craft the review named are flown by a rule
for (const [file, law] of [['iss.glb', 'lvlh'], ['hubble.glb', 'sun'], ['jwst.glb', 'sun'], ['terra.glb', 'nadir'], ['landsat8.glb', 'nadir'], ['goes.glb', 'geo'], ['tdrs.glb', 'geo'], ['voyager.glb', 'earth'],
  ['pioneer.glb', 'spin'], ['juno.glb', 'spin'], ['cassini.glb', 'earth'], ['parker.glb', 'sun'], ['soho.glb', 'sun'], ['mro.glb', 'nadir'], ['odyssey.glb', 'sun'], ['maven.glb', 'sun']]) {
  check(MODEL_FRAMES[file] && MODEL_FRAMES[file].law === law, `${file} is flown by the law ${law} (${JSON.stringify(MODEL_FRAMES[file])})`);
}
check(MODEL_FRAMES['pioneer.glb'].spinS === 12.5, 'Pioneer 10 and 11 turn once in 12.5 s (4.8 turns a minute, the row\'s source)');

// --- 5. the scene flies a framed file by its law ------------------------------------------------------------------
const THREE = await import(at('site/vendor/three.module.min.js'));
const M = await import(at('site/js/scene/models.js'));
const fly = (file, law, state, record = { id: 'x' }, tMs = 0) => {
  const obj = new THREE.Group();
  obj.userData.attitude = law;
  obj.userData.frame = A.frameQuat(MODEL_FRAMES[file]);
  Object.assign(obj.userData, state.user || {});
  M.updateModelAttitude(obj, record, state.sun, state.nadir, tMs);
  // where an axis of the FILE points in the scene
  return (axis) => new THREE.Vector3(...A.axisOf(axis)).applyQuaternion(obj.quaternion).toArray();
};
{
  const sun = { x: 0.3, y: 0.2, z: 0.933 };
  const nadir = { x: -1, y: 0, z: 0 };
  // the ISS: its nadir face (-Y of NASA's file) at the Earth, its forward end (-X) along the track
  const heading = { x: 0, y: 0.6, z: 0.8 };
  const iss = fly('iss.glb', 'lvlh', { sun, nadir, user: { heading } });
  check(same(iss('-y'), [-1, 0, 0], 1e-6) && same(iss('-x'), [0, 0.6, 0.8], 1e-6), `the ISS flies its file's -Y at the Earth and its -X forward (${iss('-y').map((v) => v.toFixed(3))}; ${iss('-x').map((v) => v.toFixed(3))})`);
  // without a heading this frame it is still Earth face down (the rule every shape had)
  check(same(fly('iss.glb', 'lvlh', { sun, nadir })('-y'), [-1, 0, 0], 1e-6), 'the ISS with no heading known still has its nadir face down');
  // Terra: the instruments (-Y) down, the wing (Z) square to the Sun
  const terra = fly('terra.glb', 'nadir', { sun, nadir });
  const s = A.unit(sun);
  check(same(terra('-y'), [-1, 0, 0], 1e-6) && near(dot(terra('z'), s), 0, 1e-6), 'Terra flies its instruments at the ground and its wing square to the Sun');
  // GOES: Earth deck (+Y) down, the wing's axis (X) along north
  const goes = fly('goes.glb', 'geo', { sun, nadir, user: { north: { x: 0, y: 1, z: 0 } } });
  check(same(goes('+y'), [-1, 0, 0], 1e-6) && Math.abs(goes('x')[1]) > 1 - 1e-6, 'GOES flies its Earth deck at the Earth and its wing north-south');
  // Webb: the hot side (-Y) at the Sun, the telescope (+Z) square to it
  const webb = fly('jwst.glb', 'sun', { sun, nadir, user: { north: { x: 0, y: 1, z: 0 } } });
  check(same(webb('-y'), s, 1e-6) && near(dot(webb('+z'), s), 0, 1e-6) && webb('+z')[1] > 0, 'Webb turns its sunshield\'s hot side to the Sun and looks square to it, north of the sky');
  // Hubble: the cells (+Z) at the Sun, the tube (+Y) square to it
  const hubble = fly('hubble.glb', 'sun', { sun, nadir, user: { north: { x: 0, y: 1, z: 0 } } });
  check(same(hubble('+z'), s, 1e-6) && near(dot(hubble('+y'), s), 0, 1e-6), 'Hubble turns its cells to the Sun and looks square to it');
  // Voyager: the dish (+Y) at the Earth
  const earthDir = { x: 0.6, y: -0.8, z: 0 };
  const voyager = fly('voyager.glb', 'earth', { sun, nadir, user: { earthDir } });
  check(same(voyager('+y'), [0.6, -0.8, 0], 1e-6), `Voyager points its dish at the Earth (${voyager('+y').map((v) => v.toFixed(3))})`);
  check(same(fly('voyager.glb', 'earth', { sun, nadir })('+y'), [-1, 0, 0], 1e-6), 'and with the Earth not drawn, at the centre of the view, as before');
  // Pioneer: the dish (-Z) at the Earth, and a turn about it between two drawn times (no wall clock here, so the turn is the drawn time's)
  const p0 = fly('pioneer.glb', 'spin', { sun, nadir, user: { earthDir, spinS: 12.5 } }, { id: 'p' }, 0);
  const p1 = fly('pioneer.glb', 'spin', { sun, nadir, user: { earthDir, spinS: 12.5 } }, { id: 'p' }, 3125);
  check(same(p0('-z'), [0.6, -0.8, 0], 1e-6) && same(p1('-z'), [0.6, -0.8, 0], 1e-6), 'Pioneer keeps its dish at the Earth while it turns');
  check(near(dot(p0('x'), p1('x')), 0, 1e-6), 'and a quarter of its 12.5 s later it has made a quarter turn');
  // a file with no frame keeps the seeded constant angle, the same on every call
  const plain = new THREE.Group();
  M.updateModelAttitude(plain, { id: 'sat-1' }, sun, nadir, 0);
  const q1 = plain.quaternion.toArray();
  M.updateModelAttitude(plain, { id: 'sat-1' }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, 5e6);
  check(same(q1, plain.quaternion.toArray()) && plain.userData.fixedQuat, 'a model with no law keeps the seeded constant angle');
}
// scene/heroes.js: the nadir of a craft that goes round another world than the stage's is that world's centre
{
  const H = await import(at('site/js/scene/heroes.js'));
  const out = new THREE.Vector3();
  const centreOf = (id, v) => (id === 'mars' ? v.set(100, 0, 0) : null);
  const pos = new THREE.Vector3(100, 5, 0);
  H.nadirOf({ id: 'deep-mars-odyssey', propagator: 'kepler' }, pos, centreOf, out, 'mars-inertial');
  check(same(out.toArray(), [0, -1, 0], 1e-9), `Mars Odyssey looks down at Mars from another world's stage (${out.toArray()})`);
  H.nadirOf({ id: 'sat-25544', propagator: 'sgp4' }, pos, centreOf, out, 'earth-inertial');
  check(same(out.toArray(), A.unit([-100, -5, 0]), 1e-9), 'a satellite of the stage\'s own world looks at the origin');
  H.nadirOf({ id: 'deep-voyager-1', propagator: 'kepler' }, pos, centreOf, out, 'sun-inertial');
  check(same(out.toArray(), A.unit([-100, -5, 0]), 1e-9), 'a craft going round the Sun keeps the stage\'s origin: the Sun is nobody\'s ground');
  H.nadirOf({ id: 'x', propagator: 'kepler' }, pos, centreOf, out);
  check(same(out.toArray(), A.unit([-100, -5, 0]), 1e-9), 'and with no frame given, as before');
}
const heroes = readFileSync(join(ROOT, 'site/js/scene/heroes.js'), 'utf8');
check(/clone\.userData\.fileFrame/.test(heroes) && /clone\.userData\.frame = ff\.q/.test(heroes) && /lawOf\(ff\.law, record\)/.test(heroes), 'scene/heroes.js flies a loaded file by its row\'s law and frame');
check(/law === 'lvlh'\) && c\.p/.test(heroes) && /obj\.userData\.north = /.test(heroes) && /obj\.userData\.earthDir = /.test(heroes), 'and writes the heading, the north and the Earth\'s direction on the object each frame');
const real = readFileSync(join(ROOT, 'site/js/scene/realmodels.js'), 'utf8');
check(/cellsOnY = true/.test(heroes) && /rigid: !!u\.cellsOnY/.test(readFileSync(join(ROOT, 'site/js/scene/models.js'), 'utf8')), 'only a file whose cells are known to be on +Y is turned end for end by `geo`');
check(/import\('\.\.\/data\/modelframes\.js'\)/.test(real) && /out\.userData\.fileFrame = \{ law: row\.law, q/.test(real), 'scene/realmodels.js puts a file\'s frame on the loaded model, fetched with the loader and not at boot');

// --- 6. the card ---------------------------------------------------------------------------------------------------
const C = await import(at('site/js/ui/cards.js'));
const { COPY } = await import(at('site/js/copy/en.js'));
const T = COPY.drawing.attitude;
check(T && /modelled, not measured/.test(T.lead) && T.lead.includes('{rule}') && A.LAWS.every((l) => typeof T.rules[A.ruleKey(l)] === 'string' && T.rules[A.ruleKey(l)].length > 0), 'COPY.drawing.attitude says "modelled, not measured" and has a rule for every law');
const sat = (norad, name, klass = 'satellite', meta = {}) => ({ id: `sat-${norad}`, name, klass, layer: 'active', frame: 'earth-inertial', meta: { noradId: norad, ...meta } });
const line = (r) => C.attitudeLine(r) || '';
check(line(sat(25544, 'ISS (ZARYA)', 'station')).includes(T.rules.lvlh) && /modelled, not measured/.test(line(sat(25544, 'ISS (ZARYA)', 'station'))), `the ISS's card says its attitude is modelled, and the rule (${line(sat(25544, 'ISS (ZARYA)', 'station'))})`);
check(line(sat(25994, 'TERRA')).includes(T.rules.nadir), 'Terra: one face to the world below');
check(line(sat(20580, 'HST', 'telescope')).includes(T.rules.sun), 'Hubble: one side to the Sun');
check(line(sat(41866, 'GOES 16', 'satellite', { meanMotion: 1.0027, eccentricity: 0.0001, inclinationDeg: 0.05 })).includes(T.rules.geo), 'GOES 16: wings north and south');
check(line({ id: 'deep-voyager-1', name: 'Voyager 1', klass: 'probe', frame: 'sun-inertial', meta: { horizonsId: -31 } }).includes(T.rules.earth), 'Voyager 1: its dish at the Earth');
check(line({ id: 'deep-pioneer-10', name: 'Pioneer 10', klass: 'probe', frame: 'sun-inertial', meta: { horizonsId: -23 } }).includes(T.rules.spin), 'Pioneer 10: turning about its dish\'s line');
check(line({ id: 'deep-new-horizons', name: 'New Horizons', klass: 'probe', frame: 'sun-inertial', meta: { horizonsId: -98 } }).includes(T.rules.earth), 'New Horizons, a shape built here: its dish at the Earth on its way');
check(line({ id: 'deep-mars-express', name: 'Mars Express', klass: 'probe', frame: 'mars-inertial', meta: { horizonsId: -41 } }).includes(T.rules.nadir), 'Mars Express, in orbit: one face to the world below');
check(line(sat(99990, 'SOME SATELLITE')).includes(T.rules.nadir), 'a satellite with the class shape is pointed by the class\'s rule and says so');
check(line(sat(8820, 'LAGEOS 1')) === '', 'a file with no axes on record (LAGEOS) says nothing of which way it points');
check(line(sat(39574, 'GPM-CORE')) === '', 'nor does GPM, whose NASA file has no attitude row yet');
check(line({ id: 'asteroid-433', name: 'Eros', klass: 'asteroid', meta: {} }) === '' && line({ id: 'luna-16', name: 'Luna 16', klass: 'site', meta: {} }) === '', 'an asteroid and a landing site have no such line');
// every language has the same keys
for (const lang of ['ar', 'de', 'es', 'fr', 'he', 'hi', 'pt', 'ru', 'uk', 'zh']) {
  const text = readFileSync(join(ROOT, `site/js/copy/${lang}.js`), 'utf8');
  const block = /"?attitude"?: \{\s*"?lead"?: "([^"]*)",\s*"?rules"?: \{([^}]*)\}/.exec(text);
  check(!!block && block[1].includes('{rule}'), `copy/${lang}.js has drawing.attitude.lead with its {rule} slot`);
  if (block) for (const key of Object.keys(T.rules)) check(new RegExp(`"?${key}"?: "[^"]+"`).test(block[2]), `copy/${lang}.js has drawing.attitude.rules.${key}`);
}

if (problems.length) { console.error('attitude FAILED:\n  ' + problems.slice(0, 40).join('\n  ') + (problems.length > 40 ? `\n  ... and ${problems.length - 40} more` : '')); process.exit(1); }
console.log(`attitude ok: the directions, six laws round an orbit and through the seasons, ${rows.length} files' own axes from the registry, the scene flying the ISS, Terra, GOES, Webb, Hubble, Voyager and Pioneer by their rows, and the card's sentence in eleven languages`);
