// A SELECTED STATION ARRIVES CLOSE ENOUGH TO BE DRAWN AT FULL SIZE.
//
// Clicking Tiangong parked the camera 7 000 km away -- 35 % of the stations layer's nearKm -- and at
// that distance scene/heroes.js's altitude cap (a model never larger than its height above the
// ground, so it cannot reach into the planet) shrank the selection to 76 px, smaller than the
// unselected satellites around it. Measured in a browser, 2026-09-21. closeUpDistance() solves the
// arrival from the cap itself, and main.js takes the nearer of the two.
//
// heroScale is restated here rather than imported: it is private to heroes.js, and the numbers ARE
// the point -- if its arithmetic changes, this is meant to break and be re-derived.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const THREE = await import(join(JS, '../vendor/three.module.min.js'));
const { closeUpDistance, ARRIVAL_REACH, capForNeighbour, nearestAltitude } = await import(join(JS, 'scene/heroes.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const SELECTED_PX = 260, CLEARANCE = 0.9, EARTH_KM = 6371;
const f = 1 / Math.tan((45 / 2) * Math.PI / 180);
const u = (km) => km / stage.unitKm;
// the diameter heroScale draws, in pixels, for a model of this reach at distance d (scene units)
const drawnPx = (altKm, d, h, reach) => {
  const want = (SELECTED_PX * 2 * d) / (h * f);
  const scale = Math.min(want, (u(altKm) * CLEARANCE) / reach);
  return (scale * h * f) / (2 * d);
};
const at = (altKm) => new THREE.Vector3(u(EARTH_KM + altKm), 0, 0);

check(stage.worldId === 'earth', `this test assumes the Earth stage, got ${stage.worldId}`);
for (const [name, altKm] of [['Tiangong', 395], ['ISS', 431], ['Hubble', 530], ['a Starlink', 550]]) {
  for (const h of [568, 750, 1200]) {
    const d = closeUpDistance(at(altKm), h, f);
    check(Number.isFinite(d) && d > 0, `${name} at h=${h}: no finite arrival (${d})`);
    // the whole point: every model up to the widest one shipped is drawn at its full size there
    const px = drawnPx(altKm, d, h, ARRIVAL_REACH);
    check(px >= SELECTED_PX - 0.5, `${name} at h=${h}: arrives ${Math.round(d * stage.unitKm)} km out and draws ${px.toFixed(0)} px, not ${SELECTED_PX}`);
    // ... and it is not pointlessly close: a little farther and the cap would bite
    check(drawnPx(altKm, d * 1.1, h, ARRIVAL_REACH) < SELECTED_PX - 1, `${name} at h=${h}: the arrival is closer than it needs to be`);
  }
}
// the reproduction: the old 7 000 km arrival draws Tiangong far below the selection size
const old = drawnPx(395, u(7000), 750, 0.698);
check(old < 100, `the old arrival must reproduce the bug (Tiangong at 7 000 km drew ${old.toFixed(0)} px)`);
// nothing to clamp: at or below the ground, and garbage, do not constrain the arrival
check(closeUpDistance(at(0), 750, f) === Infinity, 'a ground site is not constrained by an altitude cap');
check(closeUpDistance(new THREE.Vector3(u(1000), 0, 0), 750, f) === Infinity, 'a point inside the planet is not constrained');
check(closeUpDistance(null, 750, f) === Infinity, 'no position, no constraint');
check(closeUpDistance(at(400), 0, f) === Infinity, 'no viewport, no constraint');

// The whole globe on a phone (2026-09-22): 3.5 radii cut a portrait screen's Earth at both sides.
{
  const { worldFramingDistance } = await import(join(JS, 'scene/camera.js'));
  const R = 6.371;
  const halfWidth = (d, fov, aspect) => (R / Math.sqrt(d * d - R * R)) / (Math.tan((fov * Math.PI / 180) / 2) * aspect);
  const desk = worldFramingDistance(R, 45, 1280 / 800);
  check(Math.abs(desk - R * 3.5) < 1e-9, `a landscape desktop keeps 3.5 radii (${desk.toFixed(2)})`);
  const phone = worldFramingDistance(R, 45, 390 / 844);
  check(phone > R * 3.5 && Math.abs(halfWidth(phone, 45, 390 / 844) - 0.9) < 1e-6, `a portrait phone stands back until the globe is 90% of the width (${phone.toFixed(1)} units)`);
  check(worldFramingDistance(R, 45, 0) === R * 3.5, 'no aspect yet, the old framing');
}

// A WORLD THAT IS NOT THE STAGE'S (Ivan, 2026-10-03: on the Sun's stage, zoomed on Mars, two orbiters
// were drawn a third the size of the planet). A model is no bigger than its clearance above the
// nearest other world as drawn.
{
  const mars = { centre: new THREE.Vector3(1000, 0, 0), radius: 3.39 };
  const earth = { centre: new THREE.Vector3(-500, 0, 0), radius: 6.37 };
  const mro = new THREE.Vector3(1000 + 3.39 + 0.3, 0, 0); // 300 km up, in thousand-km units
  const alt = nearestAltitude(mro, [earth, mars]);
  check(Math.abs(alt - 0.3) < 1e-9, `the nearest other world is Mars, 0.3 units below (${alt})`);
  const capped = capForNeighbour(50, alt, 0.5);
  check(Math.abs(capped - 0.54) < 1e-9 && capped * 0.5 < 0.3, `a model wanting 50 units is held to its clearance (${capped})`);
  check(capForNeighbour(0.1, alt, 0.5) === 0.1, 'a model already smaller than its clearance is untouched');
  check(capForNeighbour(50, Infinity, 0.5) === 50, 'no other world drawn: no cap');
  check(capForNeighbour(50, -1, 0.5) === 50, 'a point inside a drawn world is not shrunk to nothing');
  check(nearestAltitude(mro, []) === Infinity, 'no worlds, no altitude');
  const src = (await import('node:fs')).readFileSync(join(JS, 'scene/heroes.js'), 'utf8');
  check((src.match(/heroScale\(px, c\.d,[^;]*nearAlt\(c\)\)/g) || []).length === 2, 'both heroScale calls pass the neighbour altitude');
  check(/gatherOthers\(\);\s*\n\s*const kept = \[\];/.test(src), 'the other worlds are gathered once a frame, before the docked-vehicle pass');
}

// Issue #419: a moon is framed on the size it has when the camera gets there, not on its one-pixel floor.
{
  const { createWorlds, MOON_VIEW, WORLDS: WORLDS_ROWS } = await import(join(JS, 'scene/worlds.js'));
  const { discDistance } = await import(join(JS, 'scene/framing.js'));
  stage.setWorld('earth');
  const camera = new THREE.PerspectiveCamera(45, 1440 / 900, 1e-6, 1e12);
  camera.position.set(0, 0, 30);
  camera.updateMatrixWorld();
  const worlds = createWorlds(new THREE.Scene(), { textureBase: 't/', loadTexture: () => new THREE.Texture(), camera });
  const t = Date.parse('2026-10-03T12:00:00Z');
  stage.setTime(t);
  worlds.update(t);
  const tanHalf = Math.tan((45 / 2) * Math.PI / 180);
  // Charon is not in the list: Pluto is drawn so much nearer than it is that Charon's scaled size is already over a pixel.
  for (const id of ['ganymede', 'io', 'mimas', 'miranda', 'phobos', 'deimos', 'triton']) {
    const floored = worlds.drawnRadiusUnits(id);
    const real = worlds.arrivalRadiusUnits(id);
    const pos = worlds.meshFor(id).position.clone();
    check(real > 0 && real < floored, `${id} seen from the Earth is drawn at its floor (${floored.toExponential(2)} units), larger than its system's scale gives it (${real.toExponential(2)})`);
    check(Math.abs(floored / pos.distanceTo(camera.position) - MOON_VIEW.MIN_ANGULAR_RADIUS_RAD) < 1e-6, `${id}: and that floor is one pixel from where the camera is`);
    // The old arrival: 3.5 floored radii out. Put the camera there and the moon is its scaled size.
    const at = (d) => {
      camera.position.copy(pos).add(new THREE.Vector3(0, 0, d));
      camera.updateMatrixWorld();
      worlds.update(t);
      const m = worlds.meshFor(id);
      return (m.scale.x / m.position.distanceTo(camera.position)) / tanHalf; // the disc's share of half the height
    };
    const before = at(floored * 3.5);
    // Phobos and Deimos are framed on their longest radius, so their MEAN disc is smaller by that much.
    const reach = WORLDS_ROWS.find((w) => w.id === id).look.reach || 1;
    const after = at(Math.max(real * 3.5, discDistance(real, { fovDeg: 45, aspect: 1440 / 900 }))) * reach;
    check(before < 0.35, `${id}: the old arrival, framed on the floor, left a disc ${(before * 100).toFixed(0)} % of the half-height`);
    check(after > 0.6 && after < 0.85, `${id}: framed on its real size it fills ${(after * 100).toFixed(0)} % of the half-height, as a planet does`);
    camera.position.set(0, 0, 30);
    camera.updateMatrixWorld();
    worlds.update(t);
  }
  check(worlds.arrivalRadiusUnits('mars') === worlds.drawnRadiusUnits('mars') && worlds.arrivalRadiusUnits('moon') === worlds.drawnRadiusUnits('moon'),
    'a planet and the Moon arrive at the size they are drawn');
}

// ...and on its lit face: the rig stands where it is told to (flyTo's `offset`), and what main.js
// tells it is scene/framing.js litOffset of the world's own Sun direction (scene/worlds.js sunDirOf).
{
  const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
  const { createWorlds } = await import(join(JS, 'scene/worlds.js'));
  const { litOffset, ARRIVAL_PHASE } = await import(join(JS, 'scene/framing.js'));
  stage.setWorld('earth');
  const camera = new THREE.PerspectiveCamera(45, 1440 / 900, 1e-6, 1e12);
  camera.position.set(0, 0, 30);
  const rig = createCameraRig(camera, null);
  const worlds = createWorlds(new THREE.Scene(), { textureBase: 't/', loadTexture: () => new THREE.Texture(), camera });
  const t = Date.parse('2026-10-03T12:00:00Z');
  stage.setTime(t);
  worlds.update(t);
  check(worlds.sunDirOf('sun') === null, 'the Sun has no lit side to arrive on');
  for (const id of ['jupiter', 'saturn', 'mars', 'pluto', 'ganymede', 'moon', 'earth']) {
    const sun = worlds.sunDirOf(id);
    check(sun && Math.abs(sun.length() - 1) < 1e-6, `${id} knows where its Sun is`);
    if (!sun) continue;
    const target = worlds.drawnPositionOf(id) || new THREE.Vector3();
    // The old arrival: the rig's own framing, beyond the subject from the stage's world.
    rig.flyTo({ targetScene: target, distance: 5, ms: 0 });
    rig.update(0.016);
    const oldLit = (1 + camera.position.clone().sub(target).normalize().dot(sun)) / 2;
    rig.flyTo({ targetScene: target, distance: 5, offset: litOffset(sun, camera.up), ms: 0 });
    rig.update(0.016);
    const from = camera.position.clone().sub(target).normalize();
    const lit = (1 + from.dot(sun)) / 2;
    check(Math.abs(Math.acos(Math.min(1, from.dot(sun))) - ARRIVAL_PHASE) < 0.02, `${id}: the camera stands ${(Math.acos(Math.min(1, from.dot(sun))) * 180 / Math.PI).toFixed(1)} degrees round from the Sun`);
    check(lit > 0.88, `${id}: ${(lit * 100).toFixed(0)} % of the disc is lit on arrival (the rig's own framing gave ${(oldLit * 100).toFixed(0)} %)`);
    if (['jupiter', 'saturn', 'pluto', 'ganymede'].includes(id)) check(oldLit < 0.5, `${id}: the old arrival showed mostly night (${(oldLit * 100).toFixed(0)} % lit), which is what the issue saw`);
  }
}

if (problems.length) { console.error('arrival FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
const d = closeUpDistance(at(395), 750, f) * stage.unitKm;
console.log(`arrival ok: Tiangong is reached from ${Math.round(d)} km at 750 px tall (was 7 000), drawn at the full ${SELECTED_PX} px; the old arrival drew ${old.toFixed(0)} px`);
