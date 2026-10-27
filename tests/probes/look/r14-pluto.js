// r14-pluto: Pluto and Charon in natural colour (release 1.4.0 stage r14-pluto; Ivan, 2026-10-26: "Please
// fix the Pluto, it is disaster what happened to Pluto").
//
// EVERY PLACE TWICE, IN ONE RUN: as this branch draws it, then with main's two maps put back (fetched from
// the repository at main's commit 6080a20d, which raw.githubusercontent.com serves with CORS) and this
// branch's relief and haze taken off: the before, from the same frame, clock and camera.
//
// THE PLACES. Pluto first as a visitor meets it (searched from the Earth's stage, then its own stage as
// "Go there" frames it), then on its own stage with the clock held and turned so that each of four
// longitudes is under the Sun -- the heart (Sputnik Planitia, 180 E), the side that faces Charon (0 E),
// and 90 E and 270 E -- each seen from a little off the Sun's line; then over the unimaged south and
// the north pole, square-on to the terminator, from behind (the haze), and wide with Charon. Then Charon
// on its own stage the same way: Mordor Macula (its red north pole), the side facing Pluto, the far
// side, and both limbs. Beside each picture (out.json `scenes`): the longitude under the Sun and under
// the camera, the phase angle, and whether the map, the relief and the haze are worn.
look.probe = 'r14-pluto';
const out = { scenes: [], problems: [] };
const D2R = Math.PI / 180;
const MAIN = 'https://raw.githubusercontent.com/Sara-Managed-Projects/space-radar/6080a20d/site/textures/';
const AT = Date.UTC(2026, 9, 27, 0, 0, 0);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const mesh = (id) => sr.worlds.meshFor(id);
const uni = (id) => { const m = mesh(id); return m && m.material && m.material.uniforms; };
/** A mesh's own axes in the scene, unit length (its scale taken out). */
const axes = (id) => { const m = mesh(id); m.updateMatrixWorld(); const e = m.matrixWorld.elements; return [unit({ x: e[0], y: e[1], z: e[2] }), unit({ x: e[4], y: e[5], z: e[6] }), unit({ x: e[8], y: e[9], z: e[10] })]; };
/** A place on a world's map as a unit vector in the scene (scene/worlds.js faceVector's convention). */
const placeDir = (id, lat, lon) => {
  const [ax, ay, az] = axes(id); const la = lat * D2R; const lo = lon * D2R;
  const v = { x: Math.cos(la) * Math.cos(lo), y: Math.sin(la), z: -Math.cos(la) * Math.sin(lo) };
  return unit(add(add(scale3(ax, v.x), ay, v.y), az, v.z));
};
const scale3 = (a, k) => ({ x: a.x * k, y: a.y * k, z: a.z * k });
/** East longitude and latitude of the point of a world under a scene direction. */
const lonLatOf = (id, d) => { const [ax, ay, az] = axes(id); const x = dot(ax, d); const y = dot(ay, d); const z = dot(az, d); return { lon: ((Math.atan2(-z, x) / D2R) + 360) % 360, lat: Math.asin(Math.max(-1, Math.min(1, y))) / D2R }; };
const wrap180 = (a) => ((a + 540) % 360) - 180;
const camDir = (id) => { const p = mesh(id).position; const c = sr.camera.position; return unit({ x: c.x - p.x, y: c.y - p.y, z: c.z - p.z }); };

/** Put the clock where longitude `lon` of `id` is under the Sun (the world turns; the Sun stays). */
const sunOver = async (id, lon) => {
  const t0 = sr.clock.now();
  const s0 = lonLatOf(id, sunward(id)).lon;
  sr.clock.goTo(t0 + 3600e3); await sleep(400);
  const s1 = lonLatOf(id, sunward(id)).lon;
  const perHour = wrap180(s1 - s0) || 2.35;
  let t = t0 + 3600e3 + (wrap180(lon - s1) / perHour) * 3600e3;
  for (let i = 0; i < 3; i++) {
    sr.clock.goTo(t); await sleep(500);
    const now = lonLatOf(id, sunward(id)).lon;
    t += (wrap180(lon - now) / perHour) * 3600e3;
  }
  sr.clock.goTo(t); await sleep(1200);
};

