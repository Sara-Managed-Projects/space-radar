// tests/test_groundtrack.mjs -- the followed object's track on the globe and the ride along
// (spec 0048 task 4): 271 samples from -45 to +90 minutes, 28 ticks at the sub-satellite points the
// card's chart (ui/trajectory.js sampleTrajectory) puts at the same instants, labels on every third
// future tick, three draw objects turning with the Earth, the 10 s and scrub rebuilds, off above
// 2 000 km unless asked; and the rig's ride along: the pose, the ease, and the way back to follow.
//
//   node tests/test_groundtrack.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const gt = await import(join(JS, 'scene/groundtrack.js'));
const { trackTimes, tickTimes, subPoint, trackPoints, wantsTrack, fadeColour, createGroundTrack, LIFT_KM } = gt;
const { sampleTrajectory, periodMsOfSgp4 } = await import(join(JS, 'ui/trajectory.js'));
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { gmst } = await import(join(JS, 'propagate/frames.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;

const gp = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
const [iss] = parseCelestrakGP(gp, { layer: 'stations', source: 'celestrak-stations' });
const T0 = iss.epoch + 3 * 3600e3;
stage.setTime(T0);

// --- 1. the sampling ---------------------------------------------------------------------------
const times = trackTimes(T0);
check(times.length === 271 && times[0] === T0 - 45 * 60e3 && times[270] === T0 + 90 * 60e3 && times.includes(T0), `271 samples, -45 to +90 min, now among them (${times.length})`);
const ticks = tickTimes(T0);
check(ticks.length === 28 && ticks[0].minutes === -45 && ticks[27].minutes === 90 && ticks.some((k) => k.minutes === 0), `28 ticks every 5 minutes (${ticks.length})`);
const pts = trackPoints(iss, T0);
check(pts.length === 271 && pts.every((p) => Math.abs(p.latDeg) <= 52), 'every point is placed, under the 51.6 degree inclination');

// The ticks sit where the card's own chart puts the object at the same instants: sampleTrajectory
// with laps and n chosen so its samples fall every five minutes from now.
const P = periodMsOfSgp4(iss);
const chart = sampleTrajectory(iss, T0, (90 * 60e3) / P, 18);
let worst = 0;
for (const c of chart) {
  const m = Math.round((c.tMs - T0) / 60e3);
  const tk = ticks.find((k) => k.minutes === m);
  if (!tk) { problems.push(`a chart sample at +${m} min has no tick`); continue; }
  const s = subPoint(iss, tk.tMs);
  const d = Math.max(Math.abs(s.latDeg - c.latDeg), Math.abs(((s.lonDeg - c.lonDeg + 540) % 360) - 180));
  worst = Math.max(worst, d);
}
check(chart.length === 19 && worst < 1e-6, `the 19 future ticks from now to +90 are at the chart's sub-satellite points (worst ${worst.toExponential(1)} deg)`);

// --- 2. the drawing ---------------------------------------------------------------------------------
const rigState = { following: true, riding: false };
const scene = new THREE.Scene();
const track = createGroundTrack(scene, { cameraRig: { state: rigState }, worlds: null });
check(scene.children.includes(track.group) && track.group.children.length === 3, 'three draw objects: the past, the future, the ticks');
track.set(iss);
track.update(T0);
const st = track.state();
check(st.visible && st.points === 271 && st.ticks === 28, `drawn with 271 points and 28 ticks (${st.points}, ${st.ticks})`);
check(st.labels.join() === '15,30,45,60,75,90', `labels on every third future tick (${st.labels})`);
check(near(track.group.rotation.y, gmst(new Date(T0)), 1e-12), 'the track turns with the Earth: rotation.y = GMST');
const [pastLine, futureLine, tickLines] = track.group.children;
check(pastLine.material.isLineDashedMaterial && pastLine.material.opacity === 0.4, 'the past is dashed at 40 %');
check(futureLine.material.vertexColors === true && futureLine.geometry.attributes.color.count === 181, `the future fades vertex by vertex over 181 points (${futureLine.geometry.attributes.color.count})`);
check(pastLine.geometry.attributes.position.count === 91, `the past has 91 points (${pastLine.geometry.attributes.position.count})`);
// The first future vertex, turned with the Earth, is on the ground below the station: the same
// direction from the centre as the station, within the geodetic-vs-radial difference (< 0.2 deg),
// and 15 km above the ellipsoid.
track.group.updateMatrixWorld();
const v0 = new THREE.Vector3().fromBufferAttribute(futureLine.geometry.attributes.position, 0).applyMatrix4(track.group.matrixWorld);
const p = propagate(iss, T0);
const sat = stage.toScene(p, p.frame, T0);
const ang = v0.angleTo(sat) * 180 / Math.PI;
check(ang < 0.2, `the track at now is under the station (${ang.toFixed(3)} deg off its radial)`);
const hKm = v0.length() * stage.unitKm - 6371;
check(hKm > 0 && hKm < 40, `and lifted just above the ground (${hKm.toFixed(1)} km over a 6 371 km sphere; ${LIFT_KM} km over the ellipsoid)`);
check(fadeColour(0).getHexString() === 'ff9f43' && fadeColour(1).getHexString() === '9aa4b2', 'the fade runs ember to the dim text');
// Rebuilds: not within 10 s of clock time; at 10 s; at once on a scrub back.
const built = track.state().builtAt;
track.update(T0 + 5e3);
check(track.state().builtAt === built, 'no rebuild inside 10 s');
track.update(T0 + 10e3);
check(track.state().builtAt === T0 + 10e3, 'rebuilt after 10 s of clock time');
track.update(T0 - 60e3);
check(track.state().builtAt === T0 - 60e3, 'rebuilt at once on a scrub back');
rigState.following = false;
track.update(T0);
check(!track.group.visible, 'not followed, not drawn');
rigState.following = true;
stage.setWorld('mars');
track.update(T0 + 20e3);
check(!track.group.visible, 'not on another world\'s stage');
stage.setWorld('earth');

// A geostationary satellite: off by default, on when asked.
const geoRow = { ...gp[0], OBJECT_NAME: 'SOME GEO', NORAD_CAT_ID: 99001, OBJECT_ID: '2020-001A', MEAN_MOTION: 1.0027, ECCENTRICITY: 0.0001, INCLINATION: 0.05 };
const [geo] = parseCelestrakGP([geoRow], { layer: 'geo-ring', source: 'x' });
check(!wantsTrack(geo, T0) && wantsTrack(geo, T0, true), 'above 2 000 km the track is off unless asked');
check(wantsTrack(iss, T0) && !wantsTrack({ propagator: 'static', frame: 'sun-inertial' }, T0), 'on for the ISS, never for a star');
track.set(geo);
track.update(T0 + 30e3);
check(!track.group.visible, 'a geostationary track is not drawn by itself');
track.set(geo, { forced: true });
track.update(T0 + 40e3);
check(track.group.visible, 'and is when the card asks');
track.set(null);
check(!track.group.visible, 'cleared with the selection');

// --- 3. ride along -------------------------------------------------------------------------------------
const cam = new THREE.PerspectiveCamera(45, 1.5, 1e-5, 1e9);
cam.position.set(0, 0, 30);
const rig = createCameraRig(cam, null);
rig.setWorldCentre({ x: 0, y: 0, z: 0 });
rig.setWorldRadius(6.371);
const pos = new THREE.Vector3(6.8, 0, 0);
const vel = new THREE.Vector3(0, 0, -0.0077);
const getPos = () => pos;
rig.follow(getPos);
check(rig.rideAlong(getPos, () => vel, { back: 0.06, up: 0.02, lookAhead: 0.4, ms: 800 }), 'the ride starts');
check(rig.state.riding === true, 'the rig says it is riding');
rig.update(0.2);
const halfway = cam.position.clone();
check(halfway.distanceTo(new THREE.Vector3(6.82, 0, 0.06)) > 1, 'a quarter of the way in, the camera is still on its way (eased, not cut)');
for (let i = 0; i < 6; i++) rig.update(0.2);
const want = new THREE.Vector3(6.8 + 0.02, 0, 0.06); // 60 km behind (-v), 20 km up (+r)
check(cam.position.distanceTo(want) < 1e-9, `after the ease: 60 km behind and 20 km above (${cam.position.toArray().map((x) => x.toFixed(4))})`);
const look = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
const ahead = new THREE.Vector3(6.8, 0, -0.4).sub(cam.position).normalize();
check(look.angleTo(ahead) < 1e-6, 'looking 400 km ahead along the velocity');
check(cam.up.distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-9, 'with the local vertical as up, so the horizon is level');
pos.set(6.8, 0, -0.1); // the object moves on: the camera goes with it
rig.update(0.016);
const moved = pos.clone().add(new THREE.Vector3(0, 0, 0.06)).addScaledVector(pos.clone().normalize(), 0.02);
check(cam.position.distanceTo(moved) < 1e-9, 'the camera moves with the object');
rig.stopRide('input');
check(rig.state.riding === false && rig.state.following === true, 'stopping gives the ordinary follow back');
check(cam.up.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-9, 'and the up it had');
// A flight ends a ride; so does stopFollow (a deselect).
rig.rideAlong(getPos, () => vel, { ms: 0 });
rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: 22, ms: 0 });
check(rig.state.riding === false, 'a flight ends the ride');
rig.rideAlong(getPos, () => vel, { ms: 0 });
rig.update(0.016);
rig.stopFollow();
check(rig.state.riding === false && rig.state.following === false, 'a deselect ends the ride and the follow');
// The object cannot be placed: the ride ends rather than freezing the camera.
rig.follow(getPos);
rig.rideAlong(() => null, () => vel, { ms: 0 });
rig.update(0.016);
check(rig.state.riding === false, 'a ride on nothing ends by itself');

// --- 4. the wiring --------------------------------------------------------------------------------------
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/back: 60 \/ u, up: 20 \/ u, lookAhead: 400 \/ u/.test(main), 'main.js asks for 60 km back, 20 km up, 400 km ahead');
check(/ctx\.groundTrack\.set\(record\)/.test(main) && /ctx\.groundTrack\.set\(null\)/.test(main), 'the track follows select and deselect');
const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
check(/G\.lookBeside : G\.rideAlong/.test(cards), 'under reduced motion the button says "Look from beside it"');

if (problems.length) {
  console.error('groundtrack FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`groundtrack ok: 271 points and 28 ticks, the future ticks at the chart's sub-satellite points (worst ${worst.toExponential(1)} deg), under the station at now (${ang.toFixed(3)} deg), rebuilt on 10 s and a scrub, off above 2 000 km unless asked; ride along 60 km back, 20 km up, eased, level, and back to follow on input`);