// The before: main's maps, from the repository at main's commit, as textures of the page's own kind.
const before = {};
const loadMain = async (id, file) => {
  const u = uni(id); const tex = u && u.uMap && u.uMap.value;
  if (!tex) { out.problems.push(id + ': no map worn, so no before'); return; }
  try {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = MAIN + file; await img.decode();
    const old = tex.clone(); old.source = new tex.source.constructor(img); old.needsUpdate = true;
    before[id] = { old, now: tex };
  } catch (e) { out.problems.push(id + ': main\'s map did not load: ' + e); }
};
const state = (id) => { const u = uni(id); return u ? { map: u.uHasMap.value, relief: +u.uReliefK.value.x.toFixed(4), rim: +u.uRimGain.value.toFixed(3), rimFwd: u.uRimFwd ? +u.uRimFwd.value.toFixed(3) : null } : null; };
/** The two pictures of one place: this branch, then main's maps without the relief and the haze. */
const pair = async (id, name, note, others = []) => {
  const sun = lonLatOf(id, sunward(id)); const cam = lonLatOf(id, camDir(id));
  const phase = Math.acos(Math.max(-1, Math.min(1, dot(sunward(id), camDir(id))))) / D2R;
  await shot(name + '-after', note + ' (this branch)', 2500);
  // Where the world's north points on the screen, degrees clockwise from up: the PR turns its pictures by it.
  let northDeg = null;
  try { const m = mesh(id); const a = m.position.clone().project(sr.camera); const nv = north(id); const b = m.position.clone().add(m.position.clone().set(nv.x, nv.y, nv.z).multiplyScalar(m.scale.x)).project(sr.camera); northDeg = +(Math.atan2((b.x - a.x) * innerWidth, (b.y - a.y) * innerHeight) / D2R).toFixed(1); } catch (e) { out.problems.push('north angle: ' + e); }
  const row = { name, note, northDeg, sunLon: +sun.lon.toFixed(1), sunLat: +sun.lat.toFixed(1), camLon: +cam.lon.toFixed(1), camLat: +cam.lat.toFixed(1), phase: +phase.toFixed(1), after: state(id), clock: new Date(sr.clock.now()).toISOString(), distance: rig.state.distance };
  const kept = [];
  for (const w of [id, ...others]) {
    const u = uni(w); const b = before[w];
    if (!u || !b) continue;
    kept.push([u, { map: u.uMap.value, relief: u.uReliefK.value.clone(), rim: u.uRimGain.value, fwd: u.uRimFwd ? u.uRimFwd.value : 0 }]);
    u.uMap.value = b.old; u.uReliefK.value.set(0, 0, 0); u.uRimGain.value = 0; if (u.uRimFwd) u.uRimFwd.value = 0;
  }
  if (kept.length) {
    await shot(name + '-before', note + ' (main\'s maps, no relief, no haze)', 2500);
    for (const [u, k] of kept) { u.uMap.value = k.map; u.uReliefK.value.copy(k.relief); u.uRimGain.value = k.rim; if (u.uRimFwd) u.uRimFwd.value = k.fwd; }
    await sleep(800);
  }
  out.scenes.push(row);
};
const look2 = (id, dir, distance) => { rig.flyTo({ offset: dir, distance, ms: 0 }); };
const until2 = (id) => until(() => { const u = uni(id); return u && u.uHasMap.value === 1; }, 60000, 500);

try {
  sr.clock.goTo(AT);
  sr.clock.setPaused(true);
  // 1. As a visitor meets it: searched from the Earth's stage (a click on its row), then "Go there".
  if (!(await go('pluto', '', 12000))) out.problems.push('no record pluto');
  await until2('pluto');
  await loadMain('pluto', '2k_pluto_nh_colour.webp');
  await loadMain('charon', '2k_charon_nh_colour.webp');
  await pair('pluto', 'p0-search', 'Pluto selected from the Earth\'s stage, as a search lands');
  await stage('pluto', 9000);
  await until2('pluto');
  await until(() => uni('pluto').uReliefK.value.x > 0, 30000, 500);
  const d = rig.state.distance;
  out.plutoDistance = d;
  await pair('pluto', 'p1-stage', 'Pluto\'s own stage as "Go there" frames it');
  // 2. Four longitudes under the Sun, each from a little off the Sun's line (so the terminator shows).
  // The heart as NASA's PIA19952 saw it: the Sun over 180 E, the camera over 150 E, 25 N (that picture's view).
  await sunOver('pluto', 180);
  look2('pluto', placeDir('pluto', 25, 150), d);
  await pair('pluto', 'p2-heart', 'the heart at PIA19952\'s view: the camera over 150 E, 25 N, the Sun over 180 E', ['charon']);
  for (const [lon, tag, what] of [[0, 'p3-charon-side', 'the side that faces Charon (0 E) under the Sun'], [90, 'p4-90e', '90 E (Cthulhu) under the Sun'], [270, 'p5-270e', '270 E under the Sun']]) {
    await sunOver('pluto', lon);
    const s = sunward('pluto');
    look2('pluto', unit(mix(placeDir('pluto', 12, lon), 1, unit(cross(s, north('pluto'))), 0.25)), d);
    await pair('pluto', tag, what, ['charon']);
  }
  // 3. The unimaged south and the north, the terminator square-on, and from behind for the haze.
  await sunOver('pluto', 180);
  let s = sunward('pluto');
  look2('pluto', unit(mix(north('pluto'), -0.75, s, 0.75)), d);
  await pair('pluto', 'p6-south', 'from 45 degrees south of the Sun\'s line: the modelled south');
  look2('pluto', unit(mix(north('pluto'), 0.8, s, 0.6)), d);
  await pair('pluto', 'p7-north', 'over the north pole, leaning to the Sun');
  look2('pluto', unit(mix(s, 0.05, unit(cross(s, north('pluto'))), 1)), d);
  await pair('pluto', 'p8-terminator', 'square-on to the terminator (phase near 90 degrees)');
  look2('pluto', unit(mix(s, -1, unit(cross(s, north('pluto'))), 0.12)), d * 0.9);
  await pair('pluto', 'p9-backlit', 'from behind, the Sun just off Pluto\'s far limb: the haze');
  // 4. Wide, with Charon in the picture.
  const cp = mesh('charon').position; const pp = mesh('pluto').position;
  const toC = unit({ x: cp.x - pp.x, y: cp.y - pp.y, z: cp.z - pp.z });
  look2('pluto', unit(mix(s, 1, toC, -0.9)), d * 9);
  await pair('pluto', 'p10-wide', 'Pluto and Charon together from the sunward side', ['charon']);
  // 5. Charon on its own stage.
  await stage('charon', 9000);
  await until2('charon');
  const dc = rig.state.distance;
  for (const [lat, lon, tag, what] of [[60, 0, 'c1-mordor', 'Mordor Macula, Charon\'s red north pole'], [10, 0, 'c2-pluto-side', 'the side that faces Pluto (0 E)'], [10, 180, 'c3-far-side', 'the side away from Pluto (180 E)'], [10, 90, 'c4-90e', '90 E'], [10, 270, 'c5-270e', '270 E'], [-40, 0, 'c6-south', 'the modelled south']]) {
    await sunOver('charon', lon);
    s = sunward('charon');
    look2('charon', unit(mix(placeDir('charon', lat, lon), 1, s, 0.35)), dc);
    await pair('charon', tag, what);
  }
} catch (e) { look.errors.push('probe: ' + (e && e.stack || e)); }
sr.clock.setPaused(false);
sr.clock.live();
out.tier = sr.quality ? sr.quality.describe() : null;
return finish(out);
